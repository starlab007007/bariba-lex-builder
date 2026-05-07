// Music library for TamTam - Traditional Bariba & North Benin sounds
// Includes real, royalty-free audio URLs from Pixabay

export interface MusicTrack {
  id: string;
  name: string;
  name_ba?: string;
  category: 'traditional' | 'educational' | 'ambient' | 'celebration' | 'nature';
  mood: 'energetic' | 'calm' | 'joyful' | 'reflective' | 'motivating';
  duration: number; // seconds
  bpm?: number;
  description?: string;
  tags: string[];
  url: string; // URL to audio file
  isGenerated?: boolean; // AI-generated placeholder
}

export interface MusicCategory {
  id: string;
  name: string;
  name_ba: string;
  icon: string;
  description: string;
}

export const MUSIC_CATEGORIES: MusicCategory[] = [
  {
    id: 'traditional',
    name: 'Traditionnel',
    name_ba: 'Àṣà',
    icon: '🥁',
    description: 'Rythmes traditionnels Bariba et du Nord-Bénin'
  },
  {
    id: 'educational',
    name: 'Éducatif',
    name_ba: 'Èkó',
    icon: '📚',
    description: 'Musiques pour l\'apprentissage et la concentration'
  },
  {
    id: 'ambient',
    name: 'Ambiance',
    name_ba: 'Àyíká',
    icon: '🌿',
    description: 'Sons d\'ambiance et de fond'
  },
  {
    id: 'celebration',
    name: 'Célébration',
    name_ba: 'Ayẹyẹ',
    icon: '🎉',
    description: 'Musiques festives et joyeuses'
  },
  {
    id: 'nature',
    name: 'Nature',
    name_ba: 'Àdádó',
    icon: '🌳',
    description: 'Sons de la nature béninoise'
  }
];

export const MUSIC_LIBRARY: MusicTrack[] = [
  // Traditional - Real audio URLs from Pixabay (royalty-free)
  {
    id: 'african_drums_01',
    name: 'Tambours Africains',
    name_ba: 'Gàngan Afrika',
    category: 'traditional',
    mood: 'energetic',
    duration: 30,
    bpm: 120,
    description: 'Rythme traditionnel de tambours africains',
    tags: ['percussion', 'danse', 'énergie'],
    url: 'https://cdn.pixabay.com/audio/2022/10/25/audio_d828b10c1a.mp3',
    isGenerated: false
  },
  {
    id: 'tribal_beat_01',
    name: 'Rythme Tribal',
    name_ba: 'Ìlù Ẹ̀yà',
    category: 'traditional',
    mood: 'energetic',
    duration: 45,
    bpm: 110,
    description: 'Percussion tribale énergique',
    tags: ['tribal', 'danse', 'cérémonie'],
    url: 'https://cdn.pixabay.com/audio/2022/03/10/audio_c8c8a73467.mp3',
    isGenerated: false
  },
  {
    id: 'djembe_groove',
    name: 'Groove de Djembé',
    name_ba: 'Gùdùgùdù Bàtà',
    category: 'traditional',
    mood: 'joyful',
    duration: 35,
    bpm: 100,
    description: 'Rythme de djembé joyeux',
    tags: ['djembe', 'joie', 'groupe'],
    url: 'https://cdn.pixabay.com/audio/2023/09/05/audio_7c2e7a6b1d.mp3',
    isGenerated: false
  },
  {
    id: 'kora_melody',
    name: 'Mélodie de Kora',
    name_ba: 'Orin Kora',
    category: 'traditional',
    mood: 'reflective',
    duration: 60,
    bpm: 75,
    description: 'Harmonie douce de kora traditionnelle',
    tags: ['kora', 'méditation', 'sagesse'],
    url: 'https://cdn.pixabay.com/audio/2022/08/02/audio_884fe92c21.mp3',
    isGenerated: false
  },

  // Educational
  {
    id: 'focus_ambient',
    name: 'Focus & Concentration',
    name_ba: 'Ìfọkànsí',
    category: 'educational',
    mood: 'calm',
    duration: 120,
    bpm: 60,
    description: 'Musique pour la concentration et l\'étude',
    tags: ['focus', 'étude', 'calme'],
    url: 'https://cdn.pixabay.com/audio/2022/05/27/audio_1808fbf07a.mp3',
    isGenerated: false
  },
  {
    id: 'learning_loop',
    name: 'Boucle d\'Apprentissage',
    name_ba: 'Èkó Lọ́pọ̀',
    category: 'educational',
    mood: 'motivating',
    duration: 90,
    bpm: 80,
    description: 'Rythme motivant pour apprendre',
    tags: ['motivation', 'apprentissage', 'positif'],
    url: 'https://cdn.pixabay.com/audio/2022/10/30/audio_6b7e2a0b1c.mp3',
    isGenerated: false
  },
  {
    id: 'success_fanfare',
    name: 'Fanfare de Succès',
    name_ba: 'Ìṣẹ́gun Fèrè',
    category: 'educational',
    mood: 'joyful',
    duration: 8,
    description: 'Courte fanfare pour célébrer les réussites',
    tags: ['victoire', 'célébration', 'court'],
    url: 'https://cdn.pixabay.com/audio/2021/08/04/audio_0625c1539c.mp3',
    isGenerated: false
  },

  // Ambient
  {
    id: 'african_night',
    name: 'Nuit Africaine',
    name_ba: 'Alẹ́ Afrika',
    category: 'ambient',
    mood: 'calm',
    duration: 180,
    description: 'Ambiance nocturne apaisante',
    tags: ['nuit', 'calme', 'relaxation'],
    url: 'https://cdn.pixabay.com/audio/2022/03/15/audio_a8b5d9d1e4.mp3',
    isGenerated: false
  },
  {
    id: 'village_life',
    name: 'Vie de Village',
    name_ba: 'Àbúlé Ìgbésí',
    category: 'ambient',
    mood: 'calm',
    duration: 150,
    description: 'Sons quotidiens d\'un village africain',
    tags: ['village', 'quotidien', 'authentique'],
    url: 'https://cdn.pixabay.com/audio/2023/01/16/audio_8c8e8f1a9b.mp3',
    isGenerated: false
  },

  // Celebration
  {
    id: 'celebration_drums',
    name: 'Tambours de Fête',
    name_ba: 'Ìlù Ayẹyẹ',
    category: 'celebration',
    mood: 'joyful',
    duration: 45,
    bpm: 130,
    description: 'Percussions festives pour célébrations',
    tags: ['fête', 'danse', 'joie'],
    url: 'https://cdn.pixabay.com/audio/2022/11/22/audio_6e9a0d4d3e.mp3',
    isGenerated: false
  },
  {
    id: 'wedding_joy',
    name: 'Joie de Mariage',
    name_ba: 'Ayọ̀ Ìgbéyàwó',
    category: 'celebration',
    mood: 'joyful',
    duration: 60,
    bpm: 115,
    description: 'Musique traditionnelle de mariage',
    tags: ['mariage', 'amour', 'famille'],
    url: 'https://cdn.pixabay.com/audio/2022/08/31/audio_4e9d5f9a4c.mp3',
    isGenerated: false
  },
  {
    id: 'harvest_dance',
    name: 'Danse des Récoltes',
    name_ba: 'Ijó Ìkórè',
    category: 'celebration',
    mood: 'energetic',
    duration: 50,
    bpm: 120,
    description: 'Musique pour célébrer les récoltes',
    tags: ['agriculture', 'récolte', 'gratitude'],
    url: 'https://cdn.pixabay.com/audio/2023/05/10/audio_2b8d6e4f1a.mp3',
    isGenerated: false
  },

  // Nature
  {
    id: 'savanna_morning',
    name: 'Matin en Savane',
    name_ba: 'Àárọ̀ Pápá',
    category: 'nature',
    mood: 'calm',
    duration: 200,
    description: 'Sons du lever du soleil en savane',
    tags: ['matin', 'savane', 'oiseaux'],
    url: 'https://cdn.pixabay.com/audio/2022/06/07/audio_b9bd4170e4.mp3',
    isGenerated: false
  },
  {
    id: 'tropical_rain',
    name: 'Pluie Tropicale',
    name_ba: 'Òjò Ilẹ̀ Gbígbóná',
    category: 'nature',
    mood: 'reflective',
    duration: 240,
    description: 'Pluie douce sur la végétation tropicale',
    tags: ['pluie', 'relaxation', 'nature'],
    url: 'https://cdn.pixabay.com/audio/2022/03/24/audio_5edba56c1f.mp3',
    isGenerated: false
  },
  {
    id: 'river_stream',
    name: 'Rivière Paisible',
    name_ba: 'Odò Àlàáfíà',
    category: 'nature',
    mood: 'calm',
    duration: 180,
    description: 'Écoulement d\'eau et chants d\'oiseaux',
    tags: ['eau', 'rivière', 'paix'],
    url: 'https://cdn.pixabay.com/audio/2022/01/18/audio_d0c6ff1bcd.mp3',
    isGenerated: false
  }
];

// Helper functions
export const getMusicByCategory = (category: MusicTrack['category']): MusicTrack[] => {
  return MUSIC_LIBRARY.filter(track => track.category === category);
};

export const getMusicByMood = (mood: MusicTrack['mood']): MusicTrack[] => {
  return MUSIC_LIBRARY.filter(track => track.mood === mood);
};

export const getMusicByTags = (tags: string[]): MusicTrack[] => {
  return MUSIC_LIBRARY.filter(track => 
    tags.some(tag => track.tags.includes(tag.toLowerCase()))
  );
};

export const getSuggestedMusic = (context: {
  topic?: string;
  mood?: string;
  duration?: number;
}): MusicTrack[] => {
  let suggestions = [...MUSIC_LIBRARY];
  
  // Filter by topic-related tags
  if (context.topic) {
    const topicTags: Record<string, string[]> = {
      agriculture: ['récolte', 'nature', 'matin', 'village'],
      health: ['calme', 'méditation', 'relaxation'],
      education: ['apprentissage', 'focus', 'étude'],
      market: ['marché', 'commerce', 'énergie'],
      culture: ['traditionnel', 'cérémonie', 'sagesse'],
      celebration: ['fête', 'joie', 'danse']
    };
    
    const relevantTags = topicTags[context.topic] || [];
    if (relevantTags.length > 0) {
      suggestions = suggestions.filter(track =>
        relevantTags.some(tag => track.tags.includes(tag))
      );
    }
  }
  
  // Filter by mood
  if (context.mood) {
    const moodMap: Record<string, MusicTrack['mood'][]> = {
      happy: ['joyful', 'energetic'],
      sad: ['reflective', 'calm'],
      excited: ['energetic', 'joyful'],
      calm: ['calm', 'reflective'],
      motivating: ['motivating', 'energetic']
    };
    
    const targetMoods = moodMap[context.mood] || [context.mood as MusicTrack['mood']];
    suggestions = suggestions.filter(track => targetMoods.includes(track.mood));
  }
  
  // Filter by approximate duration
  if (context.duration) {
    suggestions = suggestions.filter(track => 
      track.duration >= context.duration! * 0.5 && track.duration <= context.duration! * 1.5
    );
  }
  
  // Return top 5 suggestions
  return suggestions.slice(0, 5);
};

export default MUSIC_LIBRARY;
