import { motion } from 'framer-motion';

export default function GoldenParticles({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <div className="absolute inset-0 pointer-events-none">
      {Array.from({ length: 12 }).map((_, i) => {
        const angle = (i / 12) * 360;
        const rad = (angle * Math.PI) / 180;
        const size = 3 + Math.random() * 5;
        return (
          <motion.div
            key={i}
            className="absolute rounded-full"
            style={{
              width: size,
              height: size,
              background: `radial-gradient(circle, #F5A623, #FF8C00)`,
              left: '50%',
              top: '50%',
            }}
            initial={{ x: 0, y: 0, opacity: 0, scale: 0 }}
            animate={{
              x: [0, Math.cos(rad) * 60, Math.cos(rad) * 80],
              y: [0, Math.sin(rad) * 60, Math.sin(rad) * 80],
              opacity: [0, 1, 0],
              scale: [0, 1.5, 0],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              delay: i * 0.15,
              ease: 'easeOut',
            }}
          />
        );
      })}
    </div>
  );
}
