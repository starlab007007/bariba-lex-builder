import { useCallback, useEffect, useMemo, useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, CheckCircle2, Clock3, Loader2, Mic, Play, RefreshCw, RotateCcw,
  Send, ShieldCheck, Square,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useApVoiceAccess } from '@/hooks/useApVoiceAccess';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import { blobToWav16kMono } from '@/lib/audioToWav';
import { apDecodeWav, apMeasureTake, apSyllableCount, type ApTakeQuality } from '@/lib/apprendre/voiceAnalysis';
import { AP_COLORS } from '@/components/apprendre/apColors';

const db = supabase as unknown as SupabaseClient;
const BUCKET = 'apprendre-audio';

type Item = {
  audio_key: string;
  text_ba: string;
  text_fr: string | null;
  text_hash: string;
  kind: string;
  source_page: number | null;
  priority: number;
};

type Consent = {
  display_name: string | null;
  show_name: boolean;
  allow_ai_training: boolean;
  voice: string;
  variant: string;
  withdrawn_at: string | null;
};

type Settings = {
  consent_text: string;
  consent_version: string;
  min_quality_score: number;
  default_variant: string;
};

const KIND_LABELS: Record<string, string> = {
  mot: 'Mot',
  forme: 'Forme',
  exemple: 'Exemple',
  lecon: 'Phrase',
  scene: 'Réplique',
  proverbe: 'Expression',
};

const STATUS_LABELS: Record<string, string> = {
  submitted: 'En validation',
  approved: 'Approuvée',
  needs_fix: 'À refaire',
  rejected: 'Rejetée',
  draft: 'Brouillon',
};

function errText(error: unknown) {
  return error && typeof error === 'object' && 'message' in error
    ? String((error as { message: unknown }).message)
    : 'Erreur inconnue';
}

function Metric({ label, value, ok }: { label: string; value: string; ok?: boolean }) {
  return (
    <div className="rounded-2xl border px-3 py-2" style={{ borderColor: AP_COLORS.line, background: AP_COLORS.surface }}>
      <p className="text-[11px] font-bold uppercase tracking-wide" style={{ color: AP_COLORS.muted }}>{label}</p>
      <p className="mt-0.5 text-sm font-extrabold" style={{ color: ok === false ? AP_COLORS.clay : AP_COLORS.ink }}>{value}</p>
    </div>
  );
}

function ConsentPanel({
  settings,
  onSigned,
}: {
  settings: Settings;
  onSigned: () => Promise<void>;
}) {
  const [name, setName] = useState('');
  const [showName, setShowName] = useState(false);
  const [allowAi, setAllowAi] = useState(false);
  const [voice, setVoice] = useState('femme');
  const [variant, setVariant] = useState(settings.default_variant || 'nikki');
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);

  const sign = async () => {
    if (!agree || !name.trim()) return;
    setBusy(true);
    const { error } = await db.rpc('apprendre_sign_consent', {
      _display_name: name.trim(),
      _show_name: showName,
      _allow_ai_training: allowAi,
      _voice: voice,
      _variant: variant.trim() || settings.default_variant || 'nikki',
    });
    setBusy(false);
    if (error) {
      toast.error(errText(error));
      return;
    }
    toast.success('Accord signé. Le Studio Voix est activé.');
    await onSigned();
  };

  return (
    <div className="mx-auto max-w-2xl px-5 py-6">
      <div className="rounded-[28px] border p-5" style={{ borderColor: AP_COLORS.line, background: AP_COLORS.surface }}>
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl" style={{ background: AP_COLORS.goldTint }}>
            <ShieldCheck className="h-6 w-6" style={{ color: AP_COLORS.goldDeep }} />
          </div>
          <div>
            <h2 className="text-xl font-black">Activer mon rôle de locuteur</h2>
            <p className="text-sm" style={{ color: AP_COLORS.muted }}>Un accord est requis avant le premier enregistrement.</p>
          </div>
        </div>

        <div className="mt-5 rounded-2xl p-4 text-sm leading-relaxed whitespace-pre-wrap" style={{ background: AP_COLORS.surfaceAlt, color: AP_COLORS.inkSoft }}>
          {settings.consent_text || 'J’autorise FITILA à utiliser mes enregistrements validés comme voix de référence dans le module Apprendre. Je peux retirer mon consentement ultérieurement.'}
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <label className="text-sm font-bold">Nom affiché
            <input value={name} onChange={e => setName(e.target.value)} className="mt-1.5 w-full rounded-2xl border px-3 py-3 font-normal outline-none" style={{ borderColor: AP_COLORS.line }} placeholder="Nom du locuteur" />
          </label>
          <label className="text-sm font-bold">Variante
            <input value={variant} onChange={e => setVariant(e.target.value)} className="mt-1.5 w-full rounded-2xl border px-3 py-3 font-normal outline-none" style={{ borderColor: AP_COLORS.line }} placeholder="nikki" />
          </label>
        </div>
        <div className="mt-3 flex gap-2">
          {['femme', 'homme'].map(v => (
            <button key={v} onClick={() => setVoice(v)} className="flex-1 rounded-full border px-4 py-2.5 text-sm font-bold" style={{ borderColor: voice === v ? AP_COLORS.gold : AP_COLORS.line, background: voice === v ? AP_COLORS.goldTint : AP_COLORS.surface }}>
              Voix {v}
            </button>
          ))}
        </div>
        <label className="mt-4 flex items-start gap-3 text-sm">
          <input type="checkbox" checked={showName} onChange={e => setShowName(e.target.checked)} className="mt-1" />
          <span>Afficher mon nom avec les audios publiés.</span>
        </label>
        <label className="mt-3 flex items-start gap-3 text-sm">
          <input type="checkbox" checked={allowAi} onChange={e => setAllowAi(e.target.checked)} className="mt-1" />
          <span>J’accepte aussi que mes enregistrements servent à améliorer les modèles vocaux FITILA. <strong>Facultatif.</strong></span>
        </label>
        <label className="mt-3 flex items-start gap-3 text-sm font-semibold">
          <input type="checkbox" checked={agree} onChange={e => setAgree(e.target.checked)} className="mt-1" />
          <span>J’ai lu et j’accepte l’accord d’utilisation de ma voix.</span>
        </label>
        <button disabled={!agree || !name.trim() || busy} onClick={sign} className="mt-5 flex h-13 w-full items-center justify-center gap-2 rounded-full px-4 py-3.5 font-extrabold disabled:opacity-40" style={{ background: AP_COLORS.gold, color: AP_COLORS.goldInk }}>
          {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Mic className="h-5 w-5" />} Signer et commencer
        </button>
      </div>
    </div>
  );
}

export default function FitilaApprendreVoiceStudio() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const access = useApVoiceAccess();
  const recorder = useAudioRecorder();

  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<Settings>({ consent_text: '', consent_version: '1', min_quality_score: 60, default_variant: 'nikki' });
  const [consent, setConsent] = useState<Consent | null>(null);
  const [queue, setQueue] = useState<Item[]>([]);
  const [index, setIndex] = useState(0);
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  const [previousStatus, setPreviousStatus] = useState<Record<string, string>>({});
  const [lotTitle, setLotTitle] = useState('Priorités du catalogue');
  const [wavBlob, setWavBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [quality, setQuality] = useState<ApTakeQuality | null>(null);
  const [processing, setProcessing] = useState(false);
  const [sending, setSending] = useState(false);

  const current = queue[index] ?? null;
  const minQuality = settings.min_quality_score || 60;

  const resetTake = useCallback(() => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setWavBlob(null);
    setQuality(null);
    recorder.cancelRecording();
  }, [previewUrl, recorder.cancelRecording]);

  const load = useCallback(async () => {
    if (!user || !access.speaker) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [{ data: settingsRow, error: settingsError }, { data: consentRow, error: consentError }] = await Promise.all([
        db.from('apprendre_audio_settings').select('consent_text, consent_version, min_quality_score, default_variant').eq('id', 1).maybeSingle(),
        db.from('apprendre_voice_consents').select('display_name, show_name, allow_ai_training, voice, variant, withdrawn_at').eq('user_id', user.id).maybeSingle(),
      ]);
      if (settingsError) throw settingsError;
      if (consentError) throw consentError;
      const nextSettings = (settingsRow || {}) as Partial<Settings>;
      setSettings({
        consent_text: nextSettings.consent_text || '',
        consent_version: nextSettings.consent_version || '1',
        min_quality_score: Number(nextSettings.min_quality_score ?? 60),
        default_variant: nextSettings.default_variant || 'nikki',
      });
      const activeConsent = consentRow && !(consentRow as Consent).withdrawn_at ? consentRow as Consent : null;
      setConsent(activeConsent);
      if (!activeConsent) {
        setQueue([]);
        setLoading(false);
        return;
      }

      const { data: mine, error: mineError } = await db
        .from('apprendre_audio_takes')
        .select('audio_key, status, created_at')
        .eq('speaker_id', user.id)
        .order('created_at', { ascending: false })
        .limit(3000);
      if (mineError) throw mineError;

      const counts: Record<string, number> = {};
      const latest: Record<string, string> = {};
      const done = new Set<string>();
      for (const row of mine || []) {
        const status = String(row.status);
        counts[status] = (counts[status] || 0) + 1;
        if (!(String(row.audio_key) in latest)) latest[String(row.audio_key)] = status;
        if (!['rejected', 'needs_fix', 'withdrawn'].includes(status)) done.add(String(row.audio_key));
      }
      setStatusCounts(counts);
      setPreviousStatus(latest);

      const { data: lots, error: lotsError } = await db
        .from('apprendre_audio_assignments')
        .select('title, audio_keys, created_at')
        .eq('speaker_id', user.id)
        .eq('status', 'open')
        .order('created_at', { ascending: true });
      if (lotsError) throw lotsError;

      const assignedKeys: string[] = [];
      let title = '';
      for (const lot of lots || []) {
        if (!title) title = String(lot.title || 'Lot attribué');
        for (const key of (lot.audio_keys || []) as string[]) {
          if (!done.has(String(key))) assignedKeys.push(String(key));
        }
      }

      let items: Item[] = [];
      if (assignedKeys.length) {
        for (let from = 0; from < assignedKeys.length; from += 200) {
          const chunk = assignedKeys.slice(from, from + 200);
          const { data, error } = await db
            .from('apprendre_audio_items')
            .select('audio_key, text_ba, text_fr, text_hash, kind, source_page, priority')
            .in('audio_key', chunk)
            .eq('in_content', true);
          if (error) throw error;
          items.push(...((data || []) as Item[]));
        }
        const order = new Map(assignedKeys.map((key, pos) => [key, pos]));
        items.sort((a, b) => (order.get(a.audio_key) ?? 0) - (order.get(b.audio_key) ?? 0));
      } else {
        title = 'Priorités du catalogue';
        const { data, error } = await db
          .from('apprendre_audio_items')
          .select('audio_key, text_ba, text_fr, text_hash, kind, source_page, priority')
          .eq('in_content', true)
          .order('priority', { ascending: true })
          .order('audio_key', { ascending: true })
          .range(0, 399);
        if (error) throw error;
        items = ((data || []) as Item[]).filter(item => !done.has(item.audio_key));

        if (items.length) {
          const keys = items.map(i => i.audio_key);
          const { data: published, error: pubError } = await db
            .rpc('apprendre_audio_manifest')
            .in('audio_key', keys)
            .eq('voice', activeConsent.voice || 'femme');
          if (pubError) throw pubError;
          const covered = new Set((published || []).map((row: { audio_key: string }) => row.audio_key));
          items = items.filter(item => !covered.has(item.audio_key));
        }
      }

      setLotTitle(title);
      setQueue(items);
      setIndex(0);
    } catch (error) {
      toast.error(`Studio indisponible : ${errText(error)}`);
    } finally {
      setLoading(false);
    }
  }, [user, access.speaker]);

  useEffect(() => {
    if (!access.loading) void load();
  }, [access.loading, load]);

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  useEffect(() => {
    const raw = recorder.audioBlob;
    const item = current;
    if (!raw || recorder.isRecording || !processing || !item) return;
    let cancelled = false;
    (async () => {
      try {
        const converted = await blobToWav16kMono(raw);
        const bytes = new Uint8Array(await converted.blob.arrayBuffer());
        const pcm = apDecodeWav(bytes);
        if (!pcm) throw new Error('Le fichier audio produit est illisible.');
        const measured = apMeasureTake(pcm, apSyllableCount(item.text_ba));
        if (cancelled) return;
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setWavBlob(converted.blob);
        setPreviewUrl(URL.createObjectURL(converted.blob));
        setQuality(measured);
      } catch (error) {
        toast.error(`Analyse impossible : ${errText(error)}`);
      } finally {
        if (!cancelled) setProcessing(false);
      }
    })();
    return () => { cancelled = true; };
  }, [recorder.audioBlob, recorder.isRecording, processing, current, previewUrl]);

  const toggleRecord = async () => {
    if (recorder.isRecording) {
      setProcessing(true);
      await recorder.stopRecording();
      return;
    }
    resetTake();
    const stream = await recorder.startRecording();
    if (!stream) toast.error(recorder.error || 'Microphone indisponible.');
  };

  const send = async () => {
    if (!user || !current || !wavBlob || !quality || !consent) return;
    if (quality.score < minQuality) {
      toast.error(`Qualité insuffisante : ${quality.score}/100. Minimum : ${minQuality}.`);
      return;
    }
    setSending(true);
    const safeKey = current.audio_key.replace(/[^A-Za-z0-9_-]/g, '_');
    const path = `${user.id}/${safeKey}/${Date.now()}.wav`;
    try {
      const { error: uploadError } = await db.storage.from(BUCKET).upload(path, wavBlob, {
        contentType: 'audio/wav',
        upsert: false,
      });
      if (uploadError) throw uploadError;

      const { data: take, error: insertError } = await db
        .from('apprendre_audio_takes')
        .insert({
          audio_key: current.audio_key,
          text_hash: current.text_hash,
          speaker_id: user.id,
          voice: consent.voice || 'femme',
          variant: consent.variant || settings.default_variant || 'nikki',
          storage_path: path,
          mime_type: 'audio/wav',
          duration_ms: quality.durationMs,
          peak_db: Number(quality.peakDb.toFixed(1)),
          rms_db: Number(quality.rmsDb.toFixed(1)),
          snr_db: Number(quality.snrDb.toFixed(1)),
          silence_ratio: Number(quality.silenceRatio.toFixed(3)),
          quality_score: quality.score,
        })
        .select('id')
        .single();
      if (insertError) throw insertError;

      const { error: submitError } = await db.rpc('apprendre_submit_take', { _take_id: take.id });
      if (submitError) {
        await db.from('apprendre_audio_takes').delete().eq('id', take.id);
        await db.storage.from(BUCKET).remove([path]);
        throw submitError;
      }

      toast.success('Audio confirmé et envoyé à la validation.');
      setStatusCounts(prev => ({ ...prev, submitted: (prev.submitted || 0) + 1 }));
      setPreviousStatus(prev => ({ ...prev, [current.audio_key]: 'submitted' }));
      resetTake();
      setIndex(i => i + 1);
    } catch (error) {
      toast.error(`Envoi refusé : ${errText(error)}`);
    } finally {
      setSending(false);
    }
  };

  const skip = () => {
    resetTake();
    setIndex(i => i + 1);
  };

  if (access.loading || loading) {
    return <div className="flex h-full items-center justify-center" style={{ background: AP_COLORS.ivory }}><Loader2 className="h-8 w-8 animate-spin" style={{ color: AP_COLORS.goldDeep }} /></div>;
  }

  if (!user) {
    return (
      <div className="flex h-full items-center justify-center px-6" style={{ background: AP_COLORS.ivory }}>
        <div className="max-w-md text-center"><Mic className="mx-auto h-10 w-10" style={{ color: AP_COLORS.goldDeep }} /><h1 className="mt-3 text-xl font-black">Connexion requise</h1><p className="mt-2 text-sm" style={{ color: AP_COLORS.muted }}>Connectez-vous avec le compte auquel le rôle « Locuteur voix » a été attribué.</p><button onClick={() => navigate('/auth')} className="mt-5 rounded-full px-6 py-3 font-bold" style={{ background: AP_COLORS.gold }}>Se connecter</button></div>
      </div>
    );
  }

  if (!access.speaker) {
    return (
      <div className="flex h-full items-center justify-center px-6" style={{ background: AP_COLORS.ivory }}>
        <div className="max-w-md text-center"><ShieldCheck className="mx-auto h-10 w-10" style={{ color: AP_COLORS.clay }} /><h1 className="mt-3 text-xl font-black">Rôle Locuteur voix requis</h1><p className="mt-2 text-sm" style={{ color: AP_COLORS.muted }}>L’administrateur doit attribuer le rôle « Locuteur voix » à ce compte.</p><button onClick={() => navigate('/learn')} className="mt-5 rounded-full border px-6 py-3 font-bold" style={{ borderColor: AP_COLORS.line }}>Retour à Apprendre</button></div>
      </div>
    );
  }

  if (!consent) {
    return (
      <div className="h-full overflow-y-auto" style={{ background: AP_COLORS.ivory, color: AP_COLORS.ink }}>
        <header className="sticky top-0 z-10 border-b px-4 py-3" style={{ borderColor: AP_COLORS.line, background: AP_COLORS.ivory }}>
          <div className="mx-auto flex max-w-3xl items-center gap-3"><button onClick={() => navigate('/learn')} className="flex h-11 w-11 items-center justify-center rounded-full border" style={{ borderColor: AP_COLORS.line }}><ArrowLeft className="h-5 w-5" /></button><div><h1 className="font-black">Studio Voix</h1><p className="text-xs" style={{ color: AP_COLORS.muted }}>Voix de référence du bàátɔ̀nú</p></div></div>
        </header>
        <ConsentPanel settings={settings} onSigned={load} />
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto" style={{ background: AP_COLORS.ivory, color: AP_COLORS.ink }}>
      <header className="sticky top-0 z-10 border-b px-4 py-3" style={{ borderColor: AP_COLORS.line, background: 'rgba(247,245,236,.96)', backdropFilter: 'blur(12px)' }}>
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <button onClick={() => navigate('/learn')} className="flex h-11 w-11 items-center justify-center rounded-full border" style={{ borderColor: AP_COLORS.line, background: AP_COLORS.surface }}><ArrowLeft className="h-5 w-5" /></button>
          <div className="min-w-0 flex-1"><h1 className="truncate font-black">Studio Voix</h1><p className="truncate text-xs" style={{ color: AP_COLORS.muted }}>{consent.display_name || 'Locuteur'} · {consent.voice} · {consent.variant}</p></div>
          <button onClick={load} className="flex h-10 w-10 items-center justify-center rounded-full border" style={{ borderColor: AP_COLORS.line }}><RefreshCw className="h-4 w-4" /></button>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 pb-12 pt-5">
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full px-3 py-1.5 text-xs font-bold" style={{ background: AP_COLORS.goldTint, color: AP_COLORS.goldDeep }}><Mic className="mr-1 inline h-3.5 w-3.5" />{Math.max(0, queue.length - index)} à enregistrer</span>
          <span className="rounded-full px-3 py-1.5 text-xs font-bold" style={{ background: AP_COLORS.surfaceAlt }}><Clock3 className="mr-1 inline h-3.5 w-3.5" />{statusCounts.submitted || 0} en validation</span>
          <span className="rounded-full px-3 py-1.5 text-xs font-bold" style={{ background: AP_COLORS.sageTint, color: AP_COLORS.sageInk }}><CheckCircle2 className="mr-1 inline h-3.5 w-3.5" />{statusCounts.approved || 0} approuvées</span>
        </div>

        <p className="mt-6 text-[11px] font-black uppercase tracking-wide" style={{ color: AP_COLORS.goldDeep }}>{lotTitle}</p>

        {!current ? (
          <div className="mt-3 rounded-[24px] border p-8 text-center" style={{ borderColor: AP_COLORS.line, background: AP_COLORS.surface }}>
            <CheckCircle2 className="mx-auto h-10 w-10" style={{ color: AP_COLORS.sage }} />
            <h2 className="mt-3 text-xl font-black">Lot terminé</h2>
            <p className="mt-1 text-sm" style={{ color: AP_COLORS.muted }}>Tous les textes disponibles ont été traités. Actualisez lorsqu’un nouveau lot vous est affecté.</p>
          </div>
        ) : (
          <>
            <div className="mt-3 rounded-[26px] border p-5" style={{ borderColor: AP_COLORS.line, background: AP_COLORS.surface }}>
              <div className="flex items-center gap-2">
                <span className="rounded-xl px-2.5 py-1 text-[11px] font-bold" style={{ background: AP_COLORS.surfaceAlt }}>{KIND_LABELS[current.kind] || current.kind}</span>
                {current.source_page && <span className="rounded-xl px-2.5 py-1 text-[11px]" style={{ background: AP_COLORS.surfaceAlt }}>Dictionnaire p. {current.source_page}</span>}
                <span className="ml-auto text-xs" style={{ color: AP_COLORS.muted }}>{index + 1}/{queue.length}</span>
              </div>
              <p className="mt-4 text-[30px] font-black leading-tight">{current.text_ba}</p>
              {current.text_fr && <p className="mt-2 text-sm leading-relaxed" style={{ color: AP_COLORS.quiet }}>{current.text_fr}</p>}
              {['needs_fix', 'rejected'].includes(previousStatus[current.audio_key]) && (
                <div className="mt-3 rounded-2xl px-3 py-2 text-xs font-bold" style={{ background: AP_COLORS.clayTint, color: AP_COLORS.clayInk }}>Cette lecture doit être refaite après validation précédente.</div>
              )}
            </div>

            <div className="mt-6 text-center">
              <button
                onClick={toggleRecord}
                disabled={processing || sending}
                className="mx-auto flex h-24 w-24 items-center justify-center rounded-full shadow-lg disabled:opacity-50"
                style={{ background: recorder.isRecording ? AP_COLORS.clay : AP_COLORS.gold, color: recorder.isRecording ? '#fff' : AP_COLORS.goldInk }}
              >
                {processing ? <Loader2 className="h-9 w-9 animate-spin" /> : recorder.isRecording ? <Square className="h-9 w-9 fill-current" /> : <Mic className="h-10 w-10" />}
              </button>
              <p className="mt-3 text-sm font-semibold" style={{ color: AP_COLORS.inkSoft }}>
                {processing ? 'Analyse de la prise…' : recorder.isRecording ? `Enregistrement… ${recorder.duration}s · appuyez pour arrêter` : wavBlob ? 'Réécoutez puis confirmez l’envoi.' : 'Micro à 15–20 cm · dites uniquement le texte affiché.'}
              </p>
            </div>

            {quality && previewUrl && (
              <div className="mt-5 rounded-[24px] border p-4" style={{ borderColor: quality.score >= minQuality ? AP_COLORS.sage : AP_COLORS.clay, background: quality.score >= minQuality ? AP_COLORS.sageTint : AP_COLORS.clayTint }}>
                <div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase">Contrôle automatique</p><p className="text-2xl font-black">{quality.score}/100</p></div><span className="rounded-full px-3 py-1 text-xs font-bold" style={{ background: AP_COLORS.surface }}>{quality.score >= minQuality ? 'Prêt à confirmer' : `Minimum ${minQuality}`}</span></div>
                <audio className="mt-3 w-full" controls src={previewUrl} />
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <Metric label="Durée" value={`${(quality.durationMs / 1000).toFixed(1)} s`} />
                  <Metric label="S/B" value={`${quality.snrDb.toFixed(0)} dB`} ok={quality.snrDb >= 20} />
                  <Metric label="Silence" value={`${Math.round(quality.silenceRatio * 100)} %`} ok={quality.silenceRatio <= .75} />
                  <Metric label="Niveau" value={`${quality.peakDb.toFixed(0)} dB`} ok={quality.peakDb >= -24} />
                </div>
                {quality.problems.length > 0 && <div className="mt-3 space-y-1">{quality.problems.map(problem => <p key={problem} className="text-xs font-semibold" style={{ color: AP_COLORS.clayInk }}>• {problem}</p>)}</div>}
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <button onClick={toggleRecord} className="flex items-center justify-center gap-2 rounded-full border px-4 py-3 text-sm font-bold" style={{ borderColor: AP_COLORS.lineStrong, background: AP_COLORS.surface }}><RotateCcw className="h-4 w-4" />Refaire</button>
                  <button onClick={send} disabled={sending || quality.score < minQuality} className="flex items-center justify-center gap-2 rounded-full px-4 py-3 text-sm font-black disabled:opacity-40" style={{ background: AP_COLORS.gold, color: AP_COLORS.goldInk }}>{sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}Confirmer & envoyer</button>
                </div>
              </div>
            )}

            <button onClick={skip} disabled={recorder.isRecording || processing || sending} className="mt-4 w-full py-2 text-sm font-bold disabled:opacity-40" style={{ color: AP_COLORS.muted }}>Passer ce texte</button>
          </>
        )}

        <div className="mt-8 rounded-[22px] border p-4 text-sm" style={{ borderColor: AP_COLORS.line, background: AP_COLORS.surface }}>
          <p className="font-black">Circuit de publication</p>
          <p className="mt-1" style={{ color: AP_COLORS.muted }}>1. Vous enregistrez et confirmez → 2. un validateur écoute et approuve → 3. l’administration publie → 4. la voix apparaît automatiquement sur le mot, la phrase ou l’expression correspondante.</p>
        </div>
      </main>
    </div>
  );
}
