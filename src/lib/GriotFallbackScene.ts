/**
 * Griot Digital Fallback Scene
 * Creates procedural 3D primitives when GLB models are unavailable
 */

import * as THREE from 'three';

export interface FallbackSceneOptions {
  style: 'traditional' | 'modern' | 'fantasy' | 'historical';
}

/**
 * Style color palettes
 */
const STYLE_PALETTES = {
  traditional: {
    primary: 0xD4A574,
    secondary: 0x8B4513,
    accent: 0xFFD700,
    background: 0x2D1F0F,
    fog: 0x2d1b00
  },
  modern: {
    primary: 0x6366F1,
    secondary: 0x3B82F6,
    accent: 0x00FFFF,
    background: 0x1a1a2e,
    fog: 0x1a1a2e
  },
  fantasy: {
    primary: 0x8B5CF6,
    secondary: 0x7C3AED,
    accent: 0xFF00FF,
    background: 0x0d0d2b,
    fog: 0x0d0d2b
  },
  historical: {
    primary: 0xA0522D,
    secondary: 0x654321,
    accent: 0xDAA520,
    background: 0x3d2b1f,
    fog: 0x3d2b1f
  }
};

/**
 * Create a stylized griot character using primitives
 */
export function createGriotCharacter(style: string = 'traditional'): THREE.Group {
  const group = new THREE.Group();
  group.name = 'griot-character-fallback';
  
  const palette = STYLE_PALETTES[style as keyof typeof STYLE_PALETTES] || STYLE_PALETTES.traditional;
  
  // Head
  const headGeometry = new THREE.SphereGeometry(0.25, 32, 32);
  const headMaterial = new THREE.MeshStandardMaterial({
    color: palette.primary,
    roughness: 0.6,
    metalness: 0.1
  });
  const head = new THREE.Mesh(headGeometry, headMaterial);
  head.position.set(0, 1.75, 0);
  head.castShadow = true;
  head.name = 'head';
  group.add(head);
  
  // Eyes
  const eyeGeometry = new THREE.SphereGeometry(0.03, 16, 16);
  const eyeMaterial = new THREE.MeshStandardMaterial({ color: 0x1a1a1a });
  
  const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
  leftEye.position.set(-0.08, 1.78, 0.2);
  group.add(leftEye);
  
  const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
  rightEye.position.set(0.08, 1.78, 0.2);
  group.add(rightEye);
  
  // Body (robe)
  const robeGeometry = new THREE.ConeGeometry(0.4, 1.2, 32);
  const robeMaterial = new THREE.MeshStandardMaterial({
    color: palette.secondary,
    roughness: 0.8,
    metalness: 0
  });
  const robe = new THREE.Mesh(robeGeometry, robeMaterial);
  robe.position.set(0, 0.9, 0);
  robe.castShadow = true;
  group.add(robe);
  
  // Hat/Headdress
  const hatGeometry = new THREE.CylinderGeometry(0.15, 0.28, 0.2, 32);
  const hatMaterial = new THREE.MeshStandardMaterial({
    color: palette.accent,
    roughness: 0.4,
    metalness: 0.3
  });
  const hat = new THREE.Mesh(hatGeometry, hatMaterial);
  hat.position.set(0, 2.05, 0);
  hat.castShadow = true;
  group.add(hat);
  
  // Staff
  const staffGeometry = new THREE.CylinderGeometry(0.02, 0.02, 1.5, 16);
  const staffMaterial = new THREE.MeshStandardMaterial({
    color: 0x4a3728,
    roughness: 0.7
  });
  const staff = new THREE.Mesh(staffGeometry, staffMaterial);
  staff.position.set(0.4, 0.8, 0);
  staff.rotation.z = -0.2;
  staff.castShadow = true;
  group.add(staff);
  
  // Staff orb
  const orbGeometry = new THREE.SphereGeometry(0.08, 16, 16);
  const orbMaterial = new THREE.MeshStandardMaterial({
    color: palette.accent,
    emissive: palette.accent,
    emissiveIntensity: 0.5,
    roughness: 0.2,
    metalness: 0.8
  });
  const orb = new THREE.Mesh(orbGeometry, orbMaterial);
  orb.position.set(0.55, 1.45, 0);
  group.add(orb);
  
  return group;
}

/**
 * Create a village scene background
 */
export function createVillageScene(style: string = 'traditional'): THREE.Group {
  const group = new THREE.Group();
  group.name = 'village-scene-fallback';
  
  const palette = STYLE_PALETTES[style as keyof typeof STYLE_PALETTES] || STYLE_PALETTES.traditional;
  
  // Ground
  const groundGeometry = new THREE.CircleGeometry(15, 64);
  const groundMaterial = new THREE.MeshStandardMaterial({
    color: 0x3d2b1f,
    roughness: 0.9
  });
  const ground = new THREE.Mesh(groundGeometry, groundMaterial);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = 0;
  ground.receiveShadow = true;
  group.add(ground);
  
  // Huts
  const hutPositions = [
    { x: -3, z: -4 },
    { x: 3, z: -4 },
    { x: -4, z: -6 },
    { x: 4, z: -6 }
  ];
  
  hutPositions.forEach((pos, index) => {
    const hut = createHut(palette.secondary, palette.primary);
    hut.position.set(pos.x, 0, pos.z);
    hut.rotation.y = Math.random() * Math.PI * 2;
    hut.scale.setScalar(0.8 + Math.random() * 0.4);
    group.add(hut);
  });
  
  // Trees
  for (let i = 0; i < 8; i++) {
    const tree = createTree();
    const angle = (i / 8) * Math.PI * 2;
    const radius = 8 + Math.random() * 4;
    tree.position.set(
      Math.cos(angle) * radius,
      0,
      Math.sin(angle) * radius - 3
    );
    tree.scale.setScalar(0.5 + Math.random() * 0.5);
    group.add(tree);
  }
  
  return group;
}

/**
 * Create a simple hut
 */
function createHut(wallColor: number, roofColor: number): THREE.Group {
  const hut = new THREE.Group();
  
  // Wall
  const wallGeometry = new THREE.CylinderGeometry(0.8, 0.8, 1.2, 16);
  const wallMaterial = new THREE.MeshStandardMaterial({
    color: wallColor,
    roughness: 0.9
  });
  const wall = new THREE.Mesh(wallGeometry, wallMaterial);
  wall.position.y = 0.6;
  wall.castShadow = true;
  wall.receiveShadow = true;
  hut.add(wall);
  
  // Roof
  const roofGeometry = new THREE.ConeGeometry(1.1, 0.8, 16);
  const roofMaterial = new THREE.MeshStandardMaterial({
    color: roofColor,
    roughness: 0.8
  });
  const roof = new THREE.Mesh(roofGeometry, roofMaterial);
  roof.position.y = 1.6;
  roof.castShadow = true;
  hut.add(roof);
  
  return hut;
}

/**
 * Create a simple tree
 */
function createTree(): THREE.Group {
  const tree = new THREE.Group();
  
  // Trunk
  const trunkGeometry = new THREE.CylinderGeometry(0.1, 0.15, 1.5, 8);
  const trunkMaterial = new THREE.MeshStandardMaterial({
    color: 0x4a3728,
    roughness: 0.9
  });
  const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
  trunk.position.y = 0.75;
  trunk.castShadow = true;
  tree.add(trunk);
  
  // Foliage
  const foliageGeometry = new THREE.SphereGeometry(0.6, 16, 16);
  const foliageMaterial = new THREE.MeshStandardMaterial({
    color: 0x228B22,
    roughness: 0.8
  });
  const foliage = new THREE.Mesh(foliageGeometry, foliageMaterial);
  foliage.position.y = 1.8;
  foliage.castShadow = true;
  tree.add(foliage);
  
  return tree;
}

/**
 * Create a sky dome
 */
export function createSkyDome(style: string = 'traditional'): THREE.Mesh {
  const palette = STYLE_PALETTES[style as keyof typeof STYLE_PALETTES] || STYLE_PALETTES.traditional;
  
  const skyGeometry = new THREE.SphereGeometry(50, 32, 32);
  const skyMaterial = new THREE.MeshBasicMaterial({
    color: palette.background,
    side: THREE.BackSide
  });
  
  // Add gradient effect with vertex colors
  const colors = new Float32Array(skyGeometry.attributes.position.count * 3);
  const positions = skyGeometry.attributes.position;
  
  for (let i = 0; i < positions.count; i++) {
    const y = positions.getY(i);
    const t = (y + 50) / 100; // 0 at bottom, 1 at top
    
    // Blend from dark to slightly lighter
    const darkColor = new THREE.Color(palette.background);
    const lightColor = new THREE.Color(palette.background).multiplyScalar(1.5);
    const color = darkColor.lerp(lightColor, t);
    
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
  }
  
  skyGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  skyMaterial.vertexColors = true;
  
  const sky = new THREE.Mesh(skyGeometry, skyMaterial);
  sky.name = 'sky-dome-fallback';
  
  return sky;
}

/**
 * Create floating particles
 */
export function createParticleSystem(style: string = 'traditional'): THREE.Points {
  const palette = STYLE_PALETTES[style as keyof typeof STYLE_PALETTES] || STYLE_PALETTES.traditional;
  
  const particleCount = 200;
  const positions = new Float32Array(particleCount * 3);
  const sizes = new Float32Array(particleCount);
  
  for (let i = 0; i < particleCount; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 20;
    positions[i * 3 + 1] = Math.random() * 10;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 20 - 5;
    sizes[i] = Math.random() * 3 + 1;
  }
  
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
  
  const material = new THREE.PointsMaterial({
    color: palette.accent,
    size: 0.1,
    transparent: true,
    opacity: 0.6,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  
  const particles = new THREE.Points(geometry, material);
  particles.name = 'particles-fallback';
  particles.userData.velocities = Array(particleCount).fill(null).map(() => ({
    x: (Math.random() - 0.5) * 0.01,
    y: Math.random() * 0.02 + 0.01,
    z: (Math.random() - 0.5) * 0.01
  }));
  
  return particles;
}

/**
 * Animate particles
 */
export function updateParticles(particles: THREE.Points, delta: number): void {
  const positions = particles.geometry.attributes.position;
  const velocities = particles.userData.velocities;
  
  for (let i = 0; i < positions.count; i++) {
    let y = positions.getY(i) + velocities[i].y;
    let x = positions.getX(i) + velocities[i].x;
    let z = positions.getZ(i) + velocities[i].z;
    
    // Reset particle if too high
    if (y > 10) {
      y = 0;
      x = (Math.random() - 0.5) * 20;
      z = (Math.random() - 0.5) * 20 - 5;
    }
    
    positions.setXYZ(i, x, y, z);
  }
  
  positions.needsUpdate = true;
}

/**
 * Create complete fallback scene
 */
export function createFallbackScene(style: string = 'traditional'): {
  character: THREE.Group;
  environment: THREE.Group;
  sky: THREE.Mesh;
  particles: THREE.Points;
} {
  return {
    character: createGriotCharacter(style),
    environment: createVillageScene(style),
    sky: createSkyDome(style),
    particles: createParticleSystem(style)
  };
}

export default {
  createGriotCharacter,
  createVillageScene,
  createSkyDome,
  createParticleSystem,
  updateParticles,
  createFallbackScene,
  STYLE_PALETTES
};
