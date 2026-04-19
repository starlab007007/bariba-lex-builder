import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Loader2, Mic, Users, Clock, FileAudio } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface KPI {
  totalPhrases: number;
  totalRecordings: number;
  totalDurationSec: number;
  uniqueContributors: number;
}

interface CategoryStat {
  category: string;
  phrase_count: number;
  recording_count: number;
}

interface ContributorStat {
  user_id: string;
  username: string | null;
  recording_count: number;
}

export default function VoiceCorpusAdmin() {
  const navigate = useNavigate();
  const { isAdmin, loading: authLoading } = useAuth();
  const [kpi, setKpi] = useState<KPI>({ totalPhrases: 0, totalRecordings: 0, totalDurationSec: 0, uniqueContributors: 0 });
  const [byCategory, setByCategory] = useState<CategoryStat[]>([]);
  const [topContributors, setTopContributors] = useState<ContributorStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>('all');

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      toast.error('Accès réservé aux administrateurs');
      navigate('/fitila');
    }
  }, [isAdmin, authLoading, navigate]);

  useEffect(() => {
    if (!isAdmin) return;
    loadStats();
  }, [isAdmin]);

  const loadStats = async () => {
    setLoading(true);
    try {
      // KPI
      const [
        { count: totalPhrases },
        { data: recordings, count: totalRecordings },
      ] = await Promise.all([
        supabase.from('bariba_corpus_phrases').select('id', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('bariba_voice_recordings').select('user_id, duration_seconds', { count: 'exact' }),
      ]);

      const totalDurationSec = (recordings || []).reduce((acc, r: any) => acc + (Number(r.duration_seconds) || 0), 0);
      const uniqueContributors = new Set((recordings || []).map((r: any) => r.user_id)).size;

      setKpi({
        totalPhrases: totalPhrases || 0,
        totalRecordings: totalRecordings || 0,
        totalDurationSec,
        uniqueContributors,
      });

      // By category
      const { data: phrases } = await supabase
        .from('bariba_corpus_phrases')
        .select('category, recordings_count')
        .eq('is_active', true);
      const catMap = new Map<string, CategoryStat>();
      (phrases || []).forEach((p: any) => {
        const s = catMap.get(p.category) || { category: p.category, phrase_count: 0, recording_count: 0 };
        s.phrase_count += 1;
        s.recording_count += p.recordings_count || 0;
        catMap.set(p.category, s);
      });
      setByCategory(Array.from(catMap.values()).sort((a, b) => b.recording_count - a.recording_count));

      // Top contributors
      const counts = new Map<string, number>();
      (recordings || []).forEach((r: any) => {
        counts.set(r.user_id, (counts.get(r.user_id) || 0) + 1);
      });
      const top = Array.from(counts.entries())
        .map(([user_id, recording_count]) => ({ user_id, username: null, recording_count }))
        .sort((a, b) => b.recording_count - a.recording_count)
        .slice(0, 10);

      // Resolve usernames
      if (top.length) {
        const { data: profs } = await supabase
          .from('tamtam_profiles')
          .select('user_id, username, display_name')
          .in('user_id', top.map(t => t.user_id));
        top.forEach(t => {
          const p = profs?.find((x: any) => x.user_id === t.user_id);
          t.username = p?.display_name || p?.username || null;
        });
      }
      setTopContributors(top);
    } catch (e: any) {
      console.error(e);
      toast.error('Erreur de chargement');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const { data, error } = await supabase.functions.invoke('voice-corpus-export', {
        body: { category: filterCategory === 'all' ? null : filterCategory },
      });
      if (error) throw error;
      if (data?.download_url) {
        window.open(data.download_url, '_blank');
        toast.success(`Corpus prêt : ${data.recording_count} fichiers`);
      } else {
        toast.error('Aucun lien retourné');
      }
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Erreur d'export");
    } finally {
      setExporting(false);
    }
  };

  const formatDuration = (sec: number) => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    return h > 0 ? `${h}h ${m}min` : `${m}min`;
  };

  if (authLoading || !isAdmin) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-rose-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/admin')} className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-2xl font-black text-gray-900">🎙️ Voice Corpus Admin</h1>
            <p className="text-sm text-gray-500">Statistiques & export du corpus audio Bariba</p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-rose-500" />
          </div>
        ) : (
          <>
            {/* KPI cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <KpiCard icon={<FileAudio />} label="Phrases" value={kpi.totalPhrases.toLocaleString()} color="from-rose-500 to-pink-500" />
              <KpiCard icon={<Mic />} label="Enregistrements" value={kpi.totalRecordings.toLocaleString()} color="from-emerald-500 to-teal-500" />
              <KpiCard icon={<Clock />} label="Durée totale" value={formatDuration(kpi.totalDurationSec)} color="from-blue-500 to-cyan-500" />
              <KpiCard icon={<Users />} label="Contributeurs" value={kpi.uniqueContributors.toString()} color="from-purple-500 to-indigo-500" />
            </div>

            {/* Export panel */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-rose-100">
              <h2 className="text-lg font-bold mb-3">📥 Télécharger le corpus</h2>
              <div className="flex flex-wrap items-center gap-3">
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="px-4 py-2 rounded-xl border border-gray-200 bg-white text-sm"
                >
                  <option value="all">Toutes les catégories</option>
                  {byCategory.map(c => (
                    <option key={c.category} value={c.category}>{c.category}</option>
                  ))}
                </select>
                <button
                  onClick={handleExport}
                  disabled={exporting || kpi.totalRecordings === 0}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 text-white font-bold text-sm flex items-center gap-2 shadow-md disabled:opacity-50"
                >
                  {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                  {exporting ? 'Préparation…' : 'Exporter ZIP'}
                </button>
                <p className="text-xs text-gray-500 ml-auto">Format : metadata.csv + dossier audio/</p>
              </div>
            </div>

            {/* Category breakdown */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-rose-100">
              <h2 className="text-lg font-bold mb-3">📊 Par catégorie</h2>
              <div className="space-y-2">
                {byCategory.map(c => {
                  const ratio = c.phrase_count > 0 ? (c.recording_count / c.phrase_count) : 0;
                  return (
                    <div key={c.category} className="flex items-center gap-3">
                      <div className="w-48 text-sm font-medium truncate">{c.category}</div>
                      <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-rose-400 to-pink-500"
                          style={{ width: `${Math.min(ratio * 20, 100)}%` }}
                        />
                      </div>
                      <div className="text-xs text-gray-600 w-32 text-right">
                        {c.recording_count} rec / {c.phrase_count} phrases
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Top contributors */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-rose-100">
              <h2 className="text-lg font-bold mb-3">🏆 Top contributeurs</h2>
              <div className="space-y-2">
                {topContributors.length === 0 && (
                  <p className="text-sm text-gray-500">Aucun enregistrement pour l'instant.</p>
                )}
                {topContributors.map((c, i) => (
                  <div key={c.user_id} className="flex items-center gap-3 py-2 border-b border-gray-100 last:border-0">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs ${
                      i === 0 ? 'bg-amber-500' : i === 1 ? 'bg-gray-400' : i === 2 ? 'bg-orange-500' : 'bg-gray-300'
                    }`}>
                      {i + 1}
                    </div>
                    <div className="flex-1 text-sm font-medium">{c.username || c.user_id.slice(0, 8)}</div>
                    <div className="text-sm font-bold text-rose-600">{c.recording_count}</div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function KpiCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-rose-100">
      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center text-white mb-2`}>
        {icon}
      </div>
      <div className="text-2xl font-black text-gray-900">{value}</div>
      <div className="text-xs text-gray-500 uppercase font-bold tracking-wide">{label}</div>
    </div>
  );
}
