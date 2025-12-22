import { useMemo, useCallback } from 'react';
import { EnhancedPost } from '@/components/tamtam/TamTamEnhancedFeedCard';

interface PostScores {
  comprehension: number;
  utility: number;
  culture: number;
  engagement: number;
  recency: number;
  total: number;
}

interface UseFeedAlgorithmOptions {
  prioritizeUtility?: boolean;
  prioritizeCulture?: boolean;
  boostLocal?: boolean;
  diversityFactor?: number;
}

interface UseFeedAlgorithmReturn {
  rankPosts: (posts: EnhancedPost[]) => EnhancedPost[];
  getPostScore: (post: EnhancedPost) => PostScores;
  recordInteraction: (postId: string, type: 'view' | 'understood' | 'question' | 'imitate' | 'share') => void;
}

// Weights for different scoring factors
const WEIGHTS = {
  comprehension: 0.25,  // Est-ce compréhensible?
  utility: 0.25,        // Est-ce utile?
  culture: 0.20,        // Transmet-il culture/langue?
  engagement: 0.15,     // Interactions
  recency: 0.15         // Récent
};

// Topic scoring by category
const TOPIC_SCORES = {
  agriculture: { utility: 0.9, culture: 0.5, comprehension: 0.8 },
  health: { utility: 1.0, culture: 0.3, comprehension: 0.9 },
  education: { utility: 0.9, culture: 0.6, comprehension: 0.85 },
  culture: { utility: 0.5, culture: 1.0, comprehension: 0.7 },
  market: { utility: 0.85, culture: 0.4, comprehension: 0.9 },
  village: { utility: 0.8, culture: 0.7, comprehension: 0.85 },
  general: { utility: 0.5, culture: 0.5, comprehension: 0.7 }
};

export const useFeedAlgorithm = (options: UseFeedAlgorithmOptions = {}): UseFeedAlgorithmReturn => {
  const { 
    prioritizeUtility = true, 
    prioritizeCulture = true,
    boostLocal = true,
    diversityFactor = 0.2 
  } = options;

  // Calculate score for a single post
  const getPostScore = useCallback((post: EnhancedPost): PostScores => {
    // Base scores from post data
    const comprehension = (post as any).comprehension_score || 50;
    const utility = (post as any).utility_score || 50;
    const culture = (post as any).culture_score || 50;

    // Engagement score from reactions
    const totalReactions = post.reactions 
      ? Object.values(post.reactions).reduce((a, b) => a + b, 0)
      : 0;
    const engagement = Math.min(100, totalReactions * 5);

    // Recency score (last 24h = 100, decreasing)
    const createdAt = new Date(post.created_at || Date.now());
    const hoursSinceCreated = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60);
    const recency = Math.max(0, 100 - (hoursSinceCreated * 2)); // -2 points per hour

    // Topic-based adjustments
    const topic = (post as any).topic as keyof typeof TOPIC_SCORES || 'general';
    const topicScores = TOPIC_SCORES[topic] || TOPIC_SCORES.general;

    // Apply topic multipliers
    const adjustedComprehension = comprehension * topicScores.comprehension;
    const adjustedUtility = utility * topicScores.utility;
    const adjustedCulture = culture * topicScores.culture;

    // Calculate weighted total
    let total = 
      adjustedComprehension * WEIGHTS.comprehension +
      adjustedUtility * WEIGHTS.utility +
      adjustedCulture * WEIGHTS.culture +
      engagement * WEIGHTS.engagement +
      recency * WEIGHTS.recency;

    // Apply priority boosts
    if (prioritizeUtility) {
      total += adjustedUtility * 0.1;
    }
    if (prioritizeCulture) {
      total += adjustedCulture * 0.1;
    }

    // Local boost if post has location
    if (boostLocal && (post as any).location_name) {
      total *= 1.15;
    }

    return {
      comprehension: adjustedComprehension,
      utility: adjustedUtility,
      culture: adjustedCulture,
      engagement,
      recency,
      total: Math.round(total)
    };
  }, [prioritizeUtility, prioritizeCulture, boostLocal]);

  // Rank posts with diversity consideration
  const rankPosts = useCallback((posts: EnhancedPost[]): EnhancedPost[] => {
    // Score all posts
    const scoredPosts = posts.map(post => ({
      post,
      scores: getPostScore(post)
    }));

    // Sort by total score
    scoredPosts.sort((a, b) => b.scores.total - a.scores.total);

    // Apply diversity - avoid showing too many posts of same topic in a row
    const diversifiedPosts: EnhancedPost[] = [];
    const usedTopics = new Map<string, number>();
    const remainingPosts = [...scoredPosts];

    while (remainingPosts.length > 0 && diversifiedPosts.length < posts.length) {
      // Find best post that doesn't repeat topic too much
      let selectedIndex = 0;
      
      for (let i = 0; i < remainingPosts.length; i++) {
        const topic = (remainingPosts[i].post as any).topic || 'general';
        const topicCount = usedTopics.get(topic) || 0;
        
        // If this topic hasn't been used much recently, prefer it
        if (topicCount < 2) {
          selectedIndex = i;
          break;
        }
      }

      const selected = remainingPosts.splice(selectedIndex, 1)[0];
      diversifiedPosts.push(selected.post);
      
      // Track topic usage
      const topic = (selected.post as any).topic || 'general';
      usedTopics.set(topic, (usedTopics.get(topic) || 0) + 1);
      
      // Reset topic counts every 5 posts
      if (diversifiedPosts.length % 5 === 0) {
        usedTopics.clear();
      }
    }

    return diversifiedPosts;
  }, [getPostScore, diversityFactor]);

  // Record user interaction for future scoring
  const recordInteraction = useCallback((postId: string, type: 'view' | 'understood' | 'question' | 'imitate' | 'share') => {
    // This would typically save to localStorage or send to backend
    // For now, just log
    console.log('[useFeedAlgorithm] Interaction:', { postId, type });
    
    // Could be used to update local preferences or send analytics
    const interactionScores = {
      view: { comprehension: 0, utility: 0, culture: 0 },
      understood: { comprehension: 10, utility: 5, culture: 0 },
      question: { comprehension: -5, utility: 5, culture: 0 },
      imitate: { comprehension: 10, utility: 10, culture: 10 },
      share: { comprehension: 5, utility: 10, culture: 5 }
    };
    
    // Store interaction for future algorithm training
    const stored = JSON.parse(localStorage.getItem('feed_interactions') || '[]');
    stored.push({ postId, type, timestamp: Date.now() });
    localStorage.setItem('feed_interactions', JSON.stringify(stored.slice(-100))); // Keep last 100
  }, []);

  return {
    rankPosts,
    getPostScore,
    recordInteraction
  };
};
