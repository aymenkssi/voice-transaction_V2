import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../context/LanguageContext';
import LanguageSwitcher from '../components/LanguageSwitcher';
import SEOHead from '../components/SEOHead';
import { toast } from 'sonner';
import { Mic2, Loader2 } from 'lucide-react';

const RegisterPage = () => {
  const navigate = useNavigate();
  const { register } = useAuth();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [rgpdAccepted, setRgpdAccepted] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', password: '', confirmPassword: '' });

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!rgpdAccepted) { toast.error(t('auth.rgpdRequired')); return; }
    if (formData.password !== formData.confirmPassword) { toast.error(t('auth.passwordMismatch')); return; }
    if (formData.password.length < 6) { toast.error(t('auth.passwordTooShort')); return; }

    setLoading(true);
    try {
      await register(formData.email, formData.password, formData.name);
      toast.success(t('auth.registerSuccess'));
      navigate('/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.detail || t('auth.registerError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-stele-bg flex">
      <SEOHead page="/register" />
      <div className="hidden lg:block lg:w-1/2 relative">
        <img src="https://static.prod-images.emergentagent.com/jobs/b8e781d6-d45d-487f-8504-1d30db03f44e/images/c08646188e1c34ab17c5b2ab8452beafae317b2760310fef43097e96d3ee1415.png" alt="Illustration inscription TranscriptFlow" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
        <div className="absolute inset-0 bg-stele-bg/30"></div>
        <div className="absolute bottom-12 left-12 right-12 z-10">
          <p className="font-playfair text-2xl text-stele-primary leading-relaxed">"{t('auth.quoteRegister')}"</p>
          <p className="font-inter text-sm text-stele-muted mt-4 tracking-wide">VxScrib</p>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="flex items-center justify-between mb-16">
            <Link to="/" className="flex items-center gap-3" data-testid="logo-link">
              <div className="w-8 h-8 bg-stele-primary flex items-center justify-center">
                <Mic2 className="w-4 h-4 text-white" strokeWidth={1.5} />
              </div>
              <span className="font-manrope font-bold text-lg text-stele-primary">VxScrib</span>
            </Link>
            <LanguageSwitcher />
          </div>

          <p className="overline mb-4">{t('auth.registerOverline')}</p>
          <h1 className="font-playfair text-3xl md:text-4xl tracking-tight text-stele-primary mb-2">{t('auth.registerTitle')}</h1>
          <p className="font-inter text-sm text-stele-muted mb-12">{t('auth.registerSubtitle')}</p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="name" className="font-inter text-xs tracking-[0.15em] uppercase text-stele-accent block mb-3">{t('auth.name')}</label>
              <input id="name" name="name" type="text" placeholder={t('auth.namePlaceholder')} value={formData.name}
                onChange={handleChange} required className="input-stele w-full" data-testid="register-name-input" />
            </div>
            <div>
              <label htmlFor="email" className="font-inter text-xs tracking-[0.15em] uppercase text-stele-accent block mb-3">{t('auth.email')}</label>
              <input id="email" name="email" type="email" placeholder={t('auth.emailPlaceholder')} value={formData.email}
                onChange={handleChange} required className="input-stele w-full" data-testid="register-email-input" />
            </div>
            <div>
              <label htmlFor="password" className="font-inter text-xs tracking-[0.15em] uppercase text-stele-accent block mb-3">{t('auth.password')}</label>
              <input id="password" name="password" type="password" placeholder="&#8226;&#8226;&#8226;&#8226;&#8226;&#8226;&#8226;&#8226;"
                value={formData.password} onChange={handleChange} required className="input-stele w-full" data-testid="register-password-input" />
            </div>
            <div>
              <label htmlFor="confirmPassword" className="font-inter text-xs tracking-[0.15em] uppercase text-stele-accent block mb-3">{t('auth.confirmPassword')}</label>
              <input id="confirmPassword" name="confirmPassword" type="password" placeholder="&#8226;&#8226;&#8226;&#8226;&#8226;&#8226;&#8226;&#8226;"
                value={formData.confirmPassword} onChange={handleChange} required className="input-stele w-full" data-testid="register-confirm-password-input" />
            </div>

            {/* RGPD Consent */}
            <div className="flex items-start gap-3 pt-2">
              <input type="checkbox" id="rgpd" checked={rgpdAccepted} onChange={(e) => setRgpdAccepted(e.target.checked)}
                className="mt-1 w-4 h-4 border-stele-secondary accent-stele-primary" data-testid="rgpd-checkbox" />
              <label htmlFor="rgpd" className="font-inter text-xs text-stele-muted leading-relaxed">
                {t('auth.rgpdConsent')}{' '}
                <Link to="/privacy" className="text-stele-primary underline underline-offset-2" target="_blank">{t('auth.rgpdPrivacy')}</Link>
                {' '}{t('auth.rgpdAnd')}{' '}
                <Link to="/terms" className="text-stele-primary underline underline-offset-2" target="_blank">{t('auth.rgpdTerms')}</Link>
              </label>
            </div>

            <button type="submit" className="btn-stele w-full flex items-center justify-center gap-2" disabled={loading} data-testid="register-submit-btn">
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" />{t('auth.creating')}</> : t('auth.registerBtn')}
            </button>
          </form>

          <div className="mt-10 pt-8 border-t border-stele-secondary">
            <p className="font-inter text-sm text-stele-muted">
              {t('auth.hasAccount')}{' '}
              <Link to="/login" className="text-stele-primary hover:text-stele-accent transition-colors underline underline-offset-4" data-testid="login-link">
                {t('auth.signIn')}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
