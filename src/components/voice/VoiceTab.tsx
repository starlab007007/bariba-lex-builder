import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Mic, Volume2, ArrowLeftRight, MessageSquare } from 'lucide-react';
import { VoiceDictation } from './VoiceDictation';
import { TextReader } from './TextReader';
import { VoiceTranslator } from './VoiceTranslator';
import { ConversationMode } from './ConversationMode';

interface VoiceTabProps {
  onTranslate?: (text: string, language: 'bariba' | 'french') => void;
}

export const VoiceTab = ({ onTranslate }: VoiceTabProps) => {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl lg:text-3xl font-bold text-foreground">
          Interface Vocale <span className="bariba-text">Bààtɔ̀nú</span>
        </h2>
        <p className="text-muted-foreground">
          Parlez, écoutez et traduisez entre le français et le bariba
        </p>
      </div>

      <Tabs defaultValue="dictation" className="w-full">
        <TabsList className="grid w-full max-w-2xl mx-auto grid-cols-4">
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
            <span className="hidden sm:inline">Traduction</span>
          </TabsTrigger>
          <TabsTrigger value="conversation" className="flex items-center gap-1 text-xs sm:text-sm">
            <MessageSquare className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Chat</span>
          </TabsTrigger>
        </TabsList>

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
