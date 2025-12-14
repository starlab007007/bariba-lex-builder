import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Play, Pause, X, Volume2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { TamTamStory } from '@/hooks/useTamTamPosts';
import { useTamTamLanguage } from '@/contexts/TamTamLanguageContext';

interface TamTamStoriesProps {
  stories: TamTamStory[];
  onCreateStory: () => void;
}

export const TamTamStories: React.FC<TamTamStoriesProps> = ({ stories, onCreateStory }) => {
  const { currentLang, t } = useTamTamLanguage();
  const [activeStory, setActiveStory] = useState<TamTamStory | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Group stories by user
  const storiesByUser = stories.reduce((acc, story) => {
    const key = story.user_id || 'unknown';
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(story);
    return acc;
  }, {} as Record<string, TamTamStory[]>);

  const handleStoryClick = (story: TamTamStory) => {
    setActiveStory(story);
    setIsPlaying(true);
    setTimeout(() => {
      audioRef.current?.play();
    }, 100);
  };

  const handleClose = () => {
    setActiveStory(null);
    setIsPlaying(false);
    audioRef.current?.pause();
  };

  const handleAudioEnd = () => {
    setIsPlaying(false);
    // Auto-advance to next story if available
    if (activeStory) {
      const userStories = storiesByUser[activeStory.user_id || 'unknown'];
      const currentIndex = userStories.findIndex(s => s.id === activeStory.id);
      if (currentIndex < userStories.length - 1) {
        handleStoryClick(userStories[currentIndex + 1]);
      } else {
        handleClose();
      }
    }
  };

  return (
    <>
      {/* Stories Bar */}
      <div className="flex gap-3 px-4 py-3 overflow-x-auto scrollbar-hide">
        {/* Create Story Button */}
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={onCreateStory}
          className="flex flex-col items-center gap-1 min-w-[70px]"
        >
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-100 to-emerald-100 flex items-center justify-center border-2 border-dashed border-blue-300">
            <Plus className="w-6 h-6 text-blue-500" />
          </div>
          <span className="text-xs text-gray-500 font-medium">{t('newPost')}</span>
        </motion.button>

        {/* User Stories */}
        {Object.entries(storiesByUser).map(([userId, userStories]) => {
          const firstStory = userStories[0];
          return (
            <motion.button
              key={userId}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleStoryClick(firstStory)}
              className="flex flex-col items-center gap-1 min-w-[70px]"
            >
              <div className="relative">
                <div className="w-16 h-16 rounded-full p-0.5 bg-gradient-to-br from-blue-500 via-emerald-400 to-blue-600">
                  <Avatar className="w-full h-full border-2 border-white">
                    <AvatarImage src={firstStory.photo_url || firstStory.profile?.avatar_url || ''} />
                    <AvatarFallback className="bg-gradient-to-br from-blue-400 to-blue-600 text-white text-lg">
                      {firstStory.profile?.display_name?.[0] || '?'}
                    </AvatarFallback>
                  </Avatar>
                </div>
                {userStories.length > 1 && (
                  <span className="absolute -bottom-1 -right-1 bg-blue-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-medium">
                    {userStories.length}
                  </span>
                )}
              </div>
              <span className="text-xs text-gray-600 font-medium truncate max-w-[70px]">
                {firstStory.profile?.display_name || firstStory.profile?.username || 'Utilisateur'}
              </span>
            </motion.button>
          );
        })}
      </div>

      {/* Story Viewer Modal */}
      <AnimatePresence>
        {activeStory && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black z-50 flex flex-col"
          >
            {/* Progress bars */}
            <div className="absolute top-0 left-0 right-0 flex gap-1 p-2 z-10">
              {storiesByUser[activeStory.user_id || 'unknown']?.map((story, idx) => (
                <div key={story.id} className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-white"
                    initial={{ width: story.id === activeStory.id ? '0%' : (idx < storiesByUser[activeStory.user_id || 'unknown'].findIndex(s => s.id === activeStory.id) ? '100%' : '0%') }}
                    animate={{ 
                      width: story.id === activeStory.id && isPlaying ? '100%' : undefined 
                    }}
                    transition={{ 
                      duration: activeStory.duration_seconds || 10,
                      ease: 'linear'
                    }}
                  />
                </div>
              ))}
            </div>

            {/* Header */}
            <div className="flex items-center gap-3 p-4 pt-8 z-10">
              <Avatar className="w-10 h-10 ring-2 ring-white">
                <AvatarImage src={activeStory.profile?.avatar_url || ''} />
                <AvatarFallback>{activeStory.profile?.display_name?.[0] || '?'}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="text-white font-medium">
                  {activeStory.profile?.display_name || activeStory.profile?.username}
                </p>
              </div>
              <button
                onClick={handleClose}
                className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>

            {/* Story Content */}
            <div className="flex-1 flex items-center justify-center relative">
              {activeStory.photo_url ? (
                <img 
                  src={activeStory.photo_url} 
                  alt="Story" 
                  className="max-w-full max-h-full object-contain"
                />
              ) : (
                <div className="w-48 h-48 rounded-full bg-gradient-to-br from-blue-500 to-emerald-400 flex items-center justify-center">
                  <Volume2 className="w-20 h-20 text-white animate-pulse" />
                </div>
              )}

              {/* Play/Pause overlay */}
              <button
                onClick={() => {
                  if (isPlaying) {
                    audioRef.current?.pause();
                  } else {
                    audioRef.current?.play();
                  }
                  setIsPlaying(!isPlaying);
                }}
                className="absolute inset-0 flex items-center justify-center"
              >
                {!isPlaying && (
                  <div className="w-20 h-20 rounded-full bg-white/30 backdrop-blur-sm flex items-center justify-center">
                    <Play className="w-10 h-10 text-white ml-1" />
                  </div>
                )}
              </button>
            </div>

            {/* Transcript */}
            {(activeStory.transcript_fr || activeStory.transcript_ba) && (
              <div className="p-4 bg-gradient-to-t from-black/80 to-transparent">
                <p className="text-white text-center text-lg">
                  {currentLang === 'fr' ? activeStory.transcript_fr : activeStory.transcript_ba}
                </p>
              </div>
            )}

            <audio
              ref={audioRef}
              src={activeStory.audio_url}
              onEnded={handleAudioEnd}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
