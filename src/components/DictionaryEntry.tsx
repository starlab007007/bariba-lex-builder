import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { type DictionaryEntry as DictionaryEntryType } from "@/data/fullDictionaryData";

interface DictionaryEntryProps {
  entry: DictionaryEntryType;
}

export const DictionaryEntry = ({ entry }: DictionaryEntryProps) => {
  const getPartOfSpeechLabel = (pos: string) => {
    const labels: Record<string, string> = {
      n: "nom",
      v: "verbe", 
      adj: "adjectif",
      adv: "adverbe",
      interj: "interjection",
      pron: "pronom",
      det: "déterminant",
      prep: "préposition",
      conj: "conjonction",
      loc: "locution",
      autre: "autre"
    };
    return labels[pos] || pos;
  };

  const getPartOfSpeechVariant = (pos: string): "default" | "secondary" | "outline" => {
    if (["n", "v", "adj"].includes(pos)) return "default";
    if (["interj", "pron", "conj"].includes(pos)) return "secondary";
    return "outline";
  };

  return (
    <Card className="dictionary-card">
      <div className="space-y-4">
        {/* Header with word and phonetics */}
        <div className="border-b border-border/50 pb-4">
          <div className="flex items-center gap-3 mb-2">
            <h2 className="bariba-text text-2xl font-bold tracking-wide">
              {entry.word}
            </h2>
            {entry.phonetic && (
              <span className="phonetic-text">
                {entry.phonetic}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={getPartOfSpeechVariant(entry.part_of_speech)}>
              {getPartOfSpeechLabel(entry.part_of_speech)}
            </Badge>
            {entry.source_flags.length > 0 && (
              <div className="flex gap-1">
                {entry.source_flags.slice(0, 3).map((flag, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {flag}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Definition */}
        <div className="definition-card">
          <h3 className="font-semibold text-foreground mb-2 font-sans">Définition</h3>
          <p className="text-foreground/90 leading-relaxed">
            {entry.definition}
          </p>
        </div>

        {/* Examples */}
        {(entry.example_bariba.length > 0 || entry.example_francais.length > 0) && (
          <div className="space-y-3">
            <h3 className="font-semibold text-foreground font-sans">Exemples</h3>
            <div className="space-y-2">
              {entry.example_bariba.map((example, index) => (
                <div key={index} className="space-y-1">
                  <div className="example-text">
                    <p className="bariba-text font-medium">{example}</p>
                  </div>
                  {entry.example_francais[index] && (
                    <div className="example-text bg-muted/50">
                      <p className="text-foreground/80 italic">{entry.example_francais[index]}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Variants and Keywords */}
        {(entry.variants.length > 0 || entry.french_keywords.length > 0) && (
          <div className="space-y-2">
            {entry.variants.length > 0 && (
              <div>
                <h4 className="font-medium text-sm text-muted-foreground mb-1 font-sans">Variantes</h4>
                <div className="flex flex-wrap gap-1">
                  {entry.variants.slice(0, 3).map((variant, index) => (
                    <Badge key={index} variant="outline" className="text-xs bariba-text">
                      {variant}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            
            {entry.french_keywords.length > 0 && (
              <div>
                <h4 className="font-medium text-sm text-muted-foreground mb-1 font-sans">Mots-clés</h4>
                <div className="flex flex-wrap gap-1">
                  {entry.french_keywords.slice(0, 4).map((keyword, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {keyword}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Notes */}
        {entry.notes && (
          <div className="border-t border-border/30 pt-3">
            <h4 className="font-medium text-sm text-muted-foreground mb-1 font-sans">Notes</h4>
            <p className="text-sm text-muted-foreground/90 italic">
              {entry.notes}
            </p>
          </div>
        )}
      </div>
    </Card>
  );
};