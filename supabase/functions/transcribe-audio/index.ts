/**
 * Transcribe Audio Edge Function
 * 
 * Receives an audio blob and transcribes it to text using Mistral Voxtral Mini (batch).
 * Falls back to Lovable AI (Gemini Flash) if Mistral fails.
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
    const contentType = req.headers.get('content-type') || '';
    let audioFile: File | null = null;
    let languageCode = 'fr';

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      audioFile = (formData.get('file') || formData.get('audio')) as File | null;
      languageCode = String(formData.get('languageCode') || 'fr').toLowerCase();
    } else {
      const body = await req.json().catch(() => ({}));
      languageCode = String(body?.languageCode || 'fr').toLowerCase();
      const raw = String(body?.audio || '').trim();
      if (raw) {
        const dataMatch = raw.match(/^data:([^;]+);base64,(.+)$/s);
        const mimeType = String(
          body?.mimeType || dataMatch?.[1] || 'audio/mp4',
        );
        const encoded = (dataMatch?.[2] || raw).replace(/\s+/g, '');
        const binary = atob(encoded);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i);
        }
        audioFile = new File(
          [bytes],
          String(body?.fileName || 'fitila-voice.m4a'),
          { type: mimeType },
        );
      }
    }

    if (!audioFile) {
      return new Response(
        JSON.stringify({ success: false, error: 'No audio file provided' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log(`[transcribe-audio] Received audio: ${audioFile.name}, size: ${audioFile.size}, type: ${audioFile.type}, language=${languageCode}`);

    const MISTRAL_API_KEY = Deno.env.get('MISTRAL_API_KEY');
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    // Try Mistral Voxtral Mini STT first
    if (MISTRAL_API_KEY) {
      try {
        const result = await transcribeWithMistral(
          audioFile,
          MISTRAL_API_KEY,
          languageCode,
        );
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

    // Fallback: Lovable AI (Gemini Flash)
    if (LOVABLE_API_KEY) {
      try {
        const audioBytes = await audioFile.arrayBuffer();
        const base64Audio = btoa(String.fromCharCode(...new Uint8Array(audioBytes)));
        
        const result = await transcribeWithGemini(
          base64Audio,
          audioFile.type,
          LOVABLE_API_KEY,
          languageCode,
        );
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
 * Transcribe audio using Mistral Voxtral Mini Transcribe V2
 */
async function transcribeWithMistral(
  audioFile: File,
  apiKey: string,
  languageCode: string,
): Promise<{ text: string; words: Array<{ text: string; start: number; end: number }>; language: string }> {
  const formData = new FormData();
  formData.append('file', audioFile);
  formData.append('model', 'voxtral-mini-latest');
  formData.append('language', languageCode === 'fr' ? 'fr' : languageCode);
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

/**
 * Fallback transcription using Gemini (audio understanding)
 */
async function transcribeWithGemini(
  base64Audio: string,
  mimeType: string,
  apiKey: string,
  languageCode: string,
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
              text: languageCode === 'fr'
                ? `Transcris cet audio en français mot à mot. Retourne UNIQUEMENT le texte transcrit, sans commentaire, sans guillemets, sans formatage spécial. Si tu ne comprends pas certains mots, fais de ton mieux pour les transcrire phonétiquement.`
                : `Transcris cet audio mot à mot dans la langue parlée. Retourne UNIQUEMENT le texte transcrit, sans commentaire ni formatage.`,
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
    language: languageCode === 'fr' ? 'fra' : languageCode,
  };
}
