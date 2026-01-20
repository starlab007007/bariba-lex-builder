/**
 * TamTamKuaishouTest.tsx
 * Page de test complète pour le système Kuaishou
 * Workflow: Selection → Capture → Preview → Export
 * Version: 2.0.0 - Responsive avec navigation
 */

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Bug, Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { KuaishouTemplateSelector } from '@/components/tamtam/creator/KuaishouTemplateSelector';
import { KuaishouCaptureMode } from '@/components/tamtam/creator/KuaishouCaptureMode';
import { KuaishouPreviewMode } from '@/components/tamtam/creator/KuaishouPreviewMode';
import { KuaishouDebugPanel } from '@/components/tamtam/creator/KuaishouDebugPanel';
import { TemplateStepNavigator } from '@/components/tamtam/creator/TemplateStepNavigator';
import { kuaishouTemplates } from '@/data/KuaishouTemplateData';
import type { KuaishouTemplateConfig, VideoSegment, TemplateSegment, PreviewVideo } from '@/types/KuaishouTypes';

type WorkflowPhase = 'selecting' | 'capturing' | 'previewing' | 'exporting';

const STEP_LABELS = ['Choisir template', 'Capturer', 'Prévisualiser', 'Publier'];

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

  // Get current step index for navigation
  const getCurrentStepIndex = () => {
    switch (phase) {
      case 'selecting': return 0;
      case 'capturing': return 1;
      case 'previewing': return 2;
      case 'exporting': return 3;
      default: return 0;
    }
  };

  return (
    <div className="relative min-h-[100dvh] bg-background flex flex-col overflow-hidden">
      {/* Header - Fixed */}
      <header className="shrink-0 sticky top-0 z-50 flex items-center justify-between p-4 bg-background/95 backdrop-blur-lg border-b border-border">
        <div className="flex items-center gap-3">
          {phase !== 'selecting' && (
            <Button variant="ghost" size="icon" onClick={handleBack} className="rounded-full">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          )}
          <div>
            <h1 className="text-lg font-bold flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              Créateur Kuaishou
            </h1>
            <p className="text-xs text-muted-foreground">
              {STEP_LABELS[getCurrentStepIndex()]} {selectedTemplate && `• ${selectedTemplate.name}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Progress Dots */}
          <div className="hidden sm:flex items-center gap-1.5 mr-2">
            {STEP_LABELS.map((_, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full transition-colors ${
                  i <= getCurrentStepIndex() ? 'bg-primary' : 'bg-muted-foreground/30'
                }`}
              />
            ))}
          </div>

          <Button
            variant={showDebug ? "default" : "outline"}
            size="sm"
            onClick={() => setShowDebug(!showDebug)}
            className="gap-1"
          >
            <Bug className="w-4 h-4" />
            <span className="hidden sm:inline">Debug</span>
          </Button>
        </div>
      </header>

      {/* Scrollable Main Content */}
      <main className="flex-1 overflow-y-auto pb-24">
        <AnimatePresence mode="wait">
          {/* Phase 1: Template Selection */}
          {phase === 'selecting' && (
            <motion.div
              key="selecting"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="p-4"
            >
              <div className="max-w-4xl mx-auto">
                <div className="mb-6 text-center">
                  <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-2">
                    🎬 Choisissez votre template
                  </h2>
                  <p className="text-sm sm:text-base text-muted-foreground">
                    Sélectionnez un style pour votre création vidéo
                  </p>
                </div>
                <KuaishouTemplateSelector
                  templates={kuaishouTemplates}
                  onSelect={handleTemplateSelect}
                />
              </div>
            </motion.div>
          )}
          {/* Phase 2: Capture */}
          {phase === 'capturing' && selectedTemplate && currentSegment && (
            <motion.div
              key="capturing"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="h-[calc(100dvh-4rem)]"
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
              className="h-[calc(100dvh-4rem)]"
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
              className="flex flex-col items-center justify-center min-h-[60vh] gap-6 p-6"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring' }}
                className="text-7xl sm:text-8xl"
              >
                🎉
              </motion.div>
              <h2 className="text-xl sm:text-2xl font-bold text-foreground">Vidéo publiée!</h2>
              <p className="text-sm sm:text-base text-muted-foreground text-center max-w-md">
                Votre création est prête à être partagée.
              </p>
              <Button onClick={handleReset} size="lg" className="mt-4">
                Créer une autre vidéo
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

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
