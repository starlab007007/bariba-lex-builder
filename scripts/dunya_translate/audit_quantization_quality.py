#!/usr/bin/env python3
"""Compare mobile quantization variants against FP32; never certify from chrF alone."""
import argparse
import json
from pathlib import Path
from sacrebleu.metrics import CHRF

def inspect(path):
    d=json.loads(path.read_text(encoding="utf-8"))
    chrf=CHRF(word_order=2)
    report={"input":str(path),"directions":{},"candidate_approved":False,
            "reason":"Human semantics and on-device runtime validation required"}
    for direction in ("fr-ba","ba-fr"):
        rows=[r for r in d["cases"] if r["direction"]==direction]
        if not rows:
            raise ValueError("Missing direction "+direction)
        refs=[r["reference"] for r in rows]
        hf=[r["hf"] for r in rows]
        q=[r["onnx"] for r in rows]
        f=chrf.corpus_score(hf,[refs]).score
        v=chrf.corpus_score(q,[refs]).score
        differences=[{"id":r["id"],"reference":r["reference"],
                      "fp32":r["hf"],"candidate":r["onnx"]} for r in rows
                     if r["hf"]!=r["onnx"]]
        report["directions"][direction]={"n":len(rows),"fp32_chrfpp":round(f,2),
                                         "candidate_chrfpp":round(v,2),
                                         "delta":round(v-f,2),
                                         "exact_parity":len(rows)-len(differences),
                                         "divergences":differences}
    return report

if __name__=="__main__":
    p=argparse.ArgumentParser()
    p.add_argument("--parity-json",required=True)
    p.add_argument("--out",required=True)
    args=p.parse_args()
    result=inspect(Path(args.parity_json))
    Path(args.out).write_text(json.dumps(result,indent=2,ensure_ascii=False),encoding="utf-8")
    for direction,r in result["directions"].items():
        print(f"{direction}: chrF++ {r['fp32_chrfpp']} -> {r['candidate_chrfpp']} ({r['delta']:+}), parity {r['exact_parity']}/{r['n']}, human review: REQUIRED")
    print("candidate_approved=False")
