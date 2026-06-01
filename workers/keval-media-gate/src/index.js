import { mediaCatalog, mediaCatalogRecordCount } from "./catalog.manifest.js";

const DEFAULT_ALLOWED_ORIGINS = "https://app.kevalsound.com";
const TOKEN_CLOCK_SKEW_SECONDS = 60;
const MAX_TTL_SECONDS = {
  "wav-stream": 4 * 60 * 60,
  "wav-download": 15 * 60,
};

const ROUTE_ACCESS = {
  stream: "wav-stream",
  download: "wav-download",
};

const mediaGateWorker = {
  async fetch(request, env) {
    return handleRequest(request, env);
  },
};

export default mediaGateWorker;

async function handleRequest(request, env) {
  const url = new URL(request.url);
  const corsHeaders = buildCorsHeaders(request, env);

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (url.pathname === "/health") {
    return json(
      {
        ok: true,
        service: "keval-media-gate",
        wavRecords: mediaCatalogRecordCount,
      },
      200,
      corsHeaders
    );
  }

  if (request.method !== "GET" && request.method !== "HEAD") {
    return json({ error: "method_not_allowed" }, 405, {
      ...corsHeaders,
      Allow: "GET, HEAD, OPTIONS",
    });
  }

  const match = url.pathname.match(/^\/v1\/wav\/(stream|download)\/([^/]+)$/);
  if (!match) {
    return json({ error: "not_found" }, 404, corsHeaders);
  }

  const mode = match[1];
  const trackId = decodePathPart(match[2]);
  const expectedAccess = ROUTE_ACCESS[mode];
  const record = mediaCatalog[trackId];

  if (!record) {
    return json({ error: "track_not_found" }, 404, corsHeaders);
  }

  if (!record.wavPath?.startsWith("private/wav/")) {
    return json({ error: "media_path_not_allowed" }, 500, corsHeaders);
  }

  const authorization = await authorizeRequest(request, env, trackId, expectedAccess);
  if (!authorization.ok) {
    return json({ error: authorization.error }, authorization.status, corsHeaders);
  }

  return serveR2Wav(request, env, record, mode, corsHeaders);
}

async function authorizeRequest(request, env, trackId, expectedAccess) {
  const secret = env.MEDIA_GATE_SIGNING_SECRET;
  if (!secret) {
    return { ok: false, status: 500, error: "media_gate_secret_missing" };
  }

  const token = extractToken(request);
  if (!token) {
    return { ok: false, status: 401, error: "missing_token" };
  }

  const verification = await verifyToken(token, secret, trackId, expectedAccess);
  if (!verification.ok) {
    return { ok: false, status: 403, error: verification.error };
  }

  return { ok: true, payload: verification.payload };
}

function extractToken(request) {
  const authorization = request.headers.get("Authorization");
  if (authorization?.toLowerCase().startsWith("bearer ")) {
    return authorization.slice("bearer ".length).trim();
  }

  const url = new URL(request.url);
  return url.searchParams.get("token");
}

async function verifyToken(token, secret, expectedTrackId, expectedAccess) {
  const parts = token.split(".");
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    return { ok: false, error: "invalid_token_format" };
  }

  const [payloadPart, signaturePart] = parts;
  const expectedSignature = await signHmac(payloadPart, secret);
  if (!timingSafeEqual(base64UrlDecode(signaturePart), base64UrlDecode(expectedSignature))) {
    return { ok: false, error: "invalid_token_signature" };
  }

  let payload;
  try {
    payload = JSON.parse(textDecode(base64UrlDecode(payloadPart)));
  } catch {
    return { ok: false, error: "invalid_token_payload" };
  }

  if (payload.trackId !== expectedTrackId) {
    return { ok: false, error: "token_track_mismatch" };
  }

  if (payload.access !== expectedAccess) {
    return { ok: false, error: "token_access_mismatch" };
  }

  if (typeof payload.iat !== "number" || typeof payload.exp !== "number") {
    return { ok: false, error: "token_time_invalid" };
  }

  const now = Math.floor(Date.now() / 1000);
  if (payload.iat > now + TOKEN_CLOCK_SKEW_SECONDS) {
    return { ok: false, error: "token_issued_in_future" };
  }

  if (payload.exp <= now) {
    return { ok: false, error: "token_expired" };
  }

  const maxTtl = MAX_TTL_SECONDS[expectedAccess];
  if (payload.exp - payload.iat > maxTtl + TOKEN_CLOCK_SKEW_SECONDS) {
    return { ok: false, error: "token_ttl_too_long" };
  }

  return { ok: true, payload };
}

async function serveR2Wav(request, env, record, mode, corsHeaders) {
  if (!env.KEVAL_SOUND_BUCKET) {
    return json({ error: "r2_binding_missing" }, 500, corsHeaders);
  }

  if (request.method === "HEAD") {
    const head = await env.KEVAL_SOUND_BUCKET.head(record.wavPath);
    if (!head) {
      return json({ error: "object_not_found" }, 404, corsHeaders);
    }

    const headers = buildMediaHeaders(head, record, mode, corsHeaders);
    return new Response(null, { status: 200, headers });
  }

  const object = await env.KEVAL_SOUND_BUCKET.get(record.wavPath, {
    range: request.headers,
  });

  if (!object) {
    return json({ error: "object_not_found" }, 404, corsHeaders);
  }

  const headers = buildMediaHeaders(object, record, mode, corsHeaders);
  const status = setRangeHeaders(headers, object);
  return new Response(object.body, { status, headers });
}

function buildMediaHeaders(object, record, mode, corsHeaders) {
  const headers = new Headers(corsHeaders);
  headers.set("Content-Type", "audio/wav");
  headers.set("Accept-Ranges", "bytes");
  headers.set("Cache-Control", "private, no-store, max-age=0");
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Cross-Origin-Resource-Policy", "same-site");

  if (object.httpEtag) {
    headers.set("ETag", object.httpEtag);
  }

  if (typeof object.size === "number") {
    headers.set("Content-Length", String(object.size));
  }

  const filename = toSafeFilename(`${record.title}.wav`);
  const disposition = mode === "download" ? "attachment" : "inline";
  headers.set("Content-Disposition", `${disposition}; filename="${filename}"`);

  return headers;
}

function setRangeHeaders(headers, object) {
  if (!object.range || typeof object.range.offset !== "number" || typeof object.range.length !== "number") {
    return 200;
  }

  const start = object.range.offset;
  const end = start + object.range.length - 1;
  headers.set("Content-Range", `bytes ${start}-${end}/${object.size}`);
  headers.set("Content-Length", String(object.range.length));
  return 206;
}

function buildCorsHeaders(request, env) {
  const origin = request.headers.get("Origin");
  const allowedOrigins = String(env.ALLOWED_ORIGINS || DEFAULT_ALLOWED_ORIGINS)
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  const headers = new Headers({
    "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Range, Content-Type",
    "Access-Control-Expose-Headers": "Accept-Ranges, Content-Length, Content-Range, ETag",
    Vary: "Origin",
  });

  if (allowedOrigins.includes("*")) {
    headers.set("Access-Control-Allow-Origin", "*");
  } else if (origin && allowedOrigins.includes(origin)) {
    headers.set("Access-Control-Allow-Origin", origin);
  } else if (!origin && allowedOrigins[0]) {
    headers.set("Access-Control-Allow-Origin", allowedOrigins[0]);
  }

  return headers;
}

function json(body, status, headers = {}) {
  const responseHeaders = new Headers(headers);
  responseHeaders.set("Content-Type", "application/json; charset=utf-8");
  responseHeaders.set("Cache-Control", "no-store");
  return new Response(JSON.stringify(body), { status, headers: responseHeaders });
}

async function signHmac(payloadPart, secret) {
  const key = await crypto.subtle.importKey(
    "raw",
    textEncode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, textEncode(payloadPart));
  return base64UrlEncode(new Uint8Array(signature));
}

function timingSafeEqual(left, right) {
  if (left.length !== right.length) {
    return false;
  }

  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left[index] ^ right[index];
  }

  return difference === 0;
}

function base64UrlDecode(value) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function base64UrlEncode(bytes) {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function textEncode(value) {
  return new TextEncoder().encode(value);
}

function textDecode(bytes) {
  return new TextDecoder().decode(bytes);
}

function decodePathPart(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function toSafeFilename(value) {
  return value.replace(/[^a-z0-9._ -]/gi, "_").replace(/"/g, "");
}
