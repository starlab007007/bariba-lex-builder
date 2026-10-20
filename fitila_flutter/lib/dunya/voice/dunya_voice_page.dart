/// DUNYA Voix — a ChatGPT-Voice-like experience, fully offline.
///
/// Full-screen living orb, hands-free turn taking with barge-in, live
/// subtitles, strictly separated language modes (Français / Baatɔnum / Les
/// deux), a text view of the same conversation, guided first launch and a
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
import 'dunya_byt5.dart';
import 'dunya_mic_capture.dart';
import 'dunya_settings.dart';
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
  var _muted = false;
  var _textView = false;
  var _systemFrenchVoice = false;
  var _level = 0.0;
  var _emptyListens = 0;
  var _stopSpeaking = false;
  var _turnCounter = 0;
  int? _bargeTurn;
  String _caption = '';
  String? _subCaption;
  String? _status;
  String? _notice;
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
    unawaited(_assistant.interrupt());
    unawaited(_mic.dispose());
    unawaited(_tts.stop());
    unawaited(_player.dispose());
    _engine?.dispose();
    _cloudVoice.cancel();
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
      _cloudVoice.cancel();
      unawaited(_assistant.interrupt());
      unawaited(_mic.cancel());
      unawaited(_player.stop());
      unawaited(_tts.stop());
      _status = 'Mode hors ligne activé';
      _phase = _Phase.idle;
    }
    _previousExecution = execution;
    if (mounted) setState(() {});
  }

  // ---------------------------------------------------------------------------
  // Preparation
  // ---------------------------------------------------------------------------

  Future<void> _prepare() async {
    await _settings.load();
    await _prepareFrenchVoice();
    await _startEngine();
    await _brain.refreshState();
    await _loadHistory();
    if (!mounted) return;
    setState(() => _phase = _Phase.idle);
    if (!_settings.onboarded) {
      WidgetsBinding.instance.addPostFrameCallback((_) => _openOnboarding());
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

  Future<void> _startEngine() async {
    _engine?.dispose();
    _engine = null;
    _paths = await _packs.resolvePaths();
    await DunyaByt5.instance.activateIfInstalled();
    if (!_paths.canListen && !_paths.canSpeakBariba && !_paths.canSpeakFrenchOffline) return;
    try {
      final temp = await getTemporaryDirectory();
      _engine = await DunyaSpeechEngine.start(_paths, tempDir: temp.path);
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
    if (!_useOnlineVoice && (!_paths.canListen || _engine == null)) {
      _toast('Sans Internet, installez le pack local Meta Omnilingual ASR.');
      await _openSettings();
      return;
    }
    if (!await _mic.hasPermission()) {
      _toast('DUNYA a besoin du micro pour vous écouter.');
      return;
    }
    _session = true;
    _emptyListens = 0;
    unawaited(_listenTurn());
  }

  Future<void> _endSession() async {
    _session = false;
    await _interrupt();
    await _mic.cancel();
    if (mounted) setState(() => _phase = _Phase.idle);
  }

  Future<void> _listenTurn() async {
    if (!mounted || !_session) return;
    if (_muted) {
      setState(() => _phase = _Phase.idle);
      return;
    }
    setState(() {
      _phase = _Phase.listening;
      _level = 0;
      _caption = '';
      _subCaption = null;
    });
    try {
      final samples = await _mic.listen(onLevel: _onLevel);
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
  Future<void> _runCloudVoiceTurn(Float32List samples) async {
    final mode = _mode;
    final turnId = ++_turnCounter;
    final replyLang = mode == DunyaLanguageMode.french ? 'fr' : 'bba';
    var input = '';
    var answer = '';
    var language = replyLang;
    String? subtitle;
    var gotAudio = false;
    var usedLocalFallback = false;
    _stopSpeaking = false;
    if (mounted) setState(() => _phase = _Phase.thinking);
    try {
      await _cloudVoice.turn(
        samples: samples,
        language: mode == DunyaLanguageMode.french ? 'fr' : 'bba',
        replyLanguage: replyLang,
        history: [
          for (final t in _turns.reversed.take(8).toList().reversed)
            {'role': t.role, 'content': t.text},
        ],
        onEvent: (event) async {
          if (!mounted || turnId != _turnCounter) return;
          final type = event['type']?.toString() ?? '';
          if (type == 'stage') {
            setState(() => _status = switch (event['stage']) {
              'transcribing' => 'Omnilingual ASR vous écoute…',
              'thinking' => 'DUNYA prépare sa réponse…',
              'synthesizing' => 'MMS-TTS prépare la voix Baatɔnum…',
              _ => 'DUNYA traite votre message…',
            });
          } else if (type == 'transcript') {
            input = (event['text'] ?? '').toString();
          } else if (type == 'answer') {
            answer = (event['text'] ?? '').toString();
            subtitle = event['subtitle']?.toString();
            language = event['lang']?.toString() ?? replyLang;
            setState(() {
              _caption = answer;
              _subCaption = _settings.frenchSubtitlesInBariba ? subtitle : null;
              _phase = _Phase.speaking;
            });
          } else if (type == 'audio') {
            gotAudio = true;
            final b64 = event['audio_base64']?.toString();
            if (b64 != null && b64.isNotEmpty) {
              // Play the actual MMS-TTS WAV supplied by the FITILA server.
              final finished = _player.onPlayerComplete.first;
              await _player.play(audio.BytesSource(base64Decode(b64)));
              await finished.timeout(const Duration(seconds: 60));
            } else {
              final url = event['audio_url']?.toString() ?? '';
              if (Uri.tryParse(url)?.scheme == 'https') {
                final finished = _player.onPlayerComplete.first;
                await _player.play(audio.UrlSource(url));
                await finished.timeout(const Duration(seconds: 60));
              }
            }
          } else if (type == 'notice') {
            if (mounted) setState(() => _notice = 'Voix ou traduction de secours utilisée.');
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
        'input': 'voice', 'mode': mode.key,
      });
    } catch (error) {
      if (mounted) setState(() => _notice = error.toString());
      await _store.audit('dunya_voice_cloud_error',
          {'error': error.toString()}, severity: 'warning');
      // Automatic mode falls back to the already-installed Omnilingual
      // recognizer and local assistant. Online-only mode never silently
      // changes execution policy.
      if (_settings.execution == DunyaExecutionMode.automatic &&
          _paths.canListen && _engine != null && mounted) {
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
        if (_session && _settings.handsFree) {
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
    final answer = _Turn(role: 'assistant', text: '');
    setState(() {
      _turns.add(_Turn(role: 'user', text: clean));
      _turns.add(answer);
      _phase = _Phase.thinking;
      _caption = '';
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
    if (_muted) return;
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

  Future<void> _speakQueue(Stream<DunyaSentenceEvent> sentences) async {
    await for (final s in sentences) {
      if (_stopSpeaking || !mounted) continue;
      setState(() {
        _phase = _Phase.speaking;
        _caption = s.utterance.text;
        _subCaption = _settings.frenchSubtitlesInBariba ? s.subtitle : null;
      });
      await _speakOne(s.utterance);
    }
  }

  Future<void> _speakOne(DunyaUtterance u) async {
    try {
      if (u.lang == 'bba') {
        if (_paths.canSpeakBariba && _engine != null) {
          await _playFile(await _engine!.synthesize(u.text, 'bba', speed: 0.85 * _settings.voiceSpeed));
        }
      } else if (_systemFrenchVoice) {
        await _tts.setSpeechRate(0.47 * _settings.voiceSpeed);
        await _tts.speak(u.text);
      } else if (_paths.canSpeakFrenchOffline && _engine != null) {
        await _playFile(await _engine!.synthesize(u.text, 'fra', speed: _settings.voiceSpeed));
      }
    } catch (error) {
      await _store.audit('dunya_voice_speak_error', {'error': error.toString()}, severity: 'warning');
    }
  }

  Future<void> _playFile(String path) async {
    if (_stopSpeaking) return;
    final done = _player.onPlayerComplete.first;
    await _player.play(audio.DeviceFileSource(path));
    await done.timeout(const Duration(seconds: 90), onTimeout: () {});
  }

  Future<void> _replay(_Turn turn) async {
    if (_phase != _Phase.idle) return;
    _stopSpeaking = false;
    setState(() => _phase = _Phase.speaking);
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
    await _runTurn(text, spoken: false);
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

  Future<void> _openOnboarding() async {
    final mode = await showModalBottomSheet<DunyaLanguageMode>(
      context: context,
      isDismissible: false,
      enableDrag: false,
      isScrollControlled: true,
      backgroundColor: _cream,
      builder: (_) => _OnboardingSheet(onPreview: _previewMode),
    );
    if (mode == null) return;
    await _settings.update(mode: mode, onboarded: true);
    await _loadHistory();
    if (!mounted) return;
    setState(() {});
    final info = await _brain.deviceInfo();
    if (!mounted) return;
    // Online and Auto-with-Internet must go straight into DUNYA, without
    // forcing a Gemma/Omnilingual/MMS model download on first launch.
    // The model manager remains optional from the visible Settings control.
    if (!_useOnlineVoice &&
        (!_paths.canListen ||
          (info.canRun(_brain.model) && _brain.state == DunyaBrainState.absent))) {
      await _openSettings();
    }
  }

  Future<void> _previewMode(DunyaLanguageMode mode) async {
    _stopSpeaking = false;
    switch (mode) {
      case DunyaLanguageMode.french:
        await _speakOne(const DunyaUtterance('Je parlerai uniquement français avec vous.', 'fr'));
      case DunyaLanguageMode.bariba:
        await _speakOne(const DunyaUtterance('Baatɔnum.', 'bba'));
      case DunyaLanguageMode.bilingual:
        await _speakOne(const DunyaUtterance('Français.', 'fr'));
        await _speakOne(const DunyaUtterance('Baatɔnum.', 'bba'));
    }
  }

  Future<void> _openModePicker() async {
    final picked = await showModalBottomSheet<DunyaLanguageMode>(
      context: context,
      showDragHandle: true,
      backgroundColor: _cream,
      builder: (sheetContext) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(18, 0, 18, 18),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Text('Langue de la conversation', style: TextStyle(fontSize: 19, fontWeight: FontWeight.w900, color: _ink)),
              const SizedBox(height: 4),
              const Text('Chaque langue garde sa propre conversation.', style: TextStyle(fontSize: 13, color: Color(0xFF7D7566))),
              const SizedBox(height: 12),
              for (final m in DunyaLanguageMode.values)
                _ModeTile(mode: m, selected: m == _mode, onTap: () => Navigator.of(sheetContext).pop(m)),
            ],
          ),
        ),
      ),
    );
    if (picked != null) await _setMode(picked);
  }

  Future<void> _openSettings() async {
    await _endSession();
    if (!mounted) return;
    await showModalBottomSheet<void>(
      context: context,
      showDragHandle: true,
      isScrollControlled: true,
      backgroundColor: _cream,
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

  Future<bool> _confirmByt5Beta() async {
    if (!mounted) return false;
    final accepted = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Traduction hors ligne · Bêta'),
        content: const Text(
          'Téléchargez le pack (environ 290 Mo) pour traduire sans Internet. '
          'Cette version est en test et peut comporter des erreurs. Continuer ?',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(false),
            child: const Text('Annuler'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(dialogContext).pop(true),
            child: const Text('Continuer'),
          ),
        ],
      ),
    );
    return accepted == true;
  }

  Future<void> _installVoiceFile() async {
    final picked = await FilePicker.platform.pickFiles(type: FileType.any);
    final path = picked?.files.single.path;
    if (path == null) return;
    final cache = await getTemporaryDirectory();
    final isCacheCopy = path.startsWith(cache.path) || path.contains('/cache/');
    // Consent for file imports is requested explicitly; the installer itself
    // enforces it again for the hash-pinned ByT5 beta.
    if (looksLikeBrainFile(path)) {
      await _runJob(
        'Installation du cerveau…',
        (progress) => _brain.installFromFile(path, onProgress: progress, deleteSource: isCacheCopy),
      );
      return;
    }
    final betaConsent = path.toLowerCase().contains('byt5')
        ? await _confirmByt5Beta() : false;
    if (path.toLowerCase().contains('byt5') && !betaConsent) return;
    await _runJob('Installation du pack…', (progress) async {
      await _packs.installFromFile(path, deleteSource: isCacheCopy, betaConsent: betaConsent, onProgress: (p) => progress(p.fraction, p.detail));
      await _startEngine();
    });
  }

  Future<void> _downloadVoice(DunyaPackSource source) async {
    final betaConsent = source.id == dunyaTranslationPackId
        ? await _confirmByt5Beta()
        : false;
    if (source.id == dunyaTranslationPackId && !betaConsent) return;
    await _runJob('Téléchargement…', (progress) async {
      await _packs.download(source, betaConsent: betaConsent,
          onProgress: (p) => progress(p.fraction, p.detail));
      await _startEngine();
    });
  }

  Future<void> _runJob(String title, Future<void> Function(void Function(double?, String) progress) job) async {
    if (!mounted) return;
    final status = ValueNotifier<(double?, String)>((null, title));
    final navigator = Navigator.of(context);
    unawaited(showDialog<void>(
      context: context,
      barrierDismissible: false,
      builder: (_) => _ProgressDialog(status: status),
    ));
    try {
      await job((f, label) => status.value = (f, label));
      // Refresh the native voice and translation engines only after successful
      // installation; packs are optional and independently installable.
      await _startEngine();
      navigator.pop();
      _toast('Installé et vérifié.');
    } catch (error) {
      navigator.pop();
      _toast(error is DunyaPackException || error is DunyaBrainException
          ? error.toString()
          : 'Échec : réessayez, de préférence en Wi-Fi.');
    } finally {
      status.dispose();
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
        _Phase.idle => !_useOnlineVoice && !_paths.canListen
            ? 'Installez la voix DUNYA'
            : _muted
                ? 'Micro coupé'
                : 'Touchez la sphère pour parler',
        _Phase.listening => 'Je vous écoute…',
        _Phase.thinking => _status ?? 'Je réfléchis…',
        _Phase.speaking => 'Touchez pour m’interrompre',
      };

  String get _brainBadge => _useOnlineVoice
      ? 'DUNYA en ligne'
      : switch (_settings.intelligence) {
        DunyaIntelligence.essential => 'Essentiel',
        DunyaIntelligence.smart => switch (_brain.state) {
            DunyaBrainState.ready => 'Cerveau actif',
            DunyaBrainState.loading => 'Réveil du cerveau…',
            DunyaBrainState.installed => 'Cerveau prêt',
            DunyaBrainState.failed => 'Cerveau en panne',
            DunyaBrainState.absent => 'Essentiel',
          },
      };

  // ---------------------------------------------------------------------------
  // Build
  // ---------------------------------------------------------------------------

  @override
  Widget build(BuildContext context) {
    return ColoredBox(
      color: _ink,
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
        padding: const EdgeInsets.fromLTRB(12, 8, 6, 4),
        child: Row(
          children: [
            Material(
              color: const Color(0xFF2A2433),
              shape: const StadiumBorder(),
              child: InkWell(
                customBorder: const StadiumBorder(),
                onTap: _openModePicker,
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 9),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.translate_rounded, size: 17, color: _gold),
                      const SizedBox(width: 7),
                      Text(_mode.label, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 14)),
                      const Icon(Icons.expand_more_rounded, size: 18, color: Colors.white70),
                    ],
                  ),
                ),
              ),
            ),
            const SizedBox(width: 8),
            Flexible(
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 6),
                decoration: BoxDecoration(color: const Color(0x2252A47A), borderRadius: BorderRadius.circular(999)),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.cloud_off_rounded, size: 13, color: Color(0xFF8FD3A8)),
                    const SizedBox(width: 5),
                    Flexible(
                      child: Text(
                        _brainBadge,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(color: Color(0xFF8FD3A8), fontSize: 11, fontWeight: FontWeight.w800),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const Spacer(),
            IconButton(
              tooltip: _textView ? 'Mode voix' : 'Voir la conversation écrite',
              onPressed: () => setState(() => _textView = !_textView),
              icon: Icon(_textView ? Icons.graphic_eq_rounded : Icons.chat_bubble_outline_rounded, color: Colors.white),
            ),
            IconButton(
              tooltip: 'Réglages',
              onPressed: _openSettings,
              icon: const Icon(Icons.tune_rounded, color: Colors.white),
            ),
          ],
        ),
      );

  Widget _voiceView() {
    final users = _turns.where((t) => t.role == 'user');
    final lastUser = users.isEmpty ? '' : users.last.text;
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
                size: const Size(250, 250),
                painter: _OrbPainter(t: _orb.value, phase: _phase, level: _level),
              ),
            ),
          ),
        ),
        const SizedBox(height: 18),
        Text(_phaseLabel, style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.w700)),
        const Spacer(),
        if (_settings.subtitles)
          Padding(
            padding: const EdgeInsets.fromLTRB(24, 0, 24, 12),
            child: Column(
              children: [
                if (_phase == _Phase.thinking && lastUser.isNotEmpty)
                  Text(
                    '« $lastUser »',
                    textAlign: TextAlign.center,
                    maxLines: 3,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(color: Colors.white60, fontSize: 15, fontStyle: FontStyle.italic),
                  ),
                if (_caption.isNotEmpty)
                  Text(
                    _caption,
                    textAlign: TextAlign.center,
                    maxLines: 5,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(color: Colors.white, fontSize: 19, height: 1.35, fontWeight: FontWeight.w600),
                  ),
                if (_subCaption != null && _subCaption!.isNotEmpty) ...[
                  const SizedBox(height: 6),
                  Text(
                    _subCaption!,
                    textAlign: TextAlign.center,
                    maxLines: 3,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(color: Colors.white54, fontSize: 14),
                  ),
                ],
              ],
            ),
          ),
        if (_notice != null)
          Padding(
            padding: const EdgeInsets.fromLTRB(24, 0, 24, 8),
            child: Text(_notice!, textAlign: TextAlign.center, style: const TextStyle(color: Color(0xFFE9C46A), fontSize: 12.5)),
          ),
        if (_turns.isEmpty && _phase == _Phase.idle) _suggestions(),
      ],
    );
  }

  Widget _suggestions() {
    final items = switch (_mode) {
      DunyaLanguageMode.bariba => const ['gbereru', 'A kua'],
      _ => const [
          'Comment soigner une plaie légère ?',
          'Explique-moi la rotation des cultures',
          'Comment dit-on merci en baatɔnum ?',
          'Rappelle-moi de traire les vaches à 17 h',
        ],
    };
    return SizedBox(
      height: 46,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 16),
        itemCount: items.length,
        separatorBuilder: (_, _) => const SizedBox(width: 8),
        itemBuilder: (_, i) => ActionChip(
          backgroundColor: const Color(0xFF2A2433),
          side: BorderSide.none,
          label: Text(items[i], style: const TextStyle(color: Colors.white, fontSize: 13)),
          onPressed: () => _runTurn(items[i], spoken: false),
        ),
      ),
    );
  }

  Widget _chatView() {
    if (_turns.isEmpty) {
      return const Center(
        child: Padding(
          padding: EdgeInsets.all(32),
          child: Text(
            'Écrivez ou parlez à DUNYA. Tout reste sur votre téléphone.',
            textAlign: TextAlign.center,
            style: TextStyle(color: Colors.white70, fontSize: 15),
          ),
        ),
      );
    }
    return ListView.builder(
      controller: _scroll,
      padding: const EdgeInsets.fromLTRB(14, 8, 14, 12),
      itemCount: _turns.length,
      itemBuilder: (_, i) => _bubble(_turns[i]),
    );
  }

  Widget _bubble(_Turn t) {
    final user = t.role == 'user';
    return Align(
      alignment: user ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        margin: EdgeInsets.only(top: 8, left: user ? 48 : 0, right: user ? 0 : 36),
        padding: const EdgeInsets.all(13),
        decoration: BoxDecoration(
          color: user ? const Color(0xFF3A3146) : const Color(0xFF241E2D),
          borderRadius: BorderRadius.circular(18),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            SelectableText(
              t.text.isEmpty ? '…' : t.text,
              style: const TextStyle(color: Colors.white, fontSize: 15.5, height: 1.42),
            ),
            if (!user && t.subtitle != null && _settings.frenchSubtitlesInBariba) ...[
              const SizedBox(height: 6),
              Text(t.subtitle!, style: const TextStyle(color: Colors.white54, fontSize: 13)),
            ],
            if (!user && t.text.isNotEmpty)
              Wrap(
                crossAxisAlignment: WrapCrossAlignment.center,
                children: [
                  IconButton(
                    visualDensity: VisualDensity.compact,
                    tooltip: 'Réécouter',
                    onPressed: () => _replay(t),
                    icon: const Icon(Icons.volume_up_rounded, size: 18, color: _gold),
                  ),
                  IconButton(
                    visualDensity: VisualDensity.compact,
                    tooltip: 'Copier',
                    onPressed: () => Clipboard.setData(ClipboardData(text: t.text)),
                    icon: const Icon(Icons.copy_rounded, size: 21, color: Colors.white),
                  ),
                  IconButton(
                    visualDensity: VisualDensity.compact,
                    tooltip: 'Mémoriser',
                    onPressed: () => _quietly(() => _store.saveMemory(t.text)),
                    icon: const Icon(Icons.bookmark_add_outlined, size: 21, color: Colors.white),
                  ),
                  for (final s in t.sources.take(2))
                    Padding(
                      padding: const EdgeInsets.only(right: 6),
                      child: ActionChip(
                        visualDensity: VisualDensity.compact,
                        backgroundColor: const Color(0xFF332B3E),
                        side: BorderSide.none,
                        label: Text(s.title, style: const TextStyle(color: _gold, fontSize: 10.5, fontWeight: FontWeight.w800)),
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
        padding: EdgeInsets.fromLTRB(10, 6, 10, MediaQuery.viewPaddingOf(context).bottom + 8),
        child: Row(
          children: [
            Expanded(
              child: TextField(
                controller: _composer,
                minLines: 1,
                maxLines: 4,
                style: const TextStyle(color: Colors.white),
                textInputAction: TextInputAction.send,
                onSubmitted: (_) => _sendText(),
                decoration: InputDecoration(
                  hintText: _mode == DunyaLanguageMode.bariba ? 'Baatɔnum…' : 'Écrire à DUNYA…',
                  hintStyle: const TextStyle(color: Colors.white38),
                  filled: true,
                  fillColor: const Color(0xFF241E2D),
                  contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 13),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(22), borderSide: BorderSide.none),
                ),
              ),
            ),
            const SizedBox(width: 8),
            IconButton.filled(
              style: IconButton.styleFrom(backgroundColor: _gold, foregroundColor: _ink, minimumSize: const Size(50, 50)),
              onPressed: _phase == _Phase.thinking ? _interrupt : _sendText,
              icon: Icon(_phase == _Phase.thinking ? Icons.stop_rounded : Icons.arrow_upward_rounded),
            ),
          ],
        ),
      );

  Widget _controls() => Padding(
        padding: EdgeInsets.fromLTRB(28, 6, 28, MediaQuery.viewPaddingOf(context).bottom + 14),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            _roundButton(
              icon: _muted ? Icons.mic_off_rounded : Icons.mic_none_rounded,
              label: _muted ? 'Micro coupé' : 'Micro',
              active: !_muted,
              onTap: () async {
                setState(() => _muted = !_muted);
                if (_muted) {
                  await _mic.cancel();
                } else if (_session && _phase == _Phase.idle) {
                  unawaited(_listenTurn());
                }
              },
            ),
            _roundButton(
              icon: _settings.subtitles ? Icons.closed_caption_rounded : Icons.closed_caption_off_rounded,
              label: 'Sous-titres',
              active: _settings.subtitles,
              onTap: () => _settings.update(subtitles: !_settings.subtitles),
            ),
            _roundButton(
              icon: Icons.close_rounded,
              label: 'Terminer',
              active: _session,
              danger: true,
              onTap: _endSession,
            ),
          ],
        ),
      );

  Widget _roundButton({
    required IconData icon,
    required String label,
    required bool active,
    required VoidCallback onTap,
    bool danger = false,
  }) {
    final bg = danger && active ? const Color(0xFFB3413A) : const Color(0xFF2A2433);
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Material(
          color: bg,
          shape: const CircleBorder(),
          child: InkWell(
            customBorder: const CircleBorder(),
            onTap: onTap,
            child: SizedBox(width: 62, height: 62, child: Icon(icon, color: active ? Colors.white : Colors.white54, size: 27)),
          ),
        ),
        const SizedBox(height: 6),
        Text(label, style: const TextStyle(color: Colors.white70, fontSize: 11.5)),
      ],
    );
  }

  Widget _confirmBar(DunyaPendingAction pending) => Container(
        margin: const EdgeInsets.fromLTRB(14, 0, 14, 8),
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(color: const Color(0xFF2E2638), borderRadius: BorderRadius.circular(18)),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(pending.summary, style: const TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.w800)),
            const SizedBox(height: 10),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: () => _confirm(false),
                    style: OutlinedButton.styleFrom(minimumSize: const Size.fromHeight(50), foregroundColor: Colors.white),
                    child: const Text('Non'),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: FilledButton(
                    onPressed: () => _confirm(true),
                    style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(50), backgroundColor: _sage),
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
    final base = size.shortestSide * 0.32;
    final wave = math.sin(t * 2 * math.pi);
    final (Color a, Color b, double amp) = switch (phase) {
      _Phase.listening => (const Color(0xFFF2C14E), const Color(0xFFE07A2E), 0.10 + level * 0.35),
      _Phase.thinking => (const Color(0xFF8E7CFF), const Color(0xFF4F3CC9), 0.06),
      _Phase.speaking => (const Color(0xFF5FD1A0), const Color(0xFF2A8C78), 0.12 + 0.06 * math.sin(t * 40).abs()),
      _Phase.preparing => (const Color(0xFF6B6478), const Color(0xFF3D3747), 0.02),
      _Phase.idle => (const Color(0xFFD4A23A), const Color(0xFF8C5A1E), 0.03),
    };
    for (var i = 3; i >= 1; i--) {
      final r = base * (1 + amp * i * 0.9 + 0.02 * wave * i);
      canvas.drawCircle(c, r, Paint()..color = a.withValues(alpha: 0.07 * (4 - i)));
    }
    final r = base * (1 + amp * 0.6 + 0.015 * wave);
    final angle = t * 2 * math.pi;
    final shader = SweepGradient(
      colors: [a, b, a.withValues(alpha: 0.85), b, a],
      transform: GradientRotation(phase == _Phase.thinking ? angle * 3 : angle),
    ).createShader(Rect.fromCircle(center: c, radius: r));
    canvas.drawCircle(c, r, Paint()..shader = shader);
    final highlight = c.translate(-r * 0.28, -r * 0.32);
    canvas.drawCircle(
      highlight,
      r * 0.42,
      Paint()
        ..shader = RadialGradient(colors: [Colors.white.withValues(alpha: 0.35), Colors.transparent])
            .createShader(Rect.fromCircle(center: highlight, radius: r * 0.42)),
    );
  }

  @override
  bool shouldRepaint(_OrbPainter oldDelegate) =>
      oldDelegate.t != t || oldDelegate.phase != phase || oldDelegate.level != level;
}

// ---------------------------------------------------------------------------
// Sheets
// ---------------------------------------------------------------------------

class _ModeTile extends StatelessWidget {
  const _ModeTile({required this.mode, required this.selected, required this.onTap});

  final DunyaLanguageMode mode;
  final bool selected;
  final VoidCallback onTap;

  String get _subtitle => switch (mode) {
        DunyaLanguageMode.french => 'DUNYA écoute et répond uniquement en français.',
        DunyaLanguageMode.bariba => 'DUNYA écoute et répond uniquement en baatɔnum.',
        DunyaLanguageMode.bilingual => 'Parlez l’une ou l’autre langue : DUNYA répond dans la vôtre.',
      };

  IconData get _icon => switch (mode) {
        DunyaLanguageMode.french => Icons.record_voice_over_rounded,
        DunyaLanguageMode.bariba => Icons.forum_rounded,
        DunyaLanguageMode.bilingual => Icons.swap_horiz_rounded,
      };

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.only(bottom: 8),
        child: Material(
          color: selected ? const Color(0xFF17131F) : Colors.white,
          borderRadius: BorderRadius.circular(18),
          child: InkWell(
            borderRadius: BorderRadius.circular(18),
            onTap: onTap,
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  Icon(_icon, color: selected ? const Color(0xFFD4A23A) : const Color(0xFF9C6B1D), size: 28),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          mode.label,
                          style: TextStyle(
                            fontSize: 17,
                            fontWeight: FontWeight.w900,
                            color: selected ? Colors.white : const Color(0xFF17131F),
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          _subtitle,
                          style: TextStyle(fontSize: 12.5, color: selected ? Colors.white70 : const Color(0xFF7D7566)),
                        ),
                      ],
                    ),
                  ),
                  if (selected) const Icon(Icons.check_circle_rounded, color: Color(0xFFD4A23A)),
                ],
              ),
            ),
          ),
        ),
      );
}

class _OnboardingSheet extends StatefulWidget {
  const _OnboardingSheet({required this.onPreview});

  final Future<void> Function(DunyaLanguageMode mode) onPreview;

  @override
  State<_OnboardingSheet> createState() => _OnboardingSheetState();
}

class _OnboardingSheetState extends State<_OnboardingSheet> {
  DunyaLanguageMode? _selected;

  @override
  Widget build(BuildContext context) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 24, 20, 20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Text(
                'Bienvenue dans DUNYA',
                style: TextStyle(fontSize: 24, fontWeight: FontWeight.w900, color: Color(0xFF17131F)),
              ),
              const SizedBox(height: 6),
              const Text(
                'Choisissez la langue de vos conversations. Touchez une carte pour l’écouter.',
                style: TextStyle(fontSize: 14, height: 1.4, color: Color(0xFF7D7566)),
              ),
              const SizedBox(height: 16),
              for (final m in DunyaLanguageMode.values)
                _ModeTile(
                  mode: m,
                  selected: m == _selected,
                  onTap: () {
                    setState(() => _selected = m);
                    unawaited(widget.onPreview(m));
                  },
                ),
              const SizedBox(height: 8),
              FilledButton(
                onPressed: _selected == null ? null : () => Navigator.of(context).pop(_selected),
                style: FilledButton.styleFrom(
                  minimumSize: const Size.fromHeight(54),
                  backgroundColor: const Color(0xFF17131F),
                  textStyle: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800),
                ),
                child: const Text('Commencer'),
              ),
            ],
          ),
        ),
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
    _byt5Installed = await DunyaByt5.instance.activateIfInstalled();
    if (mounted) setState(() {});

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
            const Text('Réglages DUNYA', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w900, color: Color(0xFF17131F))),
            const SizedBox(height: 14),
            _section('Intelligence'),
            const Text('Exécution : Auto · En ligne · Hors ligne',
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
            const SizedBox(height: 8),
            const Text(
              'Auto : serveur FITILA connecté, modèles locaux en secours. '
              'En ligne : aucun téléchargement nécessaire. '
              'Hors ligne : aucun dialogue envoyé au serveur ; fonctionnalités selon les packs installés.',
              style: TextStyle(fontSize: 12, color: Color(0xFF7D7566)),
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
                  ? 'Traduction, mémoire, rappels et calculs. Rapide, pour tous les téléphones.'
                  : 'IA serveur disponible sans modèle ; Gemma local facultatif (2,6 Go) pour parler sans Internet.',
              style: const TextStyle(fontSize: 12.5, color: Color(0xFF7D7566)),
            ),
            if (_settings.intelligence == DunyaIntelligence.smart) ...[
              const SizedBox(height: 10),
              _card(
                icon: _brainInstalled ? Icons.check_circle_rounded : Icons.memory_rounded,
                iconColor: _brainInstalled ? const Color(0xFF4F8A68) : const Color(0xFF9C6B1D),
                title: _brainInstalled ? 'Cerveau installé' : 'Cerveau DUNYA (2,6 Go)',
                subtitle: !canRun
                    ? (device.supportedProcessor
                        ? 'Ce téléphone ($ram Mo de RAM) est trop juste : le mode Essentiel est conseillé.'
                        : 'Le processeur de ce téléphone (32 bits) ne peut pas faire tourner le cerveau : mode Essentiel.')
                    : _brainLabel ?? (_brainInstalled ? 'Fonctionne sans Internet.' : 'À télécharger une fois, en Wi-Fi de préférence.'),
                trailing: _brainInstalled
                    ? TextButton(onPressed: _removeBrain, child: const Text('Supprimer'))
                    : _downloading || !canRun
                        ? null
                        : TextButton(onPressed: _downloadBrain, child: const Text('Télécharger')),
                progress: _downloading ? (_brainProgress ?? -1) : null,
              ),
            ],
            const SizedBox(height: 18),
            _section('Conversation'),
            _switch('Mains libres (DUNYA réécoute après chaque réponse)', _settings.handsFree,
                (v) => _settings.update(handsFree: v)),
            _switch('Sous-titres en direct', _settings.subtitles, (v) => _settings.update(subtitles: v)),
            _switch('Sous-titres français en mode baatɔnum', _settings.frenchSubtitlesInBariba,
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
            _section('Packs hors ligne'),
            const Padding(
              padding: EdgeInsets.only(bottom: 10),
              child: Text('Téléchargez une fois, utilisez sans Internet.',
                style: TextStyle(fontSize: 12.5, color: Color(0xFF625B54))),
            ),
            for (final source in dunyaVoicePackSources)
              Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: _card(
                  icon: _packInstalled(source)
                      ? Icons.check_circle_rounded
                      : source.id == dunyaTranslationPackId
                          ? Icons.translate_rounded : Icons.download_rounded,
                  iconColor: const Color(0xFF9C6B1D),
                  title: source.id == dunyaTranslationPackId
                      ? 'Traduction FR ↔ Baatɔnum'
                      : source.id == dunyaVoiceCorePackId
                          ? 'Voix DUNYA' : 'Voix française',
                  subtitle: _packInstalled(source) ? 'Installé · Prêt hors ligne'
                      : source.id == dunyaTranslationPackId
                          ? 'Traduire hors ligne · Bêta en test'
                          : source.id == dunyaVoiceCorePackId
                              ? 'Parler et écouter hors ligne'
                              : 'Voix de secours',
                  trailing: _packInstalled(source)
                      ? const Icon(Icons.check_circle, color: Color(0xFF428267), size: 26)
                      : TextButton(
                          onPressed: () {
                            Navigator.of(context).pop();
                            unawaited(widget.onDownloadVoice(source));
                          },
                          child: const Text('Télécharger',
                            style: TextStyle(fontWeight: FontWeight.w800,
                              color: Color(0xFF825500))),
                        ),
                ),
              ),
            const SizedBox(height: 6),
            OutlinedButton.icon(
              onPressed: () {
                Navigator.of(context).pop();
                unawaited(widget.onInstallVoiceFile());
              },
              icon: const Icon(Icons.folder_open_outlined),
              label: const Text('Installer depuis un fichier'),
            ),
            const SizedBox(height: 18),
            _section('Confidentialité'),
            const Text(
              'Hors ligne : rien n’est envoyé. En ligne : FITILA traite la demande.',
              style: TextStyle(fontSize: 12.5, color: Color(0xFF7D7566)),
            ),
            TextButton.icon(
              onPressed: () {
                Navigator.of(context).pop();
                unawaited(widget.onClear());
              },
              icon: const Icon(Icons.delete_sweep_outlined),
              label: Text('Nouvelle conversation (${_settings.mode.label})'),
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
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        child: Padding(
          padding: const EdgeInsets.fromLTRB(12, 10, 6, 10),
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
                        Text(subtitle, style: const TextStyle(fontSize: 12, color: Color(0xFF7D7566))),
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
