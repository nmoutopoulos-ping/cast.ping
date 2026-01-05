-- Add method_filters column to saved_views table
ALTER TABLE public.saved_views 
ADD COLUMN method_filters text[] DEFAULT '{}' NOT NULL;