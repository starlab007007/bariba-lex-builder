#!/usr/bin/env python3
"""Experimental ONNX dynamic INT8 candidate. Never publish without native QA.

Only MatMul/Gemm are considered. VITS convolutions / waveform synthesis are
not blindly quantized; phonetics and timing must be independently evaluated.
"""
import argparse
import json
from pathlib import Path
from onnxruntime.quantization import QuantType, quantize_dynamic


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--model", type=Path, required=True)
    p.add_argument("--out", type=Path, required=True)
    args = p.parse_args()
    args.out.parent.mkdir(parents=True, exist_ok=True)
    quantize_dynamic(
        model_input=str(args.model),
        model_output=str(args.out),
        weight_type=QuantType.QInt8,
        op_types_to_quantize=["MatMul", "Gemm"],
        per_channel=False,
    )
    original = args.model.stat().st_size
    optimized = args.out.stat().st_size
    result = {"reference_bytes": original, "candidate_bytes": optimized,
              "size_reduction_pct": round(100 * (original - optimized) / original, 2),
              "production_approved": False,
              "next_steps": ["sherpa offline playback", "native Baatonum listening",
                             "Android 2/3/4/6 GB RTF and RAM"]}
    (args.out.parent / "QUANTIZATION_REPORT.json").write_text(
        json.dumps(result, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
