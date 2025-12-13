import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, Send, Volume2, Mic, User, Check, CheckCheck, 
  Loader2, Languages, Play, Pause, X 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { usePrivateVoiceMessages, VoiceMessage, Conversation } from '@/hooks/usePrivateVoiceMessages';
import { SmartVoiceRecorder } from '@/components/voice/SmartVoiceRecorder';
import { useBilingualAudio } from '@/hooks/useBilingualAudio';
import { useTamTamLanguage } from '@/contexts/TamTamLanguageContext';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface TamTamPrivateMessagesProps {
  isOpen: boolean;
  onClose: () => void;
}

export function TamTamPrivateMessages({ isOpen, onClose }: TamTamPrivateMessagesProps) {
  const { currentLang } = useTamTamLanguage();
  const { speakBariba, speakFrench, isSpeaking } = useBilingualAudio();
  
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [showRecorder, setShowRecorder] = useState(false);
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);
  const [showTranscript, setShowTranscript] = useState<{ [id: string]: 'ba' | 'fr' | null }>({});
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    messages,
    conversations,
    loading,
    isSending,
    isTranscribing,
    sendVoiceMessage,
    fetchConversations,
    markAsRead
  } = usePrivateVoiceMessages(selectedConversation || undefined);

  useEffect(() => {
    if (isOpen) {
      fetchConversations();
    }
  }, [isOpen, fetchConversations]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (selectedConversation && messages.length > 0) {
      const unreadIds = messages
        .filter(m => m.sender_id === selectedConversation && !m.is_read)
        .map(m => m.id);
      if (unreadIds.length > 0) {
        markAsRead(unreadIds);
      }
    }
  }, [selectedConversation, messages, markAsRead]);

  const handleSendMessage = async (audioBase64: string, duration: number) => {
    if (!selectedConversation) return;
    await sendVoiceMessage(selectedConversation, audioBase64, duration, 'bariba');
    setShowRecorder(false);
  };

  const playAudio = (message: VoiceMessage) => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    
    if (playingMessageId === message.id) {
      setPlayingMessageId(null);
      return;
    }

    const audio = new Audio(message.audio_url);
    audioRef.current = audio;
    
    audio.onended = () => setPlayingMessageId(null);
    audio.onpause = () => setPlayingMessageId(null);
    audio.play();
    setPlayingMessageId(message.id);
  };

  const toggleTranscript = (msgId: string, lang: 'ba' | 'fr') => {
    setShowTranscript(prev => ({
      ...prev,
      [msgId]: prev[msgId] === lang ? null : lang
    }));
  };

  const speakTranscript = (text: string, lang: 'ba' | 'fr') => {
    if (lang === 'ba') {
      speakBariba(text);
    } else {
      speakFrench(text);
    }
  };

  const getSelectedPartner = () => {
    return conversations.find(c => c.partnerId === selectedConversation);
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-[#FAFAFA]"
    >
      <AnimatePresence mode="wait">
        {!selectedConversation ? (
          // Conversations List
          <motion.div
            key="conversations"
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -20, opacity: 0 }}
            className="h-full flex flex-col"
          >
            {/* Header */}
            <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-gray-100 p-4 flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="h-5 w-5" />
              </Button>
              <h1 className="text-xl font-bold">Messages Vocaux</h1>
            </div>

            {/* Conversations */}
            <ScrollArea className="flex-1">
              {loading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                </div>
              ) : conversations.length === 0 ? (
                <div className="text-center py-12">
                  <Mic className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-500">Aucune conversation</p>
                  <p className="text-sm text-gray-400 mt-1">
                    Envoyez votre premier message vocal !
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {conversations.map(conv => (
                    <motion.button
                      key={conv.partnerId}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setSelectedConversation(conv.partnerId)}
                      className="w-full p-4 flex items-center gap-4 hover:bg-gray-50 transition-colors"
                    >
                      <Avatar className="h-14 w-14">
                        <AvatarImage src={conv.partnerAvatar} />
                        <AvatarFallback className="bg-gradient-to-br from-blue-400 to-blue-600 text-white">
                          {conv.partnerName.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1 text-left">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold">{conv.partnerName}</span>
                          {conv.lastMessage && (
                            <span className="text-xs text-gray-400">
                              {formatDistanceToNow(new Date(conv.lastMessage.created_at), {
                                addSuffix: true,
                                locale: fr
                              })}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <Volume2 className="h-3 w-3 text-gray-400" />
                          <span className="text-sm text-gray-500 truncate">
                            Message vocal • {conv.lastMessage?.duration_seconds}s
                          </span>
                        </div>
                      </div>

                      {conv.unreadCount > 0 && (
                        <Badge className="bg-blue-500 text-white">
                          {conv.unreadCount}
                        </Badge>
                      )}
                    </motion.button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </motion.div>
        ) : (
          // Conversation Thread
          <motion.div
            key="thread"
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 20, opacity: 0 }}
            className="h-full flex flex-col"
          >
            {/* Header */}
            <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-gray-100 p-4 flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setSelectedConversation(null)}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              
              <Avatar className="h-10 w-10">
                <AvatarImage src={getSelectedPartner()?.partnerAvatar} />
                <AvatarFallback className="bg-gradient-to-br from-blue-400 to-blue-600 text-white">
                  {getSelectedPartner()?.partnerName.slice(0, 2).toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              
              <div>
                <h2 className="font-semibold">{getSelectedPartner()?.partnerName}</h2>
                <span className="text-xs text-gray-500">Messages vocaux</span>
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {messages.map(msg => {
                  const isOwnMessage = msg.sender_id !== selectedConversation;
                  const activeTranscript = showTranscript[msg.id];

                  return (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={cn(
                        "flex",
                        isOwnMessage ? "justify-end" : "justify-start"
                      )}
                    >
                      <div
                        className={cn(
                          "max-w-[85%] rounded-2xl p-3 space-y-2",
                          isOwnMessage
                            ? "bg-gradient-to-br from-blue-500 to-blue-600 text-white"
                            : "bg-white shadow-sm border border-gray-100"
                        )}
                      >
                        {/* Audio Player */}
                        <div className="flex items-center gap-3">
                          <Button
                            size="icon"
                            variant="ghost"
                            className={cn(
                              "h-10 w-10 rounded-full",
                              isOwnMessage 
                                ? "bg-white/20 hover:bg-white/30" 
                                : "bg-blue-100 hover:bg-blue-200"
                            )}
                            onClick={() => playAudio(msg)}
                          >
                            {playingMessageId === msg.id ? (
                              <Pause className={cn("h-5 w-5", isOwnMessage ? "text-white" : "text-blue-600")} />
                            ) : (
                              <Play className={cn("h-5 w-5", isOwnMessage ? "text-white" : "text-blue-600")} />
                            )}
                          </Button>
                          
                          {/* Waveform placeholder */}
                          <div className="flex-1 flex items-center gap-0.5">
                            {Array.from({ length: 20 }).map((_, i) => (
                              <div
                                key={i}
                                className={cn(
                                  "w-1 rounded-full",
                                  isOwnMessage ? "bg-white/50" : "bg-gray-300"
                                )}
                                style={{ height: `${Math.random() * 16 + 8}px` }}
                              />
                            ))}
                          </div>
                          
                          <span className={cn(
                            "text-xs",
                            isOwnMessage ? "text-white/70" : "text-gray-400"
                          )}>
                            {msg.duration_seconds}s
                          </span>
                        </div>

                        {/* Transcript Toggle */}
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            className={cn(
                              "h-6 text-xs",
                              isOwnMessage ? "text-white/80 hover:bg-white/20" : "text-gray-500 hover:bg-gray-100"
                            )}
                            onClick={() => toggleTranscript(msg.id, 'ba')}
                          >
                            <Languages className="h-3 w-3 mr-1" />
                            BA
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className={cn(
                              "h-6 text-xs",
                              isOwnMessage ? "text-white/80 hover:bg-white/20" : "text-gray-500 hover:bg-gray-100"
                            )}
                            onClick={() => toggleTranscript(msg.id, 'fr')}
                          >
                            FR
                          </Button>
                        </div>

                        {/* Transcript Display */}
                        <AnimatePresence>
                          {activeTranscript && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden"
                            >
                              <div className={cn(
                                "p-2 rounded-lg text-sm",
                                isOwnMessage ? "bg-white/20" : "bg-gray-50"
                              )}>
                                <div className="flex items-start justify-between gap-2">
                                  <p className={activeTranscript === 'ba' ? 'bariba-text' : ''}>
                                    {activeTranscript === 'ba' 
                                      ? (msg.transcript_ba || 'Transcription non disponible')
                                      : (msg.transcript_fr || 'Traduction non disponible')
                                    }
                                  </p>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-6 w-6 shrink-0"
                                    onClick={() => speakTranscript(
                                      activeTranscript === 'ba' ? msg.transcript_ba || '' : msg.transcript_fr || '',
                                      activeTranscript
                                    )}
                                    disabled={isSpeaking}
                                  >
                                    <Volume2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>

                        {/* Metadata */}
                        <div className={cn(
                          "flex items-center justify-end gap-1 text-xs",
                          isOwnMessage ? "text-white/60" : "text-gray-400"
                        )}>
                          <span>
                            {formatDistanceToNow(new Date(msg.created_at), {
                              addSuffix: false,
                              locale: fr
                            })}
                          </span>
                          {isOwnMessage && (
                            msg.is_read 
                              ? <CheckCheck className="h-3 w-3" />
                              : <Check className="h-3 w-3" />
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Input Area */}
            <div className="sticky bottom-0 bg-white border-t border-gray-100 p-4">
              <AnimatePresence mode="wait">
                {showRecorder ? (
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                  >
                    <SmartVoiceRecorder
                      onRecordingComplete={(audioBase64) => handleSendMessage(audioBase64, 0)}
                      language="bariba"
                      showSpeakerType={false}
                    />
                    {(isSending || isTranscribing) && (
                      <div className="flex items-center justify-center gap-2 mt-2 text-sm text-gray-500">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {isTranscribing ? 'Transcription...' : 'Envoi...'}
                      </div>
                    )}
                  </motion.div>
                ) : (
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="flex justify-center"
                  >
                    <Button
                      size="lg"
                      className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-lg"
                      onClick={() => setShowRecorder(true)}
                    >
                      <Mic className="h-7 w-7" />
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
