/// DUNYA assistant: one conversational turn, in a strictly separated language
/// mode, entirely on the phone.
///
/// 1. Reliable skills first (translation, notes, reminders, calculations,
///    time) — deterministic, no hallucination.
/// 2. Everything else goes to the on-device brain (Gemma), grounded with
///    FITILA knowledge, streamed sentence by sentence so DUNYA starts speaking
///    while it thinks.
/// 3. Baatɔnum mode: Baatɔnum -> French -> brain -> French -> Baatɔnum.
/// 4. No on-device brain (small phones) but a network: the FITILA cloud brain
///    ([DunyaAssistant.cloudBrain]) answers in French, then the same Baatɔnum
///    bridge (translation memory, then ByT5) is applied sentence by sentence.
library;

import 'dart:async';

import '../dunya_core.dart';
import '../dunya_local_store.dart';
import '../dunya_models.dart';
import 'dunya_brain.dart';
import 'dunya_settings.dart';
import 'dunya_translator.dart';
import 'dunya_voice_brain.dart';
import 'dunya_voice_intents.dart';
import 'dunya_voice_phrases.dart';

sealed class DunyaAssistantEvent {
  const DunyaAssistantEvent();
}

/// A sentence to show and speak, in [utterance.lang].
class DunyaSentenceEvent extends DunyaAssistantEvent {
  const DunyaSentenceEvent(this.utterance, {this.subtitle});

  final DunyaUtterance utterance;

  /// Optional French subtitle when speaking Baatɔnum.
  final String? subtitle;
}

class DunyaStatusEvent extends DunyaAssistantEvent {
  const DunyaStatusEvent(this.label);

  final String label;
}

class DunyaDoneEvent extends DunyaAssistantEvent {
  const DunyaDoneEvent({
    required this.display,
    required this.inputLanguage,
    this.sources = const [],
    this.pending,
    this.engine = 'skills',
    this.notice,
  });

  final String display;
  final String inputLanguage;
  final List<DunyaSource> sources;
  final DunyaPendingAction? pending;

  /// skills | brain | essential
  final String engine;

  /// Shown once to explain a limitation (e.g. translator unavailable).
  final String? notice;
}

/// Online brain: returns a short French answer, or null when unavailable.
typedef DunyaCloudBrainFn = Future<String?> Function({
  required String system,
  required List<({String role, String text})> history,
  required String message,
});

class DunyaAssistant {
  /// Set by the app (fitila-ia-chat). Used only when the on-device brain is absent.
  static DunyaCloudBrainFn? cloudBrain;
  static bool Function()? onlineAvailable;

  DunyaAssistant({
    required this.knowledge,
    required this.skills,
    DunyaLocalStore? store,
    DunyaBrain? brain,
    DunyaSettings? settings,
    DateTime Function()? clock,
  })  : _store = store ?? DunyaLocalStore.instance,
        _brain = brain ?? DunyaBrain.instance,
        _settings = settings ?? DunyaSettings.instance,
        _clock = clock ?? DateTime.now;

  final DunyaAssetKnowledgeRepository knowledge;
  final DunyaVoiceBrain skills;
  final DunyaLocalStore _store;
  final DunyaBrain _brain;
  final DunyaSettings _settings;
  final DateTime Function() _clock;
  var _cancelled = false;
  StreamSubscription<String>? _generation;

  /// Turns per mode: the native conversation is rebuilt every few turns so the
  /// context window (2048 tokens) never overflows on small phones.
  final _turns = <DunyaLanguageMode, int>{};
  Future<void>? _knowledgeLoading;

  Future<void> _ensureKnowledge() => _knowledgeLoading ??= knowledge.initialize();

  static const _skillIntents = {
    DunyaIntentKind.translateToBariba,
    DunyaIntentKind.meaningOfBariba,
    DunyaIntentKind.remember,
    DunyaIntentKind.recall,
    DunyaIntentKind.alarm,
    DunyaIntentKind.timer,
    DunyaIntentKind.calculate,
    DunyaIntentKind.time,
    DunyaIntentKind.date,
    DunyaIntentKind.confirmYes,
    DunyaIntentKind.confirmNo,
    DunyaIntentKind.empty,
  };

  DunyaPendingAction? get pending => skills.pending;

  Future<bool> brainAvailable() async {
    if (_settings.intelligence != DunyaIntelligence.smart) return false;
    try {
      await _brain.refreshState();
    } catch (_) {
      return false;
    }
    return _brain.state != DunyaBrainState.absent && _brain.state != DunyaBrainState.failed;
  }

  /// Stops the current answer (barge-in or user tap).
  Future<void> interrupt() async {
    _cancelled = true;
    await _generation?.cancel();
    _generation = null;
  }

  Stream<DunyaAssistantEvent> reply(String heard, DunyaLanguageMode mode) async* {
    _cancelled = false;
    await _ensureKnowledge();
    final text = heard.trim();
    final detected = skills.detectLanguage(text);
    final inputLang = switch (mode) {
      DunyaLanguageMode.french => 'fr',
      DunyaLanguageMode.bariba => 'bba',
      DunyaLanguageMode.bilingual => detected,
    };
    final replyLang = inputLang;

    // --- Understand: bring Baatɔnum input to French for reasoning -----------------
    var french = text;
    String? notice;
    if (inputLang == 'bba' && text.isNotEmpty) {
      final quickIntent = parseDunyaIntent(text, awaitingConfirmation: skills.pending != null);
      final isConfirmation =
          quickIntent.kind == DunyaIntentKind.confirmYes || quickIntent.kind == DunyaIntentKind.confirmNo;
      if (!isConfirmation) {
        yield const DunyaStatusEvent('Je traduis…');
        final t = await DunyaTranslator.translate(text, toBariba: false);
        if (t != null) {
          french = t.text;
        } else {
          // No translator: Baatɔnum words are looked up in the dictionary.
          notice = 'Le traducteur baatɔnum n’est pas disponible : DUNYA cherche les mots dans le dictionnaire.';
          final lookup = await skills.respond(text, DunyaReplyLanguage.bariba);
          yield* _emitSkillReply(lookup, replyLang, inputLang, notice: notice);
          return;
        }
      }
    }

    // --- Reliable skills -------------------------------------------------------------
    final intent = parseDunyaIntent(french, awaitingConfirmation: skills.pending != null);
    final wantsBrain = !_skillIntents.contains(intent.kind);
    final execution = _settings.execution;
    final connected = onlineAvailable?.call() ?? false;
    final useCloud = wantsBrain && execution != DunyaExecutionMode.offline &&
        connected && cloudBrain != null;
    // Auto uses the FITILA server immediately without downloading Gemma.
    // Explicit Offline never contacts the server.
    var useBrain = wantsBrain && execution != DunyaExecutionMode.online &&
        !useCloud && await brainAvailable();
    if (useCloud) {
      yield const DunyaStatusEvent('Je réfléchis…');
      // Start grounding early, concurrently with remote inference preparation.
      final sourcesFuture = _groundingSources(french);
      String? answer;
      try {
        final historyFuture = mode == DunyaLanguageMode.french
            ? _history(mode) : Future<List<({String role, String text})>>.value(const []);
        final sources = await sourcesFuture;
        answer = await cloudBrain!(
          system: _systemPrompt(mode, replyLang, online: true),
          // Stored Baatɔnum replies are display text, not verified French
          // reasoning history. Passing them to a French-only cloud brain
          // contaminates context. Until bilingual history is persisted with
          // certified French counterparts, keep those turns out of the prompt.
          history: await historyFuture,
          message: _composePrompt(french, sources),
        );
      } catch (_) {
        answer = null;
      }
      final sources = await sourcesFuture;
      if (answer != null && answer.trim().isNotEmpty && !_cancelled) {
        final splitter = DunyaSentenceSplitter();
        final sentences = [...splitter.add(answer), ?splitter.flush()];
        final display = StringBuffer();
        for (final sentence in sentences) {
          if (_cancelled) break;
          final clean = cleanForSpeech(sentence);
          if (clean.isEmpty) continue;
          if (replyLang == 'bba') {
            final t = await DunyaTranslator.translate(clean, toBariba: true);
            if (t != null) {
              display.write('${t.text} ');
              yield DunyaSentenceEvent(DunyaUtterance(t.text, 'bba'), subtitle: clean);
              continue;
            }
            notice ??= 'Traduction vers le baatɔnum indisponible : réponse en français.';
          }
          display.write('$clean ');
          yield DunyaSentenceEvent(DunyaUtterance(clean, 'fr'));
        }
        if (display.isNotEmpty) {
          yield DunyaDoneEvent(
            display: display.toString().trim(),
            inputLanguage: inputLang,
            sources: sources,
            engine: 'cloud',
            notice: notice,
          );
          return;
        }
      }
    }
    if (!useBrain && wantsBrain && execution != DunyaExecutionMode.online) {
      // Server returned no answer: try Gemma only when it is installed.
      useBrain = await brainAvailable();
    }
    if (!useBrain) {
      if (wantsBrain && execution == DunyaExecutionMode.online && !connected) {
        notice ??= 'Internet indisponible : réponse essentielle locale uniquement.';
      }
      final lang = replyLang == 'bba' ? DunyaReplyLanguage.bariba : DunyaReplyLanguage.french;
      final reply = await skills.respond(french, lang);
      yield* _emitSkillReply(reply, replyLang, inputLang, notice: notice);
      return;
    }

    // --- Brain -------------------------------------------------------------------------
    yield DunyaStatusEvent(_brain.state == DunyaBrainState.ready ? 'Je réfléchis…' : 'Je réveille mon cerveau…');
    final sources = await _groundingSources(french);
    // Gemma receives a French reasoning prompt. Do not inject raw Baatonum
    // conversation turns as French context; they may invert intent or meaning.
    // Future bilingual history requires separately verified French equivalents.
    final history = mode == DunyaLanguageMode.french
        ? await _history(mode)
        : <({String role, String text})>[];
    try {
      await _brain.prepareConversation(
        key: '${mode.key}-${(_turns[mode] ?? 0) ~/ 5}',
        system: _systemPrompt(mode, replyLang),
        history: history,
      );
    } catch (error) {
      final reply = await skills.respond(french, replyLang == 'bba' ? DunyaReplyLanguage.bariba : DunyaReplyLanguage.french);
      yield* _emitSkillReply(reply, replyLang, inputLang, notice: 'Cerveau indisponible ($error). Réponse simple.');
      return;
    }

    _turns[mode] = (_turns[mode] ?? 0) + 1;
    final prompt = _composePrompt(french, sources);
    final splitter = DunyaSentenceSplitter();
    final display = StringBuffer();
    final queue = StreamController<String>();
    _generation = _brain.generate(prompt).listen(
          (delta) {
            for (final s in splitter.add(delta)) {
              queue.add(s);
            }
          },
          onError: (Object e) {
            if (!queue.isClosed) queue.addError(e);
          },
          onDone: () {
            final rest = splitter.flush();
            if (rest != null) queue.add(rest);
            queue.close();
          },
          cancelOnError: true,
        );

    var failed = false;
    try {
      await for (final sentence in queue.stream) {
        if (_cancelled) break;
        final clean = cleanForSpeech(sentence);
        if (clean.isEmpty) continue;
        if (replyLang == 'bba') {
          final t = await DunyaTranslator.translate(clean, toBariba: true);
          if (t != null) {
            display.write('${t.text} ');
            yield DunyaSentenceEvent(DunyaUtterance(t.text, 'bba'), subtitle: clean);
          } else {
            notice ??= 'Traduction vers le baatɔnum indisponible : réponse en français.';
            display.write('$clean ');
            yield DunyaSentenceEvent(DunyaUtterance(clean, 'fr'));
          }
        } else {
          display.write('$clean ');
          yield DunyaSentenceEvent(DunyaUtterance(clean, 'fr'));
        }
      }
    } catch (error) {
      failed = true;
      notice = 'Le cerveau s’est interrompu ($error).';
    } finally {
      await _generation?.cancel();
      _generation = null;
    }

    if (display.isEmpty && !_cancelled) {
      final reply = await skills.respond(french, replyLang == 'bba' ? DunyaReplyLanguage.bariba : DunyaReplyLanguage.french);
      yield* _emitSkillReply(reply, replyLang, inputLang, notice: failed ? notice : null);
      return;
    }
    yield DunyaDoneEvent(
      display: display.toString().trim(),
      inputLanguage: inputLang,
      sources: sources,
      engine: 'brain',
      notice: notice,
    );
  }

  Stream<DunyaAssistantEvent> _emitSkillReply(
    DunyaVoiceReply reply,
    String replyLang,
    String inputLang, {
    String? notice,
  }) async* {
    final shown = <String>[];
    for (final u in reply.speech) {
      if (_cancelled) break;
      if (replyLang == 'bba' && u.lang == 'fr') {
        // Strict Baatɔnum mode: translate French skill output when possible.
        final t = await DunyaTranslator.translate(u.text, toBariba: true);
        if (t != null) {
          shown.add(t.text);
          yield DunyaSentenceEvent(DunyaUtterance(t.text, 'bba'), subtitle: u.text);
          continue;
        }
        notice ??= 'Traduction vers le baatɔnum indisponible : réponse en français.';
      }
      shown.add(u.text);
      yield DunyaSentenceEvent(u);
    }
    yield DunyaDoneEvent(
      display: replyLang == 'bba' && shown.isNotEmpty ? shown.join(' ') : reply.display,
      inputLanguage: inputLang,
      sources: reply.sources,
      pending: reply.pending,
      engine: 'skills',
      notice: notice,
    );
  }

  Future<List<DunyaSource>> _groundingSources(String query) async {
    try {
      final found = await knowledge.search(query: query, profileId: 'local-default', limit: 3);
      return found.where((s) => s.text.length > 12).take(3).toList();
    } catch (_) {
      return const [];
    }
  }

  Future<List<({String role, String text})>> _history(DunyaLanguageMode mode) async {
    try {
      final messages = await _store.loadMessages(conversationId: mode.conversationId, limit: 12);
      return [
        for (final m in messages)
          if (m.content.trim().isNotEmpty) (role: m.role == 'user' ? 'user' : 'model', text: m.content),
      ];
    } catch (_) {
      return const [];
    }
  }

  String _systemPrompt(DunyaLanguageMode mode, String replyLang, {bool online = false}) {
    final now = _clock();
    final base = StringBuffer()
      ..writeln(online
          ? 'Tu es DUNYA, l’assistant vocal personnel de FITILA.'
          : 'Tu es DUNYA, l’assistant vocal personnel de FITILA. Tu fonctionnes entièrement sur le téléphone, sans Internet.')
      ..writeln('Tu parles avec des personnes du Nord-Bénin, souvent en milieu rural ; certaines ne savent pas lire.')
      ..writeln('Réponds en français simple et naturel, comme à l’oral : une à quatre phrases courtes.')
      ..writeln('Pas de liste, pas de titre, pas de markdown, pas de symboles, pas d’émojis.')
      ..writeln('Sois chaleureux, respectueux et direct. Si tu ne sais pas, ou si l’information peut avoir changé (actualité, prix, météo), dis-le simplement.')
      ..writeln('Pour la santé, donne des conseils prudents et oriente vers un agent de santé ; ne pose jamais de diagnostic.')
      ..writeln('N’écris jamais de mots en baatɔnum toi-même : un autre module s’occupe de la langue.')
      ..writeln('Utilise les informations FITILA fournies quand elles sont utiles.')
      ..writeln('Date du jour : ${now.day}/${now.month}/${now.year}.');
    if (replyLang == 'bba' || mode == DunyaLanguageMode.bariba) {
      base.writeln('Ta réponse sera traduite en baatɔnum : phrases très courtes, mots simples, sans expressions idiomatiques françaises.');
    }
    return base.toString();
  }

  String _composePrompt(String question, List<DunyaSource> sources) {
    if (sources.isEmpty) return question;
    final context = sources.map((s) => '- ${s.text.replaceAll(RegExp(r'\s+'), ' ').trim()}').take(3).join('\n');
    return 'Informations FITILA (à utiliser seulement si utiles) :\n$context\n\nQuestion : $question';
  }
}

/// Cuts a token stream into speakable sentences.
class DunyaSentenceSplitter {
  final _buffer = StringBuffer();

  List<String> add(String delta) {
    _buffer.write(delta);
    final out = <String>[];
    while (true) {
      final text = _buffer.toString();
      final cut = _findCut(text);
      if (cut < 0) break;
      out.add(text.substring(0, cut + 1).trim());
      _buffer
        ..clear()
        ..write(text.substring(cut + 1));
    }
    return out.where((s) => s.isNotEmpty).toList();
  }

  String? flush() {
    final rest = _buffer.toString().trim();
    _buffer.clear();
    return rest.isEmpty ? null : rest;
  }

  int _findCut(String text) {
    for (var i = 0; i < text.length; i++) {
      final c = text[i];
      final end = c == '.' || c == '!' || c == '?' || c == '…' || c == '\n';
      if (!end) continue;
      final next = i + 1 < text.length ? text[i + 1] : null;
      if (next == null) return -1; // wait: the sentence may continue ("3.5")
      if (c == '\n' || next == ' ' || next == '\n') {
        if (i >= 12 || c == '\n') return i;
      }
    }
    if (text.length > 220) {
      final comma = text.lastIndexOf(', ', 200);
      if (comma > 60) return comma;
    }
    return -1;
  }
}

/// Removes markdown and symbols the voice should not read.
String cleanForSpeech(String text) => text
    .replaceAll(RegExp(r'[*_#`>|~]'), '')
    .replaceAll(RegExp(r'^\s*[-•·]\s*', multiLine: true), '')
    .replaceAllMapped(RegExp(r'\[(.*?)\]\(.*?\)'), (m) => m[1] ?? '')
    .replaceAll(RegExp(r'[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]', unicode: true), '')
    .replaceAll(RegExp(r'\s+'), ' ')
    .trim();
