/// Logique hybride partagée de Tem IA (assistant du Code Foncier Baatɔnum),
/// utilisée à la fois par l'écran texte ([TemIaScreen]) et l'écran vocal
/// ([TemIaVoicePage]) de `main.dart` / `tem_ia_voice_page.dart`.
///
/// EN LIGNE : un vrai raisonnement conversationnel (accueil, compréhension,
/// citation des articles, relance), strictement borné au contenu du Code
/// foncier retrouvé par le serveur — jamais de connaissance générale
/// (`supabase/functions/fitila-tem-ia-chat`).
///
/// HORS LIGNE (dès que le réseau ou le serveur IA sont indisponibles) : la
/// recherche locale embarquée inchangée ([FoncierRag.answer]), simplement
/// mieux présentée — jamais de reformulation ni de traduction du contenu
/// légal lui-même, qui reste exactement celui du corpus.
library;

import 'foncier_rag.dart';

/// Un tour de conversation minimal transmis à Tem IA en ligne pour qu'elle
/// comprenne les questions de suivi sans que tout soit répété.
typedef TemIaTurn = ({String role, String text});

class TemIaOnlineAnswer {
  const TemIaOnlineAnswer({
    required this.text,
    required this.bariba,
    required this.sources,
  });

  /// Réponse en Baatɔnum si [bariba] est vrai ; sinon en français (repli
  /// quand la traduction côté serveur est indisponible).
  final String text;
  final bool bariba;
  final List<FoncierSource> sources;
}

/// Accueil chaleureux affiché/lu quand la personne ouvre la conversation
/// par une simple salutation, avant toute recherche — en français, comme
/// le reste de l'habillage de cet écran (titres, boutons, sources).
const temIaGreetingFr =
    "Bonjour, je suis Tem IA, l'assistant du Code foncier bariba. Je peux "
    "vous aider pour toute question sur le titre foncier, le bornage, "
    "l'enregistrement, les litiges ou la succession foncière. Quelle est "
    "votre préoccupation ?";

/// Vrai si [message] n'est qu'une salutation ou une formule de politesse,
/// sans question de fond (jamais sur un message qui contient aussi une
/// vraie question, pour ne jamais escamoter une préoccupation réelle).
bool isTemIaGreetingOnly(String message) {
  final normalized = message
      .trim()
      .toLowerCase()
      .replaceAll(RegExp(r'[!?.,\s]+$'), '')
      .trim();
  if (normalized.isEmpty) return false;
  return RegExp(
    r'^(bonjour|bonsoir|salut|coucou|hello|slt|cc|'
    r'bonne\s+(soir[ée]e?|journ[ée]e?|nuit)|'
    r"merci(\s+beaucoup)?|au\s+revoir|bye)$",
  ).hasMatch(normalized);
}

/// Conversation sociale courte : ne déclenche jamais une recherche foncière.
/// Les réponses Baatɔnum doivent provenir d'un corpus linguistique validé ;
/// aucune formule juridique ou traduction improvisée n'est produite ici.
String? temIaSocialReply(String message, {bool firstTurn = false}) {
  final normalized = message.trim().toLowerCase()
      .replaceAll(RegExp(r'[!?.,\s]+$'), '').trim();
  if (normalized.isEmpty) return null;
  if (RegExp(r'^(merci( beaucoup)?|je vous remercie|thanks)$').hasMatch(normalized)) {
    return 'Je vous en prie. Souhaitez-vous une autre précision concernant votre situation foncière ?';
  }
  if (RegExp(r'^(au revoir|à bientôt|bye)$').hasMatch(normalized)) {
    return 'Au revoir. Vous pourrez reprendre vos questions foncières quand vous le souhaitez.';
  }
  if (RegExp(r'^(bonjour|bonsoir|salut|coucou|hello|slt|cc)$').hasMatch(normalized)) {
    return firstTurn
        ? temIaGreetingFr
        : 'Bonjour à nouveau. Quelle question foncière souhaitez-vous approfondir ?';
  }
  return null;
}

/// Reformule le rôle du corpus sans changer ni traduire ses citations.
String temIaNaturalLegalIntroduction(FoncierAnswer answer) {
  if (answer.isFallback || answer.sources.isEmpty) {
    return 'Je veux bien vous guider, mais je ne trouve pas encore une disposition assez précise pour répondre avec certitude.';
  }
  return 'Si je comprends bien, vous cherchez à connaître les règles foncières applicables à votre situation. Voici les dispositions que j’ai retrouvées ; nous pouvons ensuite préciser votre cas.';
}

/// Tente le raisonnement en ligne (LLM strictement borné aux articles du
/// Code foncier retrouvés par le même moteur de recherche que le mode
/// hors ligne). Retourne `null` sur le moindre souci (pas de réseau,
/// serveur indisponible, IA non configurée, délai dépassé) — l'appelant
/// doit alors retomber sur [FoncierRag.answer] (moteur local inchangé).
Future<TemIaOnlineAnswer?> tryTemIaOnline(
  String question, {
  List<TemIaTurn> history = const [],
  Duration timeout = const Duration(seconds: 15),
}) async {
  // TEM IA is extractive: cite the bundled Code foncier verbatim.
  // The online endpoint is local_only, so never wait on a known 503.
  return null;
}

/// Présentation « texte » d'une réponse hors ligne (recherche locale
/// inchangée) : cite le ou les articles, encadre le contenu Baatɔnum brut
/// d'une phrase française et relance par une question de suivi — jamais
/// de reformulation ou de traduction du contenu légal lui-même.
String formatOfflineAnswerForText(FoncierAnswer answer) {
  final body = answer.answer.replaceAll(RegExp(r'\.\s+'), '.\n\n').trim();
  if (answer.isFallback || answer.sources.isEmpty) {
    return "$body\n\nPouvez-vous reformuler ou préciser votre préoccupation ?";
  }
  final lead = answer.sources.length == 1
      ? "Selon l'article ${answer.sources.first.number} du Code foncier :"
      : "D'après les articles ${answer.sources.map((s) => s.number).join(', ')} du Code foncier :";
  return "${temIaNaturalLegalIntroduction(answer)}\n\n$lead\n\n$body\n\nSouhaitez-vous que je vous aide à comprendre les démarches ou à préciser votre situation ?";
}
), '').trim();
  if (normalized.isEmpty) return null;
  if (RegExp(r'^(merci( beaucoup)?|je vous remercie|thanks)$').hasMatch(normalized)) {
    return 'Je vous en prie. Souhaitez-vous une autre précision concernant votre situation foncière ?';
  }
  if (RegExp(r'^(au revoir|à bientôt|bye)$').hasMatch(normalized)) {
    return 'Au revoir. Vous pourrez reprendre vos questions foncières quand vous le souhaitez.';
  }
  if (RegExp(r'^(bonjour|bonsoir|salut|coucou|hello|slt|cc)$').hasMatch(normalized)) {
    return firstTurn
        ? temIaGreetingFr
        : 'Bonjour à nouveau. Quelle question foncière souhaitez-vous approfondir ?';
  }
  return null;
}

/// Reformule le rôle du corpus sans changer ni traduire ses citations.
String temIaNaturalLegalIntroduction(FoncierAnswer answer) {
  if (answer.isFallback || answer.sources.isEmpty) {
    return 'Je veux bien vous guider, mais je ne trouve pas encore une disposition assez précise pour répondre avec certitude.';
  }
  return 'Si je comprends bien, vous cherchez à connaître les règles foncières applicables à votre situation. Voici les dispositions que j’ai retrouvées ; nous pouvons ensuite préciser votre cas.';
}

/// Tente le raisonnement en ligne (LLM strictement borné aux articles du
/// Code foncier retrouvés par le même moteur de recherche que le mode
/// hors ligne). Retourne `null` sur le moindre souci (pas de réseau,
/// serveur indisponible, IA non configurée, délai dépassé) — l'appelant
/// doit alors retomber sur [FoncierRag.answer] (moteur local inchangé).
Future<TemIaOnlineAnswer?> tryTemIaOnline(
  String question, {
  List<TemIaTurn> history = const [],
  Duration timeout = const Duration(seconds: 15),
}) async {
  // TEM IA is extractive: cite the bundled Code foncier verbatim.
  // The online endpoint is local_only, so never wait on a known 503.
  return null;
}

/// Présentation « texte » d'une réponse hors ligne (recherche locale
/// inchangée) : cite le ou les articles, encadre le contenu Baatɔnum brut
/// d'une phrase française et relance par une question de suivi — jamais
/// de reformulation ou de traduction du contenu légal lui-même.
String formatOfflineAnswerForText(FoncierAnswer answer) {
  final body = answer.answer.replaceAll(RegExp(r'\.\s+'), '.\n\n').trim();
  if (answer.isFallback || answer.sources.isEmpty) {
    return "$body\n\nPouvez-vous reformuler ou préciser votre préoccupation ?";
  }
  final lead = answer.sources.length == 1
      ? "Selon l'article ${answer.sources.first.number} du Code foncier :"
      : "D'après les articles ${answer.sources.map((s) => s.number).join(', ')} du Code foncier :";
  return "${temIaNaturalLegalIntroduction(answer)}\n\n$lead\n\n$body\n\nSouhaitez-vous que je vous aide à comprendre les démarches ou à préciser votre situation ?";
}
