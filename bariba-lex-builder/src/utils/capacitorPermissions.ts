/**
 * Capacitor Permission Utils
 * Handles requesting camera/microphone permissions on native Android/iOS
 * Falls back to standard browser API on web
 */

/**
 * Request microphone permission.
 * On native: prompts the system permission dialog.
 * On web: uses navigator.mediaDevices.getUserMedia to trigger browser prompt.
 */
export async function requestMicrophonePermission(): Promise<boolean> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    // Permission granted - stop tracks immediately
    stream.getTracks().forEach(t => t.stop());
    return true;
  } catch (err: any) {
    console.warn('[Permissions] Microphone denied:', err?.name);
    return false;
  }
}

/**
 * Request camera permission.
 * On native: prompts the system permission dialog.
 * On web: uses navigator.mediaDevices.getUserMedia to trigger browser prompt.
 */
export async function requestCameraPermission(): Promise<boolean> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    // Permission granted - stop tracks immediately
    stream.getTracks().forEach(t => t.stop());
    return true;
  } catch (err: any) {
    console.warn('[Permissions] Camera denied:', err?.name);
    return false;
  }
}

/**
 * Ensure microphone permission before proceeding.
 * Shows a helpful toast if denied.
 */
export async function ensureMicPermission(): Promise<boolean> {
  const granted = await requestMicrophonePermission();
  if (!granted) {
    console.error('[Permissions] Microphone permission denied');
  }
  return granted;
}

/**
 * Ensure camera permission before proceeding.
 */
export async function ensureCameraPermission(): Promise<boolean> {
  const granted = await requestCameraPermission();
  if (!granted) {
    console.error('[Permissions] Camera permission denied');
  }
  return granted;
}
