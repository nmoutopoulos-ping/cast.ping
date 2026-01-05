-- Add tag_filter_mode column to saved_views table
ALTER TABLE public.saved_views
ADD COLUMN tag_filter_mode text NOT NULL DEFAULT 'any'::text;