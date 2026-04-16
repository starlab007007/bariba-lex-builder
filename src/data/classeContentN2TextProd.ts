// Production de textes N2 — Extracted from Module de Formation N2
// 6 types de textes avec exercices interactifs

export interface TextType {
  id: string;
  title: string;
  titleFr: string;
  emoji: string;
  gradient: string;
  definition: string;
  definitionFr: string;
  characteristics: string[];
  characteristicsFr: string[];
  structure: TextStructureField[];
  example: string;
  exampleFr: string;
  exercisePrompt: string;
  exercisePromptFr: string;
}

export interface TextStructureField {
  key: string;
  label: string;
  labelFr: string;
  placeholder: string;
  type: 'short' | 'long' | 'date' | 'select';
  options?: string[];
  color: string;
}

export const TEXT_PRODUCTION_TYPES: TextType[] = [
  // ===== 1. LETTRE FAMILIÈRE =====
  {
    id: 'lettre_familiere',
    title: 'Sɔm tireru dɔɔkibu (Lettre familière)',
    titleFr: 'Lettre familière',
    emoji: '💌',
    gradient: 'from-pink-400 to-rose-400',
    definition: 'Sɔm tireru dɔɔkibu ya sãa tireru nì ba ra yore ba n sɔ̃ɔ tɔnbu nì ba ka bà yãa (dɔɔkibu, sunɔ, mɛro, bii). Ya ra gari mɔ̀ ka kɔ̃ɔ daakari ka yam wãaru.',
    definitionFr: 'La lettre familière est un texte personnel adressé à un proche (ami, parent, enfant). Elle exprime des sentiments, nouvelles ou demandes dans un registre courant.',
    characteristics: [
      'Dɔgɔn wiiru ka saarun yoru (Lieu et date)',
      'Wìn yore tireru wiiru (Nom de l\'expéditeur)',
      'Wìn sɔ̃ ba tireru gɔ̃ɔnɛ wiiru (Destinataire)',
      'Garin kɔ̃ɔ daakarin yoru (Formule d\'appel)',
      'Tireru yobu (Corps du texte)',
      'Garin kɔ̃ɔ bìnun yoru (Formule de politesse)',
      'Gɔ̀kɔ̀run yoru (Signature)',
    ],
    characteristicsFr: [
      'Lieu et date en haut à droite',
      'Nom de l\'expéditeur',
      'Nom du destinataire',
      'Formule d\'appel (Cher ami...)',
      'Corps du texte (nouvelles, demandes)',
      'Formule de politesse finale',
      'Signature',
    ],
    structure: [
      { key: 'lieu_et_date_144', label: 'Dɔgɔru ka saaru', labelFr: 'Lieu et date', placeholder: 'Naanaanu, 15/03/2026', type: 'short', color: 'bg-pink-50 border-pink-200' },
      { key: 'exp_diteur_144', label: 'Wìn yore tireru', labelFr: 'Expéditeur', placeholder: 'Kpaaru Sabi', type: 'short', color: 'bg-rose-50 border-rose-200' },
      { key: 'destinataire_144', label: 'Wìn sɔ̃ ba tireru gɔ̃ɔnɛ', labelFr: 'Destinataire', placeholder: 'N dɔɔkiru Saaru', type: 'short', color: 'bg-purple-50 border-purple-200' },
      { key: 'formule_d_144', label: 'Garin kɔ̃ɔ daakari', labelFr: 'Formule d\'appel', placeholder: 'N dɔɔkiru Saaru kãɛsinɛ,', type: 'short', color: 'bg-violet-50 border-violet-200' },
      { key: 'corps_144', label: 'Tireru yobu', labelFr: 'Corps', placeholder: 'N wunɛ tireru yeni yorumɔ n ka wunɛ sɔ̃ mɛ̃ n wãa alaafiya sɔɔ...', type: 'long', color: 'bg-blue-50 border-blue-200' },
      { key: 'formule_finale_144', label: 'Garin kɔ̃ɔ bìnu', labelFr: 'Formule finale', placeholder: 'N wunɛ fɔɔnɛ too.', type: 'short', color: 'bg-indigo-50 border-indigo-200' },
      { key: 'signature_144', label: 'Gɔ̀kɔ̀ru', labelFr: 'Signature', placeholder: 'Kpaaru Sabi', type: 'short', color: 'bg-gray-50 border-gray-200' },
    ],
    example: 'Naanaanu, 15/03/2026\n\nKpaaru Sabi\n\nN dɔɔkiru Saaru kãɛsinɛ,\n\nN wunɛ tireru yeni yorumɔ n ka wunɛ sɔ̃ mɛ̃ n wãa alaafiya sɔɔ. N ka n sɔm bwese bweseka wumamɔ. N koo kpĩ n n doo wunɛn bɔkuɔ suru garun biru.\n\nN wunɛ fɔɔnɛ too.\n\nKpaaru Sabi',
    exampleFr: 'Naanaanu, 15/03/2026\n\nKpaaru Sabi\n\nCher ami Saaru,\n\nJe t\'écris pour te donner de mes nouvelles. Je suis en bonne santé. J\'avance bien dans mes études. Je pourrai venir te rendre visite le mois prochain.\n\nJe te salue.\n\nKpaaru Sabi',
    exercisePrompt: 'A wunɛn dɔɔkiru tireru yoruo a ka nùn sɔ̃ mɛ̃ a koo doo win bɔkuɔ.',
    exercisePromptFr: 'Écris une lettre familière à un ami pour lui annoncer ta visite.',
  },

  // ===== 2. LETTRE ADMINISTRATIVE =====
  {
    id: 'lettre_admin',
    title: 'Sɔm tireru kasandibu (Lettre administrative)',
    titleFr: 'Lettre administrative',
    emoji: '📋',
    gradient: 'from-blue-400 to-indigo-400',
    definition: 'Sɔm tireru kasandibu ya sãa tireru nì ba ra yore ba n sɔ̃ɔ tɔn bɛɛru goo (wuu sunɔ, prefee, maasen gɔɔbi). Ya ra ko ka gari mɔ̀ru sɔɔma ka bɛ̃ɛrɛ too.',
    definitionFr: 'La lettre administrative est un texte officiel adressé à une autorité (chef de village, préfet, directeur). Elle suit un format strict avec registre soutenu.',
    characteristics: [
      'Dɔgɔn wiiru ka saaru (Lieu et date)',
      'Wìn yore tireru wiiru ka win sɔmbu (Expéditeur et fonction)',
      'Wìn sɔ̃ ba tireru gɔ̃ɔnɛ wiiru ka win sɔmbu (Destinataire et titre)',
      'Gariyoo (Objet)',
      'Tireru yobu (Corps — registre soutenu)',
      'Garin kɔ̃ɔ kasandibu (Formule officielle)',
      'Gɔ̀kɔ̀ru ka cachet',
    ],
    characteristicsFr: [
      'Lieu et date',
      'Expéditeur avec titre/fonction',
      'Destinataire avec titre officiel',
      'Objet de la lettre',
      'Corps en registre soutenu',
      'Formule de politesse officielle',
      'Signature et cachet',
    ],
    structure: [
      { key: 'lieu_et_date_144', label: 'Dɔgɔru ka saaru', labelFr: 'Lieu et date', placeholder: 'Naanaanu, 20/03/2026', type: 'short', color: 'bg-blue-50 border-blue-200' },
      { key: 'exp_diteur_144', label: 'Yore tireru', labelFr: 'Expéditeur', placeholder: 'Kpaaru Sabi, Wuun keu koo sɔɔru', type: 'short', color: 'bg-indigo-50 border-indigo-200' },
      { key: 'destinataire_144', label: 'Gɔ̃ɔnɛ', labelFr: 'Destinataire', placeholder: 'Wuu Sunɔ Bɛɛru, Naanaanu', type: 'short', color: 'bg-violet-50 border-violet-200' },
      { key: 'objet_144', label: 'Gariyoo', labelFr: 'Objet', placeholder: 'Dii yãa dwebu bikiabu', type: 'short', color: 'bg-purple-50 border-purple-200' },
      { key: 'corps_144', label: 'Tireru yobu', labelFr: 'Corps', placeholder: 'Wuu Sunɔ, n wunɛn bɛ̃ɛrɛ sɔɔ tireru yeni yorumɔwa...', type: 'long', color: 'bg-sky-50 border-sky-200' },
      { key: 'formule_144', label: 'Kɔ̃ɔ kasandibu', labelFr: 'Formule', placeholder: 'N wunɛ fɔɔ bɛ̃ɛrɛ too, Wuu Sunɔ.', type: 'short', color: 'bg-cyan-50 border-cyan-200' },
      { key: 'signature_144', label: 'Gɔ̀kɔ̀ru', labelFr: 'Signature', placeholder: 'Kpaaru Sabi', type: 'short', color: 'bg-gray-50 border-gray-200' },
    ],
    example: 'Naanaanu, 20/03/2026\n\nKpaaru Sabi\nWuun keu koo sɔɔru\n\nGɔ̃ɔnɛ: Wuu Sunɔ Bɛɛru, Naanaanu\n\nGariyoo: Dii yãa dwebu bikiabu\n\nWuu Sunɔ,\n\nN wunɛn bɛ̃ɛrɛ sɔɔ tireru yeni yorumɔwa n ka wunɛ bikia mɛ̃ a ka bɛsɛ swaa wɛ̃ bɛsɛ ka keu goo yãa dwe wuun keu kowobun sɔ̃.\n\nN wunɛ fɔɔ bɛ̃ɛrɛ too.\n\nKpaaru Sabi',
    exampleFr: 'Lettre officielle au Chef de village demandant un terrain pour construire une salle de classe.',
    exercisePrompt: 'A wuu sunɔ tireru yoruo a ka nùn bikia mɛ̃ u ka yinɛ swaa wɛ̃ yi ka keu goo yãa dwe.',
    exercisePromptFr: 'Écris une lettre administrative au Chef de village pour demander un terrain.',
  },

  // ===== 3. TEXTE NARRATIF =====
  {
    id: 'texte_narratif',
    title: 'Faagi yorubu (Texte narratif)',
    titleFr: 'Texte narratif',
    emoji: '📖',
    gradient: 'from-emerald-400 to-teal-400',
    definition: 'Faagi yorubu ya sãa tireru nì ya goo gari mɔ̀mɔ. Ya sãa gari goo baatera ka goo biru gerura. Ya mɔ̀ daakari ka saabu ka bweseru.',
    definitionFr: 'Le texte narratif est un récit d\'événements réels ou fictifs. Il suit une structure avec situation initiale, déroulement, événement déclencheur et situation finale.',
    characteristics: [
      'SI — Sàasàa seeyabu (Situation initiale)',
      'EM — Gariyoo kpaabu (Élément modificateur)',
      'EP — Gari baatera gari baatera (Épisodes/Péripéties)',
      'SA — Sàasàa gɔsiabu (Solution)',
      'SF — Sàasàa biruse (Situation finale)',
    ],
    characteristicsFr: [
      'SI — Situation initiale (cadre, personnages)',
      'EM — Élément déclencheur (problème)',
      'EP — Péripéties (actions, aventures)',
      'SA — Solution (résolution du problème)',
      'SF — Situation finale (conclusion)',
    ],
    structure: [
      { key: 'situation_initiale_144', label: 'SI — Sàasàa seeyabu', labelFr: 'Situation initiale', placeholder: 'Wuu goo sɔɔ bii goo u wãawa...', type: 'long', color: 'bg-emerald-50 border-emerald-200' },
      { key: 'l_ment_d_clencheur_144', label: 'EM — Gariyoo kpaabu', labelFr: 'Élément déclencheur', placeholder: 'Bururu garu, gari goo ta kobu...', type: 'long', color: 'bg-amber-50 border-amber-200' },
      { key: 'p_rip_ties_304', label: 'EP — Gari baatera', labelFr: 'Péripéties', placeholder: 'U dɔɔ ma u ka...', type: 'long', color: 'bg-blue-50 border-blue-200' },
      { key: 'solution_304', label: 'SA — Sàasàa gɔsiabu', labelFr: 'Solution', placeholder: 'Yera u ka swaa yɛnɔ...', type: 'long', color: 'bg-teal-50 border-teal-200' },
      { key: 'situation_finale_304', label: 'SF — Sàasàa biruse', labelFr: 'Situation finale', placeholder: 'Saa yèn di u ka...', type: 'long', color: 'bg-green-50 border-green-200' },
    ],
    example: 'SI: Bòro yaruwaasi biiwa. U wãawa Daa Guruɔ ka win mɔwobu sannu.\nEM: Bururu garu, u wɔ̃ yɛndu tura ma tɔmbu ba ku ra n maa wii tubaa.\nEP: Wuugibu ba tɔmbu waamɔ ba bosu sãa ben dokotoro dirɔ.\nSA: Ba ǹ sere bè tuba. Domi ba sãawa sɔbu.\nSF: Baadomma nuku sanku ni sɔɔra u ra n wãa.',
    exampleFr: 'SI: Bòro était un enfant obéissant. Il vivait à Daa Guru avec ses parents.\nEM: Un jour, il tomba malade et personne ne pouvait le guérir.\nEP: Les villageois le transportèrent au dispensaire.\nSA: Mais c\'était trop tard car ils sont arrivés en retard.\nSF: Depuis ce jour, il vit dans la souffrance.',
    exercisePrompt: 'A faagi goo yoruo a ka SI, EM, EP, SA, SF kpuro sio.',
    exercisePromptFr: 'Écris un récit complet avec les 5 parties (SI, EM, EP, SA, SF).',
  },

  // ===== 4. ARTICLE DE JOURNAL =====
  {
    id: 'article_journal',
    title: 'Tenkuru tireru (Article de journal)',
    titleFr: 'Article de journal',
    emoji: '📰',
    gradient: 'from-amber-400 to-yellow-400',
    definition: 'Tenkuru tireru ya sãa tireru nì ba ra yore ba n tenkuru gari sɔ̃ɔ tɔnbu. Ya ra gari yèn kobu ka dɔgɔn di ka saarun di mɔ̀.',
    definitionFr: 'L\'article de journal rapporte des faits d\'actualité. Il répond aux questions : Qui ? Quoi ? Où ? Quand ? Comment ? Pourquoi ?',
    characteristics: [
      'Garigoo wiiru (Titre accrocheur)',
      'Garigoo biru wiiru (Sous-titre)',
      'Garigoo yobu biruse (Chapeau/résumé)',
      'Tireru yobu (Corps de l\'article)',
      'Yore tireru wiiru (Nom de l\'auteur)',
      'Saaru ka dɔgɔru (Date et lieu)',
    ],
    characteristicsFr: [
      'Titre accrocheur et informatif',
      'Sous-titre explicatif',
      'Chapeau (résumé en gras)',
      'Corps de l\'article (détails)',
      'Nom du journaliste/auteur',
      'Date et lieu de publication',
    ],
    structure: [
      { key: 'titre_304', label: 'Garigoo wiiru', labelFr: 'Titre', placeholder: 'KEU GBIRUSE NAANAANUƆ', type: 'short', color: 'bg-amber-50 border-amber-200' },
      { key: 'sous_titre_304', label: 'Garigoo biru wiiru', labelFr: 'Sous-titre', placeholder: 'Bii mɛro wunɔbu ba keu goo yeni doki', type: 'short', color: 'bg-yellow-50 border-yellow-200' },
      { key: 'chapeau_304', label: 'Garigoo yobu biruse', labelFr: 'Chapeau', placeholder: 'Naanaanun bii mɛrobu ba keu gbiruse yeni yãa...', type: 'long', color: 'bg-orange-50 border-orange-200' },
      { key: 'corps_304', label: 'Tireru yobu', labelFr: 'Corps', placeholder: 'Naanaanu wuu sɔɔ keu gbirusen bweseru...', type: 'long', color: 'bg-red-50 border-red-200' },
      { key: 'auteur_304', label: 'Yore tireru wiiru', labelFr: 'Auteur', placeholder: 'Sabi Kpaaru, tenkurukora', type: 'short', color: 'bg-gray-50 border-gray-200' },
    ],
    example: 'KEU GBIRUSE NAANAANUƆ\nBii mɛro wunɔbu ba keu goo yeni doki\n\nNaanaanun bii mɛrobu ba keu gbiruse yeni yãa dwe ba ka tii dam yenɛ.\n\nNaanaanu wuu sɔɔ keu gbirusen bweseru ta ko suru weeru sɔɔ. Bii mɛro wunɔbu ba keu goo yeni doki. Ba ka tɔn keu sɔ̃si....\n\nSabi Kpaaru, tenkurukora — Naanaanu, 15/03/2026',
    exampleFr: 'RENTRÉE SCOLAIRE À NAANAANU\n150 élèves ont rejoint la nouvelle école\n\nLa rentrée scolaire a eu lieu dans le village de Naanaanu le mois dernier...\n\nSabi Kpaaru, journaliste — Naanaanu, 15/03/2026',
    exercisePrompt: 'A tenkuru tireru goo yoruo wunɛn wuu gariyoo goo sɔɔ.',
    exercisePromptFr: 'Écris un article de journal sur un événement de ton village.',
  },

  // ===== 5. AFFICHE =====
  {
    id: 'affiche',
    title: 'Gaatireru (Affiche)',
    titleFr: 'Affiche',
    emoji: '📢',
    gradient: 'from-red-400 to-orange-400',
    definition: 'Gaatireru ya sãa tireru bakaru nì ba ra yore ba n tɔnbu dabariyoo sɔ̃. Ya ra ko ka gari mɔ̀ru sɔɔma bakaru ka yĩirenu ka. Ya ra waamɔ too.',
    definitionFr: 'L\'affiche est un texte court et visuel destiné à informer ou sensibiliser. Elle utilise des titres en majuscules, un cadre, des puces et un langage motivant.',
    characteristics: [
      'Garigoo wiiru bakaru (Titre en MAJUSCULES)',
      'Gari bwese bweseka ka yĩirenu (Puces/points clés)',
      'Yiibunun tire biruse (Cadre visuel)',
      'Saabu ka dɔgɔru (Date et lieu)',
      'Garin kɔ̃ɔ tɔnbu dabarimɔ (Message motivant)',
    ],
    characteristicsFr: [
      'Titre en MAJUSCULES, lisible de loin',
      'Points clés en puces',
      'Cadre et bordure visuelle',
      'Date, lieu, horaire',
      'Slogan/message de motivation',
    ],
    structure: [
      { key: 'titre_304', label: 'Garigoo wiiru bakaru', labelFr: 'TITRE', placeholder: 'BII MƐRO KPURON ALAAFIYA', type: 'short', color: 'bg-red-50 border-red-200' },
      { key: 'sujet_304', label: 'Gariyoo', labelFr: 'Sujet', placeholder: 'Bɛsɛ kpuro su n doo vaksinasĩɔnun sɔ̃!', type: 'long', color: 'bg-orange-50 border-orange-200' },
      { key: 'lieu_et_date_304', label: 'Dɔgɔru ka saaru', labelFr: 'Lieu et date', placeholder: 'Naanaanu maasu dirɔ, 25/03/2026', type: 'short', color: 'bg-yellow-50 border-yellow-200' },
      { key: 'horaire_304', label: 'Saabu', labelFr: 'Horaire', placeholder: 'Saa kɔbaa nɔba ita saa kɔbaa wɔkura yiru', type: 'short', color: 'bg-amber-50 border-amber-200' },
      { key: 'message_motivant_304', label: 'Kɔ̃ɔ dabariru', labelFr: 'Message motivant', placeholder: 'VAKSINASĨƆNU YA RA BII MƐRO KƆ̃SIMƆ!', type: 'short', color: 'bg-green-50 border-green-200' },
    ],
    example: '╔══════════════════════════════╗\n║  BII MƐRO KPURON ALAAFIYA   ║\n╠══════════════════════════════╣\n║ ● Bɛsɛ kpuro su n doo       ║\n║   vaksinasĩɔnun sɔ̃!         ║\n║ ● Dɔgɔru: Naanaanu maasu    ║\n║ ● Saaru: 25/03/2026         ║\n║ ● Saa 8h — 12h              ║\n║                              ║\n║ VAKSINASĨƆNU YA RA BII MƐRO ║\n║      KƆSIMƆ!                 ║\n╚══════════════════════════════╝',
    exampleFr: 'Affiche de sensibilisation pour la vaccination des enfants.',
    exercisePrompt: 'A gaatireru goo yoruo wunɛn wuu gariyoo goo sɔɔ (vaksinasĩɔn, keu, bɛɛsiru...).',
    exercisePromptFr: 'Crée une affiche sur un thème de ton choix (vaccination, école, propreté...).',
  },

  // ===== 6. TEXTE DESCRIPTIF / PORTRAIT =====
  {
    id: 'texte_descriptif',
    title: 'Tɔn siibu yorubu (Texte descriptif/Portrait)',
    titleFr: 'Texte descriptif / Portrait',
    emoji: '🎨',
    gradient: 'from-violet-400 to-purple-400',
    definition: 'Tɔn siibu yorubu ya sãa tireru nì ya tɔn goo goo, dɔgɔ goo goo, nde dãa goo goo siibu mɔ̀. Ya ra ko ka bàra bwese bweseka ka gɔmbi sikanɛ (adjectifs) ka. Dɔgɔ siibu ya ra sère dɔgɔ seeda mɔ̀ (haut, bas, devant, derrière...).',
    definitionFr: 'Le texte descriptif dépeint une personne, un lieu ou un animal avec des adjectifs qualificatifs et des indicateurs spatiaux. Le portrait décrit l\'apparence et le caractère.',
    characteristics: [
      'Gɔmbi sikanɛ bwese bweseka (Adjectifs variés)',
      'Tɔn siibu wãɛru (Description physique)',
      'Tɔn siibu yam kɔ̃ɔru (Description morale/caractère)',
      'Dɔgɔ seedabu (Indicateurs de lieu)',
      'Bàra bwese bweseka ka siibu daakari (Comparaisons)',
    ],
    characteristicsFr: [
      'Adjectifs qualificatifs variés',
      'Description physique (taille, visage, vêtements)',
      'Description morale (caractère, habitudes)',
      'Indicateurs de lieu (devant, derrière, à côté...)',
      'Comparaisons et images',
    ],
    structure: [
      { key: 'nom_et_identit_304', label: 'Wiiru ka kɔ̀kɔrɔ', labelFr: 'Nom et identité', placeholder: 'Saaru ya sãa tɔn kurɔ goowa...', type: 'short', color: 'bg-violet-50 border-violet-200' },
      { key: 'description_physique_304', label: 'Siibu wãɛru', labelFr: 'Description physique', placeholder: 'U bɛ̃rɛwa, u sãa kõo buaawa...', type: 'long', color: 'bg-purple-50 border-purple-200' },
      { key: 'caract_re_304', label: 'Siibu yam kɔ̃ɔru', labelFr: 'Caractère', placeholder: 'U sãa tɔn sãawa, u ra tɔnbu dam mɛɛrimɔ...', type: 'long', color: 'bg-fuchsia-50 border-fuchsia-200' },
      { key: 'habitudes_304', label: 'Win sɔmbu ka yam wãaru', labelFr: 'Habitudes', placeholder: 'U ra sɔmɔ too, u ra bii mɛrobu sɔ̃simɔ...', type: 'long', color: 'bg-pink-50 border-pink-200' },
      { key: 'conclusion_304', label: 'Gari biruse', labelFr: 'Conclusion', placeholder: 'Tɔn be u sãa tɔn sãa dee deewa...', type: 'long', color: 'bg-rose-50 border-rose-200' },
    ],
    example: 'Saaru ya sãa tɔn kurɔ goowa u wãa Naanaanuɔ. U bɛ̃rɛwa, u sãa kõo buaawa. Win yĩɛru nu sãawa kwara. U ra yire mɛ̃ siki siki. U sãa tɔn sãawa, u ra tɔnbu dam mɛɛrimɔ. U ra bii mɛrobu sɔ̃simɔ. Tɔn be u sãa tɔn sãa dee deewa, wuugibu kpuro ba nùn kɔ̃ɔ mɔ.',
    exampleFr: 'Saaru est une femme qui vit à Naanaanu. Elle est grande avec un beau visage. Ses cheveux sont tressés. Elle s\'habille toujours proprement. Elle est bonne et aide les autres. Elle enseigne aux enfants. C\'est vraiment une bonne personne que tout le village aime.',
    exercisePrompt: 'A tɔn goo goo siibu yoruo (wunɛn mɛro, wunɛn sɔ̃si, nde wunɛn dɔɔkiru).',
    exercisePromptFr: 'Fais le portrait d\'une personne de ton choix (parent, enseignant ou ami).',
  },
];
