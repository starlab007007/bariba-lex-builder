import 'dart:convert';

import 'package:flutter/services.dart';

class HanduniaTerritorySelection {
  const HanduniaTerritorySelection({
    this.department,
    this.commune,
    this.arrondissement,
    this.villageQuartier,
  });

  final String? department;
  final String? commune;
  final String? arrondissement;
  final String? villageQuartier;

  String get mostSpecific {
    for (final value in <String?>[
      villageQuartier,
      arrondissement,
      commune,
      department,
    ]) {
      final text = value?.trim() ?? '';
      if (text.isNotEmpty) return text;
    }
    return 'Bénin';
  }

  String get searchQuery {
    final parts = <String>[
      if ((villageQuartier ?? '').trim().isNotEmpty) villageQuartier!.trim(),
      if ((arrondissement ?? '').trim().isNotEmpty) arrondissement!.trim(),
      if ((commune ?? '').trim().isNotEmpty) commune!.trim(),
      if ((department ?? '').trim().isNotEmpty) department!.trim(),
      'Bénin',
    ];
    return parts.join(', ');
  }

  Map<String, dynamic> toMap() => <String, dynamic>{
        'department': department ?? '',
        'commune': commune ?? '',
        'arrondissement': arrondissement ?? '',
        'village_quartier': villageQuartier ?? '',
      };
}

class HanduniaTerritoryRepository {
  HanduniaTerritoryRepository._();

  static const String assetPath = 'assets/data/benin_admin_hierarchy.json';
  static Map<String, dynamic>? _cache;

  static Future<Map<String, dynamic>> _load() async {
    final cached = _cache;
    if (cached != null) return cached;
    final raw = await rootBundle.loadString(assetPath);
    final decoded = jsonDecode(raw);
    if (decoded is! Map) {
      throw const FormatException('Référentiel territorial invalide.');
    }
    final mapped = Map<String, dynamic>.from(decoded);
    _cache = mapped;
    return mapped;
  }

  static Future<Map<String, int>> counts() async {
    final data = await _load();
    final raw = data['counts'];
    if (raw is! Map) return const <String, int>{};
    return raw.map(
      (key, value) => MapEntry(
        key.toString(),
        value is num ? value.toInt() : int.tryParse(value.toString()) ?? 0,
      ),
    );
  }

  static Future<List<String>> departments() async {
    final data = await _load();
    final departments = data['departments'];
    if (departments is! List) return const <String>[];
    return departments
        .whereType<Map>()
        .map((item) => _display(item['name']))
        .where((value) => value.isNotEmpty)
        .toList(growable: false);
  }

  static Future<List<String>> communes(String department) async {
    final dep = await _department(department);
    if (dep == null) return const <String>[];
    final communes = dep['communes'];
    if (communes is! List) return const <String>[];
    return communes
        .whereType<Map>()
        .map((item) => _display(item['name']))
        .where((value) => value.isNotEmpty)
        .toList(growable: false);
  }

  static Future<List<String>> arrondissements({
    required String department,
    required String commune,
  }) async {
    final dep = await _department(department);
    if (dep == null) return const <String>[];
    final communes = dep['communes'];
    if (communes is! List) return const <String>[];
    for (final item in communes.whereType<Map>()) {
      if (_normalize(item['name']) != _normalize(commune)) continue;
      final arrondissements = item['arrondissements'];
      if (arrondissements is! List) return const <String>[];
      return arrondissements
          .map(_display)
          .where((value) => value.isNotEmpty)
          .toList(growable: false);
    }
    return const <String>[];
  }

  static Future<Map<String, dynamic>?> _department(String department) async {
    final data = await _load();
    final departments = data['departments'];
    if (departments is! List) return null;
    for (final item in departments.whereType<Map>()) {
      if (_normalize(item['name']) == _normalize(department)) {
        return Map<String, dynamic>.from(item);
      }
    }
    return null;
  }

  static String _normalize(dynamic value) {
    var text = value?.toString().trim().toLowerCase() ?? '';
    const replacements = <String, String>{
      'à': 'a',
      'á': 'a',
      'â': 'a',
      'ä': 'a',
      'ã': 'a',
      'å': 'a',
      'ç': 'c',
      'è': 'e',
      'é': 'e',
      'ê': 'e',
      'ë': 'e',
      'ì': 'i',
      'í': 'i',
      'î': 'i',
      'ï': 'i',
      'ñ': 'n',
      'ò': 'o',
      'ó': 'o',
      'ô': 'o',
      'ö': 'o',
      'õ': 'o',
      'ù': 'u',
      'ú': 'u',
      'û': 'u',
      'ü': 'u',
      'ý': 'y',
      'ÿ': 'y',
      '’': "'",
    };
    replacements.forEach((from, to) => text = text.replaceAll(from, to));
    return text.replaceAll(RegExp(r'\s+'), ' ');
  }

  static String _display(dynamic value) {
    final raw = value?.toString().trim() ?? '';
    if (raw.isEmpty) return '';
    return raw
        .toLowerCase()
        .split(' ')
        .map(
          (part) => part
              .split('-')
              .map(_capitalize)
              .join('-'),
        )
        .join(' ');
  }

  static String _capitalize(String value) {
    if (value.isEmpty) return value;
    final apostrophe = value.indexOf("'");
    if (apostrophe == 1 && value.length > 2) {
      return value[0].toUpperCase() +
          "'" +
          value[2].toUpperCase() +
          value.substring(3);
    }
    return value[0].toUpperCase() + value.substring(1);
  }
}
