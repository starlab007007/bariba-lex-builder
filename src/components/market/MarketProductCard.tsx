import { motion } from 'framer-motion';
import { Volume2, Phone, MapPin, Eye, ImageIcon } from 'lucide-react';
import { MarketProduct } from '@/hooks/useMarketProducts';
import { useTamTamLanguage } from '@/contexts/TamTamLanguageContext';
import { useBilingualAudio } from '@/hooks/useBilingualAudio';
import { tamtamFeedback } from '@/utils/tamtamFeedback';

interface MarketProductCardProps {
  product: MarketProduct;
  onContact?: (product: MarketProduct) => void;
  onViewDetails?: (product: MarketProduct) => void;
  isPlaying?: boolean;
  onPlayToggle?: () => void;
}

export function MarketProductCard({ 
  product, 
  onContact, 
  onViewDetails,
  isPlaying = false,
  onPlayToggle 
}: MarketProductCardProps) {
  const { currentLang } = useTamTamLanguage();
  const { speakCurrentLang } = useBilingualAudio();

  const displayTitle = currentLang === 'ba' && product.title_ba 
    ? product.title_ba 
    : (product.title_fr || product.title);

  const statusColors = {
    available: 'bg-green-500',
    reserved: 'bg-orange-500',
    sold: 'bg-red-500'
  };

  const statusLabels = {
    available: '🟢',
    reserved: '🟠',
    sold: '🔴'
  };

  const handleListen = async () => {
    tamtamFeedback.play('click');
    onPlayToggle?.();
    
    const textToSpeak = product.description_text 
      ? `${displayTitle}. ${product.price} francs. ${product.description_text}`
      : `${displayTitle}. ${product.price} francs`;
    
    await speakCurrentLang(textToSpeak);
  };

  const handleContact = () => {
    tamtamFeedback.play('send');
    onContact?.(product);
  };

  const handleViewDetails = () => {
    tamtamFeedback.play('click');
    onViewDetails?.(product);
  };

  const hasImages = (product.images?.length ?? 0) > 0 || !!product.thumbnail_url;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-tamtam-surface rounded-3xl p-4 shadow-tamtam-soft relative overflow-hidden"
    >
      {/* Status badge */}
      <div className={`absolute top-3 right-3 w-4 h-4 rounded-full ${statusColors[product.status]} shadow-lg`} />

      {/* Photos indicator */}
      {hasImages && (
        <div className="absolute top-3 left-3 bg-black/50 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
          <ImageIcon className="w-3 h-3" />
          {product.images?.length || 1}
        </div>
      )}

      {/* Product image/emoji - clickable for details */}
      <button
        onClick={handleViewDetails}
        className="aspect-square bg-tamtam-bg rounded-2xl flex items-center justify-center mb-3 relative w-full overflow-hidden group"
      >
        {product.thumbnail_url ? (
          <img 
            src={product.thumbnail_url} 
            alt={displayTitle}
            className="w-full h-full object-cover rounded-2xl group-hover:scale-105 transition-transform"
          />
        ) : (
          <span className="text-6xl">{product.emoji_icon || '📦'}</span>
        )}
        
        {/* View details overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
          <Eye className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
        
        {/* Status indicator overlay */}
        <div className="absolute bottom-2 right-2 text-xl">
          {statusLabels[product.status]}
        </div>
      </button>

      {/* Product name */}
      <h3 className="font-semibold text-tamtam-text text-sm mb-1 line-clamp-2 min-h-[2.5rem]">
        {displayTitle}
      </h3>

      {/* Location */}
      {product.location && (
        <div className="flex items-center gap-1 text-tamtam-text-muted text-xs mb-2">
          <MapPin className="w-3 h-3" />
          <span className="truncate">{product.location}</span>
        </div>
      )}

      {/* Price */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-xl font-bold text-tamtam-primary">
          {product.price?.toLocaleString()} <span className="text-sm">{product.currency || 'F'}</span>
        </span>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        {/* Listen button */}
        <button
          onClick={handleListen}
          className={`flex-1 py-3 rounded-2xl flex items-center justify-center gap-2 transition-all ${
            isPlaying
              ? 'bg-tamtam-primary text-white'
              : 'bg-tamtam-bg text-tamtam-text'
          }`}
        >
          <Volume2 className="w-5 h-5" />
          {isPlaying && (
            <div className="flex gap-0.5">
              {[...Array(3)].map((_, i) => (
                <motion.div
                  key={i}
                  animate={{ height: [4, 12, 4] }}
                  transition={{ duration: 0.4, repeat: Infinity, delay: i * 0.1 }}
                  className="w-0.5 bg-current rounded-full"
                />
              ))}
            </div>
          )}
        </button>

        {/* Contact button */}
        {product.status === 'available' && (
          <button
            onClick={handleContact}
            className="flex-1 py-3 bg-green-500 text-white rounded-2xl flex items-center justify-center gap-2"
          >
            <Phone className="w-5 h-5" />
          </button>
        )}
      </div>
    </motion.div>
  );
}
