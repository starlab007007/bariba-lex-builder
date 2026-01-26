import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

interface KuaishouProfileBackgroundProps {
  children: React.ReactNode;
}

export const KuaishouProfileBackground: React.FC<KuaishouProfileBackgroundProps> = ({
  children,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Stars configuration
    const stars: { x: number; y: number; size: number; opacity: number; speed: number }[] = [];
    const numStars = 80;

    for (let i = 0; i < numStars; i++) {
      stars.push({
        x: Math.random() * canvas.offsetWidth,
        y: Math.random() * canvas.offsetHeight,
        size: Math.random() * 1.5 + 0.5,
        opacity: Math.random() * 0.5 + 0.3,
        speed: Math.random() * 0.02 + 0.01,
      });
    }

    let animationId: number;
    let time = 0;

    const animate = () => {
      time += 0.016;
      ctx.clearRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);

      // Draw stars
      stars.forEach((star) => {
        const twinkle = Math.sin(time * star.speed * 100) * 0.3 + 0.7;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${star.opacity * twinkle})`;
        ctx.fill();
      });

      animationId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationId);
    };
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="relative overflow-hidden"
      style={{
        background: 'linear-gradient(180deg, hsl(230 70% 20%) 0%, hsl(230 55% 35%) 40%, hsl(230 45% 55%) 100%)',
      }}
    >
      {/* Stars canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{ opacity: 0.8 }}
      />

      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </motion.div>
  );
};

export default KuaishouProfileBackground;
