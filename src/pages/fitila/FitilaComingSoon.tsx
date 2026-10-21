import { Link } from 'react-router-dom';
import { Hourglass } from 'lucide-react';

/** Section pas encore ouverte : message lisible, aucun contenu affiché. */
export default function FitilaComingSoon({ name }: { name: string }) {
  return (
    <section className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center gap-5 px-4 text-center">
      <Hourglass className="h-12 w-12 text-[#9C6B1D]" aria-hidden />
      <h1 className="text-[28px] font-black text-[#17131F]">{name} · bientôt</h1>
      <p className="text-[17px] leading-relaxed text-[#2E2A36]">Cette section arrive très prochainement. En attendant, apprenez, cherchez dans le dictionnaire ou traduisez.</p>
      <Link to="/" className="inline-flex min-h-12 items-center rounded-2xl bg-[#C99530] px-6 text-[17px] font-extrabold text-[#2B2110]">Aller à Apprendre</Link>
    </section>
  );
}
