import 'package:audioplayers/audioplayers.dart' as audio;
import 'package:flutter/material.dart';
import 'package:flutter_tts/flutter_tts.dart';

import '../core/fitila_backend.dart';
import '../core/fitila_media.dart';
import 'apprendre_store.dart';
import 'apprendre_tasks.dart';
import 'apprendre_ui.dart';

class ApSessionResult {
  const ApSessionResult({required this.correct, required this.total});
  final int correct;
  final int total;
  int get percent => total == 0 ? 0 : (correct * 100 / total).round();
}

/// Séance d'exercices adaptative : QCM, ordre de mots et oral.
/// Toute progression est d'abord stockée localement ; la télémétrie serveur
/// est best-effort afin que le module reste pleinement utilisable hors ligne.
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
  final String sessionKey;
  final String? foundationId;

  @override
  State<ApSessionScreen> createState() => _ApSessionScreenState();
}

class _ApSessionScreenState extends State<ApSessionScreen> {
  int _index = 0;
  int _correct = 0;
  bool _answered = false;
  bool _wasCorrect = false;
  bool _finishing = false;
  String? _selected;
  final List<String> _ordered = [];
  final List<ApTask> _missed = [];
  final _tts = FlutterTts();
  final _media = FitilaMediaController();
  final _player = audio.AudioPlayer();
  FitilaMediaAsset? _recorded;
  bool _recording = false;

  ApTask get _task => widget.tasks[_index];
  bool get _oral => widget.store.progress.profile == 'oral';

  @override
  void initState() {
    super.initState();
    if (_oral && widget.tasks.isNotEmpty) {
      WidgetsBinding.instance.addPostFrameCallback((_) => _read());
    }
  }

  @override
  void dispose() {
    _tts.stop();
    _player.dispose();
    _media.dispose();
    super.dispose();
  }

  Future<void> _read() async {
    if (widget.tasks.isEmpty) return;
    try {
      await _tts.setLanguage('fr-FR');
      await _tts.setSpeechRate(.45);
      final t = _task;
      await _tts.speak(
        t.promptIsBariba ? t.instruction : '${t.instruction}. ${t.prompt}',
      );
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Lecture vocale indisponible.')),
      );
    }
  }

  void _answer(bool ok) {
    if (_answered) return;
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

  void _choose(String value) {
    if (_answered) return;
    setState(() {
      _selected = value;
      _answer(_task.isCorrectChoice(value));
    });
  }

  void _checkOrder() {
    if (_answered || _ordered.length != _task.orderAnswer.length) return;
    setState(() => _answer(_task.isCorrectOrder(_ordered)));
  }

  Future<void> _toggleRecording() async {
    if (_recording) {
      final asset = await _media.stopAudio();
      if (!mounted) return;
      setState(() {
        _recording = false;
        _recorded = asset;
      });
      return;
    }
    try {
      await _media.startAudio();
      if (mounted) setState(() => _recording = true);
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Microphone indisponible.')),
      );
    }
  }

  Future<void> _next() async {
    if (_index + 1 < widget.tasks.length) {
      setState(() {
        _index++;
        _selected = null;
        _answered = false;
        _wasCorrect = false;
        _ordered.clear();
        _recorded = null;
      });
      if (_oral) await _read();
      return;
    }
    await _finish();
  }

  Future<void> _finish() async {
    if (_finishing) return;
    setState(() => _finishing = true);
    final now = DateTime.now();
    final result = ApSessionResult(correct: _correct, total: widget.tasks.length);
    if (widget.foundationId != null) {
      widget.store.progress.recordFoundation(
        widget.foundationId!,
        result.percent,
        now,
      );
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
      // Le mode hors-ligne ne doit jamais bloquer la fin de séance.
    }
    if (!mounted) return;
    await Navigator.of(context).pushReplacement(
      MaterialPageRoute<ApSessionResult>(
        builder: (_) => ApResultScreen(
          title: widget.title,
          result: result,
          missed: List.unmodifiable(_missed),
          foundationPassed: widget.foundationId == null
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
                    padding: EdgeInsets.all(28),
                    child: Text(
                      'Rien à réviser pour le moment. Apprends quelques nouveaux mots puis reviens.',
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
            ? const Center(
                child: CircularProgressIndicator(color: ApColors.gold),
              )
            : Column(
                children: [
                  Padding(
                    padding: const EdgeInsets.fromLTRB(16, 10, 16, 4),
                    child: Row(
                      children: [
                        ApRoundIconButton(
                          icon: Icons.close_rounded,
                          tooltip: 'Quitter',
                          onPressed: () => Navigator.of(context).maybePop(),
                        ),
                        const SizedBox(width: 14),
                        Expanded(
                          child: ApProgressBar(
                            value: (_index + (_answered ? 1 : 0)) /
                                widget.tasks.length,
                            height: 8,
                          ),
                        ),
                        const SizedBox(width: 12),
                        Text(
                          '${_index + 1}/${widget.tasks.length}',
                          style: ApText.small.copyWith(
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                      ],
                    ),
                  ),
                  Expanded(
                    child: ListView(
                      padding: const EdgeInsets.fromLTRB(20, 18, 20, 26),
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
                              tooltip: 'Écouter',
                              size: 40,
                              onPressed: _read,
                            ),
                          ],
                        ),
                        const SizedBox(height: 12),
                        _Prompt(task: task),
                        const SizedBox(height: 18),
                        if (task.kind == ApTaskKind.choice)
                          ...task.options.map(
                            (option) => Padding(
                              padding: const EdgeInsets.only(bottom: 10),
                              child: _Choice(
                                label: option,
                                bariba: task.optionsAreBariba,
                                state: !_answered
                                    ? 0
                                    : option == task.answer
                                        ? 1
                                        : option == _selected
                                            ? 2
                                            : 3,
                                onTap: () => _choose(option),
                              ),
                            ),
                          ),
                        if (task.kind == ApTaskKind.order)
                          _OrderTask(
                            task: task,
                            picked: _ordered,
                            answered: _answered,
                            onPick: (word) => setState(() => _ordered.add(word)),
                            onRemove: (index) =>
                                setState(() => _ordered.removeAt(index)),
                            onCheck: _checkOrder,
                          ),
                        if (task.kind == ApTaskKind.speak)
                          _SpeakTask(
                            task: task,
                            recording: _recording,
                            hasRecording: _recorded != null,
                            answered: _answered,
                            onRecord: _toggleRecording,
                            onPlay: _recorded == null
                                ? null
                                : () => _player.play(
                                      audio.DeviceFileSource(_recorded!.path),
                                    ),
                            onAssess: (ok) =>
                                setState(() => _answer(ok)),
                          ),
                      ],
                    ),
                  ),
                  if (_answered)
                    _Feedback(
                      correct: _wasCorrect,
                      task: task,
                      last: _index == widget.tasks.length - 1,
                      onContinue: _next,
                    ),
                ],
              ),
      ),
    );
  }
}

class _Prompt extends StatelessWidget {
  const _Prompt({required this.task});
  final ApTask task;

  @override
  Widget build(BuildContext context) {
    return ApCardBox(
      radius: 24,
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (task.promptIsBariba)
            ApBaribaText(
              task.prompt,
              size: 27,
              transcription: task.transcription,
            )
          else
            Text(task.prompt, style: ApText.display.copyWith(fontSize: 24)),
          if ((task.promptSub ?? '').isNotEmpty) ...[
            const SizedBox(height: 8),
            Text(task.promptSub!, style: ApText.body),
          ],
          if (!task.verified) ...[
            const SizedBox(height: 12),
            const ApPill(
              'À valider',
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

class _Choice extends StatelessWidget {
  const _Choice({
    required this.label,
    required this.bariba,
    required this.state,
    required this.onTap,
  });
  final String label;
  final bool bariba;
  final int state; // 0 idle, 1 correct, 2 wrong, 3 dim
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final bg = switch (state) {
      1 => ApColors.sageTint,
      2 => ApColors.clayTint,
      _ => ApColors.surface,
    };
    final border = switch (state) {
      1 => ApColors.sage,
      2 => ApColors.clay,
      _ => ApColors.line,
    };
    return Material(
      color: bg,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(18),
        side: BorderSide(color: border, width: state == 0 || state == 3 ? 1 : 2),
      ),
      child: InkWell(
        borderRadius: BorderRadius.circular(18),
        onTap: state == 0 ? onTap : null,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 15),
          child: Row(
            children: [
              Expanded(
                child: Text(
                  label,
                  style: (bariba ? ApText.bariba : ApText.body).copyWith(
                    fontSize: bariba ? 17 : 15,
                    fontWeight: FontWeight.w700,
                    color: state == 3 ? ApColors.muted : ApColors.ink,
                  ),
                ),
              ),
              if (state == 1)
                const Icon(Icons.check_circle_rounded, color: ApColors.sage),
              if (state == 2)
                const Icon(Icons.cancel_rounded, color: ApColors.clay),
            ],
          ),
        ),
      ),
    );
  }
}

class _OrderTask extends StatelessWidget {
  const _OrderTask({
    required this.task,
    required this.picked,
    required this.answered,
    required this.onPick,
    required this.onRemove,
    required this.onCheck,
  });
  final ApTask task;
  final List<String> picked;
  final bool answered;
  final ValueChanged<String> onPick;
  final ValueChanged<int> onRemove;
  final VoidCallback onCheck;

  @override
  Widget build(BuildContext context) {
    final remaining = List<String>.from(task.options);
    for (final word in picked) {
      remaining.remove(word);
    }
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        ApCardBox(
          child: Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              for (var i = 0; i < picked.length; i++)
                ActionChip(
                  label: Text(picked[i], style: ApText.bariba),
                  onPressed: answered ? null : () => onRemove(i),
                  backgroundColor: ApColors.goldTint,
                  side: const BorderSide(color: ApColors.gold),
                ),
              if (picked.isEmpty)
                Text('Construis la phrase ici…', style: ApText.small),
            ],
          ),
        ),
        const SizedBox(height: 12),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            for (final word in remaining)
              ActionChip(
                label: Text(word, style: ApText.bariba),
                onPressed: answered ? null : () => onPick(word),
                backgroundColor: ApColors.surface,
                side: const BorderSide(color: ApColors.lineStrong),
              ),
          ],
        ),
        const SizedBox(height: 16),
        if (!answered)
          ApPrimaryButton(
            label: 'Vérifier',
            onPressed: picked.length == task.orderAnswer.length ? onCheck : null,
          ),
      ],
    );
  }
}

class _SpeakTask extends StatelessWidget {
  const _SpeakTask({
    required this.task,
    required this.recording,
    required this.hasRecording,
    required this.answered,
    required this.onRecord,
    required this.onPlay,
    required this.onAssess,
  });
  final ApTask task;
  final bool recording;
  final bool hasRecording;
  final bool answered;
  final VoidCallback onRecord;
  final VoidCallback? onPlay;
  final ValueChanged<bool> onAssess;

  @override
  Widget build(BuildContext context) => Column(
        children: [
          const SizedBox(height: 8),
          IconButton.filled(
            onPressed: answered ? null : onRecord,
            style: IconButton.styleFrom(
              minimumSize: const Size(88, 88),
              backgroundColor: recording ? ApColors.clay : ApColors.gold,
              foregroundColor: recording ? Colors.white : ApColors.goldInk,
            ),
            icon: Icon(recording ? Icons.stop_rounded : Icons.mic_rounded, size: 40),
          ),
          const SizedBox(height: 8),
          Text(
            recording ? 'Arrêter' : 'Enregistre-toi',
            style: ApText.body.copyWith(fontWeight: FontWeight.w700),
          ),
          if (hasRecording) ...[
            const SizedBox(height: 12),
            ApSecondaryButton(
              label: 'Réécouter ma voix',
              icon: Icons.play_arrow_rounded,
              onPressed: onPlay,
            ),
            const SizedBox(height: 14),
            Text('Est-ce proche du modèle ?', style: ApText.small),
            const SizedBox(height: 8),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: answered ? null : () => onAssess(false),
                    child: const Text('À refaire'),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: FilledButton(
                    onPressed: answered ? null : () => onAssess(true),
                    style: FilledButton.styleFrom(
                      backgroundColor: ApColors.sage,
                    ),
                    child: const Text('Oui'),
                  ),
                ),
              ],
            ),
          ],
        ],
      );
}

class _Feedback extends StatelessWidget {
  const _Feedback({
    required this.correct,
    required this.task,
    required this.last,
    required this.onContinue,
  });
  final bool correct;
  final ApTask task;
  final bool last;
  final VoidCallback onContinue;

  @override
  Widget build(BuildContext context) {
    final bg = correct ? ApColors.sageTint : ApColors.clayTint;
    final fg = correct ? ApColors.sageInk : ApColors.clayInk;
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.fromLTRB(20, 14, 20, 20),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            correct ? 'Bien vu !' : 'Presque.',
            style: TextStyle(
              fontFamily: 'Inter',
              fontSize: 18,
              fontWeight: FontWeight.w800,
              color: fg,
            ),
          ),
          if (!correct && task.kind != ApTaskKind.speak) ...[
            const SizedBox(height: 4),
            Text('Bonne réponse : ${task.answer}', style: ApText.body),
          ],
          if (task.explain.isNotEmpty) ...[
            const SizedBox(height: 6),
            Text(task.explain, style: ApText.small.copyWith(color: ApColors.inkSoft)),
          ],
          const SizedBox(height: 6),
          ApSourceTag(task.source, verified: task.verified),
          const SizedBox(height: 12),
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
    return Scaffold(
      backgroundColor: ApColors.ivory,
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(20, 28, 20, 28),
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
              passed == null
                  ? 'Séance terminée'
                  : passed
                      ? 'Fondation validée'
                      : 'Encore un effort',
              textAlign: TextAlign.center,
              style: ApText.display.copyWith(fontSize: 28),
            ),
            const SizedBox(height: 8),
            Text(
              '$title · ${result.correct} / ${result.total}',
              textAlign: TextAlign.center,
              style: ApText.body,
            ),
            if (missed.isNotEmpty) ...[
              const ApSectionTitle('À retenir'),
              for (final task in missed.take(6))
                Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: ApCardBox(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(task.prompt, style: ApText.body),
                        const SizedBox(height: 4),
                        Text(
                          task.answer,
                          style: ApText.bariba.copyWith(
                            color: ApColors.sageInk,
                            fontSize: 16,
                          ),
                        ),
                        const SizedBox(height: 4),
                        ApSourceTag(task.source, verified: task.verified),
                      ],
                    ),
                  ),
                ),
            ],
            const SizedBox(height: 18),
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
