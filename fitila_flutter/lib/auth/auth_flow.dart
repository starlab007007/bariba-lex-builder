import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../core/signature_theme.dart';
import '../ui/premium_widgets.dart';
import 'auth_scenes.dart';

/// Connexion / inscription minimaliste : deux slides animés (dessin animé) puis un formulaire sobre.
///
/// Les erreurs affichables sont levées en [StateError] par les callbacks ; toute autre erreur donne un message générique.
class AuthFlow extends StatefulWidget {
  const AuthFlow({super.key, required this.onSignIn, required this.onSignUp, this.prefill = false, this.autoPlay = true});

  final Future<void> Function(String phone, String pin) onSignIn;
  final Future<void> Function(String name, String phone, String pin) onSignUp;
  final bool prefill;
  final bool autoPlay;

  @override
  State<AuthFlow> createState() => _AuthFlowState();
}

class _AuthFlowState extends State<AuthFlow> {
  final _pages = PageController();
  int _page = 0;
  Timer? _timer;
  DateTime _lastTouch = DateTime.fromMillisecondsSinceEpoch(0);

  bool _signup = false;
  final _name = TextEditingController();
  final _phone = TextEditingController();
  final _pin = TextEditingController();
  final _pin2 = TextEditingController();
  bool _obscure = true;
  bool _busy = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    if (widget.prefill) {
      _phone.text = '65653468';
      _pin.text = '123456';
    }
    if (widget.autoPlay) {
      _timer = Timer.periodic(const Duration(seconds: 6), (_) {
        if (!mounted || !_pages.hasClients) return;
        if (DateTime.now().difference(_lastTouch) < const Duration(seconds: 10)) return;
        _pages.animateToPage((_page + 1) % 2, duration: const Duration(milliseconds: 650), curve: Curves.easeInOutCubic);
      });
    }
  }

  @override
  void dispose() {
    _timer?.cancel();
    _pages.dispose();
    _name.dispose();
    _phone.dispose();
    _pin.dispose();
    _pin2.dispose();
    super.dispose();
  }

  String? _validate() {
    if (_signup && _name.text.trim().length < 2) return 'Entrez votre nom.';
    if (_phone.text.trim().length < 8) return 'Entrez un numéro à 8 chiffres au moins.';
    if (!RegExp(r'^\d{6}$').hasMatch(_pin.text)) return 'Le code PIN contient exactement 6 chiffres.';
    if (_signup && _pin.text != _pin2.text) return 'Les deux codes PIN ne correspondent pas.';
    return null;
  }

  Future<void> _submit() async {
    if (_busy) return;
    FocusScope.of(context).unfocus();
    final invalid = _validate();
    if (invalid != null) {
      HapticFeedback.lightImpact();
      setState(() => _error = invalid);
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      if (_signup) {
        await widget.onSignUp(_name.text.trim(), _phone.text.trim(), _pin.text);
      } else {
        await widget.onSignIn(_phone.text.trim(), _pin.text);
      }
    } catch (e) {
      if (!mounted) return;
      setState(() => _error = e is StateError ? e.message : 'Connexion au serveur FITILA impossible. Vérifiez votre réseau puis réessayez.');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      resizeToAvoidBottomInset: true,
      body: DecoratedBox(
        decoration: const BoxDecoration(gradient: LinearGradient(begin: Alignment.topLeft, end: Alignment.bottomRight, colors: [Color(0xFFFBF9F2), Color(0xFFF3F0E5), Color(0xFFF7F5EC)])),
        child: SafeArea(
          child: LayoutBuilder(
            builder: (context, c) {
              final wide = c.maxWidth > 820;
              final slides = _carousel(height: wide ? (c.maxHeight - 250).clamp(200.0, 560.0) : (c.maxHeight * .31).clamp(220.0, 330.0));
              final form = _form();
              if (wide) {
                return Center(
                  child: ConstrainedBox(
                    constraints: const BoxConstraints(maxWidth: 1040),
                    child: Padding(
                      padding: const EdgeInsets.all(28),
                      child: Row(children: [
                        Expanded(flex: 11, child: slides),
                        const SizedBox(width: 40),
                        Expanded(flex: 9, child: Center(child: SingleChildScrollView(child: form))),
                      ]),
                    ),
                  ),
                );
              }
              return Center(
                child: ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: 520),
                  child: ListView(
                    keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
                    padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
                    children: [slides, const SizedBox(height: 18), form],
                  ),
                ),
              );
            },
          ),
        ),
      ),
    );
  }

  Widget _brand() => const Row(
    mainAxisAlignment: MainAxisAlignment.center,
    children: [
      Icon(Icons.local_fire_department_rounded, color: SignatureTheme.gold, size: 22),
      SizedBox(width: 6),
      Text('FITILA', style: TextStyle(fontFamily: 'serif', fontSize: 20, fontWeight: FontWeight.w800, letterSpacing: 2, color: SignatureTheme.goldDeep)),
    ],
  );

  Widget _carousel({required double height}) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        _brand(),
        const SizedBox(height: 12),
        SizedBox(
          height: height + 96,
          child: Listener(
            onPointerDown: (_) => _lastTouch = DateTime.now(),
            child: PageView(
              key: const ValueKey('landing-slides'),
              controller: _pages,
              onPageChanged: (i) => setState(() => _page = i),
              children: [
                LandingSlide(
                  dark: false,
                  title: 'Parlez sans frontières',
                  subtitle: 'Traduisez le français et le Bàátɔ̀nú à la voix, à l’écrit ou en photo.',
                  scene: AnimatedScene(builder: (t) => TranslateScenePainter(t), semanticLabel: 'Deux amis discutent : Bonjour et Yɛ́ɛ̀ bɛ̀ɛ'),
                ),
                LandingSlide(
                  dark: true,
                  title: 'Apprenez, transmettez',
                  subtitle: 'Leçons, dictionnaire et clavier Bàátɔ̀nú pour faire vivre la langue.',
                  scene: AnimatedScene(builder: (t) => LearnScenePainter(t), semanticLabel: 'La flamme FITILA veille sur un livre ouvert'),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 10),
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            for (var i = 0; i < 2; i++)
              GestureDetector(
                onTap: () {
                  _lastTouch = DateTime.now();
                  _pages.animateToPage(i, duration: const Duration(milliseconds: 450), curve: Curves.easeOutCubic);
                },
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 260),
                  margin: const EdgeInsets.symmetric(horizontal: 4, vertical: 6),
                  width: _page == i ? 26 : 8,
                  height: 8,
                  decoration: BoxDecoration(color: _page == i ? SignatureTheme.gold : SignatureTheme.hairlineStrong, borderRadius: BorderRadius.circular(99)),
                ),
              ),
          ],
        ),
      ],
    );
  }

  InputDecoration _dec(String label, IconData icon, {String? prefix, Widget? suffix}) => InputDecoration(
    labelText: label,
    prefixText: prefix,
    prefixIcon: Icon(icon, size: 20),
    suffixIcon: suffix,
    filled: true,
    fillColor: SignatureTheme.surface,
    contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 15),
    border: OutlineInputBorder(borderRadius: BorderRadius.circular(18), borderSide: const BorderSide(color: SignatureTheme.hairline)),
    enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(18), borderSide: const BorderSide(color: SignatureTheme.hairline)),
  );

  Widget _form() {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: SignatureTheme.surface.withValues(alpha: .86),
        borderRadius: BorderRadius.circular(28),
        border: Border.all(color: SignatureTheme.hairline),
        boxShadow: [BoxShadow(color: SignatureTheme.ink.withValues(alpha: .07), blurRadius: 30, offset: const Offset(0, 16), spreadRadius: -14)],
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          PremiumSegmented(
            labels: const ['Connexion', 'Inscription'],
            selected: _signup ? 'Inscription' : 'Connexion',
            onChanged: (v) => setState(() {
              _signup = v == 'Inscription';
              _error = null;
            }),
          ),
          const SizedBox(height: 16),
          AnimatedSize(
            duration: const Duration(milliseconds: 260),
            curve: Curves.easeOutCubic,
            alignment: Alignment.topCenter,
            child: _signup
                ? Padding(
                    padding: const EdgeInsets.only(bottom: 12),
                    child: TextField(
                      key: const ValueKey('auth-name'),
                      controller: _name,
                      textCapitalization: TextCapitalization.words,
                      autofillHints: const [AutofillHints.name],
                      decoration: _dec('Votre nom', Icons.person_rounded),
                    ),
                  )
                : const SizedBox(width: double.infinity),
          ),
          TextField(
            key: const ValueKey('auth-phone'),
            controller: _phone,
            keyboardType: TextInputType.phone,
            autofillHints: const [AutofillHints.telephoneNumber],
            inputFormatters: [FilteringTextInputFormatter.digitsOnly, LengthLimitingTextInputFormatter(11)],
            decoration: _dec('Numéro de téléphone', Icons.phone_rounded, prefix: '+229 '),
          ),
          const SizedBox(height: 12),
          TextField(
            key: const ValueKey('auth-pin'),
            controller: _pin,
            obscureText: _obscure,
            keyboardType: TextInputType.number,
            autofillHints: const [AutofillHints.password],
            inputFormatters: [FilteringTextInputFormatter.digitsOnly, LengthLimitingTextInputFormatter(6)],
            textInputAction: _signup ? TextInputAction.next : TextInputAction.done,
            onSubmitted: (_) => _signup ? null : _submit(),
            decoration: _dec(
              'Code PIN (6 chiffres)',
              Icons.lock_rounded,
              suffix: IconButton(tooltip: _obscure ? 'Afficher' : 'Masquer', onPressed: () => setState(() => _obscure = !_obscure), icon: Icon(_obscure ? Icons.visibility_rounded : Icons.visibility_off_rounded, size: 20)),
            ),
          ),
          AnimatedSize(
            duration: const Duration(milliseconds: 260),
            curve: Curves.easeOutCubic,
            alignment: Alignment.topCenter,
            child: _signup
                ? Padding(
                    padding: const EdgeInsets.only(top: 12),
                    child: TextField(
                      key: const ValueKey('auth-pin2'),
                      controller: _pin2,
                      obscureText: _obscure,
                      keyboardType: TextInputType.number,
                      inputFormatters: [FilteringTextInputFormatter.digitsOnly, LengthLimitingTextInputFormatter(6)],
                      onSubmitted: (_) => _submit(),
                      decoration: _dec('Confirmer le code PIN', Icons.lock_outline_rounded),
                    ),
                  )
                : const SizedBox(width: double.infinity),
          ),
          AnimatedSize(
            duration: const Duration(milliseconds: 200),
            child: _error == null
                ? const SizedBox(width: double.infinity)
                : Padding(
                    padding: const EdgeInsets.only(top: 12),
                    child: Container(
                      key: const ValueKey('auth-error'),
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                      decoration: BoxDecoration(color: SignatureTheme.clayTint, borderRadius: BorderRadius.circular(14)),
                      child: Row(children: [
                        const Icon(Icons.error_outline_rounded, size: 18, color: SignatureTheme.clay),
                        const SizedBox(width: 8),
                        Expanded(child: Text(_error!, style: const TextStyle(color: SignatureTheme.clay, fontSize: 12.5, fontWeight: FontWeight.w700))),
                      ]),
                    ),
                  ),
          ),
          const SizedBox(height: 16),
          SizedBox(
            height: 54,
            child: FilledButton(
              key: const ValueKey('auth-submit'),
              onPressed: _busy ? null : _submit,
              child: _busy
                  ? const SizedBox.square(dimension: 22, child: CircularProgressIndicator(strokeWidth: 2.4))
                  : Text(_signup ? 'Créer mon compte' : 'Se connecter', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800)),
            ),
          ),
          const SizedBox(height: 12),
          Center(
            child: Text(
              _signup ? 'Votre numéro et votre code PIN suffisent.' : 'Bàátɔ̀nú · Culture · IA — sécurisé',
              style: const TextStyle(fontSize: 11.5, color: SignatureTheme.muted),
            ),
          ),
        ],
      ),
    );
  }
}
