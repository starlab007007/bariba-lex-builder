/// French spoken numbers -> digits, so that "trois sacs à quinze mille"
/// becomes "3 sacs à 15000". Speech recognisers often write numbers as words.
library;

const Map<String, int> _units = {
  'zéro': 0,
  'zero': 0,
  'un': 1,
  'une': 1,
  'deux': 2,
  'trois': 3,
  'quatre': 4,
  'cinq': 5,
  'six': 6,
  'sept': 7,
  'huit': 8,
  'neuf': 9,
  'dix': 10,
  'onze': 11,
  'douze': 12,
  'treize': 13,
  'quatorze': 14,
  'quinze': 15,
  'seize': 16,
  'vingt': 20,
  'vingts': 20,
  'trente': 30,
  'quarante': 40,
  'cinquante': 50,
  'soixante': 60,
  'septante': 70,
  'huitante': 80,
  'octante': 80,
  'nonante': 90,
};

const Set<String> _multipliers = {'cent', 'cents', 'mille', 'milles', 'million', 'millions', 'milliard', 'milliards'};

bool _isNumberWord(String w) => _units.containsKey(w) || _multipliers.contains(w);

/// Value of a run of number words (already split on spaces/hyphens).
int? parseFrenchNumberWords(List<String> words) {
  if (words.isEmpty) return null;
  var total = 0;
  var current = 0;
  var seen = false;
  for (var i = 0; i < words.length; i++) {
    final w = words[i];
    if (w == 'et') continue;
    if (_units.containsKey(w)) {
      final v = _units[w]!;
      if ((w == 'vingt' || w == 'vingts') && current % 100 == 4) {
        current = current - 4 + 80; // quatre-vingt(s)
      } else {
        current += v;
      }
      seen = true;
    } else if (w == 'cent' || w == 'cents') {
      final hundreds = current % 100;
      current = current - hundreds + (hundreds == 0 ? 1 : hundreds) * 100;
      seen = true;
    } else if (w == 'mille' || w == 'milles') {
      total += (current == 0 ? 1 : current) * 1000;
      current = 0;
      seen = true;
    } else if (w == 'million' || w == 'millions') {
      total += (current == 0 ? 1 : current) * 1000000;
      current = 0;
      seen = true;
    } else if (w == 'milliard' || w == 'milliards') {
      total += (current == 0 ? 1 : current) * 1000000000;
      current = 0;
      seen = true;
    } else {
      return null;
    }
  }
  return seen ? total + current : null;
}

/// Replace every run of French number words by its digits, and join digit
/// groups written with spaces ("15 000" -> "15000").
String digitizeFrench(String input) {
  final tokens = input.split(RegExp(r'(\s+)'));
  final out = <String>[];
  final run = <String>[];

  void flush() {
    if (run.isEmpty) return;
    final parts = <String>[
      for (final t in run) ...t.split('-').where((e) => e.isNotEmpty),
    ];
    // "un"/"une" alone is usually an article ("une vache"), keep it.
    final value = (parts.length == 1 && (parts.first == 'un' || parts.first == 'une'))
        ? null
        : parseFrenchNumberWords(parts);
    out.add(value?.toString() ?? run.join(' '));
    run.clear();
  }

  for (final token in tokens) {
    final lower = token.toLowerCase();
    final pieces = lower.split('-').where((e) => e.isNotEmpty).toList();
    final numeric = pieces.isNotEmpty && pieces.every((p) => _isNumberWord(p) || p == 'et');
    final isEt = lower == 'et';
    if (numeric && !(isEt && run.isEmpty)) {
      run.add(lower);
    } else {
      // "et" closing a run ("vingt et") is kept inside, otherwise flush.
      if (run.isNotEmpty && run.last == 'et') {
        run.removeLast();
        flush();
        out.add('et');
      } else {
        flush();
      }
      out.add(token);
    }
  }
  if (run.isNotEmpty && run.last == 'et') {
    run.removeLast();
    flush();
    out.add('et');
  } else {
    flush();
  }
  return out
      .join(' ')
      .replaceAllMapped(RegExp(r'(\d)[\s  .](\d{3})\b'), (m) => '${m[1]}${m[2]}')
      .replaceAllMapped(RegExp(r'(\d)[\s  .](\d{3})\b'), (m) => '${m[1]}${m[2]}')
      .replaceAll(RegExp(r'\s+'), ' ')
      .trim();
}

/// Spoken form of an integer for French TTS readability ("15 000").
String formatFrenchNumber(num value) {
  final isInt = value == value.roundToDouble();
  final text = isInt ? value.round().toString() : value.toStringAsFixed(2).replaceAll('.', ',');
  final intPart = text.split(',').first;
  final negative = intPart.startsWith('-');
  final digits = negative ? intPart.substring(1) : intPart;
  final buf = StringBuffer();
  for (var i = 0; i < digits.length; i++) {
    if (i > 0 && (digits.length - i) % 3 == 0) buf.write(' ');
    buf.write(digits[i]);
  }
  final decimals = text.contains(',') ? ',${text.split(',').last}' : '';
  return '${negative ? '-' : ''}$buf$decimals';
}
