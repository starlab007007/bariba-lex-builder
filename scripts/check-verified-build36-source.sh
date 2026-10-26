#!/usr/bin/env bash
# Reuse the completed debug checks only for identical application/dependency
# sources. Release R8 configuration is checked separately in the actual APK.
set -euo pipefail
verified=41382e61229abb3a9ad6a06137290f7e27bcf0ae
git cat-file -e "$verified^{commit}" 2>/dev/null || git fetch --no-tags --depth=1 origin "$verified"
git diff --quiet "$verified" HEAD -- fitila_flutter \
  ':!fitila_flutter/android/app/proguard-rules.pro' .env \
  scripts/test-native-keyboard-translator.py \
  scripts/test-dunya-offline-models.sh tests/android/dunya_offline_models_test.dart
