import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageCircle, Users, Search, Plus, ArrowLeft, Volume2, 
  Check, CheckCheck, Circle
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { usePrivateVoiceMessages, Conversation } from '@/hooks/usePrivateVoiceMessages';
import { TamTamPrivateMessages } from './TamTamPrivateMessages';
import { TamTamUserSearch } from './TamTamUserSearch';
import { triggerFeedback } from '@/utils/tamtamFeedback';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

interface TamTamMessagesHubProps {
  isOpen?: boolean;
  onClose?: () => void;
  initialConversationId?: string;
}

export function TamTamMessagesHub({ isOpen = true, onClose, initialConversationId }: TamTamMessagesHubProps) {
  const { conversations, fetchConversations, loading } = usePrivateVoiceMessages();
  
  const [activeTab, setActiveTab] = useState<'all' | 'friends' | 'communities'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedConversation, setSelectedConversation] = useState<string | null>(initialConversationId || null);
  const [showUserSearch, setShowUserSearch] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchConversations();
    }
  }, [isOpen, fetchConversations]);

  useEffect(() => {
    if (initialConversationId) {
      setSelectedConversation(initialConversationId);
    }
  }, [initialConversationId]);

  const filteredConversations = conversations.filter(conv => {
    const matchesSearch = conv.partnerName.toLowerCase().includes(searchQuery.toLowerCase());
    // For now, show all in 'all' tab
    return matchesSearch;
  });

  const totalUnread = conversations.reduce((sum, c) => sum + c.unreadCount, 0);

  if (!isOpen) return null;

  if (selectedConversation) {
    return (
      <TamTamPrivateMessages
        isOpen={true}
        onClose={() => setSelectedConversation(null)}
        initialConversationId={selectedConversation}
      />
    );
  }

  if (showUserSearch) {
    return (
      <TamTamUserSearch
        isOpen={true}
        onClose={() => setShowUserSearch(false)}
        onMessage={(userId) => {
          setShowUserSearch(false);
          setSelectedConversation(userId);
        }}
      />
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col h-full bg-white"
    >
      {/* Header */}
      <div className="bg-white border-b px-4 py-3">
        <div className="flex items-center gap-3 mb-3">
          <h2 className="text-lg font-bold flex-1">💬 Messages</h2>
          
          {totalUnread > 0 && (
            <span className="px-2 py-1 bg-red-500 text-white text-xs rounded-full">
              {totalUnread}
            </span>
          )}

          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowUserSearch(true)}
            className="p-2 bg-blue-500 text-white rounded-xl"
          >
            <Plus className="w-5 h-5" />
          </motion.button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <Input
            placeholder="Rechercher une conversation..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 rounded-xl border-gray-200"
          />
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mt-3">
          {[
            { id: 'all', label: 'Tous', icon: MessageCircle },
            { id: 'friends', label: 'Amis', icon: Users },
            { id: 'communities', label: 'Communautés', icon: Users },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <motion.button
                key={tab.id}
                whileTap={{ scale: 0.95 }}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-4 space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-14 h-14 bg-gray-100 rounded-full animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-100 rounded w-1/3 animate-pulse" />
                  <div className="h-3 bg-gray-100 rounded w-2/3 animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="text-center py-12 px-4">
            <MessageCircle className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">Aucune conversation</p>
            <p className="text-sm text-gray-400 mt-1">Commencez une nouvelle conversation !</p>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowUserSearch(true)}
              className="mt-4 px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-medium"
            >
              Nouveau message
            </motion.button>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredConversations.map((conversation) => (
              <motion.button
                key={conversation.partnerId}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  triggerFeedback('notification');
                  setSelectedConversation(conversation.partnerId);
                }}
                className="w-full p-4 flex items-center gap-3 hover:bg-gray-50 transition-colors"
              >
                <div className="relative">
                  <Avatar className="w-14 h-14">
                    <AvatarImage src={conversation.partnerAvatar || ''} />
                    <AvatarFallback className="bg-gradient-to-br from-blue-400 to-blue-600 text-white">
                      {conversation.partnerName[0]}
                    </AvatarFallback>
                  </Avatar>
                  {/* Online indicator */}
                  <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 rounded-full border-2 border-white" />
                </div>

                <div className="flex-1 min-w-0 text-left">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-gray-800 truncate">
                      {conversation.partnerName}
                    </h4>
                    {conversation.lastMessage && (
                      <span className="text-xs text-gray-400">
                        {formatDistanceToNow(new Date(conversation.lastMessage.created_at), { 
                          addSuffix: false, 
                          locale: fr 
                        })}
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2 mt-1">
                    {conversation.lastMessage && (
                      <>
                        <Volume2 className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-500 truncate">
                          Message vocal • {conversation.lastMessage.duration_seconds}s
                        </span>
                        {conversation.lastMessage.is_read ? (
                          <CheckCheck className="w-4 h-4 text-blue-500 flex-shrink-0" />
                        ) : (
                          <Check className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        )}
                      </>
                    )}
                  </div>
                </div>

                {conversation.unreadCount > 0 && (
                  <div className="flex-shrink-0">
                    <span className="w-6 h-6 bg-blue-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                      {conversation.unreadCount}
                    </span>
                  </div>
                )}
              </motion.button>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default TamTamMessagesHub;
