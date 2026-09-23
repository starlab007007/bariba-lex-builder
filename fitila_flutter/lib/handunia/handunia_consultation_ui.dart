import 'dart:async';
import 'dart:io';
import 'dart:math' as math;

import 'package:audioplayers/audioplayers.dart' as audio;
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'handunia_consultation_model.dart';
import 'handunia_heritage_feed.dart';

abstract final class HanduniaTokens {
  // Palette Handunia claire et cohérente avec le design system FITILA.
  // Les noms historiques sont conservés pour éviter de casser les parcours,
  // mais leur rôle est désormais sémantique : fond, surface, bordure, accent,
  // texte principal et texte secondaire.
  static const nuit = Color(0xFFFFF8EA);
  static const nuitPortee = Color(0xFFFFFCF5);
  static const bordure = Color(0xFFF1DFC0);
  static const bordureForte = Color(0xFFE7C995);
  static const braise = Color(0xFFD89A20);
  static const terre = Color(0xFFB45B3C);
  static const ivoire = Color(0xFF3B1E0E);
  static const cendre = Color(0xFF8A7661);
  static const encre = Color(0xFF3B1E0E);
  static const orClair = Color(0xFFF8EFD9);
  static const violet = Color(0xFF6A557D);
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


enum HanduniaArchitectureLayer { collection, memory, discovery }

class HanduniaArchitectureMap extends StatelessWidget {
  const HanduniaArchitectureMap({
    super.key,
    this.active,
    this.dark = false,
    this.compact = false,
    this.showIa = true,
  });

  final HanduniaArchitectureLayer? active;
  final bool dark;
  final bool compact;
  final bool showIa;

  @override
  Widget build(BuildContext context) {
    final foreground = dark ? Colors.white : HanduniaTokens.ivoire;
    final muted = dark
        ? Colors.white.withValues(alpha: .56)
        : HanduniaTokens.cendre;

    return Semantics(
      container: true,
      label:
          'Handunia Wasa. Étape 1 : parler ou écrire. Étape 2 : relier à la mémoire. '
          'Étape 3 : explorer. Lumière IA aide sans inventer.',
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            children: [
              _visualStep(
                layer: HanduniaArchitectureLayer.collection,
                icon: Icons.mic_rounded,
                label: 'Voix',
                foreground: foreground,
                muted: muted,
              ),
              _connector(muted),
              _visualStep(
                layer: HanduniaArchitectureLayer.memory,
                icon: Icons.account_tree_rounded,
                label: 'Mémoire',
                foreground: foreground,
                muted: muted,
              ),
              _connector(muted),
              _visualStep(
                layer: HanduniaArchitectureLayer.discovery,
                icon: Icons.explore_rounded,
                label: 'Explorer',
                foreground: foreground,
                muted: muted,
              ),
            ],
          ),
          if (showIa) ...[
            SizedBox(height: compact ? 3 : 5),
            Semantics(
              label: 'Lumière IA relie et éclaire sans inventer',
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(
                    Icons.light_mode_rounded,
                    size: 13,
                    color: HanduniaTokens.braise,
                  ),
                  const SizedBox(width: 4),
                  Text(
                    'IA',
                    style: _karla(
                      size: compact ? 9 : 10,
                      color: muted,
                      weight: FontWeight.w900,
                      height: 1,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _connector(Color color) => Expanded(
        child: Container(
          height: 1,
          margin: const EdgeInsets.symmetric(horizontal: 4),
          color: color.withValues(alpha: .30),
        ),
      );

  Widget _visualStep({
    required HanduniaArchitectureLayer layer,
    required IconData icon,
    required String label,
    required Color foreground,
    required Color muted,
  }) {
    final selected = active == null || active == layer;
    final size = compact ? 38.0 : 44.0;
    return Semantics(
      selected: active == layer,
      label: label,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          AnimatedContainer(
            duration: const Duration(milliseconds: 180),
            width: size,
            height: size,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: active == layer
                  ? HanduniaTokens.braise
                  : (dark
                      ? Colors.white.withValues(alpha: .08)
                      : HanduniaTokens.nuitPortee),
              border: Border.all(
                color: active == layer
                    ? HanduniaTokens.braise
                    : (dark
                        ? Colors.white.withValues(alpha: .14)
                        : HanduniaTokens.bordureForte),
              ),
            ),
            child: Icon(
              icon,
              size: compact ? 20 : 23,
              color: active == layer
                  ? Colors.white
                  : (selected ? foreground : muted),
            ),
          ),
          SizedBox(height: compact ? 3 : 4),
          Text(
            label,
            maxLines: 1,
            style: _karla(
              size: compact ? 9.5 : 10.5,
              color: selected ? foreground : muted,
              weight: active == layer ? FontWeight.w900 : FontWeight.w700,
              height: 1,
            ),
          ),
        ],
      ),
    );
  }
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
      child: Icon(
        sealed ? Icons.verified_rounded : Icons.verified_user_outlined,
        size: 20,
        color: sealed ? HanduniaTokens.braise : HanduniaTokens.cendre,
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
            'Voix',
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
  late final PageController _pageController;
  String? _busyInsightId;

  static const _feedCream = Color(0xFFFFF8EA);
  static const _feedPaper = Color(0xFFFFFCF5);
  static const _feedPaperSoft = Color(0xFFF8EFD9);
  static const _feedInk = Color(0xFF3B1E0E);
  static const _feedMuted = Color(0xFF8A7661);
  static const _feedGold = Color(0xFFD89A20);
  static const _feedGoldDeep = Color(0xFFB87516);
  static const _feedHairline = Color(0xFFE7C995);

  @override
  void initState() {
    super.initState();
    _pageController = PageController(initialPage: 0);
  }

  @override
  void didUpdateWidget(covariant HanduniaFilView oldWidget) {
    super.didUpdateWidget(oldWidget);
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

  List<Map<String, dynamic>> get _smartItems {
    final deduped = <String, Map<String, dynamic>>{};
    for (final item in widget.items) {
      final id = item['id']?.toString().trim();
      final key = id?.isNotEmpty == true
          ? id!
          : '${item['item_type'] ?? ''}|${item['lieu_id'] ?? ''}|${item['created_at'] ?? ''}|${item['text'] ?? item['subject'] ?? item['gap_value'] ?? ''}';
      deduped.putIfAbsent(key, () => item);
    }

    final pending = deduped.values
        .where((item) => item['local_only'] == true)
        .toList(growable: false);
    final contextCards = deduped.values
        .where(
          (item) =>
              item['local_only'] != true &&
              (item['item_type'] == 'divergence' ||
                  item['item_type'] == 'memory_gap'),
        )
        .map(Map<String, dynamic>.from)
        .toList(growable: false);
    final memories = deduped.values
        .where(
          (item) =>
              item['local_only'] != true &&
              item['item_type'] != 'divergence' &&
              item['item_type'] != 'memory_gap',
        )
        .map(Map<String, dynamic>.from)
        .toList(growable: false);

    final journey = List<Map<String, dynamic>>.from(
      HanduniaHeritageFeed.buildJourney(
        memories,
        filter: widget.filter,
      ),
    );

    var insertion = math.min(2, journey.length);
    for (final card in contextCards) {
      journey.insert(insertion, card);
      insertion = math.min(insertion + 3, journey.length);
    }

    return <Map<String, dynamic>>[...pending, ...journey];
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
    final id = item['id']?.toString() ?? '';
    final summaryBusy = _busyInsightId == 'summary:$id';
    final translateBusy = _busyInsightId == 'translate:$id';
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
                enabled: !summaryBusy,
                leading: const Icon(
                  Icons.auto_awesome_rounded,
                  color: Colors.white,
                ),
                title: Text(
                  summaryBusy ? 'Lumière IA…' : 'Lumière IA',
                  style: const TextStyle(color: Colors.white),
                ),
                onTap: summaryBusy
                    ? null
                    : () {
                        Navigator.pop(context);
                        unawaited(_runInsight(item, translate: false));
                      },
              ),
              ListTile(
                enabled: !translateBusy,
                leading: const Icon(
                  Icons.translate_rounded,
                  color: Colors.white,
                ),
                title: Text(
                  translateBusy ? 'Traduction…' : 'Traduire',
                  style: const TextStyle(color: Colors.white),
                ),
                onTap: translateBusy
                    ? null
                    : () {
                        Navigator.pop(context);
                        unawaited(_runInsight(item, translate: true));
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
            duration: const Duration(milliseconds: 180),
            height: 42,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              gradient: selected
                  ? const LinearGradient(
                      colors: [Color(0xFFF4C458), _feedGoldDeep],
                    )
                  : null,
              color: selected ? null : _feedPaper.withValues(alpha: .94),
              border: Border.all(
                color: selected ? const Color(0xFFF4CB72) : _feedHairline,
              ),
            ),
            alignment: Alignment.center,
            child: Icon(
              icon,
              size: 20,
              color: selected ? Colors.white : _feedInk,
            ),
          ),
        ),
      ),
    );
  }

  Widget _memoryGapPage(Map<String, dynamic> item) {
    final lieu = item['lieu_name']?.toString().trim();
    final gap = item['gap_value']?.toString().trim();

    return ColoredBox(
      color: _feedCream,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(26, 170, 26, 110),
        child: Center(
          child: Container(
            width: double.infinity,
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: _feedPaper,
              borderRadius: BorderRadius.circular(28),
              border: Border.all(color: _feedHairline),
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 74,
                  height: 74,
                  decoration: const BoxDecoration(
                    shape: BoxShape.circle,
                    color: _feedPaperSoft,
                  ),
                  child: const Icon(
                    Icons.mic_none_rounded,
                    color: _feedGoldDeep,
                    size: 38,
                  ),
                ),
                const SizedBox(height: 12),
                Text(
                  gap?.isNotEmpty == true ? gap! : 'Une voix manque',
                  maxLines: 2,
                  textAlign: TextAlign.center,
                  overflow: TextOverflow.ellipsis,
                  style: _fraunces(size: 22, color: _feedInk),
                ),
                if (lieu?.isNotEmpty == true) ...[
                  const SizedBox(height: 5),
                  Text(
                    lieu!,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: _karla(
                      size: 11.5,
                      color: _feedMuted,
                      weight: FontWeight.w800,
                    ),
                  ),
                ],
                const SizedBox(height: 16),
                Semantics(
                  container: true,
                  button: true,
                  label: 'Aider à compléter cette mémoire par la voix',
                  child: ExcludeSemantics(
                    child: SizedBox(
                      width: 58,
                      height: 58,
                      child: FilledButton(
                        onPressed: widget.onFindMissingVoice,
                        style: FilledButton.styleFrom(
                          padding: EdgeInsets.zero,
                          shape: const CircleBorder(),
                          backgroundColor: _feedGold,
                          foregroundColor: _feedInk,
                        ),
                        child: const Icon(Icons.mic_rounded, size: 27),
                      ),
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

  Future<void> _showMemoryContext(Map<String, dynamic> item) async {
    final voices = (item['voice_count'] as num?)?.toInt() ?? 1;
    final lieu = item['lieu_name']?.toString().trim() ?? 'Handunia Wasa';
    final period =
        item['period_label']?.toString().trim().isNotEmpty == true
        ? item['period_label'].toString()
        : (item['period_year']?.toString() ?? 'Période non précisée');
    final reason =
        item['_handunia_transition_label']?.toString().trim().isNotEmpty == true
        ? item['_handunia_transition_label'].toString()
        : 'Mémoire du territoire';

    await showModalBottomSheet<void>(
      context: context,
      showDragHandle: true,
      backgroundColor: _feedPaper,
      builder: (sheetContext) => SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 4, 20, 24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Mémoire',
                style: _fraunces(size: 22, color: _feedInk),
              ),
              const SizedBox(height: 7),
              Text(
                reason,
                style: _karla(
                  size: 13,
                  color: _feedGoldDeep,
                  weight: FontWeight.w800,
                ),
              ),
              const SizedBox(height: 16),
              _memoryContextLine(Icons.location_on_rounded, lieu),
              _memoryContextLine(Icons.schedule_rounded, period),
              _memoryContextLine(
                Icons.groups_2_outlined,
                '$voices voix humaine${voices > 1 ? 's' : ''}',
              ),
              if (item['lacuna_filled'] == true)
                _memoryContextLine(
                  Icons.auto_awesome_rounded,
                  'Lacune comblée',
                ),
              const SizedBox(height: 10),
              SizedBox(
                width: double.infinity,
                height: 48,
                child: FilledButton.icon(
                  onPressed: () {
                    Navigator.of(sheetContext).pop();
                    widget.onOpenMemory(item);
                  },
                  style: FilledButton.styleFrom(
                    backgroundColor: _feedGold,
                    foregroundColor: _feedInk,
                    elevation: 0,
                    shape: const StadiumBorder(),
                  ),
                  icon: const Icon(Icons.account_tree_outlined, size: 19),
                  label: const Text('Ouvrir'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _memoryContextLine(IconData icon, String text) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 9),
      child: Row(
        children: [
          Icon(icon, size: 18, color: _feedGoldDeep),
          const SizedBox(width: 9),
          Expanded(
            child: Text(
              text,
              style: _karla(
                size: 13.2,
                color: _feedInk,
                weight: FontWeight.w700,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _storyPage(Map<String, dynamic> item) {
    if (item['item_type'] == 'memory_gap') {
      return _memoryGapPage(item);
    }
    if (item['item_type'] == 'divergence') {
      return ColoredBox(
        color: _feedCream,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 200, 20, 120),
          child: Center(child: _DivergenceCard(item: item)),
        ),
      );
    }

    final id = item['id']?.toString() ?? '';
    final backdrop = _backdropUrl(item);
    final voices = (item['voice_count'] as num?)?.toInt() ?? 1;
    final initials = item['author_initials']?.toString().trim().isNotEmpty == true
        ? item['author_initials'].toString()
        : 'HW';
    final displayName =
        item['display_name']?.toString().trim().isNotEmpty == true
        ? item['display_name'].toString()
        : 'Voix Handunia';
    final lieu = item['lieu_name']?.toString().trim().isNotEmpty == true
        ? item['lieu_name'].toString()
        : 'Handunia Wasa';
    final icon = item['lieu_icon']?.toString().trim().isNotEmpty == true
        ? item['lieu_icon'].toString()
        : '📍';
    final text = _memoryText(item);
    final hasAudio =
        (item['audio_url']?.toString().trim().isNotEmpty ?? false) ||
        (item['cached_audio_path']?.toString().trim().isNotEmpty ?? false);
    final voiceLabel = voices == 1 ? '1 voix' : '$voices voix';
    return ColoredBox(
      color: _feedCream,
      child: LayoutBuilder(
        builder: (context, constraints) {
            final compact = constraints.maxHeight < 730;
            final topInset = compact ? 158.0 : 190.0;
            final bottomInset = compact ? 78.0 : 102.0;
            const cardRight = 14.0;

            return Stack(
              fit: StackFit.expand,
              children: [
                Positioned(
                  left: 14,
                  right: cardRight,
                  top: topInset,
                  bottom: bottomInset,
                  child: Container(
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(compact ? 24 : 30),
                      boxShadow: const [
                        BoxShadow(
                          color: Color(0x226B4A22),
                          blurRadius: 26,
                          offset: Offset(0, 10),
                        ),
                      ],
                    ),
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(compact ? 24 : 30),
                      child: Stack(
                        fit: StackFit.expand,
                        children: [
                          if (backdrop != null)
                            Image.network(
                              backdrop,
                              fit: BoxFit.cover,
                              errorBuilder: (_, _, _) =>
                                  _fallbackBackdrop(icon, lieu),
                            )
                          else
                            _fallbackBackdrop(icon, lieu),
                          const DecoratedBox(
                            decoration: BoxDecoration(
                              gradient: LinearGradient(
                                begin: Alignment.topCenter,
                                end: Alignment.bottomCenter,
                                stops: [0, .44, .72, 1],
                                colors: [
                                  Color(0x12FFF7E8),
                                  Color(0x00FFF7E8),
                                  Color(0x22FFF7E8),
                                  Color(0x66F8E4BE),
                                ],
                              ),
                            ),
                          ),
                          Positioned(
                            left: 0,
                            right: 0,
                            bottom: 0,
                            child: Container(
                              padding: EdgeInsets.fromLTRB(
                                compact ? 14 : 18,
                                compact ? 12 : 16,
                                compact ? 14 : 18,
                                compact ? 12 : 16,
                              ),
                              decoration: BoxDecoration(
                                gradient: LinearGradient(
                                  begin: Alignment.topCenter,
                                  end: Alignment.bottomCenter,
                                  colors: [
                                    _feedPaper.withValues(alpha: .84),
                                    _feedPaper.withValues(alpha: .98),
                                  ],
                                ),
                                border: Border(
                                  top: BorderSide(
                                    color: Colors.white.withValues(alpha: .76),
                                  ),
                                ),
                              ),
                              child: Column(
                                mainAxisSize: MainAxisSize.min,
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Container(
                                    constraints: const BoxConstraints(
                                      maxWidth: 240,
                                    ),
                                    padding: const EdgeInsets.symmetric(
                                      horizontal: 10,
                                      vertical: 6,
                                    ),
                                    decoration: BoxDecoration(
                                      color: _feedPaperSoft.withValues(
                                        alpha: .94,
                                      ),
                                      borderRadius: BorderRadius.circular(999),
                                      border: Border.all(
                                        color: _feedHairline,
                                      ),
                                    ),
                                    child: Row(
                                      mainAxisSize: MainAxisSize.min,
                                      children: [
                                        const Icon(
                                          Icons.location_on_rounded,
                                          size: 17,
                                          color: _feedGoldDeep,
                                        ),
                                        const SizedBox(width: 5),
                                        Flexible(
                                          child: Text(
                                            lieu,
                                            maxLines: 1,
                                            overflow: TextOverflow.ellipsis,
                                            style: _karla(
                                              size: 12.8,
                                              color: _feedInk,
                                              weight: FontWeight.w800,
                                              height: 1,
                                            ),
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                  SizedBox(height: compact ? 7 : 10),
                                  Text(
                                    text,
                                    maxLines: hasAudio ? 1 : 2,
                                    overflow: TextOverflow.ellipsis,
                                    style: _fraunces(
                                      size: compact ? 23 : 27,
                                      color: _feedInk,
                                      height: 1.10,
                                    ),
                                  ),
                                  SizedBox(height: compact ? 8 : 12),
                                  Container(
                                    padding: const EdgeInsets.symmetric(
                                      horizontal: 10,
                                      vertical: 5,
                                    ),
                                    decoration: BoxDecoration(
                                      color: _feedPaperSoft.withValues(
                                        alpha: .72,
                                      ),
                                      borderRadius: BorderRadius.circular(18),
                                    ),
                                    child: _HanduniaAudioReader(
                                      id: id,
                                      url: item['audio_url']?.toString(),
                                      cachedPath:
                                          item['cached_audio_path']?.toString(),
                                      durationMs:
                                          (item['audio_duration_ms'] as num?)
                                              ?.toInt(),
                                    ),
                                  ),
                                  SizedBox(height: compact ? 7 : 10),
                                  Row(
                                    children: [
                                      Container(
                                        width: 34,
                                        height: 34,
                                        alignment: Alignment.center,
                                        decoration: BoxDecoration(
                                          shape: BoxShape.circle,
                                          color: _feedPaperSoft,
                                          border: Border.all(
                                            color: _feedHairline,
                                          ),
                                        ),
                                        child: Text(
                                          initials,
                                          style: _fraunces(
                                            size: 11,
                                            color: _feedInk,
                                          ),
                                        ),
                                      ),
                                      const SizedBox(width: 8),
                                      Expanded(
                                        child: Semantics(
                                          label:
                                              '$displayName · $voiceLabel · ${_relativeTime(item)}',
                                          child: Row(
                                            children: [
                                              const Icon(
                                                Icons.graphic_eq_rounded,
                                                size: 15,
                                                color: _feedGoldDeep,
                                              ),
                                              const SizedBox(width: 4),
                                              Text(
                                                voiceLabel,
                                                maxLines: 1,
                                                style: _karla(
                                                  size: 11,
                                                  color: _feedMuted,
                                                  weight: FontWeight.w800,
                                                  height: 1,
                                                ),
                                              ),
                                            ],
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                  SizedBox(height: compact ? 7 : 10),
                                  Row(
                                    children: [
                                      Expanded(
                                        child: _glassAction(
                                          icon: Icons.account_tree_outlined,
                                          label: 'Mémoire',
                                          semanticLabel: 'Mémoire',
                                          onTap: () => _showMemoryContext(item),
                                        ),
                                      ),
                                      const SizedBox(width: 6),
                                      Expanded(
                                        child: _glassAction(
                                          icon: Icons.visibility_outlined,
                                          label: 'Souvenir',
                                          semanticLabel: 'Voir le souvenir',
                                          onTap: () => widget.onOpenMemory(item),
                                        ),
                                      ),
                                      const SizedBox(width: 6),
                                      Expanded(
                                        child: _glassAction(
                                          icon: Icons.travel_explore_rounded,
                                          label: 'Carte',
                                          semanticLabel:
                                              'Trouver une voix sur la carte',
                                          onTap: widget.onFindMissingVoice,
                                        ),
                                      ),
                                    ],
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
                Positioned(
                  right: cardRight + 9,
                  top: topInset + 10,
                  child: Semantics(
                    button: true,
                    label: 'Plus d’options',
                    child: InkWell(
                      borderRadius: BorderRadius.circular(999),
                      onTap: () => _showMore(item),
                      child: Container(
                        width: 34,
                        height: 34,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: _feedPaper.withValues(alpha: .90),
                          border: Border.all(
                            color: _feedHairline.withValues(alpha: .9),
                          ),
                        ),
                        child: const Icon(
                          Icons.more_horiz_rounded,
                          size: 19,
                          color: _feedInk,
                        ),
                      ),
                    ),
                  ),
                ),
              ],
            );
          },
        ),
    );
  }

  Widget _glassAction({
    required IconData icon,
    required String label,
    required VoidCallback? onTap,
    String? semanticLabel,
  }) {
    return Semantics(
      button: true,
      label: semanticLabel ?? label,
      child: SizedBox(
        height: 34,
        child: OutlinedButton(
          onPressed: onTap,
          style: OutlinedButton.styleFrom(
            foregroundColor: _feedGoldDeep,
            backgroundColor: _feedPaper.withValues(alpha: .28),
            side: BorderSide(
              color: _feedGoldDeep.withValues(alpha: .34),
              width: .9,
            ),
            padding: const EdgeInsets.symmetric(horizontal: 5),
            shape: const StadiumBorder(),
            elevation: 0,
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(icon, size: 15, color: _feedGoldDeep),
              const SizedBox(width: 4),
              Flexible(
                child: Text(
                  label,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: _karla(
                    size: 9.5,
                    color: _feedGoldDeep,
                    weight: FontWeight.w800,
                    height: 1,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _fallbackBackdrop(String icon, String lieu) {
    final palette = <List<Color>>[
      const [Color(0xFFFFE7AF), Color(0xFFF4C96F), Color(0xFFB97621)],
      const [Color(0xFFFFEBC9), Color(0xFFDDBD76), Color(0xFF9F7A45)],
      const [Color(0xFFFCE1C4), Color(0xFFDCA473), Color(0xFF8A5B36)],
      const [Color(0xFFF4E4D1), Color(0xFFCCB18C), Color(0xFF7E694F)],
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
      child: Stack(
        fit: StackFit.expand,
        children: [
          Align(
            alignment: const Alignment(0, -.35),
            child: Text(
              icon,
              style: TextStyle(
                fontSize: 116,
                color: _feedPaper.withValues(alpha: .34),
                shadows: const [
                  Shadow(
                    color: Color(0x336B4A22),
                    blurRadius: 22,
                  ),
                ],
              ),
            ),
          ),
          const DecoratedBox(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [
                  Color(0x12FFFFFF),
                  Color(0x00FFFFFF),
                  Color(0x33FFF7E8),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _emptyState() {
    final restricted = widget.notice == 'Accès réservé';
    return Container(
      color: _feedCream,
      child: Center(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(28, 150, 28, 100),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              if (widget.loading)
                const CircularProgressIndicator(color: _feedGoldDeep)
              else ...[
                Container(
                  width: 76,
                  height: 76,
                  decoration: const BoxDecoration(
                    shape: BoxShape.circle,
                    color: _feedPaperSoft,
                  ),
                  child: Icon(
                    restricted
                        ? Icons.lock_outline_rounded
                        : Icons.mic_none_rounded,
                    size: 38,
                    color: _feedGoldDeep,
                  ),
                ),
                const SizedBox(height: 12),
                Text(
                  restricted ? 'Accès réservé' : 'Une voix manque',
                  style: _fraunces(size: 23, color: _feedInk),
                ),
                const SizedBox(height: 18),
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Semantics(
                      button: true,
                      label: 'Explorer la carte',
                      child: IconButton.filled(
                        onPressed: widget.onFindMissingVoice,
                        style: IconButton.styleFrom(
                          minimumSize: const Size(58, 58),
                          backgroundColor: _feedGold,
                          foregroundColor: _feedInk,
                        ),
                        icon: const Icon(Icons.map_rounded, size: 26),
                      ),
                    ),
                    if (!restricted && widget.onPublish != null) ...[
                      const SizedBox(width: 14),
                      Semantics(
                        button: true,
                        label: 'Tisser un souvenir',
                        child: IconButton.outlined(
                          onPressed: widget.onPublish,
                          style: IconButton.styleFrom(
                            minimumSize: const Size(58, 58),
                            foregroundColor: _feedGoldDeep,
                            side: const BorderSide(color: _feedHairline),
                          ),
                          icon: const Icon(Icons.mic_none_rounded, size: 26),
                        ),
                      ),
                    ],
                  ],
                ),
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
      value: SystemUiOverlayStyle.dark.copyWith(
        statusBarColor: Colors.transparent,
        systemNavigationBarColor: _feedCream,
        systemNavigationBarIconBrightness: Brightness.dark,
      ),
      child: Scaffold(
        backgroundColor: _feedCream,
        body: Stack(
          fit: StackFit.expand,
          children: [
            if (items.isEmpty)
              _emptyState()
            else
              RefreshIndicator(
                color: _feedGoldDeep,
                backgroundColor: _feedPaper,
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
                      crossAxisAlignment: CrossAxisAlignment.center,
                      children: [
                        _roundHeaderButton(
                          icon: Icons.arrow_back_rounded,
                          label: 'Retour',
                          onTap: widget.onBack,
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Semantics(
                            header: true,
                            label: 'Fil Handunia Wasa',
                            child: Text(
                              'Handunia',
                              textAlign: TextAlign.center,
                              maxLines: 1,
                              style: _fraunces(
                                size: 25,
                                color: _feedInk,
                                height: 1,
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
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
                    const SizedBox(height: 13),
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
                      const SizedBox(height: 6),
                      Align(
                        alignment: Alignment.center,
                        child: Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 9,
                            vertical: 4,
                          ),
                          decoration: BoxDecoration(
                            color: _feedPaperSoft.withValues(alpha: .90),
                            borderRadius: BorderRadius.circular(999),
                            border: Border.all(color: _feedHairline),
                          ),
                          child: Text(
                            widget.notice ??
                                (widget.offline ? 'Mode hors ligne' : ''),
                            style: _karla(
                              size: 9.5,
                              color: _feedMuted,
                              weight: FontWeight.w700,
                              height: 1,
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
                bottom: 69,
                child: IgnorePointer(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Semantics(
                        label: 'Balayez vers le haut pour continuer',
                        child: Icon(
                          Icons.keyboard_arrow_down_rounded,
                          color: _feedGoldDeep,
                          size: 24,
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
          icon: Icon(icon, color: _feedInk, size: 24),
          style: IconButton.styleFrom(
            backgroundColor: _feedPaper.withValues(alpha: .96),
            foregroundColor: _feedInk,
            side: const BorderSide(color: _feedHairline),
            shadowColor: const Color(0x226B4A22),
            elevation: 2,
          ),
          padding: EdgeInsets.zero,
          constraints: const BoxConstraints.tightFor(width: 46, height: 46),
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
