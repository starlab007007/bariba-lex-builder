import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../core/signature_theme.dart';
import 'espace_models.dart';
import 'espace_repository.dart';
import 'espace_smart_editor.dart';

enum _Save { idle, dirty, saving, saved, error }

/// Éditeur d'un document de l'Espace : enregistrement automatique, versions,
/// partage, saisie intelligente (voir [EspaceSmartEditor]).
class EspaceEditorScreen extends StatefulWidget {
  const EspaceEditorScreen({super.key, required this.docId, this.repository});

  final String docId;
  final EspaceRepository? repository;

  @override
  State<EspaceEditorScreen> createState() => _EspaceEditorScreenState();
}

class _EspaceEditorScreenState extends State<EspaceEditorScreen> {
  late final EspaceRepository _repo = widget.repository ?? EspaceRepository();
  final _title = TextEditingController();
  final _body = TextEditingController();
  EspaceDoc? _doc;
  String? _error;
  _Save _save = _Save.idle;
  Timer? _timer;
  String _initialPlain = '';
  bool _bodyTouched = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _timer?.cancel();
    _title.dispose();
    _body.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    try {
      final d = await _repo.get(widget.docId);
      if (!mounted) {
        return;
      }
      setState(() {
        _doc = d;
        _title.text = d.title;
        _initialPlain = htmlToPlain(d.contentHtml);
        _body.text = _initialPlain;
      });
      _title.addListener(_schedule);
      _body.addListener(() {
        if (_body.text != _initialPlain) {
          _bodyTouched = true;
          _schedule();
        }
      });
    } catch (e) {
      if (mounted) {
        setState(() => _error = '$e');
      }
    }
  }

  bool get _isOwner => _doc != null && _doc!.ownerId == _repo.userId;

  void _schedule() {
    if (_doc == null) {
      return;
    }
    setState(() => _save = _Save.dirty);
    _timer?.cancel();
    _timer = Timer(const Duration(milliseconds: 1400), _flush);
  }

  Future<void> _flush() async {
    _timer?.cancel();
    final d = _doc;
    if (d == null) {
      return;
    }
    setState(() => _save = _Save.saving);
    try {
      final patch = <String, dynamic>{'title': _title.text.trim().isEmpty ? 'Document sans titre' : _title.text.trim()};
      // Ne réécrit le HTML que si le texte a été modifié : la mise en forme riche du web est préservée sinon.
      if (_bodyTouched) {
        patch['content_html'] = plainToHtml(_body.text);
      }
      final next = await _repo.update(d.id, patch);
      if (mounted) {
        setState(() {
          _doc = next;
          _save = _Save.saved;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _save = _Save.error);
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Enregistrement impossible : $e')));
      }
    }
  }

  Future<bool> _leave() async {
    if (_save == _Save.dirty) {
      await _flush();
    }
    return true;
  }

  Future<void> _openPanel() async {
    final d = _doc;
    if (d == null) {
      return;
    }
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      backgroundColor: SignatureTheme.surface,
      builder: (_) => _DocPanel(
        doc: d,
        repo: _repo,
        isOwner: _isOwner,
        onRestore: (v) async {
          _title.text = v.title;
          _initialPlain = htmlToPlain(v.contentHtml);
          _bodyTouched = true;
          _body.text = _initialPlain;
          await _flush();
        },
        onChanged: (next) => setState(() => _doc = next),
      ),
    );
  }

  Future<void> _export(String kind) async {
    final text = '${_title.text}\n\n${_body.text}';
    await Clipboard.setData(ClipboardData(text: kind == 'copy' ? _body.text : text));
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Texte copié (UTF-8, tons et ɛ ɔ ŋ conservés)')));
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_error != null) {
      return Scaffold(appBar: AppBar(), body: Center(child: Padding(padding: const EdgeInsets.all(24), child: Text('Document introuvable ou inaccessible.\n$_error', textAlign: TextAlign.center))));
    }
    final d = _doc;
    if (d == null) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }
    final status = switch (_save) {
      _Save.idle => 'v${d.version}',
      _Save.dirty => 'Modifié…',
      _Save.saving => 'Enregistrement…',
      _Save.saved => 'Enregistré · v${d.version}',
      _Save.error => 'Erreur',
    };
    return PopScope(
      canPop: _save != _Save.dirty,
      onPopInvokedWithResult: (didPop, _) async {
        if (!didPop) {
          await _leave();
          if (context.mounted) {
            Navigator.of(context).pop();
          }
        }
      },
      child: Scaffold(
        backgroundColor: SignatureTheme.appBackground,
        appBar: AppBar(
          backgroundColor: SignatureTheme.appBackground,
          surfaceTintColor: Colors.transparent,
          titleSpacing: 0,
          title: TextField(
            key: const ValueKey('espace-title'),
            controller: _title,
            maxLength: 200,
            buildCounter: (_, {required currentLength, required isFocused, maxLength}) => null,
            style: const TextStyle(fontFamily: 'Fraunces', fontSize: 19, fontWeight: FontWeight.w600),
            decoration: const InputDecoration(border: InputBorder.none, enabledBorder: InputBorder.none, focusedBorder: InputBorder.none, filled: false, hintText: 'Titre du document'),
          ),
          actions: [
            Center(
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 200),
                padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
                decoration: BoxDecoration(
                  color: _save == _Save.error ? SignatureTheme.clayTint : _save == _Save.saved ? SignatureTheme.sageTint : SignatureTheme.surfaceAlt,
                  borderRadius: BorderRadius.circular(99),
                ),
                child: Text(status, key: const ValueKey('espace-status'), style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: _save == _Save.error ? SignatureTheme.clay : _save == _Save.saved ? SignatureTheme.sage : SignatureTheme.muted)),
              ),
            ),
            PopupMenuButton<String>(
              tooltip: 'Exporter',
              icon: const Icon(Icons.ios_share_rounded),
              onSelected: _export,
              itemBuilder: (_) => const [
                PopupMenuItem(value: 'copy', child: Text('Copier le texte')),
                PopupMenuItem(value: 'copy-title', child: Text('Copier avec le titre')),
              ],
            ),
            IconButton(key: const ValueKey('espace-panel'), tooltip: 'Infos, versions, partage', onPressed: _openPanel, icon: const Icon(Icons.tune_rounded)),
          ],
        ),
        body: SafeArea(
          top: false,
          child: Column(
            children: [
              if (hasRichFormatting(d.contentHtml))
                Container(
                  width: double.infinity,
                  color: SignatureTheme.goldTint,
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                  child: const Text('Mise en forme riche (titres, gras…) simplifiée à l’édition sur mobile : elle est conservée tant que vous ne modifiez pas le texte.', style: TextStyle(fontSize: 11.5, color: SignatureTheme.goldDeep)),
                ),
              Expanded(
                child: Container(
                  margin: const EdgeInsets.fromLTRB(10, 4, 10, 10),
                  clipBehavior: Clip.antiAlias,
                  decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(SignatureTheme.radiusMedium + 4), border: Border.all(color: SignatureTheme.hairline)),
                  child: EspaceSmartEditor(controller: _body),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _DocPanel extends StatefulWidget {
  const _DocPanel({required this.doc, required this.repo, required this.isOwner, required this.onRestore, required this.onChanged});

  final EspaceDoc doc;
  final EspaceRepository repo;
  final bool isOwner;
  final Future<void> Function(EspaceVersion) onRestore;
  final ValueChanged<EspaceDoc> onChanged;

  @override
  State<_DocPanel> createState() => _DocPanelState();
}

class _DocPanelState extends State<_DocPanel> with SingleTickerProviderStateMixin {
  late final TabController _tabs = TabController(length: 3, vsync: this);
  late EspaceDoc _d = widget.doc;
  final _tag = TextEditingController();
  final _email = TextEditingController();
  String _role = 'viewer';
  int _hours = 72;
  List<EspaceVersion>? _versions;
  List<EspacePermission> _perms = const [];

  @override
  void initState() {
    super.initState();
    widget.repo.versions(_d.id).then((v) => mounted ? setState(() => _versions = v) : null).catchError((_) {});
    _loadPerms();
  }

  @override
  void dispose() {
    _tabs.dispose();
    _tag.dispose();
    _email.dispose();
    super.dispose();
  }

  Future<void> _loadPerms() async {
    if (!widget.isOwner) {
      return;
    }
    try {
      final p = await widget.repo.permissions(_d.id);
      if (mounted) {
        setState(() => _perms = p);
      }
    } catch (_) {}
  }

  Future<void> _patch(Map<String, dynamic> p) async {
    try {
      final next = await widget.repo.update(_d.id, p);
      setState(() => _d = next);
      widget.onChanged(next);
    } catch (e) {
      _snack('$e');
    }
  }

  void _snack(String m) => ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(m)));

  Future<void> _run(Future<void> Function() f, String ok) async {
    try {
      await f();
      _snack(ok);
      await _loadPerms();
    } catch (e) {
      _snack(e is PostgrestException ? e.message : '$e');
    }
  }

  @override
  Widget build(BuildContext context) {
    final h = MediaQuery.sizeOf(context).height * .78;
    return SizedBox(
      height: h,
      child: Column(
        children: [
          TabBar(
            controller: _tabs,
            labelColor: SignatureTheme.goldDeep,
            indicatorColor: SignatureTheme.gold,
            tabs: const [Tab(text: 'Infos'), Tab(text: 'Versions'), Tab(text: 'Partage')],
          ),
          Expanded(
            child: TabBarView(
              controller: _tabs,
              children: [_infos(), _versionsTab(), _share()],
            ),
          ),
        ],
      ),
    );
  }

  Widget _infos() {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        DropdownButtonFormField<String>(
          initialValue: espaceCategories.any((c) => c.$1 == _d.category) ? _d.category : 'general',
          decoration: const InputDecoration(labelText: 'Catégorie'),
          items: [for (final c in espaceCategories) DropdownMenuItem(value: c.$1, child: Text(c.$2))],
          onChanged: widget.isOwner ? (v) => _patch({'category': v}) : null,
        ),
        const SizedBox(height: 14),
        const Text('Étiquettes', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 12.5)),
        const SizedBox(height: 6),
        Wrap(
          spacing: 6,
          children: [
            for (final t in _d.tags)
              InputChip(label: Text('#$t'), onDeleted: widget.isOwner ? () => _patch({'tags': _d.tags.where((x) => x != t).toList()}) : null, backgroundColor: SignatureTheme.goldTint, side: BorderSide.none),
          ],
        ),
        if (widget.isOwner)
          TextField(
            controller: _tag,
            decoration: const InputDecoration(hintText: 'Ajouter une étiquette + Entrée'),
            onSubmitted: (v) {
              final t = v.trim().replaceFirst('#', '');
              if (t.isNotEmpty && !_d.tags.contains(t) && _d.tags.length < 20) {
                _patch({'tags': [..._d.tags, t]});
              }
              _tag.clear();
            },
          ),
        const SizedBox(height: 18),
        if (widget.isOwner) ...[
          OutlinedButton.icon(
            onPressed: () async {
              final nav = Navigator.of(context);
              await _patch({'archived': !_d.archived});
              nav.pop();
            },
            icon: Icon(_d.archived ? Icons.unarchive_outlined : Icons.archive_outlined),
            label: Text(_d.archived ? 'Sortir des archives' : 'Archiver'),
          ),
          const SizedBox(height: 8),
          FilledButton.icon(
            style: FilledButton.styleFrom(backgroundColor: SignatureTheme.clayTint, foregroundColor: SignatureTheme.clay),
            onPressed: () async {
              final ok = await showDialog<bool>(context: context, builder: (ctx) => AlertDialog(title: const Text('Supprimer ?'), content: const Text('Le document et son historique seront supprimés.'), actions: [TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Annuler')), FilledButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Supprimer'))]));
              if (ok == true && mounted) {
                final nav = Navigator.of(context);
                await widget.repo.delete(_d);
                nav
                  ..pop()
                  ..pop();
              }
            },
            icon: const Icon(Icons.delete_outline_rounded),
            label: const Text('Supprimer définitivement'),
          ),
        ],
      ],
    );
  }

  Widget _versionsTab() {
    final v = _versions;
    if (v == null) {
      return const Center(child: CircularProgressIndicator());
    }
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        for (final x in v)
          Card(
            margin: const EdgeInsets.only(bottom: 8),
            child: ListTile(
              title: Text('Version ${x.version}${x.version == _d.version ? '  · actuelle' : ''}', style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 14)),
              subtitle: Text(x.contentText.isEmpty ? '(vide)' : x.contentText, maxLines: 2, overflow: TextOverflow.ellipsis),
              trailing: x.version == _d.version || !widget.isOwner
                  ? null
                  : TextButton(
                      onPressed: () async {
                        final nav = Navigator.of(context);
                        await widget.onRestore(x);
                        nav.pop();
                      },
                      child: const Text('Restaurer'),
                    ),
            ),
          ),
        if (v.isEmpty) const Text('Aucune révision enregistrée.'),
      ],
    );
  }

  Widget _share() {
    if (!widget.isOwner) {
      return const Center(child: Text('Seul le propriétaire gère le partage.'));
    }
    final roleField = DropdownButtonFormField<String>(
      initialValue: _role,
      decoration: const InputDecoration(labelText: 'Droits'),
      items: const [DropdownMenuItem(value: 'viewer', child: Text('Lecture seule')), DropdownMenuItem(value: 'editor', child: Text('Peut modifier'))],
      onChanged: (v) => setState(() => _role = v ?? 'viewer'),
    );
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        const Text('Partager avec un utilisateur FITILA', style: TextStyle(fontWeight: FontWeight.w800)),
        const SizedBox(height: 8),
        TextField(controller: _email, keyboardType: TextInputType.emailAddress, decoration: const InputDecoration(hintText: 'adresse e-mail du compte')),
        const SizedBox(height: 8),
        roleField,
        const SizedBox(height: 8),
        FilledButton(
          onPressed: () => _run(() async { await widget.repo.shareWithEmail(_d.id, _email.text.trim(), _role); _email.clear(); }, 'Document partagé'),
          child: const Text('Partager'),
        ),
        const Divider(height: 32),
        const Text('Lien temporaire', style: TextStyle(fontWeight: FontWeight.w800)),
        const SizedBox(height: 8),
        DropdownButtonFormField<int>(
          initialValue: _hours,
          decoration: const InputDecoration(labelText: 'Validité'),
          items: const [DropdownMenuItem(value: 1, child: Text('1 heure')), DropdownMenuItem(value: 24, child: Text('24 heures')), DropdownMenuItem(value: 72, child: Text('3 jours')), DropdownMenuItem(value: 168, child: Text('7 jours')), DropdownMenuItem(value: 720, child: Text('30 jours'))],
          onChanged: (v) => setState(() => _hours = v ?? 72),
        ),
        const SizedBox(height: 8),
        OutlinedButton.icon(
          onPressed: () => _run(() async {
            final tok = await widget.repo.createShareLink(_d.id, _role, _hours);
            await Clipboard.setData(ClipboardData(text: EspaceRepository.shareUrl(tok)));
          }, 'Lien créé et copié'),
          icon: const Icon(Icons.link_rounded),
          label: const Text('Créer un lien (droits ci-dessus)'),
        ),
        const Divider(height: 32),
        const Text('Accès accordés', style: TextStyle(fontWeight: FontWeight.w800)),
        for (final p in _perms)
          ListTile(
            contentPadding: EdgeInsets.zero,
            title: Text('${p.token != null ? 'Lien' : 'Utilisateur'} · ${p.role == 'editor' ? 'modification' : 'lecture'}'),
            subtitle: Text(p.expired ? 'Expiré' : p.expiresAt == null ? 'sans limite' : 'jusqu’au ${p.expiresAt!.toLocal().toString().substring(0, 16)}'),
            trailing: Row(mainAxisSize: MainAxisSize.min, children: [
              if (p.token != null && !p.expired) IconButton(icon: const Icon(Icons.copy_rounded, size: 18), onPressed: () => Clipboard.setData(ClipboardData(text: EspaceRepository.shareUrl(p.token!)))),
              IconButton(icon: const Icon(Icons.delete_outline_rounded, size: 20, color: SignatureTheme.clay), onPressed: () => _run(() => widget.repo.revoke(p.id), 'Accès révoqué')),
            ]),
          ),
        if (_perms.isEmpty) const Text('Document privé — aucun accès partagé.', style: TextStyle(color: SignatureTheme.muted)),
      ],
    );
  }
}
