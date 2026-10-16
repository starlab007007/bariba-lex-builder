/// What DUNYA says, in French and in Baatɔnum.
///
/// Rule: a Baatɔnum line is only used when it comes from FITILA's validated
/// content (Apprendre / dictionary). Missing lines stay `null` and DUNYA then
/// speaks French. The pedagogical team completes this table; DUNYA never
/// invents Baatɔnum sentences.
library;

enum DunyaReplyLanguage { french, bariba, both }

extension DunyaReplyLanguageLabel on DunyaReplyLanguage {
  String get storageKey => switch (this) {
        DunyaReplyLanguage.french => 'fr',
        DunyaReplyLanguage.bariba => 'bba',
        DunyaReplyLanguage.both => 'both',
      };

  static DunyaReplyLanguage fromKey(String? key) => switch (key) {
        'bba' => DunyaReplyLanguage.bariba,
        'both' => DunyaReplyLanguage.both,
        _ => DunyaReplyLanguage.french,
      };
}

class DunyaPhrase {
  const DunyaPhrase(this.fr, [this.ba]);

  final String fr;

  /// Validated Baatɔnum, or null when the team has not provided one yet.
  final String? ba;
}

class DunyaPhrases {
  DunyaPhrases._();

  // Source: FITILA Apprendre v2 ("A kua" = Merci).
  static const thanks = DunyaPhrase('Merci.', 'A kua.');

  // Source: FITILA Apprendre v2 ("N kua weru" = Au revoir).
  static const goodbye = DunyaPhrase('Au revoir.', 'N kua weru.');

  // Source: FITILA Apprendre v2 ("Bɛɛ ka weru" = Bienvenue à vous qui revenez).
  static const welcomeBack = DunyaPhrase('Bon retour parmi nous.', 'Bɛɛ ka weru.');

  static const greeting = DunyaPhrase('Bonjour, je suis Dunya. Je vous écoute.');
  static const help = DunyaPhrase(
    'Je peux traduire un mot entre le français et le baatɔnum, retenir une information, '
    'poser un rappel dans votre téléphone, faire un calcul, ou chercher dans les savoirs FITILA. '
    'Appuyez sur le micro et parlez.',
  );
  static const notUnderstood = DunyaPhrase(
    'Je n’ai pas bien entendu. Pouvez-vous répéter, un peu plus près du téléphone ?',
  );
  static const notFound = DunyaPhrase(
    'Je n’ai pas trouvé de réponse sûre dans les savoirs du téléphone. Je préfère ne pas inventer.',
  );
  static const noted = DunyaPhrase('C’est noté. Je m’en souviendrai.');
  static const nothingNoted = DunyaPhrase('Je n’ai encore rien retenu pour vous.');
  static const confirmAsk = DunyaPhrase('Vous confirmez ? Dites oui ou non.');
  static const cancelled = DunyaPhrase('D’accord, j’annule.');
  static const actionDone = DunyaPhrase('C’est fait.');
  static const actionFailed = DunyaPhrase(
    'Je n’ai pas pu le faire : ce téléphone n’a pas d’application horloge compatible.',
  );
}
