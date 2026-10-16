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

def _recover_emulator_dialog(visible_nodes):
    """AOSP Quickstep can ANR during a cold CI boot, covering *all* IME nodes.

    This is an emulator infrastructure recovery only. It cannot make the
    keyboard/translation assertions pass: those are still exercised below.
    """
    global _system_dialog_recoveries
    titles = [n.get('text', '') for n in visible_nodes]
    if not any("isn't responding" in title or "is not responding" in title for title in titles):
        return False
    if _system_dialog_recoveries >= 3:
        raise AssertionError('Android emulator repeatedly displays a system ANR dialog')
    close = next((n for n in visible_nodes if n.get('text') == 'Close app'), None)
    if close is None:
        raise AssertionError('Android system ANR is blocking the input method: ' + str(titles))
    tap(close)
    _system_dialog_recoveries += 1
    time.sleep(2)
    adb('shell', 'am', 'start', '-W', '-n',
        'bj.fitila.fitila_native/com.fitila.bariba.KeyboardTestActivity')
    time.sleep(1)
    return True


_system_dialog_recoveries = 0


def find(attribute, value, timeout=35):
    until = time.monotonic() + timeout
    while time.monotonic() < until:
        visible = nodes()
        if _recover_emulator_dialog(visible):
            continue
        for node in visible:
            if node.get(attribute) == value:
                return node
        # A cold emulator may launch the host without displaying its IME yet.
        if value == '⚡':
            host = next((n for n in visible if n.get('content-desc') ==
                         'Application hôte : texte de test'), None)
            if host is not None:
                tap(host)
        time.sleep(0.6)
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
    adb('shell', 'am', 'start', '-W', '-n', package + '/com.fitila.bariba.KeyboardTestActivity')
    quick = find('text', '⚡')
    screenshot('00-clavier-navigation.png')
    (OUT / '00-windows.xml').write_bytes(adb('shell', 'cat', '/sdcard/fitila-window.xml'))

    # The host is a separate Activity, not Flutter: suggestions must come
    # directly from the Android IME and must include real dictionary glosses.
    for letter in ('s', 'i', 'a'):
        tap(find('text', letter))
    candidate = find('content-desc', 'sia, demain')
    find('text', 'sia')
    find('text', 'demain')
    find('content-desc', 'siara, remercier, louer, féliciter')
    find('content-desc', 'siasia, faire vomir')
    screenshot('00-predictions-baatonum-francais.png')
    (OUT / '00-predictions-ui.xml').write_bytes(
        adb('shell', 'cat', '/sdcard/fitila-window.xml'))
    tap(candidate)
    host = find('content-desc', 'Application hôte : texte de test')
    assert host.get('text', '').strip() == 'sia', 'Candidate must insert only Baatɔnum: ' + str(host.attrib)
    for _ in range(4):
        tap(find('text', '⌫'))
    host = find('content-desc', 'Application hôte : texte de test')
    assert host.get('text') in ('', 'La traduction sera insérée ici'), host.attrib

    tap(find('text', '⚡'))
    screenshot('00-traducteur-ouvert.png')
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
        'explicit_insertion': True, 'host_typing_restored': True, 'bilingual_native_predictions': True,
        'candidate_inserted_without_french': True}, ensure_ascii=False, indent=2))
    print('Native Android keyboard end-to-end test passed:', translated)
except Exception:
    (OUT / 'logcat.txt').write_bytes(adb('logcat', '-d', '-s', 'BaribaKeyboard', 'InputMethodManager', 'ImeTracker', 'AndroidRuntime'))
    (OUT / 'input-method-state.txt').write_bytes(adb('shell', 'dumpsys', 'input_method'))
    screenshot('failure.png')
    (OUT / 'failure-ui.xml').write_bytes(adb('shell', 'cat', '/sdcard/fitila-window.xml'))
    raise
