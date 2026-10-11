import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../core/signature_theme.dart';
import 'bariba_virtual_keyboard.dart';
import 'keyboard_bridge.dart';

/// App-wide hooks set once at startup (see `main.dart`).
abstract final class BaribaKeyboardServices {
  /// Online translator used by "Saisir et Traduire" (falls back to dictionary).
  static KeyboardTranslator? translator;

  /// Injectable for tests.
  static KeyboardBridge bridge = KeyboardBridge.instance;
}

/// Opens the in-app keyboard as a bottom sheet bound to [controller].
/// Replaces the old letter-grid sheet; works on any existing text field.
Future<void> showBaribaKeyboardSheet(
  BuildContext context,
  TextEditingController controller, {
  bool translateMode = false,
}) {
  return showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    backgroundColor: SignatureTheme.surfaceAlt,
    barrierColor: Colors.black26,
    showDragHandle: true,
    builder: (sheetContext) => Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        _SheetPreview(controller: controller),
        BaribaVirtualKeyboard(
          controller: controller,
          translator: BaribaKeyboardServices.translator,
          initialTranslateMode: translateMode,
          onClose: () => Navigator.of(sheetContext).pop(),
          onSubmit: () => Navigator.of(sheetContext).pop(),
        ),
      ],
    ),
  );
}

/// Live echo of the text so users see what they type behind the sheet.
class _SheetPreview extends StatelessWidget {
  const _SheetPreview({required this.controller});

  final TextEditingController controller;

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<TextEditingValue>(
      valueListenable: controller,
      builder: (context, value, _) => Container(
        width: double.infinity,
        margin: const EdgeInsets.fromLTRB(12, 0, 12, 6),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        decoration: BoxDecoration(
          color: SignatureTheme.surface,
          borderRadius: BorderRadius.circular(SignatureTheme.radiusSmall),
          border: Border.all(color: SignatureTheme.hairline),
        ),
        child: Text(
          value.text.isEmpty ? 'Votre texte apparaîtra ici…' : value.text,
          maxLines: 3,
          overflow: TextOverflow.ellipsis,
          style: TextStyle(
            fontSize: 15,
            color: value.text.isEmpty ? SignatureTheme.muted : SignatureTheme.ink,
          ),
        ),
      ),
    );
  }
}

/// A text field that brings its own Bariba keyboard.
///
/// * System keyboard active (Android selected / iOS added): behaves like a
///   normal [TextField] and the native IME does the work.
/// * Otherwise: tapping the field docks the in-app virtual keyboard under it
///   (fluid [AnimatedSize]); a toggle switches to the system keyboard.
class BaribaTextField extends StatefulWidget {
  const BaribaTextField({
    super.key,
    required this.controller,
    this.decoration,
    this.minLines,
    this.maxLines = 1,
    this.onSubmitted,
    this.focusNode,
    this.style,
  });

  final TextEditingController controller;
  final InputDecoration? decoration;
  final int? minLines;
  final int? maxLines;
  final ValueChanged<String>? onSubmitted;
  final FocusNode? focusNode;
  final TextStyle? style;

  @override
  State<BaribaTextField> createState() => _BaribaTextFieldState();
}

class _BaribaTextFieldState extends State<BaribaTextField>
    with WidgetsBindingObserver {
  late final FocusNode _focus = widget.focusNode ?? FocusNode();
  StreamSubscription<KeyboardStatus>? _sub;
  KeyboardStatus _status = KeyboardStatus.unsupported;
  bool _virtualOpen = false;

  bool get _useVirtual => !_status.isReady;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _focus.addListener(_onFocus);
    _refresh();
    _sub = BaribaKeyboardServices.bridge.statusChanges().listen((s) {
      if (mounted) {
        setState(() => _status = s);
      }
    });
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _sub?.cancel();
    _focus.removeListener(_onFocus);
    if (widget.focusNode == null) {
      _focus.dispose();
    }
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      _refresh();
    }
  }

  Future<void> _refresh() async {
    final s = await BaribaKeyboardServices.bridge.status();
    if (mounted) {
      setState(() => _status = s);
    }
  }

  void _onFocus() {
    if (_focus.hasFocus && _useVirtual) {
      setState(() => _virtualOpen = true);
    }
  }

  void _closeVirtual() {
    setState(() => _virtualOpen = false);
    _focus.unfocus();
  }

  @override
  Widget build(BuildContext context) {
    final base = widget.decoration ?? const InputDecoration();
    final toggle = IconButton(
      key: const ValueKey('bariba-keyboard-toggle'),
      tooltip: _useVirtual ? 'Clavier Bàátɔ̀nú' : 'Clavier système',
      icon: Icon(
        _useVirtual && _virtualOpen
            ? Icons.keyboard_hide_rounded
            : Icons.keyboard_alt_outlined,
        color: SignatureTheme.goldDeep,
      ),
      onPressed: () {
        if (_useVirtual && _virtualOpen) {
          _closeVirtual();
        } else if (_useVirtual) {
          _focus.requestFocus();
          setState(() => _virtualOpen = true);
        } else {
          _focus.requestFocus();
          SystemChannels.textInput.invokeMethod<void>('TextInput.show');
        }
      },
    );
    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        TextField(
          controller: widget.controller,
          focusNode: _focus,
          style: widget.style,
          minLines: widget.minLines,
          maxLines: widget.maxLines,
          onSubmitted: widget.onSubmitted,
          // Hide the OS keyboard while ours is docked.
          keyboardType: _useVirtual && _virtualOpen
              ? TextInputType.none
              : (widget.maxLines == 1 ? TextInputType.text : TextInputType.multiline),
          onTap: () {
            if (_useVirtual) {
              setState(() => _virtualOpen = true);
            }
          },
          decoration: base.copyWith(suffixIcon: base.suffixIcon ?? toggle),
        ),
        AnimatedSize(
          duration: const Duration(milliseconds: 220),
          curve: Curves.easeOutCubic,
          alignment: Alignment.topCenter,
          child: _useVirtual && _virtualOpen
              ? Padding(
                  padding: const EdgeInsets.only(top: 8),
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(SignatureTheme.radiusMedium),
                    child: BaribaVirtualKeyboard(
                      controller: widget.controller,
                      translator: BaribaKeyboardServices.translator,
                      onClose: _closeVirtual,
                      onSubmit: widget.onSubmitted == null
                          ? null
                          : () {
                              widget.onSubmitted!(widget.controller.text);
                              _closeVirtual();
                            },
                    ),
                  ),
                )
              : const SizedBox(width: double.infinity),
        ),
      ],
    );
  }
}
