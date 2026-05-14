#!/bin/bash
# Vérifie qu'un APK contient bien le dernier service IME corrigé.
# Usage: bash scripts/verify-apk.sh apk-output/fitila-bariba-xxx.apk
set -e

APK="${1:-}"
if [ -z "$APK" ] || [ ! -f "$APK" ]; then
  echo "Usage: bash scripts/verify-apk.sh <chemin-apk>"
  exit 1
fi

EXPECTED_TAG="fitila-ime-2026-05-13-smart-v8-bilingue"

echo "🔎 Inspection de $APK"

# 1. Manifest IME theme
if command -v aapt2 >/dev/null; then
  MANIFEST=$(aapt2 dump xmltree "$APK" --file AndroidManifest.xml 2>/dev/null || true)
elif command -v aapt >/dev/null; then
  MANIFEST=$(aapt dump xmltree "$APK" AndroidManifest.xml 2>/dev/null || true)
else
  echo "⚠️  aapt/aapt2 non trouvé — installation Android SDK requise."
  MANIFEST=""
fi

if [ -n "$MANIFEST" ]; then
  if echo "$MANIFEST" | grep -q "BaribaInputMethodService"; then
    echo "  ✅ Service IME présent dans le manifest"
  else
    echo "  ❌ Service IME MANQUANT — APK obsolète"; exit 2
  fi
  if echo "$MANIFEST" | grep -q "Theme.DeviceDefault.InputMethod\|0x010301f4\|DeviceDefault"; then
    echo "  ✅ Thème IME DeviceDefault appliqué"
  else
    echo "  ❌ Thème IME absent — risque de crash AppCompat"; exit 3
  fi
fi

# 2. Asset dictionnaire embarqué
if unzip -l "$APK" | grep -q "assets/bariba_dictionary.json"; then
  echo "  ✅ Asset assets/bariba_dictionary.json présent"
else
  echo "  ❌ Asset assets/bariba_dictionary.json MANQUANT — rebuild requis"; exit 5
fi

# 3. BUILD_TAG + classes attendues dans le DEX
TMP=$(mktemp -d)
unzip -q "$APK" "classes*.dex" -d "$TMP" || true
FOUND=0
FOUND_DICT=0
for dex in "$TMP"/*.dex; do
  [ -f "$dex" ] || continue
  if strings "$dex" | grep -q "$EXPECTED_TAG"; then
    FOUND=1
  fi
  if strings "$dex" | grep -q "BaribaDictionary"; then
    FOUND_DICT=1
  fi
  [ "$FOUND" -eq 1 ] && [ "$FOUND_DICT" -eq 1 ] && break
done
rm -rf "$TMP"

if [ "$FOUND" -eq 1 ] && [ "$FOUND_DICT" -eq 1 ]; then
  echo "  ✅ BUILD_TAG=$EXPECTED_TAG trouvé dans le DEX"
  echo "  ✅ Classe BaribaDictionary trouvée dans le DEX"
  echo ""
  echo "✅ APK conforme au dernier correctif."
else
  [ "$FOUND" -eq 1 ] || echo "  ❌ BUILD_TAG=$EXPECTED_TAG ABSENT"
  [ "$FOUND_DICT" -eq 1 ] || echo "  ❌ Classe BaribaDictionary ABSENTE"
  echo ""
  echo "❌ APK NON conforme. Rebuild requis."
  exit 4
fi