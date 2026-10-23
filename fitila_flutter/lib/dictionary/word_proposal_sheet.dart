import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:supabase_flutter/supabase_flutter.dart' show AuthException;

import '../core/signature_theme.dart';
import '../keyboard/bariba_input.dart';
import '../ui/premium_widgets.dart';
import 'dictionary_experience.dart';

/// Ce que soumet le formulaire — signature neutre (aucune dépendance directe
/// à Supabase ici), injectée par l'appelant comme `speak`/`startVoice` sur
/// [DictionaryExperience]. Lève une erreur pour signaler l'échec (l'UI la
/// présente ; [AuthException] obtient un message dédié « connectez-vous »).
typedef WordProposalSubmit = Future<void> Function({
  required String word,
  required String definition,
  String? phonetic,
  required String partOfSpeech,
  String? exampleBariba,
  String? exampleFrancais,
});

const _partsOfSpeech = <(String value, String label)>[
  ('n', 'Nom'),
  ('v', 'Verbe'),
  ('adj', 'Adj.'),
  ('adv', 'Adv.'),
  ('autre', 'Autre'),
];

/// Ouvre la fiche « Proposer un mot » : identique en principe au dictionnaire
/// (mot, phonétique, catégorie, définition, exemples), avec une alerte
/// dynamique si un mot très proche existe déjà, une validation avant envoi,
/// puis un envoi réel dans `word_submissions` (file de relecture).
Future<void> showWordProposalSheet(
  BuildContext context, {
  required List<DictEntry> entries,
  required WordProposalSubmit onSubmit,
}) {
  return showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    backgroundColor: Colors.transparent,
    barrierColor: Colors.black38,
    builder: (sheetContext) => _WordProposalSheet(entries: entries, onSubmit: onSubmit),
  );
}

class _WordProposalSheet extends StatefulWidget {
  const _WordProposalSheet({required this.entries, required this.onSubmit});

  final List<DictEntry> entries;
  final WordProposalSubmit onSubmit;

  @override
  State<_WordProposalSheet> createState() => _WordProposalSheetState();
}

class _WordProposalSheetState extends State<_WordProposalSheet> {
  final _word = TextEditingController();
  final _phonetic = TextEditingController();
  final _definition = TextEditingController();
  final _exampleBariba = TextEditingController();
  final _exampleFrancais = TextEditingController();
  String _part = 'n';
  bool _touched = false;
  bool _sending = false;
  bool _sent = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _word.addListener(() => setState(() {}));
  }

  @override
  void dispose() {
    _word.dispose();
    _phonetic.dispose();
    _definition.dispose();
    _exampleBariba.dispose();
    _exampleFrancais.dispose();
    super.dispose();
  }

  bool get _wordValid => _word.text.trim().length >= 2;
  bool get _definitionValid => _definition.text.trim().length >= 3;
  bool get _valid => _wordValid && _definitionValid;

  /// Repère les entrées déjà connues très proches du mot saisi — avertissement
  /// non bloquant, pour éviter les doublons évidents sans empêcher l'envoi
  /// (une variante dialectale ou une nuance peut légitimement être proposée).
  List<DictEntry> get _possibleDuplicates {
    final q = foldDict(_word.text);
    if (q.length < 2) return const [];
    return widget.entries.where((e) => foldDict(e.word) == q).take(3).toList(growable: false);
  }

  Future<void> _submit() async {
    setState(() => _touched = true);
    if (!_valid || _sending) return;
    setState(() {
      _sending = true;
      _error = null;
    });
    try {
      await widget.onSubmit(
        word: _word.text,
        definition: _definition.text,
        phonetic: _phonetic.text,
        partOfSpeech: _part,
        exampleBariba: _exampleBariba.text,
        exampleFrancais: _exampleFrancais.text,
      );
      HapticFeedback.mediumImpact();
      if (!mounted) return;
      setState(() {
        _sending = false;
        _sent = true;
      });
      await Future<void>.delayed(const Duration(milliseconds: 1300));
      if (mounted) Navigator.of(context).pop();
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _sending = false;
        _error = e is AuthException
            ? 'Connectez-vous pour proposer un mot.'
            : 'Envoi impossible. Vérifiez votre connexion et réessayez.';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final bottomInset = MediaQuery.of(context).viewInsets.bottom;
    final dupes = _possibleDuplicates;
    return Padding(
      padding: EdgeInsets.only(bottom: bottomInset),
      child: DraggableScrollableSheet(
        expand: false,
        initialChildSize: 0.82,
        minChildSize: 0.5,
        maxChildSize: 0.96,
        builder: (context, scrollController) => Container(
          decoration: const BoxDecoration(
            color: SignatureTheme.surfaceAlt,
            borderRadius: BorderRadius.vertical(top: Radius.circular(SignatureTheme.radiusLarge)),
          ),
          child: _sent ? _successView() : _formView(scrollController, dupes),
        ),
      ),
    );
  }

  Widget _successView() => Center(
    child: Column(mainAxisSize: MainAxisSize.min, children: [
      TweenAnimationBuilder<double>(
        tween: Tween(begin: 0, end: 1),
        duration: const Duration(milliseconds: 420),
        curve: Curves.elasticOut,
        builder: (_, v, child) => Transform.scale(scale: v, child: child),
        child: Container(
          width: 76,
          height: 76,
          alignment: Alignment.center,
          decoration: const BoxDecoration(shape: BoxShape.circle, color: SignatureTheme.sageTint),
          child: const Icon(Icons.check_rounded, color: SignatureTheme.sage, size: 40),
        ),
      ),
      const SizedBox(height: 16),
      const Text('Mot envoyé !', style: TextStyle(fontSize: 19, fontWeight: FontWeight.w900, color: SignatureTheme.ink)),
      const SizedBox(height: 6),
      const Padding(
        padding: EdgeInsets.symmetric(horizontal: 32),
        child: Text(
          'Merci pour votre contribution. Il sera vérifié par l’équipe avant d’apparaître dans le dictionnaire.',
          textAlign: TextAlign.center,
          style: TextStyle(color: SignatureTheme.muted, height: 1.4),
        ),
      ),
    ]),
  );

  Widget _formView(ScrollController scrollController, List<DictEntry> dupes) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const Padding(
          padding: EdgeInsets.only(top: 10),
          child: Center(
            child: SizedBox(
              width: 40,
              height: 4,
              child: DecoratedBox(decoration: BoxDecoration(color: SignatureTheme.hairlineStrong, borderRadius: BorderRadius.all(Radius.circular(99)))),
            ),
          ),
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(20, 14, 10, 4),
          child: Row(children: [
            const IconBadge(Icons.add_circle_rounded, color: SignatureTheme.sage, background: SignatureTheme.sageTint),
            const SizedBox(width: 12),
            const Expanded(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text('Proposer un mot', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w900, color: SignatureTheme.ink)),
                Text('Enrichissez le dictionnaire Bàátɔ̀nú', style: TextStyle(fontSize: 12, color: SignatureTheme.muted)),
              ]),
            ),
            IconButton(onPressed: () => Navigator.of(context).pop(), icon: const Icon(Icons.close_rounded, color: SignatureTheme.muted)),
          ]),
        ),
        Expanded(
          child: ListView(
            key: const ValueKey('proposal-form-list'),
            controller: scrollController,
            padding: const EdgeInsets.fromLTRB(20, 4, 20, 20),
            children: [
              _label('Mot en Bàátɔ̀nú', required: true),
              BaribaTextField(
                key: const ValueKey('proposal-word'),
                controller: _word,
                decoration: _fieldDecoration('ex. dèmi', error: _touched && !_wordValid ? 'Entrez au moins 2 caractères.' : null),
              ),
              if (dupes.isNotEmpty) ...[
                const SizedBox(height: 8),
                _duplicateHint(dupes),
              ],
              const SizedBox(height: 14),
              _label('Prononciation (optionnel)'),
              TextField(key: const ValueKey('proposal-phonetic'), controller: _phonetic, decoration: _fieldDecoration('ex. [dèmi]')),
              const SizedBox(height: 14),
              _label('Catégorie grammaticale'),
              PremiumSegmented(
                labels: [for (final p in _partsOfSpeech) p.$2],
                selected: _partsOfSpeech.firstWhere((p) => p.$1 == _part).$2,
                onChanged: (label) => setState(() => _part = _partsOfSpeech.firstWhere((p) => p.$2 == label).$1),
              ),
              const SizedBox(height: 14),
              _label('Définition en français', required: true),
              TextField(
                key: const ValueKey('proposal-definition'),
                controller: _definition,
                minLines: 2,
                maxLines: 4,
                decoration: _fieldDecoration('Sens du mot en français', error: _touched && !_definitionValid ? 'La définition est obligatoire.' : null),
              ),
              const SizedBox(height: 14),
              _label('Exemple en Bàátɔ̀nú (optionnel)'),
              BaribaTextField(key: const ValueKey('proposal-example-bba'), controller: _exampleBariba, maxLines: 2, decoration: _fieldDecoration('Une phrase d’exemple')),
              const SizedBox(height: 14),
              _label('Exemple en français (optionnel)'),
              TextField(key: const ValueKey('proposal-example-fr'), controller: _exampleFrancais, maxLines: 2, decoration: _fieldDecoration('Traduction de l’exemple')),
              if (_error != null) ...[
                const SizedBox(height: 14),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(color: SignatureTheme.clayTint, borderRadius: BorderRadius.circular(14)),
                  child: Row(children: [
                    const Icon(Icons.error_outline_rounded, color: SignatureTheme.clay, size: 18),
                    const SizedBox(width: 8),
                    Expanded(child: Text(_error!, style: const TextStyle(color: SignatureTheme.clay, fontWeight: FontWeight.w700, fontSize: 13))),
                  ]),
                ),
              ],
              const SizedBox(height: 20),
              SizedBox(
                height: 54,
                child: FilledButton.icon(
                  style: FilledButton.styleFrom(
                    backgroundColor: _valid ? SignatureTheme.sage : SignatureTheme.hairlineStrong,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                  ),
                  onPressed: _sending ? null : _submit,
                  icon: _sending
                      ? const SizedBox.square(dimension: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                      : const Icon(Icons.send_rounded),
                  label: Text(_sending ? 'Envoi…' : 'Envoyer la proposition'),
                ),
              ),
              const SizedBox(height: 6),
              const Center(
                child: Text('Chaque mot est relu avant publication.', style: TextStyle(fontSize: 11.5, color: SignatureTheme.muted)),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _duplicateHint(List<DictEntry> dupes) => Container(
    padding: const EdgeInsets.all(10),
    decoration: BoxDecoration(color: SignatureTheme.goldTint, borderRadius: BorderRadius.circular(12)),
    child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
      const Icon(Icons.info_outline_rounded, color: SignatureTheme.goldDeep, size: 17),
      const SizedBox(width: 8),
      Expanded(
        child: Text(
          'Déjà dans le dictionnaire : ${dupes.map((e) => '« ${e.word} » (${e.definition})').join(', ')}. Vous pouvez quand même proposer une nuance ou une variante.',
          style: const TextStyle(color: SignatureTheme.goldDeep, fontSize: 12, height: 1.3, fontWeight: FontWeight.w600),
        ),
      ),
    ]),
  );

  Widget _label(String text, {bool required = false}) => Padding(
    padding: const EdgeInsets.only(bottom: 6),
    child: Text.rich(TextSpan(children: [
      TextSpan(text: text, style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w800, color: SignatureTheme.inkSoft)),
      if (required) const TextSpan(text: ' *', style: TextStyle(color: SignatureTheme.clay, fontWeight: FontWeight.w900)),
    ])),
  );

  InputDecoration _fieldDecoration(String hint, {String? error}) => InputDecoration(
    hintText: hint,
    errorText: error,
    filled: true,
    fillColor: SignatureTheme.surface,
    contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 13),
    border: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: const BorderSide(color: SignatureTheme.hairline)),
    enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: const BorderSide(color: SignatureTheme.hairline)),
    focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: const BorderSide(color: SignatureTheme.gold, width: 1.5)),
    errorBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: const BorderSide(color: SignatureTheme.clay)),
  );
}
