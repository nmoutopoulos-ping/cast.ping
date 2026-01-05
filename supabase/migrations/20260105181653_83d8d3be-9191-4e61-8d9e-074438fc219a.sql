-- Create saved_views table to store view configurations for saved searches
CREATE TABLE public.saved_views (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  saved_query_id uuid NOT NULL REFERENCES public.saved_queries(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  name text NOT NULL,
  hidden_columns text[] NOT NULL DEFAULT '{}',
  active_filters jsonb NOT NULL DEFAULT '[]',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.saved_views ENABLE ROW LEVEL SECURITY;

-- RLS policies for saved_views
CREATE POLICY "Users can view their own saved views"
ON public.saved_views FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own saved views"
ON public.saved_views FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own saved views"
ON public.saved_views FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own saved views"
ON public.saved_views FOR DELETE
USING (auth.uid() = user_id);

-- Add index for faster lookups
CREATE INDEX idx_saved_views_saved_query_id ON public.saved_views(saved_query_id);
CREATE INDEX idx_saved_views_user_id ON public.saved_views(user_id);

-- Trigger for updated_at
CREATE TRIGGER update_saved_views_updated_at
BEFORE UPDATE ON public.saved_views
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();