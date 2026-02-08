-- Add metadata JSONB column to videos table for storing classification details
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT NULL;