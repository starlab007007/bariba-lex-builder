import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowLeftRight,
  BookOpen,
  Check,
  Clipboard,
  Copy,
  Loader2,
  Mic,
  Pencil,
  RefreshCw,
  Send,
  Sparkles,
  Trash2,
  Volume2,
  Wand2,
  WifiOff,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { SmartVoiceRecorder } from '@/components/voice/SmartVoiceRecorder';
import { byT5TranslationService } from '@/services/ByT5TranslationService';
import { useBaribaTTS } from '@/hooks/useBaribaTTS';
import { useFrenchTTS } from '@/hooks/useFrenchTTS';
import { useBaribaSTT } from '@/hooks/useBaribaSTT';
import { useTamTamPosts } from '@/hooks/useTamTamPosts';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

type Direction = 'fr-ba' | 'ba-fr';
type StudioState =
  | 'idle'
  | 'typing'
  | 'translating'
  | 'translated'
  | 'editing'
  | 'generating-audio'
  | 'publishing'
  | 'contributing-corpus'
  | 'success'
  | 'partial-success'
  | 'error'
  | 'offline';

type RefineStyle = 'correct' | 'simplify' | 'natural' | 'formal';

const EXAMPLES = [
  'Bonjour, comment vas-tu ?',
  'Je vais au marché',
  'Le patient a pris son traitement',
  'Nous allons à l’école demain',
];

const MAX_TEXT_LENGTH = 10000;
const DRAFT_KEY = 'fitila:sasara-ia:draft:v1';

const humanError = (error: unknown, fallback: string) => {
  const message = error instanceof Error ? error.message : String(error || '');
  if (/network|fetch|failed to fetch|timeout|aborted/i.test(message)) {
    return 'Le réseau est indisponible ou trop lent. Votre texte est conservé.';
  }
  if (/unauthorized|auth|jwt|session/i.test(message)) {
    return 'Votre session a expiré. Reconnectez-vous pour continuer.';
  }
  if (/rate limit|429/i.test(message)) {
    return 'Le service de traduction est très sollicité. Réessayez dans un instant.';
  }
  if (/credit|402/i.test(message)) {
    return 'Le service IA est momentanément indisponible.';
  }
  return fallback;
};

export default function SasaraIA() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { createPost } = useTamTamPosts();
  const baribaTTS = useBaribaTTS();
  const frenchTTS = useFrenchTTS();
  const baribaSTT = useBaribaSTT();

  const [direction, setDirection] = useState<Direction>('fr-ba');
  const [sourceText, setSourceText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [state, setState] = useState<StudioState>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [showRecorder, setShowRecorder] = useState(false);
  const [corpusConsent, setCorpusConsent] = useState(false);
  const [corpusSaved, setCorpusSaved] = useState(false);
  const [monthlyCorpusCount, setMonthlyCorpusCount] = useState(0);
  const [translationMethod, setTranslationMethod] = useState('');
  const [online, setOnline] = useState(() => navigator.onLine);

  const sourceLanguage = direction === 'fr-ba' ? 'french' : 'bariba';
  const targetLanguage = direction === 'fr-ba' ? 'bariba' : 'french';
  const sourceLabel = sourceLanguage === 'french' ? 'Français' : 'Bariba';
  const targetLabel = targetLanguage === 'french' ? 'Français' : 'Bariba';

  const canTranslate = sourceText.trim().length > 0 && state !== 'translating';
  const hasResult = translatedText.trim().length > 0;

  useEffect(() => {
    const onOnline = () => {
      setOnline(true);
      setState((current) => (current === 'offline' ? (translatedText ? 'translated' : 'typing') : current));
    };
    const onOffline = () => {
      setOnline(false);
      setState('offline');
    };
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, [translatedText]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (!saved) return;
      const draft = JSON.parse(saved);
      if (draft.direction === 'fr-ba' || draft.direction === 'ba-fr') setDirection(draft.direction);
      if (typeof draft.sourceText === 'string') setSourceText(draft.sourceText);
      if (typeof draft.translatedText === 'string') setTranslatedText(draft.translatedText);
      if (draft.sourceText) setState(draft.translatedText ? 'translated' : 'typing');
    } catch {
      // Draft recovery is best effort only.
    }
  }, []);

  useEffect(() => {
    const payload = JSON.stringify({ direction, sourceText, translatedText });
    localStorage.setItem(DRAFT_KEY, payload);
  }, [direction, sourceText, translatedText]);

  const refreshCorpusCount = useCallback(async () => {
    if (!user) {
      setMonthlyCorpusCount(0);
      return;
    }
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    try {
      const { count } = await (supabase as any)
        .from('corpus_contributions')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('created_at', monthStart.toISOString());
      setMonthlyCorpusCount(count || 0);
    } catch {
      setMonthlyCorpusCount(0);
    }
  }, [user]);

  useEffect(() => {
    void refreshCorpusCount();
  }, [refreshCorpusCount]);

  const switchDirection = (next?: Direction) => {
    const newDirection = next || (direction === 'fr-ba' ? 'ba-fr' : 'fr-ba');
    setDirection(newDirection);
    setSourceText(translatedText || sourceText);
    setTranslatedText('');
    setCorpusSaved(false);
    setErrorMessage('');
    setState(sourceText || translatedText ? 'typing' : 'idle');
  };

  const translate = async () => {
    const input = sourceText.trim();
    setErrorMessage('');

    if (!input) {
      setState('error');
      setErrorMessage('Entrez une phrase pour commencer.');
      return;
    }
    if (input.length > MAX_TEXT_LENGTH) {
      setState('error');
      setErrorMessage('Ce texte est trop long. Limitez la traduction à 10 000 caractères.');
      return;
    }
    if (!navigator.onLine) {
      setOnline(false);
      setState('offline');
      setErrorMessage('Vous êtes hors ligne. Le texte est conservé et pourra être traduit au retour du réseau.');
      return;
    }

    setState('translating');
    setCorpusSaved(false);

    try {
      let translation = '';
      let method = 'ByT5 Expert';

      try {
        const result = await byT5TranslationService.translate(
          input,
          sourceLanguage,
          targetLanguage,
          'quality',
          true,
        );
        translation = result.translation;
        method = result.method || method;
      } catch (primaryError) {
        const { data, error } = await supabase.functions.invoke('ai-translate', {
          body: {
            text: input,
            sourceLang: sourceLanguage,
            targetLang: targetLanguage,
          },
        });
        if (error || data?.error || !data?.translation) {
          throw primaryError;
        }
        translation = String(data.translation);
        method = data.model || 'IA FITILA';
      }

      if (!translation.trim()) throw new Error('Empty translation');
      setTranslatedText(translation.trim());
      setTranslationMethod(method);
      setState('translated');
    } catch (error) {
      setState('error');
      setErrorMessage(humanError(error, 'Impossible de traduire pour le moment. Réessayez.'));
    }
  };

  const refine = async (style: RefineStyle) => {
    if (!translatedText.trim()) return;
    if (!navigator.onLine) {
      setState('offline');
      setErrorMessage('La correction IA nécessite une connexion. Votre texte reste disponible.');
      return;
    }

    setState('editing');
    setErrorMessage('');
    try {
      const { data, error } = await supabase.functions.invoke('refine-bariba', {
        body: {
          text: translatedText,
          type: 'translation',
          direction,
          originalInput: sourceText,
          style,
        },
      });

      if (error || data?.error && !data?.refined || !data?.refined) {
        throw error || new Error(data?.error || 'Refinement failed');
      }

      setTranslatedText(String(data.refined));
      setState('translated');
      toast({ title: 'Texte amélioré', description: 'Vous pouvez encore le modifier manuellement avant publication.' });
    } catch (error) {
      setState('error');
      setErrorMessage(humanError(error, 'Impossible de corriger avec l’IA pour le moment.'));
    }
  };

  const speak = async (text: string, lang: 'french' | 'bariba') => {
    if (!text.trim()) return;
    setState('generating-audio');
    try {
      if (lang === 'bariba') {
        await baribaTTS.speak(text);
      } else {
        await frenchTTS.speak(text);
      }
      setState(hasResult ? 'translated' : 'typing');
    } catch {
      setState(hasResult ? 'translated' : 'typing');
      toast({ title: 'Lecture audio indisponible', description: 'Le texte reste utilisable.', variant: 'destructive' });
    }
  };

  const copyText = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: label + ' copié' });
    } catch {
      toast({ title: 'Impossible de copier', variant: 'destructive' });
    }
  };

  const saveCorpus = useCallback(async () => {
    if (!corpusConsent || corpusSaved) return true;
    if (!user) {
      throw new Error('AUTH_REQUIRED');
    }
    if (!sourceText.trim() || !translatedText.trim()) return true;

    const { error } = await (supabase as any)
      .from('corpus_contributions')
      .insert({
        user_id: user.id,
        source_lang: sourceLanguage,
        target_lang: targetLanguage,
        source_text: sourceText.trim(),
        translated_text: translatedText.trim(),
      });

    if (error) throw error;
    setCorpusSaved(true);
    await refreshCorpusCount();
    return true;
  }, [
    corpusConsent,
    corpusSaved,
    user,
    sourceText,
    translatedText,
    sourceLanguage,
    targetLanguage,
    refreshCorpusCount,
  ]);

  const publish = async () => {
    if (!hasResult) return;
    if (!user) {
      toast({ title: 'Connexion requise', description: 'Connectez-vous pour publier dans le fil FITILA.', variant: 'destructive' });
      navigate('/fitila/auth');
      return;
    }

    setState('publishing');
    setErrorMessage('');

    const transcriptFr = direction === 'fr-ba' ? sourceText.trim() : translatedText.trim();
    const transcriptBa = direction === 'fr-ba' ? translatedText.trim() : sourceText.trim();

    try {
      await createPost({
        media_type: 'text',
        transcript_fr: transcriptFr,
        transcript_ba: transcriptBa,
        topic: 'sasara-ia',
        hashtags: ['SasaraIA', 'FITILA', 'Baatonum'],
      });

      if (corpusConsent) {
        setState('contributing-corpus');
        try {
          await saveCorpus();
          setState('success');
          toast({ title: 'Publication bilingue réussie', description: 'La paire a aussi enrichi le corpus communautaire.' });
        } catch {
          setState('partial-success');
          toast({
            title: 'Publication réussie',
            description: 'Le contenu est publié. Seule la contribution au corpus n’a pas pu être enregistrée.',
          });
        }
      } else {
        setState('success');
        toast({ title: 'Publication bilingue réussie' });
      }
    } catch (error) {
      setState('error');
      setErrorMessage(humanError(error, 'La publication a échoué. Votre traduction est conservée.'));
    }
  };

  const contributeNow = async () => {
    if (!corpusConsent || corpusSaved) return;
    if (!user) {
      toast({ title: 'Connexion requise', description: 'Connectez-vous pour contribuer au corpus.', variant: 'destructive' });
      return;
    }
    setState('contributing-corpus');
    try {
      await saveCorpus();
      setState('translated');
      toast({ title: 'Contribution enregistrée', description: 'Merci d’enrichir la mémoire de traduction communautaire.' });
    } catch {
      setState('translated');
      toast({ title: 'Contribution non enregistrée', description: 'Votre traduction reste intacte.', variant: 'destructive' });
    }
  };

  const onVoiceReady = async (audioBase64: string, _duration?: number, liveTranscript?: string) => {
    try {
      if (sourceLanguage === 'french') {
        if (liveTranscript?.trim()) {
          setSourceText(liveTranscript.trim());
          setState('typing');
          setShowRecorder(false);
          return;
        }
        toast({ title: 'Aucune transcription détectée', description: 'Réessayez en parlant un peu plus longtemps.', variant: 'destructive' });
        return;
      }

      const result = await baribaSTT.transcribe(audioBase64, { robustMode: true, speakerType: 'Auto' });
      if (!result?.transcription) {
        toast({ title: 'Dictée Bariba indisponible', description: 'Vous pouvez continuer en saisissant le texte.', variant: 'destructive' });
        return;
      }
      setSourceText(result.transcription);
      setState('typing');
      setShowRecorder(false);
    } catch {
      toast({ title: 'Dictée indisponible', description: 'Votre saisie existante est conservée.', variant: 'destructive' });
    }
  };

  const stateLabel = useMemo(() => {
    if (!online || state === 'offline') return 'Hors ligne';
    if (state === 'translating') return 'Traduction IA…';
    if (state === 'editing') return 'Amélioration IA…';
    if (state === 'publishing') return 'Publication…';
    if (state === 'contributing-corpus') return 'Contribution corpus…';
    if (state === 'partial-success') return 'Publié · corpus en attente';
    if (state === 'success') return 'Prêt';
    return 'Studio prêt';
  }, [online, state]);

  const isBusy = ['translating', 'editing', 'publishing', 'contributing-corpus', 'generating-audio'].includes(state);

  return (
    <div
      className="min-h-[100dvh] overflow-x-hidden bg-[#071018] text-white"
      style={{
        paddingTop: 'max(env(safe-area-inset-top), 10px)',
        paddingBottom: 'max(env(safe-area-inset-bottom), 16px)',
      }}
    >
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-amber-400/10 blur-3xl" />
        <div className="absolute -right-28 top-56 h-80 w-80 rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="absolute bottom-0 left-1/4 h-72 w-72 rounded-full bg-indigo-500/10 blur-3xl" />
      </div>

      <main className="relative mx-auto w-full max-w-6xl px-3 pb-8 sm:px-5 lg:px-8">
        <header className="sticky top-0 z-30 -mx-3 mb-4 border-b border-white/10 bg-[#071018]/85 px-3 py-3 backdrop-blur-2xl sm:-mx-5 sm:px-5 lg:-mx-8 lg:px-8">
          <div className="mx-auto flex max-w-6xl items-center gap-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white transition hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-amber-300"
              aria-label="Retour"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="truncate text-xl font-black tracking-tight sm:text-2xl">Sasara IA</h1>
                <span className="inline-flex items-center gap-1 rounded-full border border-amber-300/20 bg-amber-300/10 px-2.5 py-1 text-[11px] font-semibold text-amber-200">
                  <Sparkles className="h-3.5 w-3.5" />
                  Traduction assistée par IA
                </span>
              </div>
              <p className="mt-0.5 truncate text-xs text-slate-400 sm:text-sm">Le pont bilingue intelligent de FITILA</p>
            </div>

            <div className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-300 sm:flex">
              {online ? <Check className="h-4 w-4 text-emerald-400" /> : <WifiOff className="h-4 w-4 text-rose-400" />}
              {stateLabel}
            </div>
          </div>
        </header>

        <section className="mb-4 rounded-3xl border border-cyan-300/15 bg-gradient-to-r from-cyan-400/10 via-white/[0.04] to-amber-400/10 p-4 shadow-2xl shadow-black/20">
          <div className="flex gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-cyan-300/10 text-cyan-200">
              <Volume2 className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-slate-100">Voix bilingue avancée en cours d’activation</p>
              <p className="mt-1 text-sm leading-6 text-slate-400">
                Pour le moment, Sasara IA traduit, corrige, lit les textes disponibles et publie vos contenus dans les deux langues.
              </p>
            </div>
          </div>
        </section>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <section className="min-w-0 rounded-[28px] border border-white/10 bg-white/[0.055] p-4 shadow-2xl shadow-black/20 backdrop-blur-xl sm:p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Étape 1</p>
                <h2 className="mt-1 text-lg font-bold">Choisir le sens</h2>
              </div>
              <button
                type="button"
                onClick={() => switchDirection()}
                className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-slate-200 transition hover:bg-white/10"
                aria-label="Inverser les langues"
              >
                <ArrowLeftRight className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 rounded-2xl border border-white/10 bg-black/20 p-1.5">
              <button
                type="button"
                onClick={() => direction !== 'fr-ba' && switchDirection('fr-ba')}
                className={
                  'min-h-12 rounded-xl px-3 text-sm font-bold transition ' +
                  (direction === 'fr-ba'
                    ? 'bg-gradient-to-r from-amber-300 to-orange-400 text-slate-950 shadow-lg shadow-amber-500/20'
                    : 'text-slate-400 hover:bg-white/5')
                }
              >
                Français → Bariba
              </button>
              <button
                type="button"
                onClick={() => direction !== 'ba-fr' && switchDirection('ba-fr')}
                className={
                  'min-h-12 rounded-xl px-3 text-sm font-bold transition ' +
                  (direction === 'ba-fr'
                    ? 'bg-gradient-to-r from-amber-300 to-orange-400 text-slate-950 shadow-lg shadow-amber-500/20'
                    : 'text-slate-400 hover:bg-white/5')
                }
              >
                Bariba → Français
              </button>
            </div>

            <div className="mt-5">
              <div className="mb-2 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Étape 2</p>
                  <h2 className="mt-1 text-lg font-bold">{sourceLabel}</h2>
                </div>
                <span className="text-xs text-slate-500">{sourceText.length}/{MAX_TEXT_LENGTH}</span>
              </div>

              <div className="rounded-3xl border border-white/10 bg-black/20 p-2">
                <Textarea
                  value={sourceText}
                  onChange={(event) => {
                    setSourceText(event.target.value.slice(0, MAX_TEXT_LENGTH));
                    setState(event.target.value ? 'typing' : 'idle');
                    setErrorMessage('');
                  }}
                  placeholder={sourceLanguage === 'french' ? 'Écrivez votre phrase en français…' : 'Écrivez votre phrase en Bariba…'}
                  className="min-h-[180px] resize-none border-0 bg-transparent p-3 text-base leading-7 text-white shadow-none placeholder:text-slate-600 focus-visible:ring-0"
                />
                <div className="flex flex-wrap items-center gap-2 border-t border-white/10 p-2">
                  <button
                    type="button"
                    onClick={() => setShowRecorder((value) => !value)}
                    className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 text-sm font-semibold text-slate-200 hover:bg-white/10"
                  >
                    <Mic className="h-4 w-4" />
                    Dicter
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const text = await navigator.clipboard.readText();
                        if (text) {
                          setSourceText(text.slice(0, MAX_TEXT_LENGTH));
                          setState('typing');
                        }
                      } catch {
                        toast({ title: 'Collage non autorisé', description: 'Utilisez le collage du clavier.', variant: 'destructive' });
                      }
                    }}
                    className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 text-sm font-semibold text-slate-200 hover:bg-white/10"
                  >
                    <Clipboard className="h-4 w-4" />
                    Coller
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSourceText('');
                      setTranslatedText('');
                      setCorpusSaved(false);
                      setState('idle');
                    }}
                    className="ml-auto inline-flex h-11 w-11 items-center justify-center rounded-xl text-slate-500 hover:bg-white/5 hover:text-white"
                    aria-label="Effacer"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {showRecorder && (
                <div className="mt-3 rounded-3xl border border-amber-300/15 bg-amber-300/[0.05] p-4">
                  <p className="mb-3 text-sm font-semibold text-amber-100">Dictée {sourceLabel}</p>
                  <SmartVoiceRecorder
                    language={sourceLanguage}
                    showSpeakerType={sourceLanguage === 'bariba'}
                    disabled={isBusy}
                    onRecordingComplete={onVoiceReady}
                  />
                </div>
              )}

              <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                {EXAMPLES.map((example) => (
                  <button
                    key={example}
                    type="button"
                    onClick={() => {
                      setSourceText(example);
                      setState('typing');
                    }}
                    className="shrink-0 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-300 hover:bg-white/10"
                  >
                    {example}
                  </button>
                ))}
              </div>

              {errorMessage && (
                <div className="mt-3 rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm leading-6 text-rose-100">
                  {errorMessage}
                </div>
              )}

              {!online && (
                <div className="mt-3 flex items-start gap-2 rounded-2xl border border-amber-400/20 bg-amber-400/10 p-3 text-sm text-amber-100">
                  <WifiOff className="mt-0.5 h-4 w-4 shrink-0" />
                  Hors ligne : la traduction distante est suspendue. Votre texte est sauvegardé localement.
                </div>
              )}

              <Button
                onClick={translate}
                disabled={!canTranslate || !online}
                className="mt-4 min-h-14 w-full rounded-2xl bg-gradient-to-r from-amber-300 via-amber-400 to-orange-500 text-base font-black text-slate-950 shadow-xl shadow-amber-500/20 hover:opacity-95"
              >
                {state === 'translating' ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Traduction en cours…
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-5 w-5" />
                    Traduire avec Sasara IA
                  </>
                )}
              </Button>
            </div>
          </section>

          <section className="min-w-0 rounded-[28px] border border-white/10 bg-white/[0.055] p-4 shadow-2xl shadow-black/20 backdrop-blur-xl sm:p-5">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Étapes 3–6</p>
                <h2 className="mt-1 text-lg font-bold">Studio de résultat</h2>
                <p className="mt-1 text-sm text-slate-500">{sourceLabel} → {targetLabel}{translationMethod ? ' · ' + translationMethod : ''}</p>
              </div>
              <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-300">{stateLabel}</div>
            </div>

            {!hasResult ? (
              <div className="flex min-h-[420px] flex-col items-center justify-center rounded-3xl border border-dashed border-white/10 bg-black/10 px-6 text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-cyan-400/15 to-amber-400/15">
                  <BookOpen className="h-7 w-7 text-cyan-200" />
                </div>
                <p className="text-lg font-bold text-slate-200">Votre traduction apparaîtra ici</p>
                <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">
                  Traduisez une phrase, puis corrigez-la, écoutez-la, copiez-la ou publiez-la dans le fil FITILA.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="rounded-3xl border border-white/10 bg-black/20 p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">{sourceLabel}</span>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => copyText(sourceText, 'Texte source')}
                        className="flex h-11 w-11 items-center justify-center rounded-xl text-slate-400 hover:bg-white/5 hover:text-white"
                        aria-label="Copier le texte source"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => speak(sourceText, sourceLanguage)}
                        className="flex h-11 w-11 items-center justify-center rounded-xl text-slate-400 hover:bg-white/5 hover:text-white"
                        aria-label="Écouter le texte source"
                      >
                        <Volume2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <Textarea
                    value={sourceText}
                    onChange={(event) => {
                      setSourceText(event.target.value.slice(0, MAX_TEXT_LENGTH));
                      setState('editing');
                    }}
                    className="min-h-24 resize-none border-0 bg-transparent p-0 text-sm leading-6 text-slate-300 shadow-none focus-visible:ring-0"
                  />
                </div>

                <div className="rounded-3xl border border-amber-300/20 bg-gradient-to-br from-amber-300/[0.08] to-cyan-300/[0.05] p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-[0.18em] text-amber-200">{targetLabel}</span>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => copyText(translatedText, 'Traduction')}
                        className="flex h-11 w-11 items-center justify-center rounded-xl text-slate-300 hover:bg-white/10 hover:text-white"
                        aria-label="Copier la traduction"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => speak(translatedText, targetLanguage)}
                        className="flex h-11 w-11 items-center justify-center rounded-xl text-slate-300 hover:bg-white/10 hover:text-white"
                        aria-label="Écouter la traduction"
                      >
                        <Volume2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <Textarea
                    value={translatedText}
                    onChange={(event) => {
                      setTranslatedText(event.target.value.slice(0, MAX_TEXT_LENGTH));
                      setState('editing');
                    }}
                    className="min-h-36 resize-none border-0 bg-transparent p-0 text-base font-medium leading-7 text-white shadow-none focus-visible:ring-0"
                  />
                  <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                    <Pencil className="h-3.5 w-3.5" />
                    Le résultat reste entièrement modifiable avant publication.
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Améliorer avec l’IA</p>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {[
                      ['correct', 'Corriger'],
                      ['simplify', 'Simplifier'],
                      ['natural', 'Plus naturel'],
                      ['formal', 'Plus formel'],
                    ].map(([style, label]) => (
                      <button
                        key={style}
                        type="button"
                        disabled={isBusy}
                        onClick={() => refine(style as RefineStyle)}
                        className="min-h-11 rounded-xl border border-white/10 bg-white/5 px-3 text-xs font-semibold text-slate-200 transition hover:border-amber-300/30 hover:bg-amber-300/10 disabled:opacity-50"
                      >
                        {state === 'editing' ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="rounded-3xl border border-white/10 bg-black/20 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="font-semibold">Corpus communautaire</p>
                      <p className="mt-1 text-sm leading-6 text-slate-500">
                        Si vous activez cette option, votre paire de traduction pourra enrichir la mémoire de traduction communautaire.
                      </p>
                    </div>
                    <Switch
                      checked={corpusConsent}
                      onCheckedChange={(value) => {
                        setCorpusConsent(value);
                        if (!value) setCorpusSaved(false);
                      }}
                      aria-label="Autoriser la contribution au corpus"
                    />
                  </div>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-3">
                    <span className="text-xs text-slate-500">
                      {monthlyCorpusCount} contribution{monthlyCorpusCount > 1 ? 's' : ''} ce mois
                    </span>
                    {corpusConsent && (
                      <button
                        type="button"
                        onClick={contributeNow}
                        disabled={corpusSaved || state === 'contributing-corpus'}
                        className="min-h-11 rounded-xl border border-cyan-300/20 bg-cyan-300/10 px-3 text-xs font-bold text-cyan-100 disabled:opacity-50"
                      >
                        {corpusSaved ? 'Enregistré au corpus' : 'Contribuer maintenant'}
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                  <Button
                    onClick={publish}
                    disabled={state === 'publishing' || state === 'contributing-corpus'}
                    className="min-h-14 rounded-2xl bg-gradient-to-r from-cyan-300 to-emerald-300 text-base font-black text-slate-950 shadow-xl shadow-cyan-500/10"
                  >
                    {state === 'publishing' || state === 'contributing-corpus' ? (
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    ) : (
                      <Send className="mr-2 h-5 w-5" />
                    )}
                    Publier en bilingue
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => copyText(sourceText + '\n\n' + translatedText, 'Version bilingue')}
                    className="min-h-14 rounded-2xl border-white/10 bg-white/5 px-5 text-white hover:bg-white/10 hover:text-white"
                  >
                    <Copy className="mr-2 h-4 w-4" />
                    Copier
                  </Button>
                </div>

                {state === 'partial-success' && (
                  <div className="rounded-2xl border border-amber-300/20 bg-amber-300/10 p-3 text-sm text-amber-100">
                    La publication a réussi. Seule la contribution au corpus n’a pas pu être enregistrée.
                  </div>
                )}
                {state === 'success' && (
                  <div className="flex items-center gap-2 rounded-2xl border border-emerald-300/20 bg-emerald-300/10 p-3 text-sm text-emerald-100">
                    <Check className="h-4 w-4" />
                    Publication terminée.
                  </div>
                )}
              </div>
            )}
          </section>
        </div>

        <section className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <Wand2 className="h-5 w-5 text-amber-300" />
            <p className="mt-2 text-sm font-bold">IA utile, jamais bloquante</p>
            <p className="mt-1 text-xs leading-5 text-slate-500">La traduction reste éditable et les erreurs techniques sont converties en messages compréhensibles.</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <Volume2 className="h-5 w-5 text-cyan-300" />
            <p className="mt-2 text-sm font-bold">Écoute Français + Bariba</p>
            <p className="mt-1 text-xs leading-5 text-slate-500">La lecture audio n’empêche jamais de copier, corriger ou publier le contenu.</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <RefreshCw className="h-5 w-5 text-emerald-300" />
            <p className="mt-2 text-sm font-bold">Brouillon préservé</p>
            <p className="mt-1 text-xs leading-5 text-slate-500">La saisie et le résultat sont conservés localement en cas de coupure réseau ou de fermeture accidentelle.</p>
          </div>
        </section>
      </main>
    </div>
  );
}
