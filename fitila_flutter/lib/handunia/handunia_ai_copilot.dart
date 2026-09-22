import 'dart:async';

import 'package:audioplayers/audioplayers.dart' as audio;
import 'package:flutter/material.dart';

import '../core/fitila_backend.dart';
import '../core/fitila_media.dart';
import '../core/fitila_translation_audio.dart';

class HanduniaAiContext {
  const HanduniaAiContext({
    required this.screen,
    this.place,
    this.visiblePlaces = 0,
    this.offline = false,
  });

  final String screen;
  final Map<String, dynamic>? place;
  final int visiblePlaces;
  final bool offline;

  String get placeName => place?['name']?.toString().trim() ?? '';

  String toPrompt() {
    final territory = <String>[
      place?['village_quartier']?.toString().trim() ?? '',
      place?['arrondissement']?.toString().trim() ?? '',
      place?['commune']?.toString().trim() ?? '',
      place?['department']?.toString().trim() ?? '',
    ].where((value) => value.isNotEmpty).join(' > ');
    return [
      'Écran: $screen',
      if (placeName.isNotEmpty) 'Lieu sélectionné: $placeName',
      if (territory.isNotEmpty) 'Territoire: $territory',
      'Lieux visibles: $visiblePlaces',
      'Mode réseau: ${offline ? 'hors ligne' : 'en ligne'}',
    ].join('\n');
  }
}

class HanduniaAiCopilotButton extends StatelessWidget {
  const HanduniaAiCopilotButton({
    super.key,
    required this.contextData,
  });

  final HanduniaAiContext contextData;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: true,
      label: 'Ouvrir Lumière IA',
      child: InkWell(
        customBorder: const CircleBorder(),
        onTap: () => showModalBottomSheet<void>(
          context: context,
          useSafeArea: true,
          isScrollControlled: true,
          backgroundColor: Colors.transparent,
          builder: (_) => HanduniaAiCopilotSheet(contextData: contextData),
        ),
        child: Container(
          width: 58,
          height: 58,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            gradient: const SweepGradient(
              colors: [
                Color(0xFF7A4DFF),
                Color(0xFF2DD4BF),
                Color(0xFFFFC95C),
                Color(0xFF7A4DFF),
              ],
            ),
            boxShadow: const [
              BoxShadow(
                color: Color(0x557A4DFF),
                blurRadius: 28,
                spreadRadius: -4,
                offset: Offset(0, 10),
              ),
            ],
            border: Border.all(color: Colors.white, width: 2),
          ),
          child: const Icon(
            Icons.auto_awesome_rounded,
            color: Colors.white,
            size: 28,
          ),
        ),
      ),
    );
  }
}

class HanduniaAiCopilotSheet extends StatefulWidget {
  const HanduniaAiCopilotSheet({
    super.key,
    required this.contextData,
  });

  final HanduniaAiContext contextData;

  @override
  State<HanduniaAiCopilotSheet> createState() =>
      _HanduniaAiCopilotSheetState();
}

class _HanduniaAiCopilotSheetState extends State<HanduniaAiCopilotSheet> {
  final _input = TextEditingController();
  final _media = FitilaMediaController();
  final _player = audio.AudioPlayer();
  final List<({bool user, String text})> _messages = [];
  bool _busy = false;
  bool _recording = false;
  bool _speaking = false;

  static const _ink = Color(0xFF171427);
  static const _muted = Color(0xFF7E7890);
  static const _violet = Color(0xFF6F4BFF);
  static const _aqua = Color(0xFF28CFC1);
  static const _gold = Color(0xFFF0B84B);

  @override
  void dispose() {
    _input.dispose();
    _media.dispose();
    _player.dispose();
    super.dispose();
  }

  List<String> get _quickActions {
    final place = widget.contextData.placeName;
    switch (widget.contextData.screen) {
      case 'lieux':
        return const [
          'Quel lieu explorer ?',
          'Montre-moi un lieu proche',
          'Où trouver une histoire ?',
        ];
      case 'lieu':
        return [
          if (place.isNotEmpty) 'Que faut-il savoir sur $place ?',
          'Que puis-je demander ici ?',
          'Comment ajouter un souvenir ?',
        ];
      case 'publier':
        return const [
          'Aide-moi à raconter',
          'Rends mon récit plus clair',
          'Pose-moi 3 questions simples',
        ];
      default:
        return const [
          'Que puis-je découvrir ?',
          'Guide-moi',
          'Trouve une histoire intéressante',
        ];
    }
  }

  Future<void> _ask([String? prompt]) async {
    final message = (prompt ?? _input.text).trim();
    if (message.isEmpty || _busy) return;

    setState(() {
      _busy = true;
      _messages.add((user: true, text: message));
      _input.clear();
    });

    try {
      if (!FitilaBackend.configured) {
        throw StateError('Lumière IA attend le réseau.');
      }
      final history = _messages
          .take(_messages.length - 1)
          .map(
            (item) => <String, String>{
              'role': item.user ? 'user' : 'assistant',
              'content': item.text,
            },
          )
          .toList(growable: false);

      final response = await FitilaBackend.client.functions.invoke(
        'fitila-ia-chat',
        body: <String, dynamic>{
          'message': message,
          'history': history,
          'temperature': 0.35,
          'max_tokens': 180,
          'systemPrompt': '''
Tu es Lumière IA, le copilote culturel embarqué de FITILA B.
Tu aides à explorer Handunia Wasa de manière très simple, visuelle et orale.
Tu connais le contexte d'écran ci-dessous:
${widget.contextData.toPrompt()}

Règles:
- Réponds en français très simple, 2 à 4 phrases maximum.
- Si un lieu est sélectionné, reste centré sur ce lieu.
- Ne fabrique jamais un fait historique. Si la mémoire communautaire ne suffit pas, dis-le clairement.
- Propose au maximum une prochaine action concrète.
- Pour un utilisateur peu lettré, utilise des mots courts et des phrases directes.
''',
        },
      );

      final data = response.data;
      if (data is! Map) {
        throw StateError('Réponse IA invalide.');
      }
      final text =
          (data['response_fr'] ?? data['response'] ?? data['message'])
                  ?.toString()
                  .trim() ??
              '';
      if (text.isEmpty) {
        throw StateError(
          data['error']?.toString() ?? 'Lumière IA ne répond pas encore.',
        );
      }
      if (!mounted) return;
      setState(() => _messages.add((user: false, text: text)));
    } catch (error) {
      if (!mounted) return;
      final message = error is StateError
          ? error.message
          : 'Lumière IA est momentanément indisponible.';
      setState(() => _messages.add((user: false, text: message)));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _toggleVoice() async {
    if (_busy) return;
    if (!_recording) {
      try {
        await _media.startAudio();
        if (!mounted) return;
        setState(() => _recording = true);
      } catch (_) {
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Micro indisponible.')),
        );
      }
      return;
    }

    setState(() => _recording = false);
    try {
      final asset = await _media.stopAudio();
      if (asset == null) return;
      final transcript = await FitilaTranslationAudio.transcribe(
        asset: asset,
        sourceIsBariba: false,
      );
      if (!mounted) return;
      _input.text = transcript;
      await _ask();
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Je n’ai pas compris la voix.')),
      );
    }
  }

  Future<void> _speak(String text) async {
    if (_speaking || text.trim().isEmpty) return;
    setState(() => _speaking = true);
    try {
      final generated = await FitilaTranslationAudio.synthesize(
        text: text,
        bariba: false,
      );
      final url = generated.url?.trim() ?? '';
      if (url.isNotEmpty) {
        await _player.play(audio.UrlSource(url));
      } else {
        final path = await generated.materialize();
        if (path != null) {
          await _player.play(audio.DeviceFileSource(path));
        }
      }
    } finally {
      if (mounted) setState(() => _speaking = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final keyboard = MediaQuery.viewInsetsOf(context).bottom;
    return AnimatedPadding(
      duration: const Duration(milliseconds: 180),
      padding: EdgeInsets.only(bottom: keyboard),
      child: FractionallySizedBox(
        heightFactor: .82,
        child: Container(
          decoration: const BoxDecoration(
            color: Color(0xFFF8F7FC),
            borderRadius: BorderRadius.vertical(top: Radius.circular(32)),
          ),
          child: Column(
            children: [
              const SizedBox(height: 10),
              Container(
                width: 42,
                height: 4,
                decoration: BoxDecoration(
                  color: const Color(0xFFD8D5E2),
                  borderRadius: BorderRadius.circular(999),
                ),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(18, 14, 12, 8),
                child: Row(
                  children: [
                    Container(
                      width: 44,
                      height: 44,
                      decoration: const BoxDecoration(
                        shape: BoxShape.circle,
                        gradient: LinearGradient(
                          colors: [_violet, _aqua, _gold],
                        ),
                      ),
                      child: const Icon(
                        Icons.auto_awesome_rounded,
                        color: Colors.white,
                      ),
                    ),
                    const SizedBox(width: 11),
                    const Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Lumière IA',
                            style: TextStyle(
                              color: _ink,
                              fontSize: 20,
                              fontWeight: FontWeight.w900,
                            ),
                          ),
                          Text(
                            'Copilote culturel • FITILA B',
                            style: TextStyle(
                              color: _muted,
                              fontSize: 11.5,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ],
                      ),
                    ),
                    IconButton(
                      onPressed: () => Navigator.pop(context),
                      icon: const Icon(Icons.close_rounded),
                    ),
                  ],
                ),
              ),
              SizedBox(
                height: 40,
                child: ListView.separated(
                  padding: const EdgeInsets.symmetric(horizontal: 18),
                  scrollDirection: Axis.horizontal,
                  itemBuilder: (_, index) => ActionChip(
                    avatar: const Icon(
                      Icons.bolt_rounded,
                      size: 16,
                      color: _violet,
                    ),
                    label: Text(_quickActions[index]),
                    onPressed: _busy ? null : () => _ask(_quickActions[index]),
                  ),
                  separatorBuilder: (_, _) => const SizedBox(width: 7),
                  itemCount: _quickActions.length,
                ),
              ),
              const SizedBox(height: 8),
              Expanded(
                child: _messages.isEmpty
                    ? const _AiEmptyState()
                    : ListView.builder(
                        padding: const EdgeInsets.fromLTRB(16, 8, 16, 10),
                        itemCount: _messages.length,
                        itemBuilder: (_, index) {
                          final item = _messages[index];
                          return Align(
                            alignment: item.user
                                ? Alignment.centerRight
                                : Alignment.centerLeft,
                            child: Container(
                              constraints: const BoxConstraints(maxWidth: 340),
                              margin: const EdgeInsets.only(bottom: 8),
                              padding: const EdgeInsets.fromLTRB(13, 10, 11, 10),
                              decoration: BoxDecoration(
                                color: item.user
                                    ? _violet
                                    : Colors.white,
                                borderRadius: BorderRadius.circular(18),
                                border: item.user
                                    ? null
                                    : Border.all(
                                        color: const Color(0xFFE7E3F1),
                                      ),
                                boxShadow: item.user
                                    ? null
                                    : const [
                                        BoxShadow(
                                          color: Color(0x10271E4C),
                                          blurRadius: 16,
                                          offset: Offset(0, 8),
                                          spreadRadius: -10,
                                        ),
                                      ],
                              ),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                crossAxisAlignment: CrossAxisAlignment.end,
                                children: [
                                  Flexible(
                                    child: Text(
                                      item.text,
                                      style: TextStyle(
                                        color: item.user ? Colors.white : _ink,
                                        fontSize: 13.5,
                                        height: 1.4,
                                        fontWeight: FontWeight.w600,
                                      ),
                                    ),
                                  ),
                                  if (!item.user) ...[
                                    const SizedBox(width: 4),
                                    IconButton(
                                      visualDensity: VisualDensity.compact,
                                      onPressed: _speaking
                                          ? null
                                          : () => _speak(item.text),
                                      icon: const Icon(
                                        Icons.volume_up_rounded,
                                        size: 18,
                                      ),
                                    ),
                                  ],
                                ],
                              ),
                            ),
                          );
                        },
                      ),
              ),
              if (_busy)
                const LinearProgressIndicator(
                  minHeight: 2,
                  color: _violet,
                  backgroundColor: Color(0xFFE9E6F5),
                ),
              Padding(
                padding: const EdgeInsets.fromLTRB(14, 8, 14, 14),
                child: Row(
                  children: [
                    IconButton.filledTonal(
                      onPressed: _toggleVoice,
                      icon: Icon(
                        _recording
                            ? Icons.stop_circle_rounded
                            : Icons.mic_rounded,
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: TextField(
                        controller: _input,
                        textInputAction: TextInputAction.send,
                        onSubmitted: (_) => _ask(),
                        decoration: InputDecoration(
                          hintText: 'Demandez ou parlez…',
                          filled: true,
                          fillColor: Colors.white,
                          contentPadding: const EdgeInsets.symmetric(
                            horizontal: 15,
                            vertical: 12,
                          ),
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(18),
                            borderSide: BorderSide.none,
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    IconButton.filled(
                      onPressed: _busy ? null : _ask,
                      style: IconButton.styleFrom(backgroundColor: _violet),
                      icon: const Icon(Icons.arrow_upward_rounded),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _AiEmptyState extends StatelessWidget {
  const _AiEmptyState();

  @override
  Widget build(BuildContext context) {
    return const Center(
      child: Padding(
        padding: EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              Icons.auto_awesome_rounded,
              size: 54,
              color: Color(0xFF6F4BFF),
            ),
            SizedBox(height: 12),
            Text(
              'Je suis là pour vous guider.',
              textAlign: TextAlign.center,
              style: TextStyle(
                color: Color(0xFF171427),
                fontSize: 18,
                fontWeight: FontWeight.w900,
              ),
            ),
            SizedBox(height: 5),
            Text(
              'Parlez, écrivez ou choisissez une suggestion.',
              textAlign: TextAlign.center,
              style: TextStyle(
                color: Color(0xFF7E7890),
                height: 1.4,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
