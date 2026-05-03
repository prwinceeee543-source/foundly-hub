
CREATE UNIQUE INDEX IF NOT EXISTS claims_one_pending_per_item
  ON public.claims (item_id) WHERE status = 'pending';

CREATE POLICY "Admins delete claims"
ON public.claims FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE FUNCTION public.validate_claim_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE item_status text;
BEGIN
  SELECT status INTO item_status FROM public.items WHERE id = NEW.item_id;
  IF item_status IS NULL THEN RAISE EXCEPTION 'Item not found'; END IF;
  IF item_status = 'claimed' THEN RAISE EXCEPTION 'Item has already been claimed'; END IF;
  IF EXISTS (SELECT 1 FROM public.claims WHERE item_id = NEW.item_id AND user_id = NEW.user_id AND status = 'pending') THEN
    RAISE EXCEPTION 'You already have a pending claim for this item';
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS validate_claim_insert_trg ON public.claims;
CREATE TRIGGER validate_claim_insert_trg BEFORE INSERT ON public.claims
  FOR EACH ROW EXECUTE FUNCTION public.validate_claim_insert();
