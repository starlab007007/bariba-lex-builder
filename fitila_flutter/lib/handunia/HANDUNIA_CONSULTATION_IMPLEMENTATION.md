# Handunia Wasa — volet CONSULTATION

Branche de référence : `release/fitila-flutter-android-v1.8.1-build12-web-parity`.

## Direction visuelle

La consultation utilise exclusivement les jetons Handunia définis dans
`handunia_consultation_ui.dart` :

- nuit `#0D1018`
- nuit portée `#151A24`
- bordures `#242C39 / #2E3848`
- braise `#E0A03C`
- terre `#C96A3F`
- ivoire `#F3EFE6`
- cendre `#9A9386`
- encre `#14100A`

Typographie : Fraunces 600 pour la parole humaine, les titres et chiffres ;
Karla 400/600/700 pour l'interface et les métadonnées.

Aucun like, vue, classement de contributeurs ni partage viral n'est exposé.
La seule métrique sociale visible est le nombre de voix humaines distinctes.

## Composants partagés

- `HaloDensite(valeur)` : respiration 5–7 s selon la densité ; lacune à zéro
  sous forme de cercle pointillé tournant sur 14 s ; figé avec
  `disableAnimations`.
- `OndeAudio(progression, actif)` : onde déterministe ; la braise représente la
  portion réellement écoutée et le point ivoire la position réelle. Aucune
  animation indépendante de la lecture.
- `PastilleSource(temoin, annee)` : témoin et année.
- `HanduniaSourcedAnswer(answer, sources)` : remplace chaque référence `[n]`
  par la pastille du témoin correspondant.
- `CarteBraise(souvenir)` : lieu + période, citation, audio, initiales et nombre
  de voix ; terre pour un élément local non synchronisé.
- `CercleDePortee(niveau)` : anciens / lignée / communauté / tout le monde.
- `BadgeSceau()` : statut du scellement, icône de contour.
- `EncartLacune(axes)` : matérialise une absence de mémoire, jamais une erreur.

## Écran 1 — Le fil

Code :
- `HanduniaFilView`
- `CarteBraise`
- `_DivergenceCard`
- `HanduniaConsultationData.fetchFeed`

Données :
- `handunia_fragments`
- `handunia_lieux`
- `handunia_corroborations`
- `tamtam_profiles`
- `handunia_divergences`

Règle d'ordonnancement implémentée dans
`compareHanduniaFeedItems` :

1. distance géographique croissante ;
2. date de corroboration la plus récente ;
3. lacune comblée ;
4. date du souvenir comme départage seulement.

Les fragments accessibles sont paginés avant ce tri, puis la limite du fil est
appliquée. On ne pré-limite donc plus par popularité ni par date de création.
Les contributions locales non synchronisées sont ajoutées en tête et affichées
en terre. Le fil est fini : il se termine par `EncartLacune`.

Hors-ligne : le dernier fil est relu depuis SharedPreferences, et les premiers
audios sont mis en cache local.

## Écran 2 — Un souvenir ouvert

Code :
- `HanduniaMemoryRoute`
- `_OpenMemoryBody`
- `_MemoryPlaybackOrb`
- `_HoldToSpeak`

Données :
- `handunia_fragments`
- `handunia_lieux`
- `tamtam_profiles`
- `handunia_corroborations`
- autres versions via `source_fragment_id` et divergences.

La voix originale est le canon. Le texte est affiché comme transcription
dérivée et le statut de relecture par gardien est visible. Deux actions
seulement : Corroborer et Nuancer. La nuance crée une nouvelle version sans
modifier le souvenir source.

L'enregistrement Handunia passe par
`FitilaMediaController.startHanduniaOpusAudio()` : Opus, mono, 16 kHz,
16 kbps. Le support du codec est vérifié avant capture ; les autres modules
FITILA conservent leur configuration audio existante.

## Écran 3 — La carte vivante

Code :
- `HanduniaLivingMapRoute`
- `_MapPlaceNode`
- `HaloDensite`

Données :
- `handunia_lieux`
- `handunia_fragments`
- `handunia_corroborations`

Chaque lieu est visible, y compris ceux sans souvenir. Quand latitude et
longitude sont disponibles, la position visuelle est une projection relative
des coordonnées réelles ; aucun réseau de fils décoratif n'est inventé. Les
lieux sans coordonnées utilisent seulement un repli déterministe. La densité
de voix pilote le rayon et le rythme du halo. Une densité nulle devient une
lacune pointillée. Le toucher change l'anneau de sélection et la fiche du bas.

## Écran 4 — Le lieu

Code :
- `HanduniaPlaceRoute`
- `_PlaceBody`
- `_DensityRing`

Données :
- fragments du lieu ;
- plus ancienne voix ;
- axes calculés depuis les données : période, genre, lignée, thème.

L'anneau comporte deux arcs, souvenirs et voix, et se dessine en 1,6 s.
`EncartLacune` est calculé à partir des axes réellement absents.
Les deux portes sont Le geste et Le temps.

## Écran 5 — Traverser les générations

Code :
- `HanduniaTimelineRoute`

Données :
- `period_year` des fragments du lieu ;
- corroborateurs distincts.

Les cinq périodes sont : avant 1960, 1960–1979, 1980–1999, 2000–2019,
depuis 2020. Le halo et le nombre de voix suivent la période. Une période à
zéro voix assombrit l'écran, masque le halo et affiche seulement la lacune
avec l'action `Aller chercher ces voix`.

## Écran 6 — Les divergences

Code :
- `HanduniaDivergencesRoute`
- `_DivergenceDetail`
- `_DivergenceThreads`

Données :
- `handunia_divergences`
- versions A et B ;
- `handunia_guardian_opinions`.

Les versions ne sont ni fusionnées ni supprimées. Deux fils partent du point
de rupture ; une étincelle parcourt chaque fil sur 4,5 s. Le conseil des
gardiens est présenté comme recours, et son avis est ajouté à côté des
versions.

## Écran 7 — La mémoire répond

Code :
- `HanduniaMemoryAnswerRoute`
- `HanduniaSourcedAnswer`
- Edge Function `handunia-memory-query`.

Données :
- fragments accessibles par RLS ;
- embeddings et génération uniquement après filtrage d'accès.

Trois états :
- sourced → braise ;
- void → cendre ;
- refusal → terre.

Le filtrage d'accès est exécuté avant la vectorisation. Chaque `[n]` renvoyé
par le modèle est remplacé à l'affichage par la pastille de son témoin.
Une panne réseau reste un état réseau et n'est plus présentée comme un vide de
mémoire. L'Edge Function renvoie `503 / unavailable` pour une panne technique ;
seule l'absence réelle de témoignages renvoie `void`. L'entrée clavier et
l'appui long vocal sont disponibles.

## Écran 8 — Le foyer du village

Code :
- `HanduniaFoyerRoute`
- `_FlamePainter`

Données :
- volume local de fragments ;
- synchronisés ;
- retirés ;
- file locale en attente ;
- `handunia_village_returns` ;
- `handunia_guardians` + profils.

La flamme varie avec le volume réel. Les trois compteurs demandés sont
affichés, ainsi que livret/radio/carte murale et les gardiens en initiales.

## Geste — Tracer

Code :
- `HanduniaTraceRoute`
- `_TracePainter`
- `handunia_memory_paths`.

Le tracé est normalisé en coordonnées 0–1 et daté par la base. Après
enregistrement, une étincelle rejoue réellement la trajectoire en 4,5 s.
Le curseur permet de revenir dans la trajectoire. En cas de coupure, la
trajectoire complète, son fragment et `captured_at` sont conservés dans la
file locale `handunia_pending_paths_v1`, avec état `En attente de réseau`.
Cette file est rejouée automatiquement au retour d'une connexion ; la date
d'origine est écrite dans `handunia_memory_paths.captured_at`.

## États et accessibilité

Les surfaces de consultation distinguent :
- chargement : halo battant, jamais de spinner rotatif ;
- hors-ligne : `En attente de réseau` ;
- vide : lacune ;
- accès refusé : terre, verrou de contour ;
- souvenir retiré : texte discret, sans compteur de voix.

Les cibles interactives sont au minimum de 44 px. Les commandes principales
ont des labels Semantics. Toutes les animations critiques respectent
`MediaQuery.disableAnimations`.

## Requêtes et sécurité

Migration principale :
`20260920203000_handunia_consultation_memory_protocol.sql`.

Migration écrans 2–8 :
`20260920211500_handunia_consultation_views_runtime.sql`.

La politique `Handunia fragments visible by scope` autorise :
- l'auteur ;
- communauté / tout le monde ;
- la même lignée pour `lineage` ;
- les gardiens pour `elders`.

La fonction `handunia-memory-query` utilise le client utilisateur et donc
cette RLS avant de calculer les embeddings.

## Ancien style volontairement non modifié

Le lanceur général FITILA et certaines surfaces du volet CRÉATION dans
`main.dart` contiennent encore des emojis, couleurs historiques et composants
de parité web. Ils restent hors du périmètre de ce lot CONSULTATION afin de ne
pas casser le volet création déjà traité. Aucun de ces styles n'est utilisé
dans les huit écrans de consultation ci-dessus.
