enum HanduniaFeedFilter { around, lineage, all }

extension HanduniaFeedFilterUi on HanduniaFeedFilter {
  String get label => switch (this) {
    HanduniaFeedFilter.around => 'Autour de moi',
    HanduniaFeedFilter.lineage => 'Ma lignée',
    HanduniaFeedFilter.all => 'À découvrir',
  };

  String get backendValue => switch (this) {
    HanduniaFeedFilter.around => 'around',
    HanduniaFeedFilter.lineage => 'lineage',
    HanduniaFeedFilter.all => 'all',
  };
}

String handuniaInitials(String value) {
  final parts = value
      .trim()
      .split(RegExp(r'\s+'))
      .where((part) => part.isNotEmpty)
      .toList(growable: false);
  if (parts.isEmpty) {
    return 'HW';
  }
  if (parts.length == 1) {
    final word = parts.first;
    return word.substring(0, word.length >= 2 ? 2 : 1).toUpperCase();
  }
  return (parts.first.substring(0, 1) + parts.last.substring(0, 1))
      .toUpperCase();
}

/// Une voix humaine ne compte qu'une fois, même si l'auteur du souvenir
/// apparaît aussi dans la table de corroboration. La métrique exprime la
/// concordance de témoins distincts, jamais une somme d'interactions.
int handuniaDistinctVoiceCount(
  String? authorId,
  Iterable<String> corroboratorIds,
) {
  final voices = <String>{
    if (authorId != null && authorId.trim().isNotEmpty) authorId.trim(),
    ...corroboratorIds.where((id) => id.trim().isNotEmpty).map((id) => id.trim()),
  };
  return voices.isEmpty ? 1 : voices.length;
}

DateTime _handuniaDate(dynamic value) {
  return DateTime.tryParse(value?.toString() ?? '') ??
      DateTime.fromMillisecondsSinceEpoch(0, isUtc: true);
}

double _handuniaDistance(dynamic value) {
  return (value as num?)?.toDouble() ?? double.infinity;
}

/// Ordre métier du fil, sans aucune métrique d'engagement :
/// 1. proximité géographique ; 2. corroboration la plus fraîche ;
/// 3. lacune comblée ; 4. fraîcheur du souvenir comme départage.
int compareHanduniaFeedItems(
  Map<String, dynamic> a,
  Map<String, dynamic> b,
) {
  final byDistance = _handuniaDistance(
    a['distance_m'],
  ).compareTo(_handuniaDistance(b['distance_m']));
  if (byDistance != 0) {
    return byDistance;
  }

  final byCorroboration = _handuniaDate(
    b['latest_corroboration_at'],
  ).compareTo(_handuniaDate(a['latest_corroboration_at']));
  if (byCorroboration != 0) {
    return byCorroboration;
  }

  final aFilled = a['lacuna_filled'] == true;
  final bFilled = b['lacuna_filled'] == true;
  if (aFilled != bFilled) {
    return aFilled ? -1 : 1;
  }

  return _handuniaDate(b['created_at']).compareTo(
    _handuniaDate(a['created_at']),
  );
}
