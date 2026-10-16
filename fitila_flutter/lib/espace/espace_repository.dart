import 'dart:convert';
import 'dart:typed_data';

import 'package:supabase_flutter/supabase_flutter.dart';

import '../core/fitila_backend.dart';
import '../keyboard/bariba_keyboard_engine.dart';
import 'espace_models.dart';

/// Accès Supabase du module Espace. Mêmes tables/RPC que le web :
/// voir `supabase/migrations/20260929120000_espace_ged.sql`.
class EspaceRepository {
  EspaceRepository([SupabaseClient? client]) : _client = client;

  final SupabaseClient? _client;
  SupabaseClient get _db => _client ?? FitilaBackend.client;

  String get userId => _db.auth.currentUser?.id ?? '';
  bool get signedIn => _db.auth.currentUser != null;

  static const _listColumns =
      'id,owner_id,folder_id,title,category,tags,source,file_mime,version,archived,favorite,updated_at,content_text';

  Future<List<EspaceDoc>> list({
    bool archived = false,
    String? folderId,
    String? query,
  }) async {
    var q = _db.from('espace_documents').select(_listColumns).eq('archived', archived);
    if (folderId != null) {
      q = q.eq('folder_id', folderId);
    }
    final key = BaribaKeyboardEngine.foldKey(query ?? '');
    if (key.isNotEmpty) {
      // `search_text` est plié côté serveur : « baatonu » retrouve « Bàátɔ̀nú ».
      q = q.ilike('search_text', '%${key.replaceAll(RegExp(r'[%_\\]'), '')}%');
    }
    final rows = await q.order('updated_at', ascending: false).limit(300);
    return [for (final r in rows) EspaceDoc.fromJson(r)];
  }

  Future<EspaceDoc> get(String id) async =>
      EspaceDoc.fromJson(await _db.from('espace_documents').select().eq('id', id).single());

  Future<EspaceDoc> create({
    String title = 'Document sans titre',
    String contentHtml = '',
    String source = 'editor',
    String category = 'general',
    String? folderId,
    Map<String, dynamic>? metadata,
  }) async {
    final row = await _db
        .from('espace_documents')
        .insert({
          'title': title,
          'content_html': contentHtml,
          'content_text': htmlToPlain(contentHtml),
          'source': source,
          'category': category,
          'folder_id': folderId,
          'metadata': ?metadata,
        })
        .select()
        .single();
    return EspaceDoc.fromJson(row);
  }

  Future<EspaceDoc> update(String id, Map<String, dynamic> patch) async {
    final next = {...patch};
    if (next['content_html'] is String) {
      next['content_text'] = htmlToPlain(next['content_html'] as String);
    }
    final row = await _db.from('espace_documents').update(next).eq('id', id).select().single();
    return EspaceDoc.fromJson(row);
  }

  Future<void> delete(EspaceDoc d) async {
    await _db.from('espace_documents').delete().eq('id', d.id);
    if (d.filePath != null) {
      await _db.storage.from('espace-files').remove([d.filePath!]);
    }
  }

  Future<List<EspaceFolder>> folders() async {
    final rows = await _db.from('espace_folders').select('id,name').order('name');
    return [for (final r in rows) EspaceFolder.fromJson(r)];
  }

  Future<EspaceFolder> createFolder(String name) async => EspaceFolder.fromJson(
    await _db.from('espace_folders').insert({'name': name.trim()}).select('id,name').single(),
  );

  Future<void> deleteFolder(String id) => _db.from('espace_folders').delete().eq('id', id);

  Future<List<EspaceVersion>> versions(String docId) async {
    final rows = await _db
        .from('espace_document_versions')
        .select('version,title,content_html,content_text,created_at')
        .eq('document_id', docId)
        .order('version', ascending: false)
        .limit(100);
    return [for (final r in rows) EspaceVersion.fromJson(r)];
  }

  Future<List<EspacePermission>> permissions(String docId) async {
    final rows = await _db
        .from('espace_permissions')
        .select('id,role,share_token,expires_at')
        .eq('document_id', docId)
        .order('created_at', ascending: false);
    return [for (final r in rows) EspacePermission.fromJson(r)];
  }

  Future<void> shareWithEmail(String docId, String email, String role) =>
      _db.rpc('espace_share_with_email', params: {'_doc': docId, '_email': email, '_role': role});

  Future<String> createShareLink(String docId, String role, int hours) async =>
      (await _db.rpc('espace_create_share_link', params: {'_doc': docId, '_role': role, '_hours': hours})) as String;

  Future<void> revoke(String id) => _db.from('espace_permissions').delete().eq('id', id);

  static String shareUrl(String token) => 'https://fitila.bj/espace/partage/$token';

  Future<String> uploadFile(String docId, Uint8List bytes, String name, String mime) async {
    final safe = name.replaceAll(RegExp(r'[^\p{L}\p{N}._-]+', unicode: true), '_');
    final path = '$userId/$docId/${DateTime.now().millisecondsSinceEpoch}_$safe';
    await _db.storage.from('espace-files').uploadBinary(path, bytes, fileOptions: FileOptions(contentType: mime));
    return path;
  }

  Future<int> countDocs({required bool archived}) async {
    final res = await _db.from('espace_documents').select('id').eq('archived', archived).count(CountOption.exact);
    return res.count;
  }

  // ── OCR ────────────────────────────────────────────────────────────────

  Future<String> createOcrJob(String fileName, String mime, int pages) async {
    final row = await _db
        .from('espace_ocr_jobs')
        .insert({'file_name': fileName, 'file_mime': mime, 'page_count': pages, 'status': 'processing'})
        .select('id')
        .single();
    return row['id'] as String;
  }

  Future<void> finishOcrJob(String id, Map<String, dynamic> patch) => _db
      .from('espace_ocr_jobs')
      .update({...patch, 'finished_at': DateTime.now().toUtc().toIso8601String()})
      .eq('id', id);

  /// Appelle l'edge function `espace-ocr` avec des images JPEG/PNG.
  Future<OcrOutput> recognize(List<Uint8List> images, {String mode = 'printed', String mime = 'image/jpeg'}) async {
    final pages = [for (final b in images) 'data:$mime;base64,${base64Encode(b)}'];
    final res = await _db.functions.invoke('espace-ocr', body: {'pages': pages, 'mode': mode});
    final data = res.data;
    if (res.status != 200 || data is! Map) {
      final msg = data is Map ? (data['message'] ?? data['error'])?.toString() : null;
      throw StateError(msg ?? 'Moteur OCR indisponible (${res.status})');
    }
    return OcrOutput(
      engine: (data['engine'] as String?) ?? 'ocr',
      text: (data['text'] as String?) ?? '',
      confidence: (data['confidence'] as num?)?.toDouble() ?? 0,
      pages: [
        for (final p in (data['pages'] as List? ?? const []))
          (p as Map)['text']?.toString() ?? '',
      ],
    );
  }
}

class OcrOutput {
  const OcrOutput({required this.engine, required this.text, required this.confidence, required this.pages});

  final String engine;
  final String text;
  final double confidence;
  final List<String> pages;
}
