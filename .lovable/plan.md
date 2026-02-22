

# TikTok-Style Adaptive Video Feed -- Optimization Plan

## Overview
Replace the current chronological video feed with a high-performance, algorithmically-ranked short-video feed. No spinners, instant content display, and adaptive recommendation based on real-time behavioral signals.

---

## Part 1: Database -- Video Engagement Tracking Table

Create a new `video_engagements` table to capture behavioral signals per user per video:

| Column | Type | Purpose |
|---|---|---|
| id | uuid | Primary key |
| user_id | uuid | Viewer (nullable for anonymous) |
| video_id | uuid | FK to videos |
| watch_duration_ms | integer | How long they watched |
| video_duration_ms | integer | Total video length |
| completed | boolean | Watched to end |
| replayed | boolean | Watched again |
| swipe_speed_ms | integer | How fast they swiped away |
| interaction_type | text | 'view', 'like', 'share', 'comment', 'bookmark' |
| session_id | text | Group interactions per session |
| created_at | timestamptz | Timestamp |

RLS: Users can insert their own engagements, select their own data. Admins can read all.

---

## Part 2: Recommendation Algorithm Hook -- `useAdaptiveFeed`

New hook replacing `useVideoFeed` for the Creation feed. Core logic:

### Scoring Formula (per video)
```text
score = (watch_ratio * 35)
      + (completion_bonus * 25)
      + (replay_bonus * 20)
      + (engagement_bonus * 10)
      + (recency_bonus * 10)
      - (quick_swipe_penalty)
      + (exploration_random)
```

### Signals
- **watch_ratio**: avg(watch_duration / video_duration) across all viewers -- higher = better
- **completion_bonus**: % of viewers who watched to end
- **replay_bonus**: % of viewers who replayed
- **quick_swipe_penalty**: if avg swipe_speed < 2s, penalize
- **engagement_bonus**: likes + shares + comments normalized
- **recency_bonus**: decay over 7 days
- **exploration_random**: 20% of feed slots reserved for random unseen content

### Personalization Layer
- Track categories the user engages with most (from `video_engagements`)
- Boost similar categories when engagement is high
- Mix 80% exploitation (preferred content) + 20% exploration (new/unseen)

### Data Flow
1. Fetch candidate videos (batch of 30) via a single query with pre-computed aggregate scores
2. Client-side re-rank using user's local engagement history (stored in localStorage for speed)
3. Serve in ranked order, lazy-load next batch on scroll

---

## Part 3: Performance Optimizations -- Zero Spinners

### Instant Display Strategy
- Show thumbnail/poster immediately (no waiting for video load)
- Use CSS `background-image` on the container with the thumbnail as fallback
- Video element loads over the thumbnail -- seamless transition via opacity
- Remove ALL spinner/loading indicators -- content is always visible

### Preloading
- Preload next 2 videos' metadata when current video starts playing
- Use `<link rel="preload">` for the next video URL
- Keep previous 1 + current + next 2 in DOM (5 total max)

### Memory
- Destroy video elements outside the render window (already partially done with index +/-2)
- Use `poster` attribute aggressively for instant visual

---

## Part 4: Engagement Tracking in VideoFeedCard

Modify the `VideoFeedCard` component to silently track:
- **Watch time**: `timeupdate` event on video element, record duration watched
- **Completion**: `ended` event
- **Replay**: detect `play` after `ended`
- **Swipe speed**: timestamp when card becomes active vs when it becomes inactive

Batch-send engagements every 5 seconds or on unmount to avoid excessive API calls.

---

## Part 5: Feed Rendering Changes in TamTamSocial

- Replace chronological sort (`created_at DESC`) with algorithm-ranked order
- Remove the spinner at line 928 -- replace with a black screen + thumbnail grid skeleton (or just black)
- Ensure `getCurrentPosts` for 'creation' mode uses the adaptive algorithm output instead of chronological merge

---

## Files to Create/Modify

| File | Action |
|---|---|
| `src/hooks/useAdaptiveFeed.ts` | **Create** -- New recommendation algorithm hook |
| `src/hooks/useEngagementTracker.ts` | **Create** -- Silent behavioral signal collector |
| `src/hooks/useVideoFeed.ts` | **Modify** -- Add scoring/ranking support |
| `src/components/feed/VideoFeedCard.tsx` | **Modify** -- Add engagement tracking, remove spinner, instant thumbnail |
| `src/pages/tamtam/TamTamSocial.tsx` | **Modify** -- Use adaptive feed, remove spinners, preload logic |
| Database migration | **Create** -- `video_engagements` table with RLS |

---

## Technical Notes

- The `video_engagements` table will use `enable realtime` for potential future admin dashboards
- Engagement data is debounced and batched to minimize network calls
- The algorithm runs client-side for instant responsiveness -- no server roundtrip for ranking
- localStorage caches the user's category preferences for offline-first scoring
- Anonymous users get a session-based experience (no personalization persistence)

