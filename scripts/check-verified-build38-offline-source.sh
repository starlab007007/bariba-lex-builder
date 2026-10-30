#!/usr/bin/env bash
# Real model verification succeeded in run 41037101471, job 124000519971.
# A test-file import fix must not repeat an unchanged 15-minute model scenario.
set -euo pipefail
verified=563542bbf0b7a03d601c06e15f4fd298c7aedfdc
git cat-file -e "$verified^{commit}" 2>/dev/null || git fetch --no-tags --depth=1 origin "$verified"
git diff --quiet "$verified" HEAD -- fitila_flutter \
  ':!fitila_flutter/test/tem_reply_audio_test.dart' .env \
  scripts/test-dunya-offline-models.sh tests/android/dunya_offline_models_test.dart
# Preserve the runner, SDK, emulator, and all execution steps outside this reuse block.
git show "$verified:.github/workflows/fitila-offline-model-smoke.yml" | sed '/      - name: Reuse real model checks/,/      - name: Free unused runner space/d' > /tmp/fitila-verified-model-workflow
sed '/      - name: Reuse real model checks/,/      - name: Free unused runner space/d' .github/workflows/fitila-offline-model-smoke.yml > /tmp/fitila-current-model-workflow
cmp /tmp/fitila-verified-model-workflow /tmp/fitila-current-model-workflow
