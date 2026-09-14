# Audit FITILA — 13 septembre 2026

Dépôt audité : C:\Users\user\Documents\Codex\FITILA.
Rapport de travail : les contrôles non terminés ci-dessous ne sont pas déclarés réussis.

## Git et conservation

Branche main, suivi origin/main. Remote https://github.com/starlab007007/bariba-lex-builder.git. HEAD 5110b0c (Fixed real-time friend join). Clone superficiel : l’historique antérieur n’est pas disponible localement. Aucun push, reset, nettoyage ou changement de branche effectué.

2 010 fichiers suivis. État initial : 1 365 absences et six modifications locales. État et index enregistrés dans .fitila-audit/status-before.txt et index-before.txt. La liste missing-before.txt a servi à restaurer uniquement les chemins absents depuis l’index, après vérification de leur inexistence. Aucun fichier présent n’a été remplacé par cette restauration. Les modes exécutables Unix et fins de ligne Windows expliquent certains écarts supplémentaires ; l’index reste inchangé.

Un fichier présent dans bariba-lex-builder/src/components/tamtam/creator/TemplateSystem/templates/oneTakePro.ts refuse la lecture Git (Permission denied). Il est conservé ; son contenu local reste à comparer. Le sous-dossier bariba-lex-builder contient 925 fichiers suivis et constitue une seconde copie de l’application, pas un projet Flutter. Aucun retrait ni fusion de cette copie.

## Architecture reconstituée

- Frontend React 18 / TypeScript / Vite 5, composants shadcn/Radix, Tailwind, React Router, React Query, Framer Motion.
- Mobile Android : Capacitor 8, application app.lovable.a8b67aa7de064bed97db29852f4f01ed, versionCode 1, versionName 1.0. SDK minimum 24, cible/compilation 36. Gradle 8.14.3, Android Gradle Plugin 8.13.0, sources Java 21.
- Clavier natif Bariba : service Android IME, plugin Capacitor et dictionnaire embarqué dans android-native, copies d’intégration dans android/app/src/main.
- Backend Supabase : Auth, PostgreSQL, Storage, Realtime, 41 fonctions Edge et un dossier partagé, 83 migrations. L’inventaire statique détecte 87 noms de tables créées ; ce chiffre ne décrit pas un schéma distant inspecté.
- Déploiement Web : Docker Node 22 puis Nginx, compose nommé docker-composer.yml, routage Traefik, workflow GitHub deploy.yml.
- Scripts existants surtout Bash et Node : préparation du clavier, permissions, asset dictionnaire, build/signature APK, contrôle APK, téléchargement Envato. Nouveau script Windows scripts/build-android.ps1.
- Aucun pubspec.yaml ni fichier Dart suivi. Aucune base Flutter à compléter dans ce dépôt.

## Fonctionnalités et règles existantes

src/App.tsx redirige / vers /fitila. Le shell contient réseau social TamTam, profils publics/privés, services, marché, agriculture, finance, éducation, santé, SOS, traduction, dictionnaire, apprentissage, classes, assistants IA, laboratoire vocal, création vidéo/templates et Griot Studio. Les routes messages et discover utilisent explicitement ComingSoonPage.

Enseignants : tableau de bord, élèves, corrections, notes, statistiques, pondérations, corrigés et leçons de lecture vocale. Administration : gestion et corpus vocal. AuthContext consulte user_roles pour admin ; useTeacherRole accepte teacher ou admin. ProtectedRoute exige une session et vérifie les rôles selon la route. Les migrations portent les politiques RLS ; aucune politique ou règle métier modifiée. La fonction admin-users vérifie côté serveur l’identité et le rôle. set-security vérifie la session ; reset-pin utilise les réponses visuelles et une logique de verrouillage.

Les modules linguistiques portent corpus bariba/baatonum, mémoire de traduction, retours qualité, entraînement, transcription et synthèse vocale. Le frontend utilise aussi des services externes ; leur disponibilité réelle et leurs credentials n’ont pas été validés.

## Anomalies identifiées

1. Critique pour la compilation : sources, backend, migrations et ressources massivement absents. Restaurés depuis Git.
2. Plugin Bariba importé mais non enregistré dans MainActivity. Corrigé par registerPlugin avant super.onCreate.
3. Playwright importe lovable-agent-playwright-config, absent des dépendances. Remplacé par @playwright/test déjà déclaré ; tests de navigation et protection enseignant ajoutés.
4. Java du PATH = 17, sources Android = 21. Le JDK Android Studio disponible = 25. Un JDK 21 compatible doit être utilisé ; aucune modification globale du PATH.
5. Fonctions configurées mais absentes : smt-initialize, retrain-model, fine-tune-nllb, train-translation-model, enhance-training-data, enrich-training-data, huggingface-translate.
6. Fonctions appelées littéralement par le frontend mais absentes : retrain-model, enhance-training-data, bariba-translate, clone-voice, synthesize-speech, generate-3d-avatar, generate-beat, health-check, generate-character-asset. Références exactes dans architecture-inventory.json. Ne pas remplacer ces API par des simulacres ; vérifier le code source serveur ou les déploiements existants.
7. Plusieurs verify_jwt=false : besoin d’auditer l’authentification interne fonction par fonction avant tout changement. Ce réglage seul ne démontre pas une faille.
8. Configuration PWA : cache générique Supabase précède le cache audio signé, qui risque donc de ne pas être sélectionné. Vérifier également l’isolation des caches entre utilisateurs.
9. AuthContext : résolution asynchrone du rôle admin et état loading ne sont pas synchronisés ; risque de redirection précoce et de réponse obsolète lors d’un changement de session. À tester avant correction.
10. Script Bash de release : valeur de mot de passe par défaut, affichage du mot de passe et réécriture de signing.properties. Ne pas l’exécuter tel quel pour une release réelle. Le nouveau script Windows ne crée ni ne remplace de clé.
11. Permission INTERNET déclarée deux fois dans le manifest ; doublon sans impact démontré sur le build.
12. Seconde copie du projet, lecture locale refusée sur un fichier, README générique Lovable et absence de tests applicatifs initialement repérés.

## Contrôles

- Restauration Git : plus de fichiers suivis signalés absents après opération.
- npm install : lancé, téléchargements en cours lors de cette rédaction, journal npm-install.log.
- TypeScript : lancé, résultats dans typescript.log.
- Flutter pub get : Expected to find project root in current working directory.
- Flutter analyze : No issues found ; aucun code Dart présent, résultat non probant pour une application Flutter.
- Flutter test : Test directory "test" not found.
- AVD FITILA_API_35 : présent, démarré sans fenêtre ; ADB l’a détecté offline pendant le démarrage. Installation et test de l’application pas encore validés.
- Script PowerShell : parsing exécuté. Génération effective APK/AAB non encore validée.

## Livraison Android à terminer

Terminer npm install, build Vite, analyse TypeScript/ESLint et tests Playwright. Synchroniser Capacitor, générer le dictionnaire, compiler avec Java 21 via scripts/build-android.ps1, puis installer l’APK debug sur FITILA_API_35 et tester démarrage, authentification, navigation et clavier. Vérifier les sorties assembleRelease et bundleRelease ainsi que la signature existante avant distribution. Aucun APK/AAB n’est annoncé produit tant que ces commandes n’ont pas réussi.

Aucune migration appliquée, aucune donnée distante modifiée, aucun secret volontairement inclus dans ce rapport.

## Mise à jour des validations

npm install a réussi : 813 paquets ajoutés, 814 audités (environ 20 minutes). Audit npm : 22 vulnérabilités (2 faibles, 7 modérées, 12 hautes, 1 critique). Détail enregistré dans .fitila-audit/npm-audit.json. tar est classé critique ; certaines corrections imposent une migration majeure de Vite et des problèmes de transformers/sharp ne disposent pas de correction proposée par npm. Aucune mise à jour forcée.

Analyse TypeScript finale après installation et corrections : code de sortie 0, aucun diagnostic. Corrections supplémentaires : types TablesInsert/TablesUpdate et Json existants utilisés pour les payloads Griot, conte-vivant et gamification ; légende TamTamCreator envoyée dans transcript, champ du schéma existant, au lieu de content absent. Aucun changement du calcul de points ou du schéma.

ESLint exécuté : 991 erreurs, 133 avertissements. Principales familles : 799 no-explicit-any, 71 no-empty, 57 no-misleading-character-class, 22 no-case-declarations, 21 no-useless-escape. Les règles ne sont pas désactivées. Le lint exclut désormais les artefacts d’audit, Android et la copie imbriquée : cette dernière doit être analysée séparément après résolution de ses accès disque.

Vite a compilé 4 734 modules et écrit les chunks ; le processus complet attend encore sa phase PWA lors de cette mise à jour. Avertissement : chunk dictionnaire de 1,8 Mo. Premier essai Playwright échoué car le serveur Vite plante sur EBUSY en surveillant bariba-lex-builder/src/data/learningConfig.ts. Correction de server.watch.ignored pour ne pas surveiller la copie imbriquée, Android et .fitila-audit. Nouvel essai lancé avec Microsoft Edge.

JDK 21 Temurin téléchargé et extrait dans .fitila-audit/jdk21 ; Gradle 8.14.3 installé et --version réussi. Premier essai Android arrêté par timeout de verrou Gradle, relancé après installation. Instance FITILA_API_35 détectée offline mais sans démarrage Android validé ; arrêt de cette instance de test pour libérer environ 1,5 Go de mémoire.

Les artefacts locaux .fitila-audit, playwright-report et test-results sont exclus de Git ; Docker exclut également les artefacts locaux et la clé de signature. Le rapport reste versionnable. Les sauvegardes de code corrigé se trouvent dans .fitila-audit.

## Projet Flutter retrouvé sur la branche flutterbariba

Source fournie par l’utilisateur : branche flutterbariba, sous-dossier fitila_flutter ; commit 36aec29ded89df0211494d2b1fad6da802d5730d. Récupération par git fetch, sans checkout de main. Archive originale .fitila-audit/flutter-source.zip et copie de travail .fitila-audit/flutter-source/fitila_flutter. Cette découverte remplace la conclusion « aucun Flutter » pour le projet global ; la branche main seule ne le contient effectivement pas.

Architecture Flutter : un fichier lib/main.dart (UI, navigation, modèles, services), dictionnaire JSON embarqué, dépendance HTTP, un test widget. Le README et le code confirment une maquette de recette : authentification avec identifiants de test et rôle choisi localement ; données sociales et modules simulés ; raccordements Supabase majoritairement à réaliser. Cela n’est pas une authentification de production et ne remplace pas les règles serveur de la version Web.

Anomalies Flutter : appel /functions/v1/translate absent du backend fourni ; fallback de traduction qui préfixe le texte source sans réellement le traduire ; permission Internet absente du manifeste release ; release signée avec clé debug ; mémoire Gradle configurée à 8 Go + 4 Go de metaspace ; wrapper Gradle non versionné. ApplicationId bj.fitila.fitila_flutter, différent de Capacitor : les deux applications peuvent coexister, mais les identités ne doivent pas être fusionnées sans stratégie de distribution.

Corrections dans la copie isolée : wrappers absents copiés depuis le SDK Flutter installé, permission Internet ajoutée, libellé Android FITILA, mémoire Gradle limitée à 2 Go et deux workers. flutter pub get réussi (quatre dépendances de test mises à jour par résolution SDK). Analyse et test du véritable projet lancés ; ne pas confondre avec les commandes initiales à la racine React.

Web final : npm run build terminé, PWA générée avec 216 entrées de précache (~24,8 Mo), cap sync android réussi. Les deux tests Playwright passent : accueil/redirection et protection enseignant anonyme. Attente du DOM pour l’accueil au lieu du chargement complet des médias distants. Les API authentifiées et workflows transactionnels restent à tester avec des comptes de recette.

## Mise à jour Git distant et reconstruction visible

La vérification réseau a trouvé origin/main au commit b8704cb207cb3a5256144154b022acc89f77a5a5, plus récent que HEAD local 5110b0c. Un fetch limité à 25 commits a permis d’inspecter l’historique récent. Le diff porte sur 24 fichiers, principalement persistance de session, canaux Realtime et PWA. Les modifications de code src/ et vite.config.ts ont été intégrées par patch contrôlé (git apply --check), sans changer HEAD, sans modifier l’index et sans importer les documents .lovable. Le patch exact est conservé dans .fitila-audit/upstream-code.patch. TypeScript passe également après cette intégration.

La copie Flutter corrigée est désormais visible à fitila_flutter/ ; ce dossier était absent avant extraction. RECONSTRUCTION.md indique sa branche et son commit. La compilation de contrôle utilise une copie équivalente sous .fitila-audit/flutter-source/fitila_flutter pour isoler les caches et les sorties.

Flutter : pub get réussi ; analyze réussi, aucun problème (170,6 s) ; test widget réussi, 1 test. Les builds APK/AAB release sont lancés. Le backend de recette reste simulé.

Capacitor : un APK debug d’environ 47 Mo a été généré. La configuration de signature existante pointait vers un chemin inaccessible ; seul storeFile a été remplacé par le chemin relatif ../../.keystore/fitila-release.jks, après vérification du fichier correspondant. Aucune clé ni aucun identifiant de signature remplacé. Les builds release et la resynchronisation de la dernière révision Web sont encore à finaliser.

## Priorité finale : Flutter uniquement

À la demande de l’utilisateur, la compilation Capacitor a été arrêtée ; aucun travail Web supplémentaire n’est lancé. README.md pointe maintenant vers fitila_flutter et scripts/build-flutter.ps1. Les fichiers Web/Capacitor restent conservés.

Correction fonctionnelle native supplémentaire : le traducteur ne renvoie plus le texte d’entrée précédé du nom de la langue comme s’il était traduit. Les correspondances lexicales sont réellement lues dans le dictionnaire ; une absence produit une erreur utilisateur explicite sans fausse entrée d’historique. Le contrat distant est aligné sur ai-translate (text/sourceLang/targetLang et Authorization) et n’est appelé qu’en présence d’un jeton utilisateur. La session de recette locale n’en invente pas.

Cinq tests de service couvrent le chargement de l’asset, les deux directions, l’absence de fausse traduction, le contrat API simulé et le fallback sur échec serveur. Ils s’ajoutent au test widget de connexion. Validation finale relancée depuis fitila_flutter, le dossier livré.

Vérification de conservation : git diff --quiet HEAD -- supabase retourne 0 ; aucun fichier suivi ne reste absent. La clé .keystore/fitila-release.jks et signing.properties étaient déjà suivis par Git : leur gestion doit être revue avant diffusion ; aucun secret n’est reproduit dans ce rapport.
