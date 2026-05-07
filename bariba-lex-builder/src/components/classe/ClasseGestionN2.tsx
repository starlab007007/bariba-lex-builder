import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, Calculator, RotateCcw, Check, Edit3, Trophy, ArrowLeft, Save } from 'lucide-react';
import { useFitilaLanguage } from '@/contexts/FitilaLanguageContext';
import { GESTION_N2_DOCUMENTS, GestionDocument } from '@/data/classeContentN2Gestion';
import {
  getGestionN2State,
  saveGestionN2Form,
  saveGestionN2Table,
  saveGestionN2QA,
  getGestionN2QA,
  markGestionN2Submitted,
  markGestionN2Complete,
  resetGestionN2Doc,
} from '@/data/classeContentN2';
import BaribaSmartTextarea from './BaribaSmartTextarea';
import UniversalAnswerCard from './UniversalAnswerCard';

// ============ Q&A Field (using UniversalAnswerCard for full feedback flow) ============
function QAField({ docId, qIdx, question, lang }: { docId: string; qIdx: number; question: { ba: string; fr: string }; lang: string }) {
  const initial = getGestionN2QA(docId, qIdx);
  return (
    <UniversalAnswerCard
      level="N2"
      module="gestion"
      lessonId={docId}
      sectionKey="qa"
      questionIdx={qIdx}
      question={lang === 'ba' ? question.ba : question.fr}
      questionLabel={`Q${qIdx + 1}`}
      initialAnswer={initial}
      accent="from-teal-500 to-cyan-500"
      rows={3}
      onLocalChange={(val) => saveGestionN2QA(docId, qIdx, val)}
      onSubmitted={(val) => saveGestionN2QA(docId, qIdx, val)}
    />
  );
}

// ============ Document Detail ============
function GestionDocDetail({ doc, lang, onBack }: { doc: GestionDocument; lang: string; onBack: () => void }) {
  const state = getGestionN2State();
  const savedForm = state.formData[doc.id] || {};
  const savedTable = state.tableData[doc.id];
  const submitted = !!state.submitted[doc.id];

  const [formData, setFormData] = useState<Record<string, string>>(
    Object.keys(savedForm).length > 0 ? savedForm : (doc.example || {})
  );
  const [tableData, setTableData] = useState<string[][]>(() => {
    if (!doc.tableConfig) return [];
    if (savedTable && savedTable.length === doc.tableConfig.rows) return savedTable;
    return Array.from({ length: doc.tableConfig.rows }, () =>
      Array.from({ length: doc.tableConfig!.headers.length }, () => '')
    );
  });
  const [showFormula, setShowFormula] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(submitted);
  const [showBilan, setShowBilan] = useState(false);

  // Auto-persist on change
  useEffect(() => {
    saveGestionN2Form(doc.id, formData);
  }, [formData, doc.id]);

  useEffect(() => {
    if (doc.tableConfig) saveGestionN2Table(doc.id, tableData);
  }, [tableData, doc.id, doc.tableConfig]);

  const updateField = (key: string, value: string) => {
    if (isSubmitted) return;
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const updateCell = (row: number, col: number, value: string) => {
    if (isSubmitted) return;
    setTableData(prev => {
      const next = prev.map(r => [...r]);
      next[row][col] = value;
      return next;
    });
  };

  // Computed fields
  const computed = useMemo(() => {
    const result: Record<string, number> = {};
    doc.fields.forEach(f => {
      if (f.type === 'computed' && f.formula) {
        if (f.formula === 'prix_achat + frais') {
          result[f.key] = (parseFloat(formData.prix_achat) || 0) + (parseFloat(formData.frais) || 0);
        } else if (f.formula === 'prix_vente - prix_revient') {
          const pr = (parseFloat(formData.prix_achat) || 0) + (parseFloat(formData.frais) || 0);
          result[f.key] = (parseFloat(formData.prix_vente) || 0) - pr;
        }
      }
    });
    return result;
  }, [formData, doc.fields]);

  // Table totals
  const tableTotals = useMemo(() => {
    if (!doc.tableConfig) return [];
    const cols = doc.tableConfig.headers.length;
    const totals = Array(cols).fill(0);
    tableData.forEach(row => {
      row.forEach((cell, ci) => {
        const num = parseFloat(cell);
        if (!isNaN(num) && ci >= 2) totals[ci] += num;
      });
    });
    return totals;
  }, [tableData, doc.tableConfig]);

  // Completion stats
  const filledFields = doc.fields.filter(f => f.type !== 'computed' && (formData[f.key] || '').toString().trim()).length;
  const totalFields = doc.fields.filter(f => f.type !== 'computed').length;
  const filledRows = doc.tableConfig
    ? tableData.filter(r => r.some(c => c.trim())).length
    : 0;
  const totalRows = doc.tableConfig?.rows || 0;
  const qaTotal = doc.qaQuestions?.length || 0;
  const qaAnswered = doc.qaQuestions
    ? doc.qaQuestions.filter((_, i) => getGestionN2QA(doc.id, i).trim()).length
    : 0;

  const handleSubmit = () => {
    markGestionN2Submitted(doc.id, true);
    setIsSubmitted(true);
  };

  const handleEdit = () => {
    markGestionN2Submitted(doc.id, false);
    setIsSubmitted(false);
  };

  const handleReset = () => {
    if (!confirm(lang === 'ba' ? 'A bɔkura kpuro?' : 'Tout réinitialiser ?')) return;
    resetGestionN2Doc(doc.id);
    setFormData(doc.example || {});
    if (doc.tableConfig) {
      setTableData(Array.from({ length: doc.tableConfig.rows }, () =>
        Array.from({ length: doc.tableConfig!.headers.length }, () => '')
      ));
    }
    setIsSubmitted(false);
    setShowBilan(false);
  };

  const handleFinalize = () => {
    markGestionN2Complete(doc.id);
    setShowBilan(true);
  };

  const completionPct = Math.round(
    ((filledFields + filledRows + qaAnswered) /
      Math.max(1, totalFields + totalRows + qaTotal)) *
      100
  );

  return (
    <div className="space-y-4 pb-6">
      {/* Back */}
      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={onBack}
        className="flex items-center gap-1 text-teal-600 text-xs font-bold"
      >
        <ArrowLeft className="w-4 h-4" />
        {lang === 'ba' ? 'A wuro' : 'Retour'}
      </motion.button>

      {/* Header */}
      <div className={`p-4 rounded-3xl bg-gradient-to-br ${doc.gradient} shadow-lg`}>
        <div className="flex items-center gap-3">
          <span className="text-4xl">{doc.emoji}</span>
          <div className="flex-1">
            <h3 className="text-white font-black text-lg">{lang === 'ba' ? doc.title : doc.titleFr}</h3>
            <div className="mt-1 flex items-center gap-2">
              <div className="flex-1 h-1.5 bg-white/30 rounded-full overflow-hidden">
                <div className="h-full bg-white rounded-full transition-all" style={{ width: `${completionPct}%` }} />
              </div>
              <span className="text-white text-[10px] font-bold">{completionPct}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Definition */}
      <div className="p-4 rounded-2xl bg-white border border-gray-100 shadow-sm">
        <h4 className="text-gray-700 font-bold text-xs mb-2">📝 {lang === 'ba' ? 'Kɔ̀kɔrɔ' : 'Définition'}</h4>
        <p className="text-gray-600 text-xs leading-relaxed">{lang === 'ba' ? doc.definition : doc.definitionFr}</p>
      </div>

      {/* Formula */}
      {doc.formula && (
        <>
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowFormula(!showFormula)}
            className="w-full flex items-center gap-2 p-3 rounded-2xl bg-amber-50 border border-amber-200"
          >
            <Calculator className="w-4 h-4 text-amber-600" />
            <span className="text-amber-700 font-bold text-xs">
              {showFormula ? (lang === 'ba' ? 'Dootinun swaa wɔ̃ɔ' : 'Masquer la formule') : (lang === 'ba' ? 'Dootinun swaa yã' : 'Voir la formule')}
            </span>
          </motion.button>
          <AnimatePresence>
            {showFormula && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200">
                  <pre className="text-xs text-amber-800 whitespace-pre-wrap font-mono">{lang === 'ba' ? doc.formula : doc.formulaFr}</pre>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}

      {/* Form fields */}
      <div className="space-y-2">
        <h4 className="text-gray-700 font-bold text-xs px-1">
          ✍️ {lang === 'ba' ? 'Bweseru bù dokeo' : 'Remplissez les champs'}
          <span className="ml-2 text-emerald-600">{filledFields}/{totalFields}</span>
        </h4>
        {doc.fields.map(field => (
          <div key={field.key} className="p-3 rounded-xl bg-white border border-gray-100">
            <label className="text-xs font-bold text-gray-700 block mb-1">
              {lang === 'ba' ? field.label : field.labelFr}
            </label>
            {field.type === 'computed' ? (
              <div className={`p-2 rounded-lg text-sm font-bold ${computed[field.key] !== undefined && computed[field.key] >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                {computed[field.key] !== undefined ? `F ${computed[field.key].toLocaleString()}` : '—'}
                {field.key === 'resultat' && computed[field.key] !== undefined && (
                  <span className="ml-2 text-xs">
                    {computed[field.key] >= 0 ? (lang === 'ba' ? '(Gobi yɛna — Bénéfice)' : '(Bénéfice)') : (lang === 'ba' ? '(Gobi bɔnu — Perte)' : '(Perte)')}
                  </span>
                )}
              </div>
            ) : (
              <input
                type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
                value={formData[field.key] || ''}
                onChange={(e) => updateField(field.key, e.target.value)}
                placeholder={field.placeholder}
                disabled={isSubmitted}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2 text-xs focus:border-indigo-400 outline-none disabled:opacity-60"
              />
            )}
          </div>
        ))}
      </div>

      {/* Interactive table */}
      {doc.tableConfig && (
        <div className="rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-3 bg-indigo-50 border-b border-indigo-100 flex items-center justify-between">
            <h4 className="text-indigo-700 font-bold text-xs">📊 {lang === 'ba' ? 'Tɛtɛ' : 'Tableau'}</h4>
            <span className="text-indigo-600 text-[10px] font-bold">{filledRows}/{totalRows}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50">
                  {(lang === 'ba' ? doc.tableConfig.headers : doc.tableConfig.headersFr).map((h, i) => (
                    <th key={i} className="p-2 text-left text-gray-700 font-bold border-b border-gray-200 min-w-[80px]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tableData.map((row, ri) => (
                  <tr key={ri} className={ri % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    {row.map((cell, ci) => (
                      <td key={ci} className="p-1 border-b border-gray-100">
                        <input
                          type={ci >= 2 ? 'number' : 'text'}
                          value={cell}
                          onChange={(e) => updateCell(ri, ci, e.target.value)}
                          disabled={isSubmitted}
                          className="w-full bg-transparent p-1 text-xs outline-none focus:bg-indigo-50 rounded disabled:opacity-60"
                          placeholder="—"
                        />
                      </td>
                    ))}
                  </tr>
                ))}
                {doc.tableConfig.totalRow && (
                  <tr className="bg-indigo-50 font-bold">
                    <td className="p-2 text-indigo-700" colSpan={2}>{lang === 'ba' ? 'Kpuro' : 'Total'}</td>
                    {tableTotals.slice(2).map((t, i) => (
                      <td key={i} className="p-2 text-indigo-700">{t > 0 ? t.toLocaleString() : '—'}</td>
                    ))}
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Submit / Edit form */}
      <div className="flex gap-2">
        {!isSubmitted ? (
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleSubmit}
            className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md"
          >
            <Save className="w-4 h-4" />
            {lang === 'ba' ? 'A geruo tireru' : 'Soumettre le document'}
          </motion.button>
        ) : (
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleEdit}
            className="flex-1 py-3 rounded-2xl bg-gray-100 text-gray-700 font-bold text-sm flex items-center justify-center gap-2"
          >
            <Edit3 className="w-4 h-4" />
            {lang === 'ba' ? 'Kɔsiari' : 'Modifier'}
          </motion.button>
        )}
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={handleReset}
          className="px-4 py-3 rounded-2xl bg-red-50 text-red-600 font-bold text-xs flex items-center gap-1"
        >
          <RotateCcw className="w-4 h-4" />
        </motion.button>
      </div>

      {/* Q&A Reflection */}
      {doc.qaQuestions && doc.qaQuestions.length > 0 && (
        <div className="space-y-2">
          <div className="p-3 rounded-2xl bg-gradient-to-r from-teal-100 to-cyan-100 border border-teal-200">
            <h4 className="text-teal-800 font-black text-sm">
              💭 {lang === 'ba' ? 'Bikiabu ka wisibu' : 'Questions de réflexion'}
              <span className="ml-2 text-xs font-bold text-teal-600">{qaAnswered}/{qaTotal}</span>
            </h4>
            <p className="text-teal-700/70 text-[11px] mt-1">
              {lang === 'ba' ? 'A wisibu yoruo bariba sɔɔ.' : 'Répondez en bariba.'}
            </p>
          </div>
          {doc.qaQuestions.map((q, i) => (
            <QAField key={i} docId={doc.id} qIdx={i} question={q} lang={lang} />
          ))}
        </div>
      )}

      {/* Bilan */}
      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={handleFinalize}
        className="w-full py-3 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md"
      >
        <Trophy className="w-4 h-4" />
        {lang === 'ba' ? 'Sɔm kpe — A bilan wã' : 'Terminer — Voir le bilan'}
      </motion.button>

      <AnimatePresence>
        {showBilan && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="p-4 rounded-3xl bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-200"
          >
            <div className="flex items-center gap-2 mb-3">
              <Trophy className="w-6 h-6 text-amber-500" />
              <h4 className="text-indigo-800 font-black text-base">
                {lang === 'ba' ? 'Bilan' : 'Bilan'}
              </h4>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between p-2 rounded-lg bg-white">
                <span className="text-gray-600">{lang === 'ba' ? 'Bweseru' : 'Champs remplis'}</span>
                <span className="font-bold text-emerald-600">{filledFields}/{totalFields}</span>
              </div>
              {doc.tableConfig && (
                <div className="flex justify-between p-2 rounded-lg bg-white">
                  <span className="text-gray-600">{lang === 'ba' ? 'Tɛtɛn raasu' : 'Lignes du tableau'}</span>
                  <span className="font-bold text-emerald-600">{filledRows}/{totalRows}</span>
                </div>
              )}
              {qaTotal > 0 && (
                <div className="flex justify-between p-2 rounded-lg bg-white">
                  <span className="text-gray-600">{lang === 'ba' ? 'Bikiabu wisibu' : 'Questions répondues'}</span>
                  <span className="font-bold text-emerald-600">{qaAnswered}/{qaTotal}</span>
                </div>
              )}
              <div className="flex justify-between p-2 rounded-lg bg-indigo-100">
                <span className="text-indigo-700 font-bold">{lang === 'ba' ? 'Kpuro' : 'Total'}</span>
                <span className="font-black text-indigo-800">{completionPct}%</span>
              </div>
            </div>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={onBack}
              className="w-full mt-3 py-2 rounded-xl bg-indigo-500 text-white font-bold text-xs"
            >
              {lang === 'ba' ? 'A wuro tireru bweserun di' : 'Retour à la liste'}
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ============ Main List ============
export default function ClasseGestionN2() {
  const { currentLang } = useFitilaLanguage();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [, forceTick] = useState(0);

  // Refresh on return to list to recompute completion stats
  useEffect(() => {
    if (!selectedId) forceTick(t => t + 1);
  }, [selectedId]);

  const selected = GESTION_N2_DOCUMENTS.find(d => d.id === selectedId);
  const state = getGestionN2State();

  if (selected) {
    return <GestionDocDetail doc={selected} lang={currentLang} onBack={() => setSelectedId(null)} />;
  }

  const completedCount = state.completed.length;

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="p-4 rounded-3xl bg-gradient-to-br from-teal-100 to-emerald-100 border border-teal-200">
        <h3 className="text-teal-800 font-black text-lg">💼 {currentLang === 'ba' ? 'Gobi dwebu' : 'Gestion'}</h3>
        <p className="text-teal-600/70 text-xs mt-1">
          {GESTION_N2_DOCUMENTS.length} {currentLang === 'ba' ? 'tireru bweseru' : 'documents'}
          {completedCount > 0 && ` · ${completedCount} ${currentLang === 'ba' ? 'kpara' : 'terminé(s)'}`}
        </p>
      </div>

      {GESTION_N2_DOCUMENTS.map(doc => {
        const isCompleted = state.completed.includes(doc.id);
        const isSubmitted = !!state.submitted[doc.id];
        return (
          <motion.button
            key={doc.id}
            whileTap={{ scale: 0.97 }}
            onClick={() => setSelectedId(doc.id)}
            className="w-full flex items-center gap-3 p-4 rounded-2xl bg-white border border-gray-100 shadow-sm relative"
          >
            <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${doc.gradient} flex items-center justify-center shadow-md`}>
              <span className="text-2xl">{doc.emoji}</span>
            </div>
            <div className="flex-1 text-left">
              <p className="text-gray-800 font-bold text-sm">{currentLang === 'ba' ? doc.title : doc.titleFr}</p>
              <p className="text-gray-400 text-xs">
                {doc.fields.length} {currentLang === 'ba' ? 'bweseru' : 'champs'}
                {doc.tableConfig ? ' + tableau' : ''}
                {doc.qaQuestions ? ` + ${doc.qaQuestions.length} Q&R` : ''}
              </p>
            </div>
            {isCompleted ? (
              <div className="px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold flex items-center gap-1">
                <Trophy className="w-3 h-3" />
                {currentLang === 'ba' ? 'Kpara' : 'Terminé'}
              </div>
            ) : isSubmitted ? (
              <div className="px-2 py-1 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold flex items-center gap-1">
                <Check className="w-3 h-3" />
                {currentLang === 'ba' ? 'Geruru' : 'Soumis'}
              </div>
            ) : (
              <ChevronRight className="w-4 h-4 text-gray-300" />
            )}
          </motion.button>
        );
      })}
    </div>
  );
}
