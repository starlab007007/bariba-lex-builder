import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Bot, Zap, Brain, Check, Loader2 } from "lucide-react";
import { byT5TranslationService } from "@/services/ByT5TranslationService";
import { cn } from "@/lib/utils";

export type TranslationModel = 'byt5-expert' | 'simplified' | 'lovable-ai';

interface TranslationModelSwitcherProps {
  selectedModel: TranslationModel;
  onModelChange: (model: TranslationModel) => void;
  disabled?: boolean;
}

interface ModelOption {
  id: TranslationModel;
  name: string;
  description: string;
  icon: React.ReactNode;
  badge: string;
  badgeVariant: "default" | "secondary" | "outline";
  recommended?: boolean;
}

export const TranslationModelSwitcher = ({
  selectedModel,
  onModelChange,
  disabled = false
}: TranslationModelSwitcherProps) => {
  const [byt5Available, setByt5Available] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkByT5 = async () => {
      setChecking(true);
      try {
        // Quick check without actual API call first
        const status = byT5TranslationService.getHealthStatus();
        if (status.lastCheck > 0 && Date.now() - status.lastCheck < 60000) {
          setByt5Available(status.isHealthy);
          setChecking(false);
          
          // If was unavailable, auto-select SimplifiedAI
          if (!status.isHealthy && selectedModel === 'byt5-expert') {
            onModelChange('simplified');
          }
          return;
        }
        
        // Only do full health check if no recent data
        const isHealthy = await byT5TranslationService.checkHealth();
        setByt5Available(isHealthy);
        
        // Auto-select SimplifiedAI if ByT5 unavailable
        if (!isHealthy && selectedModel === 'byt5-expert') {
          onModelChange('simplified');
        }
      } catch {
        setByt5Available(false);
        if (selectedModel === 'byt5-expert') {
          onModelChange('simplified');
        }
      } finally {
        setChecking(false);
      }
    };

    checkByT5();
  }, [selectedModel, onModelChange]);

  const models: ModelOption[] = [
    {
      id: 'byt5-expert',
      name: 'ByT5 Expert',
      description: 'Modèle spécialisé Bariba, haute qualité',
      icon: <Bot className="h-4 w-4" />,
      badge: 'Recommandé',
      badgeVariant: 'default',
      recommended: true
    },
    {
      id: 'simplified',
      name: 'SimplifiedAI',
      description: 'Local, très rapide, gratuit',
      icon: <Zap className="h-4 w-4" />,
      badge: 'Rapide',
      badgeVariant: 'secondary'
    },
    {
      id: 'lovable-ai',
      name: 'Lovable AI',
      description: 'Cloud, phrases complexes',
      icon: <Brain className="h-4 w-4" />,
      badge: 'Cloud',
      badgeVariant: 'outline'
    }
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {models.map((model) => {
        const isSelected = selectedModel === model.id;
        const isUnavailable = model.id === 'byt5-expert' && byt5Available === false;
        
        return (
          <Card
            key={model.id}
            onClick={() => !disabled && !isUnavailable && onModelChange(model.id)}
            className={cn(
              "flex items-center gap-2 px-3 py-2 cursor-pointer transition-all border-2",
              isSelected 
                ? "border-primary bg-primary/5" 
                : "border-transparent hover:border-muted-foreground/20",
              (disabled || isUnavailable) && "opacity-50 cursor-not-allowed",
              model.id === 'byt5-expert' && isSelected && "border-orange-500 bg-orange-500/5"
            )}
          >
            <div className={cn(
              "p-1.5 rounded-full",
              model.id === 'byt5-expert' && "bg-orange-100 text-orange-600",
              model.id === 'simplified' && "bg-green-100 text-green-600",
              model.id === 'lovable-ai' && "bg-blue-100 text-blue-600"
            )}>
              {model.icon}
            </div>
            
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-medium">{model.name}</span>
                {isSelected && <Check className="h-3 w-3 text-primary" />}
                {model.id === 'byt5-expert' && checking && (
                  <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                )}
                {model.id === 'byt5-expert' && !checking && byt5Available === false && (
                  <span className="text-xs text-destructive">Indisponible</span>
                )}
              </div>
              <span className="text-xs text-muted-foreground hidden sm:block">
                {model.description}
              </span>
            </div>
            
            {model.recommended && (
              <Badge 
                variant={model.badgeVariant} 
                className="ml-auto text-xs bg-orange-500 text-white hover:bg-orange-600"
              >
                {model.badge}
              </Badge>
            )}
          </Card>
        );
      })}
    </div>
  );
};
