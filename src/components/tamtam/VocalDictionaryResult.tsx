import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Volume2, Loader2, BookOpen, MessageCircle, ArrowRightLeft, X } from 'lucide-react';
import { PhoneticEntry } from '@/hooks/usePhoneticSuggestions';
import { useUnifiedAudio } from '@/hooks/useUnifiedAudio';
import { VocalDictionaryFeedback } from '@/components/tamtam/VocalDictionaryFeedback';

interface VocalDictionaryResultProps {
  entry: PhoneticEntry;
  showFrenchFirst?: boolean;
  showFeedback?: boolean;
  onClose?: () => void;
}

export function VocalDictionaryResult({ 
  entry, 
  showFrenchFirst = false,
  showFeedback = false,
  onClose 
}: VocalDictionaryResultProps) {
  const { speakCurrentLang, isSpeaking } = useUnifiedAudio();
  const [speakingField, setSpeakingField] = useState<string | null>(null);

  // Lecture TTS d'un champ spécifique
  const speakText = async (text: string, fieldId: string, lang: 'ba' | 'fr') => {
    if (!text || isSpeaking) return;
    
    setSpeakingField(fieldId);
    try {
      await speakCurrentLang(text);
    } finally {
      setSpeakingField(null);
    }
  };

  // Bouton audio réutilisable
  const AudioButton = ({ text, fieldId, lang, className = "" }: { 
    text: string; 
    fieldId: string; 
    lang: 'ba' | 'fr';
    className?: string;
  }) => (
    <button
      onClick={() => speakText(text, fieldId, lang)}
      disabled={isSpeaking}
      className={`flex items-center justify-center p-2 rounded-full transition-all ${
        speakingField === fieldId 
          ? 'bg-tamtam-primary text-white animate-pulse' 
          : 'bg-tamtam-bg hover:bg-tamtam-primary/20 text-tamtam-text-muted hover:text-tamtam-primary'
      } ${className}`}
    >
      {speakingField === fieldId ? (
        <Loader2 className="w-5 h-5 animate-spin" />
      ) : (
        <Volume2 className="w-5 h-5" />
      )}
    </button>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="bg-tamtam-surface rounded-3xl shadow-tamtam-soft overflow-hidden"
    >
      {/* En-tête avec le mot */}
      <div className="bg-gradient-to-r from-tamtam-primary to-tamtam-primary/80 p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            {/* Mot bariba */}
            <div className="flex items-center gap-3">
              <span className="text-3xl">🇧🇯</span>
              <h2 className="text-2xl font-bold text-white">{entry.word}</h2>
            </div>
            
            {/* Phonétique */}
            {entry.phonetic && entry.phonetic !== entry.word && (
              <p className="text-white/80 text-lg mt-1 ml-12">
                [{entry.phonetic}]
              </p>
            )}
            
            {/* Catégorie grammaticale */}
            <span className="inline-block mt-2 ml-12 px-3 py-1 bg-white/20 rounded-full text-white text-sm">
              {entry.part_of_speech === 'n' ? 'nom' : 
               entry.part_of_speech === 'v' ? 'verbe' : 
               entry.part_of_speech === 'adj' ? 'adjectif' : 
               entry.part_of_speech === 'adv' ? 'adverbe' : 
               entry.part_of_speech}
            </span>
          </div>
          
          {/* Close button */}
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Corps avec définition et exemples */}
      <div className="p-6 space-y-4">
        {/* Définition (français) */}
        <div className="bg-tamtam-bg rounded-2xl p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-tamtam-text-muted font-medium flex items-center gap-2">
                  <span>🇫🇷</span> Définition
                </span>
                <AudioButton 
                  text={entry.definition} 
                  fieldId="definition" 
                  lang="fr"
                />
              </div>
              <p className="text-tamtam-text text-lg">{entry.definition}</p>
            </div>
          </div>
        </div>

        {/* Exemple bariba */}
        {entry.example_bariba && (
          <div className="bg-amber-50 rounded-2xl p-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                <MessageCircle className="w-5 h-5 text-amber-600" />
              </div>
              <div className="flex-1">
                <div className="mb-1">
                  <span className="text-sm text-amber-700 font-medium flex items-center gap-2">
                    <span>🇧🇯</span> Exemple en bariba
                  </span>
                </div>
                <p className="text-amber-900 text-lg italic">"{entry.example_bariba}"</p>
              </div>
            </div>
          </div>
        )}

        {/* Exemple français */}
        {entry.example_francais && (
          <div className="bg-blue-50 rounded-2xl p-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <ArrowRightLeft className="w-5 h-5 text-blue-600" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-blue-700 font-medium flex items-center gap-2">
                    <span>🇫🇷</span> Traduction de l'exemple
                  </span>
                  <AudioButton 
                    text={entry.example_francais} 
                    fieldId="example-fr" 
                    lang="fr"
                  />
                </div>
                <p className="text-blue-900 text-lg italic">"{entry.example_francais}"</p>
              </div>
            </div>
          </div>
        )}

        {/* Bouton écouter tout */}
        <button
          onClick={async () => {
            await speakText(entry.definition, 'all-def', 'fr');
            if (entry.example_francais) {
              await speakText(entry.example_francais, 'all-ex-fr', 'fr');
            }
          }}
          disabled={isSpeaking}
          className="w-full py-4 bg-gradient-to-r from-tamtam-primary to-tamtam-primary/80 text-white rounded-2xl font-semibold flex items-center justify-center gap-3 hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {isSpeaking ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Lecture en cours...
            </>
          ) : (
            <>
              <Volume2 className="w-5 h-5" />
              Écouter tout
            </>
          )}
        </button>
        
        {/* Feedback button */}
        {showFeedback && (
          <div className="flex justify-center pt-2">
            <VocalDictionaryFeedback entry={entry} />
          </div>
        )}
      </div>
    </motion.div>
  );
}
