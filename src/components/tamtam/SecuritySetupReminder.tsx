import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, X } from 'lucide-react';
import { useSecurityStatus } from '@/hooks/useSecurityStatus';
import { useAuth } from '@/contexts/AuthContext';
import VisualSecuritySetup from './VisualSecuritySetup';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export default function SecuritySetupReminder() {
  const { user } = useAuth();
  const { hasSecuritySetup, loading, refetch } = useSecurityStatus();
  const [dismissed, setDismissed] = useState(false);
  const [showSetup, setShowSetup] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  if (loading || hasSecuritySetup || !user || dismissed) return null;

  const handleComplete = async (answers: string[]) => {
    setSaving(true);
    try {
      const res = await supabase.functions.invoke('set-security', {
        body: { answers },
      });
      if (res.error) throw new Error('Erreur serveur');
      toast({ title: '🛡️ Code secret sauvegardé !', description: 'Votre compte est maintenant protégé' });
      refetch();
      setShowSetup(false);
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  // Full-screen security setup overlay
  if (showSetup) {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] bg-gradient-to-br from-orange-500 via-orange-600 to-amber-700 flex flex-col items-center justify-center px-4"
        >
          <VisualSecuritySetup
            onComplete={handleComplete}
            onBack={() => setShowSetup(false)}
            isLoading={saving}
          />
        </motion.div>
      </AnimatePresence>
    );
  }

  // Banner reminder
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-3 mt-2 mb-1"
    >
      <div className="relative bg-gradient-to-r from-orange-500 to-amber-500 rounded-2xl p-3 shadow-lg">
        <button
          onClick={() => setDismissed(true)}
          className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/20 flex items-center justify-center"
        >
          <X className="w-3 h-3 text-white" />
        </button>
        <button onClick={() => setShowSetup(true)} className="w-full flex items-center gap-3 text-left">
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-bold text-sm">Protège ton compte 🛡️</p>
            <p className="text-white/80 text-xs">Configure ton code secret visuel pour récupérer ton PIN</p>
          </div>
        </button>
      </div>
    </motion.div>
  );
}
