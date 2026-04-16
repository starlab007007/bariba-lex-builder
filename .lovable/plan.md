

# Plan : Reconnaissance manuscrite intelligente avec suggestions dans BaribaSmartTextarea

## Objectif

Quand l'utilisateur dessine sur le canvas d'ecriture manuscrite, le systeme doit automatiquement :
1. Capturer le dessin et l'envoyer a Gemini Flash pour reconnaissance
2. Afficher des suggestions de caracteres/lettres/mots similaires sous le canvas
3. Permettre la selection d'une suggestion pour l'inserer dans le champ texte
4. Enchainer avec des suggestions predictives de mots du dictionnaire Bariba

## Approche technique

### 1. Edge function `recognize-handwriting`

Nouvelle edge function qui recoit l'image du canvas en base64 et utilise Lovable AI (Gemini Flash) avec un prompt specifique pour reconnaitre les caracteres Bariba ecrits a la main. Retourne une liste de caracteres/mots candidats classes par confiance.

Prompt systeme :
```
Tu es un systeme de reconnaissance d'ecriture manuscrite specialise dans l'alphabet Bariba/Baatonum.
Analyse l'image et identifie les caracteres ecrits. L'alphabet Bariba inclut : a b d e g i k m n o r s u w y ɔ ɛ ŋ et les versions avec tons/nasalisation.
Retourne les 5 meilleures interpretations possibles, du plus probable au moins probable.
```

### 2. Mise a jour de BaribaSmartTextarea

- **Debounce automatique** : 800ms apres que l'utilisateur arrete de dessiner, capturer le canvas en PNG base64 et appeler l'edge function
- **Zone de suggestions manuscrites** : afficher les resultats (caracteres et mots) entre le canvas et les boutons rapides, sous forme de chips cliquables avec animation
- **Chaine intelligente** : quand un caractere est selectionne, il s'ajoute au texte, le canvas se vide, et le systeme affiche des suggestions predictives de mots commencant par ce caractere (via `getSuggestions`)
- **Indicateur de chargement** : spinner discret pendant la reconnaissance
- **Fonctionnement sans reseau** : si l'appel echoue, les boutons de caracteres rapides restent disponibles comme fallback

### 3. Flux utilisateur

```text
Dessiner sur canvas
       |
   (800ms pause)
       |
  Envoi a Gemini Flash
       |
  Suggestions: [a] [ã] [à] [ara] [amu]
       |
  Clic sur [ã] → insere "ã" dans textarea
       |
  Canvas efface automatiquement
       |
  Suggestions predictives: [ãna] [ãnɔ] [ãmu]
       |
  Continuer a ecrire ou selectionner
```

## Fichiers modifies

| Action | Fichier |
|--------|---------|
| Creer | `supabase/functions/recognize-handwriting/index.ts` — appel Gemini Flash avec image |
| Modifier | `src/components/classe/BaribaSmartTextarea.tsx` — reconnaissance auto + suggestions manuscrites |

## Contraintes

- Utilise Lovable AI (Gemini Flash) via LOVABLE_API_KEY deja disponible
- Mobile-first : debounce adapte au tactile
- Fallback si hors ligne : boutons de caracteres rapides toujours visibles
- Style coherent : chips violets pour les suggestions manuscrites

