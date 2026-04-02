

# Récupération de PIN — Système Visuel Intelligent

## Le Problème

Le système actuel demande le nom d'utilisateur comme question de sécurité. C'est faible (facile à deviner) et pas adapté aux utilisateurs qui ne savent pas lire/écrire.

## La Solution : "Code Secret Visuel" en 3 étapes

Un système basé sur des **images** que l'utilisateur choisit à l'inscription et doit retrouver pour récupérer son PIN.

### Flux Inscription (ajout après création du PIN)

Nouvel écran "Protège ton compte" :
1. **Choisis ton animal secret** — Grille de 9 animaux illustrés (lion, éléphant, coq, serpent, tortue, poisson, oiseau, chèvre, chat). L'utilisateur en touche **2**.
2. **Choisis ta couleur secrète** — Grille de 6 grandes pastilles de couleur (rouge, bleu, vert, jaune, orange, violet). L'utilisateur en touche **1**.
3. **Choisis ton objet secret** — Grille de 9 objets du quotidien (moto, ballon, guitare, étoile, maison, arbre, soleil, lune, clé). L'utilisateur en touche **1**.

Total : 4 choix visuels = combinaison secrète. Pas besoin de lire ou écrire.

### Flux Récupération de PIN

1. L'utilisateur entre son numéro de téléphone
2. On lui montre la grille d'animaux → "Retrouve tes 2 animaux secrets"
3. Puis la grille de couleurs → "Retrouve ta couleur secrète"
4. Puis la grille d'objets → "Retrouve ton objet secret"
5. Si les 4 choix correspondent → il peut créer un nouveau PIN
6. Si échec → "Demande à un ami ou contacte un administrateur"

### Sécurité

- 9×8 (animaux, ordre ignoré) × 6 (couleur) × 9 (objet) = **3 888 combinaisons** — suffisant pour bloquer les tentatives aléatoires
- **3 tentatives max** avant blocage temporaire de 15 minutes
- Les réponses sont stockées hashées côté serveur (edge function)

## Implémentation Technique

### 1. Base de données — nouvelle table `security_answers`

```sql
CREATE TABLE public.security_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  answers_hash TEXT NOT NULL,
  failed_attempts INTEGER DEFAULT 0,
  locked_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.security_answers ENABLE ROW LEVEL SECURITY;
-- Policy: users can only read/update their own row
```

### 2. Edge Function `reset-pin` — mise à jour

- Nouveau endpoint : accepte `phone_number` + `security_answers` (tableau de choix visuels)
- Compare le hash des réponses avec celui stocké
- Gère le rate-limiting (3 tentatives, blocage 15 min)
- Si match → met à jour le PIN via `admin.updateUserById()`

### 3. Edge Function `set-security` — nouvelle

- Appelée après l'inscription pour sauvegarder les choix visuels
- Reçoit `user_id` + `answers` (tableau des choix)
- Hashe les réponses et les stocke dans `security_answers`

### 4. Composant `VisualSecuritySetup.tsx` — nouveau

- Grilles d'images avec emojis/illustrations grandes et tactiles
- Animations de sélection (scale + glow)
- 3 étapes : animaux → couleur → objet
- Intégré dans le flux d'inscription après `pin-confirm`

### 5. Mise à jour de `TamTamPhoneAuth.tsx`

- Nouveau step `security-setup` après `pin-confirm` (inscription)
- Modification du step `pin-forgot` : remplacer la saisie de nom par les grilles visuelles
- Ajout des steps `security-check-1`, `security-check-2`, `security-check-3` pour la récupération

### 6. Illustrations

On utilise des **emojis natifs** en grande taille (64px) — universels, gratuits, pas de téléchargement :
- Animaux : 🦁 🐘 🐓 🐍 🐢 🐟 🐦 🐐 🐱
- Couleurs : pastilles CSS colorées
- Objets : 🏍️ ⚽ 🎸 ⭐ 🏠 🌳 ☀️ 🌙 🔑

## Fichiers modifiés

| Fichier | Action |
|---------|--------|
| Migration SQL | **Créer** table `security_answers` + RLS |
| `supabase/functions/set-security/index.ts` | **Créer** — Sauvegarder les choix visuels |
| `supabase/functions/reset-pin/index.ts` | **Modifier** — Vérifier choix visuels + rate-limiting |
| `src/components/tamtam/VisualSecuritySetup.tsx` | **Créer** — Grilles visuelles d'inscription |
| `src/components/tamtam/VisualSecurityCheck.tsx` | **Créer** — Grilles visuelles de récupération |
| `src/pages/tamtam/TamTamPhoneAuth.tsx` | **Modifier** — Intégrer les nouveaux steps |

