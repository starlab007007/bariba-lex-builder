import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Award, ChevronRight, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface ContributorTier {
  min: number;
  label: string;
  labelBa: string;
  medal: string;
  color: string;
  bg: string;
  level: number;
}

const CONTRIBUTOR_TIERS: ContributorTier[] = [
  { min: 0, label: 'Observateur', labelBa: 'Gbirumɑ', medal: '👁️', color: 'text-gray-500', bg: 'from-gray-100 to-gray-200', level: 0 },
  { min: 1, label: 'Contributeur Bronze', labelBa: 'Sɔmbutɔ wɔ̃kuru', medal: '🥉', color: 'text-amber-700', bg: 'from-amber-100 to-amber-200', level: 1 },
  { min: 10, label: 'Contributeur Argent', labelBa: 'Sɔmbutɔ wuri', medal: '🥈', color: 'text-slate-500', bg: 'from-slate-100 to-slate-300', level: 2 },
  { min: 30, label: 'Contributeur Or', labelBa: 'Sɔmbutɔ sika', medal: '🥇', color: 'text-yellow-600', bg: 'from-yellow-100 to-yellow-300', level: 3 },
  { min: 75, label: 'Contributeur Diamant', labelBa: 'Sɔmbutɔ diamã', medal: '💎', color: 'text-purple-600', bg: 'from-purple-100 to-purple-300', level: 4 },
  { min: 150, label: 'Maître Contributeur', labelBa: 'Sɔmbutɔ sunɔ', medal: '👑', color: 'text-orange-600', bg: 'from-orange-100 to-orange-300', level: 5 },
];

function getContributorTier(count: number): ContributorTier {
  for (let i = CONTRIBUTOR_TIERS.length - 1; i >= 0; i--) {
    if (count >= CONTRIBUTOR_TIERS[i].min) return CONTRIBUTOR_TIERS[i];
  }
  return CONTRIBUTOR_TIERS[0];
}

function getNextTier(count: number): ContributorTier | null {
  for (const tier of CONTRIBUTOR_TIERS) {
    if (count < tier.min) return tier;
  }
  return null;
}

interface ContributorBadgeCardProps {
  lang?: 'fr' | 'ba';
  compact?: boolean;
}

export function ContributorBadgeCard({ lang = 'fr', compact = false }: ContributorBadgeCardProps) {
  const { user } = useAuth();
  const [contributionCount, setContributionCount] = useState(0);
  const [totalPoints, setTotalPoints] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showDetail, setShowDetail] = useState(false);
  const isFr = lang === 'fr';

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    const fetch = async () => {
      const { data } = await supabase
        .from('user_contributions')
        .select('points, action_type')
        .eq('user_id', user.id);
      if (data) {
        setContributionCount(data.length);
        setTotalPoints(data.reduce((s, r) => s + (r.points || 0), 0));
      }
      setLoading(false);
    };
    fetch();
  }, [user]);

  if (loading || !user) return null;

  const tier = getContributorTier(contributionCount);
  const next = getNextTier(contributionCount);
  const progress = next ? ((contributionCount - tier.min) / (next.min - tier.min)) * 100 : 100;

  if (compact) {
    return (
      <>
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => setShowDetail(true)}
          className={`w-full bg-gradient-to-br ${tier.bg} rounded-2xl p-4 border border-white/50 flex items-center gap-3 text-left`}
        >
          <div className="text-3xl">{tier.medal}</div>
          <div className="flex-1 min-w-0">
            <p className={`font-bold text-sm ${tier.color}`}>
              {isFr ? tier.label : tier.labelBa}
            </p>
            <p className="text-[10px] text-gray-500">
              {contributionCount} {isFr ? 'contributions' : 'sɔmburenu'} • {totalPoints} pts
            </p>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
        </motion.button>

        {/* Detail modal */}
        <AnimatePresence>
          {showDetail && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
              onClick={() => setShowDetail(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={e => e.stopPropagation()}
                className="bg-white rounded-3xl p-6 max-w-sm w-full space-y-4"
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-gray-800 flex items-center gap-2">
                    <Award className="w-5 h-5 text-amber-500" />
                    {isFr ? 'Badge Contributeur' : 'Sɔmbutɔ Tigare'}
                  </h3>
                  <button onClick={() => setShowDetail(false)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Current tier */}
                <div className={`bg-gradient-to-br ${tier.bg} rounded-2xl p-5 text-center`}>
                  <div className="text-5xl mb-2">{tier.medal}</div>
                  <h4 className={`font-bold text-lg ${tier.color}`}>
                    {isFr ? tier.label : tier.labelBa}
                  </h4>
                  <p className="text-gray-500 text-xs mt-1">
                    {isFr ? `Niveau ${tier.level}` : `Yɛɛru ${tier.level}`} • {totalPoints} pts
                  </p>
                </div>

                {/* Progress to next */}
                {next && (
                  <div>
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>{contributionCount} / {next.min}</span>
                      <span>{next.medal} {isFr ? next.label : next.labelBa}</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                      <div className="bg-gradient-to-r from-amber-400 to-yellow-500 h-full rounded-full transition-all" style={{ width: `${progress}%` }} />
                    </div>
                  </div>
                )}

                {/* All tiers */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-gray-500 uppercase">
                    {isFr ? 'Tous les niveaux' : 'Yɛɛrenu kpunku'}
                  </p>
                  {CONTRIBUTOR_TIERS.filter(t => t.level > 0).map(t => (
                    <div key={t.level} className={`flex items-center gap-3 p-2 rounded-xl ${contributionCount >= t.min ? 'bg-green-50' : 'bg-gray-50 opacity-60'}`}>
                      <span className="text-xl">{t.medal}</span>
                      <div className="flex-1">
                        <p className="text-xs font-semibold text-gray-700">{isFr ? t.label : t.labelBa}</p>
                        <p className="text-[10px] text-gray-400">{t.min}+ {isFr ? 'contributions' : 'sɔmburenu'}</p>
                      </div>
                      {contributionCount >= t.min && <span className="text-green-500 text-xs">✓</span>}
                    </div>
                  ))}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </>
    );
  }

  return null;
}
