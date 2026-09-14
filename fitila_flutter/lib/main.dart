import 'dart:async';
import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:file_picker/file_picker.dart';
import 'package:http/http.dart' as http;
import 'package:image_picker/image_picker.dart';
import 'package:audioplayers/audioplayers.dart' as audio;
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:video_player/video_player.dart';

import 'core/fitila_backend.dart';
import 'core/fitila_media.dart';
import 'core/foncier_rag.dart';
import 'core/signature_theme.dart';
import 'core/web_parity_models.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await FitilaBackend.initialize();
  runApp(const FitilaApp());
}

const _fitilaPrimary = Color(0xFFC99530);
const _fitilaGoldDeep = Color(0xFF9C6B1D);
const _fitilaPrimarySoft = Color(0xFFF3E3B9);
const _fitilaClay = Color(0xFFB54E33);
const _fitilaSage = Color(0xFF3F6E52);
const _fitilaBorder = Color(0xFFE4DFCC);
const _fitilaInk = Color(0xFF241F2E);
const _fitilaInkSoft = Color(0xFF3A3448);
const _fitilaMuted = Color(0xFF8C8571);
const _fitilaSurface = Color(0xFFF7F5EC);
const _fitilaSurfaceAlt = Color(0xFFF1EDDF);
const _fitilaCard = Color(0xFFFFFFFF);
const _supabaseUrl = FitilaBackend.supabaseUrl;
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
  const FitilaApp({super.key, this.demoMode = false});

  final bool demoMode;

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      title: 'FITILA',
      theme: SignatureTheme.light(),
      home: AuthGate(demoMode: demoMode),
    );
  }
}

class AuthGate extends StatefulWidget {
  const AuthGate({super.key, this.demoMode = false});

  final bool demoMode;

  @override
  State<AuthGate> createState() => _AuthGateState();
}

class _AuthGateState extends State<AuthGate> {
  FitilaSession? _session;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _restore();
  }

  Future<void> _restore() async {
    if (widget.demoMode || !FitilaBackend.configured) {
      if (mounted) setState(() => _loading = false);
      return;
    }
    try {
      final restored = await FitilaBackend.restoreSession();
      if (!mounted) return;
      setState(() {
        _session = restored == null
            ? null
            : FitilaSession.fromBackend(restored);
        _loading = false;
      });
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _signOut() async {
    await FitilaBackend.signOut();
    if (mounted) setState(() => _session = null);
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }
    return _session == null
        ? AuthScreen(
            demoMode: widget.demoMode,
            onSignedIn: (session) => setState(() => _session = session),
          )
        : FitilaShell(session: _session!, onSignedOut: _signOut);
  }
}

class FitilaSession {
  const FitilaSession({
    required this.userId,
    required this.phone,
    required this.displayName,
    required this.role,
    required this.accessToken,
    this.username = '',
  });

  final String userId;
  final String phone;
  final String displayName;
  final String role;
  final String accessToken;
  final String username;

  factory FitilaSession.fromBackend(FitilaBackendSession session) {
    return FitilaSession(
      userId: session.userId,
      phone: session.phone,
      displayName: session.displayName,
      username: session.username,
      role: session.isAdmin ? 'Administrateur' : 'Membre',
      accessToken: session.accessToken,
    );
  }
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
    this.id,
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
    this.shares = 0,
    this.views = 0,
    this.mediaUrl,
    this.thumbnailUrl,
    this.createdAt,
    this.persisted = false,
    this.localMedia,
    this.backendSource = 'local',
  });

  final String? id;
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
  int shares;
  int views;
  final String? mediaUrl;
  final String? thumbnailUrl;
  final DateTime? createdAt;
  final bool persisted;
  final FitilaMediaAsset? localMedia;
  final String backendSource;

  factory FeedPost.fromBackend(Map<String, dynamic> row) {
    final profileValue = row['profile'];
    final profile = profileValue is List && profileValue.isNotEmpty
        ? profileValue.first as Map<String, dynamic>?
        : profileValue as Map<String, dynamic>?;
    final video = row['_source'] == 'video';
    final description = video
        ? row['description']?.toString()
        : (row['transcript_ba']?.toString().trim().isNotEmpty == true
              ? row['transcript_ba'].toString()
              : row['transcript_fr']?.toString());
    final rawTags = row['hashtags'];
    return FeedPost(
      id: row['id']?.toString(),
      author: profile?['display_name']?.toString().trim().isNotEmpty == true
          ? profile!['display_name'].toString()
          : (profile?['username']?.toString() ??
                row['template_name']?.toString() ??
                'Créateur FITILA'),
      kind: video ? 'vidéo' : (row['media_type']?.toString() ?? 'audio'),
      content: description?.trim().isNotEmpty == true
          ? description!.trim()
          : (row['title']?.toString() ?? 'Publication FITILA'),
      accent: video ? Colors.indigo : _fitilaPrimary,
      visibility: 'Public',
      tags: rawTags is List
          ? rawTags.map((value) => value.toString()).toList(growable: false)
          : const [],
      template:
          row['template_name']?.toString() ??
          row['template_id']?.toString() ??
          'Libre',
      mediaStatus: video ? 'Vidéo' : 'Publication',
      likes: (row['likes_count'] as num?)?.toInt() ?? 0,
      comments: (row['comments_count'] as num?)?.toInt() ?? 0,
      shares: (row['shares_count'] as num?)?.toInt() ?? 0,
      views: (row['views_count'] as num?)?.toInt() ?? 0,
      mediaUrl: video
          ? row['video_url']?.toString()
          : (row['media_url'] ?? row['audio_url'])?.toString(),
      thumbnailUrl: row['thumbnail_url']?.toString(),
      createdAt: DateTime.tryParse(row['created_at']?.toString() ?? ''),
      persisted: true,
      backendSource: row['_source']?.toString() ?? 'post',
    );
  }
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
    this.capabilities = const [],
    this.tags = const [],
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
  final List<String> capabilities;
  final List<String> tags;
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
    TranslationDirection direction, {
    String? accessToken,
    http.Client? client,
    Future<List<DictionaryEntry>> Function()? dictionaryLoader,
  }) async {
    final trimmed = text.trim();
    if (trimmed.isEmpty) return '';
    // The existing API requires an authenticated user. Demo sessions do not
    // manufacture a token or bypass the backend's access rules.
    if (accessToken != null && accessToken.isNotEmpty) {
      final transport = client ?? http.Client();
      try {
        final response = await transport
            .post(
              Uri.parse('$_supabaseUrl/functions/v1/ai-translate'),
              headers: {
                'content-type': 'application/json',
                'Authorization': 'Bearer $accessToken',
              },
              body: jsonEncode({
                'text': trimmed,
                'sourceLang': direction == TranslationDirection.frenchToBariba
                    ? 'french'
                    : 'bariba',
                'targetLang': direction == TranslationDirection.frenchToBariba
                    ? 'bariba'
                    : 'french',
              }),
            )
            .timeout(const Duration(seconds: 5));
        if (response.statusCode >= 200 && response.statusCode < 300) {
          final decoded = jsonDecode(response.body);
          if (decoded is Map && decoded['translation'] is String) {
            final translated = (decoded['translation'] as String).trim();
            if (translated.isNotEmpty) return translated;
          }
        }
      } catch (_) {
        // A failed remote request can still use a real dictionary match.
      } finally {
        if (client == null) transport.close();
      }
    }
    final entries = await (dictionaryLoader ?? loadDictionary)();
    final query = trimmed.toLowerCase();
    for (final entry in entries) {
      if (direction == TranslationDirection.baribaToFrench &&
          entry.word.toLowerCase() == query) {
        return entry.definition;
      }
      if (direction == TranslationDirection.frenchToBariba &&
          entry.definition.toLowerCase() == query) {
        return entry.word;
      }
    }
    throw StateError(
      'Aucune traduction locale trouvée. Une connexion authentifiée est nécessaire pour traduire ce texte.',
    );
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
  const AuthScreen({
    super.key,
    required this.onSignedIn,
    this.demoMode = false,
  });

  final ValueChanged<FitilaSession> onSignedIn;
  final bool demoMode;

  @override
  State<AuthScreen> createState() => _AuthScreenState();
}

class _AuthScreenState extends State<AuthScreen>
    with SingleTickerProviderStateMixin {
  final _phone = TextEditingController();
  final _password = TextEditingController();
  bool _busy = false;
  bool _obscure = true;
  bool _remember = true;
  bool _biometric = false;

  late final AnimationController _introController;
  late final Animation<double> _introOpacity;
  late final Animation<Offset> _heroSlide;
  late final Animation<Offset> _formSlide;

  @override
  void initState() {
    super.initState();
    _introController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 950),
    );
    final curve = CurvedAnimation(
      parent: _introController,
      curve: Curves.easeOutCubic,
    );
    _introOpacity = Tween<double>(begin: 0, end: 1).animate(curve);
    _heroSlide = Tween<Offset>(
      begin: const Offset(0, .06),
      end: Offset.zero,
    ).animate(curve);
    _formSlide = Tween<Offset>(
      begin: const Offset(0, .09),
      end: Offset.zero,
    ).animate(
      CurvedAnimation(
        parent: _introController,
        curve: const Interval(.18, 1, curve: Curves.easeOutCubic),
      ),
    );
    _introController.forward();

    if (widget.demoMode) {
      _phone.text = '65653468';
      _password.text = '123456';
    }
  }

  @override
  void dispose() {
    _introController.dispose();
    _phone.dispose();
    _password.dispose();
    super.dispose();
  }

  Future<void> _signIn() async {
    FocusScope.of(context).unfocus();
    setState(() => _busy = true);
    final phone = _phone.text.trim();
    final pin = _password.text.trim();
    try {
      if (widget.demoMode) {
        await Future<void>.delayed(const Duration(milliseconds: 100));
        widget.onSignedIn(
          FitilaSession(
            userId: 'widget-test-user',
            phone: '+229$phone',
            displayName: 'Utilisateur Fitila',
            role: 'Membre',
            accessToken: '',
          ),
        );
        return;
      }
      if (!FitilaBackend.configured) {
        throw StateError(
          'Configuration serveur non intégrée à cette APK. Installez une version FITILA configurée.',
        );
      }
      final backendSession = await FitilaBackend.signInWithPhone(
        phone: phone,
        pin: pin,
      );
      if (!mounted) return;
      widget.onSignedIn(FitilaSession.fromBackend(backendSession));
    } on AuthException catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Numéro ou PIN incorrect. Vérifiez vos informations.'),
        ),
      );
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text(
            'Connexion au serveur FITILA impossible. Vérifiez votre réseau puis réessayez.',
          ),
        ),
      );
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final wide = MediaQuery.sizeOf(context).width > 760;

    final hero = FadeTransition(
      opacity: _introOpacity,
      child: SlideTransition(
        position: _heroSlide,
        child: const _PremiumLandingHero(),
      ),
    );

    final form = FadeTransition(
      opacity: _introOpacity,
      child: SlideTransition(
        position: _formSlide,
        child: _authCard(),
      ),
    );

    return Scaffold(
      body: DecoratedBox(
        decoration: const BoxDecoration(
          color: _fitilaSurface,
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [
              Color(0xFFF9F7F0),
              Color(0xFFF3F0E5),
              Color(0xFFF7F5EC),
            ],
          ),
        ),
        child: SafeArea(
          child: Center(
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 1080),
              child: Padding(
                padding: EdgeInsets.fromLTRB(
                  wide ? 24 : 16,
                  wide ? 22 : 14,
                  wide ? 24 : 16,
                  wide ? 22 : 18,
                ),
                child: wide
                    ? Row(
                        crossAxisAlignment: CrossAxisAlignment.center,
                        children: [
                          Expanded(flex: 11, child: hero),
                          const SizedBox(width: 24),
                          Expanded(
                            flex: 10,
                            child: SingleChildScrollView(child: form),
                          ),
                        ],
                      )
                    : ListView(
                        keyboardDismissBehavior:
                            ScrollViewKeyboardDismissBehavior.onDrag,
                        children: [
                          hero,
                          const SizedBox(height: 14),
                          form,
                          const SizedBox(height: 10),
                        ],
                      ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _authCard() {
    final configured = FitilaBackend.configured;
    return Card(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(20, 22, 20, 18),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Bienvenue',
                        style: TextStyle(
                          color: _fitilaInk,
                          fontFamily: 'serif',
                          fontSize: 28,
                          fontWeight: FontWeight.w700,
                          letterSpacing: -.2,
                        ),
                      ),
                      const SizedBox(height: 5),
                      const Text(
                        'Connectez-vous pour retrouver votre univers FITILA.',
                        style: TextStyle(
                          color: _fitilaMuted,
                          fontSize: 13.5,
                          height: 1.4,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 12),
                Container(
                  width: 42,
                  height: 42,
                  decoration: const BoxDecoration(
                    color: _fitilaPrimarySoft,
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(
                    Icons.lock_person_rounded,
                    color: _fitilaGoldDeep,
                    size: 20,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 9),
              decoration: BoxDecoration(
                color: configured
                    ? const Color(0xFFDCEAE0)
                    : const Color(0xFFF4DED2),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Row(
                children: [
                  Icon(
                    configured
                        ? Icons.verified_rounded
                        : Icons.cloud_off_rounded,
                    size: 17,
                    color: configured ? _fitilaSage : _fitilaClay,
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      configured
                          ? 'Serveur FITILA prêt · connexion sécurisée'
                          : 'Configuration serveur absente de cette APK',
                      style: TextStyle(
                        color: configured ? _fitilaSage : _fitilaClay,
                        fontSize: 11.5,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 18),
            const Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(
                  Icons.phone_android_rounded,
                  size: 18,
                  color: _fitilaGoldDeep,
                ),
                SizedBox(width: 7),
                Flexible(
                  child: Text(
                    '+229 · Compte FITILA',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      color: _fitilaInkSoft,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 14),
            TextField(
              controller: _phone,
              keyboardType: TextInputType.phone,
              autofillHints: const [AutofillHints.telephoneNumber],
              inputFormatters: [
                FilteringTextInputFormatter.digitsOnly,
                LengthLimitingTextInputFormatter(11),
              ],
              decoration: const InputDecoration(
                labelText: 'Numéro de téléphone',
                prefixText: '+229 ',
                prefixIcon: Icon(Icons.phone_rounded),
              ),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _password,
              obscureText: _obscure,
              keyboardType: TextInputType.number,
              autofillHints: const [AutofillHints.password],
              inputFormatters: [
                FilteringTextInputFormatter.digitsOnly,
                LengthLimitingTextInputFormatter(6),
              ],
              decoration: InputDecoration(
                labelText: 'Code PIN',
                helperText: '6 chiffres',
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
            const SizedBox(height: 10),
            SizedBox(
              height: 52,
              child: FilledButton.icon(
                onPressed: _busy ? null : _signIn,
                icon: _busy
                    ? const SizedBox.square(
                        dimension: 18,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Icon(Icons.login_rounded),
                label: Text(_busy ? 'Connexion...' : 'Se connecter'),
              ),
            ),
            const SizedBox(height: 10),
            Theme(
              data: Theme.of(context).copyWith(
                listTileTheme: const ListTileThemeData(
                  minVerticalPadding: 0,
                  contentPadding: EdgeInsets.zero,
                ),
              ),
              child: Column(
                children: [
                  SwitchListTile(
                    value: _remember,
                    dense: true,
                    contentPadding: EdgeInsets.zero,
                    onChanged: (value) => setState(() => _remember = value),
                    secondary: const Icon(
                      Icons.verified_user_rounded,
                      color: _fitilaGoldDeep,
                    ),
                    title: const Text(
                      'Mémoriser cette session',
                      style: TextStyle(fontSize: 13),
                    ),
                  ),
                  SwitchListTile(
                    value: _biometric,
                    dense: true,
                    contentPadding: EdgeInsets.zero,
                    onChanged: (value) => setState(() => _biometric = value),
                    secondary: const Icon(
                      Icons.fingerprint_rounded,
                      color: _fitilaGoldDeep,
                    ),
                    title: const Text(
                      'Préparer PIN / biométrie',
                      style: TextStyle(fontSize: 13),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 10),
            const Wrap(
              alignment: WrapAlignment.center,
              spacing: 8,
              runSpacing: 8,
              children: [
                _StatusChip(
                  icon: Icons.shield_rounded,
                  label: 'Sécurisé',
                ),
                _StatusChip(
                  icon: Icons.offline_bolt_rounded,
                  label: 'Offline-ready',
                ),
                _StatusChip(
                  icon: Icons.keyboard_alt_rounded,
                  label: 'Clavier Bàátɔ̀nú',
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _PremiumLandingHero extends StatelessWidget {
  const _PremiumLandingHero();

  @override
  Widget build(BuildContext context) {
    final compact = MediaQuery.sizeOf(context).width < 760;
    return Container(
      constraints: BoxConstraints(minHeight: compact ? 190 : 500),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(compact ? 26 : 32),
        border: Border.all(color: _fitilaBorder),
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            Color(0xFFFFFFFF),
            Color(0xFFF7F0DF),
            Color(0xFFF1EDDF),
          ],
        ),
        boxShadow: const [
          BoxShadow(
            color: Color(0x1E241F2E),
            blurRadius: 32,
            offset: Offset(0, 18),
            spreadRadius: -18,
          ),
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(compact ? 26 : 32),
        child: Stack(
          children: [
            Positioned(
              right: compact ? -26 : -38,
              top: compact ? -32 : -44,
              child: Container(
                width: compact ? 118 : 178,
                height: compact ? 118 : 178,
                decoration: const BoxDecoration(
                  shape: BoxShape.circle,
                  color: Color(0x33C99530),
                ),
              ),
            ),
            Positioned(
              left: compact ? -36 : -62,
              bottom: compact ? -45 : -70,
              child: Container(
                width: compact ? 120 : 210,
                height: compact ? 120 : 210,
                decoration: const BoxDecoration(
                  shape: BoxShape.circle,
                  color: Color(0x263F6E52),
                ),
              ),
            ),
            Padding(
              padding: EdgeInsets.all(compact ? 18 : 28),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Row(
                    children: [
                      Container(
                        width: compact ? 44 : 58,
                        height: compact ? 44 : 58,
                        decoration: const BoxDecoration(
                          shape: BoxShape.circle,
                          gradient: LinearGradient(
                            begin: Alignment.topLeft,
                            end: Alignment.bottomRight,
                            colors: [_fitilaPrimary, Color(0xFFA6721F)],
                          ),
                        ),
                        child: const Icon(
                          Icons.auto_awesome_rounded,
                          color: Color(0xFF2B2110),
                        ),
                      ),
                      const SizedBox(width: 12),
                      const Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'FITILA',
                            style: TextStyle(
                              color: _fitilaGoldDeep,
                              fontFamily: 'serif',
                              fontSize: 25,
                              fontWeight: FontWeight.w700,
                              letterSpacing: .5,
                            ),
                          ),
                          Text(
                            'Bàátɔ̀nú · Culture · IA',
                            style: TextStyle(
                              color: _fitilaMuted,
                              fontSize: 11.5,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                  SizedBox(height: compact ? 14 : 34),
                  Text(
                    'La langue vivante,\naugmentée par l’IA.',
                    style: TextStyle(
                      color: _fitilaInk,
                      fontFamily: 'serif',
                      fontSize: compact ? 25 : 42,
                      height: 1.06,
                      fontWeight: FontWeight.w600,
                      letterSpacing: -.5,
                    ),
                  ),
                  SizedBox(height: compact ? 8 : 12),
                  ConstrainedBox(
                    constraints: const BoxConstraints(maxWidth: 460),
                    child: Text(
                      compact
                          ? 'Traduire, apprendre et transmettre le Bàátɔ̀nú, simplement.'
                          : 'Traduire, apprendre, partager et préserver le Bàátɔ̀nú dans une expérience mobile élégante et accessible.',
                      style: TextStyle(
                        color: _fitilaInkSoft,
                        fontSize: compact ? 12.5 : 15,
                        height: 1.5,
                      ),
                    ),
                  ),
                  SizedBox(height: compact ? 12 : 28),
                  if (compact)
                    const Row(
                      children: [
                        Expanded(
                          child: _LandingCompactFeature(
                            icon: Icons.translate_rounded,
                            label: 'Traduire',
                            tone: _fitilaPrimarySoft,
                            ink: _fitilaGoldDeep,
                          ),
                        ),
                        SizedBox(width: 7),
                        Expanded(
                          child: _LandingCompactFeature(
                            icon: Icons.auto_awesome_rounded,
                            label: 'IA',
                            tone: Color(0xFFF4DED2),
                            ink: _fitilaClay,
                          ),
                        ),
                        SizedBox(width: 7),
                        Expanded(
                          child: _LandingCompactFeature(
                            icon: Icons.school_rounded,
                            label: 'Apprendre',
                            tone: Color(0xFFDCEAE0),
                            ink: _fitilaSage,
                          ),
                        ),
                      ],
                    )
                  else
                    const Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: [
                        _LandingFeatureChip(
                          icon: Icons.translate_rounded,
                          label: 'Traduction',
                          tone: _fitilaPrimarySoft,
                          ink: _fitilaGoldDeep,
                        ),
                        _LandingFeatureChip(
                          icon: Icons.auto_awesome_rounded,
                          label: 'IA culturelle',
                          tone: Color(0xFFF4DED2),
                          ink: _fitilaClay,
                        ),
                        _LandingFeatureChip(
                          icon: Icons.school_rounded,
                          label: 'Apprentissage',
                          tone: Color(0xFFDCEAE0),
                          ink: _fitilaSage,
                        ),
                      ],
                    ),
                  if (!compact) ...[
                    const SizedBox(height: 34),
                    const Row(
                      children: [
                        Expanded(
                          child: _LandingMiniCard(
                            icon: Icons.menu_book_rounded,
                            title: 'Dictionnaire',
                            subtitle: 'Bàátɔ̀nú ↔ Français',
                          ),
                        ),
                        SizedBox(width: 10),
                        Expanded(
                          child: _LandingMiniCard(
                            icon: Icons.graphic_eq_rounded,
                            title: 'Voix',
                            subtitle: 'Écouter & prononcer',
                          ),
                        ),
                        SizedBox(width: 10),
                        Expanded(
                          child: _LandingMiniCard(
                            icon: Icons.groups_rounded,
                            title: 'Communauté',
                            subtitle: 'Partager & transmettre',
                          ),
                        ),
                      ],
                    ),
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _LandingCompactFeature extends StatelessWidget {
  const _LandingCompactFeature({
    required this.icon,
    required this.label,
    required this.tone,
    required this.ink,
  });

  final IconData icon;
  final String label;
  final Color tone;
  final Color ink;

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 38,
      padding: const EdgeInsets.symmetric(horizontal: 7),
      decoration: BoxDecoration(
        color: tone,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(icon, size: 14, color: ink),
          const SizedBox(width: 5),
          Flexible(
            child: Text(
              label,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(
                color: ink,
                fontSize: 10.5,
                fontWeight: FontWeight.w800,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _LandingFeatureChip extends StatelessWidget {
  const _LandingFeatureChip({
    required this.icon,
    required this.label,
    required this.tone,
    required this.ink,
  });

  final IconData icon;
  final String label;
  final Color tone;
  final Color ink;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 11, vertical: 8),
      decoration: BoxDecoration(
        color: tone,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 15, color: ink),
          const SizedBox(width: 6),
          Text(
            label,
            style: TextStyle(
              color: ink,
              fontSize: 11.5,
              fontWeight: FontWeight.w800,
            ),
          ),
        ],
      ),
    );
  }
}

class _LandingMiniCard extends StatelessWidget {
  const _LandingMiniCard({
    required this.icon,
    required this.title,
    required this.subtitle,
  });

  final IconData icon;
  final String title;
  final String subtitle;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(13),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: .78),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: _fitilaBorder),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: _fitilaGoldDeep, size: 20),
          const SizedBox(height: 10),
          Text(
            title,
            style: const TextStyle(
              color: _fitilaInk,
              fontSize: 12.5,
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            subtitle,
            style: const TextStyle(
              color: _fitilaMuted,
              fontSize: 10.5,
            ),
          ),
        ],
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
  final Set<FitilaPage> _visited = {FitilaPage.feed};
  final List<FitilaPage> _history = [];

  void _navigate(FitilaPage page) {
    if (page == _page) return;
    setState(() {
      _history.add(_page);
      _page = page;
      _visited.add(page);
    });
  }

  int get _destination => switch (_page) {
    FitilaPage.dictionary ||
    FitilaPage.translator ||
    FitilaPage.keyboard ||
    FitilaPage.voiceLab => 1,
    FitilaPage.ia || FitilaPage.temIa => 2,
    FitilaPage.learn || FitilaPage.classe || FitilaPage.teacher => 3,
    FitilaPage.profile || FitilaPage.settings => 4,
    _ => 0,
  };

  bool _feedLoading = false;
  String? _feedError;
  final List<FeedPost> _posts = [
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

  @override
  void initState() {
    super.initState();
    if (widget.session.accessToken.isNotEmpty) {
      _posts.clear();
      _loadFeed();
    }
  }

  Future<void> _loadFeed() async {
    setState(() {
      _feedLoading = true;
      _feedError = null;
    });
    try {
      final rows = await FitilaBackend.fetchPublicFeed();
      if (!mounted) return;
      setState(() {
        _posts
          ..clear()
          ..addAll(rows.map(FeedPost.fromBackend));
      });
    } catch (error) {
      if (!mounted) return;
      setState(() => _feedError = error.toString());
    } finally {
      if (mounted) setState(() => _feedLoading = false);
    }
  }

  Future<FeedPost?> _persistPost(FeedPost draft) async {
    final templateId = draft.template == 'Publication libre'
        ? null
        : draft.template;
    final media = draft.localMedia;
    final row = media == null
        ? await FitilaBackend.createTextPost(
            text: draft.content,
            hashtags: draft.tags,
            templateId: templateId,
            isPublic: draft.visibility == 'Public',
          )
        : await FitilaBackend.createMediaPost(
            bytes: await media.readBytes(),
            originalName: media.name,
            contentType: media.contentType,
            mediaType: media.mediaType,
            text: draft.content,
            hashtags: draft.tags,
            templateId: templateId,
            isPublic: draft.visibility == 'Public',
          );
    return FeedPost.fromBackend(row);
  }

  Widget _screenFor(FitilaPage page) {
    return switch (page) {
      FitilaPage.feed => FeedScreen(
        posts: _posts,
        onPostCreated: (post) => setState(() => _posts.insert(0, post)),
        loading: _feedLoading,
        error: _feedError,
        onRetry: _loadFeed,
        onPersistPost: widget.session.accessToken.isEmpty ? null : _persistPost,
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
      FitilaPage.services => WebParityModuleScreen(
        page: FitilaPage.services,
        onNavigate: _navigate,
      ),
      FitilaPage.market => WebParityModuleScreen(
        page: FitilaPage.market,
        onNavigate: _navigate,
      ),
      FitilaPage.agriculture => WebParityModuleScreen(
        page: FitilaPage.agriculture,
        onNavigate: _navigate,
      ),
      FitilaPage.finance => WebParityModuleScreen(
        page: FitilaPage.finance,
        onNavigate: _navigate,
      ),
      FitilaPage.education => WebParityModuleScreen(
        page: FitilaPage.education,
        onNavigate: _navigate,
      ),
      FitilaPage.health => WebParityModuleScreen(
        page: FitilaPage.health,
        onNavigate: _navigate,
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
      FitilaPage.translator => TranslatorScreen(
        accessToken: widget.session.accessToken,
      ),
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
        return PopScope(
          canPop: _history.isEmpty,
          onPopInvokedWithResult: (didPop, result) {
            if (!didPop && _history.isNotEmpty) {
              setState(() => _page = _history.removeLast());
            }
          },
          child: Scaffold(
            appBar: null,
            drawer: wide
                ? null
                : Drawer(
                    child: _NavigationPanel(
                      page: _page,
                      session: widget.session,
                      onSelected: (page) {
                        Navigator.pop(context);
                        _navigate(page);
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
                      onSelected: (page) => _navigate(page),
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
                            onProfile: () => _navigate(FitilaPage.profile),
                          ),
                        Expanded(
                          child: IndexedStack(
                            index: FitilaPage.values.indexOf(_page),
                            children: [
                              for (final page in FitilaPage.values)
                                TickerMode(
                                  enabled: page == _page,
                                  child:
                                      page == _page ||
                                          (_visited.contains(page) &&
                                              const {
                                                FitilaPage.dictionary,
                                                FitilaPage.translator,
                                                FitilaPage.classe,
                                                FitilaPage.learn,
                                                FitilaPage.ia,
                                                FitilaPage.temIa,
                                              }.contains(page))
                                      ? KeyedSubtree(
                                          key: ValueKey(page),
                                          child: _screenFor(page),
                                        )
                                      : const SizedBox.shrink(),
                                ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
            bottomNavigationBar: wide
                ? null
                : _PremiumBottomNav(
                    selectedIndex: _destination,
                    onSelected: (index) {
                      switch (index) {
                        case 0:
                          _navigate(FitilaPage.feed);
                        case 1:
                          _navigate(FitilaPage.dictionary);
                        case 2:
                          _navigate(FitilaPage.ia);
                        case 3:
                          _navigate(FitilaPage.learn);
                        case 4:
                          _navigate(FitilaPage.profile);
                      }
                    },
                  ),
            floatingActionButton:
                _page == FitilaPage.feed || _page == FitilaPage.creator
                ? FloatingActionButton(
                    backgroundColor: _fitilaClay,
                    foregroundColor: Colors.white,
                    onPressed: () => FeedScreen.showComposer(
                      context,
                      onPostCreated: (post) =>
                          setState(() => _posts.insert(0, post)),
                      onPersistPost: widget.session.accessToken.isEmpty
                          ? null
                          : _persistPost,
                    ),
                    child: const Icon(Icons.add_rounded),
                  )
                : null,
          ),
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
    final explorer = [
      FitilaPage.feed,
      FitilaPage.dictionary,
      FitilaPage.classe,
      FitilaPage.ia,
      FitilaPage.translator,
      FitilaPage.learn,
      FitilaPage.templates,
      FitilaPage.creator,
    ];
    final culture = [
      FitilaPage.voiceLab,
      FitilaPage.education,
      FitilaPage.discover,
      FitilaPage.messages,
    ];
    final services = [
      FitilaPage.services,
      FitilaPage.market,
      FitilaPage.agriculture,
      FitilaPage.finance,
      FitilaPage.health,
      FitilaPage.sos,
      FitilaPage.install,
    ];
    final account = [
      FitilaPage.keyboard,
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

    return Material(
      color: _fitilaCard,
      child: SafeArea(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(18, 18, 18, 24),
          children: [
            const Text(
              'FITILA',
              style: TextStyle(
                color: _fitilaGoldDeep,
                fontFamily: 'serif',
                fontSize: 22,
                fontWeight: FontWeight.w700,
                letterSpacing: .2,
              ),
            ),
            const SizedBox(height: 3),
            const Text(
              'Bàátɔ̀nú · Langue, Culture & IA',
              style: TextStyle(color: _fitilaMuted, fontSize: 11.5),
            ),
            const SizedBox(height: 18),
            const _SectionLabel('Explorer'),
            for (final item in explorer)
              _NavItem(
                page: item,
                selected: item == page,
                onTap: () => onSelected(item),
              ),
            const _SectionLabel('Culture'),
            for (final item in culture)
              _NavItem(
                page: item,
                selected: item == page,
                onTap: () => onSelected(item),
              ),
            const _SectionLabel('Services'),
            _NavGrid(pages: services, selected: page, onSelected: onSelected),
            const _SectionLabel('Compte'),
            for (final item in account)
              _NavItem(
                page: item,
                selected: item == page,
                onTap: () => onSelected(item),
              ),
            const SizedBox(height: 12),
            _ProfileTile(session: session),
            const SizedBox(height: 12),
            const _LanguageSwitch(),
          ],
        ),
      ),
    );
  }
}

class FeedScreen extends StatefulWidget {
  const FeedScreen({
    super.key,
    required this.posts,
    required this.onPostCreated,
    this.loading = false,
    this.error,
    this.onRetry,
    this.onPersistPost,
  });

  final List<FeedPost> posts;
  final ValueChanged<FeedPost> onPostCreated;
  final bool loading;
  final String? error;
  final VoidCallback? onRetry;
  final Future<FeedPost?> Function(FeedPost draft)? onPersistPost;

  static Future<void> showComposer(
    BuildContext context, {
    required ValueChanged<FeedPost> onPostCreated,
    Future<FeedPost?> Function(FeedPost draft)? onPersistPost,
  }) async {
    await showModalBottomSheet<void>(
      context: context,
      showDragHandle: true,
      isScrollControlled: true,
      builder: (_) => _CreatePostSheet(
        onPostCreated: onPostCreated,
        onPersistPost: onPersistPost,
      ),
    );
  }

  @override
  State<FeedScreen> createState() => _FeedScreenState();
}

class _FeedScreenState extends State<FeedScreen> {
  String _mode = 'Pour toi';

  Widget _modeChip(String value, IconData icon) {
    return ChoiceChip(
      selected: _mode == value,
      avatar: Icon(icon, size: 18),
      label: Text(value),
      onSelected: (_) => setState(() => _mode = value),
    );
  }

  Widget _feedSubmodule() {
    return switch (_mode) {
      'Ma voix' => const _FeatureGrid(
        items: [
          (
            Icons.mic_rounded,
            'Radio courte',
            'Flux audio, transcription, onde, écoute et arrêt automatique.',
          ),
          (
            Icons.graphic_eq_rounded,
            'Qualité audio',
            'Volume, bruit, durée, consentement et statut de modération.',
          ),
          (
            Icons.subtitles_rounded,
            'Sous-titres',
            'Transcription FR/BA synchronisée avec le lecteur.',
          ),
        ],
      ),
      'Vidéos' => const _FeatureGrid(
        items: [
          (
            Icons.play_circle_rounded,
            'Lecteur vertical',
            'Lecture vidéo 9:16, pause, replay, miniature et progression.',
          ),
          (
            Icons.movie_filter_rounded,
            'Effets',
            'Template appliqué, stickers, légende et piste musicale.',
          ),
          (
            Icons.fullscreen_rounded,
            'Preview plein écran',
            'Ouverture immersive avec actions like/commentaire/partage.',
          ),
        ],
      ),
      'Communauté' => _ActionList(
        items: const [
          _ActionItem(
            Icons.groups_rounded,
            'Villages et cercles',
            'Flux par communauté, langue, sujet et proximité culturelle.',
          ),
          _ActionItem(
            Icons.forum_rounded,
            'Commentaires',
            'Réponses, mentions, signalement et modération visuelle.',
          ),
          _ActionItem(
            Icons.notifications_active_rounded,
            'Temps réel',
            'Nouveaux posts, messages et interactions à synchroniser.',
          ),
        ],
      ),
      'Création' => _ActionList(
        items: const [
          _ActionItem(
            Icons.add_circle_rounded,
            'Bouton plus',
            'Créer texte, audio, vidéo, leçon, annonce ou template.',
          ),
          _ActionItem(
            Icons.drafts_rounded,
            'Brouillons',
            'Reprendre les captures non publiées et posts programmés.',
          ),
          _ActionItem(
            Icons.publish_rounded,
            'Publication',
            'Audience, hashtags, modération, offline queue et succès.',
          ),
        ],
      ),
      _ => const _FeatureGrid(
        items: [
          (
            Icons.auto_awesome_rounded,
            'Algorithme adaptatif',
            'Mélange posts, audio, vidéos, templates et contenus locaux.',
          ),
          (
            Icons.tune_rounded,
            'Filtres de fil',
            'Pour toi, suivis, village, classe, templates et populaire.',
          ),
          (
            Icons.bookmark_rounded,
            'Sauvegarde',
            'Favoris, historique, partage et reprise hors connexion.',
          ),
        ],
      ),
    };
  }

  @override
  Widget build(BuildContext context) {
    return _PageFrame(
      title: 'Fil Fitila',
      subtitle: 'Posts, audio, vidéos, modèles et publication rapide.',
      action: FilledButton.icon(
        onPressed: () => FeedScreen.showComposer(
          context,
          onPostCreated: widget.onPostCreated,
          onPersistPost: widget.onPersistPost,
        ),
        icon: const Icon(Icons.add_rounded),
        label: const Text('Nouveau post'),
      ),
      child: ListView(
        children: [
          const _PremiumStoryRow(),
          const SizedBox(height: 14),
          if (widget.loading) const LinearProgressIndicator(),
          if (widget.error != null)
            Card(
              child: ListTile(
                leading: const Icon(Icons.cloud_off_rounded),
                title: const Text('Le fil ne peut pas être chargé'),
                subtitle: const Text('Vérifiez la connexion puis réessayez.'),
                trailing: IconButton(
                  tooltip: 'Réessayer',
                  onPressed: widget.onRetry,
                  icon: const Icon(Icons.refresh_rounded),
                ),
              ),
            ),
          if (widget.loading || widget.error != null)
            const SizedBox(height: 12),
          const _MetricStrip(
            metrics: [
              ('Posts', '128', Icons.dynamic_feed_rounded),
              ('Vidéos', '36', Icons.play_circle_rounded),
              ('Audio', '54', Icons.mic_rounded),
            ],
          ),
          const SizedBox(height: 12),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              _modeChip('Pour toi', Icons.auto_awesome_rounded),
              _modeChip('Ma voix', Icons.mic_rounded),
              _modeChip('Vidéos', Icons.ondemand_video_rounded),
              _modeChip('Communauté', Icons.groups_rounded),
              _modeChip('Création', Icons.add_circle_rounded),
            ],
          ),
          const SizedBox(height: 12),
          _feedSubmodule(),
          const SizedBox(height: 12),
          LayoutBuilder(
            builder: (context, constraints) {
              final grid = constraints.maxWidth > 860;
              if (grid) {
                return GridView.builder(
                  itemCount: widget.posts.length,
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  gridDelegate: const SliverGridDelegateWithMaxCrossAxisExtent(
                    maxCrossAxisExtent: 420,
                    mainAxisExtent: 372,
                    crossAxisSpacing: 14,
                    mainAxisSpacing: 14,
                  ),
                  itemBuilder: (context, index) =>
                      _PostCard(post: widget.posts[index]),
                );
              }
              if (widget.posts.isEmpty && !widget.loading) {
                return const _EmptyState(
                  icon: Icons.dynamic_feed_rounded,
                  title: 'Aucune publication',
                  text: 'Le fil public ne contient encore aucun contenu.',
                );
              }
              return ListView.separated(
                itemCount: widget.posts.length,
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                separatorBuilder: (context, index) =>
                    const SizedBox(height: 12),
                itemBuilder: (context, index) =>
                    _PostCard(post: widget.posts[index]),
              );
            },
          ),
        ],
      ),
    );
  }
}

class _PremiumStoryRow extends StatelessWidget {
  const _PremiumStoryRow();

  static const _items = <(String, String)>[
    ('+', 'Ajouter'),
    ('RB', 'Radio'),
    ('CL', 'Classe'),
    ('CU', 'Culture'),
    ('IA', 'Fitila IA'),
  ];

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 82,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        itemCount: _items.length,
        separatorBuilder: (_, _) => const SizedBox(width: 12),
        itemBuilder: (context, index) {
          final item = _items[index];
          return SizedBox(
            width: 62,
            child: Column(
              children: [
                Container(
                  width: 56,
                  height: 56,
                  padding: const EdgeInsets.all(2.5),
                  decoration: const BoxDecoration(
                    shape: BoxShape.circle,
                    gradient: SweepGradient(
                      colors: [
                        _fitilaPrimary,
                        _fitilaClay,
                        _fitilaSage,
                        _fitilaPrimary,
                      ],
                    ),
                  ),
                  child: Container(
                    alignment: Alignment.center,
                    decoration: BoxDecoration(
                      color: _fitilaSurfaceAlt,
                      shape: BoxShape.circle,
                      border: Border.all(color: _fitilaSurface, width: 2),
                    ),
                    child: Text(
                      item.$1,
                      style: const TextStyle(
                        color: _fitilaInk,
                        fontSize: 11,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 5),
                Text(
                  item.$2,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    color: _fitilaMuted,
                    fontSize: 10.5,
                  ),
                ),
              ],
            ),
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
  String _captureMode = 'Vidéo';
  String _enginePanel = 'Moteur';
  bool _autoDraft = true;
  bool _captions = true;
  bool _music = false;
  bool _debugPanel = false;

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

  Widget _engineChip(String value, IconData icon) {
    return ChoiceChip(
      selected: _enginePanel == value,
      avatar: Icon(icon, size: 18),
      label: Text(value),
      onSelected: (_) => setState(() => _enginePanel = value),
    );
  }

  Widget _creatorEngineBody() {
    return switch (_enginePanel) {
      'Timeline' => const _FeatureGrid(
        items: [
          (
            Icons.timeline_rounded,
            'MiniTimeline',
            'Segments vidéo/audio, cuts, scènes, transitions et marqueurs.',
          ),
          (
            Icons.text_fields_rounded,
            'TextOverlayEditor',
            'Texte draggable, styles, inline edit, stickers et sous-titres.',
          ),
          (
            Icons.animation_rounded,
            'TemplateEffectsTimeline',
            'Effets synchronisés, keyframes, intensité et aperçu temps réel.',
          ),
        ],
      ),
      'Assets' => const _FeatureGrid(
        items: [
          (
            Icons.folder_rounded,
            'AssetManager',
            'Images, vidéos, sons, cache local, progression et reprise.',
          ),
          (
            Icons.cloud_download_rounded,
            'TemplateAssetLoader',
            'Téléchargement assets, IndexedDB web, fallback offline Flutter.',
          ),
          (
            Icons.perm_media_rounded,
            'Media slots',
            'TemplateSlotPicker, remplacement média et validation format.',
          ),
        ],
      ),
      'Drawers' => const _FeatureGrid(
        items: [
          (
            Icons.music_note_rounded,
            'MusicDrawer',
            'Bibliothèque audio, trim, mix, volume et droits.',
          ),
          (
            Icons.closed_caption_rounded,
            'CaptionsDrawer',
            'Transcription, traduction, karaoke, timing et correction.',
          ),
          (
            Icons.auto_fix_high_rounded,
            'MagicDrawer',
            'IA créative: hook, reformulation, b-roll, voice clone et style.',
          ),
          (
            Icons.brush_rounded,
            'GraphicsDrawer',
            'Stickers, formes, AR effects, overlays et charte FITILA.',
          ),
        ],
      ),
      'Export' => _ActionList(
        items: const [
          _ActionItem(
            Icons.high_quality_rounded,
            'OptimizedExportScreen',
            'Rendu 9:16, qualité, watermark, preview finale et progression.',
          ),
          _ActionItem(
            Icons.publish_rounded,
            'PublishScreen',
            'Caption, hashtags, audience, commentaires, brouillon et planning.',
          ),
          _ActionItem(
            Icons.check_circle_rounded,
            'SuccessScreen',
            'Confirmation, ajout au fil, partage et retour au studio.',
          ),
        ],
      ),
      _ => const _FeatureGrid(
        items: [
          (
            Icons.hub_rounded,
            'TemplateRegistry',
            'Catalogue, catégories, recherche, premium, nouveau et populaire.',
          ),
          (
            Icons.precision_manufacturing_rounded,
            'TemplateEngine',
            'Slots, overrides, rendu, effets, audio et composition finale.',
          ),
          (
            Icons.view_in_ar_rounded,
            'Preview 2D/3D',
            'StudioRenderer2D, ThreeJSPreview, overlays et rendu live.',
          ),
        ],
      ),
    };
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
          Card(
            child: Padding(
              padding: const EdgeInsets.all(14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Console de production React parity',
                    style: TextStyle(fontSize: 18, fontWeight: FontWeight.w900),
                  ),
                  const SizedBox(height: 10),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      for (final mode in const [
                        'Texte',
                        'Audio',
                        'Vidéo',
                        'Template',
                      ])
                        ChoiceChip(
                          selected: _captureMode == mode,
                          avatar: Icon(switch (mode) {
                            'Texte' => Icons.text_fields_rounded,
                            'Audio' => Icons.mic_rounded,
                            'Vidéo' => Icons.videocam_rounded,
                            _ => Icons.movie_filter_rounded,
                          }, size: 18),
                          label: Text(mode),
                          onSelected: (_) =>
                              setState(() => _captureMode = mode),
                        ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  SwitchListTile(
                    value: _autoDraft,
                    onChanged: (value) => setState(() => _autoDraft = value),
                    secondary: const Icon(Icons.drafts_rounded),
                    title: const Text('Brouillon automatique'),
                    subtitle: const Text(
                      'Sauvegarde locale, reprise offline et synchronisation future.',
                    ),
                  ),
                  SwitchListTile(
                    value: _captions,
                    onChanged: (value) => setState(() => _captions = value),
                    secondary: const Icon(Icons.subtitles_rounded),
                    title: const Text('Sous-titres et traduction'),
                    subtitle: const Text(
                      'Génère caption, hashtags, traduction Bariba et accessibilité.',
                    ),
                  ),
                  SwitchListTile(
                    value: _music,
                    onChanged: (value) => setState(() => _music = value),
                    secondary: const Icon(Icons.music_note_rounded),
                    title: const Text('Piste musicale / ambiance'),
                    subtitle: const Text(
                      'Prépare sélection audio, volume, droits et mix final.',
                    ),
                  ),
                  SwitchListTile(
                    value: _debugPanel,
                    onChanged: (value) => setState(() => _debugPanel = value),
                    secondary: const Icon(Icons.bug_report_rounded),
                    title: const Text('Panneau debug publication'),
                    subtitle: const Text(
                      'Expose metadata media, template, queue offline et payload backend.',
                    ),
                  ),
                  if (_debugPanel) ...[
                    const SizedBox(height: 8),
                    const _InfoBox(
                      title: 'Payload prêt',
                      text:
                          'content_type, template_id, media_url, audio_url, slots, overrides, effects, captions, visibility, hashtags, ai_metadata, moderation_status, scheduled_at.',
                    ),
                  ],
                ],
              ),
            ),
          ),
          const SizedBox(height: 12),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Grand moteur créateur',
                    style: TextStyle(fontSize: 18, fontWeight: FontWeight.w900),
                  ),
                  const SizedBox(height: 10),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      _engineChip(
                        'Moteur',
                        Icons.precision_manufacturing_rounded,
                      ),
                      _engineChip('Timeline', Icons.timeline_rounded),
                      _engineChip('Assets', Icons.perm_media_rounded),
                      _engineChip('Drawers', Icons.dashboard_customize_rounded),
                      _engineChip('Export', Icons.high_quality_rounded),
                    ],
                  ),
                  const SizedBox(height: 12),
                  _creatorEngineBody(),
                ],
              ),
            ),
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
                      for (final template in _fitilaTemplates.take(18))
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
          _CreatorTemplateCoverageBoard(
            selected: _template,
            onSelected: (template) => setState(() {
              _template = template;
              _phase = CreatorPhase.capturing;
            }),
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
                borderRadius: BorderRadius.circular(16),
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
                    borderRadius: BorderRadius.circular(16),
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

IconData _templateCategoryIcon(String category) {
  return switch (category) {
    'storytelling' => Icons.history_edu_rounded,
    'music' => Icons.music_note_rounded,
    'business' => Icons.business_center_rounded,
    'education' => Icons.school_rounded,
    'future' => Icons.auto_awesome_rounded,
    'social' => Icons.groups_rounded,
    'culture' => Icons.diversity_3_rounded,
    _ => Icons.movie_filter_rounded,
  };
}

class _CreatorTemplateCoverageBoard extends StatelessWidget {
  const _CreatorTemplateCoverageBoard({
    required this.selected,
    required this.onSelected,
  });

  final FitilaTemplateData selected;
  final ValueChanged<FitilaTemplateData> onSelected;

  @override
  Widget build(BuildContext context) {
    final categories = _fitilaTemplates
        .fold<Map<String, List<FitilaTemplateData>>>(
          {},
          (map, template) =>
              map..putIfAbsent(template.category, () => []).add(template),
        )
        .entries
        .toList(growable: false);

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
                    'Couverture templates React',
                    style: TextStyle(fontSize: 18, fontWeight: FontWeight.w900),
                  ),
                ),
                _StatusPill(text: '${_fitilaTemplates.length} modèles'),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              'Storytelling, musique, business, éducation, futur, social et culture avec capacités moteur prêtes pour branchement backend.',
              style: TextStyle(color: Colors.grey.shade700),
            ),
            const SizedBox(height: 12),
            LayoutBuilder(
              builder: (context, constraints) {
                return GridView.builder(
                  itemCount: categories.length,
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  gridDelegate: SliverGridDelegateWithMaxCrossAxisExtent(
                    maxCrossAxisExtent: constraints.maxWidth > 900 ? 360 : 520,
                    mainAxisExtent: 238,
                    crossAxisSpacing: 12,
                    mainAxisSpacing: 12,
                  ),
                  itemBuilder: (context, index) {
                    final category = categories[index];
                    final templates = category.value;
                    final premiumCount = templates
                        .where((template) => template.premium)
                        .length;
                    return Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: _fitilaSurface,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: _fitilaBorder),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              CircleAvatar(
                                backgroundColor: _fitilaPrimarySoft,
                                child: Icon(
                                  _templateCategoryIcon(category.key),
                                  color: _fitilaPrimary,
                                ),
                              ),
                              const SizedBox(width: 10),
                              Expanded(
                                child: Text(
                                  category.key,
                                  style: const TextStyle(
                                    fontWeight: FontWeight.w900,
                                    fontSize: 16,
                                  ),
                                ),
                              ),
                              _StatusPill(text: '${templates.length}'),
                            ],
                          ),
                          const SizedBox(height: 8),
                          Text(
                            '$premiumCount premium · ${templates.where((template) => template.newBadge).length} nouveaux',
                            style: TextStyle(color: Colors.grey.shade700),
                          ),
                          const SizedBox(height: 8),
                          Expanded(
                            child: Wrap(
                              spacing: 6,
                              runSpacing: 6,
                              children: [
                                for (final template in templates.take(6))
                                  ActionChip(
                                    avatar: Icon(template.icon, size: 16),
                                    label: Text(template.name),
                                    onPressed: () => onSelected(template),
                                    backgroundColor: template.id == selected.id
                                        ? _fitilaPrimarySoft
                                        : Colors.white,
                                  ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    );
                  },
                );
              },
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
  bool _premiumOnly = false;
  bool _newOnly = false;
  bool _showPublishFlow = true;

  List<FitilaTemplateData> get _filtered {
    return _fitilaTemplates
        .where((template) {
          final q = _query.trim().toLowerCase();
          final matchesQuery =
              q.isEmpty ||
              template.name.toLowerCase().contains(q) ||
              template.summary.toLowerCase().contains(q) ||
              template.baribaName.toLowerCase().contains(q) ||
              template.tags.any((tag) => tag.toLowerCase().contains(q)) ||
              template.capabilities.any(
                (capability) => capability.toLowerCase().contains(q),
              );
          final matchesCategory =
              _category == 'Tous' || template.category == _category;
          final matchesPremium = !_premiumOnly || template.premium;
          final matchesNew = !_newOnly || template.newBadge;
          return matchesQuery &&
              matchesCategory &&
              matchesPremium &&
              matchesNew;
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
          const _MetricStrip(
            metrics: [
              ('Templates', '42', Icons.movie_filter_rounded),
              ('Premium', '18', Icons.workspace_premium_rounded),
              ('Exports', '9:16', Icons.smart_display_rounded),
            ],
          ),
          const SizedBox(height: 12),
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
                  const SizedBox(height: 10),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      FilterChip(
                        selected: _premiumOnly,
                        avatar: const Icon(Icons.workspace_premium_rounded),
                        label: const Text('Premium seulement'),
                        onSelected: (value) =>
                            setState(() => _premiumOnly = value),
                      ),
                      FilterChip(
                        selected: _newOnly,
                        avatar: const Icon(Icons.fiber_new_rounded),
                        label: const Text('Nouveautés'),
                        onSelected: (value) => setState(() => _newOnly = value),
                      ),
                      FilterChip(
                        selected: _showPublishFlow,
                        avatar: const Icon(Icons.publish_rounded),
                        label: const Text('Flux publication'),
                        onSelected: (value) =>
                            setState(() => _showPublishFlow = value),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
          if (_showPublishFlow) ...[
            const SizedBox(height: 12),
            const _FeatureGrid(
              items: [
                (
                  Icons.video_library_rounded,
                  'TemplateHeroSection',
                  'Accroche visuelle, catégorie, format, durée et badge.',
                ),
                (
                  Icons.grid_view_rounded,
                  'TemplateGalleryGrid',
                  'Cartes, recherche, filtres, premium, favoris et usage.',
                ),
                (
                  Icons.fullscreen_rounded,
                  'TemplatePreviewFullscreen',
                  'Preview verticale, scènes, audio, CTA et sortie.',
                ),
                (
                  Icons.publish_rounded,
                  'TemplatePublishFlow',
                  'Caption, hashtags, visibilité, modération et création post.',
                ),
              ],
            ),
          ],
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
              runSpacing: 6,
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
                if (template.capabilities.isNotEmpty)
                  _PostMetaChip(
                    icon: Icons.bolt_rounded,
                    label: template.capabilities.first,
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
        borderRadius: BorderRadius.circular(16),
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
                borderRadius: BorderRadius.circular(16),
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
          if (template.capabilities.isNotEmpty) ...[
            const SizedBox(height: 12),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                for (final capability in template.capabilities)
                  _DarkChip(icon: Icons.bolt_rounded, label: capability),
              ],
            ),
          ],
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


class _WebParityAction {
  const _WebParityAction({
    required this.icon,
    required this.title,
    required this.subtitle,
    this.target,
    this.badge,
  });

  final IconData icon;
  final String title;
  final String subtitle;
  final FitilaPage? target;
  final String? badge;
}

class WebParityModuleScreen extends StatefulWidget {
  const WebParityModuleScreen({
    super.key,
    required this.page,
    this.onNavigate,
  });

  final FitilaPage page;
  final ValueChanged<FitilaPage>? onNavigate;

  @override
  State<WebParityModuleScreen> createState() => _WebParityModuleScreenState();
}

class _WebParityModuleScreenState extends State<WebParityModuleScreen> {
  int _selectedTab = 0;
  final _assistant = TextEditingController();

  @override
  void dispose() {
    _assistant.dispose();
    super.dispose();
  }

  List<(String, String, IconData)> get _metrics {
    return switch (widget.page) {
      FitilaPage.services => const [
          ('Services', '8', Icons.apps_rounded),
          ('Langues', '2', Icons.translate_rounded),
          ('Assistant', 'Vocal', Icons.mic_rounded),
        ],
      FitilaPage.market => const [
          ('Produits', '86', Icons.inventory_2_rounded),
          ('Emplois', '14', Icons.work_rounded),
          ('Espace', 'Vendeur', Icons.storefront_rounded),
        ],
      FitilaPage.agriculture => const [
          ('Météo', 'Live', Icons.wb_sunny_rounded),
          ('Marchés', '4', Icons.store_rounded),
          ('Conseil', 'Terrain', Icons.agriculture_rounded),
        ],
      FitilaPage.finance => const [
          ('Ventes', '45k', Icons.trending_up_rounded),
          ('Dépenses', '12k', Icons.trending_down_rounded),
          ('Épargne', 'Active', Icons.savings_rounded),
        ],
      FitilaPage.education => const [
          ('Modules', '6', Icons.menu_book_rounded),
          ('Leçons', '57', Icons.school_rounded),
          ('Audio', 'Actif', Icons.volume_up_rounded),
        ],
      FitilaPage.health => const [
          ('Guides', '5', Icons.health_and_safety_rounded),
          ('Urgence', '112', Icons.emergency_rounded),
          ('Assistant', 'Santé', Icons.chat_rounded),
        ],
      _ => const [
          ('Modules', '3', Icons.dashboard_rounded),
          ('Actions', 'Actives', Icons.touch_app_rounded),
          ('Offline', 'Oui', Icons.cloud_done_rounded),
        ],
    };
  }

  List<String> get _tabs {
    return switch (widget.page) {
      FitilaPage.market => const [
          'Accueil',
          'Acheter',
          'Vendre',
          'Emploi',
          'Recruter',
          'Mon espace',
        ],
      FitilaPage.finance => const [
          'Accueil',
          'Ventes',
          'Dépenses',
          'Tontine',
          'Crédit',
          'Épargne',
        ],
      FitilaPage.education => const [
          'Accueil',
          'Cultures',
          'Élevage',
          'Commerce',
          'Santé',
          'Histoires',
        ],
      FitilaPage.health => const [
          'Accueil',
          'Secours',
          'Médicaments',
          'Maternité',
          'Maladies',
          'Nutrition',
        ],
      FitilaPage.agriculture => const [
          'Accueil',
          'Météo',
          'Cultures',
          'Élevage',
          'Eau',
          'Prix',
        ],
      _ => const ['Services'],
    };
  }

  List<_WebParityAction> get _actions {
    return switch (widget.page) {
      FitilaPage.services => const [
          _WebParityAction(
            icon: Icons.translate_rounded,
            title: 'Traducteur',
            subtitle: 'Texte, voix, photo, document et conversation.',
            target: FitilaPage.translator,
          ),
          _WebParityAction(
            icon: Icons.health_and_safety_rounded,
            title: 'Santé',
            subtitle: 'Premiers secours, médicaments et contacts utiles.',
            target: FitilaPage.health,
          ),
          _WebParityAction(
            icon: Icons.school_rounded,
            title: 'Éducation',
            subtitle: 'Cours, exercices, classe et apprentissage.',
            target: FitilaPage.education,
          ),
          _WebParityAction(
            icon: Icons.account_balance_wallet_rounded,
            title: 'Finance',
            subtitle: 'Ventes, dépenses, tontine, crédit et épargne.',
            target: FitilaPage.finance,
          ),
          _WebParityAction(
            icon: Icons.agriculture_rounded,
            title: 'Agriculture',
            subtitle: 'Météo, cultures, élevage, eau et prix.',
            target: FitilaPage.agriculture,
          ),
          _WebParityAction(
            icon: Icons.menu_book_rounded,
            title: 'Dictionnaire',
            subtitle: 'Recherche Bàátɔ̀nú ↔ Français.',
            target: FitilaPage.dictionary,
          ),
          _WebParityAction(
            icon: Icons.sos_rounded,
            title: 'Sécurité / SOS',
            subtitle: 'Alerte, contacts et message vocal.',
            target: FitilaPage.sos,
          ),
          _WebParityAction(
            icon: Icons.storefront_rounded,
            title: 'Marché',
            subtitle: 'Acheter, vendre, emploi et espace vendeur.',
            target: FitilaPage.market,
          ),
        ],
      FitilaPage.market => const [
          _WebParityAction(
            icon: Icons.shopping_bag_rounded,
            title: 'Acheter',
            subtitle: 'Parcourir les produits, filtrer et contacter un vendeur.',
            badge: 'Produits',
          ),
          _WebParityAction(
            icon: Icons.add_business_rounded,
            title: 'Vendre',
            subtitle: 'Créer une annonce produit avec photo, prix et localisation.',
            badge: 'Annonce',
          ),
          _WebParityAction(
            icon: Icons.work_outline_rounded,
            title: 'Chercher un emploi',
            subtitle: 'Offres locales par métier et commune.',
            badge: 'Jobs',
          ),
          _WebParityAction(
            icon: Icons.person_search_rounded,
            title: 'Recruter',
            subtitle: 'Publier une offre et recevoir des candidatures.',
            badge: 'Emploi',
          ),
          _WebParityAction(
            icon: Icons.store_mall_directory_rounded,
            title: 'Mon espace vendeur',
            subtitle: 'Produits, commandes et statistiques.',
          ),
          _WebParityAction(
            icon: Icons.campaign_rounded,
            title: 'Mes annonces',
            subtitle: 'Gérer produits et offres publiés.',
          ),
        ],
      FitilaPage.agriculture => const [
          _WebParityAction(
            icon: Icons.wb_sunny_rounded,
            title: 'Météo',
            subtitle: 'Prévisions agricoles et conditions du jour.',
            badge: 'Aujourd’hui',
          ),
          _WebParityAction(
            icon: Icons.grass_rounded,
            title: 'Cultures',
            subtitle: 'Conseils de semis, entretien et récolte.',
          ),
          _WebParityAction(
            icon: Icons.pets_rounded,
            title: 'Élevage',
            subtitle: 'Santé animale, alimentation et suivi.',
          ),
          _WebParityAction(
            icon: Icons.water_drop_rounded,
            title: 'Eau',
            subtitle: 'Irrigation, disponibilité et bonnes pratiques.',
          ),
          _WebParityAction(
            icon: Icons.engineering_rounded,
            title: 'Technicien agricole',
            subtitle: 'Demander l’appui d’un technicien.',
            badge: 'Rappel',
          ),
          _WebParityAction(
            icon: Icons.payments_rounded,
            title: 'Prix du marché',
            subtitle: 'Maïs, igname, coton et produits locaux.',
            badge: 'FCFA',
          ),
        ],
      FitilaPage.finance => const [
          _WebParityAction(
            icon: Icons.point_of_sale_rounded,
            title: 'Ventes',
            subtitle: 'Enregistrer et suivre les recettes.',
          ),
          _WebParityAction(
            icon: Icons.receipt_long_rounded,
            title: 'Dépenses',
            subtitle: 'Saisir les dépenses et leur motif.',
          ),
          _WebParityAction(
            icon: Icons.groups_rounded,
            title: 'Tontine',
            subtitle: 'Membres, cotisations, tours et rappels.',
          ),
          _WebParityAction(
            icon: Icons.credit_score_rounded,
            title: 'Crédit',
            subtitle: 'Suivi des prêts, échéances et remboursements.',
          ),
          _WebParityAction(
            icon: Icons.savings_rounded,
            title: 'Épargne',
            subtitle: 'Objectif, progression et historique.',
          ),
          _WebParityAction(
            icon: Icons.support_agent_rounded,
            title: 'Conseiller',
            subtitle: 'Assistant financier bilingue.',
          ),
        ],
      FitilaPage.education => const [
          _WebParityAction(
            icon: Icons.grass_rounded,
            title: 'Agriculture',
            subtitle: 'Cours pratiques sur les cultures.',
          ),
          _WebParityAction(
            icon: Icons.pets_rounded,
            title: 'Élevage',
            subtitle: 'Modules pratiques et vocabulaire.',
          ),
          _WebParityAction(
            icon: Icons.storefront_rounded,
            title: 'Commerce',
            subtitle: 'Vente, calcul et gestion quotidienne.',
          ),
          _WebParityAction(
            icon: Icons.health_and_safety_rounded,
            title: 'Santé',
            subtitle: 'Prévention et vocabulaire utile.',
          ),
          _WebParityAction(
            icon: Icons.school_rounded,
            title: 'Classe FITILA',
            subtitle: 'N1/N2, 57 leçons et exercices.',
            target: FitilaPage.classe,
          ),
          _WebParityAction(
            icon: Icons.auto_stories_rounded,
            title: 'Témoignages',
            subtitle: 'Histoires et contenus culturels.',
          ),
        ],
      FitilaPage.health => const [
          _WebParityAction(
            icon: Icons.emergency_rounded,
            title: 'Premiers secours',
            subtitle: 'Décrire une urgence et obtenir les gestes prioritaires.',
            badge: 'Urgence',
          ),
          _WebParityAction(
            icon: Icons.medication_rounded,
            title: 'Médicaments',
            subtitle: 'Questions générales sur l’utilisation des médicaments.',
          ),
          _WebParityAction(
            icon: Icons.pregnant_woman_rounded,
            title: 'Maternité',
            subtitle: 'Informations grossesse, mère et bébé.',
          ),
          _WebParityAction(
            icon: Icons.coronavirus_rounded,
            title: 'Maladies',
            subtitle: 'Informations sur les maladies courantes.',
          ),
          _WebParityAction(
            icon: Icons.restaurant_rounded,
            title: 'Nutrition',
            subtitle: 'Conseils alimentation et bien-être.',
          ),
          _WebParityAction(
            icon: Icons.local_hospital_rounded,
            title: 'Contacts d’urgence',
            subtitle: 'SAMU Bénin, centre de santé et pharmacie.',
            badge: '112',
          ),
        ],
      _ => const [],
    };
  }

  void _openAction(_WebParityAction action) {
    if (action.target != null && widget.onNavigate != null) {
      widget.onNavigate!(action.target!);
      return;
    }
    showModalBottomSheet<void>(
      context: context,
      showDragHandle: true,
      isScrollControlled: true,
      builder: (sheetContext) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(18, 0, 18, 22),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 58,
                height: 58,
                decoration: const BoxDecoration(
                  color: _fitilaPrimarySoft,
                  shape: BoxShape.circle,
                ),
                child: Icon(action.icon, color: _fitilaGoldDeep, size: 28),
              ),
              const SizedBox(height: 12),
              Text(
                action.title,
                textAlign: TextAlign.center,
                style: const TextStyle(
                  color: _fitilaInk,
                  fontSize: 20,
                  fontWeight: FontWeight.w900,
                ),
              ),
              const SizedBox(height: 7),
              Text(
                action.subtitle,
                textAlign: TextAlign.center,
                style: const TextStyle(
                  color: _fitilaMuted,
                  height: 1.45,
                ),
              ),
              const SizedBox(height: 16),
              SizedBox(
                width: double.infinity,
                child: FilledButton.icon(
                  onPressed: () {
                    Navigator.pop(sheetContext);
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        content: Text(
                          '${action.title} : action ouverte dans FITILA.',
                        ),
                      ),
                    );
                  },
                  icon: const Icon(Icons.arrow_forward_rounded),
                  label: const Text('Continuer'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final tabs = _tabs;
    final actions = _actions;
    return _PageFrame(
      title: widget.page.title,
      subtitle: widget.page.description,
      child: ListView(
        keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
        children: [
          _MetricStrip(metrics: _metrics),
          const SizedBox(height: 12),
          if (tabs.length > 1)
            SizedBox(
              height: 42,
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                itemCount: tabs.length,
                separatorBuilder: (_, _) => const SizedBox(width: 7),
                itemBuilder: (context, index) => ChoiceChip(
                  selected: _selectedTab == index,
                  label: Text(tabs[index]),
                  onSelected: (_) => setState(() => _selectedTab = index),
                ),
              ),
            ),
          if (tabs.length > 1) const SizedBox(height: 12),
          GridView.builder(
            itemCount: actions.length,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 2,
              mainAxisExtent: 156,
              crossAxisSpacing: 10,
              mainAxisSpacing: 10,
            ),
            itemBuilder: (context, index) {
              final action = actions[index];
              return Material(
                color: _fitilaCard,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(20),
                  side: const BorderSide(color: _fitilaBorder),
                ),
                clipBehavior: Clip.antiAlias,
                child: InkWell(
                  onTap: () => _openAction(action),
                  child: Padding(
                    padding: const EdgeInsets.all(13),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Container(
                              width: 43,
                              height: 43,
                              decoration: const BoxDecoration(
                                color: _fitilaPrimarySoft,
                                shape: BoxShape.circle,
                              ),
                              child: Icon(
                                action.icon,
                                color: _fitilaGoldDeep,
                                size: 22,
                              ),
                            ),
                            const Spacer(),
                            if (action.badge != null)
                              Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 7,
                                  vertical: 4,
                                ),
                                decoration: BoxDecoration(
                                  color: const Color(0xFFDCEAE0),
                                  borderRadius: BorderRadius.circular(99),
                                ),
                                child: Text(
                                  action.badge!,
                                  style: const TextStyle(
                                    color: _fitilaSage,
                                    fontSize: 9,
                                    fontWeight: FontWeight.w900,
                                  ),
                                ),
                              ),
                          ],
                        ),
                        const Spacer(),
                        Text(
                          action.title,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            color: _fitilaInk,
                            fontSize: 13,
                            fontWeight: FontWeight.w900,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          action.subtitle,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            color: _fitilaMuted,
                            fontSize: 10,
                            height: 1.25,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              );
            },
          ),
          const SizedBox(height: 14),
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: _fitilaCard,
              borderRadius: BorderRadius.circular(18),
              border: Border.all(color: _fitilaBorder),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Assistant vocal / texte',
                  style: TextStyle(
                    color: _fitilaInk,
                    fontWeight: FontWeight.w900,
                  ),
                ),
                const SizedBox(height: 8),
                TextField(
                  controller: _assistant,
                  minLines: 1,
                  maxLines: 3,
                  decoration: InputDecoration(
                    hintText: 'Décrivez votre besoin...',
                    prefixIcon: const Icon(Icons.mic_rounded),
                    suffixIcon: IconButton(
                      tooltip: 'Envoyer',
                      onPressed: () {
                        final text = _assistant.text.trim();
                        if (text.isEmpty) return;
                        _assistant.clear();
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(
                            content: Text(
                              'Demande prise en compte : $text',
                            ),
                          ),
                        );
                      },
                      icon: const Icon(Icons.send_rounded),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class UtilityScreen extends StatefulWidget {
  const UtilityScreen({super.key, required this.page});

  final FitilaPage page;

  @override
  State<UtilityScreen> createState() => _UtilityScreenState();
}

class _UtilityScreenState extends State<UtilityScreen> {
  String _tab = 'Vue';

  List<(String, IconData)> get _tabs {
    return switch (widget.page) {
      FitilaPage.messages => [
        ('Vue', Icons.inbox_rounded),
        ('Vocaux', Icons.mic_rounded),
        ('Groupes', Icons.groups_rounded),
        ('Modération', Icons.security_rounded),
      ],
      FitilaPage.install => [
        ('Vue', Icons.install_mobile_rounded),
        ('PWA', Icons.web_asset_rounded),
        ('APK', Icons.android_rounded),
        ('Clavier', Icons.keyboard_alt_rounded),
      ],
      FitilaPage.drafts => [
        ('Vue', Icons.drafts_rounded),
        ('Créateur', Icons.movie_creation_rounded),
        ('Classe', Icons.school_rounded),
        ('Sync', Icons.sync_rounded),
      ],
      FitilaPage.offline => [
        ('Vue', Icons.cloud_off_rounded),
        ('Cache', Icons.storage_rounded),
        ('Queue', Icons.sync_problem_rounded),
        ('Conflits', Icons.merge_type_rounded),
      ],
      FitilaPage.wallet => [
        ('Vue', Icons.wallet_rounded),
        ('Tontine', Icons.savings_rounded),
        ('Reçus', Icons.receipt_long_rounded),
        ('Sécurité', Icons.lock_rounded),
      ],
      FitilaPage.history => [
        ('Vue', Icons.history_rounded),
        ('Recherches', Icons.search_rounded),
        ('Activité', Icons.timeline_rounded),
        ('Exports', Icons.download_rounded),
      ],
      FitilaPage.scan => [
        ('Vue', Icons.qr_code_scanner_rounded),
        ('QR', Icons.qr_code_rounded),
        ('Document', Icons.document_scanner_rounded),
        ('OCR', Icons.text_snippet_rounded),
      ],
      FitilaPage.sos => [
        ('Vue', Icons.sos_rounded),
        ('Contacts', Icons.phone_in_talk_rounded),
        ('Alerte', Icons.notifications_active_rounded),
        ('Localisation', Icons.location_on_rounded),
      ],
      _ => [
        ('Vue', widget.page.icon),
        ('Actions', Icons.touch_app_rounded),
        ('Backend', Icons.api_rounded),
        ('Offline', Icons.offline_bolt_rounded),
      ],
    };
  }

  Widget _utilityChip(String value, IconData icon) {
    return ChoiceChip(
      selected: _tab == value,
      avatar: Icon(icon, size: 18),
      label: Text(value),
      onSelected: (_) => setState(() => _tab = value),
    );
  }

  Widget _utilityBody() {
    if (widget.page == FitilaPage.messages) {
      return switch (_tab) {
        'Vocaux' => const _FeatureGrid(
          items: [
            (
              Icons.mic_rounded,
              'Message vocal',
              'Enregistrer, transcrire, traduire et envoyer avec consentement.',
            ),
            (
              Icons.volume_up_rounded,
              'Lecture accessible',
              'Vitesse, replay, transcription et lecture Bariba/Français.',
            ),
            (
              Icons.cloud_upload_rounded,
              'Sync médias',
              'Upload audio, statut, reprise réseau et file offline.',
            ),
          ],
        ),
        'Groupes' => _ActionList(
          items: const [
            _ActionItem(
              Icons.groups_rounded,
              'Communautés',
              'Groupes village, classe, famille, enseignants et modérateurs.',
            ),
            _ActionItem(
              Icons.forum_rounded,
              'Threads',
              'Réponses, mentions, réactions, partage de post et traduction.',
            ),
            _ActionItem(
              Icons.admin_panel_settings_rounded,
              'Rôles',
              'Admin groupe, membre, invité et contrôle visuel.',
            ),
          ],
        ),
        'Modération' => const _FeatureGrid(
          items: [
            (
              Icons.report_rounded,
              'Signalement',
              'Spam, abus, contenu sensible et escalade admin.',
            ),
            (
              Icons.visibility_rounded,
              'Contrôle visuel',
              'Confirmation avant partage public ou message sensible.',
            ),
            (
              Icons.security_rounded,
              'Confidentialité',
              'Blocage, sourdine, suppression et protection profil.',
            ),
          ],
        ),
        _ => const _FeatureGrid(
          items: [
            (
              Icons.inbox_rounded,
              'Boîte de réception',
              'Messages privés, non lus, favoris et recherche.',
            ),
            (
              Icons.chat_bubble_rounded,
              'Conversation',
              'Texte, audio, traduction et pièces jointes.',
            ),
            (
              Icons.notifications_rounded,
              'Notifications',
              'Mentions, réponses, corrections et annonces.',
            ),
          ],
        ),
      };
    }
    if (widget.page == FitilaPage.install) {
      return const _FeatureGrid(
        items: [
          (
            Icons.web_asset_rounded,
            'PWA',
            'Installer depuis navigateur, écran d’accueil et mode hors ligne.',
          ),
          (
            Icons.android_rounded,
            'APK Android',
            'Préparer build, permissions, stockage, micro et clavier.',
          ),
          (
            Icons.keyboard_alt_rounded,
            'Clavier natif',
            'Activation système, guide pas à pas et test de saisie.',
          ),
          (
            Icons.system_update_rounded,
            'Mises à jour',
            'Version, migration cache, assets et compatibilité backend.',
          ),
        ],
      );
    }
    if (widget.page == FitilaPage.offline) {
      return const _FeatureGrid(
        items: [
          (
            Icons.storage_rounded,
            'Cache local',
            'Dictionnaire, leçons, templates, posts, brouillons et paramètres.',
          ),
          (
            Icons.sync_problem_rounded,
            'Queue sync',
            'Réponses classe, posts, médias, contributions et messages.',
          ),
          (
            Icons.merge_type_rounded,
            'Conflits',
            'Comparaison local/serveur, priorité et résolution utilisateur.',
          ),
          (
            Icons.health_and_safety_rounded,
            'Diagnostic',
            'Taille cache, dernières erreurs, retry et purge contrôlée.',
          ),
        ],
      );
    }
    if (widget.page == FitilaPage.drafts) {
      return const _FeatureGrid(
        items: [
          (
            Icons.movie_creation_rounded,
            'Brouillons créateur',
            'Templates, médias, captions, effets et état publication.',
          ),
          (
            Icons.school_rounded,
            'Brouillons classe',
            'Réponses texte/audio, auto-évaluation et soumission différée.',
          ),
          (
            Icons.edit_note_rounded,
            'Notes IA',
            'Prompts, réponses, traductions et documents en attente.',
          ),
          (
            Icons.sync_rounded,
            'Reprise',
            'Ouvrir, publier, supprimer, programmer ou synchroniser.',
          ),
        ],
      );
    }
    if (widget.page == FitilaPage.wallet) {
      return const _FeatureGrid(
        items: [
          (
            Icons.account_balance_wallet_rounded,
            'Solde',
            'Crédit, bonus, historique et statut paiement.',
          ),
          (
            Icons.savings_rounded,
            'Tontine',
            'Groupes, cotisations, rappels, preuves et reçus.',
          ),
          (
            Icons.receipt_long_rounded,
            'Reçus',
            'PDF, partage, QR de vérification et export.',
          ),
          (
            Icons.lock_rounded,
            'Sécurité paiement',
            'PIN, confirmation visuelle, limites et journal.',
          ),
        ],
      );
    }
    if (widget.page == FitilaPage.history) {
      return const _FeatureGrid(
        items: [
          (
            Icons.search_rounded,
            'Recherches',
            'Dictionnaire, traducteur, IA, Tem-IA et classe.',
          ),
          (
            Icons.timeline_rounded,
            'Activité',
            'Posts vus, leçons ouvertes, corrections, scans et exports.',
          ),
          (
            Icons.bookmark_rounded,
            'Favoris',
            'Mots, templates, leçons, réponses IA et contenus enregistrés.',
          ),
          (
            Icons.delete_outline_rounded,
            'Confidentialité',
            'Effacer historique, export données et rétention locale.',
          ),
        ],
      );
    }
    if (widget.page == FitilaPage.scan) {
      return const _FeatureGrid(
        items: [
          (
            Icons.qr_code_rounded,
            'QR',
            'Profil, reçu, classe, contenu et vérification rapide.',
          ),
          (
            Icons.document_scanner_rounded,
            'Document',
            'Photo, recadrage, OCR, traduction et résumé IA.',
          ),
          (
            Icons.text_snippet_rounded,
            'OCR Bariba/FR',
            'Extraction texte, correction, dictionnaire et audio.',
          ),
          (
            Icons.security_rounded,
            'Sécurité',
            'Consentement, données sensibles et stockage local contrôlé.',
          ),
        ],
      );
    }
    return _ActionList(
      items: [
        _ActionItem(
          widget.page.icon,
          widget.page.title,
          widget.page.description,
        ),
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
    );
  }

  @override
  Widget build(BuildContext context) {
    return _PageFrame(
      title: widget.page.title,
      subtitle: widget.page.description,
      child: ListView(
        children: [
          _MetricStrip(
            metrics: [
              ('Etat', 'Pret', widget.page.icon),
              ('Sync', 'Locale', Icons.sync_rounded),
              ('Acces', 'Mobile', Icons.touch_app_rounded),
            ],
          ),
          const SizedBox(height: 12),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [for (final tab in _tabs) _utilityChip(tab.$1, tab.$2)],
          ),
          const SizedBox(height: 12),
          _utilityBody(),
        ],
      ),
    );
  }
}

class DictionaryScreen extends StatefulWidget {
  const DictionaryScreen({super.key, this.loadEntries});

  final Future<List<DictionaryEntry>> Function()? loadEntries;

  @override
  State<DictionaryScreen> createState() => _DictionaryScreenState();
}

class _DictionaryScreenState extends State<DictionaryScreen> {
  late Future<List<DictionaryEntry>> _entries;
  final _query = TextEditingController();
  String _inputMode = 'Clavier';
  bool _baribaToFrench = true;
  bool _showChars = false;
  DictionaryEntry? _selectedEntry;

  @override
  void initState() {
    super.initState();
    _entries = (widget.loadEntries ?? FitilaServices.loadDictionary)();
    _query.addListener(() {
      if (mounted) setState(() {});
    });
  }

  @override
  void dispose() {
    _query.dispose();
    super.dispose();
  }

  List<DictionaryEntry> _matches(List<DictionaryEntry> entries) {
    final q = _query.text.trim().toLowerCase();
    if (q.isEmpty) return const [];
    final exact = <DictionaryEntry>[];
    final starts = <DictionaryEntry>[];
    final contains = <DictionaryEntry>[];

    for (final entry in entries) {
      final word = entry.word.toLowerCase();
      final definition = entry.definition.toLowerCase();
      final target = _baribaToFrench ? word : definition;
      if (target == q) {
        exact.add(entry);
      } else if (target.startsWith(q)) {
        starts.add(entry);
      } else if (target.contains(q)) {
        contains.add(entry);
      }
      if (exact.length + starts.length + contains.length >= 24) break;
    }
    return [...exact, ...starts, ...contains].take(12).toList(growable: false);
  }

  void _select(DictionaryEntry entry) {
    setState(() {
      _selectedEntry = entry;
      _query.text = _baribaToFrench ? entry.word : entry.definition;
      _query.selection = TextSelection.collapsed(offset: _query.text.length);
    });
    FocusScope.of(context).unfocus();
  }

  void _search(List<DictionaryEntry> entries) {
    final matches = _matches(entries);
    if (matches.isNotEmpty) {
      _select(matches.first);
      return;
    }
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          _query.text.trim().isEmpty
              ? 'Saisissez un mot à rechercher.'
              : 'Aucun résultat pour « ${_query.text.trim()} ».',
        ),
      ),
    );
  }

  void _insertCharacter(String char) {
    final selection = _query.selection;
    final text = _query.text;
    final start = selection.start < 0 ? text.length : selection.start;
    final end = selection.end < 0 ? text.length : selection.end;
    _query.value = TextEditingValue(
      text: text.replaceRange(start, end, char),
      selection: TextSelection.collapsed(offset: start + char.length),
    );
  }

  Widget _modeButton(String label, IconData icon) {
    final selected = _inputMode == label;
    return Expanded(
      child: Material(
        color: selected ? _fitilaCard : _fitilaCard.withValues(alpha: .62),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: BorderSide(
            color: selected ? _fitilaPrimary : _fitilaBorder,
          ),
        ),
        child: InkWell(
          borderRadius: BorderRadius.circular(16),
          onTap: () => setState(() => _inputMode = label),
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 13),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(
                  icon,
                  size: 20,
                  color: selected ? _fitilaGoldDeep : _fitilaMuted,
                ),
                const SizedBox(width: 7),
                Text(
                  label,
                  style: TextStyle(
                    color: selected ? _fitilaInk : _fitilaMuted,
                    fontWeight: selected ? FontWeight.w800 : FontWeight.w600,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _resultCard(DictionaryEntry entry) {
    final part = switch (entry.partOfSpeech?.trim()) {
      'n' => 'n:y',
      'v' => 'verbe',
      'adj' => 'adjectif',
      'adv' => 'adverbe',
      final value when value != null && value.isNotEmpty => value,
      _ => null,
    };

    return Container(
      decoration: BoxDecoration(
        color: _fitilaCard,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: _fitilaBorder),
        boxShadow: const [
          BoxShadow(
            color: Color(0x1B241F2E),
            blurRadius: 26,
            offset: Offset(0, 12),
            spreadRadius: -16,
          ),
        ],
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(
        children: [
          Container(
            width: double.infinity,
            padding: const EdgeInsets.fromLTRB(20, 20, 16, 20),
            decoration: const BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [_fitilaPrimary, _fitilaClay],
              ),
            ),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('🇧🇯', style: TextStyle(fontSize: 30)),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        entry.word,
                        style: const TextStyle(
                          color: Colors.white,
                          fontFamily: 'serif',
                          fontSize: 28,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      if (entry.phonetic?.trim().isNotEmpty == true) ...[
                        const SizedBox(height: 4),
                        Text(
                          '[${entry.phonetic}]',
                          style: const TextStyle(
                            color: Color(0xE6FFFFFF),
                            fontSize: 17,
                          ),
                        ),
                      ],
                      if (part != null) ...[
                        const SizedBox(height: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 10,
                            vertical: 5,
                          ),
                          decoration: BoxDecoration(
                            color: Colors.white.withValues(alpha: .20),
                            borderRadius: BorderRadius.circular(999),
                          ),
                          child: Text(
                            part,
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 11.5,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
                IconButton(
                  tooltip: 'Fermer',
                  onPressed: () => setState(() => _selectedEntry = null),
                  style: IconButton.styleFrom(
                    backgroundColor: Colors.white.withValues(alpha: .18),
                    foregroundColor: Colors.white,
                    side: BorderSide.none,
                  ),
                  icon: const Icon(Icons.close_rounded),
                ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              children: [
                _WebDictionaryInfo(
                  icon: Icons.menu_book_rounded,
                  iconBackground: const Color(0xFFE6F0FF),
                  iconColor: const Color(0xFF3178D4),
                  label: '🇫🇷  Définition',
                  value: entry.definition,
                  onAudio: () {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(
                        content: Text('Lecture audio de la définition.'),
                      ),
                    );
                  },
                ),
                if (entry.exampleBariba?.trim().isNotEmpty == true) ...[
                  const SizedBox(height: 12),
                  _WebDictionaryInfo(
                    icon: Icons.chat_bubble_outline_rounded,
                    iconBackground: const Color(0xFFFFF1C7),
                    iconColor: _fitilaGoldDeep,
                    label: '🇧🇯  Exemple en Bàátɔ̀nú',
                    value: entry.exampleBariba!,
                  ),
                ],
                if (entry.exampleFrancais?.trim().isNotEmpty == true) ...[
                  const SizedBox(height: 12),
                  _WebDictionaryInfo(
                    icon: Icons.swap_horiz_rounded,
                    iconBackground: const Color(0xFFE8F5EC),
                    iconColor: _fitilaSage,
                    label: '🇫🇷  Traduction de l’exemple',
                    value: entry.exampleFrancais!,
                    onAudio: () {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                          content: Text('Lecture audio de l’exemple.'),
                        ),
                      );
                    },
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return _PageFrame(
      title: 'Dictionnaire',
      subtitle: 'Recherche Bàátɔ̀nú ↔ Français, clavier et recherche vocale.',
      child: FutureBuilder<List<DictionaryEntry>>(
        future: _entries,
        builder: (context, snapshot) {
          if (snapshot.hasError) {
            return Center(
              child: FilledButton.icon(
                onPressed: () => setState(() {
                  _entries =
                      (widget.loadEntries ?? FitilaServices.loadDictionary)();
                }),
                icon: const Icon(Icons.refresh_rounded),
                label: const Text('Recharger le dictionnaire'),
              ),
            );
          }
          if (!snapshot.hasData) {
            return const Center(child: CircularProgressIndicator());
          }

          final entries = snapshot.data!;
          final matches = _matches(entries);

          return ListView(
            keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
            children: [
              Row(
                children: [
                  _modeButton('Clavier', Icons.keyboard_alt_rounded),
                  const SizedBox(width: 10),
                  _modeButton('Vocal', Icons.mic_rounded),
                ],
              ),
              const SizedBox(height: 10),
              Text(
                '${entries.length.toString().replaceAllMapped(RegExp(r"(?=(\d{3})+(?!\d))"), (m) => " ")} mots',
                textAlign: TextAlign.center,
                style: const TextStyle(
                  color: _fitilaMuted,
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                ),
              ),
              const SizedBox(height: 12),
              if (_inputMode == 'Clavier')
                Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: _fitilaCard,
                    borderRadius: BorderRadius.circular(22),
                    border: Border.all(color: _fitilaBorder),
                  ),
                  child: Column(
                    children: [
                      Wrap(
                        alignment: WrapAlignment.center,
                        crossAxisAlignment: WrapCrossAlignment.center,
                        spacing: 7,
                        runSpacing: 7,
                        children: [
                          ChoiceChip(
                            selected: _baribaToFrench,
                            label: const Text('🇧🇯 Bàátɔ̀nú'),
                            onSelected: (_) {
                              setState(() {
                                _baribaToFrench = true;
                                _selectedEntry = null;
                                _query.clear();
                              });
                            },
                          ),
                          const Icon(
                            Icons.arrow_forward_rounded,
                            color: _fitilaMuted,
                            size: 18,
                          ),
                          ChoiceChip(
                            selected: !_baribaToFrench,
                            label: const Text('🇫🇷 Français'),
                            onSelected: (_) {
                              setState(() {
                                _baribaToFrench = false;
                                _selectedEntry = null;
                                _query.clear();
                              });
                            },
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      TextField(
                        controller: _query,
                        textInputAction: TextInputAction.search,
                        onSubmitted: (_) => _search(entries),
                        decoration: InputDecoration(
                          hintText: _baribaToFrench
                              ? 'Tapez un mot Bàátɔ̀nú'
                              : 'Tapez un mot français',
                          prefixIcon: const Icon(Icons.search_rounded),
                          suffixIcon: SizedBox(
                            width: 104,
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.end,
                              children: [
                                IconButton(
                                  tooltip: 'Caractères spéciaux',
                                  onPressed: () =>
                                      setState(() => _showChars = !_showChars),
                                  icon: const Icon(
                                    Icons.keyboard_alt_rounded,
                                  ),
                                ),
                                if (_query.text.isNotEmpty)
                                  IconButton(
                                    tooltip: 'Effacer',
                                    onPressed: () {
                                      _query.clear();
                                      setState(() => _selectedEntry = null);
                                    },
                                    icon: const Icon(Icons.close_rounded),
                                  ),
                              ],
                            ),
                          ),
                        ),
                      ),
                      if (_showChars) ...[
                        const SizedBox(height: 10),
                        _BaribaKeyboard(onInsert: _insertCharacter),
                      ],
                      if (matches.isNotEmpty && _selectedEntry == null) ...[
                        const SizedBox(height: 10),
                        Material(
                          color: _fitilaSurfaceAlt,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(16),
                            side: const BorderSide(color: _fitilaBorder),
                          ),
                          clipBehavior: Clip.antiAlias,
                          child: Column(
                            children: [
                              for (final entry in matches.take(8))
                                ListTile(
                                  dense: true,
                                  onTap: () => _select(entry),
                                  leading: const Icon(
                                    Icons.menu_book_rounded,
                                    color: _fitilaGoldDeep,
                                  ),
                                  title: Text(
                                    _baribaToFrench
                                        ? entry.word
                                        : entry.definition,
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                  subtitle: Text(
                                    _baribaToFrench
                                        ? entry.definition
                                        : entry.word,
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                  trailing: const Icon(
                                    Icons.chevron_right_rounded,
                                  ),
                                ),
                            ],
                          ),
                        ),
                      ],
                    ],
                  ),
                )
              else
                Container(
                  padding: const EdgeInsets.all(22),
                  decoration: BoxDecoration(
                    color: _fitilaCard,
                    borderRadius: BorderRadius.circular(22),
                    border: Border.all(color: _fitilaBorder),
                  ),
                  child: Column(
                    children: [
                      Container(
                        width: 64,
                        height: 64,
                        decoration: const BoxDecoration(
                          color: _fitilaPrimarySoft,
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(
                          Icons.mic_rounded,
                          color: _fitilaGoldDeep,
                          size: 30,
                        ),
                      ),
                      const SizedBox(height: 12),
                      const Text(
                        'Recherche vocale',
                        style: TextStyle(
                          color: _fitilaInk,
                          fontSize: 17,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                      const SizedBox(height: 6),
                      const Text(
                        'Prononcez un mot en Bàátɔ̀nú ou en français. Le résultat s’affichera dans la même fiche détaillée.',
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          color: _fitilaMuted,
                          height: 1.4,
                        ),
                      ),
                      const SizedBox(height: 14),
                      FilledButton.icon(
                        onPressed: () {
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(
                              content: Text(
                                'Le moteur STT est disponible dans Voice Lab; intégration directe en cours de parité.',
                              ),
                            ),
                          );
                        },
                        icon: const Icon(Icons.mic_rounded),
                        label: const Text('Parler maintenant'),
                      ),
                    ],
                  ),
                ),
              const SizedBox(height: 14),
              SizedBox(
                height: 52,
                child: FilledButton.icon(
                  style: FilledButton.styleFrom(
                    backgroundColor: _fitilaSage,
                    foregroundColor: Colors.white,
                  ),
                  onPressed: () => _showContribution(context),
                  icon: const Icon(Icons.add_rounded),
                  label: const Text('Proposer un mot'),
                ),
              ),
              const SizedBox(height: 16),
              if (_selectedEntry != null)
                _resultCard(_selectedEntry!)
              else if (_query.text.trim().isEmpty)
                const _EmptyState(
                  icon: Icons.menu_book_rounded,
                  title: 'Cherchez un mot',
                  text:
                      'Le dictionnaire embarqué reprend le parcours du site FITILA avec recherche et fiche détaillée.',
                ),
            ],
          );
        },
      ),
    );
  }
}

class _WebDictionaryInfo extends StatelessWidget {
  const _WebDictionaryInfo({
    required this.icon,
    required this.iconBackground,
    required this.iconColor,
    required this.label,
    required this.value,
    this.onAudio,
  });

  final IconData icon;
  final Color iconBackground;
  final Color iconColor;
  final String label;
  final String value;
  final VoidCallback? onAudio;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: _fitilaSurface.withValues(alpha: .70),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: _fitilaBorder),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 42,
            height: 42,
            decoration: BoxDecoration(
              color: iconBackground,
              shape: BoxShape.circle,
            ),
            child: Icon(icon, color: iconColor, size: 21),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        label,
                        style: TextStyle(
                          color: iconColor,
                          fontSize: 12,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                    ),
                    if (onAudio != null)
                      IconButton(
                        tooltip: 'Écouter',
                        onPressed: onAudio,
                        icon: const Icon(Icons.volume_up_rounded),
                      ),
                  ],
                ),
                const SizedBox(height: 4),
                Text(
                  value,
                  style: const TextStyle(
                    color: _fitilaInk,
                    fontSize: 16,
                    height: 1.4,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class TranslatorScreen extends StatefulWidget {
  const TranslatorScreen({super.key, required this.accessToken});

  final String accessToken;

  @override
  State<TranslatorScreen> createState() => _TranslatorScreenState();
}

class _TranslatorScreenState extends State<TranslatorScreen> {
  final _input = TextEditingController();
  final _output = TextEditingController();
  TranslationDirection _direction = TranslationDirection.frenchToBariba;
  String _mode = 'Texte';
  bool _autoDetect = true;
  bool _conversationMode = true;
  bool _busy = false;
  String? _detectedLanguage;
  final List<({String source, String result})> _history = [];

  @override
  void dispose() {
    _input.dispose();
    _output.dispose();
    super.dispose();
  }

  String get _sourceLabel =>
      _direction == TranslationDirection.frenchToBariba
      ? '🇫🇷 Français'
      : '🇧🇯 Bàátɔ̀nú';

  String get _targetLabel =>
      _direction == TranslationDirection.frenchToBariba
      ? '🇧🇯 Bàátɔ̀nú'
      : '🇫🇷 Français';

  void _swapLanguages() {
    setState(() {
      _direction = _direction == TranslationDirection.frenchToBariba
          ? TranslationDirection.baribaToFrench
          : TranslationDirection.frenchToBariba;
      final input = _input.text;
      _input.text = _output.text;
      _output.text = input;
      _detectedLanguage = null;
    });
  }

  void _detectFromText(String value) {
    if (!_autoDetect || value.trim().length < 3) return;
    final lower = value.toLowerCase();
    final baribaSignals = [
      'ɔ',
      'ɛ',
      'ŋ',
      'sɔ̃',
      'gari',
      'mba',
      'wɛɛ',
      'bɛɛ',
      'tem',
    ];
    final likelyBariba = baribaSignals.any(lower.contains);
    setState(() {
      _detectedLanguage = likelyBariba ? 'Bàátɔ̀nú' : 'Français';
      _direction = likelyBariba
          ? TranslationDirection.baribaToFrench
          : TranslationDirection.frenchToBariba;
    });
  }

  Future<void> _translate() async {
    final source = _input.text.trim();
    if (source.isEmpty || _busy) return;
    setState(() => _busy = true);
    try {
      final translated = await FitilaServices.translate(
        source,
        _direction,
        accessToken: widget.accessToken,
      );
      if (!mounted) return;
      setState(() {
        _output.text = translated;
        if (translated.isNotEmpty) {
          _history.insert(0, (source: source, result: translated));
          if (_history.length > 20) _history.removeLast();
        }
      });
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            error is StateError
                ? error.message
                : 'Traduction indisponible. Réessayez.',
          ),
        ),
      );
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _pasteAndTranslate() async {
    final data = await Clipboard.getData(Clipboard.kTextPlain);
    final text = data?.text?.trim() ?? '';
    if (text.isEmpty) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Le presse-papiers est vide.')),
      );
      return;
    }
    setState(() {
      _mode = 'Coller';
      _input.text = text;
    });
    _detectFromText(text);
    await _translate();
  }

  Future<void> _translateImage() async {
    if (!FitilaBackend.configured) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Serveur FITILA indisponible.')),
      );
      return;
    }
    final file = await ImagePicker().pickImage(
      source: ImageSource.gallery,
      imageQuality: 88,
      maxWidth: 1800,
    );
    if (file == null) return;
    final bytes = await file.readAsBytes();
    await _ocrTranslate(bytes, file.name);
  }

  Future<void> _translateDocument() async {
    if (!FitilaBackend.configured) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Serveur FITILA indisponible.')),
      );
      return;
    }
    final selection = await FilePicker.platform.pickFiles(
      type: FileType.custom,
      allowedExtensions: const ['pdf', 'png', 'jpg', 'jpeg', 'webp'],
      withData: true,
    );
    if (selection == null || selection.files.isEmpty) return;
    final file = selection.files.first;
    final bytes = file.bytes;
    if (bytes == null) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Impossible de lire le document.')),
      );
      return;
    }
    await _ocrTranslate(bytes, file.name);
  }

  Future<void> _ocrTranslate(List<int> bytes, String fileName) async {
    if (_busy) return;
    setState(() => _busy = true);
    try {
      final target = _direction == TranslationDirection.frenchToBariba
          ? 'bariba'
          : 'french';
      final response = await FitilaBackend.client.functions.invoke(
        'ocr-translate',
        body: {
          'document': base64Encode(bytes),
          'fileName': fileName,
          'targetLanguage': target,
          'translateMode': 'combined',
        },
      );
      final data = response.data;
      if (data is! Map) {
        throw StateError('Réponse OCR invalide.');
      }
      final extracted = data['extractedText']?.toString().trim() ?? '';
      final translation = data['translation']?.toString().trim() ?? '';
      if (!mounted) return;
      setState(() {
        _input.text = extracted;
        _output.text = translation;
        if (extracted.isNotEmpty || translation.isNotEmpty) {
          _history.insert(
            0,
            (
              source: extracted.isEmpty ? fileName : extracted,
              result: translation,
            ),
          );
        }
      });
      if (translation.isEmpty) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text(
              'Texte détecté, mais aucune traduction n’a été produite.',
            ),
          ),
        );
      }
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text(
            'Lecture du document impossible. Vérifiez le réseau puis réessayez.',
          ),
        ),
      );
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  void _selectMode(String mode) {
    setState(() => _mode = mode);
    switch (mode) {
      case 'Coller':
        _pasteAndTranslate();
      case 'Photo':
        _translateImage();
      case 'Doc':
        _translateDocument();
    }
  }

  Widget _modeButton(String mode, IconData icon, Color tone) {
    final selected = _mode == mode;
    return InkWell(
      borderRadius: BorderRadius.circular(14),
      onTap: _busy ? null : () => _selectMode(mode),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        decoration: BoxDecoration(
          color: selected ? tone : _fitilaCard,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
            color: selected ? tone : _fitilaBorder,
          ),
          boxShadow: selected
              ? const [
                  BoxShadow(
                    color: Color(0x18241F2E),
                    blurRadius: 14,
                    offset: Offset(0, 7),
                  ),
                ]
              : null,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              icon,
              size: 21,
              color: selected ? Colors.white : _fitilaMuted,
            ),
            const SizedBox(height: 5),
            Text(
              mode,
              style: TextStyle(
                color: selected ? Colors.white : _fitilaMuted,
                fontSize: 10.5,
                fontWeight: FontWeight.w800,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _welcomeState() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 28),
      child: Column(
        children: [
          Container(
            width: 80,
            height: 80,
            decoration: const BoxDecoration(
              shape: BoxShape.circle,
              color: _fitilaPrimarySoft,
            ),
            child: const Icon(
              Icons.language_rounded,
              size: 43,
              color: _fitilaGoldDeep,
            ),
          ),
          const SizedBox(height: 14),
          const Text(
            'Bienvenue ! 👋',
            style: TextStyle(
              color: _fitilaInk,
              fontSize: 22,
              fontWeight: FontWeight.w900,
            ),
          ),
          const SizedBox(height: 7),
          const Text(
            'Je traduis entre Français et Bàátɔ̀nú',
            textAlign: TextAlign.center,
            style: TextStyle(
              color: _fitilaMuted,
              fontSize: 14,
            ),
          ),
          const SizedBox(height: 12),
          Wrap(
            alignment: WrapAlignment.center,
            spacing: 8,
            runSpacing: 8,
            children: [
              if (_autoDetect)
                const _StatusChip(
                  icon: Icons.auto_awesome_rounded,
                  label: 'Détection automatique',
                ),
              if (_conversationMode)
                const _StatusChip(
                  icon: Icons.chat_bubble_outline_rounded,
                  label: 'Mode conversation',
                ),
            ],
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return _PageFrame(
      title: 'Traducteur IA',
      subtitle: 'Voix, texte, photo, presse-papiers et documents.',
      child: Column(
        children: [
          Container(
            padding: const EdgeInsets.fromLTRB(12, 10, 12, 12),
            decoration: BoxDecoration(
              color: _fitilaCard,
              borderRadius: BorderRadius.circular(18),
              border: Border.all(color: _fitilaBorder),
            ),
            child: Column(
              children: [
                Row(
                  children: [
                    const Icon(
                      Icons.wifi_rounded,
                      color: _fitilaSage,
                      size: 18,
                    ),
                    const SizedBox(width: 6),
                    const Text(
                      'Auto',
                      style: TextStyle(
                        color: _fitilaSage,
                        fontSize: 12,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    const Spacer(),
                    Text(
                      _detectedLanguage == null
                          ? 'Détection active'
                          : 'Détecté : $_detectedLanguage',
                      style: const TextStyle(
                        color: _fitilaMuted,
                        fontSize: 10.5,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 7),
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: [
                      ChoiceChip(
                        selected: _direction ==
                            TranslationDirection.frenchToBariba,
                        label: const Text('🇫🇷 Français'),
                        onSelected: (_) => setState(() {
                          _direction = TranslationDirection.frenchToBariba;
                        }),
                      ),
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 6),
                        child: IconButton.filled(
                          tooltip: 'Inverser',
                          onPressed: _swapLanguages,
                          icon: const Icon(Icons.swap_horiz_rounded),
                        ),
                      ),
                      ChoiceChip(
                        selected: _direction ==
                            TranslationDirection.baribaToFrench,
                        label: const Text('🇧🇯 Bariba'),
                        onSelected: (_) => setState(() {
                          _direction = TranslationDirection.baribaToFrench;
                        }),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 8),
                Wrap(
                  spacing: 14,
                  runSpacing: 6,
                  children: [
                    FilterChip(
                      selected: _autoDetect,
                      avatar: const Icon(Icons.auto_awesome_rounded, size: 16),
                      label: Text(
                        _detectedLanguage == null
                            ? 'Détection auto'
                            : 'Détecté : $_detectedLanguage',
                      ),
                      onSelected: (value) =>
                          setState(() => _autoDetect = value),
                    ),
                    FilterChip(
                      selected: _conversationMode,
                      avatar: const Icon(
                        Icons.chat_bubble_outline_rounded,
                        size: 16,
                      ),
                      label: const Text('Mode conversation'),
                      onSelected: (value) =>
                          setState(() => _conversationMode = value),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 10),
          Expanded(
            child: ListView(
              keyboardDismissBehavior:
                  ScrollViewKeyboardDismissBehavior.onDrag,
              children: [
                if (_input.text.isEmpty && _output.text.isEmpty)
                  _welcomeState(),
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: [
                      _modeButton('Voix', Icons.mic_rounded, _fitilaClay),
                      const SizedBox(width: 7),
                      _modeButton(
                        'Texte',
                        Icons.keyboard_alt_rounded,
                        const Color(0xFF4D73E6),
                      ),
                      const SizedBox(width: 7),
                      _modeButton(
                        'Photo',
                        Icons.photo_camera_rounded,
                        const Color(0xFF9A62D6),
                      ),
                      const SizedBox(width: 7),
                      _modeButton(
                        'Coller',
                        Icons.content_paste_rounded,
                        _fitilaSage,
                      ),
                      const SizedBox(width: 7),
                      _modeButton(
                        'Doc',
                        Icons.description_rounded,
                        _fitilaGoldDeep,
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 12),
                if (_mode == 'Voix')
                  Container(
                    padding: const EdgeInsets.all(22),
                    decoration: BoxDecoration(
                      color: _fitilaCard,
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: _fitilaBorder),
                    ),
                    child: Column(
                      children: [
                        const Icon(
                          Icons.mic_rounded,
                          color: _fitilaClay,
                          size: 42,
                        ),
                        const SizedBox(height: 8),
                        const Text(
                          'Mode vocal',
                          style: TextStyle(
                            color: _fitilaInk,
                            fontSize: 17,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                        const SizedBox(height: 6),
                        Text(
                          'Parlez en $_sourceLabel. La transcription Bariba STT reste disponible via Voice Lab.',
                          textAlign: TextAlign.center,
                          style: const TextStyle(
                            color: _fitilaMuted,
                            height: 1.4,
                          ),
                        ),
                        const SizedBox(height: 12),
                        FilledButton.icon(
                          onPressed: () {
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(
                                content: Text(
                                  'Ouvrez Voice Lab pour une dictée audio complète.',
                                ),
                              ),
                            );
                          },
                          icon: const Icon(Icons.graphic_eq_rounded),
                          label: const Text('Démarrer la voix'),
                        ),
                      ],
                    ),
                  )
                else ...[
                  Container(
                    padding: const EdgeInsets.all(15),
                    decoration: BoxDecoration(
                      color: _fitilaCard,
                      borderRadius: BorderRadius.circular(18),
                      border: Border.all(color: _fitilaBorder),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          _sourceLabel.toUpperCase(),
                          style: const TextStyle(
                            color: _fitilaGoldDeep,
                            fontSize: 10.5,
                            fontWeight: FontWeight.w900,
                            letterSpacing: .3,
                          ),
                        ),
                        const SizedBox(height: 5),
                        TextField(
                          controller: _input,
                          minLines: 3,
                          maxLines: 7,
                          onChanged: _detectFromText,
                          decoration: InputDecoration(
                            hintText: 'Tapez dans n’importe quelle langue...',
                            fillColor: Colors.transparent,
                            border: InputBorder.none,
                            enabledBorder: InputBorder.none,
                            focusedBorder: InputBorder.none,
                            contentPadding: EdgeInsets.zero,
                            suffixIcon: IconButton(
                              tooltip: 'Clavier Bàátɔ̀nú',
                              onPressed: () => _showKeyboard(context, _input),
                              icon: const Icon(Icons.keyboard_rounded),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 10),
                  SizedBox(
                    height: 50,
                    child: FilledButton.icon(
                      onPressed: _busy ? null : _translate,
                      icon: _busy
                          ? const SizedBox.square(
                              dimension: 18,
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                              ),
                            )
                          : const Icon(Icons.send_rounded),
                      label: const Text('Traduire'),
                    ),
                  ),
                  if (_output.text.isNotEmpty) ...[
                    const SizedBox(height: 12),
                    _TextPanel(
                      title: _targetLabel,
                      controller: _output,
                      hint: 'Résultat',
                      readOnly: true,
                      maxLines: 7,
                    ),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        OutlinedButton.icon(
                          onPressed: () async {
                            final messenger = ScaffoldMessenger.of(context);
                            await Clipboard.setData(
                              ClipboardData(text: _output.text),
                            );
                            if (!mounted) return;
                            messenger.showSnackBar(
                              const SnackBar(
                                content: Text('Traduction copiée.'),
                              ),
                            );
                          },
                          icon: const Icon(Icons.copy_rounded),
                          label: const Text('Copier'),
                        ),
                        const SizedBox(width: 8),
                        OutlinedButton.icon(
                          onPressed: () {
                            setState(() {
                              _input.clear();
                              _output.clear();
                              _detectedLanguage = null;
                            });
                          },
                          icon: const Icon(Icons.delete_outline_rounded),
                          label: const Text('Effacer'),
                        ),
                      ],
                    ),
                  ],
                ],
                if (_history.isNotEmpty) ...[
                  const SizedBox(height: 16),
                  const Text(
                    'Historique récent',
                    style: TextStyle(
                      color: _fitilaMuted,
                      fontSize: 12,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  const SizedBox(height: 7),
                  for (final item in _history.take(5))
                    Padding(
                      padding: const EdgeInsets.only(bottom: 7),
                      child: Material(
                        color: _fitilaCard,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(14),
                          side: const BorderSide(color: _fitilaBorder),
                        ),
                        child: ListTile(
                          dense: true,
                          onTap: () => setState(() {
                            _input.text = item.source;
                            _output.text = item.result;
                          }),
                          leading: const Icon(Icons.history_rounded),
                          title: Text(
                            item.source,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                          subtitle: Text(
                            item.result,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ),
                    ),
                ],
              ],
            ),
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

class _AiChatMessage {
  _AiChatMessage({
    required this.role,
    required this.text,
  });

  final String role;
  final String text;
  String? translationFr;
  bool translating = false;
}

class _AiScreenState extends State<AiScreen> {
  final _message = TextEditingController();
  final List<_AiChatMessage> _messages = [];
  List<DictionaryEntry> _dictionary = const [];
  bool _busy = false;
  bool _showKeyboard = false;

  @override
  void initState() {
    super.initState();
    FitilaServices.loadDictionary().then((value) {
      if (mounted) setState(() => _dictionary = value);
    }).catchError((_) {});
    _message.addListener(() {
      if (mounted) setState(() {});
    });
  }

  @override
  void dispose() {
    _message.dispose();
    super.dispose();
  }

  List<DictionaryEntry> get _suggestions {
    final current = _message.text.trim().split(RegExp(r'\s+')).lastOrNull ?? '';
    if (current.isEmpty) return const [];
    final q = current.toLowerCase();
    return _dictionary
        .where((entry) => entry.word.toLowerCase().startsWith(q))
        .take(6)
        .toList(growable: false);
  }

  void _chooseSuggestion(String word) {
    final raw = _message.text;
    final parts = raw.split(RegExp(r'\s+'));
    if (parts.isEmpty) {
      _message.text = '$word ';
    } else {
      parts[parts.length - 1] = word;
      _message.text = '${parts.join(' ')} ';
    }
    _message.selection = TextSelection.collapsed(offset: _message.text.length);
  }

  void _insertCharacter(String char) {
    final selection = _message.selection;
    final text = _message.text;
    final start = selection.start < 0 ? text.length : selection.start;
    final end = selection.end < 0 ? text.length : selection.end;
    _message.value = TextEditingValue(
      text: text.replaceRange(start, end, char),
      selection: TextSelection.collapsed(offset: start + char.length),
    );
  }

  Future<void> _send([String? preset]) async {
    final text = (preset ?? _message.text).trim();
    if (text.isEmpty || _busy) return;
    setState(() {
      _busy = true;
      _messages.add(_AiChatMessage(role: 'user', text: text));
      _message.clear();
      _showKeyboard = false;
    });

    try {
      final answer = await FitilaBackend.askFitilaIa(text);
      if (!mounted) return;
      setState(() {
        _messages.add(_AiChatMessage(role: 'assistant', text: answer));
      });
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(error.toString().replaceFirst('Bad state: ', '')),
        ),
      );
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _translateToFrench(int index) async {
    if (index < 0 || index >= _messages.length) return;
    final message = _messages[index];
    if (message.role != 'assistant' || message.translating) return;
    setState(() => message.translating = true);
    try {
      final response = await FitilaBackend.client.functions.invoke(
        'byt5-bariba-translate',
        body: {
          'text': message.text,
          'sourceLang': 'bariba',
          'targetLang': 'french',
        },
      );
      final data = response.data;
      final translation = data is Map
          ? (data['translatedText'] ?? data['translation'])?.toString().trim()
          : null;
      if (!mounted) return;
      setState(() {
        message.translationFr =
            translation?.isNotEmpty == true ? translation : 'Traduction indisponible';
      });
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Erreur de traduction.')),
      );
    } finally {
      if (mounted) setState(() => message.translating = false);
    }
  }

  Widget _emptyState() {
    return Center(
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(18),
        child: Column(
          children: [
            Container(
              width: 86,
              height: 86,
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(28),
                gradient: const LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [Color(0xFFE7E5FF), Color(0xFFF1E8FA)],
                ),
                border: Border.all(color: const Color(0xFFD8D2F1)),
              ),
              child: const Icon(
                Icons.smart_toy_rounded,
                color: Color(0xFF6758C9),
                size: 43,
              ),
            ),
            const SizedBox(height: 18),
            const Text(
              'Yaa sɔ̃ɔ wírú Bariba mɛ̀, ǹ nɛ́ɛ̀ daa gɔ!',
              textAlign: TextAlign.center,
              style: TextStyle(
                color: _fitilaInk,
                fontSize: 16,
                fontWeight: FontWeight.w800,
              ),
            ),
            const SizedBox(height: 7),
            const Text(
              'Posez vos questions en Bàátɔ̀nú',
              textAlign: TextAlign.center,
              style: TextStyle(color: _fitilaMuted, fontSize: 12.5),
            ),
            const SizedBox(height: 14),
            Wrap(
              alignment: WrapAlignment.center,
              spacing: 8,
              runSpacing: 8,
              children: [
                ActionChip(
                  label: const Text('Comment saluer ?'),
                  onPressed: () => _send('Comment saluer en Bàátɔ̀nú ?'),
                ),
                ActionChip(
                  label: const Text('Explique une coutume'),
                  onPressed: () => _send('Explique une coutume Bàátɔ̀nú'),
                ),
                ActionChip(
                  label: const Text('Aide-moi en classe'),
                  onPressed: () => _send('Aide-moi à apprendre le Bàátɔ̀nú'),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _bubble(int index, _AiChatMessage message) {
    final mine = message.role == 'user';
    return Align(
      alignment: mine ? Alignment.centerRight : Alignment.centerLeft,
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 690),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment:
              mine ? MainAxisAlignment.end : MainAxisAlignment.start,
          children: [
            if (!mine) ...[
              const CircleAvatar(
                radius: 15,
                backgroundColor: Color(0xFF6758C9),
                foregroundColor: Colors.white,
                child: Icon(Icons.smart_toy_rounded, size: 15),
              ),
              const SizedBox(width: 7),
            ],
            Flexible(
              child: Column(
                crossAxisAlignment:
                    mine ? CrossAxisAlignment.end : CrossAxisAlignment.start,
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 14,
                      vertical: 11,
                    ),
                    decoration: BoxDecoration(
                      color: mine ? _fitilaClay : _fitilaCard,
                      borderRadius: BorderRadius.only(
                        topLeft: Radius.circular(mine ? 18 : 6),
                        topRight: Radius.circular(mine ? 6 : 18),
                        bottomLeft: const Radius.circular(18),
                        bottomRight: const Radius.circular(18),
                      ),
                      border:
                          mine ? null : Border.all(color: _fitilaBorder),
                    ),
                    child: Text(
                      message.text,
                      style: TextStyle(
                        color: mine ? Colors.white : _fitilaInkSoft,
                        fontSize: 13.5,
                        height: 1.45,
                      ),
                    ),
                  ),
                  if (!mine) ...[
                    const SizedBox(height: 4),
                    if (message.translationFr == null)
                      TextButton.icon(
                        onPressed: message.translating
                            ? null
                            : () => _translateToFrench(index),
                        icon: message.translating
                            ? const SizedBox.square(
                                dimension: 13,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                ),
                              )
                            : const Icon(Icons.translate_rounded, size: 15),
                        label: Text(
                          message.translating
                              ? 'Traduction...'
                              : 'Traduire en français',
                        ),
                      )
                    else
                      Container(
                        margin: const EdgeInsets.only(top: 3),
                        padding: const EdgeInsets.all(11),
                        decoration: BoxDecoration(
                          color: const Color(0xFFEDEAFF),
                          borderRadius: BorderRadius.circular(13),
                          border: Border.all(
                            color: const Color(0xFFD8D2F1),
                          ),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'FRANÇAIS',
                              style: TextStyle(
                                color: Color(0xFF6758C9),
                                fontSize: 9.5,
                                fontWeight: FontWeight.w900,
                                letterSpacing: .5,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              message.translationFr!,
                              style: const TextStyle(
                                color: _fitilaInkSoft,
                                fontSize: 12.5,
                                height: 1.4,
                              ),
                            ),
                          ],
                        ),
                      ),
                  ],
                ],
              ),
            ),
            if (mine) ...[
              const SizedBox(width: 7),
              const CircleAvatar(
                radius: 15,
                backgroundColor: _fitilaClay,
                foregroundColor: Colors.white,
                child: Icon(Icons.person_rounded, size: 15),
              ),
            ],
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final suggestions = _suggestions;
    return _PageFrame(
      title: 'Fitila IA',
      subtitle: 'Assistant intelligent en Bàátɔ̀nú',
      child: Column(
        children: [
          Expanded(
            child: _messages.isEmpty
                ? _emptyState()
                : ListView.separated(
                    padding: const EdgeInsets.symmetric(vertical: 8),
                    itemCount: _messages.length + (_busy ? 1 : 0),
                    separatorBuilder: (_, _) => const SizedBox(height: 12),
                    itemBuilder: (context, index) {
                      if (_busy && index == _messages.length) {
                        return const Align(
                          alignment: Alignment.centerLeft,
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              CircleAvatar(
                                radius: 15,
                                backgroundColor: Color(0xFF6758C9),
                                child: Icon(
                                  Icons.smart_toy_rounded,
                                  color: Colors.white,
                                  size: 15,
                                ),
                              ),
                              SizedBox(width: 8),
                              _AiThinkingIndicator(),
                            ],
                          ),
                        );
                      }
                      return _bubble(index, _messages[index]);
                    },
                  ),
          ),
          if (suggestions.isNotEmpty)
            Container(
              width: double.infinity,
              margin: const EdgeInsets.only(bottom: 7),
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: _fitilaCard,
                borderRadius: BorderRadius.circular(13),
                border: Border.all(color: _fitilaBorder),
              ),
              child: Wrap(
                spacing: 6,
                runSpacing: 6,
                children: [
                  for (final suggestion in suggestions)
                    ActionChip(
                      label: Text(suggestion.word),
                      onPressed: () => _chooseSuggestion(suggestion.word),
                    ),
                ],
              ),
            ),
          if (_showKeyboard)
            Padding(
              padding: const EdgeInsets.only(bottom: 7),
              child: _BaribaKeyboard(onInsert: _insertCharacter),
            ),
          Container(
            padding: const EdgeInsets.only(top: 9),
            decoration: const BoxDecoration(
              border: Border(top: BorderSide(color: _fitilaBorder)),
            ),
            child: Row(
              children: [
                IconButton(
                  tooltip: 'Clavier Bàátɔ̀nú',
                  onPressed: () =>
                      setState(() => _showKeyboard = !_showKeyboard),
                  icon: const Icon(Icons.keyboard_alt_rounded),
                ),
                const SizedBox(width: 6),
                Expanded(
                  child: TextField(
                    controller: _message,
                    minLines: 1,
                    maxLines: 4,
                    decoration: const InputDecoration(
                      hintText: 'Yaa sɔ̃ɔ...',
                    ),
                    onSubmitted: (_) => _send(),
                  ),
                ),
                const SizedBox(width: 6),
                IconButton(
                  tooltip: 'Voix',
                  onPressed: () {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(
                        content: Text(
                          'La dictée Bariba est accessible depuis Voice Lab.',
                        ),
                      ),
                    );
                  },
                  icon: const Icon(Icons.mic_rounded),
                ),
                const SizedBox(width: 6),
                IconButton.filled(
                  tooltip: 'Envoyer',
                  onPressed: _busy ? null : () => _send(),
                  style: IconButton.styleFrom(
                    backgroundColor: const Color(0xFF6758C9),
                    foregroundColor: Colors.white,
                  ),
                  icon: const Icon(Icons.send_rounded),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _AiThinkingIndicator extends StatefulWidget {
  const _AiThinkingIndicator();

  @override
  State<_AiThinkingIndicator> createState() => _AiThinkingIndicatorState();
}

class _AiThinkingIndicatorState extends State<_AiThinkingIndicator>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 850),
    )..repeat();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 13, vertical: 10),
      decoration: BoxDecoration(
        color: _fitilaCard,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: _fitilaBorder),
      ),
      child: AnimatedBuilder(
        animation: _controller,
        builder: (context, _) {
          final phase = (_controller.value * 3).floor();
          return Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              for (var i = 0; i < 3; i++) ...[
                Container(
                  width: 7,
                  height: 7,
                  decoration: BoxDecoration(
                    color: i == phase
                        ? const Color(0xFF6758C9)
                        : _fitilaBorder,
                    shape: BoxShape.circle,
                  ),
                ),
                if (i < 2) const SizedBox(width: 4),
              ],
              const SizedBox(width: 8),
              const Text(
                'Ǹ nɛ́ɛ̀ dɔɔ bírú...',
                style: TextStyle(
                  color: _fitilaMuted,
                  fontSize: 10.5,
                ),
              ),
            ],
          );
        },
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
  final _query = TextEditingController();
  bool _busy = false;
  final List<
      ({
        String role,
        String text,
        List<FoncierSource> sources,
      })> _messages = [];

  static const _suggestions = [
    'Saria gbiika gari mba?',
    'Saria 14se ya nɛɛ mba?',
    'Tem bausu mba ba mɔ̀ Benɛ temɔ?',
  ];

  @override
  void dispose() {
    _query.dispose();
    super.dispose();
  }

  Future<void> _send([String? preset]) async {
    final text = (preset ?? _query.text).trim();
    if (text.isEmpty || _busy) return;

    setState(() {
      _busy = true;
      _messages.add((role: 'user', text: text, sources: const []));
      _query.clear();
    });

    try {
      final result = await FoncierRag.answer(text);
      if (!mounted) return;
      setState(() {
        _messages.add(
          (
            role: 'assistant',
            text: result.answer.replaceAll(RegExp(r'\.\s+'), '.\n\n').trim(),
            sources: result.sources,
          ),
        );
      });
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Le corpus foncier local est indisponible.'),
        ),
      );
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  void _showSources(List<FoncierSource> sources) {
    showModalBottomSheet<void>(
      context: context,
      showDragHandle: true,
      isScrollControlled: true,
      builder: (context) => SafeArea(
        child: FractionallySizedBox(
          heightFactor: .72,
          child: ListView(
            padding: const EdgeInsets.fromLTRB(18, 0, 18, 24),
            children: [
              const Text(
                'Sources du Code Foncier',
                style: TextStyle(
                  color: _fitilaInk,
                  fontFamily: 'serif',
                  fontSize: 22,
                  fontWeight: FontWeight.w700,
                ),
              ),
              const SizedBox(height: 5),
              const Text(
                'Références utilisées par la recherche locale.',
                style: TextStyle(color: _fitilaMuted),
              ),
              const SizedBox(height: 14),
              for (final source in sources)
                Padding(
                  padding: const EdgeInsets.only(bottom: 9),
                  child: Material(
                    color: _fitilaCard,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(16),
                      side: const BorderSide(color: _fitilaBorder),
                    ),
                    child: ListTile(
                      leading: Container(
                        width: 42,
                        height: 42,
                        decoration: const BoxDecoration(
                          color: Color(0xFFDCEAE0),
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(
                          Icons.menu_book_rounded,
                          color: _fitilaSage,
                        ),
                      ),
                      title: Text(
                        source.number,
                        style: const TextStyle(fontWeight: FontWeight.w800),
                      ),
                      subtitle: Text(
                        '${source.book ?? 'Code foncier'} · page ${source.page}',
                      ),
                    ),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _emptyState() {
    return Center(
      child: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 18),
        child: Column(
          children: [
            Container(
              width: 86,
              height: 86,
              decoration: BoxDecoration(
                color: const Color(0xFFDCEAE0),
                borderRadius: BorderRadius.circular(28),
                border: Border.all(
                  color: _fitilaSage.withValues(alpha: .18),
                ),
                boxShadow: const [
                  BoxShadow(
                    color: Color(0x173F6E52),
                    blurRadius: 22,
                    offset: Offset(0, 10),
                  ),
                ],
              ),
              child: const Icon(
                Icons.balance_rounded,
                color: _fitilaSage,
                size: 42,
              ),
            ),
            const SizedBox(height: 20),
            const Text(
              'Yaa sɔ̃ɔ tem bausu gari Baribarum.',
              textAlign: TextAlign.center,
              style: TextStyle(
                color: _fitilaInk,
                fontSize: 17,
                fontWeight: FontWeight.w700,
              ),
            ),
            const SizedBox(height: 9),
            const Text(
              'Posez votre question directement en Bàátɔ̀nú',
              textAlign: TextAlign.center,
              style: TextStyle(
                color: _fitilaMuted,
                fontSize: 13,
              ),
            ),
            const SizedBox(height: 16),
            Wrap(
              alignment: WrapAlignment.center,
              spacing: 8,
              runSpacing: 8,
              children: [
                for (final suggestion in _suggestions)
                  ActionChip(
                    label: Text(suggestion),
                    onPressed: () => _send(suggestion),
                  ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _messageBubble(
    ({
      String role,
      String text,
      List<FoncierSource> sources,
    }) message,
  ) {
    final mine = message.role == 'user';
    return Align(
      alignment: mine ? Alignment.centerRight : Alignment.centerLeft,
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 690),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment:
              mine ? MainAxisAlignment.end : MainAxisAlignment.start,
          children: [
            if (!mine) ...[
              const CircleAvatar(
                radius: 15,
                backgroundColor: _fitilaSage,
                foregroundColor: Colors.white,
                child: Icon(Icons.balance_rounded, size: 16),
              ),
              const SizedBox(width: 7),
            ],
            Flexible(
              child: Column(
                crossAxisAlignment:
                    mine ? CrossAxisAlignment.end : CrossAxisAlignment.start,
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 14,
                      vertical: 11,
                    ),
                    decoration: BoxDecoration(
                      color: mine ? _fitilaClay : _fitilaCard,
                      borderRadius: BorderRadius.only(
                        topLeft: Radius.circular(mine ? 18 : 6),
                        topRight: Radius.circular(mine ? 6 : 18),
                        bottomLeft: const Radius.circular(18),
                        bottomRight: const Radius.circular(18),
                      ),
                      border: mine
                          ? null
                          : Border.all(color: _fitilaBorder),
                    ),
                    child: Text(
                      message.text,
                      style: TextStyle(
                        color: mine ? Colors.white : _fitilaInkSoft,
                        height: 1.45,
                        fontSize: 13.5,
                      ),
                    ),
                  ),
                  if (!mine && message.sources.isNotEmpty) ...[
                    const SizedBox(height: 6),
                    ActionChip(
                      avatar: const Icon(
                        Icons.menu_book_rounded,
                        size: 16,
                        color: _fitilaSage,
                      ),
                      label: Text(
                        'Sources : ${message.sources.take(3).map((s) => s.number).join(' · ')}'
                        '${message.sources.length > 3 ? ' +${message.sources.length - 3}' : ''}',
                      ),
                      onPressed: () => _showSources(message.sources),
                    ),
                  ],
                ],
              ),
            ),
            if (mine) ...[
              const SizedBox(width: 7),
              const CircleAvatar(
                radius: 15,
                backgroundColor: _fitilaClay,
                foregroundColor: Colors.white,
                child: Icon(Icons.person_rounded, size: 16),
              ),
            ],
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return _PageFrame(
      title: 'Fitila Tem IA',
      subtitle: 'Tem bausu sariaba sɔ̃ɔsiru · 100% local',
      child: Column(
        children: [
          Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
            decoration: BoxDecoration(
              color: const Color(0xFFDCEAE0).withValues(alpha: .70),
              borderRadius: BorderRadius.circular(14),
              border: Border.all(
                color: _fitilaSage.withValues(alpha: .28),
              ),
            ),
            child: const Row(
              children: [
                Icon(
                  Icons.shield_outlined,
                  color: _fitilaSage,
                  size: 18,
                ),
                SizedBox(width: 8),
                Expanded(
                  child: Text(
                    '🔒 Assistant basé uniquement sur le Code Foncier (Bariba) — Loi n° 2013-01',
                    style: TextStyle(
                      color: _fitilaSage,
                      fontSize: 11.5,
                      fontWeight: FontWeight.w800,
                      height: 1.3,
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 8),
          Expanded(
            child: _messages.isEmpty
                ? _emptyState()
                : ListView.separated(
                    padding: const EdgeInsets.fromLTRB(2, 8, 2, 10),
                    itemCount: _messages.length + (_busy ? 1 : 0),
                    separatorBuilder: (_, _) => const SizedBox(height: 12),
                    itemBuilder: (context, index) {
                      if (_busy && index == _messages.length) {
                        return const Align(
                          alignment: Alignment.centerLeft,
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              CircleAvatar(
                                radius: 15,
                                backgroundColor: _fitilaSage,
                                child: Icon(
                                  Icons.balance_rounded,
                                  color: Colors.white,
                                  size: 16,
                                ),
                              ),
                              SizedBox(width: 8),
                              _TemTypingIndicator(),
                            ],
                          ),
                        );
                      }
                      return _messageBubble(_messages[index]);
                    },
                  ),
          ),
          Container(
            padding: const EdgeInsets.fromLTRB(0, 9, 0, 2),
            decoration: const BoxDecoration(
              border: Border(top: BorderSide(color: _fitilaBorder)),
            ),
            child: Column(
              children: [
                Row(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    IconButton(
                      tooltip: 'Clavier Bàátɔ̀nú',
                      onPressed: () => _showKeyboard(context, _query),
                      icon: const Icon(Icons.keyboard_alt_rounded),
                    ),
                    const SizedBox(width: 6),
                    Expanded(
                      child: TextField(
                        controller: _query,
                        minLines: 1,
                        maxLines: 4,
                        decoration: const InputDecoration(
                          hintText:
                              'Yaa sɔ̃ɔ tem bausu gari Baribarum...',
                        ),
                        onSubmitted: (_) => _send(),
                      ),
                    ),
                    const SizedBox(width: 6),
                    IconButton(
                      tooltip: 'Voix',
                      onPressed: () {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(
                            content: Text(
                              'Dictée vocale disponible via Voice Lab.',
                            ),
                          ),
                        );
                      },
                      icon: const Icon(Icons.mic_rounded),
                    ),
                    const SizedBox(width: 6),
                    IconButton.filled(
                      tooltip: 'Envoyer',
                      onPressed: _busy ? null : () => _send(),
                      style: IconButton.styleFrom(
                        backgroundColor: _fitilaSage,
                        foregroundColor: Colors.white,
                      ),
                      icon: _busy
                          ? const SizedBox.square(
                              dimension: 17,
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                                color: Colors.white,
                              ),
                            )
                          : const Icon(Icons.send_rounded),
                    ),
                  ],
                ),
                const SizedBox(height: 7),
                const Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(
                      Icons.wifi_off_rounded,
                      color: _fitilaSage,
                      size: 12,
                    ),
                    SizedBox(width: 5),
                    Flexible(
                      child: Text(
                        'Posez votre question en Bàátɔ̀nú — recherche 100% locale, sans Internet',
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          color: _fitilaSage,
                          fontSize: 9.8,
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _TemTypingIndicator extends StatefulWidget {
  const _TemTypingIndicator();

  @override
  State<_TemTypingIndicator> createState() => _TemTypingIndicatorState();
}

class _TemTypingIndicatorState extends State<_TemTypingIndicator>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 850),
    )..repeat();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 13, vertical: 10),
      decoration: BoxDecoration(
        color: _fitilaCard,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: _fitilaBorder),
      ),
      child: AnimatedBuilder(
        animation: _controller,
        builder: (context, _) {
          final phase = (_controller.value * 3).floor();
          return Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              for (var i = 0; i < 3; i++) ...[
                Container(
                  width: 7,
                  height: 7,
                  decoration: BoxDecoration(
                    color: i == phase ? _fitilaSage : _fitilaBorder,
                    shape: BoxShape.circle,
                  ),
                ),
                if (i < 2) const SizedBox(width: 4),
              ],
              const SizedBox(width: 8),
              const Text(
                'Sariaba kasuamɔ...',
                style: TextStyle(
                  color: _fitilaMuted,
                  fontSize: 10.5,
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}

class LearnScreen extends StatefulWidget {
  const LearnScreen({super.key});

  @override
  State<LearnScreen> createState() => _LearnScreenState();
}

class _LearnScreenState extends State<LearnScreen> {
  String _section = 'Parcours';

  Widget _learnChip(String value, IconData icon) {
    return ChoiceChip(
      selected: _section == value,
      avatar: Icon(icon, size: 18),
      label: Text(value),
      onSelected: (_) => setState(() => _section = value),
    );
  }

  Widget _modulesGrid() {
    final lessons = _lessons;
    return GridView.builder(
      itemCount: lessons.length,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      gridDelegate: const SliverGridDelegateWithMaxCrossAxisExtent(
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
  }

  Widget _learnPanel() {
    return switch (_section) {
      'Modules' => _modulesGrid(),
      'Quiz' => const _FeatureGrid(
        items: [
          (
            Icons.quiz_rounded,
            'Questions',
            'Choix multiple, réponse libre, dictée et association image/mot.',
          ),
          (
            Icons.fact_check_rounded,
            'Correction',
            'Score, bonne réponse, explication et reprise de la leçon.',
          ),
          (
            Icons.timer_rounded,
            'Défi rapide',
            'Session courte, chrono, série et badge de réussite.',
          ),
        ],
      ),
      'Audio' => const _FeatureGrid(
        items: [
          (
            Icons.hearing_rounded,
            'Écoute guidée',
            'Mot, phrase, dialogue, vitesse lente et répétition.',
          ),
          (
            Icons.mic_rounded,
            'Prononciation',
            'Enregistrer, comparer et envoyer au Voice Lab.',
          ),
          (
            Icons.volume_up_rounded,
            'Lecture bilingue',
            'Français, Bàátɔ̀nú et mode classe avec grands contrôles.',
          ),
        ],
      ),
      'Progression' => _ActionList(
        items: const [
          _ActionItem(
            Icons.trending_up_rounded,
            'Progression globale',
            'Leçons terminées, temps, niveau, dernière activité et série.',
          ),
          _ActionItem(
            Icons.emoji_events_rounded,
            'Badges',
            'Alphabet, conversation, culture, calcul et régularité.',
          ),
          _ActionItem(
            Icons.offline_bolt_rounded,
            'Offline',
            'Téléchargement modules, quiz local et synchronisation différée.',
          ),
        ],
      ),
      _ => const _FeatureGrid(
        items: [
          (
            Icons.route_rounded,
            'Parcours recommandé',
            'Niveau, objectif, temps disponible et prochaine leçon intelligente.',
          ),
          (
            Icons.school_rounded,
            'Classe connectée',
            'Pont vers Classe Niveau 1/2, devoirs et corrections.',
          ),
          (
            Icons.groups_rounded,
            'Culture vivante',
            'Histoires, proverbes, marché, famille et scènes quotidiennes.',
          ),
        ],
      ),
    };
  }

  @override
  Widget build(BuildContext context) {
    return _PageFrame(
      title: 'Apprendre',
      subtitle: 'Astuces, radio, culture et parcours Bàátɔ̀nú.',
      child: ListView(
        children: [
          const Text(
            "Aujourd'hui",
            style: TextStyle(
              color: _fitilaMuted,
              fontSize: 12.5,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 10),
          const _FeatureGrid(
            items: [
              (
                Icons.auto_awesome_rounded,
                'Astuce du jour',
                'Expression courante',
              ),
              (
                Icons.radio_rounded,
                'Radio Bariba',
                'Écouter les contenus Bàátɔ̀nú',
              ),
              (
                Icons.account_balance_rounded,
                'Culture',
                'Patrimoine Bàátɔ̀nú',
              ),
              (
                Icons.ondemand_video_rounded,
                'Vidéos leçons',
                'Apprendre en regardant',
              ),
            ],
          ),
          const SizedBox(height: 18),
          const Text(
            'Proverbe à retenir',
            style: TextStyle(
              color: _fitilaMuted,
              fontSize: 12.5,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 10),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: _fitilaCard,
              borderRadius: BorderRadius.circular(18),
              border: Border.all(color: _fitilaBorder),
            ),
            child: const Text(
              "La sagesse Bàátɔ̀nú du jour s'affiche ici avec sa traduction et son contexte d'usage.",
              style: TextStyle(
                color: _fitilaInkSoft,
                fontSize: 14,
                height: 1.5,
              ),
            ),
          ),
          const SizedBox(height: 18),
          const _MetricStrip(
            metrics: [
              ('Niveau', 'A1', Icons.school_rounded),
              ('Progression', '62%', Icons.trending_up_rounded),
              ('Série', '8j', Icons.local_fire_department_rounded),
            ],
          ),
          const SizedBox(height: 12),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              _learnChip('Parcours', Icons.route_rounded),
              _learnChip('Modules', Icons.grid_view_rounded),
              _learnChip('Quiz', Icons.quiz_rounded),
              _learnChip('Audio', Icons.volume_up_rounded),
              _learnChip('Progression', Icons.emoji_events_rounded),
            ],
          ),
          const SizedBox(height: 12),
          _learnPanel(),
        ],
      ),
    );
  }
}

class ClasseScreen extends StatefulWidget {
  const ClasseScreen({
    super.key,
    this.initialLessons,
  });

  final List<WebClasseLesson>? initialLessons;

  @override
  State<ClasseScreen> createState() => _ClasseScreenState();
}

class _ClasseScreenState extends State<ClasseScreen> {
  late Future<List<WebClasseLesson>> _webLessons;
  String _level = 'N1';
  String _section = 'home';
  int _selectedLessonId = 1;
  String _lessonTab = 'text';
  final Map<String, String> _lessonAnswers = {};
  final Set<String> _completed = {};

  @override
  void initState() {
    super.initState();
    _webLessons = widget.initialLessons == null
        ? WebClasseContent.loadLessons()
        : Future.value(widget.initialLessons!);
  }

  void _setLevel(String level) {
    setState(() {
      _level = level;
      _section = 'home';
      _selectedLessonId = 1;
      _lessonTab = 'text';
    });
  }

  List<WebClasseLesson> _forLevel(List<WebClasseLesson> all) =>
      all.where((lesson) => lesson.level == _level).toList(growable: false);

  Map<String, List<WebClasseLesson>> _grouped(List<WebClasseLesson> lessons) {
    final groups = <String, List<WebClasseLesson>>{};
    for (final lesson in lessons) {
      groups.putIfAbsent(lesson.themeLabel, () => []).add(lesson);
    }
    return groups;
  }

  void _openLesson(WebClasseLesson lesson) {
    setState(() {
      _selectedLessonId = lesson.id;
      _lessonTab = 'text';
      _section = 'detail';
    });
  }

  Future<void> _playApprovedAudio(
    WebClasseLesson lesson, {
    String section = 'text',
    int? itemIndex,
  }) async {
    if (!FitilaBackend.configured) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Serveur audio FITILA indisponible.')),
      );
      return;
    }
    final suffix = itemIndex == null
        ? section
        : '$section/$itemIndex';
    final contentKey = 'classe/${lesson.level}/lang/${lesson.id}/$suffix';
    try {
      final row = await FitilaBackend.client
          .from('classe_content_audios')
          .select('storage_path')
          .eq('content_key', contentKey)
          .eq('is_current', true)
          .eq('status', 'approved')
          .maybeSingle();
      if (row == null) {
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Audio validé non disponible pour ce contenu.'),
          ),
        );
        return;
      }
      final signed = await FitilaBackend.client.storage
          .from('classe-audio')
          .createSignedUrl(row['storage_path'].toString(), 3600);
      final url = signed;
      final player = audio.AudioPlayer();
      await player.play(audio.UrlSource(url));
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Lecture audio impossible.')),
      );
    }
  }

  Widget _levelSelector(List<WebClasseLesson> all) {
    final n1 = all.where((e) => e.level == 'N1').length;
    final n2 = all.where((e) => e.level == 'N2').length;
    Widget levelCard({
      required String level,
      required String title,
      required String emoji,
      required int count,
      required Color tone,
    }) {
      final selected = _level == level;
      return Expanded(
        child: InkWell(
          borderRadius: BorderRadius.circular(20),
          onTap: () => _setLevel(level),
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 180),
            padding: const EdgeInsets.all(15),
            decoration: BoxDecoration(
              color: selected ? tone.withValues(alpha: .15) : _fitilaCard,
              borderRadius: BorderRadius.circular(20),
              border: Border.all(
                color: selected ? tone : _fitilaBorder,
                width: selected ? 1.5 : 1,
              ),
              boxShadow: selected
                  ? const [
                      BoxShadow(
                        color: Color(0x17241F2E),
                        blurRadius: 20,
                        offset: Offset(0, 9),
                      ),
                    ]
                  : null,
            ),
            child: Column(
              children: [
                Text(
                  '$emoji $title',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    color: selected ? tone : _fitilaMuted,
                    fontSize: 15,
                    fontWeight: FontWeight.w900,
                  ),
                ),
                const SizedBox(height: 5),
                Text(
                  '$count leçons',
                  style: const TextStyle(
                    color: _fitilaMuted,
                    fontSize: 10.5,
                  ),
                ),
                if (selected) ...[
                  const SizedBox(height: 9),
                  LinearProgressIndicator(
                    value: .0,
                    minHeight: 6,
                    borderRadius: BorderRadius.circular(99),
                    color: tone,
                  ),
                ],
              ],
            ),
          ),
        ),
      );
    }

    return Row(
      children: [
        levelCard(
          level: 'N1',
          title: 'Niveau 1',
          emoji: '🔥',
          count: n1,
          tone: _fitilaGoldDeep,
        ),
        const SizedBox(width: 10),
        levelCard(
          level: 'N2',
          title: 'Niveau 2',
          emoji: '🚀',
          count: n2,
          tone: const Color(0xFF6758C9),
        ),
      ],
    );
  }

  Widget _home(List<WebClasseLesson> all) {
    final lessons = _forLevel(all);
    final completed = lessons
        .where((lesson) => _completed.contains('${lesson.level}-${lesson.id}'))
        .length;
    final isN2 = _level == 'N2';

    final sections = <({String id, String emoji, String title, String subtitle})>[
      (
        id: 'lessons',
        emoji: '📖',
        title: isN2 ? 'Part 1 — Langue' : 'Leçons',
        subtitle: '${lessons.length} leçons',
      ),
      (
        id: 'alphabet',
        emoji: isN2 ? '🔢' : '🔤',
        title: isN2 ? 'Part 2 — Calcul' : 'Alphabet',
        subtitle: isN2 ? 'Calcul & problèmes' : 'Voyelles & consonnes',
      ),
      (
        id: 'evaluations',
        emoji: '📝',
        title: 'Évaluations',
        subtitle: 'Questions & scores',
      ),
      if (isN2)
        (
          id: 'grammaire',
          emoji: '📐',
          title: 'Grammaire',
          subtitle: 'Classes, tons, verbes',
        ),
      if (isN2)
        (
          id: 'textprod',
          emoji: '✍️',
          title: 'Production de textes',
          subtitle: '6 types de textes',
        ),
      if (isN2)
        (
          id: 'gestion',
          emoji: '💼',
          title: 'Gestion',
          subtitle: 'Documents pratiques',
        ),
      (
        id: 'facilitateur',
        emoji: '👨‍🏫',
        title: 'Facilitateur',
        subtitle: 'Guide pédagogique',
      ),
      (
        id: 'corrections',
        emoji: '✅',
        title: 'Mes corrections',
        subtitle: 'Notes & commentaires',
      ),
    ];

    return ListView(
      children: [
        _levelSelector(all),
        const SizedBox(height: 16),
        Row(
          children: [
            Expanded(
              child: _WebClassStat(
                value: '$completed',
                label: 'Leçons',
                tone: _fitilaInk,
              ),
            ),
            const SizedBox(width: 8),
            const Expanded(
              child: _WebClassStat(
                value: '0',
                label: 'Évaluations',
                tone: _fitilaInk,
              ),
            ),
            const SizedBox(width: 8),
            const Expanded(
              child: _WebClassStat(
                value: '0%',
                label: 'Progression',
                tone: _fitilaGoldDeep,
              ),
            ),
          ],
        ),
        const SizedBox(height: 16),
        GridView.builder(
          itemCount: sections.length,
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: 2,
            mainAxisExtent: 152,
            crossAxisSpacing: 10,
            mainAxisSpacing: 10,
          ),
          itemBuilder: (context, index) {
            final section = sections[index];
            return InkWell(
              borderRadius: BorderRadius.circular(20),
              onTap: () {
                if (section.id == 'lessons') {
                  setState(() => _section = 'lessons');
                } else {
                  setState(() => _section = section.id);
                }
              },
              child: Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: _fitilaCard,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: _fitilaBorder),
                ),
                child: Column(
                  children: [
                    Container(
                      width: 54,
                      height: 54,
                      alignment: Alignment.center,
                      decoration: BoxDecoration(
                        color: index.isEven
                            ? _fitilaPrimarySoft
                            : const Color(0xFFDCEAE0),
                        borderRadius: BorderRadius.circular(17),
                      ),
                      child: Text(
                        section.emoji,
                        style: const TextStyle(fontSize: 25),
                      ),
                    ),
                    const Spacer(),
                    Text(
                      section.title,
                      textAlign: TextAlign.center,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        color: _fitilaInk,
                        fontSize: 12.5,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    const SizedBox(height: 3),
                    Text(
                      section.subtitle,
                      textAlign: TextAlign.center,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        color: _fitilaMuted,
                        fontSize: 9.8,
                      ),
                    ),
                  ],
                ),
              ),
            );
          },
        ),
      ],
    );
  }

  Widget _lessonList(List<WebClasseLesson> all) {
    final lessons = _forLevel(all);
    final groups = _grouped(lessons);
    return ListView(
      children: [
        Row(
          children: [
            IconButton(
              tooltip: 'Retour',
              onPressed: () => setState(() => _section = 'home'),
              icon: const Icon(Icons.arrow_back_rounded),
            ),
            const SizedBox(width: 4),
            const Expanded(
              child: Text(
                '📖 Leçons',
                style: TextStyle(
                  color: _fitilaInk,
                  fontSize: 20,
                  fontWeight: FontWeight.w900,
                ),
              ),
            ),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
              decoration: BoxDecoration(
                color: _level == 'N1'
                    ? _fitilaPrimarySoft
                    : const Color(0xFFE5E1FA),
                borderRadius: BorderRadius.circular(999),
              ),
              child: Text(
                _level == 'N1' ? '🔥 N1' : '🚀 N2',
                style: TextStyle(
                  color: _level == 'N1'
                      ? _fitilaGoldDeep
                      : const Color(0xFF6758C9),
                  fontSize: 11,
                  fontWeight: FontWeight.w900,
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        for (final group in groups.entries) ...[
          Padding(
            padding: const EdgeInsets.fromLTRB(6, 12, 6, 8),
            child: Text(
              '📖  ${group.key}',
              style: const TextStyle(
                color: _fitilaInk,
                fontSize: 15,
                fontWeight: FontWeight.w900,
              ),
            ),
          ),
          for (final lesson in group.value)
            Padding(
              padding: const EdgeInsets.only(bottom: 9),
              child: _WebLessonTile(
                lesson: lesson,
                done: _completed.contains(
                  '${lesson.level}-${lesson.id}',
                ),
                onTap: () => _openLesson(lesson),
              ),
            ),
        ],
      ],
    );
  }

  List<({String id, String label, String emoji})> _tabs(
    WebClasseLesson lesson,
  ) {
    return [
      (id: 'text', label: 'Texte', emoji: '📖'),
      if (lesson.observe.isNotEmpty)
        (id: 'observe', label: 'Mɛɛrio', emoji: '👁️'),
      if (lesson.ecoute.isNotEmpty)
        (id: 'ecoute', label: 'Faagi', emoji: '🎧'),
      if (lesson.reagis.isNotEmpty)
        (id: 'reagis', label: 'Geruo', emoji: '💬'),
      if (lesson.retiens.isNotEmpty)
        (id: 'retiens', label: 'Weenɛ', emoji: '🧠'),
      if (lesson.reading.isNotEmpty || lesson.writing.isNotEmpty)
        (id: 'phonetics', label: 'Sɔ̃ɔsiru', emoji: '✍️'),
    ];
  }

  Widget _questionList(
    WebClasseLesson lesson,
    String section,
    List<String> questions,
  ) {
    return ListView(
      padding: const EdgeInsets.only(top: 4),
      children: [
        for (var i = 0; i < questions.length; i++)
          Container(
            margin: const EdgeInsets.only(bottom: 12),
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: _fitilaCard,
              borderRadius: BorderRadius.circular(18),
              border: Border.all(color: _fitilaBorder),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Q${i + 1}',
                  style: const TextStyle(
                    color: _fitilaGoldDeep,
                    fontSize: 10.5,
                    fontWeight: FontWeight.w900,
                  ),
                ),
                const SizedBox(height: 5),
                Text(
                  questions[i],
                  style: const TextStyle(
                    color: _fitilaInk,
                    fontSize: 14,
                    height: 1.4,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 10),
                TextFormField(
                  initialValue:
                      _lessonAnswers['${lesson.level}-${lesson.id}-$section-$i'],
                  minLines: 2,
                  maxLines: 5,
                  onChanged: (value) {
                    _lessonAnswers[
                        '${lesson.level}-${lesson.id}-$section-$i'] = value;
                  },
                  decoration: const InputDecoration(
                    hintText: 'Votre réponse...',
                  ),
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    OutlinedButton.icon(
                      onPressed: () {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(
                            content: Text('Réponse vocale prête à enregistrer.'),
                          ),
                        );
                      },
                      icon: const Icon(Icons.mic_rounded),
                      label: const Text('Vocal'),
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
            ),
          ),
      ],
    );
  }

  Widget _lessonContent(WebClasseLesson lesson) {
    switch (_lessonTab) {
      case 'observe':
        return _questionList(lesson, 'observe', lesson.observe);
      case 'ecoute':
        return _questionList(lesson, 'ecoute', lesson.ecoute);
      case 'reagis':
        return _questionList(lesson, 'reagis', lesson.reagis);
      case 'retiens':
        return _questionList(lesson, 'retiens', lesson.retiens);
      case 'phonetics':
        return ListView(
          children: [
            if (lesson.phoneticLabel.isNotEmpty)
              Text(
                lesson.phoneticLabel,
                style: const TextStyle(
                  color: _fitilaGoldDeep,
                  fontWeight: FontWeight.w900,
                ),
              ),
            if (lesson.phoneticLabel.isNotEmpty)
              const SizedBox(height: 10),
            if (lesson.reading.isNotEmpty)
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: _fitilaCard,
                  borderRadius: BorderRadius.circular(18),
                  border: Border.all(color: _fitilaBorder),
                ),
                child: Column(
                  children: [
                    for (var i = 0; i < lesson.reading.length; i++)
                      ListTile(
                        dense: true,
                        contentPadding: EdgeInsets.zero,
                        title: Text(
                          lesson.reading[i],
                          style: const TextStyle(
                            color: _fitilaInk,
                            fontFamily: 'monospace',
                            fontSize: 15,
                          ),
                        ),
                        trailing: IconButton(
                          tooltip: 'Écouter',
                          onPressed: () => _playApprovedAudio(
                            lesson,
                            section: 'phonetics/reading',
                            itemIndex: i,
                          ),
                          icon: const Icon(Icons.volume_up_rounded),
                        ),
                      ),
                  ],
                ),
              ),
            if (lesson.writing.isNotEmpty) ...[
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: _fitilaCard,
                  borderRadius: BorderRadius.circular(18),
                  border: Border.all(color: _fitilaBorder),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      '✍️ Exercices d’écriture',
                      style: TextStyle(
                        color: _fitilaInk,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                    const SizedBox(height: 10),
                    for (var i = 0; i < lesson.writing.length; i++)
                      Padding(
                        padding: const EdgeInsets.only(bottom: 9),
                        child: Row(
                          children: [
                            SizedBox(
                              width: 84,
                              child: Text(
                                lesson.writing[i],
                                style: const TextStyle(
                                  color: _fitilaGoldDeep,
                                  fontWeight: FontWeight.w800,
                                ),
                              ),
                            ),
                            Expanded(
                              child: TextFormField(
                                initialValue: _lessonAnswers[
                                    '${lesson.level}-${lesson.id}-write-$i'],
                                onChanged: (value) {
                                  _lessonAnswers[
                                          '${lesson.level}-${lesson.id}-write-$i'] =
                                      value;
                                },
                                decoration: const InputDecoration(
                                  hintText: 'Écris...',
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                  ],
                ),
              ),
            ],
          ],
        );
      default:
        return ListView(
          children: [
            if (lesson.imageUrl.isNotEmpty)
              ClipRRect(
                borderRadius: BorderRadius.circular(20),
                child: Container(
                  color: _fitilaCard,
                  child: Image.network(
                    'https://fitila.bj${lesson.imageUrl}',
                    fit: BoxFit.contain,
                    height: 310,
                    errorBuilder: (_, _, _) => Container(
                      height: 180,
                      alignment: Alignment.center,
                      color: _fitilaSurfaceAlt,
                      child: const Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(
                            Icons.image_not_supported_outlined,
                            color: _fitilaMuted,
                            size: 38,
                          ),
                          SizedBox(height: 7),
                          Text(
                            'Illustration indisponible hors connexion',
                            style: TextStyle(color: _fitilaMuted),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
            if (lesson.imageUrl.isNotEmpty)
              const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: _fitilaCard,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: _fitilaBorder),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Align(
                    alignment: Alignment.centerRight,
                    child: IconButton(
                      tooltip: 'Écouter le texte',
                      onPressed: () => _playApprovedAudio(lesson),
                      icon: const Icon(Icons.volume_up_rounded),
                    ),
                  ),
                  Text(
                    lesson.text,
                    style: const TextStyle(
                      color: _fitilaInkSoft,
                      fontSize: 15,
                      height: 1.55,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 12),
            FilledButton.icon(
              style: FilledButton.styleFrom(
                backgroundColor: _fitilaSage,
                foregroundColor: Colors.white,
              ),
              onPressed: () {
                final tabs = _tabs(lesson);
                final idx = tabs.indexWhere((tab) => tab.id == _lessonTab);
                if (idx < tabs.length - 1) {
                  setState(() => _lessonTab = tabs[idx + 1].id);
                } else {
                  setState(() {
                    _completed.add('${lesson.level}-${lesson.id}');
                  });
                }
              },
              icon: const Icon(Icons.check_rounded),
              label: const Text('J’ai lu'),
            ),
          ],
        );
    }
  }

  Widget _lessonDetail(List<WebClasseLesson> all) {
    final lessons = _forLevel(all);
    final lesson = lessons.firstWhere(
      (item) => item.id == _selectedLessonId,
      orElse: () => lessons.first,
    );
    final tabs = _tabs(lesson);
    if (!tabs.any((tab) => tab.id == _lessonTab)) {
      _lessonTab = 'text';
    }

    return Column(
      children: [
        Row(
          children: [
            IconButton(
              tooltip: 'Leçons',
              onPressed: () => setState(() => _section = 'lessons'),
              icon: const Icon(Icons.arrow_back_rounded),
            ),
            const SizedBox(width: 4),
            Expanded(
              child: Text(
                '🏫 ${lesson.title}',
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                  color: _fitilaInk,
                  fontSize: 20,
                  fontWeight: FontWeight.w900,
                ),
              ),
            ),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 5),
              decoration: BoxDecoration(
                color: _level == 'N1'
                    ? _fitilaPrimarySoft
                    : const Color(0xFFE5E1FA),
                borderRadius: BorderRadius.circular(99),
              ),
              child: Text(
                _level == 'N1' ? '🔥 N1' : '🚀 N2',
                style: TextStyle(
                  color: _level == 'N1'
                      ? _fitilaGoldDeep
                      : const Color(0xFF6758C9),
                  fontSize: 10.5,
                  fontWeight: FontWeight.w900,
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 10),
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            gradient: LinearGradient(
              colors: _level == 'N1'
                  ? const [Color(0xFFFFF1C7), Color(0xFFFFE4B8)]
                  : const [Color(0xFFE5E1FA), Color(0xFFD9D0F7)],
            ),
            borderRadius: BorderRadius.circular(22),
            border: Border.all(
              color: _level == 'N1'
                  ? const Color(0xFFE9C86F)
                  : const Color(0xFFB7A9EC),
            ),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 9,
                      vertical: 4,
                    ),
                    decoration: BoxDecoration(
                      color: _level == 'N1'
                          ? const Color(0xFFFFE49A)
                          : const Color(0xFFD2C7F2),
                      borderRadius: BorderRadius.circular(99),
                    ),
                    child: Text(
                      'Leçon ${lesson.id}',
                      style: const TextStyle(
                        color: _fitilaGoldDeep,
                        fontSize: 10.5,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      lesson.themeLabel,
                      style: const TextStyle(
                        color: _fitilaMuted,
                        fontSize: 11,
                      ),
                    ),
                  ),
                  const Text(
                    '☆ ☆ ☆ ☆ ☆',
                    style: TextStyle(
                      color: _fitilaGoldDeep,
                      fontSize: 13,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 10),
              Text(
                lesson.title,
                style: const TextStyle(
                  color: _fitilaInk,
                  fontSize: 21,
                  fontWeight: FontWeight.w900,
                ),
              ),
              if (lesson.phoneticLabel.isNotEmpty) ...[
                const SizedBox(height: 5),
                Text(
                  lesson.phoneticLabel,
                  style: const TextStyle(
                    color: _fitilaGoldDeep,
                    fontSize: 12,
                  ),
                ),
              ],
            ],
          ),
        ),
        const SizedBox(height: 10),
        SizedBox(
          height: 43,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            itemCount: tabs.length,
            separatorBuilder: (_, _) => const SizedBox(width: 7),
            itemBuilder: (context, index) {
              final tab = tabs[index];
              final selected = tab.id == _lessonTab;
              return ChoiceChip(
                selected: selected,
                label: Text('${tab.emoji} ${tab.label}'),
                onSelected: (_) => setState(() => _lessonTab = tab.id),
              );
            },
          ),
        ),
        const SizedBox(height: 10),
        Expanded(child: _lessonContent(lesson)),
        const SizedBox(height: 8),
        Row(
          children: [
            OutlinedButton.icon(
              onPressed: lesson.id <= 1
                  ? null
                  : () {
                      final previous = lessons
                          .where((e) => e.id < lesson.id)
                          .lastOrNull;
                      if (previous != null) _openLesson(previous);
                    },
              icon: const Icon(Icons.chevron_left_rounded),
              label: const Text('Précédent'),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: FilledButton.icon(
                onPressed: () {
                  final idx = tabs.indexWhere(
                    (tab) => tab.id == _lessonTab,
                  );
                  if (idx < tabs.length - 1) {
                    setState(() => _lessonTab = tabs[idx + 1].id);
                    return;
                  }
                  setState(() {
                    _completed.add('${lesson.level}-${lesson.id}');
                  });
                  final next = lessons
                      .where((e) => e.id > lesson.id)
                      .firstOrNull;
                  if (next != null) {
                    _openLesson(next);
                  } else {
                    setState(() => _section = 'lessons');
                  }
                },
                icon: const Icon(Icons.check_rounded),
                label: Text(
                  tabs.last.id == _lessonTab
                      ? 'Terminer la leçon'
                      : 'Suivant',
                ),
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _secondarySection(String section) {
    final config = switch (section) {
      'alphabet' => (
          icon: Icons.abc_rounded,
          title: _level == 'N1' ? 'Alphabet' : 'Calcul',
          text: _level == 'N1'
              ? 'Voyelles, consonnes, tons, écoute et saisie Bàátɔ̀nú.'
              : 'Nombres, calculs, problèmes et situations pratiques.',
        ),
      'evaluations' => (
          icon: Icons.assignment_rounded,
          title: 'Évaluations',
          text: 'Questions langue/calcul, score et progression.',
        ),
      'grammaire' => (
          icon: Icons.rule_rounded,
          title: 'Grammaire',
          text: 'Classes grammaticales, tons, verbes et structures.',
        ),
      'textprod' => (
          icon: Icons.edit_note_rounded,
          title: 'Production de textes',
          text: 'Récit, description, dialogue, lettre et résumé.',
        ),
      'gestion' => (
          icon: Icons.business_center_rounded,
          title: 'Gestion',
          text: 'Fiches, registres, annonces et documents pratiques.',
        ),
      'corrections' => (
          icon: Icons.fact_check_rounded,
          title: 'Mes corrections',
          text: 'Notes, commentaires, corrigés et remédiation.',
        ),
      _ => (
          icon: Icons.workspace_premium_rounded,
          title: 'Facilitateur',
          text: 'Guide pédagogique, objectifs et animation de classe.',
        ),
    };

    return ListView(
      children: [
        Row(
          children: [
            IconButton(
              onPressed: () => setState(() => _section = 'home'),
              icon: const Icon(Icons.arrow_back_rounded),
            ),
            const SizedBox(width: 6),
            Text(
              config.title,
              style: const TextStyle(
                color: _fitilaInk,
                fontSize: 20,
                fontWeight: FontWeight.w900,
              ),
            ),
          ],
        ),
        const SizedBox(height: 14),
        Container(
          padding: const EdgeInsets.all(22),
          decoration: BoxDecoration(
            color: _fitilaCard,
            borderRadius: BorderRadius.circular(22),
            border: Border.all(color: _fitilaBorder),
          ),
          child: Column(
            children: [
              Icon(config.icon, color: _fitilaGoldDeep, size: 44),
              const SizedBox(height: 12),
              Text(
                config.title,
                style: const TextStyle(
                  color: _fitilaInk,
                  fontSize: 18,
                  fontWeight: FontWeight.w900,
                ),
              ),
              const SizedBox(height: 7),
              Text(
                config.text,
                textAlign: TextAlign.center,
                style: const TextStyle(
                  color: _fitilaMuted,
                  height: 1.45,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    return _PageFrame(
      title: 'Classe',
      subtitle: _level == 'N1'
          ? '🔥 N1 — Bàátɔ̀nú'
          : '🚀 N2 — Bàátɔ̀nú',
      child: FutureBuilder<List<WebClasseLesson>>(
        future: _webLessons,
        builder: (context, snapshot) {
          if (snapshot.hasError) {
            return Center(
              child: FilledButton.icon(
                onPressed: () =>
                    setState(() => _webLessons = WebClasseContent.loadLessons()),
                icon: const Icon(Icons.refresh_rounded),
                label: const Text('Recharger les leçons'),
              ),
            );
          }
          if (!snapshot.hasData) {
            return const Center(child: CircularProgressIndicator());
          }
          final all = snapshot.data!;
          return switch (_section) {
            'home' => _home(all),
            'lessons' => _lessonList(all),
            'detail' => _lessonDetail(all),
            _ => _secondarySection(_section),
          };
        },
      ),
    );
  }
}

class _WebClassStat extends StatelessWidget {
  const _WebClassStat({
    required this.value,
    required this.label,
    required this.tone,
  });

  final String value;
  final String label;
  final Color tone;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 12),
      decoration: BoxDecoration(
        color: _fitilaCard,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: _fitilaBorder),
      ),
      child: Column(
        children: [
          Text(
            value,
            style: TextStyle(
              color: tone,
              fontSize: 19,
              fontWeight: FontWeight.w900,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            label,
            maxLines: 1,
            style: const TextStyle(
              color: _fitilaMuted,
              fontSize: 9.8,
            ),
          ),
        ],
      ),
    );
  }
}

class _WebLessonTile extends StatelessWidget {
  const _WebLessonTile({
    required this.lesson,
    required this.done,
    required this.onTap,
  });

  final WebClasseLesson lesson;
  final bool done;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final n2 = lesson.level == 'N2';
    return Material(
      color: done ? const Color(0xFFE8F5EC) : _fitilaCard,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(18),
        side: BorderSide(
          color: done ? _fitilaSage.withValues(alpha: .35) : _fitilaBorder,
        ),
      ),
      child: InkWell(
        borderRadius: BorderRadius.circular(18),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 13, vertical: 12),
          child: Row(
            children: [
              Container(
                width: 52,
                height: 52,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: done
                      ? _fitilaSage
                      : n2
                      ? const Color(0xFFE5E1FA)
                      : const Color(0xFFFFF1C7),
                  borderRadius: BorderRadius.circular(15),
                ),
                child: done
                    ? const Icon(Icons.check_rounded, color: Colors.white)
                    : Text(
                        '${lesson.id}',
                        style: TextStyle(
                          color: n2
                              ? const Color(0xFF6758C9)
                              : _fitilaGoldDeep,
                          fontSize: 21,
                          fontWeight: FontWeight.w900,
                        ),
                      ),
              ),
              const SizedBox(width: 13),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      lesson.title,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        color: _fitilaInk,
                        fontSize: 15,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    if (lesson.phoneticLabel.isNotEmpty) ...[
                      const SizedBox(height: 3),
                      Text(
                        lesson.phoneticLabel,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          color: _fitilaMuted,
                          fontSize: 11.5,
                        ),
                      ),
                    ],
                  ],
                ),
              ),
              if (lesson.imageUrl.isNotEmpty)
                const Padding(
                  padding: EdgeInsets.symmetric(horizontal: 8),
                  child: Text('🖼️'),
                ),
              const Icon(
                Icons.chevron_right_rounded,
                color: _fitilaMuted,
              ),
            ],
          ),
        ),
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
  bool _floating = true;
  bool _suggestions = true;
  bool _haptic = false;
  bool _autoNormalize = true;

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
          Card(
            child: Padding(
              padding: const EdgeInsets.all(14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Paramètres clavier natif',
                    style: TextStyle(fontSize: 18, fontWeight: FontWeight.w900),
                  ),
                  const SizedBox(height: 8),
                  SwitchListTile(
                    value: _floating,
                    onChanged: (value) => setState(() => _floating = value),
                    secondary: const Icon(Icons.open_in_full_rounded),
                    title: const Text('Compagnon flottant'),
                    subtitle: const Text(
                      'Bouton clavier disponible dans IA, traducteur, classe et fil.',
                    ),
                  ),
                  SwitchListTile(
                    value: _suggestions,
                    onChanged: (value) => setState(() => _suggestions = value),
                    secondary: const Icon(Icons.lightbulb_rounded),
                    title: const Text('Suggestions phonétiques'),
                    subtitle: const Text(
                      'Propose accents, tons, corrections et variantes proches.',
                    ),
                  ),
                  SwitchListTile(
                    value: _autoNormalize,
                    onChanged: (value) =>
                        setState(() => _autoNormalize = value),
                    secondary: const Icon(Icons.spellcheck_rounded),
                    title: const Text('Normalisation automatique'),
                    subtitle: const Text(
                      'Nettoie apostrophes, tons, espaces et caractères Bariba.',
                    ),
                  ),
                  SwitchListTile(
                    value: _haptic,
                    onChanged: (value) => setState(() => _haptic = value),
                    secondary: const Icon(Icons.vibration_rounded),
                    title: const Text('Retour haptique'),
                    subtitle: const Text(
                      'Prépare vibration légère sur mobile Android/iOS.',
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 12),
          const _FeatureGrid(
            items: [
              (
                Icons.android_rounded,
                'Activation Android',
                'Paramètres > Langues et saisie > Clavier Fitila.',
              ),
              (
                Icons.settings_applications_rounded,
                'Guide pas à pas',
                'Activer, choisir par défaut, tester, changer de clavier.',
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
              (
                Icons.security_rounded,
                'Confidentialité',
                'Saisie locale, aucun texte sensible envoyé sans consentement.',
              ),
              (
                Icons.extension_rounded,
                'Intégration native',
                'Pont prévu vers InputMethodService Android et TextInput Flutter.',
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class VoiceLabScreen extends StatefulWidget {
  const VoiceLabScreen({super.key});

  @override
  State<VoiceLabScreen> createState() => _VoiceLabScreenState();
}

class _VoiceLabScreenState extends State<VoiceLabScreen> {
  final _recorder = FitilaMediaController();
  final _player = audio.AudioPlayer();
  List<Map<String, dynamic>> _queue = const [];
  Map<String, int> _categories = const {};
  FitilaMediaAsset? _recording;
  DateTime? _startedAt;
  bool _loading = true;
  bool _recordingNow = false;
  bool _submitting = false;
  bool _showFrench = true;
  int _total = 0;
  int _recorded = 0;
  int _recordedDurationSeconds = 0;

  Map<String, dynamic>? get _current => _queue.isEmpty ? null : _queue.first;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _recorder.dispose();
    _player.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final data = await FitilaBackend.fetchVoiceLab();
      if (!mounted) return;
      setState(() {
        _queue = (data['queue'] as List).cast<Map<String, dynamic>>().toList(
          growable: false,
        );
        _categories = Map<String, int>.from(data['categories'] as Map);
        _total = data['total'] as int;
        _recorded = data['recorded'] as int;
      });
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Impossible de charger le corpus vocal.')),
      );
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _toggleRecord() async {
    try {
      if (_recordingNow) {
        final asset = await _recorder.stopAudio();
        final elapsed = DateTime.now().difference(_startedAt ?? DateTime.now());
        if (!mounted) return;
        setState(() {
          _recordingNow = false;
          _recording = asset;
          _recordedDurationSeconds = elapsed.inSeconds < 1
              ? 1
              : elapsed.inSeconds;
        });
      } else {
        await _recorder.startAudio();
        if (!mounted) return;
        setState(() {
          _recordingNow = true;
          _recording = null;
          _startedAt = DateTime.now();
        });
      }
    } catch (error) {
      if (!mounted) return;
      setState(() => _recordingNow = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(error.toString().replaceFirst('Bad state: ', '')),
        ),
      );
    }
  }

  Future<void> _listen() async {
    final recording = _recording;
    if (recording == null) return;
    await _player.play(audio.DeviceFileSource(recording.path));
  }

  void _skip() {
    if (_queue.isEmpty) return;
    setState(() {
      _queue = [..._queue.skip(1), _queue.first];
      _recording = null;
      _startedAt = null;
      _recordedDurationSeconds = 0;
    });
  }

  Future<void> _submit() async {
    final phrase = _current;
    final recording = _recording;
    if (phrase == null || recording == null || _submitting) return;
    setState(() => _submitting = true);
    try {
      await FitilaBackend.submitVoiceRecording(
        phraseId: phrase['id'].toString(),
        category: phrase['category']?.toString() ?? 'Autres',
        baribaText: phrase['text_bariba']?.toString() ?? '',
        bytes: await recording.readBytes(),
        contentType: recording.contentType,
        durationSeconds: _recordedDurationSeconds,
      );
      if (!mounted) return;
      setState(() {
        _queue = _queue.skip(1).toList(growable: false);
        _recording = null;
        _startedAt = null;
        _recordedDurationSeconds = 0;
        _recorded++;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Enregistrement ajouté au corpus. Merci !'),
        ),
      );
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('L’envoi vocal a échoué. Réessayez.')),
      );
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final current = _current;
    return _PageFrame(
      title: 'Bariba Voice Lab',
      subtitle: 'Aidez à construire la voix de demain.',
      child: ListView(
        children: [
          if (_loading) const LinearProgressIndicator(),
          _MetricStrip(
            metrics: [
              ('Contributions', '$_recorded', Icons.mic_rounded),
              ('Corpus', '$_total', Icons.dataset_rounded),
              (
                'Restantes',
                '${(_total - _recorded).clamp(0, _total)}',
                Icons.pending_actions_rounded,
              ),
            ],
          ),
          const SizedBox(height: 12),
          if (_categories.isNotEmpty)
            SizedBox(
              height: 42,
              child: ListView(
                scrollDirection: Axis.horizontal,
                children: [
                  for (final entry in _categories.entries)
                    Padding(
                      padding: const EdgeInsets.only(right: 8),
                      child: Chip(label: Text('${entry.key} · ${entry.value}')),
                    ),
                ],
              ),
            ),
          const SizedBox(height: 12),
          if (!_loading && current == null)
            const _EmptyState(
              icon: Icons.task_alt_rounded,
              title: 'Corpus terminé',
              text: 'Toutes les phrases disponibles ont été enregistrées.',
            )
          else if (current != null)
            Card(
              child: Padding(
                padding: const EdgeInsets.all(20),
                child: Column(
                  children: [
                    Text(
                      current['category']?.toString() ?? 'Phrase',
                      style: const TextStyle(
                        color: _fitilaPrimary,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                    const SizedBox(height: 16),
                    Text(
                      current['text_bariba']?.toString() ?? '',
                      textAlign: TextAlign.center,
                      style: const TextStyle(
                        fontSize: 26,
                        height: 1.3,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                    if (_showFrench) ...[
                      const SizedBox(height: 10),
                      Text(
                        current['text_french']?.toString() ?? '',
                        textAlign: TextAlign.center,
                        style: TextStyle(color: Colors.grey.shade700),
                      ),
                    ],
                    TextButton.icon(
                      onPressed: () =>
                          setState(() => _showFrench = !_showFrench),
                      icon: Icon(
                        _showFrench ? Icons.visibility_off : Icons.visibility,
                      ),
                      label: Text(
                        _showFrench
                            ? 'Masquer le français'
                            : 'Voir le français',
                      ),
                    ),
                    const SizedBox(height: 16),
                    FilledButton.icon(
                      onPressed: _submitting ? null : _toggleRecord,
                      style: FilledButton.styleFrom(
                        backgroundColor: _recordingNow
                            ? Colors.red
                            : _fitilaPrimary,
                        minimumSize: const Size.fromHeight(56),
                      ),
                      icon: Icon(
                        _recordingNow ? Icons.stop_rounded : Icons.mic_rounded,
                      ),
                      label: Text(_recordingNow ? 'Arrêter' : 'Enregistrer'),
                    ),
                    if (_recording != null) ...[
                      const SizedBox(height: 12),
                      Row(
                        children: [
                          Expanded(
                            child: OutlinedButton.icon(
                              onPressed: _listen,
                              icon: const Icon(Icons.play_arrow_rounded),
                              label: const Text('Écouter'),
                            ),
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: FilledButton.icon(
                              onPressed: _submitting ? null : _submit,
                              icon: _submitting
                                  ? const SizedBox.square(
                                      dimension: 16,
                                      child: CircularProgressIndicator(
                                        strokeWidth: 2,
                                      ),
                                    )
                                  : const Icon(Icons.check_rounded),
                              label: const Text('Valider'),
                            ),
                          ),
                        ],
                      ),
                    ],
                    const SizedBox(height: 8),
                    TextButton.icon(
                      onPressed: _recordingNow || _submitting ? null : _skip,
                      icon: const Icon(Icons.skip_next_rounded),
                      label: const Text('Passer cette phrase'),
                    ),
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class _ClasseCorrectionWorkflowBoard extends StatelessWidget {
  const _ClasseCorrectionWorkflowBoard();

  @override
  Widget build(BuildContext context) {
    return _ActionList(
      items: const [
        _ActionItem(
          Icons.difference_rounded,
          'AnswerDiff',
          'Compare réponse élève, corrigé attendu, écarts et variantes acceptées.',
        ),
        _ActionItem(
          Icons.edit_note_rounded,
          'AnswerReview',
          'Annotation enseignant, note, statut, commentaire texte et audio.',
        ),
        _ActionItem(
          Icons.record_voice_over_rounded,
          'VoiceAnswerPlayer',
          'Écoute, transcription, qualité, vitesse et commentaire vocal.',
        ),
        _ActionItem(
          Icons.auto_awesome_rounded,
          'Remédiation IA',
          'Conseil personnalisé, exercice de reprise et prochaine leçon.',
        ),
      ],
    );
  }
}

class _ClasseGradebookBoard extends StatelessWidget {
  const _ClasseGradebookBoard();

  @override
  Widget build(BuildContext context) {
    return _FeatureGrid(
      items: const [
        (
          Icons.bar_chart_rounded,
          'GradeOverview',
          'Moyenne, distribution, évolution, retard et modules faibles.',
        ),
        (
          Icons.table_chart_rounded,
          'Carnet de notes',
          'Notes par élève, module, évaluation, oral, calcul et production.',
        ),
        (
          Icons.picture_as_pdf_rounded,
          'MyGradeReport',
          'Relevé PDF élève/parent/enseignant avec commentaires.',
        ),
        (
          Icons.insights_rounded,
          'ClassStats',
          'Performance classe, objectifs, assiduité et recommandations.',
        ),
      ],
    );
  }
}

class TeacherScreen extends StatefulWidget {
  const TeacherScreen({super.key});

  @override
  State<TeacherScreen> createState() => _TeacherScreenState();
}

class _TeacherScreenState extends State<TeacherScreen> {
  String _tab = 'Dashboard';

  Widget _teacherChip(String value, IconData icon) {
    return ChoiceChip(
      selected: _tab == value,
      avatar: Icon(icon, size: 18),
      label: Text(value),
      onSelected: (_) => setState(() => _tab = value),
    );
  }

  Widget _teacherBody() {
    return switch (_tab) {
      'Élèves' => _ActionList(
        items: const [
          _ActionItem(
            Icons.people_rounded,
            'StudentList',
            'Recherche, filtre niveau, statut, progression et dernier devoir.',
          ),
          _ActionItem(
            Icons.person_search_rounded,
            'StudentDetail',
            'Profil, réponses, audio, notes, badges et historique complet.',
          ),
          _ActionItem(
            Icons.notifications_active_rounded,
            'Alertes',
            'Retard, faible progression, correction non lue et relance.',
          ),
        ],
      ),
      'Corrections' => const _ClasseCorrectionWorkflowBoard(),
      'Barèmes' => const _FeatureGrid(
        items: [
          (
            Icons.tune_rounded,
            'WeightsManager',
            'Pondérations par module, niveau, chapitre, leçon et compétence.',
          ),
          (
            Icons.rule_folder_rounded,
            'AnswerKeysManager',
            'Corrigés, variantes acceptées, mots clés et barème automatique.',
          ),
          (
            Icons.verified_rounded,
            'Validation',
            'Publier corrigé, verrouiller note et historiser modification.',
          ),
        ],
      ),
      'Notes' => const _ClasseGradebookBoard(),
      'Lecture vocale' => const _FeatureGrid(
        items: [
          (
            Icons.record_voice_over_rounded,
            'VoiceReadingHome',
            'Sélection texte, niveau, modèle audio et consigne de lecture.',
          ),
          (
            Icons.graphic_eq_rounded,
            'VoiceReadingStudio',
            'Waveform, bruit, vitesse, transcription et score de fluidité.',
          ),
          (
            Icons.health_and_safety_rounded,
            'ClasseAudioReview',
            'Validation admin, consentement, qualité et ajout au corpus.',
          ),
        ],
      ),
      _ => const _FeatureGrid(
        items: [
          (
            Icons.dashboard_rounded,
            'TeacherDashboard',
            'Moyenne, élèves actifs, corrections, tendances et alertes.',
          ),
          (
            Icons.pending_actions_rounded,
            'Travail en attente',
            'Réponses texte, audio, évaluations et productions N2 à noter.',
          ),
          (
            Icons.picture_as_pdf_rounded,
            'Exports',
            'Relevés PDF, carnet CSV, synthèse parent et rapport classe.',
          ),
        ],
      ),
    };
  }

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
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              _teacherChip('Dashboard', Icons.dashboard_rounded),
              _teacherChip('Élèves', Icons.people_rounded),
              _teacherChip('Corrections', Icons.rate_review_rounded),
              _teacherChip('Barèmes', Icons.tune_rounded),
              _teacherChip('Notes', Icons.grade_rounded),
              _teacherChip('Lecture vocale', Icons.record_voice_over_rounded),
            ],
          ),
          const SizedBox(height: 12),
          _teacherBody(),
        ],
      ),
    );
  }
}

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key, required this.session});

  final FitilaSession session;

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  String _tab = 'Posts';
  Map<String, dynamic>? _profile;
  bool _loading = false;

  String get _displayName =>
      _profile?['display_name']?.toString().trim().isNotEmpty == true
      ? _profile!['display_name'].toString().trim()
      : widget.session.displayName;

  @override
  void initState() {
    super.initState();
    if (widget.session.accessToken.isNotEmpty) _loadProfile();
  }

  Future<void> _loadProfile() async {
    setState(() => _loading = true);
    try {
      final profile = await FitilaBackend.fetchProfile(widget.session.userId);
      if (mounted) setState(() => _profile = profile);
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: const Text(
              'Le profil ne peut pas être chargé pour le moment.',
            ),
            action: SnackBarAction(label: 'Réessayer', onPressed: _loadProfile),
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _editProfile() async {
    final name = TextEditingController(text: _displayName);
    final location = TextEditingController(
      text: _profile?['location']?.toString() ?? '',
    );
    final result = await showDialog<Map<String, dynamic>>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Modifier le profil'),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: name,
                decoration: const InputDecoration(labelText: 'Nom affiché'),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: location,
                decoration: const InputDecoration(labelText: 'Localisation'),
              ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Annuler'),
          ),
          FilledButton(
            onPressed: () {
              final value = name.text.trim();
              if (value.isEmpty) return;
              Navigator.pop(context, {
                'display_name': value,
                'location': location.text.trim().isEmpty
                    ? null
                    : location.text.trim(),
              });
            },
            child: const Text('Enregistrer'),
          ),
        ],
      ),
    );
    name.dispose();
    location.dispose();
    if (result == null || !mounted) return;
    try {
      await FitilaBackend.updateProfile(widget.session.userId, result);
      await _loadProfile();
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Profil mis à jour.')));
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('La mise à jour du profil a échoué.')),
      );
    }
  }

  Widget _profileTab(String value, IconData icon) {
    return ChoiceChip(
      selected: _tab == value,
      avatar: Icon(icon, size: 18),
      label: Text(value),
      onSelected: (_) => setState(() => _tab = value),
    );
  }

  Widget _profileBody() {
    return switch (_tab) {
      'Vidéos' => const _FeatureGrid(
        items: [
          (
            Icons.play_circle_rounded,
            'Vidéos publiées',
            'Preview verticale, vues, likes, commentaires et partage.',
          ),
          (
            Icons.movie_filter_rounded,
            'Templates utilisés',
            'Historique des modèles et performances par format.',
          ),
          (
            Icons.analytics_rounded,
            'Statistiques',
            'Rétention, complétion, audience et meilleure heure.',
          ),
        ],
      ),
      'Audio' => const _FeatureGrid(
        items: [
          (
            Icons.mic_rounded,
            'Posts vocaux',
            'Radio, proverbes, dictées, transcription et qualité audio.',
          ),
          (
            Icons.graphic_eq_rounded,
            'Voice Lab',
            'Contributions au corpus et diagnostics de prononciation.',
          ),
          (
            Icons.volume_up_rounded,
            'Lecture publique',
            'Contrôles accessibles et écoute bilingue.',
          ),
        ],
      ),
      'Badges' => _ActionList(
        items: const [
          _ActionItem(
            Icons.emoji_events_rounded,
            'Badges culture',
            'Culture Bariba, alphabet, conversation et partage communautaire.',
          ),
          _ActionItem(
            Icons.school_rounded,
            'Réussites apprentissage',
            'Leçons terminées, série, quiz et progression classe.',
          ),
          _ActionItem(
            Icons.verified_rounded,
            'Contributeur validé',
            'Dictionnaire, audio, corrections et contenus approuvés.',
          ),
        ],
      ),
      'Sécurité' => _ActionList(
        items: const [
          _ActionItem(
            Icons.lock_rounded,
            'Code PIN',
            'Accès rapide, verrouillage et récupération de session.',
          ),
          _ActionItem(
            Icons.visibility_rounded,
            'Contrôle visuel',
            'Confirmation avant actions sensibles et publication publique.',
          ),
          _ActionItem(
            Icons.manage_accounts_rounded,
            'Modifier profil',
            'Photo, nom, rôle, village, bio, langue et préférences.',
          ),
        ],
      ),
      'Identité' => const _FeatureGrid(
        items: [
          (
            Icons.badge_rounded,
            'Informations profil',
            'Nom, téléphone, rôle, village, bio, langue préférée et avatar.',
          ),
          (
            Icons.photo_camera_rounded,
            'Photo / couverture',
            'Upload, recadrage, aperçu public et suppression contrôlée.',
          ),
          (
            Icons.verified_user_rounded,
            'Vérification',
            'Compte test, rôle enseignant, contributeur validé et statut IA.',
          ),
        ],
      ),
      'Activité' => const _FeatureGrid(
        items: [
          (
            Icons.timeline_rounded,
            'Timeline personnelle',
            'Posts, commentaires, leçons, corrections, scans et recherches.',
          ),
          (
            Icons.bookmark_rounded,
            'Favoris',
            'Mots, templates, leçons, contenus IA et posts sauvegardés.',
          ),
          (
            Icons.download_rounded,
            'Export données',
            'Archive activité, profil, notes, contributions et historique.',
          ),
        ],
      ),
      'Confidentialité' => _ActionList(
        items: const [
          _ActionItem(
            Icons.visibility_off_rounded,
            'Visibilité profil',
            'Public, communauté, classe seulement ou privé.',
          ),
          _ActionItem(
            Icons.block_rounded,
            'Blocage et signalement',
            'Comptes bloqués, contenus signalés et modération.',
          ),
          _ActionItem(
            Icons.delete_outline_rounded,
            'Données personnelles',
            'Effacer historique, exporter données et demander suppression.',
          ),
        ],
      ),
      'Backend' => _ActionList(
        items: const [
          _ActionItem(
            Icons.storage_rounded,
            'tamtam_profiles',
            'Champs profil, avatar, rôle, langue, village et statut IA.',
          ),
          _ActionItem(
            Icons.sync_rounded,
            'Synchronisation',
            'Profil local, session, cache, conflit et mise à jour Supabase.',
          ),
          _ActionItem(
            Icons.security_rounded,
            'RLS / permissions',
            'Lecture publique, édition propriétaire et accès enseignant/admin.',
          ),
        ],
      ),
      _ => const _FeatureGrid(
        items: [
          (
            Icons.grid_view_rounded,
            'Posts',
            'Texte, audio, vidéo, templates, brouillons et favoris.',
          ),
          (
            Icons.chat_bubble_rounded,
            'Interactions',
            'Commentaires, mentions, partages, réponses et signalements.',
          ),
          (
            Icons.person_search_rounded,
            'Profil public',
            'Vue visiteur, bio, village, rôle et contenus visibles.',
          ),
        ],
      ),
    };
  }

  @override
  Widget build(BuildContext context) {
    final posts = '${_profile?['posts_count'] ?? 0}';
    final followers = '${_profile?['followers_count'] ?? 0}';
    final following = '${_profile?['following_count'] ?? 0}';

    return _PageFrame(
      title: 'Profil',
      subtitle: 'Compte, progression et paramètres personnels.',
      child: ListView(
        children: [
          if (_loading) const LinearProgressIndicator(),
          if (_loading) const SizedBox(height: 8),
          Stack(
            alignment: Alignment.topRight,
            children: [
              Column(
                children: [
                  Container(
                    width: 84,
                    height: 84,
                    alignment: Alignment.center,
                    decoration: BoxDecoration(
                      color: _fitilaSurfaceAlt,
                      shape: BoxShape.circle,
                      border: Border.all(color: _fitilaPrimary, width: 2),
                    ),
                    child: Text(
                      _displayName.characters.first,
                      style: const TextStyle(
                        color: _fitilaGoldDeep,
                        fontFamily: 'serif',
                        fontSize: 30,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                  Text(
                    _displayName,
                    textAlign: TextAlign.center,
                    style: const TextStyle(
                      color: _fitilaInk,
                      fontFamily: 'serif',
                      fontSize: 19,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    '${widget.session.phone} · ${widget.session.role}',
                    textAlign: TextAlign.center,
                    style: const TextStyle(
                      color: _fitilaMuted,
                      fontSize: 12,
                    ),
                  ),
                  const SizedBox(height: 16),
                  Row(
                    children: [
                      Expanded(
                        child: _PremiumProfileStat(
                          value: posts,
                          label: 'posts',
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: _PremiumProfileStat(
                          value: followers,
                          label: 'abonnés',
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: _PremiumProfileStat(
                          value: following,
                          label: 'abonnements',
                        ),
                      ),
                    ],
                  ),
                ],
              ),
              _PremiumTopIcon(
                icon: Icons.edit_rounded,
                tooltip: 'Modifier',
                onPressed: widget.session.accessToken.isEmpty
                    ? () {}
                    : _editProfile,
              ),
            ],
          ),
          const SizedBox(height: 18),
          const Text(
            'Paramètres & activité',
            style: TextStyle(
              color: _fitilaMuted,
              fontSize: 12.5,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              _profileTab('Posts', Icons.grid_view_rounded),
              _profileTab('Identité', Icons.badge_rounded),
              _profileTab('Vidéos', Icons.play_circle_rounded),
              _profileTab('Audio', Icons.mic_rounded),
              _profileTab('Badges', Icons.emoji_events_rounded),
              _profileTab('Activité', Icons.timeline_rounded),
              _profileTab('Confidentialité', Icons.visibility_off_rounded),
              _profileTab('Sécurité', Icons.lock_rounded),
              _profileTab('Backend', Icons.storage_rounded),
            ],
          ),
          const SizedBox(height: 12),
          _profileBody(),
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

class _PremiumProfileStat extends StatelessWidget {
  const _PremiumProfileStat({required this.value, required this.label});

  final String value;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 12),
      decoration: BoxDecoration(
        color: _fitilaCard,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: _fitilaBorder),
      ),
      child: Column(
        children: [
          Text(
            value,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(
              color: _fitilaInk,
              fontSize: 16,
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            label,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(
              color: _fitilaMuted,
              fontSize: 10,
            ),
          ),
        ],
      ),
    );
  }
}

class _SettingsScreenState extends State<SettingsScreen> {
  String _section = 'Général';
  bool _baribaFirst = false;
  bool _offline = true;
  bool _audio = true;
  bool _push = true;
  bool _largeTouch = false;
  bool _visualSecurity = true;
  bool _analytics = false;
  bool _adminMode = false;

  Widget _settingsChip(String value, IconData icon) {
    return ChoiceChip(
      selected: _section == value,
      avatar: Icon(icon, size: 18),
      label: Text(value),
      onSelected: (_) => setState(() => _section = value),
    );
  }

  Widget _settingsBody() {
    return switch (_section) {
      'Sécurité' => _ActionList(
        items: const [
          _ActionItem(
            Icons.lock_rounded,
            'Session et PIN',
            'Verrouillage, biométrie, expiration, refresh token et appareils.',
          ),
          _ActionItem(
            Icons.visibility_rounded,
            'Contrôle visuel',
            'Confirmation avant paiement, publication, suppression et export.',
          ),
          _ActionItem(
            Icons.privacy_tip_rounded,
            'Confidentialité',
            'Données personnelles, historique, blocage et permissions profil.',
          ),
        ],
      ),
      'Offline' => const _FeatureGrid(
        items: [
          (
            Icons.storage_rounded,
            'Stockage local',
            'Dictionnaire, leçons, templates, posts, brouillons et paramètres.',
          ),
          (
            Icons.sync_problem_rounded,
            'File de synchronisation',
            'Réponses classe, médias, contributions, messages et paiements.',
          ),
          (
            Icons.cleaning_services_rounded,
            'Nettoyage cache',
            'Taille, purge sélective, migration et diagnostic.',
          ),
        ],
      ),
      'Notifications' => const _FeatureGrid(
        items: [
          (
            Icons.dynamic_feed_rounded,
            'Fil et messages',
            'Mentions, commentaires, nouveaux posts et messages vocaux.',
          ),
          (
            Icons.school_rounded,
            'Classe',
            'Corrections, notes, devoirs, relances et feedback enseignant.',
          ),
          (
            Icons.warning_rounded,
            'Alertes',
            'SOS, santé, sécurité, sync bloquée et actions sensibles.',
          ),
        ],
      ),
      'Accessibilité' => const _FeatureGrid(
        items: [
          (
            Icons.touch_app_rounded,
            'Ergonomie',
            'Grands boutons, contrastes, densité UI et lecture facile.',
          ),
          (
            Icons.volume_up_rounded,
            'Audio',
            'TTS, STT, lecture automatique, vitesse et mode classe.',
          ),
          (
            Icons.keyboard_alt_rounded,
            'Clavier Bariba',
            'Suggestions, haptique, normalisation et compagnon flottant.',
          ),
        ],
      ),
      'Backend' => _ActionList(
        items: const [
          _ActionItem(
            Icons.api_rounded,
            'Supabase endpoints',
            'Auth, profils, feed, classe, dictionnaire, storage, IA et realtime.',
          ),
          _ActionItem(
            Icons.health_and_safety_rounded,
            'Diagnostic système',
            'Statut services, latence, erreurs, logs et version app.',
          ),
          _ActionItem(
            Icons.admin_panel_settings_rounded,
            'Administration',
            'Modération, audit, imports, exports et outils de maintenance.',
          ),
        ],
      ),
      _ => Column(
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
          _SwitchTile(
            icon: Icons.notifications_rounded,
            title: 'Notifications fil, classe et corrections',
            value: _push,
            onChanged: (value) => setState(() => _push = value),
          ),
          _SwitchTile(
            icon: Icons.touch_app_rounded,
            title: 'Grands contrôles tactiles',
            value: _largeTouch,
            onChanged: (value) => setState(() => _largeTouch = value),
          ),
          _SwitchTile(
            icon: Icons.visibility_rounded,
            title: 'Contrôle visuel avant actions sensibles',
            value: _visualSecurity,
            onChanged: (value) => setState(() => _visualSecurity = value),
          ),
          _SwitchTile(
            icon: Icons.analytics_rounded,
            title: 'Partager diagnostics anonymes',
            value: _analytics,
            onChanged: (value) => setState(() => _analytics = value),
          ),
          _SwitchTile(
            icon: Icons.admin_panel_settings_rounded,
            title: 'Afficher les outils admin',
            value: _adminMode,
            onChanged: (value) => setState(() => _adminMode = value),
          ),
        ],
      ),
    };
  }

  @override
  Widget build(BuildContext context) {
    return _PageFrame(
      title: 'Paramètres',
      subtitle: 'Langue, mode offline, audio, sécurité et session.',
      child: ListView(
        children: [
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              _settingsChip('Général', Icons.tune_rounded),
              _settingsChip('Sécurité', Icons.lock_rounded),
              _settingsChip('Offline', Icons.cloud_off_rounded),
              _settingsChip('Notifications', Icons.notifications_rounded),
              _settingsChip('Accessibilité', Icons.accessibility_new_rounded),
              _settingsChip('Backend', Icons.api_rounded),
            ],
          ),
          const SizedBox(height: 12),
          _settingsBody(),
          const SizedBox(height: 12),
          const _FeatureGrid(
            items: [
              (
                Icons.language_rounded,
                'Langues',
                'Français, Bàátɔ̀nú, affichage prioritaire et clavier.',
              ),
              (
                Icons.storage_rounded,
                'Cache offline',
                'Dictionnaire, leçons, brouillons, posts et file de sync.',
              ),
              (
                Icons.security_rounded,
                'Sécurité',
                'Session, PIN, contrôle visuel, confidentialité et consentement.',
              ),
              (
                Icons.api_rounded,
                'Backend',
                'Endpoints Supabase, realtime, storage, fonctions IA et logs.',
              ),
            ],
          ),
          if (_adminMode) ...[
            const SizedBox(height: 12),
            _ActionList(
              items: const [
                _ActionItem(
                  Icons.health_and_safety_rounded,
                  'Diagnostic système',
                  'Auth, dictionnaire, feed, templates, IA, traduction et classe.',
                ),
                _ActionItem(
                  Icons.sync_problem_rounded,
                  'Queue de synchronisation',
                  'Brouillons, médias, réponses classe et contributions offline.',
                ),
                _ActionItem(
                  Icons.rule_folder_rounded,
                  'Règles de modération',
                  'Signalements, publication, visibilité et validation humaine.',
                ),
              ],
            ),
          ],
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
    return ColoredBox(
      color: _fitilaSurface,
      child: LayoutBuilder(
        builder: (context, constraints) {
          final compact = constraints.maxWidth < 700;
          final scaffold = Scaffold.maybeOf(context);
          final canOpenDrawer = scaffold?.hasDrawer ?? false;
          return Column(
            children: [
              Padding(
                padding: EdgeInsets.fromLTRB(compact ? 18 : 22, 6, compact ? 18 : 22, 14),
                child: Row(
                  children: [
                    _PremiumTopIcon(
                      icon: canOpenDrawer ? Icons.menu_rounded : Icons.arrow_back_rounded,
                      tooltip: canOpenDrawer ? 'Menu' : 'Retour',
                      onPressed: () {
                        if (canOpenDrawer) {
                          scaffold!.openDrawer();
                        } else {
                          Navigator.maybePop(context);
                        }
                      },
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            title,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(
                              color: _fitilaInk,
                              fontFamily: 'serif',
                              fontSize: compact ? 20 : 25,
                              fontWeight: FontWeight.w600,
                              letterSpacing: .2,
                            ),
                          ),
                          const SizedBox(height: 1),
                          Text(
                            subtitle,
                            maxLines: compact ? 1 : 2,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                              color: _fitilaMuted,
                              fontSize: 11.5,
                              height: 1.25,
                            ),
                          ),
                        ],
                      ),
                    ),
                    if (!compact && action != null) ...[
                      const SizedBox(width: 12),
                      action!,
                    ],
                  ],
                ),
              ),
              const _PremiumStripe(),
              if (compact && action != null)
                Padding(
                  padding: const EdgeInsets.fromLTRB(18, 10, 18, 0),
                  child: Align(alignment: Alignment.centerRight, child: action!),
                ),
              Expanded(
                child: Padding(
                  padding: EdgeInsets.fromLTRB(
                    compact ? 18 : 22,
                    compact ? 12 : 16,
                    compact ? 18 : 22,
                    16,
                  ),
                  child: child,
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}

class _PremiumStripe extends StatelessWidget {
  const _PremiumStripe();

  @override
  Widget build(BuildContext context) {
    return const SizedBox(
      height: 4,
      child: Row(
        children: [
          Expanded(child: ColoredBox(color: _fitilaPrimary)),
          Expanded(child: ColoredBox(color: _fitilaClay)),
          Expanded(child: ColoredBox(color: _fitilaSage)),
          Expanded(child: ColoredBox(color: Color(0x14241F2E))),
        ],
      ),
    );
  }
}

class _PremiumTopIcon extends StatelessWidget {
  const _PremiumTopIcon({
    required this.icon,
    required this.tooltip,
    required this.onPressed,
  });

  final IconData icon;
  final String tooltip;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 38,
      height: 38,
      child: IconButton(
        tooltip: tooltip,
        padding: EdgeInsets.zero,
        onPressed: onPressed,
        iconSize: 20,
        icon: Icon(icon),
      ),
    );
  }
}

class _PremiumBottomNav extends StatelessWidget {
  const _PremiumBottomNav({
    required this.selectedIndex,
    required this.onSelected,
  });

  final int selectedIndex;
  final ValueChanged<int> onSelected;

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      top: false,
      minimum: const EdgeInsets.fromLTRB(14, 0, 14, 10),
      child: Container(
        height: 68,
        decoration: BoxDecoration(
          color: _fitilaCard.withValues(alpha: .96),
          borderRadius: BorderRadius.circular(24),
          border: Border.all(color: _fitilaBorder),
          boxShadow: const [
            BoxShadow(
              color: Color(0x29241F2E),
              blurRadius: 28,
              offset: Offset(0, 14),
              spreadRadius: -16,
            ),
          ],
        ),
        child: Row(
          children: [
            Expanded(
              child: _PremiumBottomItem(
                icon: Icons.dynamic_feed_outlined,
                activeIcon: Icons.dynamic_feed_rounded,
                label: 'Fil',
                active: selectedIndex == 0,
                onTap: () => onSelected(0),
              ),
            ),
            Expanded(
              child: _PremiumBottomItem(
                icon: Icons.menu_book_outlined,
                activeIcon: Icons.menu_book_rounded,
                label: 'Dico',
                active: selectedIndex == 1,
                onTap: () => onSelected(1),
              ),
            ),
            Expanded(
              child: Transform.translate(
                offset: const Offset(0, -14),
                child: Semantics(
                  button: true,
                  label: 'IA Fitila',
                  child: InkWell(
                    customBorder: const CircleBorder(),
                    onTap: () => onSelected(2),
                    child: Container(
                      width: 52,
                      height: 52,
                      margin: const EdgeInsets.symmetric(horizontal: 8),
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        gradient: const LinearGradient(
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                          colors: [_fitilaPrimary, Color(0xFFA6721F)],
                        ),
                        boxShadow: const [
                          BoxShadow(
                            color: Color(0x739C6B1D),
                            blurRadius: 22,
                            offset: Offset(0, 12),
                            spreadRadius: -8,
                          ),
                        ],
                        border: selectedIndex == 2
                            ? Border.all(color: _fitilaGoldDeep, width: 2)
                            : null,
                      ),
                      child: const Icon(
                        Icons.auto_awesome_rounded,
                        color: Color(0xFF2B2110),
                        size: 24,
                      ),
                    ),
                  ),
                ),
              ),
            ),
            Expanded(
              child: _PremiumBottomItem(
                icon: Icons.school_outlined,
                activeIcon: Icons.school_rounded,
                label: 'Apprendre',
                active: selectedIndex == 3,
                onTap: () => onSelected(3),
              ),
            ),
            Expanded(
              child: _PremiumBottomItem(
                icon: Icons.person_outline_rounded,
                activeIcon: Icons.person_rounded,
                label: 'Profil',
                active: selectedIndex == 4,
                onTap: () => onSelected(4),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _PremiumBottomItem extends StatelessWidget {
  const _PremiumBottomItem({
    required this.icon,
    required this.activeIcon,
    required this.label,
    required this.active,
    required this.onTap,
  });

  final IconData icon;
  final IconData activeIcon;
  final String label;
  final bool active;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final color = active ? _fitilaGoldDeep : _fitilaMuted;
    return InkWell(
      borderRadius: BorderRadius.circular(18),
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 2),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(active ? activeIcon : icon, color: color, size: 22),
            const SizedBox(height: 3),
            Text(
              label,
              maxLines: 1,
              overflow: TextOverflow.fade,
              style: TextStyle(
                color: color,
                fontSize: 10,
                fontWeight: FontWeight.w700,
              ),
            ),
          ],
        ),
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
  bool _likeBusy = false;
  late final audio.AudioPlayer _audioPlayer;
  VideoPlayerController? _videoController;
  Future<void>? _videoReady;
  bool _audioPlaying = false;

  @override
  void initState() {
    super.initState();
    _audioPlayer = audio.AudioPlayer();
    final url = widget.post.mediaUrl;
    if (widget.post.backendSource == 'video' && url != null && url.isNotEmpty) {
      _videoController = VideoPlayerController.networkUrl(Uri.parse(url));
      _videoReady = _videoController!.initialize();
    }
    _audioPlayer.onPlayerComplete.listen((_) {
      if (mounted) setState(() => _audioPlaying = false);
    });
  }

  @override
  void dispose() {
    _videoController?.dispose();
    _audioPlayer.dispose();
    super.dispose();
  }

  Future<void> _toggleLike() async {
    if (_likeBusy) return;
    final next = !_liked;
    setState(() {
      _likeBusy = true;
      _liked = next;
      widget.post.likes += next ? 1 : -1;
    });
    try {
      if (widget.post.persisted &&
          widget.post.backendSource == 'post' &&
          widget.post.id != null) {
        await FitilaBackend.togglePostLike(
          postId: widget.post.id!,
          liked: next,
        );
      }
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _liked = !next;
        widget.post.likes += next ? -1 : 1;
      });
    } finally {
      if (mounted) setState(() => _likeBusy = false);
    }
  }

  Future<void> _toggleAudio() async {
    final url = widget.post.mediaUrl;
    if (url == null || url.isEmpty) return;
    if (_audioPlaying) {
      await _audioPlayer.pause();
    } else {
      await _audioPlayer.play(audio.UrlSource(url));
    }
    if (mounted) setState(() => _audioPlaying = !_audioPlaying);
  }

  Widget _mediaPreview(FeedPost post) {
    final url = post.mediaUrl;
    if (url == null || url.isEmpty) return const SizedBox.shrink();
    if (post.kind == 'photo') {
      return ClipRRect(
        borderRadius: BorderRadius.circular(12),
        child: Image.network(
          url,
          width: double.infinity,
          height: 260,
          fit: BoxFit.cover,
          errorBuilder: (_, _, _) => const SizedBox.shrink(),
        ),
      );
    }
    if (post.backendSource == 'video' ||
        post.kind == 'vidéo' ||
        post.kind == 'video') {
      final controller = _videoController;
      if (controller == null) return const SizedBox.shrink();
      return FutureBuilder<void>(
        future: _videoReady,
        builder: (context, snapshot) {
          if (snapshot.connectionState != ConnectionState.done) {
            return const AspectRatio(
              aspectRatio: 9 / 16,
              child: Center(child: CircularProgressIndicator()),
            );
          }
          return GestureDetector(
            onTap: () => setState(() {
              controller.value.isPlaying
                  ? controller.pause()
                  : controller.play();
            }),
            child: AspectRatio(
              aspectRatio: controller.value.aspectRatio == 0
                  ? 9 / 16
                  : controller.value.aspectRatio,
              child: Stack(
                fit: StackFit.expand,
                children: [
                  VideoPlayer(controller),
                  if (!controller.value.isPlaying)
                    const Center(
                      child: CircleAvatar(
                        radius: 28,
                        child: Icon(Icons.play_arrow_rounded, size: 36),
                      ),
                    ),
                ],
              ),
            ),
          );
        },
      );
    }
    if (post.kind == 'audio') {
      return FilledButton.tonalIcon(
        onPressed: _toggleAudio,
        icon: Icon(
          _audioPlaying ? Icons.pause_rounded : Icons.play_arrow_rounded,
        ),
        label: Text(_audioPlaying ? 'Pause' : 'Écouter'),
      );
    }
    return const SizedBox.shrink();
  }

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
            _mediaPreview(post),
            if (post.mediaUrl != null) const SizedBox(height: 12),
            ConstrainedBox(
              constraints: const BoxConstraints(minHeight: 108),
              child: Container(
                width: double.infinity,
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: post.accent.withValues(alpha: 0.09),
                  borderRadius: BorderRadius.circular(16),
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
                  onPressed: _likeBusy ? null : _toggleLike,
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
  const _CreatePostSheet({required this.onPostCreated, this.onPersistPost});

  final ValueChanged<FeedPost> onPostCreated;
  final Future<FeedPost?> Function(FeedPost draft)? onPersistPost;

  @override
  State<_CreatePostSheet> createState() => _CreatePostSheetState();
}

class _CreatePostSheetState extends State<_CreatePostSheet> {
  final _mediaController = FitilaMediaController();
  final _title = TextEditingController();
  final _text = TextEditingController();
  final _prompt = TextEditingController();
  final _tags = TextEditingController(text: 'bariba, fitila');
  String _kind = 'texte';
  String _visibility = 'Public';
  String _template = 'Annonce village';
  bool _publishNow = true;
  bool _allowComments = true;
  bool _busy = false;
  bool _recording = false;
  FitilaMediaAsset? _media;

  @override
  void dispose() {
    _title.dispose();
    _text.dispose();
    _prompt.dispose();
    _tags.dispose();
    _mediaController.dispose();
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

  Future<void> _generateWithIa() async {
    final prompt = _prompt.text.trim().isEmpty
        ? 'Annonce communautaire en Bariba avec traduction francaise'
        : _prompt.text.trim();
    setState(() => _busy = true);
    try {
      final generated = await FitilaBackend.askFitilaIa(prompt);
      if (!mounted) return;
      setState(() {
        _kind = 'ia';
        _title.text = 'Publication Fitila IA';
        _text.text = generated;
        _tags.text = 'ia, bariba, communaute';
      });
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('La génération IA a échoué.')),
      );
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _pickMedia(ImageSource source) async {
    try {
      final picked = _kind == 'photo'
          ? await _mediaController.pickImage(source)
          : await _mediaController.pickVideo(source);
      if (picked != null && mounted) setState(() => _media = picked);
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Le média ne peut pas être ouvert.')),
      );
    }
  }

  Future<void> _toggleAudioRecording() async {
    try {
      if (_recording) {
        final recorded = await _mediaController.stopAudio();
        if (!mounted) return;
        setState(() {
          _recording = false;
          _media = recorded;
        });
      } else {
        await _mediaController.startAudio();
        if (mounted) setState(() => _recording = true);
      }
    } catch (error) {
      if (!mounted) return;
      setState(() => _recording = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(error.toString().replaceFirst('Bad state: ', '')),
        ),
      );
    }
  }

  Future<void> _publish() async {
    final title = _title.text.trim();
    final body = _text.text.trim();
    if (title.isEmpty && body.isEmpty || _busy) return;
    if (_publishNow &&
        (_kind == 'audio' || _kind == 'vidéo' || _kind == 'photo') &&
        _media == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text(
            'Sélectionnez ou enregistrez le média avant de publier.',
          ),
        ),
      );
      return;
    }
    final content = [
      if (title.isNotEmpty) title,
      if (body.isNotEmpty) body,
    ].join('\n\n');
    final draft = FeedPost(
      author: 'Utilisateur Fitila',
      kind: _kind,
      content: content,
      accent: _kindAccent,
      visibility: _visibility,
      tags: _tagList,
      template: _template,
      mediaStatus: _publishNow ? _mediaStatus : 'Brouillon local',
      aiAssisted: _prompt.text.trim().isNotEmpty || _kind == 'ia',
      allowComments: _allowComments,
      localMedia: _media,
    );
    setState(() => _busy = true);
    try {
      final post = _publishNow && widget.onPersistPost != null
          ? await widget.onPersistPost!(draft)
          : draft;
      if (!mounted || post == null) return;
      widget.onPostCreated(post);
      Navigator.pop(context);
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text(
            'La publication a échoué. Aucun contenu n’a été envoyé.',
          ),
        ),
      );
    } finally {
      if (mounted) setState(() => _busy = false);
    }
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
                onPressed: _busy ? null : _generateWithIa,
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
              _kindChip('photo', Icons.photo_camera_rounded, 'Photo'),
              _kindChip('template', Icons.movie_filter_rounded, 'Template'),
              _kindChip('ia', Icons.auto_awesome_rounded, 'IA'),
            ],
          ),
          if (_kind == 'audio' || _kind == 'vidéo' || _kind == 'photo') ...[
            const SizedBox(height: 12),
            if (_kind == 'audio')
              FilledButton.tonalIcon(
                onPressed: _busy ? null : _toggleAudioRecording,
                icon: Icon(_recording ? Icons.stop_rounded : Icons.mic_rounded),
                label: Text(
                  _recording ? 'Arrêter l’enregistrement' : 'Enregistrer',
                ),
              )
            else
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  FilledButton.tonalIcon(
                    onPressed: _busy
                        ? null
                        : () => _pickMedia(ImageSource.camera),
                    icon: const Icon(Icons.camera_alt_rounded),
                    label: const Text('Caméra'),
                  ),
                  OutlinedButton.icon(
                    onPressed: _busy
                        ? null
                        : () => _pickMedia(ImageSource.gallery),
                    icon: const Icon(Icons.photo_library_rounded),
                    label: const Text('Galerie'),
                  ),
                ],
              ),
            if (_media != null) ...[
              const SizedBox(height: 8),
              ListTile(
                tileColor: _fitilaPrimarySoft,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                ),
                leading: const Icon(Icons.check_circle_rounded),
                title: Text(_media!.name),
                subtitle: Text(_media!.contentType),
                trailing: IconButton(
                  tooltip: 'Retirer',
                  onPressed: () => setState(() => _media = null),
                  icon: const Icon(Icons.close_rounded),
                ),
              ),
            ],
          ],
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
              for (final template in _fitilaTemplates.take(20))
                ChoiceChip(
                  selected: _template == template.name,
                  avatar: Icon(template.icon, size: 18),
                  label: Text(template.name),
                  onSelected: (_) => setState(() => _template = template.name),
                ),
              ChoiceChip(
                selected: _template == 'Publication libre',
                avatar: const Icon(Icons.edit_note_rounded, size: 18),
                label: const Text('Publication libre'),
                onSelected: (_) =>
                    setState(() => _template = 'Publication libre'),
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
            onPressed: _busy ? null : _publish,
            icon: _busy
                ? const SizedBox.square(
                    dimension: 18,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : Icon(
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
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: _fitilaCard,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(
          color: readOnly ? _fitilaPrimary : _fitilaBorder,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title.toUpperCase(),
            style: const TextStyle(
              color: _fitilaGoldDeep,
              fontSize: 11,
              fontWeight: FontWeight.w800,
              letterSpacing: .3,
            ),
          ),
          const SizedBox(height: 6),
          TextField(
            controller: controller,
            readOnly: readOnly,
            maxLines: maxLines,
            style: const TextStyle(
              color: _fitilaInkSoft,
              fontSize: 14.5,
              height: 1.5,
            ),
            decoration: InputDecoration(
              hintText: hint,
              fillColor: Colors.transparent,
              contentPadding: EdgeInsets.zero,
              border: InputBorder.none,
              enabledBorder: InputBorder.none,
              focusedBorder: InputBorder.none,
            ),
          ),
        ],
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
        borderRadius: BorderRadius.circular(16),
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
  bool _voiceAnswer = false;
  String _confidence = 'Compris';
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
                    borderRadius: BorderRadius.circular(16),
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
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  for (final confidence in const [
                    'Compris',
                    'À revoir',
                    'Besoin aide',
                  ])
                    ChoiceChip(
                      selected: _confidence == confidence,
                      avatar: Icon(switch (confidence) {
                        'Compris' => Icons.check_circle_rounded,
                        'À revoir' => Icons.replay_rounded,
                        _ => Icons.support_agent_rounded,
                      }, size: 18),
                      label: Text(confidence),
                      onSelected: (_) =>
                          setState(() => _confidence = confidence),
                    ),
                  FilterChip(
                    selected: _voiceAnswer,
                    avatar: const Icon(Icons.mic_rounded),
                    label: const Text('Audio joint'),
                    onSelected: (value) => setState(() => _voiceAnswer = value),
                  ),
                ],
              ),
              const SizedBox(height: 10),
              const _InfoBox(
                title: 'Pré-correction',
                text:
                    'Réponse prête pour diff automatique, corrigé attendu, score, commentaire enseignant et synchronisation classe_student_answers.',
              ),
              const SizedBox(height: 10),
              Row(
                children: [
                  OutlinedButton.icon(
                    onPressed: () => setState(() => _voiceAnswer = true),
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
    return Container(
      padding: const EdgeInsets.fromLTRB(10, 10, 10, 14),
      decoration: BoxDecoration(
        color: _fitilaSurfaceAlt,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: _fitilaBorder),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Padding(
            padding: EdgeInsets.fromLTRB(6, 0, 6, 8),
            child: Text(
              'Clavier Bàátɔ̀nú natif',
              style: TextStyle(
                color: _fitilaGoldDeep,
                fontSize: 11,
                fontWeight: FontWeight.w800,
                letterSpacing: .4,
              ),
            ),
          ),
          Wrap(
            spacing: 5,
            runSpacing: 6,
            children: [
              for (final letter in _baribaLetters)
                SizedBox(
                  width: 42,
                  height: 38,
                  child: Material(
                    color: _fitilaCard,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(8),
                      side: const BorderSide(color: _fitilaBorder),
                    ),
                    child: InkWell(
                      borderRadius: BorderRadius.circular(8),
                      onTap: () => onInsert(letter),
                      child: Center(
                        child: Text(
                          letter,
                          style: const TextStyle(
                            color: _fitilaGoldDeep,
                            fontSize: 15,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
            ],
          ),
        ],
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
        final compact = constraints.maxWidth < 620;
        return GridView.builder(
          itemCount: items.length,
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          gridDelegate: SliverGridDelegateWithMaxCrossAxisExtent(
            maxCrossAxisExtent: compact ? 180 : 260,
            mainAxisExtent: compact ? 132 : 142,
            crossAxisSpacing: 12,
            mainAxisSpacing: 12,
          ),
          itemBuilder: (context, index) {
            final item = items[index];
            return Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: _fitilaCard,
                borderRadius: BorderRadius.circular(18),
                border: Border.all(color: _fitilaBorder),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Icon(item.$1, color: _fitilaGoldDeep, size: 22),
                  const Spacer(),
                  Text(
                    item.$2,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      color: _fitilaInk,
                      fontSize: 13,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(height: 3),
                  Text(
                    item.$3,
                    maxLines: compact ? 2 : 3,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      color: _fitilaMuted,
                      fontSize: 10.5,
                      height: 1.25,
                    ),
                  ),
                ],
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
            child: Material(
              color: _fitilaCard,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(18),
                side: const BorderSide(color: _fitilaBorder),
              ),
              child: ListTile(
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(18),
                ),
                contentPadding: const EdgeInsets.symmetric(
                  horizontal: 14,
                  vertical: 5,
                ),
                leading: Container(
                  width: 40,
                  height: 40,
                  decoration: BoxDecoration(
                    color: _fitilaSurfaceAlt,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Icon(item.icon, color: _fitilaGoldDeep, size: 19),
                ),
                title: Text(
                  item.title,
                  style: const TextStyle(
                    color: _fitilaInk,
                    fontSize: 13.5,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                subtitle: Text(
                  item.subtitle,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    color: _fitilaMuted,
                    fontSize: 11,
                  ),
                ),
                trailing: const Icon(
                  Icons.chevron_right_rounded,
                  color: _fitilaMuted,
                ),
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
        final compact = constraints.maxWidth < 620;
        final columns = compact
            ? (metrics.length > 3 ? 3 : metrics.length)
            : (metrics.length > 4 ? 4 : metrics.length);
        return GridView.builder(
          itemCount: metrics.length,
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: columns,
            mainAxisExtent: compact ? 82 : 96,
            crossAxisSpacing: 10,
            mainAxisSpacing: 10,
          ),
          itemBuilder: (context, index) {
            final metric = metrics[index];
            return Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 10),
              decoration: BoxDecoration(
                color: _fitilaCard,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: _fitilaBorder),
              ),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    metric.$2,
                    maxLines: 1,
                    style: const TextStyle(
                      color: _fitilaInk,
                      fontSize: 16,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  const SizedBox(height: 3),
                  Text(
                    metric.$1,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    textAlign: TextAlign.center,
                    style: const TextStyle(color: _fitilaMuted, fontSize: 10),
                  ),
                ],
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
      padding: const EdgeInsets.fromLTRB(18, 12, 18, 2),
      child: Row(
        children: [
          Expanded(
            child: SearchBar(
              hintText: 'Recherche globale: dictionnaire, classe, posts...',
              leading: const Icon(Icons.search_rounded, color: _fitilaMuted),
            ),
          ),
          const SizedBox(width: 10),
          _PremiumTopIcon(
            icon: Icons.notifications_none_rounded,
            tooltip: 'Notifications',
            onPressed: () {},
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
        color: _fitilaSurfaceAlt,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: _fitilaBorder),
      ),
      child: Row(
        children: [
          CircleAvatar(
            backgroundColor: _fitilaPrimary,
            foregroundColor: const Color(0xFF2B2110),
            child: Text(
              session.displayName.characters.first,
              style: const TextStyle(fontWeight: FontWeight.w800),
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
                    color: _fitilaInk,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                Text(
                  session.role,
                  style: const TextStyle(color: _fitilaMuted, fontSize: 11),
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
      padding: const EdgeInsets.only(bottom: 3),
      child: ListTile(
        dense: true,
        visualDensity: VisualDensity.compact,
        selected: selected,
        onTap: onTap,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        selectedTileColor: _fitilaSurfaceAlt,
        leading: Icon(
          page.icon,
          size: 19,
          color: _fitilaGoldDeep,
        ),
        title: Text(
          page.title,
          style: TextStyle(
            color: _fitilaInk,
            fontSize: 13.5,
            fontWeight: selected ? FontWeight.w800 : FontWeight.w600,
          ),
        ),
        subtitle: selected
            ? Text(
                page.description,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(color: _fitilaMuted, fontSize: 10.5),
              )
            : null,
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
        mainAxisExtent: 88,
        crossAxisSpacing: 8,
        mainAxisSpacing: 8,
      ),
      itemBuilder: (context, index) {
        final page = pages[index];
        final active = page == selected;
        return InkWell(
          borderRadius: BorderRadius.circular(12),
          onTap: () => onSelected(page),
          child: Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: active ? _fitilaPrimarySoft : _fitilaSurfaceAlt,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: active ? _fitilaPrimary : _fitilaBorder,
              ),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Icon(
                  page.icon,
                  size: 19,
                  color: active ? _fitilaGoldDeep : _fitilaMuted,
                ),
                const Spacer(),
                Text(
                  page.title,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    color: _fitilaInk,
                    fontSize: 11.5,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                Text(
                  page.description,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(color: _fitilaMuted, fontSize: 9.5),
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
      padding: const EdgeInsets.fromLTRB(6, 16, 6, 5),
      child: Text(
        text,
        style: const TextStyle(
          color: _fitilaMuted,
          fontSize: 10.5,
          fontWeight: FontWeight.w800,
          letterSpacing: .4,
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
        color: _fitilaSurfaceAlt,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: _fitilaBorder),
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
        color: _fitilaSurfaceAlt,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: _fitilaBorder),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, color: _fitilaGoldDeep, size: 16),
          const SizedBox(width: 6),
          Flexible(
            child: Text(
              label,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(
                color: _fitilaInk,
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
    return Column(
      children: [
        Material(
          color: Colors.transparent,
          child: SwitchListTile(
            contentPadding: const EdgeInsets.symmetric(
              horizontal: 4,
              vertical: 2,
            ),
            value: value,
            onChanged: onChanged,
            secondary: Icon(icon, color: _fitilaGoldDeep, size: 19),
            title: Text(
              title,
              style: const TextStyle(
                color: _fitilaInk,
                fontSize: 13.5,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ),
        const Divider(),
      ],
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
        borderRadius: BorderRadius.circular(16),
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
    id: 'griot-anime',
    name: 'Griot Animé IA',
    baribaName: 'Kɔ̀gbɛ́ Táárù IA',
    category: 'storytelling',
    summary: 'Conte animé premium avec scènes IA, voix, images et narration.',
    duration: 60,
    icon: Icons.theater_comedy_rounded,
    accent: Color(0xFF8B5CF6),
    premium: true,
    newBadge: true,
    capabilities: ['storyboard', 'image IA', 'voix', 'sous-titres'],
    tags: ['premium', 'conte', 'anime', 'griot'],
  ),
  FitilaTemplateData(
    id: 'beat-maker-ai',
    name: 'Beat Maker AI',
    baribaName: 'Wùúsú Koru IA',
    category: 'music',
    summary: 'Studio beat afro, amapiano et coupé-décalé avec IA musicale.',
    duration: 90,
    icon: Icons.piano_rounded,
    accent: Color(0xFFEC4899),
    premium: true,
    newBadge: true,
    capabilities: ['beat', 'mix', 'trim', 'export audio'],
    tags: ['premium', 'music', 'daw', 'afrobeat'],
  ),
  FitilaTemplateData(
    id: 'village-chronicle',
    name: 'Village Chronicle',
    baribaName: 'Tɔ̀bù Nɔɔ',
    category: 'storytelling',
    summary: 'Journal vidéo village, script, séquences et rendu reportage.',
    duration: 75,
    icon: Icons.live_tv_rounded,
    accent: Color(0xFF0EA5E9),
    premium: true,
    newBadge: true,
    capabilities: ['script', 'chapitres', 'reportage', 'source'],
    tags: ['premium', 'chronique', 'village'],
  ),
  FitilaTemplateData(
    id: 'griot-digital',
    name: 'Griot Digital',
    baribaName: 'Gando yɔyɔ',
    category: 'storytelling',
    summary: 'Récit patrimonial avec voix, sous-titres et rythme local.',
    duration: 30,
    icon: Icons.history_edu_rounded,
    accent: Color(0xFF8B5CF6),
    premium: true,
    capabilities: ['voix', 'captions', 'archive'],
    tags: ['patrimoine', 'griot'],
  ),
  FitilaTemplateData(
    id: 'beat-sync-ultra',
    name: 'Beat Sync Ultra',
    baribaName: 'Wùúsú Sínkì',
    category: 'music',
    summary: 'Synchronisation cuts, transitions et overlays sur le beat.',
    duration: 35,
    icon: Icons.graphic_eq_rounded,
    accent: Color(0xFF06B6D4),
    capabilities: ['beat sync', 'cuts', 'transitions'],
    tags: ['music', 'sync'],
  ),
  FitilaTemplateData(
    id: 'style-cinema-local',
    name: 'Style Cinéma Local',
    baribaName: 'Sinema tɔ̀bù',
    category: 'future',
    summary: 'Color grading, titres cinéma et ambiance locale premium.',
    duration: 45,
    icon: Icons.local_movies_rounded,
    accent: Color(0xFFF97316),
    premium: true,
    capabilities: ['grading', 'titres', 'motion'],
    tags: ['cinema', 'style'],
  ),
  FitilaTemplateData(
    id: 'one-take-pro',
    name: 'One Take Pro',
    baribaName: 'Kpa kan',
    category: 'business',
    summary: 'Pitch rapide en une prise, prompteur et correction IA.',
    duration: 30,
    icon: Icons.video_camera_front_rounded,
    accent: Color(0xFF22C55E),
    capabilities: ['prompteur', 'pitch', 'correction'],
    tags: ['business', 'one-take'],
  ),
  FitilaTemplateData(
    id: 'quick-story',
    name: 'Quick Story',
    baribaName: 'Tári fíí',
    category: 'future',
    summary: 'Story rapide avec hook, scènes, stickers et CTA.',
    duration: 15,
    icon: Icons.flash_on_rounded,
    accent: Color(0xFFFACC15),
    newBadge: true,
    capabilities: ['hook', 'sticker', 'cta'],
    tags: ['rapide', 'story'],
  ),
  FitilaTemplateData(
    id: 'magic-transform',
    name: 'Magic Transform',
    baribaName: 'Yípadà mágìkì',
    category: 'future',
    summary: 'Transformation IA avant/après, masque et effet magique.',
    duration: 18,
    icon: Icons.auto_fix_high_rounded,
    accent: Color(0xFFA855F7),
    premium: true,
    capabilities: ['masque', 'IA', 'avant-après'],
    tags: ['magic', 'ai'],
  ),
  FitilaTemplateData(
    id: 'smart-captions',
    name: 'Smart Captions',
    baribaName: 'Kpari',
    category: 'education',
    summary: 'Sous-titres automatiques, traduction et emphase karaoke.',
    duration: 25,
    icon: Icons.subtitles_rounded,
    accent: Color(0xFFEC4899),
    capabilities: ['captions', 'traduction', 'karaoke'],
    tags: ['captions', 'bariba'],
  ),
  FitilaTemplateData(
    id: 'multi-format',
    name: 'Multi Format',
    baribaName: 'Fɔ̀ɔmù púpò',
    category: 'business',
    summary: 'Déclinaison 9:16, 1:1, 16:9 et export multi-plateforme.',
    duration: 30,
    icon: Icons.dashboard_customize_rounded,
    accent: Color(0xFF38BDF8),
    capabilities: ['9:16', '1:1', '16:9', 'export'],
    tags: ['export', 'format'],
  ),
  FitilaTemplateData(
    id: 'auto-broll-booster',
    name: 'Auto B-roll Booster',
    baribaName: 'Àwòrán iranwọ́',
    category: 'future',
    summary: 'Ajoute plans de coupe, images, zoom et emphase automatique.',
    duration: 40,
    icon: Icons.movie_creation_rounded,
    accent: Color(0xFF10B981),
    capabilities: ['b-roll', 'zoom', 'IA'],
    tags: ['broll', 'automation'],
  ),
  FitilaTemplateData(
    id: 'voice-clone-hook',
    name: 'Voice Clone Hook',
    baribaName: 'Ohùn hook',
    category: 'business',
    summary: 'Hook vocal, clone de style, intro forte et disclaimer.',
    duration: 20,
    icon: Icons.record_voice_over_rounded,
    accent: Color(0xFF14B8A6),
    premium: true,
    capabilities: ['voice', 'hook', 'consentement'],
    tags: ['voice', 'hook'],
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
    capabilities: ['chapitres', 'sources', 'voix'],
    tags: ['doc', 'village'],
  ),
  FitilaTemplateData(
    id: 'metiers-terroir',
    name: 'Métiers Terroir',
    baribaName: 'Iṣẹ́ ilẹ̀',
    category: 'education',
    summary: 'Présente un métier local avec étapes, mots clés et audio.',
    duration: 45,
    icon: Icons.agriculture_rounded,
    accent: Color(0xFF84CC16),
    capabilities: ['étapes', 'vocabulaire', 'audio'],
    tags: ['metier', 'terroir'],
  ),
  FitilaTemplateData(
    id: 'histoire-vraie',
    name: 'Histoire Vraie',
    baribaName: 'Tári gidi',
    category: 'storytelling',
    summary: 'Témoignage structuré avec intro, émotion, preuve et morale.',
    duration: 50,
    icon: Icons.volunteer_activism_rounded,
    accent: Color(0xFFEF4444),
    capabilities: ['témoignage', 'preuve', 'morale'],
    tags: ['histoire', 'temoignage'],
  ),
  FitilaTemplateData(
    id: 'conte-du-soir',
    name: 'Conte du Soir',
    baribaName: 'Tári alẹ́',
    category: 'storytelling',
    summary: 'Conte doux, ambiance nuit, voix lente et illustrations.',
    duration: 55,
    icon: Icons.nights_stay_rounded,
    accent: Color(0xFF312E81),
    capabilities: ['ambiance', 'illustration', 'voix lente'],
    tags: ['conte', 'soir'],
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
    capabilities: ['interview', 'transcription', 'archive'],
    tags: ['ancien', 'oralite'],
  ),
  FitilaTemplateData(
    id: 'avant-apres-village',
    name: 'Avant Après Village',
    baribaName: 'Ṣáájú lẹ́yìn',
    category: 'storytelling',
    summary: 'Comparaison visuelle avant/après avec split et transitions.',
    duration: 25,
    icon: Icons.compare_rounded,
    accent: Color(0xFF0F766E),
    capabilities: ['split', 'transition', 'comparaison'],
    tags: ['avant-apres', 'village'],
  ),
  FitilaTemplateData(
    id: 'carte-postale-beaute',
    name: 'Carte Postale Beauté',
    baribaName: 'Kaadi ẹwa',
    category: 'storytelling',
    summary: 'Montage beauté lieu/objet/personne avec texte élégant.',
    duration: 22,
    icon: Icons.photo_camera_rounded,
    accent: Color(0xFFF472B6),
    capabilities: ['photo', 'texte', 'slideshow'],
    tags: ['beaute', 'photo'],
  ),
  FitilaTemplateData(
    id: 'lecon-du-jour',
    name: 'Leçon du jour',
    baribaName: 'Karo din',
    category: 'education',
    summary: 'Format classe avec exemple, quiz, répétition et correction.',
    duration: 45,
    icon: Icons.school_rounded,
    accent: Color(0xFF14B8A6),
    capabilities: ['quiz', 'répétition', 'correction'],
    tags: ['classe', 'lesson'],
  ),
  FitilaTemplateData(
    id: 'histoire-en-images',
    name: 'Histoire en Images',
    baribaName: 'Tári nínú àwòrán',
    category: 'education',
    summary: 'Transforme images en récit, légendes et voix off.',
    duration: 35,
    icon: Icons.photo_library_rounded,
    accent: Color(0xFF7C3AED),
    capabilities: ['images', 'légendes', 'voix off'],
    tags: ['image', 'story'],
  ),
  FitilaTemplateData(
    id: 'doc-express-patrimoine',
    name: 'Doc Express Patrimoine',
    baribaName: 'Dokù pẹ̀lú ìtàn',
    category: 'education',
    summary: 'Mini fiche patrimoniale avec sources, dates et citations.',
    duration: 40,
    icon: Icons.account_balance_rounded,
    accent: Color(0xFF92400E),
    capabilities: ['sources', 'dates', 'citations'],
    tags: ['patrimoine', 'doc'],
  ),
  FitilaTemplateData(
    id: 'radio-village',
    name: 'Radio Village',
    baribaName: 'Wuu nɔɔ',
    category: 'business',
    summary:
        'Annonce audio courte, visuel radial et publication communautaire.',
    duration: 20,
    icon: Icons.campaign_rounded,
    accent: _fitilaPrimary,
    newBadge: true,
    capabilities: ['audio', 'radial', 'annonce'],
    tags: ['radio', 'village'],
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
    capabilities: ['date', 'lieu', 'cta'],
    tags: ['annonce', 'social'],
  ),
  FitilaTemplateData(
    id: 'debat-express',
    name: 'Débat Express',
    baribaName: 'Jíròrò fíí',
    category: 'business',
    summary: 'Question, deux arguments, synthèse et appel à réagir.',
    duration: 35,
    icon: Icons.forum_rounded,
    accent: Color(0xFF2563EB),
    capabilities: ['débat', 'arguments', 'commentaires'],
    tags: ['debat', 'discussion'],
  ),
  FitilaTemplateData(
    id: 'traduction-voix',
    name: 'Traduction Voix',
    baribaName: 'Itumọ̀ ohùn',
    category: 'education',
    summary: 'Audio source, transcription, traduction et lecture bilingue.',
    duration: 30,
    icon: Icons.translate_rounded,
    accent: Color(0xFF059669),
    capabilities: ['stt', 'traduction', 'tts'],
    tags: ['voice', 'translate'],
  ),
  FitilaTemplateData(
    id: 'chorale-collective',
    name: 'Chorale Collective',
    baribaName: 'Ẹgbẹ́ orin',
    category: 'music',
    summary: 'Empilement voix, crédits participants et rendu musical.',
    duration: 60,
    icon: Icons.groups_2_rounded,
    accent: Color(0xFFDB2777),
    capabilities: ['multi-voix', 'credits', 'mix'],
    tags: ['chorale', 'music'],
  ),
  FitilaTemplateData(
    id: 'voix-de-famille',
    name: 'Voix de Famille',
    baribaName: 'Ohùn ìdílé',
    category: 'storytelling',
    summary: 'Souvenir familial, voix multiples, photos et archive.',
    duration: 45,
    icon: Icons.family_restroom_rounded,
    accent: Color(0xFFEA580C),
    capabilities: ['photos', 'voix multiples', 'archive'],
    tags: ['famille', 'archive'],
  ),
  FitilaTemplateData(
    id: 'neon-glow',
    name: 'Neon Glow',
    baribaName: 'Imọlẹ neon',
    category: 'future',
    summary: 'Effets néon, contour sujet, glow et motion futuriste.',
    duration: 22,
    icon: Icons.light_mode_rounded,
    accent: Color(0xFF22D3EE),
    capabilities: ['glow', 'mask', 'motion'],
    tags: ['neon', 'effect'],
  ),
  FitilaTemplateData(
    id: 'split-screen-duo',
    name: 'Split Screen Duo',
    baribaName: 'Iboju méjì',
    category: 'music',
    summary: 'Duo côte à côte, réponse, réaction et synchronisation.',
    duration: 30,
    icon: Icons.splitscreen_rounded,
    accent: Color(0xFF6366F1),
    capabilities: ['duo', 'reaction', 'sync'],
    tags: ['duo', 'split'],
  ),
  FitilaTemplateData(
    id: 'photo-slideshow',
    name: 'Photo Slideshow',
    baribaName: 'Àwòrán yíyí',
    category: 'storytelling',
    summary: 'Diaporama photo, transitions, captions et musique.',
    duration: 35,
    icon: Icons.slideshow_rounded,
    accent: Color(0xFF64748B),
    capabilities: ['slideshow', 'transitions', 'music'],
    tags: ['photo', 'slideshow'],
  ),
  FitilaTemplateData(
    id: 'karaoke-mode',
    name: 'Karaoke Mode',
    baribaName: 'Karaoke',
    category: 'music',
    summary: 'Paroles synchronisées, highlights, piste voix et fond musical.',
    duration: 60,
    icon: Icons.lyrics_rounded,
    accent: Color(0xFFE11D48),
    capabilities: ['lyrics', 'sync', 'audio'],
    tags: ['karaoke', 'lyrics'],
  ),
  FitilaTemplateData(
    id: 'ai-portrait-pro',
    name: 'AI Portrait Pro',
    baribaName: 'Àwòrán ènìyàn IA',
    category: 'future',
    summary: 'Portrait IA, détourage, fond dynamique et style premium.',
    duration: 25,
    icon: Icons.portrait_rounded,
    accent: Color(0xFFA855F7),
    premium: true,
    capabilities: ['portrait', 'cutout', 'background'],
    tags: ['portrait', 'ai'],
  ),
  FitilaTemplateData(
    id: 'hologram-effect',
    name: 'Hologram Effect',
    baribaName: 'Hologram',
    category: 'future',
    summary: 'Projection holographique, scanlines et ambiance tech.',
    duration: 20,
    icon: Icons.view_in_ar_rounded,
    accent: Color(0xFF06B6D4),
    capabilities: ['ar', 'scanline', 'effect'],
    tags: ['hologram', 'future'],
  ),
  FitilaTemplateData(
    id: 'glitch-art',
    name: 'Glitch Art',
    baribaName: 'Glitch',
    category: 'future',
    summary: 'Distorsion visuelle, frames rapides et effet digital.',
    duration: 16,
    icon: Icons.blur_on_rounded,
    accent: Color(0xFF7C2D12),
    capabilities: ['glitch', 'frames', 'digital'],
    tags: ['glitch', 'art'],
  ),
  FitilaTemplateData(
    id: 'cyberpunk-vibes',
    name: 'Cyberpunk Vibes',
    baribaName: 'Cyberpunk',
    category: 'future',
    summary: 'Couleurs tech, lumières, texte animé et transitions fortes.',
    duration: 24,
    icon: Icons.electric_bolt_rounded,
    accent: Color(0xFF9333EA),
    capabilities: ['lighting', 'animated text', 'transition'],
    tags: ['cyberpunk', 'vibes'],
  ),
  FitilaTemplateData(
    id: 'matrix-rain',
    name: 'Matrix Rain',
    baribaName: 'Òjò matrix',
    category: 'future',
    summary: 'Pluie de caractères, couche code et transition futuriste.',
    duration: 18,
    icon: Icons.grid_on_rounded,
    accent: Color(0xFF16A34A),
    capabilities: ['code rain', 'overlay', 'transition'],
    tags: ['matrix', 'rain'],
  ),
  FitilaTemplateData(
    id: 'afrobeat-pulse',
    name: 'Afrobeat Pulse',
    baribaName: 'Afrobeat',
    category: 'music',
    summary: 'Pulse musical, couleurs chaudes, beat sync et danse.',
    duration: 30,
    icon: Icons.album_rounded,
    accent: Color(0xFFF97316),
    capabilities: ['pulse', 'beat', 'dance'],
    tags: ['afrobeat', 'pulse'],
  ),
  FitilaTemplateData(
    id: 'dj-mix-visual',
    name: 'DJ Mix Visual',
    baribaName: 'DJ mix',
    category: 'music',
    summary: 'Waveform, equalizer, cover art et transitions audio.',
    duration: 45,
    icon: Icons.equalizer_rounded,
    accent: Color(0xFF0891B2),
    capabilities: ['waveform', 'equalizer', 'cover'],
    tags: ['dj', 'mix'],
  ),
  FitilaTemplateData(
    id: 'dance-challenge',
    name: 'Dance Challenge',
    baribaName: 'Ijó challenge',
    category: 'music',
    summary: 'Challenge danse, compte à rebours, duo et hashtag.',
    duration: 25,
    icon: Icons.directions_run_rounded,
    accent: Color(0xFFF43F5E),
    capabilities: ['countdown', 'duo', 'hashtag'],
    tags: ['dance', 'challenge'],
  ),
  FitilaTemplateData(
    id: 'lyric-video',
    name: 'Lyric Video',
    baribaName: 'Ọ̀rọ̀ orin',
    category: 'music',
    summary: 'Vidéo paroles avec timing, fond animé et export social.',
    duration: 60,
    icon: Icons.queue_music_rounded,
    accent: Color(0xFF4F46E5),
    capabilities: ['lyrics', 'timing', 'background'],
    tags: ['lyric', 'video'],
  ),
  FitilaTemplateData(
    id: 'concert-live',
    name: 'Concert Live',
    baribaName: 'Konser live',
    category: 'music',
    summary: 'Ambiance live, light show, foule, titre et intro artiste.',
    duration: 50,
    icon: Icons.festival_rounded,
    accent: Color(0xFFDC2626),
    capabilities: ['live', 'light show', 'artist intro'],
    tags: ['concert', 'live'],
  ),
  FitilaTemplateData(
    id: 'tem-ia-foncier',
    name: 'Tem-IA Foncier',
    baribaName: 'Tem-IA',
    category: 'education',
    summary: 'Explication juridique simple avec résumé bilingue et citations.',
    duration: 35,
    icon: Icons.gavel_rounded,
    accent: Color(0xFF22C55E),
    premium: true,
    capabilities: ['sources', 'résumé', 'citations'],
    tags: ['tem-ia', 'foncier'],
  ),
];
