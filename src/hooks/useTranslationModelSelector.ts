/**
 * Hook pour sélectionner et gérer le modèle de traduction
 */
import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

export type TranslationModel = 
  | 'auto'           // Cascade automatique (recommandé)
  | 'smt'            // Statistical Machine Translation uniquement
  | 'simplified'     // SimplifiedAI uniquement
  | 'baatonu'        // BaatonuAI avec embeddings
  | 'byt5-expert'    // ByT5 Expert fine-tuné Hugging Face
  | 'lovable-ai';    // Lovable AI cloud

export interface ModelInfo {
  id: TranslationModel;
  name: string;
  description: string;
  speed: 'ultra-rapide' | 'rapide' | 'moyen' | 'lent';
  quality: 'excellente' | 'très bonne' | 'bonne' | 'variable';
  cost: 'gratuit' | 'quasi-gratuit';
  icon: string;
  recommended?: boolean;
}

export const TRANSLATION_MODELS: ModelInfo[] = [
  {
    id: 'auto',
    name: 'Cascade Automatique',
    description: 'Meilleur équilibre vitesse/qualité. Utilise tous les modèles en cascade intelligente.',
    speed: 'rapide',
    quality: 'excellente',
    cost: 'gratuit',
    icon: '⚡',
    recommended: true
  },
  {
    id: 'smt',
    name: 'Moteur SMT',
    description: 'Statistical Machine Translation. Très rapide avec ~75-85% de précision.',
    speed: 'ultra-rapide',
    quality: 'très bonne',
    cost: 'gratuit',
    icon: '📊'
  },
  {
    id: 'simplified',
    name: 'SimplifiedAI',
    description: 'Modèle léger basé sur règles et patterns. Rapide mais moins précis.',
    speed: 'ultra-rapide',
    quality: 'bonne',
    cost: 'gratuit',
    icon: '🔤'
  },
  {
    id: 'baatonu',
    name: 'BaatonuAI',
    description: 'Modèle avancé avec embeddings sémantiques. Excellent pour contexte.',
    speed: 'moyen',
    quality: 'excellente',
    cost: 'gratuit',
    icon: '🧠'
  },
  {
    id: 'byt5-expert',
    name: 'ByT5 Expert',
    description: 'Modèle ByT5 fine-tuné spécifiquement pour Bariba. Haute qualité, spécialisé.',
    speed: 'moyen',
    quality: 'excellente',
    cost: 'gratuit',
    icon: '🤖'
  },
  {
    id: 'lovable-ai',
    name: 'Lovable AI',
    description: 'IA cloud haute performance. Meilleure qualité mais plus lent.',
    speed: 'lent',
    quality: 'excellente',
    cost: 'quasi-gratuit',
    icon: '☁️'
  }
];

export function useTranslationModelSelector() {
  const [selectedModel, setSelectedModel] = useState<TranslationModel>('auto');
  const { toast } = useToast();

  const selectModel = useCallback((model: TranslationModel) => {
    setSelectedModel(model);
    const modelInfo = TRANSLATION_MODELS.find(m => m.id === model);
    
    if (modelInfo) {
      toast({
        title: `${modelInfo.icon} ${modelInfo.name}`,
        description: modelInfo.description,
      });
    }
  }, [toast]);

  const getModelInfo = useCallback((model: TranslationModel): ModelInfo | undefined => {
    return TRANSLATION_MODELS.find(m => m.id === model);
  }, []);

  return {
    selectedModel,
    selectModel,
    getModelInfo,
    availableModels: TRANSLATION_MODELS
  };
}
