#!/bin/bash
set -e

# ══════════════════════════════════════════════════════════════
# 🔧 Fitila Bariba — Build Release APK automatisé
# ══════════════════════════════════════════════════════════════
# Usage:
#   bash scripts/build-release-apk.sh
#
# Prérequis:
#   - Node.js 22 (nvm use 22)
#   - Android Studio installé
#   - ANDROID_HOME / ANDROID_SDK_ROOT configuré
#   - Java 17+ (pour Gradle)
# ══════════════════════════════════════════════════════════════

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_DIR"

OUTPUT_DIR="$PROJECT_DIR/apk-output"
KEYSTORE_DIR="$PROJECT_DIR/.keystore"
KEYSTORE_FILE="$KEYSTORE_DIR/fitila-release.jks"
KEYSTORE_ALIAS="fitila"
KEYSTORE_PASSWORD="${KEYSTORE_PASSWORD:-FitilaBariba2024}"

echo ""
echo "═══════════════════════════════════════════════════════"
echo "  🎹 Fitila Bariba — Build Release APK"
echo "═══════════════════════════════════════════════════════"
echo ""

# ── Step 1: Check prerequisites ──
echo "🔍 Vérification des prérequis..."

if ! command -v node &> /dev/null; then
  echo "❌ Node.js non trouvé. Installez-le avec: nvm install 22"
  exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
  echo "❌ Node.js $NODE_VERSION détecté. Version 18+ requise (22 recommandée)"
  exit 1
fi
echo "  ✅ Node.js $(node -v)"

# Check ANDROID_HOME
if [ -z "$ANDROID_HOME" ] && [ -z "$ANDROID_SDK_ROOT" ]; then
  # Try common macOS paths
  if [ -d "$HOME/Library/Android/sdk" ]; then
    export ANDROID_HOME="$HOME/Library/Android/sdk"
    export ANDROID_SDK_ROOT="$ANDROID_HOME"
    echo "  ✅ Android SDK trouvé: $ANDROID_HOME"
  elif [ -d "$HOME/Android/Sdk" ]; then
    export ANDROID_HOME="$HOME/Android/Sdk"
    export ANDROID_SDK_ROOT="$ANDROID_HOME"
    echo "  ✅ Android SDK trouvé: $ANDROID_HOME"
  else
    echo "❌ ANDROID_HOME non configuré. Ajoutez à ~/.zshrc :"
    echo "   export ANDROID_HOME=\$HOME/Library/Android/sdk"
    echo "   export PATH=\$PATH:\$ANDROID_HOME/tools:\$ANDROID_HOME/platform-tools"
    exit 1
  fi
else
  echo "  ✅ Android SDK: ${ANDROID_HOME:-$ANDROID_SDK_ROOT}"
fi

# Check Java
if ! command -v java &> /dev/null; then
  echo "❌ Java non trouvé. Android Studio installe normalement JDK 17."
  exit 1
fi
echo "  ✅ Java: $(java -version 2>&1 | head -1)"

# ── Step 2: Install dependencies ──
echo ""
echo "📦 Installation des dépendances..."
npm install --legacy-peer-deps

# ── Step 3: Build web app ──
echo ""
echo "🏗️  Compilation React → dist/..."
npm run build

# ── Step 4: Add Android platform if needed ──
if [ ! -d "android" ]; then
  echo ""
  echo "📱 Ajout de la plateforme Android..."
  npx cap add android
fi

# ── Step 5: Install native keyboard + permissions ──
echo ""
echo "🎹 Installation du clavier natif Bariba..."
bash scripts/install-native-keyboard.sh

# ── Step 6: Sync Capacitor ──
echo ""
echo "🔄 Synchronisation Capacitor..."
npx cap sync android

# ── Step 7: Generate keystore if needed ──
mkdir -p "$KEYSTORE_DIR"
if [ ! -f "$KEYSTORE_FILE" ]; then
  echo ""
  echo "🔑 Génération du keystore de signature..."
  keytool -genkeypair \
    -v \
    -storetype JKS \
    -keyalg RSA \
    -keysize 2048 \
    -validity 10000 \
    -storepass "$KEYSTORE_PASSWORD" \
    -keypass "$KEYSTORE_PASSWORD" \
    -alias "$KEYSTORE_ALIAS" \
    -keystore "$KEYSTORE_FILE" \
    -dname "CN=Fitila Bariba, OU=Mobile, O=Fitila, L=Parakou, ST=Borgou, C=BJ"
  echo "  ✅ Keystore créé: $KEYSTORE_FILE"
  echo "  ⚠️  IMPORTANT: Sauvegardez ce fichier et le mot de passe !"
  echo "  ⚠️  Mot de passe: $KEYSTORE_PASSWORD"
else
  echo ""
  echo "🔑 Keystore existant trouvé: $KEYSTORE_FILE"
fi

# ── Step 8: Create signing config for Gradle ──
SIGNING_PROPS="android/app/signing.properties"
cat > "$SIGNING_PROPS" << EOF
storeFile=$KEYSTORE_FILE
storePassword=$KEYSTORE_PASSWORD
keyAlias=$KEYSTORE_ALIAS
keyPassword=$KEYSTORE_PASSWORD
EOF
echo "  ✅ Configuration de signature: $SIGNING_PROPS"

# ── Step 9: Patch build.gradle for release signing ──
BUILD_GRADLE="android/app/build.gradle"
if [ -f "$BUILD_GRADLE" ] && ! grep -q "signingConfigs" "$BUILD_GRADLE"; then
  echo ""
  echo "📝 Configuration Gradle pour la signature release..."
  
  # Add signing config before buildTypes
  sed -i.bak '/buildTypes {/i\
    // Fitila release signing config\
    def signingPropsFile = file("signing.properties")\
    def signingProps = new Properties()\
    if (signingPropsFile.exists()) {\
        signingProps.load(new FileInputStream(signingPropsFile))\
    }\
\
    signingConfigs {\
        release {\
            if (signingPropsFile.exists()) {\
                storeFile file(signingProps["storeFile"])\
                storePassword signingProps["storePassword"]\
                keyAlias signingProps["keyAlias"]\
                keyPassword signingProps["keyPassword"]\
            }\
        }\
    }\
' "$BUILD_GRADLE"
  
  # Add signingConfig to release buildType
  sed -i.bak 's/buildTypes {/buildTypes {\
        release {\
            signingConfig signingConfigs.release\
            minifyEnabled false\
            proguardFiles getDefaultProguardFile("proguard-android.txt"), "proguard-rules.pro"\
        }/' "$BUILD_GRADLE"
  
  # Cleanup backups
  find android/ -name "*.bak" -delete 2>/dev/null || true
  echo "  ✅ Gradle configuré pour la signature release"
fi

# ── Step 10: Build the APK ──
echo ""
echo "🔨 Compilation de l'APK release..."
cd android

# Use gradlew (Gradle Wrapper)
if [ -f "gradlew" ]; then
  chmod +x gradlew
  ./gradlew assembleRelease --no-daemon 2>&1 | tail -20
else
  echo "❌ gradlew non trouvé dans android/. Essayez: npx cap open android"
  exit 1
fi

cd "$PROJECT_DIR"

# ── Step 11: Copy APK to output ──
echo ""
echo "📦 Copie de l'APK..."
mkdir -p "$OUTPUT_DIR"

APK_PATH=$(find android/app/build/outputs/apk/release -name "*.apk" 2>/dev/null | head -1)

if [ -z "$APK_PATH" ]; then
  # Fallback: check debug
  APK_PATH=$(find android/app/build/outputs/apk -name "*.apk" 2>/dev/null | head -1)
fi

if [ -n "$APK_PATH" ]; then
  TIMESTAMP=$(date +%Y%m%d_%H%M%S)
  OUTPUT_FILE="$OUTPUT_DIR/fitila-bariba-release-$TIMESTAMP.apk"
  cp "$APK_PATH" "$OUTPUT_FILE"
  
  APK_SIZE=$(du -h "$OUTPUT_FILE" | cut -f1)
  
  echo ""
  echo "═══════════════════════════════════════════════════════"
  echo "  ✅ APK GÉNÉRÉ AVEC SUCCÈS !"
  echo "═══════════════════════════════════════════════════════"
  echo ""
  echo "  📱 Fichier : $OUTPUT_FILE"
  echo "  📏 Taille  : $APK_SIZE"
  echo ""
  echo "  Pour installer sur votre téléphone :"
  echo "  1. Connectez votre Android en USB"
  echo "  2. adb install \"$OUTPUT_FILE\""
  echo "  ou transférez le fichier .apk et ouvrez-le"
  echo ""
  echo "  Après installation :"
  echo "  • Paramètres → Langue et saisie → Activer Clavier Bariba"
  echo "  • Ouvrir l'app → Onglet 📱 pour les permissions"
  echo ""
else
  echo "❌ APK non trouvé. Vérifiez les erreurs Gradle ci-dessus."
  echo "   Essayez: cd android && ./gradlew assembleRelease --stacktrace"
  exit 1
fi