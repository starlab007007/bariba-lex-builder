import 'dart:convert';

import 'package:sqflite/sqflite.dart';

import 'dunya_models.dart';

class DunyaLocalStore {
  DunyaLocalStore._();

  static final DunyaLocalStore instance = DunyaLocalStore._();
  Database? _db;

  Future<Database> get database async {
    if (_db != null) return _db!;
    final root = await getDatabasesPath();
    final path = root.endsWith('/') ? '${root}dunya_local.db' : '$root/dunya_local.db';
    _db = await openDatabase(
      path,
      version: 1,
      onConfigure: (db) async {
        await db.execute('PRAGMA foreign_keys = ON');
      },
      onCreate: (db, version) async {
        await db.execute('''
          CREATE TABLE conversations(
            id TEXT PRIMARY KEY,
            title TEXT,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL
          )
        ''');
        await db.execute('''
          CREATE TABLE messages(
            id TEXT PRIMARY KEY,
            conversation_id TEXT NOT NULL,
            role TEXT NOT NULL,
            content TEXT NOT NULL,
            sources_json TEXT NOT NULL DEFAULT '[]',
            created_at INTEGER NOT NULL,
            FOREIGN KEY(conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
          )
        ''');
        await db.execute('''
          CREATE TABLE memories(
            id TEXT PRIMARY KEY,
            memory_type TEXT NOT NULL DEFAULT 'semantic',
            content TEXT NOT NULL,
            provenance TEXT,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL
          )
        ''');
        await db.execute('''
          CREATE TABLE knowledge_packs(
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            version TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'installed',
            manifest_json TEXT,
            installed_at INTEGER NOT NULL
          )
        ''');
        await db.execute('''
          CREATE TABLE knowledge_chunks(
            id TEXT PRIMARY KEY,
            pack_id TEXT NOT NULL,
            source_id TEXT,
            title TEXT,
            content TEXT NOT NULL,
            metadata_json TEXT,
            FOREIGN KEY(pack_id) REFERENCES knowledge_packs(id) ON DELETE CASCADE
          )
        ''');
        await db.execute('''
          CREATE TABLE model_registry(
            id TEXT PRIMARY KEY,
            family TEXT NOT NULL,
            profile TEXT NOT NULL,
            local_path TEXT,
            state TEXT NOT NULL,
            metadata_json TEXT,
            updated_at INTEGER NOT NULL
          )
        ''');
        await db.execute('''
          CREATE TABLE permissions(
            tool_id TEXT PRIMARY KEY,
            state TEXT NOT NULL,
            updated_at INTEGER NOT NULL
          )
        ''');
        await db.execute('''
          CREATE TABLE actions(
            id TEXT PRIMARY KEY,
            tool_id TEXT NOT NULL,
            input_json TEXT,
            status TEXT NOT NULL,
            result_json TEXT,
            created_at INTEGER NOT NULL,
            completed_at INTEGER
          )
        ''');
        await db.execute('''
          CREATE TABLE outbox(
            id TEXT PRIMARY KEY,
            entity_type TEXT NOT NULL,
            entity_id TEXT NOT NULL,
            operation TEXT NOT NULL,
            payload_json TEXT NOT NULL,
            created_at INTEGER NOT NULL,
            synced_at INTEGER
          )
        ''');
        await db.execute('''
          CREATE TABLE audit_events(
            id TEXT PRIMARY KEY,
            event_type TEXT NOT NULL,
            detail_json TEXT,
            created_at INTEGER NOT NULL
          )
        ''');

        final now = DateTime.now().millisecondsSinceEpoch;
        await db.insert('knowledge_packs', {
          'id': 'fitila-core',
          'name': 'DUNYA FITILA Core',
          'version': '1',
          'status': 'installed',
          'manifest_json': jsonEncode({
            'sources': ['dictionary', 'apprendre', 'scenes'],
            'offline': true,
          }),
          'installed_at': now,
        });
        await db.insert('model_registry', {
          'id': 'dunya-fallback',
          'family': 'deterministic-rag',
          'profile': 'fallback',
          'local_path': null,
          'state': 'ready',
          'metadata_json': jsonEncode({
            'description': 'Recherche locale déterministe FITILA',
            'network_required': false,
          }),
          'updated_at': now,
        });
      },
    );
    return _db!;
  }

  Future<String> ensureConversation() async {
    final db = await database;
    final rows = await db.query('conversations', orderBy: 'updated_at DESC', limit: 1);
    if (rows.isNotEmpty) return rows.first['id']!.toString();
    final id = 'local-main';
    final now = DateTime.now().millisecondsSinceEpoch;
    await db.insert('conversations', {
      'id': id,
      'title': 'DUNYA',
      'created_at': now,
      'updated_at': now,
    });
    return id;
  }

  Future<List<DunyaMessage>> loadMessages() async {
    final db = await database;
    final conversationId = await ensureConversation();
    final rows = await db.query(
      'messages',
      where: 'conversation_id = ?',
      whereArgs: [conversationId],
      orderBy: 'created_at ASC',
      limit: 300,
    );
    return [
      for (final row in rows)
        DunyaMessage(
          role: row['role']!.toString(),
          content: row['content']!.toString(),
          sources: _decodeSources(row['sources_json']?.toString()),
        ),
    ];
  }

  Future<void> appendMessage(DunyaMessage message) async {
    final db = await database;
    final conversationId = await ensureConversation();
    final now = DateTime.now().microsecondsSinceEpoch;
    await db.insert('messages', {
      'id': 'msg-$now',
      'conversation_id': conversationId,
      'role': message.role,
      'content': message.content,
      'sources_json': jsonEncode([
        for (final source in message.sources)
          {'title': source.title, 'text': source.text},
      ]),
      'created_at': now,
    });
    await db.update(
      'conversations',
      {'updated_at': DateTime.now().millisecondsSinceEpoch},
      where: 'id = ?',
      whereArgs: [conversationId],
    );
  }

  Future<List<String>> loadMemories() async {
    final db = await database;
    final rows = await db.query('memories', orderBy: 'updated_at DESC', limit: 100);
    return rows.map((row) => row['content']!.toString()).toList(growable: false);
  }

  Future<void> saveMemory(String content, {String provenance = 'assistant'}) async {
    final db = await database;
    final now = DateTime.now().microsecondsSinceEpoch;
    final existing = await db.query('memories', where: 'content = ?', whereArgs: [content], limit: 1);
    if (existing.isNotEmpty) return;
    await db.insert('memories', {
      'id': 'mem-$now',
      'memory_type': 'semantic',
      'content': content,
      'provenance': provenance,
      'created_at': now,
      'updated_at': now,
    });
  }

  Future<Map<String, int>> stats() async {
    final db = await database;
    Future<int> count(String table) async {
      final rows = await db.rawQuery('SELECT COUNT(*) AS n FROM $table');
      return (rows.first['n'] as int?) ?? 0;
    }
    return {
      'messages': await count('messages'),
      'memories': await count('memories'),
      'packs': await count('knowledge_packs'),
      'models': await count('model_registry'),
      'outbox': await count('outbox'),
    };
  }

  Future<void> audit(String eventType, Map<String, dynamic> detail) async {
    final db = await database;
    final now = DateTime.now().microsecondsSinceEpoch;
    await db.insert('audit_events', {
      'id': 'audit-$now',
      'event_type': eventType,
      'detail_json': jsonEncode(detail),
      'created_at': now,
    });
  }

  List<DunyaSource> _decodeSources(String? raw) {
    if (raw == null || raw.isEmpty) return const [];
    try {
      final decoded = jsonDecode(raw);
      if (decoded is! List) return const [];
      return [
        for (final item in decoded)
          if (item is Map)
            DunyaSource(
              title: (item['title'] ?? 'FITILA').toString(),
              text: (item['text'] ?? '').toString(),
            ),
      ];
    } catch (_) {
      return const [];
    }
  }
}
