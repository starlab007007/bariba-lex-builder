import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronRight, MessageCircle, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import BaribaAudioText from '@/components/fitila/BaribaAudioText';

type SceneLine = {
  audio_key: string;
  text_ba: string;
  text_fr: string | null;
  pack: string;
  priority: number;
};

const labels: Record<string, { title: string; emoji: string }> = {
  salutations: { title: 'Salutations', emoji: '👋' },
  famille: { title: 'Famille', emoji: '👨‍👩‍👧' },
  cuisine: { title: 'Cuisine', emoji: '🍲' },
  marche: { title: 'Marché', emoji: '🧺' },
  champ: { title: 'Champ', emoji: '🌾' },
  travail: { title: 'Travail', emoji: '🛠️' },
  sante: { title: 'Santé', emoji: '🩺' },
  voyage: { title: 'Voyage', emoji: '🛣️' },
  nature: { title: 'Nature', emoji: '🌿' },
  communaute: { title: 'Communauté', emoji: '🤝' },
  ceremonies: { title: 'Cérémonies', emoji: '🥁' },
};

export default function FitilaLearnScenes() {
  const navigate = useNavigate();
  const { data = [], isLoading, error } = useQuery({
    queryKey: ['apprendre-web-scenes'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('apprendre_audio_items')
        .select('audio_key, text_ba, text_fr, pack, priority')
        .eq('in_content', true)
        .eq('kind', 'scene')
        .order('pack')
        .order('priority')
        .order('audio_key');
      if (error) throw error;
      return (data || []) as SceneLine[];
    },
    staleTime: 30 * 60 * 1000,
  });

  const grouped = useMemo(() => {
    const map = new Map<string, SceneLine[]>();
    for (const row of data) {
      const key = row.pack.replace(/^scenes:/, '');
      const rows = map.get(key) || [];
      rows.push(row);
      map.set(key, rows);
    }
    return [...map.entries()];
  }, [data]);

  return (
    <div className="h-full overflow-y-auto bg-[#F7F5EC] text-[#241F2E]">
      <div className="sticky top-0 z-20 border-b border-[#E4DFCC] bg-[#F7F5EC]/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <button onClick={() => navigate('/')} className="h-11 w-11 rounded-full border border-[#E4DFCC] bg-white flex items-center justify-center">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="font-extrabold">Scènes de vie</h1>
            <p className="text-xs text-[#6F6955]">Dialogues bàátɔ̀nú · écouter et comprendre</p>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-3xl space-y-5 px-4 py-5 pb-10">
        {isLoading && <div className="flex justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-[#9C6B1D]" /></div>}
        {error && <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">Scènes indisponibles pour le moment.</div>}

        {grouped.map(([key, lines]) => {
          const meta = labels[key] || { title: key, emoji: '💬' };
          return (
            <section key={key} className="overflow-hidden rounded-[24px] border border-[#E4DFCC] bg-white">
              <div className="flex items-center gap-3 border-b border-[#EFE9D7] px-4 py-4">
                <div className="h-11 w-11 rounded-2xl bg-[#F3E3B9] flex items-center justify-center text-xl">{meta.emoji}</div>
                <div className="flex-1">
                  <h2 className="font-extrabold">{meta.title}</h2>
                  <p className="text-xs text-[#6F6955]">{lines.length} répliques</p>
                </div>
                <MessageCircle className="h-5 w-5 text-[#9C6B1D]" />
              </div>
              <div className="divide-y divide-[#F1EDDF]">
                {lines.map((line, index) => (
                  <div key={line.audio_key} className="px-4 py-3">
                    <div className="flex items-start gap-2">
                      <span className="mt-2 w-5 shrink-0 text-[10px] font-bold text-[#A39B87]">{index + 1}</span>
                      <div className="min-w-0 flex-1">
                        <BaribaAudioText
                          text={line.text_ba}
                          textClassName="font-bold leading-snug text-[#241F2E]"
                        />
                        {line.text_fr && <p className="ml-9 mt-1 text-xs leading-relaxed text-[#6F6955]">{line.text_fr}</p>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          );
        })}

        {!isLoading && !error && grouped.length === 0 && (
          <div className="rounded-[24px] border border-[#E4DFCC] bg-white p-8 text-center">
            <p className="font-bold">Les scènes sont en préparation.</p>
            <button onClick={() => navigate('/')} className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-[#9C6B1D]">
              Retour à Apprendre <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
