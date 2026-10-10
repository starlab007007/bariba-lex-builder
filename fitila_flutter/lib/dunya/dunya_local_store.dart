import 'dart:convert';

import 'package:crypto/crypto.dart';

import 'package:sqflite/sqflite.dart';

import 'dunya_models.dart';

class DunyaLocalStore {
  DunyaLocalStore._();

  static final DunyaLocalStore instance = DunyaLocalStore._();
  static const _profileId = 'local-default';
  static const _conversationId = 'local-main';
  Database? _db;

  Future<Database> get database async {
    if (_db != null) return _db!;
    final root = await getDatabasesPath();
    final path = root.endsWith('/') ? '${root}dunya_local.db' : '$root/dunya_local.db';
    _db = await openDatabase(
      path,
      version: 1,
      onConfigure: (db) async => db.execute('PRAGMA foreign_keys = ON'),
      onCreate: (db, version) async {
        await db.execute('''
          CREATE TABLE dunya_profiles (
            id TEXT PRIMARY KEY,
            remote_user_id TEXT,
            display_name TEXT,
            preferred_language TEXT NOT NULL DEFAULT 'fr',
            privacy_mode TEXT NOT NULL DEFAULT 'local',
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
          )
        ''');

        await db.execute('''
          CREATE TABLE dunya_conversations (
            id TEXT PRIMARY KEY,
            profile_id TEXT NOT NULL REFERENCES dunya_profiles(id),
            title TEXT,
            status TEXT NOT NULL DEFAULT 'active',
            language TEXT DEFAULT 'fr',
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            deleted_at TEXT
          )
        ''');

        await db.execute('''
          CREATE TABLE dunya_messages (
            id TEXT PRIMARY KEY,
            conversation_id TEXT NOT NULL REFERENCES dunya_conversations(id) ON DELETE CASCADE,
            role TEXT NOT NULL CHECK (role IN ('system','user','assistant','tool')),
            content TEXT NOT NULL,
            content_type TEXT NOT NULL DEFAULT 'text',
            model_id TEXT,
            status TEXT NOT NULL DEFAULT 'completed',
            metadata_json TEXT NOT NULL DEFAULT '{}',
            created_at TEXT NOT NULL,
            deleted_at TEXT
          )
        ''');
        await db.execute('CREATE INDEX idx_dunya_messages_conversation ON dunya_messages(conversation_id,created_at)');

        await db.execute('''
          CREATE TABLE dunya_attachments (
            id TEXT PRIMARY KEY,
            message_id TEXT REFERENCES dunya_messages(id) ON DELETE CASCADE,
            kind TEXT NOT NULL,
            local_uri TEXT NOT NULL,
            mime_type TEXT NOT NULL,
            sha256 TEXT NOT NULL,
            size_bytes INTEGER NOT NULL,
            duration_ms INTEGER,
            created_at TEXT NOT NULL
          )
        ''');

        await db.execute('''
          CREATE TABLE dunya_memories (
            id TEXT PRIMARY KEY,
            profile_id TEXT NOT NULL REFERENCES dunya_profiles(id),
            memory_type TEXT NOT NULL,
            content TEXT NOT NULL,
            source_message_id TEXT,
            consent_status TEXT NOT NULL DEFAULT 'pending',
            sensitivity TEXT NOT NULL DEFAULT 'normal',
            expires_at TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            deleted_at TEXT
          )
        ''');

        await db.execute('''
          CREATE TABLE dunya_knowledge_packs (
            id TEXT PRIMARY KEY,
            code TEXT NOT NULL,
            version TEXT NOT NULL,
            title TEXT NOT NULL,
            language TEXT,
            publisher TEXT,
            manifest_hash TEXT NOT NULL,
            signature_status TEXT NOT NULL DEFAULT 'unverified',
            install_status TEXT NOT NULL DEFAULT 'pending',
            installed_at TEXT,
            UNIQUE(code,version)
          )
        ''');

        await db.execute('''
          CREATE TABLE dunya_knowledge_items (
            id TEXT PRIMARY KEY,
            pack_id TEXT NOT NULL REFERENCES dunya_knowledge_packs(id),
            title TEXT NOT NULL,
            kind TEXT NOT NULL,
            language TEXT,
            source_ref TEXT,
            license TEXT,
            validation_status TEXT NOT NULL DEFAULT 'pending',
            content_hash TEXT NOT NULL,
            created_at TEXT NOT NULL
          )
        ''');

        await db.execute('''
          CREATE TABLE dunya_knowledge_chunks (
            id TEXT PRIMARY KEY,
            item_id TEXT NOT NULL REFERENCES dunya_knowledge_items(id) ON DELETE CASCADE,
            ordinal INTEGER NOT NULL,
            content TEXT NOT NULL,
            start_offset INTEGER,
            end_offset INTEGER,
            token_count INTEGER,
            UNIQUE(item_id,ordinal)
          )
        ''');

        await db.execute('''
          CREATE VIRTUAL TABLE dunya_chunks_fts USING fts5(
            chunk_id UNINDEXED,
            content,
            tokenize='unicode61'
          )
        ''');

        await db.execute('''
          CREATE TABLE dunya_embeddings (
            chunk_id TEXT NOT NULL REFERENCES dunya_knowledge_chunks(id) ON DELETE CASCADE,
            embedding_model_id TEXT NOT NULL,
            dimension INTEGER NOT NULL,
            vector_blob BLOB NOT NULL,
            vector_norm REAL,
            PRIMARY KEY(chunk_id,embedding_model_id)
          )
        ''');

        await db.execute('''
          CREATE TABLE dunya_message_sources (
            message_id TEXT NOT NULL REFERENCES dunya_messages(id) ON DELETE CASCADE,
            chunk_id TEXT NOT NULL REFERENCES dunya_knowledge_chunks(id),
            relevance_score REAL,
            PRIMARY KEY(message_id,chunk_id)
          )
        ''');

        await db.execute('''
          CREATE TABLE dunya_ai_models (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            version TEXT NOT NULL,
            runtime TEXT NOT NULL,
            model_type TEXT NOT NULL,
            min_ram_mb INTEGER,
            artifact_sha256 TEXT NOT NULL,
            license_id TEXT,
            metadata_json TEXT NOT NULL DEFAULT '{}'
          )
        ''');

        await db.execute('''
          CREATE TABLE dunya_model_installations (
            id TEXT PRIMARY KEY,
            model_id TEXT NOT NULL REFERENCES dunya_ai_models(id),
            local_uri TEXT NOT NULL,
            status TEXT NOT NULL,
            installed_at TEXT,
            last_verified_at TEXT
          )
        ''');

        await db.execute('''
          CREATE TABLE dunya_action_permissions (
            profile_id TEXT NOT NULL REFERENCES dunya_profiles(id),
            tool_name TEXT NOT NULL,
            grant_status TEXT NOT NULL DEFAULT 'denied',
            updated_at TEXT NOT NULL,
            PRIMARY KEY(profile_id,tool_name)
          )
        ''');

        await db.execute('''
          CREATE TABLE dunya_action_runs (
            id TEXT PRIMARY KEY,
            profile_id TEXT NOT NULL REFERENCES dunya_profiles(id),
            conversation_id TEXT REFERENCES dunya_conversations(id),
            tool_name TEXT NOT NULL,
            arguments_json TEXT NOT NULL,
            status TEXT NOT NULL,
            result_json TEXT,
            requires_confirmation INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL
          )
        ''');

        await db.execute('''
          CREATE TABLE dunya_sync_outbox (
            id TEXT PRIMARY KEY,
            profile_id TEXT NOT NULL REFERENCES dunya_profiles(id),
            entity_type TEXT NOT NULL,
            entity_id TEXT NOT NULL,
            operation TEXT NOT NULL,
            payload_json TEXT NOT NULL,
            idempotency_key TEXT NOT NULL UNIQUE,
            state TEXT NOT NULL DEFAULT 'pending',
            attempts INTEGER NOT NULL DEFAULT 0,
            next_attempt_at TEXT,
            created_at TEXT NOT NULL
          )
        ''');
        await db.execute('CREATE INDEX idx_dunya_outbox_state ON dunya_sync_outbox(state,next_attempt_at)');

        await db.execute('''
          CREATE TABLE dunya_sync_state (
            profile_id TEXT NOT NULL REFERENCES dunya_profiles(id),
            collection_name TEXT NOT NULL,
            cursor_value TEXT,
            last_sync_at TEXT,
            PRIMARY KEY(profile_id,collection_name)
          )
        ''');

        await db.execute('''
          CREATE TABLE dunya_audit_events (
            id TEXT PRIMARY KEY,
            profile_id TEXT,
            event_type TEXT NOT NULL,
            severity TEXT NOT NULL DEFAULT 'info',
            details_json TEXT NOT NULL DEFAULT '{}',
            created_at TEXT NOT NULL
          )
        ''');

        final now = DateTime.now().toUtc().toIso8601String();
        await db.insert('dunya_profiles', {
          'id': _profileId,
          'display_name': 'Profil local',
          'preferred_language': 'fr',
          'privacy_mode': 'local',
          'created_at': now,
          'updated_at': now,
        });
        await db.insert('dunya_conversations', {
          'id': _conversationId,
          'profile_id': _profileId,
          'title': 'DUNYA',
          'status': 'active',
          'language': 'fr',
          'created_at': now,
          'updated_at': now,
        });
        await db.insert('dunya_knowledge_packs', {
          'id': 'fitila-core',
          'code': 'fitila-core',
          'version': '1.0.0',
          'title': 'DUNYA FITILA Core',
          'language': 'bba,fr',
          'publisher': 'FITILA',
          'manifest_hash': 'embedded-build-resource',
          'signature_status': 'embedded',
          'install_status': 'installed',
          'installed_at': now,
        });
        await db.insert('dunya_ai_models', {
          'id': 'dunya-fallback',
          'name': 'DUNYA Fallback',
          'version': '1',
          'runtime': 'deterministic-rag',
          'model_type': 'retrieval',
          'min_ram_mb': 0,
          'artifact_sha256': 'embedded',
          'metadata_json': jsonEncode({
            'network_required': false,
            'description': 'Recherche locale FITILA sans LLM',
          }),
        });
        await db.insert('dunya_model_installations', {
          'id': 'dunya-fallback-local',
          'model_id': 'dunya-fallback',
          'local_uri': 'embedded://fitila',
          'status': 'ready',
          'installed_at': now,
          'last_verified_at': now,
        });
      },
    );
    return _db!;
  }

  Future<List<DunyaMessage>> loadMessages() async {
    final db = await database;
    final rows = await db.query(
      'dunya_messages',
      where: 'conversation_id = ? AND deleted_at IS NULL',
      whereArgs: [_conversationId],
      orderBy: 'created_at ASC',
      limit: 300,
    );
    return [
      for (final row in rows)
        DunyaMessage(
          role: row['role']!.toString(),
          content: row['content']!.toString(),
          sources: _decodeMetadataSources(row['metadata_json']?.toString()),
        ),
    ];
  }

  Future<void> appendMessage(DunyaMessage message) async {
    final db = await database;
    final now = DateTime.now().toUtc();
    final id = 'msg-${now.microsecondsSinceEpoch}';
    await db.insert('dunya_messages', {
      'id': id,
      'conversation_id': _conversationId,
      'role': message.role,
      'content': message.content,
      'content_type': 'text',
      'model_id': message.role == 'assistant' ? 'dunya-fallback' : null,
      'status': 'completed',
      'metadata_json': jsonEncode({
        'execution_mode': 'offline',
        'confidence_status': message.sources.isEmpty ? 'unverified' : 'grounded',
        'needs_human_review': false,
        'tools_used': <String>[],
        'sources': [
          for (final source in message.sources)
            {'title': source.title, 'text': source.text},
        ],
      }),
      'created_at': now.toIso8601String(),
    });
    await db.update(
      'dunya_conversations',
      {'updated_at': now.toIso8601String()},
      where: 'id = ?',
      whereArgs: [_conversationId],
    );
  }

  Future<List<String>> loadMemories() async {
    final db = await database;
    final rows = await db.query(
      'dunya_memories',
      where: 'profile_id = ? AND deleted_at IS NULL',
      whereArgs: [_profileId],
      orderBy: 'updated_at DESC',
      limit: 100,
    );
    return rows.map((row) => row['content']!.toString()).toList(growable: false);
  }

  Future<void> saveMemory(String content, {String provenance = 'assistant'}) async {
    final db = await database;
    final existing = await db.query(
      'dunya_memories',
      where: 'profile_id = ? AND content = ? AND deleted_at IS NULL',
      whereArgs: [_profileId, content],
      limit: 1,
    );
    if (existing.isNotEmpty) return;
    final now = DateTime.now().toUtc();
    await db.insert('dunya_memories', {
      'id': 'mem-${now.microsecondsSinceEpoch}',
      'profile_id': _profileId,
      'memory_type': 'semantic',
      'content': content,
      'source_message_id': null,
      'consent_status': 'granted',
      'sensitivity': 'normal',
      'created_at': now.toIso8601String(),
      'updated_at': now.toIso8601String(),
    });
  }

  Future<void> queueSync({
    required String entityType,
    required String entityId,
    required String operation,
    required Map<String, dynamic> payload,
  }) async {
    final db = await database;
    final now = DateTime.now().toUtc();
    final stamp = now.microsecondsSinceEpoch.toString();
    await db.insert('dunya_sync_outbox', {
      'id': 'outbox-$stamp',
      'profile_id': _profileId,
      'entity_type': entityType,
      'entity_id': entityId,
      'operation': operation,
      'payload_json': jsonEncode(payload),
      'idempotency_key': '$entityType:$entityId:$operation:$stamp',
      'state': 'pending',
      'attempts': 0,
      'created_at': now.toIso8601String(),
    });
  }

  Future<void> ensureEmbeddedKnowledgeIndex(List<DunyaSource> sources) async {
    final db = await database;
    final existing = Sqflite.firstIntValue(
          await db.rawQuery(
            'SELECT COUNT(*) FROM dunya_knowledge_chunks c '
            'JOIN dunya_knowledge_items i ON i.id = c.item_id '
            'WHERE i.pack_id = ?',
            ['fitila-core'],
          ),
        ) ??
        0;
    if (existing == sources.length && existing > 0) return;

    await db.transaction((txn) async {
      final oldChunks = await txn.rawQuery(
        'SELECT c.id FROM dunya_knowledge_chunks c '
        'JOIN dunya_knowledge_items i ON i.id = c.item_id '
        'WHERE i.pack_id = ?',
        ['fitila-core'],
      );
      final oldIds = oldChunks.map((row) => row['id']?.toString()).whereType<String>().toList();
      for (final chunkId in oldIds) {
        await txn.delete('dunya_chunks_fts', where: 'chunk_id = ?', whereArgs: [chunkId]);
      }
      await txn.delete('dunya_knowledge_items', where: 'pack_id = ?', whereArgs: ['fitila-core']);

      final batch = txn.batch();
      final now = DateTime.now().toUtc().toIso8601String();
      for (var i = 0; i < sources.length; i++) {
        final source = sources[i];
        final itemId = 'fitila-core-item-$i';
        final chunkId = 'fitila-core-chunk-$i';
        final hash = sha256.convert(utf8.encode(source.text)).toString();
        batch.insert('dunya_knowledge_items', {
          'id': itemId,
          'pack_id': 'fitila-core',
          'title': source.title,
          'kind': source.kind,
          'language': null,
          'source_ref': source.ref,
          'license': null,
          'validation_status': 'embedded',
          'content_hash': hash,
          'created_at': now,
        });
        batch.insert('dunya_knowledge_chunks', {
          'id': chunkId,
          'item_id': itemId,
          'ordinal': 0,
          'content': source.text,
          'start_offset': 0,
          'end_offset': source.text.length,
          'token_count': source.text.split(RegExp(r'\s+')).where((x) => x.isNotEmpty).length,
        });
        batch.insert('dunya_chunks_fts', {
          'chunk_id': chunkId,
          'content': source.text,
        });
      }
      await batch.commit(noResult: true);
    });

    await audit('dunya_knowledge_indexed', {
      'pack_id': 'fitila-core',
      'chunks': sources.length,
      'engine': 'sqlite-fts5',
    });
  }

  Future<List<DunyaSource>> searchKnowledgeFts(
    String query, {
    int limit = 8,
  }) async {
    final terms = query
        .toLowerCase()
        .replaceAll(RegExp(r'[^a-z0-9à-ÿɔɛãĩũõñœ\s-]'), ' ')
        .split(RegExp(r'\s+'))
        .where((term) => term.length > 2)
        .take(8)
        .toList(growable: false);
    if (terms.isEmpty) return const [];

    final match = terms.map((term) => '"${term.replaceAll('"', '""')}"').join(' OR ');
    final db = await database;
    try {
      final rows = await db.rawQuery(
        '''
        SELECT i.title, i.source_ref, i.kind, c.content,
               bm25(dunya_chunks_fts) AS rank
        FROM dunya_chunks_fts
        JOIN dunya_knowledge_chunks c ON c.id = dunya_chunks_fts.chunk_id
        JOIN dunya_knowledge_items i ON i.id = c.item_id
        WHERE dunya_chunks_fts MATCH ?
          AND i.pack_id = 'fitila-core'
        ORDER BY rank ASC
        LIMIT ?
        ''',
        [match, limit],
      );
      return [
        for (final row in rows)
          DunyaSource(
            title: row['title']?.toString() ?? 'FITILA',
            text: row['content']?.toString() ?? '',
            ref: row['source_ref']?.toString(),
            kind: row['kind']?.toString() ?? 'knowledge',
          ),
      ];
    } catch (error) {
      await audit(
        'dunya_fts_error',
        {'error': error.toString()},
        severity: 'warning',
      );
      return const [];
    }
  }

  Future<Map<String, int>> stats() async {
    final db = await database;
    Future<int> count(String table) async {
      final rows = await db.rawQuery('SELECT COUNT(*) AS n FROM $table');
      return (rows.first['n'] as int?) ?? 0;
    }
    return {
      'messages': await count('dunya_messages'),
      'memories': await count('dunya_memories'),
      'packs': await count('dunya_knowledge_packs'),
      'models': await count('dunya_model_installations'),
      'outbox': await count('dunya_sync_outbox'),
    };
  }

  Future<void> audit(
    String eventType,
    Map<String, dynamic> detail, {
    String severity = 'info',
  }) async {
    final db = await database;
    final now = DateTime.now().toUtc();
    await db.insert('dunya_audit_events', {
      'id': 'audit-${now.microsecondsSinceEpoch}',
      'profile_id': _profileId,
      'event_type': eventType,
      'severity': severity,
      'details_json': jsonEncode(detail),
      'created_at': now.toIso8601String(),
    });
  }

  List<DunyaSource> _decodeMetadataSources(String? raw) {
    if (raw == null || raw.isEmpty) return const [];
    try {
      final decoded = jsonDecode(raw);
      if (decoded is! Map) return const [];
      final sources = decoded['sources'];
      if (sources is! List) return const [];
      return [
        for (final item in sources)
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
