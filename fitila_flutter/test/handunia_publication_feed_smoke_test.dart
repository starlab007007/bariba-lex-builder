import 'package:fitila_native/handunia/handunia_consultation_ui.dart';
import 'package:fitila_native/handunia/handunia_consultation_model.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('Handunia publication CTA remains visible in the feed', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(390, 844);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    var tapped = false;
    await tester.pumpWidget(
      MaterialApp(
        home: MediaQuery(
          data: const MediaQueryData(textScaler: TextScaler.linear(1.25)),
          child: HanduniaFilView(
            items: const <Map<String, dynamic>>[],
            loading: false,
            offline: false,
            filter: HanduniaFeedFilter.all,
            pendingCount: 0,
            onBack: () {},
            onRefresh: () async {},
            onFilterChanged: (_) {},
            onOpenMemory: (_) {},
            onFindMissingVoice: () {},
            onPublish: () => tapped = true,
          ),
        ),
      ),
    );
    await tester.pump();

    expect(find.text('Le fil'), findsOneWidget);
    expect(find.text('PUBLIER UN SOUVENIR'), findsOneWidget);
    await tester.tap(find.text('PUBLIER UN SOUVENIR'));
    await tester.pump();
    expect(tapped, isTrue);
    expect(tester.takeException(), isNull);
  });
}
