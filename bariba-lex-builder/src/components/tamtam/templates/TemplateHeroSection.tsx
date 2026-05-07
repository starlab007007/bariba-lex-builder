/**
 * TemplateHeroSection - Voice-First Hero with Inclusive Design
 * Features: Large touch targets, audio cues, emoji navigation, minimal text
 */

import { useState, useRef, useCallback } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Search, Sparkles, Crown, Zap, X, Mic, Volume2, VolumeX } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TemplateHeroSectionProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
  totalTemplates: number;
  premiumCount: number;
}

// Voice-first categories with large emojis and colors
const CATEGORIES = [
  { id: 'all', emoji: '✨', label: 'Tous', labelBa: 'Kpuro', color: 'from-primary to-accent-cyan', bgColor: 'bg-primary/10' },
  { id: 'storytelling', emoji: '📖', label: 'Histoires', labelBa: 'Gɛsɛrenu', color: 'from-orange-400 to-rose-500', bgColor: 'bg-orange-100' },
  { id: 'music', emoji: '🎵', label: 'Musique', labelBa: 'Wùúsú', color: 'from-purple-400 to-pink-500', bgColor: 'bg-purple-100' },
  { id: 'business', emoji: '💼', label: 'Business', labelBa: 'Aburu', color: 'from-blue-400 to-cyan-500', bgColor: 'bg-blue-100' },
  { id: 'education', emoji: '📚', label: 'Éducation', labelBa: 'Debu', color: 'from-green-400 to-emerald-500', bgColor: 'bg-green-100' },
  { id: 'future', emoji: '🚀', label: 'Futuriste', labelBa: 'Yɑmɔ', color: 'from-violet-400 to-purple-500', bgColor: 'bg-violet-100' },
];

export function TemplateHeroSection({
  searchQuery,
  onSearchChange,
  selectedCategory,
  onCategoryChange,
  totalTemplates,
  premiumCount
}: TemplateHeroSectionProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isListening, setIsListening] = useState(false);
  const [isSoundOn, setIsSoundOn] = useState(true);
  
  const { scrollY } = useScroll();
  const backgroundY = useTransform(scrollY, [0, 300], [0, 100]);
  const opacity = useTransform(scrollY, [0, 200], [1, 0.5]);

  // Voice search handler (placeholder for speech recognition)
  const handleVoiceSearch = useCallback(() => {
    setIsListening(true);
    // Vibration feedback for inclusive design
    if ('vibrate' in navigator) {
      navigator.vibrate(50);
    }
    // Simulate voice recognition
    setTimeout(() => setIsListening(false), 2000);
  }, []);

  // Play audio feedback on category change
  const handleCategorySelect = useCallback((catId: string) => {
    if ('vibrate' in navigator) {
      navigator.vibrate(30);
    }
    onCategoryChange(catId);
  }, [onCategoryChange]);

  return (
    <div ref={containerRef} className="relative overflow-hidden">
      {/* Animated Background */}
      <motion.div 
        className="absolute inset-0 z-0"
        style={{ y: backgroundY, opacity }}
      >
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-accent-violet/5 to-background z-10" />
        
        {/* Floating Particles - Reduced for performance */}
        <div className="absolute inset-0">
          {[...Array(8)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-3 h-3 rounded-full bg-primary/20"
              initial={{ 
                x: `${Math.random() * 100}%`, 
                y: `${Math.random() * 100}%`,
                scale: Math.random() * 0.5 + 0.5
              }}
              animate={{ 
                y: [null, '-30%'],
                opacity: [0.3, 0.7, 0]
              }}
              transition={{ 
                duration: 4 + Math.random() * 2,
                repeat: Infinity,
                delay: i * 0.5
              }}
            />
          ))}
        </div>

        {/* Ambient Light */}
        <motion.div
          className="absolute -top-20 -right-20 w-64 h-64 md:w-96 md:h-96 rounded-full bg-gradient-to-br from-accent-cyan/15 to-transparent blur-3xl"
          animate={{ scale: [1, 1.15, 1], opacity: [0.4, 0.6, 0.4] }}
          transition={{ duration: 5, repeat: Infinity }}
        />
      </motion.div>

      {/* Content */}
      <div className="relative z-20 px-4 pt-6 pb-4 md:pt-8 md:pb-6">
        {/* Title with Large Emoji - Voice-First */}
        <motion.div
          initial={{ opacity: 0, y: -15 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-5"
        >
          <motion.div
            animate={{ rotate: [0, 5, -5, 0] }}
            transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
            className="text-5xl md:text-6xl mb-2"
          >
            ✨
          </motion.div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-1">
            Templates Premium
          </h1>
          <p className="text-muted-foreground text-sm md:text-base">
            Créez des vidéos professionnelles
          </p>
        </motion.div>

        {/* Stats - Large Touch Targets with Emojis */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.15 }}
          className="flex justify-center gap-3 mb-5 flex-wrap"
        >
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/90 backdrop-blur-sm shadow-sm border border-white/50">
            <span className="text-xl">📦</span>
            <div className="text-left">
              <p className="text-lg font-bold text-foreground">{totalTemplates}</p>
              <p className="text-xs text-muted-foreground -mt-1">templates</p>
            </div>
          </div>
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-amber-400 to-orange-500 text-white shadow-md">
            <Crown className="w-5 h-5" />
            <div className="text-left">
              <p className="text-lg font-bold">{premiumCount}</p>
              <p className="text-xs opacity-90 -mt-1">premium</p>
            </div>
          </div>
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/90 backdrop-blur-sm shadow-sm border border-white/50">
            <span className="text-xl">🎬</span>
            <p className="text-sm font-medium text-green-600">4K Ready</p>
          </div>
        </motion.div>

        {/* Voice-First Search Bar */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="max-w-md mx-auto mb-5"
        >
          <div className="relative flex items-center">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="🔍 Rechercher..."
                className="w-full pl-12 pr-12 h-14 bg-white/95 backdrop-blur-md border-2 border-white/50 shadow-lg rounded-2xl text-base focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => onSearchChange('')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full hover:bg-muted transition-colors"
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              )}
            </div>
            
            {/* Voice Search Button - Large Touch Target */}
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={handleVoiceSearch}
              className={cn(
                "ml-2 w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg transition-all",
                isListening 
                  ? "bg-red-500 text-white animate-pulse" 
                  : "bg-primary text-white hover:bg-primary/90"
              )}
              aria-label="Recherche vocale"
            >
              <Mic className="w-6 h-6" />
            </motion.button>
          </div>
          
          {/* Listening indicator */}
          {isListening && (
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center text-sm text-primary mt-2 font-medium"
            >
              🎤 Je vous écoute...
            </motion.p>
          )}
        </motion.div>

        {/* Category Filters - Large Emoji Buttons for Voice-First */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="overflow-x-auto scrollbar-hide -mx-4 px-4"
        >
          <div className="flex gap-2 pb-2 min-w-max justify-start md:justify-center">
            {CATEGORIES.map((cat, index) => {
              const isSelected = selectedCategory === cat.id;
              
              return (
                <motion.button
                  key={cat.id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3 + index * 0.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleCategorySelect(cat.id)}
                  className={cn(
                    "flex flex-col items-center gap-1.5 min-w-[72px] px-4 py-3 rounded-2xl font-medium transition-all duration-200",
                    isSelected
                      ? `bg-gradient-to-br ${cat.color} text-white shadow-lg transform scale-105`
                      : `${cat.bgColor} text-foreground hover:shadow-md active:scale-95`
                  )}
                  aria-label={`${cat.label} - ${cat.labelBa}`}
                >
                  {/* Large Emoji - Primary Visual */}
                  <span className="text-2xl md:text-3xl">{cat.emoji}</span>
                  {/* Label - Secondary */}
                  <span className={cn(
                    "text-xs font-medium truncate",
                    isSelected ? "text-white" : "text-foreground"
                  )}>
                    {cat.label}
                  </span>
                </motion.button>
              );
            })}
          </div>
        </motion.div>

        {/* Sound Toggle - Accessibility */}
        <div className="flex justify-center mt-3">
          <button
            onClick={() => setIsSoundOn(!isSoundOn)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/50 text-muted-foreground text-xs hover:bg-muted transition-colors"
            aria-label={isSoundOn ? "Désactiver le son" : "Activer le son"}
          >
            {isSoundOn ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            <span>{isSoundOn ? 'Son activé' : 'Son désactivé'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
