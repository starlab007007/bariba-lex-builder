/**
 * Composant de sélection du modèle de traduction
 */
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";
import { type TranslationModel, type ModelInfo } from "@/hooks/useTranslationModelSelector";
import { cn } from "@/lib/utils";

interface TranslationModelSelectorProps {
  selectedModel: TranslationModel;
  onSelectModel: (model: TranslationModel) => void;
  availableModels: ModelInfo[];
  className?: string;
}

export function TranslationModelSelector({
  selectedModel,
  onSelectModel,
  availableModels,
  className
}: TranslationModelSelectorProps) {
  const getSpeedColor = (speed: string) => {
    switch (speed) {
      case 'ultra-rapide': return 'bg-green-500/10 text-green-700 dark:text-green-400';
      case 'rapide': return 'bg-blue-500/10 text-blue-700 dark:text-blue-400';
      case 'moyen': return 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400';
      case 'lent': return 'bg-orange-500/10 text-orange-700 dark:text-orange-400';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getQualityColor = (quality: string) => {
    switch (quality) {
      case 'excellente': return 'bg-purple-500/10 text-purple-700 dark:text-purple-400';
      case 'très bonne': return 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-400';
      case 'bonne': return 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-400';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-foreground">
          Modèle de traduction
        </h3>
        <Badge variant="outline" className="text-xs">
          {availableModels.length} modèles
        </Badge>
      </div>
      
      <div className="grid gap-2">
        {availableModels.map((model) => {
          const isSelected = selectedModel === model.id;
          
          return (
            <Card
              key={model.id}
              className={cn(
                "p-3 cursor-pointer transition-all hover:shadow-md relative overflow-hidden",
                isSelected
                  ? "border-primary bg-primary/5 shadow-sm"
                  : "border-border hover:border-primary/50"
              )}
              onClick={() => onSelectModel(model.id)}
            >
              {model.recommended && (
                <div className="absolute top-0 right-0 bg-gradient-to-l from-primary/20 to-transparent px-3 py-1 rounded-bl-lg">
                  <span className="text-xs font-semibold text-primary">Recommandé</span>
                </div>
              )}
              
              <div className="flex items-start gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-primary/10 to-accent/10 flex-shrink-0">
                  <span className="text-2xl">{model.icon}</span>
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="text-sm font-semibold text-foreground">
                      {model.name}
                    </h4>
                    {isSelected && (
                      <div className="flex-shrink-0 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                        <Check className="w-3 h-3 text-primary-foreground" />
                      </div>
                    )}
                  </div>
                  
                  <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                    {model.description}
                  </p>
                  
                  <div className="flex flex-wrap gap-1.5">
                    <Badge className={cn("text-xs px-2 py-0.5", getSpeedColor(model.speed))}>
                      {model.speed}
                    </Badge>
                    <Badge className={cn("text-xs px-2 py-0.5", getQualityColor(model.quality))}>
                      {model.quality}
                    </Badge>
                    <Badge variant="outline" className="text-xs px-2 py-0.5">
                      {model.cost}
                    </Badge>
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
