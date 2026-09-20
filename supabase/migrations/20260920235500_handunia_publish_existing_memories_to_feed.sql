update public.handunia_fragments
set
  sealed_at = coalesce(sealed_at, created_at),
  synchronized_at = coalesce(synchronized_at, created_at),
  scope_level = coalesce(nullif(btrim(scope_level), ''), 'community'),
  memory_state = coalesce(nullif(btrim(memory_state), ''), 'sealed'),
  review_status = case
    when review_status is null
      or btrim(review_status) = ''
      or review_status = 'unreviewed'
      then 'user_validated'
    else review_status
  end
where sealed_at is null
   or synchronized_at is null
   or scope_level is null
   or btrim(scope_level) = ''
   or memory_state is null
   or btrim(memory_state) = ''
   or review_status is null
   or btrim(review_status) = ''
   or review_status = 'unreviewed';
