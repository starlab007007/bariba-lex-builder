import 'dart:math' as math;

import 'handunia_consultation_model.dart';

/// Raisonnement de découverte patrimoniale du Fil Handunia.
///
/// Contrairement à un ranking social, les likes et partages n'interviennent
/// jamais dans le score. Le moteur privilégie territoire, voix distinctes,
/// lacunes documentaires, qualité de la source et continuité du voyage.
abstract final class HanduniaHeritageFeed {
  static List<Map<String, dynamic>> buildJourney(
    List<Map<String, dynamic>> source, {
    required HanduniaFeedFilter filter,
  }) {
    if (source.isEmpty) return const <Map<String, dynamic>>[];

    final ranked = <Map<String, dynamic>>[];
    for (var i = 0; i < source.length; i++) {
      final item = Map<String, dynamic>.from(source[i]);
      item['_handunia_heritage_score'] = score(
        item,
        filter: filter,
        sourceRank: i,
        total: source.length,
      );
      ranked.add(item);
    }
    ranked.sort(
      (a, b) => ((b['_handunia_heritage_score'] as num?)?.toDouble() ?? 0)
          .compareTo(
            (a['_handunia_heritage_score'] as num?)?.toDouble() ?? 0,
          ),
    );

    final pool = List<Map<String, dynamic>>.from(ranked);
    final journey = <Map<String, dynamic>>[];
    var samePlaceStreak = 0;

    while (pool.isNotEmpty) {
      var bestIndex = 0;
      var bestValue = double.negativeInfinity;
      final previous = journey.isEmpty ? null : journey.last;

      for (var i = 0; i < math.min(pool.length, 8); i++) {
        final candidate = pool[i];
        var value =
            (candidate['_handunia_heritage_score'] as num?)?.toDouble() ?? 0;
        if (previous != null) {
          value += _continuityBonus(
            previous,
            candidate,
            samePlaceStreak: samePlaceStreak,
          );
        }
        if (value > bestValue) {
          bestValue = value;
          bestIndex = i;
        }
      }

      final selected = pool.removeAt(bestIndex);
      final previous = journey.isEmpty ? null : journey.last;
      if (previous != null &&
          _clean(previous['lieu_id']) == _clean(selected['lieu_id']) &&
          _clean(selected['lieu_id']).isNotEmpty) {
        samePlaceStreak += 1;
      } else {
        samePlaceStreak = 0;
      }

      selected['_handunia_transition_reason'] = _transitionReason(
        previous,
        selected,
      );
      selected['_handunia_transition_label'] = transitionLabel(
        selected['_handunia_transition_reason']?.toString(),
      );
      journey.add(selected);
    }

    return journey;
  }

  static double score(
    Map<String, dynamic> item, {
    required HanduniaFeedFilter filter,
    int sourceRank = 0,
    int total = 1,
  }) {
    final distance = (item['distance_m'] as num?)?.toDouble();
    final proximity = distance == null
        ? 0.35
        : (1 / (1 + math.max(0, distance) / 6500)).clamp(0.0, 1.0);

    final voices = math.max(1, (item['voice_count'] as num?)?.toInt() ?? 1);
    final corroboration = (math.log(voices + 1) / math.log(12)).clamp(0.0, 1.0);

    final gapContribution = item['lacuna_filled'] == true ? 1.0 : 0.0;

    var sourceQuality = 0.0;
    if (_clean(item['audio_url']).isNotEmpty) sourceQuality += 0.45;
    if (_clean(item['transcript_text']).isNotEmpty) sourceQuality += 0.22;
    if (_clean(item['seal_hash']).isNotEmpty || item['sealed_at'] != null) {
      sourceQuality += 0.18;
    }
    if (item['transcript_reviewed_by_guardian'] == true) sourceQuality += 0.15;
    sourceQuality = sourceQuality.clamp(0.0, 1.0);

    var contextualDepth = 0.0;
    if (item['period_year'] != null || _clean(item['period_label']).isNotEmpty) {
      contextualDepth += 0.34;
    }
    if (_clean(item['theme_key']).isNotEmpty) contextualDepth += 0.22;
    if (_clean(item['lineage_key']).isNotEmpty) contextualDepth += 0.22;
    if ((item['latitude'] as num?) != null &&
        (item['longitude'] as num?) != null) {
      contextualDepth += 0.22;
    }
    contextualDepth = contextualDepth.clamp(0.0, 1.0);

    final created = DateTime.tryParse(_clean(item['created_at']));
    final ageDays = created == null
        ? 365
        : DateTime.now().difference(created).inDays.clamp(0, 3650);
    final recency = math.exp(-ageDays / 240).clamp(0.0, 1.0);

    final sourceOrder = total <= 1
        ? 1.0
        : (1 - sourceRank / math.max(1, total - 1)).clamp(0.0, 1.0);

    var filterAffinity = 0.5;
    if (filter == HanduniaFeedFilter.around) {
      filterAffinity = proximity;
    } else if (filter == HanduniaFeedFilter.lineage) {
      filterAffinity = _clean(item['lineage_key']).isEmpty ? 0.2 : 1.0;
    } else if (filter == HanduniaFeedFilter.all) {
      filterAffinity = contextualDepth > 0.45 ? 0.8 : 0.55;
    }

    return 0.25 * proximity +
        0.20 * gapContribution +
        0.18 * corroboration +
        0.12 * sourceQuality +
        0.10 * contextualDepth +
        0.08 * sourceOrder +
        0.04 * recency +
        0.03 * filterAffinity;
  }

  static String transitionLabel(String? reason) {
    return switch (reason) {
      'gap_filled' => 'Une lacune vient d’être comblée',
      'same_place_other_period' => 'Même lieu · autre époque',
      'same_theme' => 'Même thème · autre voix',
      'same_lineage' => 'Même lignée · autre mémoire',
      'corroborated' => 'Plusieurs voix se rejoignent',
      'first' => 'Mémoire du territoire',
      _ => 'Autre lieu · autre mémoire',
    };
  }

  static double _continuityBonus(
    Map<String, dynamic> previous,
    Map<String, dynamic> candidate, {
    required int samePlaceStreak,
  }) {
    final previousLieu = _clean(previous['lieu_id']);
    final candidateLieu = _clean(candidate['lieu_id']);
    final samePlace =
        previousLieu.isNotEmpty && previousLieu == candidateLieu;
    final sameAuthor =
        _clean(previous['user_id']).isNotEmpty &&
        _clean(previous['user_id']) == _clean(candidate['user_id']);
    final sameTheme =
        _clean(previous['theme_key']).isNotEmpty &&
        _clean(previous['theme_key']) == _clean(candidate['theme_key']);
    final sameLineage =
        _clean(previous['lineage_key']).isNotEmpty &&
        _clean(previous['lineage_key']) == _clean(candidate['lineage_key']);
    final differentPeriod =
        _period(previous) != _period(candidate) &&
        (_period(previous).isNotEmpty || _period(candidate).isNotEmpty);

    var bonus = 0.0;
    if (samePlace && differentPeriod) bonus += 0.25;
    if (sameTheme) bonus += 0.13;
    if (sameLineage) bonus += 0.10;
    if (((candidate['voice_count'] as num?)?.toInt() ?? 1) >= 3) bonus += 0.06;
    if (candidate['lacuna_filled'] == true) bonus += 0.12;

    if (sameAuthor) bonus -= 0.24;
    if (samePlace && samePlaceStreak >= 2) bonus -= 0.28;
    return bonus;
  }

  static String _transitionReason(
    Map<String, dynamic>? previous,
    Map<String, dynamic> current,
  ) {
    if (current['lacuna_filled'] == true) return 'gap_filled';
    if (previous == null) return 'first';

    final previousLieu = _clean(previous['lieu_id']);
    final currentLieu = _clean(current['lieu_id']);
    if (previousLieu.isNotEmpty &&
        previousLieu == currentLieu &&
        _period(previous) != _period(current) &&
        (_period(previous).isNotEmpty || _period(current).isNotEmpty)) {
      return 'same_place_other_period';
    }
    if (_clean(previous['theme_key']).isNotEmpty &&
        _clean(previous['theme_key']) == _clean(current['theme_key'])) {
      return 'same_theme';
    }
    if (_clean(previous['lineage_key']).isNotEmpty &&
        _clean(previous['lineage_key']) == _clean(current['lineage_key'])) {
      return 'same_lineage';
    }
    if (((current['voice_count'] as num?)?.toInt() ?? 1) >= 3) {
      return 'corroborated';
    }
    return 'other_memory';
  }

  static String _period(Map<String, dynamic> item) {
    final year = item['period_year'];
    if (year != null) return year.toString();
    return _clean(item['period_label']);
  }

  static String _clean(dynamic value) => value?.toString().trim() ?? '';
}
