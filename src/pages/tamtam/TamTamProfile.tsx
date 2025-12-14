import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { TamTamMicButton } from '@/components/tamtam/TamTamMicButton';
import { TamTamFollowersList } from '@/components/tamtam/TamTamFollowersList';
import { TamTamFriendsList } from '@/components/tamtam/TamTamFriendsList';
import { TamTamStories } from '@/components/tamtam/TamTamStories';
import { Volume2, Play, Loader2, LogOut, Mic, Clock, Eye, Heart } from 'lucide-react';
import { useTamTamLanguage } from '@/contexts/TamTamLanguageContext';
import { useAudioDescription } from '@/contexts/AudioDescriptionContext';
import { useBilingualAudio } from '@/hooks/useBilingualAudio';
import { useTamTamProfile } from '@/hooks/useTamTamProfile';
import { useTamTamFollows } from '@/hooks/useTamTamFollows';
import { useTamTamFriends } from '@/hooks/useTamTamFriends';
import { useTamTamPosts } from '@/hooks/useTamTamPosts';
import { useAuth } from '@/contexts/AuthContext';
import { tamtamFeedback } from '@/utils/tamtamFeedback';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const badges = [
  { icon: '⭐', color: 'bg-yellow-100' },
  { icon: '🎯', color: 'bg-blue-100' },
  { icon: '🏆', color: 'bg-amber-100' },
  { icon: '💎', color: 'bg-purple-100' },
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
  const { stories } = useTamTamPosts();
  
  const [isPlayingBio, setIsPlayingBio] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showFollowers, setShowFollowers] = useState(false);
  const [showFollowing, setShowFollowing] = useState(false);
  const [showFriends, setShowFriends] = useState(false);
  const [showStories, setShowStories] = useState(false);
  
  const { t, currentLang } = useTamTamLanguage();
  const { announceAction } = useAudioDescription();
  const { speakCurrentLang } = useBilingualAudio();
  const { toast } = useToast();

  // Filter stories for current user
  const myStories = stories.filter(s => s.user_id === user?.id);

  // Calculate vocal stats
  const vocalStats = {
    totalRecordings: (profile?.posts_count || 0) + myStories.length,
    totalDuration: myStories.reduce((acc, s) => acc + (s.duration_seconds || 0), 0),
    storyViews: myStories.reduce((acc, s) => acc + (s.views_count || 0), 0),
    totalReactions: 0 // Would need to aggregate from reactions
  };

  useEffect(() => {
    if (!user) {
      navigate('/tamtam/auth');
    }
  }, [user, navigate]);

  useEffect(() => {
    announceAction(t('screenProfile'));
  }, [announceAction, t]);

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

      {/* My Stories Section */}
      {myStories.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-tamtam-surface rounded-3xl p-4 shadow-tamtam-soft mb-6"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-lg">📖</span>
              <span className="text-sm font-medium text-tamtam-text">{t('myStories') || 'Mes Stories'}</span>
            </div>
            <span className="text-xs text-tamtam-text-muted">{myStories.length} stories</span>
          </div>
          
          <TamTamStories 
            stories={myStories} 
            onCreateStory={() => navigate('/tamtam/social')} 
          />
        </motion.div>
      )}

      {/* Vocal Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="bg-gradient-to-br from-blue-500 to-emerald-400 rounded-3xl p-4 shadow-tamtam-soft mb-6 text-white"
      >
        <div className="flex items-center gap-2 mb-4">
          <Mic className="w-5 h-5" />
          <span className="text-sm font-medium">{t('vocalStats') || 'Statistiques Vocales'}</span>
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white/20 rounded-2xl p-3 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Mic className="w-4 h-4" />
              <span className="text-2xl font-bold">{vocalStats.totalRecordings}</span>
            </div>
            <span className="text-xs opacity-80">{t('recordings') || 'Enregistrements'}</span>
          </div>
          
          <div className="bg-white/20 rounded-2xl p-3 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Clock className="w-4 h-4" />
              <span className="text-2xl font-bold">
                {Math.floor(vocalStats.totalDuration / 60)}m
              </span>
            </div>
            <span className="text-xs opacity-80">{t('duration') || 'Durée totale'}</span>
          </div>
          
          <div className="bg-white/20 rounded-2xl p-3 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Eye className="w-4 h-4" />
              <span className="text-2xl font-bold">{vocalStats.storyViews}</span>
            </div>
            <span className="text-xs opacity-80">{t('storyViews') || 'Vues stories'}</span>
          </div>
          
          <div className="bg-white/20 rounded-2xl p-3 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Heart className="w-4 h-4" />
              <span className="text-2xl font-bold">{vocalStats.totalReactions}</span>
            </div>
            <span className="text-xs opacity-80">{t('reactions') || 'Réactions'}</span>
          </div>
        </div>
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
        </>
      )}
    </div>
  );
}
