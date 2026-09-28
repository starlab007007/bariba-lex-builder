import { NavLink, Outlet, useNavigate, Navigate } from 'react-router-dom';
import { useTeacherRole } from '@/hooks/useTeacherRole';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, Lock, Users, ClipboardCheck, BarChart3, Home, ArrowLeft, BookOpen, Scale, FileBarChart, Mic } from 'lucide-react';

export default function TeacherLayout() {
  const { isTeacher, loading } = useTeacherRole();
  const { user } = useAuth();
  const navigate = useNavigate();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-[#F7F5EC]"><Loader2 className="w-8 h-8 animate-spin text-[#C99530]" /></div>;
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (!isTeacher) {
    return (
      <div className="min-h-screen flex flex-col bg-[#F7F5EC] text-[#241F2E]">
        <div className="flex items-center gap-3 px-[14px] pt-[14px]">
          <button onClick={() => navigate('/')} aria-label="Retour" className="flex h-12 w-12 items-center justify-center rounded-full border border-[#E4DFCC] bg-white"><ArrowLeft className="h-5 w-5" /></button>
          <div>
            <h1 className="text-[17px] font-extrabold leading-tight">Espace Enseignant</h1>
            <p className="text-[11px] leading-tight text-[#8C8571]">Accès réservé</p>
          </div>
        </div>
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
    <div className="min-h-screen bg-[#F7F5EC] text-[#241F2E]">
      <header className="sticky top-0 z-10 bg-[#F7F5EC]/95 backdrop-blur border-b border-[#E4DFCC]">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate('/')} className="w-[42px] h-[42px] rounded-full bg-white border border-[#E4DFCC] flex items-center justify-center">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-[17px] font-extrabold leading-tight">Espace Enseignant</h1>
            <p className="text-[11px] leading-tight text-[#8C8571]">Suivi des apprenants — Module Classe</p>
          </div>
        </div>
        <nav className="max-w-6xl mx-auto px-2 flex gap-1 overflow-x-auto pb-2">
          {links.map(l => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className={({ isActive }) =>
                `flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-colors ${
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
      <main className="max-w-6xl mx-auto p-4 md:p-6">
        <Outlet />
      </main>
    </div>
  );
}
