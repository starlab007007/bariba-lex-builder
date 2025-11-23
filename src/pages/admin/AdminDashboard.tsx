import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import AdminOverview from '@/components/admin/AdminOverview';
import DictionaryManager from '@/components/admin/DictionaryManager';
import TrainingManager from '@/components/admin/TrainingManager';
import AnalyticsDashboard from '@/components/admin/AnalyticsDashboard';
import UserRoleManager from '@/components/admin/UserRoleManager';
import AdminSettings from '@/components/admin/AdminSettings';
import ModelTestingPanel from '@/components/admin/ModelTestingPanel';
import TranslationComparisonDashboard from '@/components/admin/TranslationComparisonDashboard';
import { TranslationDiagnosticDashboard } from '@/components/admin/TranslationDiagnosticDashboard';
import GrammaticalStatsDashboard from '@/components/admin/GrammaticalStatsDashboard';
import ModelTrainingPanel from '@/components/admin/ModelTrainingPanel';
import { ModelTrainingDashboard } from '@/components/admin/ModelTrainingDashboard';
import DictionaryExporter from '@/components/admin/DictionaryExporter';
import { NLLB200FineTuningPanel } from '@/components/admin/NLLB200FineTuningPanel';
import { FreeFineTuningGuide } from '@/components/admin/FreeFineTuningGuide';
import { HybridTranslationTester } from '@/components/admin/HybridTranslationTester';
import ModelPerformanceDashboard from '@/components/admin/ModelPerformanceDashboard';
import TrainingAnalytics from '@/components/admin/TrainingAnalytics';
import AutoEnrichPanel from '@/components/admin/AutoEnrichPanel';
import QualityMetricsDashboard from '@/components/admin/QualityMetricsDashboard';
import BulkEditPanel from '@/components/admin/BulkEditPanel';
import { IdiomManager } from '@/components/admin/IdiomManager';
import UnifiedDataManager from '@/components/admin/UnifiedDataManager';
import { SMTSystemDashboard } from '@/components/admin/SMTSystemDashboard';
import { SMTABTestingPanel } from '@/components/admin/SMTABTestingPanel';
import SystemAuditReport from '@/components/admin/SystemAuditReport';
import { 
  Settings, Users, BarChart3, Database, 
  FileText, Brain, TestTube2, Globe, 
  BookOpen, TrendingUp, 
  Sparkles, Zap, Shield, Target, 
  Activity, Download, Edit3
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
              <TabsTrigger value="unified-data" className="flex items-center gap-2 border-l-2 border-[hsl(var(--section-data))]">
                <Database className="h-4 w-4 text-[hsl(var(--section-data))]" />
                Gestion Unifiée
              </TabsTrigger>
              <TabsTrigger value="smt-monitoring" className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-[hsl(var(--section-data))]" />
                Monitoring SMT
              </TabsTrigger>
              <TabsTrigger value="dictionary" className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-[hsl(var(--section-data))]" />
                Dictionnaire
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
              <TabsTrigger value="smt-ab-test" className="flex items-center gap-2 border-l-2 border-[hsl(var(--section-tests))]">
                <TestTube2 className="h-4 w-4 text-[hsl(var(--section-tests))]" />
                Test A/B SMT
              </TabsTrigger>
              <TabsTrigger value="model-testing" className="flex items-center gap-2">
                <TestTube2 className="h-4 w-4 text-[hsl(var(--section-tests))]" />
                Test Modèle
              </TabsTrigger>
              <TabsTrigger value="hybrid-test" className="flex items-center gap-2">
                <TestTube2 className="h-4 w-4 text-[hsl(var(--section-tests))]" />
                Test Hybride
              </TabsTrigger>
              <TabsTrigger value="quality" className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-[hsl(var(--section-tests))]" />
                Qualité
              </TabsTrigger>
              <TabsTrigger value="audit" className="flex items-center gap-2">
                <Target className="h-4 w-4 text-[hsl(var(--section-tests))]" />
                Audit Système
              </TabsTrigger>

              {/* 🤖 SECTION IA & ENTRAÎNEMENT */}
              <div className="flex items-center gap-1 w-full mt-2">
                <Separator className="flex-1" />
                <span className="text-xs font-semibold text-[hsl(var(--section-ai))] px-2 whitespace-nowrap">🤖 IA & ENTRAÎNEMENT</span>
                <Separator className="flex-1" />
              </div>
              <TabsTrigger value="training" className="flex items-center gap-2 border-l-2 border-[hsl(var(--section-ai))]">
                <Brain className="h-4 w-4 text-[hsl(var(--section-ai))]" />
                Entraînement
              </TabsTrigger>
              <TabsTrigger value="fine-tuning" className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-[hsl(var(--section-ai))]" />
                Fine-Tuning
              </TabsTrigger>
              <TabsTrigger value="nllb" className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-[hsl(var(--section-ai))]" />
                NLLB-200
              </TabsTrigger>
              <TabsTrigger value="free-tuning" className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-[hsl(var(--section-ai))]" />
                Fine-Tuning GRATUIT
              </TabsTrigger>
              <TabsTrigger value="auto-enrich" className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-[hsl(var(--section-ai))]" />
                Auto-Enrichissement
              </TabsTrigger>

              {/* 📈 SECTION ANALYTICS & PERFORMANCE */}
              <div className="flex items-center gap-1 w-full mt-2">
                <Separator className="flex-1" />
                <span className="text-xs font-semibold text-[hsl(var(--section-analytics))] px-2 whitespace-nowrap">📈 ANALYTICS</span>
                <Separator className="flex-1" />
              </div>
              <TabsTrigger value="analytics" className="flex items-center gap-2 border-l-2 border-[hsl(var(--section-analytics))]">
                <BarChart3 className="h-4 w-4 text-[hsl(var(--section-analytics))]" />
                Analytics
              </TabsTrigger>
              <TabsTrigger value="model-performance" className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-[hsl(var(--section-analytics))]" />
                Performance Modèle
              </TabsTrigger>
              <TabsTrigger value="training-analytics" className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-[hsl(var(--section-analytics))]" />
                Analytics Training
              </TabsTrigger>
              <TabsTrigger value="comparison" className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-[hsl(var(--section-analytics))]" />
                Comparaison
              </TabsTrigger>
              <TabsTrigger value="diagnostic" className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-[hsl(var(--section-analytics))]" />
                Diagnostic
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
          <TabsContent value="unified-data"><UnifiedDataManager /></TabsContent>
          <TabsContent value="smt-monitoring"><SMTSystemDashboard /></TabsContent>
          <TabsContent value="dictionary"><DictionaryManager /></TabsContent>
          <TabsContent value="idioms"><IdiomManager /></TabsContent>
          
          <TabsContent value="smt-ab-test"><SMTABTestingPanel /></TabsContent>
          <TabsContent value="model-testing"><ModelTestingPanel /></TabsContent>
          <TabsContent value="hybrid-test"><HybridTranslationTester /></TabsContent>
          <TabsContent value="quality"><QualityMetricsDashboard /></TabsContent>
          <TabsContent value="audit"><SystemAuditReport /></TabsContent>
          
          <TabsContent value="training">
            <div className="space-y-4">
              <TrainingManager />
              <ModelTrainingPanel />
            </div>
          </TabsContent>
          <TabsContent value="fine-tuning"><ModelTrainingDashboard /></TabsContent>
          <TabsContent value="nllb"><NLLB200FineTuningPanel /></TabsContent>
          <TabsContent value="free-tuning"><FreeFineTuningGuide /></TabsContent>
          <TabsContent value="auto-enrich"><AutoEnrichPanel /></TabsContent>
          
          <TabsContent value="analytics"><AnalyticsDashboard /></TabsContent>
          <TabsContent value="model-performance"><ModelPerformanceDashboard /></TabsContent>
          <TabsContent value="training-analytics"><TrainingAnalytics /></TabsContent>
          <TabsContent value="comparison"><TranslationComparisonDashboard /></TabsContent>
          <TabsContent value="diagnostic"><TranslationDiagnosticDashboard /></TabsContent>
          
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
