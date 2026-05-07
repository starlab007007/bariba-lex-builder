import React from 'react';
import { motion } from 'framer-motion';
import type { StoryGraph } from '../types/story.types';

interface StoryTreePreviewProps {
  graph: StoryGraph;
}

export default function StoryTreePreview({ graph }: StoryTreePreviewProps) {
  const renderSegment = (segId: string, depth: number = 0): React.ReactNode => {
    const seg = graph.segments[segId];
    if (!seg) return null;

    return (
      <motion.div
        key={segId}
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: depth * 0.1 }}
        className="ml-4"
        style={{ marginLeft: depth * 16 }}
      >
        <div className={`
          flex items-center gap-2 py-1.5 px-3 rounded-lg text-sm
          ${seg.is_ending 
            ? 'bg-amber-500/20 border border-amber-500/40 text-amber-200' 
            : seg.is_choice_point 
              ? 'bg-blue-500/20 border border-blue-500/40 text-blue-200'
              : 'bg-white/10 border border-white/20 text-white/80'
          }
        `}>
          <span>{seg.is_ending ? '🏁' : seg.is_choice_point ? '🔀' : '▶️'}</span>
          <span className="truncate">{seg.title || segId}</span>
          {seg.is_ending && seg.ending_badge && (
            <span className="ml-auto">{seg.ending_badge}</span>
          )}
        </div>

        {seg.is_choice_point && (
          <div className="ml-4 mt-1 space-y-1 border-l border-white/10 pl-2">
            {seg.choices.map(choice => (
              <div key={choice.id}>
                <div className="text-xs text-white/50 py-0.5 flex items-center gap-1">
                  <span>{choice.icon || '👉'}</span>
                  <span>{choice.label}</span>
                  {choice.is_default && <span className="text-amber-400 text-[10px]">(défaut)</span>}
                </div>
                {renderSegment(choice.next_segment, depth + 1)}
              </div>
            ))}
          </div>
        )}
      </motion.div>
    );
  };

  if (!graph.entry_segment) {
    return (
      <div className="text-center text-white/50 py-8">
        <span className="text-3xl mb-2 block">🌱</span>
        <p className="text-sm">L'arbre sera visible après l'ajout de segments</p>
      </div>
    );
  }

  return (
    <div className="space-y-1 overflow-auto max-h-[50vh] p-2 rounded-xl bg-white/5 border border-white/10">
      <p className="text-xs text-white/60 mb-2 font-medium">🌳 Arbre du conte</p>
      {renderSegment(graph.entry_segment)}
    </div>
  );
}
