import 'dart:convert';
import 'dart:math' as math;

import 'package:flutter/services.dart';

class FoncierSource {
  const FoncierSource({
    required this.id,
    required this.number,
    required this.content,
    required this.page,
    this.book,
  });

  final int id;
  final String number;
  final String content;
  final int page;
  final String? book;
}

class FoncierAnswer {
  const FoncierAnswer({
    required this.answer,
    required this.sources,
    required this.isFallback,
  });

  final String answer;
  final List<FoncierSource> sources;
  final bool isFallback;
}

class _IndexedArticle {
  const _IndexedArticle({required this.source, required this.tokens});

  final FoncierSource source;
  final List<String> tokens;
}

class FoncierRag {
  static const _fallback = 'Gari yini bweseru ku wáa tem saria tire teni sɔɔ.';
  static const _stopWords = <String>{
    'le',
    'la',
    'les',
    'un',
    'une',
    'des',
    'de',
    'du',
    'et',
    'ou',
    'est',
    'sont',
    'ce',
    'cette',
    'ces',
    'que',
    'qui',
    'quoi',
    'pour',
    'par',
    'sur',
    'dans',
    'avec',
    'sans',
    'au',
    'aux',
    'en',
    'à',
    'a',
    'se',
    'sa',
    'son',
    'il',
    'elle',
    'je',
    'tu',
    'nous',
    'vous',
    'ka',
    'ya',
    'ye',
    'yè',
    'yi',
    'ba',
    'wã',
    'wãa',
    'sɔɔ',
    'sɔ̃',
    'mi',
    'mɛ',
    'ta',
    'sere',
    'kun',
    'ko',
  };

  static List<_IndexedArticle>? _index;

  static List<String> _tokens(String text) {
    final cleaned = text.toLowerCase().replaceAll(
      RegExp(r'''[.,;:!?()\[\]{}"“”'’/\\\-]'''),
      ' ',
    );
    return cleaned
        .split(RegExp(r'\s+'))
        .where((value) => value.length >= 2 && !_stopWords.contains(value))
        .toList(growable: false);
  }

  static Future<List<_IndexedArticle>> _load() async {
    if (_index != null) return _index!;
    final raw = await rootBundle.loadString(
      'assets/data/foncier_bariba_corpus.json',
    );
    final decoded = jsonDecode(raw) as List<dynamic>;
    _index = decoded
        .map((value) {
          final row = value as Map<String, dynamic>;
          final source = FoncierSource(
            id: (row['id'] as num?)?.toInt() ?? 0,
            number: row['number']?.toString() ?? '',
            content: row['content']?.toString() ?? '',
            page: (row['page'] as num?)?.toInt() ?? 0,
            book: row['gariWiru']?.toString(),
          );
          return _IndexedArticle(
            source: source,
            tokens: _tokens(
              '${source.number} ${source.book ?? ''} ${row['bonu'] ?? ''} ${source.content}',
            ),
          );
        })
        .toList(growable: false);
    return _index!;
  }

  static Future<FoncierAnswer> answer(String query) async {
    final queryTokens = _tokens(query);
    if (queryTokens.isEmpty) {
      return const FoncierAnswer(
        answer: _fallback,
        sources: [],
        isFallback: true,
      );
    }
    final articleMention = RegExp(
      r'\b(?:saria|article|art\.?)[ ]*(\d{1,3})(?:se)?\b',
      caseSensitive: false,
    ).firstMatch(query)?.group(1);
    final index = await _load();
    final frequencies = <String, int>{};
    for (final term in queryTokens) {
      frequencies[term] = index
          .where((doc) => doc.tokens.contains(term))
          .length;
    }

    final ranked = <(_IndexedArticle, double)>[];
    for (final document in index) {
      var score = 0.0;
      for (final term in queryTokens) {
        final count = document.tokens.where((token) => token == term).length;
        if (count == 0) continue;
        final idf = math.log(1 + index.length / (1 + (frequencies[term] ?? 0)));
        score += count * idf;
      }
      if (articleMention != null &&
          (document.source.id.toString() == articleMention ||
              document.source.number.contains('${articleMention}se'))) {
        score += 100;
      }
      if (score > 0) ranked.add((document, score));
    }
    ranked.sort((a, b) => b.$2.compareTo(a.$2));
    if (ranked.isEmpty || ranked.first.$2 < 1.2) {
      return const FoncierAnswer(
        answer: _fallback,
        sources: [],
        isFallback: true,
      );
    }

    if (articleMention != null) {
      final exact = ranked
          .map((hit) => hit.$1.source)
          .where(
            (source) =>
                source.id.toString() == articleMention ||
                source.number.contains('${articleMention}se'),
          )
          .firstOrNull;
      if (exact != null) {
        return FoncierAnswer(
          answer: exact.content,
          sources: [exact],
          isFallback: false,
        );
      }
    }

    final selected = ranked.take(3).map((hit) => hit.$1.source).toList();
    final candidates = <(String, double, FoncierSource)>[];
    final querySet = queryTokens.toSet();
    for (final source in selected) {
      final sentences = source.content
          .split(RegExp(r'(?<=[.!?])\s+|\n+'))
          .map((value) => value.trim())
          .where((value) => value.length > 5);
      for (final sentence in sentences) {
        final words = _tokens(sentence);
        final matches = words.where(querySet.contains).length;
        if (matches > 0) {
          candidates.add((
            sentence,
            matches + matches / math.sqrt(words.length),
            source,
          ));
        }
      }
    }
    candidates.sort((a, b) => b.$2.compareTo(a.$2));
    final picked = candidates.take(3).toList();
    final answer = picked.isEmpty
        ? selected.first.content
        : picked.map((item) => item.$1).join('\n\n');
    final sourceIds = picked.map((item) => item.$3.id).toSet();
    final sources = picked.isEmpty
        ? [selected.first]
        : selected.where((source) => sourceIds.contains(source.id)).toList();
    return FoncierAnswer(answer: answer, sources: sources, isFallback: false);
  }
}
