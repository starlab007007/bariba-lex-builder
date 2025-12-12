/**
 * Dashboard de monitoring des services audio (TTS/STT)
 * Affiche l'état des services Bariba et Français
 */

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { 
  Activity, CheckCircle, XCircle, AlertCircle, 
  Volume2, Mic, RefreshCw, Clock, Loader2 
} from "lucide-react";

type ServiceStatus = 'available' | 'unavailable' | 'checking' | 'unknown';

interface ServiceHealth {
  name: string;
  type: 'tts' | 'stt';
  language: 'bariba' | 'french';
  status: ServiceStatus;
  lastCheck: Date | null;
  latency: number | null;
  errorMessage?: string;
  fallbackAvailable: boolean;
}

export function AudioServicesMonitor() {
  const [services, setServices] = useState<ServiceHealth[]>([
    { name: 'TTS Bariba', type: 'tts', language: 'bariba', status: 'unknown', lastCheck: null, latency: null, fallbackAvailable: true },
    { name: 'STT Bariba', type: 'stt', language: 'bariba', status: 'unknown', lastCheck: null, latency: null, fallbackAvailable: false },
    { name: 'TTS Français', type: 'tts', language: 'french', status: 'available', lastCheck: new Date(), latency: 0, fallbackAvailable: false },
    { name: 'STT Français', type: 'stt', language: 'french', status: 'available', lastCheck: new Date(), latency: 0, fallbackAvailable: false }
  ]);
  const [isChecking, setIsChecking] = useState(false);
  const [lastFullCheck, setLastFullCheck] = useState<Date | null>(null);

  useEffect(() => {
    checkAllServices();
  }, []);

  const checkAllServices = async () => {
    setIsChecking(true);
    
    // Check Bariba TTS
    const ttsBaribaResult = await checkService('bariba-tts', { text: 'test', speakingRate: 1.0 });
    
    // Check Bariba STT  
    const sttBaribaResult = await checkService('bariba-stt', { audio: 'test', robustMode: true });

    setServices(prev => prev.map(s => {
      if (s.name === 'TTS Bariba') {
        return { 
          ...s, 
          status: ttsBaribaResult.success ? 'available' : 'unavailable',
          lastCheck: new Date(),
          latency: ttsBaribaResult.latency,
          errorMessage: ttsBaribaResult.error
        };
      }
      if (s.name === 'STT Bariba') {
        return { 
          ...s, 
          status: sttBaribaResult.success ? 'available' : 'unavailable',
          lastCheck: new Date(),
          latency: sttBaribaResult.latency,
          errorMessage: sttBaribaResult.error
        };
      }
      return s;
    }));

    setLastFullCheck(new Date());
    setIsChecking(false);
  };

  const checkService = async (fnName: string, body: any): Promise<{ success: boolean; latency: number; error?: string }> => {
    const startTime = Date.now();
    try {
      const { data, error } = await supabase.functions.invoke(fnName, { body });
      const latency = Date.now() - startTime;
      
      if (error || data?.error) {
        return { success: false, latency, error: data?.error || error?.message || 'Unknown error' };
      }
      
      return { success: true, latency };
    } catch (err: any) {
      return { success: false, latency: Date.now() - startTime, error: err.message };
    }
  };

  const getStatusIcon = (status: ServiceStatus) => {
    switch (status) {
      case 'available':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'unavailable':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'checking':
        return <Loader2 className="h-5 w-5 animate-spin text-blue-500" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: ServiceStatus) => {
    switch (status) {
      case 'available':
        return <Badge variant="default" className="bg-green-500">Disponible</Badge>;
      case 'unavailable':
        return <Badge variant="destructive">Indisponible</Badge>;
      case 'checking':
        return <Badge variant="secondary">Vérification...</Badge>;
      default:
        return <Badge variant="outline">Non vérifié</Badge>;
    }
  };

  const availableCount = services.filter(s => s.status === 'available').length;
  const healthPercentage = (availableCount / services.length) * 100;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Monitoring Services Audio</h2>
          <p className="text-muted-foreground">
            État des services TTS et STT pour Bariba et Français
          </p>
        </div>
        
        <Button 
          onClick={checkAllServices} 
          disabled={isChecking}
          variant="outline"
        >
          {isChecking ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          Vérifier tous
        </Button>
      </div>

      {/* Health Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Santé Globale des Services
          </CardTitle>
          <CardDescription>
            {availableCount}/{services.length} services opérationnels
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Disponibilité</span>
              <span className="font-bold">{Math.round(healthPercentage)}%</span>
            </div>
            <Progress value={healthPercentage} className="h-3" />
          </div>
          
          {lastFullCheck && (
            <p className="text-xs text-muted-foreground mt-4 flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Dernière vérification: {lastFullCheck.toLocaleTimeString()}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Services Grid */}
      <div className="grid gap-4 md:grid-cols-2">
        {services.map((service) => (
          <Card key={service.name} className={`border-l-4 ${
            service.status === 'available' ? 'border-l-green-500' :
            service.status === 'unavailable' ? 'border-l-red-500' :
            'border-l-gray-300'
          }`}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  {service.type === 'tts' ? (
                    <Volume2 className="h-5 w-5 text-primary" />
                  ) : (
                    <Mic className="h-5 w-5 text-primary" />
                  )}
                  {service.name}
                </CardTitle>
                {getStatusIcon(service.status)}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Statut</span>
                  {getStatusBadge(service.status)}
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Type</span>
                  <Badge variant="outline">
                    {service.type.toUpperCase()}
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Langue</span>
                  <Badge variant="secondary">
                    {service.language === 'bariba' ? 'Bààtɔ̀nú' : 'Français'}
                  </Badge>
                </div>
                
                {service.latency !== null && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Latence</span>
                    <span className={`font-mono text-sm ${
                      service.latency < 500 ? 'text-green-600' :
                      service.latency < 2000 ? 'text-yellow-600' :
                      'text-red-600'
                    }`}>
                      {service.latency}ms
                    </span>
                  </div>
                )}
                
                {service.fallbackAvailable && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Fallback</span>
                    <Badge variant="outline" className="text-green-600 border-green-600">
                      TTS Français disponible
                    </Badge>
                  </div>
                )}
                
                {service.errorMessage && service.status === 'unavailable' && (
                  <div className="mt-2 p-2 bg-destructive/10 rounded text-xs text-destructive">
                    {service.errorMessage.includes('503') || service.errorMessage.includes('sleeping') ? (
                      <span>⚠️ HuggingFace Space en veille. Visitez le Space pour le réveiller.</span>
                    ) : (
                      <span>{service.errorMessage}</span>
                    )}
                  </div>
                )}
                
                {service.lastCheck && (
                  <p className="text-xs text-muted-foreground">
                    Vérifié: {service.lastCheck.toLocaleTimeString()}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* HuggingFace Spaces Links */}
      <Card>
        <CardHeader>
          <CardTitle>Liens HuggingFace Spaces</CardTitle>
          <CardDescription>
            Cliquez pour réveiller les Spaces si nécessaire
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" asChild>
              <a href="https://huggingface.co/spaces/zimesongbian/baatonum_tts_api_v001" target="_blank" rel="noopener noreferrer">
                <Volume2 className="h-4 w-4 mr-2" />
                TTS Bariba Space
              </a>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <a href="https://huggingface.co/spaces/zimesongbian/baatonum_asr_stt_api_v001_improve" target="_blank" rel="noopener noreferrer">
                <Mic className="h-4 w-4 mr-2" />
                STT Bariba Space
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
