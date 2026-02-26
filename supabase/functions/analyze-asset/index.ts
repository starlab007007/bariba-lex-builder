import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const IMAGE_SYSTEM_PROMPT = `You are an expert image classifier for an African storytelling app.
Analyze the image and classify it using ONLY these exact values.

Taxonomy:
- style: african, fantasy, manga, chibi
- emotion: joy, sadness, wonder, fear, excitement, peace, tension
- scene_type: village, forest, river, mountain, market, home, night, journey, gathering, spirit
- character_type: child_boy, child_girl, elder, animal, spirit, group
- action: standing, walking, talking, dancing, working, sleeping, running, discovering
- time_of_day: day, night, dawn, dusk

You MUST respond by calling the classify_image function with your analysis.`;

const MUSIC_SYSTEM_PROMPT = `You are an expert music classifier for an African storytelling app.
Based on the filename and audio metadata, suggest classification using ONLY these exact values.

Taxonomy:
- category: traditional, educational, ambient, celebration, nature
- mood: energetic, calm, joyful, reflective, motivating

Also suggest:
- title: clean human-readable title
- artist: artist name if detectable
- tags: array of relevant tags (max 5)

You MUST respond by calling the classify_music function with your analysis.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const body = await req.json();
    const { type } = body;

    let messages: any[];
    let tools: any[];

    if (type === "image") {
      const { imageBase64 } = body;
      if (!imageBase64) throw new Error("imageBase64 required for image type");

      messages = [
        { role: "system", content: IMAGE_SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: { url: imageBase64 },
            },
            {
              type: "text",
              text: "Analyze this image and classify it for our African storytelling library.",
            },
          ],
        },
      ];

      tools = [
        {
          type: "function",
          function: {
            name: "classify_image",
            description: "Classify an image with style, emotion, scene, character, action, time of day, and descriptions.",
            parameters: {
              type: "object",
              properties: {
                style: { type: "string", enum: ["african", "fantasy", "manga", "chibi"] },
                emotion: { type: "string", enum: ["joy", "sadness", "wonder", "fear", "excitement", "peace", "tension"] },
                scene_type: { type: "string", enum: ["village", "forest", "river", "mountain", "market", "home", "night", "journey", "gathering", "spirit"] },
                character_type: { type: "string", enum: ["child_boy", "child_girl", "elder", "animal", "spirit", "group"] },
                action: { type: "string", enum: ["standing", "walking", "talking", "dancing", "working", "sleeping", "running", "discovering"] },
                time_of_day: { type: "string", enum: ["day", "night", "dawn", "dusk"], description: "Time of day: day for daytime scenes, night for nighttime, dawn for sunrise, dusk for sunset" },
                description_en: { type: "string", description: "Short English description of the image (max 100 chars)" },
                description_fr: { type: "string", description: "Short French description of the image (max 100 chars)" },
                confidence: { type: "number", description: "Confidence score 0-1" },
              },
              required: ["style", "emotion", "scene_type", "character_type", "action", "time_of_day", "description_en", "description_fr", "confidence"],
              additionalProperties: false,
            },
          },
        },
      ];
    } else if (type === "music") {
      const { filename, duration } = body;
      if (!filename) throw new Error("filename required for music type");

      messages = [
        { role: "system", content: MUSIC_SYSTEM_PROMPT },
        {
          role: "user",
          content: `Analyze this music file and suggest classification:\n\nFilename: "${filename}"\nDuration: ${duration || "unknown"} seconds\n\nDetect the title, artist, category, mood, and relevant tags.`,
        },
      ];

      tools = [
        {
          type: "function",
          function: {
            name: "classify_music",
            description: "Classify a music track with title, artist, category, mood, and tags.",
            parameters: {
              type: "object",
              properties: {
                title: { type: "string", description: "Clean title of the track" },
                artist: { type: "string", description: "Artist name or 'Unknown'" },
                category: { type: "string", enum: ["traditional", "educational", "ambient", "celebration", "nature"] },
                mood: { type: "string", enum: ["energetic", "calm", "joyful", "reflective", "motivating"] },
                tags: { type: "array", items: { type: "string" }, description: "Up to 5 relevant tags" },
                description_fr: { type: "string", description: "Short French description (max 80 chars)" },
                confidence: { type: "number", description: "Confidence score 0-1" },
              },
              required: ["title", "artist", "category", "mood", "tags", "confidence"],
              additionalProperties: false,
            },
          },
        },
      ];
    } else {
      throw new Error(`Unknown type: ${type}. Expected "image" or "music".`);
    }

    console.log(`[analyze-asset] Analyzing ${type}...`);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages,
        tools,
        tool_choice: {
          type: "function",
          function: { name: type === "image" ? "classify_image" : "classify_music" },
        },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`[analyze-asset] AI gateway error ${response.status}:`, errText);

      // For 402/429, return empty suggestions gracefully instead of erroring
      if (response.status === 402 || response.status === 429) {
        console.warn(`[analyze-asset] AI unavailable (${response.status}), returning empty suggestions`);
        return new Response(JSON.stringify({ suggestions: {}, warning: response.status === 402 ? "credits_exhausted" : "rate_limited" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      throw new Error(`AI gateway returned ${response.status}`);
    }

    const data = await response.json();
    console.log("[analyze-asset] AI response received");

    // Extract tool call arguments
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      console.error("[analyze-asset] No tool call in response:", JSON.stringify(data));
      throw new Error("AI did not return structured classification");
    }

    let suggestions: Record<string, any>;
    try {
      suggestions = typeof toolCall.function.arguments === "string"
        ? JSON.parse(toolCall.function.arguments)
        : toolCall.function.arguments;
    } catch {
      console.error("[analyze-asset] Failed to parse tool arguments:", toolCall.function.arguments);
      throw new Error("Failed to parse AI classification");
    }

    console.log("[analyze-asset] Suggestions:", JSON.stringify(suggestions));

    return new Response(JSON.stringify({ suggestions }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[analyze-asset] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Analysis failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
