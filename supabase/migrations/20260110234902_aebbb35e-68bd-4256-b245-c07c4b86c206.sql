-- Create a table to store stablecoin market snapshots (mirrored from external source)
CREATE TABLE public.stablecoin_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  captured_at timestamp with time zone NOT NULL DEFAULT now(),
  as_of_date date NOT NULL,
  as_of_time time NOT NULL,
  coingecko_id text NOT NULL,
  ticker text NOT NULL,
  price_usd numeric NOT NULL,
  market_cap_usd numeric,
  inserted_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.stablecoin_snapshots ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read stablecoin data (shared market data)
CREATE POLICY "Authenticated users can view stablecoin snapshots"
ON public.stablecoin_snapshots
FOR SELECT
TO authenticated
USING (true);

-- Only allow service role or backend to insert/update/delete (admin operations)
-- No INSERT/UPDATE/DELETE policies for regular users - data is managed externally

-- Create index for faster queries on ticker and date
CREATE INDEX idx_stablecoin_snapshots_ticker ON public.stablecoin_snapshots(ticker);
CREATE INDEX idx_stablecoin_snapshots_as_of_date ON public.stablecoin_snapshots(as_of_date DESC);