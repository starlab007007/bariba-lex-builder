// src/components/tamtam/creator/index.ts
// Export all creator components

export * from './CreatorEffectsData';
export * from './StickerLayer';
export * from './AREffectsLayer';
export * from './GraphicsDrawer';
export * from './MagicDrawer';
export * from './TemplateOverlay';
export { default as MiniTimeline } from './MiniTimeline';
export type { MiniTimelineSegment } from './MiniTimeline';
export { default as EditingToolbar } from './EditingToolbar';
export { default as TranscriptionEditor } from './TranscriptionEditor';
export { default as CaptionsDrawer } from './CaptionsDrawer';
export type { Caption, CaptionStyle, CaptionAnimation } from './CaptionsDrawer';
export { default as MusicDrawer } from './MusicDrawer';
export type { SelectedMusic } from './MusicDrawer';
export { default as PublishScreen } from './PublishScreen';

// Kuaishou Creator Components
export { default as KuaishouTemplateSelector } from './KuaishouTemplateSelector';
export { default as KuaishouCaptureMode } from './KuaishouCaptureMode';
export { default as KuaishouPreviewMode } from './KuaishouPreviewMode';

// New services
export { KaraokeSyncService } from '@/services/KaraokeSyncService';
export { AIMusicGenerationService } from '@/services/AIMusicGenerationService';
export { useCreatorDraft } from '@/hooks/useCreatorDraft';
