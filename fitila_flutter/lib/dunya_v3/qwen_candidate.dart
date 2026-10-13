/// Optional Qwen3-1.7B INT4 LiteRT-LM model candidate for DUNYA V3.
/// NOT enabled automatically: never download and run unverified model weights.
/// Requires LiteRT-LM native 0.18+ and an independently verified SHA-256.
class DunyaQwenCandidate {
  static const id = 'qwen3-1.7b-int4';
  static const fileName = 'Qwen3-1.7B_dynamic_wi4b32_afp32.litertlm';
  static const downloadUrl =
      'https://huggingface.co/litert-community/Qwen3-1.7B/resolve/main/Qwen3-1.7B_dynamic_wi4b32_afp32.litertlm';
  static const modelFormat = 'litertlm';
  static const int contextTokens = 4096;
  static const license = 'Apache-2.0';
  static const nativeMinVersion = '0.18.0';

  /// This must be verified against the downloaded, pinned artifact before
  /// enabling it as an installable model.
  static const String? verifiedSha256 = null;

  static bool get safeToInstall =>
      verifiedSha256 != null && RegExp(r'^[a-f0-9]{64}$').hasMatch(verifiedSha256!);
}
