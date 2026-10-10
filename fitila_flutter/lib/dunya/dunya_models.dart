class DunyaSource {
  const DunyaSource({required this.title, required this.text});
  final String title;
  final String text;
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
