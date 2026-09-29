import 'package:flutter/material.dart';

import '../core/signature_theme.dart';
import '../core/web_parity_models.dart';
import 'classe_content.dart';
import 'classe_learn_screens.dart';
import 'classe_lesson_view.dart';
import 'classe_more_screens.dart';
import 'classe_session.dart';
import 'classe_widgets.dart';

typedef _Section = ({String id, String emoji, String title, String subtitle});

/// Accueil et navigation de la Classe : niveau N1/N2, sections, leçons, détail de leçon.
/// Toutes les réponses écrites passent par le clavier Bàátɔ̀nú intelligent (voir [ClasseAnswerCard]).
class ClasseHub extends StatefulWidget {
  const ClasseHub({super.key, required this.session, this.initialLessons, this.contentLoader, this.onLevelChanged});

  final ClasseSession session;
  final List<WebClasseLesson>? initialLessons;
  final Future<ClasseContent> Function()? contentLoader;
  final ValueChanged<String>? onLevelChanged;

  @override
  State<ClasseHub> createState() => _ClasseHubState();
}

class _ClasseHubState extends State<ClasseHub> {
  late Future<({List<WebClasseLesson> lessons, ClasseContent content})> _data;
  String _level = 'N1';
  String _section = 'home';
  int _lessonId = 1;

  @override
  void initState() {
    super.initState();
    _data = _load();
    widget.session.addListener(_rebuild);
    widget.session.loadProgress(_level);
  }

  @override
  void dispose() {
    widget.session.removeListener(_rebuild);
    super.dispose();
  }

  void _rebuild() {
    if (mounted) setState(() {});
  }

  Future<({List<WebClasseLesson> lessons, ClasseContent content})> _load() async {
    final lessons = widget.initialLessons ?? await WebClasseContent.loadLessons();
    final content = await (widget.contentLoader ?? ClasseContent.load)();
    return (lessons: lessons, content: content);
  }

  void _setLevel(String level) {
    widget.session.loadProgress(level);
    setState(() {
      _level = level;
      _section = 'home';
      _lessonId = 1;
    });
    widget.onLevelChanged?.call(level);
  }

  void _go(String section) => setState(() => _section = section);
  void _home() => setState(() => _section = 'home');

  List<_Section> _sections(int lessonCount) {
    final n2 = _level == 'N2';
    return [
      (id: 'lessons', emoji: '📖', title: n2 ? 'Part 1 — Langue' : 'Leçons', subtitle: '$lessonCount leçons'),
      if (!n2) (id: 'alphabet', emoji: '🔤', title: 'Alphabet', subtitle: 'Voyelles, consonnes, nasales'),
      (id: 'calcul', emoji: '🔢', title: n2 ? 'Part 2 — Calcul' : 'Calcul', subtitle: 'Leçons et exercices'),
      (id: 'evaluations', emoji: '📝', title: 'Évaluations', subtitle: 'Questions notées'),
      if (n2) (id: 'grammar', emoji: '🧩', title: 'Grammaire', subtitle: 'Règles et exercices'),
      if (n2) (id: 'textprod', emoji: '✍️', title: 'Production de textes', subtitle: 'Lettres, récits, comptes rendus'),
      if (n2) (id: 'gestion', emoji: '🧾', title: 'Gestion', subtitle: 'Documents et formulaires'),
      (id: 'facilitator', emoji: '🧑‍🏫', title: 'Guide du facilitateur', subtitle: 'Pour animer la classe'),
      (id: 'corrections', emoji: '✅', title: 'Mes corrections', subtitle: 'Notes et retours enseignant'),
    ];
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder(
      future: _data,
      builder: (context, snap) {
        if (snap.hasError) {
          return Center(
            child: FilledButton.icon(
              onPressed: () => setState(() => _data = _load()),
              icon: const Icon(Icons.refresh_rounded),
              label: const Text('Recharger les leçons'),
            ),
          );
        }
        if (!snap.hasData) return const Center(child: CircularProgressIndicator());
        final data = snap.data!;
        final lessons = data.lessons.where((l) => l.level == _level).toList(growable: false);
        final s = widget.session;
        return AnimatedSwitcher(
          duration: const Duration(milliseconds: 220),
          child: KeyedSubtree(key: ValueKey('$_level/$_section/${_section == 'detail' ? _lessonId : 0}'), child: _body(data, lessons, s)),
        );
      },
    );
  }

  Widget _body(({List<WebClasseLesson> lessons, ClasseContent content}) data, List<WebClasseLesson> lessons, ClasseSession s) {
    switch (_section) {
      case 'lessons':
        return _lessonList(lessons);
      case 'detail':
        final l = lessons.firstWhere((e) => e.id == _lessonId, orElse: () => lessons.first);
        return ClasseLessonView(
          session: s,
          lesson: l,
          lessons: lessons,
          onBack: () => _go('lessons'),
          onOpen: (n) => setState(() => _lessonId = n.id),
        );
      case 'alphabet':
        return ClasseAlphabetScreen(session: s, content: data.content, onBack: _home);
      case 'calcul':
        return ClasseCalculScreen(session: s, content: data.content, level: _level, onBack: _home);
      case 'evaluations':
        return ClasseEvaluationsScreen(session: s, content: data.content, level: _level, onBack: _home);
      case 'grammar':
        return ClasseGrammarScreen(session: s, content: data.content, onBack: _home);
      case 'textprod':
        return ClasseTextProdScreen(session: s, content: data.content, onBack: _home);
      case 'gestion':
        return ClasseGestionScreen(session: s, content: data.content, onBack: _home);
      case 'facilitator':
        return ClasseFacilitatorScreen(level: _level, onBack: _home);
      case 'corrections':
        return ClasseCorrectionsScreen(session: s, content: data.content, lessons: data.lessons, onBack: _home);
      default:
        return _homeView(data, lessons, s);
    }
  }

  Widget _homeView(({List<WebClasseLesson> lessons, ClasseContent content}) data, List<WebClasseLesson> lessons, ClasseSession s) {
    final p = s.progressOf(_level);
    final done = lessons.where((l) => p.completedLessons.contains(l.id)).length;
    final stars = lessons.fold<int>(0, (a, l) => a + (p.lessonStars['${l.id}'] ?? 0));
    final ratio = lessons.isEmpty ? 0.0 : done / lessons.length;
    final sections = _sections(lessons.length);
    final last = p.lastLessonId == null ? null : lessons.where((l) => l.id == p.lastLessonId).firstOrNull;
    final n1 = data.lessons.where((l) => l.level == 'N1').length;
    final n2 = data.lessons.where((l) => l.level == 'N2').length;

    return LayoutBuilder(
      builder: (context, c) {
        final cols = c.maxWidth >= 900 ? 3 : c.maxWidth >= 560 ? 2 : 1;
        final tileW = (c.maxWidth - 12 * (cols - 1)) / cols;
        return ListView(
          padding: const EdgeInsets.only(bottom: 28),
          children: [
            Row(
              children: [
                Expanded(child: _levelCard('N1', 'Niveau 1', '🔥', n1)),
                const SizedBox(width: 10),
                Expanded(child: _levelCard('N2', 'Niveau 2', '🚀', n2)),
              ],
            ),
            const SizedBox(height: 12),
            ClasseBox(
              color: levelTint(_level),
              borderColor: levelColor(_level).withValues(alpha: .25),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(child: Text('Ma progression · $_level', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 15, color: levelColor(_level)))),
                      Text('$done/${lessons.length}', style: const TextStyle(fontWeight: FontWeight.w900)),
                    ],
                  ),
                  const SizedBox(height: 8),
                  ClipRRect(borderRadius: BorderRadius.circular(99), child: LinearProgressIndicator(value: ratio, minHeight: 9, backgroundColor: Colors.white, color: levelColor(_level))),
                  const SizedBox(height: 8),
                  Wrap(spacing: 14, runSpacing: 4, children: [
                    Text('⭐ $stars étoiles', style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 12.5)),
                    Text('📝 ${p.evaluationBest.length} évaluations tentées', style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 12.5)),
                  ]),
                  if (s.syncError != null) Padding(padding: const EdgeInsets.only(top: 6), child: Text(s.syncError!, style: const TextStyle(color: SignatureTheme.clay, fontSize: 11.5))),
                  if (last != null) ...[
                    const SizedBox(height: 10),
                    FilledButton.icon(
                      onPressed: () => setState(() {
                        _lessonId = last.id;
                        _section = 'detail';
                      }),
                      style: FilledButton.styleFrom(backgroundColor: levelColor(_level)),
                      icon: const Icon(Icons.play_arrow_rounded),
                      label: Text('Reprendre · ${last.title}', overflow: TextOverflow.ellipsis),
                    ),
                  ],
                ],
              ),
            ),
            const SizedBox(height: 14),
            Wrap(
              spacing: 12,
              runSpacing: 12,
              children: [for (final sec in sections) SizedBox(width: tileW, child: _sectionTile(sec))],
            ),
          ],
        );
      },
    );
  }

  Widget _levelCard(String level, String title, String emoji, int count) {
    final selected = _level == level;
    final tone = levelColor(level);
    return Semantics(
      button: true,
      selected: selected,
      label: title,
      child: InkWell(
        borderRadius: BorderRadius.circular(20),
        onTap: () => _setLevel(level),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 180),
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: selected ? levelTint(level) : SignatureTheme.surface,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: selected ? tone : SignatureTheme.hairline, width: selected ? 2 : 1),
            boxShadow: selected ? [BoxShadow(color: tone.withValues(alpha: .18), blurRadius: 18, offset: const Offset(0, 8))] : null,
          ),
          child: Row(children: [
            Text(emoji, style: const TextStyle(fontSize: 26)),
            const SizedBox(width: 10),
            Expanded(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(title, style: TextStyle(fontWeight: FontWeight.w900, fontSize: 15, color: tone)),
                Text('$count leçons', style: const TextStyle(fontSize: 11.5, color: SignatureTheme.muted)),
              ]),
            ),
          ]),
        ),
      ),
    );
  }

  Widget _sectionTile(_Section sec) => Material(
    color: SignatureTheme.surface,
    borderRadius: BorderRadius.circular(SignatureTheme.radiusMedium),
    child: InkWell(
      borderRadius: BorderRadius.circular(SignatureTheme.radiusMedium),
      onTap: () => _go(sec.id),
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(borderRadius: BorderRadius.circular(SignatureTheme.radiusMedium), border: Border.all(color: SignatureTheme.hairline)),
        child: Row(children: [
          Container(
            width: 46,
            height: 46,
            alignment: Alignment.center,
            decoration: BoxDecoration(color: levelTint(_level), borderRadius: BorderRadius.circular(14)),
            child: Text(sec.emoji, style: const TextStyle(fontSize: 22)),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(sec.title, style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 15, color: SignatureTheme.ink)),
              Text(sec.subtitle, style: const TextStyle(fontSize: 12, color: SignatureTheme.muted)),
            ]),
          ),
          const Icon(Icons.chevron_right_rounded, color: SignatureTheme.muted),
        ]),
      ),
    ),
  );

  Widget _lessonList(List<WebClasseLesson> lessons) {
    final p = widget.session.progressOf(_level);
    final groups = <String, List<WebClasseLesson>>{};
    for (final l in lessons) {
      groups.putIfAbsent(l.themeLabel, () => []).add(l);
    }
    return ListView(
      padding: const EdgeInsets.only(bottom: 28),
      children: [
        ClasseHeader(title: _level == 'N2' ? 'Part 1 — Langue' : 'Leçons', onBack: _home, level: _level),
        for (final g in groups.entries) ...[
          Padding(
            padding: const EdgeInsets.fromLTRB(4, 10, 4, 6),
            child: Text(g.key, style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 13, color: SignatureTheme.muted)),
          ),
          for (final l in g.value)
            Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: Material(
                color: SignatureTheme.surface,
                borderRadius: BorderRadius.circular(SignatureTheme.radiusMedium),
                child: InkWell(
                  borderRadius: BorderRadius.circular(SignatureTheme.radiusMedium),
                  onTap: () => setState(() {
                    _lessonId = l.id;
                    _section = 'detail';
                  }),
                  child: Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(borderRadius: BorderRadius.circular(SignatureTheme.radiusMedium), border: Border.all(color: SignatureTheme.hairline)),
                    child: Row(children: [
                      Container(
                        width: 38,
                        height: 38,
                        alignment: Alignment.center,
                        decoration: BoxDecoration(color: levelTint(_level), borderRadius: BorderRadius.circular(12)),
                        child: p.completedLessons.contains(l.id) ? const Icon(Icons.check_rounded, color: SignatureTheme.sage) : Text('${l.id}', style: TextStyle(fontWeight: FontWeight.w900, color: levelColor(_level))),
                      ),
                      const SizedBox(width: 12),
                      Expanded(child: Text(l.title, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15, color: SignatureTheme.ink))),
                      Text('⭐' * (p.lessonStars['${l.id}'] ?? 0), style: const TextStyle(fontSize: 11)),
                      const Icon(Icons.chevron_right_rounded, color: SignatureTheme.muted),
                    ]),
                  ),
                ),
              ),
            ),
        ],
      ],
    );
  }
}
