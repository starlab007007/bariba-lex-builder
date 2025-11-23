/**
 * SMT Data Viewer - Visualisation des données utilisées par le SMT
 */
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { Search, Download, RefreshCw, Database } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface TrainingPhrase {
  id: string;
  french_text: string;
  bariba_text: string;
  source: string;
  quality_score: number;
  created_at: string;
}

interface DataStats {
  totalPhrases: number;
  sourceBreakdown: Record<string, number>;
  avgQualityScore: number;
  uniqueFrenchWords: number;
  uniqueBaribaWords: number;
}

export function SMTDataViewer() {
  const [phrases, setPhrases] = useState<TrainingPhrase[]>([]);
  const [filteredPhrases, setFilteredPhrases] = useState<TrainingPhrase[]>([]);
  const [stats, setStats] = useState<DataStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const { toast } = useToast();

  const loadData = async () => {
    setLoading(true);
    try {
      // Charger TOUTES les phrases sans limite pour l'affichage
      const { data, error } = await supabase
        .from('training_phrases')
        .select('id, french_text, bariba_text, source, quality_score, created_at')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setPhrases(data || []);
      setFilteredPhrases(data || []);

      // Calculate stats
      const { data: allData } = await supabase
        .from('training_phrases')
        .select('source, quality_score, french_text, bariba_text');

      if (allData) {
        const sourceBreakdown = allData.reduce((acc, p) => {
          const source = p.source || 'unknown';
          acc[source] = (acc[source] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        const avgQuality = allData.reduce((sum, p) => sum + (p.quality_score || 0), 0) / allData.length;

        const frenchWords = new Set(allData.flatMap(p => p.french_text.toLowerCase().split(/\s+/)));
        const baribaWords = new Set(allData.flatMap(p => p.bariba_text.toLowerCase().split(/\s+/)));

        setStats({
          totalPhrases: allData.length,
          sourceBreakdown,
          avgQualityScore: Math.round(avgQuality * 100) / 100,
          uniqueFrenchWords: frenchWords.size,
          uniqueBaribaWords: baribaWords.size
        });
      }

      console.log(`📊 SMT Data Viewer: ${data?.length || 0} phrases chargées au total`);
      
      toast({
        title: "✅ Données chargées",
        description: `${(data?.length || 0).toLocaleString()} phrases chargées`
      });
    } catch (error: any) {
      console.error("Erreur chargement données:", error);
      toast({
        title: "❌ Erreur",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    let filtered = phrases;

    if (sourceFilter !== "all") {
      filtered = filtered.filter(p => p.source === sourceFilter);
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(p => 
        p.french_text.toLowerCase().includes(term) ||
        p.bariba_text.toLowerCase().includes(term)
      );
    }

    setFilteredPhrases(filtered);
  }, [searchTerm, sourceFilter, phrases]);

  const exportData = () => {
    const csv = [
      'Français,Bariba,Source,Score Qualité,Date',
      ...filteredPhrases.map(p => 
        `"${p.french_text}","${p.bariba_text}","${p.source}",${p.quality_score},"${p.created_at}"`
      )
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `smt-data-${new Date().toISOString()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const sources = stats ? Object.keys(stats.sourceBreakdown) : [];

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className="p-4">
            <div className="text-sm text-muted-foreground mb-1">Total Phrases</div>
            <div className="text-2xl font-bold text-foreground">{stats.totalPhrases.toLocaleString()}</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-muted-foreground mb-1">Score Qualité</div>
            <div className="text-2xl font-bold text-foreground">{stats.avgQualityScore}</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-muted-foreground mb-1">Mots FR uniques</div>
            <div className="text-2xl font-bold text-foreground">{stats.uniqueFrenchWords.toLocaleString()}</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-muted-foreground mb-1">Mots BBA uniques</div>
            <div className="text-2xl font-bold text-foreground">{stats.uniqueBaribaWords.toLocaleString()}</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-muted-foreground mb-1">Sources</div>
            <div className="text-2xl font-bold text-foreground">{sources.length}</div>
          </Card>
        </div>
      )}

      {/* Source Breakdown */}
      {stats && (
        <Card className="p-4">
          <h4 className="text-md font-semibold mb-3 text-foreground flex items-center gap-2">
            <Database className="w-4 h-4" />
            Répartition par source
          </h4>
          <div className="flex flex-wrap gap-2">
            {Object.entries(stats.sourceBreakdown).map(([source, count]) => (
              <Badge key={source} variant="secondary">
                {source}: {count.toLocaleString()}
              </Badge>
            ))}
          </div>
        </Card>
      )}

      {/* Filters and Actions */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher dans français ou bariba..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={sourceFilter} onValueChange={setSourceFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filtrer par source" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les sources</SelectItem>
              {sources.map(source => (
                <SelectItem key={source} value={source}>{source}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={loadData} variant="outline" size="icon">
            <RefreshCw className="w-4 h-4" />
          </Button>
          <Button onClick={exportData} variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Exporter CSV
          </Button>
        </div>
      </Card>

      {/* Data Table */}
      <Card className="p-4">
        <div className="text-sm text-muted-foreground mb-4">
          Affichage de {filteredPhrases.length.toLocaleString()} phrases 
          {stats && ` sur ${stats.totalPhrases.toLocaleString()} total`}
        </div>
        <div className="rounded-md border border-border max-h-[600px] overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40%]">Français</TableHead>
                <TableHead className="w-[40%]">Bariba</TableHead>
                <TableHead className="w-[10%]">Source</TableHead>
                <TableHead className="w-[10%]">Score</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    Chargement...
                  </TableCell>
                </TableRow>
              ) : filteredPhrases.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    Aucune phrase trouvée
                  </TableCell>
                </TableRow>
              ) : (
                filteredPhrases.map((phrase) => (
                  <TableRow key={phrase.id}>
                    <TableCell className="font-medium">{phrase.french_text}</TableCell>
                    <TableCell className="bariba-text">{phrase.bariba_text}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {phrase.source || 'N/A'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={phrase.quality_score >= 0.8 ? "default" : phrase.quality_score >= 0.5 ? "secondary" : "destructive"}
                        className="text-xs"
                      >
                        {(phrase.quality_score * 100).toFixed(0)}%
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
