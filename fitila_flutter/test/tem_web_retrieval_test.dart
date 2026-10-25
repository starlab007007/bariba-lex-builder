import 'dart:convert';
import 'dart:io';
import 'package:fitila_native/core/foncier_rag.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  final cases = jsonDecode(File('test/fixtures/tem_web_retrieval.json').readAsStringSync()) as List;
  for (final entry in cases) {
    test('TEM matches the web corpus search: ${entry['query']}', () async {
      final result = await FoncierRag.answer(entry['query'] as String);
      expect(result.answer, entry['answer']);
      expect(result.sources.map((source) => source.id).toList(), entry['sourceIds']);
      expect(result.isFallback, entry['isFallback']);
    });
  }
}
