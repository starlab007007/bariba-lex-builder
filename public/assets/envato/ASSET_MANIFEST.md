# 📦 Envato Asset Library Structure

## Directory Overview

```
public/assets/envato/
├── 3d-models/          # GLB/GLTF 3D objects
├── audio/
│   ├── modern/         # Afrobeat, fusion tracks
│   ├── percussion/     # Djembe, drums, shekere
│   └── traditional/    # Kora, balafon, traditional
├── fonts/              # Custom display fonts
├── lens-flare/         # PNG lens flare overlays
├── light-leak/         # MP4 light leak videos
├── particles/          # PNG/MP4 particle effects
├── textures/           # PNG texture overlays
└── transitions/        # MP4/WebM video transitions
```

## Required Assets for Templates

### Griot Digital Template
- `textures/parchment-001.png`
- `3d-models/adinkra-sankofa.glb`
- `3d-models/adinkra-nyansapo.glb`
- `lens-flare/flare-001.png`
- `audio/traditional/traditional-001.mp3`

### Radio Village Pro Template
- `audio/percussion/djembe-001.mp3`
- `textures/grain-film-001.png`

## Naming Conventions

| Type | Format | Example |
|------|--------|---------|
| Light Leak | `light-leak-{name}.mp4` | `light-leak-golden.mp4` |
| Lens Flare | `flare-{number}.png` | `flare-001.png` |
| Texture | `{type}-{number}.png` | `parchment-001.png` |
| 3D Model | `{name}.glb` | `adinkra-sankofa.glb` |
| Audio | `{category}-{number}.mp3` | `traditional-001.mp3` |

## File Size Guidelines

- **Videos (MP4)**: Max 5MB per file, 1080p resolution
- **Images (PNG)**: Max 500KB, transparent background
- **Audio (MP3)**: Max 2MB, 128kbps minimum
- **3D Models (GLB)**: Max 2MB, optimized meshes

## Upload Instruction

1. Download optimized assets from Envato
2. Rename files following conventions above
3. Upload to corresponding directories
4. Test in Template Test page: `/template-test`
