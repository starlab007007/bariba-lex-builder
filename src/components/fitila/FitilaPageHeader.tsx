import { SIG } from './signatureTheme';

/**
 * En-tête standard des écrans Flutter (titre + sous-titre). Le bouton rond flottant
 * du shell (menu) occupe l'emplacement du bouton retour Flutter : le contenu est décalé de 74 px.
 */
export default function FitilaPageHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <header className="flex min-h-[48px] items-center pl-[74px] pr-[18px] pt-[14px]">
      <div className="min-w-0">
        <h1 className="truncate text-[17px] font-extrabold leading-tight" style={{ color: SIG.ink }}>{title}</h1>
        {subtitle && <p className="truncate text-[11px] leading-tight" style={{ color: SIG.muted }}>{subtitle}</p>}
      </div>
    </header>
  );
}
