#!/usr/bin/env python3
"""Export read-only lexical hints from FITILA training corpus for offline clients.

Only train-split A/B sources enter the hint pack. Unreviewed references are
NEVER promoted to exact translation answers. Retrieval candidates are evidence,
not replacements for model outputs. Hold-out gold IDs are excluded.
"""
import argparse
import hashlib
import json
from pathlib import Path
from dunya_text import fold_ba, fold_fr

def main():
    p=argparse.ArgumentParser()
    p.add_argument("--data",default="data/translation")
    p.add_argument("--out",required=True)
    p.add_argument("--max-pairs",type=int,default=25000)
    args=p.parse_args()
    root=Path(args.data)
    records=[json.loads(line) for line in (root/"parallel.jsonl").open(encoding="utf-8") if line.strip()]
    glossary=json.loads((root/"glossary.json").read_text(encoding="utf-8"))
    gold={json.loads(line).get("id") for line in (root/"gold_candidates.jsonl").open(encoding="utf-8") if line.strip()}
    pairs=[]
    for r in records:
        if r.get("split")!="train" or r.get("grade") not in ("A","B") or r.get("id") in gold:
            continue
        if r.get("kind") not in ("phrase","sentence") or not r.get("fr") or not r.get("ba"):
            continue
        pairs.append({"id":r.get("id"),"fr":r["fr"],"ba":r["ba"],"grade":r["grade"]})
    pairs.sort(key=lambda r:(r["grade"],str(r["id"])))
    # Only unambiguous lexical senses; preserve surface tones in original words.
    words=[]
    for entry in glossary:
        ba=entry.get("ba","")
        fr=entry.get("fr",[])
        if not isinstance(fr,list) or not ba or not fr or len(fr)>2:
            continue
        if not fold_ba(ba) or any(not fold_fr(s) for s in fr):
            continue
        words.append({"ba":ba,"fr":fr})
    payload={"format":"fitila-lexical-hints/1","purpose":"retrieval-hints-only",
             "not_certified_for_exact_answers":True,
             "pairs":pairs[:args.max_pairs],"glossary":words}
    dst=Path(args.out);dst.parent.mkdir(parents=True,exist_ok=True)
    blob=json.dumps(payload,ensure_ascii=False,separators=(",",":")).encode("utf-8")
    dst.write_bytes(blob)
    print(json.dumps({"pairs":len(payload["pairs"]),"glossary":len(words),"bytes":len(blob),
                      "sha256":hashlib.sha256(blob).hexdigest(),"path":str(dst)}))
if __name__=="__main__":
    main()
