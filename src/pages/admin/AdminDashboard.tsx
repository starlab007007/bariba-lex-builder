import { useState, Component, type ReactNode } from 'react';
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
import { AnimeLibraryManager } from '@/components/admin/AnimeLibraryManager';
import VoiceRecordingsBrowser from '@/components/admin/VoiceRecordingsBrowser';
import { Link } from 'react-router-dom';
import { 
  Settings, Users, BarChart3, 
  FileText, Globe, 
  BookOpen, 
  Sparkles, Shield, 
  Activity, Download, Edit3, Volume2, Film, BookImage,
  AlertTriangle, Mic, ExternalLink
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';

/** Global error boundary for the entire admin dashboard */
class AdminErrorBoundary extends Component<
  { children: ReactNode; onReset?: () => void },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: ReactNode; onReset?: () => void }) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('AdminDashboard crash:', error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="text-center space-y-4 p-8 max-w-md">
            <AlertTriangle className="h-12 w-12 mx-auto text-destructive" />
            <h2 className="text-xl font-semibold">Erreur dans le tableau de bord</h2>
            <p className="text-sm text-muted-foreground">{this.state.error?.message}</p>
            <Button variant="outline" onClick={() => { this.setState({ hasError: false, error: null }); this.props.onReset?.(); }}>
              Réessayer
            </Button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

/** Error boundary wrapper for individual tab content */
class TabErrorBoundary extends Component<
  { children: ReactNode; tabName: string },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: ReactNode; tabName: string }) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error(`Tab "${this.props.tabName}" crash:`, error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 text-center space-y-4">
          <AlertTriangle className="h-10 w-10 mx-auto text-destructive" />
          <p className="font-semibold">Erreur dans cet onglet</p>
          <p className="text-sm text-muted-foreground">{this.state.error?.message}</p>
          <Button variant="outline" onClick={() => this.setState({ hasError: false, error: null })}>
            Réessayer
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function AdminDashboard() {
  const { user, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <AdminErrorBoundary>
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
              <TabsTrigger value="anime-library" className="flex items-center gap-2">
                <BookImage className="h-4 w-4 text-[hsl(var(--section-creation))]" />
                Bibliothèque Anime
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

          {/* Tab Contents - each wrapped in error boundary */}
          <TabsContent value="overview"><TabErrorBoundary tabName="overview"><AdminOverview /></TabErrorBoundary></TabsContent>
          <TabsContent value="model-health">
            <TabErrorBoundary tabName="model-health">
              <div className="space-y-6">
                <ModelHealthDashboard />
                <ByT5SpaceConfig />
              </div>
            </TabErrorBoundary>
          </TabsContent>
          <TabsContent value="audio-services"><TabErrorBoundary tabName="audio-services"><AudioServicesMonitor /></TabErrorBoundary></TabsContent>
          <TabsContent value="dictionary"><TabErrorBoundary tabName="dictionary"><DictionaryManager /></TabErrorBoundary></TabsContent>
          <TabsContent value="dictionary-advanced"><TabErrorBoundary tabName="dictionary-advanced"><AdvancedDictionaryManager /></TabErrorBoundary></TabsContent>
          <TabsContent value="idioms"><TabErrorBoundary tabName="idioms"><IdiomManager /></TabErrorBoundary></TabsContent>
          
          <TabsContent value="quality"><TabErrorBoundary tabName="quality"><QualityMetricsDashboard /></TabErrorBoundary></TabsContent>
          <TabsContent value="diagnostic"><TabErrorBoundary tabName="diagnostic"><TranslationDiagnosticDashboard /></TabErrorBoundary></TabsContent>
          
          <TabsContent value="analytics"><TabErrorBoundary tabName="analytics"><AnalyticsDashboard /></TabErrorBoundary></TabsContent>
          
          <TabsContent value="templates-ia"><TabErrorBoundary tabName="templates-ia"><TemplateGenerationAdmin /></TabErrorBoundary></TabsContent>
          <TabsContent value="anime-library"><TabErrorBoundary tabName="anime-library"><AnimeLibraryManager /></TabErrorBoundary></TabsContent>
          
          <TabsContent value="grammar-stats"><TabErrorBoundary tabName="grammar-stats"><GrammaticalStatsDashboard /></TabErrorBoundary></TabsContent>
          <TabsContent value="bulk-edit"><TabErrorBoundary tabName="bulk-edit"><BulkEditPanel /></TabErrorBoundary></TabsContent>
          <TabsContent value="export"><TabErrorBoundary tabName="export"><DictionaryExporter /></TabErrorBoundary></TabsContent>
          
          <TabsContent value="users"><TabErrorBoundary tabName="users"><UserRoleManager /></TabErrorBoundary></TabsContent>
          <TabsContent value="settings"><TabErrorBoundary tabName="settings"><AdminSettings /></TabErrorBoundary></TabsContent>
        </Tabs>
      </div>
    </div>
    </AdminErrorBoundary>
  );
}
