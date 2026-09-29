import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTeacherRole } from '@/hooks/useTeacherRole';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
  requireTeacher?: boolean;
}

export default function ProtectedRoute({ children, requireAdmin = false, requireTeacher = false }: ProtectedRouteProps) {
  const { user, isAdmin, loading } = useAuth();
  const { isTeacher, loading: teacherLoading } = useTeacherRole();
  const location = useLocation();

  if (loading || (requireTeacher && teacherLoading)) {
    return (
      <div className="flex h-full min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    const from = `${location.pathname}${location.search}`;
    const redirect = from && from !== '/auth'
      ? `/auth?redirect=${encodeURIComponent(from)}`
      : '/auth';
    return <Navigate to={redirect} replace />;
  }
  if (requireAdmin && !isAdmin) return <Navigate to="/" replace />;
  if (requireTeacher && !isTeacher) return <Navigate to="/" replace />;

  return <>{children}</>;
}
