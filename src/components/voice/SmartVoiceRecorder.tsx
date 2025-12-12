import { useState, useEffect, useCallback } from 'react';
import { Mic, MicOff, Square, Pause, Play, Loader2, Zap, Hand } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import { useVoiceDetection } from '@/hooks/useVoiceDetection';
import { cn } from '@/lib/utils';

export type SpeakerType = 'Auto' | 'Enfant' | 'Femme' | 'Homme' | 'PersonneAgee';

interface SmartVoiceRecorderProps {
  onRecordingComplete: (audioBase64: string) => void;
  onRecordingStart?: () => void;
  language?: 'bariba' | 'french';
  showSpeakerType?: boolean;
  disabled?: boolean;
  className?: string;
}

export const SmartVoiceRecorder = ({
  onRecordingComplete,
  onRecordingStart,
  language = 'bariba',
  showSpeakerType = true,
  disabled = false,
  className
}: SmartVoiceRecorderProps) => {
  const [speakerType, setSpeakerType] = useState<SpeakerType>('Auto');
  const [isProcessing, setIsProcessing] = useState(false);
  const [autoMode, setAutoMode] = useState(true);
  const [isAutoListening, setIsAutoListening] = useState(false);
  
  const {
    isRecording,
    isPaused,
    duration,
    error,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    cancelRecording
  } = useAudioRecorder();

  const {
    isDetecting,
    isSpeaking,
    startDetection,
    stopDetection,
    sensitivity,
    setSensitivity,
    onSpeechStart,
    onSpeechEnd
  } = useVoiceDetection();

  // Auto mode: Start recording when speech is detected
  const handleAutoSpeechStart = useCallback(async () => {
    console.log('[SmartVoiceRecorder] Speech detected, starting recording');
    if (!isRecording && isAutoListening) {
      await startRecording();
      onRecordingStart?.();
    }
  }, [isRecording, isAutoListening, startRecording, onRecordingStart]);

  // Auto mode: Stop recording when silence is detected
  const handleAutoSpeechEnd = useCallback(async (speechDuration: number) => {
    console.log('[SmartVoiceRecorder] Silence detected after', speechDuration, 'ms');
    if (isRecording && isAutoListening && speechDuration >= 500) {
      setIsProcessing(true);
      const audioBase64 = await stopRecording();
      setIsProcessing(false);
      
      if (audioBase64) {
        console.log('[SmartVoiceRecorder] Sending audio automatically');
        onRecordingComplete(audioBase64);
      }
    }
  }, [isRecording, isAutoListening, stopRecording, onRecordingComplete]);

  // Register VAD callbacks
  useEffect(() => {
    onSpeechStart(handleAutoSpeechStart);
    onSpeechEnd(handleAutoSpeechEnd);
  }, [onSpeechStart, onSpeechEnd, handleAutoSpeechStart, handleAutoSpeechEnd]);

  // Toggle auto listening mode
  const toggleAutoListening = async () => {
    if (isAutoListening) {
      console.log('[SmartVoiceRecorder] Stopping auto listening');
      stopDetection();
      if (isRecording) {
        cancelRecording();
      }
      setIsAutoListening(false);
    } else {
      console.log('[SmartVoiceRecorder] Starting auto listening');
      try {
        await startDetection();
        setIsAutoListening(true);
      } catch (err) {
        console.error('[SmartVoiceRecorder] Failed to start detection:', err);
      }
    }
  };

  // Manual mode handlers
  const handleManualStart = async () => {
    await startRecording();
    onRecordingStart?.();
  };

  const handleManualStop = async () => {
    setIsProcessing(true);
    const audioBase64 = await stopRecording();
    setIsProcessing(false);
    
    if (audioBase64) {
      onRecordingComplete(audioBase64);
    }
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isAutoListening) {
        stopDetection();
      }
    };
  }, [isAutoListening, stopDetection]);

  return (
    <div className={cn("flex flex-col items-center gap-4", className)}>
      {/* Mode Toggle */}
      <div className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg w-full justify-center">
        <div className="flex items-center gap-2">
          <Hand className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm">Manuel</span>
        </div>
        <Switch
          checked={autoMode}
          onCheckedChange={setAutoMode}
          disabled={isRecording || isAutoListening || disabled}
        />
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-primary" />
          <span className="text-sm">Auto</span>
        </div>
      </div>

      {/* Speaker Type Selector (for Bariba) */}
      {showSpeakerType && language === 'bariba' && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Type de voix:</span>
          <Select
            value={speakerType}
            onValueChange={(value) => setSpeakerType(value as SpeakerType)}
            disabled={isRecording || disabled || isAutoListening}
          >
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Auto">Auto</SelectItem>
              <SelectItem value="Enfant">Enfant</SelectItem>
              <SelectItem value="Femme">Femme</SelectItem>
              <SelectItem value="Homme">Homme</SelectItem>
              <SelectItem value="PersonneAgee">Personne âgée</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Sensitivity Slider (Auto mode) */}
      {autoMode && (
        <div className="w-full max-w-xs space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground">Sensibilité</Label>
            <span className="text-xs text-muted-foreground">{sensitivity}%</span>
          </div>
          <Slider
            value={[sensitivity]}
            onValueChange={([value]) => setSensitivity(value)}
            min={10}
            max={100}
            step={5}
            disabled={isAutoListening || disabled}
          />
        </div>
      )}

      {/* Recording Button */}
      <div className="relative">
        {(isRecording || (isAutoListening && isSpeaking)) && (
          <div className="absolute inset-0 -m-2 rounded-full animate-ping bg-destructive/30" />
        )}
        
        {autoMode ? (
          // Auto Mode Button
          <Button
            size="lg"
            variant={isAutoListening ? (isSpeaking ? "destructive" : "default") : "outline"}
            className={cn(
              "w-20 h-20 rounded-full transition-all",
              isAutoListening && isSpeaking && "ring-4 ring-destructive/50",
              isAutoListening && !isSpeaking && "ring-4 ring-primary/50"
            )}
            onClick={toggleAutoListening}
            disabled={disabled || isProcessing}
          >
            {isProcessing ? (
              <Loader2 className="h-8 w-8 animate-spin" />
            ) : isAutoListening ? (
              isSpeaking ? <Square className="h-8 w-8" /> : <Mic className="h-8 w-8 animate-pulse" />
            ) : (
              <Mic className="h-8 w-8" />
            )}
          </Button>
        ) : (
          // Manual Mode Button
          <Button
            size="lg"
            variant={isRecording ? "destructive" : "default"}
            className={cn(
              "w-20 h-20 rounded-full transition-all",
              isRecording && "ring-4 ring-destructive/50"
            )}
            onClick={isRecording ? handleManualStop : handleManualStart}
            disabled={disabled || isProcessing}
          >
            {isProcessing ? (
              <Loader2 className="h-8 w-8 animate-spin" />
            ) : isRecording ? (
              <Square className="h-8 w-8" />
            ) : (
              <Mic className="h-8 w-8" />
            )}
          </Button>
        )}
      </div>

      {/* Recording Controls (Manual mode only) */}
      {!autoMode && isRecording && (
        <div className="flex items-center gap-3">
          <Button
            size="sm"
            variant="outline"
            onClick={isPaused ? resumeRecording : pauseRecording}
          >
            {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
          </Button>
          
          <Badge variant="secondary" className="font-mono text-lg px-4 py-1">
            {formatDuration(duration)}
          </Badge>
          
          <Button
            size="sm"
            variant="ghost"
            onClick={cancelRecording}
          >
            <MicOff className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Duration Display (Auto mode while recording) */}
      {autoMode && isRecording && (
        <Badge variant="secondary" className="font-mono text-lg px-4 py-1">
          {formatDuration(duration)}
        </Badge>
      )}

      {/* Status */}
      <div className="text-center space-y-1">
        {autoMode ? (
          isAutoListening ? (
            isRecording ? (
              <p className="text-sm text-destructive font-medium">
                🔴 Enregistrement... (envoi auto après silence)
              </p>
            ) : (
              <p className="text-sm text-primary">
                👂 Écoute active - Parlez maintenant
              </p>
            )
          ) : isProcessing ? (
            <p className="text-sm text-muted-foreground">Envoi en cours...</p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Appuyez pour activer l'écoute automatique
            </p>
          )
        ) : (
          isRecording ? (
            <p className="text-sm text-muted-foreground">
              {isPaused ? 'En pause...' : 'Enregistrement en cours...'}
            </p>
          ) : isProcessing ? (
            <p className="text-sm text-muted-foreground">Traitement audio...</p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Appuyez pour parler en {language === 'bariba' ? 'Bààtɔ̀nú' : 'Français'}
            </p>
          )
        )}
        
        <p className="text-xs text-muted-foreground">
          Mode: {autoMode ? '⚡ Automatique' : '✋ Manuel'}
        </p>
      </div>

      {/* Error Display */}
      {error && (
        <div className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
          {error}
        </div>
      )}
    </div>
  );
};
