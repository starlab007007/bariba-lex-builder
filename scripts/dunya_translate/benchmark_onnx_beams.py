#!/usr/bin/env python3
"""Compare greedy and beam search on an exported no-cache ONNX ByT5 pack.

Exploratory benchmarking only; does not modify or certify the pack. A beam
expands each hypothesis using its own complete decoder prefix, so this is
costly on phones. Run on a representative device before selecting width.
"""
import argparse
import json
import time
from pathlib import Path
import numpy as np
import onnxruntime as ort
from sacrebleu.metrics import CHRF

def encode(s):
    return [b+3 for b in s.encode("utf-8")[:511]]+[1]
def decode(ts):
    return bytes(t-3 for t in ts if 3<=t<=258).decode("utf-8",errors="replace").strip()

def infer(enc,dec,prompt,beams,max_tokens):
    ids=np.array([encode(prompt)],dtype=np.int64)
    mask=np.ones_like(ids)
    hidden=enc.run(None,{"input_ids":ids,"attention_mask":mask})[0]
    queue=[([0],0.0,False)]
    for _ in range(max_tokens):
        proposed=[]
        for toks,score,done in queue:
            if done:
                proposed.append((toks,score,True))
                continue
            logits=dec.run(None,{"decoder_input_ids":np.asarray([toks],dtype=np.int64),
                "encoder_hidden_states":hidden,"encoder_attention_mask":mask})[0][0,-1,:].astype(np.float64)
            logits-=logits.max()
            logprob=logits-np.log(np.exp(logits).sum())
            k=min(beams,len(logprob))
            idx=np.argpartition(logprob,-k)[-k:]
            for ix in idx:
                token=int(ix)
                proposed.append((toks+[token],score+float(logprob[ix]),token==1))
        # Length penalty matches ordinary beam search more closely than raw score.
        queue=sorted(proposed,key=lambda v:v[1]/(max(len(v[0])-1,1)**0.6),reverse=True)[:beams]
        if all(row[2] for row in queue):
            break
    best=queue[0][0]
    return decode([t for t in best if t not in (0,1)])

def main():
    p=argparse.ArgumentParser()
    p.add_argument("--pack-dir",required=True)
    p.add_argument("--gold",default="data/translation/gold_candidates.jsonl")
    p.add_argument("--samples-per-direction",type=int,default=5)
    p.add_argument("--widths",nargs="+",type=int,default=[1,2,4])
    p.add_argument("--max-new-tokens",type=int,default=128)
    p.add_argument("--out",required=True)
    a=p.parse_args()
    if any(w not in (1,2,4,8) for w in a.widths): raise ValueError("width must be 1/2/4/8")
    directory=Path(a.pack_dir)/"byt5"
    config=json.loads((directory/"config.json").read_text(encoding="utf-8"))
    enc=ort.InferenceSession(str(directory/"encoder.onnx"),providers=["CPUExecutionProvider"])
    dec=ort.InferenceSession(str(directory/"decoder.onnx"),providers=["CPUExecutionProvider"])
    gold=[json.loads(line) for line in Path(a.gold).open(encoding="utf-8") if line.strip()]
    rows=[]
    for direction,src,ref,pref in (("fr-ba","fr","ba","prefix_fr_ba"),("ba-fr","ba","fr","prefix_ba_fr")):
        for rec in [r for r in gold if r.get(src) and r.get(ref)][:a.samples_per_direction]:
            for width in a.widths:
                start=time.perf_counter()
                hyp=infer(enc,dec,config[pref]+rec[src],width,a.max_new_tokens)
                rows.append({"id":rec.get("id"),"direction":direction,"width":width,
                             "ref":rec[ref],"hyp":hyp,
                             "seconds":round(time.perf_counter()-start,3)})
                print(direction,rec.get("id"),"beam",width,"seconds",rows[-1]["seconds"],flush=True)
    scorer=CHRF(word_order=2)
    stats={}
    for direction in ("fr-ba","ba-fr"):
        stats[direction]={}
        for width in a.widths:
            sub=[r for r in rows if r["direction"]==direction and r["width"]==width]
            stats[direction][str(width)]={"chrfpp":round(scorer.corpus_score([r["hyp"] for r in sub],[[r["ref"] for r in sub]]).score,2),
                                          "mean_seconds":round(sum(r["seconds"] for r in sub)/len(sub),3)}
    report={"beam_experiment_not_certification":True,"pack_dir":a.pack_dir,
            "statistics":stats,"rows":rows}
    out=Path(a.out);out.parent.mkdir(parents=True,exist_ok=True)
    out.write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding="utf-8")
    print(json.dumps(stats,ensure_ascii=False,indent=2))
if __name__=="__main__":
    main()
