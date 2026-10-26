# FITILA — DUNYA et TEM, version 1.8.25+36

Point au 26 octobre 2026, heure du Bénin (Africa/Lagos, UTC+1).

Les correctifs web et serveurs sont déployés. La version Android **1.8.25+36** est EN VALIDATION ; sa publication est conditionnée à un essai réel des moteurs hors ligne. Le contrôle du build35 a révélé une seconde cause du blocage bariba : une incompatibilité entre les versions natives ONNX. Code applicatif corrigé : `41382e61229abb3a9ad6a06137290f7e27bcf0ae`.

## Changements livrés

| Demande | Résultat |
| --- | --- |
| Français DUNYA en ligne | Correction d’une erreur réelle du serveur Gemma lors du passage de l’historique assistant au SDK LiteRT. L’appel échouait avec HTTP 503 ; le même échange avec historique renvoie désormais HTTP 200. |
| Dictée française Android | Reconnaisseur natif `fr-FR`, résultats partiels, annulation et protection contre les anciens callbacks. Repli sur le moteur existant si le service Android est absent. |
| Bariba hors ligne après installation des packs | La première demande explicite en bariba active le pack ByT5 installé. Une désactivation ultérieure reste respectée. Les sessions ONNX et le cache sont réutilisés entre les tours. Les composants natifs Sherpa et Java sont épinglés sur un même runtime ONNX 1.27.0 ; un contrôle ELF des APK et un essai réel hors ligne bloquent toute publication incompatible. |
| Choix des langues | Français et Baatɔnum uniquement. Les anciens réglages « les deux » sont migrés vers le français. |
| FITILA IA sur Flutter | Remplacement de l’assistant général par TEM et le corpus du Code foncier, en texte et en vocal. Les 207 articles sont identiques à ceux du web. |
| Recherche foncière | Alignement du classement web/Flutter. Un numéro d’article explicite renvoie l’article complet et sa seule source ; vérifié dans le navigateur avec Saria 14se. |
| Stabilité du micro bariba | Seuil adapté aux voix faibles, suppression du silence initial avec préservation du début des mots, pause de fin plus tolérante, rejet des résultats de conversations annulées. |
| Reconnaissance serveur | FP32 sur CPU, concurrence bornée et nombre de threads limité pour éviter les inférences simultanées et la surallocation CPU. |
| Temps de réponse | Réponses vocales plus courtes, traduction rapide, cache limité aux réponses générées, sessions locales conservées et suppression d’un appel réseau systématiquement indisponible pour TEM. |
| Continuité du service | Une publication web ne redémarre plus les moteurs vocaux ; leur déploiement dispose de son propre contrôle et retour arrière. |

## Vérifications

- Ancien pipeline Android build35, 40244433332 : analyse Flutter, **297 tests Flutter**, compilation, clavier réel sur émulateur, signature et publication VPS réussis. Les régressions natives ont été reprises du contrôle réussi 40243175272 sur une arborescence Android et un pubspec strictement identiques. Le détail final est joint dans le fichier de vérification.
- Pipeline serveurs 40241887751 : tests et déploiement des passerelles voix/Gemma réussis.
- Fonctions Supabase actives : `fitila-ia-chat` version 21 et `dunya-voice-turn` version 19, déployées via le connecteur.
- Français avec historique : HTTP **503 avant → 200 après**, réponse serveur 5 339 ms sur le contrôle après correction.
- Essai vocal synthétique technique : **33 829 → 19 371 ms côté serveur**, soit **42,7 % de réduction** ; environ 23,7 s côté client. Un seul essai comparable, pas une garantie de latence ni une évaluation linguistique.
- Modèles publiés vérifiés par empreintes SHA-256 ; exécution locale Linux : reconnaissance française non vide en 0,573 s, synthèse bariba non vide en 0,172 s après chargement. Ces temps ne prédisent pas les performances d’un téléphone.
- Contrôle Android des vrais packs sans réseau : première tentative 40245390945 arrêtée avant l’inférence, car le signal de préparation du pilote était retenu dans les logs. Synchronisation corrigée par un fichier local sur l’émulateur ; la relance 40246209270 confirme la reconnaissance locale réseau coupé mais révèle l’échec d’initialisation de ByT5. Le contrôle binaire prouve que le cœur exporte `VERS_1.28.2` alors que JNI exige `VERS_1.22.0`. Les bibliothèques sélectionnées pour build36 partagent `VERS_1.27.0` ; contrôle ARM64 réussi, essai complet Android EN COURS.
- Interface publique : deux langues DUNYA, conversation française sur deux tours, corpus foncier et article exact contrôlés. Un ancien cache du navigateur a nécessité une actualisation pour charger la dernière version.

## Limites constatées

Le modèle de traduction ByT5 hors ligne conserve son statut **bêta non certifiée**. La correction d’activation ne certifie pas la qualité de ses traductions. Sur trois courts extraits bariba exécutés uniquement en local, le modèle ASR publié produit une transcription, mais présente encore 72,2 % d’erreurs de mots et 19,5 % d’erreurs de caractères. Ce petit contrôle n’est pas un benchmark indépendant ; il montre qu’une validation linguistique et un travail sur le modèle restent nécessaires. La stabilité technique améliorée ne signifie donc pas une reconnaissance bariba fiable dans toutes les situations.

Aucun téléphone physique de l’utilisateur n’a été utilisé pour ces contrôles. La voix française hors ligne dépend d’une voix système française installée ; le mode hors ligne ne force pas une voix nécessitant Internet.

Le secret GitHub `SUPABASE_ACCESS_TOKEN` reste invalide (401) : les deux fonctions ont été publiées via le connecteur, mais les prochains déploiements automatiques Supabase nécessiteront le remplacement de ce secret. Aucun appel payant Mistral ou Gemini n’a été ajouté.

Le contrôle d’approbation automatique a refusé un test distant sur des voix humaines, faute d’autorisation explicite pour ce transfert vers Supabase. Ce test n’a pas été relancé et ses résultats n’ont pas servi à cette validation ; les vérifications ont continué avec de la synthèse et de l’inférence locale.

## Preuves

- [Résumé des vérifications](dunya-tem-build36/verification.json)
- [DUNYA français et choix des langues](dunya-tem-build36/fitila-dunya-fr.jpg)
- [Article foncier exact sur le web](dunya-tem-build36/fitila-tem-article14.jpg)
