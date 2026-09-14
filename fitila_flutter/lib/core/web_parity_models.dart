import 'dart:convert';

import 'package:flutter/services.dart';

class WebClasseLesson {
  const WebClasseLesson({
    required this.level,
    required this.id,
    required this.page,
    required this.title,
    required this.theme,
    required this.themeLabel,
    required this.text,
    required this.imageUrl,
    required this.observe,
    required this.ecoute,
    required this.reagis,
    required this.retiens,
    required this.phoneticLabel,
    required this.reading,
    required this.writing,
  });

  final String level;
  final int id;
  final int page;
  final String title;
  final String theme;
  final String themeLabel;
  final String text;
  final String imageUrl;
  final List<String> observe;
  final List<String> ecoute;
  final List<String> reagis;
  final List<String> retiens;
  final String phoneticLabel;
  final List<String> reading;
  final List<String> writing;

  factory WebClasseLesson.fromJson(Map<String, dynamic> json) {
    final sections =
        (json['sections'] as Map?)?.cast<String, dynamic>() ??
        const <String, dynamic>{};
    final phonetics =
        (json['phonetics'] as Map?)?.cast<String, dynamic>() ??
        const <String, dynamic>{};

    List<String> strings(dynamic value) {
      if (value is! List) return const [];
      return value.map((item) => item.toString()).toList(growable: false);
    }

    return WebClasseLesson(
      level: json['level']?.toString() ?? 'N1',
      id: (json['id'] as num?)?.toInt() ?? 0,
      page: (json['page'] as num?)?.toInt() ?? 0,
      title: json['title']?.toString() ?? '',
      theme: json['theme']?.toString() ?? '',
      themeLabel: json['themeLabel']?.toString() ?? '',
      text: json['text']?.toString() ?? '',
      imageUrl: json['imageUrl']?.toString() ?? '',
      observe: strings(sections['observe']),
      ecoute: strings(sections['ecoute']),
      reagis: strings(sections['reagis']),
      retiens: strings(sections['retiens']),
      phoneticLabel: phonetics['label']?.toString() ?? '',
      reading: strings(phonetics['reading']),
      writing: strings(phonetics['writing']),
    );
  }
}

class WebClasseContent {
  WebClasseContent._();

  static Future<List<WebClasseLesson>> loadLessons() async {
    final raw = await rootBundle.loadString(
      'assets/data/classe_web_parity.json',
    );
    final decoded = jsonDecode(raw) as Map<String, dynamic>;
    final rawLessons = decoded['lessons'] as List<dynamic>? ?? const [];
    return rawLessons
        .whereType<Map<String, dynamic>>()
        .map(WebClasseLesson.fromJson)
        .where((lesson) => lesson.id > 0 && lesson.title.isNotEmpty)
        .toList(growable: false);
  }
}
