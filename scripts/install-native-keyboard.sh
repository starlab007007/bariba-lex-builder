#!/bin/bash
set -e

echo "🎹 Installation du clavier natif Bariba Fitila..."
echo ""

PROJECT_DIR="$(pwd)"
ANDROID_DIR="$PROJECT_DIR/android/app/src/main"
MANIFEST="$ANDROID_DIR/AndroidManifest.xml"
NATIVE_SRC="$PROJECT_DIR/android-native"

# Check android directory exists
if [ ! -d "$ANDROID_DIR" ]; then
  echo "❌ Dossier android/ non trouvé. Exécutez d'abord :"
  echo "   npx cap add android"
  exit 1
fi

if [ ! -d "$NATIVE_SRC" ]; then
  echo "❌ Dossier android-native/ non trouvé. Vérifiez que vous avez fait git pull."
  exit 1
fi

# ── 1. Copy Java/Kotlin files ──
echo "📂 Copie des fichiers Java/Kotlin..."
JAVA_DEST="$ANDROID_DIR/java/com/fitila/bariba"
mkdir -p "$JAVA_DEST"
cp "$NATIVE_SRC/java/com/fitila/bariba/BaribaInputMethodService.kt" "$JAVA_DEST/"
cp "$NATIVE_SRC/java/com/fitila/bariba/BaribaKeyboardPlugin.java" "$JAVA_DEST/"
echo "  ✅ BaribaInputMethodService.kt"
echo "  ✅ BaribaKeyboardPlugin.java"

# ── 2. Copy resource files ──
echo "📂 Copie des ressources Android..."
mkdir -p "$ANDROID_DIR/res/layout"
mkdir -p "$ANDROID_DIR/res/values"
mkdir -p "$ANDROID_DIR/res/drawable"
mkdir -p "$ANDROID_DIR/res/xml"

cp "$NATIVE_SRC/res/layout/keyboard_bariba.xml" "$ANDROID_DIR/res/layout/"
echo "  ✅ keyboard_bariba.xml"

cp "$NATIVE_SRC/res/values/styles_keyboard.xml" "$ANDROID_DIR/res/values/"
echo "  ✅ styles_keyboard.xml"

cp "$NATIVE_SRC/res/drawable/key_background.xml" "$ANDROID_DIR/res/drawable/"
echo "  ✅ key_background.xml"

cp "$NATIVE_SRC/res/xml/method.xml" "$ANDROID_DIR/res/xml/"
echo "  ✅ method.xml"

# ── 3. Patch AndroidManifest.xml — Add permissions ──
echo "📝 Patch du AndroidManifest.xml..."

if ! grep -q "android.permission.CAMERA" "$MANIFEST"; then
  sed -i.bak 's|<application|<uses-permission android:name="android.permission.CAMERA" />\
    <uses-permission android:name="android.permission.RECORD_AUDIO" />\
    <uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />\
    <uses-permission android:name="android.permission.INTERNET" />\
\
    <application|' "$MANIFEST"
  echo "  ✅ Permissions CAMERA, RECORD_AUDIO, MODIFY_AUDIO_SETTINGS ajoutées"
else
  echo "  ℹ️  Permissions déjà présentes"
fi

# ── 4. Patch AndroidManifest.xml — Add InputMethodService ──
if ! grep -q "BaribaInputMethodService" "$MANIFEST"; then
  sed -i.bak 's|</application>|        <service\
            android:name="com.fitila.bariba.BaribaInputMethodService"\
            android:label="Clavier Bariba Fitila"\
            android:permission="android.permission.BIND_INPUT_METHOD"\
            android:exported="true">\
            <intent-filter>\
                <action android:name="android.view.InputMethod" />\
            </intent-filter>\
            <meta-data\
                android:name="android.view.im"\
                android:resource="@xml/method" />\
        </service>\
    </application>|' "$MANIFEST"
  echo "  ✅ Service BaribaInputMethodService déclaré dans le manifest"
else
  echo "  ℹ️  Service IME déjà déclaré"
fi

# ── 5. Register plugin in MainActivity ──
MAIN_ACTIVITY="$ANDROID_DIR/java"
MAIN_FILE=$(find "$MAIN_ACTIVITY" -name "MainActivity.java" -o -name "MainActivity.kt" 2>/dev/null | head -1)

if [ -n "$MAIN_FILE" ]; then
  if ! grep -q "BaribaKeyboardPlugin" "$MAIN_FILE"; then
    if echo "$MAIN_FILE" | grep -q "\.java$"; then
      # Java MainActivity — add import and plugin registration
      if ! grep -q "import com.fitila.bariba.BaribaKeyboardPlugin" "$MAIN_FILE"; then
        sed -i.bak 's|import com.getcapacitor.BridgeActivity;|import com.getcapacitor.BridgeActivity;\nimport com.fitila.bariba.BaribaKeyboardPlugin;|' "$MAIN_FILE"
      fi
      # Add to onCreate if it has registerPlugin or add method
      if grep -q "onCreate" "$MAIN_FILE"; then
        sed -i.bak '/super.onCreate/a\        registerPlugin(BaribaKeyboardPlugin.class);' "$MAIN_FILE"
      fi
      echo "  ✅ BaribaKeyboardPlugin enregistré dans MainActivity.java"
    else
      echo "  ⚠️  MainActivity.kt détecté — ajoutez manuellement :"
      echo "       registerPlugin(BaribaKeyboardPlugin::class.java)"
    fi
  else
    echo "  ℹ️  Plugin déjà enregistré dans MainActivity"
  fi
else
  echo "  ⚠️  MainActivity non trouvé. Ajoutez manuellement le plugin."
fi

# ── 6. Cleanup backup files ──
find "$ANDROID_DIR" -name "*.bak" -delete 2>/dev/null || true

echo ""
echo "═══════════════════════════════════════════════════════"
echo "  ✅ Clavier natif Bariba installé avec succès !"
echo "═══════════════════════════════════════════════════════"
echo ""
echo "Prochaines étapes :"
echo "  1. npm run build"
echo "  2. npx cap sync android"
echo "  3. npx cap open android"
echo "  4. Build > Generate Signed APK"
echo ""
echo "Sur le téléphone :"
echo "  Paramètres → Langue et saisie → Clavier virtuel"
echo "  → Gérer les claviers → Activer 'Clavier Bariba Fitila'"
echo ""