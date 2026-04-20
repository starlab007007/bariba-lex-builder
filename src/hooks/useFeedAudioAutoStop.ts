import { useEffect, MutableRefObject } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Spécialisé feed (audio + vidéo). Stoppe IMMÉDIATEMENT la lecture sur :
 *  - changement d'onglet / fenêtre minimisée (visibilitychange)
 *  - perte de focus desktop (blur)
 *  - passage en arrière-plan mobile (pagehide)
 *  - changement de route React Router
 *  - événement custom 'feed-scroll-start' (émis par TamTamSocial pendant le scroll)
 *
 * Pas de reprise automatique : l'utilisateur doit ré-appuyer sur ▶️.
 */
export function useFeedAudioAutoStop(
  mediaRef: MutableRefObject<HTMLAudioElement | HTMLVideoElement | null>,
  setPlaying: (v: boolean) => void,
  options: { resetTime?: boolean } = { resetTime: false },
) {
  const location = useLocation();

  useEffect(() => {
    const stop = () => {
      const el = mediaRef.current;
      if (el && !el.paused) {
        try {
          el.pause();
          if (options.resetTime) el.currentTime = 0;
        } catch {}
      }
      try {
        window.speechSynthesis?.cancel();
      } catch {}
      setPlaying(false);
    };

    const onVisibility = () => { if (document.hidden) stop(); };
    const onScrollStart = () => stop();

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', stop);
    window.addEventListener('blur', stop);
    window.addEventListener('feed-scroll-start', onScrollStart);

    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', stop);
      window.removeEventListener('blur', stop);
      window.removeEventListener('feed-scroll-start', onScrollStart);
      stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);
}

export default useFeedAudioAutoStop;