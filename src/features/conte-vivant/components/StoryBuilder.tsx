import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronLeft, Eye, Upload, Sparkles, Music, X, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import SegmentEditor from './SegmentEditor';
import StoryTreePreview from './StoryTreePreview';
import BranchingPlayer from './BranchingPlayer';
import AudioLibrary from '@/components/tamtam/creator/AudioLibrary';
import type { AudioTrack } from '@/types/audio';
import type { SegmentDraft, ChoiceDraft, BranchDraft, StoryGraph, BuilderStep } from '../types/story.types';

type BlobMap = Record<string, { narrationBlob?: Blob; audioBlob?: Blob }>;

interface StoryBuilderProps {
  onPublish: (graph: StoryGraph, title: string, description: string, blobs: BlobMap) => void;
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
  const [selectedMusic, setSelectedMusic] = useState<{ url: string; name: string } | null>(null);
  const [showMusicLibrary, setShowMusicLibrary] = useState(false);
  const [showTestPlayer, setShowTestPlayer] = useState(false);
  const [showPublishConfirm, setShowPublishConfirm] = useState(false);

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

  const handleMusicSelect = (track: AudioTrack) => {
    setSelectedMusic({ url: track.source?.url || '', name: track.title });
    setShowMusicLibrary(false);
  };

  const buildGraph = useCallback((): StoryGraph => {
    const segments: StoryGraph['segments'] = {};

    segments['intro'] = {
      id: 'intro', title: introSegment.title,
      audio_url: introSegment.narrator_audio_url || introSegment.audio_url,
      narrator_audio_url: introSegment.narrator_audio_url,
      image_urls: introSegment.image_urls, text_content: introSegment.text_content,
      duration: introSegment.duration, is_choice_point: true,
      mediaType: introSegment.mediaType, media_url: introSegment.media_url,
      background_music_url: selectedMusic?.url,
      choices: choices.map((c, i) => ({
        id: c.id, label: c.label || `Choix ${i + 1}`, icon: c.icon,
        next_segment: branches[i]?.segment.id ?? `branch_${i}`, is_default: c.is_default,
      })),
      is_ending: false,
    };

    branches.forEach((branch) => {
      const seg = branch.segment;
      segments[seg.id] = {
        id: seg.id, title: seg.title,
        audio_url: seg.narrator_audio_url || seg.audio_url,
        narrator_audio_url: seg.narrator_audio_url,
        image_urls: seg.image_urls, text_content: seg.text_content,
        duration: seg.duration, mediaType: seg.mediaType, media_url: seg.media_url,
        is_choice_point: !seg.is_ending && (branch.sub_choices?.length ?? 0) > 0,
        choices: branch.sub_choices?.map((sc, si) => ({
          id: sc.id, label: sc.label || `Choix ${si + 1}`, icon: sc.icon,
          next_segment: branch.sub_branches?.[si]?.segment.id ?? `sub_${si}`, is_default: sc.is_default,
        })) ?? [],
        is_ending: seg.is_ending, ending_badge: seg.ending_badge, ending_title: seg.ending_title,
      };

      branch.sub_branches?.forEach(sub => {
        segments[sub.segment.id] = {
          id: sub.segment.id, title: sub.segment.title,
          audio_url: sub.segment.narrator_audio_url || sub.segment.audio_url,
          narrator_audio_url: sub.segment.narrator_audio_url,
          image_urls: sub.segment.image_urls, text_content: sub.segment.text_content,
          duration: sub.segment.duration, mediaType: sub.segment.mediaType, media_url: sub.segment.media_url,
          is_choice_point: false, choices: [],
          is_ending: sub.segment.is_ending, ending_badge: sub.segment.ending_badge, ending_title: sub.segment.ending_title,
        };
      });
    });

    return { entry_segment: 'intro', segments };
  }, [introSegment, choices, branches, selectedMusic]);

  const validateGraph = useCallback(() => {
    const graph = buildGraph();
    const errors: string[] = [];
    const warnings: string[] = [];
    Object.entries(graph.segments).forEach(([id, seg]) => {
      if (!seg.media_url && !seg.audio_url) warnings.push(`"${id}" : Aucun média`);
      if (seg.is_choice_point && seg.choices.length === 0) errors.push(`"${id}" : Point de choix sans choix`);
    });
    if (Object.values(graph.segments).filter(s => s.is_ending).length === 0) errors.push('Aucune fin définie');
    return { isValid: errors.length === 0, errors, warnings };
  }, [buildGraph]);

  const collectBlobs = useCallback((): BlobMap => {
    const map: BlobMap = {};
    const addSeg = (seg: SegmentDraft) => {
      if (seg.narrator_audio_blob || seg.audio_blob) {
        map[seg.id] = { narrationBlob: seg.narrator_audio_blob, audioBlob: seg.audio_blob };
      }
    };
    addSeg(introSegment);
    branches.forEach(b => {
      addSeg(b.segment);
      b.sub_branches?.forEach(sub => addSeg(sub.segment));
    });
    return map;
  }, [introSegment, branches]);

  const handlePublish = () => {
    const graph = buildGraph();
    const blobs = collectBlobs();
    onPublish(graph, title, description, blobs);
    setShowPublishConfirm(false);
  };

  const renderSegmentMini = (seg: SegmentDraft, segLabel: string) => {
    const hasMedia = Boolean(seg.media_url);
    const hasAudio = Boolean(seg.narrator_audio_url || seg.audio_url);
    const isVideo = seg.mediaType === 'video';

    return (
      <div className="flex items-center gap-2 p-2 rounded-lg bg-white/5 border border-white/10">
        <div className="w-12 h-20 rounded-md overflow-hidden bg-white/5 flex-shrink-0 relative">
          {hasMedia ? (
            isVideo ? <video src={seg.media_url} className="w-full h-full object-cover" muted playsInline />
              : <img src={seg.media_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white/30 text-xs">—</div>
          )}
          <div className="absolute bottom-0.5 right-0.5 flex gap-0.5">
            {isVideo && <span className="text-[9px] bg-purple-500 text-white rounded px-0.5">🎬</span>}
            {!isVideo && hasMedia && <span className="text-[9px] bg-amber-500 text-white rounded px-0.5">📷</span>}
            {hasAudio && <span className="text-[9px] bg-green-500 text-white rounded px-0.5">🎙️</span>}
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-white truncate">{segLabel}</p>
          <p className="text-xs text-white/60">{seg.duration}s</p>
          {!hasMedia && <p className="text-xs text-amber-400">⚠️ Pas de média</p>}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-[100dvh]" style={{ backgroundColor: '#08080c', color: '#e5e5e5' }}>
      {/* Header */}
      <div className="flex items-center justify-between p-3 sm:p-4 border-b border-white/10 flex-shrink-0">
        <div>
          <h2 className="text-base sm:text-lg font-bold flex items-center gap-2 text-white">
            <span>🎪</span> Conte Vivant
          </h2>
          <p className="text-xs text-white/60">Étape {stepIdx + 1} sur {STEPS.length}</p>
        </div>
        <div className="flex items-center gap-2">
          <Sheet open={showMusicLibrary} onOpenChange={setShowMusicLibrary}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-1 text-white/70 min-h-[44px]">
                <Music className="w-4 h-4" />
                {selectedMusic ? (
                  <span className="text-xs text-primary max-w-[50px] truncate">{selectedMusic.name}</span>
                ) : '🎵'}
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[85vh] bg-background">
              <AudioLibrary isOpen={true} onClose={() => setShowMusicLibrary(false)} onSelectTrack={handleMusicSelect} />
            </SheetContent>
          </Sheet>
          {selectedMusic && (
            <button onClick={() => setSelectedMusic(null)}
              className="w-6 h-6 rounded-full bg-destructive/20 text-destructive flex items-center justify-center">
              <X className="w-3 h-3" />
            </button>
          )}
          <Button variant="ghost" size="sm" onClick={onCancel} className="min-h-[44px] text-white/70">Annuler</Button>
        </div>
      </div>

      {/* Step indicators - scrollable */}
      <div className="flex px-3 py-2 gap-1.5 overflow-x-auto flex-shrink-0 scrollbar-none border-b border-white/10">
        {STEPS.map((step, i) => (
          <button key={step.key} onClick={() => setCurrentStep(step.key)}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs whitespace-nowrap transition-colors min-h-[36px] flex-shrink-0
              ${i === stepIdx
                ? 'bg-amber-500 text-white font-semibold'
                : i < stepIdx
                  ? 'bg-amber-500/20 text-amber-300'
                  : 'bg-white/5 text-white/50'
              }`}>
            <span>{step.icon}</span>
            <span>{step.label}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-4 min-h-0">
        <AnimatePresence mode="wait">
          {currentStep === 'intro' && (
            <motion.div key="intro" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Titre du conte..." className="text-lg font-semibold" />
              <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description courte..." />
              <SegmentEditor segment={introSegment} onChange={setIntroSegment} label="📖 Segment d'introduction" />
            </motion.div>
          )}

          {currentStep === 'choices' && (
            <motion.div key="choices" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
              <p className="text-sm text-white/70">Définissez les choix proposés au spectateur :</p>
              {choices.map((choice, idx) => (
                <div key={choice.id} className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-2">
                  <div className="flex items-center gap-2">
                    <Input value={choice.icon} onChange={(e) => updateChoice(idx, { icon: e.target.value })}
                      placeholder="Emoji" className="w-16 text-center text-lg" />
                    <Input value={choice.label} onChange={(e) => updateChoice(idx, { label: e.target.value })}
                      placeholder={`Choix ${idx + 1} (ex: Combattre le dragon)`} className="flex-1" />
                  </div>
                  <label className="flex items-center gap-2 text-xs text-white/70">
                    <input type="radio" name="default_choice" checked={choice.is_default}
                      onChange={() => { choices.forEach((_, i) => updateChoice(i, { is_default: i === idx })); }} />
                    Choix par défaut (si timeout)
                  </label>
                </div>
              ))}
            </motion.div>
          )}

          {currentStep === 'branches' && (
            <motion.div key="branches" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
              <p className="text-sm text-white/70">Éditez le contenu de chaque branche :</p>
              <div className="space-y-2">
                {renderSegmentMini(introSegment, `📖 ${introSegment.title || 'Introduction'}`)}
                {branches.map((branch, idx) => (
                  renderSegmentMini(branch.segment, `${choices[idx]?.icon || '👉'} ${choices[idx]?.label || `Branche ${idx + 1}`}`)
                ))}
              </div>
              <div className="border-t border-border/30 pt-4 space-y-4">
                {branches.map((branch, idx) => (
                  <div key={branch.segment.id} className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-white">
                      <span>{choices[idx]?.icon || '👉'}</span>
                      <span>{choices[idx]?.label || `Branche ${idx + 1}`}</span>
                    </div>
                    <SegmentEditor segment={branch.segment} onChange={(seg) => updateBranchSegment(idx, seg)}
                      label={`Segment : ${choices[idx]?.label || `Branche ${idx + 1}`}`} showEndingOptions showChoiceOptions />
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {currentStep === 'endings' && (
            <motion.div key="endings" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
              <p className="text-sm text-white/70">Vérifiez les fins de votre conte :</p>
              {branches.map((branch, idx) => (
                <div key={branch.segment.id} className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-2">
                  <p className="text-sm font-medium flex items-center gap-2">
                    <span>{choices[idx]?.icon}</span>
                    <span>{choices[idx]?.label || `Branche ${idx + 1}`}</span>
                    {branch.segment.is_ending
                      ? <span className="ml-auto text-xs text-green-400">✅ Fin configurée</span>
                      : <span className="ml-auto text-xs text-amber-400">⚠️ Pas encore une fin</span>}
                  </p>
                  {branch.segment.is_ending && (
                    <p className="text-xs text-white/60">
                      Badge: {branch.segment.ending_badge || '—'} | {branch.segment.ending_title || '—'}
                    </p>
                  )}
                </div>
              ))}

              {(() => {
                const validation = validateGraph();
                return (
                  <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-2">
                    <h4 className="text-sm font-semibold text-white">📋 Validation</h4>
                    {validation.errors.map((err, i) => <p key={i} className="text-xs text-destructive">❌ {err}</p>)}
                    {validation.warnings.map((w, i) => <p key={i} className="text-xs text-amber-400">⚠️ {w}</p>)}
                    {validation.isValid && validation.warnings.length === 0 && (
                      <p className="text-xs text-green-400">✅ Conte prêt pour publication</p>
                    )}
                  </div>
                );
              })()}
            </motion.div>
          )}

          {currentStep === 'preview' && (
            <motion.div key="preview" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Eye className="w-4 h-4" /> Aperçu de l'arbre
              </h3>
              <StoryTreePreview graph={buildGraph()} />

              {/* Story summary */}
              <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-1">
                <p className="text-sm text-white"><strong>Titre :</strong> {title || '(sans titre)'}</p>
                <p className="text-sm"><strong>Description :</strong> {description || '(aucune)'}</p>
                <p className="text-sm"><strong>Segments :</strong> {Object.keys(buildGraph().segments).length}</p>
                <p className="text-sm"><strong>Fins :</strong> {Object.values(buildGraph().segments).filter(s => s.is_ending).length}</p>
                {selectedMusic && <p className="text-sm"><strong>Musique :</strong> 🎵 {selectedMusic.name}</p>}
              </div>

              {/* Test Story Button */}
              <Button onClick={() => setShowTestPlayer(true)} size="lg"
                className="w-full gap-2 min-h-[48px] bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-semibold">
                <Play className="w-5 h-5" />
                🎪 Tester mon conte
              </Button>
            </motion.div>
          )}

          {currentStep === 'publish' && (
            <motion.div key="publish" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
              className="space-y-6 text-center py-8">
              <Sparkles className="w-12 h-12 mx-auto text-amber-400" />
              <h3 className="text-xl font-bold">Prêt à publier ?</h3>
              <p className="text-sm text-white/60 max-w-xs mx-auto">
                Votre conte "{title || 'Sans titre'}" sera disponible pour tous les spectateurs.
              </p>
              <Button onClick={() => setShowPublishConfirm(true)} size="lg" className="gap-2 min-h-[48px]">
                <Upload className="w-4 h-4" />
                Publier le conte
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Navigation footer */}
      <div className="flex items-center justify-between p-3 sm:p-4 border-t border-white/10 flex-shrink-0 gap-2">
        <Button variant="outline" disabled={stepIdx === 0}
          onClick={() => setCurrentStep(STEPS[stepIdx - 1]?.key ?? 'intro')}
          className="gap-1.5 min-h-[44px] flex-1 sm:flex-none border-white/20 text-white hover:bg-white/10">
          <ChevronLeft className="w-4 h-4" />
          <span>Précédent</span>
        </Button>
        <span className="text-xs text-white/50">{stepIdx + 1}/{STEPS.length}</span>
        <Button disabled={stepIdx === STEPS.length - 1}
          onClick={() => setCurrentStep(STEPS[stepIdx + 1]?.key ?? 'publish')}
          className="gap-1.5 min-h-[44px] flex-1 sm:flex-none bg-amber-500 hover:bg-amber-400 text-white">
          <span>Suivant</span>
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {/* Test Player overlay */}
      {showTestPlayer && (
        <div className="fixed inset-0 z-50 bg-black">
          <BranchingPlayer graph={buildGraph()} onClose={() => setShowTestPlayer(false)} />
        </div>
      )}

      {/* Publish confirmation dialog */}
      <Dialog open={showPublishConfirm} onOpenChange={setShowPublishConfirm}>
        <DialogContent className="bg-background border-border max-w-sm">
          <DialogTitle>Confirmer la publication</DialogTitle>
          <DialogDescription>
            Votre conte "{title || 'Sans titre'}" sera visible par tous. Êtes-vous sûr ?
          </DialogDescription>
          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setShowPublishConfirm(false)} className="min-h-[44px]">Annuler</Button>
            <Button onClick={handlePublish} className="min-h-[44px] gap-2">
              <Upload className="w-4 h-4" />
              Publier
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
