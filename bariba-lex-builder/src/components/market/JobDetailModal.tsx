import { useState } from 'react';
import { X, Volume2, Mic, MapPin, Phone, Users, Clock, AlertTriangle } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { MarketJob } from '@/hooks/useMarketJobs';
import { useTamTamLanguage } from '@/contexts/TamTamLanguageContext';
import { useBilingualAudio } from '@/hooks/useBilingualAudio';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { tamtamFeedback } from '@/utils/tamtamFeedback';
import { useToast } from '@/hooks/use-toast';
import { TamTamMicButton } from '@/components/tamtam/TamTamMicButton';

interface JobDetailModalProps {
  job: MarketJob | null;
  isOpen: boolean;
  onClose: () => void;
}

export function JobDetailModal({ job, isOpen, onClose }: JobDetailModalProps) {
  const [isRecordingMessage, setIsRecordingMessage] = useState(false);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  
  const { currentLang, t } = useTamTamLanguage();
  const { speakCurrentLang } = useBilingualAudio();
  const { user } = useAuth();
  const { toast } = useToast();

  if (!job) return null;

  const displayTitle = currentLang === 'ba' && job.title_ba 
    ? job.title_ba 
    : (job.title_fr || job.title);

  const isOffer = job.job_type === 'offer';

  const handleListen = async () => {
    tamtamFeedback.play('click');
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

  const uploadAudioToStorage = async (audioBase64: string): Promise<string | null> => {
    try {
      const byteCharacters = atob(audioBase64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'audio/webm' });
      
      const fileName = `messages/${user?.id}/${Date.now()}.webm`;
      const { data, error } = await supabase.storage
        .from('tamtam-audio')
        .upload(fileName, blob, { contentType: 'audio/webm' });
      
      if (error) throw error;
      
      const { data: urlData } = supabase.storage
        .from('tamtam-audio')
        .getPublicUrl(data.path);
      
      return urlData.publicUrl;
    } catch (err) {
      console.error('[JobDetailModal] uploadAudioToStorage error:', err);
      return null;
    }
  };

  const handleSendVoiceMessage = async (result: { audioBase64: string; transcription?: string; sourceLang: 'ba' | 'fr' }) => {
    if (!result.audioBase64 || !user || !job.employer_id) {
      toast({
        title: t('market_error'),
        description: t('market_cant_send'),
        variant: 'destructive'
      });
      return;
    }

    setIsSendingMessage(true);
    try {
      const audioUrl = await uploadAudioToStorage(result.audioBase64);
      if (!audioUrl) throw new Error('Failed to upload audio');

      const { error } = await supabase.from('tamtam_messages').insert({
        sender_id: user.id,
        receiver_id: job.employer_id,
        audio_url: audioUrl,
        transcript_fr: result.transcription,
        message_type: 'voice',
        text_content: `${isOffer ? '💼' : '🙋'} ${t('market_about')}: ${displayTitle}`
      });

      if (error) throw error;

      tamtamFeedback.play('success');
      toast({
        title: '✅',
        description: t('market_message_sent')
      });
      setIsRecordingMessage(false);
    } catch (err: any) {
      console.error('[JobDetailModal] sendVoiceMessage error:', err);
      toast({
        title: t('market_error'),
        description: err.message,
        variant: 'destructive'
      });
    } finally {
      setIsSendingMessage(false);
    }
  };

  const urgencyConfig = {
    normal: { color: 'bg-gray-100', label: { fr: 'Normal', ba: 'Gãa' }, icon: null },
    urgent: { color: 'bg-orange-100', label: { fr: 'Urgent', ba: 'Kpákpá' }, icon: <Clock className="w-4 h-4 text-orange-600" /> },
    very_urgent: { color: 'bg-red-100', label: { fr: 'Très urgent', ba: 'Kpákpá dɔni' }, icon: <AlertTriangle className="w-4 h-4 text-red-600" /> }
  };

  const availabilityLabels = {
    available: { fr: 'Disponible', ba: 'Ga wãa', color: 'bg-green-500' },
    busy: { fr: 'Occupé', ba: 'Ga sɔmburu mɔ', color: 'bg-red-500' },
    searching: { fr: 'En recherche', ba: 'Ga kasuu', color: 'bg-orange-500' }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg p-0 bg-tamtam-bg overflow-hidden max-h-[90vh] overflow-y-auto">
        <div className={`p-5 ${urgencyConfig[job.urgency]?.color || 'bg-tamtam-surface'}`}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-4">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                isOffer ? 'bg-blue-100' : 'bg-green-100'
              }`}>
                <span className="text-4xl">{job.emoji_icon || (isOffer ? '💼' : '🙋')}</span>
              </div>
              <div>
                <h2 className="text-xl font-bold text-tamtam-text mb-1">
                  {displayTitle}
                </h2>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full text-white ${
                    isOffer ? 'bg-blue-500' : 'bg-green-500'
                  }`}>
                    {isOffer ? t('market_offer') : t('market_demand')}
                  </span>
                  {urgencyConfig[job.urgency]?.icon}
                  {job.urgency !== 'normal' && (
                    <span className="text-xs text-tamtam-text-muted">
                      {currentLang === 'ba' 
                        ? urgencyConfig[job.urgency].label.ba 
                        : urgencyConfig[job.urgency].label.fr}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleListen}
                className="w-10 h-10 bg-tamtam-primary text-white rounded-full flex items-center justify-center"
              >
                <Volume2 className="w-4 h-4" />
              </button>
              <button
                onClick={onClose}
                className="w-10 h-10 bg-tamtam-surface text-tamtam-text rounded-full flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        <div className="p-5">
          {!isOffer && (
            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full ${availabilityLabels[job.availability_status]?.color} text-white text-sm mb-4`}>
              {currentLang === 'ba' 
                ? availabilityLabels[job.availability_status]?.ba 
                : availabilityLabels[job.availability_status]?.fr}
            </div>
          )}

          {job.description_text && (
            <p className="text-tamtam-text-muted mb-4 leading-relaxed">
              {job.description_text}
            </p>
          )}

          <div className="space-y-3 mb-4">
            {job.location && (
              <div className="flex items-center gap-2 text-tamtam-text-muted">
                <MapPin className="w-4 h-4" />
                <span>{job.location}</span>
              </div>
            )}

            {job.salary_range && (
              <div className="text-lg font-semibold text-tamtam-primary">
                {job.salary_range}
              </div>
            )}

            {isOffer && job.applications_count !== null && job.applications_count > 0 && (
              <div className="flex items-center gap-2 text-tamtam-text-muted">
                <Users className="w-4 h-4" />
                <span>
                  {job.applications_count} {t('market_candidatures')}
                </span>
              </div>
            )}

            {job.contact_phone && (
              <a 
                href={`tel:${job.contact_phone}`}
                className="flex items-center gap-2 text-tamtam-primary"
              >
                <Phone className="w-4 h-4" />
                <span>{job.contact_phone}</span>
              </a>
            )}
          </div>

          {user && job.employer_id !== user.id && (
            <div className="border-t border-tamtam-surface pt-4 mt-4">
              <h3 className="font-semibold text-tamtam-text mb-3 flex items-center gap-2">
                <Mic className="w-4 h-4" />
                {isOffer ? t('market_apply_job') : t('market_contact_person')}
              </h3>

              {isRecordingMessage ? (
                <div className="flex flex-col items-center gap-4 py-4">
                  <p className="text-sm text-tamtam-text-muted text-center">
                    {isOffer ? t('market_explain_interest') : t('market_say_proposal')}
                  </p>
                  
                  <TamTamMicButton
                    size="lg"
                    onRecordingComplete={handleSendVoiceMessage}
                    autoTranscribe
                    sourceLang={currentLang}
                  />

                  <button
                    onClick={() => setIsRecordingMessage(false)}
                    className="text-sm text-tamtam-text-muted underline"
                  >
                    {t('market_cancel')}
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    tamtamFeedback.play('click');
                    setIsRecordingMessage(true);
                  }}
                  disabled={isSendingMessage}
                  className="w-full py-4 bg-tamtam-primary text-white rounded-2xl flex items-center justify-center gap-3 font-medium"
                >
                  {isSendingMessage ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Mic className="w-5 h-5" />
                      <span>
                        {isOffer ? t('market_apply_vocal') : t('market_send_voice')}
                      </span>
                    </>
                  )}
                </button>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
