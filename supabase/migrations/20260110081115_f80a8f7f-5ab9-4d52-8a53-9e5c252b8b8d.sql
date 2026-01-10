-- Fix RLS policy for tamtam_posts to allow users to see their own private posts
DROP POLICY IF EXISTS "Public posts are viewable by everyone" ON tamtam_posts;

CREATE POLICY "Users can view public posts or own posts"
ON tamtam_posts FOR SELECT
USING (
  is_public = true 
  OR auth.uid() = user_id
);

-- Also ensure users can update their own posts
DROP POLICY IF EXISTS "Users can update own posts" ON tamtam_posts;
CREATE POLICY "Users can update own posts"
ON tamtam_posts FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Ensure users can delete their own posts
DROP POLICY IF EXISTS "Users can delete own posts" ON tamtam_posts;
CREATE POLICY "Users can delete own posts"
ON tamtam_posts FOR DELETE
USING (auth.uid() = user_id);