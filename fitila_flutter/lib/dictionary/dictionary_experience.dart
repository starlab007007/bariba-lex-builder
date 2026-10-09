import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../core/signature_theme.dart';
import '../keyboard/bariba_input.dart';
import '../ui/premium_widgets.dart';

/// Entrée du dictionnaire (modèle d'affichage, indépendant de la source).
class DictEntry {
  const DictEntry({required this.word, required this.definition, this.phonetic, this.partOfSpeech, this.exampleBariba, this.exampleFrench});

  final String word;
  final String definition;
  final String? phonetic;
  final String? partOfSpeech;
  final String? exampleBariba;
  final String? exampleFrench;

  String get key => '${word.toLowerCase()}|${definition.toLowerCase()}';

  String get partLabel => switch (partOfSpeech?.trim()) {
    'n' => 'nom',
    'v' => 'verbe',
    'adj' => 'adjectif',
    'adv' => 'adverbe',
    final v when v != null && v.isNotEmpty => v,
    _ => '',
  };
}

/// Retire ton, accents et casse pour comparer « Baatonu » à « Bàátɔ̀nú » (ɛ ɔ ŋ restent distincts).
String foldDict(String input) {
  const map = {
    'à': 'a', 'á': 'a', 'â': 'a', 'ä': 'a', 'ã': 'a', 'è': 'e', 'é': 'e', 'ê': 'e', 'ë': 'e', 'ẽ': 'e',
    'ì': 'i', 'í': 'i', 'î': 'i', 'ï': 'i', 'ĩ': 'i', 'ò': 'o', 'ó': 'o', 'ô': 'o', 'ö': 'o', 'õ': 'o',
    'ù': 'u', 'ú': 'u', 'û': 'u', 'ü': 'u', 'ũ': 'u', 'ǹ': 'n', 'ń': 'n', 'ñ': 'n', 'ç': 'c', 'œ': 'oe',
  };
  final b = StringBuffer();
  for (final r in input.toLowerCase().runes) {
    if (r >= 0x0300 && r <= 0x036F) continue;
    final ch = String.fromCharCode(r);
    b.write(map[ch] ?? ch);
  }
  return b.toString().trim();
}

/// Résultat classé : exact, préfixe, contient.
List<DictEntry> searchDict(List<DictEntry> all, String query, {required bool baToFr, int limit = 30}) {
  final q = foldDict(query);
  if (q.isEmpty) return const [];
  final exact = <DictEntry>[];
  final prefix = <DictEntry>[];
  final contains = <DictEntry>[];
  final other = <DictEntry>[];
  for (final e in all) {
    final primary = foldDict(baToFr ? e.word : e.definition);
    final secondary = foldDict(baToFr ? e.definition : e.word);
    if (primary == q) {
      exact.add(e);
    } else if (primary.startsWith(q)) {
      prefix.add(e);
    } else if (primary.contains(q)) {
      contains.add(e);
    } else if (q.length >= 3 && secondary.contains(q)) {
      other.add(e);
    }
    if (exact.length + prefix.length + contains.length >= limit * 3) break;
  }
  return [...exact, ...prefix, ...contains, ...other].take(limit).toList(growable: false);
}

/// Dictionnaire premium : recherche intelligente, mot du jour, favoris, récents, index alphabétique, fiche animée.
class DictionaryExperience extends StatefulWidget {
  const DictionaryExperience({
    super.key,
    required this.entries,
    this.speak,
    this.startVoice,
    this.stopVoice,
    this.onPropose,
    this.now,
  });

  final List<DictEntry> entries;
  final Future<void> Function(String text, bool bariba)? speak;
  final Future<void> Function()? startVoice;
  final Future<String> Function(bool baToFr)? stopVoice;
  final VoidCallback? onPropose;
  final DateTime? now;

  @override
  State<DictionaryExperience> createState() => _DictionaryExperienceState();
}

class _DictionaryExperienceState extends State<DictionaryExperience> {
  final _query = TextEditingController();
  bool _baToFr = true;
  String _mode = 'Clavier';
  bool _recording = false;
  bool _voiceBusy = false;
  DictEntry? _selected;
  String? _letter;
  List<String> _recent = [];
  Set<String> _favs = {};
  String? _speakingKey;
  Timer? _debounce;
  String _debounced = '';

  @override
  void initState() {
    super.initState();
    _query.addListener(_onQuery);
    _loadPrefs();
  }

  @override
  void dispose() {
    _debounce?.cancel();
    _query.dispose();
    super.dispose();
  }

  void _onQuery() {
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 110), () {
      if (mounted) setState(() => _debounced = _query.text);
    });
    if (_query.text.isEmpty && _debounced.isNotEmpty) setState(() => _debounced = '');
  }

  Future<void> _loadPrefs() async {
    try {
      final p = await SharedPreferences.getInstance();
      if (!mounted) return;
      setState(() {
        _recent = p.getStringList('dict_recent') ?? [];
        _favs = (p.getStringList('dict_favs') ?? []).toSet();
      });
    } catch (_) {
      /* stockage indisponible : les listes restent en mémoire */
    }
  }

  Future<void> _savePrefs() async {
    try {
      final p = await SharedPreferences.getInstance();
      await p.setStringList('dict_recent', _recent);
      await p.setStringList('dict_favs', _favs.toList());
    } catch (_) {}
  }

  void _open(DictEntry e) {
    FocusScope.of(context).unfocus();
    setState(() {
      _selected = e;
      _letter = null;
      _query.text = _baToFr ? e.word : e.definition;
      _debounced = '';
      _recent = [e.word, ..._recent.where((r) => r != e.word)].take(10).toList();
    });
    _query.selection = TextSelection.collapsed(offset: _query.text.length);
    _savePrefs();
  }

  void _openByWord(String word) {
    final e = widget.entries.where((x) => x.word == word).firstOrNull;
    if (e != null) _open(e);
  }

  void _toggleFav(DictEntry e) {
    HapticFeedback.selectionClick();
    setState(() => _favs.contains(e.key) ? _favs.remove(e.key) : _favs.add(e.key));
    _savePrefs();
  }

  void _toast(String m) {
    if (!mounted) return;
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(SnackBar(content: Text(m)));
  }

  Future<void> _speak(String text, bool bariba, String key) async {
    final s = widget.speak;
    if (s == null || _speakingKey != null) return;
    setState(() => _speakingKey = key);
    try {
      await s(text, bariba);
    } catch (e) {
      _toast(e is StateError ? e.message : 'Lecture audio indisponible.');
    } finally {
      if (mounted) setState(() => _speakingKey = null);
    }
  }

  Future<void> _toggleVoice() async {
    final start = widget.startVoice;
    final stop = widget.stopVoice;
    if (start == null || stop == null) {
      _toast('La recherche vocale n’est pas disponible.');
      return;
    }
    if (!_recording) {
      try {
        await start();
        if (mounted) setState(() => _recording = true);
      } catch (_) {
        _toast('Micro indisponible.');
      }
      return;
    }
    setState(() {
      _recording = false;
      _voiceBusy = true;
    });
    try {
      final t = await stop(_baToFr);
      if (!mounted) return;
      setState(() {
        _query.text = t;
        _debounced = t;
        _mode = 'Clavier';
        _selected = null;
      });
      _query.selection = TextSelection.collapsed(offset: t.length);
    } catch (e) {
      _toast(e is StateError ? e.message : 'Recherche vocale indisponible.');
    } finally {
      if (mounted) setState(() => _voiceBusy = false);
    }
  }

  DictEntry? _wordOfTheDay() {
    final pool = widget.entries.where((e) => (e.exampleBariba ?? '').isNotEmpty && e.definition.length < 80).toList();
    final list = pool.isNotEmpty ? pool : widget.entries;
    if (list.isEmpty) return null;
    final d = widget.now ?? DateTime.now();
    final day = d.difference(DateTime(d.year)).inDays + d.year * 366;
    return list[day % list.length];
  }

  List<String> get _letters {
    final s = <String>{};
    for (final e in widget.entries) {
      final f = foldDict(e.word);
      if (f.isNotEmpty) s.add(f.characters.first);
    }
    final l = s.where((c) => RegExp(r'^[\p{L}]$', unicode: true).hasMatch(c)).toList()..sort();
    return l;
  }

  List<DictEntry> _byLetter(String l) {
    final r = widget.entries.where((e) => foldDict(e.word).startsWith(l)).toList()..sort((a, b) => foldDict(a.word).compareTo(foldDict(b.word)));
    return r.take(80).toList(growable: false);
  }

  // ------------------------------------------------------------- UI

  @override
  Widget build(BuildContext context) {
    final q = _debounced.trim();
    final results = _selected == null && q.isNotEmpty ? searchDict(widget.entries, q, baToFr: _baToFr) : const <DictEntry>[];
    return ListView(
      keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
      padding: const EdgeInsets.only(bottom: 28),
      children: [
        _searchBar(),
        const SizedBox(height: 10),
        _modeStrip(),
        const SizedBox(height: 12),
        if (_mode == 'Vocal') _voicePanel(),
        if (_selected != null)
          AnimatedSwitcher(duration: const Duration(milliseconds: 280), child: _detail(_selected!, key: ValueKey(_selected!.key)))
        else if (q.isNotEmpty)
          _resultList(results, q)
        else if (_letter != null)
          _letterList(_letter!)
        else
          _home(),
        const SizedBox(height: 16),
        if (widget.onPropose != null)
          SizedBox(
            height: 52,
            child: FilledButton.icon(
              style: FilledButton.styleFrom(backgroundColor: SignatureTheme.sage, foregroundColor: Colors.white),
              onPressed: widget.onPropose,
              icon: const Icon(Icons.add_rounded),
              label: const Text('Proposer un mot'),
            ),
          ),
      ],
    );
  }

  Widget _searchBar() {
    return Container(
      padding: const EdgeInsets.fromLTRB(6, 6, 6, 6),
      decoration: BoxDecoration(
        color: SignatureTheme.surface,
        borderRadius: BorderRadius.circular(26),
        border: Border.all(color: SignatureTheme.hairline),
        boxShadow: [BoxShadow(color: SignatureTheme.ink.withValues(alpha: .06), blurRadius: 24, offset: const Offset(0, 12), spreadRadius: -10)],
      ),
      child: Column(
        children: [
          BaribaTextField(
            controller: _query,
            onSubmitted: (_) {
              final r = searchDict(widget.entries, _query.text, baToFr: _baToFr);
              if (r.isNotEmpty) _open(r.first);
            },
            decoration: InputDecoration(
              hintText: _baToFr ? 'Cherchez un mot en Bàátɔ̀nú…' : 'Cherchez un mot en français…',
              prefixIcon: const Icon(Icons.search_rounded, color: SignatureTheme.goldDeep),
              border: InputBorder.none,
              enabledBorder: InputBorder.none,
              focusedBorder: InputBorder.none,
              filled: false,
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(6, 0, 6, 2),
            child: Row(children: [
              Expanded(
                child: FittedBox(
                  alignment: Alignment.centerLeft,
                  fit: BoxFit.scaleDown,
                  child: Row(children: [
                    _dirChip(true),
                    IconButton(
                      key: const ValueKey('dict-swap'),
                      tooltip: 'Inverser le sens',
                      visualDensity: VisualDensity.compact,
                      onPressed: () => setState(() {
                        _baToFr = !_baToFr;
                        _selected = null;
                      }),
                      icon: const Icon(Icons.swap_horiz_rounded, color: SignatureTheme.goldDeep),
                    ),
                    _dirChip(false),
                  ]),
                ),
              ),
              if (_query.text.isNotEmpty)
                IconButton(
                  tooltip: 'Effacer',
                  visualDensity: VisualDensity.compact,
                  onPressed: () => setState(() {
                    _query.clear();
                    _selected = null;
                    _debounced = '';
                  }),
                  icon: const Icon(Icons.close_rounded, color: SignatureTheme.muted),
                ),
            ]),
          ),
        ],
      ),
    );
  }

  Widget _dirChip(bool bariba) {
    final active = _baToFr == bariba;
    return AnimatedContainer(
      duration: const Duration(milliseconds: 180),
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: active ? SignatureTheme.goldTint : Colors.transparent,
        borderRadius: BorderRadius.circular(99),
        border: Border.all(color: active ? SignatureTheme.gold : SignatureTheme.hairline),
      ),
      child: Text(bariba ? '🇧🇯 Bàátɔ̀nú' : '🇫🇷 Français', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: active ? SignatureTheme.goldDeep : SignatureTheme.muted)),
    );
  }

  Widget _modeStrip() => Row(children: [
    Expanded(child: _modeBtn('Clavier', Icons.keyboard_alt_rounded)),
    const SizedBox(width: 8),
    Expanded(child: _modeBtn('Vocal', Icons.mic_rounded)),
  ]);

  Widget _modeBtn(String label, IconData icon) {
    final on = _mode == label;
    return InkWell(
      borderRadius: BorderRadius.circular(16),
      onTap: () => setState(() => _mode = label),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        padding: const EdgeInsets.symmetric(vertical: 12),
        decoration: BoxDecoration(
          color: on ? SignatureTheme.surface : SignatureTheme.surface.withValues(alpha: .6),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: on ? SignatureTheme.gold : SignatureTheme.hairline, width: on ? 1.6 : 1),
        ),
        child: Row(mainAxisAlignment: MainAxisAlignment.center, children: [
          Icon(icon, size: 19, color: on ? SignatureTheme.goldDeep : SignatureTheme.muted),
          const SizedBox(width: 7),
          Text(label, style: TextStyle(fontWeight: on ? FontWeight.w800 : FontWeight.w600, color: on ? SignatureTheme.ink : SignatureTheme.muted)),
        ]),
      ),
    );
  }

  Widget _voicePanel() => Padding(
    padding: const EdgeInsets.only(bottom: 12),
    child: PremiumCard(
      child: Column(children: [
        AnimatedContainer(
          duration: const Duration(milliseconds: 220),
          width: _recording ? 84 : 72,
          height: _recording ? 84 : 72,
          decoration: BoxDecoration(shape: BoxShape.circle, color: _recording ? SignatureTheme.clayTint : SignatureTheme.goldTint),
          child: Icon(_recording ? Icons.graphic_eq_rounded : Icons.mic_rounded, size: 36, color: _recording ? SignatureTheme.clay : SignatureTheme.goldDeep),
        ),
        const SizedBox(height: 10),
        const Text('Recherche vocale', style: TextStyle(fontSize: 17, fontWeight: FontWeight.w900)),
        const SizedBox(height: 4),
        Text(_recording ? 'Je vous écoute… appuyez pour terminer.' : 'Prononcez un mot en ${_baToFr ? 'Bàátɔ̀nú' : 'français'}.', textAlign: TextAlign.center, style: const TextStyle(color: SignatureTheme.muted)),
        const SizedBox(height: 12),
        FilledButton.icon(
          onPressed: _voiceBusy ? null : _toggleVoice,
          icon: _voiceBusy ? const SizedBox.square(dimension: 16, child: CircularProgressIndicator(strokeWidth: 2)) : Icon(_recording ? Icons.stop_circle_rounded : Icons.mic_rounded),
          label: Text(_recording ? 'Terminer la recherche' : 'Parler maintenant'),
        ),
      ]),
    ),
  );

  Widget _home() {
    final wod = _wordOfTheDay();
    final favs = widget.entries.where((e) => _favs.contains(e.key)).take(12).toList();
    final letters = _letters;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (wod != null) Reveal(index: 0, child: _wordOfDay(wod)),
        if (_recent.isNotEmpty) ...[
          const SectionLabel('Recherches récentes'),
          Wrap(spacing: 8, runSpacing: 8, children: [
            for (final r in _recent.take(8)) ActionChip(label: Text(r), avatar: const Icon(Icons.history_rounded, size: 16), onPressed: () => _openByWord(r)),
          ]),
        ],
        if (favs.isNotEmpty) ...[
          const SectionLabel('Mes favoris'),
          Wrap(spacing: 8, runSpacing: 8, children: [
            for (final f in favs) ActionChip(label: Text(f.word), avatar: const Icon(Icons.star_rounded, size: 16, color: SignatureTheme.gold), onPressed: () => _open(f)),
          ]),
        ],
        if (letters.isNotEmpty) ...[
          const SectionLabel('Parcourir par lettre'),
          Wrap(spacing: 6, runSpacing: 6, children: [
            for (final l in letters)
              InkWell(
                borderRadius: BorderRadius.circular(12),
                onTap: () => setState(() => _letter = l),
                child: Container(
                  width: 40,
                  height: 40,
                  alignment: Alignment.center,
                  decoration: BoxDecoration(color: SignatureTheme.surface, borderRadius: BorderRadius.circular(12), border: Border.all(color: SignatureTheme.hairline)),
                  child: Text(l.toUpperCase(), style: const TextStyle(fontWeight: FontWeight.w900, color: SignatureTheme.goldDeep)),
                ),
              ),
          ]),
        ],
      ],
    );
  }

  Widget _wordOfDay(DictEntry e) => InkWell(
    borderRadius: BorderRadius.circular(26),
    onTap: () => _open(e),
    child: Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(26),
        gradient: const LinearGradient(begin: Alignment.topLeft, end: Alignment.bottomRight, colors: [Color(0xFF3A3448), Color(0xFF241F2E)]),
        boxShadow: [BoxShadow(color: SignatureTheme.ink.withValues(alpha: .25), blurRadius: 26, offset: const Offset(0, 14), spreadRadius: -12)],
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          const Icon(Icons.auto_awesome_rounded, size: 16, color: SignatureTheme.gold),
          const SizedBox(width: 6),
          const Text('MOT DU JOUR', style: TextStyle(color: SignatureTheme.gold, fontSize: 11, letterSpacing: 1, fontWeight: FontWeight.w900)),
          const Spacer(),
          if (widget.speak != null)
            IconButton(
              tooltip: 'Écouter',
              visualDensity: VisualDensity.compact,
              onPressed: () => _speak(e.word, true, 'wod'),
              icon: _speakingKey == 'wod' ? const SizedBox.square(dimension: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)) : const Icon(Icons.volume_up_rounded, color: Colors.white),
            ),
        ]),
        const SizedBox(height: 8),
        Text(e.word, style: const TextStyle(color: Colors.white, fontFamily: 'serif', fontSize: 32, fontWeight: FontWeight.w700)),
        if ((e.phonetic ?? '').isNotEmpty) Text('[${e.phonetic}]', style: const TextStyle(color: Color(0xCCFFFFFF), fontSize: 15)),
        const SizedBox(height: 8),
        Text(e.definition, maxLines: 3, overflow: TextOverflow.ellipsis, style: const TextStyle(color: Colors.white, fontSize: 15.5, height: 1.4)),
        if ((e.exampleBariba ?? '').isNotEmpty) ...[
          const SizedBox(height: 10),
          Text('« ${e.exampleBariba} »', maxLines: 2, overflow: TextOverflow.ellipsis, style: const TextStyle(color: Color(0xB3FFFFFF), fontStyle: FontStyle.italic, height: 1.35)),
        ],
      ]),
    ),
  );

  Widget _letterList(String l) {
    final items = _byLetter(l);
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Row(children: [
        IconButton(tooltip: 'Retour', onPressed: () => setState(() => _letter = null), icon: const Icon(Icons.arrow_back_rounded)),
        Text('Lettre ${l.toUpperCase()}', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w900)),
      ]),
      for (final e in items) _resultTile(e, ''),
    ]);
  }

  Widget _resultList(List<DictEntry> results, String q) {
    if (results.isEmpty) {
      return PremiumCard(
        child: Column(children: [
          const Icon(Icons.search_off_rounded, size: 36, color: SignatureTheme.muted),
          const SizedBox(height: 8),
          Text('Aucun résultat pour « $q »', textAlign: TextAlign.center, style: const TextStyle(fontWeight: FontWeight.w800)),
          const SizedBox(height: 4),
          const Text('Essayez sans accents, avec le sens inverse, ou proposez ce mot à la communauté.', textAlign: TextAlign.center, style: TextStyle(color: SignatureTheme.muted, height: 1.4)),
          if (widget.onPropose != null) TextButton.icon(onPressed: widget.onPropose, icon: const Icon(Icons.add_rounded), label: const Text('Proposer ce mot')),
        ]),
      );
    }
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Padding(padding: const EdgeInsets.only(left: 4, bottom: 6), child: Text('${results.length} résultat${results.length > 1 ? 's' : ''}', style: const TextStyle(color: SignatureTheme.muted, fontSize: 12, fontWeight: FontWeight.w700))),
      for (var i = 0; i < results.length; i++) Reveal(index: i, dy: 8, child: _resultTile(results[i], q)),
    ]);
  }

  Widget _resultTile(DictEntry e, String q) {
    final primary = _baToFr ? e.word : e.definition;
    final secondary = _baToFr ? e.definition : e.word;
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Material(
        color: SignatureTheme.surface,
        borderRadius: BorderRadius.circular(18),
        child: InkWell(
          borderRadius: BorderRadius.circular(18),
          onTap: () => _open(e),
          child: Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(borderRadius: BorderRadius.circular(18), border: Border.all(color: SignatureTheme.hairline)),
            child: Row(children: [
              Expanded(
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  _highlight(primary, q),
                  const SizedBox(height: 2),
                  Text(secondary, maxLines: 2, overflow: TextOverflow.ellipsis, style: const TextStyle(color: SignatureTheme.muted, fontSize: 13, height: 1.3)),
                ]),
              ),
              if (_favs.contains(e.key)) const Icon(Icons.star_rounded, color: SignatureTheme.gold, size: 20),
              const Icon(Icons.chevron_right_rounded, color: SignatureTheme.muted),
            ]),
          ),
        ),
      ),
    );
  }

  Widget _highlight(String text, String q) {
    const base = TextStyle(fontSize: 17, fontWeight: FontWeight.w800, color: SignatureTheme.ink);
    final fq = foldDict(q);
    if (fq.isEmpty) return Text(text, style: base);
    final ft = foldDict(text);
    final i = ft.indexOf(fq);
    if (i < 0 || ft.length != text.toLowerCase().runes.where((r) => r < 0x0300 || r > 0x036F).length) return Text(text, style: base);
    final chars = text.characters.toList();
    // Approximation par graphèmes (fonctionne quand le repli conserve la longueur).
    if (chars.length != ft.characters.length) return Text(text, style: base);
    return Text.rich(TextSpan(style: base, children: [
      TextSpan(text: chars.sublist(0, i).join()),
      TextSpan(text: chars.sublist(i, i + fq.characters.length).join(), style: const TextStyle(color: SignatureTheme.goldDeep, backgroundColor: SignatureTheme.goldTint)),
      TextSpan(text: chars.sublist(i + fq.characters.length).join()),
    ]));
  }

  List<DictEntry> _related(DictEntry e) {
    final stem = foldDict(e.word);
    final first = foldDict(e.definition).split(RegExp(r'\W+')).where((w) => w.length > 3).firstOrNull;
    final out = <DictEntry>[];
    for (final x in widget.entries) {
      if (x.key == e.key) continue;
      final w = foldDict(x.word);
      final samePrefix = stem.length >= 3 && w.startsWith(stem.substring(0, 3));
      final sameMeaning = first != null && foldDict(x.definition).contains(first);
      if (samePrefix || sameMeaning) out.add(x);
      if (out.length >= 8) break;
    }
    return out;
  }

  Widget _detail(DictEntry e, {Key? key}) {
    final fav = _favs.contains(e.key);
    final part = e.partLabel;
    final related = _related(e);
    return Column(
      key: key,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Container(
          clipBehavior: Clip.antiAlias,
          decoration: BoxDecoration(
            color: SignatureTheme.surface,
            borderRadius: BorderRadius.circular(28),
            border: Border.all(color: SignatureTheme.hairline),
            boxShadow: [BoxShadow(color: SignatureTheme.ink.withValues(alpha: .1), blurRadius: 30, offset: const Offset(0, 16), spreadRadius: -14)],
          ),
          child: Column(children: [
            Container(
              padding: const EdgeInsets.fromLTRB(20, 20, 10, 18),
              decoration: const BoxDecoration(gradient: LinearGradient(begin: Alignment.topLeft, end: Alignment.bottomRight, colors: [SignatureTheme.gold, SignatureTheme.clay])),
              child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Expanded(
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text(e.word, style: const TextStyle(color: Colors.white, fontFamily: 'serif', fontSize: 32, fontWeight: FontWeight.w700)),
                    if ((e.phonetic ?? '').isNotEmpty) Padding(padding: const EdgeInsets.only(top: 2), child: Text('[${e.phonetic}]', style: const TextStyle(color: Color(0xE6FFFFFF), fontSize: 17))),
                    if (part.isNotEmpty)
                      Padding(
                        padding: const EdgeInsets.only(top: 8),
                        child: Container(padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4), decoration: BoxDecoration(color: Colors.white.withValues(alpha: .22), borderRadius: BorderRadius.circular(99)), child: Text(part, style: const TextStyle(color: Colors.white, fontSize: 11.5, fontWeight: FontWeight.w800))),
                      ),
                  ]),
                ),
                Column(children: [
                  IconButton(tooltip: fav ? 'Retirer des favoris' : 'Ajouter aux favoris', onPressed: () => _toggleFav(e), icon: Icon(fav ? Icons.star_rounded : Icons.star_border_rounded, color: Colors.white)),
                  IconButton(tooltip: 'Copier', onPressed: () {
                    Clipboard.setData(ClipboardData(text: '${e.word} — ${e.definition}'));
                    _toast('Copié');
                  }, icon: const Icon(Icons.copy_rounded, color: Colors.white)),
                ]),
              ]),
            ),
            Padding(
              padding: const EdgeInsets.all(16),
              child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                _block(
                  icon: Icons.translate_rounded,
                  title: 'Définition',
                  text: e.definition,
                  onListen: widget.speak == null ? null : () => _speak(e.word, true, 'w'),
                  listening: _speakingKey == 'w',
                  listenTip: 'Écouter le mot',
                ),
                if ((e.exampleBariba ?? '').isNotEmpty) ...[
                  const SizedBox(height: 10),
                  _block(icon: Icons.format_quote_rounded, title: 'Exemple en Bàátɔ̀nú', text: e.exampleBariba!, onListen: widget.speak == null ? null : () => _speak(e.exampleBariba!, true, 'eb'), listening: _speakingKey == 'eb', listenTip: 'Écouter l’exemple', tint: SignatureTheme.goldTint),
                ],
                if ((e.exampleFrench ?? '').isNotEmpty) ...[
                  const SizedBox(height: 10),
                  _block(icon: Icons.chat_bubble_outline_rounded, title: 'En français', text: e.exampleFrench!, onListen: widget.speak == null ? null : () => _speak(e.exampleFrench!, false, 'ef'), listening: _speakingKey == 'ef', listenTip: 'Écouter en français'),
                ],
              ]),
            ),
          ]),
        ),
        if (related.isNotEmpty) ...[
          const SectionLabel('Voir aussi'),
          Wrap(spacing: 8, runSpacing: 8, children: [for (final r in related) ActionChip(label: Text(r.word), onPressed: () => _open(r))]),
        ],
        const SizedBox(height: 4),
        Align(
          alignment: Alignment.centerLeft,
          child: TextButton.icon(
            onPressed: () => setState(() {
              _selected = null;
              _query.clear();
              _debounced = '';
            }),
            icon: const Icon(Icons.arrow_back_rounded),
            label: const Text('Nouvelle recherche'),
          ),
        ),
      ],
    );
  }

  Widget _block({required IconData icon, required String title, required String text, VoidCallback? onListen, bool listening = false, String listenTip = 'Écouter', Color? tint}) {
    return Container(
      padding: const EdgeInsets.fromLTRB(14, 12, 6, 12),
      decoration: BoxDecoration(color: tint?.withValues(alpha: .5) ?? SignatureTheme.appBackground, borderRadius: BorderRadius.circular(18), border: Border.all(color: SignatureTheme.hairline)),
      child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Icon(icon, size: 20, color: SignatureTheme.goldDeep),
        const SizedBox(width: 10),
        Expanded(
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(title, style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w900, color: SignatureTheme.muted, letterSpacing: .3)),
            const SizedBox(height: 3),
            SelectableText(text, style: const TextStyle(fontSize: 16, height: 1.45, color: SignatureTheme.ink)),
          ]),
        ),
        if (onListen != null)
          IconButton(tooltip: listenTip, onPressed: onListen, icon: listening ? const SizedBox.square(dimension: 18, child: CircularProgressIndicator(strokeWidth: 2)) : const Icon(Icons.volume_up_rounded, color: SignatureTheme.goldDeep)),
      ]),
    );
  }
}
