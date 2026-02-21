

# Application Native FITILA avec Capacitor (Android + iOS)

## Ce que nous allons faire

Transformer votre plateforme FITILA en application native publiable sur Google Play Store et Apple App Store, en utilisant Capacitor qui encapsule votre application web dans un conteneur natif.

## Etapes a realiser dans Lovable

1. **Installer les dependances Capacitor** : `@capacitor/core`, `@capacitor/cli`, `@capacitor/ios`, `@capacitor/android`
2. **Creer le fichier de configuration Capacitor** (`capacitor.config.ts`) avec le hot-reload pointe vers votre preview Lovable
3. **Ajouter les meta tags mobiles** dans `index.html` (viewport, status bar, theme-color, icones)
4. **Creer les icones et splash screens** pour Android et iOS dans le dossier `public/`

## Etapes a realiser sur votre ordinateur (apres Lovable)

Voici ce que vous devrez faire ensuite sur votre machine :

```text
1. Exporter le projet vers GitHub
   -> Bouton "Export to Github" dans Lovable

2. Cloner et installer
   git clone <votre-repo>
   cd <votre-projet>
   npm install

3. Ajouter les plateformes natives
   npx cap add android
   npx cap add ios

4. Construire et synchroniser
   npm run build
   npx cap sync

5. Lancer sur un emulateur ou telephone
   npx cap run android    (necessite Android Studio)
   npx cap run ios        (necessite un Mac avec Xcode)
```

## Pre-requis sur votre machine

- **Pour Android** : installer Android Studio (gratuit, Windows/Mac/Linux)
- **Pour iOS** : un Mac avec Xcode installe (gratuit sur le Mac App Store)
- Node.js installe (version 18+)

## Ce que Capacitor fait

Capacitor prend votre application web FITILA telle quelle et l'enveloppe dans une coquille native. L'application se comporte exactement comme sur le navigateur, mais avec :
- Acces aux fonctionnalites du telephone (camera, notifications, GPS...)
- Publication possible sur Google Play et App Store
- Icone sur l'ecran d'accueil comme une vraie app

## Section Technique

### Fichiers crees/modifies dans Lovable

```text
1. capacitor.config.ts (nouveau)
   - appId: app.lovable.a8b67aa7de064bed97db29852f4f01ed
   - appName: bariba-lex-builder
   - server.url: preview URL pour hot-reload
   - webDir: dist

2. index.html (modifie)
   - Ajout meta viewport mobile-optimized
   - Ajout meta apple-mobile-web-app-capable
   - Ajout meta theme-color

3. package.json (modifie)
   - Ajout des dependances @capacitor/*
```

### Configuration Capacitor

```text
capacitor.config.ts:
  appId:    app.lovable.a8b67aa7de064bed97db29852f4f01ed
  appName:  bariba-lex-builder
  webDir:   dist
  server:
    url:       https://a8b67aa7-de06-4bed-97db-29852f4f01ed.lovableproject.com?forceHideBadge=true
    cleartext: true
```

Le mode `server.url` pointe vers le preview Lovable pour le developpement avec hot-reload. Pour la version de production (publication sur les stores), il faudra retirer cette ligne pour que l'app utilise les fichiers compiles localement.

### Ressource utile

Consultez le guide complet : https://docs.lovable.dev/tips-tricks/native-mobile-apps pour plus de details sur la publication sur les stores.

