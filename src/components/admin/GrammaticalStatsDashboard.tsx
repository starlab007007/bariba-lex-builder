import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { Book, Brain, Tag, TrendingUp, AlertCircle } from 'lucide-react';

interface GrammaticalStats {
  total: number;
  enriched: number;
  nominalClasses: Record<string, number>;
  verbalGroups: Record<string, number>;
  verbTypes: Record<string, number>;
  withTones: number;
  withPluralForms: number;
  withVerbForms: number;
  mainEntries: number;
  references: number;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#ff7c7c'];

export default function GrammaticalStatsDashboard() {
  const [stats, setStats] = useState<GrammaticalStats>({
    total: 0,
    enriched: 0,
    nominalClasses: {},
    verbalGroups: {},
    verbTypes: {},
    withTones: 0,
    withPluralForms: 0,
    withVerbForms: 0,
    mainEntries: 0,
    references: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStatistics();
  }, []);

  const loadStatistics = async () => {
    setIsLoading(true);
    try {
      // Récupérer toutes les entrées
      const { data: entries, error } = await supabase
        .from('dictionary_entries')
        .select('*');

      if (error) throw error;
      if (!entries) return;

      // Calculer les statistiques
      const newStats: GrammaticalStats = {
        total: entries.length,
        enriched: 0,
        nominalClasses: {},
        verbalGroups: {},
        verbTypes: {},
        withTones: 0,
        withPluralForms: 0,
        withVerbForms: 0,
        mainEntries: 0,
        references: 0
      };

      entries.forEach(entry => {
        // Compter les entrées enrichies
        if (entry.nominal_class || entry.verb_root || entry.tone_pattern) {
          newStats.enriched++;
        }

        // Classes nominales
        if (entry.nominal_class) {
          newStats.nominalClasses[entry.nominal_class] = 
            (newStats.nominalClasses[entry.nominal_class] || 0) + 1;
        }

        // Groupes verbaux
        if (entry.verbal_group) {
          const group = `Groupe ${entry.verbal_group}`;
          newStats.verbalGroups[group] = 
            (newStats.verbalGroups[group] || 0) + 1;
        }

        // Types de verbes
        if (entry.verb_type) {
          newStats.verbTypes[entry.verb_type] = 
            (newStats.verbTypes[entry.verb_type] || 0) + 1;
        }

        // Autres statistiques
        if (entry.tone_pattern) newStats.withTones++;
        if (entry.plural_form) newStats.withPluralForms++;
        if (entry.verb_root) newStats.withVerbForms++;
        if (entry.is_main_entry !== false) newStats.mainEntries++;
        if (entry.cross_reference) newStats.references++;
      });

      setStats(newStats);
    } catch (error) {
      console.error('Erreur lors du chargement des statistiques:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Préparer les données pour les graphiques
  const nominalClassData = Object.entries(stats.nominalClasses).map(([key, value]) => ({
    name: `Classe ${key}`,
    count: value
  }));

  const verbalGroupData = Object.entries(stats.verbalGroups).map(([key, value]) => ({
    name: key,
    count: value
  }));

  const verbTypeData = Object.entries(stats.verbTypes).map(([key, value]) => ({
    name: key,
    count: value
  }));

  const enrichmentRate = stats.total > 0 ? (stats.enriched / stats.total) * 100 : 0;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">Chargement des statistiques...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Vue d'ensemble */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Entrées</CardTitle>
            <Book className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">
              {stats.mainEntries} principales, {stats.references} références
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Enrichies</CardTitle>
            <Brain className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.enriched}</div>
            <Progress value={enrichmentRate} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {enrichmentRate.toFixed(1)}% du dictionnaire
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avec Tons</CardTitle>
            <Tag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.withTones}</div>
            <p className="text-xs text-muted-foreground">
              {((stats.withTones / stats.total) * 100).toFixed(1)}% du total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Formes Verbales</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.withVerbForms}</div>
            <p className="text-xs text-muted-foreground">
              Racines, radicaux, formes accomplies
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Graphiques détaillés */}
      <Tabs defaultValue="nominal" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="nominal">Classes Nominales</TabsTrigger>
          <TabsTrigger value="verbal">Groupes Verbaux</TabsTrigger>
          <TabsTrigger value="types">Types de Verbes</TabsTrigger>
        </TabsList>

        <TabsContent value="nominal" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Distribution des Classes Nominales</CardTitle>
              <CardDescription>
                Répartition des {Object.values(stats.nominalClasses).reduce((a, b) => a + b, 0)} entrées nominales par classe
              </CardDescription>
            </CardHeader>
            <CardContent>
              {nominalClassData.length > 0 ? (
                <div className="space-y-4">
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={nominalClassData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="count" fill="#8884d8" name="Nombre d'entrées" />
                    </BarChart>
                  </ResponsiveContainer>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {Object.entries(stats.nominalClasses).map(([cls, count]) => (
                      <div key={cls} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <div>
                          <Badge variant="outline" className="mb-1">Classe {cls}</Badge>
                          <p className="text-2xl font-bold">{count}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertCircle className="mx-auto h-12 w-12 mb-4" />
                  <p>Aucune donnée de classe nominale disponible</p>
                  <p className="text-sm mt-2">Lancez l'enrichissement automatique pour générer ces données</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="verbal" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Distribution des Groupes Verbaux</CardTitle>
              <CardDescription>
                Répartition des {Object.values(stats.verbalGroups).reduce((a, b) => a + b, 0)} verbes par groupe
              </CardDescription>
            </CardHeader>
            <CardContent>
              {verbalGroupData.length > 0 ? (
                <div className="space-y-4">
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={verbalGroupData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="count"
                      >
                        {verbalGroupData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>

                  <div className="grid grid-cols-5 gap-3">
                    {Object.entries(stats.verbalGroups).map(([group, count]) => (
                      <div key={group} className="text-center p-3 bg-muted rounded-lg">
                        <p className="text-sm font-medium">{group}</p>
                        <p className="text-2xl font-bold mt-1">{count}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertCircle className="mx-auto h-12 w-12 mb-4" />
                  <p>Aucune donnée de groupe verbal disponible</p>
                  <p className="text-sm mt-2">Lancez l'enrichissement automatique pour générer ces données</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="types" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Types de Verbes</CardTitle>
              <CardDescription>
                Distribution des {Object.values(stats.verbTypes).reduce((a, b) => a + b, 0)} verbes par type
              </CardDescription>
            </CardHeader>
            <CardContent>
              {verbTypeData.length > 0 ? (
                <div className="space-y-4">
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={verbTypeData} layout="horizontal">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="name" type="category" width={100} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="count" fill="#82ca9d" name="Nombre" />
                    </BarChart>
                  </ResponsiveContainer>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {Object.entries(stats.verbTypes).map(([type, count]) => (
                      <div key={type} className="p-3 bg-muted rounded-lg">
                        <Badge variant="outline" className="mb-2">{type}</Badge>
                        <p className="text-xl font-bold">{count}</p>
                        <p className="text-xs text-muted-foreground">
                          {((count / stats.withVerbForms) * 100).toFixed(1)}% des verbes
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertCircle className="mx-auto h-12 w-12 mb-4" />
                  <p>Aucune donnée de type verbal disponible</p>
                  <p className="text-sm mt-2">Lancez l'enrichissement automatique pour générer ces données</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Recommandations */}
      <Card>
        <CardHeader>
          <CardTitle>Recommandations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {enrichmentRate < 50 && (
              <div className="flex items-start gap-3 p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg">
                <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div>
                  <p className="font-medium text-yellow-900 dark:text-yellow-100">
                    Taux d'enrichissement faible ({enrichmentRate.toFixed(1)}%)
                  </p>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                    Lancez l'enrichissement automatique pour extraire les informations grammaticales
                  </p>
                </div>
              </div>
            )}

            {stats.withTones < stats.total * 0.3 && (
              <div className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="font-medium text-blue-900 dark:text-blue-100">
                    Peu de patterns de tons ({stats.withTones} entrées)
                  </p>
                  <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                    Ajoutez les patterns de tons pour améliorer la prononciation
                  </p>
                </div>
              </div>
            )}

            {enrichmentRate >= 80 && (
              <div className="flex items-start gap-3 p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                <TrendingUp className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <p className="font-medium text-green-900 dark:text-green-100">
                    Excellent taux d'enrichissement ! ({enrichmentRate.toFixed(1)}%)
                  </p>
                  <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                    Le dictionnaire est bien structuré et prêt pour des traductions avancées
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}