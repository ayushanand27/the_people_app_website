import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const MAX_CONTEXT_LENGTH = 2000;
const MAX_IMAGE_URL_LENGTH = 2048;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function fallbackIcebreaker(context: string) {
  return `Hey! Nice to connect — what got you interested in ${context}?`;
}

const MODERATION_SYSTEM = `You are a content moderator for The People App (city social + chat).
Flag messages that clearly involve: harassment, threats, hate speech, sexual solicitation, explicit sexual content, scams, or spam.
Respond with JSON only: {"flagged": boolean, "reason": string}
Be conservative on casual slang — only flag clear abuse. Empty reason if not flagged.`;

async function callGroq(context: string, apiKey: string): Promise<string | null> {
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "llama-3.1-8b-instant",
      messages: [
        { role: "system", content: "You generate short, friendly social icebreakers. One sentence only." },
        { role: "user", content: `Create one icebreaker line about: ${context}` },
      ],
      max_tokens: 40,
      temperature: 0.8,
    }),
  });
  if (!response.ok) return null;
  const data = await response.json();
  return data.choices?.[0]?.message?.content?.trim() || null;
}

async function callOpenAI(context: string, apiKey: string): Promise<string | null> {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You generate short, friendly social icebreakers. One sentence only." },
        { role: "user", content: `Create one icebreaker line about: ${context}` },
      ],
      max_tokens: 40,
      temperature: 0.8,
    }),
  });
  if (!response.ok) return null;
  const data = await response.json();
  return data.choices?.[0]?.message?.content?.trim() || null;
}

async function callGroqModerate(text: string, apiKey: string): Promise<{ flagged: boolean; reason: string } | null> {
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "llama-3.1-8b-instant",
      messages: [
        { role: "system", content: MODERATION_SYSTEM },
        { role: "user", content: text },
      ],
      max_tokens: 80,
      temperature: 0,
      response_format: { type: "json_object" },
    }),
  });
  if (!response.ok) return null;
  const data = await response.json();
  const raw = data.choices?.[0]?.message?.content?.trim();
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return { flagged: Boolean(parsed.flagged), reason: String(parsed.reason || "") };
  } catch {
    return null;
  }
}

async function callOpenAIModerate(text: string, apiKey: string): Promise<{ flagged: boolean; reason: string } | null> {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: MODERATION_SYSTEM },
        { role: "user", content: text },
      ],
      max_tokens: 80,
      temperature: 0,
      response_format: { type: "json_object" },
    }),
  });
  if (!response.ok) return null;
  const data = await response.json();
  const raw = data.choices?.[0]?.message?.content?.trim();
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return { flagged: Boolean(parsed.flagged), reason: String(parsed.reason || "") };
  } catch {
    return null;
  }
}

/** OpenAI multimodal moderation for chat images */
async function callOpenAIModerateImage(
  imageUrl: string,
  apiKey: string,
): Promise<{ flagged: boolean; reason: string } | null> {
  const response = await fetch("https://api.openai.com/v1/moderations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "omni-moderation-latest",
      input: [
        {
          type: "image_url",
          image_url: { url: imageUrl },
        },
      ],
    }),
  });
  if (!response.ok) return null;
  const data = await response.json();
  const result = data?.results?.[0];
  if (!result) return null;
  if (!result.flagged) return { flagged: false, reason: "" };

  const cats = result.categories || {};
  const reasons = Object.keys(cats).filter((k) => cats[k]);
  return {
    flagged: true,
    reason: reasons.length ? `Image flagged: ${reasons.join(", ")}` : "Image flagged as unsafe",
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    { global: { headers: { Authorization: authHeader } } },
  );

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  let body: { type?: string; context?: string; imageUrl?: string };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  const { type, context, imageUrl } = body;

  if (!type || typeof type !== "string") {
    return jsonResponse({ error: "type is required" }, 400);
  }

  if (type !== "icebreaker" && type !== "moderate_content" && type !== "moderate_image") {
    return jsonResponse({ error: "Invalid type" }, 400);
  }

  const groqKey = Deno.env.get("GROQ_API_KEY");
  const openaiKey = Deno.env.get("OPENAI_API_KEY");

  // ── Image moderation ──────────────────────────────────────────────────────
  if (type === "moderate_image") {
    if (!imageUrl || typeof imageUrl !== "string" || !imageUrl.trim()) {
      return jsonResponse({ error: "imageUrl is required" }, 400);
    }
    const url = imageUrl.trim();
    if (url.length > MAX_IMAGE_URL_LENGTH) {
      return jsonResponse({ error: "imageUrl too long" }, 400);
    }
    if (!/^https:\/\//i.test(url)) {
      return jsonResponse({ error: "imageUrl must be https" }, 400);
    }

    if (!openaiKey) {
      return jsonResponse({
        flagged: true,
        reason: "Image safety check unavailable",
        source: "unavailable",
      });
    }

    const result = await callOpenAIModerateImage(url, openaiKey);
    if (!result) {
      return jsonResponse({
        flagged: true,
        reason: "Image safety check failed. Try again later.",
        source: "error",
      });
    }
    return jsonResponse({ flagged: result.flagged, reason: result.reason, source: "openai" });
  }

  if (!context || typeof context !== "string" || !context.trim()) {
    return jsonResponse({ error: "context is required and cannot be empty" }, 400);
  }

  const trimmedContext = context.trim();
  if (trimmedContext.length > MAX_CONTEXT_LENGTH) {
    return jsonResponse({ error: `context must be under ${MAX_CONTEXT_LENGTH} characters` }, 400);
  }

  if (type === "moderate_content") {
    if (!groqKey && !openaiKey) {
      return jsonResponse({ flagged: false, source: "fallback" });
    }

    let result: { flagged: boolean; reason: string } | null = null;
    let source = "fallback";

    if (groqKey) {
      result = await callGroqModerate(trimmedContext, groqKey);
      if (result) source = "groq";
    }
    if (!result && openaiKey) {
      result = await callOpenAIModerate(trimmedContext, openaiKey);
      if (result) source = "openai";
    }

    if (!result) {
      return jsonResponse({ flagged: false, source: "fallback" });
    }

    return jsonResponse({ flagged: result.flagged, reason: result.reason, source });
  }

  if (!groqKey && !openaiKey) {
    return jsonResponse({ text: fallbackIcebreaker(trimmedContext), source: "fallback" });
  }

  let text: string | null = null;
  let source = "fallback";

  if (groqKey) {
    text = await callGroq(trimmedContext, groqKey);
    if (text) source = "groq";
  }

  if (!text && openaiKey) {
    text = await callOpenAI(trimmedContext, openaiKey);
    if (text) source = "openai";
  }

  if (!text) {
    return jsonResponse({ text: fallbackIcebreaker(trimmedContext), source: "fallback" });
  }

  return jsonResponse({ text, source });
});
