#!/usr/bin/env python3
"""Export the *trained FITILA checkpoint* as a mobile ByT5 ONNX pack.

Never export google/byt5-small as if it were a Baatɔnum translator.
A checkpoint with verified FR/Baatɔnum performance must be provided.
Example:
  python scripts/dunya_translate/export_mobile_onnx.py \
    --model /checkpoints/fitila-byt5-fr-ba --out dist/dunya-byt5 \
    --quantize-int8

The resulting ZIP is ZIP_STORED with SHA-256 per file and can be installed
through the existing DUNYA file pack installer (no network is required).
"""
from __future__ import annotations

import argparse
import hashlib
import json
import shutil
import zipfile
from pathlib import Path

import torch
from transformers import AutoModelForSeq2SeqLM


class Encoder(torch.nn.Module):
    def __init__(self, model):
        super().__init__()
        self.model = model

    def forward(self, input_ids, attention_mask):
        return self.model.get_encoder()(
            input_ids=input_ids, attention_mask=attention_mask,
            return_dict=True,
        ).last_hidden_state


class Decoder(torch.nn.Module):
    def __init__(self, model):
        super().__init__()
        self.model = model

    def forward(self, decoder_input_ids, encoder_hidden_states, encoder_attention_mask):
        return self.model(
            encoder_outputs=(encoder_hidden_states,),
            attention_mask=encoder_attention_mask,
            decoder_input_ids=decoder_input_ids,
            use_cache=False, return_dict=True,
        ).logits


def export(args):
    root = Path(args.out).resolve()
    destination = root / "byt5"
    destination.mkdir(parents=True, exist_ok=True)
    if args.model == "google/byt5-small":
        raise ValueError("The generic model is not a trained FR/Baatɔnum translation checkpoint")
    model = AutoModelForSeq2SeqLM.from_pretrained(args.model).eval().cpu()
    cfg = model.config
    assert cfg.pad_token_id == 0 and cfg.eos_token_id == 1, "Unexpected ByT5 special ids"
    assert cfg.decoder_start_token_id == 0, "Unexpected ByT5 decoder start"
    ids = torch.tensor([[105, 117, 48, 101, 100, 61, 35, 69, 114, 113, 109, 114, 120, 117, 1]], dtype=torch.long)
    mask = torch.ones_like(ids)
    hidden = model.get_encoder()(input_ids=ids, attention_mask=mask).last_hidden_state
    torch.onnx.export(
        Encoder(model), (ids, mask), destination / "encoder.onnx",
        input_names=["input_ids", "attention_mask"],
        output_names=["last_hidden_state"], opset_version=17,
        dynamic_axes={"input_ids": {0: "batch", 1: "src"},
                      "attention_mask": {0: "batch", 1: "src"},
                      "last_hidden_state": {0: "batch", 1: "src"}},
        dynamo=False,
    )
    torch.onnx.export(
        Decoder(model), (torch.tensor([[0, 80, 1]], dtype=torch.long), hidden, mask),
        destination / "decoder.onnx",
        input_names=["decoder_input_ids", "encoder_hidden_states", "encoder_attention_mask"],
        output_names=["logits"], opset_version=17,
        dynamic_axes={"decoder_input_ids": {0: "batch", 1: "tgt"},
                      "encoder_hidden_states": {0: "batch", 1: "src"},
                      "encoder_attention_mask": {0: "batch", 1: "src"},
                      "logits": {0: "batch", 1: "tgt"}},
        dynamo=False,
    )
    if args.quantize_int8:
        from onnxruntime.quantization import quantize_dynamic, QuantType
        for name in ("encoder", "decoder"):
            original = destination / f"{name}.onnx"
            tmp = destination / f"{name}.int8.onnx"
            quantize_dynamic(str(original), str(tmp), weight_type=QuantType.QInt8)
            tmp.replace(original)
    import onnxruntime as ort
    sessions = {name: ort.InferenceSession(str(destination / f"{name}.onnx"),
                                           providers=["CPUExecutionProvider"]) for name in ("encoder", "decoder")}
    assert {"input_ids", "attention_mask"} <= {i.name for i in sessions["encoder"].get_inputs()}
    assert {"decoder_input_ids", "encoder_hidden_states", "encoder_attention_mask"} <= {
        i.name for i in sessions["decoder"].get_inputs()}
    config = {
        "format": "fitila-byt5-mobile/1",
        "source_checkpoint": args.model,
        "prefix_fr_ba": args.prefix_fr_ba,
        "prefix_ba_fr": args.prefix_ba_fr,
        "tokenizer": "byt5-bytes-plus-3",
        "decoder_start_token_id": 0,
        "eos_token_id": 1,
        "max_source_bytes": 511,
        "max_output_bytes": 192,
        "space_pipeline": "v4",
        "generation_note": "Android currently uses greedy no-cache decoding; Space v4 uses 8-beam search and postprocessing. Validate output quality separately.",
        "quantized": bool(args.quantize_int8),
    }
    (destination / "config.json").write_text(json.dumps(config, ensure_ascii=False, indent=2), encoding="utf8")
    files = []
    for path in sorted(destination.iterdir()):
        if not path.is_file():
            continue
        files.append({
            "path": "byt5/" + path.name,
            "size": path.stat().st_size,
            "sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
        })
    manifest = {
        "format": "dunya-pack/1", "id": "dunya-translate-byt5",
        "version": "v1", "files": files,
        "total_bytes": sum(f["size"] for f in files),
        "source_checkpoint": args.model, "tested": False,
    }
    zip_path = root / "dunya-translate-byt5-v1.zip"
    with zipfile.ZipFile(zip_path, "w", compression=zipfile.ZIP_STORED,
                         allowZip64=True) as archive:
        archive.writestr("manifest.json", json.dumps(manifest, ensure_ascii=False))
        for entry in files:
            archive.write(root / entry["path"], entry["path"])
    (root / "dunya-translate-byt5-v1.manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf8")
    print(f"Exported (NOT QUALITY CERTIFIED): {zip_path}")
    print("NEXT REQUIRED: real device speed/RAM benchmarks and FR/Baatɔnum gold-set evaluation.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--model", required=True, help="Verified FITILA finetuned checkpoint")
    parser.add_argument("--out", required=True)
    parser.add_argument("--quantize-int8", action="store_true")
    parser.add_argument("--prefix-fr-ba", default="traduire francais en bariba (ordre SOV, voir=wa, mère=bii mɛro, si=yɛ): ")
    parser.add_argument("--prefix-ba-fr", default="traduire bariba en francais (SOV, wa=voir, mɛɛri=regarder, yaa=viande): ")
    export(parser.parse_args())
