"""Implémentation de référence de la comparaison de voix de FITILA Apprendre.

Miroir de lib/apprendre/apprendre_voice_analysis.dart (mêmes constantes et mêmes
étapes). Sert à vérifier l'algorithme et à calibrer les seuils avec
calibrate_compare.py sur de vraies voix validées.
"""
import math, random, struct, io

SR = 16000; WIN = 400; HOP = 160; NFFT = 512; NMEL = 26; NCEP = 13
PWIN = 640; LAG_MIN = SR // 400; LAG_MAX = SR // 70

def fft(re, im):
    n = len(re); j = 0
    for i in range(1, n):
        bit = n >> 1
        while j & bit:
            j ^= bit; bit >>= 1
        j ^= bit
        if i < j:
            re[i], re[j] = re[j], re[i]; im[i], im[j] = im[j], im[i]
    size = 2
    while size <= n:
        ang = -2 * math.pi / size
        wr, wi = math.cos(ang), math.sin(ang)
        for start in range(0, n, size):
            cr, ci = 1.0, 0.0
            for k in range(size // 2):
                a = start + k; b = a + size // 2
                tr = re[b] * cr - im[b] * ci; ti = re[b] * ci + im[b] * cr
                re[b] = re[a] - tr; im[b] = im[a] - ti
                re[a] += tr; im[a] += ti
                cr, ci = cr * wr - ci * wi, cr * wi + ci * wr
        size <<= 1

def hz2mel(f): return 2595 * math.log10(1 + f / 700)
def mel2hz(m): return 700 * (10 ** (m / 2595) - 1)

def mel_bank():
    lo, hi = hz2mel(60), hz2mel(SR / 2)
    pts = [mel2hz(lo + (hi - lo) * i / (NMEL + 1)) for i in range(NMEL + 2)]
    bins = [int((NFFT + 1) * p / SR) for p in pts]
    bank = []
    for m in range(1, NMEL + 1):
        row = [0.0] * (NFFT // 2 + 1)
        for k in range(bins[m - 1], bins[m]):
            if bins[m] > bins[m - 1]: row[k] = (k - bins[m - 1]) / (bins[m] - bins[m - 1])
        for k in range(bins[m], bins[m + 1]):
            if bins[m + 1] > bins[m]: row[k] = (bins[m + 1] - k) / (bins[m + 1] - bins[m])
        bank.append(row)
    return bank
BANK = mel_bank()
HAMMING = [0.54 - 0.46 * math.cos(2 * math.pi * i / (WIN - 1)) for i in range(WIN)]

def frame_energy_db(x):
    out = []
    for s in range(0, max(1, len(x) - WIN + 1), HOP):
        e = sum(v * v for v in x[s:s + WIN]) / WIN
        out.append(10 * math.log10(e + 1e-10))
    return out

def trim(x):
    e = frame_energy_db(x)
    if not e: return x
    peak = max(e); floor = sorted(e)[len(e) // 10]
    thr = max(peak - 30, floor + 10)
    idx = [i for i, v in enumerate(e) if v > thr]
    if not idx: return x
    a = max(0, idx[0] - 2) * HOP; b = min(len(x), (idx[-1] + 3) * HOP + WIN)
    return x[a:b]

def mfcc(x):
    feats = []
    for s in range(0, len(x) - WIN + 1, HOP):
        re = [x[s + i] * HAMMING[i] for i in range(WIN)] + [0.0] * (NFFT - WIN)
        im = [0.0] * NFFT
        fft(re, im)
        pw = [(re[k] ** 2 + im[k] ** 2) / NFFT for k in range(NFFT // 2 + 1)]
        logm = [math.log(max(sum(r[k] * pw[k] for k in range(len(pw))), 1e-10)) for r in BANK]
        c = [sum(logm[m] * math.cos(math.pi * n * (m + 0.5) / NMEL) for m in range(NMEL)) * math.sqrt(2 / NMEL) for n in range(NCEP)]
        feats.append(c[1:])
    if feats:  # normalisation cepstrale (moyenne)
        d = len(feats[0]); mean = [sum(f[i] for f in feats) / len(feats) for i in range(d)]
        feats = [[f[i] - mean[i] for i in range(d)] for f in feats]
    return feats

def pitch(x):
    """F0 (Hz) par trame de 10 ms, 0 si non voisé (autocorrélation normalisée)."""
    e = frame_energy_db(x); peak = max(e) if e else -100
    out = []
    n = (len(x) - WIN) // HOP + 1 if len(x) >= WIN else 0
    for f in range(n):
        s = f * HOP
        seg = x[s:s + PWIN]
        if len(seg) < PWIN or e[f] < peak - 20:
            out.append(0.0); continue
        m = sum(seg) / len(seg); seg = [v - m for v in seg]
        best, lag = 0.0, 0
        half = PWIN - LAG_MAX
        e0 = sum(v * v for v in seg[:half])
        for L in range(LAG_MIN, LAG_MAX + 1):
            num = sum(seg[i] * seg[i + L] for i in range(half))
            eL = sum(seg[i + L] ** 2 for i in range(half))
            r = num / math.sqrt(e0 * eL + 1e-12)
            if r > best: best, lag = r, L
        if best < 0.6 or lag == 0:
            out.append(0.0); continue
        out.append(SR / lag)
    # médiane glissante sur 5 trames (voisées seulement)
    sm = []
    for i in range(len(out)):
        if out[i] == 0: sm.append(0.0); continue
        w = sorted(v for v in out[max(0, i - 2):i + 3] if v > 0)
        sm.append(w[len(w) // 2])
    return sm

def semitones(f0):
    v = sorted(x for x in f0 if x > 0)
    if not v: return [None] * len(f0)
    med = v[len(v) // 2]
    out = []
    for x in f0:
        if x <= 0: out.append(None); continue
        st = 12 * math.log2(x / med)
        while st > 7: st -= 12   # erreurs d'octave
        while st < -7: st += 12
        out.append(st)
    return out

def dtw(a, b):
    n, m = len(a), len(b)
    INF = float('inf'); band = max(abs(n - m) + 10, int(0.25 * max(n, m)))
    D = [[INF] * (m + 1) for _ in range(n + 1)]; D[0][0] = 0.0
    for i in range(1, n + 1):
        jc = int(i * m / n)
        for j in range(max(1, jc - band), min(m, jc + band) + 1):
            d = math.sqrt(sum((a[i - 1][k] - b[j - 1][k]) ** 2 for k in range(len(a[0]))))
            D[i][j] = d + min(D[i - 1][j], D[i][j - 1], D[i - 1][j - 1])
    path = []; i, j = n, m
    while i > 0 and j > 0:
        path.append((i - 1, j - 1))
        opts = [(D[i - 1][j - 1], i - 1, j - 1), (D[i - 1][j], i - 1, j), (D[i][j - 1], i, j - 1)]
        _, i, j = min(opts)
    path.reverse()
    return D[n][m] / max(1, len(path)), path

def compare(ref, learner, mfcc_good=5.0, mfcc_bad=14.0):
    r = trim(ref); l = trim(learner)
    fr, fl = mfcc(r), mfcc(l)
    if len(fr) < 5 or len(fl) < 5: return None
    dist, path = dtw(fr, fl)
    sr, sl = semitones(pitch(r)), semitones(pitch(l))
    diffs = [abs(sr[i] - sl[j]) for i, j in path if i < len(sr) and j < len(sl) and sr[i] is not None and sl[j] is not None]
    spectral = max(0.0, min(100.0, 100 * (1 - (dist - mfcc_good) / max(0.1, mfcc_bad - mfcc_good))))
    tone = max(0.0, min(100.0, 100 * (1 - (sum(diffs) / len(diffs)) / 3))) if len(diffs) >= 5 else None
    ratio = len(l) / len(r)
    dur = 100.0 if 0.7 <= ratio <= 1.45 else max(0.0, 100 - 150 * min(abs(ratio - 0.7), abs(ratio - 1.45)))
    total = 0.55 * spectral + 0.35 * (tone if tone is not None else spectral) + 0.10 * dur
    return dict(dist=round(dist, 2), spectral=round(spectral), tone=None if tone is None else round(tone), ratio=round(ratio, 2), total=round(total))

# ---------------- signaux de test ----------------
def synth(f0_start, f0_end, dur, formants=(700, 1200), noise=0.0, seed=1, silence=0.25):
    rnd = random.Random(seed); n = int(dur * SR); x = [noise * rnd.gauss(0, 1) for _ in range(int(silence * SR))]
    ph = 0.0
    for i in range(n):
        t = i / n; f0 = f0_start * (f0_end / f0_start) ** t
        ph += 2 * math.pi * f0 / SR
        env = math.sin(math.pi * t) ** 0.5
        v = 0.0
        for h in range(1, 25):
            fh = h * f0
            if fh > SR / 2 - 200: break
            gain = sum(1 / (1 + ((fh - F) / 120) ** 2) for F in formants) + 0.05
            v += gain * math.sin(h * ph) / h
        x.append(0.2 * env * v + noise * rnd.gauss(0, 1))
    x += [noise * rnd.gauss(0, 1) for _ in range(int(silence * SR))]
    return x

def read_wav(path):
    import wave
    with wave.open(path, 'rb') as w:
        ch, width, rate, n = w.getnchannels(), w.getsampwidth(), w.getframerate(), w.getnframes()
        raw = w.readframes(n)
    if width != 2:
        raise ValueError('WAV 16 bits attendu')
    vals = struct.unpack('<%dh' % (len(raw) // 2), raw)
    mono = [sum(vals[i * ch:(i + 1) * ch]) / ch / 32768 for i in range(len(vals) // ch)]
    if rate == SR:
        return mono
    out = []
    for i in range(int(len(mono) * SR / rate)):
        pos = i * rate / SR; i0 = int(pos); i1 = min(i0 + 1, len(mono) - 1); fr = pos - i0
        out.append(mono[i0] * (1 - fr) + mono[i1] * fr)
    return out

def wav_bytes(x):
    pcm = b''.join(struct.pack('<h', int(max(-1, min(1, v)) * 32767)) for v in x)
    return b'RIFF' + struct.pack('<I', 36 + len(pcm)) + b'WAVEfmt ' + struct.pack('<IHHIIHH', 16, 1, 1, SR, SR * 2, 2, 16) + b'data' + struct.pack('<I', len(pcm)) + pcm

if __name__ == '__main__':
    ref = synth(140, 210, 0.6)                      # ton montant
    cases = {
        'même voix (autre graine de bruit)': synth(140, 210, 0.6, noise=0.003, seed=2),
        'voix plus aiguë, plus lente, même mélodie': synth(230, 345, 0.8, formants=(760, 1300), seed=3),
        'mélodie inversée (ton descendant)': synth(210, 140, 0.6, seed=4),
        'autres sons, même mélodie': synth(140, 210, 0.6, formants=(300, 2300), seed=5),
        'ton plat': synth(170, 170, 0.6, seed=6),
    }
    for k, v in cases.items():
        print(f'{k:45s}', compare(ref, v))
