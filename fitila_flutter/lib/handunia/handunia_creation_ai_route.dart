import 'dart:async';
import 'dart:math' as math;

import 'package:audioplayers/audioplayers.dart' as audio;
import 'package:flutter/material.dart';

import '../core/fitila_media.dart';
import '../ui/reference_creation_ui.dart';
import 'handunia_consultation_ui.dart';
import 'handunia_geo_trace_route.dart';
import 'handunia_creation_ai_data.dart';

enum HanduniaTranscriptionState {
  idle,
  transcribing,
  ready,
  failed,
}

class HanduniaAiCreationRoute extends StatefulWidget {
  const HanduniaAiCreationRoute({
    super.key,
    required this.lieu,
    this.voiceCount = 0,
    this.onSaved,
    this.onPlatformNav,
    this.onPlatformCreate,
  });

  final Map<String, dynamic> lieu;
  final int voiceCount;
  final Future<void> Function()? onSaved;
  final ValueChanged<int>? onPlatformNav;
  final VoidCallback? onPlatformCreate;

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
  HanduniaTranscriptionState _transcriptionState =
      HanduniaTranscriptionState.idle;
  String? _transcriptionError;
  bool _originalPlaying = false;
  Duration _originalPosition = Duration.zero;
  Duration _originalDuration = Duration.zero;
  StreamSubscription<audio.PlayerState>? _playerStateSubscription;
  StreamSubscription<Duration>? _playerPositionSubscription;
  StreamSubscription<Duration>? _playerDurationSubscription;
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

  HanduniaArchitectureLayer get _architectureLayer => switch (_stage) {
    0 || 1 || 2 || 3 => HanduniaArchitectureLayer.collection,
    4 || 5 || 6 || 8 => HanduniaArchitectureLayer.memory,
    7 => HanduniaArchitectureLayer.discovery,
    _ => HanduniaArchitectureLayer.collection,
  };

  ThemeData _readableTheme(BuildContext context) {
    final base = Theme.of(context);
    final scheme = ColorScheme.fromSeed(
      seedColor: HanduniaTokens.braise,
      brightness: Brightness.light,
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
    _playerStateSubscription =
        _proofPlayer.onPlayerStateChanged.listen((state) {
      if (!mounted) return;
      setState(() => _originalPlaying = state == audio.PlayerState.playing);
    });
    _playerPositionSubscription =
        _proofPlayer.onPositionChanged.listen((position) {
      if (!mounted) return;
      setState(() => _originalPosition = position);
    });
    _playerDurationSubscription =
        _proofPlayer.onDurationChanged.listen((duration) {
      if (!mounted) return;
      setState(() => _originalDuration = duration);
    });
    unawaited(_syncPending());
  }

  @override
  void dispose() {
    _recordingTimer?.cancel();
    unawaited(_playerStateSubscription?.cancel());
    unawaited(_playerPositionSubscription?.cancel());
    unawaited(_playerDurationSubscription?.cancel());
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
      if (mounted) {
        setState(() {
          _stage = 3;
          _transcriptionState = HanduniaTranscriptionState.transcribing;
          _transcriptionError = null;
          _notice = null;
        });
      }
      await _transcribeRecordedAudio();

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

  Future<void> _transcribeRecordedAudio() async {
    final asset = _asset;
    if (asset == null) {
      return;
    }
    if (mounted) {
      setState(() {
        _transcriptionState = HanduniaTranscriptionState.transcribing;
        _transcriptionError = null;
      });
    }
    try {
      final transcript = await HanduniaAiCreationData.transcribe(
        asset,
        languageCode: _languageCode,
      );
      _transcriptController.text = transcript;
      if (mounted) {
        setState(() {
          _transcriptionState = HanduniaTranscriptionState.ready;
          _transcriptionError = null;
        });
      }
      await _analyzeTranscript(transcript);
    } catch (error) {
      if (!mounted) {
        return;
      }
      setState(() {
        _transcriptionState = HanduniaTranscriptionState.failed;
        _transcriptionError = error
            .toString()
            .replaceFirst('Bad state: ', '')
            .replaceFirst('Exception: ', '');
        _analysis = <String, dynamic>{};
      });
    }
  }

  Future<void> _analyzeTranscript(String transcript) async {
    if (transcript.trim().isEmpty) {
      return;
    }
    try {
      final analysis = await HanduniaAiCreationData.analyze(
        transcript: transcript,
        lieuName: _lieuName,
        languageCode: _languageCode,
        durationMs: _durationMs,
      );
      if (mounted) {
        setState(() {
          _analysis = analysis;
          _selectedScope =
              analysis['suggested_scope']?.toString() ?? 'community';
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() => _analysis = <String, dynamic>{});
      }
    }
    try {
      final comparison = await HanduniaAiCreationData.compare(
        transcript: transcript,
        lieuId: _lieuId,
      );
      if (mounted) {
        setState(() => _comparison = comparison);
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          _comparison = <String, dynamic>{
            'relation': 'new',
            'target_fragment_id': null,
            'confidence': 0.0,
            'reason': 'Comparaison momentanément indisponible.',
          };
        });
      }
    }
  }

  Future<void> _retryTranscription() async {
    if (_processing || _transcriptionState == HanduniaTranscriptionState.transcribing) {
      return;
    }
    setState(() => _processing = true);
    try {
      await _transcribeRecordedAudio();
    } finally {
      if (mounted) {
        setState(() => _processing = false);
      }
    }
  }

  Future<void> _toggleOriginalVoice() async {
    final asset = _asset;
    if (asset == null) {
      return;
    }
    try {
      if (_originalPlaying) {
        await _proofPlayer.pause();
      } else {
        if (_originalDuration > Duration.zero &&
            _originalPosition >= _originalDuration) {
          await _proofPlayer.seek(Duration.zero);
        }
        if (_proofPlayer.state == audio.PlayerState.paused) {
          await _proofPlayer.resume();
        } else {
          await _proofPlayer.play(audio.DeviceFileSource(asset.path));
        }
      }
    } catch (_) {
      if (mounted) {
        setState(() => _notice = 'Lecture de la voix indisponible.');
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
      _asset = null;
      _transcriptionState = HanduniaTranscriptionState.idle;
      _transcriptionError = null;
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
        _notice = 'Publié dans le Fil Handunia Wasa.';
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
        bottomNavigationBar:
            widget.onPlatformNav == null && widget.onPlatformCreate == null
            ? null
            : FitilaPremiumBottomNav(
                selectedIndex: -1,
                onSelected: (index) => widget.onPlatformNav?.call(index),
                onCreate: () => widget.onPlatformCreate?.call(),
              ),
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
      padding: const EdgeInsets.fromLTRB(12, 8, 12, 10),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            children: [
              SizedBox(
                width: 44,
                height: 44,
                child: IconButton(
                  tooltip: 'Retour',
                  onPressed: _back,
                  icon: const Icon(Icons.arrow_back_rounded, size: 23),
                  color: HanduniaTokens.ivoire,
                  style: IconButton.styleFrom(
                    backgroundColor: HanduniaTokens.nuitPortee,
                    side: const BorderSide(
                      color: HanduniaTokens.bordureForte,
                    ),
                    shadowColor: const Color(0x216B4A22),
                    elevation: 2,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(16),
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      'Tisser',
                      textAlign: TextAlign.center,
                      maxLines: 1,
                      style: _fraunces(size: 24, height: 1.02),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      _lieuName,
                      textAlign: TextAlign.center,
                      maxLines: 1,
                      overflow: TextOverflow.fade,
                      style: _karla(
                        size: 10,
                        color: HanduniaTokens.cendre,
                        weight: FontWeight.w800,
                        height: 1,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 52),
            ],
          ),
          const SizedBox(height: 9),
          HanduniaArchitectureMap(
            active: _architectureLayer,
            compact: true,
          ),
        ],
      ),
    );
  }

  Widget _thresholdStage() {
    final density =
        (widget.voiceCount / 20).clamp(0.0, 1.0).toDouble();
    return ListView(
      padding: const EdgeInsets.fromLTRB(24, 28, 24, 24),
      children: [
        Center(
          child: Stack(
            alignment: Alignment.center,
            children: [
              HaloDensite(valeur: density, size: 170),
              Semantics(
                label: 'Parler et tisser un souvenir',
                button: true,
                child: IconButton.filled(
                  onPressed: _startRecording,
                  style: IconButton.styleFrom(
                    minimumSize: const Size(82, 82),
                    backgroundColor: HanduniaTokens.braise,
                    foregroundColor: Colors.white,
                  ),
                  icon: const Icon(Icons.mic_rounded, size: 38),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 14),
        Text(
          _lieuName,
          textAlign: TextAlign.center,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: _fraunces(size: 22),
        ),
        const SizedBox(height: 4),
        Text(
          '${widget.voiceCount} voix',
          textAlign: TextAlign.center,
          style: _karla(size: 12, color: HanduniaTokens.cendre),
        ),
        const SizedBox(height: 24),
        _primaryButton(
          label: 'PARLER',
          icon: Icons.mic_rounded,
          onPressed: _startRecording,
        ),
        const SizedBox(height: 9),
        _outlineButton(
          label: 'AIDE IA',
          icon: Icons.light_mode_rounded,
          onPressed: _enterAi,
        ),
      ],
    );
  }

  Widget _questionStage() {
    return ListView(
      padding: const EdgeInsets.fromLTRB(24, 24, 24, 24),
      children: [
        Center(
          child: Stack(
            alignment: Alignment.center,
            children: [
              HaloDensite(
                valeur: widget.voiceCount == 0
                    ? 0
                    : (widget.voiceCount / 20).clamp(0.0, 1.0).toDouble(),
                size: 146,
                loading: _loadingQuestion,
              ),
              const Icon(
                Icons.hearing_rounded,
                size: 38,
                color: HanduniaTokens.braise,
              ),
            ],
          ),
        ),
        const SizedBox(height: 20),
        Text(
          _loadingQuestion ? '…' : _question,
          maxLines: 2,
          overflow: TextOverflow.ellipsis,
          textAlign: TextAlign.center,
          style: _fraunces(size: 24, height: 1.20),
        ),
        const SizedBox(height: 26),
        _primaryButton(
          label: 'PARLER',
          icon: Icons.mic_rounded,
          onPressed: _loadingQuestion ? null : _startRecording,
        ),
        const SizedBox(height: 10),
        Center(
          child: Semantics(
            button: true,
            label: 'Changer de question',
            child: IconButton.outlined(
              onPressed: _loadingQuestion ? null : _anotherQuestion,
              icon: const Icon(Icons.refresh_rounded),
              color: HanduniaTokens.braise,
            ),
          ),
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
          _recording ? 'Écoute' : 'Prêt',
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
            label: 'STOP',
            icon: Icons.stop_circle_outlined,
            onPressed: _stopRecording,
          )
        else
          _primaryButton(
            label: 'PARLER',
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
        const SizedBox(height: 8),
      ],
    );
  }

  Widget _understandingStage() {
    final entities = _entities;
    final transcriptReady =
        _transcriptionState == HanduniaTranscriptionState.ready;
    final transcriptionBusy =
        _transcriptionState == HanduniaTranscriptionState.transcribing;
    final transcriptFailed =
        _transcriptionState == HanduniaTranscriptionState.failed;
    final duration = _originalDuration > Duration.zero
        ? _originalDuration
        : Duration(milliseconds: _durationMs);
    final maxMs = math.max(1, duration.inMilliseconds);
    final currentMs =
        _originalPosition.inMilliseconds.clamp(0, maxMs).toDouble();

    return ListView(
      padding: const EdgeInsets.fromLTRB(18, 12, 18, 30),
      children: [
        Text('Vérifier', style: _fraunces(size: 26)),
        const SizedBox(height: 14),
        Container(
          padding: const EdgeInsets.fromLTRB(14, 10, 14, 10),
          decoration: BoxDecoration(
            color: HanduniaTokens.nuitPortee,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: HanduniaTokens.bordureForte),
          ),
          child: Row(
            children: [
              IconButton(
                tooltip: _originalPlaying ? 'Pause' : 'Écouter la voix',
                onPressed: _asset == null ? null : _toggleOriginalVoice,
                icon: Icon(
                  _originalPlaying
                      ? Icons.pause_circle_filled
                      : Icons.play_circle_fill,
                  size: 34,
                ),
                color: HanduniaTokens.braise,
              ),
              const SizedBox(width: 6),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Voix',
                      style: _karla(size: 15, weight: FontWeight.w700),
                    ),
                    Slider(
                      value: currentMs,
                      min: 0,
                      max: maxMs.toDouble(),
                      activeColor: HanduniaTokens.braise,
                      inactiveColor: HanduniaTokens.bordureForte,
                      onChanged: _asset == null
                          ? null
                          : (value) async {
                              final target =
                                  Duration(milliseconds: value.round());
                              await _proofPlayer.seek(target);
                              if (mounted) {
                                setState(() => _originalPosition = target);
                              }
                            },
                    ),
                  ],
                ),
              ),
              Text(
                _timeLabel(duration.inMilliseconds),
                style: _karla(size: 12.5, color: HanduniaTokens.cendre),
              ),
            ],
          ),
        ),
        const SizedBox(height: 18),
        if (transcriptionBusy) ...[
          const Center(
            child: HaloDensite(valeur: .5, loading: true, size: 64),
          ),
          const SizedBox(height: 8),
          Text(
            '…',
            textAlign: TextAlign.center,
            style: _karla(
              size: 14,
              color: HanduniaTokens.cendre,
              weight: FontWeight.w700,
            ),
          ),
        ] else if (transcriptFailed) ...[
          _stateCard(
            title: 'Transcription indisponible',
            subtitle: _transcriptionError ?? 'Réessayez.',
            color: HanduniaTokens.terre,
          ),
          const SizedBox(height: 10),
          _outlineButton(
            label: 'RÉESSAYER',
            icon: Icons.refresh_outlined,
            onPressed: _processing ? null : _retryTranscription,
          ),
        ] else if (transcriptReady) ...[
          Text(
            'Transcription',
            style: _karla(
              size: 13,
              color: HanduniaTokens.braise,
              weight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 7),
          TextField(
            controller: _transcriptController,
            maxLines: 6,
            minLines: 3,
            style: _karla(size: 15.5, height: 1.45),
            decoration: _inputDecoration('Corriger si nécessaire'),
          ),
        ],
        if (entities.isNotEmpty && transcriptReady) ...[
          const SizedBox(height: 10),
          Theme(
            data: Theme.of(context).copyWith(dividerColor: Colors.transparent),
            child: ExpansionTile(
              initiallyExpanded: false,
              tilePadding: EdgeInsets.zero,
              childrenPadding: EdgeInsets.zero,
              iconColor: HanduniaTokens.braise,
              collapsedIconColor: HanduniaTokens.cendre,
              title: Semantics(
                label: 'Données détectées : ${entities.length}',
                child: Row(
                  children: [
                    const Icon(
                      Icons.center_focus_strong_rounded,
                      size: 18,
                      color: HanduniaTokens.braise,
                    ),
                    const SizedBox(width: 6),
                    Text(
                      '${entities.length}',
                      style: _karla(
                        size: 14.5,
                        weight: FontWeight.w800,
                      ),
                    ),
                  ],
                ),
              ),
              children: [
                for (var i = 0; i < entities.length; i++) ...[
                  _entityCard(entities[i], i),
                  const SizedBox(height: 8),
                ],
              ],
            ),
          ),
        ],
        const SizedBox(height: 20),
        _primaryButton(
          label: transcriptFailed
              ? 'RELIER'
              : transcriptionBusy
              ? 'TRANSCRIPTION…'
              : 'RELIER',
          icon: Icons.account_tree_outlined,
          onPressed: transcriptionBusy
              ? null
              : () async {
                  if (transcriptReady) {
                    await _reanalyzeIfNeeded();
                  }
                  if (mounted) {
                    setState(() => _stage = 4);
                  }
                },
        ),
        if (transcriptReady && entities.isNotEmpty) ...[
          const SizedBox(height: 6),
          TextButton.icon(
            onPressed: _processing ? null : () => setState(() => _stage = 4),
            icon: const Icon(Icons.account_tree_outlined, size: 18),
            label: const Text('Voir les liens'),
          ),
        ],
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
              Semantics(
                button: true,
                label: validated ? 'Confirmé' : 'Confirmer',
                child: IconButton(
                  onPressed: () => _toggleEntityValidation(index),
                  icon: Icon(
                    validated
                        ? Icons.check_circle_rounded
                        : Icons.check_circle_outline_rounded,
                  ),
                  color: validated
                      ? HanduniaTokens.braise
                      : HanduniaTokens.cendre,
                ),
              ),
              const SizedBox(width: 4),
              Semantics(
                button: true,
                label: 'Corriger',
                child: IconButton(
                  onPressed: () => _editEntity(index),
                  icon: const Icon(Icons.edit_rounded),
                  color: HanduniaTokens.cendre,
                ),
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
        Text('Mémoire', style: _fraunces(size: 27)),
        const SizedBox(height: 10),
        if (nodes.isNotEmpty)
          Text(
            '${nodes.length} lien${nodes.length > 1 ? 's' : ''}',
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
          label: 'COMPARER',
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
      'corroborates' => 'Même récit',
      'nuances' => 'Nuance',
      'diverges' => 'Deux versions',
      _ => 'Nouvelle trace',
    };
    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 28, 20, 28),
      children: [
        Text('Comparer', style: _fraunces(size: 27)),
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
        if (reason.isNotEmpty)
          Semantics(
            label: reason,
            child: const SizedBox.shrink(),
          ),
        const SizedBox(height: 30),
        _primaryButton(
          label: relation == 'diverges'
              ? 'GARDER 2'
              : 'SUIVANT',
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
        Text('Portée', style: _fraunces(size: 27)),
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
        if (reason.isNotEmpty)
          Semantics(
            label: 'Suggestion IA : $reason',
            child: const SizedBox.shrink(),
          ),
        const SizedBox(height: 18),
        _primaryButton(
          label: _saving ? 'SCELLEMENT…' : 'TISSER',
          icon: Icons.verified_user_outlined,
          onPressed: _saving ? null : _seal,
        ),
        const SizedBox(height: 8),
        TextButton(
          onPressed: _saving ? null : () => Navigator.of(context).maybePop(),
          child: Text(
            'Annuler',
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
        const SizedBox(height: 8),
        Text(
          _savedOffline ? 'À synchroniser' : 'Tissé',
          textAlign: TextAlign.center,
          style: _karla(
            size: 15,
            color: HanduniaTokens.braise,
            weight: FontWeight.w900,
          ),
        ),
        const SizedBox(height: 24),
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Semantics(
              label: _savedOffline ? 'À synchroniser' : 'Scellé',
              child: Icon(
                _savedOffline
                    ? Icons.cloud_upload_outlined
                    : Icons.verified_rounded,
                color: _savedOffline
                    ? HanduniaTokens.terre
                    : HanduniaTokens.braise,
                size: 24,
              ),
            ),
            const SizedBox(width: 18),
            CercleDePortee(niveau: _selectedScope, size: 38),
            const SizedBox(width: 18),
            Semantics(
              label: '$relationCount liens',
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(
                    Icons.account_tree_rounded,
                    size: 20,
                    color: HanduniaTokens.cendre,
                  ),
                  const SizedBox(width: 3),
                  Text(
                    '$relationCount',
                    style: _karla(
                      size: 11.5,
                      color: HanduniaTokens.cendre,
                      weight: FontWeight.w800,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
        const SizedBox(height: 30),
        if (hasMovement)
          _outlineButton(
            label: 'TRACER',
            icon: Icons.route_outlined,
            onPressed: fragmentId == null
                ? null
                : () async {
                    final completed = await Navigator.of(context).push<bool>(
                      MaterialPageRoute<bool>(
                        builder: (_) =>
                            HanduniaGeoTraceRoute(fragmentId: fragmentId),
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
          label: 'VOIX MANQUANTES',
          icon: Icons.radio_button_unchecked,
          onPressed: _loadGaps,
        ),
        const SizedBox(height: 10),
        TextButton.icon(
          onPressed: () => Navigator.of(context).pop(true),
          icon: Icon(
            _savedOffline
                ? Icons.check_circle_outline
                : Icons.dynamic_feed_outlined,
            size: 19,
          ),
          label: Text(
            _savedOffline ? 'OK' : 'FIL',
            style: _karla(weight: FontWeight.w700),
          ),
        ),
      ],
    );
  }

  void _selectGap(Map<String, dynamic> gap) {
    final value = gap['value']?.toString().trim() ?? '';
    if (value.isEmpty) {
      return;
    }
    setState(() {
      _stage = 1;
      _question = 'Qui peut encore raconter $value à $_lieuName ?';
      _questionReason = 'Période ou voix manquante sélectionnée';
      _notice = null;
    });
  }

  Widget _gapsStage() {
    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 22, 20, 28),
      children: [
        Text('Voix manquantes', style: _fraunces(size: 27)),
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
            title: 'Complet',
            subtitle: '',
            color: HanduniaTokens.cendre,
          )
        else
          for (final gap in _gaps.take(5)) ...[
            _gapCard(gap, onTap: () => _selectGap(gap)),
            const SizedBox(height: 10),
          ],
        const SizedBox(height: 18),
        _primaryButton(
          label: 'PARLER',
          icon: Icons.record_voice_over_outlined,
          onPressed: _gaps.isEmpty ? null : () => _selectGap(_gaps.first),
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
      'corroborates' => 'Confirme',
      'nuances' => 'Nuance',
      'diverges' => 'Deux versions',
      _ => 'Nouvelle trace',
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
          Semantics(
            button: true,
            label: 'Voir le détail',
            child: IconButton(
              onPressed: () => setState(() => _stage = 5),
              icon: const Icon(Icons.info_outline_rounded),
              color: color,
            ),
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
    final icon = switch (value) {
      'elders' => Icons.elderly_rounded,
      'lineage' => Icons.account_tree_rounded,
      'all' => Icons.public_rounded,
      _ => Icons.groups_2_rounded,
    };
    final semantics = switch (value) {
      'elders' => 'Anciens seulement',
      'lineage' => 'Votre lignée',
      'all' => 'Tout le monde',
      _ => 'Communauté Handunia',
    };
    return Semantics(
      button: true,
      selected: selected,
      label: '$label. $semantics${suggested ? '. Suggéré' : ''}',
      child: InkWell(
        borderRadius: BorderRadius.circular(18),
        onTap: () => setState(() => _selectedScope = value),
        child: Container(
          constraints: const BoxConstraints(minHeight: 58),
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 9),
          decoration: BoxDecoration(
            color: selected
                ? HanduniaTokens.orClair
                : HanduniaTokens.nuitPortee,
            borderRadius: BorderRadius.circular(18),
            border: Border.all(
              color: selected
                  ? HanduniaTokens.braise
                  : HanduniaTokens.bordure,
              width: selected ? 1.5 : 1,
            ),
          ),
          child: Row(
            children: [
              Icon(
                icon,
                size: 25,
                color: selected
                    ? HanduniaTokens.braise
                    : HanduniaTokens.cendre,
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  label,
                  style: _karla(size: 16, weight: FontWeight.w800),
                ),
              ),
              if (suggested)
                const Icon(
                  Icons.star_rounded,
                  size: 18,
                  color: HanduniaTokens.braise,
                ),
              if (selected) ...[
                const SizedBox(width: 5),
                const Icon(
                  Icons.check_circle_rounded,
                  size: 19,
                  color: HanduniaTokens.braise,
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  Widget _gapCard(
    Map<String, dynamic> gap, {
    required VoidCallback onTap,
  }) {
    final value = gap['value']?.toString() ?? 'Voix non documentée';
    final count = (gap['source_count'] as num?)?.toInt() ?? 0;
    return InkWell(
      borderRadius: BorderRadius.circular(14),
      onTap: onTap,
      child: Container(
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
            const SizedBox(width: 8),
            const Icon(
              Icons.arrow_forward_ios_rounded,
              size: 18,
              color: HanduniaTokens.braise,
            ),
          ],
        ),
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

  Widget _primaryButton({
    required String label,
    required IconData icon,
    required VoidCallback? onPressed,
  }) {
    return SizedBox(
      width: double.infinity,
      height: 54,
      child: FilledButton.icon(
        onPressed: onPressed,
        style: FilledButton.styleFrom(
          backgroundColor: HanduniaTokens.braise,
          foregroundColor: HanduniaTokens.encre,
          disabledBackgroundColor:
              HanduniaTokens.braise.withValues(alpha: .30),
          elevation: 0,
          shape: const StadiumBorder(),
        ),
        icon: Icon(icon, size: 22),
        label: Text(
          label,
          style: _karla(
            size: 13.2,
            color: HanduniaTokens.encre,
            weight: FontWeight.w800,
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
      height: 52,
      child: OutlinedButton.icon(
        onPressed: onPressed,
        style: OutlinedButton.styleFrom(
          foregroundColor: HanduniaTokens.ivoire,
          backgroundColor: HanduniaTokens.nuitPortee,
          side: const BorderSide(color: HanduniaTokens.bordureForte),
          elevation: 0,
          shape: const StadiumBorder(),
        ),
        icon: Icon(icon, size: 21),
        label: Text(
          label,
          style: _karla(size: 13.2, weight: FontWeight.w800),
        ),
      ),
    );
  }

  InputDecoration _inputDecoration(String hint) {
    return InputDecoration(
      hintText: hint,
      hintStyle: _karla(size: 14, color: HanduniaTokens.cendre),
      filled: true,
      fillColor: HanduniaTokens.orClair.withValues(alpha: .42),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(20),
        borderSide: const BorderSide(color: HanduniaTokens.bordureForte),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(20),
        borderSide: const BorderSide(
          color: HanduniaTokens.braise,
          width: 1.4,
        ),
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
