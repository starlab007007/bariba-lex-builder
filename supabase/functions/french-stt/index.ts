import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * French STT Edge Function
 * 
 * Cette fonction retourne des instructions pour utiliser Web Speech API côté client.
 * Le Web Speech API est gratuit et fonctionne directement dans le navigateur.
 * 
 * Raison: Gemini ne supporte pas correctement l'audio en base64 webm,
 * et les alternatives payantes (Whisper, ElevenLabs) nécessitent des API keys.
 */

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { audio } = body;

    console.log(`🎤 French STT: Request received, audio length: ${audio?.length || 0}`);

    // Toujours retourner instructions pour utiliser Web Speech API côté client
    // C'est la solution gratuite et fiable pour le STT français
    return new Response(
      JSON.stringify({
        useClientSide: true,
        method: 'web-speech-api',
        message: 'Utilisez Web Speech API dans le navigateur pour la transcription française',
        instructions: {
          api: 'SpeechRecognition',
          lang: 'fr-FR',
          continuous: true,
          interimResults: true,
        },
        // Si on a reçu de l'audio, on indique qu'on ne peut pas le traiter côté serveur
        note: audio 
          ? 'L\'audio base64 ne peut pas être transcrit côté serveur. Utilisez Web Speech API côté client.'
          : 'Aucun audio reçu.'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('French STT error:', error);
    return new Response(
      JSON.stringify({ 
        useClientSide: true,
        error: error instanceof Error ? error.message : 'STT processing failed',
        fallback: 'web-speech-api',
        message: 'Utilisez Web Speech API comme fallback'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
