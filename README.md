# FITILA — application Flutter native

Le projet principal pour le mobile est **fitila_flutter/**. Son interface est écrite en Dart/Flutter ; elle n’utilise ni React, ni Capacitor, ni WebView. Les anciens projets Web/Capacitor et le backend Supabase sont conservés pour préserver le travail existant.

## Démarrage Windows

```powershell
cd fitila_flutter
flutter pub get
flutter analyze
flutter test
flutter run -d emulator-5554
```

L’émulateur attendu est FITILA_API_35. Pour générer les deux formats Android depuis la racine :

```powershell
.\scripts\build-flutter.ps1
```

Sorties standard : fitila_flutter/build/app/outputs/flutter-apk/app-release.apk et fitila_flutter/build/app/outputs/bundle/release/app-release.aab.

## État fonctionnel à connaître

- Interface, navigation et dictionnaire embarqué natifs Flutter.
- Traduction locale fondée sur les correspondances réelles du dictionnaire. Un texte inconnu affiche une indisponibilité ; il n’est plus présenté comme traduit.
- Contrat de traduction Supabase ai-translate préparé avec authentification obligatoire. La connexion de recette ne produit pas de session Supabase.
- L’authentification, les rôles choisis localement et plusieurs modules sociaux/enseignants restent une maquette de recette. Ils ne constituent pas des autorisations serveur et ne sont pas validés comme services de production.
- La configuration Flutter héritée signe les releases avec la clé debug. Une signature de distribution et le raccordement des repositories au backend sont nécessaires avant publication.

## Documents

- [Provenance Flutter](fitila_flutter/RECONSTRUCTION.md)
- [Rapport d’audit et résultats](AUDIT_FITILA.md)
- [Détails de la maquette Flutter](fitila_flutter/README.md)

Les données, fonctions et migrations Supabase ont été conservées. Aucun déploiement distant ni aucune migration de base de données n’a été exécuté pendant cette reconstruction.
