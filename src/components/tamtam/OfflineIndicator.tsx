/**
 * Indicateur de statut offline et gestion du cache
 */

import React, { useState } from 'react';
import { Wifi, WifiOff, Download, Trash2, HardDrive, Loader2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { useOfflineTranslator } from '@/hooks/useOfflineTranslator';
import { toast } from 'sonner';

export function OfflineIndicator() {
  const {
    isOnline,
    isOfflineReady,
    isLoadingDictionary,
    loadingProgress,
    loadingPhase,
    capabilities,
    cacheStats,
    preloadForOffline,
    clearCache
  } = useOfflineTranslator();

  const [isOpen, setIsOpen] = useState(false);

  const handlePreload = async () => {
    toast.info('Préchargement en cours...');
    await preloadForOffline();
    toast.success('Prêt pour usage hors-ligne!');
  };

  const handleClearCache = async () => {
    await clearCache();
    toast.success('Cache vidé');
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={`gap-2 ${isOnline ? 'text-green-600' : 'text-orange-500'}`}
        >
          {isOnline ? (
            <Wifi className="h-4 w-4" />
          ) : (
            <WifiOff className="h-4 w-4 animate-pulse" />
          )}
          <span className="hidden sm:inline">
            {isOnline ? 'En ligne' : 'Hors ligne'}
          </span>
          {isOfflineReady && (
            <Badge variant="secondary" className="text-xs">
              Offline OK
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      
      <SheetContent>
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <HardDrive className="h-5 w-5" />
            Mode Hors-Ligne
          </SheetTitle>
          <SheetDescription>
            Gérez le cache local pour traduire sans connexion internet.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Statut de connexion */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
            <div className="flex items-center gap-2">
              {isOnline ? (
                <Wifi className="h-5 w-5 text-green-600" />
              ) : (
                <WifiOff className="h-5 w-5 text-orange-500" />
              )}
              <span className="font-medium">
                {isOnline ? 'Connecté' : 'Hors ligne'}
              </span>
            </div>
            {isOfflineReady && (
              <Badge className="bg-green-600">
                <Check className="h-3 w-3 mr-1" />
                Prêt
              </Badge>
            )}
          </div>

          {/* Capacités offline */}
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Capacités hors-ligne</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <CapabilityItem
                label="Traduction texte"
                available={capabilities.textTranslation}
              />
              <CapabilityItem
                label="Dictée français"
                available={capabilities.frenchSTT}
              />
              <CapabilityItem
                label="Lecture français"
                available={capabilities.frenchTTS}
              />
              <CapabilityItem
                label="Dictée bariba"
                available={capabilities.baribaSTT}
              />
              <CapabilityItem
                label="Lecture bariba"
                available={capabilities.baribaTTS}
              />
              <CapabilityItem
                label="OCR / Scan"
                available={capabilities.ocr}
              />
            </div>
          </div>

          {/* Statistiques du cache */}
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Cache local</h4>
            <div className="space-y-1 text-sm text-muted-foreground">
              <div className="flex justify-between">
                <span>Dictionnaire</span>
                <span>{cacheStats.dictionaryEntries.toLocaleString()} entrées</span>
              </div>
              <div className="flex justify-between">
                <span>Audio caché</span>
                <span>{cacheStats.audioCacheEntries} fichiers</span>
              </div>
              <div className="flex justify-between">
                <span>Espace utilisé</span>
                <span>{cacheStats.storageUsedMB.toFixed(1)} MB</span>
              </div>
            </div>
            {cacheStats.storageQuotaMB > 0 && (
              <Progress
                value={(cacheStats.storageUsedMB / cacheStats.storageQuotaMB) * 100}
                className="h-2"
              />
            )}
          </div>

          {/* Progression du chargement */}
          {isLoadingDictionary && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>{loadingPhase}</span>
              </div>
              <Progress value={loadingProgress} className="h-2" />
              <span className="text-xs text-muted-foreground">
                {loadingProgress}%
              </span>
            </div>
          )}

          {/* Actions */}
          <div className="space-y-2">
            <Button
              onClick={handlePreload}
              disabled={isLoadingDictionary || !isOnline}
              className="w-full"
            >
              {isLoadingDictionary ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              {isOfflineReady ? 'Mettre à jour le cache' : 'Préparer pour hors-ligne'}
            </Button>
            
            {isOfflineReady && (
              <Button
                variant="outline"
                onClick={handleClearCache}
                className="w-full text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Vider le cache
              </Button>
            )}
          </div>

          {/* Avertissement */}
          {!isOnline && !isOfflineReady && (
            <div className="p-3 rounded-lg bg-orange-100 dark:bg-orange-900/20 text-orange-800 dark:text-orange-200 text-sm">
              ⚠️ Vous êtes hors ligne et le cache n'est pas prêt. Connectez-vous pour préparer le mode hors-ligne.
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function CapabilityItem({ label, available }: { label: string; available: boolean }) {
  return (
    <div className="flex items-center gap-2 p-2 rounded bg-muted/50">
      <div className={`w-2 h-2 rounded-full ${available ? 'bg-green-500' : 'bg-gray-300'}`} />
      <span className={available ? '' : 'text-muted-foreground'}>{label}</span>
    </div>
  );
}
