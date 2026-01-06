// VoiceTemplateSelector.tsx
// 100% Zero-Literacy Voice-First Template Selection

import React, { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, Volume2, X, Sparkles, ChevronRight } from "lucide-react";
import { ADVANCED_TEMPLATES, TEMPLATE_COLLECTIONS, AdvancedTemplate, TemplateCollection } from "./AdvancedTemplateData";
import { useBaribaTTS } from "@/hooks/useBaribaTTS";
import { useFrenchTTS } from "@/hooks/useFrenchTTS";
import { useFrenchSTT } from "@/hooks/useFrenchSTT";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface VoiceTemplateSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate: (template: AdvancedTemplate) => void;
  language?: 'fr' | 'ba';
}

interface TemplateSuggestion {
  id: string;
  reason: string;
}

const VoiceTemplateSelector: React.FC<VoiceTemplateSelectorProps> = ({
  isOpen,
  onClose,
  onSelectTemplate,
  language = 'fr'
}) => {
  const [isListening, setIsListening] = useState(false);
  const [userIntent, setUserIntent] = useState("");
  const [suggestions, setSuggestions] = useState<TemplateSuggestion[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [focusedTemplateId, setFocusedTemplateId] = useState<string | null>(null);
  const [recentTemplates, setRecentTemplates] = useState<string[]>([]);
  
  const { speak: speakFr, isSpeaking: isSpeakingFr } = useFrenchTTS();
  const { speak: speakBa, isSpeaking: isSpeakingBa } = useBaribaTTS();
  const frenchSTT = useFrenchSTT();
  
  const isSpeaking = isSpeakingFr || isSpeakingBa;
  const speak = language === 'ba' ? speakBa : speakFr;
  
  const audioRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // Load recent templates from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('tamtam_recent_templates');
      if (stored) {
        setRecentTemplates(JSON.parse(stored).slice(0, 6));
      }
    } catch {}
  }, []);

  // Speak welcome message on open
  useEffect(() => {
    if (isOpen && !isSpeaking) {
      const welcomeMsg = language === 'ba' 
        ? "Kaa sↄ! Fↄ n bɛ fɛ kɛ?"
        : "Bienvenue! Dis-moi ce que tu veux créer.";
      speak(welcomeMsg);
      
      // Haptic feedback
      if (navigator.vibrate) navigator.vibrate(100);
    }
  }, [isOpen, language, speak, isSpeaking]);

  // Start voice recording
  const startListening = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      audioRef.current = mediaRecorder;
      chunksRef.current = [];
      
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      
      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        
        // Use current transcript from STT hook
        try {
          // The useFrenchSTT hook uses Web Speech API which provides transcript
          if (frenchSTT.transcript) {
            setUserIntent(frenchSTT.transcript);
            await fetchSuggestions(frenchSTT.transcript);
          }
        } catch (err) {
          console.error('Transcription failed:', err);
        }
      };
      
      mediaRecorder.start();
      setIsListening(true);
      
      // Haptic feedback
      if (navigator.vibrate) navigator.vibrate([50, 50, 50]);
      
      // Auto-stop after 5 seconds
      setTimeout(() => {
        if (mediaRecorder.state === 'recording') {
          mediaRecorder.stop();
          setIsListening(false);
        }
      }, 5000);
      
    } catch (err) {
      console.error('Failed to start recording:', err);
    }
  }, []);

  // Stop voice recording
  const stopListening = useCallback(() => {
    if (audioRef.current?.state === 'recording') {
      audioRef.current.stop();
    }
    setIsListening(false);
  }, []);

  // Fetch AI suggestions based on user intent
  const fetchSuggestions = async (intent: string) => {
    setIsLoadingSuggestions(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-template-assets', {
        body: {
          action: 'suggest_template',
          userContext: {
            hour: new Date().getHours(),
            dayOfWeek: new Date().getDay(),
            userIntent: intent,
            language,
          }
        }
      });
      
      if (data?.suggestions) {
        setSuggestions(data.suggestions);
        
        // Speak first suggestion
        if (data.suggestions.length > 0) {
          const firstTemplate = ADVANCED_TEMPLATES.find(t => t.id === data.suggestions[0].id);
          if (firstTemplate) {
            const msg = language === 'ba'
              ? `${firstTemplate.emoji} ${firstTemplate.label_ba || firstTemplate.label_fr}`
              : `Je te suggère ${firstTemplate.emoji} ${firstTemplate.label_fr}. ${data.suggestions[0].reason}`;
            speak(msg);
          }
        }
      }
    } catch (err) {
      console.error('Failed to fetch suggestions:', err);
    } finally {
      setIsLoadingSuggestions(false);
    }
  };

  // Handle template selection
  const handleSelect = (template: AdvancedTemplate) => {
    // Save to recent
    const newRecent = [template.id, ...recentTemplates.filter(id => id !== template.id)].slice(0, 6);
    setRecentTemplates(newRecent);
    try {
      localStorage.setItem('tamtam_recent_templates', JSON.stringify(newRecent));
    } catch {}
    
    // Haptic feedback
    if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
    
    onSelectTemplate(template);
  };

  // Speak template description on focus
  const handleTemplateFocus = (template: AdvancedTemplate) => {
    setFocusedTemplateId(template.id);
    const desc = language === 'ba' && template.description_ba 
      ? template.description_ba 
      : template.description_fr;
    speak(`${template.emoji} ${template.label_fr}. ${desc}`);
  };

  // Get template by ID
  const getTemplate = (id: string) => ADVANCED_TEMPLATES.find(t => t.id === id);

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] bg-black/95 backdrop-blur-xl"
    >
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 safe-area-top">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-400" />
            <span className="text-lg font-bold text-white">
              {language === 'ba' ? 'Template Sugandi' : 'Choisis ton Template'}
            </span>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10"
          >
            <X className="h-5 w-5 text-white" />
          </button>
        </div>

        {/* Voice Input Zone */}
        <div className="flex flex-col items-center justify-center py-8 px-4">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={isListening ? stopListening : startListening}
            className={cn(
              "w-28 h-28 rounded-full flex items-center justify-center transition-all",
              isListening
                ? "bg-gradient-to-br from-red-500 to-orange-500 animate-pulse shadow-[0_0_40px_rgba(239,68,68,0.5)]"
                : "bg-gradient-to-br from-amber-500 to-orange-500 shadow-xl"
            )}
          >
            {isListening ? (
              <MicOff className="h-12 w-12 text-white" />
            ) : (
              <Mic className="h-12 w-12 text-white" />
            )}
          </motion.button>
          
          <p className="mt-4 text-white/70 text-center text-lg">
            {isListening 
              ? (language === 'ba' ? "N bɛ i lamɛn..." : "Je t'écoute...")
              : (language === 'ba' ? "Fↄ n bɛ fɛ kɛ?" : "Dis-moi ce que tu veux créer")
            }
          </p>

          {userIntent && (
            <div className="mt-3 px-4 py-2 rounded-full bg-white/10 text-white/80 text-sm">
              "{userIntent}"
            </div>
          )}
        </div>

        {/* AI Suggestions */}
        <AnimatePresence>
          {suggestions.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="px-4 pb-4"
            >
              <div className="text-sm text-white/50 mb-2 flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                {language === 'ba' ? 'IA Suggestions' : 'Suggestions IA'}
              </div>
              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                {suggestions.map((sug, i) => {
                  const template = getTemplate(sug.id);
                  if (!template) return null;
                  return (
                    <TemplateBigCard
                      key={sug.id}
                      template={template}
                      reason={sug.reason}
                      isFocused={focusedTemplateId === template.id}
                      onFocus={() => handleTemplateFocus(template)}
                      onSelect={() => handleSelect(template)}
                      index={i}
                    />
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Loading indicator */}
        {isLoadingSuggestions && (
          <div className="flex justify-center py-4">
            <div className="w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Recent Templates */}
        {recentTemplates.length > 0 && suggestions.length === 0 && (
          <div className="px-4 pb-4">
            <div className="text-sm text-white/50 mb-2">
              {language === 'ba' ? 'Kↄrↄ' : 'Récents'}
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
              {recentTemplates.map(id => {
                const template = getTemplate(id);
                if (!template) return null;
                return (
                  <TemplateQuickCard
                    key={id}
                    template={template}
                    onPress={() => handleSelect(template)}
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* Collections Grid */}
        <div className="flex-1 overflow-y-auto px-4 pb-safe">
          <div className="text-sm text-white/50 mb-3">
            {language === 'ba' ? 'Super-Packs' : 'Collections'}
          </div>
          <div className="grid grid-cols-1 gap-3 pb-6">
            {TEMPLATE_COLLECTIONS.map((collection) => (
              <CollectionRow
                key={collection.id}
                collection={collection}
                onSelectTemplate={handleSelect}
                onFocusTemplate={handleTemplateFocus}
                focusedId={focusedTemplateId}
              />
            ))}
          </div>

          {/* All Templates Grid */}
          <div className="text-sm text-white/50 mb-3 mt-4">
            {language === 'ba' ? 'Bɛɛ' : 'Tous les Templates'} ({ADVANCED_TEMPLATES.length})
          </div>
          <div className="grid grid-cols-3 gap-2 pb-8">
            {ADVANCED_TEMPLATES.map((template) => (
              <TemplateQuickCard
                key={template.id}
                template={template}
                onPress={() => handleSelect(template)}
              />
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// ============================================================
// Sub-components
// ============================================================

interface TemplateBigCardProps {
  template: AdvancedTemplate;
  reason?: string;
  isFocused: boolean;
  onFocus: () => void;
  onSelect: () => void;
  index: number;
}

const TemplateBigCard: React.FC<TemplateBigCardProps> = ({
  template,
  reason,
  isFocused,
  onFocus,
  onSelect,
  index,
}) => (
  <motion.button
    initial={{ opacity: 0, scale: 0.9 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ delay: index * 0.1 }}
    onFocus={onFocus}
    onMouseEnter={onFocus}
    onClick={onSelect}
    className={cn(
      "flex-shrink-0 w-40 rounded-2xl p-4 text-left transition-all",
      `bg-gradient-to-br ${template.color}`,
      isFocused && "ring-4 ring-white scale-105"
    )}
  >
    <span className="text-4xl">{template.emoji}</span>
    <h3 className="mt-2 font-bold text-white text-sm">{template.label_fr}</h3>
    {reason && (
      <p className="mt-1 text-white/70 text-xs line-clamp-2">{reason}</p>
    )}
    <div className="mt-2 flex items-center gap-1 text-white/80">
      <Volume2 className="h-3 w-3" />
      <span className="text-xs">Écouter</span>
    </div>
  </motion.button>
);

interface TemplateQuickCardProps {
  template: AdvancedTemplate;
  onPress: () => void;
}

const TemplateQuickCard: React.FC<TemplateQuickCardProps> = ({ template, onPress }) => (
  <motion.button
    whileTap={{ scale: 0.95 }}
    onClick={onPress}
    className={cn(
      "rounded-xl p-3 text-center",
      `bg-gradient-to-br ${template.color}`
    )}
  >
    <span className="text-3xl">{template.emoji}</span>
    <p className="mt-1 text-white text-xs font-medium truncate">{template.label_fr}</p>
  </motion.button>
);

interface CollectionRowProps {
  collection: TemplateCollection;
  onSelectTemplate: (template: AdvancedTemplate) => void;
  onFocusTemplate: (template: AdvancedTemplate) => void;
  focusedId: string | null;
}

const CollectionRow: React.FC<CollectionRowProps> = ({
  collection,
  onSelectTemplate,
  onFocusTemplate,
  focusedId,
}) => {
  const templates = collection.templateIds
    .map(id => ADVANCED_TEMPLATES.find(t => t.id === id))
    .filter((t): t is AdvancedTemplate => t !== undefined);

  return (
    <div className={cn("rounded-2xl p-3", `bg-gradient-to-r ${collection.color}`)}>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-2xl">{collection.emoji}</span>
        <div>
          <h3 className="font-bold text-white text-sm">{collection.name_fr}</h3>
          <p className="text-white/70 text-xs">{collection.description_fr}</p>
        </div>
        <ChevronRight className="h-5 w-5 text-white/50 ml-auto" />
      </div>
      <div className="flex gap-2 overflow-x-auto scrollbar-hide">
        {templates.slice(0, 4).map((template) => (
          <button
            key={template.id}
            onMouseEnter={() => onFocusTemplate(template)}
            onClick={() => onSelectTemplate(template)}
            className={cn(
              "flex-shrink-0 w-16 h-16 rounded-xl bg-black/30 flex items-center justify-center text-2xl",
              focusedId === template.id && "ring-2 ring-white"
            )}
          >
            {template.emoji}
          </button>
        ))}
      </div>
    </div>
  );
};

export default VoiceTemplateSelector;
