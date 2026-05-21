import React from 'react';
import { useCurrentFrame, interpolate } from 'remotion';
import { PhoneFrame, StatusBar } from '../components/PhoneFrame';
import { AnimatedCursor } from '../components/Cursor';

export const ClasseDemo: React.FC = () => {
  const frame = useCurrentFrame();
  // 3 screens: levels (30-130), lessons (130-230), Nim content (230-450)
  const screen = frame < 130 ? 0 : frame < 230 ? 1 : 2;

  const waveformBars = Array.from({ length: 24 }, (_, i) => {
    const h = frame > 320 ? 20 + Math.abs(Math.sin((frame - 320) * 0.3 + i * 0.5)) * 50 : 8;
    return h;
  });

  return (
    <PhoneFrame bgGradient="linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%)" label="Classe">
      <StatusBar />
      <div style={{ padding: '20px 40px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{ width: 80, height: 80, borderRadius: 20, background: 'linear-gradient(135deg,#10b981,#0ea5e9)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 44 }}>🎓</div>
          <div>
            <div style={{ fontFamily: 'Inter', fontWeight: 800, fontSize: 38, color: '#1a1a1a' }}>Classe Bariba</div>
            <div style={{ fontFamily: 'Inter', fontSize: 22, color: '#888' }}>
              {screen === 0 ? 'Choisis ton niveau' : screen === 1 ? 'Niveau 1 · Leçons' : 'Leçon 1 · Nim'}
            </div>
          </div>
        </div>
      </div>

      {/* Screen 0: Levels */}
      {screen === 0 && (
        <div style={{ padding: '20px 40px', display: 'flex', flexDirection: 'column', gap: 18 }}>
          {[1,2,3,4].map(n => (
            <div key={n} style={{
              background: n === 1 ? 'linear-gradient(135deg,#10b981,#0ea5e9)' : '#fff',
              borderRadius: 24, padding: 28, display: 'flex', alignItems: 'center', gap: 24,
              boxShadow: n === 1 ? '0 12px 32px rgba(16,185,129,0.35)' : '0 4px 12px rgba(0,0,0,0.06)',
              border: '2px solid ' + (n === 1 ? 'transparent' : '#eee'),
            }}>
              <div style={{ width: 80, height: 80, borderRadius: 20, background: n === 1 ? 'rgba(255,255,255,0.25)' : '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40, fontWeight: 800, color: n === 1 ? 'white' : '#999' }}>{n}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: 'Inter', fontWeight: 800, fontSize: 32, color: n === 1 ? 'white' : '#1a1a1a' }}>Niveau {n}</div>
                <div style={{ fontSize: 20, color: n === 1 ? 'rgba(255,255,255,0.85)' : '#888', marginTop: 4 }}>{['Débutant','Élémentaire','Intermédiaire','Avancé'][n-1]} · 12 leçons</div>
              </div>
              <div style={{ fontSize: 36, color: n === 1 ? 'white' : '#ccc' }}>›</div>
            </div>
          ))}
        </div>
      )}

      {/* Screen 1: Lessons */}
      {screen === 1 && (
        <div style={{ padding: '20px 40px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {['Nim — Les salutations','Yiru — La famille','Tam — Les nombres','Nse — Le marché','Nnu — Le corps'].map((t, i) => (
            <div key={i} style={{
              background: i === 0 ? 'linear-gradient(135deg,#10b981,#0ea5e9)' : '#fff',
              borderRadius: 20, padding: 24, display: 'flex', alignItems: 'center', gap: 20,
              boxShadow: i === 0 ? '0 8px 24px rgba(16,185,129,0.3)' : '0 4px 10px rgba(0,0,0,0.05)',
            }}>
              <div style={{ width: 60, height: 60, borderRadius: 16, background: i === 0 ? 'rgba(255,255,255,0.25)' : '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>{['📖','👨‍👩‍👧','🔢','🛒','👤'][i]}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 26, color: i === 0 ? 'white' : '#1a1a1a' }}>Leçon {i+1}</div>
                <div style={{ fontSize: 22, color: i === 0 ? 'rgba(255,255,255,0.9)' : '#666', marginTop: 2 }}>{t}</div>
              </div>
              <div style={{ fontSize: 28, color: i === 0 ? 'white' : '#ccc' }}>›</div>
            </div>
          ))}
        </div>
      )}

      {/* Screen 2: Nim content */}
      {screen === 2 && (
        <div style={{ padding: '20px 40px' }}>
          <div style={{ background: 'linear-gradient(135deg,#fff,#f0fdf4)', borderRadius: 28, padding: 36, boxShadow: '0 12px 32px rgba(0,0,0,0.08)', border: '2px solid #d1fae5' }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#10b981', letterSpacing: 2, textTransform: 'uppercase' }}>Mot du jour · Nim</div>
            <div style={{ fontFamily: 'Inter', fontWeight: 800, fontSize: 88, color: '#1a1a1a', lineHeight: 1, marginTop: 12 }}>Nim</div>
            <div style={{ fontSize: 28, color: '#666', marginTop: 8 }}>🇫🇷 Bonjour</div>

            <div style={{ marginTop: 30, padding: 24, background: '#fff', borderRadius: 20, border: '2px solid #d1fae5' }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#1a1a1a', marginBottom: 12 }}>Exemple :</div>
              <div style={{ fontSize: 26, color: '#1a1a1a', fontStyle: 'italic' }}>« Nim, n na wãa ! »</div>
              <div style={{ fontSize: 20, color: '#888', marginTop: 6 }}>« Bonjour, je vais bien ! »</div>
            </div>

            {/* Audio waveform */}
            <div style={{ marginTop: 24, padding: 20, background: 'linear-gradient(135deg,#10b981,#0ea5e9)', borderRadius: 20, display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, color: '#10b981' }}>{frame > 320 ? '⏸' : '▶'}</div>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 4, height: 60 }}>
                {waveformBars.map((h, i) => (
                  <div key={i} style={{ flex: 1, height: h, background: 'rgba(255,255,255,0.85)', borderRadius: 4 }} />
                ))}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 14, marginTop: 24 }}>
            <div style={{ flex: 1, padding: 22, background: '#fff', borderRadius: 20, textAlign: 'center', fontWeight: 700, fontSize: 24, color: '#888', border: '2px solid #eee' }}>‹ Précédent</div>
            <div style={{
              flex: 1, padding: 22, borderRadius: 20, textAlign: 'center', fontWeight: 700, fontSize: 24,
              background: frame > 400 ? 'linear-gradient(135deg,#10b981,#0ea5e9)' : '#10b981', color: 'white',
              transform: frame > 400 && frame < 420 ? 'scale(0.95)' : 'scale(1)',
            }}>Suivant ›</div>
          </div>
        </div>
      )}

      <AnimatedCursor
        show={[30, 440]}
        waypoints={[
          { frame: 30, x: 200, y: 1450 },
          { frame: 100, x: 390, y: 600, tap: true },
          { frame: 170, x: 390, y: 1400 },
          { frame: 210, x: 390, y: 540, tap: true },
          { frame: 280, x: 390, y: 1300 },
          { frame: 320, x: 200, y: 1180, tap: true },
          { frame: 390, x: 580, y: 1450 },
          { frame: 410, x: 580, y: 1450, tap: true },
        ]}
      />
    </PhoneFrame>
  );
};