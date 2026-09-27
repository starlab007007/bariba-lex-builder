import 'package:flutter/material.dart';

import 'apprendre_scenes.dart';
import 'apprendre_session.dart';
import 'apprendre_store.dart';
import 'apprendre_ui.dart';

const _sceneIcons = <String, IconData>{
  'wb_twilight': Icons.wb_twilight_rounded,
  'home': Icons.home_rounded,
  'storefront': Icons.storefront_rounded,
  'agriculture': Icons.agriculture_rounded,
  'favorite': Icons.favorite_rounded,
  'directions_walk': Icons.directions_walk_rounded,
  'celebration': Icons.celebration_rounded,
  'groups': Icons.groups_rounded,
  'water_drop': Icons.water_drop_rounded,
  'restaurant': Icons.restaurant_rounded,
  'school': Icons.school_rounded,
  'forest': Icons.forest_rounded,
  'pets': Icons.pets_rounded,
  'handshake': Icons.handshake_rounded,
  'local_hospital': Icons.local_hospital_rounded,
  'child_care': Icons.child_care_rounded,
  'music_note': Icons.music_note_rounded,
  'construction': Icons.construction_rounded,
  'nights_stay': Icons.nights_stay_rounded,
  'payments': Icons.payments_rounded,
  'family_restroom': Icons.family_restroom_rounded,
  'forum': Icons.forum_rounded,
};

/// Icône d'une thématique ou d'une scène.
IconData scIcon(String name) => _sceneIcons[name] ?? Icons.theater_comedy_rounded;

/// Couleur d'accent d'une thématique (cycle sur la palette du module).
Color scColor(int index) {
  const palette = [
    ApColors.clay,
    ApColors.goldDeep,
    ApColors.sage,
    ApColors.night,
  ];
  return palette[index % palette.length];
}

/// Accueil du module Scènes de vie : thématiques, niveaux, progression.
class ApScenesHubScreen extends StatefulWidget {
  const ApScenesHubScreen({
    super.key,
    required this.store,
    this.contentLoader,
    this.progressLoader,
  });

  final ApprendreStore store;
  final Future<ScenesContent> Function()? contentLoader;
  final Future<ScenesProgress> Function()? progressLoader;

  @override
  State<ApScenesHubScreen> createState() => _ApScenesHubScreenState();
}

class _ApScenesHubScreenState extends State<ApScenesHubScreen> {
  ScenesContent? _content;
  ScenesProgress? _progress;
  String? _error;
  int _level = 0;
  String _state = 'all';

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final content = await (widget.contentLoader ?? ScenesContent.load)();
      final progress = await (widget.progressLoader ?? ScenesProgress.open)();
      if (mounted) {
        setState(() {
          _content = content;
          _progress = progress;
        });
      }
    } catch (error) {
      if (mounted) {
        setState(() => _error = 'Scènes indisponibles ($error).');
      }
    }
  }

  Future<void> _openScene(ScScene scene) async {
    await Navigator.of(context).push<void>(
      MaterialPageRoute<void>(
        builder: (_) => ApSceneDetailScreen(
          scene: scene,
          content: _content!,
          progress: _progress!,
          store: widget.store,
        ),
      ),
    );
    if (mounted) {
      setState(() {});
    }
  }

  ScScene? _nextScene() => _progress!.recommended(_content!);

  bool _showScene(ScScene scene, ScenesProgress progress) {
    if (_level != 0 && scene.level != _level) return false;
    switch (_state) {
      case 'new':
        return !progress.started(scene.id);
      case 'review':
        return progress.needsReview(scene.id);
      case 'done':
        return progress.done(scene.id);
      default:
        return true;
    }
  }

  @override
  Widget build(BuildContext context) {
    final content = _content;
    final progress = _progress;
    return Scaffold(
      backgroundColor: ApColors.ivory,
      body: SafeArea(
        child: Column(
          children: [
            ApTopBar(
              title: 'Scènes de vie',
              subtitle: content == null
                  ? 'Dialogues de la vie quotidienne'
                  : '${content.scenes.length} situations · ${content.categories.length} thématiques',
            ),
            Expanded(
              child: _error != null
                  ? Center(
                      child: Padding(
                        padding: const EdgeInsets.all(24),
                        child: Text(_error!, textAlign: TextAlign.center, style: ApText.body),
                      ),
                    )
                  : content == null || progress == null
                  ? const Center(child: CircularProgressIndicator(color: ApColors.gold))
                  : _body(content, progress),
            ),
          ],
        ),
      ),
    );
  }

  Widget _body(ScenesContent content, ScenesProgress progress) {
    final next = _nextScene();
    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 4, 20, 28),
      children: [
        Container(
          padding: const EdgeInsets.all(18),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(26),
            gradient: const LinearGradient(
              colors: [ApColors.clay, ApColors.goldDeep],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'VIVRE LA LANGUE',
                          style: ApText.label.copyWith(color: ApColors.goldTint),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          '${progress.doneCount} / ${content.scenes.length} scènes réussies',
                          style: ApText.display.copyWith(color: Colors.white, fontSize: 21),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          '${content.lineCount} répliques tirées du dictionnaire, page citée.',
                          style: ApText.small.copyWith(color: Colors.white),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 12),
                  _WhiteRing(
                    value: content.scenes.isEmpty ? 0.0 : progress.doneCount / content.scenes.length,
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  ApPill('${progress.startedCount} commencées', icon: Icons.play_circle_outline_rounded),
                  if (progress.reviewQueue(content).isNotEmpty)
                    ApPill(
                      '${progress.reviewQueue(content).length} à revoir',
                      icon: Icons.refresh_rounded,
                      background: ApColors.goldTint,
                    ),
                ],
              ),
              if (next != null) ...[
                const SizedBox(height: 14),
                ApPrimaryButton(
                  label: progress.needsReview(next.id)
                      ? 'À revoir : ${next.title}'
                      : (progress.started(next.id) ? 'Rejouer : ${next.title}' : 'Continuer : ${next.title}'),
                  icon: progress.needsReview(next.id)
                      ? Icons.refresh_rounded
                      : Icons.play_arrow_rounded,
                  onPressed: () => _openScene(next),
                ),
              ],
            ],
          ),
        ),
        const SizedBox(height: 16),
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: Row(
            children: [
              for (final item in const [
                ('all', 'Toutes'),
                ('new', 'Nouvelles'),
                ('review', 'À revoir'),
                ('done', 'Réussies'),
              ])
                Padding(
                  padding: const EdgeInsets.only(right: 8),
                  child: ChoiceChip(
                    label: Text(item.$2),
                    selected: _state == item.$1,
                    selectedColor: ApColors.goldTint,
                    backgroundColor: ApColors.surface,
                    side: BorderSide(color: _state == item.$1 ? ApColors.gold : ApColors.line),
                    labelStyle: ApText.small.copyWith(
                      fontWeight: FontWeight.w700,
                      color: ApColors.ink,
                    ),
                    onSelected: (_) => setState(() => _state = item.$1),
                  ),
                ),
            ],
          ),
        ),
        const SizedBox(height: 8),
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: Row(
            children: [
              for (final level in const [0, 1, 2, 3])
                Padding(
                  padding: const EdgeInsets.only(right: 8),
                  child: ChoiceChip(
                    label: Text(level == 0 ? 'Tous les niveaux' : 'Niveau $level'),
                    selected: _level == level,
                    selectedColor: ApColors.goldTint,
                    backgroundColor: ApColors.surface,
                    side: BorderSide(color: _level == level ? ApColors.gold : ApColors.line),
                    labelStyle: ApText.small.copyWith(
                      fontWeight: FontWeight.w700,
                      color: ApColors.ink,
                    ),
                    onSelected: (_) => setState(() => _level = level),
                  ),
                ),
            ],
          ),
        ),
        for (var i = 0; i < content.categories.length; i++)
          ..._category(content, progress, content.categories[i], scColor(i)),
        const SizedBox(height: 16),
        Text(
          'Les répliques bariba sont des phrases du dictionnaire bariba-français, recopiées à l’identique. '
          'Les liaisons en italique et les notes culturelles sont rédigées en français pour situer la scène. '
          'Les tons et la prononciation restent à confirmer avec des locuteurs référents.',
          style: ApText.small.copyWith(fontSize: 11),
        ),
      ],
    );
  }

  List<Widget> _category(
    ScenesContent content,
    ScenesProgress progress,
    ScCategory category,
    Color color,
  ) {
    final all = content.scenesOf(category.id);
    final shown = all.where((scene) => _showScene(scene, progress)).toList();
    if (shown.isEmpty) {
      return const [];
    }
    final done = all.where((scene) => progress.done(scene.id)).length;
    return [
      const SizedBox(height: 22),
      Row(
        children: [
          Container(
            width: 38,
            height: 38,
            decoration: BoxDecoration(color: color, borderRadius: BorderRadius.circular(12)),
            child: Icon(scIcon(category.icon), color: Colors.white, size: 20),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  category.title,
                  style: const TextStyle(
                    fontFamily: 'Inter',
                    fontSize: 17,
                    fontWeight: FontWeight.w800,
                    color: ApColors.ink,
                  ),
                ),
                Text(category.summary, style: ApText.small),
              ],
            ),
          ),
          Text('$done/${all.length}', style: ApText.small.copyWith(fontWeight: FontWeight.w700)),
        ],
      ),
      const SizedBox(height: 10),
      for (final scene in shown)
        Padding(
          padding: const EdgeInsets.only(bottom: 8),
          child: _SceneTile(
            scene: scene,
            color: color,
            best: progress.best[scene.id],
            played: progress.played.contains(scene.id),
            needsReview: progress.needsReview(scene.id),
            attempts: progress.attemptsFor(scene.id),
            onTap: () => _openScene(scene),
          ),
        ),
    ];
  }
}

class _WhiteRing extends StatelessWidget {
  const _WhiteRing({required this.value});

  final double value;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 62,
      height: 62,
      child: Stack(
        alignment: Alignment.center,
        children: [
          SizedBox(
            width: 62,
            height: 62,
            child: CircularProgressIndicator(
              value: value.clamp(0.0, 1.0),
              strokeWidth: 6,
              backgroundColor: Colors.white.withValues(alpha: .25),
              valueColor: const AlwaysStoppedAnimation<Color>(Colors.white),
              strokeCap: StrokeCap.round,
            ),
          ),
          Text(
            '${(value * 100).round()} %',
            style: const TextStyle(
              fontFamily: 'Inter',
              fontSize: 13,
              fontWeight: FontWeight.w800,
              color: Colors.white,
            ),
          ),
        ],
      ),
    );
  }
}

class _SceneTile extends StatelessWidget {
  const _SceneTile({
    required this.scene,
    required this.color,
    required this.best,
    required this.played,
    required this.needsReview,
    required this.attempts,
    required this.onTap,
  });

  final ScScene scene;
  final Color color;
  final int? best;
  final bool played;
  final bool needsReview;
  final int attempts;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final score = best;
    final Widget status;
    if (score != null && score >= ScenesProgress.passMark) {
      status = ApPill(
        '$score %',
        icon: Icons.check_rounded,
        background: ApColors.sageTint,
        foreground: ApColors.sageInk,
      );
    } else if (needsReview) {
      status = ApPill(
        score == null ? 'À revoir' : '$score % · revoir',
        icon: Icons.refresh_rounded,
        background: ApColors.goldTint,
      );
    } else if (score != null || played) {
      status = ApPill(score == null ? 'Écoutée' : '$score %', background: ApColors.goldTint);
    } else {
      status = const ApPill('Nouveau', background: ApColors.surfaceAlt, foreground: ApColors.quiet);
    }
    return ApCardBox(
      padding: const EdgeInsets.all(12),
      radius: 18,
      onTap: onTap,
      child: Row(
        children: [
          Container(
            width: 46,
            height: 46,
            decoration: BoxDecoration(
              color: color.withValues(alpha: .12),
              borderRadius: BorderRadius.circular(14),
            ),
            child: Icon(scIcon(scene.icon), color: color),
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
                    fontSize: 14.5,
                    fontWeight: FontWeight.w800,
                    color: ApColors.ink,
                  ),
                ),
                Text(scene.place, maxLines: 1, overflow: TextOverflow.ellipsis, style: ApText.small),
                const SizedBox(height: 6),
                Row(
                  children: [
                    for (var i = 1; i <= 3; i++)
                      Container(
                        width: 7,
                        height: 7,
                        margin: const EdgeInsets.only(right: 3),
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: i <= scene.level ? color : ApColors.line,
                        ),
                      ),
                    const SizedBox(width: 6),
                    Expanded(
                      child: Text(
                        attempts > 0
                            ? '${scene.spoken.length} répliques · $attempts essai${attempts > 1 ? 's' : ''}'
                            : '${scene.spoken.length} répliques',
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: ApText.small.copyWith(fontSize: 11),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          status,
        ],
      ),
    );
  }
}

enum _Stage { intro, dialogue }

/// Une scène de bout en bout : présentation, dialogue (écoute ou jeu de
/// rôle), culture, vocabulaire et test de compréhension.
class ApSceneDetailScreen extends StatefulWidget {
  const ApSceneDetailScreen({
    super.key,
    required this.scene,
    required this.content,
    required this.progress,
    required this.store,
  });

  final ScScene scene;
  final ScenesContent content;
  final ScenesProgress progress;
  final ApprendreStore store;

  @override
  State<ApSceneDetailScreen> createState() => _ApSceneDetailScreenState();
}

class _ApSceneDetailScreenState extends State<ApSceneDetailScreen> {
  final ScrollController _scroll = ScrollController();
  _Stage _stage = _Stage.intro;
  late String _learner = widget.scene.learner;
  bool _rolePlay = true;
  bool _showFrench = true;
  bool _hint = false;
  int _shown = 0;

  ScScene get _scene => widget.scene;
  bool get _finished => _shown >= _scene.lines.length;
  bool get _learnerTurn =>
      _rolePlay && !_finished && !_scene.lines[_shown].isNarration && _scene.lines[_shown].who == _learner;

  @override
  void dispose() {
    _scroll.dispose();
    super.dispose();
  }

  void _start() {
    setState(() {
      _stage = _Stage.dialogue;
      _shown = 0;
      _hint = false;
    });
    if (!_learnerTurn) {
      _advance();
    }
  }

  /// Affiche les lignes jusqu'à la prochaine réplique de l'apprenant.
  void _advance() {
    setState(() {
      _hint = false;
      if (_finished) {
        return;
      }
      _shown++;
      // Une narration s'affiche avec la réplique qui la suit, sauf si c'est
      // alors au tour de l'apprenant de parler.
      while (!_finished && _scene.lines[_shown - 1].isNarration && !_learnerTurn) {
        _shown++;
      }
    });
    if (_finished) {
      widget.progress.markPlayed(_scene.id);
      widget.progress.save();
    }
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scroll.hasClients) {
        _scroll.animateTo(
          _scroll.position.maxScrollExtent,
          duration: const Duration(milliseconds: 280),
          curve: Curves.easeOut,
        );
      }
    });
  }

  Future<void> _quiz() async {
    final tasks = buildSceneQuiz(_scene);
    final result = await Navigator.of(context).push<ApSessionResult>(
      MaterialPageRoute<ApSessionResult>(
        builder: (_) => ApSessionScreen(
          title: _scene.title,
          tasks: tasks,
          store: widget.store,
          sessionKey: 'scene:${_scene.id}',
        ),
      ),
    );
    if (result != null) {
      widget.progress.recordScore(_scene.id, result.percent);
      await widget.progress.save();
    }
    if (mounted) {
      setState(() {});
    }
  }

  void _swapRole() {
    setState(() => _learner = _scene.otherRole(_learner));
    _start();
  }

  void _nextScene() {
    final next = widget.content.after(_scene);
    if (next == null) {
      Navigator.of(context).maybePop();
      return;
    }
    Navigator.of(context).pushReplacement(
      MaterialPageRoute<void>(
        builder: (_) => ApSceneDetailScreen(
          scene: next,
          content: widget.content,
          progress: widget.progress,
          store: widget.store,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final category = widget.content.categoryById(_scene.category);
    return Scaffold(
      backgroundColor: ApColors.ivory,
      body: SafeArea(
        child: Column(
          children: [
            Container(
              width: double.infinity,
              padding: const EdgeInsets.only(bottom: 16),
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
                    title: category?.title ?? 'Scène de vie',
                    subtitle: _scene.place,
                    dark: true,
                    trailing: _stage == _Stage.dialogue
                        ? TextButton(
                            onPressed: () => setState(() => _showFrench = !_showFrench),
                            style: TextButton.styleFrom(foregroundColor: Colors.white),
                            child: Text(_showFrench ? 'Masquer FR' : 'Voir FR'),
                          )
                        : null,
                  ),
                  Padding(
                    padding: const EdgeInsets.fromLTRB(20, 2, 20, 0),
                    child: Text(
                      _scene.title,
                      style: ApText.display.copyWith(color: Colors.white, fontSize: 24),
                    ),
                  ),
                ],
              ),
            ),
            Expanded(child: _stage == _Stage.intro ? _introBody() : _dialogueBody()),
            if (_stage == _Stage.dialogue && !_finished) _bottomPanel(),
          ],
        ),
      ),
    );
  }

  Widget _introBody() {
    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
      children: [
        Row(
          children: [
            ApPill('Niveau ${_scene.level}', icon: Icons.signal_cellular_alt_rounded),
            const SizedBox(width: 8),
            ApPill(
              '${_scene.spoken.length} répliques',
              icon: Icons.forum_rounded,
              background: ApColors.surfaceAlt,
              foreground: ApColors.inkSoft,
            ),
          ],
        ),
        const SizedBox(height: 14),
        Text(_scene.intro, style: ApText.body.copyWith(fontSize: 15)),
        const ApSectionTitle('Les personnages'),
        for (final who in const ['a', 'b'])
          Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: ApCardBox(
              padding: const EdgeInsets.all(12),
              color: who == _learner ? ApColors.goldGlow : ApColors.surface,
              borderColor: who == _learner ? ApColors.gold : ApColors.line,
              onTap: () => setState(() => _learner = who),
              child: Row(
                children: [
                  _Avatar(name: _scene.roleName(who), mine: who == _learner),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      _scene.roleLabel(who),
                      style: ApText.body.copyWith(fontWeight: FontWeight.w700),
                    ),
                  ),
                  if (who == _learner) const ApPill('Ton rôle', icon: Icons.mic_rounded),
                ],
              ),
            ),
          ),
        Text(
          'Touche un personnage pour choisir ton rôle.',
          style: ApText.small.copyWith(fontSize: 11.5),
        ),
        const ApSectionTitle('Mots de la scène'),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            for (final word in _scene.vocab)
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                decoration: BoxDecoration(
                  color: ApColors.surface,
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: ApColors.line),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(word.ba, style: ApText.bariba.copyWith(fontSize: 15)),
                    Text(word.fr, style: ApText.small.copyWith(fontSize: 11.5)),
                  ],
                ),
              ),
          ],
        ),
        const ApSectionTitle('Comment jouer ?'),
        Row(
          children: [
            Expanded(
              child: _ModeCard(
                icon: Icons.mic_rounded,
                title: 'Jouer mon rôle',
                line: 'Je dis mes répliques à voix haute.',
                selected: _rolePlay,
                onTap: () => setState(() => _rolePlay = true),
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: _ModeCard(
                icon: Icons.hearing_rounded,
                title: 'Écouter',
                line: 'Je suis la scène réplique par réplique.',
                selected: !_rolePlay,
                onTap: () => setState(() => _rolePlay = false),
              ),
            ),
          ],
        ),
        const SizedBox(height: 18),
        ApPrimaryButton(
          label: 'Commencer la scène',
          icon: Icons.play_arrow_rounded,
          onPressed: _start,
        ),
      ],
    );
  }

  Widget _dialogueBody() {
    final visible = _scene.lines.take(_shown).toList();
    final best = widget.progress.best[_scene.id];
    return ListView(
      controller: _scroll,
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 20),
      children: [
        for (final line in visible)
          line.isNarration
              ? _Narration(text: line.fr)
              : _SceneBubble(
                  line: line,
                  name: _scene.roleName(line.who),
                  mine: line.who == _learner,
                  showFrench: _showFrench,
                ),
        if (_finished) ...[
          const SizedBox(height: 8),
          Container(
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
                    _scene.culture,
                    style: ApText.body.copyWith(color: ApColors.sageInk),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          ApPrimaryButton(
            label: best == null ? 'Tester ma compréhension' : 'Refaire le test (meilleur : $best %)',
            icon: Icons.quiz_rounded,
            onPressed: _quiz,
          ),
          const SizedBox(height: 10),
          ApSecondaryButton(
            label: 'Rejouer avec l’autre rôle',
            icon: Icons.swap_horiz_rounded,
            onPressed: _swapRole,
          ),
          const SizedBox(height: 10),
          ApSecondaryButton(
            label: widget.content.after(_scene) == null ? 'Terminer' : 'Scène suivante',
            icon: Icons.arrow_forward_rounded,
            onPressed: _nextScene,
          ),
        ],
      ],
    );
  }

  Widget _bottomPanel() {
    final line = _scene.lines[_shown];
    return Container(
      padding: const EdgeInsets.fromLTRB(20, 12, 20, 18),
      decoration: const BoxDecoration(
        color: ApColors.surface,
        border: Border(top: BorderSide(color: ApColors.line)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (_learnerTurn) ...[
            Text(
              'À toi, ${_scene.roleName(_learner)} : dis en bàátɔ̀nú',
              style: ApText.label.copyWith(color: ApColors.goldDeep),
            ),
            const SizedBox(height: 4),
            Text('« ${line.fr} »', style: ApText.body.copyWith(fontWeight: FontWeight.w700)),
            const SizedBox(height: 6),
            if (_hint)
              Text(line.ba, style: ApText.bariba.copyWith(fontSize: 18))
            else
              Align(
                alignment: Alignment.centerLeft,
                child: TextButton.icon(
                  onPressed: () => setState(() => _hint = true),
                  icon: const Icon(Icons.visibility_rounded, size: 18),
                  label: const Text('Voir la réplique'),
                ),
              ),
            const SizedBox(height: 8),
          ],
          ApPrimaryButton(
            label: _learnerTurn ? 'Je l’ai dit' : 'Suite',
            icon: _learnerTurn ? Icons.mic_rounded : Icons.arrow_downward_rounded,
            onPressed: _advance,
          ),
        ],
      ),
    );
  }
}

class _ModeCard extends StatelessWidget {
  const _ModeCard({
    required this.icon,
    required this.title,
    required this.line,
    required this.selected,
    required this.onTap,
  });

  final IconData icon;
  final String title;
  final String line;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return ApCardBox(
      padding: const EdgeInsets.all(12),
      color: selected ? ApColors.goldGlow : ApColors.surface,
      borderColor: selected ? ApColors.gold : ApColors.line,
      onTap: onTap,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: selected ? ApColors.goldDeep : ApColors.muted),
          const SizedBox(height: 6),
          Text(title, style: ApText.body.copyWith(fontWeight: FontWeight.w800)),
          Text(line, style: ApText.small.copyWith(fontSize: 11.5)),
        ],
      ),
    );
  }
}

class _Avatar extends StatelessWidget {
  const _Avatar({required this.name, required this.mine});

  final String name;
  final bool mine;

  @override
  Widget build(BuildContext context) {
    final initial = name.isEmpty ? '?' : name.substring(0, 1).toUpperCase();
    return Container(
      width: 40,
      height: 40,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: mine ? ApColors.gold : ApColors.night,
      ),
      child: Text(
        initial,
        style: TextStyle(
          fontFamily: 'Inter',
          fontSize: 16,
          fontWeight: FontWeight.w800,
          color: mine ? ApColors.goldInk : Colors.white,
        ),
      ),
    );
  }
}

class _Narration extends StatelessWidget {
  const _Narration({required this.text});

  final String text;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 8),
      child: Text(
        text,
        textAlign: TextAlign.center,
        style: ApText.small.copyWith(fontStyle: FontStyle.italic, color: ApColors.quiet),
      ),
    );
  }
}

class _SceneBubble extends StatelessWidget {
  const _SceneBubble({
    required this.line,
    required this.name,
    required this.mine,
    required this.showFrench,
  });

  final ScLine line;
  final String name;
  final bool mine;
  final bool showFrench;

  @override
  Widget build(BuildContext context) {
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
              name,
              style: ApText.small.copyWith(
                fontSize: 11,
                fontWeight: FontWeight.w800,
                color: mine ? ApColors.goldTint : ApColors.goldDeep,
              ),
            ),
            const SizedBox(height: 2),
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
                style: ApText.small.copyWith(color: mine ? ApColors.nightText : ApColors.quiet),
              ),
            ],
            const SizedBox(height: 4),
            Text(
              line.verified ? line.source : '${line.source} · à valider',
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
