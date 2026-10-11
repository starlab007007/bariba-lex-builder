# DUNYA — traduction ByT5 hors ligne (mode Baatɔnum)

1. `export_byt5_onnx.py` convertit le modèle ByT5 FITILA en `encoder.onnx` / `decoder.onnx`
   (+ int8) et vérifie que le décodage ONNX reproduit exactement PyTorch.
   Validé sur un ByT5 de test : sorties identiques en précision complète.
2. `android/DunyaByt5Channel.kt` : moteur Android (ONNX Runtime) prêt à intégrer.
   Activation : ajouter `com.microsoft.onnxruntime:onnxruntime-android` **à la même version que
   l'ONNX Runtime de sherpa-onnx (1.28.2)** et `packaging { jniLibs { pickFirsts += "**/libonnxruntime.so" } }`,
   puis enregistrer le canal dans `MainActivity`. Côté Dart, `lib/dunya/voice/dunya_byt5.dart` est déjà prêt.
3. Pack `dunya-translate-byt5` : `byt5/encoder.onnx`, `byt5/decoder.onnx`, `byt5/config.json`
   (`prefix_fr_ba`, `prefix_ba_fr` : préfixes exacts attendus par le modèle, à reprendre de l'app du Space).

Prérequis : accès aux poids `zimesongbian/modele_byt5_bariba_expert_api_v03_improve`
(modèle privé) via un secret GitHub `HF_TOKEN`, ou modèle rendu public.
