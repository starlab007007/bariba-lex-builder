import { motion } from 'framer-motion';
import { TrendingUp, Mic, Target, Users, Lightbulb, BarChart3, Wallet, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';

const businessTopics = [
  { icon: Target, title: 'Plan d\'affaires', desc: 'Structurez votre projet', color: 'from-orange-500 to-red-500' },
  { icon: Wallet, title: 'Financement', desc: 'Options de financement', color: 'from-green-500 to-emerald-500' },
  { icon: Users, title: 'Marketing', desc: 'Stratégies de vente', color: 'from-blue-500 to-cyan-500' },
  { icon: BarChart3, title: 'Comptabilité', desc: 'Gestion financière', color: 'from-purple-500 to-violet-500' },
];

const tips = [
  { icon: '💡', title: 'Conseil du jour', content: 'Diversifiez vos sources de revenus pour réduire les risques.' },
  { icon: '📈', title: 'Tendance', content: 'Le commerce en ligne explose en Afrique de l\'Ouest.' },
  { icon: '🎯', title: 'Objectif', content: 'Fixez des objectifs SMART pour votre entreprise.' },
];

export default function YovoBusiness() {
  return (
    <div className="px-4 py-6 space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-2"
      >
        <div className="w-16 h-16 mx-auto bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl flex items-center justify-center mb-4">
          <TrendingUp className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-white">IA Business</h2>
        <p className="text-slate-400">Votre coach entrepreneuriat vocal</p>
      </motion.div>

      {/* Voice assistant */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="bg-gradient-to-br from-orange-500/20 to-red-500/20 rounded-2xl p-6 border border-orange-500/20"
      >
        <p className="text-center text-slate-300 mb-4">Posez vos questions business</p>
        <div className="flex justify-center">
          <Button
            size="lg"
            className="w-20 h-20 rounded-full bg-gradient-to-br from-orange-500 to-red-500 shadow-lg shadow-orange-500/30"
          >
            <Mic className="w-8 h-8 text-white" />
          </Button>
        </div>
      </motion.div>

      {/* Topics */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-2 gap-3"
      >
        {businessTopics.map((topic, i) => (
          <motion.div
            key={topic.title}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 + i * 0.05 }}
            className="bg-slate-900/50 rounded-xl p-4 border border-white/5 cursor-pointer hover:bg-slate-800/50"
          >
            <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${topic.color} flex items-center justify-center mb-3`}>
              <topic.icon className="w-5 h-5 text-white" />
            </div>
            <p className="text-white font-medium">{topic.title}</p>
            <p className="text-xs text-slate-500 mt-1">{topic.desc}</p>
          </motion.div>
        ))}
      </motion.div>

      {/* Tips */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="space-y-3"
      >
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <Lightbulb className="w-5 h-5 text-orange-400" />
          Conseils
        </h3>
        {tips.map((tip, i) => (
          <motion.div
            key={tip.title}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 + i * 0.05 }}
            className="bg-slate-900/50 p-4 rounded-xl border border-white/5"
          >
            <div className="flex items-start gap-3">
              <span className="text-2xl">{tip.icon}</span>
              <div>
                <p className="text-white font-medium">{tip.title}</p>
                <p className="text-sm text-slate-400 mt-1">{tip.content}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
