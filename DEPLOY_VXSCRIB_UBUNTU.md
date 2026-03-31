# Guide de déploiement — VxScrib
## VM Ubuntu 24.04 (Noble Numbat) — Sans nom de domaine

> ⚠️ **Note importante** : MockExamCenter utilise déjà le port 80.
> VxScrib sera accessible via `http://<IP_DE_VOTRE_VM>:8080`

---

## 1. Prérequis système

Les prérequis sont déjà installés avec MockExamCenter. Vérifiez juste ffmpeg :

```bash
sudo apt install -y ffmpeg
ffmpeg -version
```

---

## 2. Récupérer le code

Clonez ou copiez le projet sur votre VM :

```bash
cd /opt
sudo mkdir vxscrib
sudo chown $USER:$USER vxscrib
cd vxscrib

# Option A : depuis Git
git clone <URL_DE_VOTRE_REPO> .

# Option B : copier depuis votre machine locale
# scp -r /chemin/local/app/* user@IP_VM:/opt/vxscrib/
```

---

## 3. Configurer le Backend

```bash
cd /opt/vxscrib/backend

# Créer un environnement virtuel Python
python3 -m venv venv
source venv/bin/activate

# Installer les dépendances
pip install --upgrade pip
pip install -r requirements.txt

# Note: Le premier lancement téléchargera le modèle Whisper (~140MB pour 'base')
```

### Créer le fichier `.env`

```bash
cat > .env << 'EOF'
MONGO_URL=mongodb://localhost:27017
DB_NAME=vxscrib
CORS_ORIGINS=*
WHISPER_MODEL=base
JWT_SECRET=VOTRE_SECRET_JWT_ALEATOIRE_32_CHARS
PAYPAL_CLIENT_ID=VOTRE_PAYPAL_CLIENT_ID
PAYPAL_SECRET=VOTRE_PAYPAL_SECRET
PAYPAL_MODE=live
EOF
```

> **Important :**
> - `WHISPER_MODEL` : Choisissez le modèle selon vos ressources :
>   - `tiny` : Très rapide, ~1GB RAM, qualité basique
>   - `base` : Bon équilibre (recommandé), ~2GB RAM
>   - `small` : Meilleure qualité, ~4GB RAM, plus lent
>   - `medium` : Haute qualité, ~8GB RAM, lent
> - Générez un JWT_SECRET aléatoire : `openssl rand -hex 32`
> - **Pas besoin de clé API OpenAI** - Whisper tourne en local gratuitement !

### Créer le dossier uploads

```bash
mkdir -p /opt/vxscrib/backend/uploads
chmod 755 /opt/vxscrib/backend/uploads
```

### Tester le backend

```bash
source venv/bin/activate
uvicorn server:app --host 0.0.0.0 --port 8002
# Ctrl+C pour arrêter après avoir vérifié que ça démarre sans erreur
```

---

## 4. Configurer le Frontend

```bash
cd /opt/vxscrib/frontend

# Installer les dépendances
yarn install
```

### Créer le fichier `.env`

```bash
cat > .env << 'EOF'
REACT_APP_BACKEND_URL=http://IP_DE_VOTRE_VM:8080
EOF
```

> Remplacez `IP_DE_VOTRE_VM` par l'adresse IP réelle de votre serveur (ex: `http://192.168.1.50:8080`).

### Compiler le frontend (build de production)

```bash
yarn build
```

Le dossier `build/` contient les fichiers statiques prêts à servir.

---

## 5. Configurer Nginx (reverse proxy)

> ⚠️ **Important** : Ne pas modifier la config de MockExamCenter ! On crée une config séparée sur le port 8080.

Nginx va :
- Servir le frontend VxScrib sur le port **8080**
- Rediriger les requêtes `/api/*` vers le backend VxScrib (port 8002)

```bash
sudo nano /etc/nginx/sites-available/vxscrib
```

Collez cette configuration :

```nginx
server {
    listen 8080;
    server_name _;

    client_max_body_size 50M;  # Pour les uploads de fichiers audio

    # Frontend — fichiers statiques
    root /opt/vxscrib/frontend/build;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Backend — reverse proxy
    location /api/ {
        proxy_pass http://127.0.0.1:8002/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 300s;  # Timeout élevé pour les transcriptions longues
        proxy_connect_timeout 10s;
    }
}
```

Activer le site :

```bash
sudo ln -sf /etc/nginx/sites-available/vxscrib /etc/nginx/sites-enabled/
sudo nginx -t  # Vérifier la syntaxe
sudo systemctl restart nginx
```

---

## 6. Lancer le backend en service (systemd)

> ⚠️ **Note** : Le backend VxScrib utilise le port **8002** (MockExamCenter utilise 8001)

Créer un service pour que le backend démarre automatiquement :

```bash
sudo nano /etc/systemd/system/vxscrib-backend.service
```

Collez :

```ini
[Unit]
Description=VxScrib Backend
After=network.target mongod.service
Requires=mongod.service

[Service]
Type=simple
User=root
WorkingDirectory=/opt/vxscrib/backend
Environment=PATH=/opt/vxscrib/backend/venv/bin:/usr/bin
ExecStart=/opt/vxscrib/backend/venv/bin/uvicorn server:app --host 0.0.0.0 --port 8002
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Activer et démarrer :

```bash
sudo systemctl daemon-reload
sudo systemctl start vxscrib-backend
sudo systemctl enable vxscrib-backend
sudo systemctl status vxscrib-backend  # Doit être "active (running)"
```

---

## 7. Ouvrir le pare-feu

```bash
sudo ufw allow 8080/tcp
sudo ufw status
```

---

## 8. Vérifier le déploiement

```bash
# Tester le backend VxScrib (port 8002)
curl http://localhost:8002/api/
# Doit retourner : {"message":"VxScrib API","version":"2.0.0"}

# Tester via Nginx (port 8080)
curl http://localhost:8080/api/
# Même résultat

# Tester le frontend
curl -s http://localhost:8080 | head -5
# Doit retourner du HTML

# Vérifier que MockExamCenter fonctionne toujours (port 80)
curl http://localhost/api/exams
```

Ouvrez un navigateur et allez sur : **http://IP_DE_VOTRE_VM:8080**

---

## 9. Créer le compte Admin

Le compte admin est créé automatiquement au premier lancement du backend.

**Identifiants par défaut :**
- Email : `admin@transcriptflow.com`
- Mot de passe : `Admin2026!`

> **Sécurité :** Changez ces identifiants après la première connexion via le panel d'administration.

### Créer un admin manuellement (optionnel)

```bash
curl -X POST http://localhost/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Administrator",
    "email": "admin@vxscrib.io",
    "password": "VotreMotDePasseSecurise123!"
  }'
```

Ensuite, passez le rôle en admin directement dans MongoDB :

```bash
mongosh
use vxscrib
db.users.updateOne(
  { email: "admin@vxscrib.io" },
  { $set: { is_admin: true } }
)
exit
```

---

## 10. Configuration PayPal (Abonnements)

Pour activer les paiements, connectez-vous en tant qu'admin et allez dans :
**Administration > Paramètres > Abonnements**

Configurez :
- Prix mensuel et annuel
- ID du plan PayPal (créé dans votre dashboard PayPal Business)

---

## 11. Commandes utiles

| Action | Commande |
|---|---|
| Voir les logs du backend | `sudo journalctl -u vxscrib-backend -f` |
| Redémarrer le backend | `sudo systemctl restart vxscrib-backend` |
| Redémarrer Nginx | `sudo systemctl restart nginx` |
| Redémarrer MongoDB | `sudo systemctl restart mongod` |
| Reconstruire le frontend | `cd /opt/vxscrib/frontend && yarn build` |
| Console MongoDB | `mongosh --eval "use vxscrib"` |
| Vérifier l'espace uploads | `du -sh /opt/vxscrib/backend/uploads` |
| Nettoyer les fichiers temporaires | `rm -rf /opt/vxscrib/backend/uploads/*` |
| Vérifier les services actifs | `sudo systemctl status vxscrib-backend mockexamcenter-backend` |

---

## 12. Mise à jour de l'application

```bash
cd /opt/vxscrib

# Récupérer les dernières modifications
git pull origin main

# Backend
cd backend
source venv/bin/activate
pip install -r requirements.txt
sudo systemctl restart vxscrib-backend

# Frontend
cd ../frontend
yarn install
yarn build
sudo systemctl restart nginx
```

---

## Résumé de l'architecture (2 applications sur le même serveur)

```
                    Client (navigateur)
                           │
         ┌─────────────────┴─────────────────┐
         │                                   │
         ▼ port 80                           ▼ port 8080
┌─────────────────────┐             ┌─────────────────────┐
│   MockExamCenter    │             │      VxScrib        │
│       Nginx         │             │       Nginx         │
│   /api/* → :8001    │             │   /api/* → :8002    │
└─────────────────────┘             └─────────────────────┘
         │                                   │
         ▼ port 8001                         ▼ port 8002
┌─────────────────────┐             ┌─────────────────────┐
│  MockExamCenter     │             │     VxScrib         │
│  FastAPI Backend    │             │  FastAPI Backend    │
└─────────────────────┘             └─────────────────────┘
         │                                   │
         └─────────────┬─────────────────────┘
                       │
                       ▼ port 27017
              ┌─────────────────────┐
              │      MongoDB        │
              │  (base partagée)    │
              │  - mockexamcenter   │
              │  - vxscrib          │
              └─────────────────────┘
```

### Ports utilisés

| Application | Frontend (Nginx) | Backend (FastAPI) | Base de données |
|---|---|---|---|
| MockExamCenter | 80 | 8001 | mockexamcenter |
| VxScrib | 8080 | 8002 | vxscrib |

---

## Fonctionnalités VxScrib

| Fonctionnalité | Description |
|---|---|
| Transcription audio | Upload de fichiers MP3, MP4, WAV, etc. |
| Transcription URL (Premium) | YouTube, TikTok, Vimeo, Instagram, Twitter/X |
| Enregistrement audio | Enregistrement direct depuis le navigateur |
| Traduction | 10 langues supportées |
| Export | TXT et SRT (sous-titres) |
| Abonnements | PayPal mensuel/annuel |
| Administration | Panel admin complet |
| RGPD | Conformité et export des données |

---

## Dépannage

### Le backend ne démarre pas
```bash
sudo journalctl -u vxscrib-backend -n 50
# Vérifier les erreurs dans les logs
```

### Erreur MongoDB
```bash
sudo systemctl status mongod
sudo journalctl -u mongod -n 20
```

### Erreur 502 Bad Gateway
```bash
# Vérifier que le backend VxScrib tourne sur le bon port (8002)
curl http://localhost:8002/api/
# Si ça ne répond pas, redémarrer
sudo systemctl restart vxscrib-backend
```

### Conflit avec MockExamCenter
```bash
# Vérifier que les deux applications sont sur des ports différents
sudo netstat -tlnp | grep -E "80|8001|8002|8080"
# Doit montrer :
# - nginx sur 80 et 8080
# - mockexamcenter-backend sur 8001
# - vxscrib-backend sur 8002
```

### Transcription URL échoue
- Vérifier que ffmpeg est installé : `ffmpeg -version`
- Vérifier que yt-dlp est à jour : `pip install --upgrade yt-dlp`
- Certaines plateformes (YouTube) peuvent nécessiter des configurations supplémentaires

---

## Support

- Documentation API : `http://IP_DE_VOTRE_VM/api/docs`
- Email admin : Configurable dans le panel admin
