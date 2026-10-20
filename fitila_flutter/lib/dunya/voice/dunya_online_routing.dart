/// Shared language routing for DUNYA online requests.
/// French and Baatɔnum modes are strict; bilingual mode follows the input.
library;

import 'dunya_settings.dart';

String dunyaOnlineLanguage(DunyaLanguageMode mode, String detected) =>
    switch (mode) {
      DunyaLanguageMode.french => 'fr',
      DunyaLanguageMode.bariba => 'bba',
      DunyaLanguageMode.bilingual => detected == 'fr' ? 'fr' : 'bba',
    };

/// Never pass unverified Baatɔnum turns to the French-only reasoning engine.
/// Keep only French conversations until certified bilingual history is stored.
List<Map<String, String>> dunyaFrenchReasoningHistory(
  DunyaLanguageMode mode,
  List<Map<String, String>> turns,
) {
  if (mode != DunyaLanguageMode.french) return const [];
  return [
    for (final turn in turns.reversed.take(8).toList().reversed)
      if ((turn['role'] == 'user' || turn['role'] == 'assistant') &&
          (turn['content'] ?? '').trim().isNotEmpty)
        {'role': turn['role']!, 'content': turn['content']!.trim()},
  ];
}
