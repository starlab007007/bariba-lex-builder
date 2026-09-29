# Audit de conformité Web ↔ Flutter Build19

Référence : branche `ci/flutter-reference-renders-20260928` (`fitila_flutter/test/web_parity_renders`, 138 rendus
390×844 / 390×2400 / 1440×900) et `fitila_flutter/lib/core/signature_theme.dart` (« Premium Clair »).
Méthode : chaque écran web est capturé au même format (Playwright) et comparé au rendu Flutter correspondant.

## Écarts constatés puis corrigés

| Zone | Écart initial | Correction |
|---|---|---|
| Thème global | Fond sombre `kuaishou-bg`, dégradés lavande/orange, primaire bleu/orange | Jetons Premium Clair sur `:root` (`index.css`) + `signatureTheme.ts` ; fond crème `#F7F5EC` |
| Typographie | Fraunces non chargée | Police hébergée (`public/fonts`), `font-serif` |
| Shell mobile | Bande sombre sous la barre du bas, tiroir sombre | Fond clair, tiroir clair identique au Flutter |
| Shell bureau (≥1024 px) | Barre du bas + bouton flottant | Menu latéral permanent, barre supérieure (recherche, notifications, compte) |
| En-têtes | Titre masqué par le bouton menu (Traducteur, IA…) | `FitilaPageHeader` décalé de 74 px (18 px sur bureau) |
| Services, Créer, Installer, Découvrir | Grilles colorées / pages noires | Recomposés d'après le Flutter |
| Portefeuille, Messages, Brouillons, Hors ligne, Historique, Scanner, Boutique | Placeholder « Vue » | Métriques, puces, grille de fonctionnalités du Flutter |
| Paramètres | Placeholder | Interrupteurs persistants (localStorage), onglets, déconnexion |
| Dictionnaire, Traducteur, Fitila IA, Tem IA, Classe | Style indigo/émeraude | Style clair, pastilles or, violet IA, sauge Tem IA |
| Santé, Agriculture, Finance, Éducation, Marché | Tuiles emoji colorées, cartes dégradées | Tuiles blanches à icônes sauge, cartes sobres |
| SOS | Clés i18n brutes (`emergency`, `tapToSpeak`…) | Écran Flutter + libellés de secours |
| Templates | Hero animé | Métriques + carte recherche/catégories |
| Apprendre | Onboarding absent, progression décalée | `ApOnboardingScreen` porté, progression refaite, avatar guide, titres Fraunces |
| Clavier | Écran flottant par défaut | Écran d'activation (statut, étapes) par défaut |
| Connexion | Fond orange | Flux identique, thème clair |
| Handunia / Sagesse Battle | Thème nuit, emoji | Thème clair, onglets Autour/Lignée/Découvrir, cartes de défi |
| Liens hérités | `/fitila`, `/tamtam`, `/fitila/teacher/...` restants | Remplacés par les routes canoniques |
| i18n | 24 clés absentes → clés affichées | Libellés français de secours dans `FitilaLanguageContext` |

## Limites connues / à valider avec vous

- **Données de test** : Supabase est bloqué depuis l'environnement d'audit ; les écrans qui exigent une session
  (Handunia, Profil, Voice Lab, Enseignant) n'ont pas pu être comparés avec des données réelles.
- **Écrans Flutter à onglets** (Marché, Finance, Éducation, Santé, Agriculture) : le web conserve sa logique
  (chatbots, TTS, sous-routes) ; seul l'habillage est aligné.
- **Onglets Autour / Lignée** (Handunia) : filtrés par `scope_level` (hypothèse), à confirmer côté produit.
- **SOS** : la saisie vocale et l'indicateur de localisation du web sont conservés (absents du rendu Flutter).
- **Boutons audio** des tuiles métier conservés (accessibilité), en style discret.

## Vérification Supabase (projet `fitila`, `dvswhjawiooprghzeyol`)

- Types régénérés depuis le schéma réel : `tsc` passe de 49 erreurs à 0.
- Corrigés (échecs certains à l'exécution) : publication du Créateur (`tamtam_posts` n'a pas de colonne `content`
  et la RLS exige `user_id`), réponse Sagesse Battle (`answer_text` et prompts NOT NULL), séance de thème Apprendre
  (`themeSession` manquant).
- SOS : contacts de confiance branchés sur `tamtam_emergency_contacts` (ajout, appel, suppression).
- Contenu Apprendre en base : `core` et `scenes` en `v2.4-build19-20260927` (cohérent avec le JSON embarqué).
- Valeurs `scope_level` de Handunia confirmées : `community`, `elders`, `lineage`.

### Points à traiter côté Supabase (non modifiés)
- Fonctions Edge appelées par l'interface mais **non déployées** : `set-security`, `reset-pin`, `raconte-moi`,
  `smart-assistant`, `french-stt`, `recognize-handwriting`, `generate-content`, `generate-content-stream`,
  `hf-keep-alive`, `health-check`, `analyze-asset`, `analyze-news`, `analyze-story`, `clone-voice`,
  `enhance-training-data`, `generate-3d-avatar`, `generate-anime-story`, `generate-beat`,
  `generate-character-asset`, `generate-image-animation`, `generate-template-assets`, `retrain-model`,
  `synthesize-speech`, `elevenlabs-music`.
- `public.get_user_phone(uuid)` : exécutable par `anon` mais ne renvoie le numéro que si `auth.uid() = target_user_id` (pas de fuite) ; l'alerte du linter est informative.
- Index unique en double sur `battle_responses` : supprimé (migration `20260929090000`).
- Protection contre les mots de passe compromis désactivée ; `pg_net` dans le schéma `public`.

## Mise à jour finale
- Publication Handunia : assistant en 4 étapes (Raconter → Lieu → Détails → Publier) comme le Flutter.
- Fonctions Edge déployées (JWT requis) : `set-security`, `reset-pin` (sans JWT, verrouillage), `raconte-moi`, `french-stt`,
  `hf-keep-alive`, `generate-content`, `generate-content-stream`, `recognize-handwriting`, `analyze-news`,
  `analyze-story`, `analyze-asset`, `smart-assistant`.
- Secrets à définir dans Supabase : `MISTRAL_API_KEY` (raconte-moi, recognize-handwriting, analyze-asset et les
  fonctions de génération), `HUGGING_FACE_API_TOKEN` si utilisé.
- Non déployées car absentes du dépôt ou dépendantes de `FITILA_IMAGE_API_URL` : `clone-voice`, `enhance-training-data`,
  `generate-3d-avatar`, `generate-anime-story`, `generate-beat`, `generate-character-asset`, `generate-image-animation`,
  `generate-template-assets`, `retrain-model`, `synthesize-speech`, `elevenlabs-music`, `health-check`.
