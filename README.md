<div align="center">

# 🤖 WhatsBot

**Un bot WhatsApp multi-fonctions puissant, modulaire et facile à déployer.**

[![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Baileys](https://img.shields.io/badge/Baileys-WhatsApp%20API-25D366?logo=whatsapp&logoColor=white)](https://github.com/WhiskeySockets/Baileys)
[![SQLite](https://img.shields.io/badge/SQLite-Database-003B57?logo=sqlite&logoColor=white)](https://www.sqlite.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

</div>

---

## 📋 Table des matières

- [Présentation](#-présentation)
- [Fonctionnalités](#-fonctionnalités)
- [Commandes](#-commandes)
- [Prérequis](#-prérequis)
- [Installation](#-installation)
- [Configuration](#-configuration)
- [Déploiement Docker](#-déploiement-docker)
- [Architecture du projet](#-architecture-du-projet)
- [Ajouter une commande](#-ajouter-une-commande)
- [Fonctionnalités prévues](#-fonctionnalités-prévues)
- [Contribution](#-contribution)
- [Licence](#-licence)

---

## 🎯 Présentation

WhatsBot est un bot WhatsApp complet construit avec [Baileys](https://github.com/WhiskeySockets/Baileys) (API WhatsApp Web non officielle). Il offre un système de commandes modulaire, une IA conversationnelle propulsée par Google Gemini, le téléchargement de médias YouTube, la gestion de groupe, et bien plus.

### Points forts

- 🧩 **Architecture modulaire** — Ajoutez des commandes en créant un simple fichier JS
- 🤖 **IA intégrée** — Chat intelligent via Google Gemini
- 🎵 **Médias YouTube** — Téléchargement audio (MP3) et vidéo (MP4) optimisé
- 👥 **Gestion de groupe** — Kick, promote, demote, tagall, add
- 🗄️ **Base de données SQLite** — Suivi des utilisateurs et statistiques
- 🔒 **Filtre de contenu** — Protection contre les recherches de contenu explicite
- 🐳 **Docker ready** — Dockerfile inclus pour un déploiement facile
- ⚙️ **100% configurable** — Toute la configuration via variables d'environnement (`.env`)

---

## ✨ Fonctionnalités

| Catégorie | Fonctionnalités |
|-----------|----------------|
| **Multimédia** | Téléchargement audio YouTube, téléchargement vidéo YouTube optimisé (choix automatique de qualité), création de stickers (image/GIF/vidéo) |
| **IA** | Chat avec Google Gemini, personnalité personnalisable, conversion Markdown vers format WhatsApp |
| **Groupe** | Ajouter/retirer des membres, promouvoir/rétrograder les admins, mentionner tout le monde, infos du groupe |
| **Utilitaires** | Extraction de médias "vue unique", photo de profil HD, statistiques du bot, carte de visite |
| **Sécurité** | Filtre de mots explicites (FR/EN/argot local), système de ban, limite de commandes, protection owner/admin |
| **Données** | Base SQLite pour le suivi utilisateurs, compteur de commandes, système admin |

---

## 📝 Commandes

### Commandes générales

| Commande | Description | Aliases |
|----------|-------------|---------|
| `.help` | Affiche le menu d'aide avec toutes les commandes | — |
| `.ping` | Vérifie que le bot est en ligne | — |
| `.info` | Statistiques du bot (uptime, utilisateurs, commandes traitées) | — |
| `.about` | Carte de visite du bot et de son créateur | — |

### Multimédia

| Commande | Description | Aliases |
|----------|-------------|---------|
| `.play <titre>` | Recherche et envoie un audio YouTube (max 5 min) | — |
| `.deo <titre>` | Recherche et envoie une vidéo YouTube (max 10 min, 15 Mo) | `video`, `vid` |
| `.sticker` | Crée un sticker à partir d'une image, GIF ou vidéo (répondre au média) | — |
| `.extract` | Extrait et renvoie un média "vue unique" (répondre au message) | — |
| `.pp [@user]` | Affiche la photo de profil HD d'un utilisateur | `profil`, `pdp` |

### IA (Intelligence Artificielle)

| Commande | Description | Aliases |
|----------|-------------|---------|
| `.ia <question>` | Pose une question à l'IA (Google Gemini) | `ask`, `juve`, `juveai` |

### Gestion de groupe (Admin)

| Commande | Description | Permission |
|----------|-------------|------------|
| `.add <numéro>` | Ajoute un membre au groupe | Admin |
| `.kick @user` | Retire un membre du groupe (avec animation) | Admin |
| `.promote @user` | Nomme un membre administrateur | Admin |
| `.demote @user` | Retire le statut administrateur | Admin |
| `.groupinfo` | Affiche les infos de débogage du groupe | Tous |

### Commandes Owner

| Commande | Description | Permission |
|----------|-------------|------------|
| `.tagall [message]` | Notifie tous les membres du groupe | Owner |

---

## 📦 Prérequis

- **Node.js** 18 ou supérieur — [Télécharger](https://nodejs.org/)
- **npm** — Inclus avec Node.js
- **FFmpeg** — Installé automatiquement via `@ffmpeg-installer/ffmpeg`
- **yt-dlp** — Nécessaire pour les commandes `play` et `deo`

```bash
# Linux (Debian/Ubuntu)
sudo apt install yt-dlp
# ou via pip
pip install yt-dlp

# macOS
brew install yt-dlp

# Windows
winget install yt-dlp
```

- **Clé API Google Gemini** *(optionnel)* — Pour la commande `.ia` → [Obtenir une clé](https://aistudio.google.com/apikey)

---

## 🚀 Installation

### 1. Cloner le dépôt

```bash
git clone https://github.com/votre-utilisateur/whatsbot.git
cd whatsbot
```

### 2. Installer les dépendances

```bash
npm install
```

### 3. Configurer les variables d'environnement

```bash
cp .env.example .env
```

Éditez le fichier `.env` avec vos valeurs (voir section [Configuration](#-configuration)).

### 4. Lancer le bot

```bash
node index.js
```

Au premier lancement, un **QR code** s'affichera dans le terminal :

```
------------------------------------------------
  [QR Code s'affiche ici]
  Scannez ce code avec WhatsApp.
------------------------------------------------
```

**Pour scanner :**
1. Ouvrez WhatsApp sur votre téléphone
2. Allez dans **Paramètres** → **Appareils liés** → **Associer un appareil**
3. Scannez le QR code

✅ Le bot est maintenant connecté !

---

## ⚙️ Configuration

Toute la configuration se fait via le fichier `.env`. Voici les variables disponibles :

### Variables obligatoires

| Variable | Description | Exemple |
|----------|-------------|---------|
| `OWNER_NUMBERS` | Numéros des propriétaires du bot (format international, séparés par `,`) | `33612345678,237699112233` |

### Variables optionnelles

| Variable | Description | Défaut |
|----------|-------------|--------|
| `PORT` | Port du serveur web (health check) | `3000` |
| `GEMINI_API_KEY` | Clé API Google Gemini pour la commande `.ia` | — |
| `BANNED_NUMBERS` | Numéros bannis (séparés par `,`) | — |
| `BOT_NAME` | Nom affiché du bot | `WhatsBot` |
| `CREATOR_NAME` | Nom du créateur | `Developer` |
| `GITHUB_LINK` | Lien GitHub (affiché dans `.about`) | — |
| `LINKEDIN_LINK` | Lien LinkedIn (affiché dans `.about`) | — |
| `PREFIX` | Caractère préfixe des commandes | `.` |
| `UNLIMITED_MODE` | `true` = commandes illimitées, `false` = limité | `true` |
| `COMMAND_LIMIT` | Nombre de commandes gratuites (si `UNLIMITED_MODE=false`) | `3` |
| `GROUP_WELCOME_MESSAGE` | Message envoyé quand un membre est ajouté | Message par défaut |
| `AI_SYSTEM_PROMPT` | Personnalité/instructions de l'IA | Prompt par défaut |
| `AUTH_DIR` | Dossier de session Baileys (isolation multi-instance) | `auth_info` |
| `PAIRING_MODE` | `true` = code de jumelage, `false` = QR code | `false` |
| `PHONE_NUMBER` | Numéro pour `requestPairingCode` (chiffres uniquement) | — |
| `WEBHOOK_URL` | URL de webhook pour remonter `status/qr/pairing_code` | — |
| `INSTANCE_ID` | Identifiant d'instance renvoyé au webhook | — |

---

## 🐳 Déploiement Docker

### Build et lancement

```bash
docker build -t whatsbot .
docker run -d --name whatsbot \
  -p 3000:3000 \
  --env-file .env \
  -v $(pwd)/auth_info:/usr/src/app/auth_info \
  whatsbot
```

### Mode SaaS (Pairing Code, multi-instance)

Pour une plateforme multi-utilisateurs, démarrez chaque instance avec un dossier d'auth dédié :

```bash
docker run -d --name bot-user-1234 \
  -p 3000:3000 \
  -e AUTH_DIR=/usr/src/app/auth_info/user_1234 \
  -e PAIRING_MODE=true \
  -e PHONE_NUMBER=2250102030405 \
  -e WEBHOOK_URL=https://api.example.com/webhooks/whatsapp \
  -e INSTANCE_ID=bot-user-1234 \
  --env-file .env \
  -v $(pwd)/auth_info:/usr/src/app/auth_info \
  whatsbot
```

Le bot émet alors les événements webhook suivants :
- `status` (connected/disconnected)
- `pairing_code` (code de jumelage prêt à afficher dans l'interface web)
- `pairing_error` (échec de génération du code)
- `qr` (uniquement si `PAIRING_MODE=false`)

### Avec Docker Compose

Créez un fichier `docker-compose.yml` :

```yaml
version: '3.8'
services:
  whatsbot:
    build: .
    container_name: whatsbot
    restart: unless-stopped
    ports:
      - "3000:3000"
    env_file:
      - .env
    volumes:
      - ./auth_info:/usr/src/app/auth_info
      - ./bot.db:/usr/src/app/bot.db
```

```bash
docker compose up -d
```

> **Note :** Le volume `auth_info` est monté pour persister la session WhatsApp entre les redémarrages.

---

## 🏗️ Architecture du projet

```
whatsbot/
├── index.js              # Point d'entrée — connexion WhatsApp et routeur de commandes
├── database.js           # Module SQLite (utilisateurs, stats, admin)
├── logger.js             # Logger formaté avec horodatage et couleurs
├── package.json          # Dépendances et métadonnées npm
├── Dockerfile            # Image Docker (Node.js 20)
├── .env.example          # Template de configuration
├── .gitignore            # Fichiers exclus de Git
│
├── commands/             # 📁 Commandes modulaires (chargement automatique)
│   ├── about.js          # Carte de visite du bot
│   ├── add.js            # Ajouter un membre au groupe
│   ├── demote.js         # Rétrograder un admin
│   ├── deo.js            # Télécharger une vidéo YouTube
│   ├── extract.js        # Extraire un média "vue unique"
│   ├── groupeinfo.js     # Infos de débogage du groupe
│   ├── help.js           # Menu d'aide
│   ├── ia.js             # Chat IA (Google Gemini)
│   ├── info.js           # Statistiques du bot
│   ├── kick.js           # Retirer un membre
│   ├── ping.js           # Test de disponibilité
│   ├── play.js           # Télécharger un audio YouTube
│   ├── pp.js             # Photo de profil HD
│   ├── promote.js        # Promouvoir en admin
│   ├── sticker.js        # Créer un sticker
│   └── tagall.js         # Mentionner tous les membres
│
├── auth_info/            # 🔒 Session WhatsApp (JAMAIS commit)
└── bot.db                # 🗄️ Base de données SQLite (auto-générée)
```

---

## 🧩 Ajouter une commande

Le système de commandes est **entièrement modulaire**. Pour ajouter une nouvelle commande, créez simplement un fichier dans le dossier `commands/` :

### Template de commande

```javascript
// commands/exemple.js
module.exports = {
    name: 'exemple',                       // Nom de la commande (obligatoire)
    description: 'Description courte.',    // Description pour .help (obligatoire)
    aliases: ['ex', 'test'],               // Alias optionnels
    adminOnly: false,                      // Réservé aux admins de groupe ?
    ownerOnly: false,                      // Réservé au propriétaire du bot ?

    run: async ({ sock, msg, args, replyWithTag, commands, db, startTime, senderNumber, senderId }) => {
        const remoteJid = msg.key.remoteJid;
        const query = args.join(' ');
        
        // Votre logique ici...
        await replyWithTag(sock, remoteJid, msg, `✅ Commande exécutée avec: ${query}`);
    }
};
```

Redémarrez le bot — la commande est **automatiquement chargée** !

### Paramètres disponibles dans `run()`

| Paramètre | Type | Description |
|-----------|------|-------------|
| `sock` | Object | Instance du socket WhatsApp (Baileys) |
| `msg` | Object | Message complet reçu |
| `args` | Array | Arguments passés après la commande |
| `replyWithTag` | Function | `replyWithTag(sock, jid, msg, text)` — Répond avec le tag du bot |
| `commands` | Map | Toutes les commandes chargées |
| `db` | Object | Module base de données (users, stats) |
| `startTime` | Date | Date de démarrage du bot |
| `senderNumber` | String | Numéro de l'expéditeur (ex: `33612345678`) |
| `senderId` | String | ID WhatsApp complet (ex: `33612345678@s.whatsapp.net`) |

---

## 🗺️ Fonctionnalités prévues

### 🔜 Priorité haute
- [ ] **Anti-link** — Suppression automatique des liens non autorisés
- [ ] **Anti-spam** — Rate limiting intelligent par utilisateur
- [ ] **Welcome / Goodbye** — Messages automatiques à l'arrivée/départ d'un membre
- [ ] **Système de warn** — Avertissements avec auto-kick au 3ème
- [ ] **Ban / Unban persistant** — Bannissement sauvegardé en base de données

### 📌 Priorité moyenne
- [ ] **Anti-delete** — Afficher les messages supprimés
- [ ] **Broadcast** — Envoyer un message à tous les groupes du bot
- [ ] **Lien d'invitation** — Récupérer/réinitialiser le lien d'invitation du groupe
- [ ] **Mute / Unmute** — Ouvrir/fermer le groupe (messages admin uniquement)
- [ ] **Commande owner** — Panel de gestion (stats, reload, eval)
- [ ] **Support des alias dans le routeur** — Charger les commandes par alias aussi

### 💡 Idées futures
- [ ] **Traduction** — Traduction automatique de messages
- [ ] **Météo** — Afficher la météo d'une ville
- [ ] **Sondages** — Créer des sondages interactifs
- [ ] **Citations / Motivation** — Citation du jour aléatoire
- [ ] **Rappels / Timer** — Définir des rappels programmés
- [ ] **Mini-jeux** — Quiz, devinez le nombre, pendu, etc.
- [ ] **QR code** — Générer un QR code à partir de texte
- [ ] **Raccourcisseur d'URL** — Raccourcir des liens longs
- [ ] **Historique IA** — Conversations continues avec mémoire contextuelle
- [ ] **Multi-langue (i18n)** — Support FR, EN, ES, etc.
- [ ] **Dashboard web** — Interface web pour gérer le bot

---

## 🤝 Contribution

Les contributions sont les bienvenues ! Voici comment contribuer :

1. **Fork** le dépôt
2. Créez une **branche** pour votre fonctionnalité
   ```bash
   git checkout -b feature/ma-feature
   ```
3. **Commitez** vos changements
   ```bash
   git commit -m 'feat: ajout commande météo'
   ```
4. **Push** sur votre branche
   ```bash
   git push origin feature/ma-feature
   ```
5. Ouvrez une **Pull Request**

### Conventions
- Format de commit : [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `docs:`, etc.)
- Une commande = un fichier dans `commands/`
- Chaque commande doit avoir `name` et `description`
- Testez votre commande avant de soumettre

---

## 📄 Licence

Ce projet est sous licence [MIT](LICENSE). Vous êtes libre de l'utiliser, le modifier et le distribuer.

---

<div align="center">

**⭐ Si ce projet vous plaît, n'hésitez pas à lui donner une étoile !**

Made with ❤️

</div>
