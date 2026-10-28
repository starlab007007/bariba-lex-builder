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
# A transient CDN disconnect must not be mistaken for a defective offline model.
# Retry the complete real-device scenario once, with a clean ready marker.
attempt=1
max_attempts=2
while true; do
  adb shell run-as bj.fitila.fitila_native rm -f files/fitila_offline_pack_ready >/dev/null 2>&1 || true
  flutter test integration_test/dunya_offline_models_test.dart -d "${ANDROID_SERIAL:-emulator-5554}" > >(tee "$log") 2>&1 &
  test_pid=$!
  disabled=false
  restore_network() { adb shell svc wifi enable || true; adb shell svc data enable || true; }
  # Keep the existing runtime validation; never mark an incomplete download as success.
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
    wait "$test_pid" || true
    echo "::error::Offline model test exceeded 760 seconds."
    exit 1
  fi
  status=0
  wait "$test_pid" || status=$?
  if [ "$status" -eq 0 ] && [ "$disabled" = true ]; then exit 0; fi
  if [ "$attempt" -ge "$max_attempts" ]; then break; fi
  echo "::warning::Offline model validation attempt $attempt failed. Retrying once after restoring network."
  restore_network
  sleep 8
  attempt=$((attempt + 1))
done
echo "::error::Offline validation failed after $max_attempts attempts; releasing an APK is blocked."
adb logcat -d -s AndroidRuntime flutter FitilaByt5 | tail -180 > build/ci-report/offline-native-errors.txt || true
cat build/ci-report/offline-native-errors.txt
exit 1
