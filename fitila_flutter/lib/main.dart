import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:http/http.dart' as http;

void main() {
  runApp(const FitilaApp());
}

const _fitilaOrange = Color(0xFFFF7A00);
const _fitilaInk = Color(0xFF101114);
const _fitilaSurface = Color(0xFFF6F2EA);
const _supabaseUrl = 'https://pmrhezgnyffiskbaiudb.supabase.co';
const _baribaLetters = [
  'ɛ',
  'Ɛ',
  'ɔ',
  'Ɔ',
  'ŋ',
  'Ŋ',
  'ɲ',
  'Ɲ',
  'ã',
  'ẽ',
  'ĩ',
  'ɔ̃',
  'ũ',
  'ǹ',
  'à',
  'á',
  'è',
  'é',
  'ì',
  'í',
  'ò',
  'ó',
  'ù',
  'ú',
];

class FitilaApp extends StatelessWidget {
  const FitilaApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      title: 'FITILA',
      theme: ThemeData(
        useMaterial3: true,
        fontFamily: 'Roboto',
        colorScheme: ColorScheme.fromSeed(
          seedColor: _fitilaOrange,
          brightness: Brightness.light,
          surface: _fitilaSurface,
        ),
        scaffoldBackgroundColor: _fitilaSurface,
        appBarTheme: const AppBarTheme(
          centerTitle: false,
          elevation: 0,
          scrolledUnderElevation: 0,
          backgroundColor: _fitilaSurface,
          foregroundColor: _fitilaInk,
        ),
        cardTheme: CardThemeData(
          color: Colors.white,
          elevation: 0,
          margin: EdgeInsets.zero,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
        ),
        filledButtonTheme: FilledButtonThemeData(
          style: FilledButton.styleFrom(
            backgroundColor: _fitilaOrange,
            foregroundColor: Colors.white,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(8),
            ),
            minimumSize: const Size(48, 48),
          ),
        ),
        inputDecorationTheme: InputDecorationTheme(
          filled: true,
          fillColor: Colors.white,
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(8),
            borderSide: const BorderSide(color: Color(0xFFE7DDD0)),
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(8),
            borderSide: const BorderSide(color: Color(0xFFE7DDD0)),
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(8),
            borderSide: const BorderSide(color: _fitilaOrange, width: 1.5),
          ),
        ),
      ),
      home: const AuthGate(),
    );
  }
}

class AuthGate extends StatefulWidget {
  const AuthGate({super.key});

  @override
  State<AuthGate> createState() => _AuthGateState();
}

class _AuthGateState extends State<AuthGate> {
  FitilaSession? _session;

  @override
  Widget build(BuildContext context) {
    return _session == null
        ? AuthScreen(
            onSignedIn: (session) => setState(() => _session = session),
          )
        : FitilaShell(
            session: _session!,
            onSignedOut: () => setState(() => _session = null),
          );
  }
}

class FitilaSession {
  const FitilaSession({
    required this.phone,
    required this.displayName,
    required this.role,
  });

  final String phone;
  final String displayName;
  final String role;
}

class DictionaryEntry {
  const DictionaryEntry({
    required this.word,
    required this.definition,
    this.phonetic,
    this.partOfSpeech,
    this.exampleBariba,
    this.exampleFrancais,
  });

  final String word;
  final String definition;
  final String? phonetic;
  final String? partOfSpeech;
  final String? exampleBariba;
  final String? exampleFrancais;

  factory DictionaryEntry.fromJson(Map<String, dynamic> json) {
    return DictionaryEntry(
      word: (json['word'] ?? json['bariba'] ?? '').toString().trim(),
      definition: (json['definition'] ?? json['french'] ?? '')
          .toString()
          .trim(),
      phonetic: json['phonetic']?.toString().trim(),
      partOfSpeech: json['part_of_speech']?.toString().trim(),
      exampleBariba: json['example_bariba']?.toString().trim(),
      exampleFrancais: json['example_francais']?.toString().trim(),
    );
  }
}

class FeedPost {
  FeedPost({
    required this.author,
    required this.kind,
    required this.content,
    required this.accent,
    this.likes = 0,
    this.comments = 0,
  });

  final String author;
  final String kind;
  final String content;
  final Color accent;
  int likes;
  int comments;
}

class LessonCardData {
  const LessonCardData({
    required this.level,
    required this.module,
    required this.title,
    required this.summary,
    required this.progress,
    required this.questions,
  });

  final String level;
  final String module;
  final String title;
  final String summary;
  final double progress;
  final List<String> questions;
}

class FitilaServices {
  static Future<List<DictionaryEntry>> loadDictionary() async {
    final raw = await rootBundle.loadString(
      'assets/data/dictionnaire_ameliore.json',
    );
    final list = (jsonDecode(raw) as List).cast<Map<String, dynamic>>();
    return list
        .map(DictionaryEntry.fromJson)
        .where((entry) => entry.word.isNotEmpty && entry.definition.isNotEmpty)
        .toList(growable: false);
  }

  static Future<String> translate(
    String text,
    TranslationDirection direction,
  ) async {
    final trimmed = text.trim();
    if (trimmed.isEmpty) return '';
    try {
      final response = await http
          .post(
            Uri.parse('$_supabaseUrl/functions/v1/translate'),
            headers: {'content-type': 'application/json'},
            body: jsonEncode({'text': trimmed, 'direction': direction.name}),
          )
          .timeout(const Duration(seconds: 5));
      if (response.statusCode >= 200 && response.statusCode < 300) {
        final decoded = jsonDecode(response.body);
        final translated = decoded['translation'] ?? decoded['translatedText'];
        if (translated != null && translated.toString().trim().isNotEmpty) {
          return translated.toString();
        }
      }
    } catch (_) {
      // Offline fallback keeps the experience usable when the API is not reachable.
    }
    final marker = direction == TranslationDirection.frenchToBariba
        ? 'Bariba'
        : 'Français';
    return '$marker: $trimmed';
  }
}

enum TranslationDirection { frenchToBariba, baribaToFrench }

enum FitilaPage {
  feed,
  dictionary,
  translator,
  ia,
  learn,
  classe,
  keyboard,
  voiceLab,
  teacher,
  profile,
  settings,
}

extension FitilaPageMeta on FitilaPage {
  String get title {
    return switch (this) {
      FitilaPage.feed => 'Fil',
      FitilaPage.dictionary => 'Dictionnaire',
      FitilaPage.translator => 'Traducteur',
      FitilaPage.ia => 'IA',
      FitilaPage.learn => 'Apprendre',
      FitilaPage.classe => 'Classe',
      FitilaPage.keyboard => 'Clavier',
      FitilaPage.voiceLab => 'Voice Lab',
      FitilaPage.teacher => 'Enseignant',
      FitilaPage.profile => 'Profil',
      FitilaPage.settings => 'Paramètres',
    };
  }

  String get description {
    return switch (this) {
      FitilaPage.feed => 'Publications, vidéos, audios et templates',
      FitilaPage.dictionary => 'Recherche Bariba-Français avec détails',
      FitilaPage.translator => 'Traduction IA bidirectionnelle',
      FitilaPage.ia => 'Assistant conversationnel Fitila',
      FitilaPage.learn => 'Cours guidés et parcours culture',
      FitilaPage.classe => 'Niveaux, exercices, notes et corrections',
      FitilaPage.keyboard => 'Clavier natif Bariba intégré',
      FitilaPage.voiceLab => 'TTS, STT et corpus vocal',
      FitilaPage.teacher => 'Suivi enseignant et correction',
      FitilaPage.profile => 'Identité, posts et statistiques',
      FitilaPage.settings => 'Langue, sécurité et préférences',
    };
  }

  IconData get icon {
    return switch (this) {
      FitilaPage.feed => Icons.dynamic_feed_rounded,
      FitilaPage.dictionary => Icons.menu_book_rounded,
      FitilaPage.translator => Icons.translate_rounded,
      FitilaPage.ia => Icons.auto_awesome_rounded,
      FitilaPage.learn => Icons.school_rounded,
      FitilaPage.classe => Icons.assignment_rounded,
      FitilaPage.keyboard => Icons.keyboard_alt_rounded,
      FitilaPage.voiceLab => Icons.graphic_eq_rounded,
      FitilaPage.teacher => Icons.workspace_premium_rounded,
      FitilaPage.profile => Icons.person_rounded,
      FitilaPage.settings => Icons.settings_rounded,
    };
  }
}

class AuthScreen extends StatefulWidget {
  const AuthScreen({super.key, required this.onSignedIn});

  final ValueChanged<FitilaSession> onSignedIn;

  @override
  State<AuthScreen> createState() => _AuthScreenState();
}

class _AuthScreenState extends State<AuthScreen> {
  final _phone = TextEditingController(text: '65653468');
  final _password = TextEditingController(text: '123456');
  bool _busy = false;
  bool _obscure = true;

  @override
  void dispose() {
    _phone.dispose();
    _password.dispose();
    super.dispose();
  }

  Future<void> _signIn() async {
    setState(() => _busy = true);
    await Future<void>.delayed(const Duration(milliseconds: 500));
    if (!mounted) return;
    final phone = _phone.text.trim();
    final password = _password.text.trim();
    setState(() => _busy = false);
    if (phone == '65653468' && password == '123456') {
      widget.onSignedIn(
        FitilaSession(
          phone: phone,
          displayName: 'Utilisateur Fitila',
          role: 'Apprenant',
        ),
      );
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Identifiants invalides pour cette session de test.'),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final wide = MediaQuery.sizeOf(context).width > 760;
    final hero = _HeroPanel(
      title: 'FITILA',
      subtitle:
          'Langue Bariba, culture, classe et IA dans une expérience native.',
    );
    final form = _authCard();
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 1060),
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: wide
                  ? Row(
                      children: [
                        Expanded(child: hero),
                        const SizedBox(width: 22),
                        Expanded(child: form),
                      ],
                    )
                  : ListView(
                      children: [
                        SizedBox(height: 340, child: hero),
                        const SizedBox(height: 18),
                        form,
                      ],
                    ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _authCard() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(22),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Text(
              'Connexion',
              style: TextStyle(fontSize: 28, fontWeight: FontWeight.w900),
            ),
            const SizedBox(height: 6),
            Text(
              'Accès mobile synchronisé avec le parcours web Fitila.',
              style: TextStyle(color: Colors.grey.shade700),
            ),
            const SizedBox(height: 22),
            TextField(
              controller: _phone,
              keyboardType: TextInputType.phone,
              decoration: const InputDecoration(
                labelText: 'Téléphone ou identifiant',
                prefixIcon: Icon(Icons.phone_rounded),
              ),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _password,
              obscureText: _obscure,
              decoration: InputDecoration(
                labelText: 'Mot de passe',
                prefixIcon: const Icon(Icons.lock_rounded),
                suffixIcon: IconButton(
                  tooltip: _obscure ? 'Afficher' : 'Masquer',
                  onPressed: () => setState(() => _obscure = !_obscure),
                  icon: Icon(
                    _obscure
                        ? Icons.visibility_rounded
                        : Icons.visibility_off_rounded,
                  ),
                ),
              ),
              onSubmitted: (_) => _signIn(),
            ),
            const SizedBox(height: 16),
            FilledButton.icon(
              onPressed: _busy ? null : _signIn,
              icon: _busy
                  ? const SizedBox.square(
                      dimension: 18,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Icon(Icons.login_rounded),
              label: const Text('Se connecter'),
            ),
            const SizedBox(height: 16),
            const Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                _StatusChip(
                  icon: Icons.shield_rounded,
                  label: 'Sécurité visuelle',
                ),
                _StatusChip(
                  icon: Icons.offline_bolt_rounded,
                  label: 'Mode offline',
                ),
                _StatusChip(
                  icon: Icons.keyboard_alt_rounded,
                  label: 'Clavier Bariba',
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class FitilaShell extends StatefulWidget {
  const FitilaShell({
    super.key,
    required this.session,
    required this.onSignedOut,
  });

  final FitilaSession session;
  final VoidCallback onSignedOut;

  @override
  State<FitilaShell> createState() => _FitilaShellState();
}

class _FitilaShellState extends State<FitilaShell> {
  FitilaPage _page = FitilaPage.feed;
  late final List<FeedPost> _posts = [
    FeedPost(
      author: 'Radio Village',
      kind: 'audio',
      content:
          'Capsule du matin: saluer, remercier et demander son chemin en Bàátɔ̀nú.',
      accent: Colors.deepOrange,
      likes: 42,
      comments: 7,
    ),
    FeedPost(
      author: 'Classe FITILA',
      kind: 'vidéo',
      content: 'Niveau 1: alphabet, tons et premières phrases utiles.',
      accent: Colors.teal,
      likes: 31,
      comments: 4,
    ),
    FeedPost(
      author: 'Tem IA',
      kind: 'template',
      content:
          'Comprendre les articles fonciers avec sources citées et résumé bilingue.',
      accent: Colors.indigo,
      likes: 68,
      comments: 12,
    ),
  ];

  Widget _screenFor(FitilaPage page) {
    return switch (page) {
      FitilaPage.feed => FeedScreen(
        posts: _posts,
        onPostCreated: (post) => setState(() => _posts.insert(0, post)),
      ),
      FitilaPage.dictionary => const DictionaryScreen(),
      FitilaPage.translator => const TranslatorScreen(),
      FitilaPage.ia => const AiScreen(),
      FitilaPage.learn => const LearnScreen(),
      FitilaPage.classe => const ClasseScreen(),
      FitilaPage.keyboard => const KeyboardScreen(),
      FitilaPage.voiceLab => const VoiceLabScreen(),
      FitilaPage.teacher => const TeacherScreen(),
      FitilaPage.profile => ProfileScreen(session: widget.session),
      FitilaPage.settings => SettingsScreen(onSignedOut: widget.onSignedOut),
    };
  }

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final wide = constraints.maxWidth >= 980;
        return Scaffold(
          appBar: wide
              ? null
              : AppBar(
                  title: Text(_page.title),
                  actions: [
                    IconButton(
                      tooltip: 'Profil',
                      onPressed: () =>
                          setState(() => _page = FitilaPage.profile),
                      icon: const Icon(Icons.account_circle_rounded),
                    ),
                  ],
                ),
          drawer: wide
              ? null
              : Drawer(
                  child: _NavigationPanel(
                    page: _page,
                    session: widget.session,
                    onSelected: (page) {
                      Navigator.pop(context);
                      setState(() => _page = page);
                    },
                  ),
                ),
          body: Row(
            children: [
              if (wide)
                SizedBox(
                  width: 304,
                  child: _NavigationPanel(
                    page: _page,
                    session: widget.session,
                    onSelected: (page) => setState(() => _page = page),
                  ),
                ),
              Expanded(
                child: SafeArea(
                  child: Column(
                    children: [
                      if (wide)
                        _DesktopTopBar(
                          page: _page,
                          session: widget.session,
                          onProfile: () =>
                              setState(() => _page = FitilaPage.profile),
                        ),
                      Expanded(
                        child: AnimatedSwitcher(
                          duration: const Duration(milliseconds: 220),
                          child: KeyedSubtree(
                            key: ValueKey(_page),
                            child: _screenFor(_page),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
          floatingActionButton: _page == FitilaPage.feed
              ? FloatingActionButton.extended(
                  backgroundColor: _fitilaOrange,
                  foregroundColor: Colors.white,
                  onPressed: () => FeedScreen.showComposer(
                    context,
                    onPostCreated: (post) =>
                        setState(() => _posts.insert(0, post)),
                  ),
                  icon: const Icon(Icons.add_rounded),
                  label: const Text('Créer'),
                )
              : null,
        );
      },
    );
  }
}

class _NavigationPanel extends StatelessWidget {
  const _NavigationPanel({
    required this.page,
    required this.session,
    required this.onSelected,
  });

  final FitilaPage page;
  final FitilaSession session;
  final ValueChanged<FitilaPage> onSelected;

  @override
  Widget build(BuildContext context) {
    final primary = [
      FitilaPage.feed,
      FitilaPage.dictionary,
      FitilaPage.translator,
      FitilaPage.ia,
      FitilaPage.learn,
      FitilaPage.classe,
    ];
    final tools = [
      FitilaPage.keyboard,
      FitilaPage.voiceLab,
      FitilaPage.teacher,
      FitilaPage.profile,
      FitilaPage.settings,
    ];
    return DecoratedBox(
      decoration: const BoxDecoration(color: _fitilaInk),
      child: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Row(
              children: [
                Container(
                  width: 44,
                  height: 44,
                  alignment: Alignment.center,
                  decoration: BoxDecoration(
                    color: _fitilaOrange,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: const Text(
                    'F',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 24,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                const Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'FITILA',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 20,
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                      Text(
                        'Bàátɔ̀nú + IA',
                        style: TextStyle(color: Colors.white60, fontSize: 12),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 18),
            _ProfileTile(session: session),
            const SizedBox(height: 18),
            const _SectionLabel('Navigation'),
            ...primary.map(
              (item) => _NavItem(
                page: item,
                selected: item == page,
                onTap: () => onSelected(item),
              ),
            ),
            const SizedBox(height: 16),
            const _SectionLabel('Outils'),
            ...tools.map(
              (item) => _NavItem(
                page: item,
                selected: item == page,
                onTap: () => onSelected(item),
              ),
            ),
            const SizedBox(height: 18),
            const _LanguageSwitch(),
          ],
        ),
      ),
    );
  }
}

class FeedScreen extends StatelessWidget {
  const FeedScreen({
    super.key,
    required this.posts,
    required this.onPostCreated,
  });

  final List<FeedPost> posts;
  final ValueChanged<FeedPost> onPostCreated;

  static Future<void> showComposer(
    BuildContext context, {
    required ValueChanged<FeedPost> onPostCreated,
  }) async {
    await showModalBottomSheet<void>(
      context: context,
      showDragHandle: true,
      isScrollControlled: true,
      builder: (_) => _CreatePostSheet(onPostCreated: onPostCreated),
    );
  }

  @override
  Widget build(BuildContext context) {
    return _PageFrame(
      title: 'Fil Fitila',
      subtitle: 'Posts, audio, vidéos, modèles et publication rapide.',
      action: FilledButton.icon(
        onPressed: () => showComposer(context, onPostCreated: onPostCreated),
        icon: const Icon(Icons.add_rounded),
        label: const Text('Nouveau post'),
      ),
      child: LayoutBuilder(
        builder: (context, constraints) {
          final grid = constraints.maxWidth > 860;
          return grid
              ? GridView.builder(
                  itemCount: posts.length,
                  gridDelegate: const SliverGridDelegateWithMaxCrossAxisExtent(
                    maxCrossAxisExtent: 420,
                    mainAxisExtent: 292,
                    crossAxisSpacing: 14,
                    mainAxisSpacing: 14,
                  ),
                  itemBuilder: (context, index) =>
                      _PostCard(post: posts[index]),
                )
              : ListView.separated(
                  itemCount: posts.length,
                  separatorBuilder: (context, index) =>
                      const SizedBox(height: 12),
                  itemBuilder: (context, index) =>
                      _PostCard(post: posts[index]),
                );
        },
      ),
    );
  }
}

class DictionaryScreen extends StatefulWidget {
  const DictionaryScreen({super.key});

  @override
  State<DictionaryScreen> createState() => _DictionaryScreenState();
}

class _DictionaryScreenState extends State<DictionaryScreen> {
  late Future<List<DictionaryEntry>> _entries;
  final _query = TextEditingController();
  String _filter = 'Tout';

  @override
  void initState() {
    super.initState();
    _entries = FitilaServices.loadDictionary();
    _query.addListener(() => setState(() {}));
  }

  @override
  void dispose() {
    _query.dispose();
    super.dispose();
  }

  List<DictionaryEntry> _filterEntries(List<DictionaryEntry> entries) {
    final q = _query.text.trim().toLowerCase();
    final filtered = q.isEmpty
        ? entries.take(60).toList()
        : entries
              .where((entry) {
                final haystack =
                    '${entry.word} ${entry.definition} ${entry.exampleBariba ?? ''}'
                        .toLowerCase();
                return haystack.contains(q);
              })
              .take(80)
              .toList();
    if (_filter == 'Mots') {
      return filtered
          .where((entry) => entry.word.split(' ').length == 1)
          .toList();
    }
    if (_filter == 'Expressions') {
      return filtered
          .where((entry) => entry.word.split(' ').length > 1)
          .toList();
    }
    return filtered;
  }

  @override
  Widget build(BuildContext context) {
    return _PageFrame(
      title: 'Dictionnaire',
      subtitle:
          'Recherche intelligente, détails, exemples, contribution et écoute.',
      child: Column(
        children: [
          Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _query,
                  decoration: const InputDecoration(
                    hintText:
                        'Chercher un mot, une définition ou une expression',
                    prefixIcon: Icon(Icons.search_rounded),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              IconButton.filledTonal(
                tooltip: 'Contribution',
                onPressed: () => _showContribution(context),
                icon: const Icon(Icons.edit_note_rounded),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Align(
            alignment: Alignment.centerLeft,
            child: SegmentedButton<String>(
              segments: const [
                ButtonSegment(
                  value: 'Tout',
                  label: Text('Tout'),
                  icon: Icon(Icons.all_inclusive_rounded),
                ),
                ButtonSegment(
                  value: 'Mots',
                  label: Text('Mots'),
                  icon: Icon(Icons.short_text_rounded),
                ),
                ButtonSegment(
                  value: 'Expressions',
                  label: Text('Expressions'),
                  icon: Icon(Icons.notes_rounded),
                ),
              ],
              selected: {_filter},
              onSelectionChanged: (values) =>
                  setState(() => _filter = values.first),
            ),
          ),
          const SizedBox(height: 12),
          Expanded(
            child: FutureBuilder<List<DictionaryEntry>>(
              future: _entries,
              builder: (context, snapshot) {
                if (!snapshot.hasData) {
                  return const Center(child: CircularProgressIndicator());
                }
                final results = _filterEntries(snapshot.data!);
                if (results.isEmpty) {
                  return const _EmptyState(
                    icon: Icons.search_off_rounded,
                    title: 'Aucun résultat',
                    text: 'Essayez un autre mot Bariba ou Français.',
                  );
                }
                return ListView.separated(
                  itemCount: results.length,
                  separatorBuilder: (context, index) =>
                      const SizedBox(height: 8),
                  itemBuilder: (context, index) => _DictionaryTile(
                    entry: results[index],
                    onTap: () => _showDictionaryDetail(context, results[index]),
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}

class TranslatorScreen extends StatefulWidget {
  const TranslatorScreen({super.key});

  @override
  State<TranslatorScreen> createState() => _TranslatorScreenState();
}

class _TranslatorScreenState extends State<TranslatorScreen> {
  final _input = TextEditingController();
  final _output = TextEditingController();
  TranslationDirection _direction = TranslationDirection.frenchToBariba;
  bool _busy = false;

  @override
  void dispose() {
    _input.dispose();
    _output.dispose();
    super.dispose();
  }

  Future<void> _translate() async {
    setState(() => _busy = true);
    final translated = await FitilaServices.translate(_input.text, _direction);
    if (!mounted) return;
    setState(() {
      _busy = false;
      _output.text = translated;
    });
  }

  @override
  Widget build(BuildContext context) {
    final wide = MediaQuery.sizeOf(context).width > 860;
    return _PageFrame(
      title: 'Traducteur',
      subtitle:
          'Traduction Français-Bariba avec voix, suggestions et clavier natif.',
      child: ListView(
        children: [
          Wrap(
            spacing: 8,
            runSpacing: 8,
            alignment: WrapAlignment.spaceBetween,
            children: [
              SegmentedButton<TranslationDirection>(
                segments: const [
                  ButtonSegment(
                    value: TranslationDirection.frenchToBariba,
                    label: Text('FR -> BA'),
                    icon: Icon(Icons.arrow_forward_rounded),
                  ),
                  ButtonSegment(
                    value: TranslationDirection.baribaToFrench,
                    label: Text('BA -> FR'),
                    icon: Icon(Icons.arrow_back_rounded),
                  ),
                ],
                selected: {_direction},
                onSelectionChanged: (values) =>
                    setState(() => _direction = values.first),
              ),
              Wrap(
                spacing: 8,
                children: [
                  ActionChip(
                    avatar: const Icon(Icons.mic_rounded, size: 18),
                    label: const Text('Dicter'),
                    onPressed: () => _input.text = 'Bonjour, comment vas-tu ?',
                  ),
                  ActionChip(
                    avatar: const Icon(Icons.keyboard_alt_rounded, size: 18),
                    label: const Text('Clavier'),
                    onPressed: () => _showKeyboard(context, _input),
                  ),
                ],
              ),
            ],
          ),
          const SizedBox(height: 12),
          Flex(
            direction: wide ? Axis.horizontal : Axis.vertical,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Expanded(
                child: _TextPanel(
                  title: _direction == TranslationDirection.frenchToBariba
                      ? 'Français'
                      : 'Bariba',
                  controller: _input,
                  hint: 'Saisir le texte à traduire',
                  maxLines: 10,
                ),
              ),
              SizedBox(width: wide ? 12 : 0, height: wide ? 0 : 12),
              IconButton.filled(
                tooltip: 'Inverser',
                onPressed: () => setState(() {
                  _direction = _direction == TranslationDirection.frenchToBariba
                      ? TranslationDirection.baribaToFrench
                      : TranslationDirection.frenchToBariba;
                  final temp = _input.text;
                  _input.text = _output.text;
                  _output.text = temp;
                }),
                icon: const Icon(Icons.swap_horiz_rounded),
              ),
              SizedBox(width: wide ? 12 : 0, height: wide ? 0 : 12),
              Expanded(
                child: _TextPanel(
                  title: _direction == TranslationDirection.frenchToBariba
                      ? 'Bariba'
                      : 'Français',
                  controller: _output,
                  hint: 'Résultat',
                  readOnly: true,
                  maxLines: 10,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          FilledButton.icon(
            onPressed: _busy ? null : _translate,
            icon: _busy
                ? const SizedBox.square(
                    dimension: 18,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Icon(Icons.auto_awesome_rounded),
            label: const Text('Traduire'),
          ),
          const SizedBox(height: 14),
          const Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              _StatusChip(icon: Icons.hearing_rounded, label: 'TTS Bariba'),
              _StatusChip(icon: Icons.record_voice_over_rounded, label: 'STT'),
              _StatusChip(icon: Icons.history_rounded, label: 'Cache local'),
            ],
          ),
        ],
      ),
    );
  }
}

class AiScreen extends StatefulWidget {
  const AiScreen({super.key});

  @override
  State<AiScreen> createState() => _AiScreenState();
}

class _AiScreenState extends State<AiScreen> {
  final _message = TextEditingController();
  final List<({String role, String text})> _messages = [
    (
      role: 'assistant',
      text:
          'Wɛɛrɛ. Je peux aider en traduction, culture, classe et dictionnaire.',
    ),
  ];

  @override
  void dispose() {
    _message.dispose();
    super.dispose();
  }

  void _send() {
    final text = _message.text.trim();
    if (text.isEmpty) return;
    setState(() {
      _messages.add((role: 'user', text: text));
      _messages.add((
        role: 'assistant',
        text:
            'Réponse Fitila IA: "$text" est analysé avec le contexte Bariba. Sources: dictionnaire, classe, corpus culturel.',
      ));
      _message.clear();
    });
  }

  @override
  Widget build(BuildContext context) {
    return _PageFrame(
      title: 'Fitila IA',
      subtitle: 'Conversation, voix, sources citées et mode Tem-IA foncier.',
      child: Column(
        children: [
          Expanded(
            child: ListView.separated(
              itemCount: _messages.length,
              separatorBuilder: (context, index) => const SizedBox(height: 10),
              itemBuilder: (context, index) {
                final msg = _messages[index];
                final mine = msg.role == 'user';
                return Align(
                  alignment: mine
                      ? Alignment.centerRight
                      : Alignment.centerLeft,
                  child: ConstrainedBox(
                    constraints: const BoxConstraints(maxWidth: 680),
                    child: DecoratedBox(
                      decoration: BoxDecoration(
                        color: mine ? _fitilaOrange : Colors.white,
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(
                          color: mine ? _fitilaOrange : const Color(0xFFE7DDD0),
                        ),
                      ),
                      child: Padding(
                        padding: const EdgeInsets.all(14),
                        child: Text(
                          msg.text,
                          style: TextStyle(
                            color: mine ? Colors.white : _fitilaInk,
                            height: 1.35,
                          ),
                        ),
                      ),
                    ),
                  ),
                );
              },
            ),
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              IconButton.filledTonal(
                tooltip: 'Voix',
                onPressed: () =>
                    _message.text = 'Explique une salutation en Bariba.',
                icon: const Icon(Icons.mic_rounded),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: TextField(
                  controller: _message,
                  minLines: 1,
                  maxLines: 4,
                  decoration: const InputDecoration(
                    hintText: 'Demander à Fitila IA...',
                  ),
                  onSubmitted: (_) => _send(),
                ),
              ),
              const SizedBox(width: 8),
              IconButton.filled(
                tooltip: 'Envoyer',
                onPressed: _send,
                icon: const Icon(Icons.send_rounded),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Align(
            alignment: Alignment.centerLeft,
            child: Wrap(
              spacing: 8,
              children: [
                ActionChip(
                  label: const Text('Tem-IA foncier'),
                  onPressed: () => _message.text = 'Article 12 foncier',
                ),
                ActionChip(
                  label: const Text('Aide classe'),
                  onPressed: () => _message.text = 'Corrige ma phrase',
                ),
                ActionChip(
                  label: const Text('Culture'),
                  onPressed: () => _message.text = 'Explique une coutume',
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class LearnScreen extends StatelessWidget {
  const LearnScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final lessons = _lessons;
    return _PageFrame(
      title: 'Apprendre',
      subtitle:
          'Parcours progressif: alphabet, conversation, calcul, grammaire et culture.',
      child: LayoutBuilder(
        builder: (context, constraints) {
          return GridView.builder(
            itemCount: lessons.length,
            gridDelegate: SliverGridDelegateWithMaxCrossAxisExtent(
              maxCrossAxisExtent: 390,
              mainAxisExtent: 238,
              crossAxisSpacing: 12,
              mainAxisSpacing: 12,
            ),
            itemBuilder: (context, index) => _LessonCard(
              lesson: lessons[index],
              onOpen: () => _showLesson(context, lessons[index]),
            ),
          );
        },
      ),
    );
  }
}

class ClasseScreen extends StatefulWidget {
  const ClasseScreen({super.key});

  @override
  State<ClasseScreen> createState() => _ClasseScreenState();
}

class _ClasseScreenState extends State<ClasseScreen> {
  String _level = 'Niveau 1';

  @override
  Widget build(BuildContext context) {
    final lessons = _lessons.where((lesson) => lesson.level == _level).toList();
    return _PageFrame(
      title: 'Classe',
      subtitle:
          'Niveaux, détails, réponses, corrections, notes et suivi enseignant.',
      action: Wrap(
        spacing: 8,
        children: [
          OutlinedButton.icon(
            onPressed: () => _showCorrections(context),
            icon: const Icon(Icons.fact_check_rounded),
            label: const Text('Corrections'),
          ),
          FilledButton.icon(
            onPressed: () => _showGrades(context),
            icon: const Icon(Icons.download_rounded),
            label: const Text('Notes'),
          ),
        ],
      ),
      child: Column(
        children: [
          Align(
            alignment: Alignment.centerLeft,
            child: SegmentedButton<String>(
              segments: const [
                ButtonSegment(
                  value: 'Niveau 1',
                  label: Text('Niveau 1'),
                  icon: Icon(Icons.looks_one_rounded),
                ),
                ButtonSegment(
                  value: 'Niveau 2',
                  label: Text('Niveau 2'),
                  icon: Icon(Icons.looks_two_rounded),
                ),
              ],
              selected: {_level},
              onSelectionChanged: (values) =>
                  setState(() => _level = values.first),
            ),
          ),
          const SizedBox(height: 12),
          Expanded(
            child: ListView.separated(
              itemCount: lessons.length,
              separatorBuilder: (context, index) => const SizedBox(height: 10),
              itemBuilder: (context, index) =>
                  _ClasseLessonTile(lesson: lessons[index]),
            ),
          ),
        ],
      ),
    );
  }
}

class KeyboardScreen extends StatefulWidget {
  const KeyboardScreen({super.key});

  @override
  State<KeyboardScreen> createState() => _KeyboardScreenState();
}

class _KeyboardScreenState extends State<KeyboardScreen> {
  final _controller = TextEditingController();

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _insert(String letter) {
    final selection = _controller.selection;
    final text = _controller.text;
    final start = selection.start < 0 ? text.length : selection.start;
    final end = selection.end < 0 ? text.length : selection.end;
    final next = text.replaceRange(start, end, letter);
    _controller.value = TextEditingValue(
      text: next,
      selection: TextSelection.collapsed(offset: start + letter.length),
    );
  }

  @override
  Widget build(BuildContext context) {
    return _PageFrame(
      title: 'Clavier Bariba',
      subtitle: 'Saisie native, accents, guide Android et compagnon flottant.',
      child: ListView(
        children: [
          TextField(
            controller: _controller,
            minLines: 5,
            maxLines: 8,
            decoration: const InputDecoration(
              hintText: 'Écrire ici avec les caractères Bariba...',
              prefixIcon: Icon(Icons.edit_rounded),
            ),
          ),
          const SizedBox(height: 12),
          _BaribaKeyboard(onInsert: _insert),
          const SizedBox(height: 16),
          const _FeatureGrid(
            items: [
              (
                Icons.android_rounded,
                'Activation Android',
                'Paramètres > Langues et saisie > Clavier Fitila.',
              ),
              (
                Icons.touch_app_rounded,
                'Mode flottant',
                'Ouvre le clavier depuis traducteur, IA et classe.',
              ),
              (
                Icons.sync_rounded,
                'Suggestions phonétiques',
                'Normalise les accents et variantes Bariba.',
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class VoiceLabScreen extends StatelessWidget {
  const VoiceLabScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return _PageFrame(
      title: 'Voice Lab',
      subtitle: 'TTS, STT, corpus vocal et diagnostic audio.',
      child: ListView(
        children: const [
          _MetricStrip(
            metrics: [
              ('TTS', 'Prêt', Icons.volume_up_rounded),
              ('STT', 'Prêt', Icons.record_voice_over_rounded),
              ('Corpus', 'Collecte', Icons.dataset_rounded),
            ],
          ),
          SizedBox(height: 12),
          _FeatureGrid(
            items: [
              (
                Icons.mic_rounded,
                'Enregistrer',
                'Capture vocale, durée, niveau et validation qualité.',
              ),
              (
                Icons.hearing_rounded,
                'Transcrire',
                'Service Supabase/HuggingFace avec fallback offline.',
              ),
              (
                Icons.graphic_eq_rounded,
                'Analyser',
                'Onde, bruit, vitesse et score de lisibilité.',
              ),
              (
                Icons.cloud_upload_rounded,
                'Contribuer',
                'Ajout au corpus après consentement et modération.',
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class TeacherScreen extends StatelessWidget {
  const TeacherScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return _PageFrame(
      title: 'Espace enseignant',
      subtitle:
          'Élèves, corrections en attente, pondérations, notes et lecture vocale.',
      child: ListView(
        children: [
          const _MetricStrip(
            metrics: [
              ('Élèves', '38', Icons.groups_rounded),
              ('À corriger', '12', Icons.pending_actions_rounded),
              ('Moyenne', '14.8/20', Icons.grade_rounded),
            ],
          ),
          const SizedBox(height: 12),
          _ActionList(
            items: [
              _ActionItem(
                Icons.people_rounded,
                'Liste des élèves',
                'Profil, progression, réponses audio et texte.',
              ),
              _ActionItem(
                Icons.rate_review_rounded,
                'Correction rapide',
                'Comparer aux corrigés, noter sur 20, commentaire vocal.',
              ),
              _ActionItem(
                Icons.tune_rounded,
                'Pondérations',
                'Configurer poids module, chapitre, leçon et section.',
              ),
              _ActionItem(
                Icons.picture_as_pdf_rounded,
                'Relevés PDF',
                'Exporter les notes complètes comme sur le web React.',
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key, required this.session});

  final FitilaSession session;

  @override
  Widget build(BuildContext context) {
    return _PageFrame(
      title: 'Profil',
      subtitle:
          'Compte, posts, statistiques, sécurité visuelle et paramètres rapides.',
      child: ListView(
        children: [
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  CircleAvatar(
                    radius: 38,
                    backgroundColor: _fitilaOrange,
                    child: Text(
                      session.displayName.characters.first,
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 30,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          session.displayName,
                          style: const TextStyle(
                            fontSize: 22,
                            fontWeight: FontWeight.w900,
                          ),
                        ),
                        Text(
                          '${session.phone} · ${session.role}',
                          style: TextStyle(color: Colors.grey.shade700),
                        ),
                        const SizedBox(height: 8),
                        const Wrap(
                          spacing: 8,
                          children: [
                            _StatusChip(
                              icon: Icons.verified_rounded,
                              label: 'Compte test',
                            ),
                            _StatusChip(
                              icon: Icons.security_rounded,
                              label: 'Sécurité active',
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                  IconButton.filledTonal(
                    tooltip: 'Modifier',
                    onPressed: () {},
                    icon: const Icon(Icons.edit_rounded),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 12),
          const _MetricStrip(
            metrics: [
              ('Posts', '17', Icons.dynamic_feed_rounded),
              ('Badges', '6', Icons.emoji_events_rounded),
              ('Leçons', '24', Icons.school_rounded),
            ],
          ),
          const SizedBox(height: 12),
          const _FeatureGrid(
            items: [
              (
                Icons.grid_view_rounded,
                'Mes publications',
                'Audio, vidéo, templates et posts sauvegardés.',
              ),
              (
                Icons.notifications_rounded,
                'Notifications',
                'Corrections, mentions, réponses et nouveautés.',
              ),
              (
                Icons.lock_rounded,
                'Sécurité',
                'Code PIN, contrôle visuel et session active.',
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key, required this.onSignedOut});

  final VoidCallback onSignedOut;

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  bool _baribaFirst = false;
  bool _offline = true;
  bool _audio = true;

  @override
  Widget build(BuildContext context) {
    return _PageFrame(
      title: 'Paramètres',
      subtitle: 'Langue, mode offline, audio, sécurité et session.',
      child: ListView(
        children: [
          _SwitchTile(
            icon: Icons.language_rounded,
            title: 'Afficher le Bariba en premier',
            value: _baribaFirst,
            onChanged: (value) => setState(() => _baribaFirst = value),
          ),
          _SwitchTile(
            icon: Icons.offline_bolt_rounded,
            title: 'Activer le cache offline',
            value: _offline,
            onChanged: (value) => setState(() => _offline = value),
          ),
          _SwitchTile(
            icon: Icons.volume_up_rounded,
            title: 'Lecture audio automatique',
            value: _audio,
            onChanged: (value) => setState(() => _audio = value),
          ),
          const SizedBox(height: 16),
          OutlinedButton.icon(
            onPressed: widget.onSignedOut,
            icon: const Icon(Icons.logout_rounded),
            label: const Text('Se déconnecter'),
          ),
        ],
      ),
    );
  }
}

class _PageFrame extends StatelessWidget {
  const _PageFrame({
    required this.title,
    required this.subtitle,
    required this.child,
    this.action,
  });

  final String title;
  final String subtitle;
  final Widget child;
  final Widget? action;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 6, 16, 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Wrap(
            spacing: 12,
            runSpacing: 10,
            crossAxisAlignment: WrapCrossAlignment.center,
            children: [
              ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 680),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: const TextStyle(
                        fontSize: 30,
                        fontWeight: FontWeight.w900,
                        letterSpacing: 0,
                      ),
                    ),
                    const SizedBox(height: 3),
                    Text(
                      subtitle,
                      style: TextStyle(
                        color: Colors.grey.shade700,
                        height: 1.3,
                      ),
                    ),
                  ],
                ),
              ),
              ?action,
            ],
          ),
          const SizedBox(height: 14),
          Expanded(child: child),
        ],
      ),
    );
  }
}

class _HeroPanel extends StatelessWidget {
  const _HeroPanel({required this.title, required this.subtitle});

  final String title;
  final String subtitle;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: _fitilaInk,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.end,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Icon(
            Icons.local_fire_department_rounded,
            color: _fitilaOrange,
            size: 54,
          ),
          const SizedBox(height: 18),
          Text(
            title,
            style: const TextStyle(
              color: Colors.white,
              fontSize: 52,
              fontWeight: FontWeight.w900,
              letterSpacing: 0,
            ),
          ),
          const SizedBox(height: 10),
          Text(
            subtitle,
            style: const TextStyle(
              color: Colors.white70,
              fontSize: 18,
              height: 1.35,
            ),
          ),
          const SizedBox(height: 22),
          const Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              _DarkChip(icon: Icons.translate_rounded, label: 'Traducteur'),
              _DarkChip(icon: Icons.auto_awesome_rounded, label: 'IA'),
              _DarkChip(icon: Icons.school_rounded, label: 'Classe'),
              _DarkChip(icon: Icons.keyboard_alt_rounded, label: 'Clavier'),
            ],
          ),
        ],
      ),
    );
  }
}

class _PostCard extends StatefulWidget {
  const _PostCard({required this.post});

  final FeedPost post;

  @override
  State<_PostCard> createState() => _PostCardState();
}

class _PostCardState extends State<_PostCard> {
  bool _liked = false;

  @override
  Widget build(BuildContext context) {
    final post = widget.post;
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                CircleAvatar(
                  backgroundColor: post.accent,
                  child: Text(
                    post.author.characters.first,
                    style: const TextStyle(color: Colors.white),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        post.author,
                        style: const TextStyle(fontWeight: FontWeight.w800),
                      ),
                      Text(
                        post.kind.toUpperCase(),
                        style: TextStyle(
                          color: post.accent,
                          fontSize: 11,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                    ],
                  ),
                ),
                IconButton(
                  tooltip: 'Options',
                  onPressed: () {},
                  icon: const Icon(Icons.more_horiz_rounded),
                ),
              ],
            ),
            const SizedBox(height: 12),
            ConstrainedBox(
              constraints: const BoxConstraints(minHeight: 108),
              child: Container(
                width: double.infinity,
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: post.accent.withValues(alpha: 0.09),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  post.content,
                  style: const TextStyle(
                    fontSize: 16,
                    height: 1.38,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ),
            const SizedBox(height: 10),
            Row(
              children: [
                IconButton(
                  tooltip: 'Aimer',
                  onPressed: () => setState(() {
                    _liked = !_liked;
                    post.likes += _liked ? 1 : -1;
                  }),
                  icon: Icon(
                    _liked
                        ? Icons.favorite_rounded
                        : Icons.favorite_border_rounded,
                    color: _liked ? Colors.red : null,
                  ),
                ),
                Text('${post.likes}'),
                IconButton(
                  tooltip: 'Commenter',
                  onPressed: () => setState(() => post.comments++),
                  icon: const Icon(Icons.mode_comment_outlined),
                ),
                Text('${post.comments}'),
                const Spacer(),
                IconButton(
                  tooltip: 'Partager',
                  onPressed: () {},
                  icon: const Icon(Icons.ios_share_rounded),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _CreatePostSheet extends StatefulWidget {
  const _CreatePostSheet({required this.onPostCreated});

  final ValueChanged<FeedPost> onPostCreated;

  @override
  State<_CreatePostSheet> createState() => _CreatePostSheetState();
}

class _CreatePostSheetState extends State<_CreatePostSheet> {
  final _text = TextEditingController();
  String _kind = 'texte';

  @override
  void dispose() {
    _text.dispose();
    super.dispose();
  }

  void _publish() {
    final content = _text.text.trim();
    if (content.isEmpty) return;
    widget.onPostCreated(
      FeedPost(
        author: 'Utilisateur Fitila',
        kind: _kind,
        content: content,
        accent: _fitilaOrange,
      ),
    );
    Navigator.pop(context);
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(
        left: 16,
        right: 16,
        bottom: MediaQuery.viewInsetsOf(context).bottom + 16,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Text(
            'Créer une publication',
            style: TextStyle(fontSize: 22, fontWeight: FontWeight.w900),
          ),
          const SizedBox(height: 12),
          SegmentedButton<String>(
            segments: const [
              ButtonSegment(
                value: 'texte',
                label: Text('Texte'),
                icon: Icon(Icons.notes_rounded),
              ),
              ButtonSegment(
                value: 'audio',
                label: Text('Audio'),
                icon: Icon(Icons.mic_rounded),
              ),
              ButtonSegment(
                value: 'vidéo',
                label: Text('Vidéo'),
                icon: Icon(Icons.videocam_rounded),
              ),
              ButtonSegment(
                value: 'template',
                label: Text('Template'),
                icon: Icon(Icons.movie_filter_rounded),
              ),
            ],
            selected: {_kind},
            onSelectionChanged: (values) =>
                setState(() => _kind = values.first),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _text,
            minLines: 4,
            maxLines: 7,
            decoration: const InputDecoration(
              hintText: 'Que voulez-vous partager ?',
            ),
          ),
          const SizedBox(height: 12),
          FilledButton.icon(
            onPressed: _publish,
            icon: const Icon(Icons.publish_rounded),
            label: const Text('Publier'),
          ),
        ],
      ),
    );
  }
}

class _DictionaryTile extends StatelessWidget {
  const _DictionaryTile({required this.entry, required this.onTap});

  final DictionaryEntry entry;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: ListTile(
        onTap: onTap,
        leading: const CircleAvatar(
          backgroundColor: Color(0xFFFFEDD8),
          child: Icon(Icons.menu_book_rounded, color: _fitilaOrange),
        ),
        title: Text(
          entry.word,
          style: const TextStyle(fontWeight: FontWeight.w900),
        ),
        subtitle: Text(
          entry.definition,
          maxLines: 2,
          overflow: TextOverflow.ellipsis,
        ),
        trailing: const Icon(Icons.chevron_right_rounded),
      ),
    );
  }
}

class _TextPanel extends StatelessWidget {
  const _TextPanel({
    required this.title,
    required this.controller,
    required this.hint,
    this.readOnly = false,
    this.maxLines = 6,
  });

  final String title;
  final TextEditingController controller;
  final String hint;
  final bool readOnly;
  final int maxLines;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(title, style: const TextStyle(fontWeight: FontWeight.w900)),
            const SizedBox(height: 8),
            TextField(
              controller: controller,
              readOnly: readOnly,
              maxLines: maxLines,
              decoration: InputDecoration(
                hintText: hint,
                border: InputBorder.none,
                enabledBorder: InputBorder.none,
                focusedBorder: InputBorder.none,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _LessonCard extends StatelessWidget {
  const _LessonCard({required this.lesson, required this.onOpen});

  final LessonCardData lesson;
  final VoidCallback onOpen;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: InkWell(
        borderRadius: BorderRadius.circular(8),
        onTap: onOpen,
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Text(
                      lesson.module,
                      style: const TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                  ),
                  _StatusPill(text: lesson.level),
                ],
              ),
              const SizedBox(height: 8),
              Text(
                lesson.title,
                style: const TextStyle(fontWeight: FontWeight.w700),
              ),
              const SizedBox(height: 8),
              Expanded(
                child: Text(
                  lesson.summary,
                  style: TextStyle(color: Colors.grey.shade700, height: 1.32),
                ),
              ),
              const SizedBox(height: 10),
              LinearProgressIndicator(
                value: lesson.progress,
                color: _fitilaOrange,
                minHeight: 7,
                borderRadius: BorderRadius.circular(999),
              ),
              const SizedBox(height: 8),
              Text(
                '${(lesson.progress * 100).round()}% terminé',
                style: const TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _ClasseLessonTile extends StatefulWidget {
  const _ClasseLessonTile({required this.lesson});

  final LessonCardData lesson;

  @override
  State<_ClasseLessonTile> createState() => _ClasseLessonTileState();
}

class _ClasseLessonTileState extends State<_ClasseLessonTile> {
  bool _expanded = false;
  final _answer = TextEditingController();

  @override
  void dispose() {
    _answer.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final lesson = widget.lesson;
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          children: [
            Row(
              children: [
                Container(
                  width: 46,
                  height: 46,
                  decoration: BoxDecoration(
                    color: _fitilaOrange.withValues(alpha: 0.14),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: const Icon(
                    Icons.assignment_rounded,
                    color: _fitilaOrange,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        '${lesson.module} · ${lesson.title}',
                        style: const TextStyle(fontWeight: FontWeight.w900),
                      ),
                      Text(
                        lesson.summary,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(color: Colors.grey.shade700),
                      ),
                    ],
                  ),
                ),
                IconButton(
                  tooltip: _expanded ? 'Fermer' : 'Détails',
                  onPressed: () => setState(() => _expanded = !_expanded),
                  icon: Icon(
                    _expanded
                        ? Icons.expand_less_rounded
                        : Icons.expand_more_rounded,
                  ),
                ),
              ],
            ),
            if (_expanded) ...[
              const Divider(height: 24),
              ...lesson.questions.map(
                (q) => Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Icon(
                        Icons.help_rounded,
                        size: 18,
                        color: _fitilaOrange,
                      ),
                      const SizedBox(width: 8),
                      Expanded(child: Text(q)),
                    ],
                  ),
                ),
              ),
              TextField(
                controller: _answer,
                minLines: 2,
                maxLines: 5,
                decoration: const InputDecoration(
                  hintText: 'Votre réponse texte ou transcription vocale',
                ),
              ),
              const SizedBox(height: 10),
              Row(
                children: [
                  OutlinedButton.icon(
                    onPressed: () {},
                    icon: const Icon(Icons.mic_rounded),
                    label: const Text('Réponse vocale'),
                  ),
                  const Spacer(),
                  FilledButton.icon(
                    onPressed: () {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                          content: Text('Réponse enregistrée localement.'),
                        ),
                      );
                    },
                    icon: const Icon(Icons.check_rounded),
                    label: const Text('Soumettre'),
                  ),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _BaribaKeyboard extends StatelessWidget {
  const _BaribaKeyboard({required this.onInsert});

  final ValueChanged<String> onInsert;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            for (final letter in _baribaLetters)
              SizedBox(
                width: 52,
                height: 46,
                child: FilledButton.tonal(
                  onPressed: () => onInsert(letter),
                  child: Text(
                    letter,
                    style: const TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class _FeatureGrid extends StatelessWidget {
  const _FeatureGrid({required this.items});

  final List<(IconData, String, String)> items;

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        return GridView.builder(
          itemCount: items.length,
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          gridDelegate: SliverGridDelegateWithMaxCrossAxisExtent(
            maxCrossAxisExtent: 360,
            mainAxisExtent: 150,
            crossAxisSpacing: 12,
            mainAxisSpacing: 12,
          ),
          itemBuilder: (context, index) {
            final item = items[index];
            return Card(
              child: Padding(
                padding: const EdgeInsets.all(14),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Icon(item.$1, color: _fitilaOrange),
                    const SizedBox(height: 10),
                    Text(
                      item.$2,
                      style: const TextStyle(fontWeight: FontWeight.w900),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      item.$3,
                      style: TextStyle(
                        color: Colors.grey.shade700,
                        height: 1.3,
                      ),
                    ),
                  ],
                ),
              ),
            );
          },
        );
      },
    );
  }
}

class _ActionList extends StatelessWidget {
  const _ActionList({required this.items});

  final List<_ActionItem> items;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        for (final item in items)
          Padding(
            padding: const EdgeInsets.only(bottom: 10),
            child: Card(
              child: ListTile(
                leading: CircleAvatar(
                  backgroundColor: const Color(0xFFFFEDD8),
                  child: Icon(item.icon, color: _fitilaOrange),
                ),
                title: Text(
                  item.title,
                  style: const TextStyle(fontWeight: FontWeight.w900),
                ),
                subtitle: Text(item.subtitle),
                trailing: const Icon(Icons.chevron_right_rounded),
              ),
            ),
          ),
      ],
    );
  }
}

class _ActionItem {
  const _ActionItem(this.icon, this.title, this.subtitle);

  final IconData icon;
  final String title;
  final String subtitle;
}

class _MetricStrip extends StatelessWidget {
  const _MetricStrip({required this.metrics});

  final List<(String, String, IconData)> metrics;

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        return GridView.builder(
          itemCount: metrics.length,
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          gridDelegate: const SliverGridDelegateWithMaxCrossAxisExtent(
            maxCrossAxisExtent: 300,
            mainAxisExtent: 110,
            crossAxisSpacing: 12,
            mainAxisSpacing: 12,
          ),
          itemBuilder: (context, index) {
            final metric = metrics[index];
            return Card(
              child: Padding(
                padding: const EdgeInsets.all(14),
                child: Row(
                  children: [
                    Icon(metric.$3, color: _fitilaOrange, size: 34),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            metric.$2,
                            style: const TextStyle(
                              fontSize: 24,
                              fontWeight: FontWeight.w900,
                            ),
                          ),
                          Text(
                            metric.$1,
                            style: TextStyle(color: Colors.grey.shade700),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            );
          },
        );
      },
    );
  }
}

class _DesktopTopBar extends StatelessWidget {
  const _DesktopTopBar({
    required this.page,
    required this.session,
    required this.onProfile,
  });

  final FitilaPage page;
  final FitilaSession session;
  final VoidCallback onProfile;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
      child: Row(
        children: [
          Expanded(
            child: SearchBar(
              hintText: 'Recherche globale: dictionnaire, classe, posts...',
              leading: const Icon(Icons.search_rounded),
              elevation: const WidgetStatePropertyAll(0),
              backgroundColor: const WidgetStatePropertyAll(Colors.white),
              shape: WidgetStatePropertyAll(
                RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
              ),
            ),
          ),
          const SizedBox(width: 10),
          IconButton.filledTonal(
            onPressed: () {},
            tooltip: 'Notifications',
            icon: const Icon(Icons.notifications_rounded),
          ),
          const SizedBox(width: 8),
          FilledButton.icon(
            onPressed: onProfile,
            icon: const Icon(Icons.person_rounded),
            label: Text(session.displayName),
          ),
        ],
      ),
    );
  }
}

class _ProfileTile extends StatelessWidget {
  const _ProfileTile({required this.session});

  final FitilaSession session;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        children: [
          CircleAvatar(
            backgroundColor: _fitilaOrange,
            child: Text(
              session.displayName.characters.first,
              style: const TextStyle(color: Colors.white),
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  session.displayName,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                Text(
                  session.role,
                  style: const TextStyle(color: Colors.white60, fontSize: 12),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _NavItem extends StatelessWidget {
  const _NavItem({
    required this.page,
    required this.selected,
    required this.onTap,
  });

  final FitilaPage page;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: ListTile(
        selected: selected,
        onTap: onTap,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
        selectedTileColor: _fitilaOrange.withValues(alpha: 0.18),
        leading: Icon(
          page.icon,
          color: selected ? _fitilaOrange : Colors.white70,
        ),
        title: Text(
          page.title,
          style: TextStyle(
            color: selected ? Colors.white : Colors.white70,
            fontWeight: FontWeight.w800,
          ),
        ),
        subtitle: Text(
          page.description,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: const TextStyle(color: Colors.white38, fontSize: 11),
        ),
      ),
    );
  }
}

class _SectionLabel extends StatelessWidget {
  const _SectionLabel(this.text);

  final String text;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(6, 8, 6, 8),
      child: Text(
        text.toUpperCase(),
        style: const TextStyle(
          color: Colors.white38,
          fontSize: 11,
          fontWeight: FontWeight.w900,
        ),
      ),
    );
  }
}

class _LanguageSwitch extends StatelessWidget {
  const _LanguageSwitch();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(8),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.06),
        borderRadius: BorderRadius.circular(8),
      ),
      child: const Row(
        children: [
          Expanded(
            child: _DarkChip(icon: Icons.language_rounded, label: 'Français'),
          ),
          SizedBox(width: 8),
          Expanded(
            child: _DarkChip(icon: Icons.translate_rounded, label: 'Bariba'),
          ),
        ],
      ),
    );
  }
}

class _DarkChip extends StatelessWidget {
  const _DarkChip({required this.icon, required this.label});

  final IconData icon;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.10),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, color: Colors.white, size: 16),
          const SizedBox(width: 6),
          Flexible(
            child: Text(
              label,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(
                color: Colors.white,
                fontSize: 12,
                fontWeight: FontWeight.w800,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _StatusChip extends StatelessWidget {
  const _StatusChip({required this.icon, required this.label});

  final IconData icon;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Chip(
      avatar: Icon(icon, size: 16, color: _fitilaOrange),
      label: Text(label),
      visualDensity: VisualDensity.compact,
      side: const BorderSide(color: Color(0xFFE7DDD0)),
      backgroundColor: Colors.white,
    );
  }
}

class _StatusPill extends StatelessWidget {
  const _StatusPill({required this.text});

  final String text;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: const Color(0xFFFFEDD8),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        text,
        style: const TextStyle(
          color: _fitilaOrange,
          fontSize: 11,
          fontWeight: FontWeight.w900,
        ),
      ),
    );
  }
}

class _SwitchTile extends StatelessWidget {
  const _SwitchTile({
    required this.icon,
    required this.title,
    required this.value,
    required this.onChanged,
  });

  final IconData icon;
  final String title;
  final bool value;
  final ValueChanged<bool> onChanged;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Card(
        child: SwitchListTile(
          value: value,
          onChanged: onChanged,
          secondary: Icon(icon, color: _fitilaOrange),
          title: Text(
            title,
            style: const TextStyle(fontWeight: FontWeight.w800),
          ),
        ),
      ),
    );
  }
}

class _EmptyState extends StatelessWidget {
  const _EmptyState({
    required this.icon,
    required this.title,
    required this.text,
  });

  final IconData icon;
  final String title;
  final String text;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 54, color: Colors.grey.shade400),
          const SizedBox(height: 12),
          Text(
            title,
            style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w900),
          ),
          const SizedBox(height: 4),
          Text(text, style: TextStyle(color: Colors.grey.shade700)),
        ],
      ),
    );
  }
}

void _showDictionaryDetail(BuildContext context, DictionaryEntry entry) {
  showModalBottomSheet<void>(
    context: context,
    showDragHandle: true,
    isScrollControlled: true,
    builder: (context) => DraggableScrollableSheet(
      expand: false,
      initialChildSize: 0.68,
      maxChildSize: 0.92,
      builder: (context, controller) => ListView(
        controller: controller,
        padding: const EdgeInsets.fromLTRB(18, 0, 18, 18),
        children: [
          Text(
            entry.word,
            style: const TextStyle(fontSize: 30, fontWeight: FontWeight.w900),
          ),
          if (entry.phonetic?.isNotEmpty == true)
            Text(
              entry.phonetic!,
              style: const TextStyle(
                color: _fitilaOrange,
                fontWeight: FontWeight.w800,
              ),
            ),
          const SizedBox(height: 12),
          Text(
            entry.definition,
            style: const TextStyle(fontSize: 18, height: 1.35),
          ),
          const SizedBox(height: 12),
          if (entry.partOfSpeech?.isNotEmpty == true)
            _InfoBox(title: 'Classe grammaticale', text: entry.partOfSpeech!),
          if (entry.exampleBariba?.isNotEmpty == true)
            _InfoBox(title: 'Exemple Bariba', text: entry.exampleBariba!),
          if (entry.exampleFrancais?.isNotEmpty == true)
            _InfoBox(title: 'Exemple Français', text: entry.exampleFrancais!),
          const SizedBox(height: 10),
          Wrap(
            spacing: 8,
            children: [
              FilledButton.icon(
                onPressed: () {},
                icon: const Icon(Icons.volume_up_rounded),
                label: const Text('Écouter'),
              ),
              OutlinedButton.icon(
                onPressed: () {},
                icon: const Icon(Icons.flag_rounded),
                label: const Text('Signaler'),
              ),
            ],
          ),
        ],
      ),
    ),
  );
}

void _showContribution(BuildContext context) {
  showDialog<void>(
    context: context,
    builder: (context) => AlertDialog(
      title: const Text('Proposer une contribution'),
      content: const Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          TextField(decoration: InputDecoration(labelText: 'Mot Bariba')),
          SizedBox(height: 10),
          TextField(decoration: InputDecoration(labelText: 'Définition')),
        ],
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: const Text('Annuler'),
        ),
        FilledButton(
          onPressed: () => Navigator.pop(context),
          child: const Text('Envoyer'),
        ),
      ],
    ),
  );
}

void _showKeyboard(BuildContext context, TextEditingController controller) {
  void insert(String letter) {
    final selection = controller.selection;
    final text = controller.text;
    final start = selection.start < 0 ? text.length : selection.start;
    final end = selection.end < 0 ? text.length : selection.end;
    controller.value = TextEditingValue(
      text: text.replaceRange(start, end, letter),
      selection: TextSelection.collapsed(offset: start + letter.length),
    );
  }

  showModalBottomSheet<void>(
    context: context,
    showDragHandle: true,
    builder: (_) => Padding(
      padding: const EdgeInsets.all(16),
      child: _BaribaKeyboard(onInsert: insert),
    ),
  );
}

void _showLesson(BuildContext context, LessonCardData lesson) {
  showModalBottomSheet<void>(
    context: context,
    showDragHandle: true,
    isScrollControlled: true,
    builder: (context) => DraggableScrollableSheet(
      expand: false,
      initialChildSize: 0.7,
      builder: (context, controller) => ListView(
        controller: controller,
        padding: const EdgeInsets.fromLTRB(18, 0, 18, 18),
        children: [
          Text(
            '${lesson.level} · ${lesson.module}',
            style: const TextStyle(
              color: _fitilaOrange,
              fontWeight: FontWeight.w900,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            lesson.title,
            style: const TextStyle(fontSize: 28, fontWeight: FontWeight.w900),
          ),
          const SizedBox(height: 10),
          Text(
            lesson.summary,
            style: const TextStyle(fontSize: 16, height: 1.4),
          ),
          const SizedBox(height: 14),
          const Text(
            'Exercices',
            style: TextStyle(fontWeight: FontWeight.w900),
          ),
          const SizedBox(height: 8),
          ...lesson.questions.map((q) => _InfoBox(title: 'Question', text: q)),
          FilledButton.icon(
            onPressed: () {},
            icon: const Icon(Icons.play_arrow_rounded),
            label: const Text('Continuer la leçon'),
          ),
        ],
      ),
    ),
  );
}

void _showCorrections(BuildContext context) {
  showModalBottomSheet<void>(
    context: context,
    showDragHandle: true,
    builder: (_) => const Padding(
      padding: EdgeInsets.all(18),
      child: _ActionList(
        items: [
          _ActionItem(
            Icons.check_circle_rounded,
            'Comparaison automatique',
            'Similarité avec la réponse attendue, mots manquants et explication.',
          ),
          _ActionItem(
            Icons.headphones_rounded,
            'Correction vocale',
            'Lecture du commentaire enseignant et réponse audio apprenant.',
          ),
        ],
      ),
    ),
  );
}

void _showGrades(BuildContext context) {
  showModalBottomSheet<void>(
    context: context,
    showDragHandle: true,
    builder: (_) => const Padding(
      padding: EdgeInsets.all(18),
      child: _MetricStrip(
        metrics: [
          ('Moyenne générale', '15.2/20', Icons.grade_rounded),
          ('Questions corrigées', '46/60', Icons.fact_check_rounded),
          ('PDF', 'Prêt', Icons.picture_as_pdf_rounded),
        ],
      ),
    ),
  );
}

class _InfoBox extends StatelessWidget {
  const _InfoBox({required this.title, required this.text});

  final String title;
  final String text;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: const Color(0xFFE7DDD0)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title.toUpperCase(),
            style: const TextStyle(
              color: _fitilaOrange,
              fontSize: 11,
              fontWeight: FontWeight.w900,
            ),
          ),
          const SizedBox(height: 4),
          Text(text, style: const TextStyle(height: 1.35)),
        ],
      ),
    );
  }
}

const _lessons = [
  LessonCardData(
    level: 'Niveau 1',
    module: 'Alphabet',
    title: 'Sons, tons et caractères Bariba',
    summary:
        'Identifier ɛ, ɔ, nasales, tons et premières syllabes avec écoute guidée.',
    progress: .72,
    questions: [
      'Écrire trois mots avec ɔ.',
      'Lire une phrase courte à voix haute.',
      'Associer son et caractère.',
    ],
  ),
  LessonCardData(
    level: 'Niveau 1',
    module: 'Conversation',
    title: 'Saluer et se présenter',
    summary: 'Dialogues utiles, écoute, répétition et réponse vocale courte.',
    progress: .58,
    questions: [
      'Comment saluer le matin ?',
      'Présentez votre nom.',
      'Traduire: comment vas-tu ?',
    ],
  ),
  LessonCardData(
    level: 'Niveau 1',
    module: 'Calcul',
    title: 'Nombres et prix au marché',
    summary:
        'Compter, demander un prix, répondre et vérifier la prononciation.',
    progress: .41,
    questions: [
      'Écrire les nombres 1 à 5.',
      'Demander le prix du maïs.',
      'Répondre avec un montant.',
    ],
  ),
  LessonCardData(
    level: 'Niveau 2',
    module: 'Grammaire',
    title: 'Pronoms, temps et construction',
    summary:
        'Construire des phrases plus longues avec comparaison et correction.',
    progress: .34,
    questions: [
      'Transformer une phrase au passé.',
      'Repérer le sujet.',
      'Corriger une phrase proposée.',
    ],
  ),
  LessonCardData(
    level: 'Niveau 2',
    module: 'Production écrite',
    title: 'Décrire une scène culturelle',
    summary: 'Rédiger, écouter la suggestion IA et envoyer pour correction.',
    progress: .22,
    questions: [
      'Décrire une fête en 4 phrases.',
      'Utiliser au moins deux marqueurs temporels.',
      'Relire avec le clavier Bariba.',
    ],
  ),
  LessonCardData(
    level: 'Niveau 2',
    module: 'Lecture vocale',
    title: 'Lire, enregistrer et comparer',
    summary: 'Studio vocal avec score de fluidité et retour enseignant.',
    progress: .18,
    questions: [
      'Lire le texte proposé.',
      'Comparer avec le modèle audio.',
      'Soumettre une lecture propre.',
    ],
  ),
];
