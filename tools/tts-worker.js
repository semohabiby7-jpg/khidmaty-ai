// Scan Macaron AI — الصوت الطبيعي السحابي (edge-tts proxy على Cloudflare Worker)
// مجاني 100% — بلا مفتاح، بلا فاتورة. أصوات Microsoft Neural العربية.
// مسموح بس لـ khidmatyai.com (منع الإساءة).
// GET /tts?text=...&voice=ar-EG-ShakirNeural&rate=-8%  → audio/mpeg
// POST /v1/audio/speech (متوافق OpenAI): {input, voice, speed}

const ALLOW_ORIGIN = 'https://khidmatyai.com';
const DEFAULT_VOICE = 'ar-EG-ShakirNeural'; // راجل مصري
const TOKEN_REFRESH_BEFORE_EXPIRY = 3 * 60;
let tokenInfo = { endpoint: null, token: null, expiredAt: null };

addEventListener("fetch", event => event.respondWith(handleRequest(event.request)));

function corsHeaders(origin) {
  return {
    "Access-Control-Allow-Origin": ALLOW_ORIGIN,
    "Access-Control-Allow-Methods": "GET,HEAD,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, x-api-key",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin"
  };
}

async function handleRequest(request) {
  const url = new URL(request.url);
  const origin = request.headers.get('Origin');
  // منع الإساءة: اسمح بس لـ khidmatyai.com (أو طلب بلا Origin زي curl للاختبار)
  if (origin && origin !== ALLOW_ORIGIN) {
    return new Response('Forbidden', { status: 403 });
  }
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  }

  if (url.pathname === "/tts") {
    const text = (url.searchParams.get("text") || "").trim();
    const voice = (url.searchParams.get("voice") || DEFAULT_VOICE).trim();
    const rate = (url.searchParams.get("rate") || "+0%").trim();
    if (!text) return jsonErr(400, "نص فاضي", origin);
    try {
      const mp3 = await synth(text, voice, rate);
      return new Response(mp3, { headers: { "Content-Type": "audio/mpeg", ...corsHeaders(origin) } });
    } catch (e) {
      return jsonErr(502, String(e && e.message || e), origin);
    }
  }

  if (url.pathname === "/v1/audio/speech") {
    try {
      const b = await request.json();
      const text = (b.input || "").trim();
      const voice = (b.voice || DEFAULT_VOICE).trim();
      const speed = parseFloat(b.speed || 1);
      const rate = (Math.round((speed - 1) * 100) >= 0 ? "+" : "") + Math.round((speed - 1) * 100) + "%";
      if (!text) return jsonErr(400, "نص فاضي", origin);
      const mp3 = await synth(text, voice, rate);
      return new Response(mp3, { headers: { "Content-Type": "audio/mpeg", ...corsHeaders(origin) } });
    } catch (e) { return jsonErr(500, String(e && e.message || e), origin); }
  }

  return new Response("Scan Macaron TTS ✅ — جرب: /tts?text=مرحبا&voice=ar-EG-ShakirNeural", {
    headers: corsHeaders(origin)
  });
}

function jsonErr(status, msg, origin) {
  return new Response(JSON.stringify({ error: { message: msg } }), {
    status, headers: { "Content-Type": "application/json", ...corsHeaders(origin) }
  });
}

async function synth(text, voiceName, rate) {
  const chunks = text.split(/\n+/).map(s => s.trim()).filter(Boolean);
  const blobs = [];
  for (const c of chunks) {
    blobs.push(await synthChunk(c, voiceName, rate));
  }
  return new Blob(blobs, { type: "audio/mpeg" });
}

async function synthChunk(text, voiceName, rate, pitch = "+0Hz", volume = "+0%", outputFormat = "audio-24khz-48kbitrate-mono-mp3") {
  const endpoint = await getEndpoint();
  const u = `https://${endpoint.r}.tts.speech.microsoft.com/cognitiveservices/v1`;
  const res = await fetch(u, {
    method: "POST",
    headers: {
      "Authorization": endpoint.t,
      "Content-Type": "application/ssml+xml",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36 Edg/127.0.0.0",
      "X-Microsoft-OutputFormat": outputFormat
    },
    body: ssml(text, voiceName, rate, pitch, volume)
  });
  if (!res.ok) throw new Error("Edge TTS " + res.status + " " + (await res.text()).slice(0, 200));
  return res.blob();
}

function ssml(text, voiceName, rate, pitch, volume) {
  const lang = (voiceName.split("-").slice(0, 2).join("-")) || "ar-EG";
  return `<speak xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="http://www.w3.org/2001/mstts" version="1.0" xml:lang="${lang}"><voice name="${voiceName}"><prosody rate="${rate}" pitch="${pitch}" volume="${volume}">${escapeXml(text)}</prosody></voice></speak>`;
}

function escapeXml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// --- التوكن + التوقيع (microsofttranslator endpoint) ---
async function getEndpoint() {
  const now = Date.now() / 1000;
  if (tokenInfo.token && tokenInfo.expiredAt && now < tokenInfo.expiredAt - TOKEN_REFRESH_BEFORE_EXPIRY) {
    return tokenInfo.endpoint;
  }
  const endpointUrl = "https://dev.microsofttranslator.com/apps/endpoint?api-version=1.0";
  const clientId = uuid();
  const res = await fetch(endpointUrl, {
    method: "POST",
    headers: {
      "Accept-Language": "zh-Hans",
      "X-ClientVersion": "4.0.530a 5fe1dc6c",
      "X-UserId": "0f04d16a175c411e",
      "X-HomeGeographicRegion": "zh-Hans-CN",
      "X-ClientTraceId": clientId,
      "X-MT-Signature": await sign(endpointUrl),
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36 Edg/127.0.0.0",
      "Content-Type": "application/json; charset=utf-8",
      "Content-Length": "0"
    }
  });
  if (!res.ok) throw new Error("getEndpoint " + res.status);
  const data = await res.json();
  const jwt = data.t.split(".")[1];
  const decodedJwt = JSON.parse(atob(jwt));
  tokenInfo = { endpoint: data, token: data.t, expiredAt: decodedJwt.exp };
  return data;
}

async function sign(urlStr) {
  const url = urlStr.split("://")[1];
  const encodedUrl = encodeURIComponent(url);
  const uuidStr = uuid();
  const formattedDate = dateFormat();
  const bytesToSign = `MSTranslatorAndroidApp${encodedUrl}${formattedDate}${uuidStr}`.toLowerCase();
  const decode = await base64ToBytes("oik6PdDdMnOXemTbwvMn9de/h9lFnfBaCWbGMMZqqoSaQaqUOqjVGm5NqsmjcBI1x+sS9ugjB55HEJWRiFXYFw==");
  const signData = await hmacSha256(decode, bytesToSign);
  const signBase64 = await bytesToBase64(signData);
  return `MSTranslatorAndroidApp::${signBase64}::${formattedDate}::${uuidStr}`;
}

function dateFormat() {
  return ((new Date()).toUTCString().replace(/GMT/, "").trim() + " GMT").toLowerCase();
}
function uuid() { return crypto.randomUUID().replace(/-/g, ""); }

async function hmacSha256(key, data) {
  const k = await crypto.subtle.importKey("raw", key, { name: "HMAC", hash: { name: "SHA-256" } }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", k, new TextEncoder().encode(data)));
}
async function base64ToBytes(b64) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}
async function bytesToBase64(bytes) {
  return btoa(String.fromCharCode.apply(null, bytes));
}
