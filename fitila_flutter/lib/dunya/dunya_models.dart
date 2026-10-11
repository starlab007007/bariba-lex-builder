enum DunyaModelProfile { lite, standard, pro, fallback }

enum DunyaConfidenceStatus { grounded, unverified, uncertain }

class DunyaSource {
  const DunyaSource({
    required this.title,
    required this.text,
    this.ref,
    this.kind = 'knowledge',
  });

  final String title;
  final String text;
  final String? ref;
  final String kind;
}

class DunyaMessage {
  const DunyaMessage({
    required this.role,
    required this.content,
    this.sources = const [],
  });

  final String role;
  final String content;
  final List<DunyaSource> sources;
}

class DunyaResponse {
  const DunyaResponse({
    required this.answer,
    required this.language,
    required this.executionMode,
    required this.modelId,
    required this.sources,
    required this.confidenceStatus,
    required this.needsHumanReview,
    required this.toolsUsed,
    required this.createdAt,
  });

  final String answer;
  final String language;
  final String executionMode;
  final String modelId;
  final List<DunyaSource> sources;
  final DunyaConfidenceStatus confidenceStatus;
  final bool needsHumanReview;
  final List<String> toolsUsed;
  final DateTime createdAt;
}
