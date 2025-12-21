import { Outlet } from 'react-router-dom';
import { TamTamNavigation } from '@/components/tamtam/TamTamNavigation';
import { TamTamLanguageProvider } from '@/contexts/TamTamLanguageContext';
import { AudioDescriptionProvider } from '@/contexts/AudioDescriptionContext';
import { TamTamLanguageSelector } from '@/components/tamtam/TamTamLanguageSelector';
import { TamTamAudioToggle } from '@/components/tamtam/TamTamAudioToggle';
import { TamTamNotificationBell } from '@/components/tamtam/TamTamNotificationBell';
import { RaconteMoiAssistant } from '@/components/tamtam/RaconteMoiAssistant';
import { AccessibleVoiceLauncher } from '@/components/voice/AccessibleVoiceLauncher';
import { useExtendedNotifications } from '@/hooks/useExtendedNotifications';

function NotificationProvider({ children }: { children: React.ReactNode }) {
  useExtendedNotifications();
  return <>{children}</>;
}

export default function TamTamApp() {
  return (
    <TamTamLanguageProvider>
      <AudioDescriptionProvider>
        <NotificationProvider>
        <div className="min-h-screen bg-tamtam-bg">
          {/* Header with Language Selector & Audio Toggle */}
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
          
          <main className="pb-28">
            <Outlet />
          </main>
          <TamTamNavigation />
          
          {/* Floating Buttons - Clearly separated: Left (Translator) and Right (Assistant) */}
          <AccessibleVoiceLauncher />
          <RaconteMoiAssistant />
        </div>
        </NotificationProvider>
      </AudioDescriptionProvider>
    </TamTamLanguageProvider>
  );
}
