-- Add wallet_address column directly to entities table
ALTER TABLE public.entities 
ADD COLUMN wallet_address text;