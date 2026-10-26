// System-managed downloads into public Downloads/FITILA.
///
// Android DownloadManager continues transfers independently of the Flutter
// activity. Public files survive ordinary app uninstallation, but do not
// constitute a hidden app cache: users can delete them and FITILA must
// explicitly reimport and validate them. A new install cannot assume access
// to prior app-private metadata.
import 'package:flutter/services.dart';

class PersistentPackDownload {
  PersistentPackDownload._();
  static const MethodChannel _channel = MethodChannel('fitila/persistent_packs');

  static Future<int> enqueue({required String url, required String filename}) async {
    final id = await _channel.invokeMethod<int>('enqueue', {'url': url, 'filename': filename});
    if (id == null) throw StateError('Téléchargement Android indisponible');
    return id;
  }

  static Future<Map<String, Object?>?> status(int id) async {
    final value = await _channel.invokeMapMethod<String, Object?>('status', {'id': id});
    return value == null ? null : Map<String, Object?>.from(value);
  }

  static Future<void> cancel(int id) async {
    await _channel.invokeMethod<void>('cancel', {'id': id});
  }
}
