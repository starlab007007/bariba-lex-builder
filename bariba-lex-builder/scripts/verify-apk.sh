#!/bin/bash
# Vérifie qu'un APK contient bien le dernier service IME corrigé.
# Usage: bash scripts/verify-apk.sh apk-output/fitila-bariba-xxx.apk
set -e

APK="${1:-}"
if [ -z "$APK" ] || [ ! -f "$APK" ]; then
  echo "Usage: bash scripts/verify-apk.sh <chemin-apk>"
  exit 1
fi

EXPECTED_TAG="fitila-ime-2026-05-12-smart-v6"

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

# 2. BUILD_TAG dans le DEX
TMP=$(mktemp -d)
unzip -q "$APK" "classes*.dex" -d "$TMP" || true
FOUND=0
for dex in "$TMP"/*.dex; do
  [ -f "$dex" ] || continue
  if strings "$dex" | grep -q "$EXPECTED_TAG"; then
    FOUND=1; break
  fi
done
rm -rf "$TMP"

if [ "$FOUND" -eq 1 ]; then
  echo "  ✅ BUILD_TAG=$EXPECTED_TAG trouvé dans le DEX"
  echo ""
  echo "✅ APK conforme au dernier correctif."
else
  echo "  ❌ BUILD_TAG=$EXPECTED_TAG ABSENT — l'APK ne contient pas le dernier service"
  echo ""
  echo "❌ APK NON conforme. Rebuild requis."
  exit 4
fi