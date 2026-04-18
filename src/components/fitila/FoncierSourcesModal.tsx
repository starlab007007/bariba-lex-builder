import { motion, AnimatePresence } from 'framer-motion';
import { X, BookOpen } from 'lucide-react';

export interface FoncierSource {
  id: number;
  number: string;
  page: number;
  content: string;
}

interface Props {
  sources: FoncierSource[] | null;
  onClose: () => void;
}

export default function FoncierSourcesModal({ sources, onClose }: Props) {
  return (
    <AnimatePresence>
      {sources && sources.length > 0 && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.96 }}
            transition={{ type: 'spring', damping: 22, stiffness: 280 }}
            className="fixed inset-x-4 top-10 bottom-10 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:w-[560px] z-[201] bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-emerald-50 to-teal-50">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-md">
                <BookOpen className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-gray-800 text-base">Sources citées</h3>
                <p className="text-xs text-gray-500">{sources.length} article{sources.length > 1 ? 's' : ''} du Code Foncier Bariba</p>
              </div>
              <button onClick={onClose} className="w-9 h-9 rounded-full bg-white/80 hover:bg-white flex items-center justify-center transition-colors">
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
              {sources.map((src) => (
                <div key={src.id} className="rounded-2xl border border-emerald-100 bg-emerald-50/40 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-emerald-700 uppercase tracking-wide">{src.number}</span>
                    <span className="text-[10px] text-gray-500">page {src.page}</span>
                  </div>
                  <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">{src.content}</p>
                </div>
              ))}
            </div>

            <div className="px-5 py-3 border-t border-gray-100 bg-gray-50">
              <p className="text-[10px] text-gray-500 text-center italic">Loi n° 2013-01 — Code foncier et domanial du Bénin (traduction Bariba)</p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
