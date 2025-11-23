/**
 * Auto-Initializer for Translation Models
 * Automatically initializes SMT and BaatonuAI on app load
 */

import { useEffect, useState } from 'react';
import { smtInitializer } from '@/services/SMTInitializer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Progress } from './ui/progress';
import { CheckCircle, Loader2, XCircle } from 'lucide-react';
import { Badge } from './ui/badge';

export function AutoInitializer() {
  const [status, setStatus] = useState<'initializing' | 'success' | 'error' | 'idle'>('idle');
  const [progress, setProgress] = useState(0);
  const [details, setDetails] = useState<string>('');
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    initializeModels();
  }, []);

  const initializeModels = async () => {
    setStatus('initializing');
    setProgress(10);
    setDetails('Chargement des données de la base...');

    try {
      // Initialize SMT System
      setProgress(30);
      setDetails('Initialisation du moteur SMT...');
      
      const result = await smtInitializer.initialize();
      
      setProgress(90);
      setDetails('Finalisation...');
      
      setStats(result);
      setProgress(100);
      setStatus('success');
      setDetails('Tous les modèles sont prêts');

      // Auto-hide after 3 seconds on success
      setTimeout(() => {
        setStatus('idle');
      }, 3000);
      
    } catch (error) {
      console.error('Initialization error:', error);
      setStatus('error');
      setDetails(error instanceof Error ? error.message : 'Erreur d\'initialisation');
      setProgress(0);
    }
  };

  // Don't show anything if idle
  if (status === 'idle') return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 w-96 animate-in fade-in slide-in-from-bottom-4">
      <Card className="border-2 shadow-lg">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              {status === 'initializing' && <Loader2 className="h-4 w-4 animate-spin" />}
              {status === 'success' && <CheckCircle className="h-4 w-4 text-green-500" />}
              {status === 'error' && <XCircle className="h-4 w-4 text-red-500" />}
              Initialisation des Modèles
            </CardTitle>
            <Badge variant={
              status === 'initializing' ? 'secondary' :
              status === 'success' ? 'default' :
              'destructive'
            }>
              {status === 'initializing' ? 'En cours' :
               status === 'success' ? 'Succès' :
               'Erreur'}
            </Badge>
          </div>
          <CardDescription className="text-xs">{details}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 pb-4">
          <Progress value={progress} className="h-2" />
          
          {stats && (
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2 bg-muted rounded">
                <div className="text-muted-foreground">Phrases</div>
                <div className="font-bold">{stats.phrasesCount.toLocaleString()}</div>
              </div>
              <div className="p-2 bg-muted rounded">
                <div className="text-muted-foreground">Dictionnaire</div>
                <div className="font-bold">{stats.dictionaryCount.toLocaleString()}</div>
              </div>
              <div className="col-span-2 flex gap-2 justify-around text-center">
                <div className={stats.smtReady ? 'text-green-600' : 'text-muted-foreground'}>
                  SMT {stats.smtReady ? '✓' : '✗'}
                </div>
                <div className={stats.correctoReady ? 'text-green-600' : 'text-muted-foreground'}>
                  Corrector {stats.correctoReady ? '✓' : '✗'}
                </div>
                <div className={stats.trieReady ? 'text-green-600' : 'text-muted-foreground'}>
                  Index {stats.trieReady ? '✓' : '✗'}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
