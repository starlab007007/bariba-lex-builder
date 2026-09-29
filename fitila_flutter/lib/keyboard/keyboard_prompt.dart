import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../core/signature_theme.dart';
import 'bariba_input.dart';

const _promptSeenKey = 'bariba_keyboard_prompt_seen_v1';

/// Once per install, offers to activate the system keyboard when it is not
/// ready yet. Returns true if the user chose to open the setup screen.
Future<bool> maybeOfferBaribaKeyboard(BuildContext context) async {
  final SharedPreferences prefs;
  try {
    prefs = await SharedPreferences.getInstance();
  } catch (_) {
    return false;
  }
  if (!context.mounted) {
    return false;
  }
  if (prefs.getBool(_promptSeenKey) == true) {
    return false;
  }
  final status = await BaribaKeyboardServices.bridge.status();
  if (!status.supported || status.isReady) {
    return false; // nothing to offer (desktop/web) or already active
  }
  if (!context.mounted) {
    return false;
  }
  await prefs.setBool(_promptSeenKey, true);
  if (!context.mounted) {
    return false;
  }
  final accepted = await showModalBottomSheet<bool>(
    context: context,
    showDragHandle: true,
    backgroundColor: SignatureTheme.surface,
    builder: (sheet) => Padding(
      padding: const EdgeInsets.fromLTRB(20, 4, 20, 24),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Icon(Icons.keyboard_alt_rounded, size: 34, color: SignatureTheme.goldDeep),
          const SizedBox(height: 10),
          const Text(
            'Écrivez en Bàátɔ̀nú partout',
            style: TextStyle(
              fontFamily: 'Fraunces',
              fontSize: 20,
              fontWeight: FontWeight.w800,
              color: SignatureTheme.ink,
            ),
          ),
          const SizedBox(height: 6),
          const Text(
            'Activez le clavier Bariba pour taper ã, ĩ, ɔ, ɛ, ŋ et les tons dans WhatsApp, SMS ou le navigateur — avec prédiction et traduction.',
            style: TextStyle(color: SignatureTheme.inkSoft, height: 1.45),
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(
                child: OutlinedButton(
                  onPressed: () => Navigator.of(sheet).pop(false),
                  child: const Text('Plus tard'),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: FilledButton(
                  onPressed: () => Navigator.of(sheet).pop(true),
                  child: const Text('Activer'),
                ),
              ),
            ],
          ),
        ],
      ),
    ),
  );
  return accepted == true;
}
