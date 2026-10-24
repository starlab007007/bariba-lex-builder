/// DUNYA level-0 brain: understands, remembers and acts without any LLM.
///
/// Comprendre -> Raisonner -> Se souvenir -> Agir, entirely on the phone.
library;

import 'package:flutter/services.dart';

import '../dunya_core.dart';
import '../dunya_local_store.dart';
import '../dunya_models.dart';
import 'dunya_fr_numbers.dart';
import 'dunya_voice_intents.dart';
import 'dunya_voice_phrases.dart';

/// One spoken segment, in one language.
class DunyaUtterance {
  const DunyaUtterance(this.text, this.lang);

  final String text;

  /// 'fr' or 'bba'
  final String lang;
}

class DunyaPendingAction {
  const DunyaPendingAction({required this.tool, required this.arguments, required this.summary, required this.runId});

  final String tool;
  final Map<String, Object?> arguments;
  final String summary;
  final String runId;
}

class DunyaVoiceReply {
  const DunyaVoiceReply({
    required this.display,
    required this.speech,
    this.sources = const [],
    this.pending,
    this.intent,
    this.language = 'fr',
  });

  /// Text shown on screen (French, with Baatɔnum terms).
  final String display;
  final List<DunyaUtterance> speech;
  final List<DunyaSource> sources;
  final DunyaPendingAction? pending;
  final DunyaIntentKind? intent;

  /// Detected language of the user's request.
  final String language;
}

class DunyaTranslation {
  const DunyaTranslation(this.bariba, this.french, this.score);

  final String bariba;
  final String french;
  final int score;
}

class DunyaVoiceBrain {
  DunyaVoiceBrain({
    required this.knowledge,
    DunyaLocalStore? store,
    MethodChannel? actions,
    DateTime Function()? clock,
  })  : _store = store ?? DunyaLocalStore.instance,
        _actions = actions ?? const MethodChannel('fitila/dunya_actions'),
        _clock = clock ?? DateTime.now;

  final DunyaAssetKnowledgeRepository knowledge;
  final DunyaLocalStore _store;
  final MethodChannel _actions;
  final DateTime Function() _clock;

  DunyaPendingAction? _pending;

  DunyaPendingAction? get pending => _pending;

  Set<String>? _baribaWords;

  Future<DunyaVoiceReply> respond(String transcript, DunyaReplyLanguage replyLanguage) async {
    await knowledge.initialize();
    final language = detectLanguage(transcript);
    final intent = language == 'bba' && _pending == null
        ? DunyaIntent(DunyaIntentKind.meaningOfBariba, text: transcript, term: transcript)
        : parseDunyaIntent(transcript, awaitingConfirmation: _pending != null);

    if (_pending != null && intent.kind != DunyaIntentKind.confirmYes && intent.kind != DunyaIntentKind.confirmNo) {
      // A new request replaces a pending, unconfirmed action.
      await _store.recordActionRun(
        runId: _pending!.runId,
        toolName: _pending!.tool,
        arguments: _pending!.arguments,
        status: 'abandoned',
      );
      _pending = null;
    }

    final reply = await _handle(intent, replyLanguage);
    return DunyaVoiceReply(
      display: reply.display,
      speech: reply.speech,
      sources: reply.sources,
      pending: reply.pending,
      intent: intent.kind,
      language: language,
    );
  }

  /// Confirmation by tap (same effect as saying "oui" / "non").
  Future<DunyaVoiceReply> confirm(bool yes, DunyaReplyLanguage replyLanguage) =>
      _handle(DunyaIntent(yes ? DunyaIntentKind.confirmYes : DunyaIntentKind.confirmNo), replyLanguage);

  // -------------------------------------------------------------------------

  Future<DunyaVoiceReply> _handle(DunyaIntent intent, DunyaReplyLanguage lang) async {
    switch (intent.kind) {
      case DunyaIntentKind.empty:
        return _say(DunyaPhrases.notUnderstood, lang);
      case DunyaIntentKind.greeting:
        return _say(DunyaPhrases.greeting, lang);
      case DunyaIntentKind.thanks:
        return _say(const DunyaPhrase('Avec plaisir.', 'A kua.'), lang);
      case DunyaIntentKind.goodbye:
        return _say(DunyaPhrases.goodbye, lang);
      case DunyaIntentKind.help:
        return _say(DunyaPhrases.help, lang);
      case DunyaIntentKind.time:
        final now = _clock();
        final m = now.minute;
        final timeText = 'Il est ${now.hour} heure${now.hour > 1 ? 's' : ''}${m == 0 ? '' : ' $m'}.';
        return _plain(timeText);
      case DunyaIntentKind.date:
        return _plain('Nous sommes le ${_frenchDate(_clock())}.');
      case DunyaIntentKind.translateToBariba:
        return _translate(intent.term ?? '', lang);
      case DunyaIntentKind.meaningOfBariba:
        return _meaning(intent.term ?? '', lang);
      case DunyaIntentKind.remember:
        final content = _capitalize(intent.label ?? '');
        await _store.saveMemory(content, provenance: 'user_voice');
        await _store.audit('dunya_memory_saved', {'source': 'voice'});
        return _say(DunyaPhrases.noted, lang, extraDisplay: '« $content »');
      case DunyaIntentKind.recall:
        final memories = await _store.loadMemories();
        if (memories.isEmpty) return _say(DunyaPhrases.nothingNoted, lang);
        final top = memories.take(3).toList();
        final recallText = 'Voici ce que j’ai retenu : ${top.join('. ')}.';
        return _plain(recallText);
      case DunyaIntentKind.alarm:
        return _proposeAlarm(intent, lang);
      case DunyaIntentKind.timer:
        return _proposeTimer(intent, lang);
      case DunyaIntentKind.calculate:
        final value = intent.value ?? 0;
        final spoken = formatFrenchNumber(value);
        return _plain('${intent.expression} = $spoken.', speak: 'Cela fait $spoken.');
      case DunyaIntentKind.confirmYes:
        return _execute(lang);
      case DunyaIntentKind.confirmNo:
        final pending = _pending;
        _pending = null;
        if (pending != null) {
          await _store.recordActionRun(
            runId: pending.runId,
            toolName: pending.tool,
            arguments: pending.arguments,
            status: 'refused',
          );
        }
        return _say(DunyaPhrases.cancelled, lang);
      case DunyaIntentKind.search:
        return _search(intent.text, lang);
    }
  }

  DunyaVoiceReply _say(DunyaPhrase phrase, DunyaReplyLanguage lang, {String? extraDisplay}) {
    final speech = <DunyaUtterance>[];
    final hasBa = phrase.ba != null && phrase.ba!.isNotEmpty;
    switch (lang) {
      case DunyaReplyLanguage.french:
        speech.add(DunyaUtterance(phrase.fr, 'fr'));
      case DunyaReplyLanguage.bariba:
        speech.add(hasBa ? DunyaUtterance(phrase.ba!, 'bba') : DunyaUtterance(phrase.fr, 'fr'));
      case DunyaReplyLanguage.both:
        if (hasBa) speech.add(DunyaUtterance(phrase.ba!, 'bba'));
        speech.add(DunyaUtterance(phrase.fr, 'fr'));
    }
    final display = [
      if (hasBa && lang != DunyaReplyLanguage.french) phrase.ba!,
      phrase.fr,
      ?extraDisplay,
    ].join('\n');
    return DunyaVoiceReply(display: display, speech: speech);
  }

  DunyaVoiceReply _plain(String text, {String? speak}) =>
      DunyaVoiceReply(display: text, speech: [DunyaUtterance(speak ?? text, 'fr')]);

  // --- Translation ------------------------------------------------------------

  Future<DunyaVoiceReply> _translate(String term, DunyaReplyLanguage lang) async {
    final matches = translateFrenchToBariba(term, knowledge.dictionaryEntries);
    if (matches.isEmpty) {
      return DunyaVoiceReply(
        display: 'Je n’ai pas trouvé « $term » dans le dictionnaire FITILA du téléphone.',
        speech: [DunyaUtterance('Je n’ai pas trouvé $term dans le dictionnaire du téléphone.', 'fr')],
      );
    }
    final best = matches.first;
    final others = matches.skip(1).take(2).map((e) => e.bariba).toList();
    final speech = <DunyaUtterance>[
      if (lang != DunyaReplyLanguage.bariba) DunyaUtterance('En baatɔnum, $term se dit :', 'fr'),
      DunyaUtterance(best.bariba, 'bba'),
      if (lang == DunyaReplyLanguage.both) DunyaUtterance(best.bariba, 'bba'),
    ];
    final display = StringBuffer('$term → ${best.bariba}');
    if (others.isNotEmpty) display.write('\nAutres mots proches : ${others.join(', ')}');
    return DunyaVoiceReply(
      display: display.toString(),
      speech: speech,
      sources: [
        for (final m in matches.take(3))
          DunyaSource(title: 'Dictionnaire FITILA · ${m.bariba}', text: '${m.bariba} — ${m.french}', kind: 'dictionary'),
      ],
    );
  }

  Future<DunyaVoiceReply> _meaning(String term, DunyaReplyLanguage lang) async {
    final matches = lookupBariba(term, knowledge.dictionaryEntries);
    if (matches.isEmpty) {
      return _search(term, lang);
    }
    final best = matches.first;
    final french = _firstClause(best.french);
    return DunyaVoiceReply(
      display: '${best.bariba} → $french',
      speech: [
        DunyaUtterance(best.bariba, 'bba'),
        DunyaUtterance('veut dire : $french.', 'fr'),
      ],
      sources: [
        for (final m in matches.take(3))
          DunyaSource(title: 'Dictionnaire FITILA · ${m.bariba}', text: '${m.bariba} — ${m.french}', kind: 'dictionary'),
      ],
    );
  }

  // --- Knowledge search ------------------------------------------------------------

  Future<DunyaVoiceReply> _search(String query, DunyaReplyLanguage lang) async {
    final sources = await knowledge.search(query: query, profileId: 'local-default', limit: 3);
    if (sources.isEmpty) return _say(DunyaPhrases.notFound, lang);
    final first = sources.first;
    final excerpt = _shortExcerpt(first.text);
    return DunyaVoiceReply(
      display: excerpt,
      speech: [DunyaUtterance('Voici ce que je trouve. $excerpt', 'fr')],
      sources: sources,
    );
  }

  // --- Actions (always confirmed) ------------------------------------------------

  Future<DunyaVoiceReply> _proposeAlarm(DunyaIntent intent, DunyaReplyLanguage lang) async {
    final hour = intent.hour!;
    final minute = intent.minute ?? 0;
    final label = intent.label ?? 'Rappel DUNYA';
    final when = '${intent.tomorrow ? 'demain ' : ''}à $hour h${minute == 0 ? '' : ' ${minute.toString().padLeft(2, '0')}'}';
    final summary = 'Rappel $when : $label';
    final args = {'hour': hour, 'minute': minute, 'message': label};
    final runId = await _store.recordActionRun(toolName: 'set_alarm', arguments: args, status: 'proposed');
    _pending = DunyaPendingAction(tool: 'set_alarm', arguments: args, summary: summary, runId: runId);
    final note = intent.tomorrow ? ' L’alarme sonnera à la prochaine occurrence de cette heure.' : '';
    return DunyaVoiceReply(
      display: '$summary\nVous confirmez ?$note',
      speech: [DunyaUtterance('Je pose un rappel $when, pour : $label. ${DunyaPhrases.confirmAsk.fr}', 'fr')],
      pending: _pending,
    );
  }

  Future<DunyaVoiceReply> _proposeTimer(DunyaIntent intent, DunyaReplyLanguage lang) async {
    final seconds = intent.seconds!;
    final label = intent.label ?? 'Rappel DUNYA';
    final duration = _frenchDuration(seconds);
    final summary = 'Minuteur de $duration : $label';
    final args = {'seconds': seconds, 'message': label};
    final runId = await _store.recordActionRun(toolName: 'set_timer', arguments: args, status: 'proposed');
    _pending = DunyaPendingAction(tool: 'set_timer', arguments: args, summary: summary, runId: runId);
    return DunyaVoiceReply(
      display: '$summary\nVous confirmez ?',
      speech: [DunyaUtterance('Je lance un minuteur de $duration, pour : $label. ${DunyaPhrases.confirmAsk.fr}', 'fr')],
      pending: _pending,
    );
  }

  Future<DunyaVoiceReply> _execute(DunyaReplyLanguage lang) async {
    final pending = _pending;
    _pending = null;
    if (pending == null) return _say(DunyaPhrases.notUnderstood, lang);
    Map<String, Object?> result;
    try {
      final raw = await _actions.invokeMethod<Map<Object?, Object?>>(
        pending.tool == 'set_alarm' ? 'setAlarm' : 'setTimer',
        pending.arguments,
      );
      result = {for (final e in (raw ?? const {}).entries) e.key.toString(): e.value};
    } on PlatformException catch (error) {
      result = {'ok': false, 'reason': error.message ?? error.code};
    } on MissingPluginException {
      result = {'ok': false, 'reason': 'unsupported_platform'};
    }
    final ok = result['ok'] == true;
    await _store.recordActionRun(
      runId: pending.runId,
      toolName: pending.tool,
      arguments: pending.arguments,
      status: ok ? 'executed' : 'failed',
      result: result,
    );
    await _store.audit('dunya_action', {'tool': pending.tool, 'ok': ok});
    if (!ok) return _say(DunyaPhrases.actionFailed, lang);
    final done = _say(DunyaPhrases.actionDone, lang);
    return DunyaVoiceReply(display: '${pending.summary}\n✓ ${done.display}', speech: done.speech);
  }

  // --- Language ----------------------------------------------------------------------

  /// 'bba' when the utterance is mostly Baatɔnum words, else 'fr'.
  String detectLanguage(String text) {
    final lower = text.toLowerCase();
    if (RegExp(r'[ɔɛ]').hasMatch(lower)) return 'bba';
    final words = lower.split(RegExp(r"[^\p{L}\p{M}']+", unicode: true)).where((w) => w.length > 1).toList();
    if (words.isEmpty) return 'fr';
    final bariba = _baribaWords ??= {
      for (final e in knowledge.dictionaryEntries) foldBariba(e['word'] ?? ''),
    };
    var ba = 0;
    var fr = 0;
    for (final w in words) {
      if (_frenchFunctionWords.contains(w)) {
        fr++;
      } else if (bariba.contains(foldBariba(w))) {
        ba++;
      }
    }
    return ba >= 2 && ba > fr * 2 ? 'bba' : 'fr';
  }
}

// ---------------------------------------------------------------------------
// Dictionary helpers (pure, unit-tested)
// ---------------------------------------------------------------------------

const _frenchFunctionWords = {
  'le', 'la', 'les', 'un', 'une', 'des', 'de', 'du', 'et', 'est', 'je', 'tu', 'il', 'elle', 'nous', 'vous',
  'ils', 'que', 'qui', 'quoi', 'comment', 'pour', 'dans', 'sur', 'avec', 'pas', 'ne', 'mon', 'ma', 'mes',
  'ce', 'ça', 'en', 'au', 'aux', 'moi', 'dit', 'dire', 'veut', 'quel', 'quelle', 'combien', 'rappelle',
};

const _foldMap = {
  'à': 'a', 'á': 'a', 'â': 'a', 'ã': 'a', 'ä': 'a', 'è': 'e', 'é': 'e', 'ê': 'e', 'ë': 'e', 'ẽ': 'e',
  'ì': 'i', 'í': 'i', 'î': 'i', 'ï': 'i', 'ĩ': 'i', 'ò': 'o', 'ó': 'o', 'ô': 'o', 'õ': 'o', 'ö': 'o',
  'ù': 'u', 'ú': 'u', 'û': 'u', 'ü': 'u', 'ũ': 'u', 'ǹ': 'n', 'ń': 'n', 'ḿ': 'm', 'ñ': 'n',
  // Spellings produced by the Omnilingual recogniser for Baatɔnum sounds.
  'ʋ': 'u', 'ɩ': 'i', 'ɪ': 'i', 'ʊ': 'u', 'ə': 'e', 'ɑ': 'a', 'ɐ': 'a', 'ɡ': 'g',
};

/// Letters only, tones and nasal marks removed: "Baatɔnum" -> "baatɔnum".
String foldBariba(String input) {
  final buf = StringBuffer();
  for (final rune in input.toLowerCase().runes) {
    final ch = String.fromCharCode(rune);
    if (rune >= 0x0300 && rune <= 0x036F) continue; // combining marks
    buf.write(_foldMap[ch] ?? ch);
  }
  return buf.toString().replaceAll(RegExp(r"[^a-zɔɛŋ' ]"), ' ').replaceAll(RegExp(r'\s+'), ' ').trim();
}

String _normFr(String s) => s
    .toLowerCase()
    .replaceAll('’', "'")
    .replaceAll(RegExp(r"[^\p{L}\p{M}0-9' -]", unicode: true), ' ')
    .replaceAll(RegExp(r'\s+'), ' ')
    .trim();

/// French term -> best Baatɔnum headwords, from the embedded dictionary.
List<DunyaTranslation> translateFrenchToBariba(String term, List<Map<String, String>> entries) {
  final q = _normFr(term);
  if (q.isEmpty) return const [];
  final ranked = <DunyaTranslation>[];
  final wordRe = RegExp('(^|[^a-zà-ÿœæɔɛ])${RegExp.escape(q)}(\$|[^a-zà-ÿœæɔɛ])');
  for (final e in entries) {
    final word = cleanHeadword(e['word'] ?? '');
    final def = (e['definition'] ?? '').trim();
    if (word.isEmpty || def.isEmpty) continue;
    final d = _normFr(def);
    final parts = def.toLowerCase().split(RegExp(r'[,;/]')).map(_normFr).toList();
    int score;
    if (d == q) {
      score = 100;
    } else if (parts.isNotEmpty && parts.first == q) {
      score = 90;
    } else if (parts.contains(q)) {
      score = 80;
    } else if (d.startsWith('$q ')) {
      score = 60;
    } else if (wordRe.hasMatch(d)) {
      score = 35;
    } else {
      continue;
    }
    final penalty = d.length ~/ 12;
    score -= penalty > 30 ? 30 : penalty;
    ranked.add(DunyaTranslation(word, def, score));
  }
  ranked.sort((a, b) => b.score.compareTo(a.score));
  final seen = <String>{};
  return [
    for (final r in ranked)
      if (seen.add(foldBariba(r.bariba))) r,
  ].take(5).toList(growable: false);
}

/// Dictionary headword without homonym numbers: "tem3" / "gbaaru (2)" -> "tem" / "gbaaru".
String cleanHeadword(String raw) => raw
    .replaceAll(RegExp(r'\s*\(\d+\)'), '')
    .replaceAll(RegExp(r'(?<=\p{L})\d+$', unicode: true), '')
    .replaceAll(RegExp(r'^[.\-]+'), '')
    .replaceAll(RegExp(r'\s+'), ' ')
    .trim();

/// Baatɔnum word or phrase -> French meanings (exact, then tone-insensitive).
List<DunyaTranslation> lookupBariba(String term, List<Map<String, String>> entries) {
  final exact = term.toLowerCase().trim();
  final folded = foldBariba(term);
  if (folded.isEmpty) return const [];
  final ranked = <DunyaTranslation>[];
  for (final e in entries) {
    final word = cleanHeadword(e['word'] ?? '');
    final def = (e['definition'] ?? '').trim();
    if (word.isEmpty || def.isEmpty) continue;
    final w = word.toLowerCase();
    if (w == exact) {
      ranked.add(DunyaTranslation(word, def, 100));
    } else if (foldBariba(word) == folded) {
      ranked.add(DunyaTranslation(word, def, 80));
    }
  }
  if (ranked.isEmpty && folded.length >= 4 && !folded.contains(' ')) {
    // Recogniser spelling drift: accept one edit on words of 4+ letters.
    for (final e in entries) {
      final word = cleanHeadword(e['word'] ?? '');
      final f = foldBariba(word);
      if ((f.length - folded.length).abs() <= 1 && _withinOneEdit(f, folded)) {
        ranked.add(DunyaTranslation(word, (e['definition'] ?? '').trim(), 60));
      }
    }
  }
  if (ranked.isEmpty && folded.contains(' ')) {
    // Phrase: look up each word, keep what we know.
    final whole = <DunyaTranslation>[];
    for (final e in entries) {
      final word = cleanHeadword(e['word'] ?? '');
      final f = foldBariba(word);
      if (f.contains(' ') && folded.contains(f)) {
        whole.add(DunyaTranslation(word, (e['definition'] ?? '').trim(), 70 + f.length));
      }
    }
    ranked.addAll(whole);
    for (final part in folded.split(' ')) {
      if (part.length < 2) continue;
      for (final e in entries) {
        final word = cleanHeadword(e['word'] ?? '');
        if (foldBariba(word) == part) {
          ranked.add(DunyaTranslation(word, (e['definition'] ?? '').trim(), 50));
          break;
        }
      }
    }
  }
  ranked.sort((a, b) => b.score.compareTo(a.score));
  return ranked;
}

bool _withinOneEdit(String a, String b) {
  if (a == b) return true;
  final la = a.length;
  final lb = b.length;
  if ((la - lb).abs() > 1) return false;
  var i = 0;
  var j = 0;
  var edits = 0;
  while (i < la && j < lb) {
    if (a.codeUnitAt(i) == b.codeUnitAt(j)) {
      i++;
      j++;
      continue;
    }
    if (++edits > 1) return false;
    if (la > lb) {
      i++;
    } else if (lb > la) {
      j++;
    } else {
      i++;
      j++;
    }
  }
  return edits + (la - i) + (lb - j) <= 1;
}

String _firstClause(String def) {
  final clean = def.replaceAll(RegExp(r'\s+'), ' ').trim();
  final cut = clean.split(RegExp(r'[;(]')).first.trim();
  return cut.isEmpty ? clean : cut;
}

String _shortExcerpt(String text) {
  final clean = text.replaceAll(RegExp(r'\s+'), ' ').trim();
  if (clean.length <= 220) return clean;
  final cut = clean.substring(0, 220);
  final dot = cut.lastIndexOf('. ');
  return dot > 80 ? cut.substring(0, dot + 1) : '$cut…';
}

String _capitalize(String s) => s.isEmpty ? s : s[0].toUpperCase() + s.substring(1);

String _frenchDuration(int seconds) {
  if (seconds % 3600 == 0) {
    final h = seconds ~/ 3600;
    return '$h heure${h > 1 ? 's' : ''}';
  }
  if (seconds % 60 == 0) {
    final m = seconds ~/ 60;
    return '$m minute${m > 1 ? 's' : ''}';
  }
  return '$seconds secondes';
}

String _frenchDate(DateTime d) {
  const days = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
  const months = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  return '${days[d.weekday - 1]} ${d.day} ${months[d.month - 1]} ${d.year}';
}
