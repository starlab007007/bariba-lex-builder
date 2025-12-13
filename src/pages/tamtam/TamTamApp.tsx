import { Outlet, useLocation } from 'react-router-dom';
import { TamTamNavigation } from '@/components/tamtam/TamTamNavigation';

export default function TamTamApp() {
  const location = useLocation();
  const isSplash = location.pathname === '/tamtam' || location.pathname === '/tamtam/';

  if (isSplash) {
    return <Outlet />;
  }

  return (
    <div className="min-h-screen bg-tamtam-bg">
      <main className="pb-28 pt-4">
        <Outlet />
      </main>
      <TamTamNavigation />
    </div>
  );
}
