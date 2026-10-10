import 'dart:convert';
import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:path_provider/path_provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../core/fitila_backend.dart';
import 'apprendre_audio.dart';
import 'apprendre_ui.dart';
import 'apprendre_voice_analysis.dart';
import 'apprendre_voice_ui.dart';

const _reasonLabels = <String, String>{
  'bruit': 'Bruit de fond',
  'coupure': 'Son coupé',
  'mauvais_mot': 'Mauvais mot',
  'ton_douteux': 'Ton douteux',
  'texte_errone': 'Texte erroné',
  'volume': 'Volume',
  'autre': 'Autre',
};

String _kindLabel(String kind) => switch (kind) {
  'mot' => 'Mot',
  'forme' => 'Forme',
  'exemple' => 'Phrase d’exemple',
  'lecon' => 'Leçon',
  'scene' => 'Scène de vie',
  'proverbe' => 'Proverbe',
  _ => kind,
};

/// Un texte du catalogue à enregistrer.
class _Item {
  const _Item({
    required this.key,
    required this.ba,
    required this.fr,
    required this.kind,
    required this.page,
  });

  final String key;
  final String ba;
  final String fr;
  final String kind;
  final int? page;

  String get hash => key.startsWith('ap:') ? key.substring(3) : key;

  factory _Item.fromRow(Map<String, dynamic> row) => _Item(
    key: row['audio_key'].toString(),
    ba: row['text_ba']?.toString() ?? '',
    fr: row['text_fr']?.toString() ?? '',
    kind: row['kind']?.toString() ?? 'mot',
    page: (row['source_page'] as num?)?.toInt(),
  );
}

/// Signalement d'un texte (faute, ton douteux, traduction).
Future<void> _reportText(BuildContext context, String key) async {
  final messenger = ScaffoldMessenger.maybeOf(context);
  final detail = TextEditingController();
  var kind = 'ton';
  final send = await showDialog<bool>(
    context: context,
    builder: (dialogContext) => StatefulBuilder(
      builder: (dialogContext, setLocal) => AlertDialog(
        title: const Text('Signaler ce texte'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            DropdownButton<String>(
              value: kind,
              isExpanded: true,
              items: const [
                DropdownMenuItem(value: 'ton', child: Text('Ton douteux')),
                DropdownMenuItem(value: 'texte', child: Text('Faute dans le texte')),
                DropdownMenuItem(value: 'traduction', child: Text('Traduction à revoir')),
                DropdownMenuItem(value: 'autre', child: Text('Autre')),
              ],
              onChanged: (value) => setLocal(() => kind = value ?? kind),
            ),
            TextField(
              controller: detail,
              maxLines: 3,
              decoration: const InputDecoration(hintText: 'Précise (facultatif)'),
            ),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.of(dialogContext).pop(false), child: const Text('Annuler')),
          FilledButton(onPressed: () => Navigator.of(dialogContext).pop(true), child: const Text('Envoyer')),
        ],
      ),
    ),
  );
  if (send != true) {
    detail.dispose();
    return;
  }
  try {
    final client = FitilaBackend.client;
    await client.from('apprendre_text_issues').insert({
      'audio_key': key,
      'reporter_id': client.auth.currentUser!.id,
      'kind': kind,
      'detail': detail.text.trim().isEmpty ? null : detail.text.trim(),
    });
    messenger?.showSnackBar(const SnackBar(content: Text('Merci : le texte est signalé à l’équipe.')));
  } catch (_) {
    messenger?.showSnackBar(const SnackBar(content: Text('Signalement impossible pour le moment.')));
  } finally {
    detail.dispose();
  }
}

/// Studio Voix : le locuteur habilité enregistre les textes de ses lots.
class ApVoiceStudioScreen extends StatefulWidget {
  const ApVoiceStudioScreen({super.key});

  @override
  State<ApVoiceStudioScreen> createState() => _ApVoiceStudioScreenState();
}

class _ApVoiceStudioScreenState extends State<ApVoiceStudioScreen> {
  static const _pendingKey = 'fitila_apprendre_studio_pending_v1';

  final ApWavRecorder _recorder = ApWavRecorder();
  bool _loading = true;
  String? _blocker;
  Map<String, dynamic>? _consent;
  Map<String, dynamic> _settings = const {};
  List<_Item> _queue = const [];
  List<Map<String, dynamic>> _toFix = const [];
  Map<String, int> _myStatus = const {};
  String _lotTitle = '';
  int _index = 0;
  bool _recording = false;
  bool _sending = false;
  File? _take;
  ApTakeQuality? _quality;
  List<Map<String, dynamic>> _pending = <Map<String, dynamic>>[];

  _Item? get _current => _index < _queue.length ? _queue[_index] : null;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _recorder.cancel();
    _recorder.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _blocker = null;
    });
    final access = await ApVoiceAccess.load();
    if (!access.loggedIn) {
      _finishLoad(blocker: 'Connecte-toi à ton compte FITILA pour ouvrir le Studio Voix.');
      return;
    }
    if (!access.speaker) {
      _finishLoad(blocker: 'Le Studio Voix est réservé aux locuteurs habilités. Demande le rôle « Locuteur voix » à l’administrateur.');
      return;
    }
    try {
      final client = FitilaBackend.client;
      final prefs = await SharedPreferences.getInstance();
      final pendingRaw = prefs.getString(_pendingKey);
      _pending = pendingRaw == null
          ? <Map<String, dynamic>>[]
          : (jsonDecode(pendingRaw) as List).whereType<Map>().map((m) => m.cast<String, dynamic>()).toList();
      final settings = await client
          .from('apprendre_audio_settings')
          .select('consent_text, consent_version, min_quality_score, default_variant')
          .eq('id', 1)
          .maybeSingle();
      final consent = await client
          .from('apprendre_voice_consents')
          .select()
          .eq('user_id', access.userId!)
          .maybeSingle();
      _settings = settings ?? const {};
      _consent = consent == null || consent['withdrawn_at'] != null ? null : consent;
      if (_consent != null) {
        await _loadQueue(access.userId!);
      }
      _finishLoad();
    } catch (error) {
      _finishLoad(blocker: 'Studio indisponible : $error');
    }
  }

  void _finishLoad({String? blocker}) {
    if (!mounted) {
      return;
    }
    setState(() {
      _blocker = blocker;
      _loading = false;
    });
  }

  Future<void> _loadQueue(String uid) async {
    final client = FitilaBackend.client;
    final voice = _consent?['voice']?.toString() ?? 'femme';
    final mine = await client
        .from('apprendre_audio_takes')
        .select('id, audio_key, status, created_at')
        .eq('speaker_id', uid)
        .order('created_at', ascending: false)
        .limit(2000);
    final status = <String, int>{};
    final done = <String>{};
    final fixIds = <String>[];
    for (final row in mine) {
      final s = row['status'].toString();
      status[s] = (status[s] ?? 0) + 1;
      if (s != 'rejected' && s != 'withdrawn' && s != 'needs_fix') {
        done.add(row['audio_key'].toString());
      }
      if (s == 'rejected' || s == 'needs_fix') {
        fixIds.add(row['id'].toString());
      }
    }
    await ApAudioService.instance.ensureLoaded();
    final lots = await client
        .from('apprendre_audio_assignments')
        .select('title, audio_keys, voice, due_date')
        .eq('speaker_id', uid)
        .eq('status', 'open')
        .order('created_at');
    final keys = <String>[];
    var title = '';
    for (final lot in lots) {
      title = title.isEmpty ? lot['title'].toString() : title;
      for (final key in (lot['audio_keys'] as List? ?? const [])) {
        if (!done.contains(key.toString())) {
          keys.add(key.toString());
        }
      }
    }
    List<Map<String, dynamic>> rows;
    if (keys.isNotEmpty) {
      rows = [];
      for (var i = 0; i < keys.length; i += 200) {
        final chunk = keys.sublist(i, i + 200 > keys.length ? keys.length : i + 200);
        rows.addAll(await client
            .from('apprendre_audio_items')
            .select('audio_key, text_ba, text_fr, kind, source_page, priority')
            .inFilter('audio_key', chunk));
      }
      final order = {for (var i = 0; i < keys.length; i++) keys[i]: i};
      rows.sort((a, b) => (order[a['audio_key']] ?? 0).compareTo(order[b['audio_key']] ?? 0));
    } else {
      title = 'Priorités du catalogue';
      rows = await client
          .from('apprendre_audio_items')
          .select('audio_key, text_ba, text_fr, kind, source_page, priority')
          .eq('in_content', true)
          .order('priority')
          .order('audio_key')
          .range(0, 399);
    }
    final service = ApAudioService.instance;
    final queue = <_Item>[];
    for (final row in rows) {
      final item = _Item.fromRow(row);
      if (done.contains(item.key)) {
        continue;
      }
      final active = service.entryFor(item.ba);
      if (keys.isEmpty && active != null && active.voice == voice) {
        continue;
      }
      queue.add(item);
    }
    var toFix = <Map<String, dynamic>>[];
    if (fixIds.isNotEmpty) {
      final reviews = await client
          .from('apprendre_audio_reviews')
          .select('take_id, decision, reason, comment')
          .inFilter('take_id', fixIds.take(100).toList());
      final byTake = {for (final r in reviews) r['take_id'].toString(): r};
      final fixKeys = <String, String>{
        for (final row in mine)
          if (fixIds.contains(row['id'].toString())) row['id'].toString(): row['audio_key'].toString(),
      };
      final texts = fixKeys.isEmpty
          ? const <Map<String, dynamic>>[]
          : await client
                .from('apprendre_audio_items')
                .select('audio_key, text_ba, text_fr, kind, source_page, priority')
                .inFilter('audio_key', fixKeys.values.toSet().toList());
      final byKey = {for (final t in texts) t['audio_key'].toString(): t};
      toFix = [
        for (final entry in fixKeys.entries)
          if (byKey[entry.value] != null && !done.contains(entry.value))
            {
              'item': byKey[entry.value],
              'reason': byTake[entry.key]?['reason'],
              'comment': byTake[entry.key]?['comment'],
            },
      ];
    }
    _queue = queue;
    _toFix = toFix;
    _myStatus = status;
    _lotTitle = title;
    _index = 0;
  }

  Future<void> _signConsent() async {
    final signed = await Navigator.of(context).push<bool>(
      MaterialPageRoute<bool>(
        builder: (_) => _ConsentScreen(
          text: _settings['consent_text']?.toString() ?? '',
          defaultVariant: _settings['default_variant']?.toString() ?? 'nikki',
        ),
      ),
    );
    if (signed == true) {
      await _load();
    }
  }

  Future<void> _toggleRecord() async {
    if (_recording) {
      final file = await _recorder.stop();
      if (!mounted) {
        return;
      }
      if (file == null) {
        setState(() => _recording = false);
        return;
      }
      final pcm = apDecodeWav(await file.readAsBytes());
      final item = _current;
      if (!mounted) {
        return;
      }
      setState(() {
        _recording = false;
        _take = file;
        _quality = pcm == null || item == null
            ? null
            : apMeasureTake(pcm, expectedSyllables: apSyllableCount(item.ba));
      });
      return;
    }
    try {
      await _recorder.start();
      setState(() {
        _recording = true;
        _take = null;
        _quality = null;
      });
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Microphone indisponible.')),
        );
      }
    }
  }

  Map<String, dynamic> _takeRecord(_Item item, File file, ApTakeQuality q) => {
    'file': file.path,
    'key': item.key,
    'hash': item.hash,
    'duration_ms': q.durationMs,
    'peak_db': double.parse(q.peakDb.toStringAsFixed(1)),
    'rms_db': double.parse(q.rmsDb.toStringAsFixed(1)),
    'snr_db': double.parse(q.snrDb.toStringAsFixed(1)),
    'silence_ratio': double.parse(q.silenceRatio.toStringAsFixed(2)),
    'quality_score': q.score,
  };

  /// Envoie une prise : fichier, ligne « brouillon », puis soumission.
  Future<void> _upload(Map<String, dynamic> record) async {
    final client = FitilaBackend.client;
    final uid = client.auth.currentUser!.id;
    final file = File(record['file'].toString());
    final key = record['key'].toString();
    final path = '$uid/${key.replaceAll(':', '_')}/${DateTime.now().millisecondsSinceEpoch}.wav';
    await client.storage
        .from(ApAudioService.bucket)
        .uploadBinary(path, await file.readAsBytes(), fileOptions: const FileOptions(contentType: 'audio/wav'));
    try {
      final row = await client
          .from('apprendre_audio_takes')
          .insert({
            'audio_key': key,
            'text_hash': record['hash'],
            'speaker_id': uid,
            'voice': _consent?['voice'] ?? 'femme',
            'variant': _consent?['variant'] ?? 'nikki',
            'storage_path': path,
            'mime_type': 'audio/wav',
            'duration_ms': record['duration_ms'],
            'peak_db': record['peak_db'],
            'rms_db': record['rms_db'],
            'snr_db': record['snr_db'],
            'silence_ratio': record['silence_ratio'],
            'quality_score': record['quality_score'],
          })
          .select('id')
          .single();
      await client.rpc('apprendre_submit_take', params: {'_take_id': row['id']});
    } catch (_) {
      await client.storage.from(ApAudioService.bucket).remove([path]);
      rethrow;
    }
  }

  Future<void> _savePending() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_pendingKey, jsonEncode(_pending));
  }

  Future<void> _send() async {
    final item = _current;
    final file = _take;
    final quality = _quality;
    if (item == null || file == null || quality == null) {
      return;
    }
    setState(() => _sending = true);
    // Copie durable : la prise survit à une coupure réseau.
    final dir = await getApplicationSupportDirectory();
    final kept = await file.copy('${dir.path}${Platform.pathSeparator}studio_${DateTime.now().millisecondsSinceEpoch}.wav');
    final record = _takeRecord(item, kept, quality);
    var message = 'Prise envoyée à la validation.';
    try {
      await _upload(record);
      await kept.delete();
    } on PostgrestException catch (error) {
      message = error.message;
      await kept.delete();
    } catch (_) {
      _pending.add(record);
      await _savePending();
      message = 'Pas de réseau : la prise est gardée et partira plus tard.';
    }
    if (!mounted) {
      return;
    }
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message)));
    setState(() {
      _sending = false;
      _take = null;
      _quality = null;
      _index++;
    });
  }

  Future<void> _flushPending() async {
    setState(() => _sending = true);
    var sent = 0;
    final remaining = <Map<String, dynamic>>[];
    for (final record in _pending) {
      try {
        await _upload(record);
        await File(record['file'].toString()).delete();
        sent++;
      } on PostgrestException {
        await File(record['file'].toString()).delete();
      } catch (_) {
        remaining.add(record);
      }
    }
    _pending = remaining;
    await _savePending();
    if (!mounted) {
      return;
    }
    setState(() => _sending = false);
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('$sent prise(s) envoyée(s), ${remaining.length} en attente.')),
    );
  }

  void _skip() {
    setState(() {
      _take = null;
      _quality = null;
      _index++;
    });
  }

  void _redo(Map<String, dynamic> item) {
    setState(() {
      _queue = [_Item.fromRow(item), ..._queue.skip(_index)];
      _index = 0;
      _take = null;
      _quality = null;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: ApColors.ivory,
      body: SafeArea(
        child: Column(
          children: [
            ApTopBar(
              title: 'Studio Voix',
              subtitle: _consent == null
                  ? 'Voix de référence du bàátɔ̀nú'
                  : '${_consent!['display_name'] ?? 'Locuteur'} · voix ${_consent!['voice']} · ${_consent!['variant']}',
              trailing: _loading
                  ? null
                  : ApRoundIconButton(icon: Icons.refresh_rounded, tooltip: 'Actualiser', onPressed: _load),
            ),
            Expanded(child: _body()),
          ],
        ),
      ),
    );
  }

  Widget _body() {
    if (_loading) {
      return const Center(child: CircularProgressIndicator(color: ApColors.gold));
    }
    final blocker = _blocker;
    if (blocker != null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Text(blocker, textAlign: TextAlign.center, style: ApText.body),
        ),
      );
    }
    if (_consent == null) {
      return ListView(
        padding: const EdgeInsets.all(20),
        children: [
          const Icon(Icons.record_voice_over_rounded, size: 48, color: ApColors.goldDeep),
          const SizedBox(height: 12),
          Text('Studio Voix', style: ApText.display.copyWith(fontSize: 22)),
          const SizedBox(height: 6),
          const Text('Active ton rôle une seule fois, puis commence.', style: ApText.small),
          const SizedBox(height: 14),
          ApPrimaryButton(label: 'Activer et enregistrer', icon: Icons.mic_rounded, onPressed: _signConsent),
        ],
      );
    }
    final item = _current;
    final quality = _quality;
    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 4, 20, 28),
      children: [
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            ApPill('${_queue.length - _index} à enregistrer', icon: Icons.mic_rounded),
            ApPill(
              '${_myStatus['submitted'] ?? 0} en validation',
              icon: Icons.hourglass_top_rounded,
              background: ApColors.surfaceAlt,
              foreground: ApColors.inkSoft,
            ),
            ApPill(
              '${_myStatus['approved'] ?? 0} approuvées',
              icon: Icons.check_rounded,
              background: ApColors.sageTint,
              foreground: ApColors.sageInk,
            ),
          ],
        ),
        if (_pending.isNotEmpty) ...[
          const SizedBox(height: 12),
          ApSecondaryButton(
            label: 'Envoyer les ${_pending.length} prise(s) en attente',
            icon: Icons.cloud_upload_rounded,
            onPressed: _sending ? null : _flushPending,
          ),
        ],
        const SizedBox(height: 16),
        Text(_lotTitle.toUpperCase(), style: ApText.label.copyWith(color: ApColors.goldDeep)),
        const SizedBox(height: 8),
        if (item == null)
          ApCardBox(
            child: Text(
              'Lot terminé. Merci ! Actualise pour recevoir de nouveaux textes.',
              style: ApText.body.copyWith(color: ApColors.inkSoft),
            ),
          )
        else ...[
          ApCardBox(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    ApPill(_kindLabel(item.kind), background: ApColors.surfaceAlt, foreground: ApColors.quiet),
                    const SizedBox(width: 8),
                    if (item.page != null)
                      ApPill('Dictionnaire, p. ${item.page}', background: ApColors.surfaceAlt, foreground: ApColors.quiet),
                    const Spacer(),
                    Text('${_index + 1} / ${_queue.length}', style: ApText.small),
                  ],
                ),
                const SizedBox(height: 14),
                Text(item.ba, style: ApText.bariba.copyWith(fontSize: 30)),
                const SizedBox(height: 6),
                Text(item.fr, style: ApText.body.copyWith(color: ApColors.quiet)),
              ],
            ),
          ),
          const SizedBox(height: 18),
          Center(
            child: GestureDetector(
              onTap: _sending ? null : _toggleRecord,
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 200),
                width: 92,
                height: 92,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: _recording ? ApColors.clay : ApColors.gold,
                  boxShadow: [
                    BoxShadow(
                      color: (_recording ? ApColors.clay : ApColors.gold).withValues(alpha: .22),
                      spreadRadius: _recording ? 14 : 8,
                    ),
                  ],
                ),
                child: Icon(
                  _recording ? Icons.stop_rounded : Icons.mic_rounded,
                  size: 40,
                  color: _recording ? Colors.white : ApColors.goldInk,
                ),
              ),
            ),
          ),
          const SizedBox(height: 10),
          Text(
            _recording
                ? 'Enregistrement…'
                : _take == null
                ? 'Appuie puis lis le texte.'
                : 'Réécoute avant d’envoyer.',
            textAlign: TextAlign.center,
            style: ApText.small.copyWith(color: ApColors.inkSoft),
          ),
          if (quality != null) ...[
            const SizedBox(height: 14),
            _QualityCard(quality: quality),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: ApSecondaryButton(
                    label: 'Réécouter',
                    icon: Icons.play_arrow_rounded,
                    onPressed: () => ApAudioService.instance.playFile(_take!.path),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: ApSecondaryButton(label: 'Refaire', icon: Icons.replay_rounded, onPressed: _toggleRecord),
                ),
              ],
            ),
            const SizedBox(height: 10),
            ApPrimaryButton(
              label: _sending ? 'Envoi…' : 'Envoyer à la validation',
              icon: Icons.send_rounded,
              onPressed: _sending || quality.score < ((_settings['min_quality_score'] as num?)?.toInt() ?? 60)
                  ? null
                  : _send,
            ),
          ],
          const SizedBox(height: 10),
          Row(
            children: [
              Expanded(
                child: TextButton.icon(
                  onPressed: _skip,
                  icon: const Icon(Icons.skip_next_rounded),
                  label: const Text('Passer'),
                ),
              ),
              Expanded(
                child: TextButton.icon(
                  onPressed: () => _reportText(context, item.key),
                  icon: const Icon(Icons.flag_rounded),
                  label: const Text('Signaler le texte'),
                ),
              ),
            ],
          ),
        ],
        if (_toFix.isNotEmpty) ...[
          const ApSectionTitle('À refaire'),
          for (final fix in _toFix.take(20))
            Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: ApCardBox(
                padding: const EdgeInsets.all(12),
                onTap: () => _redo((fix['item'] as Map).cast<String, dynamic>()),
                child: Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text((fix['item'] as Map)['text_ba'].toString(), style: ApText.bariba.copyWith(fontSize: 16)),
                          Text(
                            [
                              _reasonLabels[fix['reason']] ?? 'À corriger',
                              if ((fix['comment'] ?? '').toString().isNotEmpty) fix['comment'].toString(),
                            ].join(' · '),
                            style: ApText.small.copyWith(color: ApColors.clayInk),
                          ),
                        ],
                      ),
                    ),
                    const Icon(Icons.replay_rounded, color: ApColors.goldDeep),
                  ],
                ),
              ),
            ),
        ],
      ],
    );
  }
}

class _QualityCard extends StatelessWidget {
  const _QualityCard({required this.quality});

  final ApTakeQuality quality;

  @override
  Widget build(BuildContext context) {
    final good = quality.acceptable;
    return ApCardBox(
      padding: const EdgeInsets.all(14),
      color: good ? ApColors.sageTint : ApColors.clayTint,
      borderColor: good ? ApColors.sage : ApColors.clay,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(good ? Icons.check_circle_rounded : Icons.error_rounded, color: good ? ApColors.sageInk : ApColors.clayInk),
              const SizedBox(width: 8),
              Text(
                'Qualité ${quality.score} / 100',
                style: ApText.body.copyWith(fontWeight: FontWeight.w800, color: good ? ApColors.sageInk : ApColors.clayInk),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            'Durée ${(quality.durationMs / 1000).toStringAsFixed(1)} s · crête ${quality.peakDb.toStringAsFixed(0)} dB · bruit −${quality.snrDb.toStringAsFixed(0)} dB',
            style: ApText.small,
          ),
          for (final problem in quality.problems)
            Padding(
              padding: const EdgeInsets.only(top: 4),
              child: Text('• $problem', style: ApText.small.copyWith(color: ApColors.clayInk)),
            ),
        ],
      ),
    );
  }
}

/// Accord d'utilisation de la voix (signé par le contributeur lui-même).
class _ConsentScreen extends StatefulWidget {
  const _ConsentScreen({required this.text, required this.defaultVariant});

  final String text;
  final String defaultVariant;

  @override
  State<_ConsentScreen> createState() => _ConsentScreenState();
}

class _ConsentScreenState extends State<_ConsentScreen> {
  final TextEditingController _name = TextEditingController();
  late final TextEditingController _variant = TextEditingController(text: widget.defaultVariant);
  bool _showName = false;
  bool _allowAi = false;
  bool _agree = false;
  String _voice = 'femme';
  bool _saving = false;

  @override
  void dispose() {
    _name.dispose();
    _variant.dispose();
    super.dispose();
  }

  Future<void> _sign() async {
    setState(() => _saving = true);
    try {
      await FitilaBackend.client.rpc('apprendre_sign_consent', params: {
        '_display_name': _name.text.trim().isEmpty ? null : _name.text.trim(),
        '_show_name': _showName,
        '_allow_ai_training': _allowAi,
        '_voice': _voice,
        '_variant': _variant.text.trim().isEmpty ? widget.defaultVariant : _variant.text.trim().toLowerCase(),
      });
      if (mounted) {
        Navigator.of(context).pop(true);
      }
    } catch (error) {
      if (mounted) {
        setState(() => _saving = false);
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Signature impossible : $error')));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: ApColors.ivory,
      body: SafeArea(
        child: Column(
          children: [
            const ApTopBar(title: 'Accord voix', subtitle: 'Activation rapide'),
            Expanded(
              child: ListView(
                padding: const EdgeInsets.fromLTRB(20, 4, 20, 24),
                children: [
                  ApCardBox(
                    child: ExpansionTile(
                      tilePadding: EdgeInsets.zero,
                      childrenPadding: const EdgeInsets.only(bottom: 8),
                      title: const Text('Voix de référence FITILA', style: TextStyle(fontWeight: FontWeight.w800)),
                      subtitle: const Text('Retrait possible à tout moment', style: TextStyle(fontSize: 12)),
                      children: [Text(widget.text, style: ApText.small)],
                    ),
                  ),
                  const SizedBox(height: 16),
                  TextField(
                    controller: _name,
                    decoration: const InputDecoration(labelText: 'Nom affiché (facultatif)'),
                  ),
                  SwitchListTile(
                    value: _showName,
                    onChanged: (v) => setState(() => _showName = v),
                    title: const Text('Afficher mon nom aux apprenants'),
                    contentPadding: EdgeInsets.zero,
                  ),
                  const SizedBox(height: 6),
                  const Text('Ma voix', style: ApText.label),
                  const SizedBox(height: 6),
                  SegmentedButton<String>(
                    segments: const [
                      ButtonSegment(value: 'femme', label: Text('Femme')),
                      ButtonSegment(value: 'homme', label: Text('Homme')),
                    ],
                    selected: {_voice},
                    onSelectionChanged: (s) => setState(() => _voice = s.first),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: _variant,
                    decoration: const InputDecoration(labelText: 'Variante régionale (ex. nikki, parakou, kandi)'),
                  ),
                  SwitchListTile(
                    value: _allowAi,
                    onChanged: (v) => setState(() => _allowAi = v),
                    title: const Text('J’accepte aussi que ma voix aide à entraîner les modèles vocaux de FITILA'),
                    subtitle: const Text('Facultatif, modifiable à tout moment'),
                    contentPadding: EdgeInsets.zero,
                  ),
                  CheckboxListTile(
                    value: _agree,
                    onChanged: (v) => setState(() => _agree = v ?? false),
                    title: const Text('J’ai lu et j’accepte l’accord ci-dessus'),
                    contentPadding: EdgeInsets.zero,
                    controlAffinity: ListTileControlAffinity.leading,
                  ),
                  const SizedBox(height: 12),
                  ApPrimaryButton(
                    label: _saving ? 'Signature…' : 'Signer et commencer',
                    icon: Icons.draw_rounded,
                    onPressed: _agree && !_saving ? _sign : null,
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

/// File de validation : un validateur écoute et juge les prises des autres.
class ApVoiceReviewScreen extends StatefulWidget {
  const ApVoiceReviewScreen({super.key});

  @override
  State<ApVoiceReviewScreen> createState() => _ApVoiceReviewScreenState();
}

class _ApVoiceReviewScreenState extends State<ApVoiceReviewScreen> {
  bool _loading = true;
  String? _blocker;
  List<Map<String, dynamic>> _takes = const [];
  Map<String, Map<String, dynamic>> _items = const {};
  int _index = 0;
  File? _file;
  List<double?> _contour = const [];
  ApVoiceComparison? _vsActive;
  final Map<String, int> _scores = {'clarity': 4, 'tone': 4, 'natural': 4, 'noise': 4};
  bool _toneConfirmed = false;
  String? _reason;
  final TextEditingController _comment = TextEditingController();
  bool _sending = false;

  Map<String, dynamic>? get _take => _index < _takes.length ? _takes[_index] : null;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _comment.dispose();
    ApAudioService.instance.stop();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _blocker = null;
    });
    final access = await ApVoiceAccess.load();
    if (!access.reviewer) {
      if (mounted) {
        setState(() {
          _loading = false;
          _blocker = access.loggedIn
              ? 'La validation est réservée au rôle « Validateur voix ».'
              : 'Connecte-toi pour valider des voix.';
        });
      }
      return;
    }
    try {
      final client = FitilaBackend.client;
      await ApAudioService.instance.ensureLoaded();
      final takes = await client
          .from('apprendre_audio_takes')
          .select('id, audio_key, voice, variant, storage_path, duration_ms, quality_score, snr_db, submitted_at')
          .eq('status', 'submitted')
          .neq('speaker_id', access.userId!)
          .order('submitted_at')
          .limit(40);
      final keys = {for (final t in takes) t['audio_key'].toString()}.toList();
      final items = keys.isEmpty
          ? const <Map<String, dynamic>>[]
          : await client
                .from('apprendre_audio_items')
                .select('audio_key, text_ba, text_fr, kind, source_page')
                .inFilter('audio_key', keys);
      if (!mounted) {
        return;
      }
      setState(() {
        _takes = takes;
        _items = {for (final i in items) i['audio_key'].toString(): i};
        _index = 0;
        _loading = false;
      });
      await _prepare();
    } catch (error) {
      if (mounted) {
        setState(() {
          _loading = false;
          _blocker = 'File indisponible : $error';
        });
      }
    }
  }

  /// Télécharge la prise courante, trace sa mélodie et la compare à la voix active.
  Future<void> _prepare() async {
    final take = _take;
    if (take == null) {
      return;
    }
    setState(() {
      _file = null;
      _contour = const [];
      _vsActive = null;
      _scores.updateAll((_, _) => 4);
      _toneConfirmed = false;
      _reason = null;
      _comment.clear();
    });
    try {
      final bytes = await FitilaBackend.client.storage.from(ApAudioService.bucket).download(take['storage_path'].toString());
      final dir = await getTemporaryDirectory();
      final file = File('${dir.path}${Platform.pathSeparator}review_${take['id']}.wav');
      await file.writeAsBytes(bytes, flush: true);
      final pcm = apDecodeWav(bytes);
      final contour = pcm == null ? const <double?>[] : apSemitones(apPitch(apTrimSilence(pcm.samples)));
      ApVoiceComparison? vsActive;
      final text = _items[take['audio_key']]?['text_ba']?.toString();
      final service = ApAudioService.instance;
      final active = text == null ? null : service.entryFor(text);
      if (active != null) {
        final reference = await service.fileFor(active);
        if (reference != null) {
          vsActive = await compute(
            apCompareVoicesIsolate,
            ApCompareRequest(await reference.readAsBytes(), bytes, service.compareSettings),
          );
        }
      }
      if (!mounted) {
        return;
      }
      setState(() {
        _file = file;
        _contour = contour;
        _vsActive = vsActive;
      });
      await service.playFile(file.path);
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Prise illisible.')));
      }
    }
  }

  Future<void> _decide(String decision) async {
    final take = _take;
    if (take == null) {
      return;
    }
    if (decision != 'approve' && _reason == null) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Choisis un motif.')));
      return;
    }
    setState(() => _sending = true);
    try {
      await FitilaBackend.client.rpc('apprendre_review_take', params: {
        '_take_id': take['id'],
        '_decision': decision,
        '_score_clarity': _scores['clarity'],
        '_score_tone': _scores['tone'],
        '_score_natural': _scores['natural'],
        '_score_noise': _scores['noise'],
        '_reason': decision == 'approve' ? null : _reason,
        '_tone_confirmed': _toneConfirmed,
        '_comment': _comment.text.trim().isEmpty ? null : _comment.text.trim(),
      });
      if (!mounted) {
        return;
      }
      setState(() {
        _sending = false;
        _index++;
      });
      await _prepare();
    } catch (error) {
      if (mounted) {
        setState(() => _sending = false);
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Avis refusé : $error')));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: ApColors.ivory,
      body: SafeArea(
        child: Column(
          children: [
            ApTopBar(
              title: 'Validation des voix',
              subtitle: _takes.isEmpty ? 'Prises soumises par les locuteurs' : '${_takes.length - _index} prise(s) en attente',
              trailing: ApRoundIconButton(icon: Icons.refresh_rounded, tooltip: 'Actualiser', onPressed: _load),
            ),
            Expanded(child: _body()),
          ],
        ),
      ),
    );
  }

  Widget _scoreRow(String key, String label) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Row(
        children: [
          SizedBox(width: 80, child: Text(label, style: ApText.small.copyWith(fontWeight: FontWeight.w700))),
          for (var v = 1; v <= 5; v++)
            Padding(
              padding: const EdgeInsets.only(right: 4),
              child: ChoiceChip(
                label: Text('$v'),
                selected: _scores[key] == v,
                visualDensity: VisualDensity.compact,
                selectedColor: ApColors.goldTint,
                onSelected: (_) => setState(() => _scores[key] = v),
              ),
            ),
        ],
      ),
    );
  }

  Widget _body() {
    if (_loading) {
      return const Center(child: CircularProgressIndicator(color: ApColors.gold));
    }
    final blocker = _blocker;
    if (blocker != null) {
      return Center(child: Padding(padding: const EdgeInsets.all(24), child: Text(blocker, textAlign: TextAlign.center, style: ApText.body)));
    }
    final take = _take;
    if (take == null) {
      return const Center(
        child: Padding(
          padding: EdgeInsets.all(24),
          child: Text('Aucune prise à valider. Merci !', textAlign: TextAlign.center, style: ApText.body),
        ),
      );
    }
    final item = _items[take['audio_key']] ?? const <String, dynamic>{};
    final file = _file;
    final vs = _vsActive;
    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 4, 20, 28),
      children: [
        ApCardBox(
          padding: const EdgeInsets.all(18),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  ApPill(_kindLabel(item['kind']?.toString() ?? ''), background: ApColors.surfaceAlt, foreground: ApColors.quiet),
                  const SizedBox(width: 8),
                  ApPill('Voix ${take['voice']} · ${take['variant']}', background: ApColors.surfaceAlt, foreground: ApColors.quiet),
                  const Spacer(),
                  Text('${_index + 1} / ${_takes.length}', style: ApText.small),
                ],
              ),
              const SizedBox(height: 12),
              Text(item['text_ba']?.toString() ?? '', style: ApText.bariba.copyWith(fontSize: 28)),
              const SizedBox(height: 4),
              Text(item['text_fr']?.toString() ?? '', style: ApText.body.copyWith(color: ApColors.quiet)),
              if (item['source_page'] != null) ...[
                const SizedBox(height: 6),
                ApSourceTag('Dictionnaire, p. ${item['source_page']}'),
              ],
            ],
          ),
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            Expanded(
              child: ApPrimaryButton(
                label: 'Écouter',
                icon: Icons.play_arrow_rounded,
                onPressed: file == null ? null : () => ApAudioService.instance.playFile(file.path),
              ),
            ),
            const SizedBox(width: 10),
            ApRoundIconButton(
              icon: Icons.slow_motion_video_rounded,
              tooltip: 'Écouter au ralenti',
              onPressed: file == null ? null : () => ApAudioService.instance.playFile(file.path, rate: 0.75),
            ),
          ],
        ),
        const SizedBox(height: 10),
        Text(
          'Qualité auto ${take['quality_score'] ?? '—'} · durée ${(((take['duration_ms'] as num?) ?? 0) / 1000).toStringAsFixed(1)} s · signal/bruit ${take['snr_db'] ?? '—'} dB',
          style: ApText.small,
        ),
        if (_contour.isNotEmpty) ...[
          const SizedBox(height: 10),
          ApCardBox(
            padding: const EdgeInsets.all(12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Mélodie de la prise', style: ApText.small.copyWith(fontWeight: FontWeight.w700)),
                const SizedBox(height: 6),
                SizedBox(
                  height: 90,
                  child: CustomPaint(
                    size: Size.infinite,
                    painter: ApContourPainter(
                      reference: vs?.referenceContour ?? _contour,
                      learner: vs?.learnerContour ?? const [],
                      highlight: vs != null,
                    ),
                  ),
                ),
                if (vs != null)
                  Text(
                    'Comparée à la voix active : ${vs.verdictLabel} (${vs.total}). Or : voix active ; sombre : cette prise.',
                    style: ApText.small.copyWith(fontSize: 11.5),
                  ),
              ],
            ),
          ),
        ],
        const ApSectionTitle('Ton avis'),
        _scoreRow('clarity', 'Clarté'),
        _scoreRow('tone', 'Tons'),
        _scoreRow('natural', 'Naturel'),
        _scoreRow('noise', 'Propreté'),
        CheckboxListTile(
          value: _toneConfirmed,
          onChanged: (v) => setState(() => _toneConfirmed = v ?? false),
          title: const Text('Je confirme les tons de ce texte'),
          contentPadding: EdgeInsets.zero,
          controlAffinity: ListTileControlAffinity.leading,
        ),
        DropdownButton<String>(
          value: _reason,
          isExpanded: true,
          hint: const Text('Motif (obligatoire pour corriger ou rejeter)'),
          items: [
            for (final entry in _reasonLabels.entries)
              DropdownMenuItem(value: entry.key, child: Text(entry.value)),
          ],
          onChanged: (value) => setState(() => _reason = value),
        ),
        TextField(
          controller: _comment,
          maxLines: 2,
          decoration: const InputDecoration(hintText: 'Commentaire pour le locuteur (facultatif)'),
        ),
        const SizedBox(height: 14),
        ApPrimaryButton(
          label: 'Approuver',
          icon: Icons.check_rounded,
          onPressed: _sending || file == null ? null : () => _decide('approve'),
        ),
        const SizedBox(height: 10),
        Row(
          children: [
            Expanded(
              child: ApSecondaryButton(
                label: 'À corriger',
                icon: Icons.build_rounded,
                onPressed: _sending ? null : () => _decide('needs_fix'),
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: ApSecondaryButton(
                label: 'Rejeter',
                icon: Icons.close_rounded,
                onPressed: _sending ? null : () => _decide('reject'),
              ),
            ),
          ],
        ),
        const SizedBox(height: 8),
        TextButton.icon(
          onPressed: () => _reportText(context, take['audio_key'].toString()),
          icon: const Icon(Icons.flag_rounded),
          label: const Text('Signaler le texte'),
        ),
      ],
    );
  }
}
