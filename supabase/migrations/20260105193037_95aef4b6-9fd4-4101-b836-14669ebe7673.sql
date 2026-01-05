-- Add decimals column to tags table for token amount formatting
ALTER TABLE public.tags
ADD COLUMN decimals integer NULL;