# FITILA Native

Portage Flutter natif de la plateforme React `fitila.bj/fitila`.

## Lancer l'application

```sh
flutter run \
  --dart-define=SUPABASE_URL=https://votre-projet.supabase.co \
  --dart-define=SUPABASE_ANON_KEY=votre-cle-publiable
```

Sans ces deux paramètres, l'application démarre en mode démonstration hors
ligne. Le compte de référence `65653468 / 123456` reste utilisable pour tester
les écrans sans écrire sur la production.

## Modules

- authentification téléphone et PIN selon le modèle `numero@fitila.app`;
- session Supabase persistante et profil auto-réparé;
- fil social Supabase avec actualisation temps réel;
- réactions, commentaires, favoris, partages et compteurs synchronisés;
- publication texte, photo, vidéo, audio, document et templates;
- médias dans Supabase Storage sous le dossier sécurisé de l'utilisateur;
- templates de création chargés depuis `tamtam_creation_templates`;
- classes niveaux 1 et 2, 772 contenus pédagogiques/audio Supabase,
  exercices, progression et corrections enseignant;
- dictionnaire Bariba fusionnant le corpus embarqué et les 7 525 entrées
  Supabase, avec propositions de mots;
- traducteur FR ↔ Bariba, historique et favoris synchronisés;
- Fitila IA via les Edge Functions existantes;
- apprentissage Français/Baatonum;
- profil réel, édition, publications et paramètres;
- notifications Supabase en temps réel;
- service Android IME Bariba natif, prédictions et caractères Unicode.

## Vérification

```sh
flutter analyze
flutter test
flutter build apk --release \
  --split-per-abi \
  --obfuscate \
  --split-debug-info=build/symbols \
  --dart-define=SUPABASE_URL=https://votre-projet.supabase.co \
  --dart-define=SUPABASE_ANON_KEY=votre-cle-publiable
```

Le clavier Android est déclaré comme `InputMethodService`. Depuis
« Clavier Bariba », ouvrir les réglages Android, activer « Clavier Bariba
Fitila », puis le sélectionner. L'écran affiche ensuite si le clavier est
activé et s'il est actuellement sélectionné.

La version de production utilise R8, la suppression des ressources inutiles,
la réduction des icônes, l'obfuscation Dart et un APK distinct par
architecture. Le dictionnaire est embarqué une seule fois et partagé entre
l'application Flutter et le clavier Android natif.

## Migration Supabase

La migration
`supabase/migrations/20260724230000_fix_tamtam_media_ownership.sql` complète
la suppression sécurisée des anciens médias React stockés sous `posts/...`.
Elle doit être déployée par un administrateur Supabase. Les nouveaux médias
Flutter utilisent directement `{user_id}/posts/...` et respectent les
politiques Storage déjà présentes.
