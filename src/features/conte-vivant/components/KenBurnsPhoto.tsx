import { motion } from 'framer-motion';
import { useMemo } from 'react';

interface KenBurnsPhotoProps {
  src: string;
  className?: string;
}

const ANIMATIONS = [
  { from: 'scale(1) translate(0,0)', to: 'scale(1.15) translate(-2%,-1%)' },
  { from: 'scale(1.05) translate(3%,0)', to: 'scale(1.05) translate(-3%,0)' },
  { from: 'scale(1.05) translate(-3%,0)', to: 'scale(1.05) translate(3%,0)' },
  { from: 'scale(1.12) translate(0,2%)', to: 'scale(1) translate(0,-1%)' },
];

export default function KenBurnsPhoto({ src, className = '' }: KenBurnsPhotoProps) {
  const anim = useMemo(() => ANIMATIONS[Math.floor(Math.random() * 4)], [src]);
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className={`w-full h-full overflow-hidden ${className}`}
    >
      <img
        src={src}
        alt=""
        className="w-full h-full object-cover"
        style={{
          animation: `kenburns-${Math.floor(Math.random() * 4)} 12s ease-in-out infinite alternate`,
          transform: anim.from,
        }}
      />
      <style>{`
        @keyframes kenburns-0 { from { transform: scale(1) translate(0,0); } to { transform: scale(1.15) translate(-2%,-1%); } }
        @keyframes kenburns-1 { from { transform: scale(1.05) translate(3%,0); } to { transform: scale(1.05) translate(-3%,0); } }
        @keyframes kenburns-2 { from { transform: scale(1.05) translate(-3%,0); } to { transform: scale(1.05) translate(3%,0); } }
        @keyframes kenburns-3 { from { transform: scale(1.12) translate(0,2%); } to { transform: scale(1) translate(0,-1%); } }
      `}</style>
    </motion.div>
  );
}
