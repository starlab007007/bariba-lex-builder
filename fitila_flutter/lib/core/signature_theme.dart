import 'package:flutter/material.dart';

/// Design system FITILA Premium Clair.
/// Reference: fitila_flutter_ui_mockup_clair.html.
abstract final class SignatureTheme {
  static const appBackground = Color(0xFFF7F5EC);
  static const surface = Color(0xFFFFFFFF);
  static const surfaceAlt = Color(0xFFF1EDDF);
  static const ink = Color(0xFF241F2E);
  static const inkSoft = Color(0xFF3A3448);
  static const muted = Color(0xFF8C8571);
  static const gold = Color(0xFFC99530);
  static const goldDeep = Color(0xFF9C6B1D);
  static const goldTint = Color(0xFFF3E3B9);
  static const clay = Color(0xFFB54E33);
  static const clayTint = Color(0xFFF4DED2);
  static const sage = Color(0xFF3F6E52);
  static const sageTint = Color(0xFFDCEAE0);
  static const hairline = Color(0xFFE4DFCC);
  static const hairlineStrong = Color(0xFFD5CEB3);

  static const double radiusLarge = 28;
  static const double radiusMedium = 18;
  static const double radiusSmall = 12;

  static ThemeData light() {
    final scheme = ColorScheme.fromSeed(
      seedColor: gold,
      brightness: Brightness.light,
      primary: gold,
      onPrimary: const Color(0xFF2B2110),
      secondary: clay,
      onSecondary: Colors.white,
      tertiary: sage,
      onTertiary: Colors.white,
      surface: surface,
      onSurface: ink,
      error: clay,
      outline: hairline,
      outlineVariant: hairlineStrong,
    );

    final base = ThemeData(
      useMaterial3: true,
      colorScheme: scheme,
      fontFamily: 'Inter',
      scaffoldBackgroundColor: appBackground,
    );

    OutlineInputBorder inputBorder(Color color, {double width = 1}) {
      return OutlineInputBorder(
        borderRadius: BorderRadius.circular(16),
        borderSide: BorderSide(color: color, width: width),
      );
    }

    final textTheme = base.textTheme.copyWith(
      displayLarge: base.textTheme.displayLarge?.copyWith(
        color: ink,
        fontWeight: FontWeight.w700,
        letterSpacing: -.4,
      ),
      headlineLarge: base.textTheme.headlineLarge?.copyWith(
        color: ink,
        fontWeight: FontWeight.w700,
        letterSpacing: -.2,
      ),
      headlineMedium: base.textTheme.headlineMedium?.copyWith(
        color: ink,
        fontWeight: FontWeight.w700,
      ),
      headlineSmall: base.textTheme.headlineSmall?.copyWith(
        color: ink,
        fontWeight: FontWeight.w700,
      ),
      titleLarge: base.textTheme.titleLarge?.copyWith(
        color: ink,
        fontWeight: FontWeight.w700,
      ),
      titleMedium: base.textTheme.titleMedium?.copyWith(
        color: ink,
        fontWeight: FontWeight.w700,
      ),
      bodyLarge: base.textTheme.bodyLarge?.copyWith(color: inkSoft, height: 1.5),
      bodyMedium: base.textTheme.bodyMedium?.copyWith(color: inkSoft, height: 1.45),
      bodySmall: base.textTheme.bodySmall?.copyWith(color: muted, height: 1.4),
      labelLarge: base.textTheme.labelLarge?.copyWith(fontWeight: FontWeight.w700),
      labelMedium: base.textTheme.labelMedium?.copyWith(fontWeight: FontWeight.w700),
    );

    return base.copyWith(
      textTheme: textTheme,
      scaffoldBackgroundColor: appBackground,
      canvasColor: appBackground,
      splashColor: gold.withValues(alpha: .08),
      highlightColor: gold.withValues(alpha: .05),
      appBarTheme: const AppBarTheme(
        backgroundColor: appBackground,
        foregroundColor: ink,
        elevation: 0,
        scrolledUnderElevation: 0,
        centerTitle: false,
        surfaceTintColor: Colors.transparent,
      ),
      cardTheme: CardThemeData(
        color: surface,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        margin: EdgeInsets.zero,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(radiusMedium),
          side: const BorderSide(color: hairline),
        ),
      ),
      dividerTheme: const DividerThemeData(
        color: hairline,
        thickness: 1,
        space: 1,
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: surface,
        hintStyle: const TextStyle(color: muted),
        labelStyle: const TextStyle(color: muted),
        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 13),
        border: inputBorder(hairline),
        enabledBorder: inputBorder(hairline),
        focusedBorder: inputBorder(gold, width: 1.4),
        errorBorder: inputBorder(clay),
        focusedErrorBorder: inputBorder(clay, width: 1.4),
      ),
      searchBarTheme: SearchBarThemeData(
        backgroundColor: const WidgetStatePropertyAll(surface),
        surfaceTintColor: const WidgetStatePropertyAll(Colors.transparent),
        elevation: const WidgetStatePropertyAll(0),
        textStyle: const WidgetStatePropertyAll(
          TextStyle(color: ink, fontSize: 14),
        ),
        hintStyle: const WidgetStatePropertyAll(
          TextStyle(color: muted, fontSize: 14),
        ),
        side: const WidgetStatePropertyAll(BorderSide(color: hairline)),
        shape: WidgetStatePropertyAll(
          RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        ),
      ),
      chipTheme: base.chipTheme.copyWith(
        backgroundColor: surface,
        selectedColor: gold,
        disabledColor: surfaceAlt,
        side: const BorderSide(color: hairline),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(999),
        ),
        labelStyle: const TextStyle(
          color: inkSoft,
          fontSize: 12.5,
          fontWeight: FontWeight.w700,
        ),
        secondaryLabelStyle: const TextStyle(
          color: Color(0xFF2B2110),
          fontSize: 12.5,
          fontWeight: FontWeight.w800,
        ),
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      ),
      segmentedButtonTheme: SegmentedButtonThemeData(
        style: ButtonStyle(
          foregroundColor: WidgetStateProperty.resolveWith((states) {
            return states.contains(WidgetState.selected) ? const Color(0xFF2B2110) : muted;
          }),
          backgroundColor: WidgetStateProperty.resolveWith((states) {
            return states.contains(WidgetState.selected) ? gold : surface;
          }),
          side: const WidgetStatePropertyAll(BorderSide(color: hairline)),
          shape: WidgetStatePropertyAll(
            RoundedRectangleBorder(borderRadius: BorderRadius.circular(999)),
          ),
          textStyle: const WidgetStatePropertyAll(
            TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700),
          ),
        ),
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          minimumSize: const Size(48, 48),
          padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 13),
          backgroundColor: gold,
          foregroundColor: const Color(0xFF2B2110),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
          ),
          textStyle: const TextStyle(fontWeight: FontWeight.w800),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          minimumSize: const Size(48, 46),
          foregroundColor: inkSoft,
          side: const BorderSide(color: hairline),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(14),
          ),
          textStyle: const TextStyle(fontWeight: FontWeight.w700),
        ),
      ),
      iconButtonTheme: IconButtonThemeData(
        style: ButtonStyle(
          foregroundColor: const WidgetStatePropertyAll(ink),
          backgroundColor: const WidgetStatePropertyAll(surface),
          side: const WidgetStatePropertyAll(BorderSide(color: hairline)),
          shape: WidgetStatePropertyAll(
            RoundedRectangleBorder(borderRadius: BorderRadius.circular(radiusSmall)),
          ),
        ),
      ),
      floatingActionButtonTheme: FloatingActionButtonThemeData(
        backgroundColor: clay,
        foregroundColor: Colors.white,
        elevation: 8,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(18),
        ),
      ),
      bottomSheetTheme: const BottomSheetThemeData(
        backgroundColor: surface,
        surfaceTintColor: Colors.transparent,
        showDragHandle: true,
        dragHandleColor: hairlineStrong,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
        ),
      ),
      drawerTheme: const DrawerThemeData(
        backgroundColor: surface,
        surfaceTintColor: Colors.transparent,
        elevation: 2,
      ),
      switchTheme: SwitchThemeData(
        thumbColor: WidgetStateProperty.resolveWith((states) {
          return states.contains(WidgetState.selected) ? Colors.white : muted;
        }),
        trackColor: WidgetStateProperty.resolveWith((states) {
          return states.contains(WidgetState.selected) ? gold : hairlineStrong;
        }),
        trackOutlineColor: const WidgetStatePropertyAll(Colors.transparent),
      ),
      progressIndicatorTheme: const ProgressIndicatorThemeData(
        color: gold,
        linearTrackColor: hairline,
        circularTrackColor: hairline,
      ),
      snackBarTheme: SnackBarThemeData(
        behavior: SnackBarBehavior.floating,
        backgroundColor: ink,
        contentTextStyle: const TextStyle(color: Colors.white),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      ),
      listTileTheme: const ListTileThemeData(
        iconColor: goldDeep,
        textColor: ink,
        subtitleTextStyle: TextStyle(color: muted, fontSize: 11.5),
      ),
    );
  }
}
