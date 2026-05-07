import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Loader2 } from 'lucide-react';

export default function ClassStats() {
  const [data, setData] = useState<{
    levelDistribution: Array<{ name: string; value: number }>;
    moduleActivity: Array<{ module: string; answers: number }>;
    gradeDistribution: Array<{ range: string; count: number }>;
  } | null>(null);

  useEffect(() => {
    (async () => {
      const [progress, answers, grades] = await Promise.all([
        supabase.from('classe_student_progress').select('level'),
        supabase.from('classe_student_answers').select('module'),
        supabase.from('classe_student_answers').select('teacher_grade').not('teacher_grade', 'is', null),
      ]);

      const levelMap = new Map<string, number>();
      (progress.data ?? []).forEach(p => levelMap.set(p.level, (levelMap.get(p.level) ?? 0) + 1));

      const modMap = new Map<string, number>();
      (answers.data ?? []).forEach(a => modMap.set(a.module, (modMap.get(a.module) ?? 0) + 1));

      const ranges = [
        { range: '0-5', min: 0, max: 5 },
        { range: '6-9', min: 6, max: 9 },
        { range: '10-12', min: 10, max: 12 },
        { range: '13-15', min: 13, max: 15 },
        { range: '16-20', min: 16, max: 20 },
      ];
      const gradeDist = ranges.map(r => ({
        range: r.range,
        count: (grades.data ?? []).filter(g => {
          const v = g.teacher_grade as number;
          return v >= r.min && v <= r.max;
        }).length,
      }));

      setData({
        levelDistribution: [...levelMap.entries()].map(([name, value]) => ({ name, value })),
        moduleActivity: [...modMap.entries()].map(([module, answers]) => ({ module, answers })),
        gradeDistribution: gradeDist,
      });
    })();
  }, []);

  if (!data) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>;

  const colors = ['#f59e0b', '#6366f1', '#10b981', '#ec4899', '#06b6d4'];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="p-5 rounded-2xl bg-card border border-border">
        <h3 className="font-bold mb-3">Apprenants par niveau</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data.levelDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                {data.levelDistribution.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}
              </Pie>
              <Legend />
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="p-5 rounded-2xl bg-card border border-border">
        <h3 className="font-bold mb-3">Activité par module</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.moduleActivity}>
              <XAxis dataKey="module" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="answers" fill="#f59e0b" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="p-5 rounded-2xl bg-card border border-border md:col-span-2">
        <h3 className="font-bold mb-3">Distribution des notes</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.gradeDistribution}>
              <XAxis dataKey="range" label={{ value: 'Note /20', position: 'insideBottom', offset: -5 }} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#6366f1" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
