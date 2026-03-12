import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { loadServerUrl } from './serverUrl';

const KEY = 'stockpile_apikey';

// ── Save ──────────────────────────────────────────────────────────────────────
export async function saveApiKey(key) {
  if (Platform.OS === 'web') {
    localStorage.setItem(KEY, key);
  } else {
    await AsyncStorage.setItem(KEY, key);
  }
}

// ── Load ──────────────────────────────────────────────────────────────────────
export async function loadApiKey() {
  if (Platform.OS === 'web') {
    return localStorage.getItem(KEY) || '';
  } else {
    return (await AsyncStorage.getItem(KEY)) || '';
  }
}

// ── Delete ────────────────────────────────────────────────────────────────────
export async function clearApiKey() {
  if (Platform.OS === 'web') {
    localStorage.removeItem(KEY);
  } else {
    await AsyncStorage.removeItem(KEY);
  }
}

// ── Identify item from base64 image using Claude ──────────────────────────────
export async function identifyItemWithClaude(base64Image, apiKey) {
  const payload = {
    model: 'claude-opus-4-6',
    max_tokens: 256,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: 'image/jpeg', data: base64Image },
          },
          {
            type: 'text',
            text: `You are a home storage assistant. Look at this image and identify the item.
Respond with ONLY a valid JSON object in this exact format, nothing else:
{
  "name": "item name (short, specific)",
  "category": "one of: Food, Beverages, Cleaning, Tools, Electronics, Clothing, Documents, Other",
  "notes": "one short sentence describing the item (optional, can be empty string)"
}`,
          },
        ],
      },
    ],
  };

  // Web: route through local proxy to avoid CORS block
  // Mobile: call Anthropic directly (no CORS restriction)
  let response;
  if (Platform.OS === 'web') {
    const serverUrl = await loadServerUrl();
    response = await fetch(`${serverUrl}/claude`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey, payload }),
    });
  } else {
    response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type':      'application/json',
        'x-api-key':         apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(payload),
    });
  }

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    console.log('Claude error response:', err);
    if (response.status === 401) throw new Error('Invalid API key. Please check your key in Settings.');
    if (response.status === 429) throw new Error('Rate limit reached. Please wait a moment and try again.');
    if (response.status === 400) throw new Error('Bad request: ' + (err?.error?.message || 'unknown'));
    throw new Error(err?.error?.message || `API error (${response.status}). Please try again.`);
  }

  const data = await response.json();
  const text = data.content?.[0]?.text || '';
  const clean = text.replace(/```json|```/g, '').trim();
  const parsed = JSON.parse(clean);

  return {
    name:     parsed.name     || '',
    category: parsed.category || 'Other',
    notes:    parsed.notes    || '',
  };
}

// ── Identify room structure from base64 image using Claude ────────────────────
export async function identifyRoomWithClaude(base64Image, apiKey) {
  const payload = {
    model: 'claude-opus-4-6',
    max_tokens: 512,
    messages: [{
      role: 'user',
      content: [
        {
          type: 'image',
          source: { type: 'base64', media_type: 'image/jpeg', data: base64Image },
        },
        {
          type: 'text',
          text: `You are a home storage assistant. Look at this image of a room or storage area.
Identify the main storage units visible (cabinets, shelves, drawers, racks, etc.) and suggest names.
Respond with ONLY a valid JSON object, nothing else:
{
  "roomName": "suggested room name (e.g. Kitchen, Store Room, Garage)",
  "cabinets": [
    { "name": "storage unit name", "shelves": ["Shelf 1", "Shelf 2"] }
  ]
}
Keep names short and practical. Aim for 2-4 shelves per unit.`,
        },
      ],
    }],
  };

  let response;
  if (Platform.OS === 'web') {
    const serverUrl = await loadServerUrl();
    response = await fetch(`${serverUrl}/claude`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey, payload }),
    });
  } else {
    response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type':      'application/json',
        'x-api-key':         apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(payload),
    });
  }

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    if (response.status === 401) throw new Error('Invalid API key. Please check your key in Settings.');
    if (response.status === 429) throw new Error('Rate limit reached. Please wait a moment and try again.');
    throw new Error(err?.error?.message || `API error (${response.status}).`);
  }

  const data  = await response.json();
  const text  = data.content?.[0]?.text || '';
  const clean = text.replace(/```json|```/g, '').trim();
  return JSON.parse(clean);
}

// ── Identify container contents from base64 image using Claude ────────────────
export async function identifyContainerContentsWithClaude(base64Image, apiKey) {
  const payload = {
    model: 'claude-opus-4-6',
    max_tokens: 512,
    messages: [{
      role: 'user',
      content: [
        {
          type: 'image',
          source: { type: 'base64', media_type: 'image/jpeg', data: base64Image },
        },
        {
          type: 'text',
          text: `You are a home storage assistant. Look at this image showing the contents of a bag, box, or container.
List all distinct items you can identify.
Respond with ONLY a valid JSON array, nothing else:
[
  {"name": "item name", "category": "one of: Food, Beverages, Cleaning, Tools, Electronics, Clothing, Documents, Other", "notes": "short description or empty string"}
]
Keep names short and specific. Only list clearly visible items.`,
        },
      ],
    }],
  };

  let response;
  if (Platform.OS === 'web') {
    const serverUrl = await loadServerUrl();
    response = await fetch(`${serverUrl}/claude`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey, payload }),
    });
  } else {
    response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type':      'application/json',
        'x-api-key':         apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(payload),
    });
  }

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    if (response.status === 401) throw new Error('Invalid API key. Please check your key in Settings.');
    if (response.status === 429) throw new Error('Rate limit reached. Please wait a moment and try again.');
    throw new Error(err?.error?.message || `API error (${response.status}).`);
  }

  const data  = await response.json();
  const text  = data.content?.[0]?.text || '';
  const clean = text.replace(/```json|```/g, '').trim();
  return JSON.parse(clean);
}
