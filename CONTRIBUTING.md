# Contribuer au projet

Merci de respecter ces règles avant toute contribution.

## Principes

- Ne jamais ajouter de secrets, de clés API, ni de fichiers de session.
- Toute modification doit passer les tests locaux avant push.
- Les commits doivent suivre les [Conventional Commits](https://www.conventionalcommits.org/).
- Préserver la séparation entre le bot, le manager et le portail.

## Flux de travail

1. Créer une branche dédiée.
2. Faire les changements avec le minimum d'impact.
3. Valider localement.
4. Documenter les effets sur Azure, GHCR ou les secrets si nécessaire.
5. Ouvrir une PR ou pousser sur la branche cible.

## Règles de style

- Préserver le style existant du projet.
- Éviter les refactorings non nécessaires.
- Ajouter des fichiers `.md` quand une fonctionnalité change le comportement d'exploitation.

## Avant de soumettre

- Vérifier qu'aucun fichier sensible n'est ajouté au dépôt.
- Vérifier les workflows GitHub Actions.
- Vérifier que la documentation est à jour.
