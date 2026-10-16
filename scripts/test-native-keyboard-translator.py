"""Exercise real IME key taps, public ByT5 translation and host insertion on Android."""
import json
import re
import subprocess
import time
import xml.etree.ElementTree as ET
from pathlib import Path

OUT = Path('keyboard-emulator-proof')
OUT.mkdir(exist_ok=True)

def adb(*args):
    return subprocess.check_output(['adb', *args], timeout=25)

def nodes():
    adb('shell', 'uiautomator', 'dump', '--windows', '/sdcard/fitila-window.xml')
    return list(ET.fromstring(adb('shell', 'cat', '/sdcard/fitila-window.xml')).iter('node'))

def find(attribute, value, timeout=15):
    until = time.monotonic() + timeout
    while time.monotonic() < until:
        for node in nodes():
            if node.get(attribute) == value:
                return node
        time.sleep(0.5)
    raise AssertionError(f'UI element missing: {attribute}={value}')

def tap(node, long=False):
    x1, y1, x2, y2 = map(int, re.findall(r'\d+', node.get('bounds')))
    x, y = str((x1+x2)//2), str((y1+y2)//2)
    if long:
        adb('shell', 'input', 'swipe', x, y, x, y, '900')
    else:
        adb('shell', 'input', 'tap', x, y)

def screenshot(name):
    (OUT / name).write_bytes(adb('exec-out', 'screencap', '-p'))

try:
    package = 'bj.fitila.fitila_native'
    component = package + '/com.fitila.bariba.BaribaInputMethodService'
    adb('shell', 'ime', 'enable', component)
    adb('shell', 'ime', 'set', component)
    adb('shell', 'am', 'start', '-n', package + '/com.fitila.bariba.KeyboardTestActivity')
    tap(find('text', '⚡'))
    for label in ['⇧', 'b', 'o', 'n', 'j', 'o', 'u', 'r']:
        tap(find('text', label))
    draft = find('content-desc', 'Texte à traduire')
    assert draft.get('text') == 'Bonjour', draft.attrib
    host = find('content-desc', 'Application hôte : texte de test')
    assert host.get('text') in ('', 'La traduction sera insérée ici'), host.attrib
    screenshot('01-saisie-clavier.png')
    tap(find('content-desc', 'Traduire le texte'))
    result = find('content-desc', 'Traduction reçue. Touchez pour copier, appui long pour insérer.', timeout=85)
    translated = result.get('text', '').strip()
    assert translated and translated not in ('Bonjour', 'Traduction en cours…'), translated
    assert find('content-desc', 'Texte à traduire').get('text') == 'Bonjour'
    screenshot('02-reponse-byt5.png')
    tap(result, long=True)
    tap(find('content-desc', 'Fermer le traducteur'))
    host = find('content-desc', 'Application hôte : texte de test')
    assert host.get('text', '').strip() == translated, host.attrib
    tap(find('text', 'x'))
    host = find('content-desc', 'Application hôte : texte de test')
    assert host.get('text', '').endswith('x'), host.attrib
    screenshot('03-insertion-application.png')
    (OUT / 'result.json').write_text(json.dumps({'passed': True, 'source': 'Bonjour', 'translation': translated,
        'endpoint': 'byt5-bariba-translate', 'host_isolated_during_typing': True,
        'explicit_insertion': True, 'host_typing_restored': True}, ensure_ascii=False, indent=2))
    print('Native Android keyboard end-to-end test passed:', translated)
except Exception:
    screenshot('failure.png')
    (OUT / 'failure-ui.xml').write_bytes(adb('shell', 'cat', '/sdcard/fitila-window.xml'))
    raise
