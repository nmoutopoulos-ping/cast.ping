import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Maximum rows per Dune API request (stay within Dune's datapoint limits)
const DUNE_PAGE_SIZE = 1000;
// Maximum total rows we support
const MAX_TOTAL_ROWS = 10000000;

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

// Fetch cached results with pagination support
async function fetchCachedResultsPage(
  queryId: string, 
  apiKey: string, 
  limit: number,
  offset: number
): Promise<{ rows: any[]; total_row_count: number }> {
  const resultsUrl = `https://api.dune.com/api/v1/query/${queryId}/results?limit=${limit}&offset=${offset}`;
  
  console.log(`Fetching cached results for query ${queryId}, offset=${offset}, limit=${limit}`);
  
  const response = await fetch(resultsUrl, {
    headers: { 'x-dune-api-key': apiKey },
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Results fetch failed: ${errorText}`);
  }
  
  const data = await response.json();
  const rows = data.result?.rows || [];
  const totalRowCount = data.result?.metadata?.total_row_count || rows.length;
  
  console.log(`Fetched ${rows.length} rows (offset=${offset}, total=${totalRowCount})`);
  
  return { rows, total_row_count: totalRowCount };
}

// Fetch all cached results with pagination
async function fetchAllCachedResults(
  queryId: string, 
  apiKey: string, 
  maxRows: number = MAX_TOTAL_ROWS
): Promise<{ rows: any[]; total_row_count: number }> {
  const allRows: any[] = [];
  let offset = 0;
  let totalRowCount = 0;
  
  while (true) {
    const remainingToFetch = maxRows - allRows.length;
    if (remainingToFetch <= 0) break;
    
    const pageLimit = Math.min(DUNE_PAGE_SIZE, remainingToFetch);
    const { rows, total_row_count } = await fetchCachedResultsPage(queryId, apiKey, pageLimit, offset);
    
    totalRowCount = total_row_count;
    allRows.push(...rows);
    
    console.log(`Progress: ${allRows.length}/${Math.min(totalRowCount, maxRows)} rows fetched`);
    
    // Stop if we got fewer rows than requested (no more data)
    if (rows.length < pageLimit) break;
    
    // Stop if we've reached the total
    if (allRows.length >= Math.min(totalRowCount, maxRows)) break;
    
    offset += rows.length;
  }
  
  console.log(`Completed fetching ${allRows.length} total rows`);
  return { rows: allRows, total_row_count: totalRowCount };
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
      const requestedLimit = parameters?.limit || 10000;
      const cappedLimit = Math.min(requestedLimit, MAX_TOTAL_ROWS);
      
      const { rows, total_row_count } = await fetchAllCachedResults(queryId, DUNE_API_KEY, cappedLimit);
      
      return new Response(
        JSON.stringify({
          success: true,
          result: { rows },
          metadata: {
            total_row_count,
            fetched_row_count: rows.length,
            limit_applied: cappedLimit,
          },
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