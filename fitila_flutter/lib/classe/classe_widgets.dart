import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../core/fitila_media.dart';
import '../core/signature_theme.dart';
import '../keyboard/bariba_input.dart';
import 'classe_audio.dart';
import 'classe_content.dart';
import 'classe_store.dart';

/// Couleurs de niveau (N1 doré, N2 violet) — identiques à l'écran Classe.
Color levelColor(String level) => level == 'N2' ? const Color(0xFF6758C9) : SignatureTheme.goldDeep;
Color levelTint(String level) => level == 'N2' ? const Color(0xFFE5E1FA) : SignatureTheme.goldTint;

String appreciationFor(double grade) {
  if (grade >= 18) return 'Excellent';
  if (grade >= 16) return 'Très bien';
  if (grade >= 14) return 'Bien';
  if (grade >= 12) return 'Assez bien';
  if (grade >= 10) return 'Passable';
  return 'À revoir';
}

Color gradeColor(double grade) => grade >= 14 ? SignatureTheme.sage : grade >= 10 ? SignatureTheme.goldDeep : SignatureTheme.clay;

/// Conteneur carte de la Classe.
class ClasseBox extends StatelessWidget {
  const ClasseBox({super.key, required this.child, this.padding = const EdgeInsets.all(14), this.color, this.borderColor, this.margin});

  final Widget child;
  final EdgeInsets padding;
  final EdgeInsets? margin;
  final Color? color;
  final Color? borderColor;

  @override
  Widget build(BuildContext context) => Container(
    margin: margin,
    padding: padding,
    decoration: BoxDecoration(
      color: color ?? SignatureTheme.surface,
      borderRadius: BorderRadius.circular(SignatureTheme.radiusMedium),
      border: Border.all(color: borderColor ?? SignatureTheme.hairline),
    ),
    child: child,
  );
}

/// En-tête de sous-écran : retour + titre + pastille de niveau.
class ClasseHeader extends StatelessWidget {
  const ClasseHeader({super.key, required this.title, required this.onBack, this.level, this.trailing});

  final String title;
  final VoidCallback onBack;
  final String? level;
  final Widget? trailing;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(bottom: 10),
    child: Row(
      children: [
        IconButton(tooltip: 'Retour', onPressed: onBack, icon: const Icon(Icons.arrow_back_rounded)),
        Expanded(
          child: Text(title, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 19, fontWeight: FontWeight.w900, color: SignatureTheme.ink)),
        ),
        ?trailing,
        if (level != null)
          Container(
            margin: const EdgeInsets.only(left: 6),
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
            decoration: BoxDecoration(color: levelTint(level!), borderRadius: BorderRadius.circular(99)),
            child: Text(level == 'N1' ? '🔥 N1' : '🚀 N2', style: TextStyle(color: levelColor(level!), fontSize: 11, fontWeight: FontWeight.w900)),
          ),
      ],
    ),
  );
}

/// Illustration d'une leçon : chargement progressif, nouvel essai, repli lisible hors connexion.
class ClasseImage extends StatefulWidget {
  const ClasseImage({super.key, required this.url, this.height = 300});

  /// Chemin relatif (`/classe/img-p012.png`) ou URL absolue.
  final String url;
  final double height;

  @override
  State<ClasseImage> createState() => _ClasseImageState();
}

class _ClasseImageState extends State<ClasseImage> {
  int _attempt = 0;

  String get _resolved => widget.url.startsWith('http') ? widget.url : 'https://fitila.bj${widget.url}';

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(SignatureTheme.radiusMedium + 2),
      child: Container(
        color: SignatureTheme.surface,
        constraints: BoxConstraints(maxHeight: widget.height),
        width: double.infinity,
        child: Image.network(
          _resolved,
          key: ValueKey('$_resolved#$_attempt'),
          fit: BoxFit.contain,
          height: widget.height,
          semanticLabel: 'Illustration de la leçon',
          loadingBuilder: (context, child, progress) => progress == null
              ? child
              : SizedBox(
                  height: widget.height * .6,
                  child: Center(child: CircularProgressIndicator(strokeWidth: 2, value: progress.expectedTotalBytes == null ? null : progress.cumulativeBytesLoaded / progress.expectedTotalBytes!)),
                ),
          errorBuilder: (context, _, _) => Container(
            height: 170,
            color: SignatureTheme.surfaceAlt,
            alignment: Alignment.center,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.image_not_supported_outlined, color: SignatureTheme.muted, size: 34),
                const SizedBox(height: 6),
                const Text('Illustration indisponible', style: TextStyle(color: SignatureTheme.muted, fontSize: 12.5)),
                TextButton.icon(onPressed: () => setState(() => _attempt++), icon: const Icon(Icons.refresh_rounded, size: 18), label: const Text('Réessayer')),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// Bouton « Écouter » d'un contenu de la Classe. Grisé s'il n'existe pas d'audio validé.
class ClasseListenButton extends StatefulWidget {
  const ClasseListenButton({super.key, required this.contentKey, this.audio, this.size = 38, this.label});

  final String contentKey;
  final ClasseAudio? audio;
  final double size;
  final String? label;

  @override
  State<ClasseListenButton> createState() => _ClasseListenButtonState();
}

class _ClasseListenButtonState extends State<ClasseListenButton> {
  ClasseAudio get _audio => widget.audio ?? ClasseAudio.instance;
  bool? _available;

  @override
  void initState() {
    super.initState();
    _resolve();
  }

  @override
  void didUpdateWidget(covariant ClasseListenButton old) {
    super.didUpdateWidget(old);
    if (old.contentKey != widget.contentKey) {
      _available = null;
      _resolve();
    }
  }

  Future<void> _resolve() async {
    final parts = widget.contentKey.split('/');
    final prefix = parts.length >= 3 ? '${parts.take(3).join('/')}/' : widget.contentKey;
    final map = await _audio.approvedFor(prefix);
    if (mounted) {
      setState(() => _available = map.containsKey(widget.contentKey));
    }
  }

  Future<void> _tap() async {
    final ok = await _audio.playContent(widget.contentKey);
    if (!ok && mounted && _audio.error.value != null) {
      ScaffoldMessenger.of(context)
        ..hideCurrentSnackBar()
        ..showSnackBar(SnackBar(content: Text(_audio.error.value!)));
    }
  }

  @override
  Widget build(BuildContext context) {
    final available = _available == true;
    return ValueListenableBuilder<String?>(
      valueListenable: _audio.playing,
      builder: (context, playingId, _) => ValueListenableBuilder<String?>(
        valueListenable: _audio.loading,
        builder: (context, loadingId, _) {
          final playing = playingId == widget.contentKey;
          final loading = loadingId == widget.contentKey || _available == null;
          return Tooltip(
            message: available ? (playing ? 'Arrêter' : 'Écouter') : 'Audio bientôt disponible',
            child: Semantics(
              button: true,
              enabled: available,
              label: available ? 'Écouter ce contenu' : 'Audio non disponible',
              child: Material(
                color: available ? (playing ? SignatureTheme.gold : SignatureTheme.goldTint) : SignatureTheme.surfaceAlt,
                shape: widget.label == null ? const CircleBorder() : const StadiumBorder(),
                child: InkWell(
                  key: ValueKey('listen-${widget.contentKey}'),
                  customBorder: widget.label == null ? const CircleBorder() : const StadiumBorder(),
                  onTap: available ? _tap : null,
                  child: SizedBox(
                    height: widget.size,
                    width: widget.label == null ? widget.size : null,
                    child: Padding(
                      padding: widget.label == null ? EdgeInsets.zero : const EdgeInsets.symmetric(horizontal: 12),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          if (loading && _available != false)
                            SizedBox.square(dimension: widget.size * .42, child: const CircularProgressIndicator(strokeWidth: 2))
                          else
                            Icon(
                              available ? (playing ? Icons.stop_rounded : Icons.volume_up_rounded) : Icons.volume_off_rounded,
                              size: widget.size * .5,
                              color: available ? (playing ? Colors.white : SignatureTheme.goldDeep) : SignatureTheme.muted,
                            ),
                          if (widget.label != null) ...[
                            const SizedBox(width: 6),
                            Text(widget.label!, style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w800, color: available ? SignatureTheme.goldDeep : SignatureTheme.muted)),
                          ],
                        ],
                      ),
                    ),
                  ),
                ),
              ),
            ),
          );
        },
      ),
    );
  }
}

/// Lecture d'un fichier stocké (réponse vocale, correction de l'enseignant).
class ClasseStoragePlayer extends StatelessWidget {
  const ClasseStoragePlayer({super.key, required this.id, required this.bucket, required this.path, required this.label, this.duration, this.audio, this.tint});

  final String id;
  final String bucket;
  final String path;
  final String label;
  final double? duration;
  final ClasseAudio? audio;
  final Color? tint;

  @override
  Widget build(BuildContext context) {
    final a = audio ?? ClasseAudio.instance;
    return ValueListenableBuilder<String?>(
      valueListenable: a.playing,
      builder: (context, playingId, _) => ValueListenableBuilder<String?>(
        valueListenable: a.loading,
        builder: (context, loadingId, _) {
          final playing = playingId == id;
          final loading = loadingId == id;
          return ActionChip(
            key: ValueKey('player-$id'),
            backgroundColor: tint ?? SignatureTheme.surfaceAlt,
            side: BorderSide(color: playing ? SignatureTheme.gold : SignatureTheme.hairline),
            avatar: loading
                ? const SizedBox.square(dimension: 16, child: CircularProgressIndicator(strokeWidth: 2))
                : Icon(playing ? Icons.stop_rounded : Icons.play_arrow_rounded, size: 20, color: SignatureTheme.goldDeep),
            label: Text(duration == null ? label : '$label · ${duration!.round()}s'),
            labelStyle: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: SignatureTheme.ink),
            onPressed: () async {
              final ok = await a.playStorage(id, bucket, path);
              if (!ok && context.mounted && a.error.value != null) {
                ScaffoldMessenger.of(context)
                  ..hideCurrentSnackBar()
                  ..showSnackBar(SnackBar(content: Text(a.error.value!)));
              }
            },
          );
        },
      ),
    );
  }
}

/// Résultat d'un enregistrement vocal.
class VoiceTake {
  const VoiceTake({required this.bytes, required this.seconds, required this.contentType});

  final Uint8List bytes;
  final double seconds;
  final String contentType;
}

/// Abstraction du micro (injectable en test).
abstract class ClasseRecorder {
  Future<void> start();
  Future<VoiceTake?> stop();
  Future<void> cancel();
  Future<void> dispose();
}

class DeviceRecorder implements ClasseRecorder {
  final FitilaMediaController _media = FitilaMediaController();
  final Stopwatch _clock = Stopwatch();

  @override
  Future<void> start() async {
    await _media.startAudio();
    _clock
      ..reset()
      ..start();
  }

  @override
  Future<VoiceTake?> stop() async {
    _clock.stop();
    final asset = await _media.stopAudio();
    if (asset == null) return null;
    final bytes = await asset.readBytes();
    if (bytes.isEmpty) return null;
    return VoiceTake(bytes: bytes, seconds: _clock.elapsedMilliseconds / 1000, contentType: asset.contentType);
  }

  @override
  Future<void> cancel() => _media.cancelAudio();

  @override
  Future<void> dispose() => _media.dispose();
}

/// Bloc « note de l'enseignant » : note /20, appréciation, commentaire, corrigés vocaux.
class ClasseGradePanel extends StatelessWidget {
  const ClasseGradePanel({super.key, required this.answer, this.audio});

  final StudentAnswer answer;
  final ClasseAudio? audio;

  @override
  Widget build(BuildContext context) {
    final grade = answer.teacherGrade;
    if (grade == null) return const SizedBox.shrink();
    final color = gradeColor(grade);
    final personal = answer.teacherAudioPersonalPath;
    final generic = answer.teacherAudioGenericPath;
    return Container(
      key: const ValueKey('grade-panel'),
      width: double.infinity,
      padding: const EdgeInsets.all(12),
      margin: const EdgeInsets.only(top: 10),
      decoration: BoxDecoration(color: color.withValues(alpha: .09), borderRadius: BorderRadius.circular(SignatureTheme.radiusSmall + 4), border: Border.all(color: color.withValues(alpha: .35))),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.workspace_premium_rounded, color: color, size: 20),
              const SizedBox(width: 6),
              Text('${_fmtGrade(grade)}/20', style: TextStyle(fontSize: 19, fontWeight: FontWeight.w900, color: color)),
              const SizedBox(width: 10),
              Text(appreciationFor(grade), style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w800, color: color)),
              const SizedBox(width: 8),
              const Expanded(child: Text('Note de l’enseignant', textAlign: TextAlign.right, maxLines: 1, overflow: TextOverflow.ellipsis, style: TextStyle(fontSize: 10.5, color: SignatureTheme.muted, fontWeight: FontWeight.w700))),
            ],
          ),
          if (answer.teacherComment?.trim().isNotEmpty ?? false) ...[
            const SizedBox(height: 8),
            Text(answer.teacherComment!, style: const TextStyle(fontSize: 13.5, height: 1.45, color: SignatureTheme.ink)),
          ],
          if (personal != null || generic != null) ...[
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              runSpacing: 4,
              children: [
                if (personal != null) ClasseStoragePlayer(id: 'tp-${answer.id}', bucket: 'classe-answers-audio', path: personal, label: 'Corrigé personnalisé', audio: audio),
                if (generic != null) ClasseStoragePlayer(id: 'tg-${answer.id}', bucket: 'classe-answers-audio', path: generic, label: 'Corrigé général', audio: audio),
              ],
            ),
          ],
        ],
      ),
    );
  }
}

String _fmtGrade(double g) => g == g.roundToDouble() ? g.toInt().toString() : g.toStringAsFixed(1);

/// Carte de réponse d'un apprenant : saisie avec clavier Bàátɔ̀nú intelligent, réponse vocale,
/// enregistrement en base, vérification par le corrigé, note et corrections de l'enseignant.
class ClasseAnswerCard extends StatefulWidget {
  const ClasseAnswerCard({
    super.key,
    required this.store,
    required this.level,
    required this.module,
    required this.lessonId,
    required this.sectionKey,
    required this.questionIdx,
    required this.question,
    this.label,
    this.audioKey,
    this.initial,
    this.answerKey,
    this.minLines = 2,
    this.maxLines = 6,
    this.voice = true,
    this.hint = 'Votre réponse…',
    this.accent,
    this.onSaved,
    this.audio,
    this.recorder,
    this.draft,
  });

  final ClasseStore store;
  final String level;
  final String module;
  final String lessonId;
  final String sectionKey;
  final int questionIdx;
  final String question;
  final String? label;
  final String? audioKey;
  final StudentAnswer? initial;
  final AnswerKey? answerKey;
  final int minLines;
  final int maxLines;
  final bool voice;
  final String hint;
  final Color? accent;
  final ValueChanged<StudentAnswer>? onSaved;
  final ClasseAudio? audio;
  final ClasseRecorder? recorder;

  /// Brouillon conservé par le parent pendant la navigation (onglets).
  final Map<String, String>? draft;

  @override
  State<ClasseAnswerCard> createState() => _ClasseAnswerCardState();
}

class _ClasseAnswerCardState extends State<ClasseAnswerCard> {
  late final TextEditingController _text;
  late final ClasseRecorder _recorder = widget.recorder ?? DeviceRecorder();
  late StudentAnswer? _saved = widget.initial;
  bool _editing = false;
  bool _saving = false;
  bool _recording = false;
  bool _uploading = false;
  bool _checked = false;
  Timer? _tick;
  int _elapsed = 0;

  String get _draftKey => '${widget.level}|${widget.module}|${widget.lessonId}|${widget.sectionKey}|${widget.questionIdx}';
  bool get _submitted => _saved?.hasContent ?? false;
  bool get _showEditor => !_submitted || _editing;
  Color get _accent => widget.accent ?? levelColor(widget.level);

  @override
  void initState() {
    super.initState();
    _text = TextEditingController(text: widget.draft?[_draftKey] ?? _saved?.text ?? '');
    _text.addListener(() => widget.draft?[_draftKey] = _text.text);
  }

  @override
  void didUpdateWidget(covariant ClasseAnswerCard old) {
    super.didUpdateWidget(old);
    if (old.initial != widget.initial && widget.initial != null && !_editing) {
      _saved = widget.initial;
      if (_text.text.isEmpty) _text.text = widget.initial!.text ?? '';
    }
  }

  @override
  void dispose() {
    _tick?.cancel();
    _text.dispose();
    if (widget.recorder == null) {
      _recorder.dispose();
    }
    super.dispose();
  }

  void _snack(String m) {
    if (mounted) {
      ScaffoldMessenger.of(context)
        ..hideCurrentSnackBar()
        ..showSnackBar(SnackBar(content: Text(m)));
    }
  }

  StudentAnswer _draftAnswer({String? audioPath, double? audioDuration}) => StudentAnswer(
    level: widget.level,
    module: widget.module,
    lessonId: widget.lessonId,
    sectionKey: widget.sectionKey,
    questionIdx: widget.questionIdx,
    text: _text.text.trim().isEmpty ? null : _text.text.trim(),
    audioPath: audioPath ?? _saved?.audioPath,
    audioDuration: audioDuration ?? _saved?.audioDuration,
  );

  Future<void> _submit() async {
    if (_text.text.trim().isEmpty && _saved?.audioPath == null) {
      _snack('Écrivez ou enregistrez une réponse avant de soumettre.');
      return;
    }
    if (widget.store.userId == null) {
      _snack('Connectez-vous pour enregistrer vos réponses.');
      return;
    }
    FocusScope.of(context).unfocus();
    setState(() => _saving = true);
    try {
      final saved = await widget.store.saveAnswer(_draftAnswer());
      if (!mounted) return;
      setState(() {
        _saved = saved;
        _editing = false;
        _checked = false;
      });
      widget.onSaved?.call(saved);
      HapticFeedback.mediumImpact();
      _snack('✓ Réponse enregistrée');
    } catch (e) {
      _snack('Enregistrement impossible : ${e.toString().replaceFirst('Bad state: ', '')}');
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _toggleRecording() async {
    if (_uploading) return;
    if (_recording) {
      _tick?.cancel();
      setState(() {
        _recording = false;
        _uploading = true;
      });
      try {
        final take = await _recorder.stop();
        if (take == null || take.seconds < 0.5) {
          _snack('Enregistrement trop court, réessayez.');
          return;
        }
        final path = await widget.store.uploadVoice(
          subpath: '${widget.level}/${widget.module}/${widget.lessonId}/${widget.sectionKey}/${widget.questionIdx}',
          bytes: take.bytes,
          contentType: take.contentType,
        );
        final saved = await widget.store.saveAnswer(_draftAnswer(audioPath: path, audioDuration: take.seconds));
        if (!mounted) return;
        setState(() {
          _saved = saved;
          _editing = false;
        });
        widget.onSaved?.call(saved);
        _snack('✓ Réponse vocale envoyée');
      } catch (e) {
        _snack('Envoi impossible : ${e.toString().replaceFirst('Bad state: ', '')}');
      } finally {
        if (mounted) setState(() => _uploading = false);
      }
      return;
    }
    if (widget.store.userId == null) {
      _snack('Connectez-vous pour envoyer un message vocal.');
      return;
    }
    try {
      await _recorder.start();
      setState(() {
        _recording = true;
        _elapsed = 0;
      });
      _tick = Timer.periodic(const Duration(seconds: 1), (_) => mounted ? setState(() => _elapsed++) : null);
    } catch (e) {
      _snack('Micro indisponible : ${e.toString().replaceFirst('Bad state: ', '')}');
    }
  }

  @override
  Widget build(BuildContext context) {
    final key = widget.answerKey;
    final answer = _saved;
    final correct = key != null && _checked ? matchAnswer(_text.text.isEmpty ? (answer?.text ?? '') : _text.text, key.accepted) : null;
    return Semantics(
      container: true,
      label: 'Question ${widget.label ?? widget.questionIdx + 1}',
      child: ClasseBox(
        margin: const EdgeInsets.only(bottom: 12),
        borderColor: answer?.graded == true ? gradeColor(answer!.teacherGrade!).withValues(alpha: .5) : null,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 3),
                  decoration: BoxDecoration(color: _accent.withValues(alpha: .12), borderRadius: BorderRadius.circular(99)),
                  child: Text(widget.label ?? 'Q${widget.questionIdx + 1}', style: TextStyle(color: _accent, fontSize: 11, fontWeight: FontWeight.w900)),
                ),
                const SizedBox(width: 8),
                if (_submitted)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(color: SignatureTheme.sageTint, borderRadius: BorderRadius.circular(99)),
                    child: Text(answer?.graded == true ? 'Corrigée' : 'Envoyée', style: const TextStyle(color: SignatureTheme.sage, fontSize: 10.5, fontWeight: FontWeight.w800)),
                  ),
                const Spacer(),
                if (widget.audioKey != null) ClasseListenButton(contentKey: widget.audioKey!, audio: widget.audio, size: 34),
              ],
            ),
            const SizedBox(height: 8),
            Text(widget.question, style: const TextStyle(fontSize: 14.5, height: 1.45, fontWeight: FontWeight.w600, color: SignatureTheme.ink)),
            const SizedBox(height: 10),
            if (_showEditor) ...[
              BaribaTextField(
                controller: _text,
                minLines: widget.minLines,
                maxLines: widget.maxLines,
                decoration: InputDecoration(
                  hintText: widget.hint,
                  filled: true,
                  fillColor: SignatureTheme.appBackground,
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(SignatureTheme.radiusSmall + 2), borderSide: const BorderSide(color: SignatureTheme.hairline)),
                ),
              ),
              const SizedBox(height: 10),
              Wrap(
                alignment: WrapAlignment.spaceBetween,
                crossAxisAlignment: WrapCrossAlignment.center,
                spacing: 8,
                runSpacing: 6,
                children: [
                  if (widget.voice)
                    OutlinedButton.icon(
                      key: const ValueKey('answer-voice'),
                      onPressed: _uploading ? null : _toggleRecording,
                      icon: _uploading
                          ? const SizedBox.square(dimension: 16, child: CircularProgressIndicator(strokeWidth: 2))
                          : Icon(_recording ? Icons.stop_circle_rounded : Icons.mic_rounded, color: _recording ? SignatureTheme.clay : null),
                      label: Text(_recording ? 'Arrêter · ${_elapsed ~/ 60}:${(_elapsed % 60).toString().padLeft(2, '0')}' : _uploading ? 'Envoi…' : 'Vocal'),
                      style: _recording ? OutlinedButton.styleFrom(foregroundColor: SignatureTheme.clay, side: const BorderSide(color: SignatureTheme.clay)) : null,
                    ),
                  if (_submitted)
                    TextButton(onPressed: () => setState(() { _editing = false; _text.text = _saved?.text ?? ''; }), child: const Text('Annuler')),
                  FilledButton.icon(
                    key: const ValueKey('answer-submit'),
                    onPressed: _saving || _recording || _uploading ? null : _submit,
                    icon: _saving ? const SizedBox.square(dimension: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)) : const Icon(Icons.check_rounded),
                    label: Text(_submitted ? 'Mettre à jour' : 'Soumettre'),
                    style: FilledButton.styleFrom(backgroundColor: SignatureTheme.gold, foregroundColor: const Color(0xFF2B2110)),
                  ),
                ],
              ),
            ] else ...[
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(color: SignatureTheme.appBackground, borderRadius: BorderRadius.circular(SignatureTheme.radiusSmall + 2), border: Border.all(color: SignatureTheme.hairline)),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    if (answer?.text?.isNotEmpty ?? false) Text(answer!.text!, key: const ValueKey('answer-text'), style: const TextStyle(fontSize: 15, height: 1.5)),
                    if (answer?.audioPath != null) ...[
                      if (answer?.text?.isNotEmpty ?? false) const SizedBox(height: 8),
                      ClasseStoragePlayer(id: 'sa-${answer!.id ?? _draftKey}', bucket: 'classe-answers-audio', path: answer.audioPath!, label: 'Ma réponse vocale', duration: answer.audioDuration, audio: widget.audio),
                    ],
                  ],
                ),
              ),
              const SizedBox(height: 8),
              Wrap(
                spacing: 8,
                runSpacing: 4,
                children: [
                  OutlinedButton.icon(key: const ValueKey('answer-edit'), onPressed: () => setState(() => _editing = true), icon: const Icon(Icons.edit_rounded, size: 18), label: const Text('Modifier')),
                  if (key != null && key.accepted.isNotEmpty)
                    FilledButton.tonalIcon(key: const ValueKey('answer-check'), onPressed: () => setState(() => _checked = !_checked), icon: const Icon(Icons.fact_check_rounded, size: 18), label: Text(_checked ? 'Masquer le corrigé' : 'Vérifier ma réponse')),
                ],
              ),
            ],
            if (correct != null && key != null) _keyPanel(key, correct),
            if (answer != null) ClasseGradePanel(answer: answer, audio: widget.audio),
          ],
        ),
      ),
    );
  }

  Widget _keyPanel(AnswerKey key, bool correct) {
    final color = correct ? SignatureTheme.sage : SignatureTheme.clay;
    return Container(
      key: const ValueKey('answer-key-panel'),
      width: double.infinity,
      margin: const EdgeInsets.only(top: 10),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(color: color.withValues(alpha: .09), borderRadius: BorderRadius.circular(SignatureTheme.radiusSmall + 4), border: Border.all(color: color.withValues(alpha: .35))),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(children: [
            Icon(correct ? Icons.check_circle_rounded : Icons.cancel_rounded, color: color, size: 20),
            const SizedBox(width: 6),
            Text(correct ? 'Bonne réponse !' : 'Pas tout à fait', style: TextStyle(color: color, fontWeight: FontWeight.w900)),
          ]),
          const SizedBox(height: 6),
          Text('Réponses acceptées : ${key.accepted.join(' · ')}', style: const TextStyle(fontSize: 13, height: 1.4)),
          if (key.explanation?.trim().isNotEmpty ?? false) ...[
            const SizedBox(height: 4),
            Text(key.explanation!, style: const TextStyle(fontSize: 12.5, color: SignatureTheme.inkSoft, height: 1.4)),
          ],
          if (key.audioPath != null) ...[
            const SizedBox(height: 6),
            ClasseStoragePlayer(id: 'ka-${widget.lessonId}-${widget.sectionKey}-${widget.questionIdx}', bucket: 'classe-answers-audio', path: key.audioPath!, label: 'Corrigé vocal', audio: widget.audio),
          ],
        ],
      ),
    );
  }
}
