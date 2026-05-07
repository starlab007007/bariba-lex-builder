import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { type DictionaryEntry } from "@/data/fullDictionaryData";

interface DictionaryStatsProps {
  entries: DictionaryEntry[];
}

export const DictionaryStats = ({ entries }: DictionaryStatsProps) => {
  const totalEntries = entries.length;
  
  const partOfSpeechCounts = entries.reduce((acc, entry) => {
    acc[entry.part_of_speech] = (acc[entry.part_of_speech] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const topCategories = Object.entries(partOfSpeechCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 4);

  const getPartOfSpeechLabel = (pos: string) => {
    const labels: Record<string, string> = {
      n: "noms",
      v: "verbes", 
      adj: "adjectifs",
      adv: "adverbes",
      interj: "interjections",
      pron: "pronoms",
      det: "déterminants",
      prep: "prépositions",
      conj: "conjonctions",
      loc: "locutions",
      autre: "autres"
    };
    return labels[pos] || pos;
  };

  return (
    <Card className="dictionary-card bg-gradient-to-br from-primary/5 to-accent/5">
      <div className="space-y-4">
        <h3 className="font-bold text-lg text-foreground font-sans">
          Statistiques du dictionnaire
        </h3>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-4 bg-background/50 rounded-lg">
            <div className="text-3xl font-bold text-primary font-sans mb-1">
              {totalEntries}
            </div>
            <div className="text-sm text-muted-foreground font-sans">
              mots au total
            </div>
          </div>
          
          <div className="text-center p-4 bg-background/50 rounded-lg">
            <div className="text-3xl font-bold text-accent font-sans mb-1">
              {Object.keys(partOfSpeechCounts).length}
            </div>
            <div className="text-sm text-muted-foreground font-sans">
              catégories
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <h4 className="font-medium text-foreground font-sans">
            Principales catégories
          </h4>
          <div className="flex flex-wrap gap-2">
            {topCategories.map(([pos, count]) => (
              <Badge key={pos} variant="secondary" className="font-sans">
                {count} {getPartOfSpeechLabel(pos)}
              </Badge>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
};