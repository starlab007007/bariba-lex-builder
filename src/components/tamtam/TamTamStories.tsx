import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Play, Pause, X, Volume2, Heart, Flame, Sparkles } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { TamTamStory } from '@/hooks/useTamTamPosts';
import { useTamTamLanguage } from '@/contexts/TamTamLanguageContext';
import { triggerFeedback } from '@/utils/tamtamFeedback';

interface TamTamStoriesProps {
  stories: TamTamStory[];
  onCreateStory: () => void;
}

const REACTIONS = [
  { emoji: '❤️', icon: Heart, sound: 'like', color: 'from-red-500 to-pink-500' },
  { emoji: '🔥', icon: Flame, sound: 'like', color: 'from-orange-500 to-red-500' },
  { emoji: '👏', icon: Sparkles, sound: 'success', color: 'from-yellow-500 to-orange-500' },
];

export const TamTamStories: React.FC<TamTamStoriesProps> = ({ stories, onCreateStory }) => {
  const { currentLang, t } = useTamTamLanguage();
  const [activeStory, setActiveStory] = useState<TamTamStory | null>(null);
  const [activeStoryIndex, setActiveStoryIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showReactions, setShowReactions] = useState(false);
  const [selectedReaction, setSelectedReaction] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Group stories by user
  const storiesByUser = stories.reduce((acc, story) => {
    const key = story.user_id || 'unknown';
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(story);
    return acc;
  }, {} as Record<string, TamTamStory[]>);

  const userIds = Object.keys(storiesByUser);

  // Auto-play management
  useEffect(() => {
    if (activeStory && isPlaying && audioRef.current) {
      const duration = activeStory.duration_seconds || 10;
      const updateInterval = 50; // Update every 50ms for smooth animation
      
      progressIntervalRef.current = setInterval(() => {
        setProgress(prev => {
          const increment = (updateInterval / 1000) / duration * 100;
          const newProgress = prev + increment;
          
          if (newProgress >= 100) {
            handleNextStory();
            return 0;
          }
          return newProgress;
        });
      }, updateInterval);
    }

    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, [activeStory, isPlaying]);

  const handleStoryClick = (userId: string) => {
    const userStories = storiesByUser[userId];
    if (userStories?.length > 0) {
      setActiveStory(userStories[0]);
      setActiveStoryIndex(0);
      setProgress(0);
      setIsPlaying(true);
      setSelectedReaction(null);
      
      setTimeout(() => {
        audioRef.current?.play();
      }, 100);
    }
  };

  const handleNextStory = () => {
    if (!activeStory) return;
    
    const currentUserId = activeStory.user_id || 'unknown';
    const userStories = storiesByUser[currentUserId];
    const currentUserIndex = userIds.indexOf(currentUserId);
    
    if (activeStoryIndex < userStories.length - 1) {
      // Next story from same user
      const nextStory = userStories[activeStoryIndex + 1];
      setActiveStory(nextStory);
      setActiveStoryIndex(activeStoryIndex + 1);
      setProgress(0);
      setSelectedReaction(null);
      audioRef.current?.pause();
      setTimeout(() => audioRef.current?.play(), 100);
    } else if (currentUserIndex < userIds.length - 1) {
      // Next user's stories
      const nextUserId = userIds[currentUserIndex + 1];
      const nextUserStories = storiesByUser[nextUserId];
      setActiveStory(nextUserStories[0]);
      setActiveStoryIndex(0);
      setProgress(0);
      setSelectedReaction(null);
      audioRef.current?.pause();
      setTimeout(() => audioRef.current?.play(), 100);
    } else {
      // End of all stories
      handleClose();
    }
  };

  const handlePrevStory = () => {
    if (!activeStory) return;
    
    const currentUserId = activeStory.user_id || 'unknown';
    const userStories = storiesByUser[currentUserId];
    const currentUserIndex = userIds.indexOf(currentUserId);
    
    if (activeStoryIndex > 0) {
      const prevStory = userStories[activeStoryIndex - 1];
      setActiveStory(prevStory);
      setActiveStoryIndex(activeStoryIndex - 1);
      setProgress(0);
      setSelectedReaction(null);
      audioRef.current?.pause();
      setTimeout(() => audioRef.current?.play(), 100);
    } else if (currentUserIndex > 0) {
      const prevUserId = userIds[currentUserIndex - 1];
      const prevUserStories = storiesByUser[prevUserId];
      setActiveStory(prevUserStories[prevUserStories.length - 1]);
      setActiveStoryIndex(prevUserStories.length - 1);
      setProgress(0);
      setSelectedReaction(null);
      audioRef.current?.pause();
      setTimeout(() => audioRef.current?.play(), 100);
    }
  };

  const handleClose = () => {
    setActiveStory(null);
    setIsPlaying(false);
    setProgress(0);
    setShowReactions(false);
    setSelectedReaction(null);
    audioRef.current?.pause();
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
    }
  };

  const handleTogglePlay = () => {
    if (isPlaying) {
      audioRef.current?.pause();
    } else {
      audioRef.current?.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleReaction = (emoji: string, sound: string) => {
    setSelectedReaction(emoji);
    triggerFeedback(sound as any, { haptic: true, sound: true });
    setShowReactions(false);
    
    // Show reaction animation
    setTimeout(() => {
      setSelectedReaction(null);
    }, 2000);
  };

  // Calculate circumference for circular progress
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

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
              onClick={() => handleStoryClick(userId)}
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
                  <div
                    className="h-full bg-white transition-all duration-100"
                    style={{
                      width: idx < activeStoryIndex 
                        ? '100%' 
                        : idx === activeStoryIndex 
                          ? `${progress}%` 
                          : '0%'
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

            {/* Navigation touch areas */}
            <div className="absolute inset-0 flex z-5">
              <button className="w-1/3 h-full" onClick={handlePrevStory} />
              <button className="w-1/3 h-full" onClick={handleTogglePlay} />
              <button className="w-1/3 h-full" onClick={handleNextStory} />
            </div>

            {/* Story Content with Circular Progress */}
            <div className="flex-1 flex items-center justify-center relative">
              {activeStory.photo_url ? (
                <img 
                  src={activeStory.photo_url} 
                  alt="Story" 
                  className="max-w-full max-h-full object-contain"
                />
              ) : (
                <div className="relative">
                  {/* Circular Progress Indicator */}
                  <svg className="w-48 h-48 transform -rotate-90">
                    <circle
                      cx="96"
                      cy="96"
                      r={radius}
                      stroke="rgba(255,255,255,0.3)"
                      strokeWidth="6"
                      fill="none"
                    />
                    <circle
                      cx="96"
                      cy="96"
                      r={radius}
                      stroke="white"
                      strokeWidth="6"
                      fill="none"
                      strokeLinecap="round"
                      style={{
                        strokeDasharray: circumference,
                        strokeDashoffset,
                        transition: 'stroke-dashoffset 0.1s linear'
                      }}
                    />
                  </svg>
                  
                  {/* Center content */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-32 h-32 rounded-full bg-gradient-to-br from-blue-500 to-emerald-400 flex items-center justify-center">
                      {isPlaying ? (
                        <motion.div
                          animate={{ scale: [1, 1.2, 1] }}
                          transition={{ repeat: Infinity, duration: 0.8 }}
                        >
                          <Volume2 className="w-12 h-12 text-white" />
                        </motion.div>
                      ) : (
                        <Play className="w-12 h-12 text-white ml-1" />
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Reaction animation */}
              <AnimatePresence>
                {selectedReaction && (
                  <motion.div
                    initial={{ scale: 0, y: 50 }}
                    animate={{ scale: 1.5, y: -100 }}
                    exit={{ scale: 0, opacity: 0 }}
                    className="absolute text-6xl"
                  >
                    {selectedReaction}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Transcript */}
            {(activeStory.transcript_fr || activeStory.transcript_ba) && (
              <div className="p-4 bg-gradient-to-t from-black/80 to-transparent">
                <p className="text-white text-center text-lg">
                  {currentLang === 'fr' ? activeStory.transcript_fr : activeStory.transcript_ba}
                </p>
              </div>
            )}

            {/* Reactions bar */}
            <div className="absolute bottom-24 left-0 right-0 flex justify-center gap-4 z-20">
              {REACTIONS.map((reaction) => (
                <motion.button
                  key={reaction.emoji}
                  whileHover={{ scale: 1.2 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => handleReaction(reaction.emoji, reaction.sound)}
                  className={`w-14 h-14 rounded-full bg-gradient-to-br ${reaction.color} flex items-center justify-center shadow-lg`}
                >
                  <span className="text-2xl">{reaction.emoji}</span>
                </motion.button>
              ))}
            </div>

            <audio
              ref={audioRef}
              src={activeStory.audio_url}
              onEnded={handleNextStory}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
