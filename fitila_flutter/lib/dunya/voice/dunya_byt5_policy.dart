/// A downloaded file is not evidence of linguistic quality.
bool mayUseByt5Manifest(Map<String, dynamic> manifest, {required bool experimentalConsent}) {
  if (manifest['id'] != 'dunya-translate-byt5' || manifest['format'] != 'dunya-pack/1') return false;
  final certified = manifest['tested'] == true &&
      manifest['certification'] == 'fr-bba-bidirectional-android-v1' &&
      (manifest['evaluation_report_sha256'] as String? ?? '').isNotEmpty;
  final beta = manifest['tested'] == false && manifest['channel'] == 'beta';
  return certified || beta && experimentalConsent;
}
