import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../context/LanguageContext';
import LanguageSwitcher from '../components/LanguageSwitcher';
import SEOHead from '../components/SEOHead';
import StructuredData from '../components/StructuredData';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import { Mic2, Upload, FileText, Globe, Zap, Shield, User, LogOut, LayoutDashboard, ArrowRight } from 'lucide-react';

const LandingPage = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const featureIcons = [
    <Upload className="w-5 h-5" strokeWidth={1.5} />,
    <Mic2 className="w-5 h-5" strokeWidth={1.5} />,
    <Globe className="w-5 h-5" strokeWidth={1.5} />,
    <FileText className="w-5 h-5" strokeWidth={1.5} />,
    <Zap className="w-5 h-5" strokeWidth={1.5} />,
    <Shield className="w-5 h-5" strokeWidth={1.5} />,
  ];

  const features = t('landing.features');
  const steps = t('landing.steps');

  return (
    <div className="min-h-screen bg-stele-bg">
      <SEOHead page="/" />
      <StructuredData type="website" />
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-stele-bg/90 backdrop-blur-xl border-b border-stele-border" role="navigation" aria-label="Main navigation">
        <div className="max-w-7xl mx-auto px-6 md:px-12 py-5 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3" data-testid="logo-link">
            <div className="w-8 h-8 bg-stele-primary flex items-center justify-center">
              <Mic2 className="w-4 h-4 text-white" strokeWidth={1.5} />
            </div>
            <span className="font-manrope font-bold text-lg tracking-tight text-stele-primary">VxScrib</span>
          </Link>
          <div className="flex items-center gap-6">
            <LanguageSwitcher />
            {isAuthenticated ? (
              <>
                <button onClick={() => navigate('/dashboard')} data-testid="dashboard-nav-btn"
                  className="hidden sm:flex items-center gap-2 font-inter text-sm text-stele-muted hover:text-stele-primary transition-colors duration-300">
                  <LayoutDashboard className="w-4 h-4" strokeWidth={1.5} />
                  {t('nav.dashboard')}
                </button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="w-8 h-8 border border-stele-secondary hover:border-stele-primary flex items-center justify-center transition-colors duration-300" data-testid="user-menu-trigger">
                      <User className="w-4 h-4 text-stele-muted" strokeWidth={1.5} />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48 rounded-none border-stele-secondary">
                    <div className="px-3 py-2">
                      <p className="font-inter font-medium text-sm">{user?.name}</p>
                      <p className="font-inter text-xs text-stele-muted">{user?.email}</p>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => navigate('/dashboard')} data-testid="dropdown-dashboard">
                      <LayoutDashboard className="w-4 h-4 mr-2" strokeWidth={1.5} />
                      {t('nav.dashboard')}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={logout} className="text-stele-error" data-testid="logout-btn">
                      <LogOut className="w-4 h-4 mr-2" strokeWidth={1.5} />
                      {t('nav.logout')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <>
                <button onClick={() => navigate('/login')} data-testid="login-nav-btn"
                  className="font-inter text-sm text-stele-muted hover:text-stele-primary transition-colors duration-300">
                  {t('nav.login')}
                </button>
                <button onClick={() => navigate('/register')} data-testid="register-nav-btn" className="btn-stele text-xs px-6 py-3">
                  {t('nav.register')}
                </button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="hero-stele relative min-h-[90vh] flex items-center bg-gradient-to-br from-stele-bg via-white to-stele-secondary" aria-label="Hero">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(0,0,0,0.03)_0%,transparent_50%)]"></div>
        <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-12 lg:px-24 pt-32 pb-24">
          <div className="max-w-3xl">
            <p className="overline mb-6 opacity-0 animate-fade-in">{t('landing.overline')}</p>
            <h1 className="font-playfair text-5xl md:text-6xl lg:text-7xl tracking-tighter text-stele-primary leading-[1.05] mb-8 opacity-0 animate-fade-in animate-delay-100">
              {t('landing.title')}
            </h1>
            <p className="font-inter text-base md:text-lg text-stele-muted max-w-xl leading-relaxed mb-12 opacity-0 animate-fade-in animate-delay-200">
              {t('landing.subtitle')}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 opacity-0 animate-fade-in animate-delay-300">
              <button onClick={() => navigate(isAuthenticated ? '/dashboard' : '/register')} data-testid="hero-cta-btn"
                className="btn-stele inline-flex items-center gap-3">
                {t('landing.cta')}
                <ArrowRight className="w-4 h-4" strokeWidth={1.5} />
              </button>
              <button onClick={() => document.getElementById('features').scrollIntoView({ behavior: 'smooth' })}
                data-testid="learn-more-btn" className="btn-stele-outline">
                {t('landing.learnMore')}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <main>
      <section id="features" className="py-24 md:py-32 px-6 md:px-12 bg-white border-t border-stele-border" aria-label="Features">
        <div className="max-w-7xl mx-auto">
          <div className="mb-20">
            <p className="overline mb-4">{t('landing.featuresOverline')}</p>
            <h2 className="font-playfair text-3xl md:text-4xl tracking-tight text-stele-primary">{t('landing.featuresTitle')}</h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-px bg-stele-border stagger-fade-in">
            {Array.isArray(features) && features.map((feature, i) => (
              <div key={i} className="feature-card bg-white p-10 md:p-12 opacity-0 animate-fade-in" data-testid={`feature-card-${i}`}>
                <div className="w-10 h-10 border border-stele-secondary flex items-center justify-center text-stele-accent mb-6">
                  {featureIcons[i]}
                </div>
                <h3 className="font-manrope font-semibold text-lg text-stele-primary mb-3 tracking-tight">{feature.title}</h3>
                <p className="font-inter text-sm text-stele-muted leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="py-24 md:py-32 px-6 md:px-12 bg-stele-bg border-t border-stele-border relative" aria-label="How it works">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(0,0,0,0.02)_0%,transparent_50%)]"></div>
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="mb-20">
            <p className="overline mb-4">{t('landing.processOverline')}</p>
            <h2 className="font-playfair text-3xl md:text-4xl tracking-tight text-stele-primary">{t('landing.processTitle')}</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-16 md:gap-24">
            {Array.isArray(steps) && steps.map((item, i) => (
              <div key={i} data-testid={`how-it-works-${i}`}>
                <span className="font-mono text-xs tracking-[0.3em] text-stele-accent uppercase">{item.step}</span>
                <div className="w-full h-px bg-stele-secondary my-4"></div>
                <h3 className="font-playfair text-2xl text-stele-primary mb-3">{item.title}</h3>
                <p className="font-inter text-sm text-stele-muted leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative py-24 md:py-32 px-6 md:px-12 bg-stele-primary overflow-hidden" aria-label="Call to action">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.1)_0%,transparent_70%)]"></div>
        <div className="max-w-3xl mx-auto text-center relative z-10">
          <p className="font-inter text-xs tracking-[0.2em] uppercase font-medium text-stele-accent mb-6">{t('landing.ctaOverline')}</p>
          <h2 className="font-playfair text-3xl md:text-5xl text-white mb-6 tracking-tight">{t('landing.ctaTitle')}</h2>
          <p className="font-inter text-white/60 mb-10 max-w-xl mx-auto leading-relaxed">{t('landing.ctaSubtitle')}</p>
          <button onClick={() => navigate(isAuthenticated ? '/dashboard' : '/register')} data-testid="cta-bottom-btn"
            className="bg-white text-stele-primary px-8 py-4 font-inter text-sm tracking-widest uppercase hover:bg-stele-accent hover:text-white transition-colors duration-300 inline-flex items-center gap-3">
            {t('landing.ctaButton')}
            <ArrowRight className="w-4 h-4" strokeWidth={1.5} />
          </button>
        </div>
      </section>
      </main>

      {/* Footer */}
      <footer className="py-12 px-6 md:px-12 bg-stele-bg border-t border-stele-border" role="contentinfo">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 bg-stele-primary flex items-center justify-center">
              <Mic2 className="w-3 h-3 text-white" strokeWidth={1.5} />
            </div>
            <span className="font-manrope font-bold text-sm text-stele-primary">VxScrib</span>
          </div>
          <div className="flex items-center gap-6">
            <Link to="/privacy" className="font-inter text-xs text-stele-muted hover:text-stele-primary transition-colors" data-testid="footer-privacy">
              {t('nav.privacy')}
            </Link>
            <Link to="/terms" className="font-inter text-xs text-stele-muted hover:text-stele-primary transition-colors" data-testid="footer-terms">
              {t('nav.terms')}
            </Link>
          </div>
          <p className="font-inter text-xs text-stele-muted tracking-wide">&copy; 2026 VxScrib. {t('landing.footer')}</p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
