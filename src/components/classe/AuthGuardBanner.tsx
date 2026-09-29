import { useNavigate } from 'react-router-dom';
import { Cloud, CloudOff } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function AuthGuardBanner() {
  const { user } = useAuth();
  const navigate = useNavigate();

  if (user) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#DCEAE0] border border-[#3F6E52]/30 text-[#3F6E52] text-xs">
        <Cloud className="w-4 h-4" />
        <span className="font-semibold">Synchronisé</span>
        <span className="text-[#3F6E52]/80">— vos réponses et notes sont sauvegardées</span>
      </div>
    );
  }

  return (
    <button
      onClick={() => navigate('/auth')}
      className="w-full flex items-center gap-3 p-3 rounded-[18px] bg-[#FFF9E8] border border-[#C99530] hover:border-[#9C6B1D] transition-colors text-left"
    >
      <div className="w-10 h-10 rounded-[12px] bg-[#F3E3B9] flex items-center justify-center">
        <CloudOff className="w-5 h-5 text-[#9C6B1D]" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[#241F2E] font-extrabold text-sm">Connectez-vous pour sauvegarder</p>
        <p className="text-[#8C8571] text-xs">Sans compte, vos réponses et notes seront perdues.</p>
      </div>
      <span className="px-3 py-1.5 rounded-lg bg-[#C99530] text-[#2B2110] text-xs font-extrabold whitespace-nowrap">Se connecter</span>
    </button>
  );
}
