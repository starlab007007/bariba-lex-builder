#!/usr/bin/env python3
"""Génère le SQL qui importe le contenu Apprendre dans Supabase.

Produit une requête par bloc ('core' = src/data/apprendre_v2.json,
'scenes' = src/data/scenes_v2.json) : un upsert dans
public.apprendre_module_content. Hash, comptage d'éléments et journal
d'audit sont calculés par les triggers de la migration
20260928090000_apprendre_module_content.sql, donc rien n'est calculé ici.

Utilisé par .github/workflows/apprendre-content-supabase.yml et par
test_migration.mjs. Usage manuel :
    python3 build_import_sql.py core   > core.sql
    python3 build_import_sql.py scenes > scenes.sql
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SOURCES = {
    'core': (ROOT / 'src/data/apprendre_v2.json', 'cards'),
    'scenes': (ROOT / 'src/data/scenes_v2.json', 'scenes'),
}
DEFAULT_VERSION = 'v2.4-build19-20260927'
TAG = '$apprendre_json$'


def load(block: str) -> tuple[str, int]:
    path, key = SOURCES[block]
    raw = path.read_text(encoding='utf-8')
    data = json.loads(raw)  # refuse un JSON invalide avant tout envoi
    items = data.get(key)
    if not isinstance(items, list) or not items:
        raise SystemExit(f'{path.name} : "{key}" absent ou vide')
    if TAG in raw:
        raise SystemExit(f'{path.name} contient le délimiteur {TAG}')
    return raw, len(items)


def build(block: str, version: str = DEFAULT_VERSION) -> str:
    if not re.fullmatch(r'[A-Za-z0-9._-]{1,64}', version):
        raise SystemExit(f'version invalide : {version!r}')
    raw, _ = load(block)
    return (
        'INSERT INTO public.apprendre_module_content (id, content, content_version)\n'
        f"VALUES ('{block}', {TAG}{raw}{TAG}::jsonb, '{version}')\n"
        'ON CONFLICT (id) DO UPDATE SET\n'
        '  content = excluded.content,\n'
        '  content_version = excluded.content_version;\n'
    )


def expected_counts() -> dict[str, int]:
    return {block: load(block)[1] for block in SOURCES}


if __name__ == '__main__':
    if len(sys.argv) < 2 or sys.argv[1] not in SOURCES:
        raise SystemExit('usage : build_import_sql.py core|scenes [version]')
    sys.stdout.write(build(sys.argv[1], *(sys.argv[2:3] or [DEFAULT_VERSION])))
