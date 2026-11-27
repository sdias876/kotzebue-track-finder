// Kotzebue Track Finder: photo identification server.
// Receives a track photo from the app, asks Claude to identify it, returns a short JSON answer.
// No dependencies: needs Node 18+ (built-in fetch).
//
// Environment variables (set in the Render dashboard):
//   ANTHROPIC_API_KEY  required. Your Anthropic API key.
//   APP_CODE           required. Access code the app must send, so strangers can't use your key.
//   ALLOWED_ORIGIN     optional. Defaults to the app's address.
//   MODEL              optional. Defaults to claude-sonnet-5-5.

const http = require('http');

const PORT = process.env.PORT || 10000;
const KEY = process.env.ANTHROPIC_API_KEY || '';
const CODE = process.env.APP_CODE || '';
const ORIGIN = process.env.ALLOWED_ORIGIN || 'https://kotzebue-track-finder.onrender.com';
const MODEL = process.env.MODEL || 'claude-sonnet-5-5';
const MAX_BODY = 4 * 1024 * 1024; // 4 MB
const PER_HOUR = 30;              // photos per hour per phone

const hits = new Map();
function limited(ip) {
  const now = Date.now();
  const list = (hits.get(ip) || []).filter(t => now - t < 3600e3);
  if (list.length >= PER_HOUR) { hits.set(ip, list); return true; }
  list.push(now); hits.set(ip, list); return false;
}

function send(res, status, obj) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': ORIGIN,
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Vary': 'Origin'
  });
  res.end(JSON.stringify(obj));
}

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const clean = (s, n) => String(s ?? '').replace(/[\u0000-\u001f]/g, ' ').slice(0, n);

async function identify(body) {
  const answers = clean(body.answers, 300) || 'none';
  const month = MONTHS[+body.month] || MONTHS[new Date().getMonth()];
  const prompt =
`You are an expert wildlife tracker and naturalist in Kotzebue, Alaska (Northwest Arctic coastal tundra, Kotzebue Sound, Baldwin Peninsula, Noatak and Kobuk rivers).
Identify the animal or bird that made the track or sign in this photo. Month: ${month}.
What the person tapped in the app (may be blank or rough): ${answers}.
Size codes: xs under 1 in, s 1-2.5 in, m 2.5-4.5 in, l 4.5-7 in, xl over 7 in.
It can be any mammal or bird, but strongly prefer species that really occur around Kotzebue in this month. Include people's dogs and snowmachine or human tracks if that is what it is.
Be honest: if the photo does not clearly show a track, say so and use "Rough guess". Write for an adult reading on a phone on the trail: short, plain sentences.
For "inupiaq", give the Iñupiaq name only if you are confident of it; otherwise leave it empty.
Reply with JSON only, no other text:
{"name":"common name","sure":"Pretty sure|Good guess|Rough guess","why":"what in the photo points to it, one sentence","also":"second most likely, or empty","inupiaq":"","about":"two sentences on what the animal is like","doing":"what it was probably doing, from the track, one sentence","age":"how old the track looks and why, one sentence","local":"where and when it is found around Kotzebue, one sentence","safety":"one sentence if there is any safety concern (bear, moose, wolf, thin ice, a fresh kill), else empty","fact":"one interesting fact","next":"one tip to get a surer answer, or empty"}`;

  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 900,
      messages: [{ role: 'user', content: [
        { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: body.image } },
        { type: 'text', text: prompt }
      ] }]
    })
  });
  if (!r.ok) { console.error('Anthropic error', r.status, (await r.text()).slice(0, 300)); throw new Error('upstream'); }
  const data = await r.json();
  const text = (data.content || []).map(c => c.text || '').join('');
  const j = JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1));
  const out = {};
  for (const k of ['name','sure','why','also','inupiaq','about','doing','age','local','safety','fact','next']) out[k] = clean(j[k], 400);
  return out;
}

http.createServer((req, res) => {
  if (req.method === 'OPTIONS') return send(res, 204, {});
  if (req.method === 'GET' && (req.url === '/' || req.url === '/health')) {
    return send(res, 200, { ok: true, ready: !!(KEY && CODE) });
  }
  if (req.method !== 'POST' || req.url !== '/api/identify') return send(res, 404, { error: 'not_found' });

  const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
  let size = 0; const chunks = [];
  req.on('data', c => {
    size += c.length;
    if (size > MAX_BODY) { send(res, 413, { error: 'too_big' }); req.destroy(); } else chunks.push(c);
  });
  req.on('end', async () => {
    if (res.writableEnded) return;
    let body;
    try { body = JSON.parse(Buffer.concat(chunks).toString()); } catch { return send(res, 400, { error: 'bad_request' }); }
    if (!KEY || !CODE) return send(res, 503, { error: 'not_set_up' });
    if (String(body.code || '').trim().toLowerCase() !== CODE.trim().toLowerCase()) return send(res, 401, { error: 'wrong_code' });
    if (typeof body.image !== 'string' || body.image.length < 100 || !/^[A-Za-z0-9+/=]+$/.test(body.image)) return send(res, 400, { error: 'no_photo' });
    if (limited(ip)) return send(res, 429, { error: 'too_many' });
    try { send(res, 200, await identify(body)); }
    catch (e) { console.error(e.message); send(res, 502, { error: 'failed' }); }
  });
}).listen(PORT, () => console.log('Track Finder photo server on port', PORT));
