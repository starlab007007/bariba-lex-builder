import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, Send, Volume2, Mic, User, Check, CheckCheck, 
  Loader2, Languages, Play, Pause, X, Globe, ArrowRightLeft, Bell
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { usePrivateVoiceMessages, VoiceMessage, Conversation } from '@/hooks/usePrivateVoiceMessages';
import { SmartVoiceRecorder } from '@/components/voice/SmartVoiceRecorder';
import { useAudioServices } from '@/hooks/useAudioServices';
import { AudioServicesStatusBar } from '@/components/tamtam/AudioServiceStatus';
import { useTamTamLanguage } from '@/contexts/TamTamLanguageContext';
import { VoiceOnlyTranslator } from '@/components/voice/VoiceOnlyTranslator';
import { PresenceIndicator } from '@/components/tamtam/PresenceIndicator';
import { RecordingIndicator } from '@/components/tamtam/RecordingIndicator';
import { usePresenceIndicator } from '@/hooks/usePresenceIndicator';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useRecordingIndicator } from '@/hooks/useRecordingIndicator';
import { triggerFeedback } from '@/utils/tamtamFeedback';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface TamTamPrivateMessagesProps {
  isOpen: boolean;
  onClose: () => void;
}

export function TamTamPrivateMessages({ isOpen, onClose }: TamTamPrivateMessagesProps) {
  const { currentLang } = useTamTamLanguage();
  const audioServices = useAudioServices();
  const { toast } = useToast();
  
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [showRecorder, setShowRecorder] = useState(false);
  const [showTranslator, setShowTranslator] = useState(false);
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

  // Get user IDs for presence tracking
  const partnerUserIds = useMemo(() => 
    conversations.map(c => c.partnerId), 
    [conversations]
  );
  
  // Presence indicator
  const { getPresence, updateOwnPresence } = usePresenceIndicator(partnerUserIds);
  
  // Push notifications
  const { isEnabled: pushEnabled, requestPermission, permission } = usePushNotifications();
  
  // Recording indicator
  const { partnerIsRecording, broadcastRecording } = useRecordingIndicator(selectedConversation || undefined);

  // Update own presence when opening messages
  useEffect(() => {
    if (isOpen) {
      updateOwnPresence();
      fetchConversations();
    }
  }, [isOpen, fetchConversations, updateOwnPresence]);

  // Request notification permission on first open
  useEffect(() => {
    if (isOpen && permission === 'default') {
      requestPermission().then(granted => {
        if (granted) {
          toast({
            title: "🔔 Notifications activées",
            description: "Vous recevrez des alertes pour les nouveaux messages"
          });
        }
      });
    }
  }, [isOpen, permission, requestPermission, toast]);

  // Scroll to bottom and trigger notification for new messages
  const prevMessagesCountRef = useRef(messages.length);
  
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    
    // Trigger notification for new incoming messages
    if (messages.length > prevMessagesCountRef.current && selectedConversation) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage?.sender_id === selectedConversation && !lastMessage.is_read) {
        // New message received - sound + haptic
        triggerFeedback('notification', { sound: true, haptic: true, volume: 0.4 });
      }
    }
    prevMessagesCountRef.current = messages.length;
  }, [messages, selectedConversation]);

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
    broadcastRecording(false); // Stop broadcasting recording
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

  const speakTranscript = async (text: string, lang: 'ba' | 'fr') => {
    if (lang === 'ba') {
      await audioServices.speakBariba(text);
    } else {
      await audioServices.speakFrench(text);
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
              <div className="flex-1">
                <h1 className="text-xl font-bold">Messages Vocaux</h1>
                <AudioServicesStatusBar health={audioServices.health} />
              </div>
              {/* Bouton Traducteur Vocal */}
              <Button
                variant="outline"
                size="icon"
                onClick={() => setShowTranslator(true)}
                className="bg-gradient-to-br from-orange-100 to-blue-100 border-none hover:from-orange-200 hover:to-blue-200"
                title="Traducteur vocal Bariba ↔ Français"
              >
                <ArrowRightLeft className="h-5 w-5 text-orange-600" />
              </Button>
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
                  {conversations.map(conv => {
                    const presence = getPresence(conv.partnerId);
                    return (
                      <motion.button
                        key={conv.partnerId}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setSelectedConversation(conv.partnerId)}
                        className="w-full p-4 flex items-center gap-4 hover:bg-gray-50 transition-colors"
                      >
                        {/* Avatar with presence indicator */}
                        <div className="relative">
                          <Avatar className="h-14 w-14">
                            <AvatarImage src={conv.partnerAvatar} />
                            <AvatarFallback className="bg-gradient-to-br from-blue-400 to-blue-600 text-white">
                              {conv.partnerName.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          {/* Presence dot */}
                          <div className="absolute bottom-0 right-0">
                            <PresenceIndicator 
                              isOnline={presence.isOnline} 
                              lastSeenAt={presence.lastSeenAt}
                              size="md"
                            />
                          </div>
                        </div>
                        
                        <div className="flex-1 text-left">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold">{conv.partnerName}</span>
                              {presence.isOnline && (
                                <span className="text-xs text-green-600 font-medium">En ligne</span>
                              )}
                            </div>
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
                    );
                  })}
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
            {/* Header with presence indicator */}
            <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-gray-100 p-4 flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setSelectedConversation(null)}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              
              {/* Avatar with presence */}
              <div className="relative">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={getSelectedPartner()?.partnerAvatar} />
                  <AvatarFallback className="bg-gradient-to-br from-blue-400 to-blue-600 text-white">
                    {getSelectedPartner()?.partnerName.slice(0, 2).toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                {selectedConversation && (
                  <div className="absolute bottom-0 right-0">
                    <PresenceIndicator 
                      isOnline={getPresence(selectedConversation).isOnline} 
                      size="sm"
                    />
                  </div>
                )}
              </div>
              
              <div className="flex-1">
                <h2 className="font-semibold">{getSelectedPartner()?.partnerName}</h2>
                {selectedConversation && (
                  <PresenceIndicator 
                    isOnline={getPresence(selectedConversation).isOnline}
                    lastSeenAt={getPresence(selectedConversation).lastSeenAt}
                    showText
                    size="sm"
                  />
                )}
              </div>
              
              {/* Notification status */}
              <div className="flex items-center gap-1">
                <Bell className={cn(
                  "h-4 w-4",
                  pushEnabled ? "text-green-500" : "text-gray-300"
                )} />
              </div>
            </div>

            {/* Recording Indicator */}
            <AnimatePresence>
              {partnerIsRecording && (
                <div className="px-4 py-2 border-b border-gray-100">
                  <RecordingIndicator userName={getSelectedPartner()?.partnerName} />
                </div>
              )}
            </AnimatePresence>

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
                                    disabled={audioServices.isSpeaking}
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
                      onClick={() => {
                        setShowRecorder(true);
                        broadcastRecording(true);
                      }}
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

      {/* Modal Traducteur Vocal Bidirectionnel */}
      <AnimatePresence>
        {showTranslator && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4"
            onClick={() => setShowTranslator(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl w-full max-w-md max-h-[80vh] overflow-hidden shadow-2xl"
            >
              <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-blue-500 flex items-center justify-center">
                    <ArrowRightLeft className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h2 className="font-bold">Traducteur Vocal</h2>
                    <p className="text-xs text-gray-500">Bariba ↔ Français</p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setShowTranslator(false)}>
                  <X className="h-5 w-5" />
                </Button>
              </div>
              <div className="p-4">
                <VoiceOnlyTranslator />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
