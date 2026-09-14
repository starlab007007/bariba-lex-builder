/**
 * TamTamCreator.tsx
 * Page unifiée de création avec workflow fluide et harmonisé
 * Phases: discover → capturing → reviewing → finalizing → success
 */

import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Bug, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

// Components
import UnifiedTemplateSelector from '@/components/tamtam/creator/UnifiedTemplateSelector';
import { KuaishouCaptureMode } from '@/components/tamtam/creator/KuaishouCaptureMode';
import { KuaishouPreviewMode } from '@/components/tamtam/creator/KuaishouPreviewMode';
import KuaishouDebugPanel from '@/components/tamtam/creator/KuaishouDebugPanel';
import OptimizedExportScreen from '@/components/tamtam/creator/OptimizedExportScreen';
import RadioVillageProTemplate from '@/components/tamtam/creator/RadioVillageProTemplate';
import CreatorProgressBar, { CreatorPhaseType } from '@/components/tamtam/creator/CreatorProgressBar';
import DraftPromptModal from '@/components/tamtam/creator/DraftPromptModal';
import SuccessScreen from '@/components/tamtam/creator/SuccessScreen';
import FinalizationPanel from '@/components/tamtam/creator/FinalizationPanel';

// Hooks
import { useCreatorDraft } from '@/hooks/useCreatorDraft';

// Types
import { UnifiedTemplate } from '@/types/UnifiedTemplateTypes';
import { KuaishouTemplateConfig, VideoSegment, TemplateSegment, PreviewVideo } from '@/types/KuaishouTypes';

const TamTamCreator: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Draft system
  const { 
    drafts, 
    saveDraft, 
    restoreDraft, 
    hasRecentDraft, 
    formatLastSaved,
    clearCurrentDraft,
    isSaving: isDraftSaving
  } = useCreatorDraft();

  // Core State
  const [phase, setPhase] = useState<CreatorPhaseType>('discover');
  const [selectedTemplate, setSelectedTemplate] = useState<UnifiedTemplate | null>(null);
  const [capturedSegments, setCapturedSegments] = useState<VideoSegment[]>([]);
  const [currentSegmentIndex, setCurrentSegmentIndex] = useState(0);
  const [showDebug, setShowDebug] = useState(false);
  const [finalVideoBlob, setFinalVideoBlob] = useState<Blob | null>(null);
  const [showExport, setShowExport] = useState(false);
  
  // Finalization state
  const [caption, setCaption] = useState('');
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishedPostId, setPublishedPostId] = useState<string | null>(null);
  
  // Draft prompt
  const [showDraftPrompt, setShowDraftPrompt] = useState(false);
  const [draftStatus, setDraftStatus] = useState<'saving' | 'saved' | null>(null);

  // Check for recent draft on mount
  useEffect(() => {
    if (hasRecentDraft() && phase === 'discover') {
      setShowDraftPrompt(true);
    }
  }, [hasRecentDraft, phase]);

  // Handle pre-selected template from FullscreenCreator or TamTamTemplates navigation
  useEffect(() => {
    const state = location.state as { 
      preselectedTemplate?: UnifiedTemplate;
      templateId?: string;
    } | null;
    
    // Handle templateId from TamTamTemplates gallery
    if (state?.templateId) {
      console.log('📦 Template ID reçu depuis TamTamTemplates:', state.templateId);
      
      // Import and find the template by ID
      import('@/components/tamtam/creator/TemplateSystem/templates').then(({ getTemplateById }) => {
        const foundTemplate = getTemplateById(state.templateId!);
        if (foundTemplate) {
          // Map category to UnifiedTemplate category
          const categoryMap: Record<string, 'social' | 'education' | 'storytelling' | 'music' | 'premium'> = {
            'storytelling': 'storytelling',
            'music': 'music',
            'business': 'social',
            'education': 'education',
            'future': 'premium',
          };
          
          // Convert to UnifiedTemplate format
          const unifiedTemplate: UnifiedTemplate = {
            id: foundTemplate.id,
            templateKey: foundTemplate.id,
            name: foundTemplate.name,
            name_bariba: foundTemplate.nameBa,
            description: foundTemplate.description,
            thumbnail: foundTemplate.thumbnail || '',
            category: categoryMap[foundTemplate.category] || 'social',
            duration: foundTemplate.duration,
            format: '9:16',
            resolution: { width: 1080, height: 1920 },
            contentType: 'video',
            difficulty: 'beginner',
            icon: '🎬',
            emoji: '🎬',
            color: '#7C3AED',
            isPremium: foundTemplate.isPremium || false,
            isNew: foundTemplate.isNew || false,
            isFeatured: false,
            isActive: true,
            source: 'kuaishou',
            originalConfig: null,
            tags: foundTemplate.tags || [],
            rating: 5,
            usageCount: foundTemplate.usageCount || 0,
            downloadCount: 0,
          };
          
          setSelectedTemplate(unifiedTemplate);
          setCapturedSegments([]);
          setCurrentSegmentIndex(0);
          setFinalVideoBlob(null);
          setPhase('capturing');
          toast.success(`${unifiedTemplate.emoji} ${unifiedTemplate.name}`);
        } else {
          console.warn('Template non trouvé:', state.templateId);
          toast.error('Template non trouvé');
        }
      });
      
      // Clear navigation state
      window.history.replaceState({}, document.title);
      return;
    }
    
    // Handle pre-selected template object
    if (state?.preselectedTemplate) {
      console.log('📦 Template pré-sélectionné reçu depuis FullscreenCreator:', state.preselectedTemplate.name);
      
      setSelectedTemplate(state.preselectedTemplate);
      setCapturedSegments([]);
      setCurrentSegmentIndex(0);
      setFinalVideoBlob(null);
      setPhase('capturing');
      toast.success(`${state.preselectedTemplate.emoji} ${state.preselectedTemplate.name}`);
      
      // Clear navigation state
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  // Sync draft status
  useEffect(() => {
    if (isDraftSaving) {
      setDraftStatus('saving');
    } else if (draftStatus === 'saving') {
      setDraftStatus('saved');
      setTimeout(() => setDraftStatus(null), 2000);
    }
  }, [isDraftSaving, draftStatus]);

  // Obtenir la config Kuaishou à partir du template sélectionné
  const getKuaishouConfig = useCallback((): KuaishouTemplateConfig | null => {
    if (!selectedTemplate) return null;
    
    if (selectedTemplate.originalConfig && 'segments' in (selectedTemplate.originalConfig as any)) {
      return selectedTemplate.originalConfig as KuaishouTemplateConfig;
    }
    
    return {
      id: selectedTemplate.id,
      name: selectedTemplate.name,
      description: selectedTemplate.description,
      category: selectedTemplate.category as any,
      contentType: selectedTemplate.contentType as any,
      difficulty: selectedTemplate.difficulty as any,
      video: {
        duration: selectedTemplate.duration,
        format: selectedTemplate.format as any,
        targetSize: '10MB',
        resolution: selectedTemplate.resolution,
        frameRate: 30,
        bitrate: 5000000
      },
      segments: [{
        id: 'main',
        type: 'user_capture' as const,
        start: 0,
        duration: selectedTemplate.duration,
        editable: true,
        effects: []
      }],
      music: {
        trackUrl: '',
        bpm: 120,
        beatMarkers: [],
        autoSync: false,
        cutOnBeat: false,
        volume: 0.8
      },
      autoEffects: {
        beauty: { enabled: false, intensity: 0, skinSmooth: false, eyeEnhance: false, faceSlim: 0 },
        stabilization: { enabled: true, strength: 0.5, method: 'optical_flow' as const, cropFactor: 1.1 },
        colorGrading: { lut: '', intensity: 0 },
        sharpness: { enabled: false, amount: 0, radius: 0, threshold: 0 },
        hdrLike: { enabled: false, highlights: 0, shadows: 0, midtones: 0, strength: 0 }
      },
      smartCuts: {
        enabled: false,
        algorithm: 'motion_only' as const,
        rules: [],
        minSegmentDuration: 1,
        maxSegmentDuration: 10
      },
      transitions: [],
      overlays: {
        stickers: [],
        text: []
      },
      hooks: {
        enabled: false,
        autoDetect: false,
        suggestions: [],
        openingHook: { enabled: false, type: 'text_flash' as const, duration: 0 }
      },
      hashtags: {
        autoGenerate: true,
        suggestions: [],
        maxHashtags: 5
      },
      metadata: {
        createdAt: new Date().toISOString(),
        author: 'TAM-TAM',
        version: '1.0.0',
        tags: selectedTemplate.tags
      }
    } as unknown as KuaishouTemplateConfig;
  }, [selectedTemplate]);

  // Obtenir le segment courant (avec fallback)
  const getCurrentSegment = useCallback((): TemplateSegment => {
    const config = getKuaishouConfig();
    if (!config || !config.segments || !config.segments[currentSegmentIndex]) {
      // Fallback segment par défaut
      return {
        id: 'default_segment',
        type: 'user_capture' as const,
        start: 0,
        duration: selectedTemplate?.duration || 15,
        editable: true,
        effects: []
      };
    }
    return config.segments[currentSegmentIndex];
  }, [getKuaishouConfig, currentSegmentIndex, selectedTemplate]);

  // Gérer la sélection d'un template
  const handleTemplateSelect = useCallback((template: UnifiedTemplate) => {
    console.log('🎬 Template sélectionné:', template.id, template.name, 'source:', template.source);
    setSelectedTemplate(template);
    setCapturedSegments([]);
    setCurrentSegmentIndex(0);
    setFinalVideoBlob(null);
    setPhase('capturing');
    toast.success(`${template.emoji} ${template.name}`);
  }, []);

  // Gérer la capture d'un segment
  const handleSegmentCapture = useCallback((segment: VideoSegment) => {
    console.log('🎥 Segment capturé:', segment.id, 'duration:', segment.duration, 'blob size:', segment.blob?.size);
    
    setCapturedSegments(prev => [...prev, segment]);
    
    const config = getKuaishouConfig();
    if (!config) {
      console.log('⚠️ Pas de config, transition directe vers reviewing');
      setPhase('reviewing');
      toast.success('Capture terminée !');
      return;
    }
    
    const totalSegments = config.segments?.length || 1;
    console.log(`📊 Segment ${currentSegmentIndex + 1}/${totalSegments}`);
    
    if (currentSegmentIndex < totalSegments - 1) {
      setCurrentSegmentIndex(prev => prev + 1);
    } else {
      console.log('✅ Tous les segments capturés, transition vers reviewing');
      setPhase('reviewing');
      toast.success('Capture terminée !');
    }
  }, [getKuaishouConfig, currentSegmentIndex]);

  // Gérer le skip de segment
  const handleSegmentSkip = useCallback(() => {
    const config = getKuaishouConfig();
    if (!config) return;
    
    if (currentSegmentIndex < config.segments.length - 1) {
      setCurrentSegmentIndex(prev => prev + 1);
      toast.info('Segment ignoré');
    } else {
      setPhase('reviewing');
    }
  }, [getKuaishouConfig, currentSegmentIndex]);

  // Handle preview complete -> go to finalization
  const handlePreviewPublish = useCallback((video: PreviewVideo) => {
    const videoAny = video as any;
    console.log('📹 Transition vers finalizing avec vidéo:', video.url ? 'URL présente' : 'pas d\'URL', 'blob:', videoAny.blob ? `${videoAny.blob.size} bytes` : 'absent');
    
    if (videoAny.blob) {
      setFinalVideoBlob(videoAny.blob);
    } else if (capturedSegments.length > 0) {
      // Fallback: créer un blob à partir des segments capturés
      const segmentBlobs = capturedSegments
        .filter(s => s.blob)
        .map(s => s.blob!);
      
      if (segmentBlobs.length > 0) {
        const combinedBlob = new Blob(segmentBlobs, { type: 'video/webm' });
        console.log('📹 Blob créé depuis segments:', combinedBlob.size, 'bytes');
        setFinalVideoBlob(combinedBlob);
      }
    }
    setPhase('finalizing');
  }, [capturedSegments]);

  // Full publish handler
  const handleFullPublish = useCallback(async () => {
    if (!finalVideoBlob) {
      toast.error('Aucune vidéo à publier');
      return;
    }

    setIsPublishing(true);
    setPhase('publishing');

    try {
      // 1. Upload video to Supabase Storage
      const videoPath = `videos/${Date.now()}_${selectedTemplate?.id || 'custom'}.webm`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('tamtam-media')
        .upload(videoPath, finalVideoBlob, {
          contentType: 'video/webm',
          upsert: false
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        // Continue anyway with local blob for demo
      }

      // 2. Get public URL
      let mediaUrl = '';
      if (uploadData) {
        const { data: urlData } = supabase.storage
          .from('tamtam-media')
          .getPublicUrl(videoPath);
        mediaUrl = urlData.publicUrl;
      }

      // 3. Create post in tamtam_posts
      const { data: postData, error: postError } = await supabase
        .from('tamtam_posts')
        .insert({
          transcript: caption || '',
          audio_url: mediaUrl || 'local://preview',
          media_type: 'video',
          media_url: mediaUrl,
          template_id: selectedTemplate?.id,
          feeling_emoji: selectedTemplate?.emoji || '🎬',
          duration_seconds: Math.floor((selectedTemplate?.duration || 15)),
        })
        .select()
        .single();

      if (postError) {
        console.warn('Post creation error:', postError);
      }

      // 4. Clear draft
      clearCurrentDraft();

      // 5. Transition to success
      setPhase('success');
      setPublishedPostId(postData?.id || null);
      toast.success('Vidéo publiée !');

    } catch (error) {
      console.error('Publication error:', error);
      toast.error('Erreur lors de la publication');
      setPhase('finalizing');
    } finally {
      setIsPublishing(false);
    }
  }, [finalVideoBlob, caption, selectedTemplate, clearCurrentDraft]);

  // Save as draft
  const handleSaveDraft = useCallback(() => {
    saveDraft({
      segments: capturedSegments.map((s, i) => ({
        id: s.id,
        type: 'video' as const,
        src: '',
        duration: s.duration || 0,
        startTime: i * (s.duration || 0),
        endTime: (i + 1) * (s.duration || 0),
        isMuted: false,
        volume: 1
      })),
      effects: {} as any,
      caption,
      captions: [],
      selectedMusic: null,
      transcript: '',
      transcriptBa: '',
      mode: 'video',
      canvasRatio: '9:16'
    });
    toast.success('Brouillon sauvegardé');
  }, [saveDraft, capturedSegments, caption]);

  // Handle draft restoration
  const handleRestoreDraft = useCallback((draftId: string) => {
    const draft = restoreDraft(draftId);
    if (draft) {
      setCaption(draft.caption || '');
      setShowDraftPrompt(false);
      setPhase('reviewing');
      toast.success('Brouillon restauré');
    }
  }, [restoreDraft]);

  // Export complete handler
  const handleExportComplete = useCallback((blob: Blob) => {
    setFinalVideoBlob(blob);
    setShowExport(false);
    setPhase('finalizing');
  }, []);

  // Navigation handlers
  const handleBack = useCallback(() => {
    switch (phase) {
      case 'capturing':
        if (currentSegmentIndex > 0) {
          setCurrentSegmentIndex(prev => prev - 1);
          setCapturedSegments(prev => prev.slice(0, -1));
        } else {
          setPhase('discover');
          setSelectedTemplate(null);
          setCapturedSegments([]);
        }
        break;
      case 'reviewing':
        setPhase('capturing');
        break;
      case 'finalizing':
        setPhase('reviewing');
        break;
      case 'publishing':
        // Can't go back during publish
        break;
      case 'success':
        navigate('/tamtam');
        break;
      default:
        navigate('/tamtam');
    }
  }, [phase, currentSegmentIndex, navigate]);

  const handleNext = useCallback(() => {
    switch (phase) {
      case 'discover':
        // Handled by template selection
        break;
      case 'capturing':
        if (capturedSegments.length > 0) {
          setPhase('reviewing');
        }
        break;
      case 'reviewing':
        setPhase('finalizing');
        break;
      case 'finalizing':
        handleFullPublish();
        break;
      default:
        break;
    }
  }, [phase, capturedSegments.length, handleFullPublish]);

  // Can proceed to next phase?
  const canProceed = useCallback(() => {
    switch (phase) {
      case 'capturing':
        return capturedSegments.length > 0;
      case 'reviewing':
        return finalVideoBlob !== null || capturedSegments.length > 0;
      case 'finalizing':
        return !isPublishing;
      default:
        return true;
    }
  }, [phase, capturedSegments.length, finalVideoBlob, isPublishing]);

  // Reset for new creation
  const handleCreateAnother = useCallback(() => {
    setPhase('discover');
    setSelectedTemplate(null);
    setCapturedSegments([]);
    setCurrentSegmentIndex(0);
    setFinalVideoBlob(null);
    setCaption('');
    setPublishedPostId(null);
  }, []);

  const kuaishouConfig = getKuaishouConfig();
  const currentSegment = getCurrentSegment();
  const totalSegments = kuaishouConfig?.segments?.length || 1;

  // Phase transition variants
  const pageVariants = {
    initial: { opacity: 0, x: 20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 }
  };

  return (
    <div className="fixed inset-0 bg-background z-50 flex flex-col">
      {/* Close button - always visible except success */}
      {phase !== 'success' && phase !== 'publishing' && (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute top-4 right-4 z-50 w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/70 transition-colors"
          onClick={() => navigate('/tamtam')}
        >
          <X className="w-5 h-5" />
        </motion.button>
      )}

      {/* Debug button */}
      {phase !== 'discover' && phase !== 'success' && (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute top-4 left-4 z-50 w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/70 transition-colors"
          onClick={() => setShowDebug(prev => !prev)}
        >
          <Bug className="w-4 h-4" />
        </motion.button>
      )}

      {/* Main Content */}
      <div className="flex-1 relative overflow-hidden">
        <AnimatePresence mode="wait">
          {/* Phase: Discover (Template Selection) */}
          {phase === 'discover' && (
            <motion.div
              key="discover"
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="absolute inset-0"
            >
              <UnifiedTemplateSelector
                onSelect={handleTemplateSelect}
                onClose={() => navigate('/tamtam')}
              />
            </motion.div>
          )}

          {/* Phase: Capture - Radio Village Pro */}
          {phase === 'capturing' && selectedTemplate?.source === 'radio_village' && (
            <motion.div
              key="radio-capture"
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="absolute inset-0"
            >
              <RadioVillageProTemplate
                onComplete={(blob) => {
                  setFinalVideoBlob(blob);
                  setPhase('finalizing');
                }}
                onBack={handleBack}
              />
            </motion.div>
          )}

          {/* Phase: Capture - Kuaishou Standard (inclut advanced et ai_generated) */}
          {phase === 'capturing' && selectedTemplate && selectedTemplate.source !== 'radio_village' && (
            <motion.div
              key="kuaishou-capture"
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="absolute inset-0"
            >
              <KuaishouCaptureMode
                template={kuaishouConfig || {
                  id: selectedTemplate.id,
                  name: selectedTemplate.name,
                  description: selectedTemplate.description,
                  category: selectedTemplate.category as any,
                  contentType: selectedTemplate.contentType as any,
                  difficulty: selectedTemplate.difficulty as any,
                  video: { duration: selectedTemplate.duration, format: '9:16', targetSize: '10MB', resolution: selectedTemplate.resolution, frameRate: 30, bitrate: 5000000 },
                  segments: [{ id: 'main', type: 'user_capture', start: 0, duration: selectedTemplate.duration, editable: true, effects: [] }],
                  music: { trackUrl: '', bpm: 120, beatMarkers: [], autoSync: false, cutOnBeat: false, volume: 0.8 },
                  autoEffects: { beauty: { enabled: false, intensity: 0, skinSmooth: false, eyeEnhance: false, faceSlim: 0 }, stabilization: { enabled: true, strength: 0.5, method: 'optical_flow', cropFactor: 1.1 }, colorGrading: { lut: '', intensity: 0 }, sharpness: { enabled: false, amount: 0, radius: 0, threshold: 0 }, hdrLike: { enabled: false, highlights: 0, shadows: 0, midtones: 0, strength: 0 } },
                  smartCuts: { enabled: false, algorithm: 'motion_only', rules: [], minSegmentDuration: 1, maxSegmentDuration: 10 },
                  transitions: [],
                  overlays: { stickers: [], text: [] },
                  hooks: { enabled: false, autoDetect: false, suggestions: [], openingHook: { enabled: false, type: 'text_flash', duration: 0 } },
                  hashtags: { autoGenerate: true, suggestions: [], maxHashtags: 5 },
                  metadata: { createdAt: new Date().toISOString(), author: 'TAM-TAM', version: '1.0.0', tags: selectedTemplate.tags }
                } as any}
                currentSegment={currentSegment}
                segmentIndex={currentSegmentIndex}
                totalSegments={totalSegments}
                onCapture={handleSegmentCapture}
                onSkip={handleSegmentSkip}
                onBack={handleBack}
              />
            </motion.div>
          )}

          {/* Phase: Reviewing (Preview) */}
          {phase === 'reviewing' && selectedTemplate && (
            <motion.div
              key="reviewing"
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="absolute inset-0"
            >
              <KuaishouPreviewMode
                template={kuaishouConfig || {
                  id: selectedTemplate.id,
                  name: selectedTemplate.name,
                  description: selectedTemplate.description,
                  category: selectedTemplate.category as any,
                  contentType: selectedTemplate.contentType as any,
                  difficulty: selectedTemplate.difficulty as any,
                  video: { duration: selectedTemplate.duration, format: '9:16', targetSize: '10MB', resolution: selectedTemplate.resolution, frameRate: 30, bitrate: 5000000 },
                  segments: [{ id: 'main', type: 'user_capture', start: 0, duration: selectedTemplate.duration, editable: true, effects: [] }],
                  music: { trackUrl: '', bpm: 120, beatMarkers: [], autoSync: false, cutOnBeat: false, volume: 0.8 },
                  autoEffects: { beauty: { enabled: false, intensity: 0, skinSmooth: false, eyeEnhance: false, faceSlim: 0 }, stabilization: { enabled: true, strength: 0.5, method: 'optical_flow', cropFactor: 1.1 }, colorGrading: { lut: '', intensity: 0 }, sharpness: { enabled: false, amount: 0, radius: 0, threshold: 0 }, hdrLike: { enabled: false, highlights: 0, shadows: 0, midtones: 0, strength: 0 } },
                  smartCuts: { enabled: false, algorithm: 'motion_only', rules: [], minSegmentDuration: 1, maxSegmentDuration: 10 },
                  transitions: [],
                  overlays: { stickers: [], text: [] },
                  hooks: { enabled: false, autoDetect: false, suggestions: [], openingHook: { enabled: false, type: 'text_flash', duration: 0 } },
                  hashtags: { autoGenerate: true, suggestions: [], maxHashtags: 5 },
                  metadata: { createdAt: new Date().toISOString(), author: 'TAM-TAM', version: '1.0.0', tags: selectedTemplate.tags }
                } as any}
                segments={capturedSegments}
                onPublish={handlePreviewPublish}
                onBack={handleBack}
              />
            </motion.div>
          )}

          {/* Phase: Finalizing */}
          {phase === 'finalizing' && (
            <motion.div
              key="finalizing"
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="absolute inset-0"
            >
              <FinalizationPanel
                previewBlob={finalVideoBlob}
                caption={caption}
                onCaptionChange={setCaption}
                onPublish={handleFullPublish}
                onSaveAsDraft={handleSaveDraft}
                onBack={handleBack}
                isPublishing={isPublishing}
                templateName={selectedTemplate?.name}
                suggestedHashtags={selectedTemplate?.tags?.map(t => `#${t}`) || []}
              />
            </motion.div>
          )}

          {/* Phase: Publishing (Loading) */}
          {phase === 'publishing' && (
            <motion.div
              key="publishing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col items-center justify-center bg-background"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full mb-6"
              />
              <p className="text-foreground font-medium">Publication en cours...</p>
              <p className="text-sm text-muted-foreground mt-2">
                Ta vidéo sera bientôt visible
              </p>
            </motion.div>
          )}

          {/* Phase: Success */}
          {phase === 'success' && (
            <SuccessScreen
              videoBlob={finalVideoBlob}
              postId={publishedPostId}
              templateName={selectedTemplate?.name}
              onCreateAnother={handleCreateAnother}
              onGoHome={() => navigate('/tamtam')}
            />
          )}
        </AnimatePresence>
      </div>

      {/* Progress Bar - visible during workflow phases */}
      <AnimatePresence>
        {['capturing', 'reviewing'].includes(phase) && (
          <CreatorProgressBar
            phase={phase}
            onBack={handleBack}
            onNext={handleNext}
            onSaveDraft={handleSaveDraft}
            canProceed={canProceed()}
            canGoBack={phase !== 'capturing' || currentSegmentIndex > 0 || capturedSegments.length === 0}
            draftStatus={draftStatus}
            lastSaved={formatLastSaved()}
            showDraftButton={capturedSegments.length > 0}
            hideOnPhases={['discover', 'finalizing', 'publishing', 'success']}
          />
        )}
      </AnimatePresence>

      {/* Export Screen */}
      {showExport && (
        <OptimizedExportScreen
          open={showExport}
          onComplete={handleExportComplete}
          onCancel={() => {
            setShowExport(false);
            setPhase('reviewing');
          }}
          sourceBlob={finalVideoBlob || undefined}
          templateName={selectedTemplate?.name}
          quality="medium"
        />
      )}

      {/* Draft Prompt Modal */}
      <DraftPromptModal
        isOpen={showDraftPrompt}
        drafts={drafts}
        onRestoreDraft={handleRestoreDraft}
        onStartNew={() => setShowDraftPrompt(false)}
        onClose={() => setShowDraftPrompt(false)}
      />

      {/* Debug Panel */}
      <AnimatePresence>
        {showDebug && kuaishouConfig && (
          <KuaishouDebugPanel
            phase={phase as any}
            template={kuaishouConfig}
            capturedSegments={capturedSegments}
            currentSegmentIndex={capturedSegments.length}
            onClose={() => setShowDebug(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default TamTamCreator;
