import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ArrowRight, ArrowLeft } from "lucide-react";
import { type SearchDirection } from "@/hooks/useSmartDictionarySearch";
import { type DictionaryEntry } from "@/data/fullDictionaryData";

interface DirectTranslationProps {
  searchQuery: string;
  searchDirection: SearchDirection;
  entry: DictionaryEntry;
}

export const DirectTranslation = ({ searchQuery, searchDirection, entry }: DirectTranslationProps) => {
  const getTranslationDirection = () => {
    if (searchDirection === "bariba-to-french") {
      return {
        from: entry.word,
        to: entry.definition,
        fromLang: "Bààtɔ̀nú",
        toLang: "Français",
        icon: <ArrowRight className="h-4 w-4" />
      };
    } else if (searchDirection === "french-to-bariba") {
      // Trouver le mot français qui correspond à la recherche
      const matchingKeyword = entry.french_keywords?.find(k => 
        k.toLowerCase() === searchQuery.toLowerCase()
      );
      return {
        from: matchingKeyword || searchQuery,
        to: entry.word,
        fromLang: "Français",
        toLang: "Bààtɔ̀nú",
        icon: <ArrowLeft className="h-4 w-4" />
      };
    }
    return null;
  };

  const translation = getTranslationDirection();
  
  if (!translation) return null;

  return (
    <Card className="dictionary-card bg-gradient-to-br from-primary/5 to-accent/5 border-primary/20">
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-3">
          <Badge variant="default" className="text-xs">
            Traduction directe
          </Badge>
          <Badge variant="outline" className="text-xs">
            {translation.fromLang} → {translation.toLang}
          </Badge>
        </div>

        <div className="flex items-center justify-center gap-4 py-4">
          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-1">{translation.fromLang}</p>
            <p className={`text-xl font-bold ${searchDirection === "french-to-bariba" ? "" : "bariba-text"}`}>
              {translation.from}
            </p>
          </div>
          
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10">
            {translation.icon}
          </div>
          
          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-1">{translation.toLang}</p>
            <p className={`text-xl font-bold ${searchDirection === "bariba-to-french" ? "" : "bariba-text"}`}>
              {translation.to}
            </p>
          </div>
        </div>

        {/* Phonétique pour les mots bariba */}
        {entry.phonetic && (
          <div className="text-center">
            <p className="phonetic-text text-sm">
              {entry.phonetic}
            </p>
          </div>
        )}

        {/* Partie du discours */}
        <div className="flex justify-center">
          <Badge variant="secondary" className="text-xs">
            {entry.part_of_speech}
          </Badge>
        </div>

        {/* Définition complète si différente */}
        {translation.to !== entry.definition && (
          <div className="border-t border-border/30 pt-3">
            <p className="text-sm text-muted-foreground italic text-center">
              {entry.definition}
            </p>
          </div>
        )}
      </div>
    </Card>
  );
};