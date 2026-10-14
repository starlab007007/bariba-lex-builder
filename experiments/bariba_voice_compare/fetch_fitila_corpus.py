"""Download only validated FITILA Bariba voice references to an ephemeral private benchmark directory.

Requires SUPABASE_SERVICE_ROLE_KEY as a GitHub Actions environment secret.
The manifest and recordings are never committed or uploaded as CI artifacts.
"""
import json, os, subprocess, sys
from pathlib import Path
from urllib.parse import quote, urlencode
from urllib.request import Request, urlopen

BASE = os.environ.get("FITILA_SUPABASE_URL", "https://dvswhjawiooprghzeyol.supabase.co").rstrip("/")
KEY = os.environ.get("FITILA_BENCHMARK_SERVICE_KEY", "")
BUCKET = "bariba-voice-corpus"

def load_json(url):
    req = Request(url, headers={"apikey": KEY, "Authorization": "Bearer " + KEY})
    with urlopen(req, timeout=25) as resp:
        return json.load(resp)

def download_private(path, dst):
    # Storage object paths must be encoded *by component*, keeping '/'.
    url = BASE + "/storage/v1/object/authenticated/" + BUCKET + "/" + quote(path, safe="/")
    req = Request(url, headers={"apikey": KEY, "Authorization": "Bearer " + KEY})
    with urlopen(req, timeout=35) as resp:
        raw = resp.read(18_000_000)
        if resp.read(1): raise RuntimeError("Audio exceeds 18MB limit")
    dst.write_bytes(raw)

def main():
    if not KEY: raise RuntimeError("FITILA_BENCHMARK_SERVICE_KEY not configured")
    out = Path(sys.argv[1]).resolve()
    out.mkdir(parents=True, exist_ok=True)
    os.chmod(out, 0o700)
    params = urlencode({"select":"id,storage_path,mime_type,bariba_corpus_phrases(text_bariba)", "validated":"eq.true", "order":"created_at.asc", "limit":"100"})
    records = load_json(BASE + "/rest/v1/bariba_voice_recordings?" + params)
    if not records: raise RuntimeError("No validated reference recordings")
    manifests = []
    for row in records:
        reference = (row.get("bariba_corpus_phrases") or {}).get("text_bariba", "").strip()
        path = row.get("storage_path") or ""
        if not path or not reference: continue
        source = out / (row["id"] + Path(path).suffix.lower())
        wav = out / (row["id"] + ".wav")
        try:
            download_private(path, source)
            subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", str(source),
                            "-ac", "1", "-ar", "16000", str(wav)], check=True, timeout=40, capture_output=True)
            source.unlink(missing_ok=True)
            manifests.append({"id": row["id"], "audio": wav.name, "reference": reference, "text": reference})
        except Exception as error:
            source.unlink(missing_ok=True)
            print("Excluded sample; audio retrieval or decode failed: " + str(row.get("id")), file=sys.stderr)
            continue
    if not manifests: raise RuntimeError("No decodable/authorized reference audio")
    (out / "manifest.jsonl").write_text("".join(json.dumps(m, ensure_ascii=False) + "\n" for m in manifests))
    print(json.dumps({"validated_records":len(records),"usable_audio_text_pairs":len(manifests),
                      "private_manifest":str(out / "manifest.jsonl")}))
if __name__=="__main__":
    main()
