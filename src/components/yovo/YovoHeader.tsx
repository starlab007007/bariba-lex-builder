import { Bell, Search, Mic } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

const pageTitles: Record<string, string> = {
  '/yovo/feed': 'Fil d\'actualité',
  '/yovo/discover': 'Découvrir',
  '/yovo/live': 'Live Audio',
  '/yovo/messages': 'Messages',
  '/yovo/profile': 'Profil',
  '/yovo/translator': 'Traducteur',
  '/yovo/health': 'IA Santé',
  '/yovo/jobs': 'Emploi Audio',
  '/yovo/marketplace': 'Marketplace',
  '/yovo/business': 'IA Business',
  '/yovo/finance': 'IA Finance',
  '/yovo/agritech': 'Agritech',
  '/yovo/library': 'Bibliothèque',
  '/yovo/groups': 'Groupes',
  '/yovo/sos': 'SOS Urgences',
  '/yovo/documents': 'Documents',
  '/yovo/settings': 'Paramètres',
  '/yovo/record': 'Enregistrer',
};

export function YovoHeader() {
  const location = useLocation();
  const title = pageTitles[location.pathname] || 'YOVO';

  return (
    <motion.header
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className="fixed top-0 left-0 right-0 z-50 bg-slate-950/80 backdrop-blur-xl border-b border-white/5"
    >
      <div className="flex items-center justify-between px-4 h-16">
        <Link to="/yovo/feed" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-pink-600 rounded-lg flex items-center justify-center">
            <Mic className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-lg bg-gradient-to-r from-orange-400 to-pink-500 bg-clip-text text-transparent">
            {title}
          </span>
        </Link>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white hover:bg-white/10">
            <Search className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white hover:bg-white/10 relative">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-orange-500 rounded-full" />
          </Button>
        </div>
      </div>
    </motion.header>
  );
}
