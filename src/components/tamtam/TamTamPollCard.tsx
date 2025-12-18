import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, Check, BarChart3, Clock, Users } from 'lucide-react';
import { Poll, PollOption } from '@/hooks/useTamTamPolls';
import { triggerFeedback } from '@/utils/tamtamFeedback';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

interface TamTamPollCardProps {
  poll: Poll;
  onVote: (pollId: string, optionId: string) => Promise<boolean>;
}

export const TamTamPollCard: React.FC<TamTamPollCardProps> = ({ poll, onVote }) => {
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const [isVoting, setIsVoting] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const totalVotes = poll.options.reduce((sum, opt) => sum + opt.vote_count, 0);
  const hasVoted = !!poll.user_vote;

  const playAudio = (audioUrl: string, audioId: string) => {
    triggerFeedback('notification');
    
    if (playingAudio === audioId) {
      audioRef.current?.pause();
      setPlayingAudio(null);
      return;
    }

    if (audioRef.current) {
      audioRef.current.pause();
    }

    const audio = new Audio(audioUrl);
    audioRef.current = audio;
    
    audio.play();
    setPlayingAudio(audioId);
    
    audio.onended = () => setPlayingAudio(null);
    audio.onerror = () => setPlayingAudio(null);
  };

  const handleVote = async (optionId: string) => {
    if (hasVoted || isVoting) return;
    
    setIsVoting(true);
    triggerFeedback('record');
    
    await onVote(poll.id, optionId);
    setIsVoting(false);
  };

  const getVotePercentage = (option: PollOption) => {
    if (totalVotes === 0) return 0;
    return Math.round((option.vote_count / totalVotes) * 100);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-3xl shadow-sm overflow-hidden border border-gray-100"
    >
      {/* Header */}
      <div className="p-4 flex items-center gap-3 border-b border-gray-50">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
          {poll.profile?.avatar_url ? (
            <img 
              src={poll.profile.avatar_url} 
              alt="" 
              className="w-12 h-12 rounded-full object-cover"
            />
          ) : (
            <BarChart3 className="w-6 h-6 text-white" />
          )}
        </div>
        <div className="flex-1">
          <p className="font-semibold text-gray-800">
            {poll.profile?.display_name || poll.profile?.username || 'Utilisateur'}
          </p>
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <Clock className="w-3 h-3" />
            <span>{formatDistanceToNow(new Date(poll.created_at), { locale: fr, addSuffix: true })}</span>
          </div>
        </div>
        <div className="px-3 py-1 bg-orange-100 rounded-full">
          <span className="text-xs font-medium text-orange-600">Sondage</span>
        </div>
      </div>

      {/* Question */}
      <div className="p-4 bg-gradient-to-r from-orange-50 to-amber-50">
        <div className="flex items-center gap-3">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => playAudio(poll.question_audio_url, 'question')}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${
              playingAudio === 'question'
                ? 'bg-orange-500 text-white'
                : 'bg-white text-orange-500 shadow-md'
            }`}
          >
            {playingAudio === 'question' ? (
              <Pause className="w-6 h-6" />
            ) : (
              <Play className="w-6 h-6 ml-1" />
            )}
          </motion.button>
          <div className="flex-1">
            <p className="font-medium text-gray-800 text-lg">
              {poll.question_transcript || '🎤 Question vocale'}
            </p>
            <p className="text-sm text-gray-500">Appuyez pour écouter</p>
          </div>
        </div>
      </div>

      {/* Options */}
      <div className="p-4 space-y-3">
        {poll.options.map((option, idx) => {
          const percentage = getVotePercentage(option);
          const isSelected = poll.user_vote === option.id;
          const isWinning = hasVoted && option.vote_count === Math.max(...poll.options.map(o => o.vote_count));

          return (
            <motion.div
              key={option.id}
              whileTap={!hasVoted ? { scale: 0.98 } : {}}
              onClick={() => !hasVoted && handleVote(option.id)}
              className={`relative rounded-2xl overflow-hidden cursor-pointer transition-all ${
                hasVoted 
                  ? 'cursor-default' 
                  : 'hover:shadow-md active:scale-[0.98]'
              } ${
                isSelected
                  ? 'ring-2 ring-orange-500 bg-orange-50'
                  : 'bg-gray-50'
              }`}
            >
              {/* Progress bar (shown after voting) */}
              {hasVoted && (
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${percentage}%` }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                  className={`absolute inset-y-0 left-0 ${
                    isWinning ? 'bg-orange-200' : 'bg-gray-200'
                  }`}
                />
              )}

              <div className="relative flex items-center gap-3 p-3">
                {/* Option number / Play button */}
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    playAudio(option.audio_url, option.id);
                  }}
                  className={`w-12 h-12 rounded-full flex items-center justify-center font-bold transition-colors ${
                    playingAudio === option.id
                      ? 'bg-orange-500 text-white'
                      : isSelected
                        ? 'bg-orange-500 text-white'
                        : 'bg-white text-gray-600 shadow-sm'
                  }`}
                >
                  {playingAudio === option.id ? (
                    <Pause className="w-5 h-5" />
                  ) : isSelected ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    <Play className="w-5 h-5 ml-0.5" />
                  )}
                </motion.button>

                <div className="flex-1">
                  <p className={`font-medium ${isSelected ? 'text-orange-700' : 'text-gray-700'}`}>
                    {option.transcript || `Option ${idx + 1}`}
                  </p>
                  {hasVoted && (
                    <p className="text-sm text-gray-500">
                      {option.vote_count} vote{option.vote_count !== 1 ? 's' : ''}
                    </p>
                  )}
                </div>

                {/* Percentage (shown after voting) */}
                {hasVoted && (
                  <span className={`font-bold text-lg ${
                    isWinning ? 'text-orange-600' : 'text-gray-500'
                  }`}>
                    {percentage}%
                  </span>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="px-4 pb-4 flex items-center justify-between text-sm text-gray-400">
        <div className="flex items-center gap-1">
          <Users className="w-4 h-4" />
          <span>{totalVotes} vote{totalVotes !== 1 ? 's' : ''}</span>
        </div>
        {!hasVoted && (
          <span className="text-orange-500 font-medium">
            Appuyez pour voter
          </span>
        )}
      </div>
    </motion.div>
  );
};
