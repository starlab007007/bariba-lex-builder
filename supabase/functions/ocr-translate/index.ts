import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  normalizeBaribaText,
  safeJsonExtract,
  isInvalidUiLikeText,
  applyLocalBaribaCorrections,
} from "../_shared/bariba-linguistic-rules.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type OCRTranslateRequest = {
  image?: string;                    // rétrocompat (1 image)
  document?: string;                 // rétrocompat (PDF ou image base64)
  pages?: string[];                  // ✅ v2: pages PDF déjà converties en images (base64/dataURL)
  fileName?: string;
  targetLanguage?: "bariba" | "french";
  skipRefine?: boolean;
  translateMode?: "per_page" | "combined"; // défaut: per_page
};

type OCRPageResult = {
  page: number;
  extractedText: string;
  ocr_confidence: number;
  ocrNotes: string[];
};

function normalizeText(input: string): string {
  return normalizeBaribaText(input);
}

function detectDataUrl(input: string, fileName?: string): { dataUrl: string; mime: string } {
  const raw = (input || "").trim();

  // data URL déjà complet
  const dataMatch = raw.match(/^data:([^;]+);base64,(.+)$/s);
  if (dataMatch) {
    return { dataUrl: raw, mime: dataMatch[1] };
  }

  // Deviner mime par extension
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

function cleanOcrText(text: string): string {
  const t = normalizeText(text);
  if (!t) return "";
  if (isInvalidUiLikeText(t)) return "";
  return t;
}

function chunkTextForTranslation(text: string, maxLen = 2400): string[] {
  const clean = normalizeText(text);
  if (!clean) return [];

  if (clean.length <= maxLen) return [clean];

  const lines = clean.split(/\n+/).map((x) => x.trim()).filter(Boolean);
  const chunks: string[] = [];
  let current = "";

  for (const line of lines) {
    const next = current ? `${current}\n${line}` : line;
    if (next.length <= maxLen) {
      current = next;
    } else {
      if (current) chunks.push(current);

      if (line.length <= maxLen) {
        current = line;
      } else {
        // fallback: découpe brute d'une très longue ligne
        for (let i = 0; i < line.length; i += maxLen) {
          chunks.push(line.slice(i, i + maxLen));
        }
        current = "";
      }
    }
  }

  if (current) chunks.push(current);
  return chunks;
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function callVisionOcr(params: {
  lovableApiKey: string;
  dataUrl: string;
  targetLanguage: "bariba" | "french";
  pageNumber?: number;
}): Promise<{ extractedText: string; confidence: number; ocrNotes?: string[] }> {
  const { lovableApiKey, dataUrl, targetLanguage, pageNumber } = params;

  const systemPrompt = `You are a precise OCR extraction assistant.

Task:
1) Read all visible text from the provided image.
2) Return ONLY valid JSON.
3) Do NOT translate.
4) Preserve line breaks where possible (but valid JSON string).
5) If text is unreadable, return empty string and low confidence.

Expected JSON format:
{
  "extractedText": "exact text from image",
  "confidence": 0.0,
  "ocrNotes": ["optional note"]
}`;

  const userText =
    targetLanguage === "bariba"
      ? `Extract all visible text exactly as written (likely French source text). Return ONLY JSON.${pageNumber ? ` Page ${pageNumber}.` : ""}`
      : `Extract all visible text exactly as written (likely Bariba source text). Return ONLY JSON.${pageNumber ? ` Page ${pageNumber}.` : ""}`;

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

  const parsed = safeJsonExtract(String(content));
  if (parsed && typeof parsed === "object") {
    const extractedText = cleanOcrText(String((parsed as any).extractedText || ""));
    const confidence = Number.isFinite(Number((parsed as any).confidence))
      ? Math.max(0, Math.min(1, Number((parsed as any).confidence)))
      : extractedText
      ? 0.7
      : 0.2;

    const ocrNotes = Array.isArray((parsed as any).ocrNotes)
      ? (parsed as any).ocrNotes.map((x: unknown) => String(x))
      : undefined;

    return { extractedText, confidence, ocrNotes };
  }

  // fallback raw text si pas JSON
  const fallbackText = cleanOcrText(String(content || ""));
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
  let translation = normalizeText(String(data?.translation || ""));

  if (targetLanguage === "bariba" && translation) {
    translation = applyLocalBaribaCorrections(translation);
  }

  if (!translation || (targetLanguage === "bariba" && isInvalidUiLikeText(translation))) {
    throw new Error("byt5 translation returned invalid/empty text");
  }

  return {
    translation,
    confidence: typeof data?.confidence === "number" ? data.confidence : undefined,
    method: typeof data?.method === "string" ? data.method : "byt5-expert",
    refinement: data?.refinement,
    modelInfo: data?.modelInfo,
  };
}

async function translateLongText(params: {
  req: Request;
  text: string;
  targetLanguage: "bariba" | "french";
  skipRefine?: boolean;
}): Promise<{
  translation: string;
  confidence: number | null;
  method: string;
  chunks: number;
  refinements: unknown[];
  modelInfos: unknown[];
}> {
  const chunks = chunkTextForTranslation(params.text, 2400);

  if (chunks.length === 0) {
    return {
      translation: "",
      confidence: null,
      method: "none",
      chunks: 0,
      refinements: [],
      modelInfos: [],
    };
  }

  const translations: string[] = [];
  const confidences: number[] = [];
  const refinements: unknown[] = [];
  const modelInfos: unknown[] = [];
  const methods: string[] = [];

  for (let i = 0; i < chunks.length; i++) {
    const tr = await callByt5Translate({
      req: params.req,
      text: chunks[i],
      targetLanguage: params.targetLanguage,
      skipRefine: params.skipRefine,
    });

    translations.push(tr.translation);
    if (typeof tr.confidence === "number") confidences.push(tr.confidence);
    if (tr.refinement !== undefined) refinements.push(tr.refinement);
    if (tr.modelInfo !== undefined) modelInfos.push(tr.modelInfo);
    if (tr.method) methods.push(tr.method);

    // petite pause pour éviter burst
    if (i < chunks.length - 1) await sleep(120);
  }

  const avgConfidence =
    confidences.length > 0
      ? Number((confidences.reduce((a, b) => a + b, 0) / confidences.length).toFixed(2))
      : null;

  return {
    translation: translations.join("\n"),
    confidence: avgConfidence,
    method: methods[0] || "byt5-expert",
    chunks: chunks.length,
    refinements,
    modelInfos,
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
      pages = [],
      fileName,
      targetLanguage = "bariba",
      skipRefine = false,
      translateMode = "per_page",
    }: OCRTranslateRequest = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // ─────────────────────────────────────────────
    // V2 source detection
    // ─────────────────────────────────────────────
    let pageImages: string[] = [];

    if (Array.isArray(pages) && pages.length > 0) {
      // ✅ mode recommandé - accept both image and PDF dataURLs
      pageImages = pages.filter((p) => typeof p === "string" && p.trim().length > 0);
    } else {
      // rétrocompat 1 image / document
      const sourceData = image || document;
      if (!sourceData) throw new Error("No image, document, or pages[] provided");

      const { dataUrl } = detectDataUrl(sourceData, fileName);
      // Accept any format - Gemini Vision handles both images and PDFs
      pageImages = [dataUrl];
    }

    if (pageImages.length === 0) {
      throw new Error("pages[] is empty after filtering");
    }

    console.log("[ocr-translate-v2] Start OCR+Translate");
    console.log("[ocr-translate-v2] pages:", pageImages.length, "| target:", targetLanguage, "| mode:", translateMode);

    // ─────────────────────────────────────────────
    // 1) OCR page par page
    // ─────────────────────────────────────────────
    const ocrPages: OCRPageResult[] = [];

    for (let i = 0; i < pageImages.length; i++) {
      const ocr = await callVisionOcr({
        lovableApiKey: LOVABLE_API_KEY,
        dataUrl: pageImages[i],
        targetLanguage,
        pageNumber: i + 1,
      });

      ocrPages.push({
        page: i + 1,
        extractedText: ocr.extractedText,
        ocr_confidence: Number(ocr.confidence.toFixed(3)),
        ocrNotes: ocr.ocrNotes || [],
      });

      if (i < pageImages.length - 1) await sleep(150);
    }

    const extractedPages = ocrPages.filter((p) => p.extractedText.trim().length > 0);

    if (extractedPages.length === 0) {
      return new Response(
        JSON.stringify({
          extractedText: "",
          translation: "",
          extracted_pages: ocrPages,
          translated_pages: [],
          confidence: 0.15,
          ocr_confidence: 0.15,
          translation_confidence: null,
          page_count: pageImages.length,
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

    // ─────────────────────────────────────────────
    // 2) Translation (per_page ou combined)
    // ─────────────────────────────────────────────
    let translatedPages: Array<{
      page: number;
      translation: string;
      translation_confidence: number | null;
      method: string;
      chunks: number;
      refinement?: unknown[];
      modelInfo?: unknown[];
      fallback?: boolean;
      error?: string;
    }> = [];

    let finalTranslation = "";
    let translationConfList: number[] = [];
    let translationMethod = "none";
    let globalFallback = false;
    let allRefinements: unknown[] = [];
    let allModelInfos: unknown[] = [];

    if (translateMode === "combined") {
      const combinedExtracted = extractedPages
        .map((p) => `--- Page ${p.page} ---\n${p.extractedText}`)
        .join("\n\n");

      try {
        const tr = await translateLongText({
          req,
          text: combinedExtracted,
          targetLanguage,
          skipRefine,
        });

        finalTranslation = tr.translation;
        if (typeof tr.confidence === "number") translationConfList.push(tr.confidence);
        translationMethod = tr.method;
        allRefinements = tr.refinements;
        allModelInfos = tr.modelInfos;
      } catch (e) {
        globalFallback = true;
        finalTranslation = targetLanguage === "french" ? combinedExtracted : "";
        translationMethod = "fallback-ocr-only";
      }
    } else {
      // per_page (recommandé)
      for (const page of ocrPages) {
        if (!page.extractedText) {
          translatedPages.push({
            page: page.page,
            translation: "",
            translation_confidence: null,
            method: "none",
            chunks: 0,
            fallback: true,
            error: "No OCR text",
          });
          continue;
        }

        try {
          const tr = await translateLongText({
            req,
            text: page.extractedText,
            targetLanguage,
            skipRefine,
          });

          translatedPages.push({
            page: page.page,
            translation: tr.translation,
            translation_confidence: tr.confidence,
            method: tr.method,
            chunks: tr.chunks,
            refinement: tr.refinements,
            modelInfo: tr.modelInfos,
          });

          if (typeof tr.confidence === "number") translationConfList.push(tr.confidence);
          if (tr.method && translationMethod === "none") translationMethod = tr.method;
          allRefinements.push(...tr.refinements);
          allModelInfos.push(...tr.modelInfos);
        } catch (e) {
          const msg = e instanceof Error ? e.message : "Translation failed";
          globalFallback = true;

          translatedPages.push({
            page: page.page,
            translation: targetLanguage === "french" ? page.extractedText : "",
            translation_confidence: null,
            method: "fallback-ocr-only",
            chunks: 0,
            fallback: true,
            error: msg,
          });
        }

        await sleep(120);
      }

      finalTranslation = translatedPages
        .map((p) => (p.translation ? `--- Page ${p.page} ---\n${p.translation}` : `--- Page ${p.page} ---\n`))
        .join("\n\n");
    }

    // ─────────────────────────────────────────────
    // 3) Agrégation des confidences
    // ─────────────────────────────────────────────
    const avgOcr =
      ocrPages.length > 0
        ? Number((ocrPages.reduce((s, p) => s + p.ocr_confidence, 0) / ocrPages.length).toFixed(3))
        : 0;

    const avgTranslation =
      translationConfList.length > 0
        ? Number((translationConfList.reduce((s, v) => s + v, 0) / translationConfList.length).toFixed(2))
        : null;

    const combinedConfidence = Math.max(
      0,
      Math.min(
        1,
        avgOcr * 0.55 + (((avgTranslation ?? 70) / 100) * 0.45),
      ),
    );

    const extractedTextCombined = ocrPages
      .map((p) => (p.extractedText ? `--- Page ${p.page} ---\n${p.extractedText}` : `--- Page ${p.page} ---\n`))
      .join("\n\n");

    const result = {
      version: "v2",
      page_count: pageImages.length,

      // sortie globale (compat)
      extractedText: extractedTextCombined,
      translation: finalTranslation,

      // sortie détaillée v2
      extracted_pages: ocrPages,
      translated_pages: translatedPages,

      confidence: Number(combinedConfidence.toFixed(3)),
      ocr_confidence: avgOcr,
      translation_confidence: avgTranslation,
      targetLanguage,
      fallback: globalFallback,
      translation_method: translationMethod,
      translation_mode: translateMode,

      refinement: allRefinements.length ? allRefinements : undefined,
      modelInfo: allModelInfos.length ? allModelInfos : undefined,
      duration: Date.now() - startedAt,
    };

    console.log("[ocr-translate-v2] Success:", {
      pages: result.page_count,
      extractedPages: result.extracted_pages.filter((p) => p.extractedText).length,
      translatedPages: result.translated_pages.filter((p) => p.translation).length,
      fallback: result.fallback,
      method: result.translation_method,
    });

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("[ocr-translate-v2] Error:", error);

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
