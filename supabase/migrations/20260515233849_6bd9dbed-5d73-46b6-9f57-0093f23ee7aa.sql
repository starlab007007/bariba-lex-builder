
-- 1. MoMo demo wallets
CREATE TABLE public.momo_demo_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT NOT NULL UNIQUE,
  balance BIGINT NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'XOF',
  is_demo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.momo_demo_wallets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read momo wallets" ON public.momo_demo_wallets FOR SELECT USING (true);

INSERT INTO public.momo_demo_wallets (phone, balance, currency)
VALUES ('0191299191', 10000000, 'XOF');

-- 2. Radar signals (raw)
CREATE TABLE public.radar_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  raw_text TEXT NOT NULL,
  source TEXT,
  detected_phone TEXT,
  detected_name TEXT,
  processed BOOLEAN NOT NULL DEFAULT false,
  processed_at TIMESTAMPTZ,
  process_error TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.radar_signals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read signals" ON public.radar_signals FOR SELECT USING (true);
CREATE POLICY "Authenticated insert signals" ON public.radar_signals
  FOR INSERT TO authenticated WITH CHECK (true);

-- 3. Annonces (sellers)
CREATE TABLE public.annonces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_signal_id UUID REFERENCES public.radar_signals(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  seller_name TEXT,
  seller_phone TEXT,
  category TEXT,
  price BIGINT,
  currency TEXT DEFAULT 'XOF',
  whatsapp_sent BOOLEAN NOT NULL DEFAULT false,
  whatsapp_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.annonces ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read annonces" ON public.annonces FOR SELECT USING (true);

-- 4. Acheteurs (buyers)
CREATE TABLE public.acheteurs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_signal_id UUID REFERENCES public.radar_signals(id) ON DELETE SET NULL,
  query TEXT NOT NULL,
  buyer_name TEXT,
  buyer_phone TEXT,
  category TEXT,
  budget BIGINT,
  currency TEXT DEFAULT 'XOF',
  whatsapp_sent BOOLEAN NOT NULL DEFAULT false,
  whatsapp_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.acheteurs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read acheteurs" ON public.acheteurs FOR SELECT USING (true);

-- Indexes
CREATE INDEX idx_radar_signals_processed ON public.radar_signals(processed, created_at);
CREATE INDEX idx_annonces_created ON public.annonces(created_at DESC);
CREATE INDEX idx_acheteurs_created ON public.acheteurs(created_at DESC);

-- updated_at trigger for wallets
CREATE TRIGGER trg_momo_wallets_updated_at
  BEFORE UPDATE ON public.momo_demo_wallets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
