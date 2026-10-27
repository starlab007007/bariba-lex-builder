#!/usr/bin/env bash
set -euo pipefail
cd fitila_flutter
mkdir -p integration_test build/ci-report
cp ../tests/android/dunya_offline_models_test.dart integration_test/dunya_offline_models_test.dart
# SDK-only test tooling; production dependency files are kept unchanged.
python3 - <<'PY'
from pathlib import Path
pubspec = Path('pubspec.yaml')
source = pubspec.read_text()
source = source.replace('dev_dependencies:\n', 'dev_dependencies:\n  integration_test:\n    sdk: flutter\n', 1)
pubspec.write_text(source)
PY
flutter pub get
log=build/ci-report/offline-models.txt
# Stream live test diagnostics to Actions instead of hiding every error for 15 minutes.
flutter test integration_test/dunya_offline_models_test.dart -d "${ANDROID_SERIAL:-emulator-5554}" > >(tee "$log") 2>&1 &
test_pid=$!
restore_network() { adb shell svc wifi enable || true; adb shell svc data enable || true; }
trap restore_network EXIT
disabled=false
# The integration test itself has a 12-minute timeout. Stop waiting shortly
# after that deadline and always publish actionable diagnostics.
for _ in $(seq 1 760); do
  if [ "$disabled" = false ] && adb shell run-as bj.fitila.fitila_native test -f files/fitila_offline_pack_ready >/dev/null 2>&1; then
    adb shell svc wifi disable
    adb shell svc data disable
    disabled=true
    echo 'Android Wi-Fi and mobile data disabled after pack verification.'
  fi
  if ! kill -0 "$test_pid" 2>/dev/null; then break; fi
  sleep 1
done
if kill -0 "$test_pid" 2>/dev/null; then
  kill "$test_pid" || true
  echo "::error::Offline-model test exceeded the watchdog (760 s)."
  adb logcat -d -s AndroidRuntime flutter FitilaByt5 | tail -180 > build/ci-report/offline-native-errors.txt || true
  cat build/ci-report/offline-native-errors.txt
  exit 1
fi
status=0
wait "$test_pid" || status=$?
cat "$log"
if [ "$status" -ne 0 ]; then
  adb logcat -d -s AndroidRuntime flutter FitilaByt5 | tail -180 > build/ci-report/offline-native-errors.txt || true
  cat build/ci-report/offline-native-errors.txt
fi
if [ "$disabled" != true ]; then
  echo "::error::Android pack-ready marker was never observed; check device startup, download URLs and app logs."
  adb shell dumpsys package bj.fitila.fitila_native | grep -m 3 -E 'versionCode|versionName|Package ' || true
  exit 1
fi
exit "$status"
