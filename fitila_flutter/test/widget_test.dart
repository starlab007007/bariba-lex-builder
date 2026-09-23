import 'package:fitila_native/main.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('Fitila login smoke test', (tester) async {
    await tester.pumpWidget(const FitilaApp(demoMode: true));

    expect(find.text('FITILA'), findsWidgets);
    expect(find.text('Bienvenue'), findsOneWidget);

    await tester.tap(find.text('Se connecter'));
    await tester.pump(const Duration(milliseconds: 650));
    await tester.pump();

    expect(find.text('Fil'), findsWidgets);
  });
}
