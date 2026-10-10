import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'dunya_local_store.dart';
import 'dunya_models.dart';

class DunyaOfflinePage extends StatefulWidget {
  const DunyaOfflinePage({super.key});

  @override
  State<DunyaOfflinePage> createState() => _DunyaOfflinePageState();
}

class _DunyaOfflinePageState extends State<DunyaOfflinePage> {
  final _store = DunyaLocalStore.instance;
  final _input = TextEditingController();
  final _scroll = ScrollController();
  List<DunyaMessage> _messages = [];
  List<String> _memories = [];
  List<Map<String, String>> _dictionary = const [];
  List<DunyaSource> _learning = const [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _input.dispose();
    _scroll.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    try {
      _messages = await _store.loadMessages();
      _memories = await _store.loadMemories();
      await _store.audit('dunya_opened', {'offline': true});
    } catch (_) {
      _messages = const [];
      _memories = const [];
    }

    try { _dictionary = await _loadDictionary(); } catch (_) { _dictionary = const []; }
    try { _learning = await _loadLearningKnowledge(); } catch (_) { _learning = const []; }

    if (mounted) setState(() => _loading = false);
  }

  Future<List<Map<String, String>>> _loadDictionary() async {
    final raw = await rootBundle.loadString('assets/data/dictionnaire_ameliore.json');
    final decoded = jsonDecode(raw);
    if (decoded is! List) return const [];
    return [
      for (final item in decoded)
        if (item is Map)
          {
            'word': (item['word'] ?? item['bariba'] ?? '').toString(),
            'definition': (item['definition'] ?? item['french'] ?? item['fr'] ?? '').toString(),
          },
    ].where((e) => (e['word'] ?? '').isNotEmpty && (e['definition'] ?? '').isNotEmpty).toList(growable: false);
  }

  Future<List<DunyaSource>> _loadLearningKnowledge() async {
    final result = <DunyaSource>[];
    for (final asset in const ['assets/data/apprendre_v2.json', 'assets/data/scenes_v2.json']) {
      final raw = await rootBundle.loadString(asset);
      final decoded = jsonDecode(raw);
      void walk(dynamic value, String title) {
        if (value == null) return;
        if (value is String) {
          final text = value.trim();
          if (text.length >= 18) result.add(DunyaSource(title: title, text: text));
          return;
        }
        if (value is List) {
          for (final item in value) walk(item, title);
          return;
        }
        if (value is Map) {
          final localTitle = (value['title_fr'] ?? value['title'] ?? value['name'] ?? value['ba'] ?? title).toString();
          for (final entry in value.entries) {
            if (entry.key == 'id' || entry.key == 'icon' || entry.key == 'version') continue;
            walk(entry.value, localTitle);
          }
        }
      }
      walk(decoded, asset.contains('scenes') ? 'DUNYA Apprendre · Scènes' : 'DUNYA Apprendre');
    }
    return result;
  }

  static String _norm(String input) => input
      .toLowerCase()
      .replaceAll(RegExp(r'[^a-z0-9à-ÿɔɛãĩũõñœ\s-]'), ' ')
      .replaceAll(RegExp(r'\s+'), ' ')
      .trim();

  DunyaMessage _answer(String query) {
    final clean = _norm(query);
    final terms = clean.split(' ').where((e) => e.length > 2).toList();
    final sources = <({int score, DunyaSource source})>[];

    for (final row in _dictionary) {
      final word = row['word'] ?? '';
      final definition = row['definition'] ?? '';
      final combined = _norm('$word $definition');
      var score = combined.contains(clean) && clean.isNotEmpty ? 12 : 0;
      for (final term in terms) {
        if (combined.contains(term)) {
          score += 2;
        }
      }
      if (score > 0) {
        sources.add((score: score, source: DunyaSource(title: 'Dictionnaire FITILA · $word', text: '$word — $definition')));
      }
    }

    for (final source in _learning) {
      final combined = _norm('${source.title} ${source.text}');
      var score = combined.contains(clean) && clean.isNotEmpty ? 10 : 0;
      for (final term in terms) {
        if (combined.contains(term)) score += 2;
      }
      if (score > 0) sources.add((score: score, source: source));
    }

    sources.sort((a, b) => b.score.compareTo(a.score));
    final best = sources.take(4).map((e) => e.source).toList();
    if (best.isEmpty) {
      return const DunyaMessage(
        role: 'assistant',
        content: 'Je n’ai pas trouvé de source locale suffisamment pertinente. DUNYA reste hors ligne et préfère ne pas inventer une réponse sans source.',
      );
    }
    final excerpt = best.first.text.length > 560 ? '${best.first.text.substring(0, 560)}…' : best.first.text;
    return DunyaMessage(
      role: 'assistant',
      content: 'Voici ce que je trouve dans les ressources locales FITILA :\n\n$excerpt',
      sources: best,
    );
  }

  Future<void> _send() async {
    final clean = _input.text.trim();
    if (clean.isEmpty) return;
    final user = DunyaMessage(role: 'user', content: clean);
    final assistant = _answer(clean);
    setState(() {
      _messages = [..._messages, user, assistant];
      _input.clear();
    });
    await _store.appendMessage(user);
    await _store.appendMessage(assistant);
    await _store.audit('dunya_query', {
      'source_count': assistant.sources.length,
      'grounded': assistant.sources.isNotEmpty,
    });
    await Future<void>.delayed(const Duration(milliseconds: 80));
    if (_scroll.hasClients) {
      await _scroll.animateTo(_scroll.position.maxScrollExtent, duration: const Duration(milliseconds: 220), curve: Curves.easeOutCubic);
    }
  }

  Future<void> _saveMemory(String value) async {
    if (_memories.contains(value)) return;
    setState(() => _memories = [value, ..._memories].take(100).toList());
    await _store.saveMemory(value);
    await _store.audit('dunya_memory_saved', {'source': 'assistant'});
  }

  @override
  Widget build(BuildContext context) {
    const bg = Color(0xFFF7F5EC);
    const ink = Color(0xFF241F2E);
    const muted = Color(0xFF8C8571);
    const gold = Color(0xFFC99530);
    const goldDeep = Color(0xFF9C6B1D);
    const sage = Color(0xFF3F6E52);
    const line = Color(0xFFE4DFCC);

    return ColoredBox(
      color: bg,
      child: SafeArea(
        child: Column(
          children: [
            Container(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 10),
              decoration: const BoxDecoration(border: Border(bottom: BorderSide(color: line))),
              child: Row(
                children: [
                  Container(
                    width: 46, height: 46,
                    decoration: BoxDecoration(color: ink, borderRadius: BorderRadius.circular(16)),
                    child: const Icon(Icons.psychology_rounded, color: Color(0xFFF3E3B9)),
                  ),
                  const SizedBox(width: 12),
                  const Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('DUNYA IA', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w900, color: ink)),
                        Text('Votre intelligence, partout.', style: TextStyle(fontSize: 12.5, color: muted)),
                      ],
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 6),
                    decoration: BoxDecoration(color: Color(0xFFDDEEE2), borderRadius: BorderRadius.circular(999)),
                    child: const Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.cloud_off_rounded, size: 14, color: sage),
                        SizedBox(width: 5),
                        Text('LOCAL', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w900, color: sage)),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            Expanded(
              child: _loading
                  ? const Center(child: CircularProgressIndicator(color: gold))
                  : _messages.isEmpty
                      ? ListView(
                          padding: const EdgeInsets.fromLTRB(14, 14, 14, 24),
                          children: [
                            Container(
                              padding: const EdgeInsets.all(18),
                              decoration: BoxDecoration(color: Colors.white, border: Border.all(color: line), borderRadius: BorderRadius.circular(26)),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const Text('Une intelligence dans chaque téléphone.', style: TextStyle(fontSize: 22, fontWeight: FontWeight.w900, color: ink)),
                                  const SizedBox(height: 8),
                                  const Text('Demandez, apprenez et gardez vos savoirs accessibles même sans Internet.', style: TextStyle(fontSize: 14, height: 1.5, color: muted)),
                                  const SizedBox(height: 18),
                                  GridView.count(
                                    crossAxisCount: 2,
                                    shrinkWrap: true,
                                    physics: NeverScrollableScrollPhysics(),
                                    mainAxisSpacing: 8,
                                    crossAxisSpacing: 8,
                                    childAspectRatio: 1.7,
                                    children: [
                                      _capability(Icons.chat_bubble_outline_rounded, 'Discuter', 'Actif', goldDeep),
                                      _capability(Icons.mic_none_rounded, 'Parler', 'À installer', goldDeep),
                                      _capability(Icons.storage_rounded, 'Mes savoirs', '${_memories.length} mémoire(s)', goldDeep),
                                      _capability(Icons.camera_alt_outlined, 'Comprendre', 'À installer', goldDeep),
                                    ],
                                  ),
                                ],
                              ),
                            ),
                            const SizedBox(height: 12),
                            Row(
                              children: [
                                Expanded(child: _status(Icons.security_rounded, '100 % local', 'Aucune API requise', sage)),
                                const SizedBox(width: 8),
                                Expanded(child: _status(Icons.menu_book_rounded, 'Savoirs FITILA', '${_dictionary.length} mots locaux', goldDeep)),
                              ],
                            ),
                          ],
                        )
                      : ListView.separated(
                          controller: _scroll,
                          padding: const EdgeInsets.fromLTRB(14, 14, 14, 20),
                          itemCount: _messages.length,
                          separatorBuilder: (_, _) => const SizedBox(height: 9),
                          itemBuilder: (_, index) {
                            final m = _messages[index];
                            final user = m.role == 'user';
                            return Align(
                              alignment: user ? Alignment.centerRight : Alignment.centerLeft,
                              child: ConstrainedBox(
                                constraints: const BoxConstraints(maxWidth: 640),
                                child: Container(
                                  margin: EdgeInsets.only(left: user ? 34 : 0, right: user ? 0 : 34),
                                  padding: const EdgeInsets.all(14),
                                  decoration: BoxDecoration(
                                    color: user ? ink : Colors.white,
                                    border: Border.all(color: user ? ink : line),
                                    borderRadius: BorderRadius.circular(20),
                                  ),
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(m.content, style: TextStyle(fontSize: 15, height: 1.48, color: user ? Colors.white : ink)),
                                      if (!user && m.sources.isNotEmpty) ...[
                                        const SizedBox(height: 10),
                                        Wrap(
                                          spacing: 6, runSpacing: 6,
                                          children: [
                                            for (final source in m.sources)
                                              Container(
                                                padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 5),
                                                decoration: BoxDecoration(color: Color(0xFFF7F2E5), borderRadius: BorderRadius.circular(999)),
                                                child: Text(source.title, style: const TextStyle(fontSize: 10.5, fontWeight: FontWeight.w800, color: goldDeep)),
                                              ),
                                            TextButton.icon(
                                              onPressed: () => _saveMemory(m.content),
                                              icon: const Icon(Icons.bookmark_add_outlined, size: 16),
                                              label: const Text('Mémoriser'),
                                            ),
                                          ],
                                        ),
                                      ],
                                    ],
                                  ),
                                ),
                              ),
                            );
                          },
                        ),
            ),
            Container(
              padding: EdgeInsets.fromLTRB(10, 8, 10, MediaQuery.viewPaddingOf(context).bottom + 8),
              decoration: const BoxDecoration(color: bg, border: Border(top: BorderSide(color: line))),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Expanded(
                    child: TextField(
                      controller: _input,
                      minLines: 1,
                      maxLines: 4,
                      textInputAction: TextInputAction.newline,
                      decoration: InputDecoration(
                        hintText: 'Demandez à DUNYA…',
                        hintStyle: const TextStyle(color: muted),
                        filled: true,
                        fillColor: Colors.white,
                        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 15),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(19), borderSide: const BorderSide(color: line)),
                        enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(19), borderSide: const BorderSide(color: line)),
                        focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(19), borderSide: const BorderSide(color: gold, width: 1.5)),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  SizedBox(
                    width: 54, height: 54,
                    child: FilledButton(
                      onPressed: _send,
                      style: FilledButton.styleFrom(padding: EdgeInsets.zero, backgroundColor: gold, foregroundColor: ink, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18))),
                      child: const Icon(Icons.send_rounded),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _capability(IconData icon, String title, String state, Color accent) => Container(
    padding: const EdgeInsets.all(11),
    decoration: BoxDecoration(color: const Color(0xFFFDFCF7), borderRadius: BorderRadius.circular(17), border: Border.all(color: const Color(0xFFE4DFCC))),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, size: 20, color: accent),
        const Spacer(),
        Text(title, style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w900, color: Color(0xFF241F2E))),
        Text(state, style: const TextStyle(fontSize: 10.5, color: Color(0xFF8C8571))),
      ],
    ),
  );

  Widget _status(IconData icon, String title, String subtitle, Color accent) => Container(
    padding: const EdgeInsets.all(13),
    decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(18), border: Border.all(color: const Color(0xFFE4DFCC))),
    child: Row(
      children: [
        Icon(icon, size: 20, color: accent),
        const SizedBox(width: 9),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(title, style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w900, color: Color(0xFF241F2E))),
              Text(subtitle, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 10.5, color: Color(0xFF8C8571))),
            ],
          ),
        ),
      ],
    ),
  );
}
