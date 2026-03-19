import { motion } from 'framer-motion';
import { Volume2, Phone, MapPin, Users, AlertTriangle, Clock, Eye } from 'lucide-react';
import { MarketJob } from '@/hooks/useMarketJobs';
import { useTamTamLanguage } from '@/contexts/TamTamLanguageContext';
import { useBilingualAudio } from '@/hooks/useBilingualAudio';
import { tamtamFeedback } from '@/utils/tamtamFeedback';

interface MarketJobCardProps {
  job: MarketJob;
  onApply?: (job: MarketJob) => void;
  onContact?: (job: MarketJob) => void;
  onViewDetails?: (job: MarketJob) => void;
  isPlaying?: boolean;
  onPlayToggle?: () => void;
  showApplyButton?: boolean;
}

export function MarketJobCard({ 
  job, 
  onApply,
  onContact,
  onViewDetails,
  isPlaying = false,
  onPlayToggle,
  showApplyButton = true
}: MarketJobCardProps) {
  const { currentLang, t } = useTamTamLanguage();
  const { speakCurrentLang } = useBilingualAudio();

  const displayTitle = currentLang === 'ba' && job.title_ba 
    ? job.title_ba 
    : (job.title_fr || job.title);

  const availabilityColors = {
    available: 'bg-green-500',
    busy: 'bg-red-500',
    searching: 'bg-orange-500'
  };

  const availabilityLabels = {
    available: { fr: 'Disponible', ba: 'Ga wãa', icon: '🟢' },
    busy: { fr: 'Occupé', ba: 'Ga sɔmburu mɔ', icon: '🔴' },
    searching: { fr: 'En recherche', ba: 'Ga kasuu', icon: '🟠' }
  };

  const urgencyConfig = {
    normal: { color: 'bg-gray-100', icon: null },
    urgent: { color: 'bg-orange-100', icon: <Clock className="w-4 h-4 text-orange-600" /> },
    very_urgent: { color: 'bg-red-100', icon: <AlertTriangle className="w-4 h-4 text-red-600" /> }
  };

  const handleListen = async () => {
    tamtamFeedback.play('click');
    onPlayToggle?.();
    
    let textToSpeak = displayTitle;
    if (job.description_text) {
      textToSpeak += `. ${job.description_text}`;
    }
    if (job.location) {
      textToSpeak += `. ${t('market_at_location')} ${job.location}`;
    }
    if (job.salary_range) {
      textToSpeak += `. ${job.salary_range}`;
    }
    
    await speakCurrentLang(textToSpeak);
  };

  const handleApply = () => {
    tamtamFeedback.play('send');
    onApply?.(job);
  };

  const handleContact = () => {
    tamtamFeedback.play('send');
    onContact?.(job);
  };

  const handleViewDetails = () => {
    tamtamFeedback.play('click');
    onViewDetails?.(job);
  };

  const isOffer = job.job_type === 'offer';
  const statusInfo = availabilityLabels[job.availability_status];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-3xl p-5 shadow-tamtam-soft ${urgencyConfig[job.urgency].color || 'bg-tamtam-surface'}`}
    >
      <div className="flex items-start gap-4">
        <button 
          onClick={handleViewDetails}
          className={`w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0 relative group ${
            isOffer ? 'bg-blue-100' : 'bg-green-100'
          }`}
        >
          <span className="text-4xl">{job.emoji_icon || (isOffer ? '💼' : '🙋')}</span>
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors rounded-2xl flex items-center justify-center">
            <Eye className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-tamtam-text text-base truncate">
              {displayTitle}
            </h3>
            {urgencyConfig[job.urgency].icon}
          </div>

          <div className="flex items-center gap-2 mb-2">
            <span className={`text-xs px-2 py-0.5 rounded-full ${
              isOffer 
                ? 'bg-blue-500 text-white' 
                : 'bg-green-500 text-white'
            }`}>
              {isOffer ? t('market_offer') : t('market_demand')}
            </span>
            
            {!isOffer && (
              <span className="flex items-center gap-1 text-xs text-tamtam-text-muted">
                {statusInfo.icon}
                <span>{currentLang === 'ba' ? statusInfo.ba : statusInfo.fr}</span>
              </span>
            )}
          </div>

          {job.location && (
            <div className="flex items-center gap-1 text-tamtam-text-muted text-sm mb-1">
              <MapPin className="w-3 h-3" />
              <span className="truncate">{job.location}</span>
            </div>
          )}

          <div className="flex items-center gap-3 text-sm text-tamtam-text-muted">
            {job.salary_range && (
              <span className="font-medium text-tamtam-text">{job.salary_range}</span>
            )}
            {isOffer && job.applications_count !== null && job.applications_count > 0 && (
              <span className="flex items-center gap-1">
                <Users className="w-3 h-3" />
                {job.applications_count}
              </span>
            )}
          </div>
        </div>

        <button
          onClick={handleListen}
          className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all flex-shrink-0 ${
            isPlaying
              ? 'bg-tamtam-primary text-white'
              : 'bg-white/80 text-tamtam-text'
          }`}
        >
          <Volume2 className="w-6 h-6" />
        </button>
      </div>

      <div className="flex gap-3 mt-4">
        {isOffer && showApplyButton && (
          <button 
            onClick={handleApply}
            className="flex-1 py-4 bg-tamtam-primary text-white rounded-2xl flex items-center justify-center gap-2 font-medium"
          >
            <span className="text-xl">🎤</span>
            <span>{t('market_postuler')}</span>
          </button>
        )}
        
        {!isOffer && (
          <button 
            onClick={handleContact}
            className="flex-1 py-4 bg-green-500 text-white rounded-2xl flex items-center justify-center gap-2 font-medium"
          >
            <Phone className="w-5 h-5" />
            <span>{t('market_contact')}</span>
          </button>
        )}
      </div>
    </motion.div>
  );
}
