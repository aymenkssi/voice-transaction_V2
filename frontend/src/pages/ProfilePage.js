import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../context/LanguageContext';
import LanguageSwitcher from '../components/LanguageSwitcher';
import axios from 'axios';
import { toast } from 'sonner';
import {
  Mic2, ArrowLeft, User, Download, Trash2, Shield, Loader2
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ProfilePage = () => {
  const navigate = useNavigate();
  const { user, logout, getAuthHeader } = useAuth();
  const { t } = useTranslation();
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleExportData = async () => {
    setExporting(true);
    try {
      const response = await axios.get(`${API}/auth/export-data`, {
        headers: getAuthHeader()
      });
      const blob = new Blob([JSON.stringify(response.data, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `vxscrib_data_${user.email}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success(t('profile.exportSuccess'));
    } catch (err) {
      toast.error(t('profile.exportFail'));
    } finally {
      setExporting(false);
    }
  };

  const handleDeleteAccount = async () => {
    const confirmWord = t('profile.deleteConfirmWord');
    const input = prompt(t('profile.deleteConfirm'));
    if (input !== confirmWord) return;

    setDeleting(true);
    try {
      await axios.delete(`${API}/auth/account`, { headers: getAuthHeader() });
      toast.success(t('profile.deleteSuccess'));
      logout();
      navigate('/');
    } catch (err) {
      toast.error(t('profile.deleteFail'));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-stele-bg">
      <header className="bg-stele-bg/90 backdrop-blur-xl border-b border-stele-border sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 md:px-12 py-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/dashboard')} className="w-8 h-8 border border-stele-secondary flex items-center justify-center hover:border-stele-primary transition-colors" data-testid="back-btn">
              <ArrowLeft className="w-4 h-4" strokeWidth={1.5} />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-stele-primary flex items-center justify-center">
                <User className="w-4 h-4 text-white" strokeWidth={1.5} />
              </div>
              <div>
                <h1 className="font-manrope font-bold text-lg text-stele-primary tracking-tight">{t('profile.title')}</h1>
                <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-stele-accent">VxScrib</p>
              </div>
            </div>
          </div>
          <LanguageSwitcher />
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 md:px-12 py-12">
        <p className="overline mb-4">{t('profile.overline')}</p>
        <h2 className="font-playfair text-2xl text-stele-primary mb-10">{t('profile.title')}</h2>

        {/* Personal Info */}
        <div className="border border-stele-secondary bg-white mb-8">
          <div className="px-8 py-5 border-b border-stele-border">
            <span className="font-mono text-xs tracking-[0.15em] uppercase text-stele-accent">
              {t('profile.personalInfo')}
            </span>
          </div>
          <div className="p-8">
            <dl className="space-y-4 text-sm">
              <div className="flex justify-between">
                <dt className="font-inter text-stele-muted">{t('auth.name')}</dt>
                <dd className="font-inter font-medium text-stele-primary">{user?.name}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="font-inter text-stele-muted">{t('auth.email')}</dt>
                <dd className="font-inter font-medium text-stele-primary">{user?.email}</dd>
              </div>
            </dl>
          </div>
        </div>

        {/* GDPR Rights */}
        <div className="border border-stele-secondary bg-white mb-8">
          <div className="px-8 py-5 border-b border-stele-border flex items-center gap-2">
            <Shield className="w-4 h-4 text-stele-accent" strokeWidth={1.5} />
            <span className="font-mono text-xs tracking-[0.15em] uppercase text-stele-accent">
              {t('profile.dataRights')}
            </span>
          </div>
          <div className="p-8 space-y-8">
            {/* Export Data */}
            <div>
              <h3 className="font-manrope font-semibold text-sm text-stele-primary mb-2">{t('profile.exportData')}</h3>
              <p className="font-inter text-sm text-stele-muted mb-4">{t('profile.exportDataDesc')}</p>
              <button
                onClick={handleExportData}
                disabled={exporting}
                className="btn-stele-outline text-xs flex items-center gap-2"
                data-testid="export-data-btn"
              >
                {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" strokeWidth={1.5} /> : <Download className="w-3.5 h-3.5" strokeWidth={1.5} />}
                {exporting ? t('profile.exporting') : t('profile.exportBtn')}
              </button>
            </div>

            <div className="h-px bg-stele-border"></div>

            {/* Delete Account */}
            <div>
              <h3 className="font-manrope font-semibold text-sm text-stele-error mb-2">{t('profile.deleteAccount')}</h3>
              <p className="font-inter text-sm text-stele-muted mb-4">{t('profile.deleteAccountDesc')}</p>
              <button
                onClick={handleDeleteAccount}
                disabled={deleting}
                className="bg-stele-error text-white px-6 py-3 font-inter text-xs tracking-widest uppercase hover:opacity-80 transition-opacity flex items-center gap-2"
                data-testid="delete-account-btn"
              >
                {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" strokeWidth={1.5} /> : <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />}
                {deleting ? '...' : t('profile.deleteBtn')}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ProfilePage;
