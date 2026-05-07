import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Trophy, Award, Star } from "lucide-react";
import { useGamification } from "@/hooks/useGamification";

const tierColors = {
  bronze: "bg-amber-700 text-white",
  silver: "bg-slate-400 text-white",
  gold: "bg-yellow-500 text-white",
  platinum: "bg-purple-600 text-white",
};

const tierIcons = {
  bronze: "🥉",
  silver: "🥈",
  gold: "🥇",
  platinum: "💎",
};

export const UserBadges = () => {
  const { achievement, userBadges, loading } = useGamification();

  if (loading) {
    return <div className="text-center py-8">Chargement...</div>;
  }

  if (!achievement) {
    return null;
  }

  const levelProgress = achievement.level < 5 
    ? ((achievement.total_points % 200) / 200) * 100
    : ((achievement.total_points % 200) / 200) * 100;

  const nextLevelPoints = achievement.level === 1 ? 100 
    : achievement.level === 2 ? 300
    : achievement.level === 3 ? 600
    : achievement.level === 4 ? 1000
    : (achievement.level * 200);

  return (
    <div className="space-y-6">
      {/* User Stats Card */}
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-primary" />
            Niveau {achievement.level}
          </CardTitle>
          <CardDescription>
            {achievement.total_points} points • Prochain niveau: {nextLevelPoints} points
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Progress value={levelProgress} className="h-3" />
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{achievement.phrases_contributed}</div>
              <div className="text-sm text-muted-foreground">Phrases contribuées</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{achievement.phrases_validated}</div>
              <div className="text-sm text-muted-foreground">Phrases validées</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{achievement.translations_made}</div>
              <div className="text-sm text-muted-foreground">Traductions</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{achievement.feedback_given}</div>
              <div className="text-sm text-muted-foreground">Feedbacks</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Badges Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            Badges Débloqués ({userBadges.length})
          </CardTitle>
          <CardDescription>
            Continuez à contribuer pour débloquer plus de badges!
          </CardDescription>
        </CardHeader>
        <CardContent>
          {userBadges.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Award className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Aucun badge débloqué pour le moment.</p>
              <p className="text-sm mt-1">Commencez à contribuer pour gagner vos premiers badges!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {userBadges.map((userBadge) => (
                <div
                  key={userBadge.id}
                  className="flex items-start gap-3 p-4 rounded-lg border bg-card hover:bg-accent/5 transition-colors"
                >
                  <div className="text-4xl">{userBadge.badges.icon}</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold">{userBadge.badges.name}</h3>
                      <Badge className={tierColors[userBadge.badges.tier as keyof typeof tierColors]}>
                        {tierIcons[userBadge.badges.tier as keyof typeof tierIcons]} {userBadge.badges.tier}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      {userBadge.badges.description}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      +{userBadge.badges.points_reward} points
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
