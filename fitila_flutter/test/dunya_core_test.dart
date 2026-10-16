import 'package:flutter_test/flutter_test.dart';
import 'package:fitila_native/dunya/dunya_core.dart';
import 'package:fitila_native/dunya/dunya_models.dart';

class _FakeKnowledge implements DunyaKnowledgeRepository {
  _FakeKnowledge(this.sources);

  final List<DunyaSource> sources;

  @override
  int get dictionaryCount => 1;

  @override
  Future<void> initialize() async {}

  @override
  Future<List<DunyaSource>> search({
    required String query,
    required String profileId,
    int limit = 8,
  }) async {
    return sources.take(limit).toList(growable: false);
  }
}

Future<String> _collect(Stream<String> stream) async {
  final buffer = StringBuffer();
  await for (final chunk in stream) {
    buffer.write(chunk);
  }
  return buffer.toString();
}

void main() {
  test('DUNYA routes a grounded answer entirely through local adapters', () async {
    final knowledge = _FakeKnowledge(const [
      DunyaSource(
        title: 'Dictionnaire FITILA · alaafia',
        text: 'alaafia — bien-être, bonne santé',
        kind: 'dictionary',
      ),
    ]);
    final engine = DunyaFallbackInferenceEngine();
    final router = DunyaIntelligenceRouter(
      knowledge: knowledge,
      fallbackEngine: engine,
    );

    final routed = await router.route(
      query: 'Que signifie alaafia ?',
      history: const [],
    );
    final answer = await _collect(routed.stream);

    expect(routed.metadata.executionMode, 'offline');
    expect(routed.metadata.modelId, 'dunya-fallback');
    expect(routed.metadata.confidenceStatus, DunyaConfidenceStatus.grounded);
    expect(routed.metadata.sources, isNotEmpty);
    expect(routed.metadata.toolsUsed, contains('search_knowledge'));
    expect(answer, contains('alaafia'));
  });

  test('DUNYA refuses to invent a source when local knowledge is empty', () async {
    final router = DunyaIntelligenceRouter(
      knowledge: _FakeKnowledge(const []),
      fallbackEngine: DunyaFallbackInferenceEngine(),
    );

    final routed = await router.route(
      query: 'Question sans source locale',
      history: const [],
    );
    final answer = await _collect(routed.stream);

    expect(routed.metadata.executionMode, 'offline');
    expect(routed.metadata.confidenceStatus, DunyaConfidenceStatus.unverified);
    expect(routed.metadata.sources, isEmpty);
    expect(answer, contains('préfère ne pas inventer'));
  });

  test('DUNYA detects Bàátɔ̀nú text locally', () async {
    final router = DunyaIntelligenceRouter(
      knowledge: _FakeKnowledge(const []),
      fallbackEngine: DunyaFallbackInferenceEngine(),
    );

    final routed = await router.route(
      query: 'sɔ̃ɔ yɛ̃',
      history: const [],
    );

    expect(routed.metadata.language, 'bba');
  });
}
