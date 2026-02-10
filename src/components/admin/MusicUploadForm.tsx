/**
 * Music Upload Form - Upload music tracks to music_library_tracks
 * With automatic AI-powered classification and filename parsing
 */

import { useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Upload, Music2, Loader2, Play, Pause, X, Sparkles } from 'lucide-react';
import { analyzeMusicFile, type MusicSuggestions } from '@/utils/assetAnalyzer';

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

/** Small AI badge indicator */
function AiBadge() {
  return (
    <Badge variant="secondary" className="ml-2 text-[10px] px-1.5 py-0 gap-1 font-normal">
      <Sparkles className="h-2.5 w-2.5" />
      IA
    </Badge>
  );
}

export function MusicUploadForm() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [duration, setDuration] = useState<number>(0);

  // AI analysis state
  const [analyzing, setAnalyzing] = useState(false);
  const [aiFields, setAiFields] = useState<Set<string>>(new Set());

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

  const applySuggestions = (suggestions: MusicSuggestions) => {
    const touched = new Set<string>();

    if (suggestions.title) { setTitle(suggestions.title); touched.add('title'); }
    if (suggestions.artist) { setArtist(suggestions.artist); touched.add('artist'); }
    if (suggestions.category) { setCategory(suggestions.category); touched.add('category'); }
    if (suggestions.mood) { setMood(suggestions.mood); touched.add('mood'); }
    if (suggestions.tags?.length) { setTags(suggestions.tags.join(', ')); touched.add('tags'); }
    if (suggestions.description_fr) { setDescriptionFr(suggestions.description_fr); touched.add('descriptionFr'); }

    setAiFields(touched);
  };

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
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
    let extractedDuration = 0;
    const audio = new Audio(url);
    audio.addEventListener('loadedmetadata', () => {
      extractedDuration = Math.round(audio.duration);
      setDuration(extractedDuration);
    });

    // Wait briefly for duration, then trigger AI analysis
    setAnalyzing(true);
    setAiFields(new Set());

    // Give audio a moment to load metadata
    await new Promise(resolve => setTimeout(resolve, 500));
    if (!extractedDuration && audio.duration) {
      extractedDuration = Math.round(audio.duration);
      setDuration(extractedDuration);
    }

    try {
      const suggestions = await analyzeMusicFile(f, extractedDuration);
      if (Object.keys(suggestions).length > 0) {
        applySuggestions(suggestions);
        toast({ title: '🤖 Analyse IA terminée', description: 'Métadonnées pré-remplies.' });
      }
    } catch (err) {
      console.warn('Music AI analysis failed:', err);
    } finally {
      setAnalyzing(false);
    }
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
    setAiFields(new Set());
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

      const { error: uploadError } = await supabase.storage
        .from('anime-library')
        .upload(storagePath, file, { contentType: file.type });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('anime-library')
        .getPublicUrl(storagePath);

      const parsedTags = tags
        .split(',')
        .map(t => t.trim())
        .filter(Boolean);

      // Build full AI metadata for centralized storage
      const aiMetadata = {
        title,
        artist: artist || 'TAM-TAM',
        category,
        mood,
        bpm: bpm ? parseInt(bpm) : null,
        duration: duration || 0,
        tags: parsedTags,
        description_fr: descriptionFr || null,
        ai_suggested_fields: Array.from(aiFields),
      };

      const { error: insertError } = await supabase
        .from('music_library_tracks')
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

      // Record in asset_imports (non-blocking)
      try {
        await supabase
          .from('asset_imports')
          .insert({
            category: 'music',
            original_name: file.name,
            target_name: fileName,
            file_size: file.size,
            mime_type: file.type,
            storage_path: storagePath,
            public_url: urlData.publicUrl,
            status: 'completed',
            original_format: ext,
            ai_metadata: aiMetadata,
            ai_analysis_status: aiFields.size > 0 ? 'completed' : 'skipped',
            ai_confidence: aiFields.size > 0 ? (aiFields.size / 6) : null,
          });
      } catch (importErr) {
        console.warn('asset_imports record failed (non-fatal):', importErr);
      }

      toast({ title: '🎵 Musique ajoutée !', description: `"${title}" est maintenant dans la bibliothèque.` });
      resetForm();
    } catch (error: any) {
      console.error('Music upload error:', error);
      toast({ title: 'Erreur', description: error?.message || "Échec de l'upload", variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Audio preview element */}
      {previewUrl && (
        <audio ref={audioRef} src={previewUrl} onEnded={() => setIsPlaying(false)} />
      )}

      {/* AI Analysis Banner */}
      {analyzing && (
        <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/10 border border-primary/20 animate-pulse">
          <Sparkles className="h-5 w-5 text-primary animate-spin" />
          <span className="text-sm font-medium text-primary">Analyse IA en cours...</span>
        </div>
      )}

      {aiFields.size > 0 && !analyzing && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/5 border border-primary/15">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-xs text-muted-foreground">
            {aiFields.size} champs pré-remplis par l'IA. Vous pouvez les modifier.
          </span>
        </div>
      )}

      {/* File Upload Zone */}
      <div
        onClick={() => !analyzing && fileRef.current?.click()}
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
          <Label className="flex items-center">
            Titre *
            {aiFields.has('title') && <AiBadge />}
          </Label>
          {analyzing ? (
            <Skeleton className="h-10 w-full mt-1" />
          ) : (
            <Input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Tambours de fête"
              className={aiFields.has('title') ? 'border-primary/40 bg-primary/5' : ''}
            />
          )}
        </div>
        <div>
          <Label className="flex items-center">
            Artiste
            {aiFields.has('artist') && <AiBadge />}
          </Label>
          {analyzing ? (
            <Skeleton className="h-10 w-full mt-1" />
          ) : (
            <Input
              value={artist}
              onChange={e => setArtist(e.target.value)}
              placeholder="TAM-TAM"
              className={aiFields.has('artist') ? 'border-primary/40 bg-primary/5' : ''}
            />
          )}
        </div>
      </div>

      {/* Category & Mood */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="flex items-center">
            Catégorie
            {aiFields.has('category') && <AiBadge />}
          </Label>
          {analyzing ? (
            <Skeleton className="h-10 w-full mt-1" />
          ) : (
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className={aiFields.has('category') ? 'border-primary/40 bg-primary/5' : ''}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.emoji} {c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        <div>
          <Label className="flex items-center">
            Humeur
            {aiFields.has('mood') && <AiBadge />}
          </Label>
          {analyzing ? (
            <Skeleton className="h-10 w-full mt-1" />
          ) : (
            <Select value={mood} onValueChange={setMood}>
              <SelectTrigger className={aiFields.has('mood') ? 'border-primary/40 bg-primary/5' : ''}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MOODS.map(m => (
                  <SelectItem key={m.id} value={m.id}>{m.emoji} {m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
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
          <Label className="flex items-center">
            Tags (séparés par virgules)
            {aiFields.has('tags') && <AiBadge />}
          </Label>
          {analyzing ? (
            <Skeleton className="h-10 w-full mt-1" />
          ) : (
            <Input
              value={tags}
              onChange={e => setTags(e.target.value)}
              placeholder="percussion, danse, énergie"
              className={aiFields.has('tags') ? 'border-primary/40 bg-primary/5' : ''}
            />
          )}
        </div>
      </div>

      {/* Description */}
      <div>
        <Label className="flex items-center">
          Description
          {aiFields.has('descriptionFr') && <AiBadge />}
        </Label>
        {analyzing ? (
          <Skeleton className="h-10 w-full mt-1" />
        ) : (
          <Input
            value={descriptionFr}
            onChange={e => setDescriptionFr(e.target.value)}
            placeholder="Rythme traditionnel de tambours pour les contes..."
            className={aiFields.has('descriptionFr') ? 'border-primary/40 bg-primary/5' : ''}
          />
        )}
      </div>

      {/* Submit */}
      <Button
        onClick={handleSubmit}
        disabled={uploading || analyzing || !file || !title}
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
