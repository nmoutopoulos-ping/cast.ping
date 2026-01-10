-- Add unique constraint for upsert to work properly
ALTER TABLE public.stablecoin_snapshots 
ADD CONSTRAINT stablecoin_snapshots_ticker_date_time_unique 
UNIQUE (ticker, as_of_date, as_of_time);