import 'dart:async';
import 'dart:math' as math;

import 'package:audioplayers/audioplayers.dart' as audio;
import 'package:flutter/material.dart';

import '../core/fitila_media.dart';
import 'handunia_consultation_routes.dart';
import 'handunia_consultation_ui.dart';
import 'handunia_creation_ai_data.dart';

class HanduniaAiCreationRoute extends StatefulWidget {
  const HanduniaAiCreationRoute({
    super.key,
    required this.lieu,
    this.voiceCount = 0,
    this.onSaved,
  });

  final Map<String, dynamic> lieu;
  final int voiceCount;
  final Future<void> Function()? onSaved;

  @override
  State<HanduniaAiCreationRoute> createState() =>
      _HanduniaAiCreationRouteState();
}

class _HanduniaAiCreationRouteState extends State<HanduniaAiCreationRoute> {
  final FitilaMediaController _media = FitilaMediaController();
  final audio.AudioPlayer _proofPlayer = audio.AudioPlayer();
  final TextEditingController _transcriptController = TextEditingController();

  int _stage = 0;
  String _languageCode = 'ba';
  String? _sessionId;
  String _question = '';
  String _questionReason = '';
  bool _loadingQuestion = false;
  bool _recording = false;
  bool _processing = false;
  bool _saving = false;
  bool _savedOffline = false;
  String? _notice;
  FitilaMediaAsset? _asset;
  int _durationMs = 0;
  DateTime? _recordingStartedAt;
  Timer? _recordingTimer;
  Map<String, dynamic> _analysis = <String, dynamic>{};
  Map<String, dynamic> _comparison = <String, dynamic>{
    'relation': 'new',
    'target_fragment_id': null,
    'confidence': 0.0,
    'reason': 'Aucune autre voix comparable pour le moment.',
  };
  String _selectedScope = 'community';
  Map<String, dynamic>? _savedFragment;
  List<Map<String, dynamic>> _gaps = const <Map<String, dynamic>>[];

  String get _lieuId => widget.lieu['id']?.toString() ?? '';
  String get _lieuName =>
      widget.lieu['name']?.toString().trim().isNotEmpty == true
      ? widget.lieu['name'].toString()
      : 'Ce lieu';

  int get _flowStep => switch (_stage) {
    0 => 0,
    1 || 2 => 1,
    3 || 4 || 5 => 2,
    6 => 3,
    7 || 8 => 4,
    _ => 0,
  };

  String get _flowLabel => switch (_flowStep) {
    0 => 'Commencer',
    1 => 'Répondre',
    2 => 'Vérifier',
    3 => 'Partager',
    _ => 'Terminé',
  };

  ThemeData _readableTheme(BuildContext context) {
    final base = Theme.of(context);
    final scheme = ColorScheme.fromSeed(
      seedColor: HanduniaTokens.braise,
      brightness: Brightness.dark,
      surface: HanduniaTokens.nuitPortee,
    ).copyWith(
      primary: HanduniaTokens.braise,
      onPrimary: HanduniaTokens.encre,
      surface: HanduniaTokens.nuitPortee,
      onSurface: HanduniaTokens.ivoire,
      outline: HanduniaTokens.bordureForte,
      error: HanduniaTokens.terre,
    );
    return base.copyWith(
      colorScheme: scheme,
      scaffoldBackgroundColor: HanduniaTokens.nuit,
      textTheme: base.textTheme.apply(
        fontFamily: 'Karla',
        bodyColor: HanduniaTokens.ivoire,
        displayColor: HanduniaTokens.ivoire,
      ),
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          foregroundColor: HanduniaTokens.ivoire,
          textStyle: const TextStyle(
            fontFamily: 'Karla',
            fontSize: 15,
            fontWeight: FontWeight.w700,
          ),
          minimumSize: const Size(44, 44),
        ),
      ),
    );
  }

  @override
  void initState() {
    super.initState();
    unawaited(_syncPending());
  }

  @override
  void dispose() {
    _recordingTimer?.cancel();
    unawaited(_media.dispose());
    unawaited(_proofPlayer.dispose());
    _transcriptController.dispose();
    super.dispose();
  }

  Future<void> _syncPending() async {
    try {
      final count = await HanduniaAiCreationData.syncPending();
      if (!mounted || count == 0) {
        return;
      }
      setState(() => _notice =
          count == 1
              ? '1 mémoire locale synchronisée.'
              : '$count mémoires locales synchronisées.');
      if (widget.onSaved != null) {
        await widget.onSaved!();
      }
    } catch (_) {
      // Best effort uniquement.
    }
  }

  Future<void> _enterAi() async {
    setState(() {
      _stage = 1;
      _loadingQuestion = true;
      _notice = null;
    });
    try {
      _sessionId = await HanduniaAiCreationData.startSession(
        lieuId: _lieuId,
        languageCode: _languageCode,
      );
      final result = await HanduniaAiCreationData.askQuestion(
        lieuId: _lieuId,
        lieuName: _lieuName,
      );
      final rawGaps = result['gaps'];
      if (!mounted) {
        return;
      }
      setState(() {
        _question =
            result['question']?.toString().trim().isNotEmpty == true
            ? result['question'].toString()
            : 'Quel souvenir souhaitez-vous transmettre de $_lieuName ?';
        _questionReason = result['reason']?.toString() ?? '';
        _gaps = rawGaps is List
            ? rawGaps
                  .whereType<Map>()
                  .map((item) => Map<String, dynamic>.from(item))
                  .toList(growable: false)
            : const <Map<String, dynamic>>[];
      });
    } catch (_) {
      if (!mounted) {
        return;
      }
      setState(() {
        _question = 'Quel souvenir souhaitez-vous transmettre de $_lieuName ?';
        _questionReason = 'Lumière IA indisponible · création toujours possible';
        _notice = 'Lumière IA indisponible. La voix reste enregistrable.';
      });
    } finally {
      if (mounted) {
        setState(() => _loadingQuestion = false);
      }
    }
  }

  Future<void> _anotherQuestion() async {
    if (_loadingQuestion) {
      return;
    }
    setState(() => _loadingQuestion = true);
    try {
      final result = await HanduniaAiCreationData.askQuestion(
        lieuId: _lieuId,
        lieuName: _lieuName,
      );
      if (!mounted) {
        return;
      }
      setState(() {
        _question =
            result['question']?.toString() ?? _question;
        _questionReason =
            result['reason']?.toString() ?? _questionReason;
      });
    } catch (_) {
      if (mounted) {
        setState(() => _notice = 'Question IA indisponible.');
      }
    } finally {
      if (mounted) {
        setState(() => _loadingQuestion = false);
      }
    }
  }

  Future<void> _startRecording() async {
    if (_recording || _processing) {
      return;
    }
    setState(() {
      _stage = 2;
      _notice = null;
    });
    try {
      await _media.startHanduniaOpusAudio();
      _recordingStartedAt = DateTime.now();
      _recordingTimer?.cancel();
      _recordingTimer = Timer.periodic(const Duration(milliseconds: 250), (_) {
        if (!mounted || !_recording || _recordingStartedAt == null) {
          return;
        }
        setState(() {
          _durationMs = DateTime.now()
              .difference(_recordingStartedAt!)
              .inMilliseconds;
        });
      });
      if (mounted) {
        setState(() => _recording = true);
      }
    } catch (error) {
      if (mounted) {
        setState(() {
          _recording = false;
          _notice = error.toString().replaceFirst('Bad state: ', '');
        });
      }
    }
  }

  Future<void> _stopRecording() async {
    if (!_recording || _processing) {
      return;
    }
    setState(() {
      _recording = false;
      _processing = true;
    });
    _recordingTimer?.cancel();
    final started = _recordingStartedAt;
    if (started != null) {
      _durationMs = math.max(
        _durationMs,
        DateTime.now().difference(started).inMilliseconds,
      );
    }
    try {
      final asset = await _media.stopAudio();
      if (asset == null) {
        throw StateError('Aucune voix enregistrée.');
      }
      _asset = asset;
      String transcript = '';
      try {
        transcript = await HanduniaAiCreationData.transcribe(asset);
      } catch (_) {
        _notice =
            'Transcription indisponible. La voix originale reste conservée.';
      }
      _transcriptController.text = transcript;
      if (transcript.isNotEmpty) {
        try {
          _analysis = await HanduniaAiCreationData.analyze(
            transcript: transcript,
            lieuName: _lieuName,
            languageCode: _languageCode,
            durationMs: _durationMs,
          );
          _selectedScope =
              _analysis['suggested_scope']?.toString() ?? 'community';
        } catch (_) {
          _analysis = <String, dynamic>{};
          _notice =
              'Analyse IA indisponible. Vérifiez le texte puis continuez.';
        }
        try {
          _comparison = await HanduniaAiCreationData.compare(
            transcript: transcript,
            lieuId: _lieuId,
          );
        } catch (_) {
          _comparison = <String, dynamic>{
            'relation': 'new',
            'target_fragment_id': null,
            'confidence': 0.0,
            'reason': 'Comparaison momentanément indisponible.',
          };
        }
      }
      if (mounted) {
        setState(() => _stage = 3);
      }
    } catch (error) {
      if (mounted) {
        setState(() {
          _notice = error.toString().replaceFirst('Bad state: ', '');
          _stage = 1;
        });
      }
    } finally {
      if (mounted) {
        setState(() => _processing = false);
      }
    }
  }

  Future<void> _cancelRecording() async {
    _recordingTimer?.cancel();
    await _media.cancelAudio();
    if (!mounted) {
      return;
    }
    setState(() {
      _recording = false;
      _durationMs = 0;
      _stage = 1;
    });
  }

  Future<void> _reanalyzeIfNeeded() async {
    final transcript = _transcriptController.text.trim();
    if (transcript.isEmpty) {
      return;
    }
    setState(() => _processing = true);
    try {
      _analysis = await HanduniaAiCreationData.analyze(
        transcript: transcript,
        lieuName: _lieuName,
        languageCode: _languageCode,
        durationMs: _durationMs,
      );
      _comparison = await HanduniaAiCreationData.compare(
        transcript: transcript,
        lieuId: _lieuId,
      );
      _selectedScope =
          _analysis['suggested_scope']?.toString() ?? _selectedScope;
    } catch (_) {
      if (mounted) {
        setState(() => _notice =
            'Lumière IA indisponible. La validation humaine continue.');
      }
    } finally {
      if (mounted) {
        setState(() => _processing = false);
      }
    }
  }

  void _toggleEntityValidation(int index) {
    final raw = _analysis['entities'];
    if (raw is! List || index < 0 || index >= raw.length) {
      return;
    }
    final entities = raw
        .whereType<Map>()
        .map((item) => Map<String, dynamic>.from(item))
        .toList(growable: true);
    if (index >= entities.length) {
      return;
    }
    entities[index]['validated'] = entities[index]['validated'] != true;
    setState(() => _analysis = <String, dynamic>{
          ..._analysis,
          'entities': entities,
        });
  }

  Future<void> _editEntity(int index) async {
    final raw = _analysis['entities'];
    if (raw is! List) {
      return;
    }
    final entities = raw
        .whereType<Map>()
        .map((item) => Map<String, dynamic>.from(item))
        .toList(growable: true);
    if (index < 0 || index >= entities.length) {
      return;
    }
    final controller = TextEditingController(
      text: entities[index]['corrected_value']?.toString().trim().isNotEmpty ==
              true
          ? entities[index]['corrected_value'].toString()
          : entities[index]['value']?.toString() ?? '',
    );
    final value = await showDialog<String>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        backgroundColor: HanduniaTokens.nuitPortee,
        title: Text('Corriger', style: _fraunces(size: 20)),
        content: TextField(
          controller: controller,
          autofocus: true,
          style: _karla(),
          decoration: _inputDecoration('Valeur entendue'),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext),
            child: const Text('Annuler'),
          ),
          TextButton(
            onPressed: () =>
                Navigator.pop(dialogContext, controller.text.trim()),
            child: const Text('Valider'),
          ),
        ],
      ),
    );
    controller.dispose();
    if (!mounted || value == null || value.isEmpty) {
      return;
    }
    entities[index]['corrected_value'] = value;
    entities[index]['validated'] = true;
    setState(() => _analysis = <String, dynamic>{
          ..._analysis,
          'entities': entities,
        });
  }

  Future<void> _playEvidence(Map<String, dynamic> item) async {
    final asset = _asset;
    if (asset == null) {
      return;
    }
    final startMs = (item['start_ms'] as num?)?.toInt() ?? 0;
    try {
      await _proofPlayer.stop();
      await _proofPlayer.play(audio.DeviceFileSource(asset.path));
      if (startMs > 0) {
        await _proofPlayer.seek(Duration(milliseconds: startMs));
      }
    } catch (_) {
      if (mounted) {
        setState(() => _notice = 'Lecture du passage indisponible.');
      }
    }
  }

  Future<void> _seal() async {
    final asset = _asset;
    if (asset == null || _saving) {
      return;
    }
    final transcript = _transcriptController.text.trim();
    final safeTranscript =
        transcript.isEmpty ? 'Voix non transcrite.' : transcript;
    setState(() {
      _saving = true;
      _notice = null;
    });
    try {
      final fragment = await HanduniaAiCreationData.seal(
        lieu: widget.lieu,
        asset: asset,
        durationMs: _durationMs,
        transcript: safeTranscript,
        languageCode: _languageCode,
        selectedScope: _selectedScope,
        analysis: _analysis,
        comparison: _comparison,
        sessionId: _sessionId,
      );
      if (!mounted) {
        return;
      }
      setState(() {
        _savedFragment = fragment;
        _savedOffline = false;
        _stage = 7;
      });
      if (widget.onSaved != null) {
        await widget.onSaved!();
      }
    } catch (_) {
      try {
        await HanduniaAiCreationData.queuePending(
          lieu: widget.lieu,
          asset: asset,
          durationMs: _durationMs,
          transcript: safeTranscript,
          languageCode: _languageCode,
          selectedScope: _selectedScope,
          analysis: _analysis,
          comparison: _comparison,
        );
        if (!mounted) {
          return;
        }
        setState(() {
          _savedOffline = true;
          _stage = 7;
          _notice =
              'Scellé localement · synchronisation au retour du réseau.';
        });
      } catch (_) {
        if (mounted) {
          setState(() => _notice =
              'Impossible de conserver cette voix sur cet appareil.');
        }
      }
    } finally {
      if (mounted) {
        setState(() => _saving = false);
      }
    }
  }

  Future<void> _loadGaps() async {
    setState(() {
      _stage = 8;
      _processing = true;
    });
    try {
      final result = await HanduniaAiCreationData.fetchGaps(
        lieuId: _lieuId,
        lieuName: _lieuName,
      );
      final raw = result['gaps'];
      if (!mounted) {
        return;
      }
      setState(() {
        _gaps = raw is List
            ? raw
                  .whereType<Map>()
                  .map((item) => Map<String, dynamic>.from(item))
                  .toList(growable: false)
            : const <Map<String, dynamic>>[];
      });
    } catch (_) {
      if (mounted) {
        setState(() => _notice = 'Lacunes indisponibles hors ligne.');
      }
    } finally {
      if (mounted) {
        setState(() => _processing = false);
      }
    }
  }

  void _back() {
    if (_stage == 0) {
      Navigator.of(context).maybePop();
      return;
    }
    if (_stage == 2 && _recording) {
      unawaited(_cancelRecording());
      return;
    }
    final previous = switch (_stage) {
      1 => 0,
      2 => 1,
      3 => 2,
      4 => 3,
      5 => 4,
      6 => 3,
      7 => 6,
      8 => 7,
      _ => 0,
    };
    setState(() => _stage = previous);
  }

  @override
  Widget build(BuildContext context) {
    return Theme(
      data: _readableTheme(context),
      child: Scaffold(
        backgroundColor: HanduniaTokens.nuit,
        body: SafeArea(
          child: Column(
            children: [
              _header(),
              if (_notice != null)
                Container(
                  width: double.infinity,
                  margin: const EdgeInsets.fromLTRB(18, 0, 18, 10),
                  padding: const EdgeInsets.symmetric(
                    horizontal: 14,
                    vertical: 11,
                  ),
                  decoration: BoxDecoration(
                    color: HanduniaTokens.terre.withValues(alpha: .12),
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(
                      color: HanduniaTokens.terre.withValues(alpha: .55),
                    ),
                  ),
                  child: Text(
                    _notice!,
                    textAlign: TextAlign.center,
                    style: _karla(
                      size: 13,
                      color: HanduniaTokens.ivoire,
                      weight: FontWeight.w600,
                    ),
                  ),
                ),
              Expanded(
                child: AnimatedSwitcher(
                  duration: const Duration(milliseconds: 180),
                  child: KeyedSubtree(
                    key: ValueKey<int>(_stage),
                    child: switch (_stage) {
                      0 => _thresholdStage(),
                      1 => _questionStage(),
                      2 => _recordStage(),
                      3 => _understandingStage(),
                      4 => _graphStage(),
                      5 => _comparisonStage(),
                      6 => _scopeStage(),
                      7 => _sealedStage(),
                      8 => _gapsStage(),
                      _ => _thresholdStage(),
                    },
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _header() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(10, 8, 16, 8),
      child: Row(
        children: [
          SizedBox(
            width: 44,
            height: 44,
            child: IconButton(
              tooltip: 'Retour',
              onPressed: _back,
              icon: const Icon(Icons.arrow_back_outlined),
              color: HanduniaTokens.ivoire,
            ),
          ),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  _stage == 0 ? 'Handunia Wasa' : 'Lumière IA',
                  style: _fraunces(size: 24),
                ),
                const SizedBox(height: 2),
                Text(
                  _flowLabel,
                  style: _karla(
                    size: 12.5,
                    color: HanduniaTokens.cendre,
                    weight: FontWeight.w700,
                  ),
                ),
              ],
            ),
          ),
          SizedBox(
            width: 86,
            child: Row(
              children: List.generate(5, (index) {
                final active = index <= _flowStep;
                return Expanded(
                  child: Container(
                    height: 4,
                    margin: EdgeInsets.only(left: index == 0 ? 0 : 4),
                    decoration: BoxDecoration(
                      color: active
                          ? HanduniaTokens.braise
                          : HanduniaTokens.bordure,
                      borderRadius: BorderRadius.circular(999),
                    ),
                  ),
                );
              }),
            ),
          ),
        ],
      ),
    );
  }

  Widget _thresholdStage() {
    final density =
        (widget.voiceCount / 20).clamp(0.0, 1.0).toDouble();
    return ListView(
      padding: const EdgeInsets.fromLTRB(22, 36, 22, 28),
      children: [
        Center(
          child: HaloDensite(
            valeur: density,
            size: 154,
          ),
        ),
        const SizedBox(height: 22),
        Text(
          _lieuName,
          textAlign: TextAlign.center,
          style: _karla(
            size: 12,
            color: HanduniaTokens.braise,
            weight: FontWeight.w700,
          ),
        ),
        const SizedBox(height: 10),
        Text(
          'Une voix peut encore\néclairer ce lieu.',
          textAlign: TextAlign.center,
          style: _fraunces(size: 30, height: 1.15),
        ),
        const SizedBox(height: 12),
        Text(
          '${widget.voiceCount} voix',
          textAlign: TextAlign.center,
          style: _karla(color: HanduniaTokens.cendre),
        ),
        const SizedBox(height: 34),
        _primaryButton(
          label: 'COMMENCER AVEC LUMIÈRE IA',
          icon: Icons.light_mode_outlined,
          onPressed: _enterAi,
        ),
        const SizedBox(height: 10),
        _outlineButton(
          label: 'Enregistrer directement',
          icon: Icons.mic_none_outlined,
          onPressed: _startRecording,
        ),
        const SizedBox(height: 24),
        Text(
          'L’IA éclaire la mémoire. Elle ne l’invente pas.',
          textAlign: TextAlign.center,
          style: _karla(size: 13, color: HanduniaTokens.cendre),
        ),
      ],
    );
  }

  Widget _questionStage() {
    return ListView(
      padding: const EdgeInsets.fromLTRB(22, 28, 22, 28),
      children: [
        Center(
          child: Stack(
            alignment: Alignment.center,
            children: [
              HaloDensite(
                valeur: widget.voiceCount == 0
                    ? 0
                    : (widget.voiceCount / 20).clamp(0.0, 1.0).toDouble(),
                size: 164,
                loading: _loadingQuestion,
              ),
              Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    _lieuName,
                    style: _karla(
                      size: 12,
                      color: HanduniaTokens.braise,
                      weight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    '${widget.voiceCount} voix',
                    style: _fraunces(size: 22),
                  ),
                ],
              ),
            ],
          ),
        ),
        const SizedBox(height: 30),
        Text(
          _loadingQuestion ? 'La mémoire se lit…' : _question,
          textAlign: TextAlign.center,
          style: _fraunces(size: 26, height: 1.25),
        ),
        if (_questionReason.isNotEmpty) ...[
          const SizedBox(height: 12),
          Text(
            _questionReason,
            textAlign: TextAlign.center,
            style: _karla(size: 13, color: HanduniaTokens.cendre),
          ),
        ],
        const SizedBox(height: 30),
        _primaryButton(
          label: 'RÉPONDRE PAR LA VOIX',
          icon: Icons.mic_none_outlined,
          onPressed: _loadingQuestion ? null : _startRecording,
        ),
        const SizedBox(height: 8),
        TextButton(
          onPressed: _loadingQuestion ? null : _anotherQuestion,
          child: Text('Changer de question', style: _karla(weight: FontWeight.w700)),
        ),
      ],
    );
  }

  Widget _recordStage() {
    final seconds = (_durationMs / 1000).floor();
    final minutesText = (seconds ~/ 60).toString().padLeft(2, '0');
    final secondsText = (seconds % 60).toString().padLeft(2, '0');
    return ListView(
      padding: const EdgeInsets.fromLTRB(22, 42, 22, 28),
      children: [
        Text(
          _recording ? 'Je vous écoute' : 'Prêt à enregistrer',
          textAlign: TextAlign.center,
          style: _karla(
            size: 12,
            color: _recording
                ? HanduniaTokens.ivoire
                : HanduniaTokens.cendre,
            weight: FontWeight.w700,
          ),
        ),
        const SizedBox(height: 20),
        Center(
          child: HaloDensite(
            valeur: _recording ? .72 : .35,
            size: 176,
            loading: _processing,
          ),
        ),
        const SizedBox(height: 22),
        Text(
          '$minutesText:$secondsText',
          textAlign: TextAlign.center,
          style: _fraunces(size: 31),
        ),
        const SizedBox(height: 22),
        Center(
          child: SegmentedButton<String>(
            segments: const [
              ButtonSegment<String>(value: 'ba', label: Text('Bàátɔ̀nú')),
              ButtonSegment<String>(value: 'fr', label: Text('Français')),
            ],
            selected: <String>{_languageCode},
            onSelectionChanged: _recording
                ? null
                : (value) =>
                    setState(() => _languageCode = value.first),
            style: ButtonStyle(
              foregroundColor:
                  WidgetStateProperty.all(HanduniaTokens.ivoire),
              backgroundColor:
                  WidgetStateProperty.resolveWith((states) {
                return states.contains(WidgetState.selected)
                    ? HanduniaTokens.bordureForte
                    : HanduniaTokens.nuitPortee;
              }),
            ),
          ),
        ),
        const SizedBox(height: 28),
        if (_recording)
          _primaryButton(
            label: 'TERMINER L’ENREGISTREMENT',
            icon: Icons.stop_circle_outlined,
            onPressed: _stopRecording,
          )
        else
          _primaryButton(
            label: 'COMMENCER L’ENREGISTREMENT',
            icon: Icons.mic_none_outlined,
            onPressed: _startRecording,
          ),
        if (_recording) ...[
          const SizedBox(height: 8),
          TextButton(
            onPressed: _cancelRecording,
            child: Text(
              'Annuler',
              style: _karla(color: HanduniaTokens.cendre),
            ),
          ),
        ],
        const SizedBox(height: 22),
        Text(
          'Original intact · Opus 16 kbps',
          textAlign: TextAlign.center,
          style: _karla(size: 12.5, color: HanduniaTokens.cendre),
        ),
      ],
    );
  }

  Widget _understandingStage() {
    final entities = _entities;
    return ListView(
      padding: const EdgeInsets.fromLTRB(18, 18, 18, 30),
      children: [
        Text(
          'Voici ce que\nj’ai entendu.',
          style: _fraunces(size: 29),
        ),
        const SizedBox(height: 6),
        Text(
          'Vérifiez avant de continuer.',
          style: _karla(color: HanduniaTokens.cendre),
        ),
        const SizedBox(height: 18),
        if (_processing)
          const Center(
            child: HaloDensite(valeur: .5, loading: true, size: 76),
          ),
        Text(
          'Votre transcription',
          style: _karla(
            size: 13,
            color: HanduniaTokens.braise,
            weight: FontWeight.w700,
          ),
        ),
        const SizedBox(height: 8),
        TextField(
          controller: _transcriptController,
          maxLines: 7,
          minLines: 4,
          style: _karla(size: 15.5, height: 1.5),
          decoration: _inputDecoration(
            'Écoutez, relisez et corrigez si nécessaire',
          ),
        ),
        const SizedBox(height: 8),
        Text(
          'La voix originale reste la référence.',
          style: _karla(size: 12.5, color: HanduniaTokens.cendre),
        ),
        const SizedBox(height: 16),
        if (entities.isEmpty)
          _stateCard(
            title: 'Voix originale conservée',
            subtitle: _transcriptController.text.trim().isEmpty
                ? 'Transcription indisponible'
                : 'Aucune donnée certaine à confirmer',
            color: HanduniaTokens.cendre,
          )
        else
          Theme(
            data: Theme.of(context).copyWith(
              dividerColor: Colors.transparent,
            ),
            child: ExpansionTile(
              initiallyExpanded: entities.length <= 3,
              tilePadding: const EdgeInsets.symmetric(horizontal: 4),
              childrenPadding: EdgeInsets.zero,
              iconColor: HanduniaTokens.braise,
              collapsedIconColor: HanduniaTokens.cendre,
              title: Text(
                'Données détectées · ${entities.length}',
                style: _karla(size: 15, weight: FontWeight.w700),
              ),
              subtitle: Text(
                'Touchez pour vérifier ou corriger',
                style: _karla(size: 12.5, color: HanduniaTokens.cendre),
              ),
              children: [
                for (var i = 0; i < entities.length; i++) ...[
                  _entityCard(entities[i], i),
                  const SizedBox(height: 9),
                ],
              ],
            ),
          ),
        const SizedBox(height: 20),
        _primaryButton(
          label: _processing ? 'ANALYSE…' : 'CONTINUER',
          icon: Icons.arrow_forward_outlined,
          onPressed: _processing
              ? null
              : () async {
                  await _reanalyzeIfNeeded();
                  if (mounted) {
                    setState(() => _stage = 6);
                  }
                },
        ),
        const SizedBox(height: 8),
        TextButton.icon(
          onPressed: _processing ? null : () => setState(() => _stage = 4),
          icon: const Icon(Icons.account_tree_outlined, size: 19),
          label: const Text('Voir les liens détectés'),
        ),
      ],
    );
  }

  Widget _entityCard(Map<String, dynamic> item, int index) {
    final validated = item['validated'] == true;
    final value =
        item['corrected_value']?.toString().trim().isNotEmpty == true
        ? item['corrected_value'].toString()
        : item['value']?.toString() ?? '';
    final type = _entityLabel(item['type']?.toString() ?? '');
    final startMs = (item['start_ms'] as num?)?.toInt();
    final endMs = (item['end_ms'] as num?)?.toInt();
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: HanduniaTokens.nuitPortee,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: validated
              ? HanduniaTokens.braise.withValues(alpha: .72)
              : HanduniaTokens.terre.withValues(alpha: .55),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            type.toUpperCase(),
            style: _karla(
              size: 12,
              color: validated
                  ? HanduniaTokens.braise
                  : HanduniaTokens.terre,
              weight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 5),
          Text(value, style: _fraunces(size: 19)),
          if (startMs != null) ...[
            const SizedBox(height: 6),
            TextButton.icon(
              onPressed: () => _playEvidence(item),
              icon: const Icon(Icons.play_circle_outline, size: 18),
              label: Text(
                item['audio_range_estimated'] == true
                    ? endMs == null
                          ? '≈ ${_timeLabel(startMs)} · écouter'
                          : '≈ ${_timeLabel(startMs)}–${_timeLabel(endMs)} · écouter'
                    : endMs == null
                    ? '${_timeLabel(startMs)} · écouter'
                    : '${_timeLabel(startMs)}–${_timeLabel(endMs)} · écouter',
              ),
              style: TextButton.styleFrom(
                padding: EdgeInsets.zero,
                foregroundColor: HanduniaTokens.cendre,
              ),
            ),
          ],
          Row(
            children: [
              TextButton(
                onPressed: () => _toggleEntityValidation(index),
                child: Text(validated ? 'Confirmé' : 'Confirmer'),
              ),
              const SizedBox(width: 8),
              TextButton(
                onPressed: () => _editEntity(index),
                child: const Text('Corriger'),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _graphStage() {
    final nodes = _entities
        .where((item) => item['validated'] == true)
        .take(6)
        .toList(growable: false);
    return ListView(
      padding: const EdgeInsets.fromLTRB(18, 20, 18, 28),
      children: [
        Text('Votre voix rejoint\nla mémoire.', style: _fraunces(size: 29)),
        const SizedBox(height: 10),
        Text(
          nodes.isEmpty
              ? 'Aucun lien n’est affirmé sans validation.'
              : '${nodes.length} liens validés',
          style: _karla(color: HanduniaTokens.cendre),
        ),
        const SizedBox(height: 22),
        SizedBox(
          height: 360,
          child: _MemoryGraph(
            centerLabel: 'VOIX',
            nodes: nodes,
          ),
        ),
        const SizedBox(height: 18),
        _primaryButton(
          label: 'COMPARER AVEC LES AUTRES VOIX',
          icon: Icons.compare_arrows_outlined,
          onPressed: () => setState(() => _stage = 5),
        ),
      ],
    );
  }

  Widget _comparisonStage() {
    final relation = _comparison['relation']?.toString() ?? 'new';
    final reason = _comparison['reason']?.toString() ?? '';
    final label = switch (relation) {
      'corroborates' => 'Des voix se rejoignent.',
      'nuances' => 'Une autre voix nuance ceci.',
      'diverges' => 'Deux versions existent.',
      _ => 'Cette voix ouvre une nouvelle trace.',
    };
    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 28, 20, 28),
      children: [
        Text('Écouter les écarts.', style: _fraunces(size: 29)),
        const SizedBox(height: 30),
        SizedBox(
          height: 220,
          child: CustomPaint(
            painter: _ComparisonPainter(relation: relation),
          ),
        ),
        const SizedBox(height: 10),
        Text(
          label,
          textAlign: TextAlign.center,
          style: _fraunces(
            size: 23,
            color: relation == 'diverges'
                ? HanduniaTokens.terre
                : HanduniaTokens.ivoire,
          ),
        ),
        if (reason.isNotEmpty) ...[
          const SizedBox(height: 9),
          Text(
            reason,
            textAlign: TextAlign.center,
            style: _karla(color: HanduniaTokens.cendre),
          ),
        ],
        const SizedBox(height: 30),
        _primaryButton(
          label: relation == 'diverges'
              ? 'CONSERVER LES DEUX'
              : 'CONTINUER',
          icon: Icons.arrow_forward_outlined,
          onPressed: () => setState(() => _stage = 6),
        ),
      ],
    );
  }

  Widget _scopeStage() {
    final suggested =
        _analysis['suggested_scope']?.toString() ?? 'community';
    final reason = _analysis['scope_reason']?.toString().trim() ?? '';
    final scopes = const <(String, String)>[
      ('elders', 'Anciens'),
      ('lineage', 'Lignée'),
      ('community', 'Communauté'),
      ('all', 'Tous'),
    ];
    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 22, 20, 28),
      children: [
        Text('Qui peut entendre\ncette voix ?', style: _fraunces(size: 29)),
        const SizedBox(height: 24),
        for (final scope in scopes) ...[
          _scopeTile(
            value: scope.$1,
            label: scope.$2,
            suggested: suggested == scope.$1,
          ),
          const SizedBox(height: 9),
        ],
        _relationSummary(),
        const SizedBox(height: 14),
        if (reason.isNotEmpty) ...[
          _stateCard(
            title: 'Suggestion de portée',
            subtitle: reason,
            color: HanduniaTokens.terre,
          ),
          const SizedBox(height: 12),
        ],
        const SizedBox(height: 22),
        _primaryButton(
          label: _saving ? 'SCELLEMENT…' : 'SCELLER LA VOIX',
          icon: Icons.verified_user_outlined,
          onPressed: _saving ? null : _seal,
        ),
        const SizedBox(height: 8),
        TextButton(
          onPressed: _saving ? null : () => Navigator.of(context).maybePop(),
          child: Text(
            'Ne pas conserver',
            style: _karla(
              color: HanduniaTokens.terre,
              weight: FontWeight.w700,
            ),
          ),
        ),
      ],
    );
  }

  Widget _sealedStage() {
    final relationCount = _entities
        .where((item) => item['validated'] == true)
        .length;
    final fragmentId = _savedFragment?['id']?.toString();
    final movementRaw = _analysis['movement'];
    final hasMovement =
        movementRaw is Map && movementRaw['detected'] == true;
    return ListView(
      padding: const EdgeInsets.fromLTRB(22, 32, 22, 28),
      children: [
        Center(
          child: HaloDensite(
            valeur: _savedOffline
                ? 0
                : ((widget.voiceCount + 1) / 20)
                    .clamp(0.0, 1.0)
                    .toDouble(),
            size: 170,
          ),
        ),
        const SizedBox(height: 20),
        Text(
          _lieuName,
          textAlign: TextAlign.center,
          style: _karla(
            color: HanduniaTokens.braise,
            weight: FontWeight.w700,
          ),
        ),
        const SizedBox(height: 8),
        Text(
          _savedOffline
              ? 'Scellé local'
              : '${widget.voiceCount} → ${widget.voiceCount + 1}',
          textAlign: TextAlign.center,
          style: _fraunces(size: 30),
        ),
        const SizedBox(height: 24),
        Wrap(
          alignment: WrapAlignment.center,
          spacing: 8,
          runSpacing: 8,
          children: [
            _pill(
              _savedOffline ? 'À synchroniser' : 'Scellé',
              _savedOffline
                  ? HanduniaTokens.terre
                  : HanduniaTokens.braise,
            ),
            _pill(_scopeLabel(_selectedScope), HanduniaTokens.ivoire),
            _pill('$relationCount liens', HanduniaTokens.cendre),
          ],
        ),
        const SizedBox(height: 30),
        if (hasMovement)
          _outlineButton(
            label: 'Tracer ce chemin',
            icon: Icons.route_outlined,
            onPressed: fragmentId == null
                ? null
                : () async {
                    final completed = await Navigator.of(context).push<bool>(
                      MaterialPageRoute<bool>(
                        builder: (_) =>
                            HanduniaTraceRoute(fragmentId: fragmentId),
                      ),
                    );
                    if (!mounted || completed != true) {
                      return;
                    }
                    await _loadGaps();
                  },
          ),
        if (hasMovement) const SizedBox(height: 10),
        _primaryButton(
          label: 'VOIR LES VOIX MANQUANTES',
          icon: Icons.radio_button_unchecked,
          onPressed: _loadGaps,
        ),
        const SizedBox(height: 10),
        TextButton(
          onPressed: () => Navigator.of(context).pop(),
          child: Text('Terminer', style: _karla(weight: FontWeight.w600)),
        ),
      ],
    );
  }

  Widget _gapsStage() {
    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 22, 20, 28),
      children: [
        Text('Les voix qui\nmanquent.', style: _fraunces(size: 29)),
        const SizedBox(height: 8),
        Text(
          _lieuName,
          style: _karla(
            color: HanduniaTokens.braise,
            weight: FontWeight.w700,
          ),
        ),
        const SizedBox(height: 22),
        if (_processing)
          const Center(
            child: HaloDensite(valeur: 0, loading: true, size: 88),
          )
        else if (_gaps.isEmpty)
          _stateCard(
            title: 'Aucune lacune certaine',
            subtitle: 'La mémoire continue de se construire.',
            color: HanduniaTokens.cendre,
          )
        else
          for (final gap in _gaps.take(5)) ...[
            _gapCard(gap),
            const SizedBox(height: 10),
          ],
        const SizedBox(height: 18),
        _primaryButton(
          label: 'ALLER CHERCHER CES VOIX',
          icon: Icons.record_voice_over_outlined,
          onPressed: () {
            setState(() {
              _stage = 1;
              if (_gaps.isNotEmpty) {
                final value = _gaps.first['value']?.toString() ?? '';
                _question =
                    'Qui peut encore raconter $value à $_lieuName ?';
                _questionReason = 'Lacune de mémoire détectée';
              }
            });
          },
        ),
      ],
    );
  }

  List<Map<String, dynamic>> get _entities {
    final raw = _analysis['entities'];
    if (raw is! List) {
      return const <Map<String, dynamic>>[];
    }
    return raw
        .whereType<Map>()
        .map((item) => Map<String, dynamic>.from(item))
        .toList(growable: false);
  }

  Widget _relationSummary() {
    final relation = _comparison['relation']?.toString() ?? 'new';
    final label = switch (relation) {
      'corroborates' => 'Cette voix rejoint un témoignage existant.',
      'nuances' => 'Cette voix apporte une nuance.',
      'diverges' => 'Deux versions sont conservées.',
      _ => 'Cette voix apporte une nouvelle trace.',
    };
    final color = relation == 'diverges'
        ? HanduniaTokens.terre
        : HanduniaTokens.braise;
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: HanduniaTokens.nuitPortee,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: color.withValues(alpha: .62)),
      ),
      child: Row(
        children: [
          Icon(Icons.hub_outlined, color: color, size: 22),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              label,
              style: _karla(size: 13.5, weight: FontWeight.w600),
            ),
          ),
          TextButton(
            onPressed: () => setState(() => _stage = 5),
            child: const Text('Détail'),
          ),
        ],
      ),
    );
  }

  Widget _scopeTile({
    required String value,
    required String label,
    required bool suggested,
  }) {
    final selected = _selectedScope == value;
    final description = switch (value) {
      'elders' => 'Réservé aux gardiens et anciens',
      'lineage' => 'Visible par votre lignée',
      'all' => 'Visible à tous les utilisateurs',
      _ => 'Visible par la communauté Handunia',
    };
    return InkWell(
      borderRadius: BorderRadius.circular(18),
      onTap: () => setState(() => _selectedScope = value),
      child: Container(
        constraints: const BoxConstraints(minHeight: 64),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        decoration: BoxDecoration(
          color: HanduniaTokens.nuitPortee,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(
            color: selected
                ? HanduniaTokens.braise
                : HanduniaTokens.bordure,
          ),
        ),
        child: Row(
          children: [
            Icon(
              selected
                  ? Icons.radio_button_checked
                  : Icons.radio_button_unchecked,
              color: selected
                  ? HanduniaTokens.braise
                  : HanduniaTokens.cendre,
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    label,
                    style: _karla(
                      size: 16,
                      weight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    description,
                    style: _karla(
                      size: 12.5,
                      color: HanduniaTokens.cendre,
                    ),
                  ),
                ],
              ),
            ),
            if (suggested)
              Text(
                'suggéré',
                style: _karla(
                  size: 12,
                  color: HanduniaTokens.terre,
                  weight: FontWeight.w700,
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _gapCard(Map<String, dynamic> gap) {
    final value = gap['value']?.toString() ?? 'Voix non documentée';
    final count = (gap['source_count'] as num?)?.toInt() ?? 0;
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: HanduniaTokens.nuitPortee,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: HanduniaTokens.bordure),
      ),
      child: Row(
        children: [
          const HaloDensite(valeur: 0, size: 54),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(value, style: _fraunces(size: 18)),
                const SizedBox(height: 3),
                Text(
                  count == 0 ? 'aucune voix' : '$count voix seulement',
                  style: _karla(
                    size: 12.5,
                    color: HanduniaTokens.cendre,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _stateCard({
    required String title,
    required String subtitle,
    required Color color,
  }) {
    return Container(
      padding: const EdgeInsets.all(15),
      decoration: BoxDecoration(
        color: HanduniaTokens.nuitPortee,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: color.withValues(alpha: .55)),
      ),
      child: Row(
        children: [
          Icon(Icons.radio_button_unchecked, color: color),
          const SizedBox(width: 11),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: _fraunces(size: 17, color: color)),
                const SizedBox(height: 3),
                Text(
                  subtitle,
                  style: _karla(
                    size: 12.5,
                    color: HanduniaTokens.cendre,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _pill(String label, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 11, vertical: 7),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: color.withValues(alpha: .6)),
      ),
      child: Text(
        label,
        style: _karla(size: 12.5, color: color, weight: FontWeight.w700),
      ),
    );
  }

  Widget _primaryButton({
    required String label,
    required IconData icon,
    required VoidCallback? onPressed,
  }) {
    return SizedBox(
      width: double.infinity,
      height: 58,
      child: FilledButton.icon(
        onPressed: onPressed,
        style: FilledButton.styleFrom(
          backgroundColor: HanduniaTokens.braise,
          foregroundColor: HanduniaTokens.encre,
          disabledBackgroundColor:
              HanduniaTokens.braise.withValues(alpha: .35),
          shape: const StadiumBorder(),
        ),
        icon: Icon(icon),
        label: Text(
          label,
          style: _karla(
            size: 15.5,
            color: HanduniaTokens.encre,
            weight: FontWeight.w700,
          ),
        ),
      ),
    );
  }

  Widget _outlineButton({
    required String label,
    required IconData icon,
    required VoidCallback? onPressed,
  }) {
    return SizedBox(
      width: double.infinity,
      height: 56,
      child: OutlinedButton.icon(
        onPressed: onPressed,
        style: OutlinedButton.styleFrom(
          foregroundColor: HanduniaTokens.ivoire,
          side: const BorderSide(color: HanduniaTokens.bordureForte),
          shape: const StadiumBorder(),
        ),
        icon: Icon(icon),
        label: Text(label, style: _karla(size: 15, weight: FontWeight.w700)),
      ),
    );
  }

  InputDecoration _inputDecoration(String hint) {
    return InputDecoration(
      hintText: hint,
      hintStyle: _karla(size: 14, color: HanduniaTokens.cendre),
      filled: true,
      fillColor: HanduniaTokens.nuitPortee,
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: const BorderSide(color: HanduniaTokens.bordure),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: const BorderSide(color: HanduniaTokens.braise),
      ),
    );
  }

  String _entityLabel(String type) {
    return switch (type.toLowerCase()) {
      'place' => 'Lieu',
      'period' => 'Période',
      'person' => 'Personne',
      'lineage' => 'Lignée',
      'theme' => 'Thème',
      'event' => 'Événement',
      'movement' => 'Déplacement',
      _ => 'Trace',
    };
  }

  String _scopeLabel(String value) {
    return switch (value) {
      'elders' => 'Anciens',
      'lineage' => 'Lignée',
      'all' => 'Tous',
      _ => 'Communauté',
    };
  }

  String _timeLabel(int ms) {
    final totalSeconds = math.max(0, ms ~/ 1000);
    final minutes = totalSeconds ~/ 60;
    final seconds = totalSeconds % 60;
    return '$minutes:${seconds.toString().padLeft(2, '0')}';
  }
}

class _MemoryGraph extends StatelessWidget {
  const _MemoryGraph({
    required this.centerLabel,
    required this.nodes,
  });

  final String centerLabel;
  final List<Map<String, dynamic>> nodes;

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final center = Offset(
          constraints.maxWidth / 2,
          constraints.maxHeight / 2,
        );
        final positions = <Offset>[];
        for (var i = 0; i < nodes.length; i++) {
          final angle = -math.pi / 2 + (math.pi * 2 * i / math.max(1, nodes.length));
          final radius = math.min(
            constraints.maxWidth,
            constraints.maxHeight,
          ) * .34;
          positions.add(
            Offset(
              center.dx + math.cos(angle) * radius,
              center.dy + math.sin(angle) * radius,
            ),
          );
        }
        return Stack(
          children: [
            Positioned.fill(
              child: CustomPaint(
                painter: _GraphPainter(center: center, nodes: positions),
              ),
            ),
            Positioned(
              left: center.dx - 36,
              top: center.dy - 36,
              child: _GraphNode(label: centerLabel, primary: true),
            ),
            for (var i = 0; i < nodes.length; i++)
              Positioned(
                left: positions[i].dx - 44,
                top: positions[i].dy - 30,
                child: _GraphNode(
                  label: nodes[i]['corrected_value']?.toString().trim().isNotEmpty == true
                      ? nodes[i]['corrected_value'].toString()
                      : nodes[i]['value']?.toString() ?? '',
                ),
              ),
          ],
        );
      },
    );
  }
}

class _GraphNode extends StatelessWidget {
  const _GraphNode({
    required this.label,
    this.primary = false,
  });

  final String label;
  final bool primary;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: primary ? 72 : 88,
      constraints: const BoxConstraints(minHeight: 60),
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
      decoration: BoxDecoration(
        color: HanduniaTokens.nuitPortee,
        shape: primary ? BoxShape.circle : BoxShape.rectangle,
        borderRadius: primary ? null : BorderRadius.circular(14),
        border: Border.all(
          color: primary
              ? HanduniaTokens.braise
              : HanduniaTokens.bordureForte,
        ),
      ),
      alignment: Alignment.center,
      child: Text(
        label,
        maxLines: 3,
        overflow: TextOverflow.ellipsis,
        textAlign: TextAlign.center,
        style: _karla(
          size: primary ? 11 : 10.5,
          color: primary
              ? HanduniaTokens.braise
              : HanduniaTokens.ivoire,
          weight: FontWeight.w700,
        ),
      ),
    );
  }
}

class _GraphPainter extends CustomPainter {
  const _GraphPainter({
    required this.center,
    required this.nodes,
  });

  final Offset center;
  final List<Offset> nodes;

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.4
      ..color = HanduniaTokens.braise.withValues(alpha: .48);
    for (final node in nodes) {
      final path = Path()
        ..moveTo(center.dx, center.dy)
        ..quadraticBezierTo(
          (center.dx + node.dx) / 2 + 8,
          (center.dy + node.dy) / 2 - 8,
          node.dx,
          node.dy,
        );
      canvas.drawPath(path, paint);
    }
  }

  @override
  bool shouldRepaint(covariant _GraphPainter oldDelegate) =>
      oldDelegate.center != center || oldDelegate.nodes != nodes;
}

class _ComparisonPainter extends CustomPainter {
  const _ComparisonPainter({required this.relation});

  final String relation;

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final paint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2
      ..strokeCap = StrokeCap.round
      ..color = relation == 'diverges'
          ? HanduniaTokens.terre
          : HanduniaTokens.braise;

    final left = Offset(18, size.height / 2);
    final rightTop = Offset(size.width - 18, size.height * .32);
    final rightBottom = Offset(size.width - 18, size.height * .68);

    if (relation == 'diverges') {
      canvas.drawPath(
        Path()
          ..moveTo(left.dx, left.dy)
          ..quadraticBezierTo(center.dx, center.dy, rightTop.dx, rightTop.dy),
        paint,
      );
      canvas.drawPath(
        Path()
          ..moveTo(left.dx, left.dy)
          ..quadraticBezierTo(center.dx, center.dy, rightBottom.dx, rightBottom.dy),
        paint,
      );
    } else if (relation == 'corroborates') {
      canvas.drawPath(
        Path()
          ..moveTo(18, size.height * .35)
          ..quadraticBezierTo(center.dx, center.dy, size.width - 18, center.dy),
        paint,
      );
      canvas.drawPath(
        Path()
          ..moveTo(18, size.height * .65)
          ..quadraticBezierTo(center.dx, center.dy, size.width - 18, center.dy),
        paint,
      );
    } else {
      canvas.drawLine(
        Offset(18, size.height * .42),
        Offset(size.width - 18, size.height * .42),
        paint,
      );
      canvas.drawLine(
        Offset(18, size.height * .62),
        Offset(size.width - 18, size.height * .62),
        paint..color = HanduniaTokens.cendre,
      );
    }
    canvas.drawCircle(left, 5, Paint()..color = HanduniaTokens.ivoire);
    canvas.drawCircle(
      relation == 'diverges' ? rightTop : Offset(size.width - 18, center.dy),
      5,
      Paint()..color = HanduniaTokens.braise,
    );
    if (relation == 'diverges') {
      canvas.drawCircle(
        rightBottom,
        5,
        Paint()..color = HanduniaTokens.terre,
      );
    }
  }

  @override
  bool shouldRepaint(covariant _ComparisonPainter oldDelegate) =>
      oldDelegate.relation != relation;
}

TextStyle _fraunces({
  double size = 18,
  Color color = HanduniaTokens.ivoire,
  double height = 1.28,
}) {
  return TextStyle(
    fontFamily: 'Fraunces',
    fontWeight: FontWeight.w600,
    fontSize: size,
    height: height,
    color: color,
  );
}

TextStyle _karla({
  double size = 15,
  FontWeight weight = FontWeight.w400,
  Color color = HanduniaTokens.ivoire,
  double height = 1.45,
}) {
  return TextStyle(
    fontFamily: 'Karla',
    fontWeight: weight,
    fontSize: size,
    height: height,
    color: color,
  );
}
