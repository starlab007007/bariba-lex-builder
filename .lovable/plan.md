
# Adaptation des couleurs de la page Traducteur

## Objectif

Passer la page `/fitila/translator` d'un theme sombre (fond noir, texte blanc) a un theme clair correspondant a la capture jointe, sans modifier la structure ni les fonctionnalites.

## Changements de couleurs

Le fichier concerne est uniquement `src/pages/tamtam/TamTamTranslator.tsx`.

### Correspondances de couleurs

```text
ACTUEL (sombre)                    CIBLE (clair)
--------------------------------------------
kuaishou-bg (fond page)         -> bg-gray-50 / bg-background
text-white                      -> text-gray-900
text-white/60                   -> text-gray-500
text-white/40                   -> text-gray-400
text-white/50                   -> text-gray-400
bg-white/5, bg-white/10         -> bg-white, bg-gray-100
border-white/10                 -> border-gray-200
bg-[#14141C]/95 (barre input)   -> bg-white/95 border-gray-200
kuaishou-card                   -> bg-white border-gray-200
bg-orange-500/20                -> bg-orange-50
text-orange-300                 -> text-orange-600
bg-blue-500/20                  -> bg-blue-50
text-blue-300                   -> text-blue-600
bg-green-500/20                 -> bg-green-50
text-green-400                  -> text-green-600
bg-purple-500/20                -> bg-purple-50
text-purple-400                 -> text-purple-600
placeholder:text-white/40       -> placeholder:text-gray-400
bg-white/10 hover states        -> bg-gray-100 hover states
```

### Zones impactees dans le fichier

1. **LanguageBadge** (ligne ~244) : badges langue avec fond et texte
2. **HistoryPanel** (ligne ~258) : panneau lateral historique (fond, bordures, texte)
3. **HistoryCard** (ligne ~334) : cartes historique
4. **Sub-header** (ligne ~385) : barre langues et toggles
5. **Zone chat / messages** (ligne ~452) : messages, bulles, welcome
6. **Processing indicator** (ligne ~569) : indicateur de chargement
7. **Input Area** (ligne ~619) : barre de saisie en bas (fond, textarea, boutons de mode)

### Details techniques

- Remplacer toutes les classes `text-white` par `text-gray-900` (texte principal) ou `text-gray-500` (texte secondaire)
- Remplacer `border-white/10` par `border-gray-200`
- Remplacer `bg-white/5` et `bg-white/10` par `bg-white` ou `bg-gray-100`
- Remplacer `bg-[#14141C]/95` par `bg-white/95`
- Remplacer les classes `kuaishou-bg`, `kuaishou-card`, `kuaishou-header` par des classes Tailwind claires equivalentes
- Conserver les couleurs d'accent orange (boutons primaires, gradients) telles quelles
- Ajuster les etats hover pour un contexte clair (`hover:bg-gray-100` au lieu de `hover:bg-white/10`)
