import 'package:flutter/material.dart';

import '../core/fitila_backend.dart';
import '../core/signature_theme.dart';
import '../ui/premium_widgets.dart';

/// Une ligne du journal d'activité plateforme (table `platform_audit_log`).
class PlatformAuditEntry {
  const PlatformAuditEntry({
    required this.id,
    required this.createdAt,
    required this.module,
    required this.eventType,
    required this.severity,
    required this.details,
    this.actor,
    this.actorLabel,
    this.client,
  });

  final Object id;
  final DateTime createdAt;
  final String? actor;
  final String? actorLabel;
  final String module;
  final String eventType;
  final String severity;
  final Map<String, dynamic> details;
  final String? client;

  factory PlatformAuditEntry.fromMap(Map<String, dynamic> row) {
    final rawDetails = row['details'];
    return PlatformAuditEntry(
      id: row['id'] ?? row['created_at'] ?? UniqueKey(),
      createdAt: DateTime.tryParse(row['created_at']?.toString() ?? '')?.toLocal() ?? DateTime.now(),
      actor: row['actor']?.toString(),
      actorLabel: row['actor_label']?.toString(),
      module: row['module']?.toString() ?? '',
      eventType: row['event_type']?.toString() ?? '',
      severity: row['severity']?.toString() ?? 'info',
      details: rawDetails is Map ? Map<String, dynamic>.from(rawDetails) : const <String, dynamic>{},
      client: row['client']?.toString(),
    );
  }
}

/// Fonction de lecture du journal — injectable pour les tests (voir
/// [WordProposalSubmit] dans `dictionary/word_proposal_sheet.dart` pour le
/// même principe).
typedef PlatformAuditFetch = Future<List<Map<String, dynamic>>> Function({
  String? module,
  String? severity,
  String? search,
  required int limit,
  required int offset,
});

const _moduleFilters = <(String value, String label)>[
  ('', 'Tous'),
  ('auth', 'Connexion'),
  ('dictionary', 'Dictionnaire'),
  ('dunya_voice', 'Voix DUNYA'),
];

const _severityFilters = <(String value, String label)>[
  ('', 'Tous'),
  ('info', 'Info'),
  ('warning', 'Attention'),
  ('error', 'Erreur'),
];

const _pageSize = 40;

/// Écran admin « Journal d'activité » : liste, filtrable et paginée, de
/// toutes les actions marquantes de la plateforme (connexions, propositions
/// de mots, sessions vocales DUNYA…), lecture réservée aux admins côté RLS.
class PlatformAuditScreen extends StatefulWidget {
  const PlatformAuditScreen({super.key, PlatformAuditFetch? fetch}) : _fetch = fetch;

  final PlatformAuditFetch? _fetch;

  @override
  State<PlatformAuditScreen> createState() => _PlatformAuditScreenState();
}

class _PlatformAuditScreenState extends State<PlatformAuditScreen> {
  late final PlatformAuditFetch _fetch = widget._fetch ?? FitilaBackend.fetchPlatformAuditLog;
  final _search = TextEditingController();

  String _module = '';
  String _severity = '';
  final _entries = <PlatformAuditEntry>[];
  bool _loading = true;
  bool _loadingMore = false;
  bool _hasMore = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _reload();
  }

  @override
  void dispose() {
    _search.dispose();
    super.dispose();
  }

  Future<void> _reload() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final rows = await _fetch(
        module: _module.isEmpty ? null : _module,
        severity: _severity.isEmpty ? null : _severity,
        search: _search.text,
        limit: _pageSize,
        offset: 0,
      );
      if (!mounted) return;
      setState(() {
        _entries
          ..clear()
          ..addAll(rows.map(PlatformAuditEntry.fromMap));
        _hasMore = rows.length >= _pageSize;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = 'Lecture impossible. Vérifiez votre connexion et vos droits d’administration.';
      });
    }
  }

  Future<void> _loadMore() async {
    if (_loadingMore || !_hasMore) return;
    setState(() => _loadingMore = true);
    try {
      final rows = await _fetch(
        module: _module.isEmpty ? null : _module,
        severity: _severity.isEmpty ? null : _severity,
        search: _search.text,
        limit: _pageSize,
        offset: _entries.length,
      );
      if (!mounted) return;
      setState(() {
        _entries.addAll(rows.map(PlatformAuditEntry.fromMap));
        _hasMore = rows.length >= _pageSize;
        _loadingMore = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() => _loadingMore = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Journal d’activité')),
      body: Column(children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 10, 16, 4),
          child: TextField(
            key: const ValueKey('audit-search'),
            controller: _search,
            textInputAction: TextInputAction.search,
            onSubmitted: (_) => _reload(),
            decoration: InputDecoration(
              hintText: 'Rechercher un événement, un utilisateur…',
              prefixIcon: const Icon(Icons.search_rounded, size: 20),
              suffixIcon: IconButton(
                icon: const Icon(Icons.arrow_forward_rounded, size: 20),
                onPressed: _reload,
              ),
            ),
          ),
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
          child: PremiumSegmented(
            labels: [for (final s in _severityFilters) s.$2],
            selected: _severityFilters.firstWhere((s) => s.$1 == _severity).$2,
            onChanged: (label) {
              setState(() => _severity = _severityFilters.firstWhere((s) => s.$2 == label).$1);
              _reload();
            },
          ),
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 10, 16, 6),
          child: SizedBox(
            height: 34,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              itemCount: _moduleFilters.length,
              separatorBuilder: (_, _) => const SizedBox(width: 8),
              itemBuilder: (context, i) {
                final (value, label) = _moduleFilters[i];
                final selected = value == _module;
                return ChoiceChip(
                  key: ValueKey('audit-module-$value'),
                  label: Text(label),
                  selected: selected,
                  onSelected: (_) {
                    setState(() => _module = value);
                    _reload();
                  },
                );
              },
            ),
          ),
        ),
        const Divider(height: 1),
        Expanded(child: _body()),
      ]),
    );
  }

  Widget _body() {
    if (_loading) {
      return const Center(child: CircularProgressIndicator());
    }
    if (_error != null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            const Icon(Icons.error_outline_rounded, color: SignatureTheme.clay, size: 32),
            const SizedBox(height: 10),
            Text(_error!, textAlign: TextAlign.center, style: const TextStyle(color: SignatureTheme.clay, fontWeight: FontWeight.w700)),
            const SizedBox(height: 14),
            OutlinedButton(onPressed: _reload, child: const Text('Réessayer')),
          ]),
        ),
      );
    }
    if (_entries.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            const Icon(Icons.inbox_outlined, color: SignatureTheme.muted, size: 32),
            const SizedBox(height: 10),
            const Text('Aucune activité pour ces filtres.', style: TextStyle(color: SignatureTheme.muted, fontWeight: FontWeight.w700)),
          ]),
        ),
      );
    }
    return RefreshIndicator(
      onRefresh: _reload,
      child: ListView.separated(
        padding: const EdgeInsets.fromLTRB(16, 10, 16, 24),
        itemCount: _entries.length + 1,
        separatorBuilder: (_, _) => const SizedBox(height: 8),
        itemBuilder: (context, i) {
          if (i == _entries.length) {
            if (!_hasMore) return const SizedBox.shrink();
            return Padding(
              padding: const EdgeInsets.symmetric(vertical: 12),
              child: Center(
                child: _loadingMore
                    ? const SizedBox.square(dimension: 20, child: CircularProgressIndicator(strokeWidth: 2))
                    : OutlinedButton(onPressed: _loadMore, child: const Text('Charger plus')),
              ),
            );
          }
          return _AuditRow(entry: _entries[i]);
        },
      ),
    );
  }
}

const _severityColor = <String, Color>{
  'info': SignatureTheme.sage,
  'warning': SignatureTheme.goldDeep,
  'error': SignatureTheme.clay,
};

const _severityTint = <String, Color>{
  'info': SignatureTheme.sageTint,
  'warning': SignatureTheme.goldTint,
  'error': SignatureTheme.clayTint,
};

const _severityIcon = <String, IconData>{
  'info': Icons.info_outline_rounded,
  'warning': Icons.warning_amber_rounded,
  'error': Icons.error_outline_rounded,
};

String _eventLabel(String eventType) {
  if (eventType.isEmpty) return 'Événement';
  return eventType.replaceAll('_', ' ');
}

const _months = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];

/// Évite une dépendance sur `intl` pour un simple « 23 oct. • 14:05 ».
String _formatTime(DateTime dt) {
  final month = _months[(dt.month - 1).clamp(0, 11)];
  final hh = dt.hour.toString().padLeft(2, '0');
  final mm = dt.minute.toString().padLeft(2, '0');
  return '${dt.day} $month • $hh:$mm';
}

class _AuditRow extends StatelessWidget {
  const _AuditRow({required this.entry});

  final PlatformAuditEntry entry;

  @override
  Widget build(BuildContext context) {
    final color = _severityColor[entry.severity] ?? SignatureTheme.muted;
    final tint = _severityTint[entry.severity] ?? SignatureTheme.surfaceAlt;
    final icon = _severityIcon[entry.severity] ?? Icons.circle_outlined;
    return InkWell(
      key: ValueKey('audit-row-${entry.id}'),
      borderRadius: BorderRadius.circular(SignatureTheme.radiusMedium),
      onTap: entry.details.isEmpty ? null : () => _showDetails(context, entry),
      child: PremiumCard(
        padding: const EdgeInsets.all(12),
        child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
          IconBadge(icon, color: color, background: tint, size: 36),
          const SizedBox(width: 12),
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Row(children: [
                Expanded(
                  child: Text(
                    _eventLabel(entry.eventType),
                    style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: SignatureTheme.ink),
                  ),
                ),
                Text(_formatTime(entry.createdAt), style: const TextStyle(fontSize: 11, color: SignatureTheme.muted)),
              ]),
              const SizedBox(height: 3),
              Text(
                entry.actorLabel ?? (entry.actor == null ? 'Visiteur anonyme' : 'Utilisateur'),
                style: const TextStyle(fontSize: 12.5, color: SignatureTheme.inkSoft, fontWeight: FontWeight.w600),
              ),
            ]),
          ),
          if (entry.details.isNotEmpty) const Padding(padding: EdgeInsets.only(left: 6, top: 2), child: Icon(Icons.chevron_right_rounded, size: 18, color: SignatureTheme.muted)),
        ]),
      ),
    );
  }

  void _showDetails(BuildContext context, PlatformAuditEntry entry) {
    showModalBottomSheet<void>(
      context: context,
      showDragHandle: true,
      builder: (context) => Padding(
        padding: const EdgeInsets.fromLTRB(20, 4, 20, 24),
        child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(_eventLabel(entry.eventType), style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w900, color: SignatureTheme.ink)),
          const SizedBox(height: 4),
          Text('${entry.module} • ${_formatTime(entry.createdAt)}', style: const TextStyle(fontSize: 12, color: SignatureTheme.muted)),
          const SizedBox(height: 14),
          for (final e in entry.details.entries)
            Padding(
              padding: const EdgeInsets.only(bottom: 6),
              child: Text.rich(TextSpan(children: [
                TextSpan(text: '${e.key} : ', style: const TextStyle(fontWeight: FontWeight.w800, color: SignatureTheme.inkSoft)),
                TextSpan(text: '${e.value}', style: const TextStyle(color: SignatureTheme.ink)),
              ])),
            ),
        ]),
      ),
    );
  }
}
