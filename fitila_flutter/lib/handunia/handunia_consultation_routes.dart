
import 'dart:async';
import 'dart:io';
import 'dart:math' as math;

import 'package:audioplayers/audioplayers.dart' as audio;
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:url_launcher/url_launcher.dart';

import '../core/fitila_media.dart';
import 'handunia_consultation_extended_data.dart';
import 'handunia_consultation_ui.dart';

TextStyle _frauncesRoute({
  double size = 17,
  Color color = HanduniaTokens.ivoire,
  double height = 1.2,
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
  double size = 13.5,
  FontWeight weight = FontWeight.w400,
  Color color = HanduniaTokens.ivoire,
  double height = 1.35,
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
            ),
          ),
        ),
        Expanded(child: Text(title, style: _frauncesRoute(size: 27))),
        ...actions,
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
                style: _karlaRoute(size: 11.5, color: HanduniaTokens.cendre),
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
                    size: 11.5,
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
            style: _karlaRoute(size: 11.5, color: HanduniaTokens.cendre),
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
          width: 112,
          height: 112,
          child: Stack(
            alignment: Alignment.center,
            children: [
              HaloDensite(valeur: density, size: 112),
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
          style: _karlaRoute(size: 11.5, color: HanduniaTokens.cendre),
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
    await _media.startAudio();
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
  });

  final int pendingLocal;

  @override
  State<HanduniaLivingMapRoute> createState() => _HanduniaLivingMapRouteState();
}

class _HanduniaLivingMapRouteState extends State<HanduniaLivingMapRoute> {
  List<Map<String, dynamic>> _places = const [];
  int _selectedIndex = 0;
  bool _loading = true;
  String? _notice;

  @override
  void initState() {
    super.initState();
    unawaited(_load());
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final places = await HanduniaConsultationExtendedData.fetchLivingMap();
      if (!mounted) {
        return;
      }
      setState(() {
        _places = places;
        _selectedIndex = places.isEmpty
            ? 0
            : _selectedIndex.clamp(0, places.length - 1);
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

  @override
  Widget build(BuildContext context) {
    final selected = _places.isEmpty ? null : _places[_selectedIndex];
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
                  tooltip: 'Interroger',
                  onPressed: () => Navigator.of(context).push(
                    MaterialPageRoute<void>(
                      builder: (_) => const HanduniaMemoryAnswerRoute(),
                    ),
                  ),
                  icon: const Icon(Icons.question_answer_outlined),
                  color: HanduniaTokens.cendre,
                ),
                IconButton(
                  tooltip: 'Foyer',
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
            if (_notice != null)
              Text(
                _notice!,
                style: _karlaRoute(
                  size: 11.5,
                  color: HanduniaTokens.terre,
                  weight: FontWeight.w600,
                ),
              ),
            Expanded(
              child: _loading && _places.isEmpty
                  ? const _ConsultationState(
                      title: 'Lieux en cours',
                      color: HanduniaTokens.braise,
                      loading: true,
                    )
                  : _places.isEmpty
                  ? const _ConsultationState(
                      title: 'Aucun lieu',
                      subtitle: 'Une zone d’ombre',
                    )
                  : Stack(
                      children: [
                        Positioned.fill(
                          child: CustomPaint(
                            painter: _MapThreadsPainter(count: _places.length),
                          ),
                        ),
                        for (var i = 0; i < _places.length; i++)
                          _MapPlaceNode(
                            index: i,
                            total: _places.length,
                            place: _places[i],
                            selected: i == _selectedIndex,
                            onTap: () =>
                                setState(() => _selectedIndex = i),
                          ),
                      ],
                    ),
            ),
            if (selected != null)
              Container(
                margin: const EdgeInsets.fromLTRB(16, 8, 16, 18),
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: HanduniaTokens.nuitPortee,
                  borderRadius: BorderRadius.circular(18),
                  border: Border.all(color: HanduniaTokens.bordureForte),
                ),
                child: Row(
                  children: [
                    Expanded(
                      child: Text(
                        selected['name']?.toString() ?? '',
                        style: _frauncesRoute(size: 17),
                      ),
                    ),
                    Text(
                      '${selected['voice_count'] ?? 0} voix',
                      style: _frauncesRoute(
                        size: 15,
                        color: HanduniaTokens.braise,
                      ),
                    ),
                    const SizedBox(width: 4),
                    SizedBox(
                      width: 44,
                      height: 44,
                      child: IconButton(
                        tooltip: 'Ouvrir le lieu',
                        onPressed: () => Navigator.of(context).push(
                          MaterialPageRoute<void>(
                            builder: (_) => HanduniaPlaceRoute(
                              lieuId: selected['id'].toString(),
                            ),
                          ),
                        ),
                        icon: const Icon(Icons.arrow_forward_outlined),
                        color: HanduniaTokens.braise,
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

class _MapPlaceNode extends StatelessWidget {
  const _MapPlaceNode({
    required this.index,
    required this.total,
    required this.place,
    required this.selected,
    required this.onTap,
  });

  final int index;
  final int total;
  final Map<String, dynamic> place;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final angle = -math.pi / 2 +
        (math.pi * 2 * index / math.max(1, total));
    final x = .5 + .34 * math.cos(angle);
    final y = .48 + .34 * math.sin(angle);
    final voices = (place['voice_count'] as num?)?.toInt() ?? 0;
    return Align(
      alignment: Alignment(x * 2 - 1, y * 2 - 1),
      child: Semantics(
        button: true,
        label:
            '${place['name']?.toString() ?? ''}, $voices voix',
        child: GestureDetector(
          onTap: onTap,
          child: Container(
            width: 78,
            height: 78,
            alignment: Alignment.center,
            decoration: selected
                ? BoxDecoration(
                    shape: BoxShape.circle,
                    border: Border.all(color: HanduniaTokens.ivoire),
                  )
                : null,
            child: HaloDensite(
              valeur: (voices / 12).clamp(0.0, 1.0),
              size: 68,
            ),
          ),
        ),
      ),
    );
  }
}

class _MapThreadsPainter extends CustomPainter {
  const _MapThreadsPainter({required this.count});

  final int count;

  @override
  void paint(Canvas canvas, Size size) {
    if (count < 2) {
      return;
    }
    final center = size.center(Offset.zero);
    final paint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1
      ..color = HanduniaTokens.bordure;
    for (var i = 0; i < count; i++) {
      final angle = -math.pi / 2 + math.pi * 2 * i / count;
      canvas.drawLine(
        center,
        Offset(
          size.width * (.5 + .34 * math.cos(angle)),
          size.height * (.48 + .34 * math.sin(angle)),
        ),
        paint,
      );
    }
  }

  @override
  bool shouldRepaint(covariant _MapThreadsPainter oldDelegate) {
    return oldDelegate.count != count;
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
                  tooltip: 'Divergences',
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
                style: _karlaRoute(size: 11.5, color: HanduniaTokens.terre),
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

    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 28),
      children: [
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
                  onPressed: () => Navigator.of(context).push(
                    MaterialPageRoute<void>(
                      builder: (_) => HanduniaTraceRoute(
                        fragmentId: oldest?['id']?.toString(),
                      ),
                    ),
                  ),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: HanduniaTokens.braise,
                    side: const BorderSide(
                      color: HanduniaTokens.bordureForte,
                    ),
                  ),
                  child: const Text('Le geste'),
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
  });

  final String lieuId;

  @override
  State<HanduniaTimelineRoute> createState() => _HanduniaTimelineRouteState();
}

class _HanduniaTimelineRouteState extends State<HanduniaTimelineRoute> {
  List<Map<String, dynamic>> _periods = const [];
  int _index = 0;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    unawaited(_load());
  }

  Future<void> _load() async {
    try {
      final periods = await HanduniaConsultationExtendedData.fetchTimeline(
        widget.lieuId,
      );
      if (mounted) {
        setState(() => _periods = periods);
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
      backgroundColor: HanduniaTokens.nuit,
      body: SafeArea(
        child: Column(
          children: [
            _handuniaHeader(context, 'Le temps'),
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
                        if (velocity < 0 && _index < 4) {
                          setState(() => _index++);
                        } else if (velocity > 0 && _index > 0) {
                          setState(() => _index--);
                        }
                      },
                      child: Padding(
                        padding: const EdgeInsets.all(18),
                        child: Column(
                          children: [
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
                              voices == 0
                                  ? 'Aucune voix ici.'
                                  : '$voices voix',
                              style: _frauncesRoute(
                                size: 17,
                                color: voices == 0
                                    ? HanduniaTokens.cendre
                                    : HanduniaTokens.braise,
                              ),
                            ),
                            const Spacer(),
                            Slider(
                              value: _index.toDouble(),
                              min: 0,
                              max: 4,
                              divisions: 4,
                              label: period['label'].toString(),
                              activeColor: HanduniaTokens.braise,
                              inactiveColor: HanduniaTokens.bordureForte,
                              onChanged: (value) =>
                                  setState(() => _index = value.round()),
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
        setState(() => _items = items);
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
          style: _karlaRoute(size: 11.5, color: HanduniaTokens.cendre),
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
            child: Text(
              opinions.first['opinion']?.toString() ?? '',
              style: _frauncesRoute(size: 15, height: 1.5),
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

  Future<void> _ask([String? provided]) async {
    final question = (provided ?? _questionController.text).trim();
    if (question.isEmpty || _busy) {
      return;
    }
    setState(() => _busy = true);
    try {
      final answer =
          await HanduniaConsultationExtendedData.askMemory(question);
      if (mounted) {
        setState(() => _answer = answer);
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
    await _media.startAudio();
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
    final transcript = await HanduniaConsultationExtendedData.transcribeBariba(
      await asset.readBytes(),
    );
    if (transcript != null && mounted) {
      _questionController.text = transcript;
      await _ask(transcript);
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
                          if (state == 'sourced') ...[
                            const SizedBox(height: 12),
                            Wrap(
                              spacing: 7,
                              runSpacing: 7,
                              children: [
                                for (final rawSource
                                    in (_answer!['sources'] as List? ??
                                        const <dynamic>[]))
                                  PastilleSource(
                                    temoin: (rawSource as Map)['witness']
                                            ?.toString() ??
                                        'TV',
                                    annee:
                                        rawSource['year']?.toString() ?? '',
                                  ),
                              ],
                            ),
                          ],
                        ],
                      ),
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
                            size: 11.5,
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
            size: 11.5,
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
  });

  final String? fragmentId;

  @override
  State<HanduniaTraceRoute> createState() => _HanduniaTraceRouteState();
}

class _HanduniaTraceRouteState extends State<HanduniaTraceRoute> {
  final List<Offset> _points = [];
  double _replay = 1;
  bool _saved = false;

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
    await HanduniaConsultationExtendedData.savePath(
      fragmentId: id,
      points: normalized,
    );
    if (mounted) {
      setState(() {
        _saved = true;
        _replay = 1;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: HanduniaTokens.nuit,
      body: SafeArea(
        child: Column(
          children: [
            _handuniaHeader(context, 'Tracer'),
            Expanded(
              child: LayoutBuilder(
                builder: (context, constraints) {
                  final size = Size(
                    constraints.maxWidth,
                    constraints.maxHeight,
                  );
                  return GestureDetector(
                    onPanStart: (details) => setState(() {
                      _saved = false;
                      _replay = 1;
                      _points
                        ..clear()
                        ..add(details.localPosition);
                    }),
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
              Padding(
                padding: const EdgeInsets.fromLTRB(18, 0, 18, 18),
                child: Semantics(
                  label: 'Revenir dans la trajectoire',
                  child: Slider(
                    value: _replay,
                    min: 0,
                    max: 1,
                    activeColor: HanduniaTokens.braise,
                    inactiveColor: HanduniaTokens.bordureForte,
                    onChanged: (value) => setState(() => _replay = value),
                  ),
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
    final lastIndex =
        ((points.length - 1) * replay).round().clamp(1, points.length - 1);
    final path = Path()..moveTo(points.first.dx, points.first.dy);
    for (var i = 1; i <= lastIndex; i++) {
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
  }

  @override
  bool shouldRepaint(covariant _TracePainter oldDelegate) {
    return oldDelegate.points.length != points.length ||
        oldDelegate.replay != replay;
  }
}
