// Portage fidèle de `_CompareSheet` (fitila_flutter/lib/apprendre/apprendre_voice_ui.dart,
// branche feat/apprendre-v2.4-build19-20260927) — feuille « Compare ta
// voix » : écoute de la référence, enregistrement micro, analyse, résultat
// détaillé. Machine à états `idle → recording → analyzing → result`, branche
// `failed`, exactement comme spec §10.3 (voir le récapitulatif états ↔
// déclencheurs ↔ messages dans le rapport de la tâche).
//
// Composant autonome, props-driven (comme `ApReviewScreen.tsx`/
// `ApSceneDetailScreen.tsx`) : ne fait aucune hypothèse sur son point de
// montage — `ApCompareButton.tsx` l'ouvre en overlay plein écran (équivalent
// web de `showModalBottomSheet`).

import { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, Mic, Square, Volume2, FlaskConical, Lightbulb, User, ArrowLeftRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { apprendreAudioKey, useApprendrePublishedAudio } from '@/components/fitila/BaribaAudioText';
import {
  apCompareVoices,
  verdictLabel,
  DEFAULT_COMPARE_SETTINGS,
  type ApCompareSettings,
  type ApVoiceComparison,
  type ApPcm,
} from '@/lib/apprendre/voiceAnalysis';
import { ApMicRecorder, decodeAudioBlobTo16kPcm, decodeArrayBufferTo16kPcm } from '@/lib/apprendre/micRecorder';
import { AP_COLORS } from './apColors';
import ApContourChart from './ApContourChart';

type Stage = 'idle' | 'recording' | 'analyzing' | 'result' | 'failed';

export interface ApCompareSheetProps {
  /** Texte cible en bariba (clé de recherche de la voix de référence — spec §12.3). */
  text: string;
  /** Traduction française, affichée si fournie (spec §10.3 étape 1). */
  fr?: string;
  /** Réglages de comparaison (seuils, calibrage) — `ApAudioService.instance.compareSettings`
   *  côté Dart ; pas encore branchés sur une administration web, donc
   *  `DEFAULT_COMPARE_SETTINGS` par défaut (non calibré, comme au premier
   *  déploiement Flutter). */
  settings?: ApCompareSettings;
  onClose: () => void;
}

async function getSignedUrl(storagePath: string): Promise<string> {
  const { data, error } = await supabase.storage.from('apprendre-audio').createSignedUrl(storagePath, 3600);
  if (error || !data?.signedUrl) throw error ?? new Error('Voix indisponible');
  return data.signedUrl;
}

export default function ApCompareSheet({ text, fr, settings = DEFAULT_COMPARE_SETTINGS, onClose }: ApCompareSheetProps) {
  const { data: manifest } = useApprendrePublishedAudio();
  const entry = useMemo(() => manifest?.get(apprendreAudioKey(text))?.[0] ?? null, [manifest, text]);

  const [stage, setStage] = useState<Stage>('idle');
  const [result, setResult] = useState<ApVoiceComparison | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mineBlobUrl, setMineBlobUrl] = useState<string | null>(null);
  const [referencePlaying, setReferencePlaying] = useState(false);

  const recorderRef = useRef<ApMicRecorder>(new ApMicRecorder());
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const mineBlobUrlRef = useRef<string | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      recorderRef.current.cancel();
      audioRef.current?.pause();
      audioRef.current = null;
      if (mineBlobUrlRef.current) URL.revokeObjectURL(mineBlobUrlRef.current);
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function stopAudio() {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
  }

  function handleClose() {
    recorderRef.current.cancel();
    stopAudio();
    onClose();
  }

  async function playReference() {
    if (!entry || referencePlaying) return;
    stopAudio();
    setReferencePlaying(true);
    try {
      const url = await getSignedUrl(entry.storage_path);
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => setReferencePlaying(false);
      audio.onerror = () => setReferencePlaying(false);
      await audio.play();
    } catch {
      setReferencePlaying(false);
    }
  }

  async function fetchReferencePcm(): Promise<ApPcm | null> {
    if (!entry) return null;
    try {
      const url = await getSignedUrl(entry.storage_path);
      const response = await fetch(url);
      if (!response.ok) return null;
      const arrayBuffer = await response.arrayBuffer();
      return await decodeArrayBufferTo16kPcm(arrayBuffer);
    } catch {
      return null;
    }
  }

  // Spec §10.3 étape 6 : ordre exact — vérifier la référence AVANT même de
  // tenter l'analyse ; puis lire/décoder la prise ; puis comparer.
  async function analyze(blob: Blob) {
    if (!entry) {
      if (isMountedRef.current) {
        setStage('failed');
        setError('Voix de référence indisponible hors connexion.');
      }
      return;
    }
    const referencePcm = await fetchReferencePcm();
    if (!isMountedRef.current) return;
    if (!referencePcm) {
      setStage('failed');
      setError('Voix de référence indisponible hors connexion.');
      return;
    }
    let learnerPcm: ApPcm;
    try {
      learnerPcm = await decodeAudioBlobTo16kPcm(blob);
    } catch {
      if (isMountedRef.current) {
        setStage('failed');
        setError('Enregistrement vide. Réessaie.');
      }
      return;
    }
    if (!isMountedRef.current) return;
    const comparison = apCompareVoices(referencePcm, learnerPcm, settings);
    if (!comparison) {
      setStage('failed');
      setError('Prise trop courte ou inaudible : parle un peu plus fort.');
      return;
    }
    setResult(comparison);
    setStage('result');
  }

  async function toggle() {
    if (stage === 'recording') {
      const blob = await recorderRef.current.stop();
      if (!isMountedRef.current) return;
      if (!blob) {
        setStage('failed');
        setError('Enregistrement vide. Réessaie.');
        return;
      }
      if (mineBlobUrlRef.current) URL.revokeObjectURL(mineBlobUrlRef.current);
      const url = URL.createObjectURL(blob);
      mineBlobUrlRef.current = url;
      setMineBlobUrl(url);
      setStage('analyzing');
      await analyze(blob);
      return;
    }
    stopAudio();
    try {
      await recorderRef.current.start();
      if (isMountedRef.current) {
        setStage('recording');
        setResult(null);
        setError(null);
      }
    } catch {
      if (isMountedRef.current) {
        setStage('failed');
        setError('Microphone indisponible.');
      }
    }
  }

  function playMine() {
    if (!mineBlobUrl) return;
    stopAudio();
    const audio = new Audio(mineBlobUrl);
    audioRef.current = audio;
    void audio.play().catch(() => {});
  }

  async function playBoth() {
    if (!entry || !mineBlobUrl) return;
    stopAudio();
    try {
      const url = await getSignedUrl(entry.storage_path);
      const reference = new Audio(url);
      audioRef.current = reference;
      await reference.play();
      const durationMs = entry.duration_ms ?? Math.round((reference.duration || 0) * 1000);
      await new Promise((resolve) => setTimeout(resolve, durationMs + 400));
      if (!isMountedRef.current) return;
      const mine = new Audio(mineBlobUrl);
      audioRef.current = mine;
      await mine.play();
    } catch {
      // Lecture impossible — silencieux, comme `ApAudioService` côté Dart.
    }
  }

  const stageMessage =
    stage === 'idle'
      ? 'Écoute la référence, puis appuie et répète.'
      : stage === 'recording'
        ? 'Je t’écoute… appuie pour arrêter.'
        : stage === 'analyzing'
          ? 'Comparaison en cours…'
          : stage === 'result'
            ? 'Appuie de nouveau pour recommencer.'
            : (error ?? 'Réessaie.');

  const micColor = stage === 'recording' ? AP_COLORS.clay : AP_COLORS.gold;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        type="button"
        aria-label="Fermer"
        onClick={handleClose}
        className="absolute inset-0"
        style={{ backgroundColor: 'rgba(20,17,10,0.45)' }}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Compare ta voix"
        className="relative flex w-full max-w-lg flex-col overflow-y-auto rounded-t-[28px] sm:rounded-[28px]"
        style={{ backgroundColor: AP_COLORS.ivory, maxHeight: '90vh' }}
      >
        <div className="mx-auto mt-2.5 h-1.5 w-10 shrink-0 rounded-full" style={{ backgroundColor: AP_COLORS.lineStrong }} />
        <div className="px-5 pb-6 pt-3">
          <p className="text-[11.5px] font-bold tracking-[0.5px]" style={{ color: AP_COLORS.goldDeep }}>
            COMPARE TA VOIX
          </p>
          <div className="mt-1.5 flex items-center gap-2">
            <p className="min-w-0 flex-1 text-[26px] font-bold" style={{ color: AP_COLORS.ink }}>{text}</p>
            <button
              type="button"
              disabled={!entry}
              onClick={playReference}
              aria-label="Écouter la voix de référence"
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border disabled:opacity-50"
              style={{ borderColor: AP_COLORS.lineStrong, backgroundColor: AP_COLORS.goldTint }}
            >
              {referencePlaying ? (
                <Loader2 className="h-5 w-5 animate-spin" style={{ color: AP_COLORS.goldDeep }} />
              ) : (
                <Volume2 className="h-5 w-5" style={{ color: AP_COLORS.goldDeep }} />
              )}
            </button>
          </div>
          {!!fr && (
            <p className="mt-1 text-sm" style={{ color: AP_COLORS.quiet }}>{fr}</p>
          )}
          {!settings.calibrated && (
            <div className="mt-2.5">
              <span
                className="inline-flex items-center gap-1.5 rounded-xl px-2.5 py-[5px] text-[11.5px] font-bold"
                style={{ backgroundColor: AP_COLORS.goldTint, color: AP_COLORS.goldDeep }}
              >
                <FlaskConical className="h-3.5 w-3.5" /> Coach vocal en phase de calibrage
              </span>
              <p className="mt-1 text-xs leading-[1.35]" style={{ color: AP_COLORS.muted }}>
                Les scores servent de repère d’entraînement. Ils ne doivent pas être interprétés comme une validation
                linguistique.
              </p>
            </div>
          )}

          <div className="mt-[18px] flex justify-center">
            <button
              type="button"
              aria-label={stage === 'recording' ? 'Arrêter et comparer' : 'Enregistrer ma voix'}
              onClick={stage === 'analyzing' ? undefined : () => void toggle()}
              disabled={stage === 'analyzing'}
              className="flex h-[88px] w-[88px] items-center justify-center rounded-full"
              style={{ backgroundColor: micColor, boxShadow: `0 0 0 ${stage === 'recording' ? 14 : 8}px ${micColor}38` }}
            >
              {stage === 'analyzing' ? (
                <Loader2 className="h-8 w-8 animate-spin" style={{ color: AP_COLORS.goldInk }} />
              ) : stage === 'recording' ? (
                <Square className="h-[34px] w-[34px]" style={{ color: '#FFFFFF' }} fill="#FFFFFF" />
              ) : (
                <Mic className="h-[38px] w-[38px]" style={{ color: AP_COLORS.goldInk }} />
              )}
            </button>
          </div>
          <p className="mt-3 text-center text-xs" style={{ color: AP_COLORS.inkSoft }}>{stageMessage}</p>

          {result && (
            <>
              <div className="mt-[18px] flex items-center gap-3.5">
                <ScoreRing value={result.total} color={verdictColor(result.verdict)} />
                <div className="min-w-0 flex-1">
                  <p className="text-[22px] font-semibold" style={{ color: AP_COLORS.ink, fontFamily: 'Fraunces, ui-serif, serif' }}>
                    {verdictLabel(result.verdict)}
                  </p>
                  <div className="mt-1.5 space-y-1">
                    <ScoreBar label="Sons" value={result.sounds} />
                    <ScoreBar label="Mélodie" value={result.melody} />
                    <ScoreBar label="Rythme" value={result.rhythm} />
                  </div>
                </div>
              </div>

              <div className="mt-3.5 rounded-[20px] border p-3" style={{ borderColor: AP_COLORS.line, backgroundColor: AP_COLORS.surface }}>
                <p className="text-[12px] font-bold" style={{ color: AP_COLORS.ink }}>Mélodie de la voix (tons)</p>
                <div className="mt-2">
                  <ApContourChart reference={result.referenceContour} learner={result.learnerContour} />
                </div>
                <div className="mt-1.5 flex items-center gap-3.5">
                  <Legend color={AP_COLORS.gold} label="Référence" />
                  <Legend color={AP_COLORS.night} label="Ma voix" />
                </div>
              </div>

              <div className="mt-3 space-y-1.5">
                {result.advice.map((line, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <Lightbulb className="mt-0.5 h-[18px] w-[18px] shrink-0" style={{ color: AP_COLORS.goldDeep }} />
                    <p className="text-sm" style={{ color: AP_COLORS.inkSoft }}>{line}</p>
                  </div>
                ))}
              </div>

              <div className="mt-2.5 flex gap-2.5">
                <div className="flex-1">
                  <SecondaryButton label="Ma voix" icon={User} onClick={playMine} />
                </div>
                <div className="flex-1">
                  <SecondaryButton label="Les deux" icon={ArrowLeftRight} onClick={() => void playBoth()} />
                </div>
              </div>
            </>
          )}

          <p className="mt-3.5 text-center text-[11px]" style={{ color: AP_COLORS.muted }}>
            La comparaison guide ton oreille ; elle ne remplace pas l’avis d’un locuteur.
          </p>
        </div>
      </div>
    </div>
  );
}

function verdictColor(verdict: ApVoiceComparison['verdict']): string {
  switch (verdict) {
    case 'veryClose':
      return AP_COLORS.sage;
    case 'close':
      return AP_COLORS.gold;
    case 'retry':
      return AP_COLORS.clay;
  }
}

function ScoreRing({ value, color, size = 64 }: { value: number; color: string; size?: number }) {
  const stroke = 6;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, value));
  const offset = circumference * (1 - clamped / 100);
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`${value} sur 100`} className="shrink-0">
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={AP_COLORS.surfaceAlt} strokeWidth={stroke} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: 'stroke-dashoffset 0.5s ease' }}
      />
      <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central" fontSize={size * 0.22} fontWeight={800} fill={AP_COLORS.ink}>
        {value}
      </text>
    </svg>
  );
}

function ScoreBar({ label, value }: { label: string; value: number | null }) {
  const color = value == null ? AP_COLORS.line : value >= 60 ? AP_COLORS.sage : AP_COLORS.clay;
  return (
    <div className="flex items-center gap-2">
      <span className="w-[58px] shrink-0 text-[11.5px]" style={{ color: AP_COLORS.muted }}>{label}</span>
      <div className="h-[5px] flex-1 overflow-hidden rounded-full" style={{ backgroundColor: AP_COLORS.surfaceAlt }}>
        <div className="h-full rounded-full" style={{ width: `${value ?? 0}%`, backgroundColor: color }} />
      </div>
      <span className="w-[26px] shrink-0 text-right text-[11.5px]" style={{ color: AP_COLORS.muted }}>
        {value == null ? '—' : value}
      </span>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="h-[3px] w-3.5 shrink-0" style={{ backgroundColor: color }} />
      <span className="text-[11px]" style={{ color: AP_COLORS.muted }}>{label}</span>
    </span>
  );
}

function SecondaryButton({ label, icon: Icon, onClick }: { label: string; icon: typeof User; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-12 w-full items-center justify-center gap-2 rounded-full border text-sm font-bold"
      style={{ borderColor: AP_COLORS.lineStrong, backgroundColor: AP_COLORS.surface, color: AP_COLORS.ink }}
    >
      <Icon className="h-[18px] w-[18px]" style={{ color: AP_COLORS.goldDeep }} />
      <span>{label}</span>
    </button>
  );
}
