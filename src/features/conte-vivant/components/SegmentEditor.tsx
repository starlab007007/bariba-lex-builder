import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Mic, Square, Trash2, ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { SegmentDraft } from '../types/story.types';

interface SegmentEditorProps {
  segment: SegmentDraft;
  onChange: (updated: SegmentDraft) => void;
  label: string;
  showEndingOptions?: boolean;
  showChoiceOptions?: boolean;
}

const CHOICE_COLORS = ['#FF6B35', '#00D4AA', '#F5A623', '#A855F7', '#EC4899'];

export default function SegmentEditor({ segment, onChange, label, showEndingOptions, showChoiceOptions }: SegmentEditorProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        onChange({ ...segment, audio_blob: blob, audio_url: url, duration: 15 });
        stream.getTracks().forEach(t => t.stop());
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
    } catch (err) {
      console.error('Recording error:', err);
    }
  };

  const stopRecording = () => {
    mediaRecorder?.stop();
    setIsRecording(false);
    setMediaRecorder(null);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-3 p-4 rounded-2xl bg-card/50 border border-border/50"
    >
      <h4 className="font-semibold text-sm text-foreground">{label}</h4>

      {/* Title */}
      <Input
        value={segment.title}
        onChange={(e) => onChange({ ...segment, title: e.target.value })}
        placeholder="Titre du segment..."
        className="text-sm"
      />

      {/* Text content */}
      <textarea
        value={segment.text_content}
        onChange={(e) => onChange({ ...segment, text_content: e.target.value })}
        placeholder="Texte narratif du segment..."
        className="w-full h-20 px-3 py-2 rounded-md border border-input bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
      />

      {/* Media preview */}
      {segment.media_url && (
        <div className="flex items-center gap-2">
          <div className="w-12 h-[86px] rounded-lg overflow-hidden bg-black/20 flex-shrink-0">
            {segment.mediaType === 'video' ? (
              <video src={segment.media_url} className="w-full h-full object-cover" muted />
            ) : (
              <img src={segment.media_url} alt="" className="w-full h-full object-cover" />
            )}
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onChange({ ...segment, media_url: undefined, mediaType: undefined })}
          >
            <Trash2 className="w-3.5 h-3.5 text-destructive" />
          </Button>
        </div>
      )}

      {/* Media select placeholder */}
      {!segment.media_url && (
        <Button size="sm" variant="outline" className="gap-1.5" onClick={() => {/* TODO: open AssetGallery */}}>
          <ImageIcon className="w-3.5 h-3.5" />
          🖼️ Choisir un visuel
        </Button>
      )}

      {/* Audio */}
      <div className="flex items-center gap-2">
        {!isRecording ? (
          <Button size="sm" variant="outline" onClick={startRecording} className="gap-1.5">
            <Mic className="w-3.5 h-3.5" />
            🎙️ Audio
          </Button>
        ) : (
          <Button size="sm" variant="destructive" onClick={stopRecording} className="gap-1.5">
            <Square className="w-3.5 h-3.5" />
            Arrêter
          </Button>
        )}
        {segment.audio_url && (
          <div className="flex items-center gap-2 flex-1">
            <audio src={segment.audio_url} controls className="h-8 flex-1" />
            <Button
              size="icon"
              variant="ghost"
              className="w-7 h-7"
              onClick={() => onChange({ ...segment, audio_blob: undefined, audio_url: undefined })}
            >
              <Trash2 className="w-3.5 h-3.5 text-destructive" />
            </Button>
          </div>
        )}
      </div>

      {/* Ending options */}
      {showEndingOptions && (
        <div className="space-y-2 pt-2 border-t border-border/30">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={segment.is_ending}
              onChange={(e) => onChange({ ...segment, is_ending: e.target.checked })}
              className="rounded"
            />
            <span className="text-muted-foreground">C'est une fin</span>
          </label>
          {segment.is_ending && (
            <div className="flex gap-2">
              <Input
                value={segment.ending_badge ?? ''}
                onChange={(e) => onChange({ ...segment, ending_badge: e.target.value })}
                placeholder="Badge emoji (ex: ⚔️)"
                className="w-24 text-sm"
              />
              <Input
                value={segment.ending_title ?? ''}
                onChange={(e) => onChange({ ...segment, ending_title: e.target.value })}
                placeholder="Titre de la fin (ex: Le Guerrier)"
                className="flex-1 text-sm"
              />
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}
