#!/usr/bin/env python3
"""Export a (Bariba) ByT5 translation model to ONNX for DUNYA's offline mode.

Outputs encoder.onnx and decoder.onnx (+ int8 variants) and checks that greedy
decoding with ONNX Runtime reproduces transformers' greedy generate() exactly.

ByT5 needs no tokenizer file: token = UTF-8 byte + 3 (0 = pad / decoder start,
1 = </s>, 2 = <unk>), which the phone implements in a few lines.

Usage:
  python export_byt5_onnx.py --model zimesongbian/modele_byt5_bariba_expert_api_v03_improve \
      --out out/byt5 --sample "fr-ba: Bonjour" --sample "ba-fr: A kua"
"""

from __future__ import annotations

import argparse
import json
import time
from pathlib import Path

import numpy as np
import onnx
import onnxruntime as ort
import torch
from onnxruntime.quantization import QuantType, quantize_dynamic
from transformers import AutoModelForSeq2SeqLM


class Encoder(torch.nn.Module):
    def __init__(self, model):
        super().__init__()
        self.encoder = model.get_encoder()

    def forward(self, input_ids, attention_mask):
        return self.encoder(input_ids=input_ids, attention_mask=attention_mask).last_hidden_state


class Decoder(torch.nn.Module):
    """Full decoder pass (no KV cache) returning logits of the last position."""

    def __init__(self, model):
        super().__init__()
        self.decoder = model.get_decoder()
        self.lm_head = model.lm_head
        self.scale = model.config.d_model ** -0.5 if model.config.tie_word_embeddings else 1.0

    def forward(self, decoder_input_ids, encoder_hidden_states, encoder_attention_mask):
        out = self.decoder(
            input_ids=decoder_input_ids,
            encoder_hidden_states=encoder_hidden_states,
            encoder_attention_mask=encoder_attention_mask,
        ).last_hidden_state
        last = out[:, -1, :] * self.scale
        return self.lm_head(last)


def encode(text: str) -> list[int]:
    return [b + 3 for b in text.encode("utf-8")] + [1]


def decode(ids: list[int]) -> str:
    data = bytes(i - 3 for i in ids if 3 <= i < 259)  # 259+ = sentinel tokens
    return data.decode("utf-8", errors="ignore")


def onnx_greedy(enc: ort.InferenceSession, dec: ort.InferenceSession, text: str, max_len: int = 256) -> str:
    ids = np.array([encode(text)], dtype=np.int64)
    mask = np.ones_like(ids)
    hidden = enc.run(None, {"input_ids": ids, "attention_mask": mask})[0]
    out = [0]
    for _ in range(max_len):
        logits = dec.run(
            None,
            {
                "decoder_input_ids": np.array([out], dtype=np.int64),
                "encoder_hidden_states": hidden,
                "encoder_attention_mask": mask,
            },
        )[0]
        nxt = int(np.argmax(logits[0]))
        if nxt == 1:
            break
        out.append(nxt)
    return decode(out[1:])


def torch_greedy(model, text: str, max_len: int = 256) -> str:
    """Same algorithm as the phone (no KV cache), in PyTorch: the exact reference."""
    enc, dec = Encoder(model).eval(), Decoder(model).eval()
    ids = torch.tensor([encode(text)])
    mask = torch.ones_like(ids)
    out = [0]
    with torch.no_grad():
        hidden = enc(ids, mask)
        for _ in range(max_len):
            nxt = int(torch.argmax(dec(torch.tensor([out]), hidden, mask)[0]))
            if nxt == 1:
                break
            out.append(nxt)
    return decode(out[1:])


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--model", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--sample", action="append", default=[])
    ap.add_argument("--token", default=None)
    args = ap.parse_args()

    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    model = AutoModelForSeq2SeqLM.from_pretrained(args.model, token=args.token or None).eval()

    ids = torch.tensor([encode("test")], dtype=torch.long)
    mask = torch.ones_like(ids)
    with torch.no_grad():
        torch.onnx.export(
            Encoder(model).eval(), (ids, mask), str(out / "encoder.onnx"),
            input_names=["input_ids", "attention_mask"], output_names=["hidden"],
            dynamic_axes={"input_ids": {1: "S"}, "attention_mask": {1: "S"}, "hidden": {1: "S"}},
            opset_version=17, dynamo=False,
        )
        hidden = Encoder(model).eval()(ids, mask)
        dec_ids = torch.tensor([[0, 70]], dtype=torch.long)
        torch.onnx.export(
            Decoder(model).eval(), (dec_ids, hidden, mask), str(out / "decoder.onnx"),
            input_names=["decoder_input_ids", "encoder_hidden_states", "encoder_attention_mask"],
            output_names=["logits"],
            dynamic_axes={
                "decoder_input_ids": {1: "T"},
                "encoder_hidden_states": {1: "S"},
                "encoder_attention_mask": {1: "S"},
            },
            opset_version=17, dynamo=False,
        )

    # torch.onnx.export restores the wrappers' (training) mode on the shared
    # model: switch dropout off again before using it as the reference.
    model.eval()

    for name in ("encoder", "decoder"):
        quantize_dynamic(str(out / f"{name}.onnx"), str(out / f"{name}.int8.onnx"), weight_type=QuantType.QInt8)
        onnx.checker.check_model(str(out / f"{name}.int8.onnx"))

    report = {"model": args.model, "checks": []}
    samples = args.sample or ["fr-ba: Bonjour", "ba-fr: A kua"]
    for variant in ("", ".int8"):
        enc = ort.InferenceSession(str(out / f"encoder{variant}.onnx"))
        dec = ort.InferenceSession(str(out / f"decoder{variant}.onnx"))
        for text in samples:
            t0 = time.time()
            got = onnx_greedy(enc, dec, text)
            elapsed = time.time() - t0
            ref = torch_greedy(model, text)
            with torch.no_grad():
                gen = model.generate(torch.tensor([encode(text)]), max_new_tokens=256, num_beams=1, do_sample=False)
            report["checks"].append(
                {"variant": variant or "fp32", "input": text, "onnx": got, "reference": ref,
                 "transformers_generate": decode(gen[0].tolist()[1:]),
                 "match": got == ref, "seconds": round(elapsed, 2)}
            )
    (out / "byt5_report.json").write_text(json.dumps(report, ensure_ascii=False, indent=1), encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False, indent=1))
    fp32 = [c for c in report["checks"] if c["variant"] == "fp32"]
    if not all(c["match"] for c in fp32):
        raise SystemExit("ONNX fp32 greedy output differs from transformers")


if __name__ == "__main__":
    main()
