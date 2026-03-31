# Guide de déploiement — VxScrib
## VM Ubuntu 24.04 (Noble Numbat) — Sans nom de domaine

> L'application sera accessible via `http://<IP_DE_VOTRE_VM>`

---

## 1. Prérequis système

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git build-essential nginx ffmpeg
```

### Installer Node.js 20

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node -v  # v20.x
```

### Installer Python 3.11+ et pip

```bash
sudo apt install -y python3 python3-pip python3-venv
python3 --version  # 3.11+
```

### Installer MongoDB 7

```bash
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | sudo gpg --dearmor -o /usr/share/keyrings/mongodb-server-7.0.gpg
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list

sudo apt update
sudo apt install -y mongodb-org
sudo systemctl start mongod
sudo systemctl enable mongod
sudo systemctl status mongod  # Doit afficher "active (running)"
```

### Installer Yarn

```bash
sudo npm install -g yarn
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

# Installer yt-dlp pour la transcription URL
pip install yt-dlp
```

### Créer le fichier `.env`

```bash
cat > .env << 'EOF'
MONGO_URL=mongodb://localhost:27017
DB_NAME=vxscrib
CORS_ORIGINS=*
EMERGENT_LLM_KEY=VOTRE_CLE_OPENAI_OU_EMERGENT
PAYPAL_CLIENT_ID=VOTRE_PAYPAL_CLIENT_ID
PAYPAL_SECRET=VOTRE_PAYPAL_SECRET
PAYPAL_MODE=live
JWT_SECRET=VOTRE_SECRET_JWT_ALEATOIRE_32_CHARS
EOF
```

> **Important :**
> - Remplacez `VOTRE_CLE_OPENAI_OU_EMERGENT` par votre clé API OpenAI (pour Whisper)
> - Remplacez `VOTRE_PAYPAL_CLIENT_ID` et `VOTRE_PAYPAL_SECRET` par vos identifiants PayPal Live
> - Générez un JWT_SECRET aléatoire : `openssl rand -hex 32`

### Créer le dossier uploads

```bash
mkdir -p /opt/vxscrib/backend/uploads
chmod 755 /opt/vxscrib/backend/uploads
```

### Tester le backend

```bash
source venv/bin/activate
uvicorn server:app --host 0.0.0.0 --port 8001
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
REACT_APP_BACKEND_URL=http://IP_DE_VOTRE_VM
EOF
```

> Remplacez `IP_DE_VOTRE_VM` par l'adresse IP réelle de votre serveur (ex: `http://192.168.1.50`).

### Compiler le frontend (build de production)

```bash
yarn build
```

Le dossier `build/` contient les fichiers statiques prêts à servir.

---

## 5. Configurer Nginx (reverse proxy)

Nginx va :
- Servir le frontend (fichiers statiques) sur le port 80
- Rediriger les requêtes `/api/*` vers le backend (port 8001)

```bash
sudo nano /etc/nginx/sites-available/vxscrib
```

Collez cette configuration :

```nginx
server {
    listen 80;
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
        proxy_pass http://127.0.0.1:8001/api/;
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
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t  # Vérifier la syntaxe
sudo systemctl restart nginx
sudo systemctl enable nginx
```

---

## 6. Lancer le backend en service (systemd)

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
ExecStart=/opt/vxscrib/backend/venv/bin/uvicorn server:app --host 0.0.0.0 --port 8001
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
sudo ufw allow 80/tcp
sudo ufw allow ssh
sudo ufw enable
```

---

## 8. Vérifier le déploiement

```bash
# Tester le backend
curl http://localhost:8001/api/
# Doit retourner : {"message":"VxScrib API","version":"2.0.0"}

# Tester via Nginx
curl http://localhost/api/
# Même résultat

# Tester le frontend
curl -s http://localhost | head -5
# Doit retourner du HTML
```

Ouvrez un navigateur et allez sur : **http://IP_DE_VOTRE_VM**

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

## Résumé de l'architecture

```
Client (navigateur)
        │
        ▼ port 80
┌─────────────────────────┐
│        Nginx            │
│   /     → build/        │  ← fichiers statiques React
│   /api/* → :8001        │  ← reverse proxy vers FastAPI
└─────────────────────────┘
        │
        ▼ port 8001
┌─────────────────────────┐
│   FastAPI (uvicorn)     │
│      server.py          │
│  + yt-dlp (vidéos)      │
│  + Whisper (transcription)│
└─────────────────────────┘
        │
        ▼ port 27017
┌─────────────────────────┐
│       MongoDB           │
└─────────────────────────┘
```

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
# Vérifier que le backend tourne
curl http://localhost:8001/api/
# Si ça ne répond pas, redémarrer
sudo systemctl restart vxscrib-backend
```

### Transcription URL échoue
- Vérifier que ffmpeg est installé : `ffmpeg -version`
- Vérifier que yt-dlp est à jour : `pip install --upgrade yt-dlp`
- Certaines plateformes (YouTube) peuvent nécessiter des configurations supplémentaires

---

## Support

- Documentation API : `http://IP_DE_VOTRE_VM/api/docs`
- Email admin : Configurable dans le panel admin
