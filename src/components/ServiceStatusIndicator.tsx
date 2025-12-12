import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { CheckCircle, XCircle, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

type ServiceStatus = 'available' | 'unavailable' | 'degraded' | 'checking';

interface ServiceInfo {
  name: string;
  status: ServiceStatus;
  lastCheck: Date | null;
  message?: string;
}

interface ServiceStatusIndicatorProps {
  compact?: boolean;
}

export const ServiceStatusIndicator = ({ compact = false }: ServiceStatusIndicatorProps) => {
  const [services, setServices] = useState<Record<string, ServiceInfo>>({
    baribaTTS: { name: 'TTS Bariba', status: 'checking', lastCheck: null },
    baribaSTT: { name: 'STT Bariba', status: 'checking', lastCheck: null },
    byt5Expert: { name: 'ByT5 Expert', status: 'checking', lastCheck: null },
    frenchTTS: { name: 'TTS Français', status: 'available', lastCheck: new Date(), message: 'Lovable AI' },
    frenchSTT: { name: 'STT Français', status: 'available', lastCheck: new Date(), message: 'Web Speech API' },
    simplifiedAI: { name: 'SimplifiedAI', status: 'available', lastCheck: new Date() },
    lovableAI: { name: 'Lovable AI', status: 'available', lastCheck: new Date() }
  });

  useEffect(() => {
    checkBaribaServices();
    // Check every 5 minutes
    const interval = setInterval(checkBaribaServices, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const checkBaribaServices = async () => {
    // Check TTS
    try {
      const { data, error } = await supabase.functions.invoke('bariba-tts', {
        body: { text: 'test', speakingRate: 1.0 }
      });
      
      const hasError = error || data?.error;
      setServices(prev => ({
        ...prev,
        baribaTTS: {
          ...prev.baribaTTS,
          status: hasError ? 'unavailable' : 'available',
          lastCheck: new Date(),
          message: hasError ? 'HuggingFace Space indisponible' : 'Opérationnel'
        }
      }));
    } catch {
      setServices(prev => ({
        ...prev,
        baribaTTS: {
          ...prev.baribaTTS,
          status: 'unavailable',
          lastCheck: new Date(),
          message: 'Service non accessible'
        }
      }));
    }

    // Check STT
    try {
      const { data, error } = await supabase.functions.invoke('bariba-stt', {
        body: { audio: 'test', robustMode: true }
      });
      
      // Health check returns { status: 'ok', isHealthCheck: true }
      const isAvailable = !error && (data?.status === 'ok' || data?.isHealthCheck || data?.transcription);
      setServices(prev => ({
        ...prev,
        baribaSTT: {
          ...prev.baribaSTT,
          status: isAvailable ? 'available' : 'unavailable',
          lastCheck: new Date(),
          message: isAvailable ? 'Opérationnel' : 'HuggingFace Space indisponible'
        }
      }));
    } catch {
      setServices(prev => ({
        ...prev,
        baribaSTT: {
          ...prev.baribaSTT,
          status: 'unavailable',
          lastCheck: new Date(),
          message: 'Service non accessible'
        }
      }));
    }

    // Check ByT5 Expert
    try {
      const { data, error } = await supabase.functions.invoke('byt5-bariba-translate', {
        body: { text: 'bonjour', sourceLang: 'french', targetLang: 'bariba' }
      });
      
      const hasError = error || data?.error;
      setServices(prev => ({
        ...prev,
        byt5Expert: {
          ...prev.byt5Expert,
          status: hasError ? 'unavailable' : 'available',
          lastCheck: new Date(),
          message: hasError ? 'HuggingFace Space indisponible' : 'Opérationnel'
        }
      }));
    } catch {
      setServices(prev => ({
        ...prev,
        byt5Expert: {
          ...prev.byt5Expert,
          status: 'unavailable',
          lastCheck: new Date(),
          message: 'Service non accessible'
        }
      }));
    }
  };

  const getStatusIcon = (status: ServiceStatus) => {
    switch (status) {
      case 'available':
        return <CheckCircle className="h-3.5 w-3.5 text-green-500" />;
      case 'unavailable':
        return <XCircle className="h-3.5 w-3.5 text-red-500" />;
      case 'degraded':
        return <AlertCircle className="h-3.5 w-3.5 text-yellow-500" />;
      case 'checking':
        return <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />;
    }
  };

  const getStatusVariant = (status: ServiceStatus): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case 'available':
        return 'default';
      case 'unavailable':
        return 'destructive';
      case 'degraded':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const availableCount = Object.values(services).filter(s => s.status === 'available').length;
  const totalCount = Object.keys(services).length;

  if (compact) {
    const allAvailable = availableCount === totalCount;
    const someUnavailable = Object.values(services).some(s => s.status === 'unavailable');
    
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge 
              variant={allAvailable ? 'default' : someUnavailable ? 'destructive' : 'secondary'}
              className="cursor-help"
            >
              {allAvailable ? (
                <CheckCircle className="h-3 w-3 mr-1" />
              ) : someUnavailable ? (
                <AlertCircle className="h-3 w-3 mr-1" />
              ) : (
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              )}
              {availableCount}/{totalCount} services
            </Badge>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            <div className="space-y-1">
              {Object.values(services).map(service => (
                <div key={service.name} className="flex items-center gap-2 text-xs">
                  {getStatusIcon(service.status)}
                  <span>{service.name}</span>
                  {service.message && (
                    <span className="text-muted-foreground">- {service.message}</span>
                  )}
                </div>
              ))}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {Object.values(services).map(service => (
        <TooltipProvider key={service.name}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant={getStatusVariant(service.status)} className="cursor-help">
                {getStatusIcon(service.status)}
                <span className="ml-1">{service.name}</span>
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p>{service.message || `Dernière vérification: ${service.lastCheck?.toLocaleTimeString() || 'jamais'}`}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ))}
    </div>
  );
};
