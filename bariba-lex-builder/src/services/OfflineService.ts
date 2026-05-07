/**
 * Service de détection et gestion de l'état de connectivité
 */

type ConnectivityListener = (isOnline: boolean) => void;

class OfflineService {
  private listeners: Set<ConnectivityListener> = new Set();
  private _isOnline: boolean = navigator.onLine;
  private initialized: boolean = false;

  init(): void {
    if (this.initialized) return;
    
    window.addEventListener('online', this.handleOnline);
    window.addEventListener('offline', this.handleOffline);
    
    // Vérification active de la connectivité
    this.checkConnectivity();
    
    this.initialized = true;
    console.log('[OfflineService] Initialisé, status:', this._isOnline ? 'online' : 'offline');
  }

  private handleOnline = (): void => {
    console.log('[OfflineService] Connexion rétablie');
    this._isOnline = true;
    this.notifyListeners();
  };

  private handleOffline = (): void => {
    console.log('[OfflineService] Connexion perdue');
    this._isOnline = false;
    this.notifyListeners();
  };

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this._isOnline));
  }

  // Vérification active de la connectivité (ping)
  async checkConnectivity(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch('/robots.txt', {
        method: 'HEAD',
        cache: 'no-store',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      // CORRECTION: Une réponse du serveur (même 404) signifie qu'on est EN LIGNE
      // Seule une exception réseau indique une vraie déconnexion
      this._isOnline = true;
      
    } catch {
      // Exception fetch = problème réseau réel, vérifier navigator.onLine
      // Fallback: tenter un ping vers Supabase
      try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        if (supabaseUrl) {
          const supabaseController = new AbortController();
          const supabaseTimeout = setTimeout(() => supabaseController.abort(), 3000);
          
          await fetch(`${supabaseUrl}/rest/v1/`, {
            method: 'HEAD',
            cache: 'no-store',
            signal: supabaseController.signal
          });
          
          clearTimeout(supabaseTimeout);
          this._isOnline = true;
        } else {
          this._isOnline = navigator.onLine;
        }
      } catch {
        this._isOnline = navigator.onLine;
      }
    }
    
    return this._isOnline;
  }

  get isOnline(): boolean {
    return this._isOnline;
  }

  subscribe(listener: ConnectivityListener): () => void {
    this.listeners.add(listener);
    // Retourner une fonction de désabonnement
    return () => {
      this.listeners.delete(listener);
    };
  }

  destroy(): void {
    window.removeEventListener('online', this.handleOnline);
    window.removeEventListener('offline', this.handleOffline);
    this.listeners.clear();
    this.initialized = false;
  }
}

export const offlineService = new OfflineService();
