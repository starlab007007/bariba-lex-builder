-- =============================================
-- REFONTE COMPLÈTE DU MODULE MARCHÉ
-- =============================================

-- 1. Amélioration de la table tamtam_products
ALTER TABLE public.tamtam_products 
ADD COLUMN IF NOT EXISTS title_fr text,
ADD COLUMN IF NOT EXISTS title_ba text,
ADD COLUMN IF NOT EXISTS audio_description_ba text,
ADD COLUMN IF NOT EXISTS thumbnail_url text,
ADD COLUMN IF NOT EXISTS emoji_icon text DEFAULT '📦',
ADD COLUMN IF NOT EXISTS status text DEFAULT 'available' CHECK (status IN ('available', 'sold', 'reserved')),
ADD COLUMN IF NOT EXISTS contact_audio_url text,
ADD COLUMN IF NOT EXISTS seller_phone text,
ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now();

-- Copier les données existantes de title vers title_fr si title_fr est null
UPDATE public.tamtam_products SET title_fr = title WHERE title_fr IS NULL AND title IS NOT NULL;

-- 2. Amélioration de la table tamtam_jobs
ALTER TABLE public.tamtam_jobs
ADD COLUMN IF NOT EXISTS title_fr text,
ADD COLUMN IF NOT EXISTS title_ba text,
ADD COLUMN IF NOT EXISTS job_type text DEFAULT 'offer' CHECK (job_type IN ('offer', 'demand')),
ADD COLUMN IF NOT EXISTS availability_status text DEFAULT 'available' CHECK (availability_status IN ('available', 'busy', 'searching')),
ADD COLUMN IF NOT EXISTS audio_presentation_url text,
ADD COLUMN IF NOT EXISTS skills_audio_url text,
ADD COLUMN IF NOT EXISTS emoji_icon text DEFAULT '💼',
ADD COLUMN IF NOT EXISTS urgency text DEFAULT 'normal' CHECK (urgency IN ('normal', 'urgent', 'very_urgent')),
ADD COLUMN IF NOT EXISTS contact_phone text,
ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now();

-- Copier les données existantes
UPDATE public.tamtam_jobs SET title_fr = title WHERE title_fr IS NULL AND title IS NOT NULL;

-- 3. Créer la table tamtam_job_applications
CREATE TABLE IF NOT EXISTS public.tamtam_job_applications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id uuid NOT NULL REFERENCES public.tamtam_jobs(id) ON DELETE CASCADE,
  applicant_id uuid NOT NULL,
  audio_message_url text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'viewed')),
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(job_id, applicant_id)
);

-- Enable RLS on tamtam_job_applications
ALTER TABLE public.tamtam_job_applications ENABLE ROW LEVEL SECURITY;

-- RLS Policies pour tamtam_job_applications
CREATE POLICY "Users can view their applications"
ON public.tamtam_job_applications
FOR SELECT
USING (auth.uid() = applicant_id);

CREATE POLICY "Job owners can view applications"
ON public.tamtam_job_applications
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.tamtam_jobs
    WHERE tamtam_jobs.id = tamtam_job_applications.job_id
    AND tamtam_jobs.employer_id = auth.uid()
  )
);

CREATE POLICY "Users can apply to jobs"
ON public.tamtam_job_applications
FOR INSERT
WITH CHECK (auth.uid() = applicant_id);

CREATE POLICY "Applicants can update their applications"
ON public.tamtam_job_applications
FOR UPDATE
USING (auth.uid() = applicant_id);

CREATE POLICY "Job owners can update application status"
ON public.tamtam_job_applications
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.tamtam_jobs
    WHERE tamtam_jobs.id = tamtam_job_applications.job_id
    AND tamtam_jobs.employer_id = auth.uid()
  )
);

CREATE POLICY "Applicants can delete their applications"
ON public.tamtam_job_applications
FOR DELETE
USING (auth.uid() = applicant_id);

-- 4. Créer des index pour les performances
CREATE INDEX IF NOT EXISTS idx_tamtam_products_status ON public.tamtam_products(status);
CREATE INDEX IF NOT EXISTS idx_tamtam_products_seller ON public.tamtam_products(seller_id);
CREATE INDEX IF NOT EXISTS idx_tamtam_products_category ON public.tamtam_products(category);

CREATE INDEX IF NOT EXISTS idx_tamtam_jobs_type ON public.tamtam_jobs(job_type);
CREATE INDEX IF NOT EXISTS idx_tamtam_jobs_status ON public.tamtam_jobs(availability_status);
CREATE INDEX IF NOT EXISTS idx_tamtam_jobs_employer ON public.tamtam_jobs(employer_id);
CREATE INDEX IF NOT EXISTS idx_tamtam_jobs_active ON public.tamtam_jobs(is_active);

CREATE INDEX IF NOT EXISTS idx_tamtam_job_applications_job ON public.tamtam_job_applications(job_id);
CREATE INDEX IF NOT EXISTS idx_tamtam_job_applications_applicant ON public.tamtam_job_applications(applicant_id);
CREATE INDEX IF NOT EXISTS idx_tamtam_job_applications_status ON public.tamtam_job_applications(status);

-- 5. Trigger pour updated_at
CREATE OR REPLACE FUNCTION public.update_market_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS update_tamtam_products_updated_at ON public.tamtam_products;
CREATE TRIGGER update_tamtam_products_updated_at
  BEFORE UPDATE ON public.tamtam_products
  FOR EACH ROW
  EXECUTE FUNCTION public.update_market_updated_at();

DROP TRIGGER IF EXISTS update_tamtam_jobs_updated_at ON public.tamtam_jobs;
CREATE TRIGGER update_tamtam_jobs_updated_at
  BEFORE UPDATE ON public.tamtam_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_market_updated_at();

DROP TRIGGER IF EXISTS update_tamtam_job_applications_updated_at ON public.tamtam_job_applications;
CREATE TRIGGER update_tamtam_job_applications_updated_at
  BEFORE UPDATE ON public.tamtam_job_applications
  FOR EACH ROW
  EXECUTE FUNCTION public.update_market_updated_at();