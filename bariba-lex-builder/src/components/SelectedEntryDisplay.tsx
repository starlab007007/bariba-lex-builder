import { DictionaryEntry as DictionaryEntryType } from "@/data/fullDictionaryData";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BookOpen, Languages, Copy, Volume2, AlertCircle, CheckCircle } from "lucide-react";
import { toast } from "sonner";

interface SelectedEntryDisplayProps {
  entry: DictionaryEntryType;
  searchDirection: "bariba-to-french" | "french-to-bariba" | "all";
}

export const SelectedEntryDisplay = ({ entry, searchDirection }: SelectedEntryDisplayProps) => {
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copié !`);
  };

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

  const getSourceLanguage = () => {
    if (searchDirection === "french-to-bariba") return "français";
    if (searchDirection === "bariba-to-french") return "bariba";
    return "bidirectionnel";
  };

  const getTargetLanguage = () => {
    if (searchDirection === "french-to-bariba") return "bariba";
    if (searchDirection === "bariba-to-french") return "français";
    return "bidirectionnel";
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Section 1: Traduction directe - Grand card mis en évidence */}
      <Card className="p-6 bg-gradient-to-br from-primary/10 via-accent/5 to-background border-primary/20 shadow-lg">
        <div className="space-y-4">
          {/* Header avec badge de correspondance exacte */}
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="space-y-2 flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="default" className="text-xs">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Correspondance exacte
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {getPartOfSpeechLabel(entry.part_of_speech || "n")}
                </Badge>
              </div>
              <h2 className="text-3xl font-bold text-foreground bariba-text break-words">
                {entry.word}
              </h2>
              {entry.phonetic && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Volume2 className="h-4 w-4" />
                  <span className="text-sm italic">/{entry.phonetic}/</span>
                </div>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => copyToClipboard(entry.word, "Mot")}
              className="shrink-0"
            >
              <Copy className="h-4 w-4 mr-2" />
              Copier
            </Button>
          </div>

          {/* Traduction principale */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Languages className="h-4 w-4" />
              <span>Traduction en {getTargetLanguage()}</span>
            </div>
            <p className="text-xl text-foreground leading-relaxed p-4 bg-background/50 rounded-lg border border-border/50">
              {entry.definition}
            </p>
          </div>

          {/* Variantes */}
          {entry.variants && entry.variants.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                Variantes
              </h4>
              <div className="flex flex-wrap gap-2">
                {entry.variants.map((variant, idx) => (
                  <Badge key={idx} variant="secondary" className="bariba-text">
                    {variant}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Section 2: Détails complets */}
      <Card className="p-6 space-y-6">
        <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-primary" />
          Détails complets
        </h3>

        {/* Exemples en Bààtɔ̀nú */}
        {entry.example_bariba && entry.example_bariba.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <span className="bariba-text">Exemples en Bààtɔ̀nú</span>
            </h4>
            <div className="space-y-2">
              {entry.example_bariba.map((example, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-accent/10 rounded-lg border border-border/50"
                >
                  <p className="text-foreground bariba-text leading-relaxed">
                    {example}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Exemples en français */}
        {entry.example_francais && entry.example_francais.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
              Exemples en français
            </h4>
            <div className="space-y-2">
              {entry.example_francais.map((example, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-primary/5 rounded-lg border border-border/50"
                >
                  <p className="text-foreground leading-relaxed italic">
                    {example}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Informations grammaticales */}
        {(entry.nominal_class || entry.plural_form || entry.verb_root || entry.grammatical_notes) && (
          <div className="space-y-3 p-4 bg-muted/30 rounded-lg border border-border/50">
            <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Informations grammaticales
            </h4>
            <div className="grid gap-2 text-sm">
              {entry.nominal_class && (
                <div className="flex gap-2">
                  <span className="text-muted-foreground min-w-[120px]">Classe nominale:</span>
                  <span className="text-foreground font-medium">{entry.nominal_class}</span>
                </div>
              )}
              {entry.plural_form && (
                <div className="flex gap-2">
                  <span className="text-muted-foreground min-w-[120px]">Forme plurielle:</span>
                  <span className="text-foreground font-medium bariba-text">{entry.plural_form}</span>
                </div>
              )}
              {entry.verb_root && (
                <div className="flex gap-2">
                  <span className="text-muted-foreground min-w-[120px]">Racine verbale:</span>
                  <span className="text-foreground font-medium bariba-text">{entry.verb_root}</span>
                </div>
              )}
              {entry.verbal_group && (
                <div className="flex gap-2">
                  <span className="text-muted-foreground min-w-[120px]">Groupe verbal:</span>
                  <span className="text-foreground font-medium">{entry.verbal_group}</span>
                </div>
              )}
            </div>
            {entry.grammatical_notes && (
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                {entry.grammatical_notes}
              </p>
            )}
          </div>
        )}

        {/* Notes supplémentaires */}
        {entry.notes && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-foreground">Notes</h4>
            <p className="text-sm text-muted-foreground leading-relaxed p-3 bg-muted/20 rounded-lg">
              {entry.notes}
            </p>
          </div>
        )}

        {/* Mots-clés français */}
        {entry.french_keywords && entry.french_keywords.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-foreground">Mots-clés français</h4>
            <div className="flex flex-wrap gap-2">
              {entry.french_keywords.slice(0, 10).map((keyword, idx) => (
                <Badge key={idx} variant="outline" className="text-xs">
                  {keyword}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};
