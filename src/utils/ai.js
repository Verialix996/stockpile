import { loadServerUrl } from './serverUrl';

function extractJson(text, expected = 'object') {
  const raw = String(text || '').replace(/```json|```/gi, '').trim();
  if (!raw) throw new Error('AI returned an empty response. Try again or use a different local model.');

  const candidates = [raw];
  const objectStart = raw.indexOf('{');
  const objectEnd   = raw.lastIndexOf('}');
  const arrayStart  = raw.indexOf('[');
  const arrayEnd    = raw.lastIndexOf(']');

  if (expected === 'array' && arrayStart !== -1 && arrayEnd > arrayStart) {
    candidates.push(raw.slice(arrayStart, arrayEnd + 1));
  }
  if (objectStart !== -1 && objectEnd > objectStart) {
    candidates.push(raw.slice(objectStart, objectEnd + 1));
  }
  if (arrayStart !== -1 && arrayEnd > arrayStart) {
    candidates.push(raw.slice(arrayStart, arrayEnd + 1));
  }

  for (const candidate of candidates) {
    try { return JSON.parse(candidate); } catch (_) {}
  }

  throw new Error('AI returned text instead of valid JSON. Try again, or use a stronger vision model such as llava:13b or llama3.2-vision.');
}

async function callLocalAI(messages) {
  const serverUrl = await loadServerUrl();
  let response;
  try {
    response = await fetch(`${serverUrl}/ai`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages }),
    });
  } catch (err) {
    throw new Error(`Could not reach the Stockpile server at ${serverUrl}. Check Settings → Server URL and make sure the server is running.`);
  }

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.error?.message || `AI error (${response.status}). Is Ollama running and is the model pulled?`);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error('AI returned no message content. Try again or use a different local model.');
  return text;
}

function imageMessage(base64Image, prompt) {
  return [{
    role: 'user',
    content: [
      { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64Image}` } },
      { type: 'text', text: prompt },
    ],
  }];
}

// ── Identify item from base64 image using local AI ────────────────────────────
export async function identifyItem(base64Image) {
  const text = await callLocalAI(imageMessage(base64Image, `You are a home storage assistant. Look at this image and identify the item.
Respond with ONLY a valid JSON object in this exact format, nothing else:
{
  "name": "item name (short, specific)",
  "category": "one of: Food, Beverages, Cleaning, Tools, Electronics, Clothing, Documents, Other",
  "notes": "one short sentence describing the item (optional, can be empty string)"
}`));
  const parsed = extractJson(text, 'object');
  const name = String(parsed.name || '').trim();
  if (!name) throw new Error('AI could not identify a clear item in this photo. Try a closer, better-lit image.');

  return {
    name,
    category: parsed.category || 'Other',
    notes:    parsed.notes    || '',
  };
}

// ── Identify room structure from base64 image using local AI ──────────────────
export async function identifyRoom(base64Image) {
  const text = await callLocalAI(imageMessage(base64Image, `You are a home storage assistant. Look at this image of a room or storage area.
Identify the main storage units visible (cabinets, shelves, drawers, racks, etc.) and suggest names.
Respond with ONLY a valid JSON object, nothing else:
{
  "roomName": "suggested room name (e.g. Kitchen, Store Room, Garage)",
  "cabinets": [
    { "name": "storage unit name", "shelves": ["Shelf 1", "Shelf 2"] }
  ]
}
Keep names short and practical. Aim for 2-4 shelves per unit.`));
  const parsed = extractJson(text, 'object');
  if (!parsed.roomName || !Array.isArray(parsed.cabinets)) {
    throw new Error('AI returned an incomplete room structure. Try again with a clearer room photo.');
  }
  return parsed;
}

// ── Identify container contents from base64 image using local AI ──────────────
export async function identifyContainerContents(base64Image) {
  const text = await callLocalAI(imageMessage(base64Image, `You are a home storage assistant. Look at this image showing the contents of a bag, box, or container.
List all distinct items you can identify.
Respond with ONLY a valid JSON array, nothing else:
[
  {"name": "item name", "category": "one of: Food, Beverages, Cleaning, Tools, Electronics, Clothing, Documents, Other", "notes": "short description or empty string"}
]
Keep names short and specific. Only list clearly visible items.`));
  const parsed = extractJson(text, 'array');
  const items = Array.isArray(parsed) ? parsed : Array.isArray(parsed.items) ? parsed.items : [];
  const normalized = items
    .filter(item => item && String(item.name || '').trim())
    .map(item => ({
      name: String(item.name).trim(),
      category: item.category || 'Other',
      notes: item.notes || '',
    }));

  if (normalized.length === 0) {
    throw new Error('AI did not find clear items in this container photo. Try spreading the contents out and taking a brighter photo.');
  }
  return normalized;
}
