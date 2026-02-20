import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type OCRTranslateRequest = {
  image?: string;
  document?: string;
  fileName?: string;
  targetLanguage?: "bariba" | "french";
  skipRefine?: boolean;
};

function normalizeText(input: string): string {
  return (input || "").normalize("NFC").replace(/\s+/g, " ").trim();
}

function safeJsonExtract(text: string): any | null {
  if (!text) return null;

  const cleaned = text
    .replace(/```json/gi, "```")
    .replace(/```/g, "")
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    // continue
  }

  const match = cleaned.match(/\{[\s\S]*\}/);
  if (!match) return null;

  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

function detectDataUrl(input: string, fileName?: string): { dataUrl: string; mime: string } {
  const raw = (input || "").trim();

  // If already data URL
  const dataMatch = raw.match(/^data:([^;]+);base64,(.+)$/s);
  if (dataMatch) {
    return { dataUrl: raw, mime: dataMatch[1] };
  }

  // Guess mime from filename
  const lower = (fileName || "").toLowerCase();
  let mime = "image/jpeg";
  if (lower.endsWith(".png")) mime = "image/png";
  else if (lower.endsWith(".webp")) mime = "image/webp";
  else if (lower.endsWith(".gif")) mime = "image/gif";
  else if (lower.endsWith(".pdf")) mime = "application/pdf";

  return { dataUrl: `data:${mime};base64,${raw}`, mime };
}

function isLikelyPdf(mime: string, fileName?: string): boolean {
  return mime === "application/pdf" || (fileName || "").toLowerCase().endsWith(".pdf");
}

async function callVisionOcr(params: {
  lovableApiKey: string;
  dataUrl: string;
  targetLanguage: "bariba" | "french";
  isPdf: boolean;
}): Promise<{ extractedText: string; confidence: number; ocrNotes?: string[] }> {
  const { lovableApiKey, dataUrl, targetLanguage, isPdf } = params;

  // IMPORTANT: OCR only (translation handled by byt5 pipeline after)
  const systemPrompt = `You are a precise OCR extraction assistant.

Task:
1) Read all visible text from the provided ${isPdf ? "document page/image" : "image"}.
2) Return ONLY valid JSON.
3) Do NOT translate.
4) Preserve line breaks where possible.
5) If text is unreadable, return empty string and low confidence.

Expected JSON format:
{
  "extractedText": "exact text from image",
  "confidence": 0.0,
  "ocrNotes": ["optional note"]
}`;

  const userText =
    targetLanguage === "bariba"
      ? "Extract all visible text exactly as written (likely French source text). Return ONLY JSON."
      : "Extract all visible text exactly as written (likely Bariba source text). Return ONLY JSON.";

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${lovableApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: [
            { type: "text", text: userText },
            {
              type: "image_url",
              image_url: { url: dataUrl },
            },
          ],
        },
      ],
      max_tokens: 2200,
      temperature: 0.1,
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`OCR AI gateway error (${response.status}): ${body.substring(0, 200)}`);
  }

  const aiResult = await response.json();
  const content = aiResult?.choices?.[0]?.message?.content || "";
  console.log("[ocr-translate] OCR raw response:", String(content).substring(0, 500));

  const parsed = safeJsonExtract(content);
  if (parsed && typeof parsed === "object") {
    const extractedText = normalizeText(String(parsed.extractedText || ""));
    const confidence = Number.isFinite(Number(parsed.confidence))
      ? Math.max(0, Math.min(1, Number(parsed.confidence)))
      : extractedText
      ? 0.7
      : 0.2;

    const ocrNotes = Array.isArray(parsed.ocrNotes)
      ? parsed.ocrNotes.map((x: unknown) => String(x))
      : undefined;

    return { extractedText, confidence, ocrNotes };
  }

  // Fallback: use raw content as extracted text if not JSON
  const fallbackText = normalizeText(String(content || ""));
  return {
    extractedText: fallbackText,
    confidence: fallbackText ? 0.45 : 0.1,
    ocrNotes: ["OCR response was not valid JSON; raw text fallback used."],
  };
}

async function callByt5Translate(params: {
  req: Request;
  text: string;
  targetLanguage: "bariba" | "french";
  skipRefine?: boolean;
}): Promise<{
  translation: string;
  confidence?: number;
  method?: string;
  refinement?: unknown;
  modelInfo?: unknown;
}> {
  const { req, text, targetLanguage, skipRefine = false } = params;

  const supabaseUrl = Deno.env.get("SUPABASE_URL") || req.headers.get("x-supabase-url") || "";
  const supabaseAnon = Deno.env.get("SUPABASE_ANON_KEY") || req.headers.get("apikey") || "";

  if (!supabaseUrl || !supabaseAnon) {
    throw new Error("SUPABASE_URL / SUPABASE_ANON_KEY not configured for translation");
  }

  const sourceLang = targetLanguage === "bariba" ? "french" : "bariba";
  const targetLang = targetLanguage === "bariba" ? "bariba" : "french";

  const resp = await fetch(`${supabaseUrl}/functions/v1/byt5-bariba-translate`, {
    method: "POST",
    headers: {
      Authorization: req.headers.get("Authorization") || `Bearer ${supabaseAnon}`,
      apikey: req.headers.get("apikey") || supabaseAnon,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text,
      sourceLang,
      targetLang,
      mode: "quality",
      advanced: true,
      skipRefine,
    }),
  });

  if (!resp.ok) {
    const body = await resp.text().catch(() => "");
    throw new Error(`byt5 translation failed (${resp.status}): ${body.substring(0, 200)}`);
  }

  const data = await resp.json();
  const translation = normalizeText(String(data?.translation || ""));

  if (!translation) {
    throw new Error("byt5 translation returned empty text");
  }

  return {
    translation,
    confidence: typeof data?.confidence === "number" ? data.confidence : undefined,
    method: typeof data?.method === "string" ? data.method : "byt5-expert",
    refinement: data?.refinement,
    modelInfo: data?.modelInfo,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const startedAt = Date.now();

    const {
      image,
      document,
      fileName,
      targetLanguage = "bariba",
      skipRefine = false,
    }: OCRTranslateRequest = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const sourceData = image || document;
    if (!sourceData) {
      throw new Error("No image or document provided");
    }

    const { dataUrl, mime } = detectDataUrl(sourceData, fileName);
    const pdfMode = isLikelyPdf(mime, fileName);

    console.log("[ocr-translate] Start OCR+Translate");
    console.log("[ocr-translate] targetLanguage:", targetLanguage, "| mime:", mime, "| pdf:", pdfMode);

    // 1) OCR extraction
    const ocr = await callVisionOcr({
      lovableApiKey: LOVABLE_API_KEY,
      dataUrl,
      targetLanguage,
      isPdf: pdfMode,
    });

    if (!ocr.extractedText) {
      return new Response(
        JSON.stringify({
          extractedText: "",
          translation: "",
          confidence: 0.15,
          ocr_confidence: ocr.confidence,
          error: "Aucun texte lisible détecté",
          fallback: true,
          duration: Date.now() - startedAt,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // 2) Translation through patched ByT5 pipeline
    let translation = "";
    let translationConfidence: number | undefined;
    let translationMethod = "none";
    let refinement: unknown = undefined;
    let modelInfo: unknown = undefined;
    let fallback = false;

    try {
      const tr = await callByt5Translate({
        req,
        text: ocr.extractedText,
        targetLanguage,
        skipRefine,
      });

      translation = tr.translation;
      translationConfidence = tr.confidence;
      translationMethod = tr.method || "byt5-expert";
      refinement = tr.refinement;
      modelInfo = tr.modelInfo;
    } catch (translateErr) {
      // Fallback: if target is french, OCR text may already be usable
      // If target is bariba and translation fails, return OCR only + fallback=true
      console.warn("[ocr-translate] Translation fallback:", translateErr);

      fallback = true;
      translationMethod = "fallback-ocr-only";

      if (targetLanguage === "french") {
        translation = ocr.extractedText;
      } else {
        translation = ""; // avoid pretending OCR raw French is Bariba
      }
    }

    const combinedConfidence = Math.max(
      0,
      Math.min(
        1,
        (ocr.confidence * 0.55) +
          (((translationConfidence ?? 70) / 100) * 0.45),
      ),
    );

    const result = {
      extractedText: ocr.extractedText,
      translation,
      confidence: Number(combinedConfidence.toFixed(3)),
      ocr_confidence: Number(ocr.confidence.toFixed(3)),
      translation_confidence: translationConfidence ?? null,
      targetLanguage,
      fallback,
      translation_method: translationMethod,
      refinement,
      modelInfo,
      ocrNotes: ocr.ocrNotes || [],
      duration: Date.now() - startedAt,
    };

    console.log("[ocr-translate] Success:", {
      extractedLen: result.extractedText.length,
      translatedLen: result.translation.length,
      fallback: result.fallback,
      method: result.translation_method,
    });

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("[ocr-translate] Error:", error);

    const message = error instanceof Error ? error.message : "Unknown error";
    const status =
      message.includes("429") ? 429 :
      message.includes("402") ? 402 :
      message.toLowerCase().includes("timeout") ? 504 : 500;

    return new Response(
      JSON.stringify({
        error: message,
        extractedText: "",
        translation: "",
        confidence: 0,
      }),
      {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
