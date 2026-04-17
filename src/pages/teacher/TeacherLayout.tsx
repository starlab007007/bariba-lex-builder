import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useTeacherRole } from '@/hooks/useTeacherRole';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, Users, ClipboardCheck, BarChart3, Home, ArrowLeft, BookOpen } from 'lucide-react';

export default function TeacherLayout() {
  const { isTeacher, loading } = useTeacherRole();
  const { user } = useAuth();
  const navigate = useNavigate();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-amber-500" /></div>;
  }

  if (!user) {
    navigate('/fitila/auth', { replace: true });
    return null;
  }

  if (!isTeacher) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-br from-amber-50 to-orange-50">
        <div className="max-w-md text-center space-y-4">
          <span className="text-6xl">🚫</span>
          <h1 className="text-2xl font-black text-gray-800">Accès réservé aux enseignants</h1>
          <p className="text-gray-600">Contactez un administrateur pour obtenir le rôle <span className="font-bold">Enseignant</span>.</p>
          <button onClick={() => navigate('/fitila')} className="px-6 py-3 rounded-xl bg-amber-500 text-white font-bold">Retour</button>
        </div>
      </div>
    );
  }

  const links = [
    { to: '/fitila/teacher', icon: Home, label: 'Vue d\'ensemble', end: true },
    { to: '/fitila/teacher/students', icon: Users, label: 'Apprenants' },
    { to: '/fitila/teacher/grading', icon: ClipboardCheck, label: 'À corriger' },
    { to: '/fitila/teacher/answer-keys', icon: BookOpen, label: 'Corrigés' },
    { to: '/fitila/teacher/stats', icon: BarChart3, label: 'Statistiques' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <header className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-border">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate('/fitila')} className="w-9 h-9 rounded-full bg-muted flex items-center justify-center">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="font-black text-lg">👨‍🏫 Espace Enseignant</h1>
            <p className="text-xs text-muted-foreground">Suivi des apprenants — Module Classe</p>
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
                  isActive ? 'bg-amber-500 text-white' : 'text-muted-foreground hover:bg-muted'
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
