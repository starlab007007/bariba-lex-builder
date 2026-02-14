

# Aligner le style du Dictionnaire sur le module Apprendre

## Objectif
Remplacer le theme sombre (kuaishou-bg, dark glassmorphism) du module Dictionnaire par le theme clair pastel du module Apprendre (fond gradient indigo-50/purple-50/pink-50, textes gris fonces, cartes blanches).

## Changements prevus

### 1. TamTamDictionary.tsx - Page principale
- Remplacer le `KuaishouLayout` (fond noir) par un layout autonome avec `bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50`
- Header: fond blanc avec ombre, texte gris-800 (comme FitilaLearn)
- Boutons mode/vocal: remplacer `kuaishou-btn-primary/secondary` par des boutons blancs avec gradients colores (style Apprendre)
- Carte de recherche: remplacer `kuaishou-card` par `bg-white rounded-3xl shadow-md`
- Textes: remplacer `text-white`, `text-tamtam-text-muted` par `text-gray-800`, `text-gray-500`
- Badge compteur de mots: fond blanc/gris clair au lieu de `bg-white/10`
- Historique: `bg-white` au lieu de `bg-tamtam-surface`

### 2. VocalDictionaryResult.tsx - Carte de resultat
- Conteneur principal: remplacer `bg-tamtam-surface` par `bg-white rounded-3xl shadow-lg`
- Fond definition: garder les couleurs pastel existantes (blue-50, amber-50) - deja compatibles
- Bouton audio: remplacer les references `bg-tamtam-bg`, `text-tamtam-text-muted` par `bg-gray-100`, `text-gray-500`
- Bouton "Ecouter tout": garder le gradient orange (coherent avec les deux themes)

### 3. BaribaKeyboardInput.tsx - Champ de recherche
- Input: fond blanc avec bordure grise, texte gris-800
- Suggestions: fond blanc, hover gris-50
- Caracteres speciaux: boutons gris-100 au lieu de fond sombre
- Adapter les couleurs de texte et bordures

### 4. NewWordSubmission.tsx - Formulaire de soumission
- Adapter le bouton et le formulaire au style clair (bg-white, texte gris)

### 5. KuaishouHeader - Remplacement
- Ne plus utiliser le header sombre KuaishouHeader
- Implementer un header local style Apprendre: fond transparent, bouton retour blanc avec ombre, titre gris-800

---

## Details techniques

**Fichiers modifies :**
- `src/pages/tamtam/TamTamDictionary.tsx` - Layout complet, suppression de KuaishouLayout
- `src/components/tamtam/VocalDictionaryResult.tsx` - Couleurs des cartes et boutons
- `src/components/tamtam/BaribaKeyboardInput.tsx` - Input et suggestions en mode clair
- `src/components/tamtam/NewWordSubmission.tsx` - Boutons et formulaire en mode clair

**Palette cible (identique a FitilaLearn) :**
- Fond page: `bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50`
- Cartes: `bg-white rounded-3xl shadow-md` ou `shadow-lg`
- Texte principal: `text-gray-800`
- Texte secondaire: `text-gray-500`
- Bouton retour: `bg-white shadow-md rounded-full`
- Boutons actifs: gradients colores (orange, bleu-violet)
- Inputs: `bg-white border border-gray-200 text-gray-800`

