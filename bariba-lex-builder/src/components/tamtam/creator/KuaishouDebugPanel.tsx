/**
 * KuaishouDebugPanel.tsx
 * Panneau de debug pour le système Kuaishou
 * Affiche: état des moteurs, segments capturés, métriques de performance
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, ChevronDown, ChevronRight, Activity, Database, Cpu, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import type { KuaishouTemplateConfig, VideoSegment } from '@/types/KuaishouTypes';

interface KuaishouDebugPanelProps {
  phase: string;
  template: KuaishouTemplateConfig | null;
  capturedSegments: VideoSegment[];
  currentSegmentIndex: number;
  onClose: () => void;
}

interface PerformanceMetrics {
  fps: number;
  memory: number;
  cpuUsage: number;
}

export const KuaishouDebugPanel: React.FC<KuaishouDebugPanelProps> = ({
  phase,
  template,
  capturedSegments,
  currentSegmentIndex,
  onClose
}) => {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    workflow: true,
    template: true,
    segments: true,
    performance: false
  });
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    fps: 60,
    memory: 0,
    cpuUsage: 0
  });

  // Simulate performance metrics
  useEffect(() => {
    const interval = setInterval(() => {
      const memory = (performance as any).memory?.usedJSHeapSize / 1048576 || 0;
      setMetrics({
        fps: Math.round(55 + Math.random() * 10),
        memory: Math.round(memory),
        cpuUsage: Math.round(20 + Math.random() * 30)
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const getPhaseColor = (p: string) => {
    switch (p) {
      case 'selecting': return 'bg-blue-500';
      case 'capturing': return 'bg-red-500';
      case 'previewing': return 'bg-yellow-500';
      case 'exporting': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 25 }}
      className="fixed right-0 top-0 bottom-0 w-80 bg-card border-l border-border shadow-2xl z-[60] flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <h2 className="font-bold flex items-center gap-2">
          <Activity className="w-4 h-4 text-primary" />
          Debug Panel
        </h2>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {/* Workflow State */}
          <DebugSection
            title="Workflow State"
            icon={<Layers className="w-4 h-4" />}
            expanded={expandedSections.workflow}
            onToggle={() => toggleSection('workflow')}
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Phase</span>
                <Badge className={getPhaseColor(phase)}>{phase}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Segment Index</span>
                <span className="font-mono text-sm">{currentSegmentIndex}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Captured</span>
                <span className="font-mono text-sm">{capturedSegments.length}</span>
              </div>
            </div>
          </DebugSection>

          {/* Template Info */}
          <DebugSection
            title="Template"
            icon={<Database className="w-4 h-4" />}
            expanded={expandedSections.template}
            onToggle={() => toggleSection('template')}
          >
            {template ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">ID</span>
                  <span className="font-mono text-xs">{template.id}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Name</span>
                  <span className="text-sm truncate max-w-32">{template.name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Duration</span>
                  <span className="font-mono text-sm">{template.video.duration}s</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Segments</span>
                  <span className="font-mono text-sm">{template.segments.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Category</span>
                  <Badge variant="outline">{template.category}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Difficulty</span>
                  <Badge variant="secondary">{template.difficulty}</Badge>
                </div>

                {/* Segments breakdown */}
                <div className="mt-3 pt-3 border-t border-border">
                  <p className="text-xs text-muted-foreground mb-2">Segments:</p>
                  <div className="space-y-1">
                    {template.segments.map((seg, i) => (
                      <div key={seg.id} className="flex items-center gap-2 text-xs">
                        <span className={`w-2 h-2 rounded-full ${
                          seg.type === 'user_capture' ? 'bg-red-500' :
                          seg.type === 'photo_slot' ? 'bg-blue-500' :
                          'bg-gray-500'
                        }`} />
                        <span className="font-mono flex-1 truncate">{seg.id}</span>
                        <span className="text-muted-foreground">{seg.duration}s</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">No template selected</p>
            )}
          </DebugSection>

          {/* Captured Segments */}
          <DebugSection
            title="Captured Segments"
            icon={<Layers className="w-4 h-4" />}
            expanded={expandedSections.segments}
            onToggle={() => toggleSection('segments')}
          >
            {capturedSegments.length > 0 ? (
              <div className="space-y-2">
                {capturedSegments.map((seg, i) => (
                  <div key={seg.id} className="p-2 bg-muted rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs">#{i + 1}</span>
                      <Badge variant="outline" className="text-xs">
                        {seg.duration.toFixed(1)}s
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {seg.blob ? `${(seg.blob.size / 1024).toFixed(0)}KB` : 'No blob'}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Effects: {seg.effects.join(', ') || 'none'}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">No segments captured yet</p>
            )}
          </DebugSection>

          {/* Performance */}
          <DebugSection
            title="Performance"
            icon={<Cpu className="w-4 h-4" />}
            expanded={expandedSections.performance}
            onToggle={() => toggleSection('performance')}
          >
            <div className="space-y-3">
              <PerformanceBar label="FPS" value={metrics.fps} max={60} color="green" />
              <PerformanceBar label="Memory" value={metrics.memory} max={500} suffix="MB" color="blue" />
              <PerformanceBar label="CPU" value={metrics.cpuUsage} max={100} suffix="%" color="orange" />
            </div>
          </DebugSection>
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="p-3 border-t border-border bg-muted/50">
        <p className="text-xs text-muted-foreground text-center">
          Kuaishou Engine v1.0.0
        </p>
      </div>
    </motion.div>
  );
};

// Sub-components
interface DebugSectionProps {
  title: string;
  icon: React.ReactNode;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

const DebugSection: React.FC<DebugSectionProps> = ({
  title,
  icon,
  expanded,
  onToggle,
  children
}) => (
  <div className="border border-border rounded-lg overflow-hidden">
    <button
      onClick={onToggle}
      className="w-full flex items-center gap-2 p-3 bg-muted/50 hover:bg-muted transition-colors"
    >
      {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
      {icon}
      <span className="font-medium text-sm">{title}</span>
    </button>
    {expanded && (
      <div className="p-3 border-t border-border">
        {children}
      </div>
    )}
  </div>
);

interface PerformanceBarProps {
  label: string;
  value: number;
  max: number;
  suffix?: string;
  color: 'green' | 'blue' | 'orange';
}

const PerformanceBar: React.FC<PerformanceBarProps> = ({
  label,
  value,
  max,
  suffix = '',
  color
}) => {
  const percentage = Math.min((value / max) * 100, 100);
  const colorClasses = {
    green: 'bg-green-500',
    blue: 'bg-blue-500',
    orange: 'bg-orange-500'
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="font-mono text-xs">{value}{suffix}</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full ${colorClasses[color]} transition-all duration-300`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

export default KuaishouDebugPanel;
