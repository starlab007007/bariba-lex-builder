#!/bin/bash
set -e

echo "🎹 Installation du clavier natif Bariba Fitila..."

PROJECT_DIR="$(pwd)"
ANDROID_DIR="$PROJECT_DIR/android/app/src/main"
MANIFEST="$ANDROID_DIR/AndroidManifest.xml"
NATIVE_SRC="$PROJECT_DIR/android-native"

if [ ! -d "$ANDROID_DIR" ]; then
  echo "❌ Dossier android/ non trouvé. Exécutez d'abord : npx cap add android"
  exit 1
fi
if [ ! -d "$NATIVE_SRC" ]; then
  echo "❌ Dossier android-native/ non trouvé."
  exit 1
fi

# 1. Copy Java/Kotlin
JAVA_DEST="$ANDROID_DIR/java/com/fitila/bariba"
mkdir -p "$JAVA_DEST"
cp "$NATIVE_SRC/java/com/fitila/bariba/BaribaInputMethodService.java" "$JAVA_DEST/"
cp "$NATIVE_SRC/java/com/fitila/bariba/BaribaKeyboardPlugin.java" "$JAVA_DEST/"
if [ -f "$NATIVE_SRC/java/com/fitila/bariba/BaribaDictionary.java" ]; then
  cp "$NATIVE_SRC/java/com/fitila/bariba/BaribaDictionary.java" "$JAVA_DEST/"
fi

# 1b. Copy embedded dictionary asset
ASSETS_DEST="$ANDROID_DIR/assets"
mkdir -p "$ASSETS_DEST"
if [ -f "$NATIVE_SRC/assets/bariba_dictionary.json" ]; then
  cp "$NATIVE_SRC/assets/bariba_dictionary.json" "$ASSETS_DEST/"
  echo "  ✅ Asset bariba_dictionary.json copié"
else
  echo "  ⚠️  Asset bariba_dictionary.json absent — exécutez 'node scripts/build-bariba-dictionary-asset.mjs'"
fi

# 2. Copy resources
mkdir -p "$ANDROID_DIR/res/layout" "$ANDROID_DIR/res/values" "$ANDROID_DIR/res/drawable" "$ANDROID_DIR/res/xml"
cp "$NATIVE_SRC/res/layout/keyboard_bariba.xml" "$ANDROID_DIR/res/layout/"
cp "$NATIVE_SRC/res/values/styles_keyboard.xml" "$ANDROID_DIR/res/values/"
cp "$NATIVE_SRC/res/drawable/key_background.xml" "$ANDROID_DIR/res/drawable/"
cp "$NATIVE_SRC/res/xml/method.xml" "$ANDROID_DIR/res/xml/"

# 3. Patch AndroidManifest.xml — idempotent, always sets android:theme on the IME service
python3 - "$MANIFEST" <<'PY'
import re, sys, pathlib
p = pathlib.Path(sys.argv[1])
src = p.read_text()

for perm in ['android.permission.CAMERA','android.permission.RECORD_AUDIO',
             'android.permission.MODIFY_AUDIO_SETTINGS','android.permission.INTERNET']:
    if perm not in src:
        src = src.replace('<application',
            f'<uses-permission android:name="{perm}" />\n    <application', 1)

block = (
    '        <service\n'
    '            android:name="com.fitila.bariba.BaribaInputMethodService"\n'
    '            android:label="Clavier Bariba Fitila"\n'
    '            android:permission="android.permission.BIND_INPUT_METHOD"\n'
    '            android:theme="@android:style/Theme.DeviceDefault.InputMethod"\n'
    '            android:exported="true">\n'
    '            <intent-filter>\n'
    '                <action android:name="android.view.InputMethod" />\n'
    '            </intent-filter>\n'
    '            <meta-data\n'
    '                android:name="android.view.im"\n'
    '                android:resource="@xml/method" />\n'
    '        </service>\n'
)
src = re.sub(r'\s*<service\b[^>]*BaribaInputMethodService[\s\S]*?</service>\s*', '\n', src)
src = src.replace('</application>', block + '    </application>', 1)
p.write_text(src)
print("  ✅ Manifest patché (service IME avec theme DeviceDefault.InputMethod)")
PY

# 4. Register plugin in MainActivity (Java/Kotlin)
MAIN_FILE=$(find "$ANDROID_DIR/java" -name "MainActivity.java" -o -name "MainActivity.kt" 2>/dev/null | head -1)
if [ -n "$MAIN_FILE" ] && ! grep -q "BaribaKeyboardPlugin" "$MAIN_FILE"; then
  if echo "$MAIN_FILE" | grep -q "\.java$"; then
    sed -i.bak 's|import com.getcapacitor.BridgeActivity;|import com.getcapacitor.BridgeActivity;\nimport com.fitila.bariba.BaribaKeyboardPlugin;|' "$MAIN_FILE"
    grep -q "onCreate" "$MAIN_FILE" && sed -i.bak '/super.onCreate/a\        registerPlugin(BaribaKeyboardPlugin.class);' "$MAIN_FILE"
    echo "  ✅ BaribaKeyboardPlugin enregistré"
  fi
fi

find "$ANDROID_DIR" -name "*.bak" -delete 2>/dev/null || true

echo "✅ Clavier natif Bariba installé."
