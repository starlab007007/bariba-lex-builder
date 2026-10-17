#!/usr/bin/env python3
"""Build reproducible candidate SELECTIVE INT8 mobile packs from EXISTING FP32 ONNX.

Never certifies or publishes: manifest.tested is always false. Compare candidates
with validate_mobile_onnx.py before considering deployment.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import shutil
import onnx
import zipfile
from pathlib import Path


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as f:
        for block in iter(lambda: f.read(8 * 1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def build(base: Path, out: Path, mode: str, op: str, exclude_regex: str = "") -> dict:
    from onnxruntime.quantization import QuantType, quantize_dynamic

    inp = base / "byt5"
    dest = out / "byt5"
    if dest.exists():
        shutil.rmtree(dest)
    dest.mkdir(parents=True)
    quantized = {"encoder-only": {"encoder"}, "decoder-only": {"decoder"},
                 "both-matmul": {"encoder", "decoder"}}[mode]
    sizes_before, sizes_after = {}, {}
    for name in ("encoder", "decoder"):
        source = inp / (name + ".onnx")
        target = dest / (name + ".onnx")
        if not source.is_file():
            raise FileNotFoundError(source)
        sizes_before[name] = source.stat().st_size
        if name in quantized:
            exclusions = []
            if exclude_regex:
                pattern = re.compile(exclude_regex)
                graph = onnx.load(str(source), load_external_data=False)
                exclusions = [node.name for node in graph.graph.node
                              if node.name and node.op_type == op and pattern.search(node.name)]
                del graph
            quantize_dynamic(
                str(source), str(target),
                weight_type=QuantType.QInt8,
                op_types_to_quantize=[op],
                nodes_to_exclude=exclusions,
            )
        else:
            shutil.copyfile(source, target)
        sizes_after[name] = target.stat().st_size
    config = json.loads((inp / "config.json").read_text(encoding="utf-8"))
    config["quantized"] = True
    config["quantization_profile"] = {
        "mode": mode, "op_types": [op], "weight_type": "QInt8",
        "exclude_node_regex": exclude_regex,
        "source": "FP32 exported ONNX", "quality_certified": False,
    }
    (dest / "config.json").write_text(json.dumps(config, ensure_ascii=False, indent=2), encoding="utf-8")
    # Preserve only an already reviewed bilingual memory, never imported gold candidates.
    memory = inp / "approved_memory.json"
    if memory.exists():
        content = json.loads(memory.read_text(encoding="utf-8"))
        if content.get("format") != "fitila-approved-memory/1":
            raise ValueError("Unexpected translation-memory format")
        shutil.copyfile(memory, dest / "approved_memory.json")
    entries = [{"path": "byt5/" + p.name, "size": p.stat().st_size,
                "sha256": sha256_file(p)} for p in sorted(dest.iterdir()) if p.is_file()]
    manifest = {
        "format": "dunya-pack/1", "id": "dunya-translate-byt5",
        "version": "v1-" + mode + "-" + op.lower(),
        "files": entries, "total_bytes": sum(e["size"] for e in entries),
        "tested": False, "source_checkpoint": config["source_checkpoint"],
        "quantization_profile": config["quantization_profile"],
    }
    zip_path = out / "dunya-translate-byt5-v1.zip"
    with zipfile.ZipFile(zip_path, "w", compression=zipfile.ZIP_STORED, allowZip64=True) as z:
        z.writestr("manifest.json", json.dumps(manifest, ensure_ascii=False))
        for entry in entries:
            z.write(out / entry["path"], entry["path"])
    (out / "dunya-translate-byt5-v1.manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    return {"profile": mode, "op": op, "size_fp32_bytes": sum(sizes_before.values()),
            "size_candidate_bytes": sum(sizes_after.values()),
            "reduction_pct": round(100 * (1 - sum(sizes_after.values()) / sum(sizes_before.values())), 2),
            "out": str(out), "quality_certified": False}


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--fp32-pack-dir", required=True)
    p.add_argument("--out-root", required=True)
    p.add_argument("--exclude-node-regex", default="", help="Optional ONNX node-name regex to keep FP32; inspect node names first")
    p.add_argument("--profiles", nargs="+", choices=["encoder-only", "decoder-only", "both-matmul"],
                   default=["encoder-only", "decoder-only", "both-matmul"])
    args = p.parse_args()
    results = []
    for mode in args.profiles:
        out = Path(args.out_root) / mode
        results.append(build(Path(args.fp32_pack_dir), out, mode, "MatMul", args.exclude_node_regex))
        print(json.dumps(results[-1], ensure_ascii=False), flush=True)
    (Path(args.out_root) / "profiles.json").write_text(
        json.dumps(results, indent=2, ensure_ascii=False), encoding="utf-8")


if __name__ == "__main__":
    main()
