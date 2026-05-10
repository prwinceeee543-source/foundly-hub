
-- Make item_id nullable; participants now describe what they want to claim
ALTER TABLE public.claims ALTER COLUMN item_id DROP NOT NULL;

-- Add new columns for participant-described claim and proof image
ALTER TABLE public.claims
  ADD COLUMN IF NOT EXISTS claimed_item_name text,
  ADD COLUMN IF NOT EXISTS claimed_item_description text,
  ADD COLUMN IF NOT EXISTS proof_image_url text;

-- Update validation trigger to handle null item_id (free-form claims)
CREATE OR REPLACE FUNCTION public.validate_claim_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE item_status text;
BEGIN
  IF NEW.item_id IS NOT NULL THEN
    SELECT status INTO item_status FROM public.items WHERE id = NEW.item_id;
    IF item_status IS NULL THEN RAISE EXCEPTION 'Item not found'; END IF;
    IF item_status = 'claimed' THEN RAISE EXCEPTION 'Item has already been claimed'; END IF;
    IF EXISTS (SELECT 1 FROM public.claims WHERE item_id = NEW.item_id AND user_id = NEW.user_id AND status = 'pending') THEN
      RAISE EXCEPTION 'You already have a pending claim for this item';
    END IF;
  END IF;
  RETURN NEW;
END; $function$;

-- Private bucket for ownership-proof photos uploaded by claimants
INSERT INTO storage.buckets (id, name, public)
VALUES ('claim-proofs', 'claim-proofs', false)
ON CONFLICT (id) DO NOTHING;

-- Users can upload their own proof images (path prefixed by user id)
CREATE POLICY "Users upload own claim proofs"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'claim-proofs' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users read own claim proofs"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'claim-proofs' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Admins can read all claim proofs and ids
CREATE POLICY "Admins read claim proofs"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'claim-proofs' AND app_private.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins read claim ids"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'claim-ids' AND app_private.has_role(auth.uid(), 'admin'));
