import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get authorization header to identify user
    const authHeader = req.headers.get('Authorization');

    console.log('🚀 Starting bulk validation background task...');

    // Background task to validate all phrases
    const backgroundValidation = async () => {
      try {
        const BATCH_SIZE = 1000;
        let totalProcessed = 0;
        let hasMore = true;

        while (hasMore) {
          // Get batch of unvalidated phrases
          const { data: batch, error: fetchError } = await supabaseClient
            .from('training_phrases')
            .select('id')
            .eq('is_validated', false)
            .limit(BATCH_SIZE);

          if (fetchError) {
            console.error('Fetch error:', fetchError);
            break;
          }

          if (!batch || batch.length === 0) {
            hasMore = false;
            break;
          }

          // Validate this batch
          const ids = batch.map(p => p.id);
          const { error: updateError } = await supabaseClient
            .from('training_phrases')
            .update({ 
              is_validated: true,
              quality_score: 1.0 
            })
            .in('id', ids);

          if (updateError) {
            console.error('Update error:', updateError);
            break;
          }

          totalProcessed += batch.length;
          console.log(`✅ Processed ${totalProcessed} phrases...`);

          // Small delay to avoid overwhelming the database
          await new Promise(resolve => setTimeout(resolve, 50));
        }

        console.log(`🎉 Bulk validation complete: ${totalProcessed} phrases validated`);

      } catch (error) {
        console.error('Background task error:', error);
      }
    };

    // Start background task using waitUntil
    // @ts-ignore - EdgeRuntime is available in Deno Deploy
    EdgeRuntime.waitUntil(backgroundValidation());

    // Return immediate response
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Validation en arrière-plan démarrée',
        estimated_time: 'Environ 2-3 minutes pour ~110k phrases'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in bulk-validate-phrases:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});