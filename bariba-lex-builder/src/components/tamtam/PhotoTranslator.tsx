import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, X, RotateCcw, Check, Loader2, ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { tamtamFeedback } from '@/utils/tamtamFeedback';

interface PhotoTranslatorProps {
  onCapture: (imageBase64: string) => Promise<void>;
  isProcessing?: boolean;
}

export const PhotoTranslator = ({ onCapture, isProcessing }: PhotoTranslatorProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isCameraReady, setIsCameraReady] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: 1280, height: 720 }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setIsCameraReady(true);
      }
    } catch (error) {
      console.error('[PhotoTranslator] Camera error:', error);
      tamtamFeedback.play('error');
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraReady(false);
  }, []);

  const handleOpen = useCallback(() => {
    tamtamFeedback.play('click');
    setIsOpen(true);
    setCapturedImage(null);
    startCamera();
  }, [startCamera]);

  const handleClose = useCallback(() => {
    tamtamFeedback.play('click');
    stopCamera();
    setIsOpen(false);
    setCapturedImage(null);
  }, [stopCamera]);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    
    tamtamFeedback.play('click');
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0);
      const imageData = canvas.toDataURL('image/jpeg', 0.8);
      setCapturedImage(imageData);
      stopCamera();
    }
  }, [stopCamera]);

  const retakePhoto = useCallback(() => {
    tamtamFeedback.play('click');
    setCapturedImage(null);
    startCamera();
  }, [startCamera]);

  const confirmPhoto = useCallback(async () => {
    if (!capturedImage) return;
    
    tamtamFeedback.play('send');
    
    // Extract base64 data
    const base64Data = capturedImage.split(',')[1];
    await onCapture(base64Data);
    
    handleClose();
  }, [capturedImage, onCapture, handleClose]);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    tamtamFeedback.play('click');
    
    const reader = new FileReader();
    reader.onload = async () => {
      const imageData = reader.result as string;
      const base64Data = imageData.split(',')[1];
      await onCapture(base64Data);
    };
    reader.readAsDataURL(file);
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [onCapture]);

  return (
    <>
      {/* Trigger buttons */}
      <div className="flex gap-3">
        <Button
          onClick={handleOpen}
          disabled={isProcessing}
          className="flex-1 h-20 bg-gradient-to-br from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 rounded-2xl flex flex-col items-center justify-center gap-2"
        >
          <Camera className="w-8 h-8 text-white" />
          <span className="text-xs text-white font-medium">Caméra</span>
        </Button>
        
        <Button
          onClick={() => fileInputRef.current?.click()}
          disabled={isProcessing}
          className="flex-1 h-20 bg-gradient-to-br from-indigo-500 to-blue-500 hover:from-indigo-600 hover:to-blue-600 rounded-2xl flex flex-col items-center justify-center gap-2"
        >
          <ImageIcon className="w-8 h-8 text-white" />
          <span className="text-xs text-white font-medium">Galerie</span>
        </Button>
        
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {/* Camera modal */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black"
          >
            {/* Close button */}
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 z-10 w-12 h-12 bg-black/50 rounded-full flex items-center justify-center"
            >
              <X className="w-6 h-6 text-white" />
            </button>

            {/* Camera view or captured image */}
            {!capturedImage ? (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                />
                
                {/* Camera guide overlay */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-[80%] h-[60%] border-2 border-white/50 rounded-2xl">
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black/60 px-4 py-2 rounded-full">
                      <span className="text-white text-sm">Cadrez le texte à traduire</span>
                    </div>
                  </div>
                </div>

                {/* Capture button */}
                <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={capturePhoto}
                    disabled={!isCameraReady}
                    className="w-20 h-20 rounded-full bg-white border-4 border-gray-300 flex items-center justify-center shadow-lg"
                  >
                    {!isCameraReady ? (
                      <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-white" />
                    )}
                  </motion.button>
                </div>
              </>
            ) : (
              <>
                <img
                  src={capturedImage}
                  alt="Captured"
                  className="w-full h-full object-cover"
                />
                
                {/* Action buttons */}
                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-6">
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={retakePhoto}
                    className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center shadow-lg"
                  >
                    <RotateCcw className="w-8 h-8 text-white" />
                  </motion.button>
                  
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={confirmPhoto}
                    disabled={isProcessing}
                    className="w-20 h-20 rounded-full bg-green-500 flex items-center justify-center shadow-lg"
                  >
                    {isProcessing ? (
                      <Loader2 className="w-10 h-10 animate-spin text-white" />
                    ) : (
                      <Check className="w-10 h-10 text-white" />
                    )}
                  </motion.button>
                </div>
              </>
            )}

            {/* Hidden canvas for capture */}
            <canvas ref={canvasRef} className="hidden" />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
