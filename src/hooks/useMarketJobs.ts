import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface MarketJob {
  id: string;
  employer_id: string | null;
  title: string;
  title_fr: string | null;
  title_ba: string | null;
  description_text: string | null;
  description_audio_url: string | null;
  job_type: 'offer' | 'demand';
  category: string | null;
  location: string | null;
  salary_range: string | null;
  availability_status: 'available' | 'busy' | 'searching';
  audio_presentation_url: string | null;
  skills_audio_url: string | null;
  emoji_icon: string | null;
  urgency: 'normal' | 'urgent' | 'very_urgent';
  contact_phone: string | null;
  applications_count: number | null;
  is_active: boolean | null;
  created_at: string | null;
  updated_at: string | null;
  // Joined profile
  employer_profile?: {
    display_name: string | null;
    avatar_url: string | null;
    username: string;
  };
}

export interface JobApplication {
  id: string;
  job_id: string;
  applicant_id: string;
  audio_message_url: string | null;
  status: 'pending' | 'accepted' | 'rejected' | 'viewed';
  notes: string | null;
  created_at: string | null;
  applicant_profile?: {
    display_name: string | null;
    avatar_url: string | null;
    username: string;
  };
}

export interface CreateJobInput {
  title_fr: string;
  title_ba?: string;
  description_text?: string;
  description_audio_url?: string;
  job_type: 'offer' | 'demand';
  category?: string;
  location?: string;
  salary_range?: string;
  audio_presentation_url?: string;
  skills_audio_url?: string;
  emoji_icon?: string;
  urgency?: 'normal' | 'urgent' | 'very_urgent';
  contact_phone?: string;
}

export interface UseMarketJobsReturn {
  offers: MarketJob[];
  demands: MarketJob[];
  availableWorkers: MarketJob[];
  myJobs: MarketJob[];
  myApplications: JobApplication[];
  isLoading: boolean;
  isCreating: boolean;
  error: string | null;
  fetchOffers: (category?: string) => Promise<void>;
  fetchDemands: (category?: string) => Promise<void>;
  fetchAvailableWorkers: () => Promise<void>;
  fetchMyJobs: () => Promise<void>;
  fetchMyApplications: () => Promise<void>;
  fetchJobApplications: (jobId: string) => Promise<JobApplication[]>;
  createJob: (input: CreateJobInput) => Promise<MarketJob | null>;
  updateJob: (id: string, input: Partial<CreateJobInput>) => Promise<boolean>;
  deleteJob: (id: string) => Promise<boolean>;
  applyToJob: (jobId: string, audioMessageUrl?: string) => Promise<boolean>;
  updateApplicationStatus: (applicationId: string, status: 'accepted' | 'rejected') => Promise<boolean>;
  toggleAvailability: (status: 'available' | 'busy' | 'searching') => Promise<boolean>;
  searchJobs: (query: string, type?: 'offer' | 'demand') => Promise<MarketJob[]>;
}

export function useMarketJobs(): UseMarketJobsReturn {
  const [offers, setOffers] = useState<MarketJob[]>([]);
  const [demands, setDemands] = useState<MarketJob[]>([]);
  const [availableWorkers, setAvailableWorkers] = useState<MarketJob[]>([]);
  const [myJobs, setMyJobs] = useState<MarketJob[]>([]);
  const [myApplications, setMyApplications] = useState<JobApplication[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchOffers = useCallback(async (category?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      let query = supabase
        .from('tamtam_jobs')
        .select('*')
        .eq('job_type', 'offer')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (category) {
        query = query.eq('category', category);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      setOffers((data || []) as unknown as MarketJob[]);
    } catch (err: any) {
      console.error('[useMarketJobs] fetchOffers error:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchDemands = useCallback(async (category?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      let query = supabase
        .from('tamtam_jobs')
        .select('*')
        .eq('job_type', 'demand')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (category) {
        query = query.eq('category', category);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      setDemands((data || []) as unknown as MarketJob[]);
    } catch (err: any) {
      console.error('[useMarketJobs] fetchDemands error:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchAvailableWorkers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('tamtam_jobs')
        .select('*')
        .eq('job_type', 'demand')
        .eq('availability_status', 'available')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      setAvailableWorkers((data || []) as unknown as MarketJob[]);
    } catch (err: any) {
      console.error('[useMarketJobs] fetchAvailableWorkers error:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchMyJobs = useCallback(async () => {
    if (!user) return;
    
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('tamtam_jobs')
        .select('*')
        .eq('employer_id', user.id)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      setMyJobs((data || []) as unknown as MarketJob[]);
    } catch (err: any) {
      console.error('[useMarketJobs] fetchMyJobs error:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const fetchMyApplications = useCallback(async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const { data, error: fetchError } = await supabase
        .from('tamtam_job_applications')
        .select('*')
        .eq('applicant_id', user.id)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      setMyApplications((data || []) as unknown as JobApplication[]);
    } catch (err: any) {
      console.error('[useMarketJobs] fetchMyApplications error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const fetchJobApplications = useCallback(async (jobId: string): Promise<JobApplication[]> => {
    try {
      const { data, error: fetchError } = await supabase
        .from('tamtam_job_applications')
        .select(`
          *,
          applicant_profile:tamtam_profiles!tamtam_job_applications_applicant_id_fkey(
            display_name, avatar_url, username
          )
        `)
        .eq('job_id', jobId)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      return (data || []) as unknown as JobApplication[];
    } catch (err: any) {
      console.error('[useMarketJobs] fetchJobApplications error:', err);
      return [];
    }
  }, []);

  const createJob = useCallback(async (input: CreateJobInput): Promise<MarketJob | null> => {
    if (!user) {
      toast({
        title: "Erreur",
        description: "Vous devez être connecté",
        variant: "destructive"
      });
      return null;
    }

    setIsCreating(true);
    try {
      const { data, error: insertError } = await supabase
        .from('tamtam_jobs')
        .insert({
          employer_id: user.id,
          title: input.title_fr,
          title_fr: input.title_fr,
          title_ba: input.title_ba,
          description_text: input.description_text,
          description_audio_url: input.description_audio_url,
          job_type: input.job_type,
          category: input.category,
          location: input.location,
          salary_range: input.salary_range,
          audio_presentation_url: input.audio_presentation_url,
          skills_audio_url: input.skills_audio_url,
          emoji_icon: input.emoji_icon || '💼',
          urgency: input.urgency || 'normal',
          contact_phone: input.contact_phone,
          is_active: true,
          availability_status: input.job_type === 'demand' ? 'searching' : 'available'
        })
        .select()
        .single();

      if (insertError) throw insertError;

      const newJob = data as unknown as MarketJob;
      setMyJobs(prev => [newJob, ...prev]);
      
      toast({
        title: input.job_type === 'offer' ? "✅ Offre publiée" : "✅ Demande publiée",
        description: "Votre annonce est maintenant visible"
      });

      return newJob;
    } catch (err: any) {
      console.error('[useMarketJobs] createJob error:', err);
      toast({
        title: "Erreur",
        description: err.message,
        variant: "destructive"
      });
      return null;
    } finally {
      setIsCreating(false);
    }
  }, [user, toast]);

  const updateJob = useCallback(async (id: string, input: Partial<CreateJobInput>): Promise<boolean> => {
    try {
      const updateData: any = { ...input };
      if (input.title_fr) {
        updateData.title = input.title_fr;
      }

      const { error: updateError } = await supabase
        .from('tamtam_jobs')
        .update(updateData)
        .eq('id', id)
        .eq('employer_id', user?.id);

      if (updateError) throw updateError;

      setMyJobs(prev => 
        prev.map(j => j.id === id ? { ...j, ...updateData } : j)
      );

      toast({
        title: "✅ Annonce modifiée"
      });

      return true;
    } catch (err: any) {
      console.error('[useMarketJobs] updateJob error:', err);
      toast({
        title: "Erreur",
        description: err.message,
        variant: "destructive"
      });
      return false;
    }
  }, [user, toast]);

  const deleteJob = useCallback(async (id: string): Promise<boolean> => {
    try {
      const { error: deleteError } = await supabase
        .from('tamtam_jobs')
        .delete()
        .eq('id', id)
        .eq('employer_id', user?.id);

      if (deleteError) throw deleteError;

      setMyJobs(prev => prev.filter(j => j.id !== id));
      setOffers(prev => prev.filter(j => j.id !== id));
      setDemands(prev => prev.filter(j => j.id !== id));

      toast({
        title: "🗑️ Annonce supprimée"
      });

      return true;
    } catch (err: any) {
      console.error('[useMarketJobs] deleteJob error:', err);
      return false;
    }
  }, [user, toast]);

  const applyToJob = useCallback(async (jobId: string, audioMessageUrl?: string): Promise<boolean> => {
    if (!user) {
      toast({
        title: "Erreur",
        description: "Vous devez être connecté pour postuler",
        variant: "destructive"
      });
      return false;
    }

    try {
      const { error: insertError } = await supabase
        .from('tamtam_job_applications')
        .insert({
          job_id: jobId,
          applicant_id: user.id,
          audio_message_url: audioMessageUrl,
          status: 'pending'
        });

      if (insertError) {
        if (insertError.code === '23505') {
          toast({
            title: "Info",
            description: "Vous avez déjà postulé à cette offre"
          });
          return false;
        }
        throw insertError;
      }

      toast({
        title: "✅ Candidature envoyée",
        description: "L'employeur va vous contacter"
      });

      return true;
    } catch (err: any) {
      console.error('[useMarketJobs] applyToJob error:', err);
      toast({
        title: "Erreur",
        description: err.message,
        variant: "destructive"
      });
      return false;
    }
  }, [user, toast]);

  const updateApplicationStatus = useCallback(async (applicationId: string, status: 'accepted' | 'rejected'): Promise<boolean> => {
    try {
      const { error: updateError } = await supabase
        .from('tamtam_job_applications')
        .update({ status })
        .eq('id', applicationId);

      if (updateError) throw updateError;

      toast({
        title: status === 'accepted' ? "✅ Candidature acceptée" : "❌ Candidature refusée"
      });

      return true;
    } catch (err: any) {
      console.error('[useMarketJobs] updateApplicationStatus error:', err);
      return false;
    }
  }, [toast]);

  const toggleAvailability = useCallback(async (status: 'available' | 'busy' | 'searching'): Promise<boolean> => {
    if (!user) return false;

    try {
      // Update all user's demand jobs
      const { error: updateError } = await supabase
        .from('tamtam_jobs')
        .update({ availability_status: status })
        .eq('employer_id', user.id)
        .eq('job_type', 'demand');

      if (updateError) throw updateError;

      setMyJobs(prev => 
        prev.map(j => j.job_type === 'demand' ? { ...j, availability_status: status } : j)
      );

      const statusLabels = {
        available: '🟢 Disponible maintenant',
        busy: '🔴 Occupé',
        searching: '🟠 En recherche'
      };

      toast({
        title: statusLabels[status]
      });

      return true;
    } catch (err: any) {
      console.error('[useMarketJobs] toggleAvailability error:', err);
      return false;
    }
  }, [user, toast]);

  const searchJobs = useCallback(async (query: string, type?: 'offer' | 'demand'): Promise<MarketJob[]> => {
    try {
      let dbQuery = supabase
        .from('tamtam_jobs')
        .select('*')
        .eq('is_active', true)
        .or(`title_fr.ilike.%${query}%,title_ba.ilike.%${query}%,description_text.ilike.%${query}%,category.ilike.%${query}%`)
        .order('created_at', { ascending: false })
        .limit(20);

      if (type) {
        dbQuery = dbQuery.eq('job_type', type);
      }

      const { data, error: searchError } = await dbQuery;

      if (searchError) throw searchError;

      return (data || []) as unknown as MarketJob[];
    } catch (err: any) {
      console.error('[useMarketJobs] searchJobs error:', err);
      return [];
    }
  }, []);

  return {
    offers,
    demands,
    availableWorkers,
    myJobs,
    myApplications,
    isLoading,
    isCreating,
    error,
    fetchOffers,
    fetchDemands,
    fetchAvailableWorkers,
    fetchMyJobs,
    fetchMyApplications,
    fetchJobApplications,
    createJob,
    updateJob,
    deleteJob,
    applyToJob,
    updateApplicationStatus,
    toggleAvailability,
    searchJobs
  };
}
