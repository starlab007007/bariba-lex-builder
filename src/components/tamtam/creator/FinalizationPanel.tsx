/**
 * FinalizationPanel.tsx
 * Panel de finalisation avant publication avec caption, hashtags et options
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Hash, Sparkles, Save, Send, ChevronLeft, 
  Globe, Lock, Users, Loader2, Image, Edit3
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

interface FinalizationPanelProps {
  previewUrl?: string | null;
  previewBlob?: Blob | null;
  caption: string;
  onCaptionChange: (caption: string) => void;
  onPublish: () => void;
  onSaveAsDraft: () => void;
  onBack: () => void;
  isPublishing?: boolean;
  suggestedHashtags?: string[];
  templateName?: string;
}

type Visibility = 'public' | 'friends' | 'private';

const visibilityOptions: { value: Visibility; label: string; icon: React.ReactNode }[] = [
  { value: 'public', label: 'Public', icon: <Globe className="w-4 h-4" /> },
  { value: 'friends', label: 'Amis', icon: <Users className="w-4 h-4" /> },
  { value: 'private', label: 'Privé', icon: <Lock className="w-4 h-4" /> },
];

const defaultHashtags = [
  '#TamTam', '#Création', '#Vidéo', '#Village', 
  '#Culture', '#Bariba', '#Afrique', '#Tendance'
];

export const FinalizationPanel: React.FC<FinalizationPanelProps> = ({
  previewUrl,
  previewBlob,
  caption,
  onCaptionChange,
  onPublish,
  onSaveAsDraft,
  onBack,
  isPublishing = false,
  suggestedHashtags = [],
  templateName
}) => {
  const [visibility, setVisibility] = useState<Visibility>('public');
  const [allowDuo, setAllowDuo] = useState(true);
  const [allowComments, setAllowComments] = useState(true);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  // Merge suggested and default hashtags
  const allHashtags = [...new Set([...suggestedHashtags, ...defaultHashtags])].slice(0, 12);

  useEffect(() => {
    if (previewBlob) {
      const url = URL.createObjectURL(previewBlob);
      setVideoUrl(url);
      return () => URL.revokeObjectURL(url);
    } else if (previewUrl) {
      setVideoUrl(previewUrl);
    }
  }, [previewBlob, previewUrl]);

  const handleHashtagClick = (tag: string) => {
    if (caption.includes(tag)) {
      onCaptionChange(caption.replace(tag, '').trim());
    } else {
      onCaptionChange(caption ? `${caption} ${tag}` : tag);
    }
  };

  const hashtagsInCaption = allHashtags.filter(tag => caption.includes(tag));

  return (
    <div className="flex-1 flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ChevronLeft className="w-4 h-4 mr-1" />
          Retour
        </Button>
        <h2 className="font-semibold text-foreground">Finaliser</h2>
        <div className="w-20" />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-32">
        {/* Video preview */}
        {videoUrl && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative aspect-[9/16] max-h-[200px] w-auto mx-auto rounded-xl overflow-hidden shadow-lg"
          >
            <video
              src={videoUrl}
              className="h-full w-auto object-cover"
              autoPlay
              muted
              loop
              playsInline
            />
            {templateName && (
              <Badge className="absolute top-2 left-2 bg-black/50 text-white text-xs">
                {templateName}
              </Badge>
            )}
          </motion.div>
        )}

        {/* Caption input */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Edit3 className="w-4 h-4 text-muted-foreground" />
            <label className="text-sm font-medium text-foreground">Description</label>
          </div>
          <Textarea
            value={caption}
            onChange={(e) => onCaptionChange(e.target.value)}
            placeholder="Décris ta vidéo..."
            className="min-h-[100px] bg-muted/50 border-0 resize-none"
            maxLength={500}
          />
          <p className="text-xs text-muted-foreground text-right">
            {caption.length}/500
          </p>
        </div>

        {/* AI Hashtag suggestions */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-foreground">Hashtags suggérés</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {allHashtags.map((tag) => (
              <Badge
                key={tag}
                variant={hashtagsInCaption.includes(tag) ? 'default' : 'outline'}
                className={cn(
                  "cursor-pointer transition-all hover:scale-105",
                  hashtagsInCaption.includes(tag) 
                    ? "bg-primary/20 text-primary border-primary/30" 
                    : "hover:bg-muted"
                )}
                onClick={() => handleHashtagClick(tag)}
              >
                <Hash className="w-3 h-3 mr-1" />
                {tag.replace('#', '')}
              </Badge>
            ))}
          </div>
        </div>

        {/* Visibility */}
        <div className="space-y-3">
          <span className="text-sm font-medium text-foreground">Visibilité</span>
          <div className="flex gap-2">
            {visibilityOptions.map((option) => (
              <Button
                key={option.value}
                variant={visibility === option.value ? 'default' : 'outline'}
                size="sm"
                onClick={() => setVisibility(option.value)}
                className={cn(
                  "flex-1",
                  visibility === option.value && "bg-primary"
                )}
              >
                {option.icon}
                <span className="ml-2">{option.label}</span>
              </Button>
            ))}
          </div>
        </div>

        {/* Options */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-foreground">Autoriser les duos</span>
            </div>
            <Switch checked={allowDuo} onCheckedChange={setAllowDuo} />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Edit3 className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-foreground">Autoriser les commentaires</span>
            </div>
            <Switch checked={allowComments} onCheckedChange={setAllowComments} />
          </div>
        </div>
      </div>

      {/* Fixed bottom actions */}
      <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-xl border-t border-border p-4 pb-safe">
        <div className="flex gap-3 max-w-lg mx-auto">
          <Button
            variant="outline"
            onClick={onSaveAsDraft}
            disabled={isPublishing}
            className="flex-1 h-12"
          >
            <Save className="w-4 h-4 mr-2" />
            Brouillon
          </Button>

          <Button
            onClick={onPublish}
            disabled={isPublishing}
            className="flex-[2] h-12 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
          >
            {isPublishing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Publication...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Publier
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default FinalizationPanel;
