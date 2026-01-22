/**
 * Griot 3D Preview Component
 * Animated Three.js preview with fallback primitives
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import * as THREE from 'three';
import GriotFallback, {
  createGriotCharacter,
  createVillageScene,
  createSkyDome,
  createParticleSystem,
  updateParticles
} from '@/lib/GriotFallbackScene';

const STYLE_PALETTES = GriotFallback.STYLE_PALETTES;

export interface Griot3DPreviewProps {
  style: 'traditional' | 'modern' | 'fantasy' | 'historical';
  isActive?: boolean;
  className?: string;
}

export const Griot3DPreview: React.FC<Griot3DPreviewProps> = ({
  style,
  isActive = true,
  className = ''
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const animationFrameRef = useRef<number>(0);
  const clockRef = useRef<THREE.Clock>(new THREE.Clock());
  const particlesRef = useRef<THREE.Points | null>(null);
  const characterRef = useRef<THREE.Group | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [useCanvas2D, setUseCanvas2D] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize Three.js scene
  const initThreeJS = useCallback(() => {
    if (!canvasRef.current || !containerRef.current) return false;

    try {
      // Check WebGL support
      const canvas = canvasRef.current;
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!gl) {
        console.warn('[Griot3DPreview] WebGL not supported, using 2D fallback');
        setUseCanvas2D(true);
        return false;
      }

      // Create renderer
      const renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance'
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.2;
      rendererRef.current = renderer;

      // Create scene
      const scene = new THREE.Scene();
      const palette = STYLE_PALETTES[style];
      scene.background = new THREE.Color(palette.background);
      scene.fog = new THREE.FogExp2(palette.fog, 0.02);
      sceneRef.current = scene;

      // Create camera
      const aspect = containerRef.current.clientWidth / containerRef.current.clientHeight;
      const camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 100);
      camera.position.set(0, 1.8, 5);
      camera.lookAt(0, 1, 0);
      cameraRef.current = camera;

      // Add lighting
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
      scene.add(ambientLight);

      const keyLight = new THREE.DirectionalLight(0xfff5e6, 1.2);
      keyLight.position.set(5, 8, 5);
      keyLight.castShadow = true;
      keyLight.shadow.mapSize.width = 1024;
      keyLight.shadow.mapSize.height = 1024;
      scene.add(keyLight);

      const fillLight = new THREE.DirectionalLight(0xe6f0ff, 0.4);
      fillLight.position.set(-5, 3, -2);
      scene.add(fillLight);

      const rimLight = new THREE.DirectionalLight(palette.accent, 0.5);
      rimLight.position.set(0, 3, -5);
      scene.add(rimLight);

      // Add fallback scene objects
      const character = createGriotCharacter(style);
      character.position.set(0, 0, 0);
      scene.add(character);
      characterRef.current = character;

      const environment = createVillageScene(style);
      environment.position.set(0, -0.5, -3);
      environment.scale.setScalar(0.8);
      scene.add(environment);

      const sky = createSkyDome(style);
      scene.add(sky);

      const particles = createParticleSystem(style);
      scene.add(particles);
      particlesRef.current = particles;

      return true;
    } catch (err) {
      console.error('[Griot3DPreview] Init failed:', err);
      setUseCanvas2D(true);
      return false;
    }
  }, [style]);

  // Animation loop
  const animate = useCallback(() => {
    if (!isActive) return;

    const delta = clockRef.current.getDelta();
    const elapsed = clockRef.current.getElapsedTime();

    // Update particles
    if (particlesRef.current) {
      updateParticles(particlesRef.current, delta);
    }

    // Animate character (gentle sway)
    if (characterRef.current) {
      characterRef.current.rotation.y = Math.sin(elapsed * 0.5) * 0.1;
      characterRef.current.position.y = Math.sin(elapsed * 2) * 0.02;
    }

    // Animate camera (subtle orbit)
    if (cameraRef.current) {
      const radius = 5;
      const angle = elapsed * 0.1;
      cameraRef.current.position.x = Math.sin(angle) * 0.5;
      cameraRef.current.lookAt(0, 1.2, 0);
    }

    // Render
    if (rendererRef.current && sceneRef.current && cameraRef.current) {
      rendererRef.current.render(sceneRef.current, cameraRef.current);
    }

    animationFrameRef.current = requestAnimationFrame(animate);
  }, [isActive]);

  // 2D Canvas fallback
  const draw2DFallback = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const palette = STYLE_PALETTES[style];

    // Background gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, `#${palette.background.toString(16).padStart(6, '0')}`);
    gradient.addColorStop(0.5, `#${(palette.background + 0x111111).toString(16).padStart(6, '0')}`);
    gradient.addColorStop(1, `#${palette.background.toString(16).padStart(6, '0')}`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);

    // Draw griot silhouette
    const primaryHex = `#${palette.primary.toString(16).padStart(6, '0')}`;
    const accentHex = `#${palette.accent.toString(16).padStart(6, '0')}`;

    // Head
    ctx.fillStyle = primaryHex;
    ctx.beginPath();
    ctx.arc(w / 2, h * 0.28, 35, 0, Math.PI * 2);
    ctx.fill();

    // Body/robe
    ctx.beginPath();
    ctx.moveTo(w / 2 - 50, h * 0.75);
    ctx.lineTo(w / 2, h * 0.35);
    ctx.lineTo(w / 2 + 50, h * 0.75);
    ctx.closePath();
    ctx.fill();

    // Hat
    ctx.fillStyle = accentHex;
    ctx.beginPath();
    ctx.ellipse(w / 2, h * 0.22, 25, 15, 0, 0, Math.PI * 2);
    ctx.fill();

    // Staff orb
    ctx.beginPath();
    ctx.arc(w / 2 + 55, h * 0.35, 10, 0, Math.PI * 2);
    ctx.fill();

    // Animated particles
    const time = Date.now() / 1000;
    ctx.fillStyle = `${accentHex}66`;
    for (let i = 0; i < 30; i++) {
      const x = ((Math.sin(time + i) + 1) / 2) * w;
      const y = ((Math.cos(time * 0.5 + i * 0.7) + 1) / 2) * h;
      const size = 2 + Math.sin(time + i) * 2;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }

    // Style badge
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    ctx.roundRect(10, h - 40, 100, 30, 15);
    ctx.fill();
    ctx.fillStyle = accentHex;
    ctx.font = 'bold 12px system-ui';
    ctx.textAlign = 'left';
    ctx.fillText(`🎭 ${style}`, 20, h - 20);

    // Continue animation
    if (isActive) {
      animationFrameRef.current = requestAnimationFrame(draw2DFallback);
    }
  }, [style, isActive]);

  // Handle resize
  useEffect(() => {
    const handleResize = () => {
      if (!containerRef.current) return;

      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;

      if (rendererRef.current && cameraRef.current) {
        rendererRef.current.setSize(width, height);
        cameraRef.current.aspect = width / height;
        cameraRef.current.updateProjectionMatrix();
      }

      if (canvasRef.current && useCanvas2D) {
        canvasRef.current.width = width;
        canvasRef.current.height = height;
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [useCanvas2D]);

  // Initialize on mount
  useEffect(() => {
    setIsLoading(true);
    clockRef.current = new THREE.Clock();

    const success = initThreeJS();
    
    if (success) {
      setIsLoading(false);
      animate();
    } else if (useCanvas2D && canvasRef.current) {
      canvasRef.current.width = containerRef.current?.clientWidth || 540;
      canvasRef.current.height = containerRef.current?.clientHeight || 960;
      setIsLoading(false);
      draw2DFallback();
    }

    return () => {
      cancelAnimationFrame(animationFrameRef.current);
      
      // Dispose Three.js resources
      if (sceneRef.current) {
        sceneRef.current.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.geometry.dispose();
            if (Array.isArray(child.material)) {
              child.material.forEach(m => m.dispose());
            } else {
              child.material.dispose();
            }
          }
        });
      }
      
      rendererRef.current?.dispose();
    };
  }, [initThreeJS, animate, draw2DFallback, useCanvas2D]);

  // Restart animation when style changes
  useEffect(() => {
    if (!isLoading && sceneRef.current) {
      // Update scene colors
      const palette = STYLE_PALETTES[style];
      sceneRef.current.background = new THREE.Color(palette.background);
      if (sceneRef.current.fog instanceof THREE.FogExp2) {
        sceneRef.current.fog.color = new THREE.Color(palette.fog);
      }
    }
  }, [style, isLoading]);

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden bg-gradient-to-b from-background to-muted ${className}`}
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full"
      />
      
      {isLoading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm"
        >
          <div className="text-center space-y-3">
            <Loader2 className="h-10 w-10 mx-auto animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Chargement de la scène 3D...</p>
          </div>
        </motion.div>
      )}

      {!isLoading && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="absolute bottom-4 left-4 px-3 py-1.5 rounded-full bg-primary/20 backdrop-blur-sm border border-primary/30"
        >
          <span className="text-primary text-xs font-medium flex items-center gap-1.5">
            <span>🎭</span>
            {useCanvas2D ? '2D' : '3D'} • {style}
          </span>
        </motion.div>
      )}

      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-destructive/10">
          <p className="text-destructive text-sm">{error}</p>
        </div>
      )}
    </div>
  );
};

export default Griot3DPreview;
