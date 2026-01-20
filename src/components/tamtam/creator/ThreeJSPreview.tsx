/**
 * ThreeJSPreview - 3D Preview Component with Fallback
 * Renders Three.js scene with automatic fallback to canvas primitives
 */

import React, { useRef, useEffect, useCallback, useState } from 'react';
import * as THREE from 'three';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ThreeJSPreviewProps {
  style?: 'traditional' | 'modern' | 'fantasy' | 'historical';
  isAnimating?: boolean;
  showParticles?: boolean;
  lightingPreset?: 'cinematic' | 'studio' | 'natural';
  className?: string;
  onReady?: () => void;
  onError?: (error: Error) => void;
}

// Color palettes for different styles
const STYLE_COLORS = {
  traditional: {
    primary: 0xD4A574,
    secondary: 0x8B4513,
    ambient: 0xFFE4C4,
    ground: 0x3D2914
  },
  modern: {
    primary: 0x6366F1,
    secondary: 0xEC4899,
    ambient: 0xE0E7FF,
    ground: 0x1E1B4B
  },
  fantasy: {
    primary: 0xA855F7,
    secondary: 0x22D3EE,
    ambient: 0xF3E8FF,
    ground: 0x2E1065
  },
  historical: {
    primary: 0xB8860B,
    secondary: 0x704214,
    ambient: 0xFFF8DC,
    ground: 0x2D1F0F
  }
};

export const ThreeJSPreview: React.FC<ThreeJSPreviewProps> = ({
  style = 'traditional',
  isAnimating = true,
  showParticles = true,
  lightingPreset = 'cinematic',
  className,
  onReady,
  onError
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const animationRef = useRef<number | null>(null);
  const clockRef = useRef(new THREE.Clock());
  
  const [isLoading, setIsLoading] = useState(true);
  const [useFallback, setUseFallback] = useState(false);

  const colors = STYLE_COLORS[style];

  // Initialize Three.js scene
  const initThreeJS = useCallback(() => {
    if (!canvasRef.current || !containerRef.current) return false;

    try {
      const container = containerRef.current;
      const width = container.clientWidth;
      const height = container.clientHeight;

      // Create renderer
      const renderer = new THREE.WebGLRenderer({
        canvas: canvasRef.current,
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance'
      });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.2;
      rendererRef.current = renderer;

      // Create scene
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(colors.ground);
      scene.fog = new THREE.FogExp2(colors.ground, 0.02);
      sceneRef.current = scene;

      // Create camera
      const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
      camera.position.set(0, 2, 6);
      camera.lookAt(0, 1, 0);
      cameraRef.current = camera;

      // Setup lighting
      setupLighting(scene, lightingPreset);

      // Create scene objects (primitives as fallback)
      createSceneObjects(scene, style);

      // Add particles if enabled
      if (showParticles) {
        createParticles(scene, colors.primary);
      }

      setIsLoading(false);
      onReady?.();
      return true;
    } catch (error) {
      console.warn('[ThreeJSPreview] WebGL init failed, using fallback:', error);
      setUseFallback(true);
      setIsLoading(false);
      onError?.(error as Error);
      return false;
    }
  }, [colors, style, lightingPreset, showParticles, onReady, onError]);

  // Setup lighting based on preset
  const setupLighting = useCallback((scene: THREE.Scene, preset: string) => {
    // Ambient light
    const ambientIntensity = preset === 'studio' ? 0.6 : preset === 'natural' ? 0.4 : 0.3;
    const ambient = new THREE.AmbientLight(colors.ambient, ambientIntensity);
    scene.add(ambient);

    // Main directional light
    const mainLight = new THREE.DirectionalLight(0xFFFFFF, preset === 'cinematic' ? 1.5 : 1);
    mainLight.position.set(5, 10, 5);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.width = 1024;
    mainLight.shadow.mapSize.height = 1024;
    scene.add(mainLight);

    // Fill light
    const fillLight = new THREE.DirectionalLight(colors.secondary, 0.5);
    fillLight.position.set(-5, 3, -5);
    scene.add(fillLight);

    // Rim light for cinematic look
    if (preset === 'cinematic') {
      const rimLight = new THREE.SpotLight(colors.primary, 2);
      rimLight.position.set(0, 5, -8);
      rimLight.angle = Math.PI / 6;
      rimLight.penumbra = 0.5;
      scene.add(rimLight);
    }
  }, [colors]);

  // Create scene objects (primitives as fallback for missing GLB)
  const createSceneObjects = useCallback((scene: THREE.Scene, sceneStyle: string) => {
    // Ground plane
    const groundGeometry = new THREE.PlaneGeometry(20, 20);
    const groundMaterial = new THREE.MeshStandardMaterial({
      color: colors.ground,
      roughness: 0.9,
      metalness: 0.1
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // Central character placeholder (stylized sphere/cylinder combo)
    const characterGroup = new THREE.Group();
    
    // Body
    const bodyGeometry = new THREE.CylinderGeometry(0.3, 0.4, 1.2, 16);
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: colors.primary,
      roughness: 0.4,
      metalness: 0.6
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 0.8;
    body.castShadow = true;
    characterGroup.add(body);

    // Head
    const headGeometry = new THREE.SphereGeometry(0.25, 32, 32);
    const headMaterial = new THREE.MeshStandardMaterial({
      color: colors.ambient,
      roughness: 0.3,
      metalness: 0.2
    });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.y = 1.6;
    head.castShadow = true;
    characterGroup.add(head);

    // Traditional hat for griot style
    if (sceneStyle === 'traditional' || sceneStyle === 'historical') {
      const hatGeometry = new THREE.ConeGeometry(0.35, 0.3, 16);
      const hatMaterial = new THREE.MeshStandardMaterial({
        color: colors.secondary,
        roughness: 0.6
      });
      const hat = new THREE.Mesh(hatGeometry, hatMaterial);
      hat.position.y = 1.9;
      hat.castShadow = true;
      characterGroup.add(hat);
    }

    scene.add(characterGroup);
    characterGroup.userData.isCharacter = true;

    // Background elements based on style
    if (sceneStyle === 'traditional') {
      // Huts
      for (let i = 0; i < 3; i++) {
        const hutGroup = new THREE.Group();
        const angle = (i / 3) * Math.PI * 2 + Math.PI / 6;
        const radius = 4 + Math.random();
        
        const baseGeometry = new THREE.CylinderGeometry(0.8, 0.9, 1.2, 8);
        const baseMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513, roughness: 0.9 });
        const base = new THREE.Mesh(baseGeometry, baseMaterial);
        base.position.y = 0.6;
        base.castShadow = true;
        hutGroup.add(base);

        const roofGeometry = new THREE.ConeGeometry(1.1, 0.8, 8);
        const roofMaterial = new THREE.MeshStandardMaterial({ color: 0xC4A35A, roughness: 0.8 });
        const roof = new THREE.Mesh(roofGeometry, roofMaterial);
        roof.position.y = 1.6;
        roof.castShadow = true;
        hutGroup.add(roof);

        hutGroup.position.set(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
        scene.add(hutGroup);
      }
    } else if (sceneStyle === 'fantasy') {
      // Floating crystals
      for (let i = 0; i < 5; i++) {
        const crystalGeometry = new THREE.OctahedronGeometry(0.3 + Math.random() * 0.2);
        const crystalMaterial = new THREE.MeshStandardMaterial({
          color: i % 2 === 0 ? colors.primary : colors.secondary,
          roughness: 0.1,
          metalness: 0.9,
          transparent: true,
          opacity: 0.8
        });
        const crystal = new THREE.Mesh(crystalGeometry, crystalMaterial);
        crystal.position.set(
          (Math.random() - 0.5) * 6,
          2 + Math.random() * 2,
          (Math.random() - 0.5) * 6
        );
        crystal.userData.isFloating = true;
        crystal.userData.floatOffset = Math.random() * Math.PI * 2;
        scene.add(crystal);
      }
    }
  }, [colors]);

  // Create particle system
  const createParticles = useCallback((scene: THREE.Scene, color: number) => {
    const particleCount = 200;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 15;
      positions[i * 3 + 1] = Math.random() * 8;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 15;
      sizes[i] = Math.random() * 0.1 + 0.02;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.PointsMaterial({
      color,
      size: 0.1,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true
    });

    const particles = new THREE.Points(geometry, material);
    particles.userData.isParticles = true;
    scene.add(particles);
  }, []);

  // Animation loop
  const animate = useCallback(() => {
    if (!sceneRef.current || !cameraRef.current || !rendererRef.current) return;

    const delta = clockRef.current.getDelta();
    const elapsed = clockRef.current.getElapsedTime();

    // Animate character
    sceneRef.current.traverse((obj) => {
      if (obj.userData.isCharacter) {
        obj.rotation.y = Math.sin(elapsed * 0.5) * 0.1;
        obj.position.y = Math.sin(elapsed * 2) * 0.05;
      }
      if (obj.userData.isFloating) {
        const offset = obj.userData.floatOffset || 0;
        obj.position.y += Math.sin(elapsed + offset) * 0.01;
        obj.rotation.y += delta * 0.5;
      }
      if (obj.userData.isParticles) {
        const positions = (obj as THREE.Points).geometry.attributes.position.array as Float32Array;
        for (let i = 0; i < positions.length; i += 3) {
          positions[i + 1] += delta * 0.1;
          if (positions[i + 1] > 8) positions[i + 1] = 0;
        }
        (obj as THREE.Points).geometry.attributes.position.needsUpdate = true;
      }
    });

    // Gentle camera movement
    if (isAnimating) {
      cameraRef.current.position.x = Math.sin(elapsed * 0.2) * 0.5;
      cameraRef.current.lookAt(0, 1, 0);
    }

    rendererRef.current.render(sceneRef.current, cameraRef.current);
    animationRef.current = requestAnimationFrame(animate);
  }, [isAnimating]);

  // Canvas 2D fallback
  const drawFallback = useCallback(() => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const time = Date.now() * 0.001;

    // Background gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, `#${colors.ambient.toString(16).padStart(6, '0')}`);
    gradient.addColorStop(1, `#${colors.ground.toString(16).padStart(6, '0')}`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Draw stylized character
    const centerX = width / 2;
    const centerY = height * 0.55;
    const scale = Math.min(width, height) / 400;

    // Body
    ctx.fillStyle = `#${colors.primary.toString(16).padStart(6, '0')}`;
    ctx.beginPath();
    ctx.ellipse(centerX, centerY, 40 * scale, 60 * scale, 0, 0, Math.PI * 2);
    ctx.fill();

    // Head
    ctx.fillStyle = `#${colors.ambient.toString(16).padStart(6, '0')}`;
    ctx.beginPath();
    ctx.arc(centerX, centerY - 70 * scale, 25 * scale, 0, Math.PI * 2);
    ctx.fill();

    // Floating particles
    ctx.fillStyle = `#${colors.primary.toString(16).padStart(6, '0')}80`;
    for (let i = 0; i < 30; i++) {
      const x = (Math.sin(time + i) * 0.5 + 0.5) * width;
      const y = ((time * 0.1 + i * 0.1) % 1) * height;
      const size = 2 + Math.sin(time + i * 0.5) * 2;
      ctx.beginPath();
      ctx.arc(x, y, size * scale, 0, Math.PI * 2);
      ctx.fill();
    }

    // Continue animation
    if (isAnimating) {
      animationRef.current = requestAnimationFrame(drawFallback);
    }
  }, [colors, isAnimating]);

  // Handle resize
  useEffect(() => {
    const handleResize = () => {
      if (!containerRef.current || !canvasRef.current) return;
      
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;

      canvasRef.current.width = width * window.devicePixelRatio;
      canvasRef.current.height = height * window.devicePixelRatio;

      if (rendererRef.current && cameraRef.current) {
        rendererRef.current.setSize(width, height);
        cameraRef.current.aspect = width / height;
        cameraRef.current.updateProjectionMatrix();
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Initialize and start animation
  useEffect(() => {
    const success = initThreeJS();
    
    if (success && !useFallback) {
      animate();
    } else if (useFallback) {
      drawFallback();
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      rendererRef.current?.dispose();
    };
  }, [initThreeJS, animate, drawFallback, useFallback]);

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative w-full h-full min-h-[200px] bg-black rounded-xl overflow-hidden",
        className
      )}
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{ display: 'block' }}
      />

      {/* Loading overlay */}
      <AnimatePresence>
        {isLoading && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center bg-black/80"
          >
            <div className="text-center text-white">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
              <p className="text-sm opacity-70">Chargement 3D...</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Fallback indicator */}
      {useFallback && !isLoading && (
        <div className="absolute bottom-2 left-2 px-2 py-1 rounded bg-black/50 text-white/60 text-xs">
          Mode 2D
        </div>
      )}
    </div>
  );
};

export default ThreeJSPreview;
