import { useEffect, useState } from "react";

/**
 * Suit l'état réseau du navigateur / WebView Capacitor.
 * Retourne `true` si l'appareil est en ligne, `false` sinon.
 */
export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState<boolean>(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );

  useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);

    // Re-check périodique (WebView Android peut rater des évènements)
    const id = window.setInterval(() => {
      setOnline(navigator.onLine);
    }, 5000);

    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
      window.clearInterval(id);
    };
  }, []);

  return online;
}