import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ChevronRight, ArrowLeft, Check, X, RotateCcw, Send, Edit3 } from 'lucide-react';
import { useFitilaLanguage } from '@/contexts/FitilaLanguageContext';
import {
  CALCUL_LESSONS,
  CALCUL_EXERCISES,
  BARIBA_NUMBERS,
  MathExercise,
  saveCalculScore,
  getClasseProgress,
  saveCalculAnswer,
  getCalculAnswer,
} from '@/data/classeContent';
import {
  CALCUL_N2_LESSONS,
  CALCUL_N2_EXERCISES,
  getClasseN2Progress,
  saveN2CalculScore,
  saveN2CalculAnswer,
  getN2CalculAnswer,
} from '@/data/classeContentN2';
import BaribaSmartTextarea from './BaribaSmartTextarea';

type CalculLevel = 'N1' | 'N2';

const EXERCISE_SECTION_REGEX = /sɔmaa|sosibu|wĩabu|dabiasibu|bɔnu kosibu|bɔkurabu|sɔmburu|sɔm gbiikiru/i;

// ============ OPERATION PARSER ============
interface ParsedOperation extends MathExercise {
  raw: string;
}

interface BaribaNumberExo {
  kind: 'bariba-number';
  digits: string;
  value: number | null;
  expectedText: string | null;
  raw: string;
}

type AutoExo = ParsedOperation | BaribaNumberExo;

function safeEval(a: number, b: number, op: 'addition' | 'subtraction' | 'multiplication' | 'division'): { expected: number; remainder?: number } {
  switch (op) {
    case 'addition': return { expected: a + b };
    case 'subtraction': return { expected: a - b };
    case 'multiplication': return { expected: a * b };
    case 'division':
      if (b === 0) return { expected: 0 };
      const q = Math.floor(a / b);
      const r = a - q * b;
      return { expected: q, remainder: r };
  }
}

function buildBaribaText(n: number): string | null {
  if (BARIBA_NUMBERS[n]) return BARIBA_NUMBERS[n];
  if (n < 0 || n > 99) return null;
  // simple decomposition for 11-99
  if (n < 20) {
    const t = BARIBA_NUMBERS[10];
    const u = BARIBA_NUMBERS[n - 10];
    if (t && u) return `${t} ka ${u}`;
  }
  const tens = Math.floor(n / 10) * 10;
  const units = n % 10;
  const t = BARIBA_NUMBERS[tens];
  const u = units > 0 ? BARIBA_NUMBERS[units] : null;
  if (t && units === 0) return t;
  if (t && u) return `${t} ka ${u}`;
  return null;
}

function parseAutoExercises(paragraphs: string[]): AutoExo[] {
  const out: AutoExo[] = [];
  // Combine consecutive vertical-column paragraphs into single addition stacks
  const lines = paragraphs.map(p => p.trim()).filter(Boolean);

  // Patterns
  const opRegex = /(\d{1,6}(?:[.,]\d+)?)\s*([+\-x×X*:÷\/])\s*(\d{1,6}(?:[.,]\d+)?)\s*=?/g;

  for (const line of lines) {
    let foundOp = false;
    const matches = [...line.matchAll(opRegex)];
    for (const m of matches) {
      const a = parseInt(m[1].replace(',', '.'), 10);
      const b = parseInt(m[3].replace(',', '.'), 10);
      if (isNaN(a) || isNaN(b)) continue;
      const sym = m[2];
      let type: ParsedOperation['type'];
      if (sym === '+') type = 'addition';
      else if (sym === '-') type = 'subtraction';
      else if (/[x×X*]/.test(sym)) type = 'multiplication';
      else if (/[:÷\/]/.test(sym)) type = 'division';
      else continue;
      const { expected, remainder } = safeEval(a, b, type);
      out.push({
        type,
        operands: [a, b],
        expected,
        remainder,
        label: `${a} ${sym} ${b}`,
        raw: m[0],
      });
      foundOp = true;
    }
    if (foundOp) continue;

    // Bariba number-writing exercise: line with 3+ single digits separated by spaces
    const digitsOnly = line.replace(/[.\-]/g, '').trim();
    const digitTokens = digitsOnly.split(/\s+/).filter(t => /^\d{1,3}$/.test(t));
    if (digitTokens.length >= 3 && digitTokens.length <= 12 && digitTokens.every(t => t.length <= 2)) {
      // Each digit becomes its own write-in-bariba exercise
      for (const tok of digitTokens) {
        const n = parseInt(tok, 10);
        const expected = buildBaribaText(n);
        out.push({
          kind: 'bariba-number',
          digits: tok,
          value: n,
          expectedText: expected,
          raw: tok,
        });
      }
    }
  }

  return out;
}

// ============ MATH OPERATION EXERCISE ============
function MathOperationExercise({ exercise, index, onResult }: {
  exercise: MathExercise;
  index: number;
  onResult: (correct: boolean) => void;
}) {
  const [answer, setAnswer] = useState('');
  const [remainder, setRemainder] = useState('');
  const [checked, setChecked] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);

  const check = () => {
    const ans = parseInt(answer);
    let correct = ans === exercise.expected;
    if (exercise.type === 'division' && exercise.remainder !== undefined) {
      correct = correct && parseInt(remainder) === exercise.remainder;
    }
    setIsCorrect(correct);
    setChecked(true);
    onResult(correct);
  };

  const symbols: Record<string, string> = {
    addition: '+', subtraction: '−', multiplication: '×', division: '÷', count: '=',
  };

  if (exercise.type === 'count') {
    return (
      <div className={`p-4 rounded-2xl border shadow-sm ${checked ? (isCorrect ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200') : 'bg-white border-gray-100'}`}>
        <div className="flex gap-1 flex-wrap mb-3">
          {Array.from({ length: exercise.expected }).map((_, i) => (
            <div key={i} className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-indigo-400 shadow-md flex items-center justify-center">
              <span className="text-white text-xs font-bold">{i + 1}</span>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-gray-600 text-sm font-medium">{exercise.label} =</span>
          <input
            type="number"
            className="w-16 bg-gray-50 border border-gray-200 rounded-xl p-2 text-center text-lg font-bold focus:border-blue-400 outline-none"
            value={answer}
            onChange={e => { setAnswer(e.target.value); setChecked(false); }}
            placeholder="?"
          />
          {!checked ? (
            <motion.button whileTap={{ scale: 0.9 }} onClick={check} disabled={!answer}
              className="px-3 py-2 rounded-lg bg-blue-500 text-white text-xs font-bold disabled:opacity-30">✓</motion.button>
          ) : (
            isCorrect ? <Check className="w-5 h-5 text-emerald-500" /> : <X className="w-5 h-5 text-red-400" />
          )}
        </div>
        {checked && !isCorrect && <p className="text-red-500 text-xs mt-1">= {exercise.expected}</p>}
      </div>
    );
  }

  return (
    <div className={`p-4 rounded-2xl border shadow-sm ${checked ? (isCorrect ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200') : 'bg-white border-gray-100'}`}>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs font-bold text-gray-400">#{index + 1}</span>
      </div>
      <div className="font-mono text-right space-y-0.5 mb-3">
        <p className="text-gray-800 text-xl font-bold tracking-wider">{exercise.operands[0].toLocaleString()}</p>
        <p className="text-gray-800 text-xl font-bold tracking-wider">
          <span className="text-blue-500">{symbols[exercise.type]}</span> {exercise.operands[1].toLocaleString()}
        </p>
        <div className="border-t-2 border-gray-400 pt-1">
          <div className="flex items-center justify-end gap-2">
            <input
              type="number"
              className="w-28 bg-gray-50 border border-gray-200 rounded-lg p-2 text-right text-xl font-bold focus:border-blue-400 outline-none"
              value={answer}
              onChange={e => { setAnswer(e.target.value); setChecked(false); }}
              placeholder="?"
            />
            {exercise.type === 'division' && exercise.remainder !== undefined && (
              <div className="flex items-center gap-1">
                <span className="text-gray-400 text-sm">R:</span>
                <input
                  type="number"
                  className="w-14 bg-gray-50 border border-gray-200 rounded-lg p-2 text-center text-lg font-bold focus:border-blue-400 outline-none"
                  value={remainder}
                  onChange={e => { setRemainder(e.target.value); setChecked(false); }}
                  placeholder="?"
                />
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between">
        {!checked ? (
          <motion.button whileTap={{ scale: 0.95 }} onClick={check} disabled={!answer}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 text-white text-sm font-bold disabled:opacity-30 shadow-md">
            ✓ Yaayasia
          </motion.button>
        ) : (
          isCorrect ? (
            <span className="text-emerald-600 text-sm font-bold flex items-center gap-1"><Check className="w-4 h-4" /> Kɔsa!</span>
          ) : (
            <span className="text-red-500 text-sm font-bold flex items-center gap-1">
              <X className="w-4 h-4" /> = {exercise.expected}{exercise.remainder !== undefined ? ` R ${exercise.remainder}` : ''}
            </span>
          )
        )}
      </div>
    </div>
  );
}

// ============ BARIBA NUMBER WRITING EXERCISE ============
function BaribaNumberExercise({ exo, index, onResult }: {
  exo: BaribaNumberExo;
  index: number;
  onResult: (correct: boolean) => void;
}) {
  const [text, setText] = useState('');
  const [checked, setChecked] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);

  const check = () => {
    const norm = text.trim().toLowerCase().replace(/\s+/g, ' ');
    let ok = norm.length > 0;
    if (exo.expectedText) {
      ok = norm === exo.expectedText.toLowerCase();
    }
    setIsCorrect(ok);
    setChecked(true);
    onResult(ok);
  };

  return (
    <div className={`p-4 rounded-2xl border shadow-sm ${checked ? (isCorrect ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200') : 'bg-white border-gray-100'}`}>
      <div className="flex items-center gap-3 mb-2">
        <span className="text-xs font-bold text-gray-400">#{index + 1}</span>
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-400 flex items-center justify-center shadow-md">
          <span className="text-white text-2xl font-black">{exo.digits}</span>
        </div>
        <span className="text-gray-500 text-xs font-medium">A yoruo bariba sɔɔ</span>
      </div>
      <BaribaSmartTextarea
        value={text}
        onChange={(v) => { setText(v); setChecked(false); }}
        rows={1}
        className="bg-gray-50 border-gray-200 focus:border-amber-400"
        placeholder="ex: tia, yiru, ita..."
      />
      <div className="flex items-center justify-between mt-2">
        {!checked ? (
          <motion.button whileTap={{ scale: 0.95 }} onClick={check} disabled={!text.trim()}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-bold disabled:opacity-30 shadow-md">
            ✓ A geruo
          </motion.button>
        ) : (
          <div className="flex items-center gap-2 text-sm font-bold">
            {isCorrect ? (
              <span className="text-emerald-600 flex items-center gap-1"><Check className="w-4 h-4" /> Kɔsa!</span>
            ) : exo.expectedText ? (
              <span className="text-amber-600 flex items-center gap-1"><X className="w-4 h-4" /> {exo.expectedText}</span>
            ) : (
              <span className="text-emerald-600 flex items-center gap-1"><Check className="w-4 h-4" /> A yorua</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ============ Q&A FIELD ============
const SECTION_COLORS: Record<string, { bg: string; border: string; accent: string; btn: string }> = {
  I: { bg: 'bg-blue-50', border: 'border-blue-200', accent: 'text-blue-600', btn: 'from-blue-500 to-indigo-500' },
  II: { bg: 'bg-purple-50', border: 'border-purple-200', accent: 'text-purple-600', btn: 'from-purple-500 to-pink-500' },
  III: { bg: 'bg-orange-50', border: 'border-orange-200', accent: 'text-orange-600', btn: 'from-orange-500 to-amber-500' },
  IV: { bg: 'bg-teal-50', border: 'border-teal-200', accent: 'text-teal-600', btn: 'from-teal-500 to-cyan-500' },
  V: { bg: 'bg-rose-50', border: 'border-rose-200', accent: 'text-rose-600', btn: 'from-rose-500 to-pink-500' },
};

function getSectionColor(sectionName: string) {
  const key = sectionName.trim().split('-')[0].trim();
  return SECTION_COLORS[key] || SECTION_COLORS['I'];
}

function QuestionAnswerField({
  level,
  lessonId,
  sectionName,
  qIdx,
  question,
  onSubmitted,
}: {
  level: CalculLevel;
  lessonId: number;
  sectionName: string;
  qIdx: number;
  question: string;
  onSubmitted: (hasAnswer: boolean) => void;
}) {
  const sectionKey = sectionName.trim().split('-')[0].trim();
  const getAns = level === 'N2' ? getN2CalculAnswer : getCalculAnswer;
  const saveAns = level === 'N2' ? saveN2CalculAnswer : saveCalculAnswer;
  const initial = useMemo(() => getAns(lessonId, sectionKey, qIdx), [lessonId, sectionKey, qIdx, level]);
  const [text, setText] = useState(initial);
  const [submitted, setSubmitted] = useState(!!initial);
  const [editing, setEditing] = useState(!initial);
  const colors = getSectionColor(sectionName);

  useEffect(() => {
    onSubmitted(!!initial);
  }, []); // eslint-disable-line

  const submit = () => {
    if (!text.trim()) return;
    saveAns(lessonId, sectionKey, qIdx, text);
    setSubmitted(true);
    setEditing(false);
    onSubmitted(true);
  };

  return (
    <div className={`p-3 rounded-2xl border shadow-sm ${colors.bg} ${colors.border}`}>
      <p className="text-gray-800 text-sm font-medium mb-2">{question}</p>
      {editing ? (
        <>
          <BaribaSmartTextarea
            value={text}
            onChange={setText}
            rows={2}
            className="bg-white border-gray-200"
            placeholder="A wunɛn wisi yoruo..."
          />
          <div className="flex items-center gap-2 mt-2">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={submit}
              disabled={!text.trim()}
              className={`px-4 py-2 rounded-xl bg-gradient-to-r ${colors.btn} text-white text-xs font-bold disabled:opacity-30 shadow-md flex items-center gap-1`}
            >
              <Send className="w-3 h-3" /> A geruo
            </motion.button>
            {submitted && (
              <button onClick={() => setEditing(false)} className="text-gray-500 text-xs font-bold">
                Kɔsa
              </button>
            )}
          </div>
        </>
      ) : (
        <div className="flex items-start gap-2">
          <Check className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-gray-700 text-sm whitespace-pre-wrap">{text}</p>
            <button
              onClick={() => setEditing(true)}
              className={`mt-1 text-xs font-bold ${colors.accent} flex items-center gap-1`}
            >
              <Edit3 className="w-3 h-3" /> Maa yorubu
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ============ MAIN VIEW ============
interface ClasseCalculViewProps {
  level?: CalculLevel;
}

export default function ClasseCalculView({ level = 'N1' }: ClasseCalculViewProps) {
  const { currentLang } = useFitilaLanguage();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [opResults, setOpResults] = useState<Record<number, boolean>>({});
  const [qaSubmitted, setQaSubmitted] = useState<Record<string, boolean>>({});
  const [showExercises, setShowExercises] = useState(false);
  const [resetKey, setResetKey] = useState(0);

  // Resolve data sources by level
  const lessonsSource = level === 'N2' ? CALCUL_N2_LESSONS : CALCUL_LESSONS;
  const exercisesSource = level === 'N2' ? CALCUL_N2_EXERCISES : CALCUL_EXERCISES;
  const progress = level === 'N2' ? getClasseN2Progress() : getClasseProgress();
  const saveScore = level === 'N2' ? saveN2CalculScore : saveCalculScore;

  // Reset selection when level changes
  useEffect(() => {
    setSelectedId(null);
    setOpResults({});
    setQaSubmitted({});
    setShowExercises(false);
  }, [level]);

  const selected = lessonsSource.find(l => l.id === selectedId);
  const manualExercises = selectedId ? exercisesSource[selectedId] : undefined;

  // Auto-parsed operations from paragraphs
  const autoExos = useMemo<AutoExo[]>(() => {
    if (!selected) return [];
    return parseAutoExercises(selected.paragraphs);
  }, [selected]);

  // Detect SƆMAA / exercise sections (auto-exercises rendering)
  const hasSomaa = useMemo(() => {
    if (!selected) return false;
    return Object.keys(selected.sections).some(k => EXERCISE_SECTION_REGEX.test(k));
  }, [selected]);

  const interactiveExos: AutoExo[] = manualExercises
    ? manualExercises.map(ex => ({ ...ex, raw: ex.label || '' } as ParsedOperation))
    : autoExos;

  const handleOpResult = (i: number, correct: boolean) => {
    setOpResults(prev => ({ ...prev, [i]: correct }));
  };
  const handleQaSubmitted = (key: string, has: boolean) => {
    setQaSubmitted(prev => ({ ...prev, [key]: has }));
  };

  const totalCorrect = Object.values(opResults).filter(Boolean).length;
  const totalAnswered = Object.keys(opResults).length;
  const totalQa = Object.values(qaSubmitted).filter(Boolean).length;

  const reset = () => {
    setOpResults({});
    setShowExercises(false);
    setResetKey(k => k + 1);
    setTimeout(() => setShowExercises(true), 100);
  };

  const finishLesson = () => {
    if (selectedId) saveScore(selectedId, totalCorrect, interactiveExos.length || 1);
    setSelectedId(null);
    setShowExercises(false);
    setOpResults({});
    setQaSubmitted({});
  };

  // Q&A sections (excluding exercise sections, which are rendered as auto-exercises)
  const qaSections = useMemo(() => {
    if (!selected) return [] as Array<[string, string[]]>;
    return Object.entries(selected.sections).filter(([name, qs]) => {
      if (EXERCISE_SECTION_REGEX.test(name)) return false;
      return Array.isArray(qs) && qs.length > 0;
    }) as Array<[string, string[]]>;
  }, [selected]);

  if (selected) {
    const totalQuestions = qaSections.reduce((acc, [, qs]) => acc + qs.length, 0);

    return (
      <div className="space-y-4">
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => { setSelectedId(null); setShowExercises(false); setOpResults({}); setQaSubmitted({}); }}
          className="flex items-center gap-1 text-amber-600 text-sm font-bold"
        >
          <ArrowLeft className="w-4 h-4" /> {currentLang === 'ba' ? 'Yeni' : 'Retour'}
        </motion.button>

        <div className="p-4 rounded-3xl bg-gradient-to-br from-blue-100 to-indigo-100 border border-blue-200 shadow-md">
          <div className="flex items-center justify-between">
            <h2 className="text-gray-800 font-black text-xl">{selected.title || `Dooru ${selected.id}`}</h2>
            {progress.calculScores[selected.id] && (
              <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold">
                {progress.calculScores[selected.id].score}/{progress.calculScores[selected.id].total}
              </span>
            )}
          </div>
        </div>

        {selected.images.length > 0 && (
          <div className="rounded-2xl overflow-hidden border border-gray-200 shadow-sm bg-white">
            <img src={selected.images[0]} alt={selected.title} className="w-full h-auto object-contain max-h-64" />
          </div>
        )}

        {selected.text && (
          <div className="p-4 rounded-2xl bg-white border border-gray-100 shadow-sm">
            <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-line">{selected.text}</p>
          </div>
        )}

        {/* Render paragraphs only when there's no Sɔmaa section (since they'll be reused as exercises) */}
        {!hasSomaa && selected.paragraphs.length > 0 && !selected.text && (
          <div className="p-4 rounded-2xl bg-white border border-gray-100 shadow-sm space-y-1">
            {selected.paragraphs.map((p, i) => (
              <p key={i} className="text-gray-700 text-sm font-mono">{p}</p>
            ))}
          </div>
        )}

        {/* Q&A Sections (interactive) */}
        {qaSections.map(([sec, questions]) => {
          const colors = getSectionColor(sec);
          return (
            <div key={sec} className={`p-4 rounded-2xl bg-white border shadow-sm ${colors.border}`}>
              <p className={`text-xs uppercase font-bold mb-3 ${colors.accent}`}>{sec}</p>
              <div className="space-y-3">
                {questions.map((q, i) => (
                  <QuestionAnswerField
                    key={`${sec}_${i}`}
                    level={level}
                    lessonId={selected.id}
                    sectionName={sec}
                    qIdx={i}
                    question={q}
                    onSubmitted={(has) => handleQaSubmitted(`${sec}_${i}`, has)}
                  />
                ))}
              </div>
            </div>
          );
        })}

        {/* SƆMAA — auto-generated interactive exercises */}
        {(hasSomaa || manualExercises) && interactiveExos.length > 0 && (
          <div className="space-y-3">
            {!showExercises ? (
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowExercises(true)}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-rose-500 to-pink-500 text-white font-bold text-lg shadow-lg shadow-rose-200 flex items-center justify-center gap-2"
              >
                🧮 {currentLang === 'ba' ? 'SƆMAA — A ko sɔmaa' : 'SƆMAA — Faire les exercices'}
              </motion.button>
            ) : (
              <>
                <div className="flex items-center justify-between px-1">
                  <p className="text-gray-700 font-bold text-sm">🧮 SƆMAA</p>
                  <motion.button whileTap={{ scale: 0.9 }} onClick={reset}
                    className="flex items-center gap-1 text-rose-500 text-xs font-bold">
                    <RotateCcw className="w-3 h-3" /> {currentLang === 'ba' ? 'Maa ko' : 'Recommencer'}
                  </motion.button>
                </div>

                {interactiveExos.map((ex, i) => (
                  'kind' in ex ? (
                    <BaribaNumberExercise
                      key={`bn_${resetKey}_${i}`}
                      exo={ex}
                      index={i}
                      onResult={(correct) => handleOpResult(i, correct)}
                    />
                  ) : (
                    <MathOperationExercise
                      key={`op_${resetKey}_${i}`}
                      exercise={ex}
                      index={i}
                      onResult={(correct) => handleOpResult(i, correct)}
                    />
                  )
                ))}
              </>
            )}
          </div>
        )}

        {/* Final summary panel */}
        {(totalAnswered > 0 || totalQa > 0) && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-3xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 shadow-md space-y-3"
          >
            <p className="text-gray-800 font-black text-lg text-center">
              {currentLang === 'ba' ? 'A win sɔmburu' : 'Bilan de la leçon'}
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white rounded-2xl p-3 text-center border border-gray-100">
                <p className="text-gray-500 text-xs font-medium mb-1">SƆMAA</p>
                <p className="text-gray-800 font-black text-xl">{totalCorrect}/{interactiveExos.length || 0}</p>
              </div>
              <div className="bg-white rounded-2xl p-3 text-center border border-gray-100">
                <p className="text-gray-500 text-xs font-medium mb-1">Q&R</p>
                <p className="text-gray-800 font-black text-xl">{totalQa}/{totalQuestions}</p>
              </div>
            </div>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={finishLesson}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold shadow-md"
            >
              ✓ {currentLang === 'ba' ? 'Sɔm kpe' : 'Terminer'}
            </motion.button>
          </motion.div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {lessonsSource.map((lesson, i) => {
        const calcScore = progress.calculScores[lesson.id];
        const hasInteractive = !!exercisesSource[lesson.id] || Object.keys(lesson.sections).some(k => EXERCISE_SECTION_REGEX.test(k));
        return (
          <motion.button
            key={lesson.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setSelectedId(lesson.id)}
            className="w-full flex items-center gap-3 p-4 rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-md transition-all"
          >
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-md ${
              calcScore ? 'bg-gradient-to-br from-emerald-400 to-teal-400' : level === 'N2' ? 'bg-gradient-to-br from-indigo-400 to-purple-400' : 'bg-gradient-to-br from-blue-400 to-indigo-400'
            }`}>
              <span className="text-2xl">{hasInteractive ? '🧮' : '🔢'}</span>
            </div>
            <div className="flex-1 text-left">
              <p className="text-gray-800 font-semibold text-sm">{lesson.title || `Dooru ${lesson.id}`}</p>
              <p className="text-gray-400 text-xs">p.{lesson.page}</p>
            </div>
            {calcScore && (
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-600 text-xs font-bold">
                {calcScore.score}/{calcScore.total}
              </span>
            )}
            <ChevronRight className="w-4 h-4 text-gray-300" />
          </motion.button>
        );
      })}
    </div>
  );
}

