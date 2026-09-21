import 'dart:convert';
import 'dart:math' as math;

import 'package:shared_preferences/shared_preferences.dart';

import 'handunia_consultation_extended_data.dart';
import 'handunia_map_data.dart';

enum HanduniaTravelMode { walk, bicycle, horse }

extension HanduniaTravelModeX on HanduniaTravelMode {
  String get key => switch (this) {
        HanduniaTravelMode.walk => 'walk',
        HanduniaTravelMode.bicycle => 'bicycle',
        HanduniaTravelMode.horse => 'horse',
      };

  String get label => switch (this) {
        HanduniaTravelMode.walk => 'Marche',
        HanduniaTravelMode.bicycle => 'Vélo',
        HanduniaTravelMode.horse => 'Cheval',
      };

  String get iconLabel => switch (this) {
        HanduniaTravelMode.walk => 'À pied',
        HanduniaTravelMode.bicycle => 'À vélo',
        HanduniaTravelMode.horse => 'À cheval',
      };

  double get speedKmh => switch (this) {
        HanduniaTravelMode.walk => 4.5,
        HanduniaTravelMode.bicycle => 15.0,
        HanduniaTravelMode.horse => 7.0,
      };

  double get preferredLegKm => switch (this) {
        HanduniaTravelMode.walk => 7.0,
        HanduniaTravelMode.bicycle => 30.0,
        HanduniaTravelMode.horse => 18.0,
      };
}

class HanduniaGuideData {
  HanduniaGuideData._();

  static const _placesCacheKey = 'handunia_guide_places_v1';
  static const _answerCachePrefix = 'handunia_guide_answer_v1';

  static double? _double(dynamic value) {
    if (value is num) return value.toDouble();
    return double.tryParse(value?.toString() ?? '');
  }

  static bool hasCoordinates(Map<String, dynamic> place) =>
      _double(place['latitude']) != null &&
      _double(place['longitude']) != null;

  static Future<List<Map<String, dynamic>>> loadPlaces() async {
    final preferences = await SharedPreferences.getInstance();
    try {
      final places = await HanduniaConsultationExtendedData.fetchLivingMap();
      await preferences.setString(_placesCacheKey, jsonEncode(places));
      return places;
    } catch (_) {
      final raw = preferences.getString(_placesCacheKey);
      if (raw == null || raw.isEmpty) rethrow;
      final decoded = jsonDecode(raw);
      if (decoded is! List) rethrow;
      return decoded
          .whereType<Map>()
          .map((item) => Map<String, dynamic>.from(item))
          .toList(growable: false);
    }
  }

  static List<Map<String, dynamic>> planStops({
    required List<Map<String, dynamic>> places,
    required HanduniaTravelMode mode,
    Map<String, dynamic>? initialPlace,
    int maxStops = 4,
  }) {
    final located = places
        .where(hasCoordinates)
        .map((item) => Map<String, dynamic>.from(item))
        .toList(growable: true);
    if (located.isEmpty || maxStops <= 0) {
      return const <Map<String, dynamic>>[];
    }

    late Map<String, dynamic> start;
    final initialId = initialPlace?['id']?.toString();
    if (initialPlace != null && hasCoordinates(initialPlace)) {
      start = Map<String, dynamic>.from(initialPlace);
      located.removeWhere(
        (item) => item['id']?.toString() == initialId,
      );
    } else {
      located.sort(
        (a, b) => _engagement(b).compareTo(_engagement(a)),
      );
      start = located.removeAt(0);
    }

    final selected = <Map<String, dynamic>>[start];
    while (selected.length < maxStops && located.isNotEmpty) {
      final previous = selected.last;
      located.sort((a, b) {
        final scoreB = _candidateScore(previous, b, mode);
        final scoreA = _candidateScore(previous, a, mode);
        return scoreB.compareTo(scoreA);
      });
      selected.add(located.removeAt(0));
    }

    return selected;
  }

  static double _engagement(Map<String, dynamic> place) {
    final memories = (place['memory_count'] as num?)?.toDouble() ?? 0;
    final voices = (place['voice_count'] as num?)?.toDouble() ?? 0;
    return memories * 1.5 + voices * 2.0;
  }

  static double _candidateScore(
    Map<String, dynamic> from,
    Map<String, dynamic> candidate,
    HanduniaTravelMode mode,
  ) {
    final distanceKm = HanduniaMapData.distanceMeters(
          _double(from['latitude'])!,
          _double(from['longitude'])!,
          _double(candidate['latitude'])!,
          _double(candidate['longitude'])!,
        ) /
        1000;
    final preferred = mode.preferredLegKm;
    final distancePenalty = distanceKm <= preferred
        ? distanceKm * 0.35
        : preferred * 0.35 + (distanceKm - preferred) * 1.6;
    var territoryBonus = 0.0;
    final fromDepartment = from['department']?.toString().trim().toLowerCase();
    final toDepartment =
        candidate['department']?.toString().trim().toLowerCase();
    if (fromDepartment != null &&
        fromDepartment.isNotEmpty &&
        fromDepartment == toDepartment) {
      territoryBonus += 7;
    }
    final fromCommune = from['commune']?.toString().trim().toLowerCase();
    final toCommune = candidate['commune']?.toString().trim().toLowerCase();
    if (fromCommune != null &&
        fromCommune.isNotEmpty &&
        fromCommune == toCommune) {
      territoryBonus += 9;
    }
    return _engagement(candidate) * 4 + territoryBonus - distancePenalty;
  }

  static Future<Map<String, dynamic>> buildJourney({
    required List<Map<String, dynamic>> places,
    required HanduniaTravelMode mode,
    Map<String, dynamic>? initialPlace,
    int maxStops = 4,
  }) async {
    final stops = planStops(
      places: places,
      mode: mode,
      initialPlace: initialPlace,
      maxStops: maxStops,
    );
    if (stops.isEmpty) {
      return <String, dynamic>{
        'state': 'void',
        'mode': mode.key,
        'stops': const <Map<String, dynamic>>[],
        'path_points': const <Map<String, double>>[],
        'distance_m': 0.0,
        'estimated_duration_s': 0.0,
      };
    }

    final decorated = <Map<String, dynamic>>[];
    final path = <Map<String, double>>[];
    var totalDistance = 0.0;
    var usedRoadGeometry = false;

    for (var index = 0; index < stops.length; index++) {
      final stop = Map<String, dynamic>.from(stops[index]);
      var legDistance = 0.0;
      var legProvider = 'start';

      if (index > 0) {
        final previous = stops[index - 1];
        final directDistance = HanduniaMapData.distanceMeters(
          _double(previous['latitude'])!,
          _double(previous['longitude'])!,
          _double(stop['latitude'])!,
          _double(stop['longitude'])!,
        );
        try {
          final route = await HanduniaMapData.route(
            fromLatitude: _double(previous['latitude'])!,
            fromLongitude: _double(previous['longitude'])!,
            toLatitude: _double(stop['latitude'])!,
            toLongitude: _double(stop['longitude'])!,
          );
          final points = List<Map<String, double>>.from(
            route['points'] as List,
          );
          if (points.isNotEmpty) {
            if (path.isNotEmpty) points.removeAt(0);
            path.addAll(points);
          }
          legDistance = (route['distance_m'] as num?)?.toDouble() ??
              directDistance;
          legProvider = route['provider']?.toString() ?? 'osrm-osm';
          usedRoadGeometry = true;
        } catch (_) {
          if (path.isEmpty) {
            path.add(<String, double>{
              'latitude': _double(previous['latitude'])!,
              'longitude': _double(previous['longitude'])!,
            });
          }
          path.add(<String, double>{
            'latitude': _double(stop['latitude'])!,
            'longitude': _double(stop['longitude'])!,
          });
          legDistance = directDistance;
          legProvider = 'direct-fallback';
        }
      } else {
        path.add(<String, double>{
          'latitude': _double(stop['latitude'])!,
          'longitude': _double(stop['longitude'])!,
        });
      }

      totalDistance += legDistance;
      decorated.add(<String, dynamic>{
        ...stop,
        'guide_index': index + 1,
        'leg_distance_m': legDistance,
        'leg_provider': legProvider,
      });
    }

    final estimatedDurationS =
        totalDistance / math.max(0.1, mode.speedKmh * 1000 / 3600);
    return <String, dynamic>{
      'state': 'ready',
      'mode': mode.key,
      'stops': decorated,
      'path_points': path,
      'distance_m': totalDistance,
      'estimated_duration_s': estimatedDurationS,
      'route_quality': usedRoadGeometry ? 'road-reference' : 'indicative',
      'routing_notice':
          'Le tracé suit la voirie OSM lorsqu’elle est disponible. Le mode '
          '${mode.label.toLowerCase()} adapte les étapes et la durée, mais ne '
          'certifie pas la praticabilité de chaque segment.',
    };
  }

  static Future<Map<String, dynamic>> askGuide(
    Map<String, dynamic> place, {
    String intent = 'intro',
    String? period,
  }) async {
    final placeId = place['id']?.toString() ?? '';
    final placeName = place['name']?.toString().trim().isNotEmpty == true
        ? place['name'].toString().trim()
        : 'ce lieu';
    final question = switch (intent) {
      'reconstruction' =>
        'Reconstitue l’ambiance de $placeName uniquement à partir des '
            'témoignages disponibles${period == null ? '' : ' pour la période $period'}. '
            'Décris en quelques phrases les personnes, gestes, sons ou usages '
            'explicitement attestés. N’ajoute aucun détail non raconté.',
      'who' =>
        'Qui est mentionné ou qui intervient dans les témoignages sur '
            '$placeName ? Réponds uniquement avec ce que les voix permettent '
            'd’établir.',
      'when' =>
        'Que permettent de dire les témoignages sur les périodes et moments '
            'associés à $placeName ?',
      'how' =>
        'Comment les témoignages décrivent-ils les pratiques, gestes ou '
            'déplacements liés à $placeName ?',
      _ =>
        'Pour une visite guidée de $placeName, raconte en trois phrases '
            'maximum ce que les voix de la communauté permettent réellement '
            'de comprendre ici. Reste strictement sourcé.',
    };
    return _askWithCache(
      placeId: placeId,
      cacheSuffix: '$intent-${period ?? 'all'}',
      question: question,
    );
  }

  static Future<Map<String, dynamic>> _askWithCache({
    required String placeId,
    required String cacheSuffix,
    required String question,
  }) async {
    final preferences = await SharedPreferences.getInstance();
    final safeId = placeId.replaceAll(RegExp(r'[^a-zA-Z0-9_-]'), '_');
    final key = '$_answerCachePrefix-$safeId-$cacheSuffix';
    try {
      final answer = await HanduniaConsultationExtendedData.askMemory(
        question,
        lieuId: placeId.isEmpty ? null : placeId,
      );
      if (answer['state'] == 'sourced') {
        await preferences.setString(key, jsonEncode(answer));
      }
      return answer;
    } catch (_) {
      final raw = preferences.getString(key);
      if (raw == null || raw.isEmpty) rethrow;
      final decoded = jsonDecode(raw);
      if (decoded is! Map) rethrow;
      return <String, dynamic>{
        ...Map<String, dynamic>.from(decoded),
        'offline': true,
      };
    }
  }

  static Future<Map<String, dynamic>> memoryGaps(String placeId) async {
    try {
      final results = await Future.wait<dynamic>([
        HanduniaConsultationExtendedData.fetchLieuDetail(placeId),
        HanduniaConsultationExtendedData.fetchTimeline(placeId),
      ]);
      final detail = Map<String, dynamic>.from(results[0] as Map);
      final timeline = List<Map<String, dynamic>>.from(results[1] as List);
      final missingAxes = (detail['missing_axes'] as List? ?? const [])
          .map((item) => item.toString())
          .toList(growable: false);
      final emptyPeriods = timeline
          .where((item) => ((item['memory_count'] as num?)?.toInt() ?? 0) == 0)
          .map((item) => item['label']?.toString() ?? '')
          .where((item) => item.isNotEmpty)
          .toList(growable: false);
      return <String, dynamic>{
        'state': 'ready',
        'missing_axes': missingAxes,
        'empty_periods': emptyPeriods,
      };
    } catch (_) {
      return <String, dynamic>{
        'state': 'unavailable',
        'missing_axes': const <String>[],
        'empty_periods': const <String>[],
      };
    }
  }

  static String distanceLabel(num meters) {
    final value = meters.toDouble();
    if (value < 1000) return '${value.round()} m';
    return '${(value / 1000).toStringAsFixed(value >= 10000 ? 0 : 1)} km';
  }

  static String durationLabel(num seconds) {
    final minutes = math.max(0, (seconds.toDouble() / 60).round());
    if (minutes < 60) return '$minutes min';
    final hours = minutes ~/ 60;
    final remaining = minutes % 60;
    return remaining == 0 ? '$hours h' : '$hours h $remaining';
  }
}
