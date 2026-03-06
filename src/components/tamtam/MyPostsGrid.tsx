import React, { useState } from 'react';
import { Lock, Globe, MoreVertical, Edit, Trash2, Heart, MessageCircle, Share2, Play, Loader2, Video, Image as ImageIcon, Mic } from 'lucide-react';
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
  onViewPost?: (index: number) => void;
}

const isVideoUrl = (url: string | null | undefined): boolean => {
  if (!url) return false;
  return /\.(mp4|webm|mov|avi|mkv)(\?|$)/i.test(url);
};

const isImageUrl = (url: string | null | undefined): boolean => {
  if (!url) return false;
  return /\.(jpg|jpeg|png|gif|webp|svg|bmp)(\?|$)/i.test(url);
};

const getMediaType = (post: MyPost): 'video' | 'image' | 'audio' => {
  if (post.media_type === 'video' || isVideoUrl(post.media_url)) return 'video';
  if (post.media_type === 'image' || post.media_type === 'photo' || isImageUrl(post.media_url)) return 'image';
  if (isImageUrl(post.thumbnail_url)) return 'image';
  return 'audio';
};

const PostThumbnail = React.memo(({ post }: { post: MyPost }) => {
  const [imgError, setImgError] = useState(false);
  const mediaType = getMediaType(post);

  if (mediaType === 'video') {
    return (
      <>
        <video
          src={post.media_url!}
          poster={post.thumbnail_url || undefined}
          className="w-full h-full object-cover"
          muted
          playsInline
          preload="metadata"
        />
        <div className="absolute top-2 right-8 bg-black/50 backdrop-blur-sm rounded-full p-1">
          <Video className="w-3 h-3 text-white" />
        </div>
      </>
    );
  }

  if (mediaType === 'image' && !imgError) {
    const imgSrc = post.media_url || post.thumbnail_url || '';
    return (
      <>
        <img
          src={imgSrc}
          alt=""
          className="w-full h-full object-cover"
          loading="lazy"
          onError={() => setImgError(true)}
        />
        <div className="absolute top-2 right-8 bg-black/50 backdrop-blur-sm rounded-full p-1">
          <ImageIcon className="w-3 h-3 text-white" />
        </div>
      </>
    );
  }

  return (
    <div className="w-full h-full bg-gradient-to-br from-primary/20 to-secondary/20 flex flex-col items-center justify-center gap-1">
      <span className="text-3xl">{post.feeling_emoji || '🎤'}</span>
      <Mic className="w-4 h-4 text-muted-foreground" />
    </div>
  );
});

PostThumbnail.displayName = 'PostThumbnail';

export const MyPostsGrid: React.FC<MyPostsGridProps> = ({
  posts,
  filter,
  onFilterChange,
  onEdit,
  onDelete,
  onToggleVisibility,
  onPlay,
  onViewPost,
}) => {
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filteredPosts = posts.filter(p => {
    if (filter === 'public') return p.is_public;
    if (filter === 'private') return !p.is_public;
    return true;
  });

  const handleDeleteClick = async (postId: string) => {
    if (deleteConfirm === postId) {
      setDeletingId(postId);
      try {
        await onDelete(postId);
      } finally {
        setDeletingId(null);
        setDeleteConfirm(null);
      }
    } else {
      setDeleteConfirm(postId);
      setTimeout(() => setDeleteConfirm(null), 3000);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-0.5 px-0.5">
        {filteredPosts.map((post, index) => (
          <div
            key={post.id}
            className="relative aspect-square bg-muted overflow-hidden group cursor-pointer transition-opacity duration-200"
          >
            <PostThumbnail post={post} />

            {/* Overlay on hover/tap */}
            <div
              className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 active:opacity-100 transition-opacity duration-150 flex items-center justify-center gap-3"
              onClick={() => onViewPost ? onViewPost(filteredPosts.indexOf(post)) : onPlay(post)}
            >
              <button className="p-2.5 bg-white/20 backdrop-blur-sm rounded-full active:scale-90 transition-transform">
                <Play className="w-6 h-6 text-white" fill="white" />
              </button>
            </div>

            {/* Visibility badge */}
            <div className="absolute top-1.5 left-1.5">
              {post.is_public ? (
                <Globe className="w-3.5 h-3.5 text-white drop-shadow-lg" />
              ) : (
                <Lock className="w-3.5 h-3.5 text-white drop-shadow-lg" />
              )}
            </div>

            {/* Menu */}
            <div className="absolute top-1.5 right-1.5 z-10">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="p-1 bg-black/30 backdrop-blur-sm rounded-full active:scale-90 transition-transform"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreVertical className="w-3.5 h-3.5 text-white" />
                  </button>
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
                    disabled={deletingId === post.id}
                    className="text-destructive focus:text-destructive"
                  >
                    {deletingId === post.id ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4 mr-2" />
                    )}
                    {deletingId === post.id ? 'Suppression...' : deleteConfirm === post.id ? 'Confirmer ?' : 'Supprimer'}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Stats */}
            <div className="absolute bottom-0 left-0 right-0 p-1.5 bg-gradient-to-t from-black/70 to-transparent">
              <div className="flex items-center gap-2 text-white text-[10px]">
                <span className="flex items-center gap-0.5">
                  <Heart className="w-2.5 h-2.5" />
                  {post.likes_count}
                </span>
                <span className="flex items-center gap-0.5">
                  <MessageCircle className="w-2.5 h-2.5" />
                  {post.comments_count}
                </span>
                <span className="flex items-center gap-0.5">
                  <Share2 className="w-2.5 h-2.5" />
                  {post.shares_count}
                </span>
                {post.duration_seconds && (
                  <span className="ml-auto">
                    {Math.floor(post.duration_seconds / 60)}:{String(post.duration_seconds % 60).padStart(2, '0')}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredPosts.length === 0 && (
        <div className="text-center py-12 animate-in fade-in duration-300">
          <div className="text-4xl mb-3">📭</div>
          <p className="text-muted-foreground">
            {filter === 'private' 
              ? 'Aucune publication privée'
              : filter === 'public'
              ? 'Aucune publication publique'
              : 'Aucune publication'}
          </p>
        </div>
      )}
    </div>
  );
};
