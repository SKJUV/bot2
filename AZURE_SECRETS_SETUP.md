# Configuration des secrets GitHub pour Azure deployment

⚠️ **AVANT DE PUSH LE WORKFLOW**, configure ces 3 secrets sur GitHub :

## Étapes

1. Va sur **https://github.com/SKJUV/bot2/settings/secrets/actions**

2. Clique sur **"New repository secret"** et ajoute ces 3 secrets :

### Secret 1 : ACR_NAME
```
faouzbotacr11360
```

### Secret 2 : ACR_USERNAME
```
faouzbotacr11360
```

### Secret 3 : ACR_PASSWORD
```
BnGaLmJulNdXK8lxGfk3fD0KIukHYJHiVFWRm9LMMiAwPs5JIomFJQQJ99CCAC5T7U2Eqg7NAAACAZCRF
Z3D
```

## Vérification

Une fois les 3 secrets ajoutés :
- Push le code avec le workflow `.github/workflows/azure-deploy.yml`
- Va sur l'onglet **Actions** du repo
- Le workflow "Build & Deploy to Azure" se lancera automatiquement
- Tu verras l'image être construite et poussée vers ACR

## Après le build

L'image sera disponible à :
```
faouzbotacr11360.azurecr.io/bot2:latest
```

On pourra ensuite déployer sur Azure Container Instances.
