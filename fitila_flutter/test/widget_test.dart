import 'package:fitila_flutter/main.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

Future<void> _signIn(WidgetTester tester) async {
  await tester.pumpWidget(const FitilaApp());
  expect(find.text('FITILA'), findsWidgets);
  expect(find.text('Connexion'), findsOneWidget);

  await tester.tap(find.text('Se connecter'));
  await tester.pumpAndSettle();

  expect(find.text('Fil Fitila'), findsOneWidget);
  expect(tester.takeException(), isNull);
}

void main() {
  testWidgets('FITILA 1.8.1 login smoke test', (tester) async {
    await _signIn(tester);
  });

  testWidgets('FITILA 1.8.1 core modules render without exception', (tester) async {
    tester.view.physicalSize = const Size(1600, 1400);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(() {
      tester.view.resetPhysicalSize();
      tester.view.resetDevicePixelRatio();
    });

    await _signIn(tester);

    const moduleLabels = <String>[
      'Createur',
      'Templates',
      'Dictionnaire',
      'Traducteur',
      'IA',
      'Tem-IA',
      'Apprendre',
      'Classe',
      'Services',
      'Marche',
      'Agriculture',
      'Finance',
      'Education',
      'Sante',
      'SOS',
      'Messages',
      'Decouvrir',
      'Installer',
      'Clavier',
      'Voice Lab',
      'Enseignant',
      'Brouillons',
      'Hors ligne',
      'Portefeuille',
      'Historique',
      'Scanner',
      'Boutique',
      'Profil',
      'Paramètres',
    ];

    for (final label in moduleLabels) {
      final item = find.text(label);
      expect(item, findsWidgets, reason: 'Navigation item missing: $label');

      await tester.ensureVisible(item.first);
      await tester.tap(item.first);
      await tester.pump(const Duration(milliseconds: 350));
      await tester.pump();

      expect(
        tester.takeException(),
        isNull,
        reason: 'Module failed to render: $label',
      );
    }
  });
}
