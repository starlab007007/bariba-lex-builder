import { motion } from 'framer-motion';
import { Languages, Mic, Volume2, ArrowLeftRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

export default function YovoTranslator() {
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
            <p className="text-lg font-semibold text-white">Français</p>
          </div>
          <Button size="icon" variant="ghost" className="text-orange-400">
            <ArrowLeftRight className="w-5 h-5" />
          </Button>
          <div className="text-center flex-1">
            <p className="text-sm text-slate-500 mb-1">Vers</p>
            <p className="text-lg font-semibold text-white">Bàátɔ̀nú</p>
          </div>
        </div>
      </motion.div>

      {/* Main translation area */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="space-y-4"
      >
        {/* Input */}
        <div className="bg-slate-900/50 rounded-2xl p-6 border border-white/5 min-h-[150px] flex flex-col">
          <p className="text-slate-400 text-sm mb-2">Parlez ou tapez votre texte...</p>
          <div className="flex-1 flex items-center justify-center">
            <Button
              size="lg"
              className="w-20 h-20 rounded-full bg-gradient-to-br from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 shadow-lg shadow-orange-500/30"
            >
              <Mic className="w-8 h-8 text-white" />
            </Button>
          </div>
        </div>

        {/* Output */}
        <div className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 rounded-2xl p-6 border border-blue-500/20 min-h-[150px]">
          <div className="flex items-center justify-between mb-2">
            <p className="text-blue-400 text-sm">Traduction</p>
            <Button size="icon" variant="ghost" className="text-blue-400">
              <Volume2 className="w-5 h-5" />
            </Button>
          </div>
          <p className="text-slate-400 italic">La traduction apparaîtra ici...</p>
        </div>
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
        ].map((feature, i) => (
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
