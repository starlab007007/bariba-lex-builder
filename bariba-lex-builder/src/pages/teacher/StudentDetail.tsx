import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, ArrowLeft, MessageSquare, BookA, GraduationCap, Phone } from 'lucide-react';
import AnswerReview from '@/components/teacher/AnswerReview';

interface ProfileFull {
  display_name?: string;
  username?: string;
  avatar_url?: string;
  phone_number?: string;
  bio?: string;
  followers_count?: number;
  following_count?: number;
  created_at?: string;
  total_points?: number;
  level?: number;
}

export default function StudentDetail() {
  const { id } = useParams<{ id: string }>();
  const [profile, setProfile] = useState<ProfileFull | null>(null);
  const [progress, setProgress] = useState<Array<{ level: string; completed_lessons: number[]; lesson_stars: Record<string, number>; updated_at?: string }>>([]);
  const [evaluations, setEvaluations] = useState<Array<{ level: string; evaluation_id: string; best_score: number; attempts: number }>>([]);
  const [answers, setAnswers] = useState<Parameters<typeof AnswerReview>[0]['answer'][]>([]);
  const [posts, setPosts] = useState<Array<{ id: string; created_at: string; transcript_fr?: string }>>([]);
  const [contributions, setContributions] = useState<Array<{ id: string; word: string; definition: string; created_at: string }>>([]);
  const [filter, setFilter] = useState<'all' | 'pending' | 'graded'>('all');
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      const [profileRes, progressRes, evalsRes, ansRes, postsRes, contribRes] = await Promise.all([
        supabase.from('tamtam_profiles').select('display_name, username, avatar_url, phone_number, bio, followers_count, following_count, created_at, total_points, level').eq('user_id', id).maybeSingle(),
        supabase.from('classe_student_progress').select('level, completed_lessons, lesson_stars, updated_at').eq('user_id', id),
        supabase.from('classe_evaluation_results').select('level, evaluation_id, best_score, attempts').eq('user_id', id),
        supabase.from('classe_student_answers')
          .select('id, user_id, level, module, lesson_id, section_key, question_idx, answer_text, answer_audio_path, answer_audio_duration, field_data, score, max_score, teacher_grade, teacher_comment, teacher_audio_path, teacher_audio_duration, updated_at')
          .eq('user_id', id)
          .order('updated_at', { ascending: false })
          .limit(500),
        supabase.from('tamtam_posts').select('id, created_at, transcript_fr').eq('user_id', id).order('created_at', { ascending: false }).limit(20),
        supabase.from('dictionary_entries').select('id, word, definition, created_at').eq('created_by', id).order('created_at', { ascending: false }).limit(20),
      ]);
      setProfile(profileRes.data as never);
      setProgress((progressRes.data ?? []) as never);
      setEvaluations((evalsRes.data ?? []) as never);
      setAnswers((ansRes.data ?? []) as never);
      setPosts((postsRes.data ?? []) as never);
      setContributions((contribRes.data ?? []) as never);
      setLoading(false);
    })();
  }, [id, tick]);

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>;

  const visible = answers.filter(a => filter === 'all' || (filter === 'pending' ? a.teacher_grade === null : a.teacher_grade !== null));
  const studentName = (() => {
    const dn = profile?.display_name?.trim();
    if (dn && dn !== 'Nouvel utilisateur') return dn;
    const un = profile?.username?.trim();
    if (un && !un.startsWith('user_')) return `@${un}`;
    if (profile?.phone_number) return `📱 ${profile.phone_number.replace(/\D/g, '').slice(-8)}`;
    return `Apprenant ${id?.slice(0, 4).toUpperCase()}`;
  })();
  const lastActivity = progress.reduce<string | null>((acc, p) => (!acc || (p.updated_at && p.updated_at > acc)) ? (p.updated_at ?? acc) : acc, null);

  return (
    <div className="space-y-5">
      <Link to="/fitila/teacher/students" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="w-4 h-4" /> Tous les apprenants
      </Link>

      {/* Profil */}
      <div className="p-5 rounded-2xl bg-card border border-border">
        <div className="flex items-center gap-4">
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt="" className="w-16 h-16 rounded-full object-cover" />
          ) : (
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white text-2xl font-black">
              {(studentName ?? '?').charAt(0).toUpperCase()}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-black truncate">{studentName}</h1>
            {profile?.username && <p className="text-xs text-muted-foreground">@{profile.username}</p>}
            {profile?.phone_number && (
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                <Phone className="w-3 h-3" /> {profile.phone_number}
              </p>
            )}
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-4 text-xs">
          <div className="p-2 rounded-lg bg-muted/40"><span className="text-muted-foreground">Inscrit</span><br /><span className="font-bold">{profile?.created_at ? new Date(profile.created_at).toLocaleDateString('fr-FR') : '—'}</span></div>
          <div className="p-2 rounded-lg bg-muted/40"><span className="text-muted-foreground">Dernière activité</span><br /><span className="font-bold">{lastActivity ? new Date(lastActivity).toLocaleDateString('fr-FR') : '—'}</span></div>
          <div className="p-2 rounded-lg bg-muted/40"><span className="text-muted-foreground">Points</span><br /><span className="font-bold">{profile?.total_points ?? 0}</span></div>
          <div className="p-2 rounded-lg bg-muted/40"><span className="text-muted-foreground">Niveau XP</span><br /><span className="font-bold">{profile?.level ?? 1}</span></div>
        </div>
      </div>

      {/* Progression Classe */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {(['N1', 'N2'] as const).map(lvl => {
          const p = progress.find(x => x.level === lvl);
          return (
            <div key={lvl} className="p-4 rounded-2xl bg-card border border-border">
              <h3 className="font-bold mb-2">{lvl === 'N1' ? '🔥 Niveau 1' : '🚀 Niveau 2'}</h3>
              <p className="text-2xl font-black">{(p?.completed_lessons as number[] | undefined)?.length ?? 0}<span className="text-sm font-normal text-muted-foreground"> leçons</span></p>
              <p className="text-xs text-muted-foreground mt-1">
                {evaluations.filter(e => e.level === lvl).length} évaluation(s) — moy: {
                  (() => {
                    const evals = evaluations.filter(e => e.level === lvl);
                    if (!evals.length) return '—';
                    return (evals.reduce((s, e) => s + e.best_score, 0) / evals.length).toFixed(1);
                  })()
                }%
              </p>
            </div>
          );
        })}
      </div>

      {/* Contributions parallèles : TamTam + Dictionnaire */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="p-4 rounded-2xl bg-card border border-border">
          <h3 className="font-bold mb-2 flex items-center gap-2"><MessageSquare className="w-4 h-4" /> Posts TamTam ({posts.length})</h3>
          {posts.length === 0 ? <p className="text-xs text-muted-foreground">Aucun post.</p> : (
            <ul className="space-y-1 text-xs max-h-32 overflow-y-auto">
              {posts.slice(0, 5).map(p => (
                <li key={p.id} className="truncate">
                  <span className="text-muted-foreground">{new Date(p.created_at).toLocaleDateString('fr-FR')} —</span> {p.transcript_fr || '(audio)'}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="p-4 rounded-2xl bg-card border border-border">
          <h3 className="font-bold mb-2 flex items-center gap-2"><BookA className="w-4 h-4" /> Dictionnaire ({contributions.length})</h3>
          {contributions.length === 0 ? <p className="text-xs text-muted-foreground">Aucune contribution.</p> : (
            <ul className="space-y-1 text-xs max-h-32 overflow-y-auto">
              {contributions.slice(0, 5).map(c => (
                <li key={c.id}><span className="font-bold">{c.word}</span> — <span className="text-muted-foreground">{c.definition.slice(0, 50)}</span></li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Réponses Classe */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <h2 className="font-bold flex items-center gap-2"><GraduationCap className="w-5 h-5" /> Réponses ({visible.length})</h2>
          <div className="ml-auto flex gap-1 text-xs">
            {(['all', 'pending', 'graded'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1 rounded-lg font-semibold ${filter === f ? 'bg-amber-500 text-white' : 'bg-muted text-muted-foreground'}`}
              >
                {f === 'all' ? 'Toutes' : f === 'pending' ? 'À corriger' : 'Corrigées'}
              </button>
            ))}
          </div>
        </div>

        {visible.length === 0 ? (
          <p className="p-6 text-center text-sm text-muted-foreground rounded-2xl bg-muted/30">Aucune réponse à afficher.</p>
        ) : visible.map(a => (
          <AnswerReview key={a.id} answer={a} studentName={studentName} onGraded={() => setTick(t => t + 1)} />
        ))}
      </div>
    </div>
  );
}
