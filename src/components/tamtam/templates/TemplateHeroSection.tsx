/**
 * TemplateHeroSection - Animated hero with 4K Envato background
 * Features: Parallax video, search bar, category filters, stats
 */

import { useState, useRef, useEffect } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Search, Sparkles, Crown, Zap, Film, Music, Briefcase, GraduationCap, Rocket, Filter, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface TemplateHeroSectionProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
  totalTemplates: number;
  premiumCount: number;
}

const CATEGORIES = [
  { id: 'all', label: 'Tous', labelBa: 'Bɛɛ', icon: Sparkles, color: 'from-primary to-accent-cyan' },
  { id: 'storytelling', label: 'Histoires', labelBa: 'Kàlàmɔ̀', icon: Film, color: 'from-orange-400 to-rose-500' },
  { id: 'music', label: 'Musique', labelBa: 'Wùúsú', icon: Music, color: 'from-purple-400 to-pink-500' },
  { id: 'business', label: 'Business', labelBa: 'Sɔ̀nkɔ́', icon: Briefcase, color: 'from-blue-400 to-cyan-500' },
  { id: 'education', label: 'Éducation', labelBa: 'Kàráŋgà', icon: GraduationCap, color: 'from-green-400 to-emerald-500' },
  { id: 'future', label: 'Futuriste', labelBa: 'Sɔ̀ɔ̀n', icon: Rocket, color: 'from-violet-400 to-purple-500' },
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
  const [showFilters, setShowFilters] = useState(false);
  
  const { scrollY } = useScroll();
  const backgroundY = useTransform(scrollY, [0, 500], [0, 150]);
  const opacity = useTransform(scrollY, [0, 300], [1, 0.3]);
  const scale = useTransform(scrollY, [0, 300], [1, 1.1]);

  return (
    <div ref={containerRef} className="relative overflow-hidden">
      {/* Animated Background with Particles */}
      <motion.div 
        className="absolute inset-0 z-0"
        style={{ y: backgroundY, scale, opacity }}
      >
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-primary/10 via-accent-violet/5 to-background z-10" />
        
        {/* Animated Particles */}
        <div className="absolute inset-0">
          {[...Array(20)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 rounded-full bg-primary/30"
              initial={{ 
                x: Math.random() * 100 + '%', 
                y: Math.random() * 100 + '%',
                scale: Math.random() * 0.5 + 0.5
              }}
              animate={{ 
                y: [null, '-20%'],
                opacity: [0, 1, 0]
              }}
              transition={{ 
                duration: Math.random() * 3 + 2,
                repeat: Infinity,
                delay: Math.random() * 2
              }}
            />
          ))}
        </div>

        {/* Light Leak Effect */}
        <motion.div
          className="absolute top-0 right-0 w-96 h-96 rounded-full bg-gradient-to-br from-accent-cyan/20 to-transparent blur-3xl"
          animate={{ 
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3]
          }}
          transition={{ duration: 4, repeat: Infinity }}
        />
        <motion.div
          className="absolute bottom-0 left-0 w-80 h-80 rounded-full bg-gradient-to-tr from-accent-rose/20 to-transparent blur-3xl"
          animate={{ 
            scale: [1.2, 1, 1.2],
            opacity: [0.4, 0.2, 0.4]
          }}
          transition={{ duration: 5, repeat: Infinity }}
        />
      </motion.div>

      {/* Content */}
      <div className="relative z-20 px-4 pt-8 pb-6">
        {/* Title with Animation */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-6"
        >
          <motion.h1 
            className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-foreground via-primary to-accent-violet bg-clip-text text-transparent mb-2"
            animate={{ backgroundPosition: ['0%', '100%', '0%'] }}
            transition={{ duration: 5, repeat: Infinity }}
            style={{ backgroundSize: '200%' }}
          >
            ✨ Templates Premium
          </motion.h1>
          <p className="text-muted-foreground text-sm">
            Créez des vidéos professionnelles avec effets 4K Envato
          </p>
        </motion.div>

        {/* Stats Badges */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="flex justify-center gap-3 mb-6"
        >
          <Badge variant="secondary" className="bg-white/80 backdrop-blur-sm shadow-sm px-3 py-1.5">
            <Sparkles className="w-3.5 h-3.5 mr-1.5 text-primary" />
            <span className="font-semibold">{totalTemplates}</span>
            <span className="text-muted-foreground ml-1">templates</span>
          </Badge>
          <Badge className="bg-gradient-to-r from-amber-400 to-orange-500 text-white shadow-md px-3 py-1.5">
            <Crown className="w-3.5 h-3.5 mr-1.5" />
            <span className="font-semibold">{premiumCount}</span>
            <span className="opacity-90 ml-1">premium</span>
          </Badge>
          <Badge variant="secondary" className="bg-white/80 backdrop-blur-sm shadow-sm px-3 py-1.5">
            <Zap className="w-3.5 h-3.5 mr-1.5 text-green-500" />
            <span className="text-green-600 font-medium">4K Ready</span>
          </Badge>
        </motion.div>

        {/* Search Bar with Glass Effect */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="max-w-md mx-auto mb-6"
        >
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Rechercher un template..."
              className="pl-12 pr-12 h-12 bg-white/90 backdrop-blur-md border-white/50 shadow-lg rounded-2xl text-base focus:ring-2 focus:ring-primary/30"
            />
            {searchQuery && (
              <button
                onClick={() => onSearchChange('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-muted transition-colors"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            )}
          </div>
        </motion.div>

        {/* Category Filters - Horizontal Scroll */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="overflow-x-auto scrollbar-hide -mx-4 px-4"
        >
          <div className="flex gap-2 pb-2 min-w-max">
            {CATEGORIES.map((cat, index) => {
              const Icon = cat.icon;
              const isSelected = selectedCategory === cat.id;
              
              return (
                <motion.button
                  key={cat.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + index * 0.05 }}
                  onClick={() => onCategoryChange(cat.id)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm whitespace-nowrap transition-all duration-300",
                    isSelected
                      ? `bg-gradient-to-r ${cat.color} text-white shadow-lg scale-105`
                      : "bg-white/80 backdrop-blur-sm text-foreground hover:bg-white hover:shadow-md"
                  )}
                >
                  <Icon className={cn(
                    "w-4 h-4 transition-transform",
                    isSelected && "animate-pulse"
                  )} />
                  <span>{cat.label}</span>
                  {!isSelected && (
                    <span className="text-xs text-muted-foreground">({cat.labelBa})</span>
                  )}
                </motion.button>
              );
            })}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
