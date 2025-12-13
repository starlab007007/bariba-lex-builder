import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { TamTamNavigation } from '@/components/tamtam/TamTamNavigation';
import { TamTamLanguageProvider } from '@/contexts/TamTamLanguageContext';
import { AudioDescriptionProvider } from '@/contexts/AudioDescriptionContext';
import { TamTamLanguageSelector } from '@/components/tamtam/TamTamLanguageSelector';
import { TamTamAudioToggle } from '@/components/tamtam/TamTamAudioToggle';
import { RaconteMoiAssistant } from '@/components/tamtam/RaconteMoiAssistant';
import { TamTamTutorial } from '@/components/tamtam/TamTamTutorial';

export default function TamTamApp() {
  const location = useLocation();
  const isSplash = location.pathname === '/tamtam' || location.pathname === '/tamtam/';
  
  const [showTutorial, setShowTutorial] = useState(false);
  
  // Check if first visit
  useEffect(() => {
    const hasSeenTutorial = localStorage.getItem('tamtam-tutorial-completed');
    if (!hasSeenTutorial && !isSplash) {
      setShowTutorial(true);
    }
  }, [isSplash]);
  
  const handleTutorialComplete = () => {
    localStorage.setItem('tamtam-tutorial-completed', 'true');
    setShowTutorial(false);
  };

  if (isSplash) {
    return (
      <TamTamLanguageProvider>
        <AudioDescriptionProvider>
          <Outlet />
        </AudioDescriptionProvider>
      </TamTamLanguageProvider>
    );
  }

  return (
    <TamTamLanguageProvider>
      <AudioDescriptionProvider>
        <div className="min-h-screen bg-tamtam-bg">
          {/* Header with Language Selector & Audio Toggle */}
          <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-gray-100 px-4 py-3 flex items-center justify-between">
            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-emerald-500 bg-clip-text text-transparent">
              TAM-TAM
            </h1>
            <div className="flex items-center gap-2">
              <TamTamAudioToggle />
              <TamTamLanguageSelector />
            </div>
          </header>
          
          <main className="pb-28">
            <Outlet />
          </main>
          <TamTamNavigation />
          
          {/* Raconte-Moi AI Voice Assistant */}
          <RaconteMoiAssistant />
          
          {/* Tutorial for new users */}
          <TamTamTutorial 
            isOpen={showTutorial} 
            onClose={() => setShowTutorial(false)}
            onComplete={handleTutorialComplete}
          />
        </div>
      </AudioDescriptionProvider>
    </TamTamLanguageProvider>
  );
}
