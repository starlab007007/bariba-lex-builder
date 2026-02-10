
# TikTok-Like Camera Enhancement Pipeline

## Overview
Upgrade the existing in-app camera (`CaptureEngine.ts` + `FullscreenCreator.tsx`) with a professional real-time beauty/color pipeline inspired by TikTok, using WebGL shaders for GPU-accelerated processing, MediaPipe for face detection, and a modular architecture with quality presets.

## Architecture

The system will be built as a modular pipeline with clear separation of concerns:

```text
Camera Feed (getUserMedia)
    |
    v
[MediaPipe Face Mesh + Selfie Segmentation] --> Face/Skin/Background masks
    |
    v
[WebGL Shader Pipeline - TikTokLookPipeline]
    |-- Pass 1: Skin Smoothing (bilateral blur on skin mask only)
    |-- Pass 2: Face Relighting (midtone lift on face region)
    |-- Pass 3: Eye/Teeth Brighten (subtle, mask-based)
    |-- Pass 4: Tone Mapping (S-curve, warm WB, controlled saturation)
    |-- Pass 5: Denoise (spatial)
    |-- Pass 6: Sharpen (micro-contrast, face-weighted)
    |-- Pass 7: Software Stabilization (crop + smooth, optional)
    |
    v
[Output Canvas] --> MediaRecorder / WebCodecs (H.264+AAC)
    |
    v
[Upload] --> Server Pipeline (FFmpeg HLS + perceptual pass)
```

## Deliverables

### 1. New Files

**`src/lib/TikTokLookPipeline.ts`** - Core WebGL pipeline manager
- Initializes WebGL2 context with shader programs
- Manages multi-pass rendering with ping-pong framebuffers
- Exposes per-effect toggles and intensity sliders (0-100)
- Quality presets: Low (480p, skip denoise/sharpen), Standard (720p, all passes), High (1080p, all passes + temporal)
- Performance monitor: tracks FPS and per-frame processing time
- A/B preview mode (toggle processed vs raw)

**`src/lib/shaders/`** - GLSL shader files (embedded as template strings)
- `skinSmooth.frag` - Edge-aware bilateral blur approximation using 9-tap Gaussian weighted by luminance difference (applied only within skin mask UV)
- `faceRelight.frag` - Lifts midtones (gamma curve) on face mask region, preserves highlights with soft clamp
- `eyeTeethBrighten.frag` - Subtle luminance boost on eye/teeth landmark regions
- `toneMap.frag` - S-curve contrast (cubic bezier in luminance), warm white balance shift (+5 on red channel, -3 on blue), controlled saturation boost (1.15x on face, 1.0 on background)
- `denoise.frag` - 5x5 non-local means approximation (spatial only for Low/Standard; temporal with previous frame blend for High)
- `sharpen.frag` - Unsharp mask with face-region weight map (stronger on face, subtle on background)

**`src/lib/FaceDetectionService.ts`** - MediaPipe wrapper
- Loads MediaPipe Face Mesh (468 landmarks) + Selfie Segmentation via CDN WASM
- Outputs: face bounding box, skin/hair/background segmentation mask as GPU texture
- Eye/teeth regions derived from landmark indices
- Runs at 15fps on Low, 30fps on Standard/High (detection can skip frames while shader pipeline runs every frame using cached mask)
- GPU delegate when available, CPU fallback

**`src/lib/SoftwareStabilizer.ts`** - Lightweight stabilization
- Tracks face center position across frames using MediaPipe landmarks
- Applies exponential moving average smoothing (alpha=0.85)
- Implements as a 5% crop + translate to compensate jitter
- Clearly labeled "Software Stabilization (Beta)" in UI
- Toggle on/off

**`src/lib/WebCodecsEncoder.ts`** - Modern encoding path
- Feature-detect `VideoEncoder` API availability
- If available: encode processed canvas frames as H.264 (or experimental H.265/AV1) + AAC audio via `AudioEncoder`
- If not available: fallback to existing MediaRecorder path
- Resolution options: 1080p/30fps (default), 720p/60fps
- Outputs MP4 container using mp4-muxer library approach (or falls back to WebM)

**`src/hooks/useTikTokLook.ts`** - React hook
- Manages pipeline lifecycle (init, process frame, cleanup)
- Persists user settings to localStorage per device
- Exposes: `beautyIntensity`, `lookStrength`, `sharpenIntensity`, `denoiseIntensity`, `stabilizationEnabled`, `qualityPreset`, `showBeforeAfter`
- Returns processed canvas ref and performance stats (fps, frameTime)

**`src/components/tamtam/BeautyControlsPanel.tsx`** - UI controls
- Sliders: Beauty (0-100), Look Strength (0-100), Sharpen (0-100), Denoise (0-100)
- Toggles: Stabilization, A/B Preview (hold to see raw)
- Resolution/FPS selector dropdown
- Front/back camera switch (existing, relocated)
- Dev mode: performance monitor overlay (FPS, frame processing time in ms)
- Glassmorphism design consistent with existing UI

### 2. Modified Files

**`src/engines/CaptureEngine.ts`**
- Replace pixel-by-pixel CPU beauty filter with TikTokLookPipeline WebGL pipeline
- Route processed canvas output to MediaRecorder (or WebCodecsEncoder when available)
- Add quality preset support
- Keep existing flash/torch and camera switch logic

**`src/components/tamtam/FullscreenCreator.tsx`**
- Integrate `useTikTokLook` hook
- Replace existing beautify drawer content with new `BeautyControlsPanel`
- Wire A/B preview button (hold = raw, release = processed)
- Add resolution/fps selector to right sidebar
- Video preview element sources from pipeline's output canvas instead of raw camera stream
- Settings persisted via hook

### 3. Server Pipeline (Edge Function)

**`supabase/functions/video-enhance/index.ts`** - Post-upload enhancement
- Endpoint: POST `/video-enhance` with `{ videoUrl, jobId }`
- Returns job status structure
- Describes the FFmpeg pipeline for:
  - Multi-rendition HLS transcode (360/540/720/1080)
  - Perceptual pass on 1080p: face-aware exposure normalization + mild denoise + mild sharpen
  - Audio loudness normalization (EBU R128 / -14 LUFS)
- Note: Actual FFmpeg processing requires a server with FFmpeg installed (not possible in Edge Functions). The edge function will create the job record and return status. Implementation note provided in code comments for connecting to an external processing service.

### 4. Database

**New table: `video_processing_jobs`**
- `id` (uuid, PK)
- `user_id` (uuid, references auth.users)
- `video_url` (text)
- `status` (text: pending/processing/completed/failed)
- `renditions` (jsonb - URLs for each quality level)
- `created_at`, `updated_at` (timestamptz)
- RLS: users can only read/insert their own jobs

## Technical Decisions

1. **WebGL over Canvas2D**: The existing `CaptureEngine` uses `getImageData`/`putImageData` which is extremely slow for 1080p (iterating 2M+ pixels per frame on CPU). WebGL runs on GPU and can handle multiple shader passes at 30fps.

2. **MediaPipe over TensorFlow.js**: MediaPipe Face Mesh is lighter, faster on mobile, and provides the 468-landmark model needed for precise skin/eye/teeth masking. WASM+GPU delegate keeps it off the main thread.

3. **Shader ping-pong**: Each effect writes to alternating framebuffers, allowing multi-pass without readback to CPU. Final result is drawn to the visible canvas.

4. **Cached masks**: Face detection runs at a lower rate (every 2-3 frames) while the shader pipeline uses the last known mask every frame. This halves the MediaPipe compute cost with no visible quality loss.

5. **Quality presets**: Low skips denoise+sharpen+stabilization and runs at 480p. Standard runs all passes at 720p. High runs all passes at 1080p with temporal denoise.

## Implementation Order

1. WebGL pipeline core (`TikTokLookPipeline.ts` + shaders)
2. MediaPipe face detection service
3. React hook (`useTikTokLook.ts`)
4. UI controls panel
5. Integration into `CaptureEngine.ts` and `FullscreenCreator.tsx`
6. WebCodecs encoder with fallback
7. Software stabilizer
8. Server pipeline edge function + database table
9. Settings persistence + performance monitor
