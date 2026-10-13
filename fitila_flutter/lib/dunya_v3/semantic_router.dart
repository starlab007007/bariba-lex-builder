/// Shared DUNYA V3 routing policy for text and voice, French and Baatonum.
enum DunyaLanguage { french, baatonum }
enum DunyaInputMode { text, voice }
enum DunyaRoute { fast, knowledge, reasoning, action }

class DunyaSemanticRequest {
  const DunyaSemanticRequest({
    required this.original,
    required this.language,
    required this.mode,
    required this.route,
    required this.requiresConfirmation,
  });
  final String original;
  final DunyaLanguage language;
  final DunyaInputMode mode;
  final DunyaRoute route;
  final bool requiresConfirmation;
}

DunyaSemanticRequest routeDunyaInput(
  String input,
  DunyaLanguage language,
  DunyaInputMode mode,
) {
  final normalized = input.trim().toLowerCase().replaceAll(RegExp(r'\s+'), ' ');
  // Bariba must not be classified using French lexical heuristics.
  if (language == DunyaLanguage.baatonum) {
    return DunyaSemanticRequest(
      original: input, language: language, mode: mode,
      route: DunyaRoute.reasoning, requiresConfirmation: false,
    );
  }
  final greeting = RegExp(r'^(bonjour|bonsoir|salut|coucou|merci|au revoir)[.!? ]*$')
      .hasMatch(normalized);
  final action = RegExp(r'\b(supprime|efface|envoie|publie|modifie|achète|paie)\b')
      .hasMatch(normalized);
  final knowledge = RegExp(r'\b(document|dictionnaire|apprendre|source|cours)\b')
      .hasMatch(normalized) || normalized.contains('que signifie');
  final route = action ? DunyaRoute.action
      : greeting ? DunyaRoute.fast
      : knowledge ? DunyaRoute.knowledge : DunyaRoute.reasoning;
  return DunyaSemanticRequest(
    original: input, language: language, mode: mode,
    route: route, requiresConfirmation: action,
  );
}
