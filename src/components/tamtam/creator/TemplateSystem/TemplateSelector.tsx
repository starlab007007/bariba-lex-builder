/**
 * Template Selector v2.0 - Compatible avec UnifiedTemplate existant
 */

import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Sparkles, Star, Clock, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { UnifiedTemplate, TemplateCategory } from '@/types/UnifiedTemplateTypes';

interface TemplateSelectorProps {
  onSelect: (template: UnifiedTemplate) => void;
  onClose?: () => void;
}

const CATEGORIES: { id: TemplateCategory | 'all'; label: string; emoji: string }[] = [
  { id: 'all', label: 'Tout', emoji: '✨' },
  { id: 'storytelling', label: 'Histoires', emoji: '📖' },
  { id: 'music', label: 'Musique', emoji: '🎵' },
  { id: 'social', label: 'Social', emoji: '💬' },
  { id: 'education', label: 'Éducation', emoji: '📚' },
  { id: 'premium', label: 'Premium', emoji: '👑' },
];

// Templates placeholder
const PLACEHOLDER_TEMPLATES: UnifiedTemplate[] = [];

const TemplateSelector: React.FC<TemplateSelectorProps> = ({ onSelect, onClose }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<TemplateCategory | 'all'>('all');

  const filteredTemplates = useMemo(() => {
    let results = [...PLACEHOLDER_TEMPLATES];
    if (selectedCategory !== 'all') {
      results = results.filter(t => t.category === selectedCategory);
    }
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      results = results.filter(t =>
        t.name.toLowerCase().includes(query) ||
        t.description.toLowerCase().includes(query)
      );
    }
    return results;
  }, [searchQuery, selectedCategory]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-background flex flex-col"
    >
      <div className="flex-shrink-0 p-4 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Sparkles className="w-6 h-6 text-primary" />
            <h1 className="text-xl font-bold">Templates v2.0</h1>
          </div>
          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          )}
        </div>

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher..."
            className="pl-10"
          />
        </div>

        <ScrollArea className="w-full">
          <div className="flex gap-2 pb-2">
            {CATEGORIES.map(cat => (
              <Button
                key={cat.id}
                variant={selectedCategory === cat.id ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory(cat.id)}
                className="flex-shrink-0"
              >
                <span className="mr-1">{cat.emoji}</span>
                {cat.label}
              </Button>
            ))}
          </div>
        </ScrollArea>
      </div>

      <ScrollArea className="flex-1 p-4">
        {filteredTemplates.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="text-6xl mb-4">🚧</div>
            <h2 className="text-xl font-bold mb-2">Nouveau Système de Templates</h2>
            <p className="text-muted-foreground max-w-md">
              Le système de templates v2.0 est en cours de configuration. 
              Les templates premium seront bientôt disponibles.
            </p>
          </div>
        )}
      </ScrollArea>
    </motion.div>
  );
};

export default TemplateSelector;
