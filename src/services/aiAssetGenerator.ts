import { supabase } from '@/integrations/supabase/client';

interface CharacterReference {
  id: string;
  character_name: string;
  reference_image_url: string;
  style_keywords: string[];
  color_palette: string[];
}

interface GenerationParams {
  sceneType: string;
  characterType: string;
  mediaType: 'photo' | 'video';
  durationSec?: number;
  mood?: string;
}

export class AIAssetGenerator {
  async generateConsistentAsset(params: GenerationParams) {
    const charRef = await this.getCharacterReference(params.characterType);
    if (!charRef) {
      throw new Error(`Character reference not found: ${params.characterType}`);
    }

    const enhancedPrompt = this.buildEnhancedPrompt(params, charRef);

    let generatedUrl: string;
    let metadata: Record<string, unknown> = {};

    if (params.mediaType === 'photo') {
      generatedUrl = await this.generatePhoto(enhancedPrompt, charRef);
    } else if (!params.durationSec || params.durationSec <= 8) {
      generatedUrl = await this.generateVideo(enhancedPrompt, charRef);
    } else {
      const result = await this.generateExtendedVideo(enhancedPrompt, charRef, params.durationSec);
      generatedUrl = result.url;
      metadata = result.metadata;
    }

    const consistencyScore = await this.validateConsistency(generatedUrl, charRef);

    const { data, error } = await supabase
      .from('anime_scene_library')
      .insert({
        image_url: generatedUrl,
        scene_type: params.sceneType,
        character_type: params.characterType,
        asset_type: params.mediaType,
        emotion: params.mood || 'neutral',
        description_en: enhancedPrompt.slice(0, 200),
        style: 'african',
        storage_path: `generated/${Date.now()}`,
        character_reference_id: charRef.id,
        consistency_score: consistencyScore,
        quality_score: 0.85,
        generation_metadata: metadata,
      } as any)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  private async getCharacterReference(characterName: string): Promise<CharacterReference | null> {
    const { data } = await supabase
      .from('character_references')
      .select('*')
      .eq('character_name', characterName)
      .single();
    return data as CharacterReference | null;
  }

  private buildEnhancedPrompt(params: GenerationParams, charRef: CharacterReference): string {
    const keywords = charRef.style_keywords?.join(', ') || 'default style';
    const palette = charRef.color_palette?.join(', ') || 'warm earth tones';
    return `[CHARACTER] ${params.characterType} - ${keywords}
[PALETTE] ${palette}
[SCENE] ${params.sceneType} | Mood: ${params.mood || 'neutral'}
[STYLE] African storytelling, warm earthy tones, 1080x1920 portrait`.trim();
  }

  private async generatePhoto(_prompt: string, _charRef: CharacterReference): Promise<string> {
    // TODO: Integrate with real generation API
    return `https://placehold.co/600x1067/0f0f18/F5A623?text=Generated`;
  }

  private async generateVideo(_prompt: string, _charRef: CharacterReference): Promise<string> {
    // TODO: Integrate with video generation API
    return `https://placehold.co/600x1067/0f0f18/F5A623?text=Video`;
  }

  private async generateExtendedVideo(
    prompt: string,
    charRef: CharacterReference,
    targetDuration: number
  ): Promise<{ url: string; metadata: Record<string, unknown> }> {
    const clipCount = Math.ceil(targetDuration / 5);
    const clips = await Promise.all(
      Array.from({ length: clipCount }, () => this.generateVideo(prompt, charRef))
    );
    return {
      url: clips[0] || '',
      metadata: { multiClip: true, clips: clipCount, totalDuration: targetDuration },
    };
  }

  private async validateConsistency(_generatedUrl: string, _charRef: CharacterReference): Promise<number> {
    // TODO: Implement facial similarity validation
    return 0.82;
  }
}

export const aiAssetGenerator = new AIAssetGenerator();
