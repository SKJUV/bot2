# Runbook opérateur

## But

Ce runbook décrit quoi faire quand la plateforme est déjà déployée et qu'il faut la maintenir.

## Vérifications quotidiennes

1. Le manager répond.
2. Le portail répond.
3. Les deux conteneurs sont en `Running`.
4. Les instances bot créées sont `Running`.
5. Le pairing code s'affiche pour une nouvelle instance.

## Commandes utiles

### Vérifier l'état d'un conteneur ACI

- Lire l'état général.
- Lire l'état de l'instance.
- Vérifier le nombre de redémarrages.

### Lire les logs

- Manager: logs de la création de compte, provisioning, webhook.
- Bot: logs d'auth, pairing, connexion WhatsApp.
- Portal: erreurs d'appel API vers le manager.

## Dépannage

### 1. `CrashLoopBackOff` sur le manager

Causes probables:

- variable `ADMIN_TOKEN` absente,
- `ACI_IMAGE` du bot manquant,
- `AZURE_STORAGE_KEY` invalide,
- `WEBHOOK_BASE_URL` incorrect.

Actions:

- vérifier les variables GitHub,
- relancer le workflow,
- vérifier les logs ACI.

### 2. Le portail s'affiche mais aucune instance ne se crée

Causes probables:

- `PLATFORM_MANAGER_URL` incorrect,
- `PLATFORM_ADMIN_TOKEN` invalide,
- manager inaccessible.

### 3. Le pairing code n'apparaît pas

Causes probables:

- le bot ne démarre pas,
- le webhook n'est pas joignable,
- `PAIRING_MODE` est désactivé,
- le numéro `PHONE_NUMBER` est mal formaté.

### 4. L'image GHCR est refusée

Causes probables:

- `AZURE_REGISTRY_USERNAME` / `AZURE_REGISTRY_PASSWORD` manquants,
- package GHCR non autorisé,
- mauvaise casse du nom d'image,
- image cible non publiée.

## Rotation de secrets

- Rotater la clé Storage Account dès qu'une fuite est détectée.
- Mettre à jour `AZURE_STORAGE_KEY` dans GitHub.
- Recréer le secret si nécessaire.

## Sauvegarde et restauration

- Sauvegarder le fichier JSON de données du manager.
- Sauvegarder la config Azure et les valeurs GitHub variables/secrets.
- Les dossiers `auth_info` doivent être considérés comme sensibles.
