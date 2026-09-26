import 'dart:convert';

import 'package:flutter/services.dart';

/// Contenu hors-ligne du module Apprendre (Mɛɛribu), chargé depuis
/// `assets/data/apprendre_v2.json`.
///
/// Toutes les formes bariba proviennent du dictionnaire bariba-français
/// (page citée dans [ApExample.src]) ; une forme non vérifiée porte un statut
/// différent de `atteste`.
class ApprendreContent {
  const ApprendreContent({
    required this.version,
    required this.titleBa,
    required this.titleFr,
    required this.profiles,
    required this.foundations,
    required this.themes,
    required this.cards,
    required this.scenes,
    required this.proverbs,
  });

  static const assetPath = 'assets/data/apprendre_v2.json';

  final String version;
  final String titleBa;
  final String titleFr;
  final List<ApProfile> profiles;
  final List<ApFoundation> foundations;
  final List<ApTheme> themes;
  final Map<String, ApCard> cards;
  final List<ApScene> scenes;
  final List<ApProverb> proverbs;

  static Future<ApprendreContent> load({AssetBundle? bundle}) async {
    final raw = await (bundle ?? rootBundle).loadString(assetPath);
    return ApprendreContent.fromJson(jsonDecode(raw) as Map<String, dynamic>);
  }

  factory ApprendreContent.fromJson(Map<String, dynamic> json) {
    final cardList = _list(json['cards']).map(ApCard.fromJson).toList();
    return ApprendreContent(
      version: _str(json['version']),
      titleBa: _str(json['title_ba']),
      titleFr: _str(json['title_fr']),
      profiles: _list(json['profiles']).map(ApProfile.fromJson).toList(),
      foundations: _list(json['foundations']).map(ApFoundation.fromJson).toList()
        ..sort((a, b) => a.order.compareTo(b.order)),
      themes: _list(json['themes']).map(ApTheme.fromJson).toList(),
      cards: {for (final card in cardList) card.id: card},
      scenes: _list(json['scenes']).map(ApScene.fromJson).toList(),
      proverbs: _list(json['proverbs']).map(ApProverb.fromJson).toList(),
    );
  }

  List<ApCard> cardsOf(ApTheme theme) {
    final result = <ApCard>[];
    for (final id in theme.cardIds) {
      final card = cards[id];
      if (card != null) {
        result.add(card);
      }
    }
    return result;
  }

  ApTheme? themeById(String id) {
    for (final theme in themes) {
      if (theme.id == id) {
        return theme;
      }
    }
    return null;
  }

  ApFoundation? foundationById(String id) {
    for (final unit in foundations) {
      if (unit.id == id) {
        return unit;
      }
    }
    return null;
  }
}

class ApProfile {
  const ApProfile({
    required this.id,
    required this.title,
    required this.line,
    required this.icon,
  });

  final String id;
  final String title;
  final String line;
  final String icon;

  factory ApProfile.fromJson(Map<String, dynamic> json) => ApProfile(
    id: _str(json['id']),
    title: _str(json['title']),
    line: _str(json['line']),
    icon: _str(json['icon']),
  );
}

class ApExample {
  const ApExample({
    required this.ba,
    required this.fr,
    this.src = '',
    this.ref,
    this.note,
    this.status = 'atteste',
  });

  final String ba;
  final String fr;
  final String src;
  final String? ref;
  final String? note;
  final String status;

  bool get verified => status == 'atteste';

  factory ApExample.fromJson(Map<String, dynamic> json) => ApExample(
    ba: _str(json['ba']),
    fr: _str(json['fr']),
    src: _str(json['src']),
    ref: json['ref'] as String?,
    note: json['note'] as String?,
    status: _str(json['status'], fallback: 'atteste'),
  );
}

class ApPair {
  const ApPair({required this.a, required this.b});

  final ApExample a;
  final ApExample b;

  factory ApPair.fromJson(Map<String, dynamic> json) => ApPair(
    a: ApExample.fromJson(_map(json['a'])),
    b: ApExample.fromJson(_map(json['b'])),
  );
}

class ApSection {
  const ApSection({
    required this.type,
    this.title = '',
    this.body = '',
    this.items = const [],
    this.pairs = const [],
    this.columns = const [],
    this.rows = const [],
    this.rowStatus = const [],
    this.orderWords = const [],
    this.orderRoles = const [],
    this.orderFr = '',
    this.src = '',
  });

  /// explain · examples · culture · table · pairs · order · tip
  final String type;
  final String title;
  final String body;
  final List<ApExample> items;
  final List<ApPair> pairs;
  final List<String> columns;
  final List<List<String>> rows;
  final List<String> rowStatus;
  final List<String> orderWords;
  final List<String> orderRoles;
  final String orderFr;
  final String src;

  factory ApSection.fromJson(Map<String, dynamic> json) {
    final type = _str(json['type']);
    final rawItems = _list(json['items']);
    return ApSection(
      type: type,
      title: _str(json['title']),
      body: _str(json['body']),
      items: type == 'pairs'
          ? const []
          : rawItems.map(ApExample.fromJson).toList(),
      pairs: type == 'pairs'
          ? rawItems.map(ApPair.fromJson).toList()
          : const [],
      columns: _strings(json['columns']),
      rows: (json['rows'] as List? ?? const [])
          .whereType<List>()
          .map((row) => row.map((cell) => cell.toString()).toList())
          .toList(),
      rowStatus: _strings(json['row_status']),
      orderWords: _strings(json['ba']),
      orderRoles: _strings(json['roles']),
      orderFr: _str(json['fr']),
      src: _str(json['src']),
    );
  }
}

class ApQuiz {
  const ApQuiz({
    required this.type,
    required this.prompt,
    required this.answer,
    required this.options,
    required this.answerOrder,
    required this.explain,
    required this.src,
  });

  /// mcq · order
  final String type;
  final String prompt;
  final String answer;
  final List<String> options;
  final List<String> answerOrder;
  final String explain;
  final String src;

  factory ApQuiz.fromJson(Map<String, dynamic> json) {
    final rawAnswer = json['answer'];
    return ApQuiz(
      type: _str(json['type'], fallback: 'mcq'),
      prompt: _str(json['prompt']),
      answer: rawAnswer is List ? rawAnswer.join(' ') : _str(rawAnswer),
      options: _strings(json['options']),
      answerOrder: rawAnswer is List
          ? rawAnswer.map((e) => e.toString()).toList()
          : const [],
      explain: _str(json['explain']),
      src: _str(json['src']),
    );
  }
}

class ApFoundation {
  const ApFoundation({
    required this.id,
    required this.order,
    required this.icon,
    required this.minutes,
    required this.titleFr,
    required this.titleBa,
    required this.summary,
    required this.sections,
    required this.quiz,
  });

  final String id;
  final int order;
  final String icon;
  final int minutes;
  final String titleFr;
  final String? titleBa;
  final String summary;
  final List<ApSection> sections;
  final List<ApQuiz> quiz;

  factory ApFoundation.fromJson(Map<String, dynamic> json) => ApFoundation(
    id: _str(json['id']),
    order: (json['order'] as num?)?.toInt() ?? 0,
    icon: _str(json['icon']),
    minutes: (json['minutes'] as num?)?.toInt() ?? 10,
    titleFr: _str(json['title_fr']),
    titleBa: json['title_ba'] as String?,
    summary: _str(json['summary']),
    sections: _list(json['sections']).map(ApSection.fromJson).toList(),
    quiz: _list(json['quiz']).map(ApQuiz.fromJson).toList(),
  );
}

class ApCard {
  const ApCard({
    required this.id,
    required this.ba,
    required this.fr,
    required this.pos,
    required this.page,
    this.transcription,
    this.nounClass,
    this.plural,
    this.focus,
    this.conjugation = const {},
    this.exampleBa,
    this.exampleFr,
    this.cloze = false,
    this.status = 'atteste',
    this.frequency = 0,
    this.themeIds = const [],
  });

  final String id;
  final String ba;
  final String fr;
  final String pos;
  final int page;
  final String? transcription;
  final String? nounClass;
  final String? plural;
  final String? focus;

  /// Clés : inacc, acc, neg, imp.
  final Map<String, String> conjugation;
  final String? exampleBa;
  final String? exampleFr;
  final bool cloze;
  final String status;
  final int frequency;
  final List<String> themeIds;

  bool get verified => status == 'atteste';
  bool get isVerb => pos.startsWith('Verbe') || pos == 'Locution verbale';
  bool get hasExample => (exampleBa ?? '').isNotEmpty && (exampleFr ?? '').isNotEmpty;
  String get source => 'Dictionnaire, p. $page';

  factory ApCard.fromJson(Map<String, dynamic> json) => ApCard(
    id: _str(json['id']),
    ba: _str(json['ba']),
    fr: _str(json['fr']),
    pos: _str(json['pos']),
    page: (json['p'] as num?)?.toInt() ?? 0,
    transcription: json['tr'] as String?,
    nounClass: json['cls'] as String?,
    plural: json['pl'] as String?,
    focus: json['foc'] as String?,
    conjugation: _map(json['conj']).map(
      (key, value) => MapEntry(key, value.toString()),
    ),
    exampleBa: json['ex_ba'] as String?,
    exampleFr: json['ex_fr'] as String?,
    cloze: json['cloze'] == true,
    status: _str(json['st'], fallback: 'atteste'),
    frequency: (json['f'] as num?)?.toInt() ?? 0,
    themeIds: _strings(json['th']),
  );
}

class ApTheme {
  const ApTheme({
    required this.id,
    required this.nameFr,
    required this.icon,
    required this.color,
    required this.count,
    required this.cardIds,
  });

  final String id;
  final String nameFr;
  final String icon;
  final String color;
  final int count;
  final List<String> cardIds;

  /// Couleur ARGB (0xFFRRGGBB) du thème.
  int get argb {
    final hex = color.replaceAll('#', '');
    return int.tryParse('FF$hex', radix: 16) ?? 0xFFC99530;
  }

  factory ApTheme.fromJson(Map<String, dynamic> json) => ApTheme(
    id: _str(json['id']),
    nameFr: _str(json['name_fr']),
    icon: _str(json['icon']),
    color: _str(json['color'], fallback: '#C99530'),
    count: (json['count'] as num?)?.toInt() ?? 0,
    cardIds: _strings(json['cards']),
  );
}

class ApSceneLine {
  const ApSceneLine({
    required this.who,
    required this.ba,
    required this.fr,
    required this.src,
  });

  /// guide · you
  final String who;
  final String ba;
  final String fr;
  final String src;

  bool get isLearner => who == 'you';

  factory ApSceneLine.fromJson(Map<String, dynamic> json) => ApSceneLine(
    who: _str(json['who']),
    ba: _str(json['ba']),
    fr: _str(json['fr']),
    src: _str(json['src']),
  );
}

class ApScene {
  const ApScene({
    required this.id,
    required this.title,
    required this.place,
    required this.icon,
    required this.culture,
    required this.lines,
  });

  final String id;
  final String title;
  final String place;
  final String icon;
  final String culture;
  final List<ApSceneLine> lines;

  factory ApScene.fromJson(Map<String, dynamic> json) => ApScene(
    id: _str(json['id']),
    title: _str(json['title']),
    place: _str(json['place']),
    icon: _str(json['icon']),
    culture: _str(json['culture']),
    lines: _list(json['lines']).map(ApSceneLine.fromJson).toList(),
  );
}

class ApProverb {
  const ApProverb({required this.ba, required this.fr, required this.src});

  final String ba;
  final String fr;
  final String src;

  factory ApProverb.fromJson(Map<String, dynamic> json) => ApProverb(
    ba: _str(json['ba']),
    fr: _str(json['fr']),
    src: _str(json['src']),
  );
}

String _str(Object? value, {String fallback = ''}) {
  if (value == null) {
    return fallback;
  }
  final text = value.toString();
  return text.isEmpty ? fallback : text;
}

List<String> _strings(Object? value) {
  if (value is! List) {
    return const [];
  }
  return value.map((e) => e.toString()).toList();
}

List<Map<String, dynamic>> _list(Object? value) {
  if (value is! List) {
    return const [];
  }
  return value.whereType<Map>().map((e) => e.cast<String, dynamic>()).toList();
}

Map<String, dynamic> _map(Object? value) {
  if (value is Map) {
    return value.cast<String, dynamic>();
  }
  return const {};
}
