/**
 * FontManagerPanel - Panneau de gestion des polices
 * Interface pour charger et prévisualiser les fonts du système
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import {
  Type,
  Download,
  CheckCircle,
  Loader2,
  RefreshCw,
  Eye,
  Palette,
  Settings,
  Copy,
  ExternalLink,
} from 'lucide-react';
import { useFontLoader, REQUIRED_FONTS, FontConfig } from '@/services/FontLoaderService';
import { toast } from 'sonner';

// ============================================================================
// COMPONENT
// ============================================================================

export const FontManagerPanel: React.FC = () => {
  const { 
    progress, 
    loadedFonts, 
    loadAllFonts, 
    loadFont, 
    isFontLoaded, 
    getFontStack,
    requiredFonts 
  } = useFontLoader();

  const [previewText, setPreviewText] = useState('TAM-TAM Bariba 🥁');
  const [previewSize, setPreviewSize] = useState(32);
  const [selectedFont, setSelectedFont] = useState<string | null>(null);

  // Load fonts on mount
  useEffect(() => {
    if (loadedFonts.length === 0) {
      handleLoadAll();
    }
  }, []);

  const handleLoadAll = async () => {
    toast.info('Chargement des polices...');
    try {
      const results = await loadAllFonts();
      const successful = results.filter(r => r.loaded).length;
      toast.success(`${successful}/${results.length} polices chargées`);
    } catch (error) {
      toast.error('Erreur lors du chargement des polices');
    }
  };

  const handleLoadSingle = async (fontName: string) => {
    toast.info(`Chargement de ${fontName}...`);
    try {
      const result = await loadFont(fontName);
      if (result.loaded) {
        toast.success(`${fontName} chargée en ${result.loadTime?.toFixed(0)}ms`);
      } else {
        toast.error(`Erreur: ${result.error}`);
      }
    } catch (error) {
      toast.error('Erreur lors du chargement');
    }
  };

  const handleCopyFontStack = (fontName: string) => {
    const stack = getFontStack(fontName);
    navigator.clipboard.writeText(stack);
    toast.success('Font stack copié !');
  };

  const totalFonts = Object.keys(requiredFonts).length;
  const loadedCount = loadedFonts.length;
  const loadProgress = totalFonts > 0 ? (loadedCount / totalFonts) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-indigo-500/10 flex items-center justify-center">
              <Type className="h-6 w-6 text-indigo-500" />
            </div>
            <div className="flex-1">
              <p className="text-2xl font-bold">{loadedCount}/{totalFonts}</p>
              <p className="text-xs text-muted-foreground">Polices chargées</p>
              <Progress value={loadProgress} className="h-1 mt-1" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Source</p>
                <p className="text-xs text-muted-foreground">Google Fonts API</p>
              </div>
              <ExternalLink className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Button
              onClick={handleLoadAll}
              disabled={progress.isLoading}
              className="w-full"
            >
              {progress.isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Chargement...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Charger Toutes
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Loading Progress */}
      {progress.isLoading && (
        <Alert>
          <Loader2 className="h-4 w-4 animate-spin" />
          <AlertTitle>Chargement en cours</AlertTitle>
          <AlertDescription>
            {progress.currentFont && `Police: ${progress.currentFont}`}
            <Progress value={(progress.loaded / progress.total) * 100} className="h-2 mt-2" />
          </AlertDescription>
        </Alert>
      )}

      {/* Preview Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Prévisualisation
          </CardTitle>
          <CardDescription>
            Testez l'apparence des polices avec votre texte
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Texte de prévisualisation</Label>
              <Input
                value={previewText}
                onChange={(e) => setPreviewText(e.target.value)}
                placeholder="Entrez votre texte..."
              />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label>Taille ({previewSize}px)</Label>
              </div>
              <Slider
                value={[previewSize]}
                onValueChange={([v]) => setPreviewSize(v)}
                min={12}
                max={72}
                step={2}
              />
            </div>
          </div>

          {/* Preview Grid */}
          <div className="grid gap-3">
            {Object.entries(requiredFonts).map(([name, config]) => {
              const isLoaded = isFontLoaded(name);
              const isSelected = selectedFont === name;

              return (
                <div
                  key={name}
                  onClick={() => setSelectedFont(isSelected ? null : name)}
                  className={`
                    p-4 rounded-lg border cursor-pointer transition-all
                    ${isLoaded 
                      ? isSelected 
                        ? 'border-primary bg-primary/5 ring-2 ring-primary/20' 
                        : 'border-border hover:border-primary/50'
                      : 'border-dashed border-muted-foreground/30 opacity-50'}
                  `}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{name}</span>
                      {isLoaded ? (
                        <Badge className="bg-green-500 text-xs">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Chargée
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs">
                          Non chargée
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopyFontStack(name);
                        }}
                        title="Copier le font-stack"
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                      {!isLoaded && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleLoadSingle(name);
                          }}
                          title="Charger cette police"
                        >
                          <Download className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Font Preview */}
                  <div
                    className="mt-2 py-2 border-t"
                    style={{
                      fontFamily: getFontStack(name),
                      fontSize: `${previewSize}px`,
                      lineHeight: 1.2,
                    }}
                  >
                    {previewText}
                  </div>

                  {/* Weights */}
                  {isSelected && isLoaded && (
                    <div className="mt-3 pt-3 border-t">
                      <p className="text-xs text-muted-foreground mb-2">Poids disponibles:</p>
                      <div className="flex flex-wrap gap-2">
                        {config.weights.map((weight) => (
                          <div
                            key={weight}
                            className="px-2 py-1 rounded bg-muted text-xs"
                            style={{
                              fontFamily: getFontStack(name),
                              fontWeight: weight,
                            }}
                          >
                            {weight}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* CSS Variables */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Settings className="h-4 w-4" />
            Variables CSS Générées
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[150px]">
            <pre className="text-xs p-3 bg-muted rounded-lg overflow-x-auto">
              <code>
{`:root {
${Object.entries(requiredFonts)
  .map(([name, config]) => {
    const varName = name.toLowerCase().replace(/\s+/g, '-');
    return `  --font-${varName}: "${name}", ${config.fallback};`;
  })
  .join('\n')}
}`}
              </code>
            </pre>
          </ScrollArea>
          <Button
            variant="outline"
            size="sm"
            className="mt-2"
            onClick={() => {
              const css = `:root {\n${Object.entries(requiredFonts)
                .map(([name, config]) => {
                  const varName = name.toLowerCase().replace(/\s+/g, '-');
                  return `  --font-${varName}: "${name}", ${config.fallback};`;
                })
                .join('\n')}\n}`;
              navigator.clipboard.writeText(css);
              toast.success('CSS copié !');
            }}
          >
            <Copy className="h-4 w-4 mr-2" />
            Copier le CSS
          </Button>
        </CardContent>
      </Card>

      {/* Errors */}
      {progress.errors.length > 0 && (
        <Alert variant="destructive">
          <AlertTitle>Erreurs de chargement</AlertTitle>
          <AlertDescription>
            <ul className="list-disc pl-4 mt-2 space-y-1">
              {progress.errors.map((error, idx) => (
                <li key={idx} className="text-sm">{error}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default FontManagerPanel;
