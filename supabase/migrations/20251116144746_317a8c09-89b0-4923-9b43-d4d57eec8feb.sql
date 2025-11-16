-- Create user achievements table to track user stats and points
CREATE TABLE public.user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  total_points INTEGER DEFAULT 0,
  phrases_contributed INTEGER DEFAULT 0,
  phrases_validated INTEGER DEFAULT 0,
  translations_made INTEGER DEFAULT 0,
  feedback_given INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create badges table to define available badges
CREATE TABLE public.badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  icon TEXT NOT NULL,
  requirement_type TEXT NOT NULL, -- 'phrases_contributed', 'phrases_validated', 'translations_made', etc.
  requirement_value INTEGER NOT NULL,
  points_reward INTEGER DEFAULT 0,
  tier TEXT NOT NULL, -- 'bronze', 'silver', 'gold', 'platinum'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create user_badges table to track earned badges
CREATE TABLE public.user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  badge_id UUID NOT NULL REFERENCES public.badges(id) ON DELETE CASCADE,
  earned_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, badge_id)
);

-- Enable RLS
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_achievements
CREATE POLICY "Users can view their own achievements"
  ON public.user_achievements FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view all achievements leaderboard"
  ON public.user_achievements FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own achievements"
  ON public.user_achievements FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own achievements"
  ON public.user_achievements FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for badges
CREATE POLICY "Anyone can view badges"
  ON public.badges FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage badges"
  ON public.badges FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for user_badges
CREATE POLICY "Users can view their own badges"
  ON public.user_badges FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view all earned badges"
  ON public.user_badges FOR SELECT
  USING (true);

CREATE POLICY "System can insert badges"
  ON public.user_badges FOR INSERT
  WITH CHECK (true);

-- Create trigger to update updated_at
CREATE TRIGGER update_user_achievements_updated_at
  BEFORE UPDATE ON public.user_achievements
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default badges
INSERT INTO public.badges (name, description, icon, requirement_type, requirement_value, points_reward, tier) VALUES
  ('Premier Pas', 'Contribuez votre première phrase', '🌱', 'phrases_contributed', 1, 10, 'bronze'),
  ('Contributeur Bronze', 'Contribuez 10 phrases', '🥉', 'phrases_contributed', 10, 50, 'bronze'),
  ('Contributeur Argent', 'Contribuez 50 phrases', '🥈', 'phrases_contributed', 50, 200, 'silver'),
  ('Contributeur Or', 'Contribuez 100 phrases', '🥇', 'phrases_contributed', 100, 500, 'gold'),
  ('Maître Contributeur', 'Contribuez 500 phrases', '💎', 'phrases_contributed', 500, 2000, 'platinum'),
  
  ('Validateur Débutant', 'Validez votre première phrase', '✓', 'phrases_validated', 1, 10, 'bronze'),
  ('Validateur Bronze', 'Validez 25 phrases', '🥉', 'phrases_validated', 25, 75, 'bronze'),
  ('Validateur Argent', 'Validez 100 phrases', '🥈', 'phrases_validated', 100, 300, 'silver'),
  ('Validateur Or', 'Validez 250 phrases', '🥇', 'phrases_validated', 250, 750, 'gold'),
  ('Expert Validateur', 'Validez 1000 phrases', '💎', 'phrases_validated', 1000, 3000, 'platinum'),
  
  ('Traducteur Novice', 'Effectuez votre première traduction', '🔄', 'translations_made', 1, 5, 'bronze'),
  ('Traducteur Bronze', 'Effectuez 50 traductions', '🥉', 'translations_made', 50, 100, 'bronze'),
  ('Traducteur Argent', 'Effectuez 200 traductions', '🥈', 'translations_made', 200, 400, 'silver'),
  ('Traducteur Or', 'Effectuez 500 traductions', '🥇', 'translations_made', 500, 1000, 'gold'),
  
  ('Retour Précieux', 'Donnez votre premier feedback', '💬', 'feedback_given', 1, 5, 'bronze'),
  ('Critique Bronze', 'Donnez 10 feedbacks', '🥉', 'feedback_given', 10, 50, 'bronze'),
  ('Critique Argent', 'Donnez 50 feedbacks', '🥈', 'feedback_given', 50, 200, 'silver'),
  ('Critique Or', 'Donnez 100 feedbacks', '🥇', 'feedback_given', 100, 500, 'gold');

-- Create function to calculate level from points
CREATE OR REPLACE FUNCTION public.calculate_level(points INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Level 1: 0-99 points
  -- Level 2: 100-299 points
  -- Level 3: 300-599 points
  -- Level 4: 600-999 points
  -- Level 5+: 1000+ points (level = points / 200)
  IF points < 100 THEN
    RETURN 1;
  ELSIF points < 300 THEN
    RETURN 2;
  ELSIF points < 600 THEN
    RETURN 3;
  ELSIF points < 1000 THEN
    RETURN 4;
  ELSE
    RETURN 5 + ((points - 1000) / 200);
  END IF;
END;
$$;