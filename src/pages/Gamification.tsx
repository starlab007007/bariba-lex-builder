import { UserBadges } from "@/components/UserBadges";
import { Leaderboard } from "@/components/Leaderboard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, Award } from "lucide-react";

const Gamification = () => {
  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="container max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
            <Trophy className="h-8 w-8 text-primary" />
            Gamification & Récompenses
          </h1>
          <p className="text-muted-foreground">
            Gagnez des points, débloquez des badges et grimpez dans le classement!
          </p>
        </div>

        <Tabs defaultValue="badges" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="badges" className="flex items-center gap-2">
              <Award className="h-4 w-4" />
              Mes Badges
            </TabsTrigger>
            <TabsTrigger value="leaderboard" className="flex items-center gap-2">
              <Trophy className="h-4 w-4" />
              Classement
            </TabsTrigger>
          </TabsList>

          <TabsContent value="badges">
            <UserBadges />
          </TabsContent>

          <TabsContent value="leaderboard">
            <Leaderboard />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Gamification;
