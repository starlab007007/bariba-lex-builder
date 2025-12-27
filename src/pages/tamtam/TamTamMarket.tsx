import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, ShoppingCart, Package, Briefcase, HandHelping, Volume2 } from 'lucide-react';
import { useTamTamLanguage } from '@/contexts/TamTamLanguageContext';
import { useAudioDescription } from '@/contexts/AudioDescriptionContext';
import { useBilingualAudio } from '@/hooks/useBilingualAudio';
import { useMarketProducts } from '@/hooks/useMarketProducts';
import { useMarketJobs, MarketJob } from '@/hooks/useMarketJobs';
import { useAuth } from '@/contexts/AuthContext';
import { TamTamMicButton } from '@/components/tamtam/TamTamMicButton';
import { MarketProductCard } from '@/components/market/MarketProductCard';
import { MarketJobCard } from '@/components/market/MarketJobCard';
import { MarketSellerSpace } from '@/components/market/MarketSellerSpace';
import { MarketQuickTemplates, QuickTemplate } from '@/components/market/MarketQuickTemplates';
import { VoiceButton } from '@/components/market/VoiceButton';
import { VoiceGuidedProductCreator } from '@/components/market/VoiceGuidedProductCreator';
import { VoiceGuidedJobCreator } from '@/components/market/VoiceGuidedJobCreator';
import { tamtamFeedback } from '@/utils/tamtamFeedback';
import { useToast } from '@/hooks/use-toast';

type MainView = 'home' | 'buy' | 'sell' | 'work' | 'hire' | 'my-shop' | 'my-jobs';

export default function TamTamMarket() {
  const [view, setView] = useState<MainView>('home');
  const [isCreatingProduct, setIsCreatingProduct] = useState(false);
  const [isCreatingJob, setIsCreatingJob] = useState(false);
  const [jobCreatorType, setJobCreatorType] = useState<'offer' | 'demand'>('offer');
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [prefillData, setPrefillData] = useState<Record<string, any>>({});

  const { t, currentLang } = useTamTamLanguage();
  const { announceAction } = useAudioDescription();
  const { speakCurrentLang } = useBilingualAudio();
  const { user } = useAuth();
  const { toast } = useToast();

  const { products, myProducts, isLoading: productsLoading, fetchProducts, fetchMyProducts, searchProducts } = useMarketProducts();
  const { offers, demands, myJobs, isLoading: jobsLoading, fetchOffers, fetchDemands, fetchMyJobs, applyToJob } = useMarketJobs();

  useEffect(() => {
    announceAction(currentLang === 'ba' ? 'Ọjà' : 'Marché');
  }, [announceAction, currentLang]);

  useEffect(() => {
    if (view === 'buy') fetchProducts();
    else if (view === 'my-shop') fetchMyProducts();
    else if (view === 'work') fetchOffers();
    else if (view === 'hire') fetchDemands();
    else if (view === 'my-jobs') fetchMyJobs();
  }, [view, fetchProducts, fetchMyProducts, fetchOffers, fetchDemands, fetchMyJobs]);

  const handleMainAction = async (action: MainView) => {
    tamtamFeedback.play('click');
    setView(action);
    
    const labels = {
      home: { fr: 'Accueil', ba: 'Ilé' },
      buy: { fr: 'Acheter', ba: 'Ra' },
      sell: { fr: 'Vendre', ba: 'Ta' },
      work: { fr: 'Trouver du travail', ba: 'Wá iṣẹ́' },
      hire: { fr: 'Embaucher', ba: 'Gbà láti ṣiṣẹ́' },
      'my-shop': { fr: 'Ma boutique', ba: 'Ọjà mi' },
      'my-jobs': { fr: 'Mes annonces', ba: 'Àwọn ìpolówó mi' }
    };
    
    await speakCurrentLang(currentLang === 'ba' ? labels[action].ba : labels[action].fr);
  };

  const handleTemplateSelect = (template: QuickTemplate) => {
    setPrefillData(template.prefillData);
    
    if (template.type === 'product') {
      setIsCreatingProduct(true);
    } else {
      setJobCreatorType(template.type === 'job_offer' ? 'offer' : 'demand');
      setIsCreatingJob(true);
    }
  };

  const handleApplyToJob = async (job: MarketJob) => {
    tamtamFeedback.play('click');
    await speakCurrentLang(currentLang === 'ba' ? 'Fọwọ́sí iṣẹ́ yìí' : 'Postuler à cette offre');
    const success = await applyToJob(job.id);
    if (success) tamtamFeedback.play('success');
  };

  const handleVoiceSearch = async (result: { transcription?: string }) => {
    if (!result.transcription) return;
    tamtamFeedback.play('send');
    
    if (view === 'buy') {
      const results = await searchProducts(result.transcription);
      toast({ title: `${results.length} ${currentLang === 'ba' ? 'èsì' : 'résultats'}` });
    }
    
    await speakCurrentLang(currentLang === 'ba' ? `Mo rí ${result.transcription}` : `Recherche: ${result.transcription}`);
  };

  const isLoading = view === 'buy' || view === 'my-shop' ? productsLoading : jobsLoading;

  // Main action buttons with audio
  const mainActions = [
    { 
      id: 'buy' as MainView, 
      icon: ShoppingCart, 
      emoji: '🛒', 
      labelFr: 'Acheter', 
      labelBa: 'Ra',
      descFr: 'Voir les produits à vendre',
      descBa: 'Wo àwọn ọjà tí wọ́n ń tà',
      color: 'bg-blue-500'
    },
    { 
      id: 'sell' as MainView, 
      icon: Package, 
      emoji: '📦', 
      labelFr: 'Vendre', 
      labelBa: 'Ta',
      descFr: 'Mettre un produit en vente',
      descBa: 'Fi ọjà sílẹ̀ fún títà',
      color: 'bg-green-500'
    },
    { 
      id: 'work' as MainView, 
      icon: Briefcase, 
      emoji: '💼', 
      labelFr: 'Travailler', 
      labelBa: 'Ṣiṣẹ́',
      descFr: 'Trouver du travail',
      descBa: 'Wá iṣẹ́ láti ṣe',
      color: 'bg-purple-500'
    },
    { 
      id: 'hire' as MainView, 
      icon: HandHelping, 
      emoji: '🙋', 
      labelFr: 'Embaucher', 
      labelBa: 'Gbà ẹni',
      descFr: 'Trouver quelqu\'un pour travailler',
      descBa: 'Wá ẹnìkan fún iṣẹ́',
      color: 'bg-orange-500'
    },
  ];

  return (
    <div className="min-h-screen bg-tamtam-bg px-4 pb-32">
      {/* Header with global audio help */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-tamtam-text">
          {currentLang === 'ba' ? 'Ọjà' : 'Marché'}
        </h1>
        <VoiceButton 
          textFr="Bienvenue au marché. Appuyez sur les icônes pour acheter, vendre, trouver du travail ou embaucher quelqu'un."
          textBa="Ẹ káàbọ̀ sí ọjà. Tẹ àwọn àmì láti ra, tà, wá iṣẹ́ tàbí gbà ẹnìkan fún iṣẹ́."
          variant="full"
          showLabel
          size="md"
        />
      </div>

      <AnimatePresence mode="wait">
        {/* HOME VIEW - Main 4 buttons */}
        {view === 'home' && (
          <motion.div
            key="home"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            {/* Main action grid */}
            <div className="grid grid-cols-2 gap-4 mb-8">
              {mainActions.map((action, index) => (
                <motion.button
                  key={action.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.1 }}
                  onClick={() => handleMainAction(action.id)}
                  className="relative bg-tamtam-surface rounded-3xl p-6 flex flex-col items-center gap-3 hover:shadow-lg transition-all group"
                >
                  <div className={`w-16 h-16 ${action.color} rounded-2xl flex items-center justify-center`}>
                    <span className="text-4xl">{action.emoji}</span>
                  </div>
                  <span className="font-bold text-tamtam-text text-lg">
                    {currentLang === 'ba' ? action.labelBa : action.labelFr}
                  </span>
                  
                  {/* Audio button */}
                  <div className="absolute top-2 right-2">
                    <VoiceButton 
                      textFr={action.descFr}
                      textBa={action.descBa}
                      size="sm"
                    />
                  </div>
                </motion.button>
              ))}
            </div>

            {/* Quick access */}
            <div className="flex gap-3 mb-6">
              <button
                onClick={() => handleMainAction('my-shop')}
                className="flex-1 py-3 px-4 bg-tamtam-surface rounded-xl flex items-center justify-center gap-2 text-tamtam-text-muted"
              >
                <span>👤</span>
                <span className="text-sm">{currentLang === 'ba' ? 'Ti mi' : 'Ma Boutique'}</span>
              </button>
              <button
                onClick={() => handleMainAction('my-jobs')}
                className="flex-1 py-3 px-4 bg-tamtam-surface rounded-xl flex items-center justify-center gap-2 text-tamtam-text-muted"
              >
                <span>📋</span>
                <span className="text-sm">{currentLang === 'ba' ? 'Àwọn mi' : 'Mes Annonces'}</span>
              </button>
            </div>

            {/* Voice search */}
            <div className="flex justify-center">
              <TamTamMicButton 
                size="lg" 
                onRecordingComplete={handleVoiceSearch} 
                autoTranscribe 
                sourceLang={currentLang} 
              />
            </div>
          </motion.div>
        )}

        {/* SELL VIEW - Templates for products */}
        {view === 'sell' && (
          <motion.div
            key="sell"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <button 
              onClick={() => setView('home')} 
              className="mb-4 text-tamtam-primary flex items-center gap-2"
            >
              ← {currentLang === 'ba' ? 'Padà' : 'Retour'}
            </button>
            
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-tamtam-text">
                {currentLang === 'ba' ? 'Kíni o fẹ́ tà?' : 'Que voulez-vous vendre ?'}
              </h2>
              <VoiceButton 
                textFr="Choisissez ce que vous voulez vendre, ou appuyez sur le micro pour décrire votre produit."
                textBa="Yan ohun tí o fẹ́ tà, tàbí tẹ bọ́tìnì àfọnà láti ṣàpèjúwe ọjà rẹ."
                size="md"
              />
            </div>
            
            <MarketQuickTemplates type="product" onSelect={handleTemplateSelect} />
            
            <div className="mt-6 flex justify-center">
              <TamTamMicButton 
                size="lg" 
                onRecordingComplete={() => setIsCreatingProduct(true)} 
                autoTranscribe 
                sourceLang={currentLang} 
              />
            </div>
          </motion.div>
        )}

        {/* BUY VIEW - Products list */}
        {view === 'buy' && (
          <motion.div
            key="buy"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <button 
              onClick={() => setView('home')} 
              className="mb-4 text-tamtam-primary flex items-center gap-2"
            >
              ← {currentLang === 'ba' ? 'Padà' : 'Retour'}
            </button>

            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-tamtam-primary" />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {products.map(product => (
                  <MarketProductCard
                    key={product.id}
                    product={product}
                    isPlaying={playingId === product.id}
                    onPlayToggle={() => setPlayingId(playingId === product.id ? null : product.id)}
                    onContact={() => toast({ title: '📞', description: product.seller_phone || 'Contact vendeur' })}
                  />
                ))}
                {products.length === 0 && (
                  <div className="col-span-2 text-center py-12 text-tamtam-text-muted">
                    {currentLang === 'ba' ? 'Kò sí ọjà' : 'Aucun produit'}
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}

        {/* WORK VIEW - Job offers + Templates to create demand */}
        {view === 'work' && (
          <motion.div
            key="work"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <button 
              onClick={() => setView('home')} 
              className="mb-4 text-tamtam-primary flex items-center gap-2"
            >
              ← {currentLang === 'ba' ? 'Padà' : 'Retour'}
            </button>

            {/* Quick create demand */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-tamtam-text">
                  {currentLang === 'ba' ? 'Sọ pé o wà' : 'Signaler votre disponibilité'}
                </h3>
                <VoiceButton 
                  textFr="Dites aux employeurs que vous êtes disponible pour travailler"
                  textBa="Sọ fún àwọn olówó iṣẹ́ pé o wà fún iṣẹ́"
                  size="sm"
                />
              </div>
              <MarketQuickTemplates type="job_demand" onSelect={handleTemplateSelect} />
            </div>

            {/* Job offers list */}
            <h3 className="font-bold text-tamtam-text mb-3">
              {currentLang === 'ba' ? 'Àwọn iṣẹ́ tó wà' : 'Offres d\'emploi'}
            </h3>

            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-tamtam-primary" />
              </div>
            ) : (
              <div className="space-y-4">
                {offers.map(job => (
                  <MarketJobCard 
                    key={job.id} 
                    job={job} 
                    onApply={handleApplyToJob} 
                    isPlaying={playingId === job.id} 
                    onPlayToggle={() => setPlayingId(playingId === job.id ? null : job.id)} 
                  />
                ))}
                {offers.length === 0 && (
                  <div className="text-center py-12 text-tamtam-text-muted">
                    {currentLang === 'ba' ? 'Kò sí iṣẹ́' : 'Aucune offre'}
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}

        {/* HIRE VIEW - Job demands + Templates to create offer */}
        {view === 'hire' && (
          <motion.div
            key="hire"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <button 
              onClick={() => setView('home')} 
              className="mb-4 text-tamtam-primary flex items-center gap-2"
            >
              ← {currentLang === 'ba' ? 'Padà' : 'Retour'}
            </button>

            {/* Quick create offer */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-tamtam-text">
                  {currentLang === 'ba' ? 'Ṣẹ̀dá ìpolówó' : 'Créer une offre'}
                </h3>
                <VoiceButton 
                  textFr="Publiez une offre d'emploi pour trouver quelqu'un"
                  textBa="Fi ìpolówó sílẹ̀ láti wá ẹnìkan"
                  size="sm"
                />
              </div>
              <MarketQuickTemplates type="job_offer" onSelect={handleTemplateSelect} />
            </div>

            {/* People looking for work */}
            <h3 className="font-bold text-tamtam-text mb-3">
              {currentLang === 'ba' ? 'Àwọn tó ń wá iṣẹ́' : 'Personnes disponibles'}
            </h3>

            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-tamtam-primary" />
              </div>
            ) : (
              <div className="space-y-4">
                {demands.map(job => (
                  <MarketJobCard 
                    key={job.id} 
                    job={job} 
                    showApplyButton={false}
                    onContact={() => toast({ title: '📞', description: job.contact_phone || 'Contact' })}
                    isPlaying={playingId === job.id} 
                    onPlayToggle={() => setPlayingId(playingId === job.id ? null : job.id)} 
                  />
                ))}
                {demands.length === 0 && (
                  <div className="text-center py-12 text-tamtam-text-muted">
                    {currentLang === 'ba' ? 'Kò sí ẹnìkan' : 'Personne disponible'}
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}

        {/* MY SHOP VIEW */}
        {view === 'my-shop' && (
          <motion.div
            key="my-shop"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <button 
              onClick={() => setView('home')} 
              className="mb-4 text-tamtam-primary flex items-center gap-2"
            >
              ← {currentLang === 'ba' ? 'Padà' : 'Retour'}
            </button>
            
            <MarketSellerSpace 
              products={myProducts} 
              isLoading={productsLoading} 
              onRefresh={fetchMyProducts} 
            />
            
            <div className="mt-6 flex justify-center">
              <button
                onClick={() => setIsCreatingProduct(true)}
                className="px-6 py-3 bg-tamtam-primary text-white rounded-2xl font-medium flex items-center gap-2"
              >
                <span>➕</span>
                {currentLang === 'ba' ? 'Fi ọjà tuntun sílẹ̀' : 'Ajouter un produit'}
              </button>
            </div>
          </motion.div>
        )}

        {/* MY JOBS VIEW */}
        {view === 'my-jobs' && (
          <motion.div
            key="my-jobs"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <button 
              onClick={() => setView('home')} 
              className="mb-4 text-tamtam-primary flex items-center gap-2"
            >
              ← {currentLang === 'ba' ? 'Padà' : 'Retour'}
            </button>

            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-tamtam-primary" />
              </div>
            ) : (
              <div className="space-y-4">
                {myJobs.map(job => (
                  <MarketJobCard 
                    key={job.id} 
                    job={job} 
                    showApplyButton={false}
                    isPlaying={playingId === job.id} 
                    onPlayToggle={() => setPlayingId(playingId === job.id ? null : job.id)} 
                  />
                ))}
                {myJobs.length === 0 && (
                  <div className="text-center py-12 text-tamtam-text-muted">
                    {currentLang === 'ba' ? 'Kò sí ìpolówó' : 'Aucune annonce'}
                  </div>
                )}
              </div>
            )}
            
            <div className="mt-6 flex justify-center gap-3">
              <button
                onClick={() => { setJobCreatorType('offer'); setIsCreatingJob(true); }}
                className="px-4 py-3 bg-blue-500 text-white rounded-2xl font-medium flex items-center gap-2"
              >
                <span>💼</span>
                {currentLang === 'ba' ? 'Pèsè iṣẹ́' : 'Offre'}
              </button>
              <button
                onClick={() => { setJobCreatorType('demand'); setIsCreatingJob(true); }}
                className="px-4 py-3 bg-green-500 text-white rounded-2xl font-medium flex items-center gap-2"
              >
                <span>🙋</span>
                {currentLang === 'ba' ? 'Wá iṣẹ́' : 'Demande'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Voice Guided Creators */}
      <VoiceGuidedProductCreator 
        isOpen={isCreatingProduct} 
        onClose={() => { setIsCreatingProduct(false); setPrefillData({}); }} 
        onComplete={() => { fetchProducts(); fetchMyProducts(); }} 
        prefillData={prefillData}
      />
      <VoiceGuidedJobCreator 
        isOpen={isCreatingJob} 
        onClose={() => { setIsCreatingJob(false); setPrefillData({}); }} 
        onComplete={() => { fetchOffers(); fetchDemands(); fetchMyJobs(); }} 
        initialType={jobCreatorType}
        prefillData={prefillData}
      />
    </div>
  );
}
