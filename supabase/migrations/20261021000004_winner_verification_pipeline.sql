
CREATE OR REPLACE FUNCTION public.submit_winner_proof(
  p_claim_id UUID,
  p_proof_path TEXT,
  p_golfer_notes TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
  v_claim RECORD;
  v_prefix TEXT;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required to submit winner proof.';
  END IF;

  -- 1. Check claim existence and ownership
  SELECT * INTO v_claim
  FROM public.winner_claims
  WHERE id = p_claim_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Winner claim with ID % not found.', p_claim_id;
  END IF;

  IF v_claim.user_id <> v_user_id THEN
    RAISE EXCEPTION 'Unauthorized: You can only submit proof for your own prize claims.';
  END IF;

  -- 2. Verify claim state allows proof submission
  IF v_claim.status NOT IN ('pending_proof', 'rejected') THEN
    RAISE EXCEPTION 'Proof cannot be submitted when claim is in "%" status.', v_claim.status;
  END IF;

  -- 3. Verify proof path starts with user's own UUID folder (anti-spoofing)
  v_prefix := v_user_id::text || '/';
  IF NOT (p_proof_path LIKE (v_prefix || '%')) THEN
    RAISE EXCEPTION 'Invalid storage path: Proof must reside in your user folder (%).', v_prefix;
  END IF;

  -- 4. Update claim state to under_review, clear prior rejection reason
  UPDATE public.winner_claims
  SET
    proof_image_path = p_proof_path,
    golfer_notes = p_golfer_notes,
    status = 'under_review',
    rejection_reason = NULL,
    updated_at = NOW()
  WHERE id = p_claim_id;

  RETURN jsonb_build_object(
    'success', true,
    'claim_id', p_claim_id,
    'status', 'under_review',
    'proof_path', p_proof_path
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Admin Review RPC (Atomic, Privileged & Audited)
CREATE OR REPLACE FUNCTION public.admin_review_winner_claim(
  p_claim_id UUID,
  p_decision TEXT,
  p_rejection_reason TEXT DEFAULT NULL,
  p_admin_notes TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_admin_id UUID;
  v_claim RECORD;
BEGIN
  -- 1. Enforce platform administrator role
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: Only platform administrators can review winner claims.';
  END IF;

  v_admin_id := auth.uid();

  -- 2. Validate decision
  IF p_decision NOT IN ('under_review', 'verified', 'rejected') THEN
    RAISE EXCEPTION 'Invalid review decision "%". Expected "under_review", "verified", or "rejected".', p_decision;
  END IF;

  -- 3. Check claim existence
  SELECT * INTO v_claim
  FROM public.winner_claims
  WHERE id = p_claim_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Winner claim with ID % not found.', p_claim_id;
  END IF;

  -- 4. Reject requires non-empty reason
  IF p_decision = 'rejected' THEN
    IF p_rejection_reason IS NULL OR length(trim(p_rejection_reason)) < 5 THEN
      RAISE EXCEPTION 'A detailed rejection reason (minimum 5 characters) is required when rejecting proof.';
    END IF;
  END IF;

  -- 5. Execute state transition (Decoupled from payment: verified DOES NOT mark paid)
  UPDATE public.winner_claims
  SET
    status = p_decision,
    rejection_reason = CASE WHEN p_decision = 'rejected' THEN p_rejection_reason ELSE NULL END,
    admin_notes = COALESCE(p_admin_notes, admin_notes),
    reviewed_by = v_admin_id,
    reviewed_at = NOW(),
    updated_at = NOW()
  WHERE id = p_claim_id;

  RETURN jsonb_build_object(
    'success', true,
    'claim_id', p_claim_id,
    'new_status', p_decision,
    'reviewed_by', v_admin_id,
    'reviewed_at', NOW()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3. Storage Security Hardening for 'winner-proofs'
-- Drop existing insert/select policies and replace with hardened checks
DROP POLICY IF EXISTS "Winners upload their own proof" ON storage.objects;
CREATE POLICY "Winners upload their own proof"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'winner-proofs' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Winners and Admins view proofs" ON storage.objects;
CREATE POLICY "Winners and Admins view proofs"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'winner-proofs' AND
    (auth.uid()::text = (storage.foldername(name))[1] OR public.is_admin())
  );

-- Prevent unauthorized file deletions by regular users
DROP POLICY IF EXISTS "Admins only delete proofs" ON storage.objects;
CREATE POLICY "Admins only delete proofs"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'winner-proofs' AND public.is_admin()
  );
