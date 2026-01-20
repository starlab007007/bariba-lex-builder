/**
 * TemplateStepNavigator.tsx
 * Composant réutilisable de navigation pour les templates
 * Boutons Previous/Next, indicateur de progression, responsive
 */

import React from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface TemplateStepNavigatorProps {
  currentStep: number;
  totalSteps: number;
  stepLabels?: string[];
  onPrevious?: () => void;
  onNext?: () => void;
  canGoBack?: boolean;
  canGoNext?: boolean;
  nextLabel?: string;
  previousLabel?: string;
  showProgress?: boolean;
  className?: string;
  isLastStep?: boolean;
  onComplete?: () => void;
}

export const TemplateStepNavigator: React.FC<TemplateStepNavigatorProps> = ({
  currentStep,
  totalSteps,
  stepLabels,
  onPrevious,
  onNext,
  canGoBack = true,
  canGoNext = true,
  nextLabel = 'Suivant',
  previousLabel = 'Précédent',
  showProgress = true,
  className,
  isLastStep = false,
  onComplete,
}) => {
  const progressPercent = ((currentStep + 1) / totalSteps) * 100;

  const handleNext = () => {
    if (isLastStep && onComplete) {
      onComplete();
    } else if (onNext) {
      onNext();
    }
    // Haptic feedback
    if (navigator.vibrate) navigator.vibrate(30);
  };

  const handlePrevious = () => {
    if (onPrevious) onPrevious();
    if (navigator.vibrate) navigator.vibrate(20);
  };

  return (
    <div className={cn(
      "fixed bottom-0 left-0 right-0 z-50",
      "bg-background/95 backdrop-blur-lg border-t border-border",
      "pb-[env(safe-area-inset-bottom)] px-4 pt-3",
      className
    )}>
      {/* Barre de progression */}
      {showProgress && (
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-medium text-muted-foreground">
              Étape {currentStep + 1} / {totalSteps}
            </span>
            {stepLabels?.[currentStep] && (
              <span className="text-xs font-medium text-foreground">
                {stepLabels[currentStep]}
              </span>
            )}
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-primary rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            />
          </div>
        </div>
      )}

      {/* Points indicateurs */}
      <div className="flex justify-center gap-1.5 mb-3">
        {Array.from({ length: totalSteps }).map((_, i) => (
          <motion.div
            key={i}
            className={cn(
              "w-2 h-2 rounded-full transition-colors duration-200",
              i < currentStep ? "bg-primary" :
              i === currentStep ? "bg-primary ring-2 ring-primary/30" :
              "bg-muted-foreground/30"
            )}
            animate={{ scale: i === currentStep ? 1.2 : 1 }}
          />
        ))}
      </div>

      {/* Boutons navigation */}
      <div className="flex items-center gap-3 pb-2">
        <Button
          variant="outline"
          size="lg"
          onClick={handlePrevious}
          disabled={!canGoBack || currentStep === 0}
          className="flex-1 h-12 text-base font-medium gap-2"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="hidden sm:inline">{previousLabel}</span>
        </Button>

        <Button
          variant={isLastStep ? "default" : "default"}
          size="lg"
          onClick={handleNext}
          disabled={!canGoNext}
          className={cn(
            "flex-1 h-12 text-base font-medium gap-2",
            isLastStep && "bg-green-600 hover:bg-green-700"
          )}
        >
          <span>{isLastStep ? 'Publier' : nextLabel}</span>
          {isLastStep ? (
            <Check className="w-5 h-5" />
          ) : (
            <ArrowRight className="w-5 h-5" />
          )}
        </Button>
      </div>
    </div>
  );
};

/**
 * Layout wrapper pour pages avec navigation
 * Gère le scroll et le padding pour le footer fixe
 */
export const TemplateStepLayout: React.FC<{
  children: React.ReactNode;
  header?: React.ReactNode;
  navigator: React.ReactNode;
  className?: string;
}> = ({ children, header, navigator, className }) => {
  return (
    <div className={cn("flex flex-col h-[100dvh] overflow-hidden bg-background", className)}>
      {/* Header fixe */}
      {header && (
        <div className="shrink-0 sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b border-border">
          {header}
        </div>
      )}
      
      {/* Contenu scrollable */}
      <main className="flex-1 overflow-y-auto pb-32 scroll-smooth">
        {children}
      </main>

      {/* Navigation fixe en bas */}
      {navigator}
    </div>
  );
};

export default TemplateStepNavigator;
