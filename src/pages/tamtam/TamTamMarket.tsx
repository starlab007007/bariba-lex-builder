import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TamTamMicButton } from '@/components/tamtam/TamTamMicButton';
import { Volume2 } from 'lucide-react';

const tabs = [
  { icon: '🛒', id: 'shop' },
  { icon: '💼', id: 'jobs' },
];

const mockProducts = [
  { id: 1, image: '🍅', price: '500', seller: '👨🏾' },
  { id: 2, image: '🐔', price: '3000', seller: '👩🏾' },
  { id: 3, image: '🌽', price: '200', seller: '👴🏾' },
  { id: 4, image: '🥭', price: '800', seller: '👧🏾' },
  { id: 5, image: '🐟', price: '1500', seller: '👨🏾' },
  { id: 6, image: '🍌', price: '300', seller: '👩🏾' },
];

const mockJobs = [
  { id: 1, icon: '🚜', company: '👨🏾', applicants: 12 },
  { id: 2, icon: '🏗️', company: '👩🏾', applicants: 8 },
  { id: 3, icon: '🚗', company: '👴🏾', applicants: 25 },
  { id: 4, icon: '📦', company: '👧🏾', applicants: 5 },
];

export default function TamTamMarket() {
  const [activeTab, setActiveTab] = useState('shop');
  const [isRecording, setIsRecording] = useState(false);
  const [playingId, setPlayingId] = useState<number | null>(null);

  const handleListen = (id: number) => {
    setPlayingId(playingId === id ? null : id);
    // Auto stop after 3 seconds
    if (playingId !== id) {
      setTimeout(() => setPlayingId(null), 3000);
    }
  };

  return (
    <div className="min-h-screen bg-tamtam-bg px-4">
      {/* Tab bar */}
      <div className="flex justify-center gap-4 mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`w-20 h-16 rounded-2xl flex items-center justify-center text-3xl transition-all ${
              activeTab === tab.id
                ? 'bg-tamtam-primary text-white shadow-tamtam-soft'
                : 'bg-tamtam-surface text-tamtam-text-muted'
            }`}
          >
            {tab.icon}
          </button>
        ))}
      </div>

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

                  {/* Price */}
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xl font-bold text-tamtam-text">
                      {product.price} <span className="text-sm">F</span>
                    </span>
                    <span className="text-2xl">{product.seller}</span>
                  </div>

                  {/* Listen button */}
                  <button
                    onClick={() => handleListen(product.id)}
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
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-2xl">{job.company}</span>
                    </div>
                    <div className="flex items-center gap-2 text-tamtam-text-muted">
                      <span>👥</span>
                      <span>{job.applicants}</span>
                    </div>
                  </div>

                  {/* Listen button */}
                  <button
                    onClick={() => handleListen(job.id + 100)}
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
                <button className="w-full mt-4 py-4 bg-orange-500 text-white rounded-2xl flex items-center justify-center gap-2">
                  <span className="text-2xl">🎙️</span>
                </button>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating mic for creating listing */}
      <div className="fixed bottom-28 right-4">
        <TamTamMicButton
          size="md"
          isRecording={isRecording}
          onPress={() => setIsRecording(!isRecording)}
        />
      </div>
    </div>
  );
}
