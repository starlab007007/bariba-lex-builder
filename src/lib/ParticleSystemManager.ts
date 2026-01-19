/**
 * TAM-TAM Particle System Manager v1.0
 * High-performance particle effects with GPU acceleration, physics, and audio sync
 * 
 * @description Manages particle effects including WebM overlays, sprite particles,
 * GPU-accelerated systems, and physics-based simulations with timeline integration.
 */

import * as THREE from 'three';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Blend mode options for particle rendering
 */
export type BlendMode = 'normal' | 'add' | 'multiply' | 'screen';

/**
 * Easing function types
 */
export type EasingType = 
  | 'linear' 
  | 'ease-in' 
  | 'ease-out' 
  | 'ease-in-out'
  | 'bounce'
  | 'elastic'
  | 'back';

/**
 * Particle emitter shape
 */
export type EmitterShape = 'point' | 'sphere' | 'box' | 'cone' | 'circle' | 'line';

/**
 * Physics configuration
 */
export interface PhysicsConfig {
  /** Enable gravity */
  gravity?: THREE.Vector3;
  /** Wind force */
  wind?: THREE.Vector3;
  /** Air resistance (0-1) */
  drag?: number;
  /** Enable collision detection */
  collision?: boolean;
  /** Collision plane Y position */
  collisionPlane?: number;
  /** Bounce factor on collision (0-1) */
  bounceFactor?: number;
}

/**
 * Single particle data
 */
export interface Particle {
  /** Position */
  position: THREE.Vector3;
  /** Velocity */
  velocity: THREE.Vector3;
  /** Acceleration */
  acceleration: THREE.Vector3;
  /** Current size */
  size: number;
  /** Initial size */
  initialSize: number;
  /** Target size */
  targetSize: number;
  /** Current color */
  color: THREE.Color;
  /** Initial color */
  initialColor: THREE.Color;
  /** Target color */
  targetColor: THREE.Color;
  /** Current opacity */
  opacity: number;
  /** Initial opacity */
  initialOpacity: number;
  /** Rotation angle */
  rotation: number;
  /** Rotation speed */
  rotationSpeed: number;
  /** Time alive */
  age: number;
  /** Maximum lifetime */
  lifetime: number;
  /** Is particle active */
  alive: boolean;
}

/**
 * Particle system configuration
 */
export interface ParticleSystemConfig {
  /** Maximum particles in system */
  maxParticles?: number;
  /** Emission rate (particles per second) */
  emissionRate?: number;
  /** Emitter shape */
  emitterShape?: EmitterShape;
  /** Emitter size/radius */
  emitterSize?: number | THREE.Vector3;
  /** Particle lifetime range [min, max] seconds */
  lifetime?: [number, number];
  /** Initial velocity range */
  velocity?: {
    min: THREE.Vector3;
    max: THREE.Vector3;
  };
  /** Initial size range [min, max] */
  size?: [number, number];
  /** Size over lifetime curve */
  sizeOverLife?: number[];
  /** Initial color */
  color?: THREE.Color | string;
  /** Color over lifetime */
  colorOverLife?: Array<THREE.Color | string>;
  /** Initial opacity */
  opacity?: number;
  /** Opacity over lifetime curve */
  opacityOverLife?: number[];
  /** Rotation speed range [min, max] */
  rotationSpeed?: [number, number];
  /** Blend mode */
  blendMode?: BlendMode;
  /** Physics configuration */
  physics?: PhysicsConfig;
  /** Texture path or Texture object */
  texture?: string | THREE.Texture;
  /** Sprite sheet columns */
  spriteColumns?: number;
  /** Sprite sheet rows */
  spriteRows?: number;
  /** Enable GPU particles */
  useGPU?: boolean;
  /** Custom vertex shader */
  vertexShader?: string;
  /** Custom fragment shader */
  fragmentShader?: string;
}

/**
 * Play options for particle system
 */
export interface PlayOptions {
  /** Start delay in seconds */
  delay?: number;
  /** Duration (0 = infinite) */
  duration?: number;
  /** Loop the effect */
  loop?: boolean;
  /** Time scale multiplier */
  timeScale?: number;
  /** Position override */
  position?: THREE.Vector3;
  /** Beat-reactive intensity (0-1) */
  beatIntensity?: number;
  /** Easing for intensity */
  easing?: EasingType;
  /** Callback on complete */
  onComplete?: () => void;
}

/**
 * Keyframe for animation
 */
export interface Keyframe {
  /** Time in seconds */
  time: number;
  /** Properties to animate */
  properties: {
    emissionRate?: number;
    size?: [number, number];
    color?: THREE.Color | string;
    opacity?: number;
    velocity?: { min: THREE.Vector3; max: THREE.Vector3 };
  };
  /** Easing to next keyframe */
  easing?: EasingType;
}

/**
 * WebM particle overlay
 */
export interface WebMParticle {
  /** Video element */
  video: HTMLVideoElement;
  /** Video texture */
  texture: THREE.VideoTexture;
  /** Mesh for rendering */
  mesh: THREE.Mesh;
  /** Is playing */
  playing: boolean;
  /** Loop video */
  loop: boolean;
  /** Blend mode */
  blendMode: BlendMode;
}

/**
 * Particle system instance
 */
export interface ParticleSystem {
  /** System ID */
  id: string;
  /** System type */
  type: 'sprite' | 'points' | 'gpu' | 'webm';
  /** Configuration */
  config: ParticleSystemConfig;
  /** Three.js object (Points, Group, or Mesh) */
  object: THREE.Object3D;
  /** Active particles */
  particles: Particle[];
  /** Is system playing */
  playing: boolean;
  /** Is system paused */
  paused: boolean;
  /** Current time */
  time: number;
  /** Duration (0 = infinite) */
  duration: number;
  /** Loop enabled */
  loop: boolean;
  /** Time scale */
  timeScale: number;
  /** Beat intensity */
  beatIntensity: number;
  /** Current beat value (0-1) */
  currentBeat: number;
  /** Keyframes for animation */
  keyframes: Keyframe[];
  /** Completion callback */
  onComplete?: () => void;
  /** WebM particle data (if type === 'webm') */
  webm?: WebMParticle;
}

// ============================================================================
// EASING FUNCTIONS
// ============================================================================

const EASING_FUNCTIONS: Record<EasingType, (t: number) => number> = {
  'linear': (t) => t,
  'ease-in': (t) => t * t,
  'ease-out': (t) => t * (2 - t),
  'ease-in-out': (t) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
  'bounce': (t) => {
    if (t < 1 / 2.75) {
      return 7.5625 * t * t;
    } else if (t < 2 / 2.75) {
      return 7.5625 * (t -= 1.5 / 2.75) * t + 0.75;
    } else if (t < 2.5 / 2.75) {
      return 7.5625 * (t -= 2.25 / 2.75) * t + 0.9375;
    } else {
      return 7.5625 * (t -= 2.625 / 2.75) * t + 0.984375;
    }
  },
  'elastic': (t) => {
    if (t === 0 || t === 1) return t;
    return -Math.pow(2, 10 * (t - 1)) * Math.sin((t - 1.1) * 5 * Math.PI);
  },
  'back': (t) => {
    const s = 1.70158;
    return t * t * ((s + 1) * t - s);
  },
};

// ============================================================================
// SHADERS
// ============================================================================

const GPU_PARTICLE_VERTEX_SHADER = `
uniform float uTime;
uniform float uBeatIntensity;
uniform float uCurrentBeat;

attribute float aSize;
attribute float aLifetime;
attribute float aAge;
attribute vec3 aVelocity;
attribute vec3 aColor;
attribute float aOpacity;

varying vec3 vColor;
varying float vOpacity;
varying float vAge;

void main() {
  vColor = aColor;
  vOpacity = aOpacity;
  vAge = aAge / aLifetime;
  
  // Apply velocity over time
  vec3 pos = position + aVelocity * aAge;
  
  // Beat reactive scaling
  float beatScale = 1.0 + uCurrentBeat * uBeatIntensity * 0.5;
  
  // Size based on lifetime
  float lifeProgress = aAge / aLifetime;
  float sizeMultiplier = 1.0 - lifeProgress * lifeProgress; // Fade out
  
  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  gl_PointSize = aSize * sizeMultiplier * beatScale * (300.0 / -mvPosition.z);
}
`;

const GPU_PARTICLE_FRAGMENT_SHADER = `
uniform sampler2D uTexture;
uniform bool uUseTexture;

varying vec3 vColor;
varying float vOpacity;
varying float vAge;

void main() {
  vec2 uv = gl_PointCoord;
  
  vec4 color;
  if (uUseTexture) {
    color = texture2D(uTexture, uv);
    color.rgb *= vColor;
  } else {
    // Soft circle fallback
    float dist = length(uv - vec2(0.5));
    float alpha = 1.0 - smoothstep(0.4, 0.5, dist);
    color = vec4(vColor, alpha);
  }
  
  // Apply opacity and lifetime fade
  float lifeFade = 1.0 - vAge;
  color.a *= vOpacity * lifeFade;
  
  if (color.a < 0.01) discard;
  
  gl_FragColor = color;
}
`;

const BLEND_FRAGMENT_SHADER = `
uniform sampler2D uTexture;
uniform int uBlendMode;
uniform vec3 uColor;
uniform float uOpacity;

varying vec2 vUv;

void main() {
  vec4 texColor = texture2D(uTexture, vUv);
  vec3 color = texColor.rgb * uColor;
  float alpha = texColor.a * uOpacity;
  
  // Blend mode adjustments
  if (uBlendMode == 1) { // Add
    gl_FragColor = vec4(color, alpha);
  } else if (uBlendMode == 2) { // Multiply
    gl_FragColor = vec4(color * alpha, alpha);
  } else if (uBlendMode == 3) { // Screen
    gl_FragColor = vec4(1.0 - (1.0 - color) * (1.0 - vec3(alpha)), alpha);
  } else { // Normal
    gl_FragColor = vec4(color, alpha);
  }
}
`;

// ============================================================================
// PARTICLE POOL
// ============================================================================

class ParticlePool {
  private pool: Particle[] = [];
  private active: Set<Particle> = new Set();
  private maxSize: number;

  constructor(maxSize: number = 10000) {
    this.maxSize = maxSize;
    this.preAllocate(Math.min(1000, maxSize));
  }

  private preAllocate(count: number): void {
    for (let i = 0; i < count; i++) {
      this.pool.push(this.createParticle());
    }
  }

  private createParticle(): Particle {
    return {
      position: new THREE.Vector3(),
      velocity: new THREE.Vector3(),
      acceleration: new THREE.Vector3(),
      size: 1,
      initialSize: 1,
      targetSize: 1,
      color: new THREE.Color(1, 1, 1),
      initialColor: new THREE.Color(1, 1, 1),
      targetColor: new THREE.Color(1, 1, 1),
      opacity: 1,
      initialOpacity: 1,
      rotation: 0,
      rotationSpeed: 0,
      age: 0,
      lifetime: 1,
      alive: false,
    };
  }

  acquire(): Particle | null {
    if (this.active.size >= this.maxSize) {
      return null;
    }

    let particle = this.pool.pop();
    if (!particle) {
      particle = this.createParticle();
    }

    particle.alive = true;
    particle.age = 0;
    this.active.add(particle);
    return particle;
  }

  release(particle: Particle): void {
    particle.alive = false;
    this.active.delete(particle);
    this.pool.push(particle);
  }

  getActive(): Particle[] {
    return Array.from(this.active);
  }

  getActiveCount(): number {
    return this.active.size;
  }

  clear(): void {
    for (const particle of this.active) {
      particle.alive = false;
      this.pool.push(particle);
    }
    this.active.clear();
  }

  getStats(): { active: number; pooled: number; max: number } {
    return {
      active: this.active.size,
      pooled: this.pool.length,
      max: this.maxSize,
    };
  }
}

// ============================================================================
// PARTICLE SYSTEM MANAGER CLASS
// ============================================================================

/**
 * TAM-TAM Particle System Manager
 * 
 * @example
 * ```typescript
 * const manager = new ParticleSystemManager(renderer);
 * 
 * // Load WebM particle
 * const system = await manager.loadParticleEffect('/assets/envato/particles/particle-001.webm');
 * 
 * // Play with options
 * manager.play(system.id, {
 *   loop: true,
 *   beatIntensity: 0.5,
 *   position: new THREE.Vector3(0, 2, 0)
 * });
 * 
 * // Update in render loop
 * function animate() {
 *   manager.update(deltaTime);
 *   manager.render(scene, camera);
 * }
 * ```
 */
export class ParticleSystemManager {
  /** Active particle systems */
  private systems: Map<string, ParticleSystem> = new Map();
  
  /** WebGL renderer reference */
  private renderer: THREE.WebGLRenderer | null = null;
  
  /** Particle pool for sprite/points systems */
  private particlePool: ParticlePool;
  
  /** Texture cache */
  private textureCache: Map<string, THREE.Texture> = new Map();
  
  /** Texture loader */
  private textureLoader: THREE.TextureLoader;
  
  /** Default particle texture */
  private defaultTexture: THREE.Texture | null = null;
  
  /** Beat value from audio (0-1) */
  private currentBeat: number = 0;
  
  /** Global time scale */
  private globalTimeScale: number = 1;
  
  /** Scene to add systems to */
  private scene: THREE.Scene | null = null;
  
  /** System ID counter */
  private idCounter: number = 0;

  /**
   * Create a new ParticleSystemManager
   * @param renderer - THREE.WebGLRenderer instance (optional)
   */
  constructor(renderer?: THREE.WebGLRenderer) {
    this.renderer = renderer || null;
    this.particlePool = new ParticlePool(10000);
    this.textureLoader = new THREE.TextureLoader();
    
    // Create default circular particle texture
    this.createDefaultTexture();
    
    console.log('✅ ParticleSystemManager initialized');
  }

  /**
   * Set the renderer
   */
  setRenderer(renderer: THREE.WebGLRenderer): void {
    this.renderer = renderer;
  }

  /**
   * Set the scene for automatic adding of systems
   */
  setScene(scene: THREE.Scene): void {
    this.scene = scene;
  }

  /**
   * Create default circular particle texture
   */
  private createDefaultTexture(): void {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    
    // Radial gradient for soft particle
    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.5)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);
    
    this.defaultTexture = new THREE.CanvasTexture(canvas);
    this.defaultTexture.needsUpdate = true;
  }

  // ==========================================================================
  // PARTICLE EFFECT LOADING
  // ==========================================================================

  /**
   * Load a particle effect from path
   * Supports: .webm (video), .png/.jpg (sprite), or creates procedural system
   * 
   * @param path - Path to particle asset or config
   * @param config - Optional system configuration
   * @returns Created particle system
   */
  async loadParticleEffect(
    path: string,
    config?: Partial<ParticleSystemConfig>
  ): Promise<ParticleSystem> {
    const extension = path.split('.').pop()?.toLowerCase();
    
    if (extension === 'webm' || extension === 'mp4') {
      return this.loadWebMParticle(path, config);
    } else if (['png', 'jpg', 'jpeg', 'webp'].includes(extension || '')) {
      return this.loadSpriteParticle(path, config);
    } else {
      // Treat as procedural/GPU system
      return this.createPointsSystem(config);
    }
  }

  /**
   * Load WebM video as particle overlay
   */
  private async loadWebMParticle(
    path: string,
    config?: Partial<ParticleSystemConfig>
  ): Promise<ParticleSystem> {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.crossOrigin = 'anonymous';
      video.loop = true;
      video.muted = true;
      video.playsInline = true;
      video.preload = 'auto';
      
      video.onloadeddata = () => {
        const texture = new THREE.VideoTexture(video);
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.format = THREE.RGBAFormat;
        
        // Create fullscreen quad mesh
        const geometry = new THREE.PlaneGeometry(2, 2);
        const material = this.createBlendMaterial(
          texture,
          config?.blendMode || 'screen'
        );
        
        const mesh = new THREE.Mesh(geometry, material);
        mesh.frustumCulled = false;
        mesh.renderOrder = 1000; // Render on top
        
        const systemId = this.generateId('webm');
        
        const system: ParticleSystem = {
          id: systemId,
          type: 'webm',
          config: { ...config } as ParticleSystemConfig,
          object: mesh,
          particles: [],
          playing: false,
          paused: false,
          time: 0,
          duration: video.duration || 0,
          loop: true,
          timeScale: 1,
          beatIntensity: 0,
          currentBeat: 0,
          keyframes: [],
          webm: {
            video,
            texture,
            mesh,
            playing: false,
            loop: true,
            blendMode: config?.blendMode || 'screen',
          },
        };
        
        this.systems.set(systemId, system);
        
        if (this.scene) {
          this.scene.add(mesh);
        }
        
        console.log(`✅ WebM particle loaded: ${path}`);
        resolve(system);
      };
      
      video.onerror = () => {
        reject(new Error(`Failed to load WebM particle: ${path}`));
      };
      
      video.src = path;
    });
  }

  /**
   * Load sprite-based particle system
   */
  private async loadSpriteParticle(
    path: string,
    config?: Partial<ParticleSystemConfig>
  ): Promise<ParticleSystem> {
    const texture = await this.loadTexture(path);
    return this.createPointsSystem({ ...config, texture });
  }

  /**
   * Create GPU-accelerated points system
   */
  private createPointsSystem(config?: Partial<ParticleSystemConfig>): ParticleSystem {
    const systemConfig: ParticleSystemConfig = {
      maxParticles: 1000,
      emissionRate: 100,
      emitterShape: 'point',
      emitterSize: 1,
      lifetime: [1, 3],
      velocity: {
        min: new THREE.Vector3(-1, 1, -1),
        max: new THREE.Vector3(1, 3, 1),
      },
      size: [10, 30],
      color: new THREE.Color(1, 1, 1),
      opacity: 1,
      blendMode: 'add',
      physics: {
        gravity: new THREE.Vector3(0, -9.8, 0),
        drag: 0.02,
      },
      useGPU: true,
      ...config,
    };
    
    const maxParticles = systemConfig.maxParticles!;
    
    // Create geometry with attributes
    const geometry = new THREE.BufferGeometry();
    
    const positions = new Float32Array(maxParticles * 3);
    const sizes = new Float32Array(maxParticles);
    const lifetimes = new Float32Array(maxParticles);
    const ages = new Float32Array(maxParticles);
    const velocities = new Float32Array(maxParticles * 3);
    const colors = new Float32Array(maxParticles * 3);
    const opacities = new Float32Array(maxParticles);
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('aLifetime', new THREE.BufferAttribute(lifetimes, 1));
    geometry.setAttribute('aAge', new THREE.BufferAttribute(ages, 1));
    geometry.setAttribute('aVelocity', new THREE.BufferAttribute(velocities, 3));
    geometry.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('aOpacity', new THREE.BufferAttribute(opacities, 1));
    
    // Create shader material
    const texture = systemConfig.texture instanceof THREE.Texture 
      ? systemConfig.texture 
      : this.defaultTexture;
    
    const material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uBeatIntensity: { value: 0 },
        uCurrentBeat: { value: 0 },
        uTexture: { value: texture },
        uUseTexture: { value: !!texture },
      },
      vertexShader: systemConfig.vertexShader || GPU_PARTICLE_VERTEX_SHADER,
      fragmentShader: systemConfig.fragmentShader || GPU_PARTICLE_FRAGMENT_SHADER,
      transparent: true,
      depthWrite: false,
      blending: this.getBlending(systemConfig.blendMode || 'add'),
    });
    
    const points = new THREE.Points(geometry, material);
    points.frustumCulled = true;
    
    const systemId = this.generateId('points');
    
    const system: ParticleSystem = {
      id: systemId,
      type: systemConfig.useGPU ? 'gpu' : 'points',
      config: systemConfig,
      object: points,
      particles: [],
      playing: false,
      paused: false,
      time: 0,
      duration: 0,
      loop: true,
      timeScale: 1,
      beatIntensity: 0,
      currentBeat: 0,
      keyframes: [],
    };
    
    this.systems.set(systemId, system);
    
    if (this.scene) {
      this.scene.add(points);
    }
    
    console.log(`✅ Points particle system created: ${systemId}`);
    return system;
  }

  // ==========================================================================
  // PLAYBACK CONTROL
  // ==========================================================================

  /**
   * Play a particle system
   * 
   * @param systemId - System ID to play
   * @param options - Playback options
   */
  play(systemId: string, options?: PlayOptions): void {
    const system = this.systems.get(systemId);
    if (!system) {
      console.warn(`Particle system not found: ${systemId}`);
      return;
    }
    
    const opts = options || {};
    
    system.playing = true;
    system.paused = false;
    system.time = 0;
    system.duration = opts.duration || 0;
    system.loop = opts.loop ?? true;
    system.timeScale = opts.timeScale ?? 1;
    system.beatIntensity = opts.beatIntensity ?? 0;
    system.onComplete = opts.onComplete;
    
    if (opts.position && system.object) {
      system.object.position.copy(opts.position);
    }
    
    // Handle WebM
    if (system.type === 'webm' && system.webm) {
      system.webm.video.currentTime = 0;
      system.webm.video.loop = system.loop;
      
      if (opts.delay && opts.delay > 0) {
        setTimeout(() => {
          system.webm?.video.play().catch(console.warn);
          system.webm!.playing = true;
        }, opts.delay * 1000);
      } else {
        system.webm.video.play().catch(console.warn);
        system.webm.playing = true;
      }
    }
    
    console.log(`▶️ Playing particle system: ${systemId}`);
  }

  /**
   * Pause a particle system
   */
  pause(systemId: string): void {
    const system = this.systems.get(systemId);
    if (!system) return;
    
    system.paused = true;
    
    if (system.type === 'webm' && system.webm) {
      system.webm.video.pause();
      system.webm.playing = false;
    }
    
    console.log(`⏸️ Paused particle system: ${systemId}`);
  }

  /**
   * Resume a paused particle system
   */
  resume(systemId: string): void {
    const system = this.systems.get(systemId);
    if (!system || !system.paused) return;
    
    system.paused = false;
    
    if (system.type === 'webm' && system.webm) {
      system.webm.video.play().catch(console.warn);
      system.webm.playing = true;
    }
    
    console.log(`▶️ Resumed particle system: ${systemId}`);
  }

  /**
   * Stop a particle system
   */
  stop(systemId: string): void {
    const system = this.systems.get(systemId);
    if (!system) return;
    
    system.playing = false;
    system.paused = false;
    system.time = 0;
    
    if (system.type === 'webm' && system.webm) {
      system.webm.video.pause();
      system.webm.video.currentTime = 0;
      system.webm.playing = false;
    }
    
    // Clear particles
    system.particles = [];
    
    console.log(`⏹️ Stopped particle system: ${systemId}`);
  }

  /**
   * Stop all particle systems
   */
  stopAll(): void {
    for (const [id] of this.systems) {
      this.stop(id);
    }
  }

  // ==========================================================================
  // UPDATE & RENDER
  // ==========================================================================

  /**
   * Update all particle systems
   * Call this in your animation loop
   * 
   * @param deltaTime - Time since last update in seconds
   */
  update(deltaTime: number): void {
    const scaledDelta = deltaTime * this.globalTimeScale;
    
    for (const [, system] of this.systems) {
      if (!system.playing || system.paused) continue;
      
      const systemDelta = scaledDelta * system.timeScale;
      system.time += systemDelta;
      system.currentBeat = this.currentBeat;
      
      // Check duration
      if (system.duration > 0 && system.time >= system.duration) {
        if (system.loop) {
          system.time = 0;
        } else {
          this.stop(system.id);
          system.onComplete?.();
          continue;
        }
      }
      
      // Update based on type
      switch (system.type) {
        case 'webm':
          this.updateWebMSystem(system, systemDelta);
          break;
        case 'gpu':
        case 'points':
          this.updatePointsSystem(system, systemDelta);
          break;
        case 'sprite':
          this.updateSpriteSystem(system, systemDelta);
          break;
      }
      
      // Update keyframes
      this.updateKeyframes(system);
    }
  }

  /**
   * Update WebM particle system
   */
  private updateWebMSystem(system: ParticleSystem, _deltaTime: number): void {
    if (!system.webm) return;
    
    // Update texture
    system.webm.texture.needsUpdate = true;
    
    // Apply beat reactivity
    if (system.beatIntensity > 0) {
      const beatScale = 1 + this.currentBeat * system.beatIntensity * 0.3;
      system.object.scale.setScalar(beatScale);
    }
  }

  /**
   * Update GPU/Points particle system
   */
  private updatePointsSystem(system: ParticleSystem, deltaTime: number): void {
    const points = system.object as THREE.Points;
    const geometry = points.geometry;
    const material = points.material as THREE.ShaderMaterial;
    const config = system.config;
    
    // Update uniforms
    material.uniforms.uTime.value = system.time;
    material.uniforms.uBeatIntensity.value = system.beatIntensity;
    material.uniforms.uCurrentBeat.value = this.currentBeat;
    
    // Get attributes
    const positions = geometry.attributes.position.array as Float32Array;
    const sizes = geometry.attributes.aSize.array as Float32Array;
    const lifetimes = geometry.attributes.aLifetime.array as Float32Array;
    const ages = geometry.attributes.aAge.array as Float32Array;
    const velocities = geometry.attributes.aVelocity.array as Float32Array;
    const colors = geometry.attributes.aColor.array as Float32Array;
    const opacities = geometry.attributes.aOpacity.array as Float32Array;
    
    // Emit new particles
    const emitCount = Math.floor(config.emissionRate! * deltaTime);
    let aliveCount = 0;
    
    for (let i = 0; i < config.maxParticles!; i++) {
      // Check if particle is alive
      if (ages[i] < lifetimes[i] && lifetimes[i] > 0) {
        // Update age
        ages[i] += deltaTime;
        
        // Apply physics
        if (config.physics) {
          const gravity = config.physics.gravity;
          if (gravity) {
            velocities[i * 3 + 1] += gravity.y * deltaTime;
          }
          
          // Drag
          const drag = 1 - (config.physics.drag || 0);
          velocities[i * 3] *= drag;
          velocities[i * 3 + 1] *= drag;
          velocities[i * 3 + 2] *= drag;
          
          // Collision
          if (config.physics.collision) {
            const plane = config.physics.collisionPlane ?? 0;
            if (positions[i * 3 + 1] < plane) {
              positions[i * 3 + 1] = plane;
              velocities[i * 3 + 1] *= -(config.physics.bounceFactor || 0.5);
            }
          }
        }
        
        // Update position
        positions[i * 3] += velocities[i * 3] * deltaTime;
        positions[i * 3 + 1] += velocities[i * 3 + 1] * deltaTime;
        positions[i * 3 + 2] += velocities[i * 3 + 2] * deltaTime;
        
        aliveCount++;
      } else if (aliveCount < emitCount) {
        // Spawn new particle
        this.spawnParticle(i, positions, sizes, lifetimes, ages, velocities, colors, opacities, config);
        aliveCount++;
      } else {
        // Dead particle - hide it
        positions[i * 3 + 1] = -10000;
        lifetimes[i] = 0;
      }
    }
    
    // Update buffers
    geometry.attributes.position.needsUpdate = true;
    geometry.attributes.aSize.needsUpdate = true;
    geometry.attributes.aLifetime.needsUpdate = true;
    geometry.attributes.aAge.needsUpdate = true;
    geometry.attributes.aVelocity.needsUpdate = true;
    
    // Update draw range for culling
    geometry.setDrawRange(0, Math.min(aliveCount + 100, config.maxParticles!));
  }

  /**
   * Spawn a new particle
   */
  private spawnParticle(
    index: number,
    positions: Float32Array,
    sizes: Float32Array,
    lifetimes: Float32Array,
    ages: Float32Array,
    velocities: Float32Array,
    colors: Float32Array,
    opacities: Float32Array,
    config: ParticleSystemConfig
  ): void {
    // Position based on emitter shape
    const pos = this.getEmitterPosition(config);
    positions[index * 3] = pos.x;
    positions[index * 3 + 1] = pos.y;
    positions[index * 3 + 2] = pos.z;
    
    // Lifetime
    const [minLife, maxLife] = config.lifetime || [1, 3];
    lifetimes[index] = minLife + Math.random() * (maxLife - minLife);
    ages[index] = 0;
    
    // Size
    const [minSize, maxSize] = config.size || [10, 30];
    sizes[index] = minSize + Math.random() * (maxSize - minSize);
    
    // Velocity
    const velMin = config.velocity?.min || new THREE.Vector3(-1, 1, -1);
    const velMax = config.velocity?.max || new THREE.Vector3(1, 3, 1);
    velocities[index * 3] = velMin.x + Math.random() * (velMax.x - velMin.x);
    velocities[index * 3 + 1] = velMin.y + Math.random() * (velMax.y - velMin.y);
    velocities[index * 3 + 2] = velMin.z + Math.random() * (velMax.z - velMin.z);
    
    // Color
    const color = config.color instanceof THREE.Color 
      ? config.color 
      : new THREE.Color(config.color || 0xffffff);
    colors[index * 3] = color.r;
    colors[index * 3 + 1] = color.g;
    colors[index * 3 + 2] = color.b;
    
    // Opacity
    opacities[index] = config.opacity ?? 1;
  }

  /**
   * Get position based on emitter shape
   */
  private getEmitterPosition(config: ParticleSystemConfig): THREE.Vector3 {
    const size = typeof config.emitterSize === 'number' 
      ? config.emitterSize 
      : (config.emitterSize?.x || 1);
    
    switch (config.emitterShape) {
      case 'sphere':
        return new THREE.Vector3(
          (Math.random() - 0.5) * 2,
          (Math.random() - 0.5) * 2,
          (Math.random() - 0.5) * 2
        ).normalize().multiplyScalar(Math.random() * size);
        
      case 'box':
        const boxSize = config.emitterSize instanceof THREE.Vector3 
          ? config.emitterSize 
          : new THREE.Vector3(size, size, size);
        return new THREE.Vector3(
          (Math.random() - 0.5) * boxSize.x,
          (Math.random() - 0.5) * boxSize.y,
          (Math.random() - 0.5) * boxSize.z
        );
        
      case 'circle':
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.random() * size;
        return new THREE.Vector3(
          Math.cos(angle) * radius,
          0,
          Math.sin(angle) * radius
        );
        
      case 'cone':
        const coneAngle = Math.random() * Math.PI * 2;
        const coneHeight = Math.random();
        const coneRadius = coneHeight * size * 0.5;
        return new THREE.Vector3(
          Math.cos(coneAngle) * coneRadius,
          coneHeight * size,
          Math.sin(coneAngle) * coneRadius
        );
        
      case 'line':
        return new THREE.Vector3(
          (Math.random() - 0.5) * size * 2,
          0,
          0
        );
        
      case 'point':
      default:
        return new THREE.Vector3(0, 0, 0);
    }
  }

  /**
   * Update sprite-based system
   */
  private updateSpriteSystem(system: ParticleSystem, _deltaTime: number): void {
    // Sprite systems are handled similarly to points
    // but use individual sprite meshes
  }

  /**
   * Update keyframe animations
   */
  private updateKeyframes(system: ParticleSystem): void {
    if (system.keyframes.length === 0) return;
    
    const time = system.time;
    
    // Find current and next keyframe
    let prevKeyframe: Keyframe | null = null;
    let nextKeyframe: Keyframe | null = null;
    
    for (let i = 0; i < system.keyframes.length; i++) {
      if (system.keyframes[i].time <= time) {
        prevKeyframe = system.keyframes[i];
      }
      if (system.keyframes[i].time > time && !nextKeyframe) {
        nextKeyframe = system.keyframes[i];
        break;
      }
    }
    
    if (!prevKeyframe || !nextKeyframe) return;
    
    // Interpolate
    const duration = nextKeyframe.time - prevKeyframe.time;
    const progress = (time - prevKeyframe.time) / duration;
    const easedProgress = EASING_FUNCTIONS[prevKeyframe.easing || 'linear'](progress);
    
    // Apply interpolated values
    const props = prevKeyframe.properties;
    const nextProps = nextKeyframe.properties;
    
    if (props.emissionRate !== undefined && nextProps.emissionRate !== undefined) {
      system.config.emissionRate = THREE.MathUtils.lerp(
        props.emissionRate,
        nextProps.emissionRate,
        easedProgress
      );
    }
    
    if (props.opacity !== undefined && nextProps.opacity !== undefined) {
      system.config.opacity = THREE.MathUtils.lerp(
        props.opacity,
        nextProps.opacity,
        easedProgress
      );
    }
  }

  // ==========================================================================
  // AUDIO SYNC
  // ==========================================================================

  /**
   * Set current beat value for beat-reactive effects
   * 
   * @param beat - Beat intensity (0-1)
   */
  setBeat(beat: number): void {
    this.currentBeat = Math.max(0, Math.min(1, beat));
  }

  /**
   * Set global time scale
   */
  setGlobalTimeScale(scale: number): void {
    this.globalTimeScale = scale;
  }

  // ==========================================================================
  // KEYFRAMES
  // ==========================================================================

  /**
   * Add keyframe to a system
   */
  addKeyframe(systemId: string, keyframe: Keyframe): void {
    const system = this.systems.get(systemId);
    if (!system) return;
    
    system.keyframes.push(keyframe);
    system.keyframes.sort((a, b) => a.time - b.time);
  }

  /**
   * Clear all keyframes from a system
   */
  clearKeyframes(systemId: string): void {
    const system = this.systems.get(systemId);
    if (!system) return;
    
    system.keyframes = [];
  }

  // ==========================================================================
  // HELPERS
  // ==========================================================================

  /**
   * Create blend material for WebM particles
   */
  private createBlendMaterial(
    texture: THREE.Texture,
    blendMode: BlendMode
  ): THREE.ShaderMaterial {
    const blendModeInt = { normal: 0, add: 1, multiply: 2, screen: 3 }[blendMode];
    
    return new THREE.ShaderMaterial({
      uniforms: {
        uTexture: { value: texture },
        uBlendMode: { value: blendModeInt },
        uColor: { value: new THREE.Color(1, 1, 1) },
        uOpacity: { value: 1.0 },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position.xy, 0.0, 1.0);
        }
      `,
      fragmentShader: BLEND_FRAGMENT_SHADER,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      blending: this.getBlending(blendMode),
    });
  }

  /**
   * Get Three.js blending mode
   */
  private getBlending(mode: BlendMode): THREE.Blending {
    switch (mode) {
      case 'add':
        return THREE.AdditiveBlending;
      case 'multiply':
        return THREE.MultiplyBlending;
      case 'screen':
        return THREE.AdditiveBlending; // Closest approximation
      case 'normal':
      default:
        return THREE.NormalBlending;
    }
  }

  /**
   * Load texture with caching
   */
  private async loadTexture(path: string): Promise<THREE.Texture> {
    const cached = this.textureCache.get(path);
    if (cached) return cached;
    
    return new Promise((resolve, reject) => {
      this.textureLoader.load(
        path,
        (texture) => {
          this.textureCache.set(path, texture);
          resolve(texture);
        },
        undefined,
        reject
      );
    });
  }

  /**
   * Generate unique system ID
   */
  private generateId(prefix: string): string {
    return `${prefix}-${++this.idCounter}-${Date.now().toString(36)}`;
  }

  // ==========================================================================
  // SYSTEM MANAGEMENT
  // ==========================================================================

  /**
   * Get a particle system by ID
   */
  getSystem(systemId: string): ParticleSystem | undefined {
    return this.systems.get(systemId);
  }

  /**
   * Get all active systems
   */
  getAllSystems(): ParticleSystem[] {
    return Array.from(this.systems.values());
  }

  /**
   * Remove a particle system
   */
  removeSystem(systemId: string): void {
    const system = this.systems.get(systemId);
    if (!system) return;
    
    this.stop(systemId);
    
    // Remove from scene
    if (this.scene && system.object) {
      this.scene.remove(system.object);
    }
    
    // Dispose resources
    if (system.type === 'webm' && system.webm) {
      system.webm.video.pause();
      system.webm.video.src = '';
      system.webm.texture.dispose();
      (system.webm.mesh.material as THREE.Material).dispose();
      system.webm.mesh.geometry.dispose();
    } else if (system.object instanceof THREE.Points) {
      (system.object.material as THREE.Material).dispose();
      system.object.geometry.dispose();
    }
    
    this.systems.delete(systemId);
    console.log(`🗑️ Removed particle system: ${systemId}`);
  }

  /**
   * Get statistics
   */
  getStats(): {
    systemCount: number;
    activeParticles: number;
    poolStats: { active: number; pooled: number; max: number };
  } {
    let activeParticles = 0;
    
    for (const system of this.systems.values()) {
      if (system.type === 'points' || system.type === 'gpu') {
        const geometry = (system.object as THREE.Points).geometry;
        activeParticles += geometry.drawRange.count;
      }
    }
    
    return {
      systemCount: this.systems.size,
      activeParticles,
      poolStats: this.particlePool.getStats(),
    };
  }

  // ==========================================================================
  // CLEANUP
  // ==========================================================================

  /**
   * Dispose of all resources
   */
  dispose(): void {
    for (const [id] of this.systems) {
      this.removeSystem(id);
    }
    
    this.systems.clear();
    this.textureCache.clear();
    this.particlePool.clear();
    
    if (this.defaultTexture) {
      this.defaultTexture.dispose();
      this.defaultTexture = null;
    }
    
    console.log('🧹 ParticleSystemManager disposed');
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

/**
 * Default ParticleSystemManager instance
 */
export const particleSystemManager = new ParticleSystemManager();

/**
 * Create a new ParticleSystemManager instance
 */
export function createParticleSystemManager(
  renderer?: THREE.WebGLRenderer
): ParticleSystemManager {
  return new ParticleSystemManager(renderer);
}

export default ParticleSystemManager;
