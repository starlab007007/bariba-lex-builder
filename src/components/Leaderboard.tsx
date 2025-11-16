import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Trophy, Medal, Award } from "lucide-react";
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface LeaderboardEntry {
  user_id: string;
  total_points: number;
  level: number;
  phrases_contributed: number;
  phrases_validated: number;
  translations_made: number;
}

export const Leaderboard = () => {
  const [topUsers, setTopUsers] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    try {
      const { data, error } = await supabase
        .from('user_achievements')
        .select('*')
        .order('total_points', { ascending: false })
        .limit(10);

      if (error) throw error;
      setTopUsers(data || []);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="h-5 w-5 text-yellow-500" />;
      case 2:
        return <Medal className="h-5 w-5 text-slate-400" />;
      case 3:
        return <Award className="h-5 w-5 text-amber-700" />;
      default:
        return <span className="text-muted-foreground font-semibold">{rank}</span>;
    }
  };

  if (loading) {
    return <div className="text-center py-8">Chargement du classement...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-primary" />
          Classement des Contributeurs
        </CardTitle>
        <CardDescription>
          Les meilleurs contributeurs de la plateforme
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">Rang</TableHead>
              <TableHead>Niveau</TableHead>
              <TableHead>Points</TableHead>
              <TableHead>Contributions</TableHead>
              <TableHead>Validations</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {topUsers.map((entry, index) => (
              <TableRow 
                key={entry.user_id}
                className={entry.user_id === user?.id ? 'bg-primary/5' : ''}
              >
                <TableCell className="flex items-center justify-center">
                  {getRankIcon(index + 1)}
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">
                    Niveau {entry.level}
                  </Badge>
                </TableCell>
                <TableCell className="font-semibold">
                  {entry.total_points.toLocaleString()} pts
                </TableCell>
                <TableCell>{entry.phrases_contributed}</TableCell>
                <TableCell>{entry.phrases_validated}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {topUsers.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            Aucun contributeur pour le moment.
          </div>
        )}
      </CardContent>
    </Card>
  );
};
