-- Fix security warnings by setting search_path on functions
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.calculate_level(points INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF points < 100 THEN
    RETURN 1;
  ELSIF points < 300 THEN
    RETURN 2;
  ELSIF points < 600 THEN
    RETURN 3;
  ELSIF points < 1000 THEN
    RETURN 4;
  ELSE
    RETURN 5 + ((points - 1000) / 200);
  END IF;
END;
$$;