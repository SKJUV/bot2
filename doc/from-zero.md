# Refaire la plateforme de zéro

Ce guide décrit la reconstruction complète de la plateforme à partir d'une machine vide.

## 1. Prérequis

### Local

- Node.js 20+
- npm
- Azure CLI (`az`)
- Git
- Un compte GitHub

### Azure

- Une souscription Azure active
- Un groupe de ressources cible
- Un stockage Azure avec File Share
- Droit de créer des Service Principals ou d'utiliser un principal existant

## 2. Structure finale attendue

```text
whatsapp-bot/
├── index.js
├── database.js
├── README.md
├── LICENSE
├── CONTRIBUTING.md
├── doc/
├── platform-manager/
└── platform-portal/
```

## 3. Étapes de reconstruction

### Étape A — préparer le bot

1. Installer les dépendances Node.js.
2. Vérifier le mode `PAIRING_MODE=true`.
3. Configurer:
   - `AUTH_DIR`
   - `PHONE_NUMBER`
   - `WEBHOOK_URL`
   - `INSTANCE_ID`
4. Valider que le bot remonte les événements `status` et `pairing_code`.

### Étape B — créer `platform-manager`

1. Initialiser un backend Fastify.
2. Ajouter un stockage local JSON.
3. Ajouter le provisionneur Azure et le mode mock.
4. Exposer les routes:
   - `/api/signup`
   - `/api/instances`
   - `/api/instances/:id`
   - `/api/instances/:id/actions`
   - `/api/instances/:id/logs`
   - `/api/webhooks/whatsapp`
5. Ajouter le support de GHCR et d'ACI.

### Étape C — créer `platform-portal`

1. Créer une app Next.js.
2. Ajouter les routes API proxy vers `platform-manager`.
3. Ajouter l'interface:
   - création de compte
   - création d'instance
   - affichage du pairing code
   - actions sur l'instance
   - lecture des logs

### Étape D — tester en local

1. Démarrer `platform-manager` en `PROVISIONER_MODE=mock`.
2. Démarrer `platform-portal`.
3. Créer un compte.
4. Créer une instance.
5. Vérifier que le pairing code apparaît.

### Étape E — déployer sur Azure

1. Construire les images via GitHub Actions.
2. Publier les images dans GHCR.
3. Déployer les conteneurs Azure Container Instances.
4. Renseigner les secrets GitHub.
5. Vérifier les endpoints publics.

## 4. Variables minimales

### Bot

- `PAIRING_MODE=true`
- `PHONE_NUMBER`
- `AUTH_DIR`
- `WEBHOOK_URL`
- `INSTANCE_ID`

### Manager

- `ADMIN_TOKEN`
- `AZURE_RESOURCE_GROUP`
- `AZURE_STORAGE_ACCOUNT`
- `AZURE_STORAGE_KEY`
- `AZURE_FILE_SHARE`
- `ACI_IMAGE`
- `WEBHOOK_BASE_URL`

### Portal

- `PLATFORM_MANAGER_URL`
- `PLATFORM_ADMIN_TOKEN`

## 5. Résultat attendu

Quand tout fonctionne, le flux est:

1. l'utilisateur s'inscrit,
2. une instance Azure dédiée est créée,
3. le bot démarre,
4. le pairing code s'affiche dans le portail,
5. l'utilisateur connecte son WhatsApp,
6. le manager continue d'exposer les logs et actions.
