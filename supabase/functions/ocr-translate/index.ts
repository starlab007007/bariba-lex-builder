import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { image, document, fileName, targetLanguage = 'bariba' } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const imageData = image || document;
    if (!imageData) {
      throw new Error("No image or document provided");
    }

    console.log('[ocr-translate] Processing image/document for OCR');
    console.log('[ocr-translate] Target language:', targetLanguage);

    // Determine source and target languages based on targetLanguage
    const sourceLang = targetLanguage === 'bariba' ? 'French' : 'Bariba';
    const targetLang = targetLanguage === 'bariba' ? 'Bariba' : 'French';

    // Use Gemini Vision for OCR + Translation in one call
    const systemPrompt = `You are an expert OCR and translation assistant specialized in French and Bariba languages.
    
Your task:
1. Extract ALL text visible in the image
2. Translate the extracted text from ${sourceLang} to ${targetLang}

Bariba is a Gur language spoken in Benin, Nigeria, and Togo. Here are some translation examples:
- Bonjour = A barka wásùn (morning) / A barka yíròn (afternoon)
- Merci = A báà sɔ̀ɔ́n
- Comment allez-vous? = Àlàfíyà? 
- Eau = níí
- Nourriture = dòǹ
- Maison = kpààrù
- Santé = làáfíyá
- Argent = kɔ́bù
- Travail = bàárá

IMPORTANT: Return ONLY a JSON object with this exact format:
{
  "extractedText": "the original text found in the image",
  "translation": "the translation to ${targetLang}",
  "confidence": 0.85
}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { 
            role: "user", 
            content: [
              { 
                type: "text", 
                text: `Extract all text from this image and translate it to ${targetLang}. Return ONLY a JSON object.`
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${imageData}`
                }
              }
            ]
          }
        ],
        max_tokens: 2000,
        temperature: 0.3
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limits exceeded, please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required, please add funds." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error('[ocr-translate] AI gateway error:', response.status, errorText);
      throw new Error("AI gateway error");
    }

    const aiResult = await response.json();
    const content = aiResult.choices?.[0]?.message?.content || '';
    
    console.log('[ocr-translate] AI response:', content);

    // Parse the JSON response
    let result;
    try {
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        // Fallback: treat the whole content as text
        result = {
          extractedText: content,
          translation: content,
          confidence: 0.5
        };
      }
    } catch (parseError) {
      console.error('[ocr-translate] JSON parse error:', parseError);
      result = {
        extractedText: content,
        translation: content,
        confidence: 0.5
      };
    }

    console.log('[ocr-translate] Result:', result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error('[ocr-translate] Error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Unknown error",
      extractedText: "",
      translation: ""
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
