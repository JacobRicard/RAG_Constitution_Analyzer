-- Create amendments table
CREATE TABLE public.amendments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  amendment_text TEXT NOT NULL,
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  approved_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  vote_for INTEGER DEFAULT 0,
  vote_against INTEGER DEFAULT 0,
  vote_abstention INTEGER DEFAULT 0,
  vote_absent INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.amendments ENABLE ROW LEVEL SECURITY;

-- Allow anyone to view approved amendments
CREATE POLICY "Anyone can view approved amendments"
ON public.amendments
FOR SELECT
USING (status = 'approved');

-- Allow anyone to view all amendments (for admin purposes)
CREATE POLICY "Anyone can view all amendments"
ON public.amendments
FOR SELECT
USING (true);

-- Allow anyone to insert amendments
CREATE POLICY "Anyone can submit amendments"
ON public.amendments
FOR INSERT
WITH CHECK (true);

-- Create index for faster queries
CREATE INDEX idx_amendments_status ON public.amendments(status);
CREATE INDEX idx_amendments_approved_at ON public.amendments(approved_at);