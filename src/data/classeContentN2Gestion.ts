// Documents de Gestion N2 — Extracted from Module de Formation N2
// 7 types de documents interactifs

export interface GestionDocument {
  id: string;
  title: string;
  titleFr: string;
  emoji: string;
  gradient: string;
  definition: string;
  definitionFr: string;
  fields: GestionField[];
  tableConfig?: GestionTableConfig;
  formula?: string;
  formulaFr?: string;
  example: Record<string, string>;
  qaQuestions?: { ba: string; fr: string }[];
}

export interface GestionField {
  key: string;
  label: string;
  labelFr: string;
  type: 'text' | 'number' | 'date' | 'computed';
  placeholder?: string;
  width?: string;
  formula?: string;
}

export interface GestionTableConfig {
  headers: string[];
  headersFr: string[];
  rows: number;
  computedColumns?: { index: number; formula: string }[];
  totalRow?: boolean;
}

export const GESTION_N2_DOCUMENTS: GestionDocument[] = [
  // ===== 1. DÉCHARGE =====
  {
    id: 'decharge',
    title: 'Sɔm gobi doke tireru (Décharge)',
    titleFr: 'Décharge',
    emoji: '📄',
    gradient: 'from-blue-400 to-indigo-400',
    definition: 'Sɔm gobi doke tireru ya sãa tireru nì ya sio mɛ̃ tɔn goo u gobinu doke tɔn goo bɛɛ. Ya sãa seedawa.',
    definitionFr: 'La décharge est un document attestant qu\'une personne a remis des biens à une autre. C\'est une preuve de transfert de responsabilité.',
    fields: [
      { key: 'date', label: 'Saaru', labelFr: 'Date', type: 'date', placeholder: '15/03/2026' },
      { key: 'remettant', label: 'Wìn doke', labelFr: 'Remettant', type: 'text', placeholder: 'Kpaaru Sabi' },
      { key: 'fonction_rem', label: 'Win sɔmbu', labelFr: 'Fonction', type: 'text', placeholder: 'Keu koo sɔɔru' },
      { key: 'recevant', label: 'Wìn sua', labelFr: 'Recevant', type: 'text', placeholder: 'Saaru Bio' },
      { key: 'fonction_rec', label: 'Win sɔmbu', labelFr: 'Fonction', type: 'text', placeholder: 'Keu koo sɔɔru gbirise' },
      { key: 'objet', label: 'Gobinu', labelFr: 'Objets remis', type: 'text', placeholder: 'Tiru wɔkuru, piɔ ita, bukɛɛru nɔɔbu...' },
      { key: 'lieu', label: 'Dɔgɔru', labelFr: 'Lieu', type: 'text', placeholder: 'Naanaanu' },
    ],
    example: {
      date: '15/03/2026',
      remettant: 'Kpaaru Sabi',
      fonction_rem: 'Keu koo sɔɔru',
      recevant: 'Saaru Bio',
      fonction_rec: 'Keu koo sɔɔru gbirise',
      objet: 'Tiru wɔkuru, piɔ ita, bukɛɛru nɔɔbu, tabɛɛru yiru, sɛɛzu yɛndu',
      lieu: 'Naanaanu',
    },
    qaQuestions: [
      { ba: 'Mba n sɔm gobi doke tireru sãa, ka mba sɔ̃na ba ra yu kɔsibu?', fr: 'Qu\'est-ce qu\'une décharge et pourquoi est-elle nécessaire ?' },
      { ba: 'A gari yini bweseru sɔ̃ɔsio: wìn doke, wìn sua, mba ba doke?', fr: 'Précisez : qui remet, qui reçoit, et quels biens sont remis ?' },
      { ba: 'Yè a koo sɔm gobi doke tireru ko, mba sɔɔ a koo de bù seeda?', fr: 'Comment garantir que cette décharge servira de preuve ?' },
    ],
  },

  // ===== 2. REÇU =====
  {
    id: 'recu',
    title: 'Gobi suan seeda tireru (Reçu)',
    titleFr: 'Reçu',
    emoji: '🧾',
    gradient: 'from-emerald-400 to-teal-400',
    definition: 'Gobi suan seeda tireru ya sãa tireru nì ya sio mɛ̃ tɔn goo u gobi goo sua. Ya sãa gobi suan seedawa.',
    definitionFr: 'Le reçu atteste qu\'une somme d\'argent a été reçue. C\'est une preuve de paiement.',
    fields: [
      { key: 'numero', label: 'Dootiru', labelFr: 'Numéro', type: 'text', placeholder: 'N° 001' },
      { key: 'date', label: 'Saaru', labelFr: 'Date', type: 'date', placeholder: '15/03/2026' },
      { key: 'recu_de', label: 'Wìn doke gobiru', labelFr: 'Reçu de', type: 'text', placeholder: 'Kpaaru Sabi' },
      { key: 'montant', label: 'Gobi nyera', labelFr: 'Montant', type: 'number', placeholder: '5000' },
      { key: 'motif', label: 'Mba sɔ̃', labelFr: 'Motif', type: 'text', placeholder: 'Keu koo suman gobi' },
      { key: 'receveur', label: 'Wìn sua gobiru', labelFr: 'Receveur', type: 'text', placeholder: 'Saaru Bio, trésorier' },
    ],
    example: {
      numero: 'N° 001',
      date: '15/03/2026',
      recu_de: 'Kpaaru Sabi',
      montant: '5000',
      motif: 'Keu koo suman gobi',
      receveur: 'Saaru Bio, gobi suabu yãakora',
    },
    qaQuestions: [
      { ba: 'Mba n gobi suan seeda tireru sãa?', fr: 'Qu\'est-ce qu\'un reçu et à quoi sert-il ?' },
      { ba: 'Bweseru sɔ̃ɔsio yì yu raa wãa gobi suan seeda tireru sɔɔ.', fr: 'Citez les mentions obligatoires d\'un reçu.' },
      { ba: 'Tɔ̃ru garu a gobi sua, sere a ǹ tireru wɛ̃, mba n koo sere?', fr: 'Que peut-il arriver si vous recevez de l\'argent sans délivrer un reçu ?' },
    ],
  },

  // ===== 3. FACTURE =====
  {
    id: 'facture',
    title: 'Gobi dwebu tireru (Facture)',
    titleFr: 'Facture',
    emoji: '💰',
    gradient: 'from-amber-400 to-orange-400',
    definition: 'Gobi dwebu tireru ya sãa tireru nì ya gobi dwebu sio gobinu nì ba dàbu sɔɔ. Ya mɔ̀wa : dɔgɔru, gobinun wiiru, nyera (Qté), wunɔbu goo goo diru (PU), gobi kpuro (Montant = Qté × PU), TVA, ka gobi kpuro deedeeru (Net).',
    definitionFr: 'La facture détaille les achats : désignation, quantité (Qté), prix unitaire (PU), montant (= Qté × PU), sous-total, TVA (18%), et net à payer.',
    fields: [
      { key: 'fournisseur', label: 'Wìn yɛ̃ɛnɛ', labelFr: 'Fournisseur', type: 'text', placeholder: 'Maasan gɔɔbi Sabi' },
      { key: 'client', label: 'Wìn dàmɔ', labelFr: 'Client', type: 'text', placeholder: 'Keu koo suman wiiru' },
      { key: 'date', label: 'Saaru', labelFr: 'Date', type: 'date', placeholder: '15/03/2026' },
      { key: 'numero', label: 'Dootiru', labelFr: 'N° Facture', type: 'text', placeholder: 'FACT-001' },
    ],
    tableConfig: {
      headers: ['Gobiru', 'Nyera (Qté)', 'Wunɔbu goo goo (PU)', 'Gobi kpuro (Montant)'],
      headersFr: ['Désignation', 'Quantité', 'Prix unitaire', 'Montant'],
      rows: 5,
      computedColumns: [{ index: 3, formula: 'col1 * col2' }],
      totalRow: true,
    },
    formula: 'Gobi kpuro = Nyera × Wunɔbu goo goo (PU)\nTVA = Gobi kpuro × 18%\nNet = Gobi kpuro + TVA',
    formulaFr: 'Montant = Quantité × Prix Unitaire\nTVA = Sous-total × 18%\nNet à payer = Sous-total + TVA',
    example: {
      fournisseur: 'Maasan gɔɔbi Sabi',
      client: 'Wuu keu koo suman',
      date: '15/03/2026',
      numero: 'FACT-001',
    },
  },

  // ===== 4. CAHIER DE CAISSE =====
  {
    id: 'cahier_caisse',
    title: 'Gobi yãɛku tireru (Cahier de caisse)',
    titleFr: 'Cahier de caisse',
    emoji: '📒',
    gradient: 'from-green-400 to-emerald-400',
    definition: 'Gobi yãɛku tireru ya sãa tireru nì ba ra gobi nì nu duumɔ ka nì nu yèemɔ yore goo goo baatera sɔɔ. Ya mɔ̀wa: saaru, gariyoo, gobi duura (entrée), gobi yèera (sortie), ka kĩa sì su tien dëebu (solde).',
    definitionFr: 'Le cahier de caisse enregistre toutes les entrées et sorties d\'argent jour par jour. Solde = Solde précédent + Entrées – Sorties.',
    fields: [
      { key: 'periode', label: 'Suru', labelFr: 'Période', type: 'text', placeholder: 'Mars 2026' },
      { key: 'solde_initial', label: 'Gobi sàasàa', labelFr: 'Solde initial', type: 'number', placeholder: '25000' },
    ],
    tableConfig: {
      headers: ['Saaru', 'Gariyoo', 'Gobi duura (E)', 'Gobi yèera (S)', 'Kĩa (Solde)'],
      headersFr: ['Date', 'Libellé', 'Entrées', 'Sorties', 'Solde'],
      rows: 8,
      computedColumns: [{ index: 4, formula: 'prev_solde + col2 - col3' }],
      totalRow: true,
    },
    formula: 'Kĩa (Solde) = Gobi sàasàa + Gobi duura kpuro − Gobi yèera kpuro',
    formulaFr: 'Solde = Solde initial + Total entrées – Total sorties',
    example: {
      periode: 'Mars 2026',
      solde_initial: '25000',
    },
  },

  // ===== 5. FICHE DE STOCK =====
  {
    id: 'fiche_stock',
    title: 'Gobi yãɛku binu tireru (Fiche de stock)',
    titleFr: 'Fiche de stock',
    emoji: '📦',
    gradient: 'from-purple-400 to-pink-400',
    definition: 'Gobi yãɛku binu tireru ya sãa tireru nì ba ra gobinu nì nu duurumɔ ka nì nu yèemɔ yore magasen sɔɔ. Ya mɔ̀wa : saaru, gariyoo, duura (entrée), yèera (sortie), ka kĩa (reste).',
    definitionFr: 'La fiche de stock suit les entrées et sorties de marchandises en magasin. Reste = Stock initial + Entrées – Sorties.',
    fields: [
      { key: 'article', label: 'Gobiru wiiru', labelFr: 'Article', type: 'text', placeholder: 'Tiru (cahiers)' },
      { key: 'stock_initial', label: 'Sàasàa nyera', labelFr: 'Stock initial', type: 'number', placeholder: '100' },
    ],
    tableConfig: {
      headers: ['Saaru', 'Gariyoo', 'Duura (E)', 'Yèera (S)', 'Kĩa (Reste)'],
      headersFr: ['Date', 'Motif', 'Entrées', 'Sorties', 'Reste'],
      rows: 6,
      computedColumns: [{ index: 4, formula: 'prev_reste + col2 - col3' }],
      totalRow: true,
    },
    formula: 'Kĩa (Reste) = Sàasàa + Duura kpuro − Yèera kpuro',
    formulaFr: 'Reste = Stock initial + Entrées – Sorties',
    example: {
      article: 'Tiru (cahiers)',
      stock_initial: '100',
    },
  },

  // ===== 6. PROCÈS-VERBAL =====
  {
    id: 'proces_verbal',
    title: 'Wuu wunabu tireru (Procès-verbal)',
    titleFr: 'Procès-verbal de réunion',
    emoji: '📑',
    gradient: 'from-slate-400 to-gray-400',
    definition: 'Wuu wunabu tireru ya sãa tireru nì ya gari nì ba mɔ̀bu wunanɛ baatera ka kɛwɔ̃ nì ba suabu yore. Ya sãa wunabu gari seedawa.',
    definitionFr: 'Le PV de réunion consigne les discussions et décisions prises lors d\'une réunion. C\'est un document officiel de référence.',
    fields: [
      { key: 'date', label: 'Saaru', labelFr: 'Date', type: 'date', placeholder: '15/03/2026' },
      { key: 'lieu', label: 'Dɔgɔru', labelFr: 'Lieu', type: 'text', placeholder: 'Naanaanun wuu sunɔn dirɔ' },
      { key: 'heure_debut', label: 'Saa nì ta seeyara', labelFr: 'Heure début', type: 'text', placeholder: '10h00' },
      { key: 'heure_fin', label: 'Saa nì ta kobu', labelFr: 'Heure fin', type: 'text', placeholder: '12h30' },
      { key: 'president', label: 'Wìn koo sɔɔru', labelFr: 'Président', type: 'text', placeholder: 'Wuu Sunɔ Bɛɛru' },
      { key: 'secretaire', label: 'Wìn yore tireru', labelFr: 'Secrétaire', type: 'text', placeholder: 'Kpaaru Sabi' },
      { key: 'presents', label: 'Tɔn nì ba nà', labelFr: 'Présents', type: 'number', placeholder: '25' },
      { key: 'absents', label: 'Tɔn nì ba ǹ nà', labelFr: 'Absents', type: 'number', placeholder: '5' },
      { key: 'ordre_jour', label: 'Gariyoo baatera', labelFr: 'Ordre du jour', type: 'text', placeholder: '1. Keu yãa dwebu 2. Gobi dwebu 3. Garibu bwese bweseka' },
      { key: 'decisions', label: 'Kɛwɔ̃ nì ba suabu', labelFr: 'Décisions prises', type: 'text', placeholder: '1. Keu goo koo yãa dwe suru weeru sɔɔ...' },
    ],
    example: {
      date: '15/03/2026',
      lieu: 'Naanaanun wuu sunɔn dirɔ',
      heure_debut: '10h00',
      heure_fin: '12h30',
      president: 'Wuu Sunɔ Bɛɛru',
      secretaire: 'Kpaaru Sabi',
      presents: '25',
      absents: '5',
      ordre_jour: '1. Keu yãa dwebu 2. Gobi dwebu 3. Garibu bwese bweseka',
      decisions: '1. Keu goo koo yãa dwe suru weeru sɔɔ 2. Tɔn baateru nɔɔbu koo gobi wɛ̃ suru kpuro',
    },
  },

  // ===== 7. BÉNÉFICE / PERTE =====
  {
    id: 'benefice_perte',
    title: 'Gobi yɛna / Gobi bɔnu (Bénéfice / Perte)',
    titleFr: 'Calcul du Bénéfice / Perte',
    emoji: '📊',
    gradient: 'from-teal-400 to-cyan-400',
    definition: 'Gobi yɛnabu ya sãa mɛ̃ ba ra yɛ̃ɛnɛn gobi yɛna nde gobi bɔnu dwemɔ. Prix de revient = Prix d\'achat + Frais. Bénéfice = Prix de vente − Prix de revient. Perte = Prix de revient − Prix de vente.',
    definitionFr: 'Le calcul du bénéfice/perte détermine si une activité commerciale est rentable. Bénéfice = PV – PR (si PV > PR). Perte = PR – PV (si PR > PV).',
    fields: [
      { key: 'article', label: 'Gobiru wiiru', labelFr: 'Article', type: 'text', placeholder: 'Sɛm (riz)' },
      { key: 'prix_achat', label: 'Dàbun diru (PA)', labelFr: 'Prix d\'achat', type: 'number', placeholder: '15000' },
      { key: 'frais', label: 'Gobi bwese bweseka (Frais)', labelFr: 'Frais', type: 'number', placeholder: '2000' },
      { key: 'prix_revient', label: 'Dàbun diru kpuro (PR)', labelFr: 'Prix de revient', type: 'computed', formula: 'prix_achat + frais' },
      { key: 'prix_vente', label: 'Yɛ̃ɛnɛbun diru (PV)', labelFr: 'Prix de vente', type: 'number', placeholder: '20000' },
      { key: 'resultat', label: 'Gobi yɛna / bɔnu', labelFr: 'Résultat', type: 'computed', formula: 'prix_vente - prix_revient' },
    ],
    formula: 'PR = PA + Frais\nBénéfice = PV − PR (si PV > PR)\nPerte = PR − PV (si PR > PV)',
    formulaFr: 'PR = PA + Frais\nBénéfice = PV − PR (si PV > PR)\nPerte = PR − PV (si PR > PV)',
    example: {
      article: 'Sɛm (riz) — saki wunɔbu',
      prix_achat: '15000',
      frais: '2000',
      prix_vente: '20000',
    },
  },
];
