import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../core/offline.dart';
import '../core/signature_theme.dart';
import '../keyboard/bariba_input.dart';

/// Langue détectée dans une saisie.
enum ChatLang { french, bariba }

/// Détection rapide et hors ligne (miroir de `useLanguageDetection` du web) : `null` si incertain.
ChatLang? detectChatLanguage(String input) {
  final text = input.trim().toLowerCase();
  if (text.length < 3) return null;
  var bariba = 0;
  var french = 0;
  if (RegExp('[ɔɛŋ]').hasMatch(text)) bariba += 3;
  if (RegExp('[̀́̃]').hasMatch(text.replaceAll(RegExp('[àáèéìíòóùúâêîôû]'), ''))) bariba += 1;
  if (RegExp(r'(aa|ii|uu|ee|oo)').hasMatch(text) && !RegExp(r'\b(cooper|zoo|coordo|réélu|aaron)\b').hasMatch(text)) bariba += 1;
  const baribaWords = {'mba', 'wɛɛ', 'bɛɛ', 'gari', 'sɔ̃', 'nɛ', 'ka', 'ba', 'yɛ', 'wa', 'ye', 'bèrù', 'tem', 'sia', 'ku', 'kpa'};
  const frenchWords = {
    'le', 'la', 'les', 'de', 'des', 'du', 'un', 'une', 'et', 'est', 'je', 'tu', 'il', 'elle', 'nous', 'vous', 'ils', 'pour', 'avec', 'dans', 'que', 'qui',
    'bonjour', 'merci', 'comment', 'où', 'ou', 'pas', 'ne', 'ce', 'cette', 'mon', 'ma', 'mes', 'suis', 'sont', 'ai', 'as', 'avez', 'aller', 'voudrais',
  };
  for (final w in text.split(RegExp(r'[\s,.;:!?«»"()]+'))) {
    if (baribaWords.contains(w)) bariba += 1;
    if (frenchWords.contains(w)) french += 2;
  }
  if (RegExp(r"[éèêàùâôçœ]|['’]\w").hasMatch(text)) french += 1;
  if (bariba >= french + 2) return ChatLang.bariba;
  if (french >= bariba + 2) return ChatLang.french;
  return null;
}

/// Services du traducteur, injectables (réseau, micro, OCR, presse-papiers) pour rester testable.
class TranslatorPorts {
  const TranslatorPorts({
    required this.translate,
    this.startVoice,
    this.stopVoice,
    this.speak,
    this.ocr,
    this.paste,
    this.saveHistory,
    this.openHistory,
  });

  /// Traduit `text` ; `toBariba` vaut true pour FR → BA.
  final Future<String> Function(String text, bool toBariba) translate;
  final Future<void> Function()? startVoice;

  /// Arrête l'enregistrement et renvoie la transcription (langue source indiquée).
  final Future<String> Function(bool sourceIsBariba)? stopVoice;
  final Future<void> Function(String text, bool bariba)? speak;

  /// Photo ou document : renvoie le texte extrait et sa traduction (null si annulé).
  final Future<({String extracted, String translation})?> Function(bool toBariba, bool document)? ocr;
  final Future<String?> Function()? paste;
  final void Function(String source, String result, bool toBariba, String mode)? saveHistory;
  final VoidCallback? openHistory;
}

class ChatMessage {
  ChatMessage({required this.id, required this.source, required this.toBariba, required this.mode, this.result, this.error, this.pending = true});

  final int id;
  final String source;
  final bool toBariba;
  final String mode;
  String? result;
  String? error;
  bool pending;

  /// Traduction produite sans réseau (dictionnaire embarqué).
  bool offline = false;
}

String _errorText(Object e) {
  if (e is StateError) return e.message;
  if (e is TimeoutException) return 'La traduction a pris trop de temps.';
  return 'Traduction indisponible. Vérifiez votre connexion puis réessayez.';
}

/// Traducteur en fenêtre de chat : bulles source/traduction, saisie clavier Bàátɔ̀nú, voix, photo, document, presse-papiers.
class TranslatorChat extends StatefulWidget {
  const TranslatorChat({super.key, required this.ports});

  final TranslatorPorts ports;

  @override
  State<TranslatorChat> createState() => _TranslatorChatState();
}

class _TranslatorChatState extends State<TranslatorChat> {
  final _input = TextEditingController();
  final _scroll = ScrollController();
  final List<ChatMessage> _messages = [];
  bool _toBariba = true;
  bool _auto = true;
  bool _conversation = true;
  String _mode = 'Texte';
  bool _recording = false;
  bool _busy = false;
  ChatLang? _detected;
  int _seq = 0;
  String? _speakingId;

  TranslatorPorts get _p => widget.ports;

  @override
  void initState() {
    super.initState();
    _input.addListener(_onInput);
  }

  @override
  void dispose() {
    _input.removeListener(_onInput);
    _input.dispose();
    _scroll.dispose();
    super.dispose();
  }

  void _onInput() {
    if (!_auto) {
      if (_detected != null) setState(() => _detected = null);
      return;
    }
    final d = detectChatLanguage(_input.text);
    if (d != _detected || (d != null && _toBariba != (d == ChatLang.french))) {
      setState(() {
        _detected = d;
        if (d != null) _toBariba = d == ChatLang.french;
      });
    }
  }

  void _toast(String m) {
    if (!mounted) return;
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(SnackBar(content: Text(m)));
  }

  void _swap() => setState(() {
    _toBariba = !_toBariba;
    _detected = null;
  });

  void _scrollDown() {
    if (!_scroll.hasClients) return;
    _scroll.animateTo(0, duration: const Duration(milliseconds: 260), curve: Curves.easeOutCubic);
  }

  Future<void> _send({String? text, String? mode}) async {
    final source = (text ?? _input.text).trim();
    if (source.isEmpty || _busy) return;
    if (_auto) {
      final d = detectChatLanguage(source);
      if (d != null) _toBariba = d == ChatLang.french;
    }
    final msg = ChatMessage(id: ++_seq, source: source, toBariba: _toBariba, mode: mode ?? _mode);
    setState(() {
      _messages.add(msg);
      _input.clear();
      _detected = null;
    });
    WidgetsBinding.instance.addPostFrameCallback((_) => _scrollDown());
    await _run(msg);
  }

  Future<void> _run(ChatMessage msg) async {
    setState(() {
      msg
        ..pending = true
        ..error = null;
      _busy = true;
    });
    try {
      final out = await _p.translate(msg.source, msg.toBariba).timeout(const Duration(seconds: 45));
      if (!mounted) return;
      if (out.trim().isEmpty) throw StateError('Aucune traduction trouvée pour ce texte.');
      setState(() {
        msg
          ..result = out.trim()
          ..offline = !FitilaOffline.online.value
          ..pending = false;
        // Mode conversation sans détection : on répond dans l'autre sens.
        if (_conversation && !_auto) _toBariba = !msg.toBariba;
      });
      _p.saveHistory?.call(msg.source, msg.result!, msg.toBariba, msg.mode);
    } catch (e) {
      if (!mounted) return;
      setState(() {
        msg
          ..error = _errorText(e)
          ..pending = false;
      });
    } finally {
      if (mounted) setState(() => _busy = false);
      WidgetsBinding.instance.addPostFrameCallback((_) => _scrollDown());
    }
  }

  Future<void> _toggleVoice() async {
    if (_busy && !_recording) return;
    final start = _p.startVoice;
    final stop = _p.stopVoice;
    if (start == null || stop == null) {
      _toast('La voix n’est pas disponible sur cet appareil.');
      return;
    }
    if (!_recording) {
      try {
        await start();
        if (mounted) setState(() => _recording = true);
      } catch (e) {
        _toast('Micro indisponible : ${e is StateError ? e.message : e}');
      }
      return;
    }
    setState(() {
      _recording = false;
      _busy = true;
    });
    String transcript;
    try {
      transcript = await stop(!_toBariba);
    } catch (e) {
      if (mounted) setState(() => _busy = false);
      _toast(_errorText(e));
      return;
    }
    if (mounted) setState(() => _busy = false);
    await _send(text: transcript, mode: 'Voix');
  }

  Future<void> _paste() async {
    final t = await (_p.paste ?? () async => (await Clipboard.getData(Clipboard.kTextPlain))?.text)();
    if ((t ?? '').trim().isEmpty) {
      _toast('Le presse-papiers est vide.');
      return;
    }
    await _send(text: t, mode: 'Coller');
  }

  Future<void> _ocr(bool document) async {
    final ocr = _p.ocr;
    if (ocr == null) {
      _toast('Lecture d’image indisponible.');
      return;
    }
    if (_busy) return;
    setState(() => _busy = true);
    ChatMessage? msg;
    try {
      final r = await ocr(_toBariba, document);
      if (r == null || !mounted) return;
      msg = ChatMessage(id: ++_seq, source: r.extracted.isEmpty ? (document ? 'Document' : 'Photo') : r.extracted, toBariba: _toBariba, mode: document ? 'Doc' : 'Photo', result: r.translation.isEmpty ? null : r.translation, error: r.translation.isEmpty ? 'Texte détecté, mais aucune traduction n’a été produite.' : null, pending: false);
      setState(() => _messages.add(msg!));
      if (r.translation.isNotEmpty) _p.saveHistory?.call(msg.source, r.translation, msg.toBariba, msg.mode);
    } catch (e) {
      _toast(e is StateError ? e.message : 'Lecture du document impossible. Vérifiez le réseau puis réessayez.');
    } finally {
      if (mounted) setState(() => _busy = false);
      WidgetsBinding.instance.addPostFrameCallback((_) => _scrollDown());
    }
  }

  void _selectMode(String mode) {
    switch (mode) {
      case 'Coller':
        _paste();
      case 'Photo':
        _ocr(false);
      case 'Doc':
        _ocr(true);
      default:
        setState(() => _mode = mode);
    }
  }

  Future<void> _speak(ChatMessage m, {required bool result}) async {
    final speak = _p.speak;
    if (speak == null) return;
    final id = '${m.id}${result ? 'r' : 's'}';
    if (_speakingId != null) return;
    setState(() => _speakingId = id);
    try {
      await speak(result ? m.result! : m.source, result ? m.toBariba : !m.toBariba);
    } catch (e) {
      _toast(_errorText(e));
    } finally {
      if (mounted) setState(() => _speakingId = null);
    }
  }

  void _copy(String text) {
    Clipboard.setData(ClipboardData(text: text));
    _toast('Copié');
  }

  void _clear() {
    setState(_messages.clear);
  }

  // ---------------------------------------------------------------- UI

  @override
  Widget build(BuildContext context) {
    final keyboardOpen = MediaQuery.viewInsetsOf(context).bottom > 80;
    return Column(
      children: [
        keyboardOpen ? _compactLangBar() : _topBar(),
        Expanded(
          child: _messages.isEmpty
              ? (keyboardOpen ? const SizedBox.shrink() : _welcome())
              : _list(),
        ),
        SafeArea(
          top: false,
          minimum: const EdgeInsets.only(bottom: 2),
          child: _composer(keyboardOpen: keyboardOpen),
        ),
      ],
    );
  }

  Widget _compactLangBar() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: const BoxDecoration(
        color: SignatureTheme.surface,
        border: Border(bottom: BorderSide(color: SignatureTheme.hairline)),
      ),
      child: Row(
        children: [
          Expanded(
            child: FittedBox(
              alignment: Alignment.centerLeft,
              fit: BoxFit.scaleDown,
              child: Row(
                children: [
                  _langPill(!_toBariba, detected: _detected != null && (_detected == ChatLang.bariba) == !_toBariba),
                  IconButton(
                    key: const ValueKey('swap-compact'),
                    tooltip: 'Inverser',
                    visualDensity: VisualDensity.compact,
                    onPressed: _swap,
                    icon: const Icon(Icons.swap_horiz_rounded, color: SignatureTheme.goldDeep),
                  ),
                  _langPill(_toBariba),
                ],
              ),
            ),
          ),
          if (_p.openHistory != null)
            IconButton(
              tooltip: 'Historique',
              visualDensity: VisualDensity.compact,
              onPressed: _p.openHistory,
              icon: const Icon(Icons.history_rounded, size: 20),
            ),
        ],
      ),
    );
  }

  Widget _langPill(bool bariba, {bool detected = false}) => AnimatedContainer(
    duration: const Duration(milliseconds: 200),
    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
    decoration: BoxDecoration(
      color: bariba ? SignatureTheme.goldTint : SignatureTheme.surface,
      borderRadius: BorderRadius.circular(99),
      border: Border.all(color: detected ? SignatureTheme.sage : (bariba ? const Color(0xFFE7D29B) : SignatureTheme.hairline), width: detected ? 2 : 1),
    ),
    child: Row(mainAxisSize: MainAxisSize.min, children: [
      Text(bariba ? '🇧🇯' : '🇫🇷', style: const TextStyle(fontSize: 13)),
      const SizedBox(width: 5),
      Text(bariba ? 'Bàátɔ̀nú' : 'Français', style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w800, color: bariba ? SignatureTheme.goldDeep : SignatureTheme.ink)),
      if (detected) const Padding(padding: EdgeInsets.only(left: 4), child: Icon(Icons.auto_awesome_rounded, size: 12, color: SignatureTheme.sage)),
    ]),
  );

  Widget _topBar() {
    return Container(
      padding: const EdgeInsets.fromLTRB(10, 8, 6, 8),
      decoration: BoxDecoration(color: SignatureTheme.surface, borderRadius: BorderRadius.circular(22), border: Border.all(color: SignatureTheme.hairline)),
      child: Column(
        children: [
          Row(children: [
            Expanded(
              child: FittedBox(
                alignment: Alignment.centerLeft,
                fit: BoxFit.scaleDown,
                child: Row(children: [
                  _langPill(!_toBariba, detected: _detected != null && (_detected == ChatLang.bariba) == !_toBariba),
                  IconButton(key: const ValueKey('swap'), tooltip: 'Inverser les langues', visualDensity: VisualDensity.compact, onPressed: _swap, icon: const Icon(Icons.swap_horiz_rounded, color: SignatureTheme.goldDeep)),
                  _langPill(_toBariba),
                ]),
              ),
            ),
            if (_messages.isNotEmpty) IconButton(tooltip: 'Effacer la conversation', visualDensity: VisualDensity.compact, onPressed: _clear, icon: const Icon(Icons.delete_outline_rounded, color: SignatureTheme.muted)),
            if (_p.openHistory != null) IconButton(tooltip: 'Historique et favoris', visualDensity: VisualDensity.compact, onPressed: _p.openHistory, icon: const Icon(Icons.history_rounded)),
          ]),
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(children: [
              _toggle(Icons.auto_awesome_rounded, _detected == null ? 'Détection auto' : 'Détecté : ${_detected == ChatLang.bariba ? 'Bàátɔ̀nú' : 'Français'}', _auto, (v) => setState(() {
                _auto = v;
                if (!v) _detected = null;
              })),
              const SizedBox(width: 6),
              _toggle(Icons.forum_outlined, 'Mode conversation', _conversation, (v) => setState(() => _conversation = v)),
            ]),
          ),
        ],
      ),
    );
  }

  Widget _toggle(IconData icon, String label, bool on, ValueChanged<bool> onChanged) => Semantics(
    toggled: on,
    button: true,
    label: label,
    child: InkWell(
      borderRadius: BorderRadius.circular(99),
      onTap: () => onChanged(!on),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 160),
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
        decoration: BoxDecoration(
          color: on ? SignatureTheme.sageTint : Colors.transparent,
          borderRadius: BorderRadius.circular(99),
          border: Border.all(color: on ? SignatureTheme.sage.withValues(alpha: .5) : SignatureTheme.hairline),
        ),
        child: Row(mainAxisSize: MainAxisSize.min, children: [
          Icon(icon, size: 14, color: on ? SignatureTheme.sage : SignatureTheme.muted),
          const SizedBox(width: 5),
          Text(label, style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700, color: on ? SignatureTheme.sage : SignatureTheme.muted)),
        ]),
      ),
    ),
  );

  Widget _welcome() {
    final samples = _toBariba
        ? const ['Bonjour, comment allez-vous ?', 'Merci beaucoup', 'Où est le marché ?', 'Je voudrais de l’eau']
        : const ['Yɛ́ɛ̀ bɛ̀ɛ?', 'Ǹ sɔ̃ɔ̀ wíru', 'Gàri mba?'];
    return LayoutBuilder(
      builder: (context, c) => SingleChildScrollView(
        keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
        child: ConstrainedBox(
          constraints: BoxConstraints(minHeight: c.maxHeight),
          child: Center(
            child: Padding(
              padding: const EdgeInsets.symmetric(vertical: 16),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  TweenAnimationBuilder<double>(
                    tween: Tween(begin: .85, end: 1),
                    duration: const Duration(milliseconds: 700),
                    curve: Curves.elasticOut,
                    builder: (_, v, child) => Transform.scale(scale: v, child: child),
                    child: Container(
                      width: 50,
                      height: 50,
                      decoration: const BoxDecoration(shape: BoxShape.circle, gradient: LinearGradient(colors: [SignatureTheme.goldTint, Color(0xFFF7E9C4)], begin: Alignment.topLeft, end: Alignment.bottomRight)),
                      child: const Icon(Icons.translate_rounded, size: 24, color: SignatureTheme.goldDeep),
                    ),
                  ),
                  const SizedBox(height: 8),
                  const Text('Traduisez simplement', style: TextStyle(fontSize: 19, fontWeight: FontWeight.w900, color: SignatureTheme.ink)),
                  const SizedBox(height: 3),
                  const Text('Français ⇄ Bàátɔ̀nú', style: TextStyle(color: SignatureTheme.muted, fontSize: 13)),
                  const SizedBox(height: 10),
                  Wrap(
                    alignment: WrapAlignment.center,
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      for (final s in samples)
                        ActionChip(
                          key: ValueKey('sample-$s'),
                          label: Text(s, style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700)),
                          backgroundColor: SignatureTheme.surface,
                          side: const BorderSide(color: SignatureTheme.hairline),
                          onPressed: () => _send(text: s),
                        ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _list() {
    final items = _messages.reversed.toList(growable: false);
    return ListView.builder(
      key: const ValueKey('chat-list'),
      controller: _scroll,
      reverse: true,
      padding: const EdgeInsets.only(top: 10, bottom: 6),
      keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
      itemCount: items.length,
      itemBuilder: (context, i) => _Turn(
        key: ValueKey('turn-${items[i].id}'),
        msg: items[i],
        speakingId: _speakingId,
        canSpeak: _p.speak != null,
        onSpeak: (r) => _speak(items[i], result: r),
        onCopy: _copy,
        onRetry: () => _run(items[i]),
        onReuse: (t) {
          _input.text = t;
          _input.selection = TextSelection.collapsed(offset: t.length);
          setState(() => _mode = 'Texte');
        },
        onReverse: () {
          final m = items[i];
          if (m.result == null) return;
          setState(() => _toBariba = !m.toBariba);
          _send(text: m.result);
        },
      ),
    );
  }

  Widget _composer({required bool keyboardOpen}) {
    const modes = [('Voix', Icons.mic_rounded), ('Texte', Icons.keyboard_alt_rounded), ('Photo', Icons.photo_camera_rounded), ('Coller', Icons.content_paste_rounded), ('Doc', Icons.description_rounded)];
    return Container(
      padding: EdgeInsets.fromLTRB(4, keyboardOpen ? 4 : 6, 4, keyboardOpen ? 2 : 6),
      decoration: const BoxDecoration(
        color: SignatureTheme.appBackground,
        border: Border(top: BorderSide(color: SignatureTheme.hairline)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Les modes restent compacts au-dessus ; le champ d'écriture est toujours
          // l'élément le plus proche du clavier et ne peut plus être poussé hors écran.
          SizedBox(
            height: keyboardOpen ? 38 : 44,
            child: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              physics: const BouncingScrollPhysics(),
              padding: const EdgeInsets.symmetric(horizontal: 2),
              child: Row(
                children: [
                  for (var i = 0; i < modes.length; i++) ...[
                    SizedBox(
                      width: keyboardOpen ? 58 : 66,
                      child: _modeChip(modes[i].$1, modes[i].$2, compact: true),
                    ),
                    if (i != modes.length - 1) const SizedBox(width: 5),
                  ],
                ],
              ),
            ),
          ),
          SizedBox(height: keyboardOpen ? 4 : 6),
          AnimatedSwitcher(
            duration: const Duration(milliseconds: 160),
            child: _mode == 'Voix'
                ? _voiceComposer(compact: keyboardOpen)
                : _textComposer(compact: keyboardOpen),
          ),
        ],
      ),
    );
  }

  Widget _modeChip(String label, IconData icon, {bool compact = false}) {
    final selected = _mode == label;
    final fg = selected ? const Color(0xFF2B2110) : SignatureTheme.muted;
    return Semantics(
      button: true,
      selected: selected,
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: () => _selectMode(label),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 160),
          padding: EdgeInsets.symmetric(vertical: compact ? 4 : 6),
          decoration: BoxDecoration(
            color: selected ? SignatureTheme.gold : SignatureTheme.surface,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: selected ? SignatureTheme.gold : SignatureTheme.hairline),
            boxShadow: selected ? [BoxShadow(color: SignatureTheme.gold.withValues(alpha: .3), blurRadius: 10, offset: const Offset(0, 4))] : null,
          ),
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            Icon(icon, size: compact ? 17 : 19, color: fg),
            SizedBox(height: compact ? 0 : 2),
            Text(label, maxLines: 1, style: TextStyle(fontSize: compact ? 9.5 : 10.5, fontWeight: FontWeight.w800, color: fg)),
          ]),
        ),
      ),
    );
  }

  Widget _textComposer({bool compact = false}) {
    final canSend = !_busy && _input.text.trim().isNotEmpty;
    return Row(
      key: const ValueKey('text-composer'),
      crossAxisAlignment: CrossAxisAlignment.end,
      children: [
        Expanded(
          child: BaribaTextField(
            controller: _input,
            minLines: compact ? 1 : 2,
            maxLines: compact ? 3 : 4,
            onSubmitted: (_) => _send(),
            decoration: InputDecoration(
              hintText: _toBariba ? 'Écrivez en français…' : 'Écrivez en Bàátɔ̀nú…',
              filled: true,
              fillColor: SignatureTheme.surface,
              contentPadding: EdgeInsets.symmetric(horizontal: 16, vertical: compact ? 10 : 13),
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(22), borderSide: const BorderSide(color: SignatureTheme.gold, width: 1.6)),
              enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(22), borderSide: const BorderSide(color: SignatureTheme.gold, width: 1.6)),
              focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(22), borderSide: const BorderSide(color: SignatureTheme.goldDeep, width: 2)),
            ),
          ),
        ),
        const SizedBox(width: 8),
        ListenableBuilder(
          listenable: _input,
          builder: (_, _) {
            final can = !_busy && _input.text.trim().isNotEmpty;
            return IconButton.filled(
              key: const ValueKey('send'),
              tooltip: 'Traduire',
              onPressed: can ? _send : null,
              style: IconButton.styleFrom(backgroundColor: SignatureTheme.gold, foregroundColor: const Color(0xFF2B2110), disabledBackgroundColor: SignatureTheme.surfaceAlt, minimumSize: const Size(52, 52), maximumSize: const Size(52, 52)),
              icon: _busy && !canSend && _messages.isNotEmpty && _messages.last.pending
                  ? const SizedBox.square(dimension: 20, child: CircularProgressIndicator(strokeWidth: 2))
                  : const Icon(Icons.arrow_upward_rounded),
            );
          },
        ),
      ],
    );
  }

  Widget _voiceComposer({bool compact = false}) {
    return Container(
      key: const ValueKey('voice-composer'),
      padding: EdgeInsets.symmetric(horizontal: 12, vertical: compact ? 6 : 10),
      decoration: BoxDecoration(color: SignatureTheme.surface, borderRadius: BorderRadius.circular(24), border: Border.all(color: _recording ? SignatureTheme.clay : SignatureTheme.hairline)),
      child: Row(children: [
        _Pulse(active: _recording, child: IconButton.filled(
          key: const ValueKey('voice'),
          tooltip: _recording ? 'Terminer et traduire' : 'Parler',
          onPressed: (_busy && !_recording) ? null : _toggleVoice,
          style: IconButton.styleFrom(backgroundColor: _recording ? SignatureTheme.clay : SignatureTheme.gold, foregroundColor: _recording ? Colors.white : const Color(0xFF2B2110), minimumSize: const Size(54, 54)),
          icon: _busy && !_recording ? const SizedBox.square(dimension: 20, child: CircularProgressIndicator(strokeWidth: 2)) : Icon(_recording ? Icons.stop_rounded : Icons.mic_rounded, size: 28),
        )),
        const SizedBox(width: 12),
        Expanded(
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(_recording ? 'Je vous écoute…' : _busy ? 'Transcription…' : 'Appuyez pour parler', style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 14.5, color: SignatureTheme.ink)),
            if (!compact)
              Text(_recording ? 'Appuyez pour terminer et traduire.' : 'Parlez en ${_toBariba ? 'français' : 'Bàátɔ̀nú'}, je transcris puis je traduis.', style: const TextStyle(fontSize: 11.5, color: SignatureTheme.muted, height: 1.3)),
          ]),
        ),
      ]),
    );
  }
}

class _Pulse extends StatefulWidget {
  const _Pulse({required this.active, required this.child});
  final bool active;
  final Widget child;
  @override
  State<_Pulse> createState() => _PulseState();
}

class _PulseState extends State<_Pulse> with SingleTickerProviderStateMixin {
  late final AnimationController _c = AnimationController(vsync: this, duration: const Duration(milliseconds: 1100));

  @override
  void didUpdateWidget(covariant _Pulse old) {
    super.didUpdateWidget(old);
    if (widget.active && !_c.isAnimating) _c.repeat(reverse: true);
    if (!widget.active) _c.stop();
  }

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => AnimatedBuilder(
    animation: _c,
    builder: (_, child) => Container(
      decoration: BoxDecoration(shape: BoxShape.circle, boxShadow: widget.active ? [BoxShadow(color: SignatureTheme.clay.withValues(alpha: .35 * (1 - _c.value)), blurRadius: 6 + 18 * _c.value, spreadRadius: 4 * _c.value)] : null),
      child: child,
    ),
    child: widget.child,
  );
}

/// Un tour de conversation : bulle de la source (à droite) puis bulle de la traduction (à gauche).
class _Turn extends StatelessWidget {
  const _Turn({super.key, required this.msg, required this.speakingId, required this.canSpeak, required this.onSpeak, required this.onCopy, required this.onRetry, required this.onReuse, required this.onReverse});

  final ChatMessage msg;
  final String? speakingId;
  final bool canSpeak;
  final ValueChanged<bool> onSpeak;
  final ValueChanged<String> onCopy;
  final VoidCallback onRetry;
  final ValueChanged<String> onReuse;
  final VoidCallback onReverse;

  @override
  Widget build(BuildContext context) {
    final srcBariba = !msg.toBariba;
    final maxW = MediaQuery.sizeOf(context).width * .82;
    return TweenAnimationBuilder<double>(
      tween: Tween(begin: 0, end: 1),
      duration: const Duration(milliseconds: 260),
      curve: Curves.easeOutCubic,
      builder: (_, v, child) => Opacity(opacity: v, child: Transform.translate(offset: Offset(0, 14 * (1 - v)), child: child)),
      child: Padding(
        padding: const EdgeInsets.only(bottom: 14),
        child: Column(
          children: [
            Align(
              alignment: Alignment.centerRight,
              child: ConstrainedBox(
                constraints: BoxConstraints(maxWidth: maxW),
                child: GestureDetector(
                  onLongPress: () => onCopy(msg.source),
                  child: Container(
                    key: ValueKey('source-${msg.id}'),
                    padding: const EdgeInsets.fromLTRB(14, 10, 14, 6),
                    decoration: BoxDecoration(
                      color: srcBariba ? const Color(0xFFFFF6E6) : SignatureTheme.surface,
                      borderRadius: const BorderRadius.only(topLeft: Radius.circular(20), topRight: Radius.circular(6), bottomLeft: Radius.circular(20), bottomRight: Radius.circular(20)),
                      border: Border.all(color: srcBariba ? const Color(0xFFF0D9A8) : SignatureTheme.hairline),
                    ),
                    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      Text('${srcBariba ? '🇧🇯 Bàátɔ̀nú' : '🇫🇷 Français'}${msg.mode == 'Texte' ? '' : ' · ${msg.mode}'}', style: const TextStyle(fontSize: 10.5, fontWeight: FontWeight.w800, color: SignatureTheme.muted)),
                      const SizedBox(height: 3),
                      Text(msg.source, style: const TextStyle(fontSize: 15.5, height: 1.4, color: SignatureTheme.ink)),
                      Row(mainAxisSize: MainAxisSize.min, mainAxisAlignment: MainAxisAlignment.end, children: [
                        if (canSpeak) _mini(Icons.volume_up_rounded, 'Écouter', () => onSpeak(false), busy: speakingId == '${msg.id}s'),
                        _mini(Icons.copy_rounded, 'Copier', () => onCopy(msg.source)),
                        _mini(Icons.edit_rounded, 'Modifier', () => onReuse(msg.source)),
                      ]),
                    ]),
                  ),
                ),
              ),
            ),
            const SizedBox(height: 8),
            Align(
              alignment: Alignment.centerLeft,
              child: ConstrainedBox(constraints: BoxConstraints(maxWidth: maxW), child: _reply()),
            ),
          ],
        ),
      ),
    );
  }

  Widget _mini(IconData icon, String tip, VoidCallback onTap, {bool busy = false}) => IconButton(
    tooltip: tip,
    visualDensity: VisualDensity.compact,
    iconSize: 17,
    onPressed: onTap,
    icon: busy ? const SizedBox.square(dimension: 15, child: CircularProgressIndicator(strokeWidth: 2)) : Icon(icon, color: SignatureTheme.muted),
  );

  Widget _reply() {
    final targetBariba = msg.toBariba;
    if (msg.pending) {
      return Container(
        key: ValueKey('typing-${msg.id}'),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        decoration: _replyDeco(targetBariba),
        child: const _TypingDots(),
      );
    }
    if (msg.error != null) {
      return Container(
        key: ValueKey('error-${msg.id}'),
        padding: const EdgeInsets.fromLTRB(14, 10, 8, 8),
        decoration: BoxDecoration(color: SignatureTheme.clayTint, borderRadius: BorderRadius.circular(20), border: Border.all(color: SignatureTheme.clay.withValues(alpha: .4))),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [
            const Icon(Icons.error_outline_rounded, size: 18, color: SignatureTheme.clay),
            const SizedBox(width: 8),
            Flexible(child: Text(msg.error!, style: const TextStyle(color: SignatureTheme.clay, fontSize: 13, fontWeight: FontWeight.w700))),
          ]),
          Align(alignment: Alignment.centerRight, child: TextButton.icon(onPressed: onRetry, icon: const Icon(Icons.refresh_rounded, size: 18), label: const Text('Réessayer'))),
        ]),
      );
    }
    return Container(
      key: ValueKey('result-${msg.id}'),
      padding: const EdgeInsets.fromLTRB(14, 10, 14, 6),
      decoration: _replyDeco(targetBariba),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          const Icon(Icons.auto_awesome_rounded, size: 14, color: Color(0xFF6758C9)),
          const SizedBox(width: 5),
          Text(targetBariba ? '🇧🇯 Bàátɔ̀nú' : '🇫🇷 Français', style: const TextStyle(fontSize: 10.5, fontWeight: FontWeight.w800, color: SignatureTheme.muted)),
          if (msg.offline) ...[
            const SizedBox(width: 8),
            const Icon(Icons.cloud_off_rounded, size: 12, color: SignatureTheme.sage),
            const SizedBox(width: 3),
            const Text('dictionnaire local', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: SignatureTheme.sage)),
          ],
        ]),
        const SizedBox(height: 3),
        SelectableText(msg.result!, style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w600, height: 1.4, color: SignatureTheme.ink)),
        Wrap(children: [
          if (canSpeak) _mini(Icons.volume_up_rounded, 'Écouter la traduction', () => onSpeak(true), busy: speakingId == '${msg.id}r'),
          _mini(Icons.copy_rounded, 'Copier la traduction', () => onCopy(msg.result!)),
          _mini(Icons.swap_horiz_rounded, 'Traduire en retour', onReverse),
        ]),
      ]),
    );
  }

  BoxDecoration _replyDeco(bool bariba) => BoxDecoration(
    color: SignatureTheme.surface,
    borderRadius: const BorderRadius.only(topLeft: Radius.circular(6), topRight: Radius.circular(20), bottomLeft: Radius.circular(20), bottomRight: Radius.circular(20)),
    border: Border.all(color: bariba ? SignatureTheme.gold : SignatureTheme.hairline, width: bariba ? 1.4 : 1),
    boxShadow: [BoxShadow(color: SignatureTheme.ink.withValues(alpha: .05), blurRadius: 14, offset: const Offset(0, 6))],
  );
}

class _TypingDots extends StatefulWidget {
  const _TypingDots();
  @override
  State<_TypingDots> createState() => _TypingDotsState();
}

class _TypingDotsState extends State<_TypingDots> with SingleTickerProviderStateMixin {
  late final AnimationController _c = AnimationController(vsync: this, duration: const Duration(milliseconds: 1000))..repeat();

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => Semantics(
    label: 'Traduction en cours',
    child: AnimatedBuilder(
      animation: _c,
      builder: (_, _) => Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          for (var i = 0; i < 3; i++)
            Container(
              margin: const EdgeInsets.symmetric(horizontal: 3),
              width: 8,
              height: 8,
              decoration: BoxDecoration(shape: BoxShape.circle, color: SignatureTheme.gold.withValues(alpha: .35 + .65 * (((_c.value * 3 - i) % 3) < 1 ? 1 - ((_c.value * 3 - i) % 3) : 0))),
            ),
        ],
      ),
    ),
  );
}
