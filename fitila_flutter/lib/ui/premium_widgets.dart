import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../core/signature_theme.dart';

/// Apparition douce (fondu + glissement) avec délai, pour enchaîner les blocs d'un écran.
class Reveal extends StatelessWidget {
  const Reveal({super.key, required this.child, this.index = 0, this.dy = 16});

  final Widget child;
  final int index;
  final double dy;

  @override
  Widget build(BuildContext context) => TweenAnimationBuilder<double>(
    tween: Tween(begin: 0, end: 1),
    duration: Duration(milliseconds: 380 + 60 * index.clamp(0, 8)),
    curve: Curves.easeOutCubic,
    builder: (_, v, c) => Opacity(opacity: v, child: Transform.translate(offset: Offset(0, dy * (1 - v)), child: c)),
    child: child,
  );
}

/// Nombre qui monte jusqu'à sa valeur.
class CountUp extends StatelessWidget {
  const CountUp({super.key, required this.value, this.style});

  final int value;
  final TextStyle? style;

  @override
  Widget build(BuildContext context) => TweenAnimationBuilder<double>(
    tween: Tween(begin: 0, end: value.toDouble()),
    duration: const Duration(milliseconds: 900),
    curve: Curves.easeOutCubic,
    builder: (_, v, _) => Text('${v.round()}', style: style),
  );
}

class PremiumCard extends StatelessWidget {
  const PremiumCard({super.key, required this.child, this.padding = const EdgeInsets.all(16), this.tint});

  final Widget child;
  final EdgeInsets padding;
  final Color? tint;

  @override
  Widget build(BuildContext context) => Container(
    width: double.infinity,
    padding: padding,
    decoration: BoxDecoration(
      color: tint ?? SignatureTheme.surface,
      borderRadius: BorderRadius.circular(SignatureTheme.radiusMedium + 4),
      border: Border.all(color: SignatureTheme.hairline),
      boxShadow: [BoxShadow(color: SignatureTheme.ink.withValues(alpha: .05), blurRadius: 22, offset: const Offset(0, 10), spreadRadius: -10)],
    ),
    child: child,
  );
}

class SectionLabel extends StatelessWidget {
  const SectionLabel(this.text, {super.key});
  final String text;
  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.fromLTRB(4, 18, 4, 8),
    child: Text(text.toUpperCase(), style: const TextStyle(fontSize: 11, letterSpacing: .9, fontWeight: FontWeight.w900, color: SignatureTheme.muted)),
  );
}

/// Pastille d'icône arrondie utilisée dans les lignes de réglage.
class IconBadge extends StatelessWidget {
  const IconBadge(this.icon, {super.key, this.color = SignatureTheme.goldDeep, this.background = SignatureTheme.goldTint, this.size = 40});
  final IconData icon;
  final Color color;
  final Color background;
  final double size;
  @override
  Widget build(BuildContext context) => Container(
    width: size,
    height: size,
    alignment: Alignment.center,
    decoration: BoxDecoration(color: background, borderRadius: BorderRadius.circular(size * .34)),
    child: Icon(icon, size: size * .5, color: color),
  );
}

/// Ligne interrupteur premium : icône, titre, description, interrupteur animé.
class PremiumSwitchRow extends StatelessWidget {
  const PremiumSwitchRow({super.key, required this.icon, required this.title, this.subtitle, required this.value, required this.onChanged, this.enabled = true});

  final IconData icon;
  final String title;
  final String? subtitle;
  final bool value;
  final ValueChanged<bool> onChanged;
  final bool enabled;

  @override
  Widget build(BuildContext context) => Semantics(
    toggled: value,
    label: title,
    child: InkWell(
      borderRadius: BorderRadius.circular(16),
      onTap: enabled
          ? () {
              HapticFeedback.selectionClick();
              onChanged(!value);
            }
          : null,
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 4),
        child: Row(children: [
          IconBadge(icon, color: value ? SignatureTheme.sage : SignatureTheme.muted, background: value ? SignatureTheme.sageTint : SignatureTheme.surfaceAlt),
          const SizedBox(width: 12),
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(title, style: const TextStyle(fontSize: 14.5, fontWeight: FontWeight.w800, color: SignatureTheme.ink)),
              if (subtitle != null) Padding(padding: const EdgeInsets.only(top: 2), child: Text(subtitle!, style: const TextStyle(fontSize: 12, color: SignatureTheme.muted, height: 1.3))),
            ]),
          ),
          const SizedBox(width: 8),
          Switch(value: value, onChanged: enabled ? (v) { HapticFeedback.selectionClick(); onChanged(v); } : null),
        ]),
      ),
    ),
  );
}

/// Ligne d'action (icône, titre, description, chevron ou widget final).
class PremiumActionRow extends StatelessWidget {
  const PremiumActionRow({super.key, required this.icon, required this.title, this.subtitle, this.onTap, this.trailing, this.danger = false});

  final IconData icon;
  final String title;
  final String? subtitle;
  final VoidCallback? onTap;
  final Widget? trailing;
  final bool danger;

  @override
  Widget build(BuildContext context) {
    final color = danger ? SignatureTheme.clay : SignatureTheme.ink;
    return InkWell(
      borderRadius: BorderRadius.circular(16),
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 4),
        child: Row(children: [
          IconBadge(icon, color: danger ? SignatureTheme.clay : SignatureTheme.goldDeep, background: danger ? SignatureTheme.clayTint : SignatureTheme.goldTint),
          const SizedBox(width: 12),
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(title, style: TextStyle(fontSize: 14.5, fontWeight: FontWeight.w800, color: color)),
              if (subtitle != null) Padding(padding: const EdgeInsets.only(top: 2), child: Text(subtitle!, style: const TextStyle(fontSize: 12, color: SignatureTheme.muted, height: 1.3))),
            ]),
          ),
          trailing ?? (onTap == null ? const SizedBox.shrink() : const Icon(Icons.chevron_right_rounded, color: SignatureTheme.muted)),
        ]),
      ),
    );
  }
}

/// Séparateur fin entre lignes d'une carte.
class RowDivider extends StatelessWidget {
  const RowDivider({super.key});
  @override
  Widget build(BuildContext context) => const Padding(padding: EdgeInsets.only(left: 56), child: Divider(height: 1, color: SignatureTheme.hairline));
}

/// Onglets segmentés à indicateur glissant.
class PremiumSegmented extends StatelessWidget {
  const PremiumSegmented({super.key, required this.labels, required this.selected, required this.onChanged, this.icons});

  final List<String> labels;
  final String selected;
  final ValueChanged<String> onChanged;
  final List<IconData>? icons;

  @override
  Widget build(BuildContext context) {
    final idx = labels.indexOf(selected).clamp(0, labels.length - 1);
    return Container(
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(color: SignatureTheme.surfaceAlt, borderRadius: BorderRadius.circular(18), border: Border.all(color: SignatureTheme.hairline)),
      child: LayoutBuilder(
        builder: (context, c) {
          final w = c.maxWidth / labels.length;
          return Stack(children: [
            AnimatedPositioned(
              duration: const Duration(milliseconds: 260),
              curve: Curves.easeOutCubic,
              left: w * idx,
              top: 0,
              bottom: 0,
              width: w,
              child: Container(decoration: BoxDecoration(color: SignatureTheme.surface, borderRadius: BorderRadius.circular(14), boxShadow: [BoxShadow(color: SignatureTheme.ink.withValues(alpha: .08), blurRadius: 8, offset: const Offset(0, 3))])),
            ),
            Row(children: [
              for (var i = 0; i < labels.length; i++)
                Expanded(
                  child: Semantics(
                    button: true,
                    selected: labels[i] == selected,
                    child: InkWell(
                      borderRadius: BorderRadius.circular(14),
                      onTap: () {
                        HapticFeedback.selectionClick();
                        onChanged(labels[i]);
                      },
                      child: Padding(
                        padding: const EdgeInsets.symmetric(vertical: 10),
                        child: Column(mainAxisSize: MainAxisSize.min, children: [
                          if (icons != null) Icon(icons![i], size: 18, color: labels[i] == selected ? SignatureTheme.goldDeep : SignatureTheme.muted),
                          Text(labels[i], maxLines: 1, overflow: TextOverflow.ellipsis, style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w800, color: labels[i] == selected ? SignatureTheme.ink : SignatureTheme.muted)),
                        ]),
                      ),
                    ),
                  ),
                ),
            ]),
          ]);
        },
      ),
    );
  }
}

/// Choix exclusif sous forme de cartes (confidentialité, langue, …).
class ChoiceCards extends StatelessWidget {
  const ChoiceCards({super.key, required this.options, required this.selected, required this.onChanged});

  final List<({String value, String title, String subtitle, IconData icon})> options;
  final String selected;
  final ValueChanged<String> onChanged;

  @override
  Widget build(BuildContext context) => Column(children: [
    for (final o in options)
      Padding(
        padding: const EdgeInsets.only(bottom: 8),
        child: InkWell(
          borderRadius: BorderRadius.circular(16),
          onTap: () {
            HapticFeedback.selectionClick();
            onChanged(o.value);
          },
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 180),
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: o.value == selected ? SignatureTheme.goldTint.withValues(alpha: .55) : SignatureTheme.surface,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: o.value == selected ? SignatureTheme.gold : SignatureTheme.hairline, width: o.value == selected ? 1.6 : 1),
            ),
            child: Row(children: [
              IconBadge(o.icon, size: 36),
              const SizedBox(width: 12),
              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(o.title, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 14)),
                Text(o.subtitle, style: const TextStyle(fontSize: 11.5, color: SignatureTheme.muted, height: 1.3)),
              ])),
              AnimatedScale(scale: o.value == selected ? 1 : 0, duration: const Duration(milliseconds: 180), child: const Icon(Icons.check_circle_rounded, color: SignatureTheme.goldDeep)),
            ]),
          ),
        ),
      ),
  ]);
}
