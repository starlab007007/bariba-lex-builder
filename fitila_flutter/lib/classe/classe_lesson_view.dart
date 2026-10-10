import 'package:flutter/material.dart';

import '../core/signature_theme.dart';
import '../core/web_parity_models.dart';
import '../keyboard/bariba_input.dart';
import 'classe_content.dart';
import 'classe_session.dart';
import 'classe_store.dart';
import 'classe_widgets.dart';

typedef LessonTab = ({String id, String label, String emoji});

/// Onglets d'une leçon (identiques au web).
List<LessonTab> lessonTabs(WebClasseLesson l) => [
  (id: 'text', label: 'Texte', emoji: '📖'),
  if (l.observe.isNotEmpty) (id: 'observe', label: 'Mɛɛrio', emoji: '👁️'),
  if (l.ecoute.isNotEmpty) (id: 'ecoute', label: 'Faagi', emoji: '🎧'),
  if (l.reagis.isNotEmpty) (id: 'reagis', label: 'Geruo', emoji: '💬'),
  if (l.retiens.isNotEmpty) (id: 'retiens', label: 'Weenɛ', emoji: '🧠'),
  if (l.reading.isNotEmpty || l.writing.isNotEmpty) (id: 'phonetics', label: 'Sɔ̃ɔsiru', emoji: '✍️'),
];

/// Écran d'une leçon : texte + illustration + audio, questions avec réponses enregistrées
/// (clavier Bàátɔ̀nú intelligent, vocal, corrigé, notes), phonétique et exercices d'écriture.
class ClasseLessonView extends StatefulWidget {
  const ClasseLessonView({super.key, required this.session, required this.lesson, required this.lessons, required this.onBack, required this.onOpen, this.onFinished});

  final ClasseSession session;
  final WebClasseLesson lesson;
  final List<WebClasseLesson> lessons;
  final VoidCallback onBack;
  final ValueChanged<WebClasseLesson> onOpen;
  final VoidCallback? onFinished;

  @override
  State<ClasseLessonView> createState() => _ClasseLessonViewState();
}

class _ClasseLessonViewState extends State<ClasseLessonView> {
  String _tab = 'text';
  Map<String, StudentAnswer> _answers = {};
  Map<String, AnswerKey> _keys = {};
  bool _loading = true;
  String? _loadError;
  final Map<String, ({bool ok, bool checked})> _writing = {};
  final Map<int, TextEditingController> _writeCtrls = {};
  final ScrollController _contentScroll = ScrollController();

  WebClasseLesson get _l => widget.lesson;
  ClasseSession get _s => widget.session;

  @override
  void initState() {
    super.initState();
    _s.loadProgress(_l.level);
    _s.addListener(_rebuild);
    _load();
  }

  @override
  void didUpdateWidget(covariant ClasseLessonView old) {
    super.didUpdateWidget(old);
    if (old.lesson.id != widget.lesson.id || old.lesson.level != widget.lesson.level) {
      _tab = 'text';
      _writing.clear();
      for (final c in _writeCtrls.values) {
        c.dispose();
      }
      _writeCtrls.clear();
      _load();
    }
  }

  void _rebuild() {
    if (mounted) setState(() {});
  }

  @override
  void dispose() {
    _s.removeListener(_rebuild);
    for (final c in _writeCtrls.values) {
      c.dispose();
    }
    _contentScroll.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _loadError = null;
    });
    try {
      final r = await Future.wait([
        _s.store.loadAnswers(level: _l.level, module: 'lesson', lessonId: '${_l.id}'),
        _s.store.loadAnswerKeys(level: _l.level, module: 'lesson', lessonId: '${_l.id}'),
      ]);
      if (!mounted) return;
      setState(() {
        _answers = r[0] as Map<String, StudentAnswer>;
        _keys = r[1] as Map<String, AnswerKey>;
        _loading = false;
      });
    } catch (_) {
      if (mounted) {
        setState(() {
          _loading = false;
          _loadError = 'Vos réponses précédentes n’ont pas pu être chargées. Vous pouvez continuer ; réessayez plus tard.';
        });
      }
    }
  }

  List<String> _questions(String tab) => switch (tab) {
    'observe' => _l.observe,
    'ecoute' => _l.ecoute,
    'reagis' => _l.reagis,
    _ => _l.retiens,
  };

  List<String> get _activeTabIds => [for (final t in lessonTabs(_l)) t.id];

  void _selectTab(String id) {
    setState(() => _tab = id);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_contentScroll.hasClients) {
        _contentScroll.animateTo(0, duration: const Duration(milliseconds: 220), curve: Curves.easeOutCubic);
      }
    });
  }

  void _onSaved(String tab, StudentAnswer saved) {
    setState(() => _answers = {..._answers, saved.slot: saved});
    final qs = _questions(tab);
    final submitted = [for (var i = 0; i < qs.length; i++) if (_answers['$tab|$i']?.hasContent ?? false) i].length;
    if (submitted >= (qs.length / 2).ceil()) {
      _s.markTab(_l.level, _l.id, tab, _activeTabIds);
    }
  }

  void _next() {
    final tabs = lessonTabs(_l);
    final idx = tabs.indexWhere((t) => t.id == _tab);
    if (idx < tabs.length - 1) {
      _selectTab(tabs[idx + 1].id);
      return;
    }
    _s.completeLesson(_l.level, _l.id);
    final next = widget.lessons.where((e) => e.id > _l.id).firstOrNull;
    if (next != null) {
      widget.onOpen(next);
    } else {
      widget.onFinished?.call();
      widget.onBack();
    }
  }

  @override
  Widget build(BuildContext context) {
    final tabs = lessonTabs(_l);
    if (!tabs.any((t) => t.id == _tab)) _tab = 'text';
    final progress = _s.progressOf(_l.level);
    final stars = progress.lessonStars['${_l.id}'] ?? 0;
    final done = progress.completedLessons.contains(_l.id);
    final prev = widget.lessons.where((e) => e.id < _l.id).lastOrNull;

    return LayoutBuilder(
      builder: (context, box) {
        final wide = box.maxWidth >= 900;
        final header = _hero(stars, done);
        final content = _loading
            ? const Center(child: Padding(padding: EdgeInsets.all(40), child: CircularProgressIndicator()))
            : Scrollbar(
                controller: _contentScroll,
                thumbVisibility: false,
                child: ListView(
                  controller: _contentScroll,
                  key: ValueKey('lesson-content-$_tab'),
                  keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
                  physics: const BouncingScrollPhysics(parent: AlwaysScrollableScrollPhysics()),
                  padding: const EdgeInsets.fromLTRB(2, 2, 2, 88),
                  children: [
                    if (_loadError != null) _banner(_loadError!),
                    if (_s.syncError != null) _banner(_s.syncError!),
                    ..._tabContent(),
                  ],
                ),
              );
        final nav = SafeArea(
          top: false,
          minimum: const EdgeInsets.only(top: 6),
          child: Row(
            children: [
              SizedBox(
                height: 48,
                child: OutlinedButton(
                  onPressed: prev == null ? null : () => widget.onOpen(prev),
                  style: OutlinedButton.styleFrom(padding: const EdgeInsets.symmetric(horizontal: 14)),
                  child: const Icon(Icons.chevron_left_rounded),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: SizedBox(
                  height: 48,
                  child: FilledButton.icon(
                    key: const ValueKey('lesson-next'),
                    onPressed: _next,
                    icon: const Icon(Icons.arrow_forward_rounded),
                    label: Text(tabs.last.id == _tab ? 'Terminer' : 'Suivant'),
                    style: FilledButton.styleFrom(backgroundColor: SignatureTheme.ink, foregroundColor: Colors.white),
                  ),
                ),
              ),
            ],
          ),
        );
        final body = wide
            ? Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  SizedBox(
                    width: 230,
                    child: ListView(children: [header, const SizedBox(height: 10), for (final t in tabs) _sideTab(t, progress)]),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Center(
                      child: ConstrainedBox(constraints: const BoxConstraints(maxWidth: 760), child: Column(children: [Expanded(child: content), const SizedBox(height: 8), nav])),
                    ),
                  ),
                ],
              )
            : Column(
                children: [
                  header,
                  const SizedBox(height: 10),
                  SizedBox(
                    height: 48,
                    child: ListView.separated(
                      key: const ValueKey('classe-lesson-tabs'),
                      scrollDirection: Axis.horizontal,
                      itemCount: tabs.length,
                      separatorBuilder: (_, _) => const SizedBox(width: 7),
                      itemBuilder: (context, i) {
                        final t = tabs[i];
                        final tabDone = progress.tabDone(_l.id, t.id);
                        return ChoiceChip(
                          selected: t.id == _tab,
                          label: Text('${t.emoji} ${t.label}${tabDone ? ' ✓' : ''}'),
                          selectedColor: levelTint(_l.level),
                          onSelected: (_) => _selectTab(t.id),
                        );
                      },
                    ),
                  ),
                  const SizedBox(height: 10),
                  Expanded(child: content),
                  const SizedBox(height: 8),
                  nav,
                ],
              );
        return Column(
          children: [
            ClasseHeader(title: '🏫 ${_l.title}', onBack: widget.onBack, level: _l.level),
            Expanded(child: body),
          ],
        );
      },
    );
  }

  Widget _banner(String text) => Container(
    margin: const EdgeInsets.only(bottom: 10),
    padding: const EdgeInsets.all(10),
    decoration: BoxDecoration(color: SignatureTheme.goldTint, borderRadius: BorderRadius.circular(SignatureTheme.radiusSmall)),
    child: Row(children: [
      const Icon(Icons.cloud_off_rounded, size: 18, color: SignatureTheme.goldDeep),
      const SizedBox(width: 8),
      Expanded(child: Text(text, style: const TextStyle(fontSize: 12, color: SignatureTheme.goldDeep))),
    ]),
  );

  Widget _sideTab(LessonTab t, ClasseProgress progress) {
    final selected = t.id == _tab;
    return Padding(
      padding: const EdgeInsets.only(bottom: 4),
      child: ListTile(
        dense: true,
        selected: selected,
        selectedTileColor: levelTint(_l.level),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        leading: Text(t.emoji, style: const TextStyle(fontSize: 18)),
        title: Text(t.label, style: TextStyle(fontWeight: selected ? FontWeight.w800 : FontWeight.w600)),
        trailing: progress.tabDone(_l.id, t.id) ? const Icon(Icons.check_circle_rounded, size: 18, color: SignatureTheme.sage) : null,
        onTap: () => _selectTab(t.id),
      ),
    );
  }

  Widget _hero(int stars, bool done) {
    final n2 = _l.level == 'N2';
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        gradient: LinearGradient(colors: n2 ? const [Color(0xFFE5E1FA), Color(0xFFD9D0F7)] : const [Color(0xFFFFF1C7), Color(0xFFFFE4B8)]),
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: n2 ? const Color(0xFFB7A9EC) : const Color(0xFFE9C86F)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
                decoration: BoxDecoration(color: Colors.white.withValues(alpha: .6), borderRadius: BorderRadius.circular(99)),
                child: Text('Leçon ${_l.id}', style: TextStyle(color: levelColor(_l.level), fontSize: 10.5, fontWeight: FontWeight.w900)),
              ),
              const SizedBox(width: 8),
              Expanded(child: Text(_l.themeLabel, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(color: SignatureTheme.muted, fontSize: 11))),
              Semantics(
                label: '$stars étoiles sur 5',
                child: Text(List.generate(5, (i) => i < stars ? '★' : '☆').join(' '), style: TextStyle(color: levelColor(_l.level), fontSize: 14)),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              Expanded(child: Text(_l.title, style: const TextStyle(color: SignatureTheme.ink, fontSize: 18, fontWeight: FontWeight.w900))),
              ClasseListenButton(contentKey: ClasseKeys.lesson(_l.level, _l.id, 'title'), audio: _s.audio, size: 36),
            ],
          ),
          if (_l.phoneticLabel.isNotEmpty) ...[
            const SizedBox(height: 4),
            Text(_l.phoneticLabel, style: TextStyle(color: levelColor(_l.level), fontSize: 12)),
          ],
          if (done) ...[
            const SizedBox(height: 6),
            const Row(children: [Icon(Icons.check_circle_rounded, size: 16, color: SignatureTheme.sage), SizedBox(width: 4), Text('Leçon terminée', style: TextStyle(color: SignatureTheme.sage, fontSize: 11.5, fontWeight: FontWeight.w800))]),
          ],
        ],
      ),
    );
  }

  List<Widget> _tabContent() {
    switch (_tab) {
      case 'observe':
      case 'ecoute':
      case 'reagis':
      case 'retiens':
        return _questionTab(_tab);
      case 'phonetics':
        return _phoneticsTab();
      default:
        return _textTab();
    }
  }

  List<Widget> _textTab() => [
    for (final imageUrl in _l.imageUrls) ...[
      ClasseImage(url: imageUrl),
      const SizedBox(height: 12),
    ],
    ClasseBox(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Text('Lecture', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w900, letterSpacing: 1.1, color: SignatureTheme.goldDeep)),
              const Spacer(),
              ClasseListenButton(contentKey: ClasseKeys.lesson(_l.level, _l.id, 'text'), audio: _s.audio, label: 'Écouter', size: 42),
            ],
          ),
          const SizedBox(height: 10),
          SelectableText(_l.text, key: const ValueKey('lesson-text'), style: const TextStyle(color: SignatureTheme.ink, fontSize: 17, height: 1.72)),
        ],
      ),
    ),
    const SizedBox(height: 12),
    Align(
      alignment: Alignment.centerRight,
      child: Semantics(
        button: true,
        label: 'Valider la lecture',
        child: IconButton.filled(
          key: const ValueKey('lesson-read'),
          tooltip: 'Lecture terminée',
          onPressed: () {
            _s.markTab(_l.level, _l.id, 'text', _activeTabIds);
            _next();
          },
          style: IconButton.styleFrom(
            backgroundColor: SignatureTheme.sage,
            foregroundColor: Colors.white,
            minimumSize: const Size(50, 50),
          ),
          icon: const Icon(Icons.check_rounded, size: 26),
        ),
      ),
    ),
  ];

  List<Widget> _questionTab(String tab) {
    final qs = _questions(tab);
    final submitted = [for (var i = 0; i < qs.length; i++) if (_answers['$tab|$i']?.hasContent ?? false) i].length;
    return [
      Padding(
        padding: const EdgeInsets.only(bottom: 10),
        child: Row(
          children: [
            Expanded(child: Text('$submitted/${qs.length} soumises', style: const TextStyle(color: SignatureTheme.muted, fontSize: 12, fontWeight: FontWeight.w700))),
            if (_s.progressOf(_l.level).tabDone(_l.id, tab)) const Row(children: [Icon(Icons.check_circle_rounded, size: 16, color: SignatureTheme.sage), SizedBox(width: 4), Text('Onglet validé', style: TextStyle(color: SignatureTheme.sage, fontSize: 12, fontWeight: FontWeight.w800))]),
          ],
        ),
      ),
      for (var i = 0; i < qs.length; i++)
        ClasseAnswerCard(
          key: ValueKey('${_l.level}-${_l.id}-$tab-$i'),
          store: _s.store,
          audio: _s.audio,
          level: _l.level,
          module: 'lesson',
          lessonId: '${_l.id}',
          sectionKey: tab,
          questionIdx: i,
          question: qs[i],
          audioKey: ClasseKeys.lessonQuestion(_l.level, _l.id, tab, i),
          initial: _answers['$tab|$i'],
          answerKey: _keys['$tab|$i'],
          draft: _s.drafts,
          onSaved: (a) => _onSaved(tab, a),
        ),
    ];
  }

  List<Widget> _phoneticsTab() {
    return [
      if (_l.phoneticLabel.isNotEmpty) Padding(padding: const EdgeInsets.only(bottom: 10), child: Text(_l.phoneticLabel, style: TextStyle(color: levelColor(_l.level), fontWeight: FontWeight.w900))),
      if (_l.reading.isNotEmpty)
        ClasseBox(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('📖 Lecture', style: TextStyle(fontWeight: FontWeight.w900, color: SignatureTheme.ink)),
              const SizedBox(height: 6),
              for (var i = 0; i < _l.reading.length; i++)
                ListTile(
                  dense: true,
                  contentPadding: EdgeInsets.zero,
                  title: Text(_l.reading[i], style: const TextStyle(fontSize: 16, color: SignatureTheme.ink, height: 1.4)),
                  trailing: ClasseListenButton(contentKey: ClasseKeys.phonetic(_l.level, _l.id, 'reading', i), audio: _s.audio, size: 36),
                ),
            ],
          ),
        ),
      if (_l.writing.isNotEmpty) ...[
        const SizedBox(height: 12),
        ClasseBox(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('✍️ Exercices d’écriture', style: TextStyle(fontWeight: FontWeight.w900, color: SignatureTheme.ink)),
              const SizedBox(height: 4),
              const Text('Recopie chaque mot avec le clavier Bàátɔ̀nú (icône clavier du champ).', style: TextStyle(fontSize: 12, color: SignatureTheme.muted)),
              const SizedBox(height: 10),
              for (var i = 0; i < _l.writing.length; i++) _writingRow(i),
              const SizedBox(height: 4),
              FilledButton.icon(
                key: const ValueKey('writing-check'),
                onPressed: _checkWriting,
                icon: const Icon(Icons.fact_check_rounded),
                label: const Text('Vérifier'),
                style: FilledButton.styleFrom(backgroundColor: SignatureTheme.gold, foregroundColor: const Color(0xFF2B2110)),
              ),
            ],
          ),
        ),
      ],
    ];
  }

  Widget _writingRow(int i) {
    final ctrl = _writeCtrls.putIfAbsent(i, () => TextEditingController(text: _s.drafts['w|${_l.level}|${_l.id}|$i'] ?? '')..addListener(() => _s.drafts['w|${_l.level}|${_l.id}|$i'] = _writeCtrls[i]!.text));
    final res = _writing['$i'];
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Text(_l.writing[i], style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800, color: levelColor(_l.level))),
              const SizedBox(width: 8),
              ClasseListenButton(contentKey: ClasseKeys.phonetic(_l.level, _l.id, 'writing', i), audio: _s.audio, size: 32),
              const Spacer(),
              if (res?.checked == true) Icon(res!.ok ? Icons.check_circle_rounded : Icons.cancel_rounded, color: res.ok ? SignatureTheme.sage : SignatureTheme.clay),
            ],
          ),
          const SizedBox(height: 6),
          BaribaTextField(controller: ctrl, decoration: const InputDecoration(hintText: 'Écris…', isDense: true)),
        ],
      ),
    );
  }

  void _checkWriting() {
    var ok = 0;
    final next = <String, ({bool ok, bool checked})>{};
    for (var i = 0; i < _l.writing.length; i++) {
      final typed = (_writeCtrls[i]?.text ?? '').trim();
      final good = typed.isNotEmpty && normalizeAnswer(typed) == normalizeAnswer(_l.writing[i]);
      if (good) ok++;
      next['$i'] = (ok: good, checked: true);
    }
    setState(() => _writing
      ..clear()
      ..addAll(next));
    if (ok >= (_l.writing.length / 2).ceil()) {
      _s.markTab(_l.level, _l.id, 'phonetics', _activeTabIds);
    }
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(SnackBar(content: Text('$ok / ${_l.writing.length} mots corrects')));
  }
}
