import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Package, Edit2, Trash2, Eye, EyeOff, Volume2, Loader2 } from 'lucide-react';
import { MarketProduct, useMarketProducts } from '@/hooks/useMarketProducts';
import { useTamTamLanguage } from '@/contexts/TamTamLanguageContext';
import { useBilingualAudio } from '@/hooks/useBilingualAudio';
import { tamtamFeedback } from '@/utils/tamtamFeedback';

interface MarketSellerSpaceProps {
  products: MarketProduct[];
  isLoading: boolean;
  onRefresh: () => void;
  onEdit?: (product: MarketProduct) => void;
}

export function MarketSellerSpace({ 
  products, 
  isLoading, 
  onRefresh,
  onEdit 
}: MarketSellerSpaceProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const { currentLang, t } = useTamTamLanguage();
  const { speakCurrentLang } = useBilingualAudio();
  const { deleteProduct, updateStatus } = useMarketProducts();

  const handleDelete = async (product: MarketProduct) => {
    tamtamFeedback.play('click');
    
    await speakCurrentLang(
      `${t('market_confirm_delete')} ${product.title_fr || product.title} ?`
    );

    setDeletingId(product.id);
    const success = await deleteProduct(product.id);
    setDeletingId(null);
    
    if (success) {
      tamtamFeedback.play('success');
      onRefresh();
    }
  };

  const handleStatusChange = async (product: MarketProduct, newStatus: 'available' | 'sold' | 'reserved') => {
    tamtamFeedback.play('click');
    setUpdatingId(product.id);
    
    const success = await updateStatus(product.id, newStatus);
    setUpdatingId(null);
    
    if (success) {
      tamtamFeedback.play('success');
      onRefresh();
    }
  };

  const handleListen = async (product: MarketProduct) => {
    tamtamFeedback.play('click');
    const title = currentLang === 'ba' && product.title_ba ? product.title_ba : (product.title_fr || product.title);
    const statusText = {
      available: t('market_available_status'),
      sold: t('market_sold_status'),
      reserved: t('market_reserved_status')
    };
    
    await speakCurrentLang(`${title}. ${product.price} francs. ${statusText[product.status]}`);
  };

  const statusConfig = {
    available: { label: t('market_dispo'), color: 'bg-green-500', icon: '🟢' },
    reserved: { label: t('market_reserved'), color: 'bg-orange-500', icon: '🟠' },
    sold: { label: t('market_sold'), color: 'bg-red-500', icon: '🔴' }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-tamtam-primary" />
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center py-12"
      >
        <div className="w-20 h-20 bg-tamtam-bg rounded-full flex items-center justify-center mx-auto mb-4">
          <Package className="w-10 h-10 text-tamtam-text-muted" />
        </div>
        <p className="text-tamtam-text-muted text-lg">
          {t('market_no_listing')}
        </p>
        <p className="text-tamtam-text-muted text-sm mt-2">
          {t('market_start_selling')}
        </p>
      </motion.div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2 mb-4">
        {(['available', 'reserved', 'sold'] as const).map(status => {
          const count = products.filter(p => p.status === status).length;
          const config = statusConfig[status];
          return (
            <div 
              key={status}
              className="bg-tamtam-surface rounded-2xl p-3 text-center"
            >
              <span className="text-2xl">{config.icon}</span>
              <p className="text-2xl font-bold text-tamtam-text">{count}</p>
              <p className="text-xs text-tamtam-text-muted">{config.label}</p>
            </div>
          );
        })}
      </div>

      <AnimatePresence>
        {products.map((product, index) => (
          <motion.div
            key={product.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ delay: index * 0.05 }}
            className="bg-tamtam-surface rounded-2xl p-4 shadow-tamtam-soft"
          >
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 bg-tamtam-bg rounded-xl flex items-center justify-center flex-shrink-0">
                {product.thumbnail_url ? (
                  <img 
                    src={product.thumbnail_url} 
                    alt=""
                    className="w-full h-full object-cover rounded-xl"
                  />
                ) : (
                  <span className="text-3xl">{product.emoji_icon || '📦'}</span>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-tamtam-text truncate">
                  {currentLang === 'ba' && product.title_ba ? product.title_ba : (product.title_fr || product.title)}
                </h4>
                <p className="text-lg font-bold text-tamtam-primary">
                  {product.price?.toLocaleString()} F
                </p>
                <div className="flex items-center gap-1 text-xs text-tamtam-text-muted">
                  <Eye className="w-3 h-3" />
                  <span>{product.views_count || 0} vues</span>
                </div>
              </div>

              <button
                onClick={() => handleListen(product)}
                className="w-10 h-10 bg-tamtam-bg rounded-xl flex items-center justify-center"
              >
                <Volume2 className="w-5 h-5 text-tamtam-text-muted" />
              </button>
            </div>

            <div className="flex gap-2 mt-3">
              {(['available', 'reserved', 'sold'] as const).map(status => {
                const config = statusConfig[status];
                const isActive = product.status === status;
                const isUpdating = updatingId === product.id;
                
                return (
                  <button
                    key={status}
                    onClick={() => handleStatusChange(product, status)}
                    disabled={isActive || isUpdating}
                    className={`flex-1 py-2 rounded-xl text-xs font-medium transition-all ${
                      isActive 
                        ? `${config.color} text-white` 
                        : 'bg-tamtam-bg text-tamtam-text-muted'
                    }`}
                  >
                    {isUpdating ? (
                      <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                    ) : (
                      <span>{config.icon} {config.label}</span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="flex gap-2 mt-3 pt-3 border-t border-tamtam-border">
              <button
                onClick={() => onEdit?.(product)}
                className="flex-1 py-2 bg-tamtam-bg rounded-xl flex items-center justify-center gap-2 text-tamtam-text text-sm"
              >
                <Edit2 className="w-4 h-4" />
                <span>{t('market_edit')}</span>
              </button>
              <button
                onClick={() => handleDelete(product)}
                disabled={deletingId === product.id}
                className="flex-1 py-2 bg-red-50 rounded-xl flex items-center justify-center gap-2 text-red-600 text-sm"
              >
                {deletingId === product.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>{t('market_delete')}</span>
                  </>
                )}
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
