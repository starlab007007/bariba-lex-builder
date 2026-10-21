#!/usr/bin/env bash
# Builds fitila-v05-bundle.zip: the code + data the Kaggle notebook fitila_byt5_v05.ipynb needs.
# Upload the zip as a private Kaggle dataset, then attach it to the notebook ("Add data").
set -euo pipefail
cd "$(dirname "$0")/../../.."
out="${1:-fitila-v05-bundle.zip}"
rm -f "$out"
zip -q -r "$out" scripts/dunya_translate -x '*/__pycache__/*' 'scripts/dunya_translate/kaggle/*'
zip -q "$out" data/translation/parallel.jsonl data/translation/glossary.json data/translation/multitask.jsonl \
  data/translation/preference.jsonl data/translation/gold_candidates.jsonl
echo "$out: $(du -h "$out" | cut -f1)"
