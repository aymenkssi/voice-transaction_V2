# VxScrib - PRD

## Problem Statement
Application SaaS de transcription audio. Renommée de "VxScrib" vers "VxScrib". L'objectif est de corriger les bugs, améliorer le design ("Stèle"/élégant), ajouter l'enregistrement audio direct, un panel d'administration, la conformité RGPD, le bilinguisme (FR/EN), et un système d'abonnement PayPal avec limites configurables, plans annuels et coupons.

## Architecture
- **Frontend**: React 19 + Tailwind CSS + Shadcn UI
- **Backend**: FastAPI + MongoDB (Motor async driver), modulaire (routes/)
- **AI**: OpenAI Whisper via `emergentintegrations` (Emergent LLM Key)
- **Auth**: JWT (bcrypt + PyJWT)
- **Payments**: PayPal (monthly + yearly plans)
- **Domain**: vxscrib.io (recommandé)

## Code Structure
```text
/app/backend/
├── server.py (main app entry, ~100 lines)
├── routes/
│   ├── __init__.py (auth routes, helpers)
│   ├── transcription.py (upload, CRUD, translate, download)
│   ├── payment.py (PayPal, settings, subscriptions, coupons)
│   └── admin.py (stats, user/transcription management)
├── uploads/
└── .env

/app/frontend/src/
├── components/ (AudioRecorder, SubscriptionPanel, CookieConsent, LanguageSwitcher)
├── context/ (AuthContext, LanguageContext)
├── i18n/ (en.json, fr.json)
├── pages/ (Dashboard, Admin, Transcription, Landing, Privacy, Terms, Register, Login, Profile)
├── App.js
└── index.css
```

## Core Features
1. **Authentification** - Inscription/Connexion JWT
2. **Upload audio** - Drag & drop + batch upload, formats MP3/MP4/WAV/M4A/WEBM, max 25Mo
3. **Enregistrement audio** - MediaRecorder API, format webm
4. **Transcription IA** - Whisper avec timestamps et détection de langue
5. **Éditeur de texte** - Modification en direct de la transcription
6. **Traduction** - 10 langues via GPT-4o-mini
7. **Export** - TXT et SRT
8. **Statistiques** - Mots, caractères, lignes, mots/min
9. **Admin Dashboard** - Stats globales, gestion utilisateurs/transcriptions, graphiques
10. **RGPD** - Cookie consent, Privacy/Terms pages, export/suppression données
11. **i18n** - Bilingue FR/EN avec persistance
12. **Abonnement PayPal** - Mensuel + Annuel, limites configurables
13. **Coupons** - Création/gestion admin, validation/application utilisateur, réduction % ou 100% gratuit
14. **Filtres Admin** - Recherche, filtre statut/langue dans tables
15. **Export CSV** - Stats overview, utilisateurs, transcriptions

## Design System - "Stèle"
- **Colors**: Primary #111111, Accent #8C8273, Background #F8F8F6, Surface #FFFFFF
- **Typography**: Playfair Display (headings), Inter (body), Lora (transcription text), JetBrains Mono (technical data)
- **Components**: Sharp edges (rounded-none), 1px borders, generous padding, slow transitions (500ms+)

## Completed Tasks
- [x] Clone du repo GitHub et configuration environnement
- [x] Remplacement OpenAI par emergentintegrations (Whisper)
- [x] Correction bug P0: API 404 résolu
- [x] Composant AudioRecorder pour enregistrement direct
- [x] Design "Stèle" complet sur toutes les pages
- [x] Correction bug parsing segments Whisper
- [x] Interface d'administration complète avec 5 onglets
- [x] Statistiques globales + origines des comptes
- [x] Système i18n bilingue FR/EN
- [x] RGPD complet (cookies, privacy, terms, export, suppression)
- [x] Abonnement PayPal mensuel + annuel
- [x] Configuration prix via admin (mensuel, annuel, devise, limite gratuite)
- [x] Système de coupons complet (CRUD admin + validation/application utilisateur)
- [x] Refactoring backend: server.py modulaire en routes/ (auth, transcription, payment, admin)
- [x] Export CSV (stats, utilisateurs, transcriptions)
- [x] Filtres par statut/langue/recherche dans tables admin
- [x] Batch upload de fichiers (multi-sélection)
- [x] Tests: 34/34 backend, 25/25 frontend (iteration_7)

## API Endpoints
### Auth
- `POST /api/auth/register` - Inscription
- `POST /api/auth/login` - Connexion
- `GET /api/auth/me` - Profil utilisateur
- `GET /api/auth/export-data` - Export données RGPD
- `DELETE /api/auth/account` - Suppression compte RGPD

### Transcriptions
- `POST /api/transcriptions/upload` - Upload fichier audio (vérifie limite)
- `GET /api/transcriptions` - Liste des transcriptions
- `GET /api/transcriptions/:id` - Détail transcription
- `PATCH /api/transcriptions/:id` - Modifier transcription
- `DELETE /api/transcriptions/:id` - Supprimer transcription
- `POST /api/transcriptions/:id/translate` - Traduire
- `GET /api/transcriptions/:id/download/:format` - Télécharger (txt/srt)

### Payments & Settings
- `GET /api/settings/public` - Paramètres publics
- `GET /api/subscription/status` - Statut abonnement
- `POST /api/subscription/activate` - Activer abonnement PayPal
- `POST /api/subscription/cancel` - Annuler abonnement
- `POST /api/coupons/validate` - Valider un code promo
- `POST /api/coupons/apply` - Appliquer un coupon (réduction ou 100% gratuit)

### Admin
- `GET /api/admin/stats` - Statistiques globales
- `GET /api/admin/stats/daily` - Transcriptions par jour
- `GET /api/admin/stats/languages` - Distribution langues
- `GET /api/admin/stats/origins` - Origines comptes
- `GET /api/admin/users` - Liste utilisateurs
- `GET /api/admin/transcriptions` - Liste transcriptions
- `DELETE /api/admin/users/:id` - Supprimer utilisateur
- `DELETE /api/admin/transcriptions/:id` - Supprimer transcription
- `GET /api/admin/settings` - Paramètres admin
- `PUT /api/admin/settings` - Modifier paramètres
- `POST /api/admin/create-paypal-plan` - Créer plans PayPal
- `GET /api/admin/subscriptions` - Liste abonnements
- `POST /api/admin/coupons` - Créer coupon
- `GET /api/admin/coupons` - Lister coupons
- `PATCH /api/admin/coupons/:id` - Toggle coupon
- `DELETE /api/admin/coupons/:id` - Supprimer coupon

## DB Schema
- **users**: {id, email, name, password (hashed), is_admin, created_at}
- **transcriptions**: {id, user_id, filename, file_path, original_text, edited_text, detected_language, translated_text, translation_language, status, progress, duration_seconds, created_at, updated_at}
- **settings**: {key, subscription_enabled, free_limit_seconds, monthly_price, yearly_price, yearly_enabled, currency, paypal_plan_id, paypal_yearly_plan_id}
- **coupons**: {id, code, discount_percent, max_uses, used_count, plan_type, expires_at, active, created_at}
- **coupon_usages**: {coupon_id, user_id, used_at}
- **subscriptions**: {id, user_id, paypal_subscription_id, status, plan_type, created_at, expires_at}

## Backlog
- P2: Polish transcription viewing (timestamps sync, audio playback)
