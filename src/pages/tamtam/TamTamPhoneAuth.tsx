import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, ArrowRight, ArrowLeft, Lock, Check, Eye, EyeOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import VisualSecuritySetup from '@/components/tamtam/VisualSecuritySetup';
import VisualSecurityCheck from '@/components/tamtam/VisualSecurityCheck';

type Step = 'phone' | 'pin-login' | 'pin-create' | 'pin-confirm' | 'name' | 'security-setup' | 'complete' | 'pin-forgot' | 'pin-reset';

export default function TamTamPhoneAuth() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [step, setStep] = useState<Step>('phone');
  const [phoneDigits, setPhoneDigits] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [pin, setPin] = useState('');
  const [pinConfirm, setPinConfirm] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isExistingUser, setIsExistingUser] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [newPinConfirm, setNewPinConfirm] = useState('');
  const [securityAnswers, setSecurityAnswers] = useState<string[]>([]);
  const pinInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) navigate('/fitila/social');
  }, [user, navigate]);

  const formatPhone = (digits: string) => {
    const d = digits.replace(/\D/g, '');
    const parts = [];
    if (d.length > 0) parts.push(d.slice(0, 2));
    if (d.length > 2) parts.push(d.slice(2, 4));
    if (d.length > 4) parts.push(d.slice(4, 6));
    if (d.length > 6) parts.push(d.slice(6, 8));
    if (d.length > 8) parts.push(d.slice(8, 10));
    return parts.join(' ');
  };

  const fullPhone = `+229${phoneDigits}`;
  const emailFromPhone = `${phoneDigits}@fitila.app`;

  const vibrate = (pattern: number | number[]) => {
    try { navigator?.vibrate?.(pattern); } catch {}
  };

  const handlePhoneDigit = (d: string) => {
    vibrate(10);
    if (phoneDigits.length < 10) setPhoneDigits(prev => prev + d);
  };

  const handlePhoneBackspace = () => {
    vibrate(10);
    setPhoneDigits(prev => prev.slice(0, -1));
  };

  const handlePhoneSubmit = async () => {
    if (phoneDigits.length < 8) {
      toast({ title: "Numéro trop court", description: "Entrez au moins 8 chiffres", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      const { data: existingProfile } = await supabase
        .from('tamtam_profiles')
        .select('user_id, display_name')
        .eq('phone_number', fullPhone)
        .maybeSingle();

      if (existingProfile) {
        setIsExistingUser(true);
        setDisplayName(existingProfile.display_name || '');
        setStep('pin-login');
      } else {
        setIsExistingUser(false);
        setStep('name');
      }
      vibrate([50, 30, 50]);
    } catch (err) {
      console.error(err);
      setStep('name');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePinLogin = async () => {
    if (pin.length !== 6) {
      toast({ title: "PIN incomplet", description: "Entrez 6 chiffres", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: emailFromPhone,
        password: pin,
      });
      if (error) {
        toast({ title: "PIN incorrect", description: "Vérifiez votre code PIN", variant: "destructive" });
        vibrate([100, 50, 100]);
        setPin('');
        return;
      }
      vibrate([50, 30, 50]);
      toast({ title: "Connexion réussie", description: `Bienvenue ${displayName} !` });
      navigate('/fitila/social');
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleNameSubmit = () => {
    if (!displayName.trim()) {
      toast({ title: "Nom requis", description: "Entrez votre nom ou pseudo", variant: "destructive" });
      return;
    }
    vibrate([50, 30, 50]);
    setStep('pin-create');
  };

  const handlePinCreate = () => {
    if (pin.length !== 6) {
      toast({ title: "PIN incomplet", description: "Entrez exactement 6 chiffres", variant: "destructive" });
      return;
    }
    vibrate([50, 30, 50]);
    setStep('pin-confirm');
  };

  const handlePinConfirm = async () => {
    if (pinConfirm !== pin) {
      toast({ title: "PIN différent", description: "Les codes PIN ne correspondent pas", variant: "destructive" });
      vibrate([100, 50, 100]);
      setPinConfirm('');
      return;
    }
    setIsLoading(true);
    try {
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: emailFromPhone,
        password: pin,
        options: {
          emailRedirectTo: `${window.location.origin}/fitila/social`,
          data: {
            display_name: displayName,
            phone_number: fullPhone,
          },
        },
      });

      if (signUpError) {
        if (signUpError.message.includes('already registered')) {
          const { error: signInError } = await supabase.auth.signInWithPassword({
            email: emailFromPhone,
            password: pin,
          });
          if (signInError) throw signInError;
          navigate('/fitila/social');
          return;
        }
        throw signUpError;
      }

      await new Promise(r => setTimeout(r, 500));

      if (authData.user) {
        await supabase
          .from('tamtam_profiles')
          .update({ display_name: displayName, phone_number: fullPhone })
          .eq('user_id', authData.user.id);
      }

      vibrate([50, 30, 50]);
      // Go to visual security setup instead of complete
      setStep('security-setup');
    } catch (err: any) {
      console.error(err);
      toast({ title: "Erreur", description: err.message || "Impossible de créer le compte", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSecuritySetupComplete = async (answers: string[]) => {
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Session non trouvée");

      const res = await supabase.functions.invoke('set-security', {
        body: { answers },
      });

      if (res.error) {
        toast({ title: "Erreur", description: "Impossible de sauvegarder le code secret", variant: "destructive" });
        return;
      }

      vibrate([50, 30, 50]);
      setStep('complete');
      toast({ title: "Compte créé !", description: `Bienvenue ${displayName} !` });
      setTimeout(() => navigate('/fitila/social'), 2000);
    } catch (err: any) {
      console.error(err);
      toast({ title: "Erreur", description: err.message || "Erreur serveur", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSecurityCheckComplete = async (answers: string[]) => {
    setSecurityAnswers(answers);
    vibrate([50, 30, 50]);
    setStep('pin-reset');
  };

  const handlePinReset = async () => {
    if (newPin.length !== 6 || newPinConfirm.length !== 6) return;
    if (newPin !== newPinConfirm) {
      toast({ title: "PIN différent", description: "Les codes ne correspondent pas", variant: "destructive" });
      vibrate([100, 50, 100]);
      setNewPinConfirm('');
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/reset-pin`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
          body: JSON.stringify({
            phone_number: fullPhone,
            security_answers: securityAnswers,
            new_pin: newPin,
          }),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "Erreur", description: data.error || "Vérification échouée", variant: "destructive" });
        vibrate([100, 50, 100]);
        if (data.locked) {
          setStep('pin-login');
        }
        return;
      }
      // Auto login
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email: emailFromPhone,
        password: newPin,
      });
      if (loginError) {
        toast({ title: "PIN réinitialisé", description: "Connectez-vous avec votre nouveau PIN" });
        setPin('');
        setStep('pin-login');
      } else {
        vibrate([50, 30, 50]);
        toast({ title: "✅ PIN réinitialisé !", description: "Vous êtes connecté" });
        navigate('/fitila/social');
      }
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message || "Erreur serveur", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const PinInput = ({ value, onChange, autoFocus = true }: { value: string; onChange: (v: string) => void; autoFocus?: boolean }) => (
    <div className="relative">
      <div className="flex justify-center gap-2 sm:gap-3 mb-4">
        {[0, 1, 2, 3, 4, 5].map(i => (
          <div key={i} className={`w-11 h-14 sm:w-12 sm:h-16 rounded-xl border-2 flex items-center justify-center text-2xl font-bold transition-all ${
            i < value.length ? 'border-white bg-white/20 text-white' : i === value.length ? 'border-white/80 bg-white/10' : 'border-white/30 bg-white/5'
          }`}>
            {value[i] ? (showPin ? value[i] : '●') : ''}
          </div>
        ))}
      </div>
      <input
        ref={autoFocus ? pinInputRef : undefined}
        type="tel"
        inputMode="numeric"
        pattern="[0-9]*"
        maxLength={6}
        value={value}
        onChange={e => {
          const v = e.target.value.replace(/\D/g, '').slice(0, 6);
          onChange(v);
          vibrate(10);
        }}
        className="absolute inset-0 opacity-0 w-full h-full"
        autoFocus={autoFocus}
      />
      <button onClick={() => setShowPin(!showPin)} className="mx-auto flex items-center gap-1 text-white/60 text-xs mt-1">
        {showPin ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
        {showPin ? 'Masquer' : 'Afficher'}
      </button>
    </div>
  );

  const NumPad = () => (
    <div className="grid grid-cols-3 gap-2 w-full max-w-[260px] mx-auto">
      {[1, 2, 3, 4, 5, 6, 7, 8, 9, null, 0, 'del'].map((num, idx) => (
        num === null ? <div key={idx} /> :
        <motion.button
          key={idx}
          whileTap={{ scale: 0.9 }}
          className="w-16 h-14 sm:w-18 sm:h-16 rounded-2xl bg-white/10 backdrop-blur-lg text-white text-xl font-bold border border-white/20 flex items-center justify-center active:bg-white/20"
          onClick={() => num === 'del' ? handlePhoneBackspace() : handlePhoneDigit(num.toString())}
        >
          {num === 'del' ? '←' : num}
        </motion.button>
      ))}
    </div>
  );

  return (
    <div className="h-[100dvh] bg-gradient-to-br from-orange-500 via-orange-600 to-amber-700 flex flex-col items-center justify-between py-4 sm:py-6 px-4 sm:px-6">
      {/* Logo */}
      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="flex-shrink-0">
        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-white/20 backdrop-blur-lg flex items-center justify-center shadow-2xl">
          <span className="text-3xl sm:text-4xl">🥁</span>
        </div>
      </motion.div>

      <AnimatePresence mode="wait">
        {/* PHONE STEP */}
        {step === 'phone' && (
          <motion.div key="phone" initial={{ opacity: 0, x: 100 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -100 }} className="w-full max-w-md text-center flex-1 flex flex-col justify-center">
            <div className="flex items-center justify-center gap-2 mb-3">
              <Phone className="w-6 h-6 text-white" />
              <h1 className="text-xl font-bold text-white">Votre numéro</h1>
            </div>

            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-4 mb-4 border border-white/20">
              <p className="text-xs text-white/60 mb-1">🇧🇯 Bénin</p>
              <p className="text-2xl sm:text-3xl font-mono text-white tracking-wider">
                +229 {formatPhone(phoneDigits) || '__ __ __ __ __'}
              </p>
            </div>

            <NumPad />

            <motion.button
              whileTap={{ scale: 0.95 }}
              className="mt-4 w-full py-3 bg-white rounded-full text-orange-600 font-bold text-lg flex items-center justify-center gap-2 shadow-xl disabled:opacity-50"
              onClick={handlePhoneSubmit}
              disabled={phoneDigits.length < 8 || isLoading}
            >
              {isLoading ? 'Vérification...' : 'Continuer'}
              <ArrowRight className="w-5 h-5" />
            </motion.button>
          </motion.div>
        )}

        {/* PIN LOGIN */}
        {step === 'pin-login' && (
          <motion.div key="pin-login" initial={{ opacity: 0, x: 100 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -100 }} className="w-full max-w-md text-center flex-1 flex flex-col justify-center">
            <button onClick={() => { setStep('phone'); setPin(''); }} className="self-start mb-4">
              <ArrowLeft className="w-6 h-6 text-white" />
            </button>
            <Lock className="w-10 h-10 text-white mx-auto mb-3" />
            <h1 className="text-xl font-bold text-white mb-1">Entrez votre PIN</h1>
            <p className="text-white/70 text-sm mb-6">Bonjour {displayName} 👋</p>
            
            <PinInput value={pin} onChange={setPin} />

            <motion.button
              whileTap={{ scale: 0.95 }}
              className="mt-6 w-full py-3 bg-white rounded-full text-orange-600 font-bold text-lg flex items-center justify-center gap-2 shadow-xl disabled:opacity-50"
              onClick={handlePinLogin}
              disabled={pin.length !== 6 || isLoading}
            >
              {isLoading ? 'Connexion...' : 'Se connecter'}
              <ArrowRight className="w-5 h-5" />
            </motion.button>

            <button className="mt-3 text-white/60 text-sm underline" onClick={() => {
              setNewPin('');
              setNewPinConfirm('');
              setSecurityAnswers([]);
              setStep('pin-forgot');
            }}>
              PIN oublié ?
            </button>
          </motion.div>
        )}

        {/* NAME STEP (new user) */}
        {step === 'name' && (
          <motion.div key="name" initial={{ opacity: 0, x: 100 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -100 }} className="w-full max-w-md text-center flex-1 flex flex-col justify-center">
            <button onClick={() => { setStep('phone'); }} className="self-start mb-4">
              <ArrowLeft className="w-6 h-6 text-white" />
            </button>
            <h1 className="text-xl font-bold text-white mb-1">Comment vous appelez-vous ?</h1>
            <p className="text-white/70 text-sm mb-6">Ce nom sera visible par les autres</p>

            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-4 mb-6 border border-white/20">
              <input
                type="text"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                placeholder="Votre nom ou pseudo"
                className="w-full text-xl text-center bg-transparent text-white placeholder-white/50 outline-none"
                autoFocus
                maxLength={30}
              />
            </div>

            <motion.button
              whileTap={{ scale: 0.95 }}
              className="w-full py-3 bg-white rounded-full text-orange-600 font-bold text-lg flex items-center justify-center gap-2 shadow-xl disabled:opacity-50"
              onClick={handleNameSubmit}
              disabled={!displayName.trim()}
            >
              Continuer
              <ArrowRight className="w-5 h-5" />
            </motion.button>
          </motion.div>
        )}

        {/* CREATE PIN */}
        {step === 'pin-create' && (
          <motion.div key="pin-create" initial={{ opacity: 0, x: 100 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -100 }} className="w-full max-w-md text-center flex-1 flex flex-col justify-center">
            <button onClick={() => { setStep('name'); setPin(''); }} className="self-start mb-4">
              <ArrowLeft className="w-6 h-6 text-white" />
            </button>
            <Lock className="w-10 h-10 text-white mx-auto mb-3" />
            <h1 className="text-xl font-bold text-white mb-1">Créez votre PIN</h1>
            <p className="text-white/70 text-sm mb-6">6 chiffres pour sécuriser votre compte</p>

            <PinInput value={pin} onChange={setPin} />

            <motion.button
              whileTap={{ scale: 0.95 }}
              className="mt-6 w-full py-3 bg-white rounded-full text-orange-600 font-bold text-lg flex items-center justify-center gap-2 shadow-xl disabled:opacity-50"
              onClick={handlePinCreate}
              disabled={pin.length !== 6}
            >
              Continuer
              <ArrowRight className="w-5 h-5" />
            </motion.button>
          </motion.div>
        )}

        {/* CONFIRM PIN */}
        {step === 'pin-confirm' && (
          <motion.div key="pin-confirm" initial={{ opacity: 0, x: 100 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -100 }} className="w-full max-w-md text-center flex-1 flex flex-col justify-center">
            <button onClick={() => { setStep('pin-create'); setPinConfirm(''); }} className="self-start mb-4">
              <ArrowLeft className="w-6 h-6 text-white" />
            </button>
            <Lock className="w-10 h-10 text-white mx-auto mb-3" />
            <h1 className="text-xl font-bold text-white mb-1">Confirmez votre PIN</h1>
            <p className="text-white/70 text-sm mb-6">Entrez à nouveau vos 6 chiffres</p>

            <PinInput value={pinConfirm} onChange={setPinConfirm} />

            <motion.button
              whileTap={{ scale: 0.95 }}
              className="mt-6 w-full py-3 bg-white rounded-full text-orange-600 font-bold text-lg flex items-center justify-center gap-2 shadow-xl disabled:opacity-50"
              onClick={handlePinConfirm}
              disabled={pinConfirm.length !== 6 || isLoading}
            >
              {isLoading ? 'Création...' : 'Créer mon compte'}
              <Check className="w-5 h-5" />
            </motion.button>
          </motion.div>
        )}

        {/* VISUAL SECURITY SETUP (after account creation) */}
        {step === 'security-setup' && (
          <VisualSecuritySetup
            onComplete={handleSecuritySetupComplete}
            onBack={() => setStep('complete')}
            isLoading={isLoading}
          />
        )}

        {/* PIN FORGOT - Visual security check */}
        {step === 'pin-forgot' && (
          <motion.div key="pin-forgot" initial={{ opacity: 0, x: 100 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -100 }} className="w-full max-w-md text-center flex-1 flex flex-col justify-center">
            <VisualSecurityCheck
              onComplete={handleSecurityCheckComplete}
              onBack={() => setStep('pin-login')}
            />
          </motion.div>
        )}

        {/* PIN RESET - New PIN creation after visual security check */}
        {step === 'pin-reset' && (
          <motion.div key="pin-reset" initial={{ opacity: 0, x: 100 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -100 }} className="w-full max-w-md text-center flex-1 flex flex-col justify-center">
            <button onClick={() => { setStep('pin-forgot'); setNewPin(''); setNewPinConfirm(''); }} className="self-start mb-4">
              <ArrowLeft className="w-6 h-6 text-white" />
            </button>
            <Lock className="w-10 h-10 text-white mx-auto mb-3" />
            <h1 className="text-xl font-bold text-white mb-1">
              {newPinConfirm.length > 0 || newPin.length === 6 ? 'Confirmez le nouveau PIN' : 'Nouveau PIN'}
            </h1>
            <p className="text-white/70 text-sm mb-6">
              {newPin.length < 6 ? 'Choisissez 6 nouveaux chiffres' : 'Entrez à nouveau pour confirmer'}
            </p>

            {newPin.length < 6 ? (
              <PinInput value={newPin} onChange={setNewPin} />
            ) : (
              <PinInput value={newPinConfirm} onChange={setNewPinConfirm} autoFocus />
            )}

            <motion.button
              whileTap={{ scale: 0.95 }}
              className="mt-6 w-full py-3 bg-white rounded-full text-orange-600 font-bold text-lg flex items-center justify-center gap-2 shadow-xl disabled:opacity-50"
              onClick={handlePinReset}
              disabled={newPin.length !== 6 || newPinConfirm.length !== 6 || isLoading}
            >
              {isLoading ? 'Vérification...' : 'Réinitialiser le PIN'}
              <Check className="w-5 h-5" />
            </motion.button>

            <button className="mt-3 text-white/60 text-xs" onClick={() => toast({ title: "Aide", description: "Si le code secret ne correspond pas, contactez un administrateur FITILA" })}>
              Besoin d'aide ?
            </button>
          </motion.div>
        )}

        {step === 'complete' && (
          <motion.div key="complete" initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} className="text-center flex-1 flex flex-col justify-center">
            <motion.div animate={{ rotate: [0, 10, -10, 0] }} transition={{ repeat: Infinity, duration: 0.5 }} className="text-6xl mb-4">
              🎉
            </motion.div>
            <h1 className="text-2xl font-bold text-white mb-2">Bienvenue {displayName} !</h1>
            <p className="text-white/80 text-sm">Redirection...</p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-shrink-0 h-2" />
    </div>
  );
}
