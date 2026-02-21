

# Correction de l'APK qui redirige vers lovable.dev

## Diagnostic

Le fichier `capacitor.config.ts` contient actuellement un bloc `server` qui force l'application a charger son contenu depuis une URL distante (le preview Lovable) au lieu des fichiers HTML/JS/CSS compiles et embarques dans l'APK.

```text
server: {
  url: 'https://a8b67aa7-...lovableproject.com?forceHideBadge=true',
  cleartext: true,
}
```

Quand vous ouvrez l'APK, l'app essaie de se connecter a cette URL. Si le reseau est lent ou indisponible, l'app ne s'ouvre pas. Si elle y arrive, elle affiche le site web Lovable au lieu de fonctionner comme une app autonome.

## Solution

Supprimer le bloc `server` de `capacitor.config.ts`. Sans ce bloc, Capacitor charge automatiquement les fichiers locaux depuis le dossier `dist/` compile dans l'APK.

## Ce qui va changer

**Fichier modifie** : `capacitor.config.ts`

Avant :
```text
const config: CapacitorConfig = {
  appId: 'app.lovable.a8b67aa7de064bed97db29852f4f01ed',
  appName: 'FITILA',
  webDir: 'dist',
  server: {
    url: 'https://a8b67aa7-...',
    cleartext: true,
  },
};
```

Apres :
```text
const config: CapacitorConfig = {
  appId: 'app.lovable.a8b67aa7de064bed97db29852f4f01ed',
  appName: 'FITILA',
  webDir: 'dist',
};
```

## Apres approbation

Une fois cette modification faite, vous devrez regenerer l'APK sur votre machine :

1. Faire un `git pull` pour recuperer la modification
2. `npm run build` pour recompiler l'application
3. `npx cap sync` pour synchroniser les fichiers dans le projet Android
4. Regenerer l'APK via Android Studio ou `./gradlew assembleDebug`

L'APK resultant fonctionnera de maniere autonome, sans connexion internet requise pour le chargement initial.

