import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useCallback } from 'react';
import { useTamTamLanguage } from '@/contexts/TamTamLanguageContext';
import { useUnifiedAudio } from '@/hooks/useUnifiedAudio';
import { triggerFeedback } from '@/utils/tamtamFeedback';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Volume2, Loader2 } from 'lucide-react';
import { useVoiceMenu } from '@/hooks/useVoiceMenu';

const navItems = [
  { icon: '🏠', path: '/tamtam/home', id: 'home', labelKey: 'home' },
  { icon: '💬', path: '/tamtam/social', id: 'social', labelKey: 'social' },
  { icon: '🛒', path: '/tamtam/market', id: 'market', labelKey: 'market' },
  { icon: '👤', path: '/tamtam/profile', id: 'profile', labelKey: 'profile' },
];

export function TamTamNavigation() {
  const location = useLocation();
  const navigate = useNavigate();
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
  const [speakingItemId, setSpeakingItemId] = useState<string | null>(null);
  const { t } = useTamTamLanguage();
  const { speakCurrentLang } = useUnifiedAudio();
  const { user } = useAuth();
  const { speakLabel, handleLongPress, stopSpeaking } = useVoiceMenu();

  // Fetch unread messages count
  useEffect(() => {
    if (!user) return;

    const fetchUnreadCount = async () => {
      const { count, error } = await supabase
        .from('tamtam_messages')
        .select('*', { count: 'exact', head: true })
        .eq('receiver_id', user.id)
        .eq('is_read', false);

      if (!error && count !== null) {
        setUnreadMessagesCount(count);
      }
    };

    fetchUnreadCount();

    // Subscribe to new messages
    const channel = supabase
      .channel('nav-unread-messages')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tamtam_messages',
          filter: `receiver_id=eq.${user.id}`
        },
        () => {
          fetchUnreadCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const isActive = (path: string) => location.pathname === path;

  const handleNavPress = (path: string, labelKey: string) => {
    triggerFeedback('click');
    // Navigate immediately, TTS in background (non-blocking for Safari)
    navigate(path);
    // Fire and forget - don't await
    speakCurrentLang(t(labelKey)).catch(e => {
      console.warn('[TamTamNavigation] TTS failed silently:', e);
    });
  };

  // Speak label for accessibility - only for the clicked item
  const handleSpeakNav = useCallback(async (itemId: string, labelKey: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    
    // If already speaking this item, stop it
    if (speakingItemId === itemId) {
      stopSpeaking();
      setSpeakingItemId(null);
      return;
    }
    
    // Stop any previous speech and start new one
    stopSpeaking();
    setSpeakingItemId(itemId);
    triggerFeedback('click');
    
    try {
      await speakLabel(labelKey);
    } finally {
      setSpeakingItemId(null);
    }
  }, [speakingItemId, speakLabel, stopSpeaking]);

  return (
    <>
      {/* Bottom navigation bar */}
      <motion.nav
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        className="fixed bottom-0 left-0 right-0 bg-tamtam-surface border-t border-gray-100 px-6 py-3 z-40"
      >
        <div className="max-w-md mx-auto flex items-center justify-between">
          {navItems.map((item) => {
            const longPressHandlers = handleLongPress(item.labelKey as any);
            
            return (
              <div key={item.id} className="relative">
                <button
                  onClick={() => handleNavPress(item.path, item.labelKey)}
                  {...longPressHandlers}
                  className={`relative flex flex-col items-center gap-1 w-16 py-1 rounded-2xl transition-all ${
                    isActive(item.path)
                      ? 'bg-tamtam-primary/10'
                      : ''
                  }`}
                >
                  <span className={`text-2xl ${isActive(item.path) ? 'scale-110' : ''}`}>
                    {item.icon}
                  </span>
                  {/* Badge messages non lus pour l'onglet social */}
                  {item.id === 'social' && unreadMessagesCount > 0 && (
                    <AnimatePresence>
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                        className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1"
                      >
                        {unreadMessagesCount > 99 ? '99+' : unreadMessagesCount}
                      </motion.div>
                    </AnimatePresence>
                  )}
                  <span className={`text-xs ${isActive(item.path) ? 'text-tamtam-primary font-medium' : 'text-tamtam-text-muted'}`}>
                    {t(item.labelKey)}
                  </span>
                </button>
                
                {/* Speaker button - only shows spinner for THIS item */}
                <button
                  onClick={(e) => handleSpeakNav(item.id, item.labelKey, e)}
                  className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-tamtam-primary/20 flex items-center justify-center"
                >
                  {speakingItemId === item.id ? (
                    <Loader2 className="w-3 h-3 text-tamtam-primary animate-spin" />
                  ) : (
                    <Volume2 className="w-3 h-3 text-tamtam-primary" />
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </motion.nav>
    </>
  );
}
