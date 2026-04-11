# Sécurité, secrets et protection des actifs

## Principes

- Ne jamais versionner de clés, tokens ou fichiers d'auth.
- Ne jamais stocker les secrets dans les images.
- Utiliser des secrets GitHub et Azure pour tout ce qui est sensible.
- Isoler chaque instance bot dans son propre dossier d'auth.

## Actifs sensibles

- `AZURE_STORAGE_KEY`
- `AZURE_CREDENTIALS`
- `ADMIN_TOKEN`
- `PLATFORM_ADMIN_TOKEN`
- `AZURE_REGISTRY_USERNAME`
- `AZURE_REGISTRY_PASSWORD`
- `GEMINI_API_KEY`
- dossiers `auth_info`
- fichiers de session et fichiers de logs de test

## Bonnes pratiques

1. Utiliser un File Share distinct ou un sous-dossier par utilisateur.
2. Nettoyer les artefacts de test locaux.
3. Mettre `.mock-storage/` et les dumps de test dans `.gitignore`.
4. Utiliser des images GHCR dédiées et privées.
5. Révoquer toute clé exposée immédiatement.
6. Préférer le principe du moindre privilège pour le Service Principal Azure.

## Ce que protège la licence

Le dépôt applique des licences standards séparées:

- **Code logiciel**: licence MIT (`LICENSE`)
- **Contenus non-code (assets visuels, diagrammes, captures)**: CC BY-NC-ND 4.0 (`LICENSE-ASSETS.md`)

## Remarque

La protection juridique réelle dépend aussi de la publication, des dépôts, des mentions de copyright et des politiques de marque. Cette base technique et documentaire ne remplace pas un avis juridique.
