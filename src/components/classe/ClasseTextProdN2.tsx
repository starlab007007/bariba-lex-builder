import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, Eye, EyeOff, PenLine } from 'lucide-react';
import { useFitilaLanguage } from '@/contexts/FitilaLanguageContext';
import { TEXT_PRODUCTION_TYPES, TextType } from '@/data/classeContentN2TextProd';
import UniversalAnswerCard from './UniversalAnswerCard';

function TextTypeCard({ tt, lang, onSelect }: { tt: TextType; lang: string; onSelect: () => void }) {
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      onClick={onSelect}
      className="w-full flex items-center gap-3 p-4 rounded-2xl bg-white border border-gray-100 shadow-sm"
    >
      <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${tt.gradient} flex items-center justify-center shadow-md`}>
        <span className="text-2xl">{tt.emoji}</span>
      </div>
      <div className="flex-1 text-left">
        <p className="text-gray-800 font-bold text-sm">{lang === 'ba' ? tt.title : tt.titleFr}</p>
        <p className="text-gray-400 text-xs">{tt.structure.length} {lang === 'ba' ? 'bweseru' : 'champs'}</p>
      </div>
      <ChevronRight className="w-4 h-4 text-gray-300" />
    </motion.button>
  );
}

function TextTypeDetail({ tt, lang, onBack }: { tt: TextType; lang: string; onBack: () => void }) {
  const [activeTab, setActiveTab] = useState<'learn' | 'practice'>('learn');
  const [showExample, setShowExample] = useState(false);
  const [formData, setFormData] = useState<Record<string, string>>({});

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className={`p-4 rounded-3xl bg-gradient-to-br ${tt.gradient} shadow-lg`}>
        <div className="flex items-center gap-3">
          <span className="text-4xl">{tt.emoji}</span>
          <div>
            <h3 className="text-white font-black text-lg">{lang === 'ba' ? tt.title : tt.titleFr}</h3>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab('learn')}
          className={`flex-1 py-2.5 rounded-xl text-xs font-bold ${activeTab === 'learn' ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-50 text-gray-400'}`}
        >
          📖 {lang === 'ba' ? 'Gari yã' : 'Apprendre'}
        </button>
        <button
          onClick={() => setActiveTab('practice')}
          className={`flex-1 py-2.5 rounded-xl text-xs font-bold ${activeTab === 'practice' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-50 text-gray-400'}`}
        >
          ✍️ {lang === 'ba' ? 'Sɔmbu ko' : 'Pratiquer'}
        </button>
      </div>

      {activeTab === 'learn' && (
        <div className="space-y-3">
          {/* Definition */}
          <div className="p-4 rounded-2xl bg-white border border-gray-100 shadow-sm">
            <h4 className="text-gray-700 font-bold text-xs mb-2">📝 {lang === 'ba' ? 'Kɔ̀kɔrɔ' : 'Définition'}</h4>
            <p className="text-gray-600 text-xs leading-relaxed">{lang === 'ba' ? tt.definition : tt.definitionFr}</p>
          </div>

          {/* Characteristics */}
          <div className="p-4 rounded-2xl bg-white border border-gray-100 shadow-sm">
            <h4 className="text-gray-700 font-bold text-xs mb-2">📋 {lang === 'ba' ? 'Bweseru' : 'Caractéristiques'}</h4>
            <ul className="space-y-1.5">
              {(lang === 'ba' ? tt.characteristics : tt.characteristicsFr).map((c, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-gray-600">
                  <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-[10px] font-bold flex-shrink-0">{i + 1}</span>
                  {c}
                </li>
              ))}
            </ul>
          </div>

          {/* Structure visual */}
          <div className="p-4 rounded-2xl bg-white border border-gray-100 shadow-sm">
            <h4 className="text-gray-700 font-bold text-xs mb-3">🏗️ {lang === 'ba' ? 'Bweseru yãabu' : 'Structure visuelle'}</h4>
            <div className="space-y-2">
              {tt.structure.map((field, i) => (
                <div key={i} className={`p-3 rounded-xl border ${field.color}`}>
                  <p className="text-xs font-bold text-gray-700">{lang === 'ba' ? field.label : field.labelFr}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{field.placeholder}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Example toggle */}
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowExample(!showExample)}
            className="w-full flex items-center gap-2 p-3 rounded-2xl bg-amber-50 border border-amber-200"
          >
            {showExample ? <EyeOff className="w-4 h-4 text-amber-600" /> : <Eye className="w-4 h-4 text-amber-600" />}
            <span className="text-amber-700 font-bold text-xs">{showExample ? (lang === 'ba' ? 'Seeda wɔ̃ɔ' : 'Masquer l\'exemple') : (lang === 'ba' ? 'Seeda yã' : 'Voir l\'exemple')}</span>
          </motion.button>

          <AnimatePresence>
            {showExample && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200">
                  <pre className="text-xs text-gray-700 whitespace-pre-wrap font-sans leading-relaxed">
                    {lang === 'ba' ? tt.example : tt.exampleFr}
                  </pre>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {activeTab === 'practice' && (
        <div className="space-y-3">
          {/* Exercise prompt */}
          <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-200">
            <div className="flex items-center gap-2 mb-2">
              <PenLine className="w-4 h-4 text-indigo-600" />
              <h4 className="text-indigo-700 font-bold text-xs">{lang === 'ba' ? 'Sɔmbu' : 'Exercice'}</h4>
            </div>
            <p className="text-indigo-600 text-xs">{lang === 'ba' ? tt.exercisePrompt : tt.exercisePromptFr}</p>
          </div>

          {/* Interactive form with submit + verify per field */}
          <div className="space-y-3">
            {tt.structure.map((field, i) => (
              <UniversalAnswerCard
                key={field.key}
                level="N2"
                module="textprod"
                lessonId={tt.id}
                sectionKey={field.key}
                questionIdx={i}
                question={lang === 'ba' ? field.label : field.labelFr}
                questionLabel={`${i + 1}`}
                initialAnswer={formData[field.key] || ''}
                rows={field.type === 'long' ? 4 : 2}
                accent="from-indigo-500 to-purple-500"
                onLocalChange={(val) => setFormData(prev => ({ ...prev, [field.key]: val }))}
                onSubmitted={(val) => setFormData(prev => ({ ...prev, [field.key]: val }))}
              />
            ))}
          </div>

          {/* Preview */}
          {Object.values(formData).some(v => v.trim()) && (
            <div className="p-4 rounded-2xl bg-white border-2 border-indigo-200 shadow-sm">
              <h4 className="text-indigo-700 font-bold text-xs mb-2">👁️ {lang === 'ba' ? 'Yãabu kpuro' : 'Aperçu complet'}</h4>
              <div className="space-y-1">
                {tt.structure.map((field, i) => {
                  const val = formData[field.key];
                  if (!val?.trim()) return null;
                  return (
                    <p key={i} className="text-xs text-gray-700">
                      <span className="font-bold text-gray-500">{lang === 'ba' ? field.label : field.labelFr}:</span> {val}
                    </p>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ClasseTextProdN2() {
  const { currentLang } = useFitilaLanguage();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selected = TEXT_PRODUCTION_TYPES.find(t => t.id === selectedId);

  if (selected) {
    return <TextTypeDetail tt={selected} lang={currentLang} onBack={() => setSelectedId(null)} />;
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="p-4 rounded-3xl bg-gradient-to-br from-indigo-100 to-purple-100 border border-indigo-200">
        <h3 className="text-indigo-800 font-black text-lg">✍️ {currentLang === 'ba' ? 'Sɔm yorubu' : 'Production de textes'}</h3>
        <p className="text-indigo-600/70 text-xs mt-1">{TEXT_PRODUCTION_TYPES.length} {currentLang === 'ba' ? 'tireru bweseru' : 'types de textes'}</p>
      </div>

      {TEXT_PRODUCTION_TYPES.map(tt => (
        <TextTypeCard key={tt.id} tt={tt} lang={currentLang} onSelect={() => setSelectedId(tt.id)} />
      ))}
    </div>
  );
}
