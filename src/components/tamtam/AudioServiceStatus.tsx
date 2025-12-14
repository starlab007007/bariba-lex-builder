import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, XCircle, Loader2, AlertCircle } from 'lucide-react';
import { ServiceStatus } from '@/hooks/useAudioServices';

interface AudioServiceStatusProps {
  status: ServiceStatus;
  label: string;
  compact?: boolean;
}

const statusConfig = {
  checking: {
    icon: Loader2,
    color: 'text-amber-500',
    bg: 'bg-amber-50',
    text: 'Vérification...',
  },
  available: {
    icon: CheckCircle2,
    color: 'text-emerald-500',
    bg: 'bg-emerald-50',
    text: 'Disponible',
  },
  unavailable: {
    icon: XCircle,
    color: 'text-red-500',
    bg: 'bg-red-50',
    text: 'Indisponible',
  },
  error: {
    icon: AlertCircle,
    color: 'text-orange-500',
    bg: 'bg-orange-50',
    text: 'Erreur',
  },
};

export function AudioServiceStatus({ status, label, compact = false }: AudioServiceStatusProps) {
  const config = statusConfig[status];
  const Icon = config.icon;
  
  if (compact) {
    return (
      <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full ${config.bg}`}>
        <Icon className={`w-3 h-3 ${config.color} ${status === 'checking' ? 'animate-spin' : ''}`} />
        <span className={`text-xs font-medium ${config.color}`}>{label}</span>
      </div>
    );
  }
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`flex items-center gap-2 px-3 py-2 rounded-xl ${config.bg}`}
    >
      <Icon className={`w-4 h-4 ${config.color} ${status === 'checking' ? 'animate-spin' : ''}`} />
      <div className="flex-1">
        <span className="text-sm font-medium text-gray-700">{label}</span>
      </div>
      <span className={`text-xs ${config.color}`}>{config.text}</span>
    </motion.div>
  );
}

interface AudioServicesStatusBarProps {
  health: {
    baribaSTT: ServiceStatus;
    baribaTTS: ServiceStatus;
    frenchSTT: ServiceStatus;
    frenchTTS: ServiceStatus;
    byT5: ServiceStatus;
  };
  showAll?: boolean;
}

export function AudioServicesStatusBar({ health, showAll = false }: AudioServicesStatusBarProps) {
  // Only show if any service is unavailable or error
  const hasIssues = Object.values(health).some(s => s === 'unavailable' || s === 'error');
  
  if (!showAll && !hasIssues) {
    return null;
  }
  
  return (
    <div className="flex flex-wrap gap-1">
      <AudioServiceStatus status={health.baribaSTT} label="STT" compact />
      <AudioServiceStatus status={health.baribaTTS} label="TTS" compact />
      <AudioServiceStatus status={health.byT5} label="ByT5" compact />
    </div>
  );
}
