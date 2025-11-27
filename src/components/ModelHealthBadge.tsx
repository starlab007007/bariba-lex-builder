/**
 * Badge visuel montrant quel modèle a été utilisé pour la traduction
 */

import { Badge } from "@/components/ui/badge";
import { Brain, Zap, BarChart3, Bot, Cloud } from "lucide-react";

interface ModelHealthBadgeProps {
  modelId: 'smt' | 'simplified' | 'baatonu' | 'byt5-expert' | 'lovable-ai' | 'idiom' | 'context' | 'rag' | 'advanced' | 'fallback' | 'ai';
  confidence?: number;
  duration?: number;
}

const modelConfig = {
  'idiom': { icon: Zap, color: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400', label: '💡 Idiome' },
  'context': { icon: Brain, color: 'bg-blue-500/10 text-blue-700 dark:text-blue-400', label: '🔄 Cache' },
  'rag': { icon: Brain, color: 'bg-purple-500/10 text-purple-700 dark:text-purple-400', label: '📚 RAG' },
  'smt': { icon: BarChart3, color: 'bg-green-500/10 text-green-700 dark:text-green-400', label: '📊 SMT' },
  'simplified': { icon: Zap, color: 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-400', label: '🔤 SimplifiedAI' },
  'baatonu': { icon: Brain, color: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-400', label: '🧠 BaatonuAI' },
  'byt5-expert': { icon: Bot, color: 'bg-orange-500/10 text-orange-700 dark:text-orange-400', label: '🤖 ByT5' },
  'lovable-ai': { icon: Cloud, color: 'bg-pink-500/10 text-pink-700 dark:text-pink-400', label: '☁️ Lovable AI' },
  'advanced': { icon: Brain, color: 'bg-violet-500/10 text-violet-700 dark:text-violet-400', label: '🚀 Advanced' },
  'ai': { icon: Cloud, color: 'bg-pink-500/10 text-pink-700 dark:text-pink-400', label: '☁️ AI' },
  'fallback': { icon: Zap, color: 'bg-gray-500/10 text-gray-700 dark:text-gray-400', label: '⚡ Fallback' },
};

export const ModelHealthBadge = ({ modelId, confidence, duration }: ModelHealthBadgeProps) => {
  const config = modelConfig[modelId] || modelConfig.fallback;
  const Icon = config.icon;

  return (
    <Badge variant="outline" className={`${config.color} text-xs font-medium`}>
      <Icon className="h-3 w-3 mr-1" />
      {config.label}
      {confidence && <span className="ml-1">({confidence}%)</span>}
      {duration && <span className="ml-1 text-[10px] opacity-70">{duration}ms</span>}
    </Badge>
  );
};
