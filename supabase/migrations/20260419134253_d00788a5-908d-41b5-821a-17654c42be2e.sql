-- Reclassify phrases from "Autres" into more specific themes based on FR + BA keywords.
-- Order: most specific first; each phrase only re-mapped once (we re-check category='Autres').

-- 1. Marché & Achat
UPDATE public.bariba_corpus_phrases
SET category = 'Marché & Achat'
WHERE category = 'Autres' AND (
  text_french ILIKE '%march%' OR text_french ILIKE '%vendre%' OR text_french ILIKE '%vend%'
  OR text_french ILIKE '%achet%' OR text_french ILIKE '%prix%' OR text_french ILIKE '%payer%'
  OR text_french ILIKE '%argent%' OR text_french ILIKE '%franc%' OR text_french ILIKE '%cher%'
  OR text_french ILIKE '%boutique%' OR text_french ILIKE '%commerce%' OR text_french ILIKE '%client%'
  OR text_bariba ILIKE '%dwa%' OR text_bariba ILIKE '%dɔra%' OR text_bariba ILIKE '%gobi%'
  OR text_bariba ILIKE '%yãabu%' OR text_bariba ILIKE '%dora%'
);

-- 2. Agriculture
UPDATE public.bariba_corpus_phrases
SET category = 'Agriculture'
WHERE category = 'Autres' AND (
  text_french ILIKE '%champ%' OR text_french ILIKE '%cultiv%' OR text_french ILIKE '%plant%'
  OR text_french ILIKE '%semer%' OR text_french ILIKE '%récolt%' OR text_french ILIKE '%recolt%'
  OR text_french ILIKE '%igname%' OR text_french ILIKE '%mil%' OR text_french ILIKE '%sorgho%'
  OR text_french ILIKE '%mais%' OR text_french ILIKE '%maïs%' OR text_french ILIKE '%manioc%'
  OR text_french ILIKE '%mangue%' OR text_french ILIKE '%banane%' OR text_french ILIKE '%arachide%'
  OR text_french ILIKE '%paysan%' OR text_french ILIKE '%agricult%' OR text_french ILIKE '%houe%'
  OR text_bariba ILIKE '%gberɔ%' OR text_bariba ILIKE '%gbero%' OR text_bariba ILIKE '%gɔɔ%'
  OR text_bariba ILIKE '%duma%'
);

-- 3. Sport & Jeux
UPDATE public.bariba_corpus_phrases
SET category = 'Sport & Jeux'
WHERE category = 'Autres' AND (
  text_french ILIKE '%football%' OR text_french ILIKE '%foot%' OR text_french ILIKE '%sport%'
  OR text_french ILIKE '%match%' OR text_french ILIKE '%balle%' OR text_french ILIKE '%ballon%'
  OR text_french ILIKE '%jouer%' OR text_french ILIKE '%jeu%' OR text_french ILIKE '%courir%'
  OR text_french ILIKE '%équipe%' OR text_french ILIKE '%equipe%' OR text_french ILIKE '%danse%'
  OR text_bariba ILIKE '%sãa%' OR text_bariba ILIKE '%saa%'
);

-- 4. Voyage & Déplacement
UPDATE public.bariba_corpus_phrases
SET category = 'Voyage & Déplacement'
WHERE category = 'Autres' AND (
  text_french ILIKE '%voyag%' OR text_french ILIKE '%route%' OR text_french ILIKE '%voiture%'
  OR text_french ILIKE '%vélo%' OR text_french ILIKE '%velo%' OR text_french ILIKE '%moto%'
  OR text_french ILIKE '%partir%' OR text_french ILIKE '%arriver%' OR text_french ILIKE '%aller%'
  OR text_french ILIKE '%venir%' OR text_french ILIKE '%marcher%' OR text_french ILIKE '%chemin%'
  OR text_french ILIKE '%ville%' OR text_french ILIKE '%village%' OR text_french ILIKE '%pays%'
  OR text_bariba ILIKE '%turi%' OR text_bariba ILIKE '%swĩi%' OR text_bariba ILIKE '%swii%'
  OR text_bariba ILIKE '%da %' OR text_bariba ILIKE '%doona%'
);

-- 5. Religion & Tradition
UPDATE public.bariba_corpus_phrases
SET category = 'Religion & Tradition'
WHERE category = 'Autres' AND (
  text_french ILIKE '%dieu%' OR text_french ILIKE '%pri%' OR text_french ILIKE '%mosqu%'
  OR text_french ILIKE '%église%' OR text_french ILIKE '%eglise%' OR text_french ILIKE '%musulman%'
  OR text_french ILIKE '%chrétien%' OR text_french ILIKE '%chretien%' OR text_french ILIKE '%fête%'
  OR text_french ILIKE '%fete%' OR text_french ILIKE '%tradition%' OR text_french ILIKE '%ancêtre%'
  OR text_french ILIKE '%ancetre%' OR text_french ILIKE '%coutume%' OR text_french ILIKE '%esprit%'
  OR text_bariba ILIKE '%arufaaru%' OR text_bariba ILIKE '%gusunɔ%' OR text_bariba ILIKE '%gusuno%'
  OR text_bariba ILIKE '%aluwaa%'
);

-- 6. Animaux & Nature
UPDATE public.bariba_corpus_phrases
SET category = 'Animaux & Nature'
WHERE category = 'Autres' AND (
  text_french ILIKE '%vache%' OR text_french ILIKE '%chèvre%' OR text_french ILIKE '%chevre%'
  OR text_french ILIKE '%mouton%' OR text_french ILIKE '%poule%' OR text_french ILIKE '%coq%'
  OR text_french ILIKE '%chien%' OR text_french ILIKE '%chat%' OR text_french ILIKE '%oiseau%'
  OR text_french ILIKE '%poisson%' OR text_french ILIKE '%cheval%' OR text_french ILIKE '%âne%'
  OR text_french ILIKE '%ane%' OR text_french ILIKE '%animal%' OR text_french ILIKE '%animaux%'
  OR text_french ILIKE '%arbre%' OR text_french ILIKE '%forêt%' OR text_french ILIKE '%foret%'
  OR text_french ILIKE '%fleur%' OR text_french ILIKE '%herbe%' OR text_french ILIKE '%feuille%'
  OR text_bariba ILIKE '%naa %' OR text_bariba ILIKE '% naa%' OR text_bariba ILIKE '%gum%'
  OR text_bariba ILIKE '%gunɔ%' OR text_bariba ILIKE '%suba%'
);

-- 7. Météo & Saisons
UPDATE public.bariba_corpus_phrases
SET category = 'Météo & Saisons'
WHERE category = 'Autres' AND (
  text_french ILIKE '%pluie%' OR text_french ILIKE '%pleut%' OR text_french ILIKE '%soleil%'
  OR text_french ILIKE '%vent%' OR text_french ILIKE '%chaud%' OR text_french ILIKE '%froid%'
  OR text_french ILIKE '%saison%' OR text_french ILIKE '%nuage%' OR text_french ILIKE '%temps%'
  OR text_french ILIKE '%météo%' OR text_french ILIKE '%harmattan%' OR text_french ILIKE '%orage%'
);

-- 8. Maison & Vie quotidienne
UPDATE public.bariba_corpus_phrases
SET category = 'Maison & Vie quotidienne'
WHERE category = 'Autres' AND (
  text_french ILIKE '%maison%' OR text_french ILIKE '%cuisin%' OR text_french ILIKE '%dorm%'
  OR text_french ILIKE '%eau%' OR text_french ILIKE '%feu%' OR text_french ILIKE '%lampe%'
  OR text_french ILIKE '%lit%' OR text_french ILIKE '%chambre%' OR text_french ILIKE '%porte%'
  OR text_french ILIKE '%fenêtre%' OR text_french ILIKE '%fenetre%' OR text_french ILIKE '%toit%'
  OR text_french ILIKE '%balayer%' OR text_french ILIKE '%laver%' OR text_french ILIKE '%nettoyer%'
  OR text_french ILIKE '%marmite%' OR text_french ILIKE '%assiette%' OR text_french ILIKE '%cour%'
  OR text_bariba ILIKE '%kpuna%' OR text_bariba ILIKE '%dirɔ%' OR text_bariba ILIKE '%diro%'
  OR text_bariba ILIKE '%nim %' OR text_bariba ILIKE '% nim%' OR text_bariba ILIKE '%dãa%'
);