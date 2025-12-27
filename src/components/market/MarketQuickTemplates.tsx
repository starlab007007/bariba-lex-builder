import { motion } from 'framer-motion';
import { useTamTamLanguage } from '@/contexts/TamTamLanguageContext';
import { useBilingualAudio } from '@/hooks/useBilingualAudio';
import { tamtamFeedback } from '@/utils/tamtamFeedback';
import { VoiceButton } from './VoiceButton';

export interface QuickTemplate {
  id: string;
  emoji: string;
  labelFr: string;
  labelBa: string;
  category: string;
  type: 'product' | 'job_offer' | 'job_demand';
  prefillData: Record<string, any>;
}

const PRODUCT_TEMPLATES: QuickTemplate[] = [
  { id: 'tomatoes', emoji: '🍅', labelFr: 'Tomates', labelBa: 'Tòmátì', category: 'food', type: 'product', prefillData: { emoji_icon: '🍅', category: 'food' } },
  { id: 'chicken', emoji: '🐔', labelFr: 'Poulets', labelBa: 'Adìẹ', category: 'livestock', type: 'product', prefillData: { emoji_icon: '🐔', category: 'livestock' } },
  { id: 'corn', emoji: '🌽', labelFr: 'Maïs', labelBa: 'Àgbàdo', category: 'food', type: 'product', prefillData: { emoji_icon: '🌽', category: 'food' } },
  { id: 'rice', emoji: '🍚', labelFr: 'Riz', labelBa: 'Ìrẹsì', category: 'food', type: 'product', prefillData: { emoji_icon: '🍚', category: 'food' } },
  { id: 'clothes', emoji: '👕', labelFr: 'Vêtements', labelBa: 'Aṣọ', category: 'clothing', type: 'product', prefillData: { emoji_icon: '👕', category: 'clothing' } },
  { id: 'craft', emoji: '🎨', labelFr: 'Artisanat', labelBa: 'Iṣẹ́ ọwọ́', category: 'craft', type: 'product', prefillData: { emoji_icon: '🎨', category: 'craft' } },
];

const JOB_OFFER_TEMPLATES: QuickTemplate[] = [
  { id: 'farmer', emoji: '🚜', labelFr: 'Cherche agriculteur', labelBa: 'Ń wá àgbẹ̀', category: 'agriculture', type: 'job_offer', prefillData: { emoji_icon: '🚜', category: 'agriculture', job_type: 'offer' } },
  { id: 'mason', emoji: '🏗️', labelFr: 'Cherche maçon', labelBa: 'Ń wá ògbọ́n ilé', category: 'construction', type: 'job_offer', prefillData: { emoji_icon: '🏗️', category: 'construction', job_type: 'offer' } },
  { id: 'domestic', emoji: '🏠', labelFr: 'Aide ménagère', labelBa: 'Ìrànwọ́ ilé', category: 'domestic', type: 'job_offer', prefillData: { emoji_icon: '🏠', category: 'domestic', job_type: 'offer' } },
  { id: 'driver', emoji: '🚗', labelFr: 'Cherche chauffeur', labelBa: 'Ń wá awakọ̀', category: 'transport', type: 'job_offer', prefillData: { emoji_icon: '🚗', category: 'transport', job_type: 'offer' } },
];

const JOB_DEMAND_TEMPLATES: QuickTemplate[] = [
  { id: 'farm_work', emoji: '🌾', labelFr: 'Travail aux champs', labelBa: 'Iṣẹ́ oko', category: 'agriculture', type: 'job_demand', prefillData: { emoji_icon: '🌾', category: 'agriculture', job_type: 'demand' } },
  { id: 'construction', emoji: '🔨', labelFr: 'Travail bâtiment', labelBa: 'Iṣẹ́ ìkọ́lé', category: 'construction', type: 'job_demand', prefillData: { emoji_icon: '🔨', category: 'construction', job_type: 'demand' } },
  { id: 'commerce', emoji: '🛒', labelFr: 'Travail commerce', labelBa: 'Iṣẹ́ òwò', category: 'commerce', type: 'job_demand', prefillData: { emoji_icon: '🛒', category: 'commerce', job_type: 'demand' } },
  { id: 'any_work', emoji: '💪', labelFr: 'Tout travail', labelBa: 'Iṣẹ́ kankan', category: 'other', type: 'job_demand', prefillData: { emoji_icon: '💪', category: 'other', job_type: 'demand' } },
];

interface MarketQuickTemplatesProps {
  type: 'product' | 'job_offer' | 'job_demand';
  onSelect: (template: QuickTemplate) => void;
}

export function MarketQuickTemplates({ type, onSelect }: MarketQuickTemplatesProps) {
  const { currentLang } = useTamTamLanguage();
  const { speakCurrentLang } = useBilingualAudio();

  const templates = type === 'product' 
    ? PRODUCT_TEMPLATES 
    : type === 'job_offer' 
    ? JOB_OFFER_TEMPLATES 
    : JOB_DEMAND_TEMPLATES;

  const handleSelect = async (template: QuickTemplate) => {
    tamtamFeedback.play('click');
    const label = currentLang === 'ba' ? template.labelBa : template.labelFr;
    await speakCurrentLang(label);
    onSelect(template);
  };

  return (
    <div className="grid grid-cols-3 gap-3">
      {templates.map((template, index) => (
        <motion.button
          key={template.id}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: index * 0.05 }}
          onClick={() => handleSelect(template)}
          className="relative flex flex-col items-center p-4 bg-tamtam-surface rounded-2xl hover:bg-tamtam-primary/10 transition-all group"
        >
          <span className="text-4xl mb-2">{template.emoji}</span>
          <span className="text-xs text-tamtam-text text-center font-medium">
            {currentLang === 'ba' ? template.labelBa : template.labelFr}
          </span>
          
          {/* Audio button */}
          <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <VoiceButton 
              textFr={template.labelFr} 
              textBa={template.labelBa} 
              size="sm" 
            />
          </div>
        </motion.button>
      ))}
    </div>
  );
}

export { PRODUCT_TEMPLATES, JOB_OFFER_TEMPLATES, JOB_DEMAND_TEMPLATES };
