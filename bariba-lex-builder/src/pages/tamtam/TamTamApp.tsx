import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useState, createContext, useContext } from 'react';
import { TamTamLanguageProvider } from '@/contexts/TamTamLanguageContext';
import { AudioDescriptionProvider } from '@/contexts/AudioDescriptionContext';
import { KuaishouSideMenu } from '@/components/tamtam/KuaishouSideMenu';
import { AdminFloatingButton } from '@/components/admin/AdminFloatingButton';
import { useTamTamProfile } from '@/hooks/useTamTamProfile';

// ═══════════════════════════════════════════════════════════════════════════════
// 📱 FITILA APP V8 - KUAISHOU DESIGN SYSTEM
// ═══════════════════════════════════════════════════════════════════════════════

interface SideMenuContextType {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

const SideMenuContext = createContext<SideMenuContextType>({
  isOpen: false,
  open: () => {},
  close: () => {},
  toggle: () => {},
});

export const useSideMenu = () => useContext(SideMenuContext);

// ═══════════════════════════════════════════════════════════════════════════════
// COMPOSANT PRINCIPAL AVEC KUAISHOU MENU
// ═══════════════════════════════════════════════════════════════════════════════

function AppContent() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { profile } = useTamTamProfile();

  const menuContext: SideMenuContextType = {
    isOpen: isMenuOpen,
    open: () => setIsMenuOpen(true),
    close: () => setIsMenuOpen(false),
    toggle: () => setIsMenuOpen(prev => !prev),
  };

  return (
    <SideMenuContext.Provider value={menuContext}>
      <div className="min-h-screen bg-[hsl(var(--kuaishou-white))]">
        {/* Kuaishou Side Menu */}
        <KuaishouSideMenu 
          isOpen={isMenuOpen} 
          onClose={() => setIsMenuOpen(false)}
          profile={profile}
        />
        
        {/* Main Content */}
        <main>
          <Outlet />
        </main>
        
        {/* Admin Floating Button */}
        <AdminFloatingButton />
      </div>
    </SideMenuContext.Provider>
  );
}

export default function TamTamApp() {
  return (
    <TamTamLanguageProvider>
      <AudioDescriptionProvider>
        <AppContent />
      </AudioDescriptionProvider>
    </TamTamLanguageProvider>
  );
}
