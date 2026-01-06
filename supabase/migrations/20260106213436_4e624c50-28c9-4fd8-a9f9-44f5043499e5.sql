-- Add search_type column to saved_queries table
ALTER TABLE public.saved_queries 
ADD COLUMN search_type text NOT NULL DEFAULT 'wallet';

-- Add check constraint to ensure valid values
ALTER TABLE public.saved_queries 
ADD CONSTRAINT saved_queries_search_type_check 
CHECK (search_type IN ('wallet', 'token'));