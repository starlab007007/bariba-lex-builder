import React from 'react';
import { useCurrentFrame, interpolate } from 'remotion';
import { PhoneFrame, StatusBar } from '../components/PhoneFrame';
import { AnimatedCursor } from '../components/Cursor';

export const ApprendreDemo: React.FC = () => {
  const frame = useCurrentFrame();
  // screens: lang select (30-110), categories (110-200), quiz (200-450)
  const screen = frame < 110 ? 0 : frame < 200 ? 1 : 2;
  const success = frame > 360;

  return (
    <PhoneFrame bgGradient="linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)" label="Apprendre">
      <StatusBar />
      <div style={{ padding: '20px 40px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{ width: 80, height: 80, borderRadius: 20, background: 'linear-gradient(135deg,#a18cd1,#fbc2eb)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 44 }}>📚</div>
          <div>
            <div style={{ fontFamily: 'Inter', fontWeight: 800, fontSize: 38, color: '#1a1a1a' }}>Apprendre</div>
            <div style={{ fontSize: 22, color: '#888' }}>{screen === 0 ? 'Ta langue' : screen === 1 ? 'Que veux-tu apprendre ?' : 'Quiz · Salutations'}</div>
          </div>
        </div>
      </div>

      {/* Screen 0: Language */}
      {screen === 0 && (
        <div style={{ padding: '40px 40px', display: 'flex', flexDirection: 'column', gap: 22 }}>
          {[{flag:'🇫🇷',name:'Français',active:true},{flag:'🟢',name:'Bariba',active:false},{flag:'🇬🇧',name:'English',active:false}].map(l => (
            <div key={l.name} style={{
              background: l.active ? 'linear-gradient(135deg,#a18cd1,#fbc2eb)' : '#fff',
              borderRadius: 24, padding: 32, display: 'flex', alignItems: 'center', gap: 24,
              boxShadow: l.active ? '0 12px 32px rgba(161,140,209,0.4)' : '0 4px 12px rgba(0,0,0,0.05)',
              border: l.active ? '4px solid #fff' : '2px solid #eee',
            }}>
              <div style={{ fontSize: 56 }}>{l.flag}</div>
              <div style={{ flex: 1, fontFamily: 'Inter', fontWeight: 800, fontSize: 36, color: l.active ? 'white' : '#1a1a1a' }}>{l.name}</div>
              {l.active && <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'white', color: '#a18cd1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, fontWeight: 800 }}>✓</div>}
            </div>
          ))}
        </div>
      )}

      {/* Screen 1: Categories */}
      {screen === 1 && (
        <div style={{ padding: '20px 40px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
          {[
            { icon: '👋', name: 'Salutations & politesse', active: true },
            { icon: '👨‍👩‍👧', name: 'Famille', active: false },
            { icon: '🔢', name: 'Nombres', active: false },
            { icon: '🍲', name: 'Nourriture', active: false },
            { icon: '🛒', name: 'Marché', active: false },
            { icon: '🌿', name: 'Nature', active: false },
          ].map((c) => (
            <div key={c.name} style={{
              background: c.active ? 'linear-gradient(135deg,#a18cd1,#fbc2eb)' : '#fff',
              borderRadius: 24, padding: 28, textAlign: 'center',
              boxShadow: c.active ? '0 12px 28px rgba(161,140,209,0.35)' : '0 4px 12px rgba(0,0,0,0.05)',
              transform: c.active ? 'scale(1.04)' : 'scale(1)',
              minHeight: 200,
              display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 12,
              border: c.active ? '3px solid #fff' : '2px solid #f0f0f0',
            }}>
              <div style={{ fontSize: 56 }}>{c.icon}</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: c.active ? 'white' : '#1a1a1a', lineHeight: 1.2 }}>{c.name}</div>
            </div>
          ))}
        </div>
      )}

      {/* Screen 2: Quiz */}
      {screen === 2 && (
        <div style={{ padding: '20px 40px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
            <span style={{ fontSize: 22, fontWeight: 700, color: '#a18cd1' }}>Question 1/5</span>
            <span style={{ fontSize: 22, fontWeight: 700, color: '#a18cd1' }}>⭐ 40 pts</span>
          </div>
          <div style={{ height: 12, background: '#f0e6ff', borderRadius: 6, overflow: 'hidden', marginBottom: 30 }}>
            <div style={{ width: '20%', height: '100%', background: 'linear-gradient(90deg,#a18cd1,#fbc2eb)' }} />
          </div>

          <div style={{ background: 'linear-gradient(135deg,#fff,#faf5ff)', borderRadius: 28, padding: 36, boxShadow: '0 12px 28px rgba(0,0,0,0.08)', border: '2px solid #e9d5ff' }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#a18cd1', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Traduis en Bariba</div>
            <div style={{ fontFamily: 'Inter', fontSize: 56, fontWeight: 800, color: '#1a1a1a', lineHeight: 1.1 }}>« Bonjour »</div>
          </div>

          <div style={{ marginTop: 30, display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[
              { label: 'Nim', correct: true },
              { label: 'Yiru', correct: false },
              { label: 'Sɛmɛ', correct: false },
            ].map((o) => {
              const isPicked = success && o.correct;
              return (
                <div key={o.label} style={{
                  background: isPicked ? 'linear-gradient(135deg,#10b981,#34d399)' : '#fff',
                  border: '3px solid ' + (isPicked ? '#10b981' : '#e9d5ff'),
                  borderRadius: 20, padding: '28px 32px',
                  fontFamily: 'Inter', fontSize: 32, fontWeight: 700,
                  color: isPicked ? 'white' : '#1a1a1a',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  boxShadow: isPicked ? '0 12px 24px rgba(16,185,129,0.35)' : '0 4px 10px rgba(0,0,0,0.04)',
                  transform: isPicked ? 'scale(1.02)' : 'scale(1)',
                }}>
                  <span>{o.label}</span>
                  {isPicked && <span style={{ fontSize: 36 }}>✓</span>}
                </div>
              );
            })}
          </div>

          {success && (
            <div style={{ marginTop: 24, padding: 22, background: 'linear-gradient(135deg,#10b981,#34d399)', borderRadius: 20, textAlign: 'center', color: 'white' }}>
              <div style={{ fontSize: 32, fontWeight: 800 }}>🎉 Bravo !</div>
              <div style={{ fontSize: 22, marginTop: 4 }}>+ 10 points</div>
            </div>
          )}
        </div>
      )}

      <AnimatedCursor
        show={[30, 430]}
        waypoints={[
          { frame: 30, x: 200, y: 1450 },
          { frame: 80, x: 390, y: 420, tap: true },
          { frame: 150, x: 390, y: 1400 },
          { frame: 180, x: 270, y: 540, tap: true },
          { frame: 280, x: 390, y: 1300 },
          { frame: 360, x: 200, y: 1110, tap: true },
        ]}
      />
    </PhoneFrame>
  );
};