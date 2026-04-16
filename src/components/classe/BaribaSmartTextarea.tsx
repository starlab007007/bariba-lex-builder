import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Keyboard, PenTool, X, Eraser, Check } from 'lucide-react';
import { usePhoneticSuggestions, PhoneticEntry } from '@/hooks/usePhoneticSuggestions';

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
  rows?: number;
  className?: string;
  disabled?: boolean;
}

export default function BaribaSmartTextarea({ value, onChange, placeholder, rows = 2, className = '', disabled }: Props) {
  const { getSuggestions } = usePhoneticSuggestions();
  const [showKeyboard, setShowKeyboard] = useState(false);
  const [showCanvas, setShowCanvas] = useState(false);
  const [suggestions, setSuggestions] = useState<PhoneticEntry[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });

  // Extract current word being typed
  const getCurrentWord = useCallback((text: string, cursorPos: number): string => {
    const before = text.slice(0, cursorPos);
    const match = before.match(/[\wɔɛŋãàáèéìíòóùúũĩɔ̀ɔ́ɔ̃ɛ̀ɛ́ɛ̃ǹ]+$/u);
    return match ? match[0] : '';
  }, []);

  // Update suggestions on value change
  useEffect(() => {
    if (!value) { setSuggestions([]); return; }
    const cursor = textareaRef.current?.selectionStart ?? value.length;
    const word = getCurrentWord(value, cursor);
    if (word.length >= 2) {
      const results = getSuggestions(word, 5);
      setSuggestions(results);
    } else {
      setSuggestions([]);
    }
  }, [value, getSuggestions, getCurrentWord]);

  const insertAtCursor = useCallback((text: string) => {
    const el = textareaRef.current;
    if (!el) { onChange(value + text); return; }
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const newVal = value.slice(0, start) + text + value.slice(end);
    onChange(newVal);
    requestAnimationFrame(() => {
      el.selectionStart = el.selectionEnd = start + text.length;
      el.focus();
    });
  }, [value, onChange]);

  const insertSuggestion = useCallback((word: string) => {
    const el = textareaRef.current;
    const cursor = el?.selectionStart ?? value.length;
    const currentWord = getCurrentWord(value, cursor);
    const before = value.slice(0, cursor - currentWord.length);
    const after = value.slice(cursor);
    const newVal = before + word + ' ' + after;
    onChange(newVal);
    setSuggestions([]);
    requestAnimationFrame(() => {
      if (el) {
        const pos = before.length + word.length + 1;
        el.selectionStart = el.selectionEnd = pos;
        el.focus();
      }
    });
  }, [value, onChange, getCurrentWord]);

  // Canvas drawing handlers
  const getCanvasPos = (e: React.TouchEvent | React.MouseEvent) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    if ('touches' in e) {
      return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
    }
    return { x: (e as React.MouseEvent).clientX - rect.left, y: (e as React.MouseEvent).clientY - rect.top };
  };

  const startDraw = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    isDrawing.current = true;
    const pos = getCanvasPos(e);
    lastPos.current = pos;
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) { ctx.beginPath(); ctx.moveTo(pos.x, pos.y); }
  };

  const draw = (e: React.TouchEvent | React.MouseEvent) => {
    if (!isDrawing.current) return;
    e.preventDefault();
    const pos = getCanvasPos(e);
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.strokeStyle = '#1e293b';
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    }
    lastPos.current = pos;
  };

  const stopDraw = () => { isDrawing.current = false; };

  const clearCanvas = () => {
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx && canvasRef.current) {
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
  };

  return (
    <div className="relative">
      {/* Textarea */}
      <div className="relative">
        <textarea
          ref={textareaRef}
          className={`w-full border rounded-xl p-2.5 text-gray-700 text-sm placeholder:text-gray-300 focus:ring-1 outline-none resize-none pr-16 ${className}`}
          rows={rows}
          placeholder={placeholder}
          value={value}
          disabled={disabled}
          onChange={e => onChange(e.target.value)}
        />
        {/* Toggle buttons */}
        <div className="absolute top-1.5 right-1.5 flex gap-1">
          <button
            type="button"
            onClick={() => { setShowKeyboard(!showKeyboard); setShowCanvas(false); }}
            className={`p-1.5 rounded-lg transition-colors ${showKeyboard ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
          >
            <Keyboard className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => { setShowCanvas(!showCanvas); setShowKeyboard(false); }}
            className={`p-1.5 rounded-lg transition-colors ${showCanvas ? 'bg-purple-500 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
          >
            <PenTool className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Predictive suggestions */}
      <AnimatePresence>
        {suggestions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex gap-1.5 flex-wrap mt-1.5"
          >
            {suggestions.map((s, i) => (
              <button
                key={i}
                type="button"
                onClick={() => insertSuggestion(s.word)}
                className="px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs font-medium hover:bg-amber-100 transition-colors"
              >
                {s.word}
                {s.definition && (
                  <span className="text-amber-500 ml-1 text-[10px]">({s.definition.slice(0, 20)})</span>
                )}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bariba special characters keyboard */}
      <AnimatePresence>
        {showKeyboard && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-1.5 p-2 rounded-xl bg-white border border-gray-200 shadow-md"
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-gray-400 text-[10px] font-bold uppercase">Baatonum</span>
              <button type="button" onClick={() => setShowKeyboard(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-3 h-3" />
              </button>
            </div>
            <div className="flex gap-1 flex-wrap">
              {BARIBA_CHARS.map((char) => (
                <button
                  key={char}
                  type="button"
                  onClick={() => insertAtCursor(char)}
                  className="w-9 h-9 rounded-lg bg-gray-50 border border-gray-200 text-gray-800 text-sm font-bold hover:bg-amber-50 hover:border-amber-300 active:bg-amber-100 transition-colors"
                >
                  {char}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Handwriting canvas */}
      <AnimatePresence>
        {showCanvas && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-1.5 rounded-xl border border-purple-200 bg-white shadow-md overflow-hidden"
          >
            <div className="flex items-center justify-between px-2.5 py-1.5 bg-purple-50 border-b border-purple-100">
              <span className="text-purple-600 text-[10px] font-bold uppercase flex items-center gap-1">
                <PenTool className="w-3 h-3" /> Écriture manuscrite
              </span>
              <div className="flex gap-1">
                <button type="button" onClick={clearCanvas}
                  className="p-1 rounded bg-white border border-purple-200 text-purple-500 hover:bg-purple-50">
                  <Eraser className="w-3 h-3" />
                </button>
                <button type="button" onClick={() => setShowCanvas(false)}
                  className="p-1 rounded bg-white border border-purple-200 text-purple-500 hover:bg-purple-50">
                  <X className="w-3 h-3" />
                </button>
              </div>
            </div>
            <canvas
              ref={canvasRef}
              width={280}
              height={120}
              className="w-full bg-white cursor-crosshair touch-none"
              onMouseDown={startDraw}
              onMouseMove={draw}
              onMouseUp={stopDraw}
              onMouseLeave={stopDraw}
              onTouchStart={startDraw}
              onTouchMove={draw}
              onTouchEnd={stopDraw}
            />
            {/* Quick character insert row below canvas */}
            <div className="flex gap-1 flex-wrap p-2 border-t border-purple-100 bg-purple-50/50">
              {['a', 'b', 'd', 'e', 'g', 'i', 'k', 'm', 'n', 'o', 'r', 's', 'u', 'w', 'y',
                'ɔ', 'ɛ', 'ŋ', 'ã', 'ɔ̃', 'ɛ̃'].map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => insertAtCursor(c)}
                  className="w-7 h-7 rounded bg-white border border-purple-200 text-gray-700 text-xs font-bold hover:bg-purple-100 active:bg-purple-200 transition-colors"
                >
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
