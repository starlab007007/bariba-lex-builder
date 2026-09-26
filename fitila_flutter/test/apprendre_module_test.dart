import 'dart:convert';
import 'dart:io';

import 'package:fitila_native/apprendre/apprendre_hub.dart';
import 'package:fitila_native/apprendre/apprendre_models.dart';
import 'package:fitila_native/apprendre/apprendre_store.dart';
import 'package:fitila_native/apprendre/apprendre_tasks.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

ApprendreContent _loadContent() {
  final raw = File(ApprendreContent.assetPath).readAsStringSync();
  return ApprendreContent.fromJson(jsonDecode(raw) as Map<String, dynamic>);
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
}
