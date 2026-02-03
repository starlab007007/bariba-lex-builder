/**
 * Narrator Capture Component
 * Capture or upload circular avatar photo for the narrator signature
 */

import React, { useRef, useState, useCallback } from 'react';
import { Camera, Upload, X, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface NarratorCaptureProps {
  onImageCaptured: (file: File | Blob) => void;
  previewUrl: string | null;
  onClear: () => void;
  disabled?: boolean;
}

export function NarratorCapture({ onImageCaptured, previewUrl, onClear, disabled }: NarratorCaptureProps) {
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
        video: { facingMode: 'user', width: 480, height: 480 }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setIsCameraOpen(true);
      }
    } catch (err) {
      console.error('[NarratorCapture] Camera error:', err);
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

    const size = Math.min(videoRef.current.videoWidth, videoRef.current.videoHeight);
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Center crop to square
    const offsetX = (videoRef.current.videoWidth - size) / 2;
    const offsetY = (videoRef.current.videoHeight - size) / 2;
    
    ctx.drawImage(
      videoRef.current, 
      offsetX, offsetY, size, size,
      0, 0, size, size
    );
    
    canvas.toBlob((blob) => {
      if (blob) {
        onImageCaptured(blob);
        closeCamera();
      }
    }, 'image/jpeg', 0.9);
  }, [onImageCaptured, closeCamera]);

  // Preview with circular mask
  if (previewUrl) {
    return (
      <div className="flex flex-col items-center gap-3">
        <div className="relative">
          {/* Animated golden border */}
          <div className="absolute inset-0 rounded-full bg-gradient-conic from-amber-400 via-orange-500 to-amber-400 animate-spin-slow" 
               style={{ padding: '3px', animation: 'spin 4s linear infinite' }}>
            <div className="w-full h-full rounded-full bg-black" />
          </div>
          
          {/* Avatar image */}
          <div className="relative w-24 h-24 rounded-full overflow-hidden border-3 border-amber-400 shadow-lg shadow-amber-500/30">
            <img 
              src={previewUrl} 
              alt="Narrateur" 
              className="w-full h-full object-cover"
            />
          </div>
          
          {/* Clear button */}
          <button
            onClick={onClear}
            disabled={disabled}
            className="absolute -top-1 -right-1 p-1.5 bg-red-500 rounded-full text-white hover:bg-red-600 transition-colors disabled:opacity-50 shadow-md"
            aria-label="Supprimer la photo"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
        <p className="text-xs text-amber-200/60">Ta signature</p>
      </div>
    );
  }

  // Camera view
  if (isCameraOpen) {
    return (
      <div className="flex flex-col items-center gap-4">
        <div className="relative w-32 h-32 rounded-full overflow-hidden border-2 border-amber-400">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={closeCamera}
            className="rounded-full bg-white/10 border-white/30 text-white"
          >
            <X className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            onClick={capturePhoto}
            className="rounded-full bg-amber-500 hover:bg-amber-400 text-black"
          >
            <Camera className="w-4 h-4" />
          </Button>
        </div>
      </div>
    );
  }

  // Default: upload/camera buttons
  return (
    <div className="flex flex-col items-center gap-3">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled}
      />
      
      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={disabled}
        className={cn(
          "w-20 h-20 rounded-full border-2 border-dashed border-amber-500/40 bg-amber-900/20",
          "flex flex-col items-center justify-center gap-1 transition-all",
          "hover:border-amber-400 hover:bg-amber-900/30",
          disabled && "opacity-50 pointer-events-none"
        )}
      >
        <User className="w-8 h-8 text-amber-400/60" />
      </button>
      
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={openCamera}
          disabled={disabled}
          className="text-xs text-amber-200/60 hover:text-amber-200"
        >
          <Camera className="w-3 h-3 mr-1" />
          Selfie
        </Button>
        <span className="text-amber-200/30">|</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled}
          className="text-xs text-amber-200/60 hover:text-amber-200"
        >
          <Upload className="w-3 h-3 mr-1" />
          Photo
        </Button>
      </div>
      
      <p className="text-xs text-amber-200/40 text-center">
        Ta photo en signature (optionnel)
      </p>

      {cameraError && (
        <p className="text-xs text-red-400 text-center">{cameraError}</p>
      )}
    </div>
  );
}
