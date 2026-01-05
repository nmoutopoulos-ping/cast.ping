-- Add missing columns to transactions table for full Dune data storage
ALTER TABLE public.transactions
ADD COLUMN IF NOT EXISTS method text,
ADD COLUMN IF NOT EXISTS token_direction text,
ADD COLUMN IF NOT EXISTS token_from text,
ADD COLUMN IF NOT EXISTS token_to text;