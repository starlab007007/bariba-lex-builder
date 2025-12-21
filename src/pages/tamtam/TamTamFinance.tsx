import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Volume2, Loader2, TrendingUp, TrendingDown, Plus, Minus } from 'lucide-react';
import { TamTamMicButton } from '@/components/tamtam/TamTamMicButton';
import { useTamTamLanguage } from '@/contexts/TamTamLanguageContext';
import { useAudioDescription } from '@/contexts/AudioDescriptionContext';
import { useBilingualAudio } from '@/hooks/useBilingualAudio';
import { tamtamFeedback } from '@/utils/tamtamFeedback';
import { useToast } from '@/hooks/use-toast';

const sections = [
  { id: 'sales', icon: '💵', color: 'bg-green-500', bgLight: 'bg-green-50', labelFr: 'Mes ventes', labelBa: 'Àwọn títà mi' },
  { id: 'expenses', icon: '📉', color: 'bg-red-500', bgLight: 'bg-red-50', labelFr: 'Mes dépenses', labelBa: 'Àwọn ìnáwó mi' },
  { id: 'tontine', icon: '🤝', color: 'bg-purple-500', bgLight: 'bg-purple-50', labelFr: 'Ma tontine', labelBa: 'Ẹ̀jọ́ mi' },
  { id: 'credit', icon: '🏦', color: 'bg-blue-500', bgLight: 'bg-blue-50', labelFr: 'Crédit', labelBa: 'Àwín' },
  { id: 'savings', icon: '🐷', color: 'bg-pink-500', bgLight: 'bg-pink-50', labelFr: 'Épargne', labelBa: 'Ìfipamọ́' },
  { id: 'mobile', icon: '📱', color: 'bg-yellow-500', bgLight: 'bg-yellow-50', labelFr: 'Mobile Money', labelBa: 'Owó fóònù' },
];

interface Transaction {
  id: string;
  type: 'sale' | 'expense';
  amount: number;
  description: string;
  date: string;
  icon: string;
}

const mockTransactions: Transaction[] = [
  { id: '1', type: 'sale', amount: 45000, description: 'Vente maïs', date: 'Aujourd\'hui', icon: '🌽' },
  { id: '2', type: 'expense', amount: 12000, description: 'Engrais', date: 'Aujourd\'hui', icon: '🌱' },
  { id: '3', type: 'sale', amount: 30000, description: 'Vente tomates', date: 'Hier', icon: '🍅' },
  { id: '4', type: 'expense', amount: 5000, description: 'Semences', date: 'Hier', icon: '🌾' },
  { id: '5', type: 'sale', amount: 80000, description: 'Vente riz', date: 'Lundi', icon: '🍚' },
];

interface TontineMember {
  id: string;
  name: string;
  avatar: string;
  hasPaid: boolean;
  isCurrentTurn: boolean;
}

const mockTontineMembers: TontineMember[] = [
  { id: '1', name: 'Mama Sika', avatar: '👩🏾', hasPaid: true, isCurrentTurn: true },
  { id: '2', name: 'Papa Koffi', avatar: '👨🏾', hasPaid: true, isCurrentTurn: false },
  { id: '3', name: 'Aïcha', avatar: '👧🏾', hasPaid: false, isCurrentTurn: false },
  { id: '4', name: 'Ibrahim', avatar: '👦🏾', hasPaid: true, isCurrentTurn: false },
  { id: '5', name: 'Moi', avatar: '🙋🏾', hasPaid: true, isCurrentTurn: false },
];

export default function TamTamFinance() {
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>(mockTransactions);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const { t, currentLang } = useTamTamLanguage();
  const { announceAction } = useAudioDescription();
  const { speakCurrentLang } = useBilingualAudio();
  const { toast } = useToast();

  const totalSales = transactions.filter(t => t.type === 'sale').reduce((sum, t) => sum + t.amount, 0);
  const totalExpenses = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
  const balance = totalSales - totalExpenses;

  useEffect(() => {
    announceAction(currentLang === 'fr' ? 'Finance' : 'Owó');
  }, [announceAction, currentLang]);

  const handleSectionSelect = async (section: typeof sections[0]) => {
    tamtamFeedback.play('click');
    const label = currentLang === 'fr' ? section.labelFr : section.labelBa;
    await speakCurrentLang(label);
    setActiveSection(section.id);
  };

  const handleBack = () => {
    tamtamFeedback.play('click');
    setActiveSection(null);
  };

  const handleSpeakLabel = async (labelFr: string, labelBa: string, e: React.MouseEvent) => {
    e.stopPropagation();
    tamtamFeedback.play('click');
    const text = currentLang === 'fr' ? labelFr : labelBa;
    await speakCurrentLang(text);
  };

  const speakBalance = async () => {
    tamtamFeedback.play('click');
    const text = currentLang === 'fr'
      ? `Cette semaine: ventes ${totalSales.toLocaleString()} francs, dépenses ${totalExpenses.toLocaleString()} francs. Balance: ${balance.toLocaleString()} francs.`
      : `Ọ̀sẹ̀ yìí: títà ${totalSales.toLocaleString()} owó, ìnáwó ${totalExpenses.toLocaleString()} owó. Ìyókù: ${balance.toLocaleString()} owó.`;
    await speakCurrentLang(text);
  };

  const speakTransaction = async (trans: Transaction) => {
    tamtamFeedback.play('click');
    const typeWord = trans.type === 'sale' 
      ? (currentLang === 'fr' ? 'Vente' : 'Títà') 
      : (currentLang === 'fr' ? 'Dépense' : 'Ìnáwó');
    const text = `${typeWord}: ${trans.amount.toLocaleString()} ${currentLang === 'fr' ? 'francs' : 'owó'}. ${trans.description}`;
    await speakCurrentLang(text);
  };

  const handleVoiceTransaction = async (result: {
    audioBase64: string;
    transcription?: string;
    translation?: string;
    sourceLang: 'ba' | 'fr';
  }) => {
    if (!result.transcription) {
      toast({ title: "Erreur", description: "Impossible de transcrire", variant: "destructive" });
      return;
    }

    setIsProcessing(true);
    tamtamFeedback.play('send');

    try {
      // Parse the vocal command - simple heuristic
      const text = result.transcription.toLowerCase();
      const isSale = text.includes('vend') || text.includes('vendu') || text.includes('títà');
      const isExpense = text.includes('dépens') || text.includes('acheté') || text.includes('payé') || text.includes('ìnáwó');
      
      // Extract amount (simple regex for numbers)
      const amountMatch = text.match(/(\d+)/);
      const amount = amountMatch ? parseInt(amountMatch[1]) * (text.includes('mille') || text.includes('000') ? 1000 : 1) : 0;

      if (amount > 0 && (isSale || isExpense)) {
        const newTransaction: Transaction = {
          id: Date.now().toString(),
          type: isSale ? 'sale' : 'expense',
          amount,
          description: result.transcription,
          date: 'Maintenant',
          icon: isSale ? '✅' : '💳'
        };

        setTransactions(prev => [newTransaction, ...prev]);
        
        const confirmText = currentLang === 'fr'
          ? `Enregistré: ${isSale ? 'vente' : 'dépense'} de ${amount.toLocaleString()} francs`
          : `Ti gbasilẹ: ${isSale ? 'títà' : 'ìnáwó'} ti ${amount.toLocaleString()} owó`;
        
        await speakCurrentLang(confirmText);
        toast({ title: "✅ Enregistré", description: confirmText });
        tamtamFeedback.play('success');
      } else {
        await speakCurrentLang(
          currentLang === 'fr'
            ? "Dites par exemple: J'ai vendu 50 000 francs de maïs"
            : "Sọ fún àpẹẹrẹ: Mo ti tà àgbàdo 50 000 owó"
        );
      }
    } catch (err: any) {
      console.error('[TamTamFinance] Error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const speakTontineStatus = async () => {
    tamtamFeedback.play('click');
    const currentRecipient = mockTontineMembers.find(m => m.isCurrentTurn);
    const paidCount = mockTontineMembers.filter(m => m.hasPaid).length;
    const text = currentLang === 'fr'
      ? `Tontine: ${paidCount} sur ${mockTontineMembers.length} ont cotisé. C'est le tour de ${currentRecipient?.name}.`
      : `Ẹ̀jọ́: ${paidCount} nínú ${mockTontineMembers.length} ti san. Ó jẹ́ ìpele ${currentRecipient?.name}.`;
    await speakCurrentLang(text);
  };

  const activeSectionData = sections.find(s => s.id === activeSection);

  return (
    <div className="min-h-screen bg-tamtam-bg px-4 pb-32">
      <AnimatePresence mode="wait">
        {!activeSection ? (
          <motion.div
            key="grid"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Header */}
            <div className="text-center mb-6">
              <span className="text-5xl">💰</span>
              <h1 className="text-xl font-bold text-tamtam-text mt-2">
                {currentLang === 'fr' ? 'Finance' : 'Owó'}
              </h1>
            </div>

            {/* Balance card */}
            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={speakBalance}
              className="w-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-3xl p-5 mb-6 text-white text-left relative"
            >
              <p className="text-sm opacity-80">{currentLang === 'fr' ? 'Cette semaine' : 'Ọ̀sẹ̀ yìí'}</p>
              <p className="text-3xl font-bold mt-1">{balance.toLocaleString()} F</p>
              <div className="flex gap-6 mt-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  <span className="text-sm">{totalSales.toLocaleString()} F</span>
                </div>
                <div className="flex items-center gap-2">
                  <TrendingDown className="w-5 h-5" />
                  <span className="text-sm">{totalExpenses.toLocaleString()} F</span>
                </div>
              </div>
              <div className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <Volume2 className="w-4 h-4" />
              </div>
            </motion.button>

            {/* Sections grid */}
            <div className="grid grid-cols-2 gap-4">
              {sections.map((section, index) => (
                <motion.button
                  key={section.id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.1 }}
                  onClick={() => handleSectionSelect(section)}
                  className={`aspect-square ${section.bgLight} rounded-3xl shadow-tamtam-soft flex flex-col items-center justify-center gap-2 active:scale-95 transition-transform relative`}
                >
                  <div className={`w-16 h-16 ${section.color} rounded-2xl flex items-center justify-center`}>
                    <span className="text-3xl">{section.icon}</span>
                  </div>
                  <span className="text-sm font-medium text-tamtam-text text-center px-2">
                    {currentLang === 'fr' ? section.labelFr : section.labelBa}
                  </span>
                  <button
                    onClick={(e) => handleSpeakLabel(section.labelFr, section.labelBa, e)}
                    className="absolute top-2 right-2 w-6 h-6 rounded-full bg-white/80 flex items-center justify-center"
                  >
                    <Volume2 className="w-3 h-3 text-tamtam-primary" />
                  </button>
                </motion.button>
              ))}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="detail"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="h-full"
          >
            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
              <button
                onClick={handleBack}
                className="w-12 h-12 bg-tamtam-surface rounded-2xl flex items-center justify-center shadow-tamtam-soft"
              >
                <ArrowLeft className="w-6 h-6 text-tamtam-text" />
              </button>
              <div className={`w-14 h-14 ${activeSectionData?.color} rounded-2xl flex items-center justify-center`}>
                <span className="text-3xl">{activeSectionData?.icon}</span>
              </div>
              <span className="text-lg font-bold text-tamtam-text">
                {activeSectionData && (currentLang === 'fr' ? activeSectionData.labelFr : activeSectionData.labelBa)}
              </span>
            </div>

            {/* Sales/Expenses list */}
            {(activeSection === 'sales' || activeSection === 'expenses') && (
              <>
                <div className="space-y-3 mb-6">
                  {transactions
                    .filter(t => activeSection === 'sales' ? t.type === 'sale' : t.type === 'expense')
                    .map((trans, i) => (
                      <motion.button
                        key={trans.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        onClick={() => speakTransaction(trans)}
                        className="w-full bg-tamtam-surface rounded-2xl p-4 flex items-center gap-4 shadow-tamtam-soft"
                      >
                        <span className="text-3xl">{trans.icon}</span>
                        <div className="flex-1 text-left">
                          <p className="text-sm text-tamtam-text-muted">{trans.date}</p>
                          <p className="font-medium text-tamtam-text">{trans.description}</p>
                        </div>
                        <div className={`text-xl font-bold ${trans.type === 'sale' ? 'text-green-500' : 'text-red-500'}`}>
                          {trans.type === 'sale' ? '+' : '-'}{trans.amount.toLocaleString()} F
                        </div>
                      </motion.button>
                    ))}
                </div>

                {/* Voice input for new transaction */}
                <div className="text-center">
                  <p className="text-tamtam-text-muted mb-4">
                    {currentLang === 'fr' ? 'Enregistrer vocalement' : 'Gbasilẹ pẹ̀lú ohùn'}
                  </p>
                  <TamTamMicButton
                    size="lg"
                    onRecordingComplete={handleVoiceTransaction}
                    autoTranscribe={true}
                    autoTranslate={true}
                    sourceLang={currentLang}
                    disabled={isProcessing}
                  />
                  {isProcessing && (
                    <div className="flex items-center justify-center gap-2 mt-4">
                      <Loader2 className="w-5 h-5 animate-spin text-tamtam-primary" />
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Tontine section */}
            {activeSection === 'tontine' && (
              <>
                <motion.button
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={speakTontineStatus}
                  className="w-full bg-purple-100 rounded-2xl p-4 mb-6 flex items-center gap-4"
                >
                  <div className="w-16 h-16 bg-purple-500 rounded-full flex items-center justify-center">
                    <span className="text-3xl">🤝</span>
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-sm text-purple-600">
                      {currentLang === 'fr' ? 'Cotisation mensuelle' : 'Ìsanwó oṣù'}
                    </p>
                    <p className="text-2xl font-bold text-purple-700">10 000 F</p>
                  </div>
                  <Volume2 className="w-6 h-6 text-purple-500" />
                </motion.button>

                <h3 className="font-bold text-tamtam-text mb-3">
                  {currentLang === 'fr' ? 'Membres' : 'Àwọn ọmọ ẹgbẹ́'}
                </h3>
                <div className="space-y-3">
                  {mockTontineMembers.map((member, i) => (
                    <motion.div
                      key={member.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className={`bg-tamtam-surface rounded-2xl p-4 flex items-center gap-4 ${
                        member.isCurrentTurn ? 'ring-2 ring-purple-500' : ''
                      }`}
                    >
                      <span className="text-4xl">{member.avatar}</span>
                      <div className="flex-1">
                        <p className="font-medium text-tamtam-text">{member.name}</p>
                        {member.isCurrentTurn && (
                          <p className="text-xs text-purple-600">
                            {currentLang === 'fr' ? '🎉 Bénéficiaire ce mois' : '🎉 Olùgbà oṣù yìí'}
                          </p>
                        )}
                      </div>
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        member.hasPaid ? 'bg-green-100' : 'bg-red-100'
                      }`}>
                        {member.hasPaid ? '✅' : '⏳'}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </>
            )}

            {/* Credit section */}
            {activeSection === 'credit' && (
              <div className="text-center py-8">
                <span className="text-6xl">🏦</span>
                <h3 className="text-xl font-bold text-tamtam-text mt-4">
                  {currentLang === 'fr' ? 'Micro-crédit disponible' : 'Àwín kékeré wà'}
                </h3>
                <p className="text-tamtam-text-muted mt-2">
                  {currentLang === 'fr' ? 'Jusqu\'à 500 000 F à 2% mensuel' : 'Títí dé 500 000 owó ní 2% oṣù'}
                </p>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => speakCurrentLang(currentLang === 'fr' ? 'Demande de crédit enregistrée' : 'Ìbéèrè àwín ti gbasilẹ')}
                  className="mt-6 px-8 py-4 bg-blue-500 text-white rounded-2xl font-medium"
                >
                  {currentLang === 'fr' ? 'Demander un crédit' : 'Béèrè àwín'}
                </motion.button>
              </div>
            )}

            {/* Mobile Money */}
            {activeSection === 'mobile' && (
              <div className="space-y-4">
                {['MTN MoMo', 'Moov Money', 'Celtiis Cash'].map((service, i) => (
                  <motion.button
                    key={service}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    onClick={() => speakCurrentLang(service)}
                    className="w-full bg-tamtam-surface rounded-2xl p-5 flex items-center gap-4 shadow-tamtam-soft"
                  >
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
                      i === 0 ? 'bg-yellow-400' : i === 1 ? 'bg-blue-500' : 'bg-green-500'
                    }`}>
                      <span className="text-2xl">📱</span>
                    </div>
                    <span className="text-lg font-medium text-tamtam-text">{service}</span>
                    <Volume2 className="w-5 h-5 text-tamtam-text-muted ml-auto" />
                  </motion.button>
                ))}
              </div>
            )}

            {/* Savings */}
            {activeSection === 'savings' && (
              <div className="text-center py-8">
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="text-8xl mb-4"
                >
                  🐷
                </motion.div>
                <h3 className="text-xl font-bold text-tamtam-text">
                  {currentLang === 'fr' ? 'Mon épargne' : 'Ìfipamọ́ mi'}
                </h3>
                <p className="text-4xl font-bold text-pink-500 mt-4">125 000 F</p>
                <p className="text-tamtam-text-muted mt-2">
                  {currentLang === 'fr' ? 'Objectif: 500 000 F' : 'Àfojúsùn: 500 000 owó'}
                </p>
                <div className="w-full bg-gray-200 rounded-full h-4 mt-4">
                  <div className="bg-pink-500 h-4 rounded-full" style={{ width: '25%' }} />
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
