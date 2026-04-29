
-- =========================================================
-- ROLEPLAY MULTI-SERVER PLATFORM SCHEMA
-- =========================================================

-- ---------- Profiles (linked to auth.users via Discord login) ----------
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  discord_id TEXT NOT NULL UNIQUE,
  discord_username TEXT NOT NULL,
  discord_avatar TEXT,
  discord_access_token TEXT,
  discord_refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ---------- Servers (one per Discord guild that owner registers) ----------
CREATE TABLE public.servers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guild_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  logo_url TEXT,
  slug TEXT NOT NULL UNIQUE,
  owner_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- channel config
  license_channel_id TEXT,
  fines_channel_id TEXT,
  wanted_channel_id TEXT,
  suspensions_channel_id TEXT,
  -- bot messages
  license_dm_message TEXT DEFAULT 'Your roleplay license has been issued!',
  fine_dm_message TEXT DEFAULT 'You have received a fine.',
  wanted_dm_message TEXT DEFAULT 'You have been marked as wanted.',
  suspension_dm_message TEXT DEFAULT 'Your license has been suspended.',
  -- license template (JSON: {bg_url, fields:[{key,x,y,fontSize,color,fontFamily}]})
  license_template JSONB DEFAULT '{"bg_url":null,"fields":[]}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.servers ENABLE ROW LEVEL SECURITY;

-- ---------- App role enum ----------
CREATE TYPE public.app_role AS ENUM ('owner','staff','police','citizen');

-- ---------- Server members (per-server role of a website user) ----------
CREATE TABLE public.server_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id UUID NOT NULL REFERENCES public.servers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  discord_id TEXT NOT NULL,
  role app_role NOT NULL DEFAULT 'citizen',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (server_id, user_id)
);
ALTER TABLE public.server_members ENABLE ROW LEVEL SECURITY;

-- ---------- Permission action enum ----------
CREATE TYPE public.action_type AS ENUM (
  'approve_license','issue_fine','request_wanted','request_suspension',
  'kick_police','kick_citizen','manage_server','view_audit'
);

-- ---------- Server role permissions: maps Discord role IDs to actions ----------
-- mode: 'direct' or 'request'
CREATE TABLE public.server_role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id UUID NOT NULL REFERENCES public.servers(id) ON DELETE CASCADE,
  discord_role_id TEXT NOT NULL,
  action action_type NOT NULL,
  mode TEXT NOT NULL DEFAULT 'direct' CHECK (mode IN ('direct','request')),
  panel app_role NOT NULL DEFAULT 'police',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (server_id, discord_role_id, action)
);
ALTER TABLE public.server_role_permissions ENABLE ROW LEVEL SECURITY;

-- ---------- has_role security definer (avoid recursion) ----------
CREATE OR REPLACE FUNCTION public.has_server_role(_user_id UUID, _server_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.server_members
    WHERE user_id = _user_id AND server_id = _server_id AND role = _role
  );
$$;

CREATE OR REPLACE FUNCTION public.is_server_owner(_user_id UUID, _server_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT EXISTS (SELECT 1 FROM public.servers WHERE id = _server_id AND owner_user_id = _user_id);
$$;

CREATE OR REPLACE FUNCTION public.get_server_role(_user_id UUID, _server_id UUID)
RETURNS app_role LANGUAGE SQL STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT role FROM public.server_members WHERE user_id = _user_id AND server_id = _server_id LIMIT 1;
$$;

-- Servers RLS
CREATE POLICY "Members view their server" ON public.servers FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.server_members WHERE server_id = servers.id AND user_id = auth.uid()) OR owner_user_id = auth.uid());
CREATE POLICY "Owner updates server" ON public.servers FOR UPDATE USING (owner_user_id = auth.uid());
CREATE POLICY "Authenticated create server" ON public.servers FOR INSERT WITH CHECK (auth.uid() = owner_user_id);
CREATE POLICY "Owner deletes server" ON public.servers FOR DELETE USING (owner_user_id = auth.uid());

-- server_members RLS
CREATE POLICY "Members view fellow members" ON public.server_members FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.server_members sm WHERE sm.server_id = server_members.server_id AND sm.user_id = auth.uid()));
CREATE POLICY "Owner manages members" ON public.server_members FOR ALL
  USING (public.is_server_owner(auth.uid(), server_id))
  WITH CHECK (public.is_server_owner(auth.uid(), server_id));
CREATE POLICY "Self insert membership" ON public.server_members FOR INSERT WITH CHECK (user_id = auth.uid());

-- server_role_permissions RLS
CREATE POLICY "Members view perms" ON public.server_role_permissions FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.server_members WHERE server_id = server_role_permissions.server_id AND user_id = auth.uid()));
CREATE POLICY "Owner manages perms" ON public.server_role_permissions FOR ALL
  USING (public.is_server_owner(auth.uid(), server_id))
  WITH CHECK (public.is_server_owner(auth.uid(), server_id));

-- ---------- Licenses ----------
CREATE TYPE public.license_status AS ENUM ('pending','approved','rejected','suspended');

CREATE TABLE public.licenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id UUID NOT NULL REFERENCES public.servers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  discord_id TEXT NOT NULL,
  rp_name TEXT NOT NULL,
  rp_age INT NOT NULL,
  rp_citizenship TEXT NOT NULL,
  roblox_username TEXT NOT NULL,
  status license_status NOT NULL DEFAULT 'pending',
  license_number TEXT,
  license_image_url TEXT,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT,
  suspended_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (server_id, user_id)
);
ALTER TABLE public.licenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner views all licenses" ON public.licenses FOR SELECT
  USING (public.is_server_owner(auth.uid(), server_id));
CREATE POLICY "Police/staff view licenses" ON public.licenses FOR SELECT
  USING (public.has_server_role(auth.uid(), server_id, 'police') OR public.has_server_role(auth.uid(), server_id, 'staff'));
CREATE POLICY "User views own license" ON public.licenses FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "User creates own license" ON public.licenses FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "User updates own pending license" ON public.licenses FOR UPDATE
  USING (user_id = auth.uid() AND status = 'pending');
CREATE POLICY "Police/staff/owner update licenses" ON public.licenses FOR UPDATE
  USING (public.has_server_role(auth.uid(), server_id, 'police') OR public.has_server_role(auth.uid(), server_id, 'staff') OR public.is_server_owner(auth.uid(), server_id));

-- ---------- Fines ----------
CREATE TABLE public.fines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id UUID NOT NULL REFERENCES public.servers(id) ON DELETE CASCADE,
  target_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_discord_id TEXT NOT NULL,
  issued_by UUID NOT NULL REFERENCES auth.users(id),
  amount NUMERIC NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('pending_request','active','paid','cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.fines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Server members view fines" ON public.fines FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.server_members WHERE server_id = fines.server_id AND user_id = auth.uid()));
CREATE POLICY "Police/staff/owner create fines" ON public.fines FOR INSERT
  WITH CHECK (public.has_server_role(auth.uid(), server_id, 'police') OR public.has_server_role(auth.uid(), server_id, 'staff') OR public.is_server_owner(auth.uid(), server_id));
CREATE POLICY "Police/staff/owner update fines" ON public.fines FOR UPDATE
  USING (public.has_server_role(auth.uid(), server_id, 'police') OR public.has_server_role(auth.uid(), server_id, 'staff') OR public.is_server_owner(auth.uid(), server_id));

-- ---------- Wanted ----------
CREATE TABLE public.wanted (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id UUID NOT NULL REFERENCES public.servers(id) ON DELETE CASCADE,
  target_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_discord_id TEXT NOT NULL,
  issued_by UUID NOT NULL REFERENCES auth.users(id),
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('pending_request','active','cleared')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.wanted ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Server members view wanted" ON public.wanted FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.server_members WHERE server_id = wanted.server_id AND user_id = auth.uid()));
CREATE POLICY "Police/staff/owner create wanted" ON public.wanted FOR INSERT
  WITH CHECK (public.has_server_role(auth.uid(), server_id, 'police') OR public.has_server_role(auth.uid(), server_id, 'staff') OR public.is_server_owner(auth.uid(), server_id));
CREATE POLICY "Police/staff/owner update wanted" ON public.wanted FOR UPDATE
  USING (public.has_server_role(auth.uid(), server_id, 'police') OR public.has_server_role(auth.uid(), server_id, 'staff') OR public.is_server_owner(auth.uid(), server_id));

-- ---------- Action requests (when police role lacks 'direct' permission) ----------
CREATE TABLE public.action_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id UUID NOT NULL REFERENCES public.servers(id) ON DELETE CASCADE,
  requester_id UUID NOT NULL REFERENCES auth.users(id),
  target_user_id UUID REFERENCES auth.users(id),
  target_discord_id TEXT,
  action action_type NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.action_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Police/staff/owner view requests" ON public.action_requests FOR SELECT
  USING (public.has_server_role(auth.uid(), server_id, 'police') OR public.has_server_role(auth.uid(), server_id, 'staff') OR public.is_server_owner(auth.uid(), server_id));
CREATE POLICY "Members create requests" ON public.action_requests FOR INSERT
  WITH CHECK (requester_id = auth.uid());
CREATE POLICY "Police/staff/owner update requests" ON public.action_requests FOR UPDATE
  USING (public.has_server_role(auth.uid(), server_id, 'police') OR public.has_server_role(auth.uid(), server_id, 'staff') OR public.is_server_owner(auth.uid(), server_id));

-- ---------- Audit log ----------
CREATE TABLE public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id UUID NOT NULL REFERENCES public.servers(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES auth.users(id),
  actor_role app_role,
  action TEXT NOT NULL,
  target_id UUID,
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
-- Owner sees ALL, staff sees everything except owner actions
CREATE POLICY "Owner sees all audit" ON public.audit_log FOR SELECT
  USING (public.is_server_owner(auth.uid(), server_id));
CREATE POLICY "Staff sees non-owner audit" ON public.audit_log FOR SELECT
  USING (public.has_server_role(auth.uid(), server_id, 'staff') AND actor_role <> 'owner');
CREATE POLICY "System inserts audit" ON public.audit_log FOR INSERT WITH CHECK (true);

-- ---------- Storage buckets ----------
INSERT INTO storage.buckets (id, name, public) VALUES ('server-logos','server-logos',true) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('license-templates','license-templates',true) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('licenses','licenses',true) ON CONFLICT DO NOTHING;

CREATE POLICY "Public read server-logos" ON storage.objects FOR SELECT USING (bucket_id='server-logos');
CREATE POLICY "Auth upload server-logos" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id='server-logos');
CREATE POLICY "Auth update server-logos" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id='server-logos');

CREATE POLICY "Public read license-templates" ON storage.objects FOR SELECT USING (bucket_id='license-templates');
CREATE POLICY "Auth upload license-templates" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id='license-templates');
CREATE POLICY "Auth update license-templates" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id='license-templates');

CREATE POLICY "Public read licenses" ON storage.objects FOR SELECT USING (bucket_id='licenses');
CREATE POLICY "Service upload licenses" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id='licenses');

-- ---------- Updated_at trigger ----------
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER t_profiles_upd BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER t_servers_upd BEFORE UPDATE ON public.servers FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER t_licenses_upd BEFORE UPDATE ON public.licenses FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
