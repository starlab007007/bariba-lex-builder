

## Diagnostic Summary

After thorough analysis, I identified 5 distinct issues:

### Issue 1: Black borders/letterboxing on media
`VideoFeedCard.tsx` uses `backgroundColor: '#000'` on all media elements (lines 277, 300, 308) and on the container (line 239). This creates visible black bars around photos/videos that don't fill the screen. The user wants transparent background so the content blends with the feed background.

### Issue 2: Follow button is cosmetic only (no database persistence)
In `VideoFeedCard.tsx` lines 215-218, `handleFollow` only toggles local React state. It never calls Supabase to insert/delete from `tamtam_follows`. The follow action is lost on scroll/refresh.

### Issue 3: Double `@@` in usernames
Two `@` symbols are being added:
1. In `useAdaptiveFeed.ts` line 228: `@${v.tamtam_profiles.username}` — already adds `@`
2. In `VideoFeedCard.tsx` line 73: `@${post.profile.username}` — adds a second `@`

Result: `@@songbian` instead of `@songbian`. This affects all videos from the `videos` table.

### Issue 4: Profile navigation works but needs verification
The route `/fitila/profile/:userId` exists in `App.tsx` line 117 and maps to `TamTamPublicProfile`. The `handleProfileClick` in `VideoFeedCard.tsx` line 197 navigates to `/fitila/profile/${authorId}`. However, `authorId` on line 79 uses `post.profile?.user_id` which is NOT set in the `videosAsVideoCards` mapping (line 611-615 of TamTamSocial.tsx) — it only has `display_name`, `username`, `avatar_url` but NO `user_id`. So clicking profile on videos-table content does nothing.

### Issue 5: Feed loading performance
Already optimized with virtualization and dedup sort. No additional changes needed beyond the fixes above.

---

## Plan

### Step 1: Remove black letterboxing — use transparent background
In `VideoFeedCard.tsx`:
- Change container `backgroundColor: '#000'` to `transparent` (line 239)
- Change `style={{ backgroundColor: '#000' }}` on `<img>` and `<video>` to `transparent` (lines 277, 300, 308)
- Keep `object-contain` to preserve original aspect ratio without cropping

### Step 2: Make Follow button actually persist to database
In `VideoFeedCard.tsx`:
- Import `supabase` from the client
- Import `useAuth` from AuthContext
- Update `handleFollow` to call `supabase.from('tamtam_follows').insert(...)` or `.delete(...)` based on current state
- Add a check on mount/activation to see if the current user already follows this author
- Show toast for unauthenticated users

### Step 3: Fix double `@@` username
Two options — fix at ONE location only:
- In `VideoFeedCard.tsx` line 72-74: Strip leading `@` before adding one:
  ```
  const rawUsername = post.profile?.username || post.author?.username || 'fitila_user';
  const authorUsername = `@${rawUsername.replace(/^@+/, '')}`;
  ```
This handles both cases (username with or without `@` prefix).

### Step 4: Fix profile navigation for videos-table content
In `TamTamSocial.tsx` line 611-615, add `user_id` to the mapped profile:
```
profile: {
  display_name: v.author.name,
  username: v.author.username,
  avatar_url: v.author.avatarUrl,
  user_id: v.userId,  // ADD THIS
},
```
Also ensure `useAdaptiveFeed.ts` exposes `userId` in the FeedVideo interface from `v.user_id`.

### Step 5: Verify and fix AudioFeedCard profile navigation
Confirm `AudioFeedCard` also has `authorId` properly resolved for profile clicks.

### Files to modify:
1. **`src/components/feed/VideoFeedCard.tsx`** — transparent bg, real follow, fix `@@`, auth guard
2. **`src/pages/tamtam/TamTamSocial.tsx`** — add `user_id` to videosAsVideoCards mapping
3. **`src/hooks/useAdaptiveFeed.ts`** — expose `userId` field in FeedVideo interface

### Technical Details

```text
Username fix flow:
  useAdaptiveFeed.ts:  username = "@songbian"  (already prefixed)
  TamTamSocial.tsx:    profile.username = "@songbian"  (passed through)
  VideoFeedCard.tsx:   `@${profile.username}` = "@@songbian"  ← BUG

Fix in VideoFeedCard.tsx:
  rawUsername.replace(/^@+/, '') → "songbian"
  `@${cleaned}` → "@songbian"  ✅

Follow persistence flow (new):
  User taps + → handleFollow()
    → check auth (toast if not logged in)
    → supabase.from('tamtam_follows').insert({ follower_id: user.id, following_id: authorId })
    → setIsFollowing(true)
    → create notification

Profile click fix:
  videosAsVideoCards missing user_id in profile object
  → authorId resolves to undefined → navigate('/fitila/profile/undefined') → broken
  Fix: add user_id from video record
```

