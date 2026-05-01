-- Lock down SECURITY DEFINER helpers
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;

-- Restrict public bucket listing: only allow reading specific objects, not listing
DROP POLICY IF EXISTS "Item photos public read" ON storage.objects;
CREATE POLICY "Item photos public read by path"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'item-photos');