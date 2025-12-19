import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, XCircle, Loader2, AlertCircle } from 'lucide-react';
import { ServiceStatus as LegacyServiceStatus } from '@/hooks/useAudioServices';
import { AudioServicesHealth, ServiceStatus as UnifiedServiceStatus } from '@/services/UnifiedAudioService';

// Legacy type for backward compatibility
type ServiceStatus = LegacyServiceStatus;

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
  // Unified service statuses
  healthy: {
    icon: CheckCircle2,
    color: 'text-emerald-500',
    bg: 'bg-emerald-50',
    text: 'Disponible',
  },
  degraded: {
    icon: AlertCircle,
    color: 'text-amber-500',
    bg: 'bg-amber-50',
    text: 'Dégradé',
  },
  unknown: {
    icon: Loader2,
    color: 'text-gray-500',
    bg: 'bg-gray-50',
    text: 'Inconnu',
  },
};

export function AudioServiceStatus({ status, label, compact = false }: AudioServiceStatusProps) {
  const config = statusConfig[status] || statusConfig.unknown;
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

// Legacy interface for backward compatibility
interface LegacyAudioServicesStatusBarProps {
  health: {
    baribaSTT: ServiceStatus;
    baribaTTS: ServiceStatus;
    frenchSTT: ServiceStatus;
    frenchTTS: ServiceStatus;
    byT5: ServiceStatus;
  };
  showAll?: boolean;
}

// New unified interface
interface UnifiedAudioServicesStatusBarProps {
  health: AudioServicesHealth | null;
  showAll?: boolean;
}

// Helper to convert unified status to display status
function convertStatus(status: UnifiedServiceStatus): ServiceStatus {
  switch (status) {
    case 'healthy': return 'available';
    case 'degraded': return 'error';
    case 'unavailable': return 'unavailable';
    default: return 'checking';
  }
}

export function AudioServicesStatusBar({ health, showAll = false }: UnifiedAudioServicesStatusBarProps | LegacyAudioServicesStatusBarProps) {
  if (!health) return null;
  
  // Check if using unified health type (has objects with status property vs direct string status)
  const baribaTTSValue = (health as any).baribaTTS;
  const isUnifiedHealth = baribaTTSValue && typeof baribaTTSValue === 'object' && 'status' in baribaTTSValue;
  
  let displayHealth: { stt: ServiceStatus; tts: ServiceStatus; translate: ServiceStatus };
  
  if (isUnifiedHealth) {
    const unified = health as AudioServicesHealth;
    displayHealth = {
      stt: convertStatus(unified.baribaSTT.status),
      tts: convertStatus(unified.baribaTTS.status),
      translate: convertStatus(unified.translation.status),
    };
  } else {
    const legacy = health as LegacyAudioServicesStatusBarProps['health'];
    displayHealth = {
      stt: legacy.baribaSTT,
      tts: legacy.baribaTTS,
      translate: legacy.byT5,
    };
  }
  
  // Only show if any service is unavailable or error
  const hasIssues = Object.values(displayHealth).some(s => s === 'unavailable' || s === 'error');
  
  if (!showAll && !hasIssues) {
    return null;
  }
  
  return (
    <div className="flex flex-wrap gap-1">
      <AudioServiceStatus status={displayHealth.stt} label="STT" compact />
      <AudioServiceStatus status={displayHealth.tts} label="TTS" compact />
      <AudioServiceStatus status={displayHealth.translate} label="Trad" compact />
    </div>
  );
}
