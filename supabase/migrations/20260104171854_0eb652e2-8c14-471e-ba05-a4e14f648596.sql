-- Create transactions table to store query results locally
CREATE TABLE public.transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  saved_query_id UUID NOT NULL REFERENCES public.saved_queries(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tx_hash TEXT NOT NULL,
  block_number BIGINT,
  block_time TIMESTAMP WITH TIME ZONE,
  direction TEXT,
  from_address TEXT,
  to_address TEXT,
  nonce BIGINT,
  transaction_index BIGINT,
  value_eth NUMERIC,
  tx_fee_eth NUMERIC,
  gas_price NUMERIC,
  gas_used BIGINT,
  success BOOLEAN,
  token_contract TEXT,
  token_symbol TEXT,
  token_name TEXT,
  token_amount_raw TEXT,
  token_amount NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(saved_query_id, tx_hash)
);

-- Enable RLS
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Users can only view their own transactions
CREATE POLICY "Users can view their own transactions"
  ON public.transactions
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own transactions
CREATE POLICY "Users can insert their own transactions"
  ON public.transactions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own transactions
CREATE POLICY "Users can delete their own transactions"
  ON public.transactions
  FOR DELETE
  USING (auth.uid() = user_id);

-- Add user_id to saved_queries to link queries to users
ALTER TABLE public.saved_queries ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Drop existing permissive policies and create user-scoped ones
DROP POLICY IF EXISTS "Anyone can view saved queries " ON public.saved_queries;
DROP POLICY IF EXISTS "Anyone can create saved queries " ON public.saved_queries;
DROP POLICY IF EXISTS "Anyone can delete saved queries " ON public.saved_queries;

CREATE POLICY "Users can view their own saved queries"
  ON public.saved_queries
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own saved queries"
  ON public.saved_queries
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own saved queries"
  ON public.saved_queries
  FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own saved queries"
  ON public.saved_queries
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_transactions_saved_query_id ON public.transactions(saved_query_id);
CREATE INDEX idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX idx_saved_queries_user_id ON public.saved_queries(user_id);