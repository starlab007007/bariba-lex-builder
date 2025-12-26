import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Loader2, Search } from 'lucide-react';
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
import { MarketCategoryFilter } from '@/components/market/MarketCategoryFilter';
import { AvailabilityToggle } from '@/components/market/AvailabilityToggle';
import { VoiceGuidedProductCreator } from '@/components/market/VoiceGuidedProductCreator';
import { VoiceGuidedJobCreator } from '@/components/market/VoiceGuidedJobCreator';
import { tamtamFeedback } from '@/utils/tamtamFeedback';
import { useToast } from '@/hooks/use-toast';

type MainTab = 'shop' | 'jobs';
type ShopSubTab = 'all' | 'my-shop' | 'sell';
type JobSubTab = 'offers' | 'demands' | 'available' | 'my-jobs';

const PRODUCT_CATEGORIES = [
  { id: 'food', emoji: '🍅', labelFr: 'Alimentation', labelBa: 'Oúnjẹ' },
  { id: 'livestock', emoji: '🐔', labelFr: 'Élevage', labelBa: 'Ẹranko' },
  { id: 'clothing', emoji: '👕', labelFr: 'Vêtements', labelBa: 'Aṣọ' },
  { id: 'craft', emoji: '🎨', labelFr: 'Artisanat', labelBa: 'Iṣẹ́ ọwọ́' },
  { id: 'agriculture', emoji: '🌾', labelFr: 'Agriculture', labelBa: 'Àgbẹ̀' },
];

const JOB_CATEGORIES = [
  { id: 'agriculture', emoji: '🚜', labelFr: 'Agriculture', labelBa: 'Àgbẹ̀' },
  { id: 'construction', emoji: '🏗️', labelFr: 'Construction', labelBa: 'Ìkọ́lé' },
  { id: 'transport', emoji: '🚗', labelFr: 'Transport', labelBa: 'Ìrìnnà' },
  { id: 'commerce', emoji: '🛒', labelFr: 'Commerce', labelBa: 'Òwò' },
  { id: 'domestic', emoji: '🏠', labelFr: 'Domestique', labelBa: 'Iṣẹ́ ilé' },
];

export default function TamTamMarket() {
  const [mainTab, setMainTab] = useState<MainTab>('shop');
  const [shopSubTab, setShopSubTab] = useState<ShopSubTab>('all');
  const [jobSubTab, setJobSubTab] = useState<JobSubTab>('offers');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isCreatingProduct, setIsCreatingProduct] = useState(false);
  const [isCreatingJob, setIsCreatingJob] = useState(false);
  const [jobCreatorType, setJobCreatorType] = useState<'offer' | 'demand' | undefined>();
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [myAvailability, setMyAvailability] = useState<'available' | 'busy' | 'searching'>('searching');

  const { t, currentLang } = useTamTamLanguage();
  const { announceAction } = useAudioDescription();
  const { speakCurrentLang } = useBilingualAudio();
  const { user } = useAuth();
  const { toast } = useToast();

  const { products, myProducts, isLoading: productsLoading, fetchProducts, fetchMyProducts, searchProducts } = useMarketProducts();
  const { offers, demands, availableWorkers, myJobs, isLoading: jobsLoading, fetchOffers, fetchDemands, fetchAvailableWorkers, fetchMyJobs, applyToJob, toggleAvailability } = useMarketJobs();

  useEffect(() => {
    announceAction(currentLang === 'ba' ? 'Ọjà' : 'Marché');
  }, [announceAction, currentLang]);

  useEffect(() => {
    if (mainTab === 'shop') {
      if (shopSubTab === 'all') fetchProducts(selectedCategory || undefined);
      else if (shopSubTab === 'my-shop') fetchMyProducts();
    } else {
      if (jobSubTab === 'offers') fetchOffers(selectedCategory || undefined);
      else if (jobSubTab === 'demands') fetchDemands(selectedCategory || undefined);
      else if (jobSubTab === 'available') fetchAvailableWorkers();
      else if (jobSubTab === 'my-jobs') fetchMyJobs();
    }
  }, [mainTab, shopSubTab, jobSubTab, selectedCategory]);

  const handleMainTabChange = (tab: MainTab) => {
    tamtamFeedback.play('click');
    setMainTab(tab);
    setSelectedCategory(null);
    speakCurrentLang(tab === 'shop' ? (currentLang === 'ba' ? 'Ọjà' : 'Boutique') : (currentLang === 'ba' ? 'Iṣẹ́' : 'Emplois'));
  };

  const handleVoiceSearch = async (result: { transcription?: string }) => {
    if (!result.transcription) return;
    tamtamFeedback.play('send');
    
    if (mainTab === 'shop') {
      const results = await searchProducts(result.transcription);
      toast({ title: `${results.length} ${currentLang === 'ba' ? 'èsì' : 'résultats'}` });
    }
    
    await speakCurrentLang(currentLang === 'ba' ? `Mo rí ${result.transcription}` : `Recherche: ${result.transcription}`);
  };

  const handleApplyToJob = async (job: MarketJob) => {
    tamtamFeedback.play('click');
    await speakCurrentLang(currentLang === 'ba' ? 'Fọwọ́sí iṣẹ́ yìí' : 'Postuler à cette offre');
    const success = await applyToJob(job.id);
    if (success) tamtamFeedback.play('success');
  };

  const handleAvailabilityChange = async (status: 'available' | 'busy' | 'searching') => {
    setMyAvailability(status);
    await toggleAvailability(status);
  };

  const isLoading = mainTab === 'shop' ? productsLoading : jobsLoading;

  return (
    <div className="min-h-screen bg-tamtam-bg px-4 pb-32">
      {/* Title */}
      <div className="text-center mb-4">
        <h1 className="text-xl font-bold text-tamtam-text">{currentLang === 'ba' ? 'Ọjà' : 'Marché'}</h1>
      </div>

      {/* Main tabs */}
      <div className="flex justify-center gap-4 mb-4">
        {[
          { id: 'shop' as MainTab, icon: '🛒', label: currentLang === 'ba' ? 'Ọjà' : 'Boutique' },
          { id: 'jobs' as MainTab, icon: '💼', label: currentLang === 'ba' ? 'Iṣẹ́' : 'Emplois' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => handleMainTabChange(tab.id)}
            className={`px-6 py-3 rounded-2xl flex items-center gap-2 text-lg transition-all ${
              mainTab === tab.id ? 'bg-tamtam-primary text-white shadow-tamtam-soft' : 'bg-tamtam-surface text-tamtam-text-muted'
            }`}
          >
            <span className="text-2xl">{tab.icon}</span>
            <span className="font-medium">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Shop subtabs */}
      {mainTab === 'shop' && (
        <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
          {[
            { id: 'all' as ShopSubTab, icon: '📋', label: currentLang === 'ba' ? 'Gbogbo' : 'Tout' },
            { id: 'my-shop' as ShopSubTab, icon: '👤', label: currentLang === 'ba' ? 'Ti mi' : 'Ma Boutique' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => { tamtamFeedback.play('click'); setShopSubTab(tab.id); }}
              className={`px-4 py-2 rounded-xl flex items-center gap-2 whitespace-nowrap ${
                shopSubTab === tab.id ? 'bg-tamtam-primary/20 text-tamtam-primary' : 'bg-tamtam-surface text-tamtam-text-muted'
              }`}
            >
              <span>{tab.icon}</span>
              <span className="text-sm">{tab.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Job subtabs */}
      {mainTab === 'jobs' && (
        <>
          <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
            {[
              { id: 'offers' as JobSubTab, icon: '📋', label: currentLang === 'ba' ? 'Iṣẹ́' : 'Offres' },
              { id: 'demands' as JobSubTab, icon: '🙋', label: currentLang === 'ba' ? 'Àwọn tó ń wá' : 'Demandes' },
              { id: 'available' as JobSubTab, icon: '✋', label: currentLang === 'ba' ? 'Wà' : 'Dispo' },
              { id: 'my-jobs' as JobSubTab, icon: '📍', label: currentLang === 'ba' ? 'Ti mi' : 'Mes annonces' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => { tamtamFeedback.play('click'); setJobSubTab(tab.id); }}
                className={`px-4 py-2 rounded-xl flex items-center gap-2 whitespace-nowrap ${
                  jobSubTab === tab.id ? 'bg-tamtam-primary/20 text-tamtam-primary' : 'bg-tamtam-surface text-tamtam-text-muted'
                }`}
              >
                <span>{tab.icon}</span>
                <span className="text-sm">{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Availability toggle for my-jobs */}
          {jobSubTab === 'my-jobs' && user && (
            <div className="mb-4">
              <p className="text-sm text-tamtam-text-muted mb-2">{currentLang === 'ba' ? 'Ipò mi' : 'Mon statut'}</p>
              <AvailabilityToggle currentStatus={myAvailability} onChange={handleAvailabilityChange} />
            </div>
          )}
        </>
      )}

      {/* Category filter */}
      {((mainTab === 'shop' && shopSubTab === 'all') || (mainTab === 'jobs' && (jobSubTab === 'offers' || jobSubTab === 'demands'))) && (
        <div className="mb-4">
          <MarketCategoryFilter
            categories={mainTab === 'shop' ? PRODUCT_CATEGORIES : JOB_CATEGORIES}
            selectedCategory={selectedCategory}
            onSelect={setSelectedCategory}
          />
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-tamtam-primary" />
        </div>
      )}

      {/* Content */}
      <AnimatePresence mode="wait">
        {/* Shop - All products */}
        {mainTab === 'shop' && shopSubTab === 'all' && !isLoading && (
          <motion.div key="products" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="grid grid-cols-2 gap-4">
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
          </motion.div>
        )}

        {/* Shop - My shop */}
        {mainTab === 'shop' && shopSubTab === 'my-shop' && !isLoading && (
          <motion.div key="my-shop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <MarketSellerSpace products={myProducts} isLoading={productsLoading} onRefresh={fetchMyProducts} />
          </motion.div>
        )}

        {/* Jobs - Offers */}
        {mainTab === 'jobs' && jobSubTab === 'offers' && !isLoading && (
          <motion.div key="offers" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
            {offers.map(job => (
              <MarketJobCard key={job.id} job={job} onApply={handleApplyToJob} isPlaying={playingId === job.id} onPlayToggle={() => setPlayingId(playingId === job.id ? null : job.id)} />
            ))}
            {offers.length === 0 && <div className="text-center py-12 text-tamtam-text-muted">{currentLang === 'ba' ? 'Kò sí iṣẹ́' : 'Aucune offre'}</div>}
          </motion.div>
        )}

        {/* Jobs - Demands */}
        {mainTab === 'jobs' && jobSubTab === 'demands' && !isLoading && (
          <motion.div key="demands" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
            {demands.map(job => (
              <MarketJobCard key={job.id} job={job} showApplyButton={false} onContact={() => toast({ title: '📞', description: job.contact_phone || 'Contact' })} isPlaying={playingId === job.id} onPlayToggle={() => setPlayingId(playingId === job.id ? null : job.id)} />
            ))}
            {demands.length === 0 && <div className="text-center py-12 text-tamtam-text-muted">{currentLang === 'ba' ? 'Kò sí àwọn tó ń wá' : 'Aucune demande'}</div>}
          </motion.div>
        )}

        {/* Jobs - Available */}
        {mainTab === 'jobs' && jobSubTab === 'available' && !isLoading && (
          <motion.div key="available" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
            {availableWorkers.map(job => (
              <MarketJobCard key={job.id} job={job} showApplyButton={false} onContact={() => toast({ title: '📞', description: job.contact_phone || 'Contact' })} isPlaying={playingId === job.id} onPlayToggle={() => setPlayingId(playingId === job.id ? null : job.id)} />
            ))}
            {availableWorkers.length === 0 && <div className="text-center py-12 text-tamtam-text-muted">{currentLang === 'ba' ? 'Kò sí ẹnìkan' : 'Personne disponible'}</div>}
          </motion.div>
        )}

        {/* Jobs - My jobs */}
        {mainTab === 'jobs' && jobSubTab === 'my-jobs' && !isLoading && (
          <motion.div key="my-jobs" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
            {myJobs.map(job => (
              <MarketJobCard key={job.id} job={job} showApplyButton={false} isPlaying={playingId === job.id} onPlayToggle={() => setPlayingId(playingId === job.id ? null : job.id)} />
            ))}
            {myJobs.length === 0 && <div className="text-center py-12 text-tamtam-text-muted">{currentLang === 'ba' ? 'Kò sí ìpolówó rẹ' : 'Aucune annonce'}</div>}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Voice Guided Creators */}
      <VoiceGuidedProductCreator isOpen={isCreatingProduct} onClose={() => setIsCreatingProduct(false)} onComplete={() => { fetchProducts(); fetchMyProducts(); }} />
      <VoiceGuidedJobCreator isOpen={isCreatingJob} onClose={() => setIsCreatingJob(false)} onComplete={() => { fetchOffers(); fetchDemands(); fetchMyJobs(); }} initialType={jobCreatorType} />

      {/* FAB */}
      <div className="fixed bottom-28 right-4 flex flex-col items-center gap-3">
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => {
            tamtamFeedback.play('click');
            if (mainTab === 'shop') setIsCreatingProduct(true);
            else { setJobCreatorType(undefined); setIsCreatingJob(true); }
          }}
          className="w-14 h-14 bg-tamtam-primary rounded-full flex items-center justify-center shadow-lg"
        >
          <Plus className="w-7 h-7 text-white" />
        </motion.button>
        <TamTamMicButton size="md" onRecordingComplete={handleVoiceSearch} autoTranscribe sourceLang={currentLang} />
      </div>
    </div>
  );
}
