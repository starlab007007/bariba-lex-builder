import 'dart:async';
import 'dart:convert';

import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';

import '../core/signature_theme.dart';
import 'espace_editor_screen.dart';
import 'espace_models.dart';
import 'espace_repository.dart';
import 'espace_scan_screen.dart';

/// Tableau de bord de l'Espace : coffre-fort GED Bàátɔ̀nú (même modèle que le web).
class EspaceHome extends StatefulWidget {
  const EspaceHome({super.key, this.repository});

  final EspaceRepository? repository;

  @override
  State<EspaceHome> createState() => _EspaceHomeState();
}

class _EspaceHomeState extends State<EspaceHome> {
  late final EspaceRepository _repo = widget.repository ?? EspaceRepository();
  final _search = TextEditingController();
  Timer? _debounce;
  List<EspaceDoc>? _docs;
  List<EspaceFolder> _folders = const [];
  String? _folderId;
  bool _archived = false;
  int _archivedCount = 0;
  bool _busy = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _debounce?.cancel();
    _search.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    if (!_repo.signedIn) {
      setState(() => _docs = const []);
      return;
    }
    try {
      final results = await Future.wait([
        _repo.list(archived: _archived, folderId: _folderId, query: _search.text),
        _repo.folders(),
        _repo.countDocs(archived: true),
      ]);
      if (!mounted) {
        return;
      }
      setState(() {
        _docs = results[0] as List<EspaceDoc>;
        _folders = results[1] as List<EspaceFolder>;
        _archivedCount = results[2] as int;
        _error = null;
      });
    } catch (e) {
      if (mounted) {
        setState(() {
          _docs = const [];
          _error = 'Chargement impossible : $e';
        });
      }
    }
  }

  void _onSearch(String _) {
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 300), _load);
  }

  Future<void> _open(EspaceDoc d) async {
    await Navigator.of(context).push(MaterialPageRoute<void>(builder: (_) => EspaceEditorScreen(docId: d.id, repository: _repo)));
    _load();
  }

  Future<void> _newDoc() async {
    setState(() => _busy = true);
    try {
      final d = await _repo.create(folderId: _folderId);
      if (mounted) {
        await _open(d);
      }
    } catch (e) {
      _snack('$e');
    } finally {
      if (mounted) {
        setState(() => _busy = false);
      }
    }
  }

  Future<void> _scan() async {
    await Navigator.of(context).push(MaterialPageRoute<void>(builder: (_) => EspaceScanScreen(repository: _repo)));
    _load();
  }

  Future<void> _import() async {
    final res = await FilePicker.platform.pickFiles(type: FileType.custom, allowedExtensions: const ['txt', 'md'], withData: true);
    final f = res?.files.firstOrNull;
    if (f == null || f.bytes == null) {
      return;
    }
    try {
      final decoded = utf8.decode(f.bytes!, allowMalformed: true).replaceFirst('\uFEFF', '');
      await _repo.create(title: f.name.replaceFirst(RegExp(r'\.[^.]+$'), ''), contentHtml: plainToHtml(decoded), source: 'import', folderId: _folderId);
      _snack('Document importé');
      _load();
    } catch (e) {
      _snack('Import impossible : $e');
    }
  }

  Future<void> _newFolder() async {
    final c = TextEditingController();
    final name = await showDialog<String>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Nouveau dossier'),
        content: TextField(controller: c, autofocus: true, maxLength: 60, decoration: const InputDecoration(hintText: 'Nom du dossier')),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Annuler')),
          FilledButton(onPressed: () => Navigator.pop(ctx, c.text), child: const Text('Créer')),
        ],
      ),
    );
    if (name == null || name.trim().isEmpty) {
      return;
    }
    try {
      await _repo.createFolder(name);
      _load();
    } catch (e) {
      _snack('$e');
    }
  }

  Future<void> _patch(EspaceDoc d, Map<String, dynamic> patch) async {
    try {
      await _repo.update(d.id, patch);
      _load();
    } catch (e) {
      _snack('$e');
    }
  }

  Future<void> _delete(EspaceDoc d) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Supprimer le document ?'),
        content: Text('« ${d.title} » et son historique seront supprimés définitivement.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Annuler')),
          FilledButton(style: FilledButton.styleFrom(backgroundColor: SignatureTheme.clay), onPressed: () => Navigator.pop(ctx, true), child: const Text('Supprimer')),
        ],
      ),
    );
    if (ok == true) {
      try {
        await _repo.delete(d);
        _load();
      } catch (e) {
        _snack('$e');
      }
    }
  }

  void _snack(String m) => ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(m)));

  @override
  Widget build(BuildContext context) {
    if (!_repo.signedIn) {
      return const Center(child: Padding(padding: EdgeInsets.all(28), child: Text('Connectez-vous pour utiliser votre Espace privé.', textAlign: TextAlign.center)));
    }
    final docs = _docs;
    return RefreshIndicator(
      color: SignatureTheme.gold,
      onRefresh: _load,
      child: LayoutBuilder(
        builder: (context, box) {
          final cols = box.maxWidth < 560 ? 1 : box.maxWidth < 900 ? 2 : 3;
          return ListView(
            padding: const EdgeInsets.fromLTRB(4, 0, 4, 32),
            children: [
              _hero(),
              const SizedBox(height: 14),
              TextField(
                key: const ValueKey('espace-search'),
                controller: _search,
                onChanged: _onSearch,
                textInputAction: TextInputAction.search,
                decoration: InputDecoration(
                  hintText: 'Rechercher — « baatonu » trouve « Bàátɔ̀nú »',
                  prefixIcon: const Icon(Icons.search_rounded),
                  suffixIcon: _search.text.isEmpty ? null : IconButton(icon: const Icon(Icons.close_rounded), onPressed: () { _search.clear(); _load(); }),
                ),
              ),
              const SizedBox(height: 10),
              SizedBox(
                height: 40,
                child: ListView(
                  scrollDirection: Axis.horizontal,
                  children: [
                    _chip('Tous', _folderId == null && !_archived, () { setState(() { _folderId = null; _archived = false; }); _load(); }),
                    for (final f in _folders) _chip(f.name, _folderId == f.id, () { setState(() { _folderId = f.id; _archived = false; }); _load(); }),
                    _chip('Archives${_archivedCount > 0 ? ' · $_archivedCount' : ''}', _archived, () { setState(() { _archived = !_archived; _folderId = null; }); _load(); }, icon: Icons.archive_outlined),
                    _chip('+ Dossier', false, _newFolder, dashed: true),
                  ],
                ),
              ),
              const SizedBox(height: 12),
              if (_error != null) Padding(padding: const EdgeInsets.only(bottom: 10), child: Text(_error!, style: const TextStyle(color: SignatureTheme.clay))),
              if (docs == null)
                const Padding(padding: EdgeInsets.all(40), child: Center(child: CircularProgressIndicator()))
              else if (docs.isEmpty)
                _empty()
              else
                GridView.builder(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  itemCount: docs.length,
                  gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(crossAxisCount: cols, mainAxisExtent: 148, crossAxisSpacing: 12, mainAxisSpacing: 12),
                  itemBuilder: (_, i) => _card(docs[i]),
                ),
            ],
          );
        },
      ),
    );
  }

  Widget _hero() {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(SignatureTheme.radiusLarge),
        border: Border.all(color: SignatureTheme.hairline),
        gradient: const LinearGradient(begin: Alignment.topLeft, end: Alignment.bottomRight, colors: [Colors.white, Color(0xFFF3E3B9)]),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('COFFRE-FORT NUMÉRIQUE', style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.w800, letterSpacing: 1.4, color: SignatureTheme.goldDeep)),
          const SizedBox(height: 4),
          const Text('Espace', style: TextStyle(fontFamily: 'Fraunces', fontSize: 32, fontWeight: FontWeight.w600, color: SignatureTheme.ink)),
          const SizedBox(height: 4),
          const Text(
            'Écrivez, numérisez et archivez vos documents en Bàátɔ̀nú, avec traduction et prédiction pendant la saisie.',
            style: TextStyle(fontSize: 13, height: 1.45, color: SignatureTheme.inkSoft),
          ),
          const SizedBox(height: 14),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              FilledButton.icon(
                key: const ValueKey('espace-new'),
                onPressed: _busy ? null : _newDoc,
                icon: _busy ? const SizedBox.square(dimension: 16, child: CircularProgressIndicator(strokeWidth: 2)) : const Icon(Icons.note_add_rounded, size: 18),
                label: const Text('Nouveau document'),
                style: FilledButton.styleFrom(backgroundColor: SignatureTheme.gold, foregroundColor: const Color(0xFF2B2110)),
              ),
              OutlinedButton.icon(key: const ValueKey('espace-scan'), onPressed: _scan, icon: const Icon(Icons.document_scanner_rounded, size: 18), label: const Text('Scanner (OCR)')),
              OutlinedButton.icon(onPressed: _import, icon: const Icon(Icons.upload_file_rounded, size: 18), label: const Text('Importer .txt')),
            ],
          ),
        ],
      ),
    );
  }

  Widget _chip(String label, bool selected, VoidCallback onTap, {IconData? icon, bool dashed = false}) {
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: ChoiceChip(
        label: Text(label),
        avatar: icon == null ? null : Icon(icon, size: 16),
        selected: selected,
        onSelected: (_) => onTap(),
        selectedColor: SignatureTheme.goldTint,
        backgroundColor: SignatureTheme.surface,
        side: BorderSide(color: selected ? SignatureTheme.gold : SignatureTheme.hairline, style: dashed ? BorderStyle.solid : BorderStyle.solid),
        labelStyle: TextStyle(fontWeight: FontWeight.w800, fontSize: 12.5, color: selected ? SignatureTheme.goldDeep : SignatureTheme.ink),
      ),
    );
  }

  Widget _empty() {
    final searching = _search.text.trim().isNotEmpty;
    return Container(
      padding: const EdgeInsets.all(28),
      decoration: BoxDecoration(color: Colors.white70, borderRadius: BorderRadius.circular(SignatureTheme.radiusMedium), border: Border.all(color: SignatureTheme.hairlineStrong)),
      child: Column(
        children: [
          const Icon(Icons.description_outlined, size: 36, color: SignatureTheme.goldDeep),
          const SizedBox(height: 10),
          Text(searching ? 'Aucun résultat' : _archived ? 'Aucun document archivé' : 'Votre Espace est vide', style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
          const SizedBox(height: 4),
          Text(searching ? 'Essayez sans accents ni tons : « baatonu » retrouve « Bàátɔ̀nú ».' : 'Créez un document ou numérisez un manuscrit pour en extraire le texte.', textAlign: TextAlign.center, style: const TextStyle(color: SignatureTheme.muted, fontSize: 12.5)),
        ],
      ),
    );
  }

  String _date(DateTime d) {
    final diff = DateTime.now().difference(d);
    if (diff.inHours < 24) {
      return '${d.hour.toString().padLeft(2, '0')}:${d.minute.toString().padLeft(2, '0')}';
    }
    return '${d.day.toString().padLeft(2, '0')}/${d.month.toString().padLeft(2, '0')}/${d.year % 100}';
  }

  Widget _card(EspaceDoc d) {
    return Material(
      color: SignatureTheme.surface,
      borderRadius: BorderRadius.circular(SignatureTheme.radiusMedium),
      child: InkWell(
        key: ValueKey('espace-doc-${d.id}'),
        borderRadius: BorderRadius.circular(SignatureTheme.radiusMedium),
        onTap: () => _open(d),
        child: Container(
          padding: const EdgeInsets.fromLTRB(14, 12, 4, 12),
          decoration: BoxDecoration(borderRadius: BorderRadius.circular(SignatureTheme.radiusMedium), border: Border.all(color: SignatureTheme.hairline)),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    width: 30,
                    height: 30,
                    decoration: BoxDecoration(color: d.source == 'ocr' ? SignatureTheme.sageTint : SignatureTheme.goldTint, borderRadius: BorderRadius.circular(10)),
                    child: Icon(d.source == 'ocr' ? Icons.document_scanner_rounded : Icons.description_rounded, size: 16, color: d.source == 'ocr' ? SignatureTheme.sage : SignatureTheme.goldDeep),
                  ),
                  const Spacer(),
                  PopupMenuButton<String>(
                    tooltip: 'Actions',
                    onSelected: (v) {
                      switch (v) {
                        case 'open': _open(d);
                        case 'fav': _patch(d, {'favorite': !d.favorite});
                        case 'arch': _patch(d, {'archived': !d.archived});
                        case 'del': _delete(d);
                      }
                    },
                    itemBuilder: (_) => [
                      const PopupMenuItem(value: 'open', child: Text('Ouvrir')),
                      PopupMenuItem(value: 'fav', child: Text(d.favorite ? 'Retirer des favoris' : 'Favori')),
                      PopupMenuItem(value: 'arch', child: Text(d.archived ? 'Désarchiver' : 'Archiver')),
                      const PopupMenuItem(value: 'del', child: Text('Supprimer')),
                    ],
                  ),
                ],
              ),
              Text(d.title, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontFamily: 'Fraunces', fontSize: 16, fontWeight: FontWeight.w600)),
              const SizedBox(height: 3),
              Expanded(
                child: Padding(
                  padding: const EdgeInsets.only(right: 10),
                  child: Text(d.contentText.isEmpty ? 'Document vide' : d.contentText, maxLines: 2, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 12.5, color: SignatureTheme.muted, height: 1.35)),
                ),
              ),
              Row(
                children: [
                  if (d.favorite) const Padding(padding: EdgeInsets.only(right: 4), child: Icon(Icons.star_rounded, size: 14, color: SignatureTheme.gold)),
                  Text('${_date(d.updatedAt)} · v${d.version}', style: const TextStyle(fontSize: 11, color: SignatureTheme.muted)),
                  if (d.tags.isNotEmpty) ...[
                    const SizedBox(width: 8),
                    Flexible(child: Text('#${d.tags.first}', overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: SignatureTheme.goldDeep))),
                  ],
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
