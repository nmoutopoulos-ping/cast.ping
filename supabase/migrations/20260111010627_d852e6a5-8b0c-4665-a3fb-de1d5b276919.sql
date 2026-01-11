-- Create PAXG snapshots table (same structure as stablecoin_snapshots)
CREATE TABLE public.paxg_snapshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  captured_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  as_of_date DATE NOT NULL,
  as_of_time TIME NOT NULL,
  coingecko_id TEXT NOT NULL,
  ticker TEXT NOT NULL,
  price_usd NUMERIC NOT NULL,
  market_cap_usd NUMERIC,
  inserted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create unique constraint to prevent duplicates
ALTER TABLE public.paxg_snapshots 
ADD CONSTRAINT paxg_snapshots_ticker_date_time_unique 
UNIQUE (ticker, as_of_date, as_of_time);

-- Enable RLS
ALTER TABLE public.paxg_snapshots ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read
CREATE POLICY "Authenticated users can view paxg snapshots"
ON public.paxg_snapshots
FOR SELECT
USING (true);

-- Create index for faster queries
CREATE INDEX idx_paxg_snapshots_date_time ON public.paxg_snapshots (as_of_date DESC, as_of_time DESC);