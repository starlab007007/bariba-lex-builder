import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const SPACE_URL = 'https://zimesongbian-baatonum-asr-stt-api-v001-improve.hf.space';

interface STTRequest {
  audio: string;
  robustMode?: boolean;
  speakerType?: 'Auto' | 'Enfant' | 'Femme' | 'Homme' | 'PersonneAgee';
}

/**
 * Détecte le type MIME et l'extension depuis le préfixe base64 ou utilise des valeurs par défaut.
 */
function detectAudioFormat(audioBase64: string): { mime: string; ext: string; pureBase64: string } {
  if (audioBase64.startsWith('data:')) {
    const match = audioBase64.match(/^data:(audio\/[^;]+);base64,(.+)$/s);
    if (match) {
      const mime = match[1];
      const pureBase64 = match[2];
      const ext = mime.split('/')[1]?.split(';')[0] || 'webm';
      return { mime, ext, pureBase64 };
    }
  }
  // Pas de préfixe data: → audio brut en base64
  return { mime: 'audio/webm', ext: 'webm', pureBase64: audioBase64 };
}

/**
 * Convertit une chaîne base64 en Uint8Array
 */
function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * ÉTAPE 1 : Upload du fichier audio vers le Space HuggingFace via multipart
 * Retourne le path temporaire retourné par Gradio
 */
async function uploadAudioFile(
  audioBytes: Uint8Array,
  mime: string,
  ext: string,
  hfToken: string
): Promise<string> {
  console.log(`📤 Uploading audio file to HuggingFace Space (${audioBytes.length} bytes, ${mime})`);

  const formData = new FormData();
  const blob = new Blob([audioBytes], { type: mime });
  formData.append('files', blob, `audio.${ext}`);

  const uploadResponse = await fetch(`${SPACE_URL}/gradio_api/upload`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${hfToken}`,
    },
    body: formData,
    signal: AbortSignal.timeout(30000),
  });

  console.log(`   Upload status: ${uploadResponse.status}`);

  if (!uploadResponse.ok) {
    const errorText = await uploadResponse.text();
    console.error(`   Upload failed: ${errorText.substring(0, 300)}`);
    throw new Error(`Upload failed (${uploadResponse.status}): ${errorText.substring(0, 200)}`);
  }

  const uploadResult = await uploadResponse.json();
  console.log(`   Upload result: ${JSON.stringify(uploadResult).substring(0, 300)}`);

  // Le Space retourne soit un tableau de paths, soit un objet avec path
  let filePath: string | null = null;

  if (Array.isArray(uploadResult) && uploadResult.length > 0) {
    // Format: [{"path": "...", "url": "...", ...}] ou ["path/to/file"]
    const first = uploadResult[0];
    filePath = typeof first === 'string' ? first : (first?.path || first?.name || null);
  } else if (uploadResult?.path) {
    filePath = uploadResult.path;
  } else if (typeof uploadResult === 'string') {
    filePath = uploadResult;
  }

  if (!filePath) {
    throw new Error(`Upload response missing file path: ${JSON.stringify(uploadResult).substring(0, 200)}`);
  }

  console.log(`   ✅ File uploaded to path: ${filePath}`);
  return filePath;
}

/**
 * ÉTAPE 2 : Appel de l'endpoint /gradio_api/call/transcribe avec le filepath
 * Retourne l'event_id pour la récupération SSE
 */
async function callTranscribeEndpoint(
  filePath: string,
  robustMode: boolean,
  speakerType: string,
  hfToken: string
): Promise<string> {
  console.log(`🎯 Calling transcribe endpoint with path: ${filePath}`);

  // Format FileData pour Gradio v4 : { "path": "...", "meta": { "_type": "gradio.FileData" } }
  const fileData = {
    path: filePath,
    meta: { _type: 'gradio.FileData' }
  };

  const requestBody = {
    data: [fileData, robustMode, speakerType]
  };

  console.log(`   Request body: ${JSON.stringify(requestBody).substring(0, 300)}`);

  const response = await fetch(`${SPACE_URL}/gradio_api/call/transcribe`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${hfToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
    signal: AbortSignal.timeout(30000),
  });

  console.log(`   Transcribe call status: ${response.status}`);

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`   Transcribe call failed: ${errorText.substring(0, 300)}`);
    
    if (response.status === 503) {
      throw new Error('SPACE_SLEEPING: Le Space HuggingFace est en veille. Réessayez dans 30 secondes.');
    }
    throw new Error(`Transcribe call failed (${response.status}): ${errorText.substring(0, 200)}`);
  }

  const result = await response.json();
  console.log(`   Transcribe result: ${JSON.stringify(result).substring(0, 200)}`);

  const eventId = result?.event_id;
  if (!eventId) {
    throw new Error(`No event_id in transcribe response: ${JSON.stringify(result).substring(0, 200)}`);
  }

  console.log(`   ✅ Got event_id: ${eventId}`);
  return eventId;
}

/**
 * ÉTAPE 3 : Lecture du stream SSE jusqu'à process_completed
 * Retourne le texte transcrit
 */
async function readSSEResult(eventId: string, hfToken: string): Promise<string> {
  console.log(`📡 Reading SSE result for event: ${eventId}`);

  const sseUrl = `${SPACE_URL}/gradio_api/call/transcribe/${eventId}`;

  const response = await fetch(sseUrl, {
    headers: {
      'Authorization': `Bearer ${hfToken}`,
      'Accept': 'text/event-stream',
      'Cache-Control': 'no-cache',
    },
    signal: AbortSignal.timeout(60000), // 60 secondes max pour le cold start
  });

  console.log(`   SSE status: ${response.status}`);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`SSE request failed (${response.status}): ${errorText.substring(0, 200)}`);
  }

  // Lire le body entier du stream SSE
  const sseRaw = await response.text();
  // CRITIQUE : normaliser CRLF → LF pour éviter les \r résiduels qui cassent line === ''
  const sseText = sseRaw.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  
  console.log(`   SSE raw length: ${sseRaw.length} chars`);
  console.log(`   SSE raw (first 800 chars): ${sseRaw.substring(0, 800)}`);

  /**
   * Parser SSE robuste supportant 3 formats :
   * Format A (Gradio standard) : data seule contient {"msg":"process_completed","output":{"data":["texte"]}}
   * Format B (event + data)    : event: complete \n data: [{"transcription":"..."}]
   * Format C (event: process_completed) : event: process_completed \n data: {...}
   */
  const lines = sseText.split('\n');
  let currentEvent: string | null = null;
  let lastData: string | null = null;

  for (const line of lines) {
    const trimmedLine = line.trim(); // trim pour gérer les \r résiduels éventuels

    if (trimmedLine.startsWith('event: ')) {
      currentEvent = trimmedLine.substring(7).trim();
    } else if (trimmedLine.startsWith('data: ')) {
      lastData = trimmedLine.substring(6).trim();
      
      // Format A : détecter process_completed directement dans la data sans attendre une ligne vide
      // (certains serveurs n'envoient pas de ligne vide finale)
      try {
        const parsed = JSON.parse(lastData);
        
        if (parsed.msg === 'process_completed') {
          console.log(`   ✅ process_completed detected inline (format A)`);
          if (parsed.output?.error) {
            throw new Error(`Model error: ${parsed.output.error}`);
          }
          const data = parsed.output?.data;
          if (Array.isArray(data)) {
            const first = data[0];
            if (typeof first === 'string' && first.length > 0) {
              console.log(`   Transcription (A-inline): "${first.substring(0, 100)}"`);
              return first;
            }
            if (first?.transcription) return first.transcription;
            if (first?.label) return first.label;
            if (first?.value) return first.value;
            for (const item of data) {
              if (typeof item === 'string' && item.length > 0) return item;
            }
          }
          if (parsed.output?.transcription) return parsed.output.transcription;
          if (parsed.output?.text) return parsed.output.text;
        }
        
        if (parsed.msg === 'process_errored') {
          throw new Error(`Process error: ${parsed.error || 'Unknown model error'}`);
        }
      } catch (inlineErr) {
        if (inlineErr instanceof Error && (
          inlineErr.message.startsWith('Model error') ||
          inlineErr.message.startsWith('Process error')
        )) throw inlineErr;
        // Sinon c'est une erreur de parsing normale (pas encore un JSON complet)
      }

    } else if (trimmedLine === '' && lastData) {
      // Fin d'un bloc SSE délimité par ligne vide
      try {
        const parsed = JSON.parse(lastData);

        // Format B : event: complete, data: [{"transcription": "...", ...}]
        if (currentEvent === 'complete') {
          console.log(`   ✅ event:complete received (format B)`);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const result = parsed[0];
            if (result?.transcription) {
              console.log(`   Transcription (B): "${result.transcription.substring(0, 100)}"`);
              return result.transcription;
            }
            if (result?.raw_model_output) return result.raw_model_output;
            for (const item of parsed) {
              if (typeof item === 'string' && item.length > 0) return item;
            }
          }
          if (typeof parsed === 'string' && parsed.length > 0) return parsed;
        }

        // Format C : event: process_completed, data: {...}
        if (currentEvent === 'process_completed' || parsed.msg === 'process_completed') {
          console.log(`   ✅ process_completed block received (format C)`);
          if (parsed.output?.error) {
            throw new Error(`Model error: ${parsed.output.error}`);
          }
          const data = parsed.output?.data;
          if (Array.isArray(data)) {
            const first = data[0];
            if (typeof first === 'string' && first.length > 0) {
              console.log(`   Transcription (C): "${first.substring(0, 100)}"`);
              return first;
            }
            if (first?.transcription) return first.transcription;
            if (first?.label) return first.label;
            if (first?.value) return first.value;
            for (const item of data) {
              if (typeof item === 'string' && item.length > 0) return item;
            }
          }
          if (parsed.output?.transcription) return parsed.output.transcription;
          if (parsed.output?.text) return parsed.output.text;
          throw new Error(`No transcription in output: ${JSON.stringify(parsed.output).substring(0, 300)}`);
        }

        if (parsed.msg === 'process_errored') {
          throw new Error(`Process error: ${parsed.error || 'Unknown model error'}`);
        }

      } catch (parseErr) {
        if (parseErr instanceof Error && (
          parseErr.message.startsWith('Model error') ||
          parseErr.message.startsWith('Process error') ||
          parseErr.message.startsWith('No transcription')
        )) {
          throw parseErr;
        }
      }
      currentEvent = null;
      lastData = null;
    }
  }

  // Dernier recours : parser lastData restante (stream sans ligne vide finale)
  if (lastData) {
    try {
      const parsed = JSON.parse(lastData);
      // Format B sans newline final
      if (Array.isArray(parsed) && parsed[0]?.transcription) return parsed[0].transcription;
      // Format A sans newline final
      if (parsed.msg === 'process_completed') {
        const data = parsed.output?.data;
        if (Array.isArray(data) && typeof data[0] === 'string') return data[0];
        if (parsed.output?.transcription) return parsed.output.transcription;
      }
    } catch (e) { /* ignore */ }
  }

  console.error(`   ❌ SSE stream fully parsed but no transcription found. Full SSE:\n${sseText}`);
  throw new Error('SSE stream ended without transcription result');
}

/**
 * Pipeline complet : base64 → Upload → Call → SSE → transcription
 */
async function transcribeBariba(
  audioBase64: string,
  robustMode: boolean,
  speakerType: string,
  hfToken: string
): Promise<string> {
  // 1. Détecter le format
  const { mime, ext, pureBase64 } = detectAudioFormat(audioBase64);
  console.log(`🎵 Audio format: ${mime} (.${ext}), base64 length: ${pureBase64.length}`);

  // 2. Convertir en bytes
  const audioBytes = base64ToUint8Array(pureBase64);
  console.log(`   Bytes: ${audioBytes.length}`);

  // 3. Upload vers le Space
  const filePath = await uploadAudioFile(audioBytes, mime, ext, hfToken);

  // 4. Appel transcribe → event_id
  const eventId = await callTranscribeEndpoint(filePath, robustMode, speakerType, hfToken);

  // 5. Lire SSE → transcription
  const transcription = await readSSEResult(eventId, hfToken);

  return transcription;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json() as STTRequest;
    const { audio, robustMode = true, speakerType = 'Auto' } = body;

    // Health check sans authentification
    if (!audio || audio === 'test' || audio.length < 20) {
      console.log(`🏥 Health check`);
      return new Response(
        JSON.stringify({ 
          status: 'ok',
          service: 'bariba-stt',
          message: 'Service disponible',
          isHealthCheck: true
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Vérification longueur max
    if (audio.length > 500000) {
      return new Response(
        JSON.stringify({ 
          error: 'Audio too large', 
          details: 'L\'enregistrement est trop long. Limitez à 30 secondes maximum.'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const HF_TOKEN = Deno.env.get('HUGGING_FACE_API_TOKEN');
    if (!HF_TOKEN) {
      return new Response(
        JSON.stringify({ error: 'Configuration serveur manquante', details: 'HuggingFace token non configuré' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`🎤 Bariba STT: audio=${audio.length} chars, robust=${robustMode}, speaker=${speakerType}`);
    const startTime = Date.now();

    try {
      const transcription = await transcribeBariba(audio, robustMode, speakerType, HF_TOKEN);
      const duration = Date.now() - startTime;

      if (!transcription || transcription.trim().length === 0) {
        return new Response(
          JSON.stringify({
            error: 'Aucune transcription',
            details: 'Le modèle n\'a pas retourné de texte. Parlez plus fort et plus longtemps (3-5 secondes).',
            duration,
            suggestion: 'Maintenez le bouton et parlez clairement.'
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`✅ STT Success in ${duration}ms: "${transcription.substring(0, 80)}"`);

      return new Response(
        JSON.stringify({
          transcription: transcription.trim(),
          confidence: 90,
          duration,
          language: 'bariba'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } catch (err: unknown) {
      const duration = Date.now() - startTime;
      const errMsg = err instanceof Error ? err.message : 'Erreur inconnue';
      console.error(`❌ STT Error after ${duration}ms: ${errMsg}`);

      const isSleeping = errMsg.includes('SPACE_SLEEPING') || errMsg.includes('503');
      const isModelError = errMsg.includes('Model error') || errMsg.includes('model error');

      return new Response(
        JSON.stringify({
          error: isSleeping ? 'Service en veille' : (isModelError ? 'Erreur du modèle' : 'Service STT Bariba indisponible'),
          details: isSleeping
            ? 'Le service HuggingFace se réveille. Réessayez dans 30 secondes.'
            : errMsg,
          duration,
          isWakingUp: isSleeping,
          suggestion: isSleeping
            ? 'Attendez 30 secondes puis réessayez.'
            : 'Réenregistrez avec un son plus clair.'
        }),
        { status: isSleeping ? 503 : 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error: unknown) {
    console.error('Fatal error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erreur STT', suggestion: 'Réessayez.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
