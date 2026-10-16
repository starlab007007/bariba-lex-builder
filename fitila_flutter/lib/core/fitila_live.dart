import 'dart:async';

import 'package:flutter_webrtc/flutter_webrtc.dart' as rtc;

import 'fitila_backend.dart';

/// Rôle tenu par ce client dans un direct Live Griot IA.
enum FitilaLiveRole { host, viewer }

/// Moteur de diffusion en direct audio multi-spectateurs, basé sur un
/// maillage WebRTC (flutter_webrtc) : le host ouvre une connexion
/// pair-à-pair distincte vers chaque spectateur connecté. Aucun
/// serveur média tiers n'est nécessaire : la signalisation (offres et
/// réponses SDP, candidats ICE) transite par de simples lignes
/// Postgres (table tamtam_live_signals) livrées en temps réel via
/// Supabase Realtime, et la découverte des spectateurs par la table
/// tamtam_live_viewers déjà existante.
///
/// Le moteur utilise toujours deux serveurs STUN publics et ajoute, lorsqu'il
/// est configuré, des identifiants TURN temporaires délivrés par Supabase.
/// Le maillage reste dimensionné pour un public restreint (de l'ordre d'une
/// dizaine de spectateurs
/// simultanés — chaque spectateur ajoute une connexion sortante côté
/// host). Au-delà, une infrastructure SFU dédiée
/// (LiveKit, Agora…) serait nécessaire ; ce choix impliquerait un
/// compte et des identifiants tiers que seul le porteur du projet
/// peut créer, et reste hors périmètre de cette première version.
class FitilaLiveEngine {
  FitilaLiveEngine({required this.liveId, required this.role});

  final String liveId;
  final FitilaLiveRole role;

  static const List<Map<String, dynamic>> _baseIceServers = [
    {'urls': 'stun:stun.l.google.com:19302'},
    {'urls': 'stun:stun1.l.google.com:19302'},
  ];

  Map<String, dynamic> _iceConfiguration = const {
    'iceServers': _baseIceServers,
  };

  rtc.MediaStream? localStream;

  final Map<String, rtc.RTCPeerConnection> _peerConnections = {};
  final Map<String, List<rtc.RTCIceCandidate>> _pendingCandidates = {};
  final Set<String> _remoteDescriptionReady = {};
  final Set<String> _handledSignalIds = {};
  final Set<String> _processingSignalIds = {};
  final Map<String, rtc.MediaStream> _remoteStreams = {};

  StreamSubscription<List<Map<String, dynamic>>>? _signalSub;
  StreamSubscription<List<Map<String, dynamic>>>? _viewerSub;

  final _remoteStreamsController =
      StreamController<Map<String, rtc.MediaStream>>.broadcast();

  /// Émet la carte complète (id spectateur ou host → flux audio) à
  /// chaque changement — un flux entrant apparaît ou disparaît.
  Stream<Map<String, rtc.MediaStream>> get remoteStreams =>
      _remoteStreamsController.stream;

  final _peerCountController = StreamController<int>.broadcast();

  /// Nombre de connexions pair-à-pair actives (spectateurs connectés
  /// côté host, ou 0/1 côté spectateur selon l'état de la connexion
  /// au host).
  Stream<int> get peerCount => _peerCountController.stream;

  String? get _selfId => FitilaBackend.client.auth.currentUser?.id;

  bool _started = false;
  bool _disposed = false;
  bool _usingTurn = false;

  /// Vrai quand l'Edge Function a fourni au moins un relais TURN temporaire
  /// pour cette session. L'UI peut ainsi distinguer un direct relayable d'un
  /// simple fallback STUN sans exposer les identifiants du serveur.
  bool get usingTurn => _usingTurn;

  Future<void> start() async {
    if (_started) return;
    _started = true;
    final selfId = _selfId;
    if (selfId == null) {
      throw StateError('Connexion requise pour rejoindre ce direct.');
    }

    final iceServers = <Map<String, dynamic>>[
      ..._baseIceServers.map(Map<String, dynamic>.from),
    ];
    try {
      final turnServers = await FitilaBackend.fetchLiveTurnServers().timeout(
        const Duration(seconds: 6),
      );
      _usingTurn = turnServers.isNotEmpty;
      iceServers.addAll(turnServers);
    } catch (_) {
      // TURN est une amélioration de connectivité : STUN garde le direct
      // utilisable lorsque le service temporaire est absent ou hors ligne.
    }
    _iceConfiguration = {'iceServers': iceServers};

    if (role == FitilaLiveRole.host) {
      localStream = await rtc.navigator.mediaDevices.getUserMedia({
        'audio': true,
        'video': false,
      });
      _viewerSub = FitilaBackend.streamLiveViewers(liveId).listen((rows) {
        final viewerIds = rows
            .map((row) => row['user_id']?.toString())
            .whereType<String>()
            .where((id) => id != selfId)
            .toSet();
        for (final viewerId in viewerIds) {
          if (!_peerConnections.containsKey(viewerId)) {
            _createOfferFor(viewerId);
          }
        }
        final departed = _peerConnections.keys
            .where((id) => !viewerIds.contains(id))
            .toList(growable: false);
        for (final id in departed) {
          _closePeer(id);
        }
      });
    }

    _signalSub = FitilaBackend.streamLiveSignalsForMe(liveId).listen((rows) {
      for (final row in rows) {
        if (row['live_id']?.toString() != liveId) continue;
        if (row['to_user']?.toString() != selfId) continue;
        unawaited(_handleSignal(row));
      }
    });
  }

  Future<void> _handleSignal(Map<String, dynamic> row) async {
    final id = row['id']?.toString();
    if (id == null ||
        _handledSignalIds.contains(id) ||
        _processingSignalIds.contains(id)) {
      return;
    }
    final fromUser = row['from_user']?.toString();
    final signalType = row['signal_type']?.toString();
    final rawPayload = row['payload'];
    if (fromUser == null || rawPayload is! Map) return;
    final payload = Map<String, dynamic>.from(rawPayload);

    _processingSignalIds.add(id);
    try {
      switch (signalType) {
        case 'offer':
          await _handleOffer(fromUser, payload);
          break;
        case 'answer':
          await _handleAnswer(fromUser, payload);
          break;
        case 'ice-candidate':
          await _handleRemoteCandidate(fromUser, payload);
          break;
        case 'bye':
          _closePeer(fromUser);
          break;
        default:
          return;
      }
      _handledSignalIds.add(id);
      await FitilaBackend.acknowledgeLiveSignal(id);
    } catch (_) {
      // Le signal reste en base et sera rejoué lors du prochain événement
      // Realtime plutôt que d'être perdu silencieusement.
    } finally {
      _processingSignalIds.remove(id);
    }
  }

  Future<rtc.RTCPeerConnection> _ensurePeerConnection(String peerId) async {
    final existing = _peerConnections[peerId];
    if (existing != null) return existing;
    final pc = await rtc.createPeerConnection(_iceConfiguration);
    _peerConnections[peerId] = pc;
    _peerCountController.add(_peerConnections.length);

    if (role == FitilaLiveRole.host && localStream != null) {
      for (final track in localStream!.getTracks()) {
        await pc.addTrack(track, localStream!);
      }
    }

    pc.onIceCandidate = (candidate) {
      if (candidate.candidate == null || _disposed) return;
      FitilaBackend.sendLiveSignal(
        liveId: liveId,
        toUser: peerId,
        signalType: 'ice-candidate',
        payload: candidate.toMap(),
      ).catchError((_) {});
    };

    pc.onTrack = (event) {
      if (event.streams.isNotEmpty) {
        _remoteStreams[peerId] = event.streams.first;
        _remoteStreamsController.add(Map.of(_remoteStreams));
      }
    };

    return pc;
  }

  Future<void> _createOfferFor(String viewerId) async {
    final pc = await _ensurePeerConnection(viewerId);
    final offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    await FitilaBackend.sendLiveSignal(
      liveId: liveId,
      toUser: viewerId,
      signalType: 'offer',
      payload: {'sdp': offer.sdp, 'type': offer.type},
    );
  }

  Future<void> _handleOffer(String fromHost, Map<String, dynamic> data) async {
    final pc = await _ensurePeerConnection(fromHost);
    await pc.setRemoteDescription(
      rtc.RTCSessionDescription(
        data['sdp'] as String?,
        data['type'] as String?,
      ),
    );
    _remoteDescriptionReady.add(fromHost);
    await _flushPendingCandidates(fromHost, pc);
    final answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    await FitilaBackend.sendLiveSignal(
      liveId: liveId,
      toUser: fromHost,
      signalType: 'answer',
      payload: {'sdp': answer.sdp, 'type': answer.type},
    );
  }

  Future<void> _handleAnswer(
    String fromViewer,
    Map<String, dynamic> data,
  ) async {
    final pc = _peerConnections[fromViewer];
    if (pc == null) return;
    await pc.setRemoteDescription(
      rtc.RTCSessionDescription(
        data['sdp'] as String?,
        data['type'] as String?,
      ),
    );
    _remoteDescriptionReady.add(fromViewer);
    await _flushPendingCandidates(fromViewer, pc);
  }

  Future<void> _handleRemoteCandidate(
    String peerId,
    Map<String, dynamic> data,
  ) async {
    final candidate = rtc.RTCIceCandidate(
      data['candidate'] as String?,
      data['sdpMid'] as String?,
      data['sdpMLineIndex'] as int?,
    );
    if (!_remoteDescriptionReady.contains(peerId)) {
      _pendingCandidates.putIfAbsent(peerId, () => []).add(candidate);
      return;
    }
    final pc = _peerConnections[peerId];
    if (pc == null) return;
    try {
      await pc.addCandidate(candidate);
    } catch (_) {
      // Un candidat ICE obsolète ou invalide ne doit pas interrompre l'appel.
    }
  }

  Future<void> _flushPendingCandidates(
    String peerId,
    rtc.RTCPeerConnection pc,
  ) async {
    final pending = _pendingCandidates.remove(peerId);
    if (pending == null) return;
    for (final candidate in pending) {
      try {
        await pc.addCandidate(candidate);
      } catch (_) {
        // Idem : on continue avec les candidats suivants.
      }
    }
  }

  void _closePeer(String peerId) {
    _peerConnections.remove(peerId)?.close();
    _remoteDescriptionReady.remove(peerId);
    _pendingCandidates.remove(peerId);
    if (_remoteStreams.remove(peerId) != null) {
      _remoteStreamsController.add(Map.of(_remoteStreams));
    }
    _peerCountController.add(_peerConnections.length);
  }

  /// Prévient tous les pairs connectés avant de raccrocher (permet à
  /// l'autre bout de fermer proprement sa connexion sans attendre un
  /// timeout ICE).
  Future<void> notifyBye() async {
    for (final peerId in _peerConnections.keys.toList(growable: false)) {
      await FitilaBackend.sendLiveSignal(
        liveId: liveId,
        toUser: peerId,
        signalType: 'bye',
        payload: const {},
      ).catchError((_) {});
    }
  }

  Future<void> dispose() async {
    _disposed = true;
    await _signalSub?.cancel();
    await _viewerSub?.cancel();
    for (final pc in _peerConnections.values) {
      await pc.close();
    }
    _peerConnections.clear();
    _remoteStreams.clear();
    await localStream?.dispose();
    await _remoteStreamsController.close();
    await _peerCountController.close();
  }
}
