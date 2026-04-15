import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useFitilaLanguage } from '@/contexts/FitilaLanguageContext';

const DEMARCHE_LANGUE = {
  title: 'Garibu ka yorin tubun swaa sɔɔ',
  titleFr: 'Démarche lecture-écriture',
  phases: [
    {
      id: 'amorce',
      emoji: '🎯',
      title: 'Sàasàa seeyabu',
      titleFr: 'Amorce',
      gradient: 'from-amber-400 to-orange-400',
      steps: [
        'Sɔ̃sinu nu n sãa nì nu keu kowobun wãarun gari mɔ̀',
        'Keu sɔ̃sio ù sɔm bweseru baateren yarufaani ka ten dam gere',
        'Keu sɔ̃sio ù ko mɛ̃ win sɔ̃siru ta ko n da ka keu kowobu naawɛ',
        'Keu kowobu ba n keu kowon tirenu mɔ',
        'Ba n da keu koo yenu berè kiri kiri',
      ],
      stepsFr: [
        'Rappeler la leçon précédente à partir du vécu des apprenants',
        'Présenter l\'intérêt et l\'importance du nouveau thème',
        'Créer un lien entre la leçon et le vécu des apprenants',
        'Les apprenants consultent leurs manuels',
        'Vérifier la présence de tous les apprenants',
      ],
    },
    {
      id: 'developpement',
      emoji: '📚',
      title: 'Barum dendibu',
      titleFr: 'Développement',
      gradient: 'from-blue-400 to-indigo-400',
      steps: [
        'Baranu ka gɔmbin yoran giabu',
        'Gari yari ka gari koo nì nu ǹ sã ma nu sãa dee deen dendibu',
        'Bù keu kowo swaa sɔ̃si ù kpĩ ù ka yoran saria piibunu tubu',
        'Keu kowobun sɔm sĩirubu kiri kiri',
      ],
      stepsFr: [
        'Lecture des lettres et consonnes — alphabétisation',
        'Lecture et compréhension du texte narratif',
        'Guider l\'apprenant dans l\'application des règles d\'écriture',
        'Suivi régulier du travail des apprenants',
      ],
    },
    {
      id: 'sections',
      emoji: '📖',
      title: 'Sɔm bwese bweseka',
      titleFr: 'Rubriques pédagogiques',
      gradient: 'from-emerald-400 to-teal-400',
      steps: [
        'I- Mɛɛrio (Observe) : questions sur l\'illustration',
        'II- Faagi (Écoute) : lecture du texte, questions de compréhension',
        'III- Geruo (Réagis) : discussion ouverte, partage d\'expérience',
        'IV- Weenɛ (Retiens) : identifier les points clés à retenir',
        'V- Sɔ̃ɔsiru (Phonétique) : lecture des syllabes, mots et phrases',
        'VI- Yora (Écriture) : copie guidée puis autonome',
      ],
      stepsFr: [
        'I- Observe : questions sur l\'illustration du texte',
        'II- Écoute et réponds : lecture à haute voix puis questions',
        'III- Réagis : discussion ouverte, lien avec le vécu',
        'IV- Retiens : synthèse des points-clés de la leçon',
        'V- Phonétique : lecture des syllabes, mots et phrases',
        'VI- Écriture : copie guidée puis écriture autonome',
      ],
    },
    {
      id: 'evaluation',
      emoji: '📝',
      title: 'Yaayasiabu',
      titleFr: 'Évaluation',
      gradient: 'from-purple-400 to-pink-400',
      steps: [
        'Bù faagiba yore bè ba ǹ sã',
        'Bù gari yari tubu',
        'Bù baranu ka gɔmbi yore dee dee nwa bù ka gari yari yore',
        'Bù yori ko yi n saria swĩi',
        'Bù kpĩ bù gari yara tusia',
        'Bù kpĩ bù faagi tusia',
      ],
      stepsFr: [
        'Vérifier la compréhension orale',
        'Vérifier la capacité de lecture',
        'Vérifier l\'écriture des lettres et mots appris',
        'Vérifier la production de phrases correctes',
        'Corriger collectivement',
        'Corriger individuellement',
      ],
    },
  ],
};

const DEMARCHE_CALCUL = {
  title: 'Dooru ka yarumani dendibun swaa sɔɔ',
  titleFr: 'Démarche calcul et gestion',
  phases: [
    {
      id: 'amorce_calc',
      emoji: '🎯',
      title: 'Sàasàa seeyabu',
      titleFr: 'Amorce',
      gradient: 'from-amber-400 to-orange-400',
      steps: [
        'Rappeler la notion précédente avec du matériel concret',
        'Poser un problème contextuel tiré de la vie quotidienne',
        'Laisser les apprenants proposer des solutions',
      ],
      stepsFr: [
        'Rappeler la notion précédente avec du matériel concret',
        'Poser un problème contextuel tiré de la vie quotidienne',
        'Laisser les apprenants proposer des solutions',
      ],
    },
    {
      id: 'dev_calc',
      emoji: '🧮',
      title: 'Sɔm bwese bweseka',
      titleFr: 'Développement',
      gradient: 'from-blue-400 to-indigo-400',
      steps: [
        'I- Mɛɛrio : observer l\'illustration du problème',
        'II- Faagi : écouter le problème et le reformuler',
        'III- Tubusio : résoudre le problème, choisir l\'opération',
        'IV- Weenɛ : retenir la méthode de résolution',
        'V- Sɔmaa : s\'entraîner avec de nouveaux exercices',
      ],
      stepsFr: [
        'I- Observe : observer l\'illustration du problème',
        'II- Écoute : écouter le problème et le reformuler',
        'III- Résous : résoudre le problème, choisir l\'opération',
        'IV- Retiens : retenir la méthode de résolution',
        'V- Entraîne-toi : s\'entraîner avec de nouveaux exercices',
      ],
    },
    {
      id: 'eval_calc',
      emoji: '📝',
      title: 'Yaayasiabu',
      titleFr: 'Évaluation',
      gradient: 'from-purple-400 to-pink-400',
      steps: [
        'Bù doorun kasosu tubusia — maîtriser les symboles numériques',
        'Bù dootinu gari kpa bù nì yore sàa 1n di n ka da 1000',
        'Bù geetinu ka dootinu tubu — compter et décompter',
        'Bù ka doorun masini dooru ko — utiliser la calculatrice',
      ],
      stepsFr: [
        'Maîtriser les symboles numériques',
        'Nommer et écrire les nombres de 1 à 1000',
        'Compter et décompter',
        'Résoudre des problèmes pratiques de gestion',
      ],
    },
  ],
};

const PLANNING_48_WEEKS = [
  { weeks: '1-6', theme: 'Tii dobonu / Nim', themeId: 'SS', sessions: 36, content: 'Leçons 1-5, Évaluation 1' },
  { weeks: '7-12', theme: 'Bii mɛroru / Baa ka mɛron', themeId: 'SS', sessions: 36, content: 'Leçons 4-9, Évaluation 2' },
  { weeks: '13-18', theme: 'Wãa yeru / Gɔɔ yeru', themeId: 'SVT', sessions: 36, content: 'Leçons 8-13' },
  { weeks: '19-24', theme: 'Tɛtɛ toobu / Sɛm', themeId: 'SS', sessions: 36, content: 'Leçons 12-17, Évaluation 3' },
  { weeks: '25-30', theme: 'Wɔɔ pii / Faara kĩru', themeId: 'SVT', sessions: 36, content: 'Leçons 16-21, Évaluation 4' },
  { weeks: '31-36', theme: 'Alaafian / Bwãɛn bararu', themeId: 'SVT', sessions: 36, content: 'Leçons 20-25, Évaluation 5' },
  { weeks: '37-42', theme: 'Dãa duurubu / Tem nɛnubun', themeId: 'Yarumani', sessions: 36, content: 'Leçons 24-29, Évaluation 6' },
  { weeks: '43-48', theme: 'Sida / Swaa sanum / Dim', themeId: 'SVT', sessions: 36, content: 'Leçons 28-32, Évaluations finales' },
];

const ANDRAGOGIE = [
  { emoji: '👤', title: 'L\'adulte apprend à partir de son vécu', desc: 'Partir du concret et du vécu quotidien pour introduire les notions nouvelles' },
  { emoji: '🎯', title: 'L\'adulte a besoin de savoir pourquoi', desc: 'Expliquer clairement l\'utilité de chaque apprentissage dans sa vie' },
  { emoji: '🤝', title: 'L\'adulte apprend en participant', desc: 'Favoriser la participation active, le travail en groupe et les échanges' },
  { emoji: '⏰', title: 'L\'adulte a des contraintes', desc: 'Respecter la disponibilité des apprenants, adapter le rythme aux saisons' },
  { emoji: '🏆', title: 'L\'adulte a besoin d\'encouragement', desc: 'Valoriser les progrès, ne jamais ridiculiser les erreurs' },
  { emoji: '📋', title: 'L\'adulte apprend par la pratique', desc: 'Multiplier les exercices pratiques et les mises en situation réelles' },
];

export default function ClasseFacilitateur() {
  const { currentLang } = useFitilaLanguage();
  const [openSection, setOpenSection] = useState<string | null>('amorce');
  const [activeView, setActiveView] = useState<'langue' | 'calcul' | 'planning' | 'andragogie'>('langue');

  const isBa = currentLang === 'ba';

  const viewTabs = [
    { id: 'langue' as const, label: isBa ? 'Garibu' : 'Lecture-Écriture', emoji: '📖' },
    { id: 'calcul' as const, label: isBa ? 'Dooru' : 'Calcul', emoji: '🧮' },
    { id: 'planning' as const, label: isBa ? 'Sɔm piibunu' : 'Planning', emoji: '📊' },
    { id: 'andragogie' as const, label: isBa ? 'Yam waaru' : 'Andragogie', emoji: '🎓' },
  ];

  const renderPhases = (phases: typeof DEMARCHE_LANGUE.phases) => (
    <div className="space-y-3">
      {phases.map(sec => (
        <div key={sec.id}>
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => setOpenSection(openSection === sec.id ? null : sec.id)}
            className="w-full flex items-center gap-3 p-4 rounded-2xl bg-white border border-gray-100 shadow-sm"
          >
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${sec.gradient} flex items-center justify-center shadow-md`}>
              <span className="text-xl">{sec.emoji}</span>
            </div>
            <div className="flex-1 text-left">
              <p className="text-gray-800 font-bold text-sm">{isBa ? sec.title : sec.titleFr}</p>
            </div>
            {openSection === sec.id ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-300" />}
          </motion.button>

          {openSection === sec.id && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-2 ml-4 space-y-2">
              {(isBa && sec.steps ? sec.steps : (sec as any).stepsFr || sec.steps).map((step: string, i: number) => (
                <div key={i} className="flex items-start gap-2 p-2">
                  <span className="text-amber-500 font-bold text-sm min-w-[20px]">{i + 1}.</span>
                  <p className="text-gray-600 text-sm">{step}</p>
                </div>
              ))}
            </motion.div>
          )}
        </div>
      ))}
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="p-4 rounded-3xl bg-gradient-to-br from-rose-100 to-red-100 border border-rose-200 shadow-md">
        <h2 className="text-gray-800 font-black text-lg">👨‍🏫 {isBa ? 'Sɔ̃ɔsirun sɔɔru' : 'Guide pédagogique'}</h2>
        <p className="text-rose-600 text-sm mt-1">{isBa ? 'Keu sɔ̃ɔsion garibu — Dii gbiikiru' : 'Guide facilitateur — Niveau 1'}</p>
      </div>

      {/* View tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
        {viewTabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => { setActiveView(tab.id); setOpenSection(null); }}
            className={`flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              activeView === tab.id
                ? 'bg-rose-500 text-white shadow-md shadow-rose-200'
                : 'bg-white text-gray-500 border border-gray-200'
            }`}
          >
            <span>{tab.emoji}</span> {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <motion.div key={activeView} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        {activeView === 'langue' && (
          <div className="space-y-4">
            <p className="text-gray-600 text-sm px-1 font-medium">
              {isBa ? DEMARCHE_LANGUE.title : DEMARCHE_LANGUE.titleFr}
            </p>
            {renderPhases(DEMARCHE_LANGUE.phases)}
          </div>
        )}

        {activeView === 'calcul' && (
          <div className="space-y-4">
            <p className="text-gray-600 text-sm px-1 font-medium">
              {isBa ? DEMARCHE_CALCUL.title : DEMARCHE_CALCUL.titleFr}
            </p>
            {renderPhases(DEMARCHE_CALCUL.phases)}
            
            {/* Math content areas */}
            <div className="p-4 rounded-2xl bg-white border border-gray-100 shadow-sm">
              <p className="text-gray-500 text-xs uppercase font-bold mb-3">📐 {isBa ? 'Dooru ka yarumani dendibu' : 'Domaines du calcul'}</p>
              <div className="space-y-2">
                {[
                  { emoji: '🔢', label: 'Geetinu ka Dootinu', desc: 'Numération : compter et écrire les nombres de 1 à 1000' },
                  { emoji: '➕', label: 'Wɔkure (Sosibu)', desc: 'Addition : sans et avec retenue' },
                  { emoji: '➖', label: 'Wunɔɔre (Wĩabu)', desc: 'Soustraction : sans et avec emprunt' },
                  { emoji: '✖️', label: 'Dabiasiabu', desc: 'Multiplication : par 1 et 2 chiffres' },
                  { emoji: '➗', label: 'Bɔnu', desc: 'Division : avec et sans reste' },
                  { emoji: '💰', label: 'Doorun masini', desc: 'Gestion : problèmes pratiques avec monnaie' },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-2 p-2 rounded-xl bg-gray-50">
                    <span className="text-lg">{item.emoji}</span>
                    <div>
                      <p className="text-gray-800 text-sm font-bold">{item.label}</p>
                      <p className="text-gray-500 text-xs">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeView === 'planning' && (
          <div className="space-y-4">
            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-center">
                <p className="text-2xl font-black text-gray-800">288</p>
                <p className="text-gray-400 text-[10px]">{isBa ? 'Kɔbi' : 'Séances'}</p>
              </div>
              <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-center">
                <p className="text-2xl font-black text-gray-800">48</p>
                <p className="text-gray-400 text-[10px]">{isBa ? 'Yarusuma' : 'Semaines'}</p>
              </div>
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-center">
                <p className="text-2xl font-black text-gray-800">6</p>
                <p className="text-gray-400 text-[10px]">{isBa ? 'Kɔbi/sem.' : 'Sé./sem.'}</p>
              </div>
            </div>

            {/* Weekly planning */}
            <div className="space-y-2">
              {PLANNING_48_WEEKS.map((p, i) => (
                <div key={i} className="p-3 rounded-2xl bg-white border border-gray-100 shadow-sm">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-blue-600">{isBa ? 'Yarusuma' : 'Sem.'} {p.weeks}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      p.themeId === 'SS' ? 'bg-amber-100 text-amber-700' :
                      p.themeId === 'SVT' ? 'bg-emerald-100 text-emerald-700' :
                      'bg-purple-100 text-purple-700'
                    }`}>{p.themeId}</span>
                  </div>
                  <p className="text-gray-800 text-sm font-semibold">{p.theme}</p>
                  <p className="text-gray-400 text-xs mt-0.5">{p.content}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeView === 'andragogie' && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-white border border-gray-100 shadow-sm">
              <p className="text-gray-500 text-xs uppercase font-bold mb-3">🎓 {isBa ? 'Bukurobun sɔ̃ɔsiru' : 'Principes d\'andragogie'}</p>
              <p className="text-gray-600 text-sm mb-4">
                {isBa
                  ? 'Bukurobun sɔ̃ɔsiru ya wɛ̃ɛwa biibun sɔ̃ɔsiru gia. N weenɛ bù yã mɛ̃ bukuro u ra keu ko.'
                  : 'L\'andragogie (pédagogie des adultes) diffère de la pédagogie des enfants. Voici les principes essentiels :'}
              </p>
              <div className="space-y-3">
                {ANDRAGOGIE.map((a, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-gray-50">
                    <span className="text-2xl">{a.emoji}</span>
                    <div>
                      <p className="text-gray-800 text-sm font-bold">{a.title}</p>
                      <p className="text-gray-500 text-xs mt-0.5">{a.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Tips */}
            <div className="p-4 rounded-2xl bg-white border border-gray-100 shadow-sm">
              <p className="text-gray-500 text-xs uppercase font-bold mb-3">💡 {isBa ? 'Yam waaru' : 'Conseils pratiques'}</p>
              <div className="space-y-2">
                {[
                  'Utiliser la langue Bariba comme langue principale d\'enseignement',
                  'Encourager tous les apprenants à participer activement',
                  'Répéter les exercices de lecture à haute voix plusieurs fois',
                  'Adapter le rythme au niveau du groupe',
                  'Utiliser des exemples du quotidien pour illustrer les leçons',
                  'Les séances de calcul doivent utiliser du matériel concret (cailloux, bâtons)',
                  'Chaque séance dure environ 2 heures',
                  'Ne jamais ridiculiser un apprenant qui fait une erreur',
                ].map((c, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="text-emerald-500">•</span>
                    <p className="text-gray-600 text-sm">{c}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}