import 'package:flutter/foundation.dart';

/// Modèles du module « Espace » (mêmes tables Supabase que le web : `espace_*`).
@immutable
class EspaceFolder {
  const EspaceFolder({required this.id, required this.name});

  final String id;
  final String name;

  factory EspaceFolder.fromJson(Map<String, dynamic> j) =>
      EspaceFolder(id: j['id'] as String, name: (j['name'] as String?) ?? '');
}

@immutable
class EspaceDoc {
  const EspaceDoc({
    required this.id,
    required this.ownerId,
    required this.title,
    required this.contentHtml,
    required this.contentText,
    required this.category,
    required this.tags,
    required this.source,
    required this.version,
    required this.archived,
    required this.favorite,
    required this.updatedAt,
    this.folderId,
    this.filePath,
    this.fileMime,
  });

  final String id;
  final String ownerId;
  final String title;
  final String contentHtml;
  final String contentText;
  final String category;
  final List<String> tags;
  final String source;
  final int version;
  final bool archived;
  final bool favorite;
  final DateTime updatedAt;
  final String? folderId;
  final String? filePath;
  final String? fileMime;

  factory EspaceDoc.fromJson(Map<String, dynamic> j) => EspaceDoc(
    id: j['id'] as String,
    ownerId: (j['owner_id'] as String?) ?? '',
    title: (j['title'] as String?) ?? 'Document sans titre',
    contentHtml: (j['content_html'] as String?) ?? '',
    contentText: (j['content_text'] as String?) ?? '',
    category: (j['category'] as String?) ?? 'general',
    tags: [for (final t in (j['tags'] as List? ?? const [])) t.toString()],
    source: (j['source'] as String?) ?? 'editor',
    version: (j['version'] as num?)?.toInt() ?? 1,
    archived: j['archived'] == true,
    favorite: j['favorite'] == true,
    updatedAt:
        DateTime.tryParse((j['updated_at'] as String?) ?? '') ?? DateTime.now(),
    folderId: j['folder_id'] as String?,
    filePath: j['file_path'] as String?,
    fileMime: j['file_mime'] as String?,
  );
}

@immutable
class EspaceVersion {
  const EspaceVersion({
    required this.version,
    required this.title,
    required this.contentHtml,
    required this.contentText,
    required this.createdAt,
  });

  final int version;
  final String title;
  final String contentHtml;
  final String contentText;
  final DateTime createdAt;

  factory EspaceVersion.fromJson(Map<String, dynamic> j) => EspaceVersion(
    version: (j['version'] as num).toInt(),
    title: (j['title'] as String?) ?? '',
    contentHtml: (j['content_html'] as String?) ?? '',
    contentText: (j['content_text'] as String?) ?? '',
    createdAt:
        DateTime.tryParse((j['created_at'] as String?) ?? '') ?? DateTime.now(),
  );
}

@immutable
class EspacePermission {
  const EspacePermission({
    required this.id,
    required this.role,
    this.token,
    this.expiresAt,
  });

  final String id;
  final String role;
  final String? token;
  final DateTime? expiresAt;

  bool get expired => expiresAt != null && expiresAt!.isBefore(DateTime.now());

  factory EspacePermission.fromJson(Map<String, dynamic> j) => EspacePermission(
    id: j['id'] as String,
    role: (j['role'] as String?) ?? 'viewer',
    token: j['share_token'] as String?,
    expiresAt: DateTime.tryParse((j['expires_at'] as String?) ?? ''),
  );
}

const espaceCategories = <(String, String)>[
  ('general', 'Général'),
  ('litterature', 'Littérature & contes'),
  ('education', 'Éducation'),
  ('administratif', 'Administratif'),
  ('histoire', 'Histoire & culture'),
  ('religion', 'Religion'),
  ('recherche', 'Recherche linguistique'),
  ('manuscrit', 'Manuscrits numérisés'),
];

// ── Conversion HTML ⇄ texte ────────────────────────────────────────────────
// Le web stocke du HTML riche. Flutter édite du texte : les paragraphes sont
// conservés ; la mise en forme (gras, titres…) est simplifiée à l'édition.

final _blockEnd = RegExp(r'</(p|div|h[1-6]|li|tr|blockquote)>', caseSensitive: false);
final _br = RegExp(r'<br\s*/?>', caseSensitive: false);
final _tag = RegExp(r'<[^>]+>');

String htmlToPlain(String html) {
  if (html.isEmpty) {
    return '';
  }
  var s = html
      .replaceAll(_br, '\n')
      .replaceAllMapped(_blockEnd, (_) => '\n\n')
      .replaceAll(_tag, '');
  s = s
      .replaceAll('&nbsp;', ' ')
      .replaceAll('&lt;', '<')
      .replaceAll('&gt;', '>')
      .replaceAll('&quot;', '"')
      .replaceAll('&#39;', "'")
      .replaceAll('&amp;', '&');
  return s.replaceAll(RegExp(r'\n{3,}'), '\n\n').trim();
}

String escapeHtml(String s) => s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');

String plainToHtml(String text) => text
    .split(RegExp(r'\n{2,}'))
    .where((p) => p.trim().isNotEmpty)
    .map((p) => '<p>${escapeHtml(p).replaceAll('\n', '<br>')}</p>')
    .join();

/// Vrai si le HTML contient une mise en forme que l'édition texte va simplifier.
bool hasRichFormatting(String html) => RegExp(
  r'<(b|strong|i|em|u|h[1-6]|ul|ol|li|blockquote)\b',
  caseSensitive: false,
).hasMatch(html);
