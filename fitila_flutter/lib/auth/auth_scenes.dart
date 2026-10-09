import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../core/signature_theme.dart';

/// Scènes animées « dessin animé » de la page d'accueil (dessinées en code, sans image).
/// `t` boucle de 0 à 1.

const _skin1 = Color(0xFF8A5A3C);
const _skin2 = Color(0xFF6B4230);
const _boubou1 = Color(0xFFC99530);
const _boubou2 = Color(0xFFB54E33);
const _sage = Color(0xFF3F6E52);
const _ink = Color(0xFF241F2E);

double _wave(double t, {double phase = 0, double cycles = 1}) => math.sin((t * cycles + phase) * math.pi * 2);
double _pop(double t, double start, double end) {
  if (t < start || t > end) return 0;
  final u = (t - start) / (end - start);
  final grow = (u / .18).clamp(0.0, 1.0);
  final fade = ((1 - u) / .15).clamp(0.0, 1.0);
  final over = 1 + .12 * math.sin(grow * math.pi);
  return Curves.easeOutBack.transform(grow) * fade * over;
}

void _text(Canvas c, String s, Offset center, double size, Color color, {FontWeight weight = FontWeight.w800, double maxWidth = 200}) {
  final tp = TextPainter(
    text: TextSpan(text: s, style: TextStyle(fontSize: size, color: color, fontWeight: weight, fontFamily: 'Inter')),
    textDirection: TextDirection.ltr,
    maxLines: 2,
    textAlign: TextAlign.center,
  )..layout(maxWidth: maxWidth);
  tp.paint(c, center - Offset(tp.width / 2, tp.height / 2));
}

void _bubble(Canvas c, Offset center, Size size, String text, Color bg, Color fg, double scale, {required bool tailLeft}) {
  if (scale <= 0.01) return;
  c.save();
  c.translate(center.dx, center.dy);
  c.scale(scale);
  final r = RRect.fromRectAndRadius(Rect.fromCenter(center: Offset.zero, width: size.width, height: size.height), Radius.circular(size.height / 2.2));
  final tail = Path()
    ..moveTo(tailLeft ? -size.width * .28 : size.width * .28, size.height / 2 - 2)
    ..lineTo(tailLeft ? -size.width * .36 : size.width * .36, size.height / 2 + 14)
    ..lineTo(tailLeft ? -size.width * .14 : size.width * .14, size.height / 2 - 2)
    ..close();
  c.drawShadow(Path()..addRRect(r), Colors.black, 6, false);
  c.drawRRect(r, Paint()..color = bg);
  c.drawPath(tail, Paint()..color = bg);
  _text(c, text, Offset.zero, 15, fg, maxWidth: size.width - 16);
  c.restore();
}

void _face(Canvas c, Offset o, double r, Color skin, double t, {double look = 0, bool talk = false, double phase = 0}) {
  c.drawCircle(o, r, Paint()..color = skin);
  c.drawCircle(o + Offset(-r * .55, r * .2), r * .18, Paint()..color = Colors.white.withValues(alpha: .10));
  final blink = ((t * 3 + phase) % 1) > .93;
  final eyeY = o.dy - r * .12;
  for (final dx in [-r * .36, r * .36]) {
    final e = Offset(o.dx + dx, eyeY);
    if (blink) {
      c.drawLine(e + Offset(-r * .13, 0), e + Offset(r * .13, 0), Paint()..color = _ink..strokeWidth = 2.4..strokeCap = StrokeCap.round);
    } else {
      c.drawOval(Rect.fromCenter(center: e, width: r * .30, height: r * .34), Paint()..color = Colors.white);
      c.drawCircle(e + Offset(look * r * .05, 0), r * .085, Paint()..color = _ink);
    }
  }
  // Sourire (s'ouvre quand le personnage parle).
  final open = talk ? (.5 + .5 * _wave(t, cycles: 6, phase: phase)) : 0.0;
  final mouth = Path()
    ..moveTo(o.dx - r * .30, o.dy + r * .34)
    ..quadraticBezierTo(o.dx, o.dy + r * (.62 + .22 * open), o.dx + r * .30, o.dy + r * .34);
  if (talk && open > .35) {
    c.drawPath(mouth..close(), Paint()..color = const Color(0xFF4A1E16));
  } else {
    c.drawPath(mouth, Paint()..color = _ink..style = PaintingStyle.stroke..strokeWidth = 2.6..strokeCap = StrokeCap.round);
  }
  c.drawCircle(o + Offset(-r * .62, r * .30), r * .11, Paint()..color = const Color(0x33FF7A5C));
  c.drawCircle(o + Offset(r * .62, r * .30), r * .11, Paint()..color = const Color(0x33FF7A5C));
}

void _character(Canvas c, Offset base, double s, Color skin, Color robe, double t, {bool talk = false, double phase = 0, double lookDir = 1, bool cap = false, double wave = 0}) {
  final bob = _wave(t, cycles: 2, phase: phase) * 3 * s;
  final o = base + Offset(0, bob);
  // Corps (boubou)
  final body = Path()
    ..moveTo(o.dx - 34 * s, o.dy)
    ..quadraticBezierTo(o.dx - 44 * s, o.dy - 58 * s, o.dx, o.dy - 66 * s)
    ..quadraticBezierTo(o.dx + 44 * s, o.dy - 58 * s, o.dx + 34 * s, o.dy)
    ..close();
  c.drawPath(body, Paint()..color = robe);
  c.drawPath(
    Path()
      ..moveTo(o.dx - 12 * s, o.dy - 64 * s)
      ..lineTo(o.dx, o.dy - 40 * s)
      ..lineTo(o.dx + 12 * s, o.dy - 64 * s),
    Paint()..color = Colors.white.withValues(alpha: .35)..style = PaintingStyle.stroke..strokeWidth = 3 * s..strokeCap = StrokeCap.round,
  );
  // Bras qui salue
  if (wave != 0) {
    final a = -1.1 + .5 * _wave(t, cycles: 3, phase: phase);
    final shoulder = o + Offset(lookDir * 30 * s, -46 * s);
    final hand = shoulder + Offset(math.cos(a) * 30 * s * lookDir, math.sin(a) * 30 * s);
    c.drawLine(shoulder, hand, Paint()..color = robe..strokeWidth = 12 * s..strokeCap = StrokeCap.round);
    c.drawCircle(hand, 7 * s, Paint()..color = skin);
  }
  _face(c, o + Offset(0, -86 * s), 26 * s, skin, t, look: lookDir, talk: talk, phase: phase);
  if (cap) {
    final hat = Path()
      ..moveTo(o.dx - 26 * s, o.dy - 98 * s)
      ..quadraticBezierTo(o.dx, o.dy - 132 * s, o.dx + 26 * s, o.dy - 98 * s)
      ..close();
    c.drawPath(hat, Paint()..color = _ink);
    c.drawRect(Rect.fromLTWH(o.dx - 27 * s, o.dy - 101 * s, 54 * s, 6 * s), Paint()..color = _boubou1);
  }
}

/// Scène 1 : deux amis échangent, les bulles alternent Français ↔ Bàátɔ̀nú.
class TranslateScenePainter extends CustomPainter {
  TranslateScenePainter(this.t);
  final double t;

  @override
  void paint(Canvas canvas, Size size) {
    final w = size.width;
    final h = size.height;
    canvas.drawRect(Offset.zero & size, Paint()..shader = const LinearGradient(begin: Alignment.topCenter, end: Alignment.bottomCenter, colors: [Color(0xFFFFE9B8), Color(0xFFFFF6E6)]).createShader(Offset.zero & size));

    // Soleil et rayons
    final sun = Offset(w * .78, h * .2);
    canvas.save();
    canvas.translate(sun.dx, sun.dy);
    canvas.rotate(t * math.pi * 2 * .25);
    for (var i = 0; i < 12; i++) {
      canvas.rotate(math.pi / 6);
      canvas.drawRRect(RRect.fromRectAndRadius(Rect.fromLTWH(-3, -h * .17, 6, h * .07), const Radius.circular(3)), Paint()..color = _boubou1.withValues(alpha: .35));
    }
    canvas.restore();
    canvas.drawCircle(sun, h * .095, Paint()..color = const Color(0xFFF2B640));
    _face(canvas, sun, h * .075, const Color(0xFFF7C860), t, talk: false, phase: .3);

    // Nuages
    for (var i = 0; i < 2; i++) {
      final x = ((t * (i + 1) * .15 + i * .5) % 1.2 - .1) * w;
      final y = h * (.13 + i * .12);
      final p = Paint()..color = Colors.white.withValues(alpha: .85);
      canvas.drawOval(Rect.fromCenter(center: Offset(x, y), width: 70, height: 22), p);
      canvas.drawOval(Rect.fromCenter(center: Offset(x + 18, y - 9), width: 40, height: 24), p);
    }

    // Collines
    canvas.drawPath(
      Path()
        ..moveTo(0, h * .78)
        ..quadraticBezierTo(w * .25, h * .6, w * .55, h * .76)
        ..quadraticBezierTo(w * .8, h * .88, w, h * .7)
        ..lineTo(w, h)
        ..lineTo(0, h)
        ..close(),
      Paint()..color = const Color(0xFFB9D3BF),
    );
    canvas.drawPath(
      Path()
        ..moveTo(0, h * .88)
        ..quadraticBezierTo(w * .4, h * .74, w, h * .9)
        ..lineTo(w, h)
        ..lineTo(0, h)
        ..close(),
      Paint()..color = _sage,
    );

    // Arc de traduction entre les deux amis
    final a = Offset(w * .3, h * .5);
    final b = Offset(w * .7, h * .5);
    final arc = Path()
      ..moveTo(a.dx, a.dy)
      ..quadraticBezierTo(w * .5, h * .18, b.dx, b.dy);
    canvas.drawPath(arc, Paint()..color = _boubou1.withValues(alpha: .35)..style = PaintingStyle.stroke..strokeWidth = 3..strokeCap = StrokeCap.round);
    final m = arc.computeMetrics().first;
    for (var i = 0; i < 4; i++) {
      final u = (t * 2 + i / 4) % 1;
      final pos = m.getTangentForOffset(m.length * u)!.position;
      canvas.drawCircle(pos, 4 + 2 * math.sin(u * math.pi), Paint()..color = _boubou2.withValues(alpha: .9 * math.sin(u * math.pi)));
    }

    final talkingLeft = t < .5;
    final s = (h / 300).clamp(.6, 1.2);
    _character(canvas, Offset(w * .27, h * .9), s, _skin1, _boubou1, t, talk: talkingLeft, phase: 0, lookDir: 1, wave: 1);
    _character(canvas, Offset(w * .73, h * .9), s, _skin2, _boubou2, t, talk: !talkingLeft, phase: .4, lookDir: -1, cap: true);

    _bubble(canvas, Offset(w * .27, h * .27), Size(w * .34, 40), 'Bonjour !', Colors.white, _ink, _pop(t, 0.02, 0.46), tailLeft: true);
    _bubble(canvas, Offset(w * .73, h * .27), Size(w * .40, 40), 'Yɛ́ɛ̀ bɛ̀ɛ ?', _boubou1, const Color(0xFF2B2110), _pop(t, 0.52, 0.96), tailLeft: false);
  }

  @override
  bool shouldRepaint(covariant TranslateScenePainter old) => old.t != t;
}

/// Scène 2 : la flamme FITILA veille sur un livre ouvert, les lettres du Bàátɔ̀nú s'envolent.
class LearnScenePainter extends CustomPainter {
  LearnScenePainter(this.t);
  final double t;

  @override
  void paint(Canvas canvas, Size size) {
    final w = size.width;
    final h = size.height;
    canvas.drawRect(Offset.zero & size, Paint()..shader = const LinearGradient(begin: Alignment.topCenter, end: Alignment.bottomCenter, colors: [Color(0xFF3A3448), Color(0xFF241F2E)]).createShader(Offset.zero & size));

    // Étoiles qui scintillent
    final rnd = math.Random(7);
    for (var i = 0; i < 26; i++) {
      final p = Offset(rnd.nextDouble() * w, rnd.nextDouble() * h * .7);
      final tw = .5 + .5 * _wave(t, cycles: 2, phase: rnd.nextDouble());
      canvas.drawCircle(p, .8 + 1.6 * tw, Paint()..color = Colors.white.withValues(alpha: .25 + .6 * tw));
    }

    final cx = w * .5;
    final ground = h * .86;

    // Halo de la flamme
    final flameC = Offset(cx, h * .36);
    for (var i = 3; i >= 1; i--) {
      canvas.drawCircle(flameC, h * (.11 + .05 * i) + 4 * _wave(t, cycles: 2, phase: i * .2), Paint()..color = _boubou1.withValues(alpha: .07 * (4 - i)));
    }

    // Livre ouvert
    final book = Path()
      ..moveTo(cx, ground - 10)
      ..quadraticBezierTo(cx - w * .12, ground - 34, cx - w * .3, ground - 20)
      ..lineTo(cx - w * .3, ground + 20)
      ..quadraticBezierTo(cx - w * .12, ground + 4, cx, ground + 16)
      ..close();
    final bookR = Path()
      ..moveTo(cx, ground - 10)
      ..quadraticBezierTo(cx + w * .12, ground - 34, cx + w * .3, ground - 20)
      ..lineTo(cx + w * .3, ground + 20)
      ..quadraticBezierTo(cx + w * .12, ground + 4, cx, ground + 16)
      ..close();
    canvas.drawPath(book, Paint()..color = const Color(0xFFFFF6E6));
    canvas.drawPath(bookR, Paint()..color = const Color(0xFFFCEFCF));
    canvas.drawPath(book, Paint()..color = _boubou1..style = PaintingStyle.stroke..strokeWidth = 3);
    canvas.drawPath(bookR, Paint()..color = _boubou1..style = PaintingStyle.stroke..strokeWidth = 3);
    for (var i = 0; i < 4; i++) {
      final y = ground - 12 + i * 8;
      canvas.drawLine(Offset(cx - w * .26, y), Offset(cx - w * .06, y + 3), Paint()..color = _boubou2.withValues(alpha: .35)..strokeWidth = 2.4..strokeCap = StrokeCap.round);
      canvas.drawLine(Offset(cx + w * .06, y + 3), Offset(cx + w * .26, y), Paint()..color = _boubou2.withValues(alpha: .35)..strokeWidth = 2.4..strokeCap = StrokeCap.round);
    }

    // Lettres qui s'envolent du livre
    const letters = ['ɔ', 'ɛ', 'ŋ', 'ɓ', 'à', 'ú', 'ɖ'];
    for (var i = 0; i < letters.length; i++) {
      final u = (t * 1.0 + i / letters.length) % 1;
      final side = i.isEven ? -1 : 1;
      final x = cx + side * (w * .05 + w * .22 * u) + 14 * _wave(u, cycles: 2, phase: i * .3);
      final y = ground - 20 - (h * .5) * u;
      final alpha = math.sin(u * math.pi);
      _text(canvas, letters[i], Offset(x, y), 26 + 6 * u, Color.lerp(_boubou1, Colors.white, .3)!.withValues(alpha: alpha), weight: FontWeight.w900);
    }

    // Mascotte flamme
    final sway = _wave(t, cycles: 3) * 5;
    final flame = Path()
      ..moveTo(flameC.dx, flameC.dy - h * .17)
      ..cubicTo(flameC.dx + w * .11 + sway, flameC.dy - h * .06, flameC.dx + w * .12, flameC.dy + h * .1, flameC.dx, flameC.dy + h * .13)
      ..cubicTo(flameC.dx - w * .12, flameC.dy + h * .1, flameC.dx - w * .11 + sway, flameC.dy - h * .06, flameC.dx, flameC.dy - h * .17)
      ..close();
    canvas.drawPath(flame, Paint()..shader = const LinearGradient(begin: Alignment.topCenter, end: Alignment.bottomCenter, colors: [Color(0xFFFFD86B), Color(0xFFE8792F)]).createShader(flame.getBounds()));
    final inner = Path()
      ..moveTo(flameC.dx, flameC.dy - h * .04)
      ..cubicTo(flameC.dx + w * .055, flameC.dy + h * .01, flameC.dx + w * .05, flameC.dy + h * .09, flameC.dx, flameC.dy + h * .1)
      ..cubicTo(flameC.dx - w * .05, flameC.dy + h * .09, flameC.dx - w * .055, flameC.dy + h * .01, flameC.dx, flameC.dy - h * .04)
      ..close();
    canvas.drawPath(inner, Paint()..color = const Color(0xFFFFF1C2));
    _face(canvas, flameC + Offset(0, h * .03), h * .055, const Color(0x00000000), t, talk: true, phase: .2);

    // Ondes sonores autour du livre
    for (var i = 0; i < 3; i++) {
      final u = (t * 1.5 + i / 3) % 1;
      canvas.drawCircle(Offset(cx, ground), 22 + u * w * .3, Paint()..color = Colors.white.withValues(alpha: .18 * (1 - u))..style = PaintingStyle.stroke..strokeWidth = 2);
    }
  }

  @override
  bool shouldRepaint(covariant LearnScenePainter old) => old.t != t;
}

/// Hôte d'animation : boucle `t` de 0 à 1 et repeint la scène.
class AnimatedScene extends StatefulWidget {
  const AnimatedScene({super.key, required this.builder, this.duration = const Duration(seconds: 7), this.semanticLabel});

  final CustomPainter Function(double t) builder;
  final Duration duration;
  final String? semanticLabel;

  @override
  State<AnimatedScene> createState() => _AnimatedSceneState();
}

class _AnimatedSceneState extends State<AnimatedScene> with SingleTickerProviderStateMixin {
  late final AnimationController _c = AnimationController(vsync: this, duration: widget.duration)..repeat();

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => Semantics(
    image: true,
    label: widget.semanticLabel,
    child: ExcludeSemantics(
      child: RepaintBoundary(
        child: AnimatedBuilder(animation: _c, builder: (_, _) => CustomPaint(painter: widget.builder(_c.value), size: Size.infinite)),
      ),
    ),
  );
}

/// Un slide : scène animée + titre + sous-titre.
class LandingSlide extends StatelessWidget {
  const LandingSlide({super.key, required this.scene, required this.title, required this.subtitle, required this.dark});

  final Widget scene;
  final String title;
  final String subtitle;
  final bool dark;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Expanded(
          child: ClipRRect(
            borderRadius: BorderRadius.circular(30),
            child: DecoratedBox(
              decoration: BoxDecoration(boxShadow: [BoxShadow(color: SignatureTheme.ink.withValues(alpha: .18), blurRadius: 30, offset: const Offset(0, 16), spreadRadius: -14)]),
              child: scene,
            ),
          ),
        ),
        const SizedBox(height: 14),
        Text(title, textAlign: TextAlign.center, style: const TextStyle(fontFamily: 'serif', fontSize: 25, fontWeight: FontWeight.w700, color: SignatureTheme.ink, height: 1.1)),
        const SizedBox(height: 6),
        Text(subtitle, textAlign: TextAlign.center, style: const TextStyle(fontSize: 13.5, color: SignatureTheme.muted, height: 1.4)),
      ],
    );
  }
}
