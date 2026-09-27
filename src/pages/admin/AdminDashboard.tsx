import { useEffect, useState, Component, type ReactNode } from 'react';
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
import ClasseAudioReview from '@/pages/admin/ClasseAudioReview';
import ApprendreVoiceAdmin from '@/components/admin/apprendre-voice/ApprendreVoiceAdmin';
import { Link, useLocation, useNavigate } from 'react-router-dom';
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
  const location = useLocation();
  const navigate = useNavigate();

  const pathToTab: Record<string, string> = {
    '/admin': 'overview',
    '/admin/overview': 'overview',
    '/admin/analytics': 'analytics',
    '/admin/model-health': 'model-health',
    '/admin/dictionary': 'dictionary',
    '/admin/dictionary-advanced': 'dictionary-advanced',
    '/admin/idioms': 'idioms',
    '/admin/grammar-stats': 'grammar-stats',
    '/admin/apprendre-voice': 'apprendre-voice',
    '/admin/classe-audio': 'classe-audio',
    '/admin/audio-services': 'audio-services',
    '/admin/quality': 'quality',
    '/admin/diagnostic': 'diagnostic',
    '/admin/templates-ia': 'templates-ia',
    '/admin/anime-library': 'anime-library',
    '/admin/bulk-edit': 'bulk-edit',
    '/admin/export': 'export',
    '/admin/users': 'users',
    '/admin/settings': 'settings',
  };
  const tabToPath: Record<string, string> = Object.fromEntries(
    Object.entries(pathToTab).map(([path, tab]) => [tab, path])
  );
  tabToPath.overview = '/admin';
  tabToPath['voice-corpus'] = '/admin/voice-corpus';

  const tabFromLocation = () => {
    const path = location.pathname.replace(/\/$/, '') || '/admin';
    if (pathToTab[path]) return pathToTab[path];
    const queryTab = new URLSearchParams(location.search).get('tab');
    return queryTab || 'overview';
  };

  const validTabs = new Set(Object.values(pathToTab));

  const [activeTab, setActiveTab] = useState(() => {
    const tab = tabFromLocation();
    return validTabs.has(tab) ? tab : 'overview';
  });

  useEffect(() => {
    const next = tabFromLocation();
    setActiveTab(validTabs.has(next) ? next : 'overview');
  }, [location.pathname, location.search]);

  const changeTab = (tab: string) => {
    const target = tabToPath[tab] || '/admin';
    navigate(target);
  };

  const navSections = [
    {
      label: 'Pilotage',
      items: [
        { value: 'overview', label: 'Vue d’ensemble', icon: BarChart3 },
        { value: 'analytics', label: 'Analytics', icon: Activity },
        { value: 'model-health', label: 'Santé modèles IA', icon: Sparkles },
      ],
    },
    {
      label: 'Contenus',
      items: [
        { value: 'dictionary', label: 'Dictionnaire', icon: BookOpen },
        { value: 'dictionary-advanced', label: 'Dictionnaire avancé', icon: Sparkles },
        { value: 'idioms', label: 'Idiomes', icon: FileText },
        { value: 'grammar-stats', label: 'Stats grammaticales', icon: BarChart3 },
      ],
    },
    {
      label: 'Voix & audio',
      items: [
        { value: 'apprendre-voice', label: 'Audio Apprendre', icon: Mic },
        { value: 'classe-audio', label: 'Audio Classe', icon: Volume2 },
        { value: 'voice-corpus', label: 'Corpus voix', icon: Mic },
        { value: 'audio-services', label: 'Services audio', icon: Volume2 },
      ],
    },
    {
      label: 'Qualité & production',
      items: [
        { value: 'quality', label: 'Qualité', icon: Shield },
        { value: 'diagnostic', label: 'Diagnostic', icon: Activity },
        { value: 'templates-ia', label: 'Templates IA', icon: Film },
        { value: 'anime-library', label: 'Bibliothèque Anime', icon: BookImage },
        { value: 'bulk-edit', label: 'Édition masse', icon: Edit3 },
        { value: 'export', label: 'Export', icon: Download },
      ],
    },
    {
      label: 'Administration',
      items: [
        { value: 'users', label: 'Utilisateurs & rôles', icon: Users },
        { value: 'settings', label: 'Paramètres', icon: Settings },
      ],
    },
  ];

  const activeLabel =
    navSections.flatMap(section => section.items).find(item => item.value === activeTab)?.label ||
    'Administration';

  const renderContents = (
    <>
      <TabsContent value="overview" className="m-0"><TabErrorBoundary tabName="overview"><AdminOverview /></TabErrorBoundary></TabsContent>
      <TabsContent value="model-health" className="m-0">
        <TabErrorBoundary tabName="model-health">
          <div className="space-y-6"><ModelHealthDashboard /><ByT5SpaceConfig /></div>
        </TabErrorBoundary>
      </TabsContent>
      <TabsContent value="audio-services" className="m-0"><TabErrorBoundary tabName="audio-services"><AudioServicesMonitor /></TabErrorBoundary></TabsContent>
      <TabsContent value="dictionary" className="m-0"><TabErrorBoundary tabName="dictionary"><DictionaryManager /></TabErrorBoundary></TabsContent>
      <TabsContent value="dictionary-advanced" className="m-0"><TabErrorBoundary tabName="dictionary-advanced"><AdvancedDictionaryManager /></TabErrorBoundary></TabsContent>
      <TabsContent value="idioms" className="m-0"><TabErrorBoundary tabName="idioms"><IdiomManager /></TabErrorBoundary></TabsContent>
      <TabsContent value="voice-corpus" className="m-0">
        <TabErrorBoundary tabName="voice-corpus">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-[24px] border border-[#E4DFCC] bg-white p-5 shadow-sm">
              <div>
                <h2 className="flex items-center gap-2 text-lg font-extrabold text-[#241F2E]"><Mic className="h-5 w-5 text-[#9C6B1D]" /> Corpus Voix Bariba</h2>
                <p className="text-sm text-[#6F6955]">Écouter, valider et exporter les enregistrements collectés via le Voice Lab.</p>
              </div>
              <Link to="/admin/voice-corpus" className="inline-flex items-center gap-2 rounded-full bg-[#241F2E] px-4 py-2.5 text-sm font-bold text-white hover:opacity-90">
                <ExternalLink className="h-4 w-4" /> Stats & export complet
              </Link>
            </div>
            <VoiceRecordingsBrowser />
          </div>
        </TabErrorBoundary>
      </TabsContent>
      <TabsContent value="apprendre-voice" className="m-0"><TabErrorBoundary tabName="apprendre-voice"><ApprendreVoiceAdmin /></TabErrorBoundary></TabsContent>
      <TabsContent value="classe-audio" className="m-0">
        <TabErrorBoundary tabName="classe-audio">
          <div className="space-y-3">
            <div className="rounded-[24px] border border-[#E4DFCC] bg-white p-5 shadow-sm">
              <h2 className="flex items-center gap-2 text-lg font-extrabold text-[#241F2E]"><Volume2 className="h-5 w-5 text-[#9C6B1D]" /> Lecture vocale des contenus</h2>
              <p className="text-sm text-[#6F6955]">Validez les enregistrements audio des enseignants pour les manuels N1/N2.</p>
            </div>
            <ClasseAudioReview />
          </div>
        </TabErrorBoundary>
      </TabsContent>
      <TabsContent value="quality" className="m-0"><TabErrorBoundary tabName="quality"><QualityMetricsDashboard /></TabErrorBoundary></TabsContent>
      <TabsContent value="diagnostic" className="m-0"><TabErrorBoundary tabName="diagnostic"><TranslationDiagnosticDashboard /></TabErrorBoundary></TabsContent>
      <TabsContent value="analytics" className="m-0"><TabErrorBoundary tabName="analytics"><AnalyticsDashboard /></TabErrorBoundary></TabsContent>
      <TabsContent value="templates-ia" className="m-0"><TabErrorBoundary tabName="templates-ia"><TemplateGenerationAdmin /></TabErrorBoundary></TabsContent>
      <TabsContent value="anime-library" className="m-0"><TabErrorBoundary tabName="anime-library"><AnimeLibraryManager /></TabErrorBoundary></TabsContent>
      <TabsContent value="grammar-stats" className="m-0"><TabErrorBoundary tabName="grammar-stats"><GrammaticalStatsDashboard /></TabErrorBoundary></TabsContent>
      <TabsContent value="bulk-edit" className="m-0"><TabErrorBoundary tabName="bulk-edit"><BulkEditPanel /></TabErrorBoundary></TabsContent>
      <TabsContent value="export" className="m-0"><TabErrorBoundary tabName="export"><DictionaryExporter /></TabErrorBoundary></TabsContent>
      <TabsContent value="users" className="m-0"><TabErrorBoundary tabName="users"><UserRoleManager /></TabErrorBoundary></TabsContent>
      <TabsContent value="settings" className="m-0"><TabErrorBoundary tabName="settings"><AdminSettings /></TabErrorBoundary></TabsContent>
    </>
  );

  return (
    <AdminErrorBoundary>
      <div className="min-h-screen bg-[#F7F5EC] text-[#241F2E]">
        <Tabs value={activeTab} onValueChange={changeTab}>
          <div className="grid min-h-screen lg:grid-cols-[280px_minmax(0,1fr)]">
            <aside className="hidden lg:flex lg:flex-col bg-[#241F2E] text-white border-r border-white/10 sticky top-0 h-screen">
              <div className="px-6 pt-7 pb-5 border-b border-white/10">
                <Link to="/" className="flex items-center gap-3 group">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#C99530] text-[#2B2110] shadow-lg shadow-black/20">
                    <span className="text-xl">🔥</span>
                  </div>
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-[#D9D3C1]">FITILA</p>
                    <h1 className="text-lg font-extrabold tracking-tight">Centre de contrôle</h1>
                  </div>
                </Link>
                <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#B7AF98]">Administrateur connecté</p>
                  <p className="mt-1 truncate text-sm font-semibold text-white">{user?.email || 'Administration FITILA'}</p>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-3 py-4">
                <TabsList className="h-auto w-full flex-col items-stretch gap-4 bg-transparent p-0">
                  {navSections.map(section => (
                    <div key={section.label}>
                      <p className="px-3 pb-2 text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#B7AF98]">{section.label}</p>
                      <div className="space-y-1">
                        {section.items.map(item => {
                          const Icon = item.icon;
                          return (
                            <TabsTrigger
                              key={item.value}
                              value={item.value}
                              className="w-full justify-start gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-white/70 data-[state=active]:bg-[#C99530] data-[state=active]:text-[#2B2110] data-[state=active]:shadow-lg hover:bg-white/8 hover:text-white"
                            >
                              <Icon className="h-4 w-4 shrink-0" />
                              <span className="truncate">{item.label}</span>
                            </TabsTrigger>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </TabsList>
              </div>

              <div className="border-t border-white/10 p-4 space-y-2">
                <Button asChild variant="ghost" className="w-full justify-start rounded-xl text-white/80 hover:bg-white/10 hover:text-white">
                  <Link to="/"><Globe className="mr-2 h-4 w-4" /> Ouvrir FITILA</Link>
                </Button>
                <Button variant="ghost" className="w-full justify-start rounded-xl text-white/60 hover:bg-white/10 hover:text-white" onClick={signOut}>
                  Déconnexion
                </Button>
              </div>
            </aside>

            <main className="min-w-0">
              <header className="sticky top-0 z-40 border-b border-[#E4DFCC]/80 bg-[#F7F5EC]/92 backdrop-blur-xl">
                <div className="flex min-h-[76px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
                  <div className="min-w-0">
                    <p className="text-[10px] font-extrabold uppercase tracking-[0.22em] text-[#9C6B1D]">Administration FITILA</p>
                    <h2 className="truncate text-xl sm:text-2xl font-extrabold tracking-tight text-[#241F2E]">{activeLabel}</h2>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button asChild variant="outline" size="sm" className="rounded-full border-[#D5CEB3] bg-white">
                      <Link to="/"><Globe className="mr-2 h-4 w-4" /> <span className="hidden sm:inline">Voir l’application</span><span className="sm:hidden">FITILA</span></Link>
                    </Button>
                    <Button variant="outline" size="sm" className="hidden sm:inline-flex rounded-full border-[#D5CEB3] bg-white" onClick={signOut}>Déconnexion</Button>
                  </div>
                </div>

                <div className="lg:hidden overflow-x-auto border-t border-[#E4DFCC] px-3 py-2">
                  <TabsList className="inline-flex h-auto min-w-max gap-1 bg-transparent p-0">
                    {navSections.flatMap(section => section.items).map(item => {
                      const Icon = item.icon;
                      return (
                        <TabsTrigger
                          key={item.value}
                          value={item.value}
                          className="gap-1.5 rounded-full border border-[#E4DFCC] bg-white px-3 py-2 text-xs font-bold text-[#5E5846] data-[state=active]:border-[#C99530] data-[state=active]:bg-[#F3E3B9] data-[state=active]:text-[#2B2110]"
                        >
                          <Icon className="h-3.5 w-3.5" /> {item.label}
                        </TabsTrigger>
                      );
                    })}
                  </TabsList>
                </div>
              </header>

              <div className="px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
                <div className="mx-auto max-w-[1600px]">
                  {activeTab === 'overview' && (
                    <div className="mb-6 overflow-hidden rounded-[28px] bg-[#241F2E] p-6 sm:p-8 text-white shadow-xl shadow-[#241F2E]/10">
                      <div className="grid gap-5 md:grid-cols-[1fr_auto] md:items-center">
                        <div>
                          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-[#F3E3B9]">
                            <Sparkles className="h-3.5 w-3.5" /> Pilotage unifié
                          </div>
                          <h3 className="max-w-3xl text-2xl sm:text-3xl font-extrabold tracking-tight">Tout FITILA, depuis un seul centre de contrôle.</h3>
                          <p className="mt-2 max-w-2xl text-sm sm:text-base text-[#D9D3C1]">Contenus, voix, qualité, IA, utilisateurs et production sont regroupés sans changer vos outils métier.</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button onClick={() => changeTab('apprendre-voice')} className="rounded-full bg-[#C99530] text-[#2B2110] hover:bg-[#D7A84B] font-bold">
                            <Mic className="mr-2 h-4 w-4" /> Audio Apprendre
                          </Button>
                          <Button onClick={() => changeTab('users')} variant="outline" className="rounded-full border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white">
                            <Users className="mr-2 h-4 w-4" /> Utilisateurs & rôles
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                  {renderContents}
                </div>
              </div>
            </main>
          </div>
        </Tabs>
      </div>
    </AdminErrorBoundary>
  );
}
