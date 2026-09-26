import 'package:flutter/material.dart';

import 'apprendre_explore.dart';
import 'apprendre_foundation.dart';
import 'apprendre_models.dart';
import 'apprendre_onboarding.dart';
import 'apprendre_session.dart';
import 'apprendre_store.dart';
import 'apprendre_tasks.dart';
import 'apprendre_ui.dart';

/// Lien vers un écran existant du module (badges, historique, profil).
class ApLegacyLink {
  const ApLegacyLink({required this.label, required this.icon, required this.builder});

  final String label;
  final IconData icon;
  final WidgetBuilder builder;
}

/// Accueil du module Apprendre (Mɛɛribu) : chemin du jour, fondations,
/// vocabulaire, scènes et progression.
class ApprendreHubScreen extends StatefulWidget {
  const ApprendreHubScreen({
    super.key,
    this.links = const [],
    this.contentLoader,
    this.storeLoader,
  });

  final List<ApLegacyLink> links;

  /// Injectables pour les tests.
  final Future<ApprendreContent> Function()? contentLoader;
  final Future<ApprendreStore> Function()? storeLoader;

  @override
  State<ApprendreHubScreen> createState() => _ApprendreHubScreenState();
}

class _ApprendreHubScreenState extends State<ApprendreHubScreen> {
  ApprendreContent? _content;
  ApprendreStore? _store;
  String? _error;
  bool _onboardingShown = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final content = await (widget.contentLoader ?? ApprendreContent.load)();
      final store = await (widget.storeLoader ?? ApprendreStore.open)();
      if (!mounted) {
        return;
      }
      setState(() {
        _content = content;
        _store = store;
      });
      if (store.progress.profile == null && !_onboardingShown) {
        _onboardingShown = true;
        WidgetsBinding.instance.addPostFrameCallback((_) => _openOnboarding());
      }
    } catch (error) {
      if (mounted) {
        setState(() => _error = 'Contenu d’apprentissage indisponible ($error).');
      }
    }
  }

  Future<void> _openOnboarding() async {
    final content = _content;
    final store = _store;
    if (content == null || store == null) {
      return;
    }
    final choice = await Navigator.of(context).push<ApOnboardingChoice>(
      MaterialPageRoute<ApOnboardingChoice>(
        builder: (_) => ApOnboardingScreen(
          profiles: content.profiles,
          initialProfile: store.progress.profile,
          initialDirection: store.progress.direction,
        ),
      ),
    );
    store.progress.profile = choice?.profile ?? store.progress.profile ?? 'fr';
    if (choice != null) {
      store.progress.direction = choice.direction;
    }
    await store.save();
    if (mounted) {
      setState(() {});
    }
  }

  Future<void> _open(Widget screen) async {
    await Navigator.of(context).push<void>(
      MaterialPageRoute<void>(builder: (_) => screen),
    );
    if (mounted) {
      setState(() {});
    }
  }

  Future<void> _startReview() async {
    final content = _content!;
    final store = _store!;
    final tasks = ApTaskFactory(content).reviewSession(store.progress, now: DateTime.now());
    await Navigator.of(context).push<ApSessionResult>(
      MaterialPageRoute<ApSessionResult>(
        builder: (_) => ApSessionScreen(
          title: 'Révision',
          tasks: tasks,
          store: store,
          sessionKey: 'revision',
        ),
      ),
    );
    if (mounted) {
      setState(() {});
    }
  }

  ApFoundation? _nextFoundation() {
    final content = _content!;
    final progress = _store!.progress;
    for (final unit in content.foundations) {
      if (!progress.foundationDone(unit.id)) {
        return unit;
      }
    }
    return null;
  }

  String _greeting(DateTime now) {
    if (now.hour < 12) {
      return 'A kpuna n do ?';
    }
    return 'Mɛɛribu';
  }

  String _greetingSub(DateTime now) {
    if (now.hour < 12) {
      return '« As-tu bien dormi ? » — le salut du matin';
    }
    return 'Apprendre le bàátɔ̀nú et le français';
  }

  @override
  Widget build(BuildContext context) {
    final content = _content;
    final store = _store;
    Widget body;
    if (_error != null) {
      body = Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Text(_error!, textAlign: TextAlign.center, style: ApText.body),
        ),
      );
    } else if (content == null || store == null) {
      body = const Center(child: CircularProgressIndicator(color: ApColors.gold));
    } else {
      body = _hub(content, store);
    }
    final page = Material(
      color: ApColors.ivory,
      child: SafeArea(
        child: Column(
          children: [
            ApTopBar(
              title: 'Apprendre',
              subtitle: 'Mɛɛribu · bàátɔ̀nú ⇄ français',
              trailing: store == null
                  ? null
                  : ApRoundIconButton(
                      icon: Icons.tune_rounded,
                      tooltip: 'Profil et sens d’apprentissage',
                      onPressed: _openOnboarding,
                    ),
            ),
            Expanded(child: body),
          ],
        ),
      ),
    );
    if (Scaffold.maybeOf(context) == null) {
      return Scaffold(backgroundColor: ApColors.ivory, body: page);
    }
    return page;
  }

  Widget _hub(ApprendreContent content, ApprendreStore store) {
    final now = DateTime.now();
    final progress = store.progress;
    final due = progress.dueCardIds(now);
    final next = _nextFoundation();
    return RefreshIndicator(
      color: ApColors.gold,
      onRefresh: () async => setState(() {}),
      child: ListView(
        padding: const EdgeInsets.fromLTRB(20, 4, 20, 28),
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(_greeting(now), style: ApText.bariba.copyWith(fontSize: 26)),
                    const SizedBox(height: 2),
                    Text(_greetingSub(now), style: ApText.small.copyWith(color: ApColors.inkSoft)),
                  ],
                ),
              ),
              ApPill(
                '${progress.streak} j',
                icon: Icons.local_fire_department_rounded,
                background: ApColors.clayTint,
                foreground: ApColors.clayInk,
              ),
            ],
          ),
          const SizedBox(height: 16),
          _GuideHero(
            title: next == null ? 'Toutes les fondations sont validées' : next.titleFr,
            subtitle: next == null
                ? 'Continue avec le vocabulaire et les scènes'
                : 'Fondation ${next.order} · ${next.minutes} min',
            action: next == null ? 'Réviser mes mots' : 'Commencer',
            onTap: next == null
                ? (due.isEmpty ? null : _startReview)
                : () => _open(ApFoundationScreen(content: content, unit: next, store: store)),
          ),
          ApSectionTitle(
            'À revoir avant d’oublier',
            trailing: due.isEmpty
                ? null
                : Text('${due.length} mots', style: ApText.small.copyWith(fontWeight: FontWeight.w700)),
          ),
          if (due.isEmpty)
            ApCardBox(
              padding: const EdgeInsets.all(14),
              child: Text(
                progress.seenWords == 0
                    ? 'Tes premiers mots apparaîtront ici après ta première séance.'
                    : 'Aucun mot ne s’efface aujourd’hui. Bravo !',
                style: ApText.small.copyWith(color: ApColors.inkSoft),
              ),
            )
          else ...[
            for (final id in due.take(3))
              if (content.cards[id] != null)
                Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: _DueTile(
                    card: content.cards[id]!,
                    retention: progress.srs[id]?.retention(now) ?? 0.0,
                    onTap: () => showApWordSheet(context, card: content.cards[id]!, store: store),
                  ),
                ),
            const SizedBox(height: 4),
            ApSecondaryButton(
              label: 'Réviser maintenant',
              icon: Icons.bolt_rounded,
              onPressed: _startReview,
            ),
          ],
          ApSectionTitle(
            'Fondations',
            trailing: Text(
              '${progress.foundationsDone}/${content.foundations.length}',
              style: ApText.small.copyWith(fontWeight: FontWeight.w700),
            ),
          ),
          SizedBox(
            height: 150,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              itemCount: content.foundations.length,
              separatorBuilder: (_, _) => const SizedBox(width: 10),
              itemBuilder: (context, index) {
                final unit = content.foundations[index];
                return _FoundationTile(
                  unit: unit,
                  done: progress.foundationDone(unit.id),
                  current: next?.id == unit.id,
                  onTap: () => _open(ApFoundationScreen(content: content, unit: unit, store: store)),
                );
              },
            ),
          ),
          const ApSectionTitle('Vocabulaire'),
          GridView.builder(
            itemCount: content.themes.length,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            gridDelegate: const SliverGridDelegateWithMaxCrossAxisExtent(
              maxCrossAxisExtent: 220,
              mainAxisExtent: 118,
              crossAxisSpacing: 10,
              mainAxisSpacing: 10,
            ),
            itemBuilder: (context, index) {
              final theme = content.themes[index];
              return _ThemeTile(
                theme: theme,
                learned: progress.learnedIn(theme),
                onTap: () => _open(ApThemeScreen(content: content, theme: theme, store: store)),
              );
            },
          ),
          const ApSectionTitle('Scènes de vie'),
          for (final scene in content.scenes)
            Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: ApCardBox(
                padding: const EdgeInsets.all(14),
                radius: 18,
                onTap: () => _open(ApSceneScreen(scene: scene)),
                child: Row(
                  children: [
                    Container(
                      width: 46,
                      height: 46,
                      decoration: BoxDecoration(
                        color: ApColors.clayTint,
                        borderRadius: BorderRadius.circular(14),
                      ),
                      child: Icon(apIcon(scene.icon), color: ApColors.clay),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            scene.title,
                            style: const TextStyle(
                              fontFamily: 'Inter',
                              fontSize: 15,
                              fontWeight: FontWeight.w800,
                              color: ApColors.ink,
                            ),
                          ),
                          Text(scene.place, style: ApText.small),
                        ],
                      ),
                    ),
                    const Icon(Icons.chevron_right_rounded, color: ApColors.muted),
                  ],
                ),
              ),
            ),
          if (content.proverbs.isNotEmpty) ...[
            const ApSectionTitle('Sagesse'),
            _ProverbCard(proverb: content.proverbs[now.day % content.proverbs.length]),
          ],
          const ApSectionTitle('Mon parcours'),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              _LinkChip(
                label: 'Ma progression',
                icon: Icons.insights_rounded,
                onTap: () => _open(ApProgressScreen(content: content, store: store)),
              ),
              for (final link in widget.links)
                _LinkChip(
                  label: link.label,
                  icon: link.icon,
                  onTap: () => _open(Builder(builder: link.builder)),
                ),
            ],
          ),
          const SizedBox(height: 18),
          Text(
            'Formes bariba issues du dictionnaire bariba-français (page citée sur chaque mot). '
            'Les tons et prononciations restent à confirmer par des locuteurs référents.',
            style: ApText.small.copyWith(fontSize: 11),
          ),
        ],
      ),
    );
  }
}

class _GuideHero extends StatelessWidget {
  const _GuideHero({
    required this.title,
    required this.subtitle,
    required this.action,
    required this.onTap,
  });

  final String title;
  final String subtitle;
  final String action;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(28),
        gradient: const RadialGradient(
          center: Alignment(0.9, -0.9),
          radius: 1.1,
          colors: [Color(0xFF4A3B2A), ApColors.night],
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const ApGuideAvatar(size: 68),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'TON GUIDE TE PROPOSE',
                      style: ApText.label.copyWith(color: ApColors.goldTint),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      title,
                      style: ApText.display.copyWith(color: Colors.white, fontSize: 20),
                    ),
                    const SizedBox(height: 2),
                    Text(subtitle, style: ApText.small.copyWith(color: ApColors.nightText)),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          ApPrimaryButton(label: action, icon: Icons.play_arrow_rounded, onPressed: onTap),
        ],
      ),
    );
  }
}

class _DueTile extends StatelessWidget {
  const _DueTile({required this.card, required this.retention, required this.onTap});

  final ApCard card;
  final double retention;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final pct = (retention * 100).round();
    final urgent = pct < 50;
    return ApCardBox(
      padding: const EdgeInsets.fromLTRB(16, 12, 14, 12),
      radius: 18,
      onTap: onTap,
      child: Row(
        children: [
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
          ApPill(
            'mémoire $pct %',
            background: urgent ? ApColors.clayTint : ApColors.goldTint,
            foreground: urgent ? ApColors.clayInk : ApColors.goldDeep,
          ),
        ],
      ),
    );
  }
}

class _FoundationTile extends StatelessWidget {
  const _FoundationTile({
    required this.unit,
    required this.done,
    required this.current,
    required this.onTap,
  });

  final ApFoundation unit;
  final bool done;
  final bool current;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 150,
      child: ApCardBox(
        padding: const EdgeInsets.all(14),
        radius: 20,
        color: current ? ApColors.goldGlow : ApColors.surface,
        borderColor: current ? ApColors.gold : ApColors.line,
        onTap: onTap,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  width: 36,
                  height: 36,
                  decoration: BoxDecoration(
                    color: done ? ApColors.sageTint : ApColors.goldTint,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Icon(
                    done ? Icons.check_rounded : apIcon(unit.icon),
                    size: 20,
                    color: done ? ApColors.sageInk : ApColors.goldDeep,
                  ),
                ),
                const Spacer(),
                Text('${unit.order}', style: ApText.display.copyWith(fontSize: 20, color: ApColors.lineStrong)),
              ],
            ),
            const Spacer(),
            Text(
              unit.titleFr,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(
                fontFamily: 'Inter',
                fontSize: 14,
                fontWeight: FontWeight.w800,
                color: ApColors.ink,
                height: 1.2,
              ),
            ),
            const SizedBox(height: 4),
            Text('${unit.minutes} min', style: ApText.small.copyWith(fontSize: 11)),
          ],
        ),
      ),
    );
  }
}

class _ThemeTile extends StatelessWidget {
  const _ThemeTile({required this.theme, required this.learned, required this.onTap});

  final ApTheme theme;
  final int learned;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final color = Color(theme.argb);
    final total = theme.cardIds.length;
    return ApCardBox(
      padding: const EdgeInsets.all(14),
      radius: 20,
      onTap: onTap,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(apIcon(theme.icon), color: color),
          const Spacer(),
          Text(
            theme.nameFr,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(
              fontFamily: 'Inter',
              fontSize: 13.5,
              fontWeight: FontWeight.w800,
              color: ApColors.ink,
              height: 1.2,
            ),
          ),
          const SizedBox(height: 6),
          ApProgressBar(value: total == 0 ? 0.0 : learned / total, color: color, height: 5),
          const SizedBox(height: 4),
          Text('$learned / $total mots', style: ApText.small.copyWith(fontSize: 10.5)),
        ],
      ),
    );
  }
}

class _ProverbCard extends StatelessWidget {
  const _ProverbCard({required this.proverb});

  final ApProverb proverb;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: ApColors.night,
        borderRadius: BorderRadius.circular(24),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('SAGESSE DU JOUR', style: ApText.label.copyWith(color: ApColors.goldTint)),
          const SizedBox(height: 8),
          Text(
            proverb.ba,
            style: ApText.bariba.copyWith(color: Colors.white, fontSize: 18, height: 1.35),
          ),
          const SizedBox(height: 6),
          Text(proverb.fr, style: ApText.body.copyWith(color: ApColors.nightText)),
          const SizedBox(height: 6),
          Text(
            'Dictionnaire, ${proverb.src}',
            style: ApText.small.copyWith(color: const Color(0xFFB7AF98), fontSize: 11),
          ),
        ],
      ),
    );
  }
}

class _LinkChip extends StatelessWidget {
  const _LinkChip({required this.label, required this.icon, required this.onTap});

  final String label;
  final IconData icon;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return ActionChip(
      avatar: Icon(icon, size: 18, color: ApColors.goldDeep),
      label: Text(label),
      labelStyle: const TextStyle(
        fontFamily: 'Inter',
        fontWeight: FontWeight.w700,
        color: ApColors.ink,
      ),
      backgroundColor: ApColors.surface,
      side: const BorderSide(color: ApColors.line),
      shape: const StadiumBorder(),
      onPressed: onTap,
    );
  }
}
