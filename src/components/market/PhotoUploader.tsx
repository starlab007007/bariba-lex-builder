import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, X, Plus, Image as ImageIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useTamTamLanguage } from '@/contexts/TamTamLanguageContext';

interface PhotoUploaderProps {
  photos: string[];
  onPhotosChange: (photos: string[]) => void;
  maxPhotos?: number;
  disabled?: boolean;
}

export function PhotoUploader({ 
  photos, 
  onPhotosChange, 
  maxPhotos = 3, 
  disabled = false 
}: PhotoUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { currentLang } = useTamTamLanguage();

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const remainingSlots = maxPhotos - photos.length;
    const filesToUpload = Array.from(files).slice(0, remainingSlots);

    setIsUploading(true);

    try {
      const uploadPromises = filesToUpload.map(async (file) => {
        // Resize image if needed
        const resizedBlob = await resizeImage(file, 1200, 1200);
        
        const fileName = `market-${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;
        
        const { data, error } = await supabase.storage
          .from('tamtam-audio') // Using existing bucket, could be renamed to tamtam-media
          .upload(`photos/${fileName}`, resizedBlob, {
            contentType: 'image/jpeg'
          });

        if (error) {
          console.error('Upload error:', error);
          return null;
        }

        const { data: { publicUrl } } = supabase.storage
          .from('tamtam-audio')
          .getPublicUrl(`photos/${fileName}`);

        return publicUrl;
      });

      const uploadedUrls = await Promise.all(uploadPromises);
      const validUrls = uploadedUrls.filter((url): url is string => url !== null);

      onPhotosChange([...photos, ...validUrls]);
    } catch (error) {
      console.error('Error uploading photos:', error);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const resizeImage = (file: File, maxWidth: number, maxHeight: number): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.floor(width * ratio);
          height = Math.floor(height * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context not available'));
          return;
        }
        
        ctx.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to create blob'));
            }
          },
          'image/jpeg',
          0.85
        );
      };
      
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  };

  const removePhoto = (index: number) => {
    const newPhotos = photos.filter((_, i) => i !== index);
    onPhotosChange(newPhotos);
  };

  const canAddMore = photos.length < maxPhotos;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm text-tamtam-text-muted">
        <Camera className="w-4 h-4" />
        <span>
          {currentLang === 'ba' 
            ? `Àwọn fọ́tò (àṣàyàn, ó pọ̀ jù ${maxPhotos})` 
            : `Photos (facultatif, max ${maxPhotos})`}
        </span>
      </div>

      <div className="flex gap-2 flex-wrap">
        {/* Existing photos */}
        <AnimatePresence>
          {photos.map((url, index) => (
            <motion.div
              key={url}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="relative w-20 h-20 rounded-xl overflow-hidden bg-tamtam-surface"
            >
              <img 
                src={url} 
                alt={`Photo ${index + 1}`} 
                className="w-full h-full object-cover"
              />
              <button
                onClick={() => removePhoto(index)}
                disabled={disabled}
                className="absolute top-1 right-1 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center"
              >
                <X className="w-3 h-3 text-white" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Add photo button */}
        {canAddMore && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || isUploading}
            className="w-20 h-20 rounded-xl border-2 border-dashed border-tamtam-border flex flex-col items-center justify-center gap-1 text-tamtam-text-muted hover:border-tamtam-primary hover:text-tamtam-primary transition-colors disabled:opacity-50"
          >
            {isUploading ? (
              <div className="w-5 h-5 border-2 border-tamtam-primary border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Plus className="w-5 h-5" />
                <span className="text-xs">{photos.length}/{maxPhotos}</span>
              </>
            )}
          </motion.button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
}
