

## Diagnostic

After thorough analysis of the codebase, database, and live preview, the root cause is clear:

**TamTamSocial.tsx contains TWO different VideoFeedCard components:**
1. An **inline one** (lines 326-629) used for the creation feed - missing ALL recent fixes
2. An **imported one** from `src/components/feed/VideoFeedCard.tsx` - has all photo detection, cross-browser, and display fixes

The creation feed at line 1003 uses the **inline** VideoFeedCard, which:
- Has NO photo vs video detection (only checks `post.media_type === 'photo'` literally)
- Uses `object-cover` (causes zoom effect)
- Missing `crossOrigin="anonymous"` (causes CORS failures in production)
- Missing `webkit-playsinline` and `onCanPlay` (Safari/iOS crash)
- Missing muted autoplay retry fallback
- No `object-contain` with black background
- No `100dvh` / `-webkit-fill-available` height fix

Additionally, the `.webm` videos from the `videos` table (Griot Anime, Conte Vivant) are not playable on Safari/iOS in production.

## Plan

### Step 1: Unify VideoFeedCard usage in TamTamSocial.tsx

Remove the inline VideoFeedCard (lines 326-629) and replace it with the imported external component from `@/components/feed/VideoFeedCard.tsx`. This immediately brings all cross-browser, photo detection, and display fixes to the creation feed.

The imported component already supports:
- Photo vs video detection via MIME type AND file extension regex
- `object-contain` with `#000` background (no zoom)
- `crossOrigin="anonymous"` for production CORS
- `webkit-playsinline`, `onCanPlay`, muted autoplay retry
- Proper `100dvh` height

### Step 2: Add missing props to external VideoFeedCard

The inline version uses `usePostInteractions` and `engagementTracker` which the external one handles differently. Update the external VideoFeedCard to accept optional `engagementTracker` and `onPlayInteractive` props so all creation feed features continue working.

### Step 3: Fix engagement tracking bridge

Wire the external VideoFeedCard's `onEngagement` and `onSwipe` callbacks to the `engagementTracker` instance from TamTamSocial.

### Step 4: Database normalization

Fix existing `tamtam_posts` records that have incorrect `media_type` values by updating photo entries that have image file extensions but are stored as `video`.

### Technical Details

```text
Current flow (broken):
  TamTamSocial.tsx
    └── inline VideoFeedCard (lines 326-629) ← MISSING ALL FIXES
        ├── No photo detection regex
        ├── object-cover (zooms)
        ├── No crossOrigin
        └── No Safari compatibility

Fixed flow:
  TamTamSocial.tsx
    └── imported VideoFeedCard from @/components/feed/VideoFeedCard.tsx
        ├── Photo detection: media_type + regex on URL
        ├── object-contain + black bg
        ├── crossOrigin="anonymous"
        ├── webkit-playsinline + onCanPlay
        └── Muted autoplay retry fallback
```

**Files to modify:**
- `src/pages/tamtam/TamTamSocial.tsx` - Remove inline VideoFeedCard, use imported one, adapt props
- `src/components/feed/VideoFeedCard.tsx` - Add `engagementTracker` and `onPlayInteractive` optional props

**Database fix:**
- Update `tamtam_posts` records with image URLs but wrong `media_type`

