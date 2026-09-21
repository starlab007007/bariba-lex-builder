import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_tts/flutter_tts.dart';

import 'handunia_consultation_ui.dart';
import 'handunia_guide_data.dart';
import 'handunia_unified_map.dart';

typedef HanduniaGuideJourneyBuilder = Future<Map<String, dynamic>> Function(
  List<Map<String, dynamic>> places,
  HanduniaTravelMode mode,
  Map<String, dynamic>? initialPlace,
);

typedef HanduniaGuideAskBuilder = Future<Map<String, dynamic>> Function(
  Map<String, dynamic> place,
  String intent,
);

typedef HanduniaGuideGapsBuilder = Future<Map<String, dynamic>> Function(
  String placeId,
);

class HanduniaAiGuideRoute extends StatefulWidget {
  const HanduniaAiGuideRoute({
    super.key,
    this.initialPlace,
    this.initialPlaces,
    this.journeyBuilder,
    this.askBuilder,
    this.gapsBuilder,
  });

  final Map<String, dynamic>? initialPlace;
  final List<Map<String, dynamic>>? initialPlaces;
  final HanduniaGuideJourneyBuilder? journeyBuilder;
  final HanduniaGuideAskBuilder? askBuilder;
  final HanduniaGuideGapsBuilder? gapsBuilder;

  @override
  State<HanduniaAiGuideRoute> createState() => _HanduniaAiGuideRouteState();
}

class _HanduniaAiGuideRouteState extends State<HanduniaAiGuideRoute> {
  final FlutterTts _tts = FlutterTts();

  HanduniaTravelMode _mode = HanduniaTravelMode.walk;
  List<Map<String, dynamic>> _places = const <Map<String, dynamic>>[];
  Map<String, dynamic>? _journey;
  Map<String, dynamic>? _answer;
  Map<String, dynamic>? _reconstruction;
  Map<String, dynamic>? _gaps;
  int _currentIndex = 0;
  bool _loading = true;
  bool _asking = false;
  bool _speaking = false;
  bool _immersive = false;
  String? _notice;

  @override
  void initState() {
    super.initState();
    unawaited(_configureTts());
    unawaited(_load());
  }

  Future<void> _configureTts() async {
    try {
      await _tts.setLanguage('fr-FR');
      await _tts.setSpeechRate(.44);
      await _tts.setPitch(1.0);
      await _tts.awaitSpeakCompletion(true);
    } catch (_) {
      // La visite reste utilisable sans synthèse vocale.
    }
  }

  @override
  void dispose() {
    unawaited(_tts.stop());
    super.dispose();
  }

  List<Map<String, dynamic>> get _stops {
    final raw = _journey?['stops'];
    if (raw is! List) return const <Map<String, dynamic>>[];
    return raw
        .whereType<Map>()
        .map((item) => Map<String, dynamic>.from(item))
        .toList(growable: false);
  }

  List<Map<String, double>> get _pathPoints {
    final raw = _journey?['path_points'];
    if (raw is! List) return const <Map<String, double>>[];
    return raw
        .whereType<Map>()
        .map((item) {
          final lat = item['latitude'];
          final lon = item['longitude'];
          if (lat is! num || lon is! num) return null;
          return <String, double>{
            'latitude': lat.toDouble(),
            'longitude': lon.toDouble(),
          };
        })
        .whereType<Map<String, double>>()
        .toList(growable: false);
  }

  Map<String, dynamic>? get _currentStop {
    final stops = _stops;
    if (stops.isEmpty) return null;
    final index = _currentIndex.clamp(0, stops.length - 1);
    return stops[index];
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _notice = null;
    });
    try {
      final places = widget.initialPlaces == null
          ? await HanduniaGuideData.loadPlaces()
          : List<Map<String, dynamic>>.from(widget.initialPlaces!);
      final initial = widget.initialPlace;
      if (initial != null &&
          !places.any(
            (item) => item['id']?.toString() == initial['id']?.toString(),
          )) {
        places.insert(0, Map<String, dynamic>.from(initial));
      }
      if (!mounted) return;
      setState(() => _places = places);
      await _buildJourney();
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _notice =
            'Le guide ne peut pas charger les lieux pour le moment. Réessayez.';
        _journey = <String, dynamic>{'state': 'unavailable'};
      });
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _buildJourney() async {
    setState(() {
      _loading = true;
      _answer = null;
      _reconstruction = null;
      _gaps = null;
      _currentIndex = 0;
      _notice = null;
    });
    try {
      final builder = widget.journeyBuilder;
      final journey = builder == null
          ? await HanduniaGuideData.buildJourney(
              places: _places,
              mode: _mode,
              initialPlace: widget.initialPlace,
            )
          : await builder(_places, _mode, widget.initialPlace);
      if (!mounted) return;
      setState(() => _journey = journey);
      await _loadStopContext();
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _journey = <String, dynamic>{'state': 'unavailable'};
        _notice =
            'Le parcours est momentanément indisponible. Les lieux restent accessibles.';
      });
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _loadStopContext() async {
    final stop = _currentStop;
    if (stop == null) return;
    final placeId = stop['id']?.toString() ?? '';
    setState(() {
      _answer = null;
      _reconstruction = null;
      _gaps = null;
    });

    if (placeId.isNotEmpty) {
      final gapsBuilder = widget.gapsBuilder;
      final gaps = gapsBuilder == null
          ? await HanduniaGuideData.memoryGaps(placeId)
          : await gapsBuilder(placeId);
      if (mounted) setState(() => _gaps = gaps);
    }
    await _ask('intro');
  }

  Future<void> _ask(String intent) async {
    final stop = _currentStop;
    if (stop == null || _asking) return;
    setState(() {
      _asking = true;
      _notice = null;
    });
    try {
      final builder = widget.askBuilder;
      final result = builder == null
          ? await HanduniaGuideData.askGuide(stop, intent: intent)
          : await builder(stop, intent);
      if (!mounted) return;
      setState(() {
        if (intent == 'reconstruction') {
          _reconstruction = result;
          _immersive = result['state'] == 'sourced';
        } else {
          _answer = result;
        }
        if (result['offline'] == true) {
          _notice = 'Réponse mémorisée hors ligne.';
        }
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _notice =
            'La mémoire est momentanément inaccessible. Le parcours reste disponible.';
      });
    } finally {
      if (mounted) setState(() => _asking = false);
    }
  }

  Future<void> _speak() async {
    final text = _answer?['answer']?.toString().trim() ?? '';
    if (text.isEmpty) return;
    if (_speaking) {
      await _tts.stop();
      if (mounted) setState(() => _speaking = false);
      return;
    }
    setState(() => _speaking = true);
    try {
      await _tts.speak(text);
    } catch (_) {
      if (mounted) {
        setState(() => _notice = 'Narration audio indisponible sur cet appareil.');
      }
    } finally {
      if (mounted) setState(() => _speaking = false);
    }
  }

  Future<void> _selectStop(int index) async {
    if (index < 0 || index >= _stops.length || index == _currentIndex) return;
    await _tts.stop();
    if (!mounted) return;
    setState(() {
      _currentIndex = index;
      _speaking = false;
    });
    await _loadStopContext();
  }

  void _selectFromMap(Map<String, dynamic> place) {
    final id = place['id']?.toString();
    final index = _stops.indexWhere((item) => item['id']?.toString() == id);
    if (index >= 0) unawaited(_selectStop(index));
  }

  Future<void> _changeMode(HanduniaTravelMode mode) async {
    if (_mode == mode || _loading) return;
    setState(() => _mode = mode);
    await _buildJourney();
  }

  @override
  Widget build(BuildContext context) {
    final stops = _stops;
    final current = _currentStop;
    final state = _journey?['state']?.toString();
    final distance = (_journey?['distance_m'] as num?) ?? 0;
    final duration = (_journey?['estimated_duration_s'] as num?) ?? 0;

    return Scaffold(
      backgroundColor: HanduniaTokens.nuit,
      body: SafeArea(
        child: Column(
          children: [
            _GuideHeader(
              onBack: () => Navigator.of(context).maybePop(),
              onRetry: _loading ? null : _load,
            ),
            Expanded(
              child: _loading && _journey == null
                  ? const Center(
                      child: CircularProgressIndicator(
                        color: HanduniaTokens.braise,
                      ),
                    )
                  : state == 'void' || stops.isEmpty
                  ? _GuideEmptyState(onRetry: _load)
                  : ListView(
                      padding: const EdgeInsets.fromLTRB(16, 6, 16, 30),
                      children: [
                        _ModeSelector(
                          selected: _mode,
                          busy: _loading,
                          onSelected: _changeMode,
                        ),
                        const SizedBox(height: 12),
                        HanduniaUnifiedMap(
                          places: stops,
                          routePoints: _pathPoints,
                          selectedPlaceId: current?['id']?.toString(),
                          onSelected: _selectFromMap,
                          height: 315,
                          showSelectionCard: false,
                          initialZoom: 8.2,
                        ),
                        const SizedBox(height: 12),
                        _JourneySummary(
                          mode: _mode,
                          stops: stops.length,
                          distance: HanduniaGuideData.distanceLabel(distance),
                          duration: HanduniaGuideData.durationLabel(duration),
                        ),
                        if (_journey?['routing_notice'] != null) ...[
                          const SizedBox(height: 8),
                          Text(
                            _journey!['routing_notice'].toString(),
                            textAlign: TextAlign.center,
                            style: const TextStyle(
                              fontFamily: 'Karla',
                              fontSize: 11.5,
                              height: 1.35,
                              color: HanduniaTokens.cendre,
                            ),
                          ),
                        ],
                        const SizedBox(height: 14),
                        _StopStrip(
                          stops: stops,
                          selectedIndex: _currentIndex,
                          onSelected: _selectStop,
                        ),
                        const SizedBox(height: 14),
                        if (current != null)
                          _CurrentStopCard(
                            place: current,
                            index: _currentIndex,
                            total: stops.length,
                          ),
                        const SizedBox(height: 12),
                        if (_notice != null)
                          _NoticeCard(text: _notice!),
                        _GuideAnswerCard(
                          answer: _answer,
                          busy: _asking,
                          speaking: _speaking,
                          onSpeak: _speak,
                          onAsk: _ask,
                        ),
                        const SizedBox(height: 12),
                        _ReconstructionCard(
                          answer: _reconstruction,
                          immersive: _immersive,
                          busy: _asking,
                          onGenerate: () => _ask('reconstruction'),
                          onToggleImmersive: () => setState(
                            () => _immersive = !_immersive,
                          ),
                        ),
                        const SizedBox(height: 12),
                        _MemoryGapCard(gaps: _gaps),
                        if (stops.length > 1) ...[
                          const SizedBox(height: 14),
                          Row(
                            children: [
                              Expanded(
                                child: OutlinedButton.icon(
                                  onPressed: _currentIndex > 0
                                      ? () => _selectStop(_currentIndex - 1)
                                      : null,
                                  icon: const Icon(Icons.chevron_left_rounded),
                                  label: const Text('Étape précédente'),
                                ),
                              ),
                              const SizedBox(width: 8),
                              Expanded(
                                child: FilledButton.icon(
                                  onPressed: _currentIndex < stops.length - 1
                                      ? () => _selectStop(_currentIndex + 1)
                                      : null,
                                  style: FilledButton.styleFrom(
                                    backgroundColor: HanduniaTokens.braise,
                                    foregroundColor: HanduniaTokens.encre,
                                  ),
                                  icon: const Icon(Icons.chevron_right_rounded),
                                  label: Text(
                                    _currentIndex < stops.length - 1
                                        ? 'Étape suivante'
                                        : 'Parcours terminé',
                                  ),
                                ),
                              ),
                            ],
                          ),
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

class _GuideHeader extends StatelessWidget {
  const _GuideHeader({required this.onBack, required this.onRetry});

  final VoidCallback onBack;
  final VoidCallback? onRetry;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(6, 6, 10, 6),
      child: Row(
        children: [
          IconButton(
            onPressed: onBack,
            icon: const Icon(Icons.arrow_back_rounded),
            color: HanduniaTokens.ivoire,
          ),
          const SizedBox(width: 2),
          const Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Guide Handunia IA',
                  style: TextStyle(
                    fontFamily: 'Fraunces',
                    fontWeight: FontWeight.w600,
                    fontSize: 23,
                    color: HanduniaTokens.ivoire,
                  ),
                ),
                Text(
                  'Visite sourcée · les voix d’abord, l’IA ensuite',
                  style: TextStyle(
                    fontFamily: 'Karla',
                    fontSize: 11.5,
                    color: HanduniaTokens.cendre,
                  ),
                ),
              ],
            ),
          ),
          IconButton(
            onPressed: onRetry,
            icon: const Icon(Icons.refresh_rounded),
            color: HanduniaTokens.braise,
          ),
        ],
      ),
    );
  }
}

class _ModeSelector extends StatelessWidget {
  const _ModeSelector({
    required this.selected,
    required this.busy,
    required this.onSelected,
  });

  final HanduniaTravelMode selected;
  final bool busy;
  final ValueChanged<HanduniaTravelMode> onSelected;

  IconData _icon(HanduniaTravelMode mode) => switch (mode) {
        HanduniaTravelMode.walk => Icons.directions_walk_rounded,
        HanduniaTravelMode.bicycle => Icons.pedal_bike_rounded,
        HanduniaTravelMode.horse => Icons.emoji_nature_rounded,
      };

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        for (final mode in HanduniaTravelMode.values) ...[
          if (mode != HanduniaTravelMode.values.first)
            const SizedBox(width: 7),
          Expanded(
            child: ChoiceChip(
              selected: selected == mode,
              onSelected: busy ? null : (_) => onSelected(mode),
              avatar: Icon(
                _icon(mode),
                size: 17,
                color: selected == mode
                    ? HanduniaTokens.encre
                    : HanduniaTokens.braise,
              ),
              label: Text(mode.label),
              labelStyle: TextStyle(
                fontFamily: 'Karla',
                fontWeight: FontWeight.w800,
                color: selected == mode
                    ? HanduniaTokens.encre
                    : HanduniaTokens.ivoire,
              ),
              selectedColor: HanduniaTokens.braise,
              backgroundColor: HanduniaTokens.nuitPortee,
              side: const BorderSide(color: HanduniaTokens.bordureForte),
            ),
          ),
        ],
      ],
    );
  }
}

class _JourneySummary extends StatelessWidget {
  const _JourneySummary({
    required this.mode,
    required this.stops,
    required this.distance,
    required this.duration,
  });

  final HanduniaTravelMode mode;
  final int stops;
  final String distance;
  final String duration;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: HanduniaTokens.nuitPortee,
        borderRadius: BorderRadius.circular(17),
        border: Border.all(color: HanduniaTokens.bordureForte),
      ),
      child: Row(
        children: [
          const Icon(Icons.auto_awesome_rounded, color: HanduniaTokens.braise),
          const SizedBox(width: 9),
          Expanded(
            child: Text(
              '$stops étapes · $distance · $duration · ${mode.iconLabel}',
              style: const TextStyle(
                fontFamily: 'Karla',
                fontWeight: FontWeight.w800,
                color: HanduniaTokens.ivoire,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _StopStrip extends StatelessWidget {
  const _StopStrip({
    required this.stops,
    required this.selectedIndex,
    required this.onSelected,
  });

  final List<Map<String, dynamic>> stops;
  final int selectedIndex;
  final ValueChanged<int> onSelected;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 44,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        itemCount: stops.length,
        separatorBuilder: (_, _) => const SizedBox(width: 7),
        itemBuilder: (context, index) {
          final selected = index == selectedIndex;
          final name = stops[index]['name']?.toString() ?? 'Lieu';
          return ActionChip(
            onPressed: () => onSelected(index),
            avatar: CircleAvatar(
              radius: 9,
              backgroundColor: selected
                  ? HanduniaTokens.encre
                  : HanduniaTokens.braise,
              child: Text(
                '${index + 1}',
                style: TextStyle(
                  fontFamily: 'Karla',
                  fontSize: 9,
                  fontWeight: FontWeight.w800,
                  color: selected
                      ? HanduniaTokens.braise
                      : HanduniaTokens.encre,
                ),
              ),
            ),
            label: Text(name),
            backgroundColor:
                selected ? HanduniaTokens.braise : HanduniaTokens.nuitPortee,
            side: const BorderSide(color: HanduniaTokens.bordureForte),
            labelStyle: TextStyle(
              fontFamily: 'Karla',
              fontWeight: FontWeight.w700,
              color: selected ? HanduniaTokens.encre : HanduniaTokens.ivoire,
            ),
          );
        },
      ),
    );
  }
}

class _CurrentStopCard extends StatelessWidget {
  const _CurrentStopCard({
    required this.place,
    required this.index,
    required this.total,
  });

  final Map<String, dynamic> place;
  final int index;
  final int total;

  @override
  Widget build(BuildContext context) {
    final memories = (place['memory_count'] as num?)?.toInt() ?? 0;
    final voices = (place['voice_count'] as num?)?.toInt() ?? 0;
    final leg = (place['leg_distance_m'] as num?) ?? 0;
    return Container(
      padding: const EdgeInsets.all(15),
      decoration: BoxDecoration(
        color: HanduniaTokens.braise.withValues(alpha: .10),
        borderRadius: BorderRadius.circular(19),
        border: Border.all(
          color: HanduniaTokens.braise.withValues(alpha: .58),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'ÉTAPE ${index + 1}/$total',
            style: const TextStyle(
              fontFamily: 'Karla',
              fontSize: 10.5,
              letterSpacing: 1.1,
              fontWeight: FontWeight.w800,
              color: HanduniaTokens.braise,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            place['name']?.toString() ?? 'Lieu mémoire',
            style: const TextStyle(
              fontFamily: 'Fraunces',
              fontSize: 23,
              fontWeight: FontWeight.w600,
              color: HanduniaTokens.ivoire,
            ),
          ),
          const SizedBox(height: 7),
          HanduniaTerritoryPath(place: place, compact: true),
          const SizedBox(height: 9),
          Text(
            '$memories souvenirs · $voices voix'
            '${index == 0 ? '' : ' · ' + HanduniaGuideData.distanceLabel(leg)}',
            style: const TextStyle(
              fontFamily: 'Karla',
              fontSize: 12.5,
              color: HanduniaTokens.cendre,
            ),
          ),
        ],
      ),
    );
  }
}

class _GuideAnswerCard extends StatelessWidget {
  const _GuideAnswerCard({
    required this.answer,
    required this.busy,
    required this.speaking,
    required this.onSpeak,
    required this.onAsk,
  });

  final Map<String, dynamic>? answer;
  final bool busy;
  final bool speaking;
  final VoidCallback onSpeak;
  final ValueChanged<String> onAsk;

  @override
  Widget build(BuildContext context) {
    final state = answer?['state']?.toString();
    final text = answer?['answer']?.toString().trim() ?? '';
    final sources = (answer?['sources'] as List? ?? const <dynamic>[])
        .whereType<Map>()
        .map((item) => Map<String, dynamic>.from(item))
        .toList(growable: false);
    return Container(
      padding: const EdgeInsets.all(15),
      decoration: BoxDecoration(
        color: HanduniaTokens.nuitPortee,
        borderRadius: BorderRadius.circular(19),
        border: Border.all(color: HanduniaTokens.bordureForte),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(
                Icons.record_voice_over_rounded,
                color: HanduniaTokens.braise,
              ),
              const SizedBox(width: 8),
              const Expanded(
                child: Text(
                  'Le guide raconte',
                  style: TextStyle(
                    fontFamily: 'Fraunces',
                    fontSize: 19,
                    fontWeight: FontWeight.w600,
                    color: HanduniaTokens.ivoire,
                  ),
                ),
              ),
              if (text.isNotEmpty)
                IconButton(
                  onPressed: onSpeak,
                  icon: Icon(
                    speaking
                        ? Icons.stop_circle_outlined
                        : Icons.volume_up_outlined,
                  ),
                  color: HanduniaTokens.braise,
                ),
            ],
          ),
          if (busy)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 18),
              child: LinearProgressIndicator(color: HanduniaTokens.braise),
            )
          else if (state == 'sourced' && text.isNotEmpty) ...[
            const SizedBox(height: 5),
            Text(
              text,
              style: const TextStyle(
                fontFamily: 'Karla',
                fontSize: 14,
                height: 1.48,
                color: HanduniaTokens.ivoire,
              ),
            ),
            if (sources.isNotEmpty) ...[
              const SizedBox(height: 10),
              Wrap(
                spacing: 6,
                runSpacing: 6,
                children: [
                  for (final source in sources)
                    Chip(
                      visualDensity: VisualDensity.compact,
                      avatar: const Icon(
                        Icons.graphic_eq_rounded,
                        size: 15,
                        color: HanduniaTokens.braise,
                      ),
                      label: Text(
                        '${source['witness'] ?? 'Voix'} · '
                        '${source['year'] ?? ''}',
                      ),
                      backgroundColor: HanduniaTokens.nuit,
                      side: const BorderSide(
                        color: HanduniaTokens.bordureForte,
                      ),
                      labelStyle: const TextStyle(
                        fontFamily: 'Karla',
                        fontSize: 10.5,
                        color: HanduniaTokens.cendre,
                      ),
                    ),
                ],
              ),
            ],
          ] else
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 10),
              child: Text(
                'La communauté ne l’a pas encore raconté.',
                style: TextStyle(
                  fontFamily: 'Karla',
                  color: HanduniaTokens.cendre,
                ),
              ),
            ),
          const SizedBox(height: 10),
          Wrap(
            spacing: 7,
            runSpacing: 7,
            children: [
              for (final item in const <(String, String)>[
                ('Comment ?', 'how'),
                ('Quand ?', 'when'),
                ('Qui ?', 'who'),
              ])
                ActionChip(
                  label: Text(item.$1),
                  onPressed: busy ? null : () => onAsk(item.$2),
                  backgroundColor: HanduniaTokens.nuit,
                  side: const BorderSide(color: HanduniaTokens.bordureForte),
                  labelStyle: const TextStyle(
                    fontFamily: 'Karla',
                    fontWeight: FontWeight.w700,
                    color: HanduniaTokens.ivoire,
                  ),
                ),
            ],
          ),
        ],
      ),
    );
  }
}

class _ReconstructionCard extends StatelessWidget {
  const _ReconstructionCard({
    required this.answer,
    required this.immersive,
    required this.busy,
    required this.onGenerate,
    required this.onToggleImmersive,
  });

  final Map<String, dynamic>? answer;
  final bool immersive;
  final bool busy;
  final VoidCallback onGenerate;
  final VoidCallback onToggleImmersive;

  @override
  Widget build(BuildContext context) {
    final state = answer?['state']?.toString();
    final text = answer?['answer']?.toString().trim() ?? '';
    return AnimatedContainer(
      duration: const Duration(milliseconds: 320),
      padding: const EdgeInsets.all(15),
      decoration: BoxDecoration(
        gradient: immersive
            ? const LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: <Color>[
                  Color(0xFF1D2A34),
                  Color(0xFF34281D),
                ],
              )
            : null,
        color: immersive ? null : HanduniaTokens.nuitPortee,
        borderRadius: BorderRadius.circular(21),
        border: Border.all(
          color: immersive
              ? HanduniaTokens.braise
              : HanduniaTokens.bordureForte,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.view_in_ar_rounded, color: HanduniaTokens.braise),
              const SizedBox(width: 8),
              const Expanded(
                child: Text(
                  'Reconstitution immersive',
                  style: TextStyle(
                    fontFamily: 'Fraunces',
                    fontSize: 19,
                    fontWeight: FontWeight.w600,
                    color: HanduniaTokens.ivoire,
                  ),
                ),
              ),
              if (state == 'sourced')
                IconButton(
                  onPressed: onToggleImmersive,
                  icon: Icon(
                    immersive
                        ? Icons.layers_clear_outlined
                        : Icons.layers_outlined,
                  ),
                  color: HanduniaTokens.braise,
                ),
            ],
          ),
          const Text(
            'Vue 2.5D légère · synthèse IA sourcée, jamais présentée comme une photographie historique.',
            style: TextStyle(
              fontFamily: 'Karla',
              fontSize: 11.5,
              height: 1.35,
              color: HanduniaTokens.cendre,
            ),
          ),
          const SizedBox(height: 10),
          if (state == 'sourced' && text.isNotEmpty) ...[
            _ImmersiveScene(active: immersive),
            const SizedBox(height: 10),
            Text(
              text,
              style: const TextStyle(
                fontFamily: 'Karla',
                fontSize: 13.5,
                height: 1.45,
                color: HanduniaTokens.ivoire,
              ),
            ),
          ] else
            SizedBox(
              width: double.infinity,
              child: OutlinedButton.icon(
                onPressed: busy ? null : onGenerate,
                icon: const Icon(Icons.auto_awesome_rounded),
                label: const Text('RECONSTITUER DEPUIS LES VOIX'),
              ),
            ),
        ],
      ),
    );
  }
}

class _ImmersiveScene extends StatelessWidget {
  const _ImmersiveScene({required this.active});

  final bool active;

  @override
  Widget build(BuildContext context) {
    return AnimatedContainer(
      duration: const Duration(milliseconds: 320),
      height: active ? 150 : 88,
      decoration: BoxDecoration(
        color: HanduniaTokens.nuit.withValues(alpha: .72),
        borderRadius: BorderRadius.circular(17),
      ),
      child: Stack(
        clipBehavior: Clip.none,
        children: [
          Positioned(
            left: 18,
            right: 18,
            bottom: active ? 20 : 13,
            child: Transform(
              transform: Matrix4.identity()
                ..setEntry(3, 2, .001)
                ..rotateX(active ? .78 : .28),
              alignment: Alignment.center,
              child: Container(
                height: active ? 78 : 48,
                decoration: BoxDecoration(
                  color: HanduniaTokens.braise.withValues(alpha: .16),
                  borderRadius: BorderRadius.circular(18),
                  border: Border.all(
                    color: HanduniaTokens.braise.withValues(alpha: .45),
                  ),
                ),
              ),
            ),
          ),
          Positioned(
            left: 35,
            bottom: active ? 42 : 23,
            child: const Icon(
              Icons.home_work_outlined,
              size: 39,
              color: HanduniaTokens.terre,
            ),
          ),
          Positioned(
            right: 42,
            bottom: active ? 46 : 25,
            child: const Icon(
              Icons.groups_2_outlined,
              size: 36,
              color: HanduniaTokens.braise,
            ),
          ),
          Positioned(
            left: 0,
            right: 0,
            top: 10,
            child: Text(
              active ? 'Perspective immersive 2.5D' : 'Aperçu de scène',
              textAlign: TextAlign.center,
              style: const TextStyle(
                fontFamily: 'Karla',
                fontSize: 11,
                fontWeight: FontWeight.w800,
                color: HanduniaTokens.cendre,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _MemoryGapCard extends StatelessWidget {
  const _MemoryGapCard({required this.gaps});

  final Map<String, dynamic>? gaps;

  @override
  Widget build(BuildContext context) {
    final axes = (gaps?['missing_axes'] as List? ?? const <dynamic>[])
        .map((item) => item.toString())
        .toList(growable: false);
    final periods = (gaps?['empty_periods'] as List? ?? const <dynamic>[])
        .map((item) => item.toString())
        .toList(growable: false);
    if (gaps == null) return const SizedBox.shrink();
    if (axes.isEmpty && periods.isEmpty) {
      return Container(
        padding: const EdgeInsets.all(13),
        decoration: BoxDecoration(
          color: HanduniaTokens.nuitPortee,
          borderRadius: BorderRadius.circular(17),
          border: Border.all(color: HanduniaTokens.bordureForte),
        ),
        child: const Row(
          children: [
            Icon(Icons.check_circle_outline, color: HanduniaTokens.braise),
            SizedBox(width: 9),
            Expanded(
              child: Text(
                'Aucune lacune structurée détectée pour cette étape.',
                style: TextStyle(
                  fontFamily: 'Karla',
                  color: HanduniaTokens.ivoire,
                ),
              ),
            ),
          ],
        ),
      );
    }
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: HanduniaTokens.terre.withValues(alpha: .08),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(
          color: HanduniaTokens.terre.withValues(alpha: .48),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(
            children: [
              Icon(Icons.campaign_outlined, color: HanduniaTokens.terre),
              SizedBox(width: 8),
              Text(
                'Voix à rechercher',
                style: TextStyle(
                  fontFamily: 'Fraunces',
                  fontSize: 18,
                  fontWeight: FontWeight.w600,
                  color: HanduniaTokens.ivoire,
                ),
              ),
            ],
          ),
          if (axes.isNotEmpty) ...[
            const SizedBox(height: 7),
            Text(
              'Axes manquants : ${axes.join(' · ')}',
              style: const TextStyle(
                fontFamily: 'Karla',
                color: HanduniaTokens.cendre,
              ),
            ),
          ],
          if (periods.isNotEmpty) ...[
            const SizedBox(height: 5),
            Text(
              'Périodes silencieuses : ${periods.join(' · ')}',
              style: const TextStyle(
                fontFamily: 'Karla',
                color: HanduniaTokens.cendre,
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _NoticeCard extends StatelessWidget {
  const _NoticeCard({required this.text});

  final String text;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 9),
      decoration: BoxDecoration(
        color: HanduniaTokens.terre.withValues(alpha: .08),
        borderRadius: BorderRadius.circular(13),
      ),
      child: Text(
        text,
        textAlign: TextAlign.center,
        style: const TextStyle(
          fontFamily: 'Karla',
          fontSize: 12,
          color: HanduniaTokens.terre,
        ),
      ),
    );
  }
}

class _GuideEmptyState extends StatelessWidget {
  const _GuideEmptyState({required this.onRetry});

  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(28),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(
              Icons.explore_off_outlined,
              size: 58,
              color: HanduniaTokens.cendre,
            ),
            const SizedBox(height: 12),
            const Text(
              'Aucun parcours géographique disponible',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontFamily: 'Fraunces',
                fontSize: 22,
                fontWeight: FontWeight.w600,
                color: HanduniaTokens.ivoire,
              ),
            ),
            const SizedBox(height: 8),
            const Text(
              'Le guide IA n’invente jamais la position d’un lieu. '
              'Dès que des lieux mémoire vérifiés sont géolocalisés, '
              'les parcours marche, vélo et cheval apparaissent ici.',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontFamily: 'Karla',
                height: 1.45,
                color: HanduniaTokens.cendre,
              ),
            ),
            const SizedBox(height: 16),
            FilledButton.icon(
              onPressed: onRetry,
              style: FilledButton.styleFrom(
                backgroundColor: HanduniaTokens.braise,
                foregroundColor: HanduniaTokens.encre,
              ),
              icon: const Icon(Icons.refresh_rounded),
              label: const Text('RÉESSAYER'),
            ),
          ],
        ),
      ),
    );
  }
}
