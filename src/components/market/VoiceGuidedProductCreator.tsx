import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, Check, ChevronRight, Volume2 } from 'lucide-react';
import { TamTamMicButton } from '@/components/tamtam/TamTamMicButton';
import { useTamTamLanguage } from '@/contexts/TamTamLanguageContext';
import { useBilingualAudio } from '@/hooks/useBilingualAudio';
import { useMarketProducts, CreateProductInput } from '@/hooks/useMarketProducts';
import { tamtamFeedback } from '@/utils/tamtamFeedback';
import { supabase } from '@/integrations/supabase/client';

interface VoiceGuidedProductCreatorProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  prefillData?: Record<string, any>;
}

type Step = 'category' | 'title' | 'price' | 'confirm';

const CATEGORIES = [
  { id: 'food', emoji: '🍅', labelFr: 'Alimentation', labelBa: 'Oúnjẹ' },
  { id: 'livestock', emoji: '🐔', labelFr: 'Élevage', labelBa: 'Ẹranko' },
  { id: 'clothing', emoji: '👕', labelFr: 'Vêtements', labelBa: 'Aṣọ' },
  { id: 'electronics', emoji: '📱', labelFr: 'Électronique', labelBa: 'Ẹ̀rọ' },
  { id: 'craft', emoji: '🎨', labelFr: 'Artisanat', labelBa: 'Iṣẹ́ ọwọ́' },
  { id: 'agriculture', emoji: '🌾', labelFr: 'Agriculture', labelBa: 'Àgbẹ̀' },
  { id: 'transport', emoji: '🚗', labelFr: 'Transport', labelBa: 'Ọkọ̀' },
  { id: 'other', emoji: '📦', labelFr: 'Autre', labelBa: 'Mìíràn' },
];

export function VoiceGuidedProductCreator({ isOpen, onClose, onComplete, prefillData = {} }: VoiceGuidedProductCreatorProps) {
  const [step, setStep] = useState<Step>('category');
  const [productData, setProductData] = useState<Partial<CreateProductInput>>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [audioDescriptionUrl, setAudioDescriptionUrl] = useState<string | null>(null);
  
  const { currentLang } = useTamTamLanguage();
  const { speakCurrentLang } = useBilingualAudio();
  const { createProduct, isCreating } = useMarketProducts();

  useEffect(() => {
    if (isOpen) {
      // Check for prefill data
      if (prefillData.category) {
        setProductData(prefillData);
        setStep('title');
        speakCurrentLang(currentLang === 'ba' ? 'Sọ orúkọ ọjà rẹ' : 'Dites le nom de votre produit');
      } else {
        setStep('category');
        setProductData({});
        speakCurrentLang(currentLang === 'ba' ? 'Ẹ yan irú ọjà náà' : 'Choisissez la catégorie');
      }
      setAudioDescriptionUrl(null);
    }
  }, [isOpen, prefillData, speakCurrentLang, currentLang]);

  const announceStep = async (nextStep: Step) => {
    const announcements: Record<Step, { fr: string; ba: string }> = {
      category: { fr: 'Choisissez une catégorie', ba: 'Yan ẹ̀ka kan' },
      title: { fr: 'Dites le nom de votre produit', ba: 'Sọ orúkọ ọjà rẹ' },
      price: { fr: 'Dites le prix en francs', ba: 'Sọ iye owó ọjà náà' },
      confirm: { fr: 'Vérifiez et confirmez', ba: 'Jẹ́rìísí ọjà rẹ' }
    };
    
    await speakCurrentLang(currentLang === 'ba' ? announcements[nextStep].ba : announcements[nextStep].fr);
  };

  const handleCategorySelect = async (category: typeof CATEGORIES[0]) => {
    tamtamFeedback.play('click');
    setProductData(prev => ({ ...prev, category: category.id, emoji_icon: category.emoji }));
    setStep('title');
    await announceStep('title');
  };

  const handleVoiceInput = async (result: { audioBase64: string; transcription?: string; sourceLang: 'ba' | 'fr' }) => {
    if (!result.transcription) {
      await speakCurrentLang(currentLang === 'ba' ? 'Mo kò gbọ́. Tún gbìyànjú' : 'Je n\'ai pas compris. Réessayez.');
      return;
    }

    setIsProcessing(true);
    tamtamFeedback.play('send');

    try {
      if (step === 'title') {
        // Upload audio for the title/description
        const audioBlob = new Blob(
          [Uint8Array.from(atob(result.audioBase64), c => c.charCodeAt(0))],
          { type: 'audio/webm' }
        );
        
        const fileName = `product-${Date.now()}.webm`;
        const { data: uploadData } = await supabase.storage
          .from('tamtam-audio')
          .upload(fileName, audioBlob);

        let audioUrl = null;
        if (uploadData) {
          const { data: { publicUrl } } = supabase.storage
            .from('tamtam-audio')
            .getPublicUrl(uploadData.path);
          audioUrl = publicUrl;
          setAudioDescriptionUrl(publicUrl);
        }

        setProductData(prev => ({ 
          ...prev, 
          title_fr: result.transcription,
          title_ba: result.sourceLang === 'ba' ? result.transcription : undefined,
          description_text: result.transcription,
          description_audio_url: audioUrl
        }));
        setStep('price');
        await announceStep('price');
      } else if (step === 'price') {
        // Extract number from speech
        const priceMatch = result.transcription.match(/\d+/);
        const price = priceMatch ? parseInt(priceMatch[0], 10) : 0;
        
        if (price > 0) {
          setProductData(prev => ({ ...prev, price }));
          setStep('confirm');
          await announceStep('confirm');
        } else {
          await speakCurrentLang(
            currentLang === 'ba' 
              ? 'Jọ̀wọ́ sọ iye owó tó yẹ' 
              : 'Veuillez donner un prix valide'
          );
        }
      }
    } catch (err) {
      console.error('[VoiceGuidedProductCreator] Error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirm = async () => {
    tamtamFeedback.play('send');
    
    const newProduct = await createProduct(productData as CreateProductInput);
    
    if (newProduct) {
      tamtamFeedback.play('success');
      await speakCurrentLang(
        currentLang === 'ba' 
          ? 'Ó dára! Ọjà rẹ ti jẹ́ títẹ̀jáde' 
          : 'Parfait ! Votre produit est en ligne'
      );
      onComplete();
      onClose();
    }
  };

  const handleBack = () => {
    const steps: Step[] = ['category', 'title', 'price', 'confirm'];
    const currentIndex = steps.indexOf(step);
    if (currentIndex > 0) {
      setStep(steps[currentIndex - 1]);
    }
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        onClick={e => e.stopPropagation()}
        className="bg-tamtam-bg w-full max-w-lg rounded-t-3xl max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="sticky top-0 bg-tamtam-bg px-6 py-4 border-b border-tamtam-border flex items-center justify-between">
          <button onClick={handleBack} className="text-tamtam-text-muted" disabled={step === 'category'}>
            {step !== 'category' && <ChevronRight className="w-6 h-6 rotate-180" />}
          </button>
          <h2 className="text-lg font-bold text-tamtam-text">
            {currentLang === 'ba' ? 'Ṣẹ̀dá ọjà' : 'Vendre un produit'}
          </h2>
          <button onClick={onClose}>
            <X className="w-6 h-6 text-tamtam-text-muted" />
          </button>
        </div>

        {/* Progress */}
        <div className="px-6 py-3">
          <div className="flex gap-1">
            {['category', 'title', 'price', 'confirm'].map((s, i) => (
              <div 
                key={s}
                className={`h-1 flex-1 rounded-full transition-all ${
                  ['category', 'title', 'price', 'confirm'].indexOf(step) >= i 
                    ? 'bg-tamtam-primary' 
                    : 'bg-tamtam-border'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <AnimatePresence mode="wait">
            {/* Category selection */}
            {step === 'category' && (
              <motion.div
                key="category"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <p className="text-center text-tamtam-text-muted mb-6">
                  {currentLang === 'ba' ? 'Yan ẹ̀ka ọjà rẹ' : 'Choisissez une catégorie'}
                </p>
                <div className="grid grid-cols-4 gap-3">
                  {CATEGORIES.map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => handleCategorySelect(cat)}
                      className="flex flex-col items-center p-4 bg-tamtam-surface rounded-2xl hover:bg-tamtam-primary/10 transition-all"
                    >
                      <span className="text-4xl mb-2">{cat.emoji}</span>
                      <span className="text-xs text-tamtam-text text-center">
                        {currentLang === 'ba' ? cat.labelBa : cat.labelFr}
                      </span>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Voice input steps */}
            {(step === 'title' || step === 'price') && (
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="text-center"
              >
                <div className="w-20 h-20 bg-tamtam-surface rounded-full flex items-center justify-center mx-auto mb-6">
                  <span className="text-4xl">{productData.emoji_icon || '📦'}</span>
                </div>

                <p className="text-tamtam-text mb-2 font-medium text-lg">
                  {step === 'title' && (currentLang === 'ba' ? 'Kíni o ń tà?' : 'Que vendez-vous ?')}
                  {step === 'price' && (currentLang === 'ba' ? 'Iye owó?' : 'Quel prix ?')}
                </p>
                
                {productData.title_fr && step === 'price' && (
                  <p className="text-tamtam-primary font-bold mb-2 text-xl">{productData.title_fr}</p>
                )}

                <p className="text-tamtam-text-muted text-sm mb-8">
                  {currentLang === 'ba' ? 'Tẹ bọ́tìnì náà, kí o sì sọ̀rọ̀' : 'Appuyez et parlez'}
                </p>

                <div className="flex justify-center">
                  <TamTamMicButton
                    size="lg"
                    onRecordingComplete={handleVoiceInput}
                    autoTranscribe={true}
                    autoTranslate={false}
                    sourceLang={currentLang}
                    disabled={isProcessing}
                  />
                </div>

                {isProcessing && (
                  <div className="flex items-center justify-center mt-6 gap-2">
                    <Loader2 className="w-5 h-5 animate-spin text-tamtam-primary" />
                    <span className="text-tamtam-text-muted">
                      {currentLang === 'ba' ? 'Ń ṣiṣẹ́...' : 'Traitement...'}
                    </span>
                  </div>
                )}
              </motion.div>
            )}

            {/* Confirmation */}
            {step === 'confirm' && (
              <motion.div
                key="confirm"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <div className="bg-tamtam-surface rounded-3xl p-6 mb-6">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-16 h-16 bg-tamtam-bg rounded-2xl flex items-center justify-center">
                      <span className="text-4xl">{productData.emoji_icon || '📦'}</span>
                    </div>
                    <div>
                      <h3 className="font-bold text-tamtam-text text-lg">{productData.title_fr}</h3>
                      <p className="text-2xl font-bold text-tamtam-primary">{productData.price} F</p>
                    </div>
                  </div>

                  {productData.description_text && (
                    <p className="text-tamtam-text-muted text-sm">{productData.description_text}</p>
                  )}

                  {audioDescriptionUrl && (
                    <button 
                      onClick={() => new Audio(audioDescriptionUrl).play()}
                      className="mt-3 flex items-center gap-2 text-tamtam-primary"
                    >
                      <Volume2 className="w-4 h-4" />
                      <span className="text-sm">{currentLang === 'ba' ? 'Gbọ́ àpèjúwe' : 'Écouter la description'}</span>
                    </button>
                  )}
                </div>

                <button
                  onClick={handleConfirm}
                  disabled={isCreating}
                  className="w-full py-4 bg-tamtam-primary text-white rounded-2xl flex items-center justify-center gap-3 font-medium text-lg"
                >
                  {isCreating ? (
                    <Loader2 className="w-6 h-6 animate-spin" />
                  ) : (
                    <>
                      <Check className="w-6 h-6" />
                      <span>{currentLang === 'ba' ? 'Jẹ́rìísí' : 'Confirmer'}</span>
                    </>
                  )}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
}
