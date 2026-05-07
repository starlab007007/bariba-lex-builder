/**
 * Asset Upload Form - Upload photos and videos to anime_scene_library
 * With automatic AI-powered classification
 */

import { useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
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
import { Upload, X, Image, Video, Loader2, Eye, Sparkles } from 'lucide-react';
import { analyzeImage, analyzeVideoFrame, type ImageSuggestions } from '@/utils/assetAnalyzer';

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

/** Small AI badge indicator */
function AiBadge() {
  return (
    <Badge variant="secondary" className="ml-2 text-[10px] px-1.5 py-0 gap-1 font-normal">
      <Sparkles className="h-2.5 w-2.5" />
      IA
    </Badge>
  );
}

/** Select field wrapper with optional AI badge and skeleton state */
function ClassificationSelect({
  label,
  value,
  onValueChange,
  options,
  analyzing,
  aiSuggested,
}: {
  label: string;
  value: string;
  onValueChange: (v: string) => void;
  options: readonly string[];
  analyzing: boolean;
  aiSuggested: boolean;
}) {
  return (
    <div>
      <Label className="flex items-center">
        {label}
        {aiSuggested && <AiBadge />}
      </Label>
      {analyzing ? (
        <Skeleton className="h-10 w-full mt-1" />
      ) : (
        <Select value={value} onValueChange={onValueChange}>
          <SelectTrigger className={aiSuggested ? 'border-primary/40 bg-primary/5' : ''}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {options.map(o => <SelectItem key={o} value={o}>{LABELS[o] || o}</SelectItem>)}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}

export function AssetUploadForm() {
  const { user } = useAuth();
  const [assetType, setAssetType] = useState<'photo' | 'video'>('photo');
  const [file, setFile] = useState<File | null>(null);
  const [thumbnail, setThumbnail] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  // AI analysis state
  const [analyzing, setAnalyzing] = useState(false);
  const [aiFields, setAiFields] = useState<Set<string>>(new Set());

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

  const acceptTypes = assetType === 'photo' ? '.webp,.jpg,.jpeg,.png' : '.mp4,.webm';
  const maxSize = assetType === 'photo' ? 5 * 1024 * 1024 : 20 * 1024 * 1024;

  const applySuggestions = (suggestions: ImageSuggestions) => {
    const touched = new Set<string>();

    if (suggestions.style) { setStyle(suggestions.style); touched.add('style'); }
    if (suggestions.emotion) { setEmotion(suggestions.emotion); touched.add('emotion'); }
    if (suggestions.scene_type) { setSceneType(suggestions.scene_type); touched.add('sceneType'); }
    if (suggestions.character_type) { setCharacterType(suggestions.character_type); touched.add('characterType'); }
    if (suggestions.action) { setAction(suggestions.action); touched.add('action'); }
    if (suggestions.time_of_day) { setTimeOfDay(suggestions.time_of_day); touched.add('timeOfDay'); }
    if (suggestions.description_en) { setDescriptionEn(suggestions.description_en); touched.add('descriptionEn'); }
    if (suggestions.description_fr) { setDescriptionFr(suggestions.description_fr); touched.add('descriptionFr'); }

    setAiFields(touched);
  };

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > maxSize) {
      toast({ title: 'Fichier trop volumineux', description: `Max ${assetType === 'photo' ? '5' : '20'} Mo`, variant: 'destructive' });
      return;
    }
    setFile(f);
    setPreview(URL.createObjectURL(f));

    // Trigger AI analysis
    setAnalyzing(true);
    setAiFields(new Set());
    try {
      const suggestions = assetType === 'photo'
        ? await analyzeImage(f)
        : await analyzeVideoFrame(f);

      if (Object.keys(suggestions).length > 0) {
        applySuggestions(suggestions);
        toast({ title: '🤖 Analyse IA terminée', description: 'Champs pré-remplis automatiquement.' });
      }
    } catch (err) {
      console.warn('AI analysis failed:', err);
      toast({ title: 'Analyse IA échouée', description: 'Classifiez manuellement.', variant: 'destructive' });
    } finally {
      setAnalyzing(false);
    }
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
    setAiFields(new Set());
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
        if (thumbnail) {
          const thumbExt = thumbnail.name.split('.').pop();
          const thumbPath = `${style}/thumbnail/${sceneType}/${Date.now()}.${thumbExt}`;
          await supabase.storage.from('anime-library').upload(thumbPath, thumbnail, { contentType: thumbnail.type });
          const { data: thumbUrl } = supabase.storage.from('anime-library').getPublicUrl(thumbPath);
          imageUrl = thumbUrl.publicUrl;
        } else {
          imageUrl = videoUrl;
        }
      }

      // Build full AI metadata object for centralized storage
      const aiMetadata = {
        style,
        emotion,
        scene_type: sceneType,
        character_type: characterType,
        action,
        time_of_day: timeOfDay,
        description_en: descriptionEn,
        description_fr: descriptionFr || null,
        ai_suggested_fields: Array.from(aiFields),
      };

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

      // Record in asset_imports (non-blocking, don't let it crash the main flow)
      try {
        await supabase
          .from('asset_imports')
          .insert({
            category: assetType === 'photo' ? 'image' : 'video',
            original_name: file.name,
            target_name: fileName,
            file_size: file.size,
            mime_type: file.type,
            storage_path: storagePath,
            public_url: imageUrl,
            status: 'uploaded',
            original_format: ext,
            ai_metadata: aiMetadata,
            ai_analysis_status: aiFields.size > 0 ? 'completed' : 'skipped',
            ai_confidence: aiFields.size > 0 ? (aiFields.size / 8) : null,
            user_id: user?.id || null,
          });
      } catch (importErr) {
        console.warn('asset_imports record failed (non-fatal):', importErr);
      }

      toast({ title: '✅ Upload réussi !', description: `${assetType === 'photo' ? 'Photo' : 'Vidéo'} ajoutée à la bibliothèque.` });
      resetForm();
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({ title: 'Erreur', description: error?.message || "Échec de l'upload", variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
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
        onClick={() => !analyzing && fileRef.current?.click()}
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
        <ClassificationSelect label="Style" value={style} onValueChange={setStyle} options={STYLES} analyzing={analyzing} aiSuggested={aiFields.has('style')} />
        <ClassificationSelect label="Émotion" value={emotion} onValueChange={setEmotion} options={EMOTIONS} analyzing={analyzing} aiSuggested={aiFields.has('emotion')} />
        <ClassificationSelect label="Scène" value={sceneType} onValueChange={setSceneType} options={SCENES} analyzing={analyzing} aiSuggested={aiFields.has('sceneType')} />
        <ClassificationSelect label="Personnage" value={characterType} onValueChange={setCharacterType} options={CHARACTERS} analyzing={analyzing} aiSuggested={aiFields.has('characterType')} />
        <ClassificationSelect label="Action" value={action} onValueChange={setAction} options={ACTIONS} analyzing={analyzing} aiSuggested={aiFields.has('action')} />
        <ClassificationSelect label="Moment" value={timeOfDay} onValueChange={setTimeOfDay} options={TIME_OF_DAY} analyzing={analyzing} aiSuggested={aiFields.has('timeOfDay')} />
      </div>

      {/* Descriptions */}
      <div className="space-y-3">
        <div>
          <Label className="flex items-center">
            Description (EN) *
            {aiFields.has('descriptionEn') && <AiBadge />}
          </Label>
          {analyzing ? (
            <Skeleton className="h-10 w-full mt-1" />
          ) : (
            <Input
              value={descriptionEn}
              onChange={e => setDescriptionEn(e.target.value)}
              placeholder="A child standing in a sunny village..."
              className={aiFields.has('descriptionEn') ? 'border-primary/40 bg-primary/5' : ''}
            />
          )}
        </div>
        <div>
          <Label className="flex items-center">
            Description (FR)
            {aiFields.has('descriptionFr') && <AiBadge />}
          </Label>
          {analyzing ? (
            <Skeleton className="h-10 w-full mt-1" />
          ) : (
            <Input
              value={descriptionFr}
              onChange={e => setDescriptionFr(e.target.value)}
              placeholder="Un enfant debout dans un village ensoleillé..."
              className={aiFields.has('descriptionFr') ? 'border-primary/40 bg-primary/5' : ''}
            />
          )}
        </div>
      </div>

      {/* Submit */}
      <Button
        onClick={handleSubmit}
        disabled={uploading || analyzing || !file || !descriptionEn}
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
