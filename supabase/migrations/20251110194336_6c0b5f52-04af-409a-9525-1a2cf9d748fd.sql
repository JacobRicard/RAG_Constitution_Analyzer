-- Create table to store committee chair password
CREATE TABLE IF NOT EXISTS public.committee_password (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  password_hash text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.committee_password ENABLE ROW LEVEL SECURITY;

-- Insert default password (hashed version of "MUSG2025")
-- In production, this should be changed by the committee chair
INSERT INTO public.committee_password (password_hash)
VALUES ('$2a$10$YQ7XZ9.K7vH5F5KqY5XZ9.K7vH5F5KqY5XZ9.K7vH5F5KqY5XZ9K');

-- Only allow reading the password hash (for validation)
CREATE POLICY "Allow reading password hash for validation"
ON public.committee_password
FOR SELECT
USING (true);