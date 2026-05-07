/**
 * BaribaSmartInput
 * ───────────────────────────────
 * Variante single-line de BaribaSmartTextarea.
 * Mêmes capacités : prédiction phonétique, clavier Baatonum, écriture manuscrite IA.
 * Idéale pour les champs courts (réponses acceptées, mots-clés, etc.).
 */
import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Keyboard, PenTool, X, Eraser, Loader2 } from 'lucide-react';
import { usePhoneticSuggestions, PhoneticEntry } from '@/hooks/usePhoneticSuggestions';
import { supabase } from '@/integrations/supabase/client';

const BARIBA_CHARS = [
  'ɔ', 'ɛ', 'ŋ', 'ã', 'ɔ̀', 'ɔ́', 'ɔ̃',
  'ɛ̀', 'ɛ́', 'ɛ̃', 'à', 'á', 'è', 'é',
  'ì', 'í', 'ĩ', 'ò', 'ó', 'ù', 'ú', 'ũ',
  'ǹ', 'Ɔ', 'Ɛ', 'Ŋ',
];

interface Props {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export default function BaribaSmartInput({ value, onChange, placeholder, className = '', disabled }: Props) {
  const { getSuggestions } = usePhoneticSuggestions();
  const [showKeyboard, setShowKeyboard] = useState(false);
  const [showCanvas, setShowCanvas] = useState(false);
  const [suggestions, setSuggestions] = useState<PhoneticEntry[]>([]);
  const [hwCandidates, setHwCandidates] = useState<string[]>([]);
  const [hwLoading, setHwLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);
  const recognizeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const getCurrentWord = useCallback((text: string, cursor: number): string => {
    const before = text.slice(0, cursor);
    const m = before.match(/[\wɔɛŋãàáèéìíòóùúũĩɔ̀ɔ́ɔ̃ɛ̀ɛ́ɛ̃ǹ]+$/u);
    return m ? m[0] : '';
  }, []);

  useEffect(() => {
    if (!value) { setSuggestions([]); return; }
    const cursor = inputRef.current?.selectionStart ?? value.length;
    const w = getCurrentWord(value, cursor);
    if (w.length >= 2) setSuggestions(getSuggestions(w, 5));
    else setSuggestions([]);
  }, [value, getSuggestions, getCurrentWord]);

  const insertAtCursor = useCallback((text: string) => {
    const el = inputRef.current;
    if (!el) { onChange(value + text); return; }
    const start = el.selectionStart ?? value.length;
    const end = el.selectionEnd ?? value.length;
    const newVal = value.slice(0, start) + text + value.slice(end);
    onChange(newVal);
    requestAnimationFrame(() => {
      el.selectionStart = el.selectionEnd = start + text.length;
      el.focus();
    });
  }, [value, onChange]);

  const insertSuggestion = useCallback((word: string) => {
    const el = inputRef.current;
    const cursor = el?.selectionStart ?? value.length;
    const cw = getCurrentWord(value, cursor);
    const before = value.slice(0, cursor - cw.length);
    const after = value.slice(cursor);
    onChange(before + word + after);
    setSuggestions([]);
    requestAnimationFrame(() => el?.focus());
  }, [value, onChange, getCurrentWord]);

  const triggerRecognition = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const hasContent = imageData.data.some((v, i) => i % 4 === 3 && v > 0);
    if (!hasContent) return;
    setHwLoading(true);
    try {
      const base64 = canvas.toDataURL('image/png');
      const { data } = await supabase.functions.invoke('recognize-handwriting', { body: { image_base64: base64 } });
      setHwCandidates((data?.candidates || []).slice(0, 5));
    } catch (err) {
      console.error('HW recognition failed', err);
    } finally {
      setHwLoading(false);
    }
  }, []);

  const scheduleRecognition = useCallback(() => {
    if (recognizeTimer.current) clearTimeout(recognizeTimer.current);
    recognizeTimer.current = setTimeout(triggerRecognition, 800);
  }, [triggerRecognition]);

  const clearCanvas = () => {
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx && canvasRef.current) ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    setHwCandidates([]);
  };

  const insertHwCandidate = (c: string) => {
    insertAtCursor(c);
    clearCanvas();
  };

  const getPos = (e: React.TouchEvent | React.MouseEvent) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    if ('touches' in e) return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
    return { x: (e as React.MouseEvent).clientX - rect.left, y: (e as React.MouseEvent).clientY - rect.top };
  };

  const startDraw = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    isDrawing.current = true;
    const p = getPos(e);
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) { ctx.beginPath(); ctx.moveTo(p.x, p.y); }
  };
  const draw = (e: React.TouchEvent | React.MouseEvent) => {
    if (!isDrawing.current) return;
    e.preventDefault();
    const p = getPos(e);
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) { ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.strokeStyle = '#1e293b'; ctx.lineTo(p.x, p.y); ctx.stroke(); }
  };
  const stopDraw = () => { if (isDrawing.current) { isDrawing.current = false; scheduleRecognition(); } };

  useEffect(() => () => { if (recognizeTimer.current) clearTimeout(recognizeTimer.current); }, []);

  return (
    <div className="relative">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          className={`w-full border rounded-xl p-2.5 text-gray-700 text-sm placeholder:text-gray-300 focus:ring-1 outline-none pr-16 ${className}`}
          placeholder={placeholder}
          value={value}
          disabled={disabled}
          onChange={e => onChange(e.target.value)}
        />
        <div className="absolute top-1/2 -translate-y-1/2 right-1.5 flex gap-1">
          <button type="button" onClick={() => { setShowKeyboard(!showKeyboard); setShowCanvas(false); }}
            className={`p-1.5 rounded-lg transition-colors ${showKeyboard ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
            <Keyboard className="w-3.5 h-3.5" />
          </button>
          <button type="button" onClick={() => { setShowCanvas(!showCanvas); setShowKeyboard(false); }}
            className={`p-1.5 rounded-lg transition-colors ${showCanvas ? 'bg-purple-500 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
            <PenTool className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {suggestions.length > 0 && (
          <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="flex gap-1.5 flex-wrap mt-1.5">
            {suggestions.map((s, i) => (
              <button key={i} type="button" onClick={() => insertSuggestion(s.word)}
                className="px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs font-medium hover:bg-amber-100">
                {s.word}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showKeyboard && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className="mt-1.5 p-2 rounded-xl bg-white border border-gray-200 shadow-md">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-gray-400 text-[10px] font-bold uppercase">Baatonum</span>
              <button type="button" onClick={() => setShowKeyboard(false)} className="text-gray-400"><X className="w-3 h-3" /></button>
            </div>
            <div className="flex gap-1 flex-wrap">
              {BARIBA_CHARS.map(c => (
                <button key={c} type="button" onClick={() => insertAtCursor(c)}
                  className="w-9 h-9 rounded-lg bg-gray-50 border border-gray-200 text-gray-800 text-sm font-bold hover:bg-amber-50 hover:border-amber-300">
                  {c}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showCanvas && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className="mt-1.5 rounded-xl border border-purple-200 bg-white shadow-md overflow-hidden">
            <div className="flex items-center justify-between px-2.5 py-1.5 bg-purple-50 border-b border-purple-100">
              <span className="text-purple-600 text-[10px] font-bold uppercase flex items-center gap-1">
                <PenTool className="w-3 h-3" /> Écriture manuscrite
              </span>
              <div className="flex gap-1 items-center">
                {hwLoading && <Loader2 className="w-3 h-3 animate-spin text-purple-400" />}
                <button type="button" onClick={clearCanvas} className="p-1 rounded bg-white border border-purple-200 text-purple-500"><Eraser className="w-3 h-3" /></button>
                <button type="button" onClick={() => setShowCanvas(false)} className="p-1 rounded bg-white border border-purple-200 text-purple-500"><X className="w-3 h-3" /></button>
              </div>
            </div>
            <canvas ref={canvasRef} width={280} height={120}
              className="w-full bg-white cursor-crosshair touch-none"
              onMouseDown={startDraw} onMouseMove={draw} onMouseUp={stopDraw} onMouseLeave={stopDraw}
              onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={stopDraw} />
            {(hwCandidates.length > 0 || hwLoading) && (
              <div className="px-2.5 py-2 border-t border-purple-100 bg-gradient-to-r from-purple-50 to-violet-50">
                {hwLoading && hwCandidates.length === 0 ? (
                  <div className="flex items-center gap-2 text-purple-400 text-xs"><Loader2 className="w-3.5 h-3.5 animate-spin" />Reconnaissance…</div>
                ) : (
                  <div className="flex gap-1.5 flex-wrap">
                    {hwCandidates.map((c, i) => (
                      <button key={`${c}-${i}`} type="button" onClick={() => insertHwCandidate(c)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-bold ${i === 0 ? 'bg-purple-500 text-white' : 'bg-white border border-purple-200 text-purple-700'}`}>
                        {c}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            <div className="flex gap-1 flex-wrap p-2 border-t border-purple-100 bg-purple-50/50">
              {['a','b','d','e','g','i','k','m','n','o','r','s','u','w','y','ɔ','ɛ','ŋ','ã','ɔ̃','ɛ̃'].map(c => (
                <button key={c} type="button" onClick={() => insertAtCursor(c)}
                  className="w-7 h-7 rounded bg-white border border-purple-200 text-gray-700 text-xs font-bold hover:bg-purple-100">
                  {c}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
