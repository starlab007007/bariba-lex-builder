/// DUNYA "Voix d'abord": press the microphone, speak French or Baatɔnum,
/// DUNYA answers out loud — entirely offline.
library;

import 'dart:async';
import 'dart:io';

import 'package:audioplayers/audioplayers.dart' as audio;
import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:flutter_tts/flutter_tts.dart';
import 'package:path_provider/path_provider.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../dunya_core.dart';
import '../dunya_local_store.dart';
import '../dunya_models.dart';
import 'dunya_mic_capture.dart';
import 'dunya_speech_engine.dart';
import 'dunya_voice_brain.dart';
import 'dunya_voice_pack.dart';
import 'dunya_voice_phrases.dart';

enum _VoiceState { preparing, idle, listening, thinking, speaking }

class _Exchange {
  _Exchange({required this.heard, required this.reply, required this.heardLanguage});

  final String heard;
  final String heardLanguage;
  final DunyaVoiceReply reply;
}

class DunyaVoicePage extends StatefulWidget {
  const DunyaVoicePage({super.key, required this.knowledge, required this.onOpenChat});

  final DunyaAssetKnowledgeRepository knowledge;
  final VoidCallback onOpenChat;

  @override
  State<DunyaVoicePage> createState() => _DunyaVoicePageState();
}

class _DunyaVoicePageState extends State<DunyaVoicePage> {
  static const _bg = Color(0xFFF7F5EC);
  static const _ink = Color(0xFF241F2E);
  static const _muted = Color(0xFF8C8571);
  static const _gold = Color(0xFFC99530);
  static const _goldDeep = Color(0xFF9C6B1D);
  static const _sage = Color(0xFF3F6E52);
  static const _line = Color(0xFFE4DFCC);
  static const _prefKey = 'dunya_reply_language';

  final _store = DunyaLocalStore.instance;
  final _packs = DunyaVoicePackManager.instance;
  final _mic = DunyaMicCapture();
  final _tts = FlutterTts();
  final _player = audio.AudioPlayer();
  final _scroll = ScrollController();
  late final DunyaVoiceBrain _brain = DunyaVoiceBrain(knowledge: widget.knowledge);

  DunyaSpeechEngine? _engine;
  DunyaVoicePaths _paths = const DunyaVoicePaths();
  var _state = _VoiceState.preparing;
  var _replyLanguage = DunyaReplyLanguage.french;
  var _systemFrenchVoice = false;
  var _level = 0.0;
  var _stopSpeaking = false;
  String? _status;
  DunyaPackProgress? _installProgress;
  final _exchanges = <_Exchange>[];

  @override
  void initState() {
    super.initState();
    unawaited(_prepare());
  }

  @override
  void dispose() {
    _stopSpeaking = true;
    unawaited(_mic.dispose());
    unawaited(_tts.stop());
    unawaited(_player.dispose());
    _engine?.dispose();
    _scroll.dispose();
    super.dispose();
  }

  Future<void> _prepare() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      _replyLanguage = DunyaReplyLanguageLabel.fromKey(prefs.getString(_prefKey));
    } catch (_) {}
    await _prepareFrenchVoice();
    await _startEngine();
    if (mounted) setState(() => _state = _VoiceState.idle);
  }

  Future<void> _prepareFrenchVoice() async {
    try {
      await _tts.setLanguage('fr-FR');
      await _tts.setSpeechRate(0.46);
      await _tts.awaitSpeakCompletion(true);
      final dynamic installed = Platform.isAndroid
          ? await _tts.isLanguageInstalled('fr-FR')
          : await _tts.isLanguageAvailable('fr-FR');
      _systemFrenchVoice = installed == true;
    } catch (_) {
      _systemFrenchVoice = false;
    }
  }

  Future<void> _startEngine() async {
    _engine?.dispose();
    _engine = null;
    _paths = await _packs.resolvePaths();
    if (!_paths.canListen && !_paths.canSpeakBariba && !_paths.canSpeakFrenchOffline) return;
    try {
      final temp = await getTemporaryDirectory();
      _engine = await DunyaSpeechEngine.start(_paths, tempDir: temp.path);
      if (_paths.canListen) {
        if (mounted) setState(() => _status = 'Préparation de l’écoute…');
        await _engine!.warmUp();
      }
      _status = null;
    } catch (error) {
      _status = 'Le moteur vocal n’a pas pu démarrer : $error';
      await _store.audit('dunya_voice_engine_error', {'error': error.toString()}, severity: 'error');
    }
  }

  // --- Main loop: Comprendre -> Raisonner -> Se souvenir -> Agir -> Parler ---------

  Future<void> _onMicPressed() async {
    switch (_state) {
      case _VoiceState.preparing || _VoiceState.thinking:
        return;
      case _VoiceState.speaking:
        await _interruptSpeech();
        return;
      case _VoiceState.listening:
        await _mic.stop();
        return;
      case _VoiceState.idle:
        break;
    }
    if (!_paths.canListen || _engine == null) {
      await _openPackSheet();
      return;
    }
    if (!await _mic.hasPermission()) {
      _toast('DUNYA a besoin du micro pour vous écouter.');
      return;
    }
    setState(() {
      _state = _VoiceState.listening;
      _level = 0;
    });
    try {
      final samples = await _mic.listen(onLevel: (level) {
        if (mounted) setState(() => _level = level);
      });
      if (!mounted) return;
      if (samples == null) {
        setState(() => _state = _VoiceState.idle);
        return;
      }
      setState(() => _state = _VoiceState.thinking);
      final heard = await _engine!.transcribe(samples);
      await _process(heard, spoken: true);
    } catch (error) {
      await _store.audit('dunya_voice_error', {'error': error.toString()}, severity: 'error');
      if (mounted) {
        setState(() => _state = _VoiceState.idle);
        _toast('Écoute interrompue : $error');
      }
    }
  }

  Future<void> _process(String heard, {required bool spoken}) async {
    final clean = heard.trim();
    if (clean.isEmpty) {
      final reply = await _brain.respond('', _replyLanguage);
      await _speak(reply.speech);
      return;
    }
    setState(() => _state = _VoiceState.thinking);
    final reply = await _brain.respond(clean, _replyLanguage);
    if (!mounted) return;
    setState(() {
      _exchanges.add(_Exchange(heard: clean, reply: reply, heardLanguage: reply.language));
      if (_exchanges.length > 20) _exchanges.removeAt(0);
    });
    _scrollToEnd();
    await _store.appendMessage(DunyaMessage(role: 'user', content: clean));
    await _store.appendMessage(DunyaMessage(role: 'assistant', content: reply.display, sources: reply.sources));
    await _store.audit('dunya_voice_turn', {
      'input': spoken ? 'voice' : 'tap',
      'language': reply.language,
      'intent': reply.intent?.name,
      'reply_language': _replyLanguage.storageKey,
      'sources': reply.sources.length,
    });
    await _speak(reply.speech);
  }

  Future<void> _confirm(bool yes) async {
    await _interruptSpeech();
    setState(() => _state = _VoiceState.thinking);
    final reply = await _brain.confirm(yes, _replyLanguage);
    if (!mounted) return;
    setState(() {
      _exchanges.add(_Exchange(heard: yes ? 'Oui' : 'Non', reply: reply, heardLanguage: 'fr'));
    });
    _scrollToEnd();
    await _store.appendMessage(DunyaMessage(role: 'assistant', content: reply.display));
    await _speak(reply.speech);
  }

  // --- Speaking ------------------------------------------------------------------------

  Future<void> _speak(List<DunyaUtterance> parts) async {
    if (!mounted) return;
    _stopSpeaking = false;
    setState(() => _state = _VoiceState.speaking);
    try {
      for (final part in parts) {
        if (_stopSpeaking || !mounted) break;
        if (part.lang == 'bba') {
          if (_paths.canSpeakBariba && _engine != null) {
            await _playFile(await _engine!.synthesize(part.text, 'bba', speed: 0.85));
          }
        } else if (_systemFrenchVoice) {
          await _tts.speak(part.text);
        } else if (_paths.canSpeakFrenchOffline && _engine != null) {
          await _playFile(await _engine!.synthesize(part.text, 'fra'));
        }
      }
    } catch (error) {
      await _store.audit('dunya_voice_speak_error', {'error': error.toString()}, severity: 'warning');
    } finally {
      if (mounted) setState(() => _state = _VoiceState.idle);
    }
  }

  Future<void> _playFile(String path) async {
    final done = _player.onPlayerComplete.first;
    await _player.play(audio.DeviceFileSource(path));
    await done.timeout(const Duration(seconds: 60), onTimeout: () {});
  }

  Future<void> _interruptSpeech() async {
    _stopSpeaking = true;
    await _tts.stop();
    await _player.stop();
    if (mounted) setState(() => _state = _VoiceState.idle);
  }

  Future<void> _setLanguage(DunyaReplyLanguage value) async {
    setState(() => _replyLanguage = value);
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_prefKey, value.storageKey);
    } catch (_) {}
  }

  // --- Packs ------------------------------------------------------------------------------

  Future<void> _openPackSheet() async {
    await showModalBottomSheet<void>(
      context: context,
      showDragHandle: true,
      isScrollControlled: true,
      backgroundColor: const Color(0xFFFDFCF7),
      builder: (sheetContext) => _PackSheet(
        paths: _paths,
        onInstallFile: () async {
          Navigator.of(sheetContext).pop();
          await _installFromFile();
        },
        onDownload: (source) async {
          Navigator.of(sheetContext).pop();
          await _download(source);
        },
      ),
    );
  }

  Future<void> _installFromFile() async {
    final picked = await FilePicker.platform.pickFiles(type: FileType.any);
    final path = picked?.files.single.path;
    if (path == null) return;
    await _runInstall(() => _packs.installFromFile(path, onProgress: _onInstallProgress));
  }

  Future<void> _download(DunyaPackSource source) async {
    await _runInstall(() => _packs.download(source, onProgress: _onInstallProgress));
  }

  void _onInstallProgress(DunyaPackProgress progress) {
    if (mounted) setState(() => _installProgress = progress);
  }

  Future<void> _runInstall(Future<Map<String, dynamic>> Function() job) async {
    setState(() => _installProgress = const DunyaPackProgress('extract', null, 'Préparation…'));
    try {
      final manifest = await job();
      await _store.audit('dunya_pack_installed', {'id': manifest['id'], 'bytes': manifest['total_bytes']});
      if (!mounted) return;
      setState(() {
        _installProgress = null;
        _state = _VoiceState.preparing;
      });
      await _startEngine();
      if (!mounted) return;
      setState(() => _state = _VoiceState.idle);
      _toast('Pack « ${manifest['title']} » installé et vérifié.');
    } catch (error) {
      if (!mounted) return;
      setState(() => _installProgress = null);
      _toast(error.toString());
    }
  }

  // --- UI ----------------------------------------------------------------------------------

  void _toast(String message) {
    ScaffoldMessenger.maybeOf(context)?.showSnackBar(SnackBar(content: Text(message)));
  }

  void _scrollToEnd() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scroll.hasClients) {
        _scroll.animateTo(
          _scroll.position.maxScrollExtent,
          duration: const Duration(milliseconds: 260),
          curve: Curves.easeOutCubic,
        );
      }
    });
  }

  String get _stateLabel => switch (_state) {
        _VoiceState.preparing => _status ?? 'Préparation…',
        _VoiceState.idle => _paths.canListen ? 'Appuyez et parlez' : 'Installez la voix pour parler à DUNYA',
        _VoiceState.listening => 'Je vous écoute…',
        _VoiceState.thinking => 'Je réfléchis…',
        _VoiceState.speaking => 'Je réponds… (touchez pour arrêter)',
      };

  @override
  Widget build(BuildContext context) {
    final pending = _brain.pending;
    return ColoredBox(
      color: _bg,
      child: SafeArea(
        child: Column(
          children: [
            _header(),
            _languageSelector(),
            if (_installProgress != null) _installBanner(_installProgress!),
            if (!_paths.canListen && _installProgress == null && _state != _VoiceState.preparing) _packCallout(),
            Expanded(
              child: _exchanges.isEmpty
                  ? _welcome()
                  : ListView.separated(
                      controller: _scroll,
                      padding: const EdgeInsets.fromLTRB(14, 10, 14, 16),
                      itemCount: _exchanges.length,
                      separatorBuilder: (_, _) => const SizedBox(height: 10),
                      itemBuilder: (_, i) => _exchangeCard(_exchanges[i]),
                    ),
            ),
            if (pending != null && _state != _VoiceState.thinking) _confirmBar(pending),
            _micArea(),
          ],
        ),
      ),
    );
  }

  Widget _header() => Container(
        padding: const EdgeInsets.fromLTRB(16, 12, 8, 10),
        decoration: const BoxDecoration(border: Border(bottom: BorderSide(color: _line))),
        child: Row(
          children: [
            Container(
              width: 46,
              height: 46,
              decoration: BoxDecoration(color: _ink, borderRadius: BorderRadius.circular(16)),
              child: const Icon(Icons.graphic_eq_rounded, color: Color(0xFFF3E3B9)),
            ),
            const SizedBox(width: 12),
            const Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('DUNYA IA', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w900, color: _ink)),
                  Text('Parlez-lui, même sans Internet.', style: TextStyle(fontSize: 12.5, color: _muted)),
                ],
              ),
            ),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 6),
              decoration: BoxDecoration(color: const Color(0xFFDDEEE2), borderRadius: BorderRadius.circular(999)),
              child: const Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.cloud_off_rounded, size: 14, color: _sage),
                  SizedBox(width: 5),
                  Text('LOCAL', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w900, color: _sage)),
                ],
              ),
            ),
            IconButton(
              tooltip: 'Voix et packs',
              onPressed: _openPackSheet,
              icon: const Icon(Icons.download_for_offline_outlined, color: _goldDeep),
            ),
            IconButton(
              tooltip: 'Écrire à DUNYA',
              onPressed: widget.onOpenChat,
              icon: const Icon(Icons.keyboard_alt_outlined, color: _goldDeep),
            ),
          ],
        ),
      );

  Widget _languageSelector() => Padding(
        padding: const EdgeInsets.fromLTRB(14, 10, 14, 4),
        child: Row(
          children: [
            const Text('Réponse :', style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w800, color: _muted)),
            const SizedBox(width: 8),
            Expanded(
              child: SegmentedButton<DunyaReplyLanguage>(
                showSelectedIcon: false,
                style: SegmentedButton.styleFrom(
                  visualDensity: VisualDensity.compact,
                  selectedBackgroundColor: _ink,
                  selectedForegroundColor: Colors.white,
                  foregroundColor: _ink,
                  side: const BorderSide(color: _line),
                ),
                segments: const [
                  ButtonSegment(value: DunyaReplyLanguage.french, label: Text('Français')),
                  ButtonSegment(value: DunyaReplyLanguage.bariba, label: Text('Baatɔnum')),
                  ButtonSegment(value: DunyaReplyLanguage.both, label: Text('Les deux')),
                ],
                selected: {_replyLanguage},
                onSelectionChanged: (s) => _setLanguage(s.first),
              ),
            ),
          ],
        ),
      );

  Widget _installBanner(DunyaPackProgress p) {
    final label = switch (p.stage) {
      'download' => 'Téléchargement du pack… ${p.detail}',
      'extract' => 'Installation… ${p.detail}',
      'verify' => 'Vérification de l’intégrité…',
      _ => 'Pack installé.',
    };
    return Container(
      margin: const EdgeInsets.fromLTRB(14, 8, 14, 0),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16), border: Border.all(color: _line)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w800, color: _ink)),
          const SizedBox(height: 8),
          LinearProgressIndicator(value: p.fraction, color: _gold, backgroundColor: const Color(0xFFF1EBD9)),
        ],
      ),
    );
  }

  Widget _packCallout() => Container(
        margin: const EdgeInsets.fromLTRB(14, 8, 14, 0),
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(color: const Color(0xFFFFF7E6), borderRadius: BorderRadius.circular(18), border: Border.all(color: const Color(0xFFF0DDB0))),
        child: Row(
          children: [
            const Icon(Icons.record_voice_over_outlined, color: _goldDeep),
            const SizedBox(width: 10),
            const Expanded(
              child: Text(
                'Installez une fois la voix DUNYA (Wi-Fi ou fichier partagé). Ensuite, tout fonctionne sans Internet.',
                style: TextStyle(fontSize: 12.5, height: 1.4, color: _ink),
              ),
            ),
            TextButton(onPressed: _openPackSheet, child: const Text('Installer')),
          ],
        ),
      );

  Widget _welcome() {
    const examples = [
      'Comment dit-on merci en baatɔnum ?',
      'Que veut dire gbereru ?',
      'Rappelle-moi de traire les vaches à 17 h',
      'Combien font 3 sacs à 15 000 ?',
      'Retiens que la pluie a commencé aujourd’hui',
      'Quelle heure est-il ?',
    ];
    return ListView(
      padding: const EdgeInsets.fromLTRB(14, 12, 14, 16),
      children: [
        const Text('Parlez en français ou en baatɔnum.', style: TextStyle(fontSize: 21, fontWeight: FontWeight.w900, color: _ink)),
        const SizedBox(height: 6),
        const Text(
          'DUNYA écoute, comprend, se souvient et agit sur votre téléphone. Rien ne sort de l’appareil.',
          style: TextStyle(fontSize: 13.5, height: 1.5, color: _muted),
        ),
        const SizedBox(height: 16),
        const Text('Essayez de dire :', style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w900, color: _goldDeep)),
        const SizedBox(height: 8),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            for (final e in examples)
              ActionChip(
                onPressed: _state == _VoiceState.idle ? () => _process(e, spoken: false) : null,
                backgroundColor: Colors.white,
                side: const BorderSide(color: _line),
                label: Text(e, style: const TextStyle(fontSize: 12.5, color: _ink)),
              ),
          ],
        ),
      ],
    );
  }

  Widget _exchangeCard(_Exchange e) {
    final reply = e.reply;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Align(
          alignment: Alignment.centerRight,
          child: Container(
            margin: const EdgeInsets.only(left: 48),
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            decoration: BoxDecoration(color: _ink, borderRadius: BorderRadius.circular(18)),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text(e.heard, style: const TextStyle(fontSize: 15, color: Colors.white, height: 1.4)),
                const SizedBox(height: 3),
                Text(
                  e.heardLanguage == 'bba' ? 'entendu en baatɔnum' : 'entendu en français',
                  style: const TextStyle(fontSize: 10, color: Color(0xFFCFC6E0)),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 6),
        Container(
          margin: const EdgeInsets.only(right: 30),
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(color: Colors.white, border: Border.all(color: _line), borderRadius: BorderRadius.circular(20)),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(reply.display, style: const TextStyle(fontSize: 16, height: 1.45, color: _ink, fontWeight: FontWeight.w600)),
              const SizedBox(height: 8),
              Wrap(
                spacing: 6,
                runSpacing: 6,
                crossAxisAlignment: WrapCrossAlignment.center,
                children: [
                  if (reply.speech.isNotEmpty)
                    ActionChip(
                      avatar: const Icon(Icons.volume_up_rounded, size: 16, color: _goldDeep),
                      onPressed: _state == _VoiceState.idle ? () => _speak(reply.speech) : null,
                      backgroundColor: const Color(0xFFF7F2E5),
                      side: BorderSide.none,
                      visualDensity: VisualDensity.compact,
                      label: const Text('Réécouter', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: _goldDeep)),
                    ),
                  for (final s in reply.sources.take(3))
                    ActionChip(
                      onPressed: () => _showSource(s),
                      backgroundColor: const Color(0xFFF7F2E5),
                      side: BorderSide.none,
                      visualDensity: VisualDensity.compact,
                      label: Text(s.title, style: const TextStyle(fontSize: 10.5, fontWeight: FontWeight.w800, color: _goldDeep)),
                    ),
                ],
              ),
            ],
          ),
        ),
      ],
    );
  }

  Future<void> _showSource(DunyaSource source) => showModalBottomSheet<void>(
        context: context,
        showDragHandle: true,
        backgroundColor: const Color(0xFFFDFCF7),
        builder: (_) => SafeArea(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(18, 4, 18, 20),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(source.title, style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w900, color: _ink)),
                const SizedBox(height: 10),
                Text(source.text, style: const TextStyle(fontSize: 15, height: 1.5, color: Color(0xFF4A4454))),
              ],
            ),
          ),
        ),
      );

  Widget _confirmBar(DunyaPendingAction pending) => Container(
        margin: const EdgeInsets.fromLTRB(14, 0, 14, 8),
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(color: const Color(0xFFFFF7E6), borderRadius: BorderRadius.circular(18), border: Border.all(color: const Color(0xFFF0DDB0))),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(pending.summary, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: _ink)),
            const SizedBox(height: 10),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: () => _confirm(false),
                    icon: const Icon(Icons.close_rounded),
                    label: const Text('Non'),
                    style: OutlinedButton.styleFrom(minimumSize: const Size.fromHeight(52), foregroundColor: _ink),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: FilledButton.icon(
                    onPressed: () => _confirm(true),
                    icon: const Icon(Icons.check_rounded),
                    label: const Text('Oui'),
                    style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(52), backgroundColor: _sage),
                  ),
                ),
              ],
            ),
          ],
        ),
      );

  Widget _micArea() {
    final listening = _state == _VoiceState.listening;
    final busy = _state == _VoiceState.thinking || _state == _VoiceState.preparing;
    final speaking = _state == _VoiceState.speaking;
    final ring = listening ? 14 + 26 * _level : 0.0;
    return Container(
      padding: EdgeInsets.fromLTRB(16, 10, 16, MediaQuery.viewPaddingOf(context).bottom + 14),
      decoration: const BoxDecoration(border: Border(top: BorderSide(color: _line))),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Semantics(
            button: true,
            label: listening ? 'Arrêter l’écoute' : speaking ? 'Arrêter la réponse' : 'Parler à DUNYA',
            child: GestureDetector(
              onTap: _onMicPressed,
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 120),
                width: 112 + ring,
                height: 112 + ring,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: listening ? _gold.withValues(alpha: .22) : Colors.transparent,
                ),
                child: Container(
                  width: 104,
                  height: 104,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: listening ? _gold : _ink,
                    boxShadow: const [BoxShadow(color: Color(0x33241F2E), blurRadius: 18, offset: Offset(0, 8))],
                  ),
                  child: busy
                      ? const Padding(
                          padding: EdgeInsets.all(36),
                          child: CircularProgressIndicator(strokeWidth: 3, color: Color(0xFFF3E3B9)),
                        )
                      : Icon(
                          listening
                              ? Icons.stop_rounded
                              : speaking
                                  ? Icons.volume_off_rounded
                                  : Icons.mic_rounded,
                          size: 46,
                          color: listening ? _ink : const Color(0xFFF3E3B9),
                        ),
                ),
              ),
            ),
          ),
          const SizedBox(height: 8),
          Text(_stateLabel, textAlign: TextAlign.center, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: _ink)),
        ],
      ),
    );
  }
}

class _PackSheet extends StatefulWidget {
  const _PackSheet({required this.paths, required this.onInstallFile, required this.onDownload});

  final DunyaVoicePaths paths;
  final Future<void> Function() onInstallFile;
  final Future<void> Function(DunyaPackSource source) onDownload;

  @override
  State<_PackSheet> createState() => _PackSheetState();
}

class _PackSheetState extends State<_PackSheet> {
  final _sizes = <String, int?>{};

  @override
  void initState() {
    super.initState();
    for (final source in dunyaVoicePackSources) {
      DunyaVoicePackManager.instance.remoteSize(source).then((size) {
        if (mounted) setState(() => _sizes[source.id] = size);
      });
    }
  }

  bool _installed(String id) => id == dunyaVoiceCorePackId
      ? widget.paths.canListen && widget.paths.canSpeakBariba
      : widget.paths.canSpeakFrenchOffline;

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(18, 0, 18, 18),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Text('Voix de DUNYA', style: TextStyle(fontSize: 19, fontWeight: FontWeight.w900, color: Color(0xFF241F2E))),
            const SizedBox(height: 6),
            const Text(
              'Une seule installation suffit. Le pack peut aussi passer d’un téléphone à l’autre (carte SD, partage de fichiers) : chaque fichier est vérifié avant usage.',
              style: TextStyle(fontSize: 13, height: 1.45, color: Color(0xFF8C8571)),
            ),
            const SizedBox(height: 14),
            for (final source in dunyaVoicePackSources)
              Card(
                elevation: 0,
                color: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16), side: const BorderSide(color: Color(0xFFE4DFCC))),
                child: ListTile(
                  leading: Icon(
                    _installed(source.id) ? Icons.check_circle_rounded : Icons.cloud_download_outlined,
                    color: _installed(source.id) ? const Color(0xFF3F6E52) : const Color(0xFF9C6B1D),
                  ),
                  title: Text(source.title, style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w800)),
                  subtitle: Text(
                    _installed(source.id)
                        ? 'Installé'
                        : _sizes[source.id] == null
                            ? 'Téléchargement par Wi-Fi conseillé'
                            : 'Environ ${(_sizes[source.id]! / (1024 * 1024)).round()} Mo — Wi-Fi conseillé',
                  ),
                  trailing: _installed(source.id)
                      ? null
                      : IconButton(
                          tooltip: 'Télécharger',
                          onPressed: () => widget.onDownload(source),
                          icon: const Icon(Icons.download_rounded),
                        ),
                ),
              ),
            const SizedBox(height: 8),
            OutlinedButton.icon(
              onPressed: widget.onInstallFile,
              icon: const Icon(Icons.sd_storage_outlined),
              label: const Text('Installer depuis un fichier du téléphone'),
              style: OutlinedButton.styleFrom(minimumSize: const Size.fromHeight(50)),
            ),
          ],
        ),
      ),
    );
  }
}
