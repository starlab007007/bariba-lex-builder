import React from 'react';
import { AbsoluteFill, useCurrentFrame, spring, useVideoConfig, interpolate } from 'remotion';

// Phone viewport: 390 x 844 logical px, scaled up
const PHONE_W = 780;
const PHONE_H = 1688;

export const PhoneFrame: React.FC<{
  children: React.ReactNode;
  bgGradient: string;
  label?: string;
}> = ({ children, bgGradient, label }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame, fps, config: { damping: 18, stiffness: 120 } });
  const scale = interpolate(enter, [0, 1], [0.85, 1]);
  const opacity = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ background: bgGradient }}>
      {/* Soft glow blobs */}
      <div style={{ position: 'absolute', width: 800, height: 800, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', filter: 'blur(120px)', top: -200, left: -200 }} />
      <div style={{ position: 'absolute', width: 600, height: 600, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', filter: 'blur(100px)', bottom: -100, right: -100 }} />

      {label && (
        <div style={{ position: 'absolute', top: 80, left: 0, right: 0, textAlign: 'center', color: 'white', fontFamily: 'Inter, sans-serif', fontSize: 56, fontWeight: 800, letterSpacing: -1, textShadow: '0 4px 24px rgba(0,0,0,0.3)', opacity }}>
          {label}
        </div>
      )}

      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
        <div
          style={{
            width: PHONE_W,
            height: PHONE_H,
            transform: `scale(${scale})`,
            opacity,
            borderRadius: 110,
            background: '#0a0a0a',
            padding: 18,
            boxShadow: '0 60px 120px rgba(0,0,0,0.45), 0 0 0 2px rgba(255,255,255,0.08) inset',
            position: 'relative',
          }}
        >
          <div
            style={{
              width: '100%',
              height: '100%',
              borderRadius: 92,
              overflow: 'hidden',
              background: '#fff',
              position: 'relative',
            }}
          >
            {/* Notch */}
            <div style={{ position: 'absolute', top: 18, left: '50%', transform: 'translateX(-50%)', width: 240, height: 60, background: '#0a0a0a', borderRadius: 40, zIndex: 50 }} />
            {children}
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export const StatusBar: React.FC = () => (
  <div style={{ height: 90, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '36px 50px 0', fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: 24, color: '#000' }}>
    <span>9:41</span>
    <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      <span style={{ fontSize: 18 }}>●●●●</span>
      <span>📶</span>
      <span style={{ display: 'inline-block', width: 36, height: 16, border: '2px solid #000', borderRadius: 4, position: 'relative' }}>
        <span style={{ position: 'absolute', inset: 2, background: '#000', borderRadius: 2 }} />
      </span>
    </span>
  </div>
);