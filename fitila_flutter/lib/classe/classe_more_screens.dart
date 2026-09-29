import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../core/fitila_language.dart';
import '../core/signature_theme.dart';
import '../core/web_parity_models.dart';
import '../keyboard/bariba_input.dart';
import 'classe_content.dart';
import 'classe_lookup.dart';
import 'classe_session.dart';
import 'classe_store.dart';
import 'classe_widgets.dart';

String _t(String ba, String fr) => FitilaLanguage.isBariba && ba.isNotEmpty ? ba : (fr.isNotEmpty ? fr : ba);

/// Sélecteur FR / BA des contenus bilingues.
class _LangToggle extends StatelessWidget {
  const _LangToggle();

  @override
  Widget build(BuildContext context) => ValueListenableBuilder<String>(
    valueListenable: FitilaLanguage.current,
    builder: (context, lang, _) => SegmentedButton<String>(
      showSelectedIcon: false,
      style: const ButtonStyle(visualDensity: VisualDensity.compact),
      segments: const [ButtonSegment(value: 'fr', label: Text('FR')), ButtonSegment(value: 'ba', label: Text('BA'))],
      selected: {lang},
      onSelectionChanged: (s) => FitilaLanguage.set(s.first),
    ),
  );
}

// ═════════════════════════════ GRAMMAIRE N2 ═════════════════════════════

class ClasseGrammarScreen extends StatefulWidget {
  const ClasseGrammarScreen({super.key, required this.session, required this.content, required this.onBack});

  final ClasseSession session;
  final ClasseContent content;
  final VoidCallback onBack;

  @override
  State<ClasseGrammarScreen> createState() => _ClasseGrammarScreenState();
}

class _ClasseGrammarScreenState extends State<ClasseGrammarScreen> {
  int? _open;
  final Map<String, int> _picked = {};

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<String>(
      valueListenable: FitilaLanguage.current,
      builder: (context, _, _) => _open == null ? _list() : _detail(_open!),
    );
  }

  Widget _list() => ListView(
    children: [
      ClasseHeader(title: '📐 Grammaire', onBack: widget.onBack, level: 'N2', trailing: const _LangToggle()),
      for (var i = 0; i < widget.content.grammar.length; i++)
        Padding(
          padding: const EdgeInsets.only(bottom: 8),
          child: Material(
            color: SignatureTheme.surface,
            borderRadius: BorderRadius.circular(18),
            child: InkWell(
              key: ValueKey('grammar-$i'),
              borderRadius: BorderRadius.circular(18),
              onTap: () => setState(() => _open = i),
              child: Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(borderRadius: BorderRadius.circular(18), border: Border.all(color: SignatureTheme.hairline)),
                child: Row(children: [
                  Container(width: 46, height: 46, alignment: Alignment.center, decoration: BoxDecoration(color: SignatureTheme.sageTint, borderRadius: BorderRadius.circular(14)), child: Text(widget.content.grammar[i].emoji, style: const TextStyle(fontSize: 22))),
                  const SizedBox(width: 12),
                  Expanded(child: Text(_t(widget.content.grammar[i].title, widget.content.grammar[i].titleFr), style: const TextStyle(fontWeight: FontWeight.w700))),
                  const Icon(Icons.chevron_right_rounded, color: SignatureTheme.muted),
                ]),
              ),
            ),
          ),
        ),
    ],
  );

  Widget _block(int n, int bi, Map<String, dynamic> b) {
    final type = b['type'];
    final title = _t((b['title'] as String?) ?? '', (b['titleFr'] as String?) ?? (b['title'] as String?) ?? '');
    Widget head() => Row(children: [
      Expanded(child: Text(title, style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 14.5))),
      ClasseListenButton(contentKey: ClasseKeys.grammar(n, 'block/$bi/content'), audio: widget.session.audio, size: 32),
    ]);
    switch (type) {
      case 'table':
        final headers = [for (final h in (b['headers'] as List? ?? const [])) h.toString()];
        final rows = [for (final r in (b['rows'] as List? ?? const [])) [for (final c in (r as List)) c.toString()]];
        return ClasseBox(
          margin: const EdgeInsets.only(bottom: 10),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            head(),
            const SizedBox(height: 8),
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: DataTable(
                headingRowHeight: 38,
                dataRowMinHeight: 38,
                dataRowMaxHeight: 64,
                headingRowColor: WidgetStatePropertyAll(SignatureTheme.goldTint.withValues(alpha: .6)),
                columns: [for (final h in headers) DataColumn(label: Text(h, style: const TextStyle(fontWeight: FontWeight.w800)))],
                rows: [for (final r in rows) DataRow(cells: [for (final c in r) DataCell(ConstrainedBox(constraints: const BoxConstraints(maxWidth: 240), child: Text(c)))])],
              ),
            ),
          ]),
        );
      case 'list':
        return ClasseBox(
          margin: const EdgeInsets.only(bottom: 10),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            head(),
            const SizedBox(height: 6),
            for (final it in (b['items'] as List? ?? const [])) Padding(padding: const EdgeInsets.only(bottom: 4), child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [const Text('•  '), Expanded(child: Text(it.toString(), style: const TextStyle(height: 1.4)))])),
          ]),
        );
      default:
        final content = _t((b['content'] as String?) ?? '', (b['contentFr'] as String?) ?? (b['content'] as String?) ?? '');
        return ClasseBox(
          margin: const EdgeInsets.only(bottom: 10),
          color: type == 'example' ? SignatureTheme.goldTint.withValues(alpha: .4) : null,
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [head(), const SizedBox(height: 6), SelectableText(content, style: const TextStyle(height: 1.5, fontSize: 14.5, color: SignatureTheme.inkSoft))]),
        );
    }
  }

  Widget _detail(int idx) {
    final s = widget.content.grammar[idx];
    final n = idx + 1;
    return ListView(
      key: ValueKey('grammar-detail-$idx'),
      children: [
        ClasseHeader(title: _t(s.title, s.titleFr), onBack: () => setState(() => _open = null), level: 'N2', trailing: const _LangToggle()),
        for (var bi = 0; bi < s.blocks.length; bi++) _block(n, bi, s.blocks[bi]),
        if (s.quiz.isNotEmpty) ...[
          const Padding(padding: EdgeInsets.fromLTRB(4, 10, 4, 8), child: Text('🧠 Quiz', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 16))),
          for (var qi = 0; qi < s.quiz.length; qi++) _quiz(n, qi, s.quiz[qi]),
        ],
        const SizedBox(height: 20),
      ],
    );
  }

  Widget _quiz(int n, int qi, GrammarQuiz q) {
    final key = '$n|$qi';
    final picked = _picked[key];
    return ClasseBox(
      margin: const EdgeInsets.only(bottom: 10),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(children: [
            Expanded(child: Text(_t(q.question, q.questionFr), style: const TextStyle(fontWeight: FontWeight.w700, height: 1.4))),
            ClasseListenButton(contentKey: ClasseKeys.grammar(n, 'quiz/$qi/q'), audio: widget.session.audio, size: 32),
          ]),
          const SizedBox(height: 8),
          for (var oi = 0; oi < q.options.length; oi++)
            Padding(
              padding: const EdgeInsets.only(bottom: 6),
              child: Material(
                color: picked == null ? SignatureTheme.appBackground : oi == q.correct ? SignatureTheme.sageTint : (picked == oi ? SignatureTheme.clayTint : SignatureTheme.appBackground),
                borderRadius: BorderRadius.circular(12),
                child: InkWell(
                  key: ValueKey('quiz-$n-$qi-$oi'),
                  borderRadius: BorderRadius.circular(12),
                  onTap: picked != null ? null : () => setState(() => _picked[key] = oi),
                  child: Padding(
                    padding: const EdgeInsets.all(12),
                    child: Row(children: [
                      Expanded(child: Text(q.options[oi], style: const TextStyle(fontWeight: FontWeight.w600))),
                      if (picked != null && oi == q.correct) const Icon(Icons.check_circle_rounded, color: SignatureTheme.sage, size: 20),
                      if (picked != null && picked == oi && oi != q.correct) const Icon(Icons.cancel_rounded, color: SignatureTheme.clay, size: 20),
                    ]),
                  ),
                ),
              ),
            ),
          if (picked != null) ...[
            const SizedBox(height: 4),
            Row(children: [
              Expanded(child: Text(_t(q.explanation, q.explanationFr), style: const TextStyle(fontSize: 12.5, color: SignatureTheme.inkSoft, height: 1.4))),
              ClasseListenButton(contentKey: ClasseKeys.grammar(n, 'quiz/$qi/answer'), audio: widget.session.audio, size: 30),
            ]),
            TextButton(onPressed: () => setState(() => _picked.remove(key)), child: const Text('Recommencer')),
          ],
        ],
      ),
    );
  }
}

// ═════════════════════════════ PRODUCTION DE TEXTES N2 ═════════════════════════════

class ClasseTextProdScreen extends StatefulWidget {
  const ClasseTextProdScreen({super.key, required this.session, required this.content, required this.onBack});

  final ClasseSession session;
  final ClasseContent content;
  final VoidCallback onBack;

  @override
  State<ClasseTextProdScreen> createState() => _ClasseTextProdScreenState();
}

class _ClasseTextProdScreenState extends State<ClasseTextProdScreen> {
  int? _open;
  String _tab = 'def';
  Map<String, StudentAnswer> _answers = {};
  bool _loading = false;
  final Map<String, String> _live = {};

  Future<void> _openType(int i) async {
    final t = widget.content.textProd[i];
    setState(() {
      _open = i;
      _tab = 'def';
      _loading = true;
      _live.clear();
    });
    try {
      final a = await widget.session.store.loadAnswers(level: 'N2', module: 'textprod', lessonId: t.id);
      if (!mounted) return;
      setState(() {
        _answers = a;
        _loading = false;
      });
    } catch (_) {
      if (mounted) setState(() { _answers = {}; _loading = false; });
    }
  }

  @override
  Widget build(BuildContext context) => ValueListenableBuilder<String>(valueListenable: FitilaLanguage.current, builder: (context, _, _) => _open == null ? _list() : _detail(widget.content.textProd[_open!], _open! + 1));

  Widget _list() => ListView(children: [
    ClasseHeader(title: '✍️ Production de textes', onBack: widget.onBack, level: 'N2', trailing: const _LangToggle()),
    for (var i = 0; i < widget.content.textProd.length; i++)
      Padding(
        padding: const EdgeInsets.only(bottom: 8),
        child: Material(
          color: SignatureTheme.surface,
          borderRadius: BorderRadius.circular(18),
          child: InkWell(
            key: ValueKey('textprod-$i'),
            borderRadius: BorderRadius.circular(18),
            onTap: () => _openType(i),
            child: Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(borderRadius: BorderRadius.circular(18), border: Border.all(color: SignatureTheme.hairline)),
              child: Row(children: [
                Container(width: 46, height: 46, alignment: Alignment.center, decoration: BoxDecoration(color: SignatureTheme.clayTint, borderRadius: BorderRadius.circular(14)), child: Text(widget.content.textProd[i].emoji, style: const TextStyle(fontSize: 22))),
                const SizedBox(width: 12),
                Expanded(child: Text(_t(widget.content.textProd[i].title, widget.content.textProd[i].titleFr), style: const TextStyle(fontWeight: FontWeight.w700))),
                const Icon(Icons.chevron_right_rounded, color: SignatureTheme.muted),
              ]),
            ),
          ),
        ),
      ),
  ]);

  Widget _detail(TextProdType t, int n) {
    final tabs = [('def', '📘 Définition'), ('ex', '👁️ Exemple'), ('practice', '✍️ Pratique')];
    return ListView(
      key: ValueKey('textprod-detail-${t.id}'),
      children: [
        ClasseHeader(title: _t(t.title, t.titleFr), onBack: () => setState(() => _open = null), level: 'N2', trailing: const _LangToggle()),
        SizedBox(
          height: 44,
          child: ListView(scrollDirection: Axis.horizontal, children: [
            for (final x in tabs)
              Padding(padding: const EdgeInsets.only(right: 8), child: ChoiceChip(key: ValueKey('tp-tab-${x.$1}'), label: Text(x.$2), selected: _tab == x.$1, selectedColor: SignatureTheme.goldTint, onSelected: (_) => setState(() => _tab = x.$1))),
          ]),
        ),
        const SizedBox(height: 10),
        if (_tab == 'def') ...[
          ClasseBox(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Row(children: [const Expanded(child: Text('Définition', style: TextStyle(fontWeight: FontWeight.w900))), ClasseListenButton(contentKey: ClasseKeys.textProd(n, 'definition'), audio: widget.session.audio, size: 32)]),
            const SizedBox(height: 6),
            Text(_t(t.definition, t.definitionFr), style: const TextStyle(height: 1.5)),
          ])),
          const SizedBox(height: 10),
          ClasseBox(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            const Text('Caractéristiques', style: TextStyle(fontWeight: FontWeight.w900)),
            const SizedBox(height: 6),
            for (var i = 0; i < t.characteristics.length; i++)
              Padding(padding: const EdgeInsets.only(bottom: 6), child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text('${i + 1}. ', style: const TextStyle(fontWeight: FontWeight.w900, color: SignatureTheme.goldDeep)),
                Expanded(child: Text(FitilaLanguage.isBariba ? t.characteristics[i] : (i < t.characteristicsFr.length ? t.characteristicsFr[i] : t.characteristics[i]))),
                ClasseListenButton(contentKey: ClasseKeys.textProd(n, 'characteristic/$i'), audio: widget.session.audio, size: 28),
              ])),
          ])),
        ],
        if (_tab == 'ex')
          ClasseBox(color: SignatureTheme.goldTint.withValues(alpha: .4), child: SelectableText(_t(t.example, t.exampleFr), style: const TextStyle(height: 1.6))),
        if (_tab == 'practice') ...[
          ClasseBox(color: const Color(0xFFE5E1FA), child: Row(children: [
            Expanded(child: Text(_t(t.exercisePrompt, t.exercisePromptFr), style: const TextStyle(fontWeight: FontWeight.w600, height: 1.4))),
            ClasseListenButton(contentKey: ClasseKeys.textProd(n, 'exercise'), audio: widget.session.audio, size: 32),
          ])),
          const SizedBox(height: 10),
          if (_loading) const Center(child: Padding(padding: EdgeInsets.all(24), child: CircularProgressIndicator())),
          if (!_loading)
            for (var i = 0; i < t.structure.length; i++)
              ClasseAnswerCard(
                key: ValueKey('tp-${t.id}-${t.structure[i].key}'),
                store: widget.session.store,
                audio: widget.session.audio,
                level: 'N2',
                module: 'textprod',
                lessonId: t.id,
                sectionKey: t.structure[i].key,
                questionIdx: i,
                question: _t(t.structure[i].label, t.structure[i].labelFr),
                label: '${i + 1}',
                minLines: t.structure[i].long ? 4 : 2,
                hint: t.structure[i].placeholder,
                initial: _answers['${t.structure[i].key}|$i'],
                draft: widget.session.drafts,
                onSaved: (a) => setState(() => _live[t.structure[i].key] = a.text ?? ''),
              ),
          if (!_loading && (_live.values.any((v) => v.trim().isNotEmpty) || _answers.values.any((a) => a.hasContent)))
            ClasseBox(
              borderColor: SignatureTheme.gold,
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                const Text('👁️ Aperçu complet', style: TextStyle(fontWeight: FontWeight.w900)),
                const SizedBox(height: 6),
                for (var i = 0; i < t.structure.length; i++)
                  if ((_live[t.structure[i].key] ?? _answers['${t.structure[i].key}|$i']?.text ?? '').trim().isNotEmpty)
                    Padding(padding: const EdgeInsets.only(bottom: 4), child: Text.rich(TextSpan(children: [TextSpan(text: '${_t(t.structure[i].label, t.structure[i].labelFr)} : ', style: const TextStyle(fontWeight: FontWeight.w800, color: SignatureTheme.muted)), TextSpan(text: _live[t.structure[i].key] ?? _answers['${t.structure[i].key}|$i']!.text)]))),
                const SizedBox(height: 6),
                OutlinedButton.icon(
                  onPressed: () {
                    final buf = StringBuffer();
                    for (var i = 0; i < t.structure.length; i++) {
                      final v = _live[t.structure[i].key] ?? _answers['${t.structure[i].key}|$i']?.text ?? '';
                      if (v.trim().isNotEmpty) buf.writeln(v);
                    }
                    Clipboard.setData(ClipboardData(text: buf.toString()));
                    ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Texte copié')));
                  },
                  icon: const Icon(Icons.copy_rounded, size: 18),
                  label: const Text('Copier le texte'),
                ),
              ]),
            ),
        ],
        const SizedBox(height: 20),
      ],
    );
  }
}

// ═════════════════════════════ GESTION N2 ═════════════════════════════

class ClasseGestionScreen extends StatefulWidget {
  const ClasseGestionScreen({super.key, required this.session, required this.content, required this.onBack});

  final ClasseSession session;
  final ClasseContent content;
  final VoidCallback onBack;

  @override
  State<ClasseGestionScreen> createState() => _ClasseGestionScreenState();
}

class _ClasseGestionScreenState extends State<ClasseGestionScreen> {
  int? _open;
  String _tab = 'form';
  Map<String, StudentAnswer> _answers = {};
  Map<String, AnswerKey> _keys = {};
  bool _loading = false;
  final Map<String, TextEditingController> _ctrls = {};
  bool _saving = false;

  @override
  void dispose() {
    for (final c in _ctrls.values) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> _openDoc(int i) async {
    final g = widget.content.gestion[i];
    for (final c in _ctrls.values) {
      c.dispose();
    }
    _ctrls.clear();
    setState(() {
      _open = i;
      _tab = 'form';
      _loading = true;
    });
    try {
      final r = await Future.wait([
        widget.session.store.loadAnswers(level: 'N2', module: 'gestion', lessonId: g.id),
        widget.session.store.loadAnswerKeys(level: 'N2', module: 'gestion', lessonId: g.id),
      ]);
      if (!mounted) return;
      _answers = r[0] as Map<String, StudentAnswer>;
      _keys = r[1] as Map<String, AnswerKey>;
    } catch (_) {
      _answers = {};
      _keys = {};
    }
    final saved = _answers['form|0']?.fieldData ?? const {};
    for (final f in g.fields) {
      _ctrls[f.key] = TextEditingController(text: (saved[f.key] ?? widget.session.drafts['g|${g.id}|${f.key}'] ?? '').toString())..addListener(() => widget.session.drafts['g|${g.id}|${f.key}'] = _ctrls[f.key]!.text);
    }
    if (mounted) setState(() => _loading = false);
  }

  Future<void> _saveForm(GestionDoc g) async {
    if (widget.session.store.userId == null) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Connectez-vous pour enregistrer votre document.')));
      return;
    }
    setState(() => _saving = true);
    try {
      final saved = await widget.session.store.saveAnswer(StudentAnswer(level: 'N2', module: 'gestion', lessonId: g.id, sectionKey: 'form', questionIdx: 0, fieldData: {for (final e in _ctrls.entries) e.key: e.value.text.trim()}));
      if (!mounted) return;
      setState(() => _answers = {..._answers, saved.slot: saved});
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('✓ Document enregistré')));
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Enregistrement impossible : ${e.toString().replaceFirst('Bad state: ', '')}')));
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) => ValueListenableBuilder<String>(valueListenable: FitilaLanguage.current, builder: (context, _, _) => _open == null ? _list() : _detail(widget.content.gestion[_open!], _open! + 1));

  Widget _list() => ListView(children: [
    ClasseHeader(title: '💼 Gestion', onBack: widget.onBack, level: 'N2', trailing: const _LangToggle()),
    for (var i = 0; i < widget.content.gestion.length; i++)
      Padding(
        padding: const EdgeInsets.only(bottom: 8),
        child: Material(
          color: SignatureTheme.surface,
          borderRadius: BorderRadius.circular(18),
          child: InkWell(
            key: ValueKey('gestion-$i'),
            borderRadius: BorderRadius.circular(18),
            onTap: () => _openDoc(i),
            child: Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(borderRadius: BorderRadius.circular(18), border: Border.all(color: SignatureTheme.hairline)),
              child: Row(children: [
                Container(width: 46, height: 46, alignment: Alignment.center, decoration: BoxDecoration(color: SignatureTheme.sageTint, borderRadius: BorderRadius.circular(14)), child: Text(widget.content.gestion[i].emoji, style: const TextStyle(fontSize: 22))),
                const SizedBox(width: 12),
                Expanded(child: Text(_t(widget.content.gestion[i].title, widget.content.gestion[i].titleFr), style: const TextStyle(fontWeight: FontWeight.w700))),
                const Icon(Icons.chevron_right_rounded, color: SignatureTheme.muted),
              ]),
            ),
          ),
        ),
      ),
  ]);

  Widget _detail(GestionDoc g, int n) {
    return ListView(
      key: ValueKey('gestion-detail-${g.id}'),
      children: [
        ClasseHeader(title: _t(g.title, g.titleFr), onBack: () => setState(() => _open = null), level: 'N2', trailing: const _LangToggle()),
        ClasseBox(child: Row(children: [Expanded(child: Text(_t(g.definition, g.definitionFr), style: const TextStyle(height: 1.5))), ClasseListenButton(contentKey: ClasseKeys.gestion(n, 'definition'), audio: widget.session.audio, size: 34)])),
        const SizedBox(height: 10),
        SizedBox(
          height: 44,
          child: ListView(scrollDirection: Axis.horizontal, children: [
            for (final x in [('form', '📝 Formulaire'), ('qa', '❓ Questions'), ('ex', '👁️ Exemple')])
              Padding(padding: const EdgeInsets.only(right: 8), child: ChoiceChip(key: ValueKey('g-tab-${x.$1}'), label: Text(x.$2), selected: _tab == x.$1, selectedColor: SignatureTheme.goldTint, onSelected: (_) => setState(() => _tab = x.$1))),
          ]),
        ),
        const SizedBox(height: 10),
        if (_loading) const Center(child: Padding(padding: EdgeInsets.all(24), child: CircularProgressIndicator())),
        if (!_loading && _tab == 'form')
          ClasseBox(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              for (var i = 0; i < g.fields.length; i++)
                Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Row(children: [
                      Expanded(child: Text(_t(g.fields[i].label, g.fields[i].labelFr), style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 13))),
                      ClasseListenButton(contentKey: ClasseKeys.gestion(n, 'field/$i'), audio: widget.session.audio, size: 28),
                    ]),
                    const SizedBox(height: 4),
                    BaribaTextField(controller: _ctrls[g.fields[i].key]!, minLines: g.fields[i].long ? 3 : 1, maxLines: g.fields[i].long ? 6 : 2, decoration: InputDecoration(hintText: g.fields[i].placeholder, isDense: true)),
                  ]),
                ),
              Row(children: [
                Expanded(
                  child: FilledButton.icon(
                    key: const ValueKey('gestion-save'),
                    onPressed: _saving ? null : () => _saveForm(g),
                    icon: _saving ? const SizedBox.square(dimension: 16, child: CircularProgressIndicator(strokeWidth: 2)) : const Icon(Icons.save_rounded),
                    label: const Text('Enregistrer'),
                    style: FilledButton.styleFrom(backgroundColor: SignatureTheme.gold, foregroundColor: const Color(0xFF2B2110)),
                  ),
                ),
                const SizedBox(width: 8),
                OutlinedButton(
                  onPressed: () => setState(() {
                    g.example.forEach((k, v) => _ctrls[k]?.text = v);
                  }),
                  child: const Text('Utiliser l’exemple'),
                ),
              ]),
              if (_answers['form|0']?.graded == true) ClasseGradePanel(answer: _answers['form|0']!, audio: widget.session.audio),
            ]),
          ),
        if (!_loading && _tab == 'qa')
          for (var i = 0; i < g.questions.length; i++)
            ClasseAnswerCard(
              key: ValueKey('gqa-${g.id}-$i'),
              store: widget.session.store,
              audio: widget.session.audio,
              level: 'N2',
              module: 'gestion',
              lessonId: g.id,
              sectionKey: 'qa',
              questionIdx: i,
              question: _t(g.questions[i].ba, g.questions[i].fr),
              audioKey: ClasseKeys.gestion(n, 'qa/$i'),
              initial: _answers['qa|$i'],
              answerKey: _keys['qa|$i'],
              draft: widget.session.drafts,
            ),
        if (_tab == 'ex')
          ClasseBox(
            color: SignatureTheme.goldTint.withValues(alpha: .4),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              for (final f in g.fields)
                if ((g.example[f.key] ?? '').isNotEmpty) Padding(padding: const EdgeInsets.only(bottom: 6), child: Text.rich(TextSpan(children: [TextSpan(text: '${_t(f.label, f.labelFr)} : ', style: const TextStyle(fontWeight: FontWeight.w800)), TextSpan(text: g.example[f.key])]))),
            ]),
          ),
        const SizedBox(height: 20),
      ],
    );
  }
}

// ═════════════════════════════ MES CORRECTIONS ═════════════════════════════

class ClasseCorrectionsScreen extends StatefulWidget {
  const ClasseCorrectionsScreen({super.key, required this.session, required this.content, required this.lessons, required this.onBack});

  final ClasseSession session;
  final ClasseContent content;
  final List<WebClasseLesson> lessons;
  final VoidCallback onBack;

  @override
  State<ClasseCorrectionsScreen> createState() => _ClasseCorrectionsScreenState();
}

class _ClasseCorrectionsScreenState extends State<ClasseCorrectionsScreen> {
  List<StudentAnswer>? _graded;
  int _pending = 0;
  String? _error;
  String _module = 'all';

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    if (widget.session.store.userId == null) {
      setState(() => _graded = const []);
      return;
    }
    try {
      final r = await Future.wait([widget.session.store.loadGraded(), widget.session.store.pendingCount()]);
      if (!mounted) return;
      setState(() {
        _graded = r[0] as List<StudentAnswer>;
        _pending = r[1] as int;
        _error = null;
      });
    } catch (_) {
      if (mounted) setState(() { _graded ??= const []; _error = 'Impossible de charger vos corrections. Tirez pour réessayer.'; });
    }
  }

  @override
  Widget build(BuildContext context) {
    final graded = _graded;
    final visible = graded == null ? const <StudentAnswer>[] : [for (final a in graded) if (_module == 'all' || a.module == _module) a];
    final modules = graded == null ? const <String>[] : (graded.map((a) => a.module).toSet().toList()..sort());
    final avg = averageGrade(visible);
    return RefreshIndicator(
      onRefresh: _load,
      color: SignatureTheme.gold,
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        children: [
          ClasseHeader(title: '✅ Mes corrections', onBack: widget.onBack),
          if (widget.session.store.userId == null)
            const ClasseBox(child: Text('Connectez-vous pour voir vos notes et les commentaires de votre enseignant.'))
          else if (graded == null)
            const Center(child: Padding(padding: EdgeInsets.all(40), child: CircularProgressIndicator()))
          else ...[
            if (_error != null) Padding(padding: const EdgeInsets.only(bottom: 10), child: Text(_error!, style: const TextStyle(color: SignatureTheme.clay))),
            Row(children: [
              Expanded(child: _stat(avg == null ? '—' : '${avg.toStringAsFixed(1)}/20', avg == null ? 'Moyenne' : appreciationFor(avg), avg == null ? SignatureTheme.muted : gradeColor(avg))),
              const SizedBox(width: 8),
              Expanded(child: _stat('${visible.length}', 'Corrigées', SignatureTheme.sage)),
              const SizedBox(width: 8),
              Expanded(child: _stat('$_pending', 'En attente', SignatureTheme.goldDeep)),
            ]),
            const SizedBox(height: 12),
            if (modules.length > 1)
              SizedBox(
                height: 42,
                child: ListView(scrollDirection: Axis.horizontal, children: [
                  for (final m in ['all', ...modules])
                    Padding(padding: const EdgeInsets.only(right: 8), child: ChoiceChip(label: Text(m == 'all' ? 'Tout' : moduleLabel(m)), selected: _module == m, selectedColor: SignatureTheme.goldTint, onSelected: (_) => setState(() => _module = m))),
                ]),
              ),
            const SizedBox(height: 8),
            if (visible.isEmpty)
              const ClasseBox(child: Column(children: [Icon(Icons.hourglass_empty_rounded, color: SignatureTheme.goldDeep, size: 34), SizedBox(height: 8), Text('Aucune réponse corrigée pour l’instant.', style: TextStyle(fontWeight: FontWeight.w700)), SizedBox(height: 4), Text('Dès que votre enseignant corrige une réponse, sa note et son commentaire apparaissent ici.', textAlign: TextAlign.center, style: TextStyle(color: SignatureTheme.muted, fontSize: 12.5))]))
            else
              for (final a in visible) _item(a),
          ],
        ],
      ),
    );
  }

  Widget _stat(String value, String label, Color color) => ClasseBox(
    padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 8),
    child: Column(children: [Text(value, style: TextStyle(fontSize: 19, fontWeight: FontWeight.w900, color: color)), const SizedBox(height: 2), Text(label, style: const TextStyle(fontSize: 11, color: SignatureTheme.muted, fontWeight: FontWeight.w700))]),
  );

  Widget _item(StudentAnswer a) {
    final d = describeAnswer(level: a.level, module: a.module, lessonId: a.lessonId, sectionKey: a.sectionKey, questionIdx: a.questionIdx, content: widget.content, lessons: widget.lessons);
    return ClasseBox(
      margin: const EdgeInsets.only(bottom: 10),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(d.where, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: SignatureTheme.goldDeep)),
          const SizedBox(height: 4),
          Text(d.question, style: const TextStyle(fontWeight: FontWeight.w700, height: 1.35)),
          const SizedBox(height: 8),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(color: SignatureTheme.appBackground, borderRadius: BorderRadius.circular(12)),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              if (a.text?.isNotEmpty ?? false) Text('Ma réponse : ${a.text}', style: const TextStyle(fontSize: 13.5, height: 1.4)),
              if (a.fieldData != null && a.fieldData!.isNotEmpty) Text(a.fieldData!.entries.where((e) => e.value.toString().isNotEmpty).map((e) => '${e.key} : ${e.value}').join('\n'), style: const TextStyle(fontSize: 13, height: 1.4)),
              if (a.audioPath != null) ClasseStoragePlayer(id: 'cs-${a.id}', bucket: 'classe-answers-audio', path: a.audioPath!, label: 'Ma réponse vocale', duration: a.audioDuration, audio: widget.session.audio),
            ]),
          ),
          ClasseGradePanel(answer: a, audio: widget.session.audio),
        ],
      ),
    );
  }
}

// ═════════════════════════════ FACILITATEUR ═════════════════════════════

class ClasseFacilitatorScreen extends StatefulWidget {
  const ClasseFacilitatorScreen({super.key, required this.level, required this.onBack, this.loader});

  final String level;
  final VoidCallback onBack;

  /// Injectable en test.
  final Future<Map<String, dynamic>> Function()? loader;

  @override
  State<ClasseFacilitatorScreen> createState() => _ClasseFacilitatorScreenState();
}

class _ClasseFacilitatorScreenState extends State<ClasseFacilitatorScreen> {
  late final Future<Map<String, dynamic>> _data = (widget.loader ?? () async => jsonDecode(await rootBundle.loadString('assets/data/classeFacilitator.json')) as Map<String, dynamic>)();
  String _view = 'langue';
  String? _openPhase;

  static const _domainsN1 = [
    ('🔢', 'Geetinu ka Dootinu', 'Numération : compter et écrire les nombres de 1 à 1000'),
    ('➕', 'Wɔkure (Sosibu)', 'Addition : sans et avec retenue'),
    ('➖', 'Wunɔɔre (Wĩabu)', 'Soustraction : sans et avec emprunt'),
    ('✖️', 'Dabiasiabu', 'Multiplication : par 1 et 2 chiffres'),
    ('➗', 'Bɔnu', 'Division : avec et sans reste'),
    ('💰', 'Doorun masini', 'Gestion : problèmes pratiques avec monnaie'),
  ];
  static const _domainsN2 = [
    ('🔢', 'Dootinu yibu (> 1000)', 'Numération avancée : milliers, nombres décimaux'),
    ('➕', 'Sosibu', 'Addition : grands nombres avec retenue'),
    ('➖', 'Wĩabu', 'Soustraction : emprunt et vérification'),
    ('✖️', 'Dabiasibu', 'Multiplication : par 2 et 3 chiffres'),
    ('➗', 'Bɔnu', 'Division : avec reste et preuve'),
    ('📏', 'Kiloo ka metiri', 'Mesures : kg, km, km², hectares'),
    ('💰', 'Yarumani dendibu', 'Gestion : budget, recette, dépense, bénéfice'),
  ];

  @override
  Widget build(BuildContext context) {
    final n2 = widget.level == 'N2';
    final tabs = [('langue', '📖 Lecture-Écriture'), ('calcul', '🧮 Calcul'), if (n2) ('grammaire', '📐 Grammaire N2'), ('planning', '📊 Planning'), ('andragogie', '🎓 Andragogie')];
    return ValueListenableBuilder<String>(
      valueListenable: FitilaLanguage.current,
      builder: (context, _, _) => FutureBuilder<Map<String, dynamic>>(
        future: _data,
        builder: (context, snap) {
          if (snap.hasError) {
            return Center(child: Text('Guide indisponible : ${snap.error}'));
          }
          final d = snap.data;
          return ListView(
            children: [
              ClasseHeader(title: '👨‍🏫 Guide pédagogique', onBack: widget.onBack, level: widget.level, trailing: const _LangToggle()),
              SizedBox(
                height: 44,
                child: ListView(scrollDirection: Axis.horizontal, children: [
                  for (final t in tabs) Padding(padding: const EdgeInsets.only(right: 8), child: ChoiceChip(key: ValueKey('fac-${t.$1}'), label: Text(t.$2), selected: _view == t.$1, selectedColor: n2 ? const Color(0xFFE5E1FA) : SignatureTheme.clayTint, onSelected: (_) => setState(() { _view = t.$1; _openPhase = null; }))),
                ]),
              ),
              const SizedBox(height: 10),
              if (d == null) const Center(child: Padding(padding: EdgeInsets.all(40), child: CircularProgressIndicator())) else ..._content(d, n2),
              const SizedBox(height: 20),
            ],
          );
        },
      ),
    );
  }

  List<Widget> _content(Map<String, dynamic> d, bool n2) {
    Map<String, dynamic> m(String k) => (d[k] as Map).cast<String, dynamic>();
    List<Map<String, dynamic>> l(String k) => [for (final e in (d[k] as List)) (e as Map).cast<String, dynamic>()];
    switch (_view) {
      case 'langue':
        final x = m(n2 ? 'DEMARCHE_N2_LANGUE' : 'DEMARCHE_LANGUE');
        return [Text(_t(x['title'] as String, x['titleFr'] as String), style: const TextStyle(fontWeight: FontWeight.w700)), const SizedBox(height: 10), ..._phases(x, n2)];
      case 'calcul':
        final x = m(n2 ? 'DEMARCHE_N2_CALCUL' : 'DEMARCHE_CALCUL');
        final domains = n2 ? _domainsN2 : _domainsN1;
        return [
          Text(_t(x['title'] as String, x['titleFr'] as String), style: const TextStyle(fontWeight: FontWeight.w700)),
          const SizedBox(height: 10),
          ..._phases(x, n2),
          ClasseBox(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              const Text('📐 Domaines du calcul', style: TextStyle(fontWeight: FontWeight.w900)),
              const SizedBox(height: 8),
              for (final e in domains) Padding(padding: const EdgeInsets.only(bottom: 8), child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [Text(e.$1, style: const TextStyle(fontSize: 20)), const SizedBox(width: 8), Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text(e.$2, style: const TextStyle(fontWeight: FontWeight.w800)), Text(e.$3, style: const TextStyle(fontSize: 12.5, color: SignatureTheme.muted))]))])),
            ]),
          ),
        ];
      case 'grammaire':
        return [for (final g in l('GRAMMAIRE_N2')) ClasseBox(margin: const EdgeInsets.only(bottom: 8), child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [Text(g['emoji'] as String, style: const TextStyle(fontSize: 22)), const SizedBox(width: 10), Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text(g['title'] as String, style: const TextStyle(fontWeight: FontWeight.w800)), const SizedBox(height: 2), Text(g['desc'] as String, style: const TextStyle(fontSize: 12.5, color: SignatureTheme.inkSoft, height: 1.4))]))]))];
      case 'planning':
        final rows = l(n2 ? 'PLANNING_N2' : 'PLANNING_N1');
        final stats = n2 ? (252, 23, 11) : (288, 48, 6);
        return [
          Row(children: [
            Expanded(child: _kpi('${stats.$1}', 'séances')),
            const SizedBox(width: 8),
            Expanded(child: _kpi('${stats.$2}', 'semaines')),
            const SizedBox(width: 8),
            Expanded(child: _kpi('${stats.$3}', 'par semaine')),
          ]),
          const SizedBox(height: 10),
          for (final r in rows)
            ClasseBox(margin: const EdgeInsets.only(bottom: 8), child: Row(children: [
              Container(padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6), decoration: BoxDecoration(color: SignatureTheme.goldTint, borderRadius: BorderRadius.circular(10)), child: Text('S ${r['weeks']}', style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 12))),
              const SizedBox(width: 10),
              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text('${r['theme']}', style: const TextStyle(fontWeight: FontWeight.w800)), Text('${r['content']} · ${r['sessions']} séances', style: const TextStyle(fontSize: 12, color: SignatureTheme.muted))])),
            ])),
        ];
      default:
        return [for (final a in l('ANDRAGOGIE')) ClasseBox(margin: const EdgeInsets.only(bottom: 8), child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [Text(a['emoji'] as String, style: const TextStyle(fontSize: 22)), const SizedBox(width: 10), Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text(a['title'] as String, style: const TextStyle(fontWeight: FontWeight.w800)), const SizedBox(height: 2), Text(a['desc'] as String, style: const TextStyle(fontSize: 12.5, color: SignatureTheme.inkSoft, height: 1.4))]))]))];
    }
  }

  Widget _kpi(String v, String label) => ClasseBox(padding: const EdgeInsets.symmetric(vertical: 12), child: Column(children: [Text(v, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w900)), Text(label, style: const TextStyle(fontSize: 11, color: SignatureTheme.muted))]));

  List<Widget> _phases(Map<String, dynamic> x, bool n2) {
    final phases = [for (final p in (x['phases'] as List)) (p as Map).cast<String, dynamic>()];
    return [
      for (final p in phases)
        Padding(
          padding: const EdgeInsets.only(bottom: 8),
          child: Column(children: [
            Material(
              color: SignatureTheme.surface,
              borderRadius: BorderRadius.circular(18),
              child: InkWell(
                key: ValueKey('phase-${p['id']}'),
                borderRadius: BorderRadius.circular(18),
                onTap: () => setState(() => _openPhase = _openPhase == p['id'] ? null : p['id'] as String),
                child: Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(borderRadius: BorderRadius.circular(18), border: Border.all(color: SignatureTheme.hairline)),
                  child: Row(children: [
                    Container(width: 40, height: 40, alignment: Alignment.center, decoration: BoxDecoration(color: n2 ? const Color(0xFFE5E1FA) : SignatureTheme.goldTint, borderRadius: BorderRadius.circular(12)), child: Text(p['emoji'] as String, style: const TextStyle(fontSize: 20))),
                    const SizedBox(width: 12),
                    Expanded(child: Text(_t(p['title'] as String, p['titleFr'] as String), style: const TextStyle(fontWeight: FontWeight.w800))),
                    Icon(_openPhase == p['id'] ? Icons.expand_less_rounded : Icons.expand_more_rounded),
                  ]),
                ),
              ),
            ),
            if (_openPhase == p['id'])
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 8, 4, 4),
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  for (final (i, s) in ((FitilaLanguage.isBariba ? p['steps'] : (p['stepsFr'] ?? p['steps'])) as List).indexed)
                    Padding(padding: const EdgeInsets.only(bottom: 6), child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [SizedBox(width: 24, child: Text('${i + 1}.', style: TextStyle(fontWeight: FontWeight.w900, color: n2 ? const Color(0xFF6758C9) : SignatureTheme.goldDeep))), Expanded(child: Text(s.toString(), style: const TextStyle(height: 1.4, color: SignatureTheme.inkSoft)))])),
                ]),
              ),
          ]),
        ),
    ];
  }
}
