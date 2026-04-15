import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronRight, ArrowLeft } from 'lucide-react';
import { useFitilaLanguage } from '@/contexts/FitilaLanguageContext';
import { CALCUL_LESSONS } from '@/data/classeContent';

export default function ClasseCalculView() {
  const { currentLang } = useFitilaLanguage();
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const selected = CALCUL_LESSONS.find(l => l.id === selectedId);

  if (selected) {
    return (
      <div className="space-y-4">
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => setSelectedId(null)}
          className="flex items-center gap-1 text-amber-600 text-sm font-bold"
        >
          <ArrowLeft className="w-4 h-4" /> {currentLang === 'ba' ? 'Yeni' : 'Retour'}
        </motion.button>

        <div className="p-4 rounded-3xl bg-gradient-to-br from-blue-100 to-indigo-100 border border-blue-200 shadow-md">
          <h2 className="text-gray-800 font-black text-xl">{selected.title || `Dooru ${selected.id}`}</h2>
        </div>

        {/* Illustration */}
        {selected.images.length > 0 && (
          <div className="rounded-2xl overflow-hidden border border-gray-200 shadow-sm bg-white">
            <img src={selected.images[0]} alt={selected.title} className="w-full h-auto object-contain max-h-64" />
          </div>
        )}

        {/* Text content */}
        {selected.text && (
          <div className="p-4 rounded-2xl bg-white border border-gray-100 shadow-sm">
            <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-line">{selected.text}</p>
          </div>
        )}

        {/* Paragraphs */}
        {selected.paragraphs.length > 0 && !selected.text && (
          <div className="p-4 rounded-2xl bg-white border border-gray-100 shadow-sm space-y-1">
            {selected.paragraphs.map((p, i) => (
              <p key={i} className="text-gray-700 text-sm font-mono">{p}</p>
            ))}
          </div>
        )}

        {/* Sections/questions */}
        {Object.entries(selected.sections).map(([sec, questions]) => (
          <div key={sec} className="p-4 rounded-2xl bg-white border border-gray-100 shadow-sm">
            <p className="text-blue-600 text-xs uppercase font-bold mb-2">{sec}</p>
            {(questions as string[]).map((q, i) => (
              <p key={i} className="text-gray-700 text-sm mb-1">{q}</p>
            ))}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {CALCUL_LESSONS.map((lesson, i) => (
        <motion.button
          key={lesson.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.03 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setSelectedId(lesson.id)}
          className="w-full flex items-center gap-3 p-4 rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-md transition-all"
        >
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-400 to-indigo-400 flex items-center justify-center">
            <span className="text-2xl">🔢</span>
          </div>
          <div className="flex-1 text-left">
            <p className="text-gray-800 font-semibold text-sm">{lesson.title || `Dooru ${lesson.id}`}</p>
            <p className="text-gray-400 text-xs">p.{lesson.page}</p>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-300" />
        </motion.button>
      ))}
    </div>
  );
}
