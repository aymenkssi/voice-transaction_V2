# VxScrib - PRD

## Problem Statement
Application SaaS de transcription audio. Renommée de "TranscriptFlow" vers "VxScrib". Ajout de la fonctionnalité de transcription depuis les liens vidéo des réseaux sociaux (YouTube, TikTok, Instagram, Twitter/X, Facebook, Vimeo, Twitch) pour les utilisateurs premium.

## Architecture
- **Frontend**: React 19 + Tailwind CSS + Shadcn UI
- **Backend**: FastAPI + MongoDB (Motor async driver), modulaire (routes/)
- **AI**: OpenAI Whisper via `emergentintegrations` (Emergent LLM Key)
- **Video Download**: yt-dlp + ffmpeg
- **Auth**: JWT (bcrypt + PyJWT)
- **Payments**: PayPal (monthly + yearly plans)
- **Domain recommandé**: vxscrib.io

## Core Features
- Transcription IA (Whisper)
- Enregistrement audio direct
- **NEW: Transcription depuis URL vidéo (Premium)** - YouTube*, TikTok, Instagram, Twitter/X, Facebook, Vimeo, Twitch
- Traduction 10 langues
- Export SRT/TXT
- Panel administration
- Système d'abonnement PayPal
- Conformité RGPD
- Bilinguisme FR/EN

*Note: YouTube peut nécessiter un JS runtime supplémentaire dans certains environnements

## What's Implemented
- [x] Application importée depuis GitHub (voice-transaction)
- [x] Rebranding complet "TranscriptFlow" → "VxScrib" (Mar 2026)
- [x] Transcription URL vidéo pour Premium (Mar 2026)
  - Onglet VIDEO LINK avec icône couronne
  - Validation des plateformes supportées
  - Téléchargement via yt-dlp + ffmpeg
  - Transcription Whisper automatique
  - Message d'upgrade pour non-premium
- [x] Backend API fonctionnel (94.4% tests)
- [x] Frontend React complet (100% tests)
- [x] Auth JWT avec admin seeding

## Backlog
- P0: Aucun (MVP fonctionnel)
- P1: Améliorer support YouTube (JS runtime)
- P2: Ajouter support SoundCloud, Dailymotion

## Next Tasks
- Acheter domaine vxscrib.io
- Déployer en production
- Marketing auprès créateurs de contenu
