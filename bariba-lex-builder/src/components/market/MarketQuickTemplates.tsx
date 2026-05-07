import { motion } from 'framer-motion';
import { useTamTamLanguage } from '@/contexts/TamTamLanguageContext';
import { useBilingualAudio } from '@/hooks/useBilingualAudio';
import { tamtamFeedback } from '@/utils/tamtamFeedback';
import { VoiceButton } from './VoiceButton';

export interface QuickTemplate {
  id: string;
  emoji: string;
  labelKey: string;
  labelFr: string;
  labelBa: string;
  category: string;
  type: 'product' | 'job_offer' | 'job_demand';
  prefillData: Record<string, any>;
}

const PRODUCT_TEMPLATES: QuickTemplate[] = [
  { id: 'tomatoes', emoji: '🍅', labelKey: 'template_tomatoes', labelFr: 'Tomates', labelBa: 'Tòmátì', category: 'food', type: 'product', prefillData: { emoji_icon: '🍅', category: 'food' } },
  { id: 'chicken', emoji: '🐔', labelKey: 'template_chicken', labelFr: 'Poulets', labelBa: 'Gɔsu', category: 'livestock', type: 'product', prefillData: { emoji_icon: '🐔', category: 'livestock' } },
  { id: 'corn', emoji: '🌽', labelKey: 'template_corn', labelFr: 'Maïs', labelBa: 'Kpaamu', category: 'food', type: 'product', prefillData: { emoji_icon: '🌽', category: 'food' } },
  { id: 'rice', emoji: '🍚', labelKey: 'template_rice', labelFr: 'Riz', labelBa: 'Mɔɔri', category: 'food', type: 'product', prefillData: { emoji_icon: '🍚', category: 'food' } },
  { id: 'clothes', emoji: '👕', labelKey: 'template_clothes', labelFr: 'Vêtements', labelBa: 'Gãsi', category: 'clothing', type: 'product', prefillData: { emoji_icon: '👕', category: 'clothing' } },
  { id: 'craft', emoji: '🎨', labelKey: 'template_craft', labelFr: 'Artisanat', labelBa: 'Sɔmbu koru', category: 'craft', type: 'product', prefillData: { emoji_icon: '🎨', category: 'craft' } },
];

const JOB_OFFER_TEMPLATES: QuickTemplate[] = [
  { id: 'farmer', emoji: '🚜', labelKey: 'template_seek_farmer', labelFr: 'Cherche agriculteur', labelBa: 'Na kpaakudɔbu kasumɔ', category: 'agriculture', type: 'job_offer', prefillData: { emoji_icon: '🚜', category: 'agriculture', job_type: 'offer' } },
  { id: 'mason', emoji: '🏗️', labelKey: 'template_seek_mason', labelFr: 'Cherche maçon', labelBa: 'Na maasɔ̃ kasumɔ', category: 'construction', type: 'job_offer', prefillData: { emoji_icon: '🏗️', category: 'construction', job_type: 'offer' } },
  { id: 'domestic', emoji: '🏠', labelKey: 'template_domestic_help', labelFr: 'Aide ménagère', labelBa: 'Yooku dɛɛmɛ', category: 'domestic', type: 'job_offer', prefillData: { emoji_icon: '🏠', category: 'domestic', job_type: 'offer' } },
  { id: 'driver', emoji: '🚗', labelKey: 'template_seek_driver', labelFr: 'Cherche chauffeur', labelBa: 'Na wotuuridɔbu kasumɔ', category: 'transport', type: 'job_offer', prefillData: { emoji_icon: '🚗', category: 'transport', job_type: 'offer' } },
];

const JOB_DEMAND_TEMPLATES: QuickTemplate[] = [
  { id: 'farm_work', emoji: '🌾', labelKey: 'template_farm_work', labelFr: 'Travail aux champs', labelBa: 'Kpaaku sɔmbu', category: 'agriculture', type: 'job_demand', prefillData: { emoji_icon: '🌾', category: 'agriculture', job_type: 'demand' } },
  { id: 'construction', emoji: '🔨', labelKey: 'template_construction', labelFr: 'Travail bâtiment', labelBa: 'Bon dɔbu sɔmbu', category: 'construction', type: 'job_demand', prefillData: { emoji_icon: '🔨', category: 'construction', job_type: 'demand' } },
  { id: 'commerce', emoji: '🛒', labelKey: 'template_commerce', labelFr: 'Travail commerce', labelBa: 'Tiaru sɔmbu', category: 'commerce', type: 'job_demand', prefillData: { emoji_icon: '🛒', category: 'commerce', job_type: 'demand' } },
  { id: 'any_work', emoji: '💪', labelKey: 'template_any_work', labelFr: 'Tout travail', labelBa: 'Sɔmbu kpuro', category: 'other', type: 'job_demand', prefillData: { emoji_icon: '💪', category: 'other', job_type: 'demand' } },
];

interface MarketQuickTemplatesProps {
  type: 'product' | 'job_offer' | 'job_demand';
  onSelect: (template: QuickTemplate) => void;
}

export function MarketQuickTemplates({ type, onSelect }: MarketQuickTemplatesProps) {
  const { t } = useTamTamLanguage();
  const { speakCurrentLang } = useBilingualAudio();

  const templates = type === 'product' 
    ? PRODUCT_TEMPLATES 
    : type === 'job_offer' 
    ? JOB_OFFER_TEMPLATES 
    : JOB_DEMAND_TEMPLATES;

  const handleSelect = async (template: QuickTemplate) => {
    tamtamFeedback.play('click');
    await speakCurrentLang(t(template.labelKey));
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
            {t(template.labelKey)}
          </span>
          
          <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <VoiceButton textFr={template.labelFr} textBa={template.labelBa} size="sm" />
          </div>
        </motion.button>
      ))}
    </div>
  );
}

export { PRODUCT_TEMPLATES, JOB_OFFER_TEMPLATES, JOB_DEMAND_TEMPLATES };
