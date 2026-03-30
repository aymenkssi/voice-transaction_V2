import { useState, useEffect } from 'react';
import { useTranslation } from '../context/LanguageContext';
import { X, Settings2 } from 'lucide-react';

const CookieConsent = () => {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);
  const [showCustomize, setShowCustomize] = useState(false);
  const [analytics, setAnalytics] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('tf_cookie_consent');
    if (!consent) {
      const timer = setTimeout(() => setVisible(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('tf_cookie_consent', JSON.stringify({ essential: true, analytics: true }));
    setVisible(false);
  };

  const handleReject = () => {
    localStorage.setItem('tf_cookie_consent', JSON.stringify({ essential: true, analytics: false }));
    setVisible(false);
  };

  const handleSavePrefs = () => {
    localStorage.setItem('tf_cookie_consent', JSON.stringify({ essential: true, analytics }));
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[100] p-4 md:p-6" data-testid="cookie-banner">
      <div className="max-w-3xl mx-auto bg-white border border-stele-secondary shadow-ambient">
        <div className="p-6 md:p-8">
          <div className="flex items-start justify-between gap-4 mb-4">
            <h3 className="font-manrope font-semibold text-sm text-stele-primary tracking-tight">
              {t('cookie.title')}
            </h3>
            <button onClick={handleReject} className="text-stele-muted hover:text-stele-primary transition-colors" data-testid="cookie-close">
              <X className="w-4 h-4" strokeWidth={1.5} />
            </button>
          </div>

          <p className="font-inter text-sm text-stele-muted leading-relaxed mb-6">
            {t('cookie.message')}
          </p>

          {showCustomize && (
            <div className="space-y-4 mb-6 pt-4 border-t border-stele-border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-inter text-sm font-medium text-stele-primary">{t('cookie.essential')}</p>
                  <p className="font-inter text-xs text-stele-muted">{t('cookie.essentialDesc')}</p>
                </div>
                <div className="w-10 h-5 bg-stele-primary rounded-full flex items-center justify-end px-0.5 cursor-not-allowed">
                  <div className="w-4 h-4 bg-white rounded-full"></div>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-inter text-sm font-medium text-stele-primary">{t('cookie.analytics')}</p>
                  <p className="font-inter text-xs text-stele-muted">{t('cookie.analyticsDesc')}</p>
                </div>
                <button
                  onClick={() => setAnalytics(!analytics)}
                  data-testid="cookie-analytics-toggle"
                  className={`w-10 h-5 rounded-full flex items-center px-0.5 transition-colors ${analytics ? 'bg-stele-primary justify-end' : 'bg-stele-secondary justify-start'}`}
                >
                  <div className="w-4 h-4 bg-white rounded-full"></div>
                </button>
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            <button onClick={handleAccept} className="btn-stele text-[10px] px-5 py-2.5" data-testid="cookie-accept">
              {t('cookie.accept')}
            </button>
            <button onClick={handleReject} className="btn-stele-outline text-[10px] px-5 py-2.5" data-testid="cookie-reject">
              {t('cookie.reject')}
            </button>
            {!showCustomize ? (
              <button
                onClick={() => setShowCustomize(true)}
                className="flex items-center gap-1.5 font-inter text-[10px] tracking-widest uppercase text-stele-muted hover:text-stele-primary transition-colors px-3 py-2.5"
                data-testid="cookie-customize"
              >
                <Settings2 className="w-3 h-3" strokeWidth={1.5} />
                {t('cookie.customize')}
              </button>
            ) : (
              <button onClick={handleSavePrefs} className="btn-stele-outline text-[10px] px-5 py-2.5" data-testid="cookie-save-prefs">
                {t('cookie.savePrefs')}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CookieConsent;
