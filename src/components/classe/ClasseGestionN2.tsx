import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, Calculator, RotateCcw, Eye, EyeOff } from 'lucide-react';
import { useFitilaLanguage } from '@/contexts/FitilaLanguageContext';
import { GESTION_N2_DOCUMENTS, GestionDocument } from '@/data/classeContentN2Gestion';

function GestionDocDetail({ doc, lang, onBack }: { doc: GestionDocument; lang: string; onBack: () => void }) {
  const [formData, setFormData] = useState<Record<string, string>>(doc.example || {});
  const [tableData, setTableData] = useState<string[][]>(() => {
    if (!doc.tableConfig) return [];
    return Array.from({ length: doc.tableConfig.rows }, () =>
      Array.from({ length: doc.tableConfig!.headers.length }, () => '')
    );
  });
  const [showFormula, setShowFormula] = useState(false);

  const updateField = (key: string, value: string) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const updateCell = (row: number, col: number, value: string) => {
    setTableData(prev => {
      const next = prev.map(r => [...r]);
      next[row][col] = value;
      return next;
    });
  };

  // Compute fields
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

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className={`p-4 rounded-3xl bg-gradient-to-br ${doc.gradient} shadow-lg`}>
        <div className="flex items-center gap-3">
          <span className="text-4xl">{doc.emoji}</span>
          <div>
            <h3 className="text-white font-black text-lg">{lang === 'ba' ? doc.title : doc.titleFr}</h3>
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
                type={field.type === 'number' ? 'number' : 'text'}
                value={formData[field.key] || ''}
                onChange={(e) => updateField(field.key, e.target.value)}
                placeholder={field.placeholder}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2 text-xs focus:border-indigo-400 outline-none"
              />
            )}
          </div>
        ))}
      </div>

      {/* Interactive table */}
      {doc.tableConfig && (
        <div className="rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-3 bg-indigo-50 border-b border-indigo-100">
            <h4 className="text-indigo-700 font-bold text-xs">📊 {lang === 'ba' ? 'Tɛtɛ' : 'Tableau'}</h4>
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
                          className="w-full bg-transparent p-1 text-xs outline-none focus:bg-indigo-50 rounded"
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
    </div>
  );
}

export default function ClasseGestionN2() {
  const { currentLang } = useFitilaLanguage();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selected = GESTION_N2_DOCUMENTS.find(d => d.id === selectedId);

  if (selected) {
    return <GestionDocDetail doc={selected} lang={currentLang} onBack={() => setSelectedId(null)} />;
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="p-4 rounded-3xl bg-gradient-to-br from-teal-100 to-emerald-100 border border-teal-200">
        <h3 className="text-teal-800 font-black text-lg">💼 {currentLang === 'ba' ? 'Gobi dwebu' : 'Gestion'}</h3>
        <p className="text-teal-600/70 text-xs mt-1">{GESTION_N2_DOCUMENTS.length} {currentLang === 'ba' ? 'tireru bweseru' : 'documents'}</p>
      </div>

      {GESTION_N2_DOCUMENTS.map(doc => (
        <motion.button
          key={doc.id}
          whileTap={{ scale: 0.97 }}
          onClick={() => setSelectedId(doc.id)}
          className="w-full flex items-center gap-3 p-4 rounded-2xl bg-white border border-gray-100 shadow-sm"
        >
          <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${doc.gradient} flex items-center justify-center shadow-md`}>
            <span className="text-2xl">{doc.emoji}</span>
          </div>
          <div className="flex-1 text-left">
            <p className="text-gray-800 font-bold text-sm">{currentLang === 'ba' ? doc.title : doc.titleFr}</p>
            <p className="text-gray-400 text-xs">{doc.fields.length} {currentLang === 'ba' ? 'bweseru' : 'champs'}{doc.tableConfig ? ' + tableau' : ''}</p>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-300" />
        </motion.button>
      ))}
    </div>
  );
}
