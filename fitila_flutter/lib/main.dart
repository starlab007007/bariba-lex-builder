import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:http/http.dart' as http;

void main() {
  runApp(const FitilaApp());
}

const _fitilaPrimary = Color(0xFF38BDF8);
const _fitilaPrimarySoft = Color(0xFFE0F2FE);
const _fitilaBorder = Color(0xFFBAE6FD);
const _fitilaInk = Color(0xFF0F172A);
const _fitilaSurface = Color(0xFFF0F9FF);
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
          seedColor: _fitilaPrimary,
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
            backgroundColor: _fitilaPrimary,
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
            borderSide: const BorderSide(color: _fitilaBorder),
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(8),
            borderSide: const BorderSide(color: _fitilaBorder),
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(8),
            borderSide: const BorderSide(color: _fitilaPrimary, width: 1.5),
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
    this.visibility = 'Public',
    this.tags = const [],
    this.template = 'Libre',
    this.mediaStatus = 'Pret',
    this.aiAssisted = false,
    this.allowComments = true,
    this.likes = 0,
    this.comments = 0,
  });

  final String author;
  final String kind;
  final String content;
  final Color accent;
  final String visibility;
  final List<String> tags;
  final String template;
  final String mediaStatus;
  final bool aiAssisted;
  final bool allowComments;
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

class FitilaTemplateData {
  const FitilaTemplateData({
    required this.id,
    required this.name,
    required this.baribaName,
    required this.category,
    required this.summary,
    required this.duration,
    required this.icon,
    required this.accent,
    this.premium = false,
    this.newBadge = false,
  });

  final String id;
  final String name;
  final String baribaName;
  final String category;
  final String summary;
  final int duration;
  final IconData icon;
  final Color accent;
  final bool premium;
  final bool newBadge;
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

enum CreatorPhase { discover, capturing, reviewing, finalizing, success }

enum FitilaPage {
  feed,
  creator,
  templates,
  services,
  market,
  agriculture,
  finance,
  education,
  health,
  sos,
  messages,
  discover,
  install,
  drafts,
  offline,
  wallet,
  history,
  scan,
  shop,
  dictionary,
  translator,
  ia,
  temIa,
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
      FitilaPage.creator => 'Createur',
      FitilaPage.templates => 'Templates',
      FitilaPage.services => 'Services',
      FitilaPage.market => 'Marche',
      FitilaPage.agriculture => 'Agriculture',
      FitilaPage.finance => 'Finance',
      FitilaPage.education => 'Education',
      FitilaPage.health => 'Sante',
      FitilaPage.sos => 'SOS',
      FitilaPage.messages => 'Messages',
      FitilaPage.discover => 'Decouvrir',
      FitilaPage.install => 'Installer',
      FitilaPage.drafts => 'Brouillons',
      FitilaPage.offline => 'Hors ligne',
      FitilaPage.wallet => 'Portefeuille',
      FitilaPage.history => 'Historique',
      FitilaPage.scan => 'Scanner',
      FitilaPage.shop => 'Boutique',
      FitilaPage.dictionary => 'Dictionnaire',
      FitilaPage.translator => 'Traducteur',
      FitilaPage.ia => 'IA',
      FitilaPage.temIa => 'Tem-IA',
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
      FitilaPage.creator => 'Studio IA de creation de contenu',
      FitilaPage.templates => 'Galerie premium et apercu plein ecran',
      FitilaPage.services => 'Services communautaires et outils locaux',
      FitilaPage.market => 'Produits, jobs et annonces du marche',
      FitilaPage.agriculture => 'Conseils agricoles, meteo et prix',
      FitilaPage.finance => 'Portefeuille, tontine et mobile money',
      FitilaPage.education => 'Education, modules et progression',
      FitilaPage.health => 'Sante, prevention et assistance',
      FitilaPage.sos => 'Alerte rapide et contacts de confiance',
      FitilaPage.messages => 'Messages prives, vocaux et groupes',
      FitilaPage.discover => 'Tendances, createurs et contenus',
      FitilaPage.install => 'Installation PWA, APK et clavier',
      FitilaPage.drafts => 'Brouillons du createur et autosauvegarde',
      FitilaPage.offline => 'Cache local et synchronisation differee',
      FitilaPage.wallet => 'Solde, paiements et historiques',
      FitilaPage.history => 'Activite, recherches et contenus vus',
      FitilaPage.scan => 'QR, documents et photo-traduction',
      FitilaPage.shop => 'Boutique, packs et services',
      FitilaPage.dictionary => 'Recherche Bariba-Français avec détails',
      FitilaPage.translator => 'Traduction IA bidirectionnelle',
      FitilaPage.ia => 'Assistant conversationnel Fitila',
      FitilaPage.temIa => 'Assistant foncier avec sources citees',
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
      FitilaPage.creator => Icons.movie_creation_rounded,
      FitilaPage.templates => Icons.video_library_rounded,
      FitilaPage.services => Icons.apps_rounded,
      FitilaPage.market => Icons.storefront_rounded,
      FitilaPage.agriculture => Icons.agriculture_rounded,
      FitilaPage.finance => Icons.account_balance_wallet_rounded,
      FitilaPage.education => Icons.cast_for_education_rounded,
      FitilaPage.health => Icons.health_and_safety_rounded,
      FitilaPage.sos => Icons.sos_rounded,
      FitilaPage.messages => Icons.forum_rounded,
      FitilaPage.discover => Icons.explore_rounded,
      FitilaPage.install => Icons.install_mobile_rounded,
      FitilaPage.drafts => Icons.drafts_rounded,
      FitilaPage.offline => Icons.cloud_off_rounded,
      FitilaPage.wallet => Icons.wallet_rounded,
      FitilaPage.history => Icons.history_rounded,
      FitilaPage.scan => Icons.qr_code_scanner_rounded,
      FitilaPage.shop => Icons.shopping_bag_rounded,
      FitilaPage.dictionary => Icons.menu_book_rounded,
      FitilaPage.translator => Icons.translate_rounded,
      FitilaPage.ia => Icons.auto_awesome_rounded,
      FitilaPage.temIa => Icons.gavel_rounded,
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
      accent: _fitilaPrimary,
      visibility: 'Public',
      tags: const ['salutation', 'audio', 'village'],
      template: 'Capsule radio',
      mediaStatus: 'Audio valide',
      aiAssisted: true,
      likes: 42,
      comments: 7,
    ),
    FeedPost(
      author: 'Classe FITILA',
      kind: 'vidéo',
      content: 'Niveau 1: alphabet, tons et premières phrases utiles.',
      accent: Colors.teal,
      visibility: 'Classe',
      tags: const ['niveau 1', 'alphabet', 'video'],
      template: 'Lecon courte',
      mediaStatus: 'Video HD',
      likes: 31,
      comments: 4,
    ),
    FeedPost(
      author: 'Tem IA',
      kind: 'template',
      content:
          'Comprendre les articles fonciers avec sources citées et résumé bilingue.',
      accent: Colors.indigo,
      visibility: 'Public',
      tags: const ['tem-ia', 'foncier', 'resume'],
      template: 'Analyse IA',
      mediaStatus: 'Template publie',
      aiAssisted: true,
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
      FitilaPage.creator => ContentCreatorScreen(
        onPostCreated: (post) {
          setState(() {
            _posts.insert(0, post);
            _page = FitilaPage.feed;
          });
        },
      ),
      FitilaPage.templates => TemplatesScreen(
        onUseTemplate: (_) => setState(() => _page = FitilaPage.creator),
      ),
      FitilaPage.services => const FitilaModuleScreen(
        page: FitilaPage.services,
        metrics: [
          ('Services', '18', Icons.apps_rounded),
          ('Actifs', '12', Icons.verified_rounded),
          ('Offline', '6', Icons.cloud_done_rounded),
        ],
        items: [
          (
            Icons.medical_services_rounded,
            'Assistance locale',
            'Sante, SOS, documents, signalement et support vocal.',
          ),
          (
            Icons.storefront_rounded,
            'Marche communautaire',
            'Produits, emplois, annonces et contacts rapides.',
          ),
          (
            Icons.school_rounded,
            'Education',
            'Classe, apprentissage, corrections et suivi enseignant.',
          ),
        ],
      ),
      FitilaPage.market => const FitilaModuleScreen(
        page: FitilaPage.market,
        metrics: [
          ('Produits', '86', Icons.inventory_2_rounded),
          ('Jobs', '14', Icons.work_rounded),
          ('Vendeurs', '32', Icons.groups_rounded),
        ],
        items: [
          (
            Icons.sell_rounded,
            'Annonces',
            'Creation produit, prix, image, localisation et contact.',
          ),
          (
            Icons.work_history_rounded,
            'Jobs',
            'Offres locales avec filtre metier, commune et urgence.',
          ),
          (
            Icons.chat_bubble_rounded,
            'Negociation',
            'Message vocal, traduction et partage dans le fil.',
          ),
        ],
      ),
      FitilaPage.agriculture => const FitilaModuleScreen(
        page: FitilaPage.agriculture,
        metrics: [
          ('Cultures', '9', Icons.grass_rounded),
          ('Alertes', '3', Icons.warning_rounded),
          ('Prix', 'Live', Icons.trending_up_rounded),
        ],
        items: [
          (
            Icons.wb_sunny_rounded,
            'Meteo agricole',
            'Conseils par saison, pluie, semis et alerte terrain.',
          ),
          (
            Icons.payments_rounded,
            'Prix marche',
            'Suivi mais, igname, coton et produits locaux.',
          ),
          (
            Icons.record_voice_over_rounded,
            'Conseil vocal',
            'Question en francais ou Bariba avec reponse audio.',
          ),
        ],
      ),
      FitilaPage.finance => const FitilaModuleScreen(
        page: FitilaPage.finance,
        metrics: [
          ('Solde', '25k', Icons.account_balance_wallet_rounded),
          ('Tontines', '4', Icons.savings_rounded),
          ('Reçus', '28', Icons.receipt_long_rounded),
        ],
        items: [
          (
            Icons.savings_rounded,
            'Tontine',
            'Cotisations, rappels et preuves.',
          ),
          (
            Icons.swap_horiz_rounded,
            'Transfert',
            'Mobile money, historique et notifications.',
          ),
          (
            Icons.analytics_rounded,
            'Rapport',
            'Depenses, revenus, marche et export PDF.',
          ),
        ],
      ),
      FitilaPage.education => const FitilaModuleScreen(
        page: FitilaPage.education,
        metrics: [
          ('Cours', '42', Icons.menu_book_rounded),
          ('Quiz', '19', Icons.quiz_rounded),
          ('Audio', 'Pret', Icons.volume_up_rounded),
        ],
        items: [
          (
            Icons.school_rounded,
            'Modules',
            'Alphabet, conversation, grammaire et culture.',
          ),
          (
            Icons.assignment_turned_in_rounded,
            'Exercices',
            'Reponses texte et vocales avec correction.',
          ),
          (
            Icons.emoji_events_rounded,
            'Progression',
            'Badges, points et parcours adapte.',
          ),
        ],
      ),
      FitilaPage.health => const FitilaModuleScreen(
        page: FitilaPage.health,
        metrics: [
          ('Guides', '24', Icons.health_and_safety_rounded),
          ('Contacts', '8', Icons.contact_phone_rounded),
          ('Alertes', '2', Icons.notifications_active_rounded),
        ],
        items: [
          (
            Icons.local_hospital_rounded,
            'Prevention',
            'Fiches sante simples, traduites et vocales.',
          ),
          (
            Icons.phone_in_talk_rounded,
            'Contacts utiles',
            'Centre, urgence, pharmacie et relais local.',
          ),
          (
            Icons.verified_user_rounded,
            'Securite',
            'Messages moderes et non diagnostiques.',
          ),
        ],
      ),
      FitilaPage.sos => const UtilityScreen(page: FitilaPage.sos),
      FitilaPage.messages => const UtilityScreen(page: FitilaPage.messages),
      FitilaPage.discover => const UtilityScreen(page: FitilaPage.discover),
      FitilaPage.install => const UtilityScreen(page: FitilaPage.install),
      FitilaPage.drafts => const UtilityScreen(page: FitilaPage.drafts),
      FitilaPage.offline => const UtilityScreen(page: FitilaPage.offline),
      FitilaPage.wallet => const UtilityScreen(page: FitilaPage.wallet),
      FitilaPage.history => const UtilityScreen(page: FitilaPage.history),
      FitilaPage.scan => const UtilityScreen(page: FitilaPage.scan),
      FitilaPage.shop => const UtilityScreen(page: FitilaPage.shop),
      FitilaPage.dictionary => const DictionaryScreen(),
      FitilaPage.translator => const TranslatorScreen(),
      FitilaPage.ia => const AiScreen(),
      FitilaPage.temIa => const TemIaScreen(),
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
          floatingActionButton:
              _page == FitilaPage.feed || _page == FitilaPage.creator
              ? FloatingActionButton.extended(
                  backgroundColor: _fitilaPrimary,
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
      FitilaPage.creator,
      FitilaPage.templates,
      FitilaPage.dictionary,
      FitilaPage.translator,
      FitilaPage.ia,
      FitilaPage.temIa,
      FitilaPage.learn,
      FitilaPage.classe,
    ];
    final services = [
      FitilaPage.services,
      FitilaPage.market,
      FitilaPage.agriculture,
      FitilaPage.finance,
      FitilaPage.education,
      FitilaPage.health,
      FitilaPage.sos,
      FitilaPage.messages,
      FitilaPage.discover,
      FitilaPage.install,
    ];
    final tools = [
      FitilaPage.keyboard,
      FitilaPage.voiceLab,
      FitilaPage.teacher,
      FitilaPage.drafts,
      FitilaPage.offline,
      FitilaPage.wallet,
      FitilaPage.history,
      FitilaPage.scan,
      FitilaPage.shop,
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
                    color: _fitilaPrimary,
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
            const _SectionLabel('Services'),
            _NavGrid(pages: services, selected: page, onSelected: onSelected),
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
                    mainAxisExtent: 372,
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

class ContentCreatorScreen extends StatefulWidget {
  const ContentCreatorScreen({super.key, required this.onPostCreated});

  final ValueChanged<FeedPost> onPostCreated;

  @override
  State<ContentCreatorScreen> createState() => _ContentCreatorScreenState();
}

class _ContentCreatorScreenState extends State<ContentCreatorScreen> {
  CreatorPhase _phase = CreatorPhase.discover;
  FitilaTemplateData _template = _fitilaTemplates.first;

  void _nextPhase() {
    setState(() {
      _phase = switch (_phase) {
        CreatorPhase.discover => CreatorPhase.capturing,
        CreatorPhase.capturing => CreatorPhase.reviewing,
        CreatorPhase.reviewing => CreatorPhase.finalizing,
        CreatorPhase.finalizing => CreatorPhase.success,
        CreatorPhase.success => CreatorPhase.discover,
      };
    });
  }

  void _publishFromWorkflow() {
    widget.onPostCreated(
      FeedPost(
        author: 'Utilisateur Fitila',
        kind: 'vidéo',
        content:
            '${_template.name}\n\nPublication creee depuis le workflow natif: template, capture, preview, finalisation et publication.',
        accent: _template.accent,
        visibility: 'Public',
        tags: ['template', _template.category.toLowerCase(), 'fitila'],
        template: _template.name,
        mediaStatus: 'Video publiee',
        aiAssisted: true,
      ),
    );
    setState(() => _phase = CreatorPhase.success);
  }

  @override
  Widget build(BuildContext context) {
    return _PageFrame(
      title: 'Createur de contenu',
      subtitle:
          'Studio bleu ciel pour texte, audio, video, templates, IA et publication.',
      action: FilledButton.icon(
        onPressed: () => FeedScreen.showComposer(
          context,
          onPostCreated: widget.onPostCreated,
        ),
        icon: const Icon(Icons.add_rounded),
        label: const Text('Composer'),
      ),
      child: ListView(
        children: [
          const _MetricStrip(
            metrics: [
              ('Brouillons', '12', Icons.drafts_rounded),
              ('Publies', '48', Icons.cloud_done_rounded),
              ('IA', 'Active', Icons.auto_awesome_rounded),
            ],
          ),
          const SizedBox(height: 12),
          _CreatorPhaseBar(phase: _phase),
          const SizedBox(height: 12),
          _CreatorWorkflowPanel(
            phase: _phase,
            template: _template,
            onNext: _phase == CreatorPhase.finalizing
                ? _publishFromWorkflow
                : _nextPhase,
            onReset: () => setState(() => _phase = CreatorPhase.discover),
          ),
          const SizedBox(height: 12),
          LayoutBuilder(
            builder: (context, constraints) {
              final wide = constraints.maxWidth > 860;
              final pipeline = _CreatorPipeline(
                onCompose: () => FeedScreen.showComposer(
                  context,
                  onPostCreated: widget.onPostCreated,
                ),
              );
              if (!wide) {
                return Column(
                  children: [
                    pipeline,
                    const SizedBox(height: 12),
                    const _CreatorTemplateBoard(),
                  ],
                );
              }
              return Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(flex: 3, child: pipeline),
                  const SizedBox(width: 12),
                  const Expanded(flex: 2, child: _CreatorTemplateBoard()),
                ],
              );
            },
          ),
          const SizedBox(height: 12),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Selection template',
                    style: TextStyle(fontSize: 18, fontWeight: FontWeight.w900),
                  ),
                  const SizedBox(height: 10),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      for (final template in _fitilaTemplates.take(8))
                        ChoiceChip(
                          selected: template.id == _template.id,
                          avatar: Icon(template.icon, size: 18),
                          label: Text(template.name),
                          onSelected: (_) => setState(() {
                            _template = template;
                            _phase = CreatorPhase.capturing;
                          }),
                        ),
                    ],
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 12),
          const _FeatureGrid(
            items: [
              (
                Icons.notes_rounded,
                'Texte intelligent',
                'Titre, corps, hashtags, traduction et correction IA.',
              ),
              (
                Icons.mic_rounded,
                'Audio natif',
                'Import, enregistrement, transcription et validation qualite.',
              ),
              (
                Icons.videocam_rounded,
                'Video courte',
                'Script, miniature, sous-titres et publication sociale.',
              ),
              (
                Icons.movie_filter_rounded,
                'Templates',
                'Annonce, lecon, culture, Tem-IA et campagne communaute.',
              ),
              (
                Icons.visibility_rounded,
                'Audience',
                'Public, classe, brouillon prive ou publication programmee.',
              ),
              (
                Icons.verified_rounded,
                'Moderation',
                'Checklist langue, source, media, accessibilite et securite.',
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _CreatorPhaseBar extends StatelessWidget {
  const _CreatorPhaseBar({required this.phase});

  final CreatorPhase phase;

  @override
  Widget build(BuildContext context) {
    final phases = CreatorPhase.values;
    final current = phases.indexOf(phase);
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Row(
          children: [
            for (var index = 0; index < phases.length; index++) ...[
              Expanded(
                child: Column(
                  children: [
                    CircleAvatar(
                      radius: 16,
                      backgroundColor: index <= current
                          ? _fitilaPrimary
                          : _fitilaPrimarySoft,
                      child: Text(
                        '${index + 1}',
                        style: TextStyle(
                          color: index <= current ? Colors.white : _fitilaInk,
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      phases[index].name,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ],
                ),
              ),
              if (index < phases.length - 1)
                Container(
                  width: 18,
                  height: 2,
                  color: index < current ? _fitilaPrimary : _fitilaBorder,
                ),
            ],
          ],
        ),
      ),
    );
  }
}

class _CreatorWorkflowPanel extends StatelessWidget {
  const _CreatorWorkflowPanel({
    required this.phase,
    required this.template,
    required this.onNext,
    required this.onReset,
  });

  final CreatorPhase phase;
  final FitilaTemplateData template;
  final VoidCallback onNext;
  final VoidCallback onReset;

  @override
  Widget build(BuildContext context) {
    final data = switch (phase) {
      CreatorPhase.discover => (
        Icons.video_library_rounded,
        'Discover',
        'Choisissez un template premium, une categorie et un format 9:16.',
        'Choisir',
      ),
      CreatorPhase.capturing => (
        Icons.videocam_rounded,
        'Capture',
        'Segments video, audio, sous-titres, effets et brouillon automatique.',
        'Previsualiser',
      ),
      CreatorPhase.reviewing => (
        Icons.play_circle_rounded,
        'Preview',
        'Lecture verticale, controle audio, textes, stickers et correction IA.',
        'Finaliser',
      ),
      CreatorPhase.finalizing => (
        Icons.publish_rounded,
        'Finalisation',
        'Caption, hashtags, audience, moderation et publication Supabase.',
        'Publier',
      ),
      CreatorPhase.success => (
        Icons.check_circle_rounded,
        'Success',
        'Publication ajoutee au fil avec metadata, template et statut media.',
        'Recommencer',
      ),
    };
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Row(
          children: [
            Container(
              width: 104,
              height: 156,
              alignment: Alignment.center,
              decoration: BoxDecoration(
                color: template.accent.withValues(alpha: 0.16),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Icon(template.icon, color: template.accent, size: 46),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _PostMetaChip(
                    icon: data.$1,
                    label: data.$2,
                    color: template.accent,
                  ),
                  const SizedBox(height: 8),
                  Text(
                    template.name,
                    style: const TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                  Text(data.$3, style: TextStyle(color: Colors.grey.shade700)),
                  const SizedBox(height: 12),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      FilledButton.icon(
                        onPressed: onNext,
                        icon: Icon(
                          phase == CreatorPhase.success
                              ? Icons.refresh_rounded
                              : Icons.arrow_forward_rounded,
                        ),
                        label: Text(data.$4),
                      ),
                      OutlinedButton.icon(
                        onPressed: onReset,
                        icon: const Icon(Icons.restart_alt_rounded),
                        label: const Text('Reset'),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _CreatorPipeline extends StatelessWidget {
  const _CreatorPipeline({required this.onCompose});

  final VoidCallback onCompose;

  @override
  Widget build(BuildContext context) {
    final steps = [
      (
        Icons.auto_awesome_rounded,
        'Idee IA',
        'Prompt, ton, audience, langue et objectif du post.',
      ),
      (
        Icons.edit_note_rounded,
        'Production',
        'Texte, audio, video ou template avec champs complets.',
      ),
      (
        Icons.fact_check_rounded,
        'Controle',
        'Orthographe Bariba, sources, tags, visibilite et commentaires.',
      ),
      (
        Icons.publish_rounded,
        'Publication',
        'Envoi au fil, sauvegarde brouillon ou programmation.',
      ),
    ];

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Expanded(
                  child: Text(
                    'Parcours de creation',
                    style: TextStyle(fontSize: 18, fontWeight: FontWeight.w900),
                  ),
                ),
                FilledButton.icon(
                  onPressed: onCompose,
                  icon: const Icon(Icons.add_rounded),
                  label: const Text('Nouveau'),
                ),
              ],
            ),
            const SizedBox(height: 12),
            for (final step in steps)
              Padding(
                padding: const EdgeInsets.only(bottom: 10),
                child: ListTile(
                  leading: CircleAvatar(
                    backgroundColor: _fitilaPrimarySoft,
                    child: Icon(step.$1, color: _fitilaPrimary),
                  ),
                  title: Text(
                    step.$2,
                    style: const TextStyle(fontWeight: FontWeight.w900),
                  ),
                  subtitle: Text(step.$3),
                  trailing: const Icon(Icons.check_circle_rounded),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class _CreatorTemplateBoard extends StatelessWidget {
  const _CreatorTemplateBoard();

  @override
  Widget build(BuildContext context) {
    final templates = [
      ('Annonce village', Icons.campaign_rounded, 'Texte + audio'),
      ('Lecon courte', Icons.school_rounded, 'Video + quiz'),
      ('Culture Bariba', Icons.groups_rounded, 'Recit + image'),
      ('Tem-IA foncier', Icons.gavel_rounded, 'Sources + resume'),
    ];

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Templates rapides',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.w900),
            ),
            const SizedBox(height: 12),
            for (final template in templates)
              Padding(
                padding: const EdgeInsets.only(bottom: 10),
                child: Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    border: Border.all(color: _fitilaBorder),
                    borderRadius: BorderRadius.circular(8),
                    color: _fitilaSurface,
                  ),
                  child: Row(
                    children: [
                      Icon(template.$2, color: _fitilaPrimary),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              template.$1,
                              style: const TextStyle(
                                fontWeight: FontWeight.w900,
                              ),
                            ),
                            Text(
                              template.$3,
                              style: TextStyle(color: Colors.grey.shade700),
                            ),
                          ],
                        ),
                      ),
                      const Icon(Icons.chevron_right_rounded),
                    ],
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class TemplatesScreen extends StatefulWidget {
  const TemplatesScreen({super.key, required this.onUseTemplate});

  final ValueChanged<FitilaTemplateData> onUseTemplate;

  @override
  State<TemplatesScreen> createState() => _TemplatesScreenState();
}

class _TemplatesScreenState extends State<TemplatesScreen> {
  String _query = '';
  String _category = 'Tous';
  FitilaTemplateData? _preview;

  List<FitilaTemplateData> get _filtered {
    return _fitilaTemplates
        .where((template) {
          final q = _query.trim().toLowerCase();
          final matchesQuery =
              q.isEmpty ||
              template.name.toLowerCase().contains(q) ||
              template.summary.toLowerCase().contains(q) ||
              template.baribaName.toLowerCase().contains(q);
          final matchesCategory =
              _category == 'Tous' || template.category == _category;
          return matchesQuery && matchesCategory;
        })
        .toList(growable: false);
  }

  @override
  Widget build(BuildContext context) {
    final categories = [
      'Tous',
      ..._fitilaTemplates.map((template) => template.category).toSet(),
    ];
    return _PageFrame(
      title: 'Templates',
      subtitle:
          'Galerie premium avec recherche, categories, preview et envoi createur.',
      child: ListView(
        children: [
          Card(
            child: Padding(
              padding: const EdgeInsets.all(14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Galerie Kuaishou FITILA',
                    style: TextStyle(fontSize: 22, fontWeight: FontWeight.w900),
                  ),
                  const SizedBox(height: 8),
                  TextField(
                    decoration: const InputDecoration(
                      hintText: 'Rechercher un template',
                      prefixIcon: Icon(Icons.search_rounded),
                    ),
                    onChanged: (value) => setState(() => _query = value),
                  ),
                  const SizedBox(height: 10),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      for (final category in categories)
                        ChoiceChip(
                          selected: _category == category,
                          label: Text(category),
                          onSelected: (_) =>
                              setState(() => _category = category),
                        ),
                    ],
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 12),
          GridView.builder(
            itemCount: _filtered.length,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            gridDelegate: const SliverGridDelegateWithMaxCrossAxisExtent(
              maxCrossAxisExtent: 360,
              mainAxisExtent: 236,
              crossAxisSpacing: 12,
              mainAxisSpacing: 12,
            ),
            itemBuilder: (context, index) => _TemplateCard(
              template: _filtered[index],
              onPreview: () => setState(() => _preview = _filtered[index]),
              onUse: () => widget.onUseTemplate(_filtered[index]),
            ),
          ),
          if (_preview != null) ...[
            const SizedBox(height: 12),
            _TemplatePreviewPanel(
              template: _preview!,
              onClose: () => setState(() => _preview = null),
              onUse: () => widget.onUseTemplate(_preview!),
            ),
          ],
        ],
      ),
    );
  }
}

class _TemplateCard extends StatelessWidget {
  const _TemplateCard({
    required this.template,
    required this.onPreview,
    required this.onUse,
  });

  final FitilaTemplateData template;
  final VoidCallback onPreview;
  final VoidCallback onUse;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                CircleAvatar(
                  backgroundColor: template.accent.withValues(alpha: 0.16),
                  child: Icon(template.icon, color: template.accent),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    template.name,
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                ),
                if (template.newBadge)
                  const _StatusPill(text: 'NEW')
                else if (template.premium)
                  const _StatusPill(text: 'PRO'),
              ],
            ),
            const SizedBox(height: 10),
            Text(
              template.summary,
              maxLines: 3,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(color: Colors.grey.shade700, height: 1.28),
            ),
            const Spacer(),
            Wrap(
              spacing: 6,
              children: [
                _PostMetaChip(
                  icon: Icons.category_rounded,
                  label: template.category,
                  color: template.accent,
                ),
                _PostMetaChip(
                  icon: Icons.timer_rounded,
                  label: '${template.duration}s',
                  color: template.accent,
                ),
              ],
            ),
            const SizedBox(height: 10),
            Row(
              children: [
                OutlinedButton.icon(
                  onPressed: onPreview,
                  icon: const Icon(Icons.visibility_rounded),
                  label: const Text('Preview'),
                ),
                const Spacer(),
                FilledButton.icon(
                  onPressed: onUse,
                  icon: const Icon(Icons.movie_creation_rounded),
                  label: const Text('Utiliser'),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _TemplatePreviewPanel extends StatelessWidget {
  const _TemplatePreviewPanel({
    required this.template,
    required this.onClose,
    required this.onUse,
  });

  final FitilaTemplateData template;
  final VoidCallback onClose;
  final VoidCallback onUse;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: _fitilaInk,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(template.icon, color: _fitilaPrimary, size: 32),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  '${template.name} · ${template.baribaName}',
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 20,
                    fontWeight: FontWeight.w900,
                  ),
                ),
              ),
              IconButton(
                tooltip: 'Fermer',
                onPressed: onClose,
                icon: const Icon(Icons.close_rounded, color: Colors.white),
              ),
            ],
          ),
          const SizedBox(height: 12),
          AspectRatio(
            aspectRatio: 9 / 16,
            child: Container(
              alignment: Alignment.center,
              decoration: BoxDecoration(
                color: template.accent.withValues(alpha: 0.24),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: Colors.white24),
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(template.icon, color: Colors.white, size: 64),
                  const SizedBox(height: 12),
                  Text(
                    template.name,
                    textAlign: TextAlign.center,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 24,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 12),
          Text(
            template.summary,
            style: const TextStyle(color: Colors.white70, height: 1.35),
          ),
          const SizedBox(height: 12),
          FilledButton.icon(
            onPressed: onUse,
            icon: const Icon(Icons.play_arrow_rounded),
            label: const Text('Ouvrir dans le createur'),
          ),
        ],
      ),
    );
  }
}

class FitilaModuleScreen extends StatelessWidget {
  const FitilaModuleScreen({
    super.key,
    required this.page,
    required this.metrics,
    required this.items,
  });

  final FitilaPage page;
  final List<(String, String, IconData)> metrics;
  final List<(IconData, String, String)> items;

  @override
  Widget build(BuildContext context) {
    return _PageFrame(
      title: page.title,
      subtitle: page.description,
      child: ListView(
        children: [
          _MetricStrip(metrics: metrics),
          const SizedBox(height: 12),
          _FeatureGrid(items: items),
          const SizedBox(height: 12),
          _ActionList(
            items: [
              _ActionItem(
                page.icon,
                'Synchronisation backend',
                'Structure prete pour repository, Supabase, cache et realtime.',
              ),
              const _ActionItem(
                Icons.keyboard_voice_rounded,
                'Voix et accessibilite',
                'TTS, STT, lecture des libelles et grands boutons tactiles.',
              ),
              const _ActionItem(
                Icons.offline_bolt_rounded,
                'Mode offline',
                'Donnees locales, file de synchronisation et reprise reseau.',
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class UtilityScreen extends StatelessWidget {
  const UtilityScreen({super.key, required this.page});

  final FitilaPage page;

  @override
  Widget build(BuildContext context) {
    return _PageFrame(
      title: page.title,
      subtitle: page.description,
      child: ListView(
        children: [
          _MetricStrip(
            metrics: [
              ('Etat', 'Pret', page.icon),
              ('Sync', 'Locale', Icons.sync_rounded),
              ('Acces', 'Mobile', Icons.touch_app_rounded),
            ],
          ),
          const SizedBox(height: 12),
          _ActionList(
            items: [
              _ActionItem(page.icon, page.title, page.description),
              const _ActionItem(
                Icons.security_rounded,
                'Controle visuel',
                'Verifie les actions sensibles comme dans le web React.',
              ),
              const _ActionItem(
                Icons.api_rounded,
                'Connexion backend',
                'Point pret pour brancher Supabase dans la prochaine etape.',
              ),
            ],
          ),
        ],
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
                        color: mine ? _fitilaPrimary : Colors.white,
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(
                          color: mine ? _fitilaPrimary : _fitilaBorder,
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

class TemIaScreen extends StatefulWidget {
  const TemIaScreen({super.key});

  @override
  State<TemIaScreen> createState() => _TemIaScreenState();
}

class _TemIaScreenState extends State<TemIaScreen> {
  final _query = TextEditingController(
    text: 'Explique un article foncier en mots simples.',
  );
  String _answer =
      'Tem-IA analyse le texte, cite les sources et produit un resume bilingue Francais / Bàátɔ̀nú.';

  @override
  void dispose() {
    _query.dispose();
    super.dispose();
  }

  void _analyze() {
    final text = _query.text.trim();
    if (text.isEmpty) return;
    setState(() {
      _answer =
          'Analyse Tem-IA: "$text"\n\nResume: le sujet est reformule en langage clair, avec les points importants et une explication culturelle.\n\nSources: corpus foncier, dictionnaire Bariba, documents classes.';
    });
  }

  @override
  Widget build(BuildContext context) {
    return _PageFrame(
      title: 'Tem-IA foncier',
      subtitle: 'Assistant specialise avec sources citees, resume et voix.',
      child: ListView(
        children: [
          const _MetricStrip(
            metrics: [
              ('Sources', '128', Icons.source_rounded),
              ('Langues', 'FR/BA', Icons.translate_rounded),
              ('Mode', 'Foncier', Icons.gavel_rounded),
            ],
          ),
          const SizedBox(height: 12),
          _TextPanel(
            title: 'Question ou document',
            controller: _query,
            hint: 'Coller un article, poser une question ou dicter...',
            maxLines: 6,
          ),
          const SizedBox(height: 10),
          FilledButton.icon(
            onPressed: _analyze,
            icon: const Icon(Icons.auto_awesome_rounded),
            label: const Text('Analyser avec Tem-IA'),
          ),
          const SizedBox(height: 12),
          _InfoBox(title: 'Resultat', text: _answer),
          const _FeatureGrid(
            items: [
              (
                Icons.format_quote_rounded,
                'Sources citees',
                'Chaque reponse prepare les references pour affichage backend.',
              ),
              (
                Icons.record_voice_over_rounded,
                'Lecture vocale',
                'Restitution audio en Francais et Bariba.',
              ),
              (
                Icons.verified_rounded,
                'Controle',
                'Avertissement, moderation et validation humaine.',
              ),
            ],
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
                    backgroundColor: _fitilaPrimary,
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
            color: _fitilaPrimary,
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
            Wrap(
              spacing: 6,
              runSpacing: 6,
              children: [
                _PostMetaChip(
                  icon: Icons.visibility_rounded,
                  label: post.visibility,
                  color: post.accent,
                ),
                _PostMetaChip(
                  icon: Icons.movie_filter_rounded,
                  label: post.template,
                  color: post.accent,
                ),
                _PostMetaChip(
                  icon: Icons.perm_media_rounded,
                  label: post.mediaStatus,
                  color: post.accent,
                ),
                if (post.aiAssisted)
                  _PostMetaChip(
                    icon: Icons.auto_awesome_rounded,
                    label: 'IA',
                    color: post.accent,
                  ),
                for (final tag in post.tags.take(3))
                  _PostMetaChip(
                    icon: Icons.tag_rounded,
                    label: tag,
                    color: post.accent,
                  ),
              ],
            ),
            const SizedBox(height: 4),
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
                  onPressed: post.allowComments
                      ? () => setState(() => post.comments++)
                      : null,
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

class _PostMetaChip extends StatelessWidget {
  const _PostMetaChip({
    required this.icon,
    required this.label,
    required this.color,
  });

  final IconData icon;
  final String label;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 5),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.10),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: color.withValues(alpha: 0.24)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: color),
          const SizedBox(width: 4),
          Text(
            label,
            style: TextStyle(
              color: color,
              fontSize: 11,
              fontWeight: FontWeight.w900,
            ),
          ),
        ],
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
  final _title = TextEditingController();
  final _text = TextEditingController();
  final _prompt = TextEditingController();
  final _tags = TextEditingController(text: 'bariba, fitila');
  String _kind = 'texte';
  String _visibility = 'Public';
  String _template = 'Annonce village';
  bool _publishNow = true;
  bool _allowComments = true;

  @override
  void dispose() {
    _title.dispose();
    _text.dispose();
    _prompt.dispose();
    _tags.dispose();
    super.dispose();
  }

  Color get _kindAccent {
    return switch (_kind) {
      'audio' => Colors.teal,
      'vidéo' => Colors.indigo,
      'template' => Colors.purple,
      'ia' => Colors.green,
      _ => _fitilaPrimary,
    };
  }

  String get _mediaStatus {
    return switch (_kind) {
      'audio' => 'Audio pret',
      'vidéo' => 'Video prete',
      'template' => 'Template pret',
      'ia' => 'IA validee',
      _ => 'Texte pret',
    };
  }

  List<String> get _tagList {
    return _tags.text
        .split(',')
        .map((tag) => tag.trim())
        .where((tag) => tag.isNotEmpty)
        .take(6)
        .toList(growable: false);
  }

  void _generateWithIa() {
    final prompt = _prompt.text.trim().isEmpty
        ? 'Annonce communautaire en Bariba avec traduction francaise'
        : _prompt.text.trim();
    setState(() {
      _kind = 'ia';
      _title.text = 'Publication Fitila IA';
      _text.text =
          'Projet: $prompt\n\nBàátɔ̀nú: Wɛɛrɛ, partageons cette information avec clarte.\nFrancais: Message prepare pour la communaute avec ton respectueux, source et appel a l action.';
      _tags.text = 'ia, bariba, communaute';
      _template = 'Tem-IA foncier';
    });
  }

  void _publish() {
    final title = _title.text.trim();
    final body = _text.text.trim();
    if (title.isEmpty && body.isEmpty) return;
    final content = [
      if (title.isNotEmpty) title,
      if (body.isNotEmpty) body,
    ].join('\n\n');
    widget.onPostCreated(
      FeedPost(
        author: 'Utilisateur Fitila',
        kind: _kind,
        content: content,
        accent: _kindAccent,
        visibility: _visibility,
        tags: _tagList,
        template: _template,
        mediaStatus: _publishNow ? _mediaStatus : 'Brouillon',
        aiAssisted: _prompt.text.trim().isNotEmpty || _kind == 'ia',
        allowComments: _allowComments,
      ),
    );
    Navigator.pop(context);
  }

  @override
  Widget build(BuildContext context) {
    final bottomInset = MediaQuery.viewInsetsOf(context).bottom;
    return DraggableScrollableSheet(
      expand: false,
      initialChildSize: 0.88,
      minChildSize: 0.58,
      maxChildSize: 0.96,
      builder: (context, controller) => ListView(
        controller: controller,
        padding: EdgeInsets.fromLTRB(16, 0, 16, bottomInset + 16),
        children: [
          Row(
            children: [
              const Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Studio de creation',
                      style: TextStyle(
                        fontSize: 22,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                    Text('Texte, audio, video, templates et IA'),
                  ],
                ),
              ),
              IconButton.filledTonal(
                tooltip: 'Generer avec IA',
                onPressed: _generateWithIa,
                icon: const Icon(Icons.auto_awesome_rounded),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              _kindChip('texte', Icons.notes_rounded, 'Texte'),
              _kindChip('audio', Icons.mic_rounded, 'Audio'),
              _kindChip('vidéo', Icons.videocam_rounded, 'Video'),
              _kindChip('template', Icons.movie_filter_rounded, 'Template'),
              _kindChip('ia', Icons.auto_awesome_rounded, 'IA'),
            ],
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _title,
            decoration: const InputDecoration(
              labelText: 'Titre',
              prefixIcon: Icon(Icons.title_rounded),
            ),
          ),
          const SizedBox(height: 10),
          TextField(
            controller: _text,
            minLines: 5,
            maxLines: 9,
            decoration: InputDecoration(
              labelText: 'Contenu',
              hintText: _kind == 'audio'
                  ? 'Script audio, transcription ou note vocale...'
                  : _kind == 'vidéo'
                  ? 'Script video, sous-titres, description...'
                  : 'Que voulez-vous partager ?',
              prefixIcon: const Icon(Icons.edit_note_rounded),
            ),
          ),
          const SizedBox(height: 10),
          TextField(
            controller: _prompt,
            minLines: 2,
            maxLines: 4,
            decoration: const InputDecoration(
              labelText: 'Prompt IA / consigne',
              hintText: 'Ex: Corrige le Bariba et rends le texte plus clair.',
              prefixIcon: Icon(Icons.auto_awesome_rounded),
            ),
          ),
          const SizedBox(height: 10),
          TextField(
            controller: _tags,
            decoration: const InputDecoration(
              labelText: 'Tags separes par virgule',
              prefixIcon: Icon(Icons.tag_rounded),
            ),
          ),
          const SizedBox(height: 12),
          const Text('Template', style: TextStyle(fontWeight: FontWeight.w900)),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              for (final template in const [
                'Annonce village',
                'Lecon courte',
                'Culture Bariba',
                'Tem-IA foncier',
                'Publication libre',
              ])
                ChoiceChip(
                  selected: _template == template,
                  label: Text(template),
                  onSelected: (_) => setState(() => _template = template),
                ),
            ],
          ),
          const SizedBox(height: 12),
          SegmentedButton<String>(
            segments: const [
              ButtonSegment(
                value: 'Public',
                label: Text('Public'),
                icon: Icon(Icons.public_rounded),
              ),
              ButtonSegment(
                value: 'Classe',
                label: Text('Classe'),
                icon: Icon(Icons.school_rounded),
              ),
              ButtonSegment(
                value: 'Prive',
                label: Text('Prive'),
                icon: Icon(Icons.lock_rounded),
              ),
            ],
            selected: {_visibility},
            onSelectionChanged: (values) =>
                setState(() => _visibility = values.first),
          ),
          const SizedBox(height: 12),
          Card(
            child: Column(
              children: [
                SwitchListTile(
                  value: _publishNow,
                  onChanged: (value) => setState(() => _publishNow = value),
                  secondary: const Icon(Icons.schedule_send_rounded),
                  title: const Text('Publier maintenant'),
                  subtitle: const Text(
                    'Sinon, la publication reste en brouillon',
                  ),
                ),
                const Divider(height: 1),
                SwitchListTile(
                  value: _allowComments,
                  onChanged: (value) => setState(() => _allowComments = value),
                  secondary: const Icon(Icons.mode_comment_rounded),
                  title: const Text('Autoriser les commentaires'),
                  subtitle: const Text('Active les echanges dans le fil'),
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: const [
              _StatusChip(icon: Icons.check_circle_rounded, label: 'Langue'),
              _StatusChip(icon: Icons.subtitles_rounded, label: 'Sous-titres'),
              _StatusChip(icon: Icons.shield_rounded, label: 'Moderation'),
              _StatusChip(
                icon: Icons.cloud_done_rounded,
                label: 'Pret backend',
              ),
            ],
          ),
          const SizedBox(height: 14),
          FilledButton.icon(
            onPressed: _publish,
            icon: Icon(
              _publishNow ? Icons.publish_rounded : Icons.save_rounded,
            ),
            label: Text(_publishNow ? 'Publier' : 'Enregistrer brouillon'),
          ),
        ],
      ),
    );
  }

  Widget _kindChip(String value, IconData icon, String label) {
    final selected = _kind == value;
    return ChoiceChip(
      selected: selected,
      avatar: Icon(
        icon,
        size: 18,
        color: selected ? Colors.white : _kindAccent,
      ),
      label: Text(label),
      selectedColor: _kindAccent,
      labelStyle: TextStyle(
        color: selected ? Colors.white : _fitilaInk,
        fontWeight: FontWeight.w800,
      ),
      onSelected: (_) => setState(() => _kind = value),
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
          backgroundColor: _fitilaPrimarySoft,
          child: Icon(Icons.menu_book_rounded, color: _fitilaPrimary),
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
                color: _fitilaPrimary,
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
                    color: _fitilaPrimary.withValues(alpha: 0.14),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: const Icon(
                    Icons.assignment_rounded,
                    color: _fitilaPrimary,
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
                        color: _fitilaPrimary,
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
                    Icon(item.$1, color: _fitilaPrimary),
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
                  backgroundColor: _fitilaPrimarySoft,
                  child: Icon(item.icon, color: _fitilaPrimary),
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
                    Icon(metric.$3, color: _fitilaPrimary, size: 34),
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
            backgroundColor: _fitilaPrimary,
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
        selectedTileColor: _fitilaPrimary.withValues(alpha: 0.18),
        leading: Icon(
          page.icon,
          color: selected ? _fitilaPrimary : Colors.white70,
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

class _NavGrid extends StatelessWidget {
  const _NavGrid({
    required this.pages,
    required this.selected,
    required this.onSelected,
  });

  final List<FitilaPage> pages;
  final FitilaPage selected;
  final ValueChanged<FitilaPage> onSelected;

  @override
  Widget build(BuildContext context) {
    return GridView.builder(
      itemCount: pages.length,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2,
        mainAxisExtent: 94,
        crossAxisSpacing: 8,
        mainAxisSpacing: 8,
      ),
      itemBuilder: (context, index) {
        final page = pages[index];
        final active = page == selected;
        return InkWell(
          borderRadius: BorderRadius.circular(8),
          onTap: () => onSelected(page),
          child: Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: active
                  ? _fitilaPrimary.withValues(alpha: 0.18)
                  : Colors.white.withValues(alpha: 0.06),
              borderRadius: BorderRadius.circular(8),
              border: Border.all(
                color: active
                    ? _fitilaPrimary.withValues(alpha: 0.38)
                    : Colors.white.withValues(alpha: 0.08),
              ),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Icon(
                  page.icon,
                  size: 20,
                  color: active ? _fitilaPrimary : Colors.white70,
                ),
                const Spacer(),
                Text(
                  page.title,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 12,
                    fontWeight: FontWeight.w900,
                  ),
                ),
                Text(
                  page.description,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(color: Colors.white38, fontSize: 10),
                ),
              ],
            ),
          ),
        );
      },
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
      avatar: Icon(icon, size: 16, color: _fitilaPrimary),
      label: Text(label),
      visualDensity: VisualDensity.compact,
      side: const BorderSide(color: _fitilaBorder),
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
        color: _fitilaPrimarySoft,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        text,
        style: const TextStyle(
          color: _fitilaPrimary,
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
          secondary: Icon(icon, color: _fitilaPrimary),
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
                color: _fitilaPrimary,
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
              color: _fitilaPrimary,
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
        border: Border.all(color: _fitilaBorder),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title.toUpperCase(),
            style: const TextStyle(
              color: _fitilaPrimary,
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

const _fitilaTemplates = [
  FitilaTemplateData(
    id: 'griot-digital',
    name: 'Griot Digital',
    baribaName: 'Gando yɔyɔ',
    category: 'storytelling',
    summary: 'Recit patrimonial avec voix, sous-titres et rythme local.',
    duration: 30,
    icon: Icons.history_edu_rounded,
    accent: Color(0xFF8B5CF6),
    premium: true,
    newBadge: true,
  ),
  FitilaTemplateData(
    id: 'radio-village',
    name: 'Radio Village',
    baribaName: 'Wuu nɔɔ',
    category: 'social',
    summary:
        'Annonce audio courte, visuel radial et publication communautaire.',
    duration: 20,
    icon: Icons.campaign_rounded,
    accent: _fitilaPrimary,
    newBadge: true,
  ),
  FitilaTemplateData(
    id: 'lecon-du-jour',
    name: 'Lecon du jour',
    baribaName: 'Karo din',
    category: 'education',
    summary: 'Format classe avec exemple, quiz, repetition et correction.',
    duration: 45,
    icon: Icons.school_rounded,
    accent: Color(0xFF14B8A6),
  ),
  FitilaTemplateData(
    id: 'mini-doc-village',
    name: 'Mini-doc Village',
    baribaName: 'Tɔbu',
    category: 'storytelling',
    summary: 'Mini documentaire vertical avec chapitres et sources.',
    duration: 60,
    icon: Icons.movie_filter_rounded,
    accent: Color(0xFF6366F1),
    premium: true,
  ),
  FitilaTemplateData(
    id: 'tem-ia-foncier',
    name: 'Tem-IA Foncier',
    baribaName: 'Tem-IA',
    category: 'education',
    summary: 'Explication juridique simple avec resume bilingue et citations.',
    duration: 35,
    icon: Icons.gavel_rounded,
    accent: Color(0xFF22C55E),
    premium: true,
  ),
  FitilaTemplateData(
    id: 'smart-captions',
    name: 'Smart Captions',
    baribaName: 'Kpari',
    category: 'social',
    summary: 'Sous-titres automatiques, traduction et emphase karaoke.',
    duration: 25,
    icon: Icons.subtitles_rounded,
    accent: Color(0xFFEC4899),
  ),
  FitilaTemplateData(
    id: 'parole-ancien',
    name: 'Parole ancien',
    baribaName: 'Nɔɔ agba',
    category: 'culture',
    summary: 'Interview courte, transcription, citation et archive orale.',
    duration: 50,
    icon: Icons.elderly_rounded,
    accent: Color(0xFFF59E0B),
  ),
  FitilaTemplateData(
    id: 'annonce-communautaire',
    name: 'Annonce communautaire',
    baribaName: 'Kpɔn nɔɔ',
    category: 'social',
    summary: 'Message public, appel a action, lieux, date et partage rapide.',
    duration: 18,
    icon: Icons.notifications_active_rounded,
    accent: Color(0xFF0EA5E9),
  ),
];
