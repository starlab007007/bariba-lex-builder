import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Volume2, Phone, AlertTriangle } from 'lucide-react';
import { useTamTamLanguage } from '@/contexts/TamTamLanguageContext';
import { useAudioDescription } from '@/contexts/AudioDescriptionContext';
import { useBilingualAudio } from '@/hooks/useBilingualAudio';
import { tamtamFeedback } from '@/utils/tamtamFeedback';
import { DomainChatbot, DomainContext } from '@/components/tamtam/DomainChatbot';
import { useToast } from '@/hooks/use-toast';

// Health sub-sections configuration
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
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const { currentLang } = useTamTamLanguage();
  const { announceAction } = useAudioDescription();
  const { speakCurrentLang } = useBilingualAudio();
  const { toast } = useToast();

  useEffect(() => {
    announceAction(currentLang === 'fr' ? 'Section Santé' : 'Apá Ìlera');
  }, [announceAction, currentLang]);

  const handleSectionSelect = async (section: typeof sections[0]) => {
    tamtamFeedback.play('click');
    await speakCurrentLang(currentLang === 'fr' ? section.labelFr : section.labelBa);
    setActiveSection(section.id);
  };

  const handleBack = () => {
    tamtamFeedback.play('click');
    setActiveSection(null);
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
    <div className="min-h-screen bg-tamtam-bg px-4 pb-24">
      <AnimatePresence mode="wait">
        {!activeSection ? (
          // Main Health Grid
          <motion.div
            key="grid"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Header */}
            <div className="text-center mb-6">
              <span className="text-5xl">🏥</span>
              <h1 className="text-xl font-bold text-tamtam-text mt-2">
                {currentLang === 'fr' ? 'Santé' : 'Ìlera'}
              </h1>
              <p className="text-sm text-tamtam-text-muted">
                {currentLang === 'fr' 
                  ? 'Conseils et assistance médicale' 
                  : 'Ìmọ̀ràn àti ìrànlọ́wọ́ ìlera'}
              </p>
            </div>

            {/* Emergency Alert Banner */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3"
            >
              <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
              <p className="text-xs text-red-700">
                {currentLang === 'fr'
                  ? 'En cas d\'urgence grave, appelez immédiatement le 112'
                  : 'Tí ó bá jẹ́ pàjáwìrì, pe 112 lẹ́sẹ̀kẹsẹ̀'}
              </p>
            </motion.div>

            {/* Sections grid 2x3 */}
            <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto">
              {sections.map((section, index) => (
                <motion.button
                  key={section.id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.1 }}
                  onClick={() => handleSectionSelect(section)}
                  className={`aspect-square ${section.bgLight} rounded-3xl shadow-tamtam-soft flex flex-col items-center justify-center gap-2 active:scale-95 transition-transform relative ${
                    section.isEmergency ? 'ring-2 ring-red-400 ring-offset-2' : ''
                  }`}
                >
                  <div className={`w-16 h-16 ${section.color} rounded-2xl flex items-center justify-center`}>
                    <span className="text-3xl">{section.icon}</span>
                  </div>
                  <span className="text-xs font-medium text-tamtam-text text-center px-2">
                    {currentLang === 'fr' ? section.labelFr : section.labelBa}
                  </span>
                  
                  {/* Audio button */}
                  <button
                    onClick={(e) => handleSpeakLabel(section.labelFr, section.labelBa, e)}
                    className="absolute top-2 right-2 w-6 h-6 rounded-full bg-white/80 flex items-center justify-center"
                  >
                    <Volume2 className="w-3 h-3 text-tamtam-primary" />
                  </button>

                  {/* Emergency indicator */}
                  {section.isEmergency && (
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full animate-pulse" />
                  )}
                </motion.button>
              ))}
            </div>
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
                className="w-12 h-12 bg-tamtam-surface rounded-2xl flex items-center justify-center shadow-tamtam-soft"
              >
                <ArrowLeft className="w-6 h-6 text-tamtam-text" />
              </button>
              <div className={`w-12 h-12 ${activeSectionData?.color} rounded-2xl flex items-center justify-center`}>
                <span className="text-2xl">{activeSectionData?.icon}</span>
              </div>
              <span className="text-lg font-bold text-tamtam-text">
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
