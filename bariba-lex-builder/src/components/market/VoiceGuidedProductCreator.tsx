import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, Check, ChevronRight, Volume2, Keyboard } from 'lucide-react';
import { TamTamMicButton } from '@/components/tamtam/TamTamMicButton';
import { useTamTamLanguage } from '@/contexts/TamTamLanguageContext';
import { useBilingualAudio } from '@/hooks/useBilingualAudio';
import { useMarketProducts, CreateProductInput } from '@/hooks/useMarketProducts';
import { tamtamFeedback } from '@/utils/tamtamFeedback';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { PhotoUploader } from './PhotoUploader';
interface VoiceGuidedProductCreatorProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  prefillData?: Record<string, any>;
}

type Step = 'category' | 'title' | 'price' | 'photos' | 'confirm';

const CATEGORIES = [
  { id: 'food', emoji: '🍅', labelKey: 'product_cat_food' },
  { id: 'livestock', emoji: '🐔', labelKey: 'product_cat_livestock' },
  { id: 'clothing', emoji: '👕', labelKey: 'product_cat_clothing' },
  { id: 'electronics', emoji: '📱', labelKey: 'product_cat_electronics' },
  { id: 'craft', emoji: '🎨', labelKey: 'product_cat_craft' },
  { id: 'agriculture', emoji: '🌾', labelKey: 'product_cat_agriculture' },
  { id: 'transport', emoji: '🚗', labelKey: 'product_cat_transport' },
  { id: 'other', emoji: '📦', labelKey: 'product_cat_other' },
];

export function VoiceGuidedProductCreator({ isOpen, onClose, onComplete, prefillData = {} }: VoiceGuidedProductCreatorProps) {
  const [step, setStep] = useState<Step>('category');
  const [productData, setProductData] = useState<Partial<CreateProductInput>>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [audioDescriptionUrl, setAudioDescriptionUrl] = useState<string | null>(null);
  const [showTextInput, setShowTextInput] = useState(false);
  const [textInputValue, setTextInputValue] = useState('');
  const [voiceError, setVoiceError] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]);
  
  const { currentLang, t } = useTamTamLanguage();
  const { speakCurrentLang } = useBilingualAudio();
  const { createProduct, isCreating } = useMarketProducts();

  useEffect(() => {
    if (isOpen) {
      setVoiceError(false);
      setShowTextInput(false);
      setTextInputValue('');
      
      if (prefillData.category) {
        setProductData(prefillData);
        setStep('title');
        speakCurrentLang(t('product_say_name'));
      } else {
        setStep('category');
        setProductData({});
        speakCurrentLang(t('product_choose_category'));
      }
      setAudioDescriptionUrl(null);
      setPhotos([]);
    }
  }, [isOpen, prefillData, speakCurrentLang, currentLang, t]);

  const announceStep = async (nextStep: Step) => {
    const keys: Record<Step, string> = {
      category: 'product_choose_category',
      title: 'product_say_name',
      price: 'product_say_price',
      photos: 'product_add_photos',
      confirm: 'product_verify_confirm'
    };
    await speakCurrentLang(t(keys[nextStep]));
  };

  const handleCategorySelect = async (category: typeof CATEGORIES[0]) => {
    tamtamFeedback.play('click');
    setProductData(prev => ({ ...prev, category: category.id, emoji_icon: category.emoji }));
    setStep('title');
    setVoiceError(false);
    setShowTextInput(false);
    await announceStep('title');
  };

  const handleVoiceInput = async (result: { audioBase64: string; transcription?: string; sourceLang: 'ba' | 'fr' }) => {
    if (!result.transcription) {
      setVoiceError(true);
      await speakCurrentLang(t('product_not_understood'));
      return;
    }

    setVoiceError(false);
    setIsProcessing(true);
    tamtamFeedback.play('send');

    await processInput(result.transcription, result.audioBase64, result.sourceLang);
  };

  const handleTextSubmit = async () => {
    if (!textInputValue.trim()) return;
    
    setIsProcessing(true);
    tamtamFeedback.play('send');
    
    await processInput(textInputValue.trim(), '', currentLang);
    setTextInputValue('');
    setShowTextInput(false);
  };

  const processInput = async (text: string, audioBase64: string, sourceLang: 'ba' | 'fr') => {
    try {
      if (step === 'title') {
        let audioUrl = null;
        
        if (audioBase64 && audioBase64.length > 100) {
          const audioBlob = new Blob(
            [Uint8Array.from(atob(audioBase64), c => c.charCodeAt(0))],
            { type: 'audio/webm' }
          );
          
          const fileName = `product-${Date.now()}.webm`;
          const { data: uploadData } = await supabase.storage
            .from('tamtam-audio')
            .upload(fileName, audioBlob);

          if (uploadData) {
            const { data: { publicUrl } } = supabase.storage
              .from('tamtam-audio')
              .getPublicUrl(uploadData.path);
            audioUrl = publicUrl;
            setAudioDescriptionUrl(publicUrl);
          }
        }

        setProductData(prev => ({ 
          ...prev, 
          title_fr: text,
          title_ba: sourceLang === 'ba' ? text : undefined,
          description_text: text,
          description_audio_url: audioUrl
        }));
        setStep('price');
        await announceStep('price');
      } else if (step === 'price') {
        const priceMatch = text.match(/\d+/);
        const price = priceMatch ? parseInt(priceMatch[0], 10) : 0;
        
        if (price > 0) {
          setProductData(prev => ({ ...prev, price }));
          setStep('photos');
          await announceStep('photos');
        } else {
          setVoiceError(true);
          await speakCurrentLang(t('product_valid_price'));
        }
      }
    } catch (err) {
      console.error('[VoiceGuidedProductCreator] Error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSkipPhotos = async () => {
    setStep('confirm');
    await announceStep('confirm');
  };

  const handleConfirm = async () => {
    tamtamFeedback.play('send');
    
    const finalProductData = {
      ...productData,
      images: photos.length > 0 ? photos : undefined
    };
    
    const newProduct = await createProduct(finalProductData as CreateProductInput);
    
    if (newProduct) {
      tamtamFeedback.play('success');
      await speakCurrentLang(t('product_published'));
      onComplete();
      onClose();
    }
  };

  const handleBack = () => {
    const steps: Step[] = ['category', 'title', 'price', 'photos', 'confirm'];
    const currentIndex = steps.indexOf(step);
    if (currentIndex > 0) {
      setStep(steps[currentIndex - 1]);
      setVoiceError(false);
      setShowTextInput(false);
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
            {t('product_sell')}
          </h2>
          <button onClick={onClose}>
            <X className="w-6 h-6 text-tamtam-text-muted" />
          </button>
        </div>

        {/* Progress */}
        <div className="px-6 py-3">
          <div className="flex gap-1">
            {['category', 'title', 'price', 'photos', 'confirm'].map((s, i) => (
              <div 
                key={s}
                className={`h-1 flex-1 rounded-full transition-all ${
                  ['category', 'title', 'price', 'photos', 'confirm'].indexOf(step) >= i 
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
            {step === 'category' && (
              <motion.div key="category" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <p className="text-center text-tamtam-text-muted mb-6">
                  {t('product_choose_category_sub')}
                </p>
                <div className="grid grid-cols-4 gap-3">
                  {CATEGORIES.map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => handleCategorySelect(cat)}
                      className="flex flex-col items-center p-4 bg-tamtam-surface rounded-2xl hover:bg-tamtam-primary/10 transition-all active:scale-95"
                    >
                      <span className="text-4xl mb-2">{cat.emoji}</span>
                      <span className="text-xs text-tamtam-text text-center">
                        {t(cat.labelKey)}
                      </span>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {(step === 'title' || step === 'price') && (
              <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="text-center">
                <div className="w-20 h-20 bg-tamtam-surface rounded-full flex items-center justify-center mx-auto mb-6">
                  <span className="text-4xl">{productData.emoji_icon || '📦'}</span>
                </div>

                <p className="text-tamtam-text mb-2 font-medium text-lg">
                  {step === 'title' && t('product_what_selling')}
                  {step === 'price' && t('product_what_price')}
                </p>
                
                {productData.title_fr && step === 'price' && (
                  <p className="text-tamtam-primary font-bold mb-2 text-xl">{productData.title_fr}</p>
                )}

                <p className="text-tamtam-text-muted text-sm mb-6">
                  {t('product_press_speak')}
                </p>

                {!showTextInput && (
                  <div className="flex flex-col items-center gap-4">
                    <TamTamMicButton
                      size="lg"
                      onRecordingComplete={handleVoiceInput}
                      autoTranscribe={true}
                      autoTranslate={false}
                      sourceLang={currentLang}
                      disabled={isProcessing}
                    />
                    
                    {voiceError && (
                      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center gap-2">
                        <p className="text-amber-600 text-sm">
                          {t('product_not_understood_short')}
                        </p>
                        <button
                          onClick={() => setShowTextInput(true)}
                          className="flex items-center gap-2 px-4 py-2 bg-tamtam-surface rounded-full text-sm text-tamtam-text"
                        >
                          <Keyboard className="w-4 h-4" />
                          {t('product_type_text')}
                        </button>
                      </motion.div>
                    )}
                  </div>
                )}

                {showTextInput && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-3">
                    <Input
                      value={textInputValue}
                      onChange={(e) => setTextInputValue(e.target.value)}
                      placeholder={step === 'title' ? t('product_name_placeholder') : t('product_price_placeholder')}
                      className="text-center text-lg"
                      autoFocus
                      onKeyDown={(e) => e.key === 'Enter' && handleTextSubmit()}
                    />
                    <div className="flex gap-2 justify-center">
                      <button
                        onClick={() => { setShowTextInput(false); setTextInputValue(''); }}
                        className="px-4 py-2 bg-tamtam-surface rounded-xl text-tamtam-text-muted"
                      >
                        {t('product_back')}
                      </button>
                      <button
                        onClick={handleTextSubmit}
                        disabled={!textInputValue.trim() || isProcessing}
                        className="px-6 py-2 bg-tamtam-primary text-white rounded-xl flex items-center gap-2 disabled:opacity-50"
                      >
                        <Check className="w-4 h-4" />
                        {t('product_continue')}
                      </button>
                    </div>
                  </motion.div>
                )}

                {isProcessing && (
                  <div className="flex items-center justify-center mt-6 gap-2">
                    <Loader2 className="w-5 h-5 animate-spin text-tamtam-primary" />
                    <span className="text-tamtam-text-muted">{t('product_processing')}</span>
                  </div>
                )}
              </motion.div>
            )}

            {step === 'photos' && (
              <motion.div key="photos" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                <div className="text-center">
                  <div className="w-20 h-20 bg-tamtam-surface rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-4xl">{productData.emoji_icon || '📦'}</span>
                  </div>
                  <p className="text-tamtam-text font-medium">{t('product_add_photos_title')}</p>
                  <p className="text-tamtam-text-muted text-sm">{t('product_photos_optional')}</p>
                </div>

                <PhotoUploader photos={photos} onPhotosChange={setPhotos} maxPhotos={3} />

                <div className="flex gap-3">
                  <button onClick={handleSkipPhotos} className="flex-1 py-3 bg-tamtam-surface text-tamtam-text rounded-xl font-medium">
                    {t('product_skip')}
                  </button>
                  <button
                    onClick={handleSkipPhotos}
                    className="flex-1 py-3 bg-tamtam-primary text-white rounded-xl flex items-center justify-center gap-2 font-medium"
                  >
                    <Check className="w-5 h-5" />
                    {t('product_continue')}
                  </button>
                </div>
              </motion.div>
            )}

            {step === 'confirm' && (
              <motion.div key="confirm" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
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

                  {photos.length > 0 && (
                    <div className="flex gap-2 mt-4">
                      {photos.map((url, index) => (
                        <div key={url} className="w-16 h-16 rounded-lg overflow-hidden">
                          <img src={url} alt={`Photo ${index + 1}`} className="w-full h-full object-cover" />
                        </div>
                      ))}
                    </div>
                  )}

                  {audioDescriptionUrl && (
                    <button 
                      onClick={() => new Audio(audioDescriptionUrl).play()}
                      className="mt-3 flex items-center gap-2 text-tamtam-primary"
                    >
                      <Volume2 className="w-4 h-4" />
                      <span className="text-sm">{t('product_listen_desc')}</span>
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
                      <span>{t('product_confirm')}</span>
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
