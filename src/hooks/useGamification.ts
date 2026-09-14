import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { TablesUpdate } from '@/integrations/supabase/types';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface Achievement {
  id: string;
  user_id: string;
  total_points: number;
  phrases_contributed: number;
  phrases_validated: number;
  translations_made: number;
  feedback_given: number;
  level: number;
}

interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  requirement_type: string;
  requirement_value: number;
  points_reward: number;
  tier: string;
}

interface UserBadge {
  id: string;
  badge_id: string;
  earned_at: string;
  badges: Badge;
}

export const useGamification = () => {
  const [achievement, setAchievement] = useState<Achievement | null>(null);
  const [userBadges, setUserBadges] = useState<UserBadge[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchAchievement();
      fetchUserBadges();
    }
  }, [user]);

  const fetchAchievement = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('user_achievements')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (!data) {
        // Create initial achievement record
        const { data: newData, error: insertError } = await supabase
          .from('user_achievements')
          .insert([{ user_id: user.id }])
          .select()
          .single();

        if (insertError) throw insertError;
        setAchievement(newData);
      } else {
        setAchievement(data);
      }
    } catch (error) {
      console.error('Error fetching achievement:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserBadges = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_badges')
        .select('*, badges(*)')
        .eq('user_id', user.id)
        .order('earned_at', { ascending: false });

      if (error) throw error;
      setUserBadges(data || []);
    } catch (error) {
      console.error('Error fetching user badges:', error);
    }
  };

  const checkAndAwardBadges = async (achievementData: Achievement) => {
    if (!user) return;

    try {
      // Fetch all badges
      const { data: allBadges, error: badgesError } = await supabase
        .from('badges')
        .select('*');

      if (badgesError) throw badgesError;

      // Check which badges should be earned
      const earnedBadgeIds = userBadges.map(ub => ub.badge_id);
      const newBadges: Badge[] = [];

      for (const badge of allBadges || []) {
        if (earnedBadgeIds.includes(badge.id)) continue;

        const currentValue = achievementData[badge.requirement_type as keyof Achievement] as number;
        if (currentValue >= badge.requirement_value) {
          newBadges.push(badge);
        }
      }

      // Award new badges
      for (const badge of newBadges) {
        const { error } = await supabase
          .from('user_badges')
          .insert([{ user_id: user.id, badge_id: badge.id }]);

        if (!error) {
          toast({
            title: "🎉 Nouveau Badge Débloqué!",
            description: `${badge.icon} ${badge.name} - ${badge.description}`,
            duration: 5000,
          });
        }
      }

      if (newBadges.length > 0) {
        fetchUserBadges();
      }
    } catch (error) {
      console.error('Error checking badges:', error);
    }
  };

  const updateAchievement = async (type: 'phrases_contributed' | 'phrases_validated' | 'translations_made' | 'feedback_given', increment: number = 1) => {
    if (!user || !achievement) return;

    try {
      const newValue = achievement[type] + increment;
      const pointsMap = {
        phrases_contributed: 5,
        phrases_validated: 3,
        translations_made: 2,
        feedback_given: 1,
      };
      const newPoints = achievement.total_points + (pointsMap[type] * increment);

      // Calculate new level
      const { data: levelData } = await supabase.rpc('calculate_level', { points: newPoints });
      const newLevel = levelData || 1;

      const updates: TablesUpdate<'user_achievements'> = { total_points: newPoints, level: newLevel };
      updates[type] = newValue;
      const { data, error } = await supabase
        .from('user_achievements')
        .update(updates)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;

      setAchievement(data);
      
      // Check for new badges
      await checkAndAwardBadges(data);

      // Show level up notification
      if (newLevel > achievement.level) {
        toast({
          title: "⭐ Niveau Supérieur!",
          description: `Vous êtes maintenant niveau ${newLevel}!`,
          duration: 4000,
        });
      }
    } catch (error) {
      console.error('Error updating achievement:', error);
    }
  };

  return {
    achievement,
    userBadges,
    loading,
    updateAchievement,
    refreshAchievement: fetchAchievement,
    refreshBadges: fetchUserBadges,
  };
};
