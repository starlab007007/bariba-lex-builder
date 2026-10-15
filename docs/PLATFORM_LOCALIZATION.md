# Français et Baatɔnum dans FITILA

Le choix de langue est partagé par l’application, l’administration, les portails
enseignant, les fenêtres et les messages. Il persiste sur l’appareil et se
synchronise entre onglets. Le catalogue embarqué fonctionne sans réseau. Les
publications linguistiques récentes sont récupérées depuis Supabase et gardées
pour les usages hors connexion.

## Sources et couverture

Le générateur examine les sources, les routes et les contenus structurés. Il
rapproche les libellés français des traductions existantes, de la mémoire de
traduction, du dictionnaire et des couples explicites d’Apprendre et des scènes.
Chaque proposition conserve ses références. Les ambiguïtés non résolues restent
à compléter ; les mots ne sont pas assemblés pour inventer une phrase.

La couverture exacte du code livré figure dans
`docs/audits/platform-localization-summary.json`. Le rapport détaillé, avec les
fichiers et les libellés, est produit par la CI et fourni en artifact.

**Ce lot ne constitue pas une traduction Baatɔnum intégrale certifiée.** Des
milliers de formulations manquent encore. Elles restent en français jusqu’à
leur traduction et validation. Les anciennes correspondances du catalogue
sont identifiées comme références, et non comme validations humaines.

L’audit a écarté 80 chaînes de 12 sources contenant des graphies hors du
référentiel. Leur version française de base est conservée et leur inventaire
reste disponible dans `docs/audits/rejected-platform-locales.json`. Deux essais
ByT5 sur des libellés différents ont également retourné la même phrase
incohérente. Aucune traduction de masse de l’interface n’est publiée à partir
de ce résultat.

## Administration et validation

`/admin/localization` présente la couverture, les manques, les références et
les fichiers concernés. Un administrateur peut exporter le catalogue JSON,
importer des traductions en brouillons, vérifier une formulation et la publier
explicitement. Un import ne remplace pas les publications existantes. Les
modifications concurrentes sont détectées par révision.

La table `platform_locale_overrides` n’expose publiquement que les lignes
approuvées. Les écritures sont réservées aux administrateurs par RLS, et
l’identité du validateur ainsi que la révision sont renseignées côté serveur.
Les brouillons ne sont pas utilisés par l’interface publique.

## Compatibilité et contenus originaux

Le contexte `t` traite les clés et le catalogue partagé. L’adaptateur des vues
anciennes modifie seulement la valeur des nœuds texte et les attributs de
libellé/accessibilité, jamais la structure DOM. Les mises à jour React sont
suivies et les textes français sont rétablis au changement de langue.

Les champs saisis, documents éditables, code, formes Baatɔnum explicites,
questions/réponses d’exercice, messages personnels et résultats du traducteur
conservent leur contenu original. Les contrôles de leur interface suivent la
langue choisie. La localisation ne change ni la notation, ni les appels IA,
ni le moteur du traducteur, ni les voix humaines validées de Classe.

## Vérification

Le catalogue et son audit sont régénérés avant chaque build de production.
L’administrateur peut aussi ajouter de nouveaux libellés français et publier
leurs traductions validées sans reconstruire l’application. Les valeurs
dynamiques et les contenus originaux restent soumis aux protections décrites
ci-dessus.

Tests du catalogue, des références et des paramètres protégés ; Chromium sur
mobile/tablette/bureau, saisie et curseur conservés, mises à jour React,
portails/fenêtres, persistance et retour au français ; contrôles existants du
traducteur, de la voix et d’Apprendre. La validation linguistique des ressources
reste un travail distinct de ces tests techniques.
