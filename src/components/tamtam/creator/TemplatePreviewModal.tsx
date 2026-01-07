import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Play, Download, Mic, Volume2, Star, Clock, 
  CheckCircle, Sparkles, FileJson, Image as ImageIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { AIGeneratedTemplate } from '@/hooks/useTemplateLibrary';
import { useFrenchTTS } from '@/hooks/useFrenchTTS';
import { useBaribaTTS } from '@/hooks/useBaribaTTS';

interface TemplatePreviewModalProps {
  template: AIGeneratedTemplate | null;
  isOpen: boolean;
  onClose: () => void;
  onSelect: () => void;
  onDownload: () => void;
}

export function TemplatePreviewModal({
  template,
  isOpen,
  onClose,
  onSelect,
  onDownload,
}: TemplatePreviewModalProps) {
  const { speak: speakFr, isSpeaking: isSpeakingFr } = useFrenchTTS();
  const { speak: speakBa, isSpeaking: isSpeakingBa } = useBaribaTTS();

  if (!template || !isOpen) return null;

  const analysis = template.ai_analysis as any;
  const storyboard = template.ai_storyboard as any;

  const speakDescription = (lang: 'fr' | 'ba') => {
    if (lang === 'fr') {
      speakFr(template.ai_voice_description_fr || template.description_fr);
    } else {
      speakBa(template.ai_voice_description_ba || template.description_fr);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className="bg-background rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl"
          onClick={e => e.stopPropagation()}
        >
          {/* Header with Preview */}
          <div
            className="relative h-48 flex items-center justify-center"
            style={{ 
              background: `linear-gradient(135deg, ${template.color}30, ${template.color}60)` 
            }}
          >
            {/* Close Button */}
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-3 right-3 bg-background/50 backdrop-blur-sm"
              onClick={onClose}
            >
              <X className="w-5 h-5" />
            </Button>

            {/* Template Icon */}
            <div className="text-8xl">{template.emoji}</div>

            {/* Status Badge */}
            <Badge 
              className="absolute top-3 left-3"
              variant={template.generation_status === 'completed' ? 'default' : 'secondary'}
            >
              {template.generation_status === 'completed' ? (
                <><CheckCircle className="w-3 h-3 mr-1" /> IA Générée</>
              ) : (
                <><Clock className="w-3 h-3 mr-1" /> {template.generation_status}</>
              )}
            </Badge>

            {/* Featured Badge */}
            {template.is_featured && (
              <Badge className="absolute bottom-3 left-3 bg-yellow-500">
                <Star className="w-3 h-3 mr-1" /> Vedette
              </Badge>
            )}
          </div>

          <ScrollArea className="max-h-[calc(90vh-12rem)]">
            <div className="p-6 space-y-6">
              {/* Title and Description */}
              <div>
                <h2 className="text-2xl font-bold">{template.label_fr}</h2>
                {template.label_ba && (
                  <p className="text-sm text-muted-foreground italic">{template.label_ba}</p>
                )}

                {/* Voice Description */}
                <div className="mt-4 p-4 bg-muted rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium flex items-center gap-2">
                      <Volume2 className="w-4 h-4" />
                      Description vocale
                    </span>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => speakDescription('fr')}
                        disabled={isSpeakingFr}
                      >
                        🇫🇷 FR
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => speakDescription('ba')}
                        disabled={isSpeakingBa}
                      >
                        🇧🇯 BA
                      </Button>
                    </div>
                  </div>
                  <p className="text-sm">
                    {template.ai_voice_description_fr || template.description_fr}
                  </p>
                  {template.ai_voice_description_ba && (
                    <p className="text-sm text-muted-foreground mt-2 italic">
                      {template.ai_voice_description_ba}
                    </p>
                  )}
                </div>

                {/* Enhanced Description */}
                {template.ai_enhanced_description && (
                  <p className="mt-4 text-muted-foreground">
                    {template.ai_enhanced_description}
                  </p>
                )}
              </div>

              <Separator />

              {/* AI Analysis */}
              {analysis && (
                <div>
                  <h3 className="font-semibold flex items-center gap-2 mb-3">
                    <Sparkles className="w-4 h-4 text-primary" />
                    Analyse IA
                  </h3>
                  
                  {/* Scores */}
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
                    {analysis.clarté && (
                      <ScoreCard label="Clarté" score={analysis.clarté} />
                    )}
                    {analysis.accessibilité && (
                      <ScoreCard label="Accessibilité" score={analysis.accessibilité} />
                    )}
                    {analysis.pertinence_culturelle && (
                      <ScoreCard label="Culture" score={analysis.pertinence_culturelle} />
                    )}
                    {analysis.facilité_technique && (
                      <ScoreCard label="Facilité" score={analysis.facilité_technique} />
                    )}
                    {analysis.créativité && (
                      <ScoreCard label="Créativité" score={analysis.créativité} />
                    )}
                  </div>

                  {/* Points forts */}
                  {analysis.points_forts && (
                    <div className="mb-3">
                      <span className="text-sm font-medium">✅ Points forts:</span>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {analysis.points_forts.map((point: string, i: number) => (
                          <Badge key={i} variant="outline" className="bg-green-500/10">
                            {point}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Tags */}
                  {analysis.tags && (
                    <div className="flex flex-wrap gap-2">
                      {analysis.tags.map((tag: string, i: number) => (
                        <Badge key={i} variant="secondary">
                          #{tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <Separator />

              {/* Storyboard */}
              {storyboard?.steps && (
                <div>
                  <h3 className="font-semibold flex items-center gap-2 mb-3">
                    <FileJson className="w-4 h-4 text-primary" />
                    Storyboard
                  </h3>
                  <div className="space-y-3">
                    {storyboard.steps.map((step: any, i: number) => (
                      <div
                        key={i}
                        className="flex items-start gap-3 p-3 bg-muted rounded-lg"
                      >
                        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold shrink-0">
                          {step.step}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-sm">{step.action}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            🎬 {step.visual}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            🔊 {step.audio_cue}
                          </p>
                        </div>
                        <Badge variant="outline" className="shrink-0">
                          {step.duration_seconds}s
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Separator />

              {/* Technical Info */}
              <div>
                <h3 className="font-semibold mb-3">Informations techniques</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Famille:</span>
                    <Badge variant="outline" className="ml-2">{template.family}</Badge>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Collection:</span>
                    <Badge variant="outline" className="ml-2">{template.collection || 'N/A'}</Badge>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Durées:</span>
                    <span className="ml-2">{template.supported_durations.join(', ')}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Ratios:</span>
                    <span className="ml-2">{template.output_ratios.join(', ')}</span>
                  </div>
                </div>

                {/* Features */}
                <div className="mt-4 flex flex-wrap gap-2">
                  {Object.entries(template.features || {}).map(([key, value]) => (
                    value && (
                      <Badge key={key} variant="secondary">
                        {key.replace(/([A-Z])/g, ' $1').trim()}
                      </Badge>
                    )
                  ))}
                </div>
              </div>

              {/* Stats */}
              <div className="flex items-center justify-center gap-6 pt-4 border-t text-sm text-muted-foreground">
                <span>📊 {template.usage_count} utilisations</span>
                <span>⬇️ {template.download_count} téléchargements</span>
                {template.rating_average > 0 && (
                  <span>⭐ {template.rating_average.toFixed(1)} ({template.rating_count})</span>
                )}
              </div>
            </div>
          </ScrollArea>

          {/* Actions Footer */}
          <div className="p-4 border-t bg-muted/50 flex gap-3">
            <Button variant="outline" className="flex-1" onClick={onDownload}>
              <Download className="w-4 h-4 mr-2" />
              Télécharger JSON
            </Button>
            <Button className="flex-1" onClick={onSelect}>
              <Play className="w-4 h-4 mr-2" />
              Utiliser ce template
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function ScoreCard({ label, score }: { label: string; score: number }) {
  const getColor = (s: number) => {
    if (s >= 80) return 'text-green-500';
    if (s >= 60) return 'text-yellow-500';
    return 'text-red-500';
  };

  return (
    <div className="bg-background rounded-lg p-3 text-center">
      <div className={`text-2xl font-bold ${getColor(score)}`}>{score}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
