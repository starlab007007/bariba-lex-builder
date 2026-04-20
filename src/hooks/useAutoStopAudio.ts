import { useEffect, MutableRefObject } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Stoppe automatiquement la lecture d'un <audio> dès que :
 * - l'onglet n'est plus visible (visibilitychange)
 * - la fenêtre perd le focus (blur) ou est masquée (pagehide)
 * - l'utilisateur change de route React Router
 * Annule également toute synthèse vocale Web Speech en cours.
 */
export function useAutoStopAudio(
  audioRef: MutableRefObject<HTMLAudioElement | null>,
  setPlaying: (v: boolean) => void,
) {
  const location = useLocation();

  const stop = () => {
    const el = audioRef.current;
    if (el && !el.paused) {
      try {
        el.pause();
        el.currentTime = 0;
      } catch {}
    }
    try {
      window.speechSynthesis?.cancel();
    } catch {}
    setPlaying(false);
  };

  // Listeners globaux (montés une seule fois)
  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) stop();
    };
    const onHide = () => stop();
    const onBlur = () => stop();

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', onHide);
    window.addEventListener('blur', onBlur);

    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', onHide);
      window.removeEventListener('blur', onBlur);
      // cleanup au démontage du composant
      stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Stop au changement de route
  useEffect(() => {
    stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);
}