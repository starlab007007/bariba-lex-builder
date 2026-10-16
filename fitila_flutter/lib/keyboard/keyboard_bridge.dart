import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';

/// Activation state of the system Bariba keyboard.
@immutable
class KeyboardStatus {
  const KeyboardStatus({
    required this.enabled,
    required this.selected,
    this.fullAccess = false,
    this.platform = 'unknown',
    this.supported = true,
  });

  /// Keyboard is added in system settings.
  final bool enabled;

  /// Android: currently the default IME. iOS: always false (iOS exposes no API).
  final bool selected;

  /// iOS only: "Allow Full Access" granted (needed for online translation).
  final bool fullAccess;
  final String platform;

  /// False on web/desktop/tests where no native channel exists.
  final bool supported;

  static const unsupported = KeyboardStatus(
    enabled: false,
    selected: false,
    supported: false,
  );

  bool get isAndroid => platform == 'android';
  bool get isIos => platform == 'ios';

  /// Ready to use everywhere.
  bool get isReady => supported && enabled && (isIos || selected);

  factory KeyboardStatus.fromMap(Map<dynamic, dynamic>? map) {
    if (map == null) {
      return unsupported;
    }
    return KeyboardStatus(
      enabled: map['enabled'] == true,
      selected: map['selected'] == true,
      fullAccess: map['fullAccess'] == true,
      platform: (map['platform'] as String?) ?? 'unknown',
    );
  }

  @override
  bool operator ==(Object other) =>
      other is KeyboardStatus &&
      other.enabled == enabled &&
      other.selected == selected &&
      other.fullAccess == fullAccess &&
      other.platform == platform &&
      other.supported == supported;

  @override
  int get hashCode =>
      Object.hash(enabled, selected, fullAccess, platform, supported);
}

/// Flutter side of the `fitila/keyboard` channels shared with the Android IME
/// (`KeyboardChannel.kt`) and the iOS extension (`KeyboardChannel.swift`).
class KeyboardBridge {
  KeyboardBridge({MethodChannel? method, EventChannel? events})
    : _method = method ?? const MethodChannel(methodChannelName),
      _events = events ?? const EventChannel(eventChannelName);

  static const methodChannelName = 'fitila/keyboard';
  static const eventChannelName = 'fitila/keyboard/status';

  static final KeyboardBridge instance = KeyboardBridge();

  final MethodChannel _method;
  final EventChannel _events;

  Future<KeyboardStatus> status() async {
    try {
      return KeyboardStatus.fromMap(
        await _method.invokeMapMethod<String, dynamic>('getKeyboardStatus'),
      );
    } on MissingPluginException {
      return KeyboardStatus.unsupported;
    } on PlatformException {
      return KeyboardStatus.unsupported;
    }
  }

  /// Emits the current status then every change (Android ContentObserver).
  /// Platforms without the event channel yield an empty stream.
  Stream<KeyboardStatus> statusChanges() async* {
    try {
      await for (final event in _events.receiveBroadcastStream()) {
        yield KeyboardStatus.fromMap(event as Map?);
      }
    } on MissingPluginException {
      return;
    } on PlatformException {
      return;
    }
  }

  /// Android: keyboards list. iOS: this app's page in Settings (Keyboards).
  /// Returns false if the OS refused.
  Future<bool> openSystemSettings() => _invokeBool('openInputMethodSettings');

  /// Android only: the system "choose keyboard" dialog.
  Future<bool> showPicker() => _invokeBool('showInputMethodPicker');

  /// Shares the Supabase endpoint/key with the native keyboards so they can
  /// translate online; they stay fully functional offline without it.
  Future<void> syncConfig({
    required String supabaseUrl,
    required String anonKey,
  }) async {
    try {
      await _method.invokeMethod<void>('syncConfig', {
        'supabaseUrl': supabaseUrl,
        'anonKey': anonKey,
      });
    } on MissingPluginException {
      // No native side (tests / desktop).
    } on PlatformException {
      // Non-fatal.
    }
  }

  Future<bool> _invokeBool(String method) async {
    try {
      await _method.invokeMethod<void>(method);
      return true;
    } on MissingPluginException {
      return false;
    } on PlatformException {
      return false;
    }
  }
}
