import React from 'react';
import { motion } from 'framer-motion';
import { Grid3X3, Users, Mic } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface KuaishouProfileTabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export const KuaishouProfileTabs: React.FC<KuaishouProfileTabsProps> = ({
  activeTab,
  onTabChange,
}) => {
  const tabs = [
    { value: 'posts', icon: Grid3X3, label: 'Publications' },
    { value: 'communities', icon: Users, label: 'Communautés' },
    { value: 'stats', icon: Mic, label: 'Stats' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.5 }}
      className="mt-6 border-t border-[hsl(var(--kuaishou-border))]"
    >
      <Tabs value={activeTab} onValueChange={onTabChange} className="w-full">
        <TabsList className="w-full h-12 bg-white grid grid-cols-3 rounded-none border-b border-[hsl(var(--kuaishou-border))]">
          {tabs.map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="relative flex items-center justify-center gap-2 h-full rounded-none data-[state=active]:bg-transparent data-[state=active]:shadow-none transition-colors"
            >
              <tab.icon
                className={`w-5 h-5 ${
                  activeTab === tab.value
                    ? 'text-[hsl(var(--kuaishou-primary))]'
                    : 'text-muted-foreground'
                }`}
              />
              <span
                className={`hidden sm:inline text-sm ${
                  activeTab === tab.value
                    ? 'text-[hsl(var(--kuaishou-primary))] font-medium'
                    : 'text-muted-foreground'
                }`}
              >
                {tab.label}
              </span>

              {/* Active indicator line */}
              {activeTab === tab.value && (
                <motion.div
                  layoutId="kuaishou-tab-indicator"
                  className="absolute bottom-0 left-4 right-4 h-0.5 bg-[hsl(var(--kuaishou-primary))] rounded-full"
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
