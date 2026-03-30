import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../context/LanguageContext';
import LanguageSwitcher from '../components/LanguageSwitcher';
import axios from 'axios';
import { Progress } from '../components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';
import { ArrowLeft, Copy, Download, Save, Globe, FileText, Loader2, Check, Languages } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const TranscriptionPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getAuthHeader } = useAuth();
  const { t } = useTranslation();
  const [transcription, setTranscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [editedText, setEditedText] = useState('');
  const [hasChanges, setHasChanges] = useState(false);
  const [targetLanguage, setTargetLanguage] = useState('');
  const [showTranslation, setShowTranslation] = useState(false);

  const fetchTranscription = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/transcriptions/${id}`, { headers: getAuthHeader() });
      setTranscription(res.data);
      setEditedText(res.data.edited_text || res.data.original_text || '');
      if (res.data.translated_text) { setShowTranslation(true); setTargetLanguage(res.data.translation_language || ''); }
    } catch { toast.error(t('transcription.notFound')); navigate('/dashboard'); }
    finally { setLoading(false); }
  }, [id, getAuthHeader, navigate, t]);

  useEffect(() => { fetchTranscription(); }, [fetchTranscription]);
  useEffect(() => {
    if (transcription?.status === 'processing') { const i = setInterval(fetchTranscription, 3000); return () => clearInterval(i); }
  }, [transcription?.status, fetchTranscription]);

  const handleTextChange = (e) => { setEditedText(e.target.value); setHasChanges(e.target.value !== (transcription?.edited_text || transcription?.original_text)); };

  const handleSave = async () => {
    setSaving(true);
    try { await axios.patch(`${API}/transcriptions/${id}`, { edited_text: editedText }, { headers: getAuthHeader() }); setHasChanges(false); toast.success(t('transcription.saved')); fetchTranscription(); }
    catch { toast.error(t('transcription.saveFail')); } finally { setSaving(false); }
  };

  const handleCopy = async () => {
    const text = showTranslation && transcription?.translated_text ? transcription.translated_text : editedText;
    await navigator.clipboard.writeText(text); toast.success(t('transcription.copied'));
  };

  const handleDownload = async (format) => {
    try {
      const res = await axios.get(`${API}/transcriptions/${id}/download/${format}`, { headers: getAuthHeader(), responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a'); link.href = url;
      link.setAttribute('download', `${transcription.filename.split('.')[0]}.${format}`);
      document.body.appendChild(link); link.click(); link.remove(); window.URL.revokeObjectURL(url);
      toast.success(`${format.toUpperCase()} ${t('transcription.downloadSuccess')}`);
    } catch { toast.error(t('transcription.downloadFail')); }
  };

  const handleTranslate = async () => {
    if (!targetLanguage) { toast.error(t('transcription.selectLangError')); return; }
    setTranslating(true);
    try {
      const res = await axios.post(`${API}/transcriptions/${id}/translate`, { target_language: targetLanguage }, { headers: getAuthHeader() });
      setTranscription(prev => ({ ...prev, translated_text: res.data.translated_text, translation_language: targetLanguage }));
      setShowTranslation(true); toast.success(t('transcription.translateSuccess'));
    } catch { toast.error(t('transcription.translateFail')); } finally { setTranslating(false); }
  };

  const languages = [
    { code: 'en', name: t('languages.en') }, { code: 'fr', name: t('languages.fr') },
    { code: 'es', name: t('languages.es') }, { code: 'de', name: t('languages.de') },
    { code: 'it', name: t('languages.it') }, { code: 'pt', name: t('languages.pt') },
    { code: 'ja', name: t('languages.ja') }, { code: 'zh', name: t('languages.zh') },
    { code: 'ko', name: t('languages.ko') }, { code: 'ar', name: t('languages.ar') },
  ];
  const langMap = Object.fromEntries(languages.map(l => [l.code, l.name]));

  const wordCount = editedText ? editedText.split(/\s+/).filter(w => w.length > 0).length : 0;
  const charCount = editedText ? editedText.length : 0;
  const lineCount = editedText ? editedText.split('\n').filter(l => l.trim().length > 0).length : 0;

  if (loading) return <div className="min-h-screen bg-stele-bg flex items-center justify-center"><Loader2 className="w-6 h-6 text-stele-accent animate-spin" strokeWidth={1} /></div>;

  return (
    <div className="min-h-screen bg-stele-bg">
      <header className="bg-stele-bg/90 backdrop-blur-xl border-b border-stele-border sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 md:px-12 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button onClick={() => navigate('/dashboard')} data-testid="back-btn" className="w-8 h-8 border border-stele-secondary flex items-center justify-center hover:border-stele-primary transition-colors">
                <ArrowLeft className="w-4 h-4" strokeWidth={1.5} />
              </button>
              <div>
                <h1 className="font-manrope font-semibold text-sm text-stele-primary truncate max-w-xs sm:max-w-md tracking-tight">{transcription?.filename}</h1>
                <div className="flex items-center gap-3 mt-1">
                  {transcription?.detected_language && (
                    <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-stele-accent flex items-center gap-1.5">
                      <Globe className="w-3 h-3" strokeWidth={1.5} />{t(`languages.${transcription.detected_language}`) || transcription.detected_language}
                    </span>
                  )}
                  {hasChanges && <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-stele-accent">{t('transcription.unsaved')}</span>}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <LanguageSwitcher />
              {hasChanges && (
                <button onClick={handleSave} disabled={saving} data-testid="save-btn" className="btn-stele text-xs px-6 py-3 flex items-center gap-2">
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" strokeWidth={1.5} /> : <Save className="w-3.5 h-3.5" strokeWidth={1.5} />}
                  {t('transcription.save')}
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 md:px-12 py-12">
        {transcription?.status === 'processing' ? (
          <div className="border border-stele-secondary bg-white p-16 text-center">
            <Loader2 className="w-8 h-8 mx-auto text-stele-primary animate-spin mb-6" strokeWidth={1} />
            <h2 className="font-playfair text-2xl text-stele-primary mb-3">{t('transcription.processingTitle')}</h2>
            <p className="font-inter text-sm text-stele-muted mb-8">{t('transcription.processingSubtitle')}</p>
            <div className="w-64 mx-auto"><Progress value={transcription.progress} className="h-1" /></div>
            <p className="font-mono text-xs tracking-widest text-stele-accent mt-4">{transcription.progress}%</p>
          </div>
        ) : transcription?.status === 'failed' ? (
          <div className="border border-stele-error/30 bg-white p-16 text-center">
            <FileText className="w-8 h-8 mx-auto text-stele-error mb-6" strokeWidth={1} />
            <h2 className="font-playfair text-2xl text-stele-error mb-3">{t('transcription.failedTitle')}</h2>
            <p className="font-inter text-sm text-stele-muted mb-8">{t('transcription.failedSubtitle')}</p>
            <button onClick={() => navigate('/dashboard')} className="btn-stele-outline text-xs">{t('transcription.backToDashboard')}</button>
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-8 md:gap-12">
            <div className="lg:col-span-2 space-y-8">
              <div className="flex flex-wrap items-center gap-3">
                <button onClick={handleCopy} data-testid="copy-btn" className="btn-stele-outline text-[10px] px-4 py-2.5 flex items-center gap-2">
                  <Copy className="w-3.5 h-3.5" strokeWidth={1.5} />{t('transcription.copy')}
                </button>
                <button onClick={() => handleDownload('txt')} data-testid="download-txt-btn" className="btn-stele-outline text-[10px] px-4 py-2.5 flex items-center gap-2">
                  <Download className="w-3.5 h-3.5" strokeWidth={1.5} />TXT
                </button>
                <button onClick={() => handleDownload('srt')} data-testid="download-srt-btn" className="btn-stele-outline text-[10px] px-4 py-2.5 flex items-center gap-2">
                  <Download className="w-3.5 h-3.5" strokeWidth={1.5} />SRT
                </button>
                {transcription?.translated_text && (
                  <button onClick={() => setShowTranslation(!showTranslation)} data-testid="toggle-translation-btn"
                    className={`text-[10px] px-4 py-2.5 flex items-center gap-2 font-inter tracking-widest uppercase border transition-colors duration-300 ${showTranslation ? 'bg-stele-primary text-white border-stele-primary' : 'bg-transparent text-stele-primary border-stele-secondary hover:border-stele-primary'}`}>
                    <Languages className="w-3.5 h-3.5" strokeWidth={1.5} />{showTranslation ? t('transcription.original') : t('transcription.translationLabel')}
                  </button>
                )}
              </div>
              <div className="border border-stele-secondary bg-white">
                <div className="px-8 py-5 border-b border-stele-border flex items-center gap-2">
                  <FileText className="w-4 h-4 text-stele-accent" strokeWidth={1.5} />
                  <span className="font-mono text-xs tracking-[0.15em] uppercase text-stele-accent">
                    {showTranslation ? t('transcription.translationLabel') : t('transcription.transcriptionLabel')}
                  </span>
                </div>
                <div className="p-8">
                  {showTranslation && transcription?.translated_text ? (
                    <div className="transcript-text whitespace-pre-wrap min-h-[400px]">{transcription.translated_text}</div>
                  ) : (
                    <textarea value={editedText} onChange={handleTextChange}
                      className="w-full min-h-[400px] font-lora text-lg md:text-xl leading-loose text-stele-primary resize-none focus:outline-none bg-transparent placeholder:text-stele-muted"
                      placeholder={t('transcription.placeholder')} data-testid="transcription-textarea" />
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-8">
              <div className="border border-stele-secondary bg-white">
                <div className="px-8 py-5 border-b border-stele-border flex items-center gap-2">
                  <Globe className="w-4 h-4 text-stele-accent" strokeWidth={1.5} />
                  <span className="font-mono text-xs tracking-[0.15em] uppercase text-stele-accent">{t('transcription.translationPanel')}</span>
                </div>
                <div className="p-8 space-y-6">
                  <div>
                    <label className="font-inter text-xs tracking-[0.15em] uppercase text-stele-accent block mb-3">{t('transcription.targetLanguage')}</label>
                    <Select value={targetLanguage} onValueChange={setTargetLanguage}>
                      <SelectTrigger data-testid="language-select" className="rounded-none border-stele-secondary focus:ring-0 focus:border-stele-primary">
                        <SelectValue placeholder={t('transcription.selectLanguage')} />
                      </SelectTrigger>
                      <SelectContent className="rounded-none border-stele-secondary">
                        {languages.map(l => <SelectItem key={l.code} value={l.code}>{l.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <button onClick={handleTranslate} disabled={translating || !targetLanguage} className="btn-stele w-full text-xs flex items-center justify-center gap-2 disabled:opacity-30" data-testid="translate-btn">
                    {translating ? <><Loader2 className="w-3.5 h-3.5 animate-spin" strokeWidth={1.5} />{t('transcription.translating')}</> : <><Languages className="w-3.5 h-3.5" strokeWidth={1.5} />{t('transcription.translate')}</>}
                  </button>
                  {transcription?.translated_text && (
                    <div className="pt-4 border-t border-stele-border">
                      <div className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-stele-success" strokeWidth={1.5} />
                        <span className="font-inter text-xs text-stele-success">{t('transcription.translatedTo')} {langMap[transcription.translation_language] || transcription.translation_language}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="border border-stele-secondary bg-white">
                <div className="px-8 py-5 border-b border-stele-border"><span className="font-mono text-xs tracking-[0.15em] uppercase text-stele-accent">{t('transcription.infoPanel')}</span></div>
                <div className="p-8">
                  <dl className="space-y-4 text-sm">
                    <div className="flex justify-between"><dt className="font-inter text-stele-muted">{t('transcription.file')}</dt><dd className="font-inter font-medium text-stele-primary truncate max-w-[150px]">{transcription?.filename}</dd></div>
                    {transcription?.detected_language && <div className="flex justify-between"><dt className="font-inter text-stele-muted">{t('transcription.language')}</dt><dd className="font-inter font-medium text-stele-primary">{t(`languages.${transcription.detected_language}`) || transcription.detected_language}</dd></div>}
                    {transcription?.duration_seconds && <div className="flex justify-between"><dt className="font-inter text-stele-muted">{t('transcription.duration')}</dt><dd className="font-mono text-sm text-stele-primary">{Math.floor(transcription.duration_seconds / 60)}:{String(Math.floor(transcription.duration_seconds % 60)).padStart(2, '0')}</dd></div>}
                    <div className="flex justify-between"><dt className="font-inter text-stele-muted">{t('transcription.date')}</dt><dd className="font-inter font-medium text-stele-primary">{new Date(transcription?.created_at).toLocaleDateString(t('lang') === 'fr' ? 'fr-FR' : 'en-US')}</dd></div>
                  </dl>
                </div>
              </div>

              <div className="border border-stele-secondary bg-white">
                <div className="px-8 py-5 border-b border-stele-border"><span className="font-mono text-xs tracking-[0.15em] uppercase text-stele-accent">{t('transcription.statsPanel')}</span></div>
                <div className="p-8">
                  <div className="grid grid-cols-2 gap-6">
                    <div><p className="font-mono text-2xl text-stele-primary" data-testid="word-count">{wordCount}</p><p className="font-inter text-xs text-stele-muted mt-1">{t('transcription.words')}</p></div>
                    <div><p className="font-mono text-2xl text-stele-primary" data-testid="char-count">{charCount}</p><p className="font-inter text-xs text-stele-muted mt-1">{t('transcription.characters')}</p></div>
                    <div><p className="font-mono text-2xl text-stele-primary" data-testid="line-count">{lineCount}</p><p className="font-inter text-xs text-stele-muted mt-1">{t('transcription.lines')}</p></div>
                    {transcription?.duration_seconds && editedText && (
                      <div><p className="font-mono text-2xl text-stele-primary" data-testid="wpm">{Math.round((wordCount / transcription.duration_seconds) * 60)}</p><p className="font-inter text-xs text-stele-muted mt-1">{t('transcription.wpm')}</p></div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default TranscriptionPage;
