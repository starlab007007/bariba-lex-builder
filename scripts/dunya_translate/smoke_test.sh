#!/usr/bin/env bash
# CI smoke test: exercises the whole pipeline on a random tiny ByT5 (no download, CPU, ~1 min).
set -euo pipefail
cd "$(dirname "$0")"
# build_corpus needs the Flutter data folder; otherwise the committed corpus is used.
[ -f ../../fitila_flutter/assets/data/apprendre_v2.json ] && python build_corpus.py >/dev/null || true
python make_training_data.py >/dev/null
python train_byt5.py --tiny --out /tmp/dunya-tiny --max-steps 5 --limit 64 --batch 4 --accum 1
python mine_hard_examples.py --tiny --model /tmp/dunya-tiny --limit 6 --samples 3
python dpo.py --tiny --model /tmp/dunya-tiny --out /tmp/dunya-tiny-dpo --limit 16 --batch 4
python eval_translation.py --backend hf --model /tmp/dunya-tiny-dpo --rag --limit 4 --out /tmp/dunya-tiny-eval.json >/dev/null
echo "smoke test OK"
