import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../context/LanguageContext';
import LanguageSwitcher from '../components/LanguageSwitcher';
import SEOHead from '../components/SEOHead';
import axios from 'axios';
import { Progress } from '../components/ui/progress';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import { toast } from 'sonner';
import {
  Mic2, Upload, FileAudio, Clock, Globe, Check,
  AlertCircle, Trash2, Eye, User, LogOut,
  Loader2, MoreVertical, Mic, Home, ArrowRight, Shield
} from 'lucide-react';
import AudioRecorder from '../components/AudioRecorder';
import SubscriptionPanel from '../components/SubscriptionPanel';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const DashboardPage = () => {
  const navigate = useNavigate();
  const { user, logout, getAuthHeader } = useAuth();
  const { t } = useTranslation();
  const [transcriptions, setTranscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const [activeTab, setActiveTab] = useState('upload');

  const fetchTranscriptions = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/transcriptions`, { headers: getAuthHeader() });
      setTranscriptions(response.data);
    } catch (error) { console.error('Error:', error); }
    finally { setLoading(false); }
  }, [getAuthHeader]);

  useEffect(() => {
    fetchTranscriptions();
    const interval = setInterval(() => {
      if (transcriptions.some(t => t.status === 'processing')) fetchTranscriptions();
    }, 3000);
    return () => clearInterval(interval);
  }, [fetchTranscriptions, transcriptions]);

  const handleDrag = (e) => { e.preventDefault(); e.stopPropagation(); setDragActive(e.type === 'dragenter' || e.type === 'dragover'); };
  const handleDrop = (e) => {
    e.preventDefault(); e.stopPropagation(); setDragActive(false);
    const files = Array.from(e.dataTransfer.files || []);
    if (files.length > 1) { handleBatchUpload(files); } else if (files[0]) { handleFileUpload(files[0]); }
  };
  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 1) { handleBatchUpload(files); } else if (files[0]) { handleFileUpload(files[0]); }
  };

  const handleFileUpload = async (file) => {
    const allowedExtensions = ['.mp3', '.mp4', '.mpeg', '.mpga', '.m4a', '.wav', '.webm'];
    const fileExt = '.' + file.name.split('.').pop().toLowerCase();
    if (!allowedExtensions.includes(fileExt)) { toast.error(`${t('dashboard.invalidFormat')} ${allowedExtensions.join(', ')}`); return; }
    if (file.size > 25 * 1024 * 1024) { toast.error(t('dashboard.fileTooLarge')); return; }

    setUploading(true); setUploadProgress(0);
    const formData = new FormData();
    formData.append('file', file);
    try {
      await axios.post(`${API}/transcriptions/upload`, formData, {
        headers: { ...getAuthHeader(), 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (p) => setUploadProgress(Math.round((p.loaded * 100) / p.total)),
      });
      toast.success(t('dashboard.uploadSuccess'));
      fetchTranscriptions();
    } catch (error) { toast.error(error.response?.data?.detail || t('dashboard.uploadFail')); }
    finally { setUploading(false); setUploadProgress(0); }
  };

  const handleBatchUpload = async (files) => {
    const allowedExtensions = ['.mp3', '.mp4', '.mpeg', '.mpga', '.m4a', '.wav', '.webm'];
    const validFiles = files.filter(f => {
      const ext = '.' + f.name.split('.').pop().toLowerCase();
      return allowedExtensions.includes(ext) && f.size <= 25 * 1024 * 1024;
    });
    if (validFiles.length === 0) { toast.error(t('dashboard.invalidFormat')); return; }
    setUploading(true);
    let uploaded = 0;
    for (const file of validFiles) {
      const formData = new FormData();
      formData.append('file', file);
      try {
        await axios.post(`${API}/transcriptions/upload`, formData, {
          headers: { ...getAuthHeader(), 'Content-Type': 'multipart/form-data' },
          onUploadProgress: (p) => setUploadProgress(Math.round(((uploaded + p.loaded / p.total) / validFiles.length) * 100)),
        });
        uploaded++;
      } catch (error) {
        toast.error(`${file.name}: ${error.response?.data?.detail || t('dashboard.uploadFail')}`);
      }
    }
    if (uploaded > 0) toast.success(`${uploaded}/${validFiles.length} ${t('dashboard.uploadSuccess')}`);
    setUploading(false); setUploadProgress(0);
    fetchTranscriptions();
  };

  const handleDelete = async (id) => {
    if (!window.confirm(t('dashboard.deleteConfirm'))) return;
    try {
      await axios.delete(`${API}/transcriptions/${id}`, { headers: getAuthHeader() });
      toast.success(t('dashboard.deleteSuccess'));
      fetchTranscriptions();
    } catch { toast.error(t('dashboard.deleteFail')); }
  };

  const getStatusBadge = (status, progress) => {
    switch (status) {
      case 'processing': return (<div className="flex items-center gap-2"><Loader2 className="w-3.5 h-3.5 text-stele-accent animate-spin" strokeWidth={1.5} /><span className="font-mono text-xs tracking-wider text-stele-accent">{progress}%</span></div>);
      case 'completed': return (<div className="flex items-center gap-1.5 text-stele-success"><Check className="w-3.5 h-3.5" strokeWidth={1.5} /><span className="font-mono text-xs tracking-wider">{t('dashboard.statusCompleted')}</span></div>);
      case 'failed': return (<div className="flex items-center gap-1.5 text-stele-error"><AlertCircle className="w-3.5 h-3.5" strokeWidth={1.5} /><span className="font-mono text-xs tracking-wider">{t('dashboard.statusFailed')}</span></div>);
      default: return null;
    }
  };

  const formatDate = (d) => new Date(d).toLocaleDateString(t('lang') === 'fr' ? 'fr-FR' : 'en-US', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

  return (
    <div className="min-h-screen bg-stele-bg">
      <SEOHead page="/dashboard" />
      <header className="bg-stele-bg/90 backdrop-blur-xl border-b border-stele-border sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 md:px-12 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-stele-primary flex items-center justify-center"><Mic2 className="w-4 h-4 text-white" strokeWidth={1.5} /></div>
            <div>
              <h1 className="font-manrope font-bold text-lg text-stele-primary tracking-tight">VxScrib</h1>
              <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-stele-accent">{t('nav.dashboard')}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <LanguageSwitcher />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 hover:opacity-70 transition-opacity" data-testid="user-menu-trigger">
                  <span className="hidden sm:inline font-inter text-sm text-stele-muted">{user?.name}</span>
                  <div className="w-8 h-8 border border-stele-secondary flex items-center justify-center"><User className="w-4 h-4 text-stele-muted" strokeWidth={1.5} /></div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 rounded-none border-stele-secondary">
                <div className="px-3 py-2">
                  <p className="font-inter font-medium text-sm">{user?.name}</p>
                  <p className="font-inter text-xs text-stele-muted">{user?.email}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate('/')} data-testid="home-link"><Home className="w-4 h-4 mr-2" strokeWidth={1.5} />{t('nav.home')}</DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/profile')} data-testid="profile-link"><User className="w-4 h-4 mr-2" strokeWidth={1.5} />{t('profile.title')}</DropdownMenuItem>
                {user?.is_admin && (<DropdownMenuItem onClick={() => navigate('/admin')} data-testid="admin-link"><Shield className="w-4 h-4 mr-2" strokeWidth={1.5} />{t('nav.admin')}</DropdownMenuItem>)}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} className="text-stele-error" data-testid="logout-btn"><LogOut className="w-4 h-4 mr-2" strokeWidth={1.5} />{t('nav.logout')}</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 md:px-12 py-12">
        {/* Subscription Panel */}
        <SubscriptionPanel onStatusChange={fetchTranscriptions} />

        <div className="flex items-center gap-0 mb-10 border-b border-stele-border" data-testid="upload-tabs">
          <button onClick={() => setActiveTab('upload')} data-testid="upload-tab"
            className={`flex items-center gap-2 px-6 py-4 font-inter text-sm tracking-wider transition-colors duration-300 border-b-2 -mb-px ${activeTab === 'upload' ? 'border-stele-primary text-stele-primary' : 'border-transparent text-stele-muted hover:text-stele-primary'}`}>
            <Upload className="w-4 h-4" strokeWidth={1.5} />{t('dashboard.uploadTab')}
          </button>
          <button onClick={() => setActiveTab('record')} data-testid="record-tab"
            className={`flex items-center gap-2 px-6 py-4 font-inter text-sm tracking-wider transition-colors duration-300 border-b-2 -mb-px ${activeTab === 'record' ? 'border-stele-primary text-stele-primary' : 'border-transparent text-stele-muted hover:text-stele-primary'}`}>
            <Mic className="w-4 h-4" strokeWidth={1.5} />{t('dashboard.recordTab')}
          </button>
        </div>

        {activeTab === 'upload' && (
          <div className={`file-upload-area mb-12 ${dragActive ? 'dragging border-stele-primary' : ''} ${uploading ? 'pointer-events-none opacity-70' : ''}`}
            onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}
            onClick={() => !uploading && document.getElementById('file-input').click()} data-testid="file-upload-area">
            <input id="file-input" type="file" accept=".mp3,.mp4,.mpeg,.mpga,.m4a,.wav,.webm" multiple onChange={handleFileSelect} className="hidden" data-testid="file-input" />
            {uploading ? (
              <div className="space-y-6">
                <Loader2 className="w-8 h-8 mx-auto text-stele-primary animate-spin" strokeWidth={1} />
                <p className="font-inter text-sm text-stele-muted">{t('dashboard.uploading')}</p>
                <div className="w-64 mx-auto"><Progress value={uploadProgress} className="h-1" /></div>
                <p className="font-mono text-xs tracking-widest text-stele-accent">{uploadProgress}%</p>
              </div>
            ) : (
              <>
                <Upload className="w-8 h-8 text-stele-accent" strokeWidth={1} />
                <p className="font-inter text-stele-primary">{t('dashboard.dropTitle')}</p>
                <p className="font-inter text-sm text-stele-muted">{t('dashboard.dropSubtitle')}</p>
                <p className="font-mono text-xs tracking-widest text-stele-accent mt-2">{t('dashboard.dropFormats')}</p>
              </>
            )}
          </div>
        )}

        {activeTab === 'record' && <div className="mb-12"><AudioRecorder onRecordingComplete={handleFileUpload} disabled={uploading} /></div>}

        <div className="mb-8">
          <div className="flex items-end justify-between">
            <div><p className="overline mb-2">{t('dashboard.historyOverline')}</p><h2 className="font-playfair text-2xl text-stele-primary">{t('dashboard.historyTitle')}</h2></div>
            <p className="font-mono text-xs tracking-widest text-stele-accent">{transcriptions.length} {transcriptions.length !== 1 ? t('dashboard.filesCount') : t('dashboard.fileCount')}</p>
          </div>
          <div className="w-full h-px bg-stele-secondary mt-6"></div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24"><Loader2 className="w-6 h-6 text-stele-accent animate-spin" strokeWidth={1} /></div>
        ) : transcriptions.length === 0 ? (
          <div className="border border-stele-secondary border-dashed p-16 text-center">
            <FileAudio className="w-8 h-8 mx-auto text-stele-accent mb-4" strokeWidth={1} />
            <p className="font-inter text-stele-muted mb-1">{t('dashboard.noTranscriptions')}</p>
            <p className="font-inter text-sm text-stele-accent">{t('dashboard.noTranscriptionsHint')}</p>
          </div>
        ) : (
          <div className="space-y-0 divide-y divide-stele-border">
            {transcriptions.map((tr) => (
              <div key={tr.id} className="group py-6 transition-all duration-300 hover:bg-white/50" data-testid={`transcription-card-${tr.id}`}>
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-5 min-w-0 flex-1">
                    <div className="w-10 h-10 border border-stele-secondary flex items-center justify-center flex-shrink-0 group-hover:border-stele-primary transition-colors duration-500">
                      <FileAudio className="w-4 h-4 text-stele-accent" strokeWidth={1.5} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-manrope font-semibold text-sm text-stele-primary truncate tracking-tight">{tr.filename}</h3>
                      <div className="flex flex-wrap items-center gap-4 mt-1.5">
                        <span className="flex items-center gap-1.5 font-mono text-[10px] tracking-widest text-stele-accent uppercase">
                          <Clock className="w-3 h-3" strokeWidth={1.5} />{formatDate(tr.created_at)}
                        </span>
                        {tr.detected_language && (
                          <span className="flex items-center gap-1.5 font-mono text-[10px] tracking-widest text-stele-accent uppercase">
                            <Globe className="w-3 h-3" strokeWidth={1.5} />{t(`languages.${tr.detected_language}`) || tr.detected_language}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {getStatusBadge(tr.status, tr.progress)}
                    {tr.status === 'completed' && (
                      <button onClick={() => navigate(`/transcription/${tr.id}`)} data-testid={`view-transcription-${tr.id}`}
                        className="hidden sm:flex items-center gap-2 font-inter text-xs tracking-wider text-stele-muted hover:text-stele-primary transition-colors duration-300">
                        {t('dashboard.view')}<ArrowRight className="w-3 h-3" strokeWidth={1.5} />
                      </button>
                    )}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="w-8 h-8 flex items-center justify-center text-stele-muted hover:text-stele-primary transition-colors" data-testid={`transcription-menu-${tr.id}`}>
                          <MoreVertical className="w-4 h-4" strokeWidth={1.5} />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="rounded-none border-stele-secondary">
                        {tr.status === 'completed' && (
                          <DropdownMenuItem onClick={() => navigate(`/transcription/${tr.id}`)}><Eye className="w-4 h-4 mr-2" strokeWidth={1.5} />{t('dashboard.viewTranscription')}</DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => handleDelete(tr.id)} className="text-stele-error"><Trash2 className="w-4 h-4 mr-2" strokeWidth={1.5} />{t('dashboard.delete')}</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
                {tr.status === 'processing' && <div className="mt-4"><Progress value={tr.progress} className="h-0.5" /></div>}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default DashboardPage;
