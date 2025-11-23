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
  Users,
  TrendingUp,
  LogOut,
  Upload,
  FlaskConical,
  Activity,
  Sparkles,
  GitCompare,
  Search,
  Database,
  PieChart,
  Edit3,
  Download,
  CheckCircle,
  FileSearch
} from 'lucide-react';
import AdminOverview from '@/components/admin/AdminOverview';
import DictionaryManager from '@/components/admin/DictionaryManager';
import TrainingManager from '@/components/admin/TrainingManager';
import AnalyticsDashboard from '@/components/admin/AnalyticsDashboard';
import AdminSettings from '@/components/admin/AdminSettings';
import UserRoleManager from '@/components/admin/UserRoleManager';
import TrainingAnalytics from '@/components/admin/TrainingAnalytics';
import ModelTrainingPanel from '@/components/admin/ModelTrainingPanel';
import { MassDataImporter } from '@/components/admin/MassDataImporter';
import ModelTestingPanel from '@/components/admin/ModelTestingPanel';
import ModelPerformanceDashboard from '@/components/admin/ModelPerformanceDashboard';
import TranslationComparisonDashboard from '@/components/admin/TranslationComparisonDashboard';
import TrainingDataEnhancer from '@/components/admin/TrainingDataEnhancer';
import AutoDictionaryEnricher from '@/components/admin/AutoDictionaryEnricher';
import AdvancedDictionarySearch from '@/components/AdvancedDictionarySearch';
import GrammaticalStatsDashboard from '@/components/admin/GrammaticalStatsDashboard';
import BulkEditPanel from '@/components/admin/BulkEditPanel';
import DictionaryExporter from '@/components/admin/DictionaryExporter';
import DictionaryValidator from '@/components/admin/DictionaryValidator';
import AutoEnrichPanel from '@/components/admin/AutoEnrichPanel';
import { IdiomManager } from '@/components/admin/IdiomManager';
import { FeedbackManager } from '@/components/admin/FeedbackManager';
import { ModelTrainingDashboard } from '@/components/admin/ModelTrainingDashboard';
import { NLLB200FineTuningPanel } from '@/components/admin/NLLB200FineTuningPanel';
import { FullDatasetImporter } from '@/components/admin/FullDatasetImporter';
import { IdiomImporter } from '@/components/admin/IdiomImporter';
import QualityMetricsDashboard from '@/components/admin/QualityMetricsDashboard';
import SystemAuditReport from '@/components/admin/SystemAuditReport';
import TrainingDataViewer from '@/components/admin/TrainingDataViewer';
import DictionaryDataViewer from '@/components/admin/DictionaryDataViewer';
import { CompleteIdiomImporter } from '@/components/admin/CompleteIdiomImporter';
import { HybridTranslationTester } from '@/components/admin/HybridTranslationTester';
import { DataManagementPanel } from '@/components/admin/DataManagementPanel';
import { FreeFineTuningGuide } from '@/components/admin/FreeFineTuningGuide';
import { TranslationDiagnosticDashboard } from '@/components/admin/TranslationDiagnosticDashboard';
import { ModelABTestingPanel } from '@/components/admin/ModelABTestingPanel';
import { ComprehensiveDataImporter } from '@/components/admin/ComprehensiveDataImporter';
import { SMTPerformanceMonitor } from '@/components/admin/SMTPerformanceMonitor';
import { SMTABTestingPanel } from '@/components/admin/SMTABTestingPanel';
import { SMTSystemDashboard } from '@/components/admin/SMTSystemDashboard';
import { PremiumSMTImporter } from '@/components/admin/PremiumSMTImporter';

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

      {/* Main Content - Responsive avec ScrollArea */}
      <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 sm:space-y-6">
          {/* Tabs en mode scroll horizontal pour mobile */}
          <div className="w-full overflow-x-auto">
            <TabsList className="inline-flex h-auto p-1 gap-1 min-w-full lg:min-w-0 flex-nowrap lg:flex-wrap">
              <TabsTrigger value="overview" className="flex items-center gap-1.5 sm:gap-2 whitespace-nowrap text-xs sm:text-sm px-2 sm:px-3 py-2">
                <LayoutDashboard className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                <span className="hidden sm:inline">Vue d'ensemble</span>
                <span className="sm:hidden">Vue</span>
              </TabsTrigger>
              <TabsTrigger value="smt-import" className="flex items-center gap-1.5 sm:gap-2 whitespace-nowrap text-xs sm:text-sm px-2 sm:px-3 py-2 bg-primary/10">
                <Database className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                <span className="hidden sm:inline">Import SMT Premium</span>
                <span className="sm:hidden">Import</span>
              </TabsTrigger>
              <TabsTrigger value="smt-monitor" className="flex items-center gap-1.5 sm:gap-2 whitespace-nowrap text-xs sm:text-sm px-2 sm:px-3 py-2 bg-green-500/10">
                <Activity className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                <span className="hidden sm:inline">📊 Monitoring SMT</span>
                <span className="sm:hidden">📊 SMT</span>
              </TabsTrigger>
              <TabsTrigger value="smt-ab-test" className="flex items-center gap-1.5 sm:gap-2 whitespace-nowrap text-xs sm:text-sm px-2 sm:px-3 py-2 bg-blue-500/10">
                <GitCompare className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                <span className="hidden sm:inline">🧪 Test A/B SMT</span>
                <span className="sm:hidden">🧪 A/B</span>
              </TabsTrigger>
              <TabsTrigger value="audit" className="flex items-center gap-1.5 sm:gap-2 whitespace-nowrap text-xs sm:text-sm px-2 sm:px-3 py-2">
                <FileSearch className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                <span className="hidden sm:inline">Audit Système</span>
                <span className="sm:hidden">Audit</span>
              </TabsTrigger>
              <TabsTrigger value="training-viewer" className="flex items-center gap-1.5 sm:gap-2 whitespace-nowrap text-xs sm:text-sm px-2 sm:px-3 py-2">
                <Database className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                <span className="hidden sm:inline">Données d'Entraînement</span>
                <span className="sm:hidden">Train Data</span>
              </TabsTrigger>
              <TabsTrigger value="dictionary-viewer" className="flex items-center gap-1.5 sm:gap-2 whitespace-nowrap text-xs sm:text-sm px-2 sm:px-3 py-2">
                <BookOpen className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                <span className="hidden sm:inline">Données Dictionnaire</span>
                <span className="sm:hidden">Dict Data</span>
              </TabsTrigger>
              <TabsTrigger value="dataset" className="flex items-center gap-1.5 sm:gap-2 whitespace-nowrap text-xs sm:text-sm px-2 sm:px-3 py-2">
                <Database className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                <span className="hidden sm:inline">Dataset</span>
                <span className="sm:hidden">Data</span>
              </TabsTrigger>
              <TabsTrigger value="dictionary" className="flex items-center gap-1.5 sm:gap-2 whitespace-nowrap text-xs sm:text-sm px-2 sm:px-3 py-2">
                <BookOpen className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                <span className="hidden sm:inline">Dictionnaire</span>
                <span className="sm:hidden">Dict</span>
              </TabsTrigger>
              <TabsTrigger value="training" className="flex items-center gap-1.5 sm:gap-2 whitespace-nowrap text-xs sm:text-sm px-2 sm:px-3 py-2">
                <Brain className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                <span className="hidden sm:inline">Entraînement</span>
                <span className="sm:hidden">Train</span>
              </TabsTrigger>
              <TabsTrigger value="import" className="flex items-center gap-1.5 sm:gap-2 whitespace-nowrap text-xs sm:text-sm px-2 sm:px-3 py-2">
                <Upload className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                <span className="hidden sm:inline">Import Massif</span>
                <span className="sm:hidden">Import</span>
              </TabsTrigger>
              <TabsTrigger value="test" className="flex items-center gap-1.5 sm:gap-2 whitespace-nowrap text-xs sm:text-sm px-2 sm:px-3 py-2">
                <FlaskConical className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                <span className="hidden sm:inline">Test du Modèle</span>
                <span className="sm:hidden">Test</span>
              </TabsTrigger>
              <TabsTrigger value="model-performance" className="flex items-center gap-1.5 sm:gap-2 whitespace-nowrap text-xs sm:text-sm px-2 sm:px-3 py-2">
                <Activity className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                <span className="hidden sm:inline">Performance</span>
                <span className="sm:hidden">Perf</span>
              </TabsTrigger>
              <TabsTrigger value="comparison" className="flex items-center gap-1.5 sm:gap-2 whitespace-nowrap text-xs sm:text-sm px-2 sm:px-3 py-2">
                <GitCompare className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                <span className="hidden sm:inline">Comparaison</span>
                <span className="sm:hidden">Comp</span>
              </TabsTrigger>
              <TabsTrigger value="enhance" className="flex items-center gap-1.5 sm:gap-2 whitespace-nowrap text-xs sm:text-sm px-2 sm:px-3 py-2">
                <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                <span className="hidden sm:inline">IA Avancée</span>
                <span className="sm:hidden">IA</span>
              </TabsTrigger>
              <TabsTrigger value="performance" className="flex items-center gap-1.5 sm:gap-2 whitespace-nowrap text-xs sm:text-sm px-2 sm:px-3 py-2">
                <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                <span className="hidden sm:inline">Entraînement</span>
                <span className="sm:hidden">Ent</span>
              </TabsTrigger>
              <TabsTrigger value="analytics" className="flex items-center gap-1.5 sm:gap-2 whitespace-nowrap text-xs sm:text-sm px-2 sm:px-3 py-2">
                <BarChart3 className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                <span className="hidden sm:inline">Analytics</span>
                <span className="sm:hidden">Ana</span>
              </TabsTrigger>
              <TabsTrigger value="users" className="flex items-center gap-1.5 sm:gap-2 whitespace-nowrap text-xs sm:text-sm px-2 sm:px-3 py-2">
                <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                <span className="hidden sm:inline">Utilisateurs</span>
                <span className="sm:hidden">Users</span>
              </TabsTrigger>
              <TabsTrigger value="idioms" className="flex items-center gap-1.5 sm:gap-2 whitespace-nowrap text-xs sm:text-sm px-2 sm:px-3 py-2">
                <BookOpen className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                <span className="hidden sm:inline">Idiomes</span>
                <span className="sm:hidden">Idiom</span>
              </TabsTrigger>
              <TabsTrigger value="quality" className="flex items-center gap-1.5 sm:gap-2 whitespace-nowrap text-xs sm:text-sm px-2 sm:px-3 py-2">
                <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                <span className="hidden sm:inline">Qualité</span>
                <span className="sm:hidden">Qual</span>
              </TabsTrigger>
              <TabsTrigger value="feedback" className="flex items-center gap-1.5 sm:gap-2 whitespace-nowrap text-xs sm:text-sm px-2 sm:px-3 py-2">
                <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                <span className="hidden sm:inline">Feedback</span>
                <span className="sm:hidden">Feed</span>
              </TabsTrigger>
              <TabsTrigger value="fine-tuning" className="flex items-center gap-1.5 sm:gap-2 whitespace-nowrap text-xs sm:text-sm px-2 sm:px-3 py-2">
                <Brain className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                <span className="hidden sm:inline">Fine-Tuning</span>
                <span className="sm:hidden">AI</span>
              </TabsTrigger>
              <TabsTrigger value="nllb-fine-tuning" className="flex items-center gap-1.5 sm:gap-2 whitespace-nowrap text-xs sm:text-sm px-2 sm:px-3 py-2">
                <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                <span className="hidden sm:inline">NLLB-200</span>
                <span className="sm:hidden">NLLB</span>
              </TabsTrigger>
              <TabsTrigger value="dictionary-enricher" className="flex items-center gap-1.5 sm:gap-2 whitespace-nowrap text-xs sm:text-sm px-2 sm:px-3 py-2">
                <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                <span className="hidden sm:inline">Enrichissement Dict</span>
                <span className="sm:hidden">Enrich</span>
              </TabsTrigger>
              <TabsTrigger value="settings" className="flex items-center gap-1.5 sm:gap-2 whitespace-nowrap text-xs sm:text-sm px-2 sm:px-3 py-2">
                <Settings className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                <span className="hidden sm:inline">Paramètres</span>
                <span className="sm:hidden">Param</span>
              </TabsTrigger>
              <TabsTrigger value="enrich" className="flex items-center gap-1.5 sm:gap-2 whitespace-nowrap text-xs sm:text-sm px-2 sm:px-3 py-2">
                <Database className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                <span className="hidden sm:inline">Enrichissement</span>
                <span className="sm:hidden">Enrich</span>
              </TabsTrigger>
              <TabsTrigger value="auto-enrich" className="flex items-center gap-1.5 sm:gap-2 whitespace-nowrap text-xs sm:text-sm px-2 sm:px-3 py-2">
                <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                <span className="hidden sm:inline">Auto-enrichissement</span>
                <span className="sm:hidden">Auto</span>
              </TabsTrigger>
              <TabsTrigger value="advanced-search" className="flex items-center gap-1.5 sm:gap-2 whitespace-nowrap text-xs sm:text-sm px-2 sm:px-3 py-2">
                <Search className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                <span className="hidden sm:inline">Recherche Avancée</span>
                <span className="sm:hidden">Rech</span>
              </TabsTrigger>
              <TabsTrigger value="stats" className="flex items-center gap-1.5 sm:gap-2 whitespace-nowrap text-xs sm:text-sm px-2 sm:px-3 py-2">
                <PieChart className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                <span className="hidden sm:inline">Statistiques</span>
                <span className="sm:hidden">Stats</span>
              </TabsTrigger>
              <TabsTrigger value="bulk-edit" className="flex items-center gap-1.5 sm:gap-2 whitespace-nowrap text-xs sm:text-sm px-2 sm:px-3 py-2">
                <Edit3 className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                <span className="hidden sm:inline">Édition Masse</span>
                <span className="sm:hidden">Edit</span>
              </TabsTrigger>
              <TabsTrigger value="export" className="flex items-center gap-1.5 sm:gap-2 whitespace-nowrap text-xs sm:text-sm px-2 sm:px-3 py-2">
                <Download className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                <span className="hidden sm:inline">Export</span>
                <span className="sm:hidden">Exp</span>
              </TabsTrigger>
              <TabsTrigger value="validation" className="flex items-center gap-1.5 sm:gap-2 whitespace-nowrap text-xs sm:text-sm px-2 sm:px-3 py-2">
                <CheckCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                <span className="hidden sm:inline">Validation</span>
                <span className="sm:hidden">Valid</span>
              </TabsTrigger>
              <TabsTrigger value="hybrid-test" className="flex items-center gap-1.5 sm:gap-2 whitespace-nowrap text-xs sm:text-sm px-2 sm:px-3 py-2">
                <FlaskConical className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                <span className="hidden sm:inline">Test Hybride</span>
                <span className="sm:hidden">Test</span>
              </TabsTrigger>
              <TabsTrigger value="data-management" className="flex items-center gap-1.5 sm:gap-2 whitespace-nowrap text-xs sm:text-sm px-2 sm:px-3 py-2">
                <Database className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                <span className="hidden sm:inline">Gestion Données</span>
                <span className="sm:hidden">Données</span>
              </TabsTrigger>
              <TabsTrigger value="free-finetuning" className="flex items-center gap-1.5 sm:gap-2 whitespace-nowrap text-xs sm:text-sm px-2 sm:px-3 py-2 bg-green-500/10 text-green-600">
                <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                <span className="hidden sm:inline">🎁 Fine-Tuning GRATUIT</span>
                <span className="sm:hidden">🎁 Free</span>
              </TabsTrigger>
              <TabsTrigger value="diagnostic" className="flex items-center gap-1.5 sm:gap-2 whitespace-nowrap text-xs sm:text-sm px-2 sm:px-3 py-2">
                <Activity className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                <span className="hidden sm:inline">Diagnostic</span>
                <span className="sm:hidden">Diag</span>
              </TabsTrigger>
              <TabsTrigger value="ab-testing" className="flex items-center gap-1.5 sm:gap-2 whitespace-nowrap text-xs sm:text-sm px-2 sm:px-3 py-2">
                <GitCompare className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                <span className="hidden sm:inline">A/B Testing</span>
                <span className="sm:hidden">A/B</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="overview" className="space-y-4">
            <AdminOverview />
          </TabsContent>

          <TabsContent value="smt-import" className="space-y-4">
            <PremiumSMTImporter />
          </TabsContent>

          <TabsContent value="smt-monitor" className="space-y-4">
            <SMTSystemDashboard />
          </TabsContent>

          <TabsContent value="smt-ab-test" className="space-y-4">
            <div className="space-y-4">
              <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <h2 className="text-xl font-bold text-blue-700 dark:text-blue-400 mb-2">
                  🧪 Test A/B : Ancien vs Nouveau Système
                </h2>
                <p className="text-muted-foreground">
                  Comparez les performances entre l'ancien système (SimplifiedAI) et le nouveau moteur SMT sur vos phrases test.
                </p>
              </div>
              <SMTABTestingPanel />
            </div>
          </TabsContent>

          <TabsContent value="audit" className="space-y-4">
            <SystemAuditReport />
          </TabsContent>

          <TabsContent value="training-viewer" className="space-y-4">
            <TrainingDataViewer />
          </TabsContent>

          <TabsContent value="dictionary-viewer" className="space-y-4">
            <DictionaryDataViewer />
          </TabsContent>

          <TabsContent value="dataset" className="space-y-4">
            <FullDatasetImporter />
          </TabsContent>

          <TabsContent value="dictionary" className="space-y-4">
            <DictionaryManager />
          </TabsContent>

          <TabsContent value="training" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <TrainingManager />
              </div>
              <div>
                <ModelTrainingPanel />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="import" className="space-y-4">
            <MassDataImporter />
          </TabsContent>

          <TabsContent value="test" className="space-y-4">
            <ModelTestingPanel />
          </TabsContent>

          <TabsContent value="model-performance" className="space-y-4">
            <ModelPerformanceDashboard />
          </TabsContent>

          <TabsContent value="comparison" className="space-y-4">
            <TranslationComparisonDashboard />
          </TabsContent>

          <TabsContent value="enhance" className="space-y-4">
            <TrainingDataEnhancer />
          </TabsContent>

          <TabsContent value="performance" className="space-y-4">
            <TrainingAnalytics />
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            <AnalyticsDashboard />
          </TabsContent>

          <TabsContent value="users" className="space-y-4">
            <UserRoleManager />
          </TabsContent>

          <TabsContent value="idioms" className="space-y-4">
            <div className="space-y-6">
              <CompleteIdiomImporter />
              <IdiomImporter />
              <IdiomManager />
            </div>
          </TabsContent>

          <TabsContent value="quality" className="space-y-4">
            <QualityMetricsDashboard />
          </TabsContent>

          <TabsContent value="feedback" className="space-y-4">
            <FeedbackManager />
          </TabsContent>

          <TabsContent value="fine-tuning" className="space-y-4">
            <ModelTrainingDashboard />
          </TabsContent>

          <TabsContent value="nllb-fine-tuning" className="space-y-4">
            <NLLB200FineTuningPanel />
          </TabsContent>

          <TabsContent value="dictionary-enricher" className="space-y-4">
            <AutoDictionaryEnricher />
          </TabsContent>

          <TabsContent value="settings" className="space-y-4">
            <AdminSettings />
          </TabsContent>

          <TabsContent value="enrich" className="space-y-4">
            <AutoDictionaryEnricher />
          </TabsContent>

          <TabsContent value="auto-enrich" className="space-y-4">
            <AutoEnrichPanel />
          </TabsContent>

          <TabsContent value="advanced-search" className="space-y-4">
            <AdvancedDictionarySearch />
          </TabsContent>

          <TabsContent value="stats" className="space-y-4">
            <GrammaticalStatsDashboard />
          </TabsContent>

          <TabsContent value="bulk-edit" className="space-y-4">
            <BulkEditPanel />
          </TabsContent>

          <TabsContent value="export" className="space-y-4">
            <DictionaryExporter />
          </TabsContent>

          <TabsContent value="validation" className="space-y-4">
            <DictionaryValidator />
          </TabsContent>

          <TabsContent value="hybrid-test" className="space-y-4">
            <HybridTranslationTester />
          </TabsContent>

          <TabsContent value="diagnostic" className="space-y-4">
            <TranslationDiagnosticDashboard />
          </TabsContent>

          <TabsContent value="ab-testing" className="space-y-4">
            <ModelABTestingPanel />
          </TabsContent>

          <TabsContent value="data-management" className="space-y-4">
            <DataManagementPanel />
          </TabsContent>

          <TabsContent value="free-finetuning" className="space-y-4">
            <FreeFineTuningGuide />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
