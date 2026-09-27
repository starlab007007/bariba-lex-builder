import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:path_provider/path_provider.dart';
import 'package:record/record.dart';

import '../core/fitila_backend.dart';
import 'apprendre_audio.dart';
import 'apprendre_ui.dart';
import 'apprendre_voice_analysis.dart';

/// Rôles voix de l'utilisateur connecté (lus dans `user_roles`).
class ApVoiceAccess {
  const ApVoiceAccess({required this.userId, required this.roles});

  static const none = ApVoiceAccess(userId: null, roles: <String>{});

  final String? userId;
  final Set<String> roles;

  bool get loggedIn => userId != null;
  bool get admin => roles.contains('admin');
  bool get speaker => admin || roles.contains('voice_speaker');
  bool get reviewer => admin || roles.contains('voice_reviewer');

  static Future<ApVoiceAccess> load() async {
    if (!FitilaBackend.configured) {
      return none;
    }
    try {
      final client = FitilaBackend.client;
      final user = client.auth.currentUser;
      if (user == null) {
        return none;
      }
      final rows = await client.from('user_roles').select('role').eq('user_id', user.id);
      return ApVoiceAccess(
        userId: user.id,
        roles: {for (final row in rows) row['role'].toString()},
      );
    } catch (_) {
      return none;
    }
  }
}

/// Enregistreur WAV 16 kHz mono (format attendu par l'analyse de voix).
class ApWavRecorder {
  final AudioRecorder _recorder = AudioRecorder();
  bool recording = false;

  Future<void> start() async {
    if (!await _recorder.hasPermission()) {
      throw StateError('Autorisation du microphone refusée.');
    }
    final dir = await getTemporaryDirectory();
    final path = '${dir.path}${Platform.pathSeparator}apprendre_${DateTime.now().millisecondsSinceEpoch}.wav';
    await _recorder.start(
      const RecordConfig(encoder: AudioEncoder.wav, sampleRate: 16000, numChannels: 1),
      path: path,
    );
    recording = true;
  }

  Future<File?> stop() async {
    final path = await _recorder.stop();
    recording = false;
    if (path == null) {
      return null;
    }
    final file = File(path);
    return file.existsSync() ? file : null;
  }

  Future<void> cancel() async {
    if (recording) {
      await _recorder.cancel();
    }
    recording = false;
  }

  Future<void> dispose() => _recorder.dispose();
}

/// Bouton « Comparer ma voix », visible seulement quand une référence existe.
class ApCompareButton extends StatelessWidget {
  const ApCompareButton(this.text, {super.key, this.fr, this.compact = false});

  final String text;
  final String? fr;
  final bool compact;

  @override
  Widget build(BuildContext context) {
    final service = ApAudioService.instance;
    return ValueListenableBuilder<int>(
      valueListenable: service.revision,
      builder: (context, _, _) {
        if (!service.has(text)) {
          return const SizedBox.shrink();
        }
        if (compact) {
          return Tooltip(
            message: 'Comparer ma voix',
            child: Material(
              color: ApColors.night,
              shape: const CircleBorder(),
              child: InkWell(
                customBorder: const CircleBorder(),
                onTap: () => showApVoiceCompare(context, text: text, fr: fr),
                child: const SizedBox(
                  width: 36,
                  height: 36,
                  child: Icon(Icons.mic_rounded, size: 18, color: Colors.white),
                ),
              ),
            ),
          );
        }
        return ApSecondaryButton(
          label: 'Comparer ma voix',
          icon: Icons.graphic_eq_rounded,
          onPressed: () => showApVoiceCompare(context, text: text, fr: fr),
        );
      },
    );
  }
}

/// Feuille « Compare ta voix » : écoute, enregistrement, analyse, conseils.
Future<void> showApVoiceCompare(BuildContext context, {required String text, String? fr}) {
  return showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    showDragHandle: true,
    backgroundColor: ApColors.ivory,
    builder: (_) => _CompareSheet(text: text, fr: fr),
  );
}

enum _Stage { idle, recording, analyzing, result, failed }

class _CompareSheet extends StatefulWidget {
  const _CompareSheet({required this.text, this.fr});

  final String text;
  final String? fr;

  @override
  State<_CompareSheet> createState() => _CompareSheetState();
}

class _CompareSheetState extends State<_CompareSheet> {
  final ApWavRecorder _recorder = ApWavRecorder();
  _Stage _stage = _Stage.idle;
  ApVoiceComparison? _result;
  File? _mine;
  String? _error;

  @override
  void dispose() {
    _recorder.cancel();
    _recorder.dispose();
    ApAudioService.instance.stop();
    super.dispose();
  }

  Future<void> _toggle() async {
    if (_stage == _Stage.recording) {
      final file = await _recorder.stop();
      if (!mounted) {
        return;
      }
      if (file == null) {
        setState(() {
          _stage = _Stage.failed;
          _error = 'Enregistrement vide. Réessaie.';
        });
        return;
      }
      setState(() {
        _mine = file;
        _stage = _Stage.analyzing;
      });
      await _analyze(file);
      return;
    }
    try {
      await ApAudioService.instance.stop();
      await _recorder.start();
      if (mounted) {
        setState(() {
          _stage = _Stage.recording;
          _result = null;
          _error = null;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          _stage = _Stage.failed;
          _error = 'Microphone indisponible.';
        });
      }
    }
  }

  Future<void> _analyze(File mine) async {
    final service = ApAudioService.instance;
    final entry = service.entryFor(widget.text);
    final reference = entry == null ? null : await service.fileFor(entry);
    if (reference == null) {
      if (mounted) {
        setState(() {
          _stage = _Stage.failed;
          _error = 'Voix de référence indisponible hors connexion.';
        });
      }
      return;
    }
    final request = ApCompareRequest(
      await reference.readAsBytes(),
      await mine.readAsBytes(),
      service.compareSettings,
    );
    final result = await compute(apCompareVoicesIsolate, request);
    if (!mounted) {
      return;
    }
    setState(() {
      _result = result;
      _stage = result == null ? _Stage.failed : _Stage.result;
      _error = result == null ? 'Prise trop courte ou inaudible : parle un peu plus fort.' : null;
    });
  }

  Future<void> _playBoth() async {
    final service = ApAudioService.instance;
    final entry = service.entryFor(widget.text);
    final mine = _mine;
    if (entry == null || mine == null) {
      return;
    }
    await service.play(widget.text);
    await Future<void>.delayed(Duration(milliseconds: entry.durationMs + 400));
    if (mounted) {
      await service.playFile(mine.path);
    }
  }

  @override
  Widget build(BuildContext context) {
    final result = _result;
    final recording = _stage == _Stage.recording;
    return SafeArea(
      child: ConstrainedBox(
        constraints: BoxConstraints(maxHeight: MediaQuery.sizeOf(context).height * .9),
        child: ListView(
          shrinkWrap: true,
          padding: const EdgeInsets.fromLTRB(20, 0, 20, 24),
          children: [
            Text('COMPARE TA VOIX', style: ApText.label.copyWith(color: ApColors.goldDeep)),
            const SizedBox(height: 6),
            Row(
              children: [
                Expanded(child: Text(widget.text, style: ApText.bariba.copyWith(fontSize: 26))),
                ApAudioButton(widget.text, size: 44),
              ],
            ),
            if ((widget.fr ?? '').isNotEmpty) ...[
              const SizedBox(height: 4),
              Text(widget.fr!, style: ApText.body.copyWith(color: ApColors.quiet)),
            ],
            if (!ApAudioService.instance.compareSettings.calibrated) ...[
              const SizedBox(height: 10),
              const ApPill(
                'Coach vocal en phase de calibrage',
                icon: Icons.science_outlined,
                background: ApColors.goldTint,
                foreground: ApColors.goldDeep,
              ),
              const SizedBox(height: 4),
              const Text(
                'Les scores servent de repère d’entraînement. Ils ne doivent pas être interprétés comme une validation linguistique.',
                style: ApText.small,
              ),
            ],
            const SizedBox(height: 18),
            Center(
              child: Semantics(
                button: true,
                label: recording ? 'Arrêter et comparer' : 'Enregistrer ma voix',
                child: GestureDetector(
                  onTap: _stage == _Stage.analyzing ? null : _toggle,
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 220),
                    width: 88,
                    height: 88,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: recording ? ApColors.clay : ApColors.gold,
                      boxShadow: [
                        BoxShadow(
                          color: (recording ? ApColors.clay : ApColors.gold).withValues(alpha: .22),
                          spreadRadius: recording ? 14 : 8,
                        ),
                      ],
                    ),
                    child: _stage == _Stage.analyzing
                        ? const Padding(
                            padding: EdgeInsets.all(28),
                            child: CircularProgressIndicator(strokeWidth: 3, color: ApColors.goldInk),
                          )
                        : Icon(
                            recording ? Icons.stop_rounded : Icons.mic_rounded,
                            size: 38,
                            color: recording ? Colors.white : ApColors.goldInk,
                          ),
                  ),
                ),
              ),
            ),
            const SizedBox(height: 12),
            Text(
              switch (_stage) {
                _Stage.idle => 'Écoute la référence, puis appuie et répète.',
                _Stage.recording => 'Je t’écoute… appuie pour arrêter.',
                _Stage.analyzing => 'Comparaison en cours…',
                _Stage.result => 'Appuie de nouveau pour recommencer.',
                _Stage.failed => _error ?? 'Réessaie.',
              },
              textAlign: TextAlign.center,
              style: ApText.small.copyWith(color: ApColors.inkSoft),
            ),
            if (result != null) ...[
              const SizedBox(height: 18),
              _ResultHeader(result: result),
              const SizedBox(height: 14),
              ApCardBox(
                padding: const EdgeInsets.fromLTRB(12, 12, 12, 8),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Mélodie de la voix (tons)', style: ApText.small.copyWith(fontWeight: FontWeight.w700)),
                    const SizedBox(height: 8),
                    SizedBox(
                      height: 120,
                      child: CustomPaint(
                        size: Size.infinite,
                        painter: ApContourPainter(
                          reference: result.referenceContour,
                          learner: result.learnerContour,
                        ),
                      ),
                    ),
                    const SizedBox(height: 6),
                    const Row(
                      children: [
                        _Legend(color: ApColors.gold, label: 'Référence'),
                        SizedBox(width: 14),
                        _Legend(color: ApColors.night, label: 'Ma voix'),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 12),
              for (final line in result.advice)
                Padding(
                  padding: const EdgeInsets.only(bottom: 6),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Icon(Icons.lightbulb_rounded, size: 18, color: ApColors.goldDeep),
                      const SizedBox(width: 8),
                      Expanded(child: Text(line, style: ApText.body.copyWith(fontSize: 14))),
                    ],
                  ),
                ),
              const SizedBox(height: 10),
              Row(
                children: [
                  Expanded(
                    child: ApSecondaryButton(
                      label: 'Ma voix',
                      icon: Icons.person_rounded,
                      onPressed: () => ApAudioService.instance.playFile(_mine!.path),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: ApSecondaryButton(
                      label: 'Les deux',
                      icon: Icons.compare_arrows_rounded,
                      onPressed: _playBoth,
                    ),
                  ),
                ],
              ),
            ],
            const SizedBox(height: 14),
            Text(
              'La comparaison guide ton oreille ; elle ne remplace pas l’avis d’un locuteur.',
              textAlign: TextAlign.center,
              style: ApText.small.copyWith(fontSize: 11),
            ),
          ],
        ),
      ),
    );
  }
}

class _ResultHeader extends StatelessWidget {
  const _ResultHeader({required this.result});

  final ApVoiceComparison result;

  @override
  Widget build(BuildContext context) {
    final color = switch (result.verdict) {
      ApVerdict.veryClose => ApColors.sage,
      ApVerdict.close => ApColors.gold,
      ApVerdict.retry => ApColors.clay,
    };
    return Row(
      children: [
        ApRing(value: result.total / 100, label: '${result.total}', size: 64, color: color),
        const SizedBox(width: 14),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(result.verdictLabel, style: ApText.display.copyWith(fontSize: 22)),
              const SizedBox(height: 6),
              _ScoreBar(label: 'Sons', value: result.sounds),
              _ScoreBar(label: 'Mélodie', value: result.melody),
              _ScoreBar(label: 'Rythme', value: result.rhythm),
            ],
          ),
        ),
      ],
    );
  }
}

class _ScoreBar extends StatelessWidget {
  const _ScoreBar({required this.label, required this.value});

  final String label;
  final int? value;

  @override
  Widget build(BuildContext context) {
    final v = value;
    return Padding(
      padding: const EdgeInsets.only(bottom: 4),
      child: Row(
        children: [
          SizedBox(width: 62, child: Text(label, style: ApText.small.copyWith(fontSize: 11.5))),
          Expanded(
            child: ApProgressBar(
              value: v == null ? 0.0 : v / 100,
              height: 5,
              color: v == null
                  ? ApColors.line
                  : v >= 60
                  ? ApColors.sage
                  : ApColors.clay,
            ),
          ),
          const SizedBox(width: 8),
          SizedBox(
            width: 30,
            child: Text(v == null ? '—' : '$v', textAlign: TextAlign.right, style: ApText.small.copyWith(fontSize: 11.5)),
          ),
        ],
      ),
    );
  }
}

class _Legend extends StatelessWidget {
  const _Legend({required this.color, required this.label});

  final Color color;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(width: 14, height: 3, color: color),
        const SizedBox(width: 6),
        Text(label, style: ApText.small.copyWith(fontSize: 11)),
      ],
    );
  }
}

/// Deux courbes de hauteur (demi-tons) sur le même axe de temps.
class ApContourPainter extends CustomPainter {
  ApContourPainter({required this.reference, required this.learner, this.highlight = true});

  final List<double?> reference;
  final List<double?> learner;
  final bool highlight;

  @override
  void paint(Canvas canvas, Size size) {
    final grid = Paint()
      ..color = ApColors.line
      ..strokeWidth = 1;
    for (var i = 0; i <= 4; i++) {
      final y = size.height * i / 4;
      canvas.drawLine(Offset(0, y), Offset(size.width, y), grid);
    }
    final n = reference.length;
    if (n < 2) {
      return;
    }
    const range = 7.0; // ± 7 demi-tons
    double yOf(double st) => size.height / 2 - (st / range) * (size.height / 2);
    double xOf(int i) => size.width * i / (n - 1);
    if (highlight) {
      final warn = Paint()..color = ApColors.clayTint;
      for (var i = 0; i < n; i++) {
        final a = reference[i];
        final b = i < learner.length ? learner[i] : null;
        if (a != null && b != null && (a - b).abs() > 2.5) {
          canvas.drawRect(Rect.fromLTWH(xOf(i) - size.width / n, 0, size.width / n * 2, size.height), warn);
        }
      }
    }
    void curve(List<double?> values, Color color, double width) {
      final paint = Paint()
        ..color = color
        ..strokeWidth = width
        ..style = PaintingStyle.stroke
        ..strokeCap = StrokeCap.round;
      Path? path;
      for (var i = 0; i < n && i < values.length; i++) {
        final v = values[i];
        if (v == null) {
          if (path != null) {
            canvas.drawPath(path, paint);
          }
          path = null;
          continue;
        }
        final point = Offset(xOf(i), yOf(v.clamp(-range, range).toDouble()));
        if (path == null) {
          path = Path()..moveTo(point.dx, point.dy);
        } else {
          path.lineTo(point.dx, point.dy);
        }
      }
      if (path != null) {
        canvas.drawPath(path, paint);
      }
    }

    curve(reference, ApColors.gold, 4);
    curve(learner, ApColors.night, 2.5);
  }

  @override
  bool shouldRepaint(covariant ApContourPainter oldDelegate) =>
      oldDelegate.reference != reference || oldDelegate.learner != learner;
}
