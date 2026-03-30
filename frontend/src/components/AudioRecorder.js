import { useState, useRef, useEffect } from 'react';
import { useTranslation } from '../context/LanguageContext';
import { Mic, Square, Pause, Play } from 'lucide-react';

const AudioRecorder = ({ onRecordingComplete, disabled }) => {
  const { t } = useTranslation();
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);
  const analyserRef = useRef(null);
  const animationRef = useRef(null);
  const streamRef = useRef(null);
  const audioContextRef = useRef(null);

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); if (animationRef.current) cancelAnimationFrame(animationRef.current); };
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      audioContextRef.current = audioContext;
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        onRecordingComplete(new File([blob], `recording_${Date.now()}.webm`, { type: 'audio/webm' }));
        stream.getTracks().forEach(track => track.stop());
        if (audioContext.state !== 'closed') audioContext.close();
      };
      mediaRecorder.start(100);
      setIsRecording(true); setIsPaused(false); setRecordingTime(0);
      timerRef.current = setInterval(() => setRecordingTime(prev => prev + 1), 1000);
      const updateLevel = () => {
        if (analyserRef.current) {
          const arr = new Uint8Array(analyserRef.current.frequencyBinCount);
          analyserRef.current.getByteFrequencyData(arr);
          setAudioLevel(arr.reduce((a, b) => a + b) / arr.length / 255);
          animationRef.current = requestAnimationFrame(updateLevel);
        }
      };
      updateLevel();
    } catch { alert(t('recorder.micError')); }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      if (isPaused) { mediaRecorderRef.current.resume(); timerRef.current = setInterval(() => setRecordingTime(prev => prev + 1), 1000); }
      else { mediaRecorderRef.current.pause(); clearInterval(timerRef.current); }
      setIsPaused(!isPaused);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop(); setIsRecording(false); setIsPaused(false);
      clearInterval(timerRef.current); cancelAnimationFrame(animationRef.current); setAudioLevel(0);
    }
  };

  const formatTime = (s) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  return (
    <div className="border border-stele-secondary bg-white p-12 text-center" data-testid="audio-recorder">
      <p className="overline mb-6">{t('recorder.overline')}</p>
      {isRecording && (
        <div className="flex items-center justify-center gap-[3px] h-16 my-8">
          {[...Array(32)].map((_, i) => (
            <div key={i} className="w-[2px] bg-stele-primary transition-all duration-75"
              style={{ height: `${Math.max(4, audioLevel * 100 * (0.3 + Math.random() * 0.7))}%`, opacity: isPaused ? 0.2 : (0.3 + audioLevel * 0.7) }} />
          ))}
        </div>
      )}
      {isRecording && <div className="font-mono text-3xl tracking-[0.2em] text-stele-primary mb-8" data-testid="recording-time">{formatTime(recordingTime)}</div>}
      <div className="flex items-center justify-center gap-4">
        {!isRecording ? (
          <button onClick={startRecording} disabled={disabled}
            className="w-16 h-16 bg-stele-primary text-white flex items-center justify-center hover:bg-stele-accent transition-colors duration-300 disabled:opacity-30" data-testid="start-recording-btn">
            <Mic className="w-6 h-6" strokeWidth={1.5} />
          </button>
        ) : (
          <>
            <button onClick={pauseRecording} className="w-12 h-12 border border-stele-secondary text-stele-primary flex items-center justify-center hover:border-stele-primary transition-colors duration-300" data-testid="pause-recording-btn">
              {isPaused ? <Play className="w-5 h-5" strokeWidth={1.5} /> : <Pause className="w-5 h-5" strokeWidth={1.5} />}
            </button>
            <button onClick={stopRecording} className="w-16 h-16 bg-stele-error text-white flex items-center justify-center hover:opacity-80 transition-opacity duration-300" data-testid="stop-recording-btn">
              <Square className="w-6 h-6" strokeWidth={1.5} />
            </button>
          </>
        )}
      </div>
      <p className="font-inter text-sm text-stele-muted mt-6">
        {isRecording ? (isPaused ? t('recorder.paused') : t('recorder.recording')) : t('recorder.startHint')}
      </p>
    </div>
  );
};

export default AudioRecorder;
