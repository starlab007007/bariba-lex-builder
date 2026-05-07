import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BookOpen, MessageSquare, TrendingUp, Users } from 'lucide-react';

export default function AdminOverview() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const [dictCount, phrasesCount, logsCount] = await Promise.all([
        supabase.from('dictionary_entries').select('*', { count: 'exact', head: true }),
        supabase.from('training_phrases').select('*', { count: 'exact', head: true }),
        supabase.from('translation_logs').select('*', { count: 'exact', head: true }),
      ]);

      return {
        dictionaryEntries: dictCount.count || 0,
        trainingPhrases: phrasesCount.count || 0,
        totalTranslations: logsCount.count || 0,
      };
    },
  });

  const statCards = [
    {
      title: 'Entrées du Dictionnaire',
      value: stats?.dictionaryEntries || 0,
      icon: BookOpen,
      description: 'Mots dans la base',
    },
    {
      title: 'Phrases d\'Entraînement',
      value: stats?.trainingPhrases || 0,
      icon: MessageSquare,
      description: 'Phrases validées',
    },
    {
      title: 'Traductions Effectuées',
      value: stats?.totalTranslations || 0,
      icon: TrendingUp,
      description: 'Total des traductions',
    },
    {
      title: 'Utilisateurs Actifs',
      value: 0,
      icon: Users,
      description: 'Ce mois-ci',
    },
  ];

  if (isLoading) {
    return <div className="text-center py-8">Chargement des statistiques...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Vue d'ensemble</h2>
        <p className="text-muted-foreground">
          Statistiques et aperçu de la plateforme
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">{stat.description}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Activité Récente</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Les dernières activités du système apparaîtront ici.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
