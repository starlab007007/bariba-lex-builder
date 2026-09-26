import 'package:flutter/material.dart';
import 'package:flutter_tts/flutter_tts.dart';

import 'apprendre_models.dart';
import 'apprendre_session.dart';
import 'apprendre_store.dart';
import 'apprendre_tasks.dart';
import 'apprendre_ui.dart';

Future<void> showApWordSheet(
  BuildContext context, {
  required ApCard card,
  required ApprendreStore store,
}) {
  return showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    showDragHandle: true,
    backgroundColor: ApColors.ivory,
    builder: (_) => _WordSheet(card: card, store: store),
  );
}

class _WordSheet extends StatelessWidget {
  const _WordSheet({required this.card, required this.store});
  final ApCard card;
  final ApprendreStore store;

  @override
  Widget build(BuildContext context) {
    final state = store.progress.srs[card.id];
    return SafeArea(
      top: false,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(20, 2, 20, 26),
        child: ListView(
          shrinkWrap: true,
          children: [
            Row(
              children: [
                Expanded(
                  child: ApBaribaText(
                    card.ba,
                    size: 28,
                    transcription: card.transcription,
                  ),
                ),
                IconButton(
                  tooltip: 'Écouter',
                  onPressed: () async {
                    final tts = FlutterTts();
                    try {
                      await tts.setLanguage('fr-FR');
                      await tts.setSpeechRate(.38);
                      await tts.speak(card.ba);
                    } finally {
                      // Le moteur du téléphone n'a pas forcément une voix bàátɔ̀nú.
                    }
                  },
                  icon: const Icon(
                    Icons.volume_up_rounded,
                    color: ApColors.goldDeep,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 6),
            Text(card.fr, style: ApText.body.copyWith(fontSize: 16)),
            const SizedBox(height: 12),
            Wrap(
              spacing: 7,
              runSpacing: 7,
              children: [
                if (card.pos.isNotEmpty) ApPill(card.pos),
                if ((card.nounClass ?? '').isNotEmpty)
                  ApPill('classe ${card.nounClass}'),
                if ((card.plural ?? '').isNotEmpty)
                  ApPill('pl. ${card.plural}'),
                if (state != null)
                  ApPill(
                    'boîte ${state.box}',
                    background: ApColors.sageTint,
                    foreground: ApColors.sageInk,
                  ),
              ],
            ),
            if (card.conjugation.isNotEmpty) ...[
              const ApSectionTitle('Formes verbales'),
              for (final entry in card.conjugation.entries)
                Padding(
                  padding: const EdgeInsets.only(bottom: 5),
                  child: Row(
                    children: [
                      SizedBox(
                        width: 88,
                        child: Text(
                          switch (entry.key) {
                            'inacc' => 'Inaccompli',
                            'acc' => 'Accompli',
                            'neg' => 'Négatif',
                            'imp' => 'Impératif',
                            _ => entry.key,
                          },
                          style: ApText.small,
                        ),
                      ),
                      Expanded(
                        child: Text(
                          entry.value,
                          style: ApText.bariba.copyWith(fontSize: 15),
                        ),
                      ),
                    ],
                  ),
                ),
            ],
            if (card.hasExample) ...[
              const ApSectionTitle('En phrase'),
              ApCardBox(
                color: ApColors.goldGlow,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(card.exampleBa!, style: ApText.bariba.copyWith(fontSize: 17)),
                    const SizedBox(height: 4),
                    Text(card.exampleFr!, style: ApText.body),
                  ],
                ),
              ),
            ],
            const SizedBox(height: 16),
            ApSourceTag(card.source, verified: card.verified),
          ],
        ),
      ),
    );
  }
}

class ApThemeScreen extends StatefulWidget {
  const ApThemeScreen({
    super.key,
    required this.content,
    required this.theme,
    required this.store,
  });

  final ApprendreContent content;
  final ApTheme theme;
  final ApprendreStore store;

  @override
  State<ApThemeScreen> createState() => _ApThemeScreenState();
}

class _ApThemeScreenState extends State<ApThemeScreen> {
  String _query = '';

  Future<void> _learn() async {
    final tasks = ApTaskFactory(widget.content).themeSession(
      widget.theme,
      widget.store.progress,
      now: DateTime.now(),
    );
    await Navigator.of(context).push<ApSessionResult>(
      MaterialPageRoute(
        builder: (_) => ApSessionScreen(
          title: widget.theme.nameFr,
          tasks: tasks,
          store: widget.store,
          sessionKey: widget.theme.id,
        ),
      ),
    );
    if (mounted) setState(() {});
  }

  @override
  Widget build(BuildContext context) {
    final all = widget.content.cardsOf(widget.theme);
    final q = _query.trim().toLowerCase();
    final cards = q.isEmpty
        ? all
        : all
            .where(
              (card) =>
                  card.ba.toLowerCase().contains(q) ||
                  card.fr.toLowerCase().contains(q),
            )
            .toList();
    final learned = widget.store.progress.learnedIn(widget.theme);
    return Scaffold(
      backgroundColor: ApColors.ivory,
      body: SafeArea(
        child: Column(
          children: [
            ApTopBar(
              title: widget.theme.nameFr,
              subtitle: '$learned / ${widget.theme.cardIds.length} mots actifs',
            ),
            Expanded(
              child: ListView(
                padding: const EdgeInsets.fromLTRB(20, 8, 20, 26),
                children: [
                  ApCardBox(
                    color: Color(widget.theme.argb).withValues(alpha: .09),
                    borderColor: Color(widget.theme.argb).withValues(alpha: .35),
                    child: Row(
                      children: [
                        Icon(
                          apIcon(widget.theme.icon),
                          color: Color(widget.theme.argb),
                          size: 30,
                        ),
                        const SizedBox(width: 14),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                widget.theme.nameFr,
                                style: ApText.display.copyWith(fontSize: 22),
                              ),
                              const SizedBox(height: 6),
                              ApProgressBar(
                                value: widget.theme.cardIds.isEmpty
                                    ? 0
                                    : learned / widget.theme.cardIds.length,
                                color: Color(widget.theme.argb),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 12),
                  ApPrimaryButton(
                    label: 'Séance du jour',
                    icon: Icons.play_arrow_rounded,
                    onPressed: _learn,
                  ),
                  const SizedBox(height: 16),
                  TextField(
                    onChanged: (value) => setState(() => _query = value),
                    decoration: const InputDecoration(
                      hintText: 'Chercher un mot…',
                      prefixIcon: Icon(Icons.search_rounded),
                    ),
                  ),
                  const SizedBox(height: 12),
                  for (final card in cards.take(120))
                    Padding(
                      padding: const EdgeInsets.only(bottom: 7),
                      child: _WordTile(
                        card: card,
                        state: widget.store.progress.srs[card.id],
                        onTap: () => showApWordSheet(
                          context,
                          card: card,
                          store: widget.store,
                        ),
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

class _WordTile extends StatelessWidget {
  const _WordTile({
    required this.card,
    required this.state,
    required this.onTap,
  });
  final ApCard card;
  final SrsState? state;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return ApCardBox(
      radius: 16,
      padding: const EdgeInsets.fromLTRB(14, 11, 12, 11),
      onTap: onTap,
      child: Row(
        children: [
          SizedBox(
            width: 34,
            child: Icon(
              state?.active == true
                  ? Icons.check_circle_rounded
                  : state == null
                      ? Icons.radio_button_unchecked_rounded
                      : Icons.timelapse_rounded,
              color: state?.active == true
                  ? ApColors.sage
                  : state == null
                      ? ApColors.lineStrong
                      : ApColors.goldDeep,
              size: 20,
            ),
          ),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(card.ba, style: ApText.bariba.copyWith(fontSize: 16)),
                Text(
                  card.fr,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: ApText.small.copyWith(color: ApColors.quiet),
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

class ApSceneScreen extends StatefulWidget {
  const ApSceneScreen({super.key, required this.scene});
  final ApScene scene;

  @override
  State<ApSceneScreen> createState() => _ApSceneScreenState();
}

class _ApSceneScreenState extends State<ApSceneScreen> {
  final _tts = FlutterTts();

  @override
  void dispose() {
    _tts.stop();
    super.dispose();
  }

  Future<void> _speak(String text) async {
    try {
      await _tts.setLanguage('fr-FR');
      await _tts.setSpeechRate(.4);
      await _tts.speak(text);
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    final scene = widget.scene;
    return Scaffold(
      backgroundColor: ApColors.ivory,
      body: SafeArea(
        child: Column(
          children: [
            ApTopBar(title: scene.title, subtitle: scene.place),
            Expanded(
              child: ListView(
                padding: const EdgeInsets.fromLTRB(20, 10, 20, 28),
                children: [
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: ApColors.night,
                      borderRadius: BorderRadius.circular(24),
                    ),
                    child: Row(
                      children: [
                        Icon(apIcon(scene.icon), color: ApColors.gold, size: 34),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Text(
                            scene.culture,
                            style: ApText.body.copyWith(
                              color: ApColors.nightText,
                              fontSize: 13.5,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 18),
                  for (final line in scene.lines)
                    Align(
                      alignment: line.isLearner
                          ? Alignment.centerRight
                          : Alignment.centerLeft,
                      child: Container(
                        constraints: const BoxConstraints(maxWidth: 310),
                        margin: const EdgeInsets.only(bottom: 10),
                        padding: const EdgeInsets.all(14),
                        decoration: BoxDecoration(
                          color: line.isLearner
                              ? ApColors.goldTint
                              : ApColors.surface,
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(
                            color: line.isLearner
                                ? ApColors.gold
                                : ApColors.line,
                          ),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(line.ba, style: ApText.bariba.copyWith(fontSize: 17)),
                            const SizedBox(height: 3),
                            Text(line.fr, style: ApText.small.copyWith(color: ApColors.inkSoft)),
                            const SizedBox(height: 8),
                            Row(
                              children: [
                                Expanded(child: ApSourceTag(line.src)),
                                IconButton(
                                  visualDensity: VisualDensity.compact,
                                  tooltip: 'Écouter',
                                  onPressed: () => _speak(line.ba),
                                  icon: const Icon(
                                    Icons.volume_up_rounded,
                                    color: ApColors.goldDeep,
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
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

class ApProgressScreen extends StatelessWidget {
  const ApProgressScreen({
    super.key,
    required this.content,
    required this.store,
  });

  final ApprendreContent content;
  final ApprendreStore store;

  @override
  Widget build(BuildContext context) {
    final p = store.progress;
    final due = p.dueCardIds(DateTime.now()).length;
    final forecast = p.dueForecast(DateTime.now());
    return Scaffold(
      backgroundColor: ApColors.ivory,
      body: SafeArea(
        child: Column(
          children: [
            const ApTopBar(title: 'Ma progression', subtitle: 'Mɛɛribu'),
            Expanded(
              child: ListView(
                padding: const EdgeInsets.fromLTRB(20, 8, 20, 28),
                children: [
                  GridView.count(
                    crossAxisCount: 2,
                    childAspectRatio: 1.35,
                    crossAxisSpacing: 10,
                    mainAxisSpacing: 10,
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    children: [
                      _Stat('Mots actifs', '${p.activeWords}', Icons.check_circle_rounded),
                      _Stat('À revoir', '$due', Icons.update_rounded),
                      _Stat('Fondations', '${p.foundationsDone}/${content.foundations.length}', Icons.auto_stories_rounded),
                      _Stat('Série', '${p.streak} j', Icons.local_fire_department_rounded),
                    ],
                  ),
                  const ApSectionTitle('Les 7 prochains jours'),
                  ApCardBox(
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
                                  Text('${forecast[i]}', style: ApText.small),
                                  const SizedBox(height: 4),
                                  Container(
                                    height: 12 + forecast[i].clamp(0, 12) * 5,
                                    decoration: BoxDecoration(
                                      color: i == 0 ? ApColors.clay : ApColors.gold,
                                      borderRadius: BorderRadius.circular(7),
                                    ),
                                  ),
                                  const SizedBox(height: 5),
                                  Text(i == 0 ? 'auj.' : 'J+$i', style: ApText.small.copyWith(fontSize: 10)),
                                ],
                              ),
                            ),
                          ),
                      ],
                    ),
                  ),
                  const ApSectionTitle('Vocabulaire par thème'),
                  for (final theme in content.themes)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 9),
                      child: ApCardBox(
                        radius: 16,
                        child: Row(
                          children: [
                            Icon(apIcon(theme.icon), color: Color(theme.argb)),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(theme.nameFr, style: ApText.body.copyWith(fontWeight: FontWeight.w800)),
                                  const SizedBox(height: 5),
                                  ApProgressBar(
                                    value: theme.cardIds.isEmpty
                                        ? 0
                                        : p.learnedIn(theme) / theme.cardIds.length,
                                    color: Color(theme.argb),
                                  ),
                                ],
                              ),
                            ),
                            const SizedBox(width: 10),
                            Text(
                              '${p.learnedIn(theme)}',
                              style: ApText.display.copyWith(fontSize: 18),
                            ),
                          ],
                        ),
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

class _Stat extends StatelessWidget {
  const _Stat(this.label, this.value, this.icon);
  final String label;
  final String value;
  final IconData icon;

  @override
  Widget build(BuildContext context) => ApCardBox(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(icon, color: ApColors.goldDeep),
            const Spacer(),
            Text(value, style: ApText.display.copyWith(fontSize: 24)),
            Text(label, style: ApText.small),
          ],
        ),
      );
}
