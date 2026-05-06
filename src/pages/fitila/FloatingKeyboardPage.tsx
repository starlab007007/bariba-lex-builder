import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, HelpCircle, Keyboard } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import FloatingBaribaKeyboard from '@/components/keyboard/FloatingBaribaKeyboard';
import KeyboardActivationGuide from '@/components/keyboard/KeyboardActivationGuide';

export default function FloatingKeyboardPage() {
  const navigate = useNavigate();
  const [showGuide, setShowGuide] = useState(false);

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border/50">
        <button onClick={() => navigate(-1)} className="p-1.5 rounded-lg hover:bg-muted">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold flex items-center gap-2">
            <Keyboard className="w-5 h-5 text-amber-500" />
            Clavier Bariba
          </h1>
          <p className="text-xs text-muted-foreground">Écrivez en Bariba, collez partout</p>
        </div>
        <button
          onClick={() => setShowGuide(!showGuide)}
          className="p-2 rounded-lg hover:bg-muted"
        >
          <HelpCircle className="w-5 h-5 text-muted-foreground" />
        </button>
      </div>

      {/* Guide toggle */}
      <AnimatePresence>
        {showGuide && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-b border-border/50"
          >
            <div className="p-4">
              <KeyboardActivationGuide />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Keyboard */}
      <div className="flex-1 min-h-0">
        <FloatingBaribaKeyboard />
      </div>
    </div>
  );
}