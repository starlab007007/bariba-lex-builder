// ============================================================
// TEMPLATE PACK LOADER SERVICE
// Loads templates, manifests, and packs from public/templates/
// ============================================================

import {
  TemplateIndex,
  TemplateIndexEntry,
  TemplateManifest,
  TemplatePack,
  ProjectDraft,
  ResolvedTimeline,
  ResolvedClip,
  ResolvedAudioClip,
  ResolvedOverlay,
  AssetBinding,
  BeatMarker,
  BeatSyncResult,
} from '@/types/template.types';

// ============================================================
// CACHE
// ============================================================

const manifestCache = new Map<string, TemplateManifest>();
const packCache = new Map<string, TemplatePack>();
let indexCache: TemplateIndex | null = null;

// ============================================================
// LOADER FUNCTIONS
// ============================================================

/**
 * Load the template index from public/templates/index.json
 */
export async function loadTemplateIndex(): Promise<TemplateIndex> {
  if (indexCache) return indexCache;
  
  try {
    const res = await fetch('/templates/index.json');
    if (!res.ok) {
      console.warn('[TemplatePackLoader] index.json not found, using fallback');
      return { version: 1, templates: [] };
    }
    indexCache = await res.json();
    return indexCache!;
  } catch (err) {
    console.warn('[TemplatePackLoader] Failed to load index:', err);
    return { version: 1, templates: [] };
  }
}

/**
 * Load a specific template manifest
 */
export async function loadManifest(templateId: string): Promise<TemplateManifest | null> {
  if (manifestCache.has(templateId)) {
    return manifestCache.get(templateId)!;
  }
  
  try {
    // First try to find in index
    const index = await loadTemplateIndex();
    const entry = index.templates.find(t => t.id === templateId);
    
    const manifestPath = entry?.manifest || `/templates/manifests/${templateId}.json`;
    const res = await fetch(manifestPath);
    
    if (!res.ok) {
      console.warn(`[TemplatePackLoader] Manifest not found: ${manifestPath}`);
      return null;
    }
    
    const manifest: TemplateManifest = await res.json();
    manifestCache.set(templateId, manifest);
    return manifest;
  } catch (err) {
    console.warn(`[TemplatePackLoader] Failed to load manifest ${templateId}:`, err);
    return null;
  }
}

/**
 * Load a template pack (stickers, audio, filters, textStyles)
 */
export async function loadPack(packPath: string): Promise<TemplatePack | null> {
  if (packCache.has(packPath)) {
    return packCache.get(packPath)!;
  }
  
  try {
    const fullPath = packPath.startsWith('/') ? packPath : `/templates/${packPath}`;
    const res = await fetch(fullPath);
    
    if (!res.ok) {
      console.warn(`[TemplatePackLoader] Pack not found: ${fullPath}`);
      return null;
    }
    
    const pack: TemplatePack = await res.json();
    packCache.set(packPath, pack);
    return pack;
  } catch (err) {
    console.warn(`[TemplatePackLoader] Failed to load pack ${packPath}:`, err);
    return null;
  }
}

/**
 * Clear all caches (useful for hot reload)
 */
export function clearCaches(): void {
  manifestCache.clear();
  packCache.clear();
  indexCache = null;
}

// ============================================================
// PROJECT DRAFT CREATION
// ============================================================

/**
 * Create a new project draft from a template manifest
 */
export function createProjectDraft(
  manifest: TemplateManifest,
  userId?: string
): ProjectDraft {
  const now = new Date().toISOString();
  
  return {
    id: `proj_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    templateId: manifest.id,
    createdAt: now,
    updatedAt: now,
    format: {
      ratio: manifest.ratio,
      fps: manifest.export?.fps || 30,
      resolution: manifest.ratio === '9:16' 
        ? { w: 1080, h: 1920 }
        : manifest.ratio === '1:1'
          ? { w: 1080, h: 1080 }
          : { w: 1920, h: 1080 },
      durationSec: manifest.duration,
    },
    assets: [],
    inputBindings: {},
    texts: {},
    overrides: {
      publish: manifest.publishDefaults || { allowDuo: false, hashtags: [] },
    },
    runtime: {
      resolvedTimeline: undefined,
      draft: true,
    },
  };
}

// ============================================================
// TIMELINE RESOLUTION (Kuaishou-style mapping)
// ============================================================

/**
 * Auto-window: choose a window [start, end] within a video duration
 */
function autoWindow(videoDur: number, len: number, bias: number = 0.5): { start: number; end: number } {
  const safe = Math.max(0, videoDur - len);
  const start = Math.min(Math.max(0, safe * bias), Math.max(0, videoDur - len));
  return { start, end: start + len };
}

/**
 * Split a window into N equal segments
 */
function splitWindow(start: number, end: number, n: number): Array<{ start: number; end: number }> {
  const len = (end - start) / n;
  return Array.from({ length: n }).map((_, i) => ({
    start: start + i * len,
    end: start + (i + 1) * len,
  }));
}

/**
 * Get asset by ID from project
 */
function getAsset(project: ProjectDraft, assetId: string): AssetBinding | undefined {
  return project.assets.find(a => a.id === assetId);
}

/**
 * Resolve a template manifest with project inputs into a concrete timeline
 */
export function resolveTimeline(
  manifest: TemplateManifest,
  project: ProjectDraft,
  options?: {
    beatMarkers?: BeatMarker[];
  }
): ResolvedTimeline {
  const durOut = project.format.durationSec || manifest.duration;
  const tracks: ResolvedTimeline['tracks'] = [];
  
  // Get primary video asset
  const videoBinding = project.inputBindings['video_main'] || project.inputBindings['video_story'];
  const videoAssetId = Array.isArray(videoBinding) ? videoBinding[0] : videoBinding;
  const videoAsset = videoAssetId ? getAsset(project, videoAssetId) : undefined;
  
  // Get music asset
  const musicBinding = project.inputBindings['music'];
  const musicAssetId = Array.isArray(musicBinding) ? musicBinding[0] : musicBinding;
  const musicAsset = musicAssetId ? getAsset(project, musicAssetId) : undefined;
  
  // Get voice asset
  const voiceBinding = project.inputBindings['voice'];
  const voiceAssetId = Array.isArray(voiceBinding) ? voiceBinding[0] : voiceBinding;
  const voiceAsset = voiceAssetId ? getAsset(project, voiceAssetId) : undefined;
  
  // ============================================================
  // VIDEO TRACK
  // ============================================================
  
  const videoClips: ResolvedClip[] = [];
  
  if (videoAsset) {
    const srcDur = videoAsset.durationSec || durOut;
    
    // Simple default: use full video, trimmed to output duration
    if (durOut <= 15) {
      // Short format: single clip
      const trim = autoWindow(srcDur, durOut, 0.5);
      videoClips.push({
        id: 'v_main',
        src: videoAsset.src,
        t0: 0,
        t1: durOut,
        trim,
      });
    } else if (durOut <= 30) {
      // Medium format: hook (0-3) + main (3-25) + outro (25-30)
      const hookTrim = autoWindow(srcDur, 3, 0.1);
      const mainTrim = autoWindow(srcDur, 22, 0.5);
      const outroTrim = autoWindow(srcDur, 5, 0.9);
      
      videoClips.push(
        { id: 'v_hook', src: videoAsset.src, t0: 0, t1: 3, trim: hookTrim, fx: ['punch_zoom_in'] },
        { id: 'v_main', src: videoAsset.src, t0: 3, t1: 25, trim: mainTrim },
        { id: 'v_outro', src: videoAsset.src, t0: 25, t1: durOut, trim: outroTrim, transitionIn: 'fade' }
      );
    } else {
      // Long format: 4-segment split
      const segments = splitWindow(0, srcDur, 4);
      const segDur = durOut / 4;
      
      segments.forEach((seg, i) => {
        videoClips.push({
          id: `v_seg_${i}`,
          src: videoAsset.src,
          t0: i * segDur,
          t1: (i + 1) * segDur,
          trim: seg,
          transitionOut: i < 3 ? 'fade' : undefined,
        });
      });
    }
  }
  
  if (videoClips.length > 0) {
    tracks.push({ id: 'video', type: 'video', clips: videoClips });
  }
  
  // ============================================================
  // AUDIO TRACK
  // ============================================================
  
  const audioClips: ResolvedAudioClip[] = [];
  
  if (musicAsset) {
    audioClips.push({
      id: 'music',
      src: musicAsset.src,
      t0: 0,
      t1: durOut,
      mix: { gain: 0.8, duckVoice: true },
    });
  }
  
  if (voiceAsset) {
    audioClips.push({
      id: 'voice',
      src: voiceAsset.src,
      t0: 0,
      t1: Math.min(voiceAsset.durationSec || durOut, durOut),
      mix: { gain: 1.0 },
    });
  }
  
  if (audioClips.length > 0) {
    tracks.push({ id: 'audio', type: 'audio', clips: audioClips as any });
  }
  
  // ============================================================
  // OVERLAY TRACK (text, stickers, subtitles)
  // ============================================================
  
  const overlays: ResolvedOverlay[] = [];
  const texts = project.texts || {};
  
  // Hook text
  if (texts.hook) {
    overlays.push({
      kind: 'text',
      style: 'text_bold_hook_v1',
      text: texts.hook,
      t0: 0.3,
      t1: 3.0,
      box: { x: 0.08, y: 0.12, w: 0.84, h: 0.18 },
      anim: { name: 'pop_in' },
    });
  }
  
  // CTA text
  if (texts.cta) {
    overlays.push({
      kind: 'text',
      style: 'text_bold_hook_v1',
      text: texts.cta,
      t0: durOut - 5,
      t1: durOut,
      box: { x: 0.12, y: 0.16, w: 0.76, h: 0.16 },
      anim: { name: 'pulse' },
    });
  }
  
  // Result text
  if (texts.result) {
    overlays.push({
      kind: 'text',
      style: 'text_bold_hook_v1',
      text: texts.result,
      t0: durOut * 0.7,
      t1: durOut * 0.85,
      box: { x: 0.08, y: 0.12, w: 0.84, h: 0.16 },
      anim: { name: 'slide_in' },
    });
  }
  
  if (overlays.length > 0) {
    tracks.push({ id: 'overlays', type: 'overlay', items: overlays });
  }
  
  return { tracks };
}

// ============================================================
// BEAT SYNC HELPERS
// ============================================================

/**
 * Simple heuristic BPM detection (for when no metadata available)
 */
export function estimateBPM(durationSec: number, defaultBPM: number = 120): BeatSyncResult {
  const bpm = defaultBPM;
  const beatInterval = 60 / bpm;
  const beats: BeatMarker[] = [];
  
  let time = 0;
  let beatIndex = 0;
  
  while (time < durationSec) {
    beats.push({
      time,
      strength: beatIndex % 4 === 0 ? 1.0 : 0.6,
      type: beatIndex % 4 === 0 ? 'bar' : 'beat',
    });
    time += beatInterval;
    beatIndex++;
  }
  
  // Estimate drops at 25% and 75% of duration
  const drops = [durationSec * 0.25, durationSec * 0.75].filter(d => d < durationSec);
  
  return { bpm, beats, drops };
}

/**
 * Align cuts to nearest beat markers
 */
export function alignCutsToBeats(
  cutTimes: number[],
  beats: BeatMarker[],
  maxShift: number = 0.3
): number[] {
  return cutTimes.map(cut => {
    // Find nearest beat
    let nearestBeat = beats[0];
    let minDist = Math.abs(cut - beats[0].time);
    
    for (const beat of beats) {
      const dist = Math.abs(cut - beat.time);
      if (dist < minDist) {
        minDist = dist;
        nearestBeat = beat;
      }
    }
    
    // Only shift if within maxShift
    if (minDist <= maxShift) {
      return nearestBeat.time;
    }
    return cut;
  });
}

// ============================================================
// EXPORT
// ============================================================

const TemplatePackLoader = {
  loadTemplateIndex,
  loadManifest,
  loadPack,
  clearCaches,
  createProjectDraft,
  resolveTimeline,
  estimateBPM,
  alignCutsToBeats,
};

export default TemplatePackLoader;
