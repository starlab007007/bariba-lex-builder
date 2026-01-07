import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import AdminOverview from '@/components/admin/AdminOverview';
import DictionaryManager from '@/components/admin/DictionaryManager';
import AnalyticsDashboard from '@/components/admin/AnalyticsDashboard';
import UserRoleManager from '@/components/admin/UserRoleManager';
import AdminSettings from '@/components/admin/AdminSettings';
import { TranslationDiagnosticDashboard } from '@/components/admin/TranslationDiagnosticDashboard';
import GrammaticalStatsDashboard from '@/components/admin/GrammaticalStatsDashboard';
import DictionaryExporter from '@/components/admin/DictionaryExporter';
import QualityMetricsDashboard from '@/components/admin/QualityMetricsDashboard';
import BulkEditPanel from '@/components/admin/BulkEditPanel';
import { IdiomManager } from '@/components/admin/IdiomManager';
import AdvancedDictionaryManager from '@/components/admin/AdvancedDictionaryManager';
import { ModelHealthDashboard } from '@/components/admin/ModelHealthDashboard';
import { ByT5SpaceConfig } from '@/components/admin/ByT5SpaceConfig';
import { AudioServicesMonitor } from '@/components/admin/AudioServicesMonitor';
import { TemplateGenerationAdmin } from '@/components/admin/TemplateGenerationAdmin';
import { 
  Settings, Users, BarChart3, 
  FileText, Globe, 
  BookOpen, 
  Sparkles, Shield, 
  Activity, Download, Edit3, Volume2, Film
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';

export default function AdminDashboard() {
  const { user, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">Admin - Dictionnaire Bààtɔ̀nú</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">{user?.email}</span>
            <Button variant="outline" size="sm" onClick={signOut}>
              Déconnexion
            </Button>
          </div>
        </div>
      </header>

      <div className="container py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div className="overflow-x-auto">
            <TabsList className="inline-flex flex-wrap h-auto gap-1 bg-muted/50 p-2 min-w-full">
              {/* 🎯 SECTION DONNÉES */}
              <div className="flex items-center gap-1 w-full">
                <Separator className="flex-1" />
                <span className="text-xs font-semibold text-[hsl(var(--section-data))] px-2 whitespace-nowrap">🎯 DONNÉES</span>
                <Separator className="flex-1" />
              </div>
              <TabsTrigger value="model-health" className="flex items-center gap-2 border-l-2 border-[hsl(var(--section-data))]">
                <Activity className="h-4 w-4 text-[hsl(var(--section-data))]" />
                Santé Modèles
              </TabsTrigger>
              <TabsTrigger value="audio-services" className="flex items-center gap-2">
                <Volume2 className="h-4 w-4 text-[hsl(var(--section-data))]" />
                Services Audio
              </TabsTrigger>
              <TabsTrigger value="dictionary" className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-[hsl(var(--section-data))]" />
                Dictionnaire
              </TabsTrigger>
              <TabsTrigger value="dictionary-advanced" className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-[hsl(var(--section-data))]" />
                Dictionnaire Avancé
              </TabsTrigger>
              <TabsTrigger value="idioms" className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-[hsl(var(--section-data))]" />
                Idiomes
              </TabsTrigger>

              {/* 🧪 SECTION TESTS & QUALITÉ */}
              <div className="flex items-center gap-1 w-full mt-2">
                <Separator className="flex-1" />
                <span className="text-xs font-semibold text-[hsl(var(--section-tests))] px-2 whitespace-nowrap">🧪 TESTS & QUALITÉ</span>
                <Separator className="flex-1" />
              </div>
              <TabsTrigger value="quality" className="flex items-center gap-2 border-l-2 border-[hsl(var(--section-tests))]">
                <Shield className="h-4 w-4 text-[hsl(var(--section-tests))]" />
                Qualité
              </TabsTrigger>
              <TabsTrigger value="diagnostic" className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-[hsl(var(--section-tests))]" />
                Diagnostic
              </TabsTrigger>

              {/* 📈 SECTION ANALYTICS */}
              <div className="flex items-center gap-1 w-full mt-2">
                <Separator className="flex-1" />
                <span className="text-xs font-semibold text-[hsl(var(--section-analytics))] px-2 whitespace-nowrap">📈 ANALYTICS</span>
                <Separator className="flex-1" />
              </div>
              <TabsTrigger value="analytics" className="flex items-center gap-2 border-l-2 border-[hsl(var(--section-analytics))]">
                <BarChart3 className="h-4 w-4 text-[hsl(var(--section-analytics))]" />
                Analytics
              </TabsTrigger>

              {/* 🎬 SECTION CRÉATION */}
              <div className="flex items-center gap-1 w-full mt-2">
                <Separator className="flex-1" />
                <span className="text-xs font-semibold text-[hsl(var(--section-creation))] px-2 whitespace-nowrap">🎬 CRÉATION</span>
                <Separator className="flex-1" />
              </div>
              <TabsTrigger value="templates-ia" className="flex items-center gap-2 border-l-2 border-[hsl(var(--section-creation))]">
                <Film className="h-4 w-4 text-[hsl(var(--section-creation))]" />
                Templates IA
              </TabsTrigger>

              {/* 🛠️ SECTION OUTILS */}
              <div className="flex items-center gap-1 w-full mt-2">
                <Separator className="flex-1" />
                <span className="text-xs font-semibold text-[hsl(var(--section-tools))] px-2 whitespace-nowrap">🛠️ OUTILS</span>
                <Separator className="flex-1" />
              </div>
              <TabsTrigger value="grammar-stats" className="flex items-center gap-2 border-l-2 border-[hsl(var(--section-tools))]">
                <BarChart3 className="h-4 w-4 text-[hsl(var(--section-tools))]" />
                Stats Grammaticales
              </TabsTrigger>
              <TabsTrigger value="bulk-edit" className="flex items-center gap-2">
                <Edit3 className="h-4 w-4 text-[hsl(var(--section-tools))]" />
                Édition Masse
              </TabsTrigger>
              <TabsTrigger value="export" className="flex items-center gap-2">
                <Download className="h-4 w-4 text-[hsl(var(--section-tools))]" />
                Export
              </TabsTrigger>

              {/* 👥 SECTION GESTION */}
              <div className="flex items-center gap-1 w-full mt-2">
                <Separator className="flex-1" />
                <span className="text-xs font-semibold text-[hsl(var(--section-management))] px-2 whitespace-nowrap">👥 GESTION</span>
                <Separator className="flex-1" />
              </div>
              <TabsTrigger value="overview" className="flex items-center gap-2 border-l-2 border-[hsl(var(--section-management))]">
                <BarChart3 className="h-4 w-4 text-[hsl(var(--section-management))]" />
                Vue d'ensemble
              </TabsTrigger>
              <TabsTrigger value="users" className="flex items-center gap-2">
                <Users className="h-4 w-4 text-[hsl(var(--section-management))]" />
                Utilisateurs
              </TabsTrigger>
              <TabsTrigger value="settings" className="flex items-center gap-2">
                <Settings className="h-4 w-4 text-[hsl(var(--section-management))]" />
                Paramètres
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Tab Contents */}
          <TabsContent value="overview"><AdminOverview /></TabsContent>
          <TabsContent value="model-health">
            <div className="space-y-6">
              <ModelHealthDashboard />
              <ByT5SpaceConfig />
            </div>
          </TabsContent>
          <TabsContent value="audio-services"><AudioServicesMonitor /></TabsContent>
          <TabsContent value="dictionary"><DictionaryManager /></TabsContent>
          <TabsContent value="dictionary-advanced"><AdvancedDictionaryManager /></TabsContent>
          <TabsContent value="idioms"><IdiomManager /></TabsContent>
          
          <TabsContent value="quality"><QualityMetricsDashboard /></TabsContent>
          <TabsContent value="diagnostic"><TranslationDiagnosticDashboard /></TabsContent>
          
          <TabsContent value="analytics"><AnalyticsDashboard /></TabsContent>
          
          <TabsContent value="templates-ia"><TemplateGenerationAdmin /></TabsContent>
          
          <TabsContent value="grammar-stats"><GrammaticalStatsDashboard /></TabsContent>
          <TabsContent value="bulk-edit"><BulkEditPanel /></TabsContent>
          <TabsContent value="export"><DictionaryExporter /></TabsContent>
          
          <TabsContent value="users"><UserRoleManager /></TabsContent>
          <TabsContent value="settings"><AdminSettings /></TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
