import { Link } from 'react-router-dom';
import { useTranslation } from '../context/LanguageContext';
import LanguageSwitcher from '../components/LanguageSwitcher';
import SEOHead from '../components/SEOHead';
import { Mic2, ArrowLeft } from 'lucide-react';

const TermsPage = () => {
  const { t } = useTranslation();
  const sections = t('terms.sections');

  return (
    <div className="min-h-screen bg-stele-bg">
      <SEOHead page="/terms" />
      <nav className="bg-stele-bg/90 backdrop-blur-xl border-b border-stele-border sticky top-0 z-50" role="navigation" aria-label="Terms navigation">
        <div className="max-w-7xl mx-auto px-6 md:px-12 py-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/" className="w-8 h-8 border border-stele-secondary flex items-center justify-center hover:border-stele-primary transition-colors" data-testid="back-link">
              <ArrowLeft className="w-4 h-4" strokeWidth={1.5} />
            </Link>
            <Link to="/" className="flex items-center gap-3">
              <div className="w-8 h-8 bg-stele-primary flex items-center justify-center">
                <Mic2 className="w-4 h-4 text-white" strokeWidth={1.5} />
              </div>
              <span className="font-manrope font-bold text-lg text-stele-primary">VxScrib</span>
            </Link>
          </div>
          <LanguageSwitcher />
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-6 md:px-12 py-16 md:py-24">
        <p className="overline mb-4">{t('terms.overline')}</p>
        <h1 className="font-playfair text-3xl md:text-4xl tracking-tight text-stele-primary mb-3" data-testid="terms-title">
          {t('terms.title')}
        </h1>
        <p className="font-inter text-sm text-stele-muted mb-12">
          {t('terms.lastUpdated')} : 30 mars 2026
        </p>

        <div className="space-y-10">
          {Array.isArray(sections) && sections.map((section, i) => (
            <div key={i} data-testid={`terms-section-${i}`}>
              <h2 className="font-manrope font-semibold text-lg text-stele-primary mb-4 tracking-tight">
                {section.title}
              </h2>
              <div className="font-inter text-sm text-stele-muted leading-relaxed whitespace-pre-line">
                {section.content}
              </div>
              {i < sections.length - 1 && <div className="divider-stele mt-10"></div>}
            </div>
          ))}
        </div>

        <div className="mt-16 pt-8 border-t border-stele-border flex flex-wrap gap-6">
          <Link to="/privacy" className="font-inter text-sm text-stele-muted hover:text-stele-primary transition-colors underline underline-offset-4" data-testid="privacy-link">
            {t('nav.privacy')}
          </Link>
          <Link to="/" className="font-inter text-sm text-stele-muted hover:text-stele-primary transition-colors underline underline-offset-4">
            {t('nav.home')}
          </Link>
        </div>
      </main>
    </div>
  );
};

export default TermsPage;
