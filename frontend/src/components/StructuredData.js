import { Helmet } from 'react-helmet-async';
import { useTranslation } from '../context/LanguageContext';

const SITE_URL = 'https://vxscrib.io';

const StructuredData = ({ type = 'website' }) => {
  const { t } = useTranslation();
  const lang = t('lang') || 'fr';

  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "VxScrib",
    "url": SITE_URL,
    "logo": `${SITE_URL}/logo.png`,
    "description": lang === 'fr'
      ? "Service de transcription audio professionnelle par IA"
      : "Professional AI audio transcription service",
    "sameAs": []
  };

  const webAppSchema = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "name": "VxScrib",
    "url": SITE_URL,
    "applicationCategory": "BusinessApplication",
    "operatingSystem": "Web",
    "description": lang === 'fr'
      ? "Transcrivez vos fichiers audio et vidéo en texte avec une précision professionnelle grâce à l'IA Whisper."
      : "Transcribe your audio and video files to text with professional accuracy using Whisper AI.",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD",
      "description": lang === 'fr' ? "Plan gratuit disponible" : "Free plan available"
    },
    "featureList": lang === 'fr'
      ? ["Transcription IA Whisper", "Export SRT et TXT", "Traduction automatique", "Multilingue", "Enregistrement audio direct", "RGPD conforme"]
      : ["Whisper AI Transcription", "SRT and TXT Export", "Auto Translation", "Multilingual", "Direct Audio Recording", "GDPR Compliant"],
    "inLanguage": ["fr", "en"]
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": lang === 'fr' ? [
      {
        "@type": "Question",
        "name": "Comment fonctionne la transcription audio par IA ?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "VxScrib utilise l'IA Whisper d'OpenAI pour convertir automatiquement vos fichiers audio et vidéo en texte. Uploadez simplement votre fichier et obtenez une transcription précise avec horodatage en quelques minutes."
        }
      },
      {
        "@type": "Question",
        "name": "Quels formats audio sont supportés ?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "VxScrib supporte les formats MP3, MP4, MPEG, M4A, WAV et WebM. La taille maximale par fichier est de 25 Mo."
        }
      },
      {
        "@type": "Question",
        "name": "La transcription est-elle gratuite ?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Oui, VxScrib offre un plan gratuit avec une limite mensuelle de transcription. Pour un usage illimité, des abonnements mensuels et annuels sont disponibles."
        }
      },
      {
        "@type": "Question",
        "name": "Quelles langues sont supportées ?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "L'IA Whisper détecte automatiquement la langue de votre audio. VxScrib supporte plus de 50 langues pour la transcription et propose la traduction vers 10 langues."
        }
      },
      {
        "@type": "Question",
        "name": "Mes données sont-elles protégées ?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "VxScrib est conforme au RGPD. Vos fichiers audio sont traités et supprimés après transcription. Vous pouvez exporter ou supprimer toutes vos données à tout moment."
        }
      }
    ] : [
      {
        "@type": "Question",
        "name": "How does AI audio transcription work?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "VxScrib uses OpenAI's Whisper AI to automatically convert your audio and video files to text. Simply upload your file and get an accurate timestamped transcription in minutes."
        }
      },
      {
        "@type": "Question",
        "name": "What audio formats are supported?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "VxScrib supports MP3, MP4, MPEG, M4A, WAV and WebM formats. Maximum file size is 25 MB per file."
        }
      },
      {
        "@type": "Question",
        "name": "Is transcription free?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Yes, VxScrib offers a free plan with a monthly transcription limit. For unlimited use, monthly and yearly subscriptions are available."
        }
      },
      {
        "@type": "Question",
        "name": "What languages are supported?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Whisper AI automatically detects your audio language. VxScrib supports 50+ languages for transcription and offers translation to 10 languages."
        }
      },
      {
        "@type": "Question",
        "name": "Is my data protected?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "VxScrib is GDPR compliant. Audio files are processed and deleted after transcription. You can export or delete all your data at any time."
        }
      }
    ]
  };

  const schemas = [organizationSchema, webAppSchema];
  if (type === 'website') schemas.push(faqSchema);

  return (
    <Helmet>
      {schemas.map((schema, i) => (
        <script key={i} type="application/ld+json">
          {JSON.stringify(schema)}
        </script>
      ))}
    </Helmet>
  );
};

export default StructuredData;
