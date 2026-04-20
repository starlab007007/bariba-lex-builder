import { useNavigate, useParams } from 'react-router-dom';
import { getLessonsForModule, moduleLabel, type ModuleKey } from '@/lib/classeContentKeys';
import { useModuleAudioCounts } from '@/hooks/useClasseAudio';
import { ArrowLeft, ChevronRight, CheckCircle2, Circle, Clock } from 'lucide-react';
import { useMemo } from 'react';

export default function VoiceReadingLessons() {
  const { level, module } = useParams<{ level: string; module: string }>();
  const nav = useNavigate();
  const lvl = (level as 'N1' | 'N2') ?? 'N1';
  const mod = (module as ModuleKey) ?? 'lang';
  const lessons = useMemo(() => getLessonsForModule(lvl, mod), [lvl, mod]);
  const { data: counts } = useModuleAudioCounts(lvl, mod);

  return (
    <div className="space-y-4">
      <button onClick={() => nav('/fitila/teacher/voice-reading')} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="w-4 h-4" /> Tous les modules
      </button>
      <h1 className="text-xl md:text-2xl font-black">{lvl} · {moduleLabel(mod)} — {lessons.length} leçons</h1>

      <div className="grid gap-2">
        {lessons.map(l => {
          const c = counts?.get(l.lesson_id);
          const approved = c?.approved ?? 0;
          const total = l.itemsCount;
          const allDone = approved === total && total > 0;
          const inProg = (c?.submitted ?? 0) + (c?.draft ?? 0) > 0;
          const Icon = allDone ? CheckCircle2 : inProg ? Clock : Circle;
          const iconCls = allDone ? 'text-emerald-500' : inProg ? 'text-amber-500' : 'text-muted-foreground';
          return (
            <button
              key={l.lesson_id}
              onClick={() => nav(`/fitila/teacher/voice-reading/${lvl}/${mod}/${l.lesson_id}`)}
              className="w-full text-left p-3 md:p-4 rounded-xl border border-border bg-card hover:bg-muted/40 transition-colors flex items-center gap-3"
            >
              <Icon className={`w-5 h-5 ${iconCls}`} />
              <div className="flex-1 min-w-0">
                <div className="font-semibold truncate">L{l.lesson_id} · {l.title}</div>
                <div className="text-xs text-muted-foreground">{approved}/{total} audios approuvés</div>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </button>
          );
        })}
      </div>
    </div>
  );
}