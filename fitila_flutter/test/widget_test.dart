import 'package:fitila_native/main.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('Fitila login smoke test', (tester) async {
    await tester.pumpWidget(const FitilaApp(demoMode: true));

    expect(find.text('FITILA'), findsWidgets);
    expect(find.text('Parlez sans frontières'), findsOneWidget);

    await tester.ensureVisible(find.text('Se connecter'));
    await tester.pump();
    await tester.tap(find.text('Se connecter'));
    await tester.pump(const Duration(milliseconds: 650));
    await tester.pump();

    expect(find.text('Fil'), findsWidgets);
  });

  sidebarMatchesWeb();
}

void sidebarMatchesWeb() {
  testWidgets('drawer lists exactly the web sidebar modules, in order', (tester) async {
    tester.view.physicalSize = const Size(390, 844);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.reset);
    await tester.pumpWidget(const FitilaApp(demoMode: true));
    await tester.pump(const Duration(seconds: 1));
    await tester.ensureVisible(find.text('Se connecter'));
    await tester.pump();
    await tester.tap(find.text('Se connecter'));
    await tester.pump(const Duration(milliseconds: 650));
    await tester.pump(const Duration(milliseconds: 300));

    final scaffold = tester.stateList<ScaffoldState>(find.byType(Scaffold)).firstWhere((s) => s.hasDrawer);
    scaffold.openDrawer();
    await tester.pumpAndSettle();

    const expected = [
      'Explorer', 'Fil', 'Dictionnaire', 'Classe', 'IA', 'Traducteur', 'Apprendre', 'Créateur', 'Espace',
      'Culture', 'Voice Lab',
      'Compte', 'Clavier', 'Enseignant', 'Profil', 'Paramètres',
      'Langue', 'Français', 'Bàátɔ̀nú',
    ];
    double last = -1;
    for (final label in expected) {
      final f = find.descendant(of: find.byType(Drawer), matching: find.text(label));
      expect(f, findsOneWidget, reason: label);
      final y = tester.getTopLeft(f).dy;
      expect(y, label == 'Bàátɔ̀nú' ? greaterThanOrEqualTo(last) : greaterThan(last), reason: 'ordre: $label');
      last = y;
    }
    for (final gone in ['Templates', 'Services', 'Marche', 'Éducation', 'Messages', 'Découvrir', 'Portefeuille', 'Administration']) {
      expect(find.descendant(of: find.byType(Drawer), matching: find.text(gone)), findsNothing, reason: gone);
    }
  });
}
