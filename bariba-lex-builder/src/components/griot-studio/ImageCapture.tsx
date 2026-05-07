/**
 * Image Capture Component
 * Capture or upload image for animation
 */

import React, { useRef, useState, useCallback } from 'react';
import { Camera, Upload, X, ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ImageCaptureProps {
  onImageCaptured: (file: File | Blob) => void;
  previewUrl: string | null;
  onClear: () => void;
  disabled?: boolean;
}

export function ImageCapture({ onImageCaptured, previewUrl, onClear, disabled }: ImageCaptureProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      onImageCaptured(file);
    }
  }, [onImageCaptured]);

  const openCamera = useCallback(async () => {
    try {
      setCameraError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: 1080, height: 1920 }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setIsCameraOpen(true);
      }
    } catch (err) {
      console.error('[ImageCapture] Camera error:', err);
      setCameraError('Impossible d\'accéder à la caméra');
    }
  }, []);

  const closeCamera = useCallback(() => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraOpen(false);
  }, []);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current) return;

    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 1080;
    canvas.height = videoRef.current.videoHeight || 1920;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.drawImage(videoRef.current, 0, 0);
    
    canvas.toBlob((blob) => {
      if (blob) {
        onImageCaptured(blob);
        closeCamera();
      }
    }, 'image/jpeg', 0.9);
  }, [onImageCaptured, closeCamera]);

  if (previewUrl) {
    return (
      <div className="relative aspect-[9/16] w-full max-w-sm mx-auto rounded-2xl overflow-hidden bg-black">
        <img 
          src={previewUrl} 
          alt="Captured" 
          className="w-full h-full object-cover"
        />
        <button
          onClick={onClear}
          disabled={disabled}
          className="absolute top-3 right-3 p-2 bg-black/50 rounded-full text-white hover:bg-black/70 transition-colors disabled:opacity-50"
          aria-label="Supprimer l'image"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    );
  }

  if (isCameraOpen) {
    return (
      <div className="relative aspect-[9/16] w-full max-w-sm mx-auto rounded-2xl overflow-hidden bg-black">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
        />
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
          <div className="flex justify-center gap-4">
            <Button
              variant="outline"
              size="lg"
              onClick={closeCamera}
              className="rounded-full bg-white/20 border-white/30 text-white"
            >
              <X className="w-5 h-5" />
            </Button>
            <Button
              size="lg"
              onClick={capturePhoto}
              className="rounded-full bg-white text-black hover:bg-white/90 w-16 h-16"
            >
              <Camera className="w-6 h-6" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm mx-auto">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled}
      />
      
      <div 
        className={cn(
          "aspect-[9/16] rounded-2xl border-2 border-dashed border-amber-500/30 bg-gradient-to-b from-amber-900/10 to-amber-950/20",
          "flex flex-col items-center justify-center gap-6 p-6 transition-all",
          "hover:border-amber-500/50 hover:bg-amber-900/20",
          disabled && "opacity-50 pointer-events-none"
        )}
      >
        <div className="w-20 h-20 rounded-full bg-amber-500/20 flex items-center justify-center">
          <ImageIcon className="w-10 h-10 text-amber-400" />
        </div>
        
        <div className="text-center">
          <h3 className="text-lg font-medium text-amber-100 mb-1">
            Ajoute une image
          </h3>
          <p className="text-sm text-amber-200/60">
            Prends une photo ou importe une image pour créer ton animation
          </p>
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={openCamera}
            disabled={disabled}
            className="bg-amber-500/10 border-amber-500/30 text-amber-200 hover:bg-amber-500/20"
          >
            <Camera className="w-4 h-4 mr-2" />
            Caméra
          </Button>
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled}
            className="bg-amber-500/10 border-amber-500/30 text-amber-200 hover:bg-amber-500/20"
          >
            <Upload className="w-4 h-4 mr-2" />
            Importer
          </Button>
        </div>

        {cameraError && (
          <p className="text-sm text-red-400 text-center">{cameraError}</p>
        )}
      </div>
    </div>
  );
}
