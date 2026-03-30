import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../context/LanguageContext';
import LanguageSwitcher from '../components/LanguageSwitcher';
import SEOHead from '../components/SEOHead';
import { toast } from 'sonner';
import { Mic2, Loader2 } from 'lucide-react';

const LoginPage = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ email: '', password: '' });

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(formData.email, formData.password);
      toast.success(t('auth.loginSuccess'));
      navigate('/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.detail || t('auth.invalidCredentials'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-stele-bg flex">
      <SEOHead page="/login" />
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="flex items-center justify-between mb-16">
            <Link to="/" className="flex items-center gap-3" data-testid="logo-link">
              <div className="w-8 h-8 bg-stele-primary flex items-center justify-center">
                <Mic2 className="w-4 h-4 text-white" strokeWidth={1.5} />
              </div>
              <span className="font-manrope font-bold text-lg text-stele-primary">TranscriptFlow</span>
            </Link>
            <LanguageSwitcher />
          </div>

          <p className="overline mb-4">{t('auth.welcomeBack')}</p>
          <h1 className="font-playfair text-3xl md:text-4xl tracking-tight text-stele-primary mb-2">{t('auth.loginTitle')}</h1>
          <p className="font-inter text-sm text-stele-muted mb-12">{t('auth.loginSubtitle')}</p>

          <form onSubmit={handleSubmit} className="space-y-8">
            <div>
              <label htmlFor="email" className="font-inter text-xs tracking-[0.15em] uppercase text-stele-accent block mb-3">{t('auth.email')}</label>
              <input id="email" name="email" type="email" placeholder={t('auth.emailPlaceholder')} value={formData.email}
                onChange={handleChange} required className="input-stele w-full" data-testid="login-email-input" />
            </div>
            <div>
              <label htmlFor="password" className="font-inter text-xs tracking-[0.15em] uppercase text-stele-accent block mb-3">{t('auth.password')}</label>
              <input id="password" name="password" type="password" placeholder="&#8226;&#8226;&#8226;&#8226;&#8226;&#8226;&#8226;&#8226;"
                value={formData.password} onChange={handleChange} required className="input-stele w-full" data-testid="login-password-input" />
            </div>
            <button type="submit" className="btn-stele w-full flex items-center justify-center gap-2" disabled={loading} data-testid="login-submit-btn">
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" />{t('auth.loggingIn')}</> : t('auth.loginBtn')}
            </button>
          </form>

          <div className="mt-10 pt-8 border-t border-stele-secondary">
            <p className="font-inter text-sm text-stele-muted">
              {t('auth.noAccount')}{' '}
              <Link to="/register" className="text-stele-primary hover:text-stele-accent transition-colors underline underline-offset-4" data-testid="register-link">
                {t('auth.createAccount')}
              </Link>
            </p>
          </div>
        </div>
      </div>

      <div className="hidden lg:block lg:w-1/2 relative">
        <img src="https://static.prod-images.emergentagent.com/jobs/b8e781d6-d45d-487f-8504-1d30db03f44e/images/4bed761fee4e32d7fd9d37cbbe2d2db0d99bbc3f7e82cfbc99d84b001a60377e.png" alt="" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-stele-primary/40"></div>
        <div className="absolute bottom-12 left-12 right-12 z-10">
          <p className="font-playfair text-2xl text-white/90 leading-relaxed">"{t('auth.quoteLogin')}"</p>
          <p className="font-inter text-sm text-white/50 mt-4 tracking-wide">TranscriptFlow</p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
