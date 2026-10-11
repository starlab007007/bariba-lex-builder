#!/usr/bin/env python3
"""Export a Meta MMS-TTS (VITS) checkpoint to a sherpa-onnx compatible ONNX model.

DUNYA uses sherpa-onnx on the phone. sherpa-onnx's "characters" frontend reads a
tokens.txt (one character per line) and the coqui-style VITS signature:

    inputs : x (1, T) int64, x_length (1,) int64, scales (3,) float32
             scales = [noise_scale, length_scale, noise_scale_w]
    output : waveform

Usage:
    python export_mms_vits.py --model facebook/mms-tts-bba --lang bba --out out/tts-bba
"""

from __future__ import annotations

import argparse
import json
import unicodedata
from pathlib import Path

import onnx
import torch
from transformers import VitsModel, VitsTokenizer


class SherpaVitsWrapper(torch.nn.Module):
    def __init__(self, model: VitsModel) -> None:
        super().__init__()
        self.model = model

    def forward(self, x: torch.Tensor, x_length: torch.Tensor, scales: torch.Tensor) -> torch.Tensor:
        # The HF VITS forward reads these three attributes; binding them to the
        # input tensor makes them runtime parameters of the exported graph.
        self.model.noise_scale = scales[0]
        self.model.speaking_rate = 1.0 / scales[1]
        self.model.noise_scale_duration = scales[2]
        positions = torch.arange(x.shape[1], device=x.device).unsqueeze(0)
        attention_mask = (positions < x_length.unsqueeze(1)).long()
        return self.model(input_ids=x, attention_mask=attention_mask).waveform


# Characters the FITILA corpus uses (French + Baatɔnum, with tones).
CANDIDATES = (
    "aàáâãäæbcçdeèéêëẽfghiìíîïĩjklmnñoòóôõöœpqrstuùúûüũvwxyzɔɛŋ"
    "ǹńḿ'’-.,?!:;"
)


def build_normalization(vocab: set[str]) -> dict[str, str]:
    """Map characters the app may produce to sequences the model knows."""
    mapping: dict[str, str] = {}
    combining_tones = ["̀", "́", "̂", "̃", "̄", "̌"]
    bases = "aeiouɔɛnm"
    for base in bases:
        for tone in combining_tones:
            decomposed = base + tone
            composed = unicodedata.normalize("NFC", decomposed)
            if composed in vocab and decomposed != composed:
                mapping[decomposed] = composed  # app text NFD -> model NFC
            elif composed != decomposed and composed not in vocab and all(c in vocab for c in decomposed):
                mapping[composed] = decomposed  # app text NFC -> model NFD
            elif composed not in vocab and base in vocab and tone not in vocab:
                mapping[composed] = base  # model has no tones: keep the letter
                mapping[decomposed] = base
    for ch in CANDIDATES:
        if ch in vocab or ch in mapping:
            continue
        stripped = "".join(c for c in unicodedata.normalize("NFD", ch) if not unicodedata.combining(c))
        if stripped and all(c in vocab for c in stripped):
            mapping[ch] = stripped
    mapping["’"] = "'" if "'" in vocab else ""
    return mapping


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--model", required=True)
    parser.add_argument("--lang", required=True)
    parser.add_argument("--language-name", default="")
    parser.add_argument("--out", required=True)
    args = parser.parse_args()

    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)

    tokenizer = VitsTokenizer.from_pretrained(args.model)
    model = VitsModel.from_pretrained(args.model)
    model.eval()

    if getattr(tokenizer, "is_uroman", False):
        raise SystemExit(f"{args.model} needs uroman romanisation; not supported by the characters frontend")

    vocab = tokenizer.get_vocab()
    single = {tok: idx for tok, idx in vocab.items() if len(tok) == 1}
    skipped = sorted(tok for tok in vocab if len(tok) != 1)
    blank_id = int(tokenizer.pad_token_id or 0)
    add_blank = 1 if getattr(tokenizer, "add_blank", True) else 0

    with (out / "tokens.txt").open("w", encoding="utf-8") as fh:
        for tok, idx in sorted(single.items(), key=lambda item: item[1]):
            if tok == " ":
                fh.write(f" {idx}\n")
            elif tok in ("\n", "\r", "\t"):
                continue
            else:
                fh.write(f"{tok} {idx}\n")

    normalization = build_normalization(set(single))
    (out / "normalize.json").write_text(
        json.dumps(normalization, ensure_ascii=False, indent=1), encoding="utf-8"
    )

    wrapper = SherpaVitsWrapper(model)
    sample = tokenizer("a kua", return_tensors="pt").input_ids
    x_length = torch.tensor([sample.shape[1]], dtype=torch.int64)
    scales = torch.tensor([0.667, 1.0, 0.8], dtype=torch.float32)

    onnx_path = out / "model.onnx"
    with torch.no_grad():
        torch.onnx.export(
            wrapper,
            (sample, x_length, scales),
            str(onnx_path),
            input_names=["x", "x_length", "scales"],
            output_names=["y"],
            dynamic_axes={"x": {1: "T"}, "y": {0: "B", 1: "L"}},
            opset_version=17,
            do_constant_folding=True,
            dynamo=False,
        )

    m = onnx.load(str(onnx_path))
    meta = {
        "model_type": "vits",
        "comment": "coqui mms dunya",
        "language": args.language_name or args.lang,
        "voice": "",
        "frontend": "characters",
        "add_blank": str(add_blank),
        "blank_id": str(blank_id),
        "use_eos_bos": "0",
        "bos_id": "0",
        "eos_id": "0",
        "pad_id": str(blank_id),
        "n_speakers": "1",
        "sample_rate": str(int(model.config.sampling_rate)),
        "punctuation": "",
        "source_model": args.model,
        "license": "CC-BY-NC-4.0 (Meta MMS)",
    }
    del m.metadata_props[:]
    for key, value in meta.items():
        entry = m.metadata_props.add()
        entry.key = key
        entry.value = value
    onnx.save(m, str(onnx_path))

    info = {
        "model": args.model,
        "lang": args.lang,
        "sample_rate": int(model.config.sampling_rate),
        "vocab_size": len(vocab),
        "single_char_tokens": len(single),
        "skipped_tokens": skipped,
        "add_blank": add_blank,
        "blank_id": blank_id,
        "normalization_entries": len(normalization),
        "vocab": "".join(sorted(t for t in single if t.strip())),
    }
    (out / "export_info.json").write_text(json.dumps(info, ensure_ascii=False, indent=1), encoding="utf-8")
    print(json.dumps(info, ensure_ascii=False, indent=1))


if __name__ == "__main__":
    main()
