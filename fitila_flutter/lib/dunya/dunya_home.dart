import 'package:flutter/material.dart';
import 'dunya_core.dart';
import 'dunya_local_store.dart';
import 'dunya_models.dart';
import 'voice/dunya_voice_page.dart';
import 'voice/dunya_assistant.dart';
import 'voice/dunya_settings.dart';
import 'voice/dunya_voice_brain.dart';

class DunyaOfflinePage extends StatefulWidget {
  const DunyaOfflinePage({super.key});

  @override
  State<DunyaOfflinePage> createState() => _DunyaOfflinePageState();
}

class _DunyaOfflinePageState extends State<DunyaOfflinePage> {
  final _store = DunyaLocalStore.instance;
  final _knowledge = DunyaAssetKnowledgeRepository();
  final _settings = DunyaSettings.instance;
  late final DunyaAssistant _assistant = DunyaAssistant(
    knowledge: _knowledge,
    skills: DunyaVoiceBrain(knowledge: _knowledge),
  );
  String _lastEngine = 'Essentiel';
  final _input = TextEditingController();
  final _scroll = ScrollController();
  List<DunyaMessage> _messages = [];
  List<String> _memories = [];
  bool _loading = true;
  bool _generating = false;
  bool _voiceMode = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _input.dispose();
    _assistant.interrupt();
    _scroll.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    try {
      await _settings.load();
      final inMode = await _store.loadMessages(conversationId: _settings.mode.conversationId);
      // Preserve old text history for upgrades from the local-only DUNYA tab.
      _messages = inMode.isNotEmpty ? inMode : await _store.loadMessages();
      _memories = await _store.loadMemories();
      await _knowledge.initialize();
      await _store.audit('dunya_opened', {
        'execution_mode': _settings.execution.key,
        'model_id': 'dunya-hybrid',
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

  /// One unified text path for Online / Auto / Offline. Uses exactly the
  /// same assistant and translation chain as the voice conversation, rather
  /// than leaving the text tab permanently stuck on the fallback extractor.
  Future<void> _send() async {
    if (_generating) {
      await _assistant.interrupt();
      if (mounted) setState(() => _generating = false);
      return;
    }
    final clean = _input.text.trim();
    if (clean.isEmpty) return;
    final user = DunyaMessage(role: 'user', content: clean);
    if (!mounted) return;
    setState(() {
      _messages = [..._messages, user];
      _input.clear();
      _generating = true;
    });
    await _store.appendMessage(user, conversationId: _settings.mode.conversationId);
    final assistantIndex = _messages.length;
    setState(() {
      _messages = [..._messages, DunyaMessage(role: 'assistant', content: '')];
    });
    var generated = '';
    var sources = <DunyaSource>[];
    var engine = 'essential';
    try {
      await for (final event in _assistant.reply(clean, _settings.mode)) {
        if (!mounted) return;
        switch (event) {
          case DunyaSentenceEvent sentence:
            generated = '$generated ${sentence.utterance.text}'.trim();
          case DunyaDoneEvent done:
            if (generated.isEmpty) generated = done.display;
            sources = done.sources;
            engine = done.engine;
          case DunyaStatusEvent _:
            break;
        }
        if (mounted) {
          setState(() {
            final list = [..._messages];
            list[assistantIndex] = DunyaMessage(
              role: 'assistant', content: generated, sources: sources);
            _messages = list;
          });
        }
      }
      if (generated.isEmpty) generated = 'Réponse indisponible. Réessayez.';
      _lastEngine = engine;
      await _store.appendMessage(DunyaMessage(
        role: 'assistant', content: generated, sources: sources),
        conversationId: _settings.mode.conversationId);
      await _store.audit('dunya_query', {
        'execution_mode': _settings.execution.key,
        'model_id': engine,
        'source_count': sources.length,
      });
    } catch (error) {
      generated = 'DUNYA est momentanément indisponible. Réessayez.';
      await _store.audit('dunya_query_error',
          {'error': error.toString()}, severity: 'warning');
    } finally {
      if (mounted) {
        setState(() {
          _generating = false;
          if (assistantIndex < _messages.length) {
            final next = [..._messages];
            next[assistantIndex] = DunyaMessage(
              role: 'assistant', content: generated, sources: sources);
            _messages = next;
          }
        });
      }
    }
    await Future<void>.delayed(const Duration(milliseconds: 80));
    if (_scroll.hasClients) {
      await _scroll.animateTo(_scroll.position.maxScrollExtent,
          duration: const Duration(milliseconds: 220),
          curve: Curves.easeOutCubic);
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

  Future<void> _openChat() async {
    final messages = await _store.loadMessages();
    final memories = await _store.loadMemories();
    if (!mounted) return;
    setState(() {
      _messages = messages;
      _memories = memories;
      _voiceMode = false;
    });
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

    if (_voiceMode) {
      return DunyaVoicePage(knowledge: _knowledge, onOpenChat: _openChat);
    }

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
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(Icons.cloud_rounded, size: 14, color: sage),
                        const SizedBox(width: 5),
                        Text(_settings.execution.label.toUpperCase(), style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w900, color: sage)),
                      ],
                    ),
                  ),
                  IconButton(
                    tooltip: 'Parler à DUNYA',
                    onPressed: () => setState(() => _voiceMode = true),
                    icon: const Icon(Icons.mic_rounded, color: goldDeep),
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
                                      _capability(Icons.mic_none_rounded, 'Parler', 'Français · Baatɔnum', goldDeep),
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
                                    'DUNYA ${_settings.execution.label}',
                                    _generating ? 'Réponse en cours…' : _lastEngine,
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
                  Tooltip(
                    message: _generating ? 'Arrêter la génération' : 'Envoyer',
                    child: SizedBox(
                      width: 54,
                      height: 54,
                      child: FilledButton(
                        onPressed: _send,
                        style: FilledButton.styleFrom(
                          padding: EdgeInsets.zero,
                          backgroundColor: gold,
                          foregroundColor: ink,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(18),
                          ),
                        ),
                        child: Icon(
                          _generating ? Icons.stop_rounded : Icons.send_rounded,
                        ),
                      ),
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
