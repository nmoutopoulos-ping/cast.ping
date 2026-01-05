-- Add filter_mode column to saved_views table
ALTER TABLE public.saved_views 
ADD COLUMN filter_mode text NOT NULL DEFAULT 'any';