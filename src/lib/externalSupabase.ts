import { createClient } from '@supabase/supabase-js';

// External Supabase client for stablecoin market data
const EXTERNAL_SUPABASE_URL = 'https://bfgjvydfmkhzxadlfjpg.supabase.co';
const EXTERNAL_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJmZ2p2eWRmbWtoenhhZGxmanBnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgwMDE3NTQsImV4cCI6MjA4MzU3Nzc1NH0.6VjvRNc9nrXx6DvN2UfFH9kE9E45pfIT04l2wOAMq_s';

// Create a function to get a client with authentication headers
export function getExternalSupabaseClient(accessToken?: string) {
  return createClient(EXTERNAL_SUPABASE_URL, EXTERNAL_SUPABASE_ANON_KEY, {
    global: {
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    },
  });
}

// Default client for backward compatibility (unauthenticated)
export const externalSupabase = createClient(EXTERNAL_SUPABASE_URL, EXTERNAL_SUPABASE_ANON_KEY);

export interface StablecoinSnapshot {
  captured_at: string;
  as_of_date: string;
  as_of_time: string;
  coingecko_id: string;
  ticker: string;
  price_usd: number;
  market_cap_usd: number | null;
  inserted_at: string;
}
