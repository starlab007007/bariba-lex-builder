import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'package:fitila_native/core/fitila_language.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  test('Flutter shares the attested Web FR/Baatɔnum interface catalogue', () async {
    SharedPreferences.setMockInitialValues({'fitila_language': 'ba'});
    await FitilaLanguage.ensureLoaded();
    expect(FitilaLanguage.translatedKeys, greaterThanOrEqualTo(998));
    expect(FitilaLanguage.isBariba, isTrue);
    expect(
      FitilaLanguage.translate('Traducteur', key: 'sidebar_translator'),
      'Gari tusio',
    );
    expect(
      FitilaLanguage.translate('Dictionnaire', key: 'sidebar_dictionary'),
      'Tire mɛro',
    );
    // Multiple Web modules legitimately provide different translations.
    // They must not be chosen arbitrarily without a scoped source key.
    expect(FitilaLanguage.translate('Traducteur'), 'Traducteur');
    await FitilaLanguage.set('fr');
    expect(FitilaLanguage.translate('Traducteur', key: 'sidebar_translator'),
        'Traducteur');
    await FitilaLanguage.set('ba');
    expect(FitilaLanguage.translate('Classe', key: 'sidebar_classe'), 'Keu');
  });
}
