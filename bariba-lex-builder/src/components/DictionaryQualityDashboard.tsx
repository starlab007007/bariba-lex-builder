import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { DictionaryEntry } from "@/data/fullDictionaryData";
import { 
  analyzeDictionaryQuality, 
  suggestImprovements,
  type DictionaryQualityMetrics,
  type EntryQuality 
} from "@/utils/dictionaryOptimizer";
import { Book, CheckCircle, AlertCircle, TrendingUp, Download } from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

interface DictionaryQualityDashboardProps {
  entries: DictionaryEntry[];
}

export const DictionaryQualityDashboard = ({ entries }: DictionaryQualityDashboardProps) => {
  const [metrics, setMetrics] = useState<DictionaryQualityMetrics | null>(null);
  const [lowQuality, setLowQuality] = useState<EntryQuality[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (entries.length > 0) {
      analyzeQuality();
    }
  }, [entries]);

  const analyzeQuality = () => {
    setIsAnalyzing(true);
    
    // Analyse en différé pour ne pas bloquer l'UI
    setTimeout(() => {
      const metrics = analyzeDictionaryQuality(entries);
      const improvements = suggestImprovements(entries);
      
      setMetrics(metrics);
      setLowQuality(improvements.lowQualityEntries.slice(0, 10)); // Top 10 à améliorer
      setIsAnalyzing(false);
    }, 100);
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreBadgeVariant = (score: number): "default" | "secondary" | "destructive" => {
    if (score >= 80) return "default";
    if (score >= 60) return "secondary";
    return "destructive";
  };

  const exportDictionary = () => {
    const dataStr = JSON.stringify(entries, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `dictionnaire-optimise-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
    
    toast({
      title: "Exporté !",
      description: "Le dictionnaire a été exporté avec succès",
    });
  };

  if (!metrics) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <Book className="h-12 w-12 mx-auto mb-4 text-muted-foreground animate-pulse" />
            <p className="text-muted-foreground">Analyse du dictionnaire en cours...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Vue d'ensemble */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Qualité du Dictionnaire
            </CardTitle>
            <Button variant="outline" size="sm" onClick={exportDictionary}>
              <Download className="h-4 w-4 mr-2" />
              Exporter
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Score global */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Score de Qualité Global</span>
              <Badge variant={getScoreBadgeVariant(metrics.qualityScore)}>
                {Math.round(metrics.qualityScore)}%
              </Badge>
            </div>
            <Progress value={metrics.qualityScore} className="h-2" />
          </div>

          {/* Métriques détaillées */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Total Entrées</p>
              <p className="text-2xl font-bold text-foreground">{metrics.totalEntries}</p>
            </div>
            
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Avec Phonétique</p>
              <p className="text-2xl font-bold text-foreground">
                {Math.round((metrics.entriesWithPhonetic / metrics.totalEntries) * 100)}%
              </p>
            </div>
            
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Avec Exemples</p>
              <p className="text-2xl font-bold text-foreground">
                {Math.round((metrics.entriesWithExamples / metrics.totalEntries) * 100)}%
              </p>
            </div>
            
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Mots-clés Moy.</p>
              <p className="text-2xl font-bold text-foreground">
                {metrics.averageKeywordsPerEntry.toFixed(1)}
              </p>
            </div>
          </div>

          {/* Barre de complétude */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Taux de Complétude</span>
              <span className={`text-sm font-semibold ${getScoreColor(metrics.completenessScore)}`}>
                {Math.round(metrics.completenessScore)}%
              </span>
            </div>
            <Progress value={metrics.completenessScore} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {/* Entrées à améliorer */}
      {lowQuality.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertCircle className="h-5 w-5 text-yellow-600" />
              Entrées à Améliorer ({lowQuality.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {lowQuality.slice(0, 5).map((quality, index) => (
                <div key={index} className="border-l-4 border-yellow-500 pl-4 py-2 bg-muted/30 rounded-r">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-foreground">{quality.entry.word}</span>
                    <Badge variant={getScoreBadgeVariant(quality.completenessScore)}>
                      {Math.round(quality.completenessScore)}%
                    </Badge>
                  </div>
                  
                  {quality.issues.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground font-medium">Problèmes :</p>
                      <ul className="text-xs text-muted-foreground space-y-0.5">
                        {quality.issues.map((issue, i) => (
                          <li key={i} className="flex items-start gap-1">
                            <span className="text-red-500">•</span>
                            {issue}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {quality.suggestions.length > 0 && (
                    <div className="space-y-1 mt-2">
                      <p className="text-xs text-muted-foreground font-medium">Suggestions :</p>
                      <ul className="text-xs text-muted-foreground space-y-0.5">
                        {quality.suggestions.slice(0, 2).map((suggestion, i) => (
                          <li key={i} className="flex items-start gap-1">
                            <CheckCircle className="h-3 w-3 text-green-500 mt-0.5 shrink-0" />
                            {suggestion}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
