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

    // Verify admin access
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

    // Fetch all training phrases
    const { data: phrases, error: phrasesError } = await supabaseClient
      .from('training_phrases')
      .select('*')
      .limit(100);

    if (phrasesError) throw phrasesError;

    if (!phrases || phrases.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No phrases to analyze' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Analyzing ${phrases.length} training phrases`);

    // Use Lovable AI to analyze quality
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const analysisResults: Array<{ id: string; quality_score: number; issues: string[]; suggestions: string[] }> = [];

    // Analyze in batches of 10
    for (let i = 0; i < phrases.length; i += 10) {
      const batch = phrases.slice(i, i + 10);
      
      const prompt = `Tu es un expert linguiste spécialisé en Bààtɔ̀nú (Bariba).

Analyse la qualité de ces paires de traduction français-bariba et pour chacune donne :
1. Un score de qualité entre 0 et 1
2. Des suggestions d'amélioration spécifiques
3. Les problèmes détectés (grammaire, cohérence, sens, etc.)

Phrases à analyser :
${batch.map((p, idx) => `${idx + 1}. FR: "${p.french_text}" | BR: "${p.bariba_text}"`).join('\n')}

Réponds au format JSON suivant :
{
  "analyses": [
    {
      "index": 1,
      "quality_score": 0.85,
      "issues": ["Manque de ton diacritique sur 'o'"],
      "suggestions": ["Ajouter les tons diacritiques appropriés"]
    }
  ]
}`;

      const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            { role: 'system', content: 'Tu es un expert en linguistique et qualité de traductions.' },
            { role: 'user', content: prompt },
          ],
        }),
      });

      if (!response.ok) {
        console.error('AI API error:', response.status);
        continue;
      }

      const aiData = await response.json();
      const analysisText = aiData.choices?.[0]?.message?.content || '';

      try {
        const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsedAnalysis = JSON.parse(jsonMatch[0]);
          
          // Map analyses back to phrase IDs
          parsedAnalysis.analyses?.forEach((analysis: any) => {
            const phraseIndex = i + analysis.index - 1;
            if (phraseIndex < phrases.length) {
              analysisResults.push({
                id: phrases[phraseIndex].id,
                quality_score: analysis.quality_score || 0.5,
                issues: analysis.issues || [],
                suggestions: analysis.suggestions || [],
              });
            }
          });
        }
      } catch (parseError) {
        console.error('Error parsing AI response:', parseError);
      }
    }

    // Update phrases with quality scores
    for (const result of analysisResults) {
      await supabaseClient
        .from('training_phrases')
        .update({ 
          quality_score: result.quality_score,
          metadata: {
            issues: result.issues,
            suggestions: result.suggestions,
            analyzed_at: new Date().toISOString(),
          }
        })
        .eq('id', result.id);
    }

    return new Response(
      JSON.stringify({
        success: true,
        analyzed: analysisResults.length,
        results: analysisResults,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: unknown) {
    console.error('Error in analyze-phrase-quality:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});