/**
 * useTemplateCapture.ts
 * Hook pour gérer la capture avec template intégré
 */

import { useState, useCallback, useRef } from 'react';
import { UnifiedTemplate } from '@/types/UnifiedTemplateTypes';

export interface VideoSegment {
  id: string;
  blob: Blob;
  duration: number;
  timestamp: number;
  effects?: string[];
}

export type TemplatePhase = 
  | 'idle'           // Pas de template actif
  | 'selecting'      // Sélection du template
  | 'capturing'      // Capture avec template overlay
  | 'reviewing'      // Preview post-capture
  | 'finalizing'     // Publication/brouillon
  | 'publishing'     // Export en cours
  | 'success';       // Publication réussie

interface UseTemplateCaptureReturn {
  // State
  templatePhase: TemplatePhase;
  activeTemplate: UnifiedTemplate | null;
  segments: VideoSegment[];
  currentSegmentIndex: number;
  
  // Actions
  selectTemplate: (template: UnifiedTemplate) => void;
  clearTemplate: () => void;
  addSegment: (blob: Blob, duration: number) => void;
  removeSegment: (segmentId: string) => void;
  clearSegments: () => void;
  
  // Phase transitions
  setPhase: (phase: TemplatePhase) => void;
  goToCapturing: () => void;
  goToReviewing: () => void;
  goToFinalizing: () => void;
  goToSuccess: () => void;
  reset: () => void;
  
  // Computed
  isTemplateActive: boolean;
  canProceed: boolean;
  totalDuration: number;
  requiredSegments: number;
}

export function useTemplateCapture(): UseTemplateCaptureReturn {
  const [templatePhase, setTemplatePhase] = useState<TemplatePhase>('idle');
  const [activeTemplate, setActiveTemplate] = useState<UnifiedTemplate | null>(null);
  const [segments, setSegments] = useState<VideoSegment[]>([]);
  const [currentSegmentIndex, setCurrentSegmentIndex] = useState(0);
  
  const segmentIdRef = useRef(0);

  // Sélectionner un template
  const selectTemplate = useCallback((template: UnifiedTemplate) => {
    setActiveTemplate(template);
    setTemplatePhase('capturing');
    setSegments([]);
    setCurrentSegmentIndex(0);
  }, []);

  // Effacer le template actif
  const clearTemplate = useCallback(() => {
    setActiveTemplate(null);
    setTemplatePhase('idle');
    setSegments([]);
    setCurrentSegmentIndex(0);
  }, []);

  // Ajouter un segment capturé
  const addSegment = useCallback((blob: Blob, duration: number) => {
    const segment: VideoSegment = {
      id: `seg_${Date.now()}_${segmentIdRef.current++}`,
      blob,
      duration,
      timestamp: Date.now(),
    };
    
    setSegments(prev => [...prev, segment]);
    setCurrentSegmentIndex(prev => prev + 1);
  }, []);

  // Supprimer un segment
  const removeSegment = useCallback((segmentId: string) => {
    setSegments(prev => prev.filter(s => s.id !== segmentId));
  }, []);

  // Effacer tous les segments
  const clearSegments = useCallback(() => {
    setSegments([]);
    setCurrentSegmentIndex(0);
  }, []);

  // Transitions de phase
  const setPhase = useCallback((phase: TemplatePhase) => {
    setTemplatePhase(phase);
  }, []);

  const goToCapturing = useCallback(() => {
    setTemplatePhase('capturing');
  }, []);

  const goToReviewing = useCallback(() => {
    setTemplatePhase('reviewing');
  }, []);

  const goToFinalizing = useCallback(() => {
    setTemplatePhase('finalizing');
  }, []);

  const goToSuccess = useCallback(() => {
    setTemplatePhase('success');
  }, []);

  // Reset complet
  const reset = useCallback(() => {
    setActiveTemplate(null);
    setTemplatePhase('idle');
    setSegments([]);
    setCurrentSegmentIndex(0);
  }, []);

  // Computed values
  const isTemplateActive = templatePhase !== 'idle' && activeTemplate !== null;
  
  const requiredSegments = activeTemplate?.originalConfig 
    ? ((activeTemplate.originalConfig as any).segments?.length || 1)
    : 1;
  
  const canProceed = segments.length >= requiredSegments || segments.length > 0;
  
  const totalDuration = segments.reduce((sum, s) => sum + s.duration, 0);

  return {
    // State
    templatePhase,
    activeTemplate,
    segments,
    currentSegmentIndex,
    
    // Actions
    selectTemplate,
    clearTemplate,
    addSegment,
    removeSegment,
    clearSegments,
    
    // Phase transitions
    setPhase,
    goToCapturing,
    goToReviewing,
    goToFinalizing,
    goToSuccess,
    reset,
    
    // Computed
    isTemplateActive,
    canProceed,
    totalDuration,
    requiredSegments,
  };
}

export default useTemplateCapture;
