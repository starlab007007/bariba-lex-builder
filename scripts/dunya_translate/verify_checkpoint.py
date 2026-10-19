#!/usr/bin/env python3
"""Verify and pin the exact fine-tuned FITILA ByT5 checkpoint before ONNX export.

Requires a Hugging Face read token for the private repository.
Never marks quality certified merely because files are present.
"""
import argparse
import hashlib
import json
from pathlib import Path
from huggingface_hub import HfApi, snapshot_download

def main():
    p = argparse.ArgumentParser()
    p.add_argument("--repo", default="zimesongbian/byt5-small-fr-bariba-v004")
    p.add_argument("--output", default="dist/dunya-byt5/checkpoint-lock.json")
    p.add_argument("--download", action="store_true")
    args = p.parse_args()
    api = HfApi()
    info = api.model_info(args.repo, files_metadata=True)
    names = [f.rfilename for f in info.siblings]
    weights = [n for n in names if n.endswith(".safetensors") or n in ("pytorch_model.bin",)]
    if not weights:
        raise SystemExit("No checkpoint weights found")
    if "config.json" not in names:
        raise SystemExit("Model config is absent")
    record = {
        "repo": args.repo, "revision": info.sha,
        "weight_files": weights,
        "weights_metadata": [
            {"path": f.rfilename, "size": f.size, "lfs_sha256": getattr(f.lfs, "sha256", None) if f.lfs else None}
            for f in info.siblings if f.rfilename in weights
        ],
        "download_verified": False,
        "quality_certified": False,
        "onnx_export_tested": False,
    }
    if args.download:
        dest = snapshot_download(repo_id=args.repo, revision=info.sha, allow_patterns=["*.safetensors","*.bin","*.json","*.model","*.txt"])
        checksums = {}
        for name in weights:
            path = Path(dest) / name
            h = hashlib.sha256()
            with path.open("rb") as stream:
                for chunk in iter(lambda: stream.read(8*1024*1024), b""):
                    h.update(chunk)
            checksums[name] = h.hexdigest()
        record["download_verified"] = True
        record["download_sha256"] = checksums
    target = Path(args.output)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(record, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print("Checkpoint metadata pinned:", target, info.sha)
if __name__ == "__main__":
    main()
