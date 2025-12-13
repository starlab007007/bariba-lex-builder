import { Outlet, useLocation } from 'react-router-dom';
import { TamTamNavigation } from '@/components/tamtam/TamTamNavigation';
import { TamTamLanguageProvider } from '@/contexts/TamTamLanguageContext';
import { TamTamLanguageSelector } from '@/components/tamtam/TamTamLanguageSelector';

export default function TamTamApp() {
  const location = useLocation();
  const isSplash = location.pathname === '/tamtam' || location.pathname === '/tamtam/';

  if (isSplash) {
    return <Outlet />;
  }

  return (
    <TamTamLanguageProvider>
      <div className="min-h-screen bg-tamtam-bg">
        {/* Header with Language Selector */}
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-gray-100 px-4 py-3 flex items-center justify-between">
          <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-emerald-500 bg-clip-text text-transparent">
            TAM-TAM
          </h1>
          <TamTamLanguageSelector />
        </header>
        
        <main className="pb-28">
          <Outlet />
        </main>
        <TamTamNavigation />
      </div>
    </TamTamLanguageProvider>
  );
}
