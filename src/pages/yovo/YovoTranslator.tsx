import { useState } from 'react';
import { motion } from 'framer-motion';
import { Languages, ArrowLeftRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Link } from 'react-router-dom';
import { PhraseTranslator } from '@/components/PhraseTranslator';
import AdvancedDictionarySearch from '@/components/AdvancedDictionarySearch';
import { VoiceTab } from '@/components/voice/VoiceTab';

export default function YovoTranslator() {
  const [direction, setDirection] = useState<'fr-bba' | 'bba-fr'>('fr-bba');

  const toggleDirection = () => {
    setDirection(prev => prev === 'fr-bba' ? 'bba-fr' : 'fr-bba');
  };

  return (
    <div className="px-4 py-6 space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-2"
      >
        <div className="w-16 h-16 mx-auto bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center mb-4">
          <Languages className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-white">Traducteur Vocal</h2>
        <p className="text-slate-400">Traduisez en temps réel entre le Français et le Bariba</p>
      </motion.div>

      {/* Language selector */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="bg-slate-900/50 rounded-2xl p-4 border border-white/5"
      >
        <div className="flex items-center justify-between">
          <div className="text-center flex-1">
            <p className="text-sm text-slate-500 mb-1">De</p>
            <p className="text-lg font-semibold text-white">
              {direction === 'fr-bba' ? 'Français' : 'Bàátɔ̀nú'}
            </p>
          </div>
          <Button 
            size="icon" 
            variant="ghost" 
            className="text-orange-400"
            onClick={toggleDirection}
          >
            <ArrowLeftRight className="w-5 h-5" />
          </Button>
          <div className="text-center flex-1">
            <p className="text-sm text-slate-500 mb-1">Vers</p>
            <p className="text-lg font-semibold text-white">
              {direction === 'fr-bba' ? 'Bàátɔ̀nú' : 'Français'}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Tabs for different modes */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <Tabs defaultValue="translator" className="w-full">
          <TabsList className="w-full bg-slate-900/50 border border-white/10">
            <TabsTrigger 
              value="translator" 
              className="flex-1 data-[state=active]:bg-orange-500/20 data-[state=active]:text-orange-400"
            >
              💬 Texte
            </TabsTrigger>
            <TabsTrigger 
              value="voice" 
              className="flex-1 data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-400"
            >
              🎤 Voix
            </TabsTrigger>
            <TabsTrigger 
              value="dictionary" 
              className="flex-1 data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-400"
            >
              📚 Dico
            </TabsTrigger>
          </TabsList>

          <TabsContent value="translator" className="mt-4">
            <div className="bg-slate-900/30 rounded-2xl border border-white/5 p-4">
              <PhraseTranslator />
            </div>
          </TabsContent>

          <TabsContent value="voice" className="mt-4">
            <div className="bg-slate-900/30 rounded-2xl border border-white/5 p-4">
              <VoiceTab />
            </div>
          </TabsContent>

          <TabsContent value="dictionary" className="mt-4">
            <div className="bg-slate-900/30 rounded-2xl border border-white/5 p-4 max-h-[500px] overflow-y-auto">
              <AdvancedDictionarySearch />
            </div>
          </TabsContent>
        </Tabs>
      </motion.div>

      {/* Link to full translator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        <Link to="/">
          <Button
            variant="outline"
            className="w-full border-blue-500/30 text-blue-400 hover:bg-blue-500/10 gap-2"
          >
            <Sparkles className="w-4 h-4" />
            Accéder au traducteur complet Bàátɔ̀nú
          </Button>
        </Link>
      </motion.div>

      {/* Features */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="grid grid-cols-2 gap-3"
      >
        {[
          { icon: '🎤', title: 'Voix vers Texte', desc: 'Parlez naturellement' },
          { icon: '🔊', title: 'Texte vers Voix', desc: 'Écoutez la prononciation' },
          { icon: '⚡', title: 'Temps Réel', desc: 'Traduction instantanée' },
          { icon: '📚', title: '80K+ Phrases', desc: 'Base de données riche' },
        ].map((feature) => (
          <div
            key={feature.title}
            className="bg-slate-900/30 rounded-xl p-4 border border-white/5"
          >
            <span className="text-2xl">{feature.icon}</span>
            <p className="text-white font-medium mt-2">{feature.title}</p>
            <p className="text-xs text-slate-500">{feature.desc}</p>
          </div>
        ))}
      </motion.div>
    </div>
  );
}
