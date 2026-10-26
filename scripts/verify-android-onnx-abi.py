#!/usr/bin/env python3
"""Verify the actual shared ONNX ELF ABI in every architecture of an APK.

Sherpa and Microsoft's JNI binding both depend on libonnxruntime.so. A Gradle
pickFirst resolves the duplicate filename but cannot resolve versioned symbols.
Inspect the packaged native objects rather than trusting dependency versions.
"""
import json
import argparse
from pathlib import Path
import re
import subprocess
import sys
import tempfile
import zipfile


def versions(path):
    output = subprocess.check_output(
        ['readelf', '--version-info', str(path)], text=True
    )
    return set(re.findall(r'\bVERS_\d+\.\d+\.\d+\b', output))


def verify(apk, mapping=None):
    evidence = []
    with zipfile.ZipFile(apk) as archive, tempfile.TemporaryDirectory() as temp:
        entries = archive.namelist()
        cores = [name for name in entries if name.startswith('lib/')
                 and name.endswith('/libonnxruntime.so')]
        if not cores:
            raise ValueError('APK has no shared ONNX runtime')
        for name in cores:
            prefix = name.rsplit('/', 1)[0] + '/'
            core = Path(temp) / 'libonnxruntime.so'
            core.write_bytes(archive.read(name))
            available = versions(core)
            if len(available) != 1:
                raise ValueError(f'{name}: expected one ONNX ELF version, got {available}')
            bindings = [n for n in entries if n.startswith(prefix) and n.endswith('.so')
                        and ('sherpa' in n or n.endswith('/libonnxruntime4j_jni.so'))]
            if not any(n.endswith('/libonnxruntime4j_jni.so') for n in bindings):
                raise ValueError(f'{prefix}: Java ONNX binding is missing')
            for binding in bindings:
                local = Path(temp) / Path(binding).name
                local.write_bytes(archive.read(binding))
                required = versions(local)
                if not required.issubset(available):
                    raise ValueError(f'{binding} needs {sorted(required)}, '
                                     f'but {name} exports {sorted(available)}')
                evidence.append({'library': binding, 'required': sorted(required),
                                 'shared_runtime': sorted(available)})
        if mapping is not None:
            # JNI names are taken from the packaged binding, not a hand-picked
            # sample of classes. Check both R8's map and the delivered DEX files.
            classes = set()
            for name in entries:
                if name.endswith('/libonnxruntime4j_jni.so'):
                    classes.update(x.decode().replace('/', '.') for x in re.findall(
                        rb'ai/onnxruntime/[A-Za-z0-9_$]+', archive.read(name)))
            mapped = dict(re.findall(r'^([^\s].*?) -> ([^:]+):$',
                                     Path(mapping).read_text(), re.MULTILINE))
            dex = b''.join(archive.read(n) for n in entries
                           if re.fullmatch(r'classes\d*\.dex', n))
            if not classes or not dex:
                raise ValueError('Missing JNI class names or APK DEX')
            for original in sorted(classes):
                if mapped.get(original) != original:
                    raise ValueError(f'R8 changed or removed JNI class {original}')
                descriptor = ('L' + original.replace('.', '/') + ';').encode()
                if descriptor not in dex:
                    raise ValueError(f'APK is missing JNI class {original}')
            evidence.append({'r8_preserved_jni_classes': sorted(classes)})
    return evidence


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('apks', nargs='+')
    parser.add_argument('--r8-mapping', type=Path)
    args = parser.parse_args()
    for apk in args.apks:
        try:
            print(json.dumps({'apk': apk, 'onnx_abi': verify(apk, args.r8_mapping)}))
        except (ValueError, subprocess.CalledProcessError) as error:
            raise SystemExit(f'Incompatible Android ONNX runtime: {error}') from error
