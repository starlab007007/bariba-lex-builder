# Audit FITILA Apprendre v2.4

## Points solides

1. Le contenu d'apprentissage, la révision espacée et les scènes de vie sont séparés proprement de la couche Voix.
2. Le circuit Voix impose la séparation locuteur / validateur et bloque l'auto-validation d'une prise.
3. Une voix n'est exposée à l'apprenant que si elle est active et correspond toujours au texte courant via `text_hash`.
4. Le retrait de consentement désactive toutes les prises du locuteur.
5. L'analyse de prononciation fonctionne localement et peut donc servir en faible connexion.
6. L'administration couvre validation, publication, lots, contributeurs, signalements, réglages et audit.

## Risques corrigés dans v2.4

- **Régression fonctionnelle** : le lot Voix venait d'une base antérieure à la progression adaptative. La fusion réintroduit explicitement les fonctions adaptatives build18.
- **Téléchargement trop lourd** : le bouton « tout télécharger » était la seule option. v2.4 introduit les packs Essentiel / Scènes / Tout et respecte la voix choisie.
- **Surinterprétation des scores** : les seuils MFCC sont provisoires. v2.4 ajoute `compare_calibrated=false` par défaut et un avertissement utilisateur tant que le pilote n'est pas validé.
- **Cohérence des seuils** : contraintes SQL ajoutées sur l'ordre des seuils.

## Points à poursuivre après pilote réel

1. Calibrer MFCC et seuils de verdict sur au moins deux voix de référence et plusieurs locuteurs apprenants.
2. Tester les variantes régionales et décider si un même texte peut avoir plusieurs références actives selon la variante choisie.
3. Mesurer la taille réelle du pack Essentiel et ajuster `priority <= 2` si nécessaire.
4. Ajouter une politique opérationnelle de suppression définitive des fichiers audio après retrait de consentement, au-delà de leur simple désactivation.
5. Relier les difficultés de prononciation récurrentes à la Séance du jour, après validation des seuils sur données réelles.
6. Tester le parcours complet sur téléphone bas de gamme, réseau intermittent et stockage faible.
