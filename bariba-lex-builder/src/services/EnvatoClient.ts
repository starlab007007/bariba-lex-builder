/**
 * EnvatoClient - Client API pour Envato Elements
 * Gère l'authentification, la recherche et le téléchargement d'assets
 */

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface EnvatoCredentials {
  email: string;
  password?: string;
  token?: string;
  refreshToken?: string;
}

export interface EnvatoAsset {
  id: string;
  name: string;
  category: string;
  previewUrl?: string;
  downloadUrl?: string;
  author?: string;
  license?: string;
  fileSize?: number;
  format?: string;
}

export interface EnvatoSearchResult {
  items: EnvatoAsset[];
  total: number;
  page: number;
  perPage: number;
  hasMore: boolean;
}

export interface SubscriptionInfo {
  isActive: boolean;
  plan: 'individual' | 'team' | 'enterprise' | 'unknown';
  downloadsRemaining: number | 'unlimited';
  expiresAt?: Date;
}

export interface DownloadOptions {
  quality?: 'original' | 'optimized';
  format?: string;
  onProgress?: (progress: number) => void;
}

export interface EnvatoClientConfig {
  baseUrl?: string;
  timeout?: number;
  retryAttempts?: number;
}

// ============================================================================
// ENVATO CLIENT
// ============================================================================

class EnvatoClient {
  private credentials: EnvatoCredentials | null = null;
  private isAuthenticated: boolean = false;
  private subscriptionInfo: SubscriptionInfo | null = null;
  private config: EnvatoClientConfig;
  private listeners: Set<(isConnected: boolean) => void> = new Set();

  constructor(config: EnvatoClientConfig = {}) {
    this.config = {
      baseUrl: 'https://elements.envato.com',
      timeout: 30000,
      retryAttempts: 3,
      ...config,
    };

    // Charger les credentials depuis localStorage
    this.loadCredentials();
  }

  // ============ CREDENTIAL MANAGEMENT ============

  private loadCredentials(): void {
    try {
      const saved = localStorage.getItem('tamtam-envato-credentials');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.token && parsed.expiresAt && new Date(parsed.expiresAt) > new Date()) {
          this.credentials = parsed;
          this.isAuthenticated = true;
          this.notifyListeners();
        }
      }
    } catch (error) {
      console.error('Failed to load Envato credentials:', error);
    }
  }

  private saveCredentials(): void {
    try {
      if (this.credentials) {
        const toSave = {
          ...this.credentials,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 jours
        };
        localStorage.setItem('tamtam-envato-credentials', JSON.stringify(toSave));
      } else {
        localStorage.removeItem('tamtam-envato-credentials');
      }
    } catch (error) {
      console.error('Failed to save Envato credentials:', error);
    }
  }

  private notifyListeners(): void {
    for (const listener of this.listeners) {
      listener(this.isAuthenticated);
    }
  }

  subscribe(listener: (isConnected: boolean) => void): () => void {
    this.listeners.add(listener);
    listener(this.isAuthenticated);
    return () => this.listeners.delete(listener);
  }

  // ============ AUTHENTICATION ============

  /**
   * Authentification avec email/password
   * Note: Envato n'a pas d'API publique, ceci est une simulation
   */
  async authenticate(email: string, password: string): Promise<boolean> {
    try {
      // Simulation d'authentification
      // En production, cela utiliserait l'API Envato ou un proxy
      await this.simulateNetworkDelay(1500);

      // Validation basique
      if (!email || !password) {
        throw new Error('Email et mot de passe requis');
      }

      // Générer un token simulé
      const token = btoa(`${email}:${Date.now()}`);
      
      this.credentials = {
        email,
        token,
      };
      this.isAuthenticated = true;
      
      // Simuler les infos d'abonnement
      this.subscriptionInfo = {
        isActive: true,
        plan: 'individual',
        downloadsRemaining: 'unlimited',
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      };

      this.saveCredentials();
      this.notifyListeners();

      return true;
    } catch (error) {
      console.error('Authentication failed:', error);
      throw error;
    }
  }

  /**
   * Authentification avec token existant
   */
  async authenticateWithToken(token: string): Promise<boolean> {
    try {
      await this.simulateNetworkDelay(500);

      this.credentials = { email: 'token-auth', token };
      this.isAuthenticated = true;
      
      this.subscriptionInfo = {
        isActive: true,
        plan: 'individual',
        downloadsRemaining: 'unlimited',
      };

      this.saveCredentials();
      this.notifyListeners();

      return true;
    } catch (error) {
      console.error('Token authentication failed:', error);
      throw error;
    }
  }

  /**
   * Déconnexion
   */
  logout(): void {
    this.credentials = null;
    this.isAuthenticated = false;
    this.subscriptionInfo = null;
    this.saveCredentials();
    this.notifyListeners();
  }

  // ============ SEARCH ============

  /**
   * Rechercher des assets sur Envato Elements
   */
  async search(query: string, options?: {
    category?: string;
    page?: number;
    perPage?: number;
  }): Promise<EnvatoSearchResult> {
    if (!this.isAuthenticated) {
      throw new Error('Non authentifié');
    }

    await this.simulateNetworkDelay(800);

    // Simulation de résultats de recherche
    const mockResults: EnvatoAsset[] = [];
    const count = Math.floor(Math.random() * 10) + 5;

    for (let i = 0; i < count; i++) {
      mockResults.push({
        id: `asset-${Date.now()}-${i}`,
        name: `${query} - Asset ${i + 1}`,
        category: options?.category || 'stock-video',
        previewUrl: `https://placeholder.pics/svg/320x180/DEDEDE/555555/${encodeURIComponent(query)}`,
        author: 'Envato Author',
        license: 'Envato Elements',
      });
    }

    return {
      items: mockResults,
      total: count + Math.floor(Math.random() * 100),
      page: options?.page || 1,
      perPage: options?.perPage || 20,
      hasMore: true,
    };
  }

  // ============ DOWNLOAD ============

  /**
   * Télécharger un asset
   */
  async download(
    assetId: string, 
    options?: DownloadOptions
  ): Promise<Blob> {
    if (!this.isAuthenticated) {
      throw new Error('Non authentifié');
    }

    // Simuler le téléchargement avec progression
    const totalSteps = 10;
    for (let step = 0; step < totalSteps; step++) {
      await this.simulateNetworkDelay(200);
      if (options?.onProgress) {
        options.onProgress(((step + 1) / totalSteps) * 100);
      }
    }

    // Retourner un blob vide pour la simulation
    return new Blob(['mock-content'], { type: 'application/octet-stream' });
  }

  /**
   * Télécharger et sauvegarder un asset
   */
  async downloadAndSave(
    assetId: string,
    localPath: string,
    options?: DownloadOptions
  ): Promise<{ success: boolean; path: string; size: number }> {
    const blob = await this.download(assetId, options);

    // En mode browser, on ne peut pas vraiment sauvegarder
    // Cela nécessiterait une Edge Function
    console.log(`[MOCK] Sauvegarde de ${assetId} vers ${localPath}`);

    return {
      success: true,
      path: localPath,
      size: blob.size,
    };
  }

  // ============ SUBSCRIPTION ============

  /**
   * Vérifier le statut de l'abonnement
   */
  async getSubscriptionStatus(): Promise<SubscriptionInfo> {
    if (!this.isAuthenticated) {
      throw new Error('Non authentifié');
    }

    await this.simulateNetworkDelay(500);

    return this.subscriptionInfo || {
      isActive: false,
      plan: 'unknown',
      downloadsRemaining: 0,
    };
  }

  // ============ UTILITIES ============

  private async simulateNetworkDelay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  isConnected(): boolean {
    return this.isAuthenticated;
  }

  getCredentials(): EnvatoCredentials | null {
    return this.credentials ? { ...this.credentials, password: undefined } : null;
  }

  getEmail(): string | null {
    return this.credentials?.email || null;
  }
}

// Singleton instance
export const envatoClient = new EnvatoClient();

// React hook
export function useEnvatoClient() {
  const [isConnected, setIsConnected] = React.useState(envatoClient.isConnected());
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    return envatoClient.subscribe(setIsConnected);
  }, []);

  const authenticate = async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);
    try {
      await envatoClient.authenticate(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de connexion');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    envatoClient.logout();
    setError(null);
  };

  const search = async (query: string, options?: { category?: string }) => {
    setIsLoading(true);
    try {
      return await envatoClient.search(query, options);
    } finally {
      setIsLoading(false);
    }
  };

  const download = async (assetId: string, options?: DownloadOptions) => {
    setIsLoading(true);
    try {
      return await envatoClient.download(assetId, options);
    } finally {
      setIsLoading(false);
    }
  };

  const getSubscriptionStatus = async () => {
    return await envatoClient.getSubscriptionStatus();
  };

  return {
    isConnected,
    isLoading,
    error,
    email: envatoClient.getEmail(),
    authenticate,
    logout,
    search,
    download,
    getSubscriptionStatus,
  };
}

import React from 'react';
