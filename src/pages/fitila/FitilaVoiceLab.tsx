import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Mic, Square, Check, SkipForward, Loader2, Sparkles,
  RotateCcw, Pause, Play, X, AlertTriangle,
} from 'lucide-react';
import { useVoiceCorpus } from '@/hooks/useVoiceCorpus';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { blobToWav16kMono, type WavConversionResult } from '@/lib/audioToWav';
import { createVadAnalyser, type VadStats } from '@/lib/audioVad';

// ─────────────────────── Category metadata ────────────────────────
const CATEGORY_META: Record<string, { emoji: string; gradient: string; macro: string }> = {
  // Quotidien
  'Salutations et politesse':   { emoji: '👋', gradient: 'from-pink-500 to-rose-400',    macro: 'Quotidien' },
  'Famille et relations':       { emoji: '👨‍👩‍👧', gradient: 'from-purple-500 to-indigo-400', macro: 'Quotidien' },
  'Nourriture et boissons':     { emoji: '🍲', gradient: 'from-orange-500 to-amber-400', macro: 'Quotidien' },
  'Maison & Vie quotidienne':   { emoji: '🏠', gradient: 'from-amber-500 to-yellow-400', macro: 'Quotidien' },
  'Temps et dates':             { emoji: '🕒', gradient: 'from-yellow-500 to-amber-400', macro: 'Quotidien' },
  'Émotions et sentiments':     { emoji: '💗', gradient: 'from-pink-500 to-purple-400',  macro: 'Quotidien' },
  // Apprendre
  'Éducation et école':         { emoji: '📚', gradient: 'from-indigo-500 to-blue-400',  macro: 'Apprendre' },
  'Éducation/Manuel N1':        { emoji: '📘', gradient: 'from-amber-500 to-orange-400', macro: 'Apprendre' },
  'Éducation/Manuel N2':        { emoji: '📕', gradient: 'from-amber-600 to-orange-500', macro: 'Apprendre' },
  // Société
  'Santé et corps':             { emoji: '🏥', gradient: 'from-red-500 to-pink-400',     macro: 'Société' },
  'Marché & Achat':             { emoji: '🛒', gradient: 'from-emerald-500 to-teal-400', macro: 'Société' },
  'Commerce et argent':         { emoji: '💰', gradient: 'from-emerald-600 to-green-500',macro: 'Société' },
  'Travail et métiers':         { emoji: '💼', gradient: 'from-slate-500 to-gray-400',   macro: 'Société' },
  'Voyage & Déplacement':       { emoji: '✈️', gradient: 'from-sky-500 to-blue-400',     macro: 'Société' },
  'Transport et direction':     { emoji: '🚌', gradient: 'from-blue-500 to-cyan-400',    macro: 'Société' },
  'Sport & Jeux':               { emoji: '⚽', gradient: 'from-lime-500 to-green-400',   macro: 'Société' },
  'Juridique & Foncier':        { emoji: '⚖️', gradient: 'from-teal-500 to-emerald-400', macro: 'Société' },
  'Loi (Foncier)':              { emoji: '⚖️', gradient: 'from-teal-500 to-emerald-400', macro: 'Société' },
  // Nature
  'Agriculture':                { emoji: '🌾', gradient: 'from-green-500 to-lime-400',   macro: 'Nature' },
  'Animaux & Nature':           { emoji: '🐄', gradient: 'from-emerald-600 to-green-500',macro: 'Nature' },
  'Météo & Saisons':            { emoji: '🌧️', gradient: 'from-cyan-500 to-blue-400',    macro: 'Nature' },
  // Culture
  'Religion & Tradition':       { emoji: '🕌', gradient: 'from-violet-500 to-purple-400',macro: 'Culture' },
  'Idiomes':                    { emoji: '🎭', gradient: 'from-fuchsia-500 to-pink-400', macro: 'Culture' },
  // Fallback
  'Autres':                     { emoji: '✨', gradient: 'from-gray-500 to-slate-400',   macro: 'Autres' },
};

const MACRO_THEMES = [
  { key: 'all',        label: 'Tous',      emoji: '✨' },
  { key: 'Quotidien',  label: 'Quotidien', emoji: '📅' },
  { key: 'Apprendre',  label: 'Apprendre', emoji: '🎓' },
  { key: 'Société',    label: 'Société',   emoji: '⚖️' },
  { key: 'Nature',     label: 'Nature',    emoji: '🌍' },
  { key: 'Culture',    label: 'Culture',   emoji: '🎭' },
];

const metaFor = (cat: string) =>
  CATEGORY_META[cat] || { emoji: '✨', gradient: 'from-pink-500 to-rose-400', macro: 'Autres' };

// ─────────────────────── Recording phase type ────────────────────────
type Phase = 'idle' | 'recording' | 'paused' | 'recorded' | 'submitting';

// ─────────────────────── Animated wave bars ────────────────────────
function WaveBars({ active }: { active: boolean }) {
  return (
    <div className="flex items-end justify-center gap-1.5 h-12">
      {[0, 1, 2, 3, 4].map(i => (
        <motion.span
          key={i}
          className="w-2 rounded-full bg-gradient-to-t from-rose-500 to-pink-400"
          animate={active ? { height: ['20%', '90%', '40%', '100%', '30%'] } : { height: '15%' }}
          transition={active ? { duration: 0.8 + i * 0.1, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.3 }}
        />
      ))}
    </div>
  );
}

// ─────────────────────── Main page ────────────────────────
export default function FitilaVoiceLab() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [macro, setMacro] = useState<string>('all');
  const [category, setCategory] = useState<string | 'all'>('all');
  const { queue, categories, stats, loading, advance, submitRecording } = useVoiceCorpus(category);
  const {
    isRecording, isPaused, duration,
    startRecording, stopRecording, pauseRecording, resumeRecording,
    audioBlob, cancelRecording, getStream,
  } = useAudioRecorder();

  const [phase, setPhase] = useState<Phase>('idle');
  const [recordedDuration, setRecordedDuration] = useState(0);
  const [showFrench, setShowFrench] = useState(true);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  // Live VU-meter state (during recording)
  const [vad, setVad] = useState<VadStats>({ rms: 0, db: -Infinity, level01: 0, isVoice: false, isClipping: false });
  const vadRef = useRef<ReturnType<typeof createVadAnalyser> | null>(null);
  const rafRef = useRef<number | null>(null);

  // Processed WAV result (after stop) — what the user listens to and what gets uploaded
  const [processed, setProcessed] = useState<WavConversionResult | null>(null);
  const [processedUrl, setProcessedUrl] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  // Stable ref for cleanup so we don't re-trigger on every render
  const cancelRef = useRef(cancelRecording);
  useEffect(() => { cancelRef.current = cancelRecording; }, [cancelRecording]);

  const current = queue[0];
  const upcoming = queue.slice(1, 4);

  // Cleanup VAD analyser
  const tearDownVad = () => {
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    if (vadRef.current) { vadRef.current.destroy(); vadRef.current = null; }
  };
  // Cleanup processed URL when replaced/unmounted
  useEffect(() => {
    return () => {
      if (processedUrl) URL.revokeObjectURL(processedUrl);
      tearDownVad();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Auth guard
  useEffect(() => {
    if (user === null) {
      toast.error('Connectez-vous pour contribuer');
      navigate('/fitila/auth');
    }
  }, [user, navigate]);

  // ─── Cleanup on unmount ONLY (empty deps)
  useEffect(() => {
    return () => { cancelRef.current?.(); };
  }, []);

  // ─── Phrases under selected macro
  const filteredCategories = useMemo(() => {
    if (macro === 'all') return categories;
    return categories.filter(c => metaFor(c.name).macro === macro);
  }, [macro, categories]);

  // ─── Reset category if macro hides current selection
  useEffect(() => {
    if (category === 'all') return;
    if (macro === 'all') return;
    const stillVisible = filteredCategories.some(c => c.name === category);
    if (!stillVisible) setCategory('all');
  }, [macro, category, filteredCategories]);

  // ─── Recording controls
  const handleStart = async () => {
    if (!current) return;
    setRecordedDuration(0);
    // Clear any previous WAV
    if (processedUrl) URL.revokeObjectURL(processedUrl);
    setProcessed(null);
    setProcessedUrl(null);
    setPhase('recording');
    const stream = await startRecording();
    if (!stream) {
      setPhase('idle');
      toast.error("Impossible d'accéder au microphone. Vérifiez les autorisations du navigateur.");
      return;
    }
    // Wire up VAD/VU-meter
    tearDownVad();
    const v = createVadAnalyser(stream);
    vadRef.current = v;
    const tick = () => {
      setVad(v.getLevel());
      rafRef.current = requestAnimationFrame(tick);
    };
    tick();
  };

  const handlePause = () => {
    pauseRecording();
    setPhase('paused');
  };

  const handleResume = () => {
    resumeRecording();
    setPhase('recording');
  };

  const handleStop = async () => {
    const dur = duration;
    setRecordedDuration(dur);
    await stopRecording();        // flushes chunks → audioBlob in hook state
    tearDownVad();
    setPhase('recorded');
    // Conversion to WAV happens in an effect below as soon as audioBlob is ready.
  };

  const handleCancel = () => {
    cancelRecording();
    tearDownVad();
    if (processedUrl) URL.revokeObjectURL(processedUrl);
    setProcessed(null);
    setProcessedUrl(null);
    setRecordedDuration(0);
    setPhase('idle');
  };

  const handleRetake = () => {
    cancelRecording();
    tearDownVad();
    if (processedUrl) URL.revokeObjectURL(processedUrl);
    setProcessed(null);
    setProcessedUrl(null);
    setRecordedDuration(0);
    setPhase('idle');
  };

  const handleValidate = async () => {
    if (!current) return;
    if (!processed || !processed.blob || processed.blob.size === 0) {
      toast.error("Audio non prêt. Veuillez patienter ou recommencer.");
      return;
    }
    setPhase('submitting');
    const ok = await submitRecording(current, processed.blob, processed.durationSec);
    if (ok) {
      toast.success('🎉 Enregistrement validé, merci !');
      cancelRecording();
      if (processedUrl) URL.revokeObjectURL(processedUrl);
      setProcessed(null);
      setProcessedUrl(null);
      setRecordedDuration(0);
      advance();
      setPhase('idle');
    } else {
      setPhase('recorded');
    }
  };

  const handleSkip = () => {
    cancelRecording();
    tearDownVad();
    if (processedUrl) URL.revokeObjectURL(processedUrl);
    setProcessed(null);
    setProcessedUrl(null);
    setRecordedDuration(0);
    setPhase('idle');
    advance();
  };

  // ─── Auto-convert raw audioBlob to WAV PCM 16k as soon as it's available
  useEffect(() => {
    if (phase !== 'recorded') return;
    if (!audioBlob || audioBlob.size === 0) return;
    if (processed) return;
    let cancelled = false;
    setProcessing(true);
    (async () => {
      try {
        const result = await blobToWav16kMono(audioBlob);
        if (cancelled) return;
        const url = URL.createObjectURL(result.blob);
        setProcessed(result);
        setProcessedUrl(url);
      } catch (e) {
        console.error('[VoiceLab] WAV conversion failed:', e);
        toast.error("Impossible de traiter l'audio. Recommencez s'il vous plaît.");
      } finally {
        if (!cancelled) setProcessing(false);
      }
    })();
    return () => { cancelled = true; };
  }, [phase, audioBlob, processed]);

  const formatTime = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-rose-50 via-pink-50 to-amber-50 overflow-y-auto">
      {/* Header */}
      <header className="sticky top-0 z-10 backdrop-blur-xl bg-white/70 border-b border-rose-200/50 px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <button
            onClick={() => navigate('/fitila')}
            className="w-10 h-10 rounded-full bg-white/80 hover:bg-white shadow-sm flex items-center justify-center transition-all"
          >
            <ArrowLeft className="w-5 h-5 text-rose-700" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-black text-gray-900 flex items-center gap-2">
              🎙️ <span>Bariba Voice Lab</span>
            </h1>
            <p className="text-xs text-gray-500">Aide à construire la voix de demain</p>
          </div>
          <div className="text-right">
            <div className="text-xs text-gray-400 font-medium">Vos contributions</div>
            <div className="text-lg font-black bg-gradient-to-r from-rose-600 to-pink-600 bg-clip-text text-transparent">
              {stats.user_recorded}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-5 space-y-5">
        {/* ─── Two-level theme selector ─── */}
        <div className="bg-white/70 backdrop-blur-md rounded-2xl p-4 shadow-sm border border-white/80 space-y-3">
          <div>
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-2 block">
              Catégorie principale
            </label>
            <div className="flex flex-wrap gap-2">
              {MACRO_THEMES.map(m => (
                <button
                  key={m.key}
                  onClick={() => { setMacro(m.key); if (m.key === 'all') setCategory('all'); }}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                    macro === m.key
                      ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-md'
                      : 'bg-white text-gray-700 hover:bg-rose-50 border border-gray-200'
                  }`}
                >
                  {m.emoji} {m.label}
                </button>
              ))}
            </div>
          </div>

          {(filteredCategories.length > 0 || macro === 'all') && (
            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-2 block">
                Thème précis
              </label>
              <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
                <button
                  onClick={() => setCategory('all')}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                    category === 'all'
                      ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-md'
                      : 'bg-white text-gray-700 hover:bg-rose-50 border border-gray-200'
                  }`}
                >
                  ✨ Tous mélangés
                </button>
                {(macro === 'all' ? categories : filteredCategories).map(c => {
                  const m = metaFor(c.name);
                  const isActive = category === c.name;
                  return (
                    <button
                      key={c.name}
                      onClick={() => setCategory(c.name)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1.5 ${
                        isActive
                          ? `bg-gradient-to-r ${m.gradient} text-white shadow-md`
                          : 'bg-white text-gray-700 hover:bg-rose-50 border border-gray-200'
                      }`}
                    >
                      <span>{m.emoji}</span>
                      <span>{c.name}</span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                        isActive ? 'bg-white/25' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {c.remaining}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* ─── Main phrase card ─── */}
        <AnimatePresence mode="wait">
          {current ? (
            <motion.div
              key={current.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="bg-white rounded-3xl shadow-xl overflow-hidden border border-rose-100"
            >
              {/* Top status banner */}
              {phase === 'recording' && (
                <div className="bg-gradient-to-r from-red-500 to-rose-500 px-5 py-2.5 flex items-center justify-center gap-2 animate-pulse">
                  <span className="w-2.5 h-2.5 bg-white rounded-full" />
                  <span className="text-white font-bold text-sm tracking-wide">
                    🔴 Enregistrement en cours · {formatTime(duration)}
                  </span>
                </div>
              )}
              {phase === 'paused' && (
                <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-5 py-2.5 flex items-center justify-center gap-2">
                  <Pause className="w-4 h-4 text-white" />
                  <span className="text-white font-bold text-sm tracking-wide">
                    En pause · {formatTime(duration)}
                  </span>
                </div>
              )}
              {phase === 'recorded' && (
                <div className="bg-gradient-to-r from-emerald-500 to-teal-500 px-5 py-2.5 flex items-center justify-center gap-2">
                  <Check className="w-4 h-4 text-white" />
                  <span className="text-white font-bold text-sm tracking-wide">
                    Enregistré · {formatTime(recordedDuration)} · Écoutez avant de valider
                  </span>
                </div>
              )}
              {phase === 'submitting' && (
                <div className="bg-gradient-to-r from-blue-500 to-indigo-500 px-5 py-2.5 flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 text-white animate-spin" />
                  <span className="text-white font-bold text-sm tracking-wide">
                    Envoi de votre voix…
                  </span>
                </div>
              )}

              {/* Category strip when idle */}
              {phase === 'idle' && (
                <div className={`bg-gradient-to-r ${metaFor(current.category).gradient} px-5 py-2 flex items-center justify-between`}>
                  <span className="text-white text-xs font-bold uppercase tracking-wider">
                    {metaFor(current.category).emoji} {current.category}
                  </span>
                  <span className="text-white/80 text-[10px] font-medium">
                    {current.word_count} mot{current.word_count > 1 ? 's' : ''}
                  </span>
                </div>
              )}

              {/* Phrase text */}
              <div className="p-6 md:p-8 text-center min-h-[180px] flex flex-col justify-center">
                <p className="text-xs uppercase tracking-wider text-gray-400 font-bold mb-3">
                  {phase === 'idle' && 'Lisez à voix haute'}
                  {phase === 'recording' && '🎤 Lisez maintenant…'}
                  {phase === 'paused' && '⏸ Reprenez quand vous voulez'}
                  {phase === 'recorded' && '✓ Réécoutez votre lecture'}
                  {phase === 'submitting' && 'Merci pour votre contribution'}
                </p>
                <p className="text-2xl md:text-3xl font-black text-gray-900 leading-snug" style={{ fontFamily: 'Georgia, serif' }}>
                  « {current.text_bariba} »
                </p>
                {current.text_french && showFrench && (
                  <p className="mt-4 text-sm text-gray-500 italic">
                    🇫🇷 {current.text_french}
                  </p>
                )}
                {current.text_french && (
                  <button
                    onClick={() => setShowFrench(s => !s)}
                    className="mt-3 text-xs text-rose-500 hover:text-rose-600 underline"
                  >
                    {showFrench ? 'Masquer la traduction' : 'Voir la traduction'}
                  </button>
                )}
              </div>

              {/* Live VU-meter + voice activity indicator while recording */}
              {(phase === 'recording' || phase === 'paused') && (
                <div className="px-6 pb-2 space-y-2">
                  <WaveBars active={phase === 'recording'} />
                  {/* VU bar */}
                  <div className="relative h-2 rounded-full bg-gray-200 overflow-hidden">
                    <div
                      className={`h-full transition-[width] duration-75 ${
                        vad.isClipping ? 'bg-red-500' : vad.isVoice ? 'bg-emerald-500' : 'bg-gray-400'
                      }`}
                      style={{ width: `${Math.round(vad.level01 * 100)}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-center gap-2 text-[11px] font-semibold">
                    {phase === 'paused' ? (
                      <span className="text-amber-600">⏸ En pause — reprenez quand vous voulez</span>
                    ) : vad.isClipping ? (
                      <span className="text-red-600 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Trop fort, éloignez-vous du micro</span>
                    ) : vad.isVoice ? (
                      <span className="text-emerald-600">🎙️ Voix bien détectée</span>
                    ) : (
                      <span className="text-gray-500">🤫 Silence — parlez plus fort</span>
                    )}
                  </div>
                </div>
              )}

              {/* Audio player & quality info when recorded (uses processed WAV) */}
              {phase === 'recorded' && (
                <div className="px-6 pb-2 space-y-2">
                  {processing && (
                    <div className="flex items-center justify-center gap-2 text-xs text-gray-500 py-2">
                      <Loader2 className="w-4 h-4 animate-spin" /> Traitement audio (nettoyage, normalisation)…
                    </div>
                  )}
                  {processedUrl && processed && (
                    <>
                      <audio ref={audioPlayerRef} src={processedUrl} controls className="w-full" />
                      <div className="flex items-center justify-center gap-3 text-[11px] text-gray-500 font-semibold">
                        <span>⏱ {processed.durationSec.toFixed(1)}s</span>
                        <span>·</span>
                        <span>📊 Pic {isFinite(processed.peakDb) ? processed.peakDb.toFixed(1) : '–'} dB</span>
                        <span>·</span>
                        <span>🎚 Moy {isFinite(processed.rmsDb) ? processed.rmsDb.toFixed(1) : '–'} dB</span>
                        <span>·</span>
                        <span>WAV 16 kHz</span>
                      </div>
                      {(!isFinite(processed.rmsDb) || processed.rmsDb < -40) && (
                        <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-[11px] text-amber-800 flex items-center gap-2">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          Audio très faible — recommencez plus près du micro pour un meilleur résultat.
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* ─── Action buttons by phase ─── */}
              <div className="px-6 pb-6 pt-3 space-y-3">
                {/* IDLE */}
                {phase === 'idle' && (
                  <div className="flex flex-col items-center gap-3">
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      whileHover={{ scale: 1.05 }}
                      onClick={handleStart}
                      className="group relative w-24 h-24 rounded-full bg-gradient-to-br from-rose-500 to-pink-600 shadow-xl shadow-rose-500/40 flex items-center justify-center transition-all"
                      aria-label="Commencer l'enregistrement"
                    >
                      <Mic className="w-10 h-10 text-white" />
                      <span className="absolute inset-0 rounded-full bg-rose-400/30 group-hover:animate-ping" />
                    </motion.button>
                    <p className="text-sm font-bold text-gray-700">Commencer l'enregistrement</p>
                    <button
                      onClick={handleSkip}
                      className="text-xs text-gray-400 hover:text-gray-600 inline-flex items-center gap-1 mt-1"
                    >
                      <SkipForward className="w-3 h-3" />
                      Passer cette phrase
                    </button>
                  </div>
                )}

                {/* RECORDING */}
                {phase === 'recording' && (
                  <div className="flex items-center justify-center gap-3 flex-wrap">
                    <button
                      onClick={handlePause}
                      className="px-4 py-2.5 rounded-full bg-amber-100 hover:bg-amber-200 text-amber-700 font-bold text-sm flex items-center gap-2 transition-all"
                    >
                      <Pause className="w-4 h-4" /> Pause
                    </button>
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      animate={{ scale: [1, 1.06, 1] }}
                      transition={{ repeat: Infinity, duration: 1.4 }}
                      onClick={handleStop}
                      className="px-6 py-3 rounded-full bg-gradient-to-r from-red-500 to-rose-600 text-white font-bold text-sm flex items-center gap-2 shadow-lg shadow-red-500/40"
                    >
                      <Square className="w-4 h-4" fill="white" /> Terminer
                    </motion.button>
                    <button
                      onClick={handleCancel}
                      className="px-4 py-2.5 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-sm flex items-center gap-2 transition-all"
                    >
                      <X className="w-4 h-4" /> Annuler
                    </button>
                  </div>
                )}

                {/* PAUSED */}
                {phase === 'paused' && (
                  <div className="flex items-center justify-center gap-3 flex-wrap">
                    <button
                      onClick={handleResume}
                      className="px-5 py-2.5 rounded-full bg-emerald-100 hover:bg-emerald-200 text-emerald-700 font-bold text-sm flex items-center gap-2 transition-all"
                    >
                      <Play className="w-4 h-4" fill="currentColor" /> Reprendre
                    </button>
                    <button
                      onClick={handleStop}
                      className="px-5 py-2.5 rounded-full bg-gradient-to-r from-red-500 to-rose-600 text-white font-bold text-sm flex items-center gap-2 shadow-md"
                    >
                      <Square className="w-4 h-4" fill="white" /> Terminer
                    </button>
                    <button
                      onClick={handleCancel}
                      className="px-4 py-2.5 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-sm flex items-center gap-2 transition-all"
                    >
                      <X className="w-4 h-4" /> Annuler
                    </button>
                  </div>
                )}

                {/* RECORDED */}
                {phase === 'recorded' && (
                  <div className="flex items-center justify-center gap-2 flex-wrap">
                    <button
                      onClick={handleRetake}
                      className="px-4 py-2.5 rounded-full bg-amber-100 hover:bg-amber-200 text-amber-700 font-bold text-sm flex items-center gap-2 transition-all"
                    >
                      <RotateCcw className="w-4 h-4" /> Refaire
                    </button>
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={handleValidate}
                      className="px-6 py-3 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold text-sm flex items-center gap-2 shadow-lg shadow-emerald-500/30"
                    >
                      <Check className="w-4 h-4" /> Valider & suivante
                    </motion.button>
                    <button
                      onClick={handleSkip}
                      className="px-4 py-2.5 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 font-medium text-sm flex items-center gap-2 transition-all"
                    >
                      <SkipForward className="w-4 h-4" /> Passer
                    </button>
                  </div>
                )}

                {/* SUBMITTING */}
                {phase === 'submitting' && (
                  <div className="flex items-center justify-center py-2">
                    <Loader2 className="w-6 h-6 text-rose-500 animate-spin" />
                  </div>
                )}
              </div>
            </motion.div>
          ) : (
            <div className="bg-white rounded-3xl p-12 text-center shadow-sm">
              {loading ? (
                <>
                  <Loader2 className="w-10 h-10 mx-auto text-rose-500 animate-spin mb-3" />
                  <p className="text-gray-500">Chargement des phrases…</p>
                </>
              ) : (
                <>
                  <Sparkles className="w-10 h-10 mx-auto text-amber-500 mb-3" />
                  <p className="text-gray-700 font-bold">Bravo ! Vous avez tout enregistré dans cette catégorie.</p>
                  <p className="text-sm text-gray-500 mt-1">Choisissez un autre thème pour continuer.</p>
                </>
              )}
            </div>
          )}
        </AnimatePresence>

        {/* Upcoming preview */}
        {upcoming.length > 0 && phase === 'idle' && (
          <div className="bg-white/60 backdrop-blur-md rounded-2xl p-4 border border-white/80">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
              File d'attente ({queue.length} phrases)
            </p>
            <div className="space-y-1.5">
              {upcoming.map((p, i) => (
                <div key={p.id} className="flex items-center gap-2 text-xs">
                  <span className="w-5 h-5 rounded-full bg-rose-100 text-rose-600 font-bold flex items-center justify-center text-[10px]">
                    {i + 2}
                  </span>
                  <span className="text-gray-600 truncate flex-1">{p.text_bariba}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Stats footer */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white/70 backdrop-blur-md rounded-2xl p-3 text-center border border-white/80">
            <div className="text-xl font-black text-gray-900">{stats.total_phrases}</div>
            <div className="text-[10px] text-gray-500 uppercase font-bold">Total corpus</div>
          </div>
          <div className="bg-white/70 backdrop-blur-md rounded-2xl p-3 text-center border border-white/80">
            <div className="text-xl font-black text-emerald-600">{stats.user_recorded}</div>
            <div className="text-[10px] text-gray-500 uppercase font-bold">Vous avez lu</div>
          </div>
          <div className="bg-white/70 backdrop-blur-md rounded-2xl p-3 text-center border border-white/80">
            <div className="text-xl font-black text-rose-600">{stats.remaining}</div>
            <div className="text-[10px] text-gray-500 uppercase font-bold">À lire</div>
          </div>
        </div>

        <p className="text-center text-[11px] text-gray-400 italic pb-6">
          🎯 Chaque enregistrement aide à entraîner un modèle de voix Bariba.
        </p>
      </main>
    </div>
  );
}
