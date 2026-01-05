-- Add unique constraint to prevent duplicate transactions per saved query
ALTER TABLE public.transactions
ADD CONSTRAINT transactions_saved_query_tx_hash_unique 
UNIQUE (saved_query_id, tx_hash);