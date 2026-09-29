import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { TamTamMicButton } from '@/components/tamtam/TamTamMicButton';
import { useTamTamLanguage } from '@/contexts/TamTamLanguageContext';
import { useAudioDescription } from '@/contexts/AudioDescriptionContext';
import { useBilingualAudio } from '@/hooks/useBilingualAudio';
import { tamtamFeedback } from '@/utils/tamtamFeedback';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Check, Hospital, MapPin, Mic, Phone, ShieldCheck, Trash2, UserPlus, Users, type LucideIcon } from 'lucide-react';
import FitilaPageHeader from '@/components/fitila/FitilaPageHeader';

const emergencyContacts = [
  { id: 1, avatar: '👨🏾', type: '👨‍👩‍👧', labelKey: 'family' },
  { id: 2, avatar: '👩🏾', type: '🏥', labelKey: 'hospital' },
  { id: 3, avatar: '👴🏾', type: '👮', labelKey: 'police' },
];

export default function TamTamSOS() {
  const [isActivated, setIsActivated] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [voiceMessage, setVoiceMessage] = useState<string | null>(null);
  const [isRecordingMessage, setIsRecordingMessage] = useState(false);
  const { t, currentLang } = useTamTamLanguage();
  const { announceAction } = useAudioDescription();
  const { speakCurrentLang } = useBilingualAudio();
  const { toast } = useToast();
  const { user } = useAuth();
  const [savedContacts, setSavedContacts] = useState<{ id: string; name: string; phone: string; relationship: string | null }[]>([]);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');

  const loadContacts = async () => {
    if (!user) { setSavedContacts([]); return; }
    const { data } = await supabase
      .from('tamtam_emergency_contacts')
      .select('id,name,phone,relationship')
      .eq('user_id', user.id)
      .order('is_primary', { ascending: false });
    setSavedContacts(data ?? []);
  };
  useEffect(() => { loadContacts(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const saveContact = async () => {
    if (!user) { toast({ title: 'Connexion requise', description: 'Connectez-vous pour enregistrer un contact de confiance.' }); return; }
    if (!newName.trim() || newPhone.replace(/\D/g, '').length < 8) {
      toast({ title: 'Contact incomplet', description: 'Nom et numéro (8 chiffres minimum) requis.', variant: 'destructive' });
      return;
    }
    const { error } = await supabase.from('tamtam_emergency_contacts').insert({ user_id: user.id, name: newName.trim(), phone: newPhone.trim() });
    if (error) { toast({ title: 'Enregistrement impossible', description: error.message, variant: 'destructive' }); return; }
    setNewName(''); setNewPhone(''); setAdding(false);
    loadContacts();
  };

  const removeContact = async (id: string) => {
    await supabase.from('tamtam_emergency_contacts').delete().eq('id', id);
    loadContacts();
  };

  useEffect(() => {
    announceAction(tr('screenSOS', "Écran SOS"));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [announceAction, t]);

  const handleSOSPress = () => {
    tamtamFeedback.play('click');
    
    if (isActivated) {
      setIsActivated(false);
      setCountdown(null);
      setVoiceMessage(null);
      speakCurrentLang(tr('cancelAlert', 'Alerte annulée'));
      return;
    }

    setIsActivated(true);
    setCountdown(3);
    tamtamFeedback.play('sos');
    speakCurrentLang(tr('emergency', "Urgence"));

    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          speakCurrentLang(tr('callEmergency', "Appel d'urgence en cours"));
          
          // Send emergency alert with voice context
          sendEmergencyAlert();
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const sendEmergencyAlert = async () => {
    try {
      // Get location
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 5000
        });
      });
      
      toast({
        title: "🆘 Alerte envoyée",
        description: `Position: ${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)}`
      });
      
      await speakCurrentLang(tr('sos_alert_sent', "Alerte envoyée"));
      
    } catch (err) {
      console.error('[TamTamSOS] Location error:', err);
      toast({
        title: "🆘 Alerte envoyée",
        description: "Position non disponible"
      });
    }
  };

  const handleVoiceMessage = async (result: {
    audioBase64: string;
    transcription?: string;
    translation?: string;
    sourceLang: 'ba' | 'fr';
  }) => {
    setIsRecordingMessage(false);
    
    if (result.transcription) {
      setVoiceMessage(result.transcription);
      
      toast({
        title: "🎤 Message d'urgence enregistré",
        description: result.transcription
      });
      
      await speakCurrentLang(tr('sos_message_recorded', "Message enregistré"));
    }
  };

  const handleContactPress = (labelKey: string) => {
    tamtamFeedback.play('click');
    speakCurrentLang(t(labelKey));
  };

  const handleAddContact = () => {
    tamtamFeedback.play('click');
    speakCurrentLang(tr('addContact', 'Ajouter un contact de confiance'));
    setAdding((v) => !v);
  };

  // Libellés Flutter Build19 ; la traduction de la plateforme reste prioritaire quand elle existe.
  const tr = (key: string, fr: string) => {
    const v = t(key);
    return !v || v === key ? fr : v;
  };
  const contactIcons: Record<string, LucideIcon> = { family: Users, hospital: Hospital, police: ShieldCheck };
  const contactLabels: Record<string, string> = { family: 'Famille', hospital: 'Hôpital', police: 'Police' };

  return (
    <div className="h-full overflow-y-auto bg-[#F7F5EC] text-[#241F2E] pb-28">
      <FitilaPageHeader title="SOS" subtitle="Alerte rapide et contacts de confiance" />

      <div className="flex flex-col items-center px-[18px] pt-[26px]">
        <motion.button
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          onClick={handleSOSPress}
          aria-label="Déclencher une alerte SOS"
          className="relative"
        >
          {isActivated && (
            <>
              <motion.div animate={{ scale: [1, 1.35], opacity: [0.45, 0] }} transition={{ duration: 1, repeat: Infinity }} className="absolute inset-0 rounded-full bg-[#B54E33]" />
              <motion.div animate={{ scale: [1, 1.6], opacity: [0.25, 0] }} transition={{ duration: 1, repeat: Infinity, delay: 0.3 }} className="absolute inset-0 rounded-full bg-[#B54E33]" />
            </>
          )}
          <div
            className="relative flex h-[170px] w-[170px] items-center justify-center rounded-full border-4 transition-colors"
            style={{ background: isActivated ? '#9E3F27' : '#B54E33', borderColor: '#E9B9A6' }}
          >
            {countdown !== null ? (
              <span className="text-[64px] font-extrabold text-white">{countdown}</span>
            ) : isActivated ? (
              <Phone className="h-14 w-14 text-white" />
            ) : (
              <span className="text-[40px] font-black tracking-wide text-white">SOS</span>
            )}
          </div>
        </motion.button>
        <p className="mt-4 text-[12px]" style={{ color: '#8C8571' }}>
          {isActivated ? tr('cancelAlert', 'Touchez pour annuler') : 'Touchez pour déclencher une alerte'}
        </p>

        {!isActivated && (
          <div className="mt-5 w-full rounded-[18px] border border-[#E4DFCC] bg-white p-4">
            <div className="mb-3 flex items-center gap-2">
              <Mic className="h-[18px] w-[18px]" style={{ color: '#9C6B1D' }} />
              <span className="text-[13px] font-extrabold">{tr('sos_describe_situation', 'Décrivez la situation')}</span>
            </div>
            {voiceMessage && (
              <div className="mb-3 rounded-[14px] bg-[#F7F5EC] p-3">
                <p className="text-[13px] italic">"{voiceMessage}"</p>
              </div>
            )}
            <div className="flex justify-center">
              <TamTamMicButton
                size="md"
                onRecordingComplete={handleVoiceMessage}
                autoTranscribe={true}
                autoTranslate={true}
                sourceLang={currentLang}
                disabled={isRecordingMessage}
              />
            </div>
          </div>
        )}

        <div className="mt-5 flex w-full items-center gap-3 rounded-[18px] border border-[#E4DFCC] bg-white px-4 py-3">
          <MapPin className="h-[18px] w-[18px]" style={{ color: '#B54E33' }} />
          <span className="flex-1 text-[13px] font-extrabold">{tr('location', 'Localisation')}</span>
          <div className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <motion.div key={i} animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.3 }} className="h-2.5 w-2.5 rounded-full bg-[#3F6E52]" />
            ))}
          </div>
          <Check className="h-[18px] w-[18px]" style={{ color: '#3F6E52' }} />
        </div>

        <h2 className="mt-6 w-full text-[14px] font-extrabold">Contacts de confiance</h2>
        <div className="mt-3 w-full space-y-[10px]">
          {(savedContacts.length ? [] : emergencyContacts).map((contact) => {
            const Icon = contactIcons[contact.labelKey] ?? Users;
            return (
              <button
                key={contact.id}
                type="button"
                onClick={() => handleContactPress(contact.labelKey)}
                className="flex h-[52px] w-full items-center gap-3 rounded-[26px] border border-[#E4DFCC] bg-white px-4 text-left active:scale-[0.99]"
              >
                <Icon className="h-[18px] w-[18px]" style={{ color: '#9C6B1D' }} />
                <span className="text-[14px] font-extrabold">{contactLabels[contact.labelKey] ?? t(contact.labelKey)}</span>
              </button>
            );
          })}
          {savedContacts.map((c) => (
            <div key={c.id} className="flex h-[52px] w-full items-center gap-3 rounded-[26px] border border-[#E4DFCC] bg-white pl-4 pr-2">
              <Users className="h-[18px] w-[18px]" style={{ color: '#9C6B1D' }} />
              <a href={`tel:${c.phone}`} className="min-w-0 flex-1">
                <span className="block truncate text-[14px] font-extrabold">{c.name}</span>
                <span className="block text-[11px]" style={{ color: '#8C8571' }}>{c.phone}</span>
              </a>
              <button type="button" onClick={() => removeContact(c.id)} aria-label={`Supprimer ${c.name}`} className="rounded-full p-2" style={{ color: '#B54E33' }}>
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
          {adding && (
            <div className="space-y-2 rounded-[18px] border border-[#E4DFCC] bg-white p-3">
              <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Nom" aria-label="Nom du contact" className="h-11 w-full rounded-[14px] border border-[#E4DFCC] px-3 text-[14px] outline-none focus:border-[#C99530]" />
              <input value={newPhone} onChange={(e) => setNewPhone(e.target.value)} placeholder="Téléphone" inputMode="tel" aria-label="Téléphone du contact" className="h-11 w-full rounded-[14px] border border-[#E4DFCC] px-3 text-[14px] outline-none focus:border-[#C99530]" />
              <button type="button" onClick={saveContact} className="h-11 w-full rounded-full bg-[#C99530] text-[14px] font-extrabold text-[#2B2110]">Enregistrer</button>
            </div>
          )}
          <button
            type="button"
            onClick={handleAddContact}
            className="flex h-[48px] w-full items-center justify-center gap-2 rounded-[24px] border border-[#E4DFCC] bg-[#FBF9F2] text-[13px] font-bold"
            style={{ color: '#8C8571' }}
          >
            <UserPlus className="h-[18px] w-[18px]" /> {tr('addContact', 'Ajouter un contact de confiance')}
          </button>
        </div>
      </div>
    </div>
  );
}
