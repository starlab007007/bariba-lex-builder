import 'dart:async';
import 'dart:io';
import 'dart:math' as math;

import 'package:audioplayers/audioplayers.dart' as audio;
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'handunia_consultation_model.dart';

abstract final class HanduniaTokens {
  static const nuit = Color(0xFF0D1018);
  static const nuitPortee = Color(0xFF151A24);
  static const bordure = Color(0xFF242C39);
  static const bordureForte = Color(0xFF2E3848);
  static const braise = Color(0xFFE0A03C);
  static const terre = Color(0xFFC96A3F);
  static const ivoire = Color(0xFFF3EFE6);
  static const cendre = Color(0xFF9A9386);
  static const encre = Color(0xFF14100A);
}

TextStyle _fraunces({
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

TextStyle _karla({
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

class HaloDensite extends StatefulWidget {
  const HaloDensite({
    super.key,
    required this.valeur,
    this.size = 76,
    this.loading = false,
  });

  final double valeur;
  final double size;
  final bool loading;

  @override
  State<HaloDensite> createState() => _HaloDensiteState();
}

class _HaloDensiteState extends State<HaloDensite>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;
  bool _reduceMotion = false;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(vsync: this);
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _syncAnimation();
  }

  @override
  void didUpdateWidget(covariant HaloDensite oldWidget) {
    super.didUpdateWidget(oldWidget);
    _syncAnimation();
  }

  void _syncAnimation() {
    _reduceMotion = MediaQuery.maybeOf(context)?.disableAnimations ?? false;
    final value = widget.valeur.clamp(0.0, 1.0);
    if (_reduceMotion || (value <= 0 && !widget.loading)) {
      _controller.stop();
      _controller.value = 0.5;
      return;
    }
    final millis = (7000 - 2000 * value).round();
    _controller.duration = Duration(milliseconds: millis);
    if (!_controller.isAnimating) {
      _controller.repeat(reverse: true);
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return RepaintBoundary(
      child: AnimatedBuilder(
        animation: _controller,
        builder: (context, _) {
          final pulse = _reduceMotion ? 0.5 : _controller.value;
          return CustomPaint(
            size: Size.square(widget.size),
            painter: _HaloPainter(
              density: widget.valeur.clamp(0.0, 1.0),
              pulse: pulse,
              loading: widget.loading,
            ),
          );
        },
      ),
    );
  }
}

class _HaloPainter extends CustomPainter {
  const _HaloPainter({
    required this.density,
    required this.pulse,
    required this.loading,
  });

  final double density;
  final double pulse;
  final bool loading;

  @override
  void paint(Canvas canvas, Size size) {
    final center = size.center(Offset.zero);
    final maxRadius = size.shortestSide / 2;
    final live = density > 0 || loading;
    final radius = live
        ? maxRadius * (0.68 + 0.12 * pulse + 0.12 * density)
        : maxRadius * 0.72;
    final paint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.4
      ..color = live
          ? HanduniaTokens.braise.withValues(alpha: 0.35 + 0.35 * density)
          : HanduniaTokens.cendre.withValues(alpha: 0.55);

    if (!live) {
      const segments = 18;
      for (var i = 0; i < segments; i++) {
        final start = (math.pi * 2 / segments) * i;
        canvas.drawArc(
          Rect.fromCircle(center: center, radius: radius),
          start,
          math.pi / segments,
          false,
          paint,
        );
      }
    } else {
      canvas.drawCircle(center, radius, paint);
      paint.color = HanduniaTokens.braise.withValues(alpha: 0.12);
      canvas.drawCircle(center, radius * 0.7, paint);
    }
    canvas.drawCircle(
      center,
      4 + 4 * density,
      Paint()..color = live ? HanduniaTokens.braise : HanduniaTokens.cendre,
    );
  }

  @override
  bool shouldRepaint(covariant _HaloPainter oldDelegate) {
    return density != oldDelegate.density ||
        pulse != oldDelegate.pulse ||
        loading != oldDelegate.loading;
  }
}

class OndeAudio extends StatefulWidget {
  const OndeAudio({
    super.key,
    required this.progression,
    required this.actif,
    this.height = 34,
  });

  final double progression;
  final bool actif;
  final double height;

  @override
  State<OndeAudio> createState() => _OndeAudioState();
}

class _OndeAudioState extends State<OndeAudio>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;
  bool _reduceMotion = false;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 760),
    );
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _sync();
  }

  @override
  void didUpdateWidget(covariant OndeAudio oldWidget) {
    super.didUpdateWidget(oldWidget);
    _sync();
  }

  void _sync() {
    _reduceMotion = MediaQuery.maybeOf(context)?.disableAnimations ?? false;
    if (widget.actif && !_reduceMotion) {
      if (!_controller.isAnimating) {
        _controller.repeat();
      }
    } else {
      _controller.stop();
      _controller.value = 0;
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: widget.height,
      width: double.infinity,
      child: RepaintBoundary(
        child: AnimatedBuilder(
          animation: _controller,
          builder: (context, _) {
            return CustomPaint(
              painter: _WavePainter(
                progress: widget.progression.clamp(0.0, 1.0),
                phase: _reduceMotion ? 0 : _controller.value,
                active: widget.actif && !_reduceMotion,
              ),
            );
          },
        ),
      ),
    );
  }
}

class _WavePainter extends CustomPainter {
  const _WavePainter({
    required this.progress,
    required this.phase,
    required this.active,
  });

  final double progress;
  final double phase;
  final bool active;

  @override
  void paint(Canvas canvas, Size size) {
    const bars = 34;
    const gap = 2.4;
    final width = (size.width - gap * (bars - 1)) / bars;
    for (var i = 0; i < bars; i++) {
      final x = i / (bars - 1);
      final base = 0.24 + 0.62 * (0.5 + 0.5 * math.sin(i * 1.71));
      final motion = active
          ? 0.12 * math.sin((phase * math.pi * 2) + i * 0.74)
          : 0.0;
      final h = size.height * (base + motion).clamp(0.16, 0.94);
      final rect = RRect.fromRectAndRadius(
        Rect.fromLTWH(
          i * (width + gap),
          (size.height - h) / 2,
          width,
          h,
        ),
        const Radius.circular(2),
      );
      final listened = x <= progress;
      canvas.drawRRect(
        rect,
        Paint()
          ..color = listened
              ? HanduniaTokens.braise
              : HanduniaTokens.bordureForte,
      );
    }
  }

  @override
  bool shouldRepaint(covariant _WavePainter oldDelegate) {
    return progress != oldDelegate.progress ||
        phase != oldDelegate.phase ||
        active != oldDelegate.active;
  }
}

class PastilleSource extends StatelessWidget {
  const PastilleSource({
    super.key,
    required this.temoin,
    required this.annee,
  });

  final String temoin;
  final String annee;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      label: 'Témoin ' + temoin + ', ' + annee,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 6),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(999),
          border: Border.all(color: HanduniaTokens.bordureForte),
        ),
        child: Text(
          temoin + ' · ' + annee,
          style: _karla(
            size: 11.5,
            weight: FontWeight.w600,
            color: HanduniaTokens.cendre,
          ),
        ),
      ),
    );
  }
}

class BadgeSceau extends StatelessWidget {
  const BadgeSceau({
    super.key,
    this.hash,
    this.pending = false,
  });

  final String? hash;
  final bool pending;

  @override
  Widget build(BuildContext context) {
    final sealed = hash != null && hash!.trim().isNotEmpty;
    final label = sealed
        ? 'Scellé'
        : pending
        ? 'Sceau absent'
        : 'Non scellé';
    return Semantics(
      label: label,
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            Icons.fingerprint,
            size: 15,
            color: sealed ? HanduniaTokens.braise : HanduniaTokens.cendre,
          ),
          const SizedBox(width: 5),
          Text(
            label,
            style: _karla(
              size: 11.5,
              weight: FontWeight.w600,
              color: sealed ? HanduniaTokens.braise : HanduniaTokens.cendre,
            ),
          ),
        ],
      ),
    );
  }
}

class CercleDePortee extends StatelessWidget {
  const CercleDePortee({
    super.key,
    required this.niveau,
    this.size = 46,
  });

  final String niveau;
  final double size;

  int get _level => switch (niveau) {
    'elders' => 1,
    'lineage' => 2,
    'community' => 3,
    'all' => 4,
    _ => 3,
  };

  @override
  Widget build(BuildContext context) {
    return Semantics(
      label: 'Portée ' + _scopeLabel(niveau),
      child: CustomPaint(
        size: Size.square(size),
        painter: _ScopePainter(level: _level),
      ),
    );
  }
}

class _ScopePainter extends CustomPainter {
  const _ScopePainter({required this.level});

  final int level;

  @override
  void paint(Canvas canvas, Size size) {
    final center = size.center(Offset.zero);
    final step = size.shortestSide / 9;
    for (var ring = 1; ring <= 4; ring++) {
      canvas.drawCircle(
        center,
        step * ring,
        Paint()
          ..style = PaintingStyle.stroke
          ..strokeWidth = ring == level ? 2 : 1
          ..color = ring <= level
              ? HanduniaTokens.braise.withValues(
                  alpha: ring == level ? 0.95 : 0.38,
                )
              : HanduniaTokens.bordureForte,
      );
    }
  }

  @override
  bool shouldRepaint(covariant _ScopePainter oldDelegate) =>
      level != oldDelegate.level;
}

class EncartLacune extends StatelessWidget {
  const EncartLacune({
    super.key,
    required this.axes,
    this.onPressed,
    this.actionLabel,
  });

  final List<String> axes;
  final VoidCallback? onPressed;
  final String? actionLabel;

  @override
  Widget build(BuildContext context) {
    final label = axes.isEmpty ? 'Une voix manque ici.' : axes.join(' · ');
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: HanduniaTokens.terre.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: HanduniaTokens.terre.withValues(alpha: 0.62),
        ),
      ),
      child: Row(
        children: [
          const Icon(
            Icons.radio_button_unchecked,
            color: HanduniaTokens.terre,
            size: 22,
          ),
          const SizedBox(width: 11),
          Expanded(
            child: Text(
              label,
              style: _karla(
                weight: FontWeight.w600,
                color: HanduniaTokens.ivoire,
              ),
            ),
          ),
          if (onPressed != null)
            Semantics(
              button: true,
              label: actionLabel ?? 'Aller la chercher',
              child: SizedBox(
                height: 44,
                child: TextButton(
                  onPressed: onPressed,
                  style: TextButton.styleFrom(
                    foregroundColor: HanduniaTokens.terre,
                  ),
                  child: Text(
                    actionLabel ?? 'Aller la chercher',
                    style: _karla(
                      size: 12,
                      weight: FontWeight.w700,
                      color: HanduniaTokens.terre,
                    ),
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class CarteBraise extends StatelessWidget {
  const CarteBraise({
    super.key,
    required this.souvenir,
    this.onOpen,
  });

  final Map<String, dynamic> souvenir;
  final VoidCallback? onOpen;

  @override
  Widget build(BuildContext context) {
    final local = souvenir['local_only'] == true;
    final withdrawn =
        souvenir['item_type'] == 'withdrawn' || souvenir['withdrawn_at'] != null;
    final quote = withdrawn
        ? 'Souvenir retiré par son auteur.'
        : (souvenir['text']?.toString().trim().isNotEmpty == true
              ? souvenir['text'].toString().trim()
              : souvenir['transcript_text']?.toString().trim() ?? '');
    final place = souvenir['lieu_name']?.toString().trim() ?? '';
    final period = souvenir['period_label']?.toString().trim() ?? '';
    final initials =
        souvenir['author_initials']?.toString().trim().isNotEmpty == true
        ? souvenir['author_initials'].toString().trim()
        : handuniaInitials(
            souvenir['display_name']?.toString() ?? 'Handunia Wasa',
          );
    final voices = (souvenir['voice_count'] as num?)?.toInt() ?? 1;
    final scope = souvenir['scope_level']?.toString() ?? 'community';

    final content = Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: local
            ? HanduniaTokens.terre.withValues(alpha: 0.11)
            : HanduniaTokens.nuitPortee,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: local ? HanduniaTokens.terre : HanduniaTokens.bordureForte,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(
                Icons.location_on_outlined,
                color: HanduniaTokens.braise,
                size: 18,
              ),
              const SizedBox(width: 6),
              Expanded(
                child: Text(
                  place.isEmpty ? 'Lieu non renseigné' : place,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: _karla(
                    size: 11.5,
                    weight: FontWeight.w700,
                    color: HanduniaTokens.braise,
                  ),
                ),
              ),
              if (period.isNotEmpty)
                Text(
                  period,
                  style: _karla(
                    size: 11.5,
                    color: HanduniaTokens.cendre,
                  ),
                ),
            ],
          ),
          const SizedBox(height: 14),
          Text(
            quote.isEmpty ? 'Voix sans transcription.' : '“' + quote + '”',
            maxLines: 5,
            overflow: TextOverflow.ellipsis,
            style: _fraunces(size: 17, height: 1.58),
          ),
          const SizedBox(height: 14),
          if (!withdrawn)
            _HanduniaAudioReader(
              id: souvenir['id']?.toString() ?? quote.hashCode.toString(),
              url: souvenir['audio_url']?.toString(),
              cachedPath: souvenir['cached_audio_path']?.toString(),
              durationMs: (souvenir['audio_duration_ms'] as num?)?.toInt(),
            ),
          if (local) ...[
            const SizedBox(height: 11),
            Row(
              children: [
                CercleDePortee(niveau: scope, size: 38),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    _scopeLabel(scope),
                    style: _karla(
                      size: 11.5,
                      weight: FontWeight.w600,
                      color: HanduniaTokens.cendre,
                    ),
                  ),
                ),
                BadgeSceau(
                  hash: souvenir['seal_hash']?.toString(),
                  pending: true,
                ),
              ],
            ),
            const SizedBox(height: 6),
            Text(
              'À envoyer',
              style: _karla(
                size: 11.5,
                weight: FontWeight.w700,
                color: HanduniaTokens.terre,
              ),
            ),
          ],
          const SizedBox(height: 13),
          Row(
            children: [
              Container(
                width: 32,
                height: 32,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  border: Border.all(color: HanduniaTokens.bordureForte),
                ),
                child: Text(
                  initials,
                  style: _fraunces(size: 12, color: HanduniaTokens.ivoire),
                ),
              ),
              const Spacer(),
              Text(
                voices == 1 ? '1 voix' : voices.toString() + ' voix',
                style: _fraunces(size: 15, color: HanduniaTokens.braise),
              ),
            ],
          ),
        ],
      ),
    );

    if (onOpen == null) {
      return content;
    }
    return Semantics(
      button: true,
      label: 'Ouvrir le souvenir',
      child: InkWell(
        borderRadius: BorderRadius.circular(20),
        onTap: onOpen,
        child: content,
      ),
    );
  }
}

class _HanduniaAudioReader extends StatefulWidget {
  const _HanduniaAudioReader({
    required this.id,
    this.url,
    this.cachedPath,
    this.durationMs,
  });

  final String id;
  final String? url;
  final String? cachedPath;
  final int? durationMs;

  @override
  State<_HanduniaAudioReader> createState() => _HanduniaAudioReaderState();
}

class _HanduniaAudioReaderState extends State<_HanduniaAudioReader> {
  late final audio.AudioPlayer _player;
  StreamSubscription<Duration>? _positionSub;
  StreamSubscription<Duration>? _durationSub;
  StreamSubscription<audio.PlayerState>? _stateSub;
  Duration _position = Duration.zero;
  Duration _duration = Duration.zero;
  bool _playing = false;
  bool _prepared = false;

  String get _storageKey => 'handunia_audio_position_' + widget.id;

  @override
  void initState() {
    super.initState();
    _player = audio.AudioPlayer();
    if (widget.durationMs != null) {
      _duration = Duration(milliseconds: widget.durationMs!);
    }
    _positionSub = _player.onPositionChanged.listen((position) {
      if (!mounted) return;
      setState(() => _position = position);
      unawaited(_savePosition(position));
    });
    _durationSub = _player.onDurationChanged.listen((duration) {
      if (!mounted) return;
      setState(() => _duration = duration);
    });
    _stateSub = _player.onPlayerStateChanged.listen((state) {
      if (!mounted) return;
      setState(() => _playing = state == audio.PlayerState.playing);
    });
    _restorePosition();
  }

  Future<void> _restorePosition() async {
    final preferences = await SharedPreferences.getInstance();
    final millis = preferences.getInt(_storageKey) ?? 0;
    if (!mounted) return;
    setState(() => _position = Duration(milliseconds: millis));
  }

  Future<void> _savePosition(Duration position) async {
    final preferences = await SharedPreferences.getInstance();
    await preferences.setInt(_storageKey, position.inMilliseconds);
  }

  audio.Source? _source() {
    final path = widget.cachedPath?.trim() ?? '';
    if (path.isNotEmpty && File(path).existsSync()) {
      return audio.DeviceFileSource(path);
    }
    final url = widget.url?.trim() ?? '';
    if (url.isNotEmpty) {
      return audio.UrlSource(url);
    }
    return null;
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
    if (_position > Duration.zero &&
        (_duration == Duration.zero || _position < _duration)) {
      await _player.seek(_position);
    }
    await _player.resume();
  }

  @override
  void dispose() {
    _positionSub?.cancel();
    _durationSub?.cancel();
    _stateSub?.cancel();
    _player.dispose();
    super.dispose();
  }

  String _clock(Duration duration) {
    final total = duration.inSeconds;
    final minutes = total ~/ 60;
    final seconds = total % 60;
    return minutes.toString() + ':' + seconds.toString().padLeft(2, '0');
  }

  @override
  Widget build(BuildContext context) {
    final available = _source() != null;
    final totalMs = math.max(_duration.inMilliseconds, 1);
    final progress = (_position.inMilliseconds / totalMs).clamp(0.0, 1.0);
    if (!available) {
      return Row(
        children: [
          const Icon(
            Icons.graphic_eq_outlined,
            size: 18,
            color: HanduniaTokens.cendre,
          ),
          const SizedBox(width: 7),
          Text(
            'Voix non jointe',
            style: _karla(size: 11.5, color: HanduniaTokens.cendre),
          ),
        ],
      );
    }

    return Row(
      children: [
        Semantics(
          button: true,
          label: _playing ? 'Mettre la voix en pause' : 'Écouter la voix',
          child: SizedBox(
            width: 44,
            height: 44,
            child: InkWell(
              borderRadius: BorderRadius.circular(999),
              onTap: _toggle,
              onLongPress: _toggle,
              child: Icon(
                _playing
                    ? Icons.pause_circle_outline
                    : Icons.play_circle_outline,
                size: 31,
                color: HanduniaTokens.braise,
              ),
            ),
          ),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: OndeAudio(progression: progress, actif: _playing),
        ),
        const SizedBox(width: 8),
        Text(
          _clock(_position) + '/' + _clock(_duration),
          style: _karla(size: 11.5, color: HanduniaTokens.cendre),
        ),
      ],
    );
  }
}

class HanduniaFilView extends StatelessWidget {
  const HanduniaFilView({
    super.key,
    required this.items,
    required this.loading,
    required this.offline,
    required this.filter,
    required this.pendingCount,
    required this.onBack,
    required this.onRefresh,
    required this.onFilterChanged,
    required this.onOpenMemory,
    required this.onFindMissingVoice,
    this.notice,
  });

  final List<Map<String, dynamic>> items;
  final bool loading;
  final bool offline;
  final String? notice;
  final HanduniaFeedFilter filter;
  final int pendingCount;
  final VoidCallback onBack;
  final Future<void> Function() onRefresh;
  final ValueChanged<HanduniaFeedFilter> onFilterChanged;
  final ValueChanged<Map<String, dynamic>> onOpenMemory;
  final VoidCallback onFindMissingVoice;

  @override
  Widget build(BuildContext context) {
    final pending = items
        .where((item) => item['local_only'] == true)
        .toList(growable: false);
    final remote = items
        .where((item) => item['local_only'] != true)
        .toList(growable: false);
    final ordered = <Map<String, dynamic>>[...pending, ...remote];

    return Scaffold(
      backgroundColor: HanduniaTokens.nuit,
      body: SafeArea(
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(12, 8, 12, 4),
              child: Row(
                children: [
                  Semantics(
                    button: true,
                    label: 'Retour',
                    child: SizedBox(
                      width: 44,
                      height: 44,
                      child: IconButton(
                        onPressed: onBack,
                        icon: const Icon(Icons.arrow_back),
                        color: HanduniaTokens.ivoire,
                      ),
                    ),
                  ),
                  Expanded(
                    child: Text(
                      'Le fil',
                      style: _fraunces(size: 27),
                    ),
                  ),
                  if (pendingCount > 0)
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 10,
                        vertical: 7,
                      ),
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(999),
                        border: Border.all(color: HanduniaTokens.terre),
                      ),
                      child: Text(
                        pendingCount.toString() + ' à envoyer',
                        style: _karla(
                          size: 11.5,
                          weight: FontWeight.w700,
                          color: HanduniaTokens.terre,
                        ),
                      ),
                    ),
                  if (loading) ...[
                    const SizedBox(width: 8),
                    const HaloDensite(
                      valeur: 0.45,
                      size: 38,
                      loading: true,
                    ),
                  ] else
                    Semantics(
                      button: true,
                      label: 'Actualiser le fil',
                      child: SizedBox(
                        width: 44,
                        height: 44,
                        child: IconButton(
                          onPressed: onRefresh,
                          icon: const Icon(Icons.refresh_outlined),
                          color: HanduniaTokens.cendre,
                        ),
                      ),
                    ),
                ],
              ),
            ),
            if (offline || notice != null)
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: Row(
                  children: [
                    Icon(
                      offline ? Icons.cloud_off_outlined : Icons.info_outline,
                      size: 16,
                      color: offline
                          ? HanduniaTokens.terre
                          : HanduniaTokens.cendre,
                    ),
                    const SizedBox(width: 6),
                    Text(
                      notice ?? 'En attente de réseau',
                      style: _karla(
                        size: 11.5,
                        weight: FontWeight.w600,
                        color: offline
                            ? HanduniaTokens.terre
                            : HanduniaTokens.cendre,
                      ),
                    ),
                  ],
                ),
              ),
            const SizedBox(height: 8),
            SizedBox(
              height: 48,
              child: ListView.separated(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                scrollDirection: Axis.horizontal,
                itemCount: HanduniaFeedFilter.values.length,
                separatorBuilder: (_, _) => const SizedBox(width: 8),
                itemBuilder: (context, index) {
                  final value = HanduniaFeedFilter.values[index];
                  final selected = value == filter;
                  return SizedBox(
                    height: 44,
                    child: ChoiceChip(
                      selected: selected,
                      label: Text(value.label),
                      onSelected: (_) => onFilterChanged(value),
                      showCheckmark: false,
                      side: BorderSide(
                        color: selected
                            ? HanduniaTokens.braise
                            : HanduniaTokens.bordureForte,
                      ),
                      backgroundColor: HanduniaTokens.nuit,
                      selectedColor: HanduniaTokens.braise,
                      labelStyle: _karla(
                        size: 11.5,
                        weight: FontWeight.w700,
                        color: selected
                            ? HanduniaTokens.encre
                            : HanduniaTokens.cendre,
                      ),
                    ),
                  );
                },
              ),
            ),
            const SizedBox(height: 6),
            Expanded(
              child: ordered.isEmpty && loading
                  ? const Center(
                      child: Semantics(
                        label: 'Chargement de la mémoire',
                        child: HaloDensite(
                          valeur: 0.5,
                          size: 92,
                          loading: true,
                        ),
                      ),
                    )
                  : ordered.isEmpty
                  ? Padding(
                      padding: const EdgeInsets.all(16),
                      child: Center(
                        child: EncartLacune(
                          axes: const ['Aucune voix ici'],
                          onPressed: onFindMissingVoice,
                          actionLabel: 'Aller la chercher',
                        ),
                      ),
                    )
                  : ListView(
                      padding: const EdgeInsets.fromLTRB(16, 4, 16, 24),
                      children: [
                        for (final item in ordered) ...[
                          if (item['item_type'] == 'divergence')
                            _DivergenceCard(item: item)
                          else
                            CarteBraise(
                              souvenir: item,
                              onOpen: item['local_only'] == true
                                  ? null
                                  : () => onOpenMemory(item),
                            ),
                          const SizedBox(height: 12),
                        ],
                        EncartLacune(
                          axes: const ['Une voix manque ici.'],
                          onPressed: onFindMissingVoice,
                          actionLabel: 'Aller la chercher',
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

class _DivergenceCard extends StatelessWidget {
  const _DivergenceCard({required this.item});

  final Map<String, dynamic> item;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      label: 'Divergence de mémoire',
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: HanduniaTokens.nuitPortee,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: HanduniaTokens.terre),
        ),
        child: Row(
          children: [
            SizedBox(
              width: 54,
              height: 44,
              child: CustomPaint(painter: const _DivergencePainter()),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                'Une mémoire se sépare en deux',
                style: _fraunces(
                  size: 17,
                  color: HanduniaTokens.terre,
                  height: 1.35,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _DivergencePainter extends CustomPainter {
  const _DivergencePainter();

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.6
      ..strokeCap = StrokeCap.round
      ..color = HanduniaTokens.terre;
    final center = Offset(4, size.height / 2);
    final top = Path()
      ..moveTo(center.dx, center.dy)
      ..quadraticBezierTo(
        size.width * 0.48,
        size.height * 0.45,
        size.width - 3,
        6,
      );
    final bottom = Path()
      ..moveTo(center.dx, center.dy)
      ..quadraticBezierTo(
        size.width * 0.48,
        size.height * 0.55,
        size.width - 3,
        size.height - 6,
      );
    canvas.drawPath(top, paint);
    canvas.drawPath(bottom, paint);
    canvas.drawCircle(center, 3.5, Paint()..color = HanduniaTokens.braise);
  }

  @override
  bool shouldRepaint(covariant _DivergencePainter oldDelegate) => false;
}

String _scopeLabel(String scope) {
  return switch (scope) {
    'elders' => 'Anciens',
    'lineage' => 'Lignée',
    'all' => 'Tout le monde',
    _ => 'Communauté',
  };
}
