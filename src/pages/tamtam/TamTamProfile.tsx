import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { TamTamMicButton } from '@/components/tamtam/TamTamMicButton';
import { TamTamFollowersList } from '@/components/tamtam/TamTamFollowersList';
import { TamTamFriendsList } from '@/components/tamtam/TamTamFriendsList';
import { TamTamStoryCreator } from '@/components/tamtam/TamTamStoryCreator';
import { Volume2, Play, Loader2, LogOut, Mic, Clock, MessageCircle, Heart, Eye } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useTamTamLanguage } from '@/contexts/TamTamLanguageContext';
import { useAudioDescription } from '@/contexts/AudioDescriptionContext';
import { useBilingualAudio } from '@/hooks/useBilingualAudio';
import { useTamTamProfile } from '@/hooks/useTamTamProfile';
import { useTamTamFollows } from '@/hooks/useTamTamFollows';
import { useTamTamFriends } from '@/hooks/useTamTamFriends';
import { useTamTamPosts, TamTamStory } from '@/hooks/useTamTamPosts';
import { useAuth } from '@/contexts/AuthContext';
import { tamtamFeedback } from '@/utils/tamtamFeedback';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { triggerFeedback } from '@/utils/tamtamFeedback';

const badges = [
  { icon: '⭐', color: 'bg-yellow-100', label: 'Débutant' },
  { icon: '🎯', color: 'bg-blue-100', label: 'Actif' },
  { icon: '🏆', color: 'bg-amber-100', label: 'Champion' },
  { icon: '💎', color: 'bg-purple-100', label: 'Expert' },
];

const settingsItems = [
  { icon: '🔔', id: 'notifications', labelKey: 'notifications' },
  { icon: '🌐', id: 'language', labelKey: 'language' },
  { icon: '❓', id: 'help', labelKey: 'help' },
];

export default function TamTamProfile() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { profile, loading: profileLoading, updateProfile } = useTamTamProfile();
  const { followersCount, followingCount } = useTamTamFollows();
  const { friendsCount } = useTamTamFriends();
  const { stories, fetchStories } = useTamTamPosts();
  
  const [isPlayingBio, setIsPlayingBio] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showFollowers, setShowFollowers] = useState(false);
  const [showFollowing, setShowFollowing] = useState(false);
  const [showFriends, setShowFriends] = useState(false);
  const [showStoryCreator, setShowStoryCreator] = useState(false);
  const [activeStory, setActiveStory] = useState<TamTamStory | null>(null);
  const [storyProgress, setStoryProgress] = useState(0);
  
  const { t, currentLang } = useTamTamLanguage();
  const { announceAction } = useAudioDescription();
  const { speakCurrentLang } = useBilingualAudio();
  const { toast } = useToast();

  // Filter stories for current user
  const userStories = stories.filter(s => s.user_id === user?.id);

  // Calculate vocal stats
  const vocalStats = {
    totalRecordings: (profile?.posts_count || 0) + userStories.length,
    totalDuration: userStories.reduce((acc, s) => acc + (s.duration_seconds || 0), 0),
    totalViews: userStories.reduce((acc, s) => acc + (s.views_count || 0), 0),
    totalReactions: 0 // Would need reactions data
  };

  useEffect(() => {
    if (!user) {
      navigate('/tamtam/auth');
    }
  }, [user, navigate]);

  useEffect(() => {
    announceAction(t('screenProfile'));
  }, [announceAction, t]);

  // Story playback
  const handlePlayStory = (story: TamTamStory) => {
    setActiveStory(story);
    setStoryProgress(0);
    triggerFeedback('click');
    
    const audio = new Audio(story.audio_url);
    const duration = story.duration_seconds || 10;
    
    const interval = setInterval(() => {
      setStoryProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setActiveStory(null);
          return 0;
        }
        return prev + (100 / duration / 10);
      });
    }, 100);
    
    audio.onended = () => {
      clearInterval(interval);
      setActiveStory(null);
      setStoryProgress(0);
    };
    
    audio.play();
  };

  const handleRecordBio = async (result: {
    audioBase64: string;
    transcription?: string;
    translation?: string;
    sourceLang: 'ba' | 'fr';
  }) => {
    setIsProcessing(true);
    tamtamFeedback.play('send');
    
    try {
      const base64Data = result.audioBase64.includes(',') 
        ? result.audioBase64.split(',')[1] 
        : result.audioBase64;
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'audio/webm' });
      
      const fileName = `bio_${user?.id}_${Date.now()}.webm`;
      
      const { error: uploadError } = await supabase.storage
        .from('tamtam-audio')
        .upload(fileName, blob, { contentType: 'audio/webm' });
      
      if (uploadError) throw uploadError;
      
      const { data: urlData } = supabase.storage
        .from('tamtam-audio')
        .getPublicUrl(fileName);
      
      await updateProfile({
        bio_audio_url: urlData.publicUrl,
        bio_transcript_fr: result.sourceLang === 'fr' ? result.transcription : result.translation,
        bio_transcript_ba: result.sourceLang === 'ba' ? result.transcription : result.translation
      });
      
      toast({
        title: "✅ Bio enregistrée",
        description: result.transcription || "Votre bio audio a été sauvegardée"
      });
      
      await speakCurrentLang(
        currentLang === 'ba'
          ? "Ó dára! Bio rẹ ti jẹ́ títẹ̀jáde"
          : "Parfait ! Votre bio a été enregistrée"
      );
      
      tamtamFeedback.play('success');
    } catch (err: any) {
      console.error('[TamTamProfile] Bio recording error:', err);
      toast({
        title: "Erreur",
        description: err.message,
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePlayBio = async () => {
    if (!profile?.bio_audio_url) return;
    
    tamtamFeedback.play('click');
    setIsPlayingBio(true);
    
    try {
      const audio = new Audio(profile.bio_audio_url);
      audio.onended = () => setIsPlayingBio(false);
      audio.onerror = () => setIsPlayingBio(false);
      await audio.play();
    } catch (err) {
      console.error('[TamTamProfile] Play bio error:', err);
      setIsPlayingBio(false);
    }
  };

  const handleSettingPress = (labelKey: string) => {
    tamtamFeedback.play('click');
    speakCurrentLang(t(labelKey));
  };

  const handleLogout = async () => {
    tamtamFeedback.play('click');
    await signOut();
    navigate('/tamtam/auth');
  };

  const stats = [
    { icon: '📢', value: profile?.posts_count || 0, labelKey: 'posts', onClick: () => {} },
    { icon: '👥', value: followersCount, labelKey: 'followers', onClick: () => setShowFollowers(true) },
    { icon: '🤝', value: friendsCount, labelKey: 'friends', onClick: () => setShowFriends(true) },
  ];

  // Circular progress for story
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (storyProgress / 100) * circumference;

  if (profileLoading) {
    return (
      <div className="min-h-screen bg-tamtam-bg flex items-center justify-center">
        <div className="animate-spin text-4xl">⏳</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-tamtam-bg px-4 pt-8 pb-32">
      {/* Profile photo */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        className="flex justify-center mb-4"
      >
        <button className="relative">
          <div className="w-32 h-32 bg-tamtam-surface rounded-full shadow-tamtam-soft flex items-center justify-center overflow-hidden">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-6xl">👤</span>
            )}
          </div>
          <div className="absolute bottom-0 right-0 w-10 h-10 bg-tamtam-primary rounded-full flex items-center justify-center">
            <span className="text-xl">📷</span>
          </div>
        </button>
      </motion.div>

      {/* Name and username */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-center mb-6"
      >
        <h1 className="text-xl font-bold text-tamtam-text">
          {profile?.display_name || profile?.username || t('profile')}
        </h1>
        {profile?.username && (
          <p className="text-sm text-tamtam-text-muted">@{profile.username}</p>
        )}
        <span className="inline-flex items-center gap-1 mt-2 px-3 py-1 bg-tamtam-secondary/10 rounded-full">
          <span className="text-sm">🌐</span>
          <span className="text-xs font-medium text-tamtam-secondary">
            {currentLang === 'ba' ? 'Bàátɔ̀nú' : 'Français'}
          </span>
        </span>
      </motion.div>

      {/* Voice bio section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-tamtam-surface rounded-3xl p-6 shadow-tamtam-soft mb-6"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-3xl">🎙️</span>
            <span className="text-sm font-medium text-tamtam-text">
              {t('audioBio')}
            </span>
          </div>
          {profile?.bio_audio_url && (
            <div className="flex items-center gap-2">
              <span className="text-xl text-green-500">✓</span>
            </div>
          )}
        </div>

        {profile?.bio_audio_url ? (
          <div className="space-y-3">
            <button
              onClick={handlePlayBio}
              disabled={isPlayingBio}
              className="w-full h-16 bg-tamtam-bg rounded-2xl flex items-center justify-center px-4 gap-3"
            >
              {isPlayingBio ? (
                <div className="flex gap-1">
                  {[...Array(30)].map((_, i) => (
                    <motion.div
                      key={i}
                      animate={{ height: [8, 24, 8] }}
                      transition={{ duration: 0.4, repeat: Infinity, delay: i * 0.05 }}
                      className="w-1 bg-tamtam-primary rounded-full"
                    />
                  ))}
                </div>
              ) : (
                <>
                  <Play className="w-6 h-6 text-tamtam-primary" />
                  <div className="flex gap-1">
                    {[...Array(30)].map((_, i) => (
                      <div
                        key={i}
                        className="w-1 bg-tamtam-primary rounded-full"
                        style={{ height: 8 + Math.random() * 24 }}
                      />
                    ))}
                  </div>
                </>
              )}
            </button>
            
            {(profile.bio_transcript_fr || profile.bio_transcript_ba) && (
              <p className="text-sm text-tamtam-text-muted text-center italic">
                "{currentLang === 'ba' ? profile.bio_transcript_ba : profile.bio_transcript_fr}"
              </p>
            )}
            
            <div className="flex justify-center">
              <TamTamMicButton
                size="sm"
                onRecordingComplete={handleRecordBio}
                autoTranscribe={true}
                autoTranslate={true}
                sourceLang={currentLang}
                disabled={isProcessing}
              />
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <TamTamMicButton
              size="md"
              onRecordingComplete={handleRecordBio}
              autoTranscribe={true}
              autoTranslate={true}
              sourceLang={currentLang}
              disabled={isProcessing}
            />
            <span className="text-xs text-tamtam-text-muted">
              {t('recordBio')}
            </span>
            {isProcessing && (
              <div className="flex items-center gap-2 text-tamtam-primary">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">{t('processing')}</span>
              </div>
            )}
          </div>
        )}
      </motion.div>

      {/* Badges */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-tamtam-surface rounded-3xl p-4 shadow-tamtam-soft mb-6"
      >
        <div className="flex items-center gap-2 mb-3">
          <span className="text-lg">🏅</span>
          <span className="text-sm font-medium text-tamtam-text">{t('badges')}</span>
        </div>
        <div className="flex justify-center gap-4">
          {badges.map((badge, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4 + index * 0.1 }}
              className={`w-14 h-14 ${badge.color} rounded-2xl flex items-center justify-center`}
            >
              <span className="text-2xl">{badge.icon}</span>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="grid grid-cols-3 gap-4 mb-6"
      >
        {stats.map((stat) => (
          <button
            key={stat.labelKey}
            onClick={stat.onClick}
            className="bg-tamtam-surface rounded-3xl p-4 shadow-tamtam-soft text-center active:scale-95 transition-transform"
          >
            <span className="text-2xl">{stat.icon}</span>
            <div className="text-2xl font-bold text-tamtam-text mt-1">{stat.value}</div>
            <div className="text-xs text-tamtam-text-muted">{t(stat.labelKey)}</div>
          </button>
        ))}
      </motion.div>

      {/* My Stories Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.55 }}
        className="bg-tamtam-surface rounded-3xl p-4 shadow-tamtam-soft mb-6"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-lg">📸</span>
            <span className="text-sm font-medium text-tamtam-text">Mes Stories</span>
          </div>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowStoryCreator(true)}
            className="px-3 py-1.5 bg-gradient-to-r from-blue-500 to-emerald-500 text-white text-xs font-medium rounded-full"
          >
            + Nouvelle
          </motion.button>
        </div>
        
        {userStories.length === 0 ? (
          <div className="text-center py-6">
            <div className="w-16 h-16 mx-auto mb-3 bg-gray-100 rounded-full flex items-center justify-center">
              <Mic className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-sm text-gray-500">Aucune story active</p>
            <p className="text-xs text-gray-400 mt-1">Créez votre première story vocale !</p>
          </div>
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-2">
            {userStories.map((story) => (
              <motion.button
                key={story.id}
                whileTap={{ scale: 0.95 }}
                onClick={() => handlePlayStory(story)}
                className="relative flex-shrink-0"
              >
                <div className="relative">
                  {/* Circular progress */}
                  {activeStory?.id === story.id && (
                    <svg className="absolute -inset-1 w-[72px] h-[72px] transform -rotate-90">
                      <circle
                        cx="36"
                        cy="36"
                        r={radius}
                        stroke="rgba(59, 130, 246, 0.3)"
                        strokeWidth="3"
                        fill="none"
                      />
                      <circle
                        cx="36"
                        cy="36"
                        r={radius}
                        stroke="#3B82F6"
                        strokeWidth="3"
                        fill="none"
                        strokeLinecap="round"
                        style={{
                          strokeDasharray: circumference,
                          strokeDashoffset,
                          transition: 'stroke-dashoffset 0.1s linear'
                        }}
                      />
                    </svg>
                  )}
                  
                  <div className={`w-16 h-16 rounded-full overflow-hidden border-2 ${
                    activeStory?.id === story.id ? 'border-blue-500' : 'border-emerald-400'
                  }`}>
                    {story.photo_url ? (
                      <img src={story.photo_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-blue-400 to-emerald-400 flex items-center justify-center">
                        <Volume2 className={`w-6 h-6 text-white ${activeStory?.id === story.id ? 'animate-pulse' : ''}`} />
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center justify-center gap-1 mt-1">
                  <Eye className="w-3 h-3 text-gray-400" />
                  <span className="text-xs text-gray-500">{story.views_count || 0}</span>
                </div>
              </motion.button>
            ))}
          </div>
        )}
      </motion.div>

      {/* Vocal Statistics */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="bg-gradient-to-br from-blue-500 to-emerald-500 rounded-3xl p-5 shadow-lg mb-6"
      >
        <div className="flex items-center gap-2 mb-4">
          <span className="text-lg">🎙️</span>
          <span className="text-sm font-semibold text-white">Statistiques Vocales</span>
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-3 text-center">
            <Mic className="w-5 h-5 text-white mx-auto mb-1" />
            <div className="text-xl font-bold text-white">{vocalStats.totalRecordings}</div>
            <div className="text-xs text-white/80">Enregistrements</div>
          </div>
          <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-3 text-center">
            <Clock className="w-5 h-5 text-white mx-auto mb-1" />
            <div className="text-xl font-bold text-white">
              {Math.floor(vocalStats.totalDuration / 60)}:{String(vocalStats.totalDuration % 60).padStart(2, '0')}
            </div>
            <div className="text-xs text-white/80">Durée totale</div>
          </div>
          <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-3 text-center">
            <Eye className="w-5 h-5 text-white mx-auto mb-1" />
            <div className="text-xl font-bold text-white">{vocalStats.totalViews}</div>
            <div className="text-xs text-white/80">Vues stories</div>
          </div>
          <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-3 text-center">
            <Heart className="w-5 h-5 text-white mx-auto mb-1" />
            <div className="text-xl font-bold text-white">{vocalStats.totalReactions}</div>
            <div className="text-xs text-white/80">Réactions</div>
          </div>
        </div>
      </motion.div>

      {/* Settings items */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="space-y-3"
      >
        {settingsItems.map((item) => (
          <button
            key={item.id}
            onClick={() => handleSettingPress(item.labelKey)}
            className="w-full bg-tamtam-surface rounded-2xl p-4 shadow-tamtam-soft flex items-center gap-4 active:scale-[0.98] transition-transform"
          >
            <span className="text-2xl">{item.icon}</span>
            <span className="flex-1 text-left font-medium text-tamtam-text">
              {t(item.labelKey)}
            </span>
            <Volume2 className="w-5 h-5 text-tamtam-text-muted" />
            <span className="text-xl text-tamtam-text-muted">→</span>
          </button>
        ))}

        {/* Logout button */}
        <button
          onClick={handleLogout}
          className="w-full bg-red-50 rounded-2xl p-4 shadow-tamtam-soft flex items-center gap-4 active:scale-[0.98] transition-transform"
        >
          <LogOut className="w-6 h-6 text-red-500" />
          <span className="flex-1 text-left font-medium text-red-500">
            {t('logout')}
          </span>
        </button>
      </motion.div>

      {/* Modals */}
      {user && (
        <>
          <TamTamFollowersList
            userId={user.id}
            type="followers"
            isOpen={showFollowers}
            onClose={() => setShowFollowers(false)}
          />
          <TamTamFollowersList
            userId={user.id}
            type="following"
            isOpen={showFollowing}
            onClose={() => setShowFollowing(false)}
          />
          <TamTamFriendsList
            isOpen={showFriends}
            onClose={() => setShowFriends(false)}
          />
          
          <TamTamStoryCreator
            isOpen={showStoryCreator}
            onClose={() => setShowStoryCreator(false)}
            onStoryCreated={() => fetchStories()}
          />
        </>
      )}
    </div>
  );
}
