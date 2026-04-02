
-- smt_initialization_logs: system logs, restrict to service_role
DROP POLICY IF EXISTS "Allow authenticated users to insert logs" ON public.smt_initialization_logs;
CREATE POLICY "Service role can insert logs"
ON public.smt_initialization_logs
FOR INSERT TO service_role
WITH CHECK (true);

-- translation_history: users insert their own history
DROP POLICY IF EXISTS "Anyone can insert translation history" ON public.translation_history;
CREATE POLICY "Users can insert own translation history"
ON public.translation_history
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

-- translation_memory: system cache, restrict to service_role
DROP POLICY IF EXISTS "System can insert into translation cache" ON public.translation_memory;
DROP POLICY IF EXISTS "System can update translation cache" ON public.translation_memory;

CREATE POLICY "Service role can insert translation cache"
ON public.translation_memory
FOR INSERT TO service_role
WITH CHECK (true);

CREATE POLICY "Service role can update translation cache"
ON public.translation_memory
FOR UPDATE TO service_role
USING (true);

-- user_badges: system awards badges, restrict to service_role
DROP POLICY IF EXISTS "System can insert badges" ON public.user_badges;
CREATE POLICY "Service role can insert badges"
ON public.user_badges
FOR INSERT TO service_role
WITH CHECK (true);

-- video_engagements: users insert their own engagements
DROP POLICY IF EXISTS "Anyone can insert engagements" ON public.video_engagements;
CREATE POLICY "Users can insert own engagements"
ON public.video_engagements
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);
