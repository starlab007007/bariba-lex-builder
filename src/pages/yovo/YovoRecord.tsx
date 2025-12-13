import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Mic, Square, Play, Pause, Trash2, Save, Share2, Clock, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useYovoAudioRecorder } from '@/hooks/useYovoAudioRecorder';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';

interface SavedRecording {
  id: string;
  name: string;
  audio_url: string;
  duration: number;
  created_at: string;
}

export default function YovoRecord() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [recordingName, setRecordingName] = useState('');
  const [savedRecordings, setSavedRecordings] = useState<SavedRecording[]>([]);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [loadingRecordings, setLoadingRecordings] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const {
    isRecording,
    isUploading,
    duration,
    audioUrl,
    startRecording,
    stopRecording,
    cancelRecording,
    reset
  } = useYovoAudioRecorder();

  useEffect(() => {
    if (user) {
      loadRecordings();
    } else {
      setLoadingRecordings(false);
    }
  }, [user]);

  const loadRecordings = async () => {
    if (!user) return;
    
    try {
      // For now, we'll use localStorage to store recording metadata
      // In a full implementation, you'd have a recordings table
      const stored = localStorage.getItem(`yovo_recordings_${user.id}`);
      if (stored) {
        setSavedRecordings(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Error loading recordings:', error);
    } finally {
      setLoadingRecordings(false);
    }
  };

  const handleStopRecording = async () => {
    const result = await stopRecording();
    if (result) {
      toast({
        title: 'Enregistrement terminé',
        description: `Durée: ${result.duration}s`
      });
    }
  };

  const handleSaveRecording = async () => {
    if (!user || !audioUrl) return;
    
    const newRecording: SavedRecording = {
      id: Date.now().toString(),
      name: recordingName || `Enregistrement ${savedRecordings.length + 1}`,
      audio_url: audioUrl,
      duration: duration,
      created_at: new Date().toISOString()
    };
    
    const updated = [newRecording, ...savedRecordings];
    setSavedRecordings(updated);
    localStorage.setItem(`yovo_recordings_${user.id}`, JSON.stringify(updated));
    
    toast({
      title: 'Enregistrement sauvegardé',
      description: newRecording.name
    });
    
    setRecordingName('');
    reset();
  };

  const handleDeleteRecording = (id: string) => {
    if (!user) return;
    
    const updated = savedRecordings.filter(r => r.id !== id);
    setSavedRecordings(updated);
    localStorage.setItem(`yovo_recordings_${user.id}`, JSON.stringify(updated));
    
    toast({
      title: 'Enregistrement supprimé'
    });
  };

  const playRecording = (recording: SavedRecording) => {
    if (playingId === recording.id) {
      audioRef.current?.pause();
      setPlayingId(null);
    } else {
      if (audioRef.current) {
        audioRef.current.src = recording.audio_url;
        audioRef.current.play();
        setPlayingId(recording.id);
        audioRef.current.onended = () => setPlayingId(null);
      }
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!user) {
    return (
      <div className="px-4 py-6 flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="w-20 h-20 bg-pink-500/20 rounded-full flex items-center justify-center mb-4">
          <Mic className="w-10 h-10 text-pink-400" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Connexion requise</h2>
        <p className="text-slate-400 mb-4">Connectez-vous pour enregistrer et sauvegarder vos vocaux</p>
        <Link to="/yovo/auth">
          <Button className="bg-gradient-to-r from-pink-500 to-rose-500">
            Se connecter
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 space-y-6">
      <audio ref={audioRef} className="hidden" />
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-2"
      >
        <div className="w-16 h-16 mx-auto bg-gradient-to-br from-pink-500 to-rose-500 rounded-2xl flex items-center justify-center mb-4">
          <Mic className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-white">Enregistrement</h2>
        <p className="text-slate-400">Studio vocal intégré</p>
      </motion.div>

      {/* Recording area */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="bg-gradient-to-br from-pink-500/20 to-rose-500/20 rounded-2xl p-6 border border-pink-500/20"
      >
        {/* Waveform visualization */}
        <div className="h-24 flex items-center justify-center gap-1 mb-6">
          {[...Array(50)].map((_, i) => (
            <motion.div
              key={i}
              className={`w-1 rounded-full ${isRecording ? 'bg-pink-500' : 'bg-slate-600'}`}
              animate={{
                height: isRecording
                  ? `${20 + Math.random() * 60}%`
                  : `${20 + Math.sin(i * 0.3) * 15}%`,
              }}
              transition={{ duration: 0.1 }}
            />
          ))}
        </div>

        {/* Timer */}
        <div className="text-center mb-6">
          <p className="text-4xl font-mono text-white">
            {formatDuration(duration)}
          </p>
          <p className="text-slate-500 text-sm mt-1">
            {isRecording ? 'Enregistrement...' : isUploading ? 'Sauvegarde...' : audioUrl ? 'Terminé' : 'Prêt à enregistrer'}
          </p>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-4">
          {!isRecording && !isUploading && !audioUrl ? (
            <Button
              size="lg"
              onClick={startRecording}
              className="w-20 h-20 rounded-full bg-gradient-to-br from-pink-500 to-rose-500 shadow-lg shadow-pink-500/30"
            >
              <Mic className="w-8 h-8 text-white" />
            </Button>
          ) : isRecording ? (
            <>
              <Button
                size="lg"
                onClick={handleStopRecording}
                className="w-20 h-20 rounded-full bg-red-500 hover:bg-red-600"
              >
                <Square className="w-8 h-8 text-white" />
              </Button>
              <Button
                size="icon"
                variant="outline"
                onClick={cancelRecording}
                className="w-14 h-14 rounded-full border-slate-600"
              >
                <Trash2 className="w-6 h-6 text-slate-400" />
              </Button>
            </>
          ) : isUploading ? (
            <div className="w-20 h-20 rounded-full bg-pink-500/50 flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-white animate-spin" />
            </div>
          ) : audioUrl ? (
            <Button
              size="lg"
              onClick={reset}
              className="w-20 h-20 rounded-full bg-gradient-to-br from-pink-500 to-rose-500 shadow-lg shadow-pink-500/30"
            >
              <Mic className="w-8 h-8 text-white" />
            </Button>
          ) : null}
        </div>
      </motion.div>

      {/* Save options */}
      {audioUrl && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3"
        >
          <Input
            placeholder="Nom de l'enregistrement..."
            value={recordingName}
            onChange={(e) => setRecordingName(e.target.value)}
            className="bg-slate-900/50 border-white/10 text-white"
          />
          <div className="flex gap-3">
            <Button 
              onClick={handleSaveRecording}
              className="flex-1 bg-pink-500 hover:bg-pink-600 gap-2"
            >
              <Save className="w-4 h-4" />
              Sauvegarder
            </Button>
            <Button variant="outline" className="flex-1 border-slate-600 gap-2">
              <Share2 className="w-4 h-4" />
              Partager
            </Button>
          </div>
        </motion.div>
      )}

      {/* Saved recordings */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <h3 className="text-lg font-semibold text-white mb-3">Mes Enregistrements</h3>
        {loadingRecordings ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 text-pink-400 animate-spin" />
          </div>
        ) : savedRecordings.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            Aucun enregistrement sauvegardé
          </div>
        ) : (
          <div className="space-y-3">
            {savedRecordings.map((recording, i) => (
              <motion.div
                key={recording.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + i * 0.05 }}
                className="bg-slate-900/50 p-4 rounded-xl border border-white/5 flex items-center gap-4"
              >
                <Button
                  size="icon"
                  onClick={() => playRecording(recording)}
                  className="w-12 h-12 rounded-full bg-pink-500 hover:bg-pink-600"
                >
                  {playingId === recording.id ? (
                    <Pause className="w-5 h-5 text-white" />
                  ) : (
                    <Play className="w-5 h-5 text-white ml-0.5" />
                  )}
                </Button>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium truncate">{recording.name}</p>
                  <div className="flex items-center gap-3 text-sm text-slate-500">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDuration(recording.duration)}
                    </span>
                    <span>{new Date(recording.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="icon" variant="ghost" className="text-slate-400">
                    <Share2 className="w-4 h-4" />
                  </Button>
                  <Button 
                    size="icon" 
                    variant="ghost" 
                    className="text-slate-400"
                    onClick={() => handleDeleteRecording(recording.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
