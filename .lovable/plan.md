
# Plan: Production Readiness - Video Feed, Profile, Performance & Security

## 1. Fix Video Feed Auto-Play Logic

**Problem**: Videos switch every 10 seconds regardless of duration. Videos loop infinitely (`loop` attribute). No distinction between manual and automatic mode.

**Changes in `src/components/tamtam/TamTamVideoFeed.tsx`**:

- **Remove `loop` attribute** from `<video>` element in VideoCard
- **On `ended` event**: instead of restarting, notify parent to advance to next video
- **Add auto-mode state** in main component: starts as `true`. When user touches/scrolls, switch to `false` (manual mode)
- **Auto-advance**: when a video ends and auto-mode is active, scroll to next video
- **Manual mode**: user scrolls freely, watches/re-watches any video
- **Add "Actualiser" (refresh/shuffle) button**: randomizes the video order (random sort on current feed data)
- Remove the current `handleEnded` that restarts the video at `currentTime = 0`

## 2. Fix Public Profile Scroll Bug

**Problem**: `TamTamPublicProfile.tsx` uses `min-h-screen pb-24` but the content may be clipped. The page structure doesn't allow full scrolling.

**Changes in `src/pages/tamtam/TamTamPublicProfile.tsx`**:

- Wrap the page in a proper scrollable container: `h-[100dvh] overflow-y-auto` (per project memory on responsive viewport)
- Ensure `pb-24` or more padding at the bottom so all posts and info are reachable
- The posts grid section needs sufficient min-height removed or adjusted so natural content flows

## 3. Performance Optimization

- **Video Feed**: reduce DOM by only rendering current + adjacent videos (virtualization window of 3)
- **Lazy load images** in profile grids (already using `loading="lazy"` in some places, verify consistency)
- **Memoize** heavy components with `React.memo`
- **useVideoFeed**: already paginated at 15, which is good

## 4. Security Audit

- Run the built-in security scan tool
- Review RLS policies on all tables
- Check for exposed sensitive data
- Fix any findings

## 5. APK Production Readiness Check

- Verify `capacitor.config.ts` has production settings (no dev server URL)
- Verify Android permissions are correct
- Confirm edge functions are deployed and working

---

### Technical Details

**Video Feed auto-play mechanism**:
```
- Add `onVideoEnded` callback from VideoCard to parent
- Parent tracks `autoMode` state (default: true)
- On scroll/touch events on container: set autoMode = false
- On video ended + autoMode: programmatically scroll to next snap point
- Shuffle button: randomize videoData array, reset to index 0
```

**Profile scroll fix**:
```
- Root div: h-[100dvh] flex flex-col
- Content area: flex-1 overflow-y-auto
- Sticky header stays at top
- Bottom padding ensures last content is reachable
```

**Virtualized video rendering**:
```
- Only render VideoCard for indices: [currentIndex-1, currentIndex, currentIndex+1]
- Other slots render empty placeholder divs with same height
- Reduces DOM nodes and video elements significantly
```
