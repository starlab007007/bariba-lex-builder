import 'dart:async';

import 'package:flutter/foundation.dart';

import 'classe_audio.dart';
import 'classe_store.dart';

/// État partagé de la Classe : accès données, audio, contenu, progression par niveau
/// (enregistrée avec un léger différé) et brouillons de saisie conservés entre les écrans.
class ClasseSession extends ChangeNotifier {
  ClasseSession({required this.store, ClasseAudio? audio, this.saveDelay = const Duration(milliseconds: 900)}) : audio = audio ?? ClasseAudio.instance;

  final ClasseStore store;
  final ClasseAudio audio;
  final Duration saveDelay;
  final Map<String, String> drafts = {};

  final Map<String, ClasseProgress> _progress = {};
  final Map<String, Timer> _timers = {};
  final Set<String> _loading = {};
  String? syncError;

  ClasseProgress progressOf(String level) => _progress[level] ?? const ClasseProgress();

  /// Charge la progression d'un niveau (une fois). Une erreur réseau n'empêche pas l'usage hors ligne.
  Future<void> loadProgress(String level) async {
    if (_progress.containsKey(level) || !_loading.add(level)) return;
    try {
      _progress[level] = await store.loadProgress(level);
      syncError = null;
    } catch (_) {
      _progress[level] = const ClasseProgress();
      syncError = 'Progression non synchronisée (hors connexion ?).';
    } finally {
      _loading.remove(level);
      notifyListeners();
    }
  }

  void update(String level, ClasseProgress Function(ClasseProgress) change) {
    _progress[level] = change(progressOf(level));
    notifyListeners();
    _timers[level]?.cancel();
    _timers[level] = Timer(saveDelay, () => flush(level));
  }

  Future<void> flush(String level) async {
    _timers.remove(level)?.cancel();
    try {
      await store.saveProgress(level, progressOf(level));
      syncError = null;
    } catch (_) {
      syncError = 'Progression non synchronisée (hors connexion ?).';
      notifyListeners();
    }
  }

  void markTab(String level, int lessonId, String tab, List<String> activeTabs) => update(level, (p) => p.withTabDone(lessonId, tab, activeTabs));

  void completeLesson(String level, int lessonId) => update(level, (p) => p.copyWith(completedLessons: {...p.completedLessons, lessonId}, lastLessonId: lessonId));

  @override
  void dispose() {
    for (final t in _timers.values) {
      t.cancel();
    }
    super.dispose();
  }
}
