-- Create saved_queries table
CREATE TABLE public.saved_queries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  dune_query_id TEXT NOT NULL,
  wallet_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security (public access for now, can add auth later)
ALTER TABLE public.saved_queries ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Anyone can view saved queries" 
ON public.saved_queries 
FOR SELECT 
USING (true);

-- Allow public insert access
CREATE POLICY "Anyone can create saved queries" 
ON public.saved_queries 
FOR INSERT 
WITH CHECK (true);

-- Allow public delete access
CREATE POLICY "Anyone can delete saved queries" 
ON public.saved_queries 
FOR DELETE 
USING (true);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_saved_queries_updated_at
BEFORE UPDATE ON public.saved_queries
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();