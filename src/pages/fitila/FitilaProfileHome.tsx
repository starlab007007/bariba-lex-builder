import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight, BookOpen, ClipboardCheck, FilePenLine, Loader2, LogOut,
  Mic2, School, ShieldCheck, UserRound,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useFitilaRoles, type FitilaRole } from '@/hooks/useFitilaRoles';

type ProfileLite = {
  display_name: string | null;
  avatar_url: string | null;
  phone_number: string | null;
  location: string | null;
};

type Capability = {
  role: FitilaRole | 'learner';
  label: string;
  action: string;
  path: string;
  icon: typeof BookOpen;
  priority: number;
};

const roleLabels: Record<FitilaRole, string> = {
  user: 'Utilisateur',
  editor: 'Éditeur',
  teacher: 'Enseignant',
  voice_speaker: 'Locuteur',
  voice_reviewer: 'Validateur',
  admin: 'Admin',
};

function capabilitiesFor(access: ReturnType<typeof useFitilaRoles>): Capability[] {
  const out: Capability[] = [];
  if (access.speaker) out.push({ role: 'voice_speaker', label: 'Locuteur', action: 'Enregistrer', path: '/learn/voice-studio', icon: Mic2, priority: 10 });
  if (access.reviewer) out.push({ role: 'voice_reviewer', label: 'Validateur', action: 'Valider', path: '/learn/voice-review', icon: ClipboardCheck, priority: 20 });
  if (access.teacher) out.push({ role: 'teacher', label: 'Enseignant', action: 'Enseigner', path: '/teacher', icon: School, priority: 30 });
  if (access.editor) out.push({ role: 'editor', label: 'Éditeur', action: 'Éditer', path: '/espace', icon: FilePenLine, priority: 40 });
  if (access.admin) out.push({ role: 'admin', label: 'Admin', action: 'Administrer', path: '/admin', icon: ShieldCheck, priority: 50 });
  out.push({ role: 'learner', label: 'Apprendre', action: 'Continuer', path: '/learn', icon: BookOpen, priority: 100 });
  return out.sort((a, b) => a.priority - b.priority);
}

export default function FitilaProfileHome() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const access = useFitilaRoles();
  const [profile, setProfile] = useState<ProfileLite | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    if (!user) return;
    void supabase
      .from('profiles')
      .select('display_name, avatar_url, phone_number, location')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) {
          setProfile((data as ProfileLite | null) ?? null);
          setProfileLoading(false);
        }
      });
    return () => { cancelled = true; };
  }, [user]);

  const capabilities = useMemo(() => capabilitiesFor(access), [access]);
  const roles = useMemo(() => {
    const order: FitilaRole[] = ['voice_speaker', 'voice_reviewer', 'teacher', 'editor', 'admin', 'user'];
    return [...access.roles].sort((a, b) => order.indexOf(a) - order.indexOf(b));
  }, [access.roles]);

  const displayName =
    profile?.display_name?.trim() ||
    user?.user_metadata?.display_name ||
    user?.email?.split('@')[0] ||
    'Utilisateur';

  const contact = profile?.phone_number?.trim() || user?.phone || user?.email || '';
  const initials = displayName.split(/\s+/).filter(Boolean).slice(0, 2).map(p => p[0]?.toUpperCase()).join('');

  if (access.loading || profileLoading) {
    return <div className="min-h-[60vh] grid place-items-center bg-[#F7F5EC]"><Loader2 className="h-7 w-7 animate-spin text-[#9C6B1D]" /></div>;
  }

  const primary = capabilities[0];
  const PrimaryIcon = primary?.icon ?? BookOpen;

  return (
    <div className="min-h-full bg-[#F7F5EC] text-[#241F2E]">
      <div className="mx-auto w-full max-w-2xl px-3 pb-24 pt-3 sm:px-5">
        <section className="rounded-[22px] border border-[#E4DFCC] bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-full bg-[#F3E3B9] text-lg font-black text-[#9C6B1D]">
              {profile?.avatar_url ? <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" /> : initials || <UserRound className="h-6 w-6" />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#9C6B1D]">Profil</p>
              <h1 className="truncate text-xl font-black">{displayName}</h1>
              {contact && <p className="truncate text-xs text-[#706A5D]">{contact}</p>}
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {roles.map(role => (
              <span key={role} className="rounded-full border border-[#E4DFCC] bg-[#FBF8EF] px-2.5 py-1 text-[11px] font-bold">
                {roleLabels[role]}
              </span>
            ))}
          </div>
        </section>

        {primary && primary.role !== 'learner' && (
          <button
            type="button"
            onClick={() => navigate(primary.path)}
            className="mt-3 flex w-full items-center gap-3 rounded-[20px] bg-[#241F2E] p-4 text-left text-white shadow-md active:scale-[0.99]"
          >
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#E0A03C] text-[#241F2E]">
              <PrimaryIcon className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-black uppercase tracking-wider text-[#F3E3B9]">Accès rapide</p>
              <p className="text-base font-black">{primary.action}</p>
            </div>
            <ArrowRight className="h-5 w-5 shrink-0" />
          </button>
        )}

        <section className="mt-5">
          <h2 className="mb-2 text-base font-black">Mes habilitations</h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {capabilities.map(item => {
              const Icon = item.icon;
              return (
                <button
                  type="button"
                  key={item.role}
                  onClick={() => navigate(item.path)}
                  className="flex min-h-[108px] flex-col items-start rounded-[18px] border border-[#E4DFCC] bg-white p-3 text-left shadow-sm active:scale-[0.98]"
                >
                  <div className="grid h-9 w-9 place-items-center rounded-xl bg-[#F3E3B9] text-[#9C6B1D]">
                    <Icon className="h-4 w-4" />
                  </div>
                  <p className="mt-2 text-sm font-black">{item.label}</p>
                  <p className="mt-auto text-xs font-extrabold text-[#9C6B1D]">{item.action}</p>
                </button>
              );
            })}
          </div>
        </section>

        <button
          type="button"
          onClick={async () => { await signOut(); navigate('/auth', { replace: true }); }}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl border border-[#D7D0BC] bg-white px-4 py-3 text-sm font-bold text-[#5E584B]"
        >
          <LogOut className="h-4 w-4" /> Déconnexion
        </button>
      </div>
    </div>
  );
}
