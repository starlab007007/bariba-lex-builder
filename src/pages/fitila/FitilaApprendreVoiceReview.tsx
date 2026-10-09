import { ArrowLeft, Loader2, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useApVoiceAccess } from '@/hooks/useApVoiceAccess';
import { ApprendreVoiceReviewPanel } from '@/components/admin/apprendre-voice/ApprendreVoiceAdmin';
import { AP_COLORS } from '@/components/apprendre/apColors';

export default function FitilaApprendreVoiceReview() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const access = useApVoiceAccess();

  if (access.loading) {
    return <div className="flex h-full items-center justify-center" style={{ background: AP_COLORS.ivory }}><Loader2 className="h-8 w-8 animate-spin" style={{ color: AP_COLORS.goldDeep }} /></div>;
  }

  if (!user || !access.reviewer) {
    return (
      <div className="flex h-full items-center justify-center px-6" style={{ background: AP_COLORS.ivory, color: AP_COLORS.ink }}>
        <div className="max-w-md text-center">
          <ShieldCheck className="mx-auto h-10 w-10" style={{ color: AP_COLORS.clay }} />
          <h1 className="mt-3 text-xl font-black">Rôle Validateur voix requis</h1>
          <p className="mt-2 text-sm" style={{ color: AP_COLORS.muted }}>Seuls les validateurs voix et les administrateurs peuvent contrôler les lectures soumises.</p>
          <button onClick={() => navigate('/learn')} className="mt-5 rounded-full border px-6 py-3 font-bold" style={{ borderColor: AP_COLORS.line }}>Retour à Apprendre</button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto" style={{ background: AP_COLORS.ivory, color: AP_COLORS.ink }}>
      <header className="sticky top-0 z-10 border-b px-4 py-3" style={{ borderColor: AP_COLORS.line, background: 'rgba(247,245,236,.96)', backdropFilter: 'blur(12px)' }}>
        <div className="mx-auto flex max-w-5xl items-center gap-3">
          <button onClick={() => navigate('/learn')} className="flex h-11 w-11 items-center justify-center rounded-full border" style={{ borderColor: AP_COLORS.line, background: AP_COLORS.surface }}><ArrowLeft className="h-5 w-5" /></button>
          <div><h1 className="font-black">Validation des voix</h1><p className="text-xs" style={{ color: AP_COLORS.muted }}>Écouter · contrôler · approuver ou demander une reprise</p></div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-5 pb-12">
        <ApprendreVoiceReviewPanel />
        <div className="mt-5 rounded-2xl border p-4 text-sm" style={{ borderColor: AP_COLORS.line, background: AP_COLORS.surface }}>
          <strong>Après approbation :</strong> l’administration publie la prise dans « Gestion des audios → Publication ». Elle devient alors audible dans Apprendre.
        </div>
      </main>
    </div>
  );
}
