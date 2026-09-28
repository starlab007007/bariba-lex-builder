/**
 * TemplateHeroSection — bandeau métriques + carte de recherche/catégories
 * (Flutter Build19 : écran Templates).
 */

import { Check, Search, X } from 'lucide-react';
import { Chip, ChipWrap, MetricStrip } from '@/components/fitila/FitilaUi';
import { SIG } from '@/components/fitila/signatureTheme';

interface TemplateHeroSectionProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
  totalTemplates: number;
  premiumCount: number;
}

const CATEGORIES = [
  { id: 'all', label: 'Tous' },
  { id: 'storytelling', label: 'Histoires' },
  { id: 'music', label: 'Musique' },
  { id: 'business', label: 'Business' },
  { id: 'education', label: 'Éducation' },
  { id: 'future', label: 'Futuriste' },
];

export function TemplateHeroSection({
  searchQuery,
  onSearchChange,
  selectedCategory,
  onCategoryChange,
  totalTemplates,
  premiumCount,
}: TemplateHeroSectionProps) {
  const select = (id: string) => {
    if ('vibrate' in navigator) navigator.vibrate(30);
    onCategoryChange(id);
  };

  return (
    <div className="space-y-[12px] pt-[18px]">
      <MetricStrip
        metrics={[
          { label: 'Templates', value: String(totalTemplates) },
          { label: 'Premium', value: String(premiumCount) },
          { label: 'Exports', value: '9:16' },
        ]}
      />

      <div className="mx-[18px] rounded-[24px] border bg-white p-[14px]" style={{ borderColor: SIG.hairline }}>
        <h2 className="mb-3 text-[20px] font-semibold" style={{ fontFamily: 'Fraunces, ui-serif, serif' }}>
          Galerie Kuaishou FITILA
        </h2>
        <label className="relative block">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2" style={{ color: SIG.ink }} />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Rechercher un template"
            aria-label="Rechercher un template"
            className="h-[52px] w-full rounded-[16px] border bg-white pl-12 pr-10 text-[15px] outline-none placeholder:text-[#8C8571] focus:border-[#C99530]"
            style={{ borderColor: SIG.hairline, color: SIG.ink }}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              aria-label="Effacer la recherche"
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1"
              style={{ color: SIG.muted }}
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </label>
        <div className="mt-3 flex flex-wrap gap-x-2 gap-y-[10px]">
          {CATEGORIES.map((c) => (
            <Chip key={c.id} label={c.label} icon={selectedCategory === c.id ? Check : undefined} selected={selectedCategory === c.id} onClick={() => select(c.id)} />
          ))}
        </div>
      </div>
    </div>
  );
}

export default TemplateHeroSection;
