

# Plan : Profil Super IA - Createur Automatise de Contenu

## Probleme 1 : Erreur TTS (bariba-tts)

L'erreur `HF queue/join 404` indique que le Space HuggingFace utilise pour la synthese vocale Bariba est soit en veille, soit que son URL a change ou n'existe plus. Le Space gratuit s'endort apres inactivite et retourne une page HTML 404 au lieu du JSON attendu.

**Correction** : Ajouter une detection plus robuste du 404 HTML (la reponse contient `<!DOCTYPE html>`) et retourner un message clair au frontend au lieu d'un crash. Ajouter un fallback silencieux qui retourne le texte sans audio plutot qu'une erreur 500.

## Probleme 2 : Profil Super IA

### Concept

Creer un profil utilisateur special "Fitila IA" dans la base de donnees, identifiable par un flag `is_ai_profile`. Ce profil apparait dans le feed social comme un utilisateur normal avec un badge "IA" distinctif. Quand l'administrateur envoie un prompt simple (ex: "Cree un conte sur le lievre et la tortue"), le systeme utilise Lovable AI (Gemini 3 Flash) pour generer automatiquement le contenu et le publier sous ce profil.

### Architecture

```text
 Utilisateur (Admin)
       |
       | Prompt simple ("Cree un conte sur...")
       v
 [Edge Function: super-ia-create]
       |
       | 1. Genere le contenu via Lovable AI
       | 2. Genere transcript FR + BA (dictionnaire local)
       | 3. Insere dans tamtam_posts ou videos
       | 4. Utilise le user_id du profil IA
       v
 [Feed Social] -> Le post apparait comme venant de "Fitila IA"
```

### Types de contenu supportes

| Type | Table cible | template_id | Description |
|------|------------|-------------|-------------|
| Conte Live | tamtam_posts | conte-vivant | Conte interactif avec narration |
| Griot | videos | griot-digital | Video narrative animee |
| Patrimoine | tamtam_posts | patrimoine | Heritage culturel audio |
| Voix du Village | tamtam_posts | voix-village | Temoignage communautaire |

### Etapes d'implementation

**Etape 1 : Migration base de donnees**

- Ajouter une colonne `is_ai_profile` (boolean, default false) a la table `tamtam_profiles`
- Inserer le profil IA "Fitila IA" avec un UUID fixe genere, username "fitila_ia", display_name "Fitila IA", is_verified true, is_ai_profile true
- Creer une entree correspondante dans `auth.users` n'est PAS possible, donc le profil IA aura `user_id` NULL dans les posts (la colonne est nullable) et on identifiera les posts IA via un champ `metadata` ou `template_id`

**Alternative retenue** : Puisque `user_id` dans `tamtam_posts` est nullable, les posts du Super IA seront publies avec `user_id = NULL` et un champ identifiant dans les colonnes existantes (ex: `topic = 'fitila-ia'` ou ajout d'une colonne `ai_generated`).

**Etape 2 : Edge Function `super-ia-create`**

Nouvelle edge function qui :
1. Recoit un prompt + type de contenu (conte, griot, patrimoine, voix-village)
2. Appelle Lovable AI (Gemini 3 Flash) avec un system prompt specialise par type
3. Genere :
   - `transcript_fr` : Le texte complet en francais
   - `transcript_ba` : Traduction Bariba via le dictionnaire local (pas de service en ligne)
   - `feeling_emoji` : Emoji contextuel
   - `hashtags` : Tags pertinents
4. Insere dans `tamtam_posts` avec les champs remplis
5. Retourne l'ID du post cree

**System prompts par type** :
- **Conte** : "Tu es un griot traditionnel. Cree un conte court (200 mots max) avec une morale..."
- **Patrimoine** : "Tu documentes le patrimoine culturel Bariba. Decris une tradition, un rituel..."
- **Voix du Village** : "Tu rapportes une nouvelle du village. Cree un temoignage realiste..."
- **Griot** : "Tu es un griot anime. Cree une narration epique courte..."

**Etape 3 : Interface Admin - Super IA Panel**

Ajouter un composant `SuperIAPanel.tsx` accessible depuis le bouton admin flottant existant (`AdminFloatingButton.tsx`) :
- Champ texte pour le prompt
- Selecteur du type de contenu (Conte / Griot / Patrimoine / Voix du Village)
- Bouton "Generer et Publier"
- Indicateur de progression
- Apercu du contenu genere avant publication optionnel
- Historique des publications IA recentes

**Etape 4 : Affichage dans le Feed**

Modifier `TamTamSocial.tsx` pour :
- Detecter les posts IA (via `topic = 'fitila-ia'` ou metadata)
- Afficher un badge distinctif "Fitila IA" avec une icone robot
- Afficher le nom "Fitila IA" avec un badge verifie + badge IA
- Les interactions (likes, commentaires, partages) fonctionnent normalement

**Etape 5 : Fix du bariba-tts**

Modifier `bariba-tts/index.ts` pour :
- Detecter les reponses HTML (404 du Space endormi) et retourner une erreur propre au lieu d'un crash
- Ajouter un mode "text-only" qui retourne le texte sans audio si le Space est indisponible

### Fichiers concernes

1. **Nouveau** : `supabase/functions/super-ia-create/index.ts` - Edge function de generation
2. **Nouveau** : `src/components/admin/SuperIAPanel.tsx` - Interface admin
3. **Modifie** : `src/components/admin/AdminFloatingButton.tsx` - Ajouter acces au panel
4. **Modifie** : `src/pages/tamtam/TamTamSocial.tsx` - Badge IA dans le feed
5. **Modifie** : `supabase/functions/bariba-tts/index.ts` - Fix erreur 404 HTML
6. **Migration SQL** : Ajout colonne `ai_generated` (boolean) sur `tamtam_posts`

### Securite

- L'edge function `super-ia-create` verifiera que l'appelant est un admin via la fonction `has_role()`
- Seuls les admins pourront publier en tant que "Fitila IA"
- Les posts IA sont en lecture publique comme les autres posts

