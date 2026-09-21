import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_tts/flutter_tts.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'handunia_consultation_extended_data.dart';
import 'handunia_consultation_ui.dart';
import 'handunia_map_data.dart';
import 'handunia_unified_map.dart';

enum HanduniaTravelMode { walking, bicycle, horse }

extension HanduniaTravelModeUi on HanduniaTravelMode {
  String get apiValue => switch (this) {
        HanduniaTravelMode.walking => 'walking',
        HanduniaTravelMode.bicycle => 'bicycle',
        HanduniaTravelMode.horse => 'horse',
      };

  String get label => switch (this) {
        HanduniaTravelMode.walking => 'À pied',
        HanduniaTravelMode.bicycle => 'À vélo',
        HanduniaTravelMode.horse => 'À cheval',
      };

  IconData get icon => switch (this) {
        HanduniaTravelMode.walking => Icons.directions_walk_rounded,
        HanduniaTravelMode.bicycle => Icons.directions_bike_rounded,
        HanduniaTravelMode.horse => Icons.route_rounded,
      };
}

class HanduniaPremiumGuideRoute extends StatefulWidget {
  const HanduniaPremiumGuideRoute({
    super.key,
    required this.places,
    this.initialPlaceId,
  });

  final List<Map<String, dynamic>> places;
  final String? initialPlaceId;

  @override
  State<HanduniaPremiumGuideRoute> createState() =>
      _HanduniaPremiumGuideRouteState();
}

class _HanduniaPremiumGuideRouteState
    extends State<HanduniaPremiumGuideRoute> {
  final FlutterTts _tts = FlutterTts();

  HanduniaTravelMode _mode = HanduniaTravelMode.walking;
  String? _originId;
  String? _destinationId;
  Map<String, dynamic>? _route;
  String _guide = '';
  bool _reconstruction = false;
  String? _notice;
  bool _loadingRoute = false;
  bool _loadingGuide = false;
  bool _speaking = false;
  bool _perspective = true;

  List<Map<String, dynamic>> get _located => widget.places
      .where((place) =>
          _asDouble(place['latitude']) != null &&
          _asDouble(place['longitude']) != null)
      .toList(growable: false);

  @override
  void initState() {
    super.initState();
    final places = _located;
    if (places.isNotEmpty) {
      final requested = widget.initialPlaceId;
      _originId = requested != null &&
              places.any((place) => place['id']?.toString() == requested)
          ? requested
          : places.first['id']?.toString();
      _destinationId = _bestDestination(_originId);
      if (_destinationId != null) unawaited(_loadRoute());
    }
    unawaited(_configureTts());
  }

  Future<void> _configureTts() async {
    await _tts.setLanguage('fr-FR');
    await _tts.setSpeechRate(.46);
    await _tts.setPitch(1.0);
    _tts.setCompletionHandler(() {
      if (mounted) setState(() => _speaking = false);
    });
    _tts.setCancelHandler(() {
      if (mounted) setState(() => _speaking = false);
    });
    _tts.setErrorHandler((_) {
      if (mounted) setState(() => _speaking = false);
    });
  }

  @override
  void dispose() {
    unawaited(_tts.stop());
    super.dispose();
  }

  Map<String, dynamic>? _placeById(String? id) {
    if (id == null) return null;
    for (final place in _located) {
      if (place['id']?.toString() == id) return place;
    }
    return null;
  }

  String? _bestDestination(String? originId) {
    final origin = _placeById(originId);
    if (origin == null) return null;
    final ranked = _recommendations(origin, limit: 1);
    return ranked.isEmpty ? null : ranked.first['id']?.toString();
  }

  List<Map<String, dynamic>> _recommendations(
    Map<String, dynamic> anchor, {
    int limit = 3,
  }) {
    final lat = _asDouble(anchor['latitude']);
    final lon = _asDouble(anchor['longitude']);
    if (lat == null || lon == null) return const [];
    final ranked = _located
        .where((place) => place['id']?.toString() != anchor['id']?.toString())
        .map((place) {
          final distance = HanduniaMapData.distanceMeters(
            lat,
            lon,
            _asDouble(place['latitude'])!,
            _asDouble(place['longitude'])!,
          );
          final evidence = (_count(place['memory_count']) +
                  _count(place['voice_count']))
              .clamp(0, 20);
          return <String, dynamic>{
            ...place,
            '__distance_m': distance,
            '__score': distance - evidence * 140.0,
          };
        })
        .toList(growable: false)
      ..sort((a, b) => (_asDouble(a['__score']) ?? double.infinity)
          .compareTo(_asDouble(b['__score']) ?? double.infinity));
    return ranked.take(limit).toList(growable: false);
  }

  List<Map<String, dynamic>> get _memoryGaps => widget.places
      .where((place) =>
          _count(place['memory_count']) == 0 ||
          _count(place['voice_count']) == 0)
      .take(5)
      .toList(growable: false);

  Future<void> _loadRoute() async {
    final origin = _placeById(_originId);
    final destination = _placeById(_destinationId);
    if (origin == null || destination == null || _loadingRoute) return;
    setState(() {
      _loadingRoute = true;
      _notice = null;
    });
    try {
      final route = await HanduniaMapData.routeWithCache(
        fromLatitude: _asDouble(origin['latitude'])!,
        fromLongitude: _asDouble(origin['longitude'])!,
        toLatitude: _asDouble(destination['latitude'])!,
        toLongitude: _asDouble(destination['longitude'])!,
        travelMode: _mode.apiValue,
      );
      if (!mounted) return;
      setState(() {
        _route = route;
        if (route['cached'] == true) {
          _notice = 'Itinéraire hors-ligne : dernière route synchronisée.';
        }
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _route = null;
        _notice =
            'Aucun itinéraire disponible pour ce mode. La carte reste consultable.';
      });
    } finally {
      if (mounted) setState(() => _loadingRoute = false);
    }
  }

  Future<void> _loadGuide({required bool reconstruction}) async {
    final place = _placeById(_destinationId) ?? _placeById(_originId);
    if (place == null || _loadingGuide) return;
    final name = place['name']?.toString() ?? 'ce lieu';
    final territory = handuniaTerritorySegments(place).join(' → ');
    final question = reconstruction
        ? 'À partir uniquement des souvenirs et sources de la mémoire Handunia pour ' +
            name +
            ' (' +
            territory +
            '), reconstitue une scène courte et sensorielle de 4 à 6 phrases. '
                'Distingue clairement ce qui est attesté de ce qui reste incertain. '
                'N’ajoute aucune connaissance extérieure.'
        : 'À partir uniquement des souvenirs et sources de la mémoire Handunia pour ' +
            name +
            ' (' +
            territory +
            '), fais un guide de visite bref de 5 à 7 phrases : ce qu’il faut '
                'observer, écouter et comprendre sur place. Signale les lacunes '
                'de mémoire au lieu de les inventer.';
    final cacheKey = 'handunia_lot3_' +
        (reconstruction ? 'scene_' : 'guide_') +
        (place['id']?.toString() ?? 'unknown');

    setState(() {
      _loadingGuide = true;
      _guide = '';
      _reconstruction = reconstruction;
    });
    try {
      final result = await HanduniaConsultationExtendedData.askMemory(
        question,
        lieuId: place['id']?.toString(),
      );
      final state = result['state']?.toString();
      final text = switch (state) {
        'sourced' => result['answer']?.toString() ?? '',
        'void' => result['answer']?.toString() ??
            'La communauté ne l’a pas encore suffisamment raconté.',
        'refusal' =>
          result['protocol']?.toString() ?? 'Cette mémoire est protégée.',
        _ => result['answer']?.toString() ?? '',
      };
      if (text.trim().isNotEmpty) {
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString(cacheKey, text.trim());
      }
      if (!mounted) return;
      setState(() {
        _guide = text.trim().isEmpty
            ? 'La mémoire ne dispose pas encore de suffisamment de sources.'
            : text.trim();
      });
    } catch (_) {
      final prefs = await SharedPreferences.getInstance();
      final cached = prefs.getString(cacheKey);
      if (!mounted) return;
      setState(() {
        _guide = cached?.trim().isNotEmpty == true
            ? cached!.trim()
            : 'La mémoire est momentanément indisponible. '
                'Aucun contenu ne sera inventé hors ligne.';
        if (cached?.trim().isNotEmpty == true) {
          _notice =
              'Narration hors-ligne : dernière version sourcée enregistrée.';
        }
      });
    } finally {
      if (mounted) setState(() => _loadingGuide = false);
    }
  }

  Future<void> _toggleSpeech() async {
    if (_guide.trim().isEmpty) {
      await _loadGuide(reconstruction: false);
      if (!mounted || _guide.trim().isEmpty) return;
    }
    if (_speaking) {
      await _tts.stop();
      if (mounted) setState(() => _speaking = false);
      return;
    }
    setState(() => _speaking = true);
    await _tts.speak(_guide);
  }

  List<Map<String, double>> get _routePoints {
    final raw = _route?['points'];
    if (raw is! List) return const [];
    return raw
        .whereType<Map>()
        .map((item) {
          final lat = _asDouble(item['latitude']);
          final lon = _asDouble(item['longitude']);
          if (lat == null || lon == null) return null;
          return <String, double>{'latitude': lat, 'longitude': lon};
        })
        .whereType<Map<String, double>>()
        .toList(growable: false);
  }

  @override
  Widget build(BuildContext context) {
    final origin = _placeById(_originId);
    final destination = _placeById(_destinationId);
    final recommendations =
        origin == null ? const <Map<String, dynamic>>[] : _recommendations(origin);
    final advisory = _route?['advisory']?.toString().trim() ?? '';

    return Scaffold(
      backgroundColor: HanduniaTokens.nuit,
      body: SafeArea(
        child: Column(
          children: [
            _header(),
            Expanded(
              child: _located.isEmpty
                  ? Center(
                      child: Text(
                        'Aucun lieu géolocalisé n’est encore disponible.',
                        style: _karla(color: HanduniaTokens.cendre),
                      ),
                    )
                  : SingleChildScrollView(
                      padding: const EdgeInsets.fromLTRB(16, 4, 16, 28),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          HanduniaUnifiedMap(
                            places: <Map<String, dynamic>>[
                              if (origin != null) origin,
                              if (destination != null &&
                                  destination['id'] != origin?['id'])
                                destination,
                              ...recommendations.where((place) =>
                                  place['id'] != destination?['id'] &&
                                  place['id'] != origin?['id']),
                            ],
                            selectedPlaceId: destination?['id']?.toString() ??
                                origin?['id']?.toString(),
                            height: 330,
                            showSelectionCard: false,
                            routePoints: _routePoints,
                            perspective: _perspective,
                            initialZoom: 8.8,
                          ),
                          const SizedBox(height: 12),
                          _routeSection(origin, destination, advisory),
                          const SizedBox(height: 12),
                          _memorySection(),
                          const SizedBox(height: 12),
                          _recommendationsSection(recommendations),
                          const SizedBox(height: 12),
                          _gapsSection(),
                          if (_notice != null) ...[
                            const SizedBox(height: 12),
                            Text(
                              _notice!,
                              textAlign: TextAlign.center,
                              style: _karla(
                                size: 12.5,
                                color: HanduniaTokens.terre,
                                weight: FontWeight.w700,
                              ),
                            ),
                          ],
                        ],
                      ),
                    ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _header() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(10, 8, 12, 8),
      child: Row(
        children: [
          IconButton(
            onPressed: () => Navigator.maybePop(context),
            icon: const Icon(Icons.arrow_back_outlined),
            color: HanduniaTokens.ivoire,
          ),
          const SizedBox(width: 4),
          const Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Voyage vivant',
                  style: TextStyle(
                    fontFamily: 'Fraunces',
                    fontWeight: FontWeight.w600,
                    fontSize: 25,
                    color: HanduniaTokens.ivoire,
                  ),
                ),
                Text(
                  'Guide IA sourcé · carte réelle · narration audio',
                  style: TextStyle(
                    fontFamily: 'Karla',
                    fontSize: 11.5,
                    fontWeight: FontWeight.w700,
                    color: HanduniaTokens.cendre,
                  ),
                ),
              ],
            ),
          ),
          IconButton(
            onPressed: () => setState(() => _perspective = !_perspective),
            icon: Icon(
              _perspective ? Icons.view_in_ar_outlined : Icons.map_outlined,
            ),
            color: HanduniaTokens.braise,
          ),
          IconButton(
            onPressed: _loadingGuide ? null : _toggleSpeech,
            icon: Icon(
              _speaking
                  ? Icons.stop_circle_outlined
                  : Icons.volume_up_outlined,
            ),
            color: HanduniaTokens.braise,
          ),
        ],
      ),
    );
  }

  Widget _routeSection(
    Map<String, dynamic>? origin,
    Map<String, dynamic>? destination,
    String advisory,
  ) {
    return _section(
      title: 'Parcours patrimonial',
      icon: Icons.alt_route_rounded,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          _placeSelector(
            label: 'Départ',
            value: _originId,
            onChanged: (value) {
              setState(() {
                _originId = value;
                if (_destinationId == value) {
                  _destinationId = _bestDestination(value);
                }
                _route = null;
              });
              unawaited(_loadRoute());
            },
          ),
          const SizedBox(height: 8),
          _placeSelector(
            label: 'Destination',
            value: _destinationId,
            excludeId: _originId,
            onChanged: (value) {
              setState(() {
                _destinationId = value;
                _route = null;
                _guide = '';
              });
              unawaited(_loadRoute());
            },
          ),
          const SizedBox(height: 12),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              for (final mode in HanduniaTravelMode.values)
                ChoiceChip(
                  selected: _mode == mode,
                  avatar: Icon(mode.icon, size: 18),
                  label: Text(mode.label),
                  onSelected: (_) {
                    setState(() {
                      _mode = mode;
                      _route = null;
                    });
                    unawaited(_loadRoute());
                  },
                ),
            ],
          ),
          if (_loadingRoute) ...[
            const SizedBox(height: 12),
            const LinearProgressIndicator(minHeight: 2),
          ],
          if (_route != null) ...[
            const SizedBox(height: 12),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                _metric(
                  Icons.straighten_rounded,
                  _distanceLabel(_asDouble(_route?['distance_m']) ?? 0),
                ),
                _metric(
                  Icons.schedule_rounded,
                  _durationLabel(_asDouble(_route?['duration_s']) ?? 0),
                ),
                _metric(
                  Icons.layers_outlined,
                  _route?['cached'] == true ? 'hors-ligne' : 'OSM live',
                ),
              ],
            ),
          ],
          if (advisory.isNotEmpty) ...[
            const SizedBox(height: 10),
            Text(
              advisory,
              style: _karla(
                size: 11.5,
                color: HanduniaTokens.terre,
                weight: FontWeight.w700,
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _memorySection() {
    return _section(
      title: 'Mémoire qui accompagne',
      icon: Icons.auto_awesome_outlined,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Expanded(
                child: FilledButton.icon(
                  onPressed:
                      _loadingGuide ? null : () => _loadGuide(reconstruction: false),
                  icon: const Icon(Icons.explore_outlined),
                  label: const Text('Guide du lieu'),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: OutlinedButton.icon(
                  onPressed:
                      _loadingGuide ? null : () => _loadGuide(reconstruction: true),
                  icon: const Icon(Icons.history_toggle_off_rounded),
                  label: const Text('Reconstituer'),
                ),
              ),
            ],
          ),
          if (_loadingGuide) ...[
            const SizedBox(height: 12),
            const LinearProgressIndicator(minHeight: 2),
          ],
          if (_guide.isNotEmpty) ...[
            const SizedBox(height: 12),
            Row(
              children: [
                Icon(
                  _reconstruction
                      ? Icons.history_edu_outlined
                      : Icons.record_voice_over_outlined,
                  color: HanduniaTokens.braise,
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    _reconstruction
                        ? 'Reconstitution sourcée'
                        : 'Guide sourcé',
                    style: _karla(
                      weight: FontWeight.w800,
                      color: HanduniaTokens.braise,
                    ),
                  ),
                ),
                IconButton(
                  onPressed: _toggleSpeech,
                  icon: Icon(
                    _speaking
                        ? Icons.stop_circle_outlined
                        : Icons.volume_up_outlined,
                  ),
                  color: HanduniaTokens.braise,
                ),
              ],
            ),
            Text(
              _guide,
              style: const TextStyle(
                fontFamily: 'Fraunces',
                fontSize: 15.5,
                height: 1.5,
                color: HanduniaTokens.ivoire,
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _recommendationsSection(List<Map<String, dynamic>> recommendations) {
    return _section(
      title: 'Prochaines haltes',
      icon: Icons.near_me_outlined,
      child: recommendations.isEmpty
          ? Text(
              'Pas assez de lieux géolocalisés pour proposer une suite.',
              style: _karla(color: HanduniaTokens.cendre),
            )
          : Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                for (final place in recommendations)
                  ActionChip(
                    avatar: const Icon(Icons.place_outlined, size: 17),
                    label: Text(
                      (place['name']?.toString() ?? 'Lieu') +
                          ' · ' +
                          _distanceLabel(
                            _asDouble(place['__distance_m']) ?? 0,
                          ),
                    ),
                    onPressed: () {
                      setState(() {
                        _destinationId = place['id']?.toString();
                        _route = null;
                        _guide = '';
                      });
                      unawaited(_loadRoute());
                    },
                  ),
              ],
            ),
    );
  }

  Widget _gapsSection() {
    final gaps = _memoryGaps;
    return _section(
      title: 'Zones d’ombre',
      icon: Icons.lightbulb_outline_rounded,
      child: gaps.isEmpty
          ? Text(
              'Les lieux visibles disposent déjà de voix et de souvenirs.',
              style: _karla(color: HanduniaTokens.cendre),
            )
          : Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text(
                  'Ces lieux manquent encore de voix ou de souvenirs. '
                  'Le guide les signale au lieu de compléter les vides.',
                  style: _karla(size: 12.5, color: HanduniaTokens.cendre),
                ),
                const SizedBox(height: 8),
                Wrap(
                  spacing: 7,
                  runSpacing: 7,
                  children: [
                    for (final place in gaps)
                      Chip(
                        avatar: const Icon(
                          Icons.radio_button_unchecked,
                          size: 15,
                        ),
                        label: Text(place['name']?.toString() ?? 'Lieu'),
                      ),
                  ],
                ),
              ],
            ),
    );
  }

  Widget _placeSelector({
    required String label,
    required String? value,
    required ValueChanged<String?> onChanged,
    String? excludeId,
  }) {
    final options = _located
        .where((place) => place['id']?.toString() != excludeId)
        .toList(growable: false);
    final safeValue = options.any((place) => place['id']?.toString() == value)
        ? value
        : null;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12),
      decoration: BoxDecoration(
        color: HanduniaTokens.nuit,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: HanduniaTokens.bordureForte),
      ),
      child: Row(
        children: [
          SizedBox(
            width: 86,
            child: Text(
              label,
              style: _karla(
                size: 12,
                weight: FontWeight.w800,
                color: HanduniaTokens.cendre,
              ),
            ),
          ),
          Expanded(
            child: DropdownButtonHideUnderline(
              child: DropdownButton<String>(
                value: safeValue,
                isExpanded: true,
                dropdownColor: HanduniaTokens.nuitPortee,
                hint: Text(
                  'Choisir un lieu',
                  style: _karla(color: HanduniaTokens.cendre),
                ),
                items: [
                  for (final place in options)
                    DropdownMenuItem<String>(
                      value: place['id']?.toString(),
                      child: Text(
                        place['name']?.toString() ?? 'Lieu',
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: _karla(weight: FontWeight.w700),
                      ),
                    ),
                ],
                onChanged: onChanged,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _section({
    required String title,
    required IconData icon,
    required Widget child,
  }) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: HanduniaTokens.nuitPortee,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: HanduniaTokens.bordureForte),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Icon(icon, size: 20, color: HanduniaTokens.braise),
              const SizedBox(width: 8),
              Text(
                title,
                style: const TextStyle(
                  fontFamily: 'Fraunces',
                  fontWeight: FontWeight.w600,
                  fontSize: 18,
                  color: HanduniaTokens.ivoire,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          child,
        ],
      ),
    );
  }

  Widget _metric(IconData icon, String text) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 7),
      decoration: BoxDecoration(
        color: HanduniaTokens.nuit,
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: HanduniaTokens.bordureForte),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 15, color: HanduniaTokens.braise),
          const SizedBox(width: 5),
          Text(text, style: _karla(size: 11.5, weight: FontWeight.w800)),
        ],
      ),
    );
  }
}

TextStyle _karla({
  double size = 14,
  FontWeight weight = FontWeight.w400,
  Color color = HanduniaTokens.ivoire,
}) =>
    TextStyle(
      fontFamily: 'Karla',
      fontSize: size,
      fontWeight: weight,
      height: 1.35,
      color: color,
    );

int _count(dynamic value) {
  if (value is num) return value.toInt();
  return int.tryParse(value?.toString() ?? '') ?? 0;
}

double? _asDouble(dynamic value) {
  if (value is num) return value.toDouble();
  return double.tryParse(value?.toString() ?? '');
}

String _distanceLabel(double meters) {
  if (meters < 1000) return meters.round().toString() + ' m';
  return (meters / 1000).toStringAsFixed(1) + ' km';
}

String _durationLabel(double seconds) {
  if (seconds <= 0) return 'durée —';
  final minutes = (seconds / 60).round();
  if (minutes < 60) return minutes.toString() + ' min';
  final hours = minutes ~/ 60;
  final rest = minutes % 60;
  return rest == 0
      ? hours.toString() + ' h'
      : hours.toString() + ' h ' + rest.toString();
}
