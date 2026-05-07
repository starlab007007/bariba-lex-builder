import React from 'react';
import { motion } from 'framer-motion';
import { Grid3X3, Users, Mic, ChevronDown } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface KuaishouProfileTabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  postsCount?: number;
}

export const KuaishouProfileTabs: React.FC<KuaishouProfileTabsProps> = ({
  activeTab,
  onTabChange,
  postsCount = 0,
}) => {
  const tabs = [
    { value: 'posts', icon: Grid3X3, label: 'Posts', count: postsCount },
    { value: 'communities', icon: Users, label: 'Communautés' },
    { value: 'stats', icon: Mic, label: 'Stats' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.45 }}
      className="border-t border-[hsl(var(--kuaishou-border))] bg-[hsl(var(--kuaishou-white))]"
    >
      <Tabs value={activeTab} onValueChange={onTabChange} className="w-full">
        <TabsList className="w-full h-12 bg-[hsl(var(--kuaishou-white))] grid grid-cols-3 rounded-none border-b border-[hsl(var(--kuaishou-border))] p-0">
          {tabs.map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="relative flex items-center justify-center gap-1.5 h-full rounded-none bg-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none transition-colors px-2"
            >
              <tab.icon
                className={`w-4 h-4 sm:w-5 sm:h-5 ${
                  activeTab === tab.value
                    ? 'text-[hsl(var(--kuaishou-text))]'
                    : 'text-[hsl(var(--kuaishou-text-muted))]'
                }`}
              />
              <span
                className={`text-xs sm:text-sm ${
                  activeTab === tab.value
                    ? 'text-[hsl(var(--kuaishou-text))] font-semibold'
                    : 'text-[hsl(var(--kuaishou-text-muted))]'
                }`}
              >
                {tab.label}
              </span>
              {/* Count with dropdown icon for posts tab */}
              {tab.count !== undefined && (
                <span className={`flex items-center gap-0.5 text-xs ${
                  activeTab === tab.value
                    ? 'text-[hsl(var(--kuaishou-text))] font-semibold'
                    : 'text-[hsl(var(--kuaishou-text-muted))]'
                }`}>
                  {tab.count}
                  <ChevronDown className="w-3 h-3" />
                </span>
              )}

              {/* Active indicator line */}
              {activeTab === tab.value && (
                <motion.div
                  layoutId="kuaishou-tab-indicator"
                  className="absolute bottom-0 left-4 right-4 h-0.5 bg-[hsl(var(--kuaishou-text))] rounded-full"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
    </motion.div>
  );
};

export default KuaishouProfileTabs;
