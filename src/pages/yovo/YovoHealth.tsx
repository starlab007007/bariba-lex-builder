import { motion } from 'framer-motion';
import { Heart, Mic, Phone, Stethoscope, Pill, Activity, AlertCircle, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

const healthTopics = [
  { icon: Stethoscope, title: 'Symptômes', desc: 'Décrivez vos symptômes vocalement', color: 'from-red-500 to-pink-500' },
  { icon: Pill, title: 'Médicaments', desc: 'Informations sur les traitements', color: 'from-blue-500 to-cyan-500' },
  { icon: Activity, title: 'Prévention', desc: 'Conseils santé personnalisés', color: 'from-green-500 to-emerald-500' },
  { icon: MapPin, title: 'Centres de Santé', desc: 'Trouvez les centres proches', color: 'from-purple-500 to-violet-500' },
];

const quickActions = [
  { icon: '🤒', label: 'Fièvre' },
  { icon: '🤕', label: 'Maux de tête' },
  { icon: '🤧', label: 'Rhume' },
  { icon: '🩹', label: 'Blessure' },
  { icon: '💊', label: 'Posologie' },
  { icon: '🏥', label: 'Urgence' },
];

export default function YovoHealth() {
  return (
    <div className="px-4 py-6 space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-2"
      >
        <div className="w-16 h-16 mx-auto bg-gradient-to-br from-red-500 to-pink-500 rounded-2xl flex items-center justify-center mb-4">
          <Heart className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-white">IA Santé Locale</h2>
        <p className="text-slate-400">Assistant santé vocal intelligent</p>
      </motion.div>

      {/* Voice assistant */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="bg-gradient-to-br from-red-500/20 to-pink-500/20 rounded-2xl p-6 border border-red-500/20"
      >
        <p className="text-center text-slate-300 mb-4">Décrivez vos symptômes vocalement</p>
        <div className="flex justify-center">
          <Button
            size="lg"
            className="w-20 h-20 rounded-full bg-gradient-to-br from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 shadow-lg shadow-red-500/30"
          >
            <Mic className="w-8 h-8 text-white" />
          </Button>
        </div>
        <p className="text-center text-xs text-slate-500 mt-4">
          ⚠️ Cet assistant ne remplace pas un avis médical professionnel
        </p>
      </motion.div>

      {/* Quick actions */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <h3 className="text-lg font-semibold text-white mb-3">Actions Rapides</h3>
        <div className="flex flex-wrap gap-2">
          {quickActions.map((action) => (
            <button
              key={action.label}
              className="bg-slate-900/50 px-4 py-2 rounded-full border border-white/10 text-slate-300 hover:bg-slate-800/50 transition-colors flex items-center gap-2"
            >
              <span>{action.icon}</span>
              {action.label}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Topics */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="grid grid-cols-2 gap-3"
      >
        {healthTopics.map((topic, i) => (
          <motion.div
            key={topic.title}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 + i * 0.05 }}
            className="bg-slate-900/50 rounded-xl p-4 border border-white/5 cursor-pointer hover:bg-slate-800/50 transition-colors"
          >
            <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${topic.color} flex items-center justify-center mb-3`}>
              <topic.icon className="w-5 h-5 text-white" />
            </div>
            <p className="text-white font-medium">{topic.title}</p>
            <p className="text-xs text-slate-500 mt-1">{topic.desc}</p>
          </motion.div>
        ))}
      </motion.div>

      {/* Emergency button */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        <Link to="/yovo/sos">
          <Button className="w-full h-14 bg-red-600 hover:bg-red-700 gap-2 text-lg">
            <AlertCircle className="w-6 h-6" />
            SOS Urgence
          </Button>
        </Link>
      </motion.div>
    </div>
  );
}
