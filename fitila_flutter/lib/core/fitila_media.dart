import 'dart:io';
import 'dart:typed_data';

import 'package:image_picker/image_picker.dart';
import 'package:path_provider/path_provider.dart';
import 'package:record/record.dart';

class FitilaMediaAsset {
  const FitilaMediaAsset({
    required this.path,
    required this.name,
    required this.mediaType,
    required this.contentType,
  });

  final String path;
  final String name;
  final String mediaType;
  final String contentType;

  Future<Uint8List> readBytes() => File(path).readAsBytes();

  Future<int> sizeBytes() => File(path).length();
}

class FitilaMediaController {
  final _picker = ImagePicker();
  final _recorder = AudioRecorder();

  bool recording = false;

  Future<FitilaMediaAsset?> pickImage(ImageSource source) async {
    final file = await _picker.pickImage(
      source: source,
      imageQuality: 88,
      maxWidth: 2160,
    );
    if (file == null) return null;
    return FitilaMediaAsset(
      path: file.path,
      name: file.name,
      mediaType: 'photo',
      contentType: _imageContentType(file.name),
    );
  }

  Future<FitilaMediaAsset?> pickVideo(ImageSource source) async {
    final file = await _picker.pickVideo(
      source: source,
      maxDuration: const Duration(seconds: 90),
    );
    if (file == null) return null;
    return FitilaMediaAsset(
      path: file.path,
      name: file.name,
      mediaType: 'video',
      contentType: _videoContentType(file.name),
    );
  }

  Future<void> startAudio() async {
    if (!await _recorder.hasPermission()) {
      throw StateError('Autorisation microphone refusée.');
    }
    final directory = await getTemporaryDirectory();
    final path =
        '${directory.path}${Platform.pathSeparator}fitila_${DateTime.now().millisecondsSinceEpoch}.m4a';
    await _recorder.start(
      const RecordConfig(
        encoder: AudioEncoder.aacLc,
        sampleRate: 16000,
        numChannels: 1,
        bitRate: 64000,
      ),
      path: path,
    );
    recording = true;
  }

  Future<FitilaMediaAsset?> stopAudio() async {
    final path = await _recorder.stop();
    recording = false;
    if (path == null || !File(path).existsSync()) return null;
    return FitilaMediaAsset(
      path: path,
      name: path.split(Platform.pathSeparator).last,
      mediaType: 'audio',
      contentType: 'audio/mp4',
    );
  }

  Future<void> cancelAudio() async {
    if (recording) await _recorder.cancel();
    recording = false;
  }

  Future<void> dispose() => _recorder.dispose();

  static String _imageContentType(String name) {
    final lower = name.toLowerCase();
    if (lower.endsWith('.png')) return 'image/png';
    if (lower.endsWith('.webp')) return 'image/webp';
    return 'image/jpeg';
  }

  static String _videoContentType(String name) {
    final lower = name.toLowerCase();
    if (lower.endsWith('.mov')) return 'video/quicktime';
    if (lower.endsWith('.webm')) return 'video/webm';
    return 'video/mp4';
  }
}
