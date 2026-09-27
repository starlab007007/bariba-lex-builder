import 'dart:math' as math;
import 'dart:typed_data';

/// Analyse et comparaison de voix, entièrement sur l'appareil (hors-ligne).
///
/// Chaîne : WAV PCM 16 bits → 16 kHz mono → coupe des silences →
/// empreinte des sons (MFCC 12 coefficients, moyenne retirée) + courbe de
/// hauteur (autocorrélation, en demi-tons autour de la médiane) →
/// alignement temporel (DTW) sur la référence → trois scores (sons, mélodie,
/// rythme) et un conseil. Implémentation de référence en Python :
/// tool/audio_catalog/voice_compare_reference.py (mêmes constantes).

const int _sr = 16000;
const int _win = 400; // 25 ms
const int _hop = 160; // 10 ms
const int _nfft = 512;
const int _nMel = 26;
const int _nCep = 13;
const int _pitchWin = 640; // 40 ms
const int _lagMin = _sr ~/ 400; // 400 Hz
const int _lagMax = _sr ~/ 70; // 70 Hz

/// Signal mono normalisé entre -1 et 1, échantillonné à 16 kHz.
class ApPcm {
  const ApPcm(this.samples);

  final List<double> samples;

  double get seconds => samples.length / _sr;
}

/// Lit un fichier WAV PCM 16 bits (mono ou stéréo, toute fréquence).
/// Renvoie null si le format n'est pas pris en charge.
ApPcm? apDecodeWav(Uint8List bytes) {
  if (bytes.length < 44) {
    return null;
  }
  final data = ByteData.sublistView(bytes);
  String tag(int offset) => String.fromCharCodes(bytes.sublist(offset, offset + 4));
  if (tag(0) != 'RIFF' || tag(8) != 'WAVE') {
    return null;
  }
  var offset = 12;
  var channels = 1;
  var rate = _sr;
  var bits = 16;
  var format = 1;
  int? dataStart;
  var dataLength = 0;
  while (offset + 8 <= bytes.length) {
    final id = tag(offset);
    final size = data.getUint32(offset + 4, Endian.little);
    final body = offset + 8;
    if (id == 'fmt ' && body + 16 <= bytes.length) {
      format = data.getUint16(body, Endian.little);
      channels = data.getUint16(body + 2, Endian.little);
      rate = data.getUint32(body + 4, Endian.little);
      bits = data.getUint16(body + 14, Endian.little);
    } else if (id == 'data') {
      dataStart = body;
      dataLength = math.min(size, bytes.length - body);
      break;
    }
    offset = body + size + (size.isOdd ? 1 : 0);
  }
  final start = dataStart;
  if (start == null || format != 1 || bits != 16 || channels < 1 || rate <= 0) {
    return null;
  }
  final frames = dataLength ~/ (2 * channels);
  final mono = List<double>.filled(frames, 0.0);
  for (var i = 0; i < frames; i++) {
    var sum = 0.0;
    for (var c = 0; c < channels; c++) {
      sum += data.getInt16(start + (i * channels + c) * 2, Endian.little) / 32768.0;
    }
    mono[i] = sum / channels;
  }
  if (rate == _sr) {
    return ApPcm(mono);
  }
  // Rééchantillonnage linéaire vers 16 kHz.
  final outLength = (frames * _sr / rate).floor();
  final out = List<double>.filled(outLength, 0.0);
  for (var i = 0; i < outLength; i++) {
    final pos = i * rate / _sr;
    final i0 = pos.floor();
    final i1 = math.min(i0 + 1, frames - 1);
    final frac = pos - i0;
    out[i] = mono[i0] * (1 - frac) + mono[i1] * frac;
  }
  return ApPcm(out);
}

/// Écrit un WAV PCM 16 bits mono 16 kHz (utile pour les tests).
Uint8List apEncodeWav(List<double> samples) {
  final length = samples.length * 2;
  final out = ByteData(44 + length);
  void text(int offset, String value) {
    for (var i = 0; i < 4; i++) {
      out.setUint8(offset + i, value.codeUnitAt(i));
    }
  }

  text(0, 'RIFF');
  out.setUint32(4, 36 + length, Endian.little);
  text(8, 'WAVE');
  text(12, 'fmt ');
  out.setUint32(16, 16, Endian.little);
  out.setUint16(20, 1, Endian.little);
  out.setUint16(22, 1, Endian.little);
  out.setUint32(24, _sr, Endian.little);
  out.setUint32(28, _sr * 2, Endian.little);
  out.setUint16(32, 2, Endian.little);
  out.setUint16(34, 16, Endian.little);
  text(36, 'data');
  out.setUint32(40, length, Endian.little);
  for (var i = 0; i < samples.length; i++) {
    final v = samples[i].clamp(-1.0, 1.0).toDouble();
    out.setInt16(44 + i * 2, (v * 32767).round(), Endian.little);
  }
  return out.buffer.asUint8List();
}

List<double> _frameEnergyDb(List<double> x) {
  final out = <double>[];
  if (x.length < _win) {
    return out;
  }
  for (var s = 0; s + _win <= x.length; s += _hop) {
    var e = 0.0;
    for (var i = 0; i < _win; i++) {
      e += x[s + i] * x[s + i];
    }
    out.add(10 * math.log(e / _win + 1e-10) / math.ln10);
  }
  return out;
}

/// Coupe les silences de début et de fin (seuil relatif au bruit de fond).
List<double> apTrimSilence(List<double> x) {
  final e = _frameEnergyDb(x);
  if (e.isEmpty) {
    return x;
  }
  final peak = e.reduce(math.max);
  final sorted = List<double>.from(e)..sort();
  final floor = sorted[sorted.length ~/ 10];
  final threshold = math.max(peak - 30, floor + 10);
  var first = -1;
  var last = -1;
  for (var i = 0; i < e.length; i++) {
    if (e[i] > threshold) {
      if (first < 0) {
        first = i;
      }
      last = i;
    }
  }
  if (first < 0) {
    return x;
  }
  final a = math.max(0, first - 2) * _hop;
  final b = math.min(x.length, (last + 3) * _hop + _win);
  return x.sublist(a, b);
}

void _fft(List<double> re, List<double> im) {
  final n = re.length;
  var j = 0;
  for (var i = 1; i < n; i++) {
    var bit = n >> 1;
    while (j & bit != 0) {
      j ^= bit;
      bit >>= 1;
    }
    j ^= bit;
    if (i < j) {
      final tr = re[i];
      re[i] = re[j];
      re[j] = tr;
      final ti = im[i];
      im[i] = im[j];
      im[j] = ti;
    }
  }
  for (var size = 2; size <= n; size <<= 1) {
    final angle = -2 * math.pi / size;
    final wr = math.cos(angle);
    final wi = math.sin(angle);
    final half = size >> 1;
    for (var start = 0; start < n; start += size) {
      var cr = 1.0;
      var ci = 0.0;
      for (var k = 0; k < half; k++) {
        final a = start + k;
        final b = a + half;
        final tr = re[b] * cr - im[b] * ci;
        final ti = re[b] * ci + im[b] * cr;
        re[b] = re[a] - tr;
        im[b] = im[a] - ti;
        re[a] += tr;
        im[a] += ti;
        final ncr = cr * wr - ci * wi;
        ci = cr * wi + ci * wr;
        cr = ncr;
      }
    }
  }
}

double _hzToMel(double f) => 2595 * math.log(1 + f / 700) / math.ln10;
double _melToHz(double m) => 700 * (math.pow(10, m / 2595) - 1);

final List<List<double>> _melBank = () {
  final lo = _hzToMel(60);
  final hi = _hzToMel(_sr / 2);
  final bins = <int>[
    for (var i = 0; i < _nMel + 2; i++)
      ((_nfft + 1) * _melToHz(lo + (hi - lo) * i / (_nMel + 1)) / _sr).floor(),
  ];
  final bank = <List<double>>[];
  for (var m = 1; m <= _nMel; m++) {
    final row = List<double>.filled(_nfft ~/ 2 + 1, 0.0);
    final b0 = bins.elementAt(m - 1);
    final b1 = bins.elementAt(m);
    final b2 = bins.elementAt(m + 1);
    for (var k = b0; k < b1; k++) {
      row[k] = (k - b0) / (b1 - b0);
    }
    for (var k = b1; k < b2; k++) {
      row[k] = (b2 - k) / (b2 - b1);
    }
    bank.add(row);
  }
  return bank;
}();

final List<double> _hamming = [
  for (var i = 0; i < _win; i++) 0.54 - 0.46 * math.cos(2 * math.pi * i / (_win - 1)),
];

/// Empreinte des sons : 12 coefficients MFCC par tranche de 10 ms, moyenne retirée.
List<List<double>> apMfcc(List<double> x) {
  final feats = <List<double>>[];
  final re = List<double>.filled(_nfft, 0.0);
  final im = List<double>.filled(_nfft, 0.0);
  final power = List<double>.filled(_nfft ~/ 2 + 1, 0.0);
  final logMel = List<double>.filled(_nMel, 0.0);
  for (var s = 0; s + _win <= x.length; s += _hop) {
    for (var i = 0; i < _nfft; i++) {
      re[i] = i < _win ? x[s + i] * _hamming[i] : 0.0;
      im[i] = 0.0;
    }
    _fft(re, im);
    for (var k = 0; k < power.length; k++) {
      power[k] = (re[k] * re[k] + im[k] * im[k]) / _nfft;
    }
    for (var m = 0; m < _nMel; m++) {
      final row = _melBank[m];
      var sum = 0.0;
      for (var k = 0; k < power.length; k++) {
        sum += row[k] * power[k];
      }
      logMel[m] = math.log(math.max(sum, 1e-10));
    }
    final cep = <double>[];
    for (var n = 1; n < _nCep; n++) {
      var c = 0.0;
      for (var m = 0; m < _nMel; m++) {
        c += logMel[m] * math.cos(math.pi * n * (m + 0.5) / _nMel);
      }
      cep.add(c * math.sqrt(2 / _nMel));
    }
    feats.add(cep);
  }
  if (feats.isNotEmpty) {
    final d = feats.first.length;
    for (var i = 0; i < d; i++) {
      var mean = 0.0;
      for (final f in feats) {
        mean += f[i];
      }
      mean /= feats.length;
      for (final f in feats) {
        f[i] -= mean;
      }
    }
  }
  return feats;
}

/// Hauteur (Hz) par tranche de 10 ms ; 0 quand la tranche n'est pas voisée.
List<double> apPitch(List<double> x) {
  final e = _frameEnergyDb(x);
  if (e.isEmpty) {
    return const [];
  }
  final peak = e.reduce(math.max);
  final raw = List<double>.filled(e.length, 0.0);
  const half = _pitchWin - _lagMax;
  final seg = List<double>.filled(_pitchWin, 0.0);
  for (var f = 0; f < e.length; f++) {
    final s = f * _hop;
    if (s + _pitchWin > x.length || e[f] < peak - 20) {
      continue;
    }
    var mean = 0.0;
    for (var i = 0; i < _pitchWin; i++) {
      mean += x[s + i];
    }
    mean /= _pitchWin;
    for (var i = 0; i < _pitchWin; i++) {
      seg[i] = x[s + i] - mean;
    }
    var e0 = 0.0;
    for (var i = 0; i < half; i++) {
      e0 += seg[i] * seg[i];
    }
    var best = 0.0;
    var bestLag = 0;
    for (var lag = _lagMin; lag <= _lagMax; lag++) {
      var num = 0.0;
      var eL = 0.0;
      for (var i = 0; i < half; i++) {
        num += seg[i] * seg[i + lag];
        eL += seg[i + lag] * seg[i + lag];
      }
      final r = num / math.sqrt(e0 * eL + 1e-12);
      if (r > best) {
        best = r;
        bestLag = lag;
      }
    }
    if (best >= 0.6 && bestLag > 0) {
      raw[f] = _sr / bestLag;
    }
  }
  // Médiane glissante sur 5 tranches voisées.
  final smooth = List<double>.filled(raw.length, 0.0);
  for (var i = 0; i < raw.length; i++) {
    if (raw[i] == 0) {
      continue;
    }
    final window = <double>[
      for (var k = math.max(0, i - 2); k < math.min(raw.length, i + 3); k++)
        if (raw[k] > 0) raw[k],
    ]..sort();
    smooth[i] = window[window.length ~/ 2];
  }
  return smooth;
}

/// Courbe de hauteur en demi-tons autour de la médiane du locuteur
/// (null pour une tranche non voisée). Rend comparables voix graves et aiguës.
List<double?> apSemitones(List<double> f0) {
  final voiced = [for (final v in f0) if (v > 0) v]..sort();
  if (voiced.isEmpty) {
    return List<double?>.filled(f0.length, null);
  }
  final median = voiced[voiced.length ~/ 2];
  return [
    for (final v in f0)
      if (v <= 0)
        null
      else
        _foldOctave(12 * math.log(v / median) / math.ln2),
  ];
}

double _foldOctave(double st) {
  var value = st;
  while (value > 7) {
    value -= 12;
  }
  while (value < -7) {
    value += 12;
  }
  return value;
}

class _DtwResult {
  const _DtwResult(this.distance, this.path);

  final double distance;
  final List<List<int>> path;
}

_DtwResult _dtw(List<List<double>> a, List<List<double>> b) {
  final n = a.length;
  final m = b.length;
  final band = math.max((n - m).abs() + 10, (0.25 * math.max(n, m)).floor());
  const inf = double.infinity;
  final cost = List<List<double>>.generate(n + 1, (_) => List<double>.filled(m + 1, inf));
  cost[0][0] = 0;
  final dims = a.first.length;
  for (var i = 1; i <= n; i++) {
    final center = (i * m / n).floor();
    final jFrom = math.max(1, center - band);
    final jTo = math.min(m, center + band);
    for (var j = jFrom; j <= jTo; j++) {
      var d = 0.0;
      final ai = a[i - 1];
      final bj = b[j - 1];
      for (var k = 0; k < dims; k++) {
        final diff = ai[k] - bj[k];
        d += diff * diff;
      }
      final best = math.min(cost[i - 1][j], math.min(cost[i][j - 1], cost[i - 1][j - 1]));
      cost[i][j] = math.sqrt(d) + best;
    }
  }
  final path = <List<int>>[];
  var i = n;
  var j = m;
  while (i > 0 && j > 0) {
    path.add([i - 1, j - 1]);
    final diag = cost[i - 1][j - 1];
    final up = cost[i - 1][j];
    final left = cost[i][j - 1];
    if (diag <= up && diag <= left) {
      i--;
      j--;
    } else if (up <= left) {
      i--;
    } else {
      j--;
    }
  }
  final ordered = path.reversed.toList();
  return _DtwResult(cost[n][m] / math.max(1, ordered.length), ordered);
}

/// Seuils de comparaison (réglables depuis l'administration).
class ApCompareSettings {
  const ApCompareSettings({
    this.veryClose = 80,
    this.close = 60,
    this.mfccGood = 5,
    this.mfccBad = 14,
    this.calibrated = false,
  });

  final int veryClose;
  final int close;
  final double mfccGood;
  final double mfccBad;

  /// Vrai uniquement après calibrage sur de vraies voix de référence.
  final bool calibrated;

  Map<String, Object> toJson() => {
    'very_close': veryClose,
    'close': close,
    'mfcc_good': mfccGood,
    'mfcc_bad': mfccBad,
    'calibrated': calibrated,
  };

  factory ApCompareSettings.fromJson(Map<String, dynamic> json) => ApCompareSettings(
    veryClose: (json['very_close'] as num?)?.toInt() ?? 80,
    close: (json['close'] as num?)?.toInt() ?? 60,
    mfccGood: (json['mfcc_good'] as num?)?.toDouble() ?? 5,
    mfccBad: (json['mfcc_bad'] as num?)?.toDouble() ?? 14,
    calibrated: json['calibrated'] == true,
  );
}

enum ApVerdict { veryClose, close, retry }

/// Résultat d'une comparaison, prêt à être affiché.
class ApVoiceComparison {
  const ApVoiceComparison({
    required this.total,
    required this.sounds,
    required this.melody,
    required this.rhythm,
    required this.durationRatio,
    required this.verdict,
    required this.advice,
    required this.referenceContour,
    required this.learnerContour,
    required this.referenceEnvelope,
    required this.learnerEnvelope,
    required this.mfccDistance,
  });

  final int total;
  final int sounds;

  /// Null quand la voix n'est pas assez voisée pour suivre la mélodie.
  final int? melody;
  final int rhythm;
  final double durationRatio;
  final ApVerdict verdict;
  final List<String> advice;

  /// Courbes de hauteur (demi-tons) sur l'axe du temps de la référence.
  final List<double?> referenceContour;
  final List<double?> learnerContour;

  /// Enveloppes d'énergie (0 à 1), chacune sur son propre temps.
  final List<double> referenceEnvelope;
  final List<double> learnerEnvelope;
  final double mfccDistance;

  String get verdictLabel => switch (verdict) {
    ApVerdict.veryClose => 'Très proche',
    ApVerdict.close => 'Proche',
    ApVerdict.retry => 'À reprendre',
  };
}

/// Message pour [apCompareVoices] exécuté dans un isolat (`compute`).
class ApCompareRequest {
  const ApCompareRequest(this.reference, this.learner, this.settings);

  final Uint8List reference;
  final Uint8List learner;
  final ApCompareSettings settings;
}

/// Point d'entrée pour `compute(apCompareVoicesIsolate, request)`.
ApVoiceComparison? apCompareVoicesIsolate(ApCompareRequest request) {
  final reference = apDecodeWav(request.reference);
  final learner = apDecodeWav(request.learner);
  if (reference == null || learner == null) {
    return null;
  }
  return apCompareVoices(reference, learner, request.settings);
}

List<double> _envelope(List<double> x) {
  final e = _frameEnergyDb(x);
  if (e.isEmpty) {
    return const [];
  }
  final peak = e.reduce(math.max);
  return [for (final v in e) ((v - (peak - 50)) / 50).clamp(0.0, 1.0).toDouble()];
}

double _mean(Iterable<double> values) {
  var sum = 0.0;
  var n = 0;
  for (final v in values) {
    sum += v;
    n++;
  }
  return n == 0 ? 0 : sum / n;
}

/// Compare la voix de l'apprenant à la voix de référence.
ApVoiceComparison? apCompareVoices(ApPcm reference, ApPcm learner, ApCompareSettings settings) {
  final ref = apTrimSilence(reference.samples);
  final own = apTrimSilence(learner.samples);
  final fr = apMfcc(ref);
  final fl = apMfcc(own);
  if (fr.length < 5 || fl.length < 5) {
    return null;
  }
  final dtw = _dtw(fr, fl);
  final sr = apSemitones(apPitch(ref));
  final sl = apSemitones(apPitch(own));

  final diffs = <double>[];
  final refSum = List<double>.filled(fr.length, 0.0);
  final refCount = List<int>.filled(fr.length, 0);
  for (final pair in dtw.path) {
    final i = pair.first;
    final j = pair.last;
    if (i >= sr.length || j >= sl.length) {
      continue;
    }
    final a = sr.elementAt(i);
    final b = sl.elementAt(j);
    if (b != null) {
      refSum[i] += b;
      refCount[i]++;
    }
    if (a != null && b != null) {
      diffs.add((a - b).abs());
    }
  }
  final learnerOnRef = <double?>[
    for (var i = 0; i < fr.length; i++) refCount[i] == 0 ? null : refSum[i] / refCount[i],
  ];
  final referenceContour = <double?>[
    for (var i = 0; i < fr.length; i++) i < sr.length ? sr.elementAt(i) : null,
  ];

  final span = math.max(0.1, settings.mfccBad - settings.mfccGood);
  final sounds = (100 * (1 - (dtw.distance - settings.mfccGood) / span)).clamp(0.0, 100.0).toDouble();
  final melody = diffs.length >= 5 ? (100 * (1 - _mean(diffs) / 3)).clamp(0.0, 100.0).toDouble() : null;
  final ratio = own.length / ref.length;
  final double rhythm;
  if (ratio >= 0.7 && ratio <= 1.45) {
    rhythm = 100;
  } else {
    final gap = ratio < 0.7 ? 0.7 - ratio : ratio - 1.45;
    rhythm = (100 - 150 * gap).clamp(0.0, 100.0).toDouble();
  }
  final total = 0.55 * sounds + 0.35 * (melody ?? sounds) + 0.10 * rhythm;

  final verdict = total >= settings.veryClose
      ? ApVerdict.veryClose
      : total >= settings.close
      ? ApVerdict.close
      : ApVerdict.retry;

  final advice = <String>[];
  final learnerEnergy = _frameEnergyDb(own);
  final learnerPeak = learnerEnergy.isEmpty ? -100.0 : learnerEnergy.reduce(math.max);
  if (learnerPeak < -35) {
    advice.add('Parle plus fort ou rapproche le téléphone de ta bouche.');
  }
  if (melody != null && melody < settings.close) {
    advice.add(_melodyAdvice(referenceContour, learnerOnRef));
  }
  if (sounds < settings.close) {
    advice.add('Certains sons diffèrent : réécoute lentement la référence, puis répète.');
  }
  if (ratio < 0.7) {
    advice.add('Un peu trop rapide : prends le temps de chaque syllabe.');
  } else if (ratio > 1.45) {
    advice.add('Un peu trop lent : enchaîne les syllabes.');
  }
  if (advice.isEmpty) {
    advice.add(verdict == ApVerdict.veryClose
        ? 'Très bien : ta voix suit la référence.'
        : 'Presque : réécoute la référence et recommence une fois.');
  }

  return ApVoiceComparison(
    total: total.round(),
    sounds: sounds.round(),
    melody: melody?.round(),
    rhythm: rhythm.round(),
    durationRatio: ratio,
    verdict: verdict,
    advice: advice,
    referenceContour: referenceContour,
    learnerContour: learnerOnRef,
    referenceEnvelope: _envelope(ref),
    learnerEnvelope: _envelope(own),
    mfccDistance: dtw.distance,
  );
}

String _melodyAdvice(List<double?> reference, List<double?> learner) {
  double? slope(List<double?> contour) {
    final values = [for (final v in contour) ?v];
    if (values.length < 6) {
      return null;
    }
    final third = values.length ~/ 3;
    return _mean(values.sublist(values.length - third)) - _mean(values.sublist(0, third));
  }

  final a = slope(reference);
  final b = slope(learner);
  if (a != null && b != null) {
    if (a > 1 && b < a - 1.5) {
      return 'Mélodie : la voix doit monter, comme la courbe dorée.';
    }
    if (a < -1 && b > a + 1.5) {
      return 'Mélodie : la voix doit descendre, comme la courbe dorée.';
    }
    if (a.abs() <= 1 && b.abs() > 2) {
      return 'Mélodie : garde la voix plus égale, sans monter ni descendre.';
    }
  }
  return 'Mélodie : suis la courbe dorée, syllabe par syllabe.';
}

/// Contrôle qualité d'une prise de locuteur (avant envoi).
class ApTakeQuality {
  const ApTakeQuality({
    required this.durationMs,
    required this.peakDb,
    required this.rmsDb,
    required this.snrDb,
    required this.silenceRatio,
    required this.score,
    required this.problems,
  });

  final int durationMs;
  final double peakDb;
  final double rmsDb;
  final double snrDb;
  final double silenceRatio;
  final int score;
  final List<String> problems;

  bool get acceptable => problems.isEmpty;
}

/// Mesure la qualité d'une prise : saturation, niveau, bruit, silences, durée.
ApTakeQuality apMeasureTake(ApPcm pcm, {required int expectedSyllables}) {
  final x = pcm.samples;
  var peak = 0.0;
  var sumSq = 0.0;
  var clipped = 0;
  for (final v in x) {
    final a = v.abs();
    if (a > peak) {
      peak = a;
    }
    if (a > 0.985) {
      clipped++;
    }
    sumSq += v * v;
  }
  final peakDb = 20 * math.log(peak + 1e-9) / math.ln10;
  final rmsDb = 10 * math.log(sumSq / math.max(1, x.length) + 1e-10) / math.ln10;
  final e = _frameEnergyDb(x);
  var snr = 0.0;
  var silenceRatio = 1.0;
  if (e.isNotEmpty) {
    final sorted = List<double>.from(e)..sort();
    final floor = sorted[sorted.length ~/ 10];
    final top = sorted[(sorted.length * 9) ~/ 10];
    snr = top - floor;
    final threshold = math.max(sorted.last - 30, floor + 10);
    silenceRatio = e.where((v) => v <= threshold).length / e.length;
  }
  final speech = apTrimSilence(x);
  final durationMs = (x.length * 1000 / _sr).round();
  final speechSeconds = speech.length / _sr;
  final problems = <String>[];
  var score = 100.0;
  if (clipped > x.length * 0.001) {
    problems.add('Son saturé : éloigne un peu le téléphone.');
    score -= 35;
  }
  if (peakDb < -24) {
    problems.add('Niveau trop faible : parle plus près du micro.');
    score -= 30;
  }
  if (snr < 20) {
    problems.add('Trop de bruit de fond : cherche un endroit plus calme.');
    score -= 30;
  } else if (snr < 28) {
    score -= 10;
  }
  final minSeconds = math.max(0.25, expectedSyllables * 0.12);
  final maxSeconds = 1.2 + expectedSyllables * 0.6;
  if (speechSeconds < minSeconds) {
    problems.add('Prise trop courte : le texte semble coupé.');
    score -= 30;
  } else if (speechSeconds > maxSeconds) {
    problems.add('Prise trop longue : dis seulement le texte affiché.');
    score -= 20;
  }
  if (silenceRatio > 0.75) {
    problems.add('Trop de silence autour de la voix : enregistre plus près du début.');
    score -= 10;
  }
  return ApTakeQuality(
    durationMs: durationMs,
    peakDb: peakDb,
    rmsDb: rmsDb,
    snrDb: snr,
    silenceRatio: silenceRatio,
    score: score.clamp(0.0, 100.0).toDouble().round(),
    problems: problems,
  );
}

/// Nombre approximatif de syllabes (groupes de voyelles) d'un texte bariba.
int apSyllableCount(String text) {
  final vowels = RegExp('[aeiouɛɔàáâèéêìíîòóôùúûãẽĩõũ]+', caseSensitive: false);
  return math.max(1, vowels.allMatches(text).length);
}
