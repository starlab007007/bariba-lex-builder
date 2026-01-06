// src/components/tamtam/creator/TranscriptionEditor.tsx
// Dynamic transcription editor with inline editing, STT integration, and AI suggestions

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
        "bg-black/60 backdrop-blur-xl rounded-2xl border border-white/10 p-3",
        className
      )}
    >
      {/* Main content */}
      <div className="flex items-start gap-3">
        {/* Transcribe button */}
        <button
          onClick={capturedBlob ? autoTranscribe : startLiveTranscription}
          disabled={isLoading}
          className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-all",
            isLoading
              ? "bg-orange-500/30 text-orange-400"
              : "bg-white/10 text-white/80 hover:bg-white/20"
          )}
        >
          {isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : isTranscribing ? (
            <MicOff className="h-5 w-5" />
          ) : (
            <Mic className="h-5 w-5" />
          )}
        </button>

        {/* Text content */}
        <div className="flex-1 min-w-0">
          {isEditing ? (
            <textarea
              ref={inputRef}
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              className="w-full bg-white/5 rounded-xl p-2 text-white text-sm outline-none resize-none min-h-[60px] border border-white/20"
              placeholder="Saisissez votre transcription..."
            />
          ) : (
            <div className="space-y-1">
              {transcript ? (
                <>
                  <p className="text-white text-sm leading-relaxed">{transcript}</p>
                  {transcriptBa && showBa && (
                    <p className="text-white/60 text-xs italic">🇧🇯 {transcriptBa}</p>
                  )}
                </>
              ) : (
                <p className="text-white/40 text-sm italic">
                  {isLoading ? "Transcription en cours..." : "Appuyez sur 🎤 pour transcrire"}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex flex-col gap-1 flex-shrink-0">
          {isEditing ? (
            <>
              <button
                onClick={confirmEdit}
                className="w-8 h-8 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center hover:bg-green-500/30"
              >
                <Check className="h-4 w-4" />
              </button>
              <button
                onClick={cancelEdit}
                className="w-8 h-8 rounded-full bg-white/10 text-white/60 flex items-center justify-center hover:bg-white/20"
              >
                <X className="h-4 w-4" />
              </button>
            </>
          ) : (
            <>
              <button
                onClick={startEdit}
                className="w-8 h-8 rounded-full bg-white/10 text-white/80 flex items-center justify-center hover:bg-white/20"
                title="Modifier"
              >
                <Edit3 className="h-4 w-4" />
              </button>
              <button
                onClick={enhanceWithAI}
                disabled={!transcript || isEnhancing}
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center transition-all",
                  !transcript || isEnhancing
                    ? "opacity-30 cursor-not-allowed bg-white/5"
                    : "bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-400 hover:from-purple-500/30 hover:to-pink-500/30"
                )}
                title="Améliorer avec IA"
              >
                {isEnhancing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
              </button>
              <button
                onClick={handleDelete}
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center transition-all",
                  showDeleteConfirm
                    ? "bg-red-500 text-white"
                    : "bg-white/10 text-white/60 hover:bg-red-500/20 hover:text-red-400"
                )}
                title={showDeleteConfirm ? "Confirmer la suppression" : "Supprimer"}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Language toggle (if bilingual) */}
      {transcriptBa && !isEditing && (
        <button
          onClick={() => setShowBa(!showBa)}
          className={cn(
            "mt-2 flex items-center gap-1 px-2 py-1 rounded-full text-xs transition-all",
            showBa
              ? "bg-orange-500/20 text-orange-400"
              : "bg-white/5 text-white/40 hover:text-white/60"
          )}
        >
          <Globe className="h-3 w-3" />
          {showBa ? "Masquer Bariba" : "Afficher Bariba"}
        </button>
      )}
    </motion.div>
  );
}
