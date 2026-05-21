import React from 'react';
import { useCurrentFrame, interpolate } from 'remotion';
import { PhoneFrame, StatusBar } from '../components/PhoneFrame';
import { AnimatedCursor, Typewriter } from '../components/Cursor';

export const FitilaTemIADemo: React.FC = () => {
  const frame = useCurrentFrame();
  const userBubble = interpolate(frame, [60, 90], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const typing = frame > 100 && frame < 180;
  const aiBubble = interpolate(frame, [180, 210], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const sourceHighlight = interpolate(frame, [340, 370], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const sourcePulse = 1 + Math.sin((frame - 370) * 0.25) * 0.04;

  const dot = (i: number) => 0.3 + Math.abs(Math.sin((frame - 100) * 0.2 + i * 0.7)) * 0.7;

  return (
    <PhoneFrame bgGradient="linear-gradient(135deg, #fa709a 0%, #fee140 100%)" label="Fitila Tem IA">
      <StatusBar />
      <div style={{ padding: '20px 40px 16px', background: 'linear-gradient(180deg,#fff,#fff8f0)', borderBottom: '2px solid #fee4cc' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{ width: 80, height: 80, borderRadius: 24, background: 'linear-gradient(135deg,#fa709a,#fee140)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 44 }}>🔥</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: 'Inter', fontWeight: 800, fontSize: 36, color: '#1a1a1a' }}>Fitila Tem IA</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#10b981' }} />
              <span style={{ fontSize: 20, color: '#666' }}>Assistant Bariba · En ligne</span>
            </div>
          </div>
        </div>
      </div>

      {/* Chat area */}
      <div style={{ padding: '30px 30px', display: 'flex', flexDirection: 'column', gap: 20, minHeight: 1000 }}>
        {/* User bubble */}
        <div style={{ alignSelf: 'flex-end', maxWidth: '85%', opacity: userBubble, transform: `translateY(${(1-userBubble)*20}px)` }}>
          <div style={{ background: 'linear-gradient(135deg,#fa709a,#fee140)', color: 'white', padding: '22px 28px', borderRadius: '28px 28px 8px 28px', fontSize: 30, fontWeight: 600, fontFamily: 'Inter', boxShadow: '0 8px 20px rgba(250,112,154,0.3)' }}>
            Saria gbiika gari mba?
          </div>
          <div style={{ textAlign: 'right', fontSize: 18, color: '#999', marginTop: 8 }}>Toi · 9:41</div>
        </div>

        {/* Typing indicator */}
        {typing && (
          <div style={{ alignSelf: 'flex-start', background: '#fff', padding: '24px 32px', borderRadius: '28px 28px 28px 8px', boxShadow: '0 4px 12px rgba(0,0,0,0.06)', display: 'flex', gap: 10 }}>
            {[0,1,2].map(i => <div key={i} style={{ width: 16, height: 16, borderRadius: '50%', background: '#fa709a', opacity: dot(i) }} />)}
          </div>
        )}

        {/* AI bubble */}
        {frame >= 180 && (
          <div style={{ alignSelf: 'flex-start', maxWidth: '90%', opacity: aiBubble, transform: `translateY(${(1-aiBubble)*20}px)` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg,#fa709a,#fee140)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🔥</div>
              <span style={{ fontSize: 20, fontWeight: 700, color: '#1a1a1a' }}>Fitila Tem</span>
            </div>
            <div style={{ background: '#fff', padding: '24px 28px', borderRadius: '28px 28px 28px 8px', fontSize: 26, fontFamily: 'Inter', color: '#1a1a1a', lineHeight: 1.5, boxShadow: '0 6px 16px rgba(0,0,0,0.08)', border: '2px solid #fff5ed' }}>
              <Typewriter text="« Saria gbiika gari mba? » signifie « Comment s'appelle le chef du village ? ». Le mot saria désigne le chef traditionnel, gbiika le village, et gari mba pose la question du nom." startFrame={210} cps={22} caret={false} />
            </div>

            {/* Source */}
            <div style={{
              marginTop: 14, padding: '14px 20px', borderRadius: 16,
              background: sourceHighlight > 0.1 ? 'linear-gradient(135deg,#fff5ed,#fee4cc)' : '#fafafa',
              border: '2px solid ' + (sourceHighlight > 0.1 ? '#fa709a' : '#eee'),
              transform: frame > 360 ? `scale(${sourcePulse})` : 'scale(1)',
              display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <span style={{ fontSize: 24 }}>📚</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#fa709a', textTransform: 'uppercase', letterSpacing: 1 }}>Source vérifiée</div>
                <div style={{ fontSize: 20, color: '#1a1a1a', fontWeight: 600, marginTop: 2 }}>Corpus Bariba · Lexique traditionnel</div>
              </div>
              <span style={{ fontSize: 24, color: '#10b981' }}>✓</span>
            </div>
          </div>
        )}
      </div>

      <AnimatedCursor
        show={[30, 360]}
        waypoints={[
          { frame: 30, x: 600, y: 1450 },
          { frame: 80, x: 600, y: 480, tap: true },
          { frame: 340, x: 390, y: 1100, tap: true },
        ]}
      />
    </PhoneFrame>
  );
};