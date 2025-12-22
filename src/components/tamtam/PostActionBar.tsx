import React from 'react';
import { motion } from 'framer-motion';
import { ThumbsUp, HelpCircle, Check, AlertTriangle, RefreshCw, Mic, Phone, BookOpen, ShoppingCart, Volume2 } from 'lucide-react';
import { triggerFeedback } from '@/utils/tamtamFeedback';

export type PostActionType = 
  | 'like' | 'question' | 'understood' | 'problem' 
  | 'imitate' | 'voice_reply' | 'call' | 'learn' | 'buy' | 'listen_again';

interface PostAction {
  type: PostActionType;
  icon: typeof ThumbsUp;
  emoji: string;
  labelFr: string;
  labelBa: string;
  color: string;
}

const PICTO_ACTIONS: PostAction[] = [
  { type: 'like', icon: ThumbsUp, emoji: '👍', labelFr: "J'aime", labelBa: 'Mo fẹ́ràn', color: 'bg-blue-100 text-blue-600' },
  { type: 'understood', icon: Check, emoji: '✅', labelFr: 'Compris', labelBa: 'Mo yé', color: 'bg-green-100 text-green-600' },
  { type: 'question', icon: HelpCircle, emoji: '❓', labelFr: 'Question', labelBa: 'Ìbéèrè', color: 'bg-yellow-100 text-yellow-600' },
  { type: 'problem', icon: AlertTriangle, emoji: '⚠️', labelFr: 'Problème', labelBa: 'Ìṣòro', color: 'bg-red-100 text-red-600' },
  { type: 'imitate', icon: RefreshCw, emoji: '🔄', labelFr: 'Refaire', labelBa: 'Ṣe báyìí', color: 'bg-purple-100 text-purple-600' },
  { type: 'voice_reply', icon: Mic, emoji: '🎤', labelFr: 'Répondre', labelBa: 'Dáhùn', color: 'bg-pink-100 text-pink-600' },
];

const CONTEXTUAL_ACTIONS: PostAction[] = [
  { type: 'listen_again', icon: Volume2, emoji: '🔊', labelFr: 'Réécouter', labelBa: 'Gbọ́ lẹ́ẹ̀kansi', color: 'bg-gray-100 text-gray-600' },
  { type: 'call', icon: Phone, emoji: '📞', labelFr: 'Appeler', labelBa: 'Pe', color: 'bg-green-100 text-green-600' },
  { type: 'learn', icon: BookOpen, emoji: '📖', labelFr: 'Apprendre', labelBa: 'Kọ́', color: 'bg-blue-100 text-blue-600' },
  { type: 'buy', icon: ShoppingCart, emoji: '🛒', labelFr: 'Acheter', labelBa: 'Ra', color: 'bg-orange-100 text-orange-600' },
];

interface PostActionBarProps {
  onAction: (action: PostActionType, data?: any) => void;
  activeAction?: PostActionType | null;
  showContextual?: boolean;
  contextualActions?: PostActionType[];
  size?: 'sm' | 'md' | 'lg';
}

export const PostActionBar: React.FC<PostActionBarProps> = ({
  onAction,
  activeAction,
  showContextual = false,
  contextualActions = [],
  size = 'md'
}) => {
  const handleAction = (action: PostActionType) => {
    triggerFeedback('notification', { haptic: true });
    onAction(action);
  };

  const sizeClasses = {
    sm: 'w-10 h-10 text-lg',
    md: 'w-12 h-12 text-xl',
    lg: 'w-14 h-14 text-2xl'
  };

  const displayedContextual = CONTEXTUAL_ACTIONS.filter(
    a => contextualActions.includes(a.type)
  );

  return (
    <div className="space-y-2">
      {/* Main picto actions - always visible */}
      <div className="flex justify-around items-center py-2">
        {PICTO_ACTIONS.map(({ type, emoji, color }) => (
          <motion.button
            key={type}
            whileTap={{ scale: 0.85 }}
            whileHover={{ scale: 1.1 }}
            onClick={() => handleAction(type)}
            className={`${sizeClasses[size]} rounded-full flex items-center justify-center transition-all ${
              activeAction === type
                ? `${color} ring-2 ring-offset-2 ring-current shadow-lg`
                : 'bg-gray-50 hover:bg-gray-100'
            }`}
          >
            <span role="img" aria-label={type}>{emoji}</span>
          </motion.button>
        ))}
      </div>

      {/* Contextual actions - shown based on post type */}
      {showContextual && displayedContextual.length > 0 && (
        <div className="flex justify-center gap-3 pt-2 border-t border-gray-100">
          {displayedContextual.map(({ type, icon: Icon, emoji, labelFr, color }) => (
            <motion.button
              key={type}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleAction(type)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl ${color} font-medium text-sm`}
            >
              <span>{emoji}</span>
              <span>{labelFr}</span>
            </motion.button>
          ))}
        </div>
      )}
    </div>
  );
};
