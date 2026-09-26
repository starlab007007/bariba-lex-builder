import 'package:flutter/material.dart';

import 'apprendre_models.dart';
import 'apprendre_ui.dart';

/// Choix du profil d'apprenant et du sens d'apprentissage.
class ApOnboardingScreen extends StatefulWidget {
  const ApOnboardingScreen({
    super.key,
    required this.profiles,
    this.initialProfile,
    this.initialDirection = 'fr_to_ba',
  });

  final List<ApProfile> profiles;
  final String? initialProfile;
  final String initialDirection;

  @override
  State<ApOnboardingScreen> createState() => _ApOnboardingScreenState();
}

/// Choix renvoyé par [ApOnboardingScreen].
class ApOnboardingChoice {
  const ApOnboardingChoice({required this.profile, required this.direction});

  final String profile;
  final String direction;
}

class _ApOnboardingScreenState extends State<ApOnboardingScreen> {
  late String _profile = widget.initialProfile ?? 'fr';
  late String _direction = widget.initialDirection;

  void _pick(String id) {
    setState(() {
      _profile = id;
      if (id == 'ba') {
        _direction = 'ba_to_fr';
      } else if (id == 'fr' || id == 'oral') {
        _direction = 'fr_to_ba';
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: ApColors.ivory,
      body: SafeArea(
        child: Column(
          children: [
            const ApTopBar(title: 'Mɛɛribu', subtitle: 'Apprendre · étape 1'),
            Expanded(
              child: ListView(
                padding: const EdgeInsets.fromLTRB(20, 8, 20, 20),
                children: [
                  Text(
                    'Comment veux-tu apprendre ?',
                    style: ApText.display.copyWith(fontSize: 30),
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    'Fitila adapte les séances à ta façon de lire et d’écouter. Tu pourras changer plus tard.',
                    style: ApText.body,
                  ),
                  const SizedBox(height: 20),
                  for (final profile in widget.profiles)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 10),
                      child: _ProfileTile(
                        profile: profile,
                        selected: profile.id == _profile,
                        onTap: () => _pick(profile.id),
                      ),
                    ),
                  const SizedBox(height: 14),
                  const Text('SENS D’APPRENTISSAGE', style: ApText.label),
                  const SizedBox(height: 8),
                  _DirectionToggle(
                    value: _direction,
                    onChanged: (value) => setState(() => _direction = value),
                  ),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 8, 20, 20),
              child: ApPrimaryButton(
                label: 'Commencer',
                onPressed: () => Navigator.of(context).pop(
                  ApOnboardingChoice(profile: _profile, direction: _direction),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ProfileTile extends StatelessWidget {
  const _ProfileTile({
    required this.profile,
    required this.selected,
    required this.onTap,
  });

  final ApProfile profile;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      selected: selected,
      button: true,
      child: Material(
        color: selected ? ApColors.goldGlow : ApColors.surface,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(20),
          side: BorderSide(
            color: selected ? ApColors.gold : ApColors.line,
            width: selected ? 2 : 1,
          ),
        ),
        child: InkWell(
          borderRadius: BorderRadius.circular(20),
          onTap: onTap,
          child: Padding(
            padding: const EdgeInsets.all(14),
            child: Row(
              children: [
                Container(
                  width: 48,
                  height: 48,
                  decoration: BoxDecoration(
                    color: selected ? ApColors.gold : ApColors.goldTint,
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: Icon(
                    apIcon(profile.icon),
                    color: selected ? ApColors.goldInk : ApColors.goldDeep,
                  ),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        profile.title,
                        style: const TextStyle(
                          fontFamily: 'Inter',
                          fontSize: 16,
                          fontWeight: FontWeight.w800,
                          color: ApColors.ink,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(profile.line, style: ApText.small.copyWith(color: ApColors.quiet)),
                    ],
                  ),
                ),
                const SizedBox(width: 8),
                Icon(
                  selected ? Icons.radio_button_checked_rounded : Icons.radio_button_off_rounded,
                  color: selected ? ApColors.gold : ApColors.lineStrong,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _DirectionToggle extends StatelessWidget {
  const _DirectionToggle({required this.value, required this.onChanged});

  final String value;
  final ValueChanged<String> onChanged;

  @override
  Widget build(BuildContext context) {
    Widget segment(String id, String label) {
      final selected = value == id;
      return Expanded(
        child: Material(
          color: selected ? ApColors.night : Colors.transparent,
          borderRadius: BorderRadius.circular(14),
          child: InkWell(
            borderRadius: BorderRadius.circular(14),
            onTap: () => onChanged(id),
            child: SizedBox(
              height: 46,
              child: Center(
                child: Text(
                  label,
                  style: TextStyle(
                    fontFamily: 'Inter',
                    fontSize: 13.5,
                    fontWeight: FontWeight.w800,
                    color: selected ? Colors.white : ApColors.inkSoft,
                  ),
                ),
              ),
            ),
          ),
        ),
      );
    }

    return Container(
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: ApColors.surfaceAlt,
        borderRadius: BorderRadius.circular(18),
      ),
      child: Row(
        children: [
          segment('fr_to_ba', 'Français → Bàátɔ̀nú'),
          const SizedBox(width: 4),
          segment('ba_to_fr', 'Bàátɔ̀nú → Français'),
        ],
      ),
    );
  }
}
