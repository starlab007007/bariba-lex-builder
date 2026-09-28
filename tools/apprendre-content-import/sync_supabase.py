#!/usr/bin/env python3
"""Applique la migration Apprendre et importe le contenu dans un projet Supabase.

Exécuté par .github/workflows/apprendre-content-supabase.yml (un job par
projet : 'web' = celui de fitila.bj, 'flutter' = celui de l'appli mobile).
Passe par l'API Management de Supabase (SUPABASE_ACCESS_TOKEN), comme
deploy-content-modules-supabase.yml. Écrit ses résultats en annotations
GitHub (::notice / ::warning / ::error) pour qu'ils soient lisibles sans
ouvrir les logs.

Variables : TARGET (web|flutter), SUPABASE_ACCESS_TOKEN,
WEB_SUPABASE_URL / WEB_SUPABASE_KEY (projet web, facultatif : repli sur .env).
"""
from __future__ import annotations

import json
import os
import sys
import time
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
sys.path.insert(0, str(HERE))
from build_import_sql import DEFAULT_VERSION, build, expected_counts, load  # noqa: E402

MIGRATION = ROOT / 'supabase/migrations/20260928090000_apprendre_module_content.sql'
FLUTTER_PROJECT = 'dvswhjawiooprghzeyol'
API = 'https://api.supabase.com/v1'
TARGET = os.environ.get('TARGET', 'web')
TOKEN = os.environ.get('SUPABASE_ACCESS_TOKEN', '')
STRICT = TARGET == 'web'  # le projet web est celui qui compte pour fitila.bj


def annotate(level: str, message: str) -> None:
    print(f'::{level} title=Apprendre → Supabase ({TARGET})::{message}', flush=True)


def stop(message: str) -> None:
    annotate('error' if STRICT else 'warning', message)
    sys.exit(1 if STRICT else 0)


def http(method: str, url: str, headers: dict, body: bytes | None = None, timeout: int = 300):
    request = Request(url, data=body, method=method, headers={'User-Agent': 'fitila-apprendre-sync', **headers})
    try:
        with urlopen(request, timeout=timeout) as response:
            raw = response.read().decode('utf-8')
            return response.status, (json.loads(raw) if raw else None)
    except HTTPError as error:
        raw = error.read().decode('utf-8', 'replace')
        return error.code, raw[:500]
    except URLError as error:
        return 0, str(error.reason)


def env_file_value(*keys: str) -> str:
    env = ROOT / '.env'
    if not env.exists():
        return ''
    values = {}
    for line in env.read_text(encoding='utf-8').splitlines():
        line = line.strip()
        if line and not line.startswith('#') and '=' in line:
            k, v = line.split('=', 1)
            values[k.strip()] = v.strip().strip('"').strip("'")
    return next((values[k] for k in keys if values.get(k)), '')


def project_ref() -> str:
    if TARGET == 'flutter':
        return FLUTTER_PROJECT
    url = os.environ.get('WEB_SUPABASE_URL') or env_file_value('VITE_SUPABASE_URL', 'SUPABASE_URL')
    if '.supabase.co' not in url:
        stop("URL Supabase du site introuvable (secret VITE_SUPABASE_URL ou .env).")
    return url.split('//', 1)[-1].split('.', 1)[0]


def query(ref: str, sql: str):
    return http('POST', f'{API}/projects/{ref}/database/query',
                {'Authorization': f'Bearer {TOKEN}', 'Content-Type': 'application/json'},
                json.dumps({'query': sql}).encode('utf-8'))


def rest_upsert(ref: str, service_key: str, block: str) -> tuple[int, object]:
    raw, _ = load(block)
    body = json.dumps({'id': block, 'content': json.loads(raw), 'content_version': DEFAULT_VERSION}).encode('utf-8')
    return http('POST', f'https://{ref}.supabase.co/rest/v1/apprendre_module_content',
                {'apikey': service_key, 'Authorization': f'Bearer {service_key}',
                 'Content-Type': 'application/json', 'Prefer': 'resolution=merge-duplicates,return=minimal'},
                body)


def main() -> None:
    ref = project_ref()
    print(f'Projet cible : {ref} ({TARGET})')
    if not TOKEN:
        stop('Secret SUPABASE_ACCESS_TOKEN absent : impossible d\'appliquer la migration.')

    status, info = http('GET', f'{API}/projects/{ref}', {'Authorization': f'Bearer {TOKEN}'})
    if status != 200:
        # Même appel que deploy-content-modules-supabase.yml, pour distinguer
        # un jeton refusé (401 partout) d'un simple manque d'accès au projet.
        q_status, _ = query(ref, 'select 1 as ok')
        shape = f"jeton : {len(TOKEN)} caractères, préfixe {'sbp_' if TOKEN.startswith('sbp_') else 'autre que sbp_'}"
        stop(f"Pas d'accès Management au projet {ref} (GET projet HTTP {status}, requête SQL HTTP {q_status} ; {shape}). "
             "Si 401 : le secret SUPABASE_ACCESS_TOKEN est expiré ou révoqué — régénère-le (supabase.com/dashboard/account/tokens) "
             "puis relance ce workflow. Sinon : voie manuelle, tools/apprendre-content-import/INSTRUCTIONS.md.")
    annotate('notice', f'Accès au projet {ref} confirmé.')

    status, rows = query(ref, "select to_regprocedure('public.has_role(uuid, public.app_role)') is not null as ok")
    if status not in (200, 201) or not rows or not rows[0].get('ok'):
        stop(f'public.has_role(uuid, app_role) absent sur {ref} (HTTP {status}) : migration non appliquée.')

    status, detail = query(ref, MIGRATION.read_text(encoding='utf-8'))
    if status not in (200, 201):
        stop(f'Migration refusée sur {ref} (HTTP {status}) : {detail}')
    annotate('notice', f'Migration 20260928090000_apprendre_module_content appliquée sur {ref}.')

    service_key = None
    for block in ('core', 'scenes'):
        status, detail = query(ref, build(block))
        if status in (200, 201):
            continue
        print(f'Import SQL {block} : HTTP {status} {detail} — repli sur l\'API REST.')
        if service_key is None:
            s, keys = http('GET', f'{API}/projects/{ref}/api-keys', {'Authorization': f'Bearer {TOKEN}'})
            service_key = next((k.get('api_key') for k in (keys or []) if isinstance(k, dict) and k.get('name') == 'service_role'), '') if s == 200 else ''
        if not service_key:
            stop(f'Import {block} impossible sur {ref} (HTTP {status}) et clé service_role indisponible.')
        status, detail = rest_upsert(ref, service_key, block)
        if status not in (200, 201, 204):
            stop(f'Import REST {block} refusé sur {ref} (HTTP {status}) : {detail}')

    status, rows = query(ref, 'select id, content_version, item_count, content_hash from public.apprendre_module_content order by id')
    got = {r['id']: r for r in (rows or [])} if status in (200, 201) else {}
    expected = expected_counts()
    summary = ', '.join(f"{b} = {got.get(b, {}).get('item_count')}/{n}" for b, n in expected.items())
    if any(got.get(b, {}).get('item_count') != n for b, n in expected.items()):
        stop(f'Contrôle en base incorrect sur {ref} : {summary}')
    annotate('notice', f'Contenu en base sur {ref} : {summary} ({DEFAULT_VERSION}).')

    # Lecture publique, comme le chargeur web (clé anon ; le cache de schéma
    # de PostgREST peut mettre quelques secondes à voir la nouvelle table).
    anon = ''
    if TARGET == 'web':
        anon = os.environ.get('WEB_SUPABASE_KEY') or env_file_value('VITE_SUPABASE_PUBLISHABLE_KEY', 'SUPABASE_PUBLISHABLE_KEY')
    if not anon:
        s, keys = http('GET', f'{API}/projects/{ref}/api-keys', {'Authorization': f'Bearer {TOKEN}'})
        anon = next((k.get('api_key') for k in (keys or []) if isinstance(k, dict) and k.get('name') == 'anon'), '') if s == 200 else ''
    if not anon:
        annotate('warning', f'Clé anon de {ref} indisponible : lecture publique non vérifiée.')
        return
    url = f'https://{ref}.supabase.co/rest/v1/apprendre_module_content?select=id,content_version&id=in.(core,scenes)'
    for attempt in range(6):
        status, rows = http('GET', url, {'apikey': anon, 'Authorization': f'Bearer {anon}'}, timeout=30)
        if status == 200 and isinstance(rows, list) and len(rows) == 2:
            annotate('notice', f'Lecture publique OK sur {ref} : le site lit désormais ce contenu depuis Supabase.')
            return
        time.sleep(5)
    stop(f'Lecture publique échouée sur {ref} (HTTP {status}) : {rows}')


if __name__ == '__main__':
    main()
