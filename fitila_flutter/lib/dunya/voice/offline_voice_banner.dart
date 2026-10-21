import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../core/fitila_backend.dart';
import '../../core/signature_theme.dart';
import 'dunya_shared_speech.dart';
import 'dunya_voice_pack.dart';

/// Bandeau visible dès l'accueil (pas enfoui dans les réglages Apprendre)
/// proposant d'installer la voix Bàátɔ̀nú hors-ligne (pack DUNYA) qui fait
/// marcher la lecture vocale partout — dictionnaire, traducteur, Classe,
/// Apprendre — sans connexion. Invisible dès que le pack est installé, ou
/// après que la personne l'a explicitement écarté.
class OfflineVoiceBanner extends StatefulWidget {
  const OfflineVoiceBanner({super.key});

  @override
  State<OfflineVoiceBanner> createState() => _OfflineVoiceBannerState();
}

enum _BannerStage { checking, offer, downloading, error, hidden }

class _OfflineVoiceBannerState extends State<OfflineVoiceBanner> {
  static const _dismissedKey = 'offline_voice_banner_dismissed_v1';

  _BannerStage _stage = _BannerStage.checking;
  double? _progress;
  String _detail = '';
  String? _error;
  int? _sizeBytes;

  @override
  void initState() {
    super.initState();
    _check();
  }

  Future<void> _check() async {
    // Build/tests sans configuration serveur (dart-define) : pas d'appel
    // réseau ni de canal plateforme en arrière-plan (voir AuthGate._restore).
    // Affectation directe (pas setState) : on est encore dans la portion
    // synchrone d'initState, avant la première construction du widget.
    if (!FitilaBackend.configured) {
      _stage = _BannerStage.hidden;
      return;
    }
    final dismissed = await _loadDismissed();
    final paths = await DunyaSharedSpeech.instance.refresh();
    if (!mounted) return;
    if (paths.canSpeakBariba || dismissed) {
      setState(() => _stage = _BannerStage.hidden);
      return;
    }
    setState(() => _stage = _BannerStage.offer);
    // La taille indicative n'est demandée qu'au moment où la personne
    // appuie sur « Télécharger » (voir [_confirmAndDownload]), jamais en
    // arrière-plan au simple affichage du bandeau.
  }

  Future<bool> _loadDismissed() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      return prefs.getBool(_dismissedKey) ?? false;
    } catch (_) {
      return false;
    }
  }

  Future<void> _dismiss() async {
    setState(() => _stage = _BannerStage.hidden);
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setBool(_dismissedKey, true);
    } catch (_) {}
  }

  String get _sizeLabel => _sizeBytes == null ? '' : ' (~${(_sizeBytes! / (1024 * 1024)).toStringAsFixed(0)} Mo)';

  Future<void> _confirmAndDownload() async {
    // Taille indicative demandée seulement ici, sur l'action explicite de la
    // personne — jamais en arrière-plan. Échoue en silence hors connexion :
    // le dialogue s'affiche quand même, sans la taille.
    if (_sizeBytes == null) {
      try {
        final source = dunyaVoicePackSources.firstWhere((s) => s.id == dunyaVoiceCorePackId);
        final size = await DunyaVoicePackManager.instance.remoteSize(source).timeout(const Duration(seconds: 6));
        if (mounted) setState(() => _sizeBytes = size);
      } catch (_) {}
      if (!mounted) return;
    }
    final go = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Activer la voix hors-ligne'),
        content: Text(
          'Télécharger la voix Bàátɔ̀nú$_sizeLabel pour que la lecture vocale '
          'fonctionne partout sans connexion (dictionnaire, traducteur, Classe, '
          'Apprendre). Conseillé en Wi-Fi. Si la connexion coupe, relancer '
          'reprend là où ça s’est arrêté.',
        ),
        actions: [
          TextButton(onPressed: () => Navigator.of(dialogContext).pop(false), child: const Text('Plus tard')),
          FilledButton(onPressed: () => Navigator.of(dialogContext).pop(true), child: const Text('Télécharger')),
        ],
      ),
    );
    if (go != true || !mounted) return;
    await _download();
  }

  Future<void> _download() async {
    setState(() {
      _stage = _BannerStage.downloading;
      _progress = null;
      _detail = 'Préparation…';
      _error = null;
    });
    try {
      final source = dunyaVoicePackSources.firstWhere((s) => s.id == dunyaVoiceCorePackId);
      await DunyaVoicePackManager.instance.download(
        source,
        onProgress: (p) {
          if (!mounted) return;
          setState(() {
            _progress = p.fraction;
            _detail = switch (p.stage) {
              'download' => 'Téléchargement · ${p.detail}',
              'extract' => 'Installation…',
              'verify' => 'Vérification…',
              _ => p.detail,
            };
          });
        },
      );
      await DunyaSharedSpeech.instance.refresh();
      if (!mounted) return;
      setState(() => _stage = _BannerStage.hidden);
    } on DunyaPackException catch (e) {
      if (!mounted) return;
      setState(() {
        _stage = _BannerStage.error;
        _error = e.message;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _stage = _BannerStage.error;
        _error = 'Téléchargement interrompu ($e).';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedSize(
      duration: const Duration(milliseconds: 240),
      curve: Curves.easeOutCubic,
      alignment: Alignment.topCenter,
      child: switch (_stage) {
        _BannerStage.checking || _BannerStage.hidden => const SizedBox(width: double.infinity),
        _BannerStage.offer => _card(
          icon: Icons.record_voice_over_rounded,
          text: 'Activez la voix Bàátɔ̀nú hors-ligne$_sizeLabel pour l’avoir partout sans connexion.',
          action: ('Télécharger', _confirmAndDownload),
          onDismiss: _dismiss,
        ),
        _BannerStage.downloading => _card(
          icon: Icons.downloading_rounded,
          text: _detail.isEmpty ? 'Téléchargement de la voix hors-ligne…' : _detail,
          progress: _progress,
        ),
        _BannerStage.error => _card(
          icon: Icons.error_outline_rounded,
          text: _error ?? 'Téléchargement interrompu.',
          action: ('Réessayer', _download),
          onDismiss: _dismiss,
          tone: SignatureTheme.clay,
          toneTint: SignatureTheme.clayTint,
        ),
      },
    );
  }

  Widget _card({
    required IconData icon,
    required String text,
    (String, Future<void> Function())? action,
    VoidCallback? onDismiss,
    double? progress,
    Color tone = SignatureTheme.goldDeep,
    Color toneTint = SignatureTheme.goldTint,
  }) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(14, 4, 14, 6),
      child: Container(
        key: const ValueKey('offline-voice-banner'),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        decoration: BoxDecoration(color: toneTint, borderRadius: BorderRadius.circular(16)),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Icon(icon, size: 18, color: tone),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(text, style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700, color: tone)),
                ),
                if (onDismiss != null)
                  InkWell(
                    onTap: onDismiss,
                    borderRadius: BorderRadius.circular(99),
                    child: Icon(Icons.close_rounded, size: 16, color: tone),
                  ),
              ],
            ),
            if (progress != null || _stage == _BannerStage.downloading) ...[
              const SizedBox(height: 8),
              ClipRRect(
                borderRadius: BorderRadius.circular(99),
                child: LinearProgressIndicator(value: progress, minHeight: 6, backgroundColor: Colors.white, color: tone),
              ),
            ],
            if (action != null) ...[
              const SizedBox(height: 8),
              Align(
                alignment: Alignment.centerRight,
                child: FilledButton(
                  style: FilledButton.styleFrom(backgroundColor: tone, minimumSize: const Size(0, 34), padding: const EdgeInsets.symmetric(horizontal: 14)),
                  onPressed: action.$2,
                  child: Text(action.$1, style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w800)),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
