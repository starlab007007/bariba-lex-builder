/// Online French dictation uses Android's French recognizer, never a Baatɔnum
/// fallback. Offline DUNYA continues using its installed Omnilingual model.
library;

import 'dart:async';
import 'package:flutter/services.dart';

class DunyaFrenchSpeech {
  static const _channel = MethodChannel('fitila/french_speech');
  void Function(String)? _partial;
  void Function(double)? _level;

  Future<bool> available() async {
    try {
      return await _channel.invokeMethod<bool>('available') ?? false;
    } on PlatformException {
      return false;
    } on MissingPluginException {
      return false;
    }
  }

  Future<String> listen({void Function(String)? onPartial, void Function(double)? onLevel}) async {
    _partial = onPartial;
    _level = onLevel;
    _channel.setMethodCallHandler((call) async {
      if (call.method == 'partial' && call.arguments is String) {
        _partial?.call(call.arguments as String);
      } else if (call.method == 'level' && call.arguments is num) {
        _level?.call((call.arguments as num).toDouble().clamp(0.0, 1.0).toDouble());
      }
    });
    try {
      return (await _channel.invokeMethod<String>('listen', {'locale': 'fr-FR'})
          .timeout(const Duration(seconds: 30)))?.trim() ?? '';
    } on TimeoutException {
      await cancel();
      return '';
    } finally {
      _partial = null;
      _level = null;
    }
  }

  Future<void> stop() async {
    try { await _channel.invokeMethod<void>('stop'); } on PlatformException { /* Already stopped. */ }
    on MissingPluginException { /* Other platforms retain their local engine. */ }
  }

  Future<void> cancel() async {
    try { await _channel.invokeMethod<void>('cancel'); } on PlatformException { /* Already stopped. */ }
    on MissingPluginException { /* Other platforms retain their local engine. */ }
    _partial = null;
    _level = null;
  }
}
