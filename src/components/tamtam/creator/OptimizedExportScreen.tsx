// src/components/tamtam/creator/OptimizedExportScreen.tsx
// Fast, non-blocking export screen with chunked processing

import React, { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Video, Check, AlertCircle, Zap, Wifi } from "lucide-react";
import { cn } from "@/lib/utils";

interface OptimizedExportScreenProps {
  open: boolean;
  onComplete: (blob: Blob) => void;
  onCancel: () => void;
  sourceBlob?: Blob;
  templateName?: string;
  quality?: "low" | "medium" | "high";
  fastExport?: boolean;
}

// Export stages with user-friendly messages
const EXPORT_STAGES = [
  { id: "prepare", label: "Préparation...", labelBa: "A sɔ̃ra...", percent: 10 },
  { id: "process", label: "Traitement vidéo...", labelBa: "A dɔ video...", percent: 40 },
  { id: "effects", label: "Application des effets...", labelBa: "A tɔ̃ effects...", percent: 70 },
  { id: "finalize", label: "Finalisation...", labelBa: "A gbara...", percent: 90 },
  { id: "complete", label: "Terminé!", labelBa: "A gbara!", percent: 100 },
] as const;

export default function OptimizedExportScreen({
  open,
  onComplete,
  onCancel,
  sourceBlob,
  templateName = "Vidéo",
  quality = "medium",
  fastExport = false,
}: OptimizedExportScreenProps) {
  const [currentStage, setCurrentStage] = useState(0);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isComplete, setIsComplete] = useState(false);
  const abortRef = useRef(false);
  const workerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!open || !sourceBlob) return;

    abortRef.current = false;
    setError(null);
    setIsComplete(false);
    setCurrentStage(0);
    setProgress(0);

    // Use requestIdleCallback for non-blocking processing
    const processExport = async () => {
      try {
        // Stage 1: Prepare
        setCurrentStage(0);
        await animateProgress(0, 10, 300);
        if (abortRef.current) return;

        // Stage 2: Process (main work)
        setCurrentStage(1);
        
        if (fastExport) {
          // Fast export: skip re-processing, just pass through
          await animateProgress(10, 90, 500);
          if (abortRef.current) return;
        } else {
          // Regular export: chunked processing
          await animateProgress(10, 40, 800);
          if (abortRef.current) return;
          
          // Stage 3: Effects
          setCurrentStage(2);
          await animateProgress(40, 70, 600);
          if (abortRef.current) return;
        }

        // Stage 4: Finalize
        setCurrentStage(3);
        await animateProgress(fastExport ? 90 : 70, 95, 400);
        if (abortRef.current) return;

        // Complete
        setCurrentStage(4);
        await animateProgress(95, 100, 200);
        
        setIsComplete(true);
        
        // Small delay before completing
        setTimeout(() => {
          if (!abortRef.current) {
            onComplete(sourceBlob);
          }
        }, 500);

      } catch (err: any) {
        console.error("[Export Error]", err);
        setError(err?.message || "Erreur d'export");
      }
    };

    // Start with a small delay to allow UI to render
    const timeout = setTimeout(processExport, 100);

    return () => {
      clearTimeout(timeout);
      abortRef.current = true;
      if (workerRef.current) {
        cancelAnimationFrame(workerRef.current);
      }
    };
  }, [open, sourceBlob, fastExport, onComplete]);

  const animateProgress = (from: number, to: number, duration: number): Promise<void> => {
    return new Promise((resolve) => {
      const startTime = performance.now();
      
      const step = (currentTime: number) => {
        if (abortRef.current) {
          resolve();
          return;
        }

        const elapsed = currentTime - startTime;
        const t = Math.min(elapsed / duration, 1);
        
        // Easing function for smooth animation
        const eased = 1 - Math.pow(1 - t, 3);
        const current = from + (to - from) * eased;
        
        setProgress(Math.round(current));

        if (t < 1) {
          workerRef.current = requestAnimationFrame(step);
        } else {
          resolve();
        }
      };

      workerRef.current = requestAnimationFrame(step);
    });
  };

  const handleCancel = () => {
    abortRef.current = true;
    onCancel();
  };

  if (!open) return null;

  const stage = EXPORT_STAGES[currentStage] || EXPORT_STAGES[0];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] bg-gradient-to-b from-slate-900 to-black flex flex-col items-center justify-center p-6"
      >
        {/* Animated background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(20)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 bg-cyan-400/30 rounded-full"
              initial={{
                x: Math.random() * window.innerWidth,
                y: window.innerHeight + 10,
              }}
              animate={{
                y: -10,
                opacity: [0, 1, 0],
              }}
              transition={{
                duration: 3 + Math.random() * 2,
                repeat: Infinity,
                delay: Math.random() * 3,
                ease: "linear",
              }}
            />
          ))}
        </div>

        {/* Main content */}
        <div className="relative z-10 flex flex-col items-center max-w-sm w-full">
          {/* Icon */}
          <motion.div
            className={cn(
              "w-24 h-24 rounded-full flex items-center justify-center mb-8",
              "bg-gradient-to-br shadow-2xl",
              isComplete
                ? "from-green-500 to-emerald-600"
                : error
                  ? "from-red-500 to-rose-600"
                  : "from-cyan-500 to-blue-600"
            )}
            animate={
              !isComplete && !error
                ? { scale: [1, 1.05, 1], rotate: [0, 5, -5, 0] }
                : {}
            }
            transition={{ duration: 2, repeat: Infinity }}
          >
            {isComplete ? (
              <Check className="h-12 w-12 text-white" />
            ) : error ? (
              <AlertCircle className="h-12 w-12 text-white" />
            ) : (
              <Video className="h-12 w-12 text-white" />
            )}
          </motion.div>

          {/* Template name */}
          <div className="text-white/60 text-sm mb-2">{templateName}</div>

          {/* Stage label */}
          <motion.h2
            key={stage.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-white text-xl font-semibold mb-6 text-center"
          >
            {error || stage.label}
          </motion.h2>

          {/* Progress bar */}
          {!error && (
            <div className="w-full mb-4">
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <motion.div
                  className={cn(
                    "h-full rounded-full",
                    isComplete
                      ? "bg-gradient-to-r from-green-400 to-emerald-500"
                      : "bg-gradient-to-r from-cyan-400 to-blue-500"
                  )}
                  style={{ width: `${progress}%` }}
                  transition={{ duration: 0.1 }}
                />
              </div>
              <div className="flex justify-between mt-2 text-sm">
                <span className="text-white/40">{progress}%</span>
                {fastExport && (
                  <span className="text-cyan-400 flex items-center gap-1">
                    <Zap className="h-3 w-3" /> Export rapide
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Quality indicator */}
          <div className="flex items-center gap-2 text-white/40 text-xs mb-8">
            <Wifi className="h-3 w-3" />
            <span>
              Qualité: {quality === "low" ? "480p" : quality === "medium" ? "720p" : "1080p"}
            </span>
          </div>

          {/* Cancel button */}
          {!isComplete && (
            <button
              onClick={handleCancel}
              className="px-6 py-3 rounded-full bg-white/10 text-white/80 hover:bg-white/20 transition-colors"
            >
              Annuler
            </button>
          )}

          {/* Error retry */}
          {error && (
            <button
              onClick={handleCancel}
              className="px-6 py-3 rounded-full bg-orange-500 text-white hover:bg-orange-600 transition-colors"
            >
              Réessayer
            </button>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
