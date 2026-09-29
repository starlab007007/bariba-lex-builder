// Espace — OCR Bàátɔ̀nú (étape « inférence IA » du pipeline).
// Entrée : { pages: string[] (data URL déjà prétraitées côté client), fileName?, mode?: 'printed'|'handwritten' }
// Sortie : { engine, text, confidence, pages: [{ page, text, confidence, notes[] }] }
// Auth : JWT Supabase obligatoire (verify_jwt = true).
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_PAGES = 12;
const MAX_DATA_URL = 8_000_000; // ~6 Mo d'image

const SYSTEM = `Tu es un moteur OCR spécialisé dans la langue Bàátɔ̀nú (Bariba, Bénin).
Transcris EXACTEMENT le texte visible, sans traduire, sans corriger le sens, sans résumer.
Alphabet à respecter (Unicode, forme NFC quand elle existe) :
- voyelles : a e i o u ; ouvertes : ɛ ɔ ; consonne : ŋ ; nasales : ã ĩ ũ õ ẽ ɛ̃ ɔ̃
- tons : grave ◌̀ (U+0300), aigu ◌́ (U+0301), tilde ◌̃ (U+0303), macron ◌̄ (U+0304)
- ne jamais remplacer ɛ par e ni ɔ par o ni ŋ par n ; ne pas supprimer les tons ; distinguer ɔ de o, ɛ de e, ŋ de η.
- conserve les sauts de ligne et les paragraphes ; les titres sur leur propre ligne.
- si un mot est illisible, écris [?] à sa place.
Réponds UNIQUEMENT en JSON : {"text":"...","confidence":0.0,"notes":["..."]} où confidence ∈ [0,1].`;

function extractJson(s: string): Record<string, unknown> | null {
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = (fence ? fence[1] : s).trim();
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(body.slice(start, end + 1));
  } catch {
    return null;
  }
}

// Post-traitement : NFC, espaces, artefacts d'OCR fréquents sur l'alphabet Bariba.
function cleanup(text: string): string {
  return text
    .normalize("NFC")
    .replace(/[​-‍﻿]/g, "")
    .replace(/η/g, "ŋ") // êta grec confondu avec ŋ
    .replace(/ɛ̃/g, "ɛ̃") // recompose ɛ̃
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function ocrPage(apiKey: string, dataUrl: string, page: number, mode: string) {
  const res = await fetch("https://api.mistral.ai/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "pixtral-large-latest",
      temperature: 0,
      max_tokens: 3000,
      messages: [
        { role: "system", content: SYSTEM },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Page ${page}. Type de document : ${mode === "handwritten" ? "manuscrit" : "imprimé/scanné"}. Retourne uniquement le JSON.`,
            },
            { type: "image_url", image_url: { url: dataUrl } },
          ],
        },
      ],
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Moteur OCR indisponible (${res.status}) ${body.slice(0, 160)}`);
  }
  const json = await res.json();
  const content = String(json?.choices?.[0]?.message?.content ?? "");
  const parsed = extractJson(content);
  if (parsed && typeof parsed.text === "string") {
    const text = cleanup(parsed.text);
    const c = Number(parsed.confidence);
    return {
      page,
      text,
      confidence: Number.isFinite(c) ? Math.min(1, Math.max(0, c)) : text ? 0.7 : 0.1,
      notes: Array.isArray(parsed.notes) ? parsed.notes.map(String).slice(0, 6) : [],
    };
  }
  const text = cleanup(content);
  return { page, text, confidence: text ? 0.45 : 0.1, notes: ["Réponse non structurée : texte brut utilisé."] };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  const json = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
  if (req.method !== "POST") return json(405, { error: "Méthode non autorisée" });

  try {
    const apiKey = Deno.env.get("MISTRAL_API_KEY");
    if (!apiKey) {
      return json(503, {
        error: "OCR_NOT_CONFIGURED",
        message: "Le moteur OCR n'est pas encore configuré côté serveur (secret MISTRAL_API_KEY).",
      });
    }
    const body = await req.json().catch(() => null);
    const pages: unknown = body?.pages;
    if (!Array.isArray(pages) || pages.length === 0) return json(400, { error: "Aucune page à traiter" });
    if (pages.length > MAX_PAGES) return json(400, { error: `Maximum ${MAX_PAGES} pages par requête` });
    const mode = body?.mode === "handwritten" ? "handwritten" : "printed";

    const results = [];
    for (let i = 0; i < pages.length; i++) {
      const url = String(pages[i] ?? "");
      if (!/^data:image\/(png|jpe?g|webp);base64,/i.test(url)) return json(400, { error: `Page ${i + 1} : image invalide` });
      if (url.length > MAX_DATA_URL) return json(413, { error: `Page ${i + 1} : image trop volumineuse` });
      results.push(await ocrPage(apiKey, url, i + 1, mode));
    }
    const text = results.map((r) => r.text).filter(Boolean).join("\n\n");
    const confidence = results.length
      ? results.reduce((a, r) => a + r.confidence, 0) / results.length
      : 0;
    return json(200, { engine: "pixtral-large-latest", text, confidence, pages: results });
  } catch (e) {
    console.error("espace-ocr", e);
    return json(500, { error: e instanceof Error ? e.message : "Erreur OCR" });
  }
});
