import { useState } from 'react';
import { motion } from 'framer-motion';
import { Mic, Play, Pause, Heart, MoreHorizontal, Search, Bell, User, Headphones } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';

const mockPosts = [
  {
    id: '1',
    user: { name: 'Aminata Koné', username: '@aminata', avatar: '', verified: true },
    duration: 45,
    title: 'Wêke: kara gun karâ',
    description: 'Parlez Wâbra gun kara*.... Conte de lîr 6.moo:',
    thumbnail: 'https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?w=800&q=80',
    likes: 234,
    views: '4K',
    hashtag: '#4Bofli.Wouttoge',
    time: '2h',
  },
  {
    id: '2',
    user: { name: 'Ibrahim Diallo', username: '@ibrahim_d', avatar: '', verified: false },
    duration: 120,
    title: 'Gandu yèrè kô',
    description: 'Discussion sur les opportunités dans le secteur agricole...',
    thumbnail: 'https://images.unsplash.com/photo-1560493676-04071c5f467b?w=800&q=80',
    likes: 156,
    views: '2.1K',
    hashtag: '#Agritech',
    time: '4h',
  },
  {
    id: '3',
    user: { name: 'Fatou Sow', username: '@fatou_sow', avatar: '', verified: true },
    duration: 60,
    title: 'Santé communautaire',
    description: 'Conseils santé : prévention du paludisme pendant la saison des pluies...',
    thumbnail: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=800&q=80',
    likes: 567,
    views: '8.5K',
    hashtag: '#Santé',
    time: '6h',
  },
];

export default function YovoFeed() {
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-100">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
            <span className="text-xl">🦅</span>
          </div>
          
          <motion.button
            whileTap={{ scale: 0.95 }}
            className="w-12 h-12 rounded-full bg-white shadow-lg flex items-center justify-center"
          >
            <Mic className="w-6 h-6 text-gray-800" />
          </motion.button>
          
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="rounded-full">
              <Bell className="w-5 h-5 text-gray-600" />
            </Button>
            <Avatar className="w-10 h-10 ring-2 ring-orange-500">
              <AvatarFallback className="bg-orange-100 text-orange-600">U</AvatarFallback>
            </Avatar>
          </div>
        </div>
        
        {/* Search Bar */}
        <div className="px-4 pb-3">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              placeholder="Rechercher..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 pr-12 h-12 bg-gray-50 border-0 rounded-2xl text-gray-800 placeholder:text-gray-400"
            />
            <Headphones className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          </div>
        </div>
      </header>

      <div className="px-4 py-4 space-y-4 pb-24">
        {/* Story Prompt Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl p-5 shadow-sm"
        >
          <div className="flex items-start gap-4">
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="w-20 h-20 rounded-full bg-orange-500 flex items-center justify-center flex-shrink-0 cursor-pointer"
            >
              <Mic className="w-10 h-10 text-white" />
            </motion.div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-gray-900 leading-tight">
                Parlez, partagez vos histoires...
              </h2>
            </div>
          </div>
          
          <div className="flex items-center justify-between mt-4">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 rounded-full">
                <span className="text-orange-500 font-semibold text-sm">⚡</span>
                <span className="text-gray-600 text-sm">A fnrrea gánd</span>
              </div>
              <span className="text-gray-400 text-sm">02 Arm 6 Rro</span>
            </div>
            <div className="flex items-center gap-2">
              <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <Heart className="w-6 h-6 text-orange-500 fill-orange-500" />
              </button>
              <span className="px-4 py-1.5 bg-orange-500 text-white rounded-full font-semibold text-sm">
                4K
              </span>
            </div>
          </div>
        </motion.div>

        {/* Posts */}
        {mockPosts.map((post, index) => (
          <motion.div
            key={post.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white rounded-3xl overflow-hidden shadow-sm"
          >
            {/* Post Header */}
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar className="w-10 h-10">
                  <AvatarImage src={post.user.avatar} />
                  <AvatarFallback className="bg-gradient-to-br from-orange-400 to-orange-600 text-white text-sm">
                    {post.user.name[0]}
                  </AvatarFallback>
                </Avatar>
                <span className="font-semibold text-gray-900">{post.title}</span>
              </div>
              <Button variant="ghost" size="icon" className="text-gray-400 hover:text-gray-600">
                <MoreHorizontal className="w-5 h-5" />
              </Button>
            </div>

            {/* Media Thumbnail */}
            <div className="relative aspect-[4/3] bg-gray-100">
              <img
                src={post.thumbnail}
                alt={post.title}
                className="w-full h-full object-cover"
              />
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setPlayingId(playingId === post.id ? null : post.id)}
                className="absolute inset-0 m-auto w-16 h-16 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-lg"
              >
                {playingId === post.id ? (
                  <Pause className="w-7 h-7 text-gray-800" />
                ) : (
                  <Play className="w-7 h-7 text-gray-800 ml-1" />
                )}
              </motion.button>
              <div className="absolute bottom-3 right-3 px-2 py-1 bg-black/60 backdrop-blur-sm rounded text-white text-xs font-medium">
                {Math.floor(post.duration / 60)}:{(post.duration % 60).toString().padStart(2, '0')}
              </div>
            </div>

            {/* Post Content */}
            <div className="p-4">
              <div className="flex items-start justify-between">
                <p className="text-gray-700 text-sm flex-1 line-clamp-2">{post.description}</p>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  className="w-12 h-12 rounded-full bg-orange-50 flex items-center justify-center flex-shrink-0 ml-3"
                >
                  <Play className="w-5 h-5 text-orange-500 ml-0.5" />
                </motion.button>
              </div>
              
              {/* Stats & Hashtag */}
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center">
                    <span className="text-white text-xs">🦅</span>
                  </div>
                  <span className="text-gray-500 text-sm">{post.likes} Upéa -Pinethen</span>
                </div>
                <div className="flex items-center gap-1 text-gray-400">
                  <MoreHorizontal className="w-4 h-4" />
                  <span className="text-sm">16</span>
                </div>
              </div>
              
              <div className="flex items-center justify-between mt-2">
                <span className="text-gray-600 text-sm font-medium">{post.hashtag}</span>
                <span className="text-orange-500 font-semibold text-sm">BC4meede</span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
