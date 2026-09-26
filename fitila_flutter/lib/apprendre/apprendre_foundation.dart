import 'package:flutter/material.dart';

import 'apprendre_models.dart';
import 'apprendre_session.dart';
import 'apprendre_store.dart';
import 'apprendre_tasks.dart';
import 'apprendre_ui.dart';

/// Leçon de fondation : explications, exemples vérifiés, tableaux, test.
class ApFoundationScreen extends StatefulWidget {
  const ApFoundationScreen({
    super.key,
    required this.content,
    required this.unit,
    required this.store,
  });

  final ApprendreContent content;
  final ApFoundation unit;
  final ApprendreStore store;

  @override
  State<ApFoundationScreen> createState() => _ApFoundationScreenState();
}

class _ApFoundationScreenState extends State<ApFoundationScreen> {
  Future<void> _startQuiz() async {
    final tasks = ApTaskFactory(widget.content).foundationQuiz(widget.unit);
    await Navigator.of(context).push<ApSessionResult>(
      MaterialPageRoute<ApSessionResult>(
        builder: (_) => ApSessionScreen(
          title: widget.unit.titleFr,
          tasks: tasks,
          store: widget.store,
          sessionKey: 'fondation:${widget.unit.id}',
          foundationId: widget.unit.id,
        ),
      ),
    );
    if (mounted) {
      setState(() {});
    }
  }

  @override
  Widget build(BuildContext context) {
    final unit = widget.unit;
    final best = widget.store.progress.foundationScores[unit.id];
    final done = widget.store.progress.foundationDone(unit.id);
    return Scaffold(
      backgroundColor: ApColors.ivory,
      body: SafeArea(
        child: Column(
          children: [
            ApTopBar(
              title: 'Fondation ${unit.order}',
              subtitle: '${unit.minutes} min · ${unit.quiz.length} questions',
              trailing: done
                  ? const ApPill(
                      'Validée',
                      icon: Icons.check_rounded,
                      background: ApColors.sageTint,
                      foreground: ApColors.sageInk,
                    )
                  : null,
            ),
            Expanded(
              child: ListView(
                padding: const EdgeInsets.fromLTRB(20, 8, 20, 28),
                children: [
                  Row(
                    children: [
                      Container(
                        width: 52,
                        height: 52,
                        decoration: BoxDecoration(
                          color: ApColors.goldTint,
                          borderRadius: BorderRadius.circular(16),
                        ),
                        child: Icon(apIcon(unit.icon), color: ApColors.goldDeep),
                      ),
                      const SizedBox(width: 14),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              unit.titleFr,
                              style: ApText.display.copyWith(fontSize: 26),
                            ),
                            if ((unit.titleBa ?? '').isNotEmpty)
                              Text(
                                unit.titleBa!,
                                style: ApText.bariba.copyWith(
                                  fontSize: 15,
                                  color: ApColors.goldDeep,
                                ),
                              ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  Text(unit.summary, style: ApText.body.copyWith(fontSize: 15)),
                  for (final section in unit.sections)
                    Padding(
                      padding: const EdgeInsets.only(top: 18),
                      child: ApSectionView(section: section),
                    ),
                  const SizedBox(height: 26),
                  ApCardBox(
                    color: ApColors.night,
                    borderColor: ApColors.night,
                    radius: 26,
                    padding: const EdgeInsets.all(18),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'TESTE TES ACQUIS',
                          style: ApText.label.copyWith(color: ApColors.goldTint),
                        ),
                        const SizedBox(height: 6),
                        Text(
                          best == null
                              ? '${unit.quiz.length} questions · 60 % pour valider'
                              : 'Meilleur score : $best %',
                          style: ApText.display.copyWith(
                            fontSize: 20,
                            color: Colors.white,
                          ),
                        ),
                        const SizedBox(height: 14),
                        ApPrimaryButton(
                          label: best == null ? 'Commencer le test' : 'Refaire le test',
                          icon: Icons.play_arrow_rounded,
                          onPressed: _startQuiz,
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Rendu d'une section de leçon selon son type.
class ApSectionView extends StatelessWidget {
  const ApSectionView({super.key, required this.section});

  final ApSection section;

  @override
  Widget build(BuildContext context) {
    switch (section.type) {
      case 'explain':
        return _Explain(section: section);
      case 'tip':
        return _Tip(section: section);
      case 'examples':
      case 'culture':
        return _Examples(section: section, culture: section.type == 'culture');
      case 'table':
        return _TableView(section: section);
      case 'pairs':
        return _Pairs(section: section);
      case 'order':
        return _Order(section: section);
      default:
        return const SizedBox.shrink();
    }
  }
}

class _Explain extends StatelessWidget {
  const _Explain({required this.section});

  final ApSection section;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (section.title.isNotEmpty)
          Text(
            section.title,
            style: const TextStyle(
              fontFamily: 'Inter',
              fontSize: 16.5,
              fontWeight: FontWeight.w800,
              color: ApColors.ink,
            ),
          ),
        const SizedBox(height: 6),
        Text(section.body, style: ApText.body),
      ],
    );
  }
}

class _Tip extends StatelessWidget {
  const _Tip({required this.section});

  final ApSection section;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: ApColors.sageTint,
        borderRadius: BorderRadius.circular(18),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Icon(Icons.tips_and_updates_rounded, color: ApColors.sageInk, size: 20),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              section.body,
              style: ApText.body.copyWith(color: const Color(0xFF24452F), fontSize: 13.5),
            ),
          ),
        ],
      ),
    );
  }
}

class _Examples extends StatelessWidget {
  const _Examples({required this.section, required this.culture});

  final ApSection section;
  final bool culture;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (section.title.isNotEmpty)
          Padding(
            padding: const EdgeInsets.only(bottom: 10),
            child: Row(
              children: [
                if (culture) ...[
                  const Icon(Icons.local_fire_department_rounded, color: ApColors.clay, size: 18),
                  const SizedBox(width: 6),
                ],
                Expanded(
                  child: Text(
                    section.title,
                    style: const TextStyle(
                      fontFamily: 'Inter',
                      fontSize: 16.5,
                      fontWeight: FontWeight.w800,
                      color: ApColors.ink,
                    ),
                  ),
                ),
              ],
            ),
          ),
        for (final item in section.items)
          Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: ApExampleTile(example: item, culture: culture),
          ),
      ],
    );
  }
}

/// Un exemple bariba + traduction + note + source.
class ApExampleTile extends StatelessWidget {
  const ApExampleTile({super.key, required this.example, this.culture = false});

  final ApExample example;
  final bool culture;

  @override
  Widget build(BuildContext context) {
    final note = example.note;
    return ApCardBox(
      padding: const EdgeInsets.fromLTRB(16, 14, 16, 12),
      color: culture ? ApColors.goldGlow : ApColors.surface,
      borderColor: culture ? ApColors.goldTint : ApColors.line,
      radius: 18,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(example.ba, style: ApText.bariba.copyWith(fontSize: 17)),
          const SizedBox(height: 3),
          Text(example.fr, style: ApText.body.copyWith(color: ApColors.quiet)),
          if (note != null && note.isNotEmpty) ...[
            const SizedBox(height: 6),
            Text(
              note,
              style: ApText.small.copyWith(
                color: ApColors.goldDeep,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
          const SizedBox(height: 8),
          ApSourceTag(example.src, verified: example.verified),
        ],
      ),
    );
  }
}

class _TableView extends StatelessWidget {
  const _TableView({required this.section});

  final ApSection section;

  @override
  Widget build(BuildContext context) {
    final columns = section.columns;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (section.title.isNotEmpty)
          Padding(
            padding: const EdgeInsets.only(bottom: 10),
            child: Text(
              section.title,
              style: const TextStyle(
                fontFamily: 'Inter',
                fontSize: 16.5,
                fontWeight: FontWeight.w800,
                color: ApColors.ink,
              ),
            ),
          ),
        ApCardBox(
          padding: EdgeInsets.zero,
          radius: 18,
          child: Column(
            children: [
              for (var r = 0; r < section.rows.length; r++)
                _TableRowCard(
                  columns: columns,
                  cells: section.rows[r],
                  first: r == 0,
                  verified: r >= section.rowStatus.length ||
                      section.rowStatus[r] == 'atteste',
                ),
            ],
          ),
        ),
      ],
    );
  }
}

/// Ligne de tableau présentée en fiche : lisible sur téléphone.
class _TableRowCard extends StatelessWidget {
  const _TableRowCard({
    required this.columns,
    required this.cells,
    required this.first,
    required this.verified,
  });

  final List<String> columns;
  final List<String> cells;
  final bool first;
  final bool verified;

  bool _isSourceColumn(int index) =>
      index < columns.length && columns[index] == 'Source';

  @override
  Widget build(BuildContext context) {
    if (cells.isEmpty) {
      return const SizedBox.shrink();
    }
    final lead = cells.first;
    final second = cells.length > 1 ? cells[1] : '';
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
      decoration: BoxDecoration(
        border: first ? null : const Border(top: BorderSide(color: ApColors.line)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.baseline,
            textBaseline: TextBaseline.alphabetic,
            children: [
              ConstrainedBox(
                constraints: const BoxConstraints(minWidth: 64, maxWidth: 150),
                child: Text(lead, style: ApText.bariba.copyWith(fontSize: 16)),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  _isSourceColumn(1) ? '' : second,
                  style: ApText.bariba.copyWith(
                    fontSize: 15,
                    fontWeight: FontWeight.w600,
                    color: ApColors.inkSoft,
                  ),
                ),
              ),
            ],
          ),
          for (var i = 2; i < cells.length; i++)
            if (cells[i].isNotEmpty && !_isSourceColumn(i))
              Padding(
                padding: const EdgeInsets.only(top: 3),
                child: Text.rich(
                  TextSpan(
                    children: [
                      TextSpan(
                        text: i < columns.length ? '${columns[i]} : ' : '',
                        style: ApText.small.copyWith(fontWeight: FontWeight.w700),
                      ),
                      TextSpan(text: cells[i], style: ApText.small.copyWith(color: ApColors.inkSoft)),
                    ],
                  ),
                ),
              ),
          for (var i = 1; i < cells.length; i++)
            if (_isSourceColumn(i))
              Padding(
                padding: const EdgeInsets.only(top: 5),
                child: ApSourceTag(cells[i], verified: verified),
              ),
        ],
      ),
    );
  }
}

class _Pairs extends StatelessWidget {
  const _Pairs({required this.section});

  final ApSection section;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          section.title,
          style: const TextStyle(
            fontFamily: 'Inter',
            fontSize: 16.5,
            fontWeight: FontWeight.w800,
            color: ApColors.ink,
          ),
        ),
        const SizedBox(height: 10),
        for (final pair in section.pairs)
          Padding(
            padding: const EdgeInsets.only(bottom: 10),
            child: Row(
              children: [
                Expanded(child: _PairSide(example: pair.a, color: ApColors.goldTint)),
                const Padding(
                  padding: EdgeInsets.symmetric(horizontal: 8),
                  child: Icon(Icons.compare_arrows_rounded, color: ApColors.muted),
                ),
                Expanded(child: _PairSide(example: pair.b, color: ApColors.clayTint)),
              ],
            ),
          ),
      ],
    );
  }
}

class _PairSide extends StatelessWidget {
  const _PairSide({required this.example, required this.color});

  final ApExample example;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: color,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(example.ba, style: ApText.bariba.copyWith(fontSize: 20)),
          const SizedBox(height: 2),
          Text(example.fr, style: ApText.body.copyWith(fontSize: 13)),
          const SizedBox(height: 4),
          Text(example.src, style: ApText.small.copyWith(fontSize: 10.5)),
        ],
      ),
    );
  }
}

class _Order extends StatelessWidget {
  const _Order({required this.section});

  final ApSection section;

  static const _roleColors = <String, Color>{
    'sujet': ApColors.goldTint,
    'reprise': ApColors.surfaceAlt,
    'objet': ApColors.sageTint,
    'verbe': ApColors.clayTint,
  };

  @override
  Widget build(BuildContext context) {
    return ApCardBox(
      radius: 22,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            section.title,
            style: const TextStyle(
              fontFamily: 'Inter',
              fontSize: 16.5,
              fontWeight: FontWeight.w800,
              color: ApColors.ink,
            ),
          ),
          const SizedBox(height: 4),
          Text(section.body, style: ApText.body),
          const SizedBox(height: 14),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              for (var i = 0; i < section.orderWords.length; i++)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  decoration: BoxDecoration(
                    color: _roleColors[i < section.orderRoles.length
                            ? section.orderRoles[i]
                            : ''] ??
                        ApColors.surfaceAlt,
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: Column(
                    children: [
                      Text(
                        section.orderWords[i],
                        style: ApText.bariba.copyWith(fontSize: 18),
                      ),
                      if (i < section.orderRoles.length)
                        Text(section.orderRoles[i], style: ApText.small.copyWith(fontSize: 11)),
                    ],
                  ),
                ),
            ],
          ),
          const SizedBox(height: 12),
          Text(section.orderFr, style: ApText.body.copyWith(color: ApColors.quiet)),
          const SizedBox(height: 6),
          ApSourceTag(section.src),
        ],
      ),
    );
  }
}
