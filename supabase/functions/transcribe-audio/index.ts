/**
 * Transcribe Audio Edge Function
 * 
 * Receives an audio blob and transcribes it to text using ElevenLabs STT (batch, scribe_v2).
 * Falls back to Lovable AI (Gemini Flash) if ElevenLabs fails.
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
    const audioFile = formData.get('audio') as File | null;

    if (!audioFile) {
      return new Response(
        JSON.stringify({ success: false, error: 'No audio file provided' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log(`[transcribe-audio] Received audio: ${audioFile.name}, size: ${audioFile.size}, type: ${audioFile.type}`);

    const ELEVENLABS_API_KEY = Deno.env.get('ELEVENLABS_API_KEY');
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    // Try ElevenLabs STT first
    if (ELEVENLABS_API_KEY) {
      try {
        const result = await transcribeWithElevenLabs(audioFile, ELEVENLABS_API_KEY);
        if (result && result.text && result.text.trim().length > 0) {
          console.log(`[transcribe-audio] ElevenLabs success: ${result.text.length} chars`);
          return new Response(
            JSON.stringify({ success: true, ...result, method: 'elevenlabs' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        console.warn('[transcribe-audio] ElevenLabs returned empty text, falling back...');
      } catch (elevenLabsError) {
        console.error('[transcribe-audio] ElevenLabs error:', elevenLabsError);
      }
    } else {
      console.log('[transcribe-audio] No ELEVENLABS_API_KEY, skipping ElevenLabs');
    }

    // Fallback: Lovable AI (Gemini Flash) — describe what the audio should contain
    if (LOVABLE_API_KEY) {
      try {
        // Convert audio to base64 for Gemini
        const audioBytes = await audioFile.arrayBuffer();
        const base64Audio = btoa(String.fromCharCode(...new Uint8Array(audioBytes)));
        
        const result = await transcribeWithGemini(base64Audio, audioFile.type, LOVABLE_API_KEY);
        if (result && result.text && result.text.trim().length > 0) {
          console.log(`[transcribe-audio] Gemini fallback success: ${result.text.length} chars`);
          return new Response(
            JSON.stringify({ success: true, ...result, method: 'gemini' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      } catch (geminiError) {
        console.error('[transcribe-audio] Gemini fallback error:', geminiError);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Transcription failed with all available methods',
        useClientSide: true,
        message: 'Utilisez Web Speech API comme fallback côté client'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
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
 * Transcribe audio using ElevenLabs STT (scribe_v2 batch)
 */
async function transcribeWithElevenLabs(
  audioFile: File,
  apiKey: string
): Promise<{ text: string; words: Array<{ text: string; start: number; end: number }>; language: string }> {
  const formData = new FormData();
  formData.append('file', audioFile);
  formData.append('model_id', 'scribe_v2');
  formData.append('language_code', 'fra'); // French
  formData.append('tag_audio_events', 'false');
  formData.append('diarize', 'false');

  console.log('[transcribe-audio] Calling ElevenLabs STT...');

  const response = await fetch('https://api.elevenlabs.io/v1/speech-to-text', {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[transcribe-audio] ElevenLabs HTTP error:', response.status, errorText);
    throw new Error(`ElevenLabs STT error: ${response.status}`);
  }

  const data = await response.json();
  
  return {
    text: data.text || '',
    words: (data.words || []).map((w: any) => ({
      text: w.text,
      start: w.start,
      end: w.end,
    })),
    language: data.language_code || 'fra',
  };
}

/**
 * Fallback transcription using Gemini (audio understanding)
 */
async function transcribeWithGemini(
  base64Audio: string,
  mimeType: string,
  apiKey: string
): Promise<{ text: string; words: never[]; language: string }> {
  console.log('[transcribe-audio] Calling Gemini for audio transcription...');

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'input_audio',
              input_audio: {
                data: base64Audio,
                format: mimeType.includes('webm') ? 'webm' : mimeType.includes('mp4') ? 'mp4' : 'wav',
              },
            },
            {
              type: 'text',
              text: `Transcris cet audio en français mot à mot. L'audio contient un conte ou une histoire racontée à voix haute. Retourne UNIQUEMENT le texte transcrit, sans commentaire, sans guillemets, sans formatage spécial. Si tu ne comprends pas certains mots, fais de ton mieux pour les transcrire phonétiquement.`,
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[transcribe-audio] Gemini error:', response.status, errorText);
    throw new Error(`Gemini transcription error: ${response.status}`);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content || '';

  return {
    text: text.trim(),
    words: [],
    language: 'fra',
  };
}
