/**
 * Transcribe Audio Edge Function
 * 
 * Receives an audio blob and transcribes it to text using Mistral Voxtral Mini (batch).
 * Falls back to client-side speech recognition if Mistral fails.
 * 
 * Returns: { text, words[], language }
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
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

    const MISTRAL_API_KEY = Deno.env.get('MISTRAL_API_KEY');

    // Try Mistral Voxtral Mini STT first
    if (MISTRAL_API_KEY) {
      try {
        const result = await transcribeWithMistral(audioFile, MISTRAL_API_KEY);
        if (result && result.text && result.text.trim().length > 0) {
          console.log(`[transcribe-audio] Mistral success: ${result.text.length} chars`);
          return new Response(
            JSON.stringify({ success: true, ...result, method: 'mistral' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        console.warn('[transcribe-audio] Mistral returned empty text, falling back...');
      } catch (mistralError) {
        console.error('[transcribe-audio] Mistral error:', mistralError);
      }
    } else {
      console.log('[transcribe-audio] No MISTRAL_API_KEY, skipping Mistral');
    }

    // No external fallback provider: use client-side Web Speech when Mistral is unavailable.
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
 * Transcribe audio using Mistral Voxtral Mini Transcribe V2
 */
async function transcribeWithMistral(
  audioFile: File,
  apiKey: string
): Promise<{ text: string; words: Array<{ text: string; start: number; end: number }>; language: string }> {
  const formData = new FormData();
  formData.append('file', audioFile);
  formData.append('model', 'voxtral-mini-latest');
  formData.append('language', 'fr');
  formData.append('timestamp_granularities', 'word');

  console.log('[transcribe-audio] Calling Mistral Voxtral Mini STT...');

  const response = await fetch('https://api.mistral.ai/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[transcribe-audio] Mistral HTTP error:', response.status, errorText);
    throw new Error(`Mistral STT error: ${response.status}`);
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
  };
}
