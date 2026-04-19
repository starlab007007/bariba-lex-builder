import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Mic, Square, Play, Check, SkipForward, Loader2, Sparkles, Volume2, RotateCcw } from 'lucide-react';
import { useVoiceCorpus, type CorpusPhrase } from '@/hooks/useVoiceCorpus';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const CATEGORY_COLORS: Record<string, string> = {
  'Salutations et politesse': 'from-pink-500 to-rose-400',
  'Famille et relations': 'from-purple-500 to-indigo-400',
  'Nourriture et boissons': 'from-orange-500 to-amber-400',
  'Santé et corps': 'from-red-500 to-pink-400',
  'Commerce et argent': 'from-emerald-500 to-teal-400',
  'Transport et direction': 'from-blue-500 to-cyan-400',
  'Temps et dates': 'from-yellow-500 to-amber-400',
  'Émotions et sentiments': 'from-pink-500 to-purple-400',
  'Travail et métiers': 'from-slate-500 to-gray-400',
  'Éducation et école': 'from-indigo-500 to-blue-400',
  'Éducation/Manuel N1': 'from-amber-500 to-orange-400',
  'Éducation/Manuel N2': 'from-amber-600 to-orange-500',
  'Loi (Foncier)': 'from-teal-500 to-emerald-400',
  'Idiomes': 'from-fuchsia-500 to-pink-400',
  'Autres': 'from-gray-500 to-slate-400',
};

const colorFor = (cat: string) => CATEGORY_COLORS[cat] || 'from-pink-500 to-rose-400';

export default function FitilaVoiceLab() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [category, setCategory] = useState<string | 'all'>('all');
  const { queue, categories, stats, loading, advance, submitRecording } = useVoiceCorpus(category);
  const { isRecording, duration, startRecording, stopRecording, audioBlob, audioUrl, cancelRecording } = useAudioRecorder();
  const [submitting, setSubmitting] = useState(false);
  const [showFrench, setShowFrench] = useState(true);
  const [recordedDuration, setRecordedDuration] = useState(0);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  const current = queue[0];
  const upcoming = queue.slice(1, 4);

  // Redirect if not logged in
  useEffect(() => {
    if (user === null) {
      toast.error('Connectez-vous pour contribuer');
      navigate('/fitila/auth');
    }
  }, [user, navigate]);

  const handleStart = async () => {
    if (!current) return;
    cancelRecording();
    await startRecording();
  };

  const handleStop = async () => {
    setRecordedDuration(duration);
    await stopRecording();
  };

  const handleListen = () => {
    if (audioPlayerRef.current && audioUrl) {
      audioPlayerRef.current.play();
    }
  };

  const handleRetake = () => {
    cancelRecording();
    setRecordedDuration(0);
  };

  const handleValidate = async () => {
    if (!current || !audioBlob) return;
    setSubmitting(true);
    const ok = await submitRecording(current, audioBlob, recordedDuration);
    if (ok) {
      toast.success('🎉 Enregistrement validé !');
      cancelRecording();
      setRecordedDuration(0);
      advance();
    }
    setSubmitting(false);
  };

  const handleSkip = () => {
    cancelRecording();
    setRecordedDuration(0);
    advance();
  };

  // Cleanup recording on unmount
  useEffect(() => () => cancelRecording(), [cancelRecording]);

  const hasRecording = !!audioBlob && !isRecording;

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

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-5">
        {/* Category selector */}
        <div className="bg-white/70 backdrop-blur-md rounded-2xl p-4 shadow-sm border border-white/80">
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2 block">
            Thème
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setCategory('all')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                category === 'all'
                  ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-md'
                  : 'bg-white/80 text-gray-700 hover:bg-white'
              }`}
            >
              ✨ Tous mélangés
            </button>
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`px-3 py-2 rounded-full text-xs font-medium transition-all ${
                  category === cat
                    ? `bg-gradient-to-r ${colorFor(cat)} text-white shadow-md`
                    : 'bg-white/80 text-gray-700 hover:bg-white'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Main phrase card */}
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
              {/* Category banner */}
              <div className={`bg-gradient-to-r ${colorFor(current.category)} px-5 py-2 flex items-center justify-between`}>
                <span className="text-white text-xs font-bold uppercase tracking-wider">
                  {current.category}
                </span>
                <span className="text-white/80 text-[10px] font-medium">
                  {current.word_count} mot{current.word_count > 1 ? 's' : ''} · {current.difficulty}
                </span>
              </div>

              {/* Phrase to read */}
              <div className="p-6 md:p-8 text-center min-h-[180px] flex flex-col justify-center">
                <p className="text-xs uppercase tracking-wider text-gray-400 font-bold mb-3">
                  Lisez à voix haute
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

              {/* Controls */}
              <div className="px-6 pb-6 space-y-4">
                {/* Recording state */}
                {isRecording && (
                  <div className="text-center">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-50 rounded-full border border-red-200">
                      <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                      <span className="text-red-600 font-bold text-sm">
                        Enregistrement : {duration}s
                      </span>
                    </div>
                  </div>
                )}

                {/* Hidden audio player */}
                {audioUrl && (
                  <audio ref={audioPlayerRef} src={audioUrl} preload="auto" />
                )}

                {/* Main action button */}
                <div className="flex items-center justify-center gap-3 flex-wrap">
                  {!hasRecording && !isRecording && (
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={handleStart}
                      className="w-20 h-20 rounded-full bg-gradient-to-br from-rose-500 to-pink-600 shadow-lg shadow-rose-500/30 flex items-center justify-center hover:shadow-rose-500/50 transition-all"
                    >
                      <Mic className="w-8 h-8 text-white" />
                    </motion.button>
                  )}

                  {isRecording && (
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      animate={{ scale: [1, 1.05, 1] }}
                      transition={{ repeat: Infinity, duration: 1.2 }}
                      onClick={handleStop}
                      className="w-20 h-20 rounded-full bg-gradient-to-br from-red-500 to-rose-600 shadow-lg shadow-red-500/40 flex items-center justify-center"
                    >
                      <Square className="w-8 h-8 text-white" fill="white" />
                    </motion.button>
                  )}

                  {hasRecording && (
                    <>
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={handleListen}
                        className="px-5 py-3 rounded-full bg-blue-100 hover:bg-blue-200 text-blue-700 font-medium text-sm flex items-center gap-2 transition-all"
                      >
                        <Volume2 className="w-4 h-4" />
                        Écouter
                      </motion.button>
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={handleRetake}
                        className="px-5 py-3 rounded-full bg-amber-100 hover:bg-amber-200 text-amber-700 font-medium text-sm flex items-center gap-2 transition-all"
                      >
                        <RotateCcw className="w-4 h-4" />
                        Refaire
                      </motion.button>
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        disabled={submitting}
                        onClick={handleValidate}
                        className="px-6 py-3 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold text-sm flex items-center gap-2 shadow-lg shadow-emerald-500/30 disabled:opacity-50"
                      >
                        {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                        {submitting ? 'Envoi…' : 'Valider'}
                      </motion.button>
                    </>
                  )}
                </div>

                {/* Skip */}
                {!isRecording && (
                  <div className="text-center">
                    <button
                      onClick={handleSkip}
                      className="text-xs text-gray-400 hover:text-gray-600 inline-flex items-center gap-1"
                    >
                      <SkipForward className="w-3 h-3" />
                      Passer cette phrase
                    </button>
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
        {upcoming.length > 0 && (
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
