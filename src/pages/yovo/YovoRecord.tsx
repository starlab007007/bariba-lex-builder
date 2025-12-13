import { useState } from 'react';
import { motion } from 'framer-motion';
import { Mic, Square, Play, Pause, Trash2, Save, Share2, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const savedRecordings = [
  { id: '1', name: 'Note vocale 1', duration: 45, date: '12 Dec 2024' },
  { id: '2', name: 'Idée business', duration: 120, date: '10 Dec 2024' },
  { id: '3', name: 'Mémo santé', duration: 30, date: '8 Dec 2024' },
];

export default function YovoRecord() {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [duration, setDuration] = useState(0);
  const [playingId, setPlayingId] = useState<string | null>(null);

  return (
    <div className="px-4 py-6 space-y-6">
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
            {Math.floor(duration / 60).toString().padStart(2, '0')}:
            {(duration % 60).toString().padStart(2, '0')}
          </p>
          <p className="text-slate-500 text-sm mt-1">
            {isRecording ? (isPaused ? 'En pause' : 'Enregistrement...') : 'Prêt à enregistrer'}
          </p>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-4">
          {!isRecording ? (
            <Button
              size="lg"
              onClick={() => setIsRecording(true)}
              className="w-20 h-20 rounded-full bg-gradient-to-br from-pink-500 to-rose-500 shadow-lg shadow-pink-500/30"
            >
              <Mic className="w-8 h-8 text-white" />
            </Button>
          ) : (
            <>
              <Button
                size="icon"
                variant="outline"
                onClick={() => setIsPaused(!isPaused)}
                className="w-14 h-14 rounded-full border-slate-600"
              >
                {isPaused ? (
                  <Play className="w-6 h-6 text-white ml-0.5" />
                ) : (
                  <Pause className="w-6 h-6 text-white" />
                )}
              </Button>
              <Button
                size="lg"
                onClick={() => {
                  setIsRecording(false);
                  setIsPaused(false);
                }}
                className="w-20 h-20 rounded-full bg-red-500 hover:bg-red-600"
              >
                <Square className="w-8 h-8 text-white" />
              </Button>
              <Button
                size="icon"
                variant="outline"
                className="w-14 h-14 rounded-full border-slate-600"
              >
                <Trash2 className="w-6 h-6 text-slate-400" />
              </Button>
            </>
          )}
        </div>
      </motion.div>

      {/* Save options */}
      {!isRecording && duration > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3"
        >
          <Input
            placeholder="Nom de l'enregistrement..."
            className="bg-slate-900/50 border-white/10 text-white"
          />
          <div className="flex gap-3">
            <Button className="flex-1 bg-pink-500 hover:bg-pink-600 gap-2">
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
                onClick={() => setPlayingId(playingId === recording.id ? null : recording.id)}
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
                    {Math.floor(recording.duration / 60)}:{(recording.duration % 60).toString().padStart(2, '0')}
                  </span>
                  <span>{recording.date}</span>
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="icon" variant="ghost" className="text-slate-400">
                  <Share2 className="w-4 h-4" />
                </Button>
                <Button size="icon" variant="ghost" className="text-slate-400">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
