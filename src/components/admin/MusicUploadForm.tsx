/**
 * Music Upload Form - Upload music tracks to music_library_tracks
 */

import { useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Upload, Music2, Loader2, Play, Pause, X } from 'lucide-react';

const CATEGORIES = [
  { id: 'traditional', label: 'Traditionnel', emoji: '🥁' },
  { id: 'educational', label: 'Éducatif', emoji: '📚' },
  { id: 'ambient', label: 'Ambiance', emoji: '🌿' },
  { id: 'celebration', label: 'Célébration', emoji: '🎉' },
  { id: 'nature', label: 'Nature', emoji: '🌳' },
] as const;

const MOODS = [
  { id: 'energetic', label: 'Énergique', emoji: '⚡' },
  { id: 'calm', label: 'Calme', emoji: '🧘' },
  { id: 'joyful', label: 'Joyeux', emoji: '😊' },
  { id: 'reflective', label: 'Réflexif', emoji: '🤔' },
  { id: 'motivating', label: 'Motivant', emoji: '💪' },
] as const;

export function MusicUploadForm() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [duration, setDuration] = useState<number>(0);

  // Fields
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [category, setCategory] = useState('traditional');
  const [mood, setMood] = useState('calm');
  const [bpm, setBpm] = useState('');
  const [tags, setTags] = useState('');
  const [descriptionFr, setDescriptionFr] = useState('');

  const fileRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 10 * 1024 * 1024) {
      toast({ title: 'Fichier trop volumineux', description: 'Max 10 Mo', variant: 'destructive' });
      return;
    }
    setFile(f);
    const url = URL.createObjectURL(f);
    setPreviewUrl(url);

    // Extract duration via Audio API
    const audio = new Audio(url);
    audio.addEventListener('loadedmetadata', () => {
      setDuration(Math.round(audio.duration));
    });

    // Auto-fill title from filename
    if (!title) {
      const name = f.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
      setTitle(name.charAt(0).toUpperCase() + name.slice(1));
    }
  }, [title]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const resetForm = () => {
    setFile(null);
    setPreviewUrl(null);
    setIsPlaying(false);
    setDuration(0);
    setTitle('');
    setArtist('');
    setBpm('');
    setTags('');
    setDescriptionFr('');
    if (fileRef.current) fileRef.current.value = '';
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
    }
  };

  const formatDuration = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleSubmit = async () => {
    if (!file || !title) {
      toast({ title: 'Champs requis', description: 'Fichier et titre sont obligatoires.', variant: 'destructive' });
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const storagePath = `music/${category}/${fileName}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('anime-library')
        .upload(storagePath, file, { contentType: file.type });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('anime-library')
        .getPublicUrl(storagePath);

      // Parse tags
      const parsedTags = tags
        .split(',')
        .map(t => t.trim())
        .filter(Boolean);

      // Insert into music_library_tracks
      const { error: insertError } = await supabase
        .from('music_library_tracks' as any)
        .insert({
          title,
          artist: artist || 'TAM-TAM',
          category,
          mood,
          duration: duration || 0,
          bpm: bpm ? parseInt(bpm) : null,
          description_fr: descriptionFr || null,
          tags: parsedTags,
          audio_url: urlData.publicUrl,
          storage_path: storagePath,
        });

      if (insertError) throw insertError;

      toast({ title: '🎵 Musique ajoutée !', description: `"${title}" est maintenant dans la bibliothèque.` });
      resetForm();
    } catch (error: any) {
      console.error('Music upload error:', error);
      toast({ title: 'Erreur', description: error.message || 'Échec de l\'upload', variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Audio preview element */}
      {previewUrl && (
        <audio
          ref={audioRef}
          src={previewUrl}
          onEnded={() => setIsPlaying(false)}
        />
      )}

      {/* File Upload Zone */}
      <div
        onClick={() => fileRef.current?.click()}
        className="border-2 border-dashed border-muted-foreground/25 rounded-xl p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
      >
        <input ref={fileRef} type="file" accept=".mp3,.ogg,.wav" className="hidden" onChange={handleFileChange} />
        {file ? (
          <div className="space-y-3">
            <div className="flex items-center justify-center gap-3">
              <Button
                size="icon"
                variant="outline"
                className="h-12 w-12 rounded-full"
                onClick={(e) => { e.stopPropagation(); togglePlay(); }}
              >
                {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" />}
              </Button>
              <div className="text-left">
                <p className="font-medium text-sm">{file.name}</p>
                <p className="text-muted-foreground text-xs">
                  {(file.size / (1024 * 1024)).toFixed(1)} Mo • {formatDuration(duration)}
                </p>
              </div>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                onClick={(e) => { e.stopPropagation(); resetForm(); }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <Music2 className="h-10 w-10 mx-auto text-muted-foreground" />
            <p className="text-muted-foreground text-sm">Cliquez pour sélectionner un fichier audio</p>
            <p className="text-muted-foreground/60 text-xs">MP3, OGG, WAV • Max 10 Mo</p>
          </div>
        )}
      </div>

      {/* Title & Artist */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Titre *</Label>
          <Input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Tambours de fête"
          />
        </div>
        <div>
          <Label>Artiste</Label>
          <Input
            value={artist}
            onChange={e => setArtist(e.target.value)}
            placeholder="TAM-TAM"
          />
        </div>
      </div>

      {/* Category & Mood */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Catégorie</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {CATEGORIES.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.emoji} {c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Humeur</Label>
          <Select value={mood} onValueChange={setMood}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {MOODS.map(m => (
                <SelectItem key={m.id} value={m.id}>{m.emoji} {m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* BPM & Tags */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>BPM (optionnel)</Label>
          <Input
            type="number"
            value={bpm}
            onChange={e => setBpm(e.target.value)}
            placeholder="120"
            min="40"
            max="300"
          />
        </div>
        <div>
          <Label>Tags (séparés par virgules)</Label>
          <Input
            value={tags}
            onChange={e => setTags(e.target.value)}
            placeholder="percussion, danse, énergie"
          />
        </div>
      </div>

      {/* Description */}
      <div>
        <Label>Description</Label>
        <Input
          value={descriptionFr}
          onChange={e => setDescriptionFr(e.target.value)}
          placeholder="Rythme traditionnel de tambours pour les contes..."
        />
      </div>

      {/* Submit */}
      <Button
        onClick={handleSubmit}
        disabled={uploading || !file || !title}
        className="w-full"
        size="lg"
      >
        {uploading ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Upload en cours...
          </>
        ) : (
          <>
            <Upload className="h-4 w-4 mr-2" />
            Ajouter la musique
          </>
        )}
      </Button>
    </div>
  );
}
