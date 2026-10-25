#!/usr/bin/env python3
"""Run the real public ONNX pack. Diagnostics do not certify linguistic quality."""
import argparse
import hashlib
import json
from pathlib import Path
import statistics
import time
import onnxruntime as ort
from sacrebleu.metrics import CHRF
from benchmark_onnx_beams import infer


def looped(text):
    words = text.split()
    return any(words[i:i+n] * 4 == words[i:i+4*n]
               for n in (1, 2, 3) for i in range(max(0, len(words)-4*n+1)))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--pack-dir', required=True)
    parser.add_argument('--gold', default='data/translation/gold_candidates.jsonl')
    parser.add_argument('--samples-per-direction', type=int, default=100)
    parser.add_argument('--out', required=True)
    args = parser.parse_args()
    root = Path(args.pack_dir); config = json.loads((root/'byt5/config.json').read_text())
    manifest = json.loads((root/'manifest.json').read_text())
    for entry in manifest['files']:
        data = (root/entry['path']).read_bytes()
        assert len(data) == entry['size'] and hashlib.sha256(data).hexdigest() == entry['sha256']
    opts = ort.SessionOptions(); opts.intra_op_num_threads=2; opts.inter_op_num_threads=1
    enc = ort.InferenceSession(str(root/'byt5/encoder.onnx'), sess_options=opts, providers=['CPUExecutionProvider'])
    dec = ort.InferenceSession(str(root/'byt5/decoder.onnx'), sess_options=opts, providers=['CPUExecutionProvider'])
    gold = [json.loads(line) for line in Path(args.gold).read_text().splitlines() if line]
    report = {'status':'BETA_NOT_CERTIFIED', 'runtime':'onnxruntime-cpu', 'runtime_version':ort.__version__,
              'checkpoint':manifest['source_checkpoint'], 'manifest_tested':manifest['tested'],
              'integrity_passed':True, 'independent_linguistic_review':False, 'physical_android_test':False,
              'warning':'Legacy gold candidates may overlap training or memory. This is a reproducible diagnostic, not independent quality certification.',
              'by_direction':{},'examples':[]}
    scorer = CHRF(word_order=2)
    for direction, src, target, prefix, width in [('fr-ba','fr','ba','prefix_fr_ba',2),('ba-fr','ba','fr','prefix_ba_fr',1)]:
        rows=[]
        for i, row in enumerate(gold[:args.samples_per_direction]):
            started=time.monotonic(); output=infer(enc,dec,config[prefix]+row[src],width,192)
            rows.append({'source':row[src], 'reference':row[target], 'prediction':output,
                         'seconds':round(time.monotonic()-started,3), 'loop':looped(output)})
            if (i+1)%20==0: print(direction,i+1,flush=True)
        score=scorer.corpus_score([r['prediction'] for r in rows],[[r['reference'] for r in rows]]).score
        report['by_direction'][direction]={'n':len(rows),'beam_width':width,'chrf++':round(score,2),
             'loop_rate':sum(r['loop'] for r in rows)/len(rows),'mean_seconds':round(statistics.mean(r['seconds'] for r in rows),3)}
        report['examples'] += [dict(direction=direction,**r) for r in rows[:10]]
    out=Path(args.out);out.parent.mkdir(parents=True,exist_ok=True)
    out.write_text(json.dumps(report,ensure_ascii=False,indent=2))
    print(json.dumps(report['by_direction'],ensure_ascii=False),flush=True)


if __name__=='__main__': main()
