import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Loader2, X, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { tamtamFeedback } from '@/utils/tamtamFeedback';

interface ProfilePhotoUploaderProps {
  currentAvatarUrl: string | null;
  onPhotoUploaded: (url: string) => void;
}

export function ProfilePhotoUploader({ currentAvatarUrl, onPhotoUploaded }: ProfilePhotoUploaderProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Format invalide",
        description: "Veuillez sélectionner une image",
        variant: "destructive"
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Fichier trop volumineux",
        description: "La taille maximale est de 5MB",
        variant: "destructive"
      });
      return;
    }

    tamtamFeedback.play('click');
    setSelectedFile(file);
    
    // Create preview URL
    const reader = new FileReader();
    reader.onload = (event) => {
      setPreviewUrl(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleUpload = async () => {
    if (!selectedFile || !user) return;

    setIsUploading(true);
    tamtamFeedback.play('send');

    try {
      // Compress image if needed (convert to WebP for better compression)
      const compressedFile = await compressImage(selectedFile);
      
      const fileName = `avatars/${user.id}_${Date.now()}.webp`;
      
      const { error: uploadError } = await supabase.storage
        .from('tamtam-audio')
        .upload(fileName, compressedFile, { 
          contentType: 'image/webp',
          upsert: true 
        });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('tamtam-audio')
        .getPublicUrl(fileName);

      onPhotoUploaded(urlData.publicUrl);
      
      toast({
        title: "✅ Photo mise à jour",
        description: "Votre photo de profil a été modifiée"
      });

      tamtamFeedback.play('success');
      handleCancel();
    } catch (err: any) {
      console.error('[ProfilePhotoUploader] Upload error:', err);
      toast({
        title: "Erreur",
        description: err.message || "Impossible d'uploader la photo",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleCancel = () => {
    setPreviewUrl(null);
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
    tamtamFeedback.play('click');
  };

  return (
    <div className="relative">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Avatar display */}
      <button 
        onClick={triggerFileInput}
        className="relative group"
        disabled={isUploading}
      >
        <div className="w-32 h-32 bg-tamtam-surface rounded-full shadow-tamtam-soft flex items-center justify-center overflow-hidden">
          {previewUrl ? (
            <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
          ) : currentAvatarUrl ? (
            <img src={currentAvatarUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="text-6xl">👤</span>
          )}
        </div>
        
        {/* Camera overlay */}
        <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <Camera className="w-8 h-8 text-white" />
        </div>
        
        {/* Camera button */}
        <div className="absolute bottom-0 right-0 w-10 h-10 bg-tamtam-primary rounded-full flex items-center justify-center shadow-md">
          {isUploading ? (
            <Loader2 className="w-5 h-5 text-white animate-spin" />
          ) : (
            <Camera className="w-5 h-5 text-white" />
          )}
        </div>
      </button>

      {/* Preview confirmation modal */}
      <AnimatePresence>
        {previewUrl && !isUploading && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="absolute -bottom-16 left-1/2 -translate-x-1/2 flex gap-3"
          >
            <button
              onClick={handleCancel}
              className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center shadow-md hover:bg-red-200 transition-colors"
            >
              <X className="w-6 h-6 text-red-600" />
            </button>
            <button
              onClick={handleUpload}
              className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center shadow-md hover:bg-green-600 transition-colors"
            >
              <Check className="w-6 h-6 text-white" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Utility function to compress image
async function compressImage(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    img.onload = () => {
      // Max dimensions
      const maxSize = 500;
      let { width, height } = img;

      if (width > height) {
        if (width > maxSize) {
          height = (height * maxSize) / width;
          width = maxSize;
        }
      } else {
        if (height > maxSize) {
          width = (width * maxSize) / height;
          height = maxSize;
        }
      }

      canvas.width = width;
      canvas.height = height;
      ctx?.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to compress image'));
          }
        },
        'image/webp',
        0.85
      );
    };

    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
}
