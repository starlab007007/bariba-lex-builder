import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';

import '../core/signature_theme.dart';
import 'bariba_input.dart';
import 'keyboard_bridge.dart';

/// Step-by-step activation guide for the system Bariba keyboard.
///
/// Live: re-checks the status on app resume and through the native event
/// channel, so steps tick themselves as the user comes back from Settings.
class KeyboardOnboarding extends StatefulWidget {
  const KeyboardOnboarding({super.key, this.platformOverride});

  /// Test hook: force 'android' or 'ios' when the native side is absent.
  final String? platformOverride;

  @override
  State<KeyboardOnboarding> createState() => _KeyboardOnboardingState();
}

class _KeyboardOnboardingState extends State<KeyboardOnboarding>
    with WidgetsBindingObserver {
  final _test = TextEditingController();
  StreamSubscription<KeyboardStatus>? _sub;
  KeyboardStatus? _status;
  bool _checking = true;

  KeyboardBridge get _bridge => BaribaKeyboardServices.bridge;

  String get _platform {
    if (widget.platformOverride != null) {
      return widget.platformOverride!;
    }
    final s = _status;
    if (s != null && s.supported) {
      return s.platform;
    }
    return switch (defaultTargetPlatform) {
      TargetPlatform.android => 'android',
      TargetPlatform.iOS => 'ios',
      _ => 'other',
    };
  }

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _refresh();
    _sub = _bridge.statusChanges().listen((s) {
      if (mounted) {
        setState(() => _status = s);
      }
    });
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _sub?.cancel();
    _test.dispose();
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      _refresh();
    }
  }

  Future<void> _refresh() async {
    setState(() => _checking = true);
    final s = await _bridge.status();
    if (mounted) {
      setState(() {
        _status = s;
        _checking = false;
      });
    }
  }

  Future<void> _openSettings() async {
    final ok = await _bridge.openSystemSettings();
    if (!ok && mounted) {
      _snack('Impossible d’ouvrir les réglages depuis cet appareil.');
    }
  }

  Future<void> _showPicker() async {
    final ok = await _bridge.showPicker();
    if (!ok && mounted) {
      _snack('Sélecteur de clavier indisponible sur cet appareil.');
      return;
    }
    await Future<void>.delayed(const Duration(milliseconds: 500));
    await _refresh();
  }

  void _snack(String message) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message)));
  }

  @override
  Widget build(BuildContext context) {
    final status = _status ?? KeyboardStatus.unsupported;
    final platform = _platform;
    final ready = status.supported && status.isReady;
    final enabled = status.supported && status.enabled;
    final selected = status.supported && status.selected;

    return ListView(
      padding: const EdgeInsets.only(bottom: 24),
      children: [
        _StatusHero(
          checking: _checking,
          supported: status.supported,
          ready: ready,
          enabled: enabled,
          platform: platform,
        ),
        const SizedBox(height: 14),
        if (platform == 'ios') ..._iosSteps(status, enabled) else if (platform == 'android') ..._androidSteps(enabled, selected) else _NoNative(),
        const SizedBox(height: 6),
        _TestCard(controller: _test, ready: ready),
      ],
    );
  }

  List<Widget> _androidSteps(bool enabled, bool selected) => [
    const _Step(
      done: true,
      number: '1',
      title: 'Clavier installé',
      body: 'Livré avec FITILA — aucune action requise.',
    ),
    _Step(
      done: enabled,
      number: '2',
      title: 'Activer « Clavier Bariba »',
      body: 'Dans la liste des claviers, activez l’interrupteur « Clavier Bariba » puis validez l’avertissement Android.',
      actionLabel: enabled ? 'Ouvrir les réglages' : 'Ouvrir les réglages clavier',
      onAction: _openSettings,
    ),
    _Step(
      done: selected,
      number: '3',
      title: 'Le choisir comme clavier',
      body: 'Sélectionnez « Clavier Bariba ». Ensuite, dans WhatsApp, SMS ou le navigateur, changez de clavier avec l’icône clavier de la barre de navigation.',
      actionLabel: 'Choisir le clavier',
      onAction: enabled ? _showPicker : null,
    ),
  ];

  List<Widget> _iosSteps(KeyboardStatus status, bool enabled) => [
    const _Step(
      done: true,
      number: '1',
      title: 'Clavier installé',
      body: 'Livré avec FITILA — il reste à l’ajouter dans les Réglages iOS.',
    ),
    _Step(
      done: enabled,
      number: '2',
      title: 'Ajouter le clavier',
      body: 'Réglages ▸ Général ▸ Clavier ▸ Claviers ▸ Ajouter un clavier… ▸ « FITILA Bariba ». Le bouton ci-dessous ouvre les réglages de FITILA.',
      actionLabel: 'Ouvrir les réglages',
      onAction: _openSettings,
    ),
    _Step(
      done: status.fullAccess,
      number: '3',
      title: 'Autoriser l’accès complet (facultatif)',
      body: 'Touchez « FITILA Bariba » puis activez « Autoriser l’accès complet » pour la traduction en ligne. Sans cela, le clavier, la prédiction et le dictionnaire fonctionnent hors ligne.',
      actionLabel: 'Ouvrir les réglages',
      onAction: _openSettings,
    ),
    const _Step(
      done: false,
      number: '4',
      title: 'Basculer avec le globe 🌐',
      body: 'Dans n’importe quelle app, maintenez le globe pour choisir « FITILA Bariba ». iOS ne permet pas de savoir quel clavier est actif : ce dernier pas est à votre main.',
      hideCheck: true,
    ),
  ];
}

class _StatusHero extends StatelessWidget {
  const _StatusHero({
    required this.checking,
    required this.supported,
    required this.ready,
    required this.enabled,
    required this.platform,
  });

  final bool checking;
  final bool supported;
  final bool ready;
  final bool enabled;
  final String platform;

  @override
  Widget build(BuildContext context) {
    final title = checking
        ? 'Vérification…'
        : !supported
        ? 'Clavier système indisponible ici'
        : ready
        ? 'Clavier actif ✓'
        : enabled
        ? 'Ajouté, pas encore sélectionné'
        : 'Non activé';
    final body = ready
        ? 'Votre clavier Bàátɔ̀nú fonctionne dans toutes vos applications.'
        : !supported
        ? 'Le clavier système est disponible sur Android et iPhone. Ici, utilisez le clavier intégré de FITILA ci-dessous.'
        : 'Suivez les étapes : trois minutes suffisent pour écrire en Bàátɔ̀nú partout.';
    return AnimatedContainer(
      duration: const Duration(milliseconds: 300),
      curve: Curves.easeOutCubic,
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(SignatureTheme.radiusMedium),
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: ready
              ? const [SignatureTheme.sage, Color(0xFF2C5039)]
              : const [Color(0xFF5B5460), SignatureTheme.ink],
        ),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  key: const ValueKey('keyboard-status-title'),
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 19,
                    fontWeight: FontWeight.w800,
                    fontFamily: 'Fraunces',
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  body,
                  style: const TextStyle(color: Colors.white70, fontSize: 12, height: 1.4),
                ),
              ],
            ),
          ),
          const SizedBox(width: 10),
          checking
              ? const SizedBox(
                  width: 18,
                  height: 18,
                  child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                )
              : Icon(
                  ready ? Icons.check_circle_rounded : Icons.keyboard_alt_outlined,
                  color: Colors.white,
                ),
        ],
      ),
    );
  }
}

class _Step extends StatelessWidget {
  const _Step({
    required this.done,
    required this.number,
    required this.title,
    required this.body,
    this.actionLabel,
    this.onAction,
    this.hideCheck = false,
  });

  final bool done;
  final String number;
  final String title;
  final String body;
  final String? actionLabel;
  final VoidCallback? onAction;
  final bool hideCheck;

  @override
  Widget build(BuildContext context) {
    return AnimatedContainer(
      duration: const Duration(milliseconds: 250),
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: done && !hideCheck ? SignatureTheme.sageTint : SignatureTheme.surface,
        borderRadius: BorderRadius.circular(SignatureTheme.radiusMedium),
        border: Border.all(
          color: done && !hideCheck ? SignatureTheme.sage : SignatureTheme.hairline,
        ),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          CircleAvatar(
            radius: 14,
            backgroundColor: done && !hideCheck ? SignatureTheme.sage : SignatureTheme.goldTint,
            child: done && !hideCheck
                ? const Icon(Icons.check_rounded, size: 16, color: Colors.white)
                : Text(
                    number,
                    style: const TextStyle(
                      color: SignatureTheme.goldDeep,
                      fontWeight: FontWeight.w800,
                      fontSize: 13,
                    ),
                  ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    color: SignatureTheme.ink,
                    fontWeight: FontWeight.w800,
                    fontSize: 14,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  body,
                  style: const TextStyle(
                    color: SignatureTheme.inkSoft,
                    fontSize: 12,
                    height: 1.45,
                  ),
                ),
                if (actionLabel != null) ...[
                  const SizedBox(height: 10),
                  FilledButton.tonal(
                    onPressed: onAction,
                    child: Text(actionLabel!),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _NoNative extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return const _Step(
      done: false,
      number: 'i',
      title: 'Clavier intégré à l’application',
      body: 'Sur ce terminal, touchez l’icône clavier d’un champ de saisie pour ouvrir le clavier Bàátɔ̀nú de FITILA avec prédiction et traduction.',
      hideCheck: true,
    );
  }
}

class _TestCard extends StatelessWidget {
  const _TestCard({required this.controller, required this.ready});

  final TextEditingController controller;
  final bool ready;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: SignatureTheme.surface,
        borderRadius: BorderRadius.circular(SignatureTheme.radiusMedium),
        border: Border.all(color: SignatureTheme.hairline),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            ready ? 'Essayez votre clavier' : 'Essayez le clavier intégré',
            style: const TextStyle(fontWeight: FontWeight.w800, color: SignatureTheme.ink),
          ),
          const SizedBox(height: 4),
          const Text(
            'Tapez « ba » ou « na » : la barre propose les mots. Le bouton Traduire bascule en « Saisir et Traduire ».',
            style: TextStyle(fontSize: 12, color: SignatureTheme.muted, height: 1.4),
          ),
          const SizedBox(height: 10),
          BaribaTextField(
            controller: controller,
            minLines: 2,
            maxLines: 4,
            decoration: InputDecoration(
              hintText: 'Écrivez en Bàátɔ̀nú…',
              filled: true,
              fillColor: SignatureTheme.appBackground,
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(SignatureTheme.radiusSmall),
                borderSide: const BorderSide(color: SignatureTheme.hairline),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
