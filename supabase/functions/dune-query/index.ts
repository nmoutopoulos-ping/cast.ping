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

    console.log(`Executing Dune query ${queryId} with parameters:`, parameters);

    // Execute the query
    const executeResponse = await fetch(`https://api.dune.com/api/v1/query/${queryId}/execute`, {
      method: 'POST',
      headers: {
        'X-Dune-API-Key': DUNE_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query_parameters: parameters || {},
      }),
    });

    if (!executeResponse.ok) {
      const errorText = await executeResponse.text();
      console.error('Dune execute error:', errorText);
      return new Response(
        JSON.stringify({ error: `Failed to execute query: ${errorText}` }),
        { status: executeResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const executeData = await executeResponse.json();
    const executionId = executeData.execution_id;
    
    console.log(`Query execution started, ID: ${executionId}`);

    // Poll for results
    let attempts = 0;
    const maxAttempts = 30;
    const pollInterval = 2000;

    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, pollInterval));
      
      const statusResponse = await fetch(`https://api.dune.com/api/v1/execution/${executionId}/status`, {
        headers: {
          'X-Dune-API-Key': DUNE_API_KEY,
        },
      });

      if (!statusResponse.ok) {
        const errorText = await statusResponse.text();
        console.error('Dune status error:', errorText);
        return new Response(
          JSON.stringify({ error: `Failed to check status: ${errorText}` }),
          { status: statusResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const statusData = await statusResponse.json();
      console.log(`Execution status: ${statusData.state}`);

      if (statusData.state === 'QUERY_STATE_COMPLETED') {
        // Fetch results
        const resultsResponse = await fetch(`https://api.dune.com/api/v1/execution/${executionId}/results`, {
          headers: {
            'X-Dune-API-Key': DUNE_API_KEY,
          },
        });

        if (!resultsResponse.ok) {
          const errorText = await resultsResponse.text();
          console.error('Dune results error:', errorText);
          return new Response(
            JSON.stringify({ error: `Failed to fetch results: ${errorText}` }),
            { status: resultsResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const resultsData = await resultsResponse.json();
        console.log(`Query completed, ${resultsData.result?.rows?.length || 0} rows returned`);

        return new Response(
          JSON.stringify({
            success: true,
            execution_id: executionId,
            result: resultsData.result,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (statusData.state === 'QUERY_STATE_FAILED') {
        return new Response(
          JSON.stringify({ error: 'Query execution failed', details: statusData }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (statusData.state === 'QUERY_STATE_CANCELLED') {
        return new Response(
          JSON.stringify({ error: 'Query execution was cancelled' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      attempts++;
    }

    return new Response(
      JSON.stringify({ error: 'Query execution timed out' }),
      { status: 504, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
