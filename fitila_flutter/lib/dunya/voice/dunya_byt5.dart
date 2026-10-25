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
import 'dunya_settings.dart';
import 'dunya_byt5_policy.dart';

const dunyaByt5PackId = 'dunya-translate-byt5';

class DunyaByt5 {
  DunyaByt5._();

  static final instance = DunyaByt5._();
  static const _channel = MethodChannel('fitila/dunya_byt5');

  bool _loaded = false;
  Future<void>? _loading;
  Map<String, dynamic> _config = const {};
  Map<String, dynamic> _manifest = const {};

  /// Registers the offline engine when the pack is present. Safe to call often.
  Future<bool> activateIfInstalled() async {
    try {
      await DunyaSettings.instance.load();
      DunyaTranslator.clearCache();
      final base = await getApplicationSupportDirectory();
      final dir = '${base.path}/dunya_packs/$dunyaByt5PackId/byt5';
      // The pack is active in BETA ("tested": false = test mode, results are labelled and
      // must be double-checked) or certified ("tested": true). A manifest that does not declare
      // its status is refused. The importer verifies file hashes.
      final manifestFile = File('${base.path}/dunya_packs/$dunyaByt5PackId/manifest.json');
      if (!manifestFile.existsSync()) {
        DunyaTranslator.offline = null;
        return false;
      }
      final manifest = jsonDecode(await manifestFile.readAsString()) as Map<String, dynamic>;
      _manifest = manifest;
      if (!mayUseByt5Manifest(manifest,
          experimentalConsent: DunyaSettings.instance.experimentalTranslation)) {
        DunyaTranslator.offline = null;
        return false;
      }
      final enc = File('$dir/encoder.onnx');
      final dec = File('$dir/decoder.onnx');
      if (!enc.existsSync() || !dec.existsSync()) {
        _loaded = false;
        _loading = null;
        DunyaTranslator.offline = null;
        return false;
      }
      final cfgFile = File('$dir/config.json');
      _config = cfgFile.existsSync() ? (jsonDecode(cfgFile.readAsStringSync()) as Map<String, dynamic>) : const {};
      if (_config['format'] != 'fitila-byt5-mobile/1' ||
          _config['tokenizer'] != 'byt5-bytes-plus-3') {
        DunyaTranslator.offline = null;
        return false;
      }
      // The pack may have been replaced by a newer verified version.
      _loaded = false;
      _loading = null;
      DunyaTranslator.offline = (text, toBariba) => _translate(enc.path, dec.path, text, toBariba);
      return true;
    } catch (_) {
      DunyaTranslator.offline = null;
      return false;
    }
  }

  Future<String?> _translate(String encoder, String decoder, String text, bool toBariba) async {
    if (!mayUseByt5Manifest(_manifest,
        experimentalConsent: DunyaSettings.instance.experimentalTranslation)) return null;
    await (_loading ??= _load(encoder, decoder));
    if (!_loaded) return null;
    final prefix = (toBariba ? _config['prefix_fr_ba'] : _config['prefix_ba_fr'])?.toString()
        ?? (toBariba ? 'fr-ba: ' : 'ba-fr: ');
    final out = await _channel.invokeMethod<String>('translate', {'text': text, 'prefix': prefix, 'direction': toBariba ? 'fr-ba' : 'ba-fr', 'beamWidth': toBariba ? 2 : 1, 'maxLen': 0});
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
