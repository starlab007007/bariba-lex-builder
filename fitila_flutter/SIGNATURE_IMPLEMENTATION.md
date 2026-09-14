# FITILA Signature — suivi d’intégration

Date : 13 septembre 2026.

## Changements intégrés

- Thème Flutter commun : Inter embarquée, fond ivoire, cartes blanches avec bordures fines, composants arrondis, couleur de bouton orange foncé et navigation Material 3.
- Navigation mobile Fil / Apprendre / Langues / IA / Moi. Les panneaux de sélection ouvrent les écrans Flutter existants ; le menu complet reste disponible.
- Conservation en mémoire des recherches, saisies et sélections des modules dictionnaire, traducteur, apprentissage et IA. Cette conservation ne constitue pas une sauvegarde persistante après fermeture de l’application.
- Historique de navigation interne pour le bouton Retour Android.
- Les écrans multimédias ne restent pas montés après leur fermeture, afin de libérer leurs lecteurs et enregistreurs.
- Filtres Classe défilables horizontalement sur téléphone.
- Tests de rendu Flutter et captures de référence, avec données de démonstration clairement distinctes des données serveur.

## Parcours de recette

1. Connexion de démonstration → Fil → Langues → Traducteur → saisie → Fil → Traducteur : conserver la saisie.
2. Retour système depuis le Traducteur : revenir à l’écran précédemment visité.
3. Apprendre → Classe → Niveau 1 / Niveau 2 → sections et détail de leçon.
4. Langues → Dictionnaire → recherche → détail d’un mot.
5. IA → choix FITILA IA ou Tem IA ; ne pas confondre leur domaine fonctionnel.
6. Moi → Profil / Paramètres ; menu latéral pour les autres modules.

## Écarts existants à traiter avant production

L’application contient encore des panneaux descriptifs `_FeatureGrid` et `_ActionList`, ainsi que des statistiques fixes. Un changement de thème ne raccorde pas ces fonctions au backend.

Les principaux écarts concernent notamment les corrections et carnets de notes, certains écrans enseignant, les contributions et validations lexicographiques, les favoris, notifications, synchronisation hors ligne, paiements, messagerie et plusieurs outils du créateur. Les permissions serveur et la parité avec le Web doivent être vérifiées pour chaque action.

La présence d’un écran, d’une capture ou d’un test de rendu ne prouve pas qu’une opération métier fonctionne. Les tests automatisés de cette livraison n’envoient aucune publication, aucun message et aucune modification sur la plateforme de production.

L’APK `release/FITILA-1.8.0.apk` correspond à la version précédente. Il n’intègre pas ces changements tant qu’une nouvelle compilation n’a pas été effectuée.

## Maquettes natives et vérification

Le fichier `test/signature_ui_test.dart` génère les rendus des écrans dans `test/goldens/` avec `flutter test --update-goldens test/signature_ui_test.dart`. Les PNG sont des rendus du code Flutter intégré, pas des images de concept indépendantes.

Le scénario de navigation vérifie aussi la conservation de la saisie et le retour système. La vérification de production exige en complément les tests authentifiés par rôle, sur appareil, avec gestion des erreurs réseau et des permissions.
