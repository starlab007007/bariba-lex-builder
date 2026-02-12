import { useEffect, useState } from 'react';

interface CircularTimerProps {
  duration: number;
  onComplete: () => void;
  isActive: boolean;
}

export default function CircularTimer({ duration, onComplete, isActive }: CircularTimerProps) {
  const [elapsed, setElapsed] = useState(0);
  const R = 24;
  const C = 2 * Math.PI * R;
  const remaining = Math.max(0, duration - elapsed);
  const progress = elapsed / duration;

  useEffect(() => {
    if (!isActive) { setElapsed(0); return; }
    const t0 = Date.now();
    const iv = setInterval(() => {
      const e = (Date.now() - t0) / 1000;
      setElapsed(e);
      if (e >= duration) { clearInterval(iv); onComplete(); }
    }, 50);
    return () => clearInterval(iv);
  }, [isActive, duration, onComplete]);

  if (!isActive) return null;

  const color = remaining <= 1 ? '#EF4444' : remaining <= 3 ? '#FF6B35' : '#F5A623';
  const isPulse = remaining <= 1;

  return (
    <div className="relative w-[60px] h-[60px] flex items-center justify-center">
      <svg width="60" height="60" viewBox="0 0 60 60" className="absolute -rotate-90">
        <circle cx="30" cy="30" r={R} fill="none" stroke="white" strokeOpacity="0.15" strokeWidth="3" />
        <circle
          cx="30" cy="30" r={R}
          fill="none" stroke={color} strokeWidth="3" strokeLinecap="round"
          strokeDasharray={C}
          strokeDashoffset={C * progress}
          style={{ transition: 'stroke-dashoffset 0.05s linear, stroke 0.3s ease' }}
        />
      </svg>
      <span
        className="text-white font-bold text-lg z-10"
        style={{
          animation: isPulse ? 'timerPulse 0.5s ease-in-out infinite' : 'none',
        }}
      >
        {Math.ceil(remaining)}
      </span>
      <style>{`
        @keyframes timerPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.3); }
        }
      `}</style>
    </div>
  );
}
