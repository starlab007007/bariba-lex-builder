import React from 'react';
import { useCurrentFrame, interpolate } from 'remotion';
import { PhoneFrame, StatusBar } from '../components/PhoneFrame';
import { AnimatedCursor, Typewriter } from '../components/Cursor';

const BUTTONS = [
  { icon: '⌨️', label: 'Texte', color: '#6366f1' },
  { icon: '🎤', label: 'Audio', color: '#ec4899' },
  { icon: '📷', label: 'Photo', color: '#10b981' },
  { icon: '📋', label: 'Coller', color: '#f59e0b' },
  { icon: '📄', label: 'Document', color: '#8b5cf6' },
];

export const TraducteurDemo: React.FC = () => {
  const frame = useCurrentFrame();
  const translation = interpolate(frame, [180, 220], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  // highlight buttons one by one between frames 240-440
  const activeBtn = frame < 240 ? -1 : Math.min(4, Math.floor((frame - 240) / 40));

  return (
    <PhoneFrame bgGradient="linear-gradient(135deg, #667eea 0%, #764ba2 100%)" label="Traducteur IA">
      <StatusBar />
      {/* Header */}
      <div style={{ padding: '20px 40px 30px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{ width: 80, height: 80, borderRadius: 20, background: 'linear-gradient(135deg,#667eea,#764ba2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 44 }}>⚡</div>
          <div>
            <div style={{ fontFamily: 'Inter', fontWeight: 800, fontSize: 38, color: '#1a1a1a' }}>Traducteur ByT5</div>
            <div style={{ fontFamily: 'Inter', fontSize: 22, color: '#888' }}>IA Bariba ⇄ Français</div>
          </div>
        </div>
      </div>

      {/* Source */}
      <div style={{ padding: '0 40px 20px' }}>
        <div style={{ background: '#fff', border: '3px solid #667eea', borderRadius: 24, padding: 30, boxShadow: '0 8px 24px rgba(102,126,234,0.15)', minHeight: 180 }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#667eea', marginBottom: 12 }}>🇫🇷 FRANÇAIS</div>
          <div style={{ fontFamily: 'Inter', fontSize: 38, fontWeight: 600, color: '#1a1a1a', minHeight: 56 }}>
            <Typewriter text="Comment vas-tu ?" startFrame={60} cps={8} />
          </div>
        </div>
      </div>

      {/* Target */}
      <div style={{ padding: '0 40px 30px' }}>
        <div style={{ background: 'linear-gradient(135deg,#fff,#f5f0ff)', border: '3px solid #764ba2', borderRadius: 24, padding: 30, minHeight: 180, opacity: translation }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#764ba2', marginBottom: 12 }}>🟢 BARIBA</div>
          <div style={{ fontFamily: 'Inter', fontSize: 38, fontWeight: 700, color: '#1a1a1a' }}>A wãa kpa?</div>
          <div style={{ marginTop: 16, fontSize: 20, color: '#666' }}>✨ Traduit par ByT5 · 99% confiance</div>
        </div>
      </div>

      {/* Buttons */}
      <div style={{ padding: '0 30px', display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
        {BUTTONS.map((b, i) => {
          const active = i === activeBtn;
          const scale = active ? 1.12 : 1;
          return (
            <div key={i} style={{
              background: active ? b.color : '#fff',
              color: active ? 'white' : b.color,
              border: `3px solid ${b.color}`,
              borderRadius: 20, padding: '20px 8px',
              textAlign: 'center', transform: `scale(${scale})`,
              transition: 'none',
              boxShadow: active ? `0 12px 28px ${b.color}66` : '0 4px 8px rgba(0,0,0,0.05)',
            }}>
              <div style={{ fontSize: 36 }}>{b.icon}</div>
              <div style={{ fontSize: 16, fontWeight: 700, marginTop: 4 }}>{b.label}</div>
            </div>
          );
        })}
      </div>

      {/* Tooltip for active */}
      {activeBtn >= 0 && activeBtn < 5 && (
        <div style={{ position: 'absolute', bottom: 200, left: 0, right: 0, textAlign: 'center' }}>
          <span style={{ display: 'inline-block', background: '#1a1a1a', color: 'white', padding: '14px 28px', borderRadius: 16, fontSize: 22, fontWeight: 600 }}>
            {['Saisir au clavier','Dicter à la voix','Photographier un texte','Coller depuis presse-papier','Importer un fichier'][activeBtn]}
          </span>
        </div>
      )}

      <AnimatedCursor
        show={[30, 440]}
        waypoints={[
          { frame: 30, x: 200, y: 1400 },
          { frame: 70, x: 390, y: 480, tap: true },
          { frame: 240, x: 130, y: 1300 },
          { frame: 270, x: 130, y: 1300, tap: true },
          { frame: 280, x: 280, y: 1300 },
          { frame: 310, x: 280, y: 1300, tap: true },
          { frame: 320, x: 430, y: 1300 },
          { frame: 350, x: 430, y: 1300, tap: true },
          { frame: 360, x: 580, y: 1300 },
          { frame: 390, x: 580, y: 1300, tap: true },
          { frame: 400, x: 720, y: 1300 },
          { frame: 430, x: 720, y: 1300, tap: true },
        ]}
      />
    </PhoneFrame>
  );
};