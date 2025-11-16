import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  LayoutDashboard, 
  BookOpen, 
  Brain, 
  BarChart3, 
  Settings, 
  LogOut 
} from 'lucide-react';
import AdminOverview from '@/components/admin/AdminOverview';
import DictionaryManager from '@/components/admin/DictionaryManager';
import TrainingManager from '@/components/admin/TrainingManager';
import AnalyticsDashboard from '@/components/admin/AnalyticsDashboard';
import AdminSettings from '@/components/admin/AdminSettings';

export default function AdminDashboard() {
  const { signOut, user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Administration</h1>
              <p className="text-sm text-muted-foreground">
                Dictionnaire Bààtɔ̀nú - {user?.email}
              </p>
            </div>
            <Button onClick={signOut} variant="outline" size="sm">
              <LogOut className="mr-2 h-4 w-4" />
              Déconnexion
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-grid">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <LayoutDashboard className="h-4 w-4" />
              <span className="hidden sm:inline">Vue d'ensemble</span>
            </TabsTrigger>
            <TabsTrigger value="dictionary" className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              <span className="hidden sm:inline">Dictionnaire</span>
            </TabsTrigger>
            <TabsTrigger value="training" className="flex items-center gap-2">
              <Brain className="h-4 w-4" />
              <span className="hidden sm:inline">Entraînement</span>
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Analytics</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Paramètres</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <AdminOverview />
          </TabsContent>

          <TabsContent value="dictionary" className="space-y-4">
            <DictionaryManager />
          </TabsContent>

          <TabsContent value="training" className="space-y-4">
            <TrainingManager />
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            <AnalyticsDashboard />
          </TabsContent>

          <TabsContent value="settings" className="space-y-4">
            <AdminSettings />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
