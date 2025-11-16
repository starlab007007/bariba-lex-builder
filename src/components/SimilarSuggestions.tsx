import { DictionaryEntry } from "@/data/fullDictionaryData";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronRight, Languages } from "lucide-react";

interface SimilarSuggestionsProps {
  suggestions: DictionaryEntry[];
  onSelectEntry: (entry: DictionaryEntry) => void;
  selectedEntry: DictionaryEntry | null;
}

export const SimilarSuggestions = ({ suggestions, onSelectEntry, selectedEntry }: SimilarSuggestionsProps) => {
  const getPartOfSpeechLabel = (pos: string) => {
    const labels: Record<string, string> = {
      n: "nom",
      v: "verbe",
      adj: "adjectif",
      adv: "adverbe",
      pron: "pronom",
      prep: "préposition",
      conj: "conjonction",
      interj: "interjection"
    };
    return labels[pos] || pos;
  };

  // Filtrer pour ne pas afficher l'entrée sélectionnée dans les suggestions
  const filteredSuggestions = suggestions.filter(
    entry => !selectedEntry || entry.word !== selectedEntry.word
  );

  if (filteredSuggestions.length === 0) {
    return null;
  }

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
          <Languages className="h-5 w-5 text-accent" />
          Suggestions similaires
        </h3>
        <Badge variant="secondary" className="text-xs">
          {filteredSuggestions.length} résultat{filteredSuggestions.length > 1 ? "s" : ""}
        </Badge>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {filteredSuggestions.slice(0, 8).map((entry, idx) => (
          <button
            key={idx}
            onClick={() => onSelectEntry(entry)}
            className="group text-left p-4 rounded-lg border border-border/50 bg-background hover:bg-accent/5 hover:border-primary/30 transition-all duration-200 hover:shadow-md"
          >
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h4 className="text-base font-semibold text-foreground bariba-text truncate group-hover:text-primary transition-colors">
                    {entry.word}
                  </h4>
                  {entry.phonetic && (
                    <p className="text-xs text-muted-foreground italic">
                      /{entry.phonetic}/
                    </p>
                  )}
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all shrink-0" />
              </div>

              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  {getPartOfSpeechLabel(entry.part_of_speech || "n")}
                </Badge>
              </div>

              <p className="text-sm text-muted-foreground line-clamp-2">
                {entry.definition}
              </p>
            </div>
          </button>
        ))}
      </div>

      {filteredSuggestions.length > 8 && (
        <p className="text-xs text-center text-muted-foreground">
          + {filteredSuggestions.length - 8} autre{filteredSuggestions.length - 8 > 1 ? "s" : ""} résultat{filteredSuggestions.length - 8 > 1 ? "s" : ""}...
        </p>
      )}
    </Card>
  );
};
