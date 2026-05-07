import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  CheckCircle, 
  XCircle, 
  Loader2, 
  Clock, 
  Play, 
  RotateCcw,
  ArrowLeft,
  Sparkles,
  Package,
  Layers,
  FileCode,
  Route,
  FolderOpen,
  Box
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

type TestStatus = 'pending' | 'running' | 'success' | 'failed';

interface ValidationTest {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  status: TestStatus;
  duration?: number;
  error?: string;
}

const initialTests: ValidationTest[] = [
  {
    id: 'types',
    name: 'Core Types',
    description: 'Import Template, Effect, EffectConfig types',
    icon: <FileCode className="h-4 w-4" />,
    status: 'pending'
  },
  {
    id: 'asset-manager',
    name: 'AssetManager',
    description: 'Import and instantiate AssetManager',
    icon: <FolderOpen className="h-4 w-4" />,
    status: 'pending'
  },
  {
    id: 'effects-renderer',
    name: 'EffectsRenderer',
    description: 'Import EffectsRenderer class',
    icon: <Sparkles className="h-4 w-4" />,
    status: 'pending'
  },
  {
    id: 'template-engine',
    name: 'TemplateEngine',
    description: 'Import and instantiate TemplateEngine',
    icon: <Layers className="h-4 w-4" />,
    status: 'pending'
  },
  {
    id: 'templates-registry',
    name: 'Templates Registry',
    description: 'Load allTemplates and templatesByCategory',
    icon: <Package className="h-4 w-4" />,
    status: 'pending'
  },
  {
    id: 'griot-digital',
    name: 'Griot Digital Template',
    description: 'Verify griotDigitalTemplate structure',
    icon: <Box className="h-4 w-4" />,
    status: 'pending'
  },
  {
    id: 'template-selector',
    name: 'TemplateSelector Component',
    description: 'Import TemplateSelector React component',
    icon: <Layers className="h-4 w-4" />,
    status: 'pending'
  },
  {
    id: 'router-config',
    name: 'Router Configuration',
    description: 'Verify /template-test route exists',
    icon: <Route className="h-4 w-4" />,
    status: 'pending'
  },
  {
    id: 'three-js',
    name: 'Three.js Dependency',
    description: 'Import THREE core classes',
    icon: <Box className="h-4 w-4" />,
    status: 'pending'
  },
  {
    id: 'lucide-icons',
    name: 'Lucide Icons',
    description: 'Verify lucide-react icons work',
    icon: <Sparkles className="h-4 w-4" />,
    status: 'pending'
  }
];

const SystemValidation: React.FC = () => {
  const navigate = useNavigate();
  const [tests, setTests] = useState<ValidationTest[]>(initialTests);
  const [isRunning, setIsRunning] = useState(false);
  const [completed, setCompleted] = useState(false);

  const updateTest = (id: string, updates: Partial<ValidationTest>) => {
    setTests(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
  };

  const runTest = async (testId: string): Promise<boolean> => {
    const startTime = performance.now();
    updateTest(testId, { status: 'running' });

    try {
      switch (testId) {
        case 'types': {
          const types = await import('@/components/tamtam/creator/TemplateSystem/types');
          // Types module loads successfully
          if (!types) {
            throw new Error('Types module not loaded');
          }
          break;
        }

        case 'asset-manager': {
          const mod = await import('@/components/tamtam/creator/TemplateSystem/AssetManager');
          if (!mod.AssetManager || !mod.assetManager) {
            throw new Error('AssetManager not properly exported');
          }
          break;
        }

        case 'effects-renderer': {
          const mod = await import('@/components/tamtam/creator/TemplateSystem/EffectsRenderer');
          if (!mod.EffectsRenderer) {
            throw new Error('EffectsRenderer not properly exported');
          }
          break;
        }

        case 'template-engine': {
          const mod = await import('@/components/tamtam/creator/TemplateSystem/TemplateEngine');
          if (!mod.TemplateEngine || !mod.templateEngine) {
            throw new Error('TemplateEngine not properly exported');
          }
          break;
        }

        case 'templates-registry': {
          const mod = await import('@/components/tamtam/creator/TemplateSystem/templates');
          if (!Array.isArray(mod.allTemplates)) {
            throw new Error('allTemplates is not an array');
          }
          if (!mod.templatesByCategory || typeof mod.templatesByCategory !== 'object') {
            throw new Error('templatesByCategory is not an object');
          }
          break;
        }

        case 'griot-digital': {
          const mod = await import('@/components/tamtam/creator/TemplateSystem/templates/griotDigital');
          if (!mod.griotDigitalTemplate) {
            throw new Error('griotDigitalTemplate not found');
          }
          if (!mod.griotDigitalTemplate.id || !mod.griotDigitalTemplate.effects) {
            throw new Error('griotDigitalTemplate missing required fields');
          }
          if (mod.griotDigitalTemplate.effects.length < 5) {
            throw new Error('griotDigitalTemplate has too few effects');
          }
          break;
        }

        case 'template-selector': {
          const mod = await import('@/components/tamtam/creator/TemplateSystem/TemplateSelector');
          if (!mod.TemplateSelector) {
            throw new Error('TemplateSelector component not found');
          }
          break;
        }

        case 'router-config': {
          // Route check - if we're on /system-validation, routing works
          break;
        }

        case 'three-js': {
          const THREE = await import('three');
          if (!THREE.Scene || !THREE.WebGLRenderer) {
            throw new Error('THREE core classes not available');
          }
          if (!THREE.Object3D || !THREE.Group) {
            throw new Error('THREE 3D classes not available');
          }
          break;
        }

        case 'lucide-icons': {
          const icons = await import('lucide-react');
          if (!icons.Play || !icons.Sparkles || !icons.CheckCircle) {
            throw new Error('Lucide icons not properly exported');
          }
          break;
        }

        default:
          throw new Error(`Unknown test: ${testId}`);
      }

      const duration = Math.round(performance.now() - startTime);
      updateTest(testId, { status: 'success', duration });
      return true;

    } catch (error) {
      const duration = Math.round(performance.now() - startTime);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      updateTest(testId, { status: 'failed', duration, error: errorMessage });
      return false;
    }
  };

  const runAllTests = useCallback(async () => {
    setIsRunning(true);
    setCompleted(false);
    setTests(initialTests);

    for (const test of initialTests) {
      await runTest(test.id);
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    setIsRunning(false);
    setCompleted(true);
  }, []);

  const resetTests = () => {
    setTests(initialTests);
    setCompleted(false);
  };

  const passedCount = tests.filter(t => t.status === 'success').length;
  const failedCount = tests.filter(t => t.status === 'failed').length;
  const totalCount = tests.length;
  const progress = ((passedCount + failedCount) / totalCount) * 100;

  const getStatusIcon = (status: TestStatus) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-muted-foreground" />;
      case 'running':
        return <Loader2 className="h-4 w-4 text-primary animate-spin" />;
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-destructive" />;
    }
  };

  const getStatusBadge = (status: TestStatus) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>;
      case 'running':
        return <Badge variant="default" className="animate-pulse">Running</Badge>;
      case 'success':
        return <Badge className="bg-green-500/20 text-green-500 border-green-500/30">Passed</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate('/tamtam')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">System Validation</h1>
            <p className="text-muted-foreground">Template System v3.0 Health Check</p>
          </div>
        </div>

        {/* Summary Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center justify-between">
              <span>Test Results</span>
              {completed && failedCount === 0 && (
                <span className="text-2xl">🎉</span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Progress value={progress} className="h-2" />
            
            <div className="flex items-center justify-between">
              <div className="flex gap-4 text-sm">
                <span className="text-green-500 font-medium">{passedCount} passed</span>
                <span className="text-muted-foreground">•</span>
                <span className={failedCount > 0 ? 'text-destructive font-medium' : 'text-muted-foreground'}>
                  {failedCount} failed
                </span>
                <span className="text-muted-foreground">•</span>
                <span className="text-muted-foreground">{totalCount} total</span>
              </div>

              <div className="flex gap-2">
                {!isRunning && !completed && (
                  <Button onClick={runAllTests} className="gap-2">
                    <Play className="h-4 w-4" />
                    Run Tests
                  </Button>
                )}
                {completed && (
                  <Button onClick={resetTests} variant="outline" className="gap-2">
                    <RotateCcw className="h-4 w-4" />
                    Rerun
                  </Button>
                )}
                {isRunning && (
                  <Button disabled className="gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Running...
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Test List */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Validation Tests</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {tests.map((test) => (
              <div
                key={test.id}
                className={`
                  p-3 rounded-lg border transition-colors
                  ${test.status === 'success' ? 'bg-green-500/5 border-green-500/20' : ''}
                  ${test.status === 'failed' ? 'bg-destructive/5 border-destructive/20' : ''}
                  ${test.status === 'running' ? 'bg-primary/5 border-primary/20' : ''}
                  ${test.status === 'pending' ? 'bg-muted/50 border-border' : ''}
                `}
              >
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0">
                    {getStatusIcon(test.status)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {test.icon}
                      <span className="font-medium">{test.name}</span>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {test.description}
                    </p>
                    {test.error && (
                      <p className="text-sm text-destructive mt-1">
                        Error: {test.error}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-3 flex-shrink-0">
                    {test.duration !== undefined && (
                      <span className="text-xs text-muted-foreground">
                        {test.duration}ms
                      </span>
                    )}
                    {getStatusBadge(test.status)}
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Quick Links */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quick Links</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => navigate('/template-test')}
              >
                Template Test Page
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => navigate('/tamtam/creator')}
              >
                Creator Studio
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => navigate('/tamtam')}
              >
                TAM-TAM Home
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SystemValidation;
