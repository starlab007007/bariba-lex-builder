/**
 * Story Input Component
 * Voice recording or text input for the story
 */

import React, { useState, useRef, useCallback } from 'react';
import { Mic, MicOff, Keyboard, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

interface StoryInputProps {
  value: string;
  onChange: (value: string) => void;
  onAudioRecorded?: (blob: Blob) => void;
  disabled?: boolean;
}

export function StoryInput({ value, onChange, onAudioRecorded, disabled }: StoryInputProps) {
  const [mode, setMode] = useState<'voice' | 'text'>('voice');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/mp3' });
        onAudioRecorded?.(audioBlob);
        
        // Clean up
        stream.getTracks().forEach(track => track.stop());
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
      };

      mediaRecorder.start(100);
      setIsRecording(true);
      setRecordingTime(0);

      // Start timer
      timerRef.current = window.setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (err) {
      console.error('[StoryInput] Recording error:', err);
    }
  }, [onAudioRecorded]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  }, [isRecording]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="w-full max-w-sm mx-auto space-y-4">
      <div className="flex items-center justify-center gap-2 mb-4">
        <Button
          variant={mode === 'voice' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setMode('voice')}
          disabled={disabled || isRecording}
          className={cn(
            mode === 'voice' 
              ? 'bg-amber-500 text-black hover:bg-amber-400' 
              : 'border-amber-500/30 text-amber-200'
          )}
        >
          <Mic className="w-4 h-4 mr-1" />
          Voix
        </Button>
        <Button
          variant={mode === 'text' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setMode('text')}
          disabled={disabled || isRecording}
          className={cn(
            mode === 'text' 
              ? 'bg-amber-500 text-black hover:bg-amber-400' 
              : 'border-amber-500/30 text-amber-200'
          )}
        >
          <Keyboard className="w-4 h-4 mr-1" />
          Texte
        </Button>
      </div>

      {mode === 'voice' ? (
        <div className="flex flex-col items-center gap-4">
          <button
            onClick={isRecording ? stopRecording : startRecording}
            disabled={disabled}
            className={cn(
              "w-24 h-24 rounded-full flex items-center justify-center transition-all",
              isRecording 
                ? "bg-red-500 animate-pulse" 
                : "bg-gradient-to-br from-amber-400 to-amber-600 hover:from-amber-300 hover:to-amber-500",
              disabled && "opacity-50 cursor-not-allowed"
            )}
          >
            {isRecording ? (
              <MicOff className="w-10 h-10 text-white" />
            ) : (
              <Mic className="w-10 h-10 text-black" />
            )}
          </button>
          
          {isRecording ? (
            <div className="text-center">
              <p className="text-lg font-medium text-red-400">{formatTime(recordingTime)}</p>
              <p className="text-sm text-amber-200/60">Appuie pour arrêter</p>
            </div>
          ) : (
            <p className="text-sm text-amber-200/60 text-center">
              Appuie et raconte ton histoire
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <Textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Écris ton histoire ici..."
            disabled={disabled}
            className={cn(
              "min-h-[150px] resize-none",
              "bg-amber-950/30 border-amber-500/30",
              "text-amber-100 placeholder:text-amber-200/40",
              "focus:border-amber-500/50 focus:ring-amber-500/20"
            )}
          />
          <p className="text-xs text-amber-200/50 text-center">
            {value.length} caractères
          </p>
        </div>
      )}

      {value && mode === 'text' && (
        <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
          <p className="text-sm text-amber-200/80 line-clamp-3">{value}</p>
        </div>
      )}
    </div>
  );
}
