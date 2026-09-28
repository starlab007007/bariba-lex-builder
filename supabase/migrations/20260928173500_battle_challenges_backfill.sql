-- Backfill idempotent des défis Sagesse datés après centralisation.
INSERT INTO public.battle_challenges (
  id, challenge_date, prompt_fr, prompt_ba, is_active, created_at
)
SELECT
  br.challenge_id,
  br.challenge_id::date,
  COALESCE(NULLIF(max(br.prompt_francais), ''), 'Défi de sagesse'),
  NULLIF(max(br.prompt_bariba), ''),
  true,
  min(br.created_at)
FROM public.battle_responses br
WHERE br.challenge_id ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
GROUP BY br.challenge_id
ON CONFLICT (id) DO NOTHING;
