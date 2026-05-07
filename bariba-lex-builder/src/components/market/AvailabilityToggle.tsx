import { motion } from 'framer-motion';
import { useTamTamLanguage } from '@/contexts/TamTamLanguageContext';
import { tamtamFeedback } from '@/utils/tamtamFeedback';

interface AvailabilityToggleProps {
  currentStatus: 'available' | 'busy' | 'searching';
  onChange: (status: 'available' | 'busy' | 'searching') => void;
  disabled?: boolean;
}

export function AvailabilityToggle({ currentStatus, onChange, disabled }: AvailabilityToggleProps) {
  const { t } = useTamTamLanguage();

  const statuses = [
    { id: 'available' as const, icon: '🟢', color: 'bg-green-500', labelKey: 'status_available' },
    { id: 'searching' as const, icon: '🟠', color: 'bg-orange-500', labelKey: 'status_searching' },
    { id: 'busy' as const, icon: '🔴', color: 'bg-red-500', labelKey: 'status_busy' },
  ];

  const handleChange = (status: 'available' | 'busy' | 'searching') => {
    if (disabled || status === currentStatus) return;
    tamtamFeedback.play('click');
    onChange(status);
  };

  return (
    <div className="flex gap-2 p-1 bg-tamtam-surface rounded-2xl">
      {statuses.map(status => {
        const isActive = currentStatus === status.id;
        return (
          <motion.button
            key={status.id}
            onClick={() => handleChange(status.id)}
            disabled={disabled}
            className={`flex-1 py-3 px-2 rounded-xl flex items-center justify-center gap-2 transition-all ${
              isActive 
                ? `${status.color} text-white shadow-lg` 
                : 'bg-transparent text-tamtam-text-muted hover:bg-tamtam-bg'
            }`}
            whileTap={{ scale: isActive ? 1 : 0.95 }}
          >
            <span className="text-lg">{status.icon}</span>
            <span className="text-xs font-medium hidden sm:inline">
              {t(status.labelKey)}
            </span>
          </motion.button>
        );
      })}
    </div>
  );
}
