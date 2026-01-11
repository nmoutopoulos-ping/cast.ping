import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
}

interface StablecoinSnapshot {
  captured_at: string
  as_of_date: string
  as_of_time: string
  coingecko_id: string
  ticker: string
  price_usd: number
  market_cap_usd: number | null
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ success: false, error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  try {
    // Optional: Verify API key for security
    const apiKey = req.headers.get('x-api-key')
    const expectedKey = Deno.env.get('STABLECOIN_PUSH_KEY')
    
    if (expectedKey && apiKey !== expectedKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const body = await req.json()
    
    // Accept: { rows: [...] }, direct array [...], or single object {...}
    let snapshots: StablecoinSnapshot[]
    if (body.rows && Array.isArray(body.rows)) {
      snapshots = body.rows
    } else if (Array.isArray(body)) {
      snapshots = body
    } else {
      snapshots = [body]
    }

    if (snapshots.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No data to insert', count: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create local client with service role to insert data
    const localClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Transform and upsert into local DB
    const records = snapshots.map((row) => ({
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
      .upsert(records, { 
        onConflict: 'ticker,as_of_date,as_of_time',
        ignoreDuplicates: false 
      })

    if (insertError) {
      throw new Error(`Failed to insert data: ${insertError.message}`)
    }

    console.log(`Successfully received ${records.length} stablecoin snapshots`)

    return new Response(
      JSON.stringify({ success: true, message: 'Data received', count: records.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Receive error:', errorMessage)
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
