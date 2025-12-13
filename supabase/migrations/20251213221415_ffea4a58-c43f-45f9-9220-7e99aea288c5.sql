-- Fix RLS policy for tamtam_posts - need WITH CHECK for INSERT
DROP POLICY IF EXISTS "Users can manage own posts" ON public.tamtam_posts;

-- Create separate policies for better control
CREATE POLICY "Users can insert own posts" 
ON public.tamtam_posts 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own posts" 
ON public.tamtam_posts 
FOR UPDATE 
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own posts" 
ON public.tamtam_posts 
FOR DELETE 
TO authenticated
USING (auth.uid() = user_id);