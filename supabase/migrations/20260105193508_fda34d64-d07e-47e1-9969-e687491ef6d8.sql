-- Add token_symbol and token_name columns to tags table
ALTER TABLE public.tags 
ADD COLUMN token_symbol text,
ADD COLUMN token_name text;