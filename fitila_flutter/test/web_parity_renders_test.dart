// Rendus de référence de TOUS les écrans FITILA Build19, pour la mise en
// conformité du web (fitila.bj). Chaque écran est rendu :
//   * phone_<nom>  : 390 × 844 logiques, ×2 (ce que voit un téléphone)
//   * tall_<nom>   : 390 × 2400 logiques, ×1.5 (contenu défilant complet)
//   * wide_<nom>   : 1440 × 900 logiques, ×1 (coquille bureau, panneau fixe)
// Généré par : flutter test --update-goldens test/web_parity_renders_test.dart
// Aucune donnée serveur : Supabase n'est pas configuré en test.

import 'dart:async';

import 'package:fitila_native/apprendre/apprendre_daily.dart';
import 'package:fitila_native/apprendre/apprendre_explore.dart';
import 'package:fitila_native/apprendre/apprendre_foundation.dart';
import 'package:fitila_native/apprendre/apprendre_hub.dart';
import 'package:fitila_native/apprendre/apprendre_models.dart';
import 'package:fitila_native/apprendre/apprendre_onboarding.dart';
import 'package:fitila_native/apprendre/apprendre_review.dart';
import 'package:fitila_native/apprendre/apprendre_scenes.dart';
import 'package:fitila_native/apprendre/apprendre_scenes_ui.dart';
import 'package:fitila_native/apprendre/apprendre_session.dart';
import 'package:fitila_native/apprendre/apprendre_store.dart';
import 'package:fitila_native/apprendre/apprendre_voice_studio.dart';
import 'package:fitila_native/core/signature_theme.dart';
import 'package:fitila_native/main.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

final _root = GlobalKey();

const _phone = Size(390, 844);
const _tall = Size(390, 2400);
const _wide = Size(1440, 900);

const _demoSession = FitilaSession(
  userId: 'preview',
  phone: '',
  displayName: 'Compte de démonstration',
  role: 'Membre',
  accessToken: '',
);

late List<DictionaryEntry> _dictionary;
late ApprendreContent _content;
late ScenesContent _scenes;

Future<void> _loadFont(String family, String asset) async {
  final loader = FontLoader(family)..addFont(rootBundle.load(asset));
  await loader.load();
}

void _setSize(WidgetTester t, Size logical, double dpr) {
  t.view.physicalSize = Size(logical.width * dpr, logical.height * dpr);
  t.view.devicePixelRatio = dpr;
  addTearDown(t.view.resetPhysicalSize);
  addTearDown(t.view.resetDevicePixelRatio);
}

Future<void> _settle(WidgetTester t, {int rounds = 6}) async {
  for (var i = 0; i < rounds; i++) {
    await t.runAsync(() => Future<void>.delayed(const Duration(milliseconds: 120)));
    await t.pump(const Duration(milliseconds: 250));
  }
}

Future<void> _mount(WidgetTester t, Widget home, Size size, double dpr) async {
  _setSize(t, size, dpr);
  await t.pumpWidget(
    RepaintBoundary(
      key: _root,
      child: MaterialApp(
        debugShowCheckedModeBanner: false,
        theme: SignatureTheme.light(),
        home: home,
      ),
    ),
  );
  await _settle(t);
}

Future<void> _shot(WidgetTester t, String name) async {
  await expectLater(find.byKey(_root), matchesGoldenFile('web_parity_renders/$name.png'));
}

Widget _screen(Widget child) => Scaffold(body: SafeArea(child: child));

Future<ApprendreStore> _learnerStore({bool withProgress = true}) async {
  SharedPreferences.setMockInitialValues({});
  final store = await ApprendreStore.open();
  store.progress.profile = 'fr';
  if (withProgress) {
    // Apprenant de démonstration : 3 jours d'activité, une fondation validée,
    // des mots vus dont certains à revoir (pour que Révision/Progression
    // montrent leur état réel plutôt qu'un écran vide).
    final start = DateTime.now().subtract(const Duration(days: 9));
    final cards = _content.cardsOf(_content.themes.first).take(18).toList();
    for (var i = 0; i < cards.length; i++) {
      store.progress.recordAnswer(cards[i].id, correct: i % 3 != 0, now: start.add(Duration(hours: i)));
    }
    store.progress.recordFoundation(_content.foundations.first.id, 80, start);
  }
  return store;
}

// Écrans autonomes (mêmes arguments que FitilaShell._screenFor).
Map<String, Widget Function()> _pages() => {
  'feed': () => FeedScreen(posts: const [], onPostCreated: (_) {}),
  'creator': () => ContentCreatorScreen(onPostCreated: (_) {}),
  'templates': () => TemplatesScreen(onUseTemplate: (_) {}),
  'services': () => const WebParityModuleScreen(page: FitilaPage.services),
  'market': () => const MarketScreen(),
  'agriculture': () => const AgricultureScreen(),
  'finance': () => const FinanceScreen(),
  'education': () => const WebParityModuleScreen(page: FitilaPage.education),
  'health': () => const HealthScreen(),
  'sos': () => const SosScreen(),
  'messages': () => const UtilityScreen(page: FitilaPage.messages),
  'discover': () => const UtilityScreen(page: FitilaPage.discover),
  'install': () => const UtilityScreen(page: FitilaPage.install),
  'drafts': () => const UtilityScreen(page: FitilaPage.drafts),
  'offline': () => const UtilityScreen(page: FitilaPage.offline),
  'wallet': () => const UtilityScreen(page: FitilaPage.wallet),
  'history': () => const UtilityScreen(page: FitilaPage.history),
  'scan': () => const UtilityScreen(page: FitilaPage.scan),
  'shop': () => const UtilityScreen(page: FitilaPage.shop),
  'dictionary': () => DictionaryScreen(loadEntries: () async => _dictionary),
  'translator': () => const TranslatorScreen(accessToken: ''),
  'ia': () => const AiScreen(),
  'tem_ia': () => const TemIaScreen(),
  'classe': () => const ClasseScreen(),
  'keyboard': () => const KeyboardScreen(),
  'voice_lab': () => const VoiceLabScreen(),
  'teacher': () => const TeacherScreen(),
  'profile': () => const ProfileScreen(session: _demoSession),
  'settings': () => SettingsScreen(onSignedOut: () {}),
  'handunia_feed': () => const HanduniaWasaScreen(),
  'handunia_publish': () => const HanduniaWasaScreen(entryMode: HanduniaWasaEntryMode.publish),
  'handunia_explore': () => const HanduniaWasaScreen(entryMode: HanduniaWasaEntryMode.explore),
  'sagesse_battle': () => const SagesseBattleScreen(),
};

// Libellés du menu latéral (FitilaPageMeta.title) pour la coquille.
const _shellTitles = <String, String>{
  'feed': 'Fil', 'dictionary': 'Dictionnaire', 'classe': 'Classe', 'ia': 'IA',
  'translator': 'Traducteur', 'learn': 'Apprendre', 'templates': 'Templates',
  'creator': 'Createur', 'voice_lab': 'Voice Lab', 'education': 'Education',
  'discover': 'Decouvrir', 'messages': 'Messages', 'services': 'Services',
  'market': 'Marche', 'agriculture': 'Agriculture', 'finance': 'Finance',
  'health': 'Sante', 'sos': 'SOS', 'install': 'Installer', 'keyboard': 'Clavier',
  'teacher': 'Enseignant', 'drafts': 'Brouillons', 'offline': 'Hors ligne',
  'wallet': 'Portefeuille', 'history': 'Historique', 'scan': 'Scanner',
  'shop': 'Boutique', 'profile': 'Profil', 'settings': 'Paramètres',
};

Finder _navPanel() => find.byWidgetPredicate((w) => w.runtimeType.toString() == '_NavigationPanel');

Future<void> _signIn(WidgetTester t) async {
  await t.pumpWidget(
    RepaintBoundary(key: _root, child: const FitilaApp(demoMode: true)),
  );
  await _settle(t);
  final login = find.text('Se connecter');
  await t.ensureVisible(login.first);
  await _settle(t, rounds: 2);
  await t.tap(login.first);
  await _settle(t);
}

Future<void> _openFromMenu(WidgetTester t, String title, {required bool wide}) async {
  if (!wide) {
    final shell = find.byWidgetPredicate((w) => w is Scaffold && w.drawer != null);
    t.firstState<ScaffoldState>(shell).openDrawer();
    await _settle(t, rounds: 3);
  }
  final item = find.descendant(of: _navPanel(), matching: find.text(title));
  await t.ensureVisible(item.last);
  await _settle(t, rounds: 2);
  await t.tap(item.last);
  await _settle(t);
}

void main() {
  setUpAll(() async {
    TestWidgetsFlutterBinding.ensureInitialized();
    SharedPreferences.setMockInitialValues({});
    await _loadFont('Inter', 'assets/fonts/Inter-VariableFont_opsz,wght.ttf');
    await _loadFont('Fraunces', 'assets/fonts/Fraunces-Variable.ttf');
    await _loadFont('Karla', 'assets/fonts/Karla-Variable.ttf');
    await _loadFont('MaterialIcons', 'fonts/MaterialIcons-Regular.otf');
    _dictionary = await FitilaServices.loadDictionary();
    _content = await ApprendreContent.load();
    _scenes = await ScenesContent.load();
  });

  // --- Connexion ---------------------------------------------------------
  for (final (label, size, dpr) in [('phone', _phone, 2.0), ('wide', _wide, 1.0)]) {
    testWidgets('${label}_login', (t) async {
      await _mount(t, AuthScreen(onSignedIn: (_) {}, demoMode: true), size, dpr);
      await _shot(t, '${label}_login');
    });
  }

  // --- Coquille : chaque page telle qu'ouverte depuis le menu -------------
  for (final (label, size, dpr, wide) in [('phone', _phone, 2.0, false), ('wide', _wide, 1.0, true)]) {
    testWidgets('${label}_shell_home', (t) async {
      _setSize(t, size, dpr);
      await _signIn(t);
      await _shot(t, '${label}_shell_home');
      if (!wide) {
        final shell = find.byWidgetPredicate((w) => w is Scaffold && w.drawer != null);
        t.firstState<ScaffoldState>(shell).openDrawer();
        await _settle(t, rounds: 3);
        await _shot(t, 'phone_shell_drawer');
      }
    });
    for (final entry in _shellTitles.entries) {
      testWidgets('${label}_shell_${entry.key}', (t) async {
        _setSize(t, size, dpr);
        await _signIn(t);
        await _openFromMenu(t, entry.value, wide: wide);
        await _shot(t, '${label}_shell_${entry.key}');
      });
    }
  }

  testWidgets('phone_shell_create_button', (t) async {
    _setSize(t, _phone, 2.0);
    await _signIn(t);
    await t.tap(find.widgetWithIcon(InkWell, Icons.add_rounded));
    await _settle(t);
    await _shot(t, 'phone_shell_create');
  });

  // --- Écrans autonomes, vue téléphone et contenu complet -----------------
  for (final entry in _pages().entries) {
    for (final (label, size, dpr) in [('phone', _phone, 2.0), ('tall', _tall, 1.5)]) {
      testWidgets('${label}_${entry.key}', (t) async {
        await _mount(t, _screen(entry.value()), size, dpr);
        await _shot(t, '${label}_${entry.key}');
      });
    }
  }

  // --- Apprendre et ses sous-écrans ---------------------------------------
  Future<void> learn(WidgetTester t, String name, Future<Widget> Function(ApprendreStore) build,
      {bool progress = true, bool wrap = false}) async {
    for (final (label, size, dpr) in [('phone', _phone, 2.0), ('tall', _tall, 1.5)]) {
      final store = (await t.runAsync(() => _learnerStore(withProgress: progress)))!;
      final widget = await build(store);
      await _mount(t, wrap ? _screen(widget) : widget, size, dpr);
      await _shot(t, '${label}_$name');
    }
  }

  testWidgets('learn_hub_new', (t) async {
    await learn(t, 'learn_hub_new', (s) async => ApprendreHubScreen(
      links: const [], contentLoader: () async => _content, storeLoader: () async => s),
      progress: false, wrap: true);
  });
  testWidgets('learn_hub_progress', (t) async {
    await learn(t, 'learn_hub_progress', (s) async => ApprendreHubScreen(
      links: const [], contentLoader: () async => _content, storeLoader: () async => s), wrap: true);
  });
  testWidgets('learn_onboarding', (t) async {
    await learn(t, 'learn_onboarding', (s) async => ApOnboardingScreen(profiles: _content.profiles), progress: false);
  });
  testWidgets('learn_review', (t) async {
    await learn(t, 'learn_review', (s) async => ApReviewScreen(content: _content, store: s));
  });
  testWidgets('learn_progress', (t) async {
    await learn(t, 'learn_progress', (s) async => ApProgressScreen(content: _content, store: s));
  });
  testWidgets('learn_theme', (t) async {
    await learn(t, 'learn_theme', (s) async => ApThemeScreen(content: _content, theme: _content.themes.first, store: s));
  });
  for (var i = 0; i < 3; i++) {
    testWidgets('learn_foundation_$i', (t) async {
      await learn(t, 'learn_foundation_$i', (s) async => ApFoundationScreen(content: _content, unit: _content.foundations[i], store: s));
    });
  }
  testWidgets('learn_session', (t) async {
    await learn(t, 'learn_session', (s) async => ApSessionScreen(
      title: 'Séance du jour',
      tasks: ApSessionPlanner(_content).dailySession(s.progress, now: DateTime.now()),
      store: s,
      sessionKey: 'seance_du_jour'));
  });
  testWidgets('learn_scenes_hub', (t) async {
    await learn(t, 'learn_scenes_hub', (s) async => ApScenesHubScreen(
      store: s, contentLoader: () async => _scenes, progressLoader: ScenesProgress.open));
  });
  testWidgets('learn_scene_detail', (t) async {
    await learn(t, 'learn_scene_detail', (s) async => ApSceneDetailScreen(
      scene: _scenes.scenes.first, content: _scenes, progress: (await ScenesProgress.open()), store: s));
  });
  testWidgets('learn_voice_studio', (t) async {
    await learn(t, 'learn_voice_studio', (s) async => const ApVoiceStudioScreen());
  });
  testWidgets('learn_voice_review', (t) async {
    await learn(t, 'learn_voice_review', (s) async => const ApVoiceReviewScreen());
  });
}
