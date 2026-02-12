/**
 * Cross-browser audio MIME type detection utility.
 * Ensures recording works on Safari iOS, Chrome, Firefox, Opera.
 */

export function isIOSDevice(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

export function isSafariBrowser(): boolean {
  const ua = navigator.userAgent;
  return /^((?!chrome|android).)*safari/i.test(ua);
}

/**
 * Returns the best supported MIME type for MediaRecorder.
 * Safari iOS → audio/mp4
 * Chrome/Firefox/Opera → audio/webm;codecs=opus or audio/webm
 */
export function getSupportedAudioMimeType(): string {
  if (isIOSDevice() || isSafariBrowser()) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported('audio/mp4')) {
      return 'audio/mp4';
    }
  }

  if (typeof MediaRecorder !== 'undefined') {
    if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
      return 'audio/webm;codecs=opus';
    }
    if (MediaRecorder.isTypeSupported('audio/webm')) {
      return 'audio/webm';
    }
  }

  // Fallback
  return 'audio/webm';
}

/**
 * Returns the correct Blob type matching the MIME used for recording.
 */
export function getAudioBlobType(): string {
  if (isIOSDevice() || isSafariBrowser()) {
    return 'audio/mp4';
  }
  return 'audio/webm';
}

/**
 * Returns recommended timeslice for MediaRecorder.start().
 * iOS Safari needs larger chunks (1000ms) for reliable data emission.
 */
export function getRecorderTimeslice(): number {
  if (isIOSDevice() || isSafariBrowser()) {
    return 1000;
  }
  return 100;
}
