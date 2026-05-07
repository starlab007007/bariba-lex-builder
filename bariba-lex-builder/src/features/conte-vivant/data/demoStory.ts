import { supabase } from '@/integrations/supabase/client';
import type { StoryGraph } from '../types/story.types';

async function fetchAsset(
  sceneType: string,
  charType: string,
  assetType: 'photo' | 'video'
): Promise<{ url: string; type: 'photo' | 'video' }> {
  const { data } = await supabase
    .from('anime_scene_library')
    .select('image_url, video_url, asset_type')
    .eq('scene_type', sceneType)
    .eq('character_type', charType)
    .eq('asset_type', assetType)
    .limit(1)
    .maybeSingle();

  if (data) {
    const url = assetType === 'video' ? (data.video_url ?? data.image_url) : data.image_url;
    return { url, type: assetType };
  }
  return { url: `https://placehold.co/600x1067/0f0f18/F5A623?text=${sceneType}`, type: 'photo' };
}

export async function loadDemoStory(): Promise<StoryGraph> {
  const [intro, guerriers, devin, piege, poursuite, potion, chant] = await Promise.all([
    fetchAsset('village', 'elder', 'photo'),
    fetchAsset('journey', 'group', 'video'),
    fetchAsset('village', 'group', 'photo'),
    fetchAsset('forest', 'elder', 'photo'),
    fetchAsset('journey', 'child_boy', 'video'),
    fetchAsset('home', 'elder', 'photo'),
    fetchAsset('gathering', 'group', 'video'),
  ]);

  return {
    entry_segment: 'intro',
    segments: {
      intro: {
        id: 'intro',
        title: 'Le village de Nikki',
        mediaType: intro.type,
        media_url: intro.url,
        duration: 12,
        is_choice_point: true,
        choices: [
          { id: 'c1a', label: 'Guerriers', icon: '🏹', color: '#FF6B35', next_segment: 'guerriers', is_default: true, position: 'left' },
          { id: 'c1b', label: 'Devin', icon: '🔮', color: '#00D4AA', next_segment: 'devin', is_default: false, position: 'right' },
        ],
        is_ending: false,
      },
      guerriers: {
        id: 'guerriers',
        title: 'Les guerriers',
        mediaType: guerriers.type,
        media_url: guerriers.url,
        duration: 12,
        is_choice_point: true,
        choices: [
          { id: 'c2a', label: 'Piège', icon: '🌿', color: '#22C55E', next_segment: 'piege', is_default: true, position: 'left' },
          { id: 'c2b', label: 'Poursuite', icon: '🐎', color: '#A855F7', next_segment: 'poursuite', is_default: false, position: 'right' },
        ],
        is_ending: false,
      },
      devin: {
        id: 'devin',
        title: 'Le devin',
        mediaType: devin.type,
        media_url: devin.url,
        duration: 12,
        is_choice_point: true,
        choices: [
          { id: 'c2c', label: 'Potion', icon: '✨', color: '#F5A623', next_segment: 'potion', is_default: true, position: 'left' },
          { id: 'c2d', label: 'Chant', icon: '🎵', color: '#EC4899', next_segment: 'chant', is_default: false, position: 'right' },
        ],
        is_ending: false,
      },
      piege: {
        id: 'piege',
        title: 'Le piège de la forêt',
        mediaType: piege.type,
        media_url: piege.url,
        duration: 15,
        is_choice_point: false,
        choices: [],
        is_ending: true,
        ending_badge: '🏹',
        ending_title: 'Guerrier',
      },
      poursuite: {
        id: 'poursuite',
        title: 'La poursuite',
        mediaType: poursuite.type,
        media_url: poursuite.url,
        duration: 15,
        is_choice_point: false,
        choices: [],
        is_ending: true,
        ending_badge: '🐎',
        ending_title: 'Cavalier',
      },
      potion: {
        id: 'potion',
        title: 'La potion magique',
        mediaType: potion.type,
        media_url: potion.url,
        duration: 15,
        is_choice_point: false,
        choices: [],
        is_ending: true,
        ending_badge: '✨',
        ending_title: 'Sage',
      },
      chant: {
        id: 'chant',
        title: 'Le chant sacré',
        mediaType: chant.type,
        media_url: chant.url,
        duration: 15,
        is_choice_point: false,
        choices: [],
        is_ending: true,
        ending_badge: '🎵',
        ending_title: 'Griot',
      },
    },
  };
}
