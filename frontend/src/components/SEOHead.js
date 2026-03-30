import { Helmet } from 'react-helmet-async';
import { useTranslation } from '../context/LanguageContext';

const SITE_URL = 'https://transcriptflow.com';
const SITE_NAME = 'TranscriptFlow';

const seoData = {
  '/': {
    fr: {
      title: 'TranscriptFlow — Transcription Audio IA Professionnelle',
      description: 'Transcrivez vos fichiers audio et vidéo en texte avec une précision professionnelle grâce à l\'IA Whisper. Multilingue, export SRT/TXT, traduction automatique. Essayez gratuitement.',
      keywords: 'transcription audio, transcription IA, convertir audio en texte, Whisper AI, transcription automatique, sous-titres, SRT, transcription vidéo, transcription en ligne'
    },
    en: {
      title: 'TranscriptFlow — Professional AI Audio Transcription',
      description: 'Transcribe your audio and video files to text with professional accuracy using Whisper AI. Multilingual, SRT/TXT export, auto-translation. Try free.',
      keywords: 'audio transcription, AI transcription, convert audio to text, Whisper AI, automatic transcription, subtitles, SRT, video transcription, online transcription'
    }
  },
  '/login': {
    fr: {
      title: 'Connexion — TranscriptFlow',
      description: 'Connectez-vous à votre compte TranscriptFlow pour accéder à vos transcriptions audio et vidéo.',
      keywords: 'connexion TranscriptFlow, login transcription'
    },
    en: {
      title: 'Login — TranscriptFlow',
      description: 'Log in to your TranscriptFlow account to access your audio and video transcriptions.',
      keywords: 'TranscriptFlow login, transcription login'
    }
  },
  '/register': {
    fr: {
      title: 'Créer un Compte — TranscriptFlow',
      description: 'Inscrivez-vous gratuitement sur TranscriptFlow et commencez à transcrire vos fichiers audio avec l\'IA Whisper.',
      keywords: 'inscription TranscriptFlow, créer compte transcription, essai gratuit transcription IA'
    },
    en: {
      title: 'Create Account — TranscriptFlow',
      description: 'Sign up free on TranscriptFlow and start transcribing your audio files with Whisper AI.',
      keywords: 'TranscriptFlow signup, create transcription account, free AI transcription trial'
    }
  },
  '/dashboard': {
    fr: {
      title: 'Tableau de Bord — TranscriptFlow',
      description: 'Gérez vos transcriptions audio, uploadez de nouveaux fichiers et suivez votre utilisation sur TranscriptFlow.',
      keywords: 'dashboard transcription, gestion transcription audio'
    },
    en: {
      title: 'Dashboard — TranscriptFlow',
      description: 'Manage your audio transcriptions, upload new files and track your usage on TranscriptFlow.',
      keywords: 'transcription dashboard, audio transcription management'
    }
  },
  '/privacy': {
    fr: {
      title: 'Politique de Confidentialité — TranscriptFlow',
      description: 'Découvrez comment TranscriptFlow protège vos données personnelles et respecte le RGPD. Transparence totale sur le traitement de vos informations.',
      keywords: 'politique confidentialité, RGPD, protection données, TranscriptFlow vie privée'
    },
    en: {
      title: 'Privacy Policy — TranscriptFlow',
      description: 'Learn how TranscriptFlow protects your personal data and complies with GDPR. Full transparency on how your information is processed.',
      keywords: 'privacy policy, GDPR, data protection, TranscriptFlow privacy'
    }
  },
  '/terms': {
    fr: {
      title: 'Conditions d\'Utilisation — TranscriptFlow',
      description: 'Consultez les conditions générales d\'utilisation de TranscriptFlow, le service de transcription audio par IA.',
      keywords: 'conditions utilisation, CGU, TranscriptFlow termes'
    },
    en: {
      title: 'Terms of Service — TranscriptFlow',
      description: 'View TranscriptFlow\'s terms of service for the AI audio transcription platform.',
      keywords: 'terms of service, terms and conditions, TranscriptFlow terms'
    }
  }
};

const SEOHead = ({ page = '/', customTitle, customDescription }) => {
  const { t } = useTranslation();
  const lang = t('lang') || 'fr';
  const altLang = lang === 'fr' ? 'en' : 'fr';

  const pageData = seoData[page]?.[lang] || seoData['/'][lang];
  const altPageData = seoData[page]?.[altLang] || seoData['/'][altLang];

  const title = customTitle || pageData.title;
  const description = customDescription || pageData.description;
  const keywords = pageData.keywords;
  const canonicalUrl = `${SITE_URL}${page === '/' ? '' : page}`;

  return (
    <Helmet>
      {/* Basic Meta */}
      <html lang={lang} />
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      <meta name="robots" content="index, follow" />
      <link rel="canonical" href={canonicalUrl} />

      {/* Hreflang for bilingual SEO */}
      <link rel="alternate" hrefLang={lang} href={canonicalUrl} />
      <link rel="alternate" hrefLang={altLang} href={canonicalUrl} />
      <link rel="alternate" hrefLang="x-default" href={`${SITE_URL}${page === '/' ? '' : page}`} />

      {/* Open Graph (Facebook, LinkedIn) */}
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:locale" content={lang === 'fr' ? 'fr_FR' : 'en_US'} />
      <meta property="og:locale:alternate" content={altLang === 'fr' ? 'fr_FR' : 'en_US'} />

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />

      {/* Additional SEO */}
      <meta name="author" content="TranscriptFlow" />
      <meta name="application-name" content="TranscriptFlow" />
      <meta name="theme-color" content="#111111" />
    </Helmet>
  );
};

export default SEOHead;
