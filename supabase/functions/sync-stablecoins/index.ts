import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// External Supabase with stablecoin data
const EXTERNAL_SUPABASE_URL = 'https://bfgjvydfmkhzxadlfjpg.supabase.co'
const EXTERNAL_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJmZ2p2eWRmbWtoenhhZGxmanBnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgwMDE3NTQsImV4cCI6MjA4MzU3Nzc1NH0.6VjvRNc9nrXx6DvN2UfFH9kE9E45pfIT04l2wOAMq_s'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Create external client to fetch data
    const externalClient = createClient(EXTERNAL_SUPABASE_URL, EXTERNAL_SUPABASE_ANON_KEY)

    // Create local client with service role to insert data
    const localClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Fetch latest stablecoin data from external DB
    const { data: externalData, error: fetchError } = await externalClient
      .from('stablecoin_market_snapshot')
      .select('*')
      .order('as_of_date', { ascending: false })
      .order('as_of_time', { ascending: false })
      .limit(100)

    if (fetchError) {
      throw new Error(`Failed to fetch from external DB: ${fetchError.message}`)
    }

    if (!externalData || externalData.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No data to sync', count: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Transform and upsert into local DB
    const snapshots = externalData.map((row: any) => ({
      captured_at: row.captured_at,
      as_of_date: row.as_of_date,
      as_of_time: row.as_of_time,
      coingecko_id: row.coingecko_id,
      ticker: row.ticker,
      price_usd: row.price_usd,
      market_cap_usd: row.market_cap_usd,
      inserted_at: new Date().toISOString(),
    }))

    // Upsert based on ticker + as_of_date + as_of_time to avoid duplicates
    const { error: insertError } = await localClient
      .from('stablecoin_snapshots')
      .upsert(snapshots, { 
        onConflict: 'ticker,as_of_date,as_of_time',
        ignoreDuplicates: true 
      })

    if (insertError) {
      throw new Error(`Failed to insert into local DB: ${insertError.message}`)
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Sync complete', count: snapshots.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Sync error:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
