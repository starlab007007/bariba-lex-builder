import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ContributionData {
  totalPoints: number;
  level: string;
  submissionCount: number;
  isLoading: boolean;
}

const LEVELS = [
  { min: 0, label: 'Débutant', labelBa: 'Debutɔm', emoji: '🌱' },
  { min: 50, label: 'Contributeur', labelBa: 'Ìràn tɔm', emoji: '⭐' },
  { min: 200, label: 'Expert', labelBa: 'Deburu tɔm', emoji: '🏆' },
  { min: 500, label: 'Maître du dictionnaire', labelBa: 'Gbɛ́sɔ́ɔ̀rù sunɔ', emoji: '👑' },
];

export function getLevel(points: number) {
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (points >= LEVELS[i].min) return LEVELS[i];
  }
  return LEVELS[0];
}

export function useContributionPoints(): ContributionData {
  const [totalPoints, setTotalPoints] = useState(0);
  const [submissionCount, setSubmissionCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchPoints = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('user_contributions')
        .select('points, action_type')
        .eq('user_id', user.id);

      if (!error && data) {
        const total = data.reduce((sum, row) => sum + (row.points || 0), 0);
        const submissions = data.filter(r => r.action_type === 'word_submission').length;
        setTotalPoints(total);
        setSubmissionCount(submissions);
      }
      setIsLoading(false);
    };

    fetchPoints();
  }, []);

  const levelData = getLevel(totalPoints);

  return {
    totalPoints,
    level: levelData.label,
    submissionCount,
    isLoading,
  };
}
