import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';

import '../core/signature_theme.dart';
import '../keyboard/bariba_input.dart';
import '../keyboard/bariba_keyboard_engine.dart';
import 'espace_editor_screen.dart';
import 'espace_models.dart';
import 'espace_repository.dart';

enum _Stage { pick, ready, working, done }

/// Numérisation OCR : photo/galerie -> prétraitement (redimensionnement,
/// JPEG) -> modèle vision (edge function `espace-ocr`) -> correction par le
/// dictionnaire -> texte éditable -> document de l'Espace.
/// Les PDF se numérisent depuis le web (rendu des pages par pdf.js).
class EspaceScanScreen extends StatefulWidget {
  const EspaceScanScreen({super.key, this.repository, this.picker});

  final EspaceRepository? repository;
  final ImagePicker? picker;

  @override
  State<EspaceScanScreen> createState() => _EspaceScanScreenState();
}

class _EspaceScanScreenState extends State<EspaceScanScreen> {
  late final EspaceRepository _repo = widget.repository ?? EspaceRepository();
  late final ImagePicker _picker = widget.picker ?? ImagePicker();
  final _title = TextEditingController();
  final _text = TextEditingController();
  final List<Uint8List> _images = [];
  String _mode = 'printed';
  _Stage _stage = _Stage.pick;
  String? _error;
  double _confidence = 0;
  int _corrections = 0;
  String _engineName = '';
  String? _jobId;
  bool _saving = false;

  @override
  void dispose() {
    _title.dispose();
    _text.dispose();
    super.dispose();
  }

  Future<void> _pick({required bool camera}) async {
    try {
      final picked = camera
          ? [await _picker.pickImage(source: ImageSource.camera, maxWidth: 2000, maxHeight: 2000, imageQuality: 88)]
          : await _picker.pickMultiImage(maxWidth: 2000, maxHeight: 2000, imageQuality: 88, limit: 12);
      final files = picked.whereType<XFile>().toList();
      if (files.isEmpty) {
        return;
      }
      final bytes = [for (final f in files) await f.readAsBytes()];
      setState(() {
        _images
          ..clear()
          ..addAll(bytes);
        if (_title.text.isEmpty) {
          _title.text = files.first.name.replaceFirst(RegExp(r'\.[^.]+$'), '');
        }
        _stage = _Stage.ready;
        _error = null;
      });
    } catch (e) {
      setState(() => _error = 'Impossible d’ouvrir l’image : $e');
    }
  }

  Future<void> _run() async {
    setState(() {
      _stage = _Stage.working;
      _error = null;
    });
    try {
      _jobId = await _repo.createOcrJob('scan-mobile', 'image/jpeg', _images.length);
      final out = await _repo.recognize(_images, mode: _mode);
      final engine = await BaribaKeyboardEngine.load();
      final fixed = engine.correctText(out.text);
      if (!mounted) {
        return;
      }
      setState(() {
        _text.text = fixed.text;
        _corrections = fixed.corrections;
        _confidence = out.confidence;
        _engineName = out.engine;
        _stage = _Stage.done;
      });
      await _repo.finishOcrJob(_jobId!, {'status': 'done', 'engine': out.engine, 'confidence': double.parse(out.confidence.toStringAsFixed(3)), 'extracted_text': fixed.text});
    } catch (e) {
      final msg = e.toString().replaceFirst('Bad state: ', '');
      if (mounted) {
        setState(() {
          _error = msg;
          _stage = _Stage.ready;
        });
      }
      if (_jobId != null) {
        _repo.finishOcrJob(_jobId!, {'status': 'failed', 'error': msg}).catchError((_) {});
      }
    }
  }

  Future<void> _save() async {
    setState(() => _saving = true);
    try {
      final doc = await _repo.create(
        title: _title.text.trim().isEmpty ? 'Numérisation' : _title.text.trim(),
        contentHtml: plainToHtml(_text.text),
        source: 'ocr',
        category: _mode == 'handwritten' ? 'manuscrit' : 'general',
        metadata: {'ocr': {'engine': _engineName, 'confidence': _confidence, 'pages': _images.length, 'corrections': _corrections, 'mode': _mode}},
      );
      try {
        final path = await _repo.uploadFile(doc.id, _images.first, 'scan.jpg', 'image/jpeg');
        await _repo.update(doc.id, {'file_path': path, 'file_mime': 'image/jpeg', 'file_size': _images.first.length});
      } catch (_) {
        // Le texte est enregistré même si le fichier d'origine ne peut pas être conservé.
      }
      if (_jobId != null) {
        await _repo.finishOcrJob(_jobId!, {'status': 'done', 'document_id': doc.id}).catchError((_) {});
      }
      if (!mounted) {
        return;
      }
      await Navigator.of(context).pushReplacement(MaterialPageRoute<void>(builder: (_) => EspaceEditorScreen(docId: doc.id, repository: _repo)));
    } catch (e) {
      if (mounted) {
        setState(() => _saving = false);
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
      }
    }
  }

  static const _steps = [('Prétraitement', Icons.tune_rounded), ('Reconnaissance IA', Icons.auto_awesome_rounded), ('Correction', Icons.spellcheck_rounded), ('Texte éditable', Icons.edit_note_rounded)];

  @override
  Widget build(BuildContext context) {
    final active = switch (_stage) { _Stage.pick => -1, _Stage.ready => 0, _Stage.working => 1, _Stage.done => 3 };
    return Scaffold(
      backgroundColor: SignatureTheme.appBackground,
      appBar: AppBar(
        backgroundColor: SignatureTheme.appBackground,
        surfaceTintColor: Colors.transparent,
        title: const Text('Numériser & extraire', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 17)),
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 4, 16, 32),
        children: [
          SizedBox(
            height: 62,
            child: ListView(
              scrollDirection: Axis.horizontal,
              children: [
                for (final (i, s) in _steps.indexed)
                  Container(
                    width: 150,
                    margin: const EdgeInsets.only(right: 8),
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: SignatureTheme.surface,
                      borderRadius: BorderRadius.circular(SignatureTheme.radiusSmall + 4),
                      border: Border.all(color: i == active && _stage == _Stage.working ? SignatureTheme.gold : SignatureTheme.hairline),
                    ),
                    child: Row(
                      children: [
                        CircleAvatar(
                          radius: 13,
                          backgroundColor: i < active || _stage == _Stage.done ? SignatureTheme.sage : i == active ? SignatureTheme.gold : SignatureTheme.surfaceAlt,
                          child: i < active || _stage == _Stage.done
                              ? const Icon(Icons.check_rounded, size: 15, color: Colors.white)
                              : Icon(s.$2, size: 14, color: i == active ? Colors.white : SignatureTheme.muted),
                        ),
                        const SizedBox(width: 8),
                        Expanded(child: Text(s.$1, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w800))),
                      ],
                    ),
                  ),
              ],
            ),
          ),
          const SizedBox(height: 14),
          if (_error != null)
            Container(
              padding: const EdgeInsets.all(12),
              margin: const EdgeInsets.only(bottom: 12),
              decoration: BoxDecoration(color: SignatureTheme.clayTint, borderRadius: BorderRadius.circular(SignatureTheme.radiusSmall + 4), border: Border.all(color: SignatureTheme.clay)),
              child: Text(_error!, key: const ValueKey('scan-error'), style: const TextStyle(fontSize: 13, color: SignatureTheme.clay, fontWeight: FontWeight.w600)),
            ),
          if (_stage == _Stage.pick) _picker_(),
          if (_stage == _Stage.ready || _stage == _Stage.working) _ready(),
          if (_stage == _Stage.done) _result(),
        ],
      ),
    );
  }

  Widget _picker_() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 22, vertical: 40),
      decoration: BoxDecoration(color: Colors.white70, borderRadius: BorderRadius.circular(SignatureTheme.radiusLarge), border: Border.all(color: SignatureTheme.hairlineStrong)),
      child: Column(
        children: [
          Container(width: 64, height: 64, decoration: BoxDecoration(color: SignatureTheme.goldTint, borderRadius: BorderRadius.circular(22)), child: const Icon(Icons.document_scanner_rounded, size: 32, color: SignatureTheme.goldDeep)),
          const SizedBox(height: 14),
          const Text('Photographiez ou choisissez vos pages', textAlign: TextAlign.center, style: TextStyle(fontFamily: 'Fraunces', fontSize: 20, fontWeight: FontWeight.w600)),
          const SizedBox(height: 6),
          const Text('Jusqu’à 12 images (JPEG, PNG). Pour un PDF, utilisez fitila.bj/espace.', textAlign: TextAlign.center, style: TextStyle(fontSize: 12.5, color: SignatureTheme.muted)),
          const SizedBox(height: 20),
          Wrap(
            spacing: 10,
            runSpacing: 10,
            alignment: WrapAlignment.center,
            children: [
              FilledButton.icon(key: const ValueKey('scan-camera'), onPressed: () => _pick(camera: true), icon: const Icon(Icons.photo_camera_rounded), label: const Text('Photographier'), style: FilledButton.styleFrom(backgroundColor: SignatureTheme.gold, foregroundColor: const Color(0xFF2B2110))),
              OutlinedButton.icon(key: const ValueKey('scan-gallery'), onPressed: () => _pick(camera: false), icon: const Icon(Icons.photo_library_rounded), label: const Text('Galerie')),
            ],
          ),
        ],
      ),
    );
  }

  Widget _ready() {
    final working = _stage == _Stage.working;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        SizedBox(
          height: 230,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            itemCount: _images.length,
            separatorBuilder: (_, _) => const SizedBox(width: 10),
            itemBuilder: (_, i) => ClipRRect(borderRadius: BorderRadius.circular(SignatureTheme.radiusSmall + 4), child: Image.memory(_images[i], fit: BoxFit.cover, width: 170)),
          ),
        ),
        const SizedBox(height: 14),
        SegmentedButton<String>(
          segments: const [ButtonSegment(value: 'printed', label: Text('Imprimé / scanné')), ButtonSegment(value: 'handwritten', label: Text('Manuscrit'))],
          selected: {_mode},
          onSelectionChanged: working ? null : (s) => setState(() => _mode = s.first),
        ),
        const SizedBox(height: 14),
        FilledButton.icon(
          key: const ValueKey('scan-run'),
          onPressed: working ? null : _run,
          icon: working ? const SizedBox.square(dimension: 18, child: CircularProgressIndicator(strokeWidth: 2)) : const Icon(Icons.auto_fix_high_rounded),
          label: Text(working ? 'Reconnaissance en cours…' : 'Extraire le texte'),
          style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(52), backgroundColor: SignatureTheme.gold, foregroundColor: const Color(0xFF2B2110)),
        ),
        TextButton(onPressed: working ? null : () => setState(() { _images.clear(); _stage = _Stage.pick; }), child: const Text('Changer d’images')),
      ],
    );
  }

  Widget _result() {
    final conf = (_confidence * 100).round();
    final tone = conf >= 80 ? SignatureTheme.sage : conf >= 55 ? SignatureTheme.goldDeep : SignatureTheme.clay;
    final toneBg = conf >= 80 ? SignatureTheme.sageTint : conf >= 55 ? SignatureTheme.goldTint : SignatureTheme.clayTint;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        TextField(controller: _title, decoration: const InputDecoration(labelText: 'Titre du document')),
        const SizedBox(height: 10),
        Wrap(
          spacing: 8,
          runSpacing: 6,
          children: [
            Chip(label: Text('Confiance $conf %'), backgroundColor: toneBg, side: BorderSide.none, labelStyle: TextStyle(color: tone, fontWeight: FontWeight.w800, fontSize: 12)),
            Chip(label: Text(_engineName), backgroundColor: SignatureTheme.surfaceAlt, side: BorderSide.none, labelStyle: const TextStyle(fontSize: 12)),
            if (_corrections > 0) Chip(label: Text('$_corrections correction${_corrections > 1 ? 's' : ''} par le dictionnaire'), backgroundColor: SignatureTheme.goldTint, side: BorderSide.none, labelStyle: const TextStyle(color: SignatureTheme.goldDeep, fontSize: 12, fontWeight: FontWeight.w700)),
          ],
        ),
        const SizedBox(height: 10),
        TextField(
          key: const ValueKey('scan-text'),
          controller: _text,
          minLines: 8,
          maxLines: 16,
          style: const TextStyle(fontSize: 16, height: 1.6),
          decoration: InputDecoration(
            hintText: 'Texte extrait…',
            suffixIcon: IconButton(tooltip: 'Clavier Bàátɔ̀nú', icon: const Icon(Icons.keyboard_alt_rounded, color: SignatureTheme.goldDeep), onPressed: () => showBaribaKeyboardSheet(context, _text)),
          ),
        ),
        const SizedBox(height: 14),
        FilledButton.icon(
          key: const ValueKey('scan-save'),
          onPressed: _saving ? null : _save,
          icon: _saving ? const SizedBox.square(dimension: 18, child: CircularProgressIndicator(strokeWidth: 2)) : const Icon(Icons.save_alt_rounded),
          label: const Text('Enregistrer dans l’Espace'),
          style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(52), backgroundColor: SignatureTheme.gold, foregroundColor: const Color(0xFF2B2110)),
        ),
      ],
    );
  }
}
