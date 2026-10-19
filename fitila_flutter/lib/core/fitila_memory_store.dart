import 'dart:convert';
import 'package:crypto/crypto.dart';
import 'package:http/http.dart' as http;
import 'package:path_provider/path_provider.dart';
import 'package:sqflite/sqflite.dart';

/// FITILA bilingual memory: deliberately no provenance in user-facing strings.
/// Download only on user-approved network access; once installed all lookups are local.
class FitilaMemoryStore {
  FitilaMemoryStore({http.Client? client}) : _client = client ?? http.Client();
  final http.Client _client;
  static const base = 'https://dvswhjawiooprghzeyol.supabase.co/functions/v1/fitila-memory-pack';
  Database? _db;

  Future<Database> get database async {
    if (_db != null) return _db!;
    final dir = await getApplicationSupportDirectory();
    _db = await openDatabase('${dir.path}/fitila_memory_v1.sqlite', version: 1,
      onCreate: (db, _) async {
        await db.execute('CREATE TABLE entries(id TEXT PRIMARY KEY, fr TEXT NOT NULL, ba TEXT NOT NULL, grade TEXT NOT NULL, fr_key TEXT NOT NULL, ba_key TEXT NOT NULL)');
        await db.execute('CREATE INDEX idx_entries_fr ON entries(fr_key)');
        await db.execute('CREATE INDEX idx_entries_ba ON entries(ba_key)');
        await db.execute('CREATE TABLE metadata(key TEXT PRIMARY KEY, value TEXT NOT NULL)');
      });
    return _db!;
  }

  String _key(String text) => text.trim().toLowerCase().replaceAll(RegExp(r'\\s+'), ' ');
  Future<String?> translate(String text, {required bool frenchToBariba}) async {
    final db = await database;
    final matches = await db.query('entries', columns: [frenchToBariba ? 'ba' : 'fr'],
      where: frenchToBariba ? 'fr_key = ?' : 'ba_key = ?', whereArgs: [_key(text)], limit: 1);
    if (matches.isEmpty) return null;
    return matches.first[frenchToBariba ? 'ba' : 'fr'] as String;
  }

  Future<String?> installedVersion() async {
    final rows = await (await database).query('metadata', columns: ['value'], where: 'key = ?', whereArgs: ['version'], limit: 1);
    return rows.isEmpty ? null : rows.first['value'] as String;
  }

  /// Verifies the exact UTF-8 pack bytes against the server manifest before any DB changes.
  /// The transaction preserves the previous memory if verification or import fails.
  Future<int> synchronize() async {
    final manifestResponse = await _client.get(Uri.parse('$base/manifest')).timeout(const Duration(seconds: 20));
    if (manifestResponse.statusCode != 200) throw StateError('Manifeste mémoire indisponible');
    final manifest = jsonDecode(utf8.decode(manifestResponse.bodyBytes)) as Map<String, dynamic>;
    if (manifest['schema'] != 'fitila-memory-manifest-v1' || manifest['version'] is! String ||
        manifest['sha256'] is! String || manifest['record_count'] is! int) {
      throw const FormatException('Manifeste invalide');
    }
    if (await installedVersion() == manifest['version']) {
      final current = await (await database).query('metadata', columns: ['value'], where: 'key = ?', whereArgs: ['sha256'], limit: 1);
      if (current.isNotEmpty && current.first['value'] == manifest['sha256']) return 0;
    }
    final response = await _client.get(Uri.parse('$base/pack')).timeout(const Duration(seconds: 45));
    if (response.statusCode != 200) throw StateError('Pack mémoire indisponible');
    final hash = sha256.convert(response.bodyBytes).toString();
    if (hash != manifest['sha256']) throw const FormatException('Empreinte mémoire incorrecte');
    final payload = jsonDecode(utf8.decode(response.bodyBytes)) as Map<String, dynamic>;
    if (payload['schema'] != 'fitila-memory-pack-v1' || payload['version'] != manifest['version']) {
      throw const FormatException('Version mémoire incohérente');
    }
    final items = payload['records'];
    if (items is! List || items.length != manifest['record_count']) {
      throw const FormatException('Nombre d’entrées incohérent');
    }
    final db = await database;
    await db.transaction((txn) async {
      await txn.delete('entries');
      final batch = txn.batch();
      for (final item in items) {
        if (item is! Map || item['id'] is! String || item['fr'] is! String ||
            item['ba'] is! String || item['grade'] is! String) throw const FormatException('Entrée invalide');
        final fr = item['fr'] as String, ba = item['ba'] as String;
        batch.insert('entries', {'id': item['id'], 'fr': fr, 'ba': ba,
          'grade': item['grade'], 'fr_key': _key(fr), 'ba_key': _key(ba)});
      }
      await batch.commit(noResult: true);
      await txn.insert('metadata', {'key': 'version', 'value': manifest['version']},
        conflictAlgorithm: ConflictAlgorithm.replace);
      await txn.insert('metadata', {'key': 'sha256', 'value': hash},
        conflictAlgorithm: ConflictAlgorithm.replace);
    });
    return items.length;
  }

  Future<void> close() async { await _db?.close(); _db = null; _client.close(); }
}
