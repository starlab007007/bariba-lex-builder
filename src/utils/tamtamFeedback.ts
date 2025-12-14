// Audio feedback utilities for TAM-TAM
// Provides sounds and haptic feedback for user interactions

export type FeedbackType = 'like' | 'love' | 'laugh' | 'wow' | 'pray' | 'success' | 'error' | 'record' | 'send' | 'notification' | 'click' | 'sos' | 'message_received' | 'language_detected';

// Simple audio context for generating feedback sounds
let audioContext: AudioContext | null = null;

const getAudioContext = (): AudioContext => {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioContext;
};

// Generate different tones for different feedback types
const feedbackFrequencies: Record<FeedbackType, { freq: number; duration: number; type: OscillatorType }> = {
  like: { freq: 800, duration: 0.1, type: 'sine' },
  love: { freq: 600, duration: 0.15, type: 'sine' },
  laugh: { freq: 1000, duration: 0.08, type: 'square' },
  wow: { freq: 400, duration: 0.2, type: 'sine' },
  pray: { freq: 300, duration: 0.25, type: 'sine' },
  success: { freq: 880, duration: 0.15, type: 'sine' },
  error: { freq: 200, duration: 0.3, type: 'sawtooth' },
  record: { freq: 440, duration: 0.1, type: 'sine' },
  send: { freq: 660, duration: 0.12, type: 'sine' },
  notification: { freq: 520, duration: 0.18, type: 'triangle' },
  click: { freq: 700, duration: 0.05, type: 'sine' },
  sos: { freq: 350, duration: 0.4, type: 'sawtooth' },
  message_received: { freq: 587, duration: 0.2, type: 'triangle' }, // D5 - pleasant notification
  language_detected: { freq: 784, duration: 0.15, type: 'sine' }, // G5 - confirmation tone
};

export const playFeedbackSound = (type: FeedbackType, volume: number = 0.3): void => {
  try {
    const ctx = getAudioContext();
    const { freq, duration, type: oscType } = feedbackFrequencies[type];
    
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.type = oscType;
    oscillator.frequency.setValueAtTime(freq, ctx.currentTime);
    
    // For 'like' and 'success', add a pleasant rising tone
    if (type === 'like' || type === 'success' || type === 'send') {
      oscillator.frequency.linearRampToValueAtTime(freq * 1.5, ctx.currentTime + duration);
    }
    
    // For 'love', add a double beep
    if (type === 'love') {
      oscillator.frequency.setValueAtTime(freq, ctx.currentTime);
      oscillator.frequency.setValueAtTime(freq * 1.2, ctx.currentTime + 0.08);
    }
    
    gainNode.gain.setValueAtTime(volume, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + duration);
  } catch (err) {
    console.warn('Audio feedback not available:', err);
  }
};

// Haptic feedback patterns
const hapticPatterns: Record<FeedbackType, number[]> = {
  like: [50],
  love: [30, 50, 30],
  laugh: [20, 30, 20, 30, 20],
  wow: [100],
  pray: [50, 100, 50],
  success: [50, 50, 100],
  error: [100, 50, 100],
  record: [30],
  send: [40, 40],
  notification: [50, 30, 50],
  click: [20],
  sos: [200, 100, 200, 100, 200],
  message_received: [80, 40, 80], // Distinctive triple tap for messages
  language_detected: [30, 60], // Short-long for language detection
};

export const triggerHaptic = (type: FeedbackType): void => {
  if (navigator.vibrate) {
    navigator.vibrate(hapticPatterns[type]);
  }
};

// Combined feedback (sound + haptic)
export const triggerFeedback = (type: FeedbackType, options?: { sound?: boolean; haptic?: boolean; volume?: number }): void => {
  const { sound = true, haptic = true, volume = 0.3 } = options || {};
  
  if (sound) {
    playFeedbackSound(type, volume);
  }
  
  if (haptic) {
    triggerHaptic(type);
  }
};

// Reaction emoji mapping
export const reactionFeedback: Record<string, FeedbackType> = {
  'like': 'like',
  'love': 'love',
  'laugh': 'laugh',
  'wow': 'wow',
  'pray': 'pray',
  '👍': 'like',
  '❤️': 'love',
  '😂': 'laugh',
  '😮': 'wow',
  '🙏': 'pray',
};

export const triggerReactionFeedback = (reaction: string): void => {
  const feedbackType = reactionFeedback[reaction] || 'like';
  triggerFeedback(feedbackType);
};

// Utility object for easy import
export const tamtamFeedback = {
  play: (type: FeedbackType) => playFeedbackSound(type),
  vibrate: (type: FeedbackType) => triggerHaptic(type),
  trigger: (type: FeedbackType, options?: { sound?: boolean; haptic?: boolean; volume?: number }) => triggerFeedback(type, options),
  reaction: (reaction: string) => triggerReactionFeedback(reaction)
};
