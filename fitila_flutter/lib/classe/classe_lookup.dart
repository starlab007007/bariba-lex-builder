import '../core/web_parity_models.dart';
import 'classe_content.dart';
import 'classe_store.dart';

/// Retrouve le libellé lisible d'une réponse (module, leçon, question) à partir du contenu.
/// Utilisé par « Mes corrections » (élève) et par l'écran de correction (enseignant).
({String where, String question}) describeAnswer({
  required String level,
  required String module,
  required String lessonId,
  required String sectionKey,
  required int questionIdx,
  required ClasseContent content,
  required List<WebClasseLesson> lessons,
}) {
  final n = questionIdx + 1;
  ({String where, String question}) fallback(String w) => (where: w, question: 'Question $n');
  switch (module) {
    case 'lesson':
      final l = lessons.where((e) => e.level == level && '${e.id}' == lessonId).firstOrNull;
      if (l == null) return fallback('$level · Leçon $lessonId');
      final qs = switch (sectionKey) {
        'observe' => l.observe,
        'ecoute' => l.ecoute,
        'reagis' => l.reagis,
        'retiens' => l.retiens,
        _ => const <String>[],
      };
      final tab = const {'observe': 'Mɛɛrio', 'ecoute': 'Faagi', 'reagis': 'Geruo', 'retiens': 'Weenɛ'}[sectionKey] ?? sectionKey;
      return (where: '$level · Leçon $lessonId — ${l.title} · $tab', question: questionIdx < qs.length ? qs[questionIdx] : 'Question $n');
    case 'evaluation':
      final e = (content.evaluations[level] ?? const []).where((e) => '${e.id}' == lessonId).firstOrNull;
      final si = int.tryParse(sectionKey);
      if (e == null || si == null || si >= e.sections.length) return fallback('$level · Évaluation $lessonId');
      final qs = e.sections[si].value;
      return (where: '$level · ${e.title} · ${e.sections[si].key}', question: questionIdx < qs.length ? qs[questionIdx] : 'Question $n');
    case 'calcul':
      final l = (content.calcul[level] ?? const []).where((e) => '${e.id}' == lessonId).firstOrNull;
      if (l == null) return fallback('$level · Calcul $lessonId');
      final sec = l.sections.where((s) => s.key.trim().split('-').first.trim() == sectionKey).firstOrNull;
      return (where: '$level · Calcul — ${l.title}', question: sec != null && questionIdx < sec.value.length ? sec.value[questionIdx] : 'Question $n');
    case 'textprod':
      final t = content.textProd.where((e) => e.id == lessonId).firstOrNull;
      final f = t?.structure.where((x) => x.key == sectionKey).firstOrNull;
      return (where: 'N2 · Production — ${t?.titleFr ?? lessonId}', question: f?.labelFr ?? f?.label ?? 'Champ $n');
    case 'gestion':
      final g = content.gestion.where((e) => e.id == lessonId).firstOrNull;
      if (g == null) return fallback('N2 · Gestion $lessonId');
      if (sectionKey == 'qa') {
        return (where: 'N2 · Gestion — ${g.titleFr}', question: questionIdx < g.questions.length ? g.questions[questionIdx].fr : 'Question $n');
      }
      return (where: 'N2 · Gestion — ${g.titleFr}', question: 'Formulaire : ${g.titleFr}');
    default:
      return fallback('$level · $module $lessonId');
  }
}

/// Libellé court d'un module.
String moduleLabel(String module) => switch (module) {
  'lesson' => 'Leçons',
  'evaluation' => 'Évaluations',
  'calcul' => 'Calcul',
  'grammaire' => 'Grammaire',
  'textprod' => 'Production de textes',
  'gestion' => 'Gestion',
  _ => module,
};

/// Moyenne /20 des réponses notées.
double? averageGrade(Iterable<StudentAnswer> answers) {
  final graded = answers.where((a) => a.teacherGrade != null).toList();
  if (graded.isEmpty) return null;
  return graded.fold<double>(0, (s, a) => s + a.teacherGrade!) / graded.length;
}
