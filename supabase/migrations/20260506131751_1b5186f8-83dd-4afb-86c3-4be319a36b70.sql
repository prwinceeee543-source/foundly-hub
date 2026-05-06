CREATE SCHEMA IF NOT EXISTS app_private;

CREATE OR REPLACE FUNCTION app_private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

GRANT USAGE ON SCHEMA app_private TO authenticated;
GRANT EXECUTE ON FUNCTION app_private.has_role(uuid, public.app_role) TO authenticated;

DROP POLICY IF EXISTS "Admins delete claims" ON public.claims;
DROP POLICY IF EXISTS "Admins update claims" ON public.claims;
DROP POLICY IF EXISTS "Claims viewable by owner or admin" ON public.claims;
DROP POLICY IF EXISTS "Users delete own items or admin" ON public.items;
DROP POLICY IF EXISTS "Users update own items or admin" ON public.items;
DROP POLICY IF EXISTS "Admins manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users view own roles" ON public.user_roles;

CREATE POLICY "Admins delete claims"
ON public.claims
FOR DELETE
TO authenticated
USING (app_private.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins update claims"
ON public.claims
FOR UPDATE
TO authenticated
USING (app_private.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Claims viewable by owner or admin"
ON public.claims
FOR SELECT
TO authenticated
USING ((auth.uid() = user_id) OR app_private.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Users delete own items or admin"
ON public.items
FOR DELETE
TO authenticated
USING ((auth.uid() = user_id) OR app_private.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Users update own items or admin"
ON public.items
FOR UPDATE
TO authenticated
USING ((auth.uid() = user_id) OR app_private.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins manage roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (app_private.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (app_private.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Users view own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING ((auth.uid() = user_id) OR app_private.has_role(auth.uid(), 'admin'::public.app_role));

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC;