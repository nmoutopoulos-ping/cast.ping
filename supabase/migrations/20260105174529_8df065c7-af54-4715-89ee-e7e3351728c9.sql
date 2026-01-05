-- Add color column to entities table
ALTER TABLE public.entities 
ADD COLUMN color text NOT NULL DEFAULT '#3B82F6';