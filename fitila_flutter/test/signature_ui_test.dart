import 'package:fitila_native/main.dart';
import 'package:fitila_native/core/signature_theme.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  late List<DictionaryEntry> dictionaryEntries;

  setUpAll(() async {
    TestWidgetsFlutterBinding.ensureInitialized();
    final loader = FontLoader('Inter')
      ..addFont(
        rootBundle.load('assets/fonts/Inter-VariableFont_opsz,wght.ttf'),
      );
    await loader.load();
    final icons = FontLoader('MaterialIcons')
      ..addFont(rootBundle.load('fonts/MaterialIcons-Regular.otf'));
    await icons.load();
    dictionaryEntries = await FitilaServices.loadDictionary();
  });

  final screens = <String, Widget>{
    'login': AuthScreen(onSignedIn: (_) {}, demoMode: true),
    'feed': FeedScreen(posts: const [], onPostCreated: (_) {}),
    'creator': ContentCreatorScreen(onPostCreated: (_) {}),
    'templates': TemplatesScreen(onUseTemplate: (_) {}),
    'dictionary': DictionaryScreen(
      loadEntries: () async => dictionaryEntries,
    ),
    'translator': const TranslatorScreen(accessToken: ''),
    'ai': const AiScreen(),
    'tem_ai': const TemIaScreen(),
    'learn': const LearnScreen(),
    'classe': const ClasseScreen(),
    'keyboard': const KeyboardScreen(),
    'teacher': const TeacherScreen(),
    'profile': const ProfileScreen(
      session: FitilaSession(
        userId: 'preview',
        phone: '',
        displayName: 'Compte de démonstration',
        role: 'user',
        accessToken: '',
      ),
    ),
    'settings': SettingsScreen(onSignedOut: () {}),
  };

  for (final entry in screens.entries) {
    testWidgets('Premium clair ${entry.key} renders on phone', (tester) async {
      tester.view.physicalSize = const Size(390, 844);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);

      await tester.pumpWidget(
        MaterialApp(
          debugShowCheckedModeBanner: false,
          theme: SignatureTheme.light(),
          home: Scaffold(body: SafeArea(child: entry.value)),
        ),
      );
      await tester.pump(const Duration(milliseconds: 500));
      await tester.pump();

      expect(tester.takeException(), isNull);
      expect(find.byType(Scaffold), findsWidgets);

    });
  }

  testWidgets('premium shell uses mockup bottom navigation', (tester) async {
    tester.view.physicalSize = const Size(390, 844);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await tester.pumpWidget(const FitilaApp(demoMode: true));
    await tester.pumpAndSettle();
    await tester.ensureVisible(find.text('Se connecter'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Se connecter'));
    await tester.pumpAndSettle();

    expect(find.text('Fil'), findsWidgets);
    expect(find.text('Apprendre'), findsOneWidget);
    expect(find.text('Classe'), findsOneWidget);
    expect(find.bySemanticsLabel('Création'), findsOneWidget);
    expect(find.text('Dico'), findsOneWidget);
    expect(find.text('Traduc.'), findsOneWidget);
    expect(find.text('Fitila IA'), findsOneWidget);

    await tester.tap(find.text('Dico'));
    await tester.pump(const Duration(milliseconds: 350));
    await tester.pump();
    expect(find.text('Dictionnaire'), findsWidgets);
    expect(tester.takeException(), isNull);

    await tester.tap(find.text('Fitila IA'));
    await tester.pump(const Duration(milliseconds: 350));
    await tester.pump();
    expect(find.text('Fitila IA'), findsWidgets);
    expect(tester.takeException(), isNull);

    await tester.tap(find.bySemanticsLabel('Création'));
    await tester.pump(const Duration(milliseconds: 350));
    await tester.pump();
    expect(find.text('Créateur'), findsWidgets);
    expect(tester.takeException(), isNull);
  });

  testWidgets('translator state survives premium shell navigation', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(390, 844);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await tester.pumpWidget(const FitilaApp(demoMode: true));
    await tester.pumpAndSettle();
    await tester.ensureVisible(find.text('Se connecter'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Se connecter'));
    await tester.pumpAndSettle();

    await tester.tap(find.byTooltip('Menu').first);
    await tester.pumpAndSettle();
    await tester.tap(find.text('Traducteur').last);
    await tester.pump(const Duration(milliseconds: 350));
    await tester.pump();

    final field = find.byType(TextField).first;
    await tester.ensureVisible(field);
    await tester.enterText(field, 'Bonjour FITILA');

    await tester.binding.handlePopRoute();
    await tester.pump(const Duration(milliseconds: 350));
    await tester.pump();
    expect(find.text('Fil Fitila'), findsOneWidget);

    await tester.tap(find.byTooltip('Menu').first);
    await tester.pumpAndSettle();
    await tester.tap(find.text('Traducteur').last);
    await tester.pump(const Duration(milliseconds: 350));
    await tester.pump();

    expect(find.text('Bonjour FITILA'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
}
