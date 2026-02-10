/**
 * BeautyControlsPanel.tsx
 * Premium glassmorphism UI for TikTok-like beauty/color pipeline controls.
 *
 * Features:
 * - Sliders: Beauty, Look Strength, Sharpen, Denoise (0-100)
 * - Toggles: Stabilization (Beta), A/B Preview (hold to compare)
 * - Resolution/FPS selector
 * - Performance monitor (dev mode)
 * - Settings persist via the useTikTokLook hook
 */

import React, { useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Sparkles,
  Sun,
  Contrast,
  Focus,
  Shield,
  Eye,
  Activity,
  Monitor,
} from 'lucide-react';
import type { PipelineSettings, PerformanceStats, QualityPreset } from '@/lib/TikTokLookPipeline';

interface BeautyControlsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  settings: PipelineSettings;
  onUpdateSettings: (partial: Partial<PipelineSettings>) => void;
  stats: PerformanceStats;
  onShowRaw: (raw: boolean) => void;
  showingRaw: boolean;
  pipelineActive: boolean;
  devMode?: boolean;
}

const QUALITY_LABELS: Record<QualityPreset, string> = {
  low: '480p • Rapide',
  standard: '720p • Équilibré',
  high: '1080p • Qualité Max',
};

export function BeautyControlsPanel({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  stats,
  onShowRaw,
  showingRaw,
  pipelineActive,
  devMode = false,
}: BeautyControlsPanelProps) {
  const handleSlider = useCallback(
    (key: keyof PipelineSettings, value: number[]) => {
      onUpdateSettings({ [key]: value[0] });
    },
    [onUpdateSettings]
  );

  const cycleQuality = useCallback(() => {
    const order: QualityPreset[] = ['low', 'standard', 'high'];
    const idx = order.indexOf(settings.qualityPreset);
    const next = order[(idx + 1) % order.length];
    onUpdateSettings({ qualityPreset: next });
  }, [settings.qualityPreset, onUpdateSettings]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 z-[120] bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="absolute left-0 right-0 bottom-0 rounded-t-[28px] bg-[#0b0b0e]/95 backdrop-blur-xl border-t border-white/10 p-4 max-h-[65vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drag handle */}
            <div className="w-12 h-1 bg-white/20 rounded-full mx-auto mb-4" />

            {/* Header */}
            <div className="font-semibold mb-5 flex items-center justify-between">
              <div className="flex items-center gap-2 text-white">
                <Sparkles className="h-5 w-5 text-amber-400" />
                <span>TikTok Look</span>
                {pipelineActive && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    GPU
                  </span>
                )}
              </div>
              <button
                onClick={cycleQuality}
                className="text-xs px-3 py-1.5 rounded-full bg-white/10 text-white/70 hover:bg-white/20 transition-colors"
              >
                {QUALITY_LABELS[settings.qualityPreset]}
              </button>
            </div>

            {/* Sliders */}
            <div className="space-y-5">
              {/* Beauty */}
              <SliderRow
                icon={<Sparkles className="h-4 w-4 text-pink-400" />}
                label="Beauté"
                value={settings.beautyIntensity}
                enabled={settings.beautyEnabled}
                onToggle={(v) => onUpdateSettings({ beautyEnabled: v })}
                onChange={(v) => handleSlider('beautyIntensity', v)}
              />

              {/* Look Strength */}
              <SliderRow
                icon={<Sun className="h-4 w-4 text-amber-400" />}
                label="Look TikTok"
                value={settings.lookStrength}
                enabled={settings.toneMapEnabled}
                onToggle={(v) => onUpdateSettings({ toneMapEnabled: v })}
                onChange={(v) => handleSlider('lookStrength', v)}
              />

              {/* Sharpen */}
              <SliderRow
                icon={<Focus className="h-4 w-4 text-cyan-400" />}
                label="Netteté"
                value={settings.sharpenIntensity}
                enabled={settings.sharpenEnabled}
                onToggle={(v) => onUpdateSettings({ sharpenEnabled: v })}
                onChange={(v) => handleSlider('sharpenIntensity', v)}
              />

              {/* Denoise */}
              <SliderRow
                icon={<Contrast className="h-4 w-4 text-violet-400" />}
                label="Réduction bruit"
                value={settings.denoiseIntensity}
                enabled={settings.denoiseEnabled}
                onToggle={(v) => onUpdateSettings({ denoiseEnabled: v })}
                onChange={(v) => handleSlider('denoiseIntensity', v)}
              />
            </div>

            {/* Toggles */}
            <div className="mt-6 space-y-3">
              {/* Stabilization */}
              <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-blue-400" />
                  <Label className="text-white/80 text-sm">
                    Stabilisation
                    <span className="ml-1.5 text-[9px] px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
                      BETA
                    </span>
                  </Label>
                </div>
                <Switch
                  checked={settings.stabilizationEnabled}
                  onCheckedChange={(v) => onUpdateSettings({ stabilizationEnabled: v })}
                />
              </div>

              {/* A/B Preview */}
              <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-2">
                  <Eye className="h-4 w-4 text-emerald-400" />
                  <Label className="text-white/80 text-sm">Avant/Après</Label>
                </div>
                <motion.button
                  className="px-4 py-1.5 rounded-full text-xs font-medium bg-white/10 text-white/70 border border-white/10"
                  onPointerDown={() => onShowRaw(true)}
                  onPointerUp={() => onShowRaw(false)}
                  onPointerLeave={() => onShowRaw(false)}
                  whileTap={{ scale: 0.95, backgroundColor: 'rgba(255,255,255,0.2)' }}
                >
                  {showingRaw ? '👁️ Sans effets' : 'Maintenir pour voir'}
                </motion.button>
              </div>
            </div>

            {/* Performance Monitor (dev mode only) */}
            {devMode && (
              <div className="mt-5 p-3 rounded-xl bg-white/5 border border-white/10">
                <div className="flex items-center gap-2 mb-2">
                  <Activity className="h-3.5 w-3.5 text-emerald-400" />
                  <span className="text-[11px] font-medium text-white/60">Performance</span>
                </div>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div>
                    <div className="text-lg font-bold text-white">{stats.fps}</div>
                    <div className="text-[9px] text-white/40">FPS</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-white">{stats.frameTimeMs.toFixed(1)}</div>
                    <div className="text-[9px] text-white/40">ms/frame</div>
                  </div>
                  <div>
                    <div className={`text-lg font-bold ${
                      stats.gpuLoad === 'low' ? 'text-emerald-400' :
                      stats.gpuLoad === 'medium' ? 'text-amber-400' : 'text-red-400'
                    }`}>
                      {stats.gpuLoad.toUpperCase()}
                    </div>
                    <div className="text-[9px] text-white/40">GPU</div>
                  </div>
                </div>
              </div>
            )}

            {/* Bottom safe area */}
            <div className="h-6" />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ---------- Internal slider row component ----------

function SliderRow({
  icon,
  label,
  value,
  enabled,
  onToggle,
  onChange,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  enabled: boolean;
  onToggle: (v: boolean) => void;
  onChange: (v: number[]) => void;
}) {
  return (
    <div className={`transition-opacity ${enabled ? 'opacity-100' : 'opacity-40'}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-sm text-white/80">{label}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-white/50 tabular-nums w-8 text-right">{value}</span>
          <Switch
            checked={enabled}
            onCheckedChange={onToggle}
            className="scale-75"
          />
        </div>
      </div>
      <Slider
        value={[value]}
        min={0}
        max={100}
        step={1}
        onValueChange={onChange}
        disabled={!enabled}
        className="w-full"
      />
    </div>
  );
}

export default BeautyControlsPanel;
