import React from 'react';
import { useCurrentFrame, interpolate, spring, useVideoConfig } from 'remotion';

export interface CursorWaypoint { frame: number; x: number; y: number; tap?: boolean }

export const AnimatedCursor: React.FC<{ waypoints: CursorWaypoint[]; show?: [number, number] }> = ({ waypoints, show }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // find segment
  let x = waypoints[0].x;
  let y = waypoints[0].y;
  for (let i = 0; i < waypoints.length - 1; i++) {
    const a = waypoints[i];
    const b = waypoints[i + 1];
    if (frame >= a.frame && frame <= b.frame) {
      const t = (frame - a.frame) / (b.frame - a.frame);
      const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      x = a.x + (b.x - a.x) * eased;
      y = a.y + (b.y - a.y) * eased;
      break;
    } else if (frame > b.frame) {
      x = b.x; y = b.y;
    }
  }

  // tap pulse at each tap waypoint
  let ripple = 0;
  let rippleX = x, rippleY = y;
  for (const w of waypoints) {
    if (w.tap && frame >= w.frame && frame < w.frame + 20) {
      const t = (frame - w.frame) / 20;
      ripple = 1 - t;
      rippleX = w.x; rippleY = w.y;
    }
  }

  const visible = show ? (frame >= show[0] && frame <= show[1]) : true;
  const opacity = visible ? interpolate(frame, [show?.[0] ?? 0, (show?.[0] ?? 0) + 8], [0, 1], { extrapolateRight: 'clamp' }) : 0;

  return (
    <>
      {ripple > 0 && (
        <div style={{
          position: 'absolute', left: rippleX, top: rippleY,
          width: 120, height: 120, marginLeft: -60, marginTop: -60,
          borderRadius: '50%', border: '4px solid rgba(255,255,255,0.9)',
          background: 'rgba(255,255,255,0.2)',
          transform: `scale(${1 + (1 - ripple) * 1.5})`, opacity: ripple, zIndex: 100,
        }} />
      )}
      <div style={{
        position: 'absolute', left: x, top: y,
        width: 56, height: 56, marginLeft: -28, marginTop: -28,
        borderRadius: '50%', background: 'rgba(0,0,0,0.35)',
        border: '3px solid rgba(255,255,255,0.9)',
        boxShadow: '0 6px 16px rgba(0,0,0,0.3)',
        opacity, zIndex: 110, pointerEvents: 'none',
      }} />
    </>
  );
};

export const Typewriter: React.FC<{ text: string; startFrame: number; cps?: number; style?: React.CSSProperties; caret?: boolean }> = ({ text, startFrame, cps = 12, style, caret = true }) => {
  const frame = useCurrentFrame();
  const elapsed = Math.max(0, frame - startFrame);
  const chars = Math.min(text.length, Math.floor((elapsed / 30) * cps));
  const showCaret = caret && frame >= startFrame && Math.floor(frame / 15) % 2 === 0;
  return (
    <span style={style}>
      {text.slice(0, chars)}
      {showCaret && <span style={{ display: 'inline-block', width: 3, height: '1em', background: 'currentColor', verticalAlign: 'middle', marginLeft: 2 }} />}
    </span>
  );
};