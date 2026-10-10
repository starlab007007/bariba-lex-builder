import 'package:flutter/material.dart';
import 'dunya_core.dart';
import 'dunya_local_store.dart';
import 'dunya_models.dart';

class DunyaOfflinePage extends StatefulWidget {
  const DunyaOfflinePage({super.key});

  @override
  State<DunyaOfflinePage> createState() => _DunyaOfflinePageState();
}

class _DunyaOfflinePageState extends State<DunyaOfflinePage> {
  final _store = DunyaLocalStore.instance;
  final _knowledge = DunyaAssetKnowledgeRepository();
  final _engine = DunyaFallbackInferenceEngine();
  late final DunyaIntelligenceRouter _router = DunyaIntelligenceRouter(
    knowledge: _knowledge,
    fallbackEngine: _engine,
  );
  final _input = TextEditingController();
  final _scroll = ScrollController();
  List<DunyaMessage> _messages = [];
  List<String> _memories = [];
  bool _loading = true;
  bool _generating = false;

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
      await _knowledge.initialize();
      await _store.audit('dunya_opened', {
        'offline': true,
        'model_id': _engine.modelId,
        'profile': _engine.profile.name,
      });
    } catch (error) {
      _messages = const [];
      _memories = const [];
      await _store.audit(
        'dunya_open_error',
        {'error': error.toString()},
        severity: 'error',
      );
    }

    if (mounted) setState(() => _loading = false);
  }

  Future<void> _send() async {
    if (_generating) {
      await _engine.cancel();
      if (mounted) setState(() => _generating = false);
      return;
    }

    final clean = _input.text.trim();
    if (clean.isEmpty) return;

    final user = DunyaMessage(role: 'user', content: clean);
    setState(() {
      _messages = [..._messages, user];
      _input.clear();
      _generating = true;
    });
    await _store.appendMessage(user);

    final routed = await _router.route(
      query: clean,
      history: _messages,
    );

    var generated = '';
    final assistantIndex = _messages.length;
    setState(() {
      _messages = [
        ..._messages,
        DunyaMessage(
          role: 'assistant',
          content: '',
          sources: routed.metadata.sources,
        ),
      ];
    });

    try {
      await for (final chunk in routed.stream) {
        generated += chunk;
        if (!mounted) return;
        setState(() {
          final next = [..._messages];
          next[assistantIndex] = DunyaMessage(
            role: 'assistant',
            content: generated,
            sources: routed.metadata.sources,
          );
          _messages = next;
        });
      }

      final assistant = DunyaMessage(
        role: 'assistant',
        content: generated,
        sources: routed.metadata.sources,
      );
      await _store.appendMessage(assistant);
      await _store.audit('dunya_query', {
        'execution_mode': routed.metadata.executionMode,
        'model_id': routed.metadata.modelId,
        'language': routed.metadata.language,
        'confidence_status': routed.metadata.confidenceStatus.name,
        'source_count': routed.metadata.sources.length,
        'tools_used': routed.metadata.toolsUsed,
      });
    } finally {
      if (mounted) setState(() => _generating = false);
    }

    await Future<void>.delayed(const Duration(milliseconds: 80));
    if (_scroll.hasClients) {
      await _scroll.animateTo(
        _scroll.position.maxScrollExtent,
        duration: const Duration(milliseconds: 220),
        curve: Curves.easeOutCubic,
      );
    }
  }

  Future<void> _showSource(DunyaSource source) async {
    await showModalBottomSheet<void>(
      context: context,
      showDragHandle: true,
      isScrollControlled: true,
      backgroundColor: const Color(0xFFFDFCF7),
      builder: (context) => SafeArea(
        child: Padding(
          padding: EdgeInsets.fromLTRB(
            18,
            4,
            18,
            MediaQuery.viewPaddingOf(context).bottom + 20,
          ),
          child: ConstrainedBox(
            constraints: BoxConstraints(
              maxHeight: MediaQuery.sizeOf(context).height * .72,
            ),
            child: ListView(
              shrinkWrap: true,
              children: [
                Text(
                  source.title,
                  style: const TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w900,
                    color: Color(0xFF241F2E),
                  ),
                ),
                const SizedBox(height: 10),
                Text(
                  source.text,
                  style: const TextStyle(
                    fontSize: 15,
                    height: 1.55,
                    color: Color(0xFF4A4454),
                  ),
                ),
                if (source.ref != null && source.ref!.isNotEmpty) ...[
                  const SizedBox(height: 12),
                  Text(
                    'Référence : ${source.ref}',
                    style: const TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w800,
                      color: Color(0xFF9C6B1D),
                    ),
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
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
                                Expanded(
                                  child: _status(
                                    Icons.memory_rounded,
                                    'DUNYA Fallback',
                                    _generating ? 'Génération locale…' : 'Prêt à répondre',
                                    sage,
                                  ),
                                ),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: _status(
                                    Icons.menu_book_rounded,
                                    'Savoirs FITILA',
                                    '${_knowledge.dictionaryCount} mots locaux',
                                    goldDeep,
                                  ),
                                ),
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
                                              ActionChip(
                                                onPressed: () => _showSource(source),
                                                backgroundColor: const Color(0xFFF7F2E5),
                                                side: BorderSide.none,
                                                visualDensity: VisualDensity.compact,
                                                label: Text(
                                                  source.title,
                                                  style: const TextStyle(
                                                    fontSize: 10.5,
                                                    fontWeight: FontWeight.w800,
                                                    color: goldDeep,
                                                  ),
                                                ),
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
                      tooltip: _generating ? 'Arrêter la génération' : 'Envoyer',
                      style: FilledButton.styleFrom(
                        padding: EdgeInsets.zero,
                        backgroundColor: gold,
                        foregroundColor: ink,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
                      ),
                      child: Icon(_generating ? Icons.stop_rounded : Icons.send_rounded),
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
