// ignore_for_file: unused_element

import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_tts/flutter_tts.dart';
import 'package:flutter/services.dart';
import 'package:file_picker/file_picker.dart';
import 'package:http/http.dart' as http;
import 'package:image_picker/image_picker.dart';
import 'package:audioplayers/audioplayers.dart' as audio;
import 'package:path_provider/path_provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:video_player/video_player.dart';

import 'core/fitila_backend.dart';
import 'core/fitila_live.dart';
import 'core/fitila_media.dart';
import 'core/foncier_rag.dart';
import 'core/signature_theme.dart';
import 'core/web_parity_models.dart';
import 'ui/reference_creation_ui.dart';

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
// Écrans sombres "IA" (orbe micro, ondes, anneaux de score) — mêmes teintes
// que la maquette premium jointe, pour une continuité visuelle exacte.
const _fitilaDark1 = Color(0xFF1B1730);
const _fitilaDark2 = Color(0xFF241F2E);
const _fitilaDark3 = Color(0xFF332A4D);
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
      if (mounted) {
        setState(() => _loading = false);
      }
      return;
    }
    try {
      final restored = await FitilaBackend.restoreSession();
      if (!mounted) {
        return;
      }
      setState(() {
        _session = restored == null
            ? null
            : FitilaSession.fromBackend(restored);
        _loading = false;
      });
    } catch (_) {
      if (mounted) {
        setState(() => _loading = false);
      }
    }
  }

  Future<void> _signOut() async {
    await FitilaBackend.signOut();
    if (mounted) {
      setState(() => _session = null);
    }
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
    this.authorId,
    this.authorAvatarUrl,
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
  final String? authorId;
  final String? authorAvatarUrl;

  /// Fonctionnalité de création dont ce post est issu (déduite des
  /// hashtags réels apposés à la publication), pour l'habillage visuel
  /// du fil immersif — jamais stockée, toujours recalculée.
  FitilaFeedCategory get category => _categoryFromTags(tags);

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
      authorId: row['user_id']?.toString(),
      authorAvatarUrl: profile?['avatar_url']?.toString(),
    );
  }
}

/// Les six fonctionnalités de création IA, telles qu'exposées dans le
/// fil (identité visuelle reprise à l'identique de la grille de
/// création : mêmes émoji et dégradés que _CreationIaTile).
enum FitilaFeedCategory {
  echoSonn,
  liveGriotIa,
  sagesseBattle,
  aburuFimIa,
  sasaraIa,
  handuniaWasa,
  general,
}

class _FeedCategoryStyle {
  const _FeedCategoryStyle({
    required this.label,
    required this.emoji,
    required this.colorA,
    required this.colorB,
  });

  final String label;
  final String emoji;
  final Color colorA;
  final Color colorB;

  Gradient get gradient => LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [colorA, colorB],
  );
}

const Map<FitilaFeedCategory, _FeedCategoryStyle> _feedCategoryStyles = {
  FitilaFeedCategory.echoSonn: _FeedCategoryStyle(
    label: 'Echo Sɔ̃ɔ',
    emoji: '📡',
    colorA: Color(0xFFC99530),
    colorB: Color(0xFF9C6B1D),
  ),
  FitilaFeedCategory.liveGriotIa: _FeedCategoryStyle(
    label: 'Live Griot IA',
    emoji: '🎙️',
    colorA: Color(0xFF6758C9),
    colorB: Color(0xFF4A3B96),
  ),
  FitilaFeedCategory.sagesseBattle: _FeedCategoryStyle(
    label: 'Sagesse Battle',
    emoji: '⚔️',
    colorA: Color(0xFF9C6B1D),
    colorB: Color(0xFFB54E33),
  ),
  FitilaFeedCategory.aburuFimIa: _FeedCategoryStyle(
    label: 'Aburu Fim IA',
    emoji: '🛍️',
    colorA: Color(0xFF3F6E52),
    colorB: Color(0xFF2C4E3A),
  ),
  FitilaFeedCategory.sasaraIa: _FeedCategoryStyle(
    label: 'Sasara IA',
    emoji: '🌉',
    colorA: Color(0xFF241F2E),
    colorB: Color(0xFF3A3448),
  ),
  FitilaFeedCategory.handuniaWasa: _FeedCategoryStyle(
    label: 'Handunia Wasa',
    emoji: '🌌',
    colorA: Color(0xFF4A3B78),
    colorB: Color(0xFF14111C),
  ),
  FitilaFeedCategory.general: _FeedCategoryStyle(
    label: 'Fil Fitila',
    emoji: '✨',
    colorA: Color(0xFFC99530),
    colorB: Color(0xFF241F2E),
  ),
};

FitilaFeedCategory _categoryFromTags(List<String> tags) {
  final lower = tags.map((tag) => tag.toLowerCase()).toList(growable: false);
  bool has(String needle) => lower.any((tag) => tag.contains(needle));
  if (has('echo-sonn')) {
    return FitilaFeedCategory.echoSonn;
  }
  if (has('live-griot-ia')) {
    return FitilaFeedCategory.liveGriotIa;
  }
  if (has('sagesse-battle')) {
    return FitilaFeedCategory.sagesseBattle;
  }
  if (has('aburu-fim')) {
    return FitilaFeedCategory.aburuFimIa;
  }
  if (has('sasara-ia')) {
    return FitilaFeedCategory.sasaraIa;
  }
  if (has('handunia-wasa')) {
    return FitilaFeedCategory.handuniaWasa;
  }
  return FitilaFeedCategory.general;
}

/// Formate un compteur pour l'affichage compact du rail d'actions
/// (1 234 → "1,2 k", 15 000 000 → "15 M").
String _formatFeedCount(int value) {
  if (value < 1000) {
    return '$value';
  }
  if (value < 1000000) {
    final k = value / 1000;
    return '${k.toStringAsFixed(k < 10 ? 1 : 0)} k';
  }
  final m = value / 1000000;
  return '${m.toStringAsFixed(m < 10 ? 1 : 0)} M';
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
    if (trimmed.isEmpty) {
      return '';
    }

    // Authenticated remote chain:
    // 1. ai-translate (Lovable/Gemini when configured)
    // 2. byt5-bariba-translate (FITILA Bariba model)
    // 3. embedded dictionary exact match below.
    if (accessToken != null && accessToken.isNotEmpty) {
      final transport = client ?? http.Client();
      final body = jsonEncode({
        'text': trimmed,
        'sourceLang': direction == TranslationDirection.frenchToBariba
            ? 'french'
            : 'bariba',
        'targetLang': direction == TranslationDirection.frenchToBariba
            ? 'bariba'
            : 'french',
      });
      final headers = <String, String>{
        'content-type': 'application/json',
        'Authorization': 'Bearer $accessToken',
        if (FitilaBackend.supabaseAnonKey.isNotEmpty)
          'apikey': FitilaBackend.supabaseAnonKey,
      };
      try {
        for (final endpoint in const [
          'ai-translate',
          'byt5-bariba-translate',
        ]) {
          try {
            final timeout = endpoint == 'ai-translate'
                ? const Duration(seconds: 8)
                : const Duration(seconds: 55);
            final response = await transport
                .post(
                  Uri.parse('$_supabaseUrl/functions/v1/$endpoint'),
                  headers: headers,
                  body: body,
                )
                .timeout(timeout);
            if (response.statusCode < 200 || response.statusCode >= 300) {
              continue;
            }
            final decoded = jsonDecode(response.body);
            if (decoded is Map && decoded['translation'] is String) {
              final translated = (decoded['translation'] as String).trim();
              if (translated.isNotEmpty) {
                return translated;
              }
            }
          } catch (_) {
            // Continue to the next real translation engine.
          }
        }
      } finally {
        if (client == null) {
          transport.close();
        }
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
      'Aucune traduction disponible. Vérifiez la connexion puis réessayez.',
    );
  }

  static Future<LearningBank> loadLearningBank() async {
    final raw = await rootBundle.loadString(
      'assets/data/learning_exercises.json',
    );
    final data = jsonDecode(raw) as Map<String, dynamic>;
    final themes = (data['themes'] as List)
        .cast<Map<String, dynamic>>()
        .map(LearningTheme.fromJson)
        .toList(growable: false);
    final exercisesRaw = (data['exercises'] as Map).cast<String, dynamic>();
    final exercises = <String, List<LearningExerciseItem>>{
      for (final entry in exercisesRaw.entries)
        entry.key: (entry.value as List)
            .cast<Map<String, dynamic>>()
            .map(LearningExerciseItem.fromJson)
            .toList(growable: false),
    };
    return LearningBank(themes: themes, exercises: exercises);
  }
}

class LearningTheme {
  const LearningTheme({
    required this.id,
    required this.nameFr,
    required this.nameBa,
    required this.icon,
    required this.color,
    required this.lessonsCount,
    required this.xpPerLesson,
    required this.difficulty,
  });

  final String id;
  final String nameFr;
  final String nameBa;
  final String icon;
  final String color;
  final int lessonsCount;
  final int xpPerLesson;
  final String difficulty;

  Color get colorValue {
    final hex = color.replaceAll('#', '');
    return Color(int.parse('FF$hex', radix: 16));
  }

  factory LearningTheme.fromJson(Map<String, dynamic> json) {
    return LearningTheme(
      id: (json['id'] ?? '').toString(),
      nameFr: (json['name_fr'] ?? '').toString(),
      nameBa: (json['name_ba'] ?? '').toString(),
      icon: (json['icon'] ?? '📘').toString(),
      color: (json['color'] ?? '#6758C9').toString(),
      lessonsCount: (json['lessons_count'] as num?)?.toInt() ?? 0,
      xpPerLesson: (json['xp_per_lesson'] as num?)?.toInt() ?? 0,
      difficulty: (json['difficulty'] ?? 'easy').toString(),
    );
  }
}

class LearningExerciseItem {
  const LearningExerciseItem({
    required this.french,
    required this.bariba,
    this.context,
    this.distractorsBa = const [],
    this.distractorsFr = const [],
  });

  final String french;
  final String bariba;
  final String? context;
  final List<String> distractorsBa;
  final List<String> distractorsFr;

  factory LearningExerciseItem.fromJson(Map<String, dynamic> json) {
    return LearningExerciseItem(
      french: (json['french'] ?? '').toString(),
      bariba: (json['bariba'] ?? '').toString(),
      context: json['context'] as String?,
      distractorsBa: (json['distractors_ba'] as List? ?? const [])
          .map((e) => e.toString())
          .toList(growable: false),
      distractorsFr: (json['distractors_fr'] as List? ?? const [])
          .map((e) => e.toString())
          .toList(growable: false),
    );
  }
}

class LearningBank {
  const LearningBank({required this.themes, required this.exercises});

  final List<LearningTheme> themes;
  final Map<String, List<LearningExerciseItem>> exercises;

  LearningTheme? themeById(String id) {
    for (final theme in themes) {
      if (theme.id == id) {
        return theme;
      }
    }
    return null;
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
    _formSlide = Tween<Offset>(begin: const Offset(0, .09), end: Offset.zero)
        .animate(
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
      if (!mounted) {
        return;
      }
      widget.onSignedIn(FitilaSession.fromBackend(backendSession));
    } on AuthException catch (_) {
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Numéro ou PIN incorrect. Vérifiez vos informations.'),
        ),
      );
    } catch (_) {
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text(
            'Connexion au serveur FITILA impossible. Vérifiez votre réseau puis réessayez.',
          ),
        ),
      );
    } finally {
      if (mounted) {
        setState(() => _busy = false);
      }
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
      child: SlideTransition(position: _formSlide, child: _authCard()),
    );

    return Scaffold(
      body: DecoratedBox(
        decoration: const BoxDecoration(
          color: _fitilaSurface,
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [Color(0xFFF9F7F0), Color(0xFFF3F0E5), Color(0xFFF7F5EC)],
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
                _StatusChip(icon: Icons.shield_rounded, label: 'Sécurisé'),
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
          colors: [Color(0xFFFFFFFF), Color(0xFFF7F0DF), Color(0xFFF1EDDF)],
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
            style: const TextStyle(color: _fitilaMuted, fontSize: 10.5),
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
    if (page == _page) {
      return;
    }
    setState(() {
      _history.add(_page);
      _page = page;
      _visited.add(page);
    });
  }

  int get _destination => switch (_page) {
    FitilaPage.feed => 0,
    FitilaPage.learn => 1,
    FitilaPage.classe || FitilaPage.teacher => 2,
    FitilaPage.dictionary || FitilaPage.keyboard || FitilaPage.voiceLab => 3,
    FitilaPage.translator => 4,
    FitilaPage.ia || FitilaPage.temIa => 5,
    // Créateur/Templates, Profil et Réglages n'ont pas d'onglet dédié dans
    // la barre du bas (comme sur le web) : ils sont ouverts via le bouton
    // central « + » ou le menu latéral, donc aucun onglet n'est actif.
    _ => -1,
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
      if (!mounted) {
        return;
      }
      setState(() {
        _posts
          ..clear()
          ..addAll(rows.map(FeedPost.fromBackend));
      });
    } catch (error) {
      if (!mounted) {
        return;
      }
      setState(() => _feedError = error.toString());
    } finally {
      if (mounted) {
        setState(() => _feedLoading = false);
      }
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
      FitilaPage.market => const MarketScreen(),
      FitilaPage.agriculture => const AgricultureScreen(),
      FitilaPage.finance => const FinanceScreen(),
      FitilaPage.education => WebParityModuleScreen(
        page: FitilaPage.education,
        onNavigate: _navigate,
      ),
      FitilaPage.health => const HealthScreen(),
      FitilaPage.sos => const SosScreen(),
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
                          _navigate(FitilaPage.learn);
                        case 2:
                          _navigate(FitilaPage.classe);
                        case 3:
                          _navigate(FitilaPage.dictionary);
                        case 4:
                          _navigate(FitilaPage.translator);
                        case 5:
                          _navigate(FitilaPage.ia);
                      }
                    },
                    onCreate: () => _navigate(FitilaPage.creator),
                  ),
            // Le bouton "+" flottant a été retiré : le fil et le studio de
            // création sont volontairement épurés (style Kuaishou plein
            // écran) et la création reste accessible via l'onglet dédié
            // de la barre de navigation basse.
            floatingActionButton: null,
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
  // Le fil est désormais volontairement mono-mode : plein écran,
  // immersif, style Kuaishou/TikTok — plus de bascule Immersion/Classique
  // ni de sous-modules à choisir, conformément à la demande de
  // désencombrement de l'écran.
  @override
  Widget build(BuildContext context) {
    return ColoredBox(
      color: Colors.black,
      child: SafeArea(
        top: false,
        bottom: false,
        child: _ImmersiveFeedDeck(
          posts: widget.posts,
          loading: widget.loading,
          error: widget.error,
          onRetry: widget.onRetry,
        ),
      ),
    );
  }
}

/// Fil immersif — une carte "vivante" par publication, plein cadre,
/// dans un défilement vertical à la fois inspiré de TikTok/Kwai et
/// délibérément distinct : cartes flottantes (jamais bord-à-bord),
/// profondeur de pile visible sur la carte suivante, et un rail de
/// progression qui indique où l'on se trouve dans le fil — deux
/// repères que ces applications n'offrent pas.
class _ImmersiveFeedDeck extends StatefulWidget {
  const _ImmersiveFeedDeck({
    required this.posts,
    required this.loading,
    required this.error,
    required this.onRetry,
  });

  final List<FeedPost> posts;
  final bool loading;
  final String? error;
  final VoidCallback? onRetry;

  @override
  State<_ImmersiveFeedDeck> createState() => _ImmersiveFeedDeckState();
}

class _ImmersiveFeedDeckState extends State<_ImmersiveFeedDeck> {
  final _pageController = PageController(viewportFraction: 0.94);
  FitilaFeedCategory? _filter;
  double _page = 0;

  Set<String> _likedIds = const {};
  Set<String> _followingIds = const {};
  Set<String> _bookmarkedIds = const {};
  Set<String> _repostedIds = const {};

  @override
  void initState() {
    super.initState();
    _pageController.addListener(() {
      if (!mounted || !_pageController.hasClients) {
        return;
      }
      setState(() => _page = _pageController.page ?? 0);
    });
    _loadInteractionState();
  }

  Future<void> _loadInteractionState() async {
    try {
      final results = await Future.wait([
        FitilaBackend.fetchLikedPostIds(),
        FitilaBackend.fetchFollowingIds(),
        FitilaBackend.fetchBookmarkedPostIds(),
        FitilaBackend.fetchRepostedPostIds(),
      ]);
      if (!mounted) {
        return;
      }
      setState(() {
        _likedIds = results[0];
        _followingIds = results[1];
        _bookmarkedIds = results[2];
        _repostedIds = results[3];
      });
    } catch (_) {
      // Sans session (ou hors-ligne), le fil reste consultable ; les
      // états initiaux resteront simplement "non actif".
    }
  }

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  List<FeedPost> get _filtered {
    if (_filter == null) {
      return widget.posts;
    }
    return widget.posts
        .where((post) => post.category == _filter)
        .toList(growable: false);
  }

  @override
  Widget build(BuildContext context) {
    final posts = _filtered;
    return Stack(
      fit: StackFit.expand,
      children: [
        if (widget.loading && posts.isEmpty)
          const Center(child: CircularProgressIndicator(color: Colors.white))
        else if (widget.error != null && posts.isEmpty)
          Center(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(
                  Icons.cloud_off_rounded,
                  color: Colors.white70,
                  size: 32,
                ),
                const SizedBox(height: 8),
                const Text(
                  'Le fil ne peut pas être chargé',
                  style: TextStyle(
                    fontWeight: FontWeight.w700,
                    color: Colors.white,
                  ),
                ),
                const SizedBox(height: 10),
                OutlinedButton.icon(
                  style: OutlinedButton.styleFrom(
                    foregroundColor: Colors.white,
                    side: const BorderSide(color: Colors.white54),
                  ),
                  onPressed: widget.onRetry,
                  icon: const Icon(Icons.refresh_rounded),
                  label: const Text('Réessayer'),
                ),
              ],
            ),
          )
        else if (posts.isEmpty)
          const Center(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(
                  Icons.dynamic_feed_rounded,
                  color: Colors.white38,
                  size: 48,
                ),
                SizedBox(height: 12),
                Text(
                  'Aucune publication',
                  style: TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.w800,
                    fontSize: 16,
                  ),
                ),
                SizedBox(height: 4),
                Text(
                  'Rien à afficher pour cette catégorie pour le moment.',
                  style: TextStyle(color: Colors.white60),
                ),
              ],
            ),
          )
        else
          PageView.builder(
            controller: _pageController,
            scrollDirection: Axis.vertical,
            physics: const BouncingScrollPhysics(),
            itemCount: posts.length,
            itemBuilder: (context, index) {
              final post = posts[index];
              return _LivingPostCard(
                key: ValueKey(post.id ?? 'local-$index'),
                post: post,
                isActive: index == _page.round(),
                initiallyLiked: post.id != null && _likedIds.contains(post.id),
                initiallyFollowing:
                    post.authorId != null &&
                    _followingIds.contains(post.authorId),
                initiallySaved:
                    post.id != null && _bookmarkedIds.contains(post.id),
                initiallyReposted:
                    post.id != null && _repostedIds.contains(post.id),
              );
            },
          ),
        // Filtres de catégorie flottants, fond transparent — un calque
        // léger au-dessus du plein écran plutôt qu'une barre opaque.
        Positioned(
          top: 0,
          left: 0,
          right: 0,
          child: SafeArea(
            bottom: false,
            child: SizedBox(
              height: 40,
              child: ListView(
                padding: const EdgeInsets.symmetric(horizontal: 14),
                scrollDirection: Axis.horizontal,
                children: [
                  _CategoryFilterChip(
                    emoji: '✨',
                    label: 'Pour toi',
                    selected: _filter == null,
                    colorA: _fitilaPrimary,
                    colorB: _fitilaGoldDeep,
                    onTap: () => setState(() => _filter = null),
                  ),
                  for (final category in FitilaFeedCategory.values)
                    if (category != FitilaFeedCategory.general)
                      Padding(
                        padding: const EdgeInsets.only(left: 8),
                        child: _CategoryFilterChip(
                          emoji: _feedCategoryStyles[category]!.emoji,
                          label: _feedCategoryStyles[category]!.label,
                          selected: _filter == category,
                          colorA: _feedCategoryStyles[category]!.colorA,
                          colorB: _feedCategoryStyles[category]!.colorB,
                          onTap: () => setState(() => _filter = category),
                        ),
                      ),
                ],
              ),
            ),
          ),
        ),
      ],
    );
  }
}

class _CategoryFilterChip extends StatelessWidget {
  const _CategoryFilterChip({
    required this.emoji,
    required this.label,
    required this.selected,
    required this.colorA,
    required this.colorB,
    required this.onTap,
  });

  final String emoji;
  final String label;
  final bool selected;
  final Color colorA;
  final Color colorB;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        decoration: BoxDecoration(
          gradient: selected ? LinearGradient(colors: [colorA, colorB]) : null,
          color: selected ? null : Colors.black.withValues(alpha: 0.28),
          borderRadius: BorderRadius.circular(999),
          border: Border.all(
            color: selected
                ? Colors.transparent
                : Colors.white.withValues(alpha: 0.28),
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(emoji, style: const TextStyle(fontSize: 12)),
            const SizedBox(width: 5),
            Text(
              label,
              style: const TextStyle(
                fontSize: 11.5,
                fontWeight: FontWeight.w800,
                color: Colors.white,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Une publication du fil immersif, plein cadre : média (vidéo, photo,
/// audio) ou traitement typographique "tablette du griot" pour un
/// texte pur, rail d'actions réel (aimer, commenter, republier,
/// sauvegarder, suivre) et double-tap pour aimer.
class _LivingPostCard extends StatefulWidget {
  const _LivingPostCard({
    super.key,
    required this.post,
    required this.isActive,
    required this.initiallyLiked,
    required this.initiallyFollowing,
    required this.initiallySaved,
    required this.initiallyReposted,
  });

  final FeedPost post;
  final bool isActive;
  final bool initiallyLiked;
  final bool initiallyFollowing;
  final bool initiallySaved;
  final bool initiallyReposted;

  @override
  State<_LivingPostCard> createState() => _LivingPostCardState();
}

class _LivingPostCardState extends State<_LivingPostCard>
    with SingleTickerProviderStateMixin {
  bool? _likedOverride;
  bool? _followingOverride;
  bool? _savedOverride;
  bool? _repostedOverride;
  bool _likeBusy = false;
  bool _followBusy = false;
  bool _saveBusy = false;
  bool _repostBusy = false;
  late final AnimationController _heartBurstController;
  VideoPlayerController? _videoController;
  Future<void>? _videoReady;
  late final audio.AudioPlayer _audioPlayer;
  bool _audioPlaying = false;

  bool get _liked => _likedOverride ?? widget.initiallyLiked;
  bool get _following => _followingOverride ?? widget.initiallyFollowing;
  bool get _saved => _savedOverride ?? widget.initiallySaved;
  bool get _reposted => _repostedOverride ?? widget.initiallyReposted;

  bool get _isVideo =>
      widget.post.backendSource == 'video' ||
      widget.post.kind == 'vidéo' ||
      widget.post.kind == 'video';
  bool get _isPhoto =>
      widget.post.kind == 'photo' &&
      (widget.post.mediaUrl?.isNotEmpty ?? false);
  bool get _isAudio =>
      !_isVideo &&
      widget.post.kind == 'audio' &&
      (widget.post.mediaUrl?.isNotEmpty ?? false);
  bool get _isTextQuote => !_isVideo && !_isPhoto && !_isAudio;

  @override
  void initState() {
    super.initState();
    _heartBurstController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 650),
    );
    _audioPlayer = audio.AudioPlayer();
    _audioPlayer.onPlayerComplete.listen((_) {
      if (mounted) {
        setState(() => _audioPlaying = false);
      }
    });
    final url = widget.post.mediaUrl;
    if (_isVideo && url != null && url.isNotEmpty) {
      _videoController = VideoPlayerController.networkUrl(Uri.parse(url));
      _videoReady = _videoController!.initialize().then((_) {
        if (!mounted) {
          return;
        }
        _videoController!.setLooping(true);
        if (widget.isActive) {
          _videoController!.play();
        }
        setState(() {});
      });
    }
  }

  @override
  void didUpdateWidget(covariant _LivingPostCard oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.isActive != oldWidget.isActive) {
      if (widget.isActive) {
        _videoController?.play();
      } else {
        _videoController?.pause();
        if (_audioPlaying) {
          _audioPlayer.pause();
          _audioPlaying = false;
        }
      }
    }
  }

  @override
  void dispose() {
    _heartBurstController.dispose();
    _videoController?.dispose();
    _audioPlayer.dispose();
    super.dispose();
  }

  Future<void> _toggleAudio() async {
    final url = widget.post.mediaUrl;
    if (url == null || url.isEmpty) {
      return;
    }
    if (_audioPlaying) {
      await _audioPlayer.pause();
    } else {
      await _audioPlayer.play(audio.UrlSource(url));
    }
    if (mounted) {
      setState(() => _audioPlaying = !_audioPlaying);
    }
  }

  Future<void> _toggleLike({bool? forceLike}) async {
    if (_likeBusy) {
      return;
    }
    final next = forceLike ?? !_liked;
    if (next == _liked) {
      return;
    }
    setState(() {
      _likeBusy = true;
      _likedOverride = next;
      widget.post.likes += next ? 1 : -1;
    });
    try {
      if (widget.post.id != null) {
        await FitilaBackend.togglePostLike(
          postId: widget.post.id!,
          liked: next,
        );
      }
    } catch (_) {
      if (!mounted) {
        return;
      }
      setState(() {
        _likedOverride = !next;
        widget.post.likes += next ? -1 : 1;
      });
    } finally {
      if (mounted) {
        setState(() => _likeBusy = false);
      }
    }
  }

  void _handleDoubleTap() {
    _heartBurstController.forward(from: 0);
    if (!_liked) {
      _toggleLike(forceLike: true);
    }
  }

  Future<void> _toggleFollow() async {
    if (_followBusy || widget.post.authorId == null) {
      return;
    }
    final next = !_following;
    setState(() {
      _followBusy = true;
      _followingOverride = next;
    });
    try {
      await FitilaBackend.toggleFollow(
        authorId: widget.post.authorId!,
        follow: next,
      );
    } catch (_) {
      if (!mounted) {
        return;
      }
      setState(() => _followingOverride = !next);
    } finally {
      if (mounted) {
        setState(() => _followBusy = false);
      }
    }
  }

  Future<void> _toggleSave() async {
    if (_saveBusy || widget.post.id == null) {
      return;
    }
    final next = !_saved;
    setState(() {
      _saveBusy = true;
      _savedOverride = next;
    });
    try {
      await FitilaBackend.toggleBookmark(postId: widget.post.id!, saved: next);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              next ? 'Ajouté à vos favoris.' : 'Retiré de vos favoris.',
            ),
            duration: const Duration(seconds: 1),
          ),
        );
      }
    } catch (_) {
      if (!mounted) {
        return;
      }
      setState(() => _savedOverride = !next);
    } finally {
      if (mounted) {
        setState(() => _saveBusy = false);
      }
    }
  }

  Future<void> _toggleRepost() async {
    if (_repostBusy || widget.post.id == null) {
      return;
    }
    final next = !_reposted;
    setState(() {
      _repostBusy = true;
      _repostedOverride = next;
      widget.post.shares += next ? 1 : -1;
    });
    try {
      await FitilaBackend.toggleRepost(postId: widget.post.id!, reposted: next);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              next ? 'Republié dans votre fil.' : 'Republication annulée.',
            ),
            duration: const Duration(seconds: 1),
          ),
        );
      }
    } catch (_) {
      if (!mounted) {
        return;
      }
      setState(() {
        _repostedOverride = !next;
        widget.post.shares += next ? -1 : 1;
      });
    } finally {
      if (mounted) {
        setState(() => _repostBusy = false);
      }
    }
  }

  void _openComments() {
    if (widget.post.id == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text(
            'Les commentaires ne sont disponibles que pour les publications enregistrées.',
          ),
        ),
      );
      return;
    }
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      backgroundColor: _fitilaCard,
      builder: (_) => _CommentsSheet(post: widget.post),
    );
  }

  // Carte plein écran, style Kuaishou/TikTok : uniquement le média et
  // les quatre actions demandées (aimer, commenter, sauvegarder,
  // republier) — plus aucun badge, nom d'auteur, légende ou hashtag
  // à l'écran, conformément à la demande de désencombrement.
  @override
  Widget build(BuildContext context) {
    final post = widget.post;
    final style = _feedCategoryStyles[post.category]!;
    return GestureDetector(
      onDoubleTap: _handleDoubleTap,
      onTap: _isVideo
          ? () => setState(() {
              final controller = _videoController;
              if (controller == null) {
                return;
              }
              controller.value.isPlaying
                  ? controller.pause()
                  : controller.play();
            })
          : null,
      child: Container(
        decoration: BoxDecoration(gradient: style.gradient),
        child: Stack(
          fit: StackFit.expand,
          children: [
            const CustomPaint(painter: _SignatureWeavePainter()),
            _mediaLayer(post),
            // Léger voile bas pour garder les icônes d'action lisibles
            // au-dessus de n'importe quel média, sans texte superposé.
            Positioned(
              bottom: 0,
              left: 0,
              right: 0,
              child: Container(
                height: 160,
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.bottomCenter,
                    end: Alignment.topCenter,
                    colors: [
                      Colors.black.withValues(alpha: 0.45),
                      Colors.transparent,
                    ],
                  ),
                ),
              ),
            ),
            IgnorePointer(
              child: Center(
                child: AnimatedBuilder(
                  animation: _heartBurstController,
                  builder: (context, child) {
                    final t = _heartBurstController.value;
                    if (t == 0) {
                      return const SizedBox.shrink();
                    }
                    final double scale = t < 0.5
                        ? (t / 0.5)
                        : (1 - (t - 0.5) / 0.5 * 0.2);
                    final double opacity = t < 0.7
                        ? 1.0
                        : (1 - (t - 0.7) / 0.3);
                    return Opacity(
                      opacity: opacity.clamp(0.0, 1.0).toDouble(),
                      child: Transform.scale(
                        scale: scale.clamp(0.0, 1.2).toDouble(),
                        child: const Icon(
                          Icons.favorite_rounded,
                          color: Colors.white,
                          size: 96,
                        ),
                      ),
                    );
                  },
                ),
              ),
            ),
            Positioned(
              right: 12,
              bottom: 24,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  _RailAction(
                    icon: _liked
                        ? Icons.favorite_rounded
                        : Icons.favorite_border_rounded,
                    activeColor: Colors.redAccent,
                    active: _liked,
                    label: _formatFeedCount(post.likes),
                    onTap: _likeBusy ? null : () => _toggleLike(),
                  ),
                  const SizedBox(height: 16),
                  _RailAction(
                    icon: Icons.mode_comment_rounded,
                    active: false,
                    label: _formatFeedCount(post.comments),
                    onTap: _openComments,
                  ),
                  const SizedBox(height: 16),
                  _RailAction(
                    icon: _saved
                        ? Icons.bookmark_rounded
                        : Icons.bookmark_border_rounded,
                    activeColor: _fitilaPrimary,
                    active: _saved,
                    onTap: _saveBusy ? null : _toggleSave,
                  ),
                  const SizedBox(height: 16),
                  _RailAction(
                    icon: Icons.repeat_rounded,
                    activeColor: _fitilaSage,
                    active: _reposted,
                    label: _formatFeedCount(post.shares),
                    onTap: _repostBusy ? null : _toggleRepost,
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _mediaLayer(FeedPost post) {
    if (_isVideo) {
      final controller = _videoController;
      if (controller == null) {
        return const SizedBox.shrink();
      }
      return FutureBuilder<void>(
        future: _videoReady,
        builder: (context, snapshot) {
          if (snapshot.connectionState != ConnectionState.done ||
              !controller.value.isInitialized) {
            return const Center(
              child: CircularProgressIndicator(color: Colors.white),
            );
          }
          return SizedBox.expand(
            child: FittedBox(
              fit: BoxFit.cover,
              child: SizedBox(
                width: controller.value.size.width,
                height: controller.value.size.height,
                child: VideoPlayer(controller),
              ),
            ),
          );
        },
      );
    }
    if (_isPhoto) {
      return Image.network(
        post.mediaUrl!,
        fit: BoxFit.cover,
        width: double.infinity,
        height: double.infinity,
        errorBuilder: (_, _, _) => const SizedBox.shrink(),
      );
    }
    if (_isAudio) {
      return Center(
        child: _AudioPulse(playing: _audioPlaying, onTap: _toggleAudio),
      );
    }
    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 30),
        child: Text(
          post.content,
          textAlign: TextAlign.center,
          maxLines: 6,
          overflow: TextOverflow.ellipsis,
          style: const TextStyle(
            color: Colors.white,
            fontFamily: 'serif',
            fontSize: 21,
            height: 1.4,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),
    );
  }
}

class _AuthorAvatar extends StatelessWidget {
  const _AuthorAvatar({required this.post, required this.style});

  final FeedPost post;
  final _FeedCategoryStyle style;

  @override
  Widget build(BuildContext context) {
    final url = post.authorAvatarUrl;
    return Container(
      width: 34,
      height: 34,
      clipBehavior: Clip.antiAlias,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        gradient: style.gradient,
        border: Border.all(color: Colors.white, width: 1.5),
      ),
      alignment: Alignment.center,
      child: url != null && url.isNotEmpty
          ? Image.network(
              url,
              fit: BoxFit.cover,
              width: 34,
              height: 34,
              errorBuilder: (_, _, _) => _initials(),
            )
          : _initials(),
    );
  }

  Widget _initials() {
    return Text(
      _initialLetter(post.author),
      style: const TextStyle(
        color: Colors.white,
        fontSize: 13,
        fontWeight: FontWeight.w800,
      ),
    );
  }
}

class _RailAction extends StatelessWidget {
  const _RailAction({
    required this.icon,
    required this.active,
    this.activeColor = Colors.white,
    this.label,
    required this.onTap,
  });

  final IconData icon;
  final bool active;
  final Color activeColor;
  final String? label;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      behavior: HitTestBehavior.opaque,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              color: Colors.black.withValues(alpha: 0.28),
              shape: BoxShape.circle,
            ),
            child: Icon(
              icon,
              color: active ? activeColor : Colors.white,
              size: 22,
            ),
          ),
          if (label != null) ...[
            const SizedBox(height: 3),
            Text(
              label!,
              style: const TextStyle(
                color: Colors.white,
                fontSize: 11,
                fontWeight: FontWeight.w800,
              ),
            ),
          ],
        ],
      ),
    );
  }
}

/// Motif de fond statique en croisillon diagonal — évoque une trame
/// tissée sans dépendre d'aucune image, et coûte un seul paint.
class _SignatureWeavePainter extends CustomPainter {
  const _SignatureWeavePainter();

  @override
  void paint(Canvas canvas, Size size) {
    final up = Paint()
      ..color = Colors.white.withValues(alpha: 0.07)
      ..strokeWidth = 1.4
      ..style = PaintingStyle.stroke;
    final down = Paint()
      ..color = Colors.black.withValues(alpha: 0.07)
      ..strokeWidth = 1.4
      ..style = PaintingStyle.stroke;
    const spacing = 26.0;
    for (double x = -size.height; x < size.width + size.height; x += spacing) {
      canvas.drawLine(Offset(x, 0), Offset(x + size.height, size.height), up);
      canvas.drawLine(Offset(x, size.height), Offset(x + size.height, 0), down);
    }
  }

  @override
  bool shouldRepaint(covariant _SignatureWeavePainter oldDelegate) => false;
}

/// Visualiseur audio "vivant" : cinq barres pulsent au rythme d'une
/// animation continue, plus amples pendant la lecture.
class _AudioPulse extends StatefulWidget {
  const _AudioPulse({required this.playing, required this.onTap});

  final bool playing;
  final VoidCallback onTap;

  @override
  State<_AudioPulse> createState() => _AudioPulseState();
}

class _AudioPulseState extends State<_AudioPulse>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 900),
    )..repeat();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: widget.onTap,
      child: Container(
        width: 128,
        height: 128,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          color: Colors.white.withValues(alpha: 0.14),
          border: Border.all(
            color: Colors.white.withValues(alpha: 0.5),
            width: 1.5,
          ),
        ),
        child: Stack(
          alignment: Alignment.center,
          children: [
            AnimatedBuilder(
              animation: _controller,
              builder: (context, child) {
                return Row(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.center,
                  children: List.generate(5, (i) {
                    final phase = _controller.value * 2 * math.pi + i * 0.8;
                    final amplitude = widget.playing ? 0.5 : 0.08;
                    final height =
                        10 + (math.sin(phase).abs() * 26 * amplitude) + 6;
                    return Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 2.5),
                      child: Container(
                        width: 5,
                        height: height,
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(3),
                        ),
                      ),
                    );
                  }),
                );
              },
            ),
            Positioned(
              bottom: 14,
              child: Icon(
                widget.playing ? Icons.pause_rounded : Icons.play_arrow_rounded,
                color: Colors.white,
                size: 20,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Feuille de commentaires réels — lecture en direct (Realtime) et
/// écriture (tamtam_comments) via FitilaBackend.
class _CommentsSheet extends StatefulWidget {
  const _CommentsSheet({required this.post});

  final FeedPost post;

  @override
  State<_CommentsSheet> createState() => _CommentsSheetState();
}

class _CommentsSheetState extends State<_CommentsSheet> {
  final _controller = TextEditingController();
  bool _sending = false;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _send() async {
    final text = _controller.text.trim();
    if (text.isEmpty || widget.post.id == null) {
      return;
    }
    setState(() => _sending = true);
    try {
      await FitilaBackend.addTextComment(postId: widget.post.id!, text: text);
      _controller.clear();
      widget.post.comments += 1;
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Commentaire non envoyé. Réessayez.')),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _sending = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return DraggableScrollableSheet(
      initialChildSize: 0.72,
      minChildSize: 0.45,
      maxChildSize: 0.92,
      expand: false,
      builder: (context, scrollController) {
        return Padding(
          padding: EdgeInsets.only(
            bottom: MediaQuery.of(context).viewInsets.bottom,
          ),
          child: Column(
            children: [
              const Padding(
                padding: EdgeInsets.fromLTRB(16, 4, 16, 10),
                child: Row(
                  children: [
                    Icon(
                      Icons.mode_comment_rounded,
                      color: _fitilaPrimary,
                      size: 18,
                    ),
                    SizedBox(width: 8),
                    Text(
                      'Commentaires',
                      style: TextStyle(
                        fontWeight: FontWeight.w800,
                        fontSize: 15,
                      ),
                    ),
                  ],
                ),
              ),
              const Divider(height: 1, color: _fitilaBorder),
              Expanded(
                child: StreamBuilder<List<Map<String, dynamic>>>(
                  stream: FitilaBackend.streamComments(widget.post.id!),
                  builder: (context, snapshot) {
                    final comments = snapshot.data ?? const [];
                    if (snapshot.connectionState == ConnectionState.waiting &&
                        comments.isEmpty) {
                      return const Center(child: CircularProgressIndicator());
                    }
                    if (comments.isEmpty) {
                      return const Center(
                        child: Text(
                          'Aucun commentaire pour le moment. Soyez le premier.',
                          style: TextStyle(color: _fitilaMuted, fontSize: 12.5),
                        ),
                      );
                    }
                    return ListView.separated(
                      controller: scrollController,
                      padding: const EdgeInsets.all(16),
                      itemCount: comments.length,
                      separatorBuilder: (_, _) => const SizedBox(height: 14),
                      itemBuilder: (context, index) {
                        final comment = comments[index];
                        return Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            CircleAvatar(
                              radius: 15,
                              backgroundColor: _fitilaPrimarySoft,
                              child: Text(
                                _initialLetter(
                                  comment['display_name']?.toString(),
                                ),
                                style: const TextStyle(
                                  color: _fitilaGoldDeep,
                                  fontSize: 11,
                                  fontWeight: FontWeight.w800,
                                ),
                              ),
                            ),
                            const SizedBox(width: 10),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    comment['display_name']?.toString() ??
                                        'Voix Fitila',
                                    style: const TextStyle(
                                      fontWeight: FontWeight.w800,
                                      fontSize: 12.5,
                                    ),
                                  ),
                                  const SizedBox(height: 2),
                                  Text(
                                    comment['text_content']?.toString() ?? '',
                                    style: const TextStyle(
                                      fontSize: 13,
                                      height: 1.3,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        );
                      },
                    );
                  },
                ),
              ),
              const Divider(height: 1, color: _fitilaBorder),
              Padding(
                padding: const EdgeInsets.fromLTRB(12, 10, 12, 14),
                child: Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: _controller,
                        decoration: const InputDecoration(
                          hintText: 'Ajouter un commentaire…',
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.all(Radius.circular(24)),
                          ),
                          contentPadding: EdgeInsets.symmetric(
                            horizontal: 16,
                            vertical: 10,
                          ),
                        ),
                        onSubmitted: (_) => _send(),
                      ),
                    ),
                    const SizedBox(width: 8),
                    IconButton.filled(
                      onPressed: _sending ? null : _send,
                      icon: _sending
                          ? const SizedBox(
                              width: 16,
                              height: 16,
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                                color: Colors.white,
                              ),
                            )
                          : const Icon(Icons.send_rounded),
                    ),
                  ],
                ),
              ),
            ],
          ),
        );
      },
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
                  style: const TextStyle(color: _fitilaMuted, fontSize: 10.5),
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
  // Page volontairement réduite à l'essentiel : uniquement les 6 modules
  // de création. Studio de composition, statistiques, moteur créateur,
  // pipeline et sélection de templates ont été retirés — désencombrement
  // demandé, style Kuaishou plein écran.
  @override
  Widget build(BuildContext context) {
    return ColoredBox(
      color: _fitilaSurface,
      child: SafeArea(
        child: Center(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 22, vertical: 18),
            child: LayoutBuilder(
              builder: (context, constraints) {
                final columns = constraints.maxWidth < 420
                    ? 2
                    : constraints.maxWidth < 760
                    ? 3
                    : 6;
                return GridView.count(
                  crossAxisCount: columns,
                  shrinkWrap: true,
                  mainAxisSpacing: 14,
                  crossAxisSpacing: 14,
                  childAspectRatio: 0.92,
                  children: [
                    _CreationIaTile(
                      emoji: '📡',
                      title: 'Echo Sɔ̃ɔ',
                      subtitle: 'Voix, texte, traduction, visuel signature.',
                      colorA: const Color(0xFFC99530),
                      colorB: const Color(0xFF9C6B1D),
                      onTap: () => Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (_) => EchoSonScreen(
                            onPostCreated: widget.onPostCreated,
                          ),
                        ),
                      ),
                    ),
                    _CreationIaTile(
                      emoji: '🎙️',
                      title: 'Live Griot IA',
                      subtitle: 'Direct audio, chat en temps réel et auditeurs connectés.',
                      colorA: const Color(0xFF6758C9),
                      colorB: const Color(0xFF4A3B96),
                      onTap: () => Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (_) => LiveGriotScreen(
                            onPostCreated: widget.onPostCreated,
                          ),
                        ),
                      ),
                    ),
                    _CreationIaTile(
                      emoji: '⚔️',
                      title: 'Sagesse Battle',
                      subtitle: 'Défi proverbe quotidien, XP et badges.',
                      colorA: const Color(0xFF9C6B1D),
                      colorB: const Color(0xFFB54E33),
                      onTap: () => Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (_) => const SagesseBattleScreen(),
                        ),
                      ),
                    ),
                    _CreationIaTile(
                      emoji: '🛍️',
                      title: 'Aburu Fim IA',
                      subtitle: 'Produit + template + publication instantanée.',
                      colorA: const Color(0xFF3F6E52),
                      colorB: const Color(0xFF2C4E3A),
                      onTap: () => Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (_) => AburuFimScreen(
                            onPostCreated: widget.onPostCreated,
                          ),
                        ),
                      ),
                    ),
                    _CreationIaTile(
                      emoji: '🌉',
                      title: 'Sasara IA',
                      subtitle: 'Le pont bilingue Bariba ⇄ Français.',
                      colorA: const Color(0xFF241F2E),
                      colorB: const Color(0xFF3A3448),
                      onTap: () => Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (_) => SasaraIaScreen(
                            onPostCreated: widget.onPostCreated,
                          ),
                        ),
                      ),
                    ),
                    _CreationIaTile(
                      emoji: '🌌',
                      title: 'Handunia Wasa',
                      subtitle: 'Monde vivant, souvenirs et mémoire collective.',
                      colorA: const Color(0xFF4A3B78),
                      colorB: const Color(0xFF14111C),
                      onTap: () => Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (_) => const HanduniaWasaScreen(),
                        ),
                      ),
                    ),
                  ],
                );
              },
            ),
          ),
        ),
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
  const WebParityModuleScreen({super.key, required this.page, this.onNavigate});

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
          subtitle:
              'Créer une annonce produit avec photo, prix et localisation.',
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
                style: const TextStyle(color: _fitilaMuted, height: 1.45),
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
                            const SizedBox(width: 6),
                            if (action.badge != null)
                              Expanded(
                                child: Align(
                                  alignment: Alignment.centerRight,
                                  child: Container(
                                    constraints: const BoxConstraints(
                                      maxWidth: 72,
                                    ),
                                    padding: const EdgeInsets.symmetric(
                                      horizontal: 6,
                                      vertical: 4,
                                    ),
                                    decoration: BoxDecoration(
                                      color: const Color(0xFFDCEAE0),
                                      borderRadius: BorderRadius.circular(99),
                                    ),
                                    child: Text(
                                      action.badge!,
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                      textAlign: TextAlign.center,
                                      style: const TextStyle(
                                        color: _fitilaSage,
                                        fontSize: 8.5,
                                        fontWeight: FontWeight.w900,
                                      ),
                                    ),
                                  ),
                                ),
                              )
                            else
                              const Spacer(),
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
                        if (text.isEmpty) {
                          return;
                        }
                        _assistant.clear();
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(
                            content: Text('Demande prise en compte : $text'),
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

// =====================================================================
// Assistant intelligent partagé (Agriculture / Finance / Santé)
// =====================================================================

class _AssistantChatPanel extends StatefulWidget {
  const _AssistantChatPanel({
    required this.contextKey,
    required this.welcomeFr,
    required this.accent,
  });

  final String contextKey;
  final String welcomeFr;
  final Color accent;

  @override
  State<_AssistantChatPanel> createState() => _AssistantChatPanelState();
}

class _AssistantChatPanelState extends State<_AssistantChatPanel> {
  final _input = TextEditingController();
  final _scroll = ScrollController();
  final List<({bool fromUser, String text})> _messages = [];
  bool _sending = false;

  @override
  void initState() {
    super.initState();
    _messages.add((fromUser: false, text: widget.welcomeFr));
  }

  @override
  void dispose() {
    _input.dispose();
    _scroll.dispose();
    super.dispose();
  }

  Future<void> _send() async {
    final text = _input.text.trim();
    if (text.isEmpty || _sending) {
      return;
    }
    if (!FitilaBackend.configured) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Serveur FITILA indisponible.')),
      );
      return;
    }
    _input.clear();
    setState(() {
      _messages.add((fromUser: true, text: text));
      _sending = true;
    });
    try {
      final priorTurns = _messages.sublist(0, _messages.length - 1);
      final recent = priorTurns.length > 6
          ? priorTurns.sublist(priorTurns.length - 6)
          : priorTurns;
      final history = recent
          .map(
            (m) => {
              'role': m.fromUser ? 'user' : 'assistant',
              'content': m.text,
            },
          )
          .toList();
      final reply = await FitilaBackend.askSmartAssistant(
        message: text,
        context: widget.contextKey,
        history: history,
      );
      if (!mounted) {
        return;
      }
      final answer = reply['fr'];
      setState(() {
        _messages.add((
          fromUser: false,
          text: (answer == null || answer.isEmpty)
              ? 'Désolé, je n’ai pas de réponse pour le moment.'
              : answer,
        ));
      });
    } catch (_) {
      if (!mounted) {
        return;
      }
      setState(() {
        _messages.add((
          fromUser: false,
          text: 'Assistant momentanément indisponible. Réessayez plus tard.',
        ));
      });
    } finally {
      if (mounted) {
        setState(() => _sending = false);
      }
      await Future<void>.delayed(const Duration(milliseconds: 80));
      if (_scroll.hasClients) {
        await _scroll.animateTo(
          _scroll.position.maxScrollExtent,
          duration: const Duration(milliseconds: 200),
          curve: Curves.easeOut,
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Expanded(
          child: ListView.builder(
            controller: _scroll,
            padding: const EdgeInsets.symmetric(vertical: 8),
            itemCount: _messages.length,
            itemBuilder: (context, index) {
              final m = _messages[index];
              return Align(
                alignment: m.fromUser
                    ? Alignment.centerRight
                    : Alignment.centerLeft,
                child: Container(
                  margin: const EdgeInsets.symmetric(vertical: 5),
                  constraints: const BoxConstraints(maxWidth: 280),
                  padding: const EdgeInsets.symmetric(
                    horizontal: 13,
                    vertical: 10,
                  ),
                  decoration: BoxDecoration(
                    color: m.fromUser ? widget.accent : _fitilaCard,
                    borderRadius: BorderRadius.circular(16),
                    border: m.fromUser
                        ? null
                        : Border.all(color: _fitilaBorder),
                  ),
                  child: Text(
                    m.text,
                    style: TextStyle(
                      color: m.fromUser ? Colors.white : _fitilaInkSoft,
                      fontSize: 12.5,
                      height: 1.4,
                    ),
                  ),
                ),
              );
            },
          ),
        ),
        if (_sending)
          const Padding(
            padding: EdgeInsets.only(bottom: 6),
            child: SizedBox(
              width: 16,
              height: 16,
              child: CircularProgressIndicator(strokeWidth: 2),
            ),
          ),
        Row(
          children: [
            Expanded(
              child: TextField(
                controller: _input,
                minLines: 1,
                maxLines: 3,
                decoration: const InputDecoration(
                  hintText: 'Écrivez votre question...',
                ),
                onSubmitted: (_) => _send(),
              ),
            ),
            const SizedBox(width: 8),
            IconButton.filled(
              onPressed: _sending ? null : _send,
              icon: const Icon(Icons.send_rounded),
            ),
          ],
        ),
      ],
    );
  }
}

void _openAssistantSheet(
  BuildContext context, {
  required String contextKey,
  required String title,
  required String welcomeFr,
  required IconData icon,
  required Color accent,
}) {
  showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    showDragHandle: true,
    builder: (sheetContext) => Padding(
      padding: EdgeInsets.only(
        left: 16,
        right: 16,
        top: 8,
        bottom: MediaQuery.of(sheetContext).viewInsets.bottom + 16,
      ),
      child: SizedBox(
        height: MediaQuery.of(sheetContext).size.height * 0.8,
        child: Column(
          children: [
            Row(
              children: [
                Icon(icon, color: accent),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    title,
                    style: const TextStyle(
                      fontWeight: FontWeight.w900,
                      fontSize: 15,
                      color: _fitilaInk,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 10),
            Expanded(
              child: _AssistantChatPanel(
                contextKey: contextKey,
                welcomeFr: welcomeFr,
                accent: accent,
              ),
            ),
          ],
        ),
      ),
    ),
  );
}

// =====================================================================
// Agriculture
// =====================================================================

class _AgriForecastDay {
  const _AgriForecastDay(this.day, this.icon, this.rain);
  final String day;
  final String icon;
  final int rain;
}

const _agriForecast = [
  _AgriForecastDay('Lun', '☀️', 0),
  _AgriForecastDay('Mar', '⛅', 20),
  _AgriForecastDay('Mer', '🌧️', 80),
  _AgriForecastDay('Jeu', '🌧️', 60),
  _AgriForecastDay('Ven', '☀️', 10),
];

class _AgriPrice {
  const _AgriPrice(this.emoji, this.nameFr, this.price);
  final String emoji;
  final String nameFr;
  final int price;
}

const _agriPrices = [
  _AgriPrice('🌽', 'Maïs (sac 100kg)', 15000),
  _AgriPrice('🌾', 'Riz (sac 50kg)', 22000),
  _AgriPrice('🥜', 'Arachide (sac)', 18000),
  _AgriPrice('🫘', 'Haricot (sac)', 25000),
];

class _AgriSection {
  const _AgriSection(this.id, this.label, this.icon);
  final String id;
  final String label;
  final IconData icon;
}

const _agriSections = [
  _AgriSection('weather', 'Météo', Icons.wb_sunny_rounded),
  _AgriSection('crops', 'Conseils cultures', Icons.grass_rounded),
  _AgriSection('livestock', 'Bétail', Icons.pets_rounded),
  _AgriSection('water', 'Eau & irrigation', Icons.water_drop_rounded),
  _AgriSection('technician', 'Appeler technicien', Icons.support_agent_rounded),
  _AgriSection('prices', 'Prix du jour', Icons.payments_rounded),
];

class AgricultureScreen extends StatelessWidget {
  const AgricultureScreen({super.key});

  void _openSection(BuildContext context, _AgriSection section) {
    if (section.id == 'technician') {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text(
            '📞 Appel en cours... un technicien vous rappellera dans 10 minutes.',
          ),
        ),
      );
      return;
    }
    if (section.id == 'prices') {
      showModalBottomSheet<void>(
        context: context,
        showDragHandle: true,
        builder: (sheetContext) => Padding(
          padding: const EdgeInsets.fromLTRB(18, 0, 18, 24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Text(
                'Prix du marché (aujourd’hui)',
                style: TextStyle(
                  fontWeight: FontWeight.w900,
                  fontSize: 15,
                  color: _fitilaInk,
                ),
              ),
              const SizedBox(height: 10),
              ..._agriPrices.map(
                (p) => ListTile(
                  leading: Text(p.emoji, style: const TextStyle(fontSize: 22)),
                  title: Text(p.nameFr),
                  trailing: Text(
                    '${p.price} FCFA',
                    style: const TextStyle(
                      fontWeight: FontWeight.w800,
                      color: _fitilaGoldDeep,
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      );
      return;
    }
    _openAssistantSheet(
      context,
      contextKey: 'agriculture',
      title: section.label,
      welcomeFr: 'Bonjour ! Posez votre question sur : ${section.label}.',
      icon: section.icon,
      accent: _fitilaSage,
    );
  }

  @override
  Widget build(BuildContext context) {
    return _PageFrame(
      title: 'Agriculture',
      subtitle: 'Conseils agricoles, météo et prix',
      child: ListView(
        children: [
          _TCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Row(
                  children: [
                    Icon(
                      Icons.wb_sunny_rounded,
                      color: _fitilaGoldDeep,
                      size: 26,
                    ),
                    SizedBox(width: 8),
                    Text(
                      '28°C · Ensoleillé',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w900,
                        color: _fitilaInk,
                      ),
                    ),
                    Spacer(),
                    Text(
                      'Humidité 65%',
                      style: TextStyle(fontSize: 11, color: _fitilaMuted),
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                Row(
                  children: _agriForecast
                      .map(
                        (f) => Expanded(
                          child: Column(
                            children: [
                              Text(
                                f.day,
                                style: const TextStyle(
                                  fontSize: 11,
                                  color: _fitilaMuted,
                                ),
                              ),
                              Text(
                                f.icon,
                                style: const TextStyle(fontSize: 18),
                              ),
                              Text(
                                '${f.rain}%',
                                style: const TextStyle(
                                  fontSize: 10,
                                  color: _fitilaSage,
                                ),
                              ),
                            ],
                          ),
                        ),
                      )
                      .toList(),
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),
          GridView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: _agriSections.length,
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 2,
              mainAxisExtent: 108,
              crossAxisSpacing: 10,
              mainAxisSpacing: 10,
            ),
            itemBuilder: (context, index) {
              final s = _agriSections[index];
              return Material(
                color: _fitilaCard,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(18),
                  side: const BorderSide(color: _fitilaBorder),
                ),
                clipBehavior: Clip.antiAlias,
                child: InkWell(
                  onTap: () => _openSection(context, s),
                  child: Padding(
                    padding: const EdgeInsets.all(12),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Icon(s.icon, color: _fitilaSage, size: 24),
                        const Spacer(),
                        Text(
                          s.label,
                          maxLines: 2,
                          style: const TextStyle(
                            fontWeight: FontWeight.w800,
                            fontSize: 12.5,
                            color: _fitilaInk,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              );
            },
          ),
        ],
      ),
    );
  }
}

// =====================================================================
// Finance
// =====================================================================

class _FinTx {
  const _FinTx(this.icon, this.label, this.amount, this.date, this.isSale);
  final String icon;
  final String label;
  final int amount;
  final String date;
  final bool isSale;
}

const _financeTransactions = [
  _FinTx('🌽', 'Vente maïs', 45000, "Aujourd'hui", true),
  _FinTx('🌱', 'Engrais', 12000, "Aujourd'hui", false),
  _FinTx('🍅', 'Vente tomates', 30000, 'Hier', true),
  _FinTx('🌾', 'Semences', 5000, 'Hier', false),
  _FinTx('🍚', 'Vente riz', 80000, 'Lundi', true),
];

class _TontineMember {
  const _TontineMember(this.avatar, this.name, this.hasPaid, this.isTurn);
  final String avatar;
  final String name;
  final bool hasPaid;
  final bool isTurn;
}

const _tontineMembers = [
  _TontineMember('👩🏾', 'Mama Sika', true, true),
  _TontineMember('👨🏾', 'Papa Koffi', true, false),
  _TontineMember('👧🏾', 'Aïcha', false, false),
  _TontineMember('👦🏾', 'Ibrahim', true, false),
  _TontineMember('🙋🏾', 'Moi', true, false),
];

class FinanceScreen extends StatefulWidget {
  const FinanceScreen({super.key});

  @override
  State<FinanceScreen> createState() => _FinanceScreenState();
}

class _FinanceScreenState extends State<FinanceScreen> {
  String _tab = 'accueil';

  int get _balance {
    var total = 0;
    for (final t in _financeTransactions) {
      total += t.isSale ? t.amount : -t.amount;
    }
    return total;
  }

  @override
  Widget build(BuildContext context) {
    return _PageFrame(
      title: 'Finance',
      subtitle: 'Portefeuille, tontine et mobile money',
      child: ListView(
        children: [
          _TCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Solde actuel',
                  style: TextStyle(color: _fitilaMuted, fontSize: 11.5),
                ),
                const SizedBox(height: 4),
                Text(
                  '$_balance FCFA',
                  style: const TextStyle(
                    fontFamily: 'serif',
                    fontSize: 26,
                    fontWeight: FontWeight.w700,
                    color: _fitilaInk,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              ChoiceChip(
                label: const Text('Ventes'),
                selected: _tab == 'ventes',
                onSelected: (_) => setState(() => _tab = 'ventes'),
              ),
              ChoiceChip(
                label: const Text('Dépenses'),
                selected: _tab == 'depenses',
                onSelected: (_) => setState(() => _tab = 'depenses'),
              ),
              ChoiceChip(
                label: const Text('Tontine'),
                selected: _tab == 'tontine',
                onSelected: (_) => setState(() => _tab = 'tontine'),
              ),
              ChoiceChip(
                label: const Text('Crédit'),
                selected: _tab == 'credit',
                onSelected: (_) => setState(() => _tab = 'credit'),
              ),
              ChoiceChip(
                label: const Text('Épargne'),
                selected: _tab == 'epargne',
                onSelected: (_) => setState(() => _tab = 'epargne'),
              ),
            ],
          ),
          const SizedBox(height: 12),
          _buildTabBody(),
          const SizedBox(height: 14),
          _TCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Row(
                  children: [
                    Icon(Icons.support_agent_rounded, color: _fitilaGoldDeep),
                    SizedBox(width: 8),
                    Text(
                      'Conseiller financier',
                      style: TextStyle(
                        fontWeight: FontWeight.w900,
                        color: _fitilaInk,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                const Text(
                  'Assistant bilingue pour vos questions d’argent.',
                  style: TextStyle(fontSize: 11.5, color: _fitilaMuted),
                ),
                const SizedBox(height: 10),
                FilledButton.icon(
                  onPressed: () => _openAssistantSheet(
                    context,
                    contextKey: 'finance',
                    title: 'Conseiller financier',
                    welcomeFr:
                        'Bonjour ! Je peux vous aider sur vos ventes, '
                        'dépenses, tontine ou épargne.',
                    icon: Icons.support_agent_rounded,
                    accent: _fitilaGoldDeep,
                  ),
                  icon: const Icon(Icons.chat_rounded),
                  label: const Text('Parler au conseiller'),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTabBody() {
    return switch (_tab) {
      'ventes' => _txList(sale: true),
      'depenses' => _txList(sale: false),
      'tontine' => _tontineBody(),
      'credit' => _creditBody(context),
      'epargne' => _epargneBody(),
      _ => _txList(sale: null),
    };
  }

  Widget _txList({required bool? sale}) {
    final items = sale == null
        ? _financeTransactions
        : _financeTransactions.where((t) => t.isSale == sale).toList();
    if (items.isEmpty) {
      return const _TCard(
        child: Text(
          'Aucune transaction.',
          style: TextStyle(color: _fitilaMuted),
        ),
      );
    }
    return Column(
      children: items
          .map(
            (t) => _TCard(
              margin: const EdgeInsets.only(bottom: 8),
              child: Row(
                children: [
                  Text(t.icon, style: const TextStyle(fontSize: 22)),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          t.label,
                          style: const TextStyle(
                            fontWeight: FontWeight.w800,
                            color: _fitilaInk,
                          ),
                        ),
                        Text(
                          t.date,
                          style: const TextStyle(
                            fontSize: 10.5,
                            color: _fitilaMuted,
                          ),
                        ),
                      ],
                    ),
                  ),
                  Text(
                    '${t.isSale ? '+' : '-'}${t.amount} F',
                    style: TextStyle(
                      fontWeight: FontWeight.w900,
                      color: t.isSale ? _fitilaSage : _fitilaClay,
                    ),
                  ),
                ],
              ),
            ),
          )
          .toList(),
    );
  }

  Widget _tontineBody() {
    return Column(
      children: [
        const _TCard(
          child: Text(
            'Cotisation hebdomadaire : 10 000 F',
            style: TextStyle(fontWeight: FontWeight.w800, color: _fitilaInk),
          ),
        ),
        const SizedBox(height: 8),
        ..._tontineMembers.map(
          (m) => _TCard(
            margin: const EdgeInsets.only(bottom: 8),
            child: Row(
              children: [
                Text(m.avatar, style: const TextStyle(fontSize: 22)),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    m.name,
                    style: const TextStyle(
                      fontWeight: FontWeight.w800,
                      color: _fitilaInk,
                    ),
                  ),
                ),
                if (m.isTurn)
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 4,
                    ),
                    decoration: BoxDecoration(
                      color: _fitilaPrimarySoft,
                      borderRadius: BorderRadius.circular(99),
                    ),
                    child: const Text(
                      'Son tour',
                      style: TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.w900,
                        color: _fitilaGoldDeep,
                      ),
                    ),
                  ),
                const SizedBox(width: 6),
                Icon(
                  m.hasPaid
                      ? Icons.check_circle_rounded
                      : Icons.hourglass_bottom_rounded,
                  color: m.hasPaid ? _fitilaSage : _fitilaMuted,
                  size: 18,
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _creditBody(BuildContext context) {
    return _TCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Micro-crédit disponible',
            style: TextStyle(fontWeight: FontWeight.w900, color: _fitilaInk),
          ),
          const SizedBox(height: 6),
          const Text(
            'Jusqu’à 500 000 F à 2% mensuel.',
            style: TextStyle(fontSize: 12, color: _fitilaMuted),
          ),
          const SizedBox(height: 10),
          FilledButton.icon(
            onPressed: () => ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(
                content: Text(
                  '📞 Demande de crédit enregistrée. '
                  'Un conseiller vous contactera.',
                ),
              ),
            ),
            icon: const Icon(Icons.call_rounded),
            label: const Text('Demander'),
          ),
        ],
      ),
    );
  }

  Widget _epargneBody() {
    const balance = 125000;
    const goal = 500000;
    const progress = balance / goal;
    return _TCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Épargne',
            style: TextStyle(fontWeight: FontWeight.w900, color: _fitilaInk),
          ),
          const SizedBox(height: 6),
          const Text(
            '$balance F',
            style: TextStyle(
              fontFamily: 'serif',
              fontSize: 22,
              fontWeight: FontWeight.w700,
              color: _fitilaInk,
            ),
          ),
          const SizedBox(height: 6),
          const Text(
            'Objectif : $goal F',
            style: TextStyle(fontSize: 11.5, color: _fitilaMuted),
          ),
          const SizedBox(height: 10),
          ClipRRect(
            borderRadius: BorderRadius.circular(99),
            child: const LinearProgressIndicator(
              value: progress,
              minHeight: 8,
              backgroundColor: _fitilaSurfaceAlt,
              color: _fitilaSage,
            ),
          ),
        ],
      ),
    );
  }
}

// =====================================================================
// Santé
// =====================================================================

class _HealthContact {
  const _HealthContact(this.icon, this.name, this.phone);
  final String icon;
  final String name;
  final String phone;
}

const _healthEmergencyContacts = [
  _HealthContact('🚑', 'SAMU Bénin', '112'),
  _HealthContact('🏥', 'Centre de Santé', '+22921300000'),
  _HealthContact('💊', 'Pharmacie de garde', '+22921312233'),
];

class _HealthSection {
  const _HealthSection(
    this.id,
    this.label,
    this.icon, {
    this.isEmergency = false,
  });
  final String id;
  final String label;
  final IconData icon;
  final bool isEmergency;
}

const _healthSections = [
  _HealthSection('first_aid', 'Premiers secours', Icons.emergency_rounded),
  _HealthSection('medication', 'Médicaments', Icons.medication_rounded),
  _HealthSection('maternity', 'Maternité', Icons.pregnant_woman_rounded),
  _HealthSection('diseases', 'Maladies', Icons.coronavirus_rounded),
  _HealthSection('nutrition', 'Nutrition', Icons.restaurant_rounded),
  _HealthSection(
    'emergency',
    'Appeler médecin',
    Icons.local_hospital_rounded,
    isEmergency: true,
  ),
];

Future<void> _dialPhone(String phone) async {
  final uri = Uri(scheme: 'tel', path: phone);
  await launchUrl(uri);
}

class HealthScreen extends StatelessWidget {
  const HealthScreen({super.key});

  void _openSection(BuildContext context, _HealthSection section) {
    if (section.id == 'emergency') {
      showModalBottomSheet<void>(
        context: context,
        showDragHandle: true,
        builder: (sheetContext) => Padding(
          padding: const EdgeInsets.fromLTRB(18, 0, 18, 24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Text(
                'En cas d’urgence grave, appelez le 112',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontWeight: FontWeight.w900,
                  color: _fitilaClay,
                ),
              ),
              const SizedBox(height: 12),
              ..._healthEmergencyContacts.map(
                (c) => ListTile(
                  leading: Text(c.icon, style: const TextStyle(fontSize: 22)),
                  title: Text(c.name),
                  subtitle: Text(c.phone),
                  trailing: const Icon(Icons.call_rounded, color: _fitilaSage),
                  onTap: () => _dialPhone(c.phone),
                ),
              ),
            ],
          ),
        ),
      );
      return;
    }
    _openAssistantSheet(
      context,
      contextKey: 'health_${section.id}',
      title: section.label,
      welcomeFr: 'Bonjour ! Décrivez votre question sur : ${section.label}.',
      icon: section.icon,
      accent: _fitilaClay,
    );
  }

  @override
  Widget build(BuildContext context) {
    return _PageFrame(
      title: 'Santé',
      subtitle: 'Santé, prévention et assistance',
      child: ListView(
        children: [
          Container(
            padding: const EdgeInsets.all(13),
            decoration: BoxDecoration(
              color: const Color(0xFFF6E3DC),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: _fitilaClay.withValues(alpha: .35)),
            ),
            child: const Row(
              children: [
                Icon(Icons.emergency_rounded, color: _fitilaClay),
                SizedBox(width: 10),
                Expanded(
                  child: Text(
                    'En cas d’urgence grave, appelez immédiatement le 112.',
                    style: TextStyle(
                      fontSize: 11.5,
                      fontWeight: FontWeight.w700,
                      color: _fitilaClay,
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),
          GridView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: _healthSections.length,
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 2,
              mainAxisExtent: 108,
              crossAxisSpacing: 10,
              mainAxisSpacing: 10,
            ),
            itemBuilder: (context, index) {
              final s = _healthSections[index];
              return Material(
                color: _fitilaCard,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(18),
                  side: BorderSide(
                    color: s.isEmergency ? _fitilaClay : _fitilaBorder,
                    width: s.isEmergency ? 1.4 : 1,
                  ),
                ),
                clipBehavior: Clip.antiAlias,
                child: InkWell(
                  onTap: () => _openSection(context, s),
                  child: Padding(
                    padding: const EdgeInsets.all(12),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Icon(
                          s.icon,
                          color: s.isEmergency ? _fitilaClay : _fitilaSage,
                          size: 24,
                        ),
                        const Spacer(),
                        Text(
                          s.label,
                          maxLines: 2,
                          style: TextStyle(
                            fontWeight: FontWeight.w800,
                            fontSize: 12.5,
                            color: s.isEmergency ? _fitilaClay : _fitilaInk,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              );
            },
          ),
        ],
      ),
    );
  }
}

// =====================================================================
// SOS
// =====================================================================

class _SosContact {
  const _SosContact(this.avatar, this.label);
  final String avatar;
  final String label;
}

const _sosContacts = [
  _SosContact('👨‍👩‍👧', 'Famille'),
  _SosContact('🏥', 'Hôpital'),
  _SosContact('👮', 'Police'),
];

class SosScreen extends StatefulWidget {
  const SosScreen({super.key});

  @override
  State<SosScreen> createState() => _SosScreenState();
}

class _SosScreenState extends State<SosScreen> {
  bool _activated = false;
  int _countdown = 3;
  Timer? _timer;

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  void _toggle() {
    if (_activated) {
      _timer?.cancel();
      setState(() {
        _activated = false;
        _countdown = 3;
      });
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Alerte annulée.')));
      return;
    }
    setState(() {
      _activated = true;
      _countdown = 3;
    });
    _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (_countdown <= 1) {
        timer.cancel();
        _sendAlert();
      } else {
        setState(() => _countdown -= 1);
      }
    });
  }

  Future<void> _sendAlert() async {
    if (!mounted) {
      return;
    }
    setState(() => _countdown = 0);
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('🆘 Alerte envoyée. Appel des secours (112)...'),
      ),
    );
    await _dialPhone('112');
  }

  @override
  Widget build(BuildContext context) {
    return _PageFrame(
      title: 'SOS',
      subtitle: 'Alerte rapide et contacts de confiance',
      child: ListView(
        children: [
          Center(
            child: Column(
              children: [
                const SizedBox(height: 12),
                GestureDetector(
                  onTap: _toggle,
                  child: Container(
                    width: 168,
                    height: 168,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: _fitilaClay.withValues(
                        alpha: _activated ? 1 : .92,
                      ),
                      boxShadow: [
                        BoxShadow(
                          color: _fitilaClay.withValues(alpha: .35),
                          blurRadius: 30,
                          spreadRadius: _activated ? 10 : 2,
                        ),
                      ],
                    ),
                    alignment: Alignment.center,
                    child: Text(
                      _activated ? '$_countdown' : 'SOS',
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 34,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 12),
                Text(
                  _activated
                      ? 'Touchez à nouveau pour annuler'
                      : 'Touchez pour déclencher une alerte',
                  style: const TextStyle(color: _fitilaMuted, fontSize: 12),
                ),
              ],
            ),
          ),
          const SizedBox(height: 18),
          const Text(
            'Contacts de confiance',
            style: TextStyle(
              fontWeight: FontWeight.w900,
              color: _fitilaInk,
              fontSize: 13.5,
            ),
          ),
          const SizedBox(height: 8),
          ..._sosContacts.map(
            (c) => _TCard(
              margin: const EdgeInsets.only(bottom: 8),
              child: Row(
                children: [
                  Text(c.avatar, style: const TextStyle(fontSize: 22)),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      c.label,
                      style: const TextStyle(
                        fontWeight: FontWeight.w800,
                        color: _fitilaInk,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
          OutlinedButton.icon(
            onPressed: () => ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(
                content: Text(
                  'Ajout de contacts personnalisés bientôt disponible.',
                ),
              ),
            ),
            icon: const Icon(Icons.person_add_alt_rounded),
            label: const Text('Ajouter un contact'),
          ),
        ],
      ),
    );
  }
}

// =====================================================================
// Marché
// =====================================================================

class _MarketCategory {
  const _MarketCategory(this.emoji, this.label, this.value);
  final String emoji;
  final String label;
  final String value;
}

const _marketProductCategories = [
  _MarketCategory('🍅', 'Tomates', 'tomates'),
  _MarketCategory('🐔', 'Poulet', 'poulet'),
  _MarketCategory('🌽', 'Maïs', 'mais'),
  _MarketCategory('🍚', 'Riz', 'riz'),
  _MarketCategory('👕', 'Vêtements', 'vetements'),
  _MarketCategory('🎨', 'Artisanat', 'artisanat'),
];

const _marketJobOfferCategories = [
  _MarketCategory('🌾', 'Agriculteur', 'farmer'),
  _MarketCategory('🧱', 'Maçon', 'mason'),
  _MarketCategory('🏠', 'Domestique', 'domestic'),
  _MarketCategory('🚗', 'Chauffeur', 'driver'),
];

const _marketJobDemandCategories = [
  _MarketCategory('🌾', 'Travail des champs', 'farm_work'),
  _MarketCategory('🧱', 'Construction', 'construction'),
  _MarketCategory('🛒', 'Commerce', 'commerce'),
  _MarketCategory('🙋', 'Tout travail', 'any_work'),
];

enum _MarketTab { buy, sell, work, hire, mine }

extension on _MarketTab {
  String get label => switch (this) {
    _MarketTab.buy => 'Acheter',
    _MarketTab.sell => 'Vendre',
    _MarketTab.work => 'Emploi',
    _MarketTab.hire => 'Recruter',
    _MarketTab.mine => 'Mon espace',
  };
}

class MarketScreen extends StatefulWidget {
  const MarketScreen({super.key});

  @override
  State<MarketScreen> createState() => _MarketScreenState();
}

class _MarketScreenState extends State<MarketScreen> {
  _MarketTab _tab = _MarketTab.buy;

  @override
  Widget build(BuildContext context) {
    return _PageFrame(
      title: 'Marché',
      subtitle: 'Produits, jobs et annonces du marché',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            height: 40,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              itemCount: _MarketTab.values.length,
              separatorBuilder: (_, _) => const SizedBox(width: 7),
              itemBuilder: (context, index) {
                final tab = _MarketTab.values[index];
                return ChoiceChip(
                  selected: _tab == tab,
                  label: Text(tab.label),
                  onSelected: (_) => setState(() => _tab = tab),
                );
              },
            ),
          ),
          const SizedBox(height: 12),
          Expanded(
            child: switch (_tab) {
              _MarketTab.buy => const _MarketBuyTab(),
              _MarketTab.sell => const _MarketSellTab(),
              _MarketTab.work => const _MarketJobsTab(jobType: 'offer'),
              _MarketTab.hire => const _MarketJobsTab(jobType: 'demand'),
              _MarketTab.mine => const _MarketMineTab(),
            },
          ),
        ],
      ),
    );
  }
}

class _MarketProductCard extends StatelessWidget {
  const _MarketProductCard({required this.product, required this.onTap});

  final Map<String, dynamic> product;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final title = (product['title_fr'] ?? product['title'] ?? 'Produit')
        .toString();
    final price = product['price'];
    final emoji = (product['emoji_icon'] ?? '🛒').toString();
    return Material(
      color: _fitilaCard,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(18),
        side: const BorderSide(color: _fitilaBorder),
      ),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(emoji, style: const TextStyle(fontSize: 26)),
              const Spacer(),
              Text(
                title,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                  fontWeight: FontWeight.w800,
                  fontSize: 12.5,
                  color: _fitilaInk,
                ),
              ),
              const SizedBox(height: 3),
              Text(
                '${price ?? '—'} FCFA',
                style: const TextStyle(
                  fontWeight: FontWeight.w900,
                  fontSize: 12,
                  color: _fitilaGoldDeep,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

void _showProductDetail(BuildContext context, Map<String, dynamic> product) {
  final phone = product['seller_phone']?.toString();
  showModalBottomSheet<void>(
    context: context,
    showDragHandle: true,
    builder: (sheetContext) => Padding(
      padding: const EdgeInsets.fromLTRB(18, 0, 18, 24),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            (product['title_fr'] ?? product['title'] ?? 'Produit').toString(),
            style: const TextStyle(
              fontWeight: FontWeight.w900,
              fontSize: 16,
              color: _fitilaInk,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            '${product['price'] ?? '—'} FCFA',
            style: const TextStyle(
              fontWeight: FontWeight.w900,
              color: _fitilaGoldDeep,
              fontSize: 16,
            ),
          ),
          if ((product['description_text'] ?? '').toString().isNotEmpty) ...[
            const SizedBox(height: 8),
            Text(
              product['description_text'].toString(),
              style: const TextStyle(color: _fitilaMuted, fontSize: 12.5),
            ),
          ],
          const SizedBox(height: 14),
          if (phone != null && phone.isNotEmpty)
            SizedBox(
              width: double.infinity,
              child: FilledButton.icon(
                onPressed: () => _dialPhone(phone),
                icon: const Icon(Icons.call_rounded),
                label: const Text('Contacter le vendeur'),
              ),
            )
          else
            const Text(
              'Aucun contact renseigné pour ce produit.',
              style: TextStyle(color: _fitilaMuted, fontSize: 11.5),
            ),
        ],
      ),
    ),
  );
}

class _MarketBuyTab extends StatefulWidget {
  const _MarketBuyTab();

  @override
  State<_MarketBuyTab> createState() => _MarketBuyTabState();
}

class _MarketBuyTabState extends State<_MarketBuyTab> {
  late Future<List<Map<String, dynamic>>> _future;
  final _search = TextEditingController();

  @override
  void initState() {
    super.initState();
    _future = FitilaBackend.fetchProducts();
  }

  @override
  void dispose() {
    _search.dispose();
    super.dispose();
  }

  void _runSearch() {
    setState(() => _future = FitilaBackend.searchProducts(_search.text));
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        TextField(
          controller: _search,
          decoration: InputDecoration(
            hintText: 'Rechercher un produit...',
            prefixIcon: const Icon(Icons.search_rounded),
            suffixIcon: IconButton(
              icon: const Icon(Icons.arrow_forward_rounded),
              onPressed: _runSearch,
            ),
          ),
          onSubmitted: (_) => _runSearch(),
        ),
        const SizedBox(height: 10),
        Expanded(
          child: FutureBuilder<List<Map<String, dynamic>>>(
            future: _future,
            builder: (context, snapshot) {
              if (snapshot.connectionState == ConnectionState.waiting) {
                return const Center(child: CircularProgressIndicator());
              }
              if (snapshot.hasError) {
                return _TeacherErrorState(
                  message: snapshot.error.toString(),
                  onRetry: () async =>
                      setState(() => _future = FitilaBackend.fetchProducts()),
                );
              }
              final products = snapshot.data ?? const [];
              if (products.isEmpty) {
                return const Center(
                  child: Text(
                    'Aucun produit disponible pour le moment.',
                    style: TextStyle(color: _fitilaMuted),
                  ),
                );
              }
              return GridView.builder(
                itemCount: products.length,
                gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: 2,
                  mainAxisExtent: 128,
                  crossAxisSpacing: 10,
                  mainAxisSpacing: 10,
                ),
                itemBuilder: (context, index) {
                  final product = products[index];
                  return _MarketProductCard(
                    product: product,
                    onTap: () => _showProductDetail(context, product),
                  );
                },
              );
            },
          ),
        ),
      ],
    );
  }
}

class _MarketSellTab extends StatefulWidget {
  const _MarketSellTab();

  @override
  State<_MarketSellTab> createState() => _MarketSellTabState();
}

class _MarketSellTabState extends State<_MarketSellTab> {
  final _title = TextEditingController();
  final _price = TextEditingController();
  final _description = TextEditingController();
  _MarketCategory _category = _marketProductCategories.first;
  XFile? _photo;
  bool _busy = false;

  @override
  void dispose() {
    _title.dispose();
    _price.dispose();
    _description.dispose();
    super.dispose();
  }

  Future<void> _pickPhoto() async {
    final file = await ImagePicker().pickImage(
      source: ImageSource.gallery,
      imageQuality: 82,
      maxWidth: 1400,
    );
    if (file != null) {
      setState(() => _photo = file);
    }
  }

  Future<void> _submit() async {
    final title = _title.text.trim();
    final priceValue = double.tryParse(_price.text.trim());
    if (title.isEmpty || priceValue == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Indiquez un titre et un prix valides.')),
      );
      return;
    }
    if (!FitilaBackend.configured) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Serveur FITILA indisponible.')),
      );
      return;
    }
    setState(() => _busy = true);
    try {
      Uint8List? bytes;
      String ext = 'jpg';
      if (_photo != null) {
        bytes = await _photo!.readAsBytes();
        ext = _photo!.name.contains('.')
            ? _photo!.name.split('.').last.toLowerCase()
            : 'jpg';
      }
      await FitilaBackend.createProduct(
        titleFr: title,
        price: priceValue,
        category: _category.value,
        descriptionText: _description.text.trim().isEmpty
            ? null
            : _description.text.trim(),
        emojiIcon: _category.emoji,
        photoBytes: bytes,
        photoExtension: ext,
      );
      if (!mounted) {
        return;
      }
      _title.clear();
      _price.clear();
      _description.clear();
      setState(() => _photo = null);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('✅ Produit publié sur le marché.')),
      );
    } on AuthException {
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Connectez-vous pour publier un produit.'),
        ),
      );
    } catch (_) {
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Publication impossible. Réessayez.')),
      );
    } finally {
      if (mounted) {
        setState(() => _busy = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return ListView(
      children: [
        const Text(
          'Catégorie',
          style: TextStyle(fontWeight: FontWeight.w800, color: _fitilaInk),
        ),
        const SizedBox(height: 8),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: _marketProductCategories
              .map(
                (c) => ChoiceChip(
                  label: Text('${c.emoji} ${c.label}'),
                  selected: _category.value == c.value,
                  onSelected: (_) => setState(() => _category = c),
                ),
              )
              .toList(),
        ),
        const SizedBox(height: 14),
        TextField(
          controller: _title,
          decoration: const InputDecoration(labelText: 'Titre du produit'),
        ),
        const SizedBox(height: 10),
        TextField(
          controller: _price,
          keyboardType: const TextInputType.numberWithOptions(decimal: true),
          decoration: const InputDecoration(labelText: 'Prix (FCFA)'),
        ),
        const SizedBox(height: 10),
        TextField(
          controller: _description,
          minLines: 2,
          maxLines: 4,
          decoration: const InputDecoration(
            labelText: 'Description (optionnel)',
          ),
        ),
        const SizedBox(height: 10),
        OutlinedButton.icon(
          onPressed: _pickPhoto,
          icon: const Icon(Icons.photo_camera_rounded),
          label: Text(
            _photo == null ? 'Ajouter une photo' : 'Photo sélectionnée',
          ),
        ),
        const SizedBox(height: 14),
        SizedBox(
          width: double.infinity,
          child: FilledButton.icon(
            onPressed: _busy ? null : _submit,
            icon: _busy
                ? const SizedBox(
                    width: 16,
                    height: 16,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      color: Colors.white,
                    ),
                  )
                : const Icon(Icons.storefront_rounded),
            label: const Text('Publier le produit'),
          ),
        ),
      ],
    );
  }
}

class _MarketJobsTab extends StatefulWidget {
  const _MarketJobsTab({required this.jobType});

  final String jobType;

  @override
  State<_MarketJobsTab> createState() => _MarketJobsTabState();
}

class _MarketJobsTabState extends State<_MarketJobsTab> {
  late Future<List<Map<String, dynamic>>> _future;

  @override
  void initState() {
    super.initState();
    _future = FitilaBackend.fetchJobs(jobType: widget.jobType);
  }

  void _refresh() {
    setState(() => _future = FitilaBackend.fetchJobs(jobType: widget.jobType));
  }

  Future<void> _createQuick(_MarketCategory category) async {
    if (!FitilaBackend.configured) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Serveur FITILA indisponible.')),
      );
      return;
    }
    try {
      await FitilaBackend.createJob(
        titleFr: category.label,
        jobType: widget.jobType,
        category: category.value,
        emojiIcon: category.emoji,
      );
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('✅ Annonce "${category.label}" publiée.')),
      );
      _refresh();
    } on AuthException {
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Connectez-vous pour publier une annonce.'),
        ),
      );
    } catch (_) {
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Publication impossible. Réessayez.')),
      );
    }
  }

  Future<void> _apply(String jobId) async {
    try {
      await FitilaBackend.applyToJob(jobId);
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('✅ Candidature envoyée.')));
    } on AuthException {
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Connectez-vous pour postuler.')),
      );
    } on StateError catch (e) {
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(e.message)));
    } catch (_) {
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Candidature impossible. Réessayez.')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final isOffer = widget.jobType == 'offer';
    final quickCategories = isOffer
        ? _marketJobDemandCategories
        : _marketJobOfferCategories;
    return ListView(
      children: [
        Text(
          isOffer
              ? 'Publier une recherche d’emploi'
              : 'Publier une offre d’emploi',
          style: const TextStyle(
            fontWeight: FontWeight.w800,
            color: _fitilaInk,
          ),
        ),
        const SizedBox(height: 8),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: quickCategories
              .map(
                (c) => ActionChip(
                  avatar: Text(c.emoji),
                  label: Text(c.label),
                  onPressed: () => _createQuick(c),
                ),
              )
              .toList(),
        ),
        const SizedBox(height: 14),
        Text(
          isOffer ? 'Offres disponibles' : 'Personnes disponibles',
          style: const TextStyle(
            fontWeight: FontWeight.w800,
            color: _fitilaInk,
          ),
        ),
        const SizedBox(height: 8),
        FutureBuilder<List<Map<String, dynamic>>>(
          future: _future,
          builder: (context, snapshot) {
            if (snapshot.connectionState == ConnectionState.waiting) {
              return const Padding(
                padding: EdgeInsets.symmetric(vertical: 24),
                child: Center(child: CircularProgressIndicator()),
              );
            }
            if (snapshot.hasError) {
              return _TeacherErrorState(
                message: snapshot.error.toString(),
                onRetry: () async => _refresh(),
              );
            }
            final jobs = snapshot.data ?? const [];
            if (jobs.isEmpty) {
              return const Padding(
                padding: EdgeInsets.symmetric(vertical: 16),
                child: Text(
                  'Aucune annonce pour le moment.',
                  style: TextStyle(color: _fitilaMuted),
                ),
              );
            }
            return Column(
              children: jobs
                  .map(
                    (job) => _TCard(
                      margin: const EdgeInsets.only(bottom: 8),
                      child: Row(
                        children: [
                          Text(
                            (job['emoji_icon'] ?? '💼').toString(),
                            style: const TextStyle(fontSize: 22),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  (job['title_fr'] ?? job['title'] ?? '—')
                                      .toString(),
                                  style: const TextStyle(
                                    fontWeight: FontWeight.w800,
                                    color: _fitilaInk,
                                  ),
                                ),
                                if ((job['location'] ?? '')
                                    .toString()
                                    .isNotEmpty)
                                  Text(
                                    job['location'].toString(),
                                    style: const TextStyle(
                                      fontSize: 10.5,
                                      color: _fitilaMuted,
                                    ),
                                  ),
                              ],
                            ),
                          ),
                          if (isOffer)
                            FilledButton(
                              onPressed: () => _apply(job['id'].toString()),
                              child: const Text('Postuler'),
                            )
                          else
                            OutlinedButton(
                              onPressed: () {
                                final phone = job['contact_phone']?.toString();
                                if (phone != null && phone.isNotEmpty) {
                                  _dialPhone(phone);
                                } else {
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    const SnackBar(
                                      content: Text('Aucun contact renseigné.'),
                                    ),
                                  );
                                }
                              },
                              child: const Text('Contacter'),
                            ),
                        ],
                      ),
                    ),
                  )
                  .toList(),
            );
          },
        ),
      ],
    );
  }
}

class _MarketMineTab extends StatefulWidget {
  const _MarketMineTab();

  @override
  State<_MarketMineTab> createState() => _MarketMineTabState();
}

class _MarketMineTabState extends State<_MarketMineTab> {
  late Future<List<List<Map<String, dynamic>>>> _future;

  @override
  void initState() {
    super.initState();
    _future = _load();
  }

  Future<List<List<Map<String, dynamic>>>> _load() {
    return Future.wait([
      FitilaBackend.fetchMyProducts(),
      FitilaBackend.fetchMyJobs(),
    ]);
  }

  Future<void> _deleteProduct(String id) async {
    try {
      await FitilaBackend.deleteProduct(id);
      if (!mounted) {
        return;
      }
      setState(() => _future = _load());
    } catch (_) {
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Suppression impossible.')));
    }
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<List<List<Map<String, dynamic>>>>(
      future: _future,
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Center(child: CircularProgressIndicator());
        }
        if (snapshot.hasError) {
          return _TeacherErrorState(
            message: snapshot.error.toString(),
            onRetry: () async => setState(() => _future = _load()),
          );
        }
        final products = snapshot.data?[0] ?? const [];
        final jobs = snapshot.data?[1] ?? const [];
        return ListView(
          children: [
            const Text(
              'Mes produits',
              style: TextStyle(fontWeight: FontWeight.w900, color: _fitilaInk),
            ),
            const SizedBox(height: 8),
            if (products.isEmpty)
              const Padding(
                padding: EdgeInsets.only(bottom: 12),
                child: Text(
                  'Vous n’avez pas encore publié de produit.',
                  style: TextStyle(color: _fitilaMuted, fontSize: 12),
                ),
              )
            else
              ...products.map(
                (p) => _TCard(
                  margin: const EdgeInsets.only(bottom: 8),
                  child: Row(
                    children: [
                      Text(
                        (p['emoji_icon'] ?? '🛒').toString(),
                        style: const TextStyle(fontSize: 22),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              (p['title_fr'] ?? p['title'] ?? '—').toString(),
                              style: const TextStyle(
                                fontWeight: FontWeight.w800,
                                color: _fitilaInk,
                              ),
                            ),
                            Text(
                              '${p['price'] ?? '—'} FCFA · ${p['status'] ?? 'available'}',
                              style: const TextStyle(
                                fontSize: 10.5,
                                color: _fitilaMuted,
                              ),
                            ),
                          ],
                        ),
                      ),
                      IconButton(
                        onPressed: () => _deleteProduct(p['id'].toString()),
                        icon: const Icon(
                          Icons.delete_outline_rounded,
                          color: _fitilaClay,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            const SizedBox(height: 16),
            const Text(
              'Mes annonces d’emploi',
              style: TextStyle(fontWeight: FontWeight.w900, color: _fitilaInk),
            ),
            const SizedBox(height: 8),
            if (jobs.isEmpty)
              const Text(
                'Vous n’avez pas encore publié d’annonce.',
                style: TextStyle(color: _fitilaMuted, fontSize: 12),
              )
            else
              ...jobs.map(
                (j) => _TCard(
                  margin: const EdgeInsets.only(bottom: 8),
                  child: Row(
                    children: [
                      Text(
                        (j['emoji_icon'] ?? '💼').toString(),
                        style: const TextStyle(fontSize: 22),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Text(
                          (j['title_fr'] ?? j['title'] ?? '—').toString(),
                          style: const TextStyle(
                            fontWeight: FontWeight.w800,
                            color: _fitilaInk,
                          ),
                        ),
                      ),
                      Text(
                        j['job_type'] == 'offer' ? 'Offre' : 'Recherche',
                        style: const TextStyle(
                          fontSize: 10.5,
                          color: _fitilaMuted,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
          ],
        );
      },
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
      if (mounted) {
        setState(() {});
      }
    });
  }

  @override
  void dispose() {
    _query.dispose();
    super.dispose();
  }

  List<DictionaryEntry> _matches(List<DictionaryEntry> entries) {
    final q = _query.text.trim().toLowerCase();
    if (q.isEmpty) {
      return const [];
    }
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
      if (exact.length + starts.length + contains.length >= 24) {
        break;
      }
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
          side: BorderSide(color: selected ? _fitilaPrimary : _fitilaBorder),
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
                                  icon: const Icon(Icons.keyboard_alt_rounded),
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
                        style: TextStyle(color: _fitilaMuted, height: 1.4),
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

  String get _sourceLabel => _direction == TranslationDirection.frenchToBariba
      ? '🇫🇷 Français'
      : '🇧🇯 Bàátɔ̀nú';

  String get _targetLabel => _direction == TranslationDirection.frenchToBariba
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
    if (!_autoDetect || value.trim().length < 3) {
      return;
    }
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
    if (source.isEmpty || _busy) {
      return;
    }
    setState(() => _busy = true);
    try {
      final translated = await FitilaServices.translate(
        source,
        _direction,
        accessToken: widget.accessToken,
      );
      if (!mounted) {
        return;
      }
      setState(() {
        _output.text = translated;
        if (translated.isNotEmpty) {
          _history.insert(0, (source: source, result: translated));
          if (_history.length > 20) {
            _history.removeLast();
          }
        }
      });
      if (translated.isNotEmpty && FitilaBackend.configured) {
        FitilaBackend.saveTranslationHistory(
          sourceLang: _direction == TranslationDirection.frenchToBariba
              ? 'fr'
              : 'ba',
          targetLang: _direction == TranslationDirection.frenchToBariba
              ? 'ba'
              : 'fr',
          sourceText: source,
          translatedText: translated,
          mode: _mode,
        ).catchError((_) => <String, dynamic>{});
      }
    } catch (error) {
      if (!mounted) {
        return;
      }
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
      if (mounted) {
        setState(() => _busy = false);
      }
    }
  }

  Future<void> _pasteAndTranslate() async {
    final data = await Clipboard.getData(Clipboard.kTextPlain);
    final text = data?.text?.trim() ?? '';
    if (text.isEmpty) {
      if (!mounted) {
        return;
      }
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
    if (file == null) {
      return;
    }
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
    if (selection == null || selection.files.isEmpty) {
      return;
    }
    final file = selection.files.first;
    final bytes = file.bytes;
    if (bytes == null) {
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Impossible de lire le document.')),
      );
      return;
    }
    await _ocrTranslate(bytes, file.name);
  }

  Future<void> _ocrTranslate(List<int> bytes, String fileName) async {
    if (_busy) {
      return;
    }
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
      if (!mounted) {
        return;
      }
      setState(() {
        _input.text = extracted;
        _output.text = translation;
        if (extracted.isNotEmpty || translation.isNotEmpty) {
          _history.insert(0, (
            source: extracted.isEmpty ? fileName : extracted,
            result: translation,
          ));
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
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text(
            'Lecture du document impossible. Vérifiez le réseau puis réessayez.',
          ),
        ),
      );
    } finally {
      if (mounted) {
        setState(() => _busy = false);
      }
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
          border: Border.all(color: selected ? tone : _fitilaBorder),
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
            Icon(icon, size: 21, color: selected ? Colors.white : _fitilaMuted),
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
            style: TextStyle(color: _fitilaMuted, fontSize: 14),
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
      action: IconButton(
        tooltip: 'Historique et favoris',
        icon: const Icon(Icons.history_rounded),
        onPressed: () => Navigator.of(context).push(
          MaterialPageRoute(builder: (_) => const TranslationHistoryScreen()),
        ),
      ),
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
                        selected:
                            _direction == TranslationDirection.frenchToBariba,
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
                        selected:
                            _direction == TranslationDirection.baribaToFrench,
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
              keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
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
                              child: CircularProgressIndicator(strokeWidth: 2),
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
                            if (!mounted) {
                              return;
                            }
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
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'Historique récent',
                        style: TextStyle(
                          color: _fitilaMuted,
                          fontSize: 12,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                      TextButton(
                        onPressed: () => Navigator.of(context).push(
                          MaterialPageRoute(
                            builder: (_) => const TranslationHistoryScreen(),
                          ),
                        ),
                        child: const Text(
                          'Tout voir',
                          style: TextStyle(fontSize: 11.5),
                        ),
                      ),
                    ],
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

class TranslationHistoryScreen extends StatefulWidget {
  const TranslationHistoryScreen({super.key});

  @override
  State<TranslationHistoryScreen> createState() =>
      _TranslationHistoryScreenState();
}

class _TranslationHistoryScreenState extends State<TranslationHistoryScreen> {
  bool _favoritesOnly = false;
  String _search = '';
  late Future<List<Map<String, dynamic>>> _future;

  @override
  void initState() {
    super.initState();
    _future = _load();
  }

  Future<List<Map<String, dynamic>>> _load() {
    return FitilaBackend.fetchTranslationHistory(
      favoritesOnly: _favoritesOnly,
      search: _search.isEmpty ? null : _search,
    );
  }

  void _reload() => setState(() => _future = _load());

  @override
  Widget build(BuildContext context) {
    return _PageFrame(
      title: 'Historique',
      subtitle: 'Vos traductions récentes et favorites.',
      child: Column(
        children: [
          Row(
            children: [
              ChoiceChip(
                selected: !_favoritesOnly,
                label: const Text('Tous'),
                onSelected: (_) {
                  _favoritesOnly = false;
                  _reload();
                },
              ),
              const SizedBox(width: 8),
              ChoiceChip(
                selected: _favoritesOnly,
                avatar: const Icon(Icons.star_rounded, size: 16),
                label: const Text('Favoris'),
                onSelected: (_) {
                  _favoritesOnly = true;
                  _reload();
                },
              ),
            ],
          ),
          const SizedBox(height: 10),
          TextField(
            decoration: const InputDecoration(
              hintText: 'Rechercher dans l\'historique…',
              prefixIcon: Icon(Icons.search_rounded),
              isDense: true,
            ),
            onChanged: (value) {
              _search = value;
              _reload();
            },
          ),
          const SizedBox(height: 12),
          Expanded(
            child: FutureBuilder<List<Map<String, dynamic>>>(
              future: _future,
              builder: (context, snap) {
                if (snap.connectionState != ConnectionState.done) {
                  return const Center(
                    child: CircularProgressIndicator(color: _fitilaPrimary),
                  );
                }
                if (snap.hasError) {
                  return Center(
                    child: Text(
                      'Erreur : ${snap.error}',
                      style: const TextStyle(color: _fitilaMuted),
                    ),
                  );
                }
                final items = snap.data ?? const [];
                if (items.isEmpty) {
                  return const Center(
                    child: Padding(
                      padding: EdgeInsets.all(24),
                      child: Text(
                        'Aucune traduction pour le moment.',
                        style: TextStyle(color: _fitilaMuted),
                      ),
                    ),
                  );
                }
                return RefreshIndicator(
                  onRefresh: () async => _reload(),
                  color: _fitilaPrimary,
                  child: ListView.separated(
                    itemCount: items.length,
                    separatorBuilder: (_, _) => const SizedBox(height: 8),
                    itemBuilder: (context, i) {
                      final item = items[i];
                      final isFav = item['is_favorite'] as bool? ?? false;
                      return Material(
                        color: _fitilaCard,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(14),
                          side: const BorderSide(color: _fitilaBorder),
                        ),
                        child: Padding(
                          padding: const EdgeInsets.all(12),
                          child: Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      '${item['source_lang']} → ${item['target_lang']}',
                                      style: const TextStyle(
                                        fontSize: 9.5,
                                        color: _fitilaMuted,
                                        fontWeight: FontWeight.w800,
                                      ),
                                    ),
                                    const SizedBox(height: 4),
                                    Text(
                                      item['source_text']?.toString() ?? '',
                                      style: const TextStyle(
                                        fontWeight: FontWeight.w700,
                                        fontSize: 13,
                                      ),
                                    ),
                                    const SizedBox(height: 3),
                                    Text(
                                      item['translated_text']?.toString() ?? '',
                                      style: const TextStyle(
                                        color: _fitilaInkSoft,
                                        fontSize: 12.5,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              IconButton(
                                icon: Icon(
                                  isFav
                                      ? Icons.star_rounded
                                      : Icons.star_border_rounded,
                                  color: isFav ? _fitilaGoldDeep : _fitilaMuted,
                                ),
                                onPressed: () async {
                                  await FitilaBackend.toggleTranslationFavorite(
                                    item['id'] as String,
                                    !isFav,
                                  );
                                  _reload();
                                },
                              ),
                              IconButton(
                                icon: const Icon(
                                  Icons.delete_outline_rounded,
                                  size: 19,
                                  color: _fitilaMuted,
                                ),
                                onPressed: () async {
                                  await FitilaBackend.deleteTranslationHistoryEntry(
                                    item['id'] as String,
                                  );
                                  _reload();
                                },
                              ),
                            ],
                          ),
                        ),
                      );
                    },
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

class AiScreen extends StatefulWidget {
  const AiScreen({super.key});

  @override
  State<AiScreen> createState() => _AiScreenState();
}

class _AiChatMessage {
  _AiChatMessage({required this.role, required this.text});

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
    FitilaServices.loadDictionary()
        .then((value) {
          if (mounted) {
            setState(() => _dictionary = value);
          }
        })
        .catchError((_) {});
    _message.addListener(() {
      if (mounted) {
        setState(() {});
      }
    });
  }

  @override
  void dispose() {
    _message.dispose();
    super.dispose();
  }

  List<DictionaryEntry> get _suggestions {
    final current = _message.text.trim().split(RegExp(r'\s+')).lastOrNull ?? '';
    if (current.isEmpty) {
      return const [];
    }
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

  List<DictionaryEntry> _phoneticMatches(String text) {
    if (_dictionary.isEmpty) {
      return const [];
    }
    final tokens = text
        .toLowerCase()
        .split(RegExp(r'[^\wɛɔŋɲãẽĩũǹáàéèíìóòúù]+'))
        .where((t) => t.length > 1)
        .toSet();
    if (tokens.isEmpty) {
      return const [];
    }
    final matches = <DictionaryEntry>[];
    for (final entry in _dictionary) {
      if (tokens.contains(entry.word.toLowerCase())) {
        matches.add(entry);
        if (matches.length >= 4) {
          break;
        }
      }
    }
    return matches;
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
    if (text.isEmpty || _busy) {
      return;
    }
    setState(() {
      _busy = true;
      _messages.add(_AiChatMessage(role: 'user', text: text));
      _message.clear();
      _showKeyboard = false;
    });

    try {
      final answer = await FitilaBackend.askFitilaIa(text);
      if (!mounted) {
        return;
      }
      setState(() {
        _messages.add(_AiChatMessage(role: 'assistant', text: answer));
      });
    } catch (error) {
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(error.toString().replaceFirst('Bad state: ', '')),
        ),
      );
    } finally {
      if (mounted) {
        setState(() => _busy = false);
      }
    }
  }

  Future<void> _translateToFrench(int index) async {
    if (index < 0 || index >= _messages.length) {
      return;
    }
    final message = _messages[index];
    if (message.role != 'assistant' || message.translating) {
      return;
    }
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
      if (!mounted) {
        return;
      }
      setState(() {
        message.translationFr = translation?.isNotEmpty == true
            ? translation
            : 'Traduction indisponible';
      });
    } catch (_) {
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Erreur de traduction.')));
    } finally {
      if (mounted) {
        setState(() => message.translating = false);
      }
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
          mainAxisAlignment: mine
              ? MainAxisAlignment.end
              : MainAxisAlignment.start,
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
                crossAxisAlignment: mine
                    ? CrossAxisAlignment.end
                    : CrossAxisAlignment.start,
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
                      border: mine ? null : Border.all(color: _fitilaBorder),
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
                          border: Border.all(color: const Color(0xFFD8D2F1)),
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
                    if (_phoneticMatches(message.text).isNotEmpty) ...[
                      const SizedBox(height: 6),
                      Wrap(
                        spacing: 6,
                        runSpacing: 6,
                        children: [
                          for (final entry in _phoneticMatches(message.text))
                            _PhoneticChip(entry: entry),
                        ],
                      ),
                    ],
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
                    decoration: const InputDecoration(hintText: 'Yaa sɔ̃ɔ...'),
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

class _PhoneticChip extends StatelessWidget {
  const _PhoneticChip({required this.entry});

  final DictionaryEntry entry;

  @override
  Widget build(BuildContext context) {
    return Tooltip(
      message: entry.definition,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 5),
        decoration: BoxDecoration(
          color: _fitilaSurfaceAlt,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: _fitilaBorder),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              entry.word,
              style: const TextStyle(
                fontSize: 11.5,
                fontWeight: FontWeight.w800,
                color: _fitilaInk,
              ),
            ),
            if ((entry.phonetic ?? '').isNotEmpty) ...[
              const SizedBox(width: 4),
              Text(
                '[${entry.phonetic}]',
                style: const TextStyle(
                  fontSize: 11,
                  fontStyle: FontStyle.italic,
                  color: _fitilaMuted,
                ),
              ),
            ],
          ],
        ),
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
                    color: i == phase ? const Color(0xFF6758C9) : _fitilaBorder,
                    shape: BoxShape.circle,
                  ),
                ),
                if (i < 2) const SizedBox(width: 4),
              ],
              const SizedBox(width: 8),
              const Text(
                'Ǹ nɛ́ɛ̀ dɔɔ bírú...',
                style: TextStyle(color: _fitilaMuted, fontSize: 10.5),
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
  final List<({String role, String text, List<FoncierSource> sources})>
  _messages = [];

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
    if (text.isEmpty || _busy) {
      return;
    }

    setState(() {
      _busy = true;
      _messages.add((role: 'user', text: text, sources: const []));
      _query.clear();
    });

    try {
      final result = await FoncierRag.answer(text);
      if (!mounted) {
        return;
      }
      setState(() {
        _messages.add((
          role: 'assistant',
          text: result.answer.replaceAll(RegExp(r'\.\s+'), '.\n\n').trim(),
          sources: result.sources,
        ));
      });
    } catch (_) {
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Le corpus foncier local est indisponible.'),
        ),
      );
    } finally {
      if (mounted) {
        setState(() => _busy = false);
      }
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
                border: Border.all(color: _fitilaSage.withValues(alpha: .18)),
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
              style: TextStyle(color: _fitilaMuted, fontSize: 13),
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
    ({String role, String text, List<FoncierSource> sources}) message,
  ) {
    final mine = message.role == 'user';
    return Align(
      alignment: mine ? Alignment.centerRight : Alignment.centerLeft,
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 690),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: mine
              ? MainAxisAlignment.end
              : MainAxisAlignment.start,
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
                crossAxisAlignment: mine
                    ? CrossAxisAlignment.end
                    : CrossAxisAlignment.start,
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
                      border: mine ? null : Border.all(color: _fitilaBorder),
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
              border: Border.all(color: _fitilaSage.withValues(alpha: .28)),
            ),
            child: const Row(
              children: [
                Icon(Icons.shield_outlined, color: _fitilaSage, size: 18),
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
                          hintText: 'Yaa sɔ̃ɔ tem bausu gari Baribarum...',
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
                    Icon(Icons.wifi_off_rounded, color: _fitilaSage, size: 12),
                    SizedBox(width: 5),
                    Flexible(
                      child: Text(
                        'Posez votre question en Bàátɔ̀nú — recherche 100% locale, sans Internet',
                        textAlign: TextAlign.center,
                        style: TextStyle(color: _fitilaSage, fontSize: 9.8),
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
                style: TextStyle(color: _fitilaMuted, fontSize: 10.5),
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
  LearningBank? _bank;
  Map<String, dynamic> _progress = const {
    'xp': 0,
    'streak_days': 0,
    'current_direction': 'fr_to_bariba',
    'words_mastered': 0,
    'perfect_scores': 0,
  };
  Map<String, double> _mastery = const {};
  bool _loading = true;
  String _direction = 'fr_to_bariba';

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final bank = await FitilaServices.loadLearningBank();
      if (!mounted) {
        return;
      }
      setState(() {
        _bank = bank;
        _loading = false;
      });
    } catch (_) {
      if (mounted) {
        setState(() => _loading = false);
      }
    }
    try {
      final results = await Future.wait([
        FitilaBackend.fetchLearningProgress(),
        FitilaBackend.fetchThemeMastery(),
      ]);
      if (!mounted) {
        return;
      }
      final progress = results[0] as Map<String, dynamic>;
      final masteryRows = results[1] as List<Map<String, dynamic>>;
      setState(() {
        _progress = progress;
        _direction =
            (progress['current_direction'] as String?) ?? 'fr_to_bariba';
        _mastery = {
          for (final row in masteryRows)
            row['theme_key'] as String:
                (row['mastery_pct'] as num?)?.toDouble() ?? 0,
        };
      });
    } catch (_) {
      // Hors-ligne ou non connecté : le tableau de bord garde ses valeurs par défaut.
    }
  }

  int get _level => 1 + ((_progress['xp'] as int? ?? 0) ~/ 500);

  void _setDirection(String direction) {
    setState(() => _direction = direction);
  }

  void _openTheme(LearningTheme theme) {
    final exercises =
        _bank?.exercises[theme.id] ?? const <LearningExerciseItem>[];
    if (exercises.isEmpty) {
      return;
    }
    showModalBottomSheet<void>(
      context: context,
      showDragHandle: true,
      builder: (sheetContext) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(18, 0, 18, 20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Text(theme.icon, style: const TextStyle(fontSize: 26)),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      _direction == 'fr_to_bariba'
                          ? theme.nameFr
                          : theme.nameBa,
                      style: const TextStyle(
                        fontSize: 17,
                        fontWeight: FontWeight.w800,
                        color: _fitilaInk,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              _ExerciseModeTile(
                icon: Icons.quiz_rounded,
                title: 'Exercices à choix multiple',
                subtitle:
                    '${exercises.length} questions bidirectionnelles avec annotation',
                onTap: () {
                  Navigator.pop(sheetContext);
                  Navigator.of(context)
                      .push(
                        MaterialPageRoute<void>(
                          builder: (_) => LearningExerciseScreen(
                            theme: theme,
                            exercises: exercises,
                            direction: _direction,
                            mode: 'qcm',
                          ),
                        ),
                      )
                      .then((_) => _load());
                },
              ),
              const SizedBox(height: 10),
              _ExerciseModeTile(
                icon: Icons.mic_rounded,
                title: 'Prononciation guidée',
                subtitle:
                    'Enregistre ta voix et auto-évalue-toi phrase par phrase',
                onTap: () {
                  Navigator.pop(sheetContext);
                  Navigator.of(context)
                      .push(
                        MaterialPageRoute<void>(
                          builder: (_) => LearningExerciseScreen(
                            theme: theme,
                            exercises: exercises,
                            direction: _direction,
                            mode: 'pronunciation',
                          ),
                        ),
                      )
                      .then((_) => _load());
                },
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _directionToggle() {
    return Container(
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: _fitilaSurfaceAlt,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: _fitilaBorder),
      ),
      child: Row(
        children: [
          Expanded(
            child: _DirectionSegment(
              label: 'Français → Bariba',
              selected: _direction == 'fr_to_bariba',
              onTap: () => _setDirection('fr_to_bariba'),
            ),
          ),
          Expanded(
            child: _DirectionSegment(
              label: 'Bariba → Français',
              selected: _direction == 'bariba_to_fr',
              onTap: () => _setDirection('bariba_to_fr'),
            ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final bank = _bank;
    return _PageFrame(
      title: 'Apprendre',
      subtitle: 'Parcours bidirectionnel Français ⇄ Bàátɔ̀nú, IA et badges',
      action: IconButton(
        tooltip: 'Profil apprenant',
        onPressed: () => Navigator.of(context).push(
          MaterialPageRoute<void>(builder: (_) => const LearnerProfileScreen()),
        ),
        icon: const Icon(Icons.badge_rounded),
      ),
      child: _loading
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              children: [
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(18),
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      colors: [_fitilaPrimary, _fitilaGoldDeep],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    ),
                    borderRadius: BorderRadius.circular(22),
                  ),
                  child: Row(
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Niveau $_level',
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 20,
                                fontWeight: FontWeight.w900,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              '${_progress['xp'] ?? 0} XP · série de ${_progress['streak_days'] ?? 0} jours',
                              style: const TextStyle(
                                color: Colors.white70,
                                fontSize: 12.5,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ],
                        ),
                      ),
                      Container(
                        width: 54,
                        height: 54,
                        decoration: BoxDecoration(
                          color: Colors.white.withValues(alpha: .18),
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(
                          Icons.local_fire_department_rounded,
                          color: Colors.white,
                          size: 28,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 14),
                _MetricStrip(
                  metrics: [
                    (
                      'Mots maîtrisés',
                      '${_progress['words_mastered'] ?? 0}',
                      Icons.spellcheck_rounded,
                    ),
                    (
                      'Scores parfaits',
                      '${_progress['perfect_scores'] ?? 0}',
                      Icons.star_rounded,
                    ),
                    (
                      'Thèmes',
                      '${bank?.themes.length ?? 0}',
                      Icons.category_rounded,
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                _directionToggle(),
                const SizedBox(height: 16),
                Row(
                  children: [
                    Expanded(
                      child: _LearnQuickAction(
                        icon: Icons.emoji_events_rounded,
                        label: 'Badges',
                        onTap: () => Navigator.of(context).push(
                          MaterialPageRoute<void>(
                            builder: (_) => const LearningBadgesScreen(),
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: _LearnQuickAction(
                        icon: Icons.history_rounded,
                        label: 'Historique',
                        onTap: () => Navigator.of(context).push(
                          MaterialPageRoute<void>(
                            builder: (_) => const LearningHistoryScreen(),
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: _LearnQuickAction(
                        icon: Icons.offline_bolt_rounded,
                        label: 'Hors-ligne',
                        onTap: () => Navigator.of(context).push(
                          MaterialPageRoute<void>(
                            builder: (_) => LearningOfflineScreen(bank: bank),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 18),
                const Text(
                  'Thèmes',
                  style: TextStyle(
                    color: _fitilaMuted,
                    fontSize: 12.5,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 10),
                if (bank == null)
                  const Padding(
                    padding: EdgeInsets.symmetric(vertical: 24),
                    child: Center(
                      child: Text(
                        "Banque d'exercices indisponible hors-ligne.",
                        style: TextStyle(color: _fitilaMuted),
                      ),
                    ),
                  )
                else
                  GridView.builder(
                    itemCount: bank.themes.length,
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    gridDelegate:
                        const SliverGridDelegateWithMaxCrossAxisExtent(
                          maxCrossAxisExtent: 260,
                          mainAxisExtent: 128,
                          crossAxisSpacing: 10,
                          mainAxisSpacing: 10,
                        ),
                    itemBuilder: (context, index) {
                      final theme = bank.themes[index];
                      final pct = _mastery[theme.id] ?? 0;
                      return _ThemeMasteryCard(
                        theme: theme,
                        masteryPct: pct,
                        direction: _direction,
                        onTap: () => _openTheme(theme),
                      );
                    },
                  ),
              ],
            ),
    );
  }
}

class _DirectionSegment extends StatelessWidget {
  const _DirectionSegment({
    required this.label,
    required this.selected,
    required this.onTap,
  });

  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(11),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        padding: const EdgeInsets.symmetric(vertical: 10),
        decoration: BoxDecoration(
          color: selected ? _fitilaCard : Colors.transparent,
          borderRadius: BorderRadius.circular(11),
          boxShadow: selected
              ? const [
                  BoxShadow(
                    color: Color(0x14000000),
                    blurRadius: 6,
                    offset: Offset(0, 2),
                  ),
                ]
              : null,
        ),
        alignment: Alignment.center,
        child: Text(
          label,
          style: TextStyle(
            fontSize: 12.5,
            fontWeight: FontWeight.w800,
            color: selected ? _fitilaInk : _fitilaMuted,
          ),
        ),
      ),
    );
  }
}

class _LearnQuickAction extends StatelessWidget {
  const _LearnQuickAction({
    required this.icon,
    required this.label,
    required this.onTap,
  });

  final IconData icon;
  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 14),
        decoration: BoxDecoration(
          color: _fitilaCard,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: _fitilaBorder),
        ),
        child: Column(
          children: [
            Icon(icon, color: _fitilaPrimary, size: 20),
            const SizedBox(height: 6),
            Text(
              label,
              style: const TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w700,
                color: _fitilaInkSoft,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ThemeMasteryCard extends StatelessWidget {
  const _ThemeMasteryCard({
    required this.theme,
    required this.masteryPct,
    required this.direction,
    required this.onTap,
  });

  final LearningTheme theme;
  final double masteryPct;
  final String direction;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final name = direction == 'fr_to_bariba' ? theme.nameFr : theme.nameBa;
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(18),
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: _fitilaCard,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: _fitilaBorder),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  width: 34,
                  height: 34,
                  decoration: BoxDecoration(
                    color: theme.colorValue.withValues(alpha: .15),
                    borderRadius: BorderRadius.circular(11),
                  ),
                  alignment: Alignment.center,
                  child: Text(theme.icon, style: const TextStyle(fontSize: 17)),
                ),
                const Spacer(),
                Text(
                  '${masteryPct.round()}%',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w800,
                    color: masteryPct >= 80 ? _fitilaSage : _fitilaMuted,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              name,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(
                fontSize: 12.5,
                fontWeight: FontWeight.w800,
                color: _fitilaInk,
              ),
            ),
            const Spacer(),
            ClipRRect(
              borderRadius: BorderRadius.circular(6),
              child: LinearProgressIndicator(
                value: (masteryPct / 100).clamp(0, 1),
                minHeight: 5,
                backgroundColor: _fitilaBorder,
                valueColor: AlwaysStoppedAnimation(theme.colorValue),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ExerciseModeTile extends StatelessWidget {
  const _ExerciseModeTile({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.onTap,
  });

  final IconData icon;
  final String title;
  final String subtitle;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: _fitilaSurfaceAlt,
      borderRadius: BorderRadius.circular(16),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Row(
            children: [
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: _fitilaPrimary.withValues(alpha: .12),
                  borderRadius: BorderRadius.circular(13),
                ),
                child: Icon(icon, color: _fitilaPrimary),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: const TextStyle(
                        fontWeight: FontWeight.w800,
                        fontSize: 13.5,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      subtitle,
                      style: const TextStyle(
                        color: _fitilaMuted,
                        fontSize: 11.5,
                      ),
                    ),
                  ],
                ),
              ),
              const Icon(Icons.chevron_right_rounded, color: _fitilaMuted),
            ],
          ),
        ),
      ),
    );
  }
}

enum _AnswerTileState { idle, correct, incorrect, disabled }

class _AnswerOptionTile extends StatelessWidget {
  const _AnswerOptionTile({
    required this.label,
    required this.state,
    required this.onTap,
  });

  final String label;
  final _AnswerTileState state;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    Color border = _fitilaBorder;
    Color bg = _fitilaCard;
    Color fg = _fitilaInk;
    IconData? icon;
    switch (state) {
      case _AnswerTileState.correct:
        border = _fitilaSage;
        bg = const Color(0xFFDCEAE0);
        fg = _fitilaSage;
        icon = Icons.check_circle_rounded;
        break;
      case _AnswerTileState.incorrect:
        border = Colors.red.shade300;
        bg = Colors.red.shade50;
        fg = Colors.red.shade700;
        icon = Icons.cancel_rounded;
        break;
      case _AnswerTileState.disabled:
        fg = _fitilaMuted;
        break;
      case _AnswerTileState.idle:
        break;
    }
    return Material(
      color: bg,
      borderRadius: BorderRadius.circular(14),
      child: InkWell(
        onTap: state == _AnswerTileState.idle ? onTap : null,
        borderRadius: BorderRadius.circular(14),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 13),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: border),
          ),
          child: Row(
            children: [
              Expanded(
                child: Text(
                  label,
                  style: TextStyle(
                    color: fg,
                    fontWeight: FontWeight.w700,
                    fontSize: 13.5,
                  ),
                ),
              ),
              if (icon != null) Icon(icon, color: fg, size: 18),
            ],
          ),
        ),
      ),
    );
  }
}

class LearningExerciseScreen extends StatefulWidget {
  const LearningExerciseScreen({
    super.key,
    required this.theme,
    required this.exercises,
    required this.direction,
    required this.mode,
  });

  final LearningTheme theme;
  final List<LearningExerciseItem> exercises;
  final String direction;
  final String mode; // 'qcm' | 'pronunciation'

  @override
  State<LearningExerciseScreen> createState() => _LearningExerciseScreenState();
}

class _LearningExerciseScreenState extends State<LearningExerciseScreen> {
  late final List<LearningExerciseItem> _items;
  int _index = 0;
  int _correct = 0;
  String? _selected;
  bool _answered = false;
  List<String> _options = const [];
  final _media = FitilaMediaController();
  bool _recording = false;
  FitilaMediaAsset? _recordedAsset;
  final _player = audio.AudioPlayer();
  double? _selfRating;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    final shuffled = List<LearningExerciseItem>.from(widget.exercises)
      ..shuffle();
    _items = shuffled.length > 12 ? shuffled.take(12).toList() : shuffled;
    _prepareQuestion();
  }

  @override
  void dispose() {
    _player.dispose();
    _media.dispose();
    super.dispose();
  }

  bool get _frToBariba => widget.direction == 'fr_to_bariba';

  void _prepareQuestion() {
    final item = _items[_index];
    if (widget.mode == 'qcm') {
      final correct = _frToBariba ? item.bariba : item.french;
      final distractors = _frToBariba ? item.distractorsBa : item.distractorsFr;
      _options = <String>{correct, ...distractors.take(3)}.toList()..shuffle();
    }
    _selected = null;
    _answered = false;
    _recordedAsset = null;
    _selfRating = null;
  }

  void _choose(String option) {
    if (_answered) {
      return;
    }
    final item = _items[_index];
    final correct = _frToBariba ? item.bariba : item.french;
    setState(() {
      _selected = option;
      _answered = true;
      if (option == correct) {
        _correct++;
      }
    });
  }

  Future<void> _toggleRecording() async {
    if (_recording) {
      final asset = await _media.stopAudio();
      if (!mounted) {
        return;
      }
      setState(() {
        _recording = false;
        _recordedAsset = asset;
      });
    } else {
      try {
        await _media.startAudio();
        if (!mounted) {
          return;
        }
        setState(() => _recording = true);
      } catch (_) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Microphone indisponible.')),
          );
        }
      }
    }
  }

  Future<void> _playRecording() async {
    final asset = _recordedAsset;
    if (asset == null) {
      return;
    }
    await _player.play(audio.DeviceFileSource(asset.path));
  }

  void _rateSelf(double rating) {
    setState(() {
      _selfRating = rating;
      _answered = true;
      if (rating >= 70) {
        _correct++;
      }
    });
  }

  Future<void> _next() async {
    if (_index + 1 < _items.length) {
      setState(() {
        _index++;
        _prepareQuestion();
      });
    } else {
      await _finish();
    }
  }

  Future<void> _finish() async {
    setState(() => _saving = true);
    Map<String, dynamic> result = const {
      'xpEarned': 0,
      'newStreak': 0,
      'unlockedBadges': [],
    };
    try {
      result = await FitilaBackend.recordLearningSession(
        sessionType: widget.mode == 'pronunciation'
            ? 'pronunciation'
            : 'exercise',
        themeKey: widget.theme.id,
        direction: widget.direction,
        correctCount: _correct,
        totalCount: _items.length,
      );
    } catch (_) {
      // Hors-ligne : le résultat reste affiché sans mise à jour serveur.
    }
    if (!mounted) {
      return;
    }
    Navigator.of(context).pushReplacement(
      MaterialPageRoute<void>(
        builder: (_) => LearningResultScreen(
          theme: widget.theme,
          correct: _correct,
          total: _items.length,
          xpEarned: result['xpEarned'] as int? ?? 0,
          newStreak: result['newStreak'] as int? ?? 0,
          unlockedBadges: List<Map<String, dynamic>>.from(
            result['unlockedBadges'] as List? ?? const [],
          ),
        ),
      ),
    );
  }

  Widget _qcmBody(LearningExerciseItem item) {
    final question = _frToBariba ? item.french : item.bariba;
    final correct = _frToBariba ? item.bariba : item.french;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: _fitilaCard,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: _fitilaBorder),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                _frToBariba ? 'Traduis en Bàátɔ̀nú' : 'Traduis en français',
                style: const TextStyle(
                  color: _fitilaMuted,
                  fontSize: 11.5,
                  fontWeight: FontWeight.w800,
                  letterSpacing: .3,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                question,
                style: const TextStyle(
                  color: _fitilaInk,
                  fontSize: 20,
                  fontWeight: FontWeight.w800,
                  height: 1.3,
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),
        for (final option in _options)
          Padding(
            padding: const EdgeInsets.only(bottom: 10),
            child: _AnswerOptionTile(
              label: option,
              state: !_answered
                  ? _AnswerTileState.idle
                  : option == correct
                  ? _AnswerTileState.correct
                  : option == _selected
                  ? _AnswerTileState.incorrect
                  : _AnswerTileState.disabled,
              onTap: () => _choose(option),
            ),
          ),
        if (_answered && (item.context ?? '').isNotEmpty)
          Container(
            margin: const EdgeInsets.only(top: 4),
            padding: const EdgeInsets.all(13),
            decoration: BoxDecoration(
              color: const Color(0xFFEDEAFF),
              borderRadius: BorderRadius.circular(13),
              border: Border.all(color: const Color(0xFFD8D2F1)),
            ),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Icon(
                  Icons.auto_awesome_rounded,
                  color: Color(0xFF6758C9),
                  size: 17,
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    item.context!,
                    style: const TextStyle(
                      color: Color(0xFF6758C9),
                      fontSize: 12.5,
                      height: 1.4,
                    ),
                  ),
                ),
              ],
            ),
          ),
      ],
    );
  }

  Widget _pronunciationBody(LearningExerciseItem item) {
    final target = _frToBariba ? item.bariba : item.french;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: _fitilaCard,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: _fitilaBorder),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Prononce cette phrase',
                style: TextStyle(
                  color: _fitilaMuted,
                  fontSize: 11.5,
                  fontWeight: FontWeight.w800,
                  letterSpacing: .3,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                target,
                style: const TextStyle(
                  color: _fitilaInk,
                  fontSize: 22,
                  fontWeight: FontWeight.w800,
                  height: 1.3,
                ),
              ),
              const SizedBox(height: 6),
              Text(
                _frToBariba ? item.french : item.bariba,
                style: const TextStyle(color: _fitilaMuted, fontSize: 13),
              ),
            ],
          ),
        ),
        const SizedBox(height: 20),
        Center(
          child: GestureDetector(
            onTap: _toggleRecording,
            child: Container(
              width: 84,
              height: 84,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: _recording ? Colors.red : _fitilaPrimary,
                boxShadow: [
                  BoxShadow(
                    color: (_recording ? Colors.red : _fitilaPrimary)
                        .withValues(alpha: .3),
                    blurRadius: 20,
                    spreadRadius: 2,
                  ),
                ],
              ),
              child: Icon(
                _recording ? Icons.stop_rounded : Icons.mic_rounded,
                color: Colors.white,
                size: 36,
              ),
            ),
          ),
        ),
        const SizedBox(height: 10),
        Center(
          child: Text(
            _recording
                ? 'Enregistrement en cours…'
                : (_recordedAsset != null
                      ? 'Enregistré ✓'
                      : 'Appuie pour enregistrer'),
            style: const TextStyle(color: _fitilaMuted, fontSize: 12.5),
          ),
        ),
        if (_recordedAsset != null && !_recording) ...[
          const SizedBox(height: 10),
          Center(
            child: TextButton.icon(
              onPressed: _playRecording,
              icon: const Icon(Icons.play_arrow_rounded),
              label: const Text('Réécouter'),
            ),
          ),
          const SizedBox(height: 18),
          const Text(
            'Comment évalues-tu ta prononciation ?',
            textAlign: TextAlign.center,
            style: TextStyle(
              color: _fitilaInkSoft,
              fontWeight: FontWeight.w700,
              fontSize: 13,
            ),
          ),
          const SizedBox(height: 12),
          Wrap(
            alignment: WrapAlignment.center,
            spacing: 8,
            runSpacing: 8,
            children: [
              for (final rating in const [
                (30.0, 'À revoir'),
                (60.0, 'Correct'),
                (85.0, 'Bien'),
                (100.0, 'Parfait'),
              ])
                ChoiceChip(
                  label: Text(rating.$2),
                  selected: _selfRating == rating.$1,
                  onSelected: (_) => _rateSelf(rating.$1),
                ),
            ],
          ),
        ],
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    final item = _items[_index];
    return _PageFrame(
      title: widget.direction == 'fr_to_bariba'
          ? widget.theme.nameFr
          : widget.theme.nameBa,
      subtitle: widget.mode == 'pronunciation'
          ? 'Prononciation guidée'
          : 'Choix multiple bidirectionnel',
      child: _saving
          ? const Center(child: CircularProgressIndicator())
          : Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                ClipRRect(
                  borderRadius: BorderRadius.circular(8),
                  child: LinearProgressIndicator(
                    value: (_index + 1) / _items.length,
                    minHeight: 7,
                    backgroundColor: _fitilaBorder,
                    valueColor: const AlwaysStoppedAnimation(_fitilaPrimary),
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  'Question ${_index + 1} / ${_items.length} · $_correct bonnes réponses',
                  style: const TextStyle(
                    color: _fitilaMuted,
                    fontSize: 11.5,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 14),
                Expanded(
                  child: SingleChildScrollView(
                    child: widget.mode == 'pronunciation'
                        ? _pronunciationBody(item)
                        : _qcmBody(item),
                  ),
                ),
                const SizedBox(height: 10),
                SizedBox(
                  width: double.infinity,
                  child: FilledButton(
                    onPressed: _answered ? _next : null,
                    child: Text(
                      _index + 1 == _items.length ? 'Terminer' : 'Suivant',
                    ),
                  ),
                ),
              ],
            ),
    );
  }
}

class LearningResultScreen extends StatelessWidget {
  const LearningResultScreen({
    super.key,
    required this.theme,
    required this.correct,
    required this.total,
    required this.xpEarned,
    required this.newStreak,
    required this.unlockedBadges,
  });

  final LearningTheme theme;
  final int correct;
  final int total;
  final int xpEarned;
  final int newStreak;
  final List<Map<String, dynamic>> unlockedBadges;

  @override
  Widget build(BuildContext context) {
    final pct = total == 0 ? 0 : ((correct / total) * 100).round();
    return _PageFrame(
      title: 'Résultats',
      subtitle: theme.nameFr,
      child: ListView(
        children: [
          Center(
            child: Container(
              width: 120,
              height: 120,
              decoration: const BoxDecoration(
                shape: BoxShape.circle,
                gradient: LinearGradient(
                  colors: [_fitilaPrimary, _fitilaGoldDeep],
                ),
              ),
              alignment: Alignment.center,
              child: Text(
                '$pct%',
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 30,
                  fontWeight: FontWeight.w900,
                ),
              ),
            ),
          ),
          const SizedBox(height: 18),
          Center(
            child: Text(
              pct >= 80
                  ? 'Excellent travail !'
                  : (pct >= 50 ? 'Bon effort !' : 'Continue à pratiquer'),
              style: const TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w800,
                color: _fitilaInk,
              ),
            ),
          ),
          const SizedBox(height: 6),
          Center(
            child: Text(
              '$correct / $total bonnes réponses',
              style: const TextStyle(color: _fitilaMuted),
            ),
          ),
          const SizedBox(height: 20),
          _MetricStrip(
            metrics: [
              ('Gagné', '+$xpEarned XP', Icons.bolt_rounded),
              ('Série', '$newStreak j', Icons.local_fire_department_rounded),
              ('Score', '$pct%', Icons.emoji_events_rounded),
            ],
          ),
          if (unlockedBadges.isNotEmpty) ...[
            const SizedBox(height: 20),
            const Text(
              'Nouveaux badges débloqués',
              style: TextStyle(
                color: _fitilaMuted,
                fontSize: 12.5,
                fontWeight: FontWeight.w700,
              ),
            ),
            const SizedBox(height: 10),
            for (final badge in unlockedBadges)
              Container(
                margin: const EdgeInsets.only(bottom: 8),
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: const Color(0xFFFFF6E5),
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: const Color(0xFFF0D9A0)),
                ),
                child: Row(
                  children: [
                    Text(
                      (badge['icon'] ?? '🏅').toString(),
                      style: const TextStyle(fontSize: 24),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            (badge['name'] ?? '').toString(),
                            style: const TextStyle(fontWeight: FontWeight.w800),
                          ),
                          Text(
                            (badge['description'] ?? '').toString(),
                            style: const TextStyle(
                              color: _fitilaMuted,
                              fontSize: 11.5,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
          ],
          const SizedBox(height: 22),
          SizedBox(
            width: double.infinity,
            child: FilledButton.icon(
              onPressed: () => Navigator.of(context).pop(),
              icon: const Icon(Icons.home_rounded),
              label: const Text('Retour au tableau de bord'),
            ),
          ),
        ],
      ),
    );
  }
}

class LearningBadgesScreen extends StatefulWidget {
  const LearningBadgesScreen({super.key});

  @override
  State<LearningBadgesScreen> createState() => _LearningBadgesScreenState();
}

class _LearningBadgesScreenState extends State<LearningBadgesScreen> {
  bool _loading = true;
  List<Map<String, dynamic>> _unlocked = const [];
  List<Map<String, dynamic>> _locked = const [];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final result = await FitilaBackend.fetchLearnerBadges();
      if (!mounted) {
        return;
      }
      setState(() {
        _unlocked = List<Map<String, dynamic>>.from(
          result['unlocked'] as List? ?? const [],
        );
        _locked = List<Map<String, dynamic>>.from(
          result['locked'] as List? ?? const [],
        );
        _loading = false;
      });
    } catch (_) {
      if (mounted) {
        setState(() => _loading = false);
      }
    }
  }

  Widget _badgeTile(Map<String, dynamic> badge, {required bool unlocked}) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: unlocked ? _fitilaCard : _fitilaSurfaceAlt,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: _fitilaBorder),
      ),
      child: Column(
        children: [
          Opacity(
            opacity: unlocked ? 1 : .35,
            child: Text(
              (badge['icon'] ?? '🏅').toString(),
              style: const TextStyle(fontSize: 32),
            ),
          ),
          const SizedBox(height: 8),
          Text(
            (badge['name'] ?? '').toString(),
            textAlign: TextAlign.center,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(
              fontSize: 11.5,
              fontWeight: FontWeight.w800,
              color: unlocked ? _fitilaInk : _fitilaMuted,
            ),
          ),
          const SizedBox(height: 3),
          Text(
            '${badge['points_reward'] ?? 0} pts',
            style: const TextStyle(fontSize: 10, color: _fitilaMuted),
          ),
          if (!unlocked)
            const Padding(
              padding: EdgeInsets.only(top: 4),
              child: Icon(Icons.lock_rounded, size: 14, color: _fitilaMuted),
            ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return _PageFrame(
      title: 'Badges',
      subtitle:
          '${_unlocked.length} débloqués sur ${_unlocked.length + _locked.length}',
      child: _loading
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              children: [
                if (_unlocked.isNotEmpty) ...[
                  const Text(
                    'Débloqués',
                    style: TextStyle(
                      color: _fitilaMuted,
                      fontSize: 12.5,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(height: 10),
                  GridView.builder(
                    itemCount: _unlocked.length,
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    gridDelegate:
                        const SliverGridDelegateWithMaxCrossAxisExtent(
                          maxCrossAxisExtent: 150,
                          mainAxisExtent: 140,
                          crossAxisSpacing: 10,
                          mainAxisSpacing: 10,
                        ),
                    itemBuilder: (context, index) =>
                        _badgeTile(_unlocked[index], unlocked: true),
                  ),
                  const SizedBox(height: 20),
                ],
                const Text(
                  'À débloquer',
                  style: TextStyle(
                    color: _fitilaMuted,
                    fontSize: 12.5,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 10),
                GridView.builder(
                  itemCount: _locked.length,
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  gridDelegate: const SliverGridDelegateWithMaxCrossAxisExtent(
                    maxCrossAxisExtent: 150,
                    mainAxisExtent: 140,
                    crossAxisSpacing: 10,
                    mainAxisSpacing: 10,
                  ),
                  itemBuilder: (context, index) =>
                      _badgeTile(_locked[index], unlocked: false),
                ),
              ],
            ),
    );
  }
}

class LearningHistoryScreen extends StatefulWidget {
  const LearningHistoryScreen({super.key});

  @override
  State<LearningHistoryScreen> createState() => _LearningHistoryScreenState();
}

class _LearningHistoryScreenState extends State<LearningHistoryScreen> {
  bool _loading = true;
  List<Map<String, dynamic>> _sessions = const [];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final rows = await FitilaBackend.fetchLearningHistory(limit: 60);
      if (mounted) {
        setState(() {
          _sessions = rows;
          _loading = false;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() => _loading = false);
      }
    }
  }

  Map<DateTime, int> get _byDay {
    final map = <DateTime, int>{};
    for (final s in _sessions) {
      final created = DateTime.tryParse((s['created_at'] ?? '').toString());
      if (created == null) {
        continue;
      }
      final key = DateTime(created.year, created.month, created.day);
      map[key] = (map[key] ?? 0) + 1;
    }
    return map;
  }

  Widget _heatmap() {
    final byDay = _byDay;
    final today = DateTime.now();
    final days = List.generate(70, (i) {
      final d = today.subtract(Duration(days: 69 - i));
      return DateTime(d.year, d.month, d.day);
    });
    return Wrap(
      spacing: 4,
      runSpacing: 4,
      children: [
        for (final day in days)
          Tooltip(
            message: '${day.day}/${day.month} · ${byDay[day] ?? 0} session(s)',
            child: Container(
              width: 14,
              height: 14,
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(3),
                color: (byDay[day] ?? 0) == 0
                    ? _fitilaBorder
                    : _fitilaSage.withValues(
                        alpha: ((byDay[day]!).clamp(1, 4) / 4).toDouble(),
                      ),
              ),
            ),
          ),
      ],
    );
  }

  IconData _sessionIcon(String type) {
    return switch (type) {
      'pronunciation' => Icons.mic_rounded,
      'classe_lesson' => Icons.school_rounded,
      _ => Icons.quiz_rounded,
    };
  }

  String _formatDate(String iso) {
    final date = DateTime.tryParse(iso);
    if (date == null) {
      return '';
    }
    return '${date.day.toString().padLeft(2, '0')}/${date.month.toString().padLeft(2, '0')}';
  }

  @override
  Widget build(BuildContext context) {
    return _PageFrame(
      title: 'Historique',
      subtitle: '${_sessions.length} sessions récentes',
      child: _loading
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              children: [
                Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: _fitilaCard,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: _fitilaBorder),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        '70 derniers jours',
                        style: TextStyle(
                          fontWeight: FontWeight.w800,
                          fontSize: 12.5,
                        ),
                      ),
                      const SizedBox(height: 10),
                      _heatmap(),
                    ],
                  ),
                ),
                const SizedBox(height: 18),
                if (_sessions.isEmpty)
                  const Padding(
                    padding: EdgeInsets.symmetric(vertical: 30),
                    child: Center(
                      child: Text(
                        'Aucune session enregistrée pour le moment.',
                        style: TextStyle(color: _fitilaMuted),
                      ),
                    ),
                  )
                else
                  for (final session in _sessions)
                    Container(
                      margin: const EdgeInsets.only(bottom: 8),
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: _fitilaCard,
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(color: _fitilaBorder),
                      ),
                      child: Row(
                        children: [
                          CircleAvatar(
                            radius: 16,
                            backgroundColor: _fitilaSurfaceAlt,
                            child: Icon(
                              _sessionIcon(
                                (session['session_type'] ?? '').toString(),
                              ),
                              size: 16,
                              color: _fitilaPrimary,
                            ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  (session['theme_or_lesson_ref'] ?? 'Session')
                                      .toString(),
                                  style: const TextStyle(
                                    fontWeight: FontWeight.w800,
                                    fontSize: 12.5,
                                  ),
                                ),
                                Text(
                                  '${session['correct_count'] ?? 0}/${session['total_count'] ?? 0} · +${session['xp_earned'] ?? 0} XP',
                                  style: const TextStyle(
                                    color: _fitilaMuted,
                                    fontSize: 11,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          Text(
                            _formatDate(
                              (session['created_at'] ?? '').toString(),
                            ),
                            style: const TextStyle(
                              color: _fitilaMuted,
                              fontSize: 10.5,
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

class LearningOfflineScreen extends StatelessWidget {
  const LearningOfflineScreen({super.key, required this.bank});

  final LearningBank? bank;

  @override
  Widget build(BuildContext context) {
    final themes = bank?.themes ?? const <LearningTheme>[];
    return _PageFrame(
      title: 'Hors-ligne',
      subtitle: "Paquets d'exercices disponibles sans connexion",
      child: ListView(
        children: [
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: const Color(0xFFDCEAE0),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: _fitilaSage.withValues(alpha: .3)),
            ),
            child: const Row(
              children: [
                Icon(Icons.offline_bolt_rounded, color: _fitilaSage),
                SizedBox(width: 10),
                Expanded(
                  child: Text(
                    "Tous les thèmes de questions à choix multiple sont déjà embarqués dans l'application : ils fonctionnent sans connexion internet.",
                    style: TextStyle(
                      color: _fitilaSage,
                      fontSize: 12.5,
                      height: 1.4,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 8),
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: const Color(0xFFFFF6E5),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: const Color(0xFFF0D9A0)),
            ),
            child: const Row(
              children: [
                Icon(Icons.cloud_sync_rounded, color: Color(0xFFB08900)),
                SizedBox(width: 10),
                Expanded(
                  child: Text(
                    "La prononciation guidée et la synchronisation de ta progression nécessitent une connexion pour enregistrer les résultats côté serveur.",
                    style: TextStyle(
                      color: Color(0xFFB08900),
                      fontSize: 12.5,
                      height: 1.4,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 18),
          const Text(
            'Paquets par thème',
            style: TextStyle(
              color: _fitilaMuted,
              fontSize: 12.5,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 10),
          for (final theme in themes)
            Container(
              margin: const EdgeInsets.only(bottom: 8),
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
              decoration: BoxDecoration(
                color: _fitilaCard,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: _fitilaBorder),
              ),
              child: Row(
                children: [
                  Text(theme.icon, style: const TextStyle(fontSize: 20)),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          theme.nameFr,
                          style: const TextStyle(
                            fontWeight: FontWeight.w800,
                            fontSize: 12.5,
                          ),
                        ),
                        Text(
                          '${theme.lessonsCount} exercices',
                          style: const TextStyle(
                            color: _fitilaMuted,
                            fontSize: 11,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const Icon(
                    Icons.check_circle_rounded,
                    color: _fitilaSage,
                    size: 18,
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }
}

class LearnerProfileScreen extends StatefulWidget {
  const LearnerProfileScreen({super.key});

  @override
  State<LearnerProfileScreen> createState() => _LearnerProfileScreenState();
}

class _LearnerProfileScreenState extends State<LearnerProfileScreen> {
  bool _loading = true;
  Map<String, dynamic> _progress = const {};
  int _unlockedBadges = 0;
  int _totalBadges = 0;
  int _themesCompleted = 0;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final results = await Future.wait([
        FitilaBackend.fetchLearningProgress(),
        FitilaBackend.fetchLearnerBadges(),
        FitilaBackend.fetchThemeMastery(),
      ]);
      if (!mounted) {
        return;
      }
      final badges = results[1] as Map<String, dynamic>;
      final unlocked = List.from(badges['unlocked'] as List? ?? const []);
      final locked = List.from(badges['locked'] as List? ?? const []);
      final mastery = List<Map<String, dynamic>>.from(results[2] as List);
      setState(() {
        _progress = results[0] as Map<String, dynamic>;
        _unlockedBadges = unlocked.length;
        _totalBadges = unlocked.length + locked.length;
        _themesCompleted = mastery
            .where((m) => (m['mastery_pct'] as num? ?? 0) >= 80)
            .length;
        _loading = false;
      });
    } catch (_) {
      if (mounted) {
        setState(() => _loading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final xp = _progress['xp'] as int? ?? 0;
    final level = 1 + (xp ~/ 500);
    final progressToNext = (xp % 500) / 500;
    final user = FitilaBackend.client.auth.currentUser;
    final displayName =
        (user?.userMetadata?['display_name'] as String?) ??
        user?.email ??
        'Apprenant Fitila';
    return _PageFrame(
      title: 'Profil apprenant',
      subtitle: 'Progression unifiée, badges et régularité',
      child: _loading
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              children: [
                Center(
                  child: Column(
                    children: [
                      Container(
                        width: 78,
                        height: 78,
                        decoration: const BoxDecoration(
                          shape: BoxShape.circle,
                          gradient: LinearGradient(
                            colors: [_fitilaPrimary, _fitilaGoldDeep],
                          ),
                        ),
                        alignment: Alignment.center,
                        child: Text(
                          'N$level',
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 22,
                            fontWeight: FontWeight.w900,
                          ),
                        ),
                      ),
                      const SizedBox(height: 10),
                      Text(
                        displayName,
                        style: const TextStyle(
                          fontWeight: FontWeight.w800,
                          fontSize: 16,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'Niveau $level · $xp XP',
                        style: const TextStyle(
                          color: _fitilaMuted,
                          fontSize: 12.5,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 8),
                ClipRRect(
                  borderRadius: BorderRadius.circular(6),
                  child: LinearProgressIndicator(
                    value: progressToNext.clamp(0, 1),
                    minHeight: 8,
                    backgroundColor: _fitilaBorder,
                    valueColor: const AlwaysStoppedAnimation(_fitilaPrimary),
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  '${500 - (xp % 500)} XP avant le niveau ${level + 1}',
                  textAlign: TextAlign.center,
                  style: const TextStyle(color: _fitilaMuted, fontSize: 11),
                ),
                const SizedBox(height: 20),
                _MetricStrip(
                  metrics: [
                    (
                      'Série',
                      '${_progress['streak_days'] ?? 0} j',
                      Icons.local_fire_department_rounded,
                    ),
                    (
                      'Mots',
                      '${_progress['words_mastered'] ?? 0}',
                      Icons.spellcheck_rounded,
                    ),
                    (
                      'Thèmes maîtrisés',
                      '$_themesCompleted',
                      Icons.category_rounded,
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                _MetricStrip(
                  metrics: [
                    (
                      'Scores parfaits',
                      '${_progress['perfect_scores'] ?? 0}',
                      Icons.star_rounded,
                    ),
                    (
                      'Badges',
                      '$_unlockedBadges/$_totalBadges',
                      Icons.emoji_events_rounded,
                    ),
                    ('XP total', '$xp', Icons.bolt_rounded),
                  ],
                ),
                const SizedBox(height: 20),
                SizedBox(
                  width: double.infinity,
                  child: OutlinedButton.icon(
                    onPressed: () => Navigator.of(context).push(
                      MaterialPageRoute<void>(
                        builder: (_) => const LearningBadgesScreen(),
                      ),
                    ),
                    icon: const Icon(Icons.emoji_events_rounded),
                    label: const Text('Voir tous mes badges'),
                  ),
                ),
                const SizedBox(height: 10),
                SizedBox(
                  width: double.infinity,
                  child: OutlinedButton.icon(
                    onPressed: () => Navigator.of(context).push(
                      MaterialPageRoute<void>(
                        builder: (_) => const LearningHistoryScreen(),
                      ),
                    ),
                    icon: const Icon(Icons.history_rounded),
                    label: const Text("Voir l'historique complet"),
                  ),
                ),
              ],
            ),
    );
  }
}

class ClasseScreen extends StatefulWidget {
  const ClasseScreen({super.key, this.initialLessons});

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
    final suffix = itemIndex == null ? section : '$section/$itemIndex';
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
        if (!mounted) {
          return;
        }
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
      if (!mounted) {
        return;
      }
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
                  style: const TextStyle(color: _fitilaMuted, fontSize: 10.5),
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

    final sections =
        <({String id, String emoji, String title, String subtitle})>[
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
                done: _completed.contains('${lesson.level}-${lesson.id}'),
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
      if (lesson.ecoute.isNotEmpty) (id: 'ecoute', label: 'Faagi', emoji: '🎧'),
      if (lesson.reagis.isNotEmpty) (id: 'reagis', label: 'Geruo', emoji: '💬'),
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
                    _lessonAnswers['${lesson.level}-${lesson.id}-$section-$i'] =
                        value;
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
                            content: Text(
                              'Réponse vocale prête à enregistrer.',
                            ),
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
            if (lesson.phoneticLabel.isNotEmpty) const SizedBox(height: 10),
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
                                initialValue:
                                    _lessonAnswers['${lesson.level}-${lesson.id}-write-$i'],
                                onChanged: (value) {
                                  _lessonAnswers['${lesson.level}-${lesson.id}-write-$i'] =
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
            if (lesson.imageUrl.isNotEmpty) const SizedBox(height: 12),
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
                      style: const TextStyle(color: _fitilaMuted, fontSize: 11),
                    ),
                  ),
                  const Text(
                    '☆ ☆ ☆ ☆ ☆',
                    style: TextStyle(color: _fitilaGoldDeep, fontSize: 13),
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
                  style: const TextStyle(color: _fitilaGoldDeep, fontSize: 12),
                ),
              ],
            ],
          ),
        ),
        const SizedBox(height: 10),
        SizedBox(
          height: 43,
          child: ListView.separated(
            key: const ValueKey('classe-lesson-tabs'),
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
                      if (previous != null) {
                        _openLesson(previous);
                      }
                    },
              icon: const Icon(Icons.chevron_left_rounded),
              label: const Text('Précédent'),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: FilledButton.icon(
                onPressed: () {
                  final idx = tabs.indexWhere((tab) => tab.id == _lessonTab);
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
                  tabs.last.id == _lessonTab ? 'Terminer la leçon' : 'Suivant',
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
                style: const TextStyle(color: _fitilaMuted, height: 1.45),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _renderLessons(List<WebClasseLesson> all) {
    return switch (_section) {
      'home' => _home(all),
      'lessons' => _lessonList(all),
      'detail' => _lessonDetail(all),
      _ => _secondarySection(_section),
    };
  }

  @override
  Widget build(BuildContext context) {
    return _PageFrame(
      title: 'Classe',
      subtitle: _level == 'N1' ? '🔥 N1 — Bàátɔ̀nú' : '🚀 N2 — Bàátɔ̀nú',
      child: widget.initialLessons != null
          ? _renderLessons(widget.initialLessons!)
          : FutureBuilder<List<WebClasseLesson>>(
              future: _webLessons,
              builder: (context, snapshot) {
                if (snapshot.hasError) {
                  return Center(
                    child: FilledButton.icon(
                      onPressed: () => setState(
                        () => _webLessons = WebClasseContent.loadLessons(),
                      ),
                      icon: const Icon(Icons.refresh_rounded),
                      label: const Text('Recharger les leçons'),
                    ),
                  );
                }
                if (!snapshot.hasData) {
                  return const Center(child: CircularProgressIndicator());
                }
                return _renderLessons(snapshot.data!);
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
            style: const TextStyle(color: _fitilaMuted, fontSize: 9.8),
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
                          color: n2 ? const Color(0xFF6758C9) : _fitilaGoldDeep,
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
              const Icon(Icons.chevron_right_rounded, color: _fitilaMuted),
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

class _KeyboardScreenState extends State<KeyboardScreen>
    with WidgetsBindingObserver {
  static const _channel = MethodChannel('fitila/keyboard');
  final _controller = TextEditingController();
  bool? _enabled;
  bool? _selected;
  bool _checking = true;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _refreshStatus();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _controller.dispose();
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    // Re-vérifie le statut quand l'utilisateur revient des réglages Android.
    if (state == AppLifecycleState.resumed) {
      _refreshStatus();
    }
  }

  Future<void> _refreshStatus() async {
    setState(() => _checking = true);
    try {
      final result = await _channel.invokeMapMethod<String, dynamic>(
        'getKeyboardStatus',
      );
      setState(() {
        _enabled = result?['enabled'] as bool? ?? false;
        _selected = result?['selected'] as bool? ?? false;
        _checking = false;
      });
    } on PlatformException catch (_) {
      setState(() {
        _enabled = null;
        _selected = null;
        _checking = false;
      });
    } on MissingPluginException catch (_) {
      // Environnement de test/desktop sans canal natif enregistré.
      setState(() {
        _enabled = null;
        _selected = null;
        _checking = false;
      });
    }
  }

  Future<void> _openSettings() async {
    try {
      await _channel.invokeMethod('openInputMethodSettings');
    } catch (_) {
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text(
            "Impossible d'ouvrir les réglages Android depuis cet appareil.",
          ),
        ),
      );
    }
  }

  Future<void> _showPicker() async {
    try {
      await _channel.invokeMethod('showInputMethodPicker');
      await Future.delayed(const Duration(milliseconds: 500));
      await _refreshStatus();
    } catch (_) {
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Sélecteur de clavier indisponible sur cet appareil.'),
        ),
      );
    }
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
    final isActive = _enabled == true && _selected == true;
    return _PageFrame(
      title: 'Clavier Bariba',
      subtitle:
          'Clavier système natif — activable dans toutes vos applications.',
      child: RefreshIndicator(
        onRefresh: _refreshStatus,
        color: _fitilaPrimary,
        child: ListView(
          children: [
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: isActive
                      ? [_fitilaSage, const Color(0xFF2C5039)]
                      : [const Color(0xFF5B5460), _fitilaInk],
                ),
                borderRadius: BorderRadius.circular(18),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'Statut',
                        style: TextStyle(color: Colors.white70, fontSize: 12),
                      ),
                      if (_checking)
                        const SizedBox(
                          width: 14,
                          height: 14,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: Colors.white,
                          ),
                        )
                      else
                        Icon(
                          isActive
                              ? Icons.check_circle_rounded
                              : Icons.circle_outlined,
                          color: Colors.white,
                          size: 16,
                        ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Text(
                    _checking
                        ? 'Vérification…'
                        : isActive
                        ? 'Actif ✓'
                        : (_enabled ?? false)
                        ? 'Activé, non sélectionné'
                        : 'Non activé',
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 19,
                      fontWeight: FontWeight.w700,
                      fontFamily: 'Fraunces',
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    isActive
                        ? 'Le clavier Bariba est activé et sélectionné comme méthode de saisie par défaut.'
                        : "Le clavier est installé avec FITILA mais doit être activé puis sélectionné pour fonctionner dans vos applications.",
                    style: const TextStyle(
                      color: Colors.white70,
                      fontSize: 11.5,
                      height: 1.4,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 14),
            _KeyboardStepCard(
              done: true,
              number: '✓',
              title: 'Clavier installé',
              subtitle:
                  'Installé automatiquement avec FITILA — aucune action requise.',
            ),
            _KeyboardStepCard(
              done: _enabled == true,
              number: '1',
              title: 'Activer dans les réglages Android',
              subtitle:
                  'Réglages → Langues et saisie → Claviers, puis active « Clavier Bariba Fitila ».',
              actionLabel: 'Ouvrir les réglages',
              onAction: _openSettings,
            ),
            _KeyboardStepCard(
              done: _selected == true,
              number: '2',
              title: 'Sélectionner comme clavier actif',
              subtitle:
                  'Choisis « Clavier Bariba Fitila » dans le sélecteur de clavier.',
              actionLabel: 'Choisir le clavier',
              onAction: _showPicker,
            ),
            const SizedBox(height: 6),
            OutlinedButton.icon(
              onPressed: _refreshStatus,
              icon: const Icon(Icons.refresh_rounded, size: 18),
              label: const Text('Vérifier le statut'),
            ),
            const SizedBox(height: 20),
            const Text(
              'Aperçu — clavier de démonstration',
              style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800),
            ),
            const SizedBox(height: 4),
            const Text(
              'Reproduit les caractères Bariba disponibles sur le clavier natif (rangée dédiée + variantes par appui long).',
              style: TextStyle(fontSize: 11.5, color: _fitilaMuted),
            ),
            const SizedBox(height: 10),
            TextField(
              controller: _controller,
              minLines: 3,
              maxLines: 5,
              decoration: const InputDecoration(
                hintText: 'Écrire ici avec les caractères Bariba...',
                prefixIcon: Icon(Icons.edit_rounded),
              ),
            ),
            const SizedBox(height: 12),
            _BaribaKeyboard(onInsert: _insert),
          ],
        ),
      ),
    );
  }
}

class _KeyboardStepCard extends StatelessWidget {
  const _KeyboardStepCard({
    required this.done,
    required this.number,
    required this.title,
    required this.subtitle,
    this.actionLabel,
    this.onAction,
  });

  final bool done;
  final String number;
  final String title;
  final String subtitle;
  final String? actionLabel;
  final VoidCallback? onAction;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: _fitilaSurface,
        border: Border.all(color: _fitilaBorder),
        borderRadius: BorderRadius.circular(14),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 26,
            height: 26,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: done
                  ? _fitilaSage.withValues(alpha: .16)
                  : _fitilaGoldDeep.withValues(alpha: .14),
            ),
            child: Text(
              number,
              style: TextStyle(
                fontWeight: FontWeight.w800,
                fontSize: 12.5,
                color: done ? _fitilaSage : _fitilaGoldDeep,
              ),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    fontWeight: FontWeight.w700,
                    fontSize: 13,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  subtitle,
                  style: const TextStyle(
                    fontSize: 11,
                    color: _fitilaMuted,
                    height: 1.4,
                  ),
                ),
                if (actionLabel != null && !done) ...[
                  const SizedBox(height: 8),
                  SizedBox(
                    height: 32,
                    child: ElevatedButton(
                      onPressed: onAction,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: _fitilaInk,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(horizontal: 14),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(9),
                        ),
                      ),
                      child: Text(
                        actionLabel!,
                        style: const TextStyle(
                          fontSize: 11.5,
                          fontWeight: FontWeight.w800,
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
      if (!mounted) {
        return;
      }
      setState(() {
        _queue = (data['queue'] as List).cast<Map<String, dynamic>>().toList(
          growable: false,
        );
        _categories = Map<String, int>.from(data['categories'] as Map);
        _total = data['total'] as int;
        _recorded = data['recorded'] as int;
      });
    } catch (_) {
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Impossible de charger le corpus vocal.')),
      );
    } finally {
      if (mounted) {
        setState(() => _loading = false);
      }
    }
  }

  Future<void> _toggleRecord() async {
    try {
      if (_recordingNow) {
        final asset = await _recorder.stopAudio();
        final elapsed = DateTime.now().difference(_startedAt ?? DateTime.now());
        if (!mounted) {
          return;
        }
        setState(() {
          _recordingNow = false;
          _recording = asset;
          _recordedDurationSeconds = elapsed.inSeconds < 1
              ? 1
              : elapsed.inSeconds;
        });
      } else {
        await _recorder.startAudio();
        if (!mounted) {
          return;
        }
        setState(() {
          _recordingNow = true;
          _recording = null;
          _startedAt = DateTime.now();
        });
      }
    } catch (error) {
      if (!mounted) {
        return;
      }
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
    if (recording == null) {
      return;
    }
    await _player.play(audio.DeviceFileSource(recording.path));
  }

  void _skip() {
    if (_queue.isEmpty) {
      return;
    }
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
    if (phrase == null || recording == null || _submitting) {
      return;
    }
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
      if (!mounted) {
        return;
      }
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
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('L’envoi vocal a échoué. Réessayez.')),
      );
    } finally {
      if (mounted) {
        setState(() => _submitting = false);
      }
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

// ============================================================================
// ESPACE ENSEIGNANT — implémentation native complète, branchée sur Supabase
// via FitilaBackend (voir lib/core/fitila_backend.dart, section "Espace
// Enseignant"). Réplique fidèle de src/pages/teacher/*.tsx.
// ============================================================================

enum _TeacherTab { overview, students, grading, keys, weights, grades, stats }

extension on _TeacherTab {
  String get label => switch (this) {
    _TeacherTab.overview => "Vue d'ensemble",
    _TeacherTab.students => 'Apprenants',
    _TeacherTab.grading => 'À corriger',
    _TeacherTab.keys => 'Corrigés',
    _TeacherTab.weights => 'Barèmes',
    _TeacherTab.grades => 'Relevé',
    _TeacherTab.stats => 'Stats',
  };

  IconData get icon => switch (this) {
    _TeacherTab.overview => Icons.dashboard_rounded,
    _TeacherTab.students => Icons.groups_rounded,
    _TeacherTab.grading => Icons.rate_review_rounded,
    _TeacherTab.keys => Icons.menu_book_rounded,
    _TeacherTab.weights => Icons.tune_rounded,
    _TeacherTab.grades => Icons.bar_chart_rounded,
    _TeacherTab.stats => Icons.insights_rounded,
  };
}

String _teacherShortDate(String? iso) {
  if (iso == null || iso.isEmpty) {
    return '—';
  }
  final d = DateTime.tryParse(iso);
  if (d == null) {
    return '—';
  }
  final local = d.toLocal();
  String two(int v) => v.toString().padLeft(2, '0');
  return '${two(local.day)}/${two(local.month)} ${two(local.hour)}:${two(local.minute)}';
}

class TeacherScreen extends StatefulWidget {
  const TeacherScreen({super.key});

  @override
  State<TeacherScreen> createState() => _TeacherScreenState();
}

class _TeacherScreenState extends State<TeacherScreen> {
  bool _loading = true;
  bool _allowed = false;
  _TeacherTab _tab = _TeacherTab.overview;

  @override
  void initState() {
    super.initState();
    _checkAccess();
  }

  Future<void> _checkAccess() async {
    var ok = false;
    try {
      ok = await FitilaBackend.isTeacher();
    } catch (_) {
      ok = false;
    }
    if (!mounted) {
      return;
    }
    setState(() {
      _allowed = ok;
      _loading = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const _PageFrame(
        title: 'Espace enseignant',
        subtitle: 'Vérification des accès…',
        child: Center(child: CircularProgressIndicator(color: _fitilaPrimary)),
      );
    }
    if (!_allowed) {
      return const _PageFrame(
        title: 'Espace enseignant',
        subtitle: 'Accès réservé',
        child: _TeacherAccessDenied(),
      );
    }
    return _PageFrame(
      title: 'Espace Enseignant',
      subtitle: 'Suivi des apprenants · Module Classe',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            height: 40,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              itemCount: _TeacherTab.values.length,
              separatorBuilder: (_, _) => const SizedBox(width: 6),
              itemBuilder: (context, i) {
                final t = _TeacherTab.values[i];
                final active = t == _tab;
                return ChoiceChip(
                  selected: active,
                  onSelected: (_) => setState(() => _tab = t),
                  avatar: Icon(
                    t.icon,
                    size: 15,
                    color: active ? const Color(0xFF2B2110) : _fitilaMuted,
                  ),
                  label: Text(t.label),
                  labelStyle: TextStyle(
                    fontSize: 11.5,
                    fontWeight: FontWeight.w700,
                    color: active ? const Color(0xFF2B2110) : _fitilaMuted,
                  ),
                  backgroundColor: _fitilaCard,
                  selectedColor: _fitilaPrimary,
                  side: BorderSide(
                    color: active ? _fitilaPrimary : _fitilaBorder,
                  ),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(100),
                  ),
                );
              },
            ),
          ),
          const SizedBox(height: 14),
          Expanded(
            child: switch (_tab) {
              _TeacherTab.overview => const _TeacherOverviewTab(),
              _TeacherTab.students => const _TeacherStudentsTab(),
              _TeacherTab.grading => const _TeacherGradingTab(),
              _TeacherTab.keys => const _TeacherAnswerKeysTab(),
              _TeacherTab.weights => const _TeacherWeightsTab(),
              _TeacherTab.grades => const _TeacherGradeOverviewTab(),
              _TeacherTab.stats => const _TeacherStatsTab(),
            },
          ),
        ],
      ),
    );
  }
}

class _TeacherAccessDenied extends StatelessWidget {
  const _TeacherAccessDenied();

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.lock_person_rounded, size: 46, color: _fitilaClay),
            const SizedBox(height: 14),
            const Text(
              'Accès réservé aux enseignants',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w700,
                color: _fitilaInk,
              ),
            ),
            const SizedBox(height: 8),
            const Text(
              "Contactez un administrateur pour obtenir le rôle Enseignant.",
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 12.5, color: _fitilaMuted),
            ),
          ],
        ),
      ),
    );
  }
}

/// Petit conteneur "carte" cohérent avec le système de signature FITILA.
class _TCard extends StatelessWidget {
  const _TCard({required this.child, this.margin});

  final Widget child;
  final EdgeInsetsGeometry? margin;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: margin,
      padding: const EdgeInsets.all(15),
      decoration: BoxDecoration(
        color: _fitilaCard,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: _fitilaBorder),
      ),
      child: child,
    );
  }
}

class _TStat extends StatelessWidget {
  const _TStat({
    required this.icon,
    required this.value,
    required this.label,
    required this.tint,
    required this.fg,
  });

  final IconData icon;
  final String value;
  final String label;
  final Color tint;
  final Color fg;

  @override
  Widget build(BuildContext context) {
    return _TCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(
              color: tint,
              borderRadius: BorderRadius.circular(11),
            ),
            child: Icon(icon, size: 17, color: fg),
          ),
          const SizedBox(height: 10),
          Text(
            value,
            style: const TextStyle(
              fontFamily: 'serif',
              fontSize: 22,
              fontWeight: FontWeight.w600,
              color: _fitilaInk,
            ),
          ),
          const SizedBox(height: 3),
          Text(
            label,
            style: const TextStyle(fontSize: 10.5, color: _fitilaMuted),
          ),
        ],
      ),
    );
  }
}

class _TeacherOverviewTab extends StatefulWidget {
  const _TeacherOverviewTab();

  @override
  State<_TeacherOverviewTab> createState() => _TeacherOverviewTabState();
}

class _TeacherOverviewTabState extends State<_TeacherOverviewTab> {
  late Future<Map<String, dynamic>> _future;

  @override
  void initState() {
    super.initState();
    _future = FitilaBackend.fetchTeacherDashboard();
  }

  Future<void> _reload() async {
    setState(() => _future = FitilaBackend.fetchTeacherDashboard());
    await _future;
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<Map<String, dynamic>>(
      future: _future,
      builder: (context, snap) {
        if (snap.connectionState != ConnectionState.done) {
          return const Center(
            child: CircularProgressIndicator(color: _fitilaPrimary),
          );
        }
        if (snap.hasError) {
          return _TeacherErrorState(message: '${snap.error}', onRetry: _reload);
        }
        final data = snap.data ?? const {};
        final avg = data['avgGrade'] as num?;
        final recent = List<Map<String, dynamic>>.from(
          data['recent'] as List? ?? const [],
        );
        return RefreshIndicator(
          onRefresh: _reload,
          color: _fitilaPrimary,
          child: ListView(
            children: [
              GridView.count(
                crossAxisCount: 2,
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                mainAxisSpacing: 10,
                crossAxisSpacing: 10,
                childAspectRatio: 1.35,
                children: [
                  _TStat(
                    icon: Icons.groups_rounded,
                    value: '${data['totalStudents'] ?? 0}',
                    label: 'Apprenants',
                    tint: _fitilaPrimarySoft,
                    fg: _fitilaGoldDeep,
                  ),
                  _TStat(
                    icon: Icons.pending_actions_rounded,
                    value: '${data['pendingGrading'] ?? 0}',
                    label: 'À corriger',
                    tint: _fitilaClay.withValues(alpha: 0.16),
                    fg: _fitilaClay,
                  ),
                  _TStat(
                    icon: Icons.trending_up_rounded,
                    value: '${data['completedLessons'] ?? 0}',
                    label: 'Leçons terminées',
                    tint: _fitilaSage.withValues(alpha: 0.16),
                    fg: _fitilaSage,
                  ),
                  _TStat(
                    icon: Icons.grade_rounded,
                    value: avg != null ? '${avg.toStringAsFixed(1)}/20' : '—',
                    label: 'Moyenne classe',
                    tint: _fitilaPrimarySoft,
                    fg: _fitilaGoldDeep,
                  ),
                ],
              ),
              const SizedBox(height: 14),
              _TCard(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Row(
                      children: [
                        Icon(
                          Icons.history_rounded,
                          size: 16,
                          color: _fitilaGoldDeep,
                        ),
                        SizedBox(width: 8),
                        Text(
                          'Activité récente',
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w800,
                            color: _fitilaInk,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 10),
                    if (recent.isEmpty)
                      const Padding(
                        padding: EdgeInsets.symmetric(vertical: 8),
                        child: Text(
                          'Aucune activité pour le moment.',
                          style: TextStyle(color: _fitilaMuted, fontSize: 12),
                        ),
                      )
                    else
                      for (final r in recent)
                        Padding(
                          padding: const EdgeInsets.symmetric(vertical: 6),
                          child: Row(
                            children: [
                              Expanded(
                                child: Text.rich(
                                  TextSpan(
                                    children: [
                                      TextSpan(
                                        text:
                                            '${(r['user_id'] as String? ?? '').substring(0, (r['user_id'] as String? ?? '').length < 6 ? (r['user_id'] as String? ?? '').length : 6)}… ',
                                        style: const TextStyle(
                                          color: _fitilaGoldDeep,
                                          fontWeight: FontWeight.w800,
                                          fontSize: 12,
                                        ),
                                      ),
                                      TextSpan(
                                        text:
                                            '${r['module']} · ${r['level']} · L${r['lesson_id']}',
                                        style: const TextStyle(
                                          color: _fitilaMuted,
                                          fontSize: 12,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                              Text(
                                _teacherShortDate(r['updated_at'] as String?),
                                style: const TextStyle(
                                  color: _fitilaMuted,
                                  fontSize: 10.5,
                                ),
                              ),
                            ],
                          ),
                        ),
                  ],
                ),
              ),
              const SizedBox(height: 20),
            ],
          ),
        );
      },
    );
  }
}

class _TeacherErrorState extends StatelessWidget {
  const _TeacherErrorState({required this.message, required this.onRetry});

  final String message;
  final Future<void> Function() onRetry;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(
              Icons.error_outline_rounded,
              color: _fitilaClay,
              size: 32,
            ),
            const SizedBox(height: 10),
            Text(
              'Impossible de charger les données.\n$message',
              textAlign: TextAlign.center,
              style: const TextStyle(color: _fitilaMuted, fontSize: 11.5),
            ),
            const SizedBox(height: 12),
            OutlinedButton(onPressed: onRetry, child: const Text('Réessayer')),
          ],
        ),
      ),
    );
  }
}

class _TeacherStudentsTab extends StatefulWidget {
  const _TeacherStudentsTab();

  @override
  State<_TeacherStudentsTab> createState() => _TeacherStudentsTabState();
}

class _TeacherStudentsTabState extends State<_TeacherStudentsTab> {
  late Future<List<Map<String, dynamic>>> _future;
  final _searchCtrl = TextEditingController();
  String _query = '';
  String? _selectedId;

  @override
  void initState() {
    super.initState();
    _future = FitilaBackend.fetchTeacherStudents();
  }

  Future<void> _reload() async {
    setState(() => _future = FitilaBackend.fetchTeacherStudents());
    await _future;
  }

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (_selectedId != null) {
      return _TeacherStudentDetailPanel(
        userId: _selectedId!,
        onBack: () => setState(() => _selectedId = null),
      );
    }
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        TextField(
          controller: _searchCtrl,
          onChanged: (v) => setState(() => _query = v.toLowerCase().trim()),
          decoration: InputDecoration(
            hintText: 'Rechercher un apprenant…',
            prefixIcon: const Icon(
              Icons.search_rounded,
              size: 19,
              color: _fitilaMuted,
            ),
            filled: true,
            fillColor: _fitilaCard,
            contentPadding: const EdgeInsets.symmetric(vertical: 4),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(16),
              borderSide: const BorderSide(color: _fitilaBorder),
            ),
          ),
        ),
        const SizedBox(height: 12),
        Expanded(
          child: FutureBuilder<List<Map<String, dynamic>>>(
            future: _future,
            builder: (context, snap) {
              if (snap.connectionState != ConnectionState.done) {
                return const Center(
                  child: CircularProgressIndicator(color: _fitilaPrimary),
                );
              }
              if (snap.hasError) {
                return _TeacherErrorState(
                  message: '${snap.error}',
                  onRetry: _reload,
                );
              }
              final rows = snap.data ?? const [];
              final filtered = _query.isEmpty
                  ? rows
                  : rows.where((r) {
                      final label = FitilaBackend.readableStudentLabel(
                        displayName: r['display_name'] as String?,
                        username: r['username'] as String?,
                        phoneNumber: r['phone_number'] as String?,
                        userId: r['user_id'] as String,
                      ).toLowerCase();
                      return label.contains(_query);
                    }).toList();
              return RefreshIndicator(
                onRefresh: _reload,
                color: _fitilaPrimary,
                child: filtered.isEmpty
                    ? ListView(
                        children: const [
                          SizedBox(height: 60),
                          Center(
                            child: Text(
                              'Aucun apprenant trouvé.',
                              style: TextStyle(color: _fitilaMuted),
                            ),
                          ),
                        ],
                      )
                    : ListView.separated(
                        itemCount: filtered.length,
                        separatorBuilder: (_, _) =>
                            const Divider(height: 1, color: _fitilaBorder),
                        itemBuilder: (context, i) {
                          final r = filtered[i];
                          final label = FitilaBackend.readableStudentLabel(
                            displayName: r['display_name'] as String?,
                            username: r['username'] as String?,
                            phoneNumber: r['phone_number'] as String?,
                            userId: r['user_id'] as String,
                          );
                          final pending = (r['pending_count'] as int?) ?? 0;
                          return Material(
                            color: _fitilaCard,
                            child: ListTile(
                              onTap: () => setState(
                                () => _selectedId = r['user_id'] as String,
                              ),
                              leading: CircleAvatar(
                                backgroundColor: _fitilaPrimary,
                                child: Text(
                                  label
                                      .replaceAll(RegExp(r'^[@📱\s]+'), '')
                                      .characters
                                      .first
                                      .toUpperCase(),
                                  style: const TextStyle(
                                    color: Color(0xFF2B2110),
                                    fontWeight: FontWeight.w800,
                                  ),
                                ),
                              ),
                              title: Text(
                                label,
                                style: const TextStyle(
                                  fontSize: 13.5,
                                  fontWeight: FontWeight.w700,
                                  color: _fitilaInk,
                                ),
                              ),
                              subtitle: Text(
                                'N1: ${r['n1_completed']} · N2: ${r['n2_completed']} leçons',
                                style: const TextStyle(
                                  fontSize: 11,
                                  color: _fitilaMuted,
                                ),
                              ),
                              trailing: pending > 0
                                  ? Container(
                                      padding: const EdgeInsets.symmetric(
                                        horizontal: 9,
                                        vertical: 4,
                                      ),
                                      decoration: BoxDecoration(
                                        color: _fitilaPrimary,
                                        borderRadius: BorderRadius.circular(
                                          100,
                                        ),
                                      ),
                                      child: Text(
                                        '$pending à noter',
                                        style: const TextStyle(
                                          fontSize: 10,
                                          fontWeight: FontWeight.w800,
                                          color: Color(0xFF2B2110),
                                        ),
                                      ),
                                    )
                                  : const Icon(
                                      Icons.chevron_right_rounded,
                                      color: _fitilaMuted,
                                    ),
                            ),
                          );
                        },
                      ),
              );
            },
          ),
        ),
      ],
    );
  }
}

class _TeacherStudentDetailPanel extends StatefulWidget {
  const _TeacherStudentDetailPanel({
    required this.userId,
    required this.onBack,
  });

  final String userId;
  final VoidCallback onBack;

  @override
  State<_TeacherStudentDetailPanel> createState() =>
      _TeacherStudentDetailPanelState();
}

class _TeacherStudentDetailPanelState
    extends State<_TeacherStudentDetailPanel> {
  late Future<Map<String, dynamic>> _future;
  String _filter = 'all';

  @override
  void initState() {
    super.initState();
    _future = FitilaBackend.fetchStudentDetail(widget.userId);
  }

  Future<void> _reload() async {
    setState(() => _future = FitilaBackend.fetchStudentDetail(widget.userId));
    await _future;
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        TextButton.icon(
          onPressed: widget.onBack,
          icon: const Icon(Icons.arrow_back_rounded, size: 16),
          label: const Text('Tous les apprenants'),
          style: TextButton.styleFrom(
            foregroundColor: _fitilaMuted,
            padding: EdgeInsets.zero,
          ),
        ),
        Expanded(
          child: FutureBuilder<Map<String, dynamic>>(
            future: _future,
            builder: (context, snap) {
              if (snap.connectionState != ConnectionState.done) {
                return const Center(
                  child: CircularProgressIndicator(color: _fitilaPrimary),
                );
              }
              if (snap.hasError) {
                return _TeacherErrorState(
                  message: '${snap.error}',
                  onRetry: _reload,
                );
              }
              final data = snap.data ?? const {};
              final profile = data['profile'] as Map<String, dynamic>?;
              final progress = List<Map<String, dynamic>>.from(
                data['progress'] as List? ?? const [],
              );
              final answers = List<Map<String, dynamic>>.from(
                data['answers'] as List? ?? const [],
              );
              final posts = List<Map<String, dynamic>>.from(
                data['posts'] as List? ?? const [],
              );
              final contributions = List<Map<String, dynamic>>.from(
                data['contributions'] as List? ?? const [],
              );
              final label = FitilaBackend.readableStudentLabel(
                displayName: profile?['display_name'] as String?,
                username: profile?['username'] as String?,
                phoneNumber: profile?['phone_number'] as String?,
                userId: widget.userId,
              );
              final n1 = progress.where((p) => p['level'] == 'N1').isEmpty
                  ? null
                  : progress.firstWhere((p) => p['level'] == 'N1');
              final n2 = progress.where((p) => p['level'] == 'N2').isEmpty
                  ? null
                  : progress.firstWhere((p) => p['level'] == 'N2');
              final visible = answers.where((a) {
                if (_filter == 'all') {
                  return true;
                }
                final graded = a['teacher_grade'] != null;
                return _filter == 'pending' ? !graded : graded;
              }).toList();

              return RefreshIndicator(
                onRefresh: _reload,
                color: _fitilaPrimary,
                child: ListView(
                  children: [
                    _TCard(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              CircleAvatar(
                                radius: 28,
                                backgroundColor: _fitilaPrimary,
                                child: Text(
                                  label
                                      .replaceAll(RegExp(r'^[@📱\s]+'), '')
                                      .characters
                                      .first
                                      .toUpperCase(),
                                  style: const TextStyle(
                                    color: Color(0xFF2B2110),
                                    fontWeight: FontWeight.w800,
                                    fontSize: 20,
                                  ),
                                ),
                              ),
                              const SizedBox(width: 14),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      label,
                                      style: const TextStyle(
                                        fontFamily: 'serif',
                                        fontSize: 17,
                                        fontWeight: FontWeight.w600,
                                        color: _fitilaInk,
                                      ),
                                    ),
                                    if (profile?['phone_number'] != null)
                                      Padding(
                                        padding: const EdgeInsets.only(top: 3),
                                        child: Text(
                                          '${profile?['phone_number']}',
                                          style: const TextStyle(
                                            fontSize: 11,
                                            color: _fitilaMuted,
                                          ),
                                        ),
                                      ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 14),
                          GridView.count(
                            crossAxisCount: 2,
                            shrinkWrap: true,
                            physics: const NeverScrollableScrollPhysics(),
                            mainAxisSpacing: 8,
                            crossAxisSpacing: 8,
                            childAspectRatio: 2.4,
                            children: [
                              _miniStat(
                                'Inscrit',
                                profile?['created_at'] != null
                                    ? _teacherShortDate(
                                        profile?['created_at'] as String?,
                                      )
                                    : '—',
                              ),
                              _miniStat(
                                'Points',
                                '${profile?['total_points'] ?? 0}',
                              ),
                              _miniStat(
                                'Niveau XP',
                                '${profile?['level'] ?? 1}',
                              ),
                              _miniStat('Réponses', '${answers.length}'),
                            ],
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        Expanded(child: _levelCard('🔥 Niveau 1', n1)),
                        const SizedBox(width: 10),
                        Expanded(child: _levelCard('🚀 Niveau 2', n2)),
                      ],
                    ),
                    const SizedBox(height: 12),
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Expanded(
                          child: _TCard(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text(
                                  'Posts TamTam',
                                  style: TextStyle(
                                    fontSize: 12,
                                    fontWeight: FontWeight.w800,
                                    color: _fitilaInk,
                                  ),
                                ),
                                const SizedBox(height: 6),
                                if (posts.isEmpty)
                                  const Text(
                                    'Aucun post.',
                                    style: TextStyle(
                                      fontSize: 10.5,
                                      color: _fitilaMuted,
                                    ),
                                  )
                                else
                                  for (final p in posts.take(3))
                                    Padding(
                                      padding: const EdgeInsets.only(bottom: 3),
                                      child: Text(
                                        p['transcript_fr'] as String? ??
                                            '(audio)',
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                        style: const TextStyle(
                                          fontSize: 10.5,
                                          color: _fitilaInkSoft,
                                        ),
                                      ),
                                    ),
                              ],
                            ),
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: _TCard(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text(
                                  'Dictionnaire',
                                  style: TextStyle(
                                    fontSize: 12,
                                    fontWeight: FontWeight.w800,
                                    color: _fitilaInk,
                                  ),
                                ),
                                const SizedBox(height: 6),
                                if (contributions.isEmpty)
                                  const Text(
                                    'Aucune contribution.',
                                    style: TextStyle(
                                      fontSize: 10.5,
                                      color: _fitilaMuted,
                                    ),
                                  )
                                else
                                  for (final c in contributions.take(3))
                                    Padding(
                                      padding: const EdgeInsets.only(bottom: 3),
                                      child: Text.rich(
                                        TextSpan(
                                          children: [
                                            TextSpan(
                                              text: '${c['word']} ',
                                              style: const TextStyle(
                                                fontWeight: FontWeight.w800,
                                                fontSize: 10.5,
                                                color: _fitilaInk,
                                              ),
                                            ),
                                            TextSpan(
                                              text: '${c['definition']}',
                                              style: const TextStyle(
                                                fontSize: 10.5,
                                                color: _fitilaMuted,
                                              ),
                                            ),
                                          ],
                                        ),
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                    ),
                              ],
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),
                    Row(
                      children: [
                        Text(
                          'Réponses (${visible.length})',
                          style: const TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w800,
                            color: _fitilaInk,
                          ),
                        ),
                        const Spacer(),
                        for (final f in const [
                          ('all', 'Toutes'),
                          ('pending', 'À corriger'),
                          ('graded', 'Corrigées'),
                        ])
                          Padding(
                            padding: const EdgeInsets.only(left: 5),
                            child: ChoiceChip(
                              visualDensity: VisualDensity.compact,
                              selected: _filter == f.$1,
                              label: Text(
                                f.$2,
                                style: const TextStyle(fontSize: 10.5),
                              ),
                              selectedColor: _fitilaPrimary,
                              onSelected: (_) => setState(() => _filter = f.$1),
                            ),
                          ),
                      ],
                    ),
                    const SizedBox(height: 10),
                    if (visible.isEmpty)
                      const Padding(
                        padding: EdgeInsets.symmetric(vertical: 20),
                        child: Center(
                          child: Text(
                            'Aucune réponse à afficher.',
                            style: TextStyle(color: _fitilaMuted),
                          ),
                        ),
                      )
                    else
                      for (final a in visible)
                        Padding(
                          padding: const EdgeInsets.only(bottom: 12),
                          child: _AnswerGradeCard(
                            answer: a,
                            studentLabel: label,
                            onGraded: _reload,
                          ),
                        ),
                    const SizedBox(height: 20),
                  ],
                ),
              );
            },
          ),
        ),
      ],
    );
  }

  Widget _miniStat(String label, String value) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
      decoration: BoxDecoration(
        color: _fitilaSurfaceAlt,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text(
            label,
            style: const TextStyle(fontSize: 9.5, color: _fitilaMuted),
          ),
          Text(
            value,
            style: const TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w800,
              color: _fitilaInk,
            ),
          ),
        ],
      ),
    );
  }

  Widget _levelCard(String title, Map<String, dynamic>? p) {
    final completed = (p?['completed_lessons'] as List?)?.length ?? 0;
    return _TCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: const TextStyle(
              fontSize: 12.5,
              fontWeight: FontWeight.w800,
              color: _fitilaInk,
            ),
          ),
          const SizedBox(height: 6),
          Text.rich(
            TextSpan(
              children: [
                TextSpan(
                  text: '$completed',
                  style: const TextStyle(
                    fontFamily: 'serif',
                    fontSize: 20,
                    fontWeight: FontWeight.w600,
                    color: _fitilaInk,
                  ),
                ),
                const TextSpan(
                  text: ' leçons',
                  style: TextStyle(fontSize: 11, color: _fitilaMuted),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// Carte de correction : réponse (texte ou audio) + saisie de note + validation.
/// Utilisée à la fois dans le détail apprenant et dans la file "À corriger".
class _AnswerGradeCard extends StatefulWidget {
  const _AnswerGradeCard({
    required this.answer,
    required this.onGraded,
    this.studentLabel,
  });

  final Map<String, dynamic> answer;
  final Future<void> Function() onGraded;
  final String? studentLabel;

  @override
  State<_AnswerGradeCard> createState() => _AnswerGradeCardState();
}

class _AnswerGradeCardState extends State<_AnswerGradeCard> {
  late final TextEditingController _gradeCtrl;
  late final TextEditingController _commentCtrl;
  bool _saving = false;
  bool _showPalette = false;
  final _media = FitilaMediaController();
  String? _recording; // 'personal' | 'generic' | null
  FitilaMediaAsset? _personalAsset;
  FitilaMediaAsset? _genericAsset;

  @override
  void initState() {
    super.initState();
    final grade = widget.answer['teacher_grade'];
    _gradeCtrl = TextEditingController(text: grade != null ? '$grade' : '');
    _commentCtrl = TextEditingController(
      text: widget.answer['teacher_comment'] as String? ?? '',
    );
  }

  @override
  void dispose() {
    _gradeCtrl.dispose();
    _commentCtrl.dispose();
    _media.dispose();
    super.dispose();
  }

  void _insertBariba(String letter) {
    final sel = _commentCtrl.selection;
    final text = _commentCtrl.text;
    final start = sel.start < 0 ? text.length : sel.start;
    final end = sel.end < 0 ? text.length : sel.end;
    final next = text.replaceRange(start, end, letter);
    _commentCtrl.value = TextEditingValue(
      text: next,
      selection: TextSelection.collapsed(offset: start + letter.length),
    );
  }

  Future<void> _toggleRecording(String which) async {
    if (_recording == which) {
      final asset = await _media.stopAudio();
      setState(() {
        _recording = null;
        if (which == 'personal') {
          _personalAsset = asset;
        } else {
          _genericAsset = asset;
        }
      });
      return;
    }
    if (_recording != null) return; // un seul enregistrement à la fois
    try {
      await _media.startAudio();
      setState(() => _recording = which);
    } catch (e) {
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('Micro indisponible : $e')));
    }
  }

  Future<void> _submit() async {
    final grade = num.tryParse(_gradeCtrl.text.replaceAll(',', '.'));
    if (grade == null || grade < 0 || grade > 20) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Entrez une note entre 0 et 20.')),
      );
      return;
    }
    setState(() => _saving = true);
    try {
      final personalBytes = _personalAsset != null
          ? await _personalAsset!.readBytes()
          : null;
      final genericBytes = _genericAsset != null
          ? await _genericAsset!.readBytes()
          : null;
      await FitilaBackend.gradeAnswerWithAudio(
        answerId: widget.answer['id'] as String,
        grade: grade,
        comment: _commentCtrl.text.trim().isEmpty
            ? null
            : _commentCtrl.text.trim(),
        personalAudioBytes: personalBytes,
        genericAudioBytes: genericBytes,
      );
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('✓ Note enregistrée'),
          backgroundColor: _fitilaSage,
        ),
      );
      await widget.onGraded();
    } catch (e) {
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('Erreur : $e')));
    } finally {
      if (mounted) {
        setState(() => _saving = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final a = widget.answer;
    final hasAudio = (a['answer_audio_path'] as String?)?.isNotEmpty ?? false;
    final graded = a['teacher_grade'] != null;
    return _TCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              if (widget.studentLabel != null) ...[
                Expanded(
                  child: Text(
                    widget.studentLabel!,
                    style: const TextStyle(
                      fontSize: 11.5,
                      fontWeight: FontWeight.w800,
                      color: _fitilaGoldDeep,
                    ),
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ] else
                Expanded(
                  child: Text(
                    '${a['module']} · ${a['level']} · L${a['lesson_id']}',
                    style: const TextStyle(
                      fontSize: 11.5,
                      fontWeight: FontWeight.w800,
                      color: _fitilaGoldDeep,
                    ),
                  ),
                ),
              Text(
                _teacherShortDate(a['updated_at'] as String?),
                style: const TextStyle(fontSize: 10, color: _fitilaMuted),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            'Q${(a['question_idx'] as int? ?? 0) + 1} — ${a['module']} · ${a['level']} · L${a['lesson_id']}',
            style: const TextStyle(
              fontSize: 10,
              color: _fitilaMuted,
              letterSpacing: .2,
            ),
          ),
          const SizedBox(height: 6),
          if (hasAudio)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
              decoration: BoxDecoration(
                color: _fitilaSurfaceAlt,
                borderRadius: BorderRadius.circular(10),
              ),
              child: Row(
                children: [
                  const Icon(
                    Icons.graphic_eq_rounded,
                    size: 18,
                    color: _fitilaClay,
                  ),
                  const SizedBox(width: 8),
                  Text(
                    'Réponse audio · ${a['answer_audio_duration'] ?? '—'}s',
                    style: const TextStyle(
                      fontSize: 11.5,
                      color: _fitilaInkSoft,
                    ),
                  ),
                ],
              ),
            )
          else
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: _fitilaSurfaceAlt,
                borderRadius: BorderRadius.circular(10),
              ),
              child: Text(
                (a['answer_text'] as String?)?.isNotEmpty == true
                    ? a['answer_text'] as String
                    : '(sans réponse)',
                style: const TextStyle(
                  fontSize: 12.5,
                  color: _fitilaInkSoft,
                  height: 1.4,
                ),
              ),
            ),
          const SizedBox(height: 10),
          if (graded && !_saving)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
              decoration: BoxDecoration(
                color: _fitilaSage.withValues(alpha: 0.16),
                borderRadius: BorderRadius.circular(100),
              ),
              child: Text(
                '✓ Corrigée — ${a['teacher_grade']}/20',
                style: const TextStyle(
                  fontSize: 10.5,
                  fontWeight: FontWeight.w800,
                  color: _fitilaSage,
                ),
              ),
            ),
          Row(
            children: [
              SizedBox(
                width: 56,
                child: TextField(
                  controller: _gradeCtrl,
                  keyboardType: const TextInputType.numberWithOptions(
                    decimal: true,
                  ),
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    fontWeight: FontWeight.w800,
                    fontSize: 13,
                  ),
                  decoration: InputDecoration(
                    isDense: true,
                    contentPadding: const EdgeInsets.symmetric(vertical: 8),
                    hintText: '—',
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(9),
                      borderSide: const BorderSide(color: _fitilaBorder),
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 6),
              const Text(
                '/ 20',
                style: TextStyle(fontSize: 11, color: _fitilaMuted),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: TextField(
                  controller: _commentCtrl,
                  style: const TextStyle(fontSize: 11.5),
                  decoration: InputDecoration(
                    isDense: true,
                    hintText: 'Commentaire (optionnel)',
                    hintStyle: const TextStyle(
                      fontSize: 11,
                      color: _fitilaMuted,
                    ),
                    contentPadding: const EdgeInsets.symmetric(
                      horizontal: 10,
                      vertical: 8,
                    ),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(9),
                      borderSide: const BorderSide(color: _fitilaBorder),
                    ),
                    suffixIcon: IconButton(
                      iconSize: 16,
                      icon: Text(
                        'ɔɛŋ',
                        style: TextStyle(
                          color: _showPalette ? _fitilaGoldDeep : _fitilaMuted,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                      onPressed: () =>
                          setState(() => _showPalette = !_showPalette),
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              SizedBox(
                height: 36,
                child: ElevatedButton(
                  onPressed: _saving ? null : _submit,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: _fitilaSage,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(horizontal: 14),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(9),
                    ),
                  ),
                  child: _saving
                      ? const SizedBox(
                          width: 14,
                          height: 14,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: Colors.white,
                          ),
                        )
                      : const Text(
                          'Valider',
                          style: TextStyle(
                            fontSize: 11.5,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                ),
              ),
            ],
          ),
          if (_showPalette)
            Padding(
              padding: const EdgeInsets.only(top: 8),
              child: Wrap(
                spacing: 5,
                runSpacing: 5,
                children: [
                  for (final letter in _baribaLetters)
                    InkWell(
                      onTap: () => _insertBariba(letter),
                      borderRadius: BorderRadius.circular(7),
                      child: Container(
                        width: 26,
                        height: 26,
                        alignment: Alignment.center,
                        decoration: BoxDecoration(
                          color: _fitilaSurfaceAlt,
                          borderRadius: BorderRadius.circular(7),
                        ),
                        child: Text(
                          letter,
                          style: const TextStyle(
                            fontSize: 12.5,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                    ),
                ],
              ),
            ),
          const SizedBox(height: 10),
          Text(
            'Correction vocale',
            style: const TextStyle(
              fontSize: 10.5,
              fontWeight: FontWeight.w800,
              color: _fitilaMuted,
            ),
          ),
          const SizedBox(height: 6),
          Row(
            children: [
              Expanded(
                child: _TeacherAudioRecorderChip(
                  label: 'Personnalisée',
                  icon: Icons.person_rounded,
                  recording: _recording == 'personal',
                  hasAsset: _personalAsset != null,
                  disabled: _recording != null && _recording != 'personal',
                  onTap: () => _toggleRecording('personal'),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: _TeacherAudioRecorderChip(
                  label: 'Générale',
                  icon: Icons.campaign_rounded,
                  recording: _recording == 'generic',
                  hasAsset: _genericAsset != null,
                  disabled: _recording != null && _recording != 'generic',
                  onTap: () => _toggleRecording('generic'),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _TeacherAudioRecorderChip extends StatelessWidget {
  const _TeacherAudioRecorderChip({
    required this.label,
    required this.icon,
    required this.recording,
    required this.hasAsset,
    required this.onTap,
    this.disabled = false,
  });

  final String label;
  final IconData icon;
  final bool recording;
  final bool hasAsset;
  final bool disabled;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final color = recording
        ? Colors.red
        : (hasAsset ? _fitilaSage : _fitilaMuted);
    return InkWell(
      onTap: disabled ? null : onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 8),
        decoration: BoxDecoration(
          border: Border.all(
            color: disabled ? _fitilaBorder : color,
            style: BorderStyle.solid,
          ),
          borderRadius: BorderRadius.circular(12),
          color: hasAsset ? _fitilaSage.withValues(alpha: .08) : null,
        ),
        child: Column(
          children: [
            Icon(
              recording
                  ? Icons.stop_circle_rounded
                  : (hasAsset ? Icons.check_circle_rounded : icon),
              size: 18,
              color: disabled ? _fitilaMuted : color,
            ),
            const SizedBox(height: 3),
            Text(
              recording ? 'Arrêter…' : (hasAsset ? '$label ✓' : label),
              style: TextStyle(
                fontSize: 10,
                fontWeight: FontWeight.w700,
                color: disabled ? _fitilaMuted : color,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _TeacherGradingTab extends StatefulWidget {
  const _TeacherGradingTab();

  @override
  State<_TeacherGradingTab> createState() => _TeacherGradingTabState();
}

class _TeacherGradingTabState extends State<_TeacherGradingTab> {
  String _module = 'all';
  String _level = 'all';
  late Future<List<Map<String, dynamic>>> _future;

  static const _modules = [
    ('all', 'Tous modules'),
    ('calcul', 'Calcul'),
    ('gestion', 'Gestion'),
    ('lesson', 'Leçon'),
    ('evaluation', 'Évaluation'),
    ('grammaire', 'Grammaire'),
    ('textprod', 'Production'),
  ];
  static const _levels = [
    ('all', 'N1 + N2'),
    ('N1', 'N1 uniquement'),
    ('N2', 'N2 uniquement'),
  ];

  @override
  void initState() {
    super.initState();
    _load();
  }

  void _load() {
    _future = FitilaBackend.fetchPendingGrading(
      module: _module == 'all' ? null : _module,
      level: _level == 'all' ? null : _level,
    );
  }

  Future<void> _reload() async {
    setState(_load);
    await _future;
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Expanded(
              child: DropdownButtonFormField<String>(
                initialValue: _module,
                isExpanded: true,
                style: const TextStyle(fontSize: 11.5, color: _fitilaInkSoft),
                decoration: InputDecoration(
                  isDense: true,
                  contentPadding: const EdgeInsets.symmetric(
                    horizontal: 10,
                    vertical: 8,
                  ),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(10),
                    borderSide: const BorderSide(color: _fitilaBorder),
                  ),
                ),
                items: [
                  for (final m in _modules)
                    DropdownMenuItem(value: m.$1, child: Text(m.$2)),
                ],
                onChanged: (v) => setState(() {
                  _module = v ?? 'all';
                  _load();
                }),
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: DropdownButtonFormField<String>(
                initialValue: _level,
                isExpanded: true,
                style: const TextStyle(fontSize: 11.5, color: _fitilaInkSoft),
                decoration: InputDecoration(
                  isDense: true,
                  contentPadding: const EdgeInsets.symmetric(
                    horizontal: 10,
                    vertical: 8,
                  ),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(10),
                    borderSide: const BorderSide(color: _fitilaBorder),
                  ),
                ),
                items: [
                  for (final l in _levels)
                    DropdownMenuItem(value: l.$1, child: Text(l.$2)),
                ],
                onChanged: (v) => setState(() {
                  _level = v ?? 'all';
                  _load();
                }),
              ),
            ),
          ],
        ),
        const SizedBox(height: 10),
        Expanded(
          child: FutureBuilder<List<Map<String, dynamic>>>(
            future: _future,
            builder: (context, snap) {
              if (snap.connectionState != ConnectionState.done) {
                return const Center(
                  child: CircularProgressIndicator(color: _fitilaPrimary),
                );
              }
              if (snap.hasError) {
                return _TeacherErrorState(
                  message: '${snap.error}',
                  onRetry: _reload,
                );
              }
              final items = snap.data ?? const [];
              return RefreshIndicator(
                onRefresh: _reload,
                color: _fitilaPrimary,
                child: items.isEmpty
                    ? ListView(
                        children: const [
                          SizedBox(height: 60),
                          Center(
                            child: Text(
                              '🎉 Tout est à jour, aucune copie en attente !',
                              textAlign: TextAlign.center,
                              style: TextStyle(color: _fitilaMuted),
                            ),
                          ),
                        ],
                      )
                    : ListView.builder(
                        itemCount: items.length,
                        itemBuilder: (context, i) => Padding(
                          padding: const EdgeInsets.only(bottom: 12),
                          child: _AnswerGradeCard(
                            answer: items[i],
                            studentLabel: items[i]['_student_label'] as String?,
                            onGraded: _reload,
                          ),
                        ),
                      ),
              );
            },
          ),
        ),
      ],
    );
  }
}

class _TeacherAnswerKeysTab extends StatefulWidget {
  const _TeacherAnswerKeysTab();

  @override
  State<_TeacherAnswerKeysTab> createState() => _TeacherAnswerKeysTabState();
}

class _TeacherAnswerKeysTabState extends State<_TeacherAnswerKeysTab> {
  String _level = 'N1';
  late Future<List<Map<String, dynamic>>> _future;
  final Map<String, TextEditingController> _editing = {};

  @override
  void initState() {
    super.initState();
    _future = FitilaBackend.fetchAnswerKeys(_level);
  }

  Future<void> _reload() async {
    setState(() => _future = FitilaBackend.fetchAnswerKeys(_level));
    await _future;
  }

  @override
  void dispose() {
    for (final c in _editing.values) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> _openEditor([Map<String, dynamic>? existing]) async {
    final saved = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) =>
          _AnswerKeyEditorSheet(level: _level, existing: existing),
    );
    if (saved == true) {
      await _reload();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            for (final lvl in const ['N1', 'N2'])
              Padding(
                padding: const EdgeInsets.only(right: 8),
                child: ChoiceChip(
                  selected: _level == lvl,
                  label: Text(lvl == 'N1' ? '🔥 Niveau 1' : '🚀 Niveau 2'),
                  selectedColor: _fitilaPrimary,
                  onSelected: (_) => setState(() {
                    _level = lvl;
                    _future = FitilaBackend.fetchAnswerKeys(_level);
                  }),
                ),
              ),
            const Spacer(),
            IconButton.filled(
              onPressed: () => _openEditor(),
              icon: const Icon(Icons.add_rounded, size: 20),
              tooltip: 'Ajouter un corrigé',
            ),
          ],
        ),
        const SizedBox(height: 4),
        const Text(
          "Les réponses ci-dessous s'affichent automatiquement à l'apprenant après sa soumission.",
          style: TextStyle(fontSize: 10.5, color: _fitilaMuted),
        ),
        const SizedBox(height: 10),
        Expanded(
          child: FutureBuilder<List<Map<String, dynamic>>>(
            future: _future,
            builder: (context, snap) {
              if (snap.connectionState != ConnectionState.done) {
                return const Center(
                  child: CircularProgressIndicator(color: _fitilaPrimary),
                );
              }
              if (snap.hasError) {
                return _TeacherErrorState(
                  message: '${snap.error}',
                  onRetry: _reload,
                );
              }
              final keys = snap.data ?? const [];
              if (keys.isEmpty) {
                return Center(
                  child: Padding(
                    padding: const EdgeInsets.all(20),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Text(
                          "Aucun corrigé enregistré pour ce niveau pour l'instant.",
                          textAlign: TextAlign.center,
                          style: TextStyle(color: _fitilaMuted, fontSize: 11.5),
                        ),
                        const SizedBox(height: 10),
                        FilledButton.icon(
                          onPressed: () => _openEditor(),
                          icon: const Icon(Icons.add_rounded, size: 18),
                          label: const Text('Ajouter le premier corrigé'),
                        ),
                      ],
                    ),
                  ),
                );
              }
              return RefreshIndicator(
                onRefresh: _reload,
                color: _fitilaPrimary,
                child: ListView.separated(
                  itemCount: keys.length,
                  separatorBuilder: (_, _) => const SizedBox(height: 10),
                  itemBuilder: (context, i) {
                    final k = keys[i];
                    final accepted = List<String>.from(
                      k['accepted_answers'] as List? ?? const [],
                    );
                    return InkWell(
                      onTap: () => _openEditor(k),
                      borderRadius: BorderRadius.circular(14),
                      child: _TCard(
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Icon(
                              Icons.check_circle_rounded,
                              size: 16,
                              color: _fitilaSage,
                            ),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    '${k['module']} · L${k['lesson_id']}${(k['section_key'] as String? ?? '').isNotEmpty ? ' · ${k['section_key']}' : ''} · Q${(k['question_idx'] as int? ?? 0) + 1}',
                                    style: const TextStyle(
                                      fontSize: 10,
                                      color: _fitilaMuted,
                                      fontFamily: 'monospace',
                                    ),
                                  ),
                                  const SizedBox(height: 3),
                                  Text(
                                    accepted.isEmpty
                                        ? '(aucune variante)'
                                        : accepted.join(' / '),
                                    style: const TextStyle(
                                      fontSize: 12.5,
                                      fontWeight: FontWeight.w700,
                                      color: _fitilaSage,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            const Icon(
                              Icons.edit_rounded,
                              size: 15,
                              color: _fitilaMuted,
                            ),
                          ],
                        ),
                      ),
                    );
                  },
                ),
              );
            },
          ),
        ),
      ],
    );
  }
}

class _AnswerKeyEditorSheet extends StatefulWidget {
  const _AnswerKeyEditorSheet({required this.level, this.existing});

  final String level;
  final Map<String, dynamic>? existing;

  @override
  State<_AnswerKeyEditorSheet> createState() => _AnswerKeyEditorSheetState();
}

class _AnswerKeyEditorSheetState extends State<_AnswerKeyEditorSheet> {
  static const _modules = [
    'lesson',
    'calcul',
    'evaluation',
    'gestion',
    'grammaire',
    'textprod',
  ];
  late String _module;
  late final TextEditingController _lessonId;
  late final TextEditingController _sectionKey;
  late final TextEditingController _questionIdx;
  late final TextEditingController _questionText;
  late final TextEditingController _explanation;
  late final TextEditingController _newVariant;
  late List<String> _accepted;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    final e = widget.existing;
    _module = e?['module'] as String? ?? _modules.first;
    _lessonId = TextEditingController(text: e?['lesson_id']?.toString() ?? '');
    _sectionKey = TextEditingController(
      text: e?['section_key']?.toString() ?? '',
    );
    _questionIdx = TextEditingController(
      text: e?['question_idx']?.toString() ?? '0',
    );
    _questionText = TextEditingController(
      text: e?['question_text']?.toString() ?? '',
    );
    _explanation = TextEditingController(
      text: e?['explanation']?.toString() ?? '',
    );
    _newVariant = TextEditingController();
    _accepted = List<String>.from(e?['accepted_answers'] as List? ?? const []);
  }

  @override
  void dispose() {
    _lessonId.dispose();
    _sectionKey.dispose();
    _questionIdx.dispose();
    _questionText.dispose();
    _explanation.dispose();
    _newVariant.dispose();
    super.dispose();
  }

  void _addVariant() {
    final value = _newVariant.text.trim();
    if (value.isEmpty) {
      return;
    }
    setState(() {
      _accepted = [..._accepted, value];
      _newVariant.clear();
    });
  }

  Future<void> _save() async {
    final lessonId = int.tryParse(_lessonId.text.trim());
    final questionIdx = int.tryParse(_questionIdx.text.trim());
    if (lessonId == null || questionIdx == null || _accepted.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text(
            'Leçon, question et au moins une réponse acceptée sont requis.',
          ),
        ),
      );
      return;
    }
    setState(() => _saving = true);
    try {
      await FitilaBackend.saveAnswerKey({
        'level': widget.level,
        'module': _module,
        'lesson_id': lessonId,
        'section_key': _sectionKey.text.trim(),
        'question_idx': questionIdx,
        'question_text': _questionText.text.trim().isEmpty
            ? null
            : _questionText.text.trim(),
        'accepted_answers': _accepted,
        'explanation': _explanation.text.trim().isEmpty
            ? null
            : _explanation.text.trim(),
      });
      if (!mounted) {
        return;
      }
      Navigator.pop(context, true);
    } catch (e) {
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('Erreur : $e')));
    } finally {
      if (mounted) {
        setState(() => _saving = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return DraggableScrollableSheet(
      initialChildSize: 0.85,
      minChildSize: 0.5,
      maxChildSize: 0.95,
      builder: (context, scrollController) => Container(
        decoration: const BoxDecoration(
          color: _fitilaSurface,
          borderRadius: BorderRadius.vertical(top: Radius.circular(22)),
        ),
        padding: const EdgeInsets.fromLTRB(18, 14, 18, 18),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(
              child: Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: _fitilaBorder,
                  borderRadius: BorderRadius.circular(100),
                ),
              ),
            ),
            const SizedBox(height: 12),
            Text(
              widget.existing == null
                  ? 'Nouveau corrigé — ${widget.level}'
                  : 'Modifier le corrigé — ${widget.level}',
              style: const TextStyle(
                fontFamily: 'serif',
                fontSize: 18,
                fontWeight: FontWeight.w700,
              ),
            ),
            const SizedBox(height: 14),
            Expanded(
              child: ListView(
                controller: scrollController,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: DropdownButtonFormField<String>(
                          initialValue: _module,
                          decoration: const InputDecoration(
                            labelText: 'Module',
                            isDense: true,
                          ),
                          items: [
                            for (final m in _modules)
                              DropdownMenuItem(value: m, child: Text(m)),
                          ],
                          onChanged: (v) =>
                              setState(() => _module = v ?? _module),
                        ),
                      ),
                      const SizedBox(width: 10),
                      SizedBox(
                        width: 90,
                        child: TextField(
                          controller: _lessonId,
                          keyboardType: TextInputType.number,
                          decoration: const InputDecoration(
                            labelText: 'Leçon #',
                            isDense: true,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  Row(
                    children: [
                      Expanded(
                        child: TextField(
                          controller: _sectionKey,
                          decoration: const InputDecoration(
                            labelText: 'Section (ex: observe)',
                            isDense: true,
                          ),
                        ),
                      ),
                      const SizedBox(width: 10),
                      SizedBox(
                        width: 90,
                        child: TextField(
                          controller: _questionIdx,
                          keyboardType: TextInputType.number,
                          decoration: const InputDecoration(
                            labelText: 'Question #',
                            isDense: true,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  TextField(
                    controller: _questionText,
                    maxLines: 2,
                    decoration: const InputDecoration(
                      labelText: 'Question (optionnel)',
                      isDense: true,
                    ),
                  ),
                  const SizedBox(height: 14),
                  const Text(
                    'Réponses acceptées',
                    style: TextStyle(
                      fontWeight: FontWeight.w800,
                      fontSize: 12.5,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 6,
                    runSpacing: 6,
                    children: [
                      for (final v in _accepted)
                        Chip(
                          label: Text(
                            v,
                            style: const TextStyle(
                              fontSize: 11.5,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                          backgroundColor: _fitilaSage.withValues(alpha: .14),
                          deleteIcon: const Icon(Icons.close_rounded, size: 14),
                          onDeleted: () => setState(
                            () => _accepted = _accepted
                                .where((x) => x != v)
                                .toList(),
                          ),
                        ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Expanded(
                        child: TextField(
                          controller: _newVariant,
                          decoration: const InputDecoration(
                            hintText: 'Ajouter une variante…',
                            isDense: true,
                          ),
                          onSubmitted: (_) => _addVariant(),
                        ),
                      ),
                      IconButton(
                        onPressed: _addVariant,
                        icon: const Icon(Icons.add_circle_rounded),
                      ),
                    ],
                  ),
                  const SizedBox(height: 14),
                  TextField(
                    controller: _explanation,
                    maxLines: 3,
                    decoration: const InputDecoration(
                      labelText: 'Explication (optionnel)',
                      isDense: true,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 5,
                    runSpacing: 5,
                    children: [
                      for (final letter in _baribaLetters)
                        InkWell(
                          onTap: () {
                            final sel = _explanation.selection;
                            final text = _explanation.text;
                            final start = sel.start < 0
                                ? text.length
                                : sel.start;
                            final end = sel.end < 0 ? text.length : sel.end;
                            _explanation.value = TextEditingValue(
                              text: text.replaceRange(start, end, letter),
                              selection: TextSelection.collapsed(
                                offset: start + letter.length,
                              ),
                            );
                          },
                          borderRadius: BorderRadius.circular(7),
                          child: Container(
                            width: 26,
                            height: 26,
                            alignment: Alignment.center,
                            decoration: BoxDecoration(
                              color: _fitilaSurfaceAlt,
                              borderRadius: BorderRadius.circular(7),
                            ),
                            child: Text(
                              letter,
                              style: const TextStyle(
                                fontSize: 12.5,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                          ),
                        ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 10),
            SizedBox(
              width: double.infinity,
              child: FilledButton(
                onPressed: _saving ? null : _save,
                child: _saving
                    ? const SizedBox(
                        width: 16,
                        height: 16,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: Colors.white,
                        ),
                      )
                    : const Text('Publier le corrigé'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _TeacherWeightsTab extends StatefulWidget {
  const _TeacherWeightsTab();

  @override
  State<_TeacherWeightsTab> createState() => _TeacherWeightsTabState();
}

class _TeacherWeightsTabState extends State<_TeacherWeightsTab> {
  String _level = 'N1';
  String _module = 'lesson';
  late Future<List<Map<String, dynamic>>> _future;
  final _lessonCtrl = TextEditingController();
  final _sectionCtrl = TextEditingController();
  final _qCtrl = TextEditingController(text: '0');
  final _weightCtrl = TextEditingController(text: '1');
  bool _saving = false;

  static const _levels = ['N1', 'N2'];
  static const _modules = [
    'lesson',
    'calcul',
    'gestion',
    'grammaire',
    'textprod',
    'evaluation',
  ];

  @override
  void initState() {
    super.initState();
    _load();
  }

  void _load() {
    _future = FitilaBackend.fetchGradeWeights(level: _level, module: _module);
  }

  Future<void> _reload() async {
    setState(_load);
    await _future;
  }

  @override
  void dispose() {
    _lessonCtrl.dispose();
    _sectionCtrl.dispose();
    _qCtrl.dispose();
    _weightCtrl.dispose();
    super.dispose();
  }

  Future<void> _quickAdd() async {
    if (_lessonCtrl.text.trim().isEmpty) {
      return;
    }
    setState(() => _saving = true);
    try {
      await FitilaBackend.saveGradeWeight({
        'level': _level,
        'module': _module,
        'lesson_id': _lessonCtrl.text.trim(),
        'section_key': _sectionCtrl.text.trim(),
        'question_idx': int.tryParse(_qCtrl.text) ?? 0,
        'weight': double.tryParse(_weightCtrl.text.replaceAll(',', '.')) ?? 1,
        'section_weight': 1,
        'lesson_weight': 1,
      });
      _lessonCtrl.clear();
      _sectionCtrl.clear();
      _qCtrl.text = '0';
      _weightCtrl.text = '1';
      await _reload();
    } catch (e) {
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('Erreur : $e')));
    } finally {
      if (mounted) {
        setState(() => _saving = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Poids de chaque question, section et leçon. Sans configuration, poids = 1 partout.',
          style: TextStyle(fontSize: 10.5, color: _fitilaMuted),
        ),
        const SizedBox(height: 10),
        Row(
          children: [
            Expanded(
              child: DropdownButtonFormField<String>(
                initialValue: _level,
                decoration: const InputDecoration(
                  isDense: true,
                  border: OutlineInputBorder(),
                ),
                items: [
                  for (final l in _levels)
                    DropdownMenuItem(value: l, child: Text(l)),
                ],
                onChanged: (v) => setState(() {
                  _level = v ?? 'N1';
                  _load();
                }),
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: DropdownButtonFormField<String>(
                initialValue: _module,
                decoration: const InputDecoration(
                  isDense: true,
                  border: OutlineInputBorder(),
                ),
                items: [
                  for (final m in _modules)
                    DropdownMenuItem(value: m, child: Text(m)),
                ],
                onChanged: (v) => setState(() {
                  _module = v ?? 'lesson';
                  _load();
                }),
              ),
            ),
          ],
        ),
        const SizedBox(height: 10),
        _TCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'AJOUTER UN BARÈME',
                style: TextStyle(
                  fontSize: 9.5,
                  fontWeight: FontWeight.w800,
                  color: _fitilaMuted,
                  letterSpacing: .3,
                ),
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _lessonCtrl,
                      decoration: const InputDecoration(
                        isDense: true,
                        hintText: 'Leçon',
                      ),
                    ),
                  ),
                  const SizedBox(width: 6),
                  Expanded(
                    child: TextField(
                      controller: _sectionCtrl,
                      decoration: const InputDecoration(
                        isDense: true,
                        hintText: 'Section',
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 6),
              Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _qCtrl,
                      keyboardType: TextInputType.number,
                      decoration: const InputDecoration(
                        isDense: true,
                        hintText: 'Q#',
                      ),
                    ),
                  ),
                  const SizedBox(width: 6),
                  Expanded(
                    child: TextField(
                      controller: _weightCtrl,
                      keyboardType: const TextInputType.numberWithOptions(
                        decimal: true,
                      ),
                      decoration: const InputDecoration(
                        isDense: true,
                        hintText: 'Poids',
                      ),
                    ),
                  ),
                  const SizedBox(width: 6),
                  ElevatedButton(
                    onPressed: _saving ? null : _quickAdd,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: _fitilaPrimary,
                      foregroundColor: const Color(0xFF2B2110),
                    ),
                    child: _saving
                        ? const SizedBox(
                            width: 14,
                            height: 14,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const Icon(Icons.add_rounded, size: 18),
                  ),
                ],
              ),
            ],
          ),
        ),
        const SizedBox(height: 10),
        Expanded(
          child: FutureBuilder<List<Map<String, dynamic>>>(
            future: _future,
            builder: (context, snap) {
              if (snap.connectionState != ConnectionState.done) {
                return const Center(
                  child: CircularProgressIndicator(color: _fitilaPrimary),
                );
              }
              if (snap.hasError) {
                return _TeacherErrorState(
                  message: '${snap.error}',
                  onRetry: _reload,
                );
              }
              final rows = snap.data ?? const [];
              if (rows.isEmpty) {
                return const Center(
                  child: Text(
                    'Aucun barème pour ce filtre. Poids = 1 pour toutes les questions.',
                    textAlign: TextAlign.center,
                    style: TextStyle(color: _fitilaMuted, fontSize: 11.5),
                  ),
                );
              }
              return SingleChildScrollView(
                child: DataTable(
                  headingRowHeight: 34,
                  dataRowMinHeight: 36,
                  dataRowMaxHeight: 40,
                  columnSpacing: 16,
                  columns: const [
                    DataColumn(
                      label: Text(
                        'Leçon',
                        style: TextStyle(
                          fontSize: 10.5,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                    ),
                    DataColumn(
                      label: Text(
                        'Sect.',
                        style: TextStyle(
                          fontSize: 10.5,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                    ),
                    DataColumn(
                      label: Text(
                        'Q#',
                        style: TextStyle(
                          fontSize: 10.5,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                    ),
                    DataColumn(
                      label: Text(
                        'Poids',
                        style: TextStyle(
                          fontSize: 10.5,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                    ),
                  ],
                  rows: [
                    for (final r in rows)
                      DataRow(
                        cells: [
                          DataCell(
                            Text(
                              '${r['lesson_id']}',
                              style: const TextStyle(fontSize: 11),
                            ),
                          ),
                          DataCell(
                            Text(
                              '${r['section_key'] ?? '—'}',
                              style: const TextStyle(fontSize: 11),
                            ),
                          ),
                          DataCell(
                            Text(
                              '${(r['question_idx'] as int? ?? 0) + 1}',
                              style: const TextStyle(fontSize: 11),
                            ),
                          ),
                          DataCell(
                            Text(
                              '${r['weight']}',
                              style: const TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                          ),
                        ],
                      ),
                  ],
                ),
              );
            },
          ),
        ),
      ],
    );
  }
}

class _TeacherGradeOverviewTab extends StatefulWidget {
  const _TeacherGradeOverviewTab();

  @override
  State<_TeacherGradeOverviewTab> createState() =>
      _TeacherGradeOverviewTabState();
}

class _TeacherGradeOverviewTabState extends State<_TeacherGradeOverviewTab> {
  late Future<Map<String, dynamic>> _future;

  @override
  void initState() {
    super.initState();
    _future = FitilaBackend.fetchGradeOverview();
  }

  Future<void> _reload() async {
    setState(() => _future = FitilaBackend.fetchGradeOverview());
    await _future;
  }

  Color _cellColor(double? g) {
    if (g == null) {
      return _fitilaSurfaceAlt;
    }
    if (g >= 14) {
      return _fitilaSage.withValues(alpha: 0.18);
    }
    if (g >= 10) {
      return _fitilaPrimarySoft;
    }
    return _fitilaClay.withValues(alpha: 0.16);
  }

  Future<void> _copyCsv(
    List<Map<String, dynamic>> reports,
    List<String> columns,
  ) async {
    final buffer = StringBuffer('Apprenant,Moyenne /20,Appréciation\n');
    for (final r in reports) {
      final avg = r['global_average'] as double?;
      buffer.writeln(
        '"${r['name']}",${avg?.toStringAsFixed(2) ?? ''},${FitilaBackend.appreciationFor(avg)}',
      );
    }
    await Clipboard.setData(ClipboardData(text: buffer.toString()));
    if (!mounted) {
      return;
    }
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text(
          '📋 Relevé copié (format CSV) — collez-le dans un tableur.',
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<Map<String, dynamic>>(
      future: _future,
      builder: (context, snap) {
        if (snap.connectionState != ConnectionState.done) {
          return const Center(
            child: CircularProgressIndicator(color: _fitilaPrimary),
          );
        }
        if (snap.hasError) {
          return _TeacherErrorState(message: '${snap.error}', onRetry: _reload);
        }
        final data = snap.data ?? const {};
        final reports = List<Map<String, dynamic>>.from(
          data['reports'] as List? ?? const [],
        );
        final columns = List<String>.from(
          data['moduleColumns'] as List? ?? const [],
        );
        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    '${reports.length} apprenant(s) — moyennes pondérées',
                    style: const TextStyle(fontSize: 11.5, color: _fitilaMuted),
                  ),
                ),
                OutlinedButton.icon(
                  onPressed: () => _copyCsv(reports, columns),
                  icon: const Icon(Icons.ios_share_rounded, size: 15),
                  label: const Text('CSV', style: TextStyle(fontSize: 11)),
                ),
              ],
            ),
            const SizedBox(height: 10),
            Expanded(
              child: reports.isEmpty
                  ? const Center(
                      child: Text(
                        'Aucune note enregistrée pour le moment.',
                        style: TextStyle(color: _fitilaMuted),
                      ),
                    )
                  : RefreshIndicator(
                      onRefresh: _reload,
                      color: _fitilaPrimary,
                      child: SingleChildScrollView(
                        child: SingleChildScrollView(
                          scrollDirection: Axis.horizontal,
                          child: DataTable(
                            headingRowHeight: 34,
                            dataRowMinHeight: 38,
                            dataRowMaxHeight: 44,
                            columnSpacing: 14,
                            columns: [
                              const DataColumn(
                                label: Text(
                                  'Apprenant',
                                  style: TextStyle(
                                    fontSize: 10.5,
                                    fontWeight: FontWeight.w800,
                                  ),
                                ),
                              ),
                              const DataColumn(
                                label: Text(
                                  'Moy.',
                                  style: TextStyle(
                                    fontSize: 10.5,
                                    fontWeight: FontWeight.w800,
                                  ),
                                ),
                              ),
                              for (final c in columns)
                                DataColumn(
                                  label: Text(
                                    c.replaceAll('::', ' '),
                                    style: const TextStyle(
                                      fontSize: 10,
                                      fontWeight: FontWeight.w800,
                                    ),
                                  ),
                                ),
                              const DataColumn(
                                label: Text(
                                  'Appréciation',
                                  style: TextStyle(
                                    fontSize: 10.5,
                                    fontWeight: FontWeight.w800,
                                  ),
                                ),
                              ),
                            ],
                            rows: [
                              for (final r in reports)
                                DataRow(
                                  cells: [
                                    DataCell(
                                      Text(
                                        '${r['name']}',
                                        style: const TextStyle(
                                          fontSize: 11.5,
                                          fontWeight: FontWeight.w700,
                                        ),
                                      ),
                                    ),
                                    DataCell(
                                      Container(
                                        padding: const EdgeInsets.symmetric(
                                          horizontal: 8,
                                          vertical: 4,
                                        ),
                                        color: _cellColor(
                                          r['global_average'] as double?,
                                        ),
                                        child: Text(
                                          (r['global_average'] as double?)
                                                  ?.toStringAsFixed(1) ??
                                              '—',
                                          style: const TextStyle(
                                            fontSize: 11,
                                            fontWeight: FontWeight.w800,
                                          ),
                                        ),
                                      ),
                                    ),
                                    for (final c in columns)
                                      DataCell(
                                        Container(
                                          padding: const EdgeInsets.symmetric(
                                            horizontal: 8,
                                            vertical: 4,
                                          ),
                                          color: _cellColor(
                                            (r['modules'] as Map?)?[c]
                                                as double?,
                                          ),
                                          child: Text(
                                            ((r['modules'] as Map?)?[c]
                                                        as double?)
                                                    ?.toStringAsFixed(1) ??
                                                '—',
                                            style: const TextStyle(
                                              fontSize: 10.5,
                                            ),
                                          ),
                                        ),
                                      ),
                                    DataCell(
                                      Text(
                                        FitilaBackend.appreciationFor(
                                          r['global_average'] as double?,
                                        ),
                                        style: const TextStyle(
                                          fontSize: 10.5,
                                          fontWeight: FontWeight.w700,
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                            ],
                          ),
                        ),
                      ),
                    ),
            ),
          ],
        );
      },
    );
  }
}

class _TeacherStatsTab extends StatefulWidget {
  const _TeacherStatsTab();

  @override
  State<_TeacherStatsTab> createState() => _TeacherStatsTabState();
}

class _TeacherStatsTabState extends State<_TeacherStatsTab> {
  late Future<Map<String, dynamic>> _future;

  @override
  void initState() {
    super.initState();
    _future = FitilaBackend.fetchClassStats();
  }

  Future<void> _reload() async {
    setState(() => _future = FitilaBackend.fetchClassStats());
    await _future;
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<Map<String, dynamic>>(
      future: _future,
      builder: (context, snap) {
        if (snap.connectionState != ConnectionState.done) {
          return const Center(
            child: CircularProgressIndicator(color: _fitilaPrimary),
          );
        }
        if (snap.hasError) {
          return _TeacherErrorState(message: '${snap.error}', onRetry: _reload);
        }
        final data = snap.data ?? const {};
        final levels = Map<String, int>.from(
          data['levelDistribution'] as Map? ?? const {},
        );
        final modules = Map<String, int>.from(
          data['moduleActivity'] as Map? ?? const {},
        );
        final grades = Map<String, int>.from(
          data['gradeDistribution'] as Map? ?? const {},
        );
        final totalLevels = levels.values.fold<int>(0, (a, b) => a + b);
        return RefreshIndicator(
          onRefresh: _reload,
          color: _fitilaPrimary,
          child: ListView(
            children: [
              _TCard(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Apprenants par niveau',
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w800,
                        color: _fitilaInk,
                      ),
                    ),
                    const SizedBox(height: 10),
                    if (totalLevels == 0)
                      const Text(
                        'Pas encore de données.',
                        style: TextStyle(color: _fitilaMuted, fontSize: 11.5),
                      )
                    else
                      for (final e in levels.entries)
                        Padding(
                          padding: const EdgeInsets.symmetric(vertical: 4),
                          child: Row(
                            children: [
                              SizedBox(
                                width: 28,
                                child: Text(
                                  e.key,
                                  style: const TextStyle(
                                    fontSize: 11.5,
                                    fontWeight: FontWeight.w800,
                                  ),
                                ),
                              ),
                              Expanded(
                                child: ClipRRect(
                                  borderRadius: BorderRadius.circular(6),
                                  child: LinearProgressIndicator(
                                    value: e.value / totalLevels,
                                    minHeight: 10,
                                    backgroundColor: _fitilaSurfaceAlt,
                                    color: e.key == 'N1'
                                        ? _fitilaPrimary
                                        : _fitilaSage,
                                  ),
                                ),
                              ),
                              const SizedBox(width: 8),
                              Text(
                                '${e.value}',
                                style: const TextStyle(
                                  fontSize: 11,
                                  color: _fitilaMuted,
                                ),
                              ),
                            ],
                          ),
                        ),
                  ],
                ),
              ),
              const SizedBox(height: 12),
              _TCard(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Activité par module',
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w800,
                        color: _fitilaInk,
                      ),
                    ),
                    const SizedBox(height: 10),
                    if (modules.isEmpty)
                      const Text(
                        'Pas encore de données.',
                        style: TextStyle(color: _fitilaMuted, fontSize: 11.5),
                      )
                    else
                      for (final e
                          in (modules.entries.toList()
                            ..sort((a, b) => b.value.compareTo(a.value))))
                        Padding(
                          padding: const EdgeInsets.symmetric(vertical: 4),
                          child: Row(
                            children: [
                              SizedBox(
                                width: 64,
                                child: Text(
                                  e.key,
                                  style: const TextStyle(fontSize: 11),
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                              Expanded(
                                child: ClipRRect(
                                  borderRadius: BorderRadius.circular(6),
                                  child: LinearProgressIndicator(
                                    value:
                                        e.value /
                                        (modules.values.reduce(
                                          (a, b) => a > b ? a : b,
                                        )),
                                    minHeight: 10,
                                    backgroundColor: _fitilaSurfaceAlt,
                                    color: _fitilaClay,
                                  ),
                                ),
                              ),
                              const SizedBox(width: 8),
                              Text(
                                '${e.value}',
                                style: const TextStyle(
                                  fontSize: 11,
                                  color: _fitilaMuted,
                                ),
                              ),
                            ],
                          ),
                        ),
                  ],
                ),
              ),
              const SizedBox(height: 12),
              _TCard(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Distribution des notes /20',
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w800,
                        color: _fitilaInk,
                      ),
                    ),
                    const SizedBox(height: 10),
                    Builder(
                      builder: (context) {
                        final maxV = grades.values.isEmpty
                            ? 1
                            : grades.values.reduce((a, b) => a > b ? a : b);
                        return Row(
                          crossAxisAlignment: CrossAxisAlignment.end,
                          children: [
                            for (final e in grades.entries)
                              Expanded(
                                child: Padding(
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 4,
                                  ),
                                  child: Column(
                                    children: [
                                      Text(
                                        '${e.value}',
                                        style: const TextStyle(
                                          fontSize: 10,
                                          fontWeight: FontWeight.w800,
                                        ),
                                      ),
                                      const SizedBox(height: 4),
                                      Container(
                                        height:
                                            12 +
                                            (maxV == 0
                                                ? 0
                                                : (e.value / maxV) * 80),
                                        decoration: BoxDecoration(
                                          color:
                                              e.key == '16-20' ||
                                                  e.key == '13-15'
                                              ? _fitilaSage
                                              : (e.key == '10-12'
                                                    ? _fitilaPrimary
                                                    : _fitilaClay),
                                          borderRadius:
                                              const BorderRadius.vertical(
                                                top: Radius.circular(6),
                                              ),
                                        ),
                                      ),
                                      const SizedBox(height: 4),
                                      Text(
                                        e.key,
                                        style: const TextStyle(
                                          fontSize: 9,
                                          color: _fitilaMuted,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                          ],
                        );
                      },
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 20),
            ],
          ),
        );
      },
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
  bool _uploadingAvatar = false;
  bool _recordingBio = false;
  bool _uploadingBio = false;
  bool _bioPlaying = false;
  final _mediaController = FitilaMediaController();
  audio.AudioPlayer? _bioPlayer;
  Map<String, dynamic> _privacy = const {};
  bool _loadingPrivacy = true;

  String get _displayName =>
      _profile?['display_name']?.toString().trim().isNotEmpty == true
      ? _profile!['display_name'].toString().trim()
      : widget.session.displayName;

  @override
  void initState() {
    super.initState();
    if (widget.session.accessToken.isNotEmpty) {
      _loadProfile();
      _loadPrivacy();
    }
  }

  @override
  void dispose() {
    _mediaController.dispose();
    _bioPlayer?.dispose();
    super.dispose();
  }

  Future<void> _loadPrivacy() async {
    try {
      final privacy = await FitilaBackend.fetchPrivacy();
      if (mounted) {
        setState(() {
          _privacy = privacy;
          _loadingPrivacy = false;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() => _loadingPrivacy = false);
      }
    }
  }

  Future<void> _setPrivacy(String key, String value) async {
    setState(() => _privacy = {..._privacy, key: value});
    try {
      await FitilaBackend.updatePrivacy({key: value});
    } catch (e) {
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('Erreur : $e')));
    }
  }

  Future<void> _pickAndUploadAvatar() async {
    final picker = ImagePicker();
    final file = await picker.pickImage(
      source: ImageSource.gallery,
      imageQuality: 85,
      maxWidth: 1080,
    );
    if (file == null) {
      return;
    }
    setState(() => _uploadingAvatar = true);
    try {
      final bytes = await file.readAsBytes();
      final ext = file.name.contains('.')
          ? file.name.split('.').last.toLowerCase()
          : 'jpg';
      final contentType = ext == 'png' ? 'image/png' : 'image/jpeg';
      await FitilaBackend.uploadAvatar(
        bytes: bytes,
        extension: ext,
        contentType: contentType,
      );
      await _loadProfile();
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('✓ Photo de profil mise à jour'),
          backgroundColor: _fitilaSage,
        ),
      );
    } catch (e) {
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('Erreur : $e')));
    } finally {
      if (mounted) {
        setState(() => _uploadingAvatar = false);
      }
    }
  }

  Future<void> _toggleBioRecording() async {
    if (_recordingBio) {
      final asset = await _mediaController.stopAudio();
      setState(() => _recordingBio = false);
      if (asset == null) {
        return;
      }
      setState(() => _uploadingBio = true);
      try {
        final bytes = await asset.readBytes();
        await FitilaBackend.uploadBioAudio(
          bytes: bytes,
          contentType: asset.contentType,
          durationSeconds: 0,
        );
        await _loadProfile();
        if (!mounted) {
          return;
        }
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('✓ Bio audio enregistrée'),
            backgroundColor: _fitilaSage,
          ),
        );
      } catch (e) {
        if (!mounted) {
          return;
        }
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Erreur : $e')));
      } finally {
        if (mounted) {
          setState(() => _uploadingBio = false);
        }
      }
    } else {
      try {
        await _mediaController.startAudio();
        setState(() => _recordingBio = true);
      } catch (e) {
        if (!mounted) {
          return;
        }
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Micro indisponible : $e')));
      }
    }
  }

  Future<void> _playBioAudio(String url) async {
    _bioPlayer ??= audio.AudioPlayer();
    setState(() => _bioPlaying = true);
    try {
      await _bioPlayer!.play(audio.UrlSource(url));
      _bioPlayer!.onPlayerComplete.first.then((_) {
        if (mounted) {
          setState(() => _bioPlaying = false);
        }
      });
    } catch (_) {
      if (mounted) {
        setState(() => _bioPlaying = false);
      }
    }
  }

  Future<void> _changePassword() async {
    final pass1 = TextEditingController();
    final pass2 = TextEditingController();
    final result = await showDialog<String>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Changer le mot de passe'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: pass1,
              obscureText: true,
              decoration: const InputDecoration(
                labelText: 'Nouveau mot de passe',
              ),
            ),
            const SizedBox(height: 10),
            TextField(
              controller: pass2,
              obscureText: true,
              decoration: const InputDecoration(labelText: 'Confirmer'),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Annuler'),
          ),
          FilledButton(
            onPressed: () {
              if (pass1.text.length < 6) {
                return;
              }
              if (pass1.text != pass2.text) {
                return;
              }
              Navigator.pop(ctx, pass1.text);
            },
            child: const Text('Enregistrer'),
          ),
        ],
      ),
    );
    pass1.dispose();
    pass2.dispose();
    if (result == null) {
      return;
    }
    try {
      await FitilaBackend.updatePassword(result);
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('✓ Mot de passe mis à jour'),
          backgroundColor: _fitilaSage,
        ),
      );
    } catch (e) {
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('Erreur : $e')));
    }
  }

  Future<void> _loadProfile() async {
    setState(() => _loading = true);
    try {
      final profile = await FitilaBackend.fetchProfile(widget.session.userId);
      if (mounted) {
        setState(() => _profile = profile);
      }
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
      if (mounted) {
        setState(() => _loading = false);
      }
    }
  }

  Future<void> _editProfile() async {
    final name = TextEditingController(text: _displayName);
    final location = TextEditingController(
      text: _profile?['location']?.toString() ?? '',
    );
    final phone = TextEditingController(
      text: _profile?['phone_number']?.toString() ?? '',
    );
    final bio = TextEditingController(text: _profile?['bio']?.toString() ?? '');
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
              const SizedBox(height: 12),
              TextField(
                controller: phone,
                decoration: const InputDecoration(labelText: 'Téléphone'),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: bio,
                maxLines: 3,
                decoration: const InputDecoration(labelText: 'Bio'),
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
              if (value.isEmpty) {
                return;
              }
              Navigator.pop(context, {
                'display_name': value,
                'location': location.text.trim().isEmpty
                    ? null
                    : location.text.trim(),
                'phone_number': phone.text.trim().isEmpty
                    ? null
                    : phone.text.trim(),
                'bio': bio.text.trim().isEmpty ? null : bio.text.trim(),
              });
            },
            child: const Text('Enregistrer'),
          ),
        ],
      ),
    );
    name.dispose();
    location.dispose();
    phone.dispose();
    bio.dispose();
    if (result == null || !mounted) {
      return;
    }
    try {
      await FitilaBackend.updateProfile(widget.session.userId, result);
      await _loadProfile();
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Profil mis à jour.')));
    } catch (_) {
      if (!mounted) {
        return;
      }
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
      'Sécurité' => Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Card(
            child: ListTile(
              leading: const Icon(Icons.lock_rounded),
              title: const Text('Changer le mot de passe'),
              subtitle: const Text(
                'Met à jour votre mot de passe de connexion.',
              ),
              trailing: const Icon(Icons.chevron_right_rounded),
              onTap: widget.session.accessToken.isEmpty
                  ? null
                  : _changePassword,
            ),
          ),
          Card(
            child: ListTile(
              leading: const Icon(Icons.manage_accounts_rounded),
              title: const Text('Modifier profil'),
              subtitle: const Text(
                'Photo, nom, téléphone, localisation et bio.',
              ),
              trailing: const Icon(Icons.chevron_right_rounded),
              onTap: widget.session.accessToken.isEmpty ? null : _editProfile,
            ),
          ),
        ],
      ),
      'Identité' => Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Card(
            child: Padding(
              padding: const EdgeInsets.all(14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Bio audio',
                    style: TextStyle(fontWeight: FontWeight.w800, fontSize: 13),
                  ),
                  const SizedBox(height: 4),
                  const Text(
                    "Présente-toi en Bariba ou en français — visible sur ton profil public.",
                    style: TextStyle(fontSize: 11, color: _fitilaMuted),
                  ),
                  const SizedBox(height: 10),
                  Row(
                    children: [
                      if ((_profile?['bio_audio_url'] as String?)?.isNotEmpty ==
                          true)
                        IconButton.filled(
                          onPressed: _bioPlaying
                              ? null
                              : () => _playBioAudio(
                                  _profile!['bio_audio_url'] as String,
                                ),
                          icon: Icon(
                            _bioPlaying
                                ? Icons.graphic_eq_rounded
                                : Icons.play_arrow_rounded,
                          ),
                        ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: OutlinedButton.icon(
                          onPressed: _uploadingBio ? null : _toggleBioRecording,
                          icon: _uploadingBio
                              ? const SizedBox(
                                  width: 14,
                                  height: 14,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2,
                                  ),
                                )
                              : Icon(
                                  _recordingBio
                                      ? Icons.stop_circle_rounded
                                      : Icons.mic_rounded,
                                  color: _recordingBio ? Colors.red : null,
                                ),
                          label: Text(
                            _recordingBio
                                ? 'Arrêter l\'enregistrement'
                                : 'Enregistrer ma bio audio',
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
          Card(
            child: ListTile(
              leading: const Icon(Icons.badge_rounded),
              title: const Text('Informations profil'),
              subtitle: Text(
                'Localisation : ${_profile?['location'] ?? '—'}\nTéléphone : ${_profile?['phone_number'] ?? widget.session.phone}',
              ),
              isThreeLine: true,
              trailing: const Icon(Icons.edit_rounded),
              onTap: widget.session.accessToken.isEmpty ? null : _editProfile,
            ),
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
      'Confidentialité' => Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (_loadingPrivacy) const LinearProgressIndicator(),
          const SizedBox(height: 8),
          const Text(
            'Visibilité du profil',
            style: TextStyle(fontWeight: FontWeight.w800, fontSize: 12.5),
          ),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            children: [
              for (final option in const [
                ('public', 'Public'),
                ('community', 'Communauté'),
                ('private', 'Privé'),
              ])
                ChoiceChip(
                  selected:
                      (_privacy['profile_visibility'] as String? ?? 'public') ==
                      option.$1,
                  label: Text(option.$2),
                  onSelected: (_) =>
                      _setPrivacy('profile_visibility', option.$1),
                ),
            ],
          ),
          const SizedBox(height: 16),
          const Text(
            'Historique de traduction',
            style: TextStyle(fontWeight: FontWeight.w800, fontSize: 12.5),
          ),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            children: [
              for (final option in const [
                ('private', 'Privé (par défaut)'),
                ('shared_teacher', 'Visible enseignant'),
              ])
                ChoiceChip(
                  selected:
                      (_privacy['translation_history_visibility'] as String? ??
                          'private') ==
                      option.$1,
                  label: Text(option.$2),
                  onSelected: (_) =>
                      _setPrivacy('translation_history_visibility', option.$1),
                ),
            ],
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
                  Stack(
                    children: [
                      Container(
                        width: 84,
                        height: 84,
                        alignment: Alignment.center,
                        decoration: BoxDecoration(
                          color: _fitilaSurfaceAlt,
                          shape: BoxShape.circle,
                          border: Border.all(color: _fitilaPrimary, width: 2),
                          image:
                              (_profile?['avatar_url'] as String?)
                                      ?.isNotEmpty ==
                                  true
                              ? DecorationImage(
                                  image: NetworkImage(
                                    _profile!['avatar_url'] as String,
                                  ),
                                  fit: BoxFit.cover,
                                )
                              : null,
                        ),
                        child:
                            (_profile?['avatar_url'] as String?)?.isNotEmpty ==
                                true
                            ? null
                            : Text(
                                _displayName.characters.first,
                                style: const TextStyle(
                                  color: _fitilaGoldDeep,
                                  fontFamily: 'serif',
                                  fontSize: 30,
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                      ),
                      if (widget.session.accessToken.isNotEmpty)
                        Positioned(
                          bottom: 0,
                          right: 0,
                          child: GestureDetector(
                            onTap: _uploadingAvatar
                                ? null
                                : _pickAndUploadAvatar,
                            child: Container(
                              width: 26,
                              height: 26,
                              alignment: Alignment.center,
                              decoration: const BoxDecoration(
                                color: _fitilaGoldDeep,
                                shape: BoxShape.circle,
                              ),
                              child: _uploadingAvatar
                                  ? const SizedBox(
                                      width: 12,
                                      height: 12,
                                      child: CircularProgressIndicator(
                                        strokeWidth: 2,
                                        color: Colors.white,
                                      ),
                                    )
                                  : const Icon(
                                      Icons.camera_alt_rounded,
                                      size: 13,
                                      color: Colors.white,
                                    ),
                            ),
                          ),
                        ),
                    ],
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
                    style: const TextStyle(color: _fitilaMuted, fontSize: 12),
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
            style: const TextStyle(color: _fitilaMuted, fontSize: 10),
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
  bool _pinLock = false;
  bool _loadingPrefs = true;
  bool _exporting = false;

  @override
  void initState() {
    super.initState();
    _loadPreferences();
  }

  Future<void> _loadPreferences() async {
    try {
      final prefs = await FitilaBackend.fetchPreferences();
      if (!mounted) {
        return;
      }
      setState(() {
        _baribaFirst = prefs['bariba_first'] as bool? ?? false;
        _offline = prefs['offline_cache'] as bool? ?? true;
        _audio = prefs['auto_audio'] as bool? ?? true;
        _push = prefs['notifications'] as bool? ?? true;
        _largeTouch = prefs['large_touch'] as bool? ?? false;
        _visualSecurity = prefs['visual_security'] as bool? ?? true;
        _analytics = prefs['share_diagnostics'] as bool? ?? false;
        _pinLock = prefs['pin_lock'] as bool? ?? false;
        _loadingPrefs = false;
      });
    } catch (_) {
      if (mounted) {
        setState(() => _loadingPrefs = false);
      }
    }
  }

  Future<void> _setPref(
    String key,
    bool value,
    void Function(bool) apply,
  ) async {
    setState(() => apply(value));
    try {
      await FitilaBackend.updatePreferences({key: value});
    } catch (e) {
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Non enregistré (hors-ligne ?) : $e')),
      );
    }
  }

  Future<void> _exportData() async {
    setState(() => _exporting = true);
    try {
      final data = await FitilaBackend.exportMyData();
      final dir = await getApplicationDocumentsDirectory();
      final fileName =
          'fitila_export_${DateTime.now().millisecondsSinceEpoch}.json';
      final file = File('${dir.path}${Platform.pathSeparator}$fileName');
      await file.writeAsString(
        const JsonEncoder.withIndent('  ').convert(data),
      );
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('✓ Données exportées : $fileName'),
          backgroundColor: _fitilaSage,
        ),
      );
    } catch (e) {
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('Erreur export : $e')));
    } finally {
      if (mounted) {
        setState(() => _exporting = false);
      }
    }
  }

  Future<void> _confirmDeleteAccount() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Supprimer mon compte ?'),
        content: const Text(
          'Une demande de suppression sera transmise à un administrateur. '
          'Cette action est irréversible une fois traitée.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Annuler'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text(
              'Demander la suppression',
              style: TextStyle(color: Colors.red),
            ),
          ),
        ],
      ),
    );
    if (confirmed != true) {
      return;
    }
    try {
      await FitilaBackend.requestAccountDeletion();
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text(
            'Demande envoyée. Un administrateur va traiter votre demande.',
          ),
        ),
      );
    } catch (e) {
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('Erreur : $e')));
    }
  }

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
      'Sécurité' => Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _SwitchTile(
            icon: Icons.lock_rounded,
            title: 'Verrouillage par code / biométrie',
            value: _pinLock,
            onChanged: (v) => _setPref('pin_lock', v, (val) => _pinLock = val),
          ),
          _SwitchTile(
            icon: Icons.visibility_rounded,
            title: 'Confirmation avant actions sensibles',
            value: _visualSecurity,
            onChanged: (v) =>
                _setPref('visual_security', v, (val) => _visualSecurity = val),
          ),
          const SizedBox(height: 12),
          const Text(
            'Données',
            style: TextStyle(
              fontSize: 12.5,
              fontWeight: FontWeight.w800,
              color: _fitilaMuted,
            ),
          ),
          const SizedBox(height: 8),
          Card(
            child: ListTile(
              leading: const Icon(Icons.download_rounded),
              title: const Text('Exporter mes données'),
              subtitle: const Text(
                'Profil, historique de traduction et progression d\'apprentissage (JSON).',
              ),
              trailing: _exporting
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Icon(Icons.chevron_right_rounded),
              onTap: _exporting ? null : _exportData,
            ),
          ),
          Card(
            child: ListTile(
              leading: const Icon(
                Icons.delete_forever_rounded,
                color: Colors.red,
              ),
              title: const Text(
                'Supprimer mon compte',
                style: TextStyle(color: Colors.red),
              ),
              subtitle: const Text(
                'Envoie une demande de suppression à un administrateur.',
              ),
              onTap: _confirmDeleteAccount,
            ),
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
          if (_loadingPrefs) const LinearProgressIndicator(),
          if (_loadingPrefs) const SizedBox(height: 8),
          _SwitchTile(
            icon: Icons.language_rounded,
            title: 'Afficher le Bariba en premier',
            value: _baribaFirst,
            onChanged: (value) =>
                _setPref('bariba_first', value, (v) => _baribaFirst = v),
          ),
          _SwitchTile(
            icon: Icons.offline_bolt_rounded,
            title: 'Activer le cache offline',
            value: _offline,
            onChanged: (value) =>
                _setPref('offline_cache', value, (v) => _offline = v),
          ),
          _SwitchTile(
            icon: Icons.volume_up_rounded,
            title: 'Lecture audio automatique',
            value: _audio,
            onChanged: (value) =>
                _setPref('auto_audio', value, (v) => _audio = v),
          ),
          _SwitchTile(
            icon: Icons.notifications_rounded,
            title: 'Notifications fil, classe et corrections',
            value: _push,
            onChanged: (value) =>
                _setPref('notifications', value, (v) => _push = v),
          ),
          _SwitchTile(
            icon: Icons.touch_app_rounded,
            title: 'Grands contrôles tactiles',
            value: _largeTouch,
            onChanged: (value) =>
                _setPref('large_touch', value, (v) => _largeTouch = v),
          ),
          _SwitchTile(
            icon: Icons.analytics_rounded,
            title: 'Partager diagnostics anonymes',
            value: _analytics,
            onChanged: (value) =>
                _setPref('share_diagnostics', value, (v) => _analytics = v),
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
    final parentScaffold = Scaffold.maybeOf(context);
    final page = Material(
      color: _fitilaSurface,
      child: SafeArea(
        child: LayoutBuilder(
          builder: (context, constraints) {
          final compact = constraints.maxWidth < 700;
          final scaffold = parentScaffold;
          final canOpenDrawer = scaffold?.hasDrawer ?? false;
          return Column(
            children: [
              Padding(
                padding: EdgeInsets.fromLTRB(
                  compact ? 18 : 22,
                  6,
                  compact ? 18 : 22,
                  14,
                ),
                child: Row(
                  children: [
                    _PremiumTopIcon(
                      icon: canOpenDrawer
                          ? Icons.menu_rounded
                          : Icons.arrow_back_rounded,
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
                  child: Align(
                    alignment: Alignment.centerRight,
                    child: action!,
                  ),
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
      ),
    );
    if (parentScaffold == null) {
      return Scaffold(
        backgroundColor: _fitilaSurface,
        body: page,
      );
    }
    return page;
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
    required this.onCreate,
  });

  final int selectedIndex;
  final ValueChanged<int> onSelected;
  final VoidCallback onCreate;

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
                icon: Icons.school_outlined,
                activeIcon: Icons.school_rounded,
                label: 'Apprendre',
                active: selectedIndex == 1,
                onTap: () => onSelected(1),
              ),
            ),
            Expanded(
              child: _PremiumBottomItem(
                icon: Icons.assignment_outlined,
                activeIcon: Icons.assignment_rounded,
                label: 'Classe',
                active: selectedIndex == 2,
                onTap: () => onSelected(2),
              ),
            ),
            Expanded(
              child: Transform.translate(
                offset: const Offset(0, -14),
                child: Semantics(
                  button: true,
                  label: 'Création',
                  child: InkWell(
                    customBorder: const CircleBorder(),
                    onTap: onCreate,
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
                        border: selectedIndex == -1
                            ? Border.all(color: _fitilaGoldDeep, width: 2)
                            : null,
                      ),
                      child: const Icon(
                        Icons.add_rounded,
                        color: Color(0xFF2B2110),
                        size: 26,
                      ),
                    ),
                  ),
                ),
              ),
            ),
            Expanded(
              child: _PremiumBottomItem(
                icon: Icons.menu_book_outlined,
                activeIcon: Icons.menu_book_rounded,
                label: 'Dico',
                active: selectedIndex == 3,
                onTap: () => onSelected(3),
              ),
            ),
            Expanded(
              child: _PremiumBottomItem(
                icon: Icons.translate_outlined,
                activeIcon: Icons.translate_rounded,
                label: 'Traduc.',
                active: selectedIndex == 4,
                onTap: () => onSelected(4),
              ),
            ),
            Expanded(
              child: _PremiumBottomItem(
                icon: Icons.auto_awesome_outlined,
                activeIcon: Icons.auto_awesome_rounded,
                label: 'Fitila IA',
                active: selectedIndex == 5,
                onTap: () => onSelected(5),
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
      if (mounted) {
        setState(() => _audioPlaying = false);
      }
    });
  }

  @override
  void dispose() {
    _videoController?.dispose();
    _audioPlayer.dispose();
    super.dispose();
  }

  Future<void> _toggleLike() async {
    if (_likeBusy) {
      return;
    }
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
      if (!mounted) {
        return;
      }
      setState(() {
        _liked = !next;
        widget.post.likes += next ? -1 : 1;
      });
    } finally {
      if (mounted) {
        setState(() => _likeBusy = false);
      }
    }
  }

  Future<void> _toggleAudio() async {
    final url = widget.post.mediaUrl;
    if (url == null || url.isEmpty) {
      return;
    }
    if (_audioPlaying) {
      await _audioPlayer.pause();
    } else {
      await _audioPlayer.play(audio.UrlSource(url));
    }
    if (mounted) {
      setState(() => _audioPlaying = !_audioPlaying);
    }
  }

  Widget _mediaPreview(FeedPost post) {
    final url = post.mediaUrl;
    if (url == null || url.isEmpty) {
      return const SizedBox.shrink();
    }
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
      if (controller == null) {
        return const SizedBox.shrink();
      }
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
      if (!mounted) {
        return;
      }
      setState(() {
        _kind = 'ia';
        _title.text = 'Publication Fitila IA';
        _text.text = generated;
        _tags.text = 'ia, bariba, communaute';
      });
    } catch (_) {
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('La génération IA a échoué.')),
      );
    } finally {
      if (mounted) {
        setState(() => _busy = false);
      }
    }
  }

  Future<void> _pickMedia(ImageSource source) async {
    try {
      final picked = _kind == 'photo'
          ? await _mediaController.pickImage(source)
          : await _mediaController.pickVideo(source);
      if (picked != null && mounted) {
        setState(() => _media = picked);
      }
    } catch (_) {
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Le média ne peut pas être ouvert.')),
      );
    }
  }

  Future<void> _toggleAudioRecording() async {
    try {
      if (_recording) {
        final recorded = await _mediaController.stopAudio();
        if (!mounted) {
          return;
        }
        setState(() {
          _recording = false;
          _media = recorded;
        });
      } else {
        await _mediaController.startAudio();
        if (mounted) {
          setState(() => _recording = true);
        }
      }
    } catch (error) {
      if (!mounted) {
        return;
      }
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
    if (title.isEmpty && body.isEmpty || _busy) {
      return;
    }
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
      if (!mounted || post == null) {
        return;
      }
      widget.onPostCreated(post);
      Navigator.pop(context);
    } catch (_) {
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text(
            'La publication a échoué. Aucun contenu n’a été envoyé.',
          ),
        ),
      );
    } finally {
      if (mounted) {
        setState(() => _busy = false);
      }
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
        border: Border.all(color: readOnly ? _fitilaPrimary : _fitilaBorder),
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
                  style: const TextStyle(color: _fitilaMuted, fontSize: 11),
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
        leading: Icon(page.icon, size: 19, color: _fitilaGoldDeep),
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

// ============================================================================
// Widgets partagés du design premium (maquette IA jointe) — orbe micro,
// ondes, anneaux de score, étapes de traitement, écran sombre.
//
// Règle de conception non négociable : `_FitilaProcessingChecklist.doneCount`
// et `_FitilaScoreRing.score` doivent toujours refléter un état RÉEL déjà
// obtenu (résultat d'un appel réseau terminé, score calculé côté serveur) —
// jamais une minuterie ou une animation déconnectée du travail effectif.
// Les animations ci-dessous (pulsations, ondes, tracé de l'anneau) sont
// purement décoratives, exactement comme dans la maquette de référence
// (ses propres barres d'onde utilisent une boucle CSS `waveBounce`, sans
// lien avec une amplitude audio réelle) — reproduire ce comportement n'est
// donc pas une simplification malhonnête, mais une fidélité exacte.
// ============================================================================

/// Fond dégradé sombre utilisé pour les écrans "IA" (micro, traitement,
/// score...) — même dégradé que la maquette (`--dark1/2/3`).
class _FitilaDarkStage extends StatelessWidget {
  const _FitilaDarkStage({required this.child, this.padding});

  final Widget child;
  final EdgeInsetsGeometry? padding;

  @override
  Widget build(BuildContext context) {
    return Material(
      type: MaterialType.transparency,
      child: Container(
        width: double.infinity,
        padding: padding ?? const EdgeInsets.fromLTRB(20, 28, 20, 24),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(24),
          gradient: const LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [_fitilaDark1, _fitilaDark2, _fitilaDark3],
            stops: [0.0, 0.55, 1.0],
          ),
        ),
        child: child,
      ),
    );
  }
}

/// Orbe micro pulsant (3 anneaux d'expansion en boucle) — écran d'accueil
/// vocal d'Echo Sɔ̃ɔ et de Live Griot IA. `active` accélère et intensifie
/// la pulsation (ex: pendant un enregistrement réel en cours).
class _FitilaOrbMic extends StatefulWidget {
  const _FitilaOrbMic({
    required this.icon,
    this.active = false,
    this.size = 132,
    this.onTap,
  });

  final IconData icon;
  final bool active;
  final double size;
  final VoidCallback? onTap;

  @override
  State<_FitilaOrbMic> createState() => _FitilaOrbMicState();
}

class _FitilaOrbMicState extends State<_FitilaOrbMic>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: Duration(milliseconds: widget.active ? 1400 : 2200),
    )..repeat();
  }

  @override
  void didUpdateWidget(covariant _FitilaOrbMic oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.active != widget.active) {
      _controller.duration = Duration(
        milliseconds: widget.active ? 1400 : 2200,
      );
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Widget _ring(double delay) {
    return AnimatedBuilder(
      animation: _controller,
      builder: (context, _) {
        final t = (_controller.value + delay) % 1.0;
        final scale = 1.0 + t * 0.9;
        final opacity =
            (1.0 - t).clamp(0.0, 1.0) * (widget.active ? 0.55 : 0.35);
        return Opacity(
          opacity: opacity,
          child: Transform.scale(
            scale: scale,
            child: Container(
              width: widget.size,
              height: widget.size,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                border: Border.all(color: _fitilaPrimary, width: 1.4),
              ),
            ),
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: widget.onTap,
      child: SizedBox(
        width: widget.size * 2.1,
        height: widget.size * 2.1,
        child: Stack(
          alignment: Alignment.center,
          children: [
            _ring(0.0),
            _ring(0.33),
            _ring(0.66),
            Container(
              width: widget.size,
              height: widget.size,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: RadialGradient(
                  colors: [_fitilaPrimary, _fitilaGoldDeep],
                ),
                boxShadow: [
                  BoxShadow(
                    color: _fitilaPrimary.withValues(
                      alpha: widget.active ? 0.55 : 0.35,
                    ),
                    blurRadius: 28,
                    spreadRadius: widget.active ? 6 : 2,
                  ),
                ],
              ),
              child: Icon(
                widget.icon,
                color: Colors.white,
                size: widget.size * 0.42,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Barres d'onde décoratives (comme la maquette : animation en boucle,
/// pas une véritable analyse d'amplitude audio). `active=false` fige les
/// barres à une hauteur basse et régulière (silence / en pause).
class _FitilaWaveformBars extends StatefulWidget {
  const _FitilaWaveformBars({
    this.active = true,
    this.barCount = 20,
    this.height = 46,
    this.color,
  });

  final bool active;
  final int barCount;
  final double height;
  final Color? color;

  @override
  State<_FitilaWaveformBars> createState() => _FitilaWaveformBarsState();
}

class _FitilaWaveformBarsState extends State<_FitilaWaveformBars>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;
  late final List<double> _phases;
  late final List<double> _speeds;

  @override
  void initState() {
    super.initState();
    final rnd = math.Random(7);
    _phases = List.generate(
      widget.barCount,
      (_) => rnd.nextDouble() * math.pi * 2,
    );
    _speeds = List.generate(
      widget.barCount,
      (_) => 0.7 + rnd.nextDouble() * 0.9,
    );
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 60),
    )..repeat();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final barColor = widget.color ?? _fitilaPrimary;
    return SizedBox(
      height: widget.height,
      child: AnimatedBuilder(
        animation: _controller,
        builder: (context, _) {
          final t = _controller.value * math.pi * 2 * 60;
          return Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: List.generate(widget.barCount, (i) {
              double level;
              if (widget.active) {
                level =
                    0.28 +
                    0.72 * (0.5 + 0.5 * math.sin(t * _speeds[i] + _phases[i]));
              } else {
                level = 0.16;
              }
              return Container(
                width: 3.4,
                height: widget.height * level,
                margin: const EdgeInsets.symmetric(horizontal: 2),
                decoration: BoxDecoration(
                  color: barColor.withValues(
                    alpha: widget.active ? 0.95 : 0.45,
                  ),
                  borderRadius: BorderRadius.circular(3),
                ),
              );
            }),
          );
        },
      ),
    );
  }
}

/// Petit indicateur "étape X / N" affiché en haut d'un parcours en
/// plusieurs écrans (assistant Echo Sɔ̃ɔ, Aburu Fim IA...).
class _FitilaStepProgress extends StatelessWidget {
  const _FitilaStepProgress({
    required this.totalSteps,
    required this.currentStep,
    this.light = false,
  });

  final int totalSteps;
  final int currentStep;
  final bool light;

  @override
  Widget build(BuildContext context) {
    final inactive = light
        ? Colors.white.withValues(alpha: 0.25)
        : _fitilaBorder;
    final active = light ? Colors.white : _fitilaPrimary;
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: List.generate(totalSteps, (i) {
        final done = i <= currentStep;
        return Container(
          margin: const EdgeInsets.symmetric(horizontal: 3),
          width: i == currentStep ? 22 : 8,
          height: 6,
          decoration: BoxDecoration(
            color: done ? active : inactive,
            borderRadius: BorderRadius.circular(4),
          ),
        );
      }),
    );
  }
}

/// Liste d'étapes de traitement (ex: "Traduction en cours", "Publication
/// de la vidéo") avec coche animée pour les étapes réellement terminées.
///
/// IMPORTANT : `doneCount` doit venir d'un état applicatif réel (nombre
/// d'appels asynchrones effectivement terminés) — jamais d'une minuterie
/// indépendante du travail en cours. Une étape sans équivalent réel
/// aujourd'hui doit être passée dans `futureSteps`, affichée avec un
/// badge "Bientôt", jamais mêlée aux étapes réellement exécutées.
class _FitilaProcessingChecklist extends StatelessWidget {
  const _FitilaProcessingChecklist({
    required this.steps,
    required this.doneCount,
    this.futureSteps = const [],
    this.light = false,
  });

  final List<String> steps;
  final int doneCount;
  final List<String> futureSteps;
  final bool light;

  @override
  Widget build(BuildContext context) {
    final textColor = light ? Colors.white : _fitilaInk;
    final mutedColor = light
        ? Colors.white.withValues(alpha: 0.45)
        : _fitilaMuted;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        for (var i = 0; i < steps.length; i++)
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 6),
            child: Row(
              children: [
                if (i < doneCount)
                  Container(
                    width: 20,
                    height: 20,
                    decoration: const BoxDecoration(
                      shape: BoxShape.circle,
                      color: _fitilaSage,
                    ),
                    child: const Icon(
                      Icons.check_rounded,
                      size: 14,
                      color: Colors.white,
                    ),
                  )
                else if (i == doneCount)
                  SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(
                      strokeWidth: 2.2,
                      valueColor: AlwaysStoppedAnimation(
                        light ? Colors.white : _fitilaPrimary,
                      ),
                    ),
                  )
                else
                  Container(
                    width: 20,
                    height: 20,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      border: Border.all(color: mutedColor, width: 1.4),
                    ),
                  ),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    steps[i],
                    style: TextStyle(
                      fontSize: 13.5,
                      fontWeight: i <= doneCount
                          ? FontWeight.w700
                          : FontWeight.w500,
                      color: i <= doneCount ? textColor : mutedColor,
                    ),
                  ),
                ),
              ],
            ),
          ),
        for (final label in futureSteps)
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 6),
            child: Row(
              children: [
                Container(
                  width: 20,
                  height: 20,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    border: Border.all(color: mutedColor, width: 1.4),
                  ),
                  child: Icon(
                    Icons.schedule_rounded,
                    size: 12,
                    color: mutedColor,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    label,
                    style: TextStyle(
                      fontSize: 13,
                      color: mutedColor,
                      fontStyle: FontStyle.italic,
                    ),
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 8,
                    vertical: 3,
                  ),
                  decoration: BoxDecoration(
                    color: mutedColor.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Text(
                    'Bientôt',
                    style: TextStyle(
                      fontSize: 10,
                      color: mutedColor,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
              ],
            ),
          ),
      ],
    );
  }
}

/// Anneau de score animé (0-100), tracé progressivement jusqu'à `score`.
/// `score` doit être une valeur réellement calculée (ex: retour du
/// backend de Sagesse Battle), jamais un chiffre fixe de démonstration.
class _FitilaScoreRing extends StatelessWidget {
  const _FitilaScoreRing({
    required this.score,
    this.size = 148,
    this.label,
    this.light = true,
  });

  final int score;
  final double size;
  final String? label;
  final bool light;

  @override
  Widget build(BuildContext context) {
    final textColor = light ? Colors.white : _fitilaInk;
    final mutedColor = light
        ? Colors.white.withValues(alpha: 0.6)
        : _fitilaMuted;
    return TweenAnimationBuilder<double>(
      tween: Tween(begin: 0, end: score.clamp(0, 100).toDouble()),
      duration: const Duration(milliseconds: 1100),
      curve: Curves.easeOutCubic,
      builder: (context, value, _) {
        return SizedBox(
          width: size,
          height: size,
          child: Stack(
            alignment: Alignment.center,
            children: [
              CustomPaint(
                size: Size(size, size),
                painter: _ScoreRingPainter(progress: value / 100),
              ),
              Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    '${value.round()}%',
                    style: TextStyle(
                      fontSize: size * 0.22,
                      fontWeight: FontWeight.w800,
                      color: textColor,
                    ),
                  ),
                  if (label != null)
                    Text(
                      label!,
                      style: TextStyle(
                        fontSize: 11,
                        color: mutedColor,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                ],
              ),
            ],
          ),
        );
      },
    );
  }
}

class _ScoreRingPainter extends CustomPainter {
  _ScoreRingPainter({required this.progress});

  final double progress;

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final radius = (size.shortestSide - 12) / 2;
    final trackPaint = Paint()
      ..color = Colors.white.withValues(alpha: 0.14)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 10
      ..strokeCap = StrokeCap.round;
    canvas.drawCircle(center, radius, trackPaint);

    final progressPaint = Paint()
      ..shader = SweepGradient(
        colors: const [_fitilaPrimary, _fitilaGoldDeep, _fitilaPrimary],
        startAngle: 0,
        endAngle: math.pi * 2,
      ).createShader(Rect.fromCircle(center: center, radius: radius))
      ..style = PaintingStyle.stroke
      ..strokeWidth = 10
      ..strokeCap = StrokeCap.round;

    final sweep = math.pi * 2 * progress.clamp(0.0, 1.0);
    canvas.drawArc(
      Rect.fromCircle(center: center, radius: radius),
      -math.pi / 2,
      sweep,
      false,
      progressPaint,
    );
  }

  @override
  bool shouldRepaint(covariant _ScoreRingPainter oldDelegate) =>
      oldDelegate.progress != progress;
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

// ═══════════════════════════════════════════════════════════════════
// Création de contenu — 6 fonctionnalités IA validées le 15/09/2026 :
// Echo Sɔ̃ɔ, Live Griot IA, Sagesse Battle, Aburu Fim IA, Sasara IA,
// Handunia Wasa. Périmètre honnête : Echo Sɔ̃ɔ / Sasara IA / Aburu Fim
// IA sont opérationnels avec des simplifications assumées (pas de
// dictée vocale automatique, pas de génération visuelle IA, pas de
// détection produit par vision) ; Sagesse Battle est opérationnel
// (thème « proverbes » + XP/badges du module Apprendre) ; Live Griot IA
// fournit un direct audio WebRTC + chat temps réel pour petit public,
// avec fallback STUN si aucun relais TURN n'est disponible ; Handunia
// Wasa fournit lieux, fragments, likes et continuité hors ligne.
// ═══════════════════════════════════════════════════════════════════

int _dayOfYear(DateTime date) {
  return date.difference(DateTime(date.year, 1, 1)).inDays + 1;
}

String _initialLetter(String? value) {
  final trimmed = (value ?? '').trim();
  return trimmed.isEmpty ? 'G' : trimmed.substring(0, 1).toUpperCase();
}

class _FitilaListenButton extends StatefulWidget {
  const _FitilaListenButton({
    this.bariba,
    this.french,
    required this.label,
    this.compact = false,
    this.dark = false,
  });

  final String? bariba;
  final String? french;
  final String label;
  final bool compact;
  final bool dark;

  @override
  State<_FitilaListenButton> createState() => _FitilaListenButtonState();
}

class _FitilaListenButtonState extends State<_FitilaListenButton> {
  final _player = audio.AudioPlayer();
  final _frenchTts = FlutterTts();
  bool _busy = false;
  bool _playing = false;

  @override
  void dispose() {
    _player.dispose();
    _frenchTts.stop();
    super.dispose();
  }

  Future<void> _stop() async {
    await _player.stop();
    await _frenchTts.stop();
    if (mounted) {
      setState(() {
        _busy = false;
        _playing = false;
      });
    }
  }

  Future<void> _toggle() async {
    if (_busy) {
      return;
    }
    if (_playing) {
      await _stop();
      return;
    }

    final bariba = (widget.bariba ?? '').trim();
    final french = (widget.french ?? '').trim();
    final text = bariba.isNotEmpty ? bariba : french;
    if (text.length < 2) {
      return;
    }

    setState(() {
      _busy = true;
      _playing = false;
    });
    try {
      if (bariba.isNotEmpty) {
        if (!FitilaBackend.configured) {
          throw StateError('Service vocal Bariba indisponible hors connexion.');
        }
        final response = await FitilaBackend.client.functions.invoke(
          'bariba-tts',
          body: {
            'text': bariba,
            'speakingRate': 1.0,
            'noiseScale': 0.5,
            'noiseScaleW': 0.6,
          },
        );
        final data = response.data;
        if (data is! Map) {
          throw StateError('Réponse audio invalide.');
        }
        if (data['skipped'] == true) {
          return;
        }
        final remoteError = data['error']?.toString().trim() ?? '';
        if (remoteError.isNotEmpty) {
          throw StateError(remoteError);
        }

        final audioUrl = data['audio_url']?.toString().trim() ?? '';
        final encoded = data['audio']?.toString().trim() ?? '';
        if (mounted) {
          setState(() => _playing = true);
        }
        if (audioUrl.isNotEmpty) {
          await _player.play(audio.UrlSource(audioUrl));
        } else if (encoded.isNotEmpty) {
          final raw = encoded.contains(',') ? encoded.split(',').last : encoded;
          await _player.play(audio.BytesSource(base64Decode(raw)));
        } else {
          throw StateError('Aucun audio reçu du service vocal.');
        }
        await _player.onPlayerComplete.first;
      } else {
        await _frenchTts.setLanguage('fr-FR');
        await _frenchTts.setSpeechRate(0.5);
        await _frenchTts.awaitSpeakCompletion(true);
        if (mounted) {
          setState(() => _playing = true);
        }
        await _frenchTts.speak(french);
      }
    } catch (error) {
      if (!mounted) {
        return;
      }
      final message = error.toString().replaceFirst('Bad state: ', '');
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(message)));
    } finally {
      if (mounted) {
        setState(() {
          _busy = false;
          _playing = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final foreground = widget.dark ? Colors.white : _fitilaGoldDeep;
    return TextButton.icon(
      style: TextButton.styleFrom(
        foregroundColor: foreground,
        visualDensity: widget.compact
            ? VisualDensity.compact
            : VisualDensity.standard,
        padding: widget.compact
            ? const EdgeInsets.symmetric(horizontal: 8, vertical: 4)
            : const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      ),
      onPressed: _busy ? null : _toggle,
      icon: _busy
          ? SizedBox(
              width: widget.compact ? 14 : 18,
              height: widget.compact ? 14 : 18,
              child: CircularProgressIndicator(
                strokeWidth: 2,
                color: foreground,
              ),
            )
          : Icon(
              _playing ? Icons.stop_circle_rounded : Icons.volume_up_rounded,
              size: widget.compact ? 17 : 20,
            ),
      label: Text(
        widget.label,
        style: TextStyle(fontSize: widget.compact ? 11 : 13),
      ),
    );
  }
}

class _FitilaCollapsibleNote extends StatelessWidget {
  const _FitilaCollapsibleNote({
    required this.icon,
    required this.summary,
    required this.detail,
  });

  final IconData icon;
  final String summary;
  final String detail;

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: EdgeInsets.zero,
      color: _fitilaSurfaceAlt,
      child: ExpansionTile(
        leading: Icon(icon, color: _fitilaGoldDeep, size: 20),
        title: Text(
          summary,
          style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700),
        ),
        tilePadding: const EdgeInsets.symmetric(horizontal: 12),
        childrenPadding: const EdgeInsets.fromLTRB(12, 0, 12, 12),
        children: [
          Align(
            alignment: Alignment.centerLeft,
            child: Text(
              detail,
              style: TextStyle(color: _fitilaMuted, fontSize: 12, height: 1.4),
            ),
          ),
        ],
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────
// 1. Echo Sɔ̃ɔ — voix/texte + traduction instantanée + visuel signature
// ─────────────────────────────────────────────────────────────────
class _EchoVisualPreset {
  const _EchoVisualPreset(this.name, this.colorA, this.colorB, this.icon);
  final String name;
  final Color colorA;
  final Color colorB;
  final IconData icon;
}

class EchoSonScreen extends StatefulWidget {
  const EchoSonScreen({super.key, required this.onPostCreated});

  final ValueChanged<FeedPost> onPostCreated;

  @override
  State<EchoSonScreen> createState() => _EchoSonScreenState();
}

class _EchoSonScreenState extends State<EchoSonScreen> {
  final _mediaController = FitilaMediaController();
  final _textController = TextEditingController();
  static const _presets = [
    _EchoVisualPreset(
      'Aube dorée',
      Color(0xFFC99530),
      Color(0xFF9C6B1D),
      Icons.wb_sunny_rounded,
    ),
    _EchoVisualPreset(
      'Nuit Sahel',
      Color(0xFF241F2E),
      Color(0xFF3A3448),
      Icons.nightlight_round,
    ),
    _EchoVisualPreset(
      "Terre d'argile",
      Color(0xFFB54E33),
      Color(0xFF8C3D28),
      Icons.terrain_rounded,
    ),
    _EchoVisualPreset(
      'Feuille de sauge',
      Color(0xFF3F6E52),
      Color(0xFF2C4E3A),
      Icons.eco_rounded,
    ),
    _EchoVisualPreset(
      'Griot pourpre',
      Color(0xFF6758C9),
      Color(0xFF4A3B96),
      Icons.auto_awesome_rounded,
    ),
  ];
  int _presetIndex = 0;
  TranslationDirection _direction = TranslationDirection.frenchToBariba;
  String _translated = '';
  bool _translating = false;
  bool _recording = false;
  FitilaMediaAsset? _audio;
  bool _publishing = false;
  final _playback = audio.AudioPlayer();
  bool _playingBack = false;

  // Parcours en 4 écrans, inspiré du visuel de la maquette premium jointe
  // (orbe micro → enregistrement → traitement réel → aperçu/publication),
  // implémenté comme une simple machine à états interne plutôt qu'avec
  // de nouvelles routes, pour ne rien changer à la navigation partagée.
  // 0 = accueil (choisir voix ou texte) · 1 = enregistrement en cours ·
  // 2 = aperçu / édition · 3 = publication en cours (traitement réel).
  int _step = 0;
  Timer? _recTimer;
  int _recElapsedSeconds = 0;

  @override
  void dispose() {
    _textController.dispose();
    _mediaController.dispose();
    _playback.dispose();
    _recTimer?.cancel();
    super.dispose();
  }

  String get _recTimerLabel {
    final m = (_recElapsedSeconds ~/ 60).toString().padLeft(2, '0');
    final s = (_recElapsedSeconds % 60).toString().padLeft(2, '0');
    return '$m:$s';
  }

  Future<void> _startRecordingStep() async {
    try {
      await _mediaController.startAudio();
      if (!mounted) {
        return;
      }
      _recTimer?.cancel();
      _recElapsedSeconds = 0;
      _recTimer = Timer.periodic(const Duration(seconds: 1), (_) {
        if (mounted) {
          setState(() => _recElapsedSeconds++);
        }
      });
      setState(() {
        _recording = true;
        _step = 1;
      });
    } catch (error) {
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(error.toString().replaceFirst('Bad state: ', '')),
        ),
      );
    }
  }

  Future<void> _toggleRecording() async {
    try {
      if (_recording) {
        final asset = await _mediaController.stopAudio();
        _recTimer?.cancel();
        if (!mounted) {
          return;
        }
        setState(() {
          _recording = false;
          _audio = asset;
          _step = 2;
        });
      } else {
        await _startRecordingStep();
      }
    } catch (error) {
      if (!mounted) {
        return;
      }
      _recTimer?.cancel();
      setState(() => _recording = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(error.toString().replaceFirst('Bad state: ', '')),
        ),
      );
    }
  }

  Future<void> _discardRecording() async {
    await _playback.stop();
    if (!mounted) {
      return;
    }
    setState(() {
      _audio = null;
      _playingBack = false;
      // Sans audio ni texte déjà saisi, revenir à l'accueil plutôt que de
      // laisser un écran d'aperçu vide.
      if (_textController.text.trim().isEmpty) {
        _step = 0;
      }
    });
  }

  Future<void> _togglePlayback() async {
    final clip = _audio;
    if (clip == null) {
      return;
    }
    if (_playingBack) {
      await _playback.stop();
      if (mounted) {
        setState(() => _playingBack = false);
      }
      return;
    }
    await _playback.play(audio.DeviceFileSource(clip.path));
    if (!mounted) {
      return;
    }
    setState(() => _playingBack = true);
    _playback.onPlayerComplete.first.then((_) {
      if (mounted) {
        setState(() => _playingBack = false);
      }
    });
  }

  Future<void> _translate() async {
    final text = _textController.text.trim();
    if (text.isEmpty || _translating) {
      return;
    }
    setState(() => _translating = true);
    try {
      final session = FitilaBackend.client.auth.currentSession;
      final result = await FitilaServices.translate(
        text,
        _direction,
        accessToken: session?.accessToken,
      );
      if (!mounted) {
        return;
      }
      setState(() => _translated = result);
    } catch (_) {
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Traduction indisponible pour le moment.'),
        ),
      );
    } finally {
      if (mounted) {
        setState(() => _translating = false);
      }
    }
  }

  // Reflète une progression RÉELLE (pas une minuterie) : 0 tant que rien
  // n'est parti, 1 dès que la requête réseau de publication est en vol
  // (préparation client déjà faite), 2 seulement après sa réussite.
  int _publishDoneCount = 0;

  Future<void> _publish() async {
    final text = _textController.text.trim();
    if (text.isEmpty && _audio == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Ajoutez un texte ou un enregistrement audio.'),
        ),
      );
      return;
    }
    setState(() {
      _publishing = true;
      _publishDoneCount = 1;
      _step = 3;
    });
    final preset = _presets[_presetIndex];
    final caption = [
      text,
      if (_translated.trim().isNotEmpty) _translated.trim(),
    ].join('\n\n');
    try {
      final row = _audio != null
          ? await FitilaBackend.createMediaPost(
              bytes: await _audio!.readBytes(),
              originalName: _audio!.name,
              contentType: _audio!.contentType,
              mediaType: _audio!.mediaType,
              text: caption,
              hashtags: const ['echo-sonn', 'fitila-ia'],
              templateId: preset.name,
            )
          : await FitilaBackend.createTextPost(
              text: caption,
              hashtags: const ['echo-sonn', 'fitila-ia'],
              templateId: preset.name,
            );
      if (!mounted) {
        return;
      }
      widget.onPostCreated(FeedPost.fromBackend(row));
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: const Text('Echo Sɔ̃ɔ publié dans le fil.'),
          action: caption.trim().isEmpty
              ? null
              : SnackBarAction(
                  label: 'Rendre bilingue',
                  onPressed: () => Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (_) => SasaraIaScreen(
                        onPostCreated: widget.onPostCreated,
                        initialText: caption,
                      ),
                    ),
                  ),
                ),
        ),
      );
      await _playback.stop();
      setState(() {
        _textController.clear();
        _translated = '';
        _audio = null;
        _playingBack = false;
        _publishDoneCount = 2;
        _step = 0;
      });
    } catch (_) {
      if (!mounted) {
        return;
      }
      setState(() => _step = 2);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Publication impossible. Réessayez.')),
      );
    } finally {
      if (mounted) {
        setState(() => _publishing = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final dark = _step == 0 || _step == 1 || _step == 3;
    final title = _step == 2 ? 'Aperçu' : 'Echo Sɔ̃ɔ';
    final subtitle = _step == 2 ? 'Prêt à publier' : 'Nouvelle création';
    return ReferenceCreationShell(
      dark: dark,
      title: title,
      subtitle: subtitle,
      showTopBar: _step != 1 && _step != 3,
      leading: _step == 0
          ? const Icon(Icons.close_rounded, size: 17, color: Colors.white)
          : null,
      onBack: () {
        if (_step == 0) {
          Navigator.maybePop(context);
        } else {
          setState(() => _step = 0);
        }
      },
      bodyPadding: _step == 0
          ? EdgeInsets.zero
          : const EdgeInsets.fromLTRB(16, 14, 16, 22),
      child: AnimatedSwitcher(
        duration: const Duration(milliseconds: 450),
        switchInCurve: Curves.easeOutCubic,
        switchOutCurve: Curves.easeInCubic,
        child: KeyedSubtree(key: ValueKey(_step), child: _buildStepBody()),
      ),
    );
  }

  Widget _buildStepBody() {
    switch (_step) {
      case 1:
        return _buildRecordingStep();
      case 2:
        return _buildPreviewStep();
      case 3:
        return _buildProcessingStep();
      case 0:
      default:
        return _buildIntroStep();
    }
  }

  Widget _buildIntroStep() {
    final baSelected = _direction == TranslationDirection.baribaToFrench;
    return LayoutBuilder(
      builder: (context, constraints) => SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 18),
        child: ConstrainedBox(
          constraints: BoxConstraints(minHeight: math.max(500.0, constraints.maxHeight - 26).toDouble()),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(
                'Raconte quelque chose…\nune actu, un souvenir, un conseil.',
                textAlign: TextAlign.center,
                style: FitilaReferenceUi.serif(
                  size: 18,
                  color: Colors.white,
                  height: 1.4,
                ),
              ),
              const SizedBox(height: 17),
              ReferenceMicOrb(
                icon: Icons.mic_rounded,
                size: 96,
                ringExtent: 150,
                onTap: _startRecordingStep,
              ),
              const SizedBox(height: 14),
              const Text(
                'Appuie et parle',
                style: TextStyle(
                  color: Color(0xC7FFFFFF),
                  fontSize: 12.5,
                  fontWeight: FontWeight.w700,
                ),
              ),
              const SizedBox(height: 14),
              ReferenceDarkLangToggle(
                first: 'Bàátɔ̀nú',
                second: 'Français',
                firstSelected: baSelected,
                onFirst: () => setState(
                  () => _direction = TranslationDirection.baribaToFrench,
                ),
                onSecond: () => setState(
                  () => _direction = TranslationDirection.frenchToBariba,
                ),
              ),
              const SizedBox(height: 18),
              TextButton.icon(
                onPressed: () => setState(() => _step = 2),
                icon: const Icon(Icons.edit_rounded, size: 15),
                label: const Text('Écrire à la place'),
                style: TextButton.styleFrom(
                  foregroundColor: Colors.white.withValues(alpha: .58),
                  textStyle: const TextStyle(fontSize: 11.5),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildRecordingStep() {
    final liveText = _textController.text.trim();
    return Column(
      children: [
        const SizedBox(height: 10),
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 9,
              height: 9,
              decoration: const BoxDecoration(
                color: Color(0xFFFF5A5F),
                shape: BoxShape.circle,
              ),
            ),
            const SizedBox(width: 8),
            Text(
              _recTimerLabel,
              style: const TextStyle(
                color: Colors.white,
                fontSize: 13,
                fontWeight: FontWeight.w800,
                letterSpacing: .3,
              ),
            ),
          ],
        ),
        const SizedBox(height: 10),
        const ReferenceWaveform(active: true, height: 70),
        const SizedBox(height: 13),
        ReferenceCard(
          dark: true,
          margin: EdgeInsets.zero,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'TRANSCRIPTION EN DIRECT',
                style: TextStyle(
                  color: FitilaReferenceUi.gold,
                  fontSize: 9.5,
                  letterSpacing: .8,
                  fontWeight: FontWeight.w800,
                ),
              ),
              const SizedBox(height: 5),
              Text(
                liveText.isNotEmpty
                    ? liveText
                    : 'Ta voix est enregistrée fidèlement…',
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 13,
                  height: 1.5,
                ),
              ),
              if (liveText.isEmpty) ...[
                const SizedBox(height: 5),
                Text(
                  'La transcription automatique en direct n’est pas encore active sur cet écran.',
                  style: TextStyle(
                    color: Colors.white.withValues(alpha: .38),
                    fontSize: 9.5,
                    height: 1.35,
                  ),
                ),
              ],
            ],
          ),
        ),
        const Spacer(),
        ReferenceGhostDarkButton(
          label: 'Terminer l’enregistrement',
          icon: Icons.stop_rounded,
          onPressed: _toggleRecording,
        ),
      ],
    );
  }

  Widget _buildPreviewStep() {
    final preset = _presets[_presetIndex];
    final source = _textController.text.trim();
    final caption = [
      if (source.isNotEmpty) source,
      if (_translated.trim().isNotEmpty) _translated.trim(),
    ].join(' / ');
    return ListView(
      padding: EdgeInsets.zero,
      children: [
        ReferenceVideoMock(
          caption: caption.isEmpty
              ? 'Ajoutez un texte ou gardez votre voix avant de publier.'
              : caption,
          duration: _audio == null ? 'texte' : _recTimerLabel,
          minHeight: 280,
          child: DecoratedBox(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [preset.colorA, preset.colorB],
              ),
            ),
            child: Center(
              child: _audio == null
                  ? Icon(
                      preset.icon,
                      color: Colors.white.withValues(alpha: .55),
                      size: 54,
                    )
                  : Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        IconButton(
                          onPressed: _togglePlayback,
                          iconSize: 54,
                          color: Colors.white.withValues(alpha: .90),
                          icon: Icon(
                            _playingBack
                                ? Icons.stop_circle_rounded
                                : Icons.play_circle_fill_rounded,
                          ),
                        ),
                        SizedBox(
                          width: 170,
                          child: _FitilaWaveformBars(
                            active: _playingBack,
                            height: 34,
                          ),
                        ),
                      ],
                    ),
            ),
          ),
        ),
        const SizedBox(height: 12),
        SizedBox(
          height: 42,
          child: ListView(
            scrollDirection: Axis.horizontal,
            children: [
              ReferenceEditChip(
                emoji: '🎨',
                label: 'Style visuel',
                onTap: () => setState(
                  () => _presetIndex = (_presetIndex + 1) % _presets.length,
                ),
              ),
              const SizedBox(width: 8),
              const ReferenceEditChip(emoji: '🎵', label: 'Musique'),
              const SizedBox(width: 8),
              ReferenceEditChip(
                emoji: '🗣️',
                label: _audio == null ? 'Voix' : 'Écouter',
                onTap: _audio == null ? _startRecordingStep : _togglePlayback,
              ),
            ],
          ),
        ),
        const SizedBox(height: 9),
        Theme(
          data: Theme.of(context).copyWith(
            dividerColor: Colors.transparent,
            expansionTileTheme: const ExpansionTileThemeData(
              tilePadding: EdgeInsets.symmetric(horizontal: 12),
              childrenPadding: EdgeInsets.fromLTRB(12, 0, 12, 12),
            ),
          ),
          child: Container(
            decoration: BoxDecoration(
              color: FitilaReferenceUi.surface,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: FitilaReferenceUi.hairline),
            ),
            child: ExpansionTile(
              dense: true,
              leading: const Icon(Icons.edit_note_rounded, size: 19),
              title: const Text(
                'Texte & traduction',
                style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w800),
              ),
              children: [
                TextField(
                  controller: _textController,
                  minLines: 2,
                  maxLines: 4,
                  decoration: const InputDecoration(
                    hintText: 'Votre texte…',
                  ),
                ),
                const SizedBox(height: 8),
                ReferenceLightSegment(
                  first: 'Français → Bariba',
                  second: 'Bariba → Français',
                  firstSelected:
                      _direction == TranslationDirection.frenchToBariba,
                  onFirst: () => setState(
                    () => _direction = TranslationDirection.frenchToBariba,
                  ),
                  onSecond: () => setState(
                    () => _direction = TranslationDirection.baribaToFrench,
                  ),
                ),
                const SizedBox(height: 8),
                OutlinedButton.icon(
                  onPressed: _translating ? null : _translate,
                  icon: _translating
                      ? const SizedBox(
                          width: 14,
                          height: 14,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Icon(Icons.translate_rounded, size: 16),
                  label: const Text('Traduire'),
                ),
                if (_translated.isNotEmpty) ...[
                  const SizedBox(height: 8),
                  Text(
                    _translated,
                    style: const TextStyle(
                      fontSize: 12.5,
                      height: 1.4,
                      color: FitilaReferenceUi.inkSoft,
                    ),
                  ),
                ],
                if (_audio != null)
                  Align(
                    alignment: Alignment.centerLeft,
                    child: TextButton.icon(
                      onPressed: _discardRecording,
                      icon: const Icon(Icons.delete_outline_rounded, size: 16),
                      label: const Text('Supprimer la voix'),
                    ),
                  ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 12),
        ReferenceGoldButton(
          label: 'Publier dans le Fil',
          icon: Icons.send_rounded,
          busy: _publishing,
          onPressed: _publishing ? null : _publish,
        ),
      ],
    );
  }

  Widget _buildProcessingStep() {
    return LayoutBuilder(
      builder: (context, constraints) => SingleChildScrollView(
        child: ConstrainedBox(
          constraints: BoxConstraints(minHeight: constraints.maxHeight),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 12),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                SizedBox(
                  width: 76,
                  height: 76,
                  child: Stack(
                    alignment: Alignment.center,
                    children: [
                      ReferenceCountdownRing(
                        label: '',
                        progress: _publishDoneCount >= 2
                            ? 1
                            : _publishDoneCount == 1
                                ? .72
                                : .12,
                        size: 76,
                        dark: true,
                      ),
                      const Text('🪄', style: TextStyle(fontSize: 20)),
                    ],
                  ),
                ),
                const SizedBox(height: 24),
                Text(
                  "L'IA compose ta vidéo",
                  textAlign: TextAlign.center,
                  style: FitilaReferenceUi.serif(
                    size: 19,
                    color: Colors.white,
                  ),
                ),
                const SizedBox(height: 5),
                Text(
                  'Quelques secondes suffisent',
                  style: TextStyle(
                    color: Colors.white.withValues(alpha: .55),
                    fontSize: 11.5,
                  ),
                ),
                const SizedBox(height: 22),
                _FitilaProcessingChecklist(
                  steps: const [
                    'Préparation de la création',
                    'Publication dans le Fil',
                  ],
                  doneCount: _publishDoneCount,
                  futureSteps: const [
                    'Habillage visuel généré',
                    "Musique d'ambiance",
                    'Sous-titres bilingues automatiques',
                  ],
                  light: true,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────
// 2. Live Griot IA — configuration honnête (pas de live réel encore)
// ─────────────────────────────────────────────────────────────────
class LiveGriotScreen extends StatefulWidget {
  const LiveGriotScreen({super.key, required this.onPostCreated});

  final ValueChanged<FeedPost> onPostCreated;

  @override
  State<LiveGriotScreen> createState() => _LiveGriotScreenState();
}

class _LiveGriotScreenState extends State<LiveGriotScreen> {
  final _title = TextEditingController();
  final _description = TextEditingController();

  String _language = 'Bariba + Français';
  bool _scheduling = false;
  List<Map<String, dynamic>> _activeLives = const [];
  bool _loadingLives = true;
  bool _startingLive = false;
  String? _loadError;
  bool _checkingTurn = true;
  bool _turnReady = false;
  String _selectedLiveTopic = 'Marché';
  bool _liveAiEnabled = true;

  @override
  void initState() {
    super.initState();
    _title.addListener(_onDraftChanged);
    _description.addListener(_onDraftChanged);
    unawaited(_loadActiveLives());
    unawaited(_checkTurnInfrastructure());
  }

  void _onDraftChanged() {
    if (mounted) {
      setState(() {});
    }
  }

  @override
  void dispose() {
    _title
      ..removeListener(_onDraftChanged)
      ..dispose();
    _description
      ..removeListener(_onDraftChanged)
      ..dispose();
    super.dispose();
  }

  Future<void> _loadActiveLives() async {
    if (mounted) {
      setState(() {
        _loadingLives = true;
        _loadError = null;
      });
    }
    try {
      final lives = await FitilaBackend.fetchActiveLiveSessions();
      if (!mounted) {
        return;
      }
      setState(() {
        _activeLives = lives;
        _loadingLives = false;
      });
    } catch (error) {
      if (!mounted) {
        return;
      }
      setState(() {
        _loadingLives = false;
        _loadError =
            'Impossible de charger les directs. Vérifiez votre connexion.';
      });
    }
  }

  Future<void> _checkTurnInfrastructure() async {
    try {
      if (!FitilaBackend.configured ||
          FitilaBackend.client.auth.currentUser == null) {
        if (mounted) {
          setState(() {
            _checkingTurn = false;
            _turnReady = false;
          });
        }
        return;
      }
      final servers = await FitilaBackend.fetchLiveTurnServers().timeout(
        const Duration(seconds: 6),
      );
      if (!mounted) {
        return;
      }
      setState(() {
        _checkingTurn = false;
        _turnReady = servers.isNotEmpty;
      });
    } catch (_) {
      // Pendant le bootstrap, Supabase.instance peut ne pas encore être
      // initialisé même si les dart-defines sont présents. Le studio reste
      // utilisable et bascule visuellement sur le fallback STUN.
      if (!mounted) {
        return;
      }
      setState(() {
        _checkingTurn = false;
        _turnReady = false;
      });
    }
  }

  Future<void> _refreshAll() async {
    await Future.wait([
      _loadActiveLives(),
      _checkTurnInfrastructure(),
    ]);
  }

  Future<void> _startLiveNow() async {
    final title = _title.text.trim();
    if (title.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Donnez un titre à votre direct avant de démarrer.'),
        ),
      );
      return;
    }
    setState(() => _startingLive = true);
    try {
      final live = await FitilaBackend.createLiveSession(
        title: title,
        description: _description.text.trim().isEmpty
            ? null
            : _description.text.trim(),
        language: _language,
      );
      if (!mounted) {
        return;
      }
      await Navigator.push(
        context,
        MaterialPageRoute(
          builder: (_) => LiveRoomScreen(
            liveId: live['id'].toString(),
            title: title,
            role: FitilaLiveRole.host,
          ),
        ),
      );
      if (mounted) {
        await _loadActiveLives();
      }
    } catch (error) {
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            'Impossible de démarrer le direct : ${error.toString().replaceFirst("Bad state: ", "")}',
          ),
        ),
      );
    } finally {
      if (mounted) {
        setState(() => _startingLive = false);
      }
    }
  }

  void _joinLive(Map<String, dynamic> live) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => LiveRoomScreen(
          liveId: live['id'].toString(),
          title: live['title']?.toString() ?? 'Live Griot IA',
          role: FitilaLiveRole.viewer,
        ),
      ),
    ).then((_) {
      if (mounted) {
        _loadActiveLives();
      }
    });
  }

  Future<void> _scheduleAnnouncement() async {
    final title = _title.text.trim();
    if (title.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Donnez un titre à votre direct.')),
      );
      return;
    }
    setState(() => _scheduling = true);
    final content = [
      '📡 Live Griot IA à venir : $title',
      if (_description.text.trim().isNotEmpty) _description.text.trim(),
      'Langue : $_language • Direct audio et chat en temps réel',
    ].join('\n\n');
    try {
      final row = await FitilaBackend.createTextPost(
        text: content,
        hashtags: const ['live-a-venir', 'live-griot-ia'],
        templateId: 'live-griot-ia',
      );
      if (!mounted) {
        return;
      }
      widget.onPostCreated(FeedPost.fromBackend(row));
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Annonce publiée dans le fil.')),
      );
    } catch (_) {
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Publication impossible. Réessayez.')),
      );
    } finally {
      if (mounted) {
        setState(() => _scheduling = false);
      }
    }
  }

  Widget _buildReferenceTopic({
    required String emoji,
    required String label,
  }) {
    final selected = _selectedLiveTopic == label;
    return Material(
      color: selected
          ? FitilaReferenceUi.gold
          : Colors.white.withValues(alpha: .06),
      borderRadius: BorderRadius.circular(13),
      child: InkWell(
        borderRadius: BorderRadius.circular(13),
        onTap: () => setState(() => _selectedLiveTopic = label),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 11),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(13),
            border: Border.all(
              color: selected
                  ? FitilaReferenceUi.gold
                  : Colors.white.withValues(alpha: .14),
            ),
          ),
          child: Column(
            children: [
              Text(emoji, style: const TextStyle(fontSize: 18)),
              const SizedBox(height: 5),
              Text(
                label,
                textAlign: TextAlign.center,
                style: TextStyle(
                  color: selected ? FitilaReferenceUi.ink : Colors.white,
                  fontSize: 11.5,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildLiveReferenceCard(Map<String, dynamic> live) {
    final title = live['title']?.toString().trim();
    final host = live['host_display_name']?.toString().trim();
    final viewers = (live['viewer_count'] as num?)?.toInt() ?? 0;
    return ReferenceCard(
      dark: true,
      margin: const EdgeInsets.only(bottom: 9),
      padding: const EdgeInsets.all(11),
      child: Row(
        children: [
          CircleAvatar(
            radius: 19,
            backgroundColor: FitilaReferenceUi.gold,
            child: Text(
              _initialLetter(host),
              style: const TextStyle(
                color: FitilaReferenceUi.ink,
                fontSize: 11,
                fontWeight: FontWeight.w900,
              ),
            ),
          ),
          const SizedBox(width: 9),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title?.isNotEmpty == true ? title! : 'Live Griot IA',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 12.5,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                Text(
                  (host?.isNotEmpty == true ? host! : 'Griot Fitila') +
                      ' · $viewers auditeur(s)',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    color: Colors.white.withValues(alpha: .52),
                    fontSize: 10,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 6),
          TextButton(
            onPressed: () => _joinLive(live),
            style: TextButton.styleFrom(
              foregroundColor: FitilaReferenceUi.gold,
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
            ),
            child: const Text(
              'Écouter',
              style: TextStyle(fontSize: 11, fontWeight: FontWeight.w900),
            ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return ReferenceCreationShell(
      dark: true,
      title: 'Nouveau direct',
      subtitle: 'Configuration',
      leading: const Icon(Icons.close_rounded, size: 17, color: Colors.white),
      child: RefreshIndicator(
        onRefresh: _refreshAll,
        color: FitilaReferenceUi.gold,
        child: ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: EdgeInsets.zero,
          children: [
            const ReferenceLabel('Sujet du direct', dark: true),
            const SizedBox(height: 8),
            GridView.count(
              crossAxisCount: 2,
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              mainAxisSpacing: 9,
              crossAxisSpacing: 9,
              childAspectRatio: 1.55,
              children: [
                _buildReferenceTopic(emoji: '🛍️', label: 'Marché'),
                _buildReferenceTopic(emoji: '🌾', label: 'Agriculture'),
                _buildReferenceTopic(emoji: '🏛️', label: 'Culture'),
                _buildReferenceTopic(emoji: '🩺', label: 'Santé'),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                const Expanded(
                  child: Text(
                    'Assistant IA activé',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 12.5,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
                Switch(
                  value: _liveAiEnabled,
                  activeThumbColor: Colors.white,
                  activeTrackColor: FitilaReferenceUi.sage,
                  onChanged: (value) => setState(() => _liveAiEnabled = value),
                ),
              ],
            ),
            const SizedBox(height: 2),
            ReferenceCard(
              dark: true,
              margin: const EdgeInsets.only(bottom: 12),
              child: Column(
                children: [
                  TextField(
                    controller: _title,
                    maxLength: 80,
                    style: const TextStyle(color: Colors.white, fontSize: 13),
                    decoration: const InputDecoration(
                      labelText: 'Titre du direct',
                      hintText: 'Ex. Histoires et proverbes de Nikki',
                      counterText: '',
                    ),
                  ),
                  const SizedBox(height: 9),
                  TextField(
                    controller: _description,
                    maxLines: 2,
                    maxLength: 280,
                    style: const TextStyle(color: Colors.white, fontSize: 12.5),
                    decoration: const InputDecoration(
                      labelText: 'Description',
                      hintText: 'Présentez le direct en quelques mots…',
                      counterText: '',
                    ),
                  ),
                  const SizedBox(height: 9),
                  DropdownButtonFormField<String>(
                    initialValue: _language,
                    dropdownColor: FitilaReferenceUi.dark2,
                    style: const TextStyle(color: Colors.white, fontSize: 12.5),
                    decoration: const InputDecoration(labelText: 'Langue'),
                    items: const [
                      DropdownMenuItem(
                        value: 'Bariba + Français',
                        child: Text('Bariba + Français'),
                      ),
                      DropdownMenuItem(
                        value: 'Bariba',
                        child: Text('Bariba'),
                      ),
                      DropdownMenuItem(
                        value: 'Français',
                        child: Text('Français'),
                      ),
                    ],
                    onChanged: (value) {
                      if (value != null) setState(() => _language = value);
                    },
                  ),
                ],
              ),
            ),
            ReferenceGoldButton(
              label: 'Démarrer le direct',
              busy: _startingLive,
              onPressed: _startingLive ? null : _startLiveNow,
            ),
            const SizedBox(height: 8),
            TextButton.icon(
              onPressed: _scheduling ? null : _scheduleAnnouncement,
              icon: _scheduling
                  ? const SizedBox(
                      width: 13,
                      height: 13,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: Colors.white54,
                      ),
                    )
                  : const Icon(Icons.campaign_rounded, size: 15),
              label: const Text('Publier une annonce dans le Fil'),
              style: TextButton.styleFrom(
                foregroundColor: Colors.white.withValues(alpha: .58),
                textStyle: const TextStyle(fontSize: 11),
              ),
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                const Expanded(
                  child: ReferenceLabel('En direct maintenant', dark: true),
                ),
                if (!_checkingTurn)
                  ReferenceTinyPill(
                    dark: true,
                    icon: _turnReady
                        ? Icons.shield_rounded
                        : Icons.router_rounded,
                    label: _turnReady ? 'TURN' : 'STUN',
                    color: _turnReady
                        ? const Color(0xFF7FE2BE)
                        : const Color(0xFFF0C878),
                  ),
              ],
            ),
            const SizedBox(height: 8),
            if (_loadingLives)
              const Padding(
                padding: EdgeInsets.symmetric(vertical: 22),
                child: Center(
                  child: CircularProgressIndicator(
                    color: FitilaReferenceUi.gold,
                  ),
                ),
              )
            else if (_loadError != null)
              ReferenceCard(
                dark: true,
                child: Row(
                  children: [
                    const Icon(Icons.cloud_off_rounded, color: Color(0xFFFF8A7D)),
                    const SizedBox(width: 9),
                    Expanded(
                      child: Text(
                        _loadError!,
                        style: const TextStyle(
                          color: Colors.white70,
                          fontSize: 11,
                        ),
                      ),
                    ),
                    TextButton(
                      onPressed: _loadActiveLives,
                      child: const Text('Réessayer'),
                    ),
                  ],
                ),
              )
            else if (_activeLives.isEmpty)
              ReferenceCard(
                dark: true,
                child: Text(
                  'Aucun direct en cours — la scène est libre.',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    color: Colors.white.withValues(alpha: .55),
                    fontSize: 11.5,
                  ),
                ),
              )
            else
              for (final live in _activeLives) _buildLiveReferenceCard(live),
            const SizedBox(height: 22),
          ],
        ),
      ),
    );
  }
}

/// Salle de direct réelle (host ou spectateur) — connexion audio
/// WebRTC pair-à-pair via [FitilaLiveEngine], chat texte en direct et
/// compteur d'auditeurs réels.
class LiveRoomScreen extends StatefulWidget {
  const LiveRoomScreen({
    super.key,
    required this.liveId,
    required this.title,
    required this.role,
  });

  final String liveId;
  final String title;
  final FitilaLiveRole role;

  @override
  State<LiveRoomScreen> createState() => _LiveRoomScreenState();
}

class _LiveRoomScreenState extends State<LiveRoomScreen> {
  FitilaLiveEngine? _engine;
  StreamSubscription<int>? _peerCountSub;
  StreamSubscription<dynamic>? _remoteStreamSub;
  StreamSubscription<List<Map<String, dynamic>>>? _chatSub;
  final _chatController = TextEditingController();
  final List<Map<String, dynamic>> _chatMessages = [];

  int _peerCount = 0;
  bool _connecting = true;
  String? _error;
  bool _muted = false;
  bool _ending = false;
  bool _cleanedUp = false;
  bool _usingTurn = false;
  bool _remoteAudioReady = false;

  bool get _isHost => widget.role == FitilaLiveRole.host;

  @override
  void initState() {
    super.initState();
    unawaited(_init());
  }

  Future<void> _init() async {
    if (mounted) {
      setState(() {
        _connecting = true;
        _error = null;
        _remoteAudioReady = false;
      });
    }
    try {
      if (!_isHost) {
        await FitilaBackend.joinLiveAsViewer(widget.liveId);
      }
      final engine = FitilaLiveEngine(liveId: widget.liveId, role: widget.role);
      await engine.start();
      if (!mounted) {
        await engine.dispose();
        return;
      }
      _engine = engine;
      _usingTurn = engine.usingTurn;

      _peerCountSub = engine.peerCount.listen((count) {
        if (mounted) {
          setState(() => _peerCount = count);
        }
      });

      _remoteStreamSub = engine.remoteStreams.listen((streams) {
        if (!mounted) {
          return;
        }
        final map = streams as Map;
        setState(() => _remoteAudioReady = map.isNotEmpty);
      });

      _chatSub = FitilaBackend.streamLiveChat(widget.liveId).listen(
        (rows) {
          if (!mounted) {
            return;
          }
          setState(() {
            _chatMessages
              ..clear()
              ..addAll(rows);
          });
        },
        onError: (_) {
          // Le chat peut se rétablir sans interrompre le flux audio.
        },
      );

      if (mounted) {
        setState(() => _connecting = false);
      }
    } catch (error) {
      if (!mounted) {
        return;
      }
      setState(() {
        _connecting = false;
        _error =
            'Connexion impossible : ${error.toString().replaceFirst("Bad state: ", "")}';
      });
    }
  }

  Future<void> _disposeEngineOnly() async {
    await _peerCountSub?.cancel();
    await _remoteStreamSub?.cancel();
    await _chatSub?.cancel();
    _peerCountSub = null;
    _remoteStreamSub = null;
    _chatSub = null;

    final engine = _engine;
    _engine = null;
    if (engine != null) {
      try {
        await engine.notifyBye();
      } catch (_) {}
      try {
        await engine.dispose();
      } catch (_) {}
    }

    if (mounted) {
      setState(() {
        _peerCount = 0;
        _remoteAudioReady = false;
      });
    }
  }

  Future<void> _retryConnection() async {
    if (_connecting || _ending) {
      return;
    }
    await _disposeEngineOnly();
    if (mounted) {
      await _init();
    }
  }

  void _toggleMute() {
    final stream = _engine?.localStream;
    if (stream == null) {
      return;
    }
    setState(() => _muted = !_muted);
    for (final track in stream.getAudioTracks()) {
      track.enabled = !_muted;
    }
  }

  Future<void> _sendChat() async {
    final text = _chatController.text.trim();
    if (text.isEmpty || _connecting || _error != null) {
      return;
    }
    _chatController.clear();
    try {
      await FitilaBackend.sendLiveChatMessage(
        liveId: widget.liveId,
        message: text,
      );
    } catch (_) {
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Message non envoyé. Vérifiez votre connexion.'),
        ),
      );
    }
  }

  Future<void> _cleanup() async {
    if (_cleanedUp) {
      return;
    }
    _cleanedUp = true;
    await _disposeEngineOnly();
    if (_isHost) {
      try {
        await FitilaBackend.endLiveSession(widget.liveId);
      } catch (_) {}
    } else {
      try {
        await FitilaBackend.leaveLiveAsViewer(widget.liveId);
      } catch (_) {}
    }
  }

  Future<void> _endOrLeave() async {
    if (_ending) {
      return;
    }
    setState(() => _ending = true);
    await _cleanup();
    if (mounted) {
      Navigator.pop(context);
    }
  }

  @override
  void dispose() {
    _chatController.dispose();
    unawaited(_cleanup());
    super.dispose();
  }

  String _initials(dynamic name) => _initialLetter(name?.toString());

  String get _connectionLabel {
    if (_connecting) {
      return 'Connexion…';
    }
    if (_error != null) {
      return 'Connexion interrompue';
    }
    if (_isHost) {
      return _peerCount == 0
          ? 'En attente d’auditeurs'
          : '$_peerCount auditeur(s) connecté(s)';
    }
    return _remoteAudioReady ? 'Audio connecté' : 'Synchronisation audio…';
  }

  Color get _connectionColor {
    if (_error != null) {
      return const Color(0xFFFF6B78);
    }
    if (_connecting || (!_isHost && !_remoteAudioReady)) {
      return const Color(0xFFF1C96A);
    }
    return const Color(0xFF63D7A2);
  }

  Widget _roomPill({
    required IconData icon,
    required String label,
    required Color color,
  }) {
    return ReferenceTinyPill(
      dark: true,
      icon: icon,
      label: label,
      color: color,
    );
  }

  Widget _buildConnectionStage() {
    final latestChat = _chatMessages.isEmpty
        ? ''
        : (_chatMessages.last['message']?.toString() ?? '');
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
      child: Column(
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 5),
                decoration: BoxDecoration(
                  color: const Color(0xFFFF5A5F),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: const Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.circle, size: 6, color: Colors.white),
                    SizedBox(width: 5),
                    Text(
                      'DIRECT',
                      style: TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.w800,
                        fontSize: 10,
                      ),
                    ),
                  ],
                ),
              ),
              const Spacer(),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: .14),
                  borderRadius: BorderRadius.circular(999),
                ),
                child: Text(
                  '👁 $_peerCount',
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 11,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Container(
            width: double.infinity,
            constraints: const BoxConstraints(minHeight: 280),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(16),
              gradient: const LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [Color(0xFF2C2440), Color(0xFF3F345A)],
              ),
            ),
            child: Stack(
              children: [
                Center(
                  child: _connecting
                      ? const CircularProgressIndicator(
                          color: FitilaReferenceUi.gold,
                        )
                      : ReferenceMicOrb(
                          icon: _isHost
                              ? (_muted
                                  ? Icons.mic_off_rounded
                                  : Icons.mic_rounded)
                              : Icons.hearing_rounded,
                          size: 72,
                          ringExtent: 122,
                          active: _error == null && !_muted,
                          onTap: _isHost ? _toggleMute : null,
                        ),
                ),
                Positioned(
                  top: 16,
                  right: 12,
                  child: ConstrainedBox(
                    constraints: const BoxConstraints(maxWidth: 175),
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 11,
                        vertical: 9,
                      ),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: const BorderRadius.only(
                          topLeft: Radius.circular(14),
                          topRight: Radius.circular(14),
                          bottomLeft: Radius.circular(14),
                          bottomRight: Radius.circular(4),
                        ),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withValues(alpha: .25),
                            blurRadius: 20,
                            spreadRadius: -8,
                            offset: const Offset(0, 10),
                          ),
                        ],
                      ),
                      child: Text(
                        _error != null
                            ? 'Connexion interrompue'
                            : _connectionLabel,
                        style: const TextStyle(
                          color: FitilaReferenceUi.ink,
                          fontSize: 10.5,
                          fontWeight: FontWeight.w700,
                          height: 1.35,
                        ),
                      ),
                    ),
                  ),
                ),
                Positioned(
                  left: 12,
                  bottom: 12,
                  child: Container(
                    padding: const EdgeInsets.fromLTRB(6, 6, 12, 6),
                    decoration: BoxDecoration(
                      color: Colors.black.withValues(alpha: .40),
                      borderRadius: BorderRadius.circular(999),
                    ),
                    child: Row(
                      children: [
                        CircleAvatar(
                          radius: 13,
                          backgroundColor: FitilaReferenceUi.gold,
                          child: Text(
                            _isHost ? 'H' : 'G',
                            style: const TextStyle(
                              color: FitilaReferenceUi.ink,
                              fontSize: 10,
                              fontWeight: FontWeight.w900,
                            ),
                          ),
                        ),
                        const SizedBox(width: 7),
                        Text(
                          _isHost ? 'Hôte Fitila' : 'Live Griot IA',
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 11.5,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 10),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 9),
            decoration: BoxDecoration(
              color: Colors.black.withValues(alpha: .55),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Text(
              latestChat.isNotEmpty
                  ? latestChat
                  : (_isHost
                      ? 'Le chat et les sous-titres du direct apparaissent ici.'
                      : (_remoteAudioReady
                          ? 'Audio connecté · le direct est en cours.'
                          : 'Synchronisation audio en cours…')),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(
                color: Colors.white,
                fontSize: 11.5,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildErrorPanel() {
    return Expanded(
      child: Center(
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: ReferenceCard(
            dark: true,
            margin: EdgeInsets.zero,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(
                  Icons.portable_wifi_off_rounded,
                  color: Color(0xFFFF6B78),
                  size: 34,
                ),
                const SizedBox(height: 10),
                const Text(
                  'Le direct a perdu sa connexion',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 15,
                    fontWeight: FontWeight.w900,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  _error ?? 'Connexion indisponible.',
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    color: Colors.white54,
                    fontSize: 11,
                  ),
                ),
                const SizedBox(height: 12),
                ReferenceGhostDarkButton(
                  label: 'Reconnecter',
                  icon: Icons.refresh_rounded,
                  onPressed: _retryConnection,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildChat() {
    if (_chatMessages.isEmpty) {
      return const SizedBox.shrink();
    }
    return Flexible(
      child: ListView.builder(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 4),
        reverse: true,
        itemCount: math.min(_chatMessages.length, 8),
        itemBuilder: (context, index) {
          final message = _chatMessages[_chatMessages.length - 1 - index];
          return Padding(
            padding: const EdgeInsets.only(bottom: 6),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                CircleAvatar(
                  radius: 12,
                  backgroundColor: FitilaReferenceUi.gold,
                  child: Text(
                    _initials(message['display_name']),
                    style: const TextStyle(
                      color: FitilaReferenceUi.ink,
                      fontSize: 9,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                ),
                const SizedBox(width: 7),
                Expanded(
                  child: Text.rich(
                    TextSpan(
                      children: [
                        TextSpan(
                          text:
                              (message['display_name']?.toString() ?? 'Griot') +
                                  '  ',
                          style: const TextStyle(
                            color: FitilaReferenceUi.gold,
                            fontSize: 10.5,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                        TextSpan(
                          text: message['message']?.toString() ?? '',
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 11.5,
                            height: 1.3,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _buildBottomControls() {
    return Container(
      padding: const EdgeInsets.fromLTRB(12, 9, 12, 12),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: .04),
        border: Border(
          top: BorderSide(color: Colors.white.withValues(alpha: .09)),
        ),
      ),
      child: SafeArea(
        top: false,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Row(
              children: [
                if (_isHost) ...[
                  IconButton(
                    onPressed: _error == null ? _toggleMute : null,
                    tooltip: _muted ? 'Réactiver le micro' : 'Couper le micro',
                    icon: Icon(
                      _muted ? Icons.mic_off_rounded : Icons.mic_rounded,
                      color: Colors.white,
                    ),
                  ),
                  const SizedBox(width: 4),
                ],
                Expanded(
                  child: TextField(
                    controller: _chatController,
                    enabled: !_connecting && _error == null && !_ending,
                    style: const TextStyle(color: Colors.white, fontSize: 12),
                    decoration: const InputDecoration(
                      hintText: 'Écrire au direct…',
                    ),
                    textInputAction: TextInputAction.send,
                    onSubmitted: (_) => _sendChat(),
                  ),
                ),
                const SizedBox(width: 5),
                IconButton(
                  onPressed: !_connecting && _error == null ? _sendChat : null,
                  icon: const Icon(
                    Icons.send_rounded,
                    color: FitilaReferenceUi.gold,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 7),
            ReferenceGhostDarkButton(
              label: _isHost ? 'Terminer le direct' : 'Quitter le direct',
              icon: Icons.call_end_rounded,
              onPressed: _ending ? null : _endOrLeave,
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, result) {
        if (!didPop) _endOrLeave();
      },
      child: ReferenceCreationShell(
        dark: true,
        showTopBar: false,
        bodyPadding: EdgeInsets.zero,
        child: Column(
          children: [
            _buildConnectionStage(),
            if (_error != null)
              _buildErrorPanel()
            else if (!_connecting)
              _buildChat()
            else
              const Spacer(),
            _buildBottomControls(),
          ],
        ),
      ),
    );
  }

}

// ─────────────────────────────────────────────────────────────────
// 3. Sagesse Battle — défi proverbe quotidien, entièrement réel
// ─────────────────────────────────────────────────────────────────
class SagesseBattleScreen extends StatefulWidget {
  const SagesseBattleScreen({super.key});

  @override
  State<SagesseBattleScreen> createState() => _SagesseBattleScreenState();
}

class _SagesseBattleScreenState extends State<SagesseBattleScreen> {
  bool _loading = true;
  String? _error;
  LearningExerciseItem? _challenge;
  String _challengeId = '';
  String _hiddenWord = '';
  String _blankedProverb = '';
  final _answerController = TextEditingController();
  Timer? _ticker;
  bool _submitted = false;
  bool _submitting = false;
  int _score = 0;
  int _xpEarned = 0;
  bool _scoredByAi = false;
  List<Map<String, dynamic>> _chain = const [];
  Map<String, dynamic> _stats = const {'attempts': 0, 'total_xp': 0, 'wins': 0};
  int _participantCount = 0;
  Map<String, dynamic>? _bestResponse;
  bool _communityUnavailable = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _answerController.dispose();
    _ticker?.cancel();
    super.dispose();
  }

  // Choisit un mot à cacher dans le proverbe bariba — de façon
  // déterministe à partir du défi du jour, pour que TOUT le monde
  // reçoive le même trou le même jour (indispensable pour que le
  // classement communautaire ait un sens).
  void _computeBlank(String bariba, String challengeId) {
    final words = bariba.split(RegExp(r'\s+'));
    final candidates = <int>[];
    for (var i = 0; i < words.length; i++) {
      final clean = words[i].replaceAll(RegExp(r'[^\p{L}]', unicode: true), '');
      if (clean.length >= 3) {
        candidates.add(i);
      }
    }
    final pool = candidates.isNotEmpty
        ? candidates
        : List.generate(words.length, (i) => i);
    final seed = challengeId.codeUnits.fold<int>(0, (a, b) => a + b);
    final chosen = pool[seed % pool.length];
    final hidden = words[chosen].replaceAll(
      RegExp(r'[^\p{L}]', unicode: true),
      '',
    );
    final displayWords = List<String>.from(words);
    displayWords[chosen] = '▁▁▁▁▁';
    _hiddenWord = hidden;
    _blankedProverb = displayWords.join(' ');
  }

  String _remainingTime() {
    final now = DateTime.now();
    final endOfDay = DateTime(now.year, now.month, now.day, 23, 59, 59);
    final remaining = endOfDay.difference(now);
    if (remaining.isNegative) {
      return '0h';
    }
    final h = remaining.inHours;
    final m = remaining.inMinutes.remainder(60);
    return h > 0
        ? '${h}h${m > 0 ? m.toString().padLeft(2, '0') : ''}'
        : '${m}min';
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final bank = await FitilaServices.loadLearningBank();
      final proverbs =
          bank.exercises['proverbes'] ?? const <LearningExerciseItem>[];
      if (proverbs.isEmpty) {
        throw StateError('Aucun proverbe disponible.');
      }
      final now = DateTime.now();
      final index = _dayOfYear(now) % proverbs.length;
      final challenge = proverbs[index];
      final challengeId =
          '${now.year}-${now.month.toString().padLeft(2, '0')}-${now.day.toString().padLeft(2, '0')}';
      _computeBlank(challenge.bariba, challengeId);
      if (!mounted) {
        return;
      }
      setState(() {
        _challenge = challenge;
        _challengeId = challengeId;
        _loading = false;
      });
      if (FitilaBackend.configured) {
        try {
          final results = await Future.wait([
            FitilaBackend.fetchBattleChain(challengeId: challengeId),
            FitilaBackend.fetchMyBattleStats(),
            FitilaBackend.fetchBattleChallengeStats(challengeId),
          ]);
          if (!mounted) {
            return;
          }
          final challengeStats = results[2] as Map<String, dynamic>;
          setState(() {
            _chain = results[0] as List<Map<String, dynamic>>;
            _stats = results[1] as Map<String, dynamic>;
            _participantCount =
                (challengeStats['participant_count'] as int?) ?? 0;
            _bestResponse =
                challengeStats['best_response'] as Map<String, dynamic>?;
            _communityUnavailable = false;
          });
        } catch (_) {
          if (mounted) {
            setState(() => _communityUnavailable = true);
          }
        }
      } else {
        setState(() => _communityUnavailable = true);
      }
      // Le proverbe garde le même trou toute la journée : un simple
      // rafraîchissement d'affichage suffit pour faire vivre le compte
      // à rebours réel jusqu'à minuit (_remainingTime()).
      _ticker = Timer.periodic(const Duration(minutes: 1), (_) {
        if (mounted) {
          setState(() {});
        }
      });
    } catch (_) {
      if (!mounted) {
        return;
      }
      setState(() {
        _error = 'Impossible de charger le défi du jour.';
        _loading = false;
      });
    }
  }

  // Score local de secours (mot exact ou variante orthographique très
  // proche) — utilisé UNIQUEMENT si Fitila IA est indisponible, pour
  // que le défi reste jouable hors-ligne. Jamais présenté comme "IA"
  // quand c'est ce chemin qui est pris (voir _scoredByAi dans _submit).
  int _computeFallbackScore(String answer, String hiddenWord) {
    String normalize(String s) => s.toLowerCase().trim();
    final a = normalize(answer);
    final b = normalize(hiddenWord);
    if (a.isEmpty || b.isEmpty) {
      return 0;
    }
    if (a == b) {
      return 100;
    }
    if (a.contains(b) || b.contains(a)) {
      return 70;
    }
    final aChars = a.split('').toSet();
    final bChars = b.split('').toSet();
    final overlap = aChars.intersection(bChars).length;
    final union = aChars.union(bChars).length;
    return union == 0 ? 0 : ((overlap / union) * 60).round();
  }

  // Notation RÉELLE par Fitila IA : le modèle juge si le mot proposé
  // correspond au mot caché, en tolérant les variations orthographiques
  // bariba (tons, diacritiques) qu'une comparaison exacte pénaliserait
  // à tort. En cas d'échec (réseau, edge function indisponible), on
  // retombe sur _computeFallbackScore et on le dit honnêtement dans l'UI.
  Future<int> _scoreWithAi(
    String answer,
    String hiddenWord,
    String fullProverb,
  ) async {
    final prompt =
        'Dans le jeu Sagesse Battle de Fitila, le proverbe bariba est : "$fullProverb". '
        'Le mot caché à deviner est : "$hiddenWord". Un joueur a répondu : "$answer". '
        'Juge si sa réponse correspond au mot caché, en tolérant les variations '
        "orthographiques bariba raisonnables (tons, diacritiques, légère faute de frappe) "
        'mais pas un mot complètement différent. Réponds UNIQUEMENT avec une ligne '
        'exactement au format "SCORE: N" où N est un entier de 0 à 100 (100 = mot exact ou '
        'variante orthographique très proche, 0 = mot sans rapport).';
    final result = await FitilaBackend.askFitilaIa(prompt);
    final match = RegExp(r'SCORE\s*:\s*(\d{1,3})').firstMatch(result);
    if (match == null) {
      throw StateError('Réponse IA invalide.');
    }
    return int.parse(match.group(1)!).clamp(0, 100);
  }

  Future<void> _submit() async {
    final challenge = _challenge;
    if (challenge == null || _submitting || _submitted) {
      return;
    }
    final answer = _answerController.text.trim();
    if (answer.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Proposez une réponse avant de valider.')),
      );
      return;
    }
    setState(() => _submitting = true);
    _ticker?.cancel();
    int score;
    bool scoredByAi;
    try {
      score = await _scoreWithAi(answer, _hiddenWord, challenge.bariba);
      scoredByAi = true;
    } catch (_) {
      score = _computeFallbackScore(answer, _hiddenWord);
      scoredByAi = false;
    }
    final fallbackXp = 10 + (score / 100 * 40).round();
    var responseSynced = false;
    var result = <String, dynamic>{'xpEarned': fallbackXp};
    if (FitilaBackend.configured) {
      try {
        await FitilaBackend.submitBattleResponse(
          challengeId: _challengeId,
          promptBariba: challenge.bariba,
          promptFrancais: challenge.french,
          answerText: answer,
          score: score,
          xpAwarded: fallbackXp,
        );
        responseSynced = true;
      } catch (_) {
        // Le défi reste jouable localement si la migration communautaire
        // n'est pas encore déployée ou si le réseau est indisponible.
      }
      try {
        result = await FitilaBackend.recordLearningSession(
          sessionType: 'battle',
          themeKey: 'proverbes',
          direction: 'bariba_to_fr',
          correctCount: score >= 60 ? 1 : 0,
          totalCount: 1,
        );
      } catch (_) {
        // Le score et l'XP calculé restent affichés localement.
      }
    }
    if (!mounted) {
      return;
    }
    setState(() {
      _submitted = true;
      _score = score;
      _scoredByAi = scoredByAi;
      _xpEarned = (result['xpEarned'] as num?)?.toInt() ?? fallbackXp;
      _communityUnavailable = !responseSynced;
    });
    if (!responseSynced) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text(
            'Score calculé sur cet appareil. La synchronisation communautaire est indisponible.',
          ),
        ),
      );
    }
    if (responseSynced) {
      try {
        final results = await Future.wait([
          FitilaBackend.fetchBattleChain(challengeId: _challengeId),
          FitilaBackend.fetchMyBattleStats(),
          FitilaBackend.fetchBattleChallengeStats(_challengeId),
        ]);
        if (mounted) {
          final challengeStats = results[2] as Map<String, dynamic>;
          setState(() {
            _chain = results[0] as List<Map<String, dynamic>>;
            _stats = results[1] as Map<String, dynamic>;
            _participantCount =
                (challengeStats['participant_count'] as int?) ?? 0;
            _bestResponse =
                challengeStats['best_response'] as Map<String, dynamic>?;
            _communityUnavailable = false;
          });
        }
      } catch (_) {
        if (mounted) {
          setState(() => _communityUnavailable = true);
        }
      }
    }
    final unlocked = (result['unlockedBadges'] as List?) ?? const [];
    if (unlocked.isNotEmpty && mounted) {
      final badge = unlocked.first as Map;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Badge débloqué : ${badge['name'] ?? badge['id']} !'),
        ),
      );
    }
    if (mounted) {
      setState(() => _submitting = false);
    }
  }

  Future<void> _toggleVote(Map<String, dynamic> response) async {
    final id = response['id'] as String;
    final voted = response['voted_by_me'] == true;
    setState(() {
      response['voted_by_me'] = !voted;
      response['vote_count'] =
          ((response['vote_count'] as int?) ?? 0) + (voted ? -1 : 1);
    });
    try {
      await FitilaBackend.toggleBattleResponseVote(
        responseId: id,
        like: !voted,
      );
    } catch (_) {
      if (!mounted) {
        return;
      }
      setState(() {
        response['voted_by_me'] = voted;
        response['vote_count'] =
            ((response['vote_count'] as int?) ?? 0) + (voted ? 1 : -1);
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final challenge = _challenge;
    final participantLabel = _participantCount == 0
        ? 'Aucun participant pour le moment'
        : '$_participantCount participants';
    return ReferenceCreationShell(
      dark: false,
      title: 'Défi du jour',
      subtitle: participantLabel,
      leading: const Text('🔥', style: TextStyle(fontSize: 15)),
      child: _loading
          ? const Center(
              child: CircularProgressIndicator(
                color: FitilaReferenceUi.gold,
              ),
            )
          : _error != null
              ? Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        _error!,
                        textAlign: TextAlign.center,
                        style: const TextStyle(color: FitilaReferenceUi.inkSoft),
                      ),
                      const SizedBox(height: 12),
                      ReferenceGoldButton(
                        label: 'Réessayer',
                        icon: Icons.refresh_rounded,
                        onPressed: _load,
                      ),
                    ],
                  ),
                )
              : ListView(
                  padding: EdgeInsets.zero,
                  children: [
                    Container(
                      padding: const EdgeInsets.all(18),
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(16),
                        gradient: const LinearGradient(
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                          colors: [
                            FitilaReferenceUi.clayTint,
                            FitilaReferenceUi.surface,
                          ],
                        ),
                        border: Border.all(color: FitilaReferenceUi.clay),
                      ),
                      child: Column(
                        children: [
                          const Text(
                            'COMPLÈTE LE PROVERBE',
                            style: TextStyle(
                              color: Color(0xFF7A3018),
                              fontSize: 10,
                              fontWeight: FontWeight.w800,
                              letterSpacing: .6,
                            ),
                          ),
                          const SizedBox(height: 10),
                          if (challenge != null)
                            _buildReferenceProverb(
                              _submitted ? challenge.bariba : _blankedProverb,
                            ),
                          if (challenge?.context?.isNotEmpty == true) ...[
                            const SizedBox(height: 5),
                            Text(
                              challenge!.context!,
                              textAlign: TextAlign.center,
                              style: const TextStyle(
                                color: FitilaReferenceUi.inkSoft,
                                fontSize: 11,
                                fontStyle: FontStyle.italic,
                              ),
                            ),
                          ],
                          const SizedBox(height: 10),
                          ReferenceCountdownRing(
                            label: _remainingTime(),
                            progress: .76,
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 12),
                    if (!_submitted) ...[
                      if (_bestResponse != null)
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 11,
                            vertical: 9,
                          ),
                          decoration: BoxDecoration(
                            color: FitilaReferenceUi.surfaceAlt,
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Row(
                            children: [
                              const Text('🏆', style: TextStyle(fontSize: 15)),
                              const SizedBox(width: 8),
                              Expanded(
                                child: Text(
                                  'Meilleure réponse actuelle : ' +
                                      (_bestResponse!['display_name']?.toString() ??
                                          'Griot Fitila') +
                                      ' — ' +
                                      (_bestResponse!['score'] ?? 0).toString() +
                                      '%',
                                  style: const TextStyle(
                                    color: FitilaReferenceUi.inkSoft,
                                    fontSize: 11,
                                    fontWeight: FontWeight.w700,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      if (_bestResponse != null) const SizedBox(height: 10),
                      Container(
                        padding: const EdgeInsets.fromLTRB(16, 18, 16, 16),
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(16),
                          gradient: FitilaReferenceUi.darkGradient,
                        ),
                        child: Column(
                          children: [
                            const ReferenceMicOrb(
                              icon: Icons.videocam_rounded,
                              size: 78,
                              ringExtent: 120,
                            ),
                            const SizedBox(height: 8),
                            const Text(
                              'Enregistre ta réponse',
                              style: TextStyle(
                                color: Color(0xC7FFFFFF),
                                fontSize: 12.5,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                            const SizedBox(height: 12),
                            TextField(
                              controller: _answerController,
                              style: const TextStyle(color: Colors.white),
                              textAlign: TextAlign.center,
                              decoration: const InputDecoration(
                                hintText: 'Le mot manquant…',
                              ),
                            ),
                            const SizedBox(height: 12),
                            ReferenceGoldButton(
                              label: _submitting
                                  ? 'Fitila IA note votre réponse…'
                                  : 'Valider ma réponse',
                              busy: _submitting,
                              onPressed: _submitting ? null : _submit,
                            ),
                          ],
                        ),
                      ),
                    ] else ...[
                      Container(
                        padding: const EdgeInsets.fromLTRB(18, 20, 18, 18),
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(16),
                          gradient: FitilaReferenceUi.darkGradient,
                        ),
                        child: Column(
                          children: [
                            ReferenceScoreRing(score: _score),
                            const SizedBox(height: 16),
                            ReferenceCard(
                              dark: true,
                              margin: EdgeInsets.zero,
                              child: Text(
                                challenge == null
                                    ? ''
                                    : '"' + challenge.bariba + '"',
                                textAlign: TextAlign.center,
                                style: FitilaReferenceUi.serif(
                                  size: 15,
                                  color: Colors.white,
                                  height: 1.5,
                                ),
                              ),
                            ),
                            const SizedBox(height: 12),
                            Container(
                              width: double.infinity,
                              padding: const EdgeInsets.symmetric(
                                horizontal: 12,
                                vertical: 11,
                              ),
                              decoration: BoxDecoration(
                                gradient: const LinearGradient(
                                  colors: [
                                    FitilaReferenceUi.goldTint,
                                    Colors.white,
                                  ],
                                ),
                                borderRadius: BorderRadius.circular(14),
                                border: Border.all(
                                  color: FitilaReferenceUi.gold,
                                ),
                              ),
                              child: Row(
                                children: [
                                  Container(
                                    width: 36,
                                    height: 36,
                                    alignment: Alignment.center,
                                    decoration: const BoxDecoration(
                                      color: FitilaReferenceUi.gold,
                                      shape: BoxShape.circle,
                                    ),
                                    child: const Text(
                                      '🏅',
                                      style: TextStyle(fontSize: 16),
                                    ),
                                  ),
                                  const SizedBox(width: 10),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: [
                                        const Text(
                                          'Badge "Sage en herbe" débloqué',
                                          style: TextStyle(
                                            color: FitilaReferenceUi.ink,
                                            fontSize: 12,
                                            fontWeight: FontWeight.w800,
                                          ),
                                        ),
                                        Text(
                                          '+$_xpEarned XP',
                                          style: const TextStyle(
                                            color: FitilaReferenceUi.muted,
                                            fontSize: 10.5,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            const SizedBox(height: 9),
                            Text(
                              _scoredByAi
                                  ? 'Noté par Fitila IA'
                                  : 'Score calculé hors ligne',
                              style: TextStyle(
                                color: Colors.white.withValues(alpha: .48),
                                fontSize: 10,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                    const SizedBox(height: 18),
                    Row(
                      children: [
                        const Expanded(
                          child: Text(
                            'Chaîne du jour',
                            style: TextStyle(
                              color: FitilaReferenceUi.ink,
                              fontSize: 15,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                        ),
                        Text(
                          _chain.length.toString() + ' réponses',
                          style: const TextStyle(
                            color: FitilaReferenceUi.muted,
                            fontSize: 10.5,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    if (_communityUnavailable)
                      ReferenceCard(
                        color: FitilaReferenceUi.surfaceAlt,
                        child: const Row(
                          children: [
                            Icon(
                              Icons.cloud_off_rounded,
                              color: FitilaReferenceUi.muted,
                              size: 18,
                            ),
                            SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                'La chaîne communautaire est temporairement indisponible. Le défi reste jouable.',
                                style: TextStyle(
                                  color: FitilaReferenceUi.muted,
                                  fontSize: 11,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    if (_chain.isEmpty && !_communityUnavailable)
                      ReferenceCard(
                        child: const Text(
                          "Personne n'a encore répondu aujourd'hui — soyez le premier !",
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            color: FitilaReferenceUi.muted,
                            fontSize: 11.5,
                          ),
                        ),
                      ),
                    for (final entry in _chain)
                      _buildReferenceChainEntry(entry),
                    const SizedBox(height: 22),
                  ],
                ),
    );
  }

  Widget _buildReferenceProverb(String proverb) {
    const blank = '▁▁▁▁▁';
    final index = proverb.indexOf(blank);
    if (index < 0) {
      return Text(
        '"$proverb"',
        textAlign: TextAlign.center,
        style: FitilaReferenceUi.serif(
          size: 17,
          color: FitilaReferenceUi.ink,
          height: 1.55,
        ),
      );
    }
    return Text.rich(
      TextSpan(
        children: [
          TextSpan(text: '"' + proverb.substring(0, index)),
          const WidgetSpan(
            alignment: PlaceholderAlignment.middle,
            child: DecoratedBox(
              decoration: BoxDecoration(
                color: FitilaReferenceUi.clay,
                borderRadius: BorderRadius.all(Radius.circular(6)),
              ),
              child: Padding(
                padding: EdgeInsets.symmetric(horizontal: 10, vertical: 2),
                child: Text(
                  '?????',
                  style: TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ),
            ),
          ),
          TextSpan(text: proverb.substring(index + blank.length) + '"'),
        ],
      ),
      textAlign: TextAlign.center,
      style: FitilaReferenceUi.serif(
        size: 17,
        color: FitilaReferenceUi.ink,
        height: 1.55,
      ),
    );
  }

  Widget _buildReferenceChainEntry(Map<String, dynamic> entry) {
    final voted = entry['voted_by_me'] == true;
    return Container(
      margin: const EdgeInsets.only(bottom: 9),
      padding: const EdgeInsets.symmetric(horizontal: 11, vertical: 10),
      decoration: BoxDecoration(
        color: FitilaReferenceUi.surface,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: FitilaReferenceUi.hairline),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          CircleAvatar(
            radius: 16,
            backgroundColor: FitilaReferenceUi.sageTint,
            child: Text(
              _initialLetter(entry['display_name']?.toString()),
              style: const TextStyle(
                color: FitilaReferenceUi.sageDeep,
                fontSize: 11,
                fontWeight: FontWeight.w800,
              ),
            ),
          ),
          const SizedBox(width: 9),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  entry['display_name']?.toString() ?? 'Griot Fitila',
                  style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  (entry['score'] ?? 0).toString() + '% de justesse',
                  style: const TextStyle(
                    color: FitilaReferenceUi.sageDeep,
                    fontSize: 10.5,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                if ((entry['answer_text']?.toString() ?? '').isNotEmpty)
                  Text(
                    entry['answer_text'].toString(),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      color: FitilaReferenceUi.inkSoft,
                      fontSize: 10.5,
                    ),
                  ),
              ],
            ),
          ),
          InkWell(
            onTap: () => _toggleVote(entry),
            borderRadius: BorderRadius.circular(10),
            child: Padding(
              padding: const EdgeInsets.all(6),
              child: Text(
                '♥ ' + (entry['vote_count'] ?? 0).toString(),
                style: TextStyle(
                  color: voted
                      ? FitilaReferenceUi.clay
                      : FitilaReferenceUi.muted,
                  fontSize: 11,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

}

// ─────────────────────────────────────────────────────────────────
// 4. Aburu Fim IA — template connecté aux vrais produits du Marché
// ─────────────────────────────────────────────────────────────────
class _AburuTemplate {
  const _AburuTemplate(
    this.id,
    this.label,
    this.colorA,
    this.colorB,
    this.captionSuffix,
  );
  final String id;
  final String label;
  final Color colorA;
  final Color colorB;
  final String captionSuffix;
}

class AburuFimScreen extends StatefulWidget {
  const AburuFimScreen({super.key, required this.onPostCreated});

  final ValueChanged<FeedPost> onPostCreated;

  @override
  State<AburuFimScreen> createState() => _AburuFimScreenState();
}

class _AburuFimScreenState extends State<AburuFimScreen> {
  final _mediaController = FitilaMediaController();
  bool _loadingProducts = true;
  List<Map<String, dynamic>> _products = const [];
  Map<String, dynamic>? _selectedProduct;
  final _manualName = TextEditingController();
  final _manualPrice = TextEditingController();
  int _templateIndex = 0;
  // "Vidéo (un seul plan)" est le mode par défaut — c'est le geste
  // décrit par la maquette ("aucune consigne de montage : un plan de
  // quelques secondes suffit"). La photo reste possible pour les cas
  // où une vidéo n'a pas de sens (petite annonce statique).
  String _captureMode = 'video';
  FitilaMediaAsset? _photo;
  VideoPlayerController? _previewVideoController;
  bool _publishing = false;
  int _aburuUiStep = 0;

  static const _templates = [
    _AburuTemplate(
      'flash',
      'Vente flash',
      Color(0xFFDC2626),
      Color(0xFF9C1C1C),
      '🔥 Offre du jour, ne ratez pas ça !',
    ),
    _AburuTemplate(
      'nouveau',
      'Nouveauté',
      Color(0xFFC99530),
      Color(0xFF9C6B1D),
      '✨ Tout juste arrivé au marché.',
    ),
    _AburuTemplate(
      'artisanal',
      'Artisanal',
      Color(0xFFB54E33),
      Color(0xFF8C3D28),
      '🧺 Fait main, qualité garantie.',
    ),
    _AburuTemplate(
      'fraicheur',
      'Fraîcheur',
      Color(0xFF3F6E52),
      Color(0xFF2C4E3A),
      '🌿 Produit frais du jour.',
    ),
    _AburuTemplate(
      'premium',
      'Premium',
      Color(0xFF241F2E),
      Color(0xFF4A3B96),
      '💎 Sélection premium Fitila.',
    ),
    _AburuTemplate(
      'promo',
      'Petit prix',
      Color(0xFF0F766E),
      Color(0xFF115E59),
      '💰 Le meilleur prix du marché.',
    ),
  ];

  @override
  void initState() {
    super.initState();
    _loadProducts();
  }

  @override
  void dispose() {
    _manualName.dispose();
    _manualPrice.dispose();
    _mediaController.dispose();
    _previewVideoController?.dispose();
    super.dispose();
  }

  Future<void> _loadProducts() async {
    try {
      final products = await FitilaBackend.fetchMyProducts();
      if (!mounted) {
        return;
      }
      setState(() {
        _products = products;
        _selectedProduct = products.isNotEmpty ? products.first : null;
        _loadingProducts = false;
      });
    } catch (_) {
      if (!mounted) {
        return;
      }
      setState(() => _loadingProducts = false);
    }
  }

  Future<void> _pickCapture(ImageSource source) async {
    try {
      final asset = _captureMode == 'video'
          ? await _mediaController.pickVideo(source)
          : await _mediaController.pickImage(source);
      if (asset == null || !mounted) {
        return;
      }
      _previewVideoController?.dispose();
      _previewVideoController = null;
      if (asset.mediaType == 'video') {
        final controller = VideoPlayerController.file(File(asset.path));
        await controller.initialize();
        await controller.setLooping(true);
        await controller.setVolume(0);
        await controller.play();
        if (!mounted) {
          controller.dispose();
          return;
        }
        _previewVideoController = controller;
      }
      setState(() => _photo = asset);
    } catch (_) {
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            _captureMode == 'video'
                ? 'Impossible de charger la vidéo.'
                : 'Impossible de charger la photo.',
          ),
        ),
      );
    }
  }

  String get _productName => _selectedProduct != null
      ? (_selectedProduct!['title_fr'] ??
                _selectedProduct!['title'] ??
                'Produit')
            .toString()
      : (_manualName.text.trim().isEmpty
            ? 'Mon produit'
            : _manualName.text.trim());

  String get _productPrice => _selectedProduct != null
      ? (_selectedProduct!['price'] != null
            ? '${_selectedProduct!['price']} FCFA'
            : '')
      : (_manualPrice.text.trim().isEmpty
            ? ''
            : '${_manualPrice.text.trim()} FCFA');

  // Étiquette de destination réelle : dérivée de la catégorie du produit
  // sélectionné (jamais un texte fabriqué) — "Fil" seul pour une info libre.
  String get _publishDestinationTag {
    final category = _selectedProduct?['category']?.toString();
    return category != null && category.isNotEmpty ? 'Fil → Marché' : 'Fil';
  }

  // Langues réellement renseignées sur le produit (title_fr / title_ba) —
  // jamais une case cochée par défaut sans donnée derrière.
  String get _productLanguages {
    final hasBariba =
        (_selectedProduct?['title_ba']?.toString().trim().isNotEmpty) == true;
    return hasBariba ? 'FR + Bàátɔ̀nú' : 'FR';
  }

  String get _productStockLabel {
    switch (_selectedProduct?['status']?.toString()) {
      case 'sold':
        return 'Épuisé';
      case 'reserved':
        return 'Réservé';
      case 'available':
        return 'En stock';
      default:
        return 'Info libre';
    }
  }

  Future<void> _publish() async {
    if (_photo == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            _captureMode == 'video'
                ? 'Filmez un plan du produit.'
                : 'Ajoutez une photo du produit.',
          ),
        ),
      );
      return;
    }
    if (_photo!.mediaType == 'video') {
      const maxVideoBytes = 50 * 1024 * 1024;
      final videoBytes = await _photo!.sizeBytes();
      if (videoBytes > maxVideoBytes) {
        if (!mounted) {
          return;
        }
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text(
              'La vidéo dépasse 50 Mo. Raccourcissez-la avant publication.',
            ),
          ),
        );
        return;
      }
    }
    final template = _templates[_templateIndex];
    final price = _productPrice;
    final caption = [
      template.captionSuffix,
      price.isNotEmpty ? '$_productName — $price' : _productName,
    ].join('\n');
    setState(() => _publishing = true);
    try {
      final category = _selectedProduct?['category']?.toString();
      final row = await FitilaBackend.createMediaPost(
        bytes: await _photo!.readBytes(),
        originalName: _photo!.name,
        contentType: _photo!.contentType,
        mediaType: _photo!.mediaType,
        text: caption,
        hashtags: [
          'aburu-fim',
          template.id,
          if (category != null && category.isNotEmpty) category,
        ],
        templateId: 'aburu-fim-${template.id}',
        productId: _selectedProduct?['id']?.toString(),
      );
      if (!mounted) {
        return;
      }
      widget.onPostCreated(FeedPost.fromBackend(row));
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            'Publication automatique envoyée — $_publishDestinationTag.',
          ),
          action: SnackBarAction(
            label: 'Rendre bilingue',
            onPressed: () => Navigator.push(
              context,
              MaterialPageRoute(
                builder: (_) => SasaraIaScreen(
                  onPostCreated: widget.onPostCreated,
                  initialText: caption,
                ),
              ),
            ),
          ),
        ),
      );
      _previewVideoController?.dispose();
      _previewVideoController = null;
      setState(() => _photo = null);
    } catch (_) {
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Publication impossible. Réessayez.')),
      );
    } finally {
      if (mounted) {
        setState(() => _publishing = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loadingProducts) {
      return const ReferenceCreationShell(
        title: 'Modèles intelligents',
        subtitle: 'Connectés à tes données',
        leading: Text('🛍️', style: TextStyle(fontSize: 15)),
        child: Center(
          child: CircularProgressIndicator(color: FitilaReferenceUi.gold),
        ),
      );
    }

    switch (_aburuUiStep) {
      case 1:
        return _buildAburuCaptureReference();
      case 2:
        return _buildAburuPersonalizationReference();
      case 3:
        return _buildAburuSuccessReference();
      case 0:
      default:
        return _buildAburuTemplatesReference();
    }
  }

  Widget _buildAburuTemplatesReference() {
    final productPreview = _selectedProduct == null
        ? (_manualName.text.trim().isEmpty ? 'Info libre' : _manualName.text.trim())
        : _productName;
    final pricePreview = _productPrice.isEmpty ? 'Prix non renseigné' : _productPrice;
    final cards = <({String emoji, String title, String data})>[
      (emoji: '🍅', title: 'Nouveau produit', data: '$productPreview · $pricePreview'),
      (emoji: '⚡', title: 'Promo du jour', data: pricePreview),
      (
        emoji: '🌦️',
        title: 'Conseil agricole',
        data: _selectedProduct?['category']?.toString() ?? 'Données du produit',
      ),
      (
        emoji: '🩺',
        title: 'Alerte santé',
        data: _productStockLabel,
      ),
    ];

    return ReferenceCreationShell(
      dark: false,
      title: 'Modèles intelligents',
      subtitle: 'Connectés à tes données',
      leading: const Text('🛍️', style: TextStyle(fontSize: 15)),
      child: ListView(
        padding: EdgeInsets.zero,
        children: [
          if (_products.isNotEmpty) ...[
            const ReferenceLabel('Produit source'),
            const SizedBox(height: 7),
            SizedBox(
              height: 40,
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                itemCount: _products.length + 1,
                separatorBuilder: (_, _) => const SizedBox(width: 7),
                itemBuilder: (context, index) {
                  if (index == _products.length) {
                    final selected = _selectedProduct == null;
                    return ChoiceChip(
                      label: const Text('Info libre'),
                      selected: selected,
                      onSelected: (_) => setState(() => _selectedProduct = null),
                    );
                  }
                  final product = _products[index];
                  final selected = identical(product, _selectedProduct);
                  return ChoiceChip(
                    label: Text(
                      (product['title_fr'] ?? product['title'] ?? 'Produit')
                          .toString(),
                    ),
                    selected: selected,
                    onSelected: (_) => setState(() => _selectedProduct = product),
                  );
                },
              ),
            ),
            const SizedBox(height: 12),
          ],
          if (_selectedProduct == null) ...[
            ReferenceCard(
              child: Column(
                children: [
                  TextField(
                    controller: _manualName,
                    onChanged: (_) => setState(() {}),
                    decoration: const InputDecoration(
                      labelText: 'Nom du produit',
                    ),
                  ),
                  const SizedBox(height: 8),
                  TextField(
                    controller: _manualPrice,
                    keyboardType: TextInputType.number,
                    onChanged: (_) => setState(() {}),
                    decoration: const InputDecoration(
                      labelText: 'Prix (FCFA)',
                    ),
                  ),
                ],
              ),
            ),
          ],
          GridView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 2,
              mainAxisSpacing: 10,
              crossAxisSpacing: 10,
              childAspectRatio: 1.08,
            ),
            itemCount: cards.length,
            itemBuilder: (context, index) {
              final card = cards[index];
              final selected = _templateIndex == index;
              return Material(
                color: selected
                    ? FitilaReferenceUi.goldTint
                    : FitilaReferenceUi.surface,
                borderRadius: BorderRadius.circular(14),
                child: InkWell(
                  onTap: () => setState(() => _templateIndex = index),
                  borderRadius: BorderRadius.circular(14),
                  child: Container(
                    padding: const EdgeInsets.all(11),
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(
                        color: selected
                            ? FitilaReferenceUi.gold
                            : FitilaReferenceUi.hairline,
                      ),
                    ),
                    child: Stack(
                      children: [
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(card.emoji, style: const TextStyle(fontSize: 20)),
                            const Spacer(),
                            Text(
                              card.title,
                              style: const TextStyle(
                                color: FitilaReferenceUi.ink,
                                fontSize: 12,
                                fontWeight: FontWeight.w800,
                              ),
                            ),
                            const SizedBox(height: 5),
                            Text(
                              card.data,
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(
                                color: FitilaReferenceUi.muted,
                                fontSize: 10.5,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                          ],
                        ),
                        Positioned(
                          top: 0,
                          right: 0,
                          child: Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 7,
                              vertical: 3,
                            ),
                            decoration: BoxDecoration(
                              color: FitilaReferenceUi.sageTint,
                              borderRadius: BorderRadius.circular(999),
                            ),
                            child: const Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(
                                  Icons.circle,
                                  size: 5,
                                  color: FitilaReferenceUi.sageDeep,
                                ),
                                SizedBox(width: 4),
                                Text(
                                  'Live',
                                  style: TextStyle(
                                    color: FitilaReferenceUi.sageDeep,
                                    fontSize: 9,
                                    fontWeight: FontWeight.w800,
                                  ),
                                ),
                              ],
                            ),
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
          ReferenceGoldButton(
            label: 'Filmer un seul plan',
            icon: Icons.videocam_rounded,
            onPressed: () => setState(() => _aburuUiStep = 1),
          ),
        ],
      ),
    );
  }

  Widget _buildAburuCaptureReference() {
    return ReferenceCreationShell(
      dark: true,
      title: 'Nouveau produit',
      subtitle: 'Un seul plan suffit',
      leading: const Icon(Icons.close_rounded, size: 17, color: Colors.white),
      onBack: () => setState(() => _aburuUiStep = 0),
      child: Column(
        children: [
          Expanded(
            child: Container(
              width: double.infinity,
              margin: const EdgeInsets.only(bottom: 14),
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(16),
                border: Border.all(
                  color: Colors.white.withValues(alpha: .30),
                  width: 2,
                ),
              ),
              clipBehavior: Clip.antiAlias,
              child: Stack(
                fit: StackFit.expand,
                children: [
                  if (_photo != null)
                    _aburuMediaPreview()
                  else
                    Center(
                      child: Text(
                        'Cadre ton étal\nou ton produit',
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          color: Colors.white.withValues(alpha: .50),
                          fontSize: 12,
                          height: 1.4,
                        ),
                      ),
                    ),
                  ..._aburuViewfinderCorners(),
                ],
              ),
            ),
          ),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              IconButton(
                tooltip: 'Galerie',
                onPressed: () => _pickCapture(ImageSource.gallery),
                icon: const Icon(
                  Icons.photo_library_rounded,
                  color: Colors.white70,
                ),
              ),
              const SizedBox(width: 18),
              GestureDetector(
                onTap: () => _pickCapture(ImageSource.camera),
                child: Container(
                  width: 64,
                  height: 64,
                  decoration: BoxDecoration(
                    color: Colors.white,
                    shape: BoxShape.circle,
                    border: Border.all(
                      color: Colors.white.withValues(alpha: .35),
                      width: 4,
                    ),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.white.withValues(alpha: .18),
                        blurRadius: 18,
                      ),
                    ],
                  ),
                  child: Icon(
                    _captureMode == 'video'
                        ? Icons.videocam_rounded
                        : Icons.photo_camera_rounded,
                    color: FitilaReferenceUi.ink,
                  ),
                ),
              ),
              const SizedBox(width: 18),
              IconButton(
                tooltip: _captureMode == 'video' ? 'Passer en photo' : 'Passer en vidéo',
                onPressed: () => setState(
                  () => _captureMode =
                      _captureMode == 'video' ? 'photo' : 'video',
                ),
                icon: Icon(
                  _captureMode == 'video'
                      ? Icons.photo_camera_rounded
                      : Icons.videocam_rounded,
                  color: Colors.white70,
                ),
              ),
            ],
          ),
          if (_photo != null) ...[
            const SizedBox(height: 12),
            ReferenceGoldButton(
              label: 'Personnaliser avec l’IA',
              icon: Icons.auto_awesome_rounded,
              onPressed: () => setState(() => _aburuUiStep = 2),
            ),
          ],
        ],
      ),
    );
  }

  List<Widget> _aburuViewfinderCorners() {
    Widget corner(Alignment alignment, Border border) => Align(
          alignment: alignment,
          child: Container(
            width: 24,
            height: 24,
            decoration: BoxDecoration(border: border),
          ),
        );
    const c = FitilaReferenceUi.gold;
    return [
      corner(
        Alignment.topLeft,
        const Border(
          top: BorderSide(color: c, width: 3),
          left: BorderSide(color: c, width: 3),
        ),
      ),
      corner(
        Alignment.topRight,
        const Border(
          top: BorderSide(color: c, width: 3),
          right: BorderSide(color: c, width: 3),
        ),
      ),
      corner(
        Alignment.bottomLeft,
        const Border(
          bottom: BorderSide(color: c, width: 3),
          left: BorderSide(color: c, width: 3),
        ),
      ),
      corner(
        Alignment.bottomRight,
        const Border(
          bottom: BorderSide(color: c, width: 3),
          right: BorderSide(color: c, width: 3),
        ),
      ),
    ];
  }

  Widget _aburuMediaPreview() {
    final asset = _photo;
    if (asset == null) {
      return const ColoredBox(color: Colors.transparent);
    }
    if (asset.mediaType == 'video') {
      final controller = _previewVideoController;
      if (controller != null && controller.value.isInitialized) {
        return FittedBox(
          fit: BoxFit.cover,
          child: SizedBox(
            width: controller.value.size.width,
            height: controller.value.size.height,
            child: VideoPlayer(controller),
          ),
        );
      }
      return const ColoredBox(
        color: Colors.black,
        child: Center(
          child: Icon(Icons.videocam_rounded, color: Colors.white54, size: 42),
        ),
      );
    }
    return Image.file(File(asset.path), fit: BoxFit.cover);
  }

  Widget _buildAburuPersonalizationReference() {
    final template = _templates[_templateIndex];
    return ReferenceCreationShell(
      dark: false,
      title: 'Personnalisation IA',
      subtitle: 'Brut → prêt à publier',
      onBack: () => setState(() => _aburuUiStep = 1),
      child: ListView(
        padding: EdgeInsets.zero,
        children: [
          SizedBox(
            height: 300,
            child: Row(
              children: [
                Expanded(
                  child: _buildAburuComparePane(
                    label: 'Brut',
                    child: _aburuMediaPreview(),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: _buildAburuComparePane(
                    label: 'Personnalisé',
                    child: Stack(
                      fit: StackFit.expand,
                      children: [
                        _aburuMediaPreview(),
                        DecoratedBox(
                          decoration: BoxDecoration(
                            gradient: LinearGradient(
                              begin: Alignment.topCenter,
                              end: Alignment.bottomCenter,
                              colors: [
                                Colors.transparent,
                                template.colorA.withValues(alpha: .74),
                              ],
                            ),
                          ),
                        ),
                        Positioned(
                          top: 34,
                          left: 8,
                          child: _aburuDropTag(
                            _productPrice.isEmpty ? 'Prix libre' : _productPrice,
                          ),
                        ),
                        const Positioned(
                          top: 8,
                          right: 8,
                          child: _AburuReferenceTag(text: 'FITILA'),
                        ),
                        Positioned(
                          left: 8,
                          right: 8,
                          bottom: 34,
                          child: _aburuDropTag(_productName),
                        ),
                        const Positioned(
                          right: 8,
                          bottom: 8,
                          child: _AburuReferenceTag(text: '🎵'),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),
          _aburuFieldRow('Prix', _productPrice.isEmpty ? 'Prix libre' : _productPrice),
          _aburuFieldRow('Stock', _productStockLabel),
          _aburuFieldRow('Langues', _productLanguages),
          const SizedBox(height: 16),
          ReferenceGoldButton(
            label: 'Publier automatiquement',
            icon: Icons.storefront_rounded,
            busy: _publishing,
            onPressed: _publishing
                ? null
                : () async {
                    await _publish();
                    if (mounted && _photo == null) {
                      setState(() => _aburuUiStep = 3);
                    }
                  },
          ),
        ],
      ),
    );
  }

  Widget _buildAburuComparePane({
    required String label,
    required Widget child,
  }) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(12),
      child: Stack(
        fit: StackFit.expand,
        children: [
          const DecoratedBox(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [Color(0xFF2C2440), Color(0xFF3F345A)],
              ),
            ),
          ),
          child,
          Positioned(
            top: 6,
            left: 6,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
              decoration: BoxDecoration(
                color: Colors.black.withValues(alpha: .50),
                borderRadius: BorderRadius.circular(6),
              ),
              child: Text(
                label,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 9,
                  fontWeight: FontWeight.w800,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _aburuDropTag(String text) {
    return _AburuReferenceTag(text: text);
  }

  Widget _aburuFieldRow(String key, String value) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 9),
      decoration: const BoxDecoration(
        border: Border(
          bottom: BorderSide(color: FitilaReferenceUi.hairline),
        ),
      ),
      child: Row(
        children: [
          Expanded(
            child: Text(
              key,
              style: const TextStyle(
                color: FitilaReferenceUi.muted,
                fontSize: 12,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
          Text(
            value,
            textAlign: TextAlign.right,
            style: const TextStyle(
              color: FitilaReferenceUi.ink,
              fontSize: 12,
              fontWeight: FontWeight.w800,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildAburuSuccessReference() {
    return ReferenceCreationShell(
      dark: false,
      showTopBar: false,
      centerBody: true,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const ReferenceCheckMark(),
          const SizedBox(height: 12),
          Text(
            'Publié automatiquement',
            textAlign: TextAlign.center,
            style: FitilaReferenceUi.serif(
              size: 18,
              color: FitilaReferenceUi.ink,
            ),
          ),
          const SizedBox(height: 16),
          const ReferenceTinyPill(
            icon: Icons.schedule_rounded,
            label: 'Publication immédiate',
          ),
          const SizedBox(height: 8),
          ReferenceTinyPill(
            icon: Icons.storefront_rounded,
            label: _publishDestinationTag,
            color: FitilaReferenceUi.sageDeep,
          ),
          const SizedBox(height: 22),
          TextButton(
            onPressed: () => setState(() => _aburuUiStep = 0),
            child: const Text('Créer un autre Fim'),
          ),
        ],
      ),
    );
  }
}

class _AburuReferenceTag extends StatelessWidget {
  const _AburuReferenceTag({required this.text});

  final String text;

  @override
  Widget build(BuildContext context) {
    return Container(
      constraints: const BoxConstraints(maxWidth: 130),
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(8),
        boxShadow: const [
          BoxShadow(
            color: Color(0x33000000),
            blurRadius: 14,
            spreadRadius: -6,
            offset: Offset(0, 6),
          ),
        ],
      ),
      child: Text(
        text,
        maxLines: 2,
        overflow: TextOverflow.ellipsis,
        style: const TextStyle(
          color: FitilaReferenceUi.ink,
          fontSize: 9,
          fontWeight: FontWeight.w800,
        ),
      ),
    );
  }

}

/// Carte de la galerie Aburu Fim IA — tuile "Live" liée à un vrai
/// produit du Marché (ou tuile "Info libre" sans donnée derrière).
class _AburuGalleryCard extends StatelessWidget {
  const _AburuGalleryCard({
    required this.selected,
    required this.live,
    required this.title,
    required this.subtitle,
    required this.onTap,
  });

  final bool selected;
  final bool live;
  final String title;
  final String subtitle;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(10),
        decoration: BoxDecoration(
          color: selected ? _fitilaPrimarySoft : _fitilaSurfaceAlt,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
            color: selected ? _fitilaPrimary : _fitilaBorder,
            width: selected ? 1.5 : 1,
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            if (live)
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(
                  color: _fitilaClay,
                  borderRadius: BorderRadius.circular(6),
                ),
                child: const Text(
                  '● Live',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 9,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ),
            const SizedBox(height: 6),
            Text(
              title,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(
                fontWeight: FontWeight.w800,
                fontSize: 12.5,
              ),
            ),
            const SizedBox(height: 2),
            Text(
              subtitle,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(color: _fitilaMuted, fontSize: 11),
            ),
          ],
        ),
      ),
    );
  }
}

class _AburuInfoChip extends StatelessWidget {
  const _AburuInfoChip({required this.icon, required this.label});

  final IconData icon;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 5),
      decoration: BoxDecoration(
        color: _fitilaSurfaceAlt,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 13, color: _fitilaMuted),
          const SizedBox(width: 4),
          Text(
            label,
            style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700),
          ),
        ],
      ),
    );
  }
}

class _AburuComparisonThumb extends StatelessWidget {
  const _AburuComparisonThumb({
    required this.label,
    required this.child,
    this.highlighted = false,
  });

  final String label;
  final Widget child;
  final bool highlighted;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
          decoration: BoxDecoration(
            color: highlighted ? _fitilaGoldDeep : _fitilaSurfaceAlt,
            borderRadius: BorderRadius.circular(6),
          ),
          child: Text(
            label,
            style: TextStyle(
              fontSize: 9.5,
              fontWeight: FontWeight.w800,
              color: highlighted ? Colors.white : _fitilaMuted,
            ),
          ),
        ),
        const SizedBox(height: 4),
        AspectRatio(
          aspectRatio: 1.6,
          child: ClipRRect(
            borderRadius: BorderRadius.circular(10),
            child: child,
          ),
        ),
      ],
    );
  }
}

// ─────────────────────────────────────────────────────────────────
// 5. Sasara IA — pont bilingue + corpus communautaire opt-in
// ─────────────────────────────────────────────────────────────────
class SasaraIaScreen extends StatefulWidget {
  const SasaraIaScreen({
    super.key,
    required this.onPostCreated,
    this.initialText,
  });

  final ValueChanged<FeedPost> onPostCreated;
  // Rempli quand Sasara IA est proposé juste après une autre création
  // (Echo Sɔ̃ɔ, Aburu Fim IA…) — évite de retaper le texte à traduire.
  final String? initialText;

  @override
  State<SasaraIaScreen> createState() => _SasaraIaScreenState();
}

class _SasaraIaScreenState extends State<SasaraIaScreen> {
  final _input = TextEditingController();
  TranslationDirection _direction = TranslationDirection.frenchToBariba;
  String _translated = '';
  List<TextEditingController> _lineControllers = [];
  int? _editingLine;
  bool _translating = false;
  bool _consent = false;
  bool _publishing = false;
  int _contributions = 0;
  int _communityCount = 0;
  int _sasaraUiStep = 0;
  bool _sasaraPreviewBariba = true;

  @override
  void initState() {
    super.initState();
    if (widget.initialText != null && widget.initialText!.trim().isNotEmpty) {
      _input.text = widget.initialText!.trim();
    }
    _loadContributions();
  }

  @override
  void dispose() {
    _input.dispose();
    for (final c in _lineControllers) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> _loadContributions() async {
    try {
      final results = await Future.wait([
        FitilaBackend.fetchCorpusContributionCount(),
        FitilaBackend.fetchCorpusCommunityCountThisMonth(),
      ]);
      if (mounted) {
        setState(() {
          _contributions = results[0];
          _communityCount = results[1];
        });
      }
    } catch (_) {
      // Best-effort — les compteurs restent à 0 si la lecture échoue.
    }
  }

  // Découpe la traduction en lignes/phrases éditables individuellement
  // — c'est ce qui permet de corriger l'IA ligne par ligne avant de
  // publier, plutôt que de tout retraduire si un seul mot est faux.
  void _rebuildLineControllers(String text) {
    for (final c in _lineControllers) {
      c.dispose();
    }
    final lines = text
        .split(RegExp(r'(?<=[.!?])\s+|\n'))
        .where((l) => l.trim().isNotEmpty)
        .toList();
    _lineControllers = (lines.isEmpty ? [text] : lines)
        .map((l) => TextEditingController(text: l))
        .toList();
    _editingLine = null;
  }

  String get _editedTranslation => _lineControllers
      .map((c) => c.text.trim())
      .where((l) => l.isNotEmpty)
      .join(' ');

  Future<void> _translate() async {
    final text = _input.text.trim();
    if (text.isEmpty || _translating) {
      return;
    }
    setState(() => _translating = true);
    try {
      final session = FitilaBackend.client.auth.currentSession;
      final result = await FitilaServices.translate(
        text,
        _direction,
        accessToken: session?.accessToken,
      );
      if (!mounted) {
        return;
      }
      setState(() {
        _translated = result;
        _rebuildLineControllers(result);
      });
      if (result.isNotEmpty && FitilaBackend.configured) {
        FitilaBackend.saveTranslationHistory(
          sourceLang: _direction == TranslationDirection.frenchToBariba
              ? 'fr'
              : 'ba',
          targetLang: _direction == TranslationDirection.frenchToBariba
              ? 'ba'
              : 'fr',
          sourceText: text,
          translatedText: result,
          mode: 'Sasara IA',
        ).catchError((_) => <String, dynamic>{});
      }
    } catch (_) {
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Traduction indisponible pour le moment.'),
        ),
      );
    } finally {
      if (mounted) {
        setState(() => _translating = false);
      }
    }
  }

  Future<void> _publish() async {
    final source = _input.text.trim();
    final translated = _editedTranslation;
    if (source.isEmpty || translated.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Traduisez votre phrase avant de publier.'),
        ),
      );
      return;
    }
    setState(() => _publishing = true);
    final sourceLang = _direction == TranslationDirection.frenchToBariba
        ? 'fr'
        : 'ba';
    final targetLang = _direction == TranslationDirection.frenchToBariba
        ? 'ba'
        : 'fr';
    final content = _direction == TranslationDirection.frenchToBariba
        ? '$source\n\n🌉 $translated'
        : '$translated\n\n🌉 $source';
    try {
      final row = await FitilaBackend.createTextPost(
        text: content,
        hashtags: const ['sasara-ia', 'bilingue'],
        templateId: 'sasara-ia',
      );
      var corpusSaved = !_consent;
      if (_consent) {
        try {
          await FitilaBackend.saveCorpusContribution(
            sourceLang: sourceLang,
            targetLang: targetLang,
            sourceText: source,
            translatedText: translated,
          );
          corpusSaved = true;
          _loadContributions();
        } catch (_) {
          corpusSaved = false;
        }
      }
      if (!mounted) {
        return;
      }
      widget.onPostCreated(FeedPost.fromBackend(row));
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            corpusSaved
                ? 'Publication bilingue envoyée au fil.'
                : 'Publication envoyée, mais la contribution au corpus n’a pas pu être enregistrée.',
          ),
        ),
      );
      setState(() {
        _input.clear();
        _translated = '';
        _rebuildLineControllers('');
      });
    } catch (_) {
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Publication impossible. Réessayez.')),
      );
    } finally {
      if (mounted) {
        setState(() => _publishing = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    switch (_sasaraUiStep) {
      case 1:
        return _buildSasaraTranscriptReference();
      case 2:
        return _buildSasaraPreviewReference();
      case 3:
        return _buildSasaraImpactReference();
      case 0:
      default:
        return _buildSasaraConsentReference();
    }
  }

  Widget _buildSasaraConsentReference() {
    return ReferenceCreationShell(
      dark: false,
      title: 'Rendre bilingue ?',
      subtitle: 'Après ta publication',
      leading: const Text('🌉', style: TextStyle(fontSize: 15)),
      child: ListView(
        padding: EdgeInsets.zero,
        children: [
          ReferenceCard(
            child: Column(
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const ReferenceTinyPill(label: 'Bàátɔ̀nú'),
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 8),
                      child: Text(
                        '⇄',
                        style: TextStyle(
                          color: FitilaReferenceUi.goldDeep,
                          fontSize: 14,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                    ),
                    const ReferenceTinyPill(label: 'Français'),
                  ],
                ),
                const SizedBox(height: 12),
                const Text(
                  'Ton contenu peut toucher deux publics en devenant bilingue automatiquement.',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    color: FitilaReferenceUi.inkSoft,
                    fontSize: 12,
                    height: 1.5,
                  ),
                ),
                const SizedBox(height: 12),
                Container(
                  padding: const EdgeInsets.all(11),
                  decoration: BoxDecoration(
                    color: FitilaReferenceUi.surfaceAlt,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Expanded(
                        child: Text.rich(
                          TextSpan(
                            children: [
                              TextSpan(
                                text:
                                    'Aider à améliorer la reconnaissance vocale Bariba',
                                style: TextStyle(
                                  color: FitilaReferenceUi.ink,
                                  fontWeight: FontWeight.w800,
                                ),
                              ),
                              TextSpan(
                                text:
                                    ' — en corrigeant la traduction, tu peux contribuer au corpus (facultatif).',
                              ),
                            ],
                          ),
                          style: TextStyle(
                            color: FitilaReferenceUi.inkSoft,
                            fontSize: 11,
                            height: 1.45,
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Switch(
                        value: _consent,
                        activeTrackColor: FitilaReferenceUi.sage,
                        onChanged: (value) => setState(() => _consent = value),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          ReferenceLightSegment(
            first: 'Français → Bariba',
            second: 'Bariba → Français',
            firstSelected: _direction == TranslationDirection.frenchToBariba,
            onFirst: () => setState(
              () => _direction = TranslationDirection.frenchToBariba,
            ),
            onSecond: () => setState(
              () => _direction = TranslationDirection.baribaToFrench,
            ),
          ),
          const SizedBox(height: 10),
          TextField(
            controller: _input,
            maxLines: 4,
            decoration: const InputDecoration(
              hintText: 'Votre phrase…',
            ),
          ),
          const SizedBox(height: 12),
          ReferenceGoldButton(
            label: 'Rendre bilingue avec l’IA',
            icon: Icons.auto_awesome_rounded,
            busy: _translating,
            onPressed: _translating
                ? null
                : () async {
                    await _translate();
                    if (mounted && _translated.isNotEmpty) {
                      setState(() => _sasaraUiStep = 1);
                    }
                  },
          ),
        ],
      ),
    );
  }

  Widget _buildSasaraTranscriptReference() {
    final targetLabel =
        _direction == TranslationDirection.frenchToBariba
            ? 'Bàátɔ̀nú (assistée par IA)'
            : 'Français (assisté par IA)';
    return ReferenceCreationShell(
      dark: false,
      title: 'Vérifie la transcription',
      subtitle: targetLabel,
      onBack: () => setState(() => _sasaraUiStep = 0),
      child: Column(
        children: [
          Expanded(
            child: ListView(
              padding: EdgeInsets.zero,
              children: [
                if (_lineControllers.isEmpty)
                  ReferenceCard(
                    child: const Text(
                      'Aucune traduction disponible.',
                      textAlign: TextAlign.center,
                    ),
                  )
                else
                  for (var i = 0; i < _lineControllers.length; i++)
                    Container(
                      padding: const EdgeInsets.symmetric(vertical: 9),
                      decoration: const BoxDecoration(
                        border: Border(
                          bottom: BorderSide(
                            color: FitilaReferenceUi.hairline,
                          ),
                        ),
                      ),
                      child: _editingLine == i
                          ? Row(
                              children: [
                                Expanded(
                                  child: TextField(
                                    controller: _lineControllers[i],
                                    autofocus: true,
                                    decoration: const InputDecoration(
                                      border: InputBorder.none,
                                      filled: false,
                                    ),
                                  ),
                                ),
                                IconButton(
                                  onPressed: () =>
                                      setState(() => _editingLine = null),
                                  icon: const Icon(
                                    Icons.check_rounded,
                                    color: FitilaReferenceUi.goldDeep,
                                  ),
                                ),
                              ],
                            )
                          : Row(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Expanded(
                                  child: Text(
                                    _lineControllers[i].text,
                                    style: const TextStyle(
                                      color: FitilaReferenceUi.ink,
                                      fontSize: 12.5,
                                      height: 1.55,
                                    ),
                                  ),
                                ),
                                IconButton(
                                  padding: EdgeInsets.zero,
                                  constraints: const BoxConstraints(
                                    minWidth: 34,
                                    minHeight: 34,
                                  ),
                                  onPressed: () =>
                                      setState(() => _editingLine = i),
                                  icon: const Icon(
                                    Icons.edit_rounded,
                                    color: FitilaReferenceUi.goldDeep,
                                    size: 16,
                                  ),
                                ),
                              ],
                            ),
                    ),
                const SizedBox(height: 10),
                Text(
                  'Corrige uniquement ce qui doit l’être : le résultat final reste entièrement sous ton contrôle.',
                  style: const TextStyle(
                    color: FitilaReferenceUi.muted,
                    fontSize: 10.5,
                    height: 1.45,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 10),
          ReferenceGoldButton(
            label: 'Valider & continuer',
            icon: Icons.arrow_forward_rounded,
            onPressed: _editedTranslation.isEmpty
                ? null
                : () => setState(() => _sasaraUiStep = 2),
          ),
        ],
      ),
    );
  }

  Widget _buildSasaraPreviewReference() {
    final source = _input.text.trim();
    final translated = _editedTranslation;
    final bariba = _direction == TranslationDirection.frenchToBariba
        ? translated
        : source;
    final french = _direction == TranslationDirection.frenchToBariba
        ? source
        : translated;
    final visibleCaption = _sasaraPreviewBariba ? bariba : french;

    return ReferenceCreationShell(
      dark: false,
      title: 'Aperçu bilingue',
      subtitle: 'Prêt à publier',
      onBack: () => setState(() => _sasaraUiStep = 1),
      actions: [
        IconButton(
          tooltip: 'Impact',
          onPressed: () => setState(() => _sasaraUiStep = 3),
          icon: const Icon(
            Icons.insights_rounded,
            color: FitilaReferenceUi.ink,
            size: 19,
          ),
        ),
      ],
      child: ListView(
        padding: EdgeInsets.zero,
        children: [
          ReferenceVideoMock(
            caption: visibleCaption.isEmpty
                ? 'Aperçu des sous-titres bilingues'
                : visibleCaption,
            child: const Center(
              child: Icon(
                Icons.subtitles_rounded,
                size: 46,
                color: Colors.white54,
              ),
            ),
          ),
          const SizedBox(height: 10),
          ReferenceLightSegment(
            first: 'Sous-titres Bariba',
            second: 'Sous-titres Français',
            firstSelected: _sasaraPreviewBariba,
            onFirst: () => setState(() => _sasaraPreviewBariba = true),
            onSecond: () => setState(() => _sasaraPreviewBariba = false),
          ),
          const SizedBox(height: 10),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 11, vertical: 10),
            decoration: BoxDecoration(
              color: FitilaReferenceUi.surfaceAlt,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: const Color(0xFFB7AF8E),
                style: BorderStyle.solid,
              ),
            ),
            child: const Text(
              '🔜 Doublage vocal complet : disponible lorsque le modèle de voix Bariba sera entraîné sur le corpus communautaire.',
              style: TextStyle(
                color: FitilaReferenceUi.inkSoft,
                fontSize: 10.5,
                height: 1.5,
              ),
            ),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: () {
                    final text = _sasaraPreviewBariba ? bariba : french;
                    if (text.isEmpty) return;
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(
                        content: Text(
                          'Utilisez le bouton d’écoute disponible dans le module pour lire la traduction.',
                        ),
                      ),
                    );
                  },
                  icon: const Icon(Icons.volume_up_rounded, size: 16),
                  label: const Text('Écouter'),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          ReferenceGoldButton(
            label: 'Publier',
            icon: Icons.send_rounded,
            busy: _publishing,
            trailing: Container(
              padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: .22),
                borderRadius: BorderRadius.circular(999),
              ),
              child: const Text(
                '🌉 Bilingue',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 10,
                  fontWeight: FontWeight.w800,
                ),
              ),
            ),
            onPressed: _publishing
                ? null
                : () async {
                    await _publish();
                    if (mounted &&
                        _input.text.isEmpty &&
                        _translated.isEmpty) {
                      setState(() => _sasaraUiStep = 3);
                    }
                  },
          ),
        ],
      ),
    );
  }

  Widget _buildSasaraImpactReference() {
    return ReferenceCreationShell(
      dark: true,
      title: 'Impact du bilingue',
      subtitle: 'Depuis que Sasara IA est activé',
      leading: const Icon(
        Icons.insights_rounded,
        size: 17,
        color: Colors.white,
      ),
      onBack: () => setState(() => _sasaraUiStep = 2),
      child: ListView(
        padding: EdgeInsets.zero,
        children: [
          Row(
            children: [
              Expanded(
                child: _buildSasaraImpactMetric(
                  _contributions.toString(),
                  'Mes contributions',
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: _buildSasaraImpactMetric(
                  _communityCount.toString(),
                  'Phrases ce mois',
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          ReferenceCard(
            dark: true,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const ReferenceLabel('Corpus communautaire', dark: true),
                const SizedBox(height: 4),
                Text(
                  _communityCount.toString() +
                      ' phrase(s) Bariba corrigée(s) ce mois-ci',
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 13,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const SizedBox(height: 3),
                Text(
                  _consent
                      ? 'Merci d’avoir activé la contribution 🙏'
                      : 'La contribution reste facultative et désactivée tant que tu ne l’actives pas.',
                  style: TextStyle(
                    color: Colors.white.withValues(alpha: .55),
                    fontSize: 11,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSasaraImpactMetric(String value, String label) {
    return Container(
      padding: const EdgeInsets.all(11),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: .06),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.white.withValues(alpha: .14)),
      ),
      child: Column(
        children: [
          Text(
            value,
            style: FitilaReferenceUi.serif(
              size: 19,
              color: FitilaReferenceUi.gold,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            label,
            textAlign: TextAlign.center,
            style: TextStyle(
              color: Colors.white.withValues(alpha: .60),
              fontSize: 9,
            ),
          ),
        ],
      ),
    );
  }

}

// ─────────────────────────────────────────────────────────────────
// 6. Handunia Wasa — monde vivant, avec continuité locale hors ligne
// ─────────────────────────────────────────────────────────────────
class HanduniaWasaScreen extends StatefulWidget {
  const HanduniaWasaScreen({super.key});

  @override
  State<HanduniaWasaScreen> createState() => _HanduniaWasaScreenState();
}

class _HanduniaWasaScreenState extends State<HanduniaWasaScreen> {
  static const _fallbackLieux = <Map<String, dynamic>>[
    {
      'id': 'marche-nikki',
      'name': 'Marché de Nikki',
      'icon': '🏮',
      'description':
          'Le grand marché où l’on vient acheter, vendre et partager les nouvelles du pays.',
      'sort_order': 1,
    },
    {
      'id': 'veillee-contes',
      'name': 'Veillée de contes',
      'icon': '🔥',
      'description':
          'Le cercle du soir où les récits se transmettent autour du feu.',
      'sort_order': 2,
    },
    {
      'id': 'intronisation',
      'name': 'Intronisation',
      'icon': '👑',
      'description':
          'Le jour solennel où un chef reçoit ses insignes devant la communauté.',
      'sort_order': 3,
    },
    {
      'id': 'recoltes',
      'name': 'Récoltes',
      'icon': '🌾',
      'description':
          'Le temps des champs, quand le village se retrouve pour rentrer la moisson.',
      'sort_order': 4,
    },
    {
      'id': 'fete-gaani',
      'name': 'Fête du Gaani',
      'icon': '🥁',
      'description':
          'La grande fête des tambours et des cavaliers qui rassemble les familles.',
      'sort_order': 5,
    },
    {
      'id': 'puits-village',
      'name': 'Puits du village',
      'icon': '💧',
      'description':
          'Le point d’eau où circulent chaque matin autant de seaux que d’histoires.',
      'sort_order': 6,
    },
    {
      'id': 'chemin-caravanes',
      'name': 'Chemin des caravanes',
      'icon': '🐫',
      'description':
          'La vieille route où les voyageurs échangent nouvelles et récits.',
      'sort_order': 7,
    },
  ];

  // Parcours en 6 écrans — les 4 premiers repris À L'IDENTIQUE de la
  // maquette validée, complétés par deux briques qui rendent le monde
  // dynamique et social plutôt que limité à une liste fermée de lieux :
  // 0 = portail d'entrée · 1 = carte des lieux vivants (densité réelle,
  // recherche, tri, création libre) · 2 = présence dans un lieu généré
  // (scène + mémoire collective + souvenirs de la communauté, IA
  // réellement appelée à partir de souvenirs réels) · 3 = tisser un
  // souvenir (écriture réelle, volontairement pas une "publication") ·
  // 4 = tisser un nouveau lieu (ouvert à tout utilisateur) · 5 = fil du
  // monde vivant (souvenirs récents, tous lieux confondus).
  int _step = 0;
  bool _loadingLieux = true;
  bool _backendUnavailable = false;
  String? _lieuxError;
  List<Map<String, dynamic>> _lieux = const [];
  Map<String, int> _density = const {};
  final _lieuxQuery = TextEditingController();
  bool _sortByPopular = true;

  Map<String, dynamic>? _selectedLieu;
  bool _loadingScene = false;
  String _scene = '';
  List<Map<String, dynamic>> _lieuFragments = const [];
  final _askController = TextEditingController();
  bool _asking = false;
  String _memoryAnswer = '';

  final _fragmentController = TextEditingController();
  bool _weaving = false;
  bool _generating = false;
  bool _aiAssisted = false;

  final _newLieuName = TextEditingController();
  final _newLieuIcon = TextEditingController(text: '📍');
  final _newLieuDescription = TextEditingController();
  bool _suggestingLieu = false;
  bool _creatingLieu = false;

  bool _loadingWorldFeed = false;
  List<Map<String, dynamic>> _worldFeed = const [];
  bool _syncingOffline = false;
  int _syncedOfflineCount = 0;

  @override
  void initState() {
    super.initState();
    _loadLieux();
  }

  @override
  void dispose() {
    _fragmentController.dispose();
    _askController.dispose();
    _lieuxQuery.dispose();
    _newLieuName.dispose();
    _newLieuIcon.dispose();
    _newLieuDescription.dispose();
    super.dispose();
  }

  // Lieux visibles dans la grille : filtrés par la recherche libre et
  // triés soit par popularité réelle (densité), soit par nouveauté —
  // deux tris réellement calculés, jamais un ordre figé.
  List<Map<String, dynamic>> get _visibleLieux {
    final query = _lieuxQuery.text.trim().toLowerCase();
    var list = query.isEmpty
        ? _lieux
        : _lieux
              .where(
                (l) =>
                    (l['name']?.toString() ?? '').toLowerCase().contains(query),
              )
              .toList();
    list = List<Map<String, dynamic>>.from(list);
    if (_sortByPopular) {
      list.sort(
        (a, b) => (_density[b['id']] ?? 0).compareTo(_density[a['id']] ?? 0),
      );
    } else {
      list.sort((a, b) {
        final da =
            DateTime.tryParse(a['created_at']?.toString() ?? '') ??
            DateTime(2000);
        final db =
            DateTime.tryParse(b['created_at']?.toString() ?? '') ??
            DateTime(2000);
        return db.compareTo(da);
      });
    }
    return list;
  }

  Future<void> _loadLieux() async {
    setState(() {
      _loadingLieux = true;
      _lieuxError = null;
      _syncedOfflineCount = 0;
    });
    try {
      final results = await Future.wait([
        FitilaBackend.fetchHanduniaLieux(),
        FitilaBackend.fetchHanduniaDensity(),
      ]);
      final serverLieux = results[0] as List<Map<String, dynamic>>;
      var serverDensity = results[1] as Map<String, int>;

      if (mounted) {
        setState(() => _syncingOffline = true);
      }
      var synced = 0;
      try {
        synced = await _syncPendingLocalFragments(serverLieux);
        if (synced > 0) {
          serverDensity = await FitilaBackend.fetchHanduniaDensity();
        }
      } catch (_) {
        // La synchronisation locale est best-effort : elle ne bloque jamais
        // l'accès au monde vivant ni les données déjà disponibles.
      }

      if (!mounted) {
        return;
      }
      setState(() {
        _lieux = serverLieux;
        _density = serverDensity;
        _backendUnavailable = false;
        _loadingLieux = false;
        _syncingOffline = false;
        _syncedOfflineCount = synced;
      });
      if (synced > 0) {
        WidgetsBinding.instance.addPostFrameCallback((_) {
          if (!mounted) return;
          ScaffoldMessenger.maybeOf(context)?.showSnackBar(
            SnackBar(
              content: Text(
                synced == 1
                    ? '1 souvenir hors ligne a été synchronisé.'
                    : '$synced souvenirs hors ligne ont été synchronisés.',
              ),
            ),
          );
        });
      }
    } catch (_) {
      if (!mounted) {
        return;
      }
      setState(() {
        _lieux = _fallbackLieux
            .map((lieu) => Map<String, dynamic>.from(lieu))
            .toList(growable: false);
        _density = const {};
        _lieuxError = null;
        _backendUnavailable = true;
        _loadingLieux = false;
        _syncingOffline = false;
      });
    }
  }

  Future<int> _syncPendingLocalFragments(
    List<Map<String, dynamic>> lieux,
  ) async {
    if (!FitilaBackend.configured) {
      return 0;
    }
    final preferences = await SharedPreferences.getInstance();
    var synced = 0;
    for (final lieu in lieux) {
      final lieuId = lieu['id']?.toString() ?? '';
      if (lieuId.isEmpty) {
        continue;
      }
      final key = _localFragmentKey(lieuId);
      final pending = List<String>.from(
        preferences.getStringList(key) ?? const <String>[],
      );
      if (pending.isEmpty) {
        continue;
      }
      final remaining = <String>[];
      for (final text in pending) {
        try {
          await FitilaBackend.weaveHanduniaFragment(
            lieuId: lieuId,
            text: text,
            aiGenerated: false,
          );
          synced += 1;
        } catch (_) {
          remaining.add(text);
        }
      }
      if (remaining.isEmpty) {
        await preferences.remove(key);
      } else {
        await preferences.setStringList(key, remaining);
      }
    }
    return synced;
  }

  String _localFragmentKey(String lieuId) =>
      'handunia_wasa_local_fragments_$lieuId';

  Future<List<Map<String, dynamic>>> _readLocalFragments(String lieuId) async {
    try {
      final preferences = await SharedPreferences.getInstance();
      final values = preferences.getStringList(_localFragmentKey(lieuId)) ?? [];
      return values.reversed
          .map(
            (text) => <String, dynamic>{
              'id': 'local-${text.hashCode}',
              'text': text,
              'display_name': 'Sur cet appareil',
              'like_count': 0,
              'liked_by_me': false,
              'local_only': true,
            },
          )
          .toList(growable: false);
    } catch (_) {
      return const [];
    }
  }

  Future<void> _saveLocalFragment(String lieuId, String text) async {
    final preferences = await SharedPreferences.getInstance();
    final key = _localFragmentKey(lieuId);
    final values = preferences.getStringList(key) ?? <String>[];
    values.add(text);
    await preferences.setStringList(key, values);
  }

  // La densité affichée est un vrai décompte de souvenirs, ramené à une
  // échelle 0-100 (20 souvenirs = lieu pleinement dense) — jamais un
  // chiffre inventé. Un lieu sans souvenir affiche honnêtement 0%.
  int _densityPercent(String lieuId) {
    final count = _density[lieuId] ?? 0;
    if (count <= 0) {
      return 0;
    }
    return ((count / 20) * 100).clamp(0, 100).round();
  }

  Future<void> _openLieu(Map<String, dynamic> lieu) async {
    setState(() {
      _selectedLieu = lieu;
      _step = 2;
      _loadingScene = true;
      _scene = '';
      _memoryAnswer = '';
      _askController.clear();
    });
    final lieuId = lieu['id'] as String;
    final localFragments = await _readLocalFragments(lieuId);
    try {
      final fragments = await FitilaBackend.fetchHanduniaFragments(lieuId);
      if (!mounted) {
        return;
      }
      final mergedFragments = [...localFragments, ...fragments];
      setState(() => _lieuFragments = mergedFragments);
      final scene = await _generateScene(lieu, mergedFragments);
      if (!mounted) {
        return;
      }
      setState(() => _scene = scene);
    } catch (_) {
      if (!mounted) {
        return;
      }
      final description = lieu['description']?.toString().trim() ?? '';
      setState(() {
        _backendUnavailable = true;
        _lieuFragments = localFragments;
        _scene = localFragments.isEmpty
            ? '$description\n\nMode hors ligne : aucun souvenir local n’a encore été tissé pour ce lieu.'
            : '$description\n\nSouvenirs conservés sur cet appareil :\n${localFragments.take(3).map((fragment) => '• ${fragment['text']}').join('\n')}';
      });
    } finally {
      if (mounted) {
        setState(() => _loadingScene = false);
      }
    }
  }

  // Scène RÉELLEMENT générée par Fitila IA : à partir des souvenirs
  // effectivement déposés pour ce lieu quand il y en a, ou honnêtement
  // à partir de la seule description éditoriale sinon — jamais un texte
  // fabriqué présenté comme une reconstitution collective.
  Future<String> _generateScene(
    Map<String, dynamic> lieu,
    List<Map<String, dynamic>> fragments,
  ) async {
    final name = lieu['name']?.toString() ?? 'ce lieu';
    final description = lieu['description']?.toString() ?? '';
    if (fragments.isEmpty) {
      final prompt =
          'Voici la description éditoriale d\'un lieu du monde bariba Handunia Wasa nommé "$name" : '
          '$description Aucun souvenir communautaire n\'a encore été partagé pour ce lieu. '
          'Rédige 2 à 3 phrases sensorielles qui évoquent ce lieu à partir de cette seule description, '
          'comme une première évocation à enrichir par la communauté. Réponds uniquement par le texte, sans introduction.';
      return FitilaBackend.askFitilaIa(prompt);
    }
    final memories = fragments.take(6).map((f) => '- ${f['text']}').join('\n');
    final prompt =
        'Voici des souvenirs RÉELS partagés par la communauté à propos du lieu "$name" ($description) :\n$memories\n\n'
        'Rédige 2 à 3 phrases sensorielles qui reconstituent une scène évoquant ce lieu, en t\'appuyant '
        'uniquement sur ces souvenirs réels. Réponds uniquement par le texte, sans introduction ni liste.';
    return FitilaBackend.askFitilaIa(prompt);
  }

  // "Demander à la mémoire collective" : un vrai mini-RAG — la réponse
  // vient uniquement des souvenirs réellement tissés pour ce lieu,
  // jamais d'une connaissance générale inventée pour l'occasion.
  Future<void> _askCollectiveMemory() async {
    final question = _askController.text.trim();
    final lieu = _selectedLieu;
    if (question.isEmpty || lieu == null || _asking) {
      return;
    }
    setState(() {
      _asking = true;
      _memoryAnswer = '';
    });
    try {
      final name = lieu['name']?.toString() ?? 'ce lieu';
      if (_lieuFragments.isEmpty) {
        setState(() {
          _memoryAnswer =
              "Aucun souvenir communautaire n'a encore été partagé pour $name — soyez le premier à en tisser un, pour que la mémoire collective puisse un jour répondre.";
        });
        return;
      }
      final memories = _lieuFragments
          .take(8)
          .map((f) => '- ${f['text']}')
          .join('\n');
      final prompt =
          'En te basant UNIQUEMENT sur les souvenirs communautaires réels suivants à propos de "$name" :\n$memories\n\n'
          'Réponds à cette question : "$question". '
          'Si ces souvenirs ne suffisent pas pour répondre, dis-le honnêtement plutôt que d\'inventer.';
      final answer = await FitilaBackend.askFitilaIa(prompt);
      if (!mounted) {
        return;
      }
      setState(() => _memoryAnswer = answer);
    } catch (_) {
      if (!mounted) {
        return;
      }
      setState(
        () => _memoryAnswer =
            'La mémoire collective est momentanément indisponible.',
      );
    } finally {
      if (mounted) {
        setState(() => _asking = false);
      }
    }
  }

  Future<void> _generateFragment() async {
    final lieu = _selectedLieu;
    setState(() => _generating = true);
    try {
      final name = lieu?['name']?.toString() ?? 'Handunia Wasa';
      final description = lieu?['description']?.toString() ?? '';
      final prompt =
          'Imagine en 3 à 4 phrases un souvenir ou un petit récit inspiré du lieu "$name" ($description) '
          'dans le monde bariba Handunia Wasa, comme un fragment que quelqu\'un du village raconterait. '
          'Réponds uniquement par le fragment, sans introduction ni explication.';
      final result = await FitilaBackend.askFitilaIa(prompt);
      if (!mounted) {
        return;
      }
      setState(() {
        _fragmentController.text = result;
        _aiAssisted = true;
      });
    } catch (_) {
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Génération IA indisponible pour le moment.'),
        ),
      );
    } finally {
      if (mounted) {
        setState(() => _generating = false);
      }
    }
  }

  // "Tisser dans le monde vivant" — volontairement PAS une publication
  // dans le fil : le souvenir rejoint uniquement la mémoire du lieu.
  Future<void> _weaveFragment() async {
    final lieu = _selectedLieu;
    final text = _fragmentController.text.trim();
    if (lieu == null) {
      return;
    }
    if (text.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Décrivez votre souvenir avant de le tisser.'),
        ),
      );
      return;
    }
    setState(() => _weaving = true);
    var savedLocally = false;
    try {
      if (_backendUnavailable || !FitilaBackend.configured) {
        await _saveLocalFragment(lieu['id'] as String, text);
        savedLocally = true;
      } else {
        await FitilaBackend.weaveHanduniaFragment(
          lieuId: lieu['id'] as String,
          text: text,
          aiGenerated: _aiAssisted,
        );
      }
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            savedLocally
                ? 'Souvenir conservé sur cet appareil. Il sera synchronisé automatiquement lorsque le service communautaire sera de nouveau disponible.'
                : 'Votre souvenir a rejoint le monde vivant.',
          ),
        ),
      );
      setState(() {
        _fragmentController.clear();
        _aiAssisted = false;
        _step = 1;
      });
      if (savedLocally) {
        setState(() {
          final id = lieu['id'] as String;
          _density = {..._density, id: (_density[id] ?? 0) + 1};
        });
      } else {
        _loadLieux();
      }
    } catch (_) {
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Impossible de tisser ce souvenir. Réessayez.'),
        ),
      );
    } finally {
      if (mounted) {
        setState(() => _weaving = false);
      }
    }
  }

  // Ouvre l'écran de création d'un nouveau lieu. Si un lieu de nom très
  // proche existe déjà, on le propose à la place plutôt que de laisser
  // filer vers un doublon — la contrainte d'unicité en base est le
  // filet de sécurité final, pas la première ligne de défense.
  void _openCreateLieuStep() {
    _newLieuName.clear();
    _newLieuIcon.text = '📍';
    _newLieuDescription.clear();
    setState(() => _step = 4);
  }

  Map<String, dynamic>? _findSimilarLieu(String name) {
    final target = name.trim().toLowerCase();
    if (target.isEmpty) {
      return null;
    }
    for (final lieu in _lieux) {
      if ((lieu['name']?.toString() ?? '').trim().toLowerCase() == target) {
        return lieu;
      }
    }
    return null;
  }

  Future<void> _suggestLieuDetails() async {
    final name = _newLieuName.text.trim();
    if (name.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text(
            'Donnez un nom au lieu avant de demander une suggestion.',
          ),
        ),
      );
      return;
    }
    setState(() => _suggestingLieu = true);
    try {
      final prompt =
          'Pour un lieu du monde vivant bariba Handunia Wasa nommé "$name", propose exactement deux lignes : '
          'une ligne "ICONE: " suivie d\'un seul emoji pertinent, puis une ligne "DESCRIPTION: " suivie '
          'd\'une phrase courte et évocatrice (moins de 25 mots) qui donne envie d\'y déposer un souvenir. '
          'Réponds uniquement avec ces deux lignes, rien d\'autre.';
      final result = await FitilaBackend.askFitilaIa(prompt);
      final iconMatch = RegExp(r'ICONE\s*:\s*(\S+)').firstMatch(result);
      final descMatch = RegExp(
        r'DESCRIPTION\s*:\s*(.+)',
        dotAll: true,
      ).firstMatch(result);
      if (!mounted) {
        return;
      }
      setState(() {
        if (iconMatch != null) {
          _newLieuIcon.text = iconMatch.group(1)!.trim();
        }
        if (descMatch != null) {
          _newLieuDescription.text = descMatch.group(1)!.trim();
        } else if (iconMatch == null) {
          _newLieuDescription.text = result.trim();
        }
      });
    } catch (_) {
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Suggestion IA indisponible pour le moment.'),
        ),
      );
    } finally {
      if (mounted) {
        setState(() => _suggestingLieu = false);
      }
    }
  }

  Future<void> _submitNewLieu() async {
    final name = _newLieuName.text.trim();
    if (name.isEmpty) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Donnez un nom à ce lieu.')));
      return;
    }
    final similar = _findSimilarLieu(name);
    if (similar != null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('« $name » existe déjà — ouverture de ce lieu.'),
        ),
      );
      _openLieu(similar);
      return;
    }
    setState(() => _creatingLieu = true);
    try {
      await FitilaBackend.createHanduniaLieu(
        name: name,
        icon: _newLieuIcon.text,
        description: _newLieuDescription.text,
      );
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('« $name » a rejoint le monde vivant.')),
      );
      setState(() => _step = 1);
      await _loadLieux();
    } on StateError catch (e) {
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(e.message)));
    } catch (_) {
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Impossible de créer ce lieu. Réessayez.'),
        ),
      );
    } finally {
      if (mounted) {
        setState(() => _creatingLieu = false);
      }
    }
  }

  Future<void> _openWorldFeed() async {
    setState(() {
      _step = 5;
      _loadingWorldFeed = true;
    });
    try {
      final feed = await FitilaBackend.fetchHanduniaWorldFeed();
      if (!mounted) {
        return;
      }
      setState(() => _worldFeed = feed);
    } catch (_) {
      // Best-effort : le fil reste vide plutôt que de bloquer l'écran.
    } finally {
      if (mounted) {
        setState(() => _loadingWorldFeed = false);
      }
    }
  }

  // "J'aime" réellement écrit en base — jamais un compteur local
  // seulement affiché côté app. La liste affichée (fil du lieu ou fil
  // du monde) est mise à jour optimistement puis resynchronisée.
  Future<void> _toggleLike(
    Map<String, dynamic> fragment,
    List<Map<String, dynamic>> list,
    void Function(void Function()) apply,
  ) async {
    final id = fragment['id'] as String;
    final liked = fragment['liked_by_me'] == true;
    apply(() {
      fragment['liked_by_me'] = !liked;
      fragment['like_count'] =
          ((fragment['like_count'] as int?) ?? 0) + (liked ? -1 : 1);
    });
    try {
      await FitilaBackend.toggleHanduniaFragmentLike(
        fragmentId: id,
        like: !liked,
      );
    } catch (_) {
      if (!mounted) {
        return;
      }
      apply(() {
        fragment['liked_by_me'] = liked;
        fragment['like_count'] =
            ((fragment['like_count'] as int?) ?? 0) + (liked ? 1 : -1);
      });
    }
  }

  Widget _buildFragmentTile(
    Map<String, dynamic> fragment,
    List<Map<String, dynamic>> list, {
    bool showLieu = false,
  }) {
    final likeCount = (fragment['like_count'] as int?) ?? 0;
    final liked = fragment['liked_by_me'] == true;
    final localOnly = fragment['local_only'] == true;
    final displayName =
        fragment['display_name']?.toString().trim().isNotEmpty == true
        ? fragment['display_name'].toString().trim()
        : 'Griot Fitila';
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(13),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(20),
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Color(0xFF151D2C), Color(0xFF0D141F)],
        ),
        border: Border.all(color: const Color(0x1FFFFFFF)),
        boxShadow: const [
          BoxShadow(
            color: Color(0x22000000),
            blurRadius: 20,
            offset: Offset(0, 10),
            spreadRadius: -12,
          ),
        ],
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 36,
            height: 36,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              gradient: const LinearGradient(
                colors: [Color(0xFF8FE3CF), Color(0xFF4A3B78)],
              ),
              border: Border.all(color: Colors.white.withValues(alpha: .14)),
            ),
            child: Text(
              _initialLetter(displayName),
              style: const TextStyle(
                color: Color(0xFF071018),
                fontWeight: FontWeight.w900,
                fontSize: 13,
              ),
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        displayName,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          fontWeight: FontWeight.w800,
                          fontSize: 12.5,
                        ),
                      ),
                    ),
                    if (localOnly)
                      const _HanduniaTinyBadge(
                        icon: Icons.cloud_off_rounded,
                        label: 'local',
                      )
                    else if (fragment['ai_generated'] == true)
                      const _HanduniaTinyBadge(
                        icon: Icons.auto_awesome_rounded,
                        label: 'assisté IA',
                      ),
                  ],
                ),
                if (showLieu) ...[
                  const SizedBox(height: 3),
                  Text(
                    '${fragment['lieu_icon'] ?? '📍'} ${fragment['lieu_name'] ?? ''}',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      fontSize: 10.5,
                      color: Color(0xFF8FE3CF),
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ],
                const SizedBox(height: 7),
                Text(
                  fragment['text']?.toString() ?? '',
                  style: TextStyle(
                    color: Colors.white.withValues(alpha: .86),
                    fontSize: 12.5,
                    height: 1.42,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 6),
          Column(
            children: [
              IconButton(
                tooltip: localOnly
                    ? 'Synchronisation requise avant de pouvoir aimer'
                    : liked
                    ? 'Retirer le j’aime'
                    : 'J’aime',
                padding: EdgeInsets.zero,
                constraints: const BoxConstraints(minWidth: 38, minHeight: 38),
                icon: Icon(
                  liked
                      ? Icons.favorite_rounded
                      : Icons.favorite_border_rounded,
                  size: 19,
                  color: liked
                      ? const Color(0xFFFF7F73)
                      : Colors.white.withValues(alpha: .46),
                ),
                onPressed: localOnly
                    ? null
                    : () => _toggleLike(fragment, list, setState),
              ),
              Text(
                '$likeCount',
                style: TextStyle(
                  fontSize: 10,
                  color: Colors.white.withValues(alpha: .48),
                  fontWeight: FontWeight.w700,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    switch (_step) {
      case 1:
        return ReferenceCreationShell(
          dark: true,
          title: 'Lieux vivants',
          subtitle: _lieux.length.toString() + ' lieux tissés par la communauté',
          leading: const Text('🌌', style: TextStyle(fontSize: 15)),
          onBack: () => setState(() => _step = 0),
          child: _buildLieuxStep(),
        );
      case 2:
        return ReferenceCreationShell(
          dark: true,
          title: _selectedLieu?['name']?.toString() ?? 'Lieu vivant',
          subtitle: 'Reconstitué par la mémoire collective',
          onBack: () => setState(() => _step = 1),
          child: _buildSceneStep(),
        );
      case 3:
        return ReferenceCreationShell(
          dark: true,
          title: 'Tisser un souvenir',
          subtitle: 'Il rejoint Handunia Wasa',
          leading: const Text('🧵', style: TextStyle(fontSize: 15)),
          onBack: () => setState(() => _step = 2),
          child: _buildWeaveStep(),
        );
      case 4:
        return ReferenceCreationShell(
          dark: true,
          title: 'Tisser un nouveau lieu',
          subtitle: 'Le monde vivant grandit avec la communauté',
          onBack: () => setState(() => _step = 1),
          child: _buildCreateLieuStep(),
        );
      case 5:
        return ReferenceCreationShell(
          dark: true,
          title: 'Fil du monde',
          subtitle: 'Souvenirs tissés par la communauté',
          onBack: () => setState(() => _step = 1),
          child: _buildWorldFeedStep(),
        );
      case 0:
      default:
        return ReferenceCreationShell(
          dark: true,
          showTopBar: false,
          bodyPadding: EdgeInsets.zero,
          child: ReferencePortalStage(
            onEnter: () => setState(() => _step = 1),
          ),
        );
    }
  }

  Widget _buildPortalStep() {
    return ReferencePortalStage(
      onEnter: () => setState(() => _step = 1),
    );
  }

  // 2/4 — Carte des lieux vivants  // 2/4 — Carte des lieux vivants  // 2/4 — Carte des lieux vivants : chaque lieu se densifie visuellement
  // à mesure que la communauté y dépose souvenirs, voix et récits —
  // une vraie densité, jamais fabriquée (voir _densityPercent).
  Widget _buildLieuxStep() {
    if (_loadingLieux) {
      return const Center(
        child: CircularProgressIndicator(color: FitilaReferenceUi.wasaGlow),
      );
    }
    if (_lieuxError != null) {
      return Center(
        child: ReferenceCard(
          dark: true,
          margin: EdgeInsets.zero,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(
                Icons.cloud_off_rounded,
                color: Color(0xFFFFC768),
                size: 32,
              ),
              const SizedBox(height: 10),
              Text(
                _lieuxError!,
                textAlign: TextAlign.center,
                style: const TextStyle(color: Colors.white70, fontSize: 11.5),
              ),
              const SizedBox(height: 10),
              ReferenceGhostDarkButton(
                label: 'Réessayer',
                icon: Icons.refresh_rounded,
                onPressed: _loadLieux,
              ),
            ],
          ),
        ),
      );
    }

    final visible = _visibleLieux;
    return RefreshIndicator(
      color: FitilaReferenceUi.wasaGlow,
      onRefresh: _loadLieux,
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: EdgeInsets.zero,
        children: [
          SizedBox(
            height: 320,
            child: Stack(
              children: [
                for (var i = 0; i < math.min(visible.length, 7); i++)
                  Align(
                    alignment: _handuniaNodeAlignment(i),
                    child: ReferenceWorldNode(
                      emoji: visible[i]['icon']?.toString() ?? '📍',
                      label: visible[i]['name']?.toString() ?? 'Lieu vivant',
                      density: _densityPercent(visible[i]['id'].toString()),
                      onTap: () => _openLieu(visible[i]),
                    ),
                  ),
              ],
            ),
          ),
          if (_backendUnavailable)
            Container(
              margin: const EdgeInsets.only(bottom: 10),
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: const Color(0xFFF59E0B).withValues(alpha: .10),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: const Color(0xFFF59E0B).withValues(alpha: .22),
                ),
              ),
              child: const Text(
                'Mode hors ligne : les lieux de départ restent accessibles et les souvenirs sont synchronisés au retour du réseau.',
                style: TextStyle(
                  color: Color(0xFFFFDCA0),
                  fontSize: 10.5,
                  height: 1.4,
                ),
              ),
            ),
          Row(
            children: [
              Expanded(
                child: _HanduniaTextField(
                  controller: _lieuxQuery,
                  onChanged: (_) => setState(() {}),
                  decoration: const InputDecoration(
                    hintText: 'Rechercher un lieu…',
                    prefixIcon: Icon(Icons.search_rounded, size: 18),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              IconButton.filledTonal(
                tooltip: 'Nouveau lieu',
                onPressed: _backendUnavailable
                    ? null
                    : _openCreateLieuStep,
                icon: const Icon(Icons.add_location_alt_rounded),
              ),
              IconButton(
                tooltip: 'Fil du monde',
                onPressed: _backendUnavailable ? null : _openWorldFeed,
                icon: const Icon(
                  Icons.dynamic_feed_rounded,
                  color: FitilaReferenceUi.wasaGlow,
                ),
              ),
            ],
          ),
          if (_syncedOfflineCount > 0) ...[
            const SizedBox(height: 8),
            Text(
              _syncedOfflineCount.toString() +
                  ' souvenir(s) hors ligne synchronisé(s).',
              textAlign: TextAlign.center,
              style: TextStyle(
                color: Colors.white.withValues(alpha: .46),
                fontSize: 9.5,
              ),
            ),
          ],
          const SizedBox(height: 16),
        ],
      ),
    );
  }

  Alignment _handuniaNodeAlignment(int index) {
    const positions = [
      Alignment(-.72, -.82),
      Alignment(.48, -.88),
      Alignment(-.18, -.12),
      Alignment(.73, .02),
      Alignment(-.62, .78),
      Alignment(.20, .86),
      Alignment(.78, .72),
    ];
    return positions[index % positions.length];
  }

  // 3/4 — Présence dans un lieu généré  // 3/4 — Présence dans un lieu généré  // 3/4 — Présence dans un lieu généré : scène abstraite tissée à
  // partir de récits réels ; l'IA est la présence gardienne de la
  // mémoire — jamais une personne précise inventée.
  Widget _buildSceneStep() {
    final lieu = _selectedLieu;
    if (lieu == null) {
      return const SizedBox.shrink();
    }
    return ListView(
      padding: EdgeInsets.zero,
      children: [
        if (_loadingScene)
          const SizedBox(
            height: 230,
            child: Center(
              child: CircularProgressIndicator(
                color: FitilaReferenceUi.wasaGlow,
              ),
            ),
          )
        else
          ReferenceSceneStage(
            emoji: lieu['icon']?.toString() ?? '🌍',
            caption: _scene.isNotEmpty
                ? _scene
                : (lieu['description']?.toString() ?? ''),
          ),
        const SizedBox(height: 12),
        Row(
          children: [
            Expanded(
              child: _HanduniaTextField(
                controller: _askController,
                decoration: const InputDecoration(
                  hintText: '💬 Demander à la mémoire collective…',
                ),
                onSubmitted: (_) => _askCollectiveMemory(),
              ),
            ),
            const SizedBox(width: 7),
            IconButton.filled(
              onPressed: _asking ? null : _askCollectiveMemory,
              icon: _asking
                  ? const SizedBox(
                      width: 15,
                      height: 15,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: Colors.white,
                      ),
                    )
                  : const Icon(Icons.send_rounded),
            ),
          ],
        ),
        if (_memoryAnswer.isNotEmpty) ...[
          const SizedBox(height: 8),
          ReferenceCard(
            dark: true,
            child: Text(
              _memoryAnswer,
              style: const TextStyle(
                color: Colors.white,
                fontSize: 11.5,
                height: 1.4,
              ),
            ),
          ),
        ],
        if (_lieuFragments.isNotEmpty) ...[
          const SizedBox(height: 5),
          const ReferenceLabel('Souvenirs du lieu', dark: true),
          const SizedBox(height: 7),
          for (final fragment in _lieuFragments.take(3))
            _buildFragmentTile(fragment, _lieuFragments),
        ],
        const SizedBox(height: 9),
        ReferenceGoldButton(
          label: 'Tisser un souvenir ici',
          icon: Icons.auto_stories_rounded,
          onPressed: () => setState(() => _step = 3),
        ),
        const SizedBox(height: 12),
      ],
    );
  }

  // 4/4 — Le bouton n'est pas "Publier"  // 4/4 — Le bouton n'est pas "Publier" : le geste est cadré comme un
  // tissage collectif, pas une publication individuelle dans le fil.
  Widget _buildWeaveStep() {
    final lieu = _selectedLieu;
    return ListView(
      padding: EdgeInsets.zero,
      children: [
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
          decoration: BoxDecoration(
            color: Colors.white.withValues(alpha: .07),
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: Colors.white.withValues(alpha: .14)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'TON RÉCIT',
                style: TextStyle(
                  color: FitilaReferenceUi.gold,
                  fontSize: 9.5,
                  fontWeight: FontWeight.w800,
                  letterSpacing: .8,
                ),
              ),
              const SizedBox(height: 5),
              _HanduniaTextField(
                controller: _fragmentController,
                maxLines: 4,
                onChanged: (value) {
                  if (value.trim().isEmpty && _aiAssisted) {
                    setState(() => _aiAssisted = false);
                  }
                },
                decoration: InputDecoration(
                  hintText: lieu != null
                      ? 'Ma grand-mère racontait que…'
                      : 'Décrivez votre souvenir…',
                  filled: false,
                  border: InputBorder.none,
                ),
              ),
              if (_aiAssisted)
                Text(
                  'Assisté par Fitila IA — modifiable avant le tissage',
                  style: TextStyle(
                    color: Colors.white.withValues(alpha: .45),
                    fontSize: 9.5,
                  ),
                ),
            ],
          ),
        ),
        const SizedBox(height: 8),
        Align(
          alignment: Alignment.centerLeft,
          child: TextButton.icon(
            onPressed: _generating ? null : _generateFragment,
            icon: _generating
                ? const SizedBox(
                    width: 13,
                    height: 13,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      color: FitilaReferenceUi.wasaGlow,
                    ),
                  )
                : const Icon(
                    Icons.auto_awesome_rounded,
                    color: FitilaReferenceUi.wasaGlow,
                    size: 15,
                  ),
            label: const Text('Aide Fitila IA'),
            style: TextButton.styleFrom(
              foregroundColor: Colors.white.withValues(alpha: .62),
              textStyle: const TextStyle(fontSize: 10.5),
            ),
          ),
        ),
        const SizedBox(height: 6),
        SizedBox(
          height: 190,
          width: double.infinity,
          child: Stack(
            children: [
              Positioned.fill(
                child: CustomPaint(painter: _WeaveLinePainter()),
              ),
              const Positioned(
                right: 48,
                top: 42,
                child: DecoratedBox(
                  decoration: BoxDecoration(
                    color: Color(0x55FFFFFF),
                    shape: BoxShape.circle,
                  ),
                  child: SizedBox(width: 9, height: 9),
                ),
              ),
              const Positioned(
                left: 34,
                bottom: 26,
                child: DecoratedBox(
                  decoration: BoxDecoration(
                    color: FitilaReferenceUi.wasaGlow,
                    shape: BoxShape.circle,
                    boxShadow: [
                      BoxShadow(
                        color: Color(0xAA8FE3CF),
                        blurRadius: 14,
                      ),
                    ],
                  ),
                  child: SizedBox(width: 13, height: 13),
                ),
              ),
            ],
          ),
        ),
        ReferenceGoldButton(
          label: 'Tisser dans le monde vivant',
          icon: Icons.auto_awesome_mosaic_rounded,
          busy: _weaving,
          onPressed: _weaving ? null : _weaveFragment,
        ),
        const SizedBox(height: 8),
        Text(
          "Ce geste n'est pas une publication individuelle : le souvenir rejoint la mémoire collective du lieu.",
          textAlign: TextAlign.center,
          style: TextStyle(
            color: Colors.white.withValues(alpha: .42),
            fontSize: 9.5,
            height: 1.35,
          ),
        ),
        const SizedBox(height: 18),
      ],
    );
  }

  // 5 — Créer un nouveau lieu  // 5 — Créer un nouveau lieu : n'importe quel membre peut faire naître
  // un lieu du monde vivant, pas seulement les 7 lieux éditoriaux de
  // départ. Fitila IA peut aider à proposer une icône et une description,
  // mais rien n'est publié tant que l'utilisateur n'a pas validé.
  Widget _buildCreateLieuStep() {
    return ListView(
      children: [
        Row(
          children: [
            IconButton(
              icon: const Icon(Icons.arrow_back_rounded),
              onPressed: () => setState(() => _step = 1),
            ),
            const Expanded(
              child: Text(
                'Tisser un nouveau lieu',
                style: TextStyle(fontWeight: FontWeight.w800, fontSize: 15),
              ),
            ),
          ],
        ),
        const SizedBox(height: 4),
        Text(
          "Le monde vivant ne se limite pas aux lieux d'origine : proposez un lieu et il rejoint la carte pour toute la communauté.",
          style: TextStyle(color: _fitilaMuted, fontSize: 12, height: 1.4),
        ),
        const SizedBox(height: 16),
        Card(
          child: Padding(
            padding: const EdgeInsets.all(14),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'NOM DU LIEU',
                  style: TextStyle(
                    fontWeight: FontWeight.w800,
                    fontSize: 11,
                    letterSpacing: .5,
                  ),
                ),
                const SizedBox(height: 8),
                _HanduniaTextField(
                  controller: _newLieuName,
                  decoration: const InputDecoration(
                    hintText: 'Ex : Rive du fleuve Alibori',
                    border: OutlineInputBorder(),
                  ),
                ),
                const SizedBox(height: 14),
                const Text(
                  'ICÔNE',
                  style: TextStyle(
                    fontWeight: FontWeight.w800,
                    fontSize: 11,
                    letterSpacing: .5,
                  ),
                ),
                const SizedBox(height: 8),
                _HanduniaTextField(
                  controller: _newLieuIcon,
                  maxLength: 4,
                  decoration: const InputDecoration(
                    hintText: '📍',
                    border: OutlineInputBorder(),
                    counterText: '',
                  ),
                ),
                const SizedBox(height: 6),
                const Text(
                  'DESCRIPTION',
                  style: TextStyle(
                    fontWeight: FontWeight.w800,
                    fontSize: 11,
                    letterSpacing: .5,
                  ),
                ),
                const SizedBox(height: 8),
                _HanduniaTextField(
                  controller: _newLieuDescription,
                  maxLines: 3,
                  decoration: const InputDecoration(
                    hintText:
                        'Ce qui se vit dans ce lieu, ce qui donne envie d\'y déposer un souvenir…',
                    border: OutlineInputBorder(),
                  ),
                ),
                const SizedBox(height: 10),
                OutlinedButton.icon(
                  onPressed: _suggestingLieu ? null : _suggestLieuDetails,
                  icon: _suggestingLieu
                      ? const SizedBox(
                          width: 14,
                          height: 14,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Icon(Icons.auto_awesome_rounded, size: 16),
                  label: const Text('Suggérer avec Fitila IA'),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 16),
        SizedBox(
          width: double.infinity,
          child: FilledButton.icon(
            onPressed: _creatingLieu ? null : _submitNewLieu,
            icon: _creatingLieu
                ? const SizedBox(
                    width: 16,
                    height: 16,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      color: Colors.white,
                    ),
                  )
                : const Icon(Icons.add_location_alt_rounded),
            label: const Text('Créer ce lieu'),
          ),
        ),
        const SizedBox(height: 6),
        Center(
          child: Text(
            "Un lieu du même nom existe déjà ? Vous serez redirigé vers celui-ci plutôt que d'en créer un doublon.",
            textAlign: TextAlign.center,
            style: TextStyle(color: _fitilaMuted, fontSize: 10.5),
          ),
        ),
        const SizedBox(height: 24),
      ],
    );
  }

  // 6 — Fil du monde : le geste social qui manquait — voir, à travers
  // tous les lieux, les souvenirs récemment tissés par la communauté,
  // avec leur auteur réel et la possibilité de les aimer.
  Widget _buildWorldFeedStep() {
    return SizedBox(
      width: double.infinity,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              IconButton(
                icon: const Icon(Icons.arrow_back_rounded),
                onPressed: () => setState(() => _step = 1),
              ),
              const Expanded(
                child: Text(
                  'Fil du monde vivant',
                  style: TextStyle(fontWeight: FontWeight.w800, fontSize: 15),
                ),
              ),
              IconButton(
                icon: const Icon(Icons.refresh_rounded),
                onPressed: _loadingWorldFeed ? null : _openWorldFeed,
              ),
            ],
          ),
          Padding(
            padding: const EdgeInsets.only(left: 4, bottom: 8),
            child: Text(
              'Les derniers souvenirs tissés par toute la communauté, tous lieux confondus.',
              style: TextStyle(color: _fitilaMuted, fontSize: 12),
            ),
          ),
          Expanded(
            child: _loadingWorldFeed
                ? const Center(child: CircularProgressIndicator())
                : _worldFeed.isEmpty
                ? Center(
                    child: Text(
                      "Aucun souvenir tissé pour le moment — soyez le premier.",
                      style: TextStyle(color: _fitilaMuted, fontSize: 12.5),
                    ),
                  )
                : ListView.builder(
                    itemCount: _worldFeed.length,
                    itemBuilder: (context, index) => _buildFragmentTile(
                      _worldFeed[index],
                      _worldFeed,
                      showLieu: true,
                    ),
                  ),
          ),
        ],
      ),
    );
  }
}

/// Petit trait tissé entre un point d'ancrage et un nouveau point —
/// purement décoratif (comme le tracé animé de la maquette), pour
/// symboliser un souvenir qui rejoint le tissage collectif.
class _HanduniaTextField extends StatelessWidget {
  const _HanduniaTextField({
    required this.controller,
    this.onChanged,
    this.onSubmitted,
    this.decoration,
    this.maxLines = 1,
    this.maxLength,
  });

  final TextEditingController controller;
  final ValueChanged<String>? onChanged;
  final ValueChanged<String>? onSubmitted;
  final InputDecoration? decoration;
  final int? maxLines;
  final int? maxLength;

  @override
  Widget build(BuildContext context) {
    final base = decoration ?? const InputDecoration();
    return Material(
      color: Colors.transparent,
      child: TextField(
        controller: controller,
        onChanged: onChanged,
        onSubmitted: onSubmitted,
        decoration: base.copyWith(
          filled: true,
          fillColor: const Color(0xFF0E1725),
          hintStyle: const TextStyle(color: Color(0xFF667487)),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(18),
            borderSide: BorderSide(
              color: Colors.white.withValues(alpha: .10),
            ),
          ),
          focusedBorder: const OutlineInputBorder(
            borderRadius: BorderRadius.all(Radius.circular(18)),
            borderSide: BorderSide(color: Color(0xFF8FE3CF), width: 1.4),
          ),
        ),
        style: const TextStyle(color: Colors.white, fontSize: 14),
        cursorColor: const Color(0xFF8FE3CF),
        maxLines: maxLines,
        maxLength: maxLength,
      ),
    );
  }
}


class _HanduniaMetric extends StatelessWidget {
  const _HanduniaMetric({
    required this.icon,
    required this.value,
    required this.label,
  });

  final IconData icon;
  final String value;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: .055),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: Colors.white.withValues(alpha: .08)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: const Color(0xFF8FE3CF)),
          const SizedBox(width: 6),
          Text(
            value,
            style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w900),
          ),
          const SizedBox(width: 4),
          Text(
            label,
            style: TextStyle(
              color: Colors.white.withValues(alpha: .48),
              fontSize: 10,
            ),
          ),
        ],
      ),
    );
  }
}

class _HanduniaPill extends StatelessWidget {
  const _HanduniaPill({required this.icon, required this.label});

  final IconData icon;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: .07),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: Colors.white.withValues(alpha: .09)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 13, color: const Color(0xFF8FE3CF)),
          const SizedBox(width: 6),
          Text(
            label,
            style: const TextStyle(fontSize: 10.5, fontWeight: FontWeight.w800),
          ),
        ],
      ),
    );
  }
}

class _HanduniaTinyBadge extends StatelessWidget {
  const _HanduniaTinyBadge({required this.icon, required this.label});

  final IconData icon;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
      decoration: BoxDecoration(
        color: const Color(0xFF8FE3CF).withValues(alpha: .08),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(
          color: const Color(0xFF8FE3CF).withValues(alpha: .18),
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 10, color: const Color(0xFF8FE3CF)),
          const SizedBox(width: 4),
          Text(
            label,
            style: const TextStyle(
              color: Color(0xFFB9F2E4),
              fontSize: 9,
              fontWeight: FontWeight.w800,
            ),
          ),
        ],
      ),
    );
  }
}

class _WeaveLinePainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final linePaint = Paint()
      ..color = _fitilaPrimary
      ..strokeWidth = 2
      ..style = PaintingStyle.stroke;
    final path = Path()
      ..moveTo(12, size.height - 10)
      ..quadraticBezierTo(size.width * 0.5, 4, size.width - 12, 14);
    canvas.drawPath(path, linePaint);
    final anchorPaint = Paint()..color = _fitilaMuted;
    canvas.drawCircle(Offset(12, size.height - 10), 4, anchorPaint);
    final newPaint = Paint()..color = _fitilaPrimary;
    canvas.drawCircle(Offset(size.width - 12, 14), 5, newPaint);
  }

  @override
  bool shouldRepaint(covariant _WeaveLinePainter oldDelegate) => false;
}

// ─────────────────────────────────────────────────────────────────
// Tuile de sélection utilisée dans le Studio IA du Créateur de contenu
// ─────────────────────────────────────────────────────────────────
class _CreationIaTile extends StatelessWidget {
  const _CreationIaTile({
    required this.emoji,
    required this.title,
    required this.subtitle,
    required this.colorA,
    required this.colorB,
    required this.onTap,
  });

  final String emoji;
  final String title;
  final String subtitle;
  final Color colorA;
  final Color colorB;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      borderRadius: BorderRadius.circular(18),
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(18),
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [colorA, colorB],
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(emoji, style: const TextStyle(fontSize: 24)),
            const SizedBox(height: 10),
            Text(
              title,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.w800,
                fontSize: 13.5,
              ),
            ),
            const SizedBox(height: 3),
            Text(
              subtitle,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(
                color: Colors.white70,
                fontSize: 10.5,
                height: 1.2,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
