import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, Volume2, Mic, Send, MapPin, Phone } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { MarketProduct } from '@/hooks/useMarketProducts';
import { useTamTamLanguage } from '@/contexts/TamTamLanguageContext';
import { useBilingualAudio } from '@/hooks/useBilingualAudio';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { tamtamFeedback } from '@/utils/tamtamFeedback';
import { useToast } from '@/hooks/use-toast';
import { TamTamMicButton } from '@/components/tamtam/TamTamMicButton';

interface ProductDetailModalProps {
  product: MarketProduct | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ProductDetailModal({ product, isOpen, onClose }: ProductDetailModalProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isRecordingMessage, setIsRecordingMessage] = useState(false);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  
  const { currentLang } = useTamTamLanguage();
  const { speakCurrentLang } = useBilingualAudio();
  const { user } = useAuth();
  const { toast } = useToast();

  if (!product) return null;

  const displayTitle = currentLang === 'ba' && product.title_ba 
    ? product.title_ba 
    : (product.title_fr || product.title);

  const images = product.images?.length 
    ? product.images 
    : product.thumbnail_url 
      ? [product.thumbnail_url] 
      : [];

  const hasMultipleImages = images.length > 1;

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
    tamtamFeedback.play('click');
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
    tamtamFeedback.play('click');
  };

  const handleListen = async () => {
    tamtamFeedback.play('click');
    const textToSpeak = product.description_text 
      ? `${displayTitle}. ${product.price} francs. ${product.description_text}`
      : `${displayTitle}. ${product.price} francs`;
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
      console.error('[ProductDetailModal] uploadAudioToStorage error:', err);
      return null;
    }
  };

  const handleSendVoiceMessage = async (result: { audioBase64: string; transcription?: string; sourceLang: 'ba' | 'fr' }) => {
    if (!result.audioBase64 || !user || !product.seller_id) {
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

      // Create a message to the seller
      const { error } = await supabase.from('tamtam_messages').insert({
        sender_id: user.id,
        receiver_id: product.seller_id,
        audio_url: audioUrl,
        transcript_fr: result.transcription,
        message_type: 'voice',
        text_content: `📦 ${currentLang === 'ba' ? 'Nípa' : 'À propos de'}: ${displayTitle}`
      });

      if (error) throw error;

      tamtamFeedback.play('success');
      toast({
        title: '✅',
        description: currentLang === 'ba' ? 'Ifiránṣẹ́ ti ránṣẹ́' : 'Message envoyé au vendeur'
      });
      setIsRecordingMessage(false);
    } catch (err: any) {
      console.error('[ProductDetailModal] sendVoiceMessage error:', err);
      toast({
        title: currentLang === 'ba' ? 'Àṣìṣe' : 'Erreur',
        description: err.message,
        variant: 'destructive'
      });
    } finally {
      setIsSendingMessage(false);
    }
  };

  const statusColors = {
    available: 'bg-green-500',
    reserved: 'bg-orange-500',
    sold: 'bg-red-500'
  };

  const statusLabels = {
    available: { fr: 'Disponible', ba: 'Ó wà' },
    reserved: { fr: 'Réservé', ba: 'Ti yà sọ́tọ̀' },
    sold: { fr: 'Vendu', ba: 'Ti tà' }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg p-0 bg-tamtam-bg overflow-hidden max-h-[90vh] overflow-y-auto">
        {/* Image Gallery */}
        <div className="relative aspect-square bg-tamtam-surface">
          {images.length > 0 ? (
            <>
              <AnimatePresence mode="wait">
                <motion.img
                  key={currentImageIndex}
                  src={images[currentImageIndex]}
                  alt={displayTitle}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="w-full h-full object-cover"
                />
              </AnimatePresence>

              {/* Navigation arrows */}
              {hasMultipleImages && (
                <>
                  <button
                    onClick={prevImage}
                    className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/50 text-white rounded-full flex items-center justify-center"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>
                  <button
                    onClick={nextImage}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/50 text-white rounded-full flex items-center justify-center"
                  >
                    <ChevronRight className="w-6 h-6" />
                  </button>
                </>
              )}

              {/* Image indicators */}
              {hasMultipleImages && (
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2">
                  {images.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentImageIndex(index)}
                      className={`w-2.5 h-2.5 rounded-full transition-all ${
                        index === currentImageIndex 
                          ? 'bg-white scale-125' 
                          : 'bg-white/50'
                      }`}
                    />
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-8xl">{product.emoji_icon || '📦'}</span>
            </div>
          )}

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-10 h-10 bg-black/50 text-white rounded-full flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Status badge */}
          <div className={`absolute top-3 left-3 px-3 py-1 rounded-full ${statusColors[product.status]} text-white text-sm font-medium`}>
            {currentLang === 'ba' ? statusLabels[product.status].ba : statusLabels[product.status].fr}
          </div>
        </div>

        {/* Product Info */}
        <div className="p-5">
          {/* Title and listen */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <h2 className="text-xl font-bold text-tamtam-text flex-1">
              {displayTitle}
            </h2>
            <button
              onClick={handleListen}
              className="w-12 h-12 bg-tamtam-primary text-white rounded-full flex items-center justify-center flex-shrink-0"
            >
              <Volume2 className="w-5 h-5" />
            </button>
          </div>

          {/* Price */}
          <div className="text-2xl font-bold text-tamtam-primary mb-4">
            {product.price?.toLocaleString()} <span className="text-base">{product.currency || 'F CFA'}</span>
          </div>

          {/* Description */}
          {product.description_text && (
            <p className="text-tamtam-text-muted mb-4 leading-relaxed">
              {product.description_text}
            </p>
          )}

          {/* Location */}
          {product.location && (
            <div className="flex items-center gap-2 text-tamtam-text-muted mb-4">
              <MapPin className="w-4 h-4" />
              <span>{product.location}</span>
            </div>
          )}

          {/* Seller phone */}
          {product.seller_phone && (
            <a 
              href={`tel:${product.seller_phone}`}
              className="flex items-center gap-2 text-tamtam-primary mb-4"
            >
              <Phone className="w-4 h-4" />
              <span>{product.seller_phone}</span>
            </a>
          )}

          {/* Voice Message Section */}
          {product.status === 'available' && user && product.seller_id !== user.id && (
            <div className="border-t border-tamtam-surface pt-4 mt-4">
              <h3 className="font-semibold text-tamtam-text mb-3 flex items-center gap-2">
                <Mic className="w-4 h-4" />
                {currentLang === 'ba' ? 'Fi ọ̀rọ̀ ránṣẹ́' : 'Envoyer un message vocal'}
              </h3>

              {isRecordingMessage ? (
                <div className="flex flex-col items-center gap-4 py-4">
                  <p className="text-sm text-tamtam-text-muted text-center">
                    {currentLang === 'ba' 
                      ? 'Sọ ohun tí o fẹ́ sọ fún olùtà' 
                      : 'Dites ce que vous voulez dire au vendeur'}
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
                      <span>{currentLang === 'ba' ? 'Bẹ̀rẹ̀ sí sọ̀rọ̀' : 'Commencer à parler'}</span>
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
