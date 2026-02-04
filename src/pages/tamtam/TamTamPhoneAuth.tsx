import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, ArrowRight, User, Mic, Check, Volume2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useTamTamAudioRecorder } from '@/hooks/useTamTamAudioRecorder';

type Step = 'phone' | 'name' | 'bio' | 'complete';

export default function TamTamPhoneAuth() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [step, setStep] = useState<Step>('phone');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [bioAudioUrl, setBioAudioUrl] = useState<string | null>(null);
  
  const { isRecording, isUploading, duration, startRecording, stopRecording } = useTamTamAudioRecorder({
    onRecordingComplete: (url) => {
      setBioAudioUrl(url);
      playFeedbackSound('success');
    }
  });

  useEffect(() => {
    if (user) {
      navigate('/tamtam');
    }
  }, [user, navigate]);

  const playFeedbackSound = (type: 'tap' | 'success' | 'error') => {
    try {
      // Simple vibration feedback as fallback
      if ('vibrate' in navigator) {
        navigator.vibrate(type === 'tap' ? 10 : type === 'success' ? [50, 30, 50] : [100, 50, 100]);
      }
    } catch (err) {
      // Silently ignore audio/vibration errors
    }
  };

  const handleNumberPress = (num: string) => {
    playFeedbackSound('tap');
    if (phoneNumber.length < 12) {
      setPhoneNumber(prev => prev + num);
    }
  };

  const handleBackspace = () => {
    playFeedbackSound('tap');
    setPhoneNumber(prev => prev.slice(0, -1));
  };

  const handlePhoneSubmit = async () => {
    if (phoneNumber.length < 8) {
      toast({
        title: "Numéro trop court",
        description: "Entrez un numéro de téléphone valide",
        variant: "destructive"
      });
      playFeedbackSound('error');
      return;
    }

    setIsLoading(true);
    playFeedbackSound('tap');

    try {
      // Check if user exists with this phone
      const { data: existingProfile } = await supabase
        .from('tamtam_profiles')
        .select('*')
        .eq('phone_number', phoneNumber)
        .maybeSingle();

      if (existingProfile) {
        // Sign in existing user (simplified - no SMS verification)
        const { error } = await supabase.auth.signInWithPassword({
          email: `${phoneNumber}@tamtam.local`,
          password: phoneNumber
        });

        if (error) {
          // User exists but login failed - might be wrong password format
          console.log('Login failed, trying with alternate password');
          throw error;
        }
        
        playFeedbackSound('success');
        toast({
          title: "Connexion réussie",
          description: `Bienvenue ${existingProfile.display_name || 'sur TAM-TAM'} !`
        });
        navigate('/tamtam');
      } else {
        // New user - go to name step
        playFeedbackSound('success');
        setStep('name');
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      // If sign in fails, it's likely a new user
      playFeedbackSound('success');
      setStep('name');
    } finally {
      setIsLoading(false);
    }
  };

  const handleNameSubmit = () => {
    if (!displayName.trim()) {
      toast({
        title: "Nom requis",
        description: "Entrez votre nom ou pseudo",
        variant: "destructive"
      });
      return;
    }
    playFeedbackSound('success');
    setStep('bio');
  };

  const handleBioRecord = async () => {
    try {
      if (isRecording) {
        await stopRecording();
      } else {
        await startRecording();
      }
    } catch (err) {
      console.error('Recording error:', err);
      // Don't show error - bio is optional
    }
  };

  const handleComplete = async () => {
    setIsLoading(true);
    
    try {
      const redirectUrl = `${window.location.origin}/tamtam`;
      
      // Create new user account
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: `${phoneNumber}@tamtam.local`,
        password: phoneNumber,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            display_name: displayName,
            phone_number: phoneNumber
          }
        }
      });

      if (signUpError) {
        console.error('SignUp error:', signUpError);
        
        // If user already exists, try to sign in
        if (signUpError.message.includes('already registered')) {
          const { error: signInError } = await supabase.auth.signInWithPassword({
            email: `${phoneNumber}@tamtam.local`,
            password: phoneNumber
          });
          
          if (signInError) throw signInError;
          
          playFeedbackSound('success');
          navigate('/tamtam');
          return;
        }
        
        throw signUpError;
      }

      // Wait a moment for the trigger to create the profile
      await new Promise(resolve => setTimeout(resolve, 500));

      // Update profile with bio audio if available
      if (authData.user) {
        const updateData: Record<string, string> = {
          display_name: displayName,
          phone_number: phoneNumber
        };
        
        if (bioAudioUrl) {
          updateData.bio_audio_url = bioAudioUrl;
        }

        await supabase
          .from('tamtam_profiles')
          .update(updateData)
          .eq('user_id', authData.user.id);
      }

      playFeedbackSound('success');
      setStep('complete');
      
      toast({
        title: "Compte créé !",
        description: `Bienvenue sur TAM-TAM, ${displayName} !`
      });
      
      setTimeout(() => {
        navigate('/tamtam');
      }, 2000);
    } catch (err: any) {
      console.error('Registration error:', err);
      toast({
        title: "Erreur",
        description: err.message || "Impossible de créer le compte. Veuillez réessayer.",
        variant: "destructive"
      });
      playFeedbackSound('error');
    } finally {
      setIsLoading(false);
    }
  };

  const NumPad = () => (
    <div className="grid grid-cols-3 gap-2 sm:gap-3 md:gap-4 w-full max-w-[280px] sm:max-w-xs mx-auto">
      {[1, 2, 3, 4, 5, 6, 7, 8, 9, '*', 0, '#'].map((num) => (
        <motion.button
          key={num}
          whileTap={{ scale: 0.9 }}
          className="w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-full bg-white/10 backdrop-blur-lg text-white text-lg sm:text-xl md:text-2xl font-bold shadow-lg border border-white/20 flex items-center justify-center"
          onClick={() => handleNumberPress(num.toString())}
        >
          {num}
        </motion.button>
      ))}
    </div>
  );

  return (
    <div className="h-[100dvh] bg-gradient-to-br from-orange-500 via-orange-600 to-amber-700 flex flex-col items-center justify-between py-4 sm:py-6 md:py-8 px-4 sm:px-6">
      {/* Logo */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        className="flex-shrink-0"
      >
        <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-full bg-white/20 backdrop-blur-lg flex items-center justify-center shadow-2xl">
          <span className="text-3xl sm:text-4xl md:text-5xl">🥁</span>
        </div>
      </motion.div>

      <AnimatePresence mode="wait">
        {/* Step 1: Phone Number */}
        {step === 'phone' && (
          <motion.div
            key="phone"
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            className="w-full max-w-md text-center flex-1 flex flex-col justify-center"
          >
            <div className="flex items-center justify-center gap-2 sm:gap-3 mb-3 sm:mb-4 md:mb-6">
              <Phone className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-white" />
              <h1 className="text-xl sm:text-2xl font-bold text-white">Votre numéro</h1>
            </div>

            {/* Phone display */}
            <div className="bg-white/10 backdrop-blur-lg rounded-xl sm:rounded-2xl p-3 sm:p-4 md:p-6 mb-4 sm:mb-6 md:mb-8 border border-white/20">
              <p className="text-2xl sm:text-3xl md:text-4xl font-mono text-white tracking-wider min-h-[32px] sm:min-h-[40px] md:min-h-[48px]">
                {phoneNumber || '_ _ _ _ _ _ _ _'}
              </p>
            </div>

            <NumPad />

            {/* Backspace */}
            <motion.button
              whileTap={{ scale: 0.9 }}
              className="mt-2 sm:mt-3 md:mt-4 px-4 sm:px-6 py-2 sm:py-3 bg-white/10 backdrop-blur-lg rounded-full text-white text-sm sm:text-base"
              onClick={handleBackspace}
            >
              ← Effacer
            </motion.button>

            {/* Submit */}
            <motion.button
              whileTap={{ scale: 0.95 }}
              className="mt-4 sm:mt-6 md:mt-8 w-full py-3 sm:py-4 bg-white rounded-full text-orange-600 font-bold text-lg sm:text-xl flex items-center justify-center gap-2 shadow-xl disabled:opacity-50"
              onClick={handlePhoneSubmit}
              disabled={phoneNumber.length < 8 || isLoading}
            >
              {isLoading ? 'Chargement...' : 'Continuer'}
              <ArrowRight className="w-5 h-5 sm:w-6 sm:h-6" />
            </motion.button>
          </motion.div>
        )}

        {/* Step 2: Display Name */}
        {step === 'name' && (
          <motion.div
            key="name"
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            className="w-full max-w-md text-center flex-1 flex flex-col justify-center"
          >
            <div className="flex items-center justify-center gap-2 sm:gap-3 mb-4 sm:mb-6">
              <User className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-white" />
              <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-white">Comment vous appelez-vous ?</h1>
            </div>

            <div className="bg-white/10 backdrop-blur-lg rounded-xl sm:rounded-2xl p-3 sm:p-4 mb-4 sm:mb-6 md:mb-8 border border-white/20">
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Votre nom ou pseudo"
                className="w-full text-xl sm:text-2xl text-center bg-transparent text-white placeholder-white/50 outline-none"
                autoFocus
              />
            </div>

            {/* Voice input alternative */}
            <motion.button
              whileTap={{ scale: 0.95 }}
              className="mb-3 sm:mb-4 px-4 sm:px-6 py-2 sm:py-3 bg-white/10 backdrop-blur-lg rounded-full text-white text-sm sm:text-base flex items-center justify-center gap-2 mx-auto"
            >
              <Volume2 className="w-4 h-4 sm:w-5 sm:h-5" />
              Dicter mon nom
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.95 }}
              className="w-full py-3 sm:py-4 bg-white rounded-full text-orange-600 font-bold text-lg sm:text-xl flex items-center justify-center gap-2 shadow-xl"
              onClick={handleNameSubmit}
            >
              Continuer
              <ArrowRight className="w-5 h-5 sm:w-6 sm:h-6" />
            </motion.button>
          </motion.div>
        )}

        {/* Step 3: Voice Bio */}
        {step === 'bio' && (
          <motion.div
            key="bio"
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            className="w-full max-w-md text-center flex-1 flex flex-col justify-center"
          >
            <div className="flex items-center justify-center gap-2 sm:gap-3 mb-3 sm:mb-4 md:mb-6">
              <Mic className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-white" />
              <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-white">Présentez-vous vocalement</h1>
            </div>

            <p className="text-white/80 text-sm sm:text-base mb-4 sm:mb-6 md:mb-8">
              Enregistrez un message audio pour vous présenter à la communauté (optionnel)
            </p>

            {/* Recording button */}
            <motion.button
              whileTap={{ scale: 0.95 }}
              animate={isRecording ? { scale: [1, 1.1, 1], transition: { repeat: Infinity, duration: 1 } } : {}}
              className={`w-20 h-20 sm:w-24 sm:h-24 md:w-32 md:h-32 rounded-full mx-auto mb-4 sm:mb-6 md:mb-8 flex items-center justify-center shadow-2xl ${
                isRecording 
                  ? 'bg-red-500 animate-pulse' 
                  : bioAudioUrl 
                    ? 'bg-green-500' 
                    : 'bg-white/20 backdrop-blur-lg'
              }`}
              onClick={handleBioRecord}
              disabled={isUploading}
            >
              {isRecording ? (
                <div className="text-center">
                  <Mic className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 text-white mx-auto" />
                  <span className="text-white text-xs sm:text-sm mt-1">{duration}s</span>
                </div>
              ) : bioAudioUrl ? (
                <Check className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 text-white" />
              ) : (
                <Mic className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 text-white" />
              )}
            </motion.button>

            {bioAudioUrl && (
              <p className="text-green-300 text-sm sm:text-base mb-3 sm:mb-4">✓ Bio enregistrée !</p>
            )}

            <div className="flex gap-3 sm:gap-4">
              <motion.button
                whileTap={{ scale: 0.95 }}
                className="flex-1 py-3 sm:py-4 bg-white/20 backdrop-blur-lg rounded-full text-white font-bold text-sm sm:text-base"
                onClick={() => handleComplete()}
                disabled={isLoading}
              >
                Passer
              </motion.button>
              
              <motion.button
                whileTap={{ scale: 0.95 }}
                className="flex-1 py-3 sm:py-4 bg-white rounded-full text-orange-600 font-bold text-sm sm:text-base flex items-center justify-center gap-2"
                onClick={handleComplete}
                disabled={isLoading}
              >
                {isLoading ? 'Création...' : 'Terminer'}
                <Check className="w-4 h-4 sm:w-5 sm:h-5" />
              </motion.button>
            </div>
          </motion.div>
        )}

        {/* Step 4: Complete */}
        {step === 'complete' && (
          <motion.div
            key="complete"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center flex-1 flex flex-col justify-center"
          >
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ repeat: Infinity, duration: 0.5 }}
              className="text-5xl sm:text-6xl md:text-8xl mb-4 sm:mb-6"
            >
              🎉
            </motion.div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Bienvenue {displayName} !</h1>
            <p className="text-white/80 text-sm sm:text-base">Redirection vers TAM-TAM...</p>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Spacer for bottom safe area */}
      <div className="flex-shrink-0 h-2 sm:h-4" />
    </div>
  );
}
