import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TamTamMicButton } from '@/components/tamtam/TamTamMicButton';
import { ArrowLeft } from 'lucide-react';

const services = [
  { id: 'translator', icon: '🌐', color: 'bg-blue-500', bgLight: 'bg-blue-50' },
  { id: 'health', icon: '🏥', color: 'bg-green-500', bgLight: 'bg-green-50' },
  { id: 'finance', icon: '💰', color: 'bg-yellow-500', bgLight: 'bg-yellow-50' },
  { id: 'agri', icon: '🌾', color: 'bg-emerald-500', bgLight: 'bg-emerald-50' },
  { id: 'education', icon: '📚', color: 'bg-purple-500', bgLight: 'bg-purple-50' },
  { id: 'documents', icon: '📋', color: 'bg-gray-500', bgLight: 'bg-gray-50' },
];

export default function TamTamServices() {
  const [activeService, setActiveService] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [messages, setMessages] = useState<{type: 'user' | 'ai', text: string}[]>([]);

  const handleServiceSelect = (serviceId: string) => {
    setActiveService(serviceId);
    setMessages([]);
  };

  const handleBack = () => {
    setActiveService(null);
    setMessages([]);
  };

  const handleMicPress = () => {
    if (!isRecording) {
      setIsRecording(true);
      // Simulate recording
      setTimeout(() => {
        setIsRecording(false);
        setMessages(prev => [...prev, { type: 'user', text: '🎙️ Message vocal...' }]);
        // Simulate AI response
        setTimeout(() => {
          setMessages(prev => [...prev, { type: 'ai', text: '🤖 Réponse IA...' }]);
        }, 1000);
      }, 2000);
    } else {
      setIsRecording(false);
    }
  };

  const activeServiceData = services.find(s => s.id === activeService);

  return (
    <div className="min-h-screen bg-tamtam-bg px-4">
      <AnimatePresence mode="wait">
        {!activeService ? (
          <motion.div
            key="grid"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Title icon */}
            <div className="text-center mb-8">
              <span className="text-5xl">🤖</span>
            </div>

            {/* Services grid 2x3 */}
            <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto">
              {services.map((service, index) => (
                <motion.button
                  key={service.id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.1 }}
                  onClick={() => handleServiceSelect(service.id)}
                  className={`aspect-square ${service.bgLight} rounded-3xl shadow-tamtam-soft flex items-center justify-center active:scale-95 transition-transform`}
                >
                  <div className={`w-20 h-20 ${service.color} rounded-2xl flex items-center justify-center`}>
                    <span className="text-4xl">{service.icon}</span>
                  </div>
                </motion.button>
              ))}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="chat"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="h-full flex flex-col"
          >
            {/* Header with back button */}
            <div className="flex items-center gap-4 mb-6">
              <button
                onClick={handleBack}
                className="w-12 h-12 bg-tamtam-surface rounded-2xl flex items-center justify-center shadow-tamtam-soft"
              >
                <ArrowLeft className="w-6 h-6 text-tamtam-text" />
              </button>
              <div className={`w-14 h-14 ${activeServiceData?.color} rounded-2xl flex items-center justify-center`}>
                <span className="text-3xl">{activeServiceData?.icon}</span>
              </div>
            </div>

            {/* Chat messages */}
            <div className="flex-1 space-y-4 mb-4 min-h-[300px]">
              {messages.length === 0 && (
                <div className="text-center py-12">
                  <motion.div
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="text-6xl mb-4"
                  >
                    {activeServiceData?.icon}
                  </motion.div>
                  <div className="text-4xl">👇</div>
                </div>
              )}
              
              {messages.map((msg, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] p-4 rounded-3xl ${
                      msg.type === 'user'
                        ? 'bg-tamtam-primary text-white'
                        : 'bg-tamtam-surface shadow-tamtam-soft'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{msg.type === 'user' ? '🎙️' : '🤖'}</span>
                      <div className="flex gap-1">
                        {[...Array(8)].map((_, i) => (
                          <div
                            key={i}
                            className={`w-1 h-4 rounded-full ${
                              msg.type === 'user' ? 'bg-white/60' : 'bg-tamtam-primary/60'
                            }`}
                            style={{ height: 8 + Math.random() * 16 }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Central mic for conversation */}
            <div className="flex justify-center pb-4">
              <TamTamMicButton
                size="lg"
                isRecording={isRecording}
                onPress={handleMicPress}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
