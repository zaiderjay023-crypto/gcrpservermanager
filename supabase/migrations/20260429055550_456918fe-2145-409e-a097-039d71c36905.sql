
-- Helper to check membership without triggering RLS recursion
CREATE OR REPLACE FUNCTION public.is_server_member(_user_id UUID, _server_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.server_members WHERE user_id = _user_id AND server_id = _server_id);
$$;
REVOKE ALL ON FUNCTION public.is_server_member(UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_server_member(UUID, UUID) TO authenticated, service_role;

-- Replace recursive policy on server_members
DROP POLICY IF EXISTS "Members view fellow members" ON public.server_members;
CREATE POLICY "Members view fellow members" ON public.server_members FOR SELECT
  USING (user_id = auth.uid() OR public.is_server_owner(auth.uid(), server_id) OR public.is_server_member(auth.uid(), server_id));

-- Also fix servers policy which queries server_members (no recursion technically, but use helper for consistency)
DROP POLICY IF EXISTS "Members view their server" ON public.servers;
CREATE POLICY "Members view their server" ON public.servers FOR SELECT
  USING (owner_user_id = auth.uid() OR public.is_server_member(auth.uid(), id));

-- Fix fines/wanted/server_role_permissions policies that also query server_members
DROP POLICY IF EXISTS "Members view perms" ON public.server_role_permissions;
CREATE POLICY "Members view perms" ON public.server_role_permissions FOR SELECT
  USING (public.is_server_member(auth.uid(), server_id));

DROP POLICY IF EXISTS "Server members view fines" ON public.fines;
CREATE POLICY "Server members view fines" ON public.fines FOR SELECT
  USING (public.is_server_member(auth.uid(), server_id));

DROP POLICY IF EXISTS "Server members view wanted" ON public.wanted;
CREATE POLICY "Server members view wanted" ON public.wanted FOR SELECT
  USING (public.is_server_member(auth.uid(), server_id));
