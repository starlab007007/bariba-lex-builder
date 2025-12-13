import { motion } from 'framer-motion';
import { Leaf, Mic, Sun, CloudRain, Wheat, Bug, Droplets, ThermometerSun } from 'lucide-react';
import { Button } from '@/components/ui/button';

const agriTopics = [
  { icon: Wheat, title: 'Cultures', desc: 'Conseils par culture', color: 'from-yellow-500 to-orange-500' },
  { icon: Bug, title: 'Maladies', desc: 'Identifier et traiter', color: 'from-red-500 to-pink-500' },
  { icon: Droplets, title: 'Irrigation', desc: 'Gestion de l\'eau', color: 'from-blue-500 to-cyan-500' },
  { icon: ThermometerSun, title: 'Météo', desc: 'Prévisions locales', color: 'from-orange-500 to-red-500' },
];

const weatherInfo = {
  temp: '28°C',
  condition: 'Ensoleillé',
  humidity: '65%',
  rain: '10%',
};

const tips = [
  { icon: '🌾', title: 'Maïs', desc: 'Période idéale pour la récolte' },
  { icon: '🍅', title: 'Tomates', desc: 'Attention aux nuisibles en saison' },
  { icon: '🌱', title: 'Semis', desc: 'Préparez les sols maintenant' },
];

export default function YovoAgritech() {
  return (
    <div className="px-4 py-6 space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-2"
      >
        <div className="w-16 h-16 mx-auto bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl flex items-center justify-center mb-4">
          <Leaf className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-white">Conseil Agritech</h2>
        <p className="text-slate-400">Assistant agricole vocal</p>
      </motion.div>

      {/* Weather card */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-2xl p-4 border border-blue-500/20"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Sun className="w-12 h-12 text-yellow-400" />
            <div>
              <p className="text-3xl font-bold text-white">{weatherInfo.temp}</p>
              <p className="text-slate-400">{weatherInfo.condition}</p>
            </div>
          </div>
          <div className="text-right text-sm text-slate-400">
            <p>💧 {weatherInfo.humidity}</p>
            <p>🌧️ {weatherInfo.rain}</p>
          </div>
        </div>
      </motion.div>

      {/* Voice assistant */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.15 }}
        className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-2xl p-6 border border-green-500/20"
      >
        <p className="text-center text-slate-300 mb-4">Posez vos questions agricoles</p>
        <div className="flex justify-center">
          <Button
            size="lg"
            className="w-20 h-20 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 shadow-lg shadow-green-500/30"
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
        {agriTopics.map((topic, i) => (
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
      >
        <h3 className="text-lg font-semibold text-white mb-3">Conseils Saisonniers</h3>
        <div className="space-y-3">
          {tips.map((tip, i) => (
            <div
              key={i}
              className="bg-slate-900/50 p-4 rounded-xl border border-white/5 flex items-center gap-3"
            >
              <span className="text-2xl">{tip.icon}</span>
              <div>
                <p className="text-white font-medium">{tip.title}</p>
                <p className="text-sm text-slate-500">{tip.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
