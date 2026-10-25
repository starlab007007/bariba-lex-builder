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
    'quel',
    'quelle',
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
    'ses',
    'mon',
    'ma',
    'mes',
    'ton',
    'ta',
    'tes',
    'il',
    'elle',
    'ils',
    'elles',
    'je',
    'tu',
    'nous',
    'vous',
    'on',
    'y',
    'ne',
    'pas',
    'plus',
    'être',
    'avoir',
    'faire',
    'dit',
    'dire',
    'ka',
    'ya',
    'ye',
    'yè',
    'yi',
    'yì',
    'ba',
    'bà',
    'bù',
    'bu',
    'wã',
    'wãa',
    'sɔɔ',
    'sɔ̃',
    'mi',
    'mɛ',
    'mɛ̃',
    'tè',
    'tì',
    'sere',
    'ǹ',
    'kun',
    'tera',
    'yera',
    'ko',
    'koo',
    'mɔ',
    'mɔ̀',
    'sãa',
    'sãawa',
    'niya',
    'nu',
    'nì',
    'sin',
    'si',
    'sì',
    'su',
    'goo',
    'geja',
  };

  static List<_IndexedArticle>? _index;

  static List<String> _tokens(String text) {
    final cleaned = text.toLowerCase().replaceAll(RegExp(r'[^\p{L}\p{M}\p{N}\s]', unicode: true), ' ');
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

    final averageLength = index.fold<int>(0, (sum, doc) => sum + doc.tokens.length) / index.length;
    final queryBigrams = {for (var i = 0; i + 1 < queryTokens.length; i++) '${queryTokens[i]} ${queryTokens[i + 1]}'};
    final ranked = <(_IndexedArticle, double)>[];
    for (final document in index) {
      var score = 0.0;
      for (final term in queryTokens) {
        final count = document.tokens.where((token) => token == term).length;
        if (count == 0) continue;
        final frequency = frequencies[term] ?? 0;
        final idf = math.log(1 + (index.length - frequency + .5) / (frequency + .5));
        score += idf * (count * 2.5) / (count + 1.5 * (.25 + .75 * document.tokens.length / averageLength));
      }
      final bigrams = {for (var i = 0; i + 1 < document.tokens.length; i++) '${document.tokens[i]} ${document.tokens[i + 1]}'};
      for (final pair in queryBigrams) { if (bigrams.contains(pair)) score += 2; }
      if (articleMention != null && document.source.number.contains('${articleMention}se')) score += 50;
      if (articleMention != null && document.source.id.toString() == articleMention) score += 50;
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

    final selected = ranked.take(6).map((hit) => hit.$1.source).toList();
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
    final seen = <String>{};
    final picked = candidates.where((c) => seen.add(c.$1)).take(3).toList();
    final answer = picked.isEmpty
        ? selected.first.content
        : picked.map((item) => item.$1).join('\n\n');
    final sourceIds = picked.map((item) => item.$3.id).toSet();
    final sources = picked.isEmpty
        ? [selected.first]
        : sourceIds.map((id) => selected.firstWhere((source) => source.id == id)).toList();
    return FoncierAnswer(answer: answer, sources: sources, isFallback: false);
  }
}
