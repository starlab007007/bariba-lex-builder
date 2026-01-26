import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Globe, MoreVertical, Edit, Trash2, Eye, Heart, MessageCircle, Play } from 'lucide-react';
import { MyPost } from '@/hooks/useMyPosts';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface MyPostsGridProps {
  posts: MyPost[];
  filter: 'all' | 'public' | 'private';
  onFilterChange: (filter: 'all' | 'public' | 'private') => void;
  onEdit: (post: MyPost) => void;
  onDelete: (postId: string) => void;
  onToggleVisibility: (postId: string, isPublic: boolean) => void;
  onPlay: (post: MyPost) => void;
}

export const MyPostsGrid: React.FC<MyPostsGridProps> = ({
  posts,
  filter,
  onFilterChange,
  onEdit,
  onDelete,
  onToggleVisibility,
  onPlay,
}) => {
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const filteredPosts = posts.filter(p => {
    if (filter === 'public') return p.is_public;
    if (filter === 'private') return !p.is_public;
    return true;
  });

  const handleDeleteClick = (postId: string) => {
    if (deleteConfirm === postId) {
      onDelete(postId);
      setDeleteConfirm(null);
    } else {
      setDeleteConfirm(postId);
      setTimeout(() => setDeleteConfirm(null), 3000);
    }
  };

  return (
    <div className="space-y-4">
      {/* Posts grid */}
      <div className="grid grid-cols-3 gap-1 px-1">
        <AnimatePresence mode="popLayout">
          {filteredPosts.map((post, index) => (
            <motion.div
              key={post.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ delay: index * 0.03 }}
              className="relative aspect-square bg-muted rounded-lg overflow-hidden group"
            >
              {/* Thumbnail or placeholder */}
              {post.thumbnail_url || post.media_url ? (
                <img
                  src={post.thumbnail_url || post.media_url || ''}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                  <span className="text-3xl">{post.feeling_emoji || '🎤'}</span>
                </div>
              )}

              {/* Overlay on hover */}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => onPlay(post)}
                  className="p-2 bg-white/20 backdrop-blur-sm rounded-full"
                >
                  <Play className="w-5 h-5 text-white" fill="white" />
                </motion.button>
              </div>

              {/* Visibility badge */}
              <div className="absolute top-2 left-2">
                {post.is_public ? (
                  <Globe className="w-4 h-4 text-white drop-shadow-lg" />
                ) : (
                  <Lock className="w-4 h-4 text-white drop-shadow-lg" />
                )}
              </div>

              {/* Menu */}
              <div className="absolute top-2 right-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      className="p-1.5 bg-black/30 backdrop-blur-sm rounded-full"
                    >
                      <MoreVertical className="w-4 h-4 text-white" />
                    </motion.button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem onClick={() => onEdit(post)}>
                      <Edit className="w-4 h-4 mr-2" />
                      Modifier
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onToggleVisibility(post.id, !post.is_public)}>
                      {post.is_public ? (
                        <>
                          <Lock className="w-4 h-4 mr-2" />
                          Rendre privé
                        </>
                      ) : (
                        <>
                          <Globe className="w-4 h-4 mr-2" />
                          Rendre public
                        </>
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => handleDeleteClick(post.id)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      {deleteConfirm === post.id ? 'Confirmer ?' : 'Supprimer'}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Stats */}
              <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/70 to-transparent">
                <div className="flex items-center gap-3 text-white text-xs">
                  <span className="flex items-center gap-1">
                    <Heart className="w-3 h-3" />
                    {post.likes_count}
                  </span>
                  <span className="flex items-center gap-1">
                    <MessageCircle className="w-3 h-3" />
                    {post.comments_count}
                  </span>
                  {post.duration_seconds && (
                    <span className="ml-auto">
                      {Math.floor(post.duration_seconds / 60)}:{String(post.duration_seconds % 60).padStart(2, '0')}
                    </span>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Empty state */}
      {filteredPosts.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-12"
        >
          <div className="text-4xl mb-3">📭</div>
          <p className="text-muted-foreground">
            {filter === 'private' 
              ? 'Aucune publication privée'
              : filter === 'public'
              ? 'Aucune publication publique'
              : 'Aucune publication'}
          </p>
        </motion.div>
      )}
    </div>
  );
};
