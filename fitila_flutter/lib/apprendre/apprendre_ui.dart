import 'package:flutter/material.dart';

/// Palette « Premium Clair » de FITILA, reprise de `SignatureTheme`.
abstract final class ApColors {
  static const ivory = Color(0xFFF7F5EC);
  static const surface = Color(0xFFFFFFFF);
  static const surfaceAlt = Color(0xFFF1EDDF);
  static const ink = Color(0xFF241F2E);
  static const inkSoft = Color(0xFF3A3448);

  /// Gris texte assombri pour garder un contraste lisible sur l'ivoire.
  static const muted = Color(0xFF6F6955);
  static const quiet = Color(0xFF5E5846);
  static const gold = Color(0xFFC99530);
  static const goldDeep = Color(0xFF9C6B1D);
  static const goldInk = Color(0xFF2B2110);
  static const goldTint = Color(0xFFF3E3B9);
  static const goldGlow = Color(0xFFFFFBF0);
  static const clay = Color(0xFFB54E33);
  static const clayInk = Color(0xFF8A3A24);
  static const clayTint = Color(0xFFF4DED2);
  static const sage = Color(0xFF3F6E52);
  static const sageInk = Color(0xFF2F5540);
  static const sageTint = Color(0xFFDCEAE0);
  static const line = Color(0xFFE4DFCC);
  static const lineStrong = Color(0xFFD5CEB3);
  static const night = Color(0xFF241F2E);
  static const nightSoft = Color(0xFF3A3448);
  static const nightText = Color(0xFFD9D3C1);
}

abstract final class ApText {
  /// Titres éditoriaux en français (police Fraunces embarquée).
  static const display = TextStyle(
    fontFamily: 'Fraunces',
    fontWeight: FontWeight.w600,
    color: ApColors.ink,
    height: 1.15,
    letterSpacing: -.2,
  );

  /// Texte bàátɔ̀nú : Inter couvre ɔ, ɛ et les diacritiques de ton.
  static const bariba = TextStyle(
    fontFamily: 'Inter',
    fontWeight: FontWeight.w700,
    color: ApColors.ink,
    height: 1.25,
  );

  static const body = TextStyle(
    fontFamily: 'Inter',
    color: ApColors.inkSoft,
    fontSize: 14,
    height: 1.45,
  );

  static const label = TextStyle(
    fontFamily: 'Inter',
    color: ApColors.muted,
    fontSize: 11.5,
    fontWeight: FontWeight.w700,
    letterSpacing: .5,
  );

  static const small = TextStyle(
    fontFamily: 'Inter',
    color: ApColors.muted,
    fontSize: 12,
    height: 1.35,
  );
}

/// Icônes nommées dans le contenu JSON.
IconData apIcon(String name) {
  switch (name) {
    case 'record_voice_over':
      return Icons.record_voice_over_rounded;
    case 'graphic_eq':
      return Icons.graphic_eq_rounded;
    case 'category':
      return Icons.category_rounded;
    case 'people_alt':
      return Icons.people_alt_rounded;
    case 'bolt':
      return Icons.bolt_rounded;
    case 'auto_fix_high':
      return Icons.auto_fix_high_rounded;
    case 'view_timeline':
      return Icons.view_timeline_rounded;
    case 'pin':
      return Icons.pin_rounded;
    case 'account_tree':
      return Icons.account_tree_rounded;
    case 'waving_hand':
      return Icons.waving_hand_rounded;
    case 'family_restroom':
      return Icons.family_restroom_rounded;
    case 'cottage':
      return Icons.cottage_rounded;
    case 'restaurant':
      return Icons.restaurant_rounded;
    case 'schedule':
      return Icons.schedule_rounded;
    case 'favorite':
      return Icons.favorite_rounded;
    case 'agriculture':
      return Icons.agriculture_rounded;
    case 'storefront':
      return Icons.storefront_rounded;
    case 'forest':
      return Icons.forest_rounded;
    case 'mood':
      return Icons.mood_rounded;
    case 'forum':
      return Icons.forum_rounded;
    case 'temple_buddhist':
      return Icons.account_balance_rounded;
    case 'directions_run':
      return Icons.directions_run_rounded;
    case 'hearing':
      return Icons.hearing_rounded;
    case 'menu_book':
      return Icons.menu_book_rounded;
    case 'local_fire_department':
      return Icons.local_fire_department_rounded;
    case 'sync_alt':
      return Icons.sync_alt_rounded;
    case 'wb_twilight':
      return Icons.wb_twilight_rounded;
    case 'home':
      return Icons.home_rounded;
    default:
      return Icons.auto_stories_rounded;
  }
}

/// Carte blanche à bord fin, le bloc de base du module.
class ApCardBox extends StatelessWidget {
  const ApCardBox({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(16),
    this.color = ApColors.surface,
    this.borderColor = ApColors.line,
    this.radius = 20,
    this.onTap,
  });

  final Widget child;
  final EdgeInsetsGeometry padding;
  final Color color;
  final Color borderColor;
  final double radius;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final shape = RoundedRectangleBorder(
      borderRadius: BorderRadius.circular(radius),
      side: BorderSide(color: borderColor),
    );
    return Material(
      color: color,
      shape: shape,
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Padding(padding: padding, child: child),
      ),
    );
  }
}

class ApSectionTitle extends StatelessWidget {
  const ApSectionTitle(this.title, {super.key, this.trailing});

  final String title;
  final Widget? trailing;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(top: 22, bottom: 10),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          Expanded(
            child: Text(
              title,
              style: const TextStyle(
                fontFamily: 'Inter',
                fontSize: 17,
                fontWeight: FontWeight.w800,
                color: ApColors.ink,
              ),
            ),
          ),
          ?trailing,
        ],
      ),
    );
  }
}

/// Petite étiquette arrondie (statut, source, niveau).
class ApPill extends StatelessWidget {
  const ApPill(
    this.text, {
    super.key,
    this.background = ApColors.goldTint,
    this.foreground = ApColors.goldDeep,
    this.icon,
  });

  final String text;
  final Color background;
  final Color foreground;
  final IconData? icon;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: background,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (icon != null) ...[
            Icon(icon, size: 14, color: foreground),
            const SizedBox(width: 4),
          ],
          Flexible(
            child: Text(
              text,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(
                fontFamily: 'Inter',
                fontSize: 11.5,
                fontWeight: FontWeight.w700,
                color: foreground,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// Mention de la source d'une forme bariba (page du dictionnaire, article).
class ApSourceTag extends StatelessWidget {
  const ApSourceTag(this.source, {super.key, this.verified = true});

  final String source;
  final bool verified;

  @override
  Widget build(BuildContext context) {
    if (source.isEmpty) {
      return const SizedBox.shrink();
    }
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(
          verified ? Icons.verified_rounded : Icons.help_outline_rounded,
          size: 13,
          color: verified ? ApColors.sage : ApColors.clay,
        ),
        const SizedBox(width: 4),
        Flexible(
          child: Text(
            verified ? source : '$source · à valider',
            style: ApText.small.copyWith(fontSize: 11),
          ),
        ),
      ],
    );
  }
}

/// Bouton principal or (hauteur 54, coins pleins).
class ApPrimaryButton extends StatelessWidget {
  const ApPrimaryButton({
    super.key,
    required this.label,
    required this.onPressed,
    this.icon,
    this.dark = false,
  });

  final String label;
  final VoidCallback? onPressed;
  final IconData? icon;
  final bool dark;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: double.infinity,
      height: 54,
      child: FilledButton(
        onPressed: onPressed,
        style: FilledButton.styleFrom(
          backgroundColor: dark ? ApColors.night : ApColors.gold,
          foregroundColor: dark ? Colors.white : ApColors.goldInk,
          disabledBackgroundColor: ApColors.surfaceAlt,
          disabledForegroundColor: ApColors.muted,
          shape: const StadiumBorder(),
          textStyle: const TextStyle(
            fontFamily: 'Inter',
            fontSize: 16,
            fontWeight: FontWeight.w800,
          ),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            if (icon != null) ...[Icon(icon, size: 20), const SizedBox(width: 8)],
            Flexible(child: Text(label, overflow: TextOverflow.ellipsis)),
          ],
        ),
      ),
    );
  }
}

class ApSecondaryButton extends StatelessWidget {
  const ApSecondaryButton({
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
    return SizedBox(
      width: double.infinity,
      height: 48,
      child: OutlinedButton(
        onPressed: onPressed,
        style: OutlinedButton.styleFrom(
          foregroundColor: ApColors.ink,
          backgroundColor: ApColors.surface,
          side: const BorderSide(color: ApColors.lineStrong),
          shape: const StadiumBorder(),
          textStyle: const TextStyle(
            fontFamily: 'Inter',
            fontSize: 14,
            fontWeight: FontWeight.w700,
          ),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            if (icon != null) ...[
              Icon(icon, size: 18, color: ApColors.goldDeep),
              const SizedBox(width: 8),
            ],
            Flexible(child: Text(label, overflow: TextOverflow.ellipsis)),
          ],
        ),
      ),
    );
  }
}

/// Barre supérieure du module : retour (ou menu) + titre + action.
class ApTopBar extends StatelessWidget {
  const ApTopBar({
    super.key,
    required this.title,
    this.subtitle,
    this.trailing,
    this.onBack,
    this.dark = false,
  });

  final String title;
  final String? subtitle;
  final Widget? trailing;
  final VoidCallback? onBack;
  final bool dark;

  @override
  Widget build(BuildContext context) {
    final scaffold = Scaffold.maybeOf(context);
    final navigator = Navigator.of(context);
    final canPop = navigator.canPop();
    final useDrawer = onBack == null && !canPop && (scaffold?.hasDrawer ?? false);
    final fg = dark ? Colors.white : ApColors.ink;
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
      child: Row(
        children: [
          if (onBack != null || canPop || useDrawer)
            ApRoundIconButton(
              icon: useDrawer ? Icons.menu_rounded : Icons.arrow_back_rounded,
              tooltip: useDrawer ? 'Menu' : 'Retour',
              dark: dark,
              onPressed: () {
                if (onBack != null) {
                  onBack!();
                } else if (useDrawer) {
                  scaffold!.openDrawer();
                } else {
                  navigator.maybePop();
                }
              },
            ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  title,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontFamily: 'Inter',
                    fontSize: 16,
                    fontWeight: FontWeight.w800,
                    color: fg,
                  ),
                ),
                if (subtitle != null)
                  Text(
                    subtitle!,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontFamily: 'Inter',
                      fontSize: 12,
                      color: dark ? ApColors.nightText : ApColors.muted,
                    ),
                  ),
              ],
            ),
          ),
          ?trailing,
        ],
      ),
    );
  }
}

class ApRoundIconButton extends StatelessWidget {
  const ApRoundIconButton({
    super.key,
    required this.icon,
    required this.tooltip,
    required this.onPressed,
    this.dark = false,
    this.size = 44,
  });

  final IconData icon;
  final String tooltip;
  final VoidCallback? onPressed;
  final bool dark;
  final double size;

  @override
  Widget build(BuildContext context) {
    return Tooltip(
      message: tooltip,
      child: Material(
        color: dark ? Colors.white.withValues(alpha: .1) : ApColors.surface,
        shape: CircleBorder(
          side: BorderSide(
            color: dark ? Colors.white.withValues(alpha: .18) : ApColors.line,
          ),
        ),
        child: InkWell(
          customBorder: const CircleBorder(),
          onTap: onPressed,
          child: SizedBox(
            width: size,
            height: size,
            child: Icon(
              icon,
              size: 20,
              color: dark ? Colors.white : ApColors.ink,
            ),
          ),
        ),
      ),
    );
  }
}

/// Anneau de progression (0 → 1) avec valeur au centre.
class ApRing extends StatelessWidget {
  const ApRing({
    super.key,
    required this.value,
    required this.label,
    this.color = ApColors.gold,
    this.size = 56,
  });

  final double value;
  final String label;
  final Color color;
  final double size;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: size,
      height: size,
      child: Stack(
        alignment: Alignment.center,
        children: [
          SizedBox(
            width: size,
            height: size,
            child: CircularProgressIndicator(
              value: value.clamp(0.0, 1.0),
              strokeWidth: 6,
              backgroundColor: ApColors.surfaceAlt,
              valueColor: AlwaysStoppedAnimation<Color>(color),
              strokeCap: StrokeCap.round,
            ),
          ),
          Text(
            label,
            style: const TextStyle(
              fontFamily: 'Inter',
              fontSize: 13,
              fontWeight: FontWeight.w800,
              color: ApColors.ink,
            ),
          ),
        ],
      ),
    );
  }
}

/// Barre de progression fine et arrondie.
class ApProgressBar extends StatelessWidget {
  const ApProgressBar({
    super.key,
    required this.value,
    this.color = ApColors.gold,
    this.height = 6,
  });

  final double value;
  final Color color;
  final double height;

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(height),
      child: LinearProgressIndicator(
        value: value.clamp(0.0, 1.0),
        minHeight: height,
        backgroundColor: ApColors.surfaceAlt,
        valueColor: AlwaysStoppedAnimation<Color>(color),
      ),
    );
  }
}

/// Illustration du guide (personnage générique, sans visage réel).
class ApGuideAvatar extends StatelessWidget {
  const ApGuideAvatar({super.key, this.size = 76});

  final double size;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: ApColors.nightSoft,
        border: Border.all(color: ApColors.gold, width: 2),
      ),
      clipBehavior: Clip.antiAlias,
      child: CustomPaint(painter: _GuidePainter()),
    );
  }
}

class _GuidePainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final w = size.width;
    final h = size.height;
    final body = Paint()..color = ApColors.gold;
    final head = Paint()..color = ApColors.goldDeep;
    final cap = Paint()
      ..color = ApColors.goldTint
      ..style = PaintingStyle.stroke
      ..strokeWidth = w * .045
      ..strokeCap = StrokeCap.round;
    final bodyPath = Path()
      ..moveTo(w * .14, h)
      ..quadraticBezierTo(w * .2, h * .66, w * .5, h * .64)
      ..quadraticBezierTo(w * .8, h * .66, w * .86, h)
      ..close();
    canvas.drawPath(bodyPath, body);
    canvas.drawCircle(Offset(w * .5, h * .4), w * .19, head);
    final capPath = Path()
      ..moveTo(w * .31, h * .3)
      ..quadraticBezierTo(w * .5, h * .12, w * .69, h * .3);
    canvas.drawPath(capPath, cap);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

/// Texte bàátɔ̀nú avec, selon le profil, sa transcription tonale.
class ApBaribaText extends StatelessWidget {
  const ApBaribaText(
    this.text, {
    super.key,
    this.size = 20,
    this.transcription,
    this.color = ApColors.ink,
    this.align = TextAlign.start,
  });

  final String text;
  final double size;
  final String? transcription;
  final Color color;
  final TextAlign align;

  @override
  Widget build(BuildContext context) {
    final tr = transcription;
    return Column(
      crossAxisAlignment: align == TextAlign.center
          ? CrossAxisAlignment.center
          : CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(
          text,
          textAlign: align,
          style: ApText.bariba.copyWith(fontSize: size, color: color),
        ),
        if (tr != null && tr.isNotEmpty && tr.split('/').first.trim() != text)
          Padding(
            padding: const EdgeInsets.only(top: 2),
            child: Text(
              '[${tr.split('/').first.trim()}]',
              textAlign: align,
              style: ApText.small.copyWith(
                color: color == ApColors.ink ? ApColors.muted : color,
              ),
            ),
          ),
      ],
    );
  }
}
