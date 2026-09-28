import { useNavigate } from 'react-router-dom';
import {
  BookOpen, GraduationCap, HeartPulse, Languages, Siren, Store, Tractor, Wallet,
} from 'lucide-react';
import FitilaPageHeader from '@/components/fitila/FitilaPageHeader';
import { SIG } from '@/components/fitila/signatureTheme';

const SERVICES = [
  { icon: Languages, title: 'Traducteur', subtitle: 'Texte, voix, photo, document et conversation.', route: '/translator' },
  { icon: HeartPulse, title: 'Santé', subtitle: 'Premiers secours, médicaments et contacts utiles.', route: '/health' },
  { icon: GraduationCap, title: 'Éducation', subtitle: 'Cours, exercices, classe et apprentissage.', route: '/education' },
  { icon: Wallet, title: 'Finance', subtitle: 'Ventes, dépenses, tontine, crédit et épargne.', route: '/finance' },
  { icon: Tractor, title: 'Agriculture', subtitle: 'Météo, cultures, élevage, eau et prix.', route: '/agriculture' },
  { icon: BookOpen, title: 'Dictionnaire', subtitle: 'Recherche Bàátɔ̀nú ↔ Français.', route: '/dictionary' },
  { icon: Siren, title: 'Sécurité / SOS', subtitle: 'Alerte, contacts et message vocal.', route: '/sos' },
  { icon: Store, title: 'Marché', subtitle: 'Acheter, vendre, emploi et espace vendeur.', route: '/market' },
] as const;

const STATS = [
  { value: String(SERVICES.length), label: 'Services' },
  { value: '2', label: 'Langues' },
  { value: 'Vocal', label: 'Assistant' },
];

export default function TamTamServices() {
  const navigate = useNavigate();
  return (
    <div className="h-full overflow-y-auto pb-6" style={{ background: SIG.appBackground, color: SIG.ink }}>
      <div>
        <FitilaPageHeader title="Services" subtitle="Services communautaires et outils locaux" />

        <div className="mt-[38px] grid grid-cols-3 gap-[10px] px-[18px]">
          {STATS.map((s) => (
            <div key={s.label} className="flex flex-col items-center rounded-[18px] border bg-white h-[80px] justify-center px-2" style={{ borderColor: SIG.hairline }}>
              <span className="text-[16px] font-extrabold">{s.value}</span>
              <span className="mt-1 text-[11px]" style={{ color: SIG.muted }}>{s.label}</span>
            </div>
          ))}
        </div>

        <div className="mt-[14px] grid grid-cols-2 gap-[10px] px-[18px]">
          {SERVICES.map(({ icon: Icon, title, subtitle, route }) => (
            <button
              key={title}
              type="button"
              onClick={() => navigate(route)}
              className="flex h-[156px] flex-col rounded-[18px] border bg-white p-[12px] text-left transition-transform active:scale-[0.98]"
              style={{ borderColor: SIG.hairline }}
            >
              <span className="flex h-[44px] w-[44px] items-center justify-center rounded-full" style={{ background: SIG.goldTint, color: SIG.goldDeep }}>
                <Icon className="h-[22px] w-[22px]" />
              </span>
              <span className="mt-auto text-[13px] font-extrabold">{title}</span>
              <span className="mt-1 line-clamp-2 text-[10.5px] leading-[1.35]" style={{ color: SIG.muted }}>{subtitle}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
