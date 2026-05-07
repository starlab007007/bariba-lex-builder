/**
 * Griot 3D Render Layer - v5.0
 * Couche de rendu Three.js intégrée au pipeline MediaRecorder
 * Permet le composite 3D → Canvas 2D pour export vidéo
 */

import * as THREE from 'three';
import { 
  createGriotCharacter, 
  createVillageScene, 
  createSkyDome, 
  createParticleSystem, 
  updateParticles,
  STYLE_PALETTES
} from './GriotFallbackScene';
import type { StorySegment } from './StoryAnalyzer';

// ============================================================================
// TYPES
// ============================================================================

export interface Griot3DLayerConfig {
  width: number;
  height: number;
  style: 'traditional' | 'modern' | 'fantasy' | 'historical';
}

export interface CharacterAnimation {
  emotion: StorySegment['emotion'];
  headRotation: { x: number; y: number; z: number };
  bodyScale: number;
  orbGlow: number;
  breathingPhase: number;
}

export interface LightingConfig {
  mainColor: number;
  intensity: number;
  ambientColor: number;
  ambientIntensity: number;
}

// ============================================================================
// EMOTION -> 3D LIGHTING MAPPING
// ============================================================================

export const EMOTION_LIGHTING: Record<StorySegment['emotion'], LightingConfig> = {
  joy: {
    mainColor: 0xFFD700,
    intensity: 1.5,
    ambientColor: 0xFFF8DC,
    ambientIntensity: 0.6
  },
  wisdom: {
    mainColor: 0xD4A574,
    intensity: 1.2,
    ambientColor: 0xE8DCC8,
    ambientIntensity: 0.5
  },
  tension: {
    mainColor: 0xFF4444,
    intensity: 1.8,
    ambientColor: 0x331111,
    ambientIntensity: 0.3
  },
  sadness: {
    mainColor: 0x6495ED,
    intensity: 0.9,
    ambientColor: 0xB0C4DE,
    ambientIntensity: 0.4
  },
  excitement: {
    mainColor: 0xFF8C00,
    intensity: 2.0,
    ambientColor: 0xFFE4B5,
    ambientIntensity: 0.7
  },
  neutral: {
    mainColor: 0xE8D4B8,
    intensity: 1.0,
    ambientColor: 0xF5F5DC,
    ambientIntensity: 0.5
  }
};

// ============================================================================
// EMOTION -> CHARACTER ANIMATION MAPPING
// ============================================================================

export const EMOTION_ANIMATIONS: Record<StorySegment['emotion'], {
  headTilt: number;
  bodyPulse: number;
  orbIntensity: number;
  gestureSpeed: number;
}> = {
  joy: {
    headTilt: 0.1,
    bodyPulse: 1.08,
    orbIntensity: 1.5,
    gestureSpeed: 1.5
  },
  wisdom: {
    headTilt: -0.15,
    bodyPulse: 1.02,
    orbIntensity: 0.8,
    gestureSpeed: 0.6
  },
  tension: {
    headTilt: 0,
    bodyPulse: 1.04,
    orbIntensity: 2.0,
    gestureSpeed: 0.3
  },
  sadness: {
    headTilt: -0.2,
    bodyPulse: 0.98,
    orbIntensity: 0.5,
    gestureSpeed: 0.4
  },
  excitement: {
    headTilt: 0.15,
    bodyPulse: 1.12,
    orbIntensity: 2.5,
    gestureSpeed: 2.0
  },
  neutral: {
    headTilt: 0,
    bodyPulse: 1.0,
    orbIntensity: 1.0,
    gestureSpeed: 1.0
  }
};

// ============================================================================
// GRIOT 3D RENDER LAYER CLASS
// ============================================================================

export class Griot3DRenderLayer {
  private renderer: THREE.WebGLRenderer | null = null;
  private scene: THREE.Scene | null = null;
  private camera: THREE.PerspectiveCamera | null = null;
  
  // Scene objects
  private character: THREE.Group | null = null;
  private environment: THREE.Group | null = null;
  private sky: THREE.Mesh | null = null;
  private particles: THREE.Points | null = null;
  
  // Lights
  private mainLight: THREE.DirectionalLight | null = null;
  private ambientLight: THREE.AmbientLight | null = null;
  private pointLight: THREE.PointLight | null = null;
  
  // State
  private initialized: boolean = false;
  private currentEmotion: StorySegment['emotion'] = 'neutral';
  private config: Griot3DLayerConfig;
  
  // Animation state
  private clock: THREE.Clock;
  private lastTime: number = 0;

  constructor(config: Griot3DLayerConfig) {
    this.config = config;
    this.clock = new THREE.Clock();
  }

  /**
   * Initialize the 3D rendering layer
   */
  async initialize(): Promise<boolean> {
    try {
      console.log('[Griot3DRenderLayer] Initializing 3D layer...');
      
      // Create offscreen canvas for Three.js
      const threeCanvas = document.createElement('canvas');
      threeCanvas.width = this.config.width;
      threeCanvas.height = this.config.height;
      
      // Initialize WebGL renderer
      this.renderer = new THREE.WebGLRenderer({
        canvas: threeCanvas,
        preserveDrawingBuffer: true, // CRUCIAL for MediaRecorder
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance'
      });
      
      this.renderer.setSize(this.config.width, this.config.height);
      this.renderer.setPixelRatio(1); // Fixed for video export
      this.renderer.outputColorSpace = THREE.SRGBColorSpace;
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = 1.2;
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      
      // Create scene
      this.scene = new THREE.Scene();
      const palette = STYLE_PALETTES[this.config.style] || STYLE_PALETTES.traditional;
      this.scene.fog = new THREE.Fog(palette.fog, 8, 25);
      
      // Create camera (portrait aspect ratio)
      const aspect = this.config.width / this.config.height;
      this.camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 100);
      this.camera.position.set(0, 2.5, 6);
      this.camera.lookAt(0, 1.2, 0);
      
      // Create scene elements
      await this.createSceneElements();
      
      // Setup lighting
      this.setupLighting();
      
      this.initialized = true;
      console.log('[Griot3DRenderLayer] ✅ 3D layer initialized');
      return true;
      
    } catch (error) {
      console.error('[Griot3DRenderLayer] ❌ Initialization failed:', error);
      return false;
    }
  }

  /**
   * Create all scene elements
   */
  private async createSceneElements(): Promise<void> {
    if (!this.scene) return;
    
    // Create character
    this.character = createGriotCharacter(this.config.style);
    this.character.position.set(0, 0, 0);
    this.scene.add(this.character);
    
    // Create environment (village)
    this.environment = createVillageScene(this.config.style);
    this.environment.position.set(0, 0, -3);
    this.scene.add(this.environment);
    
    // Create sky dome
    this.sky = createSkyDome(this.config.style);
    this.scene.add(this.sky);
    
    // Create particle system
    this.particles = createParticleSystem(this.config.style);
    this.scene.add(this.particles);
    
    console.log('[Griot3DRenderLayer] Scene elements created');
  }

  /**
   * Setup lighting
   */
  private setupLighting(): void {
    if (!this.scene) return;
    
    // Main directional light
    this.mainLight = new THREE.DirectionalLight(0xFFD700, 1.2);
    this.mainLight.position.set(5, 8, 5);
    this.mainLight.castShadow = true;
    this.mainLight.shadow.mapSize.width = 1024;
    this.mainLight.shadow.mapSize.height = 1024;
    this.scene.add(this.mainLight);
    
    // Ambient light
    this.ambientLight = new THREE.AmbientLight(0xF5F5DC, 0.5);
    this.scene.add(this.ambientLight);
    
    // Point light near character (for orb glow effect)
    this.pointLight = new THREE.PointLight(0xFFD700, 0.8, 5);
    this.pointLight.position.set(0.55, 1.45, 0);
    this.scene.add(this.pointLight);
    
    console.log('[Griot3DRenderLayer] Lighting setup complete');
  }

  /**
   * Update lighting based on emotion
   */
  private updateLighting(emotion: StorySegment['emotion'], intensity: number): void {
    if (!this.mainLight || !this.ambientLight || !this.pointLight) return;
    
    const config = EMOTION_LIGHTING[emotion];
    
    // Animate to new lighting values
    this.mainLight.color.setHex(config.mainColor);
    this.mainLight.intensity = config.intensity * (0.8 + intensity * 0.4);
    
    this.ambientLight.color.setHex(config.ambientColor);
    this.ambientLight.intensity = config.ambientIntensity;
    
    // Orb glow based on emotion
    const anim = EMOTION_ANIMATIONS[emotion];
    this.pointLight.intensity = anim.orbIntensity * (0.5 + intensity * 0.5);
  }

  /**
   * Animate character based on emotion and time
   */
  private animateCharacter(
    currentTime: number,
    emotion: StorySegment['emotion'],
    intensity: number
  ): void {
    if (!this.character) return;
    
    const anim = EMOTION_ANIMATIONS[emotion];
    const breathingCycle = Math.sin(currentTime * 2) * 0.02;
    const gestureTime = currentTime * anim.gestureSpeed;
    
    // Find head mesh and animate
    const head = this.character.getObjectByName('head');
    if (head) {
      // Head tilt based on emotion + subtle movement
      head.rotation.x = anim.headTilt + Math.sin(gestureTime * 0.5) * 0.05;
      head.rotation.y = Math.sin(gestureTime * 0.3) * 0.1;
      head.rotation.z = Math.cos(gestureTime * 0.4) * 0.03;
    }
    
    // Body breathing/pulse
    const bodyScale = anim.bodyPulse + breathingCycle;
    this.character.scale.setScalar(bodyScale);
    
    // Subtle body sway
    this.character.rotation.y = Math.sin(gestureTime * 0.2) * 0.05;
    
    // Staff orb pulsing
    const orb = this.character.children.find(c => 
      c instanceof THREE.Mesh && (c.material as THREE.MeshStandardMaterial).emissive
    );
    if (orb && orb instanceof THREE.Mesh) {
      const mat = orb.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 0.3 + Math.sin(currentTime * 3) * 0.3 * intensity;
    }
  }

  /**
   * Update camera based on emotion and segment
   */
  private updateCamera(
    currentTime: number,
    cameraMove: StorySegment['cameraMove'],
    intensity: number
  ): void {
    if (!this.camera) return;
    
    const basePos = { x: 0, y: 2.5, z: 6 };
    const speed = 0.3;
    
    switch (cameraMove) {
      case 'zoom-in':
        this.camera.position.z = basePos.z - (intensity * 1.5);
        break;
      
      case 'zoom-out':
        this.camera.position.z = basePos.z + (intensity * 1.0);
        break;
      
      case 'orbit':
        const orbitAngle = currentTime * speed;
        this.camera.position.x = Math.sin(orbitAngle) * 2;
        this.camera.position.z = basePos.z + Math.cos(orbitAngle) * 1;
        break;
      
      case 'pan-left':
        this.camera.position.x = -intensity * 1.5;
        break;
      
      case 'pan-right':
        this.camera.position.x = intensity * 1.5;
        break;
      
      default:
        // Subtle camera drift for static
        this.camera.position.x = Math.sin(currentTime * 0.1) * 0.3;
        this.camera.position.y = basePos.y + Math.cos(currentTime * 0.15) * 0.1;
    }
    
    // Always look at character
    this.camera.lookAt(0, 1.2, 0);
  }

  /**
   * Render a single frame and return the canvas
   */
  renderFrame(
    currentTime: number,
    segment: StorySegment | null
  ): HTMLCanvasElement | null {
    if (!this.initialized || !this.renderer || !this.scene || !this.camera) {
      return null;
    }
    
    const emotion = segment?.emotion || 'neutral';
    const intensity = segment?.intensity || 0.5;
    const cameraMove = segment?.cameraMove || 'static';
    
    // Calculate delta time
    const delta = currentTime - this.lastTime;
    this.lastTime = currentTime;
    
    // Update lighting based on emotion
    this.updateLighting(emotion, intensity);
    
    // Animate character
    this.animateCharacter(currentTime, emotion, intensity);
    
    // Update camera
    this.updateCamera(currentTime, cameraMove, intensity);
    
    // Update particles
    if (this.particles) {
      updateParticles(this.particles, delta);
    }
    
    // Render scene
    this.renderer.render(this.scene, this.camera);
    
    // Return the canvas for compositing
    return this.renderer.domElement;
  }

  /**
   * Change style dynamically
   */
  setStyle(style: Griot3DLayerConfig['style']): void {
    this.config.style = style;
    
    if (this.scene) {
      const palette = STYLE_PALETTES[style] || STYLE_PALETTES.traditional;
      this.scene.fog = new THREE.Fog(palette.fog, 8, 25);
    }
  }

  /**
   * Check if WebGL is available
   */
  static isWebGLAvailable(): boolean {
    try {
      const canvas = document.createElement('canvas');
      return !!(
        window.WebGLRenderingContext &&
        (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
      );
    } catch {
      return false;
    }
  }

  /**
   * Dispose resources
   */
  dispose(): void {
    if (this.renderer) {
      this.renderer.dispose();
      this.renderer = null;
    }
    
    if (this.scene) {
      this.scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry?.dispose();
          if (object.material instanceof THREE.Material) {
            object.material.dispose();
          }
        }
      });
      this.scene = null;
    }
    
    this.character = null;
    this.environment = null;
    this.sky = null;
    this.particles = null;
    this.camera = null;
    this.mainLight = null;
    this.ambientLight = null;
    this.pointLight = null;
    this.initialized = false;
    
    console.log('[Griot3DRenderLayer] Disposed');
  }
}

/**
 * Factory function for creating 3D render layer
 */
export function create3DRenderLayer(
  width: number,
  height: number,
  style: Griot3DLayerConfig['style'] = 'traditional'
): Griot3DRenderLayer {
  return new Griot3DRenderLayer({ width, height, style });
}

export default Griot3DRenderLayer;
