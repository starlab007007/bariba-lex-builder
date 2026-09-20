import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

/// UI primitives mirroring the attached HTML reference for the six FITILA
/// creation experiences. No business logic lives here: screens provide every
/// state value and callback.
abstract final class FitilaReferenceUi {
  static const gold = Color(0xFFC99530);
  static const goldDeep = Color(0xFF9C6B1D);
  static const goldTint = Color(0xFFF3E3B9);
  static const clay = Color(0xFFB54E33);
  static const clayTint = Color(0xFFF4DED2);
  static const sage = Color(0xFF3F6E52);
  static const sageDeep = Color(0xFF2C5039);
  static const sageTint = Color(0xFFDCEAE0);
  static const hairline = Color(0xFFE4DFCC);
  static const ink = Color(0xFF241F2E);
  static const inkSoft = Color(0xFF3A3448);
  static const muted = Color(0xFF8C8571);
  static const appBg = Color(0xFFF7F5EC);
  static const surface = Color(0xFFFFFFFF);
  static const surfaceAlt = Color(0xFFF1EDDF);
  static const danger = Color(0xFFB23B3B);
  static const dark1 = Color(0xFF1B1730);
  static const dark2 = Color(0xFF241F2E);
  static const dark3 = Color(0xFF332A4D);
  static const wasaGlow = Color(0xFF8FE3CF);
  static const wasaViolet = Color(0xFF4A3B78);

  static const darkGradient = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [dark1, dark2, dark3],
    stops: [0.0, .55, 1.0],
  );

  static TextStyle serif({
    double size = 17,
    FontWeight weight = FontWeight.w600,
    Color? color,
    double? height,
  }) =>
      TextStyle(
        fontFamily: 'serif',
        fontSize: size,
        fontWeight: weight,
        color: color,
        height: height,
      );
}

class ReferenceCreationShell extends StatelessWidget {
  const ReferenceCreationShell({
    super.key,
    required this.child,
    this.dark = false,
    this.title,
    this.subtitle,
    this.leading,
    this.onBack,
    this.actions = const [],
    this.showTopBar = true,
    this.bodyPadding = const EdgeInsets.fromLTRB(16, 14, 16, 22),
    this.centerBody = false,
  });

  final Widget child;
  final bool dark;
  final String? title;
  final String? subtitle;
  final Widget? leading;
  final VoidCallback? onBack;
  final List<Widget> actions;
  final bool showTopBar;
  final EdgeInsetsGeometry bodyPadding;
  final bool centerBody;

  @override
  Widget build(BuildContext context) {
    final fg = dark ? Colors.white : FitilaReferenceUi.ink;
    final systemStyle = dark
        ? SystemUiOverlayStyle.light.copyWith(
            statusBarColor: Colors.transparent,
            systemNavigationBarColor: const Color(0xFF111111),
          )
        : SystemUiOverlayStyle.dark.copyWith(
            statusBarColor: Colors.transparent,
            systemNavigationBarColor: const Color(0xFF111111),
          );

    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: systemStyle,
      child: Theme(
        data: Theme.of(context).copyWith(
          scaffoldBackgroundColor: Colors.transparent,
          textTheme: Theme.of(context).textTheme.apply(
                bodyColor: fg,
                displayColor: fg,
              ),
          inputDecorationTheme: InputDecorationTheme(
            filled: true,
            fillColor: dark
                ? Colors.white.withValues(alpha: .07)
                : FitilaReferenceUi.surface,
            hintStyle: TextStyle(
              color: dark
                  ? Colors.white.withValues(alpha: .43)
                  : FitilaReferenceUi.muted,
            ),
            labelStyle: TextStyle(
              color: dark
                  ? Colors.white.withValues(alpha: .62)
                  : FitilaReferenceUi.muted,
            ),
            contentPadding:
                const EdgeInsets.symmetric(horizontal: 14, vertical: 13),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(14),
              borderSide: BorderSide(
                color: dark
                    ? Colors.white.withValues(alpha: .14)
                    : FitilaReferenceUi.hairline,
              ),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(14),
              borderSide: BorderSide(
                color: dark
                    ? Colors.white.withValues(alpha: .14)
                    : FitilaReferenceUi.hairline,
              ),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(14),
              borderSide: BorderSide(
                color: dark
                    ? FitilaReferenceUi.gold
                    : FitilaReferenceUi.goldDeep,
                width: 1.4,
              ),
            ),
          ),
          cardTheme: CardThemeData(
            margin: EdgeInsets.zero,
            color: dark
                ? Colors.white.withValues(alpha: .06)
                : FitilaReferenceUi.surface,
            elevation: 0,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(16),
              side: BorderSide(
                color: dark
                    ? Colors.white.withValues(alpha: .14)
                    : FitilaReferenceUi.hairline,
              ),
            ),
          ),
        ),
        child: Material(
          color: dark ? FitilaReferenceUi.dark1 : FitilaReferenceUi.appBg,
          child: DecoratedBox(
            decoration: BoxDecoration(
              color: dark ? null : FitilaReferenceUi.appBg,
              gradient: dark ? FitilaReferenceUi.darkGradient : null,
            ),
            child: SafeArea(
              child: Scaffold(
                backgroundColor: Colors.transparent,
                body: Column(
                  children: [
                    if (showTopBar)
                      ReferenceTopBar(
                        dark: dark,
                        title: title ?? '',
                        subtitle: subtitle ?? '',
                        leading: leading,
                        onBack: onBack,
                        actions: actions,
                      ),
                    Expanded(
                      child: Padding(
                        padding: bodyPadding,
                        child: centerBody ? Center(child: child) : child,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class ReferenceTopBar extends StatelessWidget {
  const ReferenceTopBar({
    super.key,
    required this.dark,
    required this.title,
    required this.subtitle,
    this.leading,
    this.onBack,
    this.actions = const [],
  });

  final bool dark;
  final String title;
  final String subtitle;
  final Widget? leading;
  final VoidCallback? onBack;
  final List<Widget> actions;

  @override
  Widget build(BuildContext context) {
    final border = dark
        ? Colors.white.withValues(alpha: .10)
        : FitilaReferenceUi.hairline;
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.fromLTRB(18, 13, 12, 12),
      decoration: BoxDecoration(
        color: dark
            ? Colors.white.withValues(alpha: .05)
            : FitilaReferenceUi.surface,
        border: Border(bottom: BorderSide(color: border)),
      ),
      child: Row(
        children: [
          Material(
            color: dark
                ? Colors.white.withValues(alpha: .10)
                : FitilaReferenceUi.surfaceAlt,
            borderRadius: BorderRadius.circular(10),
            child: InkWell(
              borderRadius: BorderRadius.circular(10),
              onTap: onBack ?? () => Navigator.maybePop(context),
              child: SizedBox(
                width: 32,
                height: 32,
                child: Center(
                  child: leading ??
                      Icon(
                        Icons.arrow_back_rounded,
                        size: 17,
                        color: dark ? Colors.white : FitilaReferenceUi.ink,
                      ),
                ),
              ),
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: FitilaReferenceUi.serif(
                    size: 16.5,
                    color: dark ? Colors.white : FitilaReferenceUi.ink,
                  ),
                ),
                if (subtitle.isNotEmpty) ...[
                  const SizedBox(height: 1),
                  Text(
                    subtitle,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontSize: 11,
                      color: dark
                          ? Colors.white.withValues(alpha: .55)
                          : FitilaReferenceUi.muted,
                    ),
                  ),
                ],
              ],
            ),
          ),
          if (actions.isNotEmpty) ...[
            const SizedBox(width: 8),
            ...actions,
          ],
        ],
      ),
    );
  }
}

class ReferenceCard extends StatelessWidget {
  const ReferenceCard({
    super.key,
    required this.child,
    this.dark = false,
    this.padding = const EdgeInsets.symmetric(horizontal: 14, vertical: 13),
    this.margin = const EdgeInsets.only(bottom: 12),
    this.radius = 16,
    this.color,
    this.borderColor,
  });

  final Widget child;
  final bool dark;
  final EdgeInsetsGeometry padding;
  final EdgeInsetsGeometry margin;
  final double radius;
  final Color? color;
  final Color? borderColor;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      margin: margin,
      padding: padding,
      decoration: BoxDecoration(
        color: color ??
            (dark
                ? Colors.white.withValues(alpha: .06)
                : FitilaReferenceUi.surface),
        borderRadius: BorderRadius.circular(radius),
        border: Border.all(
          color: borderColor ??
              (dark
                  ? Colors.white.withValues(alpha: .14)
                  : FitilaReferenceUi.hairline),
        ),
      ),
      child: child,
    );
  }
}

class ReferenceGoldButton extends StatelessWidget {
  const ReferenceGoldButton({
    super.key,
    required this.label,
    required this.onPressed,
    this.icon,
    this.busy = false,
    this.trailing,
  });

  final String label;
  final VoidCallback? onPressed;
  final IconData? icon;
  final bool busy;
  final Widget? trailing;

  @override
  Widget build(BuildContext context) {
    return Opacity(
      opacity: onPressed == null ? .55 : 1,
      child: Material(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(14),
        child: InkWell(
          onTap: onPressed,
          borderRadius: BorderRadius.circular(14),
          child: Ink(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 13),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(14),
              gradient: const LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [FitilaReferenceUi.gold, FitilaReferenceUi.goldDeep],
              ),
              boxShadow: const [
                BoxShadow(
                  color: Color(0x559C6B1D),
                  blurRadius: 24,
                  spreadRadius: -10,
                  offset: Offset(0, 12),
                ),
              ],
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                if (busy)
                  const SizedBox(
                    width: 17,
                    height: 17,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      color: Colors.white,
                    ),
                  )
                else if (icon != null)
                  Icon(icon, size: 18, color: Colors.white),
                if (busy || icon != null) const SizedBox(width: 8),
                Flexible(
                  child: Text(
                    label,
                    textAlign: TextAlign.center,
                    style: const TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.w800,
                      fontSize: 13.5,
                    ),
                  ),
                ),
                if (trailing != null) ...[
                  const SizedBox(width: 8),
                  trailing!,
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class ReferenceGhostDarkButton extends StatelessWidget {
  const ReferenceGhostDarkButton({
    super.key,
    required this.label,
    required this.onPressed,
    this.icon,
  });

  final String label;
  final VoidCallback? onPressed;
  final IconData? icon;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.white.withValues(alpha: .08),
      borderRadius: BorderRadius.circular(14),
      child: InkWell(
        onTap: onPressed,
        borderRadius: BorderRadius.circular(14),
        child: Container(
          width: double.infinity,
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: Colors.white.withValues(alpha: .20)),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              if (icon != null) ...[
                Icon(icon, color: Colors.white, size: 18),
                const SizedBox(width: 7),
              ],
              Flexible(
                child: Text(
                  label,
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 12.5,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class ReferenceLabel extends StatelessWidget {
  const ReferenceLabel(this.text, {super.key, this.dark = false});

  final String text;
  final bool dark;

  @override
  Widget build(BuildContext context) {
    return Text(
      text.toUpperCase(),
      style: TextStyle(
        fontSize: 10.5,
        fontWeight: FontWeight.w800,
        letterSpacing: .55,
        color: dark
            ? Colors.white.withValues(alpha: .55)
            : FitilaReferenceUi.muted,
      ),
    );
  }
}

class ReferenceDarkLangToggle extends StatelessWidget {
  const ReferenceDarkLangToggle({
    super.key,
    required this.first,
    required this.second,
    required this.firstSelected,
    required this.onFirst,
    required this.onSecond,
  });

  final String first;
  final String second;
  final bool firstSelected;
  final VoidCallback onFirst;
  final VoidCallback onSecond;

  Widget _item(String label, bool selected, VoidCallback onTap) {
    return Material(
      color: selected ? Colors.white : Colors.transparent,
      borderRadius: BorderRadius.circular(999),
      child: InkWell(
        borderRadius: BorderRadius.circular(999),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 15, vertical: 7),
          child: Text(
            label,
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w800,
              color: selected
                  ? FitilaReferenceUi.ink
                  : Colors.white.withValues(alpha: .60),
            ),
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: .09),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          _item(first, firstSelected, onFirst),
          _item(second, !firstSelected, onSecond),
        ],
      ),
    );
  }
}

class ReferenceLightSegment extends StatelessWidget {
  const ReferenceLightSegment({
    super.key,
    required this.first,
    required this.second,
    required this.firstSelected,
    required this.onFirst,
    required this.onSecond,
  });

  final String first;
  final String second;
  final bool firstSelected;
  final VoidCallback onFirst;
  final VoidCallback onSecond;

  Widget _item(String label, bool selected, VoidCallback onTap) {
    return Expanded(
      child: Material(
        color: selected ? FitilaReferenceUi.ink : Colors.transparent,
        borderRadius: BorderRadius.circular(999),
        child: InkWell(
          borderRadius: BorderRadius.circular(999),
          onTap: onTap,
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 8),
            child: Text(
              label,
              textAlign: TextAlign.center,
              maxLines: 2,
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w800,
                color: selected ? Colors.white : FitilaReferenceUi.muted,
              ),
            ),
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: FitilaReferenceUi.surfaceAlt,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Row(
        children: [
          _item(first, firstSelected, onFirst),
          _item(second, !firstSelected, onSecond),
        ],
      ),
    );
  }
}

class ReferenceMicOrb extends StatefulWidget {
  const ReferenceMicOrb({
    super.key,
    this.icon = Icons.mic_rounded,
    this.size = 96,
    this.ringExtent = 150,
    this.active = true,
    this.onTap,
  });

  final IconData icon;
  final double size;
  final double ringExtent;
  final bool active;
  final VoidCallback? onTap;

  @override
  State<ReferenceMicOrb> createState() => _ReferenceMicOrbState();
}

class _ReferenceMicOrbState extends State<ReferenceMicOrb>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller = AnimationController(
    vsync: this,
    duration: Duration(milliseconds: widget.active ? 1500 : 2400),
  )..repeat();

  @override
  void didUpdateWidget(covariant ReferenceMicOrb oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.active != widget.active) {
      _controller.duration =
          Duration(milliseconds: widget.active ? 1500 : 2400);
      if (!_controller.isAnimating) _controller.repeat();
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Widget _ring(double delay) {
    return AnimatedBuilder(
      animation: _controller,
      builder: (context, _) {
        final t = (_controller.value + delay) % 1;
        return Transform.scale(
          scale: .6 + t * .95,
          child: Opacity(
            opacity: (1 - t) * .82,
            child: Container(
              width: widget.ringExtent,
              height: widget.ringExtent,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                border: Border.all(
                  color: FitilaReferenceUi.gold.withValues(alpha: .55),
                  width: 1.5,
                ),
              ),
            ),
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: widget.onTap,
      child: SizedBox(
        width: widget.ringExtent,
        height: widget.ringExtent,
        child: Stack(
          alignment: Alignment.center,
          children: [
            _ring(0),
            _ring(.33),
            _ring(.66),
            Container(
              width: widget.size,
              height: widget.size,
              decoration: const BoxDecoration(
                shape: BoxShape.circle,
                gradient: RadialGradient(
                  center: Alignment(-.35, -.4),
                  colors: [
                    Color(0xFFF0C878),
                    FitilaReferenceUi.gold,
                    FitilaReferenceUi.goldDeep,
                  ],
                  stops: [0, .55, 1],
                ),
                boxShadow: [
                  BoxShadow(
                    color: Color(0x77C99530),
                    blurRadius: 30,
                    spreadRadius: -8,
                    offset: Offset(0, 10),
                  ),
                ],
              ),
              child: Icon(
                widget.icon,
                color: Colors.white,
                size: widget.size * .36,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class ReferenceWaveform extends StatefulWidget {
  const ReferenceWaveform({
    super.key,
    this.active = true,
    this.height = 70,
    this.count = 12,
  });

  final bool active;
  final double height;
  final int count;

  @override
  State<ReferenceWaveform> createState() => _ReferenceWaveformState();
}

class _ReferenceWaveformState extends State<ReferenceWaveform>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 1150),
  )..repeat(reverse: true);

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: widget.height,
      child: AnimatedBuilder(
        animation: _controller,
        builder: (context, _) {
          return Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: List.generate(widget.count, (i) {
              final phase = (i * .63) % math.pi;
              final raw = .15 +
                  .85 *
                      (.5 +
                          .5 *
                              math.sin(
                                (_controller.value * math.pi * 2) + phase,
                              ));
              final level = widget.active ? raw : .16;
              return Container(
                width: 4,
                height: widget.height * level,
                margin: const EdgeInsets.symmetric(horizontal: 1.5),
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(3),
                  gradient: const LinearGradient(
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                    colors: [Color(0xFFF0C878), FitilaReferenceUi.gold],
                  ),
                ),
              );
            }),
          );
        },
      ),
    );
  }
}

class ReferenceVideoMock extends StatelessWidget {
  const ReferenceVideoMock({
    super.key,
    required this.caption,
    this.duration = '0:18',
    this.child,
    this.minHeight = 250,
  });

  final String caption;
  final String duration;
  final Widget? child;
  final double minHeight;

  @override
  Widget build(BuildContext context) {
    return Container(
      constraints: BoxConstraints(minHeight: minHeight),
      width: double.infinity,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(16),
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Color(0xFF2C2440), Color(0xFF3F345A)],
        ),
      ),
      clipBehavior: Clip.antiAlias,
      child: Stack(
        fit: StackFit.expand,
        children: [
          if (child != null) child!,
          Positioned(
            top: 12,
            left: 12,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: .16),
                borderRadius: BorderRadius.circular(999),
              ),
              child: Text(
                '▶ $duration',
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 10,
                  fontWeight: FontWeight.w800,
                ),
              ),
            ),
          ),
          Positioned(
            left: 12,
            right: 12,
            bottom: 14,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 11, vertical: 9),
              decoration: BoxDecoration(
                color: Colors.black.withValues(alpha: .50),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Text(
                caption,
                maxLines: 4,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  height: 1.35,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class ReferenceCountdownRing extends StatelessWidget {
  const ReferenceCountdownRing({
    super.key,
    required this.label,
    this.progress = .75,
    this.size = 60,
    this.dark = false,
  });

  final String label;
  final double progress;
  final double size;
  final bool dark;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: size,
      height: size,
      child: Stack(
        alignment: Alignment.center,
        children: [
          CustomPaint(
            size: Size.square(size),
            painter: _ReferenceRingPainter(
              progress: progress.clamp(0.0, 1.0).toDouble(),
              track: dark
                  ? Colors.white.withValues(alpha: .14)
                  : FitilaReferenceUi.hairline,
              color: dark ? FitilaReferenceUi.gold : FitilaReferenceUi.clay,
              width: 5,
            ),
          ),
          Text(
            label,
            textAlign: TextAlign.center,
            style: TextStyle(
              color: dark ? Colors.white : FitilaReferenceUi.ink,
              fontSize: 11,
              fontWeight: FontWeight.w800,
            ),
          ),
        ],
      ),
    );
  }
}

class ReferenceScoreRing extends StatelessWidget {
  const ReferenceScoreRing({
    super.key,
    required this.score,
    this.label = 'de justesse',
  });

  final int score;
  final String label;

  @override
  Widget build(BuildContext context) {
    return TweenAnimationBuilder<double>(
      tween: Tween(begin: 0, end: score.clamp(0, 100).toDouble()),
      duration: const Duration(milliseconds: 1600),
      curve: Curves.easeOutCubic,
      builder: (context, value, _) {
        return SizedBox(
          width: 132,
          height: 132,
          child: Stack(
            alignment: Alignment.center,
            children: [
              CustomPaint(
                size: const Size.square(132),
                painter: _ReferenceRingPainter(
                  progress: value / 100,
                  track: Colors.white.withValues(alpha: .14),
                  color: FitilaReferenceUi.gold,
                  width: 9,
                ),
              ),
              Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    '\${value.round()}%',
                    style: FitilaReferenceUi.serif(
                      size: 28,
                      color: Colors.white,
                    ),
                  ),
                  Text(
                    label,
                    style: TextStyle(
                      color: Colors.white.withValues(alpha: .60),
                      fontSize: 9.5,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ],
              ),
            ],
          ),
        );
      },
    );
  }
}

class _ReferenceRingPainter extends CustomPainter {
  const _ReferenceRingPainter({
    required this.progress,
    required this.track,
    required this.color,
    required this.width,
  });

  final double progress;
  final Color track;
  final Color color;
  final double width;

  @override
  void paint(Canvas canvas, Size size) {
    final center = size.center(Offset.zero);
    final radius = (size.shortestSide - width) / 2;
    final rect = Rect.fromCircle(center: center, radius: radius);
    canvas.drawCircle(
      center,
      radius,
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = width
        ..color = track,
    );
    canvas.drawArc(
      rect,
      -math.pi / 2,
      math.pi * 2 * progress,
      false,
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = width
        ..strokeCap = StrokeCap.round
        ..shader = const LinearGradient(
          colors: [Color(0xFFF0C878), FitilaReferenceUi.gold],
        ).createShader(rect),
    );
  }

  @override
  bool shouldRepaint(covariant _ReferenceRingPainter oldDelegate) =>
      oldDelegate.progress != progress ||
      oldDelegate.track != track ||
      oldDelegate.color != color ||
      oldDelegate.width != width;
}

class ReferenceEditChip extends StatelessWidget {
  const ReferenceEditChip({
    super.key,
    required this.emoji,
    required this.label,
    this.onTap,
  });

  final String emoji;
  final String label;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: FitilaReferenceUi.surfaceAlt,
      borderRadius: BorderRadius.circular(999),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(999),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 13, vertical: 8),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(999),
            border: Border.all(color: FitilaReferenceUi.hairline),
          ),
          child: Text(
            '$emoji $label',
            style: const TextStyle(
              color: FitilaReferenceUi.ink,
              fontSize: 11.5,
              fontWeight: FontWeight.w700,
            ),
          ),
        ),
      ),
    );
  }
}

class ReferenceCheckMark extends StatelessWidget {
  const ReferenceCheckMark({super.key, this.size = 64});

  final double size;

  @override
  Widget build(BuildContext context) {
    return TweenAnimationBuilder<double>(
      tween: Tween(begin: 0, end: 1),
      duration: const Duration(milliseconds: 800),
      builder: (context, value, _) => SizedBox(
        width: size,
        height: size,
        child: CustomPaint(
          painter: _ReferenceCheckPainter(value),
        ),
      ),
    );
  }
}

class _ReferenceCheckPainter extends CustomPainter {
  const _ReferenceCheckPainter(this.progress);
  final double progress;

  @override
  void paint(Canvas canvas, Size size) {
    final center = size.center(Offset.zero);
    final circle = Paint()
      ..color = FitilaReferenceUi.sage
      ..style = PaintingStyle.stroke
      ..strokeWidth = 5;
    canvas.drawArc(
      Rect.fromCircle(center: center, radius: size.width * .405),
      -math.pi / 2,
      math.pi * 2 * progress,
      false,
      circle,
    );
    if (progress > .58) {
      final checkProgress = ((progress - .58) / .42).clamp(0.0, 1.0).toDouble();
      final path = Path()
        ..moveTo(size.width * .31, size.height * .52)
        ..lineTo(size.width * .44, size.height * .65)
        ..lineTo(size.width * .70, size.height * .34);
      final metric = path.computeMetrics().first;
      final segment = metric.extractPath(0, metric.length * checkProgress);
      canvas.drawPath(
        segment,
        Paint()
          ..color = FitilaReferenceUi.sage
          ..style = PaintingStyle.stroke
          ..strokeCap = StrokeCap.round
          ..strokeJoin = StrokeJoin.round
          ..strokeWidth = 6,
      );
    }
  }

  @override
  bool shouldRepaint(covariant _ReferenceCheckPainter oldDelegate) =>
      oldDelegate.progress != progress;
}

class ReferenceTinyPill extends StatelessWidget {
  const ReferenceTinyPill({
    super.key,
    required this.label,
    this.icon,
    this.dark = false,
    this.color,
  });

  final String label;
  final IconData? icon;
  final bool dark;
  final Color? color;

  @override
  Widget build(BuildContext context) {
    final fg = color ?? (dark ? Colors.white : FitilaReferenceUi.inkSoft);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 5),
      decoration: BoxDecoration(
        color: dark
            ? Colors.white.withValues(alpha: .10)
            : FitilaReferenceUi.surfaceAlt,
        borderRadius: BorderRadius.circular(999),
        border: Border.all(
          color: dark
              ? Colors.white.withValues(alpha: .12)
              : FitilaReferenceUi.hairline,
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (icon != null) ...[
            Icon(icon, size: 13, color: fg),
            const SizedBox(width: 5),
          ],
          Text(
            label,
            style: TextStyle(
              color: fg,
              fontSize: 10.5,
              fontWeight: FontWeight.w800,
            ),
          ),
        ],
      ),
    );
  }
}

class ReferencePortalStage extends StatefulWidget {
  const ReferencePortalStage({
    super.key,
    required this.onEnter,
    this.title = 'Handunia Wasa',
    this.subtitle =
        'Le monde vivant Bàátɔ̀nú, tissé par chaque voix, chaque souvenir, chaque récit.',
  });

  final VoidCallback onEnter;
  final String title;
  final String subtitle;

  @override
  State<ReferencePortalStage> createState() => _ReferencePortalStageState();
}

class _ReferencePortalStageState extends State<ReferencePortalStage>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller = AnimationController(
    vsync: this,
    duration: const Duration(seconds: 8),
  )..repeat(reverse: true);

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    const dots = [
      Alignment(-.56, -.64),
      Alignment(.44, -.40),
      Alignment(-.68, .24),
      Alignment(.60, .40),
      Alignment(0, -.15),
      Alignment(-.10, .65),
    ];
    return AnimatedBuilder(
      animation: _controller,
      builder: (context, _) {
        final glow = .62 + _controller.value * .22;
        return Container(
          width: double.infinity,
          height: double.infinity,
          padding: const EdgeInsets.symmetric(horizontal: 22),
          decoration: BoxDecoration(
            gradient: RadialGradient(
              center: const Alignment(0, -.45),
              radius: 1.15,
              colors: [
                FitilaReferenceUi.wasaViolet.withValues(alpha: glow),
                FitilaReferenceUi.dark1,
              ],
              stops: const [0, .72],
            ),
          ),
          child: Stack(
            alignment: Alignment.center,
            children: [
              for (var i = 0; i < dots.length; i++)
                Align(
                  alignment: dots[i],
                  child: Opacity(
                    opacity: .18 + ((i + 1) * .10 + _controller.value) % .82,
                    child: const DecoratedBox(
                      decoration: BoxDecoration(
                        color: Colors.white,
                        shape: BoxShape.circle,
                      ),
                      child: SizedBox(width: 3, height: 3),
                    ),
                  ),
                ),
              Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  SizedBox(
                    width: 176,
                    height: 176,
                    child: Stack(
                      alignment: Alignment.center,
                      children: [
                        for (final size in [110.0, 142.0, 174.0])
                          Container(
                            width: size,
                            height: size,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              border: Border.all(
                                color: (size == 110
                                        ? FitilaReferenceUi.wasaGlow
                                        : size == 142
                                            ? FitilaReferenceUi.wasaGlow
                                            : FitilaReferenceUi.gold)
                                    .withValues(
                                  alpha: size == 110 ? .50 : .22,
                                ),
                              ),
                            ),
                          ),
                        const Text('🌌', style: TextStyle(fontSize: 32)),
                      ],
                    ),
                  ),
                  const SizedBox(height: 5),
                  Text(
                    widget.title,
                    textAlign: TextAlign.center,
                    style: FitilaReferenceUi.serif(
                      size: 21,
                      color: Colors.white,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    widget.subtitle,
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      color: Colors.white.withValues(alpha: .62),
                      fontSize: 11.5,
                      height: 1.5,
                    ),
                  ),
                  const SizedBox(height: 22),
                  ReferenceGhostDarkButton(
                    label: 'Entrer dans le monde',
                    onPressed: widget.onEnter,
                  ),
                ],
              ),
            ],
          ),
        );
      },
    );
  }
}

class ReferenceWorldNode extends StatelessWidget {
  const ReferenceWorldNode({
    super.key,
    required this.emoji,
    required this.label,
    required this.density,
    required this.onTap,
  });

  final String emoji;
  final String label;
  final int density;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 72,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(40),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            SizedBox(
              width: 54,
              height: 54,
              child: Stack(
                alignment: Alignment.center,
                children: [
                  CustomPaint(
                    size: const Size.square(54),
                    painter: _ReferenceRingPainter(
                      progress: density.clamp(0, 100).toDouble() / 100,
                      track: Colors.white.withValues(alpha: .12),
                      color: FitilaReferenceUi.wasaGlow,
                      width: 4,
                    ),
                  ),
                  Container(
                    width: 44,
                    height: 44,
                    alignment: Alignment.center,
                    decoration: const BoxDecoration(
                      color: FitilaReferenceUi.dark2,
                      shape: BoxShape.circle,
                    ),
                    child: Text(emoji, style: const TextStyle(fontSize: 16)),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 5),
            Text(
              label,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              textAlign: TextAlign.center,
              style: const TextStyle(
                color: Colors.white,
                fontSize: 9,
                fontWeight: FontWeight.w700,
                height: 1.2,
              ),
            ),
            Text(
              'Densité $density%',
              maxLines: 1,
              style: TextStyle(
                color: Colors.white.withValues(alpha: .50),
                fontSize: 8,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class ReferenceSceneStage extends StatefulWidget {
  const ReferenceSceneStage({
    super.key,
    required this.caption,
    this.emoji = '🌍',
  });

  final String caption;
  final String emoji;

  @override
  State<ReferenceSceneStage> createState() => _ReferenceSceneStageState();
}

class _ReferenceSceneStageState extends State<ReferenceSceneStage>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 2600),
  )..repeat(reverse: true);

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Widget _silhouette(double width, double height) {
    return ClipPath(
      clipper: _TentSilhouetteClipper(),
      child: Container(
        width: width,
        height: height,
        color: const Color(0x8C140E22),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 230,
      width: double.infinity,
      clipBehavior: Clip.antiAlias,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(16),
        gradient: const LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [
            Color(0xFF3A2E5C),
            Color(0xFF4A3B78),
            Color(0xFF7A5A3E),
            Color(0xFFB08A4E),
          ],
          stops: [0, .45, .78, 1],
        ),
      ),
      child: Stack(
        children: [
          Positioned(left: 17, bottom: 0, child: _silhouette(42, 88)),
          Positioned(left: 78, bottom: 0, child: _silhouette(38, 70)),
          Positioned(right: 18, bottom: 0, child: _silhouette(48, 102)),
          Positioned(right: 88, bottom: 0, child: _silhouette(30, 58)),
          Positioned(
            top: 14,
            right: 14,
            child: AnimatedBuilder(
              animation: _controller,
              builder: (context, child) => Transform.scale(
                scale: 1 + _controller.value * .08,
                child: child,
              ),
              child: Container(
                width: 44,
                height: 44,
                alignment: Alignment.center,
                decoration: const BoxDecoration(
                  shape: BoxShape.circle,
                  gradient: RadialGradient(
                    center: Alignment(-.3, -.4),
                    colors: [
                      FitilaReferenceUi.wasaGlow,
                      FitilaReferenceUi.wasaViolet,
                    ],
                  ),
                  boxShadow: [
                    BoxShadow(
                      color: Color(0x998FE3CF),
                      blurRadius: 24,
                    ),
                  ],
                ),
                child: Text(widget.emoji, style: const TextStyle(fontSize: 15)),
              ),
            ),
          ),
          Positioned(
            left: 10,
            right: 10,
            bottom: 10,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 11, vertical: 9),
              decoration: BoxDecoration(
                color: Colors.black.withValues(alpha: .40),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Text(
                widget.caption,
                maxLines: 5,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 11,
                  height: 1.4,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _TentSilhouetteClipper extends CustomClipper<Path> {
  @override
  Path getClip(Size size) => Path()
    ..moveTo(0, size.height)
    ..lineTo(size.width * .12, size.height * .22)
    ..lineTo(size.width * .5, 0)
    ..lineTo(size.width * .88, size.height * .22)
    ..lineTo(size.width, size.height)
    ..close();

  @override
  bool shouldReclip(covariant _TentSilhouetteClipper oldClipper) => false;
}
