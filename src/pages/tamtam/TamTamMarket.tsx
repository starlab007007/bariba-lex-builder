import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TamTamMicButton } from '@/components/tamtam/TamTamMicButton';
import { Volume2, Loader2, Plus } from 'lucide-react';
import { useTamTamLanguage } from '@/contexts/TamTamLanguageContext';
import { useAudioDescription } from '@/contexts/AudioDescriptionContext';
import { useBilingualAudio } from '@/hooks/useBilingualAudio';
import { BilingualText } from '@/components/tamtam/BilingualText';
import { tamtamFeedback } from '@/utils/tamtamFeedback';
import { useToast } from '@/hooks/use-toast';

const tabs = [
  { icon: '🛒', id: 'shop', labelKey: 'shop' },
  { icon: '💼', id: 'jobs', labelKey: 'jobs' },
];

const mockProducts = [
  { id: 1, image: '🍅', price: '500', seller: '👨🏾', nameFr: 'Tomates fraîches', nameBa: 'Tòmátì tútù' },
  { id: 2, image: '🐔', price: '3000', seller: '👩🏾', nameFr: 'Poulet local', nameBa: 'Adìẹ àdúgbò' },
  { id: 3, image: '🌽', price: '200', seller: '👴🏾', nameFr: 'Maïs frais', nameBa: 'Àgbàdo tútù' },
  { id: 4, image: '🥭', price: '800', seller: '👧🏾', nameFr: 'Mangues mûres', nameBa: 'Mángòrò pọ́n' },
  { id: 5, image: '🐟', price: '1500', seller: '👨🏾', nameFr: 'Poisson fumé', nameBa: 'Ẹja sísun' },
  { id: 6, image: '🍌', price: '300', seller: '👩🏾', nameFr: 'Bananes', nameBa: 'Ọ̀gẹ̀dẹ̀' },
];

const mockJobs = [
  { id: 1, icon: '🚜', company: '👨🏾', applicants: 12, titleFr: 'Conducteur tracteur', titleBa: 'Awakọ̀ ẹ̀rọ àgbẹ̀' },
  { id: 2, icon: '🏗️', company: '👩🏾', applicants: 8, titleFr: 'Maçon', titleBa: 'Gbíyànjú' },
  { id: 3, icon: '🚗', company: '👴🏾', applicants: 25, titleFr: 'Chauffeur', titleBa: 'Awakọ̀' },
  { id: 4, icon: '📦', company: '👧🏾', applicants: 5, titleFr: 'Livreur', titleBa: 'Olùfìránṣẹ́' },
];

export default function TamTamMarket() {
  const [activeTab, setActiveTab] = useState('shop');
  const [isCreatingListing, setIsCreatingListing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [playingId, setPlayingId] = useState<number | null>(null);
  const { t, currentLang } = useTamTamLanguage();
  const { announceAction } = useAudioDescription();
  const { speakCurrentLang } = useBilingualAudio();
  const { toast } = useToast();

  useEffect(() => {
    announceAction(t('screenMarket'));
  }, [announceAction, t]);

  const handleTabChange = (tabId: string, labelKey: string) => {
    tamtamFeedback.play('click');
    speakCurrentLang(t(labelKey));
    setActiveTab(tabId);
  };

  const handleListen = (id: number, textFr: string, textBa: string) => {
    tamtamFeedback.play('click');
    setPlayingId(playingId === id ? null : id);
    
    const text = currentLang === 'fr' ? textFr : textBa;
    speakCurrentLang(text);
    
    if (playingId !== id) {
      setTimeout(() => setPlayingId(null), 3000);
    }
  };

  const handleApply = async (jobTitle: string) => {
    tamtamFeedback.play('click');
    await speakCurrentLang(t('apply') + ': ' + jobTitle);
    toast({
      title: "🎤 Candidature vocale",
      description: "Enregistrez votre candidature vocale"
    });
  };

  const handleVoiceSearch = async (result: {
    audioBase64: string;
    transcription?: string;
    translation?: string;
    sourceLang: 'ba' | 'fr';
  }) => {
    if (!result.transcription) {
      toast({
        title: "Erreur",
        description: "Impossible de transcrire l'audio",
        variant: "destructive"
      });
      return;
    }
    
    setIsProcessing(true);
    tamtamFeedback.play('send');
    
    try {
      // Announce what was heard
      await speakCurrentLang(
        currentLang === 'ba' 
          ? `Mo gbọ́: ${result.transcription}. Mo ń wá...`
          : `J'ai entendu: ${result.transcription}. Je recherche...`
      );
      
      toast({
        title: "🔍 Recherche vocale",
        description: result.transcription
      });
      
      tamtamFeedback.play('success');
    } catch (err: any) {
      console.error('[TamTamMarket] Voice search error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCreateListing = async (result: {
    audioBase64: string;
    transcription?: string;
    translation?: string;
    sourceLang: 'ba' | 'fr';
  }) => {
    if (!result.transcription) {
      toast({
        title: "Erreur",
        description: "Décrivez votre produit vocalement",
        variant: "destructive"
      });
      return;
    }
    
    setIsProcessing(true);
    
    try {
      toast({
        title: "✅ Annonce créée",
        description: result.transcription
      });
      
      await speakCurrentLang(
        currentLang === 'ba'
          ? "Ó dára! Ìpolówó rẹ ti jẹ́ títẹ̀jáde"
          : "Parfait ! Votre annonce a été publiée"
      );
      
      setIsCreatingListing(false);
      tamtamFeedback.play('success');
    } catch (err: any) {
      console.error('[TamTamMarket] Create listing error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-tamtam-bg px-4 pb-32">
      {/* Title */}
      <div className="text-center mb-4">
        <h1 className="text-xl font-bold text-tamtam-text">{t('market')}</h1>
      </div>

      {/* Tab bar with labels */}
      <div className="flex justify-center gap-4 mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id, tab.labelKey)}
            className={`px-6 py-3 rounded-2xl flex items-center gap-2 text-lg transition-all ${
              activeTab === tab.id
                ? 'bg-tamtam-primary text-white shadow-tamtam-soft'
                : 'bg-tamtam-surface text-tamtam-text-muted'
            }`}
          >
            <span className="text-2xl">{tab.icon}</span>
            <span className="font-medium">{t(tab.labelKey)}</span>
          </button>
        ))}
      </div>

      {/* Create Listing Modal */}
      <AnimatePresence>
        {isCreatingListing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setIsCreatingListing(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="bg-tamtam-surface rounded-3xl p-6 w-full max-w-sm"
            >
              <h3 className="text-lg font-bold text-tamtam-text text-center mb-4">
                {activeTab === 'shop' ? '📦 Nouvelle annonce' : '💼 Offre d\'emploi'}
              </h3>
              <p className="text-tamtam-text-muted text-center mb-6">
                {t('describeVocally')}
              </p>
              <div className="flex justify-center">
                <TamTamMicButton
                  size="lg"
                  onRecordingComplete={handleCreateListing}
                  autoTranscribe={true}
                  autoTranslate={true}
                  sourceLang={currentLang}
                  disabled={isProcessing}
                />
              </div>
              {isProcessing && (
                <div className="flex items-center justify-center mt-4 gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-tamtam-primary" />
                  <span className="text-sm text-tamtam-text-muted">{t('processing')}</span>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {activeTab === 'shop' && (
          <motion.div
            key="shop"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
          >
            {/* Products grid */}
            <div className="grid grid-cols-2 gap-4">
              {mockProducts.map((product, index) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-tamtam-surface rounded-3xl p-4 shadow-tamtam-soft"
                >
                  {/* Product image */}
                  <div className="aspect-square bg-tamtam-bg rounded-2xl flex items-center justify-center mb-3">
                    <span className="text-6xl">{product.image}</span>
                  </div>

                  {/* Product name - bilingual */}
                  <BilingualText
                    textFr={product.nameFr}
                    textBa={product.nameBa}
                    size="sm"
                    showToggle={true}
                    showAudio={false}
                    className="mb-2"
                  />

                  {/* Price */}
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xl font-bold text-tamtam-text">
                      {product.price} <span className="text-sm">F</span>
                    </span>
                    <span className="text-2xl">{product.seller}</span>
                  </div>

                  {/* Listen button */}
                  <button
                    onClick={() => handleListen(product.id, product.nameFr, product.nameBa)}
                    className={`w-full py-3 rounded-2xl flex items-center justify-center gap-2 transition-all ${
                      playingId === product.id
                        ? 'bg-tamtam-primary text-white'
                        : 'bg-tamtam-bg'
                    }`}
                  >
                    <Volume2 className="w-5 h-5" />
                    {playingId === product.id && (
                      <div className="flex gap-1">
                        {[...Array(4)].map((_, i) => (
                          <motion.div
                            key={i}
                            animate={{ height: [4, 16, 4] }}
                            transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.1 }}
                            className="w-1 bg-white rounded-full"
                          />
                        ))}
                      </div>
                    )}
                  </button>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {activeTab === 'jobs' && (
          <motion.div
            key="jobs"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-4"
          >
            {mockJobs.map((job, index) => (
              <motion.div
                key={job.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-tamtam-surface rounded-3xl p-5 shadow-tamtam-soft"
              >
                <div className="flex items-center gap-4">
                  {/* Job icon */}
                  <div className="w-16 h-16 bg-orange-100 rounded-2xl flex items-center justify-center">
                    <span className="text-4xl">{job.icon}</span>
                  </div>

                  {/* Info */}
                  <div className="flex-1">
                    {/* Job title - bilingual */}
                    <BilingualText
                      textFr={job.titleFr}
                      textBa={job.titleBa}
                      size="md"
                      showToggle={true}
                      showAudio={false}
                      className="mb-1"
                    />
                    <div className="flex items-center gap-2 text-tamtam-text-muted">
                      <span>👥</span>
                      <span>{job.applicants} {t('applicants')}</span>
                    </div>
                  </div>

                  {/* Listen button */}
                  <button
                    onClick={() => handleListen(job.id + 100, job.titleFr, job.titleBa)}
                    className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${
                      playingId === job.id + 100
                        ? 'bg-tamtam-primary text-white'
                        : 'bg-tamtam-bg'
                    }`}
                  >
                    <Volume2 className="w-6 h-6" />
                  </button>
                </div>

                {/* Apply with voice */}
                <button 
                  onClick={() => handleApply(job.titleFr)}
                  className="w-full mt-4 py-4 bg-orange-500 text-white rounded-2xl flex items-center justify-center gap-2"
                >
                  <span className="text-2xl">🎙️</span>
                  <span className="font-medium">{t('apply')}</span>
                </button>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating mic for voice search or creating listing */}
      <div className="fixed bottom-28 right-4 flex flex-col items-center gap-3">
        {/* Create button */}
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => {
            tamtamFeedback.play('click');
            setIsCreatingListing(true);
          }}
          className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center shadow-lg"
        >
          <Plus className="w-6 h-6 text-white" />
        </motion.button>
        
        {/* Voice search mic */}
        <TamTamMicButton
          size="md"
          onRecordingComplete={handleVoiceSearch}
          autoTranscribe={true}
          autoTranslate={true}
          sourceLang={currentLang}
          disabled={isProcessing}
        />
      </div>
    </div>
  );
}
