from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, BackgroundTasks
from fastapi.responses import PlainTextResponse
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timezone
from pathlib import Path
import uuid
import os
import aiofiles
import logging
import asyncio
import subprocess
import re

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api")

db = None
UPLOAD_DIR = None

def init_transcription_routes(database, upload_dir):
    global db, UPLOAD_DIR
    db = database
    UPLOAD_DIR = upload_dir


# Import auth dependency lazily
def _get_current_user():
    from routes import get_current_user
    return get_current_user


# ================= MODELS =================

class TranscriptionResponse(BaseModel):
    class Config:
        extra = "ignore"
    id: str
    user_id: str
    filename: str
    original_text: str
    edited_text: Optional[str] = None
    detected_language: Optional[str] = None
    translated_text: Optional[str] = None
    translation_language: Optional[str] = None
    source_url: Optional[str] = None
    status: str
    progress: int
    duration_seconds: Optional[float] = None
    created_at: str
    updated_at: str

class TranscriptionUpdate(BaseModel):
    edited_text: Optional[str] = None

class TranslationRequest(BaseModel):
    target_language: str

class URLTranscriptionRequest(BaseModel):
    url: str

# ================= HELPERS =================

def format_timestamp(seconds: float) -> str:
    minutes = int(seconds // 60)
    secs = int(seconds % 60)
    return f"{minutes:02d}:{secs:02d}"

def format_srt_timestamp(seconds: float) -> str:
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    millis = int((seconds - int(seconds)) * 1000)
    return f"{hours:02d}:{minutes:02d}:{secs:02d},{millis:03d}"


async def get_settings():
    settings = await db.settings.find_one({"key": "app_settings"}, {"_id": 0})
    if not settings:
        default = {
            "key": "app_settings",
            "subscription_enabled": False,
            "free_limit_seconds": 300,
            "monthly_price": 9.99,
            "yearly_price": 99.90,
            "yearly_enabled": True,
            "currency": "USD",
            "paypal_plan_id": None,
            "paypal_yearly_plan_id": None
        }
        await db.settings.insert_one(default)
        return default
    return settings

async def get_user_usage_this_month(user_id: str) -> float:
    now = datetime.now(timezone.utc)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0).isoformat()
    pipeline = [
        {"$match": {"user_id": user_id, "status": "completed", "created_at": {"$gte": month_start}, "duration_seconds": {"$ne": None}}},
        {"$group": {"_id": None, "total": {"$sum": "$duration_seconds"}}}
    ]
    result = await db.transcriptions.aggregate(pipeline).to_list(1)
    return result[0]["total"] if result else 0

async def user_has_active_subscription(user_id: str) -> bool:
    sub = await db.subscriptions.find_one({"user_id": user_id, "status": "active"}, {"_id": 0})
    if not sub:
        return False
    if sub.get("expires_at") and sub["expires_at"] < datetime.now(timezone.utc).isoformat():
        await db.subscriptions.update_one({"user_id": user_id, "status": "active"}, {"$set": {"status": "expired"}})
        return False
    return True


async def process_transcription(transcription_id: str, file_path: str):
    from emergentintegrations.llm.openai import OpenAISpeechToText
    try:
        await db.transcriptions.update_one(
            {"id": transcription_id},
            {"$set": {"progress": 10, "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
        api_key = os.environ.get('EMERGENT_LLM_KEY')
        stt = OpenAISpeechToText(api_key=api_key)
        await db.transcriptions.update_one(
            {"id": transcription_id},
            {"$set": {"progress": 30, "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
        with open(file_path, "rb") as audio_file:
            response = await stt.transcribe(
                file=audio_file, model="whisper-1",
                response_format="verbose_json", timestamp_granularities=["segment"]
            )
        await db.transcriptions.update_one(
            {"id": transcription_id},
            {"$set": {"progress": 80, "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
        transcribed_text = response.text
        detected_language = getattr(response, 'language', None)
        duration = getattr(response, 'duration', None)
        formatted_text = transcribed_text
        segments = getattr(response, 'segments', None)
        if segments:
            formatted_lines = []
            for segment in segments:
                if isinstance(segment, dict):
                    start_val = segment.get('start', 0)
                    text_val = segment.get('text', '').strip()
                else:
                    start_val = getattr(segment, 'start', 0)
                    text_val = getattr(segment, 'text', '').strip()
                start_time = format_timestamp(start_val)
                if text_val:
                    formatted_lines.append(f"[{start_time}] {text_val}")
            if formatted_lines:
                formatted_text = "\n".join(formatted_lines)
        await db.transcriptions.update_one(
            {"id": transcription_id},
            {"$set": {
                "original_text": formatted_text,
                "detected_language": detected_language,
                "duration_seconds": duration,
                "status": "completed",
                "progress": 100,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        try:
            os.remove(file_path)
        except:
            pass
        logger.info(f"Transcription {transcription_id} completed successfully")
    except Exception as e:
        logger.error(f"Transcription {transcription_id} failed: {str(e)}")
        await db.transcriptions.update_one(
            {"id": transcription_id},
            {"$set": {
                "status": "failed", "progress": 0,
                "original_text": f"Error: {str(e)}",
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        try:
            os.remove(file_path)
        except:
            pass


def extract_video_title(url: str) -> str:
    """Extract a clean title from video URL"""
    # Common patterns for video platforms
    if 'youtube.com' in url or 'youtu.be' in url:
        return "YouTube Video"
    elif 'tiktok.com' in url:
        return "TikTok Video"
    elif 'instagram.com' in url:
        return "Instagram Video"
    elif 'twitter.com' in url or 'x.com' in url:
        return "Twitter/X Video"
    elif 'facebook.com' in url or 'fb.watch' in url:
        return "Facebook Video"
    elif 'vimeo.com' in url:
        return "Vimeo Video"
    elif 'twitch.tv' in url:
        return "Twitch Video"
    elif 'linkedin.com' in url:
        return "LinkedIn Video"
    else:
        return "Video URL"


def is_valid_video_url(url: str) -> bool:
    """Check if URL is from a supported platform"""
    supported_patterns = [
        r'(youtube\.com|youtu\.be)',
        r'tiktok\.com',
        r'instagram\.com',
        r'(twitter\.com|x\.com)',
        r'(facebook\.com|fb\.watch)',
        r'vimeo\.com',
        r'twitch\.tv',
        r'linkedin\.com',
        r'dailymotion\.com',
        r'soundcloud\.com'
    ]
    for pattern in supported_patterns:
        if re.search(pattern, url, re.IGNORECASE):
            return True
    return False


async def download_audio_from_url(url: str, output_path: str) -> dict:
    """Download audio from video URL using yt-dlp"""
    try:
        # Find yt-dlp path
        import shutil
        import glob as glob_module
        yt_dlp_path = shutil.which('yt-dlp') or '/root/.venv/bin/yt-dlp'
        
        # Remove .mp3 extension as yt-dlp will add it
        base_path = output_path.replace('.mp3', '')
        
        logger.info(f"Downloading audio from {url} to {output_path}")
        
        # First, get video info (title, duration)
        info_cmd = [
            yt_dlp_path,
            '--print', 'title',
            '--print', 'duration',
            '--no-download',
            url
        ]
        
        info_process = await asyncio.create_subprocess_exec(
            *info_cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        info_stdout, info_stderr = await asyncio.wait_for(info_process.communicate(), timeout=60)
        
        output_lines = info_stdout.decode().strip().split('\n')
        title = output_lines[0] if len(output_lines) > 0 else extract_video_title(url)
        duration = None
        try:
            duration = float(output_lines[1]) if len(output_lines) > 1 else None
        except:
            pass
        
        logger.info(f"Video info: title={title}, duration={duration}")
        
        # Now download the audio
        download_cmd = [
            yt_dlp_path,
            '-x',  # Extract audio
            '--audio-format', 'mp3',
            '--audio-quality', '192K',
            '-o', f'{base_path}.%(ext)s',
            '--no-playlist',
            '--max-filesize', '50M',
            '--socket-timeout', '30',
            '--retries', '3',
            url
        ]
        
        logger.info(f"Running download command: {' '.join(download_cmd)}")
        
        process = await asyncio.create_subprocess_exec(
            *download_cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        stdout, stderr = await asyncio.wait_for(process.communicate(), timeout=300)
        
        logger.info(f"Download return code: {process.returncode}")
        if stderr:
            logger.info(f"Download stderr: {stderr.decode()[:500]}")
        
        if process.returncode != 0:
            error_msg = stderr.decode() if stderr else "Unknown error"
            raise Exception(f"Download failed: {error_msg}")
        
        # Find the downloaded file
        possible_files = glob_module.glob(f'{base_path}.*')
        logger.info(f"Looking for files matching {base_path}.* - Found: {possible_files}")
        
        if possible_files:
            actual_file = possible_files[0]
            # Rename to expected output path if needed
            if actual_file != output_path:
                logger.info(f"Renaming {actual_file} to {output_path}")
                os.rename(actual_file, output_path)
        else:
            # Also check in the directory
            upload_dir = os.path.dirname(output_path)
            all_files = os.listdir(upload_dir)
            logger.info(f"All files in {upload_dir}: {all_files}")
            raise Exception("Audio file not found after download")
        
        return {"title": title, "duration": duration}
        
    except asyncio.TimeoutError:
        raise Exception("Download timeout - video too long or slow connection")
    except Exception as e:
        logger.error(f"Download error: {str(e)}")
        raise Exception(f"Failed to download audio: {str(e)}")


async def process_url_transcription(transcription_id: str, url: str, file_path: str):
    """Download video, extract audio, and transcribe"""
    from emergentintegrations.llm.openai import OpenAISpeechToText
    
    try:
        # Update progress - downloading
        await db.transcriptions.update_one(
            {"id": transcription_id},
            {"$set": {"progress": 5, "status": "downloading", "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
        
        # Download audio
        video_info = await download_audio_from_url(url, file_path)
        
        # Update with title and progress
        await db.transcriptions.update_one(
            {"id": transcription_id},
            {"$set": {
                "filename": f"{video_info['title'][:50]}.mp3",
                "progress": 30,
                "status": "processing",
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        # Verify file exists
        if not os.path.exists(file_path):
            raise Exception("Audio file not created")
        
        # Transcribe
        api_key = os.environ.get('EMERGENT_LLM_KEY')
        stt = OpenAISpeechToText(api_key=api_key)
        
        await db.transcriptions.update_one(
            {"id": transcription_id},
            {"$set": {"progress": 50, "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
        
        with open(file_path, "rb") as audio_file:
            response = await stt.transcribe(
                file=audio_file, model="whisper-1",
                response_format="verbose_json", timestamp_granularities=["segment"]
            )
        
        await db.transcriptions.update_one(
            {"id": transcription_id},
            {"$set": {"progress": 80, "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
        
        transcribed_text = response.text
        detected_language = getattr(response, 'language', None)
        duration = getattr(response, 'duration', None) or video_info.get('duration')
        
        formatted_text = transcribed_text
        segments = getattr(response, 'segments', None)
        if segments:
            formatted_lines = []
            for segment in segments:
                if isinstance(segment, dict):
                    start_val = segment.get('start', 0)
                    text_val = segment.get('text', '').strip()
                else:
                    start_val = getattr(segment, 'start', 0)
                    text_val = getattr(segment, 'text', '').strip()
                start_time = format_timestamp(start_val)
                if text_val:
                    formatted_lines.append(f"[{start_time}] {text_val}")
            if formatted_lines:
                formatted_text = "\n".join(formatted_lines)
        
        await db.transcriptions.update_one(
            {"id": transcription_id},
            {"$set": {
                "original_text": formatted_text,
                "detected_language": detected_language,
                "duration_seconds": duration,
                "status": "completed",
                "progress": 100,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        # Cleanup
        try:
            os.remove(file_path)
        except:
            pass
            
        logger.info(f"URL Transcription {transcription_id} completed successfully")
        
    except Exception as e:
        logger.error(f"URL Transcription {transcription_id} failed: {str(e)}")
        await db.transcriptions.update_one(
            {"id": transcription_id},
            {"$set": {
                "status": "failed",
                "progress": 0,
                "original_text": f"Error: {str(e)}",
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        try:
            os.remove(file_path)
        except:
            pass


# ================= ROUTES =================

@router.post("/transcriptions/upload")
async def upload_file(
    file: UploadFile = File(...),
    background_tasks: BackgroundTasks = None,
    current_user: dict = Depends(_get_current_user())
):
    allowed_extensions = [".mp3", ".mp4", ".mpeg", ".mpga", ".m4a", ".wav", ".webm"]
    file_ext = Path(file.filename).suffix.lower()
    if file_ext not in allowed_extensions:
        raise HTTPException(status_code=400, detail=f"Unsupported file type. Allowed: {', '.join(allowed_extensions)}")

    settings = await get_settings()
    if settings.get("subscription_enabled"):
        is_sub = await user_has_active_subscription(current_user["id"])
        if not is_sub and not current_user.get("is_admin"):
            usage = await get_user_usage_this_month(current_user["id"])
            limit = settings.get("free_limit_seconds", 300)
            if usage >= limit:
                raise HTTPException(status_code=403, detail=f"Free limit reached ({int(limit)}s). Subscribe for unlimited access.")

    transcription_id = str(uuid.uuid4())
    file_path = UPLOAD_DIR / f"{transcription_id}{file_ext}"
    async with aiofiles.open(file_path, 'wb') as out_file:
        content = await file.read()
        if len(content) > 25 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="File size exceeds 25MB limit")
        await out_file.write(content)

    transcription_doc = {
        "id": transcription_id,
        "user_id": current_user["id"],
        "filename": file.filename,
        "file_path": str(file_path),
        "original_text": "",
        "edited_text": None,
        "detected_language": None,
        "translated_text": None,
        "translation_language": None,
        "status": "processing",
        "progress": 0,
        "duration_seconds": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    await db.transcriptions.insert_one(transcription_doc)
    background_tasks.add_task(process_transcription, transcription_id, str(file_path))
    return {"id": transcription_id, "status": "processing", "message": "File uploaded, transcription started"}


@router.post("/transcriptions/url")
async def transcribe_from_url(
    request: URLTranscriptionRequest,
    background_tasks: BackgroundTasks = None,
    current_user: dict = Depends(_get_current_user())
):
    """Transcribe audio from video URL (YouTube, TikTok, Instagram, etc.) - Premium feature"""
    
    # Validate URL
    if not request.url or not request.url.startswith(('http://', 'https://')):
        raise HTTPException(status_code=400, detail="Invalid URL format")
    
    if not is_valid_video_url(request.url):
        raise HTTPException(
            status_code=400, 
            detail="URL not supported. Supported: YouTube, TikTok, Instagram, Twitter/X, Facebook, Vimeo, Twitch, LinkedIn, Dailymotion, SoundCloud"
        )
    
    # Check subscription - URL transcription is premium only
    settings = await get_settings()
    is_sub = await user_has_active_subscription(current_user["id"])
    is_admin = current_user.get("is_admin", False)
    
    if not is_sub and not is_admin:
        raise HTTPException(
            status_code=403, 
            detail="URL transcription is a premium feature. Please subscribe to access this feature."
        )
    
    transcription_id = str(uuid.uuid4())
    file_path = str(UPLOAD_DIR / f"{transcription_id}.mp3")
    
    transcription_doc = {
        "id": transcription_id,
        "user_id": current_user["id"],
        "filename": extract_video_title(request.url),
        "source_url": request.url,
        "file_path": file_path,
        "original_text": "",
        "edited_text": None,
        "detected_language": None,
        "translated_text": None,
        "translation_language": None,
        "status": "downloading",
        "progress": 0,
        "duration_seconds": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    await db.transcriptions.insert_one(transcription_doc)
    background_tasks.add_task(process_url_transcription, transcription_id, request.url, file_path)
    
    return {
        "id": transcription_id, 
        "status": "downloading", 
        "message": "Video download started, transcription will begin shortly"
    }


@router.get("/transcriptions", response_model=List[TranscriptionResponse])
async def get_transcriptions(current_user: dict = Depends(_get_current_user())):
    transcriptions = await db.transcriptions.find(
        {"user_id": current_user["id"]}, {"_id": 0, "file_path": 0}
    ).sort("created_at", -1).to_list(100)
    return transcriptions

@router.get("/transcriptions/{transcription_id}", response_model=TranscriptionResponse)
async def get_transcription(transcription_id: str, current_user: dict = Depends(_get_current_user())):
    transcription = await db.transcriptions.find_one(
        {"id": transcription_id, "user_id": current_user["id"]}, {"_id": 0, "file_path": 0}
    )
    if not transcription:
        raise HTTPException(status_code=404, detail="Transcription not found")
    return transcription

@router.patch("/transcriptions/{transcription_id}", response_model=TranscriptionResponse)
async def update_transcription(
    transcription_id: str, update_data: TranscriptionUpdate,
    current_user: dict = Depends(_get_current_user())
):
    transcription = await db.transcriptions.find_one(
        {"id": transcription_id, "user_id": current_user["id"]}
    )
    if not transcription:
        raise HTTPException(status_code=404, detail="Transcription not found")
    update_dict = {k: v for k, v in update_data.model_dump().items() if v is not None}
    update_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.transcriptions.update_one({"id": transcription_id}, {"$set": update_dict})
    updated = await db.transcriptions.find_one({"id": transcription_id}, {"_id": 0, "file_path": 0})
    return updated

@router.delete("/transcriptions/{transcription_id}")
async def delete_transcription(transcription_id: str, current_user: dict = Depends(_get_current_user())):
    result = await db.transcriptions.delete_one(
        {"id": transcription_id, "user_id": current_user["id"]}
    )
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Transcription not found")
    return {"message": "Transcription deleted"}

@router.post("/transcriptions/{transcription_id}/translate")
async def translate_transcription(
    transcription_id: str, request: TranslationRequest,
    current_user: dict = Depends(_get_current_user())
):
    from emergentintegrations.llm.openai import OpenAILLM
    transcription = await db.transcriptions.find_one(
        {"id": transcription_id, "user_id": current_user["id"]}
    )
    if not transcription:
        raise HTTPException(status_code=404, detail="Transcription not found")
    text_to_translate = transcription.get("edited_text") or transcription.get("original_text")
    if not text_to_translate:
        raise HTTPException(status_code=400, detail="No text to translate")
    languages = {
        "en": "English", "fr": "French", "es": "Spanish", "de": "German",
        "it": "Italian", "pt": "Portuguese", "zh": "Chinese", "ja": "Japanese",
        "ko": "Korean", "ar": "Arabic"
    }
    target_lang_name = languages.get(request.target_language, request.target_language)
    api_key = os.environ.get('EMERGENT_LLM_KEY')
    llm = OpenAILLM(api_key=api_key)
    prompt = f"Translate the following text to {target_lang_name}. Keep any timestamps in their original format. Only output the translated text, nothing else:\n\n{text_to_translate}"
    translated_text = await llm.generate_response(prompt=prompt, model="gpt-4o-mini")
    await db.transcriptions.update_one(
        {"id": transcription_id},
        {"$set": {
            "translated_text": translated_text,
            "translation_language": request.target_language,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    return {"translated_text": translated_text, "target_language": request.target_language}

@router.get("/transcriptions/{transcription_id}/download/{format}")
async def download_transcription(
    transcription_id: str, format: str,
    current_user: dict = Depends(_get_current_user())
):
    if format not in ["txt", "srt"]:
        raise HTTPException(status_code=400, detail="Format must be 'txt' or 'srt'")
    transcription = await db.transcriptions.find_one(
        {"id": transcription_id, "user_id": current_user["id"]}
    )
    if not transcription:
        raise HTTPException(status_code=404, detail="Transcription not found")
    text = transcription.get("edited_text") or transcription.get("original_text") or ""
    if format == "txt":
        content = text
    else:
        lines = text.split("\n")
        srt_lines = []
        index = 1
        for i, line in enumerate(lines):
            if line.strip():
                if line.startswith("[") and "]" in line:
                    timestamp_end = line.index("]")
                    timestamp_str = line[1:timestamp_end]
                    text_content = line[timestamp_end + 1:].strip()
                    try:
                        parts = timestamp_str.split(":")
                        start_seconds = int(parts[0]) * 60 + int(parts[1])
                        end_seconds = start_seconds + 3
                        if i + 1 < len(lines) and lines[i + 1].startswith("["):
                            next_ts = lines[i + 1][1:lines[i + 1].index("]")]
                            next_parts = next_ts.split(":")
                            end_seconds = int(next_parts[0]) * 60 + int(next_parts[1])
                        srt_lines.append(str(index))
                        srt_lines.append(f"{format_srt_timestamp(start_seconds)} --> {format_srt_timestamp(end_seconds)}")
                        srt_lines.append(text_content)
                        srt_lines.append("")
                        index += 1
                    except:
                        srt_lines.append(str(index))
                        srt_lines.append("00:00:00,000 --> 00:00:03,000")
                        srt_lines.append(line)
                        srt_lines.append("")
                        index += 1
                else:
                    srt_lines.append(str(index))
                    srt_lines.append("00:00:00,000 --> 00:00:03,000")
                    srt_lines.append(line)
                    srt_lines.append("")
                    index += 1
        content = "\n".join(srt_lines)
    filename = f"{transcription.get('filename', 'transcription').rsplit('.', 1)[0]}.{format}"
    return PlainTextResponse(
        content=content, media_type="text/plain",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )
