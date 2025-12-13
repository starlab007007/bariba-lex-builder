import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TamTamMicButton } from '@/components/tamtam/TamTamMicButton';
import { Play, Pause } from 'lucide-react';

const tabs = [
  { icon: '📢', id: 'feed' },
  { icon: '💬', id: 'messages' },
  { icon: '📻', id: 'live' },
];

const mockPosts = [
  { id: 1, avatar: '👨🏾', duration: '0:45', likes: 24, isPlaying: false },
  { id: 2, avatar: '👩🏾', duration: '1:20', likes: 89, isPlaying: false },
  { id: 3, avatar: '👴🏾', duration: '0:30', likes: 156, isPlaying: false },
  { id: 4, avatar: '👧🏾', duration: '2:05', likes: 42, isPlaying: false },
];

const mockMessages = [
  { id: 1, avatar: '👨🏾', unread: 3, lastTime: '2m' },
  { id: 2, avatar: '👩🏾', unread: 0, lastTime: '1h' },
  { id: 3, avatar: '👴🏾', unread: 1, lastTime: '3h' },
];

const mockLiveRooms = [
  { id: 1, host: '👨🏾', listeners: 45, title: '🎵' },
  { id: 2, host: '👩🏾', listeners: 128, title: '💬' },
  { id: 3, host: '👴🏾', listeners: 23, title: '📖' },
];

export default function TamTamSocial() {
  const [activeTab, setActiveTab] = useState('feed');
  const [playingId, setPlayingId] = useState<number | null>(null);
  const [isRecording, setIsRecording] = useState(false);

  const handlePlay = (id: number) => {
    setPlayingId(playingId === id ? null : id);
  };

  return (
    <div className="min-h-screen bg-tamtam-bg px-4">
      {/* Tab bar - icons only */}
      <div className="flex justify-center gap-4 mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`w-16 h-16 rounded-2xl flex items-center justify-center text-2xl transition-all ${
              activeTab === tab.id
                ? 'bg-tamtam-primary text-white shadow-tamtam-soft'
                : 'bg-tamtam-surface text-tamtam-text-muted'
            }`}
          >
            {tab.icon}
          </button>
        ))}
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'feed' && (
          <motion.div
            key="feed"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-4"
          >
            {mockPosts.map((post) => (
              <div
                key={post.id}
                className="bg-tamtam-surface rounded-3xl p-4 shadow-tamtam-soft flex items-center gap-4"
              >
                <div className="text-4xl">{post.avatar}</div>
                
                {/* Audio wave visualization */}
                <div className="flex-1 h-12 bg-tamtam-bg rounded-2xl flex items-center px-4 gap-1">
                  {[...Array(20)].map((_, i) => (
                    <motion.div
                      key={i}
                      animate={playingId === post.id ? {
                        height: [8, 20 + Math.random() * 20, 8],
                      } : { height: 8 }}
                      transition={{
                        duration: 0.5,
                        repeat: playingId === post.id ? Infinity : 0,
                        delay: i * 0.05,
                      }}
                      className="w-1 bg-tamtam-primary rounded-full"
                      style={{ height: 8 }}
                    />
                  ))}
                </div>

                {/* Play button */}
                <button
                  onClick={() => handlePlay(post.id)}
                  className="w-14 h-14 bg-tamtam-primary rounded-full flex items-center justify-center text-white"
                >
                  {playingId === post.id ? (
                    <Pause className="w-6 h-6" />
                  ) : (
                    <Play className="w-6 h-6 ml-1" />
                  )}
                </button>

                {/* Likes */}
                <div className="flex flex-col items-center">
                  <span className="text-xl">❤️</span>
                  <span className="text-sm text-tamtam-text-muted">{post.likes}</span>
                </div>
              </div>
            ))}
          </motion.div>
        )}

        {activeTab === 'messages' && (
          <motion.div
            key="messages"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-4"
          >
            {mockMessages.map((msg) => (
              <div
                key={msg.id}
                className="bg-tamtam-surface rounded-3xl p-4 shadow-tamtam-soft flex items-center gap-4"
              >
                <div className="text-4xl relative">
                  {msg.avatar}
                  {msg.unread > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-white text-xs flex items-center justify-center">
                      {msg.unread}
                    </span>
                  )}
                </div>
                
                <div className="flex-1 h-10 bg-tamtam-bg rounded-2xl flex items-center px-4">
                  <span className="text-xl">🔊</span>
                </div>

                <span className="text-tamtam-text-muted text-sm">{msg.lastTime}</span>
              </div>
            ))}
          </motion.div>
        )}

        {activeTab === 'live' && (
          <motion.div
            key="live"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-4"
          >
            {mockLiveRooms.map((room) => (
              <div
                key={room.id}
                className="bg-tamtam-surface rounded-3xl p-6 shadow-tamtam-soft"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="text-4xl">{room.host}</div>
                    <span className="text-2xl">{room.title}</span>
                  </div>
                  <div className="flex items-center gap-2 bg-red-500 text-white px-3 py-1 rounded-full">
                    <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                    <span className="text-sm font-medium">LIVE</span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">👥</span>
                    <span className="text-tamtam-text-muted">{room.listeners}</span>
                  </div>
                  <button className="bg-tamtam-primary text-white px-6 py-3 rounded-2xl flex items-center gap-2">
                    <span className="text-xl">🎧</span>
                  </button>
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating mic for creating content */}
      <div className="fixed bottom-28 right-4">
        <TamTamMicButton
          size="md"
          isRecording={isRecording}
          onPress={() => setIsRecording(!isRecording)}
        />
      </div>
    </div>
  );
}
