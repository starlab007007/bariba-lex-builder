import React, { useRef } from 'react';
import { motion } from 'framer-motion';
import { Zap, Copy, Sun, Moon, Monitor, Download, Upload, Info, SlidersHorizontal, Hash, Target } from 'lucide-react';
import { KeyboardSettings } from '@/hooks/useFloatingKeyboard';

interface Props {
  settings: KeyboardSettings;
  onUpdate: (patch: Partial<KeyboardSettings>) => void;
  onExport: () => void;
  onImport: (file: File) => void;
}

export default function KeyboardSettingsPanel({ settings, onUpdate, onExport, onImport }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);

  const themes: { value: KeyboardSettings['theme']; icon: React.ElementType; label: string }[] = [
    { value: 'system', icon: Monitor, label: 'Système' },
    { value: 'light', icon: Sun, label: 'Clair' },
    { value: 'dark', icon: Moon, label: 'Sombre' },
  ];

  return (
    <div className="space-y-5">
      {/* Phonetic Mode */}
      <div className="p-4 rounded-2xl bg-muted/30 border border-border/50">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shrink-0">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm">Mode phonétique</h3>
              <button
                onClick={() => onUpdate({ phoneticMode: !settings.phoneticMode })}
                className={`relative w-11 h-6 rounded-full transition-colors ${settings.phoneticMode ? 'bg-emerald-500' : 'bg-muted-foreground/30'}`}
              >
                <motion.div
                  animate={{ x: settings.phoneticMode ? 22 : 2 }}
                  className="absolute top-1 w-4 h-4 rounded-full bg-white shadow"
                />
              </button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Remplace automatiquement : <span className="font-mono bg-muted px-1 rounded">oo</span>→ɔ,{' '}
              <span className="font-mono bg-muted px-1 rounded">ee</span>→ɛ,{' '}
              <span className="font-mono bg-muted px-1 rounded">ng</span>→ŋ,{' '}
              <span className="font-mono bg-muted px-1 rounded">an</span>→ã
            </p>
          </div>
        </div>
      </div>

      {/* Auto-copy */}
      {/* Phonetic Suggestions Settings */}
      <div className="p-4 rounded-2xl bg-muted/30 border border-border/50">
        <div className="flex items-start gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shrink-0">
            <SlidersHorizontal className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm">Suggestions phonétiques</h3>
              <button
                onClick={() => onUpdate({ suggestionsEnabled: !settings.suggestionsEnabled })}
                className={`relative w-11 h-6 rounded-full transition-colors ${settings.suggestionsEnabled ? 'bg-purple-500' : 'bg-muted-foreground/30'}`}
              >
                <motion.div
                  animate={{ x: settings.suggestionsEnabled ? 22 : 2 }}
                  className="absolute top-1 w-4 h-4 rounded-full bg-white shadow"
                />
              </button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Suggestions de mots en temps réel pendant la saisie
            </p>
          </div>
        </div>
        {settings.suggestionsEnabled && (
          <div className="space-y-4 pl-[52px]">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="flex items-center gap-1.5 text-xs font-medium">
                  <Hash className="w-3.5 h-3.5 text-purple-500" />
                  Nombre de suggestions
                </label>
                <span className="text-xs font-bold text-purple-600 dark:text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-full">
                  {settings.suggestionCount}
                </span>
              </div>
              <input type="range" min={3} max={15} step={1} value={settings.suggestionCount}
                onChange={e => onUpdate({ suggestionCount: Number(e.target.value) })}
                className="w-full h-1.5 rounded-full appearance-none bg-muted cursor-pointer accent-purple-500" />
              <div className="flex justify-between text-[10px] text-muted-foreground mt-0.5">
                <span>3</span><span>15</span>
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="flex items-center gap-1.5 text-xs font-medium">
                  <Target className="w-3.5 h-3.5 text-purple-500" />
                  Seuil de précision
                </label>
                <span className="text-xs font-bold text-purple-600 dark:text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-full">
                  {settings.suggestionThreshold.toFixed(1)}
                </span>
              </div>
              <input type="range" min={0} max={2} step={0.5} value={settings.suggestionThreshold}
                onChange={e => onUpdate({ suggestionThreshold: Number(e.target.value) })}
                className="w-full h-1.5 rounded-full appearance-none bg-muted cursor-pointer accent-purple-500" />
              <div className="flex justify-between text-[10px] text-muted-foreground mt-0.5">
                <span>Souple (0)</span><span>Strict (2)</span>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">
                Plus le seuil est élevé, plus les suggestions sont précises mais moins nombreuses
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Auto-copy */}
      <div className="p-4 rounded-2xl bg-muted/30 border border-border/50">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center shrink-0">
            <Copy className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm">Copie automatique</h3>
              <button
                onClick={() => onUpdate({ autoCopy: !settings.autoCopy })}
                className={`relative w-11 h-6 rounded-full transition-colors ${settings.autoCopy ? 'bg-blue-500' : 'bg-muted-foreground/30'}`}
              >
                <motion.div
                  animate={{ x: settings.autoCopy ? 22 : 2 }}
                  className="absolute top-1 w-4 h-4 rounded-full bg-white shadow"
                />
              </button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Copie le texte automatiquement à chaque sélection de mot. Réduisez les étapes de collage !
            </p>
          </div>
        </div>
      </div>

      {/* Theme */}
      <div className="p-4 rounded-2xl bg-muted/30 border border-border/50">
        <h3 className="font-semibold text-sm mb-3">Thème du clavier</h3>
        <div className="grid grid-cols-3 gap-2">
          {themes.map(t => (
            <button
              key={t.value}
              onClick={() => onUpdate({ theme: t.value })}
              className={`flex flex-col items-center gap-1.5 p-3 rounded-xl transition-all ${
                settings.theme === t.value
                  ? 'bg-amber-500/15 border-2 border-amber-500 shadow-sm'
                  : 'bg-muted/50 border-2 border-transparent hover:bg-muted'
              }`}
            >
              <t.icon className={`w-5 h-5 ${settings.theme === t.value ? 'text-amber-500' : 'text-muted-foreground'}`} />
              <span className={`text-xs font-medium ${settings.theme === t.value ? 'text-amber-600 dark:text-amber-400' : ''}`}>
                {t.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Export / Import */}
      <div className="p-4 rounded-2xl bg-muted/30 border border-border/50">
        <h3 className="font-semibold text-sm mb-3">Sauvegarde des données</h3>
        <p className="text-xs text-muted-foreground mb-3">
          Exportez vos favoris, historique et mots récents pour les retrouver sur un autre appareil.
        </p>
        <div className="flex gap-2">
          <button
            onClick={onExport}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-sm font-medium hover:bg-emerald-500/25 transition-colors"
          >
            <Download className="w-4 h-4" />
            Exporter
          </button>
          <button
            onClick={() => fileRef.current?.click()}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-blue-500/15 text-blue-700 dark:text-blue-300 text-sm font-medium hover:bg-blue-500/25 transition-colors"
          >
            <Upload className="w-4 h-4" />
            Importer
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".json"
            className="hidden"
            onChange={e => {
              const file = e.target.files?.[0];
              if (file) onImport(file);
              e.target.value = '';
            }}
          />
        </div>
      </div>

      {/* Native keyboard info */}
      <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20">
        <div className="flex items-start gap-2">
          <Info className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
          <div>
            <h4 className="font-semibold text-sm text-amber-700 dark:text-amber-400">Clavier natif Android</h4>
            <p className="text-xs text-muted-foreground mt-1">
              Le clavier Bariba natif est intégré dans l'APK. Activez-le dans l'onglet
              <span className="inline-flex items-center mx-1 text-amber-600 dark:text-amber-400 font-medium">📱 Natif</span>
              pour l'utiliser dans WhatsApp, SMS et toutes les applications.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}