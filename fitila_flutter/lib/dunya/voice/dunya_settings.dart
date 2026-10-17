/// DUNYA user settings: language mode, conversation style, intelligence level.
library;

import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Strictly separated conversation languages.
enum DunyaLanguageMode { french, bariba, bilingual }

extension DunyaLanguageModeX on DunyaLanguageMode {
  String get key => switch (this) {
        DunyaLanguageMode.french => 'fr',
        DunyaLanguageMode.bariba => 'bba',
        DunyaLanguageMode.bilingual => 'both',
      };

  String get label => switch (this) {
        DunyaLanguageMode.french => 'Français',
        DunyaLanguageMode.bariba => 'Baatɔnum',
        DunyaLanguageMode.bilingual => 'Les deux',
      };

  /// Separate history per mode so languages never contaminate each other.
  String get conversationId => 'dunya-$key';

  static DunyaLanguageMode parse(String? value) => switch (value) {
        'bba' => DunyaLanguageMode.bariba,
        'both' => DunyaLanguageMode.bilingual,
        _ => DunyaLanguageMode.french,
      };
}

/// Essentiel = deterministic skills only; Malin = Gemma on the phone.
enum DunyaIntelligence { essential, smart }

enum DunyaExecutionMode { automatic, online, offline }
extension DunyaExecutionModeX on DunyaExecutionMode {
  String get key => switch (this) {
    DunyaExecutionMode.automatic => 'auto',
    DunyaExecutionMode.online => 'online',
    DunyaExecutionMode.offline => 'offline',
  };
  String get label => switch (this) {
    DunyaExecutionMode.automatic => 'Auto',
    DunyaExecutionMode.online => 'En ligne',
    DunyaExecutionMode.offline => 'Hors ligne',
  };
  static DunyaExecutionMode parse(String? key) => switch (key) {
    'online' => DunyaExecutionMode.online,
    'offline' => DunyaExecutionMode.offline,
    _ => DunyaExecutionMode.automatic,
  };
}

class DunyaSettings extends ChangeNotifier {
  DunyaSettings._();

  static final instance = DunyaSettings._();

  static const _kMode = 'dunya_language_mode';
  static const _kOnboarded = 'dunya_onboarded_v2';
  static const _kHandsFree = 'dunya_hands_free';
  static const _kSubtitles = 'dunya_subtitles';
  static const _kIntelligence = 'dunya_intelligence';
  static const _kSpeed = 'dunya_voice_speed';
  static const _kExecution = 'dunya_execution_mode';
  static const _kFrenchSubtitlesInBariba = 'dunya_bba_fr_subtitles';

  DunyaLanguageMode mode = DunyaLanguageMode.french;
  bool onboarded = false;
  bool handsFree = true;
  bool subtitles = true;
  bool frenchSubtitlesInBariba = false;
  DunyaIntelligence intelligence = DunyaIntelligence.smart;
  DunyaExecutionMode execution = DunyaExecutionMode.automatic;
  double voiceSpeed = 1.0;
  bool _loaded = false;

  Future<void> load() async {
    if (_loaded) return;
    try {
      final p = await SharedPreferences.getInstance();
      mode = DunyaLanguageModeX.parse(p.getString(_kMode) ?? p.getString('dunya_reply_language'));
      onboarded = p.getBool(_kOnboarded) ?? false;
      handsFree = p.getBool(_kHandsFree) ?? true;
      subtitles = p.getBool(_kSubtitles) ?? true;
      frenchSubtitlesInBariba = p.getBool(_kFrenchSubtitlesInBariba) ?? false;
      intelligence = (p.getString(_kIntelligence) ?? 'smart') == 'essential'
          ? DunyaIntelligence.essential
          : DunyaIntelligence.smart;
      voiceSpeed = p.getDouble(_kSpeed) ?? 1.0;
      execution = DunyaExecutionModeX.parse(p.getString(_kExecution));
    } catch (_) {}
    _loaded = true;
    notifyListeners();
  }

  Future<void> update({
    DunyaLanguageMode? mode,
    bool? onboarded,
    bool? handsFree,
    bool? subtitles,
    bool? frenchSubtitlesInBariba,
    DunyaIntelligence? intelligence,
    DunyaExecutionMode? execution,
    double? voiceSpeed,
  }) async {
    if (mode != null) this.mode = mode;
    if (onboarded != null) this.onboarded = onboarded;
    if (handsFree != null) this.handsFree = handsFree;
    if (subtitles != null) this.subtitles = subtitles;
    if (frenchSubtitlesInBariba != null) this.frenchSubtitlesInBariba = frenchSubtitlesInBariba;
    if (intelligence != null) this.intelligence = intelligence;
    if (execution != null) this.execution = execution;
    if (voiceSpeed != null) this.voiceSpeed = voiceSpeed;
    notifyListeners();
    try {
      final p = await SharedPreferences.getInstance();
      await p.setString(_kMode, this.mode.key);
      await p.setBool(_kOnboarded, this.onboarded);
      await p.setBool(_kHandsFree, this.handsFree);
      await p.setBool(_kSubtitles, this.subtitles);
      await p.setBool(_kFrenchSubtitlesInBariba, this.frenchSubtitlesInBariba);
      await p.setString(_kIntelligence, this.intelligence == DunyaIntelligence.essential ? 'essential' : 'smart');
      await p.setDouble(_kSpeed, this.voiceSpeed);
      await p.setString(_kExecution, this.execution.key);
    } catch (_) {}
  }
}
