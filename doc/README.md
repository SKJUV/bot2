# Documentation FaouzBot / Platform

Ce dossier contient la documentation de référence pour reconstruire la plateforme complète de zéro, la déployer sur Azure, l'opérer et la sécuriser.

## Contenu

- [Architecture globale](architecture.md)
- [Reconstruction de zéro](from-zero.md)
- [Déploiement Azure et CI/CD](deployment.md)
- [Runbook opérateur](runbook.md)
- [Sécurité, secrets et pratiques minimales](security.md)
- [Contribution au projet](../CONTRIBUTING.md)

## Vue d'ensemble

La plateforme est composée de trois blocs:

1. **Bot WhatsApp**: application Node.js + Baileys, lancée par utilisateur, avec mode pairing code.
2. **platform-manager**: backend d'orchestration, provisionnement Azure Container Instances, gestion des utilisateurs, logs et actions.
3. **platform-portal**: interface Next.js pour créer un compte, lancer une instance, afficher le pairing code et consulter l'état.

Pour une lecture rapide, commencer par [Reconstruction de zéro](from-zero.md).
