"""Byte-level helpers shared by SFT, hard-example mining and DPO.

ByT5 needs no tokenizer file: token = UTF-8 byte + 3 (0 pad / decoder start,
1 </s>, 2 <unk>). The phone and the edge function do exactly the same.
"""

from __future__ import annotations

import json
import random
from pathlib import Path

import torch

MAX_IN, MAX_OUT = 512, 256


def encode(text: str, limit: int) -> list[int]:
    return [b + 3 for b in text.encode("utf-8")][: limit - 1] + [1]


def decode(ids: list[int]) -> str:
    return bytes(i - 3 for i in ids if 3 <= i < 259).decode("utf-8", errors="ignore")


def read_jsonl(path: Path) -> list[dict]:
    return [json.loads(line) for line in path.open(encoding="utf-8")]


def pad(seqs: list[list[int]], value: int) -> torch.Tensor:
    width = max(len(s) for s in seqs)
    return torch.tensor([s + [value] * (width - len(s)) for s in seqs], dtype=torch.long)


class Pairs(torch.utils.data.Dataset):
    def __init__(self, rows: list[dict]) -> None:
        self.rows = rows

    def __len__(self) -> int:
        return len(self.rows)

    def __getitem__(self, i: int) -> dict:
        r = self.rows[i]
        return {"input_ids": encode(r["input"], MAX_IN), "labels": encode(r["target"], MAX_OUT)}


def collate(batch: list[dict]) -> dict:
    ids = pad([b["input_ids"] for b in batch], 0)
    return {"input_ids": ids, "attention_mask": (ids != 0).long(), "labels": pad([b["labels"] for b in batch], -100)}


def load_model(path: str, tiny: bool = False):
    from transformers import AutoModelForSeq2SeqLM, T5Config, T5ForConditionalGeneration
    if tiny:
        cfg = T5Config(vocab_size=384, d_model=64, d_kv=16, d_ff=128, num_layers=2, num_decoder_layers=2, num_heads=4,
                       decoder_start_token_id=0, pad_token_id=0, eos_token_id=1, tie_word_embeddings=False,
                       feed_forward_proj="gated-gelu")
        return T5ForConditionalGeneration(cfg)
    return AutoModelForSeq2SeqLM.from_pretrained(path)


def seq_logp(model, input_ids: torch.Tensor, attention_mask: torch.Tensor, labels: torch.Tensor) -> torch.Tensor:
    """Sum of token log-probabilities of `labels` given the input, per example."""
    out = model(input_ids=input_ids, attention_mask=attention_mask, labels=labels.clamp(min=0))
    logp = torch.log_softmax(out.logits.float(), dim=-1)
    mask = (labels != -100).float()
    picked = logp.gather(-1, labels.clamp(min=0).unsqueeze(-1)).squeeze(-1)
    return (picked * mask).sum(-1)


def seed_all(seed: int) -> None:
    random.seed(seed)
    torch.manual_seed(seed)
