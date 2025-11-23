import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🚀 SMT Initialization Edge Function - START');
    
    // Utiliser le service role key pour contourner RLS
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    console.log('📊 Fetching training phrases count...');
    
    // Compter le total exact
    const { count: totalCount, error: countError } = await supabase
      .from('training_phrases')
      .select('*', { count: 'exact', head: true });
    
    if (countError) {
      console.error('❌ Count error:', countError);
      throw countError;
    }
    
    console.log(`📊 Total phrases in DB: ${totalCount}`);
    
    if (!totalCount || totalCount === 0) {
      return new Response(
        JSON.stringify({ 
          error: 'No training phrases found',
          phrasesCount: 0 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
    
    // Charger TOUTES les phrases par pagination
    console.log(`🔄 Loading ALL ${totalCount} phrases via pagination...`);
    
    const BATCH_SIZE = 1000;
    const trainingPhrases: any[] = [];
    let offset = 0;
    let hasMore = true;
    
    while (hasMore) {
      console.log(`🔄 Loading batch ${Math.floor(offset / BATCH_SIZE) + 1}...`);
      
      const { data: batch, error: batchError } = await supabase
        .from('training_phrases')
        .select('french_text, bariba_text, quality_score, source')
        .order('created_at', { ascending: false })
        .range(offset, offset + BATCH_SIZE - 1);
      
      if (batchError) {
        console.error(`❌ Batch error at offset ${offset}:`, batchError);
        throw batchError;
      }
      
      if (batch && batch.length > 0) {
        trainingPhrases.push(...batch);
        offset += batch.length;
        const percentage = Math.round((trainingPhrases.length / totalCount) * 100);
        console.log(`   ✓ Loaded ${trainingPhrases.length} / ${totalCount} phrases (${percentage}%)...`);
        hasMore = batch.length === BATCH_SIZE;
      } else {
        console.log(`   ⚠️ Empty batch at offset ${offset}, stopping pagination`);
        hasMore = false;
      }
    }
    
    console.log(`✅ ALL PHRASES LOADED: ${trainingPhrases.length} / ${totalCount} total`);
    
    // Statistiques par source
    const sourceStats = trainingPhrases.reduce((acc, p) => {
      const source = p.source || 'unknown';
      acc[source] = (acc[source] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    console.log('📊 DISTRIBUTION BY SOURCE:');
    Object.entries(sourceStats).forEach(([source, count]) => {
      console.log(`   ✓ ${source}: ${count.toLocaleString()} phrases`);
    });
    
    // Charger les entrées du dictionnaire
    const { data: dictionary, error: dictError } = await supabase
      .from('dictionary_entries')
      .select('id, word, definition');
    
    if (dictError) {
      console.error('❌ Dictionary error:', dictError);
      throw dictError;
    }
    
    console.log(`✅ Loaded ${dictionary?.length || 0} dictionary entries`);
    
    // ⚠️ NE PAS retourner toutes les phrases (trop volumineux)
    // Retourner seulement les statistiques et un échantillon
    const result = {
      success: true,
      phrasesCount: trainingPhrases.length,
      dictionaryCount: dictionary?.length || 0,
      sourceStats,
      samplePhrases: trainingPhrases.slice(0, 10), // Seulement 10 exemples
      timestamp: Date.now()
    };
    
    console.log('✅ SMT Initialization Edge Function - SUCCESS');
    console.log(`📦 Response size: ${phrasesCount} phrases (returning stats only)`);
    
    return new Response(
      JSON.stringify(result),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
    
  } catch (error: any) {
    console.error('❌ SMT Initialization Edge Function - ERROR:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        stack: error.stack 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});