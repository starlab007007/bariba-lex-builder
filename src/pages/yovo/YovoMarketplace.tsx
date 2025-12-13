import { motion } from 'framer-motion';
import { ShoppingBag, Mic, MapPin, Search, Filter, Heart, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

const products = [
  {
    id: '1',
    title: 'Moto TVS 125cc',
    price: '450 000 XOF',
    location: 'Cotonou',
    seller: 'Moussa K.',
    hasAudio: true,
    image: '🏍️',
  },
  {
    id: '2',
    title: 'Sacs de maïs (50kg)',
    price: '15 000 XOF',
    location: 'Parakou',
    seller: 'Agri Store',
    hasAudio: true,
    image: '🌽',
  },
  {
    id: '3',
    title: 'Téléphone Samsung A54',
    price: '180 000 XOF',
    location: 'Porto-Novo',
    seller: 'TechMobile',
    hasAudio: false,
    image: '📱',
  },
  {
    id: '4',
    title: 'Machine à coudre Singer',
    price: '85 000 XOF',
    location: 'Cotonou',
    seller: 'Couture Pro',
    hasAudio: true,
    image: '🧵',
  },
  {
    id: '5',
    title: 'Poulets pondeuses (lot)',
    price: '25 000 XOF',
    location: 'Abomey',
    seller: 'Ferme Lokossa',
    hasAudio: true,
    image: '🐔',
  },
  {
    id: '6',
    title: 'Congélateur 200L',
    price: '120 000 XOF',
    location: 'Cotonou',
    seller: 'Électro Plus',
    hasAudio: false,
    image: '❄️',
  },
];

const categories = ['Tous', 'Véhicules', 'Agriculture', 'Électronique', 'Mode', 'Maison'];

export default function YovoMarketplace() {
  return (
    <div className="px-4 py-6 space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-2"
      >
        <div className="w-16 h-16 mx-auto bg-gradient-to-br from-yellow-500 to-orange-500 rounded-2xl flex items-center justify-center mb-4">
          <ShoppingBag className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-white">Marketplace</h2>
        <p className="text-slate-400">Achetez et vendez avec des annonces vocales</p>
      </motion.div>

      {/* Search */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="flex gap-2"
      >
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
          <Input
            placeholder="Rechercher un produit..."
            className="pl-12 bg-slate-900/50 border-white/10 h-12 rounded-xl text-white"
          />
        </div>
        <Button size="icon" className="w-12 h-12 bg-slate-800 border border-white/10">
          <Filter className="w-5 h-5 text-slate-400" />
        </Button>
      </motion.div>

      {/* Categories */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.15 }}
        className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide"
      >
        {categories.map((cat, i) => (
          <button
            key={cat}
            className={`px-4 py-2 rounded-full whitespace-nowrap transition-colors ${
              i === 0
                ? 'bg-yellow-500 text-white'
                : 'bg-slate-900/50 text-slate-400 border border-white/10'
            }`}
          >
            {cat}
          </button>
        ))}
      </motion.div>

      {/* Products grid */}
      <div className="grid grid-cols-2 gap-3">
        {products.map((product, i) => (
          <motion.div
            key={product.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 + i * 0.05 }}
            className="bg-slate-900/50 rounded-xl border border-white/5 overflow-hidden"
          >
            {/* Image placeholder */}
            <div className="aspect-square bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center relative">
              <span className="text-5xl">{product.image}</span>
              <button className="absolute top-2 right-2 w-8 h-8 bg-slate-900/80 rounded-full flex items-center justify-center">
                <Heart className="w-4 h-4 text-slate-400" />
              </button>
              {product.hasAudio && (
                <button className="absolute bottom-2 right-2 w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center">
                  <Play className="w-4 h-4 text-white ml-0.5" />
                </button>
              )}
            </div>
            
            <div className="p-3">
              <p className="text-white font-medium truncate">{product.title}</p>
              <p className="text-orange-400 font-bold mt-1">{product.price}</p>
              <div className="flex items-center gap-1 mt-2 text-xs text-slate-500">
                <MapPin className="w-3 h-3" />
                {product.location}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Sell button */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="fixed bottom-24 right-4"
      >
        <Button className="w-14 h-14 rounded-full bg-gradient-to-r from-yellow-500 to-orange-500 shadow-lg shadow-orange-500/30">
          <Mic className="w-6 h-6" />
        </Button>
      </motion.div>
    </div>
  );
}
