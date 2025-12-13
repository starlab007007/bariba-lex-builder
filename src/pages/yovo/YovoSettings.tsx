import { motion } from 'framer-motion';
import { 
  Settings, User, Bell, Lock, Palette, Volume2, Globe, Moon, Sun, 
  HelpCircle, LogOut, ChevronRight, Accessibility, Eye, Vibrate 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Link } from 'react-router-dom';

const settingsGroups = [
  {
    title: 'Compte',
    items: [
      { icon: User, label: 'Modifier le profil', path: '/yovo/profile', hasArrow: true },
      { icon: Lock, label: 'Confidentialité', path: '#', hasArrow: true },
      { icon: Bell, label: 'Notifications', path: '#', toggle: true, defaultOn: true },
    ],
  },
  {
    title: 'Préférences',
    items: [
      { icon: Globe, label: 'Langue', value: 'Français', hasArrow: true },
      { icon: Palette, label: 'Thème', value: 'Sombre', hasArrow: true },
      { icon: Volume2, label: 'Sons', toggle: true, defaultOn: true },
    ],
  },
  {
    title: 'Accessibilité',
    items: [
      { icon: Eye, label: 'Taille du texte', value: 'Normal', hasArrow: true },
      { icon: Vibrate, label: 'Vibrations', toggle: true, defaultOn: true },
      { icon: Accessibility, label: 'Lecteur d\'écran', toggle: true, defaultOn: false },
    ],
  },
  {
    title: 'Aide',
    items: [
      { icon: HelpCircle, label: 'Centre d\'aide', path: '#', hasArrow: true },
    ],
  },
];

export default function YovoSettings() {
  return (
    <div className="px-4 py-6 space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-2"
      >
        <div className="w-16 h-16 mx-auto bg-gradient-to-br from-slate-600 to-slate-700 rounded-2xl flex items-center justify-center mb-4">
          <Settings className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-white">Paramètres</h2>
        <p className="text-slate-400">Personnalisez votre expérience</p>
      </motion.div>

      {/* Settings groups */}
      {settingsGroups.map((group, groupIndex) => (
        <motion.div
          key={group.title}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 + groupIndex * 0.05 }}
        >
          <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">
            {group.title}
          </h3>
          <div className="bg-slate-900/50 rounded-xl border border-white/5 divide-y divide-white/5">
            {group.items.map((item, itemIndex) => (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15 + groupIndex * 0.05 + itemIndex * 0.02 }}
              >
                {item.path ? (
                  <Link
                    to={item.path}
                    className="flex items-center justify-between p-4 hover:bg-white/5 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <item.icon className="w-5 h-5 text-slate-400" />
                      <span className="text-white">{item.label}</span>
                    </div>
                    {item.hasArrow && <ChevronRight className="w-5 h-5 text-slate-500" />}
                  </Link>
                ) : (
                  <div className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                      <item.icon className="w-5 h-5 text-slate-400" />
                      <span className="text-white">{item.label}</span>
                    </div>
                    {item.toggle !== undefined ? (
                      <Switch defaultChecked={item.defaultOn} />
                    ) : item.value ? (
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500">{item.value}</span>
                        <ChevronRight className="w-5 h-5 text-slate-500" />
                      </div>
                    ) : item.hasArrow ? (
                      <ChevronRight className="w-5 h-5 text-slate-500" />
                    ) : null}
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </motion.div>
      ))}

      {/* Theme toggle */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="bg-slate-900/50 p-4 rounded-xl border border-white/5"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Moon className="w-5 h-5 text-slate-400" />
            <span className="text-white">Mode sombre</span>
          </div>
          <Switch defaultChecked />
        </div>
      </motion.div>

      {/* Logout */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.35 }}
      >
        <Button
          variant="outline"
          className="w-full border-red-500/30 text-red-400 hover:bg-red-500/10 gap-2"
        >
          <LogOut className="w-5 h-5" />
          Se déconnecter
        </Button>
      </motion.div>

      {/* Version */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="text-center text-slate-600 text-sm"
      >
        YOVO v1.0.0
      </motion.p>
    </div>
  );
}
