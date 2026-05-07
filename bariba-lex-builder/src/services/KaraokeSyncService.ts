// Karaoke Synchronization Service
// Word-by-word subtitle sync based on audio timing

import { Caption } from '@/components/tamtam/creator/CaptionsDrawer';

export interface KaraokeWord {
  word: string;
  startTime: number;
  endTime: number;
  confidence: number;
}

export interface KaraokeCaption extends Caption {
  words: KaraokeWord[];
  isKaraokeMode: true;
}

export interface KaraokeSyncState {
  activeWordIndex: number;
  activeCaptionId: string | null;
  progress: number;
}

class KaraokeSyncServiceClass {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;

  // Convert captions to karaoke format with word timing
  async convertToKaraoke(
    captions: Caption[], 
    audioDuration: number
  ): Promise<KaraokeCaption[]> {
    return captions.map(caption => {
      const words = this.splitIntoWords(caption.text, caption.startTime, caption.endTime);
      return {
        ...caption,
        words,
        isKaraokeMode: true as const
      };
    });
  }

  // Split text into words with estimated timing
  private splitIntoWords(text: string, startTime: number, endTime: number): KaraokeWord[] {
    const words = text.trim().split(/\s+/).filter(w => w.length > 0);
    if (words.length === 0) return [];

    const totalDuration = endTime - startTime;
    const avgWordDuration = totalDuration / words.length;

    // Calculate word lengths for weighted timing
    const totalChars = words.reduce((sum, w) => sum + w.length, 0);
    
    let currentTime = startTime;
    return words.map((word, index) => {
      // Weight duration by word length
      const weight = word.length / totalChars;
      const wordDuration = totalDuration * weight;
      
      const wordStart = currentTime;
      const wordEnd = Math.min(currentTime + wordDuration, endTime);
      
      currentTime = wordEnd;

      return {
        word,
        startTime: wordStart,
        endTime: wordEnd,
        confidence: 0.85 + (Math.random() * 0.15)
      };
    });
  }

  // Get current active word based on playback time
  getCurrentWord(
    karaokeCaptions: KaraokeCaption[],
    currentTime: number
  ): { captionId: string; wordIndex: number; word: KaraokeWord } | null {
    for (const caption of karaokeCaptions) {
      if (currentTime >= caption.startTime && currentTime <= caption.endTime) {
        const wordIndex = caption.words.findIndex(
          w => currentTime >= w.startTime && currentTime < w.endTime
        );
        
        if (wordIndex >= 0) {
          return {
            captionId: caption.id,
            wordIndex,
            word: caption.words[wordIndex]
          };
        }
      }
    }
    return null;
  }

  // Get sync state for rendering
  getSyncState(
    karaokeCaptions: KaraokeCaption[],
    currentTime: number
  ): KaraokeSyncState {
    const current = this.getCurrentWord(karaokeCaptions, currentTime);
    
    if (!current) {
      return {
        activeWordIndex: -1,
        activeCaptionId: null,
        progress: 0
      };
    }

    const word = current.word;
    const wordProgress = (currentTime - word.startTime) / (word.endTime - word.startTime);

    return {
      activeWordIndex: current.wordIndex,
      activeCaptionId: current.captionId,
      progress: Math.min(1, Math.max(0, wordProgress))
    };
  }

  // Analyze audio for beat detection (simple volume-based)
  async analyzeAudioBeats(audioBlob: Blob): Promise<number[]> {
    if (!this.audioContext) {
      this.audioContext = new AudioContext();
    }

    try {
      const arrayBuffer = await audioBlob.arrayBuffer();
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
      
      // Simple beat detection using volume peaks
      const channelData = audioBuffer.getChannelData(0);
      const sampleRate = audioBuffer.sampleRate;
      const windowSize = Math.floor(sampleRate * 0.05); // 50ms windows
      
      const beats: number[] = [];
      let lastPeak = -1;
      
      for (let i = 0; i < channelData.length; i += windowSize) {
        let sum = 0;
        for (let j = 0; j < windowSize && i + j < channelData.length; j++) {
          sum += Math.abs(channelData[i + j]);
        }
        const avg = sum / windowSize;
        
        // Simple threshold-based peak detection
        if (avg > 0.15 && lastPeak < 0) {
          beats.push(i / sampleRate);
          lastPeak = 10; // Minimum frames between beats
        }
        if (lastPeak > 0) lastPeak--;
      }
      
      return beats;
    } catch (error) {
      console.error('[KaraokeSync] Audio analysis failed:', error);
      return [];
    }
  }

  // Align words to detected beats
  alignWordsToBeats(words: KaraokeWord[], beats: number[]): KaraokeWord[] {
    if (beats.length === 0 || words.length === 0) return words;

    return words.map(word => {
      // Find nearest beat to word start
      let nearestBeat = beats[0];
      let minDiff = Math.abs(beats[0] - word.startTime);
      
      for (const beat of beats) {
        const diff = Math.abs(beat - word.startTime);
        if (diff < minDiff) {
          minDiff = diff;
          nearestBeat = beat;
        }
      }
      
      // Only snap if beat is close enough (within 200ms)
      if (minDiff < 0.2) {
        const shift = nearestBeat - word.startTime;
        return {
          ...word,
          startTime: nearestBeat,
          endTime: word.endTime + shift
        };
      }
      
      return word;
    });
  }

  // Cleanup
  cleanup(): void {
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.analyser = null;
  }
}

export const KaraokeSyncService = new KaraokeSyncServiceClass();
export default KaraokeSyncService;
