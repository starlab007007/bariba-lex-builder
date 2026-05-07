/**
 * TAM-TAM 3D Asset Loader v1.0
 * High-performance GLB/GLTF loader with Draco compression, LOD, and lighting presets
 * 
 * @description Handles loading, caching, and optimization of 3D models
 * with support for animations, PBR materials, and instanced rendering.
 */

import * as THREE from 'three';
import { GLTFLoader, GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Material customization options
 */
export interface MaterialOptions {
  /** Base color (hex or CSS color) */
  color?: string | number;
  /** Metalness factor (0-1) */
  metalness?: number;
  /** Roughness factor (0-1) */
  roughness?: number;
  /** Emissive color */
  emissive?: string | number;
  /** Emissive intensity */
  emissiveIntensity?: number;
  /** Opacity (0-1) */
  opacity?: number;
  /** Enable transparency */
  transparent?: boolean;
  /** Wireframe mode */
  wireframe?: boolean;
  /** Environment map intensity */
  envMapIntensity?: number;
  /** Normal map scale */
  normalScale?: number;
  /** Custom texture maps */
  textures?: {
    map?: THREE.Texture;
    normalMap?: THREE.Texture;
    roughnessMap?: THREE.Texture;
    metalnessMap?: THREE.Texture;
    emissiveMap?: THREE.Texture;
    aoMap?: THREE.Texture;
  };
}

/**
 * Lighting preset types
 */
export type LightingPreset = 'cinematic' | 'studio' | 'natural';

/**
 * Loading progress callback
 */
export interface LoadProgress {
  /** Current item being loaded */
  item: string;
  /** Loaded bytes */
  loaded: number;
  /** Total bytes */
  total: number;
  /** Percentage (0-100) */
  percent: number;
}

/**
 * LOD configuration
 */
export interface LODConfig {
  /** High detail distance threshold */
  high: number;
  /** Medium detail distance threshold */
  medium: number;
  /** Low detail distance threshold */
  low: number;
}

/**
 * Cached model entry
 */
interface CachedModel {
  /** The loaded model group */
  model: THREE.Group;
  /** Original GLTF data */
  gltf: GLTF;
  /** Animation clips */
  animations: THREE.AnimationClip[];
  /** Load timestamp */
  loadedAt: number;
  /** Approximate size in bytes */
  size: number;
}

/**
 * Instance data for instanced rendering
 */
export interface InstanceData {
  /** Instance position */
  position: THREE.Vector3;
  /** Instance rotation (Euler angles) */
  rotation?: THREE.Euler;
  /** Instance scale */
  scale?: THREE.Vector3;
  /** Instance color (optional) */
  color?: THREE.Color;
}

// ============================================================================
// DEFAULT CONFIGURATIONS
// ============================================================================

const DEFAULT_LOD_CONFIG: LODConfig = {
  high: 10,
  medium: 25,
  low: 50,
};

const DRACO_DECODER_PATH = 'https://www.gstatic.com/draco/versioned/decoders/1.5.6/';

// ============================================================================
// 3D ASSET LOADER CLASS
// ============================================================================

/**
 * TAM-TAM 3D Asset Loader
 * 
 * @example
 * ```typescript
 * const loader = new AssetLoader3D();
 * 
 * // Load a model
 * const model = await loader.loadModel('/assets/envato/3d-models/model-001.glb');
 * scene.add(model);
 * 
 * // Apply cinematic lighting
 * loader.applyLighting(scene, 'cinematic');
 * 
 * // Customize material
 * loader.customizeMaterial(model, { metalness: 0.8, roughness: 0.2 });
 * ```
 */
export class AssetLoader3D {
  /** GLTF/GLB loader instance */
  private loader: GLTFLoader;
  
  /** Draco loader for compressed models */
  private dracoLoader: DRACOLoader;
  
  /** Model cache */
  private cache: Map<string, CachedModel> = new Map();
  
  /** Active loading promises (prevent duplicate loads) */
  private loadingPromises: Map<string, Promise<THREE.Group>> = new Map();
  
  /** Progress listeners */
  private progressListeners: Set<(progress: LoadProgress) => void> = new Set();
  
  /** LOD configuration */
  private lodConfig: LODConfig;
  
  /** Maximum cache size in bytes */
  private maxCacheSize: number;
  
  /** Texture loader for PBR materials */
  private textureLoader: THREE.TextureLoader;

  /**
   * Create a new AssetLoader3D instance
   * @param options - Configuration options
   */
  constructor(options?: {
    lodConfig?: Partial<LODConfig>;
    maxCacheSize?: number;
    dracoPath?: string;
  }) {
    this.lodConfig = { ...DEFAULT_LOD_CONFIG, ...options?.lodConfig };
    this.maxCacheSize = options?.maxCacheSize || 200 * 1024 * 1024; // 200MB default
    
    // Initialize loaders
    this.loader = new GLTFLoader();
    this.dracoLoader = new DRACOLoader();
    this.textureLoader = new THREE.TextureLoader();
    
    // Configure Draco decoder
    this.dracoLoader.setDecoderPath(options?.dracoPath || DRACO_DECODER_PATH);
    this.dracoLoader.setDecoderConfig({ type: 'js' }); // Use JS decoder for broader compatibility
    this.loader.setDRACOLoader(this.dracoLoader);
    
    console.log('✅ AssetLoader3D initialized with Draco support');
  }

  // ==========================================================================
  // MODEL LOADING
  // ==========================================================================

  /**
   * Load a 3D model from path
   * 
   * @param path - Path to GLB/GLTF file
   * @param onProgress - Optional progress callback
   * @returns Loaded model as THREE.Group
   * 
   * @example
   * ```typescript
   * const model = await loader.loadModel('/assets/envato/3d-models/model-001.glb');
   * scene.add(model);
   * ```
   */
  async loadModel(
    path: string,
    onProgress?: (progress: LoadProgress) => void
  ): Promise<THREE.Group> {
    // Check cache first
    const cached = this.cache.get(path);
    if (cached) {
      console.log(`📦 Model loaded from cache: ${path}`);
      // Return a clone to allow independent transforms
      return cached.model.clone();
    }
    
    // Check if already loading
    const existing = this.loadingPromises.get(path);
    if (existing) {
      return existing;
    }
    
    // Start loading
    const loadPromise = this.loadModelInternal(path, onProgress);
    this.loadingPromises.set(path, loadPromise);
    
    try {
      const model = await loadPromise;
      return model;
    } finally {
      this.loadingPromises.delete(path);
    }
  }

  /**
   * Internal model loading implementation
   */
  private async loadModelInternal(
    path: string,
    onProgress?: (progress: LoadProgress) => void
  ): Promise<THREE.Group> {
    return new Promise((resolve, reject) => {
      this.loader.load(
        path,
        (gltf) => {
          const model = gltf.scene;
          
          // Enable frustum culling on all meshes
          model.traverse((child) => {
            if (child instanceof THREE.Mesh) {
              child.frustumCulled = true;
              
              // Compute bounding sphere for better culling
              if (child.geometry) {
                child.geometry.computeBoundingSphere();
              }
            }
          });
          
          // Cache the loaded model
          const cachedEntry: CachedModel = {
            model: model.clone(),
            gltf,
            animations: gltf.animations || [],
            loadedAt: Date.now(),
            size: this.estimateModelSize(model),
          };
          
          this.cache.set(path, cachedEntry);
          this.enforceMaxCacheSize();
          
          console.log(`✅ Model loaded: ${path} (${gltf.animations?.length || 0} animations)`);
          resolve(model);
        },
        (progress) => {
          const percent = progress.total > 0 
            ? Math.round((progress.loaded / progress.total) * 100) 
            : 0;
            
          const loadProgress: LoadProgress = {
            item: path,
            loaded: progress.loaded,
            total: progress.total,
            percent,
          };
          
          onProgress?.(loadProgress);
          this.notifyProgress(loadProgress);
        },
        (error) => {
          console.error(`❌ Failed to load model: ${path}`, error);
          reject(new Error(`Failed to load model: ${path}`));
        }
      );
    });
  }

  /**
   * Load multiple models in parallel
   * 
   * @param paths - Array of model paths
   * @param onProgress - Optional progress callback
   * @returns Map of path to loaded model
   */
  async loadModels(
    paths: string[],
    onProgress?: (overall: number, current: LoadProgress) => void
  ): Promise<Map<string, THREE.Group>> {
    const results = new Map<string, THREE.Group>();
    let completed = 0;
    
    await Promise.all(
      paths.map(async (path) => {
        try {
          const model = await this.loadModel(path, (progress) => {
            onProgress?.(
              Math.round(((completed + progress.percent / 100) / paths.length) * 100),
              progress
            );
          });
          results.set(path, model);
          completed++;
        } catch (error) {
          console.warn(`Skipping failed model: ${path}`);
        }
      })
    );
    
    return results;
  }

  // ==========================================================================
  // ANIMATION SUPPORT
  // ==========================================================================

  /**
   * Load and get animation clip from a model
   * 
   * @param model - The model group (must be loaded via this loader)
   * @param animName - Animation clip name
   * @returns Animation clip or null if not found
   * 
   * @example
   * ```typescript
   * const model = await loader.loadModel('/model.glb');
   * const walkAnim = await loader.loadAnimation(model, 'walk');
   * 
   * const mixer = new THREE.AnimationMixer(model);
   * mixer.clipAction(walkAnim).play();
   * ```
   */
  async loadAnimation(
    model: THREE.Group,
    animName: string
  ): Promise<THREE.AnimationClip | null> {
    // Find cached entry for this model
    for (const [, cached] of this.cache) {
      if (this.isModelMatch(cached.model, model)) {
        const clip = cached.animations.find(
          (a) => a.name.toLowerCase() === animName.toLowerCase()
        );
        
        if (clip) {
          console.log(`🎬 Animation found: ${animName}`);
          return clip;
        }
      }
    }
    
    console.warn(`⚠️ Animation not found: ${animName}`);
    return null;
  }

  /**
   * Get all available animations for a model
   * 
   * @param model - The model group
   * @returns Array of animation names
   */
  getAnimationNames(model: THREE.Group): string[] {
    for (const [, cached] of this.cache) {
      if (this.isModelMatch(cached.model, model)) {
        return cached.animations.map((a) => a.name);
      }
    }
    return [];
  }

  /**
   * Get all animation clips for a model
   * 
   * @param model - The model group
   * @returns Array of animation clips
   */
  getAnimations(model: THREE.Group): THREE.AnimationClip[] {
    for (const [, cached] of this.cache) {
      if (this.isModelMatch(cached.model, model)) {
        return cached.animations;
      }
    }
    return [];
  }

  /**
   * Check if two models match (by UUID comparison)
   */
  private isModelMatch(cached: THREE.Group, target: THREE.Group): boolean {
    // Compare by structure since we return clones
    return cached.name === target.name && 
           cached.children.length === target.children.length;
  }

  // ==========================================================================
  // MATERIAL CUSTOMIZATION
  // ==========================================================================

  /**
   * Customize materials on a model
   * 
   * @param model - The model group
   * @param options - Material options to apply
   * 
   * @example
   * ```typescript
   * loader.customizeMaterial(model, {
   *   color: '#ff6600',
   *   metalness: 0.9,
   *   roughness: 0.1,
   *   emissive: '#ff0000',
   *   emissiveIntensity: 0.5
   * });
   * ```
   */
  customizeMaterial(model: THREE.Group, options: MaterialOptions): void {
    model.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material) {
        const materials = Array.isArray(child.material) 
          ? child.material 
          : [child.material];
        
        for (const material of materials) {
          if (material instanceof THREE.MeshStandardMaterial) {
            this.applyMaterialOptions(material, options);
          } else if (material instanceof THREE.MeshBasicMaterial) {
            // Convert to StandardMaterial for PBR support
            const newMaterial = new THREE.MeshStandardMaterial();
            newMaterial.copy(material as any);
            this.applyMaterialOptions(newMaterial, options);
            child.material = newMaterial;
          }
        }
      }
    });
    
    console.log('🎨 Material customized');
  }

  /**
   * Apply options to a MeshStandardMaterial
   */
  private applyMaterialOptions(
    material: THREE.MeshStandardMaterial,
    options: MaterialOptions
  ): void {
    if (options.color !== undefined) {
      material.color = new THREE.Color(options.color);
    }
    if (options.metalness !== undefined) {
      material.metalness = options.metalness;
    }
    if (options.roughness !== undefined) {
      material.roughness = options.roughness;
    }
    if (options.emissive !== undefined) {
      material.emissive = new THREE.Color(options.emissive);
    }
    if (options.emissiveIntensity !== undefined) {
      material.emissiveIntensity = options.emissiveIntensity;
    }
    if (options.opacity !== undefined) {
      material.opacity = options.opacity;
    }
    if (options.transparent !== undefined) {
      material.transparent = options.transparent;
    }
    if (options.wireframe !== undefined) {
      material.wireframe = options.wireframe;
    }
    if (options.envMapIntensity !== undefined) {
      material.envMapIntensity = options.envMapIntensity;
    }
    if (options.normalScale !== undefined) {
      material.normalScale = new THREE.Vector2(options.normalScale, options.normalScale);
    }
    
    // Apply texture maps
    if (options.textures) {
      const { textures } = options;
      if (textures.map) material.map = textures.map;
      if (textures.normalMap) material.normalMap = textures.normalMap;
      if (textures.roughnessMap) material.roughnessMap = textures.roughnessMap;
      if (textures.metalnessMap) material.metalnessMap = textures.metalnessMap;
      if (textures.emissiveMap) material.emissiveMap = textures.emissiveMap;
      if (textures.aoMap) material.aoMap = textures.aoMap;
    }
    
    material.needsUpdate = true;
  }

  // ==========================================================================
  // LIGHTING PRESETS
  // ==========================================================================

  /**
   * Apply a lighting preset to a scene
   * 
   * @param scene - THREE.Scene to add lights to
   * @param preset - Lighting preset name
   * 
   * @example
   * ```typescript
   * // Cinematic 3-point lighting
   * loader.applyLighting(scene, 'cinematic');
   * 
   * // Soft studio lighting
   * loader.applyLighting(scene, 'studio');
   * 
   * // Natural HDRI-like lighting
   * loader.applyLighting(scene, 'natural');
   * ```
   */
  applyLighting(scene: THREE.Scene, preset: LightingPreset): void {
    // Remove existing lights added by this loader
    const lightsToRemove: THREE.Object3D[] = [];
    scene.traverse((child) => {
      if (child.userData.assetLoader3D) {
        lightsToRemove.push(child);
      }
    });
    lightsToRemove.forEach((light) => scene.remove(light));
    
    switch (preset) {
      case 'cinematic':
        this.applyCinematicLighting(scene);
        break;
      case 'studio':
        this.applyStudioLighting(scene);
        break;
      case 'natural':
        this.applyNaturalLighting(scene);
        break;
    }
    
    console.log(`💡 Applied ${preset} lighting preset`);
  }

  /**
   * Cinematic 3-point lighting (key, fill, rim)
   */
  private applyCinematicLighting(scene: THREE.Scene): void {
    // Key light (main, warm)
    const keyLight = new THREE.DirectionalLight(0xfff5e6, 1.5);
    keyLight.position.set(5, 5, 5);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 50;
    keyLight.userData.assetLoader3D = true;
    scene.add(keyLight);
    
    // Fill light (softer, cooler)
    const fillLight = new THREE.DirectionalLight(0xe6f0ff, 0.5);
    fillLight.position.set(-5, 3, -2);
    fillLight.userData.assetLoader3D = true;
    scene.add(fillLight);
    
    // Rim light (back light for separation)
    const rimLight = new THREE.DirectionalLight(0xffffff, 0.8);
    rimLight.position.set(0, 3, -5);
    rimLight.userData.assetLoader3D = true;
    scene.add(rimLight);
    
    // Ambient for fill
    const ambient = new THREE.AmbientLight(0x404040, 0.3);
    ambient.userData.assetLoader3D = true;
    scene.add(ambient);
  }

  /**
   * Studio lighting (soft, even)
   */
  private applyStudioLighting(scene: THREE.Scene): void {
    // Soft box light (front left)
    const softBox1 = new THREE.RectAreaLight(0xffffff, 2, 4, 4);
    softBox1.position.set(-3, 3, 3);
    softBox1.lookAt(0, 0, 0);
    softBox1.userData.assetLoader3D = true;
    scene.add(softBox1);
    
    // Soft box light (front right)
    const softBox2 = new THREE.RectAreaLight(0xffffff, 2, 4, 4);
    softBox2.position.set(3, 3, 3);
    softBox2.lookAt(0, 0, 0);
    softBox2.userData.assetLoader3D = true;
    scene.add(softBox2);
    
    // Top light
    const topLight = new THREE.DirectionalLight(0xffffff, 0.5);
    topLight.position.set(0, 10, 0);
    topLight.userData.assetLoader3D = true;
    scene.add(topLight);
    
    // Strong ambient for even fill
    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    ambient.userData.assetLoader3D = true;
    scene.add(ambient);
  }

  /**
   * Natural outdoor lighting (HDRI-like)
   */
  private applyNaturalLighting(scene: THREE.Scene): void {
    // Sun light
    const sun = new THREE.DirectionalLight(0xfff8e7, 2);
    sun.position.set(10, 15, 10);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 4096;
    sun.shadow.mapSize.height = 4096;
    sun.shadow.camera.near = 0.5;
    sun.shadow.camera.far = 100;
    sun.shadow.camera.left = -20;
    sun.shadow.camera.right = 20;
    sun.shadow.camera.top = 20;
    sun.shadow.camera.bottom = -20;
    sun.userData.assetLoader3D = true;
    scene.add(sun);
    
    // Hemisphere light (sky/ground)
    const hemi = new THREE.HemisphereLight(0x87ceeb, 0x555555, 0.8);
    hemi.userData.assetLoader3D = true;
    scene.add(hemi);
    
    // Soft ambient
    const ambient = new THREE.AmbientLight(0xffffff, 0.2);
    ambient.userData.assetLoader3D = true;
    scene.add(ambient);
  }

  // ==========================================================================
  // LOD (LEVEL OF DETAIL)
  // ==========================================================================

  /**
   * Create LOD object from a model with automatic detail reduction
   * 
   * @param model - Source high-detail model
   * @param config - Optional LOD distance thresholds
   * @returns LOD object ready to add to scene
   * 
   * @example
   * ```typescript
   * const model = await loader.loadModel('/model.glb');
   * const lod = loader.createLOD(model);
   * scene.add(lod);
   * ```
   */
  createLOD(model: THREE.Group, config?: Partial<LODConfig>): THREE.LOD {
    const lodConfig = { ...this.lodConfig, ...config };
    const lod = new THREE.LOD();
    
    // High detail (original)
    const highDetail = model.clone();
    lod.addLevel(highDetail, lodConfig.high);
    
    // Medium detail (reduced geometry)
    const mediumDetail = this.createReducedDetail(model, 0.5);
    lod.addLevel(mediumDetail, lodConfig.medium);
    
    // Low detail (simplified)
    const lowDetail = this.createReducedDetail(model, 0.25);
    lod.addLevel(lowDetail, lodConfig.low);
    
    console.log('📐 LOD created with 3 levels');
    return lod;
  }

  /**
   * Create a reduced detail version of a model
   */
  private createReducedDetail(model: THREE.Group, factor: number): THREE.Group {
    const clone = model.clone();
    
    clone.traverse((child) => {
      if (child instanceof THREE.Mesh && child.geometry) {
        // Simple reduction: skip some vertices (basic decimation)
        const geometry = child.geometry.clone();
        
        // For indexed geometry, we can simplify by reducing indices
        if (geometry.index) {
          const indices = geometry.index.array;
          const newIndices = [];
          const step = Math.max(1, Math.floor(1 / factor));
          
          for (let i = 0; i < indices.length; i += step * 3) {
            if (i + 2 < indices.length) {
              newIndices.push(indices[i], indices[i + 1], indices[i + 2]);
            }
          }
          
          geometry.setIndex(newIndices);
        }
        
        child.geometry = geometry;
      }
    });
    
    return clone;
  }

  // ==========================================================================
  // INSTANCED RENDERING
  // ==========================================================================

  /**
   * Create instanced mesh for efficient rendering of multiple copies
   * 
   * @param model - Source model (should contain a single mesh ideally)
   * @param instances - Array of instance transforms
   * @returns InstancedMesh or Group containing InstancedMeshes
   * 
   * @example
   * ```typescript
   * const model = await loader.loadModel('/tree.glb');
   * const instances: InstanceData[] = [];
   * 
   * for (let i = 0; i < 1000; i++) {
   *   instances.push({
   *     position: new THREE.Vector3(Math.random() * 100, 0, Math.random() * 100),
   *     scale: new THREE.Vector3(1, 1, 1),
   *   });
   * }
   * 
   * const forest = loader.createInstanced(model, instances);
   * scene.add(forest);
   * ```
   */
  createInstanced(
    model: THREE.Group,
    instances: InstanceData[]
  ): THREE.Group {
    const group = new THREE.Group();
    const matrix = new THREE.Matrix4();
    const position = new THREE.Vector3();
    const quaternion = new THREE.Quaternion();
    const scale = new THREE.Vector3(1, 1, 1);
    
    model.traverse((child) => {
      if (child instanceof THREE.Mesh && child.geometry && child.material) {
        const instancedMesh = new THREE.InstancedMesh(
          child.geometry,
          child.material,
          instances.length
        );
        
        // Set instance matrices
        for (let i = 0; i < instances.length; i++) {
          const inst = instances[i];
          
          position.copy(inst.position);
          
          if (inst.rotation) {
            quaternion.setFromEuler(inst.rotation);
          } else {
            quaternion.identity();
          }
          
          if (inst.scale) {
            scale.copy(inst.scale);
          } else {
            scale.set(1, 1, 1);
          }
          
          matrix.compose(position, quaternion, scale);
          instancedMesh.setMatrixAt(i, matrix);
          
          // Set instance color if provided
          if (inst.color && instancedMesh.instanceColor) {
            instancedMesh.setColorAt(i, inst.color);
          }
        }
        
        instancedMesh.instanceMatrix.needsUpdate = true;
        if (instancedMesh.instanceColor) {
          instancedMesh.instanceColor.needsUpdate = true;
        }
        
        instancedMesh.frustumCulled = true;
        group.add(instancedMesh);
      }
    });
    
    console.log(`🔢 Created ${instances.length} instances`);
    return group;
  }

  // ==========================================================================
  // CACHE MANAGEMENT
  // ==========================================================================

  /**
   * Get model from cache (if available)
   */
  getFromCache(path: string): THREE.Group | null {
    const cached = this.cache.get(path);
    return cached ? cached.model.clone() : null;
  }

  /**
   * Check if model is cached
   */
  isCached(path: string): boolean {
    return this.cache.has(path);
  }

  /**
   * Clear specific model from cache
   */
  clearFromCache(path: string): void {
    const cached = this.cache.get(path);
    if (cached) {
      this.disposeModel(cached.model);
      this.cache.delete(path);
    }
  }

  /**
   * Clear all cached models
   */
  clearCache(): void {
    for (const [, cached] of this.cache) {
      this.disposeModel(cached.model);
    }
    this.cache.clear();
    console.log('🧹 3D cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { count: number; sizeBytes: number; sizeMB: number } {
    let sizeBytes = 0;
    for (const cached of this.cache.values()) {
      sizeBytes += cached.size;
    }
    return {
      count: this.cache.size,
      sizeBytes,
      sizeMB: Math.round(sizeBytes / (1024 * 1024) * 100) / 100,
    };
  }

  /**
   * Enforce maximum cache size (LRU eviction)
   */
  private enforceMaxCacheSize(): void {
    const stats = this.getCacheStats();
    if (stats.sizeBytes <= this.maxCacheSize) return;
    
    // Sort by loadedAt (oldest first)
    const entries = [...this.cache.entries()].sort(
      (a, b) => a[1].loadedAt - b[1].loadedAt
    );
    
    let currentSize = stats.sizeBytes;
    
    for (const [key, cached] of entries) {
      if (currentSize <= this.maxCacheSize) break;
      
      this.disposeModel(cached.model);
      this.cache.delete(key);
      currentSize -= cached.size;
    }
  }

  /**
   * Estimate model size in bytes
   */
  private estimateModelSize(model: THREE.Group): number {
    let size = 0;
    
    model.traverse((child) => {
      if (child instanceof THREE.Mesh && child.geometry) {
        const geometry = child.geometry;
        
        // Estimate from attributes
        for (const attr of Object.values(geometry.attributes)) {
          if (attr instanceof THREE.BufferAttribute) {
            size += attr.array.byteLength;
          }
        }
        
        // Index buffer
        if (geometry.index) {
          size += geometry.index.array.byteLength;
        }
      }
    });
    
    return size;
  }

  /**
   * Dispose of model resources
   */
  private disposeModel(model: THREE.Group): void {
    model.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry?.dispose();
        
        const materials = Array.isArray(child.material) 
          ? child.material 
          : [child.material];
          
        for (const material of materials) {
          if (material instanceof THREE.Material) {
            // Dispose textures
            for (const key of Object.keys(material)) {
              const value = (material as any)[key];
              if (value instanceof THREE.Texture) {
                value.dispose();
              }
            }
            material.dispose();
          }
        }
      }
    });
  }

  // ==========================================================================
  // PROGRESS TRACKING
  // ==========================================================================

  /**
   * Subscribe to loading progress updates
   */
  onProgress(callback: (progress: LoadProgress) => void): () => void {
    this.progressListeners.add(callback);
    return () => this.progressListeners.delete(callback);
  }

  /**
   * Notify all progress listeners
   */
  private notifyProgress(progress: LoadProgress): void {
    this.progressListeners.forEach((listener) => listener(progress));
  }

  // ==========================================================================
  // TEXTURE LOADING
  // ==========================================================================

  /**
   * Load a texture for PBR materials
   * 
   * @param path - Path to texture file
   * @returns Loaded texture
   */
  async loadTexture(path: string): Promise<THREE.Texture> {
    return new Promise((resolve, reject) => {
      this.textureLoader.load(
        path,
        (texture) => {
          texture.wrapS = THREE.RepeatWrapping;
          texture.wrapT = THREE.RepeatWrapping;
          texture.flipY = false; // GLTF standard
          resolve(texture);
        },
        undefined,
        (error) => reject(error)
      );
    });
  }

  // ==========================================================================
  // UTILITIES
  // ==========================================================================

  /**
   * Get bounding box of a model
   */
  getBoundingBox(model: THREE.Group): THREE.Box3 {
    return new THREE.Box3().setFromObject(model);
  }

  /**
   * Center model at origin
   */
  centerModel(model: THREE.Group): void {
    const box = this.getBoundingBox(model);
    const center = box.getCenter(new THREE.Vector3());
    model.position.sub(center);
  }

  /**
   * Normalize model scale to fit within unit cube
   */
  normalizeScale(model: THREE.Group, targetSize: number = 1): void {
    const box = this.getBoundingBox(model);
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    
    if (maxDim > 0) {
      const scale = targetSize / maxDim;
      model.scale.multiplyScalar(scale);
    }
  }

  // ==========================================================================
  // CLEANUP
  // ==========================================================================

  /**
   * Dispose of all resources
   */
  dispose(): void {
    this.clearCache();
    this.loadingPromises.clear();
    this.progressListeners.clear();
    
    this.dracoLoader.dispose();
    
    console.log('🧹 AssetLoader3D disposed');
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

/**
 * Default AssetLoader3D instance
 */
export const assetLoader3D = new AssetLoader3D();

/**
 * Create a new AssetLoader3D instance
 */
export function createAssetLoader3D(options?: ConstructorParameters<typeof AssetLoader3D>[0]): AssetLoader3D {
  return new AssetLoader3D(options);
}

export default AssetLoader3D;
