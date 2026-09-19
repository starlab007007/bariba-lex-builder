-- FITILA 1.8.1+12 — Aburu product linkage + Realtime publication hardening
-- Additive and idempotent: safe to apply on an already partially migrated project.

ALTER TABLE public.tamtam_posts
  ADD COLUMN IF NOT EXISTS product_id UUID
  REFERENCES public.tamtam_products(id)
  ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS tamtam_posts_product_idx
  ON public.tamtam_posts (product_id);

DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime
      ADD TABLE public.tamtam_live_chat_messages;
  EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN undefined_object THEN NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime
      ADD TABLE public.tamtam_live_signals;
  EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN undefined_object THEN NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime
      ADD TABLE public.tamtam_live_viewers;
  EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN undefined_object THEN NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime
      ADD TABLE public.handunia_fragments;
  EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN undefined_object THEN NULL;
  END;
END
$$;

ALTER TABLE public.tamtam_live_chat_messages REPLICA IDENTITY FULL;
ALTER TABLE public.tamtam_live_signals REPLICA IDENTITY FULL;
ALTER TABLE public.tamtam_live_viewers REPLICA IDENTITY FULL;
ALTER TABLE public.handunia_fragments REPLICA IDENTITY FULL;
