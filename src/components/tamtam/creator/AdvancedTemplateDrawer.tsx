import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Clock, Sparkles, Volume2 } from "lucide-react";
import { 
  ADVANCED_TEMPLATES, 
  TEMPLATE_COLLECTIONS,
  getTemplatesByCollection,
  getTemplatesByFamily,
  AdvancedTemplate,
  TemplateCollection,
  TemplateFamily,
  formatDuration
} from "./AdvancedTemplateData";

interface AdvancedTemplateDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate: (template: AdvancedTemplate) => void;
}

type ViewMode = 'collections' | 'family' | 'all';

const AdvancedTemplateDrawer: React.FC<AdvancedTemplateDrawerProps> = ({
  isOpen,
  onClose,
  onSelectTemplate
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('collections');
  const [selectedCollection, setSelectedCollection] = useState<string | null>(null);
  const [selectedFamily, setSelectedFamily] = useState<TemplateFamily | null>(null);

  const handleCollectionClick = (collectionId: string) => {
    setSelectedCollection(collectionId);
    setViewMode('collections');
  };

  const handleFamilyClick = (family: TemplateFamily) => {
    setSelectedFamily(family);
    setViewMode('family');
  };

  const getDisplayedTemplates = (): AdvancedTemplate[] => {
    if (selectedCollection) {
      return getTemplatesByCollection(selectedCollection);
    }
    if (selectedFamily) {
      return getTemplatesByFamily(selectedFamily);
    }
    return ADVANCED_TEMPLATES;
  };

  const resetView = () => {
    setSelectedCollection(null);
    setSelectedFamily(null);
    setViewMode('collections');
  };

  const getFamilyLabel = (family: TemplateFamily): string => {
    const labels: Record<TemplateFamily, string> = {
      'grand_public': 'Grand Public',
      'educatif_culture': 'Éducatif & Culture',
      'vocal_radio': 'Vocal & Radio'
    };
    return labels[family];
  };

  const getFamilyEmoji = (family: TemplateFamily): string => {
    const emojis: Record<TemplateFamily, string> = {
      'grand_public': '🎬',
      'educatif_culture': '📚',
      'vocal_radio': '📻'
    };
    return emojis[family];
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm"
        >
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="absolute inset-0 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                {(selectedCollection || selectedFamily) && (
                  <button
                    onClick={resetView}
                    className="text-white/60 hover:text-white text-sm"
                  >
                    ← Retour
                  </button>
                )}
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-amber-400" />
                  Templates IA
                </h2>
              </div>
              <button
                onClick={onClose}
                className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10"
              >
                <X className="h-5 w-5 text-white" />
              </button>
            </div>

            {/* Collections Tab Bar */}
            <div className="flex gap-2 px-4 py-3 overflow-x-auto scrollbar-hide border-b border-white/5">
              {TEMPLATE_COLLECTIONS.map((collection) => (
                <button
                  key={collection.id}
                  onClick={() => handleCollectionClick(collection.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                    selectedCollection === collection.id
                      ? `bg-gradient-to-r ${collection.color} text-white`
                      : 'bg-white/10 text-white/70 hover:bg-white/20'
                  }`}
                >
                  <span>{collection.emoji}</span>
                  <span>{collection.name_fr}</span>
                </button>
              ))}
              <button
                onClick={() => {
                  setSelectedCollection(null);
                  setSelectedFamily(null);
                  setViewMode('all');
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                  !selectedCollection && !selectedFamily
                    ? 'bg-white text-black'
                    : 'bg-white/10 text-white/70 hover:bg-white/20'
                }`}
              >
                <span>📋</span>
                <span>Tous (24)</span>
              </button>
            </div>

            {/* Family Filter (when viewing all) */}
            {!selectedCollection && (
              <div className="flex gap-2 px-4 py-2 overflow-x-auto scrollbar-hide">
                {(['grand_public', 'educatif_culture', 'vocal_radio'] as TemplateFamily[]).map((family) => (
                  <button
                    key={family}
                    onClick={() => handleFamilyClick(family)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                      selectedFamily === family
                        ? 'bg-white text-black'
                        : 'bg-white/5 text-white/50 hover:bg-white/10'
                    }`}
                  >
                    <span>{getFamilyEmoji(family)}</span>
                    <span>{getFamilyLabel(family)}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Collection Header (when selected) */}
            {selectedCollection && (
              <div className="px-4 py-3">
                {(() => {
                  const collection = TEMPLATE_COLLECTIONS.find(c => c.id === selectedCollection);
                  if (!collection) return null;
                  return (
                    <div className={`p-4 rounded-2xl bg-gradient-to-r ${collection.color}`}>
                      <div className="flex items-center gap-3">
                        <span className="text-4xl">{collection.emoji}</span>
                        <div>
                          <h3 className="text-xl font-bold text-white">{collection.name_fr}</h3>
                          <p className="text-white/80 text-sm">{collection.description_fr}</p>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Templates Grid */}
            <div className="flex-1 overflow-y-auto px-4 py-4">
              <div className="grid grid-cols-2 gap-3">
                {getDisplayedTemplates().map((template) => (
                  <TemplateCard
                    key={template.id}
                    template={template}
                    onSelect={() => onSelectTemplate(template)}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// ============================================================
// Template Card Component
// ============================================================

interface TemplateCardProps {
  template: AdvancedTemplate;
  onSelect: () => void;
}

const TemplateCard: React.FC<TemplateCardProps> = ({ template, onSelect }) => {
  const [isPressed, setIsPressed] = useState(false);

  const getFeatureIcons = () => {
    const features = [];
    if (template.features.beatSync) features.push('🎵');
    if (template.features.smartCaptions) features.push('💬');
    if (template.features.translation) features.push('🌍');
    if (template.features.audioEnhance) features.push('🔊');
    if (template.features.narrativeStructure) features.push('📖');
    if (template.features.stabilization) features.push('📹');
    if (template.features.styleTransfer) features.push('🎨');
    if (template.features.photoAnimation) features.push('✨');
    return features.slice(0, 3);
  };

  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onTouchStart={() => setIsPressed(true)}
      onTouchEnd={() => setIsPressed(false)}
      onMouseDown={() => setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      onMouseLeave={() => setIsPressed(false)}
      onClick={onSelect}
      className={`relative overflow-hidden rounded-2xl p-4 text-left transition-all ${
        isPressed ? 'ring-2 ring-white' : ''
      }`}
    >
      {/* Background Gradient */}
      <div className={`absolute inset-0 bg-gradient-to-br ${template.color} opacity-80`} />
      
      {/* Animated Background Effect */}
      <motion.div
        className="absolute inset-0 bg-white/10"
        animate={{
          opacity: template.previewAnimation === 'pulse' ? [0.1, 0.3, 0.1] : 
                   template.previewAnimation === 'wave' ? [0.05, 0.2, 0.05] : 0.1,
          scale: template.previewAnimation === 'glow' ? [1, 1.05, 1] : 1
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />

      {/* Content */}
      <div className="relative z-10">
        <div className="text-3xl mb-2">{template.emoji}</div>
        <h3 className="font-bold text-white text-sm leading-tight mb-1">
          {template.label_fr}
        </h3>
        <p className="text-white/70 text-xs line-clamp-2 mb-3">
          {template.description_fr}
        </p>

        {/* Features */}
        <div className="flex items-center gap-1 mb-2">
          {getFeatureIcons().map((icon, i) => (
            <span key={i} className="text-xs">{icon}</span>
          ))}
        </div>

        {/* Durations */}
        <div className="flex items-center gap-1 flex-wrap">
          <Clock className="h-3 w-3 text-white/50" />
          {template.supportedDurations.slice(0, 3).map((dur, i) => (
            <span key={i} className="text-[10px] text-white/60 bg-white/10 px-1.5 py-0.5 rounded">
              {formatDuration(dur)}
            </span>
          ))}
          {template.supportedDurations.length > 3 && (
            <span className="text-[10px] text-white/40">+{template.supportedDurations.length - 3}</span>
          )}
        </div>
      </div>

      {/* Voice Indicator */}
      {template.voiceInstructions.length > 0 && (
        <div className="absolute top-2 right-2">
          <Volume2 className="h-4 w-4 text-white/50" />
        </div>
      )}
    </motion.button>
  );
};

export default AdvancedTemplateDrawer;
