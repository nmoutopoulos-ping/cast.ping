import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const DUNE_API_KEY = Deno.env.get('DUNE_API_KEY');
    
    if (!DUNE_API_KEY) {
      console.error('DUNE_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Dune API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { queryId, parameters } = await req.json();
    
    if (!queryId) {
      return new Response(
        JSON.stringify({ error: 'Query ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Fetching Dune query ${queryId} results`);

    // Build URL with parameters
    const url = new URL(`https://api.dune.com/api/v1/query/${queryId}/results`);
    url.searchParams.set('limit', '1000');
    
    // Add query parameters if provided
    if (parameters) {
      Object.entries(parameters).forEach(([key, value]) => {
        url.searchParams.set(key, String(value));
      });
    }

    const response = await fetch(url.toString(), {
      headers: {
        'x-dune-api-key': DUNE_API_KEY,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Dune API error:', errorText);
      return new Response(
        JSON.stringify({ error: `Dune API error: ${errorText}` }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    console.log(`Query completed, ${data.result?.rows?.length || 0} rows returned`);

    return new Response(
      JSON.stringify({
        success: true,
        result: data.result,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in dune-query function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
