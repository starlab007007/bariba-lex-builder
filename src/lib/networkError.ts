import { toast } from "sonner";

/**
 * Identifie une erreur de réseau (fetch failed, offline, timeout).
 */
export function isNetworkError(err: unknown): boolean {
  if (!err) return false;
  if (typeof navigator !== "undefined" && !navigator.onLine) return true;
  const msg =
    err instanceof Error ? err.message : typeof err === "string" ? err : "";
  return /failed to fetch|networkerror|network request failed|load failed|err_internet_disconnected|timeout|aborted/i.test(
    msg
  );
}

/**
 * Affiche un toast d'erreur clair. Si l'erreur est réseau, message dédié.
 */
export function showErrorToast(err: unknown, fallback = "Une erreur est survenue") {
  if (isNetworkError(err)) {
    toast.error("Pas de connexion Internet", {
      description: "Vérifiez votre réseau puis réessayez.",
    });
    return;
  }
  const msg =
    err instanceof Error ? err.message : typeof err === "string" ? err : fallback;
  toast.error(fallback, { description: msg });
}