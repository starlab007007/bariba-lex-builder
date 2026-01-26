import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, Mic, Loader2 } from 'lucide-react';
import { TamTamMicButton } from './TamTamMicButton';

interface KuaishouBioPlayerProps {
  bioAudioUrl: string | null;
  bioTranscript?: string | null;
  isOwnProfile?: boolean;
  isProcessing?: boolean;
  onRecordBio?: (result: {
    audioBase64: string;
    transcription?: string;
    translation?: string;
    sourceLang: 'ba' | 'fr';
  }) => void;
  sourceLang?: 'ba' | 'fr';
}

export const KuaishouBioPlayer: React.FC<KuaishouBioPlayerProps> = ({
  bioAudioUrl,
  bioTranscript,
  isOwnProfile = false,
  isProcessing = false,
  onRecordBio,
  sourceLang = 'fr',
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handlePlayPause = async () => {
    if (!bioAudioUrl) return;

    if (isPlaying && audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
    } else {
      setIsPlaying(true);
      audioRef.current = new Audio(bioAudioUrl);
      audioRef.current.onended = () => setIsPlaying(false);
      audioRef.current.onerror = () => setIsPlaying(false);
      await audioRef.current.play();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="px-4 mt-4"
    >
      <div className="bg-white rounded-2xl border border-[hsl(var(--kuaishou-border))] p-3 flex items-center gap-3">
        {/* Play button / Audio bar */}
        <button
          onClick={handlePlayPause}
          disabled={!bioAudioUrl}
          className="flex-1 h-12 bg-[hsl(var(--kuaishou-bg))] rounded-xl flex items-center justify-center gap-3 transition-colors hover:bg-[hsl(var(--kuaishou-primary)/0.1)] disabled:opacity-50"
        >
          {isPlaying ? (
            <div className="flex items-center gap-2">
              <Pause className="w-5 h-5 text-[hsl(var(--kuaishou-primary))]" />
              <div className="flex gap-0.5">
                {[...Array(12)].map((_, i) => (
                  <motion.div
                    key={i}
                    animate={{ height: [4, 16, 4] }}
                    transition={{ duration: 0.4, repeat: Infinity, delay: i * 0.05 }}
                    className="w-0.5 bg-[hsl(var(--kuaishou-primary))] rounded-full"
                  />
                ))}
              </div>
            </div>
          ) : (
            <>
              <Play
                className={`w-5 h-5 ${bioAudioUrl ? 'text-[hsl(var(--kuaishou-primary))]' : 'text-muted-foreground'}`}
                fill="currentColor"
              />
              <span className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
                <Mic className="w-4 h-4" />
                Bio audio
              </span>
            </>
          )}
        </button>

        {/* Record button (own profile only) */}
        {isOwnProfile && onRecordBio && (
          <TamTamMicButton
            size="sm"
            onRecordingComplete={onRecordBio}
            autoTranscribe={true}
            autoTranslate={true}
            sourceLang={sourceLang}
            disabled={isProcessing}
          />
        )}
      </div>

      {/* Transcript preview */}
      {bioTranscript && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-2 px-2 text-xs text-muted-foreground italic line-clamp-2"
        >
          "{bioTranscript}"
        </motion.p>
      )}
    </motion.div>
  );
};

export default KuaishouBioPlayer;
