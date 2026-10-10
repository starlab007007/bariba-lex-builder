import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ClipboardCheck,
  FilePenLine,
  Loader2,
  LogOut,
  Mic2,
  School,
  ShieldCheck,
  Sparkles,
  UserRound,
} from 'lucide-react';

import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

type AppRole =
  | 'admin'
  | 'user'
  | 'editor'
  | 'teacher'
  | 'voice_speaker'
  | 'voice_reviewer';

type ProfileLite = {
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  phone_number: string | null;
  location: string | null;
};

type Capability = {
  role: AppRole | 'learner';
  label: string;
  description: string;
  action: string;
  path: string;
  icon: typeof BookOpen;
  priority: number;
};

const roleLabels: Record<AppRole, string> = {
  user: 'Utilisateur',
  editor: 'Éditeur',
  teacher: 'Enseignant',
  voice_speaker: 'Locuteur',
  voice_reviewer: 'Validateur',
  admin: 'Administrateur',
};

const roleDescriptions: Record<AppRole, string> = {
  user: 'Accès aux parcours d’apprentissage et aux fonctions personnelles.',
  editor: 'Peut contribuer et éditer les contenus autorisés.',
  teacher: 'Peut suivre les apprenants, corriger et gérer les activités de classe.',
  voice_speaker: 'Peut enregistrer les voix humaines de référence.',
  voice_reviewer: 'Peut écouter, contrôler et valider les enregistrements soumis.',
  admin: 'Peut administrer la plateforme et gérer les habilitations.',
};

const capabilitiesFor = (roles: Set<AppRole>): Capability[] => {
  const result: Capability[] = [
    {
      role: 'learner',
      label: 'Apprendre',
      description: 'Continuer mon parcours bàátɔ̀nú ⇄ français.',
      action: 'Continuer à apprendre',
      path: '/learn',
      icon: BookOpen,
      priority: 100,
    },
  ];

  if (roles.has('voice_speaker') || roles.has('admin')) {
    result.push({
      role: 'voice_speaker',
      label: 'Locuteur',
      description: 'Enregistrer les mots, phrases et expressions qui me sont attribués.',
      action: 'Commencer les enregistrements',
      path: '/learn/voice-studio',
      icon: Mic2,
      priority: 10,
    });
  }
  if (roles.has('voice_reviewer') || roles.has('admin')) {
    result.push({
      role: 'voice_reviewer',
      label: 'Validateur',
      description: 'Écouter les prises soumises et décider : valider, reprendre ou rejeter.',
      action: 'Valider les voix',
      path: '/learn/voice-review',
      icon: ClipboardCheck,
      priority: 20,
    });
  }
  if (roles.has('teacher') || roles.has('admin')) {
    result.push({
      role: 'teacher',
      label: 'Enseignant',
      description: 'Suivre les élèves, corriger les travaux et consulter les résultats.',
      action: 'Ouvrir l’espace enseignant',
      path: '/teacher',
      icon: School,
      priority: 30,
    });
  }
  if (roles.has('editor') || roles.has('admin')) {
    result.push({
      role: 'editor',
      label: 'Éditeur',
      description: 'Contribuer aux contenus et documents autorisés.',
      action: 'Ouvrir l’espace de travail',
      path: '/espace',
      icon: FilePenLine,
      priority: 40,
    });
  }
  if (roles.has('admin')) {
    result.push({
      role: 'admin',
      label: 'Administrateur',
      description: 'Gérer les contenus, utilisateurs, rôles et contrôles de la plateforme.',
      action: 'Ouvrir l’administration',
      path: '/admin',
      icon: ShieldCheck,
      priority: 50,
    });
  }
  return result.sort((a, b) => a.priority - b.priority);
};

export default function FitilaProfileHome() {
  const navigate = useNavigate();
  const { user, isAdmin, signOut } = useAuth();
  const [roles, setRoles] = useState<Set<AppRole>>(new Set());
  const [profile, setProfile] = useState<ProfileLite | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!user) return;
      setLoading(true);
      const [rolesResult, profileResult] = await Promise.all([
        supabase.from('user_roles').select('role').eq('user_id', user.id),
        supabase
          .from('profiles')
          .select('display_name, username, avatar_url, phone_number, location')
          .eq('user_id', user.id)
          .maybeSingle(),
      ]);

      if (cancelled) return;

      const nextRoles = new Set<AppRole>(
        (rolesResult.data ?? [])
          .map((row) => row.role as AppRole)
          .filter(Boolean),
      );
      if (isAdmin) nextRoles.add('admin');
      if (nextRoles.size === 0) nextRoles.add('user');

      setRoles(nextRoles);
      setProfile((profileResult.data as ProfileLite | null) ?? null);
      setLoading(false);
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [user, isAdmin]);

  const capabilities = useMemo(() => capabilitiesFor(roles), [roles]);
  const visibleRoles = useMemo(
    () => Array.from(roles).sort((a, b) => {
      const order: AppRole[] = ['voice_speaker', 'voice_reviewer', 'teacher', 'editor', 'admin', 'user'];
      return order.indexOf(a) - order.indexOf(b);
    }),
    [roles],
  );

  const displayName =
    profile?.display_name?.trim() ||
    user?.user_metadata?.display_name ||
    user?.email?.split('@')[0] ||
    'Utilisateur FITILA';

  const contact = profile?.phone_number?.trim() || user?.phone || user?.email || '';
  const initials = displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

  if (loading) {
    return (
      <div className="min-h-[70vh] grid place-items-center bg-[#F7F5EC]">
        <Loader2 className="h-7 w-7 animate-spin text-[#9C6B1D]" />
      </div>
    );
  }

  const primary = capabilities[0];

  return (
    <div className="min-h-full bg-[#F7F5EC] text-[#241F2E]">
      <div className="mx-auto w-full max-w-3xl px-4 pb-28 pt-5 sm:px-6">
        <section className="rounded-[28px] border border-[#E4DFCC] bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-center gap-4">
            <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-full bg-[#F3E3B9] text-xl font-black text-[#9C6B1D]">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
              ) : (
                initials || <UserRound className="h-7 w-7" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#9C6B1D]">Mon profil</p>
              <h1 className="truncate text-2xl font-black">{displayName}</h1>
              {contact && <p className="truncate text-sm text-[#706A5D]">{contact}</p>}
              {profile?.location && <p className="truncate text-xs text-[#8C8571]">{profile.location}</p>}
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {visibleRoles.map((role) => (
              <span
                key={role}
                className="inline-flex items-center gap-1.5 rounded-full border border-[#E4DFCC] bg-[#FBF8EF] px-3 py-1.5 text-xs font-bold"
              >
                <CheckCircle2 className="h-3.5 w-3.5 text-[#3F6E52]" />
                {roleLabels[role]}
              </span>
            ))}
          </div>
        </section>

        {primary && primary.role !== 'learner' && (
          <button
            type="button"
            onClick={() => navigate(primary.path)}
            className="mt-4 flex w-full items-center gap-4 rounded-[24px] bg-[#241F2E] p-5 text-left text-white shadow-lg transition active:scale-[0.99]"
          >
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#E0A03C] text-[#241F2E]">
              <primary.icon className="h-6 w-6" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-[#E0A03C]" />
                <span className="text-xs font-extrabold uppercase tracking-wider text-[#F3E3B9]">Prêt à travailler</span>
              </div>
              <p className="font-black">{primary.action}</p>
              <p className="mt-1 text-sm text-white/65">{primary.description}</p>
            </div>
            <ArrowRight className="h-5 w-5 shrink-0" />
          </button>
        )}

        <section className="mt-6">
          <div className="mb-3">
            <h2 className="text-lg font-black">Mes habilitations</h2>
            <p className="text-sm text-[#706A5D]">Vos droits déterminent les espaces de travail qui apparaissent ici.</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {capabilities.map((item) => (
              <button
                type="button"
                key={item.role}
                onClick={() => navigate(item.path)}
                className="group flex min-h-[154px] flex-col rounded-[22px] border border-[#E4DFCC] bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="mb-3 flex items-center justify-between">
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#F3E3B9] text-[#9C6B1D]">
                    <item.icon className="h-5 w-5" />
                  </div>
                  <ArrowRight className="h-4 w-4 text-[#8C8571] transition group-hover:translate-x-1" />
                </div>
                <p className="font-black">{item.label}</p>
                <p className="mt-1 flex-1 text-sm leading-5 text-[#706A5D]">{item.description}</p>
                <p className="mt-3 text-sm font-extrabold text-[#9C6B1D]">{item.action}</p>
              </button>
            ))}
          </div>
        </section>

        <section className="mt-6 rounded-[22px] border border-[#E4DFCC] bg-white p-4">
          <h2 className="text-sm font-black">Ce que vos rôles permettent</h2>
          <div className="mt-3 space-y-2">
            {visibleRoles.map((role) => (
              <div key={role} className="flex gap-3 rounded-xl bg-[#FBF8EF] px-3 py-2.5">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#3F6E52]" />
                <div>
                  <p className="text-sm font-bold">{roleLabels[role]}</p>
                  <p className="text-xs leading-5 text-[#706A5D]">{roleDescriptions[role]}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <button
          type="button"
          onClick={async () => {
            await signOut();
            navigate('/auth', { replace: true });
          }}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl border border-[#D7D0BC] bg-white px-4 py-3 text-sm font-bold text-[#5E584B]"
        >
          <LogOut className="h-4 w-4" />
          Se déconnecter
        </button>
      </div>
    </div>
  );
}
