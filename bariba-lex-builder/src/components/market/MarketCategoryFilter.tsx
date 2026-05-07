import { motion } from 'framer-motion';
import { useTamTamLanguage } from '@/contexts/TamTamLanguageContext';
import { tamtamFeedback } from '@/utils/tamtamFeedback';

interface MarketCategoryFilterProps {
  categories: Array<{
    id: string;
    emoji: string;
    labelFr: string;
    labelBa: string;
  }>;
  selectedCategory: string | null;
  onSelect: (categoryId: string | null) => void;
}

export function MarketCategoryFilter({ categories, selectedCategory, onSelect }: MarketCategoryFilterProps) {
  const { currentLang, t } = useTamTamLanguage();

  const handleSelect = (categoryId: string | null) => {
    tamtamFeedback.play('click');
    onSelect(categoryId);
  };

  return (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
      <motion.button
        onClick={() => handleSelect(null)}
        whileTap={{ scale: 0.95 }}
        className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition-all ${
          selectedCategory === null
            ? 'bg-tamtam-primary text-white'
            : 'bg-tamtam-surface text-tamtam-text'
        }`}
      >
        <span className="text-lg">📋</span>
        <span className="text-sm font-medium">{t('market_all')}</span>
      </motion.button>

      {categories.map(cat => (
        <motion.button
          key={cat.id}
          onClick={() => handleSelect(cat.id)}
          whileTap={{ scale: 0.95 }}
          className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition-all ${
            selectedCategory === cat.id
              ? 'bg-tamtam-primary text-white'
              : 'bg-tamtam-surface text-tamtam-text'
          }`}
        >
          <span className="text-lg">{cat.emoji}</span>
          <span className="text-sm font-medium">
            {currentLang === 'ba' ? cat.labelBa : cat.labelFr}
          </span>
        </motion.button>
      ))}
    </div>
  );
}
