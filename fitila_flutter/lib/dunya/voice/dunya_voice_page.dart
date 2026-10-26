/// DUNYA Voix — a ChatGPT-Voice-like experience, fully offline.
///
/// Full-screen living orb, hands-free turn taking with barge-in, live
/// subtitles, strictly separated language modes (Français / Baatɔnum), a text view of the same conversation, guided first launch and a
/// settings sheet (brain, voices, packs).
library;

import 'dart:async';
import 'dart:convert';
import 'dart:typed_data';
import 'dart:io';
import 'dart:math' as math;

import 'package:audioplayers/audioplayers.dart' as audio;
import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_tts/flutter_tts.dart';
import 'package:path_provider/path_provider.dart';

import '../../core/offline.dart';
import '../dunya_core.dart';
import '../dunya_local_store.dart';
import '../dunya_models.dart';
import 'dunya_assistant.dart';
import 'dunya_brain.dart';
import 'dunya_cloud_voice.dart';
import 'dunya_french_speech.dart';
import 'dunya_online_routing.dart';
import 'dunya_byt5.dart';
import 'dunya_mic_capture.dart';
import 'dunya_settings.dart';
import 'dunya_shared_speech.dart';
import 'dunya_speech_engine.dart';
import 'dunya_voice_brain.dart';
import 'dunya_voice_pack.dart';
import 'dunya_voice_phrases.dart';

enum _Phase { preparing, idle, listening, thinking, speaking }

class _Turn {
  _Turn({required this.role, required this.text, this.sources = const []});

  final String role;
  String text;
  List<DunyaSource> sources;
  String? subtitle;
}

class DunyaVoicePage extends StatefulWidget {
  const DunyaVoicePage({super.key, required this.knowledge, this.onOpenChat});

  final DunyaAssetKnowledgeRepository knowledge;

  /// Kept for compatibility; the text view is now built in.
  final VoidCallback? onOpenChat;

  @override
  State<DunyaVoicePage> createState() => _DunyaVoicePageState();
}

class _DunyaVoicePageState extends State<DunyaVoicePage> with TickerProviderStateMixin {
  static const _ink = Color(0xFF17131F);
  static const _cream = Color(0xFFF7F3E8);
  static const _gold = Color(0xFFD4A23A);
  static const _sage = Color(0xFF4F8A68);

  final _store = DunyaLocalStore.instance;
  final _settings = DunyaSettings.instance;
  final _brain = DunyaBrain.instance;
  final _packs = DunyaVoicePackManager.instance;
  final _mic = DunyaMicCapture();
  final _cloudVoice = DunyaCloudVoice();
  final _frenchSpeech = DunyaFrenchSpeech();
  DunyaExecutionMode _previousExecution = DunyaSettings.instance.execution;
  final _tts = FlutterTts();
  final _player = audio.AudioPlayer();
  final _composer = TextEditingController();
  final _scroll = ScrollController();
  late final DunyaVoiceBrain _skills = DunyaVoiceBrain(knowledge: widget.knowledge);
  late final DunyaAssistant _assistant = DunyaAssistant(knowledge: widget.knowledge, skills: _skills);
  late final AnimationController _orb = AnimationController(vsync: this, duration: const Duration(seconds: 6))..repeat();

  DunyaSpeechEngine? _engine;
  DunyaVoicePaths _paths = const DunyaVoicePaths();
  var _phase = _Phase.preparing;
  var _session = false; // hands-free loop running
  var _textView = false;
  var _systemFrenchVoice = false;
  var _level = 0.0;
  var _emptyListens = 0;
  var _stopSpeaking = false;
  var _turnCounter = 0;
  int? _bargeTurn;
  String _caption = '';
  String? _subCaption;
  List<String> _words = const [];
  int _activeWord = -1;
  StreamSubscription<Duration>? _posSub;
  StreamSubscription<Duration>? _durSub;
  Duration _audioDuration = Duration.zero;
  String? _status;
  String? _notice;
  String? _failedCloudText;
  final _turns = <_Turn>[];
  DunyaPendingAction? _pending;
  Completer<void>? _bargeWatch;

  DunyaLanguageMode get _mode => _settings.mode;

  bool get _useOnlineVoice =>
      _settings.execution != DunyaExecutionMode.offline && FitilaOffline.online.value;

  DunyaReplyLanguage get _skillLanguage =>
      _mode == DunyaLanguageMode.bariba ? DunyaReplyLanguage.bariba : DunyaReplyLanguage.french;

  @override
  void initState() {
    super.initState();
    _settings.addListener(_onSettings);
    unawaited(_prepare());
  }

  @override
  void dispose() {
    _settings.removeListener(_onSettings);
    _session = false;
    _stopSpeaking = true;
    unawaited(_posSub?.cancel());
    unawaited(_durSub?.cancel());
    unawaited(_assistant.interrupt());
    unawaited(_mic.dispose());
    unawaited(_tts.stop());
    unawaited(_player.dispose());
    // L'engine est partagé avec le reste de l'app (DunyaSharedSpeech) : on ne
    // le détruit pas en quittant cet écran, d'autres écrans peuvent en avoir
    // besoin (lecture hors-ligne du Dictionnaire, du Traducteur…).
    _cloudVoice.cancel();
    unawaited(_frenchSpeech.cancel());
    _orb.dispose();
    _composer.dispose();
    _scroll.dispose();
    super.dispose();
  }

  void _onSettings() {
    final execution = _settings.execution;
    if (execution == DunyaExecutionMode.offline &&
        _previousExecution != DunyaExecutionMode.offline) {
      // Switching to Offline is a privacy boundary, not merely a badge.
      // Abort any in-flight remote voice/translation immediately, stop
      // recording, and require a fresh local session from the user.
      _session = false;
      ++_turnCounter;
      _cloudVoice.cancel();
      unawaited(_frenchSpeech.cancel());
      _stopWordTracking();
      unawaited(_assistant.interrupt());
      unawaited(_mic.cancel());
      unawaited(_player.stop());
      unawaited(_tts.stop());
      _status = 'Mode hors ligne activé';
      _phase = _Phase.idle;
      unawaited(_prepareOfflineEngine());
    }
    _previousExecution = execution;
    if (mounted) setState(() {});
  }

  // ---------------------------------------------------------------------------
  // Preparation
  // ---------------------------------------------------------------------------

  Future<void> _prepare() async {
    await _settings.load();
    // These three are independent of each other (the French system-voice
    // check, the offline ASR/TTS models, and reloading the past
    // conversation): running them together means the screen is ready as
    // soon as the SLOWEST one finishes, not after their sum.
    await Future.wait([
      _prepareFrenchVoice(),
      _loadHistory(),
      // Online startup must not wait for offline ASR/TTS model loading.
      if (!_useOnlineVoice) _prepareOfflineEngine(),
    ]);
    if (!mounted) return;
    setState(() => _phase = _Phase.idle);
    if (!_settings.onboarded) {
      WidgetsBinding.instance.addPostFrameCallback((_) => _completeFirstLaunch());
    } else if (_brain.state == DunyaBrainState.installed &&
        _settings.intelligence == DunyaIntelligence.smart &&
        !_useOnlineVoice) {
      // Do not allocate ~2.6 GB RAM merely because the user launched DUNYA
      // while connected. Load Gemma only when local execution is chosen.
      unawaited(_brain.ensureLoaded().catchError((Object _) {}));
    }
  }

  Future<void> _prepareFrenchVoice() async {
    try {
      await _tts.setLanguage('fr-FR');
      await _tts.setSpeechRate(0.47 * _settings.voiceSpeed);
      await _tts.awaitSpeakCompletion(true);
      final dynamic installed =
          Platform.isAndroid ? await _tts.isLanguageInstalled('fr-FR') : await _tts.isLanguageAvailable('fr-FR');
      _systemFrenchVoice = installed == true;
    } catch (_) {
      _systemFrenchVoice = false;
    }
  }

  Future<void> _prepareOfflineEngine() async {
    await _startEngine();
    await _brain.refreshState();
  }

  Future<void> _startEngine() async {
    // Moteur partagé avec le reste de l'app : un seul chargement des modèles
    // ASR/TTS en mémoire, qu'on soit sur cet écran ou sur le Dictionnaire.
    _paths = await DunyaSharedSpeech.instance.refresh();
    await DunyaByt5.instance.activateIfInstalled();
    _engine = DunyaSharedSpeech.instance.engineOrNull;
    if (_engine == null) return;
    try {
      if (_paths.canListen) {
        if (mounted) setState(() => _status = 'Préparation de l’écoute…');
        await _engine!.warmUp();
      }
    } catch (error) {
      await _store.audit('dunya_voice_engine_error', {'error': error.toString()}, severity: 'error');
    }
    _status = null;
  }

  Future<void> _loadHistory() async {
    try {
      final messages = await _store.loadMessages(conversationId: _mode.conversationId, limit: 40);
      _turns
        ..clear()
        ..addAll([for (final m in messages) _Turn(role: m.role, text: m.content, sources: m.sources)]);
    } catch (_) {}
  }

  // ---------------------------------------------------------------------------
  // Hands-free loop
  // ---------------------------------------------------------------------------

  Future<void> _onOrbTap() async {
    unawaited(HapticFeedback.lightImpact());
    switch (_phase) {
      case _Phase.preparing:
        return;
      case _Phase.speaking:
        await _interrupt();
        if (_session) unawaited(_listenTurn());
        return;
      case _Phase.thinking:
        await _interrupt();
        return;
      case _Phase.listening:
        await _frenchSpeech.stop();
        await _mic.stop();
        return;
      case _Phase.idle:
        break;
    }
    if (_settings.execution == DunyaExecutionMode.online &&
        !FitilaOffline.online.value) {
      _toast('Internet indisponible. Passez en mode Auto ou rétablissez la connexion.');
      return;
    }
    if (!_useOnlineVoice && _engine == null) {
      setState(() => _status = 'Chargement des voix hors ligne…');
      await _startEngine();
      if (!mounted) return;
    }
    if (!_useOnlineVoice && (!_paths.canListen || _engine == null)) {
      _toast('Pour parler sans Internet, téléchargez d’abord la reconnaissance vocale.');
      await _openSettings();
      return;
    }
    if (!mounted) return;
    final hasMic = await _mic.hasPermission();
    if (!mounted) return;
    if (!hasMic) {
      _toast('DUNYA a besoin du micro pour vous écouter.');
      return;
    }
    _session = true;
    _emptyListens = 0;
    unawaited(_listenTurn());
  }

  Future<void> _endSession() async {
    _session = false;
    await _frenchSpeech.cancel();
    await _interrupt();
    await _mic.cancel();
    if (mounted) setState(() => _phase = _Phase.idle);
  }

  Future<void> _listenTurn() async {
    if (!mounted || !_session) return;
    setState(() {
      _phase = _Phase.listening;
      _level = 0;
      _caption = '';
      _subCaption = null;
      _words = const [];
      _activeWord = -1;
    });
    try {
      if (_useOnlineVoice && _mode == DunyaLanguageMode.french &&
          await _frenchSpeech.available()) {
        final heard = await _frenchSpeech.listen(
          onPartial: (text) { if (mounted) setState(() => _caption = text); },
          onLevel: _onLevel,
        );
        if (!mounted || !_session) return;
        if (heard.isEmpty) {
          _session = false;
          setState(() { _phase = _Phase.idle; _notice = 'Je n’ai pas entendu de phrase en français. Réessayez.'; });
          return;
        }
        await _runCloudVoiceTurn(null, text: heard);
        return;
      }
      if (!_useOnlineVoice) {
        // A mode switch must activate installed models before the first turn.
        await _startEngine();
        await DunyaByt5.instance.activateIfInstalled(userRequested: _mode == DunyaLanguageMode.bariba);
      }
      final samples = await _mic.listen(onLevel: _onLevel,
        silenceToStop: Duration(milliseconds: _mode == DunyaLanguageMode.bariba ? 900 : 700));
      if (!mounted || !_session) return;
      if (samples == null) {
        _emptyListens++;
        if (_emptyListens >= 2 || !_settings.handsFree) {
          _session = false;
          setState(() => _phase = _Phase.idle);
        } else {
          unawaited(_listenTurn());
        }
        return;
      }
      _emptyListens = 0;
      setState(() => _phase = _Phase.thinking);
      if (_useOnlineVoice) {
        await _runCloudVoiceTurn(samples);
      } else {
        final heard = await _engine!.transcribe(samples);
        if (mounted) setState(() => _caption = heard.trim());
        await _runTurn(heard, spoken: true);
      }
    } catch (error) {
      await _store.audit('dunya_voice_error', {'stage': 'listen', 'error': error.toString()}, severity: 'error');
      _session = false;
      if (mounted) {
        setState(() => _phase = _Phase.idle);
        _toast('Écoute interrompue. Vérifiez le micro et réessayez.');
      }
    }
  }

  /// Online voice runs through the exact same server used on Web: Meta
  /// Omnilingual ASR -> FITILA answer/ByT5 -> Meta MMS-TTS Baatɔnum.
  /// No Gemma, ASR or voice package needs to be installed on the phone.
  Future<void> _runCloudVoiceTurn(Float32List? samples, {String? text}) async {
    final mode = _mode;
    final turnId = ++_turnCounter;
    final replyLang = dunyaOnlineLanguage(mode, mode.key);
    var input = text ?? '';
    var answer = '';
    var language = replyLang;
    String? subtitle;
    var gotAudio = false;
    var asrEngine = samples == null ? 'text' : 'unknown';
    var ttsEngine = 'none';
    var brainEngine = 'unknown';
    var fallbackCode = '';
    var usedLocalFallback = false;
    _failedCloudText = null;
    _stopSpeaking = false;
    if (mounted) setState(() => _phase = _Phase.thinking);
    try {
      await _cloudVoice.turn(
        samples: samples,
        text: text,
        language: replyLang,
        replyLanguage: replyLang,
        history: dunyaFrenchReasoningHistory(mode, [
          for (final t in _turns)
            {'role': t.role, 'content': t.text},
        ]),
        onEvent: (event) async {
          if (!mounted || turnId != _turnCounter) return;
          final type = event['type']?.toString() ?? '';
          if (type == 'stage') {
            setState(() => _status = switch (event['stage']) {
              // Same wording as the web mobile DUNYA (reference).
              'waiting' => 'Un instant…',
              'transcribing' => 'Je comprends…',
              'analyzing_transcript' => 'Je vérifie…',
              'thinking' => 'Je réfléchis…',
              'synthesizing' => 'Je prépare la voix…',
              _ => 'Je réfléchis…',
            });
          } else if (type == 'transcript') {
            input = (event['text'] ?? '').toString();
            if (mounted && turnId == _turnCounter) setState(() => _caption = input.trim());
            asrEngine = (event['engine'] ?? asrEngine).toString();
          } else if (type == 'answer') {
            answer = (event['text'] ?? '').toString();
            brainEngine = (event['model'] ?? brainEngine).toString();
            subtitle = event['subtitle']?.toString();
            language = event['lang']?.toString() ?? replyLang;
            setState(() {
              _caption = answer;
              _words = _splitWords(answer);
              _activeWord = -1;
              _subCaption = _settings.frenchSubtitlesInBariba ? subtitle : null;
              _phase = _Phase.speaking;
            });
          } else if (type == 'audio') {
            gotAudio = true;
            ttsEngine = (event['engine'] ?? 'unknown').toString();
            final b64 = event['audio_base64']?.toString();
            if (b64 != null && b64.isNotEmpty) {
              // Play the actual MMS-TTS WAV supplied by the FITILA server.
              _startWordTracking();
              await _player.setPlaybackRate(_settings.voiceSpeed);
              final finished = _player.onPlayerComplete.first;
              await _player.play(audio.BytesSource(base64Decode(b64)));
              await finished.timeout(const Duration(seconds: 60));
              _stopWordTracking(complete: true);
            } else {
              final url = event['audio_url']?.toString() ?? '';
              if (Uri.tryParse(url)?.scheme == 'https') {
                _startWordTracking();
                await _player.setPlaybackRate(_settings.voiceSpeed);
                final finished = _player.onPlayerComplete.first;
                await _player.play(audio.UrlSource(url));
                await finished.timeout(const Duration(seconds: 60));
                _stopWordTracking(complete: true);
              }
            }
          } else if (type == 'notice') {
            fallbackCode = (event['code'] ?? 'fallback').toString();
            if (mounted) setState(() => _notice = 'Service de secours : $fallbackCode');
          }
        },
      );
      if (!mounted || turnId != _turnCounter) return;
      if (answer.trim().isEmpty) throw const DunyaCloudVoiceException('Aucune réponse reçue.');
      if (language == 'fr' && !gotAudio) {
        await _speakOne(DunyaUtterance(answer, 'fr'));
      }
      setState(() {
        _turns.add(_Turn(role: 'user', text: input.isNotEmpty ? input : 'Vocal'));
        _turns.add(_Turn(role: 'assistant', text: answer)..subtitle = subtitle);
        _status = null;
        _notice = [
          'DUNYA en ligne',
          if (samples != null) 'ASR : $asrEngine',
          'IA : $brainEngine',
          if (gotAudio) 'Voix : $ttsEngine',
          if (fallbackCode.isNotEmpty) 'Repli : $fallbackCode',
        ].join(' · ');
      });
      await _quietly(() async {
        await _store.appendMessage(
          DunyaMessage(role: 'user', content: input.isNotEmpty ? input : 'Vocal'),
          conversationId: mode.conversationId,
        );
        await _store.appendMessage(
          DunyaMessage(role: 'assistant', content: answer),
          conversationId: mode.conversationId,
        );
      });
      await _store.audit('dunya_voice_turn', {
        'engine': 'cloud-meta-omnilingual-mms',
        'input': samples == null ? 'text' : 'voice', 'mode': mode.key,
        'asr_engine': asrEngine, 'brain_engine': brainEngine,
        'tts_engine': ttsEngine, 'fallback': fallbackCode,
      });
    } catch (error) {
      if (!mounted || turnId != _turnCounter) return;
      if (mounted) {
        setState(() {
          _failedCloudText = text;
          _notice = 'DUNYA vocal indisponible. Vérifiez la connexion puis réessayez.';
          _status = null;
        });
      }
      await _store.audit('dunya_voice_cloud_error',
          {'error': error.toString()}, severity: 'warning');
      // Automatic mode falls back to the already-installed Omnilingual
      // recognizer and local assistant. Online-only mode never silently
      // changes execution policy.
      if (_settings.execution == DunyaExecutionMode.automatic &&
          samples != null && _paths.canListen && _engine != null && mounted) {
        try {
          final localTranscript = await _engine!.transcribe(samples);
          usedLocalFallback = true;
          await _runTurn(localTranscript, spoken: true);
        } catch (localError) {
          await _store.audit('dunya_voice_offline_fallback_error',
              {'error': localError.toString()}, severity: 'warning');
          usedLocalFallback = false;
        }
      }
    } finally {
      if (!usedLocalFallback && mounted && turnId == _turnCounter) {
        _status = null;
        // Never restart hands-free recording after a failed cloud turn.
        if (_notice == 'DUNYA vocal indisponible. Vérifiez la connexion puis réessayez.') {
          _session = false;
          setState(() => _phase = _Phase.idle);
        } else if (_session && _settings.handsFree) {
          unawaited(_listenTurn());
        } else {
          setState(() => _phase = _Phase.idle);
        }
      }
    }
  }

  void _onLevel(double level) {
    if (mounted) setState(() => _level = level);
  }

  /// One full turn: understand -> answer (streamed) -> speak -> listen again.
  Future<void> _runTurn(String heard, {required bool spoken}) async {
    final clean = heard.trim();
    if (clean.isEmpty) {
      if (_session && _settings.handsFree) {
        unawaited(_listenTurn());
      } else {
        setState(() => _phase = _Phase.idle);
      }
      return;
    }
    final turnId = ++_turnCounter;
    _bargeTurn = null;
    _stopSpeaking = false;
    final mode = _mode;
    if (!_useOnlineVoice) {
      await _startEngine();
      await DunyaByt5.instance.activateIfInstalled(userRequested: mode == DunyaLanguageMode.bariba);
      if (!mounted) return;
    }
    final answer = _Turn(role: 'assistant', text: '');
    setState(() {
      _turns.add(_Turn(role: 'user', text: clean));
      _turns.add(answer);
      _phase = _Phase.thinking;
      _caption = spoken ? clean : '';
      _words = const [];
      _activeWord = -1;
      _notice = null;
    });
    _scrollToEnd();

    final speechQueue = StreamController<DunyaSentenceEvent>();
    final speaking = _speakQueue(speechQueue.stream);
    final barge = spoken && _settings.handsFree && !_useOnlineVoice
        ? _watchBargeIn(turnId) : Future<void>.value();

    DunyaDoneEvent? done;
    try {
      await for (final event in _assistant.reply(clean, mode)) {
        if (!mounted || _bargeTurn == turnId) break;
        switch (event) {
          case DunyaStatusEvent s:
            setState(() => _status = s.label);
          case DunyaSentenceEvent s:
            setState(() {
              answer.text = '${answer.text} ${s.utterance.text}'.trim();
              if (s.subtitle != null) answer.subtitle = '${answer.subtitle ?? ''} ${s.subtitle}'.trim();
            });
            _scrollToEnd();
            if (!speechQueue.isClosed) speechQueue.add(s);
          case DunyaDoneEvent d:
            done = d;
        }
      }
    } catch (error) {
      await _store.audit('dunya_voice_error', {'stage': 'reply', 'error': error.toString()}, severity: 'error');
      if (answer.text.isEmpty) answer.text = 'Je n’ai pas pu répondre. Réessayez.';
    } finally {
      await speechQueue.close();
    }
    await speaking;
    _status = null;
    final result = done;
    if (result != null) {
      answer.sources = result.sources;
      _pending = result.pending;
      _notice = result.notice;
      if (answer.text.isEmpty) answer.text = result.display;
    }
    if (mounted) setState(() {});

    await _quietly(() async {
      await _store.appendMessage(DunyaMessage(role: 'user', content: clean), conversationId: mode.conversationId);
      await _store.appendMessage(
        DunyaMessage(role: 'assistant', content: answer.text, sources: answer.sources),
        conversationId: mode.conversationId,
      );
    });
    final interrupted = _bargeTurn == turnId;
    await _store.audit('dunya_voice_turn', {
      'input': spoken ? 'voice' : 'text',
      'mode': mode.key,
      'engine': result?.engine,
      'barge_in': interrupted,
    });

    if (!mounted) return;
    if (interrupted) {
      await barge; // the barge-in listener captures and runs the next request
      return;
    }
    if (turnId != _turnCounter) return; // a newer turn already started
    await _stopBargeWatch();
    if (_session && _settings.handsFree && spoken) {
      unawaited(_listenTurn());
    } else {
      setState(() => _phase = _Phase.idle);
    }
  }

  /// Barge-in: listen while DUNYA answers, with a stronger threshold so its
  /// own voice through the speaker does not count as the user speaking.
  Future<void> _watchBargeIn(int turnId) async {
    final watch = Completer<void>();
    _bargeWatch = watch;
    // Give DUNYA a head start so its first syllables are not mistaken for speech.
    await Future<void>.delayed(const Duration(milliseconds: 700));
    if (watch.isCompleted || !_session || !mounted || turnId != _turnCounter) return;
    try {
      final samples = await _mic.listen(
        minThreshold: 0.07,
        minSpeech: const Duration(milliseconds: 380),
        noSpeechTimeout: const Duration(minutes: 3),
        onSpeechStart: () {
          if (watch.isCompleted || turnId != _turnCounter) return;
          _bargeTurn = turnId;
          unawaited(_interrupt(keepListening: true));
          if (mounted) setState(() => _phase = _Phase.listening);
        },
        onLevel: (l) {
          if (_bargeTurn == turnId) _onLevel(l);
        },
      );
      if (_bargeTurn != turnId || samples == null || !mounted || !_session) return;
      setState(() => _phase = _Phase.thinking);
      final heard = await _engine!.transcribe(samples);
      unawaited(_runTurn(heard, spoken: true));
    } catch (_) {
      // Barge-in is best effort.
    } finally {
      if (!watch.isCompleted) watch.complete();
    }
  }

  Future<void> _stopBargeWatch() async {
    final watch = _bargeWatch;
    _bargeWatch = null;
    if (watch != null && !watch.isCompleted) {
      watch.complete();
      await _mic.cancel();
    }
  }

  Future<void> _interrupt({bool keepListening = false}) async {
    _stopSpeaking = true;
    _stopWordTracking();
    _cloudVoice.cancel();
    await _assistant.interrupt();
    await _tts.stop();
    await _player.stop();
    if (!keepListening) {
      await _stopBargeWatch();
      if (mounted) setState(() => _phase = _Phase.idle);
    }
  }

  // ---------------------------------------------------------------------------
  // Speaking
  // ---------------------------------------------------------------------------

  /// Découpe [text] en mots pour le surlignage karaoké ; à appeler avec
  /// l'affectation de `_caption` dans le même `setState`.
  List<String> _splitWords(String text) =>
      text.split(RegExp(r'\s+')).where((w) => w.isNotEmpty).toList(growable: false);

  /// Démarre le suivi de la position de lecture pour avancer `_activeWord`
  /// proportionnellement à la position dans l'audio (pas d'alignement
  /// phonétique exact disponible côté TTS, comme pour Fitila IA).
  void _startWordTracking() {
    unawaited(_posSub?.cancel());
    unawaited(_durSub?.cancel());
    _audioDuration = Duration.zero;
    _durSub = _player.onDurationChanged.listen((d) => _audioDuration = d);
    _posSub = _player.onPositionChanged.listen((pos) {
      if (!mounted) return;
      final total = _audioDuration.inMilliseconds;
      if (total <= 0 || _words.isEmpty) return;
      final fraction = (pos.inMilliseconds / total).clamp(0.0, 1.0);
      final idx = (fraction * _words.length).floor().clamp(0, _words.length - 1);
      if (idx != _activeWord) setState(() => _activeWord = idx);
    });
  }

  void _stopWordTracking({bool complete = false}) {
    unawaited(_posSub?.cancel());
    unawaited(_durSub?.cancel());
    _posSub = null;
    _durSub = null;
    if (complete && mounted && _words.isNotEmpty) {
      setState(() => _activeWord = _words.length);
    }
  }

  /// Plays sentences as they arrive, while the NEXT sentence's offline voice
  /// is already being synthesized in the background isolate — so by the time
  /// one sentence finishes playing, the next is normally already to hand
  /// instead of leaving dead air for its synthesis. (The online cloud voice
  /// already overlaps translation/synthesis server-side; this mirrors that
  /// for the fully offline voice.)
  Future<void> _speakQueue(Stream<DunyaSentenceEvent> sentences) async {
    DunyaSentenceEvent? queued;
    Future<String?>? queuedAudio;

    Future<void> playQueued() async {
      final s = queued!;
      final prepared = await queuedAudio;
      if (_stopSpeaking || !mounted) return;
      setState(() {
        _phase = _Phase.speaking;
        _caption = s.utterance.text;
        _words = _splitWords(s.utterance.text);
        _activeWord = -1;
        _subCaption = _settings.frenchSubtitlesInBariba ? s.subtitle : null;
      });
      await _speakOne(s.utterance, prepared: prepared);
    }

    await for (final s in sentences) {
      if (_stopSpeaking || !mounted) continue;
      // Start this sentence's synthesis now, so it overlaps with whatever is
      // still playing from the previous one.
      final audioFuture = _synthesizeAhead(s.utterance);
      if (queued != null) await playQueued();
      queued = s;
      queuedAudio = audioFuture;
    }
    if (queued != null) await playQueued();
  }

  /// Kicks off offline synthesis for [u] without playing it. Returns null for
  /// the phone's own French voice (which synthesizes and speaks in one step,
  /// nothing to prefetch) or when offline speech is unavailable.
  Future<String?> _synthesizeAhead(DunyaUtterance u) async {
    try {
      if (u.lang == 'bba') {
        if (_paths.canSpeakBariba && _engine != null) {
          return await _engine!.synthesize(u.text, 'bba', speed: 0.85 * _settings.voiceSpeed);
        }
      } else if (!_systemFrenchVoice && _paths.canSpeakFrenchOffline && _engine != null) {
        return await _engine!.synthesize(u.text, 'fra', speed: _settings.voiceSpeed);
      }
    } catch (error) {
      await _store.audit('dunya_voice_speak_error', {'error': error.toString()}, severity: 'warning');
    }
    return null;
  }

  /// [prepared] is the already-resolved result of [_synthesizeAhead] (the
  /// caller awaits it to know when to flip to the "speaking" phase, so by the
  /// time this runs it is a plain value, not a Future); omitting it
  /// synthesizes inline, as replay/confirm do, with nothing to prefetch
  /// against.
  Future<void> _speakOne(DunyaUtterance u, {String? prepared}) async {
    try {
      if (u.lang == 'bba') {
        if (_paths.canSpeakBariba && _engine != null) {
          final path = prepared ?? await _engine!.synthesize(u.text, 'bba', speed: 0.85 * _settings.voiceSpeed);
          await _playFile(path);
        }
      } else if (_systemFrenchVoice) {
        await _tts.setSpeechRate(0.47 * _settings.voiceSpeed);
        // La voix système ne fournit pas d'événement de position : pas de
        // surlignage progressif possible ici, mais on marque le texte comme
        // lu une fois la lecture terminée plutôt que de le laisser estompé.
        await _tts.speak(u.text);
        if (mounted && _words.isNotEmpty) setState(() => _activeWord = _words.length);
      } else if (_paths.canSpeakFrenchOffline && _engine != null) {
        final path = prepared ?? await _engine!.synthesize(u.text, 'fra', speed: _settings.voiceSpeed);
        await _playFile(path);
      }
    } catch (error) {
      await _store.audit('dunya_voice_speak_error', {'error': error.toString()}, severity: 'warning');
    }
  }

  Future<void> _playFile(String path) async {
    if (_stopSpeaking) return;
    // La vitesse est déjà appliquée à la synthèse elle-même (speed:
    // 0.85 * voiceSpeed / voiceSpeed plus haut) pour ce chemin hors ligne ;
    // on ne la réapplique pas ici sur le lecteur pour ne pas la cumuler.
    _startWordTracking();
    final done = _player.onPlayerComplete.first;
    await _player.play(audio.DeviceFileSource(path));
    await done.timeout(const Duration(seconds: 90), onTimeout: () {});
    _stopWordTracking(complete: true);
  }

  Future<void> _replay(_Turn turn) async {
    if (_phase != _Phase.idle) return;
    _stopSpeaking = false;
    setState(() {
      _phase = _Phase.speaking;
      _caption = turn.text;
      _words = _splitWords(turn.text);
      _activeWord = -1;
      _subCaption = _settings.frenchSubtitlesInBariba ? turn.subtitle : null;
    });
    await _speakOne(DunyaUtterance(turn.text, _mode == DunyaLanguageMode.bariba ? 'bba' : 'fr'));
    if (mounted) setState(() => _phase = _Phase.idle);
  }

  // ---------------------------------------------------------------------------
  // Text view and confirmations
  // ---------------------------------------------------------------------------

  Future<void> _sendText() async {
    final text = _composer.text.trim();
    if (text.isEmpty || _phase == _Phase.thinking) return;
    _composer.clear();
    await _interrupt();
    if (_useOnlineVoice) {
      await _runCloudVoiceTurn(null, text: text);
    } else {
      await _runTurn(text, spoken: false);
    }
  }

  Future<void> _confirm(bool yes) async {
    await _interrupt();
    setState(() => _phase = _Phase.thinking);
    try {
      final reply = await _skills.confirm(yes, _skillLanguage);
      setState(() {
        _pending = null;
        _turns.add(_Turn(role: 'user', text: yes ? 'Oui' : 'Non'));
        _turns.add(_Turn(role: 'assistant', text: reply.display));
      });
      _stopSpeaking = false;
      for (final u in reply.speech) {
        await _speakOne(u);
      }
    } catch (_) {
      _toast('L’action n’a pas pu être réalisée.');
    }
    if (mounted) setState(() => _phase = _Phase.idle);
  }

  Future<void> _newConversation() async {
    await _interrupt();
    await _quietly(() => _store.clearMessages(_mode.conversationId));
    _brain.resetConversation();
    if (!mounted) return;
    setState(() {
      _turns.clear();
      _caption = '';
      _words = const [];
      _activeWord = -1;
      _notice = null;
    });
  }

  Future<void> _setMode(DunyaLanguageMode mode) async {
    if (mode == _mode) return;
    await _endSession();
    await _settings.update(mode: mode);
    _brain.resetConversation();
    await _loadHistory();
    if (mounted) setState(() {});
  }

  // ---------------------------------------------------------------------------
  // Sheets
  // ---------------------------------------------------------------------------

  /// First launch: no blocking welcome sheet. The language selector is always
  /// visible at the top of the screen, French by default.
  Future<void> _completeFirstLaunch() async {
    await _settings.update(onboarded: true);
    final info = await _brain.deviceInfo();
    if (!mounted) return;
    // Online and Auto-with-Internet go straight into DUNYA without forcing a
    // model download. Offline mode opens Settings only when voice is missing.
    if (!_useOnlineVoice &&
        (!_paths.canListen ||
          (info.canRun(_brain.model) && _brain.state == DunyaBrainState.absent))) {
      await _openSettings();
    }
  }

  Future<void> _openSettings() async {
    await _endSession();
    if (!mounted) return;
    await showModalBottomSheet<void>(
      context: context,
      showDragHandle: true,
      isScrollControlled: true,
      backgroundColor: const Color(0xFFF9FCFA),
      builder: (_) => _SettingsSheet(
        paths: _paths,
        onInstallVoiceFile: _installVoiceFile,
        onDownloadVoice: _downloadVoice,
        onClear: _newConversation,
      ),
    );
    await _brain.refreshState();
    if (mounted) setState(() {});
  }

  Future<void> _installVoiceFile() async {
    final picked = await FilePicker.platform.pickFiles(type: FileType.any);
    final path = picked?.files.single.path;
    if (path == null) return;
    final cache = await getTemporaryDirectory();
    final isCacheCopy = path.startsWith(cache.path) || path.contains('/cache/');
    if (looksLikeBrainFile(path)) {
      await _runJob(
        'Installation du cerveau…',
        (progress) => _brain.installFromFile(path, onProgress: progress, deleteSource: isCacheCopy),
      );
      return;
    }
    await _runJob('Installation du pack…', (progress) async {
      await _packs.installFromFile(path, deleteSource: isCacheCopy, onProgress: (p) => progress(p.fraction, p.detail));
      await _startEngine();
    });
  }

  Future<void> _downloadVoice(DunyaPackSource source) => _runJob('Téléchargement…', (progress) async {
        await _packs.download(source, onProgress: (p) => progress(p.fraction, p.detail));
        await _startEngine();
      });

  /// Download/installation without a blocking dialog: users may keep using
  /// FITILA while the pack manager streams to its resumable .download.zip.
  /// This remains an in-process transfer; it is not an Android foreground
  /// service and Android may suspend it if the application is terminated.
  Future<void> _runJob(String title, Future<void> Function(void Function(double?, String) progress) job) async {
    if (!mounted) return;
    final messenger = ScaffoldMessenger.maybeOf(context);
    void report(String label, {bool done = false}) {
      if (messenger == null) return;
      messenger.hideCurrentSnackBar();
      messenger.showSnackBar(SnackBar(
        duration: Duration(seconds: done ? 5 : 10),
        content: Text(label, maxLines: 2, overflow: TextOverflow.ellipsis),
      ));
    }
    report('$title Vous pouvez continuer à utiliser FITILA.');
    var lastBucket = -1;
    try {
      await job((fraction, label) {
        final bucket = fraction == null ? -1 : (fraction * 10).floor().clamp(0, 10);
        if (bucket != lastBucket) {
          lastBucket = bucket;
          report(fraction == null ? '$title $label' : '$title ${(fraction * 100).round()} % — $label');
        }
      });
      if (mounted) await _startEngine();
      report('Pack installé et vérifié.', done: true);
    } catch (error) {
      report(error is DunyaPackException
        ? '$error — Relancez pour reprendre le téléchargement.'
        : error is DunyaBrainException
          ? 'Ce pack ne peut pas être installé sur cet appareil.'
          : 'Téléchargement interrompu. Réessayez pour reprendre.', done: true);
    } finally {
      await _brain.refreshState();
      if (mounted) setState(() {});
    }
  }

  // ---------------------------------------------------------------------------
  // UI helpers
  // ---------------------------------------------------------------------------

  Future<void> _quietly(Future<void> Function() job) async {
    try {
      await job();
    } catch (error) {
      await _store.audit('dunya_voice_store_error', {'error': error.toString()}, severity: 'warning');
    }
  }

  void _toast(String message) {
    ScaffoldMessenger.maybeOf(context)?.showSnackBar(SnackBar(content: Text(message)));
  }

  void _scrollToEnd() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scroll.hasClients) {
        _scroll.animateTo(_scroll.position.maxScrollExtent, duration: const Duration(milliseconds: 240), curve: Curves.easeOut);
      }
    });
  }

  String get _phaseLabel => switch (_phase) {
        _Phase.preparing => _status ?? 'Préparation…',
        _Phase.idle => !_useOnlineVoice && !_paths.canListen ? 'Installez la voix DUNYA' : 'Appuyez pour parler',
        _Phase.listening => 'Je vous écoute',
        _Phase.thinking => _status ?? 'Je réfléchis…',
        _Phase.speaking => 'Appuyez pour interrompre',
      };

  bool get _busy => _session || _phase == _Phase.listening || _phase == _Phase.thinking || _phase == _Phase.speaking;

  // ---------------------------------------------------------------------------
  // Build
  // ---------------------------------------------------------------------------

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: const BoxDecoration(
        gradient: RadialGradient(
          center: Alignment(0, -0.25),
          radius: 1.1,
          colors: [Color(0xFF2A2135), Color(0xFF15111C), Color(0xFF0E0B13)],
          stops: [0, 0.55, 1],
        ),
      ),
      child: SafeArea(
        child: Column(
          children: [
            _topBar(),
            Expanded(child: _textView ? _chatView() : _voiceView()),
            if (_pending != null && _phase != _Phase.thinking) _confirmBar(_pending!),
            _textView ? _composerBar() : _controls(),
          ],
        ),
      ),
    );
  }

  Widget _topBar() => Padding(
        padding: const EdgeInsets.fromLTRB(12, 10, 12, 6),
        child: Row(
          children: [
            Flexible(child: _languageSelector()),
            if (!_useOnlineVoice) ...[
              const SizedBox(width: 6),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 5),
                decoration: BoxDecoration(color: const Color(0x26E0A03C), borderRadius: BorderRadius.circular(999)),
                child: const Text('Hors ligne', style: TextStyle(color: Color(0xFFF0C979), fontSize: 13, fontWeight: FontWeight.w800)),
              ),
            ],
            const Spacer(),
            _circleButton(
              tooltip: _textView ? 'Voix' : 'Écrire',
              icon: _textView ? Icons.mic_none_rounded : Icons.keyboard_rounded,
              selected: _textView,
              onTap: () => setState(() => _textView = !_textView),
            ),
            const SizedBox(width: 8),
            PopupMenuButton<String>(
              tooltip: 'Plus d’options',
              color: const Color(0xFF221C2B),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
              position: PopupMenuPosition.under,
              onSelected: (value) {
                if (value == 'new') unawaited(_newConversation());
                if (value == 'settings') unawaited(_openSettings());
              },
              itemBuilder: (_) => const [
                PopupMenuItem(value: 'new', height: 52, child: _MenuRow(icon: Icons.restart_alt_rounded, label: 'Nouvelle conversation')),
                PopupMenuItem(value: 'settings', height: 52, child: _MenuRow(icon: Icons.tune_rounded, label: 'Réglages')),
              ],
              child: Container(
                width: 46,
                height: 46,
                decoration: BoxDecoration(
                  color: const Color(0x12FFFFFF),
                  shape: BoxShape.circle,
                  border: Border.all(color: const Color(0x1AFFFFFF)),
                ),
                child: const Icon(Icons.more_horiz_rounded, color: Colors.white),
              ),
            ),
          ],
        ),
      );

  Widget _languageSelector() => Container(
        padding: const EdgeInsets.all(4),
        decoration: BoxDecoration(
          color: const Color(0x12FFFFFF),
          borderRadius: BorderRadius.circular(999),
          border: Border.all(color: const Color(0x1AFFFFFF)),
        ),
        child: SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              for (final m in DunyaLanguageMode.values)
                Semantics(
                  selected: m == _mode,
                  button: true,
                  label: m.label,
                  excludeSemantics: true,
                  child: GestureDetector(
                    onTap: () => _setMode(m),
                    child: AnimatedContainer(
                      duration: const Duration(milliseconds: 180),
                      constraints: const BoxConstraints(minHeight: 38),
                      alignment: Alignment.center,
                      padding: const EdgeInsets.symmetric(horizontal: 12),
                      decoration: BoxDecoration(
                        color: m == _mode ? _gold : Colors.transparent,
                        borderRadius: BorderRadius.circular(999),
                      ),
                      child: Text(
                        switch (m) {
                          DunyaLanguageMode.french => 'FR',
                          DunyaLanguageMode.bariba => 'Baatɔnum',
                        },
                        style: TextStyle(
                          color: m == _mode ? _ink : Colors.white70,
                          fontWeight: FontWeight.w800,
                          fontSize: 14,
                        ),
                      ),
                    ),
                  ),
                ),
            ],
          ),
        ),
      );

  Widget _circleButton({required String tooltip, required IconData icon, required VoidCallback onTap, bool selected = false}) =>
      Tooltip(
        message: tooltip,
        child: Semantics(
          button: true,
          label: tooltip,
          excludeSemantics: true,
          child: Material(
            color: selected ? Colors.white : const Color(0x12FFFFFF),
            shape: const CircleBorder(side: BorderSide(color: Color(0x1AFFFFFF))),
            child: InkWell(
              customBorder: const CircleBorder(),
              onTap: onTap,
              child: SizedBox(width: 46, height: 46, child: Icon(icon, color: selected ? _ink : Colors.white, size: 22)),
            ),
          ),
        ),
      );

  Widget _pill({required String label, required IconData icon, required VoidCallback onTap, bool active = true, bool danger = false}) =>
      Material(
        color: danger ? const Color(0xFFC2483F) : active ? const Color(0x17FFFFFF) : Colors.transparent,
        shape: StadiumBorder(side: BorderSide(color: danger ? const Color(0xFFC2483F) : const Color(0x26FFFFFF))),
        child: InkWell(
          customBorder: const StadiumBorder(),
          onTap: onTap,
          child: ConstrainedBox(
            constraints: const BoxConstraints(minHeight: 50),
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(icon, size: 19, color: active || danger ? Colors.white : Colors.white54),
                  const SizedBox(width: 8),
                  Text(label, style: TextStyle(color: active || danger ? Colors.white : Colors.white54, fontSize: 15, fontWeight: FontWeight.w800)),
                ],
              ),
            ),
          ),
        ),
      );

  /// Le texte de la réponse : surligné mot par mot au fil de la lecture
  /// audio pendant `speaking` (effet « karaoké »), texte simple sinon.
  Widget _captionWidget() {
    if (_phase != _Phase.speaking || _words.isEmpty) {
      return Text(
        _caption,
        textAlign: TextAlign.center,
        maxLines: 5,
        overflow: TextOverflow.ellipsis,
        style: const TextStyle(color: const Color(0xFF192B24), fontSize: 21, height: 1.3, fontWeight: FontWeight.w600),
      );
    }
    return Wrap(
      alignment: WrapAlignment.center,
      runSpacing: 4,
      children: [
        for (var i = 0; i < _words.length; i++)
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 3),
            child: AnimatedDefaultTextStyle(
              duration: const Duration(milliseconds: 300),
              curve: Curves.easeOut,
              style: TextStyle(
                color: i <= _activeWord ? const Color(0xFF192B24) : const Color(0xFF88958F),
                fontSize: 21,
                fontWeight: FontWeight.w600,
                height: 1.3,
              ),
              child: Text(_words[i]),
            ),
          ),
      ],
    );
  }

  Widget _voiceView() {
    final users = _turns.where((t) => t.role == 'user');
    final lastUser = users.isEmpty ? '' : users.last.text;
    final assistants = _turns.where((t) => t.role == 'assistant' && t.text.isNotEmpty);
    final lastAssistant = assistants.isEmpty ? null : assistants.last;
    return Column(
      children: [
        const Spacer(),
        Semantics(
          button: true,
          label: _phaseLabel,
          child: GestureDetector(
            onTap: _onOrbTap,
            child: AnimatedBuilder(
              animation: _orb,
              builder: (_, _) => CustomPaint(
                size: const Size(240, 240),
                painter: _OrbPainter(t: _orb.value, phase: _phase, level: _level),
              ),
            ),
          ),
        ),
        const SizedBox(height: 20),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24),
          child: Text(
            _phaseLabel,
            textAlign: TextAlign.center,
            style: const TextStyle(color: Colors.white, fontSize: 24, fontWeight: FontWeight.w800, letterSpacing: -0.2),
          ),
        ),
        if (lastAssistant != null && _phase != _Phase.listening) ...[
          const SizedBox(height: 14),
          _pill(label: 'Réécouter', icon: Icons.volume_up_rounded, onTap: () => _replay(lastAssistant)),
        ],
        const Spacer(),
        if (_settings.subtitles && (_caption.isNotEmpty || (_phase == _Phase.thinking && lastUser.isNotEmpty)))
          Flexible(
            flex: 2,
            child: SingleChildScrollView(
              padding: const EdgeInsets.fromLTRB(18, 0, 18, 14),
              child: Container(
                width: double.infinity,
                padding: const EdgeInsets.all(18),
                decoration: BoxDecoration(
                  color: const Color(0xFFF9F7F0),
                  borderRadius: BorderRadius.circular(22),
                  border: Border.all(color: const Color(0xFFD1E4D7)),
                  boxShadow: const [BoxShadow(color: Color(0x66000000), blurRadius: 20, offset: Offset(0, 8))],
                ),
                child: DefaultTextStyle(
                  style: const TextStyle(color: Color(0xFF1D2430), fontSize: 20, height: 1.45, fontWeight: FontWeight.w600),
                  child: Column(
              children: [
                if (_phase == _Phase.thinking && lastUser.isNotEmpty)
                  Text(
                    '« $lastUser »',
                    textAlign: TextAlign.center,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(color: Color(0xFF495951), fontSize: 17),
                  ),
                if (_caption.isNotEmpty)
                  AnimatedSwitcher(
                    duration: const Duration(milliseconds: 250),
                    child: KeyedSubtree(key: ValueKey(_phase), child: _captionWidget()),
                  ),
                if (_subCaption != null && _subCaption!.isNotEmpty) ...[
                  const SizedBox(height: 8),
                  Text(
                    _subCaption!,
                    textAlign: TextAlign.center,
                    maxLines: 3,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(color: Color(0xFF495951), fontSize: 16),
                  ),
                ],
              ],
                  ),
                ),
              ),
            ),
          ),
        if (_notice != null)
          Padding(
            padding: const EdgeInsets.fromLTRB(24, 0, 24, 10),
            child: Column(
              children: [
                Text(_notice!, textAlign: TextAlign.center,
                    style: const TextStyle(color: Color(0xFFF0C979), fontSize: 16, fontWeight: FontWeight.w600)),
                if (_phase == _Phase.idle &&
                    _notice == 'DUNYA vocal indisponible. Vérifiez la connexion puis réessayez.')
                  TextButton.icon(
                    onPressed: () {
                      final lastText = _failedCloudText;
                      setState(() => _notice = null);
                      if (lastText != null && lastText.isNotEmpty) {
                        unawaited(_runCloudVoiceTurn(null, text: lastText));
                      } else {
                        unawaited(_onOrbTap());
                      }
                    },
                    style: TextButton.styleFrom(foregroundColor: _gold),
                    icon: const Icon(Icons.refresh_rounded),
                    label: const Text('Réessayer', style: TextStyle(fontWeight: FontWeight.w800)),
                  ),
              ],
            ),
          ),
        if (_turns.isEmpty && _phase == _Phase.idle) _suggestions(),
      ],
    );
  }

  Widget _suggestions() {
    final items = switch (_mode) {
      // Same suggestions as the web mobile DUNYA (reference).
      DunyaLanguageMode.bariba => const ['A kua', 'Bɛɛ ka weru'],
      _ => const ['Rotation des cultures ?', 'Dire merci en baatɔnum'],
    };
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 0, 20, 14),
      child: Wrap(
        alignment: WrapAlignment.center,
        spacing: 8,
        runSpacing: 8,
        children: [
          for (final s in items)
            Material(
              color: const Color(0x10FFFFFF),
              shape: const StadiumBorder(side: BorderSide(color: Color(0x1AFFFFFF))),
              child: InkWell(
                customBorder: const StadiumBorder(),
                onTap: () => _runTurn(s, spoken: false),
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 11),
                  child: Text(s, style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.w500)),
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _chatView() {
    if (_turns.isEmpty) {
      return const Center(
        child: Text('Écrivez votre message', style: TextStyle(color: Colors.white70, fontSize: 19, fontWeight: FontWeight.w600)),
      );
    }
    return ListView.builder(
      controller: _scroll,
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
      itemCount: _turns.length,
      itemBuilder: (_, i) => _bubble(_turns[i]),
    );
  }

  Widget _bubble(_Turn t) {
    final user = t.role == 'user';
    if (user) {
      return Align(
        alignment: Alignment.centerRight,
        child: Container(
          margin: const EdgeInsets.only(top: 12, left: 52),
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 11),
          decoration: const BoxDecoration(
            color: _gold,
            borderRadius: BorderRadius.only(
              topLeft: Radius.circular(22), topRight: Radius.circular(22),
              bottomLeft: Radius.circular(22), bottomRight: Radius.circular(6),
            ),
          ),
          child: SelectableText(t.text, style: const TextStyle(color: _ink, fontSize: 18, height: 1.4)),
        ),
      );
    }
    return Align(
      alignment: Alignment.centerLeft,
      child: Padding(
        padding: const EdgeInsets.only(top: 12, right: 32),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              decoration: BoxDecoration(
                color: const Color(0x12FFFFFF),
                border: Border.all(color: const Color(0x1AFFFFFF)),
                borderRadius: const BorderRadius.only(
                  topLeft: Radius.circular(22), topRight: Radius.circular(22),
                  bottomLeft: Radius.circular(6), bottomRight: Radius.circular(22),
                ),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  SelectableText(
                    t.text.isEmpty ? '…' : t.text,
                    style: const TextStyle(color: Colors.white, fontSize: 18, height: 1.55),
                  ),
                  if (t.subtitle != null && _settings.frenchSubtitlesInBariba) ...[
                    const Divider(color: Color(0x1AFFFFFF), height: 18),
                    Text(t.subtitle!, style: const TextStyle(color: Colors.white70, fontSize: 16)),
                  ],
                ],
              ),
            ),
            if (t.text.isNotEmpty)
              Wrap(
                crossAxisAlignment: WrapCrossAlignment.center,
                children: [
                  _smallAction('Écouter', Icons.volume_up_rounded, () => _replay(t)),
                  _smallAction('Copier', Icons.copy_rounded, () => Clipboard.setData(ClipboardData(text: t.text))),
                  _smallAction('Garder', Icons.bookmark_add_outlined, () => _quietly(() => _store.saveMemory(t.text))),
                  for (final s in t.sources.take(2))
                    Padding(
                      padding: const EdgeInsets.only(right: 6),
                      child: ActionChip(
                        visualDensity: VisualDensity.compact,
                        backgroundColor: const Color(0xFF2A2333),
                        side: BorderSide.none,
                        label: Text(s.title, style: const TextStyle(color: _gold, fontSize: 14, fontWeight: FontWeight.w800)),
                        onPressed: () => _showSource(s),
                      ),
                    ),
                ],
              ),
          ],
        ),
      ),
    );
  }

  Widget _smallAction(String label, IconData icon, VoidCallback onTap) => TextButton.icon(
        onPressed: onTap,
        style: TextButton.styleFrom(
          foregroundColor: Colors.white,
          minimumSize: const Size(48, 48),
          textStyle: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700),
        ),
        icon: Icon(icon, size: 20),
        label: Text(label),
      );

  Future<void> _showSource(DunyaSource s) => showModalBottomSheet<void>(
        context: context,
        showDragHandle: true,
        backgroundColor: _cream,
        builder: (_) => SafeArea(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(18, 0, 18, 18),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(s.title, style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w900, color: _ink)),
                const SizedBox(height: 10),
                Text(s.text, style: const TextStyle(fontSize: 15, height: 1.5, color: Color(0xFF4A4454))),
              ],
            ),
          ),
        ),
      );

  Widget _composerBar() => Padding(
        padding: EdgeInsets.fromLTRB(12, 6, 12, MediaQuery.viewPaddingOf(context).bottom + 10),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            Expanded(
              child: TextField(
                controller: _composer,
                minLines: 1,
                maxLines: 4,
                style: const TextStyle(color: Colors.white, fontSize: 17),
                textInputAction: TextInputAction.send,
                onSubmitted: (_) => _sendText(),
                decoration: InputDecoration(
                  hintText: _mode == DunyaLanguageMode.bariba ? 'Écrire en baatɔnum…' : 'Écrire à DUNYA…',
                  hintStyle: const TextStyle(color: Colors.white38),
                  filled: true,
                  fillColor: const Color(0x14FFFFFF),
                  contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 15),
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(26),
                    borderSide: const BorderSide(color: Color(0x1AFFFFFF)),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(26),
                    borderSide: const BorderSide(color: _gold),
                  ),
                ),
              ),
            ),
            const SizedBox(width: 8),
            IconButton.filled(
              tooltip: _phase == _Phase.thinking ? 'Arrêter' : 'Envoyer',
              style: IconButton.styleFrom(backgroundColor: _gold, foregroundColor: _ink, minimumSize: const Size(56, 56)),
              onPressed: _phase == _Phase.thinking ? _interrupt : _sendText,
              icon: Icon(_phase == _Phase.thinking ? Icons.stop_rounded : Icons.send_rounded),
            ),
          ],
        ),
      );

  Widget _controls() => Padding(
        padding: EdgeInsets.fromLTRB(20, 4, 20, MediaQuery.viewPaddingOf(context).bottom + 16),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            _pill(
              label: 'Sous-titres',
              icon: _settings.subtitles ? Icons.closed_caption_rounded : Icons.closed_caption_off_rounded,
              active: _settings.subtitles,
              onTap: () => _settings.update(subtitles: !_settings.subtitles),
            ),
            if (_busy) ...[
              const SizedBox(width: 12),
              _pill(label: 'Arrêter', icon: Icons.close_rounded, danger: true, onTap: _endSession),
            ],
          ],
        ),
      );

  Widget _confirmBar(DunyaPendingAction pending) => Container(
        margin: const EdgeInsets.fromLTRB(14, 0, 14, 8),
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(color: const Color(0xFF2E2638), borderRadius: BorderRadius.circular(18)),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(pending.summary, style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.w800)),
            const SizedBox(height: 10),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: () => _confirm(false),
                    style: OutlinedButton.styleFrom(minimumSize: const Size.fromHeight(56), foregroundColor: Colors.white),
                    child: const Text('Non'),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: FilledButton(
                    onPressed: () => _confirm(true),
                    style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(56), backgroundColor: _sage),
                    child: const Text('Oui'),
                  ),
                ),
              ],
            ),
          ],
        ),
      );
}

// ---------------------------------------------------------------------------
// Orb
// ---------------------------------------------------------------------------

class _OrbPainter extends CustomPainter {
  _OrbPainter({required this.t, required this.phase, required this.level});

  final double t;
  final _Phase phase;
  final double level;

  @override
  void paint(Canvas canvas, Size size) {
    final c = size.center(Offset.zero);
    final (Color light, Color mid, Color deep) = switch (phase) {
      _Phase.listening => (const Color(0xFFFFE9B8), const Color(0xFFF2A94A), const Color(0xFF9A4A14)),
      _Phase.thinking => (const Color(0xFFD9D2FF), const Color(0xFF8E7CFF), const Color(0xFF3A2A9C)),
      _Phase.speaking => (const Color(0xFFC9F5DF), const Color(0xFF4FC892), const Color(0xFF155E4A)),
      _Phase.preparing => (const Color(0xFFB7B0C4), const Color(0xFF6B6478), const Color(0xFF2E2938)),
      _Phase.idle => (const Color(0xFFFFE3A3), const Color(0xFFE3B04B), const Color(0xFF7A4A12)),
    };
    final breathe = 0.012 * math.sin(t * 2 * math.pi);
    final scale = phase == _Phase.listening ? 1 + level.clamp(0.0, 1.0) * 0.25 : 1 + breathe;
    final r = size.shortestSide * 0.33 * scale;

    // Soft glow.
    canvas.drawCircle(
      c,
      r * 1.6,
      Paint()
        ..shader = RadialGradient(colors: [mid.withValues(alpha: phase == _Phase.idle ? 0.28 : 0.42), Colors.transparent])
            .createShader(Rect.fromCircle(center: c, radius: r * 1.6)),
    );

    // Expanding rings while listening or speaking.
    if (phase == _Phase.listening || phase == _Phase.speaking) {
      for (var i = 0; i < 2; i++) {
        final p = (t * 3 + i * 0.5) % 1.0;
        canvas.drawCircle(
          c,
          r * (1.05 + p * 0.45),
          Paint()
            ..style = PaintingStyle.stroke
            ..strokeWidth = 2
            ..color = mid.withValues(alpha: 0.45 * (1 - p)),
        );
      }
    }

    // Rotating arc while thinking.
    if (phase == _Phase.thinking) {
      final arcRect = Rect.fromCircle(center: c, radius: r * 1.18);
      canvas.drawArc(
        arcRect,
        t * 2 * math.pi * 4,
        math.pi * 0.7,
        false,
        Paint()
          ..style = PaintingStyle.stroke
          ..strokeWidth = 3
          ..strokeCap = StrokeCap.round
          ..shader = SweepGradient(colors: [Colors.transparent, mid], transform: GradientRotation(t * 2 * math.pi * 4))
              .createShader(arcRect),
      );
    }

    // Sphere with light from the top left.
    final sphere = Rect.fromCircle(center: c, radius: r);
    canvas.drawCircle(
      c,
      r,
      Paint()
        ..shader = RadialGradient(
          center: const Alignment(-0.36, -0.44),
          radius: 1.05,
          colors: [light, mid, deep],
          stops: const [0, 0.42, 1],
        ).createShader(sphere),
    );
    final highlight = c.translate(-r * 0.3, -r * 0.42);
    canvas.drawOval(
      Rect.fromCenter(center: highlight, width: r * 0.72, height: r * 0.48),
      Paint()
        ..shader = RadialGradient(colors: [Colors.white.withValues(alpha: 0.38), Colors.transparent])
            .createShader(Rect.fromCenter(center: highlight, width: r * 0.72, height: r * 0.48)),
    );
  }

  @override
  bool shouldRepaint(_OrbPainter oldDelegate) =>
      oldDelegate.t != t || oldDelegate.phase != phase || oldDelegate.level != level;
}

class _MenuRow extends StatelessWidget {
  const _MenuRow({required this.icon, required this.label});

  final IconData icon;
  final String label;

  @override
  Widget build(BuildContext context) => Row(
        children: [
          Icon(icon, size: 20, color: const Color(0xFFE3B04B)),
          const SizedBox(width: 12),
          Text(label, style: const TextStyle(color: Colors.white, fontSize: 17, fontWeight: FontWeight.w700)),
        ],
      );
}

class _SettingsSheet extends StatefulWidget {
  const _SettingsSheet({
    required this.paths,
    required this.onInstallVoiceFile,
    required this.onDownloadVoice,
    required this.onClear,
  });

  final DunyaVoicePaths paths;
  final Future<void> Function() onInstallVoiceFile;
  final Future<void> Function(DunyaPackSource source) onDownloadVoice;
  final Future<void> Function() onClear;

  @override
  State<_SettingsSheet> createState() => _SettingsSheetState();
}

class _SettingsSheetState extends State<_SettingsSheet> {
  final _settings = DunyaSettings.instance;
  final _brain = DunyaBrain.instance;
  final _packs = DunyaVoicePackManager.instance;
  DunyaDeviceInfo? _device;
  bool _brainInstalled = false;
  bool _byt5Installed = false;
  bool _byt5Published = false;
  double? _brainProgress;
  String? _brainLabel;
  bool _downloading = false;

  @override
  void initState() {
    super.initState();
    _settings.addListener(_refresh);
    unawaited(_load());
  }

  @override
  void dispose() {
    _settings.removeListener(_refresh);
    super.dispose();
  }

  void _refresh() {
    if (mounted) setState(() {});
  }

  Future<void> _load() async {
    _device = await _brain.deviceInfo();
    _brainInstalled = await _brain.isInstalled();
    _byt5Installed = (await _packs.installedManifests()).containsKey(dunyaTranslationPackId);
    await DunyaByt5.instance.activateIfInstalled();
    if (mounted) setState(() {});
    // Distinguish a published, downloadable ByT5 checkpoint from its
    // unpopulated release URL. Never show a working Download button for 404.
    if (_settings.execution != DunyaExecutionMode.offline &&
        FitilaOffline.online.value) {
      unawaited(() async {
      try {
        final source = dunyaVoicePackSources.firstWhere(
            (p) => p.id == dunyaTranslationPackId);
        final size = await _packs.remoteSize(source);
        if (mounted) setState(() => _byt5Published = size != null && size > 0);
      } catch (_) {
        if (mounted) setState(() => _byt5Published = false);
      }
      }());
    }
  }

  void _onBrainProgress(double? fraction, String label) {
    if (!mounted) return;
    setState(() {
      _brainProgress = fraction;
      _brainLabel = label;
    });
  }

  Future<void> _downloadBrain() async {
    setState(() {
      _downloading = true;
      _brainLabel = 'Connexion…';
    });
    try {
      await _brain.download(onProgress: _onBrainProgress);
      _brainInstalled = true;
      await _settings.update(intelligence: DunyaIntelligence.smart);
      unawaited(_brain.ensureLoaded().catchError((Object _) {}));
      _brainLabel = 'Cerveau installé et vérifié.';
    } catch (error) {
      _brainLabel = error.toString();
    } finally {
      if (mounted) setState(() => _downloading = false);
    }
  }

  Future<void> _removeBrain() async {
    await _brain.remove();
    _brainInstalled = false;
    if (mounted) setState(() {});
  }

  bool _packInstalled(DunyaPackSource source) => switch (source.id) {
    dunyaVoiceCorePackId => widget.paths.canListen,
    dunyaVoiceFrPackId => widget.paths.canSpeakFrenchOffline,
    dunyaTranslationPackId => _byt5Installed,
    _ => false,
  };

  @override
  Widget build(BuildContext context) {
    final device = _device;
    final canRun = device == null || device.canRun(_brain.model);
    final ram = device?.totalRamMb ?? 0;
    return SafeArea(
      child: ConstrainedBox(
        constraints: BoxConstraints(maxHeight: MediaQuery.sizeOf(context).height * 0.86),
        child: ListView(
          shrinkWrap: true,
          padding: const EdgeInsets.fromLTRB(18, 0, 18, 22),
          children: [
            const Text('Réglages', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w900, color: Color(0xFF17131F))),
            const SizedBox(height: 14),
            _section('Intelligence'),
            const Text('Connexion',
                style: TextStyle(fontWeight: FontWeight.w800)),
            const SizedBox(height: 8),
            SegmentedButton<DunyaExecutionMode>(
              segments: const [
                ButtonSegment(value: DunyaExecutionMode.automatic, label: Text('Auto')),
                ButtonSegment(value: DunyaExecutionMode.online, label: Text('En ligne')),
                ButtonSegment(value: DunyaExecutionMode.offline, label: Text('Hors ligne')),
              ],
              selected: {_settings.execution},
              onSelectionChanged: (v) => _settings.update(execution: v.first),
            ),
            const SizedBox(height: 12),
            SegmentedButton<DunyaIntelligence>(
              segments: const [
                ButtonSegment(value: DunyaIntelligence.essential, label: Text('Essentiel'), icon: Icon(Icons.bolt_rounded)),
                ButtonSegment(value: DunyaIntelligence.smart, label: Text('Malin'), icon: Icon(Icons.psychology_rounded)),
              ],
              selected: {_settings.intelligence},
              onSelectionChanged: (s) => _settings.update(intelligence: s.first),
            ),
            const SizedBox(height: 8),
            Text(
              _settings.intelligence == DunyaIntelligence.essential
                  ? 'Rapide, pour tous les téléphones.'
                  : 'Discuter sans Internet (à télécharger).',
              style: const TextStyle(fontSize: 12.5, color: Color(0xFF7D7566)),
            ),
            if (_settings.intelligence == DunyaIntelligence.smart) ...[
              const SizedBox(height: 10),
              _card(
                icon: _brainInstalled ? Icons.check_circle_rounded : Icons.memory_rounded,
                iconColor: _brainInstalled ? const Color(0xFF4F8A68) : const Color(0xFF9C6B1D),
                title: _brainInstalled ? 'Cerveau installé' : 'Assistant hors ligne (2,6 Go)',
                subtitle: !canRun
                    ? (device.supportedProcessor
                        ? 'Ce téléphone ($ram Mo de RAM) est trop juste : le mode Essentiel est conseillé.'
                        : 'Ce téléphone ne prend pas en charge cette option.')
                    : _brainLabel ?? (_brainInstalled ? 'Fonctionne sans Internet.' : 'À télécharger une fois, en Wi-Fi de préférence.'),
                trailing: _brainInstalled
                    ? TextButton(onPressed: _removeBrain, child: const Text('Supprimer'))
                    : _downloading || !canRun
                        ? null
                        : TextButton(onPressed: _downloadBrain, child: const Text('Télécharger', style: TextStyle(fontWeight: FontWeight.w800, color: Color(0xFF173E36)))),
                progress: _downloading ? (_brainProgress ?? -1) : null,
              ),
            ],
            const SizedBox(height: 18),
            _section('Conversation'),
            _switch('Mains libres', _settings.handsFree,
                (v) => _settings.update(handsFree: v)),
            _switch('Sous-titres', _settings.subtitles, (v) => _settings.update(subtitles: v)),
            _switch('Traduction en français', _settings.frenchSubtitlesInBariba,
                (v) => _settings.update(frenchSubtitlesInBariba: v)),
            Row(
              children: [
                const Text('Vitesse de la voix', style: TextStyle(fontSize: 14, color: Color(0xFF17131F))),
                Expanded(
                  child: Slider(
                    value: _settings.voiceSpeed,
                    min: 0.7,
                    max: 1.3,
                    divisions: 6,
                    label: '${(_settings.voiceSpeed * 100).round()} %',
                    onChanged: (v) => _settings.update(voiceSpeed: v),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 10),
            _section('À utiliser sans Internet'),
            _switch('Traduction expérimentale', _settings.experimentalTranslation, (value) async {
              await _settings.update(experimentalTranslation: value);
              await DunyaByt5.instance.activateIfInstalled();
              if (mounted) setState(() {});
            }),
            const Text('Peut produire des erreurs. Désactivée par défaut.',
                style: TextStyle(fontSize: 12, color: Color(0xFF7D7566))),
            for (final source in dunyaVoicePackSources)
              _card(
                icon: _packInstalled(source) ? Icons.check_circle_rounded : Icons.cloud_download_outlined,
                iconColor: const Color(0xFF9C6B1D),
                title: switch (source.id) {
                  dunyaVoiceCorePackId => 'Parler et écouter sans Internet',
                  dunyaVoiceFrPackId => 'Voix française hors ligne',
                  dunyaTranslationPackId => 'Traduire français ↔ Baatɔnum (test)',
                  _ => source.title,
                },
                subtitle: _packInstalled(source) ? (source.id == dunyaTranslationPackId
                    ? (_settings.experimentalTranslation ? 'Mode test activé · à vérifier' : 'Installé · mode test désactivé') : 'Prêt à utiliser')
                    : source.id == dunyaTranslationPackId && !_byt5Published
                        ? 'Bientôt disponible'
                        : 'Wi-Fi conseillé',
                trailing: _packInstalled(source)
                    ? null
                    : source.id == dunyaTranslationPackId && !_byt5Published
                        ? const Text('Bientôt', style: TextStyle(fontSize: 11))
                        : TextButton(
                        onPressed: () {
                          Navigator.of(context).pop();
                          unawaited(widget.onDownloadVoice(source));
                        },
                        child: const Text('Télécharger'),
                      ),
              ),
            OutlinedButton.icon(
              onPressed: () {
                Navigator.of(context).pop();
                unawaited(widget.onInstallVoiceFile());
              },
              icon: const Icon(Icons.sd_storage_outlined),
              label: const Text('Installer un fichier téléchargé'),
            ),
            const SizedBox(height: 18),
            TextButton.icon(
              onPressed: () {
                Navigator.of(context).pop();
                unawaited(widget.onClear());
              },
              icon: const Icon(Icons.delete_sweep_outlined),
              label: const Text('Nouvelle conversation'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _section(String title) => Padding(
        padding: const EdgeInsets.only(bottom: 8),
        child: Text(
          title.toUpperCase(),
          style: const TextStyle(fontSize: 11.5, letterSpacing: 1.1, fontWeight: FontWeight.w900, color: Color(0xFF9C6B1D)),
        ),
      );

  Widget _switch(String label, bool value, ValueChanged<bool> onChanged) => SwitchListTile(
        contentPadding: EdgeInsets.zero,
        dense: true,
        title: Text(label, style: const TextStyle(fontSize: 14, color: Color(0xFF17131F))),
        value: value,
        onChanged: onChanged,
      );

  Widget _card({
    required IconData icon,
    required Color iconColor,
    required String title,
    required String subtitle,
    Widget? trailing,
    double? progress,
  }) =>
      Card(
        elevation: 0,
        color: Colors.white,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(20),
          side: const BorderSide(color: Color(0xFFDCE8E2)),
        ),
        child: Padding(
          padding: const EdgeInsets.fromLTRB(15, 14, 10, 14),
          child: Column(
            children: [
              Row(
                children: [
                  Icon(icon, color: iconColor),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(title, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: Color(0xFF17131F))),
                        Text(subtitle, style: const TextStyle(fontSize: 13, color: Color(0xFF495C53))),
                      ],
                    ),
                  ),
                  ?trailing,
                ],
              ),
              if (progress != null) ...[
                const SizedBox(height: 8),
                LinearProgressIndicator(value: progress < 0 ? null : progress, color: const Color(0xFFD4A23A)),
              ],
            ],
          ),
        ),
      );
}

class _ProgressDialog extends StatelessWidget {
  const _ProgressDialog({required this.status});

  final ValueNotifier<(double?, String)> status;

  @override
  Widget build(BuildContext context) => PopScope(
        canPop: false,
        child: AlertDialog(
          content: ValueListenableBuilder<(double?, String)>(
            valueListenable: status,
            builder: (_, value, _) => Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                LinearProgressIndicator(value: value.$1, color: const Color(0xFFD4A23A)),
                const SizedBox(height: 14),
                Text(value.$2, textAlign: TextAlign.center),
              ],
            ),
          ),
        ),
      );
}
