-- Create storage bucket for YOVO audio files
INSERT INTO storage.buckets (id, name, public)
VALUES ('yovo-audio', 'yovo-audio', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for audio files
CREATE POLICY "Users can upload their own audio files"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'yovo-audio' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view all public audio files"
ON storage.objects FOR SELECT
USING (bucket_id = 'yovo-audio');

CREATE POLICY "Users can delete their own audio files"
ON storage.objects FOR DELETE
USING (bucket_id = 'yovo-audio' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Enable realtime for messages and rooms
ALTER PUBLICATION supabase_realtime ADD TABLE public.yovo_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.yovo_rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE public.yovo_posts;

-- Add trigger for auto-creating profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_yovo_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.yovo_profiles (user_id, username, display_name)
  VALUES (NEW.id, 'user_' || substr(NEW.id::text, 1, 8), COALESCE(NEW.raw_user_meta_data ->> 'display_name', 'Nouvel utilisateur'));
  RETURN NEW;
END;
$$;

-- Create trigger for new user registration
DROP TRIGGER IF EXISTS on_auth_user_created_yovo ON auth.users;
CREATE TRIGGER on_auth_user_created_yovo
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_yovo_user();