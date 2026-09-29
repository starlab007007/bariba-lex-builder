import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, BadgeCheck, BookOpen, Check, Eye, EyeOff, GraduationCap, Keyboard, Languages, Loader2, Lock, LockKeyhole, Mic2, Phone, ShieldCheck, Sparkles, UserRound, Users, WifiOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { SIG, SERIF } from '@/components/fitila/signatureTheme';
import VisualSecuritySetup from '@/components/tamtam/VisualSecuritySetup';
import VisualSecurityCheck from '@/components/tamtam/VisualSecurityCheck';

type Step = 'phone' | 'pin-login' | 'name' | 'pin-create' | 'pin-confirm' | 'security-setup' | 'complete' | 'pin-forgot' | 'pin-reset';
type Mode = 'login' | 'create';

const vibrateSafe = (pattern: number | number[]) => {
  try { navigator?.vibrate?.(pattern); } catch { /* non supporté */ }
};

/** Parcours de création affiché dans l'indicateur d'étapes. */
const CREATE_STEPS: { id: Step[]; label: string }[] = [
  { id: ['phone'], label: 'Numéro' },
  { id: ['name'], label: 'Profil' },
  { id: ['pin-create'], label: 'PIN' },
  { id: ['pin-confirm'], label: 'Confirmation' },
  { id: ['security-setup', 'complete'], label: 'Code secret' },
];

const isWeakPin = (p: string) => p.length === 6 && (/^(\d)\1{5}$/.test(p) || '0123456789'.includes(p) || '9876543210'.includes(p));

function PinInput({ value, onChange, showPin, onToggleShow, autoFocus = true, inputRef, label }: { value: string; onChange: (v: string) => void; showPin: boolean; onToggleShow: () => void; autoFocus?: boolean; inputRef?: React.RefObject<HTMLInputElement>; label: string }) {
  return (
    <div>
      <div className="relative">
        <div className="mb-3 flex justify-center gap-2 sm:gap-2.5" aria-hidden>
          {[0, 1, 2, 3, 4, 5].map((i) => {
            const filled = i < value.length;
            const active = i === value.length;
            return (
              <motion.div key={i} animate={{ scale: active ? 1.06 : 1 }} className="flex h-14 w-11 items-center justify-center rounded-[14px] border-2 text-2xl font-bold transition-colors sm:h-[60px] sm:w-12"
                style={{ borderColor: filled ? SIG.gold : active ? `${SIG.gold}B3` : SIG.hairline, background: filled ? '#FFF9E8' : '#fff', color: SIG.ink }}>
                {value[i] ? (showPin ? value[i] : '●') : ''}
              </motion.div>
            );
          })}
        </div>
        <input
          ref={inputRef}
          type="tel"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={6}
          value={value}
          aria-label={label}
          autoComplete="off"
          onChange={(e) => { onChange(e.target.value.replace(/\D/g, '').slice(0, 6)); vibrateSafe(8); }}
          className="absolute inset-0 h-full w-full cursor-text opacity-0"
          autoFocus={autoFocus}
        />
      </div>
      <button type="button" onClick={onToggleShow} className="mx-auto flex items-center gap-1.5 text-xs font-semibold" style={{ color: SIG.muted }}>
        {showPin ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />} {showPin ? 'Masquer' : 'Afficher'} le code
      </button>
    </div>
  );
}

function Hero({ compact }: { compact: boolean }) {
  return (
    <div className="relative overflow-hidden border" style={{ borderColor: SIG.hairline, borderRadius: compact ? 26 : 32, background: 'linear-gradient(135deg,#FFFFFF,#F7F0DF 55%,#F1EDDF)', boxShadow: '0 18px 32px -18px rgba(36,31,46,.3)', minHeight: compact ? 0 : 520 }}>
      <div aria-hidden className="absolute rounded-full" style={{ right: compact ? -26 : -38, top: compact ? -32 : -44, width: compact ? 118 : 178, height: compact ? 118 : 178, background: 'rgba(201,149,48,.2)' }} />
      <div aria-hidden className="absolute rounded-full" style={{ left: compact ? -36 : -62, bottom: compact ? -45 : -70, width: compact ? 120 : 210, height: compact ? 120 : 210, background: 'rgba(63,110,82,.15)' }} />
      <div className={`relative flex h-full flex-col justify-center ${compact ? 'p-[18px]' : 'p-7'}`} style={{ minHeight: compact ? 0 : 520 }}>
        <div className="flex items-center gap-3">
          <span className="grid place-items-center rounded-full" style={{ width: compact ? 44 : 58, height: compact ? 44 : 58, background: `linear-gradient(135deg,${SIG.gold},#A6721F)` }}>
            <Sparkles className="h-5 w-5" style={{ color: '#2B2110' }} />
          </span>
          <div>
            <div className="text-[25px] font-semibold leading-none tracking-wide" style={{ fontFamily: SERIF, color: SIG.goldDeep }}>FITILA</div>
            <div className="mt-1 text-[11.5px] font-semibold" style={{ color: SIG.muted }}>Bàátɔ̀nú · Culture · IA</div>
          </div>
        </div>
        <h2 className="mt-4 font-semibold leading-[1.06] tracking-tight md:mt-8" style={{ fontFamily: SERIF, color: SIG.ink, fontSize: compact ? 25 : 42 }}>
          La langue vivante,<br />augmentée par l’IA.
        </h2>
        <p className="mt-2 max-w-[460px] leading-relaxed" style={{ color: SIG.inkSoft, fontSize: compact ? 12.5 : 15 }}>
          {compact ? 'Traduire, apprendre et transmettre le Bàátɔ̀nú, simplement.' : 'Traduire, apprendre, partager et préserver le Bàátɔ̀nú dans une expérience élégante et accessible sur tous vos écrans.'}
        </p>
        <div className={`flex flex-wrap gap-2 ${compact ? 'mt-3' : 'mt-7'}`}>
          {([[Languages, 'Traduction', SIG.goldTint, SIG.goldDeep], [Sparkles, 'IA culturelle', SIG.clayTint, SIG.clay], [GraduationCap, 'Apprentissage', SIG.sageTint, SIG.sage]] as const).map(([Icon, label, bg, ink]) => (
            <span key={label} className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11.5px] font-extrabold" style={{ background: bg, color: ink }}><Icon className="h-3.5 w-3.5" /> {label}</span>
          ))}
        </div>
        {!compact && (
          <div className="mt-9 grid grid-cols-3 gap-2.5">
            {([[BookOpen, 'Dictionnaire', 'Bàátɔ̀nú ↔ Français'], [Mic2, 'Voix', 'Écouter & prononcer'], [Users, 'Communauté', 'Partager & transmettre']] as const).map(([Icon, title, sub]) => (
              <div key={title} className="rounded-[16px] border p-3.5" style={{ background: 'rgba(255,255,255,.78)', borderColor: SIG.hairline }}>
                <Icon className="h-5 w-5" style={{ color: SIG.goldDeep }} />
                <div className="mt-2.5 text-[12.5px] font-extrabold">{title}</div>
                <div className="text-[10.5px]" style={{ color: SIG.muted }}>{sub}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Stepper({ step }: { step: Step }) {
  const current = CREATE_STEPS.findIndex((s) => s.id.includes(step));
  return (
    <ol className="mb-5 flex items-center gap-1.5" aria-label="Progression de la création du compte">
      {CREATE_STEPS.map((s, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={s.label} className="flex flex-1 flex-col gap-1.5" aria-current={active ? 'step' : undefined}>
            <span className="h-1.5 overflow-hidden rounded-full" style={{ background: SIG.hairline }}>
              <motion.span className="block h-full rounded-full" initial={false} animate={{ width: done || active ? '100%' : '0%' }} transition={{ duration: 0.45, ease: 'easeOut' }} style={{ background: done ? SIG.sage : SIG.gold }} />
            </span>
            <span className="hidden text-center text-[10.5px] font-bold sm:block" style={{ color: active ? SIG.goldDeep : done ? SIG.sage : SIG.muted }}>{s.label}</span>
          </li>
        );
      })}
    </ol>
  );
}

const slide = { initial: { opacity: 0, x: 36 }, animate: { opacity: 1, x: 0 }, exit: { opacity: 0, x: -36 }, transition: { duration: 0.28, ease: [0.2, 0.8, 0.2, 1] as const } };

function PrimaryButton({ children, onClick, disabled, loading, icon }: { children: React.ReactNode; onClick: () => void; disabled?: boolean; loading?: boolean; icon?: React.ReactNode }) {
  return (
    <motion.button whileTap={{ scale: 0.97 }} type="button" onClick={onClick} disabled={disabled || loading}
      className="flex h-[52px] w-full items-center justify-center gap-2 rounded-full text-[15px] font-extrabold shadow-[0_10px_20px_-12px_rgba(156,107,29,.7)] transition-opacity disabled:opacity-50" style={{ background: SIG.gold, color: '#2B2110' }}>
      {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
      {children}
      {!loading && (icon ?? <ArrowRight className="h-5 w-5" />)}
    </motion.button>
  );
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-label="Retour" className="mb-3 grid h-9 w-9 place-items-center rounded-full border bg-white transition-transform active:scale-90" style={{ borderColor: SIG.hairline }}>
      <ArrowLeft className="h-4 w-4" />
    </button>
  );
}

export default function TamTamPhoneAuth() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get('redirect') || '/social';

  const [mode, setMode] = useState<Mode>(searchParams.get('mode') === 'create' ? 'create' : 'login');
  const [step, setStep] = useState<Step>('phone');
  const [phoneDigits, setPhoneDigits] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [pin, setPin] = useState('');
  const [pinConfirm, setPinConfirm] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isExistingUser, setIsExistingUser] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [newPin, setNewPin] = useState('');
  const [newPinConfirm, setNewPinConfirm] = useState('');
  const [securityAnswers, setSecurityAnswers] = useState<string[]>([]);
  const [wide, setWide] = useState(() => typeof window !== 'undefined' && window.innerWidth >= 768);
  const pinInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onResize = () => setWide(window.innerWidth >= 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    // Redirection automatique uniquement sur la première étape : on laisse le parcours de création se terminer.
    if (user && step === 'phone') navigate(redirectTo, { replace: true });
  }, [user, step, redirectTo, navigate]);

  const fullPhone = `+229${phoneDigits}`;
  const emailFromPhone = `${phoneDigits}@fitila.app`;
  const prettyPhone = useMemo(() => phoneDigits.replace(/(\d{2})(?=\d)/g, '$1 ').trim(), [phoneDigits]);
  const firstName = displayName.trim().split(/\s+/)[0] || '';
  const isCreating = ['name', 'pin-create', 'pin-confirm', 'security-setup', 'complete'].includes(step) || (step === 'phone' && mode === 'create');
  const showStepper = isCreating && step !== 'complete';

  const goStep = (s: Step) => { setNotice(null); setStep(s); };

  const handlePhoneSubmit = async () => {
    if (phoneDigits.length < 8) {
      toast({ title: 'Numéro trop court', description: 'Entrez au moins 8 chiffres', variant: 'destructive' });
      return;
    }
    setIsLoading(true);
    try {
      const { data: existingProfile, error: lookupError } = await supabase
        .from('tamtam_profiles')
        .select('user_id, display_name')
        .eq('phone_number', fullPhone)
        .maybeSingle();
      if (lookupError) {
        toast({ title: 'Erreur réseau', description: 'Vérifiez votre connexion et réessayez', variant: 'destructive' });
        return;
      }
      vibrateSafe([40, 30, 40]);
      if (existingProfile) {
        setIsExistingUser(true);
        setDisplayName(existingProfile.display_name || '');
        setMode('login');
        setNotice(mode === 'create' ? 'Ce numéro a déjà un compte FITILA : connectez-vous avec votre PIN.' : null);
        setStep('pin-login');
      } else if (mode === 'create') {
        setIsExistingUser(false);
        goStep('name');
      } else {
        setIsExistingUser(false);
        setNotice('Aucun compte FITILA pour ce numéro. Créez-le en moins d’une minute.');
        setMode('create');
      }
    } catch (err) {
      console.error(err);
      toast({ title: 'Erreur réseau', description: 'Vérifiez votre connexion et réessayez', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePinLogin = async () => {
    if (pin.length !== 6) return;
    setIsLoading(true);
    try {
      const { data: signInData, error } = await supabase.auth.signInWithPassword({ email: emailFromPhone, password: pin });
      if (error) {
        toast({ title: 'PIN incorrect', description: 'Vérifiez votre code PIN', variant: 'destructive' });
        vibrateSafe([100, 50, 100]);
        setPin('');
        setTimeout(() => pinInputRef.current?.focus(), 50);
        return;
      }
      vibrateSafe([50, 30, 50]);
      toast({ title: 'Connexion réussie', description: `Bienvenue ${displayName} !` });
      const uid = signInData.user?.id;
      if (uid) {
        const { data: secData } = await supabase.from('security_answers').select('id').eq('user_id', uid).maybeSingle();
        if (!secData) {
          setStep('security-setup');
          return;
        }
      }
      navigate(redirectTo, { replace: true });
    } catch (err) {
      toast({ title: 'Erreur', description: (err as Error).message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePinConfirm = async () => {
    if (pinConfirm !== pin) {
      toast({ title: 'PIN différent', description: 'Les codes PIN ne correspondent pas', variant: 'destructive' });
      vibrateSafe([100, 50, 100]);
      setPinConfirm('');
      return;
    }
    setIsLoading(true);
    try {
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: emailFromPhone,
        password: pin,
        options: {
          emailRedirectTo: `${window.location.origin}/social`,
          data: { display_name: displayName.trim(), phone_number: fullPhone },
        },
      });
      if (signUpError) {
        if (signUpError.message.includes('already registered')) {
          const { error: signInError } = await supabase.auth.signInWithPassword({ email: emailFromPhone, password: pin });
          if (signInError) throw signInError;
          navigate('/social');
          return;
        }
        throw signUpError;
      }
      await new Promise((r) => setTimeout(r, 500));
      if (authData.user) {
        await supabase.from('tamtam_profiles').update({ display_name: displayName.trim(), phone_number: fullPhone }).eq('user_id', authData.user.id);
      }
      vibrateSafe([50, 30, 50]);
      setStep('security-setup');
    } catch (err) {
      console.error(err);
      toast({ title: 'Erreur', description: (err as Error).message || 'Impossible de créer le compte', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSecuritySetupComplete = async (answers: string[]) => {
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Session non trouvée');
      const res = await supabase.functions.invoke('set-security', { body: { answers } });
      if (res.error) {
        toast({ title: 'Erreur', description: 'Impossible de sauvegarder le code secret', variant: 'destructive' });
        return;
      }
      vibrateSafe([50, 30, 50]);
      setStep('complete');
      setTimeout(() => navigate('/social'), 2600);
    } catch (err) {
      console.error(err);
      toast({ title: 'Erreur', description: (err as Error).message || 'Erreur serveur', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePinReset = async () => {
    if (newPin.length !== 6 || newPinConfirm.length !== 6) return;
    if (newPin !== newPinConfirm) {
      toast({ title: 'PIN différent', description: 'Les codes ne correspondent pas', variant: 'destructive' });
      vibrateSafe([100, 50, 100]);
      setNewPinConfirm('');
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/reset-pin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
        body: JSON.stringify({ phone_number: fullPhone, security_answers: securityAnswers, new_pin: newPin }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: 'Erreur', description: data.error || 'Vérification échouée', variant: 'destructive' });
        vibrateSafe([100, 50, 100]);
        if (data.locked) setStep('pin-login');
        return;
      }
      const { error: loginError } = await supabase.auth.signInWithPassword({ email: emailFromPhone, password: newPin });
      if (loginError) {
        toast({ title: 'PIN réinitialisé', description: 'Connectez-vous avec votre nouveau PIN' });
        setPin('');
        setStep('pin-login');
      } else {
        vibrateSafe([50, 30, 50]);
        toast({ title: 'PIN réinitialisé !', description: 'Vous êtes connecté' });
        navigate('/social');
      }
    } catch (err) {
      toast({ title: 'Erreur', description: (err as Error).message || 'Erreur serveur', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleShowPin = () => setShowPin((s) => !s);
  const darkStep = step === 'security-setup' || step === 'pin-forgot';
  const inputStyle: React.CSSProperties = { borderColor: SIG.hairline, background: '#fff' };

  return (
    <div className="h-full overflow-y-auto" style={{ background: 'linear-gradient(135deg,#F9F7F0,#F3F0E5 50%,#F7F5EC)', color: SIG.ink }}>
      <div className={`mx-auto flex min-h-full w-full max-w-[1080px] items-center gap-6 px-4 pb-8 pt-[72px] md:px-6 md:py-8 ${wide ? 'flex-row' : 'flex-col justify-start'}`}>
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: 'easeOut' }} className={wide ? 'flex-[11]' : 'w-full'}>
          <Hero compact={!wide} />
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.65, delay: 0.12, ease: 'easeOut' }} className={wide ? 'flex-[10]' : 'w-full'}>
          <div className="overflow-hidden rounded-[28px] border" style={{ borderColor: SIG.hairline, background: darkStep ? 'linear-gradient(160deg,#241F2E,#3A3448)' : '#fff', boxShadow: '0 22px 40px -26px rgba(36,31,46,.45)' }}>
            <div className="px-5 pb-5 pt-6 sm:px-7">
              {/* En-tête de la carte */}
              {!darkStep && step !== 'complete' && (
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <h1 className="text-[28px] font-bold leading-tight tracking-tight" style={{ fontFamily: SERIF }}>
                      {step === 'pin-login' ? `Bon retour${firstName ? `, ${firstName}` : ''}` : isCreating ? 'Créer mon compte' : step === 'pin-reset' ? 'Nouveau PIN' : 'Bienvenue'}
                    </h1>
                    <p className="mt-1 text-[13.5px] leading-snug" style={{ color: SIG.muted }}>
                      {step === 'pin-login' ? 'Entrez votre code PIN à 6 chiffres.' : isCreating ? 'Rejoignez FITILA en quelques étapes sécurisées.' : step === 'pin-reset' ? 'Choisissez 6 nouveaux chiffres.' : 'Connectez-vous pour retrouver votre univers FITILA.'}
                    </p>
                  </div>
                  <span className="grid h-[42px] w-[42px] shrink-0 place-items-center rounded-full" style={{ background: SIG.goldTint }}>
                    {isCreating ? <UserRound className="h-5 w-5" style={{ color: SIG.goldDeep }} /> : <LockKeyhole className="h-5 w-5" style={{ color: SIG.goldDeep }} />}
                  </span>
                </div>
              )}

              {step === 'phone' && (
                <div role="tablist" aria-label="Connexion ou création" className="mb-4 grid grid-cols-2 rounded-full p-1" style={{ background: SIG.surfaceAlt }}>
                  {([['login', 'Se connecter'], ['create', 'Créer un compte']] as const).map(([m, label]) => (
                    <button key={m} role="tab" aria-selected={mode === m} type="button" onClick={() => { setMode(m); setNotice(null); }} className="relative h-10 rounded-full text-[13.5px] font-extrabold transition-colors" style={{ color: mode === m ? SIG.ink : SIG.muted }}>
                      {mode === m && <motion.span layoutId="auth-tab" className="absolute inset-0 rounded-full bg-white shadow-sm" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
                      <span className="relative">{label}</span>
                    </button>
                  ))}
                </div>
              )}

              {showStepper && <Stepper step={step} />}

              {notice && (
                <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} role="status" className="mb-4 flex items-start gap-2 rounded-[14px] px-3 py-2.5 text-[12.5px] font-semibold" style={{ background: SIG.goldTint, color: SIG.goldDeep }}>
                  <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0" /> {notice}
                </motion.div>
              )}

              <AnimatePresence mode="wait">
                {step === 'phone' && (
                  <motion.form key="phone" {...slide} onSubmit={(e) => { e.preventDefault(); handlePhoneSubmit(); }}>
                    <div className="mb-3 flex items-center gap-2 rounded-[12px] px-3 py-2 text-[11.5px] font-bold" style={{ background: SIG.sageTint, color: SIG.sage }}>
                      <ShieldCheck className="h-4 w-4" /> Serveur FITILA prêt · connexion sécurisée
                    </div>
                    <label className="mb-1.5 flex items-center gap-2 text-[13px] font-bold" style={{ color: SIG.inkSoft }} htmlFor="auth-phone">
                      <Phone className="h-4 w-4" style={{ color: SIG.goldDeep }} /> +229 · Compte FITILA
                    </label>
                    <div className="flex h-[54px] items-center overflow-hidden rounded-[16px] border-2 transition-colors focus-within:border-[#C99530]" style={inputStyle}>
                      <span className="flex h-full items-center gap-1.5 border-r px-3.5 text-[15px] font-bold" style={{ borderColor: SIG.hairline, background: SIG.appBackground }}>🇧🇯 +229</span>
                      <input
                        id="auth-phone"
                        type="tel"
                        inputMode="numeric"
                        autoComplete="tel-national"
                        autoFocus
                        placeholder="97 00 00 00"
                        value={prettyPhone}
                        onChange={(e) => setPhoneDigits(e.target.value.replace(/\D/g, '').slice(0, 10))}
                        className="h-full min-w-0 flex-1 bg-transparent px-3.5 text-[20px] font-semibold tracking-wider outline-none placeholder:font-normal placeholder:opacity-40"
                      />
                    </div>
                    <p className="mb-4 mt-1.5 text-[11.5px]" style={{ color: SIG.muted }}>Votre numéro sert d’identifiant. Il n’est jamais affiché aux autres membres.</p>
                    <PrimaryButton onClick={handlePhoneSubmit} disabled={phoneDigits.length < 8} loading={isLoading}>
                      {isLoading ? 'Vérification…' : mode === 'create' ? 'Créer mon compte' : 'Continuer'}
                    </PrimaryButton>
                    <button type="submit" hidden />
                    <div className="mt-4 flex flex-wrap justify-center gap-2">
                      {([[ShieldCheck, 'Sécurisé'], [WifiOff, 'Offline-ready'], [Keyboard, 'Clavier Bàátɔ̀nú']] as const).map(([Icon, label]) => (
                        <span key={label} className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold" style={{ background: SIG.surfaceAlt, color: SIG.inkSoft }}><Icon className="h-3.5 w-3.5" style={{ color: SIG.goldDeep }} /> {label}</span>
                      ))}
                    </div>
                  </motion.form>
                )}

                {step === 'pin-login' && (
                  <motion.div key="pin-login" {...slide}>
                    <BackButton onClick={() => { goStep('phone'); setPin(''); }} />
                    <div className="mb-4 flex items-center gap-3 rounded-[16px] border p-3" style={{ borderColor: SIG.hairline, background: SIG.appBackground }}>
                      <span className="grid h-10 w-10 place-items-center rounded-full text-[16px] font-extrabold" style={{ background: SIG.goldTint, color: SIG.goldDeep }}>{(displayName || 'F').charAt(0).toUpperCase()}</span>
                      <div className="min-w-0"><div className="truncate text-[14px] font-extrabold">{displayName || 'Compte FITILA'}</div><div className="text-[12px]" style={{ color: SIG.muted }}>+229 {prettyPhone}</div></div>
                    </div>
                    <PinInput label="Code PIN" value={pin} onChange={setPin} showPin={showPin} onToggleShow={toggleShowPin} inputRef={pinInputRef} />
                    <div className="mt-5"><PrimaryButton onClick={handlePinLogin} disabled={pin.length !== 6} loading={isLoading} icon={<Lock className="h-4 w-4" />}>{isLoading ? 'Connexion…' : 'Se connecter'}</PrimaryButton></div>
                    <button type="button" className="mx-auto mt-3 block text-[13px] font-semibold underline" style={{ color: SIG.muted }} onClick={() => { setNewPin(''); setNewPinConfirm(''); setSecurityAnswers([]); goStep('pin-forgot'); }}>PIN oublié ?</button>
                  </motion.div>
                )}

                {step === 'name' && (
                  <motion.div key="name" {...slide}>
                    <BackButton onClick={() => goStep('phone')} />
                    <div className="mb-4 flex items-center gap-3">
                      <motion.span key={firstName.charAt(0)} initial={{ scale: 0.7 }} animate={{ scale: 1 }} className="grid h-16 w-16 shrink-0 place-items-center rounded-full text-[26px] font-extrabold" style={{ background: `linear-gradient(135deg,${SIG.gold},#A6721F)`, color: '#2B2110' }}>
                        {(displayName.trim().charAt(0) || '?').toUpperCase()}
                      </motion.span>
                      <div><h2 className="text-[17px] font-extrabold">Comment vous appelez-vous ?</h2><p className="text-[12.5px]" style={{ color: SIG.muted }}>Ce nom sera visible par les autres membres.</p></div>
                    </div>
                    <form onSubmit={(e) => { e.preventDefault(); if (displayName.trim()) goStep('pin-create'); }}>
                      <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Votre nom ou pseudo" autoFocus maxLength={30} autoComplete="nickname" aria-label="Nom ou pseudo"
                        className="h-[54px] w-full rounded-[16px] border-2 px-4 text-[18px] font-semibold outline-none transition-colors focus:border-[#C99530]" style={inputStyle} />
                      <p className="mb-5 mt-1.5 text-right text-[11px]" style={{ color: SIG.muted }}>{displayName.length}/30</p>
                      <PrimaryButton onClick={() => { vibrateSafe(20); goStep('pin-create'); }} disabled={!displayName.trim()}>Continuer</PrimaryButton>
                    </form>
                  </motion.div>
                )}

                {step === 'pin-create' && (
                  <motion.div key="pin-create" {...slide}>
                    <BackButton onClick={() => { goStep('name'); setPin(''); }} />
                    <h2 className="mb-1 text-[17px] font-extrabold">Créez votre code PIN</h2>
                    <p className="mb-5 text-[12.5px]" style={{ color: SIG.muted }}>6 chiffres, faciles à retenir pour vous, difficiles à deviner pour les autres.</p>
                    <PinInput label="Nouveau code PIN" value={pin} onChange={setPin} showPin={showPin} onToggleShow={toggleShowPin} inputRef={pinInputRef} />
                    {isWeakPin(pin) && <p role="alert" className="mt-3 rounded-[12px] px-3 py-2 text-[12px] font-semibold" style={{ background: SIG.clayTint, color: SIG.clay }}>Ce code est très simple à deviner (chiffres identiques ou suite). Vous pouvez le garder, mais un code moins évident protège mieux votre compte.</p>}
                    <div className="mt-5"><PrimaryButton onClick={() => { vibrateSafe(20); goStep('pin-confirm'); }} disabled={pin.length !== 6}>Continuer</PrimaryButton></div>
                  </motion.div>
                )}

                {step === 'pin-confirm' && (
                  <motion.div key="pin-confirm" {...slide}>
                    <BackButton onClick={() => { goStep('pin-create'); setPinConfirm(''); }} />
                    <h2 className="mb-1 text-[17px] font-extrabold">Confirmez votre PIN</h2>
                    <p className="mb-5 text-[12.5px]" style={{ color: SIG.muted }}>Saisissez à nouveau vos 6 chiffres.</p>
                    <PinInput label="Confirmation du code PIN" value={pinConfirm} onChange={setPinConfirm} showPin={showPin} onToggleShow={toggleShowPin} />
                    {pinConfirm.length === 6 && pinConfirm !== pin && <p role="alert" className="mt-3 text-center text-[12.5px] font-bold" style={{ color: SIG.clay }}>Les deux codes ne correspondent pas.</p>}
                    <div className="mt-5"><PrimaryButton onClick={handlePinConfirm} disabled={pinConfirm.length !== 6} loading={isLoading} icon={<Check className="h-5 w-5" />}>{isLoading ? 'Création…' : 'Créer mon compte'}</PrimaryButton></div>
                  </motion.div>
                )}

                {step === 'security-setup' && (
                  <motion.div key="security-setup" {...slide} className="pt-1">
                    <VisualSecuritySetup
                      onComplete={handleSecuritySetupComplete}
                      onBack={() => {
                        if (isExistingUser) navigate('/social');
                        else {
                          setStep('complete');
                          toast({ title: 'Rappel', description: 'Vous pourrez configurer votre code secret plus tard depuis votre profil' });
                          setTimeout(() => navigate('/social'), 2600);
                        }
                      }}
                      isLoading={isLoading}
                    />
                  </motion.div>
                )}

                {step === 'pin-forgot' && (
                  <motion.div key="pin-forgot" {...slide} className="pt-1">
                    <VisualSecurityCheck onComplete={(answers) => { setSecurityAnswers(answers); vibrateSafe([50, 30, 50]); setStep('pin-reset'); }} onBack={() => goStep('pin-login')} />
                  </motion.div>
                )}

                {step === 'pin-reset' && (
                  <motion.div key="pin-reset" {...slide}>
                    <BackButton onClick={() => { goStep('pin-forgot'); setNewPin(''); setNewPinConfirm(''); }} />
                    <p className="mb-5 text-[12.5px] font-semibold" style={{ color: SIG.muted }}>{newPin.length < 6 ? 'Étape 1/2 · choisissez 6 nouveaux chiffres' : 'Étape 2/2 · saisissez-les à nouveau'}</p>
                    {newPin.length < 6 ? (
                      <PinInput label="Nouveau PIN" value={newPin} onChange={setNewPin} showPin={showPin} onToggleShow={toggleShowPin} />
                    ) : (
                      <PinInput label="Confirmation du nouveau PIN" value={newPinConfirm} onChange={setNewPinConfirm} showPin={showPin} onToggleShow={toggleShowPin} />
                    )}
                    <div className="mt-5"><PrimaryButton onClick={handlePinReset} disabled={newPin.length !== 6 || newPinConfirm.length !== 6} loading={isLoading} icon={<Check className="h-5 w-5" />}>{isLoading ? 'Vérification…' : 'Réinitialiser le PIN'}</PrimaryButton></div>
                    <button type="button" className="mx-auto mt-3 block text-xs font-semibold" style={{ color: SIG.muted }} onClick={() => toast({ title: 'Aide', description: 'Si le code secret ne correspond pas, contactez un administrateur FITILA' })}>Besoin d’aide ?</button>
                  </motion.div>
                )}

                {step === 'complete' && (
                  <motion.div key="complete" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="py-8 text-center">
                    <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 16 }} className="mx-auto grid h-20 w-20 place-items-center rounded-full" style={{ background: SIG.sageTint }}>
                      <Check className="h-10 w-10" style={{ color: SIG.sage }} strokeWidth={3} />
                    </motion.span>
                    <h1 className="mt-5 text-[26px] font-bold" style={{ fontFamily: SERIF }}>Bienvenue{firstName ? `, ${firstName}` : ''} !</h1>
                    <p className="mx-auto mt-1.5 max-w-[300px] text-[13.5px]" style={{ color: SIG.muted }}>Votre compte est prêt. Nous vous emmenons dans FITILA…</p>
                    <div className="mx-auto mt-6 h-1.5 w-40 overflow-hidden rounded-full" style={{ background: SIG.hairline }}>
                      <motion.div initial={{ width: 0 }} animate={{ width: '100%' }} transition={{ duration: 2.4, ease: 'linear' }} className="h-full rounded-full" style={{ background: SIG.gold }} />
                    </div>
                    <button type="button" onClick={() => navigate('/social')} className="mt-5 text-[13px] font-extrabold underline" style={{ color: SIG.goldDeep }}>Y aller maintenant</button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
