import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Volume2, Loader2, Cloud, Droplets, Sun, Thermometer, Phone } from 'lucide-react';
import { SmartChatbot } from '@/components/tamtam/SmartChatbot';
import { useTamTamLanguage } from '@/contexts/TamTamLanguageContext';
import { useAudioDescription } from '@/contexts/AudioDescriptionContext';
import { useBilingualAudio } from '@/hooks/useBilingualAudio';
import FitilaPageHeader from '@/components/fitila/FitilaPageHeader';
import { SectionTiles } from '@/components/fitila/FitilaUi';
import type { LucideIcon } from 'lucide-react';
import { Sprout, PawPrint, Droplet, Headset, Banknote, Sparkles } from 'lucide-react';
import { tamtamFeedback } from '@/utils/tamtamFeedback';
import { useToast } from '@/hooks/use-toast';
const TILE_ICONS: Record<string, LucideIcon> = { weather: Sun, crops: Sprout, livestock: PawPrint, water: Droplet, technician: Headset, prices: Banknote };

const sections = [
  { id: 'weather', icon: '🌧️', color: 'bg-blue-500', bgLight: 'bg-blue-50', labelFr: 'Météo', labelBa: 'Gura wɑɑru' },
  { id: 'crops', icon: '🌱', color: 'bg-green-500', bgLight: 'bg-green-50', labelFr: 'Conseils cultures', labelBa: 'Gberu deburu' },
  { id: 'livestock', icon: '🐄', color: 'bg-amber-500', bgLight: 'bg-amber-50', labelFr: 'Bétail', labelBa: 'Nɑɑnu' },
  { id: 'water', icon: '💧', color: 'bg-cyan-500', bgLight: 'bg-cyan-50', labelFr: 'Eau & Irrigation', labelBa: 'Niru kɑ gberu' },
  { id: 'technician', icon: '📞', color: 'bg-purple-500', bgLight: 'bg-purple-50', labelFr: 'Appeler technicien', labelBa: 'Pè deburu tɔm' },
  { id: 'prices', icon: '💰', color: 'bg-yellow-500', bgLight: 'bg-yellow-50', labelFr: 'Prix du jour', labelBa: 'Gisɔ gobi' },
];

// Mock weather data
const mockWeather = {
  temp: 28,
  humidity: 65,
  condition: 'sunny',
  rainfall: 12,
  forecast: [
    { day: 'Lun', icon: '☀️', rain: 0 },
    { day: 'Mar', icon: '⛅', rain: 20 },
    { day: 'Mer', icon: '🌧️', rain: 80 },
    { day: 'Jeu', icon: '🌧️', rain: 60 },
    { day: 'Ven', icon: '☀️', rain: 10 },
  ]
};

// Mock market prices
const mockPrices = [
  { product: '🌽', nameFr: 'Maïs (sac 100kg)', nameBa: 'Gbɑdoo', price: 15000 },
  { product: '🌾', nameFr: 'Riz (sac 50kg)', nameBa: 'Mɔɔ', price: 22000 },
  { product: '🥜', nameFr: 'Arachide (sac)', nameBa: 'Sɑ̃ɑ', price: 18000 },
  { product: '🫘', nameFr: 'Haricot (sac)', nameBa: 'Sɔɔru', price: 25000 },
];

export default function TamTamAgriculture() {
  const location=useLocation(); const navigate=useNavigate();
  const routeSection=()=>{const s=location.pathname.split('/').filter(Boolean)[1]; return s&&sections.some(x=>x.id===s)?s:null;};
  const [activeSection, setActiveSection] = useState<string | null>(routeSection());
  const { t, currentLang } = useTamTamLanguage();
  const { announceAction } = useAudioDescription();
  const { speakCurrentLang } = useBilingualAudio();
  const { toast } = useToast();

  useEffect(()=>{setActiveSection(routeSection());},[location.pathname]);
  useEffect(() => {
    announceAction(currentLang === 'fr' ? 'Agriculture' : 'Àgbẹ̀');
  }, [announceAction, currentLang]);

  const handleSectionSelect = async (section: typeof sections[0]) => {
    tamtamFeedback.play('click');
    const label = currentLang === 'fr' ? section.labelFr : section.labelBa;
    await speakCurrentLang(label);
    setActiveSection(section.id);
    navigate('/agriculture/'+section.id);
  };

  const handleBack = () => {
    tamtamFeedback.play('click');
    setActiveSection(null);
    navigate('/agriculture');
  };

  const handleSpeakLabel = async (labelFr: string, labelBa: string, e: React.MouseEvent) => {
    e.stopPropagation();
    tamtamFeedback.play('click');
    const text = currentLang === 'fr' ? labelFr : labelBa;
    await speakCurrentLang(text);
  };

  const speakWeather = async () => {
    tamtamFeedback.play('click');
    const weatherText = currentLang === 'fr' 
      ? `Aujourd'hui: ${mockWeather.temp} degrés, humidité ${mockWeather.humidity}%. Prévision de pluie mercredi et jeudi. Bon moment pour semer.`
      : `Gisɔ: gura ${mockWeather.temp}, niru ${mockWeather.humidity}%. Gura kɑ nɑɑ. Wɑɑru nɔɔra gberu yira.`;
    await speakCurrentLang(weatherText);
  };

  const speakPrice = async (nameFr: string, nameBa: string, price: number) => {
    tamtamFeedback.play('click');
    const text = currentLang === 'fr' 
      ? `${nameFr}: ${price.toLocaleString()} francs CFA`
      : `${nameBa}: ${price.toLocaleString()} gobi`;
    await speakCurrentLang(text);
  };

  const callTechnician = async () => {
    tamtamFeedback.play('click');
    const text = currentLang === 'fr' 
      ? "Appel du technicien agricole en cours..."
      : "Na pè deburu tɔm...";
    await speakCurrentLang(text);
    toast({
      title: "📞 Appel en cours",
      description: "Un technicien vous rappellera dans 10 minutes"
    });
  };

  const activeSectionData = sections.find(s => s.id === activeSection);

  return (
    <div className="mx-auto h-full w-full max-w-[1100px] overflow-y-auto bg-[#F7F5EC] text-[#241F2E] px-[18px] pb-28">
      <AnimatePresence mode="wait">
        {!activeSection ? (
          <motion.div
            key="grid"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="-mx-[18px] mb-4"><FitilaPageHeader title="Agriculture" subtitle="Conseils agricoles, météo et prix" /></div>

            {/* Quick weather widget */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white border border-[#E4DFCC] rounded-[18px] p-[16px] mb-[14px] text-[#241F2E] relative"
              onClick={speakWeather}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-80">{currentLang === 'fr' ? "Aujourd'hui" : 'Gisɔ'}</p>
                  <p className="text-3xl font-bold">{mockWeather.temp}°C</p>
                </div>
                <div className="text-5xl">☀️</div>
                <div className="text-right mr-9">
                  <div className="flex items-center gap-1">
                    <Droplets className="w-4 h-4" />
                    <span>{mockWeather.humidity}%</span>
                  </div>
                  <div className="flex items-center gap-1 mt-1">
                    <Cloud className="w-4 h-4" />
                    <span>{mockWeather.rainfall}mm</span>
                  </div>
                </div>
              </div>
              <div className="flex justify-between mt-4 pt-3 border-t border-[#E4DFCC]">
                {mockWeather.forecast.map((day, i) => (
                  <div key={i} className="text-center">
                    <p className="text-xs opacity-70">{day.day}</p>
                    <p className="text-xl">{day.icon}</p>
                    <p className="text-xs">{day.rain}%</p>
                  </div>
                ))}
              </div>
              <button className="absolute top-2 right-2 w-8 h-8 rounded-full bg-[#F1EDDF] text-[#9C6B1D] flex items-center justify-center">
                <Volume2 className="w-4 h-4" />
              </button>
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
          <motion.div
            key="detail"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="h-full flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
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
                {activeSectionData && (currentLang === 'fr' ? activeSectionData.labelFr : activeSectionData.labelBa)}
              </span>
            </div>

            {/* Section-specific content */}
            {activeSection === 'prices' && (
              <div className="space-y-3 mb-6">
                {mockPrices.map((item, i) => (
                  <motion.button
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    onClick={() => speakPrice(item.nameFr, item.nameBa, item.price)}
                    className="w-full bg-tamtam-surface rounded-2xl p-4 flex items-center gap-4 shadow-tamtam-soft"
                  >
                    <span className="text-4xl">{item.product}</span>
                    <div className="flex-1 text-left">
                      <p className="font-medium text-tamtam-text">
                        {currentLang === 'fr' ? item.nameFr : item.nameBa}
                      </p>
                      <p className="text-2xl font-bold text-green-600">{item.price.toLocaleString()} F</p>
                    </div>
                    <Volume2 className="w-5 h-5 text-tamtam-text-muted" />
                  </motion.button>
                ))}
              </div>
            )}

            {activeSection === 'technician' && (
              <div className="text-center py-8">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={callTechnician}
                  className="w-32 h-32 bg-purple-500 rounded-full flex items-center justify-center mx-auto shadow-lg"
                >
                  <Phone className="w-16 h-16 text-white" />
                </motion.button>
                <p className="mt-4 text-lg font-medium text-tamtam-text">
                  {currentLang === 'fr' ? 'Appeler un technicien' : 'Pe onímọ̀'}
                </p>
                <p className="text-tamtam-text-muted mt-2">
                  {currentLang === 'fr' ? 'Disponible 7j/7 de 7h à 18h' : 'Ọjọ́ gbogbo láti 7h sí 18h'}
                </p>
              </div>
            )}

            {/* Smart Chatbot for crops, livestock, water, weather sections */}
            {['crops', 'livestock', 'water', 'weather'].includes(activeSection) && (
              <SmartChatbot
                context="agriculture"
                welcomeMessageFr={`Posez votre question sur ${activeSectionData?.labelFr.toLowerCase()}`}
                welcomeMessageBa={`Bi ìbéèrè rẹ nípa ${activeSectionData?.labelBa}`}
                icon={activeSectionData?.icon || '🌾'}
                color={activeSectionData?.color || 'bg-green-500'}
                className="flex-1"
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
