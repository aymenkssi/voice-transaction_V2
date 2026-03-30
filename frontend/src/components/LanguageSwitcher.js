import { Globe } from 'lucide-react';
import { useTranslation } from '../context/LanguageContext';

const LanguageSwitcher = () => {
  const { lang, switchLang } = useTranslation();

  return (
    <button
      onClick={() => switchLang(lang === 'fr' ? 'en' : 'fr')}
      className="flex items-center gap-1.5 font-mono text-xs tracking-wider text-stele-muted hover:text-stele-primary transition-colors duration-300"
      data-testid="language-switcher"
      title={lang === 'fr' ? 'Switch to English' : 'Passer en Français'}
    >
      <Globe className="w-3.5 h-3.5" strokeWidth={1.5} />
      {lang.toUpperCase()}
    </button>
  );
};

export default LanguageSwitcher;
