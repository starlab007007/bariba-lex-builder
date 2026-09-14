#!/bin/bash
# Script to add required permissions to AndroidManifest.xml
# Run after: npx cap add android

MANIFEST="android/app/src/main/AndroidManifest.xml"

if [ ! -f "$MANIFEST" ]; then
  echo "❌ $MANIFEST not found. Run 'npx cap add android' first."
  exit 1
fi

# Check if permissions already added
if grep -q "android.permission.CAMERA" "$MANIFEST"; then
  echo "✅ Permissions already present in AndroidManifest.xml"
  exit 0
fi

# Add permissions before <application
sed -i.bak 's|<application|<uses-permission android:name="android.permission.CAMERA" />\
    <uses-permission android:name="android.permission.RECORD_AUDIO" />\
    <uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />\
    <uses-permission android:name="android.permission.INTERNET" />\
\
    <application|' "$MANIFEST"

echo "✅ Permissions CAMERA, RECORD_AUDIO, MODIFY_AUDIO_SETTINGS, INTERNET added to AndroidManifest.xml"
echo "📱 You can now build the APK: npx cap open android"