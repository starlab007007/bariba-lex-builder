/**
 * Dashboard admin complet pour le monitoring des services audio (TTS, STT, ByT5)
 * Affiche les statistiques en temps réel avec graphiques
 */

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { 
  Activity, CheckCircle, XCircle, AlertCircle, 
  Volume2, Mic, RefreshCw, Clock, Loader2,
  TrendingUp, BarChart3, Zap, Brain, ArrowUpRight, ArrowDownRight
} from "lucide-react";
import { audioServicesMonitoring, AudioServicesStats, AudioServiceMetric } from "@/services/AudioServicesMonitoringService";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';

type ServiceStatus = 'available' | 'unavailable' | 'checking' | 'unknown';

interface ServiceHealth {
  name: string;
  type: 'tts' | 'stt' | 'byt5';
  language: 'bariba' | 'french';
  status: ServiceStatus;
  lastCheck: Date | null;
  latency: number | null;
  errorMessage?: string;
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

export function AudioServicesAdminDashboard() {
  const [services, setServices] = useState<ServiceHealth[]>([
    { name: 'TTS Bariba', type: 'tts', language: 'bariba', status: 'unknown', lastCheck: null, latency: null },
    { name: 'STT Bariba', type: 'stt', language: 'bariba', status: 'unknown', lastCheck: null, latency: null },
    { name: 'ByT5 Expert', type: 'byt5', language: 'bariba', status: 'unknown', lastCheck: null, latency: null },
    { name: 'TTS Français', type: 'tts', language: 'french', status: 'available', lastCheck: new Date(), latency: 0 },
    { name: 'STT Français', type: 'stt', language: 'french', status: 'available', lastCheck: new Date(), latency: 0 }
  ]);
  const [isChecking, setIsChecking] = useState(false);
  const [stats, setStats] = useState<AudioServicesStats | null>(null);

  useEffect(() => {
    // Subscribe to monitoring updates
    const unsubscribe = audioServicesMonitoring.subscribe(setStats);
    checkAllServices();
    return unsubscribe;
  }, []);

  const checkAllServices = async () => {
    setIsChecking(true);
    
    const results = await Promise.all([
      checkService('bariba-tts', { text: 'test' }),
      checkService('bariba-stt', { audio: 'test' }),
      checkService('byt5-bariba-translate', { text: 'bonjour', sourceLang: 'french', targetLang: 'bariba' })
    ]);

    setServices(prev => prev.map((s, i) => {
      if (s.language === 'french') return s;
      const result = results[['tts', 'stt', 'byt5'].indexOf(s.type)];
      if (!result) return s;
      return {
        ...s,
        status: result.success ? 'available' : 'unavailable',
        lastCheck: new Date(),
        latency: result.latency,
        errorMessage: result.error
      };
    }));

    setIsChecking(false);
  };

  const checkService = async (fnName: string, body: any): Promise<{ success: boolean; latency: number; error?: string }> => {
    const startTime = Date.now();
    try {
      const { data, error } = await supabase.functions.invoke(fnName, { body });
      const latency = Date.now() - startTime;
      
      if (error || data?.error) {
        return { success: false, latency, error: data?.error || error?.message };
      }
      return { success: true, latency };
    } catch (err: any) {
      return { success: false, latency: Date.now() - startTime, error: err.message };
    }
  };

  const getStatusIcon = (status: ServiceStatus) => {
    switch (status) {
      case 'available': return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'unavailable': return <XCircle className="h-5 w-5 text-red-500" />;
      case 'checking': return <Loader2 className="h-5 w-5 animate-spin text-blue-500" />;
      default: return <AlertCircle className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: ServiceStatus) => {
    switch (status) {
      case 'available': return <Badge className="bg-green-500">Disponible</Badge>;
      case 'unavailable': return <Badge variant="destructive">Indisponible</Badge>;
      case 'checking': return <Badge variant="secondary">Vérification...</Badge>;
      default: return <Badge variant="outline">Non vérifié</Badge>;
    }
  };

  const availableCount = services.filter(s => s.status === 'available').length;
  const healthPercentage = (availableCount / services.length) * 100;

  // Prepare chart data
  const serviceUsageData = stats ? Object.entries(stats.byService).map(([key, val]) => ({
    name: key.replace('-', ' ').toUpperCase(),
    calls: val.count,
    successRate: val.successRate,
    avgDuration: val.avgDuration
  })) : [];

  const pieData = stats ? Object.entries(stats.byService).map(([key, val]) => ({
    name: key,
    value: val.count
  })) : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Dashboard Services Audio</h2>
          <p className="text-muted-foreground">
            Monitoring TTS, STT et ByT5 en temps réel
          </p>
        </div>
        
        <Button onClick={checkAllServices} disabled={isChecking} variant="outline">
          {isChecking ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          Vérifier tous
        </Button>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
          <TabsTrigger value="services">Services</TabsTrigger>
          <TabsTrigger value="analytics">Analytiques</TabsTrigger>
          <TabsTrigger value="logs">Logs récents</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* KPI Cards */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Appels Total</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.totalCalls || 0}</div>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <ArrowUpRight className="h-3 w-3 text-green-500" />
                  {stats?.last24hCalls || 0} dernières 24h
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Taux de succès</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.successRate || 0}%</div>
                <Progress value={stats?.successRate || 0} className="mt-2" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Latence moyenne</CardTitle>
                <Zap className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.avgDuration || 0}ms</div>
                <p className="text-xs text-muted-foreground">
                  {(stats?.avgDuration || 0) < 500 ? '✅ Excellent' : 
                   (stats?.avgDuration || 0) < 2000 ? '⚠️ Acceptable' : '❌ Lent'}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Services actifs</CardTitle>
                <Brain className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{availableCount}/{services.length}</div>
                <Progress value={healthPercentage} className="mt-2" />
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Distribution des appels</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {pieData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Performance par service</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={serviceUsageData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" fontSize={10} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="calls" fill="#3B82F6" name="Appels" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Hourly Distribution */}
          {stats?.hourlyDistribution && stats.hourlyDistribution.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Activité horaire (24h)</CardTitle>
                <CardDescription>
                  Pic d'activité: {stats.peakHour !== null ? `${stats.peakHour}h` : 'N/A'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={150}>
                  <LineChart data={stats.hourlyDistribution}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="hour" tickFormatter={(h) => `${h}h`} />
                    <YAxis />
                    <Tooltip labelFormatter={(h) => `${h}h`} />
                    <Line type="monotone" dataKey="count" stroke="#8B5CF6" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="services" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {services.map((service) => (
              <Card key={service.name} className={`border-l-4 ${
                service.status === 'available' ? 'border-l-green-500' :
                service.status === 'unavailable' ? 'border-l-red-500' :
                'border-l-gray-300'
              }`}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      {service.type === 'tts' ? <Volume2 className="h-5 w-5 text-primary" /> :
                       service.type === 'stt' ? <Mic className="h-5 w-5 text-primary" /> :
                       <Brain className="h-5 w-5 text-primary" />}
                      {service.name}
                    </CardTitle>
                    {getStatusIcon(service.status)}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Statut</span>
                      {getStatusBadge(service.status)}
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Type</span>
                      <Badge variant="outline">{service.type.toUpperCase()}</Badge>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Langue</span>
                      <Badge variant="secondary">
                        {service.language === 'bariba' ? 'Bààtɔ̀nú' : 'Français'}
                      </Badge>
                    </div>
                    
                    {service.latency !== null && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Latence</span>
                        <span className={`font-mono text-sm ${
                          service.latency < 500 ? 'text-green-600' :
                          service.latency < 2000 ? 'text-yellow-600' :
                          'text-red-600'
                        }`}>
                          {service.latency}ms
                        </span>
                      </div>
                    )}
                    
                    {service.errorMessage && service.status === 'unavailable' && (
                      <div className="mt-2 p-2 bg-destructive/10 rounded text-xs text-destructive">
                        {service.errorMessage.slice(0, 100)}
                      </div>
                    )}
                    
                    {service.lastCheck && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {service.lastCheck.toLocaleTimeString()}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* HuggingFace Spaces Links */}
          <Card>
            <CardHeader>
              <CardTitle>Liens HuggingFace Spaces</CardTitle>
              <CardDescription>Réveiller les Spaces si nécessaire</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" asChild>
                  <a href="https://huggingface.co/spaces/zimesongbian/baatonum_tts_api_v001" target="_blank">
                    <Volume2 className="h-4 w-4 mr-2" />TTS Bariba
                  </a>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <a href="https://huggingface.co/spaces/zimesongbian/baatonum_asr_stt_api_v001_improve" target="_blank">
                    <Mic className="h-4 w-4 mr-2" />STT Bariba
                  </a>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <a href="https://huggingface.co/spaces/zimesongbian/modele_byt5_bariba_expert_api_v03_improve" target="_blank">
                    <Brain className="h-4 w-4 mr-2" />ByT5 Expert
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          {stats && Object.entries(stats.byService).length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              {Object.entries(stats.byService).map(([key, data]) => (
                <Card key={key}>
                  <CardHeader>
                    <CardTitle className="text-lg">{key.replace('-', ' ').toUpperCase()}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Appels</span>
                        <span className="font-bold">{data.count}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Taux de succès</span>
                        <span className={data.successRate >= 90 ? 'text-green-600' : 'text-yellow-600'}>
                          {data.successRate}%
                        </span>
                      </div>
                      <Progress value={data.successRate} />
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Latence moyenne</span>
                        <span className="font-mono">{data.avgDuration}ms</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Erreurs</span>
                        <span className={data.errors > 0 ? 'text-red-500' : 'text-green-500'}>
                          {data.errors}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Pas encore de données d'utilisation</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Les statistiques s'afficheront après les premiers appels aux services
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="logs">
          <Card>
            <CardHeader>
              <CardTitle>Logs récents</CardTitle>
              <CardDescription>20 derniers appels aux services audio</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                {stats?.recentCalls && stats.recentCalls.length > 0 ? (
                  <div className="space-y-2">
                    {stats.recentCalls.map((call) => (
                      <div
                        key={call.id}
                        className={`p-3 rounded-lg border ${
                          call.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {call.success ? (
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            ) : (
                              <XCircle className="h-4 w-4 text-red-600" />
                            )}
                            <Badge variant="outline">
                              {call.serviceType.toUpperCase()} - {call.language}
                            </Badge>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {new Date(call.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        <div className="mt-1 text-sm flex items-center gap-4">
                          <span className="font-mono">{call.duration}ms</span>
                          {call.inputLength && (
                            <span className="text-muted-foreground">
                              {call.inputLength} chars
                            </span>
                          )}
                          {call.error && (
                            <span className="text-red-600 text-xs truncate">
                              {call.error}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Activity className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">Aucun log récent</p>
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
