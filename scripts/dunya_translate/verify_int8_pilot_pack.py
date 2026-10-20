#!/usr/bin/env python3
"""Verify local experimental ByT5 INT8 archive before PRIVATE staging.

This is an integrity check, never linguistic certification or Android validation.
Public publishing remains blocked until certify_mobile_pack.py succeeds.
"""
import argparse
import hashlib
import json
import zipfile
from pathlib import Path

def digest(data):
    return hashlib.sha256(data).hexdigest()

def main():
    p=argparse.ArgumentParser()
    p.add_argument('--pack-dir',required=True)
    p.add_argument('--out',required=True)
    a=p.parse_args()
    root=Path(a.pack_dir)
    archive=root/'dunya-translate-byt5-v1.zip'
    external=root/'dunya-translate-byt5-v1.manifest.json'
    if not archive.is_file() or not external.is_file():
        raise SystemExit('Missing ZIP or external manifest; run quantize_selective_onnx.py first')
    manifest=json.loads(external.read_text(encoding='utf-8'))
    assert manifest.get('id')=='dunya-translate-byt5'
    assert manifest.get('format')=='dunya-pack/1'
    assert manifest.get('tested') is False, 'Pilot pack must remain untested'
    assert manifest.get('quantization_profile',{}).get('mode')=='both-matmul'
    with zipfile.ZipFile(archive) as z:
        assert not z.testzip(), 'Corrupt ZIP'
        assert json.loads(z.read('manifest.json'))==manifest
        names=set(z.namelist())
        for entry in manifest['files']:
            assert entry['path'] in names
            blob=z.read(entry['path'])
            assert len(blob)==entry['size'],entry['path']
            assert digest(blob)==entry['sha256'],entry['path']
        assert {'byt5/encoder.onnx','byt5/decoder.onnx','byt5/config.json'}<=names
    h=hashlib.sha256()
    with archive.open('rb') as f:
        for chunk in iter(lambda:f.read(8*1024*1024),b''):h.update(chunk)
    report={'status':'PRIVATE_PILOT_ONLY','production_approved':False,
            'pack_id':manifest['id'],'archive':str(archive),'size_bytes':archive.stat().st_size,
            'sha256':h.hexdigest(),'manifest_tested':False,
            'warning':'Integrity is NOT translation quality or actual Android runtime proof.'}
    out=Path(a.out);out.parent.mkdir(parents=True,exist_ok=True)
    out.write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps(report,ensure_ascii=False,indent=2))
if __name__=='__main__': main()
