-- Deux index uniques identiques (challenge_id, user_id) : on garde idx_battle_responses_challenge_user.
DROP INDEX IF EXISTS public.battle_responses_challenge_user_uidx;
