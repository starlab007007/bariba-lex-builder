import React from 'react';
import { motion } from 'framer-motion';

interface KuaishouPostFiltersProps {
  filter: 'all' | 'public' | 'private';
  onFilterChange: (filter: 'all' | 'public' | 'private') => void;
  totalCount: number;
  publicCount: number;
  privateCount: number;
}

export const KuaishouPostFilters: React.FC<KuaishouPostFiltersProps> = ({
  filter,
  onFilterChange,
  totalCount,
  publicCount,
  privateCount,
}) => {
  const filters = [
    { key: 'all' as const, label: 'Tous', count: totalCount },
    { key: 'public' as const, label: 'Publics', count: publicCount },
    { key: 'private' as const, label: 'Privés', count: privateCount },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex gap-2 px-4 py-3"
    >
      {filters.map((item) => (
        <motion.button
          key={item.key}
          whileTap={{ scale: 0.95 }}
          onClick={() => onFilterChange(item.key)}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
            filter === item.key
              ? 'bg-[hsl(var(--kuaishou-primary))] text-white shadow-md shadow-[hsl(var(--kuaishou-primary)/0.3)]'
              : 'bg-muted text-muted-foreground hover:bg-muted/80'
          }`}
        >
          {item.label} ({item.count})
        </motion.button>
      ))}
    </motion.div>
  );
};

export default KuaishouPostFilters;
