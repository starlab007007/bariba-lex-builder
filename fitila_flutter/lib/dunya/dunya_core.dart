import 'dart:convert';

import 'package:flutter/services.dart';

import 'dunya_models.dart';

abstract interface class DunyaKnowledgeRepository {
  Future<void> initialize();

  Future<List<DunyaSource>> search({
    required String query,
    required String profileId,
    int limit = 8,
  });

  int get dictionaryCount;
}

abstract interface class DunyaInferenceEngine {
  String get modelId;
  DunyaModelProfile get profile;

  Future<void> loadModel(String modelPath);

  Stream<String> generate({
    required List<DunyaMessage> messages,
    required List<DunyaSource> context,
  });

  Future<void> cancel();

  Future<void> unloadModel();
}

class DunyaAssetKnowledgeRepository implements DunyaKnowledgeRepository {
  List<Map<String, String>> _dictionary = const [];
  List<DunyaSource> _learning = const [];
  bool _ready = false;

  @override
  int get dictionaryCount => _dictionary.length;

  @override
  Future<void> initialize() async {
    if (_ready) return;
    _dictionary = await _loadDictionary();
    _learning = await _loadLearningKnowledge();
    _ready = true;
  }

  @override
  Future<List<DunyaSource>> search({
    required String query,
    required String profileId,
    int limit = 8,
  }) async {
    await initialize();
    final clean = _norm(query);
    final terms = clean.split(' ').where((e) => e.length > 2).toList();
    final ranked = <({int score, DunyaSource source})>[];

    for (final row in _dictionary) {
      final word = row['word'] ?? '';
      final definition = row['definition'] ?? '';
      final combined = _norm('$word $definition');
      var score = combined.contains(clean) && clean.isNotEmpty ? 12 : 0;
      for (final term in terms) {
        if (combined.contains(term)) {
          score += 2;
        }
      }
      if (score > 0) {
        ranked.add((
          score: score,
          source: DunyaSource(
            title: 'Dictionnaire FITILA · $word',
            text: '$word — $definition',
            kind: 'dictionary',
          ),
        ));
      }
    }

    for (final source in _learning) {
      final combined = _norm('${source.title} ${source.text}');
      var score = combined.contains(clean) && clean.isNotEmpty ? 10 : 0;
      for (final term in terms) {
        if (combined.contains(term)) {
          score += 2;
        }
      }
      if (score > 0) ranked.add((score: score, source: source));
    }

    ranked.sort((a, b) => b.score.compareTo(a.score));
    return ranked.take(limit).map((e) => e.source).toList(growable: false);
  }

  Future<List<Map<String, String>>> _loadDictionary() async {
    final raw = await rootBundle.loadString('assets/data/dictionnaire_ameliore.json');
    final decoded = jsonDecode(raw);
    if (decoded is! List) return const [];
    return [
      for (final item in decoded)
        if (item is Map)
          {
            'word': (item['word'] ?? item['bariba'] ?? '').toString(),
            'definition': (item['definition'] ?? item['french'] ?? item['fr'] ?? '').toString(),
          },
    ].where((e) => (e['word'] ?? '').isNotEmpty && (e['definition'] ?? '').isNotEmpty).toList(growable: false);
  }

  Future<List<DunyaSource>> _loadLearningKnowledge() async {
    final result = <DunyaSource>[];
    for (final asset in const [
      'assets/data/apprendre_v2.json',
      'assets/data/scenes_v2.json',
    ]) {
      final raw = await rootBundle.loadString(asset);
      final decoded = jsonDecode(raw);

      void walk(dynamic value, String title) {
        if (value == null) return;
        if (value is String) {
          final text = value.trim();
          if (text.length >= 18) {
            result.add(DunyaSource(
              title: title,
              text: text,
              kind: asset.contains('scenes') ? 'scene' : 'learning',
            ));
          }
          return;
        }
        if (value is List) {
          for (final item in value) {
            walk(item, title);
          }
          return;
        }
        if (value is Map) {
          final localTitle =
              (value['title_fr'] ?? value['title'] ?? value['name'] ?? value['ba'] ?? title).toString();
          for (final entry in value.entries) {
            if (entry.key == 'id' || entry.key == 'icon' || entry.key == 'version') continue;
            walk(entry.value, localTitle);
          }
        }
      }

      walk(
        decoded,
        asset.contains('scenes') ? 'DUNYA Apprendre · Scènes' : 'DUNYA Apprendre',
      );
    }
    return result;
  }

  static String _norm(String input) => input
      .toLowerCase()
      .replaceAll(RegExp(r'[^a-z0-9à-ÿɔɛãĩũõñœ\s-]'), ' ')
      .replaceAll(RegExp(r'\s+'), ' ')
      .trim();
}

class DunyaFallbackInferenceEngine implements DunyaInferenceEngine {
  bool _cancelled = false;

  @override
  String get modelId => 'dunya-fallback';

  @override
  DunyaModelProfile get profile => DunyaModelProfile.fallback;

  @override
  Future<void> loadModel(String modelPath) async {}

  @override
  Stream<String> generate({
    required List<DunyaMessage> messages,
    required List<DunyaSource> context,
  }) async* {
    _cancelled = false;
    final answer = context.isEmpty
        ? 'Je n’ai pas trouvé de source locale suffisamment pertinente. DUNYA reste hors ligne et préfère ne pas inventer une réponse sans source.'
        : 'Voici ce que je trouve dans les ressources locales FITILA :\n\n${_excerpt(context.first.text)}';

    final words = answer.split(' ');
    for (var i = 0; i < words.length; i++) {
      if (_cancelled) return;
      yield i == 0 ? words[i] : ' ${words[i]}';
      await Future<void>.delayed(const Duration(milliseconds: 12));
    }
  }

  @override
  Future<void> cancel() async {
    _cancelled = true;
  }

  @override
  Future<void> unloadModel() async {}

  String _excerpt(String value) =>
      value.length > 560 ? '${value.substring(0, 560)}…' : value;
}

class DunyaIntelligenceRouter {
  DunyaIntelligenceRouter({
    required this.knowledge,
    required this.fallbackEngine,
  });

  final DunyaKnowledgeRepository knowledge;
  final DunyaInferenceEngine fallbackEngine;

  Future<({DunyaResponse metadata, Stream<String> stream})> route({
    required String query,
    required List<DunyaMessage> history,
    String profileId = 'local-default',
  }) async {
    final sources = await knowledge.search(
      query: query,
      profileId: profileId,
      limit: 4,
    );
    final metadata = DunyaResponse(
      answer: '',
      language: _detectLanguage(query),
      executionMode: 'offline',
      modelId: fallbackEngine.modelId,
      sources: sources,
      confidenceStatus: sources.isEmpty
          ? DunyaConfidenceStatus.unverified
          : DunyaConfidenceStatus.grounded,
      needsHumanReview: false,
      toolsUsed: const ['search_knowledge'],
      createdAt: DateTime.now(),
    );
    return (
      metadata: metadata,
      stream: fallbackEngine.generate(
        messages: history,
        context: sources,
      ),
    );
  }

  String _detectLanguage(String query) {
    final q = query.toLowerCase();
    if (q.contains('ɔ') || q.contains('ɛ') || q.contains('ã') || q.contains('ĩ')) {
      return 'bba';
    }
    return 'fr';
  }
}
