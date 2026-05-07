import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, ShoppingCart, Package, Briefcase, HandHelping, Volume2 } from 'lucide-react';
import { useTamTamLanguage } from '@/contexts/TamTamLanguageContext';
import { useAudioDescription } from '@/contexts/AudioDescriptionContext';
import { useBilingualAudio } from '@/hooks/useBilingualAudio';
import { useMarketProducts, MarketProduct } from '@/hooks/useMarketProducts';
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
import { ProductDetailModal } from '@/components/market/ProductDetailModal';
import { JobDetailModal } from '@/components/market/JobDetailModal';
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
  const [selectedProduct, setSelectedProduct] = useState<MarketProduct | null>(null);
  const [selectedJob, setSelectedJob] = useState<MarketJob | null>(null);

  const { t, currentLang } = useTamTamLanguage();
  const { announceAction } = useAudioDescription();
  const { speakCurrentLang } = useBilingualAudio();
  const { user } = useAuth();
  const { toast } = useToast();

  const { products, myProducts, isLoading: productsLoading, fetchProducts, fetchMyProducts, searchProducts } = useMarketProducts();
  const { offers, demands, myJobs, isLoading: jobsLoading, fetchOffers, fetchDemands, fetchMyJobs, applyToJob } = useMarketJobs();

  useEffect(() => {
    announceAction(t('market_title'));
  }, [announceAction, t]);

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
    
    const labelKeys: Record<MainView, string> = {
      home: 'nav_home',
      buy: 'market_buy',
      sell: 'market_sell',
      work: 'market_work',
      hire: 'market_hire',
      'my-shop': 'market_my_shop',
      'my-jobs': 'market_my_ads',
    };
    
    await speakCurrentLang(t(labelKeys[action]));
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
    await speakCurrentLang(t('market_apply_job'));
    const success = await applyToJob(job.id);
    if (success) tamtamFeedback.play('success');
  };

  const handleVoiceSearch = async (result: { transcription?: string }) => {
    if (!result.transcription) return;
    tamtamFeedback.play('send');
    
    if (view === 'buy') {
      const results = await searchProducts(result.transcription);
      toast({ title: `${results.length} ${t('market_results')}` });
    }
    
    await speakCurrentLang(`${t('market_search')}: ${result.transcription}`);
  };

  const isLoading = view === 'buy' || view === 'my-shop' ? productsLoading : jobsLoading;

  // Main action buttons with audio
  const mainActions = [
    { 
      id: 'buy' as MainView, 
      icon: ShoppingCart, 
      emoji: '🛒', 
      labelKey: 'market_buy',
      descKey: 'market_buy_desc',
      color: 'bg-blue-500'
    },
    { 
      id: 'sell' as MainView, 
      icon: Package, 
      emoji: '📦', 
      labelKey: 'market_sell',
      descKey: 'market_sell_desc',
      color: 'bg-green-500'
    },
    { 
      id: 'work' as MainView, 
      icon: Briefcase, 
      emoji: '💼', 
      labelKey: 'market_work',
      descKey: 'market_work_desc',
      color: 'bg-purple-500'
    },
    { 
      id: 'hire' as MainView, 
      icon: HandHelping, 
      emoji: '🙋', 
      labelKey: 'market_hire',
      descKey: 'market_hire_desc',
      color: 'bg-orange-500'
    },
  ];

  return (
    <div className="min-h-screen bg-tamtam-bg px-4 pb-32">
      {/* Header with global audio help */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-tamtam-text">
          {t('market_title')}
        </h1>
        <VoiceButton 
          textFr={t('market_welcome_desc_fr')}
          textBa={t('market_welcome_desc_fr')}
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
                    {t(action.labelKey)}
                  </span>
                  
                  {/* Audio button */}
                  <div className="absolute top-2 right-2">
                    <VoiceButton 
                      textFr={t(action.descKey)}
                      textBa={t(action.descKey)}
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
                <span className="text-sm">{t('market_my_shop')}</span>
              </button>
              <button
                onClick={() => handleMainAction('my-jobs')}
                className="flex-1 py-3 px-4 bg-tamtam-surface rounded-xl flex items-center justify-center gap-2 text-tamtam-text-muted"
              >
                <span>📋</span>
                <span className="text-sm">{t('market_my_ads')}</span>
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
              ← {t('common_back')}
            </button>
            
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-tamtam-text">
                {t('market_what_sell')}
              </h2>
              <VoiceButton 
                textFr={t('market_sell_voice_desc')}
                textBa={t('market_sell_voice_desc')}
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
              ← {t('common_back')}
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
                    onViewDetails={(p) => setSelectedProduct(p)}
                    onContact={() => setSelectedProduct(product)}
                  />
                ))}
                {products.length === 0 && (
                  <div className="col-span-2 text-center py-12 text-tamtam-text-muted">
                    {t('market_no_product')}
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
              ← {t('common_back')}
            </button>

            {/* Quick create demand */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-tamtam-text">
                  {t('market_signal_availability')}
                </h3>
                <VoiceButton 
                  textFr={t('market_work_voice_desc')}
                  textBa={t('market_work_voice_desc')}
                  size="sm"
                />
              </div>
              <MarketQuickTemplates type="job_demand" onSelect={handleTemplateSelect} />
            </div>

            {/* Job offers list */}
            <h3 className="font-bold text-tamtam-text mb-3">
              {t('market_job_offers')}
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
                    onViewDetails={(j) => setSelectedJob(j)}
                    isPlaying={playingId === job.id} 
                    onPlayToggle={() => setPlayingId(playingId === job.id ? null : job.id)} 
                  />
                ))}
                {offers.length === 0 && (
                  <div className="text-center py-12 text-tamtam-text-muted">
                    {t('market_no_offer')}
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
              ← {t('common_back')}
            </button>

            {/* Quick create offer */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-tamtam-text">
                  {t('market_create_offer')}
                </h3>
                <VoiceButton 
                  textFr={t('market_hire_voice_desc')}
                  textBa={t('market_hire_voice_desc')}
                  size="sm"
                />
              </div>
              <MarketQuickTemplates type="job_offer" onSelect={handleTemplateSelect} />
            </div>

            {/* People looking for work */}
            <h3 className="font-bold text-tamtam-text mb-3">
              {t('market_people_available')}
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
                    onViewDetails={(j) => setSelectedJob(j)}
                    onContact={(j) => setSelectedJob(j)}
                    isPlaying={playingId === job.id} 
                    onPlayToggle={() => setPlayingId(playingId === job.id ? null : job.id)} 
                  />
                ))}
                {demands.length === 0 && (
                  <div className="text-center py-12 text-tamtam-text-muted">
                    {t('market_no_person')}
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
              ← {t('common_back')}
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
                {t('market_add_product')}
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
              ← {t('common_back')}
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
                    {t('market_no_ad')}
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
                {t('market_offer_btn')}
              </button>
              <button
                onClick={() => { setJobCreatorType('demand'); setIsCreatingJob(true); }}
                className="px-4 py-3 bg-green-500 text-white rounded-2xl font-medium flex items-center gap-2"
              >
                <span>🙋</span>
                {t('market_demand_btn')}
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

      {/* Detail Modals */}
      <ProductDetailModal
        product={selectedProduct}
        isOpen={!!selectedProduct}
        onClose={() => setSelectedProduct(null)}
      />
      <JobDetailModal
        job={selectedJob}
        isOpen={!!selectedJob}
        onClose={() => setSelectedJob(null)}
      />
    </div>
  );
}
