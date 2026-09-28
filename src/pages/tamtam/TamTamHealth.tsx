import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Volume2, Phone, AlertTriangle } from 'lucide-react';
import { useTamTamLanguage } from '@/contexts/TamTamLanguageContext';
import { useAudioDescription } from '@/contexts/AudioDescriptionContext';
import { useBilingualAudio } from '@/hooks/useBilingualAudio';
import FitilaPageHeader from '@/components/fitila/FitilaPageHeader';
import { SectionTiles } from '@/components/fitila/FitilaUi';
import type { LucideIcon } from 'lucide-react';
import { Asterisk, Pill, PersonStanding, Bug, UtensilsCrossed, PlusSquare, Sparkles } from 'lucide-react';
import { tamtamFeedback } from '@/utils/tamtamFeedback';
import { DomainChatbot, DomainContext } from '@/components/tamtam/DomainChatbot';
import { useToast } from '@/hooks/use-toast';

// Health sub-sections configuration
const TILE_ICONS: Record<string, LucideIcon> = { first_aid: Asterisk, medication: Pill, maternity: PersonStanding, diseases: Bug, nutrition: UtensilsCrossed, emergency: PlusSquare };

const sections = [
  { 
    id: 'first_aid', 
    icon: '🩹', 
    color: 'bg-red-500', 
    bgLight: 'bg-red-50',
    context: 'health_first_aid' as DomainContext,
    labelFr: 'Premiers secours', 
    labelBa: 'Ìrànwọ́ àkọ́kọ́',
    welcomeFr: 'Décrivez votre urgence médicale',
    welcomeBa: 'Ṣàlàyé ìṣòro ìlera rẹ'
  },
  { 
    id: 'medication', 
    icon: '💊', 
    color: 'bg-blue-500', 
    bgLight: 'bg-blue-50',
    context: 'health_medication' as DomainContext,
    labelFr: 'Médicaments', 
    labelBa: 'Oògùn',
    welcomeFr: 'Posez vos questions sur les médicaments',
    welcomeBa: 'Bi ìbéèrè nípa oògùn'
  },
  { 
    id: 'maternity', 
    icon: '🤰', 
    color: 'bg-pink-500', 
    bgLight: 'bg-pink-50',
    context: 'health_maternity' as DomainContext,
    labelFr: 'Maternité', 
    labelBa: 'Ìbímọ',
    welcomeFr: 'Conseils grossesse et bébé',
    welcomeBa: 'Ìmọ̀ràn nípa oyún àti ọmọ'
  },
  { 
    id: 'diseases', 
    icon: '🦟', 
    color: 'bg-yellow-600', 
    bgLight: 'bg-yellow-50',
    context: 'health_diseases' as DomainContext,
    labelFr: 'Maladies', 
    labelBa: 'Àrùn',
    welcomeFr: 'Informations sur les maladies courantes',
    welcomeBa: 'Àlàyé nípa àrùn'
  },
  { 
    id: 'nutrition', 
    icon: '🥗', 
    color: 'bg-green-500', 
    bgLight: 'bg-green-50',
    context: 'health_nutrition' as DomainContext,
    labelFr: 'Nutrition', 
    labelBa: 'Oúnjẹ',
    welcomeFr: 'Conseils alimentation et santé',
    welcomeBa: 'Ìmọ̀ràn nípa oúnjẹ'
  },
  { 
    id: 'emergency', 
    icon: '📞', 
    color: 'bg-orange-500', 
    bgLight: 'bg-orange-50',
    context: 'health_emergency' as DomainContext,
    labelFr: 'Appeler médecin', 
    labelBa: 'Pe dókítà',
    welcomeFr: 'Urgence médicale',
    welcomeBa: 'Pàjáwìrì ìlera',
    isEmergency: true
  },
];

// Emergency contacts
const emergencyContacts = [
  { name: 'SAMU Bénin', phone: '112', icon: '🚑' },
  { name: 'Centre de Santé', phone: '+229 21 30 00 00', icon: '🏥' },
  { name: 'Pharmacie de garde', phone: '+229 21 31 22 33', icon: '💊' },
];

export default function TamTamHealth() {
  const location=useLocation(); const navigate=useNavigate();
  const routeSection=()=>{const raw=location.pathname.split('/').filter(Boolean)[1]; const alias:Record<string,string>={'first-aid':'first_aid'}; const s=alias[raw]||raw; return s&&sections.some(x=>x.id===s)?s:null;};
  const [activeSection, setActiveSection] = useState<string | null>(routeSection());
  const { currentLang } = useTamTamLanguage();
  const { announceAction } = useAudioDescription();
  const { speakCurrentLang } = useBilingualAudio();
  const { toast } = useToast();

  useEffect(()=>{setActiveSection(routeSection());},[location.pathname]);
  useEffect(() => {
    announceAction(currentLang === 'fr' ? 'Section Santé' : 'Apá Ìlera');
  }, [announceAction, currentLang]);

  const handleSectionSelect = async (section: typeof sections[0]) => {
    tamtamFeedback.play('click');
    await speakCurrentLang(currentLang === 'fr' ? section.labelFr : section.labelBa);
    setActiveSection(section.id);
    navigate('/health/'+(section.id==='first_aid'?'first-aid':section.id));
  };

  const handleBack = () => {
    tamtamFeedback.play('click');
    setActiveSection(null);
    navigate('/health');
  };

  const handleSpeakLabel = async (labelFr: string, labelBa: string, e: React.MouseEvent) => {
    e.stopPropagation();
    tamtamFeedback.play('click');
    await speakCurrentLang(currentLang === 'fr' ? labelFr : labelBa);
  };

  const handleCallEmergency = (contact: typeof emergencyContacts[0]) => {
    tamtamFeedback.play('send');
    toast({
      title: currentLang === 'fr' ? 'Appel en cours...' : 'Pípè...',
      description: `${contact.name}: ${contact.phone}`,
    });
    // In real app, would trigger phone call
    window.open(`tel:${contact.phone}`, '_self');
  };

  const activeSectionData = sections.find(s => s.id === activeSection);

  return (
    <div className="h-full overflow-y-auto bg-[#F7F5EC] text-[#241F2E] px-[18px] pb-28">
      <AnimatePresence mode="wait">
        {!activeSection ? (
          // Main Health Grid
          <motion.div
            key="grid"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="-mx-[18px] mb-4"><FitilaPageHeader title="Santé" subtitle="Santé, prévention et assistance" /></div>

            {/* Emergency Alert Banner */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-3 p-3 bg-[#F4DED2] border border-[#E5B9A6] rounded-[16px] flex items-center gap-3"
            >
              <AlertTriangle className="w-5 h-5 text-[#B54E33] flex-shrink-0" />
              <p className="text-[12px] font-extrabold text-[#B54E33]">
                {currentLang === 'fr'
                  ? 'En cas d\'urgence grave, appelez immédiatement le 112'
                  : 'Tí ó bá jẹ́ pàjáwìrì, pe 112 lẹ́sẹ̀kẹsẹ̀'}
              </p>
            </motion.div>

            <SectionTiles
              items={sections.map((s) => ({
                id: s.id,
                label: currentLang === 'fr' ? s.labelFr : s.labelBa,
                Icon: TILE_ICONS[s.id] ?? Sparkles,
                danger: (s as { isEmergency?: boolean }).isEmergency,
                onClick: () => handleSectionSelect(s),
                onSpeak: (e) => handleSpeakLabel(s.labelFr, s.labelBa, e),
              }))}
            />
          </motion.div>
        ) : (
          // Active section view
          <motion.div
            key="section"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="h-full flex flex-col"
          >
            {/* Header with back button */}
            <div className="flex items-center gap-4 mb-4">
              <button
                onClick={handleBack}
                aria-label="Retour"
                className="w-[42px] h-[42px] bg-white border border-[#E4DFCC] rounded-full flex items-center justify-center"
                >
                  <ArrowLeft className="w-5 h-5 text-[#241F2E]" />
                </button>
              <div className={`w-[42px] h-[42px] bg-[#F3E3B9] rounded-[14px] flex items-center justify-center`}>
                <span className="text-[20px]">{activeSectionData?.icon}</span>
              </div>
              <span className="text-[17px] font-extrabold text-[#241F2E]">
                {currentLang === 'fr' ? activeSectionData?.labelFr : activeSectionData?.labelBa}
              </span>
            </div>

            {/* Emergency section special UI */}
            {activeSectionData?.isEmergency ? (
              <div className="space-y-4">
                <div className="p-4 bg-red-50 rounded-xl border border-red-200">
                  <h3 className="font-bold text-red-700 mb-3 flex items-center gap-2">
                    <Phone className="w-5 h-5" />
                    {currentLang === 'fr' ? 'Numéros d\'urgence' : 'Àwọn nọ́mbà pàjáwìrì'}
                  </h3>
                  <div className="space-y-3">
                    {emergencyContacts.map((contact) => (
                      <motion.button
                        key={contact.phone}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleCallEmergency(contact)}
                        className="w-full p-4 bg-white rounded-xl shadow-sm flex items-center gap-4 hover:bg-red-50 transition-colors"
                      >
                        <span className="text-3xl">{contact.icon}</span>
                        <div className="flex-1 text-left">
                          <p className="font-medium text-tamtam-text">{contact.name}</p>
                          <p className="text-lg font-bold text-red-600">{contact.phone}</p>
                        </div>
                        <Phone className="w-6 h-6 text-green-500" />
                      </motion.button>
                    ))}
                  </div>
                </div>

                {/* Emergency chatbot for describing situation */}
                <div className="bg-white rounded-xl p-4 shadow-tamtam-soft">
                  <h4 className="font-medium text-tamtam-text mb-3 text-sm">
                    {currentLang === 'fr' 
                      ? 'Décrivez votre situation pour des conseils rapides' 
                      : 'Ṣàlàyé ipò rẹ fún ìmọ̀ràn kíákíá'}
                  </h4>
                  <DomainChatbot
                    context="health_emergency"
                    icon="🚑"
                    color="bg-red-500"
                    welcomeMessageFr="Décrivez l'urgence"
                    welcomeMessageBa="Ṣàlàyé pàjáwìrì"
                  />
                </div>
              </div>
            ) : (
              // Regular section with AI chatbot
              <div className="flex-1 bg-white rounded-xl p-4 shadow-tamtam-soft">
                <DomainChatbot
                  context={activeSectionData?.context || 'health'}
                  icon={activeSectionData?.icon || '🏥'}
                  color={activeSectionData?.color || 'bg-green-500'}
                  welcomeMessageFr={activeSectionData?.welcomeFr}
                  welcomeMessageBa={activeSectionData?.welcomeBa}
                  showProcessingPipeline={true}
                />
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
