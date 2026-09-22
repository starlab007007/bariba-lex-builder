import 'dart:async';
import 'dart:io';
import 'dart:math' as math;

import 'package:audioplayers/audioplayers.dart' as audio;
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'handunia_consultation_model.dart';

abstract final class HanduniaTokens {
  // Palette Handunia claire et cohérente avec le design system FITILA.
  // Les noms historiques sont conservés pour éviter de casser les parcours,
  // mais leur rôle est désormais sémantique : fond, surface, bordure, accent,
  // texte principal et texte secondaire.
  static const nuit = Color(0xFFF7F5EC);
  static const nuitPortee = Color(0xFFFFFFFF);
  static const bordure = Color(0xFFE4DFCC);
  static const bordureForte = Color(0xFFD3CCBC);
  static const braise = Color(0xFFC99530);
  static const terre = Color(0xFFB54E33);
  static const ivoire = Color(0xFF241F2E);
  static const cendre = Color(0xFF746D5C);
  static const encre = Color(0xFF241F2E);
  static const orClair = Color(0xFFF3E3B9);
  static const violet = Color(0xFF514578);
}

TextStyle _fraunces({
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

TextStyle _karla({
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
  bool? _lacunaMode;
  Duration? _appliedDuration;

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
    if (_reduceMotion) {
      _controller.stop();
      _controller.value = 0.5;
      return;
    }

    final lacuna = value <= 0 && !widget.loading;
    final duration = lacuna
        ? const Duration(seconds: 14)
        : Duration(milliseconds: (7000 - 2000 * value).round());
    if (_controller.isAnimating &&
        _lacunaMode == lacuna &&
        _appliedDuration == duration) {
      return;
    }

    _lacunaMode = lacuna;
    _appliedDuration = duration;
    _controller
      ..stop()
      ..duration = duration;
    if (lacuna) {
      _controller.repeat();
    } else {
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
      final rotation = math.pi * 2 * pulse;
      for (var i = 0; i < segments; i++) {
        final start = rotation + (math.pi * 2 / segments) * i;
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
    if (live) {
      canvas.drawCircle(
        center,
        4 + 4 * density,
        Paint()..color = HanduniaTokens.braise,
      );
    }
  }

  @override
  bool shouldRepaint(covariant _HaloPainter oldDelegate) {
    return density != oldDelegate.density ||
        pulse != oldDelegate.pulse ||
        loading != oldDelegate.loading;
  }
}

class OndeAudio extends StatelessWidget {
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
  Widget build(BuildContext context) {
    return Semantics(
      label: actif ? 'Lecture audio en cours' : 'Progression audio',
      child: SizedBox(
        height: height,
        width: double.infinity,
        child: RepaintBoundary(
          child: CustomPaint(
            painter: _WavePainter(
              progress: progression.clamp(0.0, 1.0),
              active: actif,
            ),
          ),
        ),
      ),
    );
  }
}

class _WavePainter extends CustomPainter {
  const _WavePainter({
    required this.progress,
    required this.active,
  });

  final double progress;
  final bool active;

  @override
  void paint(Canvas canvas, Size size) {
    const bars = 34;
    const gap = 2.4;
    final width = (size.width - gap * (bars - 1)) / bars;
    for (var i = 0; i < bars; i++) {
      final x = i / (bars - 1);
      final base = 0.24 + 0.62 * (0.5 + 0.5 * math.sin(i * 1.71));
      final h = size.height * base.clamp(0.16, 0.94);
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

    if (active) {
      final x = (size.width * progress)
          .clamp(3.0, math.max(3.0, size.width - 3.0))
          .toDouble();
      canvas.drawCircle(
        Offset(x, size.height / 2),
        3,
        Paint()..color = HanduniaTokens.ivoire,
      );
    }
  }

  @override
  bool shouldRepaint(covariant _WavePainter oldDelegate) {
    return progress != oldDelegate.progress || active != oldDelegate.active;
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
      label: 'Témoin $temoin, $annee',
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 6),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(999),
          border: Border.all(color: HanduniaTokens.bordureForte),
        ),
        child: Text(
          '$temoin · $annee',
          style: _karla(
            size: 12.5,
            weight: FontWeight.w600,
            color: HanduniaTokens.cendre,
          ),
        ),
      ),
    );
  }
}

class HanduniaSourcedAnswer extends StatelessWidget {
  const HanduniaSourcedAnswer({
    super.key,
    required this.answer,
    required this.sources,
  });

  final String answer;
  final List<Map<String, dynamic>> sources;

  @override
  Widget build(BuildContext context) {
    final byIndex = <int, Map<String, dynamic>>{
      for (final source in sources)
        if ((source['index'] as num?)?.toInt() != null)
          (source['index'] as num).toInt(): source,
    };
    final matches = RegExp(r'\[(\d+)\]').allMatches(answer).toList();
    final spans = <InlineSpan>[];
    var cursor = 0;
    var resolvedCitation = false;

    for (final match in matches) {
      if (match.start > cursor) {
        spans.add(TextSpan(text: answer.substring(cursor, match.start)));
      }
      final index = int.tryParse(match.group(1) ?? '');
      final source = index == null ? null : byIndex[index];
      if (source == null) {
        spans.add(
          TextSpan(
            text: match.group(0),
            style: _karla(size: 12.5, color: HanduniaTokens.cendre),
          ),
        );
      } else {
        resolvedCitation = true;
        spans.add(
          WidgetSpan(
            alignment: PlaceholderAlignment.middle,
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 3, vertical: 2),
              child: PastilleSource(
                temoin: source['witness']?.toString() ?? 'TV',
                annee: source['year']?.toString() ?? '',
              ),
            ),
          ),
        );
      }
      cursor = match.end;
    }

    if (cursor < answer.length) {
      spans.add(TextSpan(text: answer.substring(cursor)));
    }
    if (spans.isEmpty) {
      spans.add(TextSpan(text: answer));
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text.rich(
          TextSpan(children: spans),
          style: _fraunces(size: 17, height: 1.55),
        ),
        if (!resolvedCitation && sources.isNotEmpty) ...[
          const SizedBox(height: 10),
          Wrap(
            spacing: 7,
            runSpacing: 7,
            children: [
              for (final source in sources)
                PastilleSource(
                  temoin: source['witness']?.toString() ?? 'TV',
                  annee: source['year']?.toString() ?? '',
                ),
            ],
          ),
        ],
      ],
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
            Icons.verified_user_outlined,
            size: 15,
            color: sealed ? HanduniaTokens.braise : HanduniaTokens.cendre,
          ),
          const SizedBox(width: 5),
          Text(
            label,
            style: _karla(
              size: 12.5,
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
      label: 'Portée ${_scopeLabel(niveau)}',
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
                    size: 12.5,
                    weight: FontWeight.w700,
                    color: HanduniaTokens.braise,
                  ),
                ),
              ),
              if (period.isNotEmpty)
                Text(
                  period,
                  style: _karla(
                    size: 12.5,
                    color: HanduniaTokens.cendre,
                  ),
                ),
            ],
          ),
          const SizedBox(height: 14),
          Text(
            quote.isEmpty ? 'Voix sans transcription.' : '“$quote”',
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
                      size: 12.5,
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
                size: 12.5,
                weight: FontWeight.w700,
                color: HanduniaTokens.terre,
              ),
            ),
          ],
          const SizedBox(height: 13),
          if (withdrawn)
            Text(
              'Retiré par son auteur',
              style: _karla(
                size: 12.5,
                weight: FontWeight.w600,
                color: HanduniaTokens.cendre,
              ),
            )
          else
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
                  voices == 1 ? '1 voix' : '$voices voix',
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

  String get _storageKey => 'handunia_audio_position_${widget.id}';

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
    return '$minutes:${seconds.toString().padLeft(2, '0')}';
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
            style: _karla(size: 12.5, color: HanduniaTokens.cendre),
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
          '${_clock(_position)}/${_clock(_duration)}',
          style: _karla(size: 12.5, color: HanduniaTokens.cendre),
        ),
      ],
    );
  }
}

class HanduniaFilView extends StatefulWidget {
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
    this.onPublish,
    this.onLikeChanged,
    this.onAiSummary,
    this.onTranslate,
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
  final VoidCallback? onPublish;
  final Future<void> Function(String fragmentId, bool like)? onLikeChanged;
  final Future<String?> Function(Map<String, dynamic> item)? onAiSummary;
  final Future<String?> Function(Map<String, dynamic> item)? onTranslate;

  @override
  State<HanduniaFilView> createState() => _HanduniaFilViewState();
}

class _HanduniaFilViewState extends State<HanduniaFilView> {
  static const _savedKey = 'handunia_immersive_saved_ids_v1';
  late final PageController _pageController;
  final Map<String, bool> _liked = <String, bool>{};
  final Map<String, int> _likeCounts = <String, int>{};
  final Set<String> _saved = <String>{};
  String? _pulseLikeId;
  String? _busyInsightId;

  @override
  void initState() {
    super.initState();
    _pageController = PageController(initialPage: 0);
    _syncSocialState();
    unawaited(_restoreSaved());
  }

  @override
  void didUpdateWidget(covariant HanduniaFilView oldWidget) {
    super.didUpdateWidget(oldWidget);
    _syncSocialState();
    if (oldWidget.filter != widget.filter ||
        oldWidget.items.length != widget.items.length) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted && _pageController.hasClients) {
          _pageController.jumpToPage(0);
        }
      });
    }
  }

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  void _syncSocialState() {
    for (final item in widget.items) {
      final id = item['id']?.toString() ?? '';
      if (id.isEmpty) continue;
      _liked.putIfAbsent(id, () => item['liked_by_me'] == true);
      _likeCounts.putIfAbsent(
        id,
        () => (item['like_count'] as num?)?.toInt() ?? 0,
      );
    }
  }

  Future<void> _restoreSaved() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final ids = prefs.getStringList(_savedKey) ?? const <String>[];
      if (!mounted) return;
      setState(() => _saved.addAll(ids));
    } catch (_) {
      // La sauvegarde locale enrichit le fil mais ne doit jamais empêcher
      // son rendu (notamment sur un appareil fraîchement installé).
    }
  }

  Future<void> _persistSaved() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setStringList(_savedKey, _saved.toList(growable: false));
    } catch (_) {
      // Le geste reste instantané même si le stockage local est indisponible.
    }
  }

  List<Map<String, dynamic>> get _smartItems {
    final deduped = <String, Map<String, dynamic>>{};
    for (final item in widget.items) {
      final id = item['id']?.toString().trim();
      final key = id?.isNotEmpty == true
          ? id!
          : '${item['lieu_id'] ?? ''}|${item['created_at'] ?? ''}|${item['text'] ?? ''}';
      deduped.putIfAbsent(key, () => item);
    }

    final pending = deduped.values
        .where((item) => item['local_only'] == true)
        .toList(growable: false);
    final remote = deduped.values
        .where((item) => item['local_only'] != true)
        .toList();

    final originalRank = <String, int>{};
    for (var i = 0; i < remote.length; i++) {
      originalRank[remote[i]['id']?.toString() ?? 'row-$i'] = i;
    }

    double score(Map<String, dynamic> item) {
      final id = item['id']?.toString() ?? '';
      final baseRank = originalRank[id] ?? remote.length;
      var value = math.max(0, remote.length - baseRank) * 5.0;

      final created = DateTime.tryParse(item['created_at']?.toString() ?? '');
      if (created != null) {
        final hours = DateTime.now().difference(created).inHours.clamp(0, 720);
        value += math.max(0, 120 - hours) * 0.7;
      }

      final voices = (item['voice_count'] as num?)?.toInt() ?? 1;
      value += math.log(math.max(1, voices) + 1) * 12;

      final likes = (item['like_count'] as num?)?.toInt() ?? 0;
      value += math.log(likes + 1) * 3;

      final distance = (item['distance_m'] as num?)?.toDouble();
      if (widget.filter == HanduniaFeedFilter.around && distance != null) {
        value += math.max(0, 80 - distance / 2000);
      }

      if (item['lacuna_filled'] == true) value += 8;
      if ((item['audio_url']?.toString().trim().isNotEmpty ?? false)) {
        value += 14;
      }
      if (_backdropUrl(item) != null) value += 10;
      return value;
    }

    remote.sort((a, b) => score(b).compareTo(score(a)));

    // Diversification : évite plusieurs souvenirs successifs du même auteur
    // ou du même lieu, tout en conservant les meilleurs candidats en tête.
    final diversified = <Map<String, dynamic>>[];
    final pool = List<Map<String, dynamic>>.from(remote);
    while (pool.isNotEmpty) {
      var pick = 0;
      if (diversified.isNotEmpty) {
        final last = diversified.last;
        final lastUser = last['user_id']?.toString();
        final lastLieu = last['lieu_id']?.toString();
        final searchUntil = math.min(6, pool.length);
        for (var i = 0; i < searchUntil; i++) {
          final candidate = pool[i];
          if (candidate['user_id']?.toString() != lastUser &&
              candidate['lieu_id']?.toString() != lastLieu) {
            pick = i;
            break;
          }
        }
      }
      diversified.add(pool.removeAt(pick));
    }
    return <Map<String, dynamic>>[...pending, ...diversified];
  }

  String? _backdropUrl(Map<String, dynamic> item) {
    for (final key in const <String>[
      'lieu_cover_url',
      'image_url',
      'photo_url',
      'thumbnail_url',
      'media_url',
    ]) {
      final value = item[key]?.toString().trim() ?? '';
      if (value.startsWith('https://') || value.startsWith('http://')) {
        return value;
      }
    }
    return null;
  }

  String _memoryText(Map<String, dynamic> item) {
    for (final key in const <String>['transcript_text', 'text']) {
      final value = item[key]?.toString().trim() ?? '';
      if (value.isNotEmpty) return value;
    }
    return 'Voix non transcrite.';
  }

  String _relativeTime(Map<String, dynamic> item) {
    final date = DateTime.tryParse(item['created_at']?.toString() ?? '');
    if (date == null) return '';
    final diff = DateTime.now().difference(date);
    if (diff.inMinutes < 1) return 'À l’instant';
    if (diff.inHours < 1) return 'Il y a ${diff.inMinutes} min';
    if (diff.inDays < 1) return 'Il y a ${diff.inHours} h';
    if (diff.inDays < 7) return 'Il y a ${diff.inDays} j';
    return '${date.day.toString().padLeft(2, '0')}/${date.month.toString().padLeft(2, '0')}';
  }

  String _compactCount(int value) {
    if (value < 1000) return '$value';
    if (value < 1000000) {
      final k = value / 1000;
      return '${k.toStringAsFixed(k < 10 ? 1 : 0)}K';
    }
    final m = value / 1000000;
    return '${m.toStringAsFixed(m < 10 ? 1 : 0)}M';
  }

  Future<void> _toggleLike(Map<String, dynamic> item) async {
    final id = item['id']?.toString() ?? '';
    if (id.isEmpty || item['local_only'] == true) return;
    final before = _liked[id] ?? item['liked_by_me'] == true;
    final beforeCount =
        _likeCounts[id] ?? (item['like_count'] as num?)?.toInt() ?? 0;
    final next = !before;

    HapticFeedback.lightImpact();
    setState(() {
      _liked[id] = next;
      _likeCounts[id] = math.max(0, beforeCount + (next ? 1 : -1));
      _pulseLikeId = next ? id : null;
    });

    if (next) {
      Future<void>.delayed(const Duration(milliseconds: 360), () {
        if (mounted && _pulseLikeId == id) {
          setState(() => _pulseLikeId = null);
        }
      });
    }

    final callback = widget.onLikeChanged;
    if (callback == null) return;
    try {
      await callback(id, next);
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _liked[id] = before;
        _likeCounts[id] = beforeCount;
        _pulseLikeId = null;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Réaction non synchronisée. Réessayez.')),
      );
    }
  }

  Future<void> _toggleSaved(Map<String, dynamic> item) async {
    final id = item['id']?.toString() ?? '';
    if (id.isEmpty) return;
    HapticFeedback.selectionClick();
    setState(() {
      if (!_saved.add(id)) _saved.remove(id);
    });
    await _persistSaved();
  }

  Future<void> _shareMemory(Map<String, dynamic> item) async {
    final place = item['lieu_name']?.toString().trim() ?? '';
    final text = _memoryText(item);
    final payload = place.isEmpty
        ? 'Handunia Wasa — $text'
        : 'Handunia Wasa · $place\n$text';
    await Clipboard.setData(ClipboardData(text: payload));
    if (!mounted) return;
    HapticFeedback.selectionClick();
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Souvenir copié, prêt à être partagé.')),
    );
  }

  Future<void> _runInsight(
    Map<String, dynamic> item, {
    required bool translate,
  }) async {
    final callback = translate ? widget.onTranslate : widget.onAiSummary;
    if (callback == null) {
      widget.onOpenMemory(item);
      return;
    }
    final id = item['id']?.toString() ?? '';
    setState(() => _busyInsightId = '${translate ? 'translate' : 'summary'}:$id');
    try {
      final result = await callback(item);
      if (!mounted || result == null || result.trim().isEmpty) return;
      await showModalBottomSheet<void>(
        context: context,
        showDragHandle: true,
        backgroundColor: const Color(0xFF17130F),
        builder: (context) => SafeArea(
          top: false,
          child: Padding(
            padding: const EdgeInsets.fromLTRB(22, 4, 22, 28),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Icon(
                      translate
                          ? Icons.translate_rounded
                          : Icons.auto_awesome_rounded,
                      color: const Color(0xFFF0B640),
                    ),
                    const SizedBox(width: 9),
                    Text(
                      translate ? 'Traduction' : 'Lumière IA',
                      style: _fraunces(size: 21, color: Colors.white),
                    ),
                  ],
                ),
                const SizedBox(height: 14),
                Text(
                  result.trim(),
                  style: _karla(size: 16, color: Colors.white, height: 1.55),
                ),
              ],
            ),
          ),
        ),
      );
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            translate
                ? 'Traduction momentanément indisponible.'
                : 'Lumière IA momentanément indisponible.',
          ),
        ),
      );
    } finally {
      if (mounted) setState(() => _busyInsightId = null);
    }
  }

  void _showMore(Map<String, dynamic> item) {
    showModalBottomSheet<void>(
      context: context,
      showDragHandle: true,
      backgroundColor: const Color(0xFF17130F),
      builder: (context) => SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(12, 0, 12, 14),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              ListTile(
                leading: const Icon(Icons.visibility_outlined, color: Colors.white),
                title: const Text(
                  'Voir le souvenir',
                  style: TextStyle(color: Colors.white),
                ),
                onTap: () {
                  Navigator.pop(context);
                  widget.onOpenMemory(item);
                },
              ),
              ListTile(
                leading: const Icon(Icons.travel_explore_rounded, color: Colors.white),
                title: const Text(
                  'Trouver une voix sur la carte',
                  style: TextStyle(color: Colors.white),
                ),
                onTap: () {
                  Navigator.pop(context);
                  widget.onFindMissingVoice();
                },
              ),
              ListTile(
                leading: const Icon(Icons.refresh_rounded, color: Colors.white),
                title: const Text(
                  'Actualiser le fil',
                  style: TextStyle(color: Colors.white),
                ),
                onTap: () {
                  Navigator.pop(context);
                  unawaited(widget.onRefresh());
                },
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _filterChip(HanduniaFeedFilter value, IconData icon) {
    final selected = widget.filter == value;
    return Expanded(
      child: Semantics(
        button: true,
        selected: selected,
        label: value.label,
        child: InkWell(
          borderRadius: BorderRadius.circular(999),
          onTap: () {
            HapticFeedback.selectionClick();
            widget.onFilterChanged(value);
          },
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 220),
            curve: Curves.easeOutCubic,
            height: 44,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(999),
              gradient: selected
                  ? const LinearGradient(
                      colors: [Color(0xFFF5BF4C), Color(0xFFB77717)],
                    )
                  : null,
              color: selected ? null : Colors.black.withValues(alpha: .26),
              border: Border.all(
                color: selected
                    ? const Color(0xFFFFD878)
                    : Colors.white.withValues(alpha: .35),
              ),
              boxShadow: selected
                  ? const [
                      BoxShadow(
                        color: Color(0x55D99B25),
                        blurRadius: 20,
                        spreadRadius: -6,
                      ),
                    ]
                  : null,
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(icon, size: 18, color: Colors.white),
                const SizedBox(width: 6),
                Flexible(
                  child: Text(
                    value.label,
                    maxLines: 1,
                    overflow: TextOverflow.fade,
                    style: _karla(
                      size: 13,
                      color: Colors.white,
                      weight: FontWeight.w800,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _actionButton({
    required IconData icon,
    required String label,
    required VoidCallback onTap,
    Color color = Colors.white,
    bool filled = false,
    bool pulse = false,
  }) {
    return Semantics(
      button: true,
      label: label,
      child: InkWell(
        customBorder: const CircleBorder(),
        onTap: onTap,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            AnimatedScale(
              scale: pulse ? 1.28 : 1,
              duration: const Duration(milliseconds: 180),
              curve: Curves.easeOutBack,
              child: Container(
                width: 52,
                height: 52,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: filled
                      ? color.withValues(alpha: .20)
                      : Colors.black.withValues(alpha: .30),
                  border: Border.all(
                    color: filled
                        ? color.withValues(alpha: .78)
                        : Colors.white.withValues(alpha: .30),
                  ),
                  boxShadow: filled
                      ? [
                          BoxShadow(
                            color: color.withValues(alpha: .35),
                            blurRadius: 22,
                            spreadRadius: -5,
                          ),
                        ]
                      : null,
                ),
                child: Icon(icon, color: color, size: 29),
              ),
            ),
            if (label.isNotEmpty) ...[
              const SizedBox(height: 4),
              Text(
                label,
                maxLines: 1,
                style: _karla(
                  size: 11.5,
                  color: Colors.white,
                  weight: FontWeight.w800,
                  height: 1,
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _storyPage(Map<String, dynamic> item) {
    if (item['item_type'] == 'divergence') {
      return Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [Color(0xFF17130F), Color(0xFF382713), Color(0xFF111820)],
          ),
        ),
        padding: const EdgeInsets.fromLTRB(22, 220, 22, 130),
        child: Center(child: _DivergenceCard(item: item)),
      );
    }

    final id = item['id']?.toString() ?? '';
    final backdrop = _backdropUrl(item);
    final liked = _liked[id] ?? item['liked_by_me'] == true;
    final likes = _likeCounts[id] ?? (item['like_count'] as num?)?.toInt() ?? 0;
    final voices = (item['voice_count'] as num?)?.toInt() ?? 1;
    final saved = _saved.contains(id);
    final initials = item['author_initials']?.toString().trim().isNotEmpty == true
        ? item['author_initials'].toString()
        : 'HW';
    final displayName = item['display_name']?.toString().trim().isNotEmpty == true
        ? item['display_name'].toString()
        : 'Voix Handunia';
    final lieu = item['lieu_name']?.toString().trim().isNotEmpty == true
        ? item['lieu_name'].toString()
        : 'Handunia Wasa';
    final icon = item['lieu_icon']?.toString().trim().isNotEmpty == true
        ? item['lieu_icon'].toString()
        : '📍';
    final text = _memoryText(item);
    final summaryBusy = _busyInsightId == 'summary:$id';
    final translateBusy = _busyInsightId == 'translate:$id';

    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onDoubleTap: () => _toggleLike(item),
      child: Stack(
        fit: StackFit.expand,
        children: [
          if (backdrop != null)
            Image.network(
              backdrop,
              fit: BoxFit.cover,
              errorBuilder: (_, _, _) => _fallbackBackdrop(icon, lieu),
            )
          else
            _fallbackBackdrop(icon, lieu),
          const DecoratedBox(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                stops: [0, .28, .58, 1],
                colors: [
                  Color(0x7A000000),
                  Color(0x10000000),
                  Color(0x50000000),
                  Color(0xE6000000),
                ],
              ),
            ),
          ),
          Positioned(
            right: 14,
            bottom: 126,
            child: Column(
              children: [
                Container(
                  width: 52,
                  height: 52,
                  alignment: Alignment.center,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: Colors.black.withValues(alpha: .34),
                    border: Border.all(color: const Color(0xFFFFC95D), width: 2),
                  ),
                  child: Text(
                    initials,
                    style: _fraunces(size: 14, color: Colors.white),
                  ),
                ),
                const SizedBox(height: 16),
                _actionButton(
                  icon: liked ? Icons.favorite_rounded : Icons.favorite_border_rounded,
                  label: _compactCount(likes),
                  color: liked ? const Color(0xFFFF5864) : Colors.white,
                  filled: liked,
                  pulse: _pulseLikeId == id,
                  onTap: () => _toggleLike(item),
                ),
                const SizedBox(height: 14),
                _actionButton(
                  icon: Icons.chat_bubble_rounded,
                  label: _compactCount(voices),
                  onTap: () => widget.onOpenMemory(item),
                ),
                const SizedBox(height: 14),
                _actionButton(
                  icon: Icons.share_rounded,
                  label: 'Partager',
                  onTap: () => _shareMemory(item),
                ),
                const SizedBox(height: 14),
                _actionButton(
                  icon: saved ? Icons.bookmark_rounded : Icons.bookmark_border_rounded,
                  label: saved ? 'Sauvé' : 'Garder',
                  color: saved ? const Color(0xFFFFC95D) : Colors.white,
                  filled: saved,
                  onTap: () => _toggleSaved(item),
                ),
                const SizedBox(height: 12),
                _actionButton(
                  icon: Icons.more_horiz_rounded,
                  label: '',
                  onTap: () => _showMore(item),
                ),
              ],
            ),
          ),
          Positioned(
            left: 18,
            right: 82,
            bottom: 104,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  constraints: const BoxConstraints(maxWidth: 250),
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  decoration: BoxDecoration(
                    color: Colors.black.withValues(alpha: .34),
                    borderRadius: BorderRadius.circular(999),
                    border: Border.all(color: Colors.white.withValues(alpha: .30)),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(
                        Icons.location_on_rounded,
                        size: 19,
                        color: Color(0xFFFFCB62),
                      ),
                      const SizedBox(width: 6),
                      Flexible(
                        child: Text(
                          lieu,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: _karla(
                            size: 14.5,
                            color: Colors.white,
                            weight: FontWeight.w800,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 11),
                Text(
                  text,
                  maxLines: 4,
                  overflow: TextOverflow.ellipsis,
                  style: _fraunces(
                    size: 27,
                    color: Colors.white,
                    height: 1.12,
                  ),
                ),
                const SizedBox(height: 13),
                Container(
                  padding: const EdgeInsets.fromLTRB(12, 7, 12, 7),
                  decoration: BoxDecoration(
                    color: Colors.black.withValues(alpha: .38),
                    borderRadius: BorderRadius.circular(22),
                    border: Border.all(color: Colors.white.withValues(alpha: .20)),
                  ),
                  child: _HanduniaAudioReader(
                    id: id,
                    url: item['audio_url']?.toString(),
                    cachedPath: item['cached_audio_path']?.toString(),
                    durationMs: (item['audio_duration_ms'] as num?)?.toInt(),
                  ),
                ),
                const SizedBox(height: 11),
                Row(
                  children: [
                    Container(
                      width: 38,
                      height: 38,
                      alignment: Alignment.center,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: Colors.white.withValues(alpha: .95),
                      ),
                      child: Text(
                        initials,
                        style: _fraunces(size: 12, color: const Color(0xFF2A2116)),
                      ),
                    ),
                    const SizedBox(width: 9),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            displayName,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: _karla(
                              size: 14,
                              color: Colors.white,
                              weight: FontWeight.w900,
                              height: 1.1,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            '${voices == 1 ? '1 voix' : '$voices voix'} · ${_relativeTime(item)}',
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: _karla(
                              size: 11.5,
                              color: Colors.white.withValues(alpha: .78),
                              weight: FontWeight.w600,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 11),
                Row(
                  children: [
                    Expanded(
                      child: _glassAction(
                        icon: Icons.auto_awesome_rounded,
                        label: summaryBusy ? '...' : 'IA résume',
                        onTap: summaryBusy
                            ? null
                            : () => _runInsight(item, translate: false),
                      ),
                    ),
                    const SizedBox(width: 7),
                    Expanded(
                      child: _glassAction(
                        icon: Icons.translate_rounded,
                        label: translateBusy ? '...' : 'Traduire',
                        onTap: translateBusy
                            ? null
                            : () => _runInsight(item, translate: true),
                      ),
                    ),
                    const SizedBox(width: 7),
                    Expanded(
                      child: _glassAction(
                        icon: Icons.visibility_outlined,
                        label: 'Détails',
                        onTap: () => widget.onOpenMemory(item),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _glassAction({
    required IconData icon,
    required String label,
    required VoidCallback? onTap,
  }) {
    return SizedBox(
      height: 42,
      child: OutlinedButton.icon(
        onPressed: onTap,
        style: OutlinedButton.styleFrom(
          foregroundColor: Colors.white,
          backgroundColor: Colors.black.withValues(alpha: .28),
          side: BorderSide(color: Colors.white.withValues(alpha: .28)),
          padding: const EdgeInsets.symmetric(horizontal: 7),
          shape: const StadiumBorder(),
        ),
        icon: Icon(icon, size: 17),
        label: Text(
          label,
          maxLines: 1,
          overflow: TextOverflow.fade,
          style: _karla(
            size: 11.2,
            color: Colors.white,
            weight: FontWeight.w800,
          ),
        ),
      ),
    );
  }

  Widget _fallbackBackdrop(String icon, String lieu) {
    final palette = <List<Color>>[
      const [Color(0xFF80511B), Color(0xFF2D1B0E), Color(0xFF101820)],
      const [Color(0xFF4D5C38), Color(0xFF25301E), Color(0xFF101820)],
      const [Color(0xFF624238), Color(0xFF2D201A), Color(0xFF101820)],
      const [Color(0xFF4A4267), Color(0xFF241E38), Color(0xFF101820)],
    ];
    final colors = palette[lieu.hashCode.abs() % palette.length];
    return Container(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: colors,
        ),
      ),
      child: Center(
        child: Transform.translate(
          offset: const Offset(0, -60),
          child: Text(
            icon,
            style: TextStyle(
              fontSize: 126,
              color: Colors.white.withValues(alpha: .16),
              shadows: const [
                Shadow(color: Colors.black38, blurRadius: 30),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _emptyState() {
    return Container(
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [Color(0xFF241A10), Color(0xFF111820)],
        ),
      ),
      child: Center(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(28, 170, 28, 100),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              if (widget.loading)
                const CircularProgressIndicator(color: Color(0xFFF0B640))
              else ...[
                const Icon(
                  Icons.graphic_eq_rounded,
                  size: 58,
                  color: Color(0xFFF0B640),
                ),
                const SizedBox(height: 14),
                Text(
                  widget.notice == 'Accès réservé'
                      ? 'Accès réservé'
                      : 'Une voix manque ici.',
                  textAlign: TextAlign.center,
                  style: _fraunces(size: 24, color: Colors.white),
                ),
                const SizedBox(height: 8),
                Text(
                  widget.notice ??
                      'Explorez la carte ou revenez bientôt : Handunia se construit avec les voix de la communauté.',
                  textAlign: TextAlign.center,
                  style: _karla(
                    size: 14,
                    color: Colors.white.withValues(alpha: .72),
                  ),
                ),
                const SizedBox(height: 18),
                FilledButton.icon(
                  onPressed: widget.onFindMissingVoice,
                  style: FilledButton.styleFrom(
                    backgroundColor: const Color(0xFFF0B640),
                    foregroundColor: const Color(0xFF251A0A),
                  ),
                  icon: const Icon(Icons.travel_explore_rounded),
                  label: const Text('Explorer la carte'),
                ),
                if (widget.onPublish != null) ...[
                  const SizedBox(height: 10),
                  OutlinedButton.icon(
                    onPressed: widget.onPublish,
                    style: OutlinedButton.styleFrom(
                      foregroundColor: Colors.white,
                      side: BorderSide(
                        color: Colors.white.withValues(alpha: .42),
                      ),
                    ),
                    icon: const Icon(Icons.add_rounded),
                    label: const Text('PUBLIER UN SOUVENIR'),
                  ),
                ],
              ],
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final items = _smartItems;
    final canLoop = items.length > 1;

    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: SystemUiOverlayStyle.light.copyWith(
        statusBarColor: Colors.transparent,
        systemNavigationBarColor: const Color(0xFF0C0A08),
      ),
      child: Scaffold(
        backgroundColor: const Color(0xFF0C0A08),
        body: Stack(
          fit: StackFit.expand,
          children: [
            if (items.isEmpty)
              _emptyState()
            else
              RefreshIndicator(
                color: const Color(0xFFF0B640),
                onRefresh: widget.onRefresh,
                child: PageView.builder(
                  controller: _pageController,
                  scrollDirection: Axis.vertical,
                  physics: const BouncingScrollPhysics(
                    parent: AlwaysScrollableScrollPhysics(),
                  ),
                  allowImplicitScrolling: true,
                  itemCount: canLoop ? null : items.length,
                  onPageChanged: (_) => HapticFeedback.selectionClick(),
                  itemBuilder: (context, index) {
                    final item = items[index % items.length];
                    return _storyPage(item);
                  },
                ),
              ),
            SafeArea(
              bottom: false,
              child: Padding(
                padding: const EdgeInsets.fromLTRB(14, 8, 14, 0),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Row(
                      children: [
                        _roundHeaderButton(
                          icon: Icons.arrow_back_rounded,
                          label: 'Retour',
                          onTap: widget.onBack,
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Text(
                            'Fil Handunia Wasa',
                            textAlign: TextAlign.center,
                            maxLines: 1,
                            overflow: TextOverflow.fade,
                            style: _fraunces(size: 25, color: Colors.white),
                          ),
                        ),
                        const SizedBox(width: 10),
                        _roundHeaderButton(
                          icon: widget.loading
                              ? Icons.hourglass_top_rounded
                              : Icons.refresh_rounded,
                          label: 'Actualiser',
                          onTap: widget.loading
                              ? null
                              : () => unawaited(widget.onRefresh()),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        _filterChip(
                          HanduniaFeedFilter.around,
                          Icons.location_on_rounded,
                        ),
                        const SizedBox(width: 7),
                        _filterChip(
                          HanduniaFeedFilter.lineage,
                          Icons.groups_rounded,
                        ),
                        const SizedBox(width: 7),
                        _filterChip(
                          HanduniaFeedFilter.all,
                          Icons.public_rounded,
                        ),
                      ],
                    ),
                    if (widget.offline || widget.notice != null) ...[
                      const SizedBox(height: 8),
                      Align(
                        alignment: Alignment.center,
                        child: Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 10,
                            vertical: 5,
                          ),
                          decoration: BoxDecoration(
                            color: Colors.black.withValues(alpha: .38),
                            borderRadius: BorderRadius.circular(999),
                            border: Border.all(
                              color: Colors.white.withValues(alpha: .18),
                            ),
                          ),
                          child: Text(
                            widget.notice ??
                                (widget.offline
                                    ? 'Mode hors ligne'
                                    : ''),
                            style: _karla(
                              size: 10.5,
                              color: Colors.white.withValues(alpha: .78),
                              weight: FontWeight.w700,
                            ),
                          ),
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ),
            if (items.isNotEmpty)
              Positioned(
                left: 0,
                right: 0,
                bottom: 74,
                child: IgnorePointer(
                  child: Column(
                    children: [
                      const Icon(
                        Icons.keyboard_arrow_up_rounded,
                        color: Colors.white,
                        size: 28,
                      ),
                      Text(
                        'Balayez pour la prochaine histoire',
                        style: _karla(
                          size: 11,
                          color: Colors.white.withValues(alpha: .76),
                          weight: FontWeight.w700,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _roundHeaderButton({
    required IconData icon,
    required String label,
    required VoidCallback? onTap,
  }) {
    return Semantics(
      button: true,
      label: label,
      child: SizedBox(
        width: 46,
        height: 46,
        child: IconButton(
          onPressed: onTap,
          icon: Icon(icon, color: Colors.white),
          style: IconButton.styleFrom(
            backgroundColor: Colors.black.withValues(alpha: .30),
            side: BorderSide(color: Colors.white.withValues(alpha: .30)),
          ),
        ),
      ),
    );
  }
}

class _DivergenceCard extends StatefulWidget {
  const _DivergenceCard({required this.item});

  final Map<String, dynamic> item;

  @override
  State<_DivergenceCard> createState() => _DivergenceCardState();
}

class _DivergenceCardState extends State<_DivergenceCard>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;
  bool _reduceMotion = false;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 4500),
    );
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _reduceMotion = MediaQuery.maybeOf(context)?.disableAnimations ?? false;
    if (_reduceMotion) {
      _controller
        ..stop()
        ..value = .38;
    } else if (!_controller.isAnimating) {
      _controller.repeat();
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final subject = widget.item['subject']?.toString().trim() ?? '';
    return Semantics(
      label: subject.isEmpty
          ? 'Divergence de mémoire'
          : 'Divergence de mémoire : $subject',
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
              width: 58,
              height: 48,
              child: RepaintBoundary(
                child: AnimatedBuilder(
                  animation: _controller,
                  builder: (context, _) => CustomPaint(
                    painter: _DivergencePainter(
                      phase: _reduceMotion ? .38 : _controller.value,
                    ),
                  ),
                ),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Une mémoire se sépare en deux',
                    style: _fraunces(
                      size: 17,
                      color: HanduniaTokens.terre,
                      height: 1.35,
                    ),
                  ),
                  if (subject.isNotEmpty) ...[
                    const SizedBox(height: 4),
                    Text(
                      subject,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: _karla(
                        size: 12.5,
                        color: HanduniaTokens.cendre,
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

class _DivergencePainter extends CustomPainter {
  const _DivergencePainter({required this.phase});

  final double phase;

  Path _top(Size size) => Path()
    ..moveTo(4, size.height / 2)
    ..quadraticBezierTo(
      size.width * .46,
      size.height * .43,
      size.width - 4,
      6,
    );

  Path _bottom(Size size) => Path()
    ..moveTo(4, size.height / 2)
    ..quadraticBezierTo(
      size.width * .46,
      size.height * .57,
      size.width - 4,
      size.height - 6,
    );

  Offset _pointOn(Path path, double t) {
    final metrics = path.computeMetrics().toList(growable: false);
    if (metrics.isEmpty) {
      return Offset.zero;
    }
    final metric = metrics.first;
    final tangent = metric.getTangentForOffset(
      metric.length * t.clamp(0.0, 1.0),
    );
    return tangent?.position ?? Offset.zero;
  }

  @override
  void paint(Canvas canvas, Size size) {
    final line = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.6
      ..strokeCap = StrokeCap.round
      ..color = HanduniaTokens.terre;
    final top = _top(size);
    final bottom = _bottom(size);
    canvas.drawPath(top, line);
    canvas.drawPath(bottom, line);

    final origin = Offset(4, size.height / 2);
    canvas.drawCircle(origin, 3.3, Paint()..color = HanduniaTokens.braise);

    final spark = Paint()..color = HanduniaTokens.braise;
    final topPoint = _pointOn(top, phase);
    final bottomPoint = _pointOn(bottom, (phase + .5) % 1);
    canvas.drawCircle(topPoint, 2.6, spark);
    canvas.drawCircle(bottomPoint, 2.6, spark);
  }

  @override
  bool shouldRepaint(covariant _DivergencePainter oldDelegate) =>
      oldDelegate.phase != phase;
}

String _scopeLabel(String scope) {
  return switch (scope) {
    'elders' => 'Anciens',
    'lineage' => 'Lignée',
    'all' => 'Tout le monde',
    _ => 'Communauté',
  };
}
