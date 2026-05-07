import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useFitilaLanguage } from '@/contexts/FitilaLanguageContext';

// ========== N1 DATA ==========
const DEMARCHE_LANGUE = {
  title: 'Garibu ka yorin tubun swaa sɔɔ',
  titleFr: 'Démarche lecture-écriture',
  phases: [
    {
      id: 'amorce', emoji: '🎯', title: 'Sàasàa seeyabu', titleFr: 'Amorce',
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
      id: 'developpement', emoji: '📚', title: 'Barum dendibu', titleFr: 'Développement',
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
      id: 'sections', emoji: '📖', title: 'Sɔm bwese bweseka', titleFr: 'Rubriques pédagogiques',
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
      id: 'evaluation', emoji: '📝', title: 'Yaayasiabu', titleFr: 'Évaluation',
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
      id: 'amorce_calc', emoji: '🎯', title: 'Sàasàa seeyabu', titleFr: 'Amorce',
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
      id: 'dev_calc', emoji: '🧮', title: 'Sɔm bwese bweseka', titleFr: 'Développement',
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
      id: 'eval_calc', emoji: '📝', title: 'Yaayasiabu', titleFr: 'Évaluation',
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

// ========== N2 DATA ==========
const DEMARCHE_N2_LANGUE = {
  title: 'Bɔnu gbiika : garibu ka yoran swaa sɔɔ',
  titleFr: 'Démarche langue N2 — Production de texte',
  phases: [
    {
      id: 'n2_observe', emoji: '👁️', title: 'I- A mɛɛrio', titleFr: 'I- Observe',
      gradient: 'from-amber-400 to-orange-400',
      steps: [
        'Keu sɔ̃sio ù foto te sɔ̃ɔsi keu kowobu da',
        'Ù gari bikia bù ka foto ten gari geruo',
        'Bù bàra bwese bweseka mɔ̀ (classes nominales)',
        'Ù sɔm bweseru baateren yarufaani gere',
      ],
      stepsFr: [
        'Le facilitateur montre l\'illustration aux apprenants',
        'Il pose des questions pour décrire l\'illustration',
        'Identifier les classes nominales dans le texte',
        'Présenter l\'intérêt du nouveau thème',
      ],
    },
    {
      id: 'n2_ecoute', emoji: '👂', title: 'II- A faagi yeni gario', titleFr: 'II- Écoute et lis',
      gradient: 'from-blue-400 to-indigo-400',
      steps: [
        'Keu sɔ̃sio ù faagi ye yare swaa daki',
        'Keu kowobu ba faagi ye yare kuu do kuu do',
        'Ù gari bikia faagi yen gari sɔɔ',
        'Bàra nirà, bwese bweseka, gɔmbin yoran giabu',
      ],
      stepsFr: [
        'Le facilitateur lit le texte à haute voix',
        'Les apprenants lisent à tour de rôle',
        'Questions de compréhension sur le texte',
        'Identifier les lettres, syllabes et mots-clés',
      ],
    },
    {
      id: 'n2_reagis', emoji: '💬', title: 'III- A wunɛn yam waaru geruo', titleFr: 'III- Réagis',
      gradient: 'from-emerald-400 to-teal-400',
      steps: [
        'Keu kowobu ba daakari ye waasi',
        'Bù ka ben wãarun gari gere ma bù ka faagi yen gari naawɛ',
        'Bù gari yini yore doodooka (produire des phrases)',
        'Bù gɔɔ sariru ka sintu yiribo gere',
      ],
      stepsFr: [
        'Les apprenants discutent du thème en groupe',
        'Relier le texte au vécu quotidien des apprenants',
        'Produire des phrases complètes en Bariba',
        'Discuter de résolution de conflits et convivialité',
      ],
    },
    {
      id: 'n2_retiens', emoji: '🧠', title: 'IV- Yè n weenɛ a n yã', titleFr: 'IV- Retiens',
      gradient: 'from-purple-400 to-pink-400',
      steps: [
        'Bàra bwese bweseka sio (identifier les classes nominales)',
        'Bàra nirà ten baateren weenasi wã',
        'Gɔmbi yiibun baateren weenasi wã (conjugaison)',
        'Gari yini yoran saria piibunu (règles d\'écriture)',
      ],
      stepsFr: [
        'Identifier et classer les classes nominales Bariba',
        'Retenir les règles de formation des mots',
        'Conjugaison : forme accomplie, inaccomplie, négative',
        'Règles d\'écriture des phrases correctes',
      ],
    },
    {
      id: 'n2_ecris', emoji: '✍️', title: 'V- Sɔmaa', titleFr: 'V- Écris',
      gradient: 'from-rose-400 to-red-400',
      steps: [
        'Bù gari yini yore keu sɔ̃sion garibu swaa sɔɔ',
        'Bù batɛrɛ yore (écrire une lettre)',
        'Bù gari sɔm sɔ̀ yore (texte narratif)',
        'Bù afisin gari yore (affiche, article)',
      ],
      stepsFr: [
        'Écrire des phrases sous la dictée du facilitateur',
        'Écrire une lettre (familière ou administrative)',
        'Écrire un texte narratif ou descriptif',
        'Produire une affiche ou un article',
      ],
    },
  ],
};

const DEMARCHE_N2_CALCUL = {
  title: 'Dooru ka yarumani dendibu — Dii yiruse',
  titleFr: 'Démarche calcul et gestion — Niveau 2',
  phases: [
    {
      id: 'n2_num', emoji: '🔢', title: 'Dootinun garibu', titleFr: 'Numération avancée',
      gradient: 'from-amber-400 to-orange-400',
      steps: [
        'Tem kãa bɔnun saawaraban tɛtɛ (nombres > 1000)',
        'Dootinu yibun yorin sariabu (écriture des grands nombres)',
        'Kiloo ka metiri yoran saawarabanu (mesures)',
        'Nɔɔbun sariaba (nombres décimaux)',
      ],
      stepsFr: [
        'Numération au-delà de 1000 (milliers)',
        'Écriture et lecture des grands nombres',
        'Unités de mesure : kilogramme, mètre, kilomètre',
        'Introduction aux nombres décimaux',
      ],
    },
    {
      id: 'n2_ops', emoji: '➗', title: 'Dooru nɛɛsenu', titleFr: 'Les 4 opérations',
      gradient: 'from-blue-400 to-indigo-400',
      steps: [
        'Sosibu (Addition) : avec retenue, grands nombres',
        'Wĩabu (Soustraction) : avec emprunt, vérification',
        'Dabiasibu (Multiplication) : par 2 et 3 chiffres',
        'Bɔnu (Division) : avec et sans reste, preuve',
      ],
      stepsFr: [
        'Addition : avec retenue, nombres > 1000',
        'Soustraction : avec emprunt, preuve par addition',
        'Multiplication : multiplicateur à 2 et 3 chiffres',
        'Division : avec reste, preuve de la division',
      ],
    },
    {
      id: 'n2_gestion', emoji: '💰', title: 'Yarumani dendibu', titleFr: 'Gestion financière',
      gradient: 'from-emerald-400 to-teal-400',
      steps: [
        'Yarumani dendibu : recette, dépense, bénéfice',
        'Bozɛ kobu (budget) : planification financière',
        'Dirun wɔru gbebu : calcul des surfaces (km²)',
        'Tem baun sannɔsu : problèmes pratiques de gestion',
      ],
      stepsFr: [
        'Gestion : recette, dépense, bénéfice, perte',
        'Budget : planification et suivi financier',
        'Surfaces : calcul en km² et hectares',
        'Problèmes de gestion courante',
      ],
    },
  ],
};

const PLANNING_N1 = [
  { weeks: '1-6', theme: 'Tii dobonu / Nim', themeId: 'SS', sessions: 36, content: 'Leçons 1-5, Évaluation 1' },
  { weeks: '7-12', theme: 'Bii mɛroru / Baa ka mɛron', themeId: 'SS', sessions: 36, content: 'Leçons 4-9, Évaluation 2' },
  { weeks: '13-18', theme: 'Wãa yeru / Gɔɔ yeru', themeId: 'SVT', sessions: 36, content: 'Leçons 8-13' },
  { weeks: '19-24', theme: 'Tɛtɛ toobu / Sɛm', themeId: 'SS', sessions: 36, content: 'Leçons 12-17, Évaluation 3' },
  { weeks: '25-30', theme: 'Wɔɔ pii / Faara kĩru', themeId: 'SVT', sessions: 36, content: 'Leçons 16-21, Évaluation 4' },
  { weeks: '31-36', theme: 'Alaafian / Bwãɛn bararu', themeId: 'SVT', sessions: 36, content: 'Leçons 20-25, Évaluation 5' },
  { weeks: '37-42', theme: 'Dãa duurubu / Tem nɛnubun', themeId: 'Yarumani', sessions: 36, content: 'Leçons 24-29, Évaluation 6' },
  { weeks: '43-48', theme: 'Sida / Swaa sanum / Dim', themeId: 'SVT', sessions: 36, content: 'Leçons 28-32, Évaluations finales' },
];

const PLANNING_N2 = [
  { weeks: '1-3', theme: 'Barum keu / Dĩa gɔnnu', themeId: 'SS', sessions: 18, content: 'Leçons 1-3, Calcul 1-3' },
  { weeks: '4-5', theme: 'Daa kɔ̃si / Nim / Sida', themeId: 'SVT', sessions: 12, content: 'Leçons 4-5, Calcul 4-5, Évaluation 1' },
  { weeks: '6-8', theme: 'Agbatɛrɛ / Bii wãru', themeId: 'SVT', sessions: 18, content: 'Leçons 6-8, Calcul 6-8' },
  { weeks: '9-10', theme: 'Tem bii geo / Gbee wukobu', themeId: 'SS', sessions: 12, content: 'Leçons 9-10, Calcul 9-10, Évaluation 2' },
  { weeks: '11-14', theme: 'Swaa sanu / Kɔrɛ kɔrɛ / Sikuru', themeId: 'SS', sessions: 24, content: 'Leçons 11-14, Calcul 11-14, Évaluation 3' },
  { weeks: '15-17', theme: 'Yãa dokebu / Bature keu', themeId: 'SS', sessions: 18, content: 'Leçons 15-17, Calcul 15-17' },
  { weeks: '18-20', theme: 'Desantaralisasĩɔ / Dãa duurubu', themeId: 'SS', sessions: 18, content: 'Leçons 18-20, Calcul 18-20, Évaluation 4' },
  { weeks: '21-23', theme: 'Tem baun sannɔsu / Révisions', themeId: 'Yarumani', sessions: 18, content: 'Leçons 21-25, Calcul 21-25, Évaluation 5' },
];

const GRAMMAIRE_N2 = [
  { emoji: '📝', title: 'Bàra bwese bweseka (Classes nominales)', desc: 'Système des classes nominales Bariba : singulier/pluriel, déterminants, pronoms relatifs. Ex: ku/yi, tɛ/na, bu/su' },
  { emoji: '🔄', title: 'Gɔmbi yiibu (Conjugaison)', desc: 'Forme accomplie, inaccomplie, négative. Verbes réguliers et irréguliers. Temps : passé, présent, futur' },
  { emoji: '📖', title: 'Bàra nirà (Adjectifs)', desc: 'Adjectifs qualificatifs et possessifs. Accord avec la classe nominale du nom' },
  { emoji: '✉️', title: 'Batɛrɛ (Lettres)', desc: 'Lettre familière et lettre administrative. Structure : en-tête, corps, formule de politesse' },
  { emoji: '📰', title: 'Afisin gari (Articles/Affiches)', desc: 'Rédaction d\'articles informatifs et d\'affiches de sensibilisation en Bariba' },
  { emoji: '📝', title: 'Gari sɔm sɔ̀ (Texte narratif/descriptif)', desc: 'Production de textes narratifs et descriptifs avec structure logique' },
];

const ANDRAGOGIE = [
  { emoji: '👤', title: 'L\'adulte apprend à partir de son vécu', desc: 'Partir du concret et du vécu quotidien pour introduire les notions nouvelles' },
  { emoji: '🎯', title: 'L\'adulte a besoin de savoir pourquoi', desc: 'Expliquer clairement l\'utilité de chaque apprentissage dans sa vie' },
  { emoji: '🤝', title: 'L\'adulte apprend en participant', desc: 'Favoriser la participation active, le travail en groupe et les échanges' },
  { emoji: '⏰', title: 'L\'adulte a des contraintes', desc: 'Respecter la disponibilité des apprenants, adapter le rythme aux saisons' },
  { emoji: '🏆', title: 'L\'adulte a besoin d\'encouragement', desc: 'Valoriser les progrès, ne jamais ridiculiser les erreurs' },
  { emoji: '📋', title: 'L\'adulte apprend par la pratique', desc: 'Multiplier les exercices pratiques et les mises en situation réelles' },
];

interface Props {
  activeLevel?: 'N1' | 'N2';
}

export default function ClasseFacilitateur({ activeLevel = 'N1' }: Props) {
  const { currentLang } = useFitilaLanguage();
  const [openSection, setOpenSection] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<'langue' | 'calcul' | 'planning' | 'andragogie' | 'grammaire'>('langue');

  const isBa = currentLang === 'ba';
  const isN2 = activeLevel === 'N2';

  const viewTabs = [
    { id: 'langue' as const, label: isBa ? 'Garibu' : 'Lecture-Écriture', emoji: '📖' },
    { id: 'calcul' as const, label: isBa ? 'Dooru' : 'Calcul', emoji: '🧮' },
    ...(isN2 ? [{ id: 'grammaire' as const, label: isBa ? 'Bàra bweseru' : 'Grammaire N2', emoji: '📐' }] : []),
    { id: 'planning' as const, label: isBa ? 'Sɔm piibunu' : 'Planning', emoji: '📊' },
    { id: 'andragogie' as const, label: isBa ? 'Yam waaru' : 'Andragogie', emoji: '🎓' },
  ];

  const langueData = isN2 ? DEMARCHE_N2_LANGUE : DEMARCHE_LANGUE;
  const calculData = isN2 ? DEMARCHE_N2_CALCUL : DEMARCHE_CALCUL;
  const planningData = isN2 ? PLANNING_N2 : PLANNING_N1;

  const renderPhases = (phases: any[]) => (
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
              {(isBa && sec.steps ? sec.steps : sec.stepsFr || sec.steps).map((step: string, i: number) => (
                <div key={i} className="flex items-start gap-2 p-2">
                  <span className={`${isN2 ? 'text-indigo-500' : 'text-amber-500'} font-bold text-sm min-w-[20px]`}>{i + 1}.</span>
                  <p className="text-gray-600 text-sm">{step}</p>
                </div>
              ))}
            </motion.div>
          )}
        </div>
      ))}
    </div>
  );

  const mathDomains = isN2
    ? [
        { emoji: '🔢', label: 'Dootinu yibu (> 1000)', desc: 'Numération avancée : milliers, nombres décimaux' },
        { emoji: '➕', label: 'Sosibu', desc: 'Addition : grands nombres avec retenue' },
        { emoji: '➖', label: 'Wĩabu', desc: 'Soustraction : emprunt et vérification' },
        { emoji: '✖️', label: 'Dabiasibu', desc: 'Multiplication : par 2 et 3 chiffres' },
        { emoji: '➗', label: 'Bɔnu', desc: 'Division : avec reste et preuve' },
        { emoji: '📏', label: 'Kiloo ka metiri', desc: 'Mesures : kg, km, km², hectares' },
        { emoji: '💰', label: 'Yarumani dendibu', desc: 'Gestion : budget, recette, dépense, bénéfice' },
      ]
    : [
        { emoji: '🔢', label: 'Geetinu ka Dootinu', desc: 'Numération : compter et écrire les nombres de 1 à 1000' },
        { emoji: '➕', label: 'Wɔkure (Sosibu)', desc: 'Addition : sans et avec retenue' },
        { emoji: '➖', label: 'Wunɔɔre (Wĩabu)', desc: 'Soustraction : sans et avec emprunt' },
        { emoji: '✖️', label: 'Dabiasiabu', desc: 'Multiplication : par 1 et 2 chiffres' },
        { emoji: '➗', label: 'Bɔnu', desc: 'Division : avec et sans reste' },
        { emoji: '💰', label: 'Doorun masini', desc: 'Gestion : problèmes pratiques avec monnaie' },
      ];

  const planningStats = isN2
    ? { sessions: 252, weeks: 23, perWeek: 11 }
    : { sessions: 288, weeks: 48, perWeek: 6 };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className={`p-4 rounded-3xl bg-gradient-to-br ${isN2 ? 'from-indigo-100 to-purple-100 border-indigo-200' : 'from-rose-100 to-red-100 border-rose-200'} border shadow-md`}>
        <h2 className="text-gray-800 font-black text-lg">👨‍🏫 {isBa ? 'Sɔ̃ɔsirun sɔɔru' : 'Guide pédagogique'}</h2>
        <p className={`${isN2 ? 'text-indigo-600' : 'text-rose-600'} text-sm mt-1`}>
          {isBa
            ? `Keu sɔ̃ɔsion garibu — Dii ${isN2 ? 'yiruse' : 'gbiikiru'}`
            : `Guide facilitateur — Niveau ${isN2 ? '2' : '1'}`}
        </p>
      </div>

      {/* View tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
        {viewTabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => { setActiveView(tab.id); setOpenSection(null); }}
            className={`flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              activeView === tab.id
                ? `${isN2 ? 'bg-indigo-500' : 'bg-rose-500'} text-white shadow-md ${isN2 ? 'shadow-indigo-200' : 'shadow-rose-200'}`
                : 'bg-white text-gray-500 border border-gray-200'
            }`}
          >
            <span>{tab.emoji}</span> {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <motion.div key={`${activeLevel}-${activeView}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        {activeView === 'langue' && (
          <div className="space-y-4">
            <p className="text-gray-600 text-sm px-1 font-medium">
              {isBa ? langueData.title : langueData.titleFr}
            </p>
            {renderPhases(langueData.phases)}
          </div>
        )}

        {activeView === 'calcul' && (
          <div className="space-y-4">
            <p className="text-gray-600 text-sm px-1 font-medium">
              {isBa ? calculData.title : calculData.titleFr}
            </p>
            {renderPhases(calculData.phases)}
            
            <div className="p-4 rounded-2xl bg-white border border-gray-100 shadow-sm">
              <p className="text-gray-500 text-xs uppercase font-bold mb-3">📐 {isBa ? 'Dooru ka yarumani dendibu' : 'Domaines du calcul'}</p>
              <div className="space-y-2">
                {mathDomains.map((item, i) => (
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

        {activeView === 'grammaire' && isN2 && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-white border border-gray-100 shadow-sm">
              <p className="text-gray-500 text-xs uppercase font-bold mb-3">📐 {isBa ? 'Bàra bweseru ka gari yorin sariaba' : 'Grammaire et production de texte N2'}</p>
              <div className="space-y-3">
                {GRAMMAIRE_N2.map((g, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-gray-50">
                    <span className="text-2xl">{g.emoji}</span>
                    <div>
                      <p className="text-gray-800 text-sm font-bold">{g.title}</p>
                      <p className="text-gray-500 text-xs mt-0.5">{g.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeView === 'planning' && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className={`p-3 rounded-xl ${isN2 ? 'bg-indigo-50 border-indigo-200' : 'bg-amber-50 border-amber-200'} border text-center`}>
                <p className="text-2xl font-black text-gray-800">{planningStats.sessions}</p>
                <p className="text-gray-400 text-[10px]">{isBa ? 'Kɔbi' : 'Séances'}</p>
              </div>
              <div className={`p-3 rounded-xl ${isN2 ? 'bg-indigo-50 border-indigo-200' : 'bg-blue-50 border-blue-200'} border text-center`}>
                <p className="text-2xl font-black text-gray-800">{planningStats.weeks}</p>
                <p className="text-gray-400 text-[10px]">{isBa ? 'Suru' : 'Semaines'}</p>
              </div>
              <div className={`p-3 rounded-xl ${isN2 ? 'bg-indigo-50 border-indigo-200' : 'bg-emerald-50 border-emerald-200'} border text-center`}>
                <p className="text-2xl font-black text-gray-800">{planningStats.perWeek}</p>
                <p className="text-gray-400 text-[10px]">{isBa ? 'Kɔbi/suru' : 'Sé./sem.'}</p>
              </div>
            </div>

            <div className="space-y-2">
              {planningData.map((p, i) => (
                <div key={i} className="p-3 rounded-2xl bg-white border border-gray-100 shadow-sm">
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-xs font-bold ${isN2 ? 'text-indigo-600' : 'text-blue-600'}`}>{isBa ? 'Suru' : 'Sem.'} {p.weeks}</span>
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
