/// FITILA ByT5 translator running on the phone (pack `dunya-translate-byt5`).
///
/// When the pack is installed it becomes DunyaTranslator.offline, so the
/// Baatɔnum mode works without any network.
library;

import 'dart:convert';
import 'dart:io';
import 'dart:math' as math;

import 'package:flutter/services.dart';
import 'package:path_provider/path_provider.dart';

import 'dunya_translator.dart';

const dunyaByt5PackId = 'dunya-translate-byt5';

class DunyaByt5 {
  DunyaByt5._();

  static final instance = DunyaByt5._();
  static const _channel = MethodChannel('fitila/dunya_byt5');

  bool _loaded = false;
  Future<void>? _loading;
  Map<String, dynamic> _config = const {};

  /// Registers the offline engine when the pack is present. Safe to call often.
  Future<bool> activateIfInstalled() async {
    try {
      final base = await getApplicationSupportDirectory();
      final dir = '${base.path}/dunya_packs/$dunyaByt5PackId/byt5';
      final enc = File('$dir/encoder.onnx');
      final dec = File('$dir/decoder.onnx');
      if (!enc.existsSync() || !dec.existsSync()) {
        DunyaTranslator.offline = null;
        return false;
      }
      final cfgFile = File('$dir/config.json');
      _config = cfgFile.existsSync() ? (jsonDecode(cfgFile.readAsStringSync()) as Map<String, dynamic>) : const {};
      DunyaTranslator.offline = (text, toBariba) => _translate(enc.path, dec.path, text, toBariba);
      return true;
    } catch (_) {
      DunyaTranslator.offline = null;
      return false;
    }
  }

  Future<String?> _translate(String encoder, String decoder, String text, bool toBariba) async {
    await (_loading ??= _load(encoder, decoder));
    if (!_loaded) return null;
    final prefix = (toBariba ? _config['prefix_fr_ba'] : _config['prefix_ba_fr'])?.toString() ?? '';
    final out = await _channel.invokeMethod<String>('translate', {'text': text, 'prefix': prefix, 'maxLen': 0});
    return out?.trim().isEmpty ?? true ? null : out!.trim();
  }

  Future<void> _load(String encoder, String decoder) async {
    try {
      await _channel.invokeMethod('load', {
        'encoder': encoder,
        'decoder': decoder,
        'threads': math.max(1, math.min(4, Platform.numberOfProcessors - 1)),
      });
      _loaded = true;
    } catch (_) {
      _loaded = false;
      _loading = null;
    }
  }
}
