import { motion } from 'framer-motion';
import { Wallet, Mic, PiggyBank, CreditCard, TrendingUp, Calculator, Send, ArrowDownLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

const financeServices = [
  { icon: PiggyBank, title: 'Épargne', desc: 'Conseils d\'épargne', color: 'from-green-500 to-emerald-500' },
  { icon: Send, title: 'Transferts', desc: 'Envoyer de l\'argent', color: 'from-blue-500 to-cyan-500' },
  { icon: CreditCard, title: 'Crédit', desc: 'Options de prêts', color: 'from-purple-500 to-violet-500' },
  { icon: Calculator, title: 'Budget', desc: 'Gérer vos finances', color: 'from-orange-500 to-red-500' },
];

const quickActions = [
  { icon: '💰', label: 'Solde' },
  { icon: '📊', label: 'Historique' },
  { icon: '💳', label: 'Recharger' },
  { icon: '📱', label: 'Mobile Money' },
];

export default function YovoFinance() {
  return (
    <div className="px-4 py-6 space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-2"
      >
        <div className="w-16 h-16 mx-auto bg-gradient-to-br from-cyan-500 to-blue-500 rounded-2xl flex items-center justify-center mb-4">
          <Wallet className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-white">IA Finance Mobile</h2>
        <p className="text-slate-400">Conseiller financier vocal</p>
      </motion.div>

      {/* Balance card */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-2xl p-6 border border-cyan-500/20"
      >
        <p className="text-slate-400 text-sm">Posez vos questions finances</p>
        <div className="flex justify-center mt-4">
          <Button
            size="lg"
            className="w-20 h-20 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 shadow-lg shadow-cyan-500/30"
          >
            <Mic className="w-8 h-8 text-white" />
          </Button>
        </div>
      </motion.div>

      {/* Quick actions */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.15 }}
        className="flex justify-around"
      >
        {quickActions.map((action) => (
          <button
            key={action.label}
            className="flex flex-col items-center gap-2"
          >
            <div className="w-14 h-14 bg-slate-900/50 rounded-xl border border-white/10 flex items-center justify-center text-2xl">
              {action.icon}
            </div>
            <span className="text-xs text-slate-400">{action.label}</span>
          </button>
        ))}
      </motion.div>

      {/* Services */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-2 gap-3"
      >
        {financeServices.map((service, i) => (
          <motion.div
            key={service.title}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 + i * 0.05 }}
            className="bg-slate-900/50 rounded-xl p-4 border border-white/5 cursor-pointer hover:bg-slate-800/50"
          >
            <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${service.color} flex items-center justify-center mb-3`}>
              <service.icon className="w-5 h-5 text-white" />
            </div>
            <p className="text-white font-medium">{service.title}</p>
            <p className="text-xs text-slate-500 mt-1">{service.desc}</p>
          </motion.div>
        ))}
      </motion.div>

      {/* Recent transactions mock */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-cyan-400" />
          Conseils Récents
        </h3>
        <div className="space-y-3">
          {[
            { icon: '💡', title: 'Économiser 10% de vos revenus', desc: 'Créez un fonds d\'urgence' },
            { icon: '📉', title: 'Réduire les dépenses inutiles', desc: 'Analysez vos habitudes' },
            { icon: '🎯', title: 'Objectif épargne', desc: 'Fixez un objectif mensuel' },
          ].map((tip, i) => (
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
