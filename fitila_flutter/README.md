# FITILA Flutter Native

Application Flutter native pour reproduire le parcours metier FITILA web React en mobile/tablette/desktop Flutter.

Maquette Figma complete:
https://www.figma.com/design/hMuCnLHeAcpG5NYbWi2uR3

## Couverture fonctionnelle

- Authentification de recette avec telephone `65653468` et mot de passe `123456`.
- Shell responsive: sidebar desktop, drawer mobile, topbar, recherche globale.
- Fil social: posts texte/audio/video/template, creation, like, commentaire, partage.
- Studio createur: texte, audio, video, templates, prompt IA, tags, visibilite, brouillon/publication et moderation.
- Workflow createur inspire React: discover, capture, preview, finalisation et success.
- Galerie templates: recherche, categories, preview verticale 9:16, badges premium/nouveau.
- Modules React `/fitila/*`: services, marche, agriculture, finance, education, sante, SOS, messages, decouvrir, installation, brouillons, offline, portefeuille, historique, scanner et boutique.
- Dictionnaire Bariba-Francais local embarque depuis `assets/data/dictionnaire_ameliore.json`.
- Detail dictionnaire: phonetique, definition, exemples, ecoute, signalement, contribution.
- Traducteur FR -> BA / BA -> FR avec fallback offline et point d'integration API.
- Fitila IA: chat, suggestions Tem-IA, aide classe, culture, sources.
- Tem-IA foncier: analyse, sources citees, resume bilingue et voix.
- Apprendre: modules, progression, lecons, exercices.
- Classe: Niveau 1, Niveau 2, reponses texte/vocales, corrections, notes.
- Clavier Bariba: caracteres speciaux integres et guide Android.
- Voice Lab: TTS, STT, corpus vocal, diagnostic.
- Espace enseignant: eleves, corrections, ponderations, releves PDF.
- Profil et parametres: securite, langue, cache offline, audio, deconnexion.

## Architecture actuelle

Le premier module est volontairement autonome pour permettre la validation UI/UX avant la connexion backend.

- `lib/main.dart`: UI, navigation, modeles simples et services d'integration.
- `assets/data/dictionnaire_ameliore.json`: dictionnaire embarque pour recherche offline.
- `test/widget_test.dart`: smoke test de connexion et arrivee sur le fil.

Les services sont prepares dans `FitilaServices`:

- `loadDictionary()`: charge l'asset local.
- `translate()`: tente un appel Supabase Function, puis retombe en fallback offline.

## Backend a brancher ensuite

Les modules attendus cote backend viennent du parcours React inspecte:

- Supabase Auth / profils: `tamtam_profiles`.
- Fil social et studio createur: posts, medias, interactions, commentaires, templates, tags, visibilite, brouillons et publication programmee.
- Classe: `classe_student_answers`, `classe_answer_keys`, `classe_grade_weights`, `classe_chapters`.
- Audio: fonctions Supabase `french-tts`, `transcribe-audio`, services HuggingFace TTS/STT.
- IA: historique conversationnel, cache local, corpus Tem-IA/foncier avec sources.

La prochaine etape peut remplacer les donnees mockees par des repositories Flutter:

- `AuthRepository`
- `FeedRepository`
- `DictionaryRepository`
- `TranslatorRepository`
- `ClasseRepository`
- `VoiceRepository`
- `ProfileRepository`

## Commandes

```bash
flutter pub get
flutter analyze
flutter test --reporter compact
flutter build web --release
```

## Validations effectuees

- `flutter analyze`: OK
- `flutter test --reporter compact`: OK
- `flutter build web --release`: OK

## Notes UI

Le design suit la maquette Figma et les tokens Flutter:

- Primary bleu ciel: `#38BDF8`
- Ink: `#0F172A`
- Surface: `#F0F9FF`
- Border: `#BAE6FD`
- Radius: `8`
- Font: `Roboto`

Les composants principaux sont alignes avec Material 3 pour rester exploitables sur Android, iOS et web.
