/**
 * Hook pour surveiller l'état de connectivité
 */

import { useState, useEffect } from 'react';
import { offlineService } from '@/services/OfflineService';

export interface OfflineStatus {
  isOnline: boolean;
  isChecking: boolean;
  lastChecked: Date | null;
}

export function useOfflineStatus(): OfflineStatus {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  useEffect(() => {
    // Initialiser le service
    offlineService.init();

    // S'abonner aux changements
    const unsubscribe = offlineService.subscribe((online) => {
      setIsOnline(online);
      setLastChecked(new Date());
    });

    // Vérification initiale
    const checkInitial = async () => {
      setIsChecking(true);
      const online = await offlineService.checkConnectivity();
      setIsOnline(online);
      setLastChecked(new Date());
      setIsChecking(false);
    };

    checkInitial();

    // Vérification périodique toutes les 30 secondes
    const interval = setInterval(async () => {
      const online = await offlineService.checkConnectivity();
      setIsOnline(online);
      setLastChecked(new Date());
    }, 30000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  return { isOnline, isChecking, lastChecked };
}
