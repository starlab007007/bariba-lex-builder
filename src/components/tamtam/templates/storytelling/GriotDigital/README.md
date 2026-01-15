# Griot Digital Template

Traditional African storytelling template with 3D Adinkra symbols.

## Overview

The Griot Digital template is inspired by the West African tradition of griots - oral historians and storytellers who preserve cultural heritage through narrative. This template combines ancient storytelling aesthetics with modern visual effects.

## Features

- **3D Adinkra Symbols** - Appear dynamically based on spoken cultural keywords
- **Vintage Parchment Overlay** - Authentic aged paper texture background
- **Traditional Drum Audio** - African percussion background music
- **Lens Flare Effects** - Trigger on musical beats
- **Sepia Color Grading** - Warm, nostalgic color palette

## Cultural Keywords & Symbols

| Keyword (French) | Adinkra Symbol | Meaning |
|------------------|----------------|---------|
| "ancêtres", "passé", "histoire" | Sankofa | Learning from the past |
| "sagesse", "connaissance" | Nyansapo | Wisdom knot |
| "unité", "ensemble" | Funtunfunefu | Unity in diversity |
| "liberté", "indépendance" | Fawohodie | Freedom and independence |

## Assets Required

```
/assets/templates/griot-digital/
├── thumbnail.svg          # Template preview
├── demo.mp4               # Demo video
└── assets/
    ├── textures/
    │   └── parchment-001.png
    ├── 3d-models/
    │   ├── adinkra-sankofa.glb
    │   └── adinkra-nyansapo.glb
    ├── lens-flare/
    │   └── flare-001.png
    └── audio/
        └── traditional-001.mp3
```

## Usage

### Basic Usage

```typescript
import { GriotDigital } from '@/components/tamtam/templates/storytelling/GriotDigital';

function MyComponent() {
  const videoRef = useRef<HTMLVideoElement>(null);
  
  return (
    <div className="relative w-full h-full">
      <video ref={videoRef} autoPlay muted />
      <GriotDigital
        videoElement={videoRef.current}
        onReady={() => console.log('Template ready')}
        onError={(error) => console.error('Template error:', error)}
        autoStart={true}
      />
    </div>
  );
}
```

### With TemplateSystem Integration

```typescript
import { TemplateEngine } from '@/components/tamtam/creator/TemplateSystem';
import { griotDigitalConfig } from '@/components/tamtam/templates/storytelling/GriotDigital';

const engine = new TemplateEngine(canvasElement);
engine.loadTemplateObject(griotDigitalConfig);
await engine.startRendering(videoElement);
```

## Configuration Options

```json
{
  "effects": [
    {
      "type": "texture",
      "config": {
        "opacity": 0.4,        // Parchment intensity (0-1)
        "blendMode": "multiply" // CSS blend mode
      }
    }
  ],
  "audio": {
    "volume": 0.3,           // Background music volume (0-1)
    "fadeWithSpeech": true   // Auto-duck during speech
  },
  "colorGrading": {
    "sepia": 0.3,            // Sepia filter intensity
    "warmth": 1.2,           // Color temperature
    "contrast": 1.1          // Contrast boost
  }
}
```

## Performance Notes

- 3D models are optimized for mobile (< 50k polygons)
- Textures are compressed with WebP fallback
- Audio streams progressively to reduce initial load

## Credits

- Adinkra symbols based on Akan cultural heritage
- Template designed for TAM-TAM platform
- Part of the African Digital Storytelling initiative
