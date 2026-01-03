import { Outlet, useLocation } from 'react-router-dom';
import { TamTamNavigation } from '@/components/tamtam/TamTamNavigation';
import { TamTamLanguageProvider } from '@/contexts/TamTamLanguageContext';
import { AudioDescriptionProvider } from '@/contexts/AudioDescriptionContext';
import { TamTamLanguageSelector } from '@/components/tamtam/TamTamLanguageSelector';
import { TamTamAudioToggle } from '@/components/tamtam/TamTamAudioToggle';
import { TamTamNotificationBell } from '@/components/tamtam/TamTamNotificationBell';
import { useExtendedNotifications } from '@/hooks/useExtendedNotifications';

function NotificationProvider({ children }: { children: React.ReactNode }) {
  useExtendedNotifications();
  return <>{children}</>;
}

export default function TamTamApp() {
  const location = useLocation();
  
  // Routes qui utilisent le nouveau design fullscreen (sans header)
  const fullscreenRoutes = [
    '/tamtam/social',
    '/tamtam/home',
    '/tamtam/radio'
  ];
  
  // Vérifier si on est sur une route fullscreen
  const isFullscreen = fullscreenRoutes.some(route => 
    location.pathname.includes(route)
  );

  return (
    <TamTamLanguageProvider>
      <AudioDescriptionProvider>
        <NotificationProvider>
          <div 
            className="min-h-screen"
            style={{
              // Fond noir pour les routes fullscreen, sinon fond normal
              background: isFullscreen ? '#0B0B0B' : 'var(--tamtam-bg)'
            }}
          >
            {/* Header - Masqué sur les routes fullscreen */}
            {!isFullscreen && (
              <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-gray-100 px-4 py-3 flex items-center justify-between">
                <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-emerald-500 bg-clip-text text-transparent">
                  TAM-TAM
                </h1>
                <div className="flex items-center gap-2">
                  <TamTamNotificationBell />
                  <TamTamAudioToggle />
                  <TamTamLanguageSelector />
                </div>
              </header>
            )}
            
            {/* Main content */}
            <main className={isFullscreen ? '' : 'pb-28'}>
              <Outlet />
            </main>
            
            {/* Navigation - Masquée sur les routes fullscreen car elles ont leur propre nav */}
            {!isFullscreen && <TamTamNavigation />}
          </div>
        </NotificationProvider>
      </AudioDescriptionProvider>
    </TamTamLanguageProvider>
  );
}
