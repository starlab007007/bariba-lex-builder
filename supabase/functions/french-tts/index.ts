import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TTSRequest {
  text: string;
  voice?: string;
  speed?: number;
  returnAudio?: boolean; // If true, return actual audio blob
}

// ElevenLabs voice IDs - French-friendly voices
const VOICE_MAP: Record<string, string> = {
  'announcer': 'onwK4e9ZLuTAKqWW03F9', // Daniel - professional French
  'narrator': 'JBFqnCBsd6RMkjVDRZzb',  // George - authoritative
  'female': 'EXAVITQu4vr4xnSDxMaL',    // Sarah - clear female voice
  'alloy': 'onwK4e9ZLuTAKqWW03F9',     // Default to Daniel
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, voice = 'announcer', speed = 1.0, returnAudio = false }: TTSRequest = await req.json();

    if (!text) {
      return new Response(
        JSON.stringify({ error: 'Text required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`🔊 French TTS: "${text.substring(0, 100)}..." voice=${voice} returnAudio=${returnAudio}`);
    const startTime = Date.now();

    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    
    // Step 1: Optimize text for natural French speech using AI
    let optimizedText = text;
    if (lovableApiKey) {
      try {
        const optimizeResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${lovableApiKey}`,
          },
          body: JSON.stringify({
            model: 'google/gemini-3-flash-preview',
            messages: [
              {
                role: 'system',
                content: `Tu es un assistant qui optimise les textes pour une lecture à voix haute naturelle en français. 
Ajoute des pauses naturelles avec "..." et des emphases.
Garde le texte court et percutant pour un journal TV.
Ne modifie pas le sens, juste le rythme pour la narration.
Retourne UNIQUEMENT le texte optimisé, sans explications.`
              },
              {
                role: 'user',
                content: `Optimise ce texte pour une narration de journal TV en français:\n\n${text}`
              }
            ],
            max_tokens: 1000,
            temperature: 0.3,
          }),
        });

        if (optimizeResponse.ok) {
          const data = await optimizeResponse.json();
          optimizedText = data.choices?.[0]?.message?.content?.trim() || text;
          console.log(`[TTS] AI optimized text in ${Date.now() - startTime}ms`);
        }
      } catch (aiError) {
        console.warn('[TTS] AI optimization failed, using original text:', aiError);
      }
    }

    // Step 2: If returnAudio is true, generate actual audio using ElevenLabs
    if (returnAudio) {
      const elevenLabsApiKey = Deno.env.get('ELEVENLABS_API_KEY');
      
      if (elevenLabsApiKey) {
        try {
          const voiceId = VOICE_MAP[voice] || VOICE_MAP['announcer'];
          console.log(`[TTS] Generating audio with ElevenLabs voice: ${voiceId}`);
          
          const audioResponse = await fetch(
            `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
            {
              method: 'POST',
              headers: {
                'xi-api-key': elevenLabsApiKey,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                text: optimizedText,
                model_id: 'eleven_multilingual_v2',
                voice_settings: {
                  stability: 0.6,
                  similarity_boost: 0.75,
                  style: 0.4,
                  use_speaker_boost: true,
                  speed: speed,
                },
              }),
            }
          );

          if (audioResponse.ok) {
            const audioBuffer = await audioResponse.arrayBuffer();
            const audioBase64 = base64Encode(audioBuffer);
            const duration = Date.now() - startTime;
            
            console.log(`[TTS] ElevenLabs audio generated: ${audioBuffer.byteLength} bytes in ${duration}ms`);
            
            return new Response(
              JSON.stringify({
                success: true,
                method: 'elevenlabs',
                text: optimizedText,
                audioBase64,
                audioFormat: 'audio/mpeg',
                audioSize: audioBuffer.byteLength,
                duration,
              }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          } else {
            const errorText = await audioResponse.text();
            console.error('[TTS] ElevenLabs error:', errorText);
          }
        } catch (elevenLabsError) {
          console.error('[TTS] ElevenLabs failed:', elevenLabsError);
        }
      } else {
        console.log('[TTS] No ELEVENLABS_API_KEY, falling back to text optimization only');
      }
      
      // Fallback: Return optimized text for client-side Web Speech API
      const duration = Date.now() - startTime;
      return new Response(
        JSON.stringify({
          success: false,
          method: 'web-speech-synthesis',
          text: optimizedText,
          language: 'fr-FR',
          duration,
          message: 'Audio generation unavailable, use Web Speech API on client',
          speechSettings: {
            rate: 0.85,
            pitch: 1.0,
            volume: 1.0,
            preferredVoice: 'Microsoft Paul - French (France)',
            fallbackVoices: ['Google français', 'French Female', 'fr-FR']
          },
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Default: Return optimized text for client-side synthesis (backward compatible)
    const duration = Date.now() - startTime;
    
    return new Response(
      JSON.stringify({
        method: 'web-speech-synthesis',
        text: optimizedText,
        originalText: text,
        language: 'fr-FR',
        voice,
        speed,
        duration,
        optimized: true,
        speechSettings: {
          rate: 0.85,
          pitch: 1.0,
          volume: 1.0,
          preferredVoice: 'Microsoft Paul - French (France)',
          fallbackVoices: ['Google français', 'French Female', 'fr-FR']
        },
        instructions: 'Use browser speechSynthesis API with provided settings. Text has been optimized for natural French broadcast speech.'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Fatal error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'TTS failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
