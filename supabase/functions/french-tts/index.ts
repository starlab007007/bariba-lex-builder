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
  returnAudio?: boolean;
}

// Inworld TTS-1.5 Mini voice mapping
const VOICE_MAP: Record<string, string> = {
  'announcer': 'Mark',
  'narrator': 'Timothy',
  'female': 'Sarah',
  'alloy': 'Alex',
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

    // Step 2: If returnAudio is true, generate actual audio using Inworld TTS-1.5 Mini
    if (returnAudio) {
      const aimlApiKey = Deno.env.get('AIML_API_KEY');
      
      if (aimlApiKey) {
        try {
          const inworldVoice = VOICE_MAP[voice] || VOICE_MAP['announcer'];
          console.log(`[TTS] Generating audio with Inworld TTS-1.5 Mini voice: ${inworldVoice}`);
          
          const ttsResponse = await fetch('https://api.aimlapi.com/v1/tts', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${aimlApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'inworld/tts-1-5-mini',
              text: optimizedText,
              voice: inworldVoice,
              language: 'fr',
              format: 'mp3',
            }),
          });

          if (ttsResponse.ok) {
            const ttsData = await ttsResponse.json();
            const audioUrl = ttsData?.audio?.url;
            
            if (audioUrl) {
              console.log(`[TTS] Got audio URL, downloading: ${audioUrl}`);
              
              // Download the audio file
              const audioDownload = await fetch(audioUrl);
              if (audioDownload.ok) {
                const audioBuffer = await audioDownload.arrayBuffer();
                const audioBase64 = base64Encode(audioBuffer);
                const duration = Date.now() - startTime;
                
                console.log(`[TTS] Inworld audio generated: ${audioBuffer.byteLength} bytes in ${duration}ms`);
                
                return new Response(
                  JSON.stringify({
                    success: true,
                    method: 'inworld-tts',
                    text: optimizedText,
                    audioBase64,
                    audioFormat: 'audio/mpeg',
                    audioSize: audioBuffer.byteLength,
                    duration,
                  }),
                  { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                );
              } else {
                console.error('[TTS] Failed to download audio from URL:', audioDownload.status);
              }
            } else {
              console.error('[TTS] No audio URL in response:', JSON.stringify(ttsData));
            }
          } else {
            const errorText = await ttsResponse.text();
            console.error('[TTS] Inworld TTS error:', ttsResponse.status, errorText);
          }
        } catch (inworldError) {
          console.error('[TTS] Inworld TTS failed:', inworldError);
        }
      }
      
      // Fallback 2: Try ElevenLabs
      const elevenLabsKey = Deno.env.get('ELEVENLABS_API_KEY');
      if (elevenLabsKey) {
        try {
          const ELEVEN_VOICE_MAP: Record<string, string> = {
            'announcer': 'pFZP5JQG7iQjIQuC4Bku', // Lily (French)
            'narrator': 'onwK4e9ZLuTAKqWW03F9', // Daniel (French)
            'female': 'pFZP5JQG7iQjIQuC4Bku', // Lily (French)
            'alloy': 'onwK4e9ZLuTAKqWW03F9', // Daniel (French)
          };
          const voiceId = ELEVEN_VOICE_MAP[voice] || ELEVEN_VOICE_MAP['narrator'];
          console.log(`[TTS] Fallback to ElevenLabs voice: ${voiceId}`);
          
          const elResponse = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
            method: 'POST',
            headers: {
              'xi-api-key': elevenLabsKey,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              text: optimizedText,
              model_id: 'eleven_multilingual_v2',
              voice_settings: { stability: 0.5, similarity_boost: 0.75 },
            }),
          });

          if (elResponse.ok) {
            const audioBuffer = await elResponse.arrayBuffer();
            const audioBase64 = base64Encode(audioBuffer);
            const duration = Date.now() - startTime;
            console.log(`[TTS] ElevenLabs audio: ${audioBuffer.byteLength} bytes in ${duration}ms`);
            
            return new Response(
              JSON.stringify({
                success: true,
                method: 'elevenlabs-tts',
                text: optimizedText,
                audioBase64,
                audioFormat: 'audio/mpeg',
                audioSize: audioBuffer.byteLength,
                duration,
              }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          } else {
            const errText = await elResponse.text();
            console.error('[TTS] ElevenLabs error:', elResponse.status, errText);
          }
        } catch (elErr) {
          console.error('[TTS] ElevenLabs failed:', elErr);
        }
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
