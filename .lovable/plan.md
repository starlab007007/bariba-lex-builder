

# Comprehensive Security Audit -- Remediation Plan

This plan addresses **26 security findings** across 7 categories: RLS policies, storage buckets, edge functions, API keys, input validation, rate limiting, and security headers.

---

## 1. RLS Policy Fixes (CRITICAL -- 10 policies to fix)

### 1A. tamtam_notifications -- Missing user_id ownership check
**Risk**: Any authenticated user can read/update/delete ANY user's notifications.
- DROP existing SELECT/UPDATE/DELETE policies
- Recreate with `auth.uid() = user_id` instead of `auth.uid() IS NOT NULL`

### 1B. tamtam_bookmarks -- Missing user_id ownership check
**Risk**: Any authenticated user can view/add/delete bookmarks for others.
- DROP all 3 policies (SELECT/INSERT/DELETE)
- Recreate with `auth.uid() = user_id`

### 1C. tamtam_shares -- Delete allows any user
**Risk**: Any authenticated user can delete other users' shares.
- DROP DELETE policy
- Recreate with `auth.uid() = user_id`
- Also fix INSERT to check `auth.uid() = user_id`

### 1D. tamtam_follows -- Missing follower_id ownership check
**Risk**: Users can create fake follows or unfollow on behalf of others.
- DROP INSERT and DELETE policies
- Recreate INSERT with `auth.uid() = follower_id`
- Recreate DELETE with `auth.uid() = follower_id`

### 1E. tamtam_friendships -- No ownership checks at all
**Risk**: Users can create/accept/delete friendships for anyone.
- DROP INSERT/UPDATE/DELETE policies
- INSERT: `auth.uid() = requester_id`
- UPDATE: `auth.uid() = requester_id OR auth.uid() = addressee_id`
- DELETE: `auth.uid() = requester_id OR auth.uid() = addressee_id`

### 1F. tamtam_group_members -- Any user can join/leave/update
**Risk**: Users can add themselves to private groups, remove others.
- DROP INSERT/UPDATE/DELETE policies
- INSERT: `auth.uid() = user_id`
- DELETE: `auth.uid() = user_id` (leave own membership)
- UPDATE: restricted to group owner via subquery

### 1G. tamtam_group_posts -- Any user can edit/delete any post
**Risk**: Users can modify or delete posts they did not create.
- DROP UPDATE/DELETE policies
- Recreate with `auth.uid() = user_id`

### 1H. tamtam_live_viewers -- Any user can manipulate viewer records
- DROP ALL policy
- Replace with INSERT (`auth.uid() = user_id`) and DELETE (`auth.uid() = user_id`)

### 1I. tamtam_story_views -- Forged views
- DROP INSERT policy
- Recreate with `auth.uid() = viewer_id`

### 1J. tamtam_profiles -- Phone number publicly exposed
**Risk**: Phone numbers are exposed to everyone via `SELECT true` policy.
- DROP the `Public profiles are viewable by everyone` policy
- Create a new SELECT policy that exposes only safe columns via a database VIEW or restricts phone_number visibility to the profile owner
- Approach: Create a `public_profiles` view excluding `phone_number`, or use a security definer function

---

## 2. Overly Permissive Write Policies (WARN -- 4 policies)

### 2A. translation_memory -- `WITH CHECK (true)` on INSERT/UPDATE
- Restrict INSERT/UPDATE to authenticated users or service role only

### 2B. smt_initialization_logs -- `WITH CHECK (true)` on INSERT
- Restrict to admin role

### 2C. user_badges -- `WITH CHECK (true)` on INSERT
- Restrict to system/admin only

### 2D. translation_history -- `WITH CHECK (true)` on INSERT
- Restrict to `auth.uid() = user_id OR user_id IS NULL` (for anonymous usage)

---

## 3. Edge Functions Security (HIGH)

### 3A. No rate limiting on AI-powered functions
**Risk**: 28 out of 33 edge functions have `verify_jwt = false`, meaning they can be called by anyone without authentication. Functions that call external AI APIs (Lovable AI, HuggingFace) cost money per call.

**Functions at highest risk** (AI-powered, no auth):
- `smart-assistant` -- Full AI chatbot, no auth
- `generate-content` -- AI content generation, no auth
- `raconte-moi` -- AI voice assistant, no auth
- `generate-anime-story` -- AI story generation, no auth
- `generate-image-animation` -- AI image generation, no auth
- `agri-advisor` -- AI agriculture advisor, no auth
- `ocr-translate` -- AI OCR + translation, no auth
- `video-enhance` -- Video processing, no auth
- `transcribe-audio` -- Audio transcription, no auth

**Fix**: Add rate limiting to all AI-powered edge functions using an in-memory counter or database-backed rate limit. Add optional auth check to track usage per user.

### 3B. CORS set to `*` on all functions
- All edge functions use `Access-Control-Allow-Origin: *` 
- This allows any website to call your backend functions
- Consider restricting to your app's domain

---

## 4. Storage Bucket Security (MEDIUM)

### 4A. Several upload policies missing user folder scoping
- `tamtam-audio`: INSERT policy allows any authenticated user to upload without folder scoping. UPDATE and DELETE policies also lack user scoping (`auth.uid() IS NOT NULL` only)
- `tamtam-media`: INSERT allows any authenticated upload
- `envato-assets`: DELETE allows any authenticated user to delete any file

**Fix**: Add `(auth.uid())::text = (storage.foldername(name))[1]` to INSERT/UPDATE/DELETE policies so users can only manage their own files.

### 4B. All 7 buckets are public
- While public READ is acceptable for media content, `envato-assets` and `template-assets` may contain premium content that should be restricted.

---

## 5. API Keys and Secrets (LOW)

### 5A. No hardcoded secrets found in frontend code
- The only key used in frontend is `VITE_SUPABASE_PUBLISHABLE_KEY` (the anon key) which is safe
- Service role keys are only used in edge functions -- correct pattern

### 5B. Leaked Password Protection disabled
- Enable leaked password protection in auth settings to prevent users from using compromised passwords

---

## 6. Input Validation (MEDIUM)

### 6A. dangerouslySetInnerHTML usage
- Found in `src/components/ui/chart.tsx` -- this is a shadcn/ui component generating CSS from a fixed theme config, NOT user input. **Low risk, acceptable.**

### 6B. Edge functions accept user input without validation
- Most edge functions parse `req.json()` directly without schema validation
- Add input length limits and type checking in edge functions

---

## 7. Security Headers (MEDIUM)

### 7A. No security headers configured
The `nginx.conf` is missing:
- `Content-Security-Policy` header
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy` for camera, microphone, geolocation

**Fix**: Add security headers to `nginx.conf`.

---

## Implementation Priority

1. **CRITICAL (do first)**: Fix RLS policies (1A-1J) -- data exposure and manipulation
2. **HIGH**: Add rate limiting to AI edge functions (3A) -- financial risk
3. **MEDIUM**: Fix storage upload policies (4A), add security headers (7A)
4. **LOW**: Restrict CORS (3B), enable leaked password protection (5B), input validation (6B)

---

## Technical Details -- SQL Migrations

The implementation will involve:
- ~20 `DROP POLICY` + `CREATE POLICY` statements for RLS fixes
- 1 new database function or view for profile phone_number protection
- Security headers added to `nginx.conf`
- Rate limiting logic added to critical edge functions (using a simple IP-based counter pattern)

Total estimated changes: ~15 files (SQL migrations + edge function updates + nginx config)

