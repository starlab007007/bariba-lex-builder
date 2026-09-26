import 'package:flutter/material.dart';

import 'apprendre_models.dart';
import 'apprendre_session.dart';
import 'apprendre_store.dart';
import 'apprendre_tasks.dart';
import 'apprendre_ui.dart';

/// Fiche d'un mot : forme, classe, pluriel, conjugaison, exemple, source.
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
    builder: (sheetContext) => _WordSheet(card: card, store: store),
  );
}

class _WordSheet extends StatelessWidget {
  const _WordSheet({required this.card, required this.store});

  final ApCard card;
  final ApprendreStore store;

  @override
  Widget build(BuildContext context) {
    final state = store.progress.srs[card.id];
    final conj = card.conjugation;
    final labels = <String, String>{
      'inacc': 'En train de (inaccompli)',
      'acc': 'Fait (accompli)',
      'neg': 'Pas fait (négatif)',
      'imp': 'Ordre (impératif)',
    };
    return SafeArea(
      child: ConstrainedBox(
        constraints: BoxConstraints(maxHeight: MediaQuery.sizeOf(context).height * .82),
        child: ListView(
          shrinkWrap: true,
          padding: const EdgeInsets.fromLTRB(20, 0, 20, 24),
          children: [
            ApBaribaText(card.ba, size: 30, transcription: card.transcription),
            const SizedBox(height: 6),
            Text(card.fr, style: ApText.display.copyWith(fontSize: 20)),
            const SizedBox(height: 10),
            Wrap(
              spacing: 6,
              runSpacing: 6,
              children: [
                ApPill(card.pos, background: ApColors.surfaceAlt, foreground: ApColors.quiet),
                if (card.nounClass != null)
                  ApPill('classe ${card.nounClass}', background: ApColors.surfaceAlt, foreground: ApColors.quiet),
                if (state != null)
                  ApPill(
                    state.active ? 'Mot actif' : 'En cours',
                    icon: state.active ? Icons.bolt_rounded : Icons.schedule_rounded,
                    background: state.active ? ApColors.sageTint : ApColors.goldTint,
                    foreground: state.active ? ApColors.sageInk : ApColors.goldDeep,
                  ),
              ],
            ),
            if (card.plural != null || card.focus != null) ...[
              const ApSectionTitle('Formes'),
              ApCardBox(
                padding: const EdgeInsets.all(14),
                child: Column(
                  children: [
                    if (card.plural != null) _FormRow(label: 'Pluriel', value: card.plural!),
                    if (card.focus != null) _FormRow(label: 'Insistance (focalisé)', value: card.focus!),
                  ],
                ),
              ),
            ],
            if (conj.isNotEmpty) ...[
              const ApSectionTitle('Conjugaison'),
              ApCardBox(
                padding: const EdgeInsets.all(14),
                child: Column(
                  children: [
                    for (final key in const ['inacc', 'acc', 'neg', 'imp'])
                      if ((conj[key] ?? '').isNotEmpty)
                        _FormRow(label: labels[key]!, value: conj[key]!),
                  ],
                ),
              ),
            ],
            if (card.hasExample) ...[
              const ApSectionTitle('En phrase'),
              ApCardBox(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(card.exampleBa!, style: ApText.bariba.copyWith(fontSize: 17)),
                    const SizedBox(height: 4),
                    Text(card.exampleFr!, style: ApText.body.copyWith(color: ApColors.quiet)),
                  ],
                ),
              ),
            ],
            const SizedBox(height: 14),
            ApSourceTag(card.source, verified: card.verified),
          ],
        ),
      ),
    );
  }
}

class _FormRow extends StatelessWidget {
  const _FormRow({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 5),
      child: Row(
        children: [
          Expanded(child: Text(label, style: ApText.small)),
          Text(value, style: ApText.bariba.copyWith(fontSize: 16)),
        ],
      ),
    );
  }
}

/// Thème de vocabulaire : liste des mots et lancement d'une séance.
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

  Future<void> _startSession() async {
    final tasks = ApTaskFactory(widget.content).themeSession(
      widget.theme,
      widget.store.progress,
      now: DateTime.now(),
    );
    await Navigator.of(context).push<ApSessionResult>(
      MaterialPageRoute<ApSessionResult>(
        builder: (_) => ApSessionScreen(
          title: widget.theme.nameFr,
          tasks: tasks,
          store: widget.store,
          sessionKey: widget.theme.id,
        ),
      ),
    );
    if (mounted) {
      setState(() {});
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = widget.theme;
    final progress = widget.store.progress;
    final cards = widget.content.cardsOf(theme);
    final query = baseForm(_query);
    final visible = query.isEmpty
        ? cards
        : cards
              .where(
                (card) =>
                    baseForm(card.ba).contains(query) ||
                    card.fr.toLowerCase().contains(_query.toLowerCase()),
              )
              .toList();
    final learned = progress.learnedIn(theme);
    final color = Color(theme.argb);
    return Scaffold(
      backgroundColor: ApColors.ivory,
      body: SafeArea(
        child: Column(
          children: [
            ApTopBar(title: theme.nameFr, subtitle: '${cards.length} mots vérifiés'),
            Expanded(
              child: ListView(
                padding: const EdgeInsets.fromLTRB(20, 4, 20, 24),
                children: [
                  ApCardBox(
                    radius: 24,
                    child: Row(
                      children: [
                        ApRing(
                          value: cards.isEmpty ? 0.0 : learned / cards.length,
                          label: '$learned',
                          color: color,
                        ),
                        const SizedBox(width: 14),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                learned == 0
                                    ? 'Commence par 6 mots'
                                    : '$learned mots actifs',
                                style: ApText.display.copyWith(fontSize: 19),
                              ),
                              const SizedBox(height: 2),
                              const Text(
                                'Chaque séance mêle nouveaux mots et révisions.',
                                style: ApText.small,
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 12),
                  ApPrimaryButton(
                    label: learned == 0 ? 'Commencer la séance' : 'Continuer la séance',
                    icon: Icons.play_arrow_rounded,
                    onPressed: cards.isEmpty ? null : _startSession,
                  ),
                  const SizedBox(height: 18),
                  TextField(
                    onChanged: (value) => setState(() => _query = value),
                    decoration: InputDecoration(
                      hintText: 'Chercher un mot (bàátɔ̀nú ou français)',
                      prefixIcon: const Icon(Icons.search_rounded),
                      filled: true,
                      fillColor: ApColors.surface,
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(16),
                        borderSide: const BorderSide(color: ApColors.line),
                      ),
                      enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(16),
                        borderSide: const BorderSide(color: ApColors.line),
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                  for (final card in visible.take(120))
                    Padding(
                      padding: const EdgeInsets.only(bottom: 8),
                      child: ApCardBox(
                        padding: const EdgeInsets.fromLTRB(16, 12, 12, 12),
                        radius: 16,
                        onTap: () => showApWordSheet(context, card: card, store: widget.store),
                        child: Row(
                          children: [
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(card.ba, style: ApText.bariba.copyWith(fontSize: 17)),
                                  const SizedBox(height: 2),
                                  Text(
                                    card.fr,
                                    maxLines: 2,
                                    overflow: TextOverflow.ellipsis,
                                    style: ApText.small.copyWith(color: ApColors.quiet),
                                  ),
                                ],
                              ),
                            ),
                            _MasteryDot(state: progress.srs[card.id]),
                            const Icon(Icons.chevron_right_rounded, color: ApColors.muted),
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

class _MasteryDot extends StatelessWidget {
  const _MasteryDot({required this.state});

  final SrsState? state;

  @override
  Widget build(BuildContext context) {
    final current = state;
    final color = current == null
        ? ApColors.line
        : current.active
        ? ApColors.sage
        : ApColors.gold;
    return Container(
      width: 10,
      height: 10,
      margin: const EdgeInsets.symmetric(horizontal: 8),
      decoration: BoxDecoration(color: color, shape: BoxShape.circle),
    );
  }
}

/// Jeu de rôle guidé avec des phrases attestées.
class ApSceneScreen extends StatefulWidget {
  const ApSceneScreen({super.key, required this.scene});

  final ApScene scene;

  @override
  State<ApSceneScreen> createState() => _ApSceneScreenState();
}

class _ApSceneScreenState extends State<ApSceneScreen> {
  int _shown = 1;
  bool _showFrench = true;

  @override
  Widget build(BuildContext context) {
    final scene = widget.scene;
    final lines = scene.lines.take(_shown).toList();
    final finished = _shown >= scene.lines.length;
    final nextIsLearner = !finished && scene.lines[_shown].isLearner;
    return Scaffold(
      backgroundColor: ApColors.ivory,
      body: SafeArea(
        child: Column(
          children: [
            Container(
              width: double.infinity,
              padding: const EdgeInsets.only(bottom: 18),
              decoration: const BoxDecoration(
                gradient: LinearGradient(
                  colors: [ApColors.clay, ApColors.goldDeep],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  ApTopBar(
                    title: 'Jeu de rôle',
                    subtitle: scene.place,
                    dark: true,
                    trailing: TextButton(
                      onPressed: () => setState(() => _showFrench = !_showFrench),
                      style: TextButton.styleFrom(foregroundColor: Colors.white),
                      child: Text(_showFrench ? 'Masquer le français' : 'Voir le français'),
                    ),
                  ),
                  Padding(
                    padding: const EdgeInsets.fromLTRB(20, 4, 20, 0),
                    child: Text(
                      scene.title,
                      style: ApText.display.copyWith(color: Colors.white, fontSize: 24),
                    ),
                  ),
                ],
              ),
            ),
            Expanded(
              child: ListView(
                padding: const EdgeInsets.fromLTRB(16, 16, 16, 16),
                children: [
                  for (final line in lines)
                    _Bubble(line: line, showFrench: _showFrench),
                  if (finished)
                    Container(
                      margin: const EdgeInsets.only(top: 8),
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: ApColors.sageTint,
                        borderRadius: BorderRadius.circular(18),
                      ),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Icon(Icons.local_fire_department_rounded, color: ApColors.sageInk),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Text(
                              scene.culture,
                              style: ApText.body.copyWith(color: const Color(0xFF24452F)),
                            ),
                          ),
                        ],
                      ),
                    ),
                ],
              ),
            ),
            Container(
              padding: const EdgeInsets.fromLTRB(20, 12, 20, 20),
              decoration: const BoxDecoration(
                color: ApColors.surface,
                border: Border(top: BorderSide(color: ApColors.line)),
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  if (nextIsLearner)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 10),
                      child: Text(
                        'À toi : dis « ${scene.lines[_shown].ba} » à voix haute, puis continue.',
                        textAlign: TextAlign.center,
                        style: ApText.small.copyWith(color: ApColors.inkSoft),
                      ),
                    ),
                  ApPrimaryButton(
                    label: finished ? 'Terminer la scène' : (nextIsLearner ? 'Je l’ai dit' : 'Suite'),
                    onPressed: () {
                      if (finished) {
                        Navigator.of(context).maybePop();
                      } else {
                        setState(() => _shown++);
                      }
                    },
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

class _Bubble extends StatelessWidget {
  const _Bubble({required this.line, required this.showFrench});

  final ApSceneLine line;
  final bool showFrench;

  @override
  Widget build(BuildContext context) {
    final mine = line.isLearner;
    return Align(
      alignment: mine ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        constraints: BoxConstraints(maxWidth: MediaQuery.sizeOf(context).width * .8),
        margin: const EdgeInsets.only(bottom: 10),
        padding: const EdgeInsets.fromLTRB(14, 10, 14, 10),
        decoration: BoxDecoration(
          color: mine ? ApColors.night : ApColors.surface,
          border: mine ? null : Border.all(color: ApColors.line),
          borderRadius: BorderRadius.only(
            topLeft: const Radius.circular(18),
            topRight: const Radius.circular(18),
            bottomLeft: Radius.circular(mine ? 18 : 4),
            bottomRight: Radius.circular(mine ? 4 : 18),
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              line.ba,
              style: ApText.bariba.copyWith(
                fontSize: 17,
                color: mine ? Colors.white : ApColors.ink,
              ),
            ),
            if (showFrench) ...[
              const SizedBox(height: 3),
              Text(
                line.fr,
                style: ApText.small.copyWith(
                  color: mine ? ApColors.nightText : ApColors.quiet,
                ),
              ),
            ],
            const SizedBox(height: 4),
            Text(
              line.src,
              style: ApText.small.copyWith(
                fontSize: 10.5,
                color: mine ? ApColors.nightText : ApColors.muted,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Tableau de bord : mots actifs, fondations, série, prévision des révisions.
class ApProgressScreen extends StatelessWidget {
  const ApProgressScreen({super.key, required this.content, required this.store});

  final ApprendreContent content;
  final ApprendreStore store;

  @override
  Widget build(BuildContext context) {
    final progress = store.progress;
    final now = DateTime.now();
    final forecast = progress.dueForecast(now);
    final maxDue = forecast.fold<int>(1, (a, b) => a > b ? a : b);
    const days = ['Auj.', 'J+1', 'J+2', 'J+3', 'J+4', 'J+5', 'J+6'];
    return Scaffold(
      backgroundColor: ApColors.ivory,
      body: SafeArea(
        child: Column(
          children: [
            const ApTopBar(title: 'Ma progression', subtitle: 'Enregistrée sur cet appareil'),
            Expanded(
              child: ListView(
                padding: const EdgeInsets.fromLTRB(20, 4, 20, 24),
                children: [
                  GridView.count(
                    crossAxisCount: 2,
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    crossAxisSpacing: 10,
                    mainAxisSpacing: 10,
                    childAspectRatio: 1.7,
                    children: [
                      _StatTile(
                        label: 'Mots actifs',
                        value: '${progress.activeWords}',
                        ratio: content.cards.isEmpty ? 0.0 : progress.activeWords / content.cards.length,
                        color: ApColors.gold,
                      ),
                      _StatTile(
                        label: 'Fondations',
                        value: '${progress.foundationsDone}/${content.foundations.length}',
                        ratio: content.foundations.isEmpty
                            ? 0.0
                            : progress.foundationsDone / content.foundations.length,
                        color: ApColors.sage,
                      ),
                      _StatTile(
                        label: 'Jours de suite',
                        value: '${progress.streak}',
                        ratio: (progress.streak / 7).clamp(0.0, 1.0),
                        color: ApColors.clay,
                      ),
                      _StatTile(
                        label: 'Points',
                        value: '${progress.xp}',
                        ratio: ((progress.xp % 500) / 500),
                        color: ApColors.goldDeep,
                      ),
                    ],
                  ),
                  const ApSectionTitle('Révisions à venir'),
                  ApCardBox(
                    radius: 22,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          forecast.first == 0
                              ? 'Rien à revoir aujourd’hui'
                              : '${forecast.first} mots à revoir aujourd’hui',
                          style: ApText.display.copyWith(fontSize: 19),
                        ),
                        const SizedBox(height: 2),
                        const Text(
                          'Chaque mot revient juste avant d’être oublié : 1, 2, 4, 8… jours.',
                          style: ApText.small,
                        ),
                        const SizedBox(height: 16),
                        SizedBox(
                          height: 120,
                          child: Row(
                            crossAxisAlignment: CrossAxisAlignment.end,
                            children: [
                              for (var i = 0; i < forecast.length; i++)
                                Expanded(
                                  child: Padding(
                                    padding: const EdgeInsets.symmetric(horizontal: 4),
                                    child: Column(
                                      mainAxisAlignment: MainAxisAlignment.end,
                                      children: [
                                        Text('${forecast[i]}', style: ApText.small.copyWith(fontWeight: FontWeight.w700)),
                                        const SizedBox(height: 4),
                                        Container(
                                          height: 4 + 70 * forecast[i] / maxDue,
                                          decoration: BoxDecoration(
                                            color: i == 0 ? ApColors.clay : ApColors.gold,
                                            borderRadius: BorderRadius.circular(6),
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
                      ],
                    ),
                  ),
                  const ApSectionTitle('Par thème'),
                  for (final theme in content.themes)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 10),
                      child: Row(
                        children: [
                          Icon(apIcon(theme.icon), size: 20, color: Color(theme.argb)),
                          const SizedBox(width: 10),
                          SizedBox(
                            width: 130,
                            child: Text(theme.nameFr, style: ApText.small.copyWith(color: ApColors.inkSoft)),
                          ),
                          Expanded(
                            child: ApProgressBar(
                              value: theme.cardIds.isEmpty
                                  ? 0.0
                                  : progress.learnedIn(theme) / theme.cardIds.length,
                              color: Color(theme.argb),
                            ),
                          ),
                          const SizedBox(width: 10),
                          Text(
                            '${progress.learnedIn(theme)}/${theme.cardIds.length}',
                            style: ApText.small.copyWith(fontWeight: FontWeight.w700),
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

class _StatTile extends StatelessWidget {
  const _StatTile({
    required this.label,
    required this.value,
    required this.ratio,
    required this.color,
  });

  final String label;
  final String value;
  final double ratio;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return ApCardBox(
      padding: const EdgeInsets.all(14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: ApText.small),
          Text(value, style: ApText.display.copyWith(fontSize: 24)),
          ApProgressBar(value: ratio, color: color),
        ],
      ),
    );
  }
}
