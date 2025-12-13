import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Filter, SortAsc, X } from 'lucide-react';
import { sortBaatonum, normalizeTones } from '@/utils/baatonumLinguistics';
import { DictionaryEntry } from './DictionaryEntry';

interface SearchFilters {
  query: string;
  nominalClass: string;
  verbalGroup: string;
  verbType: string;
  partOfSpeech: string;
  hasTones: string;
}

export default function AdvancedDictionarySearch() {
  const [filters, setFilters] = useState<SearchFilters>({
    query: '',
    nominalClass: '',
    verbalGroup: '',
    verbType: '',
    partOfSpeech: '',
    hasTones: ''
  });

  const [results, setResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sortOrder, setSortOrder] = useState<'baatonum' | 'french'>('baatonum');
  const [activeFiltersCount, setActiveFiltersCount] = useState(0);

  // Classes et options
  const nominalClasses = ['b', 'g', 'm', 'n', 's', 't', 'w', 'y'];
  const verbalGroups = ['1', '2', '3', '4', '5'];
  const verbTypes = ['v.tr', 'v.int', 'vd', 'veq', 'v.inv', 'v.stat', 'lv'];
  const partsOfSpeech = [
    'nom', 'verbe', 'adjectif', 'adverbe', 'pronom', 
    'conjonction', 'préposition', 'interjection'
  ];

  // Compter les filtres actifs
  useEffect(() => {
    const count = Object.values(filters).filter(v => v !== '' && v !== 'all').length;
    setActiveFiltersCount(count);
  }, [filters]);

  // Recherche avec filtres
  const searchWithFilters = async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('dictionary_entries')
        .select('*');

      // Filtre par recherche textuelle
      if (filters.query) {
        const searchTerm = filters.query.toLowerCase();
        query = query.or(`word.ilike.%${searchTerm}%,definition.ilike.%${searchTerm}%,french_keywords.cs.{${searchTerm}}`);
      }

      // Filtre par classe nominale
      if (filters.nominalClass && filters.nominalClass !== 'all') {
        query = query.eq('nominal_class', filters.nominalClass);
      }

      // Filtre par groupe verbal
      if (filters.verbalGroup && filters.verbalGroup !== 'all') {
        query = query.eq('verbal_group', parseInt(filters.verbalGroup));
      }

      // Filtre par type de verbe
      if (filters.verbType && filters.verbType !== 'all') {
        query = query.ilike('verb_type', `%${filters.verbType}%`);
      }

      // Filtre par nature grammaticale
      if (filters.partOfSpeech && filters.partOfSpeech !== 'all') {
        query = query.ilike('part_of_speech', `%${filters.partOfSpeech}%`);
      }

      // Filtre par présence de tons
      if (filters.hasTones && filters.hasTones !== 'all') {
        if (filters.hasTones === 'yes') {
          query = query.not('tone_pattern', 'is', null);
        } else if (filters.hasTones === 'no') {
          query = query.is('tone_pattern', null);
        }
      }

      const { data, error } = await query.limit(100);

      if (error) throw error;

      // Trier les résultats
      const sorted = sortResults(data || []);
      setResults(sorted);

    } catch (error: any) {
      console.error('Erreur de recherche:', error);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Trier selon l'ordre alphabétique
  const sortResults = (data: any[]) => {
    if (sortOrder === 'baatonum') {
      return sortBaatonum(data.map(d => d.word))
        .map(word => data.find(d => d.word === word))
        .filter(Boolean);
    } else {
      return [...data].sort((a, b) => 
        a.definition.localeCompare(b.definition, 'fr')
      );
    }
  };

  // Résultats triés
  const sortedResults = useMemo(() => {
    return sortResults(results);
  }, [results, sortOrder]);

  // Réinitialiser les filtres
  const resetFilters = () => {
    setFilters({
      query: '',
      nominalClass: '',
      verbalGroup: '',
      verbType: '',
      partOfSpeech: '',
      hasTones: ''
    });
    setResults([]);
  };

  // Recherche automatique au changement des filtres
  useEffect(() => {
    if (activeFiltersCount > 0) {
      const timer = setTimeout(() => {
        searchWithFilters();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [filters]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Recherche Avancée</CardTitle>
              <CardDescription>
                Recherche avec filtres grammaticaux et tri alphabétique Baatɔnum
              </CardDescription>
            </div>
            {activeFiltersCount > 0 && (
              <Button variant="outline" size="sm" onClick={resetFilters}>
                <X className="mr-2 h-4 w-4" />
                Réinitialiser ({activeFiltersCount})
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="basic">
                <Search className="mr-2 h-4 w-4" />
                Recherche
              </TabsTrigger>
              <TabsTrigger value="nominal">
                <Filter className="mr-2 h-4 w-4" />
                Nominal
              </TabsTrigger>
              <TabsTrigger value="verbal">
                <Filter className="mr-2 h-4 w-4" />
                Verbal
              </TabsTrigger>
            </TabsList>

            {/* Onglet Recherche de base */}
            <TabsContent value="basic" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="search-query">Rechercher un mot</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="search-query"
                    placeholder="Mot en Baatɔnum ou en français..."
                    value={filters.query}
                    onChange={(e) => setFilters({ ...filters, query: e.target.value })}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="part-of-speech">Nature grammaticale</Label>
                <Select
                  value={filters.partOfSpeech}
                  onValueChange={(value) => setFilters({ ...filters, partOfSpeech: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Toutes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes</SelectItem>
                    {partsOfSpeech.map(pos => (
                      <SelectItem key={pos} value={pos}>{pos}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="has-tones">Pattern de tons</Label>
                <Select
                  value={filters.hasTones}
                  onValueChange={(value) => setFilters({ ...filters, hasTones: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Tous" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous</SelectItem>
                    <SelectItem value="yes">Avec tons</SelectItem>
                    <SelectItem value="no">Sans tons</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>

            {/* Onglet Filtres nominaux */}
            <TabsContent value="nominal" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nominal-class">Classe nominale</Label>
                <Select
                  value={filters.nominalClass}
                  onValueChange={(value) => setFilters({ ...filters, nominalClass: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Toutes les classes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes</SelectItem>
                    {nominalClasses.map(cls => (
                      <SelectItem key={cls} value={cls}>
                        Classe {cls}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="bg-muted p-4 rounded-lg">
                <h4 className="font-medium mb-2">Classes nominales Baatɔnum</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><Badge variant="outline">b</Badge> - Classe b (be/bi)</div>
                  <div><Badge variant="outline">g</Badge> - Classe g (ge/gi)</div>
                  <div><Badge variant="outline">m</Badge> - Classe m (me/mi)</div>
                  <div><Badge variant="outline">n</Badge> - Classe n (ne/ni)</div>
                  <div><Badge variant="outline">s</Badge> - Classe s (se/si)</div>
                  <div><Badge variant="outline">t</Badge> - Classe t (te/ni)</div>
                  <div><Badge variant="outline">w</Badge> - Classe w (we/wi)</div>
                  <div><Badge variant="outline">y</Badge> - Classe y (ye/yi)</div>
                </div>
              </div>
            </TabsContent>

            {/* Onglet Filtres verbaux */}
            <TabsContent value="verbal" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="verbal-group">Groupe verbal</Label>
                <Select
                  value={filters.verbalGroup}
                  onValueChange={(value) => setFilters({ ...filters, verbalGroup: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Tous les groupes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous</SelectItem>
                    {verbalGroups.map(group => (
                      <SelectItem key={group} value={group}>
                        Groupe {group}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="verb-type">Type de verbe</Label>
                <Select
                  value={filters.verbType}
                  onValueChange={(value) => setFilters({ ...filters, verbType: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Tous les types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous</SelectItem>
                    {verbTypes.map(type => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="bg-muted p-4 rounded-lg">
                <h4 className="font-medium mb-2">Types de verbes</h4>
                <div className="space-y-1 text-sm">
                  <div><Badge variant="outline">v.tr</Badge> - Verbe transitif</div>
                  <div><Badge variant="outline">v.int</Badge> - Verbe intransitif</div>
                  <div><Badge variant="outline">vd</Badge> - Verbe dérivé</div>
                  <div><Badge variant="outline">veq</Badge> - Verbe de qualité/état</div>
                  <div><Badge variant="outline">v.inv</Badge> - Verbe invariable</div>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex items-center justify-between pt-4 border-t">
            <div className="flex items-center gap-2">
              <SortAsc className="h-4 w-4 text-muted-foreground" />
              <Label>Tri alphabétique:</Label>
              <Select value={sortOrder} onValueChange={(v: any) => setSortOrder(v)}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="baatonum">Baatɔnum</SelectItem>
                  <SelectItem value="french">Français</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button onClick={searchWithFilters} disabled={isLoading}>
              {isLoading ? (
                <>Recherche en cours...</>
              ) : (
                <>
                  <Search className="mr-2 h-4 w-4" />
                  Rechercher
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Résultats */}
      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>
              {results.length} résultat{results.length > 1 ? 's' : ''}
            </CardTitle>
            <CardDescription>
              Triés par ordre alphabétique {sortOrder === 'baatonum' ? 'Baatɔnum' : 'français'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {sortedResults.map((entry) => (
                <DictionaryEntry key={entry.id} entry={entry} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {!isLoading && results.length === 0 && activeFiltersCount > 0 && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Aucun résultat trouvé pour ces filtres
          </CardContent>
        </Card>
      )}
    </div>
  );
}