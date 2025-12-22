// Music library for TamTam - Traditional Bariba & North Benin sounds

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
  url?: string; // URL to audio file if available
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
  // Traditional
  {
    id: 'tamtam_rhythm_1',
    name: 'Rythme Tam-Tam Royal',
    name_ba: 'Gàngan Ọba',
    category: 'traditional',
    mood: 'energetic',
    duration: 30,
    bpm: 120,
    description: 'Rythme traditionnel des cérémonies royales Bariba',
    tags: ['royauté', 'cérémonie', 'danse'],
    isGenerated: true
  },
  {
    id: 'tamtam_rhythm_2',
    name: 'Battement de Djembé',
    name_ba: 'Gùdùgùdù Bàtà',
    category: 'traditional',
    mood: 'energetic',
    duration: 25,
    bpm: 100,
    description: 'Rythme de djembé énergique',
    tags: ['danse', 'énergie', 'groupe'],
    isGenerated: true
  },
  {
    id: 'flute_pastoral',
    name: 'Flûte du Berger',
    name_ba: 'Fèrè Dàrandàran',
    category: 'traditional',
    mood: 'calm',
    duration: 40,
    bpm: 70,
    description: 'Mélodie traditionnelle des bergers Peuls',
    tags: ['pastoral', 'calme', 'méditation'],
    isGenerated: true
  },
  {
    id: 'kora_melody',
    name: 'Mélodie de Kora',
    name_ba: 'Orin Kora',
    category: 'traditional',
    mood: 'reflective',
    duration: 45,
    bpm: 80,
    description: 'Harmonie douce de kora traditionnelle',
    tags: ['harmonie', 'histoire', 'sagesse'],
    isGenerated: true
  },
  {
    id: 'balafon_festif',
    name: 'Balafon Festif',
    name_ba: 'Agídígbo Ayẹyẹ',
    category: 'traditional',
    mood: 'joyful',
    duration: 35,
    bpm: 110,
    description: 'Rythme joyeux de balafon',
    tags: ['fête', 'joie', 'mariage'],
    isGenerated: true
  },

  // Educational
  {
    id: 'learning_jingle_1',
    name: 'Jingle d\'Apprentissage',
    name_ba: 'Orin Èkó',
    category: 'educational',
    mood: 'motivating',
    duration: 10,
    description: 'Court jingle pour marquer les moments d\'apprentissage',
    tags: ['court', 'transition', 'apprentissage'],
    isGenerated: true
  },
  {
    id: 'concentration_beat',
    name: 'Battement de Concentration',
    name_ba: 'Ìfọkànsí Lù',
    category: 'educational',
    mood: 'calm',
    duration: 60,
    bpm: 60,
    description: 'Rythme lent pour aider la concentration',
    tags: ['focus', 'étude', 'calme'],
    isGenerated: true
  },
  {
    id: 'success_fanfare',
    name: 'Fanfare de Succès',
    name_ba: 'Ìṣẹ́gun Fèrè',
    category: 'educational',
    mood: 'joyful',
    duration: 5,
    description: 'Courte fanfare pour célébrer les réussites',
    tags: ['victoire', 'célébration', 'court'],
    isGenerated: true
  },

  // Ambient
  {
    id: 'village_morning',
    name: 'Matin au Village',
    name_ba: 'Àárọ̀ Ní Àbúlé',
    category: 'ambient',
    mood: 'calm',
    duration: 120,
    description: 'Sons du matin dans un village béninois',
    tags: ['matin', 'village', 'coq', 'oiseaux'],
    isGenerated: true
  },
  {
    id: 'market_ambiance',
    name: 'Ambiance de Marché',
    name_ba: 'Àríyá Ọjà',
    category: 'ambient',
    mood: 'energetic',
    duration: 90,
    description: 'Sons et murmures d\'un marché animé',
    tags: ['marché', 'commerce', 'foule'],
    isGenerated: true
  },
  {
    id: 'evening_crickets',
    name: 'Criquets du Soir',
    name_ba: 'Kírìkítì Àṣálẹ́',
    category: 'ambient',
    mood: 'calm',
    duration: 180,
    description: 'Chant des criquets au coucher du soleil',
    tags: ['soir', 'nature', 'relaxation'],
    isGenerated: true
  },

  // Celebration
  {
    id: 'wedding_drums',
    name: 'Tambours de Mariage',
    name_ba: 'Ìlù Ìgbéyàwó',
    category: 'celebration',
    mood: 'joyful',
    duration: 60,
    bpm: 130,
    description: 'Rythmes traditionnels de mariage',
    tags: ['mariage', 'fête', 'danse'],
    isGenerated: true
  },
  {
    id: 'harvest_celebration',
    name: 'Fête des Récoltes',
    name_ba: 'Odún Ìkórè',
    category: 'celebration',
    mood: 'joyful',
    duration: 45,
    bpm: 115,
    description: 'Musique de célébration des récoltes',
    tags: ['agriculture', 'récolte', 'gratitude'],
    isGenerated: true
  },
  {
    id: 'birth_celebration',
    name: 'Célébration de Naissance',
    name_ba: 'Ayẹyẹ Ọmọ Tuntun',
    category: 'celebration',
    mood: 'joyful',
    duration: 30,
    bpm: 100,
    description: 'Musique douce pour accueillir un nouveau-né',
    tags: ['naissance', 'famille', 'joie'],
    isGenerated: true
  },

  // Nature
  {
    id: 'savanna_wind',
    name: 'Vent de Savane',
    name_ba: 'Afẹ́fẹ́ Pápá',
    category: 'nature',
    mood: 'calm',
    duration: 120,
    description: 'Sons du vent dans la savane',
    tags: ['vent', 'savane', 'paix'],
    isGenerated: true
  },
  {
    id: 'river_flow',
    name: 'Rivière Qui Coule',
    name_ba: 'Odò Tí Ń Ṣàn',
    category: 'nature',
    mood: 'calm',
    duration: 180,
    description: 'Son apaisant d\'une rivière',
    tags: ['eau', 'rivière', 'méditation'],
    isGenerated: true
  },
  {
    id: 'tropical_birds',
    name: 'Oiseaux Tropicaux',
    name_ba: 'Ẹyẹ Ilẹ̀ Gbígbóná',
    category: 'nature',
    mood: 'calm',
    duration: 150,
    description: 'Chants d\'oiseaux de la forêt tropicale',
    tags: ['oiseaux', 'forêt', 'nature'],
    isGenerated: true
  },
  {
    id: 'rain_on_leaves',
    name: 'Pluie sur les Feuilles',
    name_ba: 'Òjò Lórí Ewé',
    category: 'nature',
    mood: 'reflective',
    duration: 200,
    description: 'Son de pluie tombant sur le feuillage',
    tags: ['pluie', 'relaxation', 'nature'],
    isGenerated: true
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
      culture: ['traditionnel', 'cérémonie', 'histoire'],
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
