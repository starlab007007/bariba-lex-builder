import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, HelpCircle, Keyboard, Settings, Smartphone } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import FloatingBaribaKeyboard from '@/components/keyboard/FloatingBaribaKeyboard';
import KeyboardActivationGuide from '@/components/keyboard/KeyboardActivationGuide';
import KeyboardSettingsPanel from '@/components/keyboard/KeyboardSettingsPanel';
import BaribaKeyboardCompanion from '@/components/BaribaKeyboardCompanion';
import BaribaKeyboardActivationGuide from '@/components/BaribaKeyboardActivationGuide';
import { useFloatingKeyboard } from '@/hooks/useFloatingKeyboard';

type PageTab = 'keyboard' | 'guide' | 'settings' | 'native';

export default function FloatingKeyboardPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<PageTab>('keyboard');
  const { settings, updateSettings, exportData, importData } = useFloatingKeyboard();

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
          onClick={() => setActiveTab(t => t === 'native' ? 'keyboard' : 'native')}
          className={`p-2 rounded-lg ${activeTab === 'native' ? 'bg-amber-500/15' : 'hover:bg-muted'}`}
        >
          <Smartphone className={`w-5 h-5 ${activeTab === 'native' ? 'text-amber-500' : 'text-muted-foreground'}`} />
        </button>
        <button
          onClick={() => setActiveTab(t => t === 'guide' ? 'keyboard' : 'guide')}
          className={`p-2 rounded-lg ${activeTab === 'guide' ? 'bg-blue-500/15' : 'hover:bg-muted'}`}
        >
          <HelpCircle className={`w-5 h-5 ${activeTab === 'guide' ? 'text-blue-500' : 'text-muted-foreground'}`} />
        </button>
        <button
          onClick={() => setActiveTab(t => t === 'settings' ? 'keyboard' : 'settings')}
          className={`p-2 rounded-lg ${activeTab === 'settings' ? 'bg-amber-500/15' : 'hover:bg-muted'}`}
        >
          <Settings className={`w-5 h-5 ${activeTab === 'settings' ? 'text-amber-500' : 'text-muted-foreground'}`} />
        </button>
      </div>

      {/* Tab content */}
      {activeTab === 'keyboard' && (
        <div className="flex-1 min-h-0">
          <FloatingBaribaKeyboard />
        </div>
      )}

      {activeTab === 'guide' && (
        <div className="flex-1 overflow-y-auto p-4">
          <KeyboardActivationGuide />
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="flex-1 overflow-y-auto p-4">
          <KeyboardSettingsPanel
            settings={settings}
            onUpdate={updateSettings}
            onExport={exportData}
            onImport={importData}
          />
        </div>
      )}

      {activeTab === 'native' && (
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <BaribaKeyboardActivationGuide />
          <BaribaKeyboardCompanion />
        </div>
      )}
    </div>
  );
}