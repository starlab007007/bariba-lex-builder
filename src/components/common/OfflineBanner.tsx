import { WifiOff, Wifi } from "lucide-react";
import { useEffect, useState } from "react";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

/**
 * Bannière globale "Hors-ligne" affichée en haut de l'écran.
 * - Rouge persistante quand l'appareil est hors-ligne.
 * - Verte temporaire (3s) au retour de la connexion.
 */
export default function OfflineBanner() {
  const online = useOnlineStatus();
  const [showReconnected, setShowReconnected] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    if (!online) {
      setWasOffline(true);
      setShowReconnected(false);
      return;
    }
    if (wasOffline) {
      setShowReconnected(true);
      const t = window.setTimeout(() => setShowReconnected(false), 3000);
      return () => window.clearTimeout(t);
    }
  }, [online, wasOffline]);

  if (online && !showReconnected) return null;

  const isOffline = !online;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed top-0 inset-x-0 z-[9999] flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white shadow-md transition-colors ${
        isOffline ? "bg-red-600" : "bg-emerald-600"
      }`}
      style={{ paddingTop: "max(0.5rem, env(safe-area-inset-top))" }}
    >
      {isOffline ? (
        <>
          <WifiOff className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>Hors-ligne — certaines fonctions sont limitées</span>
        </>
      ) : (
        <>
          <Wifi className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>Connexion rétablie</span>
        </>
      )}
    </div>
  );
}