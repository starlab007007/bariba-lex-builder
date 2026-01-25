// src/components/tamtam/creator/TranscriptionEditor.tsx
// Dynamic transcription editor with inline editing, STT integration, and AI suggestions
// RESPONSIVE OPTIMIZED - Touch targets 44px+, fluid typography

import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, Sparkles, Trash2, Edit3, Check, X, Globe, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useBaribaSTT } from "@/hooks/useBaribaSTT";
import { useWebSpeechSTT } from "@/hooks/useWebSpeechSTT";
import { supabase } from "@/integrations/supabase/client";

interface TranscriptionEditorProps {
  transcript: string;
  transcriptBa?: string;
  onTranscriptChange: (text: string) => void;
  onTranscriptBaChange?: (text: string) => void;
  onDelete: () => void;
  capturedBlob?: Blob | null;
  capturedType: "video" | "photo" | "audio";
  className?: string;
}

export default function TranscriptionEditor({
  transcript,
  transcriptBa,
  onTranscriptChange,
  onTranscriptBaChange,
  onDelete,
  capturedBlob,
  capturedType,
  className,
}: TranscriptionEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(transcript);
  const [showBa, setShowBa] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { transcribe: transcribeBariba, isTranscribing: isTranscribingBariba } = useBaribaSTT();
  const { transcribeFromMicrophone: transcribeFrench, isProcessing: isTranscribingFrench } = useWebSpeechSTT();

  // Start editing
  const startEdit = () => {
    setEditText(transcript);
    setIsEditing(true);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  // Confirm edit
  const confirmEdit = () => {
    onTranscriptChange(editText);
    setIsEditing(false);
  };

  // Cancel edit
  const cancelEdit = () => {
    setEditText(transcript);
    setIsEditing(false);
  };

  // Auto-transcribe from captured media
  const autoTranscribe = async () => {
    if (!capturedBlob) return;
    
    setIsTranscribing(true);
    try {
      // Convert blob to base64
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(",")[1] || result);
        };
        reader.onerror = reject;
        reader.readAsDataURL(capturedBlob);
      });

      // Try Bariba STT first
      const baribaResult = await transcribeBariba(base64, { robustMode: true });
      if (baribaResult?.transcription) {
        onTranscriptChange(baribaResult.transcription);
        return;
      }

      // Fallback to French STT
      const frenchResult = await transcribeFrench();
      if (frenchResult) {
        onTranscriptChange(frenchResult);
      }
    } catch (error) {
      console.error("Transcription failed:", error);
    } finally {
      setIsTranscribing(false);
    }
  };

  // Live transcription from microphone
  const startLiveTranscription = async () => {
    setIsTranscribing(true);
    try {
      const result = await transcribeFrench();
      if (result) {
        const newText = transcript ? `${transcript} ${result}` : result;
        onTranscriptChange(newText);
      }
    } catch (error) {
      console.error("Live transcription failed:", error);
    } finally {
      setIsTranscribing(false);
    }
  };

  // AI enhance transcription
  const enhanceWithAI = async () => {
    if (!transcript.trim()) return;
    
    setIsEnhancing(true);
    try {
      const { data, error } = await supabase.functions.invoke("process-template", {
        body: {
          action: "generate_captions",
          inputText: transcript,
        },
      });

      if (data?.result) {
        // Parse AI response and apply
        try {
          const enhanced = typeof data.result === "string" ? data.result : JSON.stringify(data.result);
          onTranscriptChange(enhanced.replace(/[\[\]"{}]/g, "").trim());
        } catch {
          // Just clean up the text
          onTranscriptChange(transcript.trim());
        }
      }
    } catch (error) {
      console.error("AI enhancement failed:", error);
    } finally {
      setIsEnhancing(false);
    }
  };

  // Delete with confirmation
  const handleDelete = () => {
    if (showDeleteConfirm) {
      onDelete();
      setShowDeleteConfirm(false);
    } else {
      setShowDeleteConfirm(true);
      setTimeout(() => setShowDeleteConfirm(false), 3000);
    }
  };

  const isLoading = isTranscribing || isTranscribingBariba || isTranscribingFrench || isEnhancing;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "transcription-editor",
        className
      )}
    >
      {/* Main content - Responsive layout */}
      <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4">
        {/* Transcribe button - Touch target 44px+ */}
        <button
          onClick={capturedBlob ? autoTranscribe : startLiveTranscription}
          disabled={isLoading}
          className={cn(
            "transcription-btn flex-shrink-0 transition-all",
            isLoading
              ? "bg-orange-500/30 text-orange-400"
              : "bg-white/10 text-white/80 hover:bg-white/20 active:bg-white/25"
          )}
          aria-label={isLoading ? "Transcription en cours" : "Transcrire"}
        >
          {isLoading ? (
            <Loader2 className="h-5 w-5 sm:h-6 sm:w-6 animate-spin" />
          ) : isTranscribing ? (
            <MicOff className="h-5 w-5 sm:h-6 sm:w-6" />
          ) : (
            <Mic className="h-5 w-5 sm:h-6 sm:w-6" />
          )}
        </button>

        {/* Text content - Fluid typography */}
        <div className="flex-1 min-w-0 w-full">
          {isEditing ? (
            <textarea
              ref={inputRef}
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              className="w-full bg-white/5 rounded-xl p-3 text-white text-fluid-base outline-none resize-none min-h-[80px] sm:min-h-[70px] border border-white/20 focus:border-primary/50 transition-colors"
              placeholder="Saisissez votre transcription..."
            />
          ) : (
            <div className="space-y-2">
              {transcript ? (
                <>
                  <p className="text-white text-fluid-base leading-relaxed text-readable-light">
                    {transcript}
                  </p>
                  {transcriptBa && showBa && (
                    <p className="text-white/60 text-fluid-sm italic">
                      🇧🇯 {transcriptBa}
                    </p>
                  )}
                </>
              ) : (
                <p className="text-white/40 text-fluid-base italic">
                  {isLoading ? "Transcription en cours..." : "Appuyez sur 🎤 pour transcrire"}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Action buttons - Touch targets 44px, stacked on mobile */}
        <div className="flex flex-row sm:flex-col gap-2 flex-shrink-0 w-full sm:w-auto justify-end">
          {isEditing ? (
            <>
              <button
                onClick={confirmEdit}
                className="transcription-btn bg-green-500/20 text-green-400 hover:bg-green-500/30 active:bg-green-500/40"
                aria-label="Confirmer"
              >
                <Check className="h-5 w-5" />
              </button>
              <button
                onClick={cancelEdit}
                className="transcription-btn bg-white/10 text-white/60 hover:bg-white/20 active:bg-white/25"
                aria-label="Annuler"
              >
                <X className="h-5 w-5" />
              </button>
            </>
          ) : (
            <>
              <button
                onClick={startEdit}
                className="transcription-btn bg-white/10 text-white/80 hover:bg-white/20 active:bg-white/25"
                title="Modifier"
                aria-label="Modifier"
              >
                <Edit3 className="h-5 w-5" />
              </button>
              <button
                onClick={enhanceWithAI}
                disabled={!transcript || isEnhancing}
                className={cn(
                  "transcription-btn transition-all",
                  !transcript || isEnhancing
                    ? "opacity-30 cursor-not-allowed bg-white/5"
                    : "bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-400 hover:from-purple-500/30 hover:to-pink-500/30 active:from-purple-500/40 active:to-pink-500/40"
                )}
                title="Améliorer avec IA"
                aria-label="Améliorer avec IA"
              >
                {isEnhancing ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Sparkles className="h-5 w-5" />
                )}
              </button>
              <button
                onClick={handleDelete}
                className={cn(
                  "transcription-btn transition-all",
                  showDeleteConfirm
                    ? "bg-red-500 text-white"
                    : "bg-white/10 text-white/60 hover:bg-red-500/20 hover:text-red-400 active:bg-red-500/30"
                )}
                title={showDeleteConfirm ? "Confirmer la suppression" : "Supprimer"}
                aria-label={showDeleteConfirm ? "Confirmer la suppression" : "Supprimer"}
              >
                <Trash2 className="h-5 w-5" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Language toggle (if bilingual) - Touch friendly */}
      {transcriptBa && !isEditing && (
        <button
          onClick={() => setShowBa(!showBa)}
          className={cn(
            "mt-3 flex items-center gap-2 px-3 py-2 rounded-full text-fluid-sm transition-all touch-action-manipulation",
            showBa
              ? "bg-orange-500/20 text-orange-400"
              : "bg-white/5 text-white/40 hover:text-white/60 active:bg-white/10"
          )}
          style={{ minHeight: '36px' }}
        >
          <Globe className="h-4 w-4" />
          {showBa ? "Masquer Bariba" : "Afficher Bariba"}
        </button>
      )}
    </motion.div>
  );
}
