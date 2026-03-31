# VxScrib - PRD

## Problem Statement
Application SaaS de transcription audio. Renommée de "TranscriptFlow" vers "VxScrib". L'objectif est de fournir une plateforme de transcription audio/vidéo par IA avec un design élégant ("Stèle"), enregistrement audio direct, panel admin, conformité RGPD, bilinguisme (FR/EN), et système d'abonnement PayPal.

## Architecture
- **Frontend**: React 19 + Tailwind CSS + Shadcn UI
- **Backend**: FastAPI + MongoDB (Motor async driver), modulaire (routes/)
- **AI**: OpenAI Whisper via `emergentintegrations` (Emergent LLM Key)
- **Auth**: JWT (bcrypt + PyJWT)
- **Payments**: PayPal (monthly + yearly plans)
- **Domain recommandé**: vxscrib.io

## Core Features
- Transcription IA (Whisper)
- Enregistrement audio direct
- Traduction 10 langues
- Export SRT/TXT
- Panel administration
- Système d'abonnement PayPal
- Conformité RGPD
- Bilinguisme FR/EN

## What's Implemented
- [x] Application importée depuis GitHub (voice-transaction)
- [x] Rebranding complet "TranscriptFlow" → "VxScrib" (Jan 2026)
  - Header, footer, login, dashboard, admin, SEO, API
- [x] Backend API fonctionnel (90% tests)
- [x] Frontend React complet (93% tests)
- [x] Auth JWT avec admin seeding

## Backlog
- P0: Aucun (MVP fonctionnel)
- P1: Améliorer feedback formulaire d'inscription
- P2: Changer code status 403→401 pour /api/auth/me non autorisé

## Next Tasks
- Acheter domaine vxscrib.io
- Configurer clé API OpenAI pour transcription réelle
- Déployer en production
