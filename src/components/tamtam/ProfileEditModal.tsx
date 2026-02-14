import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, Loader2, User, MapPin, Phone } from 'lucide-react';
import { TamTamProfile } from '@/hooks/useTamTamProfile';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

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
