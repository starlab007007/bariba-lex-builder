import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Square, Send, Loader2, RefreshCw, Check, AlertCircle } from 'lucide-react';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import { useAudioLevel } from '@/hooks/useAudioLevel';
import { useWebSpeechSTT } from '@/hooks/useWebSpeechSTT';
import { useFrenchSTT } from '@/hooks/useFrenchSTT';
import { triggerFeedback } from '@/utils/tamtamFeedback';

type PanelState = 'idle' | 'recording' | 'sending' | 'success' | 'error';

export interface VoiceLangPanelProps {
  defaultLang?: 'ba' | 'fr';
  onResult: (result: {
    audioBase64: string;
    transcription?: string;
    sourceLang: 'ba' | 'fr';
  }) => void;
  onLangChange?: (lang: 'ba' | 'fr') => void;
  isProcessingExternal?: boolean;
  isWakingUp?: boolean;
  lastTranscription?: string;
  lastError?: string;
  disabled?: boolean;
  uiLang?: 'ba' | 'fr';
  /** Show success state when parent signals success */
  showSuccess?: boolean;
  /** Reset to idle (called by parent after success displayed) */
  onSpeakAgain?: () => void;
}

// Audio visualizer bars
function AudioVisualizer({ level, isSpeaking }: { level: number; isSpeaking: boolean }) {
  const bars = 7;
  const baseHeights = [30, 50, 65, 80, 65, 50, 30];

  return (
    <div className="flex items-end justify-center gap-1 h-10">
      {baseHeights.map((base, i) => {
        const active = level > i * 10;
        const h = active ? Math.min(100, base + level * 0.4) : base * 0.25;
        return (
          <motion.div
            key={i}
            animate={{ height: `${h}%`, opacity: active ? 1 : 0.25 }}
            transition={{ duration: 0.08 }}
            className={`w-1.5 rounded-full ${
              isSpeaking ? 'bg-green-500' : level > 5 ? 'bg-amber-400' : 'bg-gray-300'
            }`}
            style={{ minHeight: 3 }}
          />
        );
      })}
    </div>
  );
}

// Recording timer
function RecordingTimer({ startedAt }: { startedAt: number }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAt) / 1000));
    }, 500);
    return () => clearInterval(interval);
  }, [startedAt]);

  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;
  return (
    <span className="font-mono text-sm font-semibold text-red-600 tabular-nums">
      {mins}:{secs.toString().padStart(2, '0')}
    </span>
  );
}

export function VoiceLangPanel({
  defaultLang = 'ba',
  onResult,
  onLangChange,
  isProcessingExternal = false,
  isWakingUp = false,
  lastTranscription,
  lastError,
  disabled = false,
  uiLang = 'fr',
  showSuccess = false,
  onSpeakAgain,
}: VoiceLangPanelProps) {
  const [panelState, setPanelState] = useState<PanelState>('idle');
  const [lang, setLang] = useState<'ba' | 'fr'>(defaultLang);
  const [startedAt, setStartedAt] = useState(0);
  const [inlineError, setInlineError] = useState('');

  const audioRecorder = useAudioRecorder();
  const audioLevel = useAudioLevel(15);
  const webSpeechSTT = useWebSpeechSTT();
  const frenchSTT = useFrenchSTT();

  const collectedTranscriptRef = useRef('');

  // Sync language with prop
  useEffect(() => {
    setLang(defaultLang);
  }, [defaultLang]);

  // Track Web Speech transcript
  useEffect(() => {
    if (lang === 'fr' && webSpeechSTT.transcript) {
      collectedTranscriptRef.current = webSpeechSTT.transcript;
    }
  }, [lang, webSpeechSTT.transcript]);

  // React to external processing & success signals
  useEffect(() => {
    if (showSuccess && panelState === 'sending') {
      setPanelState('success');
      triggerFeedback('success');
    }
  }, [showSuccess, panelState]);

  useEffect(() => {
    if (lastError && panelState === 'sending') {
      setPanelState('error');
      setInlineError(lastError);
      triggerFeedback('error');
    }
  }, [lastError, panelState]);

  const handleLangSelect = (selected: 'ba' | 'fr') => {
    if (panelState !== 'idle') return;
    setLang(selected);
    onLangChange?.(selected);
    triggerFeedback('click');
  };

  const handleStartRecording = useCallback(async () => {
    if (disabled || panelState !== 'idle') return;

    setInlineError('');
    collectedTranscriptRef.current = '';
    setStartedAt(Date.now());
    setPanelState('recording');
    triggerFeedback('click');

    const stream = await audioRecorder.startRecording();
    if (stream) audioLevel.startMonitoring(stream);

    if (lang === 'fr') {
      webSpeechSTT.resetTranscript();
      try { webSpeechSTT.startListening(); } catch (e) { /* ignore */ }
    }
  }, [disabled, panelState, lang, audioRecorder, audioLevel, webSpeechSTT]);

  const handleSend = useCallback(async () => {
    if (panelState !== 'recording') return;

    const elapsed = (Date.now() - startedAt) / 1000;
    if (elapsed < 2) {
      setInlineError(
        uiLang === 'ba'
          ? 'Sọ fún ìgbà pípẹ́ díẹ̀ (2s)'
          : 'Parlez au moins 2 secondes'
      );
      return;
    }

    setPanelState('sending');
    audioLevel.stopMonitoring();

    if (lang === 'fr') {
      webSpeechSTT.stopListening();
      await new Promise(r => setTimeout(r, 600));
    }

    const audioBase64 = await audioRecorder.stopRecording();

    let frTranscription: string | undefined;
    if (lang === 'fr' && audioBase64) {
      // Try Mistral STT first
      try {
        const byteChars = atob(audioBase64);
        const bytes = new Uint8Array(byteChars.length);
        for (let i = 0; i < byteChars.length; i++) bytes[i] = byteChars.charCodeAt(i);
        const blob = new Blob([bytes], { type: 'audio/webm' });
        const r = await frenchSTT.transcribeAudioBlob(blob);
        if (r?.trim()) frTranscription = r.trim();
      } catch (e) { /* silent */ }
      if (!frTranscription) {
        frTranscription = collectedTranscriptRef.current || webSpeechSTT.transcript || undefined;
      }
    }

    onResult({
      audioBase64: audioBase64 || '',
      transcription: frTranscription,
      sourceLang: lang,
    });
    // Parent will call setPanelState('success') via showSuccess prop
  }, [panelState, startedAt, lang, uiLang, audioRecorder, audioLevel, webSpeechSTT, frenchSTT, onResult]);

  const handleCancelRecording = useCallback(() => {
    audioLevel.stopMonitoring();
    audioRecorder.cancelRecording();
    if (lang === 'fr') webSpeechSTT.stopListening();
    setPanelState('idle');
    triggerFeedback('click');
  }, [audioLevel, audioRecorder, lang, webSpeechSTT]);

  const handleSpeakAgain = () => {
    setPanelState('idle');
    setInlineError('');
    onSpeakAgain?.();
    triggerFeedback('click');
  };

  // ─── Labels ───────────────────────────────────────────────────────────────
  const labels = {
    chooseLang: uiLang === 'ba' ? 'Yan èdè' : 'Choisissez la langue',
    pressToTalk: uiLang === 'ba' ? 'Tẹ̀ bọ́tìn kí o sọ̀rọ̀' : 'Appuyer pour parler',
    speaking: uiLang === 'ba' ? 'Ń gbọ́...' : 'Parlez...',
    sendWhenDone: uiLang === 'ba' ? 'Tẹ̀ RÁN jẹ́ tán' : 'Appuyez ENVOYER quand vous avez fini',
    send: uiLang === 'ba' ? 'RÁN' : 'ENVOYER',
    cancel: uiLang === 'ba' ? 'Pa' : 'Annuler',
    processing: isWakingUp
      ? (uiLang === 'ba' ? '⏳ Ìjí àwọn ìsẹ́...' : '⏳ Réveil du service (~30s)...')
      : (uiLang === 'ba' ? '🎤 Ń tẹ̀ sí ìwé...' : '🎤 Transcription en cours...'),
    speakAgain: uiLang === 'ba' ? '🎤 Sọ mọ̀ lẹ́kọ̀ọ́' : '🎤 Parler encore',
    retry: uiLang === 'ba' ? '🔄 Gbìyànjú mọ̀' : '🔄 Réessayer',
    youWillSpeak:
      uiLang === 'ba'
        ? `Ìwọ yóò sọ ní ${lang === 'ba' ? 'Bàátɔ̀nú' : 'Fàránsé'}`
        : `Vous parlerez en ${lang === 'ba' ? 'Bariba' : 'Français'}`,
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="w-full flex flex-col items-center gap-4 py-4">

      {/* ── LANGUAGE SELECTOR (only in idle) ── */}
      <AnimatePresence mode="wait">
        {panelState === 'idle' && (
          <motion.div
            key="lang-selector"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="w-full"
          >
            <p className="text-center text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wide">
              {labels.chooseLang}
            </p>
            <div className="flex gap-3 justify-center">
              {(['ba', 'fr'] as const).map((l) => (
                <motion.button
                  key={l}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleLangSelect(l)}
                  className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-semibold text-sm transition-all min-h-[48px] border-2 ${
                    lang === l
                      ? l === 'ba'
                        ? 'bg-orange-500 text-white border-orange-500 shadow-lg shadow-orange-200'
                        : 'bg-blue-500 text-white border-blue-500 shadow-lg shadow-blue-200'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <span className="text-xl">{l === 'ba' ? '🇧🇯' : '🇫🇷'}</span>
                  <span>{l === 'ba' ? 'Bariba' : 'Français'}</span>
                </motion.button>
              ))}
            </div>
            <p className="text-center text-xs text-muted-foreground mt-2">
              {labels.youWillSpeak}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── MAIN CONTENT AREA (state-driven) ── */}
      <AnimatePresence mode="wait">

        {/* IDLE state — big mic button */}
        {panelState === 'idle' && (
          <motion.div
            key="idle"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="flex flex-col items-center gap-3"
          >
            <motion.button
              whileTap={{ scale: 0.92 }}
              onClick={handleStartRecording}
              disabled={disabled}
              className={`w-24 h-24 rounded-full flex items-center justify-center shadow-xl transition-all ${
                lang === 'ba'
                  ? 'bg-gradient-to-br from-orange-400 to-orange-600 shadow-orange-200'
                  : 'bg-gradient-to-br from-blue-400 to-blue-600 shadow-blue-200'
              } ${disabled ? 'opacity-50' : 'active:scale-95'}`}
            >
              <Mic className="w-10 h-10 text-white" />
            </motion.button>
            <p className="text-sm font-medium text-gray-600">{labels.pressToTalk}</p>
          </motion.div>
        )}

        {/* RECORDING state */}
        {panelState === 'recording' && (
          <motion.div
            key="recording"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="w-full flex flex-col items-center gap-4"
          >
            {/* Visualizer */}
            <div className="w-full px-6">
              <AudioVisualizer level={audioLevel.level} isSpeaking={audioLevel.isSpeaking} />
            </div>

            {/* Timer + status */}
            <div className="flex items-center gap-3">
              {/* Pulsing red dot */}
              <motion.div
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
                className="w-2.5 h-2.5 rounded-full bg-red-500"
              />
              <RecordingTimer startedAt={startedAt} />
              <span className="text-sm text-gray-500">{labels.speaking}</span>
            </div>

            <p className="text-xs text-gray-400 text-center px-4">{labels.sendWhenDone}</p>

            {/* Inline error (too short) */}
            <AnimatePresence>
              {inlineError && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="text-xs text-red-600 font-medium bg-red-50 px-3 py-1.5 rounded-xl"
                >
                  ⚠️ {inlineError}
                </motion.p>
              )}
            </AnimatePresence>

            {/* Action buttons: Cancel + SEND */}
            <div className="flex items-center gap-3 w-full justify-center">
              {/* Cancel / stop */}
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={handleCancelRecording}
                className="w-12 h-12 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-500"
              >
                <Square className="w-5 h-5" />
              </motion.button>

              {/* SEND button — large, prominent */}
              <motion.button
                whileTap={{ scale: 0.95 }}
                animate={{ scale: [1, 1.03, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                onClick={handleSend}
                className={`flex items-center gap-2 px-8 py-4 rounded-2xl font-bold text-white text-base shadow-lg transition-all ${
                  lang === 'ba'
                    ? 'bg-gradient-to-r from-green-500 to-emerald-600 shadow-green-200'
                    : 'bg-gradient-to-r from-green-500 to-emerald-600 shadow-green-200'
                }`}
              >
                <Send className="w-5 h-5" />
                {labels.send}
              </motion.button>
            </div>
          </motion.div>
        )}

        {/* SENDING / PROCESSING state */}
        {(panelState === 'sending' || (panelState !== 'success' && panelState !== 'error' && isProcessingExternal)) && (
          <motion.div
            key="sending"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center gap-4 py-4"
          >
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-indigo-50 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
              </div>
            </div>
            <p className="text-sm font-medium text-indigo-700 text-center">
              {labels.processing}
            </p>
            {isWakingUp && (
              <p className="text-xs text-muted-foreground text-center">
                {uiLang === 'ba'
                  ? 'Ìjí àkọ́kọ́ (~30s) - jọ̀wọ́ dúró'
                  : 'Première utilisation (~30s) — patientez'}
              </p>
            )}
            {/* Indeterminate progress bar */}
            <div className="w-48 h-1.5 bg-indigo-100 rounded-full overflow-hidden">
              <motion.div
                animate={{ x: ['-100%', '200%'] }}
                transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
                className="w-1/2 h-full bg-indigo-500 rounded-full"
              />
            </div>
          </motion.div>
        )}

        {/* SUCCESS state */}
        {panelState === 'success' && (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.8, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: 'spring', damping: 12, stiffness: 200 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center gap-4 py-2"
          >
            {/* Success badge */}
            <motion.div
              animate={{ scale: [1, 1.06, 1] }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="flex items-center gap-2 px-4 py-2.5 bg-green-50 border border-green-200 rounded-2xl shadow-sm"
            >
              <Check className="w-5 h-5 text-green-600" />
              {lastTranscription && (
                <span className="text-sm font-semibold text-green-800">
                  "{lastTranscription}"
                </span>
              )}
            </motion.div>

            {/* Speak again button — the primary CTA */}
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleSpeakAgain}
              className={`flex items-center gap-2 px-7 py-3.5 rounded-2xl font-semibold text-white text-base shadow-md transition-all ${
                lang === 'ba'
                  ? 'bg-gradient-to-r from-orange-400 to-orange-600 shadow-orange-200'
                  : 'bg-gradient-to-r from-blue-400 to-blue-600 shadow-blue-200'
              }`}
            >
              <Mic className="w-5 h-5" />
              {labels.speakAgain}
            </motion.button>
          </motion.div>
        )}

        {/* ERROR state */}
        {panelState === 'error' && (
          <motion.div
            key="error"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center gap-4 py-2"
          >
            {/* Error badge */}
            <div className="flex items-center gap-2 px-4 py-2.5 bg-red-50 border border-red-200 rounded-2xl">
              <AlertCircle className="w-5 h-5 text-red-500" />
              <span className="text-sm text-red-700 font-medium max-w-[200px] text-center leading-tight">
                {inlineError || lastError || (uiLang === 'ba' ? 'Àṣìṣe kan ṣẹlẹ̀' : 'Une erreur est survenue')}
              </span>
            </div>

            {/* Retry button */}
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleSpeakAgain}
              className="flex items-center gap-2 px-6 py-3 rounded-2xl font-semibold text-white bg-gradient-to-r from-red-400 to-rose-500 shadow-md shadow-red-100"
            >
              <RefreshCw className="w-4 h-4" />
              {labels.retry}
            </motion.button>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
