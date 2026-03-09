
-- Access codes table for lifetime/admin-granted access
CREATE TABLE public.access_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE DEFAULT encode(extensions.gen_random_bytes(6), 'hex'),
  access_type text NOT NULL DEFAULT 'lifetime',
  plan_type text NOT NULL DEFAULT 'reader',
  is_single_use boolean NOT NULL DEFAULT true,
  notes text DEFAULT '',
  created_by uuid DEFAULT NULL,
  redeemed_by_user_id uuid DEFAULT NULL,
  redeemed_at timestamptz DEFAULT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.access_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage access_codes"
  ON public.access_codes FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Login OTP codes table
CREATE TABLE public.login_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  code text NOT NULL,
  expires_at timestamptz NOT NULL,
  used boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.login_codes ENABLE ROW LEVEL SECURITY;

-- Only edge functions (service role) access login_codes, no public policies needed
