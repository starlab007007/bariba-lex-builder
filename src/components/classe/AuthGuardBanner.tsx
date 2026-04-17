import { useNavigate } from 'react-router-dom';
import { Cloud, CloudOff } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function AuthGuardBanner() {
  const { user } = useAuth();
  const navigate = useNavigate();

  if (user) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs">
        <Cloud className="w-4 h-4" />
        <span className="font-semibold">Synchronisé</span>
        <span className="text-emerald-600/70">— vos réponses et notes sont sauvegardées</span>
      </div>
    );
  }

  return (
    <button
      onClick={() => navigate('/fitila/auth')}
      className="w-full flex items-center gap-3 p-3 rounded-2xl bg-amber-50 border-2 border-amber-300 hover:border-amber-400 transition-colors text-left"
    >
      <div className="w-10 h-10 rounded-xl bg-amber-200 flex items-center justify-center">
        <CloudOff className="w-5 h-5 text-amber-700" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-amber-900 font-bold text-sm">Connectez-vous pour sauvegarder</p>
        <p className="text-amber-700/80 text-xs">Sans compte, vos réponses et notes seront perdues.</p>
      </div>
      <span className="px-3 py-1.5 rounded-lg bg-amber-500 text-white text-xs font-bold whitespace-nowrap">Se connecter</span>
    </button>
  );
}
