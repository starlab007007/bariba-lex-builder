import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DictionaryEntry } from "@/data/fullDictionaryData";
import { ChevronDown, ChevronUp, Volume2, Copy, Star } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface SearchResultDisplayProps {
  entry: DictionaryEntry;
  query: string;
  index: number;
  relevanceScore?: number;
}

export const SearchResultDisplay = ({ entry, query, index, relevanceScore }: SearchResultDisplayProps) => {
  const [isExpanded, setIsExpanded] = useState(index < 3); // Auto-expand first 3 results
  const { toast } = useToast();

  const highlightText = (text: string, query: string) => {
    if (!query) return text;
    
    const regex = new RegExp(`(${query})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, i) => 
      regex.test(part) ? (
        <mark key={i} className="bg-primary/20 text-primary font-semibold">
          {part}
        </mark>
      ) : part
    );
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copié !",
      description: `${label} copié dans le presse-papier`,
    });
  };

  const getPartOfSpeechLabel = (pos: string) => {
    const labels: Record<string, string> = {
      'n': 'nom',
      'v': 'verbe',
      'adj': 'adjectif',
      'adv': 'adverbe',
      'interj': 'interjection',
      'pron': 'pronom',
      'prep': 'préposition',
      'conj': 'conjonction',
    };
    return labels[pos] || pos;
  };

  return (
    <Card className="hover:shadow-md transition-shadow duration-200">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-xl font-bold text-primary flex items-center gap-2 flex-wrap">
              {highlightText(entry.word, query)}
              {entry.variants && entry.variants.length > 0 && (
                <span className="text-sm text-muted-foreground font-normal">
                  / {entry.variants.join(', ')}
                </span>
              )}
            </CardTitle>
            
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {entry.phonetic && (
                <Badge variant="outline" className="text-xs">
                  {entry.phonetic}
                </Badge>
              )}
              
              <Badge variant="secondary" className="text-xs">
                {getPartOfSpeechLabel(entry.part_of_speech)}
              </Badge>

              {relevanceScore !== undefined && relevanceScore > 80 && (
                <Badge variant="default" className="text-xs bg-accent">
                  <Star className="h-3 w-3 mr-1" />
                  Très pertinent
                </Badge>
              )}
            </div>
          </div>

          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => copyToClipboard(entry.word, "Mot")}
            >
              <Copy className="h-4 w-4" />
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {/* Définition - toujours visible */}
        <div className="mb-4">
          <p className="text-base font-medium text-foreground">
            {highlightText(entry.definition, query)}
          </p>
        </div>

        {/* Détails étendus */}
        {isExpanded && (
          <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
            {/* Exemples en Bààtɔ̀nú */}
            {entry.example_bariba && entry.example_bariba.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-primary flex items-center gap-2">
                  Exemples en Bààtɔ̀nú
                  <Volume2 className="h-3 w-3" />
                </h4>
                <div className="space-y-1">
                  {entry.example_bariba.map((example, i) => (
                    <p key={i} className="text-sm text-muted-foreground italic pl-3 border-l-2 border-primary/30">
                      {highlightText(example, query)}
                    </p>
                  ))}
                </div>
              </div>
            )}

            {/* Exemples en Français */}
            {entry.example_francais && entry.example_francais.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-accent">
                  Exemples en Français
                </h4>
                <div className="space-y-1">
                  {entry.example_francais.map((example, i) => (
                    <p key={i} className="text-sm text-muted-foreground italic pl-3 border-l-2 border-accent/30">
                      {highlightText(example, query)}
                    </p>
                  ))}
                </div>
              </div>
            )}

            {/* Notes supplémentaires */}
            {entry.notes && entry.notes.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-muted-foreground">Notes</h4>
                <p className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-md">
                  {entry.notes}
                </p>
              </div>
            )}

            {/* Mots-clés français */}
            {entry.french_keywords && entry.french_keywords.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-muted-foreground">Mots-clés</h4>
                <div className="flex flex-wrap gap-1">
                  {entry.french_keywords.slice(0, 10).map((keyword, i) => (
                    <Badge key={i} variant="outline" className="text-xs">
                      {keyword}
                    </Badge>
                  ))}
                  {entry.french_keywords.length > 10 && (
                    <Badge variant="outline" className="text-xs">
                      +{entry.french_keywords.length - 10} autres
                    </Badge>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
