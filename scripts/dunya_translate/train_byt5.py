#!/usr/bin/env python3
"""Stage 1 — supervised fine-tuning of ByT5 on the FITILA corpus d'or.

  python make_training_data.py
  python train_byt5.py --model google/byt5-small --out out/byt5-v04 --epochs 8      # GPU (Kaggle/Colab T4 is enough)
  python train_byt5.py --model zimesongbian/modele_byt5_bariba_expert_api_v03_improve --out out/byt5-v04 --epochs 4 --lr 1e-4

The model is trained with AND without retrieval hints (see make_training_data.py)
and on the Apprendre multitask data (cloze, plural, focus form). Continue from
the deployed v03 weights to keep what it already knows.
"""

from __future__ import annotations

import argparse
from pathlib import Path

import torch
from transformers import Seq2SeqTrainer, Seq2SeqTrainingArguments

from byt_common import Pairs, collate, load_model, read_jsonl, seed_all


def main() -> None:
    root = Path(__file__).resolve().parents[2] / "data/translation/training"
    ap = argparse.ArgumentParser()
    ap.add_argument("--model", default="google/byt5-small")
    ap.add_argument("--data", default=str(root))
    ap.add_argument("--out", required=True)
    ap.add_argument("--epochs", type=float, default=8)
    ap.add_argument("--lr", type=float, default=3e-4)
    ap.add_argument("--batch", type=int, default=16)
    ap.add_argument("--accum", type=int, default=2)
    ap.add_argument("--max-steps", type=int, default=-1)
    ap.add_argument("--limit", type=int, default=0, help="use only N training rows (smoke tests)")
    ap.add_argument("--tiny", action="store_true", help="random tiny model: CI smoke test only")
    ap.add_argument("--seed", type=int, default=7)
    args = ap.parse_args()
    seed_all(args.seed)

    data = Path(args.data)
    train, dev = read_jsonl(data / "train.jsonl"), read_jsonl(data / "dev.jsonl")
    if args.limit:
        train, dev = train[: args.limit], dev[: max(args.limit // 4, 8)]
    model = load_model(args.model, args.tiny)

    use_bf16 = torch.cuda.is_available() and torch.cuda.is_bf16_supported()
    targs = Seq2SeqTrainingArguments(
        output_dir=args.out, per_device_train_batch_size=args.batch, per_device_eval_batch_size=args.batch,
        gradient_accumulation_steps=args.accum, learning_rate=args.lr, num_train_epochs=args.epochs,
        max_steps=args.max_steps, optim="adafactor", lr_scheduler_type="constant_with_warmup", warmup_steps=100,
        bf16=use_bf16, fp16=False,  # T5 family overflows in fp16
        eval_strategy="epoch" if args.max_steps < 0 else "no", save_strategy="epoch" if args.max_steps < 0 else "no",
        save_total_limit=2, load_best_model_at_end=args.max_steps < 0, metric_for_best_model="eval_loss",
        logging_steps=50, report_to=[], remove_unused_columns=False, seed=args.seed, use_cpu=not torch.cuda.is_available(),
    )
    trainer = Seq2SeqTrainer(model=model, args=targs, train_dataset=Pairs(train), eval_dataset=Pairs(dev), data_collator=collate)
    trainer.train()
    trainer.save_model(args.out)
    print("saved", args.out)


if __name__ == "__main__":
    main()
