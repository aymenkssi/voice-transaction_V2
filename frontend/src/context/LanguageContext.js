import { createContext, useContext, useState, useCallback } from 'react';
import fr from '../i18n/fr.json';
import en from '../i18n/en.json';

const translations = { fr, en };

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
  const [lang, setLang] = useState(() => {
    const saved = localStorage.getItem('tf_lang');
    if (saved && translations[saved]) return saved;
    const browserLang = navigator.language?.slice(0, 2);
    return translations[browserLang] ? browserLang : 'fr';
  });

  const t = useCallback((path) => {
    const keys = path.split('.');
    let val = translations[lang];
    for (const key of keys) {
      if (val == null) return path;
      val = val[key];
    }
    return val ?? path;
  }, [lang]);

  const switchLang = useCallback((newLang) => {
    if (translations[newLang]) {
      setLang(newLang);
      localStorage.setItem('tf_lang', newLang);
    }
  }, []);

  return (
    <LanguageContext.Provider value={{ lang, t, switchLang }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useTranslation = () => {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useTranslation must be used within LanguageProvider');
  return ctx;
};
