import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper to poll for execution results - polls every 2 seconds for up to 2 minutes
async function pollForResults(executionId: string, apiKey: string, maxAttempts = 60): Promise<any> {
  const pollUrl = `https://api.dune.com/api/v1/execution/${executionId}/results`;
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    console.log(`Polling attempt ${attempt + 1}/${maxAttempts} for execution ${executionId}`);
    
    const response = await fetch(pollUrl, {
      headers: { 'x-dune-api-key': apiKey },
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Poll failed: ${errorText}`);
    }
    
    const data = await response.json();
    
    if (data.state === 'QUERY_STATE_COMPLETED') {
      console.log(`Query completed with ${data.result?.rows?.length || 0} rows`);
      return data;
    }
    
    if (data.state === 'QUERY_STATE_FAILED') {
      throw new Error(`Query execution failed: ${data.error || 'Unknown error'}`);
    }
    
    // Wait 2 seconds before next poll (60 attempts * 2 seconds = 2 minutes max)
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  throw new Error('Query execution timed out after 2 minutes');
}

// Fetch cached results directly without execution (for pre-computed queries)
async function fetchCachedResults(queryId: string, apiKey: string, limit = 10000): Promise<any> {
  const resultsUrl = `https://api.dune.com/api/v1/query/${queryId}/results?limit=${limit}`;
  
  console.log(`Fetching cached results for query ${queryId}`);
  
  const response = await fetch(resultsUrl, {
    headers: { 'x-dune-api-key': apiKey },
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Results fetch failed: ${errorText}`);
  }
  
  const data = await response.json();
  console.log(`Fetched ${data.result?.rows?.length || 0} cached rows`);
  return data;
}

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

    const { queryId, parameters, mode = 'execute' } = await req.json();
    
    if (!queryId) {
      return new Response(
        JSON.stringify({ error: 'Query ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Mode: 'results' = fetch cached results, 'execute' = run query with parameters
    if (mode === 'results') {
      console.log(`Fetching cached results for query ${queryId}`);
      const resultData = await fetchCachedResults(queryId, DUNE_API_KEY, parameters?.limit || 1000);
      
      return new Response(
        JSON.stringify({
          success: true,
          result: resultData.result,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Executing Dune query ${queryId} with parameters:`, parameters);

    // Execute the query with parameters
    const executeUrl = `https://api.dune.com/api/v1/query/${queryId}/execute`;
    
    const executeBody: any = {};
    
    // Map our parameters to Dune's expected format
    // Dune expects query_parameters with the exact parameter names used in the query
    if (parameters && Object.keys(parameters).length > 0) {
      let walletAddress = parameters.address || parameters.wallet || parameters.Wallet || '';
      // Remove '0x' prefix as the Dune query handles this with replace('{{Wallet}}', '0x', '')
      if (walletAddress.toLowerCase().startsWith('0x')) {
        walletAddress = walletAddress.slice(2);
      }
      executeBody.query_parameters = {
        // The query uses {{Wallet}} parameter
        Wallet: walletAddress,
      };
    }
    
    console.log('Execute request body:', JSON.stringify(executeBody));

    const executeResponse = await fetch(executeUrl, {
      method: 'POST',
      headers: {
        'x-dune-api-key': DUNE_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(executeBody),
    });

    if (!executeResponse.ok) {
      const errorText = await executeResponse.text();
      console.error('Dune execute error:', errorText);
      return new Response(
        JSON.stringify({ error: `Dune API error: ${errorText}` }),
        { status: executeResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const executeData = await executeResponse.json();
    console.log('Execute response:', executeData);
    
    if (!executeData.execution_id) {
      return new Response(
        JSON.stringify({ error: 'No execution ID returned from Dune' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Poll for results
    console.log(`Polling for execution ${executeData.execution_id}`);
    const resultData = await pollForResults(executeData.execution_id, DUNE_API_KEY);

    return new Response(
      JSON.stringify({
        success: true,
        execution_id: executeData.execution_id,
        result: resultData.result,
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
