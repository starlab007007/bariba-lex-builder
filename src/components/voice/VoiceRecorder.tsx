import { useState } from 'react';
import { Mic, Square, Pause, Play, Loader2, Send, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import { cn } from '@/lib/utils';

export type SpeakerType = 'Auto' | 'Enfant' | 'Femme' | 'Homme' | 'PersonneAgee';

interface VoiceRecorderProps {
  onRecordingComplete: (audioBase64: string) => void;
  onRecordingStart?: () => void;
  language?: 'bariba' | 'french';
  showSpeakerType?: boolean;
  disabled?: boolean;
  className?: string;
}

export const VoiceRecorder = ({
  onRecordingComplete,
  onRecordingStart,
  language = 'bariba',
  showSpeakerType = true,
  disabled = false,
  className
}: VoiceRecorderProps) => {
  const [speakerType, setSpeakerType] = useState<SpeakerType>('Auto');
  const [isProcessing, setIsProcessing] = useState(false);
  
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

  const handleStartRecording = async () => {
    await startRecording();
    onRecordingStart?.();
  };

  const handleSendRecording = async () => {
    setIsProcessing(true);
    const audioBase64 = await stopRecording();
    setIsProcessing(false);
    
    if (audioBase64) {
      onRecordingComplete(audioBase64);
    }
  };

  const handleCancelRecording = () => {
    cancelRecording();
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className={cn("flex flex-col items-center gap-4", className)}>
      {/* Speaker Type Selector (for Bariba) */}
      {showSpeakerType && language === 'bariba' && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Type de voix:</span>
          <Select
            value={speakerType}
            onValueChange={(value) => setSpeakerType(value as SpeakerType)}
            disabled={isRecording || disabled}
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

      {/* Recording Button */}
      <div className="relative">
        {isRecording && !isPaused && (
          <div className="absolute inset-0 -m-2 rounded-full animate-ping bg-destructive/30" />
        )}
        
        <Button
          size="lg"
          variant={isRecording ? "destructive" : "default"}
          className={cn(
            "w-20 h-20 rounded-full transition-all",
            isRecording && "ring-4 ring-destructive/50"
          )}
          onClick={isRecording ? handleSendRecording : handleStartRecording}
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
      </div>

      {/* Recording Controls */}
      {isRecording && (
        <div className="flex items-center gap-3">
          <Button
            size="sm"
            variant="destructive"
            onClick={handleCancelRecording}
            disabled={isProcessing}
          >
            <X className="h-4 w-4 mr-1" />
            Annuler
          </Button>
          
          <Button
            size="sm"
            variant="outline"
            onClick={isPaused ? resumeRecording : pauseRecording}
            disabled={isProcessing}
          >
            {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
            <span className="ml-1">{isPaused ? 'Reprendre' : 'Pause'}</span>
          </Button>
          
          <Badge variant="secondary" className="font-mono text-lg px-4 py-1">
            {formatDuration(duration)}
          </Badge>
          
          <Button
            size="sm"
            variant="default"
            onClick={handleSendRecording}
            disabled={isProcessing}
            className="bg-primary hover:bg-primary/90"
          >
            <Send className="h-4 w-4 mr-1" />
            Envoyer
          </Button>
        </div>
      )}

      {/* Status */}
      <div className="text-center">
        {isRecording ? (
          <p className="text-sm text-muted-foreground">
            {isPaused ? '⏸️ En pause...' : '🔴 Enregistrement en cours...'}
          </p>
        ) : isProcessing ? (
          <p className="text-sm text-muted-foreground">📤 Envoi en cours...</p>
        ) : (
          <p className="text-sm text-muted-foreground">
            Appuyez pour parler en {language === 'bariba' ? 'Bààtɔ̀nú' : 'Français'}
          </p>
        )}
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
