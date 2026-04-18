import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Save, Download, Upload, RefreshCw } from 'lucide-react';

interface WeightRow {
  id?: string;
  level: string;
  module: string;
  lesson_id: string;
  section_key: string;
  question_idx: number;
  weight: number;
  section_weight: number;
  lesson_weight: number;
}

const LEVELS = ['N1', 'N2'];
const MODULES = ['lesson', 'calcul', 'gestion', 'grammaire', 'textprod', 'evaluation'];

export default function WeightsManager() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [rows, setRows] = useState<WeightRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [filterLevel, setFilterLevel] = useState<string>('N1');
  const [filterModule, setFilterModule] = useState<string>('lesson');
  const [newRow, setNewRow] = useState<WeightRow>({
    level: 'N1',
    module: 'lesson',
    lesson_id: '',
    section_key: '',
    question_idx: 0,
    weight: 1,
    section_weight: 1,
    lesson_weight: 1,
  });

  const fetchRows = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('classe_grade_weights')
      .select('*')
      .order('level').order('module').order('lesson_id').order('section_key').order('question_idx');
    setRows((data ?? []) as WeightRow[]);
    setLoading(false);
  };

  useEffect(() => { fetchRows(); }, []);

  const filtered = useMemo(
    () => rows.filter((r) => r.level === filterLevel && r.module === filterModule),
    [rows, filterLevel, filterModule]
  );

  const saveRow = async (row: WeightRow) => {
    setSaving(row.id ?? 'new');
    const payload = { ...row, updated_by: user?.id, created_by: row.id ? undefined : user?.id };
    const { error } = await supabase
      .from('classe_grade_weights')
      .upsert(payload, { onConflict: 'level,module,lesson_id,section_key,question_idx' });
    setSaving(null);
    if (error) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Poids enregistré' });
    fetchRows();
  };

  const deleteRow = async (id: string) => {
    if (!confirm('Supprimer ce poids ?')) return;
    await supabase.from('classe_grade_weights').delete().eq('id', id);
    fetchRows();
  };

  const exportCSV = () => {
    const header = 'level,module,lesson_id,section_key,question_idx,weight,section_weight,lesson_weight\n';
    const csv = header + rows.map((r) =>
      `${r.level},${r.module},${r.lesson_id},${r.section_key},${r.question_idx},${r.weight},${r.section_weight},${r.lesson_weight}`
    ).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bareme-classe-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importCSV = async (file: File) => {
    const text = await file.text();
    const lines = text.split('\n').slice(1).filter(Boolean);
    const parsed: WeightRow[] = lines.map((l) => {
      const [level, module, lesson_id, section_key, question_idx, weight, section_weight, lesson_weight] = l.split(',');
      return {
        level, module, lesson_id, section_key,
        question_idx: parseInt(question_idx) || 0,
        weight: parseFloat(weight) || 1,
        section_weight: parseFloat(section_weight) || 1,
        lesson_weight: parseFloat(lesson_weight) || 1,
      };
    });
    const { error } = await supabase
      .from('classe_grade_weights')
      .upsert(parsed.map((p) => ({ ...p, created_by: user?.id })), { onConflict: 'level,module,lesson_id,section_key,question_idx' });
    if (error) toast({ title: 'Import échoué', description: error.message, variant: 'destructive' });
    else { toast({ title: `${parsed.length} barèmes importés` }); fetchRows(); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-black">⚖️ Barèmes de notation</h1>
          <p className="text-xs text-muted-foreground">Définissez le poids de chaque question, section et leçon. Sans configuration, poids = 1 partout.</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={exportCSV} variant="outline" size="sm"><Download className="w-4 h-4 mr-1" />CSV</Button>
          <label className="cursor-pointer">
            <input type="file" accept=".csv" hidden onChange={(e) => e.target.files?.[0] && importCSV(e.target.files[0])} />
            <span className="inline-flex items-center text-sm font-semibold px-3 py-1.5 rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/80">
              <Upload className="w-4 h-4 mr-1" />Importer
            </span>
          </label>
          <Button onClick={fetchRows} variant="outline" size="sm"><RefreshCw className="w-4 h-4" /></Button>
        </div>
      </div>

      <div className="flex gap-2 text-sm">
        <select value={filterLevel} onChange={(e) => setFilterLevel(e.target.value)} className="px-3 py-2 rounded border border-border bg-background">
          {LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
        </select>
        <select value={filterModule} onChange={(e) => setFilterModule(e.target.value)} className="px-3 py-2 rounded border border-border bg-background">
          {MODULES.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>

      {/* Ajout rapide */}
      <div className="p-3 rounded-xl bg-muted/30 border border-border space-y-2">
        <p className="text-xs font-bold text-muted-foreground">AJOUTER UN BARÈME</p>
        <div className="grid grid-cols-2 md:grid-cols-8 gap-2 text-xs">
          <select value={newRow.level} onChange={(e) => setNewRow({ ...newRow, level: e.target.value })} className="px-2 py-1.5 rounded border border-border bg-background">
            {LEVELS.map((l) => <option key={l}>{l}</option>)}
          </select>
          <select value={newRow.module} onChange={(e) => setNewRow({ ...newRow, module: e.target.value })} className="px-2 py-1.5 rounded border border-border bg-background">
            {MODULES.map((m) => <option key={m}>{m}</option>)}
          </select>
          <Input placeholder="Leçon" value={newRow.lesson_id} onChange={(e) => setNewRow({ ...newRow, lesson_id: e.target.value })} />
          <Input placeholder="Section" value={newRow.section_key} onChange={(e) => setNewRow({ ...newRow, section_key: e.target.value })} />
          <Input type="number" placeholder="Q#" value={newRow.question_idx} onChange={(e) => setNewRow({ ...newRow, question_idx: parseInt(e.target.value) || 0 })} />
          <Input type="number" step={0.5} placeholder="Poids Q" value={newRow.weight} onChange={(e) => setNewRow({ ...newRow, weight: parseFloat(e.target.value) || 1 })} />
          <Input type="number" step={0.5} placeholder="Poids Sect" value={newRow.section_weight} onChange={(e) => setNewRow({ ...newRow, section_weight: parseFloat(e.target.value) || 1 })} />
          <Button size="sm" onClick={() => saveRow(newRow)} disabled={!newRow.lesson_id || saving === 'new'}>
            {saving === 'new' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* Tableau */}
      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <p className="p-6 text-center text-sm text-muted-foreground rounded-xl bg-muted/30">Aucun barème pour ce filtre. Tous les questions auront un poids de 1.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-muted text-left">
              <tr>
                <th className="p-2">Leçon</th>
                <th className="p-2">Section</th>
                <th className="p-2">Q#</th>
                <th className="p-2">Poids Q</th>
                <th className="p-2">Poids Section</th>
                <th className="p-2">Poids Leçon</th>
                <th className="p-2"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="border-b border-border">
                  <td className="p-2 font-mono">{r.lesson_id}</td>
                  <td className="p-2 font-mono">{r.section_key || '—'}</td>
                  <td className="p-2">{r.question_idx + 1}</td>
                  <td className="p-2"><Input type="number" step={0.5} className="h-7 w-20" defaultValue={r.weight} onBlur={(e) => saveRow({ ...r, weight: parseFloat(e.target.value) || 1 })} /></td>
                  <td className="p-2"><Input type="number" step={0.5} className="h-7 w-20" defaultValue={r.section_weight} onBlur={(e) => saveRow({ ...r, section_weight: parseFloat(e.target.value) || 1 })} /></td>
                  <td className="p-2"><Input type="number" step={0.5} className="h-7 w-20" defaultValue={r.lesson_weight} onBlur={(e) => saveRow({ ...r, lesson_weight: parseFloat(e.target.value) || 1 })} /></td>
                  <td className="p-2"><button onClick={() => r.id && deleteRow(r.id)} className="text-rose-500 hover:underline">Suppr</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
