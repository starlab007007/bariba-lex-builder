import React, { useEffect, useRef, memo } from 'react';

export type ParticleType = 'dust' | 'stars' | 'leaves' | 'confetti' | 'bubbles' | 'fireflies' | 'soundwave';

interface ParticleSystemProps {
  type: ParticleType;
  count?: number;
  speed?: number;
  className?: string;
  audioLevel?: number; // 0-1 for sound-reactive effects
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  rotation: number;
  rotationSpeed: number;
  color: string;
  life: number;
}

const PARTICLE_CONFIGS: Record<ParticleType, {
  colors: string[];
  sizeRange: [number, number];
  speedMultiplier: number;
  gravity: number;
  fadeSpeed: number;
}> = {
  dust: {
    colors: ['rgba(255, 200, 100, 0.6)', 'rgba(255, 180, 80, 0.5)', 'rgba(220, 160, 60, 0.4)'],
    sizeRange: [2, 5],
    speedMultiplier: 0.3,
    gravity: -0.01,
    fadeSpeed: 0.002
  },
  stars: {
    colors: ['rgba(255, 255, 255, 0.9)', 'rgba(200, 220, 255, 0.8)', 'rgba(255, 240, 200, 0.7)'],
    sizeRange: [1, 4],
    speedMultiplier: 0.1,
    gravity: 0,
    fadeSpeed: 0.01
  },
  leaves: {
    colors: ['rgba(100, 180, 80, 0.7)', 'rgba(80, 150, 60, 0.6)', 'rgba(120, 200, 100, 0.5)'],
    sizeRange: [4, 10],
    speedMultiplier: 0.5,
    gravity: 0.02,
    fadeSpeed: 0.003
  },
  confetti: {
    colors: ['rgba(255, 100, 100, 0.8)', 'rgba(100, 255, 100, 0.8)', 'rgba(100, 100, 255, 0.8)', 
             'rgba(255, 255, 100, 0.8)', 'rgba(255, 100, 255, 0.8)', 'rgba(100, 255, 255, 0.8)'],
    sizeRange: [5, 12],
    speedMultiplier: 1,
    gravity: 0.05,
    fadeSpeed: 0.005
  },
  bubbles: {
    colors: ['rgba(100, 200, 255, 0.5)', 'rgba(150, 220, 255, 0.4)', 'rgba(200, 240, 255, 0.3)'],
    sizeRange: [8, 20],
    speedMultiplier: 0.4,
    gravity: -0.03,
    fadeSpeed: 0.004
  },
  fireflies: {
    colors: ['rgba(255, 255, 100, 0.9)', 'rgba(200, 255, 100, 0.8)', 'rgba(255, 220, 50, 0.7)'],
    sizeRange: [3, 6],
    speedMultiplier: 0.2,
    gravity: 0,
    fadeSpeed: 0.02
  },
  soundwave: {
    colors: ['rgba(100, 150, 255, 0.8)', 'rgba(150, 100, 255, 0.7)', 'rgba(255, 100, 150, 0.6)'],
    sizeRange: [2, 8],
    speedMultiplier: 0.8,
    gravity: 0,
    fadeSpeed: 0.015
  }
};

export const ParticleSystem: React.FC<ParticleSystemProps> = memo(({
  type,
  count = 30,
  speed = 1,
  className = '',
  audioLevel = 0
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animationRef = useRef<number>();
  const config = PARTICLE_CONFIGS[type];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };
    resize();
    window.addEventListener('resize', resize);

    const createParticle = (): Particle => {
      const [minSize, maxSize] = config.sizeRange;
      return {
        x: Math.random() * canvas.offsetWidth,
        y: type === 'bubbles' || type === 'dust' 
          ? canvas.offsetHeight + 20 
          : Math.random() * canvas.offsetHeight,
        vx: (Math.random() - 0.5) * config.speedMultiplier * speed,
        vy: (Math.random() - 0.5) * config.speedMultiplier * speed,
        size: Math.random() * (maxSize - minSize) + minSize,
        opacity: Math.random() * 0.5 + 0.5,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.1,
        color: config.colors[Math.floor(Math.random() * config.colors.length)],
        life: 1
      };
    };

    // Initialize particles
    particlesRef.current = Array.from({ length: count }, createParticle);

    const drawParticle = (p: Particle) => {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.globalAlpha = p.opacity * p.life;
      
      if (type === 'stars') {
        // Star shape
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
          const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2;
          const x = Math.cos(angle) * p.size;
          const y = Math.sin(angle) * p.size;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fillStyle = p.color;
        ctx.fill();
      } else if (type === 'leaves') {
        // Leaf shape
        ctx.beginPath();
        ctx.ellipse(0, 0, p.size, p.size / 2, 0, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();
      } else if (type === 'confetti') {
        // Rectangle confetti
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
      } else {
        // Circle (default)
        ctx.beginPath();
        ctx.arc(0, 0, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();
      }
      
      ctx.restore();
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);
      
      particlesRef.current.forEach((p, i) => {
        // Apply gravity
        p.vy += config.gravity;
        
        // Apply audio reactivity for soundwave type
        if (type === 'soundwave' && audioLevel > 0) {
          p.vy += (Math.random() - 0.5) * audioLevel * 2;
          p.size = config.sizeRange[0] + audioLevel * (config.sizeRange[1] - config.sizeRange[0]) * 2;
        }
        
        // Update position
        p.x += p.vx * speed;
        p.y += p.vy * speed;
        p.rotation += p.rotationSpeed;
        
        // Fade effect for stars/fireflies
        if (type === 'stars' || type === 'fireflies') {
          p.opacity = Math.sin(Date.now() * 0.003 + i) * 0.3 + 0.7;
        }
        
        // Decrease life
        p.life -= config.fadeSpeed;
        
        // Respawn if needed
        if (p.life <= 0 || p.y < -20 || p.y > canvas.offsetHeight + 20 || 
            p.x < -20 || p.x > canvas.offsetWidth + 20) {
          Object.assign(p, createParticle());
        }
        
        drawParticle(p);
      });
      
      animationRef.current = requestAnimationFrame(animate);
    };
    
    animate();

    return () => {
      window.removeEventListener('resize', resize);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [type, count, speed, config, audioLevel]);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 w-full h-full pointer-events-none ${className}`}
    />
  );
});

ParticleSystem.displayName = 'ParticleSystem';

export default ParticleSystem;
