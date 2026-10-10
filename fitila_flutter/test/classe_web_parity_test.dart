import 'package:fitila_native/core/web_parity_models.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  test('Classe web parity preserves all page 64 pedagogical figures', () async {
    final lessons = await WebClasseContent.loadLessons();
    final lesson = lessons.singleWhere((l) => l.level == 'N1' && l.id == 23);
    expect(lesson.page, 64);
    expect(lesson.imageUrl, '/classe/img-p064.png');
    expect(lesson.imageUrls, [
      '/classe/img-p064.png',
      '/classe/img-p064-1.png',
    ]);
  });

  test('legacy single-image lessons keep a one-item image list', () async {
    final lessons = await WebClasseContent.loadLessons();
    final lesson = lessons.singleWhere((l) => l.level == 'N1' && l.id == 1);
    expect(lesson.imageUrl, isNotEmpty);
    expect(lesson.imageUrls, [lesson.imageUrl]);
  });
}
