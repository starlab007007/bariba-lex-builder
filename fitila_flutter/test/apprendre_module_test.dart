import 'dart:convert';
import 'dart:io';
import 'dart:math' as math;

import 'package:fitila_native/apprendre/apprendre_audio.dart';
import 'package:fitila_native/apprendre/apprendre_daily.dart';
import 'package:fitila_native/apprendre/apprendre_hub.dart';
import 'package:fitila_native/apprendre/apprendre_models.dart';
import 'package:fitila_native/apprendre/apprendre_review.dart';
import 'package:fitila_native/apprendre/apprendre_scenes.dart';
import 'package:fitila_native/apprendre/apprendre_scenes_ui.dart';
import 'package:fitila_native/apprendre/apprendre_store.dart';
import 'package:fitila_native/apprendre/apprendre_tasks.dart';
import 'package:fitila_native/apprendre/apprendre_voice_analysis.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

ApprendreContent _loadContent() {
  final raw = File(ApprendreContent.assetPath).readAsStringSync();
  return ApprendreContent.fromJson(jsonDecode(raw) as Map<String, dynamic>);
}

ScenesContent _loadScenes() {
  final raw = File(ScenesContent.assetPath).readAsStringSync();
  return ScenesContent.fromJson(jsonDecode(raw) as Map<String, dynamic>);
}

void main() {
  group('Contenu Apprendre', () {
    test('charge fondations, thèmes, mots et scènes', () {
      final content = _loadContent();
      expect(content.foundations.length, 10);
      expect(content.foundations.first.id, 'sons');
      expect(content.themes, isNotEmpty);
      expect(content.cards.length, greaterThan(1000));
      expect(content.scenes, isNotEmpty);
      for (final theme in content.themes) {
        expect(content.cardsOf(theme), isNotEmpty, reason: theme.id);
      }
    });

    test('chaque question de fondation contient sa bonne réponse', () {
      final content = _loadContent();
      for (final unit in content.foundations) {
        expect(unit.quiz, isNotEmpty, reason: unit.id);
        for (final quiz in unit.quiz) {
          if (quiz.type == 'mcq') {
            expect(quiz.options, contains(quiz.answer), reason: quiz.prompt);
          } else {
            expect(quiz.answerOrder, isNotEmpty, reason: quiz.prompt);
          }
        }
      }
    });

    test('les exemples des fondations citent leur source', () {
      final content = _loadContent();
      for (final unit in content.foundations) {
        for (final section in unit.sections) {
          for (final example in section.items) {
            expect(example.src, isNotEmpty, reason: example.ba);
          }
        }
      }
    });

    test('aucune forme bariba n’utilise l’alpha latin ɑ', () {
      final content = _loadContent();
      for (final card in content.cards.values) {
        expect(card.ba.contains('ɑ'), isFalse, reason: card.id);
      }
    });
  });

  group('Révision espacée', () {
    test('une bonne réponse fait monter la boîte et repousse la révision', () {
      final now = DateTime(2026, 9, 26, 10);
      final state = SrsState(box: 0, due: now, reps: 0, lapses: 0);
      final next = state.review(correct: true, now: now);
      expect(next.box, 1);
      expect(next.due, now.add(const Duration(days: 1)));
      final after = next.review(correct: true, now: next.due);
      expect(after.box, 2);
      expect(after.active, isTrue);
    });

    test('une erreur remet le mot en boîte 1', () {
      final now = DateTime(2026, 9, 26, 10);
      final state = SrsState(box: 4, due: now, reps: 5, lapses: 0);
      final next = state.review(correct: false, now: now);
      expect(next.box, 1);
      expect(next.lapses, 1);
    });

    test('la progression se sérialise sans perte', () {
      final now = DateTime(2026, 9, 26, 10);
      final progress = ApprendreProgress(profile: 'both')
        ..recordAnswer('BA-00010', correct: true, now: now)
        ..recordFoundation('sons', 80, now);
      final copy = ApprendreProgress.fromJson(
        jsonDecode(jsonEncode(progress.toJson())) as Map<String, dynamic>,
      );
      expect(copy.profile, 'both');
      expect(copy.srs['BA-00010']?.box, 1);
      expect(copy.foundationDone('sons'), isTrue);
      expect(copy.streak, 1);
    });
  });

  group('Exercices', () {
    test('la comparaison ignore les tons mais garde ɔ et ɛ', () {
      expect(baseForm('Àbèru.'), 'aberu');
      expect(baseForm('gúra'), baseForm('gurà'));
      expect(baseForm('sɔ̃ɔ'), isNot(baseForm('so')));
    });

    test('une séance de thème mélange nouveaux mots et réponses valides', () {
      final content = _loadContent();
      final progress = ApprendreProgress(profile: 'fr');
      final theme = content.themes.first;
      final tasks = ApTaskFactory(content).themeSession(
        theme,
        progress,
        now: DateTime(2026, 9, 26),
      );
      expect(tasks, isNotEmpty);
      for (final task in tasks) {
        if (task.kind == ApTaskKind.choice) {
          expect(task.options, contains(task.answer));
          expect(task.options.toSet().length, task.options.length);
        }
      }
    });
  });

  group('Séance du jour', () {
    test('contient les sept types d’exercices pour un profil lecteur', () {
      final content = _loadContent();
      final progress = ApprendreProgress(profile: 'fr');
      final tasks = ApSessionPlanner(content, random: math.Random(7))
          .dailySession(progress, now: DateTime(2026, 9, 26));
      final skills = tasks.map((t) => t.skill).toSet();
      expect(skills, containsAll(ApTask.coreSkills));
      expect(tasks.length, lessThanOrEqualTo(14));
    });

    test('le profil oral reste sans lecture de phrase', () {
      final content = _loadContent();
      final progress = ApprendreProgress(profile: 'oral');
      final tasks = ApSessionPlanner(content, random: math.Random(3))
          .dailySession(progress, now: DateTime(2026, 9, 26));
      final skills = tasks.map((t) => t.skill).toSet();
      expect(skills, containsAll(<String>['recognize', 'recall', 'speak']));
      expect(skills.intersection({'cloze', 'order'}), isEmpty);
    });

    test('chaque exercice construit est corrigeable', () {
      final content = _loadContent();
      for (var seed = 0; seed < 5; seed++) {
        final tasks = ApSessionPlanner(content, random: math.Random(seed))
            .dailySession(ApprendreProgress(profile: 'both'), now: DateTime(2026, 9, 26));
        for (final task in tasks) {
          if (task.kind == ApTaskKind.choice) {
            expect(task.options, contains(task.answer), reason: task.prompt);
            expect(task.options.length, greaterThanOrEqualTo(2), reason: task.prompt);
          } else if (task.kind == ApTaskKind.order) {
            expect(task.isCorrectOrder(task.orderAnswer), isTrue, reason: task.prompt);
          }
        }
      }
    });

    test('révision, entraînement libre et reprise des erreurs', () {
      final content = _loadContent();
      final now = DateTime(2026, 9, 26, 10);
      final progress = ApprendreProgress(profile: 'fr');
      final planner = ApSessionPlanner(content, random: math.Random(1));
      final first = planner.dailySession(progress, now: now);
      for (final task in first) {
        progress.recordAnswer(task.cardId, correct: false, now: now);
      }
      final later = now.add(const Duration(minutes: 11));
      final review = ApTaskFactory(content).reviewSession(progress, now: later);
      expect(review, isNotEmpty);
      final practice = planner.practiceSession(progress, now: now);
      expect(practice, isNotEmpty);
      final retry = planner.retrySession(first);
      expect(retry.length, first.length);
      expect(retry.first.answer, first.first.answer);
    });
  });

  testWidgets('l’accueil Apprendre affiche le parcours', (tester) async {
    tester.view.physicalSize = const Size(390, 1600);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    SharedPreferences.setMockInitialValues({
      ApprendreStore.storageKey: jsonEncode({'profile': 'fr', 'direction': 'fr_to_ba'}),
    });
    final content = _loadContent();

    await tester.pumpWidget(
      MaterialApp(
        home: ApprendreHubScreen(
          contentLoader: () async => content,
        ),
      ),
    );
    await tester.pump();
    await tester.pump();

    expect(find.text('Apprendre'), findsOneWidget);
    expect(find.text('Fondations'), findsOneWidget);
    expect(find.text("Les sons et l'alphabet"), findsWidgets);
  });

  testWidgets('l’accueil propose la séance du jour et la révision', (tester) async {
    tester.view.physicalSize = const Size(390, 2400);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    SharedPreferences.setMockInitialValues({
      ApprendreStore.storageKey: jsonEncode({'profile': 'fr', 'direction': 'fr_to_ba'}),
    });
    final content = _loadContent();

    await tester.pumpWidget(
      MaterialApp(home: ApprendreHubScreen(contentLoader: () async => content)),
    );
    await tester.pump();
    await tester.pump();

    expect(find.text('SÉANCE DU JOUR'), findsOneWidget);
    expect(find.text('Lancer la séance'), findsOneWidget);
    expect(find.text('Révision'), findsWidgets);
  });

  testWidgets('le module Révision s’affiche pour un nouvel apprenant', (tester) async {
    tester.view.physicalSize = const Size(390, 2000);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    SharedPreferences.setMockInitialValues({});
    final content = _loadContent();
    final store = await ApprendreStore.open();

    await tester.pumpWidget(
      MaterialApp(home: ApReviewScreen(content: content, store: store)),
    );
    await tester.pump();

    expect(find.text('Boîtes de mémoire'), findsOneWidget);
    expect(find.text('Séance du jour'), findsOneWidget);
  });

  group('Scènes de vie', () {
    test('module complet : thématiques, scènes, répliques sourcées', () {
      final content = _loadScenes();
      expect(content.categories.length, greaterThanOrEqualTo(10));
      expect(content.scenes.length, greaterThanOrEqualTo(40));
      final ids = <String>{};
      for (final scene in content.scenes) {
        expect(ids.add(scene.id), isTrue, reason: scene.id);
        expect(content.categoryById(scene.category), isNotNull, reason: scene.id);
        expect(scene.spoken.length, inInclusiveRange(8, 16), reason: scene.id);
        expect(scene.roles.keys, containsAll(<String>['a', 'b']), reason: scene.id);
        expect(scene.roles.containsKey(scene.learner), isTrue, reason: scene.id);
        expect(scene.intro, isNotEmpty, reason: scene.id);
        expect(scene.culture, isNotEmpty, reason: scene.id);
        expect(scene.vocab, isNotEmpty, reason: scene.id);
        for (final line in scene.spoken) {
          expect(line.src, startsWith('p. '), reason: line.ba);
          expect(line.fr, isNotEmpty, reason: line.ba);
          expect(line.ba.contains('ɑ'), isFalse, reason: line.ba);
        }
      }
      for (final category in content.categories) {
        expect(content.scenesOf(category.id).length, greaterThanOrEqualTo(3), reason: category.id);
      }
    });

    test('chaque scène produit un test de compréhension corrigeable', () {
      final content = _loadScenes();
      for (final scene in content.scenes) {
        final tasks = buildSceneQuiz(scene, random: math.Random(scene.id.length));
        expect(tasks.length, greaterThanOrEqualTo(4), reason: scene.id);
        for (final task in tasks) {
          if (task.kind == ApTaskKind.choice) {
            expect(task.options, contains(task.answer), reason: '${scene.id} ${task.prompt}');
            expect(task.options.toSet().length, task.options.length, reason: task.prompt);
          } else {
            expect(task.isCorrectOrder(task.orderAnswer), isTrue, reason: task.prompt);
          }
        }
      }
    });

    test('la progression des scènes est conservée', () async {
      SharedPreferences.setMockInitialValues({});
      final progress = await ScenesProgress.open();
      progress.recordScore('marche_courses', 75, now: DateTime(2026, 9, 27, 8));
      progress.markPlayed('nature_orage', now: DateTime(2026, 9, 27, 9));
      await progress.save();
      final copy = await ScenesProgress.open();
      expect(copy.done('marche_courses'), isTrue);
      expect(copy.played, contains('nature_orage'));
      expect(copy.doneCount, 1);
      expect(copy.attemptsFor('marche_courses'), 1);
      expect(copy.attemptsFor('nature_orage'), 1);
      expect(copy.lastPlayedAt('nature_orage'), DateTime(2026, 9, 27, 9));
    });

    test('la recommandation consolide une scène faible avant une nouvelle', () async {
      SharedPreferences.setMockInitialValues({});
      final content = _loadScenes();
      final progress = await ScenesProgress.open();
      final weak = content.scenes[3];
      progress.recordScore(weak.id, 25);
      expect(progress.needsReview(weak.id), isTrue);
      expect(progress.reviewQueue(content).first.id, weak.id);
      expect(progress.recommended(content)?.id, weak.id);

      progress.recordScore(weak.id, 90);
      expect(progress.needsReview(weak.id), isFalse);
      expect(progress.recommended(content), isNotNull);
      expect(progress.started(progress.recommended(content)!.id), isFalse);
    });
  });

  testWidgets('le module Scènes affiche les thématiques', (tester) async {
    tester.view.physicalSize = const Size(390, 2400);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    SharedPreferences.setMockInitialValues({});
    final content = _loadScenes();
    final store = await ApprendreStore.open();
    final progress = await ScenesProgress.open();

    await tester.pumpWidget(
      MaterialApp(
        home: ApScenesHubScreen(
          store: store,
          contentLoader: () async => content,
          progressLoader: () async => progress,
        ),
      ),
    );
    await tester.pump();
    await tester.pump();

    expect(find.text('Scènes de vie'), findsOneWidget);
    expect(find.text(content.categories.first.title), findsOneWidget);
    expect(find.text(content.scenes.first.title), findsWidgets);
  });

  testWidgets('une scène se joue de la présentation au dialogue', (tester) async {
    tester.view.physicalSize = const Size(390, 1800);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    SharedPreferences.setMockInitialValues({});
    final content = _loadScenes();
    final store = await ApprendreStore.open();
    final progress = await ScenesProgress.open();
    final scene = content.scenes.first;

    await tester.pumpWidget(
      MaterialApp(
        home: ApSceneDetailScreen(
          scene: scene,
          content: content,
          progress: progress,
          store: store,
        ),
      ),
    );
    expect(find.text('Commencer la scène'), findsOneWidget);
    await tester.tap(find.text('Écouter'));
    await tester.pump();
    await tester.ensureVisible(find.text('Commencer la scène'));
    await tester.tap(find.text('Commencer la scène'));
    await tester.pumpAndSettle();
    expect(find.text('Suite'), findsOneWidget);
    expect(find.text(scene.spoken.first.ba), findsOneWidget);
  });

  group('Voix de référence', () {
    test('la clé audio est l’empreinte FNV-1a du texte, comme dans le catalogue', () {
      expect(apFnv1a64(''), 'cbf29ce484222325');
      expect(apFnv1a64('a'), 'af63dc4c8601ec8c');
      expect(apAudioKey('nim'), 'ap:2146bb19257dc85f');
      expect(apAudioKey('  Ka   kookari ! '), 'ap:362cb77296546808');
      expect(apAudioKey('gúra'), 'ap:389e7ae43a20f162');
      expect(apAudioKey('Bɛɛ ka weru.'), 'ap:894e0eeef1a406e6');
    });

    test('le catalogue couvre les mots, exemples et répliques affichés', () {
      final catalog = jsonDecode(
        File('tool/audio_catalog/apprendre_audio_catalog.json').readAsStringSync(),
      ) as Map<String, dynamic>;
      final keys = {for (final item in catalog['items'] as List) (item as Map)['key'] as String};
      final content = _loadContent();
      for (final card in content.cards.values) {
        expect(keys, contains(apAudioKey(card.ba)), reason: card.ba);
        if (card.hasExample) {
          expect(keys, contains(apAudioKey(card.exampleBa!)), reason: card.exampleBa);
        }
      }
      for (final scene in _loadScenes().scenes) {
        for (final line in scene.spoken) {
          expect(keys, contains(apAudioKey(line.ba)), reason: line.ba);
        }
      }
    });

    List<double> synth(double f0Start, double f0End, double seconds, {double noise = 0.002, int seed = 1}) {
      final rnd = math.Random(seed);
      final out = <double>[];
      for (var i = 0; i < 4000; i++) {
        out.add(noise * (rnd.nextDouble() * 2 - 1));
      }
      final n = (seconds * 16000).round();
      var phase = 0.0;
      for (var i = 0; i < n; i++) {
        final t = i / n;
        final f0 = f0Start * math.pow(f0End / f0Start, t);
        phase += 2 * math.pi * f0 / 16000;
        final env = math.sqrt(math.sin(math.pi * t));
        var v = 0.0;
        for (var h = 1; h < 25; h++) {
          final fh = h * f0;
          if (fh > 7800) {
            break;
          }
          final gain = 1 / (1 + math.pow((fh - 700) / 120, 2)) + 1 / (1 + math.pow((fh - 1200) / 120, 2)) + 0.05;
          v += gain * math.sin(h * phase) / h;
        }
        out.add(0.2 * env * v + noise * (rnd.nextDouble() * 2 - 1));
      }
      for (var i = 0; i < 4000; i++) {
        out.add(noise * (rnd.nextDouble() * 2 - 1));
      }
      return out;
    }

    ApPcm pcm(List<double> samples) => apDecodeWav(apEncodeWav(samples))!;

    test('la mélodie identique est reconnue, la mélodie inversée non', () {
      const settings = ApCompareSettings();
      final reference = pcm(synth(140, 210, 0.6));
      final sameHigher = apCompareVoices(reference, pcm(synth(230, 345, 0.7, seed: 3)), settings)!;
      final inverted = apCompareVoices(reference, pcm(synth(210, 140, 0.6, seed: 4)), settings)!;
      expect(sameHigher.melody, isNotNull);
      expect(sameHigher.melody!, greaterThan(75));
      expect(inverted.melody!, lessThan(40));
      expect(sameHigher.total, greaterThan(inverted.total));
      expect(inverted.advice.join(' '), contains('monter'));
      expect(sameHigher.referenceContour.length, sameHigher.learnerContour.length);
    });

    test('les paramètres de comparaison gardent le statut de calibrage', () {
      const raw = {
        'very_close': 82,
        'close': 64,
        'mfcc_good': 4.5,
        'mfcc_bad': 13.5,
        'calibrated': true,
      };
      final settings = ApCompareSettings.fromJson(raw);
      expect(settings.calibrated, isTrue);
      expect(settings.toJson()['calibrated'], isTrue);
      expect(settings.veryClose, 82);
    });

    test('le contrôle qualité refuse une prise silencieuse', () {
      final silent = pcm(List<double>.generate(16000, (i) => 0.0005 * math.sin(i / 3)));
      final quality = apMeasureTake(silent, expectedSyllables: 2);
      expect(quality.acceptable, isFalse);
      final good = apMeasureTake(pcm(synth(140, 210, 0.6)), expectedSyllables: 2);
      expect(good.problems, isNot(contains(startsWith('Niveau trop faible'))));
    });
  });
}
