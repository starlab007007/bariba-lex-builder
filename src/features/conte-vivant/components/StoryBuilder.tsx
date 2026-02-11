import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronLeft, Eye, Upload, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import SegmentEditor from './SegmentEditor';
import StoryTreePreview from './StoryTreePreview';
import type { SegmentDraft, ChoiceDraft, BranchDraft, StoryGraph, BuilderStep } from '../types/story.types';

interface StoryBuilderProps {
  onPublish: (graph: StoryGraph, title: string, description: string) => void;
  onCancel: () => void;
}

const defaultSegment = (id: string, title = ''): SegmentDraft => ({
  id, title, text_content: '', image_urls: [], duration: 15, is_ending: false,
});

const defaultChoice = (id: string, label = '', isDefault = false): ChoiceDraft => ({
  id, label, icon: '👉', is_default: isDefault,
});

const STEPS: { key: BuilderStep; label: string; icon: string }[] = [
  { key: 'intro', label: 'Introduction', icon: '📖' },
  { key: 'choices', label: 'Choix', icon: '🔀' },
  { key: 'branches', label: 'Branches', icon: '🌿' },
  { key: 'endings', label: 'Fins', icon: '🏁' },
  { key: 'preview', label: 'Aperçu', icon: '👁️' },
  { key: 'publish', label: 'Publier', icon: '🚀' },
];

export default function StoryBuilder({ onPublish, onCancel }: StoryBuilderProps) {
  const [currentStep, setCurrentStep] = useState<BuilderStep>('intro');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  // Segment data
  const [introSegment, setIntroSegment] = useState<SegmentDraft>(defaultSegment('intro', 'Introduction'));
  const [choices, setChoices] = useState<ChoiceDraft[]>([
    defaultChoice('choice_a', '', true),
    defaultChoice('choice_b', ''),
  ]);
  const [branches, setBranches] = useState<BranchDraft[]>([
    { choice: defaultChoice('choice_a', '', true), segment: defaultSegment('branch_a', 'Branche A') },
    { choice: defaultChoice('choice_b', ''), segment: defaultSegment('branch_b', 'Branche B') },
  ]);

  const stepIdx = STEPS.findIndex(s => s.key === currentStep);

  const updateChoice = (idx: number, updates: Partial<ChoiceDraft>) => {
    setChoices(prev => prev.map((c, i) => i === idx ? { ...c, ...updates } : c));
    setBranches(prev => prev.map((b, i) => i === idx ? { ...b, choice: { ...b.choice, ...updates } } : b));
  };

  const updateBranchSegment = (idx: number, seg: SegmentDraft) => {
    setBranches(prev => prev.map((b, i) => i === idx ? { ...b, segment: seg } : b));
  };

  // Build the StoryGraph from current state
  const buildGraph = useCallback((): StoryGraph => {
    const segments: StoryGraph['segments'] = {};

    // Intro segment with choices
    segments['intro'] = {
      id: 'intro',
      title: introSegment.title,
      audio_url: introSegment.audio_url,
      image_urls: introSegment.image_urls,
      text_content: introSegment.text_content,
      duration: introSegment.duration,
      is_choice_point: true,
      choices: choices.map((c, i) => ({
        id: c.id,
        label: c.label || `Choix ${i + 1}`,
        icon: c.icon,
        next_segment: branches[i]?.segment.id ?? `branch_${i}`,
        is_default: c.is_default,
      })),
      is_ending: false,
    };

    // Branch segments
    branches.forEach((branch) => {
      const seg = branch.segment;
      segments[seg.id] = {
        id: seg.id,
        title: seg.title,
        audio_url: seg.audio_url,
        image_urls: seg.image_urls,
        text_content: seg.text_content,
        duration: seg.duration,
        is_choice_point: !seg.is_ending && (branch.sub_choices?.length ?? 0) > 0,
        choices: branch.sub_choices?.map((sc, si) => ({
          id: sc.id,
          label: sc.label || `Choix ${si + 1}`,
          icon: sc.icon,
          next_segment: branch.sub_branches?.[si]?.segment.id ?? `sub_${si}`,
          is_default: sc.is_default,
        })) ?? [],
        is_ending: seg.is_ending,
        ending_badge: seg.ending_badge,
        ending_title: seg.ending_title,
      };

      // Sub-branches (level 2)
      branch.sub_branches?.forEach(sub => {
        segments[sub.segment.id] = {
          id: sub.segment.id,
          title: sub.segment.title,
          audio_url: sub.segment.audio_url,
          image_urls: sub.segment.image_urls,
          text_content: sub.segment.text_content,
          duration: sub.segment.duration,
          is_choice_point: false,
          choices: [],
          is_ending: sub.segment.is_ending,
          ending_badge: sub.segment.ending_badge,
          ending_title: sub.segment.ending_title,
        };
      });
    });

    return { entry_segment: 'intro', segments };
  }, [introSegment, choices, branches]);

  const handlePublish = () => {
    const graph = buildGraph();
    onPublish(graph, title, description);
  };

  return (
    <div className="flex flex-col h-full bg-background text-foreground">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border/50">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2">
            <span>🎪</span> Conte Vivant Builder
          </h2>
          <p className="text-xs text-muted-foreground">Étape {stepIdx + 1}/{STEPS.length}</p>
        </div>
        <Button variant="ghost" size="sm" onClick={onCancel}>Annuler</Button>
      </div>

      {/* Step indicators */}
      <div className="flex px-4 py-2 gap-1 overflow-x-auto">
        {STEPS.map((step, i) => (
          <button
            key={step.key}
            onClick={() => setCurrentStep(step.key)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs whitespace-nowrap transition-colors
              ${i === stepIdx 
                ? 'bg-primary text-primary-foreground' 
                : i < stepIdx 
                  ? 'bg-primary/20 text-primary' 
                  : 'bg-muted text-muted-foreground'
              }`}
          >
            <span>{step.icon}</span>
            <span>{step.label}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <AnimatePresence mode="wait">
          {/* Step 1: Intro */}
          {currentStep === 'intro' && (
            <motion.div key="intro" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Titre du conte..."
                className="text-lg font-semibold"
              />
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Description courte..."
              />
              <SegmentEditor
                segment={introSegment}
                onChange={setIntroSegment}
                label="📖 Segment d'introduction"
              />
            </motion.div>
          )}

          {/* Step 2: Choices */}
          {currentStep === 'choices' && (
            <motion.div key="choices" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
              <p className="text-sm text-muted-foreground">Définissez les choix proposés au spectateur à la fin de l'introduction :</p>
              {choices.map((choice, idx) => (
                <div key={choice.id} className="p-3 rounded-xl bg-card/50 border border-border/50 space-y-2">
                  <div className="flex items-center gap-2">
                    <Input
                      value={choice.icon}
                      onChange={(e) => updateChoice(idx, { icon: e.target.value })}
                      placeholder="Emoji"
                      className="w-16 text-center text-lg"
                    />
                    <Input
                      value={choice.label}
                      onChange={(e) => updateChoice(idx, { label: e.target.value })}
                      placeholder={`Choix ${idx + 1} (ex: Combattre le dragon)`}
                      className="flex-1"
                    />
                  </div>
                  <label className="flex items-center gap-2 text-xs text-muted-foreground">
                    <input
                      type="radio"
                      name="default_choice"
                      checked={choice.is_default}
                      onChange={() => {
                        choices.forEach((_, i) => updateChoice(i, { is_default: i === idx }));
                      }}
                    />
                    Choix par défaut (si timeout)
                  </label>
                </div>
              ))}
            </motion.div>
          )}

          {/* Step 3: Branches */}
          {currentStep === 'branches' && (
            <motion.div key="branches" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
              <p className="text-sm text-muted-foreground">Éditez le contenu de chaque branche :</p>
              {branches.map((branch, idx) => (
                <div key={branch.segment.id} className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <span>{choices[idx]?.icon || '👉'}</span>
                    <span>{choices[idx]?.label || `Branche ${idx + 1}`}</span>
                  </div>
                  <SegmentEditor
                    segment={branch.segment}
                    onChange={(seg) => updateBranchSegment(idx, seg)}
                    label={`Segment : ${choices[idx]?.label || `Branche ${idx + 1}`}`}
                    showEndingOptions
                  />
                </div>
              ))}
            </motion.div>
          )}

          {/* Step 4: Endings */}
          {currentStep === 'endings' && (
            <motion.div key="endings" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
              <p className="text-sm text-muted-foreground">Vérifiez les fins de votre conte :</p>
              {branches.map((branch, idx) => (
                <div key={branch.segment.id} className="p-3 rounded-xl bg-card/50 border border-border/50 space-y-2">
                  <p className="text-sm font-medium flex items-center gap-2">
                    <span>{choices[idx]?.icon}</span>
                    <span>{choices[idx]?.label || `Branche ${idx + 1}`}</span>
                    {branch.segment.is_ending ? (
                      <span className="ml-auto text-xs text-green-400">✅ Fin configurée</span>
                    ) : (
                      <span className="ml-auto text-xs text-amber-400">⚠️ Pas encore une fin</span>
                    )}
                  </p>
                  {branch.segment.is_ending && (
                    <p className="text-xs text-muted-foreground">
                      Badge: {branch.segment.ending_badge || '—'} | {branch.segment.ending_title || '—'}
                    </p>
                  )}
                </div>
              ))}
            </motion.div>
          )}

          {/* Step 5: Preview */}
          {currentStep === 'preview' && (
            <motion.div key="preview" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Eye className="w-4 h-4" /> Aperçu de l'arbre
              </h3>
              <StoryTreePreview graph={buildGraph()} />
              <div className="p-3 rounded-xl bg-card/50 border border-border/50">
                <p className="text-sm"><strong>Titre :</strong> {title || '(sans titre)'}</p>
                <p className="text-sm"><strong>Description :</strong> {description || '(aucune)'}</p>
                <p className="text-sm"><strong>Segments :</strong> {Object.keys(buildGraph().segments).length}</p>
                <p className="text-sm"><strong>Fins :</strong> {Object.values(buildGraph().segments).filter(s => s.is_ending).length}</p>
              </div>
            </motion.div>
          )}

          {/* Step 6: Publish */}
          {currentStep === 'publish' && (
            <motion.div key="publish" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6 text-center py-8">
              <Sparkles className="w-12 h-12 mx-auto text-amber-400" />
              <h3 className="text-xl font-bold">Prêt à publier ?</h3>
              <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                Votre conte "{title || 'Sans titre'}" sera disponible pour tous les spectateurs.
              </p>
              <Button onClick={handlePublish} size="lg" className="gap-2">
                <Upload className="w-4 h-4" />
                Publier le conte
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between p-4 border-t border-border/50">
        <Button
          variant="outline"
          size="sm"
          disabled={stepIdx === 0}
          onClick={() => setCurrentStep(STEPS[stepIdx - 1]?.key ?? 'intro')}
          className="gap-1"
        >
          <ChevronLeft className="w-4 h-4" />
          Précédent
        </Button>
        <Button
          size="sm"
          disabled={stepIdx === STEPS.length - 1}
          onClick={() => setCurrentStep(STEPS[stepIdx + 1]?.key ?? 'publish')}
          className="gap-1"
        >
          Suivant
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
