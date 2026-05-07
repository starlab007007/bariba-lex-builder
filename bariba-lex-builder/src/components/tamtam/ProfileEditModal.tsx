import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, Loader2, User, MapPin, Phone, Lock, Eye, EyeOff } from 'lucide-react';
import { TamTamProfile } from '@/hooks/useTamTamProfile';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ProfileEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: TamTamProfile | null;
  onSave: (updates: Partial<TamTamProfile>) => Promise<{ error: string | null }>;
}

export const ProfileEditModal: React.FC<ProfileEditModalProps> = ({
  isOpen,
  onClose,
  profile,
  onSave,
}) => {
  const [displayName, setDisplayName] = useState('');
  const [location, setLocation] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [saving, setSaving] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (profile && isOpen) {
      setDisplayName(profile.display_name || '');
      setLocation(profile.location || '');
      setPhoneNumber(profile.phone_number || '');
    }
  }, [profile, isOpen]);

  const handleSave = async () => {
    setSaving(true);
    const result = await onSave({
      display_name: displayName.trim() || null,
      location: location.trim() || null,
      phone_number: phoneNumber.trim() || null,
    });
    setSaving(false);
    if (!result.error) onClose();
  };

  const handleChangePassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      toast({ title: "Mot de passe trop court", description: "Minimum 6 caractères", variant: "destructive" });
      return;
    }
    setSavingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSavingPassword(false);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "✅ Mot de passe modifié" });
      setNewPassword('');
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-md bg-[hsl(var(--kuaishou-white))] rounded-t-3xl sm:rounded-3xl p-6 pb-8 sm:pb-6"
          >
            {/* Handle bar (mobile) */}
            <div className="w-10 h-1 bg-[hsl(var(--kuaishou-border))] rounded-full mx-auto mb-4 sm:hidden" />

            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-[hsl(var(--kuaishou-text))]">Modifier le profil</h2>
              <motion.button whileTap={{ scale: 0.9 }} onClick={onClose} className="p-2 rounded-full bg-[hsl(var(--kuaishou-gray-light))]">
                <X className="w-5 h-5 text-[hsl(var(--kuaishou-text-muted))]" />
              </motion.button>
            </div>

            {/* Fields */}
            <div className="space-y-5">
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-sm text-[hsl(var(--kuaishou-text-muted))]">
                  <User className="w-4 h-4" /> Nom d'affichage
                </Label>
                <Input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Votre nom"
                  className="rounded-xl border-[hsl(var(--kuaishou-border))] focus:border-[hsl(var(--kuaishou-orange))] focus:ring-[hsl(var(--kuaishou-orange)/0.2)]"
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-sm text-[hsl(var(--kuaishou-text-muted))]">
                  <MapPin className="w-4 h-4" /> Localisation
                </Label>
                <Input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Ex: Parakou, Bénin"
                  className="rounded-xl border-[hsl(var(--kuaishou-border))] focus:border-[hsl(var(--kuaishou-orange))] focus:ring-[hsl(var(--kuaishou-orange)/0.2)]"
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-sm text-[hsl(var(--kuaishou-text-muted))]">
                  <Phone className="w-4 h-4" /> Téléphone
                </Label>
                <Input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="+229 XX XX XX XX"
                  className="rounded-xl border-[hsl(var(--kuaishou-border))] focus:border-[hsl(var(--kuaishou-orange))] focus:ring-[hsl(var(--kuaishou-orange)/0.2)]"
                />
              </div>

              {/* Password change */}
              <div className="space-y-2 pt-2 border-t border-[hsl(var(--kuaishou-border))]">
                <Label className="flex items-center gap-2 text-sm text-[hsl(var(--kuaishou-text-muted))]">
                  <Lock className="w-4 h-4" /> Nouveau mot de passe
                </Label>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimum 6 caractères"
                    className="rounded-xl border-[hsl(var(--kuaishou-border))] focus:border-[hsl(var(--kuaishou-orange))] focus:ring-[hsl(var(--kuaishou-orange)/0.2)] pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[hsl(var(--kuaishou-text-muted))]"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {newPassword && (
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    onClick={handleChangePassword}
                    disabled={savingPassword}
                    className="w-full py-2 bg-[hsl(var(--kuaishou-text))] text-white rounded-xl text-sm font-medium flex items-center justify-center gap-2"
                  >
                    {savingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                    Changer le mot de passe
                  </motion.button>
                )}
              </div>
            </div>

            {/* Save button */}
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={handleSave}
              disabled={saving}
              className="w-full mt-6 py-3.5 bg-[hsl(var(--kuaishou-orange))] text-white rounded-full font-semibold flex items-center justify-center gap-2 shadow-lg shadow-[hsl(var(--kuaishou-orange)/0.4)] disabled:opacity-60"
            >
              {saving ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  <span>Enregistrer</span>
                </>
              )}
            </motion.button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ProfileEditModal;
