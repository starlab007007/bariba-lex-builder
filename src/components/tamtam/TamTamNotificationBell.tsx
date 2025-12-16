import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X, MessageCircle, UserPlus, UserCheck, Heart, Loader2 } from 'lucide-react';
import { useTamTamNotifications, TamTamNotification } from '@/hooks/useTamTamNotifications';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { triggerFeedback } from '@/utils/tamtamFeedback';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';

export function TamTamNotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const { 
    notifications, 
    unreadCount, 
    loading, 
    markAsRead, 
    markAllAsRead,
    getNotificationMessage,
    getNotificationIcon
  } = useTamTamNotifications();

  const handleToggle = () => {
    triggerFeedback('notification');
    setIsOpen(!isOpen);
  };

  const handleNotificationClick = async (notification: TamTamNotification) => {
    triggerFeedback('notification');
    await markAsRead(notification.id);

    // Navigate based on notification type
    if (notification.type === 'follow' || notification.type === 'friend_request' || notification.type === 'friend_accepted') {
      if (notification.actor_id) {
        setIsOpen(false);
        navigate(`/tamtam/user/${notification.actor_id}`);
      }
    } else if (notification.type === 'message') {
      setIsOpen(false);
      navigate('/tamtam/social');
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'message':
        return <MessageCircle className="w-4 h-4 text-blue-500" />;
      case 'friend_request':
        return <UserPlus className="w-4 h-4 text-purple-500" />;
      case 'friend_accepted':
        return <UserCheck className="w-4 h-4 text-green-500" />;
      case 'follow':
        return <UserPlus className="w-4 h-4 text-emerald-500" />;
      case 'like':
        return <Heart className="w-4 h-4 text-red-500" />;
      default:
        return <Bell className="w-4 h-4 text-gray-500" />;
    }
  };

  return (
    <div className="relative">
      {/* Bell Button */}
      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={handleToggle}
        className="relative p-2 hover:bg-gray-100 rounded-full transition-colors"
      >
        <Bell className="w-5 h-5 text-gray-600" />
        
        {/* Badge */}
        <AnimatePresence>
          {unreadCount > 0 && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 rounded-full flex items-center justify-center"
            >
              <span className="text-[10px] font-bold text-white px-1">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 z-40"
            />

            {/* Dropdown Content */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 overflow-hidden"
            >
              {/* Header */}
              <div className="p-3 border-b border-gray-100 flex items-center justify-between">
                <h3 className="font-semibold text-gray-800">Notifications</h3>
                {unreadCount > 0 && (
                  <button
                    onClick={() => {
                      triggerFeedback('success');
                      markAllAsRead();
                    }}
                    className="text-sm text-blue-500 hover:text-blue-600"
                  >
                    Tout marquer lu
                  </button>
                )}
              </div>

              {/* Notifications List */}
              <div className="max-h-80 overflow-y-auto">
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="py-8 text-center">
                    <Bell className="w-10 h-10 mx-auto text-gray-300 mb-2" />
                    <p className="text-gray-500 text-sm">Aucune notification</p>
                  </div>
                ) : (
                  notifications.map(notification => (
                    <motion.button
                      key={notification.id}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleNotificationClick(notification)}
                      className={`w-full p-3 flex items-start gap-3 hover:bg-gray-50 transition-colors text-left ${
                        !notification.is_read ? 'bg-blue-50/50' : ''
                      }`}
                    >
                      <div className="relative">
                        <Avatar className="w-10 h-10">
                          <AvatarImage src={notification.actor_profile?.avatar_url || undefined} />
                          <AvatarFallback className="bg-gradient-to-br from-blue-500 to-emerald-500 text-white text-sm">
                            {notification.actor_profile?.display_name?.[0] || '?'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="absolute -bottom-1 -right-1 p-1 bg-white rounded-full">
                          {getIcon(notification.type)}
                        </div>
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-800 line-clamp-2">
                          {getNotificationMessage(notification)}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {formatDistanceToNow(new Date(notification.created_at), { 
                            addSuffix: true, 
                            locale: fr 
                          })}
                        </p>
                      </div>

                      {!notification.is_read && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-2" />
                      )}
                    </motion.button>
                  ))
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
