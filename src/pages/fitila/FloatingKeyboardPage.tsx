import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HelpCircle, Settings, Smartphone } from 'lucide-react';
import FloatingBaribaKeyboard from '@/components/keyboard/FloatingBaribaKeyboard';
import KeyboardActivationGuide from '@/components/keyboard/KeyboardActivationGuide';
import KeyboardSettingsPanel from '@/components/keyboard/KeyboardSettingsPanel';
import BaribaKeyboardCompanion from '@/components/BaribaKeyboardCompanion';
import BaribaKeyboardActivationGuide from '@/components/BaribaKeyboardActivationGuide';
import { useFloatingKeyboard } from '@/hooks/useFloatingKeyboard';

type PageTab = 'keyboard' | 'guide' | 'settings' | 'native';

export default function FloatingKeyboardPage() {
  const [activeTab, setActiveTab] = useState<PageTab>('native');
  const { settings, updateSettings, exportData, importData } = useFloatingKeyboard();

  return (
    <div className="flex flex-col h-full bg-[#F7F5EC] text-[#241F2E]">
      {/* Header */}
      <div className="flex items-center gap-2 pl-[74px] pr-3 pt-[14px] pb-2">
        <div className="flex-1 min-w-0">
          <h1 className="text-[17px] font-extrabold leading-tight truncate">Clavier Bàátɔ̀nú</h1>
          <p className="text-[11px] leading-tight text-[#8C8571] truncate">Clavier système natif — activable dans toutes vos applications</p>
        </div>
        <button
          onClick={() => setActiveTab(t => t === 'native' ? 'keyboard' : 'native')}
          className={`p-2 rounded-full ${activeTab === 'native' ? 'bg-[#F3E3B9]' : 'bg-white border border-[#E4DFCC]'}`}
        >
          <Smartphone className={`w-5 h-5 ${activeTab === 'native' ? 'text-[#9C6B1D]' : 'text-[#8C8571]'}`} />
        </button>
        <button
          onClick={() => setActiveTab(t => t === 'guide' ? 'keyboard' : 'guide')}
          className={`p-2 rounded-full ${activeTab === 'guide' ? 'bg-[#F3E3B9]' : 'bg-white border border-[#E4DFCC]'}`}
        >
          <HelpCircle className={`w-5 h-5 ${activeTab === 'guide' ? 'text-[#9C6B1D]' : 'text-[#8C8571]'}`} />
        </button>
        <button
          onClick={() => setActiveTab(t => t === 'settings' ? 'keyboard' : 'settings')}
          className={`p-2 rounded-full ${activeTab === 'settings' ? 'bg-[#F3E3B9]' : 'bg-white border border-[#E4DFCC]'}`}
        >
          <Settings className={`w-5 h-5 ${activeTab === 'settings' ? 'text-[#9C6B1D]' : 'text-[#8C8571]'}`} />
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