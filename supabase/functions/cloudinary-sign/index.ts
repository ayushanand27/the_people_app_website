import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const LIMITS = {
  maxBytes: 100 * 1024 * 1024,
  minDurationSec: 3,
  maxDurationSec: 120,
  allowedTypes: ["video/mp4", "video/quicktime", "video/webm", "video/mov"],
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function sha1Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-1", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const cloudName = Deno.env.get("CLOUDINARY_CLOUD_NAME");
  const apiKey = Deno.env.get("CLOUDINARY_API_KEY");
  const apiSecret = Deno.env.get("CLOUDINARY_API_SECRET");

  if (!cloudName || !apiKey || !apiSecret) {
    return jsonResponse({ error: "Cloudinary secrets not configured on server" }, 500);
  }

  // Require authenticated user
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

  let body: { fileSize?: number; duration?: number; fileType?: string };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  const { fileSize, duration, fileType } = body;

  if (typeof fileSize !== "number" || fileSize <= 0) {
    return jsonResponse({ error: "fileSize is required" }, 400);
  }
  if (typeof duration !== "number" || duration <= 0) {
    return jsonResponse({ error: "duration is required" }, 400);
  }
  if (!fileType || typeof fileType !== "string") {
    return jsonResponse({ error: "fileType is required" }, 400);
  }

  // Server-side validation
  if (fileSize > LIMITS.maxBytes) {
    return jsonResponse({ error: "Video must be under 100MB" }, 400);
  }
  if (duration < LIMITS.minDurationSec) {
    return jsonResponse({ error: `Video must be at least ${LIMITS.minDurationSec} seconds` }, 400);
  }
  if (duration > LIMITS.maxDurationSec) {
    return jsonResponse({ error: `Video must be under ${LIMITS.maxDurationSec} seconds` }, 400);
  }
  const typeOk =
    LIMITS.allowedTypes.includes(fileType) || fileType.startsWith("video/");
  if (!typeOk) {
    return jsonResponse({ error: "Please upload MP4, MOV, or WebM" }, 400);
  }

  const timestamp = Math.round(Date.now() / 1000);
  const folder = `moments/${user.id}`;

  // Cloudinary signed upload: sign all params except file, cloud_name, resource_type, api_key
  const paramsToSign: Record<string, string | number> = {
    folder,
    timestamp,
  };

  const sorted = Object.keys(paramsToSign)
    .sort()
    .map((k) => `${k}=${paramsToSign[k]}`)
    .join("&");

  const signature = await sha1Hex(sorted + apiSecret);

  return jsonResponse({
    cloudName,
    apiKey,
    timestamp,
    signature,
    folder,
    resourceType: "video",
  });
});
