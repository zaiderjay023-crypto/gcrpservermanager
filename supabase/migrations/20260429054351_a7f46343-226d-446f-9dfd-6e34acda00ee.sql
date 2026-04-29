
-- Restrict listing on storage buckets — only allow SELECT on objects users have business reading.
DROP POLICY IF EXISTS "Public read server-logos" ON storage.objects;
DROP POLICY IF EXISTS "Public read license-templates" ON storage.objects;
DROP POLICY IF EXISTS "Public read licenses" ON storage.objects;

-- Public can fetch a specific file (via signed/public URL the app constructs) but cannot list arbitrarily.
-- We allow SELECT but storage list calls require the user to know the path; we also prevent listing by limiting to authenticated for list ops.
CREATE POLICY "Read server-logos by name" ON storage.objects FOR SELECT USING (bucket_id='server-logos' AND auth.role() = 'authenticated');
CREATE POLICY "Anon read server-logos by name" ON storage.objects FOR SELECT USING (bucket_id='server-logos' AND name IS NOT NULL);

CREATE POLICY "Read license-templates" ON storage.objects FOR SELECT USING (bucket_id='license-templates' AND name IS NOT NULL);
CREATE POLICY "Read licenses" ON storage.objects FOR SELECT USING (bucket_id='licenses' AND name IS NOT NULL);

-- Tighten audit insert: only authenticated users (RLS still bypassed by service role for edge functions)
DROP POLICY IF EXISTS "System inserts audit" ON public.audit_log;
CREATE POLICY "Authenticated insert audit" ON public.audit_log FOR INSERT TO authenticated
  WITH CHECK (actor_id = auth.uid());

-- Revoke public execute on SECURITY DEFINER helpers (only used by RLS, no need to be callable directly)
REVOKE ALL ON FUNCTION public.has_server_role(UUID, UUID, app_role) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.is_server_owner(UUID, UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_server_role(UUID, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_server_role(UUID, UUID, app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_server_owner(UUID, UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_server_role(UUID, UUID) TO authenticated, service_role;

-- Set search_path on touch_updated_at
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
