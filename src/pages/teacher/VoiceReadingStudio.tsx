import { useNavigate, useParams } from 'react-router-dom';
import { useEffect, useMemo, useState, useRef } from 'react';
import { getLessonItems, moduleLabel, computeQualityScore, type ModuleKey, type ContentItem } from '@/lib/classeContentKeys';
import { useLessonAudios, useUploadClasseAudio, useUpdateAudioStatus, useDeleteAudio, useGetSignedUrl, type ClasseAudioRow } from '@/hooks/useClasseAudio';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import { blobToWav16kMono } from '@/lib/audioToWav';
import { createVadAnalyser, type VadStats } from '@/lib/audioVad';
import { ArrowLeft, Mic, Square, Pause, Play, RotateCcw, Send, Save, Loader2, Trash2, CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import QualityBadge from '@/components/teacher/voice/QualityBadge';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function VoiceReadingStudio() {
  const { level, module, lessonId } = useParams<{ level: string; module: string; lessonId: string }>();
  const nav = useNavigate();
  const lvl = (level as 'N1' | 'N2') ?? 'N1';
  const mod = (module as ModuleKey) ?? 'lang';
  const lid = parseInt(lessonId ?? '1', 10);

  const items = useMemo(() => getLessonItems(lvl, mod, lid), [lvl, mod, lid]);
  const { data: audios = [], refetch } = useLessonAudios(lvl, mod, lid);
  const audioByKey = useMemo(() => {
    const m = new Map<string, ClasseAudioRow>();
    for (const a of audios) m.set(a.content_key, a);
    return m;
  }, [audios]);

  const [activeIdx, setActiveIdx] = useState(0);
  const [autoSuite, setAutoSuite] = useState(false);
  useEffect(() => { setActiveIdx(0); }, [lvl, mod, lid]);
  const active = items[activeIdx];

  const recorder = useAudioRecorder();
  const [vadLevel, setVadLevel] = useState<VadStats | null>(null);
  const vadRef = useRef<ReturnType<typeof createVadAnalyser> | null>(null);
  const rafRef = useRef<number | null>(null);

  // Local studio state
  const [processedWav, setProcessedWav] = useState<{ blob: Blob; url: string; duration: number; peakDb: number; rmsDb: number; quality: number } | null>(null);
  const [processing, setProcessing] = useState(false);

  const upload = useUploadClasseAudio();
  const updateStatus = useUpdateAudioStatus();
  const removeAudio = useDeleteAudio();
  const getSignedUrl = useGetSignedUrl();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Cleanup VAD on unmount
  useEffect(() => () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); vadRef.current?.destroy(); }, []);

  // Build a preview URL for an existing row
  useEffect(() => {
    setPreviewUrl(null);
    const existing = active ? audioByKey.get(active.content_key) : undefined;
    if (existing) {
      getSignedUrl(existing.storage_path, 3600).then(setPreviewUrl).catch(() => setPreviewUrl(null));
    }
    setProcessedWav(null);
  }, [active, audioByKey, getSignedUrl]);

  if (!active) {
    return (
      <div className="text-center text-muted-foreground py-10">Aucun élément trouvé pour cette leçon.</div>
    );
  }

  const existing = audioByKey.get(active.content_key);

  async function startRec() {
    setProcessedWav(null);
    const stream = await recorder.startRecording();
    if (!stream) return;
    vadRef.current = createVadAnalyser(stream);
    const tick = () => { setVadLevel(vadRef.current!.getLevel()); rafRef.current = requestAnimationFrame(tick); };
    tick();
  }

  async function stopRec() {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    vadRef.current?.destroy(); vadRef.current = null; setVadLevel(null);
    await recorder.stopRecording();
    setTimeout(async () => {
      const blob = recorder.audioBlob;
      if (!blob) return;
      setProcessing(true);
      try {
        const wav = await blobToWav16kMono(blob);
        const quality = computeQualityScore({ peakDb: wav.peakDb, rmsDb: wav.rmsDb, durationSec: wav.durationSec, contentType: active.content_type });
        setProcessedWav({ blob: wav.blob, url: URL.createObjectURL(wav.blob), duration: wav.durationSec, peakDb: wav.peakDb, rmsDb: wav.rmsDb, quality });
      } catch (e: any) {
        toast.error('Conversion WAV échouée: ' + (e?.message ?? 'erreur'));
      } finally {
        setProcessing(false);
      }
    }, 200);
  }

  async function save(status: 'draft' | 'submitted') {
    if (!processedWav) return;
    try {
      await upload.mutateAsync({
        item: active,
        wavBlob: processedWav.blob,
        durationSec: processedWav.duration,
        peakDb: processedWav.peakDb,
        rmsDb: processedWav.rmsDb,
        qualityScore: processedWav.quality,
        status,
      });
      toast.success(status === 'submitted' ? '✉️ Audio soumis à validation' : '💾 Brouillon enregistré');
      setProcessedWav(null);
      await refetch();
      if (autoSuite && status === 'submitted') {
        const nextIdx = items.findIndex((it, i) => i > activeIdx && !audioByKey.get(it.content_key));
        if (nextIdx >= 0) setActiveIdx(nextIdx);
      }
    } catch (e: any) { toast.error('Échec: ' + (e?.message ?? 'erreur')); }
  }

  async function withdraw(row: ClasseAudioRow) {
    try { await updateStatus.mutateAsync({ id: row.id, status: 'draft' }); toast.success('Retiré de la file de validation'); }
    catch (e: any) { toast.error(e?.message ?? 'Erreur'); }
  }
  async function del(row: ClasseAudioRow) {
    if (!confirm('Supprimer définitivement ce brouillon ?')) return;
    try { await removeAudio.mutateAsync(row); toast.success('Supprimé'); }
    catch (e: any) { toast.error(e?.message ?? 'Erreur'); }
  }

  const recState = recorder.isRecording ? 'recording' : processing ? 'processing' : processedWav ? 'recorded' : 'idle';
  const lvLevel = vadLevel?.level01 ?? 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <button onClick={() => nav(`/fitila/teacher/voice-reading/${lvl}/${mod}`)} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4" /> Leçons
        </button>
        <label className="inline-flex items-center gap-2 text-sm cursor-pointer select-none">
          <input type="checkbox" checked={autoSuite} onChange={(e) => setAutoSuite(e.target.checked)} className="w-4 h-4 accent-amber-500" />
          Mode auto-suite
        </label>
      </div>
      <h1 className="text-lg md:text-xl font-black">{lvl} · {moduleLabel(mod)} · L{lid}</h1>

      <div className="grid lg:grid-cols-[300px_1fr] gap-4">
        {/* ITEMS */}
        <ul className="rounded-xl border border-border bg-card overflow-hidden max-h-[60vh] lg:max-h-[70vh] overflow-y-auto">
          {items.map((it, i) => {
            const a = audioByKey.get(it.content_key);
            const stClass = a?.status === 'approved' ? 'text-emerald-500' :
                            a?.status === 'submitted' ? 'text-amber-500' :
                            a?.status === 'rejected' ? 'text-rose-500' :
                            a?.status === 'draft' ? 'text-blue-500' : 'text-muted-foreground';
            const StIcon = a?.status === 'approved' ? CheckCircle2 :
                           a?.status === 'rejected' ? AlertCircle :
                           a ? Clock : Mic;
            return (
              <li key={it.content_key}>
                <button
                  onClick={() => setActiveIdx(i)}
                  className={cn('w-full text-left px-3 py-2 flex items-center gap-2 text-sm border-b border-border last:border-0 hover:bg-muted/40',
                    i === activeIdx && 'bg-amber-500/10 font-bold')}
                >
                  <StIcon className={cn('w-4 h-4 shrink-0', stClass)} />
                  <span className="flex-1 truncate">{it.hierarchy_label.split('·').slice(-1)[0].trim()}</span>
                  {a?.quality_score != null && <span className="text-[10px] text-muted-foreground">⭐{a.quality_score}</span>}
                </button>
              </li>
            );
          })}
        </ul>

        {/* STUDIO */}
        <div className="rounded-xl border border-border bg-card p-4 space-y-4">
          <div>
            <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">{active.hierarchy_label}</div>
            <div className="rounded-lg bg-muted/50 p-3 text-sm md:text-base whitespace-pre-wrap leading-relaxed font-medium">
              {active.content_text}
            </div>
          </div>

          {/* Existing audio status panel */}
          {existing && !processedWav && (
            <div className="flex flex-wrap items-center gap-2 text-sm">
              {existing.status === 'approved' && <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 text-xs font-bold">✓ Validé public</span>}
              {existing.status === 'submitted' && <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-400 text-xs font-bold">⏳ En validation</span>}
              {existing.status === 'rejected' && <span className="px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-700 dark:text-rose-400 text-xs font-bold">✗ Rejeté</span>}
              {existing.status === 'draft' && <span className="px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-700 dark:text-blue-400 text-xs font-bold">📝 Brouillon</span>}
              <QualityBadge score={existing.quality_score} />
              {previewUrl && <audio src={previewUrl} controls className="h-9 max-w-full" />}
              {existing.status === 'submitted' && (
                <button onClick={() => withdraw(existing)} className="text-xs px-2 py-1 rounded-md border border-border hover:bg-muted">↩️ Retirer</button>
              )}
              {existing.status === 'draft' && (
                <button onClick={() => del(existing)} className="text-xs px-2 py-1 rounded-md border border-rose-300 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 inline-flex items-center gap-1">
                  <Trash2 className="w-3 h-3" /> Supprimer
                </button>
              )}
              {existing.admin_notes && (
                <p className="w-full text-xs text-rose-600 dark:text-rose-400 mt-1">💬 {existing.admin_notes}</p>
              )}
            </div>
          )}

          {/* Recorder */}
          {recState === 'idle' && (
            <div className="flex flex-col items-center gap-3 py-2">
              <button onClick={startRec} className="w-20 h-20 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-lg hover:bg-amber-600 transition-colors active:scale-95">
                <Mic className="w-8 h-8" />
              </button>
              <p className="text-sm text-muted-foreground">{existing ? '🔄 Nouvelle version' : '🎙️ Enregistrer'}</p>
            </div>
          )}

          {recState === 'recording' && (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center gap-2 text-sm font-bold text-rose-600">
                  <span className="w-2 h-2 rounded-full bg-rose-600 animate-pulse" />
                  REC · {recorder.duration}s
                </span>
                {vadLevel?.isClipping && <span className="text-xs font-bold text-rose-600">⚠ SATURATION</span>}
                {vadLevel && !vadLevel.isVoice && !vadLevel.isClipping && <span className="text-xs text-muted-foreground">silence…</span>}
                {vadLevel?.isVoice && <span className="text-xs text-emerald-600 font-bold">🎙️ voix détectée</span>}
              </div>
              {/* VU-meter */}
              <div className="h-3 w-full rounded-full bg-muted overflow-hidden">
                <div className={cn('h-full transition-[width] duration-75', vadLevel?.isClipping ? 'bg-rose-500' : 'bg-emerald-500')} style={{ width: `${Math.round(lvLevel * 100)}%` }} />
              </div>
              <div className="flex justify-center gap-3">
                <button onClick={() => recorder.isPaused ? recorder.resumeRecording() : recorder.pauseRecording()} className="px-4 py-2 rounded-lg border border-border hover:bg-muted inline-flex items-center gap-1">
                  {recorder.isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                  {recorder.isPaused ? 'Reprendre' : 'Pause'}
                </button>
                <button onClick={stopRec} className="px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 inline-flex items-center gap-1">
                  <Square className="w-4 h-4" /> Terminer
                </button>
                <button onClick={() => { recorder.cancelRecording(); vadRef.current?.destroy(); vadRef.current = null; setVadLevel(null); if (rafRef.current) cancelAnimationFrame(rafRef.current); }} className="px-4 py-2 rounded-lg border border-rose-300 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30">
                  Annuler
                </button>
              </div>
            </div>
          )}

          {recState === 'processing' && (
            <div className="flex items-center justify-center gap-2 py-6 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin" /> Conversion WAV 16 kHz mono…
            </div>
          )}

          {recState === 'recorded' && processedWav && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <QualityBadge score={processedWav.quality} />
                <span className="text-xs text-muted-foreground">Durée {processedWav.duration.toFixed(1)}s · Peak {processedWav.peakDb.toFixed(1)} dB · RMS {processedWav.rmsDb.toFixed(1)} dB</span>
              </div>
              <audio src={processedWav.url} controls className="w-full" />
              <div className="flex flex-wrap gap-2">
                <button onClick={() => { setProcessedWav(null); startRec(); }} className="px-3 py-2 rounded-lg border border-border hover:bg-muted inline-flex items-center gap-1 text-sm">
                  <RotateCcw className="w-4 h-4" /> Refaire
                </button>
                <button onClick={() => save('draft')} disabled={upload.isPending} className="px-3 py-2 rounded-lg border border-border hover:bg-muted inline-flex items-center gap-1 text-sm">
                  <Save className="w-4 h-4" /> Brouillon
                </button>
                <button onClick={() => save('submitted')} disabled={upload.isPending} className="px-3 py-2 rounded-lg bg-amber-500 text-white hover:bg-amber-600 inline-flex items-center gap-1 text-sm font-bold">
                  {upload.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Soumettre
                </button>
              </div>
            </div>
          )}

          {recorder.error && <p className="text-sm text-rose-600">{recorder.error}</p>}

          <div className="text-xs text-muted-foreground pt-2 border-t border-border">
            Élément {activeIdx + 1} / {items.length}
          </div>
        </div>
      </div>
    </div>
  );
}