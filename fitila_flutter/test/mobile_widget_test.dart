import 'package:fitila_native/main.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('native login and feed fit a phone viewport', (tester) async {
    tester.view.physicalSize = const Size(390, 844);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await tester.pumpWidget(const FitilaApp(demoMode: true));
    await tester.ensureVisible(find.text('Se connecter'));
    await tester.pump(const Duration(milliseconds: 650));
    await tester.pump();
    expect(
      tester.takeException(),
      isNull,
      reason: 'L’écran de connexion doit tenir sur un téléphone de 390 px.',
    );
    await tester.tap(find.text('Se connecter'));
    await tester.pump(const Duration(milliseconds: 650));
    await tester.pump();

    expect(find.text('Fil'), findsWidgets);
    expect(tester.takeException(), isNull);
  });
}
