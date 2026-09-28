// Point d'entrée web du module Apprendre (route `/fitila/learn`).
//
// Bascule vers le moteur porté fidèlement depuis
// fitila_flutter (branche feat/apprendre-v2.4-build19-20260927) :
// contenu (1847 mots, 10 fondations, 44 scènes) chargé depuis Supabase
// avec repli JSON embarqué, moteur de tâches à 7 types, révision Leitner,
// scènes de vie interactives et comparaison vocale par contour de hauteur —
// voir `src/components/apprendre/ApHubScreen.tsx` et `src/lib/apprendre/`.
//
// Remplace l'ancien tableau de bord (thèmes/exercices/fondations écrits à la
// main dans `src/data/learningExercises.ts` etc.), désormais inutilisé mais
// laissé en place sans suppression (aucune autre page n'en dépend).

import { useNavigate } from 'react-router-dom';
import ApHubScreen from '@/components/apprendre/ApHubScreen';

export default function FitilaLearn() {
  const navigate = useNavigate();

  return (
    <ApHubScreen
      onBack={() => navigate('/fitila')}
      onOpenVoiceStudio={() => navigate('/fitila/voice-lab')}
    />
  );
}
