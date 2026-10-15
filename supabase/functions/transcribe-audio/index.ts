import { aiFetch, AI_AUDIO_URL, getActiveAIKey } from "../_shared/ai-provider.ts";
/**
 * Transcribe Audio Edge Function
 * 
 * Receives an audio blob and transcribes it to text using le fournisseur IA actif (Voxtral ou Gemini).
 * Falls back to client-side speech recognition if Fournisseur IA actif fails.
 * 
 * Returns: { text, words[], language }
 */


const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const formData = await req.formData();
    const audioFile = (formData.get('file') || formData.get('audio')) as File | null;

    if (!audioFile) {
      return new Response(
        JSON.stringify({ success: false, error: 'No audio file provided' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log(`[transcribe-audio] Received audio: ${audioFile.name}, size: ${audioFile.size}, type: ${audioFile.type}`);

    const ACTIVE_AI_KEY = await getActiveAIKey();

    // Try Fournisseur IA actif Voxtral Mini STT first
    if (ACTIVE_AI_KEY) {
      try {
        const result = await transcribeWithActiveAI(audioFile, ACTIVE_AI_KEY);
        if (result && result.text && result.text.trim().length > 0) {
          console.log(`[transcribe-audio] Fournisseur IA actif success: ${result.text.length} chars`);
          return new Response(
            JSON.stringify({ success: true, ...result, method: result.provider || 'mistral' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        console.warn('[transcribe-audio] Fournisseur IA actif returned empty text, falling back...');
      } catch (providerError) {
        console.error('[transcribe-audio] Fournisseur IA actif error:', providerError);
      }
    } else {
      console.log('[transcribe-audio] No ACTIVE_AI_KEY, skipping Fournisseur IA actif');
    }

    // No external fallback provider: use client-side Web Speech when Fournisseur IA actif is unavailable.
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Transcription serveur indisponible',
        useClientSide: true,
        message: 'Utilisez Web Speech API comme fallback côté client'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 503 }
    );

  } catch (error) {
    console.error('[transcribe-audio] Fatal error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Transcription failed' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

/**
 * Transcribe audio using le fournisseur IA actif
 */
async function transcribeWithActiveAI(
  audioFile: File,
  apiKey: string
): Promise<{ text: string; words: Array<{ text: string; start: number; end: number }>; language: string; provider: string; model: string }> {
  const formData = new FormData();
  formData.append('file', audioFile);
  formData.append('model', 'voxtral-mini-latest');
  formData.append('language', 'fr');
  formData.append('timestamp_granularities', 'word');

  console.log('[transcribe-audio] Calling Fournisseur IA actif Voxtral Mini STT...');

  const response = await aiFetch(AI_AUDIO_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[transcribe-audio] Fournisseur IA actif HTTP error:', response.status, errorText);
    throw new Error(`Fournisseur IA actif STT error: ${response.status}`);
  }

  const data = await response.json();

  return {
    text: data.text || '',
    words: (data.words || []).map((w: any) => ({
      text: w.text,
      start: w.start,
      end: w.end,
    })),
    language: data.language || 'fr',
    provider: response.headers.get('X-Fitila-AI-Provider') || '',
    model: data.model || response.headers.get('X-Fitila-AI-Model') || '',
  };
}

