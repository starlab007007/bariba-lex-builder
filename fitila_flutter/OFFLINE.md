# FITILA Flutter — fonctionnement hors-ligne

Socle : `lib/core/offline.dart` (`FitilaOffline`).

- **État réseau** : `FitilaOffline.online` (sonde DNS toutes les 20 s, au retour dans l'app, et signalement des échecs).
- **Cache JSON** : lectures gardées sur l'appareil (profil, réglages, confidentialité, fil, réponses/progression/corrigés de la Classe).
- **File d'envoi** (`enqueue` / `flush`) : écritures faites hors-ligne, rejouées dans l'ordre au retour du réseau
  (réglages, confidentialité, profil, séances d'apprentissage, historique de traduction, réponses/progression/évaluations Classe).
  Une panne réseau arrête le rejeu sans rien perdre ; un refus serveur est retenté 5 fois puis abandonné.
- **Session** : la dernière identité est mémorisée ; sans réseau l'app s'ouvre sans déconnecter l'utilisateur.

| Module | Sans Internet |
|---|---|
| Dictionnaire | 100 % local (recherche, favoris, récents). Voix : téléphone (français) / voix Apprendre déjà téléchargées (Bàátɔ̀nú) |
| Apprendre | Contenu, progression et révision locaux ; séances mises en file ; voix téléchargeables |
| Clavier | Moteur et dictionnaire embarqués |
| Traducteur | Dictionnaire embarqué (phrases connues puis mot à mot), badge « dictionnaire local » |
| Classe | Contenu embarqué ; réponses écrites, progression et évaluations enregistrées puis synchronisées |
| Profil / Paramètres | Lecture depuis le cache, modifications mises en file, avatar en cache disque |

Nécessite Internet : connexion/inscription initiale, réponses vocales, voix IA, OCR, IA, mise en ligne de médias.
