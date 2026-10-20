#!/usr/bin/env python3
"""FITILA conservative offline-memory candidate audit: no automatic linguistic certification."""
import argparse, csv, json, unicodedata
from collections import defaultdict, Counter
from pathlib import Path

def key(value):
    return ' '.join(unicodedata.normalize('NFC', str(value)).casefold().split()).strip(' .!?')

def main():
    p=argparse.ArgumentParser()
    p.add_argument('--project', default='.')
    p.add_argument('--out', default='dist/dunya-byt5-certification')
    a=p.parse_args()
    root=Path(a.project)
    dest=root/a.out
    dest.mkdir(parents=True,exist_ok=True)
    memory=json.loads((root/'fitila_flutter/assets/data/dunya_memory.json').read_text(encoding='utf-8'))['pairs']
    goldfile=root/'data/translation/gold_candidates.jsonl'
    gold=set()
    if goldfile.exists():
        for line in goldfile.open(encoding='utf-8-sig'):
            if not line.strip():
                continue
            item=json.loads(line)
            if item.get('fr') and item.get('ba'):
                gold.add((key(item['fr']),key(item['ba'])))
    groups={'fr-ba':defaultdict(list),'ba-fr':defaultdict(list)}
    for row in memory:
        if not isinstance(row,list) or len(row)<3:
            continue
        fr,ba,grade=row[:3]
        if not key(fr) or not key(ba):
            continue
        groups['fr-ba'][key(fr)].append((fr,ba,grade,key(ba)))
        groups['ba-fr'][key(ba)].append((ba,fr,grade,key(fr)))
    safe=[]
    conflicts=[]
    stats=Counter()
    for direction,buckets in groups.items():
        for normalized_source,entries in buckets.items():
            alternatives={x[3] for x in entries}
            if len(alternatives)>1:
                stats[f'{direction}_conflicts']+=1
                for src,target,grade,_ in entries:
                    conflicts.append({'Direction':direction,'Source':src,'Candidate':target,'Grade':grade,'Decision':'A_VALIDER','Correction':'','Validateur':''})
                continue
            if any(e[2]!='A' for e in entries):
                stats['excluded_grade_B']+=1
                continue
            src,target,grade,_=entries[0]
            pair=(key(src),key(target)) if direction=='fr-ba' else (key(target),key(src))
            if pair in gold:
                stats['excluded_gold_pairs']+=1
                continue
            safe.append({'direction':direction,'source':src,'target':target,
                         'provenance':'dunya_memory.json','grade':'A',
                         'human_approved':False,'review_status':'CORPUS_UNVERIFIED'})
            stats[f'{direction}_candidates']+=1
    safe.sort(key=lambda v:(v['direction'],key(v['source'])))
    (dest/'offline_memory_candidates.json').write_text(json.dumps({'format':'fitila-corpus-candidates/1','entries':safe,'warning':'NOT human-certified; NOT approved memory'},ensure_ascii=False,indent=2),encoding='utf-8')
    path=dest/'conflits_pour_validation.csv'
    with path.open('w',encoding='utf-8-sig',newline='') as f:
        w=csv.DictWriter(f,fieldnames=['Direction','Source','Candidate','Grade','Decision','Correction','Validateur'],delimiter=';')
        w.writeheader()
        w.writerows(conflicts)
    report={'input_pairs':len(memory),'gold_reference_pairs':len(gold),'conflict_rows':len(conflicts),**stats,'no_human_approval_inferred':True}
    (dest/'offline_memory_report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps(report,ensure_ascii=False,indent=2))
    print('Fichiers :',dest/'offline_memory_candidates.json',path,dest/'offline_memory_report.json')

if __name__=='__main__':
    main()
