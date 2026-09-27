import 'package:flutter/material.dart';

import 'apprendre_daily.dart';
import 'apprendre_explore.dart';
import 'apprendre_models.dart';
import 'apprendre_session.dart';
import 'apprendre_store.dart';
import 'apprendre_tasks.dart';
import 'apprendre_ui.dart';

/// Ouvre une séance puis rafraîchit l'écran appelant au retour.
Future<void> openApSession(
  BuildContext context, {
  required String title,
  required List<ApTask> tasks,
  required ApprendreStore store,
  required String sessionKey,
}) {
  return Navigator.of(context).push<void>(
    MaterialPageRoute<void>(
      builder: (_) => ApSessionScreen(
        title: title,
        tasks: tasks,
        store: store,
        sessionKey: sessionKey,
      ),
    ),
  );
}

/// Module Révision : mots à revoir, boîtes de mémoire, prévisions et
/// lancement des séances (révision, entraînement libre, séance du jour).
class ApReviewScreen extends StatefulWidget {
  const ApReviewScreen({super.key, required this.content, required this.store});

  final ApprendreContent content;
  final ApprendreStore store;

  @override
  State<ApReviewScreen> createState() => _ApReviewScreenState();
}

class _ApReviewScreenState extends State<ApReviewScreen> {
  late final ApSessionPlanner _planner = ApSessionPlanner(widget.content);

  static const _boxLabels = ['1 j', '2 j', '4 j', '8 j', '16 j', '32 j', '64 j'];

  Future<void> _run(String title, List<ApTask> tasks, String key) async {
    await openApSession(
      context,
      title: title,
      tasks: tasks,
      store: widget.store,
      sessionKey: key,
    );
    if (mounted) {
      setState(() {});
    }
  }

  void _review() {
    final tasks = ApTaskFactory(widget.content)
        .reviewSession(widget.store.progress, now: DateTime.now());
    _run('Révision', tasks, 'revision');
  }

  void _practice() {
    final tasks = _planner.practiceSession(widget.store.progress, now: DateTime.now());
    _run('Entraînement libre', tasks, 'entrainement');
  }

  void _daily() {
    final tasks = _planner.dailySession(widget.store.progress, now: DateTime.now());
    _run('Séance du jour', tasks, 'seance_du_jour');
  }

  @override
  Widget build(BuildContext context) {
    final content = widget.content;
    final progress = widget.store.progress;
    final now = DateTime.now();
    final due = progress.dueCardIds(now);
    final boxes = List<int>.filled(7, 0);
    for (final state in progress.srs.values) {
      boxes[state.box.clamp(1, 7) - 1]++;
    }
    final maxBox = boxes.fold<int>(1, (a, b) => a > b ? a : b);
    final forecast = progress.dueForecast(now);
    final maxDue = forecast.fold<int>(1, (a, b) => a > b ? a : b);
    const days = ['Auj.', 'J+1', 'J+2', 'J+3', 'J+4', 'J+5', 'J+6'];

    return Scaffold(
      backgroundColor: ApColors.ivory,
      body: SafeArea(
        child: Column(
          children: [
            const ApTopBar(title: 'Révision', subtitle: 'Répétition espacée · hors-ligne'),
            Expanded(
              child: ListView(
                padding: const EdgeInsets.fromLTRB(20, 4, 20, 28),
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: _Stat(
                          value: '${due.length}',
                          label: 'À revoir',
                          icon: Icons.bolt_rounded,
                          color: ApColors.clay,
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: _Stat(
                          value: '${progress.seenWords}',
                          label: 'Mots vus',
                          icon: Icons.visibility_rounded,
                          color: ApColors.goldDeep,
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: _Stat(
                          value: '${progress.activeWords}',
                          label: 'Mots actifs',
                          icon: Icons.check_circle_rounded,
                          color: ApColors.sage,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  if (due.isNotEmpty)
                    ApPrimaryButton(
                      label: 'Réviser maintenant (${due.length})',
                      icon: Icons.bolt_rounded,
                      onPressed: _review,
                    )
                  else
                    ApCardBox(
                      padding: const EdgeInsets.all(14),
                      child: Text(
                        progress.seenWords == 0
                            ? 'Aucun mot à réviser : commence par la séance du jour. '
                                  'Chaque mot appris reviendra ici juste avant d’être oublié.'
                            : 'Aucun mot ne s’efface aujourd’hui. Tu peux t’entraîner librement '
                                  'ou lancer la séance du jour.',
                        style: ApText.small.copyWith(color: ApColors.inkSoft),
                      ),
                    ),
                  const SizedBox(height: 10),
                  Row(
                    children: [
                      Expanded(
                        child: ApSecondaryButton(
                          label: 'Séance du jour',
                          icon: Icons.play_arrow_rounded,
                          onPressed: _daily,
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: ApSecondaryButton(
                          label: 'Entraînement',
                          icon: Icons.fitness_center_rounded,
                          onPressed: progress.seenWords == 0 ? null : _practice,
                        ),
                      ),
                    ],
                  ),
                  if (due.isNotEmpty) ...[
                    ApSectionTitle(
                      'À revoir avant d’oublier',
                      trailing: Text('${due.length} mots', style: ApText.small),
                    ),
                    for (final id in due.take(20))
                      if (content.cards[id] != null)
                        Padding(
                          padding: const EdgeInsets.only(bottom: 8),
                          child: _WordRow(
                            card: content.cards[id]!,
                            retention: progress.srs[id]?.retention(now) ?? 0.0,
                            onTap: () => showApWordSheet(
                              context,
                              card: content.cards[id]!,
                              store: widget.store,
                            ),
                          ),
                        ),
                  ],
                  const ApSectionTitle('Boîtes de mémoire'),
                  ApCardBox(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        SizedBox(
                          height: 120,
                          child: Row(
                            crossAxisAlignment: CrossAxisAlignment.end,
                            children: [
                              for (var i = 0; i < 7; i++)
                                Expanded(
                                  child: Padding(
                                    padding: const EdgeInsets.symmetric(horizontal: 3),
                                    child: Column(
                                      mainAxisAlignment: MainAxisAlignment.end,
                                      children: [
                                        Text('${boxes[i]}', style: ApText.small.copyWith(fontSize: 11)),
                                        const SizedBox(height: 4),
                                        Container(
                                          height: 6 + 70 * boxes[i] / maxBox,
                                          decoration: BoxDecoration(
                                            color: i < 1
                                                ? ApColors.clay
                                                : i < 3
                                                ? ApColors.gold
                                                : ApColors.sage,
                                            borderRadius: BorderRadius.circular(8),
                                          ),
                                        ),
                                        const SizedBox(height: 6),
                                        Text(
                                          _boxLabels[i],
                                          style: ApText.small.copyWith(fontSize: 10.5),
                                        ),
                                      ],
                                    ),
                                  ),
                                ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 10),
                        Text(
                          'Une bonne réponse fait monter le mot d’une boîte et l’espace davantage ; '
                          'une erreur le ramène dans la première boîte.',
                          style: ApText.small.copyWith(fontSize: 11.5),
                        ),
                      ],
                    ),
                  ),
                  const ApSectionTitle('Révisions à venir'),
                  ApCardBox(
                    child: SizedBox(
                      height: 110,
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          for (var i = 0; i < forecast.length; i++)
                            Expanded(
                              child: Padding(
                                padding: const EdgeInsets.symmetric(horizontal: 3),
                                child: Column(
                                  mainAxisAlignment: MainAxisAlignment.end,
                                  children: [
                                    Text('${forecast[i]}', style: ApText.small.copyWith(fontSize: 11)),
                                    const SizedBox(height: 4),
                                    Container(
                                      height: 4 + 60 * forecast[i] / maxDue,
                                      decoration: BoxDecoration(
                                        color: i == 0 ? ApColors.gold : ApColors.goldTint,
                                        borderRadius: BorderRadius.circular(8),
                                      ),
                                    ),
                                    const SizedBox(height: 6),
                                    Text(days[i], style: ApText.small.copyWith(fontSize: 10.5)),
                                  ],
                                ),
                              ),
                            ),
                        ],
                      ),
                    ),
                  ),
                  const ApSectionTitle('Les 7 exercices d’une séance'),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      for (final skill in ApSessionPlanner.skillsFor(progress.profile))
                        ApPill(
                          ApTask.skillLabel(skill),
                          icon: ApResultScreen.skillIcon(skill),
                          background: ApColors.surfaceAlt,
                          foreground: ApColors.inkSoft,
                        ),
                    ],
                  ),
                  if (progress.profile == 'oral') ...[
                    const SizedBox(height: 8),
                    Text(
                      'Profil « Je ne lis pas encore » : les exercices de lecture de phrase '
                      'sont remplacés par l’écoute et la prononciation.',
                      style: ApText.small.copyWith(fontSize: 11.5),
                    ),
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _Stat extends StatelessWidget {
  const _Stat({
    required this.value,
    required this.label,
    required this.icon,
    required this.color,
  });

  final String value;
  final String label;
  final IconData icon;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return ApCardBox(
      padding: const EdgeInsets.all(12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 18, color: color),
          const SizedBox(height: 6),
          Text(value, style: ApText.display.copyWith(fontSize: 24)),
          Text(label, style: ApText.small.copyWith(fontSize: 11.5)),
        ],
      ),
    );
  }
}

class _WordRow extends StatelessWidget {
  const _WordRow({required this.card, required this.retention, required this.onTap});

  final ApCard card;
  final double retention;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final pct = (retention * 100).round();
    final color = pct < 50
        ? ApColors.clay
        : pct < 70
        ? ApColors.gold
        : ApColors.sage;
    return ApCardBox(
      padding: const EdgeInsets.fromLTRB(14, 10, 14, 10),
      radius: 18,
      onTap: onTap,
      child: Row(
        children: [
          ApRing(value: retention, label: '$pct %', size: 44, color: color),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(card.ba, style: ApText.bariba.copyWith(fontSize: 16)),
                Text(
                  card.fr,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: ApText.small,
                ),
              ],
            ),
          ),
          const Icon(Icons.chevron_right_rounded, color: ApColors.muted),
        ],
      ),
    );
  }
}
