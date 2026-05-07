import { useNavigate } from 'react-router-dom';
import { MODULE_CATALOG, getLessonsForModule } from '@/lib/classeContentKeys';
import { useModuleAudioCounts } from '@/hooks/useClasseAudio';
import { ChevronRight, Mic } from 'lucide-react';
import { useMemo } from 'react';

function ModuleCard({ level, module, label, emoji }: { level: 'N1' | 'N2'; module: any; label: string; emoji: string }) {
  const nav = useNavigate();
  const lessons = useMemo(() => getLessonsForModule(level, module), [level, module]);
  const { data: counts } = useModuleAudioCounts(level, module);
  const totalItems = lessons.reduce((s, l) => s + l.itemsCount, 0);
  let approved = 0; let inProgress = 0;
  if (counts) for (const v of counts.values()) { approved += v.approved; inProgress += v.submitted + v.draft; }
  const pct = totalItems > 0 ? Math.round((approved / totalItems) * 100) : 0;
  return (
    <button
      onClick={() => nav(`/fitila/teacher/voice-reading/${level}/${module}`)}
      className="w-full text-left p-4 rounded-2xl border border-border bg-card hover:bg-muted/40 transition-colors flex items-center gap-3"
    >
      <span className="text-3xl">{emoji}</span>
      <div className="flex-1 min-w-0">
        <div className="font-bold text-base">{label}</div>
        <div className="text-xs text-muted-foreground">
          {lessons.length} leçons · {approved}/{totalItems} approuvés{inProgress ? ` · ${inProgress} en cours` : ''}
        </div>
        <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
          <div className="h-full bg-amber-500 transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>
      <ChevronRight className="w-5 h-5 text-muted-foreground" />
    </button>
  );
}

export default function VoiceReadingHome() {
  const n1 = MODULE_CATALOG.filter(m => m.level === 'N1');
  const n2 = MODULE_CATALOG.filter(m => m.level === 'N2');
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center"><Mic className="w-6 h-6" /></div>
        <div>
          <h1 className="text-xl md:text-2xl font-black">Lecture Vocale des Contenus</h1>
          <p className="text-sm text-muted-foreground">Enregistrez l'audio de chaque texte, question et exercice du manuel.</p>
        </div>
      </div>

      <section>
        <h2 className="font-black text-lg mb-3">Niveau 1</h2>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {n1.map(m => <ModuleCard key={`${m.level}-${m.module}`} {...m} />)}
        </div>
      </section>
      <section>
        <h2 className="font-black text-lg mb-3">Niveau 2</h2>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {n2.map(m => <ModuleCard key={`${m.level}-${m.module}`} {...m} />)}
        </div>
      </section>
    </div>
  );
}