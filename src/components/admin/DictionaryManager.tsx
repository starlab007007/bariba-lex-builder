import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Search, Download, Upload } from 'lucide-react';
import DictionaryEntryForm from './DictionaryEntryForm';
import DictionaryJsonImporter from './DictionaryJsonImporter';
import { useToast } from '@/hooks/use-toast';

export default function DictionaryManager() {
  const [searchQuery, setSearchQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showImporter, setShowImporter] = useState(false);
  const { toast } = useToast();

  const { data: entries, isLoading, refetch } = useQuery({
    queryKey: ['dictionary-entries', searchQuery],
    queryFn: async () => {
      let query = supabase
        .from('dictionary_entries')
        .select('*')
        .order('word', { ascending: true });

      if (searchQuery) {
        query = query.or(`word.ilike.%${searchQuery}%,definition.ilike.%${searchQuery}%`);
      }

      const { data, error } = await query.limit(50);
      if (error) throw error;
      return data;
    },
  });

  const handleExport = async () => {
    const { data, error } = await supabase
      .from('dictionary_entries')
      .select('*')
      .order('word', { ascending: true });

    if (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible d\'exporter le dictionnaire',
        variant: 'destructive',
      });
      return;
    }

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dictionnaire-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: 'Export réussi',
      description: `${data.length} entrées exportées`,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Gestion du Dictionnaire</h2>
          <p className="text-muted-foreground">
            {entries?.length || 0} entrées disponibles
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            Exporter
          </Button>
          <Button variant="outline" onClick={() => setShowImporter(true)}>
            <Upload className="mr-2 h-4 w-4" />
            Importer JSON
          </Button>
          <Button onClick={() => setShowForm(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Ajouter
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Rechercher un mot..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Chargement...</div>
          ) : entries && entries.length > 0 ? (
            <div className="space-y-2">
              {entries.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="font-semibold">{entry.word}</div>
                    <div className="text-sm text-muted-foreground">
                      {entry.definition.substring(0, 100)}
                      {entry.definition.length > 100 && '...'}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-1 bg-primary/10 rounded">
                      Score: {entry.quality_score}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Aucune entrée trouvée
            </div>
          )}
        </CardContent>
      </Card>

      {showForm && (
        <DictionaryEntryForm
          onClose={() => {
            setShowForm(false);
            refetch();
          }}
        />
      )}

      {showImporter && (
        <DictionaryJsonImporter
          onClose={() => setShowImporter(false)}
          onSuccess={() => {
            setShowImporter(false);
            refetch();
          }}
        />
      )}
    </div>
  );
}
