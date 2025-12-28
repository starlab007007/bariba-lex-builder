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
  
  const { currentLang } = useTamTamLanguage();
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
      textToSpeak += `. ${currentLang === 'ba' ? 'Ní' : 'À'} ${job.location}`;
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
        title: currentLang === 'ba' ? 'Àṣìṣe' : 'Erreur',
        description: currentLang === 'ba' ? 'Kò lè fi ránṣẹ́' : 'Impossible d\'envoyer le message',
        variant: 'destructive'
      });
      return;
    }

    setIsSendingMessage(true);
    try {
      // Upload audio to storage
      const audioUrl = await uploadAudioToStorage(result.audioBase64);
      if (!audioUrl) throw new Error('Failed to upload audio');

      // Create a message to the employer
      const { error } = await supabase.from('tamtam_messages').insert({
        sender_id: user.id,
        receiver_id: job.employer_id,
        audio_url: audioUrl,
        transcript_fr: result.transcription,
        message_type: 'voice',
        text_content: `${isOffer ? '💼' : '🙋'} ${currentLang === 'ba' ? 'Nípa' : 'À propos de'}: ${displayTitle}`
      });

      if (error) throw error;

      tamtamFeedback.play('success');
      toast({
        title: '✅',
        description: currentLang === 'ba' 
          ? 'Ifiránṣẹ́ ti ránṣẹ́' 
          : isOffer ? 'Message envoyé à l\'employeur' : 'Message envoyé'
      });
      setIsRecordingMessage(false);
    } catch (err: any) {
      console.error('[JobDetailModal] sendVoiceMessage error:', err);
      toast({
        title: currentLang === 'ba' ? 'Àṣìṣe' : 'Erreur',
        description: err.message,
        variant: 'destructive'
      });
    } finally {
      setIsSendingMessage(false);
    }
  };

  const urgencyConfig = {
    normal: { color: 'bg-gray-100', label: { fr: 'Normal', ba: 'Déédé' }, icon: null },
    urgent: { color: 'bg-orange-100', label: { fr: 'Urgent', ba: 'Kíákíá' }, icon: <Clock className="w-4 h-4 text-orange-600" /> },
    very_urgent: { color: 'bg-red-100', label: { fr: 'Très urgent', ba: 'Kíákíá púpọ̀' }, icon: <AlertTriangle className="w-4 h-4 text-red-600" /> }
  };

  const availabilityLabels = {
    available: { fr: 'Disponible', ba: 'Ó wà', color: 'bg-green-500' },
    busy: { fr: 'Occupé', ba: 'Ó ń ṣiṣẹ́', color: 'bg-red-500' },
    searching: { fr: 'En recherche', ba: 'Ó ń wá', color: 'bg-orange-500' }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg p-0 bg-tamtam-bg overflow-hidden max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className={`p-5 ${urgencyConfig[job.urgency]?.color || 'bg-tamtam-surface'}`}>
          <div className="flex items-start justify-between gap-3">
            {/* Icon and title */}
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
                    {isOffer 
                      ? (currentLang === 'ba' ? 'Iṣẹ́' : 'Offre') 
                      : (currentLang === 'ba' ? 'Ọwọ́' : 'Demande')}
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

            {/* Close and listen buttons */}
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

        {/* Content */}
        <div className="p-5">
          {/* Availability for demands */}
          {!isOffer && (
            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full ${availabilityLabels[job.availability_status]?.color} text-white text-sm mb-4`}>
              {currentLang === 'ba' 
                ? availabilityLabels[job.availability_status]?.ba 
                : availabilityLabels[job.availability_status]?.fr}
            </div>
          )}

          {/* Description */}
          {job.description_text && (
            <p className="text-tamtam-text-muted mb-4 leading-relaxed">
              {job.description_text}
            </p>
          )}

          {/* Details */}
          <div className="space-y-3 mb-4">
            {/* Location */}
            {job.location && (
              <div className="flex items-center gap-2 text-tamtam-text-muted">
                <MapPin className="w-4 h-4" />
                <span>{job.location}</span>
              </div>
            )}

            {/* Salary */}
            {job.salary_range && (
              <div className="text-lg font-semibold text-tamtam-primary">
                {job.salary_range}
              </div>
            )}

            {/* Applications count */}
            {isOffer && job.applications_count !== null && job.applications_count > 0 && (
              <div className="flex items-center gap-2 text-tamtam-text-muted">
                <Users className="w-4 h-4" />
                <span>
                  {job.applications_count} {currentLang === 'ba' ? 'ènìyàn ti fọwọ́sí' : 'candidatures'}
                </span>
              </div>
            )}

            {/* Contact phone */}
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

          {/* Voice Message Section */}
          {user && job.employer_id !== user.id && (
            <div className="border-t border-tamtam-surface pt-4 mt-4">
              <h3 className="font-semibold text-tamtam-text mb-3 flex items-center gap-2">
                <Mic className="w-4 h-4" />
                {isOffer 
                  ? (currentLang === 'ba' ? 'Fọwọ́sí iṣẹ́ yìí' : 'Postuler à cette offre')
                  : (currentLang === 'ba' ? 'Kàn sí ẹni yìí' : 'Contacter cette personne')}
              </h3>

              {isRecordingMessage ? (
                <div className="flex flex-col items-center gap-4 py-4">
                  <p className="text-sm text-tamtam-text-muted text-center">
                    {isOffer
                      ? (currentLang === 'ba' 
                          ? 'Sọ ìdí tí o fi yẹ fún iṣẹ́ yìí' 
                          : 'Présentez-vous et expliquez pourquoi vous êtes intéressé')
                      : (currentLang === 'ba' 
                          ? 'Sọ ohun tí o fẹ́ sọ' 
                          : 'Dites ce que vous voulez proposer')}
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
                    {currentLang === 'ba' ? 'Padà' : 'Annuler'}
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
                        {isOffer 
                          ? (currentLang === 'ba' ? 'Fọwọ́sí' : 'Postuler par message vocal')
                          : (currentLang === 'ba' ? 'Fi ọ̀rọ̀ ránṣẹ́' : 'Envoyer un message vocal')}
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
