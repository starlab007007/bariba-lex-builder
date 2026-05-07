import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Mic, Volume2, ArrowLeftRight, MessageSquare, Zap } from 'lucide-react';
import { VoiceDictation } from './VoiceDictation';
import { TextReader } from './TextReader';
import { VoiceTranslator } from './VoiceTranslator';
import { VoiceOnlyTranslator } from './VoiceOnlyTranslator';
import { ConversationMode } from './ConversationMode';
import { ServiceStatusIndicator } from '@/components/ServiceStatusIndicator';

interface VoiceTabProps {
  onTranslate?: (text: string, language: 'bariba' | 'french') => void;
}

export const VoiceTab = ({ onTranslate }: VoiceTabProps) => {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl lg:text-3xl font-bold text-foreground">
          🎤 <span className="bariba-text">Bààtɔ̀nú</span> ↔ 🇫🇷
        </h2>
        <p className="text-muted-foreground text-sm">
          100% vocal • Pas de lecture requise
        </p>
        <div className="flex justify-center mt-2">
          <ServiceStatusIndicator compact />
        </div>
      </div>

      <Tabs defaultValue="easy" className="w-full">
        <TabsList className="grid w-full max-w-2xl mx-auto grid-cols-5">
          <TabsTrigger value="easy" className="flex items-center gap-1 text-xs sm:text-sm">
            <Zap className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Facile</span>
          </TabsTrigger>
          <TabsTrigger value="dictation" className="flex items-center gap-1 text-xs sm:text-sm">
            <Mic className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Dictée</span>
          </TabsTrigger>
          <TabsTrigger value="reader" className="flex items-center gap-1 text-xs sm:text-sm">
            <Volume2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Lecture</span>
          </TabsTrigger>
          <TabsTrigger value="translator" className="flex items-center gap-1 text-xs sm:text-sm">
            <ArrowLeftRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Avancé</span>
          </TabsTrigger>
          <TabsTrigger value="conversation" className="flex items-center gap-1 text-xs sm:text-sm">
            <MessageSquare className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Chat</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="easy" className="mt-6">
          <VoiceOnlyTranslator />
        </TabsContent>

        <TabsContent value="dictation" className="mt-6">
          <VoiceDictation onTranslate={onTranslate} />
        </TabsContent>

        <TabsContent value="reader" className="mt-6">
          <TextReader />
        </TabsContent>

        <TabsContent value="translator" className="mt-6">
          <VoiceTranslator />
        </TabsContent>

        <TabsContent value="conversation" className="mt-6">
          <ConversationMode />
        </TabsContent>
      </Tabs>
    </div>
  );
};
