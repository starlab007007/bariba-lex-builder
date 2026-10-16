import 'dart:async';

import 'package:flutter/material.dart';

import 'apprendre_audio.dart';
import 'apprendre_daily.dart';
import 'apprendre_explore.dart';
import 'apprendre_foundation.dart';
import 'apprendre_models.dart';
import 'apprendre_onboarding.dart';
import 'apprendre_review.dart';
import 'apprendre_scenes_ui.dart';
import 'apprendre_session.dart';
import 'apprendre_store.dart';
import 'apprendre_tasks.dart';
import 'apprendre_ui.dart';
import 'apprendre_voice_studio.dart';
import 'apprendre_voice_ui.dart';

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
  ApVoiceAccess _voiceAccess = ApVoiceAccess.none;
  int _downloadDone = 0;
  int _downloadTotal = 0;

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
      unawaited(_loadVoices());
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

  /// Voix de référence et rôles voix : jamais bloquant, silencieux hors-ligne.
  Future<void> _loadVoices() async {
    try {
      await ApAudioService.instance.ensureLoaded();
    } catch (_) {
      // Pas de voix : les écrans gardent la mention « en préparation ».
    }
    final access = await ApVoiceAccess.load();
    if (mounted) {
      setState(() => _voiceAccess = access);
    }
  }

  Future<void> _downloadVoicePack(ApAudioOfflinePack pack) async {
    final service = ApAudioService.instance;
    final total = service.countForPack(pack);
    if (total == 0) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Le pack ${pack.label.toLowerCase()} n’a pas encore de voix publiée.')),
      );
      return;
    }
    setState(() {
      _downloadDone = 0;
      _downloadTotal = total;
    });
    final ok = await service.downloadPack(
      pack,
      onProgress: (done, total) {
        if (mounted) {
          setState(() {
            _downloadDone = done;
            _downloadTotal = total;
          });
        }
      },
    );
    if (!mounted) {
      return;
    }
    setState(() => _downloadTotal = 0);
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('$ok voix du pack ${pack.label} disponibles hors connexion.')),
    );
  }

  Future<void> _chooseVoicePack() async {
    final service = ApAudioService.instance;
    final choice = await showModalBottomSheet<ApAudioOfflinePack>(
      context: context,
      showDragHandle: true,
      backgroundColor: ApColors.ivory,
      builder: (context) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 4, 20, 20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Voix hors connexion', style: ApText.display.copyWith(fontSize: 20)),
              const SizedBox(height: 4),
              const Text(
                'Choisis un petit paquet si la connexion ou l’espace du téléphone est limité.',
                style: ApText.small,
              ),
              const SizedBox(height: 12),
              for (final pack in ApAudioOfflinePack.values)
                ListTile(
                  contentPadding: EdgeInsets.zero,
                  leading: Icon(
                    pack == ApAudioOfflinePack.essential
                        ? Icons.offline_bolt_rounded
                        : pack == ApAudioOfflinePack.scenes
                        ? Icons.theater_comedy_rounded
                        : Icons.library_music_rounded,
                    color: ApColors.goldDeep,
                  ),
                  title: Text(pack.label, style: ApText.body.copyWith(fontWeight: FontWeight.w800)),
                  subtitle: Text(
                    '${pack.subtitle} · ${service.countForPack(pack)} voix · ~${service.megabytesForPack(pack).toStringAsFixed(0)} Mo',
                    style: ApText.small,
                  ),
                  trailing: const Icon(Icons.download_rounded, color: ApColors.goldDeep),
                  onTap: () => Navigator.of(context).pop(pack),
                ),
              const Divider(),
              ListTile(
                contentPadding: EdgeInsets.zero,
                leading: const Icon(Icons.delete_outline_rounded, color: ApColors.clayInk),
                title: const Text('Vider les voix téléchargées'),
                subtitle: const Text('Le contenu Apprendre reste disponible ; seules les copies audio locales sont supprimées.'),
                onTap: () async {
                  Navigator.of(context).pop();
                  await service.clearOfflineCache();
                  if (context.mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Cache des voix hors connexion vidé.')),
                    );
                  }
                },
              ),
            ],
          ),
        ),
      ),
    );
    if (choice != null && mounted) {
      await _downloadVoicePack(choice);
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

  Future<void> _startDaily() async {
    final content = _content!;
    final store = _store!;
    final tasks = ApSessionPlanner(content).dailySession(store.progress, now: DateTime.now());
    await openApSession(
      context,
      title: 'Séance du jour',
      tasks: tasks,
      store: store,
      sessionKey: 'seance_du_jour',
    );
    if (mounted) {
      setState(() {});
    }
  }

  Future<void> _openReview() =>
      _open(ApReviewScreen(content: _content!, store: _store!));

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
            action: next != null
                ? 'Commencer'
                : (due.isEmpty ? 'Séance du jour' : 'Réviser mes mots'),
            onTap: next != null
                ? () => _open(ApFoundationScreen(content: content, unit: next, store: store))
                : (due.isEmpty ? _startDaily : _startReview),
          ),
          const SizedBox(height: 12),
          _DailySessionCard(
            skills: ApSessionPlanner.skillsFor(progress.profile),
            onStart: _startDaily,
          ),
          ApSectionTitle(
            'Révision',
            trailing: TextButton(
              onPressed: _openReview,
              child: Text(
                due.isEmpty ? 'Ouvrir' : '${due.length} mots · tout voir',
                style: ApText.small.copyWith(
                  fontWeight: FontWeight.w700,
                  color: ApColors.goldDeep,
                ),
              ),
            ),
          ),
          if (due.isEmpty)
            ApCardBox(
              padding: const EdgeInsets.all(14),
              onTap: _openReview,
              child: Row(
                children: [
                  const Icon(Icons.psychology_alt_rounded, color: ApColors.goldDeep),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      progress.seenWords == 0
                          ? 'Tes premiers mots apparaîtront ici après ta première séance.'
                          : 'Aucun mot ne s’efface aujourd’hui. Bravo ! '
                                '${progress.activeWords} mots actifs sur ${progress.seenWords} vus.',
                      style: ApText.small.copyWith(color: ApColors.inkSoft),
                    ),
                  ),
                  const Icon(Icons.chevron_right_rounded, color: ApColors.muted),
                ],
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
          _ScenesEntryCard(
            onOpen: () => _open(ApScenesHubScreen(store: store)),
          ),
          if (content.proverbs.isNotEmpty) ...[
            const ApSectionTitle('Sagesse'),
            _ProverbCard(proverb: content.proverbs[now.day % content.proverbs.length]),
          ],
          ValueListenableBuilder<int>(
            valueListenable: ApAudioService.instance.revision,
            builder: (context, _, _) {
              final service = ApAudioService.instance;
              if (service.count == 0) {
                return const SizedBox.shrink();
              }
              return Padding(
                padding: const EdgeInsets.only(top: 22),
                child: ApCardBox(
                  padding: const EdgeInsets.all(14),
                  child: Row(
                    children: [
                      const Icon(Icons.record_voice_over_rounded, color: ApColors.goldDeep),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              '${service.count} textes avec voix de référence',
                              style: ApText.body.copyWith(fontWeight: FontWeight.w800),
                            ),
                            Text(
                              _downloadTotal > 0
                                  ? 'Téléchargement $_downloadDone / $_downloadTotal…'
                                  : 'Hors ligne par petits packs · Essentiel ~${service.megabytesForPack(ApAudioOfflinePack.essential).toStringAsFixed(0)} Mo',
                              style: ApText.small,
                            ),
                          ],
                        ),
                      ),
                      IconButton(
                        tooltip: 'Télécharger les voix',
                        onPressed: _downloadTotal > 0 ? null : _chooseVoicePack,
                        icon: const Icon(Icons.download_rounded, color: ApColors.goldDeep),
                      ),
                    ],
                  ),
                ),
              );
            },
          ),
          const ApSectionTitle('Mon parcours'),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              if (_voiceAccess.speaker)
                _LinkChip(
                  label: 'Studio Voix',
                  icon: Icons.mic_rounded,
                  onTap: () => _open(const ApVoiceStudioScreen()),
                ),
              if (_voiceAccess.reviewer)
                _LinkChip(
                  label: 'Validation voix',
                  icon: Icons.fact_check_rounded,
                  onTap: () => _open(const ApVoiceReviewScreen()),
                ),
              _LinkChip(
                label: 'Révision',
                icon: Icons.psychology_alt_rounded,
                onTap: _openReview,
              ),
              _LinkChip(
                label: 'Scènes de vie',
                icon: Icons.theater_comedy_rounded,
                onTap: () => _open(ApScenesHubScreen(store: store)),
              ),
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

class _Topic {
  const _Topic(this.icon, this.label);

  final IconData icon;
  final String label;
}

/// Porte d'entrée du module Scènes de vie.
class _ScenesEntryCard extends StatelessWidget {
  const _ScenesEntryCard({required this.onOpen});

  final VoidCallback onOpen;

  static const _topics = <_Topic>[
    _Topic(Icons.wb_twilight_rounded, 'Saluer'),
    _Topic(Icons.family_restroom_rounded, 'Famille'),
    _Topic(Icons.storefront_rounded, 'Marché'),
    _Topic(Icons.restaurant_rounded, 'Repas'),
    _Topic(Icons.agriculture_rounded, 'Champ'),
    _Topic(Icons.forest_rounded, 'Nature'),
    _Topic(Icons.local_hospital_rounded, 'Santé'),
    _Topic(Icons.directions_walk_rounded, 'Voyage'),
    _Topic(Icons.celebration_rounded, 'Fêtes'),
    _Topic(Icons.groups_rounded, 'Village'),
    _Topic(Icons.construction_rounded, 'Métiers'),
  ];

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(24),
        onTap: onOpen,
        child: Ink(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(24),
            gradient: const LinearGradient(
              colors: [ApColors.clay, ApColors.goldDeep],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('VIVRE LA LANGUE', style: ApText.label.copyWith(color: ApColors.goldTint)),
              const SizedBox(height: 4),
              Text(
                'Des dialogues complets, de la salutation au départ',
                style: ApText.display.copyWith(color: Colors.white, fontSize: 18),
              ),
              const SizedBox(height: 4),
              Text(
                'Jeu de rôle, culture, vocabulaire et test pour chaque situation.',
                style: ApText.small.copyWith(color: Colors.white),
              ),
              const SizedBox(height: 12),
              Wrap(
                spacing: 6,
                runSpacing: 6,
                children: [
                  for (final topic in _topics)
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 5),
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: .16),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(topic.icon, size: 14, color: Colors.white),
                          const SizedBox(width: 4),
                          Text(
                            topic.label,
                            style: ApText.small.copyWith(
                              fontSize: 11.5,
                              fontWeight: FontWeight.w700,
                              color: Colors.white,
                            ),
                          ),
                        ],
                      ),
                    ),
                ],
              ),
              const SizedBox(height: 14),
              ApPrimaryButton(
                label: 'Explorer les scènes',
                icon: Icons.theater_comedy_rounded,
                onPressed: onOpen,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Carte « Séance du jour » : les sept types d'exercices en une séance.
class _DailySessionCard extends StatelessWidget {
  const _DailySessionCard({required this.skills, required this.onStart});

  final List<String> skills;
  final VoidCallback onStart;

  @override
  Widget build(BuildContext context) {
    return ApCardBox(
      padding: const EdgeInsets.all(16),
      color: ApColors.goldGlow,
      borderColor: ApColors.gold,
      radius: 24,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('SÉANCE DU JOUR', style: ApText.label.copyWith(color: ApColors.goldDeep)),
                    const SizedBox(height: 4),
                    Text(
                      '${skills.length} types d’exercices · environ 8 min',
                      style: ApText.display.copyWith(fontSize: 18),
                    ),
                    const SizedBox(height: 2),
                    const Text(
                      'Nouveaux mots, révisions et correction immédiate.',
                      style: ApText.small,
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Wrap(
            spacing: 6,
            runSpacing: 6,
            children: [
              for (final skill in skills)
                Tooltip(
                  message: ApTask.skillLabel(skill),
                  child: Container(
                    width: 36,
                    height: 36,
                    decoration: BoxDecoration(
                      color: ApColors.goldTint,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Icon(
                      ApResultScreen.skillIcon(skill),
                      size: 18,
                      color: ApColors.goldDeep,
                    ),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 14),
          ApPrimaryButton(
            label: 'Lancer la séance',
            icon: Icons.play_arrow_rounded,
            onPressed: onStart,
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
