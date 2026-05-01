-- Roles enum + table (separate from profiles for security)
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  student_id TEXT,
  contact_number TEXT,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Security definer role checker (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

-- Items
CREATE TABLE public.items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('lost','found')),
  item_name TEXT NOT NULL,
  description TEXT,
  date_time TIMESTAMPTZ NOT NULL,
  estimated_value NUMERIC,
  brand TEXT,
  color TEXT,
  last_location TEXT,
  image_url TEXT,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'unclaimed' CHECK (status IN ('unclaimed','claimed','pending')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Claims
CREATE TABLE public.claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  id_image_url TEXT,
  proof_description TEXT NOT NULL,
  agreement BOOLEAN NOT NULL DEFAULT FALSE,
  digital_signature TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_items_updated BEFORE UPDATE ON public.items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_claims_updated BEFORE UPDATE ON public.claims
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile + assign role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, student_id, contact_number)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'student_id', ''),
    COALESCE(NEW.raw_user_meta_data->>'contact_number', '')
  );

  IF NEW.email = 'admin@foundly.app' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.claims ENABLE ROW LEVEL SECURITY;

-- profiles policies
CREATE POLICY "Profiles viewable by authenticated"
  ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users update own profile"
  ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users insert own profile"
  ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- user_roles policies (read own; admins read all)
CREATE POLICY "Users view own roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage roles"
  ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- items policies
CREATE POLICY "Items viewable by authenticated"
  ON public.items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users insert own items"
  ON public.items FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own items or admin"
  ON public.items FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users delete own items or admin"
  ON public.items FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- claims policies
CREATE POLICY "Claims viewable by owner or admin"
  ON public.claims FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users insert own claims"
  ON public.claims FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins update claims"
  ON public.claims FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('item-photos', 'item-photos', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('claim-ids', 'claim-ids', false);

-- item-photos: public read, authenticated upload to own folder
CREATE POLICY "Item photos public read"
  ON storage.objects FOR SELECT USING (bucket_id = 'item-photos');
CREATE POLICY "Item photos auth upload"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'item-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Item photos owner update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'item-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Item photos owner delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'item-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- claim-ids: private, owner + admin
CREATE POLICY "Claim IDs owner or admin read"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'claim-ids' AND (auth.uid()::text = (storage.foldername(name))[1] OR public.has_role(auth.uid(), 'admin')));
CREATE POLICY "Claim IDs owner upload"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'claim-ids' AND auth.uid()::text = (storage.foldername(name))[1]);