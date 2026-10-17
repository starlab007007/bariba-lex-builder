#!/usr/bin/env python3
"""Split the *existing verified* DUNYA core pack into independent MMS and ASR packs.

No weights are created or downloaded by this script. It copies original ONNX
bytes and verifies all embedded manifest hashes before producing new packs.
Never treat a passing integrity check as a TTS quality evaluation.
"""
import argparse
import hashlib
import json
import pathlib
import tempfile
import zipfile

MMS_ID = "dunya-voice-bba"
ASR_ID = "dunya-asr-omni"
MAX_UNCOMPRESSED = 1_500_000_000
ATTRIBUTION = """FITILA — notices et provenance des modèles
Voix Baatɔnum : Meta AI, Massively Multilingual Speech (MMS),
facebook/mms-tts-bba, Creative Commons BY-NC 4.0.
https://huggingface.co/facebook/mms-tts-bba
https://creativecommons.org/licenses/by-nc/4.0/
Conversion ONNX/VITS : format dérivé du modèle initial ; aucune
autorisation commerciale n'est accordée par cette conversion.
Reconnaissance vocale : Meta Omnilingual ASR / sherpa-onnx,
licence Apache-2.0 selon le manifeste officiel du pack source.
https://github.com/k2-fsa/sherpa-onnx
FITILA est indépendant de Meta. Usage éducatif non commercial.
Conserver les avis originaux du modèle et les conditions des dépendances.
"""


def digest(stream):
    h = hashlib.sha256()
    n = 0
    while chunk := stream.read(1024 * 1024):
        n += len(chunk)
        h.update(chunk)
    return n, h.hexdigest()


def prepare(source: pathlib.Path, output: pathlib.Path):
    output.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(source) as old:
        if "manifest.json" not in old.namelist():
            raise ValueError("Pack source sans manifest.json")
        manifest = json.loads(old.read("manifest.json"))
        if manifest.get("format") != "dunya-pack/1" or manifest.get("id") != "dunya-voice-core":
            raise ValueError("Ce n'est pas le pack core FITILA attendu")
        entries = {f["path"]: f for f in manifest["files"]}
        if len(entries) != len(manifest["files"]):
            raise ValueError("Fichiers dupliques dans le manifeste source")
        if any(name.startswith("/") or ".." in pathlib.PurePosixPath(name).parts
               or "\\" in name for name in entries):
            raise ValueError("Chemin suspect")
        if sum(f["size"] for f in entries.values()) > MAX_UNCOMPRESSED:
            raise ValueError("Pack trop volumineux")
        groups = {
            MMS_ID: [p for p in entries if p.startswith("tts-bba/")],
            ASR_ID: [p for p in entries if p.startswith("asr/")],
        }
        mandatory = {
            MMS_ID: ("tts-bba/model.onnx", "tts-bba/tokens.txt"),
            ASR_ID: ("asr/model.int8.onnx", "asr/tokens.txt"),
        }
        for pack_id, required in mandatory.items():
            if not all(p in groups[pack_id] for p in required):
                raise ValueError("Poids ou vocabulaire absents : " + pack_id)
        with source.open("rb") as stream:
            _, source_sha = digest(stream)
        reports = {}
        for pack_id, members in groups.items():
            filename = f"{pack_id}-v1.zip"
            archive = output / filename
            files = []
            with zipfile.ZipFile(archive, "w", compression=zipfile.ZIP_STORED, allowZip64=True) as new:
                for path in sorted(members):
                    info = entries[path]
                    if path not in old.namelist():
                        raise ValueError(f"Absence du fichier {path}")
                    with old.open(path) as source_member:
                        n, found_sha = digest(source_member)
                    if found_sha != info["sha256"] or n != info["size"]:
                        raise ValueError(f"Hash de la source incorrect : {path}")
                    stable = zipfile.ZipInfo(path, date_time=(2026, 1, 1, 0, 0, 0))
                    stable.compress_type = zipfile.ZIP_STORED
                    with old.open(path) as source_member, new.open(stable, "w", force_zip64=True) as dest:
                        while chunk := source_member.read(1024 * 1024):
                            dest.write(chunk)
                    files.append({"path": path, "size": n, "sha256": found_sha})
                if pack_id == MMS_ID:
                    note = ATTRIBUTION.encode("utf-8")
                    notice_info = zipfile.ZipInfo("ATTRIBUTION-MMS.txt", date_time=(2026, 1, 1, 0, 0, 0))
                    notice_info.compress_type = zipfile.ZIP_STORED
                    new.writestr(notice_info, note)
                    files.append({"path": "ATTRIBUTION-MMS.txt", "size": len(note),
                                  "sha256": hashlib.sha256(note).hexdigest()})
                created = {
                    "format": "dunya-pack/1", "id": pack_id, "version": 1,
                    "files": files, "total_bytes": sum(x["size"] for x in files),
                    "derived_from": {"id": "dunya-voice-core", "sha256": source_sha},
                    "model": "facebook/mms-tts-bba" if pack_id == MMS_ID else "Meta Omnilingual ASR CTC 300M",
                    "license": "CC-BY-NC-4.0" if pack_id == MMS_ID else "Apache-2.0",
                    "commercial_use_allowed": False if pack_id == MMS_ID else True,
                    "tested": False, "quality_certified": False,
                }
                manifest_info = zipfile.ZipInfo("manifest.json", date_time=(2026, 1, 1, 0, 0, 0))
                manifest_info.compress_type = zipfile.ZIP_STORED
                new.writestr(manifest_info, json.dumps(created, ensure_ascii=False, indent=2) + "\n")
            sidecar = dict(created)
            sidecar["archive_sha256"] = digest(archive.open("rb"))[1]
            sidecar["total_download_bytes"] = archive.stat().st_size
            (output / f"{pack_id}-v1.manifest.json").write_text(
                json.dumps(sidecar, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
            reports[pack_id] = {"file": filename, "bytes": archive.stat().st_size,
                                "sha256": sidecar["archive_sha256"], "members": len(files)}
            with zipfile.ZipFile(archive) as check:
                for item in files:
                    with check.open(item["path"]) as handle:
                        n, found = digest(handle)
                        if found != item["sha256"] or n != item["size"]:
                            raise ValueError("Erreur de verification du nouveau pack")
        (output / "SPLIT_REPORT.json").write_text(
            json.dumps({"source_sha256": source_sha, "packs": reports}, indent=2) + "\n",
            encoding="utf-8")
        return reports


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--source", type=pathlib.Path, required=True)
    p.add_argument("--out", type=pathlib.Path, required=True)
    args = p.parse_args()
    print(json.dumps(prepare(args.source, args.out), indent=2))


if __name__ == "__main__":
    main()
