import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../core/signature_theme.dart';
import 'bariba_keyboard_engine.dart';

/// Online translator plugged by the app (edge functions). Return null/throw to
/// fall back to the embedded dictionary.
typedef KeyboardTranslator =
    Future<String?> Function(String text, KeyboardTranslationDirection direction);

/// In-app Bàátɔ̀nú keyboard bound to a [TextEditingController]: prediction bar,
/// "Saisir et Traduire" mode, nasal vowels and tone marks.
class BaribaVirtualKeyboard extends StatefulWidget {
  const BaribaVirtualKeyboard({
    super.key,
    required this.controller,
    this.engine,
    this.translator,
    this.onClose,
    this.onSubmit,
    this.initialTranslateMode = false,
    this.assistBar = true,
  });

  final TextEditingController controller;

  /// Injected for tests; loaded from the asset when null.
  final BaribaKeyboardEngine? engine;
  final KeyboardTranslator? translator;
  final VoidCallback? onClose;
  final VoidCallback? onSubmit;
  final bool initialTranslateMode;

  /// Barre de suggestions + « Saisir et Traduire ». Désactivée quand l'écran
  /// (ex. l'éditeur de l'Espace) fournit déjà sa propre assistance de saisie.
  final bool assistBar;

  @override
  State<BaribaVirtualKeyboard> createState() => _BaribaVirtualKeyboardState();
}

class _BaribaVirtualKeyboardState extends State<BaribaVirtualKeyboard> {
  static const _row1 = ['a', 'z', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'];
  static const _row2 = ['q', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'm'];
  static const _row3 = ['w', 'x', 'c', 'v', 'b', 'n'];
  static const _special = ['ɔ', 'ɛ', 'ŋ'];
  static const _nasal = ['ã', 'ĩ', 'ũ', 'õ', 'ẽ', 'ɛ̃', 'ɔ̃'];
  static const _tones = [
    (BaribaKeyboardEngine.combiningGrave, 'ton bas'),
    (BaribaKeyboardEngine.combiningAcute, 'ton haut'),
    (BaribaKeyboardEngine.combiningTilde, 'nasal'),
  ];
  static const _sym1 = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];
  static const _sym2 = ['@', '#', '€', '_', '&', '-', '+', '(', ')', '/'];
  static const _sym3 = ['*', '"', "'", ':', ';', '!', '?', '%', '='];

  BaribaKeyboardEngine? _engine;
  late bool _translateMode = widget.initialTranslateMode;
  KeyboardTranslationDirection _direction =
      KeyboardTranslationDirection.frenchToBariba;
  bool _shift = false;
  bool _symbols = false;
  List<KeyboardEntry> _suggestions = const [];
  String? _translation;
  bool _translating = false;
  bool _translationOffline = false;
  Timer? _debounce;
  Timer? _repeat;
  int _requestId = 0;

  TextEditingController get _c => widget.controller;

  @override
  void initState() {
    super.initState();
    _c.addListener(_onTextChanged);
    if (widget.engine != null) {
      _engine = widget.engine;
      _onTextChanged();
    } else {
      BaribaKeyboardEngine.load().then((engine) {
        if (!mounted) {
          return;
        }
        setState(() => _engine = engine);
        _onTextChanged();
      }).catchError((_) {});
    }
  }

  @override
  void didUpdateWidget(covariant BaribaVirtualKeyboard old) {
    super.didUpdateWidget(old);
    if (old.controller != widget.controller) {
      old.controller.removeListener(_onTextChanged);
      widget.controller.addListener(_onTextChanged);
      _onTextChanged();
    }
  }

  @override
  void dispose() {
    _c.removeListener(_onTextChanged);
    _debounce?.cancel();
    _repeat?.cancel();
    super.dispose();
  }

  int get _cursor {
    final s = _c.selection;
    return s.isValid ? s.end : _c.text.length;
  }

  void _onTextChanged() {
    final engine = _engine;
    if (engine == null || !mounted) {
      return;
    }
    final text = _c.text;
    final cursor = _cursor;
    final word = BaribaKeyboardEngine.currentWord(text, cursor);
    final previous = BaribaKeyboardEngine.previousWord(text, cursor);
    setState(() {
      _suggestions = engine.predict(word, previous: previous);
    });
    if (_translateMode) {
      _scheduleTranslation();
    }
  }

  void _scheduleTranslation() {
    _debounce?.cancel();
    final text = _c.text.trim();
    if (text.isEmpty) {
      setState(() {
        _translation = null;
        _translating = false;
      });
      return;
    }
    // Instant offline answer, then upgraded by the online engine if any.
    final offline = _engine?.translateOffline(text, _direction);
    setState(() {
      _translation = offline;
      _translationOffline = offline != null;
      _translating = widget.translator != null;
    });
    if (widget.translator == null) {
      return;
    }
    final id = ++_requestId;
    _debounce = Timer(const Duration(milliseconds: 550), () async {
      String? online;
      try {
        online = await widget.translator!(text, _direction);
      } catch (_) {
        online = null;
      }
      if (!mounted || id != _requestId) {
        return;
      }
      setState(() {
        _translating = false;
        if (online != null && online.trim().isNotEmpty) {
          _translation = online.trim();
          _translationOffline = false;
        }
      });
    });
  }

  void _setValue(String text, int cursor) {
    _c.value = TextEditingValue(
      text: text,
      selection: TextSelection.collapsed(offset: cursor),
    );
  }

  void _insert(String value) {
    HapticFeedback.selectionClick();
    final sel = _c.selection;
    final text = _c.text;
    final start = sel.isValid ? sel.start : text.length;
    final end = sel.isValid ? sel.end : text.length;
    final out = _shift ? _upper(value) : value;
    _setValue(text.replaceRange(start, end, out), start + out.length);
    if (_shift) {
      setState(() => _shift = false);
    }
  }

  static String _upper(String v) => v.toUpperCase();

  void _combine(String mark) {
    HapticFeedback.selectionClick();
    final r = BaribaKeyboardEngine.applyCombining(_c.text, _cursor, mark);
    _setValue(r.text, r.cursor);
  }

  void _backspace() {
    final sel = _c.selection;
    final text = _c.text;
    if (sel.isValid && !sel.isCollapsed) {
      _setValue(text.replaceRange(sel.start, sel.end, ''), sel.start);
      return;
    }
    final at = _cursor;
    if (at == 0) {
      return;
    }
    // Remove one user-perceived character, combining marks included.
    var start = at - 1;
    while (start > 0 && _isCombining(text.codeUnitAt(start))) {
      start--;
    }
    _setValue(text.replaceRange(start, at, ''), start);
  }

  static bool _isCombining(int unit) => unit >= 0x0300 && unit <= 0x036F;

  void _startRepeat() {
    _repeat?.cancel();
    _backspace();
    _repeat = Timer(const Duration(milliseconds: 380), () {
      _repeat = Timer.periodic(
        const Duration(milliseconds: 60),
        (_) => _backspace(),
      );
    });
  }

  void _stopRepeat() {
    _repeat?.cancel();
    _repeat = null;
  }

  void _applySuggestion(KeyboardEntry entry) {
    HapticFeedback.lightImpact();
    final r = BaribaKeyboardEngine.applySuggestion(_c.text, _cursor, entry.ba);
    _setValue(r.text, r.cursor);
  }

  void _toggleMode() {
    HapticFeedback.mediumImpact();
    setState(() {
      _translateMode = !_translateMode;
      _translation = null;
    });
    if (_translateMode) {
      _scheduleTranslation();
    }
  }

  void _swapDirection() {
    setState(() {
      _direction = _direction == KeyboardTranslationDirection.frenchToBariba
          ? KeyboardTranslationDirection.baribaToFrench
          : KeyboardTranslationDirection.frenchToBariba;
    });
    _scheduleTranslation();
  }

  void _replaceWithTranslation() {
    final t = _translation;
    if (t == null || t.isEmpty) {
      return;
    }
    HapticFeedback.mediumImpact();
    _setValue(t, t.length);
    setState(() => _translateMode = false);
  }

  @override
  Widget build(BuildContext context) {
    return Material(
      color: SignatureTheme.surfaceAlt,
      child: SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(6, 6, 6, 8),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              if (widget.assistBar) ...[
                _buildTopBar(),
                AnimatedSize(
                  duration: const Duration(milliseconds: 180),
                  curve: Curves.easeOutCubic,
                  alignment: Alignment.topCenter,
                  child: _translateMode ? _buildTranslationStrip() : const SizedBox(width: double.infinity),
                ),
              ],
              const SizedBox(height: 4),
              if (_symbols) ...[
                _letterRow(_sym1),
                _letterRow(_sym2),
                _letterRow(_sym3),
              ] else ...[
                _letterRow(_row1),
                _letterRow(_row2),
                _thirdRow(),
                _accentRow(),
              ],
              _bottomRow(),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildTopBar() {
    return SizedBox(
      height: 42,
      child: Row(
        children: [
          Expanded(
            child: _suggestions.isEmpty
                ? const Padding(
                    padding: EdgeInsets.only(left: 8),
                    child: Text(
                      'Bàátɔ̀nú',
                      style: TextStyle(
                        color: SignatureTheme.muted,
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  )
                : ListView(
                    scrollDirection: Axis.horizontal,
                    children: [
                      for (final s in _suggestions)
                        Padding(
                          padding: const EdgeInsets.only(right: 6),
                          child: ActionChip(
                            key: ValueKey('suggestion-${s.ba}'),
                            label: Text(s.ba),
                            tooltip: s.fr.isEmpty ? null : s.fr,
                            backgroundColor: SignatureTheme.surface,
                            side: const BorderSide(color: SignatureTheme.hairline),
                            labelStyle: const TextStyle(
                              color: SignatureTheme.goldDeep,
                              fontWeight: FontWeight.w800,
                            ),
                            onPressed: () => _applySuggestion(s),
                          ),
                        ),
                    ],
                  ),
          ),
          Tooltip(
            message: _translateMode ? 'Saisie directe' : 'Saisir et Traduire',
            child: Material(
              color: _translateMode ? SignatureTheme.gold : SignatureTheme.surface,
              shape: const StadiumBorder(
                side: BorderSide(color: SignatureTheme.hairline),
              ),
              child: InkWell(
                key: const ValueKey('translate-toggle'),
                customBorder: const StadiumBorder(),
                onTap: _toggleMode,
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        Icons.translate_rounded,
                        size: 16,
                        color: _translateMode ? Colors.white : SignatureTheme.goldDeep,
                      ),
                      const SizedBox(width: 4),
                      Text(
                        _translateMode ? 'Traduire' : 'Saisie',
                        style: TextStyle(
                          fontSize: 11.5,
                          fontWeight: FontWeight.w800,
                          color: _translateMode ? Colors.white : SignatureTheme.ink,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
          if (widget.onClose != null)
            IconButton(
              key: const ValueKey('keyboard-close'),
              visualDensity: VisualDensity.compact,
              tooltip: 'Fermer le clavier',
              onPressed: widget.onClose,
              icon: const Icon(Icons.keyboard_hide_rounded, size: 20),
              color: SignatureTheme.inkSoft,
            ),
        ],
      ),
    );
  }

  Widget _buildTranslationStrip() {
    final fromLabel = _direction == KeyboardTranslationDirection.frenchToBariba
        ? 'FR'
        : 'BA';
    final toLabel = _direction == KeyboardTranslationDirection.frenchToBariba
        ? 'BA'
        : 'FR';
    return Container(
      width: double.infinity,
      margin: const EdgeInsets.only(top: 2),
      padding: const EdgeInsets.fromLTRB(10, 8, 6, 8),
      decoration: BoxDecoration(
        color: SignatureTheme.goldTint,
        borderRadius: BorderRadius.circular(SignatureTheme.radiusSmall),
      ),
      child: Row(
        children: [
          InkWell(
            key: const ValueKey('direction-swap'),
            borderRadius: BorderRadius.circular(8),
            onTap: _swapDirection,
            child: Padding(
              padding: const EdgeInsets.all(4),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    fromLabel,
                    style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w800),
                  ),
                  const Icon(Icons.swap_horiz_rounded, size: 16),
                  Text(
                    toLabel,
                    style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w800),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: _translating && _translation == null
                ? const Align(
                    alignment: Alignment.centerLeft,
                    child: SizedBox(
                      width: 14,
                      height: 14,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    ),
                  )
                : Text(
                    _translation ??
                        (_c.text.trim().isEmpty
                            ? 'Tapez pour traduire…'
                            : 'Aucune traduction trouvée'),
                    key: const ValueKey('translation-text'),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontSize: 13.5,
                      fontWeight: FontWeight.w700,
                      color: _translation == null
                          ? SignatureTheme.muted
                          : SignatureTheme.ink,
                    ),
                  ),
          ),
          if (_translation != null && _translationOffline && !_translating)
            const Padding(
              padding: EdgeInsets.only(right: 4),
              child: Tooltip(
                message: 'Dictionnaire hors ligne',
                child: Icon(Icons.offline_bolt_rounded, size: 14, color: SignatureTheme.goldDeep),
              ),
            ),
          if (_translating && _translation != null)
            const Padding(
              padding: EdgeInsets.only(right: 6),
              child: SizedBox(
                width: 12,
                height: 12,
                child: CircularProgressIndicator(strokeWidth: 1.6),
              ),
            ),
          TextButton(
            key: const ValueKey('translation-apply'),
            onPressed: _translation == null ? null : _replaceWithTranslation,
            style: TextButton.styleFrom(
              visualDensity: VisualDensity.compact,
              foregroundColor: SignatureTheme.goldDeep,
            ),
            child: const Text('Remplacer'),
          ),
        ],
      ),
    );
  }

  Widget _letterRow(List<String> keys) {
    return _row([
      for (final k in keys) _key(_shift ? _upper(k) : k, () => _insert(k)),
    ]);
  }

  Widget _thirdRow() {
    return _row([
      _key(
        _shift ? '⇧' : '⇪',
        () => setState(() => _shift = !_shift),
        flex: 3,
        tint: _shift ? SignatureTheme.gold : null,
        semantic: 'Majuscule',
        keyId: 'shift',
      ),
      for (final k in _row3) _key(_shift ? _upper(k) : k, () => _insert(k)),
      for (final k in _special)
        _key(
          _shift ? _upper(k) : k,
          () => _insert(k),
          tint: SignatureTheme.goldTint,
        ),
    ]);
  }

  Widget _accentRow() {
    return _row([
      for (final k in _nasal)
        _key(
          _shift ? _upper(k) : k,
          () => _insert(k),
          tint: SignatureTheme.sageTint,
        ),
      for (final t in _tones)
        _key(
          '◌${t.$1}',
          () => _combine(t.$1),
          flex: 1,
          tint: SignatureTheme.clayTint,
          semantic: t.$2,
        ),
    ]);
  }

  Widget _bottomRow() {
    return _row([
      _key(_symbols ? 'ABC' : '123', () => setState(() => _symbols = !_symbols), flex: 2, keyId: 'symbols'),
      _key(',', () => _insert(',')),
      _key('Espace', () => _insert(' '), flex: 5, keyId: 'space'),
      _key('.', () => _insert('.')),
      _key('⌫', _backspace, flex: 2, keyId: 'backspace', onHold: _startRepeat, onRelease: _stopRepeat, semantic: 'Effacer'),
      _key('↵', widget.onSubmit ?? () => _insert('\n'), flex: 2, tint: SignatureTheme.gold, keyId: 'enter', semantic: 'Entrée'),
    ]);
  }

  Widget _row(List<Widget> children) {
    return SizedBox(
      height: 46,
      child: Row(children: children),
    );
  }

  Widget _key(
    String label,
    VoidCallback onTap, {
    int flex = 2,
    Color? tint,
    String? semantic,
    String? keyId,
    VoidCallback? onHold,
    VoidCallback? onRelease,
  }) {
    final wide = label.length > 2 && label != '◌̀';
    return Expanded(
      flex: flex,
      child: Padding(
        padding: const EdgeInsets.all(2.5),
        child: Semantics(
          button: true,
          label: semantic ?? label,
          excludeSemantics: true,
          child: Listener(
            onPointerDown: onHold == null ? null : (_) => onHold(),
            onPointerUp: onRelease == null ? null : (_) => onRelease(),
            onPointerCancel: onRelease == null ? null : (_) => onRelease(),
            child: Material(
              color: tint ?? SignatureTheme.surface,
              elevation: 0.6,
              shadowColor: Colors.black26,
              borderRadius: BorderRadius.circular(9),
              child: InkWell(
                key: keyId == null ? ValueKey('key-$label') : ValueKey('key-$keyId'),
                borderRadius: BorderRadius.circular(9),
                onTap: onHold == null ? onTap : null,
                child: Center(
                  child: FittedBox(
                    fit: BoxFit.scaleDown,
                    child: Text(
                      label,
                      style: TextStyle(
                        color: tint == SignatureTheme.gold
                            ? Colors.white
                            : SignatureTheme.ink,
                        fontSize: wide ? 12.5 : 18,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
