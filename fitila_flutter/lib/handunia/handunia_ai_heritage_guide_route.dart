import 'dart:async';
import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_tts/flutter_tts.dart';
import 'package:geolocator/geolocator.dart';

import '../core/fitila_media.dart';
import '../ui/reference_creation_ui.dart';
import 'handunia_consultation_extended_data.dart';
import 'handunia_consultation_ui.dart';
import 'handunia_map_data.dart';
import 'handunia_unified_map.dart';

enum HanduniaTravelMode {
  walking(
    label: 'À pied',
    serviceMode: 'walking',
    icon: Icons.directions_walk_rounded,
  ),
  bicycle(
    label: 'Vélo',
    serviceMode: 'bicycle',
    icon: Icons.pedal_bike_rounded,
  ),
  horse(
    label: 'Cheval',
    serviceMode: 'horse',
    icon: Icons.landscape_rounded,
  );

  const HanduniaTravelMode({
    required this.label,
    required this.serviceMode,
    required this.icon,
  });

  final String label;
  final String serviceMode;
  final IconData icon;

  bool get requiresLocalValidation => this == HanduniaTravelMode.horse;
}

class HanduniaAiHeritageGuideRoute extends StatefulWidget {
  const HanduniaAiHeritageGuideRoute({
    super.key,
    this.initialPlaces,
    this.initialDestination,
  });

  final List<Map<String, dynamic>>? initialPlaces;
  final Map<String, dynamic>? initialDestination;

  @override
  State<HanduniaAiHeritageGuideRoute> createState() =>
      _HanduniaAiHeritageGuideRouteState();
}

class _HanduniaAiHeritageGuideRouteState
    extends State<HanduniaAiHeritageGuideRoute> {
  final FlutterTts _tts = FlutterTts();
  final FitilaMediaController _media = FitilaMediaController();

  List<Map<String, dynamic>> _memoryPlaces = const <Map<String, dynamic>>[];
  List<Map<String, dynamic>> _routePlaces = const <Map<String, dynamic>>[];
  List<Map<String, double>> _routePoints = const <Map<String, double>>[];

  Map<String, dynamic>? _start;
  Map<String, dynamic>? _end;
  Map<String, dynamic>? _guideAnswer;

  HanduniaTravelMode _mode = HanduniaTravelMode.walking;
  bool _loadingPlaces = true;
  bool _routing = false;
  bool _asking = false;
  bool _recording = false;
  bool _immersive = false;
  bool _speaking = false;
  String? _notice;
  String? _routeWarning;
  double _distanceM = 0;
  double _durationS = 0;
  double _routeProgress = 0;
  Timer? _replayTimer;

  @override
  void initState() {
    super.initState();
    unawaited(_configureTts());
    final initial = widget.initialPlaces;
    if (initial != null) {
      _memoryPlaces = List<Map<String, dynamic>>.from(initial);
      _loadingPlaces = false;
    } else {
      unawaited(_loadPlaces());
    }
    final destination = widget.initialDestination;
    if (destination != null && _hasCoordinates(destination)) {
      _end = Map<String, dynamic>.from(destination);
    }
  }

  Future<void> _configureTts() async {
    try {
      await _tts.setLanguage('fr-FR');
      await _tts.setSpeechRate(.44);
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
    } catch (_) {
      // La visite textuelle reste disponible si le moteur TTS du terminal
      // n'est pas exposé sur la plateforme courante.
    }
  }

  @override
  void dispose() {
    _replayTimer?.cancel();
    unawaited(_tts.stop().then<void>((_) {}));
    _media.dispose();
    super.dispose();
  }

  TextStyle _karla({
    double size = 14,
    FontWeight weight = FontWeight.w400,
    Color color = HanduniaTokens.ivoire,
    double height = 1.4,
  }) =>
      TextStyle(
        fontFamily: 'Karla',
        fontSize: size,
        fontWeight: weight,
        color: color,
        height: height,
      );

  TextStyle _fraunces({
    double size = 18,
    Color color = HanduniaTokens.ivoire,
    double height = 1.3,
  }) =>
      TextStyle(
        fontFamily: 'Fraunces',
        fontSize: size,
        fontWeight: FontWeight.w600,
        color: color,
        height: height,
      );

  bool _hasCoordinates(Map<String, dynamic>? place) =>
      _double(place?['latitude']) != null &&
      _double(place?['longitude']) != null;

  double? _double(dynamic value) {
    if (value is num) return value.toDouble();
    return double.tryParse(value?.toString() ?? '');
  }

  String _placeName(Map<String, dynamic>? place) {
    if (place == null) return '';
    return place['name']?.toString().trim().isNotEmpty == true
        ? place['name'].toString().trim()
        : place['display_name']?.toString().trim() ?? '';
  }

  Future<void> _loadPlaces() async {
    try {
      final places = await HanduniaConsultationExtendedData.fetchLivingMap();
      if (!mounted) return;
      setState(() {
        _memoryPlaces = places;
        _notice = null;
      });
    } catch (_) {
      if (mounted) {
        setState(() {
          _notice =
              'Les mémoires locales sont momentanément indisponibles. La carte et le calcul de trajet restent utilisables.';
        });
      }
    } finally {
      if (mounted) setState(() => _loadingPlaces = false);
    }
  }

  Future<void> _useMyPosition() async {
    try {
      if (!await Geolocator.isLocationServiceEnabled()) {
        setState(() => _notice = 'Activez la localisation pour utiliser votre position.');
        return;
      }
      var permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
      }
      if (permission == LocationPermission.denied ||
          permission == LocationPermission.deniedForever) {
        setState(() => _notice = 'Localisation non autorisée.');
        return;
      }
      setState(() => _notice = 'Recherche de votre position…');
      final position = await Geolocator.getCurrentPosition();
      final place = await HanduniaMapData.reversePlace(
        latitude: position.latitude,
        longitude: position.longitude,
      );
      if (!mounted) return;
      setState(() {
        _start = <String, dynamic>{
          ...place,
          'id': '__guide_current_position__',
          'name': 'Ma position · ${_placeName(place)}',
        };
        _notice = null;
      });
      await _calculateRouteIfReady();
    } catch (_) {
      if (mounted) {
        setState(() => _notice = 'Impossible de déterminer votre position.');
      }
    }
  }

  Future<void> _pickPlace({required bool start}) async {
    final result = await showModalBottomSheet<Map<String, dynamic>>(
      context: context,
      isScrollControlled: true,
      backgroundColor: HanduniaTokens.nuit,
      builder: (_) => _HanduniaPlaceSearchSheet(
        memoryPlaces: _memoryPlaces,
        title: start ? 'Choisir le départ' : 'Choisir l’arrivée',
      ),
    );
    if (result == null || !mounted) return;
    setState(() {
      if (start) {
        _start = result;
      } else {
        _end = result;
      }
      _clearRoute(keepEndpoints: true);
    });
    await _calculateRouteIfReady();
  }

  void _swapEndpoints() {
    setState(() {
      final previous = _start;
      _start = _end;
      _end = previous;
      _clearRoute(keepEndpoints: true);
    });
    unawaited(_calculateRouteIfReady());
  }

  void _clearRoute({bool keepEndpoints = true}) {
    _replayTimer?.cancel();
    _replayTimer = null;
    _routePoints = const <Map<String, double>>[];
    _routePlaces = const <Map<String, dynamic>>[];
    _distanceM = 0;
    _durationS = 0;
    _routeProgress = 0;
    _routeWarning = null;
    _guideAnswer = null;
    if (!keepEndpoints) {
      _start = null;
      _end = null;
    }
  }

  Future<void> _calculateRouteIfReady() async {
    if (_start == null || _end == null || _routing) return;
    await _calculateRoute();
  }

  Future<void> _calculateRoute() async {
    final start = _start;
    final end = _end;
    if (!_hasCoordinates(start) || !_hasCoordinates(end) || _routing) return;
    final startPlace = start!;
    final endPlace = end!;
    setState(() {
      _routing = true;
      _notice = 'Calcul du parcours réel sur OpenStreetMap…';
      _guideAnswer = null;
      _routeProgress = 0;
    });
    try {
      final result = await HanduniaMapData.route(
        fromLatitude: _double(startPlace['latitude'])!,
        fromLongitude: _double(startPlace['longitude'])!,
        toLatitude: _double(endPlace['latitude'])!,
        toLongitude: _double(endPlace['longitude'])!,
        mode: _mode.serviceMode,
      );
      if (!mounted) return;
      setState(() {
        _routePoints = List<Map<String, double>>.from(result['points'] as List);
        _routePlaces = result['places'] is List
            ? List<Map<String, dynamic>>.from(
                (result['places'] as List).whereType<Map>(),
              )
            : const <Map<String, dynamic>>[];
        _distanceM = _double(result['distance_m']) ?? 0;
        _durationS = _double(result['duration_s']) ?? 0;
        _routeWarning = result['warning']?.toString().trim().isNotEmpty == true
            ? result['warning'].toString().trim()
            : null;
        _notice = 'Parcours prêt · vous pouvez lancer la visite racontée.';
      });
    } catch (_) {
      if (mounted) {
        setState(() {
          _routePoints = const <Map<String, double>>[];
          _routePlaces = const <Map<String, dynamic>>[];
          _notice =
              'Aucun parcours disponible pour ce mode. Choisissez d’autres points ou réessayez.';
        });
      }
    } finally {
      if (mounted) setState(() => _routing = false);
    }
  }

  String get _routeSummary {
    if (_routePoints.length < 2) return 'Aucun trajet actif';
    final km = _distanceM / 1000;
    final minutes = (_durationS / 60).round();
    final duration = minutes > 0 ? ' · ~$minutes min' : '';
    return '${_mode.label} · ${km.toStringAsFixed(km < 10 ? 1 : 0)} km$duration';
  }

  List<Map<String, dynamic>> get _recommendations {
    if (_routePoints.length < 2) return const <Map<String, dynamic>>[];
    final candidates = _memoryPlaces
        .where(_hasCoordinates)
        .map((place) {
          var nearest = double.infinity;
          final stride = math.max(1, (_routePoints.length / 80).ceil());
          for (var i = 0; i < _routePoints.length; i += stride) {
            final point = _routePoints[i];
            nearest = math.min(
              nearest,
              HanduniaMapData.distanceMeters(
                _double(place['latitude'])!,
                _double(place['longitude'])!,
                point['latitude']!,
                point['longitude']!,
              ),
            );
          }
          return <String, dynamic>{...place, '_route_distance_m': nearest};
        })
        .where((place) => (_double(place['_route_distance_m']) ?? double.infinity) <= 25000)
        .toList(growable: false);
    candidates.sort(
      (a, b) => (_double(a['_route_distance_m']) ?? double.infinity).compareTo(
        _double(b['_route_distance_m']) ?? double.infinity,
      ),
    );
    return candidates.take(6).toList(growable: false);
  }

  Future<void> _askGuide({bool reconstruction = false, String? voicePrompt}) async {
    if (_asking || _routePoints.length < 2) return;
    setState(() {
      _asking = true;
      _notice = reconstruction
          ? 'Reconstitution contextuelle à partir des témoignages autorisés…'
          : 'La mémoire prépare votre visite…';
    });
    try {
      final stopNames = _routePlaces
          .map((place) => _placeName(place))
          .where((name) => name.isNotEmpty)
          .take(5)
          .join(', ');
      final modeNote = _mode == HanduniaTravelMode.horse
          ? 'Le mode cheval est seulement un tracé indicatif sur réseau piéton, à confirmer localement.'
          : '';
      final question = voicePrompt?.trim().isNotEmpty == true
          ? voicePrompt!.trim()
          : reconstruction
              ? 'Reconstitue en une courte scène narrative, uniquement à partir des témoignages disponibles et sans invention, ce que l’on peut comprendre du patrimoine entre ${_placeName(_start)} et ${_placeName(_end)}. Cite chaque fait. Étapes cartographiques: $stopNames. $modeNote'
              : 'Guide-moi de ${_placeName(_start)} à ${_placeName(_end)} en mode ${_mode.label}. Raconte seulement ce que les témoignages Handunia permettent d’affirmer sur les lieux traversés, signale clairement les lacunes et cite chaque fait. Étapes cartographiques: $stopNames. $modeNote';

      String? lieuId;
      final endId = _end?['id']?.toString() ?? '';
      if (endId.isNotEmpty && !endId.startsWith('__')) {
        lieuId = endId;
      }
      final answer = await HanduniaConsultationExtendedData.askMemory(
        question,
        lieuId: lieuId,
      );
      if (!mounted) return;
      setState(() {
        _guideAnswer = answer;
        _notice = answer['state'] == 'void'
            ? 'Lacune de mémoire détectée sur ce parcours.'
            : null;
      });
    } catch (_) {
      if (mounted) {
        setState(() {
          _guideAnswer = <String, dynamic>{
            'state': 'unavailable',
            'answer': 'Mémoire momentanément inaccessible.',
          };
          _notice = 'Assistant patrimonial momentanément indisponible.';
        });
      }
    } finally {
      if (mounted) setState(() => _asking = false);
    }
  }

  Future<void> _startVoiceQuestion() async {
    if (_recording || _asking) return;
    try {
      await _media.startHanduniaOpusAudio();
      if (mounted) setState(() => _recording = true);
    } catch (_) {
      if (mounted) setState(() => _notice = 'Microphone indisponible.');
    }
  }

  Future<void> _stopVoiceQuestion() async {
    if (!_recording) return;
    final asset = await _media.stopAudio();
    if (!mounted) return;
    setState(() => _recording = false);
    if (asset == null) return;
    try {
      final transcript = await HanduniaConsultationExtendedData.transcribeBariba(
        await asset.readBytes(),
      );
      if (transcript == null || transcript.trim().isEmpty) {
        setState(() => _notice = 'Transcription vocale indisponible.');
        return;
      }
      await _askGuide(voicePrompt: transcript);
    } catch (_) {
      if (mounted) setState(() => _notice = 'Transcription vocale indisponible.');
    }
  }

  void _toggleReplay() {
    if (_routePoints.length < 2) return;
    if (_replayTimer != null) {
      _replayTimer?.cancel();
      setState(() => _replayTimer = null);
      return;
    }
    if (_routeProgress >= 1) {
      _routeProgress = 0;
    }
    _replayTimer = Timer.periodic(const Duration(milliseconds: 120), (timer) {
      if (!mounted) {
        timer.cancel();
        return;
      }
      final next = _routeProgress + .01;
      if (next >= 1) {
        timer.cancel();
        setState(() {
          _routeProgress = 1;
          _replayTimer = null;
        });
      } else {
        setState(() => _routeProgress = next);
      }
    });
    setState(() {});
  }

  Future<void> _toggleNarration() async {
    if (_speaking) {
      await _tts.stop();
      if (mounted) setState(() => _speaking = false);
      return;
    }
    final answer = _guideAnswer?['answer']?.toString().trim() ?? '';
    if (answer.isEmpty) {
      setState(() => _notice = 'Demandez d’abord à la mémoire de raconter ce parcours.');
      return;
    }
    final spoken = answer.replaceAll(RegExp(r'\[\d+\]'), '');
    setState(() => _speaking = true);
    await _tts.speak(spoken);
  }

  List<Map<String, dynamic>> get _mapPlaces {
    final places = <Map<String, dynamic>>[];
    if (_start != null && _hasCoordinates(_start)) {
      places.add(<String, dynamic>{
        ..._start!,
        'id': _start!['id']?.toString() ?? '__guide_start__',
        'name': 'Départ · ${_placeName(_start)}',
      });
    }
    if (_end != null && _hasCoordinates(_end)) {
      places.add(<String, dynamic>{
        ..._end!,
        'id': _end!['id']?.toString() ?? '__guide_end__',
        'name': 'Arrivée · ${_placeName(_end)}',
      });
    }
    for (final place in _recommendations) {
      final id = place['id']?.toString();
      if (id == null || places.any((item) => item['id']?.toString() == id)) continue;
      places.add(place);
    }
    return places;
  }

  Widget _endpointCard({
    required String label,
    required Map<String, dynamic>? place,
    required VoidCallback onPick,
    VoidCallback? trailingAction,
    IconData icon = Icons.place_outlined,
  }) {
    return Material(
      color: HanduniaTokens.nuitPortee,
      borderRadius: BorderRadius.circular(22),
      child: InkWell(
        borderRadius: BorderRadius.circular(22),
        onTap: onPick,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(13, 11, 9, 11),
          child: Row(
            children: [
              Icon(icon, color: HanduniaTokens.braise, size: 22),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      label,
                      style: _karla(
                        size: 11.5,
                        weight: FontWeight.w700,
                        color: HanduniaTokens.cendre,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      place == null ? 'Choisir sur la carte' : _placeName(place),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: _karla(weight: FontWeight.w700),
                    ),
                  ],
                ),
              ),
              if (trailingAction != null)
                IconButton(
                  onPressed: trailingAction,
                  icon: const Icon(Icons.my_location_rounded),
                  color: HanduniaTokens.terre,
                )
              else
                const Icon(
                  Icons.chevron_right_rounded,
                  color: HanduniaTokens.cendre,
                ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _answerCard() {
    final answer = _guideAnswer;
    if (answer == null) return const SizedBox.shrink();
    final state = answer['state']?.toString() ?? 'void';
    final color = state == 'sourced'
        ? HanduniaTokens.braise
        : state == 'refusal'
            ? HanduniaTokens.terre
            : HanduniaTokens.cendre;
    return Container(
      padding: const EdgeInsets.all(15),
      decoration: BoxDecoration(
        color: HanduniaTokens.nuitPortee,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: color),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(
                state == 'sourced'
                    ? Icons.auto_stories_outlined
                    : state == 'void'
                        ? Icons.blur_on_rounded
                        : Icons.shield_outlined,
                color: color,
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  state == 'sourced'
                      ? 'Récit sourcé'
                      : state == 'void'
                          ? 'Lacune de mémoire'
                          : state == 'refusal'
                              ? 'Accès protégé'
                              : 'Mémoire indisponible',
                  style: _fraunces(size: 16, color: color),
                ),
              ),
              if (state == 'sourced')
                IconButton(
                  onPressed: _toggleNarration,
                  icon: Icon(
                    _speaking
                        ? Icons.stop_circle_outlined
                        : Icons.volume_up_outlined,
                  ),
                  color: HanduniaTokens.braise,
                ),
            ],
          ),
          const SizedBox(height: 9),
          if (state == 'sourced')
            HanduniaSourcedAnswer(
              answer: answer['answer']?.toString() ?? '',
              sources: (answer['sources'] as List? ?? const <dynamic>[])
                  .whereType<Map>()
                  .map((source) => Map<String, dynamic>.from(source))
                  .toList(growable: false),
            )
          else
            Text(
              state == 'refusal'
                  ? answer['protocol']?.toString() ?? 'Accès protégé.'
                  : answer['answer']?.toString() ??
                      'La communauté ne l’a pas encore raconté.',
              style: _fraunces(size: 16, color: color, height: 1.5),
            ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final recommendations = _recommendations;
    final routeReady = _routePoints.length >= 2;
    return Scaffold(
      backgroundColor: HanduniaTokens.nuit,
      bottomNavigationBar: const FitilaBridgedBottomNav(selectedIndex: 0),
      body: SafeArea(
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(12, 8, 12, 10),
              child: Row(
                children: [
                  HanduniaNamedAction(
                    label: 'Retour',
                    color: HanduniaTokens.cendre,
                    fontSize: 8,
                    maxWidth: 52,
                    child: SizedBox(
                      width: 44,
                      height: 44,
                      child: IconButton(
                        tooltip: 'Retour',
                        onPressed: () => Navigator.maybePop(context),
                        icon: const Icon(Icons.arrow_back_rounded, size: 23),
                        color: HanduniaTokens.ivoire,
                        style: IconButton.styleFrom(
                          backgroundColor: HanduniaTokens.nuitPortee,
                          side: const BorderSide(
                            color: HanduniaTokens.bordureForte,
                          ),
                          elevation: 2,
                          shadowColor: const Color(0x216B4A22),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(16),
                          ),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'Guide IA',
                      textAlign: TextAlign.center,
                      style: _fraunces(size: 22, height: 1.05),
                    ),
                  ),
                  const SizedBox(width: 8),
                  SizedBox(
                    width: 44,
                    height: 44,
                    child: IconButton(
                      onPressed: routeReady
                          ? () => setState(() => _immersive = !_immersive)
                          : null,
                      icon: Icon(
                        _immersive
                            ? Icons.view_in_ar_rounded
                            : Icons.threed_rotation_rounded,
                        size: 21,
                      ),
                      color: _immersive
                          ? HanduniaTokens.braise
                          : HanduniaTokens.cendre,
                      style: IconButton.styleFrom(
                        backgroundColor: HanduniaTokens.nuitPortee,
                        side: const BorderSide(
                          color: HanduniaTokens.bordureForte,
                        ),
                        elevation: 1,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(16),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
            Expanded(
              child: ListView(
                padding: const EdgeInsets.fromLTRB(14, 4, 14, 28),
                children: [
                  _endpointCard(
                    label: 'Départ',
                    place: _start,
                    onPick: () => _pickPlace(start: true),
                    trailingAction: _useMyPosition,
                    icon: Icons.trip_origin_rounded,
                  ),
                  Center(
                    child: IconButton(
                      onPressed: _start != null || _end != null ? _swapEndpoints : null,
                      icon: const Icon(Icons.swap_vert_rounded),
                      color: HanduniaTokens.cendre,
                    ),
                  ),
                  _endpointCard(
                    label: 'Arrivée',
                    place: _end,
                    onPick: () => _pickPlace(start: false),
                    icon: Icons.flag_outlined,
                  ),
                  const SizedBox(height: 12),
                  SegmentedButton<HanduniaTravelMode>(
                    showSelectedIcon: false,
                    segments: [
                      for (final mode in HanduniaTravelMode.values)
                        ButtonSegment<HanduniaTravelMode>(
                          value: mode,
                          icon: Tooltip(
                            message: mode.label,
                            child: Icon(mode.icon, size: 20),
                          ),
                        ),
                    ],
                    selected: <HanduniaTravelMode>{_mode},
                    onSelectionChanged: _routing
                        ? null
                        : (values) {
                            setState(() {
                              _mode = values.first;
                              _clearRoute(keepEndpoints: true);
                            });
                            unawaited(_calculateRouteIfReady());
                          },
                    style: ButtonStyle(
                      foregroundColor: WidgetStateProperty.resolveWith(
                        (states) => states.contains(WidgetState.selected)
                            ? HanduniaTokens.encre
                            : HanduniaTokens.cendre,
                      ),
                      backgroundColor: WidgetStateProperty.resolveWith(
                        (states) => states.contains(WidgetState.selected)
                            ? HanduniaTokens.braise
                            : HanduniaTokens.nuitPortee,
                      ),
                    ),
                  ),
                  if (_mode.requiresLocalValidation) ...[
                    const SizedBox(height: 5),
                    Semantics(
                      label:
                          'Cheval : itinéraire indicatif. Confirmer localement les pistes et autorisations.',
                      child: Icon(
                        Icons.warning_amber_rounded,
                        color: HanduniaTokens.terre,
                        size: 18,
                      ),
                    ),
                  ],
                  const SizedBox(height: 12),
                  if (_mapPlaces.isNotEmpty)
                    HanduniaUnifiedMap(
                      places: _mapPlaces,
                      height: _immersive ? 430 : 330,
                      showSelectionCard: false,
                      initialZoom: routeReady ? 8.5 : 6.4,
                      routePoints: _routePoints,
                      routeProgress: routeReady ? _routeProgress : null,
                      routeLabel: routeReady ? _routeSummary : null,
                      immersive: _immersive,
                    )
                  else
                    Container(
                      height: 220,
                      alignment: Alignment.center,
                      decoration: BoxDecoration(
                        color: HanduniaTokens.nuitPortee,
                        borderRadius: BorderRadius.circular(22),
                        border: Border.all(color: HanduniaTokens.bordureForte),
                      ),
                      child: Semantics(
                        label: 'Choisissez un départ et une arrivée',
                        child: Icon(
                          Icons.route_rounded,
                          size: 54,
                          color: HanduniaTokens.cendre,
                        ),
                      ),
                    ),
                  if (_notice != null) ...[
                    const SizedBox(height: 7),
                    Semantics(
                      label: _notice!,
                      child: const Center(
                        child: Icon(
                          Icons.info_outline_rounded,
                          color: HanduniaTokens.terre,
                          size: 18,
                        ),
                      ),
                    ),
                  ],
                  if (_routing || _asking || _loadingPlaces) ...[
                    const SizedBox(height: 12),
                    const Center(
                      child: HaloDensite(valeur: .52, loading: true, size: 62),
                    ),
                  ],
                  if (routeReady) ...[
                    const SizedBox(height: 12),
                    Container(
                      padding: const EdgeInsets.all(13),
                      decoration: BoxDecoration(
                        color: HanduniaTokens.nuitPortee,
                        borderRadius: BorderRadius.circular(22),
                        border: Border.all(color: HanduniaTokens.bordureForte),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              const Icon(
                                Icons.route_rounded,
                                color: HanduniaTokens.braise,
                              ),
                              const SizedBox(width: 8),
                              Expanded(
                                child: Text(
                                  _routeSummary,
                                  style: _fraunces(size: 16),
                                ),
                              ),
                            ],
                          ),
                          if (_routeWarning != null) ...[
                            const SizedBox(height: 8),
                            Text(
                              _routeWarning!,
                              style: _karla(
                                size: 11.5,
                                color: HanduniaTokens.terre,
                              ),
                            ),
                          ],
                          const SizedBox(height: 10),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                            children: [
                              Semantics(
                                button: true,
                                label: _replayTimer == null
                                    ? 'Rejouer le trajet'
                                    : 'Mettre le trajet en pause',
                                child: IconButton.outlined(
                                  onPressed: _toggleReplay,
                                  icon: Icon(
                                    _replayTimer == null
                                        ? Icons.play_arrow_rounded
                                        : Icons.pause_rounded,
                                  ),
                                  color: HanduniaTokens.braise,
                                ),
                              ),
                              Semantics(
                                button: true,
                                label: 'Raconter le trajet',
                                child: IconButton.filled(
                                  onPressed: _asking ? null : () => _askGuide(),
                                  style: IconButton.styleFrom(
                                    backgroundColor: HanduniaTokens.braise,
                                    foregroundColor: HanduniaTokens.encre,
                                  ),
                                  icon: const Icon(Icons.auto_awesome_rounded),
                                ),
                              ),
                              Semantics(
                                button: true,
                                label: 'Reconstituer le trajet',
                                child: IconButton.outlined(
                                  onPressed: _asking
                                      ? null
                                      : () => _askGuide(reconstruction: true),
                                  icon: const Icon(Icons.history_edu_rounded),
                                  color: HanduniaTokens.ivoire,
                                ),
                              ),
                              Semantics(
                                button: true,
                                label: 'Maintenir pour parler au guide',
                                child: GestureDetector(
                                  onLongPressStart: (_) => _startVoiceQuestion(),
                                  onLongPressEnd: (_) => _stopVoiceQuestion(),
                                  child: Container(
                                    width: 48,
                                    height: 48,
                                    decoration: BoxDecoration(
                                      shape: BoxShape.circle,
                                      color: _recording
                                          ? HanduniaTokens.terre
                                          : HanduniaTokens.nuit,
                                      border: Border.all(
                                        color: _recording
                                            ? HanduniaTokens.terre
                                            : HanduniaTokens.bordureForte,
                                      ),
                                    ),
                                    child: Icon(
                                      _recording
                                          ? Icons.stop_rounded
                                          : Icons.mic_rounded,
                                      color: _recording
                                          ? Colors.white
                                          : HanduniaTokens.braise,
                                    ),
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ],
                  if (recommendations.isNotEmpty) ...[
                    const SizedBox(height: 16),
                    Text('À voir', style: _fraunces(size: 17)),
                    const SizedBox(height: 8),
                    for (final place in recommendations)
                      Padding(
                        padding: const EdgeInsets.only(bottom: 7),
                        child: Material(
                          color: HanduniaTokens.nuitPortee,
                          borderRadius: BorderRadius.circular(14),
                          child: ListTile(
                            leading: const Icon(
                              Icons.local_library_outlined,
                              color: HanduniaTokens.braise,
                            ),
                            title: Text(
                              _placeName(place),
                              style: _karla(weight: FontWeight.w700),
                            ),
                            subtitle: Text(
                              '${((_double(place['_route_distance_m']) ?? 0) / 1000).toStringAsFixed(1)} km du tracé · ${place['voice_count'] ?? 0} voix',
                              style: _karla(
                                size: 11.5,
                                color: HanduniaTokens.cendre,
                              ),
                            ),
                            trailing: Semantics(
                              button: true,
                              label: 'Visiter ce lieu',
                              child: IconButton(
                                onPressed: () {
                                  setState(() {
                                    _end = Map<String, dynamic>.from(place);
                                    _clearRoute(keepEndpoints: true);
                                  });
                                  unawaited(_calculateRouteIfReady());
                                },
                                icon: const Icon(
                                  Icons.chevron_right_rounded,
                                  color: HanduniaTokens.braise,
                                ),
                              ),
                            ),
                          ),
                        ),
                      ),
                  ],
                  if (_guideAnswer != null) ...[
                    const SizedBox(height: 16),
                    _answerCard(),
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _HanduniaPlaceSearchSheet extends StatefulWidget {
  const _HanduniaPlaceSearchSheet({
    required this.memoryPlaces,
    required this.title,
  });

  final List<Map<String, dynamic>> memoryPlaces;
  final String title;

  @override
  State<_HanduniaPlaceSearchSheet> createState() =>
      _HanduniaPlaceSearchSheetState();
}

class _HanduniaPlaceSearchSheetState extends State<_HanduniaPlaceSearchSheet> {
  final TextEditingController _controller = TextEditingController();
  List<Map<String, dynamic>> _results = const <Map<String, dynamic>>[];
  bool _busy = false;
  String? _notice;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  bool _located(Map<String, dynamic> place) =>
      place['latitude'] is num && place['longitude'] is num;

  Future<void> _search() async {
    final query = _controller.text.trim();
    if (query.length < 2 || _busy) return;
    setState(() {
      _busy = true;
      _notice = null;
    });
    try {
      final results = await HanduniaMapData.searchPlaces(query);
      if (!mounted) return;
      setState(() {
        _results = results;
        if (results.isEmpty) _notice = 'Aucun lieu trouvé au Bénin.';
      });
    } catch (_) {
      if (mounted) {
        setState(() => _notice = 'Recherche cartographique indisponible.');
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final memories = widget.memoryPlaces.where(_located).take(8).toList();
    return SafeArea(
      child: Padding(
        padding: EdgeInsets.fromLTRB(
          16,
          14,
          16,
          16 + MediaQuery.viewInsetsOf(context).bottom,
        ),
        child: SizedBox(
          height: math.min(MediaQuery.sizeOf(context).height * .72, 620.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                widget.title,
                style: const TextStyle(
                  fontFamily: 'Fraunces',
                  fontSize: 22,
                  fontWeight: FontWeight.w600,
                  color: HanduniaTokens.ivoire,
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _controller,
                autofocus: true,
                textInputAction: TextInputAction.search,
                onSubmitted: (_) => _search(),
                style: const TextStyle(
                  fontFamily: 'Karla',
                  color: HanduniaTokens.ivoire,
                ),
                decoration: InputDecoration(
                  hintText: 'Lieu…',
                  prefixIcon: const Icon(Icons.search_rounded),
                  suffixIcon: IconButton(
                    onPressed: _search,
                    icon: const Icon(Icons.arrow_forward_rounded),
                  ),
                  filled: true,
                  fillColor: HanduniaTokens.nuitPortee,
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(14),
                  ),
                ),
              ),
              if (_busy) const LinearProgressIndicator(),
              if (_notice != null)
                Padding(
                  padding: const EdgeInsets.only(top: 8),
                  child: Text(
                    _notice!,
                    style: const TextStyle(
                      fontFamily: 'Karla',
                      color: HanduniaTokens.terre,
                    ),
                  ),
                ),
              const SizedBox(height: 10),
              Expanded(
                child: ListView(
                  children: [
                    if (_results.isNotEmpty) ...[
                      const _SheetLabel('Résultats cartographiques'),
                      for (final place in _results)
                        _PlaceTile(
                          place: place,
                          onTap: () => Navigator.pop(context, place),
                        ),
                    ],
                    if (memories.isNotEmpty) ...[
                      const SizedBox(height: 8),
                      const _SheetLabel('Lieux de mémoire géolocalisés'),
                      for (final place in memories)
                        _PlaceTile(
                          place: place,
                          onTap: () => Navigator.pop(context, place),
                        ),
                    ],
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _SheetLabel extends StatelessWidget {
  const _SheetLabel(this.text);

  final String text;

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 6),
        child: Text(
          text,
          style: const TextStyle(
            fontFamily: 'Karla',
            fontSize: 11.5,
            fontWeight: FontWeight.w700,
            color: HanduniaTokens.cendre,
          ),
        ),
      );
}

class _PlaceTile extends StatelessWidget {
  const _PlaceTile({
    required this.place,
    required this.onTap,
  });

  final Map<String, dynamic> place;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final name =
        place['display_name']?.toString().trim().isNotEmpty == true
            ? place['display_name'].toString().trim()
            : place['name']?.toString() ?? 'Lieu';
    return ListTile(
      dense: true,
      contentPadding: EdgeInsets.zero,
      leading: const Icon(
        Icons.location_on_outlined,
        color: HanduniaTokens.braise,
      ),
      title: Text(
        name,
        maxLines: 2,
        overflow: TextOverflow.ellipsis,
        style: const TextStyle(
          fontFamily: 'Karla',
          fontWeight: FontWeight.w700,
          color: HanduniaTokens.ivoire,
        ),
      ),
      subtitle: place['commune']?.toString().trim().isNotEmpty == true
          ? Text(
              place['commune'].toString(),
              style: const TextStyle(
                fontFamily: 'Karla',
                color: HanduniaTokens.cendre,
              ),
            )
          : null,
      onTap: onTap,
    );
  }
}
