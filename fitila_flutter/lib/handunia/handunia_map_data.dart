import 'dart:convert';
import 'dart:math' as math;

import 'package:shared_preferences/shared_preferences.dart';

import '../core/fitila_backend.dart';
import 'handunia_consultation_extended_data.dart';

class HanduniaMapData {
  static const _pendingKey = 'handunia_pending_geo_paths_v1';

  static Future<List<Map<String, dynamic>>> searchPlaces(String query) async {
    final trimmed = query.trim();
    if (trimmed.length < 2) {
      return const <Map<String, dynamic>>[];
    }
    final response = await FitilaBackend.client.functions.invoke(
      'handunia-map-service',
      body: <String, dynamic>{
        'action': 'search',
        'query': trimmed,
      },
    );
    final data = _map(response.data);
    final raw = data['results'];
    if (raw is! List) {
      return const <Map<String, dynamic>>[];
    }
    return raw
        .whereType<Map>()
        .map((item) => Map<String, dynamic>.from(item))
        .where(
          (item) =>
              _double(item['latitude']) != null &&
              _double(item['longitude']) != null,
        )
        .toList(growable: false);
  }

  static Future<Map<String, dynamic>> reversePlace({
    required double latitude,
    required double longitude,
  }) async {
    final response = await FitilaBackend.client.functions.invoke(
      'handunia-map-service',
      body: <String, dynamic>{
        'action': 'reverse',
        'latitude': latitude,
        'longitude': longitude,
      },
    );
    final data = _map(response.data);
    final raw = data['place'];
    if (raw is Map) {
      return Map<String, dynamic>.from(raw);
    }
    return <String, dynamic>{
      'name': _coordinateLabel(latitude, longitude),
      'display_name': _coordinateLabel(latitude, longitude),
      'latitude': latitude,
      'longitude': longitude,
      'type': 'coordinate',
    };
  }

  static Future<Map<String, dynamic>> route({
    required double fromLatitude,
    required double fromLongitude,
    required double toLatitude,
    required double toLongitude,
  }) async {
    final response = await FitilaBackend.client.functions.invoke(
      'handunia-map-service',
      body: <String, dynamic>{
        'action': 'route',
        'from_latitude': fromLatitude,
        'from_longitude': fromLongitude,
        'to_latitude': toLatitude,
        'to_longitude': toLongitude,
      },
    );
    final data = _map(response.data);
    final raw = data['route'];
    if (raw is! Map) {
      throw StateError(
        data['message']?.toString() ?? 'Aucune route disponible.',
      );
    }
    final route = Map<String, dynamic>.from(raw);
    final pointsRaw = route['points'];
    final points = pointsRaw is List
        ? pointsRaw
              .whereType<Map>()
              .map((item) {
                final lat = _double(item['latitude']);
                final lon = _double(item['longitude']);
                if (lat == null || lon == null) {
                  return null;
                }
                return <String, double>{
                  'latitude': lat,
                  'longitude': lon,
                };
              })
              .whereType<Map<String, double>>()
              .toList(growable: false)
        : const <Map<String, double>>[];

    if (points.length < 2) {
      throw StateError('Aucune géométrie routière disponible.');
    }
    return <String, dynamic>{
      'points': points,
      'distance_m': _double(route['distance_m']) ?? 0,
      'duration_s': _double(route['duration_s']) ?? 0,
      'steps': route['steps'] is List
          ? List<Map<String, dynamic>>.from(
              (route['steps'] as List).whereType<Map>(),
            )
          : const <Map<String, dynamic>>[],
      'provider': data['provider']?.toString() ?? 'osrm-osm',
    };
  }

  static Future<bool> saveOrQueuePath({
    required String fragmentId,
    required List<Map<String, double>> points,
    required String routeMode,
    required String startName,
    required String endName,
    required double distanceM,
    double? durationS,
    required String provider,
    required bool roadMatched,
  }) async {
    final capturedAt = DateTime.now().toUtc();
    try {
      await HanduniaConsultationExtendedData.savePath(
        fragmentId: fragmentId,
        points: points,
        capturedAt: capturedAt,
        routeMode: routeMode,
        startName: startName,
        endName: endName,
        distanceM: distanceM,
        durationS: durationS,
        provider: provider,
        roadMatched: roadMatched,
        geometryType: 'latlng',
      );
      return true;
    } catch (_) {
      final preferences = await SharedPreferences.getInstance();
      final pending =
          List<String>.from(preferences.getStringList(_pendingKey) ?? const []);
      pending.add(
        jsonEncode(<String, dynamic>{
          'fragment_id': fragmentId,
          'path_points': points,
          'captured_at': capturedAt.toIso8601String(),
          'route_mode': routeMode,
          'start_name': startName,
          'end_name': endName,
          'distance_m': distanceM,
          'duration_s': durationS,
          'provider': provider,
          'road_matched': roadMatched,
        }),
      );
      await preferences.setStringList(_pendingKey, pending);
      return false;
    }
  }

  static Future<int> syncPending() async {
    if (!FitilaBackend.configured ||
        FitilaBackend.client.auth.currentUser == null) {
      return 0;
    }
    final preferences = await SharedPreferences.getInstance();
    final pending =
        List<String>.from(preferences.getStringList(_pendingKey) ?? const []);
    if (pending.isEmpty) {
      return 0;
    }

    final remaining = <String>[];
    var synced = 0;
    for (final raw in pending) {
      try {
        final decoded = jsonDecode(raw);
        if (decoded is! Map) {
          continue;
        }
        final item = Map<String, dynamic>.from(decoded);
        final pointsRaw = item['path_points'];
        if (pointsRaw is! List) {
          continue;
        }
        final points = pointsRaw
            .whereType<Map>()
            .map((point) {
              final lat = _double(point['latitude']);
              final lon = _double(point['longitude']);
              if (lat == null || lon == null) {
                return null;
              }
              return <String, double>{
                'latitude': lat,
                'longitude': lon,
              };
            })
            .whereType<Map<String, double>>()
            .toList(growable: false);
        if (points.length < 2) {
          continue;
        }
        await HanduniaConsultationExtendedData.savePath(
          fragmentId: item['fragment_id'].toString(),
          points: points,
          capturedAt: DateTime.tryParse(item['captured_at']?.toString() ?? ''),
          routeMode: item['route_mode']?.toString() ?? 'historical',
          startName: item['start_name']?.toString(),
          endName: item['end_name']?.toString(),
          distanceM: _double(item['distance_m']),
          durationS: _double(item['duration_s']),
          provider: item['provider']?.toString(),
          roadMatched: item['road_matched'] == true,
          geometryType: 'latlng',
        );
        synced += 1;
      } catch (_) {
        remaining.add(raw);
      }
    }

    if (remaining.isEmpty) {
      await preferences.remove(_pendingKey);
    } else {
      await preferences.setStringList(_pendingKey, remaining);
    }
    return synced;
  }

  static double distanceMeters(
    double lat1,
    double lon1,
    double lat2,
    double lon2,
  ) {
    const earth = 6371000.0;
    const p = 0.017453292519943295;
    final a = 0.5 -
        (cosValue((lat2 - lat1) * p) / 2) +
        cosValue(lat1 * p) *
            cosValue(lat2 * p) *
            (1 - cosValue((lon2 - lon1) * p)) /
            2;
    return 2 * earth * asinValue(a.sqrtClamped());
  }

  static double pathDistanceMeters(List<Map<String, double>> points) {
    var total = 0.0;
    for (var i = 1; i < points.length; i++) {
      total += distanceMeters(
        points[i - 1]['latitude']!,
        points[i - 1]['longitude']!,
        points[i]['latitude']!,
        points[i]['longitude']!,
      );
    }
    return total;
  }

  static Map<String, dynamic> _map(dynamic raw) {
    if (raw is Map) {
      return Map<String, dynamic>.from(raw);
    }
    throw StateError('Réponse cartographique invalide.');
  }

  static double? _double(dynamic value) {
    if (value is num) {
      return value.toDouble();
    }
    return double.tryParse(value?.toString() ?? '');
  }

  static String _coordinateLabel(double lat, double lon) =>
      '${lat.toStringAsFixed(5)}, ${lon.toStringAsFixed(5)}';
}

extension on double {
  double sqrtClamped() {
    if (this <= 0) {
      return 0;
    }
    if (this >= 1) {
      return 1;
    }
    return this;
  }
}

double cosValue(double value) {
  // Taylor is avoided; dart:math is intentionally wrapped so this service
  // stays straightforward to test.
  return math.cos(value);
}

double asinValue(double value) => math.asin(value);
