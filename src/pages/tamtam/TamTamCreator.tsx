/**
 * TamTamCreator.tsx
 * Page unifiée de création avec workflow Kuaishou complet
 */

import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Bug } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

// Components
import UnifiedTemplateSelector from '@/components/tamtam/creator/UnifiedTemplateSelector';
import { KuaishouCaptureMode } from '@/components/tamtam/creator/KuaishouCaptureMode';
import { KuaishouPreviewMode } from '@/components/tamtam/creator/KuaishouPreviewMode';
import KuaishouDebugPanel from '@/components/tamtam/creator/KuaishouDebugPanel';
import OptimizedExportScreen from '@/components/tamtam/creator/OptimizedExportScreen';
import RadioVillageProTemplate from '@/components/tamtam/creator/RadioVillageProTemplate';

// Types
import { UnifiedTemplate, CreatorPhase } from '@/types/UnifiedTemplateTypes';
import { KuaishouTemplateConfig, VideoSegment, TemplateSegment, PreviewVideo } from '@/types/KuaishouTypes';

const TamTamCreator: React.FC = () => {
  const navigate = useNavigate();
  
  // State
  const [phase, setPhase] = useState<CreatorPhase>('templates');
  const [selectedTemplate, setSelectedTemplate] = useState<UnifiedTemplate | null>(null);
  const [capturedSegments, setCapturedSegments] = useState<VideoSegment[]>([]);
  const [currentSegmentIndex, setCurrentSegmentIndex] = useState(0);
  const [showDebug, setShowDebug] = useState(false);
  const [finalVideoBlob, setFinalVideoBlob] = useState<Blob | null>(null);
  const [showExport, setShowExport] = useState(false);

  // Obtenir la config Kuaishou à partir du template sélectionné
  const getKuaishouConfig = useCallback((): KuaishouTemplateConfig | null => {
    if (!selectedTemplate) return null;
    
    // Si c'est déjà une config Kuaishou
    if (selectedTemplate.originalConfig && 'segments' in (selectedTemplate.originalConfig as any)) {
      return selectedTemplate.originalConfig as KuaishouTemplateConfig;
    }
    
    // Créer une config Kuaishou basique pour les templates non-Kuaishou
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

  // Obtenir le segment courant
  const getCurrentSegment = useCallback((): TemplateSegment | null => {
    const config = getKuaishouConfig();
    if (!config || !config.segments[currentSegmentIndex]) return null;
    return config.segments[currentSegmentIndex];
  }, [getKuaishouConfig, currentSegmentIndex]);

  // Gérer la sélection d'un template
  const handleTemplateSelect = useCallback((template: UnifiedTemplate) => {
    setSelectedTemplate(template);
    setCapturedSegments([]);
    setCurrentSegmentIndex(0);
    
    // Si c'est Radio Village Pro, utiliser son workflow spécial
    if (template.source === 'radio_village') {
      setPhase('capturing');
    } else {
      // Workflow Kuaishou standard
      setPhase('capturing');
    }
    
    toast.success(`Template "${template.name}" sélectionné`);
  }, []);

  // Gérer la capture d'un segment
  const handleSegmentCapture = useCallback((segment: VideoSegment) => {
    setCapturedSegments(prev => [...prev, segment]);
    
    const config = getKuaishouConfig();
    if (!config) return;
    
    // Passer au segment suivant ou à la preview
    if (currentSegmentIndex < config.segments.length - 1) {
      setCurrentSegmentIndex(prev => prev + 1);
    } else {
      // Tous les segments capturés
      setPhase('previewing');
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
      setPhase('previewing');
    }
  }, [getKuaishouConfig, currentSegmentIndex]);

  // Gérer la publication depuis preview
  const handlePublish = useCallback((video: PreviewVideo) => {
    const videoAny = video as any;
    if (videoAny.blob) {
      setFinalVideoBlob(videoAny.blob);
    } else if (videoAny.url) {
      // Fallback: create blob from URL if needed
    }
    setShowExport(true);
    setPhase('exporting');
  }, []);

  // Gérer l'export terminé
  const handleExportComplete = useCallback((blob: Blob) => {
    setFinalVideoBlob(blob);
    setShowExport(false);
    setPhase('published');
    toast.success('Vidéo exportée avec succès !');
  }, []);

  // Retour arrière
  const handleBack = useCallback(() => {
    switch (phase) {
      case 'capturing':
        if (currentSegmentIndex > 0) {
          setCurrentSegmentIndex(prev => prev - 1);
          setCapturedSegments(prev => prev.slice(0, -1));
        } else {
          setPhase('templates');
          setSelectedTemplate(null);
          setCapturedSegments([]);
        }
        break;
      case 'previewing':
        setPhase('capturing');
        break;
      case 'exporting':
        setShowExport(false);
        setPhase('previewing');
        break;
      case 'published':
        navigate('/tamtam');
        break;
      default:
        navigate('/tamtam');
    }
  }, [phase, currentSegmentIndex, navigate]);

  const kuaishouConfig = getKuaishouConfig();
  const currentSegment = getCurrentSegment();
  const totalSegments = kuaishouConfig?.segments?.length || 1;

  return (
    <div className="fixed inset-0 bg-background z-50 flex flex-col">
      {/* Header - Visible sauf pendant la sélection de template */}
      {phase !== 'templates' && (
        <motion.header
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="flex items-center justify-between p-3 bg-background/95 backdrop-blur-sm border-b border-border z-10"
        >
          <Button variant="ghost" size="sm" onClick={handleBack}>
            <ArrowLeft className="w-4 h-4 mr-1" />
            Retour
          </Button>
          
          <div className="flex items-center gap-2">
            {selectedTemplate && (
              <span className="text-sm font-medium text-foreground">
                {selectedTemplate.emoji} {selectedTemplate.name}
              </span>
            )}
          </div>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowDebug(prev => !prev)}
            className={showDebug ? 'text-primary' : 'text-muted-foreground'}
          >
            <Bug className="w-4 h-4" />
          </Button>
        </motion.header>
      )}

      {/* Main Content */}
      <div className="flex-1 relative overflow-hidden">
        <AnimatePresence mode="wait">
          {/* Phase 1: Sélection de template */}
          {phase === 'templates' && (
            <motion.div
              key="templates"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="absolute inset-0"
            >
              <UnifiedTemplateSelector
                onSelect={handleTemplateSelect}
                onClose={() => navigate('/tamtam')}
              />
            </motion.div>
          )}

          {/* Phase 2: Capture - Radio Village Pro */}
          {phase === 'capturing' && selectedTemplate?.source === 'radio_village' && (
            <motion.div
              key="radio-capture"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="absolute inset-0"
            >
              <RadioVillageProTemplate
                onComplete={(blob) => {
                  setFinalVideoBlob(blob);
                  setPhase('published');
                }}
                onBack={handleBack}
              />
            </motion.div>
          )}

          {/* Phase 2: Capture - Kuaishou Standard */}
          {phase === 'capturing' && selectedTemplate && selectedTemplate.source !== 'radio_village' && kuaishouConfig && currentSegment && (
            <motion.div
              key="kuaishou-capture"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="absolute inset-0"
            >
              <KuaishouCaptureMode
                template={kuaishouConfig}
                currentSegment={currentSegment}
                segmentIndex={currentSegmentIndex}
                totalSegments={totalSegments}
                onCapture={handleSegmentCapture}
                onSkip={handleSegmentSkip}
                onBack={handleBack}
              />
            </motion.div>
          )}

          {/* Phase 3: Preview */}
          {phase === 'previewing' && kuaishouConfig && (
            <motion.div
              key="preview"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="absolute inset-0"
            >
              <KuaishouPreviewMode
                template={kuaishouConfig}
                segments={capturedSegments}
                onPublish={handlePublish}
                onBack={handleBack}
              />
            </motion.div>
          )}

          {/* Phase 4: Export */}
          {phase === 'exporting' && (
            <OptimizedExportScreen
              open={showExport}
              onComplete={handleExportComplete}
              onCancel={handleBack}
              sourceBlob={finalVideoBlob || undefined}
              templateName={selectedTemplate?.name}
              quality="medium"
            />
          )}

          {/* Phase 5: Published */}
          {phase === 'published' && (
            <motion.div
              key="published"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="absolute inset-0 flex flex-col items-center justify-center bg-background p-6"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', delay: 0.2 }}
                className="text-7xl mb-6"
              >
                🎉
              </motion.div>
              
              <h1 className="text-2xl font-bold text-foreground mb-2">
                Vidéo créée !
              </h1>
              
              <p className="text-muted-foreground text-center mb-8">
                Ta vidéo a été exportée avec succès
              </p>

              {finalVideoBlob && (
                <video
                  src={URL.createObjectURL(finalVideoBlob)}
                  controls
                  className="w-full max-w-sm rounded-xl mb-6"
                  style={{ maxHeight: '40vh' }}
                />
              )}

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setPhase('templates');
                    setSelectedTemplate(null);
                    setCapturedSegments([]);
                    setCurrentSegmentIndex(0);
                    setFinalVideoBlob(null);
                  }}
                >
                  Créer une autre
                </Button>
                
                <Button onClick={() => navigate('/tamtam')}>
                  Retour à l'accueil
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Debug Panel */}
      <AnimatePresence>
        {showDebug && kuaishouConfig && (
          <KuaishouDebugPanel
            template={kuaishouConfig}
            capturedSegments={capturedSegments}
            onClose={() => setShowDebug(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default TamTamCreator;
