/// Discussion vocale directe et continue pour Fitila IA (assistant général).
///
/// Même principe d'échange que la référence web (`FitilaIAVoice.tsx`) et que
/// DUNYA Voix / Tem IA Vocal : parlez, la question est transcrite puis la
/// réponse est lue à voix haute ; en mode mains libres, l'écoute reprend
/// automatiquement à la fin de la lecture. La réponse vient du véritable
/// assistant IA général de la plateforme (edge function `fitila-ia-chat`),
/// sans aucun recadrage de sujet, exactement comme sur le web — ou, hors
/// connexion, du cerveau DUNYA local (Gemma) quand il est installé : voir
/// `_ask` dans `AiScreen` (`main.dart`), partagé via `onAsk`. Sans ce
/// cerveau installé, pas d'alternative hors ligne, contrairement à Tem IA.
/// La lecture à voix haute reste en ligne (`bariba-tts`) avec un repli sur
/// la voix de l'appareil (`LocalSpeech`) quand elle échoue hors connexion.
///
/// Intégré en place dans l'écran texte Fitila IA (`AiScreen`, `main.dart`) via
/// `onExit`/`onAsk`, pour que le texte et le vocal partagent le même fil de
/// conversation — comme le web, où `FitilaIA.tsx` bascule simplement
/// `voiceMode` et passe sa propre fonction `sendMessage` en `onAsk`.
///
/// Entrée vocale : `bariba-stt` (Omnilingual) ou `transcribe-audio` (français),
/// avec détection de silence (`DunyaMicCapture`, partagée avec DUNYA). Sortie
/// vocale : `bariba-tts` (Meta MMS), comme le lecteur de chaque réponse en
/// mode texte de Fitila IA.
library;

import 'dart:async';
import 'dart:convert';
import 'dart:math' as math;
import 'dart:typed_data';

import 'package:audioplayers/audioplayers.dart' as audio;
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../dunya/voice/dunya_cloud_voice.dart';
import '../dunya/voice/dunya_mic_capture.dart';
import 'fitila_backend.dart';
import 'fitila_translation_audio.dart';
import 'local_speech.dart';
import 'offline.dart';

enum _Phase { idle, listening, thinking, speaking }

/// Vitesses de lecture proposées (mêmes valeurs que les écrans vocaux web).
const List<double> _speechRates = [0.75, 1.0, 1.25, 1.5];

String _formatSpeechRate(double rate) {
  final text = rate == rate.roundToDouble() ? rate.toStringAsFixed(0) : rate.toStringAsFixed(2);
  return '${text.replaceAll('.', ',')}×';
}

class FitilaIaVoicePage extends StatefulWidget {
  /// `onExit`/`onAsk` permettent d'intégrer cet écran en place dans un autre
  /// (comme `AiScreen`), pour partager son fil de conversation — exactement
  /// le `onExit`/`onAsk` de la référence web `FitilaIAVoice.tsx`. Sans eux
  /// (usage autonome), on retombe sur `Navigator.pop` et sur l'assistant
  /// général direct, toujours sans recadrage de sujet.
  const FitilaIaVoicePage({super.key, this.onExit, this.onAsk});

  final VoidCallback? onExit;

  /// Envoie la question au même assistant général que le mode texte et
  /// renvoie le texte de la réponse (ou `null` si rien n'a été envoyé).
  final Future<String?> Function(String text)? onAsk;

  @override
  State<FitilaIaVoicePage> createState() => _FitilaIaVoicePageState();
}

class _FitilaIaVoicePageState extends State<FitilaIaVoicePage> with SingleTickerProviderStateMixin {
  static const _light = Color(0xFFE3DEFB);
  static const _deep = Color(0xFF3A2E8C);

  final DunyaMicCapture _mic = DunyaMicCapture();
  final audio.AudioPlayer _player = audio.AudioPlayer();
  late final AnimationController _dots;

  _Phase _phase = _Phase.idle;
  bool _session = false;
  bool _handsFree = true;
  String _inputLang = 'bba'; // 'bba' | 'fr'
  double _level = 0;
  int _emptyListens = 0;
  int _turn = 0;
  String _caption = '';
  String? _lastAnswer;
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
    _dots = AnimationController(vsync: this, duration: const Duration(milliseconds: 1100))..repeat();
    unawaited(_loadPrefs());
  }

  Future<void> _loadPrefs() async {
    try {
      final p = await SharedPreferences.getInstance();
      final subtitles = p.getBool('fitilaia_voice_subtitles');
      final rate = p.getDouble('fitilaia_voice_speechRate');
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
    unawaited(_savePref(() async => (await SharedPreferences.getInstance()).setBool('fitilaia_voice_subtitles', next)));
  }

  void _cycleSpeed() {
    final next = _speechRates[(_speechRates.indexOf(_speechRate) + 1) % _speechRates.length];
    setState(() => _speechRate = next);
    unawaited(_savePref(() async => (await SharedPreferences.getInstance()).setDouble('fitilaia_voice_speechRate', next)));
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
    unawaited(_player.dispose());
    final posSub = _posSub;
    if (posSub != null) unawaited(posSub.cancel());
    final durSub = _durSub;
    if (durSub != null) unawaited(durSub.cancel());
    _dots.dispose();
    super.dispose();
  }

  void _endSession() {
    _session = false;
    _turn++;
    unawaited(_mic.cancel());
    unawaited(_player.stop());
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
        await _mic.stop();
        return;
      case _Phase.speaking:
        _turn++;
        await _player.stop();
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
      setState(() => _notice = 'Autorisez le micro pour parler à Fitila IA.');
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
    try {
      final samples = await _mic.listen(
        onLevel: (level) {
          if (mounted && turn == _turn) setState(() => _level = level);
        },
      );
      if (!mounted || turn != _turn || !_session) return;
      if (samples == null) {
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
      setState(() => _phase = _Phase.thinking);
      final text = await _transcribe(samples);
      if (!mounted || turn != _turn || !_session) return;
      if (text.trim().isEmpty) {
        setState(() {
          _phase = _Phase.idle;
          _notice = 'Je n’ai pas compris. Réessayez.';
        });
        if (_session && _handsFree) unawaited(_listenTurn());
        return;
      }
      await _answerTurn(text.trim(), turn);
    } catch (_) {
      if (turn != _turn) return;
      _session = false;
      if (mounted) {
        setState(() {
          _phase = _Phase.idle;
          _notice = 'Microphone indisponible.';
        });
      }
    }
  }

  /// Transcrit un enregistrement 16 kHz mono via le même service que la
  /// dictée du mode texte — jamais le moteur d'IA générale ni ByT5.
  Future<String> _transcribe(Float32List samples) async {
    if (!FitilaBackend.configured) {
      throw StateError('Serveur FITILA indisponible.');
    }
    final dataUrl =
        'data:audio/wav;base64,${base64Encode(DunyaCloudVoice.wav16k(samples))}';
    final bba = _inputLang == 'bba';
    final response = await FitilaBackend.client.functions.invoke(
      bba ? 'bariba-stt' : 'transcribe-audio',
      body: bba
          ? <String, dynamic>{
              'audio': dataUrl,
              'robustMode': true,
              'speakerType': 'Auto',
              'languageCode': 'ba',
            }
          : <String, dynamic>{
              'audio': dataUrl,
              'fileName': 'voice.wav',
              'mimeType': 'audio/wav',
              'languageCode': 'fr',
            },
    );
    final data = response.data;
    if (data is! Map) return '';
    return (data['transcript'] ?? data['transcription'] ?? data['text'])
            ?.toString()
            .trim() ??
        '';
  }

  /// Pose la question au même assistant que le mode texte : via `widget.onAsk`
  /// quand cet écran est intégré en place (fil de conversation partagé, comme
  /// la référence web), sinon directement sur l'assistant général — jamais
  /// une recherche locale hors-ligne ni un recadrage de sujet.
  Future<String?> _ask(String text) {
    final onAsk = widget.onAsk;
    if (onAsk != null) return onAsk(text);
    return FitilaBackend.askFitilaIa(text);
  }

  Future<void> _answerTurn(String question, int turn) async {
    setState(() => _caption = question);
    try {
      final answer = (await _ask(question))?.trim() ?? '';
      if (!mounted || turn != _turn || !_session) return;
      if (answer.isEmpty) {
        setState(() => _phase = _Phase.idle);
        if (_session && _handsFree) unawaited(_listenTurn());
        return;
      }
      _lastAnswer = answer;
      setState(() {
        _phase = _Phase.speaking;
        _caption = answer;
        _words = answer.split(RegExp(r'\s+')).where((w) => w.isNotEmpty).toList(growable: false);
        _activeWord = -1;
      });
      await _speak(answer, turn);
    } catch (error) {
      if (turn != _turn) return;
      setState(() {
        _phase = _Phase.idle;
        _notice = error is StateError
            ? error.message
            : 'Fitila IA est indisponible pour le moment.';
      });
      if (_session && _handsFree) unawaited(_listenTurn());
    }
  }

  Future<void> _speak(String text, int turn) async {
    unawaited(_posSub?.cancel());
    unawaited(_durSub?.cancel());
    _audioDuration = Duration.zero;
    try {
      final generated = await FitilaTranslationAudio.synthesize(
        text: text,
        bariba: true,
      );
      if (!mounted || turn != _turn) return;
      final url = generated.url;
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
      if (url != null && url.isNotEmpty) {
        await _player.play(audio.UrlSource(url));
      } else {
        final path = await generated.materialize();
        if (path == null) throw StateError('Audio indisponible.');
        await _player.play(audio.DeviceFileSource(path));
      }
      await finished.timeout(const Duration(seconds: 60), onTimeout: () {});
    } catch (error) {
      if (turn != _turn) return;
      // Hors connexion : pas de voix FITILA (bariba-tts). On lit le texte
      // avec la voix de l'appareil — toujours en français ici, puisqu'une
      // réponse hors ligne de Fitila IA vient du cerveau local, qui raisonne
      // en français (voir `_askOfflineBrain` dans `AiScreen`).
      if (FitilaOffline.isNetworkError(error)) {
        FitilaOffline.reportFailure(error);
        // La remise à l'écoute (mains libres) et l'état `idle` sont déjà
        // posés par le `finally` ci-dessous, qu'on parle ou pas.
        if (await LocalSpeech.speak(text, bariba: false)) return;
      }
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
    await _speak(answer, turn);
  }

  void _setLang(String lang) {
    if (lang == _inputLang) return;
    _endSession();
    setState(() => _inputLang = lang);
  }

  String get _label => switch (_phase) {
        _Phase.listening => 'Je vous écoute',
        _Phase.thinking => 'Fitila IA réfléchit…',
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
          colors: [Color(0xFF342B63), Color(0xFF1C1733), Color(0xFF110F20)],
          stops: [0, 0.55, 1],
        ),
      ),
      child: SafeArea(
        child: Column(
          children: [
            _topBar(context),
            _modeTabs(context),
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
                      color: Color(0xFFD9D2FF),
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
              onTap: widget.onExit ?? () => Navigator.of(context).maybePop(),
            ),
            const SizedBox(width: 10),
            const Icon(Icons.smart_toy_rounded, color: _light, size: 20),
            const SizedBox(width: 6),
            const Expanded(
              child: Text(
                'Fitila IA · Vocal',
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

  /// Bascule Vocal / Écrit (comme le `role="tablist"` de la référence web
  /// `FitilaIAVoice.tsx`) : en plus du bouton Fermer, un choix explicite et
  /// visible en permanence pour revenir au texte, sans quitter l'écran.
  Widget _modeTabs(BuildContext context) => Padding(
        padding: const EdgeInsets.fromLTRB(20, 0, 20, 4),
        child: Container(
          padding: const EdgeInsets.all(4),
          decoration: BoxDecoration(
            color: const Color(0x14FFFFFF),
            borderRadius: BorderRadius.circular(999),
            border: Border.all(color: const Color(0x2EFFFFFF)),
          ),
          child: Row(
            children: [
              Expanded(
                child: Container(
                  padding: const EdgeInsets.symmetric(vertical: 10),
                  decoration: BoxDecoration(
                    color: _light,
                    borderRadius: BorderRadius.circular(999),
                  ),
                  child: const Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.mic_rounded, size: 15, color: _deep),
                      SizedBox(width: 6),
                      Text(
                        'Vocal',
                        style: TextStyle(
                          color: _deep,
                          fontWeight: FontWeight.w800,
                          fontSize: 13,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              Expanded(
                child: InkWell(
                  borderRadius: BorderRadius.circular(999),
                  onTap: widget.onExit ?? () => Navigator.of(context).maybePop(),
                  child: Padding(
                    padding: const EdgeInsets.symmetric(vertical: 10),
                    child: Text(
                      'Écrit',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        color: Colors.white.withValues(alpha: .78),
                        fontWeight: FontWeight.w700,
                        fontSize: 13,
                      ),
                    ),
                  ),
                ),
              ),
            ],
          ),
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
          _labelRow(),
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
            Padding(
              padding: const EdgeInsets.only(bottom: 18),
              child: AnimatedSwitcher(
                duration: const Duration(milliseconds: 250),
                child: KeyedSubtree(key: ValueKey(_phase), child: _captionWidget()),
              ),
            ),
        ],
      ),
    );
  }

  /// Le libellé d'état, avec les trois points animés façon ChatGPT pendant
  /// que Fitila IA réfléchit (appel réseau en cours).
  Widget _labelRow() {
    return Row(
      mainAxisSize: MainAxisSize.min,
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Flexible(
          child: Text(
            _label,
            textAlign: TextAlign.center,
            style: const TextStyle(
              color: Colors.white,
              fontSize: 24,
              fontWeight: FontWeight.w800,
            ),
          ),
        ),
        if (_phase == _Phase.thinking) ...[
          const SizedBox(width: 8),
          _ThinkingDots(controller: _dots),
        ],
      ],
    );
  }

  /// Le texte de la réponse : surligné mot par mot au fil de la lecture
  /// audio pendant `speaking` (effet « karaoké »), texte simple sinon.
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
                color: i <= _activeWord
                    ? Colors.white
                    : Colors.white.withValues(alpha: .32),
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

/// Trois petits points qui pulsent pendant la réflexion de Fitila IA,
/// façon ChatGPT — anime un indicateur visible pendant l'appel au backend.
class _ThinkingDots extends StatelessWidget {
  const _ThinkingDots({required this.controller});
  final AnimationController controller;

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: controller,
      builder: (context, _) {
        return Row(
          mainAxisSize: MainAxisSize.min,
          children: List.generate(3, (i) {
            final t = (controller.value + i * 0.2) % 1.0;
            final lift = (t < 0.5 ? t * 2 : (1 - t) * 2) * 6;
            return Padding(
              padding: const EdgeInsets.symmetric(horizontal: 2),
              child: Transform.translate(
                offset: Offset(0, -lift),
                child: Container(
                  width: 7,
                  height: 7,
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: .4 + lift / 10),
                    shape: BoxShape.circle,
                  ),
                ),
              ),
            );
          }),
        );
      },
    );
  }
}

class _Orb extends StatelessWidget {
  const _Orb({required this.phase, required this.level});

  final _Phase phase;
  final double level;

  @override
  Widget build(BuildContext context) {
    final (Color light, Color mid, Color deep) = switch (phase) {
      _Phase.idle => (
          const Color(0xFFE3DEFB),
          const Color(0xFF9D8DF0),
          const Color(0xFF3A2E8C),
        ),
      _Phase.listening => (
          const Color(0xFFE6E0FF),
          const Color(0xFF8E7CFF),
          const Color(0xFF3A2A9C),
        ),
      _Phase.thinking => (
          const Color(0xFFD9D2FF),
          const Color(0xFF6758C9),
          const Color(0xFF2E2470),
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
