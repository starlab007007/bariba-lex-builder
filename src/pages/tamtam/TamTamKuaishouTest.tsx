/**
 * TamTamKuaishouTest.tsx
 * Page de test complète pour le système Kuaishou
 * Workflow: Selection → Capture → Preview → Export
 */

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Bug, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { KuaishouTemplateSelector } from '@/components/tamtam/creator/KuaishouTemplateSelector';
import { KuaishouCaptureMode } from '@/components/tamtam/creator/KuaishouCaptureMode';
import { KuaishouPreviewMode } from '@/components/tamtam/creator/KuaishouPreviewMode';
import { KuaishouDebugPanel } from '@/components/tamtam/creator/KuaishouDebugPanel';
import { kuaishouTemplates } from '@/data/KuaishouTemplateData';
import type { KuaishouTemplateConfig, VideoSegment, TemplateSegment, PreviewVideo } from '@/types/KuaishouTypes';

type WorkflowPhase = 'selecting' | 'capturing' | 'previewing' | 'exporting';

interface CapturedSegment extends VideoSegment {
  templateSegmentId: string;
}

const TamTamKuaishouTest: React.FC = () => {
  // State
  const [phase, setPhase] = useState<WorkflowPhase>('selecting');
  const [selectedTemplate, setSelectedTemplate] = useState<KuaishouTemplateConfig | null>(null);
  const [capturedSegments, setCapturedSegments] = useState<CapturedSegment[]>([]);
  const [currentSegmentIndex, setCurrentSegmentIndex] = useState(0);
  const [showDebug, setShowDebug] = useState(false);

  // Get current segment to capture
  const currentSegment: TemplateSegment | undefined = selectedTemplate?.segments.filter(
    s => s.type === 'user_capture' || s.type === 'photo_slot'
  )[currentSegmentIndex];

  // Handlers
  const handleTemplateSelect = useCallback((template: KuaishouTemplateConfig) => {
    setSelectedTemplate(template);
    setCapturedSegments([]);
    setCurrentSegmentIndex(0);
    setPhase('capturing');
  }, []);

  const handleCapture = useCallback((segment: VideoSegment) => {
    if (!currentSegment) return;

    const newSegment: CapturedSegment = {
      ...segment,
      templateSegmentId: currentSegment.id
    };

    setCapturedSegments(prev => [...prev, newSegment]);

    // Check if more segments to capture
    const userSegments = selectedTemplate?.segments.filter(
      s => s.type === 'user_capture' || s.type === 'photo_slot'
    ) || [];

    if (currentSegmentIndex < userSegments.length - 1) {
      setCurrentSegmentIndex(prev => prev + 1);
    } else {
      // All segments captured, go to preview
      setPhase('previewing');
    }
  }, [currentSegment, currentSegmentIndex, selectedTemplate]);

  const handleSkipSegment = useCallback(() => {
    const userSegments = selectedTemplate?.segments.filter(
      s => s.type === 'user_capture' || s.type === 'photo_slot'
    ) || [];

    if (currentSegmentIndex < userSegments.length - 1) {
      setCurrentSegmentIndex(prev => prev + 1);
    } else {
      setPhase('previewing');
    }
  }, [currentSegmentIndex, selectedTemplate]);

  const handlePublish = useCallback((video: PreviewVideo) => {
    console.log('Publishing video:', video.url);
    setPhase('exporting');
    // TODO: Upload to Supabase storage
  }, []);

  const handleBack = useCallback(() => {
    switch (phase) {
      case 'capturing':
        setPhase('selecting');
        setSelectedTemplate(null);
        break;
      case 'previewing':
        setPhase('capturing');
        setCurrentSegmentIndex(0);
        setCapturedSegments([]);
        break;
      case 'exporting':
        setPhase('previewing');
        break;
    }
  }, [phase]);

  const handleReset = useCallback(() => {
    setPhase('selecting');
    setSelectedTemplate(null);
    setCapturedSegments([]);
    setCurrentSegmentIndex(0);
  }, []);

  return (
    <div className="relative min-h-screen bg-background">
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between p-4 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="flex items-center gap-3">
          {phase !== 'selecting' && (
            <Button variant="ghost" size="icon" onClick={handleBack}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
          )}
          <div>
            <h1 className="text-lg font-bold flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              Kuaishou Test
            </h1>
            <p className="text-xs text-muted-foreground">
              Phase: {phase} {selectedTemplate && `• ${selectedTemplate.name}`}
            </p>
          </div>
        </div>

        <Button
          variant={showDebug ? "default" : "outline"}
          size="sm"
          onClick={() => setShowDebug(!showDebug)}
        >
          <Bug className="w-4 h-4 mr-2" />
          Debug
        </Button>
      </div>

      {/* Main Content */}
      <div className="pt-20 pb-4">
        <AnimatePresence mode="wait">
          {/* Phase 1: Template Selection */}
          {phase === 'selecting' && (
            <motion.div
              key="selecting"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              <KuaishouTemplateSelector
                templates={kuaishouTemplates}
                onSelect={handleTemplateSelect}
              />
            </motion.div>
          )}

          {/* Phase 2: Capture */}
          {phase === 'capturing' && selectedTemplate && currentSegment && (
            <motion.div
              key="capturing"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="h-[calc(100vh-5rem)]"
            >
              <KuaishouCaptureMode
                template={selectedTemplate}
                currentSegment={currentSegment}
                segmentIndex={currentSegmentIndex}
                totalSegments={
                  selectedTemplate.segments.filter(
                    s => s.type === 'user_capture' || s.type === 'photo_slot'
                  ).length
                }
                onCapture={handleCapture}
                onSkip={handleSkipSegment}
                onBack={handleBack}
              />
            </motion.div>
          )}

          {/* Phase 3: Preview */}
          {phase === 'previewing' && selectedTemplate && (
            <motion.div
              key="previewing"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="h-[calc(100vh-5rem)]"
            >
              <KuaishouPreviewMode
                template={selectedTemplate}
                segments={capturedSegments}
                onPublish={handlePublish}
                onBack={handleBack}
              />
            </motion.div>
          )}

          {/* Phase 4: Export Success */}
          {phase === 'exporting' && (
            <motion.div
              key="exporting"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center h-[calc(100vh-5rem)] gap-6"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring' }}
                className="text-8xl"
              >
                🎉
              </motion.div>
              <h2 className="text-2xl font-bold">Vidéo exportée!</h2>
              <p className="text-muted-foreground text-center max-w-md">
                Votre création Kuaishou est prête à être partagée avec le monde.
              </p>
              <Button onClick={handleReset} size="lg">
                Créer une autre vidéo
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Debug Panel */}
      <AnimatePresence>
        {showDebug && (
          <KuaishouDebugPanel
            phase={phase}
            template={selectedTemplate}
            capturedSegments={capturedSegments}
            currentSegmentIndex={currentSegmentIndex}
            onClose={() => setShowDebug(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default TamTamKuaishouTest;
