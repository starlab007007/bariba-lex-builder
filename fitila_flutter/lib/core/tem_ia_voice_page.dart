/// Discussion vocale directe et continue pour Fitila IA (Tem IA / Code Foncier).
///
/// Même principe d'échange que DUNYA Voix : parlez, la question est transcrite
/// puis la réponse est lue à voix haute ; en mode mains libres, l'écoute
/// reprend automatiquement à la fin de la lecture. En ligne, la réponse vient
/// d'un raisonnement conversationnel strictement borné aux articles du Code
/// foncier retrouvés par le serveur (jamais de connaissance générale). Hors
/// ligne (pas de réseau, serveur indisponible), elle retombe automatiquement
/// sur la recherche locale embarquée inchangée (`FoncierRag.answer`,
/// 100% hors-ligne) — voir `tem_ia_assistant.dart` pour la logique partagée
/// avec l'écran texte.
///
/// Entrée vocale : `bariba-stt` (Omnilingual) ou `transcribe-audio` (français),
/// avec détection de silence (`DunyaMicCapture`, partagée avec DUNYA). Sortie
/// vocale : `bariba-tts` (Meta MMS), comme le lecteur de chaque réponse en
/// mode texte de Fitila IA.
library;

import 'dart:async';
import 'dart:math' as math;
import 'dart:typed_data';

import 'package:audioplayers/audioplayers.dart' as audio;
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_tts/flutter_tts.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../dunya/voice/dunya_cloud_voice.dart';
import '../dunya/voice/dunya_french_speech.dart';
import '../dunya/voice/dunya_shared_speech.dart';
import 'offline.dart';
import '../dunya/voice/dunya_mic_capture.dart';
import 'fitila_translation_audio.dart';
import 'foncier_rag.dart';
import 'tem_ia_assistant.dart';

enum _Phase { idle, listening, thinking, speaking }

/// Vitesses de lecture proposées (mêmes valeurs que les autres écrans
/// vocaux, web et Flutter).
const List<double> _speechRates = [0.75, 1.0, 1.25, 1.5];

String _formatSpeechRate(double rate) {
  final text = rate == rate.roundToDouble() ? rate.toStringAsFixed(0) : rate.toStringAsFixed(2);
  return '${text.replaceAll('.', ',')}×';
}

class TemIaVoicePage extends StatefulWidget {
  const TemIaVoicePage({super.key, this.onExit, this.onSearch});

  final VoidCallback? onExit;
  final Future<FoncierAnswer> Function(String)? onSearch;

  @override
  State<TemIaVoicePage> createState() => _TemIaVoicePageState();
}

class _TemIaVoicePageState extends State<TemIaVoicePage> {
  static const _light = Color(0xFFCFF2DC);
  static const _deep = Color(0xFF1A5234);

  final DunyaMicCapture _mic = DunyaMicCapture();
  final _frenchSpeech = DunyaFrenchSpeech();
  final _tts = FlutterTts();
  final audio.AudioPlayer _player = audio.AudioPlayer();

  _Phase _phase = _Phase.idle;
  bool _session = false;
  bool _handsFree = true;
  String _inputLang = 'bba'; // 'bba' | 'fr'
  double _level = 0;
  int _emptyListens = 0;
  int _turn = 0;
  String _caption = '';
  String? _lastAnswer;
  // Langue de [_lastAnswer], pour que « Réécouter » utilise la même voix
  // (Baatɔnum ou français) que la lecture d'origine.
  bool _lastAnswerBariba = true;
  String? _notice;
  List<String> _words = const [];
  int _activeWord = -1;
  StreamSubscription<Duration>? _posSub;
  StreamSubscription<Duration>? _durSub;
  Duration _audioDuration = Duration.zero;
  bool _subtitles = true;
  double _speechRate = 1.0;

  @override
  void initState() {
    super.initState();
    unawaited(_loadPrefs());
  }

  Future<void> _loadPrefs() async {
    try {
      final p = await SharedPreferences.getInstance();
      final subtitles = p.getBool('temia_voice_subtitles');
      final rate = p.getDouble('temia_voice_speechRate');
      if (!mounted) return;
      setState(() {
        if (subtitles != null) _subtitles = subtitles;
        if (rate != null && _speechRates.contains(rate)) _speechRate = rate;
      });
    } catch (_) {
      // Préférences indisponibles (stockage restreint) : on garde les valeurs par défaut.
    }
  }

  void _toggleSubtitles() {
    final next = !_subtitles;
    setState(() => _subtitles = next);
    unawaited(_savePref(() async => (await SharedPreferences.getInstance()).setBool('temia_voice_subtitles', next)));
  }

  void _cycleSpeed() {
    final next = _speechRates[(_speechRates.indexOf(_speechRate) + 1) % _speechRates.length];
    setState(() => _speechRate = next);
    unawaited(_savePref(() async => (await SharedPreferences.getInstance()).setDouble('temia_voice_speechRate', next)));
  }

  Future<void> _savePref(Future<void> Function() write) async {
    try {
      await write();
    } catch (_) {
      // Préférences indisponibles : la valeur reste en mémoire pour cette session.
    }
  }

  @override
  void dispose() {
    _session = false;
    _turn++;
    unawaited(_mic.dispose());
    unawaited(_frenchSpeech.cancel());
    unawaited(_player.dispose());
    unawaited(_tts.stop());
    unawaited(_posSub?.cancel());
    unawaited(_durSub?.cancel());
    super.dispose();
  }

  void _endSession() {
    _session = false;
    _turn++;
    unawaited(_mic.cancel());
    unawaited(_frenchSpeech.cancel());
    unawaited(_player.stop());
    unawaited(_tts.stop());
    if (mounted) {
      setState(() {
        _phase = _Phase.idle;
        _notice = null;
      });
    }
  }

  Future<void> _onOrbTap() async {
    unawaited(HapticFeedback.lightImpact());
    switch (_phase) {
      case _Phase.listening:
        await _frenchSpeech.stop();
        await _mic.stop();
        return;
      case _Phase.speaking:
        _turn++;
        await _player.stop();
        await _tts.stop();
        _session = true;
        unawaited(_listenTurn());
        return;
      case _Phase.thinking:
        _endSession();
        return;
      case _Phase.idle:
        break;
    }
    final hasMic = await _mic.hasPermission();
    if (!mounted) return;
    if (!hasMic) {
      setState(() => _notice = 'Autorisez le micro pour parler à Tem IA.');
      return;
    }
    _session = true;
    _emptyListens = 0;
    unawaited(_listenTurn());
  }

  Future<void> _listenTurn() async {
    if (!mounted || !_session) return;
    final turn = ++_turn;
    setState(() {
      _phase = _Phase.listening;
      _caption = '';
      _words = const [];
      _activeWord = -1;
      _level = 0;
      _notice = null;
    });
    Float32List? samples;
    String? frenchText;
    try {
      if (_inputLang == 'fr' && FitilaOffline.online.value && await _frenchSpeech.available()) {
        frenchText = await _frenchSpeech.listen(
          onPartial: (text) { if (mounted && turn == _turn) setState(() => _caption = text); },
          onLevel: (level) { if (mounted && turn == _turn) setState(() => _level = level); },
        );
      } else {
      var recognizingPartial = false;
      var acceptingPartial = true;
      samples = await _mic.listen(
        onLevel: (level) {
          if (mounted && turn == _turn) setState(() => _level = level);
        },
        onAudioSnapshot: _inputLang != 'bba' ? null : (snapshot) {
          if (recognizingPartial || !acceptingPartial) return;
          recognizingPartial = true;
          unawaited(_transcribe(snapshot).then((partial) {
            if (mounted && acceptingPartial && turn == _turn &&
                _phase == _Phase.listening && partial.trim().isNotEmpty) {
              setState(() => _caption = partial.trim());
            }
          }).catchError((Object _) {
            // The final recognition will still run on the complete utterance.
          }).whenComplete(() => recognizingPartial = false));
        },
      );
      acceptingPartial = false;
      }
    } catch (_) {
      // Échec dans la capture micro elle-même (permission refusée, matériel
      // indisponible) : le SEUL cas où "Microphone indisponible." est exact.
      if (turn != _turn) return;
      _session = false;
      if (mounted) {
        setState(() {
          _phase = _Phase.idle;
          _notice = 'Microphone indisponible.';
        });
      }
      return;
    }
    if (!mounted || turn != _turn || !_session) return;
    if (samples == null && (frenchText == null || frenchText.isEmpty)) {
      _emptyListens++;
      if (_emptyListens >= 2 || !_handsFree) {
        _session = false;
        setState(() {
          _phase = _Phase.idle;
          _notice = 'Je n’ai rien entendu. Touchez pour réessayer.';
        });
      } else {
        unawaited(_listenTurn());
      }
      return;
    }
    _emptyListens = 0;
    setState(() { _phase = _Phase.thinking; _caption = _caption.isEmpty && _inputLang == 'bba' ? 'Transcription en cours…' : _caption; });
    var heard = false;
    try {
      final text = frenchText ?? await _transcribe(samples!);
      heard = text.trim().isNotEmpty;
      if (!mounted || turn != _turn || !_session) return;
      if (text.trim().isEmpty) {
        setState(() {
          _phase = _Phase.idle;
          _notice = 'Je n’ai pas compris. Réessayez.';
        });
        if (_session && _handsFree) unawaited(_listenTurn());
        return;
      }
      setState(() => _caption = text.trim());
      await _answerTurn(text.trim(), turn);
    } catch (_) {
      // Échec après la capture micro (transcription/IA/réseau) : le micro a
      // fonctionné, donc jamais "Microphone indisponible." ici — message
      // distinct pour ne pas orienter le diagnostic vers le mauvais endroit.
      if (turn != _turn) return;
      _session = false;
      if (mounted) {
        setState(() {
          _phase = _Phase.idle;
          _notice = heard
              ? 'Votre voix a bien été comprise, mais le cerveau en ligne est momentanément indisponible. Réessayez dans un instant.'
              : 'Service de reconnaissance vocale indisponible. Réessayez.';
        });
      }
    }
  }

  /// Transcrit un enregistrement 16 kHz mono via le même service que la
  /// dictée du mode texte — jamais le moteur d'IA générale ni ByT5.
  Future<String> _transcribe(Float32List samples) async {
    if (!FitilaOffline.online.value) {
      final engine = await DunyaSharedSpeech.instance.ensureStarted();
      if (engine == null) throw StateError('Installez le pack de reconnaissance vocale.');
      return engine.transcribe(samples);
    }
    var transcript = '';
    final voice = DunyaCloudVoice();
    try {
      await voice.turn(samples: samples, language: _inputLang,
        replyLanguage: _inputLang, transcribeOnly: true,
        onEvent: (event) async {
          if (event['type'] == 'transcript') transcript = (event['text'] ?? '').toString().trim();
        });
    } finally { voice.cancel(); }
    return transcript;
  }

  /// En ligne : raisonnement conversationnel borné aux articles du Code
  /// Foncier retrouvés par le serveur (accueil, compréhension, citation
  /// des articles, relance). Hors ligne (pas de réseau, serveur
  /// indisponible) : retombe automatiquement sur la recherche locale
  /// embarquée inchangée ([FoncierRag.answer]).
  Future<void> _answerTurn(String question, int turn) async {
    setState(() => _caption = question);
    try {
      if (turn == 1 && isTemIaGreetingOnly(question)) {
        if (!mounted || turn != _turn || !_session) return;
        _lastAnswer = temIaGreetingFr;
        _lastAnswerBariba = false;
        setState(() {
          _phase = _Phase.speaking;
          _caption = temIaGreetingFr;
          _words = temIaGreetingFr.split(RegExp(r'\s+')).where((w) => w.isNotEmpty).toList(growable: false);
          _activeWord = -1;
        });
        await _speak(temIaGreetingFr, turn, bariba: false);
        return;
      }

      final online = await tryTemIaOnline(question);
      if (!mounted || turn != _turn || !_session) return;
      if (online != null && online.text.trim().isNotEmpty) {
        final answer = online.text.trim();
        _lastAnswer = answer;
        _lastAnswerBariba = online.bariba;
        setState(() {
          _phase = _Phase.speaking;
          _caption = answer;
          _words = answer.split(RegExp(r'\s+')).where((w) => w.isNotEmpty).toList(growable: false);
          _activeWord = -1;
        });
        await _speak(answer, turn, bariba: online.bariba);
        return;
      }

      final result = await (widget.onSearch?.call(question) ?? FoncierRag.answer(question));
      if (!mounted || turn != _turn || !_session) return;
      final answer = result.answer.trim();
      if (answer.isEmpty) {
        setState(() => _phase = _Phase.idle);
        if (_session && _handsFree) unawaited(_listenTurn());
        return;
      }
      _lastAnswer = answer;
      _lastAnswerBariba = true;
      setState(() {
        _phase = _Phase.speaking;
        _caption = answer;
        _words = answer.split(RegExp(r'\s+')).where((w) => w.isNotEmpty).toList(growable: false);
        _activeWord = -1;
      });
      await _speak(answer, turn);
    } catch (_) {
      if (turn != _turn) return;
      setState(() {
        _phase = _Phase.idle;
        _notice = 'Le corpus foncier local est indisponible.';
      });
      if (_session && _handsFree) unawaited(_listenTurn());
    }
  }

  Future<void> _speak(String text, int turn, {bool bariba = true}) async {
    unawaited(_posSub?.cancel());
    unawaited(_durSub?.cancel());
    _audioDuration = Duration.zero;
    try {
      if (!bariba) {
        await _tts.setLanguage('fr-FR');
        await _tts.setSpeechRate(.47 * _speechRate);
        await _tts.awaitSpeakCompletion(true);
        await _tts.speak(text);
        return;
      }
      final localPath = !FitilaOffline.online.value
          ? await DunyaSharedSpeech.instance.synthesizeBariba(text) : null;
      if (!FitilaOffline.online.value && localPath == null) {
        throw StateError('Installez le pack vocal baatɔnum pour écouter hors ligne.');
      }
      final generated = localPath == null
          ? await FitilaTranslationAudio.synthesize(text: text, bariba: true) : null;
      if (!mounted || turn != _turn) return;
      final url = generated?.url;
      _durSub = _player.onDurationChanged.listen((d) {
        if (turn == _turn) _audioDuration = d;
      });
      // Avance le surlignage mot par mot proportionnellement à la position de
      // lecture (pas d'alignement phonétique exact disponible côté TTS).
      _posSub = _player.onPositionChanged.listen((pos) {
        if (!mounted || turn != _turn) return;
        final total = _audioDuration.inMilliseconds;
        if (total <= 0 || _words.isEmpty) return;
        final fraction = (pos.inMilliseconds / total).clamp(0.0, 1.0);
        final idx = (fraction * _words.length).floor().clamp(0, _words.length - 1);
        if (idx != _activeWord) setState(() => _activeWord = idx);
      });
      final finished = _player.onPlayerComplete.first;
      await _player.setPlaybackRate(_speechRate);
      if (localPath != null) {
        await _player.play(audio.DeviceFileSource(localPath));
      } else if (url != null && url.isNotEmpty) {
        await _player.play(audio.UrlSource(url));
      } else {
        final path = await generated?.materialize();
        if (path == null) throw StateError('Audio indisponible.');
        await _player.play(audio.DeviceFileSource(path));
      }
      await finished.timeout(const Duration(seconds: 60), onTimeout: () {});
    } catch (error) {
      if (turn != _turn) return;
      setState(
        () => _notice =
            error is StateError ? error.message : 'Lecture indisponible.',
      );
    } finally {
      unawaited(_posSub?.cancel());
      unawaited(_durSub?.cancel());
      if (mounted && turn == _turn) {
        setState(() {
          _phase = _Phase.idle;
          _activeWord = _words.length;
        });
        if (_session && _handsFree) unawaited(_listenTurn());
      }
    }
  }

  Future<void> _replayLast() async {
    final answer = _lastAnswer;
    if (answer == null || _phase != _Phase.idle) return;
    _session = false;
    final turn = ++_turn;
    setState(() {
      _phase = _Phase.speaking;
      _caption = answer;
      _words = answer.split(RegExp(r'\s+')).where((w) => w.isNotEmpty).toList(growable: false);
      _activeWord = -1;
      _notice = null;
    });
    await _speak(answer, turn, bariba: _lastAnswerBariba);
  }

  void _setLang(String lang) {
    if (lang == _inputLang) return;
    _endSession();
    setState(() => _inputLang = lang);
  }

  String get _label => switch (_phase) {
        _Phase.listening => 'Je vous écoute',
        _Phase.thinking => 'Je cherche dans le Code Foncier…',
        _Phase.speaking => 'Touchez pour interrompre',
        _Phase.idle => 'Touchez pour parler',
      };

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: const BoxDecoration(
        gradient: RadialGradient(
          center: Alignment(0, -0.25),
          radius: 1.1,
          colors: [Color(0xFF2F4E3C), Color(0xFF16271E), Color(0xFF0E1813)],
          stops: [0, 0.55, 1],
        ),
      ),
      child: SafeArea(
        child: Column(
          children: [
            _topBar(context),
            Expanded(child: _voiceView()),
            if (_notice != null)
              Padding(
                padding: const EdgeInsets.fromLTRB(18, 0, 18, 10),
                child: Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 16,
                    vertical: 10,
                  ),
                  decoration: BoxDecoration(
                    color: _light.withValues(alpha: .15),
                    borderRadius: BorderRadius.circular(18),
                    border: Border.all(color: _light.withValues(alpha: .35)),
                  ),
                  child: Text(
                    _notice!,
                    textAlign: TextAlign.center,
                    style: const TextStyle(
                      color: Color(0xFFBDEFD0),
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
              ),
            _controls(),
          ],
        ),
      ),
    );
  }

  Widget _topBar(BuildContext context) => Padding(
        padding: const EdgeInsets.fromLTRB(12, 10, 12, 6),
        child: Row(
          children: [
            _circleButton(
              tooltip: 'Quitter le mode vocal',
              icon: Icons.close_rounded,
              onTap: () { if (widget.onExit != null) { widget.onExit!(); } else { Navigator.of(context).maybePop(); } },
            ),
            const SizedBox(width: 10),
            const Icon(Icons.balance_rounded, color: _light, size: 20),
            const SizedBox(width: 6),
            const Expanded(
              child: Text(
                'Tem IA · Vocal',
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.w800,
                  fontSize: 16,
                ),
              ),
            ),
            Container(
              padding: const EdgeInsets.all(3),
              decoration: BoxDecoration(
                color: const Color(0x1AFFFFFF),
                borderRadius: BorderRadius.circular(999),
                border: Border.all(color: const Color(0x30FFFFFF)),
              ),
              child: Row(
                children: [
                  _langChip('Baatɔnum', 'bba'),
                  _langChip('Français', 'fr'),
                ],
              ),
            ),
          ],
        ),
      );

  Widget _langChip(String label, String value) {
    final selected = _inputLang == value;
    return GestureDetector(
      onTap: () => _setLang(value),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 150),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
        decoration: BoxDecoration(
          color: selected ? _light : Colors.transparent,
          borderRadius: BorderRadius.circular(999),
        ),
        child: Text(
          label,
          style: TextStyle(
            color: selected ? _deep : Colors.white.withValues(alpha: .9),
            fontWeight: FontWeight.w800,
            fontSize: 13,
          ),
        ),
      ),
    );
  }

  Widget _circleButton({
    required String tooltip,
    required IconData icon,
    required VoidCallback onTap,
  }) {
    return Tooltip(
      message: tooltip,
      child: Material(
        color: const Color(0x1FFFFFFF),
        shape: const CircleBorder(side: BorderSide(color: Color(0x30FFFFFF))),
        child: InkWell(
          customBorder: const CircleBorder(),
          onTap: onTap,
          child: SizedBox(
            width: 46,
            height: 46,
            child: Icon(icon, color: Colors.white),
          ),
        ),
      ),
    );
  }

  Widget _voiceView() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 24),
      child: Column(
        children: [
          const Spacer(),
          GestureDetector(
            onTap: () => unawaited(_onOrbTap()),
            child: _Orb(phase: _phase, level: _level),
          ),
          const SizedBox(height: 24),
          Text(
            _label,
            textAlign: TextAlign.center,
            style: const TextStyle(
              color: Colors.white,
              fontSize: 24,
              fontWeight: FontWeight.w800,
            ),
          ),
          if (_phase == _Phase.idle) ...[
            const SizedBox(height: 6),
            Text(
              _inputLang == 'fr'
                  ? 'Posez votre question en français.'
                  : 'Yaa sɔ̃ɔ tem bausu gari Baribarum.',
              textAlign: TextAlign.center,
              style: TextStyle(color: Colors.white.withValues(alpha: .8)),
            ),
          ],
          if (_lastAnswer != null && _phase == _Phase.idle) ...[
            const SizedBox(height: 14),
            OutlinedButton.icon(
              onPressed: () => unawaited(_replayLast()),
              icon: const Icon(Icons.volume_up_rounded, color: Colors.white),
              label: const Text(
                'Réécouter',
                style: TextStyle(color: Colors.white),
              ),
              style: OutlinedButton.styleFrom(
                side: const BorderSide(color: Color(0x40FFFFFF)),
                shape: const StadiumBorder(),
              ),
            ),
          ],
          const Spacer(),
          if (_subtitles && _caption.isNotEmpty)
            Flexible(
              flex: 2,
              child: SingleChildScrollView(
                child: Container(
                  width: double.infinity,
                  margin: const EdgeInsets.only(bottom: 14),
                  padding: const EdgeInsets.all(18),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF9F7F0),
                    borderRadius: BorderRadius.circular(22),
                    border: Border.all(color: const Color(0xFFD3E2D5)),
                    boxShadow: const [BoxShadow(color: Color(0x33000000), blurRadius: 20, offset: Offset(0, 8))],
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(_phase == _Phase.speaking ? 'Réponse de TEM IA' : 'Transcription en direct',
                        style: const TextStyle(color: _deep, fontSize: 13, fontWeight: FontWeight.w800)),
                      const SizedBox(height: 12),
                      DefaultTextStyle(
                        style: const TextStyle(color: Color(0xFF191D2B), fontSize: 21, height: 1.45, fontWeight: FontWeight.w600),
                        child: Text(_caption, textAlign: TextAlign.left),
                      ),
                    ],
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }

  /// Le texte de la réponse : surligné mot par mot au fil de la lecture
  /// audio pendant `speaking` (effet « karaoké »), texte simple sinon.
  // Kept for future synchronized transcript rendering.
  // ignore: unused_element
  Widget _captionWidget() {
    if (_phase != _Phase.speaking || _words.isEmpty) {
      return Text(
        _caption,
        textAlign: TextAlign.center,
        maxLines: 6,
        overflow: TextOverflow.ellipsis,
        style: const TextStyle(
          color: Colors.white,
          fontSize: 19,
          fontWeight: FontWeight.w700,
          height: 1.35,
        ),
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
                color: i <= _activeWord ? Colors.white : Colors.white.withValues(alpha: .32),
                fontSize: 19,
                fontWeight: FontWeight.w700,
                height: 1.35,
              ),
              child: Text(_words[i]),
            ),
          ),
      ],
    );
  }

  Widget _controls() => Padding(
        padding: const EdgeInsets.fromLTRB(20, 4, 20, 18),
        child: Wrap(
          alignment: WrapAlignment.center,
          spacing: 10,
          runSpacing: 10,
          children: [
            OutlinedButton.icon(
              onPressed: () => setState(() => _handsFree = !_handsFree),
              icon: Icon(
                _handsFree ? Icons.headset_mic_rounded : Icons.headset_off_rounded,
                color: Colors.white,
              ),
              label: Text(
                'Mains libres ${_handsFree ? 'activées' : 'désactivées'}',
                style: const TextStyle(color: Colors.white),
              ),
              style: OutlinedButton.styleFrom(
                side: const BorderSide(color: Color(0x40FFFFFF)),
                shape: const StadiumBorder(),
              ),
            ),
            OutlinedButton.icon(
              onPressed: _toggleSubtitles,
              icon: Icon(
                _subtitles ? Icons.closed_caption_rounded : Icons.closed_caption_off_rounded,
                color: Colors.white,
              ),
              label: const Text('Sous-titres', style: TextStyle(color: Colors.white)),
              style: OutlinedButton.styleFrom(
                side: const BorderSide(color: Color(0x40FFFFFF)),
                shape: const StadiumBorder(),
              ),
            ),
            OutlinedButton.icon(
              onPressed: _cycleSpeed,
              icon: const Icon(Icons.speed_rounded, color: Colors.white),
              label: Text('Vitesse ${_formatSpeechRate(_speechRate)}', style: const TextStyle(color: Colors.white)),
              style: OutlinedButton.styleFrom(
                side: const BorderSide(color: Color(0x40FFFFFF)),
                shape: const StadiumBorder(),
              ),
            ),
            if (_phase != _Phase.idle)
              OutlinedButton.icon(
                onPressed: _endSession,
                icon: const Icon(Icons.stop_circle_rounded, color: Colors.white),
                label: const Text('Arrêter', style: TextStyle(color: Colors.white)),
                style: OutlinedButton.styleFrom(
                  side: const BorderSide(color: Color(0xFFD4503F)),
                  backgroundColor: const Color(0xFFD4503F),
                  shape: const StadiumBorder(),
                ),
              ),
          ],
        ),
      );
}

class _Orb extends StatelessWidget {
  const _Orb({required this.phase, required this.level});

  final _Phase phase;
  final double level;

  @override
  Widget build(BuildContext context) {
    final (Color light, Color mid, Color deep) = switch (phase) {
      _Phase.idle => (
          const Color(0xFFCFF2DC),
          const Color(0xFF86D9A8),
          const Color(0xFF1F5C3B),
        ),
      _Phase.listening => (
          const Color(0xFFD7F5E3),
          const Color(0xFF5FCB8E),
          const Color(0xFF1A5234),
        ),
      _Phase.thinking => (
          const Color(0xFFD9D2FF),
          const Color(0xFF8E7CFF),
          const Color(0xFF3A2A9C),
        ),
      _Phase.speaking => (
          const Color(0xFFFFE9B8),
          const Color(0xFFF2A94A),
          const Color(0xFF9A4A14),
        ),
    };
    final double boost = phase == _Phase.listening ? math.min(1.0, level) : 0.0;
    final double scale = 1.0 + boost * 0.28;
    final double haloSize = 250.0 * (0.8 + (scale - 1.0) * 1.6);
    final double orbSize = 170.0 * scale;
    return SizedBox(
      width: 250,
      height: 250,
      child: Stack(
        alignment: Alignment.center,
        children: [
          AnimatedContainer(
            duration: const Duration(milliseconds: 250),
            width: haloSize,
            height: haloSize,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: mid.withValues(alpha: phase == _Phase.idle ? .18 : .32),
            ),
          ),
          AnimatedContainer(
            duration: const Duration(milliseconds: 150),
            width: orbSize,
            height: orbSize,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              gradient: RadialGradient(
                center: const Alignment(-0.36, -0.44),
                colors: [light, mid, deep],
                stops: const [0, 0.38, 1],
              ),
              boxShadow: [
                BoxShadow(
                  color: mid.withValues(alpha: .55),
                  blurRadius: 60,
                  offset: const Offset(0, 24),
                ),
              ],
            ),
            child: phase == _Phase.idle
                ? Icon(
                    Icons.mic_rounded,
                    size: 56,
                    color: deep.withValues(alpha: .75),
                  )
                : null,
          ),
        ],
      ),
    );
  }
}
