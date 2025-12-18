import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Video, Smile, Mic, X, Send, Image as ImageIcon, Play } from 'lucide-react';
import { triggerFeedback } from '@/utils/tamtamFeedback';
import { useTamTamLanguage } from '@/contexts/TamTamLanguageContext';

const EMOJI_LIST = ['😀', '😂', '🥰', '😍', '🤗', '🙏', '❤️', '🔥', '👏', '💪', '🎉', '🌟', '👍', '✨', '🙌', '💯'];

interface TamTamMediaPickerProps {
  onSelectPhoto: (file: File) => void;
  onSelectVideo: (file: File) => void;
  onSelectEmoji: (emoji: string) => void;
  onRecordAudio: () => void;
  isRecording?: boolean;
  onClose: () => void;
}

export function TamTamMediaPicker({
  onSelectPhoto,
  onSelectVideo,
  onSelectEmoji,
  onRecordAudio,
  isRecording,
  onClose
}: TamTamMediaPickerProps) {
  const { t } = useTamTamLanguage();
  const [activeTab, setActiveTab] = useState<'media' | 'emoji'>('media');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewType, setPreviewType] = useState<'photo' | 'video' | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  const photoInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      triggerFeedback('notification');
      setPreviewUrl(URL.createObjectURL(file));
      setPreviewType('photo');
      setSelectedFile(file);
    }
  };

  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      triggerFeedback('notification');
      setPreviewUrl(URL.createObjectURL(file));
      setPreviewType('video');
      setSelectedFile(file);
    }
  };

  const handleConfirmMedia = () => {
    if (selectedFile && previewType) {
      triggerFeedback('send');
      if (previewType === 'photo') {
        onSelectPhoto(selectedFile);
      } else {
        onSelectVideo(selectedFile);
      }
      clearPreview();
      onClose();
    }
  };

  const clearPreview = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setPreviewType(null);
    setSelectedFile(null);
  };

  const handleEmojiSelect = (emoji: string) => {
    triggerFeedback('heart_like');
    onSelectEmoji(emoji);
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 100 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 100 }}
      className="bg-white rounded-t-3xl shadow-2xl overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex gap-2">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setActiveTab('media')}
            className={`px-4 py-2 rounded-xl font-medium transition-all ${
              activeTab === 'media' 
                ? 'bg-blue-500 text-white' 
                : 'bg-gray-100 text-gray-600'
            }`}
          >
            <ImageIcon className="w-5 h-5" />
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setActiveTab('emoji')}
            className={`px-4 py-2 rounded-xl font-medium transition-all ${
              activeTab === 'emoji' 
                ? 'bg-orange-500 text-white' 
                : 'bg-gray-100 text-gray-600'
            }`}
          >
            <Smile className="w-5 h-5" />
          </motion.button>
        </div>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={onClose}
          className="p-2 bg-gray-100 rounded-full"
        >
          <X className="w-5 h-5 text-gray-600" />
        </motion.button>
      </div>

      {/* Preview */}
      <AnimatePresence>
        {previewUrl && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="p-4 bg-gray-50"
          >
            <div className="relative rounded-2xl overflow-hidden bg-black aspect-video">
              {previewType === 'photo' ? (
                <img src={previewUrl} alt="Preview" className="w-full h-full object-contain" />
              ) : (
                <video src={previewUrl} controls className="w-full h-full object-contain" />
              )}
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={clearPreview}
                className="absolute top-2 right-2 p-2 bg-black/50 rounded-full"
              >
                <X className="w-4 h-4 text-white" />
              </motion.button>
            </div>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleConfirmMedia}
              className="w-full mt-3 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-medium flex items-center justify-center gap-2"
            >
              <Send className="w-5 h-5" />
              Envoyer
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content */}
      {!previewUrl && (
        <div className="p-4">
          {activeTab === 'media' && (
            <div className="grid grid-cols-4 gap-3">
              {/* Photo Button */}
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => photoInputRef.current?.click()}
                className="aspect-square bg-gradient-to-br from-green-400 to-green-600 rounded-2xl flex flex-col items-center justify-center gap-1 text-white shadow-lg"
              >
                <Camera className="w-8 h-8" />
                <span className="text-xs font-medium">Photo</span>
              </motion.button>

              {/* Video Button */}
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => videoInputRef.current?.click()}
                className="aspect-square bg-gradient-to-br from-red-400 to-red-600 rounded-2xl flex flex-col items-center justify-center gap-1 text-white shadow-lg"
              >
                <Video className="w-8 h-8" />
                <span className="text-xs font-medium">Vidéo</span>
              </motion.button>

              {/* Audio Button */}
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => {
                  triggerFeedback('notification');
                  onRecordAudio();
                }}
                className={`aspect-square rounded-2xl flex flex-col items-center justify-center gap-1 text-white shadow-lg ${
                  isRecording 
                    ? 'bg-gradient-to-br from-orange-500 to-red-500 animate-pulse' 
                    : 'bg-gradient-to-br from-blue-400 to-blue-600'
                }`}
              >
                <Mic className="w-8 h-8" />
                <span className="text-xs font-medium">Audio</span>
              </motion.button>

              {/* Emoji Button */}
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => setActiveTab('emoji')}
                className="aspect-square bg-gradient-to-br from-yellow-400 to-orange-500 rounded-2xl flex flex-col items-center justify-center gap-1 text-white shadow-lg"
              >
                <Smile className="w-8 h-8" />
                <span className="text-xs font-medium">Emoji</span>
              </motion.button>
            </div>
          )}

          {activeTab === 'emoji' && (
            <div className="grid grid-cols-8 gap-2">
              {EMOJI_LIST.map((emoji) => (
                <motion.button
                  key={emoji}
                  whileTap={{ scale: 0.8 }}
                  whileHover={{ scale: 1.2 }}
                  onClick={() => handleEmojiSelect(emoji)}
                  className="aspect-square text-3xl flex items-center justify-center hover:bg-gray-100 rounded-xl transition-colors"
                >
                  {emoji}
                </motion.button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Hidden inputs */}
      <input
        ref={photoInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handlePhotoSelect}
        className="hidden"
      />
      <input
        ref={videoInputRef}
        type="file"
        accept="video/*"
        capture="environment"
        onChange={handleVideoSelect}
        className="hidden"
      />
    </motion.div>
  );
}

export default TamTamMediaPicker;
