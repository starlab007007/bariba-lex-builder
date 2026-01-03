import { Outlet, useLocation } from 'react-router-dom';
import { TamTamNavigation } from '@/components/tamtam/TamTamNavigation';
import { TamTamLanguageProvider } from '@/contexts/TamTamLanguageContext';
import { AudioDescriptionProvider } from '@/contexts/AudioDescriptionContext';
import { TamTamLanguageSelector } from '@/components/tamtam/TamTamLanguageSelector';
import { TamTamAudioToggle } from '@/components/tamtam/TamTamAudioToggle';
import { TamTamNotificationBell } from '@/components/tamtam/TamTamNotificationBell';
import { useExtendedNotifications } from '@/hooks/useExtendedNotifications';

// ═══════════════════════════════════════════════════════════════════════════════
// 📱 TAM-TAM APP - LAYOUT PRINCIPAL V3
// ═══════════════════════════════════════════════════════════════════════════════

function NotificationProvider({ children }: { children: React.ReactNode }) {
  useExtendedNotifications();
  return <>{children}</>;
}

export default function TamTamApp() {
  const location = useLocation();
  
  // Routes fullscreen (UI Kuaishou/TikTok)
  const fullscreenRoutes = ['/tamtam/social', '/tamtam/home', '/tamtam/radio', '/tamtam'];
  
  const isFullscreen = fullscreenRoutes.some(route => {
    if (route === '/tamtam') return location.pathname === '/tamtam' || location.pathname === '/tamtam/';
    return location.pathname.startsWith(route);
  });

  const isDarkMode = isFullscreen;

  return (
    <TamTamLanguageProvider>
      <AudioDescriptionProvider>
        <NotificationProvider>
          <div className="min-h-screen" style={{ background: isDarkMode ? '#0B0B0B' : '#FAFBFF' }}>
            {/* Header classique - Masqué sur fullscreen */}
            {!isFullscreen && (
              <header className="sticky top-0 z-30 backdrop-blur-md border-b px-4 py-3 flex items-center justify-between" style={{ background: 'rgba(255, 255, 255, 0.9)', borderColor: 'rgba(0, 0, 0, 0.08)' }}>
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 via-orange-500 to-red-500 flex items-center justify-center shadow-lg">
                    <span className="text-lg">🥁</span>
                  </div>
                  <h1 className="text-lg font-black bg-gradient-to-r from-amber-600 via-orange-500 to-red-500 bg-clip-text text-transparent">TAM-TAM</h1>
                </div>
                <div className="flex items-center gap-2">
                  <TamTamNotificationBell />
                  <TamTamAudioToggle />
                  <TamTamLanguageSelector />
                </div>
              </header>
            )}
            
            <main className={isFullscreen ? '' : 'pb-24'}><Outlet /></main>
            {!isFullscreen && <TamTamNavigation />}
          </div>
        </NotificationProvider>
      </AudioDescriptionProvider>
    </TamTamLanguageProvider>
  );
}
