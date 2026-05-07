import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, Download, Eye, Play, Filter, Mic, 
  RefreshCw, Sparkles, CheckCircle, Clock, AlertCircle,
  X, Grid, List, Heart, Image
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTemplateLibrary, AIGeneratedTemplate, TemplateFilters } from '@/hooks/useTemplateLibrary';
import { TemplatePreviewModal } from './TemplatePreviewModal';
import { useFrenchTTS } from '@/hooks/useFrenchTTS';
import { useTemplateVisuals } from '@/hooks/useTemplateVisuals';
import { AnimatedTemplateCard } from './AnimatedTemplateCard';
interface TemplateLibraryProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate: (template: AIGeneratedTemplate) => void;
}

export function TemplateLibrary({ isOpen, onClose, onSelectTemplate }: TemplateLibraryProps) {
  const {
    templates,
    stats,
    isLoading,
    isSyncing,
    isGenerating,
    generationProgress,
    syncTemplates,
    generateAllPending,
    downloadTemplate,
    filterTemplates,
  } = useTemplateLibrary();

  const { speak, isSpeaking } = useFrenchTTS();
  const { generateAllPending: generateAllVisuals, generationProgress: visualProgress, isGenerating: isGeneratingVisuals } = useTemplateVisuals();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFamily, setSelectedFamily] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [previewTemplate, setPreviewTemplate] = useState<AIGeneratedTemplate | null>(null);

  const filters: TemplateFilters = useMemo(() => ({
    family: selectedFamily || undefined,
    search: searchQuery || undefined,
  }), [selectedFamily, searchQuery]);

  const filteredTemplates = useMemo(() => filterTemplates(filters), [filterTemplates, filters]);

  const families = useMemo(() => {
    const uniqueFamilies = [...new Set(templates.map(t => t.family))];
    return uniqueFamilies;
  }, [templates]);

  const handleSpeakDescription = (template: AIGeneratedTemplate) => {
    const text = template.ai_voice_description_fr || template.description_fr;
    speak(text);
  };

  const handleSelect = (template: AIGeneratedTemplate) => {
    onSelectTemplate(template);
    onClose();
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'generating': return <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />;
      case 'pending': return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'failed': return <AlertCircle className="w-4 h-4 text-red-500" />;
      default: return null;
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-background rounded-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden shadow-2xl"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-4 border-b bg-gradient-to-r from-primary/10 to-accent/10">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Sparkles className="w-6 h-6 text-primary" />
                <h2 className="text-xl font-bold">Bibliothèque de Templates IA</h2>
              </div>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Stats Bar */}
            {stats && (
              <div className="flex items-center gap-4 text-sm">
                <Badge variant="outline" className="gap-1">
                  <CheckCircle className="w-3 h-3 text-green-500" />
                  {stats.completed} générés
                </Badge>
                <Badge variant="outline" className="gap-1">
                  <Clock className="w-3 h-3 text-yellow-500" />
                  {stats.pending} en attente
                </Badge>
                {stats.generating > 0 && (
                  <Badge variant="outline" className="gap-1">
                    <RefreshCw className="w-3 h-3 text-blue-500 animate-spin" />
                    {stats.generating} en cours
                  </Badge>
                )}
              </div>
            )}

            {/* Progress Bar */}
            {generationProgress && (
              <div className="mt-3">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span>Génération en cours: {generationProgress.currentTemplate}</span>
                  <span>{generationProgress.current}/{generationProgress.total}</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-primary"
                    initial={{ width: 0 }}
                    animate={{ width: `${(generationProgress.current / generationProgress.total) * 100}%` }}
                  />
                </div>
              </div>
            )}

            {/* Search and Actions */}
            <div className="flex items-center gap-3 mt-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher un template..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <Button variant="outline" size="icon" onClick={() => speak("Dites le nom du template que vous cherchez")}>
                <Mic className="w-4 h-4" />
              </Button>

              <div className="flex items-center border rounded-lg">
                <Button
                  variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                  size="icon"
                  onClick={() => setViewMode('grid')}
                >
                  <Grid className="w-4 h-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                  size="icon"
                  onClick={() => setViewMode('list')}
                >
                  <List className="w-4 h-4" />
                </Button>
              </div>

              <Button
                variant="outline"
                onClick={() => syncTemplates()}
                disabled={isSyncing}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
                Sync
              </Button>

              <Button
                onClick={generateAllPending}
                disabled={isGenerating || !stats || stats.pending === 0}
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Générer IA ({stats?.pending || 0})
              </Button>

              <Button
                variant="secondary"
                onClick={generateAllVisuals}
                disabled={isGeneratingVisuals}
              >
                <Image className="w-4 h-4 mr-2" />
                {isGeneratingVisuals ? 'Génération...' : 'Visuels IA'}
              </Button>
            </div>
          </div>

          {/* Family Tabs */}
          <Tabs value={selectedFamily || 'all'} onValueChange={v => setSelectedFamily(v === 'all' ? null : v)}>
            <div className="px-4 pt-2 border-b">
              <TabsList className="bg-transparent">
                <TabsTrigger value="all">Tous ({templates.length})</TabsTrigger>
                {families.map(family => (
                  <TabsTrigger key={family} value={family}>
                    {family === 'grand_public' && '🎬 Grand Public'}
                    {family === 'educatif_culture' && '📚 Éducatif'}
                    {family === 'vocal_radio' && '🎙️ Vocal/Radio'}
                    {!['grand_public', 'educatif_culture', 'vocal_radio'].includes(family) && family}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            {/* Template Grid/List */}
            <ScrollArea className="h-[calc(90vh-280px)]">
              <div className="p-4">
                {isLoading ? (
                  <div className="flex items-center justify-center py-20">
                    <RefreshCw className="w-8 h-8 animate-spin text-primary" />
                  </div>
                ) : filteredTemplates.length === 0 ? (
                  <div className="text-center py-20 text-muted-foreground">
                    <p>Aucun template trouvé</p>
                    <Button variant="link" onClick={() => syncTemplates()}>
                      Synchroniser depuis le code
                    </Button>
                  </div>
                ) : viewMode === 'grid' ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {filteredTemplates.map(template => (
                      <AnimatedTemplateCard
                        key={template.id}
                        template={template}
                        onPreview={() => setPreviewTemplate(template)}
                        onSelect={() => handleSelect(template)}
                        onDownload={() => downloadTemplate(template)}
                        onSpeak={() => handleSpeakDescription(template)}
                        isGeneratingVisuals={isGeneratingVisuals}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredTemplates.map(template => (
                      <TemplateListItem
                        key={template.id}
                        template={template}
                        onPreview={() => setPreviewTemplate(template)}
                        onSelect={() => handleSelect(template)}
                        onDownload={() => downloadTemplate(template)}
                        onSpeak={() => handleSpeakDescription(template)}
                        getStatusIcon={getStatusIcon}
                      />
                    ))}
                  </div>
                )}
              </div>
            </ScrollArea>
          </Tabs>
        </motion.div>

        {/* Preview Modal */}
        <TemplatePreviewModal
          template={previewTemplate}
          isOpen={!!previewTemplate}
          onClose={() => setPreviewTemplate(null)}
          onSelect={() => {
            if (previewTemplate) handleSelect(previewTemplate);
          }}
          onDownload={() => {
            if (previewTemplate) downloadTemplate(previewTemplate);
          }}
        />
      </motion.div>
    </AnimatePresence>
  );
}

// Template Card Component
function TemplateCard({
  template,
  onPreview,
  onSelect,
  onDownload,
  onSpeak,
  getStatusIcon,
}: {
  template: AIGeneratedTemplate;
  onPreview: () => void;
  onSelect: () => void;
  onDownload: () => void;
  onSpeak: () => void;
  getStatusIcon: (status: string) => React.ReactNode;
}) {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className="relative bg-card border rounded-xl overflow-hidden cursor-pointer group"
      style={{ borderColor: template.color }}
    >
      {/* Preview Area */}
      <div
        className="aspect-video flex items-center justify-center text-6xl"
        style={{ background: `linear-gradient(135deg, ${template.color}20, ${template.color}40)` }}
        onClick={onPreview}
      >
        {template.emoji}
        
        {/* Status Badge */}
        <div className="absolute top-2 right-2">
          {getStatusIcon(template.generation_status)}
        </div>

        {/* Hover Overlay */}
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
          <Button size="sm" variant="secondary" onClick={e => { e.stopPropagation(); onPreview(); }}>
            <Eye className="w-4 h-4" />
          </Button>
          <Button size="sm" variant="secondary" onClick={e => { e.stopPropagation(); onSpeak(); }}>
            <Mic className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Info */}
      <div className="p-3">
        <h3 className="font-semibold text-sm truncate">{template.label_fr}</h3>
        <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
          {template.ai_enhanced_description || template.description_fr}
        </p>

        {/* Stats */}
        <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
          <span>📊 {template.usage_count} utilisations</span>
          <span>⬇️ {template.download_count}</span>
        </div>

        {/* Actions */}
        <div className="flex gap-2 mt-3">
          <Button size="sm" className="flex-1" onClick={onSelect}>
            <Play className="w-3 h-3 mr-1" />
            Utiliser
          </Button>
          <Button size="sm" variant="outline" onClick={onDownload}>
            <Download className="w-3 h-3" />
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

// Template List Item Component
function TemplateListItem({
  template,
  onPreview,
  onSelect,
  onDownload,
  onSpeak,
  getStatusIcon,
}: {
  template: AIGeneratedTemplate;
  onPreview: () => void;
  onSelect: () => void;
  onDownload: () => void;
  onSpeak: () => void;
  getStatusIcon: (status: string) => React.ReactNode;
}) {
  return (
    <motion.div
      whileHover={{ backgroundColor: 'hsl(var(--muted))' }}
      className="flex items-center gap-4 p-3 rounded-lg border cursor-pointer"
      onClick={onPreview}
    >
      {/* Icon */}
      <div
        className="w-14 h-14 rounded-lg flex items-center justify-center text-2xl shrink-0"
        style={{ background: `linear-gradient(135deg, ${template.color}20, ${template.color}40)` }}
      >
        {template.emoji}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold truncate">{template.label_fr}</h3>
          {getStatusIcon(template.generation_status)}
        </div>
        <p className="text-sm text-muted-foreground truncate">
          {template.ai_enhanced_description || template.description_fr}
        </p>
        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
          <span>📊 {template.usage_count}</span>
          <span>⬇️ {template.download_count}</span>
          <Badge variant="outline" className="text-xs">
            {template.family}
          </Badge>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <Button size="sm" variant="ghost" onClick={e => { e.stopPropagation(); onSpeak(); }}>
          <Mic className="w-4 h-4" />
        </Button>
        <Button size="sm" variant="ghost" onClick={e => { e.stopPropagation(); onDownload(); }}>
          <Download className="w-4 h-4" />
        </Button>
        <Button size="sm" onClick={e => { e.stopPropagation(); onSelect(); }}>
          <Play className="w-4 h-4 mr-1" />
          Utiliser
        </Button>
      </div>
    </motion.div>
  );
}
