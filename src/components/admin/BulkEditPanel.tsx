import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Filter, Edit, CheckCircle, AlertCircle } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface BulkEditFilters {
  nominalClass?: string;
  verbalGroup?: string;
  verbType?: string;
  partOfSpeech?: string;
  missingField?: string;
}

interface BulkUpdate {
  field: string;
  value: any;
}

export default function BulkEditPanel() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [filters, setFilters] = useState<BulkEditFilters>({});
  const [matchedEntries, setMatchedEntries] = useState<any[]>([]);
  const [selectedEntries, setSelectedEntries] = useState<Set<string>>(new Set());
  const [bulkUpdates, setBulkUpdates] = useState<BulkUpdate[]>([]);

  const nominalClasses = ['b', 'g', 'm', 'n', 's', 't', 'w', 'y'];
  const verbalGroups = ['1', '2', '3', '4', '5'];
  const verbTypes = ['v.tr', 'v.int', 'vd', 'veq', 'v.inv', 'v.stat', 'lv'];

  // Champs qui peuvent manquer
  const missingFields = [
    { value: 'nominal_class', label: 'Classe nominale manquante' },
    { value: 'verb_root', label: 'Racine verbale manquante' },
    { value: 'tone_pattern', label: 'Pattern de tons manquant' },
    { value: 'plural_form', label: 'Forme plurielle manquante' },
    { value: 'accomplished_form', label: 'Forme accomplie manquante' }
  ];

  // Rechercher les entrées correspondant aux filtres
  const searchEntries = async () => {
    setIsLoading(true);
    try {
      let query = supabase.from('dictionary_entries').select('*');

      // Appliquer les filtres
      if (filters.nominalClass) {
        query = query.eq('nominal_class', filters.nominalClass);
      }
      if (filters.verbalGroup) {
        query = query.eq('verbal_group', parseInt(filters.verbalGroup));
      }
      if (filters.verbType) {
        query = query.ilike('verb_type', `%${filters.verbType}%`);
      }
      if (filters.partOfSpeech) {
        query = query.ilike('part_of_speech', `%${filters.partOfSpeech}%`);
      }
      if (filters.missingField) {
        query = query.is(filters.missingField, null);
      }

      const { data, error } = await query.limit(100);

      if (error) throw error;

      setMatchedEntries(data || []);
      setSelectedEntries(new Set());

      toast({
        title: 'Recherche terminée',
        description: `${data?.length || 0} entrée(s) trouvée(s)`
      });
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Sélectionner/désélectionner toutes les entrées
  const toggleSelectAll = () => {
    if (selectedEntries.size === matchedEntries.length) {
      setSelectedEntries(new Set());
    } else {
      setSelectedEntries(new Set(matchedEntries.map(e => e.id)));
    }
  };

  // Sélectionner/désélectionner une entrée
  const toggleSelectEntry = (id: string) => {
    const newSelected = new Set(selectedEntries);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedEntries(newSelected);
  };

  // Ajouter une mise à jour en masse
  const addBulkUpdate = (field: string, value: any) => {
    setBulkUpdates(prev => {
      const filtered = prev.filter(u => u.field !== field);
      return [...filtered, { field, value }];
    });
  };

  // Retirer une mise à jour
  const removeBulkUpdate = (field: string) => {
    setBulkUpdates(prev => prev.filter(u => u.field !== field));
  };

  // Appliquer les mises à jour en masse
  const applyBulkUpdates = async () => {
    if (selectedEntries.size === 0 || bulkUpdates.length === 0) {
      toast({
        title: 'Attention',
        description: 'Sélectionnez des entrées et définissez des mises à jour',
        variant: 'destructive'
      });
      return;
    }

    setIsLoading(true);
    try {
      // Préparer l'objet de mise à jour
      const updateData: any = {};
      bulkUpdates.forEach(({ field, value }) => {
        updateData[field] = value;
      });
      updateData.updated_at = new Date().toISOString();

      // Mettre à jour toutes les entrées sélectionnées
      const { error } = await supabase
        .from('dictionary_entries')
        .update(updateData)
        .in('id', Array.from(selectedEntries));

      if (error) throw error;

      toast({
        title: 'Succès',
        description: `${selectedEntries.size} entrée(s) mise(s) à jour`
      });

      // Rafraîchir la recherche
      await searchEntries();
      setBulkUpdates([]);
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Édition en Masse</CardTitle>
          <CardDescription>
            Filtrez les entrées et appliquez des modifications groupées
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="filter">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="filter">
                <Filter className="mr-2 h-4 w-4" />
                Filtrer
              </TabsTrigger>
              <TabsTrigger value="edit">
                <Edit className="mr-2 h-4 w-4" />
                Modifier
              </TabsTrigger>
              <TabsTrigger value="preview">
                <CheckCircle className="mr-2 h-4 w-4" />
                Aperçu ({selectedEntries.size})
              </TabsTrigger>
            </TabsList>

            {/* Onglet Filtres */}
            <TabsContent value="filter" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Classe nominale</Label>
                  <Select
                    value={filters.nominalClass}
                    onValueChange={(value) => setFilters({ ...filters, nominalClass: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Toutes" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Toutes</SelectItem>
                      {nominalClasses.map(cls => (
                        <SelectItem key={cls} value={cls}>Classe {cls}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Groupe verbal</Label>
                  <Select
                    value={filters.verbalGroup}
                    onValueChange={(value) => setFilters({ ...filters, verbalGroup: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Tous" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Tous</SelectItem>
                      {verbalGroups.map(group => (
                        <SelectItem key={group} value={group}>Groupe {group}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Type de verbe</Label>
                  <Select
                    value={filters.verbType}
                    onValueChange={(value) => setFilters({ ...filters, verbType: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Tous" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Tous</SelectItem>
                      {verbTypes.map(type => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Champ manquant</Label>
                  <Select
                    value={filters.missingField}
                    onValueChange={(value) => setFilters({ ...filters, missingField: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Aucun" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Aucun</SelectItem>
                      {missingFields.map(field => (
                        <SelectItem key={field.value} value={field.value}>
                          {field.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button onClick={searchEntries} disabled={isLoading} className="w-full">
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Recherche...
                  </>
                ) : (
                  <>
                    <Filter className="mr-2 h-4 w-4" />
                    Rechercher ({matchedEntries.length} trouvées)
                  </>
                )}
              </Button>
            </TabsContent>

            {/* Onglet Modifications */}
            <TabsContent value="edit" className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <Select onValueChange={(field) => {
                    const value = field === 'nominal_class' ? 'b' : field === 'verbal_group' ? '1' : '';
                    addBulkUpdate(field, value);
                  }}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Sélectionner un champ à modifier..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="nominal_class">Classe nominale</SelectItem>
                      <SelectItem value="verbal_group">Groupe verbal</SelectItem>
                      <SelectItem value="verb_type">Type de verbe</SelectItem>
                      <SelectItem value="tone_pattern">Pattern de tons</SelectItem>
                      <SelectItem value="is_main_entry">Entrée principale</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {bulkUpdates.length > 0 && (
                  <div className="space-y-3">
                    <Label>Modifications programmées :</Label>
                    {bulkUpdates.map(({ field, value }) => (
                      <div key={field} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <div>
                          <Badge variant="outline" className="mb-1">{field}</Badge>
                          <p className="text-sm">→ {String(value)}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeBulkUpdate(field)}
                        >
                          Retirer
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                <Button
                  onClick={applyBulkUpdates}
                  disabled={isLoading || selectedEntries.size === 0 || bulkUpdates.length === 0}
                  className="w-full"
                  variant="default"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Application...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Appliquer à {selectedEntries.size} entrée(s)
                    </>
                  )}
                </Button>
              </div>
            </TabsContent>

            {/* Onglet Aperçu */}
            <TabsContent value="preview" className="space-y-4">
              {matchedEntries.length > 0 ? (
                <>
                  <div className="flex items-center justify-between">
                    <Label>Entrées trouvées : {matchedEntries.length}</Label>
                    <Button variant="outline" size="sm" onClick={toggleSelectAll}>
                      {selectedEntries.size === matchedEntries.length ? 'Tout désélectionner' : 'Tout sélectionner'}
                    </Button>
                  </div>

                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {matchedEntries.map((entry) => (
                      <div
                        key={entry.id}
                        className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                          selectedEntries.has(entry.id) ? 'bg-primary/5 border-primary' : 'hover:bg-muted'
                        }`}
                        onClick={() => toggleSelectEntry(entry.id)}
                      >
                        <Checkbox
                          checked={selectedEntries.has(entry.id)}
                          onCheckedChange={() => toggleSelectEntry(entry.id)}
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold">{entry.word}</span>
                            {entry.part_of_speech && (
                              <Badge variant="secondary" className="text-xs">
                                {entry.part_of_speech}
                              </Badge>
                            )}
                            {entry.nominal_class && (
                              <Badge variant="outline" className="text-xs">
                                Classe {entry.nominal_class}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">{entry.definition}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertCircle className="mx-auto h-12 w-12 mb-4" />
                  <p>Aucune entrée trouvée</p>
                  <p className="text-sm mt-2">Ajustez vos filtres dans l'onglet "Filtrer"</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}