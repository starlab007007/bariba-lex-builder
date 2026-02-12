import { motion } from 'framer-motion';
import { useMemo } from 'react';

export default function GoldenParticles({ show }: { show: boolean }) {
  const particles = useMemo(() =>
    Array.from({ length: 12 }).map((_, i) => {
      const angle = (i / 12) * 360;
      const rad = (angle * Math.PI) / 180;
      const size = 2 + Math.random() * 5;
      const dist = 50 + Math.random() * 50; // 50-100px
      const peakOpacity = 0.6 + Math.random() * 0.4;
      return { angle, rad, size, dist, peakOpacity };
    }), []);

  if (!show) return null;
  return (
    <div className="absolute inset-0 pointer-events-none">
      {particles.map((p, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            width: p.size,
            height: p.size,
            background: `radial-gradient(circle, #F5A623, #FF8C00)`,
            left: '50%',
            top: '50%',
          }}
          initial={{ x: 0, y: 0, opacity: 0, scale: 0 }}
          animate={{
            x: [0, Math.cos(p.rad) * p.dist * 0.75, Math.cos(p.rad) * p.dist],
            y: [0, Math.sin(p.rad) * p.dist * 0.75, Math.sin(p.rad) * p.dist],
            opacity: [0, p.peakOpacity, 0],
            scale: [0, 1.5, 0],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            delay: i * 0.15,
            ease: 'easeOut',
          }}
        />
      ))}
    </div>
  );
}
