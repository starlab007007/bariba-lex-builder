/// DUNYA level-0 understanding: deterministic, bilingual, runs on any phone.
///
/// It turns a transcript into an intent DUNYA can act on without any language
/// model. A future local LLM (Gemma via LiteRT-LM) plugs in as a fallback
/// classifier behind the same [DunyaIntent] types.
library;

import 'dunya_fr_numbers.dart';

enum DunyaIntentKind {
  greeting,
  thanks,
  goodbye,
  help,
  time,
  date,
  translateToBariba,
  meaningOfBariba,
  remember,
  recall,
  alarm,
  timer,
  calculate,
  confirmYes,
  confirmNo,
  search,
  empty,
}

class DunyaIntent {
  const DunyaIntent(this.kind, {this.text = '', this.term, this.hour, this.minute, this.seconds, this.label, this.value, this.expression, this.tomorrow = false});

  final DunyaIntentKind kind;

  /// Normalised utterance the intent was read from.
  final String text;
  final String? term;
  final int? hour;
  final int? minute;
  final int? seconds;
  final String? label;
  final num? value;
  final String? expression;
  final bool tomorrow;

  @override
  String toString() =>
      'DunyaIntent($kind, term: $term, hour: $hour, minute: $minute, seconds: $seconds, label: $label, value: $value)';
}

final _baribaWord = RegExp(r'\b(ba+tɔ?nu(m)?|bariba|baatonu|batonu|baatonum|batonum|baatɔnum|bààtɔ̀nú)\b');

/// Lowercase, keep letters/digits/apostrophes/hyphens, digitise numbers.
String normalizeUtterance(String raw) {
  var s = raw.toLowerCase().replaceAll('’', "'").replaceAll('œ', 'oe');
  s = s.replaceAll(RegExp(r"[^\p{L}\p{M}\p{N}'\-:%+*/×\s]", unicode: true), ' ');
  s = s.replaceAll(RegExp(r'\s+'), ' ').trim();
  return digitizeFrench(s);
}

DunyaIntent parseDunyaIntent(String raw, {bool awaitingConfirmation = false}) {
  final t = normalizeUtterance(raw);
  if (t.isEmpty) return const DunyaIntent(DunyaIntentKind.empty);

  if (awaitingConfirmation) {
    if (RegExp(r"^(oui|ouais|ok|okay|d'accord|vas-y|vas y|confirme|je confirme|c'est bon|bien sûr|exactement|wura)\b").hasMatch(t)) {
      return DunyaIntent(DunyaIntentKind.confirmYes, text: t);
    }
    if (RegExp(r"^(non|annule|annuler|laisse|laisse tomber|pas maintenant|stop|arrête)\b").hasMatch(t)) {
      return DunyaIntent(DunyaIntentKind.confirmNo, text: t);
    }
  }

  // --- Translation FR -> Baatɔnum -----------------------------------------
  final translate = RegExp(r"^(.+?)\s+(?:en|dans)\s+(?:la\s+)?(?:langue\s+)?(?:des\s+)?(\S+)\s*$").firstMatch(t);
  if (translate != null && _baribaWord.hasMatch(translate.group(2)!)) {
    final term = _stripTranslationRequest(translate.group(1)!);
    if (term.isNotEmpty) {
      return DunyaIntent(DunyaIntentKind.translateToBariba, text: t, term: term);
    }
  }

  // --- Meaning of a Baatɔnum word ------------------------------------------
  final meaning = RegExp(
    r"^(?:que veut dire|qu'est-ce que veut dire|qu'est-ce que ça veut dire|ça veut dire quoi|que signifie|signification de|le sens de|explique(?:-moi)? le mot)\s+(.+?)(?:\s+en français)?$",
  ).firstMatch(t);
  if (meaning != null) {
    return DunyaIntent(DunyaIntentKind.meaningOfBariba, text: t, term: _cleanTerm(meaning.group(1)!));
  }
  final meaningSuffix = RegExp(r"^(.+?)\s+(?:ça veut dire quoi|veut dire quoi|ça signifie quoi)$").firstMatch(t);
  if (meaningSuffix != null) {
    return DunyaIntent(DunyaIntentKind.meaningOfBariba, text: t, term: _cleanTerm(meaningSuffix.group(1)!));
  }

  // --- Memory ----------------------------------------------------------------
  final remember = RegExp(
    r"^(?:note|notes|notez|prends note|retiens|retenez|mémorise|souviens-toi|rappelle-toi|garde en mémoire|enregistre)(?:\s+(?:bien|que|qu'|ceci|cela|ça))*\s*[:\-]?\s*(.+)$",
  ).firstMatch(t);
  if (remember != null && !t.startsWith('rappelle-moi')) {
    final content = remember.group(1)!.trim();
    if (content.length >= 3) {
      return DunyaIntent(DunyaIntentKind.remember, text: t, label: content);
    }
  }
  if (RegExp(r"(qu'est-ce que tu as retenu|qu'as-tu retenu|tu te souviens de quoi|mes notes|mes mémoires|lis mes notes|qu'est-ce que tu sais de moi)").hasMatch(t)) {
    return DunyaIntent(DunyaIntentKind.recall, text: t);
  }

  // --- Timer: "dans 10 minutes", "minuteur de 5 minutes" -----------------------
  final timer = RegExp(r"(?:dans|d'ici|minuteur(?: de)?|compte à rebours(?: de)?|chronomètre(?: de)?)\s+(\d+)\s*(secondes?|minutes?|min|heures?|h)\b").firstMatch(t);
  if (timer != null && RegExp(r"(rappelle|minuteur|réveille|préviens|alerte|compte à rebours|chronomètre|sonne)").hasMatch(t)) {
    final n = int.parse(timer.group(1)!);
    final unit = timer.group(2)!;
    final seconds = unit.startsWith('s')
        ? n
        : unit.startsWith('h')
            ? n * 3600
            : n * 60;
    return DunyaIntent(DunyaIntentKind.timer, text: t, seconds: seconds, label: _reminderLabel(t));
  }

  // --- Alarm: "rappelle-moi de traire les vaches à 17 h 30", "réveille-moi à 5h" ---
  final alarm = RegExp(r"(?:^|\s)(?:à|a|vers|pour)\s+(\d{1,2})\s*(?:h|heures?|:)\s*(\d{1,2})?(?:\s*(?:minutes?|min))?").firstMatch(t);
  if (alarm != null && RegExp(r"(rappelle|réveille|réveil|alarme|préviens|alerte|sonne)").hasMatch(t)) {
    var hour = int.parse(alarm.group(1)!);
    final minute = alarm.group(2) == null ? 0 : int.parse(alarm.group(2)!);
    if (RegExp(r"(de l'après-midi|du soir|ce soir)").hasMatch(t) && hour < 12) hour += 12;
    if (hour <= 23 && minute <= 59) {
      return DunyaIntent(
        DunyaIntentKind.alarm,
        text: t,
        hour: hour,
        minute: minute,
        label: _reminderLabel(t),
        tomorrow: t.contains('demain'),
      );
    }
  }
  final half = RegExp(r"(?:^|\s)(?:à|a)\s+(\d{1,2})\s*(?:h|heures?)\s+et demie").firstMatch(t);
  if (half != null && RegExp(r"(rappelle|réveille|alarme)").hasMatch(t)) {
    final hour = int.parse(half.group(1)!);
    if (hour <= 23) {
      return DunyaIntent(DunyaIntentKind.alarm, text: t, hour: hour, minute: 30, label: _reminderLabel(t), tomorrow: t.contains('demain'));
    }
  }

  // --- Calculation ---------------------------------------------------------------
  final calc = _parseCalculation(t);
  if (calc != null) return calc;

  // --- Small talk ----------------------------------------------------------------
  if (RegExp(r"^(bonjour|bonsoir|salut|coucou|hello|bonne journée|alaafia)\b").hasMatch(t)) {
    return DunyaIntent(DunyaIntentKind.greeting, text: t);
  }
  if (RegExp(r"^(merci|a kua|merci beaucoup)\b").hasMatch(t)) {
    return DunyaIntent(DunyaIntentKind.thanks, text: t);
  }
  if (RegExp(r"^(au revoir|à plus|à bientôt|bonne nuit|n kua weru)\b").hasMatch(t)) {
    return DunyaIntent(DunyaIntentKind.goodbye, text: t);
  }
  if (RegExp(r"(que sais-tu faire|qu'est-ce que tu (sais|peux) faire|tu sers à quoi|aide-moi|^aide$|comment ça marche)").hasMatch(t)) {
    return DunyaIntent(DunyaIntentKind.help, text: t);
  }
  if (RegExp(r"(quelle heure|l'heure qu'il est|il est quelle heure)").hasMatch(t)) {
    return DunyaIntent(DunyaIntentKind.time, text: t);
  }
  if (RegExp(r"(quel jour|quelle date|on est le combien|date d'aujourd'hui)").hasMatch(t)) {
    return DunyaIntent(DunyaIntentKind.date, text: t);
  }

  return DunyaIntent(DunyaIntentKind.search, text: t, term: t);
}

String _cleanTerm(String raw) {
  var s = raw.trim();
  s = s.replaceFirst(RegExp(r"^(?:le mot |l'expression |la phrase )"), '');
  s = s.replaceFirst(RegExp(r"^(?:le |la |les |l'|un |une |des |du |de la |de l'|d')"), '');
  s = s.replaceAll(RegExp(r'^["«\s]+|["»\s?]+$'), '');
  return s.trim();
}

String _stripTranslationRequest(String raw) {
  var s = raw.trim();
  s = s.replaceFirst(
    RegExp(
      r"^(?:comment (?:est-ce qu'on |on )?(?:dit-on|dit|dire|dis|appelle-t-on|appelle|on dit)|comment se dit|comment dire|traduis(?:-moi)?|traduire|tu peux traduire|ça se dit comment|c'est quoi|quel est le mot pour|donne-moi le mot|dis-moi)\s*",
    ),
    '',
  );
  return _cleanTerm(s);
}

String _cleanTerm(String raw) {
  var s = raw.trim();
  s = s.replaceFirst(RegExp(r"^(?:le mot |l'expression |la phrase )"), '');
  s = s.replaceFirst(RegExp(r"^(?:le |la |les |l'|un |une |des |du |de la |de l'|d')"), '');
  s = s.replaceAll(RegExp(r'^["«\s]+|["»\s?]+$'), '');
  return s.trim();
}

String _reminderLabel(String t) {
  final trigger = RegExp(r"(?:rappelle-moi|rappelle moi|préviens-moi|alerte-moi|réveille-moi|pense à me rappeler)\s*").firstMatch(t);
  if (trigger == null) return 'Rappel DUNYA';
  var label = t.substring(trigger.end);
  label = label.replaceAll(
    RegExp(r"(?:^|\s)(?:à|a|vers|pour|dans|d'ici)\s+\d+\s*(?:h|heures?|minutes?|min|secondes?|:)?\s*(?:\d{1,2})?(?:\s*(?:minutes?|min))?(?:\s+et demie)?"),
    ' ',
  );
  label = label.replaceAll(RegExp(r"\b(?:demain matin|demain soir|demain|ce soir|ce matin|de l'après-midi|du soir|du matin)\b"), ' ');
  label = label.replaceAll(RegExp(r'\s+'), ' ').trim();
  label = label.replaceFirst(RegExp(r"^(?:de |d'|qu'il faut |que je dois |pour )"), '').trim();
  if (label.isEmpty) return 'Rappel DUNYA';
  return label.length > 60 ? label.substring(0, 60) : label;
}

DunyaIntent? _parseCalculation(String t) {
  // "3 sacs à 15000" / "3 sacs de maïs à 15000 francs" -> 3 x 15000
  final unitPrice = RegExp(r"(\d+(?:[.,]\d+)?)\s+[\p{L}' ]{1,30}?\s+(?:à|a)\s+(\d+(?:[.,]\d+)?)(?:\s*(?:f|francs?|fcfa|cfa))?(?:\s+(?:le|la|l'|chacun|chacune|pièce|l'unité|par)\b.*)?$", unicode: true).firstMatch(t);
  final hasCalcWord = RegExp(r"(combien|calcule|calculer|total|ça fait|ça coûte|prix)").hasMatch(t);
  if (unitPrice != null && hasCalcWord) {
    final a = _num(unitPrice.group(1)!);
    final b = _num(unitPrice.group(2)!);
    return DunyaIntent(DunyaIntentKind.calculate, text: t, value: a * b, expression: '${formatFrenchNumber(a)} × ${formatFrenchNumber(b)}');
  }

  final op = RegExp(r"(-?\d+(?:[.,]\d+)?)\s*(plus|\+|moins|-|fois|x|×|\*|multiplié par|divisé par|sur|/)\s*(-?\d+(?:[.,]\d+)?)").firstMatch(t);
  if (op != null && (hasCalcWord || RegExp(r"^(\d|combien|calcule)").hasMatch(t))) {
    final a = _num(op.group(1)!);
    final b = _num(op.group(3)!);
    final o = op.group(2)!;
    num? result;
    String symbol;
    switch (o) {
      case 'plus' || '+':
        result = a + b;
        symbol = '+';
      case 'moins' || '-':
        result = a - b;
        symbol = '−';
      case 'fois' || 'x' || '×' || '*' || 'multiplié par':
        result = a * b;
        symbol = '×';
      default:
        result = b == 0 ? null : a / b;
        symbol = '÷';
    }
    if (result == null) return null;
    return DunyaIntent(DunyaIntentKind.calculate, text: t, value: result, expression: '${formatFrenchNumber(a)} $symbol ${formatFrenchNumber(b)}');
  }

  final percent = RegExp(r"(\d+(?:[.,]\d+)?)\s*(?:%|pour ?cent|pour 100)\s+de\s+(\d+(?:[.,]\d+)?)").firstMatch(t);
  if (percent != null) {
    final p = _num(percent.group(1)!);
    final base = _num(percent.group(2)!);
    return DunyaIntent(DunyaIntentKind.calculate, text: t, value: base * p / 100, expression: '${formatFrenchNumber(p)} % de ${formatFrenchNumber(base)}');
  }
  return null;
}

num _num(String s) => num.parse(s.replaceAll(',', '.'));
