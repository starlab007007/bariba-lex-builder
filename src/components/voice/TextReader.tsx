import { useState } from 'react';
import { Volume2, VolumeX, Loader2, Settings } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useBaribaTTS } from '@/hooks/useBaribaTTS';
import { useFrenchTTS } from '@/hooks/useFrenchTTS';

export const TextReader = () => {
  const [language, setLanguage] = useState<'bariba' | 'french'>('bariba');
  const [text, setText] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  
  // Bariba TTS settings
  const [speakingRate, setSpeakingRate] = useState(1.0);
  const [noiseScale, setNoiseScale] = useState(0.5);
  
  // French TTS settings
  const [frenchRate, setFrenchRate] = useState(1.0);
  const [frenchPitch, setFrenchPitch] = useState(1.0);

  const { speak: speakBariba, stop: stopBariba, isSpeaking: isSpeakingBariba, isLoading: isLoadingBariba } = useBaribaTTS();
  const { speak: speakFrench, stop: stopFrench, isSpeaking: isSpeakingFrench, isSupported: isFrenchSupported } = useFrenchTTS();

  const isSpeaking = language === 'bariba' ? isSpeakingBariba : isSpeakingFrench;
  const isLoading = isLoadingBariba;

  const handleSpeak = () => {
    if (!text.trim()) return;

    if (isSpeaking) {
      if (language === 'bariba') {
        stopBariba();
      } else {
        stopFrench();
      }
      return;
    }

    if (language === 'bariba') {
      speakBariba(text, { speakingRate, noiseScale });
    } else {
      speakFrench(text, { rate: frenchRate, pitch: frenchPitch });
    }
  };

  const examplePhrases = {
    bariba: [
      'Aagu',
      'Foo ka bani',
      'N de bani gandi',
      'Ka su gbenma'
    ],
    french: [
      'Bonjour',
      'Comment allez-vous ?',
      'Je vais bien, merci',
      'Au revoir'
    ]
  };

  return (
    <div className="space-y-6">
      <Tabs value={language} onValueChange={(v) => setLanguage(v as 'bariba' | 'french')}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="bariba" className="flex items-center gap-2">
            <Volume2 className="h-4 w-4" />
            <span className="bariba-text">Bààtɔ̀nú</span>
          </TabsTrigger>
          <TabsTrigger value="french" className="flex items-center gap-2">
            <Volume2 className="h-4 w-4" />
            Français
          </TabsTrigger>
        </TabsList>

        <TabsContent value="bariba" className="pt-4">
          <Card className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Volume2 className="h-4 w-4 text-primary" />
                <span className="font-medium">Texte à lire</span>
              </div>
              <Badge variant="secondary" className="bariba-text">Bààtɔ̀nú</Badge>
            </div>

            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Saisissez le texte bariba à lire..."
              className="min-h-32 bariba-text"
            />

            {/* Example phrases */}
            <div className="flex flex-wrap gap-2">
              {examplePhrases.bariba.map((phrase) => (
                <Button
                  key={phrase}
                  size="sm"
                  variant="outline"
                  onClick={() => setText(phrase)}
                  className="text-xs bariba-text"
                >
                  {phrase}
                </Button>
              ))}
            </div>

            {/* Settings */}
            <Collapsible open={showSettings} onOpenChange={setShowSettings}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="w-full">
                  <Settings className="h-4 w-4 mr-2" />
                  Paramètres vocaux
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-4 pt-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Vitesse</span>
                    <span>{speakingRate.toFixed(1)}x</span>
                  </div>
                  <Slider
                    value={[speakingRate]}
                    min={0.8}
                    max={1.5}
                    step={0.1}
                    onValueChange={([v]) => setSpeakingRate(v)}
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Expressivité</span>
                    <span>{Math.round(noiseScale * 100)}%</span>
                  </div>
                  <Slider
                    value={[noiseScale]}
                    min={0.3}
                    max={0.8}
                    step={0.1}
                    onValueChange={([v]) => setNoiseScale(v)}
                  />
                </div>
              </CollapsibleContent>
            </Collapsible>

            <Button
              className="w-full"
              onClick={handleSpeak}
              disabled={!text.trim() || isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Chargement...
                </>
              ) : isSpeaking ? (
                <>
                  <VolumeX className="h-4 w-4 mr-2" />
                  Arrêter
                </>
              ) : (
                <>
                  <Volume2 className="h-4 w-4 mr-2" />
                  Lire le texte
                </>
              )}
            </Button>
          </Card>
        </TabsContent>

        <TabsContent value="french" className="pt-4">
          <Card className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Volume2 className="h-4 w-4 text-primary" />
                <span className="font-medium">Texte à lire</span>
              </div>
              <Badge variant="secondary">Français</Badge>
            </div>

            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Saisissez le texte français à lire..."
              className="min-h-32"
            />

            {/* Example phrases */}
            <div className="flex flex-wrap gap-2">
              {examplePhrases.french.map((phrase) => (
                <Button
                  key={phrase}
                  size="sm"
                  variant="outline"
                  onClick={() => setText(phrase)}
                  className="text-xs"
                >
                  {phrase}
                </Button>
              ))}
            </div>

            {/* Settings */}
            <Collapsible open={showSettings} onOpenChange={setShowSettings}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="w-full">
                  <Settings className="h-4 w-4 mr-2" />
                  Paramètres vocaux
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-4 pt-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Vitesse</span>
                    <span>{frenchRate.toFixed(1)}x</span>
                  </div>
                  <Slider
                    value={[frenchRate]}
                    min={0.5}
                    max={2.0}
                    step={0.1}
                    onValueChange={([v]) => setFrenchRate(v)}
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Tonalité</span>
                    <span>{frenchPitch.toFixed(1)}</span>
                  </div>
                  <Slider
                    value={[frenchPitch]}
                    min={0.5}
                    max={2.0}
                    step={0.1}
                    onValueChange={([v]) => setFrenchPitch(v)}
                  />
                </div>
              </CollapsibleContent>
            </Collapsible>

            {isFrenchSupported ? (
              <Button
                className="w-full"
                onClick={handleSpeak}
                disabled={!text.trim()}
              >
                {isSpeaking ? (
                  <>
                    <VolumeX className="h-4 w-4 mr-2" />
                    Arrêter
                  </>
                ) : (
                  <>
                    <Volume2 className="h-4 w-4 mr-2" />
                    Lire le texte
                  </>
                )}
              </Button>
            ) : (
              <div className="text-center text-sm text-muted-foreground">
                Synthèse vocale non supportée par ce navigateur
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
