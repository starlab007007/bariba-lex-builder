import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Mic, Volume2, VolumeX, Sparkles, Play, ChevronRight, Search } from "lucide-react";
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
import { useFrenchTTS } from "@/hooks/useFrenchTTS";
import { useFrenchSTT } from "@/hooks/useFrenchSTT";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface AdvancedTemplateDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate: (template: AdvancedTemplate) => void;
  language?: 'fr' | 'ba';
}

const AdvancedTemplateDrawer: React.FC<AdvancedTemplateDrawerProps> = ({
  isOpen,
  onClose,
  onSelectTemplate,
  language = 'fr'
}) => {
  const [selectedCollection, setSelectedCollection] = useState<string | null>(null);
  const [focusedTemplate, setFocusedTemplate] = useState<AdvancedTemplate | null>(null);
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<Array<{ id: string; emoji: string; reason_fr: string }>>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [voiceDescriptions, setVoiceDescriptions] = useState<Record<string, string>>({});
  
  const { speak, stop: stopSpeaking, isSpeaking } = useFrenchTTS();
  const { startListening, stopListening, isListening, transcript } = useFrenchSTT();
  
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const lastSpokenTemplate = useRef<string | null>(null);

  // Haptic feedback
  const triggerHaptic = useCallback((pattern: number[]) => {
    if (navigator.vibrate) navigator.vibrate(pattern);
  }, []);

  // Sound feedback
  const playSound = useCallback((frequency: number, duration: number) => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      oscillator.frequency.value = frequency;
      oscillator.type = 'sine';
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration / 1000);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + duration / 1000);
    } catch (e) {
      console.log('[AdvancedTemplateDrawer] Audio not available');
    }
  }, []);

  // Speak template description on focus
  const speakTemplateDescription = useCallback(async (template: AdvancedTemplate) => {
    if (!audioEnabled || lastSpokenTemplate.current === template.id) return;
    
    lastSpokenTemplate.current = template.id;
    triggerHaptic([30]);
    playSound(600, 100);
    
    // Check if we have a cached voice description
    if (voiceDescriptions[template.id]) {
      speak(voiceDescriptions[template.id]);
      return;
    }
    
    // Fallback to simple description
    const simpleDesc = `${template.emoji} ${template.label_fr}. ${template.description_fr}`;
    speak(simpleDesc);
    
    // Fetch AI-generated description in background
    try {
      const { data } = await supabase.functions.invoke('generate-template-assets', {
        body: {
          action: 'generate_voice_description',
          templateId: template.id,
          templateLabel: template.label_fr,
          templateDescription: template.description_fr,
          templateEmoji: template.emoji,
          userContext: { language }
        }
      });
      
      if (data?.success && data.voiceDescription) {
        setVoiceDescriptions(prev => ({ ...prev, [template.id]: data.voiceDescription }));
      }
    } catch (e) {
      console.log('[AdvancedTemplateDrawer] Failed to fetch voice description');
    }
  }, [audioEnabled, speak, triggerHaptic, playSound, voiceDescriptions, language]);

  // Handle template focus (long press to hear description)
  const handleTemplateFocus = useCallback((template: AdvancedTemplate) => {
    setFocusedTemplate(template);
    if (audioEnabled) {
      speakTemplateDescription(template);
    }
  }, [audioEnabled, speakTemplateDescription]);

  // Handle long press start
  const handleLongPressStart = useCallback((template: AdvancedTemplate) => {
    longPressTimer.current = setTimeout(() => {
      handleTemplateFocus(template);
    }, 500);
  }, [handleTemplateFocus]);

  // Handle long press end
  const handleLongPressEnd = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  // Handle template selection
  const handleSelectTemplate = useCallback((template: AdvancedTemplate) => {
    stopSpeaking();
    triggerHaptic([50, 50, 50]);
    playSound(800, 150);
    onSelectTemplate(template);
    onClose();
  }, [stopSpeaking, triggerHaptic, playSound, onSelectTemplate, onClose]);

  // Fetch AI suggestions based on context or voice input
  const fetchAISuggestions = useCallback(async (userIntent?: string) => {
    setIsLoadingSuggestions(true);
    try {
      const { data } = await supabase.functions.invoke('generate-template-assets', {
        body: {
          action: 'suggest_template',
          userContext: {
            hour: new Date().getHours(),
            dayOfWeek: new Date().getDay(),
            userIntent: userIntent || '',
            language
          }
        }
      });
      
      if (data?.success && data.suggestions) {
        setAiSuggestions(data.suggestions);
      }
    } catch (e) {
      console.error('[AdvancedTemplateDrawer] Failed to fetch suggestions:', e);
    } finally {
      setIsLoadingSuggestions(false);
    }
  }, [language]);

  // Process voice transcript
  useEffect(() => {
    if (transcript && !isListening) {
      fetchAISuggestions(transcript);
    }
  }, [transcript, isListening, fetchAISuggestions]);

  // Initial suggestions on open
  useEffect(() => {
    if (isOpen && aiSuggestions.length === 0) {
      fetchAISuggestions();
    }
  }, [isOpen, fetchAISuggestions, aiSuggestions.length]);

  // Speak welcome message
  useEffect(() => {
    if (isOpen && audioEnabled) {
      const welcome = language === 'ba' 
        ? "Choisis un template pour ta vidéo" 
        : "Choisis un template pour ta vidéo. Appuie longuement pour écouter la description.";
      speak(welcome);
    }
    
    return () => {
      stopSpeaking();
      lastSpokenTemplate.current = null;
    };
  }, [isOpen, audioEnabled, language, speak, stopSpeaking]);

  // Handle voice mode toggle
  const toggleVoiceMode = useCallback(() => {
    if (isListening) {
      stopListening();
      setIsVoiceMode(false);
    } else {
      startListening();
      setIsVoiceMode(true);
      triggerHaptic([100]);
      speak("Dis-moi ce que tu veux créer");
    }
  }, [isListening, startListening, stopListening, triggerHaptic, speak]);

  // Get displayed templates
  const getDisplayedTemplates = (): AdvancedTemplate[] => {
    if (selectedCollection) {
      return getTemplatesByCollection(selectedCollection);
    }
    return ADVANCED_TEMPLATES;
  };

  // Find template by AI suggestion ID
  const findTemplateById = (id: string): AdvancedTemplate | undefined => {
    return ADVANCED_TEMPLATES.find(t => t.id === id);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md"
        >
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="absolute inset-0 flex flex-col"
          >
            {/* Header - XXL Touch Targets */}
            <div className="flex items-center justify-between px-4 py-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <motion.div 
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="text-3xl"
                >
                  ✨
                </motion.div>
                <h2 className="text-xl font-bold text-white">Templates IA</h2>
              </div>
              
              <div className="flex items-center gap-3">
                {/* Audio Toggle */}
                <button
                  onClick={() => {
                    setAudioEnabled(!audioEnabled);
                    if (!audioEnabled) {
                      speak("Audio activé");
                    } else {
                      stopSpeaking();
                    }
                  }}
                  className={cn(
                    "w-12 h-12 flex items-center justify-center rounded-full transition-all",
                    audioEnabled ? "bg-green-500/30 text-green-400" : "bg-white/10 text-white/50"
                  )}
                >
                  {audioEnabled ? <Volume2 className="h-6 w-6" /> : <VolumeX className="h-6 w-6" />}
                </button>
                
                {/* Close Button */}
                <button
                  onClick={onClose}
                  className="w-12 h-12 flex items-center justify-center rounded-full bg-white/10 text-white"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>

            {/* Voice Search - XXL Button */}
            <div className="px-4 py-4">
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={toggleVoiceMode}
                className={cn(
                  "w-full flex items-center justify-center gap-4 py-6 rounded-2xl transition-all",
                  isListening 
                    ? "bg-gradient-to-r from-red-500 to-orange-500 animate-pulse" 
                    : "bg-gradient-to-r from-amber-500 to-orange-500"
                )}
              >
                <motion.div
                  animate={isListening ? { scale: [1, 1.2, 1] } : {}}
                  transition={{ duration: 0.5, repeat: Infinity }}
                >
                  <Mic className="h-10 w-10 text-white" />
                </motion.div>
                <span className="text-white text-xl font-bold">
                  {isListening ? "J'écoute..." : "🎤 Dis-moi ce que tu veux créer"}
                </span>
              </motion.button>
              
              {/* Transcript Display */}
              {transcript && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-3 p-3 rounded-xl bg-white/10 text-white/80 text-center"
                >
                  "{transcript}"
                </motion.div>
              )}
            </div>

            {/* AI Suggestions - XXL Cards */}
            {aiSuggestions.length > 0 && (
              <div className="px-4 mb-4">
                <h3 className="text-white/60 text-sm mb-2 flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  Suggestions IA pour toi
                </h3>
                <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                  {aiSuggestions.map((suggestion) => {
                    const template = findTemplateById(suggestion.id);
                    if (!template) return null;
                    
                    return (
                      <motion.button
                        key={suggestion.id}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleSelectTemplate(template)}
                        onTouchStart={() => handleLongPressStart(template)}
                        onTouchEnd={handleLongPressEnd}
                        onMouseDown={() => handleLongPressStart(template)}
                        onMouseUp={handleLongPressEnd}
                        onMouseLeave={handleLongPressEnd}
                        className={cn(
                          "flex-shrink-0 flex flex-col items-center p-4 rounded-2xl min-w-[140px] transition-all",
                          `bg-gradient-to-br ${template.color}`,
                          focusedTemplate?.id === template.id && "ring-4 ring-white"
                        )}
                      >
                        <span className="text-5xl mb-2">{template.emoji}</span>
                        <span className="text-white font-bold text-sm text-center">{template.label_fr}</span>
                        <span className="text-white/70 text-xs mt-1 text-center line-clamp-2">
                          {suggestion.reason_fr}
                        </span>
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Collection Tabs - XXL */}
            <div className="flex gap-3 px-4 pb-3 overflow-x-auto scrollbar-hide">
              <button
                onClick={() => setSelectedCollection(null)}
                className={cn(
                  "flex items-center gap-2 px-5 py-3 rounded-full text-base font-bold whitespace-nowrap transition-all",
                  !selectedCollection
                    ? 'bg-white text-black'
                    : 'bg-white/10 text-white/70'
                )}
              >
                <span className="text-2xl">📋</span>
                <span>Tous</span>
              </button>
              
              {TEMPLATE_COLLECTIONS.map((collection) => (
                <button
                  key={collection.id}
                  onClick={() => {
                    setSelectedCollection(collection.id);
                    if (audioEnabled) {
                      speak(`${collection.emoji} ${collection.name_fr}`);
                    }
                    triggerHaptic([30]);
                  }}
                  className={cn(
                    "flex items-center gap-2 px-5 py-3 rounded-full text-base font-bold whitespace-nowrap transition-all",
                    selectedCollection === collection.id
                      ? `bg-gradient-to-r ${collection.color} text-white`
                      : 'bg-white/10 text-white/70'
                  )}
                >
                  <span className="text-2xl">{collection.emoji}</span>
                  <span>{collection.name_fr}</span>
                </button>
              ))}
            </div>

            {/* Templates Grid - XXL Cards (2 columns) */}
            <div className="flex-1 overflow-y-auto px-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                {getDisplayedTemplates().map((template) => (
                  <XXLTemplateCard
                    key={template.id}
                    template={template}
                    isFocused={focusedTemplate?.id === template.id}
                    isSpeaking={isSpeaking && lastSpokenTemplate.current === template.id}
                    onSelect={() => handleSelectTemplate(template)}
                    onLongPressStart={() => handleLongPressStart(template)}
                    onLongPressEnd={handleLongPressEnd}
                    audioEnabled={audioEnabled}
                  />
                ))}
              </div>
            </div>

            {/* Bottom Safe Area */}
            <div className="h-8 bg-gradient-to-t from-black to-transparent" />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// ============================================================
// XXL Template Card Component
// ============================================================

interface XXLTemplateCardProps {
  template: AdvancedTemplate;
  isFocused: boolean;
  isSpeaking: boolean;
  audioEnabled: boolean;
  onSelect: () => void;
  onLongPressStart: () => void;
  onLongPressEnd: () => void;
}

const XXLTemplateCard: React.FC<XXLTemplateCardProps> = ({ 
  template, 
  isFocused,
  isSpeaking,
  audioEnabled,
  onSelect,
  onLongPressStart,
  onLongPressEnd
}) => {
  const getFeatureIcons = () => {
    const features = [];
    if (template.features.beatSync) features.push('🎵');
    if (template.features.smartCaptions) features.push('💬');
    if (template.features.translation) features.push('🌍');
    if (template.features.audioEnhance) features.push('🔊');
    if (template.features.stabilization) features.push('📹');
    return features.slice(0, 4);
  };

  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onTouchStart={onLongPressStart}
      onTouchEnd={onLongPressEnd}
      onMouseDown={onLongPressStart}
      onMouseUp={onLongPressEnd}
      onMouseLeave={onLongPressEnd}
      onClick={onSelect}
      className={cn(
        "relative overflow-hidden rounded-3xl p-5 text-left transition-all min-h-[180px]",
        isFocused && "ring-4 ring-white shadow-2xl",
        isSpeaking && "ring-4 ring-green-400"
      )}
    >
      {/* Background Gradient */}
      <div className={cn("absolute inset-0 bg-gradient-to-br opacity-90", template.color)} />
      
      {/* Animated Glow Effect */}
      <motion.div
        className="absolute inset-0 bg-white/10"
        animate={{
          opacity: template.previewAnimation === 'pulse' ? [0.1, 0.3, 0.1] : 
                   template.previewAnimation === 'glow' ? [0.05, 0.2, 0.05] : 0.05
        }}
        transition={{ duration: 2, repeat: Infinity }}
      />

      {/* Content */}
      <div className="relative z-10 flex flex-col h-full">
        {/* Giant Emoji */}
        <motion.div 
          animate={isFocused ? { scale: [1, 1.1, 1] } : {}}
          transition={{ duration: 0.5 }}
          className="text-6xl mb-3"
        >
          {template.emoji}
        </motion.div>
        
        {/* Label */}
        <h3 className="font-bold text-white text-lg leading-tight mb-1">
          {template.label_fr}
        </h3>
        
        {/* Description - Truncated */}
        <p className="text-white/70 text-sm line-clamp-2 mb-3 flex-grow">
          {template.description_fr}
        </p>

        {/* Features Row */}
        <div className="flex items-center gap-1.5">
          {getFeatureIcons().map((icon, i) => (
            <span key={i} className="text-lg bg-black/20 rounded-full px-2 py-0.5">{icon}</span>
          ))}
        </div>
      </div>

      {/* Audio Indicator */}
      {audioEnabled && (
        <div className="absolute top-3 right-3">
          {isSpeaking ? (
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 0.5, repeat: Infinity }}
            >
              <Volume2 className="h-5 w-5 text-white" />
            </motion.div>
          ) : (
            <Volume2 className="h-5 w-5 text-white/40" />
          )}
        </div>
      )}

      {/* Long Press Hint */}
      {!isFocused && (
        <div className="absolute bottom-3 right-3 text-white/30 text-xs">
          Appui long = écouter
        </div>
      )}
    </motion.button>
  );
};

export default AdvancedTemplateDrawer;
