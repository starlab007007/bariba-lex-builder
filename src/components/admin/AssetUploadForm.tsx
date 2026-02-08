/**
 * Asset Upload Form - Upload photos and videos to anime_scene_library
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
import { Upload, X, Image, Video, Loader2, Eye } from 'lucide-react';

const STYLES = ['african', 'fantasy', 'manga', 'chibi'] as const;
const EMOTIONS = ['joy', 'sadness', 'wonder', 'fear', 'excitement', 'peace', 'tension'] as const;
const SCENES = ['village', 'forest', 'river', 'mountain', 'market', 'home', 'night', 'journey', 'gathering', 'spirit'] as const;
const CHARACTERS = ['child_boy', 'child_girl', 'elder', 'animal', 'spirit', 'group'] as const;
const ACTIONS = ['standing', 'walking', 'talking', 'dancing', 'working', 'sleeping', 'running', 'discovering'] as const;
const TIME_OF_DAY = ['day', 'night', 'dawn', 'dusk'] as const;

const LABELS: Record<string, string> = {
  african: 'Africain', fantasy: 'Fantasy', manga: 'Manga', chibi: 'Chibi',
  joy: 'Joie', sadness: 'Tristesse', wonder: 'Émerveillement', fear: 'Peur',
  excitement: 'Excitation', peace: 'Paix', tension: 'Tension',
  village: 'Village', forest: 'Forêt', river: 'Rivière', mountain: 'Montagne',
  market: 'Marché', home: 'Maison', night: 'Nuit', journey: 'Voyage',
  gathering: 'Rassemblement', spirit: 'Esprit',
  child_boy: 'Garçon', child_girl: 'Fille', elder: 'Ancien', animal: 'Animal',
  group: 'Groupe',
  standing: 'Debout', walking: 'Marche', talking: 'Parle', dancing: 'Danse',
  working: 'Travail', sleeping: 'Dort', running: 'Court', discovering: 'Découvre',
  day: 'Jour', dawn: 'Aube', dusk: 'Crépuscule',
};

export function AssetUploadForm() {
  const [assetType, setAssetType] = useState<'photo' | 'video'>('photo');
  const [file, setFile] = useState<File | null>(null);
  const [thumbnail, setThumbnail] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  // Classification fields
  const [style, setStyle] = useState('african');
  const [emotion, setEmotion] = useState('joy');
  const [sceneType, setSceneType] = useState('village');
  const [characterType, setCharacterType] = useState('child_boy');
  const [action, setAction] = useState('standing');
  const [timeOfDay, setTimeOfDay] = useState('day');
  const [descriptionFr, setDescriptionFr] = useState('');
  const [descriptionEn, setDescriptionEn] = useState('');

  const fileRef = useRef<HTMLInputElement>(null);
  const thumbRef = useRef<HTMLInputElement>(null);

  const acceptTypes = assetType === 'photo'
    ? '.webp,.jpg,.jpeg,.png'
    : '.mp4,.webm';

  const maxSize = assetType === 'photo' ? 5 * 1024 * 1024 : 20 * 1024 * 1024;

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > maxSize) {
      toast({ title: 'Fichier trop volumineux', description: `Max ${assetType === 'photo' ? '5' : '20'} Mo`, variant: 'destructive' });
      return;
    }
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }, [assetType, maxSize]);

  const handleThumbnailChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setThumbnail(f);
    setThumbnailPreview(URL.createObjectURL(f));
  }, []);

  const resetForm = () => {
    setFile(null);
    setThumbnail(null);
    setPreview(null);
    setThumbnailPreview(null);
    setDescriptionFr('');
    setDescriptionEn('');
    if (fileRef.current) fileRef.current.value = '';
    if (thumbRef.current) thumbRef.current.value = '';
  };

  const handleSubmit = async () => {
    if (!file || !descriptionEn) {
      toast({ title: 'Champs requis manquants', description: 'Fichier et description EN sont obligatoires.', variant: 'destructive' });
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const storagePath = `${style}/${assetType}/${sceneType}/${fileName}`;

      // Upload main file
      const { error: uploadError } = await supabase.storage
        .from('anime-library')
        .upload(storagePath, file, { contentType: file.type });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('anime-library')
        .getPublicUrl(storagePath);

      let videoUrl: string | null = null;
      let imageUrl = urlData.publicUrl;

      if (assetType === 'video') {
        videoUrl = urlData.publicUrl;
        // Upload thumbnail if provided
        if (thumbnail) {
          const thumbExt = thumbnail.name.split('.').pop();
          const thumbPath = `${style}/thumbnail/${sceneType}/${Date.now()}.${thumbExt}`;
          await supabase.storage.from('anime-library').upload(thumbPath, thumbnail, { contentType: thumbnail.type });
          const { data: thumbUrl } = supabase.storage.from('anime-library').getPublicUrl(thumbPath);
          imageUrl = thumbUrl.publicUrl;
        } else {
          imageUrl = videoUrl; // fallback
        }
      }

      // Insert into anime_scene_library
      const { error: insertError } = await supabase
        .from('anime_scene_library')
        .insert({
          asset_type: assetType,
          style,
          emotion,
          scene_type: sceneType,
          character_type: characterType,
          action,
          time_of_day: timeOfDay,
          description_fr: descriptionFr || null,
          description_en: descriptionEn,
          image_url: imageUrl,
          video_url: videoUrl,
          storage_path: storagePath,
          tags: [style, emotion, sceneType, characterType, action],
        });

      if (insertError) throw insertError;

      toast({ title: '✅ Upload réussi !', description: `${assetType === 'photo' ? 'Photo' : 'Vidéo'} ajoutée à la bibliothèque.` });
      resetForm();
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({ title: 'Erreur', description: error.message || 'Échec de l\'upload', variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Asset Type Toggle */}
      <div className="flex gap-2">
        <Button
          variant={assetType === 'photo' ? 'default' : 'outline'}
          onClick={() => { setAssetType('photo'); resetForm(); }}
          className="flex-1"
        >
          <Image className="h-4 w-4 mr-2" />
          Photo
        </Button>
        <Button
          variant={assetType === 'video' ? 'default' : 'outline'}
          onClick={() => { setAssetType('video'); resetForm(); }}
          className="flex-1"
        >
          <Video className="h-4 w-4 mr-2" />
          Vidéo
        </Button>
      </div>

      {/* File Upload Zone */}
      <div
        onClick={() => fileRef.current?.click()}
        className="border-2 border-dashed border-muted-foreground/25 rounded-xl p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
      >
        <input ref={fileRef} type="file" accept={acceptTypes} className="hidden" onChange={handleFileChange} />
        {preview ? (
          <div className="relative">
            {assetType === 'photo' ? (
              <img src={preview} alt="Aperçu" className="max-h-48 mx-auto rounded-lg object-contain" />
            ) : (
              <video src={preview} className="max-h-48 mx-auto rounded-lg" controls />
            )}
            <Button
              size="icon"
              variant="destructive"
              className="absolute top-2 right-2 h-7 w-7"
              onClick={(e) => { e.stopPropagation(); resetForm(); }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            <Upload className="h-10 w-10 mx-auto text-muted-foreground" />
            <p className="text-muted-foreground text-sm">
              Cliquez pour sélectionner {assetType === 'photo' ? 'une photo' : 'une vidéo'}
            </p>
            <p className="text-muted-foreground/60 text-xs">
              {assetType === 'photo' ? 'WEBP, JPG, PNG • Max 5 Mo' : 'MP4, WEBM • Max 20 Mo'}
            </p>
          </div>
        )}
      </div>

      {/* Thumbnail for videos */}
      {assetType === 'video' && (
        <div>
          <Label>Image de couverture (optionnel)</Label>
          <div
            onClick={() => thumbRef.current?.click()}
            className="mt-1 border border-dashed border-muted-foreground/25 rounded-lg p-4 text-center cursor-pointer hover:border-primary/50 transition-colors"
          >
            <input ref={thumbRef} type="file" accept=".webp,.jpg,.jpeg,.png" className="hidden" onChange={handleThumbnailChange} />
            {thumbnailPreview ? (
              <img src={thumbnailPreview} alt="Thumbnail" className="max-h-24 mx-auto rounded object-contain" />
            ) : (
              <p className="text-muted-foreground text-xs">
                <Eye className="h-4 w-4 inline mr-1" />
                Ajouter une miniature
              </p>
            )}
          </div>
        </div>
      )}

      {/* Classification Grid */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Style</Label>
          <Select value={style} onValueChange={setStyle}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {STYLES.map(s => <SelectItem key={s} value={s}>{LABELS[s]}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Émotion</Label>
          <Select value={emotion} onValueChange={setEmotion}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {EMOTIONS.map(e => <SelectItem key={e} value={e}>{LABELS[e]}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Scène</Label>
          <Select value={sceneType} onValueChange={setSceneType}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {SCENES.map(s => <SelectItem key={s} value={s}>{LABELS[s]}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Personnage</Label>
          <Select value={characterType} onValueChange={setCharacterType}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {CHARACTERS.map(c => <SelectItem key={c} value={c}>{LABELS[c]}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Action</Label>
          <Select value={action} onValueChange={setAction}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {ACTIONS.map(a => <SelectItem key={a} value={a}>{LABELS[a]}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Moment</Label>
          <Select value={timeOfDay} onValueChange={setTimeOfDay}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {TIME_OF_DAY.map(t => <SelectItem key={t} value={t}>{LABELS[t]}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Descriptions */}
      <div className="space-y-3">
        <div>
          <Label>Description (EN) *</Label>
          <Input
            value={descriptionEn}
            onChange={e => setDescriptionEn(e.target.value)}
            placeholder="A child standing in a sunny village..."
          />
        </div>
        <div>
          <Label>Description (FR)</Label>
          <Input
            value={descriptionFr}
            onChange={e => setDescriptionFr(e.target.value)}
            placeholder="Un enfant debout dans un village ensoleillé..."
          />
        </div>
      </div>

      {/* Submit */}
      <Button
        onClick={handleSubmit}
        disabled={uploading || !file || !descriptionEn}
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
            Ajouter à la bibliothèque
          </>
        )}
      </Button>
    </div>
  );
}
