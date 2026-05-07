## Problem

The (+) button shifts when clicked because:
1. Nav items use `motion.button` with `whileTap={{ scale: 0.9 }}` — scaling a flex child changes its layout box, shifting siblings including the center spacer that anchors the (+) button.
2. The active indicator uses `layoutId="kuaishouNavIndicator"` — when the route changes on click, framer-motion runs a layout animation that causes the entire nav to re-measure and reflow.

## Fix — `KuaishouBottomNav.tsx`

1. Replace all `motion.button` nav items with plain `<button>` elements — use CSS `active:scale-95` instead of `whileTap`.
2. Remove `layoutId="kuaishouNavIndicator"` from the active dot — use a static dot (no layout animation).
3. Keep the (+) button exactly as-is (already a plain `<button>` with `absolute left-1/2 -translate-x-1/2`).

This eliminates all framer-motion layout animations from the nav bar, so nothing triggers a reflow that could shift the (+) button.
