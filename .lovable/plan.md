# Les 6 modules de création Fitila — version web

Objectif : avoir dans cette application web les six modules de création, réellement fonctionnels sur le backend actuel du projet, sans texte ni bouton fictif.

Important : ce projet est l'application web Fitila. Je ne peux pas compiler, tester ni signer l'application Flutter, ni intervenir sur l'autre dépôt GitHub ou l'autre backend. Tout ce qui suit concerne donc la version web, sur son propre backend.

## Ce qui existe déjà et sera réutilisé

- Publication au fil : table des publications, envoi de fichiers, affichage du fil social.
- Produits du Marché.
- Direct : lives, spectateurs, réactions.
- Traduction FR↔Bariba, lecture vocale, transcription (fonctions serveur déjà en place).

## Ce que je vais ajouter au backend

Nouvelles tables (avec droits d'accès et règles de sécurité par utilisateur connecté) :

- Défis de sagesse : défis, réponses (une seule par personne et par défi), votes.
- Contributions au corpus, avec consentement explicite, plus un compteur mensuel.
- Handunia : lieux, souvenirs, mentions « j'aime » sur les souvenirs.
- Direct : messages de discussion et messages de connexion audio entre participants.
- Lien explicite entre une publication Aburu et le produit du Marché correspondant.

## Les six modules

1. **Echo Sɔ̃ɔ** — enregistrement audio avec autorisation micro, écoute avant envoi, saisie texte, traduction dans les deux sens, lecture vocale, publication texte et audio au fil, messages d'erreur clairs si hors ligne ou non connecté.
2. **Live Griot** — création d'un direct, liste des directs en cours, entrée/sortie des auditeurs, audio du créateur vers les auditeurs, discussion en temps réel, compteur d'auditeurs, nettoyage à la fermeture. Libellés fidèles : « Direct audio, discussion en temps réel et auditeurs connectés ». L'option « invités sur scène » sera masquée tant que le rôle invité n'existe pas.
3. **Sagesse Battle** — défi du jour, saisie d'une réponse, notation par l'IA avec repli sur une notation locale si l'IA est indisponible (la réponse n'est jamais perdue), points, votes de la communauté, historique personnel et statistiques du défi.
4. **Sasara IA** — traduction dans les deux sens, correction du résultat, écoute, publication bilingue, enregistrement au corpus uniquement si le consentement est activé (désactivé par défaut), compteur mensuel ; la publication aboutit même si l'enregistrement au corpus échoue.
5. **Handunia Wasa** — liste et création de lieux sans doublon, souvenirs par lieu, aide à la rédaction par l'IA, auteurs, « j'aime », fil du monde, brouillon conservé hors ligne et synchronisé au retour du réseau. Texte remplacé par « Monde vivant, souvenirs et mémoire collective ».
6. **Aburu Fim IA** — choix d'un produit réel du Marché ou saisie manuelle, prix, catégorie, disponibilité, modèles visuels, photo ou vidéo (appareil ou galerie), aperçu, publication au fil avec lien vers le produit, et passage vers Sasara pour la version bilingue. Envoi vidéo sécurisé : limite de taille et de durée, envoi en flux avec barre de progression, délai d'attente et reprise propre en cas d'erreur.

## Qualité et finitions

- Aucun écran bloqué sur un chargement infini, aucun bouton sans effet, aucun compteur inventé.
- Erreurs affichées de façon compréhensible, jamais avalées en silence.
- Connexions temps réel avec noms uniques et nettoyage systématique (même méthode que les corrections récentes).
- Aucune clé privée côté navigateur.
- Nettoyage des textes obsolètes et du code mort touché.

## Détails techniques

- Migration : `battle_challenges`, `battle_responses` (unique `challenge_id,user_id`), `battle_response_votes`, `corpus_contributions`, `handunia_lieux`, `handunia_fragments`, `handunia_fragment_likes`, `tamtam_live_chat_messages`, `tamtam_live_signals`, colonne `product_id` sur les publications ; RLS + GRANT pour chaque table, fonction `corpus_contribution_count_this_month`.
- Direct : WebRTC navigateur, signalisation via la table de signaux + Realtime, repli STUN public ; si aucun serveur TURN n'est configuré, l'état est affiché explicitement.
- Nouvelles pages sous `/fitila/creer/*` + entrées dans la navigation, en lazy-loading avec `SafeBoundary`.
- Envoi média : `uploadBinary` remplacé par un envoi de flux avec progression, limites 60 s / 50 Mo pour la vidéo.
- Vérifications : typecheck, puis parcours réel des six modules via navigateur automatisé avec deux comptes de test, y compris hors ligne et session expirée.

## Ordre de livraison

1. Migration backend + types.
2. Echo Sɔ̃ɔ et Sasara IA.
3. Sagesse Battle et Handunia Wasa.
4. Aburu Fim IA (dont envoi vidéo robuste).
5. Live Griot (recette à deux utilisateurs).
6. Nettoyage, tests de bout en bout, rapport final.
