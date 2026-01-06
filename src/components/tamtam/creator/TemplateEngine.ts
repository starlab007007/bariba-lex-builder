// ============================================================
// TEMPLATE ENGINE - Pipeline de traitement IA pour templates
// ============================================================

import { 
  AdvancedTemplate, 
  AIFeatures, 
  VoiceInstruction,
  getTemplateById,
  durationToSeconds 
} from "./AdvancedTemplateData";
import { supabase } from "@/integrations/supabase/client";

export interface TemplateInputs {
  videos: Blob[];
  photos: Blob[];
  audios: Blob[];
  text?: string;
}

export interface ProcessingProgress {
  stage: 'analyzing' | 'enhancing' | 'generating' | 'assembling' | 'finalizing';
  percent: number;
  message_fr: string;
  message_ba?: string;
}

export interface ProcessedMedia {
  outputBlob: Blob;
  outputType: 'video' | 'image';
  thumbnailUrl?: string;
  captions?: CaptionSegment[];
  generatedNarration?: string;
  translatedText?: string;
  duration: number;
}

export interface CaptionSegment {
  startTime: number;
  endTime: number;
  text: string;
  emoji?: string;
}

type ProgressCallback = (progress: ProcessingProgress) => void;

// ============================================================
// TEMPLATE ENGINE CLASS
// ============================================================

class TemplateEngineService {
  private audioContext: AudioContext | null = null;

  // ============================================================
  // MAIN PROCESSING FUNCTION
  // ============================================================
  
  async processTemplate(
    templateId: string,
    inputs: TemplateInputs,
    onProgress?: ProgressCallback
  ): Promise<ProcessedMedia> {
    const template = getTemplateById(templateId);
    if (!template) {
      throw new Error(`Template ${templateId} not found`);
    }

    const features = template.features;
    let currentBlob = inputs.videos[0] || inputs.photos[0] || inputs.audios[0];
    
    if (!currentBlob) {
      throw new Error("No input media provided");
    }

    // Stage 1: Analyzing
    onProgress?.({
      stage: 'analyzing',
      percent: 10,
      message_fr: 'Analyse du contenu...',
      message_ba: 'A kaa gba lajɛ...'
    });

    // Stage 2: Audio Enhancement
    if (features.audioEnhance && inputs.audios.length > 0) {
      onProgress?.({
        stage: 'enhancing',
        percent: 25,
        message_fr: 'Amélioration audio...',
        message_ba: 'Kan kaa ɲɛ...'
      });
      
      for (let i = 0; i < inputs.audios.length; i++) {
        inputs.audios[i] = await this.enhanceAudio(inputs.audios[i]);
      }
    }

    // Stage 3: Generate content with AI
    let generatedNarration: string | undefined;
    let translatedText: string | undefined;
    let captions: CaptionSegment[] | undefined;

    if (features.narrativeStructure || features.smartCaptions || features.translation) {
      onProgress?.({
        stage: 'generating',
        percent: 45,
        message_fr: 'Génération IA en cours...',
        message_ba: 'IA kaa baara kɛ...'
      });

      if (features.narrativeStructure) {
        generatedNarration = await this.generateNarrative(template, inputs);
      }

      if (features.translation && inputs.audios.length > 0) {
        translatedText = await this.translateContent(inputs.text || '');
      }

      if (features.smartCaptions) {
        captions = await this.generateSmartCaptions(template, inputs);
      }
    }

    // Stage 4: Assemble final media
    onProgress?.({
      stage: 'assembling',
      percent: 70,
      message_fr: 'Assemblage du contenu...',
      message_ba: 'Gba kaa sigi...'
    });

    const outputBlob = await this.assembleMedia(template, inputs, {
      captions,
      narration: generatedNarration
    });

    // Stage 5: Finalize
    onProgress?.({
      stage: 'finalizing',
      percent: 95,
      message_fr: 'Finalisation...',
      message_ba: 'A kaa ban...'
    });

    const duration = await this.getMediaDuration(outputBlob);

    onProgress?.({
      stage: 'finalizing',
      percent: 100,
      message_fr: 'Terminé!',
      message_ba: 'A banna!'
    });

    return {
      outputBlob,
      outputType: inputs.videos.length > 0 ? 'video' : 'image',
      captions,
      generatedNarration,
      translatedText,
      duration
    };
  }

  // ============================================================
  // AUDIO PROCESSING
  // ============================================================

  private async enhanceAudio(audioBlob: Blob): Promise<Blob> {
    try {
      if (!this.audioContext) {
        this.audioContext = new AudioContext();
      }

      const arrayBuffer = await audioBlob.arrayBuffer();
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);

      // Create offline context for processing
      const offlineCtx = new OfflineAudioContext(
        audioBuffer.numberOfChannels,
        audioBuffer.length,
        audioBuffer.sampleRate
      );

      const source = offlineCtx.createBufferSource();
      source.buffer = audioBuffer;

      // Apply noise gate (simple high-pass filter)
      const highpass = offlineCtx.createBiquadFilter();
      highpass.type = 'highpass';
      highpass.frequency.value = 80;

      // Apply compression for normalization
      const compressor = offlineCtx.createDynamicsCompressor();
      compressor.threshold.value = -24;
      compressor.knee.value = 30;
      compressor.ratio.value = 12;
      compressor.attack.value = 0.003;
      compressor.release.value = 0.25;

      // Apply gain boost
      const gainNode = offlineCtx.createGain();
      gainNode.gain.value = 1.3;

      // Connect chain
      source.connect(highpass);
      highpass.connect(compressor);
      compressor.connect(gainNode);
      gainNode.connect(offlineCtx.destination);

      source.start();
      const renderedBuffer = await offlineCtx.startRendering();

      // Convert back to blob
      return this.audioBufferToBlob(renderedBuffer);
    } catch (error) {
      console.error('Audio enhancement failed:', error);
      return audioBlob; // Return original on error
    }
  }

  private audioBufferToBlob(buffer: AudioBuffer): Blob {
    const length = buffer.length * buffer.numberOfChannels * 2;
    const arrayBuffer = new ArrayBuffer(44 + length);
    const view = new DataView(arrayBuffer);

    // Write WAV header
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + length, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, buffer.numberOfChannels, true);
    view.setUint32(24, buffer.sampleRate, true);
    view.setUint32(28, buffer.sampleRate * buffer.numberOfChannels * 2, true);
    view.setUint16(32, buffer.numberOfChannels * 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, length, true);

    // Write audio data
    const channels = [];
    for (let i = 0; i < buffer.numberOfChannels; i++) {
      channels.push(buffer.getChannelData(i));
    }

    let offset = 44;
    for (let i = 0; i < buffer.length; i++) {
      for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
        const sample = Math.max(-1, Math.min(1, channels[ch][i]));
        view.setInt16(offset, sample * 0x7FFF, true);
        offset += 2;
      }
    }

    return new Blob([arrayBuffer], { type: 'audio/wav' });
  }

  // ============================================================
  // AI CONTENT GENERATION
  // ============================================================

  private async generateNarrative(
    template: AdvancedTemplate,
    inputs: TemplateInputs
  ): Promise<string> {
    try {
      const { data, error } = await supabase.functions.invoke('process-template', {
        body: {
          action: 'generate_narrative',
          templateId: template.id,
          templateLabel: template.label_fr,
          templateFamily: template.family,
          inputText: inputs.text || '',
          hasVideo: inputs.videos.length > 0,
          hasPhotos: inputs.photos.length,
          hasAudio: inputs.audios.length > 0
        }
      });

      if (error) throw error;
      return data?.narrative || '';
    } catch (error) {
      console.error('Narrative generation failed:', error);
      return '';
    }
  }

  private async translateContent(text: string): Promise<string> {
    if (!text) return '';
    
    try {
      const { data, error } = await supabase.functions.invoke('byt5-bariba-translate', {
        body: {
          text,
          direction: 'fr_to_ba'
        }
      });

      if (error) throw error;
      return data?.translation || text;
    } catch (error) {
      console.error('Translation failed:', error);
      return text;
    }
  }

  private async generateSmartCaptions(
    template: AdvancedTemplate,
    inputs: TemplateInputs
  ): Promise<CaptionSegment[]> {
    try {
      const { data, error } = await supabase.functions.invoke('process-template', {
        body: {
          action: 'generate_captions',
          templateId: template.id,
          inputText: inputs.text || '',
          features: template.features
        }
      });

      if (error) throw error;
      return data?.captions || [];
    } catch (error) {
      console.error('Caption generation failed:', error);
      return [];
    }
  }

  // ============================================================
  // MEDIA ASSEMBLY
  // ============================================================

  private async assembleMedia(
    template: AdvancedTemplate,
    inputs: TemplateInputs,
    generated: {
      captions?: CaptionSegment[];
      narration?: string;
    }
  ): Promise<Blob> {
    // For now, return the first input - full assembly would require FFmpeg/canvas
    if (inputs.videos.length > 0) {
      return inputs.videos[0];
    }
    
    if (inputs.photos.length > 0) {
      // Create animated slideshow from photos
      return await this.createSlideshow(inputs.photos, template);
    }
    
    if (inputs.audios.length > 0) {
      // Create waveform video from audio
      return await this.createWaveformVideo(inputs.audios[0], template);
    }

    throw new Error("No valid input to assemble");
  }

  private async createSlideshow(photos: Blob[], template: AdvancedTemplate): Promise<Blob> {
    // Simple implementation - just return first photo for now
    // Full implementation would use canvas animation
    return photos[0];
  }

  private async createWaveformVideo(audio: Blob, template: AdvancedTemplate): Promise<Blob> {
    // Simple implementation - return audio for now
    // Full implementation would create animated waveform canvas
    return audio;
  }

  // ============================================================
  // UTILITIES
  // ============================================================

  private async getMediaDuration(blob: Blob): Promise<number> {
    return new Promise((resolve) => {
      if (blob.type.startsWith('video/')) {
        const video = document.createElement('video');
        video.preload = 'metadata';
        video.onloadedmetadata = () => {
          resolve(video.duration);
          URL.revokeObjectURL(video.src);
        };
        video.onerror = () => resolve(0);
        video.src = URL.createObjectURL(blob);
      } else if (blob.type.startsWith('audio/')) {
        const audio = document.createElement('audio');
        audio.preload = 'metadata';
        audio.onloadedmetadata = () => {
          resolve(audio.duration);
          URL.revokeObjectURL(audio.src);
        };
        audio.onerror = () => resolve(0);
        audio.src = URL.createObjectURL(blob);
      } else {
        resolve(0);
      }
    });
  }

  // ============================================================
  // VOICE INSTRUCTIONS TTS
  // ============================================================

  async speakInstruction(instruction: VoiceInstruction, language: 'fr' | 'ba' = 'fr'): Promise<void> {
    const text = language === 'ba' && instruction.text_ba 
      ? instruction.text_ba 
      : instruction.text_fr;

    if ('speechSynthesis' in window) {
      return new Promise((resolve) => {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'fr-FR';
        utterance.rate = 0.9;
        utterance.onend = () => resolve();
        utterance.onerror = () => resolve();
        speechSynthesis.speak(utterance);
      });
    }
  }

  stopSpeaking(): void {
    if ('speechSynthesis' in window) {
      speechSynthesis.cancel();
    }
  }
}

export const templateEngine = new TemplateEngineService();
export default templateEngine;
