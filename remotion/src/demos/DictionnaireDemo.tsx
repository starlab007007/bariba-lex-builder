import React from 'react';
import { useCurrentFrame, interpolate, AbsoluteFill, Sequence } from 'remotion';
import { PhoneFrame, StatusBar } from '../components/PhoneFrame';
import { AnimatedCursor, Typewriter } from '../components/Cursor';

export const DictionnaireDemo: React.FC = () => {
  const frame = useCurrentFrame();
  const resultOpacity = interpolate(frame, [220, 260], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const audioPulse = 1 + Math.sin((frame - 320) * 0.3) * 0.08;

  return (
    <PhoneFrame bgGradient="linear-gradient(135deg, #ffd89b 0%, #ff9966 50%, #ff5e62 100%)" label="Dictionnaire">
      <StatusBar />
      {/* Header */}
      <div style={{ padding: '20px 40px 30px', background: 'linear-gradient(180deg, #fff 0%, #fff5ed 100%)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{ width: 80, height: 80, borderRadius: 20, background: 'linear-gradient(135deg,#ff9966,#ff5e62)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 44 }}>📖</div>
          <div>
            <div style={{ fontFamily: 'Inter', fontWeight: 800, fontSize: 38, color: '#1a1a1a' }}>Dictionnaire</div>
            <div style={{ fontFamily: 'Inter', fontWeight: 500, fontSize: 22, color: '#888' }}>Français ⇄ Bariba</div>
          </div>
        </div>
      </div>
      {/* Lang toggle */}
      <div style={{ display: 'flex', gap: 12, padding: '0 40px 20px' }}>
        <div style={{ flex: 1, padding: 16, borderRadius: 16, background: '#ff5e62', color: 'white', textAlign: 'center', fontWeight: 700, fontSize: 24 }}>🇫🇷 Français</div>
        <div style={{ padding: 16, borderRadius: 16, background: '#fff', border: '2px solid #eee', fontSize: 28 }}>⇄</div>
        <div style={{ flex: 1, padding: 16, borderRadius: 16, background: '#fff5ed', color: '#ff5e62', textAlign: 'center', fontWeight: 700, fontSize: 24, border: '2px solid #ff5e62' }}>Bariba</div>
      </div>
      {/* Search input */}
      <div style={{ padding: '0 40px' }}>
        <div style={{ background: '#fff', border: '3px solid #ff9966', borderRadius: 24, padding: '28px 30px', display: 'flex', alignItems: 'center', gap: 16, boxShadow: '0 8px 24px rgba(255,94,98,0.15)' }}>
          <span style={{ fontSize: 32 }}>🔍</span>
          <div style={{ fontFamily: 'Inter', fontSize: 34, fontWeight: 600, color: '#1a1a1a', minHeight: 42 }}>
            <Typewriter text="Mardi" startFrame={90} cps={6} />
          </div>
        </div>
      </div>
      {/* Result card */}
      <div style={{ padding: '30px 40px', opacity: resultOpacity }}>
        <div style={{ background: 'linear-gradient(135deg, #fff 0%, #fff5ed 100%)', borderRadius: 28, padding: 36, boxShadow: '0 12px 32px rgba(0,0,0,0.08)', border: '2px solid #ffe4d4' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 20 }}>
            <div>
              <div style={{ fontSize: 18, fontWeight: 600, color: '#ff5e62', letterSpacing: 1, textTransform: 'uppercase' }}>Traduction</div>
              <div style={{ fontFamily: 'Inter', fontWeight: 800, fontSize: 56, color: '#1a1a1a', marginTop: 6 }}>Talaata</div>
            </div>
            <div style={{
              width: 80, height: 80, borderRadius: '50%', background: 'linear-gradient(135deg,#ff9966,#ff5e62)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, color: 'white',
              transform: frame > 310 ? `scale(${audioPulse})` : 'scale(1)',
              boxShadow: '0 8px 20px rgba(255,94,98,0.4)'
            }}>🔊</div>
          </div>
          <div style={{ height: 2, background: '#ffe4d4', margin: '20px 0' }} />
          <div style={{ fontSize: 24, color: '#666', lineHeight: 1.4 }}>
            <div style={{ fontWeight: 700, color: '#1a1a1a', marginBottom: 8 }}>Définition</div>
            Troisième jour de la semaine, après lundi et avant mercredi.
          </div>
          <div style={{ marginTop: 24, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <span style={{ padding: '10px 20px', background: '#fff5ed', borderRadius: 100, fontSize: 20, color: '#ff5e62', fontWeight: 600 }}>📅 Calendrier</span>
            <span style={{ padding: '10px 20px', background: '#fff5ed', borderRadius: 100, fontSize: 20, color: '#ff5e62', fontWeight: 600 }}>nom commun</span>
          </div>
        </div>
      </div>

      <AnimatedCursor
        show={[30, 380]}
        waypoints={[
          { frame: 30, x: 200, y: 1400 },
          { frame: 80, x: 390, y: 420, tap: true },
          { frame: 270, x: 390, y: 420 },
          { frame: 310, x: 660, y: 740, tap: true },
        ]}
      />
    </PhoneFrame>
  );
};