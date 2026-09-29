import 'dart:convert';

import 'package:flutter/services.dart';

/// Contenu pédagogique de la Classe (N1 / N2) chargé depuis les assets.
/// Mêmes jeux de données que le web (`src/data/classeContent*.ts`).

List<String> _strings(dynamic v) =>
    v is List ? [for (final e in v) e.toString()] : const [];

class ClasseEvaluation {
  const ClasseEvaluation({
    required this.level,
    required this.id,
    required this.page,
    required this.title,
    required this.sections,
  });

  final String level;
  final int id;
  final int page;
  final String title;

  /// Titre de partie -> questions (ordre conservé).
  final List<MapEntry<String, List<String>>> sections;

  int get questionCount => sections.fold(0, (n, s) => n + s.value.length);

  factory ClasseEvaluation.fromJson(String level, Map<String, dynamic> j) {
    final raw = (j['sections'] as Map?) ?? const {};
    return ClasseEvaluation(
      level: level,
      id: (j['id'] as num).toInt(),
      page: (j['page'] as num?)?.toInt() ?? 0,
      title: (j['title'] as String?) ?? 'Évaluation',
      sections: [
        for (final e in raw.entries) MapEntry(e.key.toString(), _strings(e.value)),
      ],
    );
  }
}

class CalculExercise {
  const CalculExercise({required this.type, required this.operands, required this.expected, this.label});

  /// count | addition | subtraction | multiplication | division
  final String type;
  final List<num> operands;
  final num expected;
  final String? label;

  String get symbol => switch (type) {
    'addition' => '+',
    'subtraction' => '−',
    'multiplication' => '×',
    'division' => '÷',
    _ => '',
  };

  String get prompt => type == 'count'
      ? 'Écris ${_fmt(expected)} en Bàátɔ̀nú'
      : operands.map(_fmt).join(' $symbol ');

  factory CalculExercise.fromJson(Map<String, dynamic> j) => CalculExercise(
    type: (j['type'] as String?) ?? 'count',
    operands: [for (final o in (j['operands'] as List? ?? const [])) o as num],
    expected: (j['expected'] as num?) ?? 0,
    label: j['label'] as String?,
  );

  /// Vérifie la réponse : numérique (virgule ou point) ou, pour `count`, le mot Bariba attendu.
  bool check(String answer) {
    final a = answer.trim();
    if (a.isEmpty) {
      return false;
    }
    if (type == 'count' && label != null && !RegExp(r'^[\d\s.,]+$').hasMatch(a)) {
      return normalizeAnswer(a) == normalizeAnswer(label!);
    }
    final n = num.tryParse(a.replaceAll(RegExp(r'\s'), '').replaceAll(',', '.'));
    return n != null && (n - expected).abs() < 0.0005;
  }
}

String _fmt(num n) => n == n.roundToDouble() ? n.toInt().toString() : n.toString().replaceAll('.', ',');

class CalculLesson {
  const CalculLesson({
    required this.level,
    required this.id,
    required this.title,
    required this.text,
    required this.paragraphs,
    required this.sections,
    required this.exercises,
    required this.images,
  });

  final String level;
  final int id;
  final String title;
  final String text;
  final List<String> paragraphs;
  final List<MapEntry<String, List<String>>> sections;
  final List<CalculExercise> exercises;
  final List<String> images;
}

class GrammarQuiz {
  const GrammarQuiz({required this.question, required this.questionFr, required this.options, required this.correct, required this.explanation, required this.explanationFr});

  final String question;
  final String questionFr;
  final List<String> options;
  final int correct;
  final String explanation;
  final String explanationFr;
}

class GrammarSection {
  const GrammarSection({required this.id, required this.title, required this.titleFr, required this.emoji, required this.blocks, required this.quiz});

  final String id;
  final String title;
  final String titleFr;
  final String emoji;

  /// Blocs `rule` | `table` | `list` | `example` (Map brute, champs selon le type).
  final List<Map<String, dynamic>> blocks;
  final List<GrammarQuiz> quiz;
}

class ClasseField {
  const ClasseField({required this.key, required this.label, required this.labelFr, required this.placeholder, required this.long});

  final String key;
  final String label;
  final String labelFr;
  final String placeholder;
  final bool long;

  factory ClasseField.fromJson(Map<String, dynamic> j) => ClasseField(
    key: (j['key'] as String?) ?? '',
    label: (j['label'] as String?) ?? '',
    labelFr: (j['labelFr'] as String?) ?? '',
    placeholder: (j['placeholder'] as String?) ?? '',
    long: j['type'] == 'long',
  );
}

class TextProdType {
  const TextProdType({required this.id, required this.title, required this.titleFr, required this.emoji, required this.definition, required this.definitionFr, required this.characteristics, required this.characteristicsFr, required this.structure, required this.example, required this.exampleFr, required this.exercisePrompt, required this.exercisePromptFr});

  final String id;
  final String title;
  final String titleFr;
  final String emoji;
  final String definition;
  final String definitionFr;
  final List<String> characteristics;
  final List<String> characteristicsFr;
  final List<ClasseField> structure;
  final String example;
  final String exampleFr;
  final String exercisePrompt;
  final String exercisePromptFr;
}

class GestionDoc {
  const GestionDoc({required this.id, required this.title, required this.titleFr, required this.emoji, required this.definition, required this.definitionFr, required this.fields, required this.example, required this.questions});

  final String id;
  final String title;
  final String titleFr;
  final String emoji;
  final String definition;
  final String definitionFr;
  final List<ClasseField> fields;
  final Map<String, String> example;
  final List<({String ba, String fr})> questions;
}

class ClasseAlphabet {
  const ClasseAlphabet({required this.vowels, required this.consonants, required this.nasals, required this.tones});

  final List<String> vowels;
  final List<String> consonants;
  final List<String> nasals;
  final List<String> tones;
}

class ClasseContent {
  ClasseContent._({
    required this.evaluations,
    required this.calcul,
    required this.alphabet,
    required this.numbers,
    required this.grammar,
    required this.textProd,
    required this.gestion,
    required this.audioKeys,
  });

  final Map<String, List<ClasseEvaluation>> evaluations;
  final Map<String, List<CalculLesson>> calcul;
  final ClasseAlphabet alphabet;
  final Map<String, List<MapEntry<String, String>>> numbers;
  final List<GrammarSection> grammar;
  final List<TextProdType> textProd;
  final List<GestionDoc> gestion;

  /// Clés de contenu audio connues (registre `classeVoiceContent.json`).
  final Set<String> audioKeys;

  static Future<ClasseContent>? _cache;
  static Future<ClasseContent> load() => _cache ??= _read();

  /// Pour les tests : injecte un contenu déjà construit.
  static void debugSet(ClasseContent? c) => _cache = c == null ? null : Future.value(c);

  static Future<Map<String, dynamic>> _json(String name) async =>
      jsonDecode(await rootBundle.loadString('assets/data/$name')) as Map<String, dynamic>;

  static Future<ClasseContent> _read() async {
    final results = await Future.wait([
      _json('classe_content.json'),
      _json('classeContentN2.json'),
      _json('classeContentN2Grammar.json'),
      _json('classeContentN2TextProd.json'),
      _json('classeContentN2Gestion.json'),
      _json('classeVoiceContent.json').catchError((_) => <String, dynamic>{'items': []}),
    ]);
    return ClasseContent.fromJson(
      n1: results[0],
      n2: results[1],
      grammar: results[2],
      textProd: results[3],
      gestion: results[4],
      voice: results[5],
    );
  }

  factory ClasseContent.fromJson({
    required Map<String, dynamic> n1,
    required Map<String, dynamic> n2,
    required Map<String, dynamic> grammar,
    required Map<String, dynamic> textProd,
    required Map<String, dynamic> gestion,
    required Map<String, dynamic> voice,
  }) {
    List<ClasseEvaluation> evals(String level, dynamic raw) => [
      for (final e in (raw as List? ?? const [])) ClasseEvaluation.fromJson(level, e as Map<String, dynamic>),
    ];

    List<CalculLesson> calc(String level, dynamic lessons, dynamic exercises) {
      final ex = (exercises as Map?) ?? const {};
      return [
        for (final l in (lessons as List? ?? const []).cast<Map<String, dynamic>>())
          CalculLesson(
            level: level,
            id: (l['id'] as num).toInt(),
            title: (l['title'] as String?) ?? '',
            text: (l['text'] as String?) ?? '',
            paragraphs: _strings(l['paragraphs']),
            sections: [
              for (final e in ((l['sections'] as Map?) ?? const {}).entries) MapEntry(e.key.toString(), _strings(e.value)),
            ],
            exercises: [
              for (final e in (ex['${l['id']}'] as List? ?? const [])) CalculExercise.fromJson(e as Map<String, dynamic>),
            ],
            images: _strings(l['images']),
          ),
      ];
    }

    final alpha = (n1['BARIBA_ALPHABET'] as Map).cast<String, dynamic>();
    Map<String, String> strMap(dynamic m) => {for (final e in ((m as Map?) ?? const {}).entries) e.key.toString(): e.value.toString()};

    List<MapEntry<String, String>> nums(dynamic m) {
      final entries = strMap(m).entries.toList()..sort((a, b) => (int.tryParse(a.key) ?? 0).compareTo(int.tryParse(b.key) ?? 0));
      return entries;
    }

    return ClasseContent._(
      evaluations: {
        'N1': evals('N1', n1['CLASSE_EVALUATIONS']),
        'N2': evals('N2', n2['CLASSE_N2_EVALUATIONS']),
      },
      calcul: {
        'N1': calc('N1', n1['CALCUL_LESSONS'], n1['CALCUL_EXERCISES']),
        'N2': calc('N2', n2['CALCUL_N2_LESSONS'], n2['CALCUL_N2_EXERCISES']),
      },
      alphabet: ClasseAlphabet(
        vowels: _strings(alpha['vowels']),
        consonants: _strings(alpha['consonants']),
        nasals: _strings(alpha['nasalVowels']),
        tones: _strings(alpha['toneMarkers']),
      ),
      numbers: {'N1': nums(n1['BARIBA_NUMBERS']), 'N2': nums(n2['BARIBA_NUMBERS_N2'])},
      grammar: [
        for (final s in (grammar['GRAMMAR_N2_SECTIONS'] as List? ?? const []).cast<Map<String, dynamic>>())
          GrammarSection(
            id: s['id'] as String,
            title: (s['title'] as String?) ?? '',
            titleFr: (s['titleFr'] as String?) ?? '',
            emoji: (s['emoji'] as String?) ?? '📐',
            blocks: [for (final b in (s['content'] as List? ?? const [])) (b as Map).cast<String, dynamic>()],
            quiz: [
              for (final q in (s['quiz'] as List? ?? const []).cast<Map<String, dynamic>>())
                GrammarQuiz(
                  question: (q['question'] as String?) ?? '',
                  questionFr: (q['questionFr'] as String?) ?? '',
                  options: _strings(q['options']),
                  correct: (q['correct'] as num?)?.toInt() ?? 0,
                  explanation: (q['explanation'] as String?) ?? '',
                  explanationFr: (q['explanationFr'] as String?) ?? '',
                ),
            ],
          ),
      ],
      textProd: [
        for (final t in (textProd['TEXT_PRODUCTION_TYPES'] as List? ?? const []).cast<Map<String, dynamic>>())
          TextProdType(
            id: t['id'] as String,
            title: (t['title'] as String?) ?? '',
            titleFr: (t['titleFr'] as String?) ?? '',
            emoji: (t['emoji'] as String?) ?? '✍️',
            definition: (t['definition'] as String?) ?? '',
            definitionFr: (t['definitionFr'] as String?) ?? '',
            characteristics: _strings(t['characteristics']),
            characteristicsFr: _strings(t['characteristicsFr']),
            structure: [for (final f in (t['structure'] as List? ?? const [])) ClasseField.fromJson((f as Map).cast<String, dynamic>())],
            example: (t['example'] as String?) ?? '',
            exampleFr: (t['exampleFr'] as String?) ?? '',
            exercisePrompt: (t['exercisePrompt'] as String?) ?? '',
            exercisePromptFr: (t['exercisePromptFr'] as String?) ?? '',
          ),
      ],
      gestion: [
        for (final g in (gestion['GESTION_N2_DOCUMENTS'] as List? ?? const []).cast<Map<String, dynamic>>())
          GestionDoc(
            id: g['id'] as String,
            title: (g['title'] as String?) ?? '',
            titleFr: (g['titleFr'] as String?) ?? '',
            emoji: (g['emoji'] as String?) ?? '📄',
            definition: (g['definition'] as String?) ?? '',
            definitionFr: (g['definitionFr'] as String?) ?? '',
            fields: [for (final f in (g['fields'] as List? ?? const [])) ClasseField.fromJson((f as Map).cast<String, dynamic>())],
            example: g['example'] is Map ? strMap(g['example']) : const {},
            questions: [
              for (final q in (g['qaQuestions'] as List? ?? const []).cast<Map<String, dynamic>>())
                (ba: (q['ba'] as String?) ?? '', fr: (q['fr'] as String?) ?? ''),
            ],
          ),
      ],
      audioKeys: {
        for (final i in (voice['items'] as List? ?? const []))
          if (i is Map && i['content_key'] is String) i['content_key'] as String,
      },
    );
  }
}

/// Normalisation de comparaison (insensible casse / tons / ponctuation), miroir de `matchAnswer` (web),
/// en gardant ɛ ɔ ŋ distincts.
String normalizeAnswer(String s) {
  const fold = {
    'à': 'a', 'á': 'a', 'â': 'a', 'ä': 'a', 'ã': 'a', 'è': 'e', 'é': 'e', 'ê': 'e', 'ë': 'e', 'ẽ': 'e',
    'ì': 'i', 'í': 'i', 'î': 'i', 'ï': 'i', 'ĩ': 'i', 'ò': 'o', 'ó': 'o', 'ô': 'o', 'ö': 'o', 'õ': 'o',
    'ù': 'u', 'ú': 'u', 'û': 'u', 'ü': 'u', 'ũ': 'u', 'ǹ': 'n', 'ń': 'n', 'ñ': 'n', 'ç': 'c',
  };
  final buf = StringBuffer();
  for (final r in s.toLowerCase().runes) {
    if (r >= 0x0300 && r <= 0x036F) {
      continue;
    }
    final ch = String.fromCharCode(r);
    buf.write(fold[ch] ?? ch);
  }
  return buf
      .toString()
      .replaceAll(RegExp(r'[^a-z0-9ɔɛŋɲɓɗƴ\s]'), '')
      .replaceAll(RegExp(r'\s+'), ' ')
      .trim();
}

/// Vrai si [answer] correspond à l'une des réponses [accepted].
bool matchAnswer(String answer, List<String> accepted) {
  if (answer.trim().isEmpty || accepted.isEmpty) {
    return false;
  }
  final a = normalizeAnswer(answer);
  return accepted.any((x) => normalizeAnswer(x) == a);
}

/// Clés de contenu audio (schéma identique au web / à la table `classe_content_audios`).
abstract final class ClasseKeys {
  static String lesson(String level, int id, String part) => 'classe/$level/lang/$id/$part';
  static String lessonQuestion(String level, int id, String section, int i) => 'classe/$level/lang/$id/$section/$i';
  static String phonetic(String level, int id, String kind, int i) => 'classe/$level/lang/$id/phonetics/$kind/$i';
  static String evalTitle(String level, int id) => 'classe/$level/eval/$id/title';
  static String evalQuestion(String level, int id, int i) => 'classe/$level/eval/$id/q/$i';
  static String calcul(String level, int id, String part) => 'classe/$level/calcul/$id/$part';
  static String alphabet(String group, int i) => 'classe/N1/alphabet/0/$group/$i';
  static String syllable(String c, String v) => 'classe/N1/alphabet/0/syllables/$c$v';
  static String grammar(int n, String part) => 'classe/N2/grammaire/$n/$part';
  static String gestion(int n, String part) => 'classe/N2/gestion/$n/$part';
  static String textProd(int n, String part) => 'classe/N2/textprod/$n/$part';
}
