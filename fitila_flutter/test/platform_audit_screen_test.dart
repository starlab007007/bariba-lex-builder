import 'package:fitila_native/admin/platform_audit_screen.dart';
import 'package:fitila_native/core/signature_theme.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

Map<String, dynamic> _row({
  required String id,
  String createdAt = '2026-10-23T10:00:00.000Z',
  String? actor,
  String? actorLabel,
  required String module,
  required String eventType,
  String severity = 'info',
  Map<String, dynamic> details = const {},
}) => {
  'id': id,
  'created_at': createdAt,
  'actor': actor,
  'actor_label': actorLabel,
  'module': module,
  'event_type': eventType,
  'severity': severity,
  'details': details,
  'client': 'flutter_android',
};

class _Call {
  _Call(this.module, this.severity, this.search, this.limit, this.offset);
  final String? module;
  final String? severity;
  final String? search;
  final int limit;
  final int offset;
}

Future<void> _pump(WidgetTester tester, Widget child) async {
  await tester.pumpWidget(MaterialApp(theme: SignatureTheme.light(), home: child));
  await tester.pumpAndSettle();
}

/// Avec une page pleine (40 lignes), le bouton « Charger plus » est tout en
/// bas d'un `ListView` long : tant qu'il n'a pas été défilé dans la zone
/// construite par le sliver (+ cache), `find.text` le trouve à zéro widget
/// — même principe que `_tapSend` dans `word_proposal_sheet_test.dart`.
Future<void> _scrollToLoadMore(WidgetTester tester) async {
  final list = find.byKey(const ValueKey('audit-list'));
  for (var i = 0; i < 20 && find.text('Charger plus').evaluate().isEmpty; i++) {
    await tester.drag(list, const Offset(0, -300));
    await tester.pump(const Duration(milliseconds: 50));
  }
}

void main() {
  testWidgets('shows the fetched entries once loaded', (tester) async {
    await _pump(
      tester,
      PlatformAuditScreen(
        fetch: ({module, severity, search, required limit, required offset}) async => [
          _row(id: '1', module: 'auth', eventType: 'login', actorLabel: 'Zime'),
          _row(id: '2', module: 'dunya_voice', eventType: 'dunya_voice_error', severity: 'error', actor: 'u1'),
        ],
      ),
    );

    expect(find.text('login'), findsOneWidget);
    expect(find.text('Zime'), findsOneWidget);
    expect(find.text('dunya voice error'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('shows an empty state when nothing matches the filters', (tester) async {
    await _pump(
      tester,
      PlatformAuditScreen(fetch: ({module, severity, search, required limit, required offset}) async => []),
    );

    expect(find.text('Aucune activité pour ces filtres.'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('shows a retry button when the read fails, and retries on tap', (tester) async {
    var calls = 0;
    await _pump(
      tester,
      PlatformAuditScreen(
        fetch: ({module, severity, search, required limit, required offset}) async {
          calls++;
          if (calls == 1) throw Exception('network down');
          return [_row(id: '1', module: 'auth', eventType: 'login')];
        },
      ),
    );

    expect(find.text('Réessayer'), findsOneWidget);
    await tester.tap(find.text('Réessayer'));
    await tester.pumpAndSettle();
    expect(find.text('login'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('re-reads with the chosen module and severity filters', (tester) async {
    final calls = <_Call>[];
    await _pump(
      tester,
      PlatformAuditScreen(
        fetch: ({module, severity, search, required limit, required offset}) async {
          calls.add(_Call(module, severity, search, limit, offset));
          return [_row(id: '1', module: module ?? 'auth', eventType: 'login', severity: severity ?? 'info')];
        },
      ),
    );
    expect(calls.single.module, isNull);
    expect(calls.single.severity, isNull);

    await tester.tap(find.byKey(const ValueKey('audit-module-auth')));
    await tester.pumpAndSettle();
    expect(calls.last.module, 'auth');

    await tester.tap(find.text('Erreur'));
    await tester.pumpAndSettle();
    expect(calls.last.severity, 'error');
    expect(calls.last.module, 'auth');
    expect(tester.takeException(), isNull);
  });

  testWidgets('opens the detail sheet for an entry with details', (tester) async {
    await _pump(
      tester,
      PlatformAuditScreen(
        fetch: ({module, severity, search, required limit, required offset}) async => [
          _row(id: '1', module: 'auth', eventType: 'login_failed', severity: 'warning', details: {'reason': 'bad_credentials'}),
        ],
      ),
    );

    await tester.tap(find.byKey(const ValueKey('audit-row-1')));
    await tester.pumpAndSettle();
    expect(find.text('login failed'), findsWidgets);
    expect(find.textContaining('bad_credentials'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('loads the next page on "Charger plus"', (tester) async {
    var pages = 0;
    await _pump(
      tester,
      PlatformAuditScreen(
        fetch: ({module, severity, search, required limit, required offset}) async {
          pages++;
          return List.generate(limit, (i) => _row(id: 'p$pages-$i', module: 'auth', eventType: 'login'));
        },
      ),
    );

    await _scrollToLoadMore(tester);
    expect(find.text('Charger plus'), findsOneWidget);
    await tester.tap(find.text('Charger plus'));
    await tester.pumpAndSettle();
    expect(pages, 2);
    expect(tester.takeException(), isNull);
  });
}
