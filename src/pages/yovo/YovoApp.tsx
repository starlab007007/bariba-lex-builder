import { Outlet, useLocation } from 'react-router-dom';
import { YovoNavigation } from '@/components/yovo/YovoNavigation';
import { YovoHeader } from '@/components/yovo/YovoHeader';

export default function YovoApp() {
  const location = useLocation();
  const isSplash = location.pathname === '/yovo' || location.pathname === '/yovo/';

  if (isSplash) {
    return <Outlet />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950/20 to-slate-950">
      <YovoHeader />
      <main className="pb-24 pt-16">
        <Outlet />
      </main>
      <YovoNavigation />
    </div>
  );
}
