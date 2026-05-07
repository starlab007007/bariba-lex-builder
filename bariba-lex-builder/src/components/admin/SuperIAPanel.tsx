import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, Sparkles, Send, Loader2, CheckCircle, AlertCircle, ChevronDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const THEMES = [
  { label: '🎭 Conte traditionnel', value: 'conte traditionnel bariba avec morale' },
  { label: '💬 Proverbe expliqué', value: 'proverbe bariba expliqué avec contexte culturel' },
  { label: '🏛️ Patrimoine Baatonou', value: "histoire du patrimoine baatonou" },
  { label: '🎉 Cérémonie traditionnelle', value: "description d'une cérémonie traditionnelle bariba" },
  { label: '🦁 Légende & animaux', value: 'légende bariba sur la nature et les animaux' },
  { label: '👴 Sagesse des anciens', value: 'sagesse des anciens bariba' },
  { label: '🥁 Récit de griot', value: "récit d'un griot sur l'histoire du Borgou" },
  { label: '🍲 Tradition culinaire', value: 'tradition culinaire bariba' },
];

interface PublishResult {
  success: boolean;
  post_id?: string;
  title?: string;
  text_fr?: string;
  text_ba?: string;
  has_translation?: boolean;
  has_audio?: boolean;
  duration_ms?: number;
  warnings?: string[];
  error?: string;
}

export const SuperIAPanel: React.FC = () => {
  const [selectedTheme, setSelectedTheme] = useState(THEMES[0].value);
  const [customPrompt, setCustomPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<PublishResult | null>(null);
  const [showThemes, setShowThemes] = useState(false);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('super-ia-create', {
        body: {
          theme: selectedTheme,
          prompt: customPrompt || undefined,
        },
      });

      if (error) {
        // Extract more details from FunctionsHttpError
        let errorMsg = error.message || 'Erreur de connexion';
        try {
          const ctx = (error as any).context;
          if (ctx && typeof ctx.json === 'function') {
            const body = await ctx.json();
            errorMsg = body?.error || body?.message || errorMsg;
          }
        } catch {}
        throw new Error(errorMsg);
      }

      setResult(data as PublishResult);

      if (data?.success) {
        toast.success('🤖 Post IA publié avec succès !');
      } else {
        toast.error(data?.error || 'Échec de la publication');
      }
    } catch (err: any) {
      console.error('[SuperIA] Error:', err);
      const msg = err?.message || 'Erreur de connexion';
      toast.error(msg);
      setResult({ success: false, error: msg });
    } finally {
      setIsGenerating(false);
    }
  };

  const selectedThemeLabel = THEMES.find(t => t.value === selectedTheme)?.label || THEMES[0].label;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-violet-600 to-indigo-600 p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-white font-bold text-sm">Super IA — Fitila IA 🤖</h3>
            <p className="text-white/70 text-xs">Créateur automatisé de contenu culturel bariba</p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Theme selector */}
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">Thème</label>
          <button
            onClick={() => setShowThemes(!showThemes)}
            className="w-full flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-200 text-sm text-left hover:bg-gray-100 transition-colors"
          >
            <span>{selectedThemeLabel}</span>
            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showThemes ? 'rotate-180' : ''}`} />
          </button>

          <AnimatePresence>
            {showThemes && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="mt-2 grid grid-cols-2 gap-1">
                  {THEMES.map(theme => (
                    <button
                      key={theme.value}
                      onClick={() => { setSelectedTheme(theme.value); setShowThemes(false); }}
                      className={`text-xs p-2 rounded-lg text-left transition-all ${
                        selectedTheme === theme.value
                          ? 'bg-violet-100 text-violet-700 font-medium'
                          : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      {theme.label}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Custom prompt */}
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">Prompt personnalisé (optionnel)</label>
          <textarea
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            placeholder="Ex: Raconte la légende du roi Kpengla et la fondation de Nikki..."
            className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 text-sm resize-none h-20 focus:outline-none focus:ring-2 focus:ring-violet-300 focus:border-violet-300"
          />
        </div>

        {/* Generate button */}
        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleGenerate}
          disabled={isGenerating}
          className="w-full flex items-center justify-center gap-2 p-3 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-violet-200"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Génération en cours...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              <span>Générer & Publier</span>
              <Send className="w-4 h-4" />
            </>
          )}
        </motion.button>

        {/* Pipeline steps */}
        {isGenerating && (
          <div className="space-y-2 text-xs text-gray-500">
            <div className="flex items-center gap-2"><Loader2 className="w-3 h-3 animate-spin text-violet-500" /> Génération du récit via IA...</div>
            <div className="flex items-center gap-2"><Loader2 className="w-3 h-3 animate-spin text-blue-500" /> Traduction en Bariba (ByT5)...</div>
            <div className="flex items-center gap-2"><Loader2 className="w-3 h-3 animate-spin text-green-500" /> Synthèse vocale (TTS)...</div>
          </div>
        )}

        {/* Result */}
        <AnimatePresence>
          {result && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={`p-4 rounded-xl border ${result.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}
            >
              <div className="flex items-start gap-2">
                {result.success ? (
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 shrink-0" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  {result.success ? (
                    <>
                      <p className="font-medium text-green-800 text-sm">{result.title}</p>
                      <p className="text-green-700 text-xs mt-1 line-clamp-3">{result.text_fr?.substring(0, 200)}...</p>
                      <div className="flex gap-3 mt-2 text-xs text-green-600">
                        <span>✅ Publié</span>
                        {result.has_translation && <span>🔤 Traduit BA</span>}
                        {result.has_audio && <span>🔊 Audio TTS</span>}
                        <span>⏱️ {((result.duration_ms || 0) / 1000).toFixed(1)}s</span>
                      </div>
                      {result.warnings && result.warnings.length > 0 && (
                        <div className="mt-2 text-xs text-amber-600">
                          {result.warnings.map((w, i) => <p key={i}>⚠️ {w}</p>)}
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="text-red-700 text-sm">{result.error}</p>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default SuperIAPanel;
