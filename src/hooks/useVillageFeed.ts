import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { EnhancedPost } from '@/components/tamtam/TamTamEnhancedFeedCard';

interface LocalAlert {
  id: string;
  alert_type: 'weather' | 'health' | 'market' | 'event' | 'emergency';
  title: string;
  audio_url: string | null;
  audio_url_ba: string | null;
  content: string | null;
  location_name: string | null;
  expires_at: string | null;
  created_at: string;
}

interface UseVillageFeedOptions {
  radiusKm?: number;
  categories?: ('weather' | 'health' | 'market' | 'event' | 'emergency')[];
}

interface UseVillageFeedReturn {
  localPosts: EnhancedPost[];
  localAlerts: LocalAlert[];
  isLoading: boolean;
  error: string | null;
  userLocation: { lat: number; lng: number } | null;
  locationName: string | null;
  
  refreshFeed: () => Promise<void>;
  requestLocation: () => void;
}

export const useVillageFeed = (options: UseVillageFeedOptions = {}): UseVillageFeedReturn => {
  const { radiusKm = 50, categories } = options;
  
  const [localPosts, setLocalPosts] = useState<EnhancedPost[]>([]);
  const [localAlerts, setLocalAlerts] = useState<LocalAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationName, setLocationName] = useState<string | null>(null);

  // Request user location
  const requestLocation = useCallback(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setUserLocation({ lat: latitude, lng: longitude });
          
          // Try to get location name (simplified - could use reverse geocoding API)
          setLocationName('Ma position');
        },
        (err) => {
          console.error('[useVillageFeed] Geolocation error:', err);
          setError('Impossible d\'obtenir votre position');
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } else {
      setError('La géolocalisation n\'est pas supportée');
    }
  }, []);

  // Fetch local posts
  const fetchLocalPosts = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Fetch posts - if we have location, filter by proximity
      let query = supabase
        .from('tamtam_posts')
        .select(`
          *,
          profile:tamtam_profiles!tamtam_posts_user_id_fkey(username, display_name, avatar_url)
        `)
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .limit(30);

      // If user has location and posts have location, filter by distance
      // Note: For proper distance filtering, you'd use PostGIS or compute client-side
      
      const { data: postsData, error: postsError } = await query;
      
      if (postsError) throw postsError;

      // Filter posts by distance if we have location
      let filteredPosts = postsData || [];
      
      if (userLocation && filteredPosts.length > 0) {
        filteredPosts = filteredPosts.filter(post => {
          if (!post.location_lat || !post.location_lng) {
            // Include posts without location for now
            return true;
          }
          
          // Simple distance calculation (Haversine would be more accurate)
          const latDiff = Math.abs(post.location_lat - userLocation.lat);
          const lngDiff = Math.abs(post.location_lng - userLocation.lng);
          const approxKm = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff) * 111; // ~111km per degree
          
          return approxKm <= radiusKm;
        });
      }

      // Transform to EnhancedPost format
      const enhancedPosts: EnhancedPost[] = filteredPosts.map(post => ({
        ...post,
        media_type: post.media_type || 'audio',
        media_url: post.media_url || null,
        thumbnail_url: post.thumbnail_url || null,
        transcript_fr: post.transcript_fr || post.transcript || null,
        transcript_ba: post.transcript_ba || null,
        feeling_emoji: post.feeling_emoji || null,
        profile: Array.isArray(post.profile) ? post.profile[0] : post.profile
      }));

      setLocalPosts(enhancedPosts);
    } catch (err: any) {
      console.error('[useVillageFeed] Error fetching posts:', err);
      setError(err.message);
    }
  }, [userLocation, radiusKm]);

  // Fetch local alerts
  const fetchLocalAlerts = useCallback(async () => {
    try {
      let query = supabase
        .from('tamtam_local_alerts')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(10);

      if (categories && categories.length > 0) {
        query = query.in('alert_type', categories);
      }

      const { data, error: alertsError } = await query;
      
      if (alertsError) throw alertsError;
      
      setLocalAlerts((data || []) as LocalAlert[]);
    } catch (err: any) {
      console.error('[useVillageFeed] Error fetching alerts:', err);
    }
  }, [categories]);

  // Combined refresh
  const refreshFeed = useCallback(async () => {
    await Promise.all([fetchLocalPosts(), fetchLocalAlerts()]);
    setIsLoading(false);
  }, [fetchLocalPosts, fetchLocalAlerts]);

  // Initial load
  useEffect(() => {
    requestLocation();
  }, [requestLocation]);

  // Fetch when location changes
  useEffect(() => {
    refreshFeed();
  }, [userLocation, refreshFeed]);

  return {
    localPosts,
    localAlerts,
    isLoading,
    error,
    userLocation,
    locationName,
    
    refreshFeed,
    requestLocation
  };
};
