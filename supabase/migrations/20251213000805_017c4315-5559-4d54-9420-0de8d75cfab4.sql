
-- YOVO Social Platform Tables

-- User profiles for YOVO
CREATE TABLE public.yovo_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT,
  bio_audio_url TEXT,
  avatar_url TEXT,
  cover_url TEXT,
  location TEXT,
  is_verified BOOLEAN DEFAULT false,
  followers_count INTEGER DEFAULT 0,
  following_count INTEGER DEFAULT 0,
  posts_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Voice posts (fil d'actualité)
CREATE TABLE public.yovo_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE,
  audio_url TEXT NOT NULL,
  duration_seconds INTEGER,
  transcript TEXT,
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  shares_count INTEGER DEFAULT 0,
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Voice messages
CREATE TABLE public.yovo_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID REFERENCES auth.users ON DELETE CASCADE,
  receiver_id UUID REFERENCES auth.users ON DELETE CASCADE,
  audio_url TEXT NOT NULL,
  duration_seconds INTEGER,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Live audio rooms
CREATE TABLE public.yovo_rooms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  host_id UUID REFERENCES auth.users ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  cover_url TEXT,
  is_live BOOLEAN DEFAULT false,
  participants_count INTEGER DEFAULT 0,
  max_participants INTEGER DEFAULT 100,
  category TEXT,
  started_at TIMESTAMP WITH TIME ZONE,
  ended_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Voice groups
CREATE TABLE public.yovo_groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  cover_url TEXT,
  owner_id UUID REFERENCES auth.users ON DELETE CASCADE,
  members_count INTEGER DEFAULT 0,
  is_public BOOLEAN DEFAULT true,
  category TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Jobs marketplace
CREATE TABLE public.yovo_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employer_id UUID REFERENCES auth.users ON DELETE CASCADE,
  title TEXT NOT NULL,
  description_audio_url TEXT,
  description_text TEXT,
  location TEXT,
  salary_range TEXT,
  job_type TEXT,
  category TEXT,
  is_active BOOLEAN DEFAULT true,
  applications_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Marketplace products
CREATE TABLE public.yovo_products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  seller_id UUID REFERENCES auth.users ON DELETE CASCADE,
  title TEXT NOT NULL,
  description_audio_url TEXT,
  description_text TEXT,
  price DECIMAL(10,2),
  currency TEXT DEFAULT 'XOF',
  images TEXT[],
  category TEXT,
  location TEXT,
  is_available BOOLEAN DEFAULT true,
  views_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Emergency contacts
CREATE TABLE public.yovo_emergency_contacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  relationship TEXT,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.yovo_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.yovo_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.yovo_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.yovo_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.yovo_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.yovo_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.yovo_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.yovo_emergency_contacts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Public profiles are viewable by everyone" ON public.yovo_profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.yovo_profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.yovo_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Public posts are viewable by everyone" ON public.yovo_posts FOR SELECT USING (is_public = true);
CREATE POLICY "Users can manage own posts" ON public.yovo_posts FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own messages" ON public.yovo_messages FOR SELECT USING (auth.uid() IN (sender_id, receiver_id));
CREATE POLICY "Users can send messages" ON public.yovo_messages FOR INSERT WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Live rooms are viewable by everyone" ON public.yovo_rooms FOR SELECT USING (true);
CREATE POLICY "Users can manage own rooms" ON public.yovo_rooms FOR ALL USING (auth.uid() = host_id);

CREATE POLICY "Public groups are viewable by everyone" ON public.yovo_groups FOR SELECT USING (is_public = true);
CREATE POLICY "Users can manage own groups" ON public.yovo_groups FOR ALL USING (auth.uid() = owner_id);

CREATE POLICY "Active jobs are viewable by everyone" ON public.yovo_jobs FOR SELECT USING (is_active = true);
CREATE POLICY "Users can manage own jobs" ON public.yovo_jobs FOR ALL USING (auth.uid() = employer_id);

CREATE POLICY "Available products are viewable by everyone" ON public.yovo_products FOR SELECT USING (is_available = true);
CREATE POLICY "Users can manage own products" ON public.yovo_products FOR ALL USING (auth.uid() = seller_id);

CREATE POLICY "Users can view own emergency contacts" ON public.yovo_emergency_contacts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own emergency contacts" ON public.yovo_emergency_contacts FOR ALL USING (auth.uid() = user_id);
