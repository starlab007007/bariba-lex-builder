import 'package:flutter/material.dart';

import '../core/signature_theme.dart';
import '../keyboard/bariba_input.dart';
import 'classe_content.dart';
import 'classe_session.dart';
import 'classe_store.dart';
import 'classe_widgets.dart';

// ═════════════════════════════ ALPHABET (N1) ═════════════════════════════

class ClasseAlphabetScreen extends StatefulWidget {
  const ClasseAlphabetScreen({super.key, required this.session, required this.content, required this.onBack});

  final ClasseSession session;
  final ClasseContent content;
  final VoidCallback onBack;

  @override
  State<ClasseAlphabetScreen> createState() => _ClasseAlphabetScreenState();
}

class _ClasseAlphabetScreenState extends State<ClasseAlphabetScreen> {
  String _mode = 'vowels';
  int? _selected;
  String _consonant = 'k';

  ClasseAlphabet get _a => widget.content.alphabet;

  List<String> get _letters => switch (_mode) {
    'vowels' => _a.vowels,
    'consonants' => _a.consonants,
    _ => [..._a.nasals, ..._a.tones],
  };

  String get _group => _mode == 'nasals' ? 'nasals' : _mode;

  @override
  Widget build(BuildContext context) {
    final modes = [('vowels', 'Voyelles', _a.vowels.length), ('consonants', 'Consonnes', _a.consonants.length), ('nasals', 'Nasales', _a.nasals.length), ('syllables', 'Syllabes', 0)];
    return ListView(
      children: [
        ClasseHeader(title: '🔤 Alphabet', onBack: widget.onBack, level: 'N1'),
        SizedBox(
          height: 44,
          child: ListView(
            scrollDirection: Axis.horizontal,
            children: [
              for (final m in modes)
                Padding(
                  padding: const EdgeInsets.only(right: 8),
                  child: ChoiceChip(
                    key: ValueKey('alpha-${m.$1}'),
                    label: Text('${m.$2}${m.$3 > 0 ? ' (${m.$3})' : ''}'),
                    selected: _mode == m.$1,
                    selectedColor: SignatureTheme.sageTint,
                    onSelected: (_) => setState(() { _mode = m.$1; _selected = null; }),
                  ),
                ),
            ],
          ),
        ),
        const SizedBox(height: 12),
        if (_mode != 'syllables') ..._letterGrid() else ..._syllables(),
      ],
    );
  }

  List<Widget> _letterGrid() {
    final letters = _letters;
    return [
      GridView.builder(
        shrinkWrap: true,
        physics: const NeverScrollableScrollPhysics(),
        itemCount: letters.length,
        gridDelegate: const SliverGridDelegateWithMaxCrossAxisExtent(maxCrossAxisExtent: 96, mainAxisSpacing: 10, crossAxisSpacing: 10),
        itemBuilder: (context, i) {
          final sel = _selected == i;
          return Material(
            color: sel ? SignatureTheme.sage : SignatureTheme.surface,
            borderRadius: BorderRadius.circular(18),
            child: InkWell(
              key: ValueKey('letter-$i'),
              borderRadius: BorderRadius.circular(18),
              onTap: () => setState(() => _selected = i),
              child: Container(
                decoration: BoxDecoration(borderRadius: BorderRadius.circular(18), border: Border.all(color: sel ? SignatureTheme.sage : SignatureTheme.hairline)),
                child: Stack(
                  children: [
                    Center(child: Column(mainAxisSize: MainAxisSize.min, children: [
                      Text(letters[i], style: TextStyle(fontSize: 30, fontWeight: FontWeight.w900, color: sel ? Colors.white : SignatureTheme.ink)),
                      Text(letters[i].toUpperCase(), style: TextStyle(fontSize: 11, color: sel ? Colors.white70 : SignatureTheme.muted)),
                    ])),
                    Positioned(top: 2, right: 2, child: ClasseListenButton(contentKey: ClasseKeys.alphabet(_group, i), audio: widget.session.audio, size: 28)),
                  ],
                ),
              ),
            ),
          );
        },
      ),
      if (_selected != null && _selected! < letters.length) ...[
        const SizedBox(height: 14),
        ClasseBox(
          color: SignatureTheme.sageTint,
          borderColor: SignatureTheme.sage,
          child: Row(
            children: [
              Text(letters[_selected!], style: const TextStyle(fontSize: 56, fontWeight: FontWeight.w900, color: SignatureTheme.ink)),
              const SizedBox(width: 12),
              Text(letters[_selected!].toUpperCase(), style: const TextStyle(fontSize: 34, fontWeight: FontWeight.w900, color: SignatureTheme.muted)),
              const Spacer(),
              ClasseListenButton(contentKey: ClasseKeys.alphabet(_group, _selected!), audio: widget.session.audio, size: 48, label: 'Écouter'),
            ],
          ),
        ),
      ],
      const SizedBox(height: 14),
      ClasseBox(
        child: Text(
          switch (_mode) {
            'vowels' => 'L’alphabet Bariba comporte 7 voyelles de base : a, ɛ, e, i, o, ɔ, u.',
            'consonants' => '16 consonnes dont les digraphes kp et gb.',
            _ => 'Voyelles nasales : ã, ɛ̃, ĩ, ɔ̃. Marques tonales : ɔ̀ (ton bas), ǹ (n syllabique).',
          },
          style: const TextStyle(color: SignatureTheme.inkSoft, height: 1.45),
        ),
      ),
    ];
  }

  List<Widget> _syllables() => [
    const Text('Choisis une consonne pour voir les syllabes.', style: TextStyle(color: SignatureTheme.inkSoft)),
    const SizedBox(height: 10),
    Wrap(
      spacing: 8,
      runSpacing: 8,
      children: [
        for (final c in _a.consonants)
          ChoiceChip(label: Text(c, style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w800)), selected: _consonant == c, selectedColor: SignatureTheme.goldTint, onSelected: (_) => setState(() => _consonant = c)),
      ],
    ),
    const SizedBox(height: 14),
    ClasseBox(
      child: GridView.count(
        shrinkWrap: true,
        physics: const NeverScrollableScrollPhysics(),
        crossAxisCount: 2,
        childAspectRatio: 2.6,
        mainAxisSpacing: 8,
        crossAxisSpacing: 8,
        children: [
          for (final v in _a.vowels)
            Container(
              decoration: BoxDecoration(color: SignatureTheme.goldTint.withValues(alpha: .5), borderRadius: BorderRadius.circular(14)),
              padding: const EdgeInsets.symmetric(horizontal: 12),
              child: Row(children: [
                Text('$_consonant$v', style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w800)),
                const Spacer(),
                ClasseListenButton(contentKey: ClasseKeys.syllable(_consonant, v), audio: widget.session.audio, size: 32),
              ]),
            ),
        ],
      ),
    ),
  ];
}

// ═════════════════════════════ CALCUL ═════════════════════════════

final _exerciseSection = RegExp(r'sɔmaa|sosibu|wĩabu|dabiasibu|bɔnu kosibu|bɔkurabu|sɔmburu|sɔm gbiikiru', caseSensitive: false);

String calculSectionKey(String sectionName) => sectionName.trim().split('-').first.trim();

class ClasseCalculScreen extends StatefulWidget {
  const ClasseCalculScreen({super.key, required this.session, required this.content, required this.level, required this.onBack});

  final ClasseSession session;
  final ClasseContent content;
  final String level;
  final VoidCallback onBack;

  @override
  State<ClasseCalculScreen> createState() => _ClasseCalculScreenState();
}

class _ClasseCalculScreenState extends State<ClasseCalculScreen> {
  CalculLesson? _open;
  Map<String, StudentAnswer> _answers = {};
  Map<String, AnswerKey> _keys = {};
  bool _loading = false;
  bool _showNumbers = false;
  final Map<int, bool> _results = {};
  int _resetKey = 0;

  List<CalculLesson> get _lessons => widget.content.calcul[widget.level] ?? const [];

  Future<void> _openLesson(CalculLesson l) async {
    setState(() {
      _open = l;
      _loading = true;
      _results.clear();
    });
    try {
      final r = await Future.wait([
        widget.session.store.loadAnswers(level: l.level, module: 'calcul', lessonId: '${l.id}'),
        widget.session.store.loadAnswerKeys(level: l.level, module: 'calcul', lessonId: '${l.id}'),
      ]);
      if (!mounted) return;
      setState(() {
        _answers = r[0] as Map<String, StudentAnswer>;
        _keys = r[1] as Map<String, AnswerKey>;
        _loading = false;
      });
    } catch (_) {
      if (mounted) setState(() { _answers = {}; _keys = {}; _loading = false; });
    }
  }

  @override
  Widget build(BuildContext context) {
    final l = _open;
    if (l == null) return _list();
    return _detail(l);
  }

  Widget _list() {
    final numbers = widget.content.numbers[widget.level] ?? const [];
    return ListView(
      children: [
        ClasseHeader(title: '🔢 Calcul', onBack: widget.onBack, level: widget.level),
        ClasseBox(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              InkWell(
                onTap: () => setState(() => _showNumbers = !_showNumbers),
                child: Row(children: [
                  const Text('🔤', style: TextStyle(fontSize: 20)),
                  const SizedBox(width: 8),
                  const Expanded(child: Text('Les nombres en Bàátɔ̀nú', style: TextStyle(fontWeight: FontWeight.w800))),
                  Icon(_showNumbers ? Icons.expand_less_rounded : Icons.expand_more_rounded),
                ]),
              ),
              if (_showNumbers) ...[
                const SizedBox(height: 8),
                Wrap(spacing: 8, runSpacing: 8, children: [
                  for (final n in numbers)
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                      decoration: BoxDecoration(color: SignatureTheme.goldTint.withValues(alpha: .6), borderRadius: BorderRadius.circular(10)),
                      child: Text.rich(TextSpan(children: [TextSpan(text: '${n.key} ', style: const TextStyle(fontWeight: FontWeight.w900)), TextSpan(text: n.value)])),
                    ),
                ]),
              ],
            ],
          ),
        ),
        const SizedBox(height: 12),
        for (final lesson in _lessons)
          Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: Material(
              color: SignatureTheme.surface,
              borderRadius: BorderRadius.circular(18),
              child: InkWell(
                key: ValueKey('calcul-${lesson.id}'),
                borderRadius: BorderRadius.circular(18),
                onTap: () => _openLesson(lesson),
                child: Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(borderRadius: BorderRadius.circular(18), border: Border.all(color: SignatureTheme.hairline)),
                  child: Row(children: [
                    Container(width: 46, height: 46, alignment: Alignment.center, decoration: BoxDecoration(color: levelTint(lesson.level), borderRadius: BorderRadius.circular(14)), child: Text(lesson.exercises.isNotEmpty ? '🧮' : '🔢', style: const TextStyle(fontSize: 22))),
                    const SizedBox(width: 12),
                    Expanded(child: Text(lesson.title.isEmpty ? 'Dooru ${lesson.id}' : lesson.title, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14))),
                    const Icon(Icons.chevron_right_rounded, color: SignatureTheme.muted),
                  ]),
                ),
              ),
            ),
          ),
      ],
    );
  }

  Widget _detail(CalculLesson l) {
    final qaSections = [for (final s in l.sections) if (!_exerciseSection.hasMatch(s.key) && s.value.isNotEmpty) s];
    final exerciseSections = [for (final s in l.sections) if (_exerciseSection.hasMatch(s.key) && s.value.isNotEmpty) s];
    final correct = _results.values.where((v) => v).length;
    return ListView(
      key: ValueKey('calcul-detail-${l.id}'),
      children: [
        ClasseHeader(title: l.title.isEmpty ? 'Dooru ${l.id}' : l.title, onBack: () => setState(() => _open = null), level: l.level, trailing: ClasseListenButton(contentKey: ClasseKeys.calcul(l.level, l.id, 'title'), audio: widget.session.audio, size: 34)),
        if (l.images.isNotEmpty) ...[ClasseImage(url: l.images.first, height: 260), const SizedBox(height: 10)],
        if (l.text.isNotEmpty)
          ClasseBox(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Align(alignment: Alignment.centerRight, child: ClasseListenButton(contentKey: ClasseKeys.calcul(l.level, l.id, 'text'), audio: widget.session.audio, size: 34, label: 'Écouter')),
              SelectableText(l.text, style: const TextStyle(fontSize: 15.5, height: 1.55, color: SignatureTheme.inkSoft)),
            ]),
          ),
        if (l.text.isEmpty && l.paragraphs.isNotEmpty && qaSections.isEmpty)
          ClasseBox(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            for (var i = 0; i < l.paragraphs.length; i++)
              Row(children: [Expanded(child: Text(l.paragraphs[i], style: const TextStyle(fontSize: 15, height: 1.5))), ClasseListenButton(contentKey: ClasseKeys.calcul(l.level, l.id, 'paragraph/$i'), audio: widget.session.audio, size: 30)]),
          ])),
        const SizedBox(height: 10),
        if (_loading) const Center(child: Padding(padding: EdgeInsets.all(24), child: CircularProgressIndicator())),
        if (!_loading)
          for (final sec in qaSections) ...[
            Padding(padding: const EdgeInsets.fromLTRB(4, 8, 4, 8), child: Text(sec.key, style: TextStyle(fontWeight: FontWeight.w900, color: levelColor(l.level)))),
            for (var i = 0; i < sec.value.length; i++)
              ClasseAnswerCard(
                key: ValueKey('calcul-${l.id}-${sec.key}-$i'),
                store: widget.session.store,
                audio: widget.session.audio,
                level: l.level,
                module: 'calcul',
                lessonId: '${l.id}',
                sectionKey: calculSectionKey(sec.key),
                questionIdx: i,
                question: sec.value[i],
                label: '${i + 1}.',
                audioKey: ClasseKeys.calcul(l.level, l.id, '${sec.key}/$i'),
                initial: _answers['${calculSectionKey(sec.key)}|$i'],
                answerKey: _keys['${calculSectionKey(sec.key)}|$i'],
                draft: widget.session.drafts,
              ),
          ],
        if (l.exercises.isNotEmpty || exerciseSections.isNotEmpty) ...[
          Row(children: [
            const Expanded(child: Text('🧮 SƆMAA — exercices', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 15))),
            TextButton.icon(onPressed: () => setState(() { _results.clear(); _resetKey++; }), icon: const Icon(Icons.restart_alt_rounded, size: 18), label: const Text('Recommencer')),
          ]),
          for (var i = 0; i < l.exercises.length; i++)
            CalculExerciseTile(
              key: ValueKey('ex-${l.id}-$i-$_resetKey'),
              exercise: l.exercises[i],
              index: i,
              onResult: (ok) => setState(() => _results[i] = ok),
            ),
          if (!_loading)
            for (final sec in exerciseSections)
              for (var i = 0; i < sec.value.length; i++)
                ClasseAnswerCard(
                  key: ValueKey('calcul-ex-${l.id}-${sec.key}-$i'),
                  store: widget.session.store,
                  audio: widget.session.audio,
                  level: l.level,
                  module: 'calcul',
                  lessonId: '${l.id}',
                  sectionKey: calculSectionKey(sec.key),
                  questionIdx: i,
                  question: sec.value[i],
                  label: '${i + 1}.',
                  audioKey: ClasseKeys.calcul(l.level, l.id, '${sec.key}/$i'),
                  initial: _answers['${calculSectionKey(sec.key)}|$i'],
                  answerKey: _keys['${calculSectionKey(sec.key)}|$i'],
                  draft: widget.session.drafts,
                ),
        ],
        if (l.exercises.isNotEmpty && _results.isNotEmpty)
          ClasseBox(
            color: SignatureTheme.goldTint.withValues(alpha: .5),
            child: Column(children: [
              const Text('Bilan de la leçon', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 16)),
              const SizedBox(height: 6),
              Text('SƆMAA : $correct / ${l.exercises.length}', key: const ValueKey('calcul-score'), style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w900)),
            ]),
          ),
        const SizedBox(height: 20),
      ],
    );
  }
}

/// Exercice de calcul interactif (compte, addition, soustraction, multiplication, division).
class CalculExerciseTile extends StatefulWidget {
  const CalculExerciseTile({super.key, required this.exercise, required this.index, required this.onResult});

  final CalculExercise exercise;
  final int index;
  final ValueChanged<bool> onResult;

  @override
  State<CalculExerciseTile> createState() => _CalculExerciseTileState();
}

class _CalculExerciseTileState extends State<CalculExerciseTile> {
  final _c = TextEditingController();
  bool? _ok;

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  void _check() {
    final ok = widget.exercise.check(_c.text);
    setState(() => _ok = ok);
    widget.onResult(ok);
  }

  @override
  Widget build(BuildContext context) {
    final ex = widget.exercise;
    final word = ex.type == 'count';
    return ClasseBox(
      margin: const EdgeInsets.only(bottom: 10),
      borderColor: _ok == null ? null : (_ok! ? SignatureTheme.sage : SignatureTheme.clay),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Exercice ${widget.index + 1}', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w900, color: SignatureTheme.muted)),
          const SizedBox(height: 4),
          Text(ex.prompt, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800)),
          const SizedBox(height: 10),
          if (word)
            BaribaTextField(controller: _c, decoration: const InputDecoration(hintText: 'Écris en Bàátɔ̀nú…'))
          else
            TextField(controller: _c, keyboardType: const TextInputType.numberWithOptions(decimal: true), onSubmitted: (_) => _check(), decoration: const InputDecoration(hintText: 'Résultat')),
          const SizedBox(height: 8),
          Row(children: [
            FilledButton(key: ValueKey('ex-check-${widget.index}'), onPressed: _check, style: FilledButton.styleFrom(backgroundColor: SignatureTheme.gold, foregroundColor: const Color(0xFF2B2110)), child: const Text('Vérifier')),
            const SizedBox(width: 12),
            if (_ok != null) Icon(_ok! ? Icons.check_circle_rounded : Icons.cancel_rounded, color: _ok! ? SignatureTheme.sage : SignatureTheme.clay),
            if (_ok == false)
              Expanded(child: Padding(padding: const EdgeInsets.only(left: 8), child: Text(word ? 'Réponse : ${ex.label ?? ex.expected}' : 'Réponse : ${ex.expected}', style: const TextStyle(color: SignatureTheme.clay, fontWeight: FontWeight.w700)))),
          ]),
        ],
      ),
    );
  }
}

// ═════════════════════════════ ÉVALUATIONS ═════════════════════════════

class ClasseEvaluationsScreen extends StatefulWidget {
  const ClasseEvaluationsScreen({super.key, required this.session, required this.content, required this.level, required this.onBack});

  final ClasseSession session;
  final ClasseContent content;
  final String level;
  final VoidCallback onBack;

  @override
  State<ClasseEvaluationsScreen> createState() => _ClasseEvaluationsScreenState();
}

class _ClasseEvaluationsScreenState extends State<ClasseEvaluationsScreen> {
  ClasseEvaluation? _open;
  Map<String, StudentAnswer> _answers = {};
  Map<String, AnswerKey> _keys = {};
  bool _loading = false;
  int? _score;

  @override
  void initState() {
    super.initState();
    widget.session.loadProgress(widget.level);
    widget.session.addListener(_r);
  }

  void _r() {
    if (mounted) setState(() {});
  }

  @override
  void dispose() {
    widget.session.removeListener(_r);
    super.dispose();
  }

  Future<void> _openEval(ClasseEvaluation e) async {
    setState(() {
      _open = e;
      _loading = true;
      _score = null;
    });
    try {
      final r = await Future.wait([
        widget.session.store.loadAnswers(level: e.level, module: 'evaluation', lessonId: '${e.id}'),
        widget.session.store.loadAnswerKeys(level: e.level, module: 'evaluation', lessonId: '${e.id}'),
      ]);
      if (!mounted) return;
      setState(() {
        _answers = r[0] as Map<String, StudentAnswer>;
        _keys = r[1] as Map<String, AnswerKey>;
        _loading = false;
      });
    } catch (_) {
      if (mounted) setState(() { _answers = {}; _keys = {}; _loading = false; });
    }
  }

  Future<void> _finish(ClasseEvaluation e) async {
    var answered = 0;
    for (var si = 0; si < e.sections.length; si++) {
      for (var qi = 0; qi < e.sections[si].value.length; qi++) {
        final saved = _answers['$si|$qi'];
        final draft = widget.session.drafts['${e.level}|evaluation|${e.id}|$si|$qi'] ?? '';
        if ((saved?.hasContent ?? false) || draft.trim().length > 3) answered++;
      }
    }
    final pct = e.questionCount == 0 ? 0 : (answered * 100 / e.questionCount).round();
    setState(() => _score = pct);
    try {
      await widget.session.store.saveEvaluationResult(e.level, '${e.id}', pct, details: {'answered': answered, 'total': e.questionCount});
      widget.session.update(e.level, (p) => p.copyWith(evaluationBest: {...p.evaluationBest, '${e.id}': pct > (p.evaluationBest['${e.id}'] ?? 0) ? pct : (p.evaluationBest['${e.id}'] ?? 0)}));
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Score affiché mais non synchronisé (hors connexion).')));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final e = _open;
    return e == null ? _list() : _detail(e);
  }

  Widget _tile(ClasseEvaluation e) {
    final best = widget.session.progressOf(widget.level).evaluationBest['${e.id}'];
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Material(
        color: SignatureTheme.surface,
        borderRadius: BorderRadius.circular(18),
        child: InkWell(
          key: ValueKey('eval-${e.id}'),
          borderRadius: BorderRadius.circular(18),
          onTap: () => _openEval(e),
          child: Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(borderRadius: BorderRadius.circular(18), border: Border.all(color: SignatureTheme.hairline)),
            child: Row(children: [
              Container(width: 44, height: 44, alignment: Alignment.center, decoration: BoxDecoration(color: best != null ? SignatureTheme.sageTint : levelTint(e.level), borderRadius: BorderRadius.circular(14)), child: Text(best != null ? '✅' : '📝', style: const TextStyle(fontSize: 21))),
              const SizedBox(width: 12),
              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(e.title, style: const TextStyle(fontWeight: FontWeight.w700)),
                Text('${e.questionCount} questions', style: const TextStyle(fontSize: 11.5, color: SignatureTheme.muted)),
              ])),
              if (best != null) Text('$best %', style: const TextStyle(fontWeight: FontWeight.w900, color: SignatureTheme.sage)),
              const Icon(Icons.chevron_right_rounded, color: SignatureTheme.muted),
            ]),
          ),
        ),
      ),
    );
  }

  Widget _list() {
    final all = widget.content.evaluations[widget.level] ?? const [];
    // Même découpage que le web : pages < 85 = langue, ≥ 85 = calcul (N1).
    final calcul = widget.level == 'N1' ? all.where((e) => e.page >= 85).toList() : <ClasseEvaluation>[];
    final lang = [for (final e in all) if (!calcul.contains(e)) e];
    return ListView(
      children: [
        ClasseHeader(title: '📝 Évaluations', onBack: widget.onBack, level: widget.level),
        if (lang.isNotEmpty) ...[
          const Padding(padding: EdgeInsets.fromLTRB(4, 4, 4, 8), child: Text('Langue', style: TextStyle(fontWeight: FontWeight.w900))),
          for (final e in lang) _tile(e),
        ],
        if (calcul.isNotEmpty) ...[
          const Padding(padding: EdgeInsets.fromLTRB(4, 12, 4, 8), child: Text('Calcul', style: TextStyle(fontWeight: FontWeight.w900))),
          for (final e in calcul) _tile(e),
        ],
        if (all.isEmpty) const Center(child: Padding(padding: EdgeInsets.all(30), child: Text('Aucune évaluation pour ce niveau.'))),
      ],
    );
  }

  Widget _detail(ClasseEvaluation e) {
    return ListView(
      key: ValueKey('eval-detail-${e.id}'),
      children: [
        ClasseHeader(title: e.title, onBack: () => setState(() => _open = null), level: e.level, trailing: ClasseListenButton(contentKey: ClasseKeys.evalTitle(e.level, e.id), audio: widget.session.audio, size: 34)),
        if (_loading) const Center(child: Padding(padding: EdgeInsets.all(30), child: CircularProgressIndicator())),
        if (!_loading) ..._questions(e),
        if (!_loading) ...[
          const SizedBox(height: 8),
          if (_score != null) _result(e, _score!),
          FilledButton.icon(
            key: const ValueKey('eval-finish'),
            onPressed: () => _finish(e),
            icon: const Icon(Icons.flag_rounded),
            label: Text(_score == null ? 'Terminer l’évaluation' : 'Recalculer mon score'),
            style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(52), backgroundColor: SignatureTheme.gold, foregroundColor: const Color(0xFF2B2110)),
          ),
          const SizedBox(height: 24),
        ],
      ],
    );
  }

  List<Widget> _questions(ClasseEvaluation e) {
    var global = 0;
    final out = <Widget>[];
    for (var si = 0; si < e.sections.length; si++) {
      final sec = e.sections[si];
      out.add(Padding(padding: const EdgeInsets.fromLTRB(4, 10, 4, 8), child: Text(sec.key, style: TextStyle(fontWeight: FontWeight.w900, color: levelColor(e.level)))));
      for (var qi = 0; qi < sec.value.length; qi++) {
        out.add(ClasseAnswerCard(
          key: ValueKey('eval-${e.id}-$si-$qi'),
          store: widget.session.store,
          audio: widget.session.audio,
          level: e.level,
          module: 'evaluation',
          lessonId: '${e.id}',
          sectionKey: '$si',
          questionIdx: qi,
          question: sec.value[qi],
          label: 'Q${qi + 1}',
          audioKey: ClasseKeys.evalQuestion(e.level, e.id, global),
          initial: _answers['$si|$qi'],
          answerKey: _keys['$si|$qi'],
          draft: widget.session.drafts,
        ));
        global++;
      }
    }
    return out;
  }

  Widget _result(ClasseEvaluation e, int score) {
    final color = score >= 70 ? SignatureTheme.sage : score >= 40 ? SignatureTheme.goldDeep : SignatureTheme.clay;
    final best = widget.session.progressOf(e.level).evaluationBest['${e.id}'];
    return ClasseBox(
      margin: const EdgeInsets.only(bottom: 12),
      color: color.withValues(alpha: .08),
      borderColor: color.withValues(alpha: .4),
      child: Column(
        children: [
          Text(score >= 70 ? '🎉' : score >= 40 ? '📝' : '💪', style: const TextStyle(fontSize: 40)),
          Text('$score %', key: const ValueKey('eval-score'), style: TextStyle(fontSize: 32, fontWeight: FontWeight.w900, color: color)),
          const SizedBox(height: 6),
          ClipRRect(borderRadius: BorderRadius.circular(99), child: LinearProgressIndicator(value: score / 100, minHeight: 10, color: color, backgroundColor: SignatureTheme.hairline)),
          const SizedBox(height: 8),
          Text(score >= 70 ? 'Excellent travail !' : 'Continue à t’entraîner.', style: const TextStyle(fontWeight: FontWeight.w700)),
          if (best != null) Text('Meilleur score : $best %', style: const TextStyle(color: SignatureTheme.muted, fontSize: 12)),
          const SizedBox(height: 4),
          const Text('Le score mesure les questions répondues ; la note de l’enseignant apparaît dans « Mes corrections ».', textAlign: TextAlign.center, style: TextStyle(color: SignatureTheme.muted, fontSize: 11.5)),
        ],
      ),
    );
  }
}
