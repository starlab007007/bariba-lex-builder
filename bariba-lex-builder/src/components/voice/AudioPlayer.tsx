import { useState, useRef, useEffect } from 'react';
import { Play, Pause, Square, Download, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';

interface AudioPlayerProps {
  audioUrl?: string;
  audioBase64?: string;
  mimeType?: string;
  title?: string;
  showDownload?: boolean;
  className?: string;
  compact?: boolean;
}

export const AudioPlayer = ({
  audioUrl,
  audioBase64,
  mimeType = 'audio/wav',
  title,
  showDownload = true,
  className,
  compact = false
}: AudioPlayerProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Create audio URL from base64 if provided
  const effectiveUrl = audioUrl || (audioBase64 ? `data:${mimeType};base64,${audioBase64}` : null);

  useEffect(() => {
    if (effectiveUrl && audioRef.current) {
      audioRef.current.src = effectiveUrl;
    }
  }, [effectiveUrl]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleDurationChange = () => setDuration(audio.duration || 0);
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('durationchange', handleDurationChange);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('durationchange', handleDurationChange);
      audio.removeEventListener('ended', handleEnded);
    };
  }, []);

  const togglePlay = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const stop = () => {
    if (!audioRef.current) return;
    audioRef.current.pause();
    audioRef.current.currentTime = 0;
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const handleSeek = (value: number[]) => {
    if (!audioRef.current) return;
    const newTime = value[0];
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handlePlaybackRateChange = () => {
    const rates = [0.5, 0.75, 1, 1.25, 1.5, 2];
    const currentIndex = rates.indexOf(playbackRate);
    const nextRate = rates[(currentIndex + 1) % rates.length];
    setPlaybackRate(nextRate);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextRate;
    }
  };

  const handleDownload = () => {
    if (!effectiveUrl) return;
    const link = document.createElement('a');
    link.href = effectiveUrl;
    link.download = title || 'audio';
    link.click();
  };

  const formatTime = (seconds: number): string => {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!effectiveUrl) {
    return null;
  }

  if (compact) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <audio ref={audioRef} />
        <Button
          size="sm"
          variant="ghost"
          onClick={togglePlay}
          className="h-8 w-8 p-0"
        >
          {isPlaying ? (
            <Pause className="h-4 w-4" />
          ) : (
            <Play className="h-4 w-4" />
          )}
        </Button>
        <span className="text-xs text-muted-foreground font-mono">
          {formatTime(currentTime)}/{formatTime(duration)}
        </span>
      </div>
    );
  }

  return (
    <div className={cn("bg-muted/30 rounded-lg p-4 space-y-3", className)}>
      <audio ref={audioRef} />
      
      {title && (
        <div className="flex items-center gap-2 text-sm font-medium">
          <Volume2 className="h-4 w-4 text-primary" />
          {title}
        </div>
      )}

      {/* Progress Slider */}
      <div className="space-y-1">
        <Slider
          value={[currentTime]}
          max={duration || 100}
          step={0.1}
          onValueChange={handleSeek}
          className="cursor-pointer"
        />
        <div className="flex justify-between text-xs text-muted-foreground font-mono">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-2">
        <Button size="sm" variant="outline" onClick={stop}>
          <Square className="h-4 w-4" />
        </Button>
        
        <Button size="icon" onClick={togglePlay}>
          {isPlaying ? (
            <Pause className="h-5 w-5" />
          ) : (
            <Play className="h-5 w-5" />
          )}
        </Button>

        <Button 
          size="sm" 
          variant="outline"
          onClick={handlePlaybackRateChange}
          className="min-w-12"
        >
          {playbackRate}x
        </Button>

        {showDownload && (
          <Button size="sm" variant="ghost" onClick={handleDownload}>
            <Download className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
};
