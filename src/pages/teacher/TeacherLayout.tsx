import { NavLink, Outlet, Navigate } from 'react-router-dom';
import FitilaPageHeader from '@/components/fitila/FitilaPageHeader';
import { useTeacherRole } from '@/hooks/useTeacherRole';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, Lock, Users, ClipboardCheck, BarChart3, Home, BookOpen, Scale, FileBarChart, Mic } from 'lucide-react';

export default function TeacherLayout() {
  const { isTeacher, loading } = useTeacherRole();
  const { user } = useAuth();

  if (loading) {
    return <div className="flex h-full items-center justify-center bg-[#F7F5EC]"><Loader2 className="w-8 h-8 animate-spin text-[#C99530]" /></div>;
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (!isTeacher) {
    return (
      <div className="flex h-full flex-col bg-[#F7F5EC] text-[#241F2E]">
        <FitilaPageHeader title="Espace Enseignant" subtitle="Accès réservé" />
        <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#F4DED2] text-[#B54E33]"><Lock className="h-7 w-7" /></div>
          <h2 className="mt-4 text-[16px] font-extrabold">Accès réservé aux enseignants</h2>
          <p className="mt-2 max-w-[300px] text-[12.5px] text-[#8C8571]">Contactez un administrateur pour obtenir le rôle <span className="font-bold">Enseignant</span>.</p>
        </div>
      </div>
    );
  }

  const links = [
    { to: '/teacher', icon: Home, label: 'Vue d\'ensemble', end: true },
    { to: '/teacher/students', icon: Users, label: 'Apprenants' },
    { to: '/teacher/grading', icon: ClipboardCheck, label: 'À corriger' },
    { to: '/teacher/answer-keys', icon: BookOpen, label: 'Corrigés' },
    { to: '/teacher/weights', icon: Scale, label: 'Barèmes' },
    { to: '/teacher/grades', icon: FileBarChart, label: 'Relevé classe' },
    { to: '/teacher/voice-reading', icon: Mic, label: 'Lecture vocale' },
    { to: '/teacher/stats', icon: BarChart3, label: 'Statistiques' },
  ];

  return (
    <div className="h-full overflow-y-auto bg-[#F7F5EC] text-[#241F2E]">
      <header className="sticky top-0 z-10 border-b border-[#E4DFCC] bg-[#F7F5EC]/95 backdrop-blur">
        <div className="mx-auto max-w-6xl">
          <FitilaPageHeader title="Espace Enseignant" subtitle="Suivi des apprenants — Module Classe" />
        </div>
        <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-[18px] pb-2 pt-2" aria-label="Espace enseignant">
          {links.map(l => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className={({ isActive }) =>
                `flex items-center gap-2 px-3 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-colors ${
                  isActive ? 'bg-[#C99530] text-[#2B2110]' : 'bg-white border border-[#E4DFCC] text-[#241F2E] hover:bg-[#F1EDDF]'
                }`
              }
            >
              <l.icon className="w-4 h-4" />
              {l.label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-6xl p-4 pb-24 md:p-6">
        <Outlet />
      </main>
    </div>
  );
}
