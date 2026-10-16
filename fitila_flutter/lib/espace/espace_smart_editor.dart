import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../core/signature_theme.dart';
import '../keyboard/bariba_input.dart';
import '../keyboard/bariba_keyboard_engine.dart';
import '../keyboard/bariba_virtual_keyboard.dart';
import '../keyboard/keyboard_bridge.dart';

typedef _Dir = KeyboardTranslationDirection;

/// Éditeur de l'Espace : saisie intelligente, comme sur le web.
///  * suggestions + traduction du mot en cours pendant la frappe
///  * traduction en direct du paragraphe (dictionnaire puis moteur IA)
///  * sélection d'un mot/phrase -> carte de traduction, équivalents à choisir
///  * clavier Bàátɔ̀nú intégré quand le clavier système n'est pas activé
class EspaceSmartEditor extends StatefulWidget {
  const EspaceSmartEditor({
    super.key,
    required this.controller,
    this.engine,
    this.readOnly = false,
    this.hint = 'Écrivez en Bàátɔ̀nú…',
  });

  final TextEditingController controller;
  final BaribaKeyboardEngine? engine;
  final bool readOnly;
  final String hint;

  @override
  State<EspaceSmartEditor> createState() => _EspaceSmartEditorState();
}

class _EspaceSmartEditorState extends State<EspaceSmartEditor> with WidgetsBindingObserver {
  final _focus = FocusNode();
  BaribaKeyboardEngine? _engine;
  KeyboardStatus _status = KeyboardStatus.unsupported;
  StreamSubscription<KeyboardStatus>? _sub;

  bool _keys = false;
  bool _live = true;
  _Dir? _forced; // null = auto
  List<KeyboardEntry> _suggestions = const [];
  ({String word, String gloss})? _lastWord;
  String _paragraph = '';
  ({String text, _Dir dir, bool loading, String? online, String? offline}) _tr = (text: '', dir: _Dir.frenchToBariba, loading: false, online: null, offline: null);
  ({String text, _Dir dir, bool loading, String? online, String? offline})? _pick;
  Timer? _debounce;
  int _req = 0;

  TextEditingController get _c => widget.controller;
  bool get _systemReady => _status.isReady;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _c.addListener(_onChanged);
    _focus.addListener(() => setState(() {}));
    _engine = widget.engine;
    if (_engine == null) {
      BaribaKeyboardEngine.load().then((e) {
        if (mounted) {
          setState(() => _engine = e);
          _onChanged();
        }
      }).catchError((_) {});
    }
    SharedPreferences.getInstance().then((p) {
      if (mounted) {
        setState(() => _live = p.getBool('espace_live') ?? true);
      }
    }).catchError((_) {});
    BaribaKeyboardServices.bridge.status().then((s) {
      if (mounted) {
        setState(() => _status = s);
      }
    });
    _sub = BaribaKeyboardServices.bridge.statusChanges().listen((s) {
      if (mounted) {
        setState(() => _status = s);
      }
    });
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      BaribaKeyboardServices.bridge.status().then((s) {
        if (mounted) {
          setState(() => _status = s);
        }
      });
    }
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _sub?.cancel();
    _debounce?.cancel();
    _c.removeListener(_onChanged);
    _focus.dispose();
    super.dispose();
  }

  // ── Analyse du texte ─────────────────────────────────────────────────────

  (int, int) get _paragraphBounds {
    final t = _c.text;
    final at = _c.selection.isValid ? _c.selection.end.clamp(0, t.length) : t.length;
    final before = t.lastIndexOf('\n\n', at == 0 ? 0 : at - 1);
    final start = before < 0 ? 0 : before + 2;
    final after = t.indexOf('\n\n', at);
    return (start, after < 0 ? t.length : after);
  }

  void _onChanged() {
    final engine = _engine;
    if (engine == null || !mounted) {
      return;
    }
    final text = _c.text;
    final sel = _c.selection;
    final cursor = sel.isValid ? sel.end : text.length;
    final word = BaribaKeyboardEngine.currentWord(text, cursor);
    final prev = BaribaKeyboardEngine.previousWord(text, cursor);
    final known = word.isNotEmpty ? word : prev;
    final hit = known.isEmpty ? null : engine.lookup(known).where((e) => BaribaKeyboardEngine.glossHead(e.fr).isNotEmpty).firstOrNull;
    final (ps, pe) = _paragraphBounds;
    final para = text.substring(ps, pe);

    setState(() {
      _suggestions = engine.predict(word, previous: prev, limit: 5);
      _lastWord = hit == null ? null : (word: known, gloss: BaribaKeyboardEngine.glossHead(hit.fr));
    });

    // Sélection -> carte de traduction.
    if (sel.isValid && !sel.isCollapsed && sel.end - sel.start <= 300) {
      _requestTranslation(sel.textInside(text).trim(), pick: true);
    } else if (_pick != null) {
      setState(() => _pick = null);
    }
    if (para != _paragraph) {
      _paragraph = para;
      if (_live) {
        _requestTranslation(para.trim(), pick: false);
      }
    }
  }

  void _requestTranslation(String text, {required bool pick}) {
    final engine = _engine;
    if (engine == null || text.length < (pick ? 1 : 2)) {
      if (!pick) {
        setState(() => _tr = (text: '', dir: _tr.dir, loading: false, online: null, offline: null));
      }
      return;
    }
    final dir = _forced ?? engine.detectDirection(text);
    final offline = engine.translateOffline(text, dir);
    final translator = BaribaKeyboardServices.translator;
    final record = (text: text, dir: dir, loading: translator != null, online: null as String?, offline: offline);
    setState(() => pick ? _pick = record : _tr = record);
    if (translator == null) {
      return;
    }
    final id = ++_req;
    _debounce?.cancel();
    _debounce = Timer(Duration(milliseconds: pick ? 350 : 750), () async {
      String? online;
      try {
        online = await translator(text.length > 600 ? text.substring(0, 600) : text, dir);
      } catch (_) {
        online = null;
      }
      if (!mounted || id != _req) {
        return;
      }
      final done = (text: text, dir: dir, loading: false, online: online?.trim().isEmpty == true ? null : online?.trim(), offline: offline);
      setState(() => pick ? _pick = done : _tr = done);
    });
  }

  // ── Actions ──────────────────────────────────────────────────────────────

  void _set(String text, int cursor) {
    _c.value = TextEditingValue(text: text, selection: TextSelection.collapsed(offset: cursor));
  }

  void _accept(KeyboardEntry e) {
    HapticFeedback.selectionClick();
    final r = BaribaKeyboardEngine.applySuggestion(_c.text, _c.selection.isValid ? _c.selection.end : _c.text.length, e.ba);
    _set(r.text, r.cursor);
    _focus.requestFocus();
  }

  void _replaceSelection(String t) {
    final s = _c.selection;
    if (!s.isValid) {
      return;
    }
    HapticFeedback.mediumImpact();
    _set(_c.text.replaceRange(s.start, s.end, t), s.start + t.length);
    setState(() => _pick = null);
  }

  void _appendToSelection(String t) {
    final s = _c.selection;
    if (!s.isValid) {
      return;
    }
    final ins = ' ($t)';
    _set(_c.text.replaceRange(s.end, s.end, ins), s.end + ins.length);
    setState(() => _pick = null);
  }

  void _replaceParagraph(String t) {
    final (a, b) = _paragraphBounds;
    _set(_c.text.replaceRange(a, b, t), a + t.length);
  }

  void _insertBelow(String t) {
    final (_, b) = _paragraphBounds;
    final ins = '\n\n$t';
    _set(_c.text.replaceRange(b, b, ins), b + ins.length);
  }

  Future<void> _toggleLive() async {
    setState(() => _live = !_live);
    _paragraph = '';
    _onChanged();
    try {
      (await SharedPreferences.getInstance()).setBool('espace_live', _live);
    } catch (_) {}
  }

  void _cycleDir() {
    setState(() {
      _forced = _forced == null ? _Dir.baribaToFrench : _forced == _Dir.baribaToFrench ? _Dir.frenchToBariba : null;
      _paragraph = '';
    });
    _onChanged();
  }

  static String _dirLabel(_Dir d) => d == _Dir.baribaToFrench ? 'BA → FR' : 'FR → BA';

  // ── UI ───────────────────────────────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    final useVirtual = !_systemReady && _keys && !widget.readOnly;
    return Column(
      children: [
        Expanded(
          child: TextField(
            controller: _c,
            focusNode: _focus,
            readOnly: widget.readOnly,
            expands: true,
            maxLines: null,
            minLines: null,
            textAlignVertical: TextAlignVertical.top,
            keyboardType: useVirtual ? TextInputType.none : TextInputType.multiline,
            style: const TextStyle(fontSize: 17, height: 1.65, color: SignatureTheme.ink),
            decoration: InputDecoration(
              hintText: widget.hint,
              hintStyle: const TextStyle(color: SignatureTheme.muted),
              border: InputBorder.none,
              enabledBorder: InputBorder.none,
              focusedBorder: InputBorder.none,
              filled: false,
              contentPadding: const EdgeInsets.fromLTRB(20, 18, 20, 18),
            ),
          ),
        ),
        if (!widget.readOnly)
          LayoutBuilder(
            builder: (context, _) => ConstrainedBox(
              // L'assistance ne mange jamais plus de la moitié de l'écran (clavier ouvert).
              constraints: BoxConstraints(maxHeight: MediaQuery.sizeOf(context).height * .5),
              child: SingleChildScrollView(reverse: true, child: _assist()),
            ),
          ),
        AnimatedSize(
          duration: const Duration(milliseconds: 220),
          curve: Curves.easeOutCubic,
          alignment: Alignment.bottomCenter,
          child: useVirtual
              ? BaribaVirtualKeyboard(controller: _c, engine: _engine, assistBar: false, onClose: () => setState(() => _keys = false))
              : const SizedBox(width: double.infinity),
        ),
      ],
    );
  }

  Widget _assist() {
    final glossChip = _lastWord;
    return Material(
      color: SignatureTheme.surface,
      elevation: 6,
      shadowColor: Colors.black26,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (_pick != null) _selectionCard(_pick!),
          if (_live && _engine != null && _tr.text.isNotEmpty) _liveStrip(),
          SizedBox(
            height: 46,
            child: Row(
              children: [
                Expanded(
                  child: ListView(
                    scrollDirection: Axis.horizontal,
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                    children: [
                      if (glossChip != null)
                        Padding(
                          padding: const EdgeInsets.only(right: 6),
                          child: Chip(
                            key: const ValueKey('espace-gloss'),
                            visualDensity: VisualDensity.compact,
                            backgroundColor: SignatureTheme.sageTint,
                            side: BorderSide.none,
                            label: Text.rich(TextSpan(children: [
                              TextSpan(text: glossChip.word, style: const TextStyle(fontWeight: FontWeight.w800)),
                              TextSpan(text: ' = ${glossChip.gloss}'),
                            ])),
                            labelStyle: const TextStyle(color: SignatureTheme.sage, fontSize: 12.5),
                          ),
                        ),
                      for (final (i, s) in _suggestions.indexed)
                        Padding(
                          padding: const EdgeInsets.only(right: 6),
                          child: ActionChip(
                            key: ValueKey('espace-suggestion-${s.ba}'),
                            visualDensity: VisualDensity.compact,
                            backgroundColor: i == 0 ? SignatureTheme.goldTint : SignatureTheme.surface,
                            side: BorderSide(color: i == 0 ? SignatureTheme.gold : SignatureTheme.hairline),
                            label: Text.rich(TextSpan(children: [
                              TextSpan(text: s.ba, style: const TextStyle(fontWeight: FontWeight.w800)),
                              if (BaribaKeyboardEngine.glossHead(s.fr).isNotEmpty)
                                TextSpan(
                                  text: '  ${BaribaKeyboardEngine.glossHead(s.fr)}',
                                  style: const TextStyle(fontSize: 11, color: SignatureTheme.muted),
                                ),
                            ])),
                            labelStyle: const TextStyle(color: SignatureTheme.goldDeep, fontSize: 13.5),
                            onPressed: () => _accept(s),
                          ),
                        ),
                      if (glossChip == null && _suggestions.isEmpty)
                        const Center(
                          child: Text(
                            'Suggestions dès la 1re lettre · sélectionnez un mot pour le traduire',
                            style: TextStyle(color: SignatureTheme.muted, fontSize: 12),
                          ),
                        ),
                    ],
                  ),
                ),
                IconButton(
                  key: const ValueKey('espace-live-toggle'),
                  tooltip: 'Traduction en direct',
                  onPressed: _toggleLive,
                  icon: Icon(Icons.translate_rounded, color: _live ? SignatureTheme.goldDeep : SignatureTheme.muted),
                  style: IconButton.styleFrom(backgroundColor: _live ? SignatureTheme.goldTint : null),
                ),
                if (!_systemReady)
                  IconButton(
                    key: const ValueKey('espace-keys-toggle'),
                    tooltip: _keys ? 'Masquer le clavier Bàátɔ̀nú' : 'Clavier Bàátɔ̀nú',
                    onPressed: () {
                      setState(() => _keys = !_keys);
                      if (_keys) {
                        _focus.requestFocus();
                        SystemChannels.textInput.invokeMethod<void>('TextInput.hide');
                      }
                    },
                    icon: Icon(_keys ? Icons.keyboard_hide_rounded : Icons.keyboard_alt_rounded, color: SignatureTheme.goldDeep),
                  ),
                const SizedBox(width: 4),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _liveStrip() {
    final shown = _tr.online ?? _tr.offline;
    return Container(
      key: const ValueKey('espace-live-strip'),
      width: double.infinity,
      color: const Color(0xFFFBF8EE),
      padding: const EdgeInsets.fromLTRB(12, 8, 6, 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          ActionChip(
            visualDensity: VisualDensity.compact,
            materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
            avatar: const Icon(Icons.swap_horiz_rounded, size: 15, color: SignatureTheme.goldDeep),
            backgroundColor: SignatureTheme.surface,
            side: const BorderSide(color: SignatureTheme.hairline),
            label: Text(_forced == null ? 'Auto · ${_dirLabel(_tr.dir).replaceAll(' ', '')}' : _dirLabel(_forced!)),
            labelStyle: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w800, color: SignatureTheme.goldDeep),
            onPressed: _cycleDir,
          ),
          const SizedBox(width: 6),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  shown ?? (_tr.loading ? 'Traduction en cours…' : 'Pas de traduction trouvée dans le dictionnaire.'),
                  maxLines: 3,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontSize: 13.5,
                    fontWeight: shown == null ? FontWeight.w500 : FontWeight.w700,
                    color: shown == null ? SignatureTheme.muted : SignatureTheme.ink,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  _tr.online != null ? 'traduction IA' : _tr.loading ? 'moteur IA…' : _tr.offline != null ? 'dictionnaire' : '',
                  style: const TextStyle(fontSize: 10.5, color: SignatureTheme.muted),
                ),
              ],
            ),
          ),
          if (shown != null) ...[
            IconButton(tooltip: 'Insérer sous le paragraphe', visualDensity: VisualDensity.compact, onPressed: () => _insertBelow(shown), icon: const Icon(Icons.subdirectory_arrow_right_rounded, size: 20)),
            IconButton.filled(
              tooltip: 'Remplacer le paragraphe',
              visualDensity: VisualDensity.compact,
              style: IconButton.styleFrom(backgroundColor: SignatureTheme.gold, foregroundColor: const Color(0xFF2B2110)),
              onPressed: () => _replaceParagraph(shown),
              icon: const Icon(Icons.find_replace_rounded, size: 19),
            ),
          ],
        ],
      ),
    );
  }

  Widget _selectionCard(({String text, _Dir dir, bool loading, String? online, String? offline}) p) {
    final engine = _engine!;
    final shown = p.online ?? p.offline;
    final single = RegExp(r"^[\p{L}\p{M}'’]+$", unicode: true).hasMatch(p.text) ? p.text : null;
    final alts = single == null
        ? const <(String, String)>[]
        : p.dir == _Dir.baribaToFrench
        ? [for (final e in engine.lookup(single)) if (BaribaKeyboardEngine.glossHead(e.fr).isNotEmpty) (e.ba, BaribaKeyboardEngine.glossHead(e.fr))]
        : [for (final e in engine.lookupFrench(single)) (e.ba, BaribaKeyboardEngine.glossHead(e.fr))];
    return Container(
      key: const ValueKey('espace-selection-card'),
      width: double.infinity,
      margin: const EdgeInsets.fromLTRB(10, 8, 10, 4),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: SignatureTheme.surface,
        borderRadius: BorderRadius.circular(SignatureTheme.radiusMedium),
        border: Border.all(color: SignatureTheme.hairline),
        boxShadow: const [BoxShadow(color: Color(0x22241F2E), blurRadius: 18, offset: Offset(0, 8), spreadRadius: -8)],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.translate_rounded, size: 16, color: SignatureTheme.goldDeep),
              const SizedBox(width: 6),
              Text(_dirLabel(p.dir), style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w800, color: SignatureTheme.goldDeep)),
              const SizedBox(width: 8),
              Expanded(
                child: Text('« ${p.text.length > 30 ? '${p.text.substring(0, 30)}…' : p.text} »', overflow: TextOverflow.ellipsis, textAlign: TextAlign.end, style: const TextStyle(fontSize: 12, color: SignatureTheme.muted, fontWeight: FontWeight.w700)),
              ),
              InkWell(onTap: () => setState(() => _pick = null), child: const Padding(padding: EdgeInsets.all(4), child: Icon(Icons.close_rounded, size: 18))),
            ],
          ),
          const SizedBox(height: 8),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(color: SignatureTheme.goldTint, borderRadius: BorderRadius.circular(SignatureTheme.radiusSmall)),
            child: Text(
              shown ?? (p.loading ? 'Recherche…' : 'Aucune traduction dans le dictionnaire.'),
              style: TextStyle(fontSize: shown == null ? 12.5 : 15, fontWeight: shown == null ? FontWeight.w500 : FontWeight.w800, color: SignatureTheme.ink),
            ),
          ),
          if (alts.length > 1) ...[
            const SizedBox(height: 8),
            Text(p.dir == _Dir.frenchToBariba ? 'CHOISIR LE MOT BARIBA' : 'AUTRES SENS', style: const TextStyle(fontSize: 10.5, fontWeight: FontWeight.w800, color: SignatureTheme.muted, letterSpacing: .4)),
            const SizedBox(height: 4),
            Wrap(
              spacing: 6,
              runSpacing: 4,
              children: [
                for (final (ba, fr) in alts)
                  ActionChip(
                    visualDensity: VisualDensity.compact,
                    backgroundColor: SignatureTheme.surface,
                    side: const BorderSide(color: SignatureTheme.hairline),
                    label: Text(p.dir == _Dir.frenchToBariba ? ba : fr),
                    labelStyle: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13),
                    onPressed: () => _replaceSelection(p.dir == _Dir.frenchToBariba ? ba : fr),
                  ),
              ],
            ),
          ],
          const SizedBox(height: 8),
          Row(
            children: [
              Expanded(
                child: FilledButton.icon(
                  onPressed: shown == null ? null : () => _replaceSelection(shown),
                  icon: const Icon(Icons.find_replace_rounded, size: 18),
                  label: const Text('Remplacer', overflow: TextOverflow.ellipsis),
                  style: FilledButton.styleFrom(backgroundColor: SignatureTheme.gold, foregroundColor: const Color(0xFF2B2110)),
                ),
              ),
              const SizedBox(width: 6),
              OutlinedButton(onPressed: shown == null ? null : () => _appendToSelection(shown), style: OutlinedButton.styleFrom(padding: const EdgeInsets.symmetric(horizontal: 8), visualDensity: VisualDensity.compact), child: const Text('Ajouter')),
              IconButton(
                visualDensity: VisualDensity.compact,
                tooltip: 'Copier',
                onPressed: shown == null ? null : () => Clipboard.setData(ClipboardData(text: shown)),
                icon: const Icon(Icons.copy_rounded, size: 19),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
