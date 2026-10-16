import 'dart:math' as math;

import 'handunia_consultation_model.dart';

/// Moteur patrimonial du Fil Handunia.
///
/// Règle structurante : aucune métrique de popularité (likes, partages,
/// temps de visionnage) n'entre dans le score. Le fil organise un voyage de
/// mémoire : territoire, lacunes, corroborations, continuité culturelle,
/// diversité de périodes/voix/thèmes, qualité documentaire et fraîcheur.
abstract final class HanduniaHeritageFeed {
  static const double proximityWeight = 25;
  static const double gapWeight = 20;
  static const double corroborationWeight = 15;
  static const double continuityWeight = 15;
  static const double generationWeight = 10;
  static const double diversityWeight = 8;
  static const double sourceQualityWeight = 5;
  static const double recencyWeight = 2;

  static List<Map<String, dynamic>> buildJourney(
    List<Map<String, dynamic>> source, {
    required HanduniaFeedFilter filter,
  }) {
    if (source.isEmpty) return const <Map<String, dynamic>>[];

    final pool = source
        .map((raw) {
          final item = Map<String, dynamic>.from(raw);
          item['_handunia_heritage_score'] = score(item, filter: filter);
          return item;
        })
        .toList(growable: true)
      ..sort(
        (a, b) => ((b['_handunia_heritage_score'] as num?)?.toDouble() ?? 0)
            .compareTo(
              (a['_handunia_heritage_score'] as num?)?.toDouble() ?? 0,
            ),
      );

    final journey = <Map<String, dynamic>>[];
    while (pool.isNotEmpty) {
      final previous = journey.isEmpty ? null : journey.last;
      var bestIndex = 0;
      var bestValue = double.negativeInfinity;

      final candidateCount = math.min(pool.length, 12);
      for (var i = 0; i < candidateCount; i++) {
        final candidate = pool[i];
        final base =
            (candidate['_handunia_heritage_score'] as num?)?.toDouble() ?? 0;
        final session = _sessionScore(
          previous: previous,
          candidate: candidate,
          recentJourney: journey,
        );
        final value = base + session;
        if (value > bestValue) {
          bestValue = value;
          bestIndex = i;
        }
      }

      final selected = pool.removeAt(bestIndex);
      final reason = _transitionReason(previous, selected);
      selected['_handunia_transition_reason'] = reason;
      selected['_handunia_transition_label'] = transitionLabel(reason);
      selected['_handunia_session_score'] = bestValue;
      selected['_handunia_why'] = explanationFor(
        selected,
        previous: previous,
      );
      journey.add(selected);
    }

    return journey;
  }

  /// Score de base sur 67 points.
  ///
  /// Les 33 points restants sont contextuels à la session :
  /// continuité culturelle (15), diversité générationnelle/période (10)
  /// et diversité des voix/lieux/thèmes (8).
  static double score(
    Map<String, dynamic> item, {
    required HanduniaFeedFilter filter,
    int sourceRank = 0,
    int total = 1,
  }) {
    final distance = (item['distance_m'] as num?)?.toDouble();
    var proximity = distance == null
        ? 0.35
        : (1 / (1 + math.max(0, distance) / 6500)).clamp(0.0, 1.0);

    if (filter != HanduniaFeedFilter.around && distance == null) {
      proximity = 0.45;
    }

    final voices = math.max(1, (item['voice_count'] as num?)?.toInt() ?? 1);
    final corroborationCount = math.max(
      0,
      (item['corroboration_count'] as num?)?.toInt() ?? voices - 1,
    );
    final corroboration =
        (math.log(corroborationCount + 1) / math.log(10)).clamp(0.0, 1.0);

    final gapContribution = item['lacuna_filled'] == true ? 1.0 : 0.0;

    var sourceQuality = 0.0;
    if (_clean(item['audio_url']).isNotEmpty) sourceQuality += 0.34;
    if (_clean(item['transcript_text']).isNotEmpty) sourceQuality += 0.20;
    if (_clean(item['seal_hash']).isNotEmpty || item['sealed_at'] != null) {
      sourceQuality += 0.20;
    }
    if (item['transcript_reviewed_by_guardian'] == true) {
      sourceQuality += 0.18;
    }
    if (_clean(item['period_label']).isNotEmpty || item['period_year'] != null) {
      sourceQuality += 0.08;
    }
    sourceQuality = sourceQuality.clamp(0.0, 1.0);

    final created = DateTime.tryParse(_clean(item['created_at']));
    final ageDays = created == null
        ? 365
        : DateTime.now().difference(created).inDays.clamp(0, 3650);
    final recency = math.exp(-ageDays / 365).clamp(0.0, 1.0);

    return proximityWeight * proximity +
        gapWeight * gapContribution +
        corroborationWeight * corroboration +
        sourceQualityWeight * sourceQuality +
        recencyWeight * recency;
  }

  static List<String> explanationFor(
    Map<String, dynamic> item, {
    Map<String, dynamic>? previous,
  }) {
    final result = <String>[];
    final reason = _transitionReason(previous, item);
    if (reason != 'first' && reason != 'other_memory') {
      result.add(transitionLabel(reason));
    }

    final distance = (item['distance_m'] as num?)?.toDouble();
    if (distance != null) {
      if (distance <= 2500) {
        result.add('Proche de votre territoire');
      } else if (distance <= 15000) {
        result.add('Même bassin territorial');
      }
    }

    if (item['lacuna_filled'] == true) {
      result.add('Complète une lacune de mémoire');
    }

    final voices = math.max(1, (item['voice_count'] as num?)?.toInt() ?? 1);
    final corroborations = math.max(
      0,
      (item['corroboration_count'] as num?)?.toInt() ?? voices - 1,
    );
    if (corroborations > 0) {
      result.add(
        corroborations == 1
            ? '1 autre voix corrobore ce souvenir'
            : '$corroborations autres voix corroborent ce souvenir',
      );
    }

    if (_clean(item['theme_key']).isNotEmpty) {
      result.add('Thème : ${_clean(item['theme_key'])}');
    }

    if (result.isEmpty) {
      result.add('Pièce de la mémoire collective');
    }
    return result.take(4).toList(growable: false);
  }

  static String transitionLabel(String? reason) {
    return switch (reason) {
      'gap_filled' => 'Une lacune vient d’être comblée',
      'same_place_other_period' => 'Même lieu · autre époque',
      'another_generation' => 'Même territoire · autre génération',
      'same_period' => 'Même époque · autre voix',
      'same_theme' => 'Même thème · autre voix',
      'same_lineage' => 'Même lignée · autre mémoire',
      'corroborated' => 'Plusieurs voix se rejoignent',
      'divergence' => 'Deux versions existent',
      'nearby_place' => 'Lieu voisin · mémoire liée',
      'first' => 'Mémoire du territoire',
      _ => 'Autre lieu · autre mémoire',
    };
  }

  static double _sessionScore({
    required Map<String, dynamic>? previous,
    required Map<String, dynamic> candidate,
    required List<Map<String, dynamic>> recentJourney,
  }) {
    if (previous == null) return 0;

    final reason = _transitionReason(previous, candidate);
    final continuity = switch (reason) {
      'gap_filled' => 1.0,
      'divergence' => 1.0,
      'same_place_other_period' => .95,
      'another_generation' => .92,
      'corroborated' => .86,
      'same_theme' => .78,
      'same_lineage' => .74,
      'same_period' => .68,
      'nearby_place' => .62,
      _ => .28,
    };

    final generation = _generationDiversity(previous, candidate);
    final diversity = _diversityAgainstRecent(candidate, recentJourney);

    var score = continuityWeight * continuity +
        generationWeight * generation +
        diversityWeight * diversity;

    if (_clean(previous['user_id']).isNotEmpty &&
        _clean(previous['user_id']) == _clean(candidate['user_id'])) {
      score -= 10;
    }
    return score;
  }

  static double _generationDiversity(
    Map<String, dynamic> previous,
    Map<String, dynamic> candidate,
  ) {
    final previousPeriod = _period(previous);
    final candidatePeriod = _period(candidate);
    if (previousPeriod.isEmpty || candidatePeriod.isEmpty) return .35;
    return previousPeriod == candidatePeriod ? .15 : 1.0;
  }

  static double _diversityAgainstRecent(
    Map<String, dynamic> candidate,
    List<Map<String, dynamic>> journey,
  ) {
    if (journey.isEmpty) return 1;
    final recent = journey.reversed.take(4).toList(growable: false);
    var points = 0.0;
    for (final key in const ['user_id', 'lieu_id', 'theme_key', 'lineage_key']) {
      final value = _clean(candidate[key]);
      if (value.isEmpty) {
        points += .35;
        continue;
      }
      final repeated = recent.any((item) => _clean(item[key]) == value);
      points += repeated ? 0 : 1;
    }
    return (points / 4).clamp(0.0, 1.0);
  }

  static String _transitionReason(
    Map<String, dynamic>? previous,
    Map<String, dynamic> current,
  ) {
    if (current['lacuna_filled'] == true) return 'gap_filled';
    if (current['has_divergence'] == true) return 'divergence';
    if (previous == null) return 'first';

    final previousLieu = _clean(previous['lieu_id']);
    final currentLieu = _clean(current['lieu_id']);
    final samePlace = previousLieu.isNotEmpty && previousLieu == currentLieu;
    final previousPeriod = _period(previous);
    final currentPeriod = _period(current);

    if (samePlace &&
        previousPeriod.isNotEmpty &&
        currentPeriod.isNotEmpty &&
        previousPeriod != currentPeriod) {
      return 'same_place_other_period';
    }

    if (samePlace &&
        _generationBucket(previous) != _generationBucket(current) &&
        _generationBucket(previous).isNotEmpty &&
        _generationBucket(current).isNotEmpty) {
      return 'another_generation';
    }

    if (previousPeriod.isNotEmpty &&
        previousPeriod == currentPeriod &&
        _clean(previous['user_id']) != _clean(current['user_id'])) {
      return 'same_period';
    }

    if (_clean(previous['theme_key']).isNotEmpty &&
        _clean(previous['theme_key']) == _clean(current['theme_key'])) {
      return 'same_theme';
    }

    if (_clean(previous['lineage_key']).isNotEmpty &&
        _clean(previous['lineage_key']) == _clean(current['lineage_key'])) {
      return 'same_lineage';
    }

    final corroborations =
        (current['corroboration_count'] as num?)?.toInt() ??
        math.max(0, ((current['voice_count'] as num?)?.toInt() ?? 1) - 1);
    if (corroborations >= 2) return 'corroborated';

    final previousDistance = (previous['distance_m'] as num?)?.toDouble();
    final currentDistance = (current['distance_m'] as num?)?.toDouble();
    if (previousLieu != currentLieu &&
        previousDistance != null &&
        currentDistance != null &&
        (previousDistance - currentDistance).abs() <= 12000) {
      return 'nearby_place';
    }
    return 'other_memory';
  }

  static String _period(Map<String, dynamic> item) {
    final year = item['period_year'];
    if (year != null) return year.toString();
    return _clean(item['period_label']);
  }

  static String _generationBucket(Map<String, dynamic> item) {
    final yearValue = item['period_year'];
    final year = yearValue is num ? yearValue.toInt() : int.tryParse('$yearValue');
    if (year != null) {
      if (year < 1960) return 'before_1960';
      if (year < 1980) return '1960_1979';
      if (year < 2000) return '1980_1999';
      if (year < 2020) return '2000_2019';
      return 'since_2020';
    }
    final label = _clean(item['period_label']).toLowerCase();
    if (label.contains('avant 1960')) return 'before_1960';
    if (label.contains('1960')) return '1960_1979';
    if (label.contains('1980')) return '1980_1999';
    if (label.contains('2000')) return '2000_2019';
    if (label.contains('2020')) return 'since_2020';
    if (label.contains('enfance')) return 'childhood';
    return label;
  }

  static String _clean(dynamic value) => value?.toString().trim() ?? '';
}
