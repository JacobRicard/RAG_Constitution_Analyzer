-- Add RLS policies for updating and deleting amendments
CREATE POLICY "Committee chair can update amendments"
ON public.amendments
FOR UPDATE
USING (true)
WITH CHECK (true);

CREATE POLICY "Committee chair can delete amendments"
ON public.amendments
FOR DELETE
USING (true);