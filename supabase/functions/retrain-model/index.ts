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
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Verify user is authenticated and is admin
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check admin role
    const { data: roleData, error: roleError } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (roleError || !roleData) {
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch dictionary entries
    const { data: dictionaryEntries, error: dictError } = await supabaseClient
      .from('dictionary_entries')
      .select('*')
      .order('word', { ascending: true });

    if (dictError) {
      throw dictError;
    }

    // Fetch training phrases
    const { data: trainingPhrases, error: phrasesError } = await supabaseClient
      .from('training_phrases')
      .select('*')
      .eq('is_validated', true);

    if (phrasesError) {
      throw phrasesError;
    }

    console.log(`Retraining model with ${dictionaryEntries?.length || 0} dictionary entries and ${trainingPhrases?.length || 0} training phrases`);

    // Check minimum data requirements
    if ((dictionaryEntries?.length || 0) < 100 || (trainingPhrases?.length || 0) < 50) {
      return new Response(
        JSON.stringify({ 
          error: 'Insufficient data',
          message: 'At least 100 dictionary entries and 50 validated phrases required',
          current: {
            dictionary: dictionaryEntries?.length || 0,
            phrases: trainingPhrases?.length || 0,
          }
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Call train-translation-model function for AI analysis
    const { data: trainingResult, error: trainingError } = await supabaseClient.functions.invoke(
      'train-translation-model'
    );

    if (trainingError) {
      console.error('Training error:', trainingError);
    }

    const metrics = {
      dictionary_size: dictionaryEntries?.length || 0,
      training_phrases: trainingPhrases?.length || 0,
      retrained_at: new Date().toISOString(),
      training_context_created: !trainingError,
    };

    // Save performance metrics
    const { error: metricsError } = await supabaseClient
      .from('model_performance')
      .insert([
        {
          model_version: '1.0.0',
          metric_name: 'dictionary_size',
          metric_value: metrics.dictionary_size,
        },
        {
          model_version: '1.0.0',
          metric_name: 'training_phrases',
          metric_value: metrics.training_phrases,
        },
      ]);

    if (metricsError) {
      console.error('Error saving metrics:', metricsError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Model retraining completed',
        metrics,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in retrain-model function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
