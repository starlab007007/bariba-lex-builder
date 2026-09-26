import 'package:audioplayers/audioplayers.dart' as audio;
import 'package:flutter/material.dart';
import 'package:flutter_tts/flutter_tts.dart';

import '../core/fitila_backend.dart';
import '../core/fitila_media.dart';
import 'apprendre_store.dart';
import 'apprendre_tasks.dart';
import 'apprendre_ui.dart';

/// Résultat d'une séance, renvoyé à l'écran appelant.
class ApSessionResult {
  const ApSessionResult({required this.correct, required this.total});

  final int correct;
  final int total;

  int get percent => total == 0 ? 0 : (correct * 100 / total).round();
}

/// Séance d'exercices : choix, remise en ordre, prononciation.
class ApSessionScreen extends StatefulWidget {
  const ApSessionScreen({
    super.key,
    required this.title,
    required this.tasks,
    required this.store,
    required this.sessionKey,
    this.foundationId,
  });

  final String title;
  final List<ApTask> tasks;
  final ApprendreStore store;

  /// Clé de thème envoyée au serveur (ex. `famille`, `fondation:tons`).
  final String sessionKey;
  final String? foundationId;

  @override
  State<ApSessionScreen> createState() => _ApSessionScreenState();
}

class _ApSessionScreenState extends State<ApSessionScreen> {
  int _index = 0;
  int _correct = 0;
  String? _selected;
  bool _answered = false;
  bool _wasCorrect = false;
  final List<String> _orderPicked = <String>[];
  final List<ApTask> _missed = <ApTask>[];
  final FlutterTts _tts = FlutterTts();
  final FitilaMediaController _media = FitilaMediaController();
  final audio.AudioPlayer _player = audio.AudioPlayer();
  bool _recording = false;
  FitilaMediaAsset? _recorded;
  bool _finishing = false;

  ApTask get _task => widget.tasks[_index];
  bool get _oral => widget.store.progress.profile == 'oral';
  bool get _showTranscription {
    final profile = widget.store.progress.profile;
    return profile == 'fr' || profile == 'both';
  }

  @override
  void initState() {
    super.initState();
    if (_oral) {
      WidgetsBinding.instance.addPostFrameCallback((_) => _readInstruction());
    }
  }

  @override
  void dispose() {
    _stopSpeaking();
    _player.dispose();
    _media.dispose();
    super.dispose();
  }

  Future<void> _stopSpeaking() async {
    try {
      await _tts.stop();
    } catch (_) {
      // Synthèse vocale indisponible : rien à arrêter.
    }
  }

  /// Lit la consigne en français (profil non-lecteur ou à la demande).
  Future<void> _readInstruction() async {
    final task = _task;
    final text = task.promptIsBariba
        ? task.instruction
        : '${task.instruction} ${task.prompt}';
    try {
      await _tts.setLanguage('fr-FR');
      await _tts.setSpeechRate(.45);
      await _tts.speak(text);
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Lecture vocale indisponible sur cet appareil.')),
        );
      }
    }
  }

  void _choose(String option) {
    if (_answered) {
      return;
    }
    final ok = _task.isCorrectChoice(option);
    setState(() {
      _selected = option;
      _answer(ok);
    });
  }

  void _pickWord(int optionIndex) {
    if (_answered) {
      return;
    }
    setState(() => _orderPicked.add(_task.options[optionIndex]));
  }

  void _unpickWord(int pickedIndex) {
    if (_answered) {
      return;
    }
    setState(() => _orderPicked.removeAt(pickedIndex));
  }

  void _checkOrder() {
    setState(() => _answer(_task.isCorrectOrder(_orderPicked)));
  }

  void _selfAssess(bool ok) {
    setState(() => _answer(ok));
  }

  /// Enregistre la réponse (appelé dans setState).
  void _answer(bool ok) {
    _answered = true;
    _wasCorrect = ok;
    if (ok) {
      _correct++;
    } else {
      _missed.add(_task);
    }
    widget.store.progress.recordAnswer(
      _task.cardId,
      correct: ok,
      now: DateTime.now(),
    );
  }

  Future<void> _toggleRecording() async {
    if (_recording) {
      final asset = await _media.stopAudio();
      if (!mounted) {
        return;
      }
      setState(() {
        _recording = false;
        _recorded = asset;
      });
      return;
    }
    try {
      await _media.startAudio();
      if (!mounted) {
        return;
      }
      setState(() => _recording = true);
    } catch (_) {
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Microphone indisponible.')),
      );
    }
  }

  Future<void> _playRecording() async {
    final asset = _recorded;
    if (asset == null) {
      return;
    }
    await _player.play(audio.DeviceFileSource(asset.path));
  }

  Future<void> _next() async {
    if (_index + 1 < widget.tasks.length) {
      setState(() {
        _index++;
        _selected = null;
        _answered = false;
        _wasCorrect = false;
        _orderPicked.clear();
        _recorded = null;
      });
      if (_oral) {
        await _readInstruction();
      }
      return;
    }
    await _finish();
  }

  Future<void> _finish() async {
    setState(() => _finishing = true);
    final now = DateTime.now();
    final result = ApSessionResult(correct: _correct, total: widget.tasks.length);
    final foundationId = widget.foundationId;
    if (foundationId != null) {
      widget.store.progress.recordFoundation(foundationId, result.percent, now);
    }
    await widget.store.save();
    try {
      await FitilaBackend.recordLearningSession(
        sessionType: 'exercise',
        themeKey: widget.sessionKey,
        direction: widget.store.progress.direction == 'fr_to_ba'
            ? 'fr_to_bariba'
            : 'bariba_to_fr',
        correctCount: result.correct,
        totalCount: result.total,
      );
    } catch (_) {
      // Hors-ligne ou non connecté : la progression reste enregistrée localement.
    }
    if (!mounted) {
      return;
    }
    await Navigator.of(context).pushReplacement(
      MaterialPageRoute<ApSessionResult>(
        builder: (_) => ApResultScreen(
          title: widget.title,
          result: result,
          missed: List<ApTask>.unmodifiable(_missed),
          foundationPassed: foundationId == null
              ? null
              : result.percent >= ApprendreProgress.passMark,
        ),
      ),
      result: result,
    );
  }

  @override
  Widget build(BuildContext context) {
    if (widget.tasks.isEmpty) {
      return Scaffold(
        backgroundColor: ApColors.ivory,
        body: SafeArea(
          child: Column(
            children: [
              ApTopBar(title: widget.title),
              const Expanded(
                child: Center(
                  child: Padding(
                    padding: EdgeInsets.all(24),
                    child: Text(
                      'Rien à réviser pour l’instant. Reviens plus tard ou apprends de nouveaux mots.',
                      textAlign: TextAlign.center,
                      style: ApText.body,
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      );
    }
    final task = _task;
    return Scaffold(
      backgroundColor: ApColors.ivory,
      body: SafeArea(
        child: _finishing
            ? const Center(child: CircularProgressIndicator(color: ApColors.gold))
            : Column(
                children: [
                  Padding(
                    padding: const EdgeInsets.fromLTRB(16, 10, 16, 4),
                    child: Row(
                      children: [
                        ApRoundIconButton(
                          icon: Icons.close_rounded,
                          tooltip: 'Quitter la séance',
                          onPressed: () => Navigator.of(context).maybePop(),
                        ),
                        const SizedBox(width: 14),
                        Expanded(
                          child: ApProgressBar(
                            value: (_index + (_answered ? 1 : 0)) / widget.tasks.length,
                            height: 8,
                          ),
                        ),
                        const SizedBox(width: 14),
                        Text(
                          '${_index + 1}/${widget.tasks.length}',
                          style: ApText.small.copyWith(fontWeight: FontWeight.w700),
                        ),
                      ],
                    ),
                  ),
                  Expanded(
                    child: ListView(
                      padding: const EdgeInsets.fromLTRB(20, 18, 20, 20),
                      children: [
                        Row(
                          children: [
                            Expanded(
                              child: Text(
                                task.instruction.toUpperCase(),
                                style: ApText.label,
                              ),
                            ),
                            ApRoundIconButton(
                              icon: Icons.volume_up_rounded,
                              tooltip: 'Lire la consigne',
                              size: 40,
                              onPressed: _readInstruction,
                            ),
                          ],
                        ),
                        const SizedBox(height: 10),
                        _PromptCard(
                          task: task,
                          showTranscription: _showTranscription,
                          large: _oral,
                        ),
                        const SizedBox(height: 18),
                        if (task.kind == ApTaskKind.choice)
                          for (final option in task.options)
                            Padding(
                              padding: const EdgeInsets.only(bottom: 10),
                              child: _OptionTile(
                                label: option,
                                bariba: task.optionsAreBariba,
                                large: _oral,
                                state: !_answered
                                    ? _OptionState.idle
                                    : task.isCorrectChoice(option)
                                    ? _OptionState.correct
                                    : option == _selected
                                    ? _OptionState.wrong
                                    : _OptionState.dimmed,
                                onTap: () => _choose(option),
                              ),
                            ),
                        if (task.kind == ApTaskKind.order) _orderBody(task),
                        if (task.kind == ApTaskKind.speak) _speakBody(),
                      ],
                    ),
                  ),
                  _FeedbackPanel(
                    visible: _answered,
                    correct: _wasCorrect,
                    task: task,
                    last: _index + 1 == widget.tasks.length,
                    onContinue: _next,
                  ),
                ],
              ),
      ),
    );
  }

  Widget _orderBody(ApTask task) {
    final remaining = <int>[];
    final used = List<bool>.filled(task.options.length, false);
    for (final word in _orderPicked) {
      for (var i = 0; i < task.options.length; i++) {
        if (!used[i] && task.options[i] == word) {
          used[i] = true;
          break;
        }
      }
    }
    for (var i = 0; i < task.options.length; i++) {
      if (!used[i]) {
        remaining.add(i);
      }
    }
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Container(
          constraints: const BoxConstraints(minHeight: 70),
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: ApColors.surface,
            borderRadius: BorderRadius.circular(18),
            border: Border.all(
              color: _answered
                  ? (_wasCorrect ? ApColors.sage : ApColors.clay)
                  : ApColors.lineStrong,
              width: _answered ? 2 : 1,
            ),
          ),
          child: Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              for (var i = 0; i < _orderPicked.length; i++)
                _WordChip(
                  word: _orderPicked[i],
                  filled: true,
                  onTap: () => _unpickWord(i),
                ),
              if (_orderPicked.isEmpty)
                const Padding(
                  padding: EdgeInsets.all(8),
                  child: Text('Touche les mots dans le bon ordre', style: ApText.small),
                ),
            ],
          ),
        ),
        const SizedBox(height: 16),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          alignment: WrapAlignment.center,
          children: [
            for (final i in remaining)
              _WordChip(
                word: task.options[i],
                filled: false,
                onTap: () => _pickWord(i),
              ),
          ],
        ),
        const SizedBox(height: 18),
        if (!_answered)
          ApPrimaryButton(
            label: 'Vérifier',
            onPressed: _orderPicked.length == task.orderAnswer.length
                ? _checkOrder
                : null,
          ),
      ],
    );
  }

  Widget _speakBody() {
    return Column(
      children: [
        const SizedBox(height: 6),
        Semantics(
          button: true,
          label: _recording ? 'Arrêter l’enregistrement' : 'Enregistrer ma voix',
          child: GestureDetector(
            onTap: _toggleRecording,
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 250),
              width: 96,
              height: 96,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: _recording ? ApColors.clay : ApColors.gold,
                boxShadow: [
                  BoxShadow(
                    color: (_recording ? ApColors.clay : ApColors.gold)
                        .withValues(alpha: .25),
                    blurRadius: 0,
                    spreadRadius: _recording ? 16 : 10,
                  ),
                ],
              ),
              child: Icon(
                _recording ? Icons.stop_rounded : Icons.mic_rounded,
                color: _recording ? Colors.white : ApColors.goldInk,
                size: 40,
              ),
            ),
          ),
        ),
        const SizedBox(height: 14),
        Text(
          _recording
              ? 'Je t’écoute…'
              : _recorded == null
              ? 'Appuie, dis le mot, puis appuie encore'
              : 'Réécoute-toi et compare',
          style: ApText.small,
        ),
        if (_recorded != null && !_recording) ...[
          const SizedBox(height: 12),
          ApSecondaryButton(
            label: 'Réécouter ma voix',
            icon: Icons.play_arrow_rounded,
            onPressed: _playRecording,
          ),
          if (!_answered) ...[
            const SizedBox(height: 18),
            const Text('Comment l’as-tu dit ?', style: ApText.body),
            const SizedBox(height: 10),
            Row(
              children: [
                Expanded(
                  child: ApSecondaryButton(
                    label: 'À reprendre',
                    onPressed: () => _selfAssess(false),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: ApPrimaryButton(
                    label: 'Bien dit',
                    onPressed: () => _selfAssess(true),
                  ),
                ),
              ],
            ),
          ],
        ],
        const SizedBox(height: 14),
        const ApPill(
          'Voix de référence des locuteurs : en préparation',
          icon: Icons.graphic_eq_rounded,
          background: ApColors.surfaceAlt,
          foreground: ApColors.quiet,
        ),
      ],
    );
  }
}

class _PromptCard extends StatelessWidget {
  const _PromptCard({
    required this.task,
    required this.showTranscription,
    required this.large,
  });

  final ApTask task;
  final bool showTranscription;
  final bool large;

  @override
  Widget build(BuildContext context) {
    final sub = task.promptSub;
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: ApColors.surface,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: ApColors.line),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (task.promptIsBariba)
            ApBaribaText(
              task.prompt,
              size: large ? 30 : 26,
              transcription: showTranscription ? task.transcription : null,
            )
          else
            Text(
              task.prompt,
              style: ApText.display.copyWith(fontSize: large ? 26 : 22),
            ),
          if (sub != null && sub.isNotEmpty) ...[
            const SizedBox(height: 8),
            Text(sub, style: ApText.body.copyWith(color: ApColors.quiet)),
          ],
          if (!task.verified) ...[
            const SizedBox(height: 10),
            const ApPill(
              'Forme en cours de validation',
              icon: Icons.help_outline_rounded,
              background: ApColors.clayTint,
              foreground: ApColors.clayInk,
            ),
          ],
        ],
      ),
    );
  }
}

enum _OptionState { idle, correct, wrong, dimmed }

class _OptionTile extends StatelessWidget {
  const _OptionTile({
    required this.label,
    required this.bariba,
    required this.large,
    required this.state,
    required this.onTap,
  });

  final String label;
  final bool bariba;
  final bool large;
  final _OptionState state;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final (Color bg, Color border, Color fg, IconData? icon) = switch (state) {
      _OptionState.idle => (ApColors.surface, ApColors.line, ApColors.ink, null),
      _OptionState.correct => (
        ApColors.sageTint,
        ApColors.sage,
        ApColors.sageInk,
        Icons.check_circle_rounded,
      ),
      _OptionState.wrong => (
        ApColors.clayTint,
        ApColors.clay,
        ApColors.clayInk,
        Icons.cancel_rounded,
      ),
      _OptionState.dimmed => (
        ApColors.surface,
        ApColors.line,
        ApColors.muted,
        null,
      ),
    };
    return Material(
      color: bg,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(18),
        side: BorderSide(
          color: border,
          width: state == _OptionState.idle || state == _OptionState.dimmed ? 1 : 2,
        ),
      ),
      child: InkWell(
        borderRadius: BorderRadius.circular(18),
        onTap: onTap,
        child: ConstrainedBox(
          constraints: BoxConstraints(minHeight: large ? 66 : 58),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            child: Row(
              children: [
                Expanded(
                  child: Text(
                    label,
                    style: (bariba ? ApText.bariba : ApText.body).copyWith(
                      fontSize: large ? 19 : (bariba ? 17 : 15),
                      fontWeight: bariba ? FontWeight.w700 : FontWeight.w600,
                      color: fg,
                    ),
                  ),
                ),
                if (icon != null) Icon(icon, color: border, size: 22),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _WordChip extends StatelessWidget {
  const _WordChip({required this.word, required this.filled, required this.onTap});

  final String word;
  final bool filled;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: filled ? ApColors.goldTint : ApColors.surface,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(14),
        side: BorderSide(color: filled ? ApColors.gold : ApColors.lineStrong),
      ),
      child: InkWell(
        borderRadius: BorderRadius.circular(14),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 11),
          child: Text(word, style: ApText.bariba.copyWith(fontSize: 16)),
        ),
      ),
    );
  }
}

class _FeedbackPanel extends StatelessWidget {
  const _FeedbackPanel({
    required this.visible,
    required this.correct,
    required this.task,
    required this.last,
    required this.onContinue,
  });

  final bool visible;
  final bool correct;
  final ApTask task;
  final bool last;
  final VoidCallback onContinue;

  @override
  Widget build(BuildContext context) {
    if (!visible) {
      return const SizedBox.shrink();
    }
    final color = correct ? ApColors.sageTint : ApColors.clayTint;
    final ink = correct ? ApColors.sageInk : ApColors.clayInk;
    final showAnswer = !correct && task.kind != ApTaskKind.speak;
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.fromLTRB(20, 16, 20, 20),
      decoration: BoxDecoration(
        color: color,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(26)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            children: [
              Icon(
                correct ? Icons.check_circle_rounded : Icons.lightbulb_rounded,
                color: ink,
              ),
              const SizedBox(width: 8),
              Text(
                correct ? 'Bien vu !' : 'Presque.',
                style: TextStyle(
                  fontFamily: 'Inter',
                  fontSize: 18,
                  fontWeight: FontWeight.w800,
                  color: ink,
                ),
              ),
            ],
          ),
          if (showAnswer) ...[
            const SizedBox(height: 8),
            Text('Bonne réponse', style: ApText.label.copyWith(color: ink)),
            const SizedBox(height: 2),
            Text(
              task.answer,
              style: (task.optionsAreBariba ? ApText.bariba : ApText.body).copyWith(
                fontSize: 17,
                fontWeight: FontWeight.w700,
                color: ApColors.ink,
              ),
            ),
          ],
          if (task.explain.isNotEmpty) ...[
            const SizedBox(height: 8),
            Text(task.explain, style: ApText.body.copyWith(fontSize: 13.5)),
          ],
          const SizedBox(height: 8),
          ApSourceTag(task.source, verified: task.verified),
          const SizedBox(height: 14),
          ApPrimaryButton(
            label: last ? 'Voir mon résultat' : 'Continuer',
            dark: !correct,
            onPressed: onContinue,
          ),
        ],
      ),
    );
  }
}

/// Écran de fin de séance.
class ApResultScreen extends StatelessWidget {
  const ApResultScreen({
    super.key,
    required this.title,
    required this.result,
    required this.missed,
    this.foundationPassed,
  });

  final String title;
  final ApSessionResult result;
  final List<ApTask> missed;
  final bool? foundationPassed;

  @override
  Widget build(BuildContext context) {
    final passed = foundationPassed;
    final headline = passed == null
        ? (result.percent >= 80 ? 'Très belle séance' : 'Séance terminée')
        : (passed ? 'Fondation validée' : 'Encore un effort');
    return Scaffold(
      backgroundColor: ApColors.ivory,
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(20, 24, 20, 24),
          children: [
            Center(
              child: ApRing(
                value: result.percent / 100,
                label: '${result.percent} %',
                size: 116,
                color: result.percent >= ApprendreProgress.passMark
                    ? ApColors.sage
                    : ApColors.clay,
              ),
            ),
            const SizedBox(height: 18),
            Text(
              headline,
              textAlign: TextAlign.center,
              style: ApText.display.copyWith(fontSize: 28),
            ),
            const SizedBox(height: 6),
            Text(
              '$title · ${result.correct} bonnes réponses sur ${result.total}',
              textAlign: TextAlign.center,
              style: ApText.body,
            ),
            if (passed == false) ...[
              const SizedBox(height: 6),
              const Text(
                'Il faut 60 % pour valider. Relis la leçon puis réessaie.',
                textAlign: TextAlign.center,
                style: ApText.small,
              ),
            ],
            if (missed.isNotEmpty) ...[
              const ApSectionTitle('À retenir'),
              for (final task in missed.take(6))
                Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: ApCardBox(
                    padding: const EdgeInsets.all(14),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          task.prompt,
                          style: task.promptIsBariba
                              ? ApText.bariba.copyWith(fontSize: 16)
                              : ApText.body.copyWith(fontWeight: FontWeight.w700),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          task.answer,
                          style: (task.optionsAreBariba ? ApText.bariba : ApText.body)
                              .copyWith(fontSize: 15, color: ApColors.sageInk),
                        ),
                        const SizedBox(height: 6),
                        ApSourceTag(task.source, verified: task.verified),
                      ],
                    ),
                  ),
                ),
            ],
            const SizedBox(height: 20),
            ApPrimaryButton(
              label: 'Retour au parcours',
              onPressed: () => Navigator.of(context).pop(result),
            ),
          ],
        ),
      ),
    );
  }
}
