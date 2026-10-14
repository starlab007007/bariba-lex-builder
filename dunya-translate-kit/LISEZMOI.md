# Kit d'entraînement FITILA (traducteur FR ↔ Baatɔnum)

1. kaggle.com → *Datasets* → *New Dataset* → téléverser ce zip (nom : `dunya-translate-kit`).
2. *Code* → *New Notebook* → *File ▸ Import Notebook* → `notebook-kaggle.ipynb`.
3. Panneau de droite : *Add Input* = votre dataset ; *Accelerator* = GPU T4 ; *Internet* = On.
   (Optionnel) *Add-ons ▸ Secrets* : `HF_TOKEN` (jeton Hugging Face en lecture) pour repartir des poids v03.
4. *Run All* (≈ 2 à 4 h). À la fin, télécharger `dunya-translate-result.zip` (modèle + ONNX + rapports) et me l'envoyer.

Rien ne quitte votre compte : le kit ne contient que des phrases du dictionnaire, d'Apprendre et des scènes FITILA.
Pour de meilleurs résultats : faire relire `data/translation/gold_review.csv` par des enseignants avant de conclure.
