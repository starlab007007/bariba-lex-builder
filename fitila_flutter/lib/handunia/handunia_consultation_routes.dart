
import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'dart:math' as math;

import 'package:audioplayers/audioplayers.dart' as audio;
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:url_launcher/url_launcher.dart';

import '../core/fitila_media.dart';
import 'handunia_consultation_extended_data.dart';
import 'handunia_consultation_ui.dart';
import 'handunia_geo_trace_route.dart';
import 'handunia_premium_guide_route.dart';
import 'handunia_unified_map.dart';
import 'handunia_territory_picker_route.dart';

TextStyle _frauncesRoute({
  double size = 18,
  Color color = HanduniaTokens.ivoire,
  double height = 1.28,
}) {
  return TextStyle(
    fontFamily: 'Fraunces',
    fontWeight: FontWeight.w600,
    fontSize: size,
    height: height,
    color: color,
  );
}

TextStyle _karlaRoute({
  double size = 14.5,
  FontWeight weight = FontWeight.w400,
  Color color = HanduniaTokens.ivoire,
  double height = 1.45,
}) {
  return TextStyle(
    fontFamily: 'Karla',
    fontWeight: weight,
    fontSize: size,
    height: height,
    color: color,
  );
}

Widget _handuniaHeader(
  BuildContext context,
  String title, {
  List<Widget> actions = const <Widget>[],
}) {
  return Padding(
    padding: const EdgeInsets.fromLTRB(10, 8, 12, 8),
    child: Row(
      children: [
        Semantics(
          button: true,
          label: 'Retour',
          child: SizedBox(
            width: 44,
            height: 44,
            child: IconButton(
              onPressed: () => Navigator.maybePop(context),
              icon: const Icon(Icons.arrow_back_outlined),
              color: HanduniaTokens.ivoire,
              style: IconButton.styleFrom(
                backgroundColor: HanduniaTokens.nuitPortee,
                foregroundColor: HanduniaTokens.ivoire,
                side: const BorderSide(color: HanduniaTokens.bordureForte),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(14),
                ),
              ),
            ),
          ),
        ),
        Expanded(child: Text(title, style: _frauncesRoute(size: 27))),
        if (actions.isNotEmpty)
          IconButtonTheme(
            data: IconButtonThemeData(
              style: IconButton.styleFrom(
                backgroundColor: HanduniaTokens.nuitPortee,
                foregroundColor: HanduniaTokens.ivoire,
                side: const BorderSide(color: HanduniaTokens.bordureForte),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(14),
                ),
              ),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: actions,
            ),
          ),
      ],
    ),
  );
}

class _ConsultationState extends StatelessWidget {
  const _ConsultationState({
    required this.title,
    this.subtitle = '',
    this.color = HanduniaTokens.cendre,
    this.loading = false,
  });

  final String title;
  final String subtitle;
  final Color color;
  final bool loading;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Container(
        margin: const EdgeInsets.all(20),
        padding: const EdgeInsets.all(18),
        decoration: BoxDecoration(
          color: HanduniaTokens.nuitPortee,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: color.withValues(alpha: .7)),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (loading)
              const HaloDensite(valeur: .45, loading: true, size: 72)
            else
              Icon(Icons.radio_button_unchecked, color: color, size: 28),
            const SizedBox(height: 10),
            Text(title, style: _frauncesRoute(size: 17, color: color)),
            if (subtitle.isNotEmpty) ...[
              const SizedBox(height: 5),
              Text(
                subtitle,
                textAlign: TextAlign.center,
                style: _karlaRoute(size: 12.5, color: HanduniaTokens.cendre),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class HanduniaMemoryRoute extends StatefulWidget {
  const HanduniaMemoryRoute({
    super.key,
    required this.memoryId,
    this.seed,
  });

  final String memoryId;
  final Map<String, dynamic>? seed;

  @override
  State<HanduniaMemoryRoute> createState() => _HanduniaMemoryRouteState();
}

class _HanduniaMemoryRouteState extends State<HanduniaMemoryRoute> {
  Map<String, dynamic>? _memory;
  bool _loading = true;
  bool _busy = false;
  bool _showNuance = false;
  String? _notice;

  @override
  void initState() {
    super.initState();
    _memory = widget.seed;
    unawaited(_load());
  }

  Future<void> _load() async {
    if (mounted) {
      setState(() => _loading = true);
    }
    try {
      final value = await HanduniaConsultationExtendedData.fetchMemoryDetail(
        widget.memoryId,
      );
      if (!mounted) {
        return;
      }
      setState(() {
        _memory = value;
        _notice = null;
      });
    } catch (_) {
      if (mounted) {
        setState(() => _notice = 'En attente de réseau');
      }
    } finally {
      if (mounted) {
        setState(() => _loading = false);
      }
    }
  }

  Future<void> _corroborate() async {
    if (_busy) {
      return;
    }
    setState(() => _busy = true);
    try {
      await HanduniaConsultationExtendedData.corroborate(widget.memoryId);
      await _load();
    } finally {
      if (mounted) {
        setState(() => _busy = false);
      }
    }
  }

  Future<void> _submitNuance(
    FitilaMediaAsset asset,
    int durationMs,
  ) async {
    if (_busy || _memory == null) {
      return;
    }
    setState(() => _busy = true);
    try {
      final bytes = await asset.readBytes();
      final transcript =
          await HanduniaConsultationExtendedData.transcribeBariba(bytes);
      await HanduniaConsultationExtendedData.createNuance(
        source: _memory!,
        audioBytes: bytes,
        durationMs: durationMs,
        transcript: transcript,
      );
      if (mounted) {
        setState(() => _showNuance = false);
      }
      await _load();
    } finally {
      if (mounted) {
        setState(() => _busy = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final memory = _memory;
    return Scaffold(
      backgroundColor: HanduniaTokens.nuit,
      body: SafeArea(
        child: Column(
          children: [
            _handuniaHeader(context, 'Souvenir'),
            if (_notice != null)
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: Text(
                  _notice!,
                  style: _karlaRoute(
                    size: 12.5,
                    color: HanduniaTokens.terre,
                    weight: FontWeight.w600,
                  ),
                ),
              ),
            Expanded(
              child: _loading && memory == null
                  ? const _ConsultationState(
                      title: 'Mémoire en cours',
                      color: HanduniaTokens.braise,
                      loading: true,
                    )
                  : memory == null || memory['state'] == 'unavailable'
                  ? const _ConsultationState(
                      title: 'Accès réservé',
                      subtitle: 'Portée non autorisée',
                      color: HanduniaTokens.terre,
                    )
                  : memory['state'] == 'withdrawn'
                  ? const _ConsultationState(
                      title: 'Souvenir retiré',
                      subtitle: 'Retiré par son auteur',
                    )
                  : _OpenMemoryBody(
                      memory: memory,
                      busy: _busy,
                      showNuance: _showNuance,
                      onCorroborate: _corroborate,
                      onNuance: () =>
                          setState(() => _showNuance = !_showNuance),
                      onSubmitNuance: _submitNuance,
                    ),
            ),
          ],
        ),
      ),
    );
  }
}

class _OpenMemoryBody extends StatefulWidget {
  const _OpenMemoryBody({
    required this.memory,
    required this.busy,
    required this.showNuance,
    required this.onCorroborate,
    required this.onNuance,
    required this.onSubmitNuance,
  });

  final Map<String, dynamic> memory;
  final bool busy;
  final bool showNuance;
  final VoidCallback onCorroborate;
  final VoidCallback onNuance;
  final Future<void> Function(FitilaMediaAsset asset, int durationMs)
      onSubmitNuance;

  @override
  State<_OpenMemoryBody> createState() => _OpenMemoryBodyState();
}

class _OpenMemoryBodyState extends State<_OpenMemoryBody> {
  bool _textMode = false;

  @override
  Widget build(BuildContext context) {
    final transcript = widget.memory['transcript_text']?.toString().trim() ?? '';
    final fallbackText = widget.memory['text']?.toString().trim() ?? '';
    final visibleText = transcript.isEmpty ? fallbackText : transcript;
    final scope = widget.memory['scope_level']?.toString() ?? 'community';
    final initials = widget.memory['author_initials']?.toString() ?? 'HW';
    final voices = (widget.memory['voice_count'] as num?)?.toInt() ?? 1;
    final versions = (widget.memory['versions'] as List? ?? const <dynamic>[])
        .cast<Map<String, dynamic>>();

    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 4, 16, 28),
      children: [
        Center(
          child: _MemoryPlaybackOrb(
            id: widget.memory['id']?.toString() ?? '',
            audioUrl: widget.memory['audio_url']?.toString(),
            cachedPath: widget.memory['cached_audio_path']?.toString(),
            durationMs:
                (widget.memory['audio_duration_ms'] as num?)?.toInt(),
            voices: voices,
          ),
        ),
        const SizedBox(height: 14),
        SegmentedButton<bool>(
          segments: const [
            ButtonSegment(value: false, label: Text('Voix')),
            ButtonSegment(value: true, label: Text('Texte')),
          ],
          selected: {_textMode},
          showSelectedIcon: false,
          onSelectionChanged: (values) =>
              setState(() => _textMode = values.first),
          style: ButtonStyle(
            minimumSize: const WidgetStatePropertyAll(Size(44, 44)),
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
        const SizedBox(height: 16),
        if (_textMode) ...[
          Text(
            '“$visibleText”',
            style: _frauncesRoute(size: 17, height: 1.58),
          ),
          const SizedBox(height: 7),
          Text(
            widget.memory['transcript_reviewed_by_guardian'] == true
                ? 'Transcription relue par un gardien'
                : 'Transcription dérivée',
            style: _karlaRoute(size: 12.5, color: HanduniaTokens.cendre),
          ),
        ] else
          Text(
            'La voix originale fait foi.',
            style: _frauncesRoute(size: 17, height: 1.55),
          ),
        const SizedBox(height: 18),
        Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: HanduniaTokens.nuitPortee,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: HanduniaTokens.bordureForte),
          ),
          child: Row(
            children: [
              Container(
                width: 44,
                height: 44,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  border: Border.all(color: HanduniaTokens.bordureForte),
                ),
                child: Text(initials, style: _frauncesRoute(size: 13)),
              ),
              const SizedBox(width: 10),
              CercleDePortee(niveau: scope, size: 42),
              const Spacer(),
              BadgeSceau(hash: widget.memory['seal_hash']?.toString()),
            ],
          ),
        ),
        if (versions.isNotEmpty) ...[
          const SizedBox(height: 12),
          Semantics(
            button: true,
            label: 'Autres versions',
            child: SizedBox(
              height: 48,
              child: OutlinedButton(
                onPressed: () {
                  final first = versions.first;
                  final id = first['id']?.toString();
                  if (id == null || id.isEmpty) {
                    return;
                  }
                  Navigator.of(context).push(
                    MaterialPageRoute<void>(
                      builder: (_) =>
                          HanduniaMemoryRoute(memoryId: id, seed: first),
                    ),
                  );
                },
                style: OutlinedButton.styleFrom(
                  foregroundColor: HanduniaTokens.braise,
                  side: const BorderSide(color: HanduniaTokens.bordureForte),
                ),
                child: Text(
                  versions.length == 1
                      ? '1 autre version'
                      : '${versions.length} autres versions',
                ),
              ),
            ),
          ),
        ],
        const SizedBox(height: 18),
        Row(
          children: [
            Expanded(
              child: SizedBox(
                height: 48,
                child: FilledButton(
                  onPressed: widget.busy ? null : widget.onCorroborate,
                  style: FilledButton.styleFrom(
                    backgroundColor: HanduniaTokens.braise,
                    foregroundColor: HanduniaTokens.encre,
                  ),
                  child: const Text('Corroborer'),
                ),
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: SizedBox(
                height: 48,
                child: OutlinedButton(
                  onPressed: widget.busy ? null : widget.onNuance,
                  style: OutlinedButton.styleFrom(
                    foregroundColor: HanduniaTokens.terre,
                    side: const BorderSide(color: HanduniaTokens.terre),
                  ),
                  child: const Text('Nuancer'),
                ),
              ),
            ),
          ],
        ),
        if (widget.showNuance) ...[
          const SizedBox(height: 14),
          _HoldToSpeak(onSubmit: widget.onSubmitNuance),
        ],
      ],
    );
  }
}

class _MemoryPlaybackOrb extends StatefulWidget {
  const _MemoryPlaybackOrb({
    required this.id,
    required this.audioUrl,
    required this.cachedPath,
    required this.durationMs,
    required this.voices,
  });

  final String id;
  final String? audioUrl;
  final String? cachedPath;
  final int? durationMs;
  final int voices;

  @override
  State<_MemoryPlaybackOrb> createState() => _MemoryPlaybackOrbState();
}

class _MemoryPlaybackOrbState extends State<_MemoryPlaybackOrb> {
  late final audio.AudioPlayer _player;
  StreamSubscription<Duration>? _positionSubscription;
  StreamSubscription<Duration>? _durationSubscription;
  StreamSubscription<audio.PlayerState>? _stateSubscription;
  Duration _position = Duration.zero;
  Duration _duration = Duration.zero;
  bool _playing = false;
  bool _prepared = false;

  String get _storageKey => 'handunia_memory_position_${widget.id}';

  @override
  void initState() {
    super.initState();
    _player = audio.AudioPlayer();
    if (widget.durationMs != null) {
      _duration = Duration(milliseconds: widget.durationMs!);
    }
    _positionSubscription = _player.onPositionChanged.listen((value) {
      if (!mounted) {
        return;
      }
      setState(() => _position = value);
      unawaited(_save(value));
    });
    _durationSubscription = _player.onDurationChanged.listen((value) {
      if (mounted) {
        setState(() => _duration = value);
      }
    });
    _stateSubscription = _player.onPlayerStateChanged.listen((value) {
      if (mounted) {
        setState(() => _playing = value == audio.PlayerState.playing);
      }
    });
    unawaited(_restore());
  }

  Future<void> _restore() async {
    final preferences = await SharedPreferences.getInstance();
    final millis = preferences.getInt(_storageKey) ?? 0;
    if (mounted) {
      setState(() => _position = Duration(milliseconds: millis));
    }
  }

  Future<void> _save(Duration value) async {
    final preferences = await SharedPreferences.getInstance();
    await preferences.setInt(_storageKey, value.inMilliseconds);
  }

  audio.Source? _source() {
    final cached = widget.cachedPath?.trim() ?? '';
    if (cached.isNotEmpty && File(cached).existsSync()) {
      return audio.DeviceFileSource(cached);
    }
    final url = widget.audioUrl?.trim() ?? '';
    return url.isEmpty ? null : audio.UrlSource(url);
  }

  Future<void> _toggle() async {
    final source = _source();
    if (source == null) {
      return;
    }
    if (_playing) {
      await _player.pause();
      return;
    }
    if (!_prepared) {
      await _player.setSource(source);
      _prepared = true;
    }
    if (_position > Duration.zero) {
      await _player.seek(_position);
    }
    await _player.resume();
  }

  String _clock(Duration duration) {
    return '${duration.inMinutes}:${(duration.inSeconds % 60).toString().padLeft(2, '0')}';
  }

  @override
  void dispose() {
    _positionSubscription?.cancel();
    _durationSubscription?.cancel();
    _stateSubscription?.cancel();
    _player.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final progress = _duration.inMilliseconds <= 0
        ? 0.0
        : (_position.inMilliseconds / _duration.inMilliseconds)
              .clamp(0.0, 1.0);
    final density = (widget.voices / 12).clamp(0.0, 1.0);
    return Column(
      children: [
        SizedBox(
          width: 104,
          height: 104,
          child: Stack(
            alignment: Alignment.center,
            children: [
              HaloDensite(valeur: density, size: 104),
              Semantics(
                button: true,
                label: _playing ? 'Mettre en pause' : 'Écouter la voix',
                child: SizedBox(
                  width: 72,
                  height: 72,
                  child: InkWell(
                    customBorder: const CircleBorder(),
                    onTap: _toggle,
                    onLongPress: _toggle,
                    child: Icon(
                      _playing
                          ? Icons.pause_circle_outline
                          : Icons.play_circle_outline,
                      size: 54,
                      color: HanduniaTokens.braise,
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 8),
        SizedBox(
          width: 220,
          child: OndeAudio(progression: progress, actif: _playing),
        ),
        Text(
          '${_clock(_position)} / ${_clock(_duration)}',
          style: _karlaRoute(size: 12.5, color: HanduniaTokens.cendre),
        ),
      ],
    );
  }
}

class _HoldToSpeak extends StatefulWidget {
  const _HoldToSpeak({required this.onSubmit});

  final Future<void> Function(FitilaMediaAsset asset, int durationMs) onSubmit;

  @override
  State<_HoldToSpeak> createState() => _HoldToSpeakState();
}

class _HoldToSpeakState extends State<_HoldToSpeak> {
  final _media = FitilaMediaController();
  DateTime? _startedAt;
  bool _recording = false;
  bool _sending = false;

  Future<void> _start() async {
    if (_recording || _sending) {
      return;
    }
    await _media.startHanduniaOpusAudio();
    if (!mounted) {
      return;
    }
    setState(() {
      _recording = true;
      _startedAt = DateTime.now();
    });
  }

  Future<void> _stop() async {
    if (!_recording || _sending) {
      return;
    }
    final elapsed = DateTime.now().difference(_startedAt ?? DateTime.now());
    final asset = await _media.stopAudio();
    if (!mounted || asset == null) {
      return;
    }
    setState(() {
      _recording = false;
      _sending = true;
    });
    try {
      await widget.onSubmit(asset, math.max(1, elapsed.inMilliseconds));
    } finally {
      if (mounted) {
        setState(() => _sending = false);
      }
    }
  }

  @override
  void dispose() {
    _media.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: true,
      label: 'Maintenir pour parler',
      child: GestureDetector(
        onLongPressStart: (_) => _start(),
        onLongPressEnd: (_) => _stop(),
        child: Container(
          constraints: const BoxConstraints(minHeight: 54),
          decoration: BoxDecoration(
            color: _recording
                ? HanduniaTokens.terre.withValues(alpha: .12)
                : HanduniaTokens.nuitPortee,
            borderRadius: BorderRadius.circular(999),
            border: Border.all(
              color: _recording
                  ? HanduniaTokens.terre
                  : HanduniaTokens.bordureForte,
            ),
          ),
          alignment: Alignment.center,
          child: Text(
            _sending
                ? 'Scellement…'
                : _recording
                ? 'Parlez'
                : 'Maintenir pour parler',
            style: _karlaRoute(
              weight: FontWeight.w700,
              color: _recording
                  ? HanduniaTokens.terre
                  : HanduniaTokens.braise,
            ),
          ),
        ),
      ),
    );
  }
}

class HanduniaLivingMapRoute extends StatefulWidget {
  const HanduniaLivingMapRoute({
    super.key,
    this.pendingLocal = 0,
    this.initialPlaces,
  });

  final int pendingLocal;
  final List<Map<String, dynamic>>? initialPlaces;

  @override
  State<HanduniaLivingMapRoute> createState() => _HanduniaLivingMapRouteState();
}

class _HanduniaLivingMapRouteState extends State<HanduniaLivingMapRoute> {
  final TextEditingController _query = TextEditingController();
  List<Map<String, dynamic>> _places = const [];
  Map<String, dynamic>? _territoryFocus;
  String? _selectedId;
  bool _loading = true;
  String? _notice;

  @override
  void initState() {
    super.initState();
    final initialPlaces = widget.initialPlaces;
    if (initialPlaces != null) {
      _places = List<Map<String, dynamic>>.from(initialPlaces);
      _selectedId = _places.isEmpty ? null : _places.first['id']?.toString();
      _loading = false;
    } else {
      unawaited(_load());
    }
  }

  @override
  void dispose() {
    _query.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final places = await HanduniaConsultationExtendedData.fetchLivingMap();
      if (!mounted) return;
      setState(() {
        _places = places;
        _selectedId ??= places.isEmpty ? null : places.first['id']?.toString();
        _notice = null;
      });
    } catch (_) {
      if (mounted) {
        setState(() => _notice = 'En attente de réseau');
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  List<Map<String, dynamic>> get _visiblePlaces {
    final query = _query.text.trim().toLowerCase();
    final territory = _territoryFocus;

    bool matchesQuery(Map<String, dynamic> place) {
      if (query.isEmpty) return true;
      for (final key in <String>[
        'name',
        'department',
        'commune',
        'arrondissement',
        'village_quartier',
      ]) {
        if ((place[key]?.toString() ?? '').toLowerCase().contains(query)) {
          return true;
        }
      }
      return false;
    }

    bool matchesTerritory(Map<String, dynamic> place) {
      if (territory == null) return true;
      for (final key in <String>[
        'department',
        'commune',
        'arrondissement',
      ]) {
        final expected = territory[key]?.toString().trim().toLowerCase() ?? '';
        if (expected.isEmpty) continue;
        final actual = place[key]?.toString().trim().toLowerCase() ?? '';
        if (actual != expected) return false;
      }
      final village =
          territory['village_quartier']?.toString().trim().toLowerCase() ?? '';
      if (village.isNotEmpty) {
        final actual =
            place['village_quartier']?.toString().trim().toLowerCase() ?? '';
        final name = place['name']?.toString().trim().toLowerCase() ?? '';
        if (actual != village && !name.contains(village)) return false;
      }
      return true;
    }

    return _places
        .where((place) => matchesTerritory(place) && matchesQuery(place))
        .toList(growable: false);
  }

  Map<String, dynamic>? get _selectedPlace {
    final id = _selectedId;
    if (id == null) return null;
    final territoryFocus = _territoryFocus;
    if (territoryFocus != null &&
        territoryFocus['id']?.toString() == id) {
      return territoryFocus;
    }
    for (final place in _places) {
      if (place['id']?.toString() == id) return place;
    }
    return null;
  }

  Future<void> _openTerritoryExplorer() async {
    final result = await Navigator.of(context).push<Map<String, dynamic>>(
      MaterialPageRoute<Map<String, dynamic>>(
        builder: (_) => const HanduniaTerritoryPickerRoute(),
      ),
    );
    if (!mounted || result == null) return;
    _query.clear();
    setState(() {
      _territoryFocus = result;
      _selectedId = result['id']?.toString();
      _notice = result['geo_unresolved'] == true
          ? 'Territoire sélectionné · centrage cartographique à préciser.'
          : 'Territoire positionné sur la carte réelle.';
    });
  }

  void _clearTerritoryFocus() {
    final focusId = _territoryFocus?['id']?.toString();
    setState(() {
      _territoryFocus = null;
      if (_selectedId == focusId) {
        _selectedId = _places.isEmpty ? null : _places.first['id']?.toString();
      }
      _notice = null;
    });
  }

  bool _hasCoordinates(Map<String, dynamic> place) =>
      place['latitude'] is num && place['longitude'] is num;

  void _openPlace(Map<String, dynamic> place) {
    final id = place['id']?.toString();
    if (id == null ||
        id.isEmpty ||
        place['can_open'] == false ||
        id.startsWith('__territory_')) {
      return;
    }
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => HanduniaPlaceRoute(lieuId: id),
      ),
    );
  }

  void _openPremiumJourney() {
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => HanduniaPremiumGuideRoute(
          places: List<Map<String, dynamic>>.from(_places),
          initialPlaceId: _selectedId,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final visible = _visiblePlaces;
    final territoryFocus = _territoryFocus;
    final mapPlaces = <Map<String, dynamic>>[
      ...visible,
      if (territoryFocus != null &&
          !visible.any(
            (place) =>
                place['id']?.toString() ==
                territoryFocus['id']?.toString(),
          ))
        territoryFocus,
    ];
    final unlocated = visible.where((place) => !_hasCoordinates(place)).toList();
    final selected = _selectedPlace;
    return Scaffold(
      backgroundColor: HanduniaTokens.nuit,
      body: SafeArea(
        child: Column(
          children: [
            _handuniaHeader(
              context,
              'Carte vivante',
              actions: [
                IconButton(
                  onPressed: _openPremiumJourney,
                  icon: const Icon(Icons.explore_rounded),
                  color: HanduniaTokens.braise,
                ),
                IconButton(
                  onPressed: _openTerritoryExplorer,
                  icon: const Icon(Icons.account_tree_outlined),
                  color: HanduniaTokens.braise,
                ),
                IconButton(
                  onPressed: () => Navigator.of(context).push(
                    MaterialPageRoute<void>(
                      builder: (_) => const HanduniaMemoryAnswerRoute(),
                    ),
                  ),
                  icon: const Icon(Icons.question_answer_outlined),
                  color: HanduniaTokens.cendre,
                ),
                IconButton(
                  onPressed: () => Navigator.of(context).push(
                    MaterialPageRoute<void>(
                      builder: (_) => HanduniaFoyerRoute(
                        pendingLocal: widget.pendingLocal,
                      ),
                    ),
                  ),
                  icon: const Icon(Icons.local_fire_department_outlined),
                  color: HanduniaTokens.cendre,
                ),
              ],
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
              child: TextField(
                controller: _query,
                onChanged: (_) => setState(() {}),
                style: _karlaRoute(),
                decoration: InputDecoration(
                  hintText:
                      'Rechercher lieu, département, commune, arrondissement…',
                  hintStyle: _karlaRoute(
                    size: 12.5,
                    color: HanduniaTokens.cendre,
                  ),
                  prefixIcon: const Icon(Icons.search_outlined),
                  suffixIcon: _query.text.isEmpty
                      ? null
                      : IconButton(
                          onPressed: () {
                            _query.clear();
                            setState(() {});
                          },
                          icon: const Icon(Icons.close_rounded),
                        ),
                  filled: true,
                  fillColor: HanduniaTokens.nuitPortee,
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(14),
                    borderSide:
                        const BorderSide(color: HanduniaTokens.bordureForte),
                  ),
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(14),
                    borderSide:
                        const BorderSide(color: HanduniaTokens.bordureForte),
                  ),
                ),
              ),
            ),
            if (selected != null)
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 0, 12, 8),
                child: Row(
                  children: [
                    Expanded(
                      child: HanduniaTerritoryPath(
                        place: selected,
                        compact: true,
                      ),
                    ),
                    if (_territoryFocus != null) ...[
                      const SizedBox(width: 4),
                      IconButton(
                        onPressed: _clearTerritoryFocus,
                        icon: const Icon(Icons.public_rounded),
                        color: HanduniaTokens.braise,
                      ),
                    ],
                  ],
                ),
              ),
            if (_notice != null)
              Padding(
                padding: const EdgeInsets.fromLTRB(18, 0, 18, 8),
                child: Text(
                  _notice!,
                  textAlign: TextAlign.center,
                  style: _karlaRoute(
                    size: 13,
                    color: HanduniaTokens.terre,
                    weight: FontWeight.w700,
                  ),
                ),
              ),
            Expanded(
              child: _loading && _places.isEmpty
                  ? const _ConsultationState(
                      title: 'Lieux en cours',
                      color: HanduniaTokens.braise,
                      loading: true,
                    )
                  : mapPlaces.isEmpty
                  ? _ConsultationState(
                      title: 'Aucun lieu',
                      subtitle: _query.text.trim().isEmpty
                          ? 'Une zone d’ombre'
                          : 'Aucun lieu ne correspond à cette recherche.',
                    )
                  : Column(
                      children: [
                        Expanded(
                          child: LayoutBuilder(
                            builder: (context, constraints) =>
                                HanduniaUnifiedMap(
                                  places: mapPlaces,
                                  selectedPlaceId: _selectedId,
                                  height: constraints.maxHeight,
                                  onSelected: (place) => setState(
                                    () => _selectedId =
                                        place['id']?.toString(),
                                  ),
                                  onOpen: _openPlace,
                                ),
                          ),
                        ),
                        if (unlocated.isNotEmpty)
                          SizedBox(
                            height: 58,
                            child: ListView.separated(
                              padding:
                                  const EdgeInsets.fromLTRB(16, 7, 16, 7),
                              scrollDirection: Axis.horizontal,
                              itemCount: unlocated.length,
                              separatorBuilder: (_, _) =>
                                  const SizedBox(width: 7),
                              itemBuilder: (context, index) {
                                final place = unlocated[index];
                                return ActionChip(
                                  avatar: const Icon(
                                    Icons.location_off_outlined,
                                    size: 17,
                                  ),
                                  label: Text(
                                    place['name']?.toString() ??
                                        'Lieu à positionner',
                                  ),
                                  onPressed: () => _openPlace(place),
                                );
                              },
                            ),
                          ),
                      ],
                    ),
            ),
          ],
        ),
      ),
    );
  }
}

class HanduniaPlaceRoute extends StatefulWidget {
  const HanduniaPlaceRoute({
    super.key,
    required this.lieuId,
  });

  final String lieuId;

  @override
  State<HanduniaPlaceRoute> createState() => _HanduniaPlaceRouteState();
}

class _HanduniaPlaceRouteState extends State<HanduniaPlaceRoute> {
  Map<String, dynamic>? _data;
  bool _loading = true;
  String? _notice;

  @override
  void initState() {
    super.initState();
    unawaited(_load());
  }

  Future<void> _load() async {
    try {
      final data = await HanduniaConsultationExtendedData.fetchLieuDetail(
        widget.lieuId,
      );
      if (mounted) {
        setState(() {
          _data = data;
          _notice = null;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() => _notice = 'En attente de réseau');
      }
    } finally {
      if (mounted) {
        setState(() => _loading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final data = _data;
    return Scaffold(
      backgroundColor: HanduniaTokens.nuit,
      body: SafeArea(
        child: Column(
          children: [
            _handuniaHeader(
              context,
              data?['name']?.toString().trim().isNotEmpty == true
                  ? data!['name'].toString()
                  : 'Le lieu',
              actions: [
                IconButton(
                  onPressed: () => Navigator.of(context).push(
                    MaterialPageRoute<void>(
                      builder: (_) => HanduniaDivergencesRoute(
                        lieuId: widget.lieuId,
                      ),
                    ),
                  ),
                  icon: const Icon(Icons.call_split_outlined),
                  color: HanduniaTokens.terre,
                ),
              ],
            ),
            if (_notice != null)
              Text(
                _notice!,
                style: _karlaRoute(size: 12.5, color: HanduniaTokens.terre),
              ),
            Expanded(
              child: _loading && data == null
                  ? const _ConsultationState(
                      title: 'Lieu en cours',
                      color: HanduniaTokens.braise,
                      loading: true,
                    )
                  : data == null
                  ? const _ConsultationState(
                      title: 'Lieu indisponible',
                      subtitle: 'En attente de réseau',
                      color: HanduniaTokens.terre,
                    )
                  : _PlaceBody(data: data),
            ),
          ],
        ),
      ),
    );
  }
}

class _PlaceBody extends StatelessWidget {
  const _PlaceBody({required this.data});

  final Map<String, dynamic> data;

  @override
  Widget build(BuildContext context) {
    final memories = (data['memory_count'] as num?)?.toInt() ?? 0;
    final voices = (data['voice_count'] as num?)?.toInt() ?? 0;
    final oldest = data['oldest_memory'] as Map<String, dynamic>?;
    final missing = (data['missing_axes'] as List? ?? const <dynamic>[])
        .map((value) => value.toString())
        .toList(growable: false);
    final hasCoordinates =
        data['latitude'] is num && data['longitude'] is num;

    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 28),
      children: [
        if (hasCoordinates) ...[
          HanduniaUnifiedMap(
            places: <Map<String, dynamic>>[data],
            selectedPlaceId: data['id']?.toString(),
            height: 270,
            showSelectionCard: false,
            initialZoom: 13.2,
          ),
          const SizedBox(height: 10),
          HanduniaTerritoryPath(place: data),
          const SizedBox(height: 16),
        ] else ...[
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: HanduniaTokens.terre.withValues(alpha: .08),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(
                color: HanduniaTokens.terre.withValues(alpha: .50),
              ),
            ),
            child: Row(
              children: [
                const Icon(
                  Icons.location_off_outlined,
                  color: HanduniaTokens.terre,
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    'Ce lieu ancien n’a pas encore de position vérifiée. '
                    'Aucune coordonnée n’est inventée.',
                    style: _karlaRoute(
                      size: 12.5,
                      color: HanduniaTokens.cendre,
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
        ],
        Center(child: _DensityRing(memories: memories, voices: voices)),
        const SizedBox(height: 14),
        if (oldest != null)
          CarteBraise(
            souvenir: oldest,
            onOpen: () {
              final id = oldest['id']?.toString();
              if (id == null || id.isEmpty) {
                return;
              }
              Navigator.of(context).push(
                MaterialPageRoute<void>(
                  builder: (_) =>
                      HanduniaMemoryRoute(memoryId: id, seed: oldest),
                ),
              );
            },
          )
        else
          const EncartLacune(axes: ['Aucune voix ancienne']),
        const SizedBox(height: 14),
        EncartLacune(
          axes: missing.isEmpty ? const ['Une voix manque ici'] : missing,
        ),
        const SizedBox(height: 16),
        Row(
          children: [
            Expanded(
              child: SizedBox(
                height: 48,
                child: OutlinedButton(
                  onPressed: oldest?['id']?.toString().isNotEmpty == true
                      ? () async {
                          final completed =
                              await Navigator.of(context).push<bool>(
                            MaterialPageRoute<bool>(
                              builder: (_) => HanduniaGeoTraceRoute(
                                fragmentId: oldest!['id'].toString(),
                              ),
                            ),
                          );
                          if (!context.mounted || completed != true) {
                            return;
                          }
                          await Navigator.of(context).push(
                            MaterialPageRoute<void>(
                              builder: (_) => HanduniaTimelineRoute(
                                lieuId: data['id'].toString(),
                              ),
                            ),
                          );
                        }
                      : null,
                  style: OutlinedButton.styleFrom(
                    foregroundColor: HanduniaTokens.braise,
                    disabledForegroundColor: HanduniaTokens.cendre,
                    side: const BorderSide(
                      color: HanduniaTokens.bordureForte,
                    ),
                  ),
                  child: const Text('Tracer le mouvement'),
                ),
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: SizedBox(
                height: 48,
                child: OutlinedButton(
                  onPressed: () => Navigator.of(context).push(
                    MaterialPageRoute<void>(
                      builder: (_) => HanduniaTimelineRoute(
                        lieuId: data['id'].toString(),
                      ),
                    ),
                  ),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: HanduniaTokens.braise,
                    side: const BorderSide(
                      color: HanduniaTokens.bordureForte,
                    ),
                  ),
                  child: const Text('Le temps'),
                ),
              ),
            ),
          ],
        ),
      ],
    );
  }
}

class _DensityRing extends StatefulWidget {
  const _DensityRing({
    required this.memories,
    required this.voices,
  });

  final int memories;
  final int voices;

  @override
  State<_DensityRing> createState() => _DensityRingState();
}

class _DensityRingState extends State<_DensityRing>
    with SingleTickerProviderStateMixin {
  late final AnimationController _animation;

  @override
  void initState() {
    super.initState();
    _animation = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1600),
    )..forward();
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (MediaQuery.maybeOf(context)?.disableAnimations ?? false) {
      _animation
        ..stop()
        ..value = 1;
    }
  }

  @override
  void dispose() {
    _animation.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _animation,
      builder: (_, _) => SizedBox(
        width: 180,
        height: 180,
        child: CustomPaint(
          painter: _DensityRingPainter(
            progress: _animation.value,
            memories: widget.memories,
            voices: widget.voices,
          ),
          child: Center(
            child: Text(
              widget.voices.toString(),
              style: _frauncesRoute(
                size: 34,
                color: HanduniaTokens.braise,
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _DensityRingPainter extends CustomPainter {
  const _DensityRingPainter({
    required this.progress,
    required this.memories,
    required this.voices,
  });

  final double progress;
  final int memories;
  final int voices;

  @override
  void paint(Canvas canvas, Size size) {
    final center = size.center(Offset.zero);
    final maxValue = math.max(1, math.max(memories, voices));
    final memoryRatio = memories / maxValue;
    final voiceRatio = voices / maxValue;
    const start = -math.pi / 2;

    canvas.drawCircle(
      center,
      72,
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = 1
        ..color = HanduniaTokens.bordureForte,
    );
    canvas.drawArc(
      Rect.fromCircle(center: center, radius: 72),
      start,
      math.pi * 2 * memoryRatio * progress,
      false,
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = 7
        ..strokeCap = StrokeCap.round
        ..color = HanduniaTokens.braise,
    );
    canvas.drawArc(
      Rect.fromCircle(center: center, radius: 59),
      start,
      math.pi * 2 * voiceRatio * progress,
      false,
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = 4
        ..strokeCap = StrokeCap.round
        ..color = HanduniaTokens.ivoire.withValues(alpha: .72),
    );
  }

  @override
  bool shouldRepaint(covariant _DensityRingPainter oldDelegate) {
    return oldDelegate.progress != progress ||
        oldDelegate.memories != memories ||
        oldDelegate.voices != voices;
  }
}

class HanduniaTimelineRoute extends StatefulWidget {
  const HanduniaTimelineRoute({
    super.key,
    required this.lieuId,
    this.initialPeriods,
  });

  final String lieuId;
  final List<Map<String, dynamic>>? initialPeriods;

  @override
  State<HanduniaTimelineRoute> createState() => _HanduniaTimelineRouteState();
}

class _HanduniaTimelineRouteState extends State<HanduniaTimelineRoute> {
  List<Map<String, dynamic>> _periods = const [];
  int _index = 0;
  bool _loading = true;
  String? _notice;

  @override
  void initState() {
    super.initState();
    final initial = widget.initialPeriods;
    if (initial != null) {
      _periods = List<Map<String, dynamic>>.from(initial);
      _loading = false;
    } else {
      unawaited(_load());
    }
  }

  Future<void> _load() async {
    try {
      final periods = await HanduniaConsultationExtendedData.fetchTimeline(
        widget.lieuId,
      );
      if (mounted) {
        setState(() {
          _periods = periods;
          _notice = null;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() => _notice = 'En attente de réseau');
      }
    } finally {
      if (mounted) {
        setState(() => _loading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final period = _periods.isEmpty ? null : _periods[_index];
    final voices = (period?['voice_count'] as num?)?.toInt() ?? 0;

    return Scaffold(
      backgroundColor: voices == 0
          ? const Color(0xFF080A0F)
          : HanduniaTokens.nuit,
      body: SafeArea(
        child: Column(
          children: [
            _handuniaHeader(context, 'Le temps'),
            if (_notice != null)
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: Text(
                  _notice!,
                  style: _karlaRoute(
                    size: 12.5,
                    color: HanduniaTokens.terre,
                    weight: FontWeight.w600,
                  ),
                ),
              ),
            Expanded(
              child: _loading
                  ? const _ConsultationState(
                      title: 'Périodes en cours',
                      color: HanduniaTokens.braise,
                      loading: true,
                    )
                  : _periods.isEmpty
                  ? const _ConsultationState(
                      title: 'Aucune période',
                      subtitle: 'Une lacune temporelle',
                    )
                  : GestureDetector(
                      onHorizontalDragEnd: (details) {
                        final velocity =
                            details.primaryVelocity ?? 0;
                        if (velocity < 0 &&
                            _index < _periods.length - 1) {
                          setState(() => _index++);
                        } else if (velocity > 0 && _index > 0) {
                          setState(() => _index--);
                        }
                      },
                      child: Padding(
                        padding: const EdgeInsets.all(18),
                        child: Column(
                          children: [
                            SizedBox(
                              height: 42,
                              child: ListView.separated(
                                scrollDirection: Axis.horizontal,
                                itemCount: _periods.length,
                                separatorBuilder: (_, _) =>
                                    const SizedBox(width: 7),
                                itemBuilder: (context, index) {
                                  final selected = index == _index;
                                  return ChoiceChip(
                                    selected: selected,
                                    showCheckmark: false,
                                    label: Text(
                                      _periods[index]['label'].toString(),
                                    ),
                                    onSelected: (_) =>
                                        setState(() => _index = index),
                                    backgroundColor: HanduniaTokens.nuitPortee,
                                    selectedColor: HanduniaTokens.braise,
                                    side: BorderSide(
                                      color: selected
                                          ? HanduniaTokens.braise
                                          : HanduniaTokens.bordureForte,
                                    ),
                                    labelStyle: _karlaRoute(
                                      size: 12.5,
                                      color: selected
                                          ? HanduniaTokens.encre
                                          : HanduniaTokens.ivoire,
                                      weight: FontWeight.w700,
                                    ),
                                  );
                                },
                              ),
                            ),
                            const SizedBox(height: 12),
                            if (voices == 0) ...[
                              const Spacer(),
                              Text(
                                'Cette période reste dans l’ombre.',
                                textAlign: TextAlign.center,
                                style: _frauncesRoute(
                                  size: 17,
                                  color: HanduniaTokens.cendre,
                                  height: 1.55,
                                ),
                              ),
                              const Spacer(),
                            ] else ...[
                              const Spacer(),
                              HaloDensite(
                                valeur: (voices / 12).clamp(0.0, 1.0),
                                size: 150,
                              ),
                              const SizedBox(height: 14),
                              Text(
                                period!['label'].toString(),
                                style: _frauncesRoute(size: 27),
                              ),
                              const SizedBox(height: 8),
                              Text(
                                '$voices voix',
                                style: _frauncesRoute(
                                  size: 17,
                                  color: HanduniaTokens.braise,
                                ),
                              ),
                              const Spacer(),
                            ],
                            Semantics(
                              label: 'Traverser les générations',
                              child: Slider(
                                value: _index.toDouble(),
                                min: 0,
                                max: math.max(1, _periods.length - 1).toDouble(),
                                divisions: math.max(1, _periods.length - 1),
                                label: period!['label'].toString(),
                                activeColor: HanduniaTokens.braise,
                                inactiveColor: HanduniaTokens.bordureForte,
                                onChanged: (value) =>
                                    setState(() => _index = value.round()),
                              ),
                            ),
                            if (voices == 0)
                              SizedBox(
                                width: double.infinity,
                                height: 48,
                                child: OutlinedButton(
                                  onPressed: () => Navigator.of(context).push(
                                    MaterialPageRoute<void>(
                                      builder: (_) =>
                                          const HanduniaLivingMapRoute(),
                                    ),
                                  ),
                                  style: OutlinedButton.styleFrom(
                                    foregroundColor: HanduniaTokens.terre,
                                    side: const BorderSide(
                                      color: HanduniaTokens.terre,
                                    ),
                                  ),
                                  child: const Text(
                                    'Aller chercher ces voix',
                                  ),
                                ),
                              ),
                          ],
                        ),
                      ),
                    ),
            ),
          ],
        ),
      ),
    );
  }
}

class HanduniaDivergencesRoute extends StatefulWidget {
  const HanduniaDivergencesRoute({
    super.key,
    this.lieuId,
  });

  final String? lieuId;

  @override
  State<HanduniaDivergencesRoute> createState() =>
      _HanduniaDivergencesRouteState();
}

class _HanduniaDivergencesRouteState
    extends State<HanduniaDivergencesRoute> {
  List<Map<String, dynamic>> _items = const [];
  bool _loading = true;
  String? _notice;

  @override
  void initState() {
    super.initState();
    unawaited(_load());
  }

  Future<void> _load() async {
    try {
      final items = await HanduniaConsultationExtendedData.fetchDivergences(
        lieuId: widget.lieuId,
      );
      if (mounted) {
        setState(() {
          _items = items;
          _notice = null;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() => _notice = 'En attente de réseau');
      }
    } finally {
      if (mounted) {
        setState(() => _loading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: HanduniaTokens.nuit,
      body: SafeArea(
        child: Column(
          children: [
            _handuniaHeader(context, 'Divergences'),
            if (_notice != null)
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: Text(
                  _notice!,
                  style: _karlaRoute(
                    size: 12.5,
                    color: HanduniaTokens.terre,
                    weight: FontWeight.w600,
                  ),
                ),
              ),
            Expanded(
              child: _loading
                  ? const _ConsultationState(
                      title: 'Versions en cours',
                      color: HanduniaTokens.terre,
                      loading: true,
                    )
                  : _items.isEmpty
                  ? const _ConsultationState(
                      title: 'Aucune divergence',
                    )
                  : PageView.builder(
                      itemCount: _items.length,
                      itemBuilder: (_, index) =>
                          _DivergenceDetail(item: _items[index]),
                    ),
            ),
          ],
        ),
      ),
    );
  }
}

class _DivergenceDetail extends StatelessWidget {
  const _DivergenceDetail({required this.item});

  final Map<String, dynamic> item;

  @override
  Widget build(BuildContext context) {
    final versionA =
        item['version_a'] as Map<String, dynamic>? ?? const {};
    final versionB =
        item['version_b'] as Map<String, dynamic>? ?? const {};
    final opinions =
        (item['guardian_opinions'] as List? ?? const <dynamic>[])
            .cast<Map<String, dynamic>>();

    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 28),
      children: [
        const SizedBox(
          height: 90,
          child: _DivergenceThreads(),
        ),
        Text(
          item['subject']?.toString().trim().isNotEmpty == true
              ? item['subject'].toString()
              : 'Deux versions',
          textAlign: TextAlign.center,
          style: _frauncesRoute(size: 17, color: HanduniaTokens.terre),
        ),
        const SizedBox(height: 16),
        SizedBox(
          height: 270,
          child: PageView(
            children: [
              _VersionPanel(label: 'Version A', memory: versionA),
              _VersionPanel(label: 'Version B', memory: versionB),
            ],
          ),
        ),
        const SizedBox(height: 10),
        Text(
          'Glisser entre les versions',
          textAlign: TextAlign.center,
          style: _karlaRoute(size: 12.5, color: HanduniaTokens.cendre),
        ),
        const SizedBox(height: 12),
        Semantics(
          label: 'Conseil des gardiens disponible',
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(
                Icons.groups_outlined,
                size: 18,
                color: HanduniaTokens.terre,
              ),
              const SizedBox(width: 7),
              Text(
                'Conseil des gardiens disponible',
                style: _karlaRoute(
                  size: 12.5,
                  weight: FontWeight.w600,
                  color: HanduniaTokens.terre,
                ),
              ),
            ],
          ),
        ),
        if (opinions.isNotEmpty) ...[
          const SizedBox(height: 16),
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: HanduniaTokens.nuitPortee,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: HanduniaTokens.bordureForte),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Avis des gardiens',
                  style: _karlaRoute(
                    size: 12.5,
                    weight: FontWeight.w700,
                    color: HanduniaTokens.terre,
                  ),
                ),
                const SizedBox(height: 7),
                Text(
                  opinions.first['opinion']?.toString() ?? '',
                  style: _frauncesRoute(size: 15, height: 1.5),
                ),
              ],
            ),
          ),
        ],
      ],
    );
  }
}

class _VersionPanel extends StatelessWidget {
  const _VersionPanel({
    required this.label,
    required this.memory,
  });

  final String label;
  final Map<String, dynamic> memory;

  @override
  Widget build(BuildContext context) {
    final transcript = memory['transcript_text']?.toString().trim() ?? '';
    final text = transcript.isNotEmpty
        ? transcript
        : memory['text']?.toString() ?? '';

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 4),
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: HanduniaTokens.nuitPortee,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: HanduniaTokens.terre),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: _karlaRoute(
              weight: FontWeight.w700,
              color: HanduniaTokens.terre,
            ),
          ),
          const SizedBox(height: 16),
          Expanded(
            child: Text(
              '“$text”',
              style: _frauncesRoute(size: 17, height: 1.55),
            ),
          ),
          Text(
            '${memory['voice_count'] ?? 1} voix',
            style: _frauncesRoute(
              size: 15,
              color: HanduniaTokens.braise,
            ),
          ),
        ],
      ),
    );
  }
}

class _DivergenceThreads extends StatefulWidget {
  const _DivergenceThreads();

  @override
  State<_DivergenceThreads> createState() => _DivergenceThreadsState();
}

class _DivergenceThreadsState extends State<_DivergenceThreads>
    with SingleTickerProviderStateMixin {
  late final AnimationController _animation;

  @override
  void initState() {
    super.initState();
    _animation = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 4500),
    )..repeat();
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (MediaQuery.maybeOf(context)?.disableAnimations ?? false) {
      _animation
        ..stop()
        ..value = .5;
    }
  }

  @override
  void dispose() {
    _animation.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _animation,
      builder: (_, _) => CustomPaint(
        painter: _DivergenceThreadsPainter(progress: _animation.value),
      ),
    );
  }
}

class _DivergenceThreadsPainter extends CustomPainter {
  const _DivergenceThreadsPainter({required this.progress});

  final double progress;

  @override
  void paint(Canvas canvas, Size size) {
    final origin = Offset(12, size.height / 2);
    final top = Path()
      ..moveTo(origin.dx, origin.dy)
      ..quadraticBezierTo(
        size.width * .5,
        size.height * .45,
        size.width - 12,
        12,
      );
    final bottom = Path()
      ..moveTo(origin.dx, origin.dy)
      ..quadraticBezierTo(
        size.width * .5,
        size.height * .55,
        size.width - 12,
        size.height - 12,
      );
    final paint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.8
      ..color = HanduniaTokens.terre;
    canvas.drawPath(top, paint);
    canvas.drawPath(bottom, paint);

    for (final path in [top, bottom]) {
      final metric = path.computeMetrics().first;
      final tangent = metric.getTangentForOffset(metric.length * progress);
      if (tangent != null) {
        canvas.drawCircle(
          tangent.position,
          3.5,
          Paint()..color = HanduniaTokens.braise,
        );
      }
    }
  }

  @override
  bool shouldRepaint(covariant _DivergenceThreadsPainter oldDelegate) {
    return oldDelegate.progress != progress;
  }
}

class HanduniaMemoryAnswerRoute extends StatefulWidget {
  const HanduniaMemoryAnswerRoute({super.key});

  @override
  State<HanduniaMemoryAnswerRoute> createState() =>
      _HanduniaMemoryAnswerRouteState();
}

class _HanduniaMemoryAnswerRouteState
    extends State<HanduniaMemoryAnswerRoute> {
  final _questionController = TextEditingController();
  final _media = FitilaMediaController();
  Map<String, dynamic>? _answer;
  bool _busy = false;
  bool _recording = false;
  String? _notice;
  String? _lastQuestion;

  Future<void> _ask([String? provided]) async {
    final question = (provided ?? _questionController.text).trim();
    if (question.isEmpty || _busy) {
      return;
    }
    setState(() {
      _busy = true;
      _lastQuestion = question;
      _notice = null;
    });
    try {
      final answer =
          await HanduniaConsultationExtendedData.askMemory(question);
      if (mounted) {
        setState(() {
          _answer = answer;
          _notice = null;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          _answer = <String, dynamic>{
            'state': 'unavailable',
            'answer': 'Mémoire momentanément inaccessible.',
          };
          _notice = 'Connexion ou service indisponible.';
        });
      }
    } finally {
      if (mounted) {
        setState(() => _busy = false);
      }
    }
  }

  Future<void> _startVoice() async {
    if (_busy || _recording) {
      return;
    }
    await _media.startHanduniaOpusAudio();
    if (mounted) {
      setState(() => _recording = true);
    }
  }

  Future<void> _stopVoice() async {
    if (!_recording) {
      return;
    }
    final asset = await _media.stopAudio();
    if (!mounted) {
      return;
    }
    setState(() => _recording = false);
    if (asset == null) {
      return;
    }
    try {
      final transcript =
          await HanduniaConsultationExtendedData.transcribeBariba(
        await asset.readBytes(),
      );
      if (transcript != null && mounted) {
        _questionController.text = transcript;
        await _ask(transcript);
      } else if (mounted) {
        setState(() => _notice = 'Transcription vocale indisponible.');
      }
    } catch (_) {
      if (mounted) {
        setState(() => _notice = 'Transcription vocale indisponible.');
      }
    }
  }

  @override
  void dispose() {
    _questionController.dispose();
    _media.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final state = _answer?['state']?.toString();
    final color = state == 'sourced'
        ? HanduniaTokens.braise
        : state == 'refusal'
        ? HanduniaTokens.terre
        : HanduniaTokens.cendre;

    return Scaffold(
      backgroundColor: HanduniaTokens.nuit,
      body: SafeArea(
        child: Column(
          children: [
            _handuniaHeader(context, 'La mémoire répond'),
            if (_notice != null)
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: Text(
                  _notice!,
                  style: _karlaRoute(
                    size: 12.5,
                    color: HanduniaTokens.terre,
                    weight: FontWeight.w600,
                  ),
                ),
              ),
            Expanded(
              child: ListView(
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
                children: [
                  TextField(
                    controller: _questionController,
                    minLines: 1,
                    maxLines: 4,
                    textInputAction: TextInputAction.send,
                    onSubmitted: (_) => _ask(),
                    style: _karlaRoute(),
                    decoration: InputDecoration(
                      labelText: 'Question',
                      labelStyle:
                          _karlaRoute(color: HanduniaTokens.cendre),
                      filled: true,
                      fillColor: HanduniaTokens.nuitPortee,
                      enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(14),
                        borderSide: const BorderSide(
                          color: HanduniaTokens.bordureForte,
                        ),
                      ),
                      focusedBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(14),
                        borderSide: const BorderSide(
                          color: HanduniaTokens.braise,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 10),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      for (final prompt in const <String>[
                        'Comment ?',
                        'Quand ?',
                        'Qui ?',
                      ])
                        ActionChip(
                          label: Text(prompt),
                          onPressed: _busy
                              ? null
                              : () {
                                  final base =
                                      _questionController.text.trim();
                                  final question = base.isEmpty
                                      ? prompt
                                      : '$prompt $base';
                                  _questionController.text = question;
                                  _ask(question);
                                },
                          backgroundColor: HanduniaTokens.nuitPortee,
                          side: const BorderSide(
                            color: HanduniaTokens.bordureForte,
                          ),
                          labelStyle: _karlaRoute(
                            size: 12.5,
                            color: HanduniaTokens.ivoire,
                            weight: FontWeight.w700,
                          ),
                        ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  Row(
                    children: [
                      Expanded(
                        child: SizedBox(
                          height: 48,
                          child: FilledButton(
                            onPressed: _busy ? null : _ask,
                            style: FilledButton.styleFrom(
                              backgroundColor: HanduniaTokens.braise,
                              foregroundColor: HanduniaTokens.encre,
                            ),
                            child: const Text('Interroger'),
                          ),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Semantics(
                        button: true,
                        label: 'Maintenir pour poser la question',
                        child: GestureDetector(
                          onLongPressStart: (_) => _startVoice(),
                          onLongPressEnd: (_) => _stopVoice(),
                          child: Container(
                            width: 54,
                            height: 54,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              border: Border.all(
                                color: _recording
                                    ? HanduniaTokens.terre
                                    : HanduniaTokens.bordureForte,
                              ),
                            ),
                            child: Icon(
                              Icons.mic_none_outlined,
                              color: _recording
                                  ? HanduniaTokens.terre
                                  : HanduniaTokens.braise,
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                  if (_busy) ...[
                    const SizedBox(height: 24),
                    const Center(
                      child: HaloDensite(
                        valeur: .5,
                        loading: true,
                        size: 74,
                      ),
                    ),
                  ],
                  if (_answer != null && !_busy) ...[
                    const SizedBox(height: 18),
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: state == 'sourced'
                            ? HanduniaTokens.braise.withValues(alpha: .08)
                            : state == 'refusal'
                            ? HanduniaTokens.terre.withValues(alpha: .08)
                            : HanduniaTokens.nuitPortee,
                        borderRadius: BorderRadius.circular(18),
                        border: Border.all(color: color),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          if (state == 'sourced')
                            HanduniaSourcedAnswer(
                              answer:
                                  _answer!['answer']?.toString() ??
                                  'La communauté ne l’a pas encore raconté.',
                              sources:
                                  (_answer!['sources'] as List? ??
                                          const <dynamic>[])
                                      .whereType<Map>()
                                      .map(
                                        (source) =>
                                            Map<String, dynamic>.from(source),
                                      )
                                      .toList(growable: false),
                            )
                          else
                            Text(
                              state == 'refusal'
                                  ? _answer!['protocol']?.toString() ??
                                        'Accès refusé'
                                  : _answer!['answer']?.toString() ??
                                        'La communauté ne l’a pas encore raconté.',
                              style: _frauncesRoute(
                                size: 17,
                                color: color,
                                height: 1.55,
                              ),
                            ),
                        ],
                      ),
                    ),
                    if (state == 'unavailable' && _lastQuestion != null) ...[
                      const SizedBox(height: 10),
                      SizedBox(
                        width: double.infinity,
                        height: 46,
                        child: OutlinedButton.icon(
                          onPressed: _busy ? null : () => _ask(_lastQuestion),
                          icon: const Icon(Icons.refresh_outlined),
                          label: const Text('RÉESSAYER'),
                          style: OutlinedButton.styleFrom(
                            foregroundColor: HanduniaTokens.ivoire,
                            side: const BorderSide(
                              color: HanduniaTokens.bordureForte,
                            ),
                          ),
                        ),
                      ),
                    ],
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

class HanduniaFoyerRoute extends StatefulWidget {
  const HanduniaFoyerRoute({
    super.key,
    this.pendingLocal = 0,
  });

  final int pendingLocal;

  @override
  State<HanduniaFoyerRoute> createState() => _HanduniaFoyerRouteState();
}

class _HanduniaFoyerRouteState extends State<HanduniaFoyerRoute>
    with SingleTickerProviderStateMixin {
  Map<String, dynamic>? _data;
  bool _loading = true;
  late final AnimationController _flame;

  @override
  void initState() {
    super.initState();
    _flame = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 6000),
    )..repeat(reverse: true);
    unawaited(_load());
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (MediaQuery.maybeOf(context)?.disableAnimations ?? false) {
      _flame
        ..stop()
        ..value = .5;
    }
  }

  Future<void> _load() async {
    try {
      final data = await HanduniaConsultationExtendedData.fetchFoyer();
      if (mounted) {
        setState(() => _data = data);
      }
    } catch (_) {
      if (mounted) {
        setState(() => _data = null);
      }
    } finally {
      if (mounted) {
        setState(() => _loading = false);
      }
    }
  }

  @override
  void dispose() {
    _flame.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final data = _data;
    return Scaffold(
      backgroundColor: HanduniaTokens.nuit,
      body: SafeArea(
        child: Column(
          children: [
            _handuniaHeader(context, 'Le foyer'),
            Expanded(
              child: _loading
                  ? const _ConsultationState(
                      title: 'Foyer en cours',
                      color: HanduniaTokens.braise,
                      loading: true,
                    )
                  : data == null
                  ? const _ConsultationState(
                      title: 'Foyer indisponible',
                      subtitle: 'En attente de réseau',
                      color: HanduniaTokens.terre,
                    )
                  : ListView(
                      padding: const EdgeInsets.fromLTRB(16, 8, 16, 28),
                      children: [
                        Center(
                          child: AnimatedBuilder(
                            animation: _flame,
                            builder: (_, _) => CustomPaint(
                              size: const Size(90, 110),
                              painter: _FlamePainter(
                                volume:
                                    (data['volume'] as num?)?.toInt() ?? 0,
                                phase: _flame.value,
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(height: 10),
                        Text(
                          '${data['volume'] ?? 0} mémoires locales',
                          textAlign: TextAlign.center,
                          style: _frauncesRoute(
                            size: 17,
                            color: HanduniaTokens.cendre,
                          ),
                        ),
                        const SizedBox(height: 14),
                        Row(
                          children: [
                            Expanded(
                              child: _FoyerMetric(
                                value:
                                    data['synchronized']?.toString() ?? '0',
                                label: 'synchronisés',
                              ),
                            ),
                            Expanded(
                              child: _FoyerMetric(
                                value: widget.pendingLocal.toString(),
                                label: 'en attente',
                              ),
                            ),
                            Expanded(
                              child: _FoyerMetric(
                                value: data['withdrawn']?.toString() ?? '0',
                                label: 'retirés',
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 18),
                        Text(
                          'Rendu au village',
                          style: _frauncesRoute(size: 17),
                        ),
                        const SizedBox(height: 8),
                        for (final item
                            in (data['returns'] as List? ??
                                    const <dynamic>[])
                                .cast<Map<String, dynamic>>())
                          ListTile(
                            minTileHeight: 48,
                            contentPadding: EdgeInsets.zero,
                            title: Text(
                              item['title']?.toString() ?? '',
                              style:
                                  _karlaRoute(weight: FontWeight.w600),
                            ),
                            trailing: const Icon(
                              Icons.open_in_new_outlined,
                              color: HanduniaTokens.cendre,
                            ),
                            onTap: item['resource_url'] == null
                                ? null
                                : () => launchUrl(
                                      Uri.parse(
                                        item['resource_url'].toString(),
                                      ),
                                    ),
                          ),
                        const SizedBox(height: 16),
                        Text(
                          'Gardiens',
                          style: _frauncesRoute(size: 17),
                        ),
                        const SizedBox(height: 8),
                        Wrap(
                          spacing: 8,
                          runSpacing: 8,
                          children: [
                            for (final guardian
                                in (data['guardians'] as List? ??
                                        const <dynamic>[])
                                    .cast<Map<String, dynamic>>())
                              Container(
                                width: 44,
                                height: 44,
                                alignment: Alignment.center,
                                decoration: BoxDecoration(
                                  shape: BoxShape.circle,
                                  border: Border.all(
                                    color: HanduniaTokens.bordureForte,
                                  ),
                                ),
                                child: Text(
                                  guardian['initials']?.toString() ?? 'HW',
                                  style: _frauncesRoute(size: 12),
                                ),
                              ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        Text(
                          'Désignés par la communauté',
                          style: _karlaRoute(
                            size: 12.5,
                            color: HanduniaTokens.cendre,
                          ),
                        ),
                      ],
                    ),
            ),
          ],
        ),
      ),
    );
  }
}

class _FoyerMetric extends StatelessWidget {
  const _FoyerMetric({
    required this.value,
    required this.label,
  });

  final String value;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Text(
          value,
          style: _frauncesRoute(
            size: 27,
            color: HanduniaTokens.braise,
          ),
        ),
        Text(
          label,
          style: _karlaRoute(
            size: 12.5,
            color: HanduniaTokens.cendre,
          ),
        ),
      ],
    );
  }
}

class _FlamePainter extends CustomPainter {
  const _FlamePainter({
    required this.volume,
    required this.phase,
  });

  final int volume;
  final double phase;

  @override
  void paint(Canvas canvas, Size size) {
    final strength = (volume / 250).clamp(.18, 1.0);
    final sway = (phase - .5) * 6 * strength;
    final path = Path()
      ..moveTo(size.width / 2, size.height)
      ..cubicTo(
        8 + sway,
        size.height * .72,
        size.width * .25,
        size.height * .38,
        size.width * .5 + sway,
        5,
      )
      ..cubicTo(
        size.width * .86,
        size.height * .42,
        size.width - 8 + sway,
        size.height * .72,
        size.width / 2,
        size.height,
      );
    canvas.drawPath(
      path,
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = 2
        ..color = HanduniaTokens.braise.withValues(
          alpha: .45 + .45 * strength,
        ),
    );
  }

  @override
  bool shouldRepaint(covariant _FlamePainter oldDelegate) {
    return oldDelegate.volume != volume || oldDelegate.phase != phase;
  }
}

class HanduniaTraceRoute extends StatefulWidget {
  const HanduniaTraceRoute({
    super.key,
    required this.fragmentId,
    this.saveOverride,
    this.completionDelay = const Duration(milliseconds: 1500),
  });

  final String? fragmentId;
  final Future<void> Function(
    List<Map<String, double>> points,
    DateTime capturedAt,
  )? saveOverride;
  final Duration completionDelay;

  @override
  State<HanduniaTraceRoute> createState() => _HanduniaTraceRouteState();
}

class _HanduniaTraceRouteState extends State<HanduniaTraceRoute>
    with SingleTickerProviderStateMixin {
  final List<Offset> _points = [];
  double _replay = 1;
  bool _saved = false;
  late final AnimationController _travel;
  String? _notice;
  int _completionGeneration = 0;

  @override
  void initState() {
    super.initState();
    _travel = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 4500),
    )..addListener(() {
        if (mounted && _saved) {
          setState(() => _replay = _travel.value);
        }
      });
    if (widget.saveOverride == null) {
      unawaited(_flushPendingPaths());
    }
  }

  @override
  void dispose() {
    _travel.dispose();
    super.dispose();
  }

  Future<void> _flushPendingPaths() async {
    final preferences = await SharedPreferences.getInstance();
    const key = 'handunia_pending_paths_v1';
    final raw = preferences.getString(key);
    if (raw == null || raw.isEmpty) {
      return;
    }

    List<dynamic> queued;
    try {
      final decoded = jsonDecode(raw);
      if (decoded is! List) {
        await preferences.remove(key);
        return;
      }
      queued = decoded;
    } catch (_) {
      await preferences.remove(key);
      return;
    }

    final remaining = <dynamic>[];
    for (final rawItem in queued) {
      if (rawItem is! Map) {
        continue;
      }
      final item = Map<String, dynamic>.from(rawItem);
      final fragmentId = item['fragment_id']?.toString() ?? '';
      final capturedAt = DateTime.tryParse(
        item['captured_at']?.toString() ?? '',
      );
      final rawPoints = item['path_points'];
      if (fragmentId.isEmpty || rawPoints is! List) {
        continue;
      }
      final points = <Map<String, double>>[];
      for (final rawPoint in rawPoints) {
        if (rawPoint is! Map) {
          continue;
        }
        final x = rawPoint['x'];
        final y = rawPoint['y'];
        if (x is num && y is num) {
          points.add(<String, double>{
            'x': x.toDouble(),
            'y': y.toDouble(),
          });
        }
      }
      if (points.length < 2) {
        continue;
      }

      try {
        await HanduniaConsultationExtendedData.savePath(
          fragmentId: fragmentId,
          points: points,
          capturedAt: capturedAt,
        );
      } catch (_) {
        remaining.add(item);
      }
    }

    if (remaining.isEmpty) {
      await preferences.remove(key);
      if (mounted && _notice == 'En attente de réseau') {
        setState(() => _notice = null);
      }
    } else {
      await preferences.setString(key, jsonEncode(remaining));
    }
  }

  Future<void> _save(Size size) async {
    final id = widget.fragmentId;
    if (id == null || id.isEmpty || _points.length < 2) {
      return;
    }
    final normalized = _points
        .map(
          (point) => <String, double>{
            'x': (point.dx / size.width).clamp(0.0, 1.0),
            'y': (point.dy / size.height).clamp(0.0, 1.0),
          },
        )
        .toList(growable: false);
    final capturedAt = DateTime.now().toUtc().toIso8601String();

    try {
      final capturedDate = DateTime.parse(capturedAt);
      if (widget.saveOverride != null) {
        await widget.saveOverride!(normalized, capturedDate);
      } else {
        await HanduniaConsultationExtendedData.savePath(
          fragmentId: id,
          points: normalized,
          capturedAt: capturedDate,
        );
        unawaited(_flushPendingPaths());
      }
      if (mounted) {
        setState(() => _notice = 'Trajet enregistré.');
      }
    } catch (_) {
      final preferences = await SharedPreferences.getInstance();
      final key = 'handunia_pending_paths_v1';
      final existing = preferences.getString(key);
      final queue = <dynamic>[];
      if (existing != null && existing.isNotEmpty) {
        try {
          final decoded = jsonDecode(existing);
          if (decoded is List) {
            queue.addAll(decoded);
          }
        } catch (_) {
          // Une file locale illisible est remplacée par la trajectoire courante.
        }
      }
      queue.add(<String, dynamic>{
        'fragment_id': id,
        'captured_at': capturedAt,
        'path_points': normalized,
      });
      await preferences.setString(key, jsonEncode(queue));
      if (mounted) {
        setState(
          () => _notice =
              'Trajet enregistré sur cet appareil · synchronisation automatique.',
        );
      }
    }

    if (mounted) {
      final reduceMotion =
          MediaQuery.maybeOf(context)?.disableAnimations ?? false;
      setState(() {
        _saved = true;
        _replay = reduceMotion ? 1 : 0;
      });
      if (reduceMotion) {
        _travel
          ..stop()
          ..value = 1;
      } else {
        _travel.forward(from: 0);
      }
      final generation = ++_completionGeneration;
      unawaited(_advanceAfterSave(generation));
    }
  }

  Future<void> _advanceAfterSave(int generation) async {
    await Future<void>.delayed(widget.completionDelay);
    if (!mounted ||
        !_saved ||
        generation != _completionGeneration) {
      return;
    }
    Navigator.of(context).pop(true);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: HanduniaTokens.nuit,
      body: SafeArea(
        child: Column(
          children: [
            _handuniaHeader(context, 'Tracer'),
            Padding(
              padding: const EdgeInsets.fromLTRB(18, 0, 18, 8),
              child: Text(
                _saved
                    ? 'Trajet validé · étape suivante automatique…'
                    : 'Dessinez le trajet puis relâchez votre doigt pour valider.',
                textAlign: TextAlign.center,
                style: _karlaRoute(
                  size: 13.5,
                  color: _saved
                      ? HanduniaTokens.braise
                      : HanduniaTokens.ivoire,
                  weight: FontWeight.w700,
                ),
              ),
            ),
            if (_notice != null)
              Container(
                width: double.infinity,
                margin: const EdgeInsets.fromLTRB(18, 0, 18, 8),
                padding: const EdgeInsets.symmetric(
                  horizontal: 14,
                  vertical: 10,
                ),
                decoration: BoxDecoration(
                  color: (_saved
                          ? HanduniaTokens.braise
                          : HanduniaTokens.terre)
                      .withValues(alpha: .10),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: (_saved
                            ? HanduniaTokens.braise
                            : HanduniaTokens.terre)
                        .withValues(alpha: .55),
                  ),
                ),
                child: Text(
                  _notice!,
                  textAlign: TextAlign.center,
                  style: _karlaRoute(
                    size: 13,
                    color: HanduniaTokens.ivoire,
                    weight: FontWeight.w600,
                  ),
                ),
              ),
            Expanded(
              child: LayoutBuilder(
                builder: (context, constraints) {
                  final size = Size(
                    constraints.maxWidth,
                    constraints.maxHeight,
                  );
                  return GestureDetector(
                    onPanStart: (details) {
                      _travel.stop();
                      setState(() {
                        _saved = false;
                        _completionGeneration += 1;
                        _replay = 1;
                        _points
                          ..clear()
                          ..add(details.localPosition);
                      });
                    },
                    onPanUpdate: (details) =>
                        setState(() => _points.add(details.localPosition)),
                    onPanEnd: (_) => _save(size),
                    child: CustomPaint(
                      size: size,
                      painter: _TracePainter(
                        points: _points,
                        replay: _replay,
                      ),
                      child: Center(
                        child: _points.isEmpty
                            ? Text(
                                'Tracer le mouvement',
                                style: _karlaRoute(
                                  color: HanduniaTokens.cendre,
                                ),
                              )
                            : null,
                      ),
                    ),
                  );
                },
              ),
            ),
            if (_saved)
              Container(
                margin: const EdgeInsets.fromLTRB(18, 4, 18, 18),
                padding: const EdgeInsets.fromLTRB(14, 10, 14, 10),
                decoration: BoxDecoration(
                  color: HanduniaTokens.nuitPortee,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: HanduniaTokens.braise),
                ),
                child: Row(
                  children: [
                    const Icon(
                      Icons.check_circle_outline,
                      color: HanduniaTokens.braise,
                      size: 24,
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        'Trajet validé',
                        style: _karlaRoute(
                          size: 15,
                          color: HanduniaTokens.ivoire,
                          weight: FontWeight.w700,
                        ),
                      ),
                    ),
                    TextButton(
                      onPressed: () {
                        _travel.stop();
                        setState(() {
                          _saved = false;
                          _completionGeneration += 1;
                          _points.clear();
                          _replay = 1;
                          _notice = null;
                        });
                      },
                      child: const Text('Recommencer'),
                    ),
                  ],
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class _TracePainter extends CustomPainter {
  const _TracePainter({
    required this.points,
    required this.replay,
  });

  final List<Offset> points;
  final double replay;

  @override
  void paint(Canvas canvas, Size size) {
    if (points.length < 2) {
      return;
    }
    final path = Path()..moveTo(points.first.dx, points.first.dy);
    for (var i = 1; i < points.length; i++) {
      path.lineTo(points[i].dx, points[i].dy);
    }
    canvas.drawPath(
      path,
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = 2
        ..strokeCap = StrokeCap.round
        ..color = HanduniaTokens.braise,
    );

    final sparkIndex = ((points.length - 1) * replay)
        .round()
        .clamp(0, points.length - 1)
        .toInt();
    canvas.drawCircle(
      points[sparkIndex],
      3.5,
      Paint()..color = HanduniaTokens.ivoire,
    );
  }

  @override
  bool shouldRepaint(covariant _TracePainter oldDelegate) {
    return oldDelegate.points.length != points.length ||
        oldDelegate.replay != replay;
  }
}
