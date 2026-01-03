import { Outlet, useLocation } from 'react-router-dom';
import { TamTamNavigation } from '@/components/tamtam/TamTamNavigation';
import { TamTamLanguageProvider } from '@/contexts/TamTamLanguageContext';
import { AudioDescriptionProvider } from '@/contexts/AudioDescriptionContext';
import { TamTamLanguageSelector } from '@/components/tamtam/TamTamLanguageSelector';
import { TamTamAudioToggle } from '@/components/tamtam/TamTamAudioToggle';
import { TamTamNotificationBell } from '@/components/tamtam/TamTamNotificationBell';
import { useExtendedNotifications } from '@/hooks/useExtendedNotifications';

// ═══════════════════════════════════════════════════════════════════════════════
// 📱 TAM-TAM APP - LAYOUT PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════
// Charte Kuaishou DNA:
// - Fond: #0B0B0B (Noir profond)
// - Accent: #FF7A00 (Orange vif)
// - Fullscreen total pour Social/Home/Radio
// ═══════════════════════════════════════════════════════════════════════════════

function NotificationProvider({ children }: { children: React.ReactNode }) {
  useExtendedNotifications();
  return <>{children}</>;
}

export default function TamTamApp() {
  const location = useLocation();
  
  // Routes fullscreen (nouvelle UI Kuaishou/TikTok)
  // Ces routes gèrent leur propre header et navigation
  const fullscreenRoutes = [
    '/tamtam/social',
    '/tamtam/home',
    '/tamtam/radio',
    '/tamtam', // La racine aussi
  ];
  
  // Vérifier si on est sur une route fullscreen
  // Note: on vérifie aussi le path exact pour /tamtam
  const isFullscreen = fullscreenRoutes.some(route => {
    if (route === '/tamtam') {
      return location.pathname === '/tamtam' || location.pathname === '/tamtam/';
    }
    return location.pathname.startsWith(route);
  });

  // Routes qui ont besoin du fond noir
  const darkRoutes = [
    '/tamtam/social',
    '/tamtam/home',
    '/tamtam/radio',
    '/tamtam',
  ];
  
  const isDarkMode = darkRoutes.some(route => {
    if (route === '/tamtam') {
      return location.pathname === '/tamtam' || location.pathname === '/tamtam/';
    }
    return location.pathname.startsWith(route);
  });

  return (
    <TamTamLanguageProvider>
      <AudioDescriptionProvider>
        <NotificationProvider>
          <div 
            className="min-h-screen"
            style={{
              background: isDarkMode ? '#0B0B0B' : '#FAFBFF',
            }}
          >
            {/* Header classique - Masqué sur les routes fullscreen */}
            {!isFullscreen && (
              <header 
                className="sticky top-0 z-30 backdrop-blur-md border-b px-4 py-3 flex items-center justify-between"
                style={{
                  background: 'rgba(255, 255, 255, 0.9)',
                  borderColor: 'rgba(0, 0, 0, 0.08)',
                }}
              >
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 via-orange-500 to-red-500 flex items-center justify-center shadow-lg">
                    <span className="text-lg">🥁</span>
                  </div>
                  <div>
                    <h1 className="text-lg font-black bg-gradient-to-r from-amber-600 via-orange-500 to-red-500 bg-clip-text text-transparent">
                      TAM-TAM
                    </h1>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <TamTamNotificationBell />
                  <TamTamAudioToggle />
                  <TamTamLanguageSelector />
                </div>
              </header>
            )}
            
            {/* Contenu principal */}
            <main className={isFullscreen ? '' : 'pb-24'}>
              <Outlet />
            </main>
            
            {/* Navigation classique - Masquée sur les routes fullscreen */}
            {/* Les routes fullscreen gèrent leur propre BottomNavigation */}
            {!isFullscreen && <TamTamNavigation />}
          </div>
        </NotificationProvider>
      </AudioDescriptionProvider>
    </TamTamLanguageProvider>
  );
}
